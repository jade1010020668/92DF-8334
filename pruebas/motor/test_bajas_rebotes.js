/**
 * Pruebas del subsistema BAJAS y REBOTES de MotorVentas.gs
 * (procesarRespuestas, textoPropio_, esBajaExplicita_, auto-pausa por rebotes)
 */
const sim = require(require('path').join(__dirname, 'gas_mock.js'));
sim.instalar();
sim.cargarMotor();

const resultados = [];
function prueba(nombre, fn) {
  try {
    const detalle = fn(); // devuelve string de detalle si pasó; lanza si falla
    resultados.push({ nombre, paso: true, detalle });
  } catch (e) {
    resultados.push({ nombre, paso: false, detalle: String(e.message || e) });
  }
}
function assert(cond, msg) { if (!cond) throw new Error(msg); }

function reset() {
  sim.estado.hojas = {};
  sim.estado.correosEnviados = [];
  sim.estado.hilos = [];
  sim.estado.props = {};
  sim.estado.cuotaGmail = 100;
  // 2026-07-28T13:00:00Z = 8:00 am Bogotá (dentro de la ventana 7-21 para avisos)
  sim.estado.ahora = new global.__DateReal('2026-07-28T13:00:00Z');
  sim.estado.triggers = [];
  sim.estado.alertasUi = [];
  sim.estado.forzarError = null;
}

const CAB = ['correo', 'empresa', 'sector', 'prioridad', 'estado', 'fecha_envio', 'notas'];
function montarHojas(filas) {
  sim.estado.hojas['Empresas'] = { filas: [CAB, ...filas] };
  sim.estado.hojas['Registro'] = { filas: [['fecha', 'evento', 'detalle']] };
}
function ayer() { return new Date(sim.estado.ahora.getTime() - 86400000); } // Date parcheada => instanceof Date del motor
function filaEmpresas(n) { return sim.estado.hojas['Empresas'].filas[n]; } // n=1 => primera fila de datos

/* ---------- 1) Respuesta 'BAJA' sola => BAJA ---------- */
prueba("1. Respuesta 'BAJA' sola sobre fila ENVIADO => estado BAJA", () => {
  reset();
  montarHojas([['cliente1@x.co', 'Empresa Uno', 'taller', '', 'ENVIADO', ayer(), '']]);
  sim.estado.hilos.push({ id: 't1', rebote: false, mensajes: [{ from: 'Cliente Uno <cliente1@x.co>', cuerpo: 'BAJA' }] });
  procesarRespuestas();
  assert(filaEmpresas(1)[4] === 'BAJA', 'estado esperado BAJA, obtenido: ' + filaEmpresas(1)[4]);
  const reg = sim.estado.hojas['Registro'].filas.some(f => f[1] === 'baja' && f[2] === 'cliente1@x.co');
  assert(reg, 'no se registró el evento "baja" en Registro');
  assert(sim.estado.correosEnviados.length === 0, 'no debía enviarse ningún aviso, se enviaron: ' + sim.estado.correosEnviados.length);
  return "esBajaExplicita_ devolvió 'si' por primera línea /^BAJA[.!\\s]*$/; la fila pasó de ENVIADO a BAJA, se registró el evento y no se envió aviso de interesados.";
});

/* ---------- 2) 'Por favor darme de baja' => BAJA ---------- */
prueba("2. 'Por favor darme de baja' sobre fila ENVIADO => estado BAJA", () => {
  reset();
  montarHojas([['cliente2@x.co', 'Empresa Dos', 'ferretería', '', 'ENVIADO', ayer(), '']]);
  sim.estado.hilos.push({ id: 't2', rebote: false, mensajes: [{ from: 'Cliente Dos <cliente2@x.co>', cuerpo: 'Por favor darme de baja' }] });
  procesarRespuestas();
  assert(filaEmpresas(1)[4] === 'BAJA', 'estado esperado BAJA, obtenido: ' + filaEmpresas(1)[4]);
  return "La frase contiene 'DARME DE BAJA' (regex de frases explícitas en esBajaExplicita_) => 'si' => estado BAJA.";
});

