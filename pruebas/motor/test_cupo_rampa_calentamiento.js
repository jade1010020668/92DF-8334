/**
 * Pruebas del subsistema cupoDeHoy_() (rampa de calentamiento) y enviarLoteDiario
 * del motor apps_script/MotorVentas.gs
 */
const sim = require(require('path').join(__dirname, 'gas_mock.js'));
sim.instalar();
sim.cargarMotor();

const DIA_MS = 86400000;
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
  // martes 2026-07-28 8:00 Bogotá (13:00Z) por defecto
  e.ahora = new global.__DateReal(isoAhora || '2026-07-28T13:00:00Z');
}
// Coloca DIAS_EFECTIVOS para que hoy sea el "día n" de la rampa.
// v3: la rampa avanza por días CON envíos, no por calendario. cupoDeHoy_ lee
// DIAS_EFECTIVOS y le suma 1 (hoy sería el día efectivo N), así que para
// simular el día n se siembra n-1.
function ponerDiaRampa(n) {
  sim.estado.props.DIAS_EFECTIVOS = String(n - 1);
}
function hojaEmpresas(filas) {
  sim.estado.hojas['Empresas'] = { filas: [['correo','empresa','sector','prioridad','estado','fecha_envio','notas']].concat(filas) };
  sim.estado.hojas['Registro'] = { filas: [['fecha','evento','detalle']] };
}
function registros() {
  return (sim.estado.hojas['Registro'] ? sim.estado.hojas['Registro'].filas.slice(1) : []);
}

/* ============ 1. Rampa por antigüedad ============ */
prueba('cupoDeHoy_: dia 1 -> 10', () => {
  reset(); ponerDiaRampa(1);
  const c = cupoDeHoy_();
  assert(c === 10, 'esperaba 10, dio ' + c);
  return 'dia 1 de la rampa (dia efectivo 1) devuelve cupo 10 con cuota 100';
});

prueba('cupoDeHoy_: dia 5 -> 20', () => {
  reset(); ponerDiaRampa(5);
  const c = cupoDeHoy_();
  assert(c === 20, 'esperaba 20, dio ' + c);
  return 'DIAS_EFECTIVOS=4 -> dias=5 -> rampa 20';
});

prueba('cupoDeHoy_: dia 10 -> 30', () => {
  reset(); ponerDiaRampa(10);
  const c = cupoDeHoy_();
  assert(c === 30, 'esperaba 30, dio ' + c);
  return 'DIAS_EFECTIVOS=9 -> dias=10 -> rampa 30';
});

prueba('cupoDeHoy_: dia 20 -> 40 (techo)', () => {
  reset(); ponerDiaRampa(20);
  const c = cupoDeHoy_();
  assert(c === 40, 'esperaba 40, dio ' + c);
  return 'DIAS_EFECTIVOS=19 -> dias=20 -> TECHO_DIARIO 40';
});

prueba('cupoDeHoy_: bordes de la rampa (3->10, 4->20, 7->20, 8->30, 14->30, 15->40)', () => {
  const esperados = { 3: 10, 4: 20, 7: 20, 8: 30, 14: 30, 15: 40 };
  const vistos = {};
  for (const d of Object.keys(esperados)) {
    reset(); ponerDiaRampa(Number(d));
    vistos[d] = cupoDeHoy_();
    assert(vistos[d] === esperados[d], 'dia ' + d + ': esperaba ' + esperados[d] + ', dio ' + vistos[d]);
  }
  return 'bordes exactos correctos: ' + JSON.stringify(vistos);
});

prueba('cupoDeHoy_: sin DIAS_EFECTIVOS arranca en dia 1 (10) y NO escribe nada', () => {
  reset();
  assert(!('DIAS_EFECTIVOS' in sim.estado.props), 'precondicion');
  const c = cupoDeHoy_();
  assert(c === 10, 'esperaba 10, dio ' + c);
  // v3: cupoDeHoy_ es solo lectura. Quien avanza la rampa es contarDiaEfectivo_,
  // y solo al final de un lote que sí envió algo.
  assert(!('DIAS_EFECTIVOS' in sim.estado.props), 'cupoDeHoy_ escribio DIAS_EFECTIVOS');
  assert(!('ULTIMO_DIA_EFECTIVO' in sim.estado.props), 'cupoDeHoy_ escribio ULTIMO_DIA_EFECTIVO');
  return 'sin historial arranca en dia 1 (cupo 10) y no siembra nada: consultar el cupo no adelanta la rampa';
});

/* ============ 2. Pausa y cuota Gmail ============ */
prueba('cupoDeHoy_: MOTOR_PAUSADO=si -> 0', () => {
  reset(); ponerDiaRampa(20);
  sim.estado.props.MOTOR_PAUSADO = 'si';
  const c = cupoDeHoy_();
  assert(c === 0, 'esperaba 0, dio ' + c);
  return 'aun en dia 20 (rampa 40) con MOTOR_PAUSADO=si el cupo es 0';
});

