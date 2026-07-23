/* Vista 3D: los productos con modelo interactivo se abren al tocarlos. */
(function () {
  "use strict";
  // texto del producto → id en catalogo3d.html
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
  var estilo = document.createElement("style");
  estilo.textContent =
    ".item.con3d{cursor:pointer;border-radius:8px;transition:background .15s}" +
    ".item.con3d:hover{background:rgba(191,155,73,.08)}" +
    ".sello3d{flex:none;font-size:.62rem;font-weight:700;letter-spacing:.06em;color:#8a6f3c;" +
    "border:1px solid #cdbf9f;border-radius:999px;padding:2px 8px;margin-left:8px;white-space:nowrap}" +
    ".aviso3d{margin:18px auto 0;max-width:640px;text-align:center;font-size:.85rem;color:#6b6353;" +
    "background:#faf6ec;border:1px solid #ece2cf;border-radius:10px;padding:10px 16px}";
  document.head.appendChild(estilo);

  var items = document.querySelectorAll(".item");
  var enlazados = 0;
  items.forEach(function (it) {
    var nom = it.querySelector(".nom");
    if (!nom) return;
    var texto = nom.textContent || "";
    for (var i = 0; i < MAPA_3D.length; i++) {
      if (MAPA_3D[i][0].test(texto)) {
        var id = MAPA_3D[i][1];
        it.classList.add("con3d");
        it.title = "Ver este producto en 3D";
        var sello = document.createElement("span");
        sello.className = "sello3d";
        sello.textContent = "VER EN 3D ↗";
        it.appendChild(sello);
        it.addEventListener("click", (function (pid) {
          return function () { window.location.href = "./catalogo3d.html?p=" + pid; };
        })(id));
        enlazados++;
        break;
      }
    }
  });

  if (enlazados > 0) {
    var indice = document.querySelector(".indice");
    if (indice) {
      var aviso = document.createElement("p");
      aviso.className = "aviso3d";
      aviso.innerHTML = "✨ <b>Nuevo:</b> los productos marcados con «VER EN 3D» se pueden girar 360° y cotizar al instante.";
      indice.parentNode.insertBefore(aviso, indice.nextSibling);
    }
  }
})();
