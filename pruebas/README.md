# 🧪 Pruebas del proyecto

```bash
bash pruebas/correr.sh              # todo (motor + web)
bash pruebas/correr.sh motor        # solo el motor de ventas
bash pruebas/correr.sh navegador    # solo la app web
```

Estado al 30 de julio de 2026: **121 pruebas, 0 fallas** (50 del motor + 71 de la web).

## `motor/` — el motor de ventas, sin tocar Google

`gas_mock.js` es un **simulador del entorno de Google Apps Script** en Node:
finge `SpreadsheetApp`, `GmailApp`, `MailApp`, `PropertiesService`, `ScriptApp`,
`Utilities` y un reloj controlable (`sim.estado.ahora`). Carga y ejecuta el
archivo real `apps_script/MotorVentas.gs` — no una copia — así que las pruebas
siempre miden el código que se le entrega a Diego.

Eso permite simular meses de operación en segundos: rampa de calentamiento,
lotes diarios, respuestas, rebotes, bajas y el reporte semanal.

| Archivo | Qué cubre |
|---|---|
| `test_cupo_rampa_calentamiento.js` | Rampa 10→20→30→40, fines de semana, cuota de Gmail, pausa |
| `test_lote_diario.js` | Envío del lote, 2º toque a los 7 días, freno por errores |
| `test_procesar_respuestas.js` | Detección de interesados, ventana de avisos 7am-9pm, cola de avisos |
| `test_bajas_rebotes.js` | Bajas (Ley 1581), rebotes y auto-pausa de protección |
| `test_reporte_hojas_motor_ciclo.js` | Preparar hojas, ciclo completo y reporte semanal del embudo |

## `navegador/` — la app web en un Chromium de verdad

Cada suite levanta su propio servidor estático sobre `web/` y maneja la página
como lo haría un cliente. Verifica lo que el cliente ve, no el código por dentro.

| Archivo | Qué cubre |
|---|---|
| `testtodo.mjs` | App de gestión: base de 18.606, filtros, «que me llamen» |
| `testpedido.mjs` | Armar pedido en el catálogo y enviarlo por WhatsApp |
| `testbuscar.mjs` | Buscador del catálogo, PDF, sellos 3D |
| `test3d.mjs` | Visor 3D: los 8 productos, fotos vs modelos, cotizar |
| `testsolo.mjs` | Modo «solo imagen» (`?solo=1`) para compartir un producto |
| `testflash.mjs` | Que el modo solo no muestre el precio ni por un instante |

## ⚠️ Si cambias el motor, corre las pruebas

Estas pruebas se escribieron a la par de los arreglos, así que varias
**documentan un arreglo concreto** (las marcadas `REGRESION`). Si cambias el
comportamiento a propósito, actualiza la prueba en el mismo commit: una suite
que no se actualiza deja de avisar y da falsa tranquilidad.

Ejemplo real: cuando la rampa pasó a contar **días con envíos** en vez de días
de calendario, seis pruebas quedaron midiendo una propiedad
(`FECHA_INICIO_ENVIOS`) que el motor ya no usaba. Seguían "fallando" sin que
hubiera ningún bug — y tapaban las fallas que sí habrían importado.
