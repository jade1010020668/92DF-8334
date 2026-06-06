/**
 * Correos.gs - Envio de cotizaciones (GmailApp) y lectura de respuestas (Gmail API).
 *
 * Ventaja vs SMTP/IMAP del plan original: no necesitamos App Password.
 * Gmail integrado autoriza por OAuth cuando Diego despliega el script.
 */

const PLANTILLA_DEFAULT =
  'Buenas tardes,\n\n' +
  'Le escribo desde [empresa.nombre], somos proveedores de [empresa.productos]. ' +
  'Vimos que su empresa puede beneficiarse de nuestros productos por su sector y tamano.\n\n' +
  'Nos encantaria enviarle una cotizacion sin compromiso. ' +
  'Quedo atento a su respuesta para coordinar.\n\n' +
  'Cordialmente,\n' +
  '[empresa.nombre_remitente]\n' +
  'Tel: [empresa.telefono_contacto]\n';

/**
 * Envia cotizaciones a un lote de empresas en estado 'enriquecida'.
 * Respeta los limites de la hoja Config.
 *
 * @return {Object} { intentadas, enviadas, fallidas }
 */
function enviarLoteDelDia() {
  const config = leerConfig();
  const maxDia = parseInt(config['limites.correos_max_dia'], 10) || 30;
  const pausaSeg = parseInt(config['limites.pausa_entre_correos_seg'], 10) || 90;

  const yaEnviadosHoy = correosEnviadosHoy_();
  const restantes = Math.max(0, maxDia - yaEnviadosHoy);
  if (restantes === 0) {
    registrarLog_('INFO', 'Correos', 'Limite diario alcanzado (' + maxDia + ')');
    return { intentadas: 0, enviadas: 0, fallidas: 0 };
  }

  const candidatas = listarEmpresasPorEstado('enriquecida', restantes);
  registrarLog_('INFO', 'Correos',
    'Lote del dia: ' + candidatas.length + ' empresas, restantes en cuota: ' + restantes);

  let enviadas = 0;
  let fallidas = 0;

  for (const empresa of candidatas) {
    try {
      const ok = enviarCotizacion(empresa);
      if (ok) {
        enviadas++;
        actualizarEstadoEmpresa(empresa.id, 'contactada');
      } else {
        fallidas++;
      }
    } catch (e) {
      fallidas++;
      registrarLog_('ERROR', 'Correos',
        'Fallo enviando a ' + empresa.nombre + ': ' + e);
    }
    if (enviadas < candidatas.length) {
      Utilities.sleep(pausaSeg * 1000);
    }
  }

  return { intentadas: candidatas.length, enviadas: enviadas, fallidas: fallidas };
}

/**
 * Envia UNA cotizacion personalizada.
 */
function enviarCotizacion(empresa) {
  if (!empresa.correo) {
    throw new Error('Empresa sin correo: ' + empresa.nombre);
  }

  const plantilla = leerPlantillaCotizacion_();
  const personalizado = redactarCotizacion(empresa, plantilla);

  const mensajeId = generarMensajeId_();
  const headers = {
    'Message-ID': mensajeId,
    'X-Dotacion-Origen': 'dotacion-papa',
  };

  GmailApp.sendEmail(empresa.correo, personalizado.asunto, personalizado.cuerpo, {
    name: leerConfigValor('empresa.nombre_remitente', ''),
    replyTo: leerConfigValor('empresa.correo_envio', ''),
    headers: headers,
  });

  insertarCorreoEnviado({
    empresa_id: empresa.id,
    asunto: personalizado.asunto,
    cuerpo: personalizado.cuerpo,
    estado_envio: 'enviado',
    mensaje_id: mensajeId,
  });

  registrarLog_('INFO', 'Correos',
    'Enviado a ' + empresa.nombre + ' (' + empresa.correo + ')');
  return true;
}

/**
 * Lee respuestas nuevas del buzon y las clasifica.
 *
 * Busca hilos que contengan correos enviados por nosotros.
 * Para cada hilo, examina si hay mensaje nuevo del cliente y lo procesa.
 */
