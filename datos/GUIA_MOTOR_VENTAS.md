# 🦺 GUÍA DE INSTALACIÓN — Motor de ventas automático v2
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

## PASO 2 — Crear la hoja de cálculo (3 min)

1. Con esa cuenta abierta: **sheets.new** → nómbrala «Motor de ventas — Dotaciones El Manantial».
2. **Compártela contigo mismo**: botón Compartir → agrega TU correo personal (Diego)
   como **Editor**. Así, si algo le pasara a la cuenta nueva, la lista y los estados
   no se pierden.

## PASO 3 — Pegar el motor (10 min)

1. En la hoja: **Extensiones → Apps Script**.
2. Borra lo que aparezca y **pega TODO el contenido de `apps_script/MotorVentas.gs`**.
3. Guardar 💾 → cierra la pestaña → **recarga la hoja**.
4. Aparecerá el menú **«🦺 Motor de ventas»** (si no, espera 30 s y recarga).

## PASO 4 — Preparar e importar las empresas (10 min)

1. Menú **🦺 → «1. Preparar hojas»**. Google pedirá permisos: es TU propio script en
   TU propia cuenta → «Permitir». Si sale «app no verificada»: **Configuración
   avanzada → Ir a [nombre del proyecto] (no seguro)** → Permitir.
2. Abre la pestaña **«Empresas»** (abajo).
3. **Archivo → Importar → Subir** → `EMPRESAS_PARA_SHEET.csv` → elige
   **«REEMPLAZAR HOJA ACTUAL»** (⚠️ no «Anexar»: duplicaría los encabezados).
4. Vuelve a ejecutar **«1. Preparar hojas»** (restaura la lista desplegable de estados).

## PASO 5 — La prueba de fuego (10 min)

1. Menú **🦺 → «2. Enviar PRUEBA a mi propio correo»** → llegan **4 correos**
   (3 plantillas + el 2º toque).
2. Verifica: ✔ llegan a **Bandeja de entrada** (no spam) ✔ se ven bien ✔ el enlace
   del catálogo abre.
3. **Prueba del circuito completo:** desde tu correo personal, responde a una de las
   pruebas escribiendo «Me interesa, cotíceme 20 overoles». En máximo 10-15 min la
   fila debería marcarse… no está en la hoja (es prueba), pero verifica que NO llegue
   marcada como BAJA en el Registro. *(El motor solo procesa correos que estén en la
   hoja Empresas — las pruebas no dañan nada.)*

## PASO 6 — ENCENDER 🟢 (1 min)

Menú **🦺 → «4. ✅ ACTIVAR el motor automático»**. Desde mañana:

| Cuándo | Qué hace solo |
|---|---|
| Días hábiles 8am | Envía el lote (rampa: 10/día días 1-3 → 20 → 30 → 40) + 2º toques |
| Cada 10 minutos | Detecta interesados ⭐ (aviso 7am-9pm con enlace directo), rebotes y bajas |
| Si rebotes >5% | **SE PAUSA SOLA** y avisa (protege la cuenta) |
| Lunes 7am | Reporte del embudo completo |

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
- **¿Cuánto dura la lista?** 10.553 empresas a ~40/día (con 2º toques) ≈ **8-10 meses**.
- **¿Y si Google se molesta?** El motor tiene 4 protecciones: rampa de calentamiento,
  ritmo humano con pausas, freno por 3 errores seguidos y auto-pausa por rebotes.
- **Mejora opcional a futuro** (~COP 60-80.000/año): dominio propio
  (dotacionesmanantial.com) para el correo y el catálogo — sube la entregabilidad
  y la imagen. Se decide en el ciclo 2 con los datos del primer mes.
