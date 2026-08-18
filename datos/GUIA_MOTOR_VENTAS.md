# 🦺 GUÍA DE INSTALACIÓN — Motor de ventas automático v3
> Versión endurecida: 51 pruebas en simulador + crítica de 4 expertos aplicada.
### Se hace UNA sola vez (~1 hora). Después la máquina trabaja sola en la nube de Google.

> **Qué hace:** cada día hábil envía correos personalizados a empresas de Bogotá
> desde el buzón del negocio, con **calentamiento automático** (10→20→30→40/día),
> **2º toque** a los 7 días a quien no respondió, detecta interesados **cada 10
> minutos** (avisa con enlace directo, 7am-9pm), detecta **rebotes y se pausa sola**
> si algo anda mal, procesa bajas con seguridad, y reporta cada lunes el embudo:
> contactadas → respondieron → cotizadas → VENTAS. **Sin computador prendido.**

---

## PASO 1 — Crear el correo del negocio (10 min)

1. Ve a **gmail.com** → «Crear cuenta» → **«Para mi uso personal»**.
   > ⚠️ **NO elijas «Para el trabajo o mi negocio»** — esa opción te lleva a
   > Google Workspace, que es DE PAGO y pide tarjeta. La personal es gratis.
2. Nombre sugerido: **ventas.dotacionmanantial@gmail.com** (o similar libre).
3. **Configura este Gmail en el celular del papá** (app Gmail → agregar cuenta) y
   **activa las notificaciones** de la app (para que los avisos ⭐ suenen).
4. Activa la verificación en dos pasos con el celular del papá.
5. 💡 Ideal: usa la cuenta "normalmente" unos días (enviar 2-3 correos a conocidos,
   recibir respuestas) antes de encender el motor — la rampa automática hace el
   resto del calentamiento.

## PASO 2 — La hoja de cálculo

**⚡ ATAJO (ya hecho por Claude):** hay una hoja **«Empresas»** creada en tu Google
(morales.1010020668@gmail.com) con **~200 empresas ya cargadas y mezcladas en 40+
sectores** (restaurantes, talleres, ferreterías, clínicas, farmacias, construcción,
comercio, ropa…), lista para probar la máquina el mismo día:
👉 https://docs.google.com/spreadsheets/d/1W1yn6tBr8KtjkhRqxlnT4XXzjv7gyUW-SiIwrim7Fxw/edit
> (Hay una hoja anterior de 160 llamada igual — puedes borrar la que no uses.)

- Si vas a usar **esa** cuenta para enviar: ábrela y salta al PASO 3 (pega el código ahí mismo).
- Si prefieres una **cuenta nueva del negocio**: con esa cuenta abierta ve a **sheets.new**,
  nómbrala «Motor de ventas», y sigue normal (importarás el CSV completo en el paso 4).

> 💡 La hoja del atajo trae 160 empresas para arrancar y probar. Cuando quieras las
> **11.024 completas**, impórtalas con el CSV (paso 4) — reemplaza la hoja «Empresas».

## PASO 3 — Pegar el motor y su panel (12 min)

1. En la hoja: **Extensiones → Apps Script**.
2. Borra lo que aparezca y **pega TODO el contenido de `apps_script/MotorVentas.gs`**.
3. Ahora el panel para el celular: a la izquierda, junto a «Archivos», toca **+ →
   HTML**. Nómbralo exactamente **`PanelMotor`** (sin `.html`, Google lo agrega).
   Borra lo que traiga y **pega TODO el contenido de `apps_script/PanelMotor.html`**.
4. Un archivo más: **+ → Secuencia de comandos**, nómbralo **`SincronizarBase`**
   y pega el contenido de `apps_script/SincronizarBase.gs`. Este mantiene la hoja
   «BASE MAESTRA — DotaciónPro» de tu Drive actualizada sola con las 18.595
   empresas. Para activarlo (una sola vez): arriba, en el selector de funciones,
   elige **activarSincronizacionDiaria** → **Ejecutar**. Desde ahí se actualiza
   cada día a las 5 am.
5. Guardar 💾 → cierra la pestaña → **recarga la hoja**.
6. Aparecerá el menú **«🦺 Motor de ventas»** (si no, espera 30 s y recarga).

## PASO 4 — Preparar e importar las empresas (10 min)

1. Menú **🦺 → «1. Preparar hojas»**. Google pedirá permisos: es TU propio script en
   TU propia cuenta → «Permitir». Si sale «app no verificada»: **Configuración
   avanzada → Ir a [nombre del proyecto] (no seguro)** → Permitir.
2. Abre la pestaña **«Empresas»** (abajo).
3. **Archivo → Importar → Subir** → `EMPRESAS_PARA_SHEET.csv` → elige
   **«REEMPLAZAR HOJA ACTUAL»** (⚠️ no «Anexar»: duplicaría los encabezados).