prueba('cupoDeHoy_: cuotaGmail=15 -> cupo 5 (cuota-10)', () => {
  reset(); ponerDiaRampa(20); // rampa 40
  sim.estado.cuotaGmail = 15;
  const c = cupoDeHoy_();
  assert(c === 5, 'esperaba 5, dio ' + c);
  return 'min(rampa 40, 15-10) = 5: reserva 10 correos de cuota para avisos';
});

prueba('cupoDeHoy_: cuotaGmail=8 -> 0 (nunca negativo)', () => {
  reset(); ponerDiaRampa(1);
  sim.estado.cuotaGmail = 8;
  const c = cupoDeHoy_();
  assert(c === 0, 'esperaba 0, dio ' + c);
  assert(c >= 0, 'cupo negativo');
  return 'max(0, min(10, 8-10)) = 0: con cuota 8 no devuelve -2';
});

/* ============ 3. enviarLoteDiario: fines de semana ============ */
prueba('enviarLoteDiario: sabado no envia nada', () => {
  reset('2026-08-01T13:00:00Z'); // sabado 8am Bogota
  assert(new Date().getDay() === 6, 'el reloj simulado no cae en sabado (getDay=' + new Date().getDay() + ')');
  ponerDiaRampa(20);
  hojaEmpresas([['a@x.co','A','taller','','','',''], ['b@x.co','B','taller','','','','']]);
  enviarLoteDiario();
  assert(sim.estado.correosEnviados.length === 0, 'envio ' + sim.estado.correosEnviados.length + ' correos en sabado');
  assert(registros().length === 0, 'escribio en Registro un sabado: ' + JSON.stringify(registros()));
  assert(sim.estado.hojas['Empresas'].filas[1][4] === '', 'cambio el estado de una fila en sabado');
  return 'sabado 8am Bogota: 0 correos, 0 registros, hoja intacta (sale antes de todo)';
});

prueba('enviarLoteDiario: domingo no envia nada', () => {
  reset('2026-08-02T13:00:00Z'); // domingo 8am Bogota
  assert(new Date().getDay() === 0, 'el reloj simulado no cae en domingo (getDay=' + new Date().getDay() + ')');
  ponerDiaRampa(20);
  hojaEmpresas([['a@x.co','A','taller','','','','']]);
  enviarLoteDiario();
  assert(sim.estado.correosEnviados.length === 0, 'envio correos en domingo');
  assert(registros().length === 0, 'escribio en Registro un domingo');
  return 'domingo 8am Bogota: 0 correos y sin efectos secundarios';
});

prueba('enviarLoteDiario: dia habil con cupo 0 (pausado) registra y no envia', () => {
  reset(); ponerDiaRampa(20);
  sim.estado.props.MOTOR_PAUSADO = 'si';
  hojaEmpresas([['a@x.co','A','taller','','','','']]);
  enviarLoteDiario();
  assert(sim.estado.correosEnviados.length === 0, 'envio con motor pausado');
  const reg = registros();
  assert(reg.length === 1 && reg[0][1] === 'cupo', 'esperaba 1 registro "cupo", dio ' + JSON.stringify(reg));
  return 'martes con MOTOR_PAUSADO: 0 correos y un registro "cupo" (Sin cupo hoy)';
});

/* ============ 4. enviarLoteDiario: respeto del cupo con 100 filas ============ */
prueba('enviarLoteDiario: 100 filas pendientes mixtas -> exactamente 40 (28 nuevos + 12 toque2)', () => {
  reset(); ponerDiaRampa(20); // cupo 40 -> cupoToque2=12, cupoNuevos=28
  const filas = [];
  for (let i = 0; i < 80; i++) filas.push(['nuevo' + i + '@x.co', 'Nueva ' + i, 'taller', '', '', '', '']);
  const hace8d = new Date(sim.estado.ahora.getTime() - 8 * DIA_MS); // instancia del Date parcheado -> instanceof Date
  for (let i = 0; i < 20; i++) filas.push(['viejo' + i + '@x.co', 'Vieja ' + i, 'taller', '', 'ENVIADO', hace8d, '']);
  hojaEmpresas(filas);
  enviarLoteDiario();
  const enviados = sim.estado.correosEnviados;
  const nuevos = sim.estado.hojas['Empresas'].filas.slice(1).filter(f => f[4] === 'ENVIADO' && String(f[0]).startsWith('nuevo')).length;
  const t2 = sim.estado.hojas['Empresas'].filas.slice(1).filter(f => f[4] === 'TOQUE2').length;
  assert(enviados.length === 40, 'esperaba 40 correos exactos, envio ' + enviados.length);
  assert(nuevos === 28, 'esperaba 28 nuevos ENVIADO, dio ' + nuevos);
  assert(t2 === 12, 'esperaba 12 TOQUE2, dio ' + t2);
  const reg = registros().find(r => r[1] === 'envio');
  assert(reg && /Nuevos: 28 .* 2º toque: 12 .* cupo: 40/.test(reg[2]), 'registro inesperado: ' + (reg && reg[2]));
  return '80 nuevas + 20 con ENVIADO hace 8 dias: envia exactamente 40 = cupo (28 nuevos + 12 segundos toques), sin excederse';
});

