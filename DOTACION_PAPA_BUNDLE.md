# PLAN COMPLETO - Dotacion Papa

> **Documento maestro para continuar el proyecto en Claude Code local.**
> Incluye: contexto, arquitectura, estado, ubicacion de archivos, instrucciones
> paso a paso para terminar la instalacion.
>
> **Como usar este documento en Claude Code local:**
> 1. Clonar el repo: `git clone https://github.com/jade1010020668/92DF-8334.git`
> 2. `cd 92DF-8334 && git checkout claude/create-plan-framework-aDC3Z`
> 3. Abrir Claude Code en esa carpeta
> 4. Pegar este documento como primer mensaje, o decir: "lee PLAN_COMPLETO.md y continua".

---

## 1. RESUMEN EJECUTIVO

**Que es Dotacion Papa:** Sistema de prospeccion B2B automatizada para una PYME familiar de dotacion (uniformes, EPP, botas, overoles) en Bogota. El papa (no-tecnico, 60+) opera la app; Diego (hijo, tecnico) la mantiene.

**Que hace:**
1. Busca empresas con Gemini 2.5 Pro + grounding (Google Search).
2. Valida cada empresa con fetch a su web (descarta alucinaciones de IA).
3. Visita la web de cada empresa y extrae el correo de contacto con IA.
4. Envia cotizaciones personalizadas via Gmail (sin SMTP — usa OAuth nativo).
5. Lee respuestas via Gmail API y las clasifica con IA (interesado / no_interesado / fuera_oficina / spam).
6. Notifica al WhatsApp del papa cuando llega un interesado.

**Estado:** Codigo 100% terminado. Archivos en GitHub y Drive. Pendiente: usuario debe pegar codigo en Apps Script, configurar 4 secretos, desplegar como web app, y levantar servicio Node de WhatsApp.

---

## 2. ARQUITECTURA

```
+--------------------------------------------------------+
|  GOOGLE SHEETS (base de datos, 7 hojas)                |
|  Sectores, Empresas, CorreosEnviados, Respuestas,      |
|  Config, Logs, ConsumoGemini                           |
+--------------------------------------------------------+
              |
              v
+--------------------------------------------------------+
|  APPS SCRIPT (toda la app)                             |
|  - 13 archivos .gs (logica de negocio)                 |
|  - 6 archivos .html (UI con 4 pantallas)               |
|  - Triggers automaticos (cada hora / diario)           |
|  - Gemini via UrlFetchApp                              |
|  - Gmail integrado (OAuth nativo, sin App Password)    |
|  - Secretos en PropertiesService                       |
+--------------------------------------------------------+
              |
              v
+--------------------------------------------------------+
|  SERVICIO NODE EXTERNO (en PC de Diego)                |
|  Express + whatsapp-web.js                             |
|  Endpoints: GET /estado, POST /enviar                  |
|  Sesion persistente en .wwebjs_auth/                   |
+--------------------------------------------------------+
```

**Por que esta arquitectura (vs plan original Python/Streamlit/SQLite):**

El plan original era Python local + Playwright + SQLite + Streamlit. Se pivoto a Apps Script porque:
- Diego no tiene que mantener un PC encendido (solo el servicio Node).
- El papa accede desde celular/PC sin instalar nada.
- Gmail nativo via OAuth (no App Password, no SMTP).
- Triggers in-cloud (no APScheduler, no cron).
- Sheets como BD: el papa puede ver/editar datos si quiere.

**Limitaciones aceptadas:**
- Sin Playwright (paginas SPA pueden no renderizar bien con UrlFetchApp).
- Timeout de 6 min por ejecucion de Apps Script (mitigado con lotes de 50).
- WhatsApp no se puede correr en Apps Script (necesita servicio Node externo).

---

## 3. DECISIONES TECNICAS FIJADAS

| Tema | Decision | Motivo |
|---|---|---|
| Backend + UI | Google Apps Script | Sin servidor, sin instalacion, OAuth nativo |
| BD | Google Sheets (7 hojas) | El papa puede inspeccionarla, sin SQLite local |
| LLM | Gemini 2.5 Pro + 2.5 Flash | $250 USD prepago x 2 meses |
| Scraping | Gemini grounding (`google_search` tool) | Reemplaza Playwright |
| Correo saliente | GmailApp (Apps Script) | OAuth nativo, sin App Password |
| Correo entrante | Gmail API (Apps Script) | Mismo OAuth |
| WhatsApp | Node + whatsapp-web.js + Express | Apps Script no puede mantener sesion |
| Scheduler | Triggers de Apps Script (time-based) | Sin APScheduler |
| Idioma UI | Espanol colombiano, sin tecnicismos | Audiencia es el papa |
| Plataforma | Web app (browser PC + celular) | Sin instalacion, sin Windows-only |

**Modelos Gemini:**
- **Pro** (`gemini-2.5-pro`): tareas sensibles — busqueda con grounding, redaccion de cotizaciones, clasificacion de respuestas. $1.25/M input + $5.00/M output.
- **Flash** (`gemini-2.5-flash`): alto volumen — extraccion de correos, evaluacion de prospectos. $0.10/M input + $0.40/M output.
- **Fallback automatico** Pro -> Flash cuando se agotan creditos (`ia.forzar_flash = true` en Config).

---

## 4. ESTADO ACTUAL

### 4.1 Codigo

**100% terminado y en GitHub.** Rama: `claude/create-plan-framework-aDC3Z`. Commits:
- `e66f47e` — Bootstrap (Fase 0)
- `530db69` — Capa de datos Python (Fase 1, archivado)
- `253dc6d` — Migracion completa a Apps Script (Fases 2-10)
- `2c8ae4d` — Servicio Node WhatsApp (Fase 6)
- `9553dd7` — Manual del papa + smoke test + plantilla clasp (Fase 11)

**PR draft #1:** https://github.com/jade1010020668/92DF-8334/pull/1

### 4.2 Recursos en Google Drive (cuenta morales.1010020668@gmail.com)

| Recurso | ID / Link | Estado |
|---|---|---|
| Carpeta raiz "Dotacion Papa" | `18i6uiguHHio41JhqbvNGImqaQOKosJCK` | Creada |
| Sheet "Dotacion Papa - BD" | `197RZZ0-Ys6wFwnZ9y0t3gUBHTws1KbTp-78AASvcfmo` | Creado, vacio |
| Subcarpeta "codigo_apps_script" | `1MOZpFdjo8mXsITzyIwQ07IC14D6AZW8-` | 20 archivos subidos |
| Doc "EMPEZAR AQUI" | `1TBpsDcuosgozMrHU3VdiSt1LSiVztEW8xSXyLnPTgBo` | Guia instalacion |
| Doc "MANUAL DEL PAPA" | `1oiJB5LZW3YJeeVO5N81vuAS97Q1F2KS7noT34ns4MK4` | Listo para imprimir |
| Archivo "Codigo.gs (TODO EN UNO)" | `1WnTogWGs3FRQv9imgpQsiffJ-NA2Dg2p` | 12 .gs concatenados |

**Links directos:**
- Carpeta: https://drive.google.com/drive/folders/18i6uiguHHio41JhqbvNGImqaQOKosJCK
- Sheet: https://docs.google.com/spreadsheets/d/197RZZ0-Ys6wFwnZ9y0t3gUBHTws1KbTp-78AASvcfmo/edit
- EMPEZAR AQUI: https://docs.google.com/document/d/1TBpsDcuosgozMrHU3VdiSt1LSiVztEW8xSXyLnPTgBo/edit
- MANUAL PAPA: https://docs.google.com/document/d/1oiJB5LZW3YJeeVO5N81vuAS97Q1F2KS7noT34ns4MK4/edit
- Codigo TODO EN UNO: https://drive.google.com/file/d/1WnTogWGs3FRQv9imgpQsiffJ-NA2Dg2p/view

### 4.3 Lo que falta (acciones manuales del usuario)

Apps Script no se puede crear desde otra API (Google security). Estos pasos los hace **el dueno de la cuenta**:

1. **Rotar Gemini API key** (la actual fue expuesta varias veces en chat).
2. Abrir el Sheet → `Extensiones > Apps Script`.
3. Pegar codigo: 1 archivo .gs grande + 6 .html + appsscript.json.
4. Configurar 4 propiedades en `PropertiesService`.
5. Recargar Sheet → menu `Dotacion Papa > Inicializar todo`.
6. Llenar hoja Config con datos del negocio.
7. Menu `Configurar triggers automaticos`.
8. Levantar servicio Node WhatsApp (`whatsapp_service/`) y escanear QR.
9. Apps Script → `Implementar > Aplicacion web` → URL.
10. Smoke test desde el menu.
11. Pasar URL al papa + imprimir manual.

---

## 5. SEGURIDAD CRITICA

**La Gemini API key fue expuesta en chat varias veces. DEBE rotarse antes de cualquier uso.**

1. Ir a https://aistudio.google.com/apikey
2. Boton **Borrar clave** en la clave actual.
3. Boton **Crear clave de API** → nueva.
4. **NO** pegarla en chat, captura, repo, ni mensaje.
5. Ir directo de AI Studio a Apps Script → Propiedades del script → agregar `GEMINI_API_KEY`.

**Reglas permanentes:**
- Todos los secretos en `PropertiesService.getScriptProperties()`. Nunca en codigo.
- 4 propiedades requeridas: `GEMINI_API_KEY`, `WHATSAPP_NUMERO_PAPA`, `WHATSAPP_SERVICE_URL`, `CONFIG_PIN`.
- El codigo lee con `leerSecreto('NOMBRE')` (definido en `Config.gs`). Lanza error si falta.
- `.gitignore` bloquea `.env`, `apps_script/.clasp.json`, `.wwebjs_auth/`, `db/*.db`, `logs/*.log`.
- Verificar antes de cada commit: `git grep -rE "AIza[A-Za-z0-9_-]{20,}"` debe devolver vacio.

---

## 6. MODELO DE DATOS

7 hojas en el Sheet "Dotacion Papa - BD":

| Hoja | Columnas |
|---|---|
| **Sectores** | id, nombre, palabras_clave, fecha_busqueda, total_empresas_encontradas |
| **Empresas** | id, nombre, sector_id, direccion, telefono, sitio_web, correo, ciudad, fuente, validada_por_ia, notas_ia, estado, fecha_creacion |
| **CorreosEnviados** | id, empresa_id, asunto, cuerpo, fecha_envio, estado_envio, mensaje_id |
| **Respuestas** | id, correo_enviado_id, empresa_id, asunto, cuerpo, fecha_recepcion, clasificacion_ia, resumen_ia, notificada_whatsapp |
| **Config** | clave, valor, descripcion |
| **Logs** | timestamp, nivel, modulo, mensaje |
| **ConsumoGemini** | timestamp, modelo, tokens_in, tokens_out, costo_usd, modulo |

**Estados validos para `empresas.estado`:**
`nueva` → `enriquecida` → `contactada` → `respondio` → (`interesado` / `no_interesado` / etc).
Tambien: `sin_correo`, `descartada`.

**Categorias validas para `respuestas.clasificacion_ia`:**
`interesado`, `no_interesado`, `fuera_oficina`, `spam`, `sin_clasificar`.

**Config inicial** (filas que `inicializarTodo()` agrega vacias para que Diego llene):

```
empresa.nombre                      Nombre comercial
empresa.productos                   uniformes|EPP|botas (separados con |)
empresa.ciudad                      Bogota
empresa.telefono_contacto           +57 numero del papa
empresa.correo_envio                Gmail del negocio
empresa.nombre_remitente            Nombre que firma
limites.correos_max_dia             30
limites.pausa_entre_correos_seg     90
limites.empresas_max_busqueda       300
ia.modelo_pro                       gemini-2.5-pro
ia.modelo_flash                     gemini-2.5-flash
ia.forzar_flash                     false  (poner true cuando se agoten creditos)
ia.saldo_inicial_usd                250
scheduler.hora_envio                08:00
scheduler.intervalo_lectura_min     60
```

---

## 7. ESTRUCTURA DEL REPO

```
92DF-8334/
├── apps_script/                  ← TODA LA APP (Apps Script)
│   ├── appsscript.json           ← Manifiesto (timezone, scopes OAuth, webapp)
│   ├── Config.gs                 ← Lectura de secretos + config del Sheet
│   ├── Inicializar.gs            ← Crea las 7 hojas la primera vez
│   ├── Sheets.gs                 ← CRUD sobre las hojas (reemplaza SQLite)
│   ├── IA.gs                     ← Cliente Gemini Pro/Flash con grounding
│   ├── Scraper.gs                ← Busca empresas con Gemini + google_search
│   ├── Enriquecer.gs             ← Visita web + extrae correo + evalua prospecto
│   ├── Correos.gs                ← Envio (GmailApp) + lectura respuestas
│   ├── WhatsApp.gs               ← POST al servicio Node
│   ├── Scheduler.gs              ← Triggers cada hora / diarios
│   ├── Menu.gs                   ← Menu personalizado del Sheet
│   ├── WebApp.gs                 ← doGet + 8 endpoints API para HTML
│   ├── VerificarInstalacion.gs   ← Smoke test (7 chequeos)
│   ├── Estilos.html              ← CSS (fuente grande, botones grandes)
│   ├── Layout.html               ← Header + nav 4 pantallas
│   ├── Dashboard.html            ← Pantalla 1: KPIs + medidor creditos
│   ├── Buscar.html               ← Pantalla 2: busqueda de empresas
│   ├── Respuestas.html           ← Pantalla 3: respuestas clasificadas
│   ├── Configuracion.html        ← Pantalla 4: PIN + estado servicios
│   ├── README.md                 ← Instrucciones de despliegue
│   └── .clasp.json.ejemplo       ← Plantilla para clasp push (opcional)
│
├── whatsapp_service/             ← SERVICIO NODE EXTERNO (WhatsApp)
│   ├── index.js                  ← Express + whatsapp-web.js
│   ├── package.json              ← Deps: express, whatsapp-web.js, qrcode-terminal
│   └── README.md                 ← Como levantarlo + escanear QR
│
├── src/                          ← CODIGO PYTHON ARCHIVADO (no usar)
│   ├── modelos/                  ← dataclasses (Empresa, CorreoEnviado, etc.)
│   ├── servicios/                ← (carpeta vacia, era el plan original)
│   ├── paginas/                  ← (carpeta vacia, era para Streamlit)
│   └── utilidades/               ← db.py, logger.py, repositorios.py
│
├── tests/                        ← TESTS PYTHON ARCHIVADOS (16 verdes)
│   ├── conftest.py
│   ├── test_db.py                ← 12 tests de CRUD
│   └── test_smoke.py             ← 4 tests basicos
│
├── config/configuracion.yaml     ← Plantilla del plan Python (archivada)
├── plantillas/                   ← (vacia, era para Streamlit)
├── db/                           ← (vacia, gitignored)
├── logs/                         ← (vacia, gitignored)
├── docs/capturas/                ← (vacia, para fotos del manual)
├── scripts/                      ← (vacia, era para generar PDF manual)
│
├── MANUAL_PAPA.md                ← Manual simple para el papa
├── README.md                     ← Readme principal del proyecto
├── PLAN_COMPLETO.md              ← ESTE DOCUMENTO
├── .env.ejemplo                  ← Plantilla de secretos (Python, archivado)
├── .gitignore                    ← Bloquea secretos, BD local, logs, sesion WhatsApp
└── requirements.txt              ← Deps Python (archivado)
```

**Lo que importa para la app actual: solo `apps_script/` y `whatsapp_service/`.** El resto es del plan Python que se archivo cuando se pivoto a Apps Script.

---

## 8. PROPOSITO DE CADA ARCHIVO APPS SCRIPT

### 8.1 Archivos `.gs` (logica)

**`Config.gs`** — `apps_script/Config.gs`
- Constantes globales: `NOMBRES_HOJAS`, `PROPIEDADES_REQUERIDAS`.
- `leerSecreto(clave)` — lee de PropertiesService, lanza si falta.
- `leerSecretoOpcional(clave)` — devuelve null si no esta.
- `leerConfig()` — devuelve objeto con todos los pares clave/valor de la hoja Config.
- `leerConfigValor(clave, default)` — un valor con default.
- `verificarConfiguracion()` — reporta propiedades faltantes y si hojas existen.
- `abrirHoja_(nombre)` — helper interno para abrir hoja por nombre.

**`Inicializar.gs`** — `apps_script/Inicializar.gs`
- Constantes: `ESQUEMA_HOJAS` (7 hojas con sus columnas), `CONFIG_INICIAL` (15 filas).
- `inicializarTodo()` — crea o reusa las 7 hojas, llena Config con plantilla, borra Sheet1 default.
- `aplicarEncabezados_(hoja, columnas)` — aplica encabezados azules + freeze row 1.

**`Sheets.gs`** — `apps_script/Sheets.gs`
- Validacion: `ESTADOS_EMPRESA_VALIDOS`, `CATEGORIAS_RESPUESTA_VALIDAS`.
- Helpers internos: `leerEncabezados_`, `filaAObjeto_`, `objetoAFila_`, `siguienteId_`, `leerTodo_`, `insertarFila_`, `actualizarFila_`, `buscarFila_`.
- Sectores: `insertarSector`, `listarSectores`, `actualizarConteoSector`.
- Empresas: `insertarEmpresa` (con dedup por nombre+direccion), `obtenerEmpresa`, `listarEmpresasPorEstado`, `actualizarEstadoEmpresa`, `actualizarEmpresaEnriquecida`.
- CorreosEnviados: `insertarCorreoEnviado`, `buscarCorreoPorMensajeId`, `marcarEnvioFallo`, `correosEnviadosUltimaSemana`.
- Respuestas: `insertarRespuesta`, `marcarNotificadaWhatsapp`, `respuestasNoNotificadas`, `respuestasNoLeidas`.
- KPIs: `contarEmpresasPorEstado`, `totalEmpresas`.
- Logging: `registrarLog_(nivel, modulo, mensaje)`.

**`IA.gs`** — `apps_script/IA.gs`
- Constante: `GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models/'`.
- `llamarGemini(modelo, prompt, opciones)` — funcion central:
  - Lee API key de PropertiesService.
  - Respeta `ia.forzar_flash` para fallback automatico Pro -> Flash.
  - Retry exponencial 3x (429/503).
  - Tools: `google_search: {}` si `opciones.conGrounding`.
  - JSON mode: `responseMimeType: 'application/json'` si schema.
  - Logging de tokens en hoja ConsumoGemini.
  - Returns `{texto, json, tokensIn, tokensOut, modelo}`.
- `parsearJsonTolerante_(texto)` — strip markdown fences, extract first JSON object/array.
- `registrarConsumoGemini_(modelo, in, out, modulo)` — calcula costo USD y appendea fila.
- API publica:
  - `extraerCorreoDeHtml(html)` — Flash, retorna `{correo, confianza}`.
  - `evaluarProspecto(empresa)` — Flash con revalidacion Pro si confianza < 0.7.
  - `redactarCotizacion(empresa, plantilla)` — Pro, retorna `{asunto, cuerpo}`.
  - `clasificarRespuesta(texto)` — Pro, retorna `{categoria, resumen}`.

**`Scraper.gs`** — `apps_script/Scraper.gs`
- `buscarEmpresasConIA(sectorNombre, instruccion, limite)` — punto de entrada:
  1. Inserta record en Sectores.
  2. Llama a Gemini Pro con grounding.
  3. Valida cada empresa con UrlFetchApp a su sitio web.
  4. Inserta validadas como `estado=nueva` (con dedup).
  5. Retorna `{sectorId, encontradas, validadas, descartadas}`.
- `pedirEmpresasAGemini_` — construye prompt con reglas estrictas (no inventar, verificar con busqueda, pequenas/medianas).
- `validarEmpresa_` — fetch al sitio web; 200-399 = valida; sin web exige telefono+direccion.

**`Enriquecer.gs`** — `apps_script/Enriquecer.gs`
- Constantes: `RUTAS_CONTACTO = ['/contacto', '/contact', '/contactenos', '/contact-us']`, `REGEX_CORREO`.
- `enriquecerLote(sectorId, limite=50)` — procesa empresas `nueva`, pausa 500ms entre cada una.
- `enriquecerEmpresa(empresa)`:
  1. Fetch home + rutas de contacto.
  2. Regex correo en HTML.
  3. Si no hay match, pasa HTML a Gemini Flash.
  4. Evalua prospecto con IA.
  5. Setea estado: `enriquecida` / `sin_correo` / `descartada`.
