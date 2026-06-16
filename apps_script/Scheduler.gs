/**
 * Scheduler.gs - Triggers automaticos para tareas periodicas.
 *
 * Configura UNA SOLA VEZ ejecutando configurarTriggers() desde el menu.
 * Crea:
 *   - Cada 60 min: leer respuestas IMAP y notificar interesados.
 *   - Diario a las 08:00: enviar el lote del dia.
 */

const NOMBRES_TRIGGERS = {
  LEER_RESPUESTAS: 'jobLeerRespuestas',
  ENVIAR_LOTE: 'jobEnviarLote',
};

function configurarTriggers() {
  borrarTriggersExistentes_();

  const config = leerConfig();
  const intervaloMin = parseInt(config['scheduler.intervalo_lectura_min'], 10) || 60;
  const horaEnvio = String(config['scheduler.hora_envio'] || '08:00');
  const [hh, mm] = horaEnvio.split(':').map(function (s) { return parseInt(s, 10); });

  ScriptApp.newTrigger(NOMBRES_TRIGGERS.LEER_RESPUESTAS)
    .timeBased()
    .everyMinutes(intervaloMin >= 30 ? Math.min(intervaloMin, 360) : 60)
    .create();

  ScriptApp.newTrigger(NOMBRES_TRIGGERS.ENVIAR_LOTE)
    .timeBased()
    .atHour(hh)
    .everyDays(1)
    .create();

  registrarLog_('INFO', 'Scheduler',
    'Triggers configurados: leer cada ' + intervaloMin + ' min, enviar a las ' + horaEnvio);

  SpreadsheetApp.getUi().alert(
    'Triggers configurados:\n\n' +
    '- Lectura de respuestas: cada ' + intervaloMin + ' min\n' +
    '- Envio del lote: diario a las ' + horaEnvio + '\n\n' +
    'Puedes verlos en Apps Script > Activadores.'
  );
}

function borrarTriggersExistentes_() {
  const triggers = ScriptApp.getProjectTriggers();
  for (const t of triggers) {
    if (Object.values(NOMBRES_TRIGGERS).indexOf(t.getHandlerFunction()) !== -1) {
      ScriptApp.deleteTrigger(t);
    }
  }
}

// ============================================================
// Handlers de los triggers
// ============================================================

function jobLeerRespuestas() {
  try {
    const resultado = leerRespuestas();
    if (resultado.nuevasRespuestas > 0) {
      notificarPendientes();
    }
  } catch (e) {
    registrarLog_('ERROR', 'Scheduler.jobLeerRespuestas', String(e));
  }
}

function jobEnviarLote() {
  try {
    enviarLoteDelDia();
  } catch (e) {
    registrarLog_('ERROR', 'Scheduler.jobEnviarLote', String(e));
  }
}
