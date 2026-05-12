/**
 * WhatsApp.gs - Cliente HTTP al servicio Node externo (whatsapp-web.js).
 *
 * Apps Script no puede correr whatsapp-web.js. Por eso necesitamos un
 * servicio Node externo (en la PC de Diego o un servidor cheap) que reciba
 * webhooks desde aqui y dispare el mensaje al WhatsApp del papa.
 *
 * Configurar:
 *   PropertiesService > WHATSAPP_SERVICE_URL   ej. http://diego-pc.tailnet.ts.net:3000
 *   PropertiesService > WHATSAPP_NUMERO_PAPA   ej. +573001234567
 */

/**
 * Verifica que el servicio Node este levantado.
 */
function verificarEstadoWhatsApp() {
  const url = leerSecreto('WHATSAPP_SERVICE_URL') + '/estado';
  try {
    const r = UrlFetchApp.fetch(url, {
      method: 'get',
      muteHttpExceptions: true,
    });
    if (r.getResponseCode() !== 200) return { conectado: false, error: 'codigo ' + r.getResponseCode() };
    const json = JSON.parse(r.getContentText());
    return { conectado: Boolean(json.conectado), error: null };
  } catch (e) {
    return { conectado: false, error: String(e) };
  }
}

/**
 * Procesa todas las respuestas interesadas no notificadas y dispara
 * un mensaje al WhatsApp del papa por cada una.
 */
function notificarPendientes() {
  const pendientes = respuestasNoNotificadas();
  registrarLog_('INFO', 'WhatsApp',
    'Pendientes de notificar: ' + pendientes.length);

  let exitos = 0;
  let fallos = 0;
  for (const respuesta of pendientes) {
    try {
      const empresa = obtenerEmpresa(respuesta.empresa_id);
      const ok = enviarMensajeWhatsApp_(formatearMensaje_(empresa, respuesta));
      if (ok) {
        marcarNotificadaWhatsapp(respuesta.id);
        exitos++;
      } else {
        fallos++;
      }
    } catch (e) {
      fallos++;
      registrarLog_('ERROR', 'WhatsApp',
        'Fallo notificacion respuesta ' + respuesta.id + ': ' + e);
    }
  }
  return { exitos: exitos, fallos: fallos };
}

function formatearMensaje_(empresa, respuesta) {
  return '*Nueva respuesta de empresa*\n\n' +
    'Empresa: ' + (empresa.nombre || 'sin nombre') + '\n' +
    'Estado: ' + respuesta.clasificacion_ia + '\n\n' +
    'Resumen:\n' + (respuesta.resumen_ia || '(sin resumen)') + '\n\n' +
    'Contacto: ' + (empresa.telefono || 'sin telefono') + '\n' +
    'Correo: ' + (empresa.correo || 'sin correo') + '\n\n' +
    'Abre la app para ver el mensaje completo.';
}

function enviarMensajeWhatsApp_(mensaje) {
  const baseUrl = leerSecreto('WHATSAPP_SERVICE_URL');
  const numero = leerSecreto('WHATSAPP_NUMERO_PAPA');
  const r = UrlFetchApp.fetch(baseUrl + '/enviar', {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({ numero: numero, mensaje: mensaje }),
    muteHttpExceptions: true,
  });
  if (r.getResponseCode() >= 200 && r.getResponseCode() < 300) {
    return true;
  }
  registrarLog_('WARN', 'WhatsApp',
    'Servicio devolvio ' + r.getResponseCode() + ': ' + r.getContentText().substring(0, 300));
  return false;
}