- Helpers: `traerHtmlSeguro_`, `combinarUrl_`, `buscarCorreoEnTexto_` (filtra correos basura: ejemplo, sentry, wordpress, noreply).

**`Correos.gs`** — `apps_script/Correos.gs`
- Constante: `PLANTILLA_DEFAULT` con placeholders `[empresa.nombre]` etc.
- `enviarLoteDelDia()` — respeta `limites.correos_max_dia` y `pausa_entre_correos_seg`.
- `enviarCotizacion(empresa)`:
  1. Genera plantilla con valores de Config.
  2. Llama a IA para personalizar.
  3. Genera `Message-ID` unico (`<uuid@dominio>`).
  4. `GmailApp.sendEmail` con header X-Dotacion-Origen.
  5. Inserta en CorreosEnviados.
- `leerRespuestas()`:
  1. `GmailApp.search('from:me after:YYYY/MM/DD')`.
  2. Por cada hilo con >=2 mensajes, examina ultimo.
  3. Extrae `In-Reply-To` / `References` del raw header.
  4. Busca el CorreoEnviado original por Message-ID.
  5. Si encontro y no es duplicado, clasifica con IA y guarda.
  6. Actualiza empresa a `estado=respondio`.
- Helpers: `correosEnviadosHoy_`, `generarMensajeId_`, `obtenerEncabezado_`, `leerPlantillaCotizacion_`.

**`WhatsApp.gs`** — `apps_script/WhatsApp.gs`
- `verificarEstadoWhatsApp()` — GET `{WHATSAPP_SERVICE_URL}/estado`.
- `notificarPendientes()` — procesa `respuestasNoNotificadas()` (solo `clasificacion_ia=interesado`), envia y marca.
- `formatearMensaje_(empresa, respuesta)` — texto con asterisks Markdown.
- `enviarMensajeWhatsApp_(mensaje)` — POST `{URL}/enviar` con body `{numero, mensaje}`.

**`Scheduler.gs`** — `apps_script/Scheduler.gs`
- Constantes: `NOMBRES_TRIGGERS = {LEER_RESPUESTAS, ENVIAR_LOTE}`.
- `configurarTriggers()` — borra existentes, crea:
  - `jobLeerRespuestas` cada N min (de Config, 30-360).
  - `jobEnviarLote` diario a la hora configurada.
- `jobLeerRespuestas()` — llama a `leerRespuestas()`, luego `notificarPendientes()` si hubo nuevas.
- `jobEnviarLote()` — llama a `enviarLoteDelDia()`.

**`Menu.gs`** — `apps_script/Menu.gs`
- `onOpen()` — crea menu "Dotacion Papa" con:
  - "1. Inicializar todo (primera vez)"
  - "Abrir app del papa"
  - Sub-menu "Acciones manuales": Buscar / Enriquecer / Enviar lote / Leer respuestas / Notificar interesados
  - "Configurar triggers automaticos"
  - "Verificar configuracion"
  - "Verificar instalacion completa (smoke test)"
- `abrirWebApp()`, `menuBuscar()`, `menuEnriquecer()`, `menuVerificarConfig()`, `menuVerificarInstalacion()`.

**`WebApp.gs`** — `apps_script/WebApp.gs`
- `doGet(e)` — routing por `?pagina=...` a `Dashboard|Buscar|Respuestas|Configuracion`.
- `incluir(nombreArchivo)` — helper para `<?!= incluir('Estilos') ?>`.
- Endpoints API (`google.script.run.apiXxx`):
  - `apiObtenerKPIs()` — total empresas, enriquecidas, contactadas, respondieron, correos semana, respuestas no leidas, credito restante.
  - `apiBuscarEmpresas(sector, instruccion, limite)`.
  - `apiEnriquecerEmpresas(sectorId, limite)`.
  - `apiListarRespuestas(filtro)` — last 50 enriquecidas con datos de empresa.
  - `apiMarcarRespuestaGestionada(respuestaId)`.
  - `apiVerificarServicios()` — estado Gemini, Gmail, WhatsApp, hoja Config, propiedades.
  - `apiValidarPin(pin)` — compara con CONFIG_PIN.
- `calcularCreditoRestante_()` — suma ConsumoGemini, resta de saldoInicialUsd.

**`VerificarInstalacion.gs`** — `apps_script/VerificarInstalacion.gs`
- `verificarInstalacion()` — 7 chequeos:
  1. 4 propiedades del script presentes.
  2. 7 hojas creadas.
  3. Config llena (al menos `empresa.nombre`, `empresa.productos`, `empresa.correo_envio`).
  4. Gemini API responde (smoke test con Flash).
  5. Gmail autorizado (verifica scope con `getInboxUnreadCount`).
  6. Servicio Node WhatsApp conectado.
  7. Triggers `jobLeerRespuestas` y `jobEnviarLote` activos.

### 8.2 Archivos `.html` (UI)

**`Estilos.html`** — CSS compartido. Fuente 18px body, botones `padding 14px 24px` `min-width 180px`, paleta azul/verde/amarillo/rojo. Animacion `.cargando` (spinner).

**`Layout.html`** — Header azul "Dotacion Papa" + nav con 4 enlaces. Incluido en cada pantalla con `<?!= incluir('Estilos') ?>`.

**`Dashboard.html`** — Pantalla 1. 5 tarjetas KPI grandes:
- Empresas totales.
- Listas para contactar (enriquecidas).
- Correos esta semana.
- Respuestas sin leer.
- Credito Gemini restante (con semaforo automatico: verde >30%, amarillo <30%, rojo <10%).

Carga via `google.script.run.apiObtenerKPIs()`.

**`Buscar.html`** — Pantalla 2. Form:
- Input "Que tipo de empresas?" (ej: "panaderias en Bogota").
- Input "Instrucciones extras" (default: "Pequenas y medianas, con presencia web verificable").
- Input numerico "Cantidad maxima" (default 30, min 5, max 200).
- Boton verde "Buscar en internet" con confirmacion.

Despues de buscar, ofrece "Si, conseguir correos" para enriquecer.

**`Respuestas.html`** — Pantalla 3. Select de filtro (interesado / todas / no_interesado / fuera_oficina / spam). Lista de tarjetas con:
- Nombre empresa.
- Fecha.
- Semaforo de clasificacion.
- Resumen IA.
- Correo + telefono.
- Expander "Ver correo completo" (escapado).
- Boton "Marcar como gestionada".

**`Configuracion.html`** — Pantalla 4 (solo Diego). Pantalla 1: PIN 4 digitos. Pantalla 2 (post-PIN):
- Estado servicios (Gemini/Gmail/WhatsApp/hojas) con semaforos.
- Lista de propiedades faltantes (si las hay).
- Recordatorios de seguridad.
- Enlaces a Sheet y editor Apps Script.

### 8.3 Manifiesto

**`appsscript.json`** — `apps_script/appsscript.json`

```json
{
  "timeZone": "America/Bogota",
  "dependencies": {
    "enabledAdvancedServices": [
      { "userSymbol": "Gmail", "version": "v1", "serviceId": "gmail" }
    ]
  },
  "webapp": {
    "executeAs": "USER_DEPLOYING",
    "access": "MYSELF"
  },
  "exceptionLogging": "STACKDRIVER",
  "runtimeVersion": "V8",
  "oauthScopes": [
    "https://www.googleapis.com/auth/script.external_request",
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/gmail.send",
    "https://www.googleapis.com/auth/gmail.modify",
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/script.scriptapp",
    "https://www.googleapis.com/auth/script.send_mail",
    "https://www.googleapis.com/auth/userinfo.email"
  ]
}
```

### 8.4 Servicio Node WhatsApp

**`whatsapp_service/package.json`**

```json
{
  "name": "dotacion-papa-whatsapp",
  "version": "1.0.0",
  "main": "index.js",
  "scripts": { "start": "node index.js" },
  "dependencies": {
    "express": "^4.18.2",
    "whatsapp-web.js": "^1.23.0",
    "qrcode-terminal": "^0.12.0"
  },
  "engines": { "node": ">=18.0.0" }
}
```

**`whatsapp_service/index.js`** — Express + whatsapp-web.js. Endpoints:
- `GET /estado` → `{conectado: bool}`.
- `POST /enviar` body `{numero, mensaje}` → `client.sendMessage(numero@c.us, mensaje)`.

Sesion persistente en `.wwebjs_auth/` (gitignored). Reconexion automatica. Logging a `log.txt`. Puerto configurable via `PUERTO` env var (default 3000).

---

## 9. PLAN DE TRABAJO PARA TERMINAR (instrucciones al usuario, paso a paso)

### Paso 0 - Rotar API key (CRITICO, 1 min)

1. Ir a https://aistudio.google.com/apikey
2. En la clave actual, **Borrar clave** → confirmar.
3. **Crear clave de API** → nueva clave.
4. Guardarla en gestor de contrasenas (no en chat).

### Paso 1 - Abrir el Sheet y crear el proyecto Apps Script (2 min)

1. Abrir https://docs.google.com/spreadsheets/d/197RZZ0-Ys6wFwnZ9y0t3gUBHTws1KbTp-78AASvcfmo/edit
2. Menu superior: `Extensiones > Apps Script`.
3. Se abre pestana nueva con archivo `Codigo.gs` por defecto.
4. Borrar todo el contenido de `Codigo.gs`.

### Paso 2 - Pegar todo el codigo (10 min)

Tres opciones, eliges una:

**Opcion A (mas rapida)** - 1 archivo gigante + 6 HTML:
1. Abrir https://drive.google.com/file/d/1WnTogWGs3FRQv9imgpQsiffJ-NA2Dg2p/view
2. Copiar TODO el contenido del archivo "Codigo.gs (TODO EN UNO)".
3. Pegarlo en el `Codigo.gs` de Apps Script. Ctrl+S.
4. Crear los 6 HTML (click "+" → HTML), nombres exactos sin extension:
   `Estilos`, `Layout`, `Dashboard`, `Buscar`, `Respuestas`, `Configuracion`.
   Copiar el contenido de cada uno desde https://drive.google.com/drive/folders/1MOZpFdjo8mXsITzyIwQ07IC14D6AZW8-

**Opcion B (estructurada)** - 19 archivos separados:
1. Crear cada `.gs` y `.html` en Apps Script con su nombre exacto (sin extension).
2. Copiar/pegar contenido de cada archivo desde la carpeta Drive de arriba.

**Opcion C (con clasp, para Diego tecnico)**:
```bash
git clone https://github.com/jade1010020668/92DF-8334.git
cd 92DF-8334
git checkout claude/create-plan-framework-aDC3Z
cp apps_script/.clasp.json.ejemplo apps_script/.clasp.json
# editar apps_script/.clasp.json con el scriptId
cd apps_script
npm install -g @google/clasp
clasp login
clasp push
```

### Paso 3 - Configurar el manifiesto (1 min)

1. Click en engranaje (Configuracion del proyecto) en la barra lateral.
2. Marcar "Mostrar el archivo de manifiesto `appsscript.json` en el editor".
3. Volver al editor. Aparece `appsscript.json` en la lista de archivos.
4. Reemplazar su contenido con el del archivo del repo o de la carpeta Drive.

### Paso 4 - Configurar los 4 secretos (2 min)

En el editor de Apps Script:

1. Engranaje > "Propiedades del script".
2. "Agregar propiedad de script" por cada uno:

| Clave | Valor |
|---|---|
| `GEMINI_API_KEY` | La clave NUEVA del Paso 0 |
| `WHATSAPP_NUMERO_PAPA` | `+57XXXXXXXXXX` |
| `WHATSAPP_SERVICE_URL` | `http://localhost:3000` (si Node corre local) |
| `CONFIG_PIN` | PIN de 4 digitos (ej: 1234) |

3. Guardar propiedades del script.

### Paso 5 - Inicializar las 7 hojas (1 min)

1. Volver al Sheet (cerrar y reabrir).
2. Esperar a que aparezca el menu "Dotacion Papa" arriba.
3. Click `Dotacion Papa > 1. Inicializar todo (primera vez)`.
4. Aceptar permisos OAuth cuando Google pregunte (Gmail, Sheets, fetch externo).
5. Se crean las 7 hojas + plantilla en Config.

### Paso 6 - Llenar Config (3 min)

Ir a la hoja `Config` (pestana inferior del Sheet) y llenar al menos:

- `empresa.nombre` = nombre comercial real.
- `empresa.productos` = `uniformes|EPP|botas|overoles` (separados con `|`).
- `empresa.telefono_contacto` = `+57XXXXXXXXXX`.
- `empresa.correo_envio` = Gmail del negocio.
- `empresa.nombre_remitente` = nombre que firma los correos.

### Paso 7 - Configurar triggers (30 seg)

Menu `Dotacion Papa > Configurar triggers automaticos`.

Crea:
- Lectura de respuestas cada 60 min.
- Envio del lote a las 08:00 diario.

### Paso 8 - Levantar servicio Node WhatsApp (5 min)

En la PC donde vivira el servicio:

```bash
git clone https://github.com/jade1010020668/92DF-8334.git
cd 92DF-8334/whatsapp_service
npm install
node index.js
```

Aparece un QR. Escanearlo con WhatsApp del PAPA (Dispositivos vinculados).

Si Apps Script no esta en la misma red que la PC del servicio, exponer el puerto 3000 con Tailscale / ngrok / Cloudflare Tunnel. Actualizar `WHATSAPP_SERVICE_URL` en PropertiesService con la URL publica.

### Paso 9 - Desplegar como Web App (1 min)

En el editor de Apps Script:

1. `Implementar > Nueva implementacion`.
2. Tipo: Aplicacion web.
3. Ejecutar como: Yo (Diego).
4. Acceso: "Cualquier persona con el enlace" o "Solo yo".
5. Implementar. Aceptar permisos.
6. Copiar la URL.

### Paso 10 - Smoke test (1 min)

Menu `Dotacion Papa > Verificar instalacion completa (smoke test)`.

Debe mostrar `[OK]` en los 7 chequeos. Si alguno falla, te dice exactamente que arreglar.

### Paso 11 - Entrega al papa (5 min)

1. Pasarle al papa la URL del Paso 9 por WhatsApp.
2. En el celular del papa: Chrome > menu > "Agregar a pantalla de inicio".
3. En el PC: crear acceso directo en escritorio que abra la URL en Chrome.
4. Imprimir `MANUAL_PAPA.md` y dejarselo encima del escritorio.
5. Hacer demo de 15 min: buscar un sector, revisar una respuesta de prueba.

---

## 10. DETALLES DE COMO FUNCIONA CADA FLUJO

### 10.1 Flujo de busqueda

```
Usuario clickea "Buscar" en UI
  → Buscar.html llama apiBuscarEmpresas(sector, instruccion, limite)
    → WebApp.gs llama buscarEmpresasConIA(...)
      → Scraper.gs:
         1. insertarSector() → genera sectorId
         2. pedirEmpresasAGemini_(sector, instruccion, limite)
            → IA.gs llamarGemini('gemini-2.5-pro', prompt, {conGrounding: true, parsearJson: true})
               → POST a generativelanguage.googleapis.com con tools=[google_search]
               → Gemini busca en Google, lee paginas, devuelve JSON {empresas: [...]}
               → Token usage registrado en ConsumoGemini
         3. Por cada empresa candidata:
            - validarEmpresa_(empresa) → UrlFetchApp.fetch sitio_web (200-399 = valida)
            - Si valida: insertarEmpresa(con estado='nueva', sector_id, fuente='gemini_grounding')
            - Si no: descartar
         4. actualizarConteoSector(sectorId, validadas)
         5. registrarLog_ + return {sectorId, encontradas, validadas, descartadas}
  ← UI muestra resultado, ofrece "enriquecer ahora"
```

### 10.2 Flujo de enriquecimiento

```
Usuario clickea "Si, conseguir correos"
  → apiEnriquecerEmpresas(sectorId, 100)
    → enriquecerLote(sectorId, 100)
      → Por cada empresa con estado='nueva' del sector:
         1. traerHtmlSeguro_(sitio_web) + rutas /contacto, /contact, etc.
         2. buscarCorreoEnTexto_(html) → regex con filtro de basura
         3. Si no hay match regex y hay HTML: extraerCorreoDeHtml(html) con Gemini Flash
         4. evaluarProspecto(empresa) con Gemini Flash → si confianza < 0.7, revalida con Pro
         5. Set estado:
            - 'descartada' si IA dice !esProspecto con confianza > 0.6
            - 'sin_correo' si no se encontro correo
            - 'enriquecida' con correo + notas_ia si todo bien
         6. Utilities.sleep(500) entre cada una
      ← return {procesadas, conCorreo, sinCorreo, descartadas}
```

### 10.3 Flujo de envio diario

```
Trigger jobEnviarLote() se dispara a las 08:00
  → enviarLoteDelDia()
     1. Lee Config: max=30, pausa=90s
     2. correosEnviadosHoy_() para no exceder cuota
     3. listarEmpresasPorEstado('enriquecida', restantes)
     4. Por cada:
        - leerPlantillaCotizacion_() con valores de Config
        - redactarCotizacion(empresa, plantilla) con Gemini Pro → {asunto, cuerpo}
        - generarMensajeId_() → '<uuid@dominio>'
        - GmailApp.sendEmail(to, asunto, cuerpo, {name, replyTo, headers: {Message-ID, X-Dotacion-Origen}})
        - insertarCorreoEnviado(...) con mensaje_id para tracking de respuestas
        - actualizarEstadoEmpresa(id, 'contactada')
        - Utilities.sleep(90 * 1000) entre envios
     5. registrarLog_ + return {intentadas, enviadas, fallidas}
```

### 10.4 Flujo de lectura de respuestas + notificacion WhatsApp

```
Trigger jobLeerRespuestas() se dispara cada 60 min
  → leerRespuestas()
     1. GmailApp.search('from:me after:hace3dias', 0, 50)
     2. Por cada hilo con >=2 mensajes:
        - Extraer In-Reply-To y References del raw del ultimo mensaje
        - buscarCorreoPorMensajeId(ids) en hoja CorreosEnviados
        - Si match y no es duplicado:
          - clasificarRespuesta(cuerpo) con Gemini Pro → {categoria, resumen}
          - insertarRespuesta(...)
          - actualizarEstadoEmpresa(empresa_id, 'respondio')
     3. return {nuevasRespuestas}

  → Si nuevasRespuestas > 0:
     → notificarPendientes()
        1. respuestasNoNotificadas() filtra clasificacion='interesado' y notificada_whatsapp!='true'
        2. Por cada:
           - obtenerEmpresa(empresa_id)
           - formatearMensaje_(empresa, respuesta) → texto WhatsApp
           - enviarMensajeWhatsApp_(mensaje)
             → POST {WHATSAPP_SERVICE_URL}/enviar body {numero, mensaje}
             → Servicio Node hace client.sendMessage(numero@c.us, mensaje)
           - marcarNotificadaWhatsapp(respuesta.id)
```

---

## 11. CONTENIDO DE ARCHIVOS CRITICOS (resumen rapido)

Si abres el repo, estos son los archivos importantes y donde estan:

- `apps_script/Config.gs` — 124 lineas, secretos + helpers
- `apps_script/Inicializar.gs` — 146 lineas, crea hojas
- `apps_script/Sheets.gs` — 315 lineas, CRUD
- `apps_script/IA.gs` — 313 lineas, Gemini client
- `apps_script/Scraper.gs` — 163 lineas, busqueda con grounding
- `apps_script/Enriquecer.gs` — 164 lineas, web fetch + IA
- `apps_script/Correos.gs` — 213 lineas, Gmail send + read
- `apps_script/WhatsApp.gs` — 87 lineas, HTTP al Node service
- `apps_script/Scheduler.gs` — 76 lineas, triggers
- `apps_script/Menu.gs` — 109 lineas, menu del Sheet
- `apps_script/WebApp.gs` — 130 lineas, doGet + endpoints
- `apps_script/VerificarInstalacion.gs` — 131 lineas, smoke test
- `apps_script/appsscript.json` — 28 lineas, manifiesto
- `apps_script/Estilos.html` — CSS
- `apps_script/Layout.html` — header + nav
- `apps_script/Dashboard.html` — pantalla 1
- `apps_script/Buscar.html` — pantalla 2
- `apps_script/Respuestas.html` — pantalla 3
- `apps_script/Configuracion.html` — pantalla 4
- `whatsapp_service/index.js` — Express + whatsapp-web.js
- `whatsapp_service/package.json` — deps
- `MANUAL_PAPA.md` — manual del papa
- `README.md` — readme proyecto
- `apps_script/README.md` — instrucciones despliegue

---

## 12. TROUBLESHOOTING