/* ---------- 3) Respuesta interesada que CITA nuestro pie con 'BAJA' => RESPONDIÓ ⭐ ---------- */
prueba("3. Respuesta interesada citando el pie ('> responda la palabra BAJA') => RESPONDIÓ ⭐ (no BAJA)", () => {
  reset();
  montarHojas([['cliente3@x.co', 'Empresa Tres', 'restaurante', '', 'ENVIADO', ayer(), '']]);
  const cuerpo = 'Buenas tardes, me interesa, cotíceme 20\n\n' +
    'El lun, 27 jul 2026, Dotaciones El Manantial escribió:\n' +
    '> Si no desea recibir información, responda únicamente la palabra BAJA.';
  sim.estado.hilos.push({ id: 't3', rebote: false, mensajes: [{ from: 'Cliente Tres <cliente3@x.co>', cuerpo }] });
  procesarRespuestas();
  assert(filaEmpresas(1)[4] === 'RESPONDIÓ ⭐', 'estado esperado RESPONDIÓ ⭐, obtenido: ' + filaEmpresas(1)[4]);
  assert(sim.estado.hilos[0].mensajes[0].starred === true, 'el mensaje no recibió estrella');
  assert(sim.estado.hilos[0].importante === true, 'el hilo no se marcó importante');
  const aviso = sim.estado.correosEnviados.find(c => /INTERESADA/.test(c.subject));
  assert(aviso, 'no se envió el aviso de interesados (hora simulada 8am Bogotá, dentro de 7-21)');
  assert(/cotíceme 20/.test(aviso.body), 'el aviso no incluye el resumen del texto propio del cliente');
  assert(!/BAJA/.test(String(filaEmpresas(1)[4])), 'la fila terminó en un estado de baja');
  return "textoPropio_ corta en la línea 'El ... escribió:' y descarta las líneas '>'; el texto propio ('...cotíceme 20') no contiene BAJA => RESPONDIÓ ⭐, mensaje con estrella, hilo importante y aviso enviado con resumen.";
});

/* ---------- 4) 'la rotación está baja pero me interesa' => REVISAR BAJA ---------- */
prueba("4. 'la rotación está baja pero me interesa' => REVISAR BAJA (dudoso, decide el humano)", () => {
  reset();
  montarHojas([['cliente4@x.co', 'Empresa Cuatro', 'clínica', '', 'ENVIADO', ayer(), '']]);
  sim.estado.hilos.push({ id: 't4', rebote: false, mensajes: [{ from: 'Cliente Cuatro <cliente4@x.co>', cuerpo: 'la rotación está baja pero me interesa' }] });
  procesarRespuestas();
  assert(filaEmpresas(1)[4] === 'REVISAR BAJA', 'estado esperado REVISAR BAJA, obtenido: ' + filaEmpresas(1)[4]);
  assert(/^Menciona "baja"/.test(String(filaEmpresas(1)[6])), 'la nota (col 7) no explica la duda: ' + filaEmpresas(1)[6]);
  const aviso = sim.estado.correosEnviados.find(c => /INTERESADA/.test(c.subject));
  assert(!aviso, 'un caso dudoso no debía generar aviso de interesados');
  return "\\bBAJA\\b aparece en el texto propio sin ser frase explícita => esBajaExplicita_ devuelve 'dudoso' => REVISAR BAJA con nota 'Menciona \"baja\" — revisar: ...' y sin aviso de interesados.";
});

