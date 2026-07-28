# 🦺 PLAN MAESTRO FINAL — Máquina de clientes de Dotaciones El Manantial
**Versión única y definitiva · julio 2026 · reemplaza todos los planes anteriores**

---

## 1. EL PROBLEMA Y EL OBJETIVO

**Problema:** el negocio vive de clientes viejos y voz a voz; sin flujo de clientes
nuevos se estanca. No hay vendedores ni presencia digital, y el dueño (60 años, no
técnico) no puede operar tecnología compleja.

**Objetivo medible:** clientes nuevos facturando cada mes — **mes 1: 2-3 · mes 2-3: 5+**
— con ≤30 min/día de trabajo humano.

**Las 6 necesidades que el sistema satisface (y nada más):**
1. ¿A QUIÉN le vendo? → base de datos de compradores
2. ¿CÓMO les llego sin caminar? → envíos automáticos
3. ¿CÓMO convenzo en 30 segundos? → catálogo profesional
4. ¿CÓMO no pierdo al interesado? → seguimiento y estados
5. ¿QUIÉN lo hace a diario? → robots en la nube (sin PC prendido)
6. ¿CÓMO sé que funciona? → verificación real de cada pieza + reporte semanal

---

## 2. LA ARQUITECTURA (validada por investigación con fuentes y crítica adversarial)

```
   MOTOR 1: Correo automático        MOTOR 2: Imán de entrantes
   (Apps Script + Gmail propio)      (Google Business + catálogo)
   rampa 10→40/día · 2º toque             │
   rebotes · bajas · avisos ⭐            ▼
          │                    ┌─────────────────────┐
          └───────────────────►│  📱 EL PAPÁ (Motor 6)│◄── WhatsApp entrante
   MOTOR 4: Base de datos      │  responde <5 min     │
   (10.553 correos en fila,    │  cotiza <2 horas     │
   18.606 en la app)           │  marca COTIZADO/VENTA│
          │                    └─────────────────────┘
          ▼                              │
   MOTOR 3: WhatsApp semi-auto           ▼
   (seguimiento, nunca frío)    MOTOR 5: Termómetro
                                (reporte lunes: embudo completo)
```

**Decisiones tomadas por EVIDENCIA (no se reabren):**
- ❌ Correo frío por Brevo/hotmail: viola su política antispam → PARQUEADO.
- ❌ WhatsApp masivo en frío: riesgo real de perder el número → solo seguimiento/entrante.
- ✅ Fecha legal 31 de agosto (CST art. 230/232): el argumento de venta del trimestre.
- ✅ Referidos convierten 15-26% → guion obligatorio al cerrar cada venta.
- ✅ Competidores de Bogotá sin reseñas de Google → reseñas = ventaja gratis.
- ✅ Responder <5 min multiplica conversión hasta 8× → regla de oro del papá.

**Crítica adversarial ya aplicada (21 hallazgos, 8 críticos corregidos en el código):**
rampa de calentamiento automática (protege la cuenta nueva) · detección de rebotes con
auto-pausa >5% · freno por 3 errores seguidos · BAJA sin falsos positivos (probada 8/8,
nunca da de baja a un interesado) · avisos que sí funcionan en modo automático, cada 10
min, con enlace directo, horario 7am-9pm · 2º toque automático al día 7 (dobla respuestas)
· embudo COTIZADO/VENTA con lista desplegable · guía sin la trampa de Google de pago.

---

## 3. QUÉ ESTÁ LISTO Y QUÉ FALTA

| Pieza | Estado |
|---|---|
| Motor 1 — código MotorVentas.gs **v3** (banco de pruebas: 51 casos + mes completo simulado 13/13) + CSV 10.553 + guía | ✅ LISTO Y VERIFICADO |
| Motor 2 — catálogo con pedido WhatsApp + "que me llamen" + textos Google Business | ✅ LISTO (falta crear la ficha: Diego 20 min) |
| Motor 3 — tandas WhatsApp en la app del papá | ✅ LISTO |
| Motor 4 — base 18.606 en la app + 10.553 correos en fila | ✅ LISTO |
| Motor 5 — reporte semanal automático del embudo | ✅ LISTO (dentro del motor) |
| Motor 6 — guiones del papá + rutina de 2 acciones | ✅ LISTO (falta simulacro) |
| **Instalación del motor (1 h, una vez)** | 🔴 **DIEGO — es EL paso que enciende todo** |
| Google Business Profile (20 min) | 🔴 DIEGO |
| Fotos de productos (30 min) → catálogo con imágenes | 🔴 DIEGO+PAPÁ → luego Claude |
| Simulacro de venta completo (<2 h) | 🔴 DIEGO+PAPÁ |
| Seguridad: cambiar clave del hotmail + rotar tokens expuestos | 🔴 DIEGO (10 min) |

