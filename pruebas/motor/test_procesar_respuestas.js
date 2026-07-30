/**
 * Pruebas del subsistema procesarRespuestas() de MotorVentas.gs
 * — respuestas, estrellas y avisos —
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
    resultados.push({ nombre, paso: false, detalle: String(e && e.message || e) });
  }
}
function asegurar(cond, msg) { if (!cond) throw new Error(msg); }

// 8am Bogotá = 13:00 UTC (UTC-5). 3am Bogotá = 08:00 UTC.
const OCHO_AM = '2026-07-28T13:00:00Z';
const TRES_AM = '2026-07-28T08:00:00Z';

function resetear(iso) {
  sim.estado.hojas = {};
  sim.estado.correosEnviados = [];
  sim.estado.hilos = [];
  sim.estado.props = {};
  sim.estado.alertasUi = [];
  sim.estado.triggers = [];
  sim.estado.cuotaGmail = 100;
  delete sim.estado.forzarError;
  sim.estado.ahora = new global.__DateReal(iso);
}

function montarEmpresas(filas) {
  sim.hoja('Empresas');
  const h = sim.estado.hojas['Empresas'];
  h.filas.push(['correo', 'empresa', 'sector', 'prioridad', 'estado', 'fecha_envio', 'notas']);
  filas.forEach(f => h.filas.push(f));
  sim.hoja('Registro');
  sim.estado.hojas['Registro'].filas.push(['fecha', 'evento', 'detalle']);
}

function fechaEnvio() { return new global.Date('2026-07-25T13:00:00Z'); }

const CUERPO_INTERES = 'Buenos días, nos interesa. ¿Me envían cotización para 25 operarios?\n\n' +
  'El lun, 27 jul 2026, Dotaciones El Manantial escribió:\n> Señores Talleres X:\n> texto citado';

/* ---------- PRUEBA 1: respuesta normal → RESPONDIÓ ⭐ + estrella + importante ---------- */
prueba('1. Respuesta normal marca RESPONDIÓ ⭐, estrella al mensaje e importante al hilo', () => {
  resetear(OCHO_AM);
  montarEmpresas([['cliente@x.co', 'Talleres X', 'taller', 'alta', 'ENVIADO', fechaEnvio(), '']]);
  const hilo = { id: 't1', rebote: false, mensajes: [{ from: 'Ana Gomez <cliente@x.co>', cuerpo: CUERPO_INTERES }] };
  sim.estado.hilos.push(hilo);

  global.procesarRespuestas();

  const fila = sim.estado.hojas['Empresas'].filas[1];
  asegurar(fila[4] === 'RESPONDIÓ ⭐', 'estado quedó "' + fila[4] + '" y no RESPONDIÓ ⭐');
  asegurar(hilo.mensajes[0].starred === true, 'el mensaje no quedó con estrella (starred=' + hilo.mensajes[0].starred + ')');
  asegurar(hilo.importante === true, 'el hilo no quedó marcado importante (importante=' + hilo.importante + ')');
  asegurar(String(fila[6]).indexOf('Respondió') === 0, 'la nota no registra "Respondió ..." (nota="' + fila[6] + '")');
  return 'estado=RESPONDIÓ ⭐, mensaje.starred=true, hilo.importante=true, nota="' + fila[6] + '"';
});

/* ---------- PRUEBA 2: aviso a las 8am con INTERESADA, NO RESPONDA, enlace y resumen ---------- */
prueba('2. A las 8am Bogotá sale UN aviso con INTERESADA, NO RESPONDA, enlace del hilo y resumen', () => {
  resetear(OCHO_AM);
  montarEmpresas([['cliente@x.co', 'Talleres X', 'taller', 'alta', 'ENVIADO', fechaEnvio(), '']]);
  sim.estado.hilos.push({ id: 't1', rebote: false, mensajes: [{ from: 'Ana Gomez <cliente@x.co>', cuerpo: CUERPO_INTERES }] });

  global.procesarRespuestas();

  const enviados = sim.estado.correosEnviados;
  asegurar(enviados.length === 1, 'se esperaban exactamente 1 correo y salieron ' + enviados.length);
  const c = enviados[0];
  asegurar(c.to === 'ventas.prueba@gmail.com', 'el aviso fue a ' + c.to);
  asegurar(/INTERESADA/.test(c.subject), 'el asunto no contiene INTERESADA: "' + c.subject + '"');
  asegurar(/NO RESPONDA/.test(c.body), 'el cuerpo no contiene NO RESPONDA');
  asegurar(c.body.indexOf('https://mail.google.com/mail/u/0/#inbox/t1') >= 0, 'falta el enlace mail.google.com con id t1');
  asegurar(c.body.indexOf('Buenos días, nos interesa. ¿Me envían cotización para 25 operarios?') >= 0,
    'falta el resumen del mensaje del cliente (texto propio sin lo citado)');
  asegurar(c.body.indexOf('Talleres X <cliente@x.co>') >= 0, 'falta "Empresa <correo>" en el aviso');
  asegurar(c.body.indexOf('> Señores') < 0 && c.body.indexOf('texto citado') < 0, 'el resumen incluyó texto citado');
  asegurar(JSON.parse(sim.estado.props['COLA_AVISOS']).length === 0, 'la cola no quedó vacía tras avisar');
  return 'asunto="' + c.subject + '"; cuerpo con NO RESPONDA + enlace t1 + resumen limpio; cola vaciada';
});