/* ---------- 5) Rebote MAILER-DAEMON => fila REBOTÓ ---------- */
prueba('5. Hilo rebote de MAILER-DAEMON con el correo de una fila ENVIADO => REBOTÓ (sin auto-pausa con 1 envío reciente)', () => {
  reset();
  montarHojas([['cliente5@x.co', 'Empresa Cinco', 'taller', '', 'ENVIADO', ayer(), '']]);
  sim.estado.hilos.push({
    id: 'r1', rebote: true,
    mensajes: [{
      from: 'Mail Delivery Subsystem <MAILER-DAEMON@googlemail.com>',
      cuerpo: 'Address not found. Your message to cliente5@x.co was not delivered because the address could not be found.',
    }],
  });
  procesarRespuestas();
  assert(filaEmpresas(1)[4] === 'REBOTÓ', 'estado esperado REBOTÓ, obtenido: ' + filaEmpresas(1)[4]);
  assert(sim.estado.props['MOTOR_PAUSADO'] === undefined, 'no debía auto-pausarse (1 envío reciente < mínimo 10)');
  return "La búsqueda de mailer-daemon devolvió el hilo rebote; el regex extrajo cliente5@x.co del cuerpo, la fila estaba en ENVIADO => REBOTÓ. Con solo 1 envío reciente (<10) no hay auto-pausa.";
});

/* ---------- 6) Auto-pausa: 12 enviados ayer + 2 rebotes (16.7% > 5%) ---------- */
prueba("6. 12 filas ENVIADO de ayer + 2 rebotes => MOTOR_PAUSADO='si' y correo 'AUTO-PAUSADO'", () => {
  reset();
  const filas = [];
  for (let i = 1; i <= 12; i++) filas.push(['cliente' + i + '@lote.co', 'Lote ' + i, 'taller', '', 'ENVIADO', ayer(), '']);
  montarHojas(filas);
  sim.estado.hilos.push(
    { id: 'r1', rebote: true, mensajes: [{ from: 'MAILER-DAEMON@googlemail.com', cuerpo: 'Delivery failed: cliente1@lote.co not found' }] },
    { id: 'r2', rebote: true, mensajes: [{ from: 'MAILER-DAEMON@googlemail.com', cuerpo: 'Delivery failed: cliente2@lote.co mailbox unavailable' }] },
  );
  procesarRespuestas();
  assert(filaEmpresas(1)[4] === 'REBOTÓ' && filaEmpresas(2)[4] === 'REBOTÓ',
    'las 2 filas rebotadas debían quedar REBOTÓ: ' + filaEmpresas(1)[4] + ' / ' + filaEmpresas(2)[4]);
  assert(sim.estado.props['MOTOR_PAUSADO'] === 'si', "props.MOTOR_PAUSADO esperado 'si', obtenido: " + sim.estado.props['MOTOR_PAUSADO']);
  const aviso = sim.estado.correosEnviados.find(c => /AUTO-PAUSADO/.test(c.subject));
  assert(aviso, "no se envió el correo de aviso con 'AUTO-PAUSADO' en el asunto");
  assert(aviso.to === 'ventas.prueba@gmail.com', 'el aviso no fue al correo de avisos: ' + aviso.to);
  assert(/Rebotaron 2 de 12/.test(aviso.body), 'el cuerpo no reporta 2 de ~12: ' + aviso.body.slice(0, 80));
  const reg = sim.estado.hojas['Registro'].filas.some(f => f[1] === 'auto-pausa');
  assert(reg, "no se registró el evento 'auto-pausa'");
  return "2 rebotes sobre 12 envíos recientes = 16.7% > 5% y 12 >= mínimo 10 => MOTOR_PAUSADO='si', aviso '⛔ Motor AUTO-PAUSADO por rebotes altos' ('Rebotaron 2 de 12') y evento 'auto-pausa' en Registro.";
});

