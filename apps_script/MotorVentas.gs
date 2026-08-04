/**
 * ============================================================================
 * MOTOR DE VENTAS AUTOMÁTICO v3 — Dotaciones El Manantial S.A.S
 * (v3 = endurecido por banco de pruebas: 51 pruebas en simulador + 5 arreglos)
 * ============================================================================
 * Corre solo en la nube de Google (sin computador prendido).
 *   • Envía correos personalizados uno a uno desde ESTE buzón, con rampa de
 *     calentamiento automática (10→20→30→40/día según antigüedad y salud).
 *   • 2º toque automático a los 7 días a quien no respondió (suele doblar
 *     las respuestas).
 *   • Detecta respuestas cada 10 minutos: marca RESPONDIÓ ⭐, pone estrella
 *     al hilo y avisa con enlace directo (entre 7am y 9pm).
 *   • Detecta REBOTES y se AUTO-PAUSA si superan el 5% (protege la cuenta).
 *   • Freno de emergencia: 3 errores seguidos = se detiene y avisa.
 *   • Bajas seguras (solo si el cliente lo pide explícitamente; en caso de
 *     duda marca REVISAR BAJA para decisión humana).
 *   • Embudo completo en la hoja: ENVIADO → RESPONDIÓ ⭐ → COTIZADO ⭐⭐ →
 *     VENTA 🏆 (con lista desplegable) y reporte semanal de los 4 escalones.
 *
 * INSTALACIÓN: ver datos/GUIA_MOTOR_VENTAS.md (una vez, ~1 hora).
 * ============================================================================
 */

var CONFIG = {
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
  HORA_ENVIO: 8,            // 8 am Bogotá
  TECHO_DIARIO: 40,         // techo final tras el calentamiento
  PORCION_TOQUE2: 0.3,      // ~30% del cupo para segundos toques
  DIAS_PARA_TOQUE2: 7,      // días sin respuesta antes del 2º toque
  MAX_REBOTE_PCT: 5,        // % de rebotes que auto-pausa el motor
};

var ESTADOS = ['', 'ENVIADO', 'TOQUE2', 'RESPONDIÓ ⭐', 'COTIZADO ⭐⭐', 'VENTA 🏆',
               'REVISAR BAJA', 'BAJA', 'REBOTÓ', 'CORREO_INVALIDO', 'ERROR'];

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
    .addItem('6. Revisar respuestas y rebotes ahora', 'procesarRespuestas')
    .addItem('7. Generar reporte ahora', 'reporteSemanal')
    .addToUi();
}

/* ===================== PROPIEDADES (memoria del motor) ===================== */
function prop_() { return PropertiesService.getScriptProperties(); }
function correoAvisos_() {
  return prop_().getProperty('CORREO_AVISOS') || Session.getEffectiveUser().getEmail();
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
  // Lista desplegable de estados en la columna E (el papá puede marcar COTIZADO/VENTA con un toque)
  var regla = SpreadsheetApp.newDataValidation().requireValueInList(ESTADOS, true).setAllowInvalid(true).build();
  h.getRange('E2:E20000').setDataValidation(regla);

  var r = ss.getSheetByName(CONFIG.HOJA_REGISTRO) || ss.insertSheet(CONFIG.HOJA_REGISTRO);
  if (r.getLastRow() === 0) { r.appendRow(['fecha', 'evento', 'detalle']); r.setFrozenRows(1); }
  var p = ss.getSheetByName(CONFIG.HOJA_REPORTE) || ss.insertSheet(CONFIG.HOJA_REPORTE);
  if (p.getLastRow() === 0) {
    p.appendRow(['semana', 'enviados_semana', 'respuestas', 'cotizaciones', 'ventas', 'rebotes', 'bajas', 'total_historico']);
    p.setFrozenRows(1);
  }
  prop_().setProperty('CORREO_AVISOS', Session.getEffectiveUser().getEmail());
  SpreadsheetApp.getUi().alert(
    'Hojas listas ✅\n\nAhora importa EMPRESAS_PARA_SHEET.csv:\n' +
    'con la pestaña «Empresas» abierta → Archivo → Importar → Subir → ' +
    '«REEMPLAZAR HOJA ACTUAL» (así no se duplican los encabezados).\n\n' +
    'Después vuelve a ejecutar «1. Preparar hojas» para restaurar la lista desplegable de estados.');
}

