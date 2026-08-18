/* ==========================================================================
   DotaciónPro — app.js
   Reconstrucción del sistema de cotizaciones y consecución de clientes
   para Dotaciones El Manantial S.A.S.
   ========================================================================== */

/* ---------------------- Traducción de sectores (a español) ---------------------- */
const SECTOR_ES = {
  "restaurant": "Restaurante", "school": "Colegio", "company": "Empresa", "fast food": "Comida rápida",
  "cafe": "Cafetería", "diplomatic": "Entidad diplomática", "bakery": "Panadería", "university": "Universidad",
  "supermarket": "Supermercado", "car repair": "Taller de carros", "convenience": "Tienda de barrio",
  "educational institution": "Institución educativa", "hardware": "Ferretería", "clothes": "Ropa",
  "car parts": "Repuestos de carros", "restaurante": "Restaurante", "pharmacy": "Farmacia", "trade": "Comercio",
  "clinic": "Clínica", "hairdresser": "Peluquería", "fitness centre": "Gimnasio", "government": "Entidad de gobierno",
  "butcher": "Carnicería", "craft": "Artesanías", "florist": "Floristería", "bicycle": "Bicicletas",
  "electronics": "Electrónica", "veterinary": "Veterinaria", "comidas": "Comidas", "furniture": "Muebles",
  "travel agency": "Agencia de viajes", "beauty": "Belleza", "blood donation": "Banco de sangre", "bank": "Banco",
  "it": "Tecnología / TI", "fabrica": "Fábrica", "doctor": "Consultorio médico", "stationery": "Papelería",
  "laundry": "Lavandería", "computer": "Computadores", "chemist": "Droguería", "college": "Instituto / Universidad",
  "dentist": "Odontología", "motorcycle": "Motos", "ngo": "ONG / Fundación", "department store": "Almacén por departamentos",
  "pet": "Mascotas", "hospital": "Hospital", "storage rental": "Bodegas en arriendo", "greengrocer": "Fruver",
  "kindergarten": "Jardín infantil", "erotic": "Tienda para adultos", "alcohol": "Licorera",
  "advertising agency": "Agencia de publicidad", "photo": "Estudio fotográfico", "outdoor": "Artículos deportivos/outdoor",
  "": "Sin sector", "books": "Librería", "copyshop": "Fotocopiadora", "car": "Concesionario de carros",
  "optician": "Óptica", "sports": "Artículos deportivos", "tailor": "Sastrería", "lawyer": "Abogado",
  "mall": "Centro comercial", "association": "Asociación", "language school": "Instituto de idiomas",
  "pastry": "Pastelería", "gift": "Regalos", "electrician": "Electricista", "beverages": "Bebidas",
  "shoes": "Calzado", "metal construction": "Metalmecánica", "mobile phone": "Celulares", "carpenter": "Carpintería",
  "repair": "Reparaciones", "security": "Seguridad", "foundation": "Fundación", "estate agent": "Inmobiliaria",
  "insurance": "Seguros", "leather": "Marroquinería", "tattoo": "Tatuajes", "glaziery": "Vidriería",
  "motorcycle repair": "Taller de motos", "fabric": "Telas", "tinsmith": "Hojalatería", "cosmetics": "Cosméticos",
  "driving school": "Escuela de conducción", "paint": "Pinturas", "music school": "Escuela de música",
  "dry cleaning": "Lavandería en seco", "dairy": "Lácteos", "notary": "Notaría", "bag": "Bolsos",
  "laboratory": "Laboratorio", "appliance": "Electrodomésticos", "window construction": "Fabricación de ventanas",
  "doityourself": "Ferretería / Bricolaje", "health food": "Alimentos saludables", "variety store": "Miscelánea",
  "collector": "Coleccionismo", "colegio": "Colegio", "yes": "Sin clasificar", "cannabis": "Tienda de cannabis",
  "dressmaker": "Modistería", "curtain": "Cortinas", "marketplace": "Plaza de mercado", "yarn": "Lanas y tejidos",
  "graphic design": "Diseño gráfico", "water utility": "Acueducto / Servicios de agua", "seafood": "Pescadería",
  "financial services": "Servicios financieros", "locksmith": "Cerrajería", "employment agency": "Agencia de empleo",
  "religion": "Entidad religiosa", "antiques": "Antigüedades", "toys": "Juguetería", "physiotherapist": "Fisioterapia",
  "upholsterer": "Tapicería", "audiologist": "Audiología", "confectionery": "Dulcería", "kitchen": "Cocinas",
  "stadium": "Estadio", "pet grooming": "Peluquería canina", "video games": "Videojuegos", "art": "Arte",
  "financial": "Servicios financieros", "candles": "Velas", "key cutter": "Cerrajería", "hifi": "Equipos de sonido",
  "dancing school": "Escuela de baile", "internet cafe": "Café internet", "counselling": "Asesoría / Consultoría",
  "industria": "Industria", "shoemaker": "Zapatería", "photographic laboratory": "Laboratorio fotográfico",
  "factory": "Fábrica", "handicraft": "Artesanías", "motorcycle parts": "Repuestos de motos", "tyres": "Llantas",
  "café": "Cafetería", "kiosk": "Kiosco", "telecommunication": "Telecomunicaciones", "financial advisor": "Asesor financiero",
  "houseware": "Menaje del hogar", "estación de servicio": "Estación de servicio", "pasta": "Pastas", "salud": "Salud",
  "accountant": "Contador", "oil": "Lubricantes", "general": "General", "flooring": "Pisos",
  "medical supply": "Insumos médicos", "jewelry": "Joyería", "electronics repair": "Reparación de electrónicos",
  "farm": "Agropecuario", "property management": "Administración de propiedades", "nutrition supplements": "Suplementos nutricionales",
  "ticket": "Boletería", "speech therapist": "Fonoaudiología",
};
function traducirSector(s) {
  if (!s) return "";
  const key = String(s).trim().toLowerCase();
  if (SECTOR_ES[key]) return SECTOR_ES[key];
  // Si no está en el diccionario, se normaliza como fallback (guiones/underscores -> espacios, mayúscula inicial)
  const limpio = key.replace(/[_-]+/g, " ").trim();
  return limpio ? limpio.charAt(0).toUpperCase() + limpio.slice(1) : s;
}

/* ---------------------------- Utilidades ---------------------------- */
const $ = (sel, root=document) => root.querySelector(sel);
const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const fmtCOP = (n) => "$" + Math.round(n || 0).toLocaleString("es-CO");
const todayISO = () => new Date().toISOString().slice(0, 10);
const fmtFechaCorta = (d) => {
  if (!d) return "";
  const dt = new Date(d);
  if (isNaN(dt)) return d;
  return dt.toLocaleDateString("es-CO", { day: "2-digit", month: "short" });
};
function toast(msg, ms = 2600) {
  const el = $("#toast");
  el.textContent = msg;
  el.classList.remove("hidden");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.add("hidden"), ms);
}
function openModal(id) { $(id.startsWith("#") ? id : "#" + id).classList.remove("hidden"); }
function closeModal(id) { $(id.startsWith("#") ? id : "#" + id).classList.add("hidden"); }
document.addEventListener("click", (e) => {
  const closeBtn = e.target.closest("[data-close-modal]");
  if (closeBtn) closeModal(closeBtn.dataset.closeModal);
});

const ESTADOS_EMPRESA = ["Pendiente", "Enviado", "Respondió", "Cotizado", "Confirmado", "Entregado", "Rechazado", "Anulado"];
const ESTADOS_PEDIDO = ["Pendiente", "Confirmado", "En proceso", "Entregado", "Anulado"];

/* ---------------------------- Almacenamiento (localStorage) ---------------------------- */
const LS = {
  get(key, fallback) {
    try { const v = localStorage.getItem("dp_" + key); return v ? JSON.parse(v) : fallback; }
    catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem("dp_" + key, JSON.stringify(value)); }
    catch { avisarIdbFalla(); }
  },
  remove(key) { try { localStorage.removeItem("dp_" + key); } catch {} },
};

const DEFAULT_CONFIG = {
  empresa: {
    nombre: "Dotaciones El Manantial S.A.S",
    direccion: "Carrera 34 No. 2-62",
    ciudad: "Bogotá D.C., Colombia",
    telefono: "313 574 5063",
    correo: "dot.manantial@hotmail.com",
  },
  templates: {
    whatsapp: "Hola {contacto}, le escribimos de {miEmpresa}. Con gusto le enviamos el catálogo de dotación industrial y EPP con precios. ¿Le interesa que le preparemos una cotización?",
    correo: "Buen día:\n\nCon gusto ponemos a su disposición nuestro portafolio de dotación industrial y elementos de protección personal.\n\nQuedo atento a sus comentarios.\n\nCordial saludo,",
    descuentos: "Manejamos descuentos por volumen a partir de 20 unidades.",
  },
  diasSeguimiento: 5,
  brevo: { key: "", remitente: "" },
  google: { key: "" },
  pin: null,
  onboardingDone: false,
  negocioGeo: null, // { lat, lon } — se guarda tras la primera búsqueda en el mapa
  lastBackup: null, // fecha ISO del último respaldo guardado
  avisoGuardadoCerrado: false,
};

function haversineMetros(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1), dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
function distanciaTexto(lat1, lon1, lat2, lon2) {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return "";
  const dist = haversineMetros(lat1, lon1, lat2, lon2);
  return dist < 1000 ? `A ${Math.round(dist)} m` : `A ${(dist / 1000).toFixed(1)} km`;
}

let CONFIG = Object.assign({}, DEFAULT_CONFIG, LS.get("config", {}));
CONFIG.empresa = Object.assign({}, DEFAULT_CONFIG.empresa, CONFIG.empresa);
CONFIG.templates = Object.assign({}, DEFAULT_CONFIG.templates, CONFIG.templates);
CONFIG.brevo = Object.assign({}, DEFAULT_CONFIG.brevo, CONFIG.brevo);
CONFIG.google = Object.assign({}, DEFAULT_CONFIG.google, CONFIG.google);
function saveConfig() { LS.set("config", CONFIG); }

let PEDIDOS = LS.get("pedidos", []);
function savePedidos() { LS.set("pedidos", PEDIDOS); }

