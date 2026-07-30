'use strict';
/**
 * Pruebas del subsistema: reporteSemanal(), prepararHojas(),
 * activarMotor()/desactivarMotor() y el CICLO COMPLETO.
 */
const sim = require(require('path').join(__dirname, 'gas_mock.js'));
sim.instalar();
sim.cargarMotor();
const estado = sim.estado;

const LUNES_8AM_BOGOTA = '2026-07-27T13:00:00Z'; // lunes 27-jul-2026, 8:00 America/Bogota

function reset(iso) {
  estado.hojas = {};
  estado.correosEnviados = [];
  estado.hilos = [];
  estado.props = {};
  estado.cuotaGmail = 100;
  estado.triggers = [];
  estado.alertasUi = [];
  delete estado.forzarError;
  estado.ahora = new global.__DateReal(iso || LUNES_8AM_BOGOTA);
}

const resultados = [];
function prueba(nombre, fn) {
  try {
    const det = fn();
    resultados.push({ nombre, paso: true, detalle: String(det || 'ok') });
  } catch (e) {
    resultados.push({ nombre, paso: false, detalle: String((e && e.message) || e) });
  }
}
function ok(cond, msg) { if (!cond) throw new Error(msg); }
function fechaHace(dias) { return new Date(estado.ahora.getTime() - dias * 86400000); } // Date mockeada → pasa instanceof

/* ============ PRUEBA 1 y 2: reporteSemanal ============ */
prueba('1. reporteSemanal: embudo respuestas=4, cotizaciones=2, ventas=1, rebotes=1, bajas=1, hist=9 y agrega fila a Reporte', () => {
  reset();
  prepararHojas();
  const emp = estado.hojas['Empresas'].filas;
  [
    ['env1@x.co', 'Emp A', 'taller',      1, 'ENVIADO',       fechaHace(2), ''],
    ['env2@x.co', 'Emp B', 'ferretería',  1, 'ENVIADO',       fechaHace(2), ''],
    ['t2@x.co',   'Emp C', 'restaurante', 1, 'TOQUE2',        fechaHace(1), ''],
    ['r1@x.co',   'Emp D', 'clínica',     2, 'RESPONDIÓ ⭐',  fechaHace(3), ''],
    ['r2@x.co',   'Emp E', 'taller',      2, 'RESPONDIÓ ⭐',  fechaHace(3), ''],
    ['cot@x.co',  'Emp F', 'salud',       1, 'COTIZADO ⭐⭐', fechaHace(4), ''],
    ['v1@x.co',   'Emp G', 'taller',      1, 'VENTA 🏆',      fechaHace(5), ''],
    ['reb@x.co',  'Emp H', 'otro',        1, 'REBOTÓ',        fechaHace(2), ''],
    ['baja@x.co', 'Emp I', 'otro',        1, 'BAJA',          fechaHace(2), ''],
  ].forEach(f => emp.push(f));
  estado.correosEnviados = [];

  reporteSemanal();

  const rep = estado.hojas['Reporte'].filas;
  ok(rep.length === 2, 'esperaba encabezado + 1 fila en Reporte, hay ' + rep.length + ' filas');
  const f = rep[1];
  ok(f[1] === 9, 'enviados_semana: esperado 9 (todas las fechas <7 días), obtenido ' + f[1]);
  ok(f[2] === 4, 'respuestas: esperado 4 (2 RESPONDIÓ + 1 COTIZADO + 1 VENTA), obtenido ' + f[2]);
  ok(f[3] === 2, 'cotizaciones: esperado 2 (COTIZADO + VENTA), obtenido ' + f[3]);
  ok(f[4] === 1, 'ventas: esperado 1, obtenido ' + f[4]);
  ok(f[5] === 1, 'rebotes: esperado 1, obtenido ' + f[5]);
  ok(f[6] === 1, 'bajas: esperado 1, obtenido ' + f[6]);
  ok(f[7] === 9, 'total_historico: esperado 9 (todos menos CORREO_INVALIDO/ERROR), obtenido ' + f[7]);
  return 'fila agregada a Reporte = ' + JSON.stringify(f);
});

