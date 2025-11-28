import { firebaseConfig } from "./firebase-config.js";

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { 
  getAuth, 
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

import {
  getFirestore,
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// Init
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ROL requerido por esta página (se define en el HTML)
let REQUIRED_ROLE = document.body.getAttribute("data-role") || null;

// Al detectar login/cambio de usuario
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  // Leer el rol desde Firestore
  const ref = doc(db, "usuarios", user.uid);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    alert("Tu cuenta aún no tiene un rol asignado. Contacta al administrador.");
    await signOut(auth);
    window.location.href = "login.html";
    return;
  }

  const role = snap.data().role;

  // Si la página requiere un rol y el usuario no cumple
  if (REQUIRED_ROLE && role !== REQUIRED_ROLE && role !== "admin") {
    alert("No tienes permisos para acceder a esta sección.");
    window.location.href = "login.html";
    return;
  }

  console.log("Acceso permitido:", user.email, "| Rol:", role);
});
