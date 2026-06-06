/**
 * Enriquecer.gs - Visita el sitio web de cada empresa y extrae correo + valida prospecto.
 *
 * Estados resultantes:
 *   - 'enriquecida'  : se obtuvo correo y la IA dice que es prospecto
 *   - 'sin_correo'   : no se pudo extraer correo
 *   - 'descartada'   : la IA dice que no es prospecto
 */

const RUTAS_CONTACTO = ['/contacto', '/contact', '/contactenos', '/contact-us'];

/**
 * Enriquece todas las empresas en estado 'nueva' (o un sector especifico).
 *
 * @param {number|null} sectorId - si es null, enriquece todas las nuevas
 * @param {number} limite - maximo de empresas a procesar en esta corrida
 */
function enriquecerLote(sectorId, limite) {
  limite = limite || 50;
  const nuevas = listarEmpresasPorEstado('nueva', limite);
  const filtradas = sectorId
    ? nuevas.filter(function (e) { return parseInt(e.sector_id, 10) === parseInt(sectorId, 10); })
    : nuevas;

  registrarLog_('INFO', 'Enriquecer',
    'Procesando ' + filtradas.length + ' empresas');

  let conCorreo = 0;
  let sinCorreo = 0;
  let descartadas = 0;

  for (const empresa of filtradas) {
    try {
      const resultado = enriquecerEmpresa(empresa);
      if (resultado.estado === 'enriquecida') conCorreo++;
      else if (resultado.estado === 'sin_correo') sinCorreo++;
      else if (resultado.estado === 'descartada') descartadas++;
    } catch (e) {
      registrarLog_('ERROR', 'Enriquecer',
        'Empresa ' + empresa.id + ' (' + empresa.nombre + '): ' + e);
    }
    // Pausa corta para no parecer bot
    Utilities.sleep(500);
  }

  return {
    procesadas: filtradas.length,
    conCorreo: conCorreo,
    sinCorreo: sinCorreo,
    descartadas: descartadas,
  };
}

/**
 * Enriquece UNA empresa. Devuelve { estado, correo, notas }.
 */
function enriquecerEmpresa(empresa) {
  let html = '';
  let correoExtraido = null;

  if (empresa.sitio_web) {
    html = traerHtmlSeguro_(empresa.sitio_web);
    // Si la home no tiene correo evidente, probar paginas de contacto
    for (const ruta of RUTAS_CONTACTO) {
      if (correoExtraido) break;
      if (buscarCorreoEnTexto_(html)) break;
      const urlContacto = combinarUrl_(empresa.sitio_web, ruta);
      const htmlContacto = traerHtmlSeguro_(urlContacto);
      if (htmlContacto) {
        html += '\n' + htmlContacto;
      }
    }

    // Primera pasada: regex (rapido, gratis)
    correoExtraido = buscarCorreoEnTexto_(html);

    // Si no hay match regex, pasar el HTML a Gemini
    if (!correoExtraido && html) {
      const extraido = extraerCorreoDeHtml(html);
      if (extraido.correo && extraido.confianza >= 0.5) {
        correoExtraido = extraido.correo;
      }
    }
  }

  // Evaluar si es prospecto
  let evaluacion;
  try {
    evaluacion = evaluarProspecto(empresa);
  } catch (e) {
    evaluacion = { esProspecto: true, razon: 'Sin evaluacion IA', tamanoEstimado: 'desconocido', confianza: 0 };
  }

  if (!evaluacion.esProspecto && evaluacion.confianza >= 0.6) {
    actualizarEmpresaEnriquecida(
      empresa.id, correoExtraido || '', false,
      'Descartada: ' + evaluacion.razon, 'descartada'
    );
    return { estado: 'descartada', correo: correoExtraido, notas: evaluacion.razon };
  }

  if (!correoExtraido) {
    actualizarEmpresaEnriquecida(
      empresa.id, '', false,
      'Sin correo: visita web sin direccion de contacto', 'sin_correo'
    );
    return { estado: 'sin_correo', correo: null, notas: 'sin correo' };
  }

  actualizarEmpresaEnriquecida(
    empresa.id, correoExtraido, true,
    'Tamano: ' + evaluacion.tamanoEstimado + '. ' + evaluacion.razon,
    'enriquecida'
  );
  return { estado: 'enriquecida', correo: correoExtraido, notas: evaluacion.razon };
}

// ============================================================
// Helpers
// ============================================================

function traerHtmlSeguro_(url) {
  if (!url) return '';
  try {
    const r = UrlFetchApp.fetch(url, {
      method: 'get',
      muteHttpExceptions: true,
      followRedirects: true,
      validateHttpsCertificates: false,
    });
    if (r.getResponseCode() >= 200 && r.getResponseCode() < 400) {
      return r.getContentText();
    }
  } catch (e) {
    // descartar
  }
  return '';
}

function combinarUrl_(baseUrl, ruta) {
  try {
    const u = baseUrl.replace(/\/+$/, '');
    return u + ruta;
  } catch (e) {
    return null;
  }
}

const REGEX_CORREO = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

function buscarCorreoEnTexto_(texto) {
  if (!texto) return null;
  const matches = texto.match(REGEX_CORREO);
  if (!matches) return null;
  // Filtrar correos genericos de plataformas
  const malos = ['ejemplo', 'example', 'sentry', 'wordpress', 'noreply', 'no-reply'];
  for (const correo of matches) {
    const c = correo.toLowerCase();
    if (malos.some(function (m) { return c.indexOf(m) !== -1; })) continue;
    return c;
  }
  return null;
}
