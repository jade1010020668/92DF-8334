/**
 * Pruebas de las dos mejoras del canal "sale a buscar":
 *   1. ganchoLegal_(): las TRES fechas de ley del art. 232 CST (30 abr, 31 ago,
 *      20 dic) como argumento de venta, no solo agosto.
 *   2. ordenDeEnvio_(): el lote escribe primero a prioridad 1, luego a sectores
 *      con discurso a la medida, y de último al resto — sin importar el orden
 *      en que se importó el CSV.
 * Todas las horas van a las 15:00Z (10am Bogotá): la fecha calendario coincide
 * en UTC y Bogotá, así el resultado no depende de la zona horaria del proceso.
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
  e.ahora = new global.__DateReal(isoAhora);
}
function hojaEmpresas(filas) {
  sim.estado.hojas['Empresas'] = { filas: [['correo','empresa','sector','prioridad','estado','fecha_envio','notas']].concat(filas) };
  sim.estado.hojas['Registro'] = { filas: [['fecha','evento','detalle']] };
}

/* ============ 1. ganchoLegal_: las tres ventanas y sus bordes ============ */
prueba('ganchoLegal_: ventana de abril (marzo y hasta el 30)', () => {
  const casos = { '2026-03-01': '30 de abril', '2026-03-15': '30 de abril', '2026-04-30': '30 de abril' };
  for (const [dia, esperado] of Object.entries(casos)) {
    reset(dia + 'T15:00:00Z');
    const g = ganchoLegal_();
    assert(g === esperado, dia + ': esperaba "' + esperado + '", dio "' + g + '"');
  }
  return 'del 1 de marzo al 30 de abril el gancho es "30 de abril"';
});

prueba('ganchoLegal_: ventana de agosto (julio y hasta el 31)', () => {
  for (const dia of ['2026-07-01', '2026-07-28', '2026-08-04', '2026-08-31']) {
    reset(dia + 'T15:00:00Z');
    const g = ganchoLegal_();
    assert(g === '31 de agosto', dia + ': dio "' + g + '"');
  }
  return 'del 1 de julio al 31 de agosto el gancho es "31 de agosto"';
});

prueba('ganchoLegal_: ventana de diciembre (noviembre y hasta el 20)', () => {
  for (const dia of ['2026-11-01', '2026-11-15', '2026-12-20']) {
    reset(dia + 'T15:00:00Z');
    const g = ganchoLegal_();
    assert(g === '20 de diciembre', dia + ': dio "' + g + '"');
  }
  return 'del 1 de noviembre al 20 de diciembre el gancho es "20 de diciembre"';
});

prueba('ganchoLegal_: fuera de ventana no hay gancho (y las plantillas no lo fingen)', () => {
  for (const dia of ['2026-01-15', '2026-02-10', '2026-05-01', '2026-06-15', '2026-09-15', '2026-10-10', '2026-12-21']) {
    reset(dia + 'T15:00:00Z');
    assert(ganchoLegal_() === null, dia + ': debía ser null, dio "' + ganchoLegal_() + '"');
  }
  // En septiembre el primer toque vuelve al discurso sin fecha y el 2º toque no inventa plazos
  reset('2026-09-15T15:00:00Z');
  const p = plantilla_(0, 'ACME', 'Taller de carros');
  assert(!/agosto|abril|diciembre/.test(p.asunto + p.texto), 'plantilla con fecha fuera de ventana: ' + p.asunto);
  const t2 = plantillaToque2_('ACME');
  assert(!/agosto|abril|diciembre|undefined/.test(t2.texto), 'toque2 con fecha fuera de ventana');
  assert(/¿Les preparo la cotización sin compromiso\?/.test(t2.texto), 'toque2 perdió la pregunta de cierre');
  return 'ene-feb, mayo-jun, sep-oct y del 21 al 31 de dic: sin fecha inventada en asuntos ni cuerpos';
});

prueba('ganchoLegal_: en noviembre el 2º toque avisa la fecha del 20 de diciembre', () => {
  reset('2026-11-10T15:00:00Z');
  const t2 = plantillaToque2_('ACME');
  assert(/20 de diciembre/.test(t2.texto), 'el 2º toque de noviembre no menciona el 20 de diciembre');
  const p = plantilla_(0, 'ACME', 'Ferretería');
  assert(/20 de diciembre/.test(p.asunto), 'el asunto de noviembre no menciona la fecha: ' + p.asunto);
  return 'en noviembre asuntos y seguimientos venden la entrega del 20 de diciembre';
});

/* ============ 2. Ganchos de sector nuevos ============ */
prueba('ganchoSector_: farmacias, aseo, vigilancia, transporte y colegios tienen discurso propio', () => {
  const casos = {
    'Farmacia': /antifluido/,
    'Empresa de aseo y limpieza': /personal operativo/,
    'Vigilancia y seguridad privada': /vigilancia/,
    'Transporte y logística': /conductores/,
    'Colegio': /servicios y mantenimiento/,
  };
  for (const [sector, esperado] of Object.entries(casos)) {
    const g = ganchoSector_(sector);
    assert(esperado.test(g), sector + ': "' + g + '"');
    assert(sectorConGancho_(sector), sector + ' no cuenta como sector con gancho');
  }
  assert(!sectorConGancho_('Empresa privada (DIAN)'), 'DIAN no debería contar como sector con gancho');
  assert(!sectorConGancho_(''), 'sector vacío no debería contar');
  return '5 sectores nuevos con discurso a la medida; el genérico (DIAN) queda fuera del grupo preferente';
});