/* ========================= PLANTILLAS ========================= */
// La ley (art. 232 del CST) obliga a entregar dotación 3 veces al año:
// 30 de abril, 31 de agosto y 20 de diciembre. Cada fecha es un argumento de
// venta durante las semanas previas. Devuelve la fecha próxima si estamos en
// ventana de venta, o null si no (marzo-abril, julio-agosto, noviembre-diciembre).
function ganchoLegal_() {
  var hoy = new Date();
  var m = hoy.getMonth() + 1, d = hoy.getDate();
  if (m === 3 || (m === 4 && d <= 30)) return '30 de abril';
  if (m === 7 || (m === 8 && d <= 31)) return '31 de agosto';
  if (m === 11 || (m === 12 && d <= 20)) return '20 de diciembre';
  return null;
}

function ganchoSector_(sector) {
  var s = String(sector || '').toLowerCase();
  if (/taller|llanta|repuesto|mec[aá]nic/.test(s)) return 'overoles, guantes y botas de seguridad para su equipo';
  if (/ferreter|construc|pintur|el[eé]ctric/.test(s)) return 'dotación y elementos de protección para su personal';
  if (/restaur|panader|cafeter|comida|carnicer|fruter/.test(s)) return 'uniformes, delantales y dotación para su personal';
  if (/cl[ií]nica|salud|drogu|hospital|ips|farmacia|odont|veterinar/.test(s)) return 'uniformes antifluido y dotación para su personal';
  if (/aseo|limpieza|residuo|reciclaje/.test(s)) return 'overoles, guantes y dotación para su personal operativo';
  if (/vigilancia|seguridad privada|celadur/.test(s)) return 'uniformes y dotación para su personal de vigilancia';
  if (/transporte|log[ií]stica|mensajer|domicilio/.test(s)) return 'uniformes y elementos de protección para sus conductores y operarios';
  if (/colegio|educaci|jard[ií]n infantil/.test(s)) return 'uniformes y dotación para su personal de servicios y mantenimiento';
  return 'la dotación y los elementos de protección de su personal';
}

// true si el sector tiene discurso a la medida (los de arriba responden mejor
// que el genérico). Se usa para decidir a quién escribirle primero.
function sectorConGancho_(sector) {
  var s = String(sector || '').toLowerCase();
  return /taller|llanta|repuesto|mec[aá]nic|ferreter|construc|pintur|el[eé]ctric|restaur|panader|cafeter|comida|carnicer|fruter|cl[ií]nica|salud|drogu|hospital|ips|farmacia|odont|veterinar|aseo|limpieza|residuo|reciclaje|vigilancia|seguridad privada|celadur|transporte|log[ií]stica|mensajer|domicilio|colegio|educaci|jard[ií]n infantil/.test(s);
}

// En qué orden escribirles: primero prioridad 1 (compran dotación), luego los
// sectores con discurso a la medida, y de último el resto. Con 40 correos al
// día y 11.000 empresas, el orden decide qué pasa los primeros MESES — sin
// esto, el motor gastaba semanas en filas al azar según llegó el CSV.
// Devuelve los índices de fila (saltando el encabezado) ya ordenados; a
// empate, respeta el orden de la hoja.
function ordenDeEnvio_(datos) {
  var orden = [];
  for (var i = 1; i < datos.length; i++) orden.push(i);
  function clave(i) {
    var p = Number(datos[i][3]);
    if (!p || p < 1) p = 9; // sin prioridad válida: al final de su grupo
    return p * 10 + (sectorConGancho_(datos[i][2]) ? 0 : 1);
  }
  orden.sort(function (a, b) { return clave(a) - clave(b) || a - b; });
  return orden;
}

