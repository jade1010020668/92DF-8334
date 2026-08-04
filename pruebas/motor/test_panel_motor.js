/**
 * Pruebas del panel web del motor ("sale a buscar" — sala de control):
 * apiPanel() (la fotografía del estado), apiAccion() (las órdenes) y doGet().
 */
const sim = require(require('path').join(__dirname, 'gas_mock.js'));
sim.instalar();
sim.cargarMotor();

const resultados = [];
function prueba(nombre, fn) {
  try {
    const detalle = fn();
    resultados.push({ nombre, paso: true, detalle: detalle || 'ok' });
  } catch (e) {
    resultados.push({ nombre, paso: false, detalle: String((e && e.message) || e) });
  }
}
function assert(cond, msg) { if (!cond) throw new Error(msg); }

function reset(isoAhora) {
  const e = sim.estado;
  e.hojas = {}; e.correosEnviados = []; e.hilos = []; e.props = {};
  e.cuotaGmail = 100; e.triggers = []; e.alertasUi = []; e.forzarError = null;
  e.ahora = new global.__DateReal(isoAhora || '2026-08-04T15:00:00Z'); // martes 10am Bogotá
}
function hojas(filasEmpresas, filasRegistro) {
  sim.estado.hojas['Empresas'] = { filas: [['correo','empresa','sector','prioridad','estado','fecha_envio','notas']].concat(filasEmpresas || []) };
  sim.estado.hojas['Registro'] = { filas: [['fecha','evento','detalle']].concat(filasRegistro || []) };
}

/* ============ apiPanel ============ */
prueba('apiPanel: cuenta cada estado del embudo y los pendientes con correo válido', () => {
  reset();
  sim.estado.props.DIAS_EFECTIVOS = '4'; // día 5 → rampa 20
  hojas([
    ['a@x.co','A','taller',1,'','',''],
    ['sin-arroba','B','taller',1,'','',''],          // pendiente SIN correo válido: no cuenta
    ['c@x.co','C','taller',1,'ENVIADO','',''],
    ['d@x.co','D','taller',1,'TOQUE2','',''],
    ['e@x.co','E','taller',1,'RESPONDIÓ ⭐','',''],
    ['f@x.co','F','taller',1,'COTIZADO ⭐⭐','',''],
    ['g@x.co','G','taller',1,'VENTA 🏆','',''],
    ['h@x.co','H','taller',1,'REBOTÓ','',''],
    ['i@x.co','I','taller',1,'BAJA','',''],
    ['j@x.co','J','taller',1,'REVISAR BAJA','',''],
    ['k@x.co','K','taller',1,'CORREO_INVALIDO','',''],
  ]);
  const est = apiPanel();
  const c = est.conteos;
  assert(c.pendientes === 1, 'pendientes=' + c.pendientes);
  assert(c.enviadas === 1 && c.toque2 === 1 && c.respondieron === 1, 'contactadas mal contadas: ' + JSON.stringify(c));
  assert(c.cotizadas === 1 && c.ventas === 1, 'cotizadas/ventas: ' + JSON.stringify(c));
  assert(c.rebotes === 1 && c.bajas === 2 && c.invalidos === 1, 'salud mal contada: ' + JSON.stringify(c));
  assert(est.diaRampa === 5 && est.cupoHoy === 20, 'rampa: dia=' + est.diaRampa + ' cupo=' + est.cupoHoy);
  assert(est.ganchoLegal === '31 de agosto', 'gancho=' + est.ganchoLegal);
  assert(est.correoAvisos === 'ventas.prueba@gmail.com', 'correoAvisos=' + est.correoAvisos);
  return 'los 9 estados van cada uno a su casilla; fila sin @ no infla los pendientes';
});

prueba('apiPanel: recién instalado (sin hojas, sin triggers) no revienta', () => {
  reset();
  const est = apiPanel();
  assert(est.activado === false, 'sin triggers debía ser activado=false');
  assert(est.pausado === false, 'pausado=' + est.pausado);
  assert(est.conteos.pendientes === 0 && est.conteos.ventas === 0, 'conteos no vacíos');
  assert(est.eventos.length === 0, 'eventos fantasma: ' + JSON.stringify(est.eventos));
  assert(est.diasParaAgotar === 0, 'diasParaAgotar=' + est.diasParaAgotar);
  return 'antes de «Preparar hojas» el panel muestra ceros y «Sin activar», no un error';
});

prueba('apiPanel: pausado informa cupo 0 pero calcula diasParaAgotar con el techo', () => {
  reset();
  sim.estado.props.MOTOR_PAUSADO = 'si';
  sim.estado.props.DIAS_EFECTIVOS = '19';
  const filas = [];
  for (let i = 0; i < 80; i++) filas.push(['p' + i + '@x.co', 'P' + i, 'taller', 2, '', '', '']);
  hojas(filas);
  const est = apiPanel();
  assert(est.pausado === true && est.cupoHoy === 0, 'pausado/cupo: ' + est.pausado + '/' + est.cupoHoy);
  assert(est.diasParaAgotar === 2, '80 pendientes / techo 40 = 2, dio ' + est.diasParaAgotar);
  return 'con el motor pausado el cupo es 0 y la estimación usa el techo (80/40 = 2 días)';
});

