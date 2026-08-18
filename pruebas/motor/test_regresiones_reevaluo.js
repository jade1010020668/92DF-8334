/**
 * Regresiones del reevalúo del 18/08/2026 (revisión adversarial):
 *   - los triggers del motor y los de la sincronización no se pisan entre sí
 *   - «activado» del panel solo cuenta los horarios DEL MOTOR
 *   - un solo lote por día (botón del panel + trigger de las 8am no se suman)
 *   - candado: dos envíos simultáneos no duplican correos
 */
const sim = require(require('path').join(__dirname, 'gas_mock.js'));
sim.instalar();
sim.cargarMotor();
sim.cargarArchivo(require('path').join(__dirname, '..', '..', 'apps_script', 'SincronizarBase.gs'));

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

function reset() {
  const e = sim.estado;
  e.hojas = {}; e.correosEnviados = []; e.props = {}; e.triggers = [];
  e.alertasUi = []; e.libros = {}; e.http = null; e.lockOcupado = false;
  e.ahora = new global.__DateReal('2026-08-18T15:00:00Z'); // martes 10am Bogotá
}
function hojaEmpresas(filas) {
  sim.estado.hojas['Empresas'] = { filas: [['correo','empresa','sector','prioridad','estado','fecha_envio','notas']].concat(filas) };
  sim.estado.hojas['Registro'] = { filas: [['fecha','evento','detalle']] };
}

prueba('REGRESION: desactivar el motor NO mata el horario de sincronización de la base', () => {
  reset();
  sim.estado.http = { codigo: 200, cuerpo: 'id,nombre\na1,X\n' };
  activarSincronizacionDiaria();          // horario de las 5am (ajeno al motor)
  apiAccion('activar');                   // los 3 del motor
  assert(sim.estado.triggers.length === 4, 'esperaba 4 triggers, hay ' + sim.estado.triggers.length);
  desactivarMotor();
  const quedan = sim.estado.triggers.map(t => t.fn);
  assert(JSON.stringify(quedan) === JSON.stringify(['sincronizarBaseMaestra']),
    'desactivar el motor debía dejar SOLO la sincronización, quedaron: ' + quedan.join(','));
  return 'activar/desactivar el motor deja intacto el horario diario de la base';
});

prueba('REGRESION: con solo el trigger de sincronización, el panel dice "Sin activar"', () => {
  reset();
  sim.estado.http = { codigo: 200, cuerpo: 'id,nombre\na1,X\n' };
  activarSincronizacionDiaria();
  const est = apiPanel();
  assert(est.activado === false,
    'activado=true con solo el trigger de la base — el panel ocultaría el botón de activar el motor');
  return 'apiPanel.activado cuenta únicamente enviarLoteDiario/procesarRespuestas/reporteSemanal';
});

prueba('REGRESION: el lote de hoy no se puede enviar dos veces (panel + trigger)', () => {
  reset();
  sim.estado.props.DIAS_EFECTIVOS = '19'; // cupo 40
  const filas = [];
  for (let i = 0; i < 100; i++) filas.push(['n' + i + '@x.co', 'Emp ' + i, 'Taller de carros', 2, '', '', '']);
  hojaEmpresas(filas);
  enviarLoteDiario();                                    // el trigger de las 8am
  const tras1 = sim.estado.correosEnviados.length;
  enviarLoteDiario();                                    // el papá toca el botón a las 9
  const tras2 = sim.estado.correosEnviados.length;
  assert(tras1 === 28, 'primer lote: ' + tras1);
  assert(tras2 === tras1, 'el segundo intento envió ' + (tras2 - tras1) + ' correos de más');
  const reg = sim.estado.hojas['Registro'].filas.map(f => String(f[2]));
  assert(reg.some(d => /ya se envió/.test(d)), 'no quedó registrado el rechazo del segundo intento');
  // y al día siguiente sí vuelve a enviar
  sim.estado.ahora = new global.__DateReal('2026-08-19T15:00:00Z');
  enviarLoteDiario();
  assert(sim.estado.correosEnviados.length > tras2, 'al día siguiente no envió');
  return 'mismo día: 28 correos y ni uno más; al día siguiente el ciclo continúa normal';
});

prueba('REGRESION: con otro envío en curso (candado ocupado), este intento se retira sin enviar', () => {
  reset();
  sim.estado.props.DIAS_EFECTIVOS = '19';
  hojaEmpresas([['a@x.co', 'A', 'Taller', 1, '', '', '']]);
  sim.estado.lockOcupado = true;
  enviarLoteDiario();
  assert(sim.estado.correosEnviados.length === 0, 'envió con el candado ocupado');
  const reg = sim.estado.hojas['Registro'].filas.map(f => String(f[2]));
  assert(reg.some(d => /en curso/.test(d)), 'no registró el retiro por candado');
  sim.estado.lockOcupado = false;
  enviarLoteDiario();
  assert(sim.estado.correosEnviados.length === 1, 'liberado el candado, no envió');
  return 'candado ocupado → 0 correos y registro claro; liberado → envía normal';
});

console.log(JSON.stringify(resultados, null, 2));
const fallas = resultados.filter(r => !r.paso).length;
console.log('TOTAL: ' + resultados.length + ' pruebas, ' + fallas + ' fallas');
process.exit(0);
