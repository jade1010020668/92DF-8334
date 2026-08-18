# 🦺 EMPIEZA AQUÍ — Dotaciones El Manantial
## La máquina para conseguir clientes nuevos. Todo listo; falta un paso tuyo.

---

## ¿Qué es esto en 30 segundos?

Una **máquina que consigue clientes sola**, en la nube, sin computador prendido:

```
La máquina toca puertas          El papá SOLO responde
(correo automático a empresas  → (cuando llega un interesado,
 de Bogotá + catálogo web +      contesta en <5 min y cotiza).
 Google) → le pasa cada           La tecnología es invisible.
 interesado EN BANDEJA
```

**Objetivo:** 2-3 clientes nuevos el primer mes, 5+/mes del segundo en adelante.
**Trabajo del papá:** ~30 min al día, solo responder y cerrar.

---

## 👉 TUS SIGUIENTES PASOS (Diego)

### 1. Instalar el Motor de correos — ~1 hora, una sola vez ⭐ lo importante
Sigue **`datos/GUIA_MOTOR_VENTAS.md`**. Es crear un Gmail del negocio, pegar un
código y darle ACTIVAR. La guía te lleva de la mano, paso por paso. Cuando
termines, la máquina empieza a trabajar sola.

> Este paso **solo lo puedes dar tú**: Google exige que el dueño de la cuenta
> acepte los permisos en pantalla. No hay forma de automatizarlo.

### 2. Poner el token de Hugging Face en GitHub — 2 minutos 🔑
Sin esto, los cambios del catálogo (por ejemplo las fotos nuevas de producto)
**no llegan solos** a la página que ven los clientes.

1. Crea un token nuevo en **huggingface.co/settings/tokens** → tipo **Write**.
   *(Aprovecha y borra el token viejo: quedó escrito en un chat.)*
2. En GitHub: **Settings → Secrets and variables → Actions → New repository
   secret**. Nombre exacto: **`HF_TOKEN`**. Pega el token. Guardar.
3. Listo. Desde ahí, cada cambio del catálogo se publica solo.
   *(Para publicar de inmediato: pestaña **Actions** → «Publicar la app en
   Hugging Face Space» → **Run workflow**.)*

### 3. Con calma esa misma semana
Crear la ficha de Google Business (20 min, textos listos en
`datos/GOOGLE_BUSINESS_TEXTOS.md`) y tomar fotos reales de los productos
**enviadas como archivo/ZIP** (las de ahora son de banco de imágenes con
licencia comercial y se pueden reemplazar cuando quieras).

---

## 📂 El paquete completo (qué es cada archivo)

### Para ENCENDER la máquina
| Archivo | Para qué |
|---|---|
| **`datos/GUIA_MOTOR_VENTAS.md`** | ⭐ La instalación paso a paso (empieza por aquí) |
| `apps_script/MotorVentas.gs` | El código del motor (se pega en Google) |
| `apps_script/PanelMotor.html` | El panel del motor para el celular (se pega junto al motor) |
| `datos/EMPRESAS_PARA_SHEET.csv` | Las 11.024 empresas que el motor va a contactar, las mejores primero |

### Para el PAPÁ (imprimir)
| Archivo | Para qué |
|---|---|
| **`datos/MANUAL_PAPA_MOTOR.md`** | Su rutina en 1 página (responder y cerrar) |
| `datos/GUIONES_PAPA.md` | Qué decir en cada situación de venta |
| `datos/GUION_RESENA_GOOGLE.md` | Cómo pedir reseñas (nos ponen arriba en Google) |

### Para CONSEGUIR MÁS clientes
| Archivo | Para qué |
|---|---|
| `datos/GOOGLE_BUSINESS_TEXTOS.md` | Ficha de Google lista para copiar/pegar |
| `datos/GUIA_SECOP.md` | Venderle dotación al Estado (canal grande, a futuro) |
| `datos/CAMPANA_AGOSTO.xlsx` | 76 WhatsApp + 500 correos listos (gancho del 31 de agosto) |

### Para SUPERVISAR (Diego, lunes 15 min)
| Archivo | Para qué |
|---|---|
| `datos/TABLERO_SEMANAL.md` | El papel de 4 números para medir si funciona |
| `PLAN_MAESTRO_FINAL.md` | El plan completo (problema, arquitectura, cronograma) |

### La app y el catálogo (ya en vivo)
- **App de gestión:** https://morales101002-dotacionpro.static.hf.space/
- **Catálogo para clientes:** https://morales101002-dotacionpro.static.hf.space/catalogo.html

### La BASE MAESTRA (la base de datos del negocio)
- **Hoja en tu Google Drive:** «BASE MAESTRA — DotaciónPro»
  (https://docs.google.com/spreadsheets/d/13jtpgEDlWtScZcXt_eL0Fu4Ijo2lfZUuPlforwwgT_I/edit)
  Hoy muestra las verificadas; al instalar el motor (paso 4 de la guía) se
  llena sola con las 18.595 completas y se actualiza cada día a las 5 am.
- **La fuente de verdad:** `datos/BASE_MAESTRA.json` en el repo — cada empresa
  con su estado de verificación, motivo y evidencia. Se nutre por ciclos con
  agentes que revisan cada empresa en internet (`datos/RUTINA_BASE.md`).

---

## 📌 Pendiente de decisión tuya: fusionar el PR #2

Todo lo de esta etapa (la app `web/`, el robot de la base, las pruebas y los
workflows) vive **dentro del pull request #2, sin fusionar**. La rama por
defecto se quedó en una versión anterior.

Eso tiene una consecuencia concreta: **el robot que actualiza la base de
empresas cada mes no va a correr.** GitHub solo dispara las tareas programadas
desde la rama por defecto, y allí el archivo del robot todavía no existe. La
base de 18.606 empresas se irá quedando vieja hasta que el PR se fusione.

El despliegue de la app y las pruebas sí funcionan igual (se disparan por
`push`, no por calendario), así que esto no bloquea nada de lo demás.

Cuando quieras, fusiona el PR #2 desde GitHub y el robot queda activo.

---

## ⚠️ 3 cosas de seguridad (10 min, cuando puedas)
Cambiar la contraseña del Hotmail, y rotar el token de Hugging Face y la API key de
Gemini (se escribieron en chats). Detalle en `DOCUMENTO_MAESTRO.md` §4.

> 💡 La rotación del token de Hugging Face y el paso 2 de arriba son el **mismo
> trabajo**: creas el token nuevo, lo guardas como secreto `HF_TOKEN` en GitHub,
> y borras el viejo. Un solo viaje.

---

## ¿Cómo sé que esto de verdad funciona?
Todo se construyó con verificación real: investigación de mercado con fuentes citadas,
crítica de 8 expertos, y **157 pruebas automáticas** que puedes correr tú mismo:

```bash
bash pruebas/correr.sh
```

69 prueban el motor de correos sobre un simulador de Google (sin mandar nada a nadie)
y 88 manejan la página y el panel en un navegador de verdad, como lo haría un cliente. Además
corren solas en GitHub con cada cambio. El detalle está en `pruebas/README.md`.

**La prueba definitiva la das tú:** instala el motor, y en 1-2 semanas llega la primera
cotización de una empresa nueva. Ahí sabrás que la máquina está viva. 🚀