// Primer toque: sobrio (sin emojis ni botones llamativos — pasa mejor los filtros).
function plantilla_(indice, empresa, sector) {
  var gancho = ganchoSector_(sector);
  var fechaLey = ganchoLegal_();
  var asuntos = fechaLey
    ? ['Dotación del ' + fechaLey + ' - cotización para ' + empresa,
       'Entrega de dotación del ' + fechaLey + ' - precios de fábrica',
       'Su dotación del ' + fechaLey + ' a tiempo',
       'Cotización de dotación antes del ' + fechaLey,
       'Dotación de ley del ' + fechaLey + ' - ' + CONFIG.EMPRESA,
       'Propuesta de dotación para su personal']
    : ['Cotización de dotación para ' + empresa,
       'Dotación para su personal - precios de fábrica',
       'Propuesta de dotación y EPP - Bogotá',
       'Su proveedor de dotación en Bogotá',
       'Dotación con bordado de su logo',
       'Cotización de uniformes y EPP'];
  var intro = fechaLey
    ? 'Se acerca la entrega de dotación de ley del ' + fechaLey + '.'
    : 'Sabemos lo importante que es tener a su equipo bien dotado.';
  var textoPlano =
    'Señores ' + empresa + ':\n\n' +
    intro + ' En ' + CONFIG.EMPRESA + ' (Bogotá, NIT ' + CONFIG.NIT + ') confeccionamos ' + gancho +
    ' a precios de fábrica, con descuentos desde 20 unidades y bordado de su logo.\n\n' +
    'Catálogo con precios: ' + CONFIG.CATALOGO + '\n\n' +
    'Respondemos la cotización el mismo día, sin compromiso.\n\n' +
    'Cordial saludo,\n' + CONFIG.FIRMA_NOMBRE + '\n' + CONFIG.EMPRESA + '\n' + CONFIG.DIRECCION +
    '\nTel. ' + CONFIG.TEL + ' - Cel. y WhatsApp ' + CONFIG.CEL + '\n\n' +
    'Recibió este mensaje porque su empresa aparece en directorios públicos de Bogotá. ' +
    'Si no desea recibir información, responda únicamente la palabra BAJA.';
  var html =
    '<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#2b2620;line-height:1.6;max-width:560px">' +
    '<p>Señores <b>' + empresa + '</b>:</p>' +
    '<p>' + intro + ' En <b>' + CONFIG.EMPRESA + '</b> (Bogotá, NIT ' + CONFIG.NIT + ') confeccionamos ' +
    gancho + ' a precios de fábrica, con descuentos desde 20 unidades y bordado de su logo.</p>' +
    '<p>Puede ver el catálogo con precios aquí:<br><a href="' + CONFIG.CATALOGO + '">' + CONFIG.CATALOGO + '</a></p>' +
    '<p>Respondemos la cotización <b>el mismo día</b>, sin compromiso.</p>' +
    '<p>Cordial saludo,<br><b>' + CONFIG.FIRMA_NOMBRE + '</b><br>' + CONFIG.EMPRESA + '<br>' + CONFIG.DIRECCION +
    '<br>Tel. ' + CONFIG.TEL + ' · Cel. y WhatsApp ' + CONFIG.CEL + '</p>' +
    '<p style="font-size:12px;color:#8a8072;border-top:1px solid #e7ddc9;padding-top:10px">Recibió este mensaje ' +
    'porque su empresa aparece en directorios públicos de Bogotá. Si no desea recibir información, ' +
    'responda únicamente la palabra BAJA.</p>' +
    '</div>';
  return { asunto: asuntos[indice % asuntos.length], html: html, texto: textoPlano };
}

// Segundo toque: corto y humano.
function plantillaToque2_(empresa) {
  var fechaLey = ganchoLegal_();
  var texto =
    'Señores ' + empresa + ':\n\n' +
    'Hace unos días les escribí sobre la dotación de su personal' +
    (fechaLey
      ? ' y no quiero que se les pase la entrega de ley del ' + fechaLey + '.'
      : '.') +
    ' ¿Les preparo la cotización sin compromiso?\n\n' +
    'Catálogo con precios: ' + CONFIG.CATALOGO + '\n\n' +
    'Cordial saludo,\n' + CONFIG.FIRMA_NOMBRE + '\n' + CONFIG.EMPRESA + ' · Cel. y WhatsApp ' + CONFIG.CEL + '\n\n' +
    'Si no desea recibir información, responda únicamente la palabra BAJA.';
  return {
    asunto: 'Seguimiento — dotación para ' + empresa,
    texto: texto,
    html: '<div style="font-family:Arial,sans-serif;font-size:15px;color:#2b2620;line-height:1.6;max-width:560px"><p>' +
      texto.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>') + '</p></div>',
  };
}