prueba('2. reporteSemanal: el correo del reporte contiene "EMBUDO" y va al correo de avisos', () => {
  // usa el estado de la prueba 1 (reporteSemanal ya corrió)
  ok(estado.correosEnviados.length === 1, 'esperaba 1 correo de reporte, hay ' + estado.correosEnviados.length);
  const c = estado.correosEnviados[0];
  ok(c.to === 'ventas.prueba@gmail.com', 'destinatario inesperado: ' + c.to);
  ok(/EMBUDO/.test(c.body), 'el cuerpo no contiene EMBUDO: ' + c.body.slice(0, 120));
  ok(/Reporte semanal/.test(c.subject), 'asunto inesperado: ' + c.subject);
  ok(/respondieron 4 \(44\.4%\)/.test(c.body), 'porcentaje/conteo del embudo mal: ' + c.body);
  return 'asunto="' + c.subject + '" · línea embudo presente con 4 respuestas (44.4% de 9)';
});

/* ============ PRUEBA 3: prepararHojas ============ */
prueba('3. prepararHojas: crea las 3 hojas con encabezados, lista desplegable y CORREO_AVISOS en props', () => {
  reset();
  prepararHojas();
  const e = estado.hojas['Empresas'], r = estado.hojas['Registro'], p = estado.hojas['Reporte'];
  ok(e && r && p, 'no se crearon las 3 hojas: ' + Object.keys(estado.hojas).join(','));
  ok(JSON.stringify(e.filas[0]) === JSON.stringify(['correo', 'empresa', 'sector', 'prioridad', 'estado', 'fecha_envio', 'notas']),
    'encabezado Empresas: ' + JSON.stringify(e.filas[0]));
  ok(JSON.stringify(r.filas[0]) === JSON.stringify(['fecha', 'evento', 'detalle']),
    'encabezado Registro: ' + JSON.stringify(r.filas[0]));
  ok(JSON.stringify(p.filas[0]) === JSON.stringify(['semana', 'enviados_semana', 'respuestas', 'cotizaciones', 'ventas', 'rebotes', 'bajas', 'total_historico']),
    'encabezado Reporte: ' + JSON.stringify(p.filas[0]));
  ok(e.validaciones === true, 'no se aplicó la lista desplegable de estados en Empresas');
  ok(estado.props.CORREO_AVISOS === 'ventas.prueba@gmail.com', 'CORREO_AVISOS=' + estado.props.CORREO_AVISOS);
  ok(estado.alertasUi.length === 1 && /Hojas listas/.test(estado.alertasUi[0]), 'falta alerta de confirmación');
  // reejecutar no debe duplicar encabezados (el motor pide reejecutar tras importar el CSV)
  prepararHojas();
  ok(e.filas.length === 1 && r.filas.length === 1 && p.filas.length === 1,
    'reejecución duplicó encabezados: Empresas=' + e.filas.length + ' Registro=' + r.filas.length + ' Reporte=' + p.filas.length);
  return '3 hojas con encabezados correctos, validación en E, CORREO_AVISOS guardado; reejecutar es idempotente';
});

/* ============ PRUEBA 4: activarMotor / desactivarMotor ============ */
prueba('4. activarMotor: exactamente 3 triggers (envío 8h diario, procesar cada 10 min, reporte lunes 7h), borra MOTOR_PAUSADO; desactivar deja 0', () => {
  reset();
  prepararHojas();
  estado.props.MOTOR_PAUSADO = 'si'; // simular auto-pausa previa

  activarMotor();
  ok(estado.triggers.length === 3, 'triggers tras activar: esperado 3, hay ' + estado.triggers.length);
  const fns = estado.triggers.map(t => t.fn).sort().join(',');
  ok(fns === 'enviarLoteDiario,procesarRespuestas,reporteSemanal', 'funciones de triggers: ' + fns);
  const t10 = estado.triggers.filter(t => t.cadaMin === 10);
  ok(t10.length === 1 && t10[0].fn === 'procesarRespuestas',
    'esperaba exactamente 1 trigger everyMinutes(10) para procesarRespuestas; hay ' + t10.length);
  const tEnv = estado.triggers.find(t => t.fn === 'enviarLoteDiario');
  ok(tEnv && tEnv.hora === 8, 'trigger de envío debe ser atHour(8), hora=' + (tEnv && tEnv.hora));
  const tRep = estado.triggers.find(t => t.fn === 'reporteSemanal');
  ok(tRep && tRep.hora === 7, 'trigger de reporte debe ser atHour(7), hora=' + (tRep && tRep.hora));
  ok(!('MOTOR_PAUSADO' in estado.props), 'MOTOR_PAUSADO no fue borrado: ' + estado.props.MOTOR_PAUSADO);
  ok(estado.props.CORREO_AVISOS === 'ventas.prueba@gmail.com', 'CORREO_AVISOS no quedó fijado');

  activarMotor(); // doble activación no debe duplicar
  ok(estado.triggers.length === 3, 'doble activación dejó ' + estado.triggers.length + ' triggers (duplicados)');

  desactivarMotor();
  ok(estado.triggers.length === 0, 'tras desactivar quedaron ' + estado.triggers.length + ' triggers');
  const reg = estado.hojas['Registro'].filas.filter(f => f[1] === 'motor').map(f => f[2]);
  ok(reg.some(d => /ACTIVADO/.test(d)) && reg.some(d => d === 'desactivado'), 'Registro sin eventos motor: ' + JSON.stringify(reg));
  return '3 triggers correctos (uno everyMinutes 10), sin duplicados al reactivar, MOTOR_PAUSADO borrado, desactivar deja 0';
});

