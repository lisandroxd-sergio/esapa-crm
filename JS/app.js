/* =============================================
   ESAPA CRM — app.js
   ============================================= */

/* ────────────────────────────────────────────
   CONFIGURACIÓN — EDITÁ SOLO ESTA SECCIÓN
   ──────────────────────────────────────────── */
const CONFIG = {
  // 1. Pegá aquí la URL de tu Google Apps Script (ver README)
  GOOGLE_SCRIPT_URL: "https://script.google.com/macros/s/AKfycbxvFBOQ_OWQCetWHVpLnGBQ49fgcIYJuqnPMS4LTR72KKtqzD6Rz4M-VFwqpAtymc5Fng/exec",

  // 2. Número de WhatsApp de ESAPA (para el chatbot, no se usa en el envío individual)
  WSP_ESAPA: "5492612345678",

  // 3. Mensaje automático de WhatsApp (usá {nombre} y {curso} como variables)
  WSP_MENSAJE: `¡Hola {nombre}! 👋

Te contactamos desde *ESAPA Instituto* para informarte que fuiste registrado/a en el sorteo de becas para el curso de *{curso}*.

📅 En los próximos días nos comunicaremos con vos para avisarte si sos ganador/a y darte más info sobre las inscripciones.

¡Muchas gracias por tu interés! 🎓`,
};
/* ─────────────────── FIN CONFIGURACIÓN ─────────────────── */


/* ── Estado global ── */
let datosParticipante = {};

/* ── Elementos del DOM ── */
const $ = id => document.getElementById(id);

const cardForm    = $("card-form");
const cardConfirm = $("card-confirm");
const cardSuccess = $("card-success");

const stepDots = [$("step-dot-1"), $("step-dot-2"), $("step-dot-3")];
const stepLines = document.querySelectorAll(".step-line");

/* ════════════════════════════════════════
   PASOS (step bar)
════════════════════════════════════════ */
function setStep(n) {
  stepDots.forEach((dot, i) => {
    dot.classList.remove("active", "done");
    if (i + 1 < n)  dot.classList.add("done");
    if (i + 1 === n) dot.classList.add("active");
  });
  stepLines.forEach((line, i) => {
    line.classList.toggle("done", i + 1 < n);
  });
}

/* ════════════════════════════════════════
   VALIDACIÓN
════════════════════════════════════════ */
function clearErrors() {
  ["nombre","telefono","fecha","curso"].forEach(id => {
    const errEl = $(`err-${id}`);
    const inputEl = $(id);
    if (errEl)  errEl.textContent = "";
    if (inputEl) inputEl.classList.remove("error");
  });
}

function showError(campo, msg) {
  const errEl = $(`err-${campo}`);
  const inputEl = $(campo);
  if (errEl)  errEl.textContent = msg;
  if (inputEl) inputEl.classList.add("error");
}

function validarFormulario() {
  clearErrors();
  let ok = true;

  const nombre = $("nombre").value.trim();
  if (!nombre) { showError("nombre", "El nombre es requerido."); ok = false; }
  else if (nombre.length < 3) { showError("nombre", "Ingresá el nombre completo."); ok = false; }

  const tel = $("telefono").value.trim().replace(/\D/g, "");
  if (!tel) { showError("telefono", "El teléfono es requerido."); ok = false; }
  else if (tel.length < 8 || tel.length > 13) { showError("telefono", "Número inválido. Ej: 2616123456"); ok = false; }

  const fecha = $("fecha").value;
  if (!fecha) { showError("fecha", "La fecha es requerida."); ok = false; }

  const cursoSel = $("curso").value;
  if (!cursoSel) { showError("curso", "Seleccioná un curso."); ok = false; }

  return ok;
}

