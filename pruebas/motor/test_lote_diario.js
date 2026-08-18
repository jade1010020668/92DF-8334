/**
 * Pruebas del subsistema enviarLoteDiario() de MotorVentas.gs
 * (envíos, 2º toque, reparto 70/30, correo inválido, freno de emergencia, rotación de asuntos)
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

// martes 28-jul-2026, 8:00 am Bogotá (13:00Z) — día hábil
const AHORA_ISO = '2026-07-28T13:00:00Z';

function resetear(cuota) {
  sim.estado.hojas = {};
  sim.estado.correosEnviados = [];
  sim.estado.hilos = [];
  // FECHA_INICIO_ENVIOS hace >14 días → rampa = TECHO_DIARIO = 40
  sim.estado.props = { FECHA_INICIO_ENVIOS: '2026-06-01T12:00:00Z' };
  sim.estado.cuotaGmail = cuota === undefined ? 100 : cuota; // cupo = min(40, cuota-10)
  sim.estado.ahora = new global.__DateReal(AHORA_ISO);
  sim.estado.triggers = [];
  sim.estado.alertasUi = [];
  sim.estado.forzarError = null;
  sim.estado.hojas['Registro'] = { filas: [['fecha', 'evento', 'detalle']] };
}
function hojaEmpresas(filas) {
  sim.estado.hojas['Empresas'] = {
    filas: [['correo', 'empresa', 'sector', 'prioridad', 'estado', 'fecha_envio', 'notas'], ...filas],
  };
}
const filasEmpresas = () => sim.estado.hojas['Empresas'].filas;
const registroEventos = () => sim.estado.hojas['Registro'].filas.slice(1).map(f => f[1]);
// new Date(...) con args crea instancia de la clase Date parcheada (pasa `instanceof Date` dentro del motor)
const D = (s) => new Date(s);

/* ---------- (1) filas nuevas → ENVIADO con fecha ---------- */
prueba('1. Filas nuevas se marcan ENVIADO con fecha de hoy', () => {
  resetear();
  hojaEmpresas([
    ['a@x.co', 'Alfa Ltda', 'taller', '', '', '', ''],
    ['b@x.co', 'Beta SAS', 'restaurante', '', '', '', ''],
  ]);
  global.enviarLoteDiario();
  const f = filasEmpresas();
  assert(f[1][4] === 'ENVIADO', 'fila 1 esperaba ENVIADO, quedó "' + f[1][4] + '"');
  assert(f[2][4] === 'ENVIADO', 'fila 2 esperaba ENVIADO, quedó "' + f[2][4] + '"');
  assert(f[1][5] instanceof global.__DateReal, 'fecha_envio fila 1 no es Date');
  assert(f[1][5].getTime() === new global.__DateReal(AHORA_ISO).getTime(),
    'fecha_envio fila 1 no es la fecha de hoy: ' + f[1][5]);
  assert(f[2][5] instanceof global.__DateReal && f[2][5].getTime() === new global.__DateReal(AHORA_ISO).getTime(),
    'fecha_envio fila 2 incorrecta');
  const envs = sim.estado.correosEnviados;
  assert(envs.length === 2, 'esperaba 2 correos, hubo ' + envs.length);
  assert(envs[0].to === 'a@x.co' && envs[1].to === 'b@x.co', 'destinatarios: ' + envs.map(e => e.to).join(','));
  assert(envs[0].opts && envs[0].opts.htmlBody, 'falta htmlBody');
  return '2 filas nuevas → ENVIADO, fecha_envio = ' + AHORA_ISO + ', 2 correos salieron (a@x.co, b@x.co)';
});

/* ---------- (2) 2º toque a los 8 días; a los 2 días NO ---------- */
prueba('2. ENVIADO hace 8 días recibe 2º toque (TOQUE2, asunto "Seguimiento —"); hace 2 días NO', () => {
  resetear();
  hojaEmpresas([
    ['viejo@x.co', 'Empresa Vieja', 'ferreteria', '', 'ENVIADO', D('2026-07-20T13:00:00Z'), ''],   // 8 días
    ['reciente@x.co', 'Empresa Reciente', 'taller', '', 'ENVIADO', D('2026-07-26T13:00:00Z'), ''], // 2 días
  ]);
  global.enviarLoteDiario();
  const f = filasEmpresas();
  assert(f[1][4] === 'TOQUE2', 'fila vieja esperaba TOQUE2, quedó "' + f[1][4] + '"');
  assert(f[1][5].getTime() === new global.__DateReal(AHORA_ISO).getTime(), 'fecha del toque2 no se actualizó a hoy');
  assert(f[2][4] === 'ENVIADO', 'fila reciente debía seguir ENVIADO, quedó "' + f[2][4] + '"');
  assert(f[2][5].getTime() === new global.__DateReal('2026-07-26T13:00:00Z').getTime(),
    'fecha de la fila reciente no debía cambiar');
  const envs = sim.estado.correosEnviados;
  assert(envs.length === 1, 'esperaba 1 solo correo (el toque2), hubo ' + envs.length);
  assert(envs[0].to === 'viejo@x.co', 'toque2 fue a ' + envs[0].to);
  assert(/^Seguimiento —/.test(envs[0].subject), 'asunto no empieza con "Seguimiento —": "' + envs[0].subject + '"');
  return 'Toque2 solo a la de 8 días; asunto: "' + envs[0].subject + '"; la de 2 días quedó intacta';
});