/* ---------------------------- Empresas (IndexedDB) ---------------------------- */
const IDB_NAME = "dotacionpro_db";
const IDB_STORE = "empresas";
let _dbPromise = null;
function openDB() {
  if (_dbPromise) return _dbPromise;
  _dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") { reject(new Error("indexedDB no disponible en este navegador")); return; }
    let req;
    try { req = indexedDB.open(IDB_NAME, 1); } catch (err) { reject(err); return; }
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return _dbPromise;
}
let _idbAvisoMostrado = false;
function avisarIdbFalla() {
  if (_idbAvisoMostrado) return;
  _idbAvisoMostrado = true;
  toast("Tu navegador bloqueó el almacenamiento local. Los cambios de empresas no se guardarán al cerrar.");
}
async function idbGetAll() {
  try {
    const db = await openDB();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, "readonly");
      const req = tx.objectStore(IDB_STORE).getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  } catch (err) { avisarIdbFalla(); return []; }
}
async function idbPut(item) {
  try {
    const db = await openDB();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, "readwrite");
      tx.objectStore(IDB_STORE).put(item);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) { avisarIdbFalla(); return; }
}
async function idbPutMany(items) {
  try {
    const db = await openDB();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, "readwrite");
      const store = tx.objectStore(IDB_STORE);
      items.forEach((it) => store.put(it));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) { avisarIdbFalla(); return; }
}
async function idbDelete(id) {
  try {
    const db = await openDB();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, "readwrite");
      tx.objectStore(IDB_STORE).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) { avisarIdbFalla(); return; }
}
async function idbClear() {
  try {
    const db = await openDB();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, "readwrite");
      tx.objectStore(IDB_STORE).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) { avisarIdbFalla(); return; }
}

let EMPRESAS = []; // caché en memoria

function empresaMatchFiltro(e) {
  const q = ($("#emp-buscar")?.value || "").trim().toLowerCase();
  const estado = $("#emp-filtro-estado")?.value || "";
  const sector = $("#emp-filtro-sector")?.value || "";
  const soloContacto = $("#emp-solo-contacto")?.checked;
  const soloDotacion = $("#emp-solo-dotacion")?.checked;
  if (q) {
    const hay = [e.nombre, e.contacto, e.email, e.direccion].join(" ").toLowerCase();
    if (!hay.includes(q)) return false;
  }
  if (estado && e.estado !== estado) return false;
  if (sector && e.sector !== sector) return false;
  if (soloContacto && !(e.email || e.telefono)) return false;
  if (soloDotacion && e.prioridad !== 1) return false;
  return true;
}

/* ---------------------------- Router de vistas ---------------------------- */
function irAVista(vista) {
  $$(".view").forEach((v) => v.classList.add("hidden"));
  $("#view-" + vista)?.classList.remove("hidden");
  $$(".tab").forEach((t) => t.classList.toggle("active", t.dataset.view === vista));
  if (vista === "inicio") renderInicio();
  if (vista === "empresas") renderEmpresas();
  if (vista === "mapa") renderMapa();
  if (vista === "pedidos") renderPedidos();
  if (vista === "stats") renderStats();
  if (vista === "config") renderConfig();
  try { window.scrollTo(0, 0); } catch {}
}
$$(".tab").forEach((t) => t.addEventListener("click", () => irAVista(t.dataset.view)));

/* ==========================================================================
   PIN / seguridad
   ========================================================================== */
function simpleHash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) { h = (h << 5) - h + str.charCodeAt(i); h |= 0; }
  return String(h);
}
function initPin() {
  $("#btn-bloquear").classList.toggle("hidden", !CONFIG.pin);
  if (!CONFIG.pin) { $("#pin-screen").classList.add("hidden"); $("#app").classList.remove("hidden"); return; }
  $("#pin-screen").classList.remove("hidden");
  $("#app").classList.add("hidden");
  $("#pin-title").textContent = "Ingresa tu clave";
  $("#pin-input").value = "";
  $("#pin-input").focus();
}
$("#pin-submit").addEventListener("click", intentarPin);
$("#pin-input").addEventListener("keydown", (e) => { if (e.key === "Enter") intentarPin(); });
$("#btn-bloquear").addEventListener("click", () => {
  if (!CONFIG.pin) return;
  $("#pin-screen").classList.remove("hidden");
  $("#app").classList.add("hidden");
  $("#pin-input").value = "";
  $("#pin-error").classList.add("hidden");
});
function intentarPin() {
  const val = $("#pin-input").value;
  if (simpleHash(val) === CONFIG.pin) {
    $("#pin-screen").classList.add("hidden");
    $("#app").classList.remove("hidden");
    $("#pin-error").classList.add("hidden");
  } else {
    $("#pin-error").textContent = "Clave incorrecta. Intenta de nuevo.";
    $("#pin-error").classList.remove("hidden");
  }
}

/* ==========================================================================
   INICIO
   ========================================================================== */
function renderInicio() {
  const hora = new Date().getHours();
  const saludo = hora < 12 ? "Buen día" : hora < 18 ? "Buenas tardes" : "Buenas noches";
  $("#inicio-saludo").innerHTML = `<strong>${saludo}${CONFIG.empresa.nombre ? ", " + CONFIG.empresa.nombre : ""}.</strong><br><span class="muted small">Bienvenido a DotaciónPro.</span>`;

  const pendientesNoContactadas = EMPRESAS.filter((e) => !e.estado || e.estado === "Pendiente");
  const pedidosActivos = PEDIDOS.filter((p) => !["Entregado", "Anulado"].includes(p.estado));
  const saldoTotal = PEDIDOS.reduce((acc, p) => acc + Math.max(0, calcularTotal(p) - (p.abono || 0)), 0);

  $("#kpi-empresas").textContent = EMPRESAS.length;
  $("#kpi-pendientes").textContent = pendientesNoContactadas.length;
  $("#kpi-pedidos").textContent = pedidosActivos.length;
  $("#kpi-saldo").textContent = fmtCOP(saldoTotal);

  const pasos = [
    { texto: "Completa los datos de tu empresa en Configuración", hecho: !!CONFIG.empresa.nombre },
    { texto: "Carga o busca tus primeras empresas", hecho: EMPRESAS.length > 0 },
    { texto: "Crea tu primer pedido o cotización", hecho: PEDIDOS.length > 0 },
    { texto: "Responde a los interesados en menos de 5 minutos (regla de oro)", hecho: false },
  ];
  $("#steps-list").innerHTML = pasos.map((p) => `<li class="${p.hecho ? "done" : ""}">${p.hecho ? "✅" : "⬜"} ${p.texto}</li>`).join("");

  // --- Avisos ---
  $("#aviso-guardado").classList.toggle("hidden", !!CONFIG.avisoGuardadoCerrado || EMPRESAS.length === 0);
  const dias = CONFIG.lastBackup ? Math.floor((Date.now() - new Date(CONFIG.lastBackup).getTime()) / 86400000) : null;
  const mostrarAvisoBackup = EMPRESAS.length > 0 && (dias === null || dias >= 7);
  $("#aviso-backup").classList.toggle("hidden", !mostrarAvisoBackup);
  if (mostrarAvisoBackup) {
    $("#aviso-backup-texto").innerHTML = dias === null
      ? "Aún no has guardado una copia de seguridad de tu lista."
      : `Llevas ${dias} días sin guardar copia de seguridad. Tu lista vive en este navegador: expórtala para no perderla.`;
  }

  // --- Para contactar hoy: pendientes más cercanas, con distancia si hay geo ---
  let candidatas = pendientesNoContactadas.slice();
  if (CONFIG.negocioGeo) {
    candidatas = candidatas
      .map((e) => ({ e, d: (e.lat != null && e.lon != null) ? haversineMetros(CONFIG.negocioGeo.lat, CONFIG.negocioGeo.lon, e.lat, e.lon) : Infinity }))
      .sort((a, b) => a.d - b.d)
      .map((x) => x.e);
  }
  const seguim = candidatas.slice(0, 5);
  $("#seguimientos-list").innerHTML = seguim.length
    ? seguim.map((e) => `
      <div class="item-row-static">
        <div class="item-main" data-abrir-empresa="${e.id}" style="cursor:pointer">
          <div class="item-title">${escapeHtml(e.nombre)} ${e.lat!=null && CONFIG.negocioGeo ? `<span class="badge badge-pendiente">${distanciaTexto(CONFIG.negocioGeo.lat, CONFIG.negocioGeo.lon, e.lat, e.lon)}</span>` : ""}</div>
          <div class="item-sub">${escapeHtml(traducirSector(e.sector) || e.direccion || "")}</div>
        </div>
        <div class="btn-row">
          <button class="btn btn-secondary btn-sm" data-inicio-whatsapp="${e.id}">WhatsApp</button>
          <button class="btn btn-ghost btn-sm" data-inicio-catalogo="${e.id}">Catálogo</button>
        </div>
      </div>`).join("")
    : `<p class="muted small">Ninguna respuesta nueva por ahora.</p>`;
  $$("[data-abrir-empresa]", $("#seguimientos-list")).forEach((el) =>
    el.addEventListener("click", () => abrirFichaEmpresa(el.dataset.abrirEmpresa))
  );
  $$("[data-inicio-whatsapp]", $("#seguimientos-list")).forEach((el) =>
    el.addEventListener("click", () => enviarWhatsApp(EMPRESAS.find((e) => e.id === el.dataset.inicioWhatsapp)))
  );
  $$("[data-inicio-catalogo]", $("#seguimientos-list")).forEach((el) =>
    el.addEventListener("click", () => enviarCatalogoWhatsApp(EMPRESAS.find((e) => e.id === el.dataset.inicioCatalogo)))
  );

  // --- Seguimiento por WhatsApp (SOLO a empresas ya contactadas sin respuesta;
  //     nunca frío: el primer toque lo hace el Motor de correos) ---
  const seguimientoWA = EMPRESAS.filter((e) => e.estado === "Enviado" && e.telefono);
  $("#card-contactar-masivo").classList.toggle("hidden", seguimientoWA.length === 0);
  $("#btn-contactar-masivo").textContent = `🔁 Seguimiento por WhatsApp a ${seguimientoWA.length} contactadas`;

  // --- Seguimientos sugeridos: contactadas hace tiempo, sin respuesta ---
  const hoyMs = Date.now();
  const sinRespuesta = EMPRESAS
    .filter((e) => e.fechaUltimoContacto && ["Enviado", "Cotizado"].includes(e.estado))
    .map((e) => ({ e, dias: Math.floor((hoyMs - new Date(e.fechaUltimoContacto).getTime()) / 86400000) }))
    .filter((x) => x.dias >= (CONFIG.diasSeguimiento || 5))
    .sort((a, b) => b.dias - a.dias)
    .slice(0, 10);
  $("#card-sin-respuesta").classList.toggle("hidden", sinRespuesta.length === 0);
  $("#sin-respuesta-list").innerHTML = sinRespuesta.map(({ e, dias }) => `
    <div class="item-row-static">
      <div class="item-main" data-abrir-empresa="${e.id}" style="cursor:pointer">
        <div class="item-title">${escapeHtml(e.nombre)} <span class="badge badge-pendiente">${dias} días sin respuesta</span></div>
      </div>
      <div class="btn-row">
        <button class="btn btn-secondary btn-sm" data-sr-whatsapp="${e.id}">WhatsApp</button>
        <button class="btn btn-ghost btn-sm" data-sr-correo="${e.id}">Correo</button>
      </div>
    </div>`).join("");
  $$("[data-abrir-empresa]", $("#sin-respuesta-list")).forEach((el) =>
    el.addEventListener("click", () => abrirFichaEmpresa(el.dataset.abrirEmpresa))
  );
  $$("[data-sr-whatsapp]", $("#sin-respuesta-list")).forEach((el) =>
    el.addEventListener("click", () => enviarWhatsApp(EMPRESAS.find((e) => e.id === el.dataset.srWhatsapp)))
  );
  $$("[data-sr-correo]", $("#sin-respuesta-list")).forEach((el) =>
    el.addEventListener("click", () => enviarCorreo(EMPRESAS.find((e) => e.id === el.dataset.srCorreo)))
  );
}
$("#btn-cerrar-aviso-guardado")?.addEventListener("click", () => { CONFIG.avisoGuardadoCerrado = true; saveConfig(); renderInicio(); });
$("#btn-ir-backup")?.addEventListener("click", () => irAVista("config"));

