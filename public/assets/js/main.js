<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>Gestión de Membresías | Reverencia Majestad</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />

  <!-- Tus estilos globales -->
  <link rel="stylesheet" href="../assets/css/core.css">
  <link rel="stylesheet" href="../assets/css/versace-theme.css">
  <link rel="stylesheet" href="../assets/css/components.css">
  <link rel="stylesheet" href="../assets/css/utilities.css">
  <link rel="stylesheet" href="../assets/css/responsive.css">
</head>
<body class="rm-bg">

  <header class="rm-admin-header">
    <h1 class="rm-title">Membresías Reverencia Majestad</h1>
  </header>

  <main class="rm-container">
    <!-- FORMULARIO -->
    <section class="rm-card rm-card--solid">
      <h2 class="rm-card__title">Crear / Editar Membresía</h2>

      <form id="membresiaForm" class="rm-form">
        <!-- Campo oculto para saber si estamos editando -->
        <input type="hidden" id="membresiaId" />

        <div class="rm-form__row">
          <label for="nombre">Nombre</label>
          <input id="nombre" type="text" required placeholder="Ej: Membresía Oro" />
        </div>

        <div class="rm-form__row">
          <label for="precio">Precio (CLP)</label>
          <input id="precio" type="number" min="0" required placeholder="Ej: 150000" />
        </div>

        <div class="rm-form__row">
          <label for="tipo">Tipo</label>
          <select id="tipo" required>
            <option value="mensual">Mensual</option>
            <option value="anual">Anual</option>
            <option value="unico">Único</option>
          </select>
        </div>

        <div class="rm-form__row">
          <label for="nivel">Nivel</label>
          <select id="nivel" required>
            <option value="oro">Oro</option>
            <option value="plata">Plata</option>
            <option value="titanio">Titanio</option>
          </select>
        </div>

        <div class="rm-form__row">
          <label for="estado">Estado</label>
          <select id="estado" required>
            <option value="activo">Activo</option>
            <option value="pausado">Pausado</option>
            <option value="agotado">Agotado</option>
          </select>
        </div>

        <div class="rm-form__row">
          <label for="duracionDias">Duración (días)</label>
          <input id="duracionDias" type="number" min="1" required placeholder="Ej: 30, 365" />
        </div>

        <div class="rm-form__row">
          <label for="beneficios">Beneficios incluidos</label>
          <textarea id="beneficios" rows="3" placeholder="Ej: Lavado premium, spa capilar, asesoría de imagen..."></textarea>
        </div>

        <div class="rm-form__actions">
          <button type="submit" class="rm-btn rm-btn--primary">Guardar</button>
          <button type="button" id="btnLimpiar" class="rm-btn rm-btn--ghost">Limpiar</button>
        </div>
      </form>
    </section>

    <!-- LISTADO -->
    <section class="rm-card rm-card--soft rm-mt-lg">
      <h2 class="rm-card__title">Listado de Membresías</h2>

      <table class="rm-table">
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Tipo</th>
            <th>Nivel</th>
            <th>Precio</th>
            <th>Estado</th>
            <th>Duración</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody id="tablaMembresias">
          <!-- Aquí se cargan las filas desde Firestore -->
        </tbody>
      </table>
    </section>
  </main>

  <!-- JS Firebase + lógica -->
  <script type="module">
    // 1) IMPORTAR FIREBASE (v10.x, modular)
    import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-app.js";
    import {
      getFirestore,
      collection,
      addDoc,
      getDocs,
      updateDoc,
      deleteDoc,
      doc,
      serverTimestamp
    } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-firestore.js";

    // 2) PEGAR AQUÍ TU CONFIGURACIÓN REAL
    const firebaseConfig = {
      apiKey: "TU_API_KEY",
      authDomain: "tu-proyecto.firebaseapp.com",
      projectId: "tu-proyecto",
      storageBucket: "tu-proyecto.appspot.com",
      messagingSenderId: "XXXXXXXXXXXX",
      appId: "1:XXXXXXXXXXXX:web:YYYYYYYYYYYYYY"
    };

    // 3) INICIALIZAR
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    const colMembresias = collection(db, "membresias");

    // 4) REFERENCIAS AL DOM
    const membresiaForm = document.getElementById("membresiaForm");
    const membresiaId = document.getElementById("membresiaId");
    const nombre = document.getElementById("nombre");
    const precio = document.getElementById("precio");
    const tipo = document.getElementById("tipo");
    const nivel = document.getElementById("nivel");
    const estado = document.getElementById("estado");
    const duracionDias = document.getElementById("duracionDias");
    const beneficios = document.getElementById("beneficios");
    const tablaMembresias = document.getElementById("tablaMembresias");
    const btnLimpiar = document.getElementById("btnLimpiar");

    // 5) FUNCIONES
    async function cargarMembresias() {
      tablaMembresias.innerHTML = "<tr><td colspan='7'>Cargando...</td></tr>";

      const snapshot = await getDocs(colMembresias);

      if (snapshot.empty) {
        tablaMembresias.innerHTML = "<tr><td colspan='7'>No hay membresías creadas todavía.</td></tr>";
        return;
      }

      const filas = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        filas.push(`
          <tr>
            <td>${data.nombre || ""}</td>
            <td>${data.tipo || ""}</td>
            <td>${data.nivel || ""}</td>
            <td>$${data.precio?.toLocaleString?.("es-CL") || data.precio || ""}</td>
            <td>${data.estado || ""}</td>
            <td>${data.duracionDias || ""} días</td>
            <td>
              <button class="rm-btn rm-btn--xs rm-btn--ghost" data-accion="editar" data-id="${docSnap.id}">Editar</button>
              <button class="rm-btn rm-btn--xs rm-btn--danger" data-accion="eliminar" data-id="${docSnap.id}">Eliminar</button>
            </td>
          </tr>
        `);
      });

      tablaMembresias.innerHTML = filas.join("");
    }

    function limpiarFormulario() {
      membresiaId.value = "";
      membresiaForm.reset();
    }

    async function guardarMembresia(e) {
      e.preventDefault();

      const data = {
        nombre: nombre.value.trim(),
        precio: Number(precio.value),
        tipo: tipo.value,
        nivel: nivel.value,
        estado: estado.value,
        duracionDias: Number(duracionDias.value),
        beneficios: beneficios.value.trim(),
        actualizadoEn: serverTimestamp()
      };

      // Validación súper básica
      if (!data.nombre || !data.precio || !data.duracionDias) {
        alert("Nombre, precio y duración son obligatorios.");
        return;
      }

      try {
        if (membresiaId.value) {
          // EDITAR
          const ref = doc(db, "membresias", membresiaId.value);
          await updateDoc(ref, data);
          alert("Membresía actualizada correctamente.");
        } else {
          // CREAR
          data.creadoEn = serverTimestamp();
          await addDoc(colMembresias, data);
          alert("Membresía creada correctamente.");
        }

        limpiarFormulario();
        await cargarMembresias();
      } catch (err) {
        console.error(err);
        alert("Error al guardar la membresía. Revisa la consola.");
      }
    }

    async function eliminarMembresia(id) {
      if (!confirm("¿Seguro que deseas eliminar esta membresía?")) return;

      try {
        const ref = doc(db, "membresias", id);
        await deleteDoc(ref);
        alert("Membresía eliminada.");
        await cargarMembresias();
      } catch (err) {
        console.error(err);
        alert("Error al eliminar la membresía. Revisa la consola.");
      }
    }

    function prepararEdicion(id, filaTr) {
      membresiaId.value = id;
      // Tomamos las celdas de la fila
      const celdas = filaTr.querySelectorAll("td");
      nombre.value = celdas[0].textContent;
      tipo.value = celdas[1].textContent;
      nivel.value = celdas[2].textContent;
      const precioTexto = celdas[3].textContent.replace(/\$/g, "").replace(/\./g, "").replace(/,/g, "");
      precio.value = Number(precioTexto);
      estado.value = celdas[4].textContent;
      duracionDias.value = parseInt(celdas[5].textContent, 10) || "";
      // beneficios no se ve en la tabla; se queda tal cual o se edita cuando recarguemos desde doc si luego agregas esa lógica avanzada
    }

    // 6) EVENTOS
    membresiaForm.addEventListener("submit", guardarMembresia);
    btnLimpiar.addEventListener("click", limpiarFormulario);

    tablaMembresias.addEventListener("click", (e) => {
      const btn = e.target;
      const accion = btn.dataset.accion;
      const id = btn.dataset.id;
      if (!accion || !id) return;

      const filaTr = btn.closest("tr");

      if (accion === "eliminar") {
        eliminarMembresia(id);
      }

      if (accion === "editar") {
        prepararEdicion(id, filaTr);
      }
    });

    // 7) CARGAR AL INICIO
    cargarMembresias();
  </script>
</body>
</html>