4. Vuelve a ejecutar **«1. Preparar hojas»** (restaura la lista desplegable de estados).

## PASO 5 — La prueba de fuego (10 min)

1. Menú **🦺 → «2. Enviar PRUEBA a mi propio correo»**. El motor te pedirá un
   **correo EXTERNO tuyo** (tu Gmail personal — y mejor aún si también pruebas con
   uno de Outlook/Hotmail): escríbelo y acepta → llegan **4 correos** de prueba
   (3 plantillas + el 2º toque) a ESE buzón.
2. Verifica en tu buzón personal: ✔ llegan a **Bandeja de entrada** (no a spam)
   ✔ se ven bien ✔ el enlace del catálogo abre.
3. **Prueba del detector de respuestas:** desde tu correo personal, responde a una
   de las pruebas con «Me interesa, cotíceme 20 overoles». Luego, en la hoja, menú
   **🦺 → «6. Revisar respuestas y rebotes ahora»** (en el paso 5 los automáticos
   aún no están activados — eso pasa en el paso 6). Revisa la pestaña **Registro**:
   NO debe aparecer ningún evento «baja» por esa respuesta. *(El motor solo procesa
   correos de empresas que estén en la hoja — las pruebas no dañan nada.)*

## PASO 6 — ENCENDER 🟢 (1 min)

Menú **🦺 → «4. ✅ ACTIVAR el motor automático»**. Desde mañana:

| Cuándo | Qué hace solo |
|---|---|
| Días hábiles 8am | Envía el lote (rampa: 10/día días 1-3 → 20 → 30 → 40) + 2º toques |
| Cada 10 minutos | Detecta interesados ⭐ (aviso 7am-9pm con enlace directo), rebotes y bajas |
| Si rebotes >5% | **SE PAUSA SOLA** y avisa (protege la cuenta) |
| Lunes 7am | Reporte del embudo completo |

## PASO 7 — El panel en el celular 📱 (3 min, opcional pero muy útil)

La sala de control del motor: estado, cupo del día, embudo completo y botones
de pausar/reanudar — sin abrir la hoja de cálculo.

1. En la hoja: **Extensiones → Apps Script** → botón azul **Implementar →
   Nueva implementación**.
2. Engranaje ⚙️ → tipo **Aplicación web** → «Ejecutar como»: **Yo** →
   «Quién tiene acceso»: **Solo yo** → **Implementar**.
   > Con «Solo yo» no hace falta clave: Google únicamente deja entrar a esta
   > misma cuenta. No elijas «Cualquier persona».
3. Copia la **URL de la aplicación web** y ábrela en el celular (con la sesión
   del Gmail del negocio). Guárdala en la pantalla de inicio:
   en Chrome → menú ⋮ → **Añadir a pantalla de inicio**. Queda como una app.

Desde ahí puedes: pausar y reanudar los envíos, mandar el lote del día a mano,
revisar respuestas al instante, enviarte correos de prueba y ver los últimos
movimientos del Registro. El panel se refresca solo cada minuto.

---

## La única rutina del papá

> 📱 Llega un aviso «⭐ INTERESADA»: abrir el enlace, **responder en <5 minutos**
> con el guion, cotizar con el PDF de la app en <2 horas.
> Al cotizar o vender: cambiar el estado de la fila (lista desplegable):
> **COTIZADO ⭐⭐** o **VENTA 🏆**. Nada más.

**⚠️ Importante para el papá:** en el celular, NO deslizar/archivar los correos de
empresas — solo leerlos y responderlos (los archivados se pueden escapar del radar).

## Supervisión (Diego, 15 min/semana — lunes)

1. Leer el reporte del correo: enviados / respuestas / cotizaciones / ventas / rebotes.
2. Pestaña Empresas: ¿hay filas **REVISAR BAJA**? (el cliente mencionó "baja" de forma
   ambigua — decidir a mano si es baja o interesado).
3. Si la respuesta es <0,5% con >200 enviados, avisarme para ajustar plantillas.
4. Si llegó aviso de **AUTO-PAUSA**: escribirme antes de reactivar.

## Preguntas frecuentes

- **¿Es legal?** Sí: correos uno a uno desde buzón propio, identificación completa
  del negocio, origen del dato (directorios públicos) y BAJA automática (Ley 1581).
- **¿Cuánto dura la lista?** 11.024 empresas a ~28 nuevas/día hábil (el resto del cupo va a 2º toques) ≈ **12-17 meses** de campaña continua.
- **¿Y si Google se molesta?** El motor tiene 4 protecciones: rampa de calentamiento,
  ritmo humano con pausas, freno por 3 errores seguidos y auto-pausa por rebotes.
- **Mejora opcional a futuro** (~COP 60-80.000/año): dominio propio
  (dotacionesmanantial.com) para el correo y el catálogo — sube la entregabilidad
  y la imagen. Se decide en el ciclo 2 con los datos del primer mes.
