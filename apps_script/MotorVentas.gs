/**
 * ============================================================================
 * MOTOR DE VENTAS AUTOMÁTICO — Dotaciones El Manantial S.A.S
 * ============================================================================
 * Corre solo en la nube de Google (sin computador prendido). Cada día hábil:
 *   1. Envía hasta 45 correos personalizados DESDE ESTE BUZÓN (uno a uno,
 *      legal: no es envío masivo por proveedor) a las empresas de la hoja.
 *   2. Revisa la bandeja: marca quién RESPONDIÓ (⭐) y procesa las BAJAS.
 *   3. Cada lunes escribe el reporte (enviados/respuestas/bajas) y lo envía
 *      al propio buzón.
 *
 * INSTALACIÓN (una sola vez, ver GUIA_MOTOR_VENTAS.md):
 *   1. Crear una hoja de cálculo en sheets.new
 *   2. Extensiones → Apps Script → pegar TODO este archivo → guardar
 *   3. Recargar la hoja → menú «🦺 Motor de ventas» → «1. Preparar hojas»
 *   4. Importar el archivo EMPRESAS_PARA_SHEET.csv en la pestaña «Empresas»
 *   5. Menú → «2. Enviar PRUEBA a mi propio correo» (verificar que llega bien)
 *   6. Menú → «4. ACTIVAR el motor automático» — y listo, trabaja solo.
 * ============================================================================
 */

var CONFIG = {
  CUPO_DIARIO: 45,           // margen bajo el límite de Gmail (100/día en cuentas normales)
  HOJA_EMPRESAS: 'Empresas',
  HOJA_REGISTRO: 'Registro',
  HOJA_REPORTE: 'Reporte',
  CATALOGO: 'https://morales101002-dotacionpro.static.hf.space/catalogo.html',
  FIRMA_NOMBRE: 'José Manuel Morales Quintana',
  EMPRESA: 'Dotaciones El Manantial S.A.S',
  NIT: '830.137.919-3',
  DIRECCION: 'Carrera 34 No. 2-62, Bogotá',
  TEL: '(601) 721 3566',
  CEL: '313 574 5063',
  HORA_ENVIO: 8,             // 8 am, hora de Colombia
};

/* ============================== MENÚ ============================== */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('🦺 Motor de ventas')
    .addItem('1. Preparar hojas', 'prepararHojas')
    .addItem('2. Enviar PRUEBA a mi propio correo', 'enviarPrueba')
    .addItem('3. Enviar el lote de HOY (manual)', 'enviarLoteDiario')
    .addSeparator()
    .addItem('4. ✅ ACTIVAR el motor automático', 'activarMotor')
    .addItem('5. ⛔ Desactivar el motor', 'desactivarMotor')
    .addSeparator()
    .addItem('6. Revisar respuestas y bajas ahora', 'procesarRespuestas')
    .addItem('7. Generar reporte ahora', 'reporteSemanal')
    .addToUi();
}

/* ========================= PREPARAR HOJAS ========================= */
function prepararHojas() {
  var ss = SpreadsheetApp.getActive();
  var cab = ['correo', 'empresa', 'sector', 'prioridad', 'estado', 'fecha_envio', 'notas'];
  var h = ss.getSheetByName(CONFIG.HOJA_EMPRESAS) || ss.insertSheet(CONFIG.HOJA_EMPRESAS);
  if (h.getLastRow() === 0) {
    h.appendRow(cab);
    h.getRange(1, 1, 1, cab.length).setFontWeight('bold').setBackground('#1d4ed8').setFontColor('#fff');
    h.setFrozenRows(1);
  }
  var r = ss.getSheetByName(CONFIG.HOJA_REGISTRO) || ss.insertSheet(CONFIG.HOJA_REGISTRO);
  if (r.getLastRow() === 0) {
    r.appendRow(['fecha', 'evento', 'detalle']);
    r.setFrozenRows(1);
  }
  var p = ss.getSheetByName(CONFIG.HOJA_REPORTE) || ss.insertSheet(CONFIG.HOJA_REPORTE);
  if (p.getLastRow() === 0) {
    p.appendRow(['semana', 'enviados', 'respuestas', 'bajas', 'total_historico']);
    p.setFrozenRows(1);
  }
  SpreadsheetApp.getUi().alert('Hojas listas ✅\n\nAhora importa el archivo EMPRESAS_PARA_SHEET.csv:\nArchivo → Importar → Subir → "Anexar a la hoja actual" (con la pestaña Empresas abierta).');
}