/* ============ 3. ordenDeEnvio_: la prioridad manda sobre el orden del CSV ============ */
prueba('ordenDeEnvio_: prioridad 1 primero, luego sectores con gancho, el resto al final', () => {
  reset('2026-08-04T15:00:00Z');
  const datos = [
    ['correo','empresa','sector','prioridad','estado','fecha_envio','notas'],
    ['a@x.co', 'A', 'Empresa privada (DIAN)', 2, '', '', ''],   // fila 1: p2 genérico
    ['b@x.co', 'B', 'Taller de carros',       2, '', '', ''],   // fila 2: p2 con gancho
    ['c@x.co', 'C', 'Empresa privada (DIAN)', 1, '', '', ''],   // fila 3: p1 genérico
    ['d@x.co', 'D', 'Restaurante',            1, '', '', ''],   // fila 4: p1 con gancho
    ['e@x.co', 'E', 'Taller de motos',       '', '', '', ''],   // fila 5: sin prioridad
  ];
  const orden = ordenDeEnvio_(datos);
  assert(JSON.stringify(orden) === JSON.stringify([4, 3, 2, 1, 5]),
    'esperaba [4,3,2,1,5], dio ' + JSON.stringify(orden));
  return 'p1+gancho (D) → p1 (C) → p2+gancho (B) → p2 (A) → sin prioridad (E); a empate gana el orden de hoja';
});

prueba('enviarLoteDiario: aunque el CSV llegó al revés, los prioridad-1 salen en el primer lote', () => {
  reset('2026-08-04T15:00:00Z'); // martes, 10am Bogotá
  sim.estado.props.DIAS_EFECTIVOS = '0'; // día 1 de rampa → cupo 10 (7 nuevos + 3 toque2)
  const filas = [];
  // 10 genéricas de prioridad 2 ARRIBA (como venía el CSV real)
  for (let i = 0; i < 10; i++) filas.push(['gen' + i + '@x.co', 'Genérica ' + i, 'Empresa privada (DIAN)', 2, '', '', '']);
  // 2 de prioridad 2 con gancho en la mitad
  filas.push(['taller@x.co', 'Taller Pérez', 'Taller de carros', 2, '', '', '']);
  filas.push(['rest@x.co', 'Donde Chucho', 'Restaurante', 2, '', '', '']);
  // 5 de prioridad 1 AL FINAL de la hoja
  for (let i = 0; i < 5; i++) filas.push(['vip' + i + '@x.co', 'VIP ' + i, 'Panadería', 1, '', '', '']);
  hojaEmpresas(filas);
  enviarLoteDiario();
  const enviados = sim.estado.correosEnviados.map(c => c.to);
  assert(enviados.length === 7, 'esperaba 7 correos (cupo nuevos del día 1), hubo ' + enviados.length);
  for (let i = 0; i < 5; i++) assert(enviados.includes('vip' + i + '@x.co'), 'faltó vip' + i + ' en el primer lote');
  assert(enviados.includes('taller@x.co') && enviados.includes('rest@x.co'),
    'los 2 cupos restantes debían ser para los sectores con gancho, fueron: ' + enviados.join(', '));
  assert(!enviados.some(c => c.startsWith('gen')), 'se coló una genérica antes que las prioritarias');
  return 'con los p1 al FONDO del CSV, el primer lote fue: 5 VIP + taller + restaurante; ninguna genérica';
});

prueba('enviarLoteDiario: el orden no rompe el 2º toque ni el cupo', () => {
  reset('2026-08-04T15:00:00Z');
  sim.estado.props.DIAS_EFECTIVOS = '19'; // día 20 → cupo 40 (28 nuevos + 12 toque2)
  const hace8d = new Date(sim.estado.ahora.getTime() - 8 * 86400000);
  const filas = [];
  for (let i = 0; i < 50; i++) filas.push(['n' + i + '@x.co', 'Emp ' + i, 'Empresa privada (DIAN)', 2, '', '', '']);
  for (let i = 0; i < 20; i++) filas.push(['t' + i + '@x.co', 'Toque ' + i, 'Taller de carros', 1, 'ENVIADO', hace8d, '']);
  hojaEmpresas(filas);
  enviarLoteDiario();
  const t2 = sim.estado.hojas['Empresas'].filas.slice(1).filter(f => f[4] === 'TOQUE2').length;
  const nuevos = sim.estado.hojas['Empresas'].filas.slice(1).filter(f => f[4] === 'ENVIADO' && String(f[0]).startsWith('n')).length;
  assert(sim.estado.correosEnviados.length === 40, 'esperaba 40 exactos, envió ' + sim.estado.correosEnviados.length);
  assert(t2 === 12, 'esperaba 12 segundos toques, dio ' + t2);
  assert(nuevos === 28, 'esperaba 28 nuevos, dio ' + nuevos);
  return 'reordenado y todo, el lote respeta el cupo 40 = 28 nuevos + 12 toque2';
});

/* ============ salida ============ */
console.log(JSON.stringify(resultados, null, 2));
const fallas = resultados.filter(r => !r.paso).length;
console.log('TOTAL: ' + resultados.length + ' pruebas, ' + fallas + ' fallas');
process.exit(0);