/* ================= CUPO CON CALENTAMIENTO AUTOMÁTICO =================
   La rampa avanza por DÍAS CON ENVÍOS REALES (no por calendario): una pausa
   larga no la hace saltar al techo con la cuenta fría. */
function cupoDeHoy_() {
  var p = prop_();
  if (p.getProperty('MOTOR_PAUSADO') === 'si') return 0;
  var dias = Number(p.getProperty('DIAS_EFECTIVOS') || 0) + 1; // hoy sería el día efectivo N
  var rampa;
  if (dias <= 3) rampa = 10;
  else if (dias <= 7) rampa = 20;
  else if (dias <= 14) rampa = 30;
  else rampa = CONFIG.TECHO_DIARIO;
  var cuotaGmail = MailApp.getRemainingDailyQuota();
  return Math.max(0, Math.min(rampa, cuotaGmail - 10));
}

// Cuenta el día como "efectivo" (avanza la rampa) solo si hoy sí se envió algo.
function contarDiaEfectivo_() {
  var p = prop_();
  var hoy = Utilities.formatDate(new Date(), 'America/Bogota', 'yyyy-MM-dd');
  if (p.getProperty('ULTIMO_DIA_EFECTIVO') !== hoy) {
    p.setProperty('ULTIMO_DIA_EFECTIVO', hoy);
    p.setProperty('DIAS_EFECTIVOS', String(Number(p.getProperty('DIAS_EFECTIVOS') || 0) + 1));
  }
}

/* ========================= ENVÍO DIARIO ========================= */
function enviarLoteDiario() {
  var dia = new Date().getDay();
  if (dia === 0 || dia === 6) return; // fines de semana no
  var cupo = cupoDeHoy_();
  if (cupo <= 0) { registrar_('cupo', 'Sin cupo hoy (pausado o cuota agotada)'); return; }

  var ss = SpreadsheetApp.getActive();
  var h = ss.getSheetByName(CONFIG.HOJA_EMPRESAS);
  if (!h || h.getLastRow() < 2) return;
  var datos = h.getDataRange().getValues();

  var cupoToque2 = Math.floor(cupo * CONFIG.PORCION_TOQUE2);
  var cupoNuevos = cupo - cupoToque2;
  var enviadosNuevos = 0, enviadosT2 = 0, erroresSeguidos = 0;
  var ahora = new Date();

  var orden = ordenDeEnvio_(datos);
  for (var k = 0; k < orden.length && (enviadosNuevos < cupoNuevos || enviadosT2 < cupoToque2); k++) {
    var i = orden[k];
    var correo = String(datos[i][0] || '').trim().toLowerCase();
    if (!correo || correo.indexOf('@') < 0) continue;
    var estado = String(datos[i][4] || '').trim();
    var empresa = String(datos[i][1] || 'Estimados señores');
    var esNuevo = (estado === '');
    var esToque2 = false;
    if (estado === 'ENVIADO') {
      var f = datos[i][5];
      esToque2 = (f instanceof Date) && ((ahora - f) / 86400000 >= CONFIG.DIAS_PARA_TOQUE2);
    }
    if (esNuevo && enviadosNuevos >= cupoNuevos) continue;
    if (esToque2 && enviadosT2 >= cupoToque2) continue;
    if (!esNuevo && !esToque2) continue;

    var p = esNuevo ? plantilla_(enviadosNuevos, empresa, datos[i][2]) : plantillaToque2_(empresa);
    try {
      GmailApp.sendEmail(correo, p.asunto, p.texto, { htmlBody: p.html, name: CONFIG.EMPRESA });
      h.getRange(i + 1, 5).setValue(esNuevo ? 'ENVIADO' : 'TOQUE2');
      h.getRange(i + 1, 6).setValue(new Date());
      if (esNuevo) enviadosNuevos++; else enviadosT2++;
      erroresSeguidos = 0;
      Utilities.sleep(1500 + Math.floor(Math.random() * 2500)); // ritmo humano
    } catch (e) {
      var msg = String(e);
      if (/invalid.*(email|address)|dirección/i.test(msg)) {
        h.getRange(i + 1, 5).setValue('CORREO_INVALIDO');
        h.getRange(i + 1, 7).setValue(msg.slice(0, 100));
      } else {
        // Error de servicio/cuota: NO marcar la fila (queda pendiente) y contar
        erroresSeguidos++;
        registrar_('error_envio', correo + ' :: ' + msg.slice(0, 120));
        if (erroresSeguidos >= 3) {
          // FRENO DE EMERGENCIA: algo anda mal con Gmail — parar ya
          avisar_('⛔ Motor detenido por seguridad',
            'Hubo 3 errores de servicio en este lote. El motor lo detuvo para proteger la cuenta.\n' +
            'Último error: ' + msg.slice(0, 200) + '\n\nRevisa el Registro. Mañana lo intenta de nuevo solo.');
          registrar_('freno', '3 errores de servicio — lote detenido');
          break;
        }
      }
    }
  }
  if (enviadosNuevos + enviadosT2 > 0) contarDiaEfectivo_();
  registrar_('envio', 'Nuevos: ' + enviadosNuevos + ' · 2º toque: ' + enviadosT2 + ' · cupo: ' + cupo);
}