/* ---------- (3) reparto 70/30 con cupo 10 ---------- */
prueba('3. Reparto 70/30: cupo 10, 20 nuevas y 20 elegibles a toque2 → 7 nuevos y 3 toque2', () => {
  resetear(20); // cupo = min(40, 20-10) = 10
  const nuevas = [], toque2 = [];
  for (let k = 1; k <= 20; k++) nuevas.push(['n' + k + '@x.co', 'Nueva ' + k, 'taller', '', '', '', '']);
  for (let k = 1; k <= 20; k++) toque2.push(['t' + k + '@x.co', 'Toc ' + k, 'salud', '', 'ENVIADO', D('2026-07-18T13:00:00Z'), '']);
  hojaEmpresas([...nuevas, ...toque2]);
  global.enviarLoteDiario();
  const f = filasEmpresas();
  const nuevasEnviadas = f.slice(1, 21).filter(r => r[4] === 'ENVIADO').length;
  const t2Enviados = f.slice(21).filter(r => r[4] === 'TOQUE2').length;
  const total = sim.estado.correosEnviados.length;
  assert(total === 10, 'esperaba 10 correos en total, hubo ' + total);
  assert(nuevasEnviadas === 7, 'esperaba 7 nuevos, hubo ' + nuevasEnviadas);
  assert(t2Enviados === 3, 'esperaba 3 toque2, hubo ' + t2Enviados);
  const resumen = sim.estado.hojas['Registro'].filas.find(r => r[1] === 'envio');
  assert(resumen && /Nuevos: 7 .+2º toque: 3 .+cupo: 10/.test(resumen[2]),
    'registro no cuadra: ' + (resumen && resumen[2]));
  return 'Con cupo 10: 7 nuevos + 3 toque2 = 10 correos. Registro: "' + resumen[2] + '"';
});

/* ---------- (4) correo inválido → CORREO_INVALIDO y sigue ---------- */
prueba('4. Error "Invalid email address" marca CORREO_INVALIDO y el lote continúa', () => {
  resetear();
  hojaEmpresas([
    ['ok1@x.co', 'Ok Uno', 'taller', '', '', '', ''],
    ['malo@x.co', 'Correo Malo', 'salud', '', '', '', ''],
    ['ok2@x.co', 'Ok Dos', 'restaurante', '', '', '', ''],
  ]);
  sim.estado.forzarError = (to) => {
    if (to === 'malo@x.co') throw new Error('Invalid email address: malo@x.co');
  };
  global.enviarLoteDiario();
  const f = filasEmpresas();
  assert(f[1][4] === 'ENVIADO', 'ok1 esperaba ENVIADO, quedó "' + f[1][4] + '"');
  assert(f[2][4] === 'CORREO_INVALIDO', 'malo esperaba CORREO_INVALIDO, quedó "' + f[2][4] + '"');
  assert(String(f[2][6]).includes('Invalid email address'), 'notas sin el mensaje de error: "' + f[2][6] + '"');
  assert(f[3][4] === 'ENVIADO', 'ok2 esperaba ENVIADO (el lote debía seguir), quedó "' + f[3][4] + '"');
  const envs = sim.estado.correosEnviados;
  assert(envs.length === 2 && envs.map(e => e.to).join(',') === 'ok1@x.co,ok2@x.co',
    'correos enviados: ' + envs.map(e => e.to).join(','));
  return 'Fila mala → CORREO_INVALIDO (mensaje en notas); ok1 y ok2 salieron normal, sin frenar el lote';
});