/* ---------- PRUEBA 3: a las 3am NO sale aviso, queda en COLA_AVISOS; a las 8am SÍ sale ---------- */
prueba('3. A las 3am Bogotá no hay aviso (queda en COLA_AVISOS) y al correr a las 8am sale', () => {
  resetear(TRES_AM);
  montarEmpresas([['cliente@x.co', 'Talleres X', 'taller', 'alta', 'ENVIADO', fechaEnvio(), '']]);
  sim.estado.hilos.push({ id: 't1', rebote: false, mensajes: [{ from: 'Ana Gomez <cliente@x.co>', cuerpo: CUERPO_INTERES }] });

  global.procesarRespuestas(); // corre a las 3am

  asegurar(sim.estado.correosEnviados.length === 0,
    'a las 3am salieron ' + sim.estado.correosEnviados.length + ' correos (debían ser 0)');
  const cola = JSON.parse(sim.estado.props['COLA_AVISOS'] || '[]');
  asegurar(cola.length === 1, 'la cola tiene ' + cola.length + ' avisos (debía tener 1)');
  asegurar(cola[0].enlace === 'https://mail.google.com/mail/u/0/#inbox/t1', 'el aviso en cola no tiene el enlace del hilo');
  asegurar(sim.estado.hojas['Empresas'].filas[1][4] === 'RESPONDIÓ ⭐', 'la fila no quedó RESPONDIÓ ⭐ a las 3am');

  // segundo corre a las 8am (mismo estado, el hilo sigue apareciendo en la búsqueda)
  sim.estado.ahora = new global.__DateReal(OCHO_AM);
  global.procesarRespuestas();

  asegurar(sim.estado.correosEnviados.length === 1,
    'a las 8am salieron ' + sim.estado.correosEnviados.length + ' correos (debía salir exactamente 1)');
  const c = sim.estado.correosEnviados[0];
  asegurar(/INTERESADA/.test(c.subject) && /NO RESPONDA/.test(c.body) && c.body.indexOf('#inbox/t1') >= 0,
    'el aviso de las 8am no tiene el contenido esperado');
  asegurar(JSON.parse(sim.estado.props['COLA_AVISOS']).length === 0, 'la cola no se vació tras el aviso de las 8am');
  return '3am: 0 correos y 1 en COLA_AVISOS; 8am: 1 aviso completo y cola vacía; sin duplicar al re-ver el hilo';
});