/* ============ PRUEBA 5: CICLO COMPLETO ============ */
// Estado compartido entre 5a-5d (es un solo ciclo continuo)
prueba('5a. CICLO día 1 (lunes 8am): enviarLoteDiario envía a las 3 empresas nuevas con rampa día 1 (cupo 10)', () => {
  reset(LUNES_8AM_BOGOTA);
  prepararHojas();
  activarMotor();
  const emp = estado.hojas['Empresas'].filas;
  [
    ['contacto@uno.co', 'Talleres Uno',    'taller',      1, '', '', ''],
    ['ventas@dos.co',   'Ferretería Dos',  'ferretería',  1, '', '', ''],
    ['info@tres.co',    'Restaurante Tres','restaurante', 2, '', '', ''],
  ].forEach(f => emp.push(f));
  estado.correosEnviados = [];

  enviarLoteDiario();

  ok(estado.correosEnviados.length === 3, 'esperaba 3 correos, salieron ' + estado.correosEnviados.length);
  const tos = estado.correosEnviados.map(c => c.to).sort().join(',');
  ok(tos === 'contacto@uno.co,info@tres.co,ventas@dos.co', 'destinatarios: ' + tos);
  for (let i = 1; i <= 3; i++) {
    ok(emp[i][4] === 'ENVIADO', 'fila ' + (i + 1) + ' estado=' + emp[i][4]);
    ok(emp[i][5] instanceof Date, 'fila ' + (i + 1) + ' sin fecha_envio');
  }
  ok(estado.props.DIAS_EFECTIVOS === '1', 'DIAS_EFECTIVOS=' + estado.props.DIAS_EFECTIVOS);
  const regEnvio = estado.hojas['Registro'].filas.find(f => f[1] === 'envio');
  ok(regEnvio && /Nuevos: 3/.test(regEnvio[2]) && /cupo: 10/.test(regEnvio[2]), 'registro de envío: ' + (regEnvio && regEnvio[2]));
  ok(estado.correosEnviados.every(c => /catalogo\.html/.test(c.body)), 'los correos no incluyen el catálogo');
  return 'registro: "' + regEnvio[2] + '" · 3 filas ENVIADO con fecha';
});

