/**
 * SINCRONIZAR BASE MAESTRA — DotaciónPro
 * =======================================
 * Trae la BASE MAESTRA completa (18.595 empresas) desde el repositorio de
 * GitHub a la hoja de cálculo de Google Drive, y la mantiene al día sola.
 *
 * Se pega en el MISMO proyecto de Apps Script del motor (un archivo más,
 * junto a MotorVentas.gs y PanelMotor). Luego, UNA sola vez:
 *   Editor de Apps Script → seleccionar función «activarSincronizacionDiaria»
 *   → Ejecutar. Eso hace la primera sincronización completa y deja programada
 *   una diaria a las 5 am. Desde ahí, la hoja se actualiza sola.
 *
 * La fuente de verdad vive en el repo (datos/BASE_MAESTRA_HOJA.csv): la
 * rutina de verificación con agentes la nutre y este script la refleja aquí.
 */

var CONFIG_BASE = {
  // ⚠️ Si el repositorio cambia de rama por defecto (p. ej. al fusionar el
  // pull request), actualizar la rama en esta URL.
  URL_CSV: 'https://raw.githubusercontent.com/jade1010020668/92DF-8334/claude/intelligent-cannon-rlgn1v/datos/BASE_MAESTRA_HOJA.csv',
  // La hoja «BASE MAESTRA — DotaciónPro» del Drive (creada por Claude).
  ID_HOJA_MAESTRA: '13jtpgEDlWtScZcXt_eL0Fu4Ijo2lfZUuPlforwwgT_I',
  PESTANA: 'BaseMaestra',
};

function sincronizarBaseMaestra() {
  var resp = UrlFetchApp.fetch(CONFIG_BASE.URL_CSV, { muteHttpExceptions: true });
  if (resp.getResponseCode() !== 200) {
    throw new Error('No se pudo descargar la base del repositorio (HTTP ' + resp.getResponseCode() + ')');
  }
  var filas = Utilities.parseCsv(resp.getContentText('UTF-8'));
  if (!filas || filas.length < 2) throw new Error('El CSV llegó vacío o roto');

  var libro = SpreadsheetApp.openById(CONFIG_BASE.ID_HOJA_MAESTRA);
  var pest = libro.getSheetByName(CONFIG_BASE.PESTANA) || libro.insertSheet(CONFIG_BASE.PESTANA);
  pest.clearContents();
  pest.getRange(1, 1, filas.length, filas[0].length).setValues(filas);
  pest.setFrozenRows(1);

  // Sello de última sincronización, visible en una pestaña propia.
  var info = libro.getSheetByName('Sincronización') || libro.insertSheet('Sincronización');
  info.clearContents();
  info.getRange(1, 1, 3, 2).setValues([
    ['Última sincronización', Utilities.formatDate(new Date(), 'America/Bogota', 'yyyy-MM-dd HH:mm')],
    ['Empresas', filas.length - 1],
    ['Fuente', CONFIG_BASE.URL_CSV],
  ]);
  return filas.length - 1;
}

// Ejecutar UNA vez a mano: sincroniza ya y programa la diaria de las 5 am.
function activarSincronizacionDiaria() {
  var n = sincronizarBaseMaestra();
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction && t.getHandlerFunction() === 'sincronizarBaseMaestra') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('sincronizarBaseMaestra').timeBased().atHour(5).everyDays(1).inTimezone('America/Bogota').create();
  try {
    SpreadsheetApp.getUi().alert('Base maestra sincronizada: ' + n + ' empresas.\nSe actualizará sola cada día a las 5 am.');
  } catch (e) { /* sin interfaz (ejecución desde el editor): no pasa nada */ }
}