/* ============ RESPUESTAS, REBOTES Y BAJAS (cada 10 minutos) ============ */

// Limpia el texto citado de una respuesta (líneas ">" y todo lo posterior a "El ... escribió:")
function textoPropio_(cuerpo) {
  var lineas = String(cuerpo || '').split('\n');
  var propias = [];
  for (var i = 0; i < lineas.length; i++) {
    var l = lineas[i];
    if (/^\s*(El|On) .{5,80}(escribió|escribio|wrote):?\s*$/.test(l)) break;
    if (/^\s*>/.test(l)) continue;
    if (/^-{2,}\s*(Mensaje original|Original message|Forwarded)/i.test(l)) break;
    propias.push(l);
  }
  return propias.join('\n').trim();
}

function esBajaExplicita_(textoPropio) {
  var t = textoPropio.toUpperCase();
  var primera = (textoPropio.split('\n').map(function (l) { return l.trim(); }).filter(String)[0] || '').toUpperCase();
  if (/^BAJA[.!\s]*$/.test(primera)) return 'si';
  if (/DARME DE BAJA|DENME DE BAJA|NO (ME )?ENV[IÍ]EN? M[AÁ]S|NO DESEO RECIBIR|QUITAR(ME)? DE LA LISTA|UNSUBSCRIBE|REMOVER DE LA LISTA/.test(t)) return 'si';
  if (/\bBAJA\b/.test(t)) return 'dudoso'; // menciona la palabra pero no es claro → humano decide
  return 'no';
}

