import { firebaseConfig } from "../admin/firebase-config.js";

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import {
  getStorage,
  ref as storageRef,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

// Inicializa Firebase con la misma config que login.html
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const currentUserEl = document.getElementById("currentUser");
const logoutBtn = document.getElementById("logoutBtn");

// 🔐 Protege la ruta: si no hay user, vuelve al login
onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "login.html";
  } else {
    currentUserEl.textContent = user.email;
  }
});

logoutBtn.addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "login.html";
});

// 🧭 Navegación entre secciones
const navButtons = document.querySelectorAll(".rm-nav-btn");
const sections = document.querySelectorAll(".rm-section");

navButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    const sectionId = btn.getAttribute("data-section");
    if (!sectionId) return;

    navButtons.forEach(b => b.classList.remove("rm-active"));
    btn.classList.add("rm-active");

    sections.forEach(sec => {
      if (sec.id === `section-${sectionId}`) {
        sec.classList.add("rm-active");
      } else {
        sec.classList.remove("rm-active");
      }
    });
  });
});

// Helper formato CLP
function formatoCLP(valor) {
  const num = Number(valor) || 0;
  return num.toLocaleString("es-CL", {
    style: "currency",
    currency: "CLP",
    minimumFractionDigits: 0
  });
}

// ============================
// 💾 LRU CACHE UTILITY
// ============================
class LRUCache {
  constructor(maxSize = 50) {
    this.maxSize = maxSize;
    this.cache = new Map();
  }

  set(key, value, ttl = 300000) { // 5 min default TTL
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }
    this.cache.set(key, { value, timestamp: Date.now(), ttl });
    if (this.cache.size > this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
  }

  get(key) {
    if (!this.cache.has(key)) return null;
    const entry = this.cache.get(key);
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }
    // Move to end (LRU)
    this.cache.delete(key);
    this.cache.set(key, entry);
    return entry.value;
  }

  clear() {
    this.cache.clear();
  }
}

const statsCache = new LRUCache(10);
const reservasCache = new LRUCache(50);

// ============================
// 📊 RESERVAS
// ============================
const reservasRef = collection(db, "reservas");
const qReservas = query(reservasRef, orderBy("fechaHora", "desc"));

const tbodyReservas = document.getElementById("tbodyReservas");
const statReservasHoy = document.getElementById("statReservasHoy");
const statPendientes = document.getElementById("statPendientes");
const statConfirmadas = document.getElementById("statConfirmadas");
const statOrigen = document.getElementById("statOrigen");

// Pagination state
let allReservas = [];
let currentPage = 1;
const PAGE_SIZE = 20;

onSnapshot(qReservas, (snapshot) => {
  const now = new Date();
  const hoyStr = now.toISOString().slice(0, 10); // YYYY-MM-DD

  let countHoy = 0;
  let countPendientes = 0;
  let countConfirmadas = 0;
  let countOrigen = 0;

  if (snapshot.empty) {
    tbodyReservas.innerHTML = `
      <tr>
        <td colspan="9" class="rm-empty">No hay reservas registradas todavía.</td>
      </tr>
    `;
    // Cache stats with 5-minute TTL
    statsCache.set("reservas-stats", { hoy: 0, pendientes: 0, confirmadas: 0, origen: 0 });
    statReservasHoy.textContent = "0";
    statPendientes.textContent = "0";
    statConfirmadas.textContent = "0";
    statOrigen.textContent = "0";
    allReservas = [];
    return;
  }

  // Store all docs in memory for pagination and stats
  allReservas = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

  // Calculate stats
  allReservas.forEach(data => {
    const fechaStr = data.fechaHora ?
      (data.fechaHora.toDate ? data.fechaHora.toDate() : new Date(data.fechaHora)).toISOString().slice(0, 10)
      : "";
    if (fechaStr === hoyStr) countHoy++;

    const estado = (data.estado || "pendiente").toLowerCase();
    if (estado === "pendiente") countPendientes++;
    if (estado === "confirmado") countConfirmadas++;
    if (data.origen) countOrigen++;
  });

  // Cache stats
  statsCache.set("reservas-stats", { hoy: countHoy, pendientes: countPendientes, confirmadas: countConfirmadas, origen: countOrigen });

  // Update UI stats
  statReservasHoy.textContent = countHoy.toString();
  statPendientes.textContent = countPendientes.toString();
  statConfirmadas.textContent = countConfirmadas.toString();
  statOrigen.textContent = countOrigen.toString();

  // Render first page
  renderReservasPage(1);
});