/* ========================= PLANTILLAS ========================= */
function hayGanchoAgosto_() {
  var hoy = new Date();
  var m = hoy.getMonth() + 1;
  return m === 7 || (m === 8 && hoy.getDate() <= 31);
}

function ganchoSector_(sector) {
  var s = String(sector || '').toLowerCase();
  if (/taller|llanta|repuesto/.test(s)) return 'overoles, guantes y botas de seguridad para su equipo';
  if (/ferreter|construc|pintur/.test(s)) return 'dotación y elementos de protección para su personal';
  if (/restaur|panader|cafeter|comida|carnicer/.test(s)) return 'uniformes, delantales y dotación para su personal';
  if (/cl[ií]nica|salud|drogu|hospital|ips/.test(s)) return 'uniformes antifluido y dotación para su personal';
  return 'la dotación y los elementos de protección de su personal';
}

function plantilla_(indice, empresa, sector) {
  var gancho = ganchoSector_(sector);
  var agosto = hayGanchoAgosto_();
  var asuntos = agosto
    ? ['Dotación del 31 de agosto — cotización a tiempo',
       '¿Ya tiene lista la dotación de agosto para su personal?',
       'Se acerca el 31 de agosto — dotación a precio de fábrica']
    : ['Cotización de dotación para su empresa',
       '¿Ya tiene lista la dotación de su personal?',
       'Dotación y EPP a precio de fábrica — Bogotá'];
  var intro = agosto
    ? 'Se acerca la entrega de dotación de ley del <b>31 de agosto</b>.'
    : 'Sabemos lo importante que es tener a su equipo bien dotado.';
  var cuerpo =
    '<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#2b2620;line-height:1.6;max-width:560px">' +
    '<p>Señores <b>' + empresa + '</b>:</p>' +
    '<p>' + intro + ' En <b>' + CONFIG.EMPRESA + '</b> (Bogotá, NIT ' + CONFIG.NIT + ') confeccionamos ' +
    gancho + ' a precios de fábrica, con descuentos desde 20 unidades y bordado de su logo.</p>' +
    '<p style="margin:22px 0"><a href="' + CONFIG.CATALOGO + '" style="background:#141210;color:#d9bd7e;' +
    'padding:13px 22px;border-radius:6px;text-decoration:none;font-weight:bold">📖 Ver catálogo con precios</a></p>' +
    '<p>Respondemos la cotización <b>el mismo día</b>, sin compromiso.</p>' +
    '<p>Cordial saludo,<br><b>' + CONFIG.FIRMA_NOMBRE + '</b><br>' + CONFIG.EMPRESA + ' · ' + CONFIG.DIRECCION +
    '<br>Tel. ' + CONFIG.TEL + ' · Cel. y WhatsApp ' + CONFIG.CEL + '</p>' +
    '<hr style="border:none;border-top:1px solid #e7ddc9;margin:18px 0">' +
    '<p style="font-size:12px;color:#8a8072">Recibió este mensaje porque su empresa aparece en directorios ' +
    'públicos de Bogotá. Si no desea recibir información, responda con la palabra <b>BAJA</b> y no volveremos a escribirle.</p>' +
    '</div>';
  return { asunto: asuntos[indice % 3], html: cuerpo };
}