// Seguimiento por WhatsApp: SOLO empresas ya contactadas ("Enviado") sin
// respuesta. Máximo 15 al día para proteger el número del negocio.
$("#btn-contactar-masivo")?.addEventListener("click", async () => {
  const cohorte = EMPRESAS.filter((e) => e.estado === "Enviado" && e.telefono);
  if (!cohorte.length) { toast("No hay contactadas pendientes de seguimiento con teléfono."); return; }
  const tanda = cohorte.slice(0, 15);
  if (!confirm(`Se abrirán ${tanda.length} WhatsApp de SEGUIMIENTO (a empresas ya contactadas), uno por uno. ¿Continuar?`)) return;
  for (const empresa of tanda) {
    await enviarWhatsApp(empresa);
  }
  toast(`Seguimientos abiertos. Máximo una tanda al día para cuidar tu número.`);
  renderInicio();
});

/* ---------- Búsqueda rápida de contacto (desde Inicio) ---------- */
$("#inicio-buscar")?.addEventListener("input", (e) => {
  const q = e.target.value.trim().toLowerCase();
  const cont = $("#inicio-buscar-resultados");
  if (!q) { cont.innerHTML = ""; return; }
  const resultados = EMPRESAS.filter((emp) => {
    const hay = [emp.nombre, emp.contacto, emp.email, emp.telefono, emp.direccion].join(" ").toLowerCase();
    return hay.includes(q);
  }).slice(0, 8);
  cont.innerHTML = resultados.length
    ? resultados.map((emp) => `
      <div class="item-row-static" data-abrir-empresa="${emp.id}" style="cursor:pointer">
        <div class="item-main">
          <div class="item-title">${escapeHtml(emp.nombre)}</div>
          <div class="item-sub">📧 ${escapeHtml(emp.email || "Sin correo")} · 📞 ${escapeHtml(emp.telefono || "Sin teléfono")}</div>
          <div class="item-sub">📍 ${escapeHtml(emp.direccion || "Sin dirección")}</div>
        </div>
        <span class="badge ${badgeClass(emp.estado)}">${emp.estado || "Pendiente"}</span>
      </div>`).join("")
    : `<p class="muted small">No encontramos ninguna empresa con ese dato.</p>`;
  $$("[data-abrir-empresa]", cont).forEach((el) => el.addEventListener("click", () => abrirFichaEmpresa(el.dataset.abrirEmpresa)));
});