function renderReservasPage(page) {
  currentPage = page;
  const start = (page - 1) * PAGE_SIZE;
  const end = start + PAGE_SIZE;
  const pageReservas = allReservas.slice(start, end);

  const now = new Date();
  const hoyStr = now.toISOString().slice(0, 10);

  if (pageReservas.length === 0) {
    tbodyReservas.innerHTML = `
      <tr>
        <td colspan="9" class="rm-empty">No hay reservas en esta página.</td>
      </tr>
    `;
    return;
  }

  tbodyReservas.innerHTML = "";

  pageReservas.forEach((data) => {
    const id = data.id;
    const nombre = data.nombre || "-";

    let fechaTexto = "-";
    let horaTexto = "-";
    if (data.fechaHora) {
      let fechaObj = data.fechaHora.toDate ? data.fechaHora.toDate() : new Date(data.fechaHora);
      if (!isNaN(fechaObj)) {
        fechaTexto = fechaObj.toLocaleDateString("es-CL", { day: "2-digit", month: "2-digit", year: "2-digit" });
        horaTexto = fechaObj.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });
      }
    }

    const estadoPago = data.estadoPago || data.pagoEstado || data.pago || "Pendiente";
    const modalidad = data.modalidad || data.origen || "-";
    const monto = data.monto != null ? Number(data.monto) : (data.precio != null ? Number(data.precio) : 0);
    const telefono = data.telefono || "-";
    const direccion = data.direccion || data.domicilio || "-";

    const estado = (data.estado || "pendiente").toLowerCase();
    let chipClass = "rm-chip-pendiente";
    if (estado === "confirmado") chipClass = "rm-chip-confirmado";
    if (estado === "realizado") chipClass = "rm-chip-realizado";
    if (estado === "cancelado") chipClass = "rm-chip-cancelado";

    const tr = document.createElement("tr");
    tr.setAttribute("data-id", id);
    tr.innerHTML = `
      <td>${nombre}</td>
      <td>${fechaTexto}</td>
      <td>${horaTexto}</td>
      <td>${estadoPago}</td>
      <td>${modalidad}</td>
      <td>${monto ? formatoCLP(monto) : '-'}</td>
      <td>${telefono}</td>
      <td style="max-width:240px;overflow:hidden;text-overflow:ellipsis;">${direccion}</td>
      <td>
        <span class="rm-chip ${chipClass}">${estado}</span>
        <div style="margin-top:6px;">
          <button class="rm-btn-mini" data-id="${id}" data-estado="pendiente">Pend</button>
          <button class="rm-btn-mini" data-id="${id}" data-estado="confirmado">Conf</button>
          <button class="rm-btn-mini" data-id="${id}" data-estado="realizado">Real</button>
          <button class="rm-btn-mini" data-id="${id}" data-estado="cancelado">Canc</button>
        </div>
      </td>
    `;
    tbodyReservas.appendChild(tr);
  });

  // Add pagination controls
  const totalPages = Math.ceil(allReservas.length / PAGE_SIZE);
  if (totalPages > 1) {
    const paginationRow = document.createElement("tr");
    paginationRow.innerHTML = `
      <td colspan="9" style="text-align: center; padding: 1rem; border-top: 1px solid rgba(255,255,255,0.1);">
        <div style="display: flex; justify-content: center; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
          ${currentPage > 1 ? `<button class="rm-btn-mini" onclick="renderReservasPage(${currentPage - 1})" style="padding: 0.3rem 0.6rem;">← Anterior</button>` : ''}
          <span style="font-size: 0.85rem; color: #b6b6c5;">Página ${currentPage} de ${totalPages}</span>
          ${currentPage < totalPages ? `<button class="rm-btn-mini" onclick="renderReservasPage(${currentPage + 1})" style="padding: 0.3rem 0.6rem;">Siguiente →</button>` : ''}
        </div>
      </td>
    `;
    tbodyReservas.appendChild(paginationRow);
  }
}