/* ========================= ENVÍO DIARIO ========================= */
function enviarLoteDiario() {
  var dia = new Date().getDay();
  if (dia === 0 || dia === 6) return; // fines de semana no
  var ss = SpreadsheetApp.getActive();
  var h = ss.getSheetByName(CONFIG.HOJA_EMPRESAS);
  if (!h || h.getLastRow() < 2) return;

  var cupo = Math.min(CONFIG.CUPO_DIARIO, MailApp.getRemainingDailyQuota() - 5);
  if (cupo <= 0) { registrar_('cupo', 'Sin cupo de Gmail hoy'); return; }

  var datos = h.getDataRange().getValues(); // [correo, empresa, sector, prioridad, estado, fecha, notas]
  var enviados = 0;
  for (var i = 1; i < datos.length && enviados < cupo; i++) {
    var correo = String(datos[i][0] || '').trim().toLowerCase();
    var estado = String(datos[i][4] || '').trim();
    if (!correo || estado) continue; // solo pendientes
    var empresa = String(datos[i][1] || 'Estimados señores');
    var sector = datos[i][2];
    var p = plantilla_(enviados, empresa, sector);
    try {
      GmailApp.sendEmail(correo, p.asunto, 'Vea este mensaje en un cliente de correo con HTML. Catálogo: ' + CONFIG.CATALOGO, {
        htmlBody: p.html,
        name: CONFIG.EMPRESA,
      });
      h.getRange(i + 1, 5).setValue('ENVIADO');
      h.getRange(i + 1, 6).setValue(new Date());
      enviados++;
      Utilities.sleep(1500 + Math.floor(Math.random() * 2000)); // ritmo humano, no ráfaga
    } catch (e) {
      h.getRange(i + 1, 5).setValue('ERROR');
      h.getRange(i + 1, 7).setValue(String(e).slice(0, 120));
    }
  }
  registrar_('envio', 'Lote diario: ' + enviados + ' correos');
}

/* ================== RESPUESTAS Y BAJAS (automático) ================== */
function procesarRespuestas() {
  var ss = SpreadsheetApp.getActive();
  var h = ss.getSheetByName(CONFIG.HOJA_EMPRESAS);
  if (!h || h.getLastRow() < 2) return;
  var datos = h.getDataRange().getValues();
  var porCorreo = {};
  for (var i = 1; i < datos.length; i++) {
    var c = String(datos[i][0] || '').trim().toLowerCase();
    if (c) porCorreo[c] = i + 1; // fila real
  }

  var hilos = GmailApp.search('in:inbox newer_than:3d', 0, 60);
  var interesados = [];
  hilos.forEach(function (hilo) {
    hilo.getMessages().forEach(function (msg) {
      var de = (msg.getFrom().match(/[\w.+-]+@[\w.-]+/) || [''])[0].toLowerCase();
      var fila = porCorreo[de];
      if (!fila) return;
      var estadoActual = String(h.getRange(fila, 5).getValue());
      var cuerpo = (msg.getPlainBody() || '').slice(0, 400).toUpperCase();
      if (/\bBAJA\b/.test(cuerpo)) {
        if (estadoActual !== 'BAJA') {
          h.getRange(fila, 5).setValue('BAJA');
          registrar_('baja', de);
        }
      } else if (estadoActual === 'ENVIADO') {
        h.getRange(fila, 5).setValue('RESPONDIÓ ⭐');
        h.getRange(fila, 7).setValue('Respondió el ' + Utilities.formatDate(new Date(), 'America/Bogota', 'dd/MM HH:mm'));
        hilo.markImportant();
        interesados.push(String(h.getRange(fila, 2).getValue()) + ' <' + de + '>');
      }
    });
  });

  // Aviso inmediato al propio buzón (el papá lo ve en el celular)
  if (interesados.length > 0) {
    GmailApp.sendEmail(Session.getActiveUser().getEmail(),
      '⭐ ' + interesados.length + ' empresa(s) INTERESADA(S) — responder ya',
      'Respondieron y hay que contestarles en menos de 5 minutos:\n\n' + interesados.join('\n') +
      '\n\nBusca sus correos en la bandeja (están marcados como importantes).');
    registrar_('interesados', interesados.join(' | '));
  }
}