function procesarRespuestas() {
  var ss = SpreadsheetApp.getActive();
  var h = ss.getSheetByName(CONFIG.HOJA_EMPRESAS);
  if (!h || h.getLastRow() < 2) return;
  var datos = h.getDataRange().getValues();
  var porCorreo = {};
  for (var i = 1; i < datos.length; i++) {
    var c = String(datos[i][0] || '').trim().toLowerCase();
    if (c) porCorreo[c] = i + 1;
  }

  // 1) REBOTES (mailer-daemon) — la salud de la cuenta depende de esto
  var rebotes = 0;
  var hilosRebote = GmailApp.search('from:(mailer-daemon OR postmaster) newer_than:2d', 0, 50);
  hilosRebote.forEach(function (hilo) {
    hilo.getMessages().forEach(function (msg) {
      var cuerpo = msg.getPlainBody() || '';
      var m = cuerpo.match(/[\w.+-]+@[\w.-]+\.\w{2,}/g) || [];
      m.forEach(function (dir) {
        var fila = porCorreo[dir.toLowerCase()];
        if (fila) {
          var est = String(h.getRange(fila, 5).getValue());
          if (est === 'ENVIADO' || est === 'TOQUE2') {
            h.getRange(fila, 5).setValue('REBOTÓ');
            rebotes++;
          }
        }
      });
    });
  });

  // Auto-pausa por salud: tasa ACUMULADA de filas REBOTÓ recientes (no solo
  // las de esta corrida — los rebotes llegan goteados durante horas).
  var datosFrescos = h.getDataRange().getValues();
  var enviadosRecientes = 0, rebotesRecientes = 0;
  var hace2d = new Date(Date.now() - 2 * 86400000);
  for (var j = 1; j < datosFrescos.length; j++) {
    var f = datosFrescos[j][5];
    if (f instanceof Date && f > hace2d) {
      enviadosRecientes++;
      if (String(datosFrescos[j][4]) === 'REBOTÓ') rebotesRecientes++;
    }
  }
  if (enviadosRecientes >= 10 && (rebotesRecientes / enviadosRecientes) * 100 > CONFIG.MAX_REBOTE_PCT &&
      prop_().getProperty('MOTOR_PAUSADO') !== 'si') {
    prop_().setProperty('MOTOR_PAUSADO', 'si');
    avisar_('⛔ Motor AUTO-PAUSADO por rebotes altos',
      'Rebotaron ' + rebotesRecientes + ' de ' + enviadosRecientes + ' correos recientes (>' + CONFIG.MAX_REBOTE_PCT +
      '%).\nEl motor se pausó solo para proteger la cuenta. Hay que limpiar la lista antes de reactivar\n' +
      '(la pausa se quita ejecutando «4. ACTIVAR el motor» de nuevo).');
    registrar_('auto-pausa', rebotesRecientes + ' de ' + enviadosRecientes + ' rebotados');
  }

  // 2) RESPUESTAS y BAJAS (busca en todo el correo, no solo la bandeja; pagina)
  var interesados = [];
  var start = 0, LOTE = 80;
  while (start < 400) {
    var hilos = GmailApp.search('newer_than:4d -from:me -in:chats -from:(mailer-daemon OR postmaster)', start, LOTE);
    if (!hilos.length) break;
    hilos.forEach(function (hilo) {
      hilo.getMessages().forEach(function (msg) {
        var de = (msg.getFrom().match(/[\w.+-]+@[\w.-]+/) || [''])[0].toLowerCase();
        var fila = porCorreo[de];
        if (!fila) return;
        var estadoActual = String(h.getRange(fila, 5).getValue());
        // Nunca tocar estados avanzados que puso el humano ni bajas confirmadas.
        // OJO: 'REVISAR BAJA' NO se protege — una BAJA explícita posterior sí debe aplicarse.
        if (/COTIZADO|VENTA/.test(estadoActual) || estadoActual === 'BAJA') return;
        var propio = textoPropio_(msg.getPlainBody());
        var baja = esBajaExplicita_(propio);
        if (baja === 'si') {
          h.getRange(fila, 5).setValue('BAJA');
          registrar_('baja', de);
        } else if (baja === 'dudoso' && estadoActual !== 'RESPONDIÓ ⭐') {
          h.getRange(fila, 5).setValue('REVISAR BAJA');
          h.getRange(fila, 7).setValue('Menciona "baja" — revisar: ' + propio.slice(0, 80));
        } else if (estadoActual === 'ENVIADO' || estadoActual === 'TOQUE2' || estadoActual === '') {
          h.getRange(fila, 5).setValue('RESPONDIÓ ⭐');
          h.getRange(fila, 7).setValue('Respondió ' + Utilities.formatDate(new Date(), 'America/Bogota', 'dd/MM HH:mm'));
          try { msg.star(); hilo.markImportant(); } catch (e2) {}
          interesados.push({
            texto: String(h.getRange(fila, 2).getValue()) + ' <' + de + '>',
            enlace: 'https://mail.google.com/mail/u/0/#inbox/' + hilo.getId(),
            resumen: propio.slice(0, 120),
          });
        }
      });
    });
    start += LOTE;
  }

  // 3) Avisos de interesados (solo entre 7am y 9pm; fuera de horario quedan en cola)
  if (interesados.length) {
    var cola = JSON.parse(prop_().getProperty('COLA_AVISOS') || '[]');
    cola = cola.concat(interesados);
    prop_().setProperty('COLA_AVISOS', JSON.stringify(cola));
  }
  var hora = Number(Utilities.formatDate(new Date(), 'America/Bogota', 'H'));
  var enVentana = hora >= 7 && hora < 21;

  // Reintentar avisos del sistema que fallaron antes (freno, auto-pausa, reporte)
  if (enVentana) reintentarAvisosFallidos_();

  var pendientes = JSON.parse(prop_().getProperty('COLA_AVISOS') || '[]');
  if (pendientes.length && enVentana) {
    var cuerpoAviso = 'NO RESPONDA ESTE CORREO — responda directamente a cada cliente:\n\n' +
      pendientes.map(function (x) {
        return '• ' + x.texto + '\n  Dice: "' + x.resumen + '"\n  Abrir su correo: ' + x.enlace;
      }).join('\n\n') +
      '\n\nRegla de oro: contestarles en menos de 5 minutos. Sus correos tienen estrella ⭐ en la bandeja.';
    try {
      GmailApp.sendEmail(correoAvisos_(), '⭐ ' + pendientes.length + ' empresa(s) INTERESADA(S) — responder ya', cuerpoAviso);
      registrar_('interesados', pendientes.map(function (x) { return x.texto; }).join(' | '));
      // La cola SOLO se limpia si el aviso salió — si falla, se reintenta en 10 min.
      prop_().setProperty('COLA_AVISOS', '[]');
    } catch (eAviso) {
      registrar_('error_aviso', 'Aviso de interesados falló, se reintenta: ' + String(eAviso).slice(0, 100));
    }
  }
}

