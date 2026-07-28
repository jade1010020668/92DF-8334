# 🦺 GUÍA DE INSTALACIÓN — Motor de ventas automático
### Se hace UNA sola vez (~1 hora). Después la máquina trabaja sola en la nube de Google.

> **Qué vas a montar:** un robot que cada día hábil a las 8am envía 45 correos
> personalizados a empresas de Bogotá desde el buzón del negocio, detecta quién
> responde (y avisa al celular), procesa las bajas, y manda un reporte cada lunes.
> **No necesita ningún computador prendido.**

---

## PASO 1 — Crear el correo del negocio (10 min)

1. Ve a **gmail.com** → «Crear cuenta» → «Para trabajo».
2. Nombre sugerido: **ventas.dotacionmanantial@gmail.com** (o similar disponible).
3. **IMPORTANTE:** configura este Gmail en el celular del papá (app Gmail → agregar
   cuenta) para que vea las respuestas al instante.
4. Activa la verificación en dos pasos con el celular del papá (Google lo pedirá).

## PASO 2 — Crear la hoja de cálculo (2 min)

1. Con esa cuenta abierta, ve a **sheets.new** (se abre una hoja nueva).
2. Nómbrala: **Motor de ventas — Dotaciones El Manantial**.

## PASO 3 — Pegar el motor (10 min)

1. En la hoja: menú **Extensiones → Apps Script**.
2. Borra lo que aparezca y **pega TODO el contenido del archivo `apps_script/MotorVentas.gs`**
   (está en el proyecto; pídemelo y te lo paso por chat listo para copiar).
3. Clic en el ícono de **guardar** 💾.
4. Cierra la pestaña de Apps Script y **recarga la hoja de cálculo**.
5. Verás un menú nuevo arriba: **«🦺 Motor de ventas»**. (Si no aparece, espera 30 s y recarga.)

## PASO 4 — Preparar e importar las empresas (10 min)

1. Menú **🦺 Motor de ventas → «1. Preparar hojas»**. Autoriza los permisos que
   Google pida (es TU propio script leyendo TU propio correo — dale «Permitir»;
   si sale "app no verificada": Configuración avanzada → Ir al proyecto).
2. Abre la pestaña **«Empresas»** (abajo).
3. Menú **Archivo → Importar → Subir** → elige **`EMPRESAS_PARA_SHEET.csv`**
   (te lo entregué: 10.553 empresas ya ordenadas, las que más compran dotación primero).
4. En el cuadro elige: **«Anexar a la hoja actual»** → Importar.

## PASO 5 — La prueba de fuego (10 min)

1. Menú **🦺 Motor de ventas → «2. Enviar PRUEBA a mi propio correo»**.
2. Revisa la bandeja del Gmail nuevo: deben llegar **3 correos de prueba**.
3. Verifica ✔ que llegaron a **Bandeja de entrada** (no a spam) ✔ que se ven bien
   (botón dorado del catálogo) ✔ que el enlace del catálogo abre.
4. Si algo se ve mal, me escribes antes de seguir.

## PASO 6 — ENCENDER 🟢 (1 min)

1. Menú **🦺 Motor de ventas → «4. ✅ ACTIVAR el motor automático»**.
2. Listo. Desde mañana a las 8am la máquina trabaja sola:
   - **45 correos/día hábil** (los primeros 3 días puedes bajar a 20 cambiando
     `CUPO_DIARIO` en el script — calentamiento recomendado).
   - **Cada hora** revisa respuestas: los interesados quedan marcados
     **RESPONDIÓ ⭐** y llega un aviso «⭐ empresa INTERESADA — responder ya».
   - **Bajas automáticas**: quien responda BAJA no vuelve a recibir nada.
   - **Lunes 7am**: reporte semanal al buzón.

## La única rutina del papá (después del encendido)

> 📱 Cuando llegue un aviso «⭐ INTERESADA» o un WhatsApp:
> **responder en menos de 5 minutos** (multiplica la venta hasta 8×),
> cotizar con el PDF de la app en menos de 2 horas, y anotar la venta.
> **Nada más. La máquina hace el resto.**

## Supervisión (Diego, 15 min por semana)

- Lunes: leer el reporte del correo (enviados / respuestas / bajas).
- Mirar la pestaña «Empresas»: ¿cuántos ⭐? ¿se les respondió?
- Si las respuestas están bajas (<0,5%), avisarme para ajustar las plantillas.

## Preguntas frecuentes

- **¿Es legal?** Sí: correos uno a uno desde buzón propio, con identificación del
  negocio, origen del dato (directorios públicos) y opción de BAJA automática
  (Ley 1581 de habeas data).
- **¿Se puede quedar sin empresas?** Con 10.553 en fila a 45/día hay ~10 meses.
  El robot de la base puede traer más cuando se agoten.
- **¿Y si Gmail se queja?** El motor respeta cupos (45 < 100 permitidos), envía con
  pausas humanas y solo días hábiles. Si algún día no hay cupo, lo registra y sigue
  al día siguiente.