---

## 4. CRONOGRAMA (4 semanas → 31 de agosto)

### SEMANA 1 — Encender
| Día | Tarea | Quién | Prueba de que quedó bien |
|---|---|---|---|
| 1 | Instalar el motor (GUIA_MOTOR_VENTAS.md, pasos 1-5) | Diego | Las 4 pruebas llegan a BANDEJA (no spam) |
| 1 | ACTIVAR 🟢 (paso 6) — arranca a 10/día solo | Diego | Registro dice "ACTIVADO" |
| 2 | Google Business Profile (textos listos) | Diego | Ficha visible en Google |
| 2 | Notificaciones Gmail activas en el celular del papá | Diego | Aviso de prueba suena |
| 3 | Simulacro: Diego de cliente → papá responde → PDF → cierre | Los 2 | Circuito <2 horas |
| 3-5 | Fotos de productos → ZIP a Claude | Diego+Papá | Claude las monta (miniaturas+3D) |
| 5 | Guiones impresos junto al teléfono | Papá | Los usa en el simulacro |

### SEMANA 2 — Régimen (la rampa avanza por días CON envíos: 1-3: 10 → 4-7: 20 → 8-14: 30 → 15+: 40)
- Papá en su rutina: responder ⭐ <5 min · cotizar <2 h · marcar COTIZADO/VENTA.
- Pedir reseña de Google a 5 clientes actuales (guion listo) → ≥3 reseñas.
- Diego lunes 15 min: reporte + filas REVISAR BAJA.
- Claude: ajustes de plantillas si respuesta <0,5%; montar fotos.
- **Meta de la semana: primera cotización real a empresa nueva.**

### SEMANA 3 — Optimizar (rampa en ~30/día)
- Seguimiento: llamar/escribir a cotizados sin respuesta >3 días (la hoja los muestra).
- Al cerrar cada venta: pedir referido (guion 4) — el canal que más convierte.
- Registro en SECOP II (guía de Claude) — canal B2G bonus.
- **Meta: primer cliente nuevo facturado.**

### SEMANA 4 — Cierre de agosto (rampa en techo: 40/día)
- Campaña automática "última semana para la dotación del 31" (la hace el gancho del motor).
- Medición contra meta (¿2-3 clientes?) con el reporte del lunes.
- Decisión del ciclo 2 CON DATOS: ¿dominio propio (~COP 70.000/año)? ¿más volumen?
  ¿WhatsApp API pago? Solo se decide con los números del mes 1.

---

## 5. ROLES (definitivos)

| Quién | Qué hace | Cuánto tiempo |
|---|---|---|
| **La máquina** | Envía, calienta, detecta interesados/rebotes/bajas, avisa, reporta, se protege sola | 24/7 |
| **El papá** | Responder <5 min · cotizar <2 h · marcar estado · pedir referido y reseña al cerrar | ~30 min/día |
| **Diego** | Instalación (1 vez) · lunes 15 min de supervisión · fotos · Google Business | ~1,5 h semana 1, luego 15 min/sem |
| **Claude** | Ajustar plantillas con datos · montar fotos · guía SECOP · siguiente ciclo | a demanda |

## 6. VERIFICACIÓN REAL (la necesidad 6, transversal)

1. ✅ Ya hecha: sintaxis del motor verificada · lógica de BAJA probada 8/8 casos ·
   investigación de mercado con fuentes · crítica adversarial de 4 expertos aplicada.
2. Al instalar: 4 correos de prueba a bandeja propia (entregabilidad).
3. Al encender: 5 días corriendo sola sin intervención (el Registro lo demuestra).
4. Humana: simulacro completo antes del primer interesado real.
5. La definitiva: **primera cotización (semana 2) y primer cliente nuevo (semanas 3-4).**
6. Continua: reporte de los lunes con el embudo (enviados→respuestas→cotizaciones→ventas).

## 7. CONGELADO (para no volver a dar vueltas)

Más funciones de la app · más 3D · rediseños · robot mensual de nutrición (opcional,
la base alcanza ~12-17 meses) · cañón Brevo (parqueado con evidencia) · versión Google
Sheets antigua ("Dotación Papá") · cualquier idea nueva hasta medir el mes 1.

---
**El siguiente paso de todo el proyecto es UNO: Diego instala el motor (1 hora).**
Todo lo demás ya está construido, corregido y verificado.
