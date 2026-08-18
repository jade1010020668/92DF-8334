/**
 * Pruebas de SincronizarBase.gs: bajar el CSV de la base maestra desde el
 * repositorio y volcarlo en la hoja de Google Drive, con su trigger diario.
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
  e.alertasUi = []; e.libros = {}; e.http = null;
  e.ahora = new global.__DateReal('2026-08-18T15:00:00Z');
}

const CSV = 'id,nombre,sector,email\n' +
  'a1,"Ferretería El Tornillo, S.A.S.",Ferretería,tornillo@x.co\n' +
  'a2,Taller "El Motor",Taller,motor@x.co\n' +
  'a3,Panadería Doña Rosa,Panadería,rosa@x.co\n';

prueba('sincronizarBaseMaestra: baja el CSV y lo vuelca completo en la pestaña', () => {
  reset();
  sim.estado.http = { codigo: 200, cuerpo: CSV };
  const n = sincronizarBaseMaestra();
  assert(n === 3, 'esperaba 3 empresas, dijo ' + n);
  const libro = sim.estado.libros[CONFIG_BASE.ID_HOJA_MAESTRA];
  const p = libro.hojas['BaseMaestra'];
  assert(p.filas.length === 4, 'filas en la pestaña: ' + p.filas.length);
  assert(p.filas[0][1] === 'nombre', 'encabezado perdido');
  assert(p.filas[1][1] === 'Ferretería El Tornillo, S.A.S.', 'la coma entre comillas partió el nombre: ' + p.filas[1][1]);
  assert(p.filas[1].length === 4, 'columnas de la fila 1: ' + p.filas[1].length);
  assert(p.congeladas === 1, 'no congeló el encabezado');
  const info = libro.hojas['Sincronización'];
  assert(info && String(info.filas[1][1]) === '3', 'el sello no dice 3 empresas: ' + JSON.stringify(info && info.filas));
  return '3 filas con comas/comillas dentro de campos llegan intactas; sello de sincronización con conteo y hora';
});

prueba('sincronizarBaseMaestra: HTTP != 200 revienta claro y NO toca la hoja', () => {
  reset();
  sim.estado.libros = {};
  sim.estado.http = { codigo: 404, cuerpo: 'not found' };
  let fallo = null;
  try { sincronizarBaseMaestra(); } catch (e) { fallo = String(e); }
  assert(fallo && /HTTP 404/.test(fallo), 'no explicó el HTTP: ' + fallo);
  const libro = sim.estado.libros[CONFIG_BASE.ID_HOJA_MAESTRA];
  assert(!libro || !libro.hojas['BaseMaestra'] || libro.hojas['BaseMaestra'].filas.length === 0,
    'escribió en la hoja pese al error');
  return 'con el repo caído la hoja queda como estaba (no se vacía) y el error dice el código HTTP';
});

prueba('sincronizarBaseMaestra: CSV vacío revienta en vez de vaciar la hoja', () => {
  reset();
  sim.estado.http = { codigo: 200, cuerpo: 'id,nombre\n' };  // solo encabezado
  let fallo = null;
  try { sincronizarBaseMaestra(); } catch (e) { fallo = String(e); }
  assert(fallo && /vacío o roto/.test(fallo), 'aceptó un CSV vacío: ' + fallo);
  return 'un CSV sin filas de datos no borra las 18.595 que ya estaban en la hoja';
});

prueba('activarSincronizacionDiaria: sincroniza ya y deja UN trigger diario de 5am, sin duplicar', () => {
  reset();
  sim.estado.http = { codigo: 200, cuerpo: CSV };
  activarSincronizacionDiaria();
  activarSincronizacionDiaria(); // segunda vez: no debe duplicar
  const sincs = sim.estado.triggers.filter(t => t.fn === 'sincronizarBaseMaestra');
  assert(sincs.length === 1, 'triggers de sincronización: ' + sincs.length + ' (esperaba 1)');
  assert(sincs[0].hora === 5, 'hora del trigger: ' + sincs[0].hora);
  return 'ejecutarla dos veces deja exactamente un horario (5am) y la hoja sincronizada';
});

console.log(JSON.stringify(resultados, null, 2));
const fallas = resultados.filter(r => !r.paso).length;
console.log('TOTAL: ' + resultados.length + ' pruebas, ' + fallas + ' fallas');
process.exit(0);