**"Faltan propiedades" en smoke test**
→ Apps Script > engranaje > Propiedades del script. Verificar las 4.

**"No se encontro la hoja X"**
→ Menu del Sheet > Dotacion Papa > Inicializar todo.

**"Gemini devolvio 403 / 401"**
→ La API key esta mal o vencida. Rotar en aistudio.google.com/apikey y actualizar PropertiesService.

**"Gemini devolvio 429"**
→ Rate limit. Esperar 1 min y reintentar. El cliente ya tiene retry exponencial.

**"Servicio WhatsApp no conectado"**
→ Verificar que `node index.js` siga corriendo en la PC.
→ `curl http://localhost:3000/estado` debe devolver `{"conectado":true}`.

**"WhatsApp pide QR de nuevo"**
→ Borrar `whatsapp_service/.wwebjs_auth/` y volver a `node index.js`.

**"Algo salio mal" en UI**
→ Apps Script > Ver > Ejecuciones (Executions). Ver el stack trace.
→ Tambien la hoja Logs tiene los errores.

**Credito Gemini se esta acabando**
→ Dashboard muestra el medidor.
→ Cuando llegue a < 10%, en hoja Config setear `ia.forzar_flash = true`. El sistema cae al tier gratis de Flash.

**Apps Script timeout de 6 minutos**
→ Reducir el `limite` en enriquecerLote (default 50). O dejar que el trigger procese por lotes.

---

## 13. ROADMAP FUTURO (V2, fuera de scope actual)

Lo que NO esta en V1:
- Multiusuario (varios vendedores).
- Integracion con CRM (HubSpot, Salesforce).
- Dashboard de conversion (cuantos contactados → vendieron).
- WhatsApp bidireccional (el papa responde por WhatsApp y se guarda).
- PDFs de cotizacion con precios (hoy solo correos).
- Multiples ciudades (hoy hardcodeado a Bogota en Config).
- A/B testing de plantillas de correo.
- Dashboard de costo Gemini por sector/empresa.

---

## 14. CONTACTOS Y REFERENCIAS

**Cuenta Google del proyecto:** morales.1010020668@gmail.com

**GitHub:**
- Repo: https://github.com/jade1010020668/92DF-8334
- PR (draft): https://github.com/jade1010020668/92DF-8334/pull/1
- Rama: `claude/create-plan-framework-aDC3Z`

**Documentacion oficial relevante:**
- Apps Script: https://developers.google.com/apps-script
- Gemini API: https://ai.google.dev/gemini-api/docs
- whatsapp-web.js: https://wwebjs.dev
- HtmlService: https://developers.google.com/apps-script/guides/html

---

## 15. PROXIMO PASO INMEDIATO

Si estas en Claude Code local con este repo:

1. **No reinventes nada.** El codigo esta completo. No reescribir archivos.
2. **No commitear secretos.** `git grep AIza` debe devolver vacio antes de cada commit.
3. **No tocar `src/`, `tests/`, `db/`, `plantillas/`, `requirements.txt`** — son del plan Python archivado.
4. **Trabajar solo en `apps_script/` y `whatsapp_service/`** si hay cambios.
5. **Si el usuario te pide "implementarlo"**: explicar que la instalacion final requiere acciones manuales del dueno de la cuenta Google (clicks en Apps Script). No hay forma de saltarse eso desde codigo.

Si el usuario reporta un bug o quiere una mejora:
- Editar el archivo correspondiente en `apps_script/`.
- Commit en rama `claude/create-plan-framework-aDC3Z`.
- Push.
- Actualizar el PR #1.
- Re-subir el archivo modificado al Drive (carpeta `1MOZpFdjo8mXsITzyIwQ07IC14D6AZW8-`) si Diego ya no tiene clasp configurado.

FIN DEL DOCUMENTO MAESTRO.


---

# APENDICE: CODIGO COMPLETO DE TODOS LOS ARCHIVOS

> A partir de aqui esta el contenido literal de cada archivo del proyecto.
> Si Claude Code local no tiene el repo, puede recrearlo desde estos bloques.
> Si tiene el repo, esto sirve como referencia rapida sin abrir archivos.


## apps_script/Config.gs

```javascript
/**
 * Config.gs - Lectura de secretos y configuracion del negocio.
 *
 * Los secretos viven en PropertiesService (visibles solo para el dueno del
 * script, NUNCA en el codigo fuente). La config del negocio vive en la hoja
 * "Config" del Sheet (editable por Diego sin tocar codigo).
 */

const NOMBRES_HOJAS = {
  SECTORES: 'Sectores',
  EMPRESAS: 'Empresas',
  CORREOS: 'CorreosEnviados',
  RESPUESTAS: 'Respuestas',
  CONFIG: 'Config',
  LOGS: 'Logs',
  CONSUMO_GEMINI: 'ConsumoGemini',
};

const PROPIEDADES_REQUERIDAS = [
  'GEMINI_API_KEY',
  'WHATSAPP_NUMERO_PAPA',
  'WHATSAPP_SERVICE_URL',
  'CONFIG_PIN',
];

/**
 * Lee un secreto del PropertiesService. Lanza si no esta configurado.
 */
function leerSecreto(clave) {
  const valor = PropertiesService.getScriptProperties().getProperty(clave);
  if (!valor) {
    throw new Error(
      'Falta la propiedad "' + clave + '". Configurala en: Apps Script > ' +
      'Configuracion del proyecto > Propiedades del script.'
    );
  }
  return valor;
}

/**
 * Lee un secreto opcional. Devuelve null si no esta.
 */
function leerSecretoOpcional(clave) {
  return PropertiesService.getScriptProperties().getProperty(clave) || null;
}

/**
 * Devuelve un objeto con toda la config del negocio leida de la hoja "Config".
 *
 * Formato de la hoja Config:
 *   Columna A: clave  (ej. "empresa.nombre")
 *   Columna B: valor  (ej. "Dotacion Lopez")
 *   Columna C: descripcion (libre, para Diego)
 */
function leerConfig() {
  const hoja = abrirHoja_(NOMBRES_HOJAS.CONFIG);
  const filas = hoja.getDataRange().getValues();
  const config = {};
  for (let i = 1; i < filas.length; i++) {
    const clave = String(filas[i][0] || '').trim();
    const valor = filas[i][1];
    if (!clave) continue;
    config[clave] = valor;
  }
  return config;
}

function leerConfigValor(clave, porDefecto) {
  const config = leerConfig();
  return config[clave] !== undefined && config[clave] !== '' ? config[clave] : porDefecto;
}

/**
 * Verifica que todas las propiedades requeridas esten configuradas y
 * devuelve un reporte para la pantalla de Configuracion.
 */
function verificarConfiguracion() {
  const faltantes = [];
  for (const clave of PROPIEDADES_REQUERIDAS) {
    if (!leerSecretoOpcional(clave)) {
      faltantes.push(clave);
    }
  }
  let hojaConfigExiste = false;
  try {
    abrirHoja_(NOMBRES_HOJAS.CONFIG);
    hojaConfigExiste = true;
  } catch (e) {
    // no existe
  }
  return {
    propiedadesFaltantes: faltantes,
    hojaConfigExiste: hojaConfigExiste,
    listo: faltantes.length === 0 && hojaConfigExiste,
  };
}

/**
 * Helper interno para abrir una hoja por nombre.
 */
function abrirHoja_(nombre) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const hoja = ss.getSheetByName(nombre);
  if (!hoja) {
    throw new Error(
      'No se encontro la hoja "' + nombre + '". Ejecuta inicializarTodo() ' +
      'desde el menu Dotacion Papa para crear las hojas.'
    );
  }
  return hoja;
}
```

## apps_script/Inicializar.gs

```javascript
/**
 * Inicializar.gs - Crea las hojas con sus encabezados la primera vez.
 *
 * Diego corre esto UNA SOLA VEZ:
 *   1. Abre el Sheet recien creado.
 *   2. Menu: Dotacion Papa > Inicializar todo.
 *
 * El script crea (o reusa si ya existen) las 7 hojas con sus columnas
 * y deja la hoja Config con valores de ejemplo.
 */

const ESQUEMA_HOJAS = {
  Sectores: [
    'id',
    'nombre',
    'palabras_clave',
    'fecha_busqueda',
    'total_empresas_encontradas',
  ],
  Empresas: [
    'id',
    'nombre',
    'sector_id',
    'direccion',
    'telefono',
    'sitio_web',
    'correo',
    'ciudad',
    'fuente',
    'validada_por_ia',
    'notas_ia',
    'estado',
    'fecha_creacion',
  ],
  CorreosEnviados: [
    'id',
    'empresa_id',
    'asunto',
    'cuerpo',
    'fecha_envio',
    'estado_envio',
    'mensaje_id',
  ],
  Respuestas: [
    'id',
    'correo_enviado_id',
    'empresa_id',
    'asunto',
    'cuerpo',
    'fecha_recepcion',
    'clasificacion_ia',
    'resumen_ia',
    'notificada_whatsapp',
  ],
  Config: ['clave', 'valor', 'descripcion'],
  Logs: ['timestamp', 'nivel', 'modulo', 'mensaje'],
  ConsumoGemini: [
    'timestamp',
    'modelo',
    'tokens_in',
    'tokens_out',
    'costo_usd',
    'modulo',
  ],
};

const CONFIG_INICIAL = [
  ['empresa.nombre', '', 'Nombre comercial de la empresa de dotacion'],
  ['empresa.productos', '', 'Productos separados por "|" - ej: uniformes|EPP|botas'],
  ['empresa.ciudad', 'Bogota', 'Ciudad base (no cambiar salvo expansion)'],
  ['empresa.telefono_contacto', '', 'Telefono del papa con codigo de pais'],
  ['empresa.correo_envio', '', 'Gmail desde el que se envian cotizaciones'],
  ['empresa.nombre_remitente', '', 'Nombre completo que firma los correos'],
  ['limites.correos_max_dia', 30, 'Maximo de correos por dia'],
  ['limites.pausa_entre_correos_seg', 90, 'Pausa entre envios consecutivos'],
  ['limites.empresas_max_busqueda', 300, 'Maximo de empresas por busqueda'],
  ['ia.modelo_pro', 'gemini-2.5-pro', 'Modelo para tareas sensibles'],
  ['ia.modelo_flash', 'gemini-2.5-flash', 'Modelo para tareas masivas'],
  ['ia.forzar_flash', false, 'true cuando se agoten los creditos'],
  ['ia.saldo_inicial_usd', 250, 'Credito prepago disponible al inicio'],
  ['scheduler.hora_envio', '08:00', 'Hora local de envio del lote diario'],
  ['scheduler.intervalo_lectura_min', 60, 'Cada cuantos minutos lee respuestas'],
];

/**
 * Punto de entrada principal. Llamado desde el menu.
 */
function inicializarTodo() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const creadas = [];
  const existentes = [];

  for (const nombre in ESQUEMA_HOJAS) {
    let hoja = ss.getSheetByName(nombre);
    if (!hoja) {
      hoja = ss.insertSheet(nombre);
      creadas.push(nombre);
    } else {
      existentes.push(nombre);
    }
    aplicarEncabezados_(hoja, ESQUEMA_HOJAS[nombre]);
  }

  // Llenar la hoja Config con plantilla si esta vacia
  const hojaConfig = ss.getSheetByName('Config');
  if (hojaConfig.getLastRow() <= 1) {
    hojaConfig.getRange(2, 1, CONFIG_INICIAL.length, 3).setValues(CONFIG_INICIAL);
  }

  // Borrar la hoja por defecto "Hoja 1" / "Sheet1" si todavia existe
  const hojaDefault = ss.getSheetByName('Hoja 1') || ss.getSheetByName('Sheet1');
  if (hojaDefault && ss.getSheets().length > 1) {
    ss.deleteSheet(hojaDefault);
  }

  registrarLog_('INFO', 'Inicializar', 'Hojas creadas: ' + creadas.join(', ') +
    '; reusadas: ' + existentes.join(', '));

  SpreadsheetApp.getUi().alert(
    'Listo. Hojas creadas: ' + creadas.length +
    '. Reusadas: ' + existentes.length + '.\n\n' +
    'Siguiente paso:\n' +
    '1. Llena la hoja Config con los datos de la empresa.\n' +
    '2. Abre Configuracion del proyecto > Propiedades del script y agrega:\n' +
    '   - GEMINI_API_KEY\n' +
    '   - WHATSAPP_NUMERO_PAPA\n' +
    '   - WHATSAPP_SERVICE_URL\n' +
    '   - CONFIG_PIN\n' +
    '3. Despliega como aplicacion web desde el menu Implementar.'
  );
}

function aplicarEncabezados_(hoja, encabezados) {
  const filaActual = hoja.getRange(1, 1, 1, hoja.getMaxColumns()).getValues()[0];
  const hayEncabezadosCorrectos = encabezados.every(function (col, i) {
    return filaActual[i] === col;
  });
  if (!hayEncabezadosCorrectos) {
    hoja.getRange(1, 1, 1, encabezados.length)
        .setValues([encabezados])
        .setFontWeight('bold')
        .setBackground('#1f6feb')
        .setFontColor('#ffffff');
    hoja.setFrozenRows(1);
  }
}
```

## apps_script/Sheets.gs

```javascript
/**
 * Sheets.gs - Capa de acceso a las hojas como si fueran tablas.
 *
 * Cada funcion recibe/devuelve objetos planos. Las hojas usan la primera fila
 * como encabezados; ese array determina el orden de columnas al escribir.
 */

const ESTADOS_EMPRESA_VALIDOS = [
  'nueva',
  'enriquecida',
  'sin_correo',
  'contactada',
  'respondio',
  'descartada',
];

const CATEGORIAS_RESPUESTA_VALIDAS = [
  'interesado',
  'no_interesado',
  'fuera_oficina',
  'spam',
  'sin_clasificar',
];

// ============================================================
// Helpers internos
// ============================================================

function leerEncabezados_(hoja) {
  const ultima = Math.max(hoja.getLastColumn(), 1);
  return hoja.getRange(1, 1, 1, ultima).getValues()[0];
}

function filaAObjeto_(encabezados, fila) {
  const obj = {};
  for (let i = 0; i < encabezados.length; i++) {
    obj[encabezados[i]] = fila[i];
  }
  return obj;
}

function objetoAFila_(encabezados, obj) {
  const fila = [];
  for (let i = 0; i < encabezados.length; i++) {
    const valor = obj[encabezados[i]];
    fila.push(valor === undefined ? '' : valor);
  }
  return fila;
}

function siguienteId_(hoja) {
  const ultimaFila = hoja.getLastRow();
  if (ultimaFila < 2) return 1;
  const ids = hoja.getRange(2, 1, ultimaFila - 1, 1).getValues();
  let max = 0;
  for (const fila of ids) {
    const n = parseInt(fila[0], 10);
    if (!isNaN(n) && n > max) max = n;
  }
  return max + 1;
}

function leerTodo_(nombreHoja) {
  const hoja = abrirHoja_(nombreHoja);
  const ultimaFila = hoja.getLastRow();
  if (ultimaFila < 2) return [];
  const encabezados = leerEncabezados_(hoja);
  const filas = hoja.getRange(2, 1, ultimaFila - 1, encabezados.length).getValues();
  return filas.map(function (f) {
    return filaAObjeto_(encabezados, f);
  });
}

function insertarFila_(nombreHoja, objeto) {
  const hoja = abrirHoja_(nombreHoja);
  const encabezados = leerEncabezados_(hoja);
  if (objeto.id === undefined || objeto.id === '' || objeto.id === null) {
    objeto.id = siguienteId_(hoja);
  }
  const fila = objetoAFila_(encabezados, objeto);
  hoja.appendRow(fila);
  return objeto.id;
}

function actualizarFila_(nombreHoja, id, cambios) {
  const hoja = abrirHoja_(nombreHoja);
  const ultimaFila = hoja.getLastRow();
  if (ultimaFila < 2) return false;
  const encabezados = leerEncabezados_(hoja);
  const datos = hoja.getRange(2, 1, ultimaFila - 1, encabezados.length).getValues();
  for (let i = 0; i < datos.length; i++) {
    if (parseInt(datos[i][0], 10) === parseInt(id, 10)) {
      const objeto = filaAObjeto_(encabezados, datos[i]);
      for (const clave in cambios) {
        objeto[clave] = cambios[clave];
      }
      const filaActualizada = objetoAFila_(encabezados, objeto);
      hoja.getRange(i + 2, 1, 1, encabezados.length).setValues([filaActualizada]);
      return true;
    }
  }
  return false;
}

function buscarFila_(nombreHoja, predicado) {
  const todos = leerTodo_(nombreHoja);
  for (const obj of todos) {
    if (predicado(obj)) return obj;
  }
  return null;
}

// ============================================================
// SECTORES
// ============================================================

function insertarSector(sector) {
  return insertarFila_(NOMBRES_HOJAS.SECTORES, {
    id: '',
    nombre: sector.nombre,
    palabras_clave: sector.palabras_clave,
    fecha_busqueda: new Date(),
    total_empresas_encontradas: sector.total_empresas_encontradas || 0,
  });
}

function listarSectores() {
  return leerTodo_(NOMBRES_HOJAS.SECTORES);
}

function actualizarConteoSector(sectorId, total) {
  return actualizarFila_(NOMBRES_HOJAS.SECTORES, sectorId, {
    total_empresas_encontradas: total,
  });
}

// ============================================================
// EMPRESAS
// ============================================================

function insertarEmpresa(empresa) {
  if (empresa.estado && ESTADOS_EMPRESA_VALIDOS.indexOf(empresa.estado) === -1) {
    throw new Error('Estado de empresa invalido: ' + empresa.estado);
  }
  const existente = buscarEmpresaPorNombreDireccion(empresa.nombre, empresa.direccion);
  if (existente) return null;

  return insertarFila_(NOMBRES_HOJAS.EMPRESAS, {
    id: '',
    nombre: empresa.nombre,
    sector_id: empresa.sector_id || '',
    direccion: empresa.direccion || '',
    telefono: empresa.telefono || '',
    sitio_web: empresa.sitio_web || '',
    correo: empresa.correo || '',
    ciudad: empresa.ciudad || 'Bogota',
    fuente: empresa.fuente || '',
    validada_por_ia: empresa.validada_por_ia ? 'true' : 'false',
    notas_ia: empresa.notas_ia || '',
    estado: empresa.estado || 'nueva',
    fecha_creacion: new Date(),
  });
}

function buscarEmpresaPorNombreDireccion(nombre, direccion) {
  return buscarFila_(NOMBRES_HOJAS.EMPRESAS, function (e) {
    return String(e.nombre).toLowerCase() === String(nombre).toLowerCase() &&
           String(e.direccion || '') === String(direccion || '');
  });
}

function obtenerEmpresa(empresaId) {
  return buscarFila_(NOMBRES_HOJAS.EMPRESAS, function (e) {
    return parseInt(e.id, 10) === parseInt(empresaId, 10);
  });
}

function listarEmpresasPorEstado(estado, limite) {
  if (ESTADOS_EMPRESA_VALIDOS.indexOf(estado) === -1) {
    throw new Error('Estado invalido: ' + estado);
  }
  const todas = leerTodo_(NOMBRES_HOJAS.EMPRESAS).filter(function (e) {
    return e.estado === estado;
  });
  todas.sort(function (a, b) {
    return new Date(b.fecha_creacion) - new Date(a.fecha_creacion);
  });
  return limite ? todas.slice(0, limite) : todas;
}

function actualizarEstadoEmpresa(empresaId, estado) {
  if (ESTADOS_EMPRESA_VALIDOS.indexOf(estado) === -1) {
    throw new Error('Estado invalido: ' + estado);
  }
  return actualizarFila_(NOMBRES_HOJAS.EMPRESAS, empresaId, { estado: estado });
}

function actualizarEmpresaEnriquecida(empresaId, correo, validadaPorIa, notasIa, estado) {
  if (ESTADOS_EMPRESA_VALIDOS.indexOf(estado) === -1) {
    throw new Error('Estado invalido: ' + estado);
  }
  return actualizarFila_(NOMBRES_HOJAS.EMPRESAS, empresaId, {
    correo: correo || '',
    validada_por_ia: validadaPorIa ? 'true' : 'false',
    notas_ia: notasIa || '',
    estado: estado,
  });
}

// ============================================================
// CORREOS ENVIADOS
// ============================================================

function insertarCorreoEnviado(correo) {
  return insertarFila_(NOMBRES_HOJAS.CORREOS, {
    id: '',
    empresa_id: correo.empresa_id,
    asunto: correo.asunto,
    cuerpo: correo.cuerpo,
    fecha_envio: new Date(),
    estado_envio: correo.estado_envio || 'enviado',
    mensaje_id: correo.mensaje_id,
  });
}

function buscarCorreoPorMensajeId(mensajeId) {
  return buscarFila_(NOMBRES_HOJAS.CORREOS, function (c) {
    return c.mensaje_id === mensajeId;
  });
}

function marcarEnvioFallo(correoId) {
  return actualizarFila_(NOMBRES_HOJAS.CORREOS, correoId, { estado_envio: 'fallo' });
}

function correosEnviadosUltimaSemana() {
  const hace7dias = new Date();
  hace7dias.setDate(hace7dias.getDate() - 7);
  return leerTodo_(NOMBRES_HOJAS.CORREOS).filter(function (c) {
    return c.fecha_envio && new Date(c.fecha_envio) >= hace7dias;
  }).length;
}

// ============================================================
// RESPUESTAS
// ============================================================

function insertarRespuesta(respuesta) {
  if (CATEGORIAS_RESPUESTA_VALIDAS.indexOf(respuesta.clasificacion_ia) === -1) {
    throw new Error('Categoria de respuesta invalida: ' + respuesta.clasificacion_ia);
  }
  return insertarFila_(NOMBRES_HOJAS.RESPUESTAS, {
    id: '',
    correo_enviado_id: respuesta.correo_enviado_id,
    empresa_id: respuesta.empresa_id,
    asunto: respuesta.asunto || '',
    cuerpo: respuesta.cuerpo || '',
    fecha_recepcion: new Date(),
    clasificacion_ia: respuesta.clasificacion_ia,
    resumen_ia: respuesta.resumen_ia || '',
    notificada_whatsapp: respuesta.notificada_whatsapp ? 'true' : 'false',
  });
}

function marcarNotificadaWhatsapp(respuestaId) {
  return actualizarFila_(NOMBRES_HOJAS.RESPUESTAS, respuestaId, {
    notificada_whatsapp: 'true',
  });
}

function respuestasNoNotificadas() {
  return leerTodo_(NOMBRES_HOJAS.RESPUESTAS).filter(function (r) {
    return String(r.notificada_whatsapp) !== 'true' &&
           r.clasificacion_ia === 'interesado';
  });
}

function respuestasNoLeidas() {
  return leerTodo_(NOMBRES_HOJAS.RESPUESTAS).filter(function (r) {
    return String(r.notificada_whatsapp) !== 'true';
  }).length;
}

// ============================================================
// KPIs DASHBOARD
// ============================================================

function contarEmpresasPorEstado() {
  const empresas = leerTodo_(NOMBRES_HOJAS.EMPRESAS);
  const conteo = {};
  for (const e of empresas) {
    conteo[e.estado] = (conteo[e.estado] || 0) + 1;
  }
  return conteo;
}

function totalEmpresas() {
  const hoja = abrirHoja_(NOMBRES_HOJAS.EMPRESAS);
  return Math.max(0, hoja.getLastRow() - 1);
}

// ============================================================
// LOG INTERNO
// ============================================================

function registrarLog_(nivel, modulo, mensaje) {
  try {
    const hoja = abrirHoja_(NOMBRES_HOJAS.LOGS);
    hoja.appendRow([new Date(), nivel, modulo, mensaje]);
  } catch (e) {
    // Si la hoja no existe todavia (primera ejecucion), caer en Logger
    Logger.log(nivel + ' | ' + modulo + ' | ' + mensaje);
  }
}
```