/* ---------- 7) 5 enviados recientes + 1 rebote => NO se pausa (mínimo 10) ---------- */
prueba('7. Solo 5 enviados recientes + 1 rebote (20%) => NO se pausa por el mínimo de 10', () => {
  reset();
  const filas = [];
  for (let i = 1; i <= 5; i++) filas.push(['pyme' + i + '@min.co', 'Pyme ' + i, 'ferretería', '', 'ENVIADO', ayer(), '']);
  montarHojas(filas);
  sim.estado.hilos.push({ id: 'r1', rebote: true, mensajes: [{ from: 'MAILER-DAEMON@googlemail.com', cuerpo: 'Bounce: pyme1@min.co rejected' }] });
  procesarRespuestas();
  assert(filaEmpresas(1)[4] === 'REBOTÓ', 'la fila rebotada debía quedar REBOTÓ: ' + filaEmpresas(1)[4]);
  assert(sim.estado.props['MOTOR_PAUSADO'] === undefined, 'NO debía pausarse (5 < 10 recientes); MOTOR_PAUSADO=' + sim.estado.props['MOTOR_PAUSADO']);
  const aviso = sim.estado.correosEnviados.find(c => /AUTO-PAUSADO/.test(c.subject));
  assert(!aviso, 'no debía enviarse aviso de auto-pausa');
  return "1/5 = 20% supera el 5%, pero enviadosRecientes (5) < 10, así que la condición 'enviadosRecientes >= 10' evita la pausa con muestras pequeñas. La fila sí quedó REBOTÓ.";
});

/* ---------- 8) Acumulación entre corridas: rebotes goteados nunca pausan ---------- */
prueba('8. REGRESION: rebotes goteados en corridas distintas SÍ se acumulan: 2/20 (10%) pausa el motor', () => {
  reset();
  const filas = [];
  for (let i = 1; i <= 20; i++) filas.push(['emp' + i + '@gota.co', 'Gota ' + i, 'taller', '', 'ENVIADO', ayer(), '']);
  montarHojas(filas);
  // Corrida 1: llega el primer rebote (1/20 = 5%, no > 5% => no pausa, correcto)
  sim.estado.hilos.push({ id: 'r1', rebote: true, mensajes: [{ from: 'MAILER-DAEMON@googlemail.com', cuerpo: 'fail emp1@gota.co' }] });
  procesarRespuestas();
  assert(filaEmpresas(1)[4] === 'REBOTÓ', 'corrida 1: emp1 debía quedar REBOTÓ');
  assert(sim.estado.props['MOTOR_PAUSADO'] === undefined, 'corrida 1: 5% no supera el umbral, no debía pausar');
  // Corrida 2 (10 min después): llega el segundo rebote. El hilo r1 sigue en newer_than:2d
  // pero su fila ya está REBOTÓ, así que el contador local `rebotes` vuelve a valer solo 1.
  sim.estado.ahora = new global.__DateReal(sim.estado.ahora.getTime() + 10 * 60000);
  sim.estado.hilos.push({ id: 'r2', rebote: true, mensajes: [{ from: 'MAILER-DAEMON@googlemail.com', cuerpo: 'fail emp2@gota.co' }] });
  procesarRespuestas();
  assert(filaEmpresas(2)[4] === 'REBOTÓ', 'corrida 2: emp2 debía quedar REBOTÓ');
  // Arreglo v3: la auto-pausa ya no cuenta solo los rebotes de ESTA corrida. Relee la
  // hoja (datosFrescos) y cuenta TODAS las filas en REBOTÓ de los últimos 2 días, así
  // que el acumulado real 2/20 = 10% > 5% sí dispara la protección.
  assert(sim.estado.props['MOTOR_PAUSADO'] === 'si',
    'el acumulado 2/20 = 10% debía pausar el motor, pero MOTOR_PAUSADO=' + sim.estado.props['MOTOR_PAUSADO']);
  const aviso = sim.estado.correosEnviados.find(c => /AUTO-PAUSADO/.test(c.subject));
  assert(aviso, 'no salió el aviso de auto-pausa');
  return 'los rebotes goteados en corridas distintas se acumulan: 2 de 20 (10% > 5%) pausa el motor y avisa al dueño';
});

/* ---------- Salida ---------- */
console.log(JSON.stringify(resultados, null, 2));
const fallos = resultados.filter(r => !r.paso).length;
console.log('\nTOTAL: ' + resultados.length + ' pruebas, ' + fallos + ' fallo(s)');