/* ---------- (5a) freno: fallo de servicio en TODOS los envíos (literal) ---------- */
prueba('5a. Fallo de servicio en TODOS los sendEmail: tras 3 errores el lote PARA y las filas quedan sin marcar', () => {
  resetear();
  const filas = [];
  for (let k = 1; k <= 6; k++) filas.push(['s' + k + '@x.co', 'Srv ' + k, 'taller', '', '', '', '']);
  hojaEmpresas(filas);
  sim.estado.forzarError = () => { throw new Error('Service invoked too many times for one day: Email'); };
  global.enviarLoteDiario();
  const f = filasEmpresas();
  for (let k = 1; k <= 6; k++) {
    assert(f[k][4] === '', 'fila ' + k + ' debía quedar SIN marcar, quedó "' + f[k][4] + '"');
    assert(f[k][5] === '', 'fila ' + k + ' no debía tener fecha');
  }
  const ev = registroEventos();
  const nErr = ev.filter(e => e === 'error_envio').length;
  assert(nErr === 3, 'esperaba exactamente 3 error_envio (paró al 3º), hubo ' + nErr);
  assert(ev.includes('freno'), 'no se registró el evento "freno"');
  assert(sim.estado.correosEnviados.length === 0, 'no debía salir ningún correo (todo Gmail falla)');
  // El aviso ⛔ se INTENTA pero también falla (mismo canal Gmail) → queda solo en Registro
  assert(ev.includes('error_aviso'), 'el intento de aviso fallido debía registrarse como error_aviso');
  assert(!('MOTOR_PAUSADO' in sim.estado.props), 'el freno no debe dejar MOTOR_PAUSADO (mañana reintenta solo)');
  return 'Paró exactamente al 3er error (3x error_envio + freno en Registro), 6 filas pendientes sin marcar, ' +
    '0 correos salieron. OJO: el aviso ⛔ también falló (error_aviso) porque usa el mismo Gmail caído — ver bugs.';
});

/* ---------- (5b) freno: fallo solo hacia los leads → sale el aviso ⛔ ---------- */
prueba('5b. Fallo de servicio en los envíos a leads: el lote PARA y SÍ sale el correo de aviso ⛔', () => {
  resetear();
  const filas = [];
  for (let k = 1; k <= 6; k++) filas.push(['s' + k + '@x.co', 'Srv ' + k, 'taller', '', '', '', '']);
  hojaEmpresas(filas);
  // El aviso va a CORREO_AVISOS (ventas.prueba@gmail.com); solo fallan los envíos a leads
  sim.estado.forzarError = (to) => {
    if (to !== 'ventas.prueba@gmail.com') throw new Error('Service invoked too many times for one day: Email');
  };
  global.enviarLoteDiario();
  const f = filasEmpresas();
  for (let k = 1; k <= 6; k++) assert(f[k][4] === '', 'fila ' + k + ' debía quedar sin marcar');
  const envs = sim.estado.correosEnviados;
  assert(envs.length === 1, 'esperaba solo el correo de aviso, hubo ' + envs.length);
  assert(envs[0].to === 'ventas.prueba@gmail.com', 'el aviso fue a ' + envs[0].to);
  assert(envs[0].subject.indexOf('⛔') === 0, 'el asunto del aviso no empieza con ⛔: "' + envs[0].subject + '"');
  assert(/3 errores de servicio/.test(envs[0].body), 'el cuerpo no explica los 3 errores');
  assert(registroEventos().includes('freno'), 'falta evento freno en Registro');
  return 'Tras 3 errores: aviso "' + envs[0].subject + '" al dueño, filas pendientes intactas, freno registrado';
});

/* ---------- (6) los asuntos rotan ---------- */
prueba('6. Los asuntos de los correos nuevos rotan (6 plantillas distintas)', () => {
  resetear();
  const filas = [];
  for (let k = 1; k <= 6; k++) filas.push(['r' + k + '@x.co', 'ACME', 'taller', '', '', '', '']);
  hojaEmpresas(filas); // misma empresa para aislar la rotación
  global.enviarLoteDiario();
  const asuntos = sim.estado.correosEnviados.map(e => e.subject);
  assert(asuntos.length === 6, 'esperaba 6 correos, hubo ' + asuntos.length);
  const unicos = new Set(asuntos);
  assert(unicos.size === 6, 'esperaba 6 asuntos distintos, hubo ' + unicos.size + ': ' + asuntos.join(' | '));
  // Julio → ventana legal del 31 de agosto activa: rotación con la fecha exacta
  const esperados = [
    'Dotación del 31 de agosto - cotización para ACME',
    'Entrega de dotación del 31 de agosto - precios de fábrica',
    'Su dotación del 31 de agosto a tiempo',
    'Cotización de dotación antes del 31 de agosto',
    'Dotación de ley del 31 de agosto - Dotaciones El Manantial S.A.S',
    'Propuesta de dotación para su personal',
  ];
  for (let k = 0; k < 6; k++) assert(asuntos[k] === esperados[k],
    'asunto ' + k + ' esperado "' + esperados[k] + '", fue "' + asuntos[k] + '"');
  return '6 asuntos, todos distintos, rotando en orden por plantilla_(indice%6) con la fecha de ley 31 de agosto (mes=julio)';
});