/* ========================= REPORTE SEMANAL ========================= */
function reporteSemanal() {
  var ss = SpreadsheetApp.getActive();
  var h = ss.getSheetByName(CONFIG.HOJA_EMPRESAS);
  var p = ss.getSheetByName(CONFIG.HOJA_REPORTE);
  if (!h || !p) return;
  var datos = h.getDataRange().getValues();
  var tot = { semana: 0, resp: 0, cot: 0, venta: 0, rebote: 0, baja: 0, hist: 0 };
  var hace7 = new Date(Date.now() - 7 * 86400000);
  for (var i = 1; i < datos.length; i++) {
    var est = String(datos[i][4] || '');
    if (est && est !== 'CORREO_INVALIDO' && est !== 'ERROR') tot.hist++;
    if (/RESPONDIÓ|COTIZADO|VENTA/.test(est)) tot.resp++;
    if (/COTIZADO|VENTA/.test(est)) tot.cot++;
    if (/VENTA/.test(est)) tot.venta++;
    if (est === 'REBOTÓ') tot.rebote++;
    if (est === 'BAJA') tot.baja++;
    var f = datos[i][5];
    if (f instanceof Date && f > hace7) tot.semana++;
  }
  var etiqueta = Utilities.formatDate(new Date(), 'America/Bogota', 'dd/MM/yyyy');
  p.appendRow([etiqueta, tot.semana, tot.resp, tot.cot, tot.venta, tot.rebote, tot.baja, tot.hist]);
  var pct = tot.hist ? Math.round((tot.resp / tot.hist) * 1000) / 10 : 0;
  avisar_('📊 Reporte semanal del motor de ventas',
    'Semana al ' + etiqueta + ':\n' +
    '• Enviados esta semana: ' + tot.semana + '\n' +
    '• EMBUDO histórico: contactadas ' + tot.hist + ' → respondieron ' + tot.resp + ' (' + pct + '%) → cotizadas ' +
    tot.cot + ' → VENTAS ' + tot.venta + '\n' +
    '• Rebotes: ' + tot.rebote + ' · Bajas: ' + tot.baja + '\n\n' +
    'Cuando cotice o venda, cambie el estado de la fila en la hoja (lista desplegable): COTIZADO ⭐⭐ o VENTA 🏆.');
}

/* ========================= PRUEBA ========================= */
// La prueba de fuego se envía a un buzón EXTERNO (el personal de Diego):
// autoenviarse al mismo buzón no demuestra que los correos lleguen a otros.
function enviarPrueba() {
  var ui = SpreadsheetApp.getUi();
  var propio = correoAvisos_();
  var resp = ui.prompt('Prueba de entregabilidad',
    'Escribe un correo EXTERNO tuyo (tu Gmail personal, y mejor aún uno de Outlook/Hotmail) ' +
    'para comprobar que los mensajes llegan a la bandeja de entrada de OTRAS cuentas.\n' +
    'Si lo dejas vacío se usa este mismo buzón (' + propio + '), que prueba menos.',
    ui.ButtonSet.OK_CANCEL);
  if (resp.getSelectedButton() !== ui.Button.OK) return;
  var destino = String(resp.getResponseText() || '').trim() || propio;
  for (var i = 0; i < 3; i++) {
    var p = plantilla_(i, 'EMPRESA DE PRUEBA ' + (i + 1), ['taller', 'restaurante', 'clínica'][i]);
    GmailApp.sendEmail(destino, '[PRUEBA] ' + p.asunto, p.texto, { htmlBody: p.html, name: CONFIG.EMPRESA });
  }
  var t2 = plantillaToque2_('EMPRESA DE PRUEBA');
  GmailApp.sendEmail(destino, '[PRUEBA 2º toque] ' + t2.asunto, t2.texto, { htmlBody: t2.html, name: CONFIG.EMPRESA });
  ui.alert('Enviadas 4 pruebas a ' + destino + ' ✅\n\nRevisa en ESE buzón: 1) que lleguen a BANDEJA DE ENTRADA ' +
    '(no a spam), 2) que se vean bien, 3) que el enlace del catálogo abra.\n' +
    'Si todo bien → «4. ACTIVAR el motor automático».');
}