/* ════════════════════════════════════════
   PASO 1 → 2: DATOS → CONFIRMACIÓN
════════════════════════════════════════ */
$("btn-continuar").addEventListener("click", () => {
  if (!validarFormulario()) return;

  const cursoSel = $("curso").value;
  const cursoFinal = cursoSel === "Otro"
    ? ($("otro-curso").value.trim() || "Otro")
    : cursoSel;

  const telRaw = $("telefono").value.trim().replace(/\D/g, "");

  datosParticipante = {
    nombre:   $("nombre").value.trim(),
    telefono: telRaw,
    fecha:    formatearFecha($("fecha").value),
    curso:    cursoFinal,
    notas:    $("notas").value.trim() || "-",
    timestamp: new Date().toISOString(),
  };

  // Armar tabla de confirmación
  const table = $("confirm-table");
  const filas = [
    ["Nombre",           datosParticipante.nombre],
    ["Teléfono",         "+54 " + datosParticipante.telefono],
    ["Fecha",            datosParticipante.fecha],
    ["Curso de interés", datosParticipante.curso],
    ["Notas",            datosParticipante.notas],
  ];

  table.innerHTML = filas.map(([k, v]) => `
    <div class="confirm-row">
      <span class="confirm-key">${k}</span>
      <span class="confirm-val">${v}</span>
    </div>
  `).join("");

  cardForm.classList.add("hidden");
  cardConfirm.classList.remove("hidden");
  setStep(2);
  window.scrollTo({ top: 0, behavior: "smooth" });
});

/* ── Volver ── */
$("btn-volver").addEventListener("click", () => {
  cardConfirm.classList.add("hidden");
  cardForm.classList.remove("hidden");
  setStep(1);
  window.scrollTo({ top: 0, behavior: "smooth" });
});

/* ── Campo "Otro" ── */
$("curso").addEventListener("change", function () {
  $("grupo-otro").classList.toggle("hidden", this.value !== "Otro");
});

/* ════════════════════════════════════════
   PASO 2 → 3: GUARDAR EN SHEETS + ÉXITO
════════════════════════════════════════ */
$("btn-guardar").addEventListener("click", async () => {
  const btn    = $("btn-guardar");
  const texto  = $("btn-guardar-text");
  const spin   = $("spinner");

  btn.disabled = true;
  texto.textContent = "Guardando...";
  spin.classList.remove("hidden");

  try {
    await enviarASheets(datosParticipante);

    // Armar mensaje WhatsApp
    const mensaje = CONFIG.WSP_MENSAJE
      .replace("{nombre}", datosParticipante.nombre)
      .replace("{curso}",  datosParticipante.curso);

    // Mostrar pantalla de éxito
    $("success-nombre").textContent = datosParticipante.nombre;
    $("wsp-preview").textContent = mensaje;

    // Botón WhatsApp
    const tel = "54" + datosParticipante.telefono;
    const wspUrl = `https://wa.me/${tel}?text=${encodeURIComponent(mensaje)}`;
    $("btn-wsp").onclick = () => window.open(wspUrl, "_blank");

    cardConfirm.classList.add("hidden");
    cardSuccess.classList.remove("hidden");
    setStep(3);
    window.scrollTo({ top: 0, behavior: "smooth" });
    showToast("✅ Participante registrado exitosamente", "success");

  } catch (err) {
    showToast("⚠️ Error al guardar. Verificá la conexión.", "error");
    console.error("Error al guardar en Sheets:", err);
  } finally {
    btn.disabled = false;
    texto.textContent = "Guardar y contactar";
    spin.classList.add("hidden");
  }
});

/* ── Nuevo participante ── */
$("btn-nuevo").addEventListener("click", () => {
  ["nombre","telefono","fecha","notas"].forEach(id => $(id).value = "");
  $("curso").value = "";
  $("otro-curso").value = "";
  $("grupo-otro").classList.add("hidden");
  clearErrors();
  datosParticipante = {};

  cardSuccess.classList.add("hidden");
  cardForm.classList.remove("hidden");
  setStep(1);
  window.scrollTo({ top: 0, behavior: "smooth" });
});

/* ════════════════════════════════════════
   GOOGLE SHEETS — Apps Script
════════════════════════════════════════ */
async function enviarASheets(datos) {
  // Si la URL es la de placeholder, simulamos el guardado (modo demo)
  if (CONFIG.GOOGLE_SCRIPT_URL.includes("TU_URL_AQUI")) {
    console.warn("⚠️ MODO DEMO: No hay URL de Google Apps Script configurada.");
    await new Promise(r => setTimeout(r, 1200)); // simular delay
    return { resultado: "demo" };
  }

  const resp = await fetch(CONFIG.GOOGLE_SCRIPT_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(datos),
  });

  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  return resp.json();
}

