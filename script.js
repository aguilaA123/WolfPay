// script.js (usar type="module")    
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";    
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";    
    
/* ----------------- CONFIG FIREBASE ----------------- */    
const firebaseConfig = {    
  apiKey: "AIzaSyChWAjNRgPyJSnnCtks25fnmNGAptHsDGQ",    
  authDomain: "wolfpay-dd57b.firebaseapp.com",    
  projectId: "wolfpay-dd57b",    
  storageBucket: "wolfpay-dd57b.firebasestorage.app",    
  messagingSenderId: "1001364536237",    
  appId: "1:1001364536237:web:81ba233c90677070a17f24",    
  measurementId: "G-24Y3D7QNT1"    
};    
    
const app = initializeApp(firebaseConfig);    
const db = getFirestore(app);    
/* -------------------------------------------------- */    
    
const enterBtn = document.getElementById("enterBtn");    
const pinInput = document.getElementById("pinInput");    
const msg = document.getElementById("msg");    
    
enterBtn.addEventListener("click", onEnter);    
    
async function onEnter(e) {    
  e.preventDefault();    
  clearMessage();    
    
  const pinValue = (pinInput.value || "").trim();    
  if (!pinValue) {    
    showMessage("Introduce el PIN", "error");    
    return;    
  }    
    
  // Deshabilitar botón mientras consulta    
  enterBtn.disabled = true;    
  enterBtn.textContent = "Comprobando...";    
    
  try {    
    // Ruta: colección "Registro", documento "Usuario"    
    const docRef = doc(db, "Registro", "Usuario");    
    const snap = await getDoc(docRef);    
    
    if (!snap.exists()) {    
      showMessage("No se encontró el usuario en la base de datos", "error");    
      return;    
    }    
    
    // Ajusta el nombre del campo según esté en Firestore (ej: "PIN")    
    const data = snap.data();    
    const pinFirestore = (data?.PIN ?? "").toString().trim();    
    
    if (pinValue === pinFirestore) {    
      // PIN correcto -> redirigir a la carpeta banco/    
      showMessage("PIN correcto. Redirigiendo…", "success");    
      setTimeout(() => {    
        // Cambia la ruta si necesitas otra ubicación    
        window.location.href = "./banco/";    
      }, 600);    
    } else {    
      // PIN incorrecto    
      showMessage("PIN incorrecto", "error", 3000);    
    }    
    
  } catch (err) {    
    console.error("Error leyendo Firestore:", err);    
    showMessage("Error al verificar. Revisa la consola.", "error", 4000);    
  } finally {    
    enterBtn.disabled = false;    
    enterBtn.textContent = "Entrar";    
  }    
}    
    
/* ---------------- UI helpers ---------------- */    
function showMessage(text, type = "info", hideAfter = 3000) {    
  msg.textContent = text;    
  msg.className = "message " + type; // message + (error|success|info)    
  if (hideAfter && hideAfter > 0) {    
    setTimeout(() => clearMessage(), hideAfter);    
  }    
}    
function clearMessage() {    
  msg.textContent = "";    
  msg.className = "message";    
}