/* ---------- PRUEBA 4: COTIZADO ⭐⭐ y VENTA 🏆 nunca cambian ---------- */
prueba('4. COTIZADO ⭐⭐ y VENTA 🏆 no cambian aunque llegue otra respuesta (incluso BAJA)', () => {
  resetear(OCHO_AM);
  montarEmpresas([
    ['cot@x.co', 'Cotizada SAS', 'ferreteria', '', 'COTIZADO ⭐⭐', fechaEnvio(), 'cotización #12'],
    ['venta@x.co', 'Compradora SAS', 'restaurante', '', 'VENTA 🏆', fechaEnvio(), 'venta cerrada'],
  ]);
  const h1 = { id: 'tc', rebote: false, mensajes: [{ from: 'Cotizada <cot@x.co>', cuerpo: 'Gracias, seguimos pendientes de la entrega.' }] };
  const h2 = { id: 'tv', rebote: false, mensajes: [{ from: 'Compradora <venta@x.co>', cuerpo: 'DARME DE BAJA por favor' }] };
  sim.estado.hilos.push(h1, h2);

  global.procesarRespuestas();

  const f1 = sim.estado.hojas['Empresas'].filas[1];
  const f2 = sim.estado.hojas['Empresas'].filas[2];
  asegurar(f1[4] === 'COTIZADO ⭐⭐', 'COTIZADO cambió a "' + f1[4] + '"');
  asegurar(f2[4] === 'VENTA 🏆', 'VENTA cambió a "' + f2[4] + '" (ni una BAJA explícita debe tocarla)');
  asegurar(f1[6] === 'cotización #12' && f2[6] === 'venta cerrada', 'se tocaron las notas de filas avanzadas');
  asegurar(sim.estado.correosEnviados.length === 0, 'se envió un aviso que no debía salir');
  asegurar(!h1.mensajes[0].starred && !h2.mensajes[0].starred, 'se pusieron estrellas a hilos de estados avanzados');
  asegurar(!('COLA_AVISOS' in sim.estado.props), 'se encoló un aviso para estados avanzados');
  return 'ambas filas intactas (estado y notas), 0 avisos, 0 estrellas, cola sin tocar';
});

/* ---------- PRUEBA 5: respuesta de un correo que no está en la hoja no rompe nada ---------- */
prueba('5. Respuesta de un correo desconocido no rompe nada ni toca la hoja', () => {
  resetear(OCHO_AM);
  montarEmpresas([['cliente@x.co', 'Talleres X', 'taller', 'alta', 'ENVIADO', fechaEnvio(), '']]);
  const h = { id: 'tz', rebote: false, mensajes: [{ from: 'Extraño <desconocido@otro.com>', cuerpo: 'Hola, ¿ustedes venden llantas?' }] };
  sim.estado.hilos.push(h);

  global.procesarRespuestas(); // no debe lanzar

  const fila = sim.estado.hojas['Empresas'].filas[1];
  asegurar(fila[4] === 'ENVIADO', 'la fila ENVIADO cambió a "' + fila[4] + '"');
  asegurar(sim.estado.correosEnviados.length === 0, 'salió un correo que no debía salir');
  asegurar(!h.mensajes[0].starred && !h.importante, 'se marcó un hilo ajeno');
  asegurar(!('COLA_AVISOS' in sim.estado.props), 'se encoló un aviso para un correo desconocido');
  return 'sin excepción, fila sigue ENVIADO, 0 correos, 0 marcas, cola sin tocar';
});

/* ---------- PRUEBA 6 (extra): si el envío del aviso falla, la cola se pierde ---------- */
prueba('6. REGRESION: si falla el envío del aviso, COLA_AVISOS se conserva (el interesado no se pierde)', () => {
  resetear(OCHO_AM);
  montarEmpresas([['cliente@x.co', 'Talleres X', 'taller', 'alta', 'ENVIADO', fechaEnvio(), '']]);
  sim.estado.hilos.push({ id: 't1', rebote: false, mensajes: [{ from: 'Ana <cliente@x.co>', cuerpo: CUERPO_INTERES }] });
  sim.estado.forzarError = () => { throw new Error('Service invoked too many times: email'); };

  global.procesarRespuestas(); // avisar_ traga el error

  asegurar(sim.estado.correosEnviados.length === 0, 'el mock sí "envió" pese al error forzado');
  const cola = JSON.parse(sim.estado.props['COLA_AVISOS'] || '[]');
  const reg = sim.estado.hojas['Registro'].filas.map(f => f[1]);
  // Arreglo v3: la cola SOLO se vacía si el envío tuvo éxito. Al fallar, el aviso
  // se conserva para reintentarlo en la siguiente corrida (reintentarAvisosFallidos_).
  asegurar(cola.length === 1, 'la cola quedó con ' + cola.length + ' avisos (esperaba 1: el aviso debe sobrevivir al fallo)');
  asegurar(reg.indexOf('error_aviso') >= 0, 'no quedó registro del error de aviso');
  return 'el aviso falló (error_aviso en Registro) pero COLA_AVISOS conservó el interesado para reintentar: no se pierde';
});

console.log(JSON.stringify(resultados, null, 2));
const fallidas = resultados.filter(r => !r.paso).length;
console.log('\nTotal: ' + resultados.length + ' pruebas, ' + fallidas + ' fallidas');