tbodyReservas.addEventListener("click", async (e) => {
  const target = e.target;
  if (!(target instanceof HTMLElement)) return;
  // Si se clickeó un botón de acción dentro de la fila, manejamos la acción
  if (target.matches(".rm-btn-mini")) {
    const id = target.getAttribute("data-id");
    const nuevoEstado = target.getAttribute("data-estado");
    if (!id || !nuevoEstado) return;

    try {
      const ref = doc(db, "reservas", id);
      await updateDoc(ref, { estado: nuevoEstado.toLowerCase() });
    } catch (err) {
      console.error("Error al actualizar estado:", err);
      alert("No se pudo actualizar el estado. Revisa la consola.");
    }

    return;
  }

  // Si no fue un botón, abrir detalle de reserva al clicar la fila
  const tr = target.closest("tr[data-id]");
  if (tr) {
    const id = tr.getAttribute("data-id");
    const reserva = allReservas.find(r => r.id === id);
    if (reserva) openReservaModal(reserva);
  }
});

const formNuevaReserva = document.getElementById("formNuevaReserva");
const nrNombre = document.getElementById("nrNombre");
const nrTelefono = document.getElementById("nrTelefono");
const nrServicio = document.getElementById("nrServicio");
const nrFechaHora = document.getElementById("nrFechaHora");
const nrFuente = document.getElementById("nrFuente");
const nrEstado = document.getElementById("nrEstado");

formNuevaReserva.addEventListener("submit", async (e) => {
  e.preventDefault();
  nrEstado.textContent = "Guardando reserva…";

  try {
    const fechaVal = nrFechaHora.value;
    let fechaTimestamp = serverTimestamp();
    if (fechaVal) {
      const fechaJS = new Date(fechaVal);
      fechaTimestamp = fechaJS;
    }

    await addDoc(reservasRef, {
      nombre: nrNombre.value.trim(),
      telefono: nrTelefono.value.trim(),
      servicio: nrServicio.value.trim(),
      fechaHora: fechaTimestamp,
      origen: nrFuente.value.trim().toLowerCase(),
      estado: "pendiente",
      creadoEn: serverTimestamp()
    });

    nrEstado.textContent = "Reserva creada correctamente ✨";
    formNuevaReserva.reset();
    setTimeout(() => nrEstado.textContent = "", 2500);
  } catch (err) {
    console.error("Error al crear reserva:", err);
    nrEstado.textContent = "No se pudo crear la reserva. Revisa la consola.";
  }
});

// Helper: mantener reservas en memoria para acceso rápido
function findReservaById(id) {
  return allReservas.find(r => r.id === id) || null;
}

// ============================
// 🛒 PRODUCTOS
// ============================

// Referencias Firestore + DOM
const productosRef = collection(db, "productos");
const tbodyProductos = document.getElementById("tbodyProductos");

const formProducto = document.getElementById("formProducto");
const productoIdInput = document.getElementById("productoId");
const productoNombreInput = document.getElementById("productoNombre");
const productoCategoriaInput = document.getElementById("productoCategoria");
const productoPrecioInput = document.getElementById("productoPrecio");
const productoStockInput = document.getElementById("productoStock");
const productoDescripcionInput = document.getElementById("productoDescripcion");
const productoVisibleInput = document.getElementById("productoVisible");
const prodImagenInput = document.getElementById("prodImagen");
const prodEstado = document.getElementById("prodEstado");
const btnSubmitProducto = document.getElementById("btnSubmitProducto");
const btnCancelEditProducto = document.getElementById("btnCancelEditProducto");
const btnGenerarIA = document.getElementById("btnGenerarIA");
const previewImagenProducto = document.getElementById("previewImagenProducto");

const storage = getStorage(app);

let productos = [];

function setEstadoProducto(msg, tipo = "info") {
  if (!prodEstado) return;
  prodEstado.textContent = msg || "";
  prodEstado.className = "rm-status-text";
  if (tipo === "error") {
    prodEstado.classList.add("error");
  }
}

function limpiarFormProducto() {
  productoIdInput.value = "";
  productoNombreInput.value = "";
  productoCategoriaInput.value = "";
  productoPrecioInput.value = "";
  productoStockInput.value = "";
  productoDescripcionInput.value = "";
  productoVisibleInput.checked = true;
  if (prodImagenInput) prodImagenInput.value = "";
  if (previewImagenProducto)
    previewImagenProducto.textContent = "Sin imagen seleccionada.";
  btnSubmitProducto.textContent = "Guardar producto";
  btnCancelEditProducto.style.display = "none";
}

// Vista previa simple cuando seleccionan imagen
if (prodImagenInput && previewImagenProducto) {
  prodImagenInput.addEventListener("change", () => {
    if (prodImagenInput.files && prodImagenInput.files[0]) {
      previewImagenProducto.textContent =
        "Imagen seleccionada: " + prodImagenInput.files[0].name;
    } else {
      previewImagenProducto.textContent = "Sin imagen seleccionada.";
    }
  });
}