/* ========================= ACTIVAR / DESACTIVAR ========================= */
function activarMotor() {
  desactivarMotor();
  prop_().deleteProperty('MOTOR_PAUSADO'); // reactivar también quita la auto-pausa
  prop_().setProperty('CORREO_AVISOS', Session.getEffectiveUser().getEmail());
  ScriptApp.newTrigger('enviarLoteDiario').timeBased().atHour(CONFIG.HORA_ENVIO).everyDays(1).inTimezone('America/Bogota').create();
  ScriptApp.newTrigger('procesarRespuestas').timeBased().everyMinutes(10).create();
  ScriptApp.newTrigger('reporteSemanal').timeBased().onWeekDay(ScriptApp.WeekDay.MONDAY).atHour(7).inTimezone('America/Bogota').create();
  registrar_('motor', 'ACTIVADO (rampa: 10→20→30→' + CONFIG.TECHO_DIARIO + '/día)');
  SpreadsheetApp.getUi().alert('🟢 Motor ACTIVADO con calentamiento automático.\n\n' +
    '• Días 1-3: 10 correos/día · Días 4-7: 20 · Semana 2: 30 · Después: ' + CONFIG.TECHO_DIARIO + '\n' +
    '• 2º toque automático a los ' + CONFIG.DIAS_PARA_TOQUE2 + ' días sin respuesta\n' +
    '• Respuestas y rebotes: cada 10 minutos (avisos de 7am a 9pm)\n' +
    '• Se AUTO-PAUSA si los rebotes superan el ' + CONFIG.MAX_REBOTE_PCT + '%\n' +
    '• Reporte: lunes 7:00 am\n\nTodo corre solo en la nube de Google.');
}

function desactivarMotor() {
  ScriptApp.getProjectTriggers().forEach(function (t) { ScriptApp.deleteTrigger(t); });
  registrar_('motor', 'desactivado');
}

/* ========================= UTILIDADES ========================= */
// Envía un aviso del sistema; si Gmail falla, lo ENCOLA y se reintenta cada
// 10 minutos (nunca se pierde un aviso de freno/pausa/reporte).
function avisar_(asunto, cuerpo) {
  try {
    GmailApp.sendEmail(correoAvisos_(), asunto, cuerpo);
    return true;
  } catch (e) {
    registrar_('error_aviso', String(e).slice(0, 120));
    var q = JSON.parse(prop_().getProperty('AVISOS_FALLIDOS') || '[]');
    q.push({ a: asunto, c: cuerpo });
    if (q.length > 10) q = q.slice(-10);
    prop_().setProperty('AVISOS_FALLIDOS', JSON.stringify(q));
    return false;
  }
}

function reintentarAvisosFallidos_() {
  var q = JSON.parse(prop_().getProperty('AVISOS_FALLIDOS') || '[]');
  if (!q.length) return;
  var quedan = [];
  q.forEach(function (av) {
    try { GmailApp.sendEmail(correoAvisos_(), av.a + ' (reintento)', av.c); }
    catch (e) { quedan.push(av); }
  });
  prop_().setProperty('AVISOS_FALLIDOS', JSON.stringify(quedan));
}
function registrar_(evento, detalle) {
  var r = SpreadsheetApp.getActive().getSheetByName(CONFIG.HOJA_REGISTRO);
  if (r) r.appendRow([new Date(), evento, detalle]);
}
