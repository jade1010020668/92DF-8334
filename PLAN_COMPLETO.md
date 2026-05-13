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