function badgeClass(estado) {
  const map = {
    "Pendiente": "badge-pendiente", "Enviado": "badge-enviado", "Cotizado": "badge-cotizado",
    "Confirmado": "badge-confirmado", "Entregado": "badge-entregado", "Anulado": "badge-anulado",
    "Rechazado": "badge-rechazado", "Respondió": "badge-respondio", "En proceso": "badge-encurso",
  };
  return map[estado] || "badge-pendiente";
}
function escapeHtml(s) {
  return String(s || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

/* ==========================================================================
   EMPRESAS
   ========================================================================== */
function poblarSelectsEmpresas() {
  const selEstado = $("#emp-filtro-estado");
  selEstado.innerHTML = `<option value="">Todos los estados</option>` + ESTADOS_EMPRESA.map((s) => `<option value="${s}">${s}</option>`).join("");
  const sectores = Array.from(new Set(EMPRESAS.map((e) => e.sector).filter(Boolean))).sort((a, b) => traducirSector(a).localeCompare(traducirSector(b), "es"));
  const selSector = $("#emp-filtro-sector");
  selSector.innerHTML = `<option value="">Todos los sectores</option>` + sectores.map((s) => `<option value="${escapeHtml(s)}">${escapeHtml(traducirSector(s))}</option>`).join("");
}

function renderEmpresas() {
  poblarSelectsEmpresas();
  const filtradas = EMPRESAS.filter(empresaMatchFiltro);
  $("#emp-count").textContent = `Mostrando ${filtradas.length} de ${EMPRESAS.length} empresas`;
  const lista = $("#emp-lista");
  if (!EMPRESAS.length) {
    lista.innerHTML = `<div class="card"><p>Carga tus primeras empresas: usa <b>"Cargar empresas de Bogotá"</b> para importar la base ya lista, o <b>"Buscar empresas cerca de mi negocio"</b> para traer negocios reales del mapa.</p></div>`;
    return;
  }
  lista.innerHTML = filtradas.slice(0, 300).map((e) => `
    <div class="item-row" data-abrir-empresa="${e.id}">
      <div class="item-main">
        <div class="item-title">${escapeHtml(e.nombre)}</div>
        <div class="item-sub">${escapeHtml(e.contacto || e.direccion || traducirSector(e.sector) || "Sin datos")}</div>
      </div>
      <span class="badge ${badgeClass(e.estado)}">${e.estado || "Pendiente"}</span>
    </div>`).join("") + (filtradas.length > 300 ? `<p class="muted small">Y ${filtradas.length - 300} más. Usa la búsqueda para acotar.</p>` : "");
  $$("[data-abrir-empresa]", lista).forEach((el) => el.addEventListener("click", () => abrirFichaEmpresa(el.dataset.abrirEmpresa)));
}
["input", "change"].forEach((ev) => {
  $("#emp-buscar").addEventListener(ev, renderEmpresas);
  $("#emp-filtro-estado").addEventListener(ev, renderEmpresas);
  $("#emp-filtro-sector").addEventListener(ev, renderEmpresas);
  $("#emp-solo-contacto").addEventListener(ev, renderEmpresas);
  $("#emp-solo-dotacion")?.addEventListener(ev, renderEmpresas);
});

async function cargarEmpresasInicial() {
  EMPRESAS = await idbGetAll();
}

$("#btn-cargar-bogota").addEventListener("click", async () => {
  if (!confirm("Esto importará más de 18.000 empresas de Bogotá a tu lista (11.000 con correo y 5.000 que compran dotación). ¿Continuar?")) return;
  toast("Cargando base de Bogotá…");
  try {
    const res = await fetch("./empresas-bogota.json");
    if (!res.ok) throw new Error("no-data");
    const datos = await res.json();
    const clave = (nombre, direccion) => (nombre || "").toLowerCase().trim() + "|" + (direccion || "").toLowerCase().trim();
    const existentesClaves = new Set(EMPRESAS.map((e) => clave(e.nombre, e.direccion)));
    const nuevas = [];
    datos.forEach((d) => {
      if (existentesClaves.has(clave(d.nombre, d.direccion))) return;
      existentesClaves.add(clave(d.nombre, d.direccion));
      let fechaUltimoContacto = null;
      if (d.fecha_envio) {
        const [dd, mm, yyyy] = String(d.fecha_envio).split("/");
        if (dd && mm && yyyy) { const dt = new Date(+yyyy, +mm - 1, +dd); if (!isNaN(dt)) fechaUltimoContacto = dt.toISOString(); }
      }
      nuevas.push({
        id: uid(), nombre: d.nombre || "Sin nombre", sector: d.sector || "", email: d.email || "",
        telefono: d.telefono || "", contacto: d.contacto || "", direccion: d.direccion || "",
        estado: d.estado || "Pendiente", fecha_envio: d.fecha_envio || "", fecha_respuesta: d.fecha_respuesta || "",
        fechaUltimoContacto, notas: d.notas || "", historial: [], lat: d.lat, lon: d.lon, proximoSeguimiento: null,
        prioridad: d.prioridad || 2, tamano: d.tamano || "", actividad: d.actividad || "",
      });
    });
    await idbPutMany(nuevas);
    EMPRESAS = EMPRESAS.concat(nuevas);
    toast(`Se cargaron ${nuevas.length} empresas nuevas.`);
    renderEmpresas(); renderInicio();
  } catch (err) {
    toast("No se pudo cargar la base.");
  }
});

$("#btn-agregar-empresa").addEventListener("click", () => abrirFichaEmpresa(null));

async function guardarEmpresa(e) {
  await idbPut(e);
  const idx = EMPRESAS.findIndex((x) => x.id === e.id);
  if (idx >= 0) EMPRESAS[idx] = e; else EMPRESAS.push(e);
}

function abrirFichaEmpresa(id) {
  const empresa = id ? EMPRESAS.find((e) => e.id === id) : {
    id: uid(), nombre: "", sector: "", email: "", telefono: "", contacto: "", direccion: "",
    estado: "Pendiente", notas: "", historial: [], lat: null, lon: null, proximoSeguimiento: null,
  };
  const esNueva = !id;
  $("#ficha-nombre").textContent = esNueva ? "Agregar empresa" : empresa.nombre;

  const camposHtml = `
    <label class="field">Nombre de la empresa <input class="input" id="f-nombre" value="${escapeHtml(empresa.nombre)}" placeholder="Ej: Plásticos del Sur S.A.S."></label>
    <label class="field">Persona de contacto <input class="input" id="f-contacto" value="${escapeHtml(empresa.contacto)}" placeholder="Ej: María Pérez"></label>
    <div style="display:flex;gap:8px">
      <label class="field" style="flex:1">Correo <input class="input" id="f-email" value="${escapeHtml(empresa.email)}" placeholder="correo@empresa.com"></label>
      <label class="field" style="flex:1">Teléfono <input class="input" id="f-telefono" value="${escapeHtml(empresa.telefono)}" placeholder="Ej: 300 123 4567"></label>
    </div>
    <label class="field">Dirección <input class="input" id="f-direccion" value="${escapeHtml(empresa.direccion)}"></label>
    <div style="display:flex;gap:8px">
      <label class="field" style="flex:1">Sector <input class="input" id="f-sector" value="${escapeHtml(traducirSector(empresa.sector))}" placeholder="Sector para etiquetarlas"></label>
      <label class="field" style="flex:1">Estado
        <select class="input" id="f-estado">${ESTADOS_EMPRESA.map((s) => `<option ${s === empresa.estado ? "selected" : ""}>${s}</option>`).join("")}</select>
      </label>
    </div>
    <label class="field">Notas <textarea class="input" id="f-notas" rows="2" placeholder="Lo que quieras recordar de esta empresa">${escapeHtml(empresa.notas)}</textarea></label>
    <div class="btn-row" style="margin-top:8px">
      <button class="btn btn-primary" id="f-guardar">Guardar cambios</button>
    </div>
  `;

  if (esNueva) {
    $("#ficha-body").innerHTML = camposHtml;
  } else {
    $("#ficha-body").innerHTML = `
      <p class="muted small">${escapeHtml(traducirSector(empresa.sector) || "Sin sector")} · ${escapeHtml(empresa.telefono || "Sin teléfono")} · ${escapeHtml(empresa.email || "Sin correo")}</p>
      <select class="input" id="f-estado-rapido" style="max-width:200px;margin-bottom:12px">${ESTADOS_EMPRESA.map((s) => `<option ${s === empresa.estado ? "selected" : ""}>${s}</option>`).join("")}</select>

      <div class="btn-row">
        <button class="btn btn-secondary" id="f-whatsapp">💬 WhatsApp</button>
        <button class="btn btn-secondary" id="f-catalogo">📖 Catálogo</button>
        <button class="btn btn-ghost" id="f-llamar">📞 Llamar</button>
      </div>

      <button class="btn btn-ghost btn-sm" id="f-toggle-mas" style="margin:10px 0">▶ Más opciones</button>
      <div id="f-mas-opciones" class="mas-opciones-grid hidden">
        <button class="btn btn-ghost btn-sm" id="f-correo">✉️ Correo</button>
        <button class="btn btn-ghost btn-sm" id="f-visitada">🚶 Visitada hoy</button>
        <button class="btn btn-ghost btn-sm" id="f-buscar-contacto">🔎 Buscar contacto</button>
        <button class="btn btn-ghost btn-sm" id="f-cotizacion-pdf">📄 Cotización PDF</button>
        <button class="btn btn-ghost btn-sm" id="f-nuevo-pedido">🛒 Nuevo pedido</button>
        <button class="btn btn-ghost btn-sm" id="f-editar-datos">✏️ Editar datos</button>
        <button class="btn btn-danger btn-sm" id="f-eliminar">🗑️ Eliminar</button>
      </div>

      <h4 style="margin:14px 0 6px;font-size:.92rem">Anotar en el historial</h4>
      <div class="input-with-btn">
        <input class="input" id="f-nota-texto" placeholder="Ej: Llamé, pidió cotización de 20 overoles talla 40">
        <button class="btn btn-primary btn-sm" id="f-nota-hoy">+ Anotar</button>
      </div>

      <h4 style="margin:14px 0 6px;font-size:.92rem">Historial de gestión</h4>
      <div id="f-historial" class="list">${(empresa.historial||[]).slice().reverse().map(h=>`<div class="item-row" style="cursor:default"><div class="item-main"><div class="item-sub">${escapeHtml(h.fecha)}</div><div class="item-title" style="white-space:normal">${escapeHtml(h.texto)}</div></div></div>`).join("") || '<p class="muted small">Sin notas todavía.</p>'}</div>

      <h4 style="margin:14px 0 6px;font-size:.92rem">Pedidos de esta empresa</h4>
      <div id="f-pedidos" class="list">${PEDIDOS.filter(p=>p.empresaId===empresa.id).map(p=>`<div class="item-row" data-ver-pedido="${p.id}"><div class="item-main"><div class="item-title">${fmtFechaCorta(p.fecha)} · ${fmtCOP(calcularTotal(p))}</div></div><span class="badge ${badgeClass(p.estado)}">${p.estado}</span></div>`).join("") || '<p class="muted small">Aún no tiene pedidos.</p>'}</div>

      <div id="f-form-datos" class="hidden" style="margin-top:14px;border-top:1px dashed var(--linea);padding-top:14px">${camposHtml}</div>
    `;
  }
  openModal("modal-empresa");

  $("#f-estado-rapido")?.addEventListener("change", async (e) => {
    const nuevo = e.target.value;
    if (nuevo === empresa.estado) return;
    empresa.historial = empresa.historial || [];
    empresa.historial.push({ fecha: new Date().toLocaleString("es-CO"), texto: `Estado → ${nuevo}`, auto: true });
    empresa.estado = nuevo;
    await guardarEmpresa(empresa);
    toast("Cambios guardados.");
    renderEmpresas(); renderInicio();
  });

  $("#f-guardar").addEventListener("click", async () => {
    empresa.nombre = $("#f-nombre").value.trim();
    if (!empresa.nombre) { toast("Escribe el nombre de la empresa."); return; }
    const estadoAnterior = empresa.estado;
    empresa.contacto = $("#f-contacto").value.trim();
    empresa.email = $("#f-email").value.trim();
    empresa.telefono = $("#f-telefono").value.trim();
    empresa.direccion = $("#f-direccion").value.trim();
    empresa.sector = $("#f-sector").value.trim();
    empresa.estado = $("#f-estado").value;
    empresa.notas = $("#f-notas").value;
    empresa.historial = empresa.historial || [];
    if (!esNueva && estadoAnterior !== empresa.estado) {
      empresa.historial.push({ fecha: new Date().toLocaleString("es-CO"), texto: `Estado → ${empresa.estado}`, auto: true });
    }
    await guardarEmpresa(empresa);
    toast("Cambios guardados.");
    closeModal("modal-empresa");
    renderEmpresas(); renderInicio();
  });

  $("#f-toggle-mas")?.addEventListener("click", (e) => {
    const panel = $("#f-mas-opciones");
    panel.classList.toggle("hidden");
    e.target.textContent = (panel.classList.contains("hidden") ? "▶" : "▼") + " Más opciones";
  });
  $("#f-editar-datos")?.addEventListener("click", () => {
    $("#f-form-datos").classList.remove("hidden");
    try { $("#f-form-datos").scrollIntoView({ block: "nearest" }); } catch {}
  });
  $("#f-whatsapp")?.addEventListener("click", () => enviarWhatsApp(empresa));
  $("#f-catalogo")?.addEventListener("click", () => enviarCatalogoWhatsApp(empresa));
  $("#f-correo")?.addEventListener("click", () => enviarCorreo(empresa));
  $("#f-buscar-contacto")?.addEventListener("click", () => buscarContactoGoogle(empresa));
  $("#f-cotizacion-pdf")?.addEventListener("click", () => descargarCotizacionCatalogoPDF(empresa));
  $("#f-visitada")?.addEventListener("click", async () => { await marcarVisitadaHoy(empresa); abrirFichaEmpresa(empresa.id); });
  $("#f-llamar")?.addEventListener("click", () => {
    if (!empresa.telefono) { toast("Esta empresa no tiene teléfono"); return; }
    window.location.href = "tel:" + empresa.telefono.replace(/\s+/g, "");
  });
  $("#f-nota-hoy")?.addEventListener("click", async () => {
    const texto = $("#f-nota-texto").value.trim();
    if (!texto) return;
    empresa.historial = empresa.historial || [];
    empresa.historial.push({ fecha: new Date().toLocaleString("es-CO"), texto });
    await guardarEmpresa(empresa);
    toast("Nota guardada en el historial.");
    abrirFichaEmpresa(empresa.id);
  });
  $("#f-eliminar")?.addEventListener("click", async () => {
    if (!confirm("¿Eliminar esta empresa?")) return;
    await idbDelete(empresa.id);
    EMPRESAS = EMPRESAS.filter((e) => e.id !== empresa.id);
    closeModal("modal-empresa");
    renderEmpresas(); renderInicio();
  });
  $("#f-nuevo-pedido")?.addEventListener("click", () => { closeModal("modal-empresa"); abrirFormPedido(null, empresa); });
  $$("[data-ver-pedido]", $("#ficha-body")).forEach((el) => el.addEventListener("click", () => { closeModal("modal-empresa"); abrirFormPedido(el.dataset.verPedido); }));
}

async function logHistorial(empresa, texto) {
  if (!empresa || !empresa.id) return;
  empresa.historial = empresa.historial || [];
  empresa.historial.push({ fecha: new Date().toLocaleString("es-CO"), texto, auto: true });
  await guardarEmpresa(empresa);
}
async function marcarComoEnviadaSiPendiente(empresa) {
  if (!empresa) return;
  empresa.fechaUltimoContacto = new Date().toISOString();
  if (!empresa.estado || empresa.estado === "Pendiente") empresa.estado = "Enviado";
  await guardarEmpresa(empresa);
}
function mensajeWhatsApp(empresa) {
  return CONFIG.templates.whatsapp
    .replaceAll("{contacto}", empresa.contacto || "")
    .replaceAll("{miEmpresa}", CONFIG.empresa.nombre || "Dotaciones El Manantial");
}
async function enviarWhatsApp(empresa) {
  if (!empresa) return;
  if (!empresa.telefono) { toast("Esta empresa no tiene teléfono"); return; }
  const tel = empresa.telefono.replace(/[^\d+]/g, "");
  const msg = encodeURIComponent(mensajeWhatsApp(empresa));
  window.open(`https://wa.me/${tel.replace(/^\+/, "")}?text=${msg}`, "_blank");
  toast("WhatsApp abierto");
  await marcarComoEnviadaSiPendiente(empresa);
  await logHistorial(empresa, "WhatsApp enviado");
  renderInicio();
}
async function enviarCatalogoWhatsApp(empresa) {
  if (!empresa) return;
  if (!empresa.telefono) { toast("Esta empresa no tiene teléfono"); return; }
  const tel = empresa.telefono.replace(/[^\d+]/g, "");
  const resumen = (window.CATALOGO || []).map((cat) => cat.categoria + ": " + cat.items.slice(0, 3).map((i) => i.nombre + " " + fmtCOP(i.precio)).join(", ")).join("\n");
  const texto = `Hola${empresa.contacto ? " " + empresa.contacto : ""}, le compartimos nuestro catálogo de dotación industrial y EPP:\n\n${resumen}\n\nCatálogo completo: ${window.EMPRESA_INFO.web}\n¿Le preparamos una cotización?`;
  window.open(`https://wa.me/${tel.replace(/^\+/, "")}?text=${encodeURIComponent(texto)}`, "_blank");
  toast("Catálogo enviado por WhatsApp");
  await marcarComoEnviadaSiPendiente(empresa);
  await logHistorial(empresa, "Catálogo enviado por WhatsApp");
  renderInicio();
}
async function enviarCorreo(empresa) {
  if (!empresa) return;
  if (!empresa.email) { toast("Esta empresa no tiene correo"); return; }
  const asunto = "Cotización — " + (CONFIG.empresa.nombre || "Dotaciones El Manantial");
  const cuerpo = `Señores:\n${empresa.nombre}\n\n${CONFIG.templates.correo}\n\n${CONFIG.templates.descuentos}`;
  if (CONFIG.brevo.key && CONFIG.brevo.remitente) {
    const ok = await enviarCorreoBrevo(empresa.email, asunto, cuerpo.replace(/\n/g, "<br>"));
    if (ok) {
      toast("Correo enviado automáticamente");
      await marcarComoEnviadaSiPendiente(empresa);
      await logHistorial(empresa, "Correo enviado automáticamente (Brevo)");
      renderInicio();
      return;
    }
  }
  window.location.href = `mailto:${empresa.email}?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(cuerpo)}`;
  toast("Correo abierto");
  await marcarComoEnviadaSiPendiente(empresa);
  await logHistorial(empresa, "Correo abierto");
  renderInicio();
}
async function marcarVisitadaHoy(empresa) {
  if (!empresa) return;
  await logHistorial(empresa, "Visitada hoy");
  toast("Registrado: visitaste esta empresa hoy");
}
function buscarContactoGoogle(empresa) {
  if (!empresa) return;
  const q = encodeURIComponent(`${empresa.nombre} ${empresa.direccion || ""} teléfono correo Bogotá`);
  window.open(`https://www.google.com/search?q=${q}`, "_blank");
  toast("Buscando en Google");
}
function descargarCotizacionCatalogoPDF(empresa) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  doc.setFontSize(14);
  doc.text(CONFIG.empresa.nombre || window.EMPRESA_INFO.nombre, 14, 18);
  doc.setFontSize(10);
  doc.text(window.EMPRESA_INFO.direccion + " · " + window.EMPRESA_INFO.ciudad, 14, 24);
  doc.setFontSize(16);
  doc.text("COTIZACIÓN", 150, 18);
  doc.setFontSize(10);
  doc.text("Cliente: " + (empresa?.nombre || "-"), 14, 34);
  const filas = [];
  (window.CATALOGO || []).forEach((cat) => cat.items.forEach((it) => filas.push([cat.categoria, it.nombre, fmtCOP(it.precio)])));
  doc.autoTable({ startY: 40, head: [["Categoría", "Producto", "Precio"]], body: filas, theme: "grid", headStyles: { fillColor: [29, 78, 216] } });
  doc.save(`Catalogo_${(empresa?.nombre || "cliente").replace(/\s+/g, "_")}.pdf`);
  toast("Cotización PDF");
}

/* ---------- Buscar empresas en el mapa (OpenStreetMap: Nominatim + Overpass) ---------- */
let mapaModo = "cerca";
let mapaDistanciaKm = 5;

function renderMapa() {
  $("#modo-cerca").className = "btn " + (mapaModo === "cerca" ? "btn-secondary" : "btn-ghost");
  $("#modo-tipo").className = "btn " + (mapaModo === "tipo" ? "btn-secondary" : "btn-ghost");
  $("#mapa-tipo-input").classList.toggle("hidden", mapaModo !== "tipo");
  $("#mapa-explicacion").textContent = mapaModo === "cerca"
    ? `Buscamos empresas que necesitan dotación (talleres, ferreterías, fábricas, restaurantes...) alrededor de ${CONFIG.empresa.direccion || "tu negocio"} y te las mostramos ordenadas de la más cercana a la más lejana.`
    : "Escribe el tipo de empresa o palabra clave que buscas (ej: plásticos, colegios, restaurantes) y la buscamos cerca de tu negocio.";
  $("#btn-buscar-cerca").textContent = mapaModo === "cerca" ? "🧭 Buscar clientes cerca de mi negocio" : "🔍 Buscar por tipo de empresa";
}
$("#modo-cerca").addEventListener("click", () => { mapaModo = "cerca"; renderMapa(); });
$("#modo-tipo").addEventListener("click", () => { mapaModo = "tipo"; renderMapa(); });
$$(".dist-btn").forEach((btn) => btn.addEventListener("click", () => {
  mapaDistanciaKm = Number(btn.dataset.dist);
  $$(".dist-btn").forEach((b) => b.className = "btn btn-ghost btn-sm dist-btn");
  btn.className = "btn btn-primary btn-sm dist-btn";
}));

async function geocodioNegocio() {
  if (CONFIG.negocioGeo) return CONFIG.negocioGeo;
  const q = encodeURIComponent(`${CONFIG.empresa.direccion}, ${CONFIG.empresa.ciudad || "Bogotá"}, Colombia`);
  const geo = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${q}`).then((r) => r.json());
  if (!geo.length) return null;
  CONFIG.negocioGeo = { lat: +geo[0].lat, lon: +geo[0].lon };
  saveConfig();
  return CONFIG.negocioGeo;
}
async function consultarOverpass(query) {
  const mirrors = ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter", "https://overpass.osm.ch/api/interpreter"];
  for (const url of mirrors) {
    try {
      const r = await fetch(url, { method: "POST", body: "data=" + encodeURIComponent(query) });
      if (r.ok) return await r.json();
    } catch { /* probar siguiente espejo */ }
  }
  return null;
}
$("#btn-buscar-cerca").addEventListener("click", () => {
  if (mapaModo === "tipo") buscarPorTipo(); else buscarEmpresasCerca();
});
async function buscarEmpresasCerca() {
  if (!CONFIG.empresa.direccion) { toast("Primero escribe la dirección de tu negocio en Configuración."); irAVista("config"); return; }
  toast("Buscando con OpenStreetMap…");
  try {
    const centro = await geocodioNegocio();
    if (!centro) { toast("No encontramos resultados."); return; }
    const radio = mapaDistanciaKm * 1000;
    const overpassQuery = `[out:json][timeout:25];(node["shop"](around:${radio},${centro.lat},${centro.lon});node["office"](around:${radio},${centro.lat},${centro.lon});node["amenity"~"restaurant|cafe|pharmacy|bank|fuel|hospital|clinic"](around:${radio},${centro.lat},${centro.lon}););out center 80;`;
    const data = await consultarOverpass(overpassQuery);
    if (!data) { toast("OpenStreetMap no respondió. Intenta de nuevo en un minuto."); return; }
    mostrarResultadosCercanos(construirCandidatas(data), centro);
  } catch (err) {
    toast("No se pudo conectar con OpenStreetMap. Revisa tu internet.");
  }
}
async function buscarPorTipo() {
  const texto = $("#mapa-tipo-texto").value.trim();
  if (!texto) { toast("Escribe qué tipo de empresa buscas."); return; }
  if (!CONFIG.empresa.direccion) { toast("Primero escribe la dirección de tu negocio en Configuración."); irAVista("config"); return; }
  toast("Buscando con OpenStreetMap…");
  try {
    const centro = await geocodioNegocio();
    if (!centro) { toast("No encontramos resultados."); return; }
    const radio = mapaDistanciaKm * 1000;
    const t = texto.replace(/["\\]/g, "");
    const overpassQuery = `[out:json][timeout:25];(node["name"~"${t}",i](around:${radio},${centro.lat},${centro.lon});node["shop"~"${t}",i](around:${radio},${centro.lat},${centro.lon});node["office"~"${t}",i](around:${radio},${centro.lat},${centro.lon}););out center 80;`;
    const data = await consultarOverpass(overpassQuery);
    if (!data) { toast("OpenStreetMap no respondió. Intenta de nuevo en un minuto."); return; }
    mostrarResultadosCercanos(construirCandidatas(data), centro);
  } catch (err) {
    toast("No se pudo conectar con OpenStreetMap. Revisa tu internet.");
  }
}
function construirCandidatas(data) {
  const existentes = new Set(EMPRESAS.map((e) => (e.nombre || "").toLowerCase()));
  return (data.elements || [])
    .filter((el) => el.tags && el.tags.name && !existentes.has(el.tags.name.toLowerCase()))
    .map((el) => ({
      id: uid(), nombre: el.tags.name, sector: el.tags.shop || el.tags.office || el.tags.amenity || "",
      email: el.tags.email || "", telefono: el.tags.phone || el.tags["contact:phone"] || "",
      contacto: "", direccion: [el.tags["addr:street"], el.tags["addr:housenumber"]].filter(Boolean).join(" ") || "Bogotá",
      estado: "Pendiente", notas: "Encontrada cerca de tu negocio (OpenStreetMap)", historial: [],
      lat: el.lat, lon: el.lon, proximoSeguimiento: null,
    }));
}

function mostrarResultadosCercanos(candidatas, centro) {
  $("#emp-mapa").classList.remove("hidden");
  const mapaDiv = $("#emp-mapa");
  mapaDiv.innerHTML = "";
  const map = L.map(mapaDiv).setView([centro.lat, centro.lon], 14);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "© OpenStreetMap" }).addTo(map);
  L.marker([centro.lat, centro.lon]).addTo(map).bindPopup("Tu negocio").openPopup();
  candidatas.forEach((c) => {
    if (c.lat && c.lon) {
      const m = L.marker([c.lat, c.lon]).addTo(map);
      m.bindPopup(`<b>${escapeHtml(c.nombre)}</b><br>${escapeHtml(traducirSector(c.sector)||"")}<br><button onclick="window.__agregarCercana('${c.id}')">Agregar a mi lista</button>`);
    }
  });
  window.__candidatasCercanas = candidatas;
  window.__agregarCercana = async (id) => {
    const c = candidatas.find((x) => x.id === id);
    if (!c || c._agregada) return;
    c._agregada = true;
    await guardarEmpresa(c);
    EMPRESAS.push(c);
    toast("Empresa agregada a tu lista.");
    const btn = $(`[data-add-cercana="${id}"]`);
    if (btn) { btn.disabled = true; btn.textContent = "Agregada"; }
  };

  const lista = $("#mapa-resultados");
  lista.innerHTML = `<p class="muted small">Toca un punto en el mapa para ver la empresa y agregarla, o usa "Agregar" abajo. Se encontraron ${candidatas.length} negocios.</p>` +
    candidatas.map((c) => `<div class="item-row">
      <div class="item-main"><div class="item-title">${escapeHtml(c.nombre)} ${distanciaTexto(centro.lat, centro.lon, c.lat, c.lon) ? `<span class="badge badge-pendiente">${distanciaTexto(centro.lat, centro.lon, c.lat, c.lon)}</span>` : ""}</div><div class="item-sub">${escapeHtml(traducirSector(c.sector)||"")} · ${escapeHtml(c.direccion||"")}</div></div>
      <button class="btn btn-secondary btn-sm" data-add-cercana="${c.id}">Agregar</button>
    </div>`).join("");
  $$("[data-add-cercana]", lista).forEach((btn) => btn.addEventListener("click", () => window.__agregarCercana(btn.dataset.addCercana)));
}

/* ---------- Importar / exportar Excel ---------- */
$("#btn-exportar-excel").addEventListener("click", () => {
  if (!EMPRESAS.length) { toast("Aún no tienes empresas para exportar."); return; }
  const filas = EMPRESAS.map((e) => ({
    Nombre: e.nombre, Sector: traducirSector(e.sector), Correo: e.email, Teléfono: e.telefono, Contacto: e.contacto,
    Dirección: e.direccion, Estado: e.estado, Notas: e.notas,
  }));
  const ws = XLSX.utils.json_to_sheet(filas);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Empresas");
  XLSX.writeFile(wb, "Mi lista DotacionPro.xlsx");
});
$("#btn-plantilla-excel")?.addEventListener("click", () => {
  const ws = XLSX.utils.json_to_sheet([{ Nombre: "Plásticos Ejemplo S.A.S.", Sector: "plásticos", Correo: "", Teléfono: "300 000 0000", Contacto: "", Dirección: "", Estado: "Pendiente", Notas: "" }]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Empresas");
  XLSX.writeFile(wb, "Plantilla empresas DotacionPro.xlsx");
});
$("#btn-ver-catalogo")?.addEventListener("click", () => irAVista("catalogo"));
$("#btn-importar-excel").addEventListener("click", () => $("#file-importar").click());
$("#file-importar").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const buf = new Uint8Array(await file.arrayBuffer());
  const wb = XLSX.read(buf, { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const filas = XLSX.utils.sheet_to_json(ws, { defval: "" });
  const norm = (obj, keys) => { for (const k of keys) if (obj[k] !== undefined && obj[k] !== "") return obj[k]; return ""; };
  const clave = (nombre, direccion) => (nombre || "").toLowerCase().trim() + "|" + (direccion || "").toLowerCase().trim();
  const porClave = new Map(EMPRESAS.map((e) => [clave(e.nombre, e.direccion), e]));
  const clavesOriginales = new Set(porClave.keys());
  const nuevas = [];
  const paraActualizar = [];
  let duplicadasSinCambios = 0, actualizadas = 0;

  filas.forEach((f) => {
    const nombre = norm(f, ["Nombre", "nombre", "Empresa"]);
    if (!nombre) return;
    const direccion = norm(f, ["Dirección", "Direccion", "direccion"]);
    const email = norm(f, ["Correo", "correo", "Email", "email"]);
    const telefono = norm(f, ["Teléfono", "Telefono", "telefono"]);
    const contacto = norm(f, ["Contacto", "contacto"]);
    const sector = norm(f, ["Sector", "sector"]);
    const notas = norm(f, ["Notas", "notas"]);
    const fechaEnvio = norm(f, ["fecha_envio", "Fecha_envio", "FechaEnvio"]);
    let fechaUltimoContacto = null;
    if (fechaEnvio) {
      const [dd, mm, yyyy] = String(fechaEnvio).split("/");
      if (dd && mm && yyyy) { const dt = new Date(+yyyy, +mm - 1, +dd); if (!isNaN(dt)) fechaUltimoContacto = dt.toISOString(); }
    }
    const key = clave(nombre, direccion);
    const existente = porClave.get(key);

    if (existente) {
      // La empresa ya está en tu lista: se completan los datos que le falten (sin borrar lo que ya tenía).
      let cambio = false;
      if (!existente.email && email) { existente.email = email; cambio = true; }
      if (!existente.telefono && telefono) { existente.telefono = telefono; cambio = true; }
      if (!existente.contacto && contacto) { existente.contacto = contacto; cambio = true; }
      if (!existente.sector && sector) { existente.sector = sector; cambio = true; }
      if (!existente.notas && notas) { existente.notas = notas; cambio = true; }
      if (cambio && clavesOriginales.has(key)) { paraActualizar.push(existente); actualizadas++; }
      else if (!cambio && clavesOriginales.has(key)) { duplicadasSinCambios++; }
      return;
    }

    const nueva = {
      id: uid(), nombre, sector, email, telefono, contacto, direccion,
      estado: norm(f, ["Estado", "estado"]) || "Pendiente",
      notas, fechaUltimoContacto, historial: [], lat: null, lon: null, proximoSeguimiento: null,
    };
    nuevas.push(nueva);
    porClave.set(key, nueva);
  });

  if (nuevas.length) await idbPutMany(nuevas);
  if (paraActualizar.length) await idbPutMany(paraActualizar);
  EMPRESAS = EMPRESAS.concat(nuevas);

  const partes = [`Se importaron ${nuevas.length} empresas nuevas.`];
  if (actualizadas) partes.push(`Se completó el correo/teléfono de ${actualizadas} empresas que ya tenías.`);
  if (duplicadasSinCambios) partes.push(`${duplicadasSinCambios} ya estaban completas.`);
  toast(partes.join(" "));
  renderEmpresas(); renderInicio();
  e.target.value = "";
});

/* ==========================================================================
   PEDIDOS / COTIZACIONES
   ========================================================================== */
function calcularTotal(pedido) {
  return (pedido.productos || []).reduce((acc, p) => acc + (Number(p.cantidad) || 0) * (Number(p.precio) || 0), 0);
}
function poblarSelectPedidos() {
  const sel = $("#ped-filtro-estado");
  sel.innerHTML = `<option value="">Todos los pedidos</option>` + ESTADOS_PEDIDO.map((s) => `<option>${s}</option>`).join("");
}
function renderPedidos() {
  poblarSelectPedidos();
  const filtro = $("#ped-filtro-estado").value;
  const lista = $("#ped-lista");
  const filtrados = PEDIDOS.filter((p) => !filtro || p.estado === filtro).sort((a, b) => (b.fecha || "").localeCompare(a.fecha || ""));
  if (!filtrados.length) { lista.innerHTML = `<div class="card"><p>No hay pedidos con ese estado.</p></div>`; return; }
  lista.innerHTML = filtrados.map((p) => `
    <div class="item-row" data-ver-pedido="${p.id}">
      <div class="item-main">
        <div class="item-title">${escapeHtml(p.empresaNombre || "Sin empresa")}</div>
        <div class="item-sub">${fmtFechaCorta(p.fecha)} · Total ${fmtCOP(calcularTotal(p))} · Saldo ${fmtCOP(Math.max(0, calcularTotal(p) - (p.abono||0)))}</div>
      </div>
      <span class="badge ${badgeClass(p.estado)}">${p.estado}</span>
    </div>`).join("");
  $$("[data-ver-pedido]", lista).forEach((el) => el.addEventListener("click", () => abrirFormPedido(el.dataset.verPedido)));
}
$("#ped-filtro-estado").addEventListener("change", renderPedidos);
$("#btn-nuevo-pedido").addEventListener("click", () => abrirFormPedido(null));

function filaProductoHtml(p, idx) {
  return `<div class="pedido-prod-row" data-fila="${idx}">
    <input class="input prod-nombre" list="dl-catalogo" placeholder="Ej: Overol 2 piezas en dril" value="${escapeHtml(p.nombre)}">
    <input class="input prod-cant" type="number" min="1" value="${p.cantidad}">
    <input class="input prod-precio" type="number" min="0" value="${p.precio}">
    <button class="btn btn-ghost btn-sm" data-quitar-fila="${idx}">✕</button>
  </div>`;
}
function datalistCatalogo() {
  const opts = [];
  (window.CATALOGO || []).forEach((cat) => cat.items.forEach((it) => opts.push(`<option value="${escapeHtml(it.nombre)}" data-precio="${it.precio}">`)));
  return `<datalist id="dl-catalogo">${opts.join("")}</datalist>`;
}

function abrirFormPedido(id, empresaPreseleccionada) {
  let pedido = id ? PEDIDOS.find((p) => p.id === id) : {
    id: uid(), empresaId: empresaPreseleccionada?.id || "", empresaNombre: empresaPreseleccionada?.nombre || "",
    fecha: todayISO(), fechaEntrega: "", estado: "Pendiente", productos: [{ nombre: "", cantidad: 1, precio: 0 }],
    abono: 0, notas: "",
  };
  $("#pedido-modal-title").textContent = id ? "Editar pedido" : "Nuevo pedido";
  const opcionesEmpresa = EMPRESAS.slice(0, 500).map((e) => `<option value="${e.id}" ${e.id === pedido.empresaId ? "selected" : ""}>${escapeHtml(e.nombre)}</option>`).join("");

  $("#pedido-body").innerHTML = `
    ${datalistCatalogo()}
    <label class="field">Cliente
      <select class="input" id="p-empresa"><option value="">Elige la empresa del pedido.</option>${opcionesEmpresa}</select>
    </label>
    <div style="display:flex;gap:8px">
      <label class="field" style="flex:1">Fecha de entrega <input class="input" id="p-fecha-entrega" type="date" value="${pedido.fechaEntrega || ""}"></label>
      <label class="field" style="flex:1">Estado <select class="input" id="p-estado">${ESTADOS_PEDIDO.map((s) => `<option ${s===pedido.estado?"selected":""}>${s}</option>`).join("")}</select></label>
    </div>

    <h4 style="margin:8px 0">Productos</h4>
    <div id="p-productos" class="pedido-productos">${pedido.productos.map(filaProductoHtml).join("")}</div>
    <button class="btn btn-ghost btn-sm" id="p-agregar-producto">+ Agregar producto</button>

    <div class="totales">
      <div class="fila"><span>Subtotal</span><span id="p-subtotal">${fmtCOP(calcularTotal(pedido))}</span></div>
      <label class="field" style="margin-top:6px">Abono recibido <input class="input" id="p-abono" type="number" min="0" value="${pedido.abono || 0}"></label>
      <div class="fila total"><span>Saldo</span><span id="p-saldo"></span></div>
    </div>
    <label class="field">Notas <textarea class="input" id="p-notas" rows="2">${escapeHtml(pedido.notas)}</textarea></label>

    <div class="btn-row" style="margin:14px 0">
      <button class="btn btn-secondary btn-sm" id="p-pdf">Descargar PDF</button>
      <button class="btn btn-secondary btn-sm" id="p-whatsapp">Enviar por WhatsApp</button>
      <button class="btn btn-secondary btn-sm" id="p-correo">Enviar por correo</button>
    </div>
    <div class="btn-row">
      <button class="btn btn-primary" id="p-guardar">Guardar pedido</button>
      ${id ? `<button class="btn btn-danger" id="p-eliminar">Eliminar</button>` : ""}
    </div>
  `;
  openModal("modal-pedido");

  function leerProductosDeFormulario() {
    return $$(".pedido-prod-row", $("#p-productos")).map((row) => ({
      nombre: $(".prod-nombre", row).value.trim(),
      cantidad: Number($(".prod-cant", row).value) || 0,
      precio: Number($(".prod-precio", row).value) || 0,
    }));
  }
  function recalcular() {
    pedido.productos = leerProductosDeFormulario();
    pedido.abono = Number($("#p-abono").value) || 0;
    const total = calcularTotal(pedido);
    $("#p-subtotal").textContent = fmtCOP(total);
    $("#p-saldo").textContent = fmtCOP(Math.max(0, total - pedido.abono));
  }
  $("#p-productos").addEventListener("input", (e) => {
    if (e.target.classList.contains("prod-nombre")) {
      const opt = $$(`#dl-catalogo option[value="${CSS.escape(e.target.value)}"]`)[0];
      if (opt) { const row = e.target.closest(".pedido-prod-row"); $(".prod-precio", row).value = opt.dataset.precio; }
    }
    recalcular();
  });
  $("#p-abono").addEventListener("input", recalcular);
  $("#p-agregar-producto").addEventListener("click", () => {
    const idx = $$(".pedido-prod-row", $("#p-productos")).length;
    $("#p-productos").insertAdjacentHTML("beforeend", filaProductoHtml({ nombre: "", cantidad: 1, precio: 0 }, idx));
  });
  $("#p-productos").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-quitar-fila]");
    if (btn) { btn.closest(".pedido-prod-row").remove(); recalcular(); }
  });
  recalcular();

  async function persistir() {
    pedido.empresaId = $("#p-empresa").value;
    const emp = EMPRESAS.find((x) => x.id === pedido.empresaId);
    pedido.empresaNombre = emp ? emp.nombre : (empresaPreseleccionada?.nombre || pedido.empresaNombre || "");
    pedido.fechaEntrega = $("#p-fecha-entrega").value;
    pedido.estado = $("#p-estado").value;
    pedido.productos = leerProductosDeFormulario().filter((p) => p.nombre);
    pedido.abono = Number($("#p-abono").value) || 0;
    pedido.notas = $("#p-notas").value;
    if (!pedido.productos.length) { toast("Agrega al menos un producto con descripción y cantidad."); return false; }
    const idx = PEDIDOS.findIndex((x) => x.id === pedido.id);
    if (idx >= 0) PEDIDOS[idx] = pedido; else PEDIDOS.push(pedido);
    savePedidos();
    return true;
  }

  $("#p-guardar").addEventListener("click", async () => {
    if (!(await persistir())) return;
    toast(id ? "Pedido actualizado." : "Pedido creado.");
    closeModal("modal-pedido");
    renderPedidos(); renderInicio();
  });
  $("#p-eliminar")?.addEventListener("click", () => {
    if (!confirm("¿Eliminar este pedido?")) return;
    PEDIDOS = PEDIDOS.filter((x) => x.id !== pedido.id);
    savePedidos();
    toast("Pedido eliminado.");
    closeModal("modal-pedido");
    renderPedidos(); renderInicio();
  });
  $("#p-pdf").addEventListener("click", async () => { await persistir(); descargarPDFPedido(pedido); });
  $("#p-whatsapp").addEventListener("click", async () => { await persistir(); enviarPedidoWhatsApp(pedido); });
  $("#p-correo").addEventListener("click", async () => { await persistir(); enviarPedidoCorreo(pedido); });
}

