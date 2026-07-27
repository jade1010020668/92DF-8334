/* Mejoras del catálogo: vista 3D por producto + armar pedido por WhatsApp. */
(function () {
  "use strict";

  var WHATSAPP = "573135745063";

  /* ============================ ESTILOS ============================ */
  var estilo = document.createElement("style");
  estilo.textContent =
    /* --- vista 3D --- */
    ".item.con3d .nom{cursor:pointer}" +
    ".item.con3d .nom:hover{color:#8a6f3c}" +
    ".sello3d{flex:none;font-size:.62rem;font-weight:700;letter-spacing:.06em;color:#8a6f3c;" +
    "border:1px solid #cdbf9f;border-radius:999px;padding:2px 8px;margin-left:8px;white-space:nowrap;cursor:pointer}" +
    ".sello3d:hover{background:rgba(191,155,73,.14)}" +
    ".aviso3d{margin:18px auto 0;max-width:640px;text-align:center;font-size:.85rem;color:#6b6353;" +
    "background:#faf6ec;border:1px solid #ece2cf;border-radius:10px;padding:10px 16px}" +
    /* --- botón agregar al pedido --- */
    ".btn-mas{flex:none;margin-left:8px;width:30px;height:30px;border-radius:50%;border:1.5px solid #b8923f;" +
    "background:#fff;color:#8f6f2c;font-size:1.15rem;font-weight:700;line-height:1;cursor:pointer;" +
    "display:inline-flex;align-items:center;justify-content:center;transition:all .15s}" +
    ".btn-mas:hover{background:#b8923f;color:#fff}" +
    ".btn-mas.en-pedido{background:#141210;border-color:#141210;color:#d9bd7e}" +
    /* --- barra flotante del pedido --- */
    ".barra-pedido{position:fixed;left:0;right:0;bottom:0;z-index:40;background:#141210;color:#efe6d3;" +
    "box-shadow:0 -8px 30px rgba(20,16,10,.35);transform:translateY(110%);transition:transform .25s ease;" +
    "border-top:2px solid #b8923f}" +
    ".barra-pedido.visible{transform:none}" +
    ".barra-int{max-width:840px;margin:0 auto;padding:12px 18px calc(12px + env(safe-area-inset-bottom));" +
    "display:flex;align-items:center;gap:12px}" +
    ".barra-info{flex:1;min-width:0}" +
    ".barra-titulo{font-weight:700;font-size:.95rem;color:#d9bd7e}" +
    ".barra-sub{font-size:.78rem;color:#b7ac96;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}" +
    ".barra-btn{flex:none;border:none;border-radius:6px;padding:11px 16px;font-weight:700;font-size:.9rem;cursor:pointer}" +
    ".barra-ver{background:transparent;color:#d9bd7e;border:1px solid #b8923f}" +
    ".barra-enviar{background:linear-gradient(145deg,#d9bd7e,#b8923f);color:#1a1409}" +
    /* --- panel del pedido --- */
    ".panel-pedido{position:fixed;inset:0;z-index:50;background:rgba(15,12,8,.55);display:none;align-items:flex-end;justify-content:center}" +
    ".panel-pedido.abierto{display:flex}" +
    ".panel-card{background:#fffdf9;width:100%;max-width:560px;max-height:78vh;border-radius:18px 18px 0 0;" +
    "display:flex;flex-direction:column;overflow:hidden}" +
    ".panel-cab{display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-bottom:1px solid #e7ddc9}" +
    ".panel-cab h3{margin:0;font-family:Georgia,serif;font-size:1.15rem;color:#141210}" +
    ".panel-x{border:none;background:none;font-size:1.3rem;cursor:pointer;color:#8a8072}" +
    ".panel-lista{flex:1;overflow-y:auto;padding:8px 20px}" +
    ".ped-fila{display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px dotted #ece2cf}" +
    ".ped-nom{flex:1;font-size:.9rem;color:#3a342b;line-height:1.3}" +
    ".ped-precio{font-size:.8rem;color:#8f6f2c;font-weight:700}" +
    ".ped-qty{display:flex;align-items:center;gap:6px}" +
    ".ped-qty button{width:28px;height:28px;border-radius:6px;border:1px solid #cdbf9f;background:#fff;" +
    "font-size:1rem;font-weight:700;color:#8f6f2c;cursor:pointer}" +
    ".ped-qty span{min-width:26px;text-align:center;font-weight:700;color:#141210}" +
    ".panel-pie{padding:14px 20px calc(16px + env(safe-area-inset-bottom));border-top:1px solid #e7ddc9;background:#faf6ec}" +
    ".panel-total{display:flex;justify-content:space-between;font-size:.95rem;margin-bottom:10px}" +
    ".panel-total b{color:#141210}" +
    ".panel-nota{font-size:.72rem;color:#8a8072;margin:0 0 10px}" +
    ".panel-wa{width:100%;border:none;border-radius:8px;padding:14px;background:#141210;color:#d9bd7e;" +
    "font-weight:700;font-size:1rem;cursor:pointer}" +
    ".panel-wa:active{transform:scale(.99)}" +
    ".panel-vaciar{width:100%;border:none;background:none;color:#a0937b;font-size:.8rem;margin-top:8px;cursor:pointer}";
  document.head.appendChild(estilo);

  /* ============================ VISTA 3D ============================ */
  var MAPA_3D = [
    [/overol enterizo/i, "overol"],
    [/chaleco tipo periodista/i, "chaleco"],
    [/pantal[oó]n en jeans/i, "pantalon"],
    [/camisa (cuello corbata|en jean)/i, "camisa"],
    [/camiseta polo/i, "polo"],
    [/^casco/i, "casco"],
    [/bota de seguridad/i, "bota"],
    [/guante/i, "guante"],
  ];

  /* ============================ PEDIDO ============================ */
  var PEDIDO = {};
  try { PEDIDO = JSON.parse(localStorage.getItem("dp_pedido_catalogo") || "{}"); } catch (e) {}
  function guardarPedido() {
    try { localStorage.setItem("dp_pedido_catalogo", JSON.stringify(PEDIDO)); } catch (e) {}
  }
  function precioDe(item) {
    var val = item.querySelector(".val");
    if (!val) return 0;
    var n = (val.textContent || "").replace(/[^\d]/g, "");
    return Number(n) || 0;
  }
  function totalPedido() {
    var t = 0, u = 0;
    Object.keys(PEDIDO).forEach(function (k) { t += PEDIDO[k].precio * PEDIDO[k].qty; u += PEDIDO[k].qty; });
    return { total: t, unidades: u, lineas: Object.keys(PEDIDO).length };
  }
  function fmt(n) { return "$" + Math.round(n).toLocaleString("es-CO"); }

  /* ============================ ARMADO DEL DOM ============================ */
  var items = document.querySelectorAll(".item");
  var enlazados3d = 0;
  items.forEach(function (it, idx) {
    var nom = it.querySelector(".nom");
    if (!nom) return;
    var texto = (nom.textContent || "").replace(/\s+/g, " ").trim();
    var esServicio = /bordado|estampado/i.test(texto);

    // — enlace 3D (en el nombre y el sello, no en toda la fila) —
    for (var i = 0; i < MAPA_3D.length; i++) {
      if (MAPA_3D[i][0].test(texto)) {
        var id = MAPA_3D[i][1];
        it.classList.add("con3d");
        var sello = document.createElement("span");
        sello.className = "sello3d";
        sello.textContent = "VER EN 3D ↗";
        sello.title = "Ver este producto en 3D";
        var abrir = (function (pid) {
          return function (e) { e.stopPropagation(); window.location.href = "./catalogo3d.html?p=" + pid + "&solo=1"; };
        })(id);
        sello.addEventListener("click", abrir);
        nom.addEventListener("click", abrir);
        it.appendChild(sello);
        enlazados3d++;
        break;
      }
    }

    // — botón "+" para armar pedido (no aplica a servicios de bordado) —
    if (esServicio) return;
    var precio = precioDe(it);
    var btn = document.createElement("button");
    btn.className = "btn-mas";
    btn.type = "button";
    btn.title = "Agregar a mi pedido";
    btn.textContent = "+";
    var keyItem = "p" + idx;
    if (PEDIDO[keyItem]) btn.classList.add("en-pedido");
    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      if (PEDIDO[keyItem]) { PEDIDO[keyItem].qty += 1; }
      else { PEDIDO[keyItem] = { nombre: texto, precio: precio, qty: 1 }; }
      btn.classList.add("en-pedido");
      guardarPedido();
      pintarBarra(true);
    });
    it.appendChild(btn);
  });

  /* ============================ BARRA + PANEL ============================ */
  var barra = document.createElement("div");
  barra.className = "barra-pedido";
  barra.innerHTML =
    '<div class="barra-int">' +
    '<div class="barra-info"><div class="barra-titulo" id="bp-titulo"></div><div class="barra-sub" id="bp-sub"></div></div>' +
    '<button class="barra-btn barra-ver" id="bp-ver" type="button">Ver</button>' +
    '<button class="barra-btn barra-enviar" id="bp-enviar" type="button">Enviar pedido</button>' +
    "</div>";
  document.body.appendChild(barra);

  var panel = document.createElement("div");
  panel.className = "panel-pedido";
  panel.innerHTML =
    '<div class="panel-card">' +
    '<div class="panel-cab"><h3>🧾 Mi pedido</h3><button class="panel-x" id="pp-cerrar" type="button">✕</button></div>' +
    '<div class="panel-lista" id="pp-lista"></div>' +
    '<div class="panel-pie">' +
    '<div class="panel-total"><span>Total estimado</span><b id="pp-total"></b></div>' +
    '<p class="panel-nota">Precios de referencia sin IVA, sujetos a confirmación según cantidades y tallas.</p>' +
    '<button class="panel-wa" id="pp-wa" type="button">📲 Enviar pedido por WhatsApp</button>' +
    '<button class="panel-vaciar" id="pp-vaciar" type="button">Vaciar pedido</button>' +
    "</div></div>";
  document.body.appendChild(panel);

  function pintarBarra(mostrar) {
    var t = totalPedido();
    if (t.lineas === 0) { barra.classList.remove("visible"); return; }
    document.getElementById("bp-titulo").textContent =
      "Mi pedido: " + t.lineas + (t.lineas === 1 ? " producto" : " productos") + " · " + t.unidades + " und";
    document.getElementById("bp-sub").textContent = "Total estimado " + fmt(t.total) + " + IVA";
    if (mostrar !== false) barra.classList.add("visible");
  }

  function pintarPanel() {
    var lista = document.getElementById("pp-lista");
    var claves = Object.keys(PEDIDO);
    lista.innerHTML = claves.length ? "" : '<p style="color:#8a8072;font-size:.9rem;padding:14px 0">Tu pedido está vacío. Toca el botón <b>+</b> de cualquier producto.</p>';
    claves.forEach(function (k) {
      var p = PEDIDO[k];
      var fila = document.createElement("div");
      fila.className = "ped-fila";
      fila.innerHTML =
        '<div class="ped-nom">' + p.nombre.replace(/</g, "&lt;") +
        '<div class="ped-precio">' + fmt(p.precio) + " c/u</div></div>" +
        '<div class="ped-qty"><button type="button" data-menos>−</button><span>' + p.qty +
        '</span><button type="button" data-mas>+</button></div>';
      fila.querySelector("[data-menos]").addEventListener("click", function () {
        p.qty -= 1;
        if (p.qty <= 0) { delete PEDIDO[k]; sincronizarBotones(); }
        guardarPedido(); pintarPanel(); pintarBarra(false);
        if (!Object.keys(PEDIDO).length) { cerrarPanel(); barra.classList.remove("visible"); }
      });
      fila.querySelector("[data-mas]").addEventListener("click", function () {
        p.qty += 1; guardarPedido(); pintarPanel(); pintarBarra(false);
      });
      lista.appendChild(fila);
    });
    document.getElementById("pp-total").textContent = fmt(totalPedido().total) + " + IVA";
  }

  function sincronizarBotones() {
    document.querySelectorAll(".btn-mas").forEach(function (b) { b.classList.remove("en-pedido"); });
    // no hay mapa inverso simple; el estado visual se corrige al recargar. Suficiente.
  }
  function abrirPanel() { pintarPanel(); panel.classList.add("abierto"); }
  function cerrarPanel() { panel.classList.remove("abierto"); }

  document.getElementById("bp-ver").addEventListener("click", abrirPanel);
  document.getElementById("pp-cerrar").addEventListener("click", cerrarPanel);
  panel.addEventListener("click", function (e) { if (e.target === panel) cerrarPanel(); });
  document.getElementById("pp-vaciar").addEventListener("click", function () {
    PEDIDO = {}; guardarPedido(); sincronizarBotones(); pintarPanel(); cerrarPanel();
    barra.classList.remove("visible");
  });

  function enviarWhatsApp() {
    var t = totalPedido();
    if (!t.lineas) return;
    var lineas = ["Hola, Dotaciones El Manantial 👋", "Vi su catálogo y quiero cotizar este pedido:", ""];
    Object.keys(PEDIDO).forEach(function (k) {
      var p = PEDIDO[k];
      lineas.push("• " + p.qty + " × " + p.nombre + " — " + fmt(p.precio) + " c/u");
    });
    lineas.push("");
    lineas.push("Total estimado: " + fmt(t.total) + " + IVA");
    lineas.push("Quedo atento a tallas, disponibilidad y valor final. ¡Gracias!");
    window.open("https://wa.me/" + WHATSAPP + "?text=" + encodeURIComponent(lineas.join("\n")), "_blank");
  }
  document.getElementById("bp-enviar").addEventListener("click", enviarWhatsApp);
  document.getElementById("pp-wa").addEventListener("click", enviarWhatsApp);

  /* ============================ AVISO SUPERIOR ============================ */
  var indice = document.querySelector(".indice");
  if (indice) {
    var aviso = document.createElement("p");
    aviso.className = "aviso3d";
    aviso.innerHTML = "✨ <b>Nuevo:</b> arma tu pedido con el botón <b>+</b> de cada producto y envíalo por WhatsApp en un toque. Los productos «VER EN 3D» se pueden girar 360°.";
    indice.parentNode.insertBefore(aviso, indice.nextSibling);
  }

  /* ============================ BUSCADOR + PDF ============================ */
  var buscador = document.getElementById("buscador");
  if (buscador) {
    var normal = function (t) {
      return (t || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
    };
    buscador.addEventListener("input", function () {
      var q = normal(buscador.value.trim());
      var visibles = 0;
      document.querySelectorAll(".item").forEach(function (it) {
        var nom = it.querySelector(".nom");
        var ok = !q || normal(nom ? nom.textContent : "").indexOf(q) >= 0;
        it.style.display = ok ? "" : "none";
        if (ok) visibles++;
      });
      // ocultar categorías que quedaron vacías
      document.querySelectorAll("section.cat").forEach(function (sec) {
        var alguna = Array.prototype.some.call(sec.querySelectorAll(".item"), function (it) {
          return it.style.display !== "none";
        });
        sec.style.display = alguna ? "" : "none";
      });
      var sr = document.getElementById("sin-resultados");
      if (sr) sr.hidden = visibles > 0;
    });
  }
  var btnPdf = document.getElementById("btn-pdf");
  if (btnPdf) btnPdf.addEventListener("click", function () { window.print(); });

  /* ============================ LLÁMENME ============================ */
  var llBtn = document.getElementById("ll-enviar");
  if (llBtn) {
    llBtn.addEventListener("click", function () {
      var nombre = (document.getElementById("ll-nombre").value || "").trim();
      var tel = (document.getElementById("ll-tel").value || "").trim();
      var nota = document.getElementById("ll-nota");
      if (!tel || tel.replace(/\D/g, "").length < 7) {
        nota.textContent = "⚠️ Escriba un celular válido para poder llamarlo.";
        nota.style.color = "#a33";
        return;
      }
      var msg = "📞 SOLICITUD DE LLAMADA (desde el catálogo)\n" +
        "Nombre/Empresa: " + (nombre || "(no lo escribió)") + "\n" +
        "Celular: " + tel + "\n" +
        "Quiere que lo llamen para cotizar dotación.";
      window.open("https://wa.me/" + WHATSAPP + "?text=" + encodeURIComponent(msg), "_blank");
      nota.textContent = "✅ ¡Listo! Su solicitud quedó enviada — lo llamaremos hoy mismo.";
      nota.style.color = "#0a7a44";
    });
  }

  // pedido guardado de una visita anterior
  pintarBarra(true);
})();
