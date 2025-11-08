import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import {
  getFirestore,
  doc,
  onSnapshot,
  updateDoc,
  setDoc,
  getDoc
} from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";

/* ---------------- CONFIG FIREBASE ---------------- */
const firebaseConfig = {
  apiKey: "AIzaSyChWAjNRgPyJSnnCtks25fnmNGAptHsDGQ",
  authDomain: "wolfpay-dd57b.firebaseapp.com",
  projectId: "wolfpay-dd57b",
  storageBucket: "wolfpay-dd57b.firebasestorage.app",
  messagingSenderId: "1001364536237",
  appId: "1:1001364536237:web:81ba233c90677070a17f24",
  measurementId: "G-24Y3D7QNT1",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

/* ---------------- ELEMENTOS ---------------- */
const saldoDiv = document.querySelector(".saldo");
const cuenta = document.querySelector(".cuenta");
const toggleBtn = document.getElementById("toggleBtn");
const modalBg = document.getElementById("modalBg");
const modalText = document.getElementById("modalText");
const btnSi = modalBg.querySelector(".si");
const btnNo = modalBg.querySelector(".no");
const verificarBtn = document.querySelector(".verificar");
const bizumModalBg = document.getElementById("bizumModalBg");
const cerrarBizum = bizumModalBg.querySelector(".cerrar");
const verificarMontoBtn = bizumModalBg.querySelector(".verificarMonto");
const bizumMontoInput = document.getElementById("bizumInput");
const bizumMontoLabel = document.getElementById("bizumMonto");
let statusContainer = document.querySelector(".bizum-status");

/* ---------------- ESTADO ---------------- */
let estadoActual = "Activo";
let saldoAnterior = "";
let ultimoEstado = "";

/* ---------------- ESCUCHAS ---------------- */
// SALDO
onSnapshot(doc(db, "Bank", "Monto"), (snap) => {
  if (snap.exists()) {
    const nuevo = snap.data()?.Total || "0.00€";
    if (nuevo !== saldoAnterior) {
      saldoDiv.textContent = nuevo;
      saldoDiv.classList.remove("flash");
      void saldoDiv.offsetWidth;
      saldoDiv.classList.add("flash");
      saldoAnterior = nuevo;
    }
  }
});

// TARJETA
const tarjetaRef = doc(db, "Bank", "Tarjeta");
onSnapshot(tarjetaRef, (snap) => {
  if (snap.exists()) {
    estadoActual = snap.data().Estado;
    actualizarVista();
  }
});

function actualizarVista() {
  if (estadoActual === "Congelado") {
    cuenta.classList.add("congelada");
    toggleBtn.textContent = "Descongelar Tarjeta ☀️";
    toggleBtn.style.background = "#10c76f";
  } else {
    cuenta.classList.remove("congelada");
    toggleBtn.textContent = "Congelar Tarjeta ❄️";
    toggleBtn.style.background = "#b91c1c";
  }
}

// MODAL TARJETA
toggleBtn.addEventListener("click", () => {
  modalText.textContent =
    estadoActual === "Activo"
      ? "¿Está seguro de congelar la tarjeta?"
      : "¿Está seguro de descongelar la tarjeta?";
  modalBg.style.display = "flex";
});
btnNo.addEventListener("click", () => (modalBg.style.display = "none"));
btnSi.addEventListener("click", async () => {
  modalBg.style.display = "none";
  const nuevoEstado = estadoActual === "Activo" ? "Congelado" : "Activo";
  await updateDoc(tarjetaRef, { Estado: nuevoEstado });
});

/* ---------------- BIZUM ---------------- */
const verificarRef = doc(db, "Bizum", "Verificar");
const recibidoRef = doc(db, "Bizum", "Recibido");

/* --- Flash aviso temporal --- */
function showFlashMessage(msg) {
  let flash = document.createElement("div");
  flash.textContent = msg;
  flash.style.position = "fixed";
  flash.style.bottom = "80px";
  flash.style.left = "50%";
  flash.style.transform = "translateX(-50%)";
  flash.style.background = "rgba(17, 215, 215, 0.18)";
  flash.style.color = "#11d7d7";
  flash.style.fontWeight = "700";
  flash.style.padding = "12px 22px";
  flash.style.borderRadius = "12px";
  flash.style.boxShadow = "0 0 15px rgba(17,215,215,0.25)";
  flash.style.zIndex = "2000";
  flash.style.animation = "fadeFlash 2s ease";
  flash.style.backdropFilter = "blur(3px)";
  document.body.appendChild(flash);
  setTimeout(() => flash.remove(), 2000);
}

// Animación flash
const style = document.createElement("style");
style.textContent = `
@keyframes fadeFlash {
  0% {opacity: 0; transform: translateX(-50%) translateY(10px);}
  15% {opacity: 1; transform: translateX(-50%) translateY(0);}
  80% {opacity: 1;}
  100% {opacity: 0; transform: translateX(-50%) translateY(-10px);}
}
.verificar.disabled {
  opacity: 0.45 !important;
  pointer-events: auto !important;
  filter: grayscale(1);
}
`;
document.head.appendChild(style);

/* --- Notificación nativa --- */
async function enviarNotificacion(titulo, cuerpo) {
  if (!("Notification" in window)) return;
  if (Notification.permission === "granted") {
    new Notification(titulo, {
      body: cuerpo,
      icon: "../img/bizum.png",
      badge: "../img/bizum.png",
    });
  } else if (Notification.permission !== "denied") {
    const permiso = await Notification.requestPermission();
    if (permiso === "granted") {
      new Notification(titulo, {
        body: cuerpo,
        icon: "../img/bizum.png",
      });
    }
  }
}

/* --- Verificar Pago --- */
verificarBtn.addEventListener("click", () => {
  if (verificarBtn.classList.contains("disabled")) {
    showFlashMessage("⚠️ Primero debe cancelar la solicitud");
    return;
  }
  bizumModalBg.style.display = "flex";
  bizumMontoInput.value = "";
  bizumMontoInput.focus();
});

cerrarBizum.addEventListener("click", () => {
  bizumModalBg.style.display = "none";
});

function formatearEuro(val) {
  if (typeof val !== "string") val = String(val ?? "");
  val = val.replace(",", ".").replace(/[^\d.]/g, "");
  const num = parseFloat(val);
  if (isNaN(num)) return null;
  return num.toFixed(2) + "€";
}

verificarMontoBtn.addEventListener("click", async () => {
  const formatted = formatearEuro(bizumMontoInput.value);
  if (!formatted) {
    bizumMontoInput.placeholder = "Monto inválido";
    return;
  }
  bizumModalBg.style.display = "none";
  await setDoc(recibidoRef, { Monto: formatted }, { merge: true });
  await setDoc(verificarRef, { Estado: "Esperando" }, { merge: true });
  verificarBtn.classList.add("disabled");
});

// Escucha cambios de estado
onSnapshot(verificarRef, (snap) => {
  if (!snap.exists()) {
    statusContainer.innerHTML = "";
    bizumMontoLabel.classList.remove("visible");
    verificarBtn.classList.remove("disabled");
    return;
  }
  const estado = snap.data().Estado;

  if (estado === "Nada") {
    verificarBtn.classList.remove("disabled");
    bizumMontoLabel.classList.remove("visible");
  }

  renderEstado(estado);
});

// Mostrar estado Bizum y botón debajo
function renderEstado(estado) {
  statusContainer.innerHTML = "";
  if (estado === "Nada" || !estado) {
    bizumMontoLabel.classList.remove("visible");
    verificarBtn.classList.remove("disabled");
    return;
  }

  const msg = document.createElement("div");
  msg.classList.add("estadoMsg");

  if (estado === "Esperando") {
    msg.innerHTML = `<p class="gris">EN VERIFICACIÓN</p><span>En un momento se revisará el estado</span>`;
    statusContainer.appendChild(msg);
    ponerCancelar();
  } else if (estado === "Verificando") {
    msg.innerHTML = `<p class="naranja">ESPERANDO EL DINERO 🕒</p>`;
    statusContainer.appendChild(msg);
    ponerCancelar();
  } else if (estado === "Recibido") {
    msg.innerHTML = `<p class="verde">DINERO RECIBIDO ✅</p><span>En unos momentos saldrá en su saldo</span>`;
    statusContainer.appendChild(msg);
    limpiarAuto(4000);
  } else if (estado === "Rechazo") {
    msg.innerHTML = `<p class="rojo">NO LLEGÓ EL DINERO ❌</p><span>El tiempo estimado para que llegue el dinero culminó</span>`;
    statusContainer.appendChild(msg);
    limpiarAuto(5000);
  }
}

// Botón Cancelar
function ponerCancelar() {
  const btn = document.createElement("button");
  btn.className = "cancelarBizum";
  btn.textContent = "Cancelar Solicitud";
  btn.addEventListener("click", cancelarSolicitud);
  statusContainer.appendChild(btn);
}

// Confirmar cancelación
function cancelarSolicitud() {
  const confirmBg = document.createElement("div");
  confirmBg.className = "modal-bg";
  confirmBg.style.display = "flex";
  confirmBg.innerHTML = `
    <div class="modal">
      <h3>¿Desea cancelar la solicitud?</h3>
      <div class="buttons">
        <button class="no">No</button>
        <button class="si">Sí</button>
      </div>
    </div>
  `;
  document.body.appendChild(confirmBg);
  confirmBg.querySelector(".no").onclick = () => confirmBg.remove();
  confirmBg.querySelector(".si").onclick = async () => {
    await setDoc(verificarRef, { Estado: "Nada" }, { merge: true });
    await setDoc(recibidoRef, { Monto: "0.00€" }, { merge: true });
    verificarBtn.classList.remove("disabled");
    confirmBg.remove();
  };
}

// Limpieza automática tras Recibido/Rechazo
function limpiarAuto(ms) {
  setTimeout(async () => {
    await setDoc(verificarRef, { Estado: "Nada" }, { merge: true });
    await setDoc(recibidoRef, { Monto: "0.00€" }, { merge: true });
    verificarBtn.classList.remove("disabled");
  }, ms);
}

// Mostrar monto solo cuando hay transacción activa
onSnapshot(recibidoRef, (snap) => {
  if (snap.exists()) {
    const monto = snap.data()?.Monto;
    if (monto && monto !== "0.00€") {
      bizumMontoLabel.textContent = monto;
      bizumMontoLabel.classList.add("visible");
      verificarBtn.classList.add("disabled");
    } else {
      bizumMontoLabel.classList.remove("visible");
      verificarBtn.classList.remove("disabled");
    }
  } else {
    bizumMontoLabel.classList.remove("visible");
    verificarBtn.classList.remove("disabled");
  }
});

/* 🔔 Detectar si el estado pasa a “Recibido” y notificar */
onSnapshot(verificarRef, async (snap) => {
  if (!snap.exists()) return;
  const estado = snap.data().Estado;
  if (estado === "Recibido" && estado !== ultimoEstado) {
    const montoSnap = await getDoc(recibidoRef);
    const monto = montoSnap.data()?.Monto || "";

    enviarNotificacion("Bizum recibido ✅", `Recibió un bizum de ${monto}`);
    enviarNotificacionTelegram(monto); // 🔔 Enviar por Telegram
  }
  ultimoEstado = estado;
});

/* =================== TELEGRAM INTEGRACIÓN =================== */
async function enviarNotificacionTelegram(monto) {
  const token = "8530583161:AAHXahSmOF0CvgIdEogCfRMgd7lyFl6FqO0"; // 🔹 Pega aquí tu token
  const chatId = "8538722405";      // 🔹 Tu chat_id personal
  const mensaje = `Has recibido un bizum de ${monto}`;

  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  const body = {
    chat_id: chatId,
    text: mensaje,
    parse_mode: "Markdown"
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    if (res.ok) {
      console.log("✅ Notificación enviada a Telegram");
    } else {
      console.error("❌ Error enviando a Telegram:", await res.text());
    }
  } catch (err) {
    console.error("⚠️ Error de red enviando a Telegram:", err);
  }
}