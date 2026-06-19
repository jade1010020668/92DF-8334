# DotaciónPro

Aplicación web para **Dotaciones El Manantial** (Carrera 34 # 2-62, Bogotá): organiza la prospección de clientes y el envío de cotizaciones de dotación industrial y EPP (guantes, cascos, calzado de seguridad, overoles, gafas, protección respiratoria, arneses, chalecos reflectivos).

Reemplaza dos procesos manuales que desgastaban al negocio: recorrer zonas industriales puerta a puerta ofreciendo el portafolio, y buscar correos de empresas a mano en Google para escribirles uno por uno. Con DotaciónPro toda la lista de empresas vive en un solo lugar, los mensajes se generan solos y Gmail o WhatsApp se abren con un clic con el texto ya escrito — solo queda revisar y enviar. La app funciona 100 % en el navegador, sin servidor: los datos se guardan en el propio dispositivo.

---

## Funcionalidades

- **Lista organizada de empresas** con datos de contacto, sector, dirección y notas. Detecta duplicados al agregar (por nombre y dirección).
- **Control de estados** de cada empresa: Pendiente → Enviado → Respondió → Cliente / Rechazado. Las fechas de envío y respuesta se registran solas al cambiar el estado.
- **Mensajes generados automáticamente**: correo formal de cotización y mensaje de WhatsApp cercano con emojis, personalizados con el nombre de la empresa, el contacto y el sector. Incluye variantes cortas de seguimiento.
- **Gmail y WhatsApp con un clic**: la app abre Gmail con el correo ya redactado (destinatario, asunto y cuerpo) o WhatsApp con el mensaje listo. Los celulares colombianos se normalizan solos al formato que exige WhatsApp (agrega el indicativo 57).
- **Importar y exportar Excel**: sube tu lista existente de empresas (acepta varios nombres de columna, ver tabla más abajo) y descarga toda la lista como copia de seguridad.
- **Búsqueda de empresas en el mapa**: escribe por ejemplo "plásticos Bogotá" y la app trae empresas reales con dirección, teléfono y sitio web. Funciona gratis con OpenStreetMap y mejora mucho con una clave de Google (ver sección dedicada).
- **PDF de cotización**: genera y descarga una cotización formal con membrete, número consecutivo (formato `COT-fecha-NNN`), tabla del catálogo con precios "desde" en COP, condiciones comerciales y validez de 15 días.
- **Recordatorios de seguimiento**: la app avisa qué empresas llevan X días (configurable, 5 por defecto) sin responder desde el envío, para mandarles el mensaje de seguimiento.
- **Estadísticas de conversión**: totales por estado, tasa de respuesta, tasa de conversión y desglose por sector para saber dónde funciona mejor la prospección.
- **Configuración del negocio**: datos de la empresa (nombre, dirección, teléfono, correo), quién firma los mensajes, frase de descuentos por volumen, días de seguimiento, catálogo de productos con precio de referencia (0 = "a convenir") y clave opcional de Google Maps.

---

## Cómo correrla en tu computador

Necesitas [Node.js](https://nodejs.org) 18 o superior.

```bash
cd dotacion-app
npm install
npm run dev
```

Abre http://localhost:5173 en el navegador.

Otros comandos útiles:

```bash
npm test       # corre las pruebas (vitest)
npm run build  # genera la versión de producción en dist/
```

---

## Desplegar GRATIS en Vercel (paso a paso, sin terminal)

Vercel es un servicio que publica la app en internet con una URL propia, gratis para este tipo de proyectos. Este repo ya trae el archivo `vercel.json` con todo configurado.

1. Entra a [vercel.com](https://vercel.com) y crea una cuenta con el GitHub de Diego (botón "Continue with GitHub").
2. En el panel de Vercel, clic en **"Add New… → Project"** e importa este repositorio de GitHub.
3. **Paso crítico:** en **"Root Directory"** haz clic en "Edit" y elige la carpeta **`dotacion-app`**. Si te saltas esto, el despliegue falla porque la app no está en la raíz del repo.
4. En "Framework Preset" Vercel detecta **Vite** automáticamente; no hay que cambiar nada más.
5. Clic en **Deploy** y espera un par de minutos.
6. Vercel te da una URL del estilo `https://tu-proyecto.vercel.app`. Compártela con el papá y, en su celular, ábrela en el navegador y usa **"Agregar a pantalla de inicio"**: queda como un ícono más, igual que una app instalada.

De ahí en adelante, **cada `git push` a la rama redespliega la app solo** — no hay que repetir nada de esto.

---

## Publicar en Hugging Face Spaces (URL pública alternativa)

Además de Vercel, el repo trae un workflow de GitHub Actions
(`.github/workflows/publicar-hf-space.yml`) que publica la app como **Space
estático** de Hugging Face en cada actualización. Configuración una sola vez:

1. Entra a [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens)
   con tu cuenta (MORALES101002) y crea un token: **"Create new token" → tipo
   "Write"**. Cópialo (no lo compartas ni lo pegues en chats o código).
2. En GitHub: este repositorio → **Settings → Secrets and variables → Actions →
   "New repository secret"** → nombre `HF_TOKEN`, valor el token copiado.
3. Ve a la pestaña **Actions** del repo → workflow **"Publicar en Hugging Face
   Space"** → **"Run workflow"** (o simplemente haz merge de un cambio en
   `dotacion-app/`).

El workflow corre las pruebas, construye la app, **crea el Space si no existe**
y sube el resultado. URLs resultantes:

- Página del Space: <https://huggingface.co/spaces/MORALES101002/dotacionpro>
- Vista directa (pantalla completa): <https://morales101002-dotacionpro.static.hf.space>

**Alternativa manual sin workflow:** crea el Space en
[huggingface.co/new-space](https://huggingface.co/new-space) (SDK: **Static**),
corre `npm run build` y arrastra el **contenido** de la carpeta `dist/` a
"Files → Add file → Upload files" del Space.

> Nota: los datos viven en el navegador **por dominio**. La lista que tu papá
> arme en la URL de Vercel no aparece en la de Hugging Face y viceversa —
> elijan una URL como la oficial del día a día (el Excel de
> exportar/importar permite moverla si algún día cambian).

---

## Búsqueda de empresas en el mapa

### Cerca de mi negocio (lo más útil para vender)

La pestaña **Buscar en el mapa** abre por defecto en el modo **"Cerca de mi negocio"**:
toma la dirección que pusiste en Configuración, la ubica en el mapa y trae las
empresas que **necesitan dotación** (talleres, ferreterías, fábricas, carpinterías,
restaurantes…) dentro de un radio de **2, 5 o 10 km**, ordenadas de la más cercana
a la más lejana y marcando las de **prioridad alta**. Así el vendedor visita
clientes a pocas cuadras en lugar de cruzar la ciudad. Funciona gratis con
OpenStreetMap; no requiere clave.

### Por tipo de empresa (gratis)

El otro modo busca por palabra (p. ej. "plásticos") usando **OpenStreetMap
(Overpass + Nominatim)**: gratis y sin registro. A cambio:

- La cobertura de teléfonos en Colombia es limitada (OSM tiene pocos); los nombres,
  direcciones y tipos sí están bien.
- Es un servicio de cortesía: si buscas muy seguido puede pedir esperar un momento;
  la app reintenta sola en un servidor espejo.

Si no escribes ciudad, la app le agrega sola la ciudad configurada (Bogotá por defecto).

### Mejorarla con Google Places API (New)

Con una clave de Google los resultados son mucho más completos (incluyen teléfono y sitio web). Pasos:

1. Entra a [console.cloud.google.com](https://console.cloud.google.com) con una cuenta de Google y crea un proyecto.
2. En "APIs y servicios", busca y habilita **"Places API (New)"** (ojo: la "New", no la clásica).
3. En "Credenciales", crea una **clave de API** (API key).
4. **Restringe la clave** (obligatorio, ver advertencia abajo): en la configuración de la clave, en "Restricciones de aplicaciones", elige "Sitios web" y agrega la URL de Vercel (por ejemplo `https://tu-proyecto.vercel.app/*`). En "Restricciones de API", limita la clave a "Places API (New)".
5. Copia la clave y pégala en la pantalla de **Configuración** de la app.

Si Google falla en algún momento (clave vencida, sin cupo), la app usa OpenStreetMap de respaldo automáticamente y te lo avisa.

**Advertencias de seguridad:**

- Como la app no tiene servidor, la clave queda guardada **en el navegador** y viaja en las búsquedas: cualquiera con acceso a la página podría verla. Por eso **restringirla por dominio no es opcional, es obligatorio** — así, aunque alguien la copie, no le sirve fuera de tu URL.
- Google da un **crédito mensual gratuito amplio** que sobra para el volumen de búsquedas de este negocio; con la restricción puesta, no deberías pagar nada. Aun así, revisa el panel de facturación de Google de vez en cuando.

---

## Envío automático de correos con Brevo (opcional)

Por defecto la app abre Gmail con todo escrito y **tú das el clic final** —
máximo control. Si prefieres que los correos salgan solos (uno a uno o todos
de una vez desde la campaña), configura Brevo (gratis hasta **300 correos al
día**, de sobra para la meta de 50-100):

1. Crea una cuenta gratis en [brevo.com](https://www.brevo.com).
2. En Brevo agrega como **remitente verificado** el mismo correo que pusiste
   en «Datos de tu empresa» (Senders → Add a sender) y confírmalo desde tu
   bandeja. Sin este paso Brevo rechaza los envíos.
3. Menú del perfil → **SMTP & API → API Keys → Generate a new API key**.
4. Pega la clave en la pantalla de **Configuración** de la app y guarda.

Con la clave puesta, la campaña muestra el botón **«Enviar correo ya»** y la
opción **«Enviar TODOS los pendientes con correo de una vez»** (con barra de
progreso, pausa de ~1 segundo entre envíos y botón Detener).

**Advertencias:** la clave queda guardada solo en el navegador — no la
compartas; y aunque el envío sea automático, empieza con lotes pequeños
(20-30/día) para que el dominio del correo gane reputación y no caiga en spam.

---

## Formato del Excel de importación

La app lee la **primera hoja** del archivo (.xlsx o .csv). La primera fila debe traer los encabezados; no importan mayúsculas, tildes ni espacios. Columnas aceptadas y sus sinónimos:

| Campo | Encabezados aceptados |
|---|---|
| Nombre (obligatorio) | `nombre`, `empresa`, `razón social`, `nombre empresa` |
| Sector | `sector`, `industria`, `actividad` |
| Email | `email`, `correo`, `correo electrónico`, `email contacto` |
| Teléfono | `teléfono`, `tel`, `celular`, `móvil`, `whatsapp` |
| Contacto | `contacto`, `persona de contacto`, `nombre contacto` |
| Dirección | `dirección` |
| Estado | `estado` (Pendiente, Enviado, Respondió, Cliente, Rechazado; también entiende "venta"/"vendido" como Cliente y "no interesado"/"no respondió" como Rechazado) |
| Notas | `notas`, `observaciones` |

Las filas sin nombre se ignoran y las empresas repetidas (mismo nombre y dirección) no se duplican. Si prefieres empezar de cero, el botón **"Plantilla"** de la app descarga un Excel vacío con las columnas correctas y una fila de ejemplo.

---

## Dónde viven los datos

Los datos se guardan en el **localStorage del navegador** de cada dispositivo (un espacio de almacenamiento que el navegador le da a cada página web). Eso implica:

- **No hay servidor ni cuenta de usuario**: tu lista de empresas nunca sale del dispositivo. Solo la búsqueda en el mapa consulta servicios externos (OpenStreetMap o Google).
- **Los datos NO se comparten entre el PC y el celular**: cada dispositivo tiene su propia lista. Para pasarla de uno a otro, exporta el Excel en un dispositivo e impórtalo en el otro.
- **Recomendación**: exporta el Excel **una vez por semana** como copia de seguridad y guárdalo en el correo o en Drive.

---

## Preguntas frecuentes

**¿Se borran mis datos si cierro el navegador o apago el computador?**
No. Los datos quedan guardados en el dispositivo y siguen ahí al volver a abrir la app. Solo se pierden si borras los "datos de navegación / datos de sitios" del navegador — por eso la copia semanal en Excel.

**¿Por qué la búsqueda en el mapa trae pocos resultados?**
Sin clave, la app usa OpenStreetMap, que es gratis pero tiene poca información de empresas en Colombia. Configura la clave de Google Places API (New) — ver sección de arriba — y los resultados mejoran mucho.

**¿Puedo usar la misma lista en el PC y en el celular?**
Sí, pero no se sincroniza sola: exporta el Excel en un dispositivo e impórtalo en el otro. La importación no duplica las empresas que ya existían.

**¿La app envía los correos y WhatsApp automáticamente?**
No, y es a propósito: la app deja todo escrito y abre Gmail o WhatsApp listos, pero **tú das el clic final de enviar**. Así revisas cada mensaje antes de que salga, mantienes control total y evitas que las cuentas se marquen como spam por envíos masivos.

**¿Cuánto cuesta mantener la app funcionando?**
Nada: Vercel es gratis para este uso, OpenStreetMap es gratis, y la clave de Google (opcional) entra en el crédito mensual gratuito de Google para este volumen.