prueba('5b. CICLO: uno responde → procesarRespuestas marca RESPONDIÓ ⭐, pone estrella/importante y avisa (horario 10am)', () => {
  const emp = estado.hojas['Empresas'].filas;
  estado.hilos.push({
    id: 't1', rebote: false,
    mensajes: [{ from: 'Talleres Uno <contacto@uno.co>', cuerpo: 'Buenos días, sí nos interesa. ¿Nos cotiza 25 uniformes con el logo?' }],
  });
  estado.ahora = new global.__DateReal('2026-07-27T15:00:00Z'); // mismo lunes, 10am Bogotá
  const antes = estado.correosEnviados.length;

  procesarRespuestas();

  ok(emp[1][4] === 'RESPONDIÓ ⭐', 'estado fila Talleres Uno=' + emp[1][4]);
  ok(/Respondió 27\/07/.test(String(emp[1][6])), 'nota de respuesta: ' + emp[1][6]);
  ok(estado.hilos[0].mensajes[0].starred === true, 'el mensaje no quedó con estrella');
  ok(estado.hilos[0].importante === true, 'el hilo no quedó marcado importante');
  ok(emp[2][4] === 'ENVIADO' && emp[3][4] === 'ENVIADO', 'las otras filas cambiaron: ' + emp[2][4] + '/' + emp[3][4]);
  ok(estado.correosEnviados.length === antes + 1, 'esperaba 1 aviso, salieron ' + (estado.correosEnviados.length - antes));
  const aviso = estado.correosEnviados[estado.correosEnviados.length - 1];
  ok(/1 empresa\(s\) INTERESADA/.test(aviso.subject), 'asunto del aviso: ' + aviso.subject);
  ok(/contacto@uno\.co/.test(aviso.body) && /#inbox\/t1/.test(aviso.body), 'aviso sin correo/enlace del hilo: ' + aviso.body.slice(0, 200));
  ok(estado.props.COLA_AVISOS === '[]', 'COLA_AVISOS no quedó vacía: ' + estado.props.COLA_AVISOS);
  return 'aviso: "' + aviso.subject + '" con enlace al hilo t1; fila marcada RESPONDIÓ ⭐ con estrella e importante';
});

prueba('5c. CICLO: el humano pone COTIZADO ⭐⭐ y una nueva pasada del trigger NO pisa el estado ni re-avisa', () => {
  const emp = estado.hojas['Empresas'].filas;
  emp[1][4] = 'COTIZADO ⭐⭐'; // acción humana en la lista desplegable
  estado.ahora = new global.__DateReal('2026-07-27T15:10:00Z'); // 10 minutos después (siguiente trigger)
  const antes = estado.correosEnviados.length;

  procesarRespuestas(); // el mismo hilo sigue apareciendo en la búsqueda newer_than:4d

  ok(emp[1][4] === 'COTIZADO ⭐⭐', 'el motor pisó el estado humano: ' + emp[1][4]);
  ok(estado.correosEnviados.length === antes, 'se enviaron avisos de más: ' + (estado.correosEnviados.length - antes));
  ok(estado.props.COLA_AVISOS === '[]' || !estado.props.COLA_AVISOS, 'cola contaminada: ' + estado.props.COLA_AVISOS);
  return 'estado COTIZADO ⭐⭐ respetado (regla "nunca tocar estados avanzados"), sin avisos duplicados';
});

prueba('5d. CICLO: reporte del lunes siguiente 7am refleja el embudo completo sin inconsistencias', () => {
  estado.ahora = new global.__DateReal('2026-08-03T12:00:00Z'); // lunes siguiente, 7:00 Bogotá (hora del trigger)
  const antes = estado.correosEnviados.length;

  reporteSemanal();

  const rep = estado.hojas['Reporte'].filas;
  ok(rep.length === 2, 'filas en Reporte: ' + rep.length);
  const f = rep[1];
  ok(f[0] === '03/08/2026', 'etiqueta de semana: ' + f[0]);
  ok(f[1] === 3, 'enviados_semana: esperado 3, obtenido ' + f[1]);
  ok(f[2] === 1, 'respuestas: esperado 1 (la COTIZADO cuenta como respuesta), obtenido ' + f[2]);
  ok(f[3] === 1, 'cotizaciones: esperado 1, obtenido ' + f[3]);
  ok(f[4] === 0, 'ventas: esperado 0, obtenido ' + f[4]);
  ok(f[5] === 0 && f[6] === 0, 'rebotes/bajas deben ser 0: ' + f[5] + '/' + f[6]);
  ok(f[7] === 3, 'total_historico: esperado 3, obtenido ' + f[7]);
  // consistencia del embudo
  ok(f[4] <= f[3] && f[3] <= f[2] && f[2] <= f[7], 'embudo inconsistente: ventas<=cot<=resp<=hist falla: ' + JSON.stringify(f));
  const c = estado.correosEnviados[estado.correosEnviados.length - 1];
  ok(estado.correosEnviados.length === antes + 1 && /EMBUDO/.test(c.body), 'correo de reporte sin EMBUDO');
  ok(/contactadas 3 → respondieron 1 \(33\.3%\) → cotizadas 1 → VENTAS 0/.test(c.body), 'línea de embudo: ' + c.body);
  return 'fila Reporte=' + JSON.stringify(f) + ' · correo con "EMBUDO histórico: contactadas 3 → respondieron 1 (33.3%) → cotizadas 1 → VENTAS 0"';
});

console.log(JSON.stringify(resultados, null, 2));
const fallos = resultados.filter(r => !r.paso).length;
console.log('\nTOTAL: ' + resultados.length + ' pruebas, ' + fallos + ' fallos');
process.exit(0);