prueba('apiPanel: los eventos salen del Registro, más recientes primero, máximo 8', () => {
  reset();
  const reg = [];
  for (let i = 1; i <= 12; i++) reg.push([new Date(sim.estado.ahora.getTime() - i * 60000), 'evento' + i, 'detalle ' + i]);
  hojas([], reg);
  const est = apiPanel();
  assert(est.eventos.length === 8, 'esperaba 8, dio ' + est.eventos.length);
  assert(est.eventos[0].evento === 'evento12', 'el primero debía ser el último anotado, fue ' + est.eventos[0].evento);
  assert(/^\d{2}\/\d{2} \d{2}:\d{2}$/.test(est.eventos[0].fecha), 'fecha sin formato dd/MM HH:mm: ' + est.eventos[0].fecha);
  return '12 eventos en la hoja → el panel muestra los 8 últimos, del más nuevo al más viejo';
});

/* ============ apiAccion ============ */
prueba('apiAccion: pausar y reanudar mueven la propiedad, anotan en Registro y devuelven estado fresco', () => {
  reset(); hojas();
  let est = apiAccion('pausar');
  assert(sim.estado.props.MOTOR_PAUSADO === 'si', 'no quedó pausado');
  assert(est.pausado === true, 'el estado devuelto no refleja la pausa');
  est = apiAccion('reanudar');
  assert(!('MOTOR_PAUSADO' in sim.estado.props), 'no se reanudó');
  assert(est.pausado === false, 'el estado devuelto no refleja la reanudación');
  const eventos = sim.estado.hojas['Registro'].filas.slice(1).map(f => f[2]);
  assert(eventos.some(d => /pausado desde el panel/.test(d)), 'no se anotó la pausa');
  assert(eventos.some(d => /reanudado desde el panel/.test(d)), 'no se anotó la reanudación');
  return 'pausar/reanudar: propiedad + registro + estado fresco en la misma respuesta';
});

prueba('apiAccion: activar crea los 3 horarios SIN pedir interfaz de la hoja', () => {
  reset(); hojas();
  const est = apiAccion('activar');
  assert(sim.estado.triggers.length === 3, 'esperaba 3 triggers, hay ' + sim.estado.triggers.length);
  assert(est.activado === true, 'el estado devuelto no marca activado');
  assert(sim.estado.alertasUi.length === 0, 'apiAccion(activar) abrió una alerta de UI — desde el panel web eso revienta');
  const fns = sim.estado.triggers.map(t => t.fn).sort();
  assert(JSON.stringify(fns) === JSON.stringify(['enviarLoteDiario','procesarRespuestas','reporteSemanal']),
    'triggers: ' + fns.join(','));
  return 'activar desde el panel = 3 horarios creados, cero ventanas emergentes de la hoja';
});

prueba('apiAccion: lote envía de verdad y respuestas procesa; ambas quedan anotadas', () => {
  reset();
  sim.estado.props.DIAS_EFECTIVOS = '0';
  hojas([['a@x.co','ACME','taller',1,'','','']]);
  let est = apiAccion('lote');
  assert(sim.estado.correosEnviados.length === 1, 'el lote no envió: ' + sim.estado.correosEnviados.length);
  assert(est.conteos.enviadas === 1 && est.conteos.pendientes === 0, 'el estado devuelto no refleja el envío');
  est = apiAccion('respuestas');
  const eventos = sim.estado.hojas['Registro'].filas.slice(1).map(f => f[1] + '|' + f[2]);
  assert(eventos.some(e => /lote pedido a mano/.test(e)), 'no se anotó el lote manual');
  assert(eventos.some(e => /revisión de respuestas pedida/.test(e)), 'no se anotó la revisión manual');
  return 'lote manual: 1 correo salió y el panel lo ve al instante; todo queda en Registro';
});

prueba('apiAccion: prueba manda los 4 correos al buzón de avisos, sin ventana de pregunta', () => {
  reset(); hojas();
  apiAccion('prueba');
  const envs = sim.estado.correosEnviados;
  assert(envs.length === 4, 'esperaba 4 correos de prueba, hubo ' + envs.length);
  assert(envs.every(c => c.to === 'ventas.prueba@gmail.com'), 'no fueron al buzón de avisos');
  assert(envs.filter(c => /^\[PRUEBA\]/.test(c.subject)).length === 3, 'faltan las 3 plantillas de primer toque');
  assert(envs.some(c => /^\[PRUEBA 2º toque\]/.test(c.subject)), 'falta la prueba del 2º toque');
  assert(sim.estado.alertasUi.length === 0, 'abrió UI de la hoja desde el panel');
  return '3 primeras plantillas + 1 segundo toque al buzón de avisos, sin prompt';
});

prueba('apiAccion: una orden desconocida revienta claro (no hace nada en silencio)', () => {
  reset(); hojas();
  let fallo = null;
  try { apiAccion('formatear-todo'); } catch (e) { fallo = String(e); }
  assert(fallo && /Acción desconocida/.test(fallo), 'no reventó o el mensaje no explica: ' + fallo);
  return 'una acción que el motor no conoce lanza error explícito en vez de fingir éxito';
});

/* ============ doGet ============ */
prueba('doGet: sirve PanelMotor con título y viewport para celular', () => {
  reset();
  const salida = doGet();
  assert(salida.archivo === 'PanelMotor', 'sirvió otro archivo: ' + salida.archivo);
  assert(/Motor de ventas/.test(salida.titulo), 'título: ' + salida.titulo);
  assert(salida.metas.some(m => m[0] === 'viewport'), 'sin meta viewport (en el celular se vería diminuto)');
  return 'la app web sirve PanelMotor.html con título propio y viewport móvil';
});

/* ============ salida ============ */
console.log(JSON.stringify(resultados, null, 2));
const fallas = resultados.filter(r => !r.paso).length;
console.log('TOTAL: ' + resultados.length + ' pruebas, ' + fallas + ' fallas');
process.exit(0);