// Botón IA (por ahora solo placeholder)
if (btnGenerarIA) {
  btnGenerarIA.addEventListener("click", () => {
    alert(
      "Aquí más adelante conectaremos la IA para generar imágenes del producto automáticamente."
    );
  });
}

// Escucha en tiempo real productos
const qProductos = query(productosRef, orderBy("creadoEn", "desc"));
onSnapshot(qProductos, (snapshot) => {
  productos = snapshot.docs.map((d) => ({
    id: d.id,
    ...d.data()
  }));
  renderProductos(productos);
});

function renderProductos(lista) {
  if (!tbodyProductos) return;

  if (!lista.length) {
    tbodyProductos.innerHTML = `
      <tr>
        <td colspan="7" class="rm-empty">No hay productos registrados todavía.</td>
      </tr>
    `;
    return;
  }

  tbodyProductos.innerHTML = "";
  lista.forEach((p) => {
    const tr = document.createElement("tr");
    const imagenHtml = p.imagenUrl
      ? `<img src="${p.imagenUrl}" alt="${p.nombre || ""}"
           style="width:45px;height:45px;border-radius:10px;object-fit:cover;">`
      : "-";

    tr.innerHTML = `
      <td>${imagenHtml}</td>
      <td>${p.nombre || "-"}</td>
      <td>${p.categoria || "-"}</td>
      <td>${formatoCLP(p.precio || 0)}</td>
      <td>${p.stock != null ? p.stock : "-"}</td>
      <td>
        <span class="rm-chip ${
          p.visible === false ? "rm-chip-cancelado" : "rm-chip-confirmado"
        }">
          ${p.visible === false ? "Oculto" : "Visible"}
        </span>
      </td>
      <td>
        <button class="rm-btn-mini btn-edit-producto" data-id="${p.id}">
          Editar
        </button>
        <button class="rm-btn-mini btn-toggle-visible" data-id="${p.id}">
          ${p.visible === false ? "Mostrar" : "Ocultar"}
        </button>
        <button class="rm-btn-mini btn-delete-producto" data-id="${p.id}">
          Eliminar
        </button>
      </td>
    `;
    tbodyProductos.appendChild(tr);
  });
}

// Clicks en tabla productos
tbodyProductos.addEventListener("click", async (e) => {
  const target = e.target;
  if (!(target instanceof HTMLElement)) return;
  const id = target.getAttribute("data-id");
  if (!id) return;

  const producto = productos.find((p) => p.id === id);

  // Editar
  if (target.classList.contains("btn-edit-producto")) {
    if (!producto) return;
    productoIdInput.value = producto.id;
    productoNombreInput.value = producto.nombre || "";
    productoCategoriaInput.value = producto.categoria || "";
    productoPrecioInput.value =
      producto.precio != null ? producto.precio : "";
    productoStockInput.value =
      producto.stock != null ? producto.stock : "";
    productoDescripcionInput.value = producto.descripcion || "";
    productoVisibleInput.checked = producto.visible !== false;
    btnSubmitProducto.textContent = "Actualizar producto";
    btnCancelEditProducto.style.display = "inline-block";
    setEstadoProducto("Editando producto…");
  }

  // Ocultar / mostrar
  if (target.classList.contains("btn-toggle-visible")) {
    if (!producto) return;
    try {
      const ref = doc(db, "productos", id);
      await updateDoc(ref, { visible: producto.visible === false ? true : false });
    } catch (err) {
      console.error("Error al cambiar visibilidad:", err);
      alert("No se pudo cambiar la visibilidad del producto.");
    }
  }

  // Eliminar
  if (target.classList.contains("btn-delete-producto")) {
    const ok = window.confirm("¿Eliminar este producto?");
    if (!ok) return;
    try {
      const ref = doc(db, "productos", id);
      await deleteDoc(ref);
    } catch (err) {
      console.error("Error al eliminar producto:", err);
      alert("No se pudo eliminar el producto.");
    }
  }
});

// Cancelar edición
btnCancelEditProducto.addEventListener("click", () => {
  limpiarFormProducto();
});

// Modal: funciones open / close
const reservaModal = document.getElementById('reservaModal');
const reservaModalBody = document.getElementById('reservaModalBody');
const closeReservaModalBtn = document.getElementById('closeReservaModal');