function leerRespuestas() {
  registrarLog_('INFO', 'Correos', 'Buscando respuestas');

  const hace3dias = Utilities.formatDate(
    new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    Session.getScriptTimeZone(),
    'yyyy/MM/dd'
  );
  const consulta = 'from:me after:' + hace3dias;

  const hilos = GmailApp.search(consulta, 0, 50);
  let nuevasRespuestas = 0;

  for (const hilo of hilos) {
    const mensajes = hilo.getMessages();
    if (mensajes.length < 2) continue;

    const ultimo = mensajes[mensajes.length - 1];
    const inReplyTo = obtenerEncabezado_(ultimo, 'In-Reply-To');
    const refs = obtenerEncabezado_(ultimo, 'References');
    const idsCandidatos = [];
    if (inReplyTo) idsCandidatos.push(inReplyTo.trim());
    if (refs) {
      refs.split(/\s+/).forEach(function (r) {
        if (r) idsCandidatos.push(r.trim());
      });
    }

    let correoOriginal = null;
    for (const id of idsCandidatos) {
      correoOriginal = buscarCorreoPorMensajeId(id);
      if (correoOriginal) break;
    }
    if (!correoOriginal) continue;

    // Evitar duplicar: si ya hay respuesta para este correo_enviado_id, saltar
    const respuestasExistentes = SpreadsheetApp.getActiveSpreadsheet()
      .getSheetByName(NOMBRES_HOJAS.RESPUESTAS);
    const yaExiste = respuestasExistentes &&
      buscarFila_(NOMBRES_HOJAS.RESPUESTAS, function (r) {
        return parseInt(r.correo_enviado_id, 10) === parseInt(correoOriginal.id, 10);
      });
    if (yaExiste) continue;

    const cuerpo = ultimo.getPlainBody() || ultimo.getBody();
    const clasificacion = clasificarRespuesta(cuerpo);

    insertarRespuesta({
      correo_enviado_id: correoOriginal.id,
      empresa_id: correoOriginal.empresa_id,
      asunto: ultimo.getSubject(),
      cuerpo: cuerpo.substring(0, 5000),
      clasificacion_ia: clasificacion.categoria,
      resumen_ia: clasificacion.resumen,
      notificada_whatsapp: false,
    });

    actualizarEstadoEmpresa(correoOriginal.empresa_id, 'respondio');
    nuevasRespuestas++;

    registrarLog_('INFO', 'Correos',
      'Respuesta clasificada como ' + clasificacion.categoria +
      ' (empresa ' + correoOriginal.empresa_id + ')');
  }

  registrarLog_('INFO', 'Correos',
    'Lectura terminada. Nuevas respuestas: ' + nuevasRespuestas);
  return { nuevasRespuestas: nuevasRespuestas };
}

// ============================================================
// Helpers
// ============================================================

function correosEnviadosHoy_() {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const todos = leerTodo_(NOMBRES_HOJAS.CORREOS);
  return todos.filter(function (c) {
    return c.fecha_envio && new Date(c.fecha_envio) >= hoy;
  }).length;
}

function generarMensajeId_() {
  const dominio = (leerConfigValor('empresa.correo_envio', 'dotacion@local')).split('@')[1] || 'dotacion-papa';
  const random = Utilities.getUuid().replace(/-/g, '');
  return '<' + random + '@' + dominio + '>';
}

function obtenerEncabezado_(mensaje, nombreCabecera) {
  const raw = mensaje.getRawContent();
  const regex = new RegExp('^' + nombreCabecera + ':\\s*(.+)$', 'mi');
  const m = raw.match(regex);
  return m ? m[1].trim() : null;
}

function leerPlantillaCotizacion_() {
  const config = leerConfig();
  let plantilla = PLANTILLA_DEFAULT;
  plantilla = plantilla.replace('[empresa.nombre]', config['empresa.nombre'] || '');
  plantilla = plantilla.replace('[empresa.productos]',
    (config['empresa.productos'] || '').split('|').join(', '));
  plantilla = plantilla.replace('[empresa.nombre_remitente]', config['empresa.nombre_remitente'] || '');
  plantilla = plantilla.replace('[empresa.telefono_contacto]', config['empresa.telefono_contacto'] || '');
  return plantilla;
}
