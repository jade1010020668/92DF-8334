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