function openReservaModal(reserva) {
  if (!reservaModal || !reservaModalBody) return;
  const fecha = reserva.fechaHora && reserva.fechaHora.toDate ? reserva.fechaHora.toDate() : (reserva.fechaHora ? new Date(reserva.fechaHora) : null);
  const fechaStr = fecha && !isNaN(fecha) ? fecha.toLocaleDateString('es-CL') : '-';
  const horaStr = fecha && !isNaN(fecha) ? fecha.toLocaleTimeString('es-CL', {hour:'2-digit', minute:'2-digit'}) : '-';

  const estadoPago = reserva.estadoPago || reserva.pagoEstado || reserva.pago || 'Pendiente';
  const modalidad = reserva.modalidad || reserva.origen || '-';
  const monto = reserva.monto != null ? formatoCLP(reserva.monto) : (reserva.precio != null ? formatoCLP(reserva.precio) : '-');
  const telefono = reserva.telefono || '-';
  const direccion = reserva.direccion || reserva.domicilio || '-';

  reservaModalBody.innerHTML = `
    <p><strong>Nombre:</strong> ${reserva.nombre || '-'}</p>
    <p><strong>Fecha:</strong> ${fechaStr}</p>
    <p><strong>Hora:</strong> ${horaStr}</p>
    <p><strong>Estado pago:</strong> ${estadoPago}</p>
    <p><strong>Modalidad:</strong> ${modalidad}</p>
    <p><strong>Monto:</strong> ${monto}</p>
    <p><strong>Teléfono:</strong> ${telefono}</p>
    <p><strong>Dirección:</strong> ${direccion}</p>
    <hr style="opacity:0.06; margin:0.6rem 0;" />
    <p style="white-space:pre-wrap;"><strong>Notas / Mensaje:</strong> ${reserva.mensaje || reserva.notas || '-'}</p>
  `;

  reservaModal.style.display = 'flex';
}

function closeReservaModal() {
  if (!reservaModal) return;
  reservaModal.style.display = 'none';
}

if (closeReservaModalBtn) closeReservaModalBtn.addEventListener('click', closeReservaModal);
// Cerrar al click en backdrop
document.addEventListener('click', (e) => {
  if (!reservaModal) return;
  if (reservaModal.style.display === 'none') return;
  const backdrop = e.target.closest('.rm-modal-backdrop');
  if (backdrop) closeReservaModal();
});

// Crear / actualizar producto
formProducto.addEventListener("submit", async (e) => {
  e.preventDefault();
  setEstadoProducto("Guardando producto…");
  btnSubmitProducto.disabled = true;

  // Validación rápida
  if (
    !productoNombreInput.value.trim() ||
    !productoCategoriaInput.value ||
    !productoPrecioInput.value ||
    !productoStockInput.value
  ) {
    setEstadoProducto("Completa todos los campos obligatorios.", "error");
    btnSubmitProducto.disabled = false;
    return;
  }

  try {
    let imageUrl = null;

    // Subir imagen si se seleccionó
    if (prodImagenInput.files && prodImagenInput.files[0]) {
      const file = prodImagenInput.files[0];
      const imgRef = storageRef(
        storage,
        `productos/${Date.now()}_${file.name}`
      );
      await uploadBytes(imgRef, file);
      imageUrl = await getDownloadURL(imgRef);
    }

    const payload = {
      nombre: productoNombreInput.value.trim(),
      categoria: productoCategoriaInput.value,
      precio: Number(productoPrecioInput.value) || 0,
      stock: Number(productoStockInput.value) || 0,
      descripcion: productoDescripcionInput.value.trim(),
      visible: productoVisibleInput.checked,
      actualizadoEn: serverTimestamp()
    };

    const idEditar = productoIdInput.value;

    if (idEditar) {
      const ref = doc(db, "productos", idEditar);
      if (imageUrl) payload.imagenUrl = imageUrl;
      await updateDoc(ref, payload);
      setEstadoProducto("Producto actualizado correctamente ✨");
    } else {
      await addDoc(productosRef, {
        ...payload,
        imagenUrl: imageUrl || "",
        creadoEn: serverTimestamp()
      });
      setEstadoProducto("Producto creado correctamente ✨");
    }

    limpiarFormProducto();
    setTimeout(() => setEstadoProducto(""), 2500);
  } catch (err) {
    console.error("Error al guardar producto:", err);
    setEstadoProducto("No se pudo guardar el producto.", "error");
  } finally {
    btnSubmitProducto.disabled = false;
  }
});