## apps_script/IA.gs

```javascript
/**
 * IA.gs - Cliente Gemini (Pro + Flash + grounding con Google Search).
 *
 * - Usa PropertiesService para la API key (nunca embebida en codigo).
 * - Pro: redaccion de cotizaciones, clasificacion de respuestas.
 * - Flash: extraccion masiva de correos, evaluacion de prospectos.
 * - Grounding: scraping de empresas via google_search tool.
 * - Logging de tokens y costo en la hoja ConsumoGemini.
 */

const GEMINI_BASE_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/';

/**
 * Llama a Gemini con manejo de retry, parseo tolerante y logging.
 *
 * @param {string} modelo - "gemini-2.5-pro" o "gemini-2.5-flash"
 * @param {string} prompt - texto del prompt
 * @param {Object} opciones - { conGrounding: bool, jsonSchema: object|null, modulo: string }
 * @return {Object} { texto: string, json: object|null, tokensIn: number, tokensOut: number }
 */
function llamarGemini(modelo, prompt, opciones) {
  opciones = opciones || {};
  const apiKey = leerSecreto('GEMINI_API_KEY');
  const config = leerConfig();
  const forzarFlash = String(config['ia.forzar_flash']) === 'true';

  let modeloEfectivo = modelo;
  if (forzarFlash && modelo === 'gemini-2.5-pro') {
    modeloEfectivo = config['ia.modelo_flash'] || 'gemini-2.5-flash';
  }

  const url = GEMINI_BASE_URL + modeloEfectivo + ':generateContent?key=' +
              encodeURIComponent(apiKey);

  const body = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.2 },
  };

  if (opciones.conGrounding) {
    body.tools = [{ google_search: {} }];
  }

  if (opciones.jsonSchema) {
    body.generationConfig.responseMimeType = 'application/json';
    body.generationConfig.responseSchema = opciones.jsonSchema;
  }

  let respuesta;
  let intento = 0;
  const maxIntentos = 3;

  while (intento < maxIntentos) {
    intento++;
    try {
      const r = UrlFetchApp.fetch(url, {
        method: 'post',
        contentType: 'application/json',
        payload: JSON.stringify(body),
        muteHttpExceptions: true,
      });
      const codigo = r.getResponseCode();
      if (codigo === 200) {
        respuesta = JSON.parse(r.getContentText());
        break;
      }
      if (codigo === 429 || codigo === 503) {
        Utilities.sleep(Math.pow(2, intento) * 1000);
        continue;
      }
      throw new Error('Gemini devolvio ' + codigo + ': ' +
                      r.getContentText().substring(0, 300));
    } catch (err) {
      if (intento >= maxIntentos) {
        registrarLog_('ERROR', opciones.modulo || 'IA',
          'Fallo Gemini despues de ' + intento + ' intentos: ' + err);
        throw err;
      }
      Utilities.sleep(Math.pow(2, intento) * 1000);
    }
  }

  const candidato = respuesta.candidates && respuesta.candidates[0];
  if (!candidato || !candidato.content || !candidato.content.parts) {
    throw new Error('Respuesta de Gemini sin contenido');
  }

  let texto = '';
  for (const parte of candidato.content.parts) {
    if (parte.text) texto += parte.text;
  }

  const usage = respuesta.usageMetadata || {};
  const tokensIn = usage.promptTokenCount || 0;
  const tokensOut = usage.candidatesTokenCount || 0;

  registrarConsumoGemini_(modeloEfectivo, tokensIn, tokensOut,
                          opciones.modulo || 'desconocido');

  let json = null;
  if (opciones.jsonSchema || opciones.parsearJson) {
    json = parsearJsonTolerante_(texto);
  }

  return {
    texto: texto,
    json: json,
    tokensIn: tokensIn,
    tokensOut: tokensOut,
    modelo: modeloEfectivo,
  };
}

/**
 * Extrae el primer bloque JSON valido del texto. Tolera markdown.
 */
function parsearJsonTolerante_(texto) {
  if (!texto) return null;
  // Quitar bloques de markdown ```json ... ```
  const sinMarkdown = texto.replace(/```json\s*/g, '').replace(/```/g, '').trim();
  try {
    return JSON.parse(sinMarkdown);
  } catch (e1) {
    // Intentar extraer el primer {...} o [...] del texto
    const matches = sinMarkdown.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    if (matches) {
      try {
        return JSON.parse(matches[1]);
      } catch (e2) {
        return null;
      }
    }
    return null;
  }
}

/**
 * Registra el consumo en la hoja ConsumoGemini para monitoreo de creditos.
 */
function registrarConsumoGemini_(modelo, tokensIn, tokensOut, modulo) {
  const config = leerConfig();
  let costoUsd = 0;
  if (modelo.indexOf('pro') !== -1) {
    costoUsd = (tokensIn / 1e6) * 1.25 + (tokensOut / 1e6) * 5.00;
  } else {
    costoUsd = (tokensIn / 1e6) * 0.10 + (tokensOut / 1e6) * 0.40;
  }
  try {
    const hoja = abrirHoja_(NOMBRES_HOJAS.CONSUMO_GEMINI);
    hoja.appendRow([new Date(), modelo, tokensIn, tokensOut, costoUsd, modulo]);
  } catch (e) {
    Logger.log('No se pudo registrar consumo: ' + e);
  }
}

// ============================================================
// API PUBLICA DE ALTO NIVEL
// ============================================================

/**
 * Extrae el correo de contacto de un bloque de HTML.
 * Usa Flash (alto volumen, tarea simple).
 */
function extraerCorreoDeHtml(html) {
  const htmlRecortado = (html || '').substring(0, 30000);
  const prompt =
    'Extrae el correo electronico de contacto principal de esta pagina web. ' +
    'Si hay varios, devuelve el que parezca de comercial/ventas/contacto, ' +
    'no de soporte tecnico ni de webmaster.\n\n' +
    'Devuelve SOLO un JSON con esta forma exacta:\n' +
    '{"correo": "ejemplo@empresa.com" | null, "confianza": 0.0-1.0}\n\n' +
    'HTML:\n' + htmlRecortado;

  const config = leerConfig();
  const modelo = config['ia.modelo_flash'] || 'gemini-2.5-flash';
  const resultado = llamarGemini(modelo, prompt, {
    parsearJson: true,
    modulo: 'enriquecer.extraer_correo',
  });
  if (resultado.json && resultado.json.correo) {
    return {
      correo: String(resultado.json.correo).toLowerCase().trim(),
      confianza: parseFloat(resultado.json.confianza) || 0,
    };
  }
  return { correo: null, confianza: 0 };
}

/**
 * Evalua si una empresa encaja como prospecto de dotacion.
 * Usa Flash; si la confianza es baja, re-valida con Pro.
 */
function evaluarProspecto(empresa) {
  const config = leerConfig();
  const productos = String(config['empresa.productos'] || '').split('|')
    .map(function (s) { return s.trim(); }).filter(Boolean);

  const prompt =
    'Eres asesor comercial de una empresa de dotacion en Bogota que vende: ' +
    productos.join(', ') + '.\n\n' +
    'Evalua si esta empresa es un buen prospecto. Considera tamano probable, ' +
    'sector, y si tipicamente compraria dotacion industrial.\n\n' +
    'Empresa:\n' + JSON.stringify({
      nombre: empresa.nombre,
      direccion: empresa.direccion,
      sitio_web: empresa.sitio_web,
      telefono: empresa.telefono,
    }, null, 2) + '\n\n' +
    'Devuelve SOLO un JSON:\n' +
    '{"es_prospecto": true|false, "razon": "...", "tamano_estimado": "pequena|mediana|grande", "confianza": 0.0-1.0}';

  const modeloFlash = config['ia.modelo_flash'] || 'gemini-2.5-flash';
  let resultado = llamarGemini(modeloFlash, prompt, {
    parsearJson: true,
    modulo: 'enriquecer.evaluar',
  });

  if (resultado.json && parseFloat(resultado.json.confianza) < 0.7 &&
      String(config['ia.forzar_flash']) !== 'true') {
    const modeloPro = config['ia.modelo_pro'] || 'gemini-2.5-pro';
    resultado = llamarGemini(modeloPro, prompt, {
      parsearJson: true,
      modulo: 'enriquecer.evaluar.revalidacion_pro',
    });
  }

  if (resultado.json) {
    return {
      esProspecto: Boolean(resultado.json.es_prospecto),
      razon: String(resultado.json.razon || ''),
      tamanoEstimado: String(resultado.json.tamano_estimado || 'desconocido'),
      confianza: parseFloat(resultado.json.confianza) || 0,
    };
  }
  return { esProspecto: false, razon: 'Sin respuesta de IA', tamanoEstimado: 'desconocido', confianza: 0 };
}

/**
 * Redacta una cotizacion personalizada para una empresa.
 * Usa Pro (calidad importa).
 */
function redactarCotizacion(empresa, plantilla) {
  const config = leerConfig();
  const productos = String(config['empresa.productos'] || '').split('|')
    .map(function (s) { return s.trim(); }).filter(Boolean);

  const prompt =
    'Eres el encargado comercial de una empresa de dotacion en Bogota llamada "' +
    (config['empresa.nombre'] || '') + '". ' +
    'Vendes: ' + productos.join(', ') + '. ' +
    'Tu telefono es ' + (config['empresa.telefono_contacto'] || '') + '.\n\n' +
    'Redacta un correo de prospeccion breve, profesional, en espanol colombiano, ' +
    'dirigido a esta empresa, basandote en la plantilla y personalizando solo ' +
    'el saludo y la primera linea segun el sector de la empresa.\n\n' +
    'Empresa destino:\n' + JSON.stringify({
      nombre: empresa.nombre,
      sector: empresa.notas_ia || '',
    }, null, 2) + '\n\n' +
    'Plantilla:\n' + plantilla + '\n\n' +
    'Devuelve SOLO un JSON:\n' +
    '{"asunto": "...", "cuerpo": "..."}';

  const modeloPro = config['ia.modelo_pro'] || 'gemini-2.5-pro';
  const resultado = llamarGemini(modeloPro, prompt, {
    parsearJson: true,
    modulo: 'correos.redactar',
  });

  if (resultado.json && resultado.json.asunto && resultado.json.cuerpo) {
    return {
      asunto: String(resultado.json.asunto),
      cuerpo: String(resultado.json.cuerpo),
    };
  }
  throw new Error('No se pudo redactar cotizacion (IA sin respuesta valida)');
}

/**
 * Clasifica una respuesta entrante.
 * Usa Pro (decision dispara notificacion al papa).
 */
function clasificarRespuesta(texto) {
  const prompt =
    'Clasifica esta respuesta de correo recibida en una de estas categorias:\n' +
    '- interesado: pide mas info, cotizacion formal, llamada, reunion\n' +
    '- no_interesado: declina explicitamente\n' +
    '- fuera_oficina: auto-respuesta de vacaciones o ausencia\n' +
    '- spam: contenido no relacionado o publicidad\n\n' +
    'Texto:\n' + texto.substring(0, 5000) + '\n\n' +
    'Devuelve SOLO un JSON:\n' +
    '{"categoria": "interesado|no_interesado|fuera_oficina|spam", "resumen": "1-2 frases"}';

  const config = leerConfig();
  const modeloPro = config['ia.modelo_pro'] || 'gemini-2.5-pro';
  const resultado = llamarGemini(modeloPro, prompt, {
    parsearJson: true,
    modulo: 'correos.clasificar',
  });

  if (resultado.json && resultado.json.categoria) {
    const categoria = String(resultado.json.categoria);
    if (CATEGORIAS_RESPUESTA_VALIDAS.indexOf(categoria) === -1) {
      return { categoria: 'sin_clasificar', resumen: String(resultado.json.resumen || '') };
    }
    return {
      categoria: categoria,
      resumen: String(resultado.json.resumen || ''),
    };
  }
  return { categoria: 'sin_clasificar', resumen: '' };
}
```

## apps_script/Scraper.gs

```javascript
/**
 * Scraper.gs - Asistente que busca empresas en internet con Gemini grounding.
 *
 * Reemplaza al scraper Playwright del plan original. Funciona asi:
 *   1. Recibe una instruccion en lenguaje natural ("busca 30 empresas de
 *      plasticos en Bogota").
 *   2. Llama a Gemini 2.5 Pro con la herramienta google_search activa.
 *   3. Gemini busca en Google, lee paginas, y devuelve lista estructurada
 *      en JSON.
 *   4. Cada empresa se valida con un fetch al sitio web para eliminar las
 *      "alucinaciones" (empresas que Gemini se inventa).
 *   5. Solo las que pasan validacion se guardan en la hoja Empresas.
 */

/**
 * Punto de entrada desde la UI o trigger manual.
 *
 * @param {string} sectorNombre - p.ej. "empresas de plasticos"
 * @param {string} instruccion - lenguaje natural del usuario
 * @param {number} limite - cuantas empresas como maximo
 * @return {Object} { sectorId, encontradas, validadas, descartadas }
 */
function buscarEmpresasConIA(sectorNombre, instruccion, limite) {
  if (!sectorNombre) throw new Error('Falta el nombre del sector');
  if (!instruccion) instruccion = 'Busca empresas medianas y pequenas';
  limite = parseInt(limite, 10) || 50;

  registrarLog_('INFO', 'Scraper',
    'Iniciando busqueda. Sector: ' + sectorNombre +
    '. Limite: ' + limite + '. Instruccion: ' + instruccion);

  const sectorId = insertarSector({
    nombre: sectorNombre,
    palabras_clave: instruccion,
    total_empresas_encontradas: 0,
  });

  const empresas = pedirEmpresasAGemini_(sectorNombre, instruccion, limite);
  registrarLog_('INFO', 'Scraper',
    'Gemini devolvio ' + empresas.length + ' candidatas');

  let validadas = 0;
  let descartadas = 0;
  for (const candidata of empresas) {
    if (!candidata.nombre) {
      descartadas++;
      continue;
    }
    const valida = validarEmpresa_(candidata);
    if (!valida) {
      descartadas++;
      continue;
    }
    const id = insertarEmpresa({
      nombre: candidata.nombre,
      sector_id: sectorId,
      direccion: candidata.direccion || '',
      telefono: candidata.telefono || '',
      sitio_web: candidata.sitio_web || '',
      fuente: 'gemini_grounding',
      estado: 'nueva',
    });
    if (id) {
      validadas++;
    } else {
      descartadas++;
    }
  }

  actualizarConteoSector(sectorId, validadas);
  registrarLog_('INFO', 'Scraper',
    'Busqueda terminada. Validadas: ' + validadas + ' / descartadas: ' + descartadas);

  return {
    sectorId: sectorId,
    encontradas: empresas.length,
    validadas: validadas,
    descartadas: descartadas,
  };
}

/**
 * Construye el prompt y llama a Gemini con grounding.
 */
function pedirEmpresasAGemini_(sectorNombre, instruccion, limite) {
  const config = leerConfig();
  const ciudad = config['empresa.ciudad'] || 'Bogota';
  const modeloPro = config['ia.modelo_pro'] || 'gemini-2.5-pro';

  const prompt =
    'Eres un asistente de prospeccion comercial. Necesito que busques en ' +
    'internet (usa la herramienta google_search) empresas reales en ' + ciudad +
    ', Colombia, que encajen con este criterio:\n\n' +
    'Sector: ' + sectorNombre + '\n' +
    'Instrucciones adicionales: ' + instruccion + '\n' +
    'Cantidad objetivo: ' + limite + ' empresas\n\n' +
    'Reglas estrictas:\n' +
    '1. SOLO empresas que realmente existan; verifica con busqueda. NO inventes.\n' +
    '2. SOLO empresas con presencia digital comprobable (web, directorio, ' +
    '   redes sociales con datos).\n' +
    '3. Prioriza pequenas y medianas (no multinacionales).\n' +
    '4. Para cada empresa devuelve: nombre exacto, sitio_web (URL completa o ' +
    '   null), direccion, telefono.\n' +
    '5. Si no encuentras ' + limite + ', devuelve las que si verificaste.\n\n' +
    'Devuelve SOLO un JSON con esta forma exacta, sin texto adicional:\n' +
    '{\n' +
    '  "empresas": [\n' +
    '    {\n' +
    '      "nombre": "Razon social o nombre comercial",\n' +
    '      "sitio_web": "https://... o null",\n' +
    '      "direccion": "direccion completa o null",\n' +
    '      "telefono": "telefono o null",\n' +
    '      "fuente_url": "URL de donde sacaste el dato"\n' +
    '    }\n' +
    '  ]\n' +
    '}';

  const resultado = llamarGemini(modeloPro, prompt, {
    conGrounding: true,
    parsearJson: true,
    modulo: 'scraper.buscar',
  });

  if (resultado.json && Array.isArray(resultado.json.empresas)) {
    return resultado.json.empresas;
  }
  registrarLog_('WARN', 'Scraper',
    'Respuesta sin lista de empresas. Texto: ' +
    String(resultado.texto || '').substring(0, 500));
  return [];
}

/**
 * Valida que la empresa tenga al menos UN dato verificable.
 *
 * Si tiene sitio_web, intenta un fetch HEAD/GET corto. Si responde,
 * la empresa pasa. Si no tiene sitio web, exige al menos telefono Y direccion.
 */
function validarEmpresa_(empresa) {
  if (empresa.sitio_web) {
    try {
      const r = UrlFetchApp.fetch(empresa.sitio_web, {
        method: 'get',
        muteHttpExceptions: true,
        followRedirects: true,
        validateHttpsCertificates: false,
        // timeout pequeno: si tarda mucho, descartar
      });
      const codigo = r.getResponseCode();
      if (codigo >= 200 && codigo < 400) {
        return true;
      }
    } catch (e) {
      // dominio invalido -> descartar
    }
  }
  // Sin web verificable: exigir telefono + direccion
  if (empresa.telefono && empresa.direccion) {
    return true;
  }
  return false;
}
```

## apps_script/Enriquecer.gs

```javascript
/**
 * Enriquecer.gs - Visita el sitio web de cada empresa y extrae correo + valida prospecto.
 *
 * Estados resultantes:
 *   - 'enriquecida'  : se obtuvo correo y la IA dice que es prospecto
 *   - 'sin_correo'   : no se pudo extraer correo
 *   - 'descartada'   : la IA dice que no es prospecto
 */

const RUTAS_CONTACTO = ['/contacto', '/contact', '/contactenos', '/contact-us'];

/**
 * Enriquece todas las empresas en estado 'nueva' (o un sector especifico).
 *
 * @param {number|null} sectorId - si es null, enriquece todas las nuevas
 * @param {number} limite - maximo de empresas a procesar en esta corrida
 */
function enriquecerLote(sectorId, limite) {
  limite = limite || 50;
  const nuevas = listarEmpresasPorEstado('nueva', limite);
  const filtradas = sectorId
    ? nuevas.filter(function (e) { return parseInt(e.sector_id, 10) === parseInt(sectorId, 10); })
    : nuevas;

  registrarLog_('INFO', 'Enriquecer',
    'Procesando ' + filtradas.length + ' empresas');

  let conCorreo = 0;
  let sinCorreo = 0;
  let descartadas = 0;

  for (const empresa of filtradas) {
    try {
      const resultado = enriquecerEmpresa(empresa);
      if (resultado.estado === 'enriquecida') conCorreo++;
      else if (resultado.estado === 'sin_correo') sinCorreo++;
      else if (resultado.estado === 'descartada') descartadas++;
    } catch (e) {
      registrarLog_('ERROR', 'Enriquecer',
        'Empresa ' + empresa.id + ' (' + empresa.nombre + '): ' + e);
    }
    // Pausa corta para no parecer bot
    Utilities.sleep(500);
  }

  return {
    procesadas: filtradas.length,
    conCorreo: conCorreo,
    sinCorreo: sinCorreo,
    descartadas: descartadas,
  };
}

/**
 * Enriquece UNA empresa. Devuelve { estado, correo, notas }.
 */
function enriquecerEmpresa(empresa) {
  let html = '';
  let correoExtraido = null;

  if (empresa.sitio_web) {
    html = traerHtmlSeguro_(empresa.sitio_web);
    // Si la home no tiene correo evidente, probar paginas de contacto
    for (const ruta of RUTAS_CONTACTO) {
      if (correoExtraido) break;
      if (buscarCorreoEnTexto_(html)) break;
      const urlContacto = combinarUrl_(empresa.sitio_web, ruta);
      const htmlContacto = traerHtmlSeguro_(urlContacto);
      if (htmlContacto) {
        html += '\n' + htmlContacto;
      }
    }

    // Primera pasada: regex (rapido, gratis)
    correoExtraido = buscarCorreoEnTexto_(html);

    // Si no hay match regex, pasar el HTML a Gemini
    if (!correoExtraido && html) {
      const extraido = extraerCorreoDeHtml(html);
      if (extraido.correo && extraido.confianza >= 0.5) {
        correoExtraido = extraido.correo;
      }
    }
  }

  // Evaluar si es prospecto
  let evaluacion;
  try {
    evaluacion = evaluarProspecto(empresa);
  } catch (e) {
    evaluacion = { esProspecto: true, razon: 'Sin evaluacion IA', tamanoEstimado: 'desconocido', confianza: 0 };
  }

  if (!evaluacion.esProspecto && evaluacion.confianza >= 0.6) {
    actualizarEmpresaEnriquecida(
      empresa.id, correoExtraido || '', false,
      'Descartada: ' + evaluacion.razon, 'descartada'
    );
    return { estado: 'descartada', correo: correoExtraido, notas: evaluacion.razon };
  }

  if (!correoExtraido) {
    actualizarEmpresaEnriquecida(
      empresa.id, '', false,
      'Sin correo: visita web sin direccion de contacto', 'sin_correo'
    );
    return { estado: 'sin_correo', correo: null, notas: 'sin correo' };
  }

  actualizarEmpresaEnriquecida(
    empresa.id, correoExtraido, true,
    'Tamano: ' + evaluacion.tamanoEstimado + '. ' + evaluacion.razon,
    'enriquecida'
  );
  return { estado: 'enriquecida', correo: correoExtraido, notas: evaluacion.razon };
}

// ============================================================
// Helpers
// ============================================================

function traerHtmlSeguro_(url) {
  if (!url) return '';
  try {
    const r = UrlFetchApp.fetch(url, {
      method: 'get',
      muteHttpExceptions: true,
      followRedirects: true,
      validateHttpsCertificates: false,
    });
    if (r.getResponseCode() >= 200 && r.getResponseCode() < 400) {
      return r.getContentText();
    }
  } catch (e) {
    // descartar
  }
  return '';
}

function combinarUrl_(baseUrl, ruta) {
  try {
    const u = baseUrl.replace(/\/+$/, '');
    return u + ruta;
  } catch (e) {
    return null;
  }
}

const REGEX_CORREO = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

function buscarCorreoEnTexto_(texto) {
  if (!texto) return null;
  const matches = texto.match(REGEX_CORREO);
  if (!matches) return null;
  // Filtrar correos genericos de plataformas
  const malos = ['ejemplo', 'example', 'sentry', 'wordpress', 'noreply', 'no-reply'];
  for (const correo of matches) {
    const c = correo.toLowerCase();
    if (malos.some(function (m) { return c.indexOf(m) !== -1; })) continue;
    return c;
  }
  return null;
}
```

## apps_script/Correos.gs

```javascript
/**
 * Correos.gs - Envio de cotizaciones (GmailApp) y lectura de respuestas (Gmail API).
 *
 * Ventaja vs SMTP/IMAP del plan original: no necesitamos App Password.
 * Gmail integrado autoriza por OAuth cuando Diego despliega el script.
 */

const PLANTILLA_DEFAULT =
  'Buenas tardes,\n\n' +
  'Le escribo desde [empresa.nombre], somos proveedores de [empresa.productos]. ' +
  'Vimos que su empresa puede beneficiarse de nuestros productos por su sector y tamano.\n\n' +
  'Nos encantaria enviarle una cotizacion sin compromiso. ' +
  'Quedo atento a su respuesta para coordinar.\n\n' +
  'Cordialmente,\n' +
  '[empresa.nombre_remitente]\n' +
  'Tel: [empresa.telefono_contacto]\n';

/**
 * Envia cotizaciones a un lote de empresas en estado 'enriquecida'.
 * Respeta los limites de la hoja Config.
 *
 * @return {Object} { intentadas, enviadas, fallidas }
 */
function enviarLoteDelDia() {
  const config = leerConfig();
  const maxDia = parseInt(config['limites.correos_max_dia'], 10) || 30;
  const pausaSeg = parseInt(config['limites.pausa_entre_correos_seg'], 10) || 90;

  const yaEnviadosHoy = correosEnviadosHoy_();
  const restantes = Math.max(0, maxDia - yaEnviadosHoy);
  if (restantes === 0) {
    registrarLog_('INFO', 'Correos', 'Limite diario alcanzado (' + maxDia + ')');
    return { intentadas: 0, enviadas: 0, fallidas: 0 };
  }

  const candidatas = listarEmpresasPorEstado('enriquecida', restantes);
  registrarLog_('INFO', 'Correos',
    'Lote del dia: ' + candidatas.length + ' empresas, restantes en cuota: ' + restantes);

  let enviadas = 0;
  let fallidas = 0;

  for (const empresa of candidatas) {
    try {
      const ok = enviarCotizacion(empresa);
      if (ok) {
        enviadas++;
        actualizarEstadoEmpresa(empresa.id, 'contactada');
      } else {
        fallidas++;
      }
    } catch (e) {
      fallidas++;
      registrarLog_('ERROR', 'Correos',
        'Fallo enviando a ' + empresa.nombre + ': ' + e);
    }
    if (enviadas < candidatas.length) {
      Utilities.sleep(pausaSeg * 1000);
    }
  }

  return { intentadas: candidatas.length, enviadas: enviadas, fallidas: fallidas };
}

/**
 * Envia UNA cotizacion personalizada.
 */
function enviarCotizacion(empresa) {
  if (!empresa.correo) {
    throw new Error('Empresa sin correo: ' + empresa.nombre);
  }

  const plantilla = leerPlantillaCotizacion_();
  const personalizado = redactarCotizacion(empresa, plantilla);

  const mensajeId = generarMensajeId_();
  const headers = {
    'Message-ID': mensajeId,
    'X-Dotacion-Origen': 'dotacion-papa',
  };

  GmailApp.sendEmail(empresa.correo, personalizado.asunto, personalizado.cuerpo, {
    name: leerConfigValor('empresa.nombre_remitente', ''),
    replyTo: leerConfigValor('empresa.correo_envio', ''),
    headers: headers,
  });

  insertarCorreoEnviado({
    empresa_id: empresa.id,
    asunto: personalizado.asunto,
    cuerpo: personalizado.cuerpo,
    estado_envio: 'enviado',
    mensaje_id: mensajeId,
  });

  registrarLog_('INFO', 'Correos',
    'Enviado a ' + empresa.nombre + ' (' + empresa.correo + ')');
  return true;
}

/**
 * Lee respuestas nuevas del buzon y las clasifica.
 *
 * Busca hilos que contengan correos enviados por nosotros.
 * Para cada hilo, examina si hay mensaje nuevo del cliente y lo procesa.
 */
function leerRespuestas() {
  registrarLog_('INFO', 'Correos', 'Buscando respuestas');

  const hace3dias = Utilities.formatDate(
    new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    Session.getScriptTimeZone(),
    'yyyy/MM/dd'
  );
  const consulta = 'from:me after:' + hace3dias;

  const hilos = GmailApp.search(consulta, 0, 50);
  let nuevasRespuestas = 0;

  for (const hilo of hilos) {
    const mensajes = hilo.getMessages();
    if (mensajes.length < 2) continue;

    const ultimo = mensajes[mensajes.length - 1];
    const inReplyTo = obtenerEncabezado_(ultimo, 'In-Reply-To');
    const refs = obtenerEncabezado_(ultimo, 'References');
    const idsCandidatos = [];
    if (inReplyTo) idsCandidatos.push(inReplyTo.trim());
    if (refs) {
      refs.split(/\s+/).forEach(function (r) {
        if (r) idsCandidatos.push(r.trim());
      });
    }

    let correoOriginal = null;
    for (const id of idsCandidatos) {
      correoOriginal = buscarCorreoPorMensajeId(id);
      if (correoOriginal) break;
    }
    if (!correoOriginal) continue;

    // Evitar duplicar: si ya hay respuesta para este correo_enviado_id, saltar
    const respuestasExistentes = SpreadsheetApp.getActiveSpreadsheet()
      .getSheetByName(NOMBRES_HOJAS.RESPUESTAS);
    const yaExiste = respuestasExistentes &&
      buscarFila_(NOMBRES_HOJAS.RESPUESTAS, function (r) {
        return parseInt(r.correo_enviado_id, 10) === parseInt(correoOriginal.id, 10);
      });
    if (yaExiste) continue;

    const cuerpo = ultimo.getPlainBody() || ultimo.getBody();
    const clasificacion = clasificarRespuesta(cuerpo);

    insertarRespuesta({
      correo_enviado_id: correoOriginal.id,
      empresa_id: correoOriginal.empresa_id,
      asunto: ultimo.getSubject(),
      cuerpo: cuerpo.substring(0, 5000),
      clasificacion_ia: clasificacion.categoria,
      resumen_ia: clasificacion.resumen,
      notificada_whatsapp: false,
    });

    actualizarEstadoEmpresa(correoOriginal.empresa_id, 'respondio');
    nuevasRespuestas++;

    registrarLog_('INFO', 'Correos',
      'Respuesta clasificada como ' + clasificacion.categoria +
      ' (empresa ' + correoOriginal.empresa_id + ')');
  }

  registrarLog_('INFO', 'Correos',
    'Lectura terminada. Nuevas respuestas: ' + nuevasRespuestas);
  return { nuevasRespuestas: nuevasRespuestas };
}

// ============================================================
// Helpers
// ============================================================

function correosEnviadosHoy_() {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const todos = leerTodo_(NOMBRES_HOJAS.CORREOS);
  return todos.filter(function (c) {
    return c.fecha_envio && new Date(c.fecha_envio) >= hoy;
  }).length;
}

function generarMensajeId_() {
  const dominio = (leerConfigValor('empresa.correo_envio', 'dotacion@local')).split('@')[1] || 'dotacion-papa';
  const random = Utilities.getUuid().replace(/-/g, '');
  return '<' + random + '@' + dominio + '>';
}

function obtenerEncabezado_(mensaje, nombreCabecera) {
  const raw = mensaje.getRawContent();
  const regex = new RegExp('^' + nombreCabecera + ':\\s*(.+)$', 'mi');
  const m = raw.match(regex);
  return m ? m[1].trim() : null;
}

function leerPlantillaCotizacion_() {
  const config = leerConfig();
  let plantilla = PLANTILLA_DEFAULT;
  plantilla = plantilla.replace('[empresa.nombre]', config['empresa.nombre'] || '');
  plantilla = plantilla.replace('[empresa.productos]',
    (config['empresa.productos'] || '').split('|').join(', '));
  plantilla = plantilla.replace('[empresa.nombre_remitente]', config['empresa.nombre_remitente'] || '');
  plantilla = plantilla.replace('[empresa.telefono_contacto]', config['empresa.telefono_contacto'] || '');
  return plantilla;
}
```

## apps_script/WhatsApp.gs

```javascript
/**
 * WhatsApp.gs - Cliente HTTP al servicio Node externo (whatsapp-web.js).
 *
 * Apps Script no puede correr whatsapp-web.js. Por eso necesitamos un
 * servicio Node externo (en la PC de Diego o un servidor cheap) que reciba
 * webhooks desde aqui y dispare el mensaje al WhatsApp del papa.
 *
 * Configurar:
 *   PropertiesService > WHATSAPP_SERVICE_URL   ej. http://diego-pc.tailnet.ts.net:3000
 *   PropertiesService > WHATSAPP_NUMERO_PAPA   ej. +573001234567
 */

/**
 * Verifica que el servicio Node este levantado.
 */
function verificarEstadoWhatsApp() {
  const url = leerSecreto('WHATSAPP_SERVICE_URL') + '/estado';
  try {
    const r = UrlFetchApp.fetch(url, {
      method: 'get',
      muteHttpExceptions: true,
    });
    if (r.getResponseCode() !== 200) return { conectado: false, error: 'codigo ' + r.getResponseCode() };
    const json = JSON.parse(r.getContentText());
    return { conectado: Boolean(json.conectado), error: null };
  } catch (e) {
    return { conectado: false, error: String(e) };
  }
}

/**
 * Procesa todas las respuestas interesadas no notificadas y dispara
 * un mensaje al WhatsApp del papa por cada una.
 */
function notificarPendientes() {
  const pendientes = respuestasNoNotificadas();
  registrarLog_('INFO', 'WhatsApp',
    'Pendientes de notificar: ' + pendientes.length);

  let exitos = 0;
  let fallos = 0;
  for (const respuesta of pendientes) {
    try {
      const empresa = obtenerEmpresa(respuesta.empresa_id);
      const ok = enviarMensajeWhatsApp_(formatearMensaje_(empresa, respuesta));
      if (ok) {
        marcarNotificadaWhatsapp(respuesta.id);
        exitos++;
      } else {
        fallos++;
      }
    } catch (e) {
      fallos++;
      registrarLog_('ERROR', 'WhatsApp',
        'Fallo notificacion respuesta ' + respuesta.id + ': ' + e);
    }
  }
  return { exitos: exitos, fallos: fallos };
}

function formatearMensaje_(empresa, respuesta) {
  return '*Nueva respuesta de empresa*\n\n' +
    'Empresa: ' + (empresa.nombre || 'sin nombre') + '\n' +
    'Estado: ' + respuesta.clasificacion_ia + '\n\n' +
    'Resumen:\n' + (respuesta.resumen_ia || '(sin resumen)') + '\n\n' +
    'Contacto: ' + (empresa.telefono || 'sin telefono') + '\n' +
    'Correo: ' + (empresa.correo || 'sin correo') + '\n\n' +
    'Abre la app para ver el mensaje completo.';
}

function enviarMensajeWhatsApp_(mensaje) {
  const baseUrl = leerSecreto('WHATSAPP_SERVICE_URL');
  const numero = leerSecreto('WHATSAPP_NUMERO_PAPA');
  const r = UrlFetchApp.fetch(baseUrl + '/enviar', {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({ numero: numero, mensaje: mensaje }),
    muteHttpExceptions: true,
  });
  if (r.getResponseCode() >= 200 && r.getResponseCode() < 300) {
    return true;
  }
  registrarLog_('WARN', 'WhatsApp',
    'Servicio devolvio ' + r.getResponseCode() + ': ' + r.getContentText().substring(0, 300));
  return false;
}
```

## apps_script/Scheduler.gs

```javascript
/**
 * Scheduler.gs - Triggers automaticos para tareas periodicas.
 *
 * Configura UNA SOLA VEZ ejecutando configurarTriggers() desde el menu.
 * Crea:
 *   - Cada 60 min: leer respuestas IMAP y notificar interesados.
 *   - Diario a las 08:00: enviar el lote del dia.
 */

const NOMBRES_TRIGGERS = {
  LEER_RESPUESTAS: 'jobLeerRespuestas',
  ENVIAR_LOTE: 'jobEnviarLote',
};

function configurarTriggers() {
  borrarTriggersExistentes_();

  const config = leerConfig();
  const intervaloMin = parseInt(config['scheduler.intervalo_lectura_min'], 10) || 60;
  const horaEnvio = String(config['scheduler.hora_envio'] || '08:00');
  const [hh, mm] = horaEnvio.split(':').map(function (s) { return parseInt(s, 10); });

  ScriptApp.newTrigger(NOMBRES_TRIGGERS.LEER_RESPUESTAS)
    .timeBased()
    .everyMinutes(intervaloMin >= 30 ? Math.min(intervaloMin, 360) : 60)
    .create();

  ScriptApp.newTrigger(NOMBRES_TRIGGERS.ENVIAR_LOTE)
    .timeBased()
    .atHour(hh)
    .everyDays(1)
    .create();

  registrarLog_('INFO', 'Scheduler',
    'Triggers configurados: leer cada ' + intervaloMin + ' min, enviar a las ' + horaEnvio);

  SpreadsheetApp.getUi().alert(
    'Triggers configurados:\n\n' +
    '- Lectura de respuestas: cada ' + intervaloMin + ' min\n' +
    '- Envio del lote: diario a las ' + horaEnvio + '\n\n' +
    'Puedes verlos en Apps Script > Activadores.'
  );
}

function borrarTriggersExistentes_() {
  const triggers = ScriptApp.getProjectTriggers();
  for (const t of triggers) {
    if (Object.values(NOMBRES_TRIGGERS).indexOf(t.getHandlerFunction()) !== -1) {
      ScriptApp.deleteTrigger(t);
    }
  }
}

// ============================================================
// Handlers de los triggers
// ============================================================

function jobLeerRespuestas() {
  try {
    const resultado = leerRespuestas();
    if (resultado.nuevasRespuestas > 0) {
      notificarPendientes();
    }
  } catch (e) {
    registrarLog_('ERROR', 'Scheduler.jobLeerRespuestas', String(e));
  }
}

function jobEnviarLote() {
  try {
    enviarLoteDelDia();
  } catch (e) {
    registrarLog_('ERROR', 'Scheduler.jobEnviarLote', String(e));
  }
}
```

## apps_script/Menu.gs

```javascript
/**
 * Menu.gs - Menu personalizado en el Sheet y entrada de la web app.
 */

/**
 * Se ejecuta al abrir el Sheet. Crea el menu "Dotacion Papa".
 */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Dotacion Papa')
    .addItem('1. Inicializar todo (primera vez)', 'inicializarTodo')
    .addSeparator()
    .addItem('Abrir app del papa', 'abrirWebApp')
    .addSeparator()
    .addSubMenu(
      SpreadsheetApp.getUi().createMenu('Acciones manuales')
        .addItem('Buscar empresas (preguntar sector)', 'menuBuscar')
        .addItem('Enriquecer empresas nuevas', 'menuEnriquecer')
        .addItem('Enviar lote de cotizaciones ahora', 'enviarLoteDelDia')
        .addItem('Leer respuestas ahora', 'jobLeerRespuestas')
        .addItem('Notificar interesados pendientes', 'notificarPendientes')
    )
    .addSeparator()
    .addItem('Configurar triggers automaticos', 'configurarTriggers')
    .addItem('Verificar configuracion', 'menuVerificarConfig')
    .addItem('Verificar instalacion completa (smoke test)', 'menuVerificarInstalacion')
    .addToUi();
}

function menuVerificarInstalacion() {
  const reporte = verificarInstalacion();
  let mensaje = 'Smoke test de instalacion:\n\n';
  for (const c of reporte.chequeos) {
    mensaje += (c.ok ? '[OK]   ' : '[FAIL] ') + c.nombre + '\n';
    if (!c.ok) mensaje += '       ' + c.detalle + '\n';
  }
  mensaje += '\n' + (reporte.todoOk ? 'TODO OK - listo para entregar al papa.' : 'HAY FALLOS - revisar arriba.');
  SpreadsheetApp.getUi().alert(mensaje);
}

function abrirWebApp() {
  const url = ScriptApp.getService().getUrl();
  if (!url) {
    SpreadsheetApp.getUi().alert(
      'La web app no esta desplegada todavia.\n\n' +
      'En el editor de Apps Script ve a: Implementar > Nueva implementacion > ' +
      'Aplicacion web. Despues vuelve aqui.'
    );
    return;
  }
  const html = HtmlService.createHtmlOutput(
    '<script>window.open("' + url + '", "_blank"); google.script.host.close();</script>'
  ).setWidth(100).setHeight(50);
  SpreadsheetApp.getUi().showModalDialog(html, 'Abriendo app...');
}

function menuBuscar() {
  const ui = SpreadsheetApp.getUi();
  const sector = ui.prompt(
    'Buscar empresas',
    'Que tipo de empresas quieres buscar?\n(Ej: "empresas de plasticos en Bogota")',
    ui.ButtonSet.OK_CANCEL
  );
  if (sector.getSelectedButton() !== ui.Button.OK) return;
  const nombre = sector.getResponseText().trim();
  if (!nombre) return;

  const limite = ui.prompt(
    'Cantidad',
    'Cuantas empresas como maximo? (default 30)',
    ui.ButtonSet.OK_CANCEL
  );
  if (limite.getSelectedButton() !== ui.Button.OK) return;
  const n = parseInt(limite.getResponseText(), 10) || 30;

  const resultado = buscarEmpresasConIA(nombre, 'Pequenas y medianas, con presencia web', n);
  ui.alert(
    'Listo.\n' +
    'Validadas: ' + resultado.validadas + '\n' +
    'Descartadas: ' + resultado.descartadas + '\n\n' +
    'Siguiente paso: "Enriquecer empresas nuevas" desde el menu.'
  );
}

function menuEnriquecer() {
  const resultado = enriquecerLote(null, 50);
  SpreadsheetApp.getUi().alert(
    'Enriquecimiento terminado.\n' +
    'Procesadas: ' + resultado.procesadas + '\n' +
    'Con correo: ' + resultado.conCorreo + '\n' +
    'Sin correo: ' + resultado.sinCorreo + '\n' +
    'Descartadas (no son prospecto): ' + resultado.descartadas
  );
}

function menuVerificarConfig() {
  const reporte = verificarConfiguracion();
  const estadoWa = verificarEstadoWhatsApp();
  let mensaje = 'Configuracion:\n';
  mensaje += '- Hojas creadas: ' + (reporte.hojaConfigExiste ? 'SI' : 'NO') + '\n';
  mensaje += '- Propiedades faltantes: ' +
    (reporte.propiedadesFaltantes.length === 0
      ? 'ninguna'
      : reporte.propiedadesFaltantes.join(', ')) + '\n';
  mensaje += '- Servicio WhatsApp: ' + (estadoWa.conectado ? 'conectado' : 'NO conectado') + '\n';
  mensaje += '\nListo para usar: ' + (reporte.listo && estadoWa.conectado ? 'SI' : 'NO');
  SpreadsheetApp.getUi().alert(mensaje);
}
```

## apps_script/WebApp.gs

```javascript
/**
 * WebApp.gs - Punto de entrada de la aplicacion web del papa.
 *
 * Despliegue:
 *   Apps Script editor > Implementar > Nueva implementacion >
 *   Tipo: aplicacion web > Ejecutar como: yo > Acceso: solo yo (o cualquiera).
 *
 * El papa abre la URL en el navegador del PC o del celular.
 */

function doGet(e) {
  const pagina = (e && e.parameter && e.parameter.pagina) || 'dashboard';
  const archivo = {
    dashboard: 'Dashboard',
    buscar: 'Buscar',
    respuestas: 'Respuestas',
    configuracion: 'Configuracion',
  }[pagina] || 'Dashboard';

  const plantilla = HtmlService.createTemplateFromFile(archivo);
  plantilla.pagina = pagina;
  return plantilla.evaluate()
    .setTitle('Dotacion Papa')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/**
 * Helper para que las plantillas HTML incluyan archivos compartidos
 * (estilos, header, etc.) usando <?!= incluir('NombreArchivo') ?>.
 */
function incluir(nombreArchivo) {
  return HtmlService.createHtmlOutputFromFile(nombreArchivo).getContent();
}

// ============================================================
// Endpoints llamados desde HTML via google.script.run
// ============================================================

function apiObtenerKPIs() {
  const conteo = contarEmpresasPorEstado();
  return {
    totalEmpresas: totalEmpresas(),
    nuevas: conteo['nueva'] || 0,
    enriquecidas: conteo['enriquecida'] || 0,
    contactadas: conteo['contactada'] || 0,
    respondieron: conteo['respondio'] || 0,
    correosUltimaSemana: correosEnviadosUltimaSemana(),
    respuestasNoLeidas: respuestasNoLeidas(),
    creditoRestante: calcularCreditoRestante_(),
  };
}

function apiBuscarEmpresas(sectorNombre, instruccion, limite) {
  return buscarEmpresasConIA(sectorNombre, instruccion, limite);
}

function apiEnriquecerEmpresas(sectorId, limite) {
  return enriquecerLote(sectorId, limite);
}

function apiListarRespuestas(filtro) {
  const todas = leerTodo_(NOMBRES_HOJAS.RESPUESTAS);
  let filtradas = todas;
  if (filtro && filtro !== 'todas') {
    filtradas = todas.filter(function (r) { return r.clasificacion_ia === filtro; });
  }
  filtradas.sort(function (a, b) {
    return new Date(b.fecha_recepcion) - new Date(a.fecha_recepcion);
  });
  return filtradas.slice(0, 50).map(function (r) {
    const empresa = obtenerEmpresa(r.empresa_id);
    return {
      id: r.id,
      empresa: empresa ? empresa.nombre : '(sin empresa)',
      correo: empresa ? empresa.correo : '',
      telefono: empresa ? empresa.telefono : '',
      asunto: r.asunto,
      cuerpo: r.cuerpo,
      fecha: r.fecha_recepcion,
      clasificacion: r.clasificacion_ia,
      resumen: r.resumen_ia,
    };
  });
}

function apiMarcarRespuestaGestionada(respuestaId) {
  marcarNotificadaWhatsapp(respuestaId);
  return true;
}

function apiVerificarServicios() {
  const config = verificarConfiguracion();
  const wa = verificarEstadoWhatsApp();
  return {
    propiedadesFaltantes: config.propiedadesFaltantes,
    hojaConfigExiste: config.hojaConfigExiste,
    whatsapp: wa,
    gmail: { conectado: true, nota: 'integrado nativamente' },
    gemini: { conectado: Boolean(leerSecretoOpcional('GEMINI_API_KEY')) },
  };
}

function apiValidarPin(pinIngresado) {
  const real = leerSecreto('CONFIG_PIN');
  return String(pinIngresado) === String(real);
}

function calcularCreditoRestante_() {
  const config = leerConfig();
  const saldoInicial = parseFloat(config['ia.saldo_inicial_usd']) || 250;
  let gastado = 0;
  try {
    const consumos = leerTodo_(NOMBRES_HOJAS.CONSUMO_GEMINI);
    for (const c of consumos) {
      gastado += parseFloat(c.costo_usd) || 0;
    }
  } catch (e) {
    // Hoja no inicializada todavia
  }
  const restante = Math.max(0, saldoInicial - gastado);
  const porcentaje = saldoInicial > 0 ? (restante / saldoInicial) * 100 : 0;
  return {
    saldoInicialUsd: saldoInicial,
    gastadoUsd: Math.round(gastado * 100) / 100,
    restanteUsd: Math.round(restante * 100) / 100,
    porcentaje: Math.round(porcentaje * 10) / 10,
  };
}
```

## apps_script/VerificarInstalacion.gs

```javascript
/**
 * VerificarInstalacion.gs - Smoke test que Diego ejecuta una vez instalado todo.
 *
 * Corre desde el editor (selecciona la funcion verificarInstalacion y Run),
 * o desde el menu "Dotacion Papa > Verificar instalacion". Imprime un reporte
 * en el Logger (Ver > Logs) y devuelve un objeto con el estado de cada chequeo.
 */

function verificarInstalacion() {
  const reporte = {
    timestamp: new Date().toISOString(),
    chequeos: [],
    todoOk: true,
  };

  function chequear(nombre, fn) {
    try {
      const detalle = fn();
      reporte.chequeos.push({ nombre: nombre, ok: true, detalle: detalle || 'OK' });
      Logger.log('[OK]   ' + nombre + ' - ' + (detalle || ''));
    } catch (e) {
      reporte.chequeos.push({ nombre: nombre, ok: false, detalle: e.message });
      reporte.todoOk = false;
      Logger.log('[FAIL] ' + nombre + ' - ' + e.message);
    }
  }

  Logger.log('=== Verificacion de instalacion Dotacion Papa ===');

  // 1. Propiedades del script
  chequear('Propiedades del script (4 requeridas)', function () {
    const verif = verificarConfiguracion();
    if (verif.propiedadesFaltantes.length > 0) {
      throw new Error('Faltan: ' + verif.propiedadesFaltantes.join(', '));
    }
    return 'Todas configuradas';
  });

  // 2. Hojas del Sheet
  chequear('Hojas del Sheet (7 requeridas)', function () {
    const nombres = Object.values(NOMBRES_HOJAS);
    const faltantes = [];
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    for (const nombre of nombres) {
      if (!ss.getSheetByName(nombre)) faltantes.push(nombre);
    }
    if (faltantes.length > 0) {
      throw new Error('Faltan hojas: ' + faltantes.join(', ') + '. Ejecuta inicializarTodo().');
    }
    return nombres.length + ' hojas presentes';
  });

  // 3. Config del negocio
  chequear('Config del negocio llena', function () {
    const config = leerConfig();
    const clavesCriticas = [
      'empresa.nombre',
      'empresa.productos',
      'empresa.correo_envio',
    ];
    const vacias = clavesCriticas.filter(function (c) {
      return !config[c] || String(config[c]).trim() === '';
    });
    if (vacias.length > 0) {
      throw new Error('Faltan valores en hoja Config: ' + vacias.join(', '));
    }
    return 'empresa=' + config['empresa.nombre'];
  });

  // 4. Gemini (smoke test minimo, 1 call de bajo costo)
  chequear('Gemini API (smoke con Flash)', function () {
    const resp = llamarGemini('gemini-2.5-flash', 'Responde solo: OK', {
      maxOutputTokens: 10,
    });
    if (!resp || !resp.texto) {
      throw new Error('Respuesta vacia de Gemini');
    }
    return 'Gemini respondio (' + resp.tokensIn + ' in / ' + resp.tokensOut + ' out tokens)';
  });

  // 5. Gmail (verifica que tenemos permiso, no envia nada)
  chequear('Gmail autorizado', function () {
    const email = Session.getActiveUser().getEmail();
    if (!email) throw new Error('No se pudo obtener el correo del usuario');
    // GmailApp.getInboxUnreadCount() valida que el scope este otorgado
    GmailApp.getInboxUnreadCount();
    return 'Cuenta: ' + email;
  });

  // 6. Servicio Node de WhatsApp
  chequear('Servicio Node WhatsApp', function () {
    const estado = verificarEstadoWhatsApp();
    if (!estado.conectado) {
      throw new Error('Servicio no conectado: ' + (estado.error || 'sin detalle'));
    }
    return 'Conectado y listo';
  });

  // 7. Triggers automaticos
  chequear('Triggers automaticos configurados', function () {
    const triggers = ScriptApp.getProjectTriggers();
    const funcionesEsperadas = ['jobLeerRespuestas', 'jobEnviarLote'];
    const configuradas = triggers.map(function (t) { return t.getHandlerFunction(); });
    const faltantes = funcionesEsperadas.filter(function (f) {
      return configuradas.indexOf(f) === -1;
    });
    if (faltantes.length > 0) {
      throw new Error(
        'Faltan triggers: ' + faltantes.join(', ') +
        '. Ejecuta "Configurar triggers automaticos" desde el menu.'
      );
    }
    return triggers.length + ' triggers activos';
  });

  Logger.log('=== Resultado: ' + (reporte.todoOk ? 'TODO OK' : 'HAY FALLOS') + ' ===');

  // Tambien lo registramos en hoja Logs para historico
  try {
    registrarLog_(
      reporte.todoOk ? 'INFO' : 'WARN',
      'VerificarInstalacion',
      JSON.stringify(reporte.chequeos)
    );
  } catch (e) {
    Logger.log('No se pudo registrar en hoja Logs: ' + e.message);
  }

  return reporte;
}
```

## apps_script/appsscript.json

```json
{
  "timeZone": "America/Bogota",
  "dependencies": {
    "enabledAdvancedServices": [
      {
        "userSymbol": "Gmail",
        "version": "v1",
        "serviceId": "gmail"
      }
    ]
  },
  "webapp": {
    "executeAs": "USER_DEPLOYING",
    "access": "MYSELF"
  },
  "exceptionLogging": "STACKDRIVER",
  "runtimeVersion": "V8",
  "oauthScopes": [
    "https://www.googleapis.com/auth/script.external_request",
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/gmail.send",
    "https://www.googleapis.com/auth/gmail.modify",
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/script.scriptapp",
    "https://www.googleapis.com/auth/script.send_mail",
    "https://www.googleapis.com/auth/userinfo.email"
  ]
}
```

## apps_script/Estilos.html

```html
<style>
  * { box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    font-size: 18px;
    line-height: 1.5;
    background: #f4f6f9;
    color: #1f2937;
    margin: 0;
    padding: 0;
  }
  header.app-header {
    background: #1f6feb;
    color: #fff;
    padding: 20px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    box-shadow: 0 2px 6px rgba(0,0,0,0.1);
  }
  header.app-header h1 {
    margin: 0;
    font-size: 24px;
  }
  nav.app-nav {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    padding: 12px 20px;
    background: #ffffff;
    border-bottom: 1px solid #e5e7eb;
  }
  nav.app-nav a {
    padding: 12px 18px;
    border-radius: 8px;
    text-decoration: none;
    color: #1f6feb;
    background: #eef2ff;
    font-size: 18px;
    font-weight: 600;
  }
  nav.app-nav a.activo {
    background: #1f6feb;
    color: #fff;
  }
  main.app-main { padding: 24px; max-width: 1100px; margin: 0 auto; }
  .tarjetas {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 16px;
    margin-bottom: 24px;
  }
  .tarjeta {
    background: #fff;
    border-radius: 12px;
    padding: 20px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.05);
    border-left: 6px solid #1f6feb;
  }
  .tarjeta h3 { margin: 0 0 8px 0; font-size: 16px; color: #6b7280; font-weight: 500; }
  .tarjeta .numero { font-size: 36px; font-weight: 700; color: #111827; }
  .tarjeta.amarilla { border-left-color: #f59e0b; }
  .tarjeta.roja { border-left-color: #dc2626; }
  .tarjeta.verde { border-left-color: #16a34a; }
  .panel {
    background: #fff;
    border-radius: 12px;
    padding: 24px;
    margin-bottom: 20px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.05);
  }
  .boton {
    display: inline-block;
    padding: 14px 24px;
    border-radius: 8px;
    border: none;
    background: #1f6feb;
    color: #fff;
    font-size: 18px;
    font-weight: 600;
    cursor: pointer;
    min-width: 180px;
    text-align: center;
  }
  .boton.verde { background: #16a34a; }
  .boton.amarillo { background: #f59e0b; }
  .boton.rojo { background: #dc2626; }
  .boton:disabled { opacity: 0.5; cursor: not-allowed; }
  input.entrada, textarea.entrada, select.entrada {
    width: 100%;
    padding: 14px;
    font-size: 18px;
    border: 2px solid #d1d5db;
    border-radius: 8px;
    background: #fff;
  }
  input.entrada:focus, textarea.entrada:focus { outline: none; border-color: #1f6feb; }
  table.tabla {
    width: 100%;
    border-collapse: collapse;
    background: #fff;
    border-radius: 8px;
    overflow: hidden;
  }
  table.tabla th { background: #f3f4f6; padding: 12px; text-align: left; font-weight: 600; }
  table.tabla td { padding: 12px; border-top: 1px solid #e5e7eb; }
  .semaforo {
    display: inline-block;
    padding: 4px 10px;
    border-radius: 999px;
    font-size: 14px;
    font-weight: 600;
  }
  .semaforo.verde { background: #dcfce7; color: #166534; }
  .semaforo.amarillo { background: #fef3c7; color: #92400e; }
  .semaforo.rojo { background: #fee2e2; color: #991b1b; }
  .semaforo.gris { background: #e5e7eb; color: #374151; }
  .mensaje {
    padding: 16px;
    border-radius: 8px;
    margin: 12px 0;
    font-size: 18px;
  }
  .mensaje.exito { background: #dcfce7; color: #166534; }
  .mensaje.error { background: #fee2e2; color: #991b1b; }
  .mensaje.info { background: #dbeafe; color: #1e3a8a; }
  .cargando {
    display: inline-block;
    width: 20px;
    height: 20px;
    border: 3px solid #e5e7eb;
    border-top-color: #1f6feb;
    border-radius: 50%;
    animation: girar 1s linear infinite;
  }
  @keyframes girar { to { transform: rotate(360deg); } }
  .ayuda {
    color: #6b7280;
    font-size: 16px;
    margin-top: 8px;
  }
</style>
```

## apps_script/Layout.html

```html
<?!= incluir('Estilos') ?>
<header class="app-header">
  <h1>Dotacion Papa</h1>
  <span style="font-size: 14px; opacity: 0.8;">Sistema de prospeccion</span>
</header>
<nav class="app-nav">
  <a href="?pagina=dashboard" class="<?= pagina === 'dashboard' ? 'activo' : '' ?>">Inicio</a>
  <a href="?pagina=buscar" class="<?= pagina === 'buscar' ? 'activo' : '' ?>">Buscar empresas</a>
  <a href="?pagina=respuestas" class="<?= pagina === 'respuestas' ? 'activo' : '' ?>">Respuestas</a>
  <a href="?pagina=configuracion" class="<?= pagina === 'configuracion' ? 'activo' : '' ?>">Configuracion</a>
</nav>
```

## apps_script/Dashboard.html

```html
<!DOCTYPE html>
<html lang="es">
<head>
<base target="_top">
<?!= incluir('Layout') ?>
</head>
<body>
<main class="app-main">
  <h2 style="margin-top:0;">Inicio</h2>
  <div id="estado-carga" class="mensaje info">
    <span class="cargando"></span> Cargando datos...
  </div>

  <div class="tarjetas" id="tarjetas" style="display:none;">
    <div class="tarjeta">
      <h3>Empresas totales</h3>
      <div class="numero" id="total-empresas">-</div>
    </div>
    <div class="tarjeta verde">
      <h3>Listas para contactar</h3>
      <div class="numero" id="enriquecidas">-</div>
    </div>
    <div class="tarjeta amarilla">
      <h3>Correos esta semana</h3>
      <div class="numero" id="correos-semana">-</div>
    </div>
    <div class="tarjeta verde">
      <h3>Respuestas sin leer</h3>
      <div class="numero" id="respuestas-no-leidas">-</div>
    </div>
    <div class="tarjeta" id="tarjeta-credito">
      <h3>Credito Gemini restante</h3>
      <div class="numero" id="credito-restante">-</div>
      <div class="ayuda" id="credito-detalle">-</div>
    </div>
  </div>

  <div class="panel">
    <h3 style="margin-top:0;">Acciones rapidas</h3>
    <p>
      <a class="boton verde" href="?pagina=buscar">Buscar empresas nuevas</a>
      <a class="boton" href="?pagina=respuestas">Ver respuestas</a>
    </p>
  </div>
</main>

<script>
google.script.run
  .withSuccessHandler(function (kpis) {
    document.getElementById('total-empresas').textContent = kpis.totalEmpresas;
    document.getElementById('enriquecidas').textContent = kpis.enriquecidas;
    document.getElementById('correos-semana').textContent = kpis.correosUltimaSemana;
    document.getElementById('respuestas-no-leidas').textContent = kpis.respuestasNoLeidas;
    document.getElementById('credito-restante').textContent = '$' + kpis.creditoRestante.restanteUsd + ' USD';
    document.getElementById('credito-detalle').textContent =
      kpis.creditoRestante.porcentaje + '% disponible ' +
      '(de $' + kpis.creditoRestante.saldoInicialUsd + ')';
    var tarjeta = document.getElementById('tarjeta-credito');
    if (kpis.creditoRestante.porcentaje < 10) tarjeta.className = 'tarjeta roja';
    else if (kpis.creditoRestante.porcentaje < 30) tarjeta.className = 'tarjeta amarilla';
    else tarjeta.className = 'tarjeta verde';
    document.getElementById('estado-carga').style.display = 'none';
    document.getElementById('tarjetas').style.display = 'grid';
  })
  .withFailureHandler(function (err) {
    document.getElementById('estado-carga').className = 'mensaje error';
    document.getElementById('estado-carga').textContent =
      'Algo salio mal, avisale a Diego. Detalle: ' + err.message;
  })
  .apiObtenerKPIs();
</script>
</body>
</html>
```

## apps_script/Buscar.html

```html
<!DOCTYPE html>
<html lang="es">
<head>
<base target="_top">
<?!= incluir('Layout') ?>
</head>
<body>
<main class="app-main">
  <h2 style="margin-top:0;">Buscar empresas nuevas</h2>

  <div class="panel">
    <label for="sector"><strong>Que tipo de empresas quiere buscar?</strong></label>
    <div class="ayuda">Ejemplo: "empresas de plasticos", "fabricas de muebles", "talleres mecanicos"</div>
    <input id="sector" class="entrada" type="text" placeholder="empresas de plasticos" style="margin-top:10px;">

    <label for="instruccion" style="margin-top:20px; display:block;">
      <strong>Instrucciones extras (opcional)</strong>
    </label>
    <div class="ayuda">Ej: "Que sean pequenas y medianas, evita multinacionales"</div>
    <input id="instruccion" class="entrada"
           value="Pequenas y medianas, con presencia web verificable"
           style="margin-top:10px;">

    <label for="limite" style="margin-top:20px; display:block;"><strong>Cantidad maxima</strong></label>
    <input id="limite" class="entrada" type="number" value="30" min="5" max="200" style="margin-top:10px; max-width:200px;">

    <p style="margin-top:24px;">
      <button id="boton-buscar" class="boton verde" onclick="buscar()">Buscar en internet</button>
    </p>
    <div id="mensaje" style="margin-top:16px;"></div>
  </div>

  <div class="panel" id="panel-enriquecer" style="display:none;">
    <p><strong>Empresas encontradas. Quieres que extraiga sus correos automaticamente?</strong></p>
    <p class="ayuda">Esto visita la web de cada empresa y usa IA para encontrar el correo de contacto.</p>
    <p>
      <button class="boton verde" onclick="enriquecer()">Si, conseguir correos</button>
      <button class="boton" onclick="window.location.href='?pagina=dashboard'">Mas tarde</button>
    </p>
    <div id="mensaje-enriquecer" style="margin-top:16px;"></div>
  </div>
</main>

<script>
function buscar() {
  var sector = document.getElementById('sector').value.trim();
  var instruccion = document.getElementById('instruccion').value.trim();
  var limite = parseInt(document.getElementById('limite').value, 10) || 30;
  if (!sector) {
    mostrarMensaje('mensaje', 'error', 'Escribe que tipo de empresas buscar.');
    return;
  }
  if (!confirm('Voy a buscar hasta ' + limite + ' empresas de "' + sector + '" en internet.\n' +
               'Esto puede demorar 2-3 minutos. Sigues?')) return;

  document.getElementById('boton-buscar').disabled = true;
  mostrarMensaje('mensaje', 'info',
    '<span class="cargando"></span> Buscando empresas... no cierres esta ventana.');

  google.script.run
    .withSuccessHandler(function (r) {
      document.getElementById('boton-buscar').disabled = false;
      mostrarMensaje('mensaje', 'exito',
        'Listo. ' + r.validadas + ' empresas guardadas (' + r.descartadas + ' descartadas).');
      document.getElementById('panel-enriquecer').style.display = 'block';
      document.getElementById('panel-enriquecer').setAttribute('data-sector-id', r.sectorId);
    })
    .withFailureHandler(function (err) {
      document.getElementById('boton-buscar').disabled = false;
      mostrarMensaje('mensaje', 'error',
        'Algo salio mal, avisale a Diego. Detalle: ' + err.message);
    })
    .apiBuscarEmpresas(sector, instruccion, limite);
}

function enriquecer() {
  var sectorId = parseInt(document.getElementById('panel-enriquecer').getAttribute('data-sector-id'), 10);
  mostrarMensaje('mensaje-enriquecer', 'info',
    '<span class="cargando"></span> Visitando cada pagina web y buscando correos...');

  google.script.run
    .withSuccessHandler(function (r) {
      mostrarMensaje('mensaje-enriquecer', 'exito',
        'Listo. ' + r.conCorreo + ' con correo. ' +
        r.sinCorreo + ' sin correo. ' +
        r.descartadas + ' descartadas. ' +
        'Ya estan listas para enviarles cotizacion manana en la manana.');
    })
    .withFailureHandler(function (err) {
      mostrarMensaje('mensaje-enriquecer', 'error',
        'Algo salio mal, avisale a Diego. Detalle: ' + err.message);
    })
    .apiEnriquecerEmpresas(sectorId, 100);
}

function mostrarMensaje(id, tipo, html) {
  var el = document.getElementById(id);
  el.className = 'mensaje ' + tipo;
  el.innerHTML = html;
}
</script>
</body>
</html>
```

## apps_script/Respuestas.html

```html
<!DOCTYPE html>
<html lang="es">
<head>
<base target="_top">
<?!= incluir('Layout') ?>
</head>
<body>
<main class="app-main">
  <h2 style="margin-top:0;">Respuestas de clientes</h2>

  <div class="panel">
    <label for="filtro"><strong>Mostrar:</strong></label>
    <select id="filtro" class="entrada" style="max-width:300px; margin-top:10px;" onchange="recargar()">
      <option value="interesado">Solo interesados</option>
      <option value="todas">Todas</option>
      <option value="no_interesado">No interesados</option>
      <option value="fuera_oficina">Fuera de oficina</option>
      <option value="spam">Spam</option>
    </select>
  </div>

  <div id="lista-respuestas">
    <div class="mensaje info"><span class="cargando"></span> Cargando respuestas...</div>
  </div>
</main>

<script>
function recargar() {
  var filtro = document.getElementById('filtro').value;
  var contenedor = document.getElementById('lista-respuestas');
  contenedor.innerHTML = '<div class="mensaje info"><span class="cargando"></span> Cargando...</div>';

  google.script.run
    .withSuccessHandler(function (lista) {
      if (lista.length === 0) {
        contenedor.innerHTML = '<div class="mensaje info">No hay respuestas en esta categoria todavia.</div>';
        return;
      }
      var html = '';
      for (var i = 0; i < lista.length; i++) {
        var r = lista[i];
        var clase = ({
          interesado: 'verde',
          no_interesado: 'rojo',
          fuera_oficina: 'amarillo',
          spam: 'gris'
        })[r.clasificacion] || 'gris';
        html += '<div class="panel">';
        html += '<div style="display:flex; justify-content:space-between; align-items:start; gap:12px;">';
        html += '<div><h3 style="margin:0;">' + escapar(r.empresa) + '</h3>';
        html += '<div class="ayuda">' + escapar(r.fecha || '') + '</div></div>';
        html += '<span class="semaforo ' + clase + '">' + escapar(r.clasificacion) + '</span>';
        html += '</div>';
        html += '<p><strong>Resumen IA:</strong> ' + escapar(r.resumen || '(sin resumen)') + '</p>';
        html += '<p><strong>Contacto:</strong> ' + escapar(r.correo || '') +
                ' | ' + escapar(r.telefono || '') + '</p>';
        html += '<details><summary>Ver correo completo</summary>';
        html += '<pre style="white-space:pre-wrap; background:#f9fafb; padding:12px; border-radius:6px;">' +
                escapar(r.cuerpo || '') + '</pre></details>';
        html += '<p style="margin-top:12px;">';
        html += '<button class="boton" onclick="marcar(' + r.id + ', this)">Marcar como gestionada</button>';
        html += '</p></div>';
      }
      contenedor.innerHTML = html;
    })
    .withFailureHandler(function (err) {
      contenedor.innerHTML = '<div class="mensaje error">Algo salio mal: ' + escapar(err.message) + '</div>';
    })
    .apiListarRespuestas(filtro);
}

function marcar(id, boton) {
  boton.disabled = true;
  boton.textContent = 'Marcando...';
  google.script.run
    .withSuccessHandler(function () { recargar(); })
    .withFailureHandler(function (err) {
      boton.disabled = false;
      boton.textContent = 'Reintentar';
      alert('Fallo: ' + err.message);
    })
    .apiMarcarRespuestaGestionada(id);
}

function escapar(texto) {
  if (texto === undefined || texto === null) return '';
  return String(texto)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

recargar();
</script>
</body>
</html>
```

## apps_script/Configuracion.html

```html
<!DOCTYPE html>
<html lang="es">
<head>
<base target="_top">
<?!= incluir('Layout') ?>
</head>
<body>
<main class="app-main">
  <h2 style="margin-top:0;">Configuracion (solo Diego)</h2>

  <div id="pantalla-pin" class="panel">
    <label for="pin"><strong>PIN de 4 digitos</strong></label>
    <input id="pin" class="entrada" type="password" maxlength="4" style="max-width:200px; margin-top:10px;">
    <p><button class="boton" onclick="verificarPin()">Entrar</button></p>
    <div id="pin-error"></div>
  </div>

  <div id="pantalla-config" style="display:none;">
    <div class="panel">
      <h3>Estado de servicios</h3>
      <div id="estado-servicios">
        <span class="cargando"></span> Verificando...
      </div>
    </div>

    <div class="panel">
      <h3>Recordatorios</h3>
      <ul style="font-size:18px; line-height:1.8;">
        <li>La API key de Gemini se guarda en <strong>Apps Script &gt; Configuracion del proyecto &gt; Propiedades del script</strong>. Nunca en codigo.</li>
        <li>Los datos del negocio (productos, telefono, etc.) se editan directo en la hoja <strong>Config</strong>.</li>
        <li>Los logs del sistema estan en la hoja <strong>Logs</strong>.</li>
        <li>El consumo de Gemini esta en la hoja <strong>ConsumoGemini</strong>.</li>
      </ul>
    </div>

    <div class="panel">
      <h3>Enlaces utiles</h3>
      <p>
        <a class="boton" target="_blank" id="enlace-sheet">Abrir Sheet (BD)</a>
        <a class="boton" target="_blank" id="enlace-script">Abrir editor Apps Script</a>
      </p>
    </div>
  </div>
</main>

<script>
function verificarPin() {
  var pin = document.getElementById('pin').value.trim();
  if (!pin) return;
  google.script.run
    .withSuccessHandler(function (ok) {
      if (!ok) {
        document.getElementById('pin-error').innerHTML =
          '<div class="mensaje error">PIN incorrecto.</div>';
        document.getElementById('pin').value = '';
        return;
      }
      document.getElementById('pantalla-pin').style.display = 'none';
      document.getElementById('pantalla-config').style.display = 'block';
      cargarEstado();
    })
    .withFailureHandler(function (err) {
      document.getElementById('pin-error').innerHTML =
        '<div class="mensaje error">' + err.message + '</div>';
    })
    .apiValidarPin(pin);
}

function cargarEstado() {
  google.script.run
    .withSuccessHandler(function (s) {
      var html = '<ul style="font-size:18px;">';
      html += '<li>Gemini: ' + estadoTexto(s.gemini.conectado) + '</li>';
      html += '<li>Gmail: ' + estadoTexto(s.gmail.conectado) + ' <span class="ayuda">(' + s.gmail.nota + ')</span></li>';
      html += '<li>WhatsApp (servicio Node): ' + estadoTexto(s.whatsapp.conectado);
      if (s.whatsapp.error) html += ' <span class="ayuda">' + s.whatsapp.error + '</span>';
      html += '</li>';
      html += '<li>Hojas del Sheet: ' + estadoTexto(s.hojaConfigExiste) + '</li>';
      if (s.propiedadesFaltantes.length > 0) {
        html += '<li class="mensaje error">Faltan propiedades: ' + s.propiedadesFaltantes.join(', ') + '</li>';
      }
      html += '</ul>';
      document.getElementById('estado-servicios').innerHTML = html;
    })
    .apiVerificarServicios();
}

function estadoTexto(ok) {
  return ok
    ? '<span class="semaforo verde">OK</span>'
    : '<span class="semaforo rojo">NO</span>';
}
</script>
</body>
</html>
```

## apps_script/README.md

```markdown
# Apps Script - Dotacion Papa

Toda la aplicacion (sin contar el servicio Node de WhatsApp) corre dentro de
un proyecto de Google Apps Script enlazado a una Hoja de Calculo que sirve
como base de datos.

---

## Pasos de instalacion (Diego, una sola vez)

### 1. Crear la Hoja de Calculo

1. Ve a `https://sheets.google.com` y crea un Sheet nuevo.
2. Nombralo `Dotacion Papa - BD`.
3. Anota la URL (la necesitaras para el papa).

### 2. Crear el proyecto Apps Script

Dos opciones:

**Opcion A - copiar/pegar (mas simple):**

1. En el Sheet recien creado: menu `Extensiones > Apps Script`.
2. Se abre un proyecto nuevo. Borra el `Codigo.gs` por defecto.
3. Por cada archivo en esta carpeta (`apps_script/*.gs` y `apps_script/*.html`):
   - Click en el `+` al lado de "Archivos" en el panel izquierdo.
   - Selecciona `Script` (para `.gs`) o `HTML` (para `.html`).
   - Nombre exacto (sin extension): `Config`, `Inicializar`, `Sheets`, `IA`,
     `Scraper`, `Enriquecer`, `Correos`, `WhatsApp`, `Scheduler`, `Menu`,
     `WebApp`, y los HTML: `Estilos`, `Layout`, `Dashboard`, `Buscar`,
     `Respuestas`, `Configuracion`.
   - Pega el contenido respectivo.
4. Editar el archivo `appsscript.json` (Configuracion del proyecto > tildar
   "Mostrar el archivo de manifiesto"): copiar el contenido de
   `apps_script/appsscript.json`.

**Opcion B - clasp (mas tecnico, versionable):**

```bash
npm install -g @google/clasp
clasp login
cd apps_script
clasp create --type sheets --title "Dotacion Papa"
clasp push
```

Despues sigue con el paso 3.

### 3. Configurar secretos

En el editor de Apps Script:

1. Boton de engranaje (Configuracion del proyecto) > seccion "Propiedades del script".
2. Agrega estas 4 propiedades:

   | Clave | Valor |
   |---|---|
   | `GEMINI_API_KEY` | Tu API key de Gemini (ya rotada y limpia) |
   | `WHATSAPP_NUMERO_PAPA` | `+57XXXXXXXXXX` |
   | `WHATSAPP_SERVICE_URL` | URL del servicio Node (ej. `http://diego-pc.local:3000`) |
   | `CONFIG_PIN` | PIN de 4 digitos para la pantalla de Configuracion |

3. Guarda. Estas propiedades son privadas y nunca tocan el codigo fuente.

### 4. Inicializar el Sheet

1. Vuelve al Sheet (cierra y vuelve a abrir si fuera necesario).
2. Espera a que aparezca el menu **Dotacion Papa** arriba.
3. Click en `Dotacion Papa > 1. Inicializar todo (primera vez)`.
4. Acepta los permisos cuando Google te los pida (Gmail, Sheets, fetch externo).
5. Te creara las 7 hojas: Sectores, Empresas, CorreosEnviados, Respuestas,
   Config, Logs, ConsumoGemini.

### 5. Llenar la hoja Config

En la hoja `Config`, llena las filas:

| clave | valor |
|---|---|
| `empresa.nombre` | Nombre real de la empresa |
| `empresa.productos` | `uniformes\|EPP\|botas\|overoles` (separados por `\|`) |
| `empresa.telefono_contacto` | Telefono con codigo de pais |
| `empresa.correo_envio` | Gmail desde el que se enviaran cotizaciones |
| `empresa.nombre_remitente` | Nombre que firma |

### 6. Configurar triggers automaticos

`Dotacion Papa > Configurar triggers automaticos`. Crea:
- Lectura de respuestas cada 60 min (configurable en hoja Config).
- Envio del lote del dia a las 08:00 (configurable).

### 7. Levantar el servicio Node de WhatsApp

Ver `whatsapp_service/README.md` en este mismo repo.

### 8. Desplegar como aplicacion web

1. En el editor de Apps Script: `Implementar > Nueva implementacion`.
2. Tipo: `Aplicacion web`.
3. Ejecutar como: `Yo` (Diego).
4. Quien tiene acceso: `Solo yo` o `Cualquier persona con el enlace` (segun prefieras).
5. Click `Implementar`. Copia la URL.
6. Esa URL es lo que abre el papa en su navegador o celular.

### 9. Smoke test final

Antes de entregar al papa, ejecuta el menu `Dotacion Papa > Verificar instalacion completa (smoke test)`.
Hace 7 chequeos: propiedades, hojas, config, Gemini, Gmail, WhatsApp y triggers.
Si todos salen OK, ya puedes pasarle la URL al papa.

---

## Estructura de archivos

| Archivo | Proposito |
|---|---|
| `appsscript.json` | Manifiesto (zona horaria, permisos OAuth, web app) |
| `Config.gs` | Lectura de secretos y de la hoja Config |
| `Inicializar.gs` | Crea las 7 hojas la primera vez |
| `Sheets.gs` | CRUD sobre las hojas (reemplaza a SQLite) |
| `IA.gs` | Cliente Gemini Pro/Flash con grounding y logging de tokens |
| `Scraper.gs` | Agente que busca empresas con Gemini + Google Search |
| `Enriquecer.gs` | Visita web y extrae correo, evalua prospecto |
| `Correos.gs` | Envio (GmailApp) y lectura de respuestas |
| `WhatsApp.gs` | POST al servicio Node externo |
| `Scheduler.gs` | Triggers cada hora / diarios |
| `Menu.gs` | Menu personalizado en el Sheet |
| `WebApp.gs` | doGet + endpoints API llamados desde HTML |
| `VerificarInstalacion.gs` | Smoke test (menu "Verificar instalacion completa") |
| `Estilos.html` | CSS compartido |
| `Layout.html` | Header + nav compartidos |
| `Dashboard.html` | Pantalla 1 - KPIs e indicadores |
| `Buscar.html` | Pantalla 2 - busqueda de empresas |
| `Respuestas.html` | Pantalla 3 - respuestas clasificadas |
| `Configuracion.html` | Pantalla 4 - estado de servicios (PIN) |

---

## Modelo de datos (Sheets)

| Hoja | Columnas |
|---|---|
| Sectores | id, nombre, palabras_clave, fecha_busqueda, total_empresas_encontradas |
| Empresas | id, nombre, sector_id, direccion, telefono, sitio_web, correo, ciudad, fuente, validada_por_ia, notas_ia, estado, fecha_creacion |
| CorreosEnviados | id, empresa_id, asunto, cuerpo, fecha_envio, estado_envio, mensaje_id |
| Respuestas | id, correo_enviado_id, empresa_id, asunto, cuerpo, fecha_recepcion, clasificacion_ia, resumen_ia, notificada_whatsapp |
| Config | clave, valor, descripcion |
| Logs | timestamp, nivel, modulo, mensaje |
| ConsumoGemini | timestamp, modelo, tokens_in, tokens_out, costo_usd, modulo |

---

## Limitaciones conocidas de Apps Script

- **Sin scraping de Google Maps**: usa Gemini con grounding. Validamos cada
  empresa con un fetch a su web para descartar alucinaciones.
- **Sin WhatsApp directo**: usa el servicio Node externo. Apps Script no
  puede mantener sesion de WhatsApp Web.
- **Timeout de 6 minutos por ejecucion**: si una busqueda con grounding
  tarda mas, se trunca. Por eso `enriquecerLote` procesa en lotes de 50.
- **UrlFetchApp no renderiza JavaScript**: algunas paginas con SPA no
  daran HTML util al fetch. La mayoria de PyMEs colombianas usa
  WordPress / Wix / sitios estaticos, asi que esto rara vez es problema.

---

## Soporte

- Logs del sistema: hoja `Logs` (o `View > Executions` en el editor).
- Consumo de Gemini: hoja `ConsumoGemini`.
- Si algo falla en produccion, el papa vera "Algo salio mal, avisale a Diego".
- Para problemas, abre issue en el repo de GitHub.
```

## apps_script/.clasp.json.ejemplo

```json
{
  "_comentario": "Copia este archivo como .clasp.json (sin .ejemplo) y reemplaza scriptId con el ID real de tu proyecto Apps Script. .clasp.json esta en .gitignore — nunca se sube al repo.",
  "scriptId": "REEMPLAZAR_CON_EL_ID_DEL_PROYECTO_APPS_SCRIPT",
  "rootDir": "."
}
```

## whatsapp_service/package.json

```json
{
  "name": "dotacion-papa-whatsapp",
  "version": "1.0.0",
  "description": "Servicio Node para enviar mensajes de WhatsApp al papa cuando llega un interesado",
  "main": "index.js",
  "scripts": {
    "start": "node index.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "whatsapp-web.js": "^1.23.0",
    "qrcode-terminal": "^0.12.0"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
```

## whatsapp_service/index.js

```javascript
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const express = require('express');
const fs = require('fs');
const path = require('path');

// ─── Config ──────────────────────────────────────────────────────────────────
const PUERTO = process.env.PUERTO || 3000;
const LOG_FILE = path.join(__dirname, 'log.txt');

// ─── Logger ───────────────────────────────────────────────────────────────────
function log(nivel, mensaje) {
  const linea = `${new Date().toISOString()} [${nivel}] ${mensaje}`;
  console.log(linea);
  fs.appendFileSync(LOG_FILE, linea + '\n');
}

// ─── Cliente WhatsApp ─────────────────────────────────────────────────────────
let clienteListoPromesa;
let clienteListo = false;

const cliente = new Client({
  authStrategy: new LocalAuth({ dataPath: path.join(__dirname, '.wwebjs_auth') }),
  puppeteer: {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  }
});

cliente.on('qr', (qr) => {
  log('INFO', 'Escanea el codigo QR con el WhatsApp del papa:');
  qrcode.generate(qr, { small: true });
});

cliente.on('ready', () => {
  clienteListo = true;
  log('INFO', 'WhatsApp conectado y listo para enviar mensajes.');
});

cliente.on('disconnected', (razon) => {
  clienteListo = false;
  log('WARN', `WhatsApp desconectado: ${razon}. Reconectando...`);
  cliente.initialize().catch((err) => log('ERROR', `Error al reconectar: ${err.message}`));
});

cliente.on('auth_failure', (msg) => {
  clienteListo = false;
  log('ERROR', `Fallo de autenticacion: ${msg}. Borra .wwebjs_auth/ y vuelve a escanear el QR.`);
});

clienteListoPromesa = new Promise((resolve) => {
  cliente.once('ready', resolve);
});

cliente.initialize().catch((err) => {
  log('ERROR', `Error al inicializar cliente WhatsApp: ${err.message}`);
});

// ─── Express API ──────────────────────────────────────────────────────────────
const app = express();
app.use(express.json());

// GET /estado → { conectado: bool }
app.get('/estado', (_req, res) => {
  res.json({ conectado: clienteListo });
});

// POST /enviar body: { numero: "+57XXXXXXXXXX", mensaje: "texto" }
app.post('/enviar', async (req, res) => {
  const { numero, mensaje } = req.body || {};

  if (!numero || !mensaje) {
    return res.status(400).json({ ok: false, error: 'Faltan campos: numero y mensaje' });
  }

  if (!clienteListo) {
    log('WARN', `Intento de envio a ${numero} pero WhatsApp no esta listo.`);
    return res.status(503).json({ ok: false, error: 'WhatsApp no esta conectado todavia.' });
  }

  // Normalizar numero: quitar +, agregar @c.us
  const chatId = numero.replace(/\D/g, '') + '@c.us';

  try {
    await cliente.sendMessage(chatId, mensaje);
    log('INFO', `Mensaje enviado a ${numero}`);
    res.json({ ok: true });
  } catch (err) {
    log('ERROR', `Error enviando a ${numero}: ${err.message}`);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ─── Arranque ─────────────────────────────────────────────────────────────────
app.listen(PUERTO, () => {
  log('INFO', `Servicio HTTP escuchando en puerto ${PUERTO}`);
  log('INFO', 'Esperando que WhatsApp se conecte...');
});
```

## whatsapp_service/README.md

```markdown
# Servicio WhatsApp — Dotacion Papa

Servicio Node.js que recibe mensajes de Apps Script y los envia por WhatsApp al papa.

---

## Requisitos

- Node.js 18 o superior
- PC o servidor que se quede prendido (puede ser el PC de Diego)

## Primera vez

```bash
cd whatsapp_service
npm install
node index.js
```

Al arrancar por primera vez aparece un **codigo QR en la terminal**. Escanea ese codigo con el WhatsApp del papa:

1. Abre WhatsApp en el celular del papa.
2. Toca los tres puntos arriba a la derecha → "Dispositivos vinculados".
3. Toca "Vincular un dispositivo".
4. Apunta la camara al QR de la terminal.

Una vez escaneado, el servicio dice `WhatsApp conectado y listo`. La sesion queda guardada en `.wwebjs_auth/` y no necesitas escanear de nuevo.

## Veces siguientes

```bash
cd whatsapp_service
node index.js
```

Arranca solo, sin pedir QR.

## Endpoints

| Metodo | Ruta | Descripcion |
|---|---|---|
| `GET` | `/estado` | Devuelve `{ "conectado": true/false }` |
| `POST` | `/enviar` | Envia un mensaje. Body: `{ "numero": "+57XXXXXXXXXX", "mensaje": "texto" }` |

## Variables de entorno opcionales

| Variable | Defecto | Descripcion |
|---|---|---|
| `PUERTO` | `3000` | Puerto donde escucha el servicio |

## Logs

Los logs se guardan en `log.txt` (gitignoreado).

## Problemas comunes

**El QR expiro antes de escanearlo**
→ Detener el servicio (`Ctrl+C`), volver a correr `node index.js`.

**"Fallo de autenticacion"**
→ Borrar la carpeta `.wwebjs_auth/` y volver a escanear el QR.

**WhatsApp actualizo y dejo de funcionar**
→ Correr `npm update whatsapp-web.js` y reiniciar.

**El papa no recibe mensajes**
→ Verificar que el numero en Apps Script este en formato `+57XXXXXXXXXX`.
→ Revisar `log.txt` para ver el error exacto.
→ Llamar `GET /estado` para confirmar que el servicio esta conectado.
```

## MANUAL_PAPA.md

```markdown
# Manual del Papa — Dotacion Papa

> Manual simple para usar el sistema todos los dias.
> Si algo no entiende, llamele a Diego.

---

## 1. Que hace el sistema

Le ayuda a vender mas dotacion (uniformes, EPP, botas, overoles) **sin tener que buscar empresas a mano ni escribir correos uno por uno**.

El sistema:
- Busca empresas en internet por usted.
- Les escribe un correo personalizado a cada una.
- Lee las respuestas que llegan.
- Le avisa por **WhatsApp** cuando alguien esta interesado.

---

## 2. Como entrar al sistema

1. En el escritorio del computador, **doble clic** al icono **Dotacion Papa**.
2. Se abre el navegador (Chrome).
3. Aparecen **4 pantallas grandes** con botones.

Tambien lo puede abrir desde el celular: el enlace que le dio Diego, guardado como acceso directo en la pantalla principal del telefono.

---

## 3. Las 4 pantallas

### Pantalla 1: Inicio (Dashboard)

Aqui ve los **numeros del dia**:

- Cuantas empresas tiene en total.
- Cuantos correos se enviaron esta semana.
- Cuantas respuestas no ha leido.
- Cuanto credito de IA queda (con semaforo).

**Semaforo de credito:**
- Verde = bien
- Amarillo = se esta acabando (avisar a Diego)
- Rojo = se acabo, llamar a Diego ya

### Pantalla 2: Buscar empresas

Para encontrar empresas nuevas de un sector.

**Como buscar:**
1. Click en el boton **Buscar**.
2. Escriba el sector. Ejemplo: `panaderias en Bogota`.
3. Escriba el limite (cuantas empresas quiere). Por defecto **20** esta bien.
4. Click en **Buscar**.
5. Espere 1-2 minutos. La pantalla muestra cuantas encontro.
6. Despues click en **Enriquecer** para que el sistema visite cada web y saque el correo.

### Pantalla 3: Respuestas

Aqui ve los correos que **respondieron** a sus cotizaciones.

- Verde = **Interesado** (este si llama!)
- Rojo = no interesado
- Amarillo = fuera de oficina (vuelva a contactar en unos dias)
- Gris = spam

Para cada respuesta puede:
- Ver el resumen que hizo la IA.
- Abrir el correo completo (boton **Ver correo completo**).
- Marcarla como **gestionada** una vez la llame.

### Pantalla 4: Configuracion

**Esta pantalla es de Diego.** Le pide un PIN de 4 digitos.
Si necesita revisar algo aqui, llamele a Diego.

---

## 4. Su rutina diaria sugerida

**En la manana (10 minutos):**
1. Abra el icono **Dotacion Papa**.
2. Vaya a **Respuestas**.
3. Filtre por **Solo interesados**.
4. Llame a los que aparezcan en verde.
5. Marquelos como gestionados.

**En la tarde (5 minutos):**
1. Revise el celular: si llego WhatsApp del sistema, es un **interesado nuevo**.
2. Abra el sistema y entre a Respuestas para ver el correo completo.
3. Llame.

**El sistema solo (sin que usted haga nada):**
- Cada hora lee las respuestas nuevas.
- Todos los dias a las 8 AM envia un lote nuevo de cotizaciones.
- Si alguien dice que esta interesado, le llega WhatsApp en menos de 1 hora.

---

## 5. Si llega un WhatsApp del sistema

Se ve asi:

```
INTERESADO NUEVO

Empresa: Panaderia La Espiga
Resumen: Quieren cotizacion para 20 uniformes de panadero.
Contacto: ventas@panaderialaespiga.com
Telefono: 3001234567
```

**Que hacer:**
1. Llamar al telefono que aparece.
2. O contestar el correo del cliente desde Gmail.
3. Despues entrar al sistema y marcar la respuesta como **gestionada**.

---

## 6. Cosas que **NO** debe hacer

- **No** apague el computador donde corre el sistema (si Diego se lo dijo, dejelo prendido).
- **No** borre correos del Gmail del negocio. El sistema los necesita para detectar respuestas.
- **No** abra la **hoja de calculo de Google** y borre filas. Si necesita cambiar algo, llamele a Diego.
- **No** comparta el enlace del sistema con nadie. Es solo para usted.
- **No** comparta el codigo PIN con nadie. Solo Diego lo necesita.

---

## 7. Si algo sale mal

La pantalla puede mostrar:

> **Algo salio mal, avisele a Diego.**

Cuando vea esto:
1. **Tome una foto** de la pantalla con el celular.
2. Mandeselo a Diego por WhatsApp.
3. **No siga tocando botones** hasta que Diego le diga.

---

## 8. Numeros importantes

| Quien | Para que |
|---|---|
| Diego (hijo) | Cualquier problema con el sistema |
| Gmail del negocio | Aqui llegan las respuestas |
| WhatsApp del negocio | Aqui le llegan los avisos del sistema |

---

## 9. Recordatorio de seguridad

- **No** comparta su contrasena de Gmail con nadie.
- **No** abra correos raros que pidan "verificar" o "actualizar" su cuenta.
- Si el sistema le pide algo raro, **no lo haga sin preguntarle a Diego primero**.

---

**Listo. Ya sabe usar el sistema.**
Cuando aprenda esto en una semana, ya no necesita el manual.
```

## README.md (raiz del repo)

```markdown
# Dotacion Papa

Sistema de prospeccion B2B y envio de cotizaciones automatizado para una PYME de dotacion en Bogota.

> **Arquitectura actual: Google Sheets + Apps Script + servicio Node externo de WhatsApp.**
> El plan original con Python/Streamlit/SQLite quedo archivado (ver carpeta `src/` y `tests/`).

---

## Que hace

1. **Busca empresas** en internet con Gemini 2.5 Pro + Google Search grounding, segun el sector que Diego indique.
2. **Valida cada empresa** con un fetch a su sitio web para descartar las que Gemini "alucina".
3. **Enriquece** los datos visitando la web y extrayendo el correo con IA.
4. **Envia cotizaciones personalizadas** por Gmail (sin SMTP ni App Password — usa el OAuth integrado de Apps Script).
5. **Lee respuestas** entrantes via Gmail API y las clasifica con IA en interesado / no interesado / fuera de oficina / spam.
6. **Notifica al WhatsApp del papa** cuando llega un interesado, via un servicio Node externo.

El papa abre un enlace en su navegador (PC o celular) y ve 4 pantallas grandes en espanol. Nada que instalar.

---

## Arquitectura

```
+----------------------------------------------------------+
|  GOOGLE SHEETS (base de datos)                           |
|  7 hojas: Sectores, Empresas, CorreosEnviados,           |
|           Respuestas, Config, Logs, ConsumoGemini        |
+----------------------------------------------------------+
              |
              v
+----------------------------------------------------------+
|  APPS SCRIPT (toda la app)                               |
|  - 12 archivos .gs  (logica de negocio)                  |
|  - 6 archivos .html (UI con 4 pantallas)                 |
|  - Triggers automaticos (cada hora / diario)             |
|  - Llama a Gemini via UrlFetchApp                        |
+----------------------------------------------------------+
              |
              v
+----------------------------------------------------------+
|  SERVICIO NODE EXTERNO (en PC de Diego o servidor)       |
|  whatsapp-web.js                                         |
|  Recibe POST /enviar desde Apps Script                   |
|  Dispara mensaje al WhatsApp del papa                    |
+----------------------------------------------------------+
```

---

## Estructura del repo

| Carpeta | Proposito |
|---|---|
| `apps_script/` | **Codigo de la aplicacion** (Apps Script + HTML). |
| `whatsapp_service/` | Servicio Node con whatsapp-web.js. |
| `docs/` | Capturas para el manual del papa. |
| `src/`, `tests/`, `db/`, `config/`, `plantillas/`, `requirements.txt` | Codigo Python del plan original (archivado, no se usa en la arquitectura actual). |

---

## Setup (Diego, una sola vez)

Lee `apps_script/README.md`. Resumen:

1. Crear Sheet en `sheets.google.com`.
2. Abrir `Extensiones > Apps Script`, pegar los archivos de `apps_script/` (o usar `clasp push`).
3. En Apps Script: `Configuracion del proyecto > Propiedades del script`, agregar:
   - `GEMINI_API_KEY` (la clave rotada, limpia)
   - `WHATSAPP_NUMERO_PAPA`
   - `WHATSAPP_SERVICE_URL`
   - `CONFIG_PIN`
4. En el Sheet: menu `Dotacion Papa > 1. Inicializar todo`.
5. Llenar la hoja Config con datos del negocio.
6. Menu `Dotacion Papa > Configurar triggers automaticos`.
7. Levantar el servicio Node (`whatsapp_service/`).
8. `Implementar > Nueva implementacion > Aplicacion web`. Copiar URL para el papa.

---

## Estado actual del proyecto

| Hito (plan ejecutable) | Estado | Comentario |
|---|---|---|
| 0 - Bootstrap repo | listo | Estructura, .gitignore, requirements |
| 1 - Capa de datos | listo (Python) + listo (Apps Script) | El usuario pivoto a Sheets en lugar de SQLite |
| 2 - Cliente Gemini | listo (Apps Script con Pro/Flash + grounding + tokens) | |
| 3 - Scraper | listo (Apps Script con Gemini grounding) | Reemplaza Playwright |
| 4 - Enriquecimiento | listo (Apps Script) | UrlFetchApp + IA |
| 5 - Correos | listo (Apps Script con GmailApp) | Sin SMTP/IMAP |
| 6 - Servicio Node WhatsApp | pendiente | Se mantiene del plan original |
| 7 - Cliente WhatsApp | listo (Apps Script POST al servicio Node) | |
| 8 - Scheduler | listo (triggers Apps Script) | |
| 9 - UI | listo (4 pantallas HtmlService) | |
| 10 - Empaquetado | N/A | Apps Script vive en la nube, no se empaqueta |
| 11 - Manual del papa | pendiente | PDF con capturas |

---

## Seguridad

- La API key de Gemini se guarda en `PropertiesService` (visible solo para Diego). **Nunca en codigo, nunca en chat, nunca en captura.**
- Si una clave se filtra: rotarla en `https://aistudio.google.com/apikey` inmediatamente.
- El PIN de Configuracion en el mismo `PropertiesService`.
- La sesion de WhatsApp del servicio Node queda en `.wwebjs_auth/` (gitignored).
- El Sheet de base de datos solo se comparte con Diego y el papa.

---

## Creditos Gemini

Proyecto con ~$1.000.000 COP (~$250 USD) en creditos prepago, validos por 2 meses.

- Modelo Pro (`gemini-2.5-pro`) para tareas sensibles: scraping con grounding, redaccion, clasificacion.
- Modelo Flash (`gemini-2.5-flash`) para extraccion masiva de correos.
- Consumo registrado por llamada en hoja `ConsumoGemini`.
- Dashboard muestra saldo restante en USD y porcentaje.
- Cuando se agoten: en hoja Config poner `ia.forzar_flash = true`. Todo cae a Flash (tier gratis ~1500 req/dia).

---

## Soporte

- Logs del sistema: hoja `Logs` o `View > Executions` en el editor de Apps Script.
- Consumo de Gemini: hoja `ConsumoGemini`.
- Para problemas, abrir issue en el repo.

---

## Codigo Python archivado

La carpeta `src/`, `tests/`, etc. contiene la implementacion Python que se hizo
en los hitos 0-1 antes de que el usuario pivotara a Apps Script. Se conserva
como referencia / fallback. Si en el futuro se quiere migrar de vuelta a
Python local, esta base ya esta hecha (incluye scraper Playwright, capa SQLite,
modelos, 16 tests verdes).

Para correr la version Python: `pip install -r requirements.txt && pytest tests/`.
```

## .gitignore

```
# Secretos y configuracion sensible
.env
.env.local
.env.*.local

# Base de datos y logs (datos locales del papa)
db/*.db
db/*.db-journal
db/*.db-wal
db/*.db-shm
logs/*.log
logs/*.csv

# Python
__pycache__/
*.pyc
*.pyo
*.pyd
venv/
.venv/
env/
*.egg-info/
.pytest_cache/
.coverage
htmlcov/
.tox/
.mypy_cache/
.ruff_cache/

# Node (servicio WhatsApp)
node_modules/
whatsapp_service/.wwebjs_auth/
whatsapp_service/.wwebjs_cache/
whatsapp_service/log.txt
npm-debug.log*
yarn-debug.log*

# clasp (Apps Script CLI) - el ID del proyecto NO debe estar en git
apps_script/.clasp.json
apps_script/.clasprc.json

# Editores e IDE
.vscode/
.idea/
*.swp
*.swo
*~
.DS_Store
Thumbs.db

# Playwright
playwright-report/
test-results/
.playwright/

# Artefactos
dist/
build/
*.egg
```

---

FIN DEL ARCHIVO UNICO. Contiene plan completo + todo el codigo de la app.