function descargarPDFPedido(pedido) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  doc.setFontSize(14);
  doc.text(CONFIG.empresa.nombre || window.EMPRESA_INFO.nombre, 14, 18);
  doc.setFontSize(10);
  doc.text(window.EMPRESA_INFO.direccion + " · " + window.EMPRESA_INFO.ciudad, 14, 24);
  doc.text("NIT " + window.EMPRESA_INFO.nit, 14, 29);
  doc.setFontSize(16);
  doc.text("COTIZACIÓN", 150, 18);
  doc.setFontSize(10);
  doc.text("Fecha: " + fmtFechaCorta(pedido.fecha), 150, 24);
  doc.text("Cliente: " + (pedido.empresaNombre || "-"), 14, 40);
  const filas = pedido.productos.map((p) => [p.nombre, p.cantidad, fmtCOP(p.precio), fmtCOP(p.cantidad * p.precio)]);
  doc.autoTable({ startY: 46, head: [["Producto", "Cant.", "Precio", "Subtotal"]], body: filas, theme: "grid", headStyles: { fillColor: [29, 78, 216] } });
  const finY = doc.lastAutoTable.finalY + 8;
  const total = calcularTotal(pedido);
  doc.setFontSize(11);
  doc.text("TOTAL: " + fmtCOP(total), 150, finY);
  if (pedido.abono) { doc.text("Abono: " + fmtCOP(pedido.abono), 150, finY + 6); doc.text("Saldo: " + fmtCOP(total - pedido.abono), 150, finY + 12); }
  doc.setFontSize(9);
  doc.text("Valores sin IVA, sujetos a confirmación según cantidades y tallas. " + CONFIG.templates.descuentos, 14, finY + 20, { maxWidth: 180 });
  doc.save(`Cotizacion_${(pedido.empresaNombre||"cliente").replace(/\s+/g,"_")}.pdf`);
  toast("Cotización PDF");
}

