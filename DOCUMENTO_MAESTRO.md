# DOCUMENTO MAESTRO — Todo el proyecto en un solo lugar

**Negocio:** Dotaciones El Manantial S.A.S · NIT 830.137.919-3 · Carrera 34 No. 2-62, Bogotá
Tel. (601) 721 3566 · Cel. 313 574 5063 · dot.manantial@hotmail.com · Firma: José Manuel Morales Quintana

**Objetivo:** conseguir clientes para la empresa de dotación industrial del papá de Diego (~60 años, no técnico): base de datos de empresas reales, cotizaciones personalizadas enviadas masivamente por correo y WhatsApp, y seguimiento de respuestas. **Todo 100 % gratis.**

**Última actualización:** 23 de julio de 2026.

---

## 1. Los DOS sistemas del proyecto

Este repositorio contiene dos sistemas complementarios, construidos en sesiones distintas:

| | Sistema A — **DotaciónPro** (app web) | Sistema B — **Dotación Papá** (Google Sheets) |
|---|---|---|
| **Estado** | ✅ **FUNCIONANDO EN VIVO, listo para usar hoy** | 🟡 Código 100 % terminado; falta instalación manual (~30 min de Diego) |
| **Dónde vive** | https://morales101002-dotacionpro.static.hf.space/ | Google Drive de morales.1010020668@gmail.com |
| **Código** | carpeta `dotacion-app/` (rama `claude/intelligent-cannon-rlgn1v`, PR [#2](https://github.com/jade1010020668/92DF-8334/pull/2)) | carpetas `apps_script/` + `whatsapp_service/` (rama `claude/create-plan-framework-aDC3Z`, PR [#1](https://github.com/jade1010020668/92DF-8334/pull/1), mejoras de UI en PR [#3](https://github.com/jade1010020668/92DF-8334/pull/3)) |
| **Base de datos** | 13.950 empresas (11.031 con correo) precargada | Vacía; busca empresas con Gemini + Google Search |
| **Envío de correo** | Microsoft (un clic) o Brevo (300/día), HTML bonito + PDF adjunto | Gmail con OAuth integrado de Apps Script |
| **Guarda datos en** | El navegador del celular/PC (localStorage) + copia Excel semanal | Google Sheets (nube, nunca se pierde) |
| **Extra** | Catálogo web premium, PDF de cotización, mapa de prospección, tutorial paso a paso | Lee respuestas con IA y notifica al WhatsApp del papá |

**Recomendación:** usar **DotaciónPro ya** (funciona hoy, tiene la base de 11.031 correos). Instalar **Dotación Papá** cuando Diego tenga 30 minutos: le suma la búsqueda automática con IA, el envío por Gmail y el aviso por WhatsApp cuando alguien responde interesado.

---

## 2. Sistema A — DotaciónPro (app web, EN VIVO)

### 2.1 Enlaces

- **App:** https://morales101002-dotacionpro.static.hf.space/
- **Catálogo premium (para compartir por WhatsApp):** https://morales101002-dotacionpro.static.hf.space/catalogo.html
- **Código:** `dotacion-app/` en este repo · Space de Hugging Face: `MORALES101002/dotacionpro`

### 2.2 Qué hace (todo verificado funcionando)

1. **Base de 13.950 empresas reales de Bogotá y Cundinamarca** — 11.031 con correo y 2.808 con teléfono. Un botón: «Cargar empresas de Bogotá».
2. **Envío masivo real de cotizaciones**: seleccionas hasta 50 empresas → correo HTML personalizado por sector + PDF de cotización adjunto → barra de progreso → quedan marcadas «Enviado» y **todo persiste** al cerrar y reabrir.
3. **Correo con un clic** (dos vías, se configuran en Configuración):
   - **Microsoft** (dot.manantial@hotmail.com): conectar una vez con el botón «Conectar correo» (necesita un Client ID gratuito de Azure; guía con enlace directo dentro de la app). Además permite **«Revisar respuestas»**: lee la bandeja y marca quién respondió.
   - **Brevo** (alternativa comprobada, 300 correos/día gratis): pegar la clave API en Opciones avanzadas.
   - Sin configurar nada: abre el borrador en Outlook web listo para enviar.
4. **WhatsApp en 1 toque** con mensaje escrito y **Catálogo** compartible; la empresa queda marcada como contactada (con botón Deshacer).
5. **Inicio = el día armado**: las 5 empresas más cercanas al local para contactar hoy, seguimientos vencidos, entregas del día.
6. **Pedidos y cotización PDF** con numeración consecutiva, precios reales Enero 2026 (34 productos del catálogo oficial).
7. **Mapa de prospección** (OpenStreetMap, gratis): buscar empresas por zona, agregarlas y cotizarles de una.
8. **Importar/exportar Excel** — y desde julio 2026, si una empresa ya existe, **le completa el correo/teléfono que le falte** en vez de descartarla (nunca pisa lo ya escrito ni los estados).
9. **Tutorial paso a paso** al entrar (se puede saltar), respaldo semanal «Guardar copia de mi lista», protección contra abrir dentro de WhatsApp.

### 2.3 La base de datos v3 (cómo se construyó)

| Fuente | Qué aportó |
|---|---|
| OpenStreetMap (Overpass, 14 zonas industriales) | ~6.400 negocios con ubicación y cercanía al local |
| Scraping de sitios web (2 pasadas, decodificador Cloudflare) | 690 correos verificados en sitios reales |
| **datos.gov.co (datos abiertos oficiales)** — 221 datasets barridos, 413 mil filas | **+10.331 empresas con correo**: privadas registradas ante la DIAN, clínicas e IPS, proveedores del Estado (SECOP, solo empresas), servicios públicos |

- Depurada: sin repetidos (por correo y por nombre normalizado), sin personas naturales, sin datasets con datos mal mapeados.
- **Excel entregable:** `datos/DotacionPro_base_nutrida_v3.xlsx` (hoja 2 = «Con correo», lista para masivo).
- A 50 correos/día hay material para **~7 meses sin repetir empresa**.

### 2.4 Verificación (última corrida: 10 jul 2026)

- 317 pruebas unitarias (Vitest) ✅ · 10 recorridos en navegador real (Playwright sobre el build de producción) ✅ — incluye: envío masivo de 50 con persistencia tras cerrar/reabrir, relleno de datos en repetidas, carga de la base completa sin exceder el almacenamiento del navegador, tutorial, mapa, rendimiento (<4 s con 13.950 filas).
- Base en vivo verificada: `LIVE: 13950 | con correo: 11031`.

### 2.5 Cómo se actualiza y despliega

```bash
cd dotacion-app
npx tsc -b && npm test && npm run build       # verificar
# subir dist/ al Space MORALES101002/dotacionpro con huggingface_hub (upload_folder)
```

Suites de navegador: se sirven desde `dist/` en localhost con Playwright (el sandbox no tiene internet para el navegador; solo curl vía proxy).

---

## 3. Sistema B — Dotación Papá (Sheets + Apps Script + Gemini + WhatsApp)

> Documentación completa en este mismo repo: **`PLAN_COMPLETO.md`** (plan maestro, 15 secciones) y **`DOTACION_PAPA_BUNDLE.md`** (plan + TODO el código en un solo archivo). Manual del papá: `MANUAL_PAPA.md`.

### 3.1 Qué hace

1. **Busca empresas** por sector con Gemini 2.5 Pro + Google Search y las valida visitando su web (descarta alucinaciones).
2. **Enriquece** extrayendo el correo del sitio con IA.
3. **Envía cotizaciones por Gmail** (OAuth integrado, sin contraseñas).
4. **Lee respuestas** y las clasifica con IA (interesado / no / fuera de oficina / spam).
5. **Avisa al WhatsApp del papá** cuando llega un interesado (servicio Node con whatsapp-web.js).

### 3.2 Estado

- Código 100 % en el repo: 13 `.gs` + 6 `.html` (`apps_script/`) y servicio Node (`whatsapp_service/`).
- Recursos ya creados en el Drive de morales.1010020668@gmail.com (carpeta «Dotación Papá», Sheet BD, doc «EMPEZAR AQUÍ», manual — links exactos en `PLAN_COMPLETO.md` §4.2).
- **Falta (solo Diego puede, ~30 min):** rotar la API key de Gemini, pegar el código en Apps Script, configurar 4 secretos, inicializar hojas, triggers, levantar el servicio WhatsApp y desplegar la Web App. Paso a paso exacto: `PLAN_COMPLETO.md` §9.

---

## 4. ⚠️ SEGURIDAD — 3 rotaciones pendientes (hacer YA)

Estas credenciales se pegaron en chats y deben cambiarse. **Nunca** volver a pegar claves en un chat, captura o commit.

1. **Contraseña de dot.manantial@hotmail.com** → cambiarla en account.microsoft.com. (Nunca se usó ni se guardó en el código: Microsoft eliminó el acceso por contraseña IMAP/SMTP en 2024; el envío usa OAuth.)
2. **Token de Hugging Face** (`hf_URh…`) → borrarlo y crear uno nuevo en huggingface.co/settings/tokens (se usó para desplegar el Space).
3. **API key de Gemini** → borrar y recrear en aistudio.google.com/apikey; guardarla SOLO en PropertiesService de Apps Script.

---

## 5. Pendientes de Diego (checklist)

**Para vender ya con DotaciónPro:**
- [ ] Abrir la app → Empresas → «Cargar empresas de Bogotá (11.000 con correo)».
- [ ] Elegir la vía de correo: conectar Microsoft (guía dentro de la app) **o** crear cuenta Brevo gratis (~7 min) y pegar la clave.
- [ ] Enviar la primera tanda de 50 cotizaciones (seleccionar → «Enviar cotización»).
- [ ] Instalar la app en el celular del papá (Chrome → «Agregar a pantalla de inicio») y entregarle el manual de 1 página.
- [ ] Fotos de productos + logo para subir el nivel del catálogo (opcional).

**Proyecto:**
- [ ] Las 3 rotaciones de seguridad (§4).
- [ ] Revisar y hacer merge de los PRs [#2](https://github.com/jade1010020668/92DF-8334/pull/2) (DotaciónPro), [#1](https://github.com/jade1010020668/92DF-8334/pull/1) y [#3](https://github.com/jade1010020668/92DF-8334/pull/3) (Dotación Papá).
- [ ] Cuando haya 30 min: instalar Dotación Papá (`PLAN_COMPLETO.md` §9).

---

## 6. Mapa del repositorio

| Ruta | Qué es | Sistema |
|---|---|---|
| `dotacion-app/` | App web React 19 + TypeScript + Vite (código fuente completo) | A |
| `dotacion-app/public/empresas-bogota.json` | Base v3: 13.950 empresas (3 MB) | A |
| `dotacion-app/public/catalogo.html` | Catálogo premium con precios reales | A |
| `datos/` | Exceles entregables (usar `DotacionPro_base_nutrida_v3.xlsx`) + lista de precios 2026 | A |
| `apps_script/` | 13 `.gs` + 6 `.html` de la app de Google Sheets | B |
| `whatsapp_service/` | Servicio Node (Express + whatsapp-web.js) | B |
| `PLAN_COMPLETO.md` / `DOTACION_PAPA_BUNDLE.md` / `MANUAL_PAPA.md` | Documentación del sistema B | B |
| `src/`, `tests/`, `db/`, `config/`, `plantillas/` | Prototipo Python/SQLite **archivado** (no se usa) | — |

**Ramas:** `claude/intelligent-cannon-rlgn1v` = sistema A (incluye la historia del B) · `claude/create-plan-framework-aDC3Z` = sistema B · `main` = base inicial.

---

## 7. Decisiones técnicas clave (por qué es así)

- **Sin servidor propio y sin costos**: DotaciónPro es 100 % estática (Hugging Face Spaces gratis); los datos viven en el navegador con respaldo a Excel. Dotación Papá usa el gratis de Google (Sheets/Apps Script/Gmail).
- **La contraseña del correo no sirve para enviar**: Microsoft eliminó IMAP/SMTP por contraseña para cuentas personales (2024). Por eso el envío es OAuth (Microsoft/MSAL) o Brevo — y un login desde un datacenter bloquearía la cuenta del negocio.
- **OpenStreetMap y datos.gov.co en vez de Google Maps API**: gratis y sin riesgo de cobros (el crédito US$200 de Google fue eliminado).
- **Relleno en repetidas al importar**: los correos nuevos llegan a las filas viejas del usuario sin duplicar ni pisar nada (causa raíz del «solo veo 200 con correo», resuelto el 10 jul 2026).

---

## 8. Cómo retomar el trabajo con Claude

Al abrir una sesión nueva sobre este repo, pedir: *«Lee `DOCUMENTO_MAESTRO.md` y continúa desde ahí»*. Para tocar el sistema A, trabajar en la rama `claude/intelligent-cannon-rlgn1v` (verificar SIEMPRE: `tsc` → `npm test` → build → suites de navegador → desplegar → confirmar en vivo). Para el sistema B, la referencia es `DOTACION_PAPA_BUNDLE.md` en la rama `claude/create-plan-framework-aDC3Z`.