prueba('enviarLoteDiario: 100 filas todas nuevas -> envia solo cupoNuevos=28 (reserva 30% sin usar)', () => {
  reset(); ponerDiaRampa(20); // cupo 40
  const filas = [];
  for (let i = 0; i < 100; i++) filas.push(['n' + i + '@x.co', 'Emp ' + i, 'taller', '', '', '', '']);
  hojaEmpresas(filas);
  enviarLoteDiario();
  const n = sim.estado.correosEnviados.length;
  assert(n <= 40, 'EXCEDIO el cupo: ' + n);
  assert(n === 28, 'comportamiento real: envia cupo - floor(cupo*0.3) = 28; dio ' + n);
  const marcados = sim.estado.hojas['Empresas'].filas.slice(1).filter(f => f[4] === 'ENVIADO').length;
  assert(marcados === 28, 'filas marcadas ENVIADO: ' + marcados);
  return 'nunca excede el cupo; con solo prospectos nuevos envia 28 de 40 porque los 12 del 30% reservado para toque2 no se reasignan (diseno, no bug)';
});

prueba('enviarLoteDiario: fechas de toque2 recientes (<7d) no consumen cupo de toque2', () => {
  reset(); ponerDiaRampa(20);
  const hace3d = new Date(sim.estado.ahora.getTime() - 3 * DIA_MS);
  const filas = [];
  for (let i = 0; i < 50; i++) filas.push(['n' + i + '@x.co', 'Emp ' + i, 'taller', '', '', '', '']);
  for (let i = 0; i < 20; i++) filas.push(['r' + i + '@x.co', 'Rec ' + i, 'taller', '', 'ENVIADO', hace3d, '']);
  hojaEmpresas(filas);
  enviarLoteDiario();
  const t2 = sim.estado.hojas['Empresas'].filas.slice(1).filter(f => f[4] === 'TOQUE2').length;
  assert(t2 === 0, 'mando toque2 a filas con solo 3 dias: ' + t2);
  assert(sim.estado.correosEnviados.length === 28, 'esperaba 28 nuevos, dio ' + sim.estado.correosEnviados.length);
  return 'ENVIADO hace 3 dias (<DIAS_PARA_TOQUE2=7) no recibe 2do toque; solo salen los 28 nuevos';
});

/* ============ 5. Regresion: la pausa SI congela la rampa (arreglo v3) ============ */
prueba('REGRESION: 19 dias pausado sin enviar -> al reactivar sigue en dia 1 (10), no 40', () => {
  reset();
  // Primer arranque con el motor pausado: consultar el cupo no debe adelantar nada.
  sim.estado.props.MOTOR_PAUSADO = 'si';
  const c1 = cupoDeHoy_();
  assert(c1 === 0, 'pausado deberia dar 0, dio ' + c1);
  assert(!('DIAS_EFECTIVOS' in sim.estado.props), 'sembro DIAS_EFECTIVOS estando pausado');
  // Pasan 19 dias de calendario SIN ENVIAR NI UN CORREO (siguio pausado); se reactiva.
  sim.estado.ahora = new global.__DateReal(sim.estado.ahora.getTime() + 19 * DIA_MS);
  delete sim.estado.props.MOTOR_PAUSADO; // lo que hace activarMotor()
  const c2 = cupoDeHoy_();
  assert(c2 === 10, 'tras reactivar esperaba 10 (dia efectivo 1), dio ' + c2);
  return 'la rampa cuenta dias CON envios: 19 dias pausado sin enviar nada no la mueven, y al reactivar arranca en 10/dia (calentamiento real, no salto a 40)';
});

prueba('REGRESION: la rampa avanza solo con dias que SI enviaron', () => {
  reset();
  hojaEmpresas([['a@x.co','A','taller','','','','']]);
  enviarLoteDiario();                       // martes con 1 prospecto: envia
  assert(sim.estado.correosEnviados.length === 1, 'esperaba 1 correo, dio ' + sim.estado.correosEnviados.length);
  assert(sim.estado.props.DIAS_EFECTIVOS === '1', 'DIAS_EFECTIVOS = ' + sim.estado.props.DIAS_EFECTIVOS);
  // Al dia siguiente ya no queda nada por enviar: el dia NO debe contar.
  sim.estado.ahora = new global.__DateReal(sim.estado.ahora.getTime() + DIA_MS);
  enviarLoteDiario();
  assert(sim.estado.correosEnviados.length === 1, 'envio de mas: ' + sim.estado.correosEnviados.length);
  assert(sim.estado.props.DIAS_EFECTIVOS === '1', 'un dia sin envios avanzo la rampa: ' + sim.estado.props.DIAS_EFECTIVOS);
  return 'un dia habil sin nada que enviar no consume rampa: DIAS_EFECTIVOS se queda en 1';
});

/* ============ salida ============ */
console.log(JSON.stringify(resultados, null, 2));
const fallas = resultados.filter(r => !r.paso).length;
console.log('TOTAL: ' + resultados.length + ' pruebas, ' + fallas + ' fallas');
process.exit(0);