function textoResumenPedido(pedido) {
  const lineas = pedido.productos.map((p) => `• ${p.nombre} x${p.cantidad} — ${fmtCOP(p.precio * p.cantidad)}`).join("\n");
  return `Cotización — ${CONFIG.empresa.nombre || "Dotaciones El Manantial"}\n\n${lineas}\n\nTOTAL: ${fmtCOP(calcularTotal(pedido))}\n\n${CONFIG.templates.descuentos}`;
}
function enviarPedidoWhatsApp(pedido) {
  const emp = EMPRESAS.find((e) => e.id === pedido.empresaId);
  const tel = emp?.telefono?.replace(/[^\d+]/g, "");
  const msg = encodeURIComponent(textoResumenPedido(pedido));
  if (tel) window.open(`https://wa.me/${tel.replace(/^\+/, "")}?text=${msg}`, "_blank");
  else window.open(`https://wa.me/?text=${msg}`, "_blank");
  toast("WhatsApp ya escrito");
}
async function enviarPedidoCorreo(pedido) {
  const emp = EMPRESAS.find((e) => e.id === pedido.empresaId);
  const asunto = "Cotización — " + (CONFIG.empresa.nombre || "Dotaciones El Manantial");
  const cuerpo = textoResumenPedido(pedido);
  if (CONFIG.brevo.key && CONFIG.brevo.remitente && emp?.email) {
    const ok = await enviarCorreoBrevo(emp.email, asunto, cuerpo.replace(/\n/g, "<br>"));
    if (ok) { toast("Correo enviado automáticamente"); return; }
  }
  if (!emp?.email) { toast("Esta empresa no tiene correo"); return; }
  window.location.href = `mailto:${emp.email}?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(cuerpo)}`;
  toast("Correo abierto");
}