/* ========================= REPORTE SEMANAL ========================= */
function reporteSemanal() {
  var ss = SpreadsheetApp.getActive();
  var h = ss.getSheetByName(CONFIG.HOJA_EMPRESAS);
  var p = ss.getSheetByName(CONFIG.HOJA_REPORTE);
  if (!h || !p) return;
  var datos = h.getDataRange().getValues();
  var enviados = 0, resp = 0, bajas = 0, semana = 0;
  var hace7 = new Date(Date.now() - 7 * 86400000);
  for (var i = 1; i < datos.length; i++) {
    var est = String(datos[i][4] || '');
    if (est === 'ENVIADO' || est.indexOf('RESPONDIÓ') === 0) enviados++;
    if (est.indexOf('RESPONDIÓ') === 0) resp++;
    if (est === 'BAJA') bajas++;
    var f = datos[i][5];
    if (f instanceof Date && f > hace7) semana++;
  }
  var etiqueta = Utilities.formatDate(new Date(), 'America/Bogota', 'dd/MM/yyyy');
  p.appendRow([etiqueta, semana, resp, bajas, enviados]);
  GmailApp.sendEmail(Session.getActiveUser().getEmail(),
    '📊 Reporte semanal del motor de ventas',
    'Semana al ' + etiqueta + ':\n' +
    '• Correos enviados esta semana: ' + semana + '\n' +
    '• Empresas que han respondido (histórico): ' + resp + '\n' +
    '• Bajas: ' + bajas + '\n' +
    '• Total contactadas: ' + enviados + '\n\n' +
    'Regla de oro: responder a los interesados en menos de 5 minutos.');
}

/* ========================= PRUEBA ========================= */
function enviarPrueba() {
  var yo = Session.getActiveUser().getEmail();
  for (var i = 0; i < 3; i++) {
    var p = plantilla_(i, 'EMPRESA DE PRUEBA ' + (i + 1), ['taller', 'restaurante', 'clínica'][i]);
    GmailApp.sendEmail(yo, '[PRUEBA] ' + p.asunto, 'Prueba', { htmlBody: p.html, name: CONFIG.EMPRESA });
  }
  SpreadsheetApp.getUi().alert('Enviadas 3 pruebas a ' + yo + ' ✅\n\nRevisa que lleguen a la BANDEJA DE ENTRADA (no a spam) y que se vean bien. Si todo está bien, usa «4. ACTIVAR el motor automático».');
}

/* ========================= ACTIVAR / DESACTIVAR ========================= */
function activarMotor() {
  desactivarMotor(); // limpia duplicados
  ScriptApp.newTrigger('enviarLoteDiario').timeBased().atHour(CONFIG.HORA_ENVIO).everyDays(1).inTimezone('America/Bogota').create();
  ScriptApp.newTrigger('procesarRespuestas').timeBased().everyHours(1).create();
  ScriptApp.newTrigger('reporteSemanal').timeBased().onWeekDay(ScriptApp.WeekDay.MONDAY).atHour(7).inTimezone('America/Bogota').create();
  registrar_('motor', 'ACTIVADO');
  SpreadsheetApp.getUi().alert('🟢 Motor ACTIVADO.\n\n• Correos: cada día hábil a las ' + CONFIG.HORA_ENVIO + ':00 am\n• Respuestas y bajas: cada hora\n• Reporte: lunes 7:00 am\n\nTodo corre solo en la nube de Google — no necesita ningún computador prendido.');
}

function desactivarMotor() {
  ScriptApp.getProjectTriggers().forEach(function (t) { ScriptApp.deleteTrigger(t); });
  registrar_('motor', 'desactivado');
}

/* ========================= UTILIDADES ========================= */
function registrar_(evento, detalle) {
  var r = SpreadsheetApp.getActive().getSheetByName(CONFIG.HOJA_REGISTRO);
  if (r) r.appendRow([new Date(), evento, detalle]);
}