/* ════════════════════════════════════════
   CHATBOT
════════════════════════════════════════ */
const chatWindow  = $("chatbot-window");
const chatTrigger = $("chatbot-trigger");
const chatClose   = $("chat-close");
const chatInput   = $("chat-input");
const chatSend    = $("chat-send");
const chatMsgs    = $("chat-messages");

chatTrigger.addEventListener("click", () => chatWindow.classList.toggle("hidden"));
chatClose.addEventListener("click",   () => chatWindow.classList.add("hidden"));

chatSend.addEventListener("click", enviarMsgChat);
chatInput.addEventListener("keydown", e => {
  if (e.key === "Enter") enviarMsgChat();
});

function enviarMsgChat() {
  const msg = chatInput.value.trim();
  if (!msg) return;
  agregarBurbuja(msg, "user");
  chatInput.value = "";

  const typing = agregarBurbuja("···", "typing");
  setTimeout(() => {
    typing.remove();
    const respuesta = responderChat(msg);
    agregarBurbuja(respuesta, "bot");
  }, 800);
}

function agregarBurbuja(texto, tipo) {
  const el = document.createElement("div");
  el.className = `chat-bubble ${tipo}`;
  el.textContent = texto;
  chatMsgs.appendChild(el);
  chatMsgs.scrollTop = chatMsgs.scrollHeight;
  return el;
}

/* Lógica de respuestas del chatbot */
function responderChat(msg) {
  const m = msg.toLowerCase();

  if (/hola|buenas|saludo|hey/i.test(m))
    return "¡Hola! ¿En qué puedo ayudarte hoy? Puedo informarte sobre los cursos, becas o cómo completar el formulario.";

  if (/beca|sorteo|particip/i.test(m))
    return "Las becas se otorgan por sorteo entre los participantes registrados. Completá el formulario con los datos del interesado y el sistema lo registra automáticamente. 🎓";

  if (/curso|carrera|materia/i.test(m))
    return "Ofrecemos cursos de Administración, Marketing Digital, Diseño Gráfico, Programación Web, Enfermería, Gastronomía y más. ¿Te interesa alguno en particular?";

  if (/whatsapp|mensaje|contacto|enviar/i.test(m))
    return "Una vez que guardás el participante, el sistema abre WhatsApp con un mensaje personalizado listo para enviar. ¡Sin copiar ni pegar! 📲";

  if (/formulario|campo|completar|llenar/i.test(m))
    return "El formulario pide: Nombre completo, Teléfono (sin 0 ni 15), Fecha de inscripción y Curso de interés. Es rápido, menos de un minuto.";

  if (/sheets|excel|planilla|google/i.test(m))
    return "Los datos se guardan automáticamente en Google Sheets. ¡Ya no hace falta cargar nada a mano! Las compañeras pueden ver el registro en tiempo real.";

  if (/teléfono|numero|cel/i.test(m))
    return "El número se ingresa sin el 0 inicial y sin el 15. Por ejemplo, si el número es 0261 15-612-3456, ingresás: 2616123456.";

  if (/precio|costo|pagar/i.test(m))
    return "Para información sobre precios y aranceles, contactá directamente a ESAPA. Las becas pueden cubrir parte o la totalidad del curso.";

  if (/gracias|ok|listo|perfecto/i.test(m))
    return "¡De nada! Cualquier otra consulta, acá estoy. 😊";

  return "Entendí tu pregunta sobre \"" + msg + "\". Para más detalles podés consultar directamente en ESAPA o escribirnos. ¿Puedo ayudarte con algo más del formulario?";
}

/* ════════════════════════════════════════
   UTILIDADES
════════════════════════════════════════ */
function formatearFecha(isoDate) {
  if (!isoDate) return "";
  const [y, m, d] = isoDate.split("-");
  return `${d}/${m}/${y}`;
}

function showToast(msg, tipo = "") {
  const toast = $("toast");
  toast.textContent = msg;
  toast.className = `toast ${tipo}`;
  toast.classList.remove("hidden");
  setTimeout(() => toast.classList.add("hidden"), 3500);
}

/* ── Año en footer ── */
$("year").textContent = new Date().getFullYear();

/* ── Fecha por defecto = hoy ── */
$("fecha").value = new Date().toISOString().split("T")[0];

/* ── Paso inicial ── */
setStep(1);