async function enviarCorreoBrevo(destinatario, asunto, htmlContent) {
  try {
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "api-key": CONFIG.brevo.key, "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify({
        sender: { email: CONFIG.brevo.remitente, name: CONFIG.empresa.nombre || "Dotaciones El Manantial" },
        to: [{ email: destinatario }],
        subject: asunto,
        htmlContent: `<div>${htmlContent}</div>`,
      }),
    });
    if (!res.ok) { toast("No se pudo enviar el correo."); return false; }
    return true;
  } catch { toast("No se pudo enviar el correo."); return false; }
}

/* ==========================================================================
   CATÁLOGO
   ========================================================================== */
function renderCatalogo() {
  const cont = $("#catalogo-lista");
  cont.innerHTML = (window.CATALOGO || []).map((cat) => `
    <div class="card cat-group">
      <h4>${escapeHtml(cat.categoria)}</h4>
      ${cat.items.map((it) => `<div class="cat-item"><span>${escapeHtml(it.nombre)}</span><b>${fmtCOP(it.precio)}</b></div>`).join("")}
    </div>`).join("") + `<p class="muted small">Precios de referencia 2026, sin IVA. Descuentos por volumen a partir de 20 unidades.</p>`;
}

/* ==========================================================================
   ESTADÍSTICAS
   ========================================================================== */
