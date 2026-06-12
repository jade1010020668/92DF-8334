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

## Búsqueda de empresas en el mapa

### Sin configurar nada (gratis)

Por defecto la búsqueda usa **OpenStreetMap (Nominatim)**: es gratis y no pide registro ni clave. A cambio:

- La cobertura de empresas en Colombia es limitada — trae menos resultados que Google y pocos teléfonos.
- Es un servicio de cortesía: admite más o menos **1 búsqueda por segundo**. Si buscas muy seguido puede responder con error; espera un momento y reintenta.

Si en la búsqueda no escribes ciudad, la app le agrega sola la ciudad configurada (Bogotá por defecto).

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
