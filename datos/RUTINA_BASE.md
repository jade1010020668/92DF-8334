# 🔄 Rutina de nutrición de la BASE MAESTRA

La base (`datos/BASE_MAESTRA.json`, 18.595 empresas) se nutre por ciclos:
cada ciclo toma las siguientes empresas sin verificar **en el mismo orden en
que el motor les va a escribir**, las busca en internet una a una con agentes
(¿existe?, ¿el correo es de verdad suyo?, teléfono, sitio, dirección, con URL
de evidencia), aplica los veredictos y publica. La verificación siempre va
por delante de los envíos del motor.

## El ciclo (lo ejecuta una sesión de Claude)

```
1. python robot/preparar_lote.py 100 > lote.json      # las 100 siguientes por valor
2. Workflow «verificar-lote-archivo» con args {"ruta": ".../lote.json"}
   (un agente web por empresa; el script del workflow está en este repo abajo)
3. python robot/extraer_resultados.py <transcript>/journal.jsonl resultados.json
4. python robot/aplicar_verificacion.py resultados.json
5. Regenerar derivados:
   - datos/BASE_MAESTRA.csv y datos/BASE_MAESTRA_HOJA.csv (ver base_maestra.py, mismas columnas)
   - python robot/generar_csv_sheet.py          # el CSV limpio del motor
6. git add datos/ && commit && push a la rama del proyecto
```

Con el push, la hoja de Google Drive «BASE MAESTRA — DotaciónPro» se refresca
sola al día siguiente a las 5 am (la sincroniza `apps_script/SincronizarBase.gs`
desde el CSV del repo — Diego la activa una sola vez, ver la guía del motor).

## Reglas de decisión (en robot/aplicar_verificacion.py)

- Nada se borra jamás: descartar = marcar `descartada` con motivo y evidencia.
- Los datos encontrados solo llenan huecos (no pisan lo que había).
- Un correo demostrado ajeno se retira y queda anotado en `notas`.
- En la duda: `dudosa`. Solo se descarta con señal fuerte (inactiva con
  evidencia, o registro cruzado inválido sin ningún rastro del negocio).

## Rendimiento medido (piloto del 18/08/2026, 50 empresas)

~6.000 tokens por empresa. Cosecha del piloto: 36% verificadas activas,
54% descartadas (basura de dataset cruzado), 22 teléfonos/sitios nuevos.
Un lote de 100 ≈ 600k tokens ≈ 45-90 min de reloj.

## Cómo mantener la rutina viva

- **En una sesión activa de Claude Code**: pedir «corre el ciclo de
  verificación de la base según datos/RUTINA_BASE.md». Eso es todo.
- **Programada**: los cron de una sesión mueren con ella (máx. 7 días). Para
  una rutina permanente, crearla en claude.ai → Routines con ese mismo texto,
  o rearmar el cron al inicio de cada sesión de trabajo.
- **El frente sin correo** (7.500 empresas con solo teléfono/dirección):
  `python robot/preparar_lote.py 100 --sin-correo` — sirve para el canal de
  llamadas/mapas cuando se quiera abrir.

## El script del workflow (copiar tal cual en la sesión)

Está guardado en `robot/workflow_verificar_lote.js` — es el que la sesión
pasa al tool Workflow con `{scriptPath}` o pegado como `script`.