/* ---------- extras de sanidad del mismo subsistema ---------- */
prueba('extra A. Sábado: enviarLoteDiario no hace nada', () => {
  resetear();
  sim.estado.ahora = new global.__DateReal('2026-07-25T13:00:00Z'); // sábado 8am Bogotá
  hojaEmpresas([['a@x.co', 'Alfa', 'taller', '', '', '', '']]);
  global.enviarLoteDiario();
  assert(sim.estado.correosEnviados.length === 0, 'envió en sábado');
  assert(filasEmpresas()[1][4] === '', 'marcó fila en sábado');
  assert(registroEventos().length === 0, 'no debía registrar nada (retorna antes)');
  return 'getDay()=6 → retorno inmediato: 0 correos, 0 marcas, 0 registros';
});

prueba('extra B. Cuota Gmail baja (cupo 0): no envía y registra "cupo"', () => {
  resetear(10); // cupo = min(40, 10-10) = 0
  hojaEmpresas([['a@x.co', 'Alfa', 'taller', '', '', '', '']]);
  global.enviarLoteDiario();
  assert(sim.estado.correosEnviados.length === 0, 'no debía enviar con cupo 0');
  assert(registroEventos().includes('cupo'), 'falta registro "cupo"');
  return 'cuota 10 → cupo max(0, min(40, 0)) = 0 → registra "cupo" y sale';
});

prueba('extra C. MOTOR_PAUSADO=si → cupo 0, no envía nada', () => {
  resetear();
  sim.estado.props.MOTOR_PAUSADO = 'si';
  hojaEmpresas([['a@x.co', 'Alfa', 'taller', '', '', '', '']]);
  global.enviarLoteDiario();
  assert(sim.estado.correosEnviados.length === 0, 'envió estando pausado');
  assert(registroEventos().includes('cupo'), 'falta registro "cupo"');
  return 'Con auto-pausa activa el lote no envía y lo registra';
});

prueba('extra D. Contador del freno: un CORREO_INVALIDO intercalado NO resetea "erroresSeguidos"', () => {
  resetear();
  hojaEmpresas([
    ['srv1@x.co', 'S1', '', '', '', '', ''],
    ['inv1@x.co', 'I1', '', '', '', '', ''],
    ['srv2@x.co', 'S2', '', '', '', '', ''],
    ['inv2@x.co', 'I2', '', '', '', '', ''],
    ['srv3@x.co', 'S3', '', '', '', '', ''],
    ['nunca@x.co', 'N', '', '', '', '', ''],
  ]);
  sim.estado.forzarError = (to) => {
    if (/^inv/.test(to)) throw new Error('Invalid email address: ' + to);
    if (/^srv/.test(to)) throw new Error('Service invoked too many times for one day: Email');
  };
  global.enviarLoteDiario();
  const ev = registroEventos();
  const f = filasEmpresas();
  // Verdad del código: srv,inv,srv,inv,srv → el freno SÍ se dispara (los CORREO_INVALIDO no resetean el contador)
  assert(ev.includes('freno'), 'el freno no se disparó — el contador se reseteó con los inválidos');
  assert(f[2][4] === 'CORREO_INVALIDO' && f[4][4] === 'CORREO_INVALIDO', 'los inválidos no se marcaron');
  assert(f[6][4] === '', 'la fila posterior al freno debía quedar sin tocar');
  return 'Secuencia srv/inv/srv/inv/srv dispara el freno: "3 errores seguidos" en realidad son 3 errores de ' +
    'servicio NO estrictamente consecutivos (los CORREO_INVALIDO intermedios no resetean el contador). ' +
    'Comportamiento conservador (falla hacia el lado seguro).';
});

/* ---------- salida ---------- */
console.log(JSON.stringify(resultados, null, 2));
const fallos = resultados.filter(r => !r.paso).length;
console.error('\nTOTAL: ' + resultados.length + ' pruebas, ' + fallos + ' fallos');
process.exit(0);