function renderStats() {
  const total = EMPRESAS.length;
  const contactadas = EMPRESAS.filter((e) => e.estado && e.estado !== "Pendiente").length;
  const respondieron = EMPRESAS.filter((e) => ["Respondió", "Cotizado", "Confirmado", "Entregado"].includes(e.estado)).length;
  const clientes = EMPRESAS.filter((e) => e.estado === "Confirmado" || e.estado === "Entregado").length;
  const tasaRespuesta = contactadas ? Math.round((respondieron / contactadas) * 100) : 0;
  const tasaConversion = contactadas ? Math.round((clientes / contactadas) * 100) : 0;

  $("#stats-funnel").innerHTML = `
    <div class="kpi"><span class="kpi-num">${total}</span><span class="kpi-label">Empresas en total</span></div>
    <div class="kpi"><span class="kpi-num">${contactadas}</span><span class="kpi-label">→ Contactadas</span></div>
    <div class="kpi"><span class="kpi-num">${respondieron}</span><span class="kpi-label">→ Respondieron</span></div>
    <div class="kpi"><span class="kpi-num">${clientes}</span><span class="kpi-label">→ Clientes</span></div>
  `;
  $("#stats-tasas").innerHTML = `
    <div class="kpi" style="grid-column:span 1"><span class="kpi-num" style="color:var(--verde)">${tasaRespuesta}%</span><span class="kpi-label">Tasa de respuesta<br>De cada 100 contactadas, cuántas contestan.</span></div>
    <div class="kpi" style="grid-column:span 1"><span class="kpi-num" style="color:var(--verde)">${tasaConversion}%</span><span class="kpi-label">Tasa de conversión<br>De cada 100 contactadas, cuántas se vuelven clientes.</span></div>
  `;

  const porSector = {};
  EMPRESAS.forEach((e) => {
    const s = traducirSector(e.sector) || "Sin sector";
    if (!porSector[s]) porSector[s] = { total: 0, contactadas: 0, respondieron: 0, clientes: 0 };
    porSector[s].total++;
    if (e.estado && e.estado !== "Pendiente") porSector[s].contactadas++;
    if (["Respondió", "Cotizado", "Confirmado", "Entregado"].includes(e.estado)) porSector[s].respondieron++;
    if (e.estado === "Confirmado" || e.estado === "Entregado") porSector[s].clientes++;
  });
  const sectores = Object.entries(porSector).sort((a, b) => b[1].total - a[1].total).slice(0, 12);
  const mejor = sectores
    .map(([s, d]) => ({ s, pct: d.contactadas ? Math.round((d.respondieron / d.contactadas) * 100) : 0, d }))
    .filter((x) => x.d.contactadas > 0)
    .sort((a, b) => b.pct - a.pct)[0];
  $("#stats-insight").innerHTML = mejor
    ? `💡 El sector que mejor te responde es <b>${escapeHtml(mejor.s)}</b> (${mejor.pct}%). Vale la pena buscar más empresas de ese sector.`
    : `💡 Contacta más empresas para empezar a ver qué sectores responden mejor.`;

  $("#stats-sectores").innerHTML = sectores.length
    ? sectores.map(([s, d]) => {
        const pct = d.contactadas ? Math.round((d.respondieron / d.contactadas) * 100) : 0;
        return `<div style="margin-bottom:10px">
          <div style="display:flex;justify-content:space-between;font-size:.88rem"><b>${escapeHtml(s)}</b><span class="muted">${d.total} empresas · ${d.contactadas} contactadas · ${d.respondieron} respondieron · ${d.clientes} clientes</span></div>
          <div style="background:var(--linea);border-radius:6px;height:8px;margin-top:4px;overflow:hidden"><div style="width:${pct}%;background:var(--verde);height:100%"></div></div>
          <div class="muted small" style="text-align:right">${pct}%</div>
        </div>`;
      }).join("")
    : `<p class="muted small">Aún no hay datos suficientes.</p>`;
}

/* ==========================================================================
   CONFIGURACIÓN
   ========================================================================== */
function renderConfig() {
  $("#cfg-empresa-nombre").value = CONFIG.empresa.nombre;
  $("#cfg-empresa-direccion").value = CONFIG.empresa.direccion;
  $("#cfg-empresa-ciudad").value = CONFIG.empresa.ciudad;
  $("#cfg-empresa-telefono").value = CONFIG.empresa.telefono;
  $("#cfg-empresa-correo").value = CONFIG.empresa.correo;
  $("#cfg-tpl-whatsapp").value = CONFIG.templates.whatsapp;
  $("#cfg-tpl-correo").value = CONFIG.templates.correo;
  $("#cfg-tpl-descuentos").value = CONFIG.templates.descuentos;
  $("#cfg-dias-seguimiento").value = CONFIG.diasSeguimiento;
  $("#cfg-brevo-key").value = CONFIG.brevo.key;
  $("#cfg-brevo-remitente").value = CONFIG.brevo.remitente;
  $("#cfg-google-key").value = CONFIG.google.key;
}
$("#btn-guardar-empresa").addEventListener("click", () => {
  CONFIG.empresa = {
    nombre: $("#cfg-empresa-nombre").value.trim(), direccion: $("#cfg-empresa-direccion").value.trim(),
    ciudad: $("#cfg-empresa-ciudad").value.trim(), telefono: $("#cfg-empresa-telefono").value.trim(),
    correo: $("#cfg-empresa-correo").value.trim(),
  };
  saveConfig(); toast("Cambios guardados. Ya salen en tus mensajes y cotizaciones.");
});
$("#btn-guardar-plantillas").addEventListener("click", () => {
  CONFIG.templates = { whatsapp: $("#cfg-tpl-whatsapp").value, correo: $("#cfg-tpl-correo").value, descuentos: $("#cfg-tpl-descuentos").value };
  CONFIG.diasSeguimiento = Number($("#cfg-dias-seguimiento").value) || 5;
  saveConfig(); toast("Cambios guardados.");
});
$("#btn-ver-brevo").addEventListener("click", (e) => togglePass("#cfg-brevo-key", e.target));
$("#btn-ver-google").addEventListener("click", (e) => togglePass("#cfg-google-key", e.target));
function togglePass(sel, btn) {
  const inp = $(sel);
  const show = inp.type === "password";
  inp.type = show ? "text" : "password";
  btn.textContent = show ? "Ocultar" : "Mostrar";
}
$("#btn-guardar-brevo").addEventListener("click", () => {
  CONFIG.brevo = { key: $("#cfg-brevo-key").value.trim(), remitente: $("#cfg-brevo-remitente").value.trim() };
  saveConfig(); toast(CONFIG.brevo.key ? "Clave guardada." : "No hay clave de Brevo configurada.");
});
$("#btn-quitar-brevo").addEventListener("click", () => { CONFIG.brevo = { key: "", remitente: "" }; saveConfig(); renderConfig(); toast("Clave eliminada."); });
$("#btn-guardar-google").addEventListener("click", () => { CONFIG.google.key = $("#cfg-google-key").value.trim(); saveConfig(); toast("Clave guardada."); });
$("#btn-quitar-google").addEventListener("click", () => { CONFIG.google.key = ""; saveConfig(); renderConfig(); toast("Clave eliminada."); });

$("#btn-guardar-pin").addEventListener("click", () => {
  const a = $("#cfg-pin-nueva").value, b = $("#cfg-pin-repite").value;
  if (a.length < 4) { toast("La clave debe tener al menos 4 caracteres."); return; }
  if (a !== b) { toast("Las dos claves no coinciden."); return; }
  CONFIG.pin = simpleHash(a); saveConfig(); toast("Clave activada."); initPin();
  $("#cfg-pin-nueva").value = ""; $("#cfg-pin-repite").value = "";
});
$("#btn-quitar-pin").addEventListener("click", () => { CONFIG.pin = null; saveConfig(); toast("Clave eliminada."); initPin(); });

$("#btn-backup").addEventListener("click", async () => {
  const respaldo = { tipo: "DotaciónPro-respaldo", version: 1, fecha: new Date().toISOString(), config: CONFIG, pedidos: PEDIDOS, empresas: await idbGetAll() };
  const blob = new Blob([JSON.stringify(respaldo)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = `DotacionPro_respaldo_${todayISO()}.json`; a.click();
  CONFIG.lastBackup = new Date().toISOString();
  saveConfig();
  toast("Copia de seguridad guardada.");
  renderInicio();
});
$("#btn-restore").addEventListener("click", () => $("#file-restore").click());
$("#file-restore").addEventListener("change", async (e) => {
  const file = e.target.files[0]; if (!file) return;
  try {
    const texto = await file.text();
    const data = JSON.parse(texto);
    if (data.tipo !== "DotaciónPro-respaldo") { toast("Ese archivo no es un respaldo de DotaciónPro."); return; }
    if (!confirm("Esto reemplazará tus datos actuales por los del respaldo. ¿Continuar?")) return;
    await idbClear();
    if (data.empresas?.length) await idbPutMany(data.empresas);
    EMPRESAS = data.empresas || [];
    PEDIDOS = data.pedidos || []; savePedidos();
    CONFIG = Object.assign({}, DEFAULT_CONFIG, data.config || {}); saveConfig();
    toast("Restaurar respaldo: listo.");
    renderConfig(); renderInicio();
  } catch { toast("Ese archivo no es un respaldo de DotaciónPro."); }
  e.target.value = "";
});
$("#btn-borrar-todo").addEventListener("click", async () => {
  if (!confirm("Esto borrará TODAS las empresas de tu lista. Esta acción no se puede deshacer. ¿Continuar?")) return;
  await idbClear(); EMPRESAS = [];
  toast("Se borraron todas las empresas.");
  renderEmpresas(); renderInicio();
});

/* ==========================================================================
   Arranque
   ========================================================================== */
(async function init() {
  try { await cargarEmpresasInicial(); } catch { EMPRESAS = []; }
  initPin();
  irAVista("inicio");
})();
