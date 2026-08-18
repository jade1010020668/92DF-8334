# Dotacion Papa

> 📌 **TODO el proyecto en un solo documento: [`DOCUMENTO_MAESTRO.md`](DOCUMENTO_MAESTRO.md)** (los dos sistemas, la base de datos de 11.031 correos, seguridad y pendientes).
>
> **La app vigente es [DotaciónPro](dotacion-app/README.md)** (React, en `dotacion-app/`), **EN VIVO** en https://morales101002-dotacionpro.static.hf.space/ — desarrollo local: `cd dotacion-app && npm install && npm run dev`.
> Todo lo que sigue abajo (Apps Script + Google Sheets, «Dotación Papá») es el segundo sistema: código listo, pendiente de instalación (~30 min).

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
