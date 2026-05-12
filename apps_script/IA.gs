/**
 * IA.gs - Cliente Gemini (Pro + Flash + grounding con Google Search).
 *
 * - Usa PropertiesService para la API key (nunca embebida en codigo).
 * - Pro: redaccion de cotizaciones, clasificacion de respuestas.
 * - Flash: extraccion masiva de correos, evaluacion de prospectos.
 * - Grounding: scraping de empresas via google_search tool.
 * - Logging de tokens y costo en la hoja ConsumoGemini.
 */

const GEMINI_BASE_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/';

/**
 * Llama a Gemini con manejo de retry, parseo tolerante y logging.
 *
 * @param {string} modelo - "gemini-2.5-pro" o "gemini-2.5-flash"
 * @param {string} prompt - texto del prompt
 * @param {Object} opciones - { conGrounding: bool, jsonSchema: object|null, modulo: string }
 * @return {Object} { texto: string, json: object|null, tokensIn: number, tokensOut: number }
 */
function llamarGemini(modelo, prompt, opciones) {
  opciones = opciones || {};
  const apiKey = leerSecreto('GEMINI_API_KEY');
  const config = leerConfig();
  const forzarFlash = String(config['ia.forzar_flash']) === 'true';

  let modeloEfectivo = modelo;
  if (forzarFlash && modelo === 'gemini-2.5-pro') {
    modeloEfectivo = config['ia.modelo_flash'] || 'gemini-2.5-flash';
  }

  const url = GEMINI_BASE_URL + modeloEfectivo + ':generateContent?key=' +
              encodeURIComponent(apiKey);

  const body = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.2 },
  };

  if (opciones.conGrounding) {
    body.tools = [{ google_search: {} }];
  }

  if (opciones.jsonSchema) {
    body.generationConfig.responseMimeType = 'application/json';
    body.generationConfig.responseSchema = opciones.jsonSchema;
  }

  let respuesta;
  let intento = 0;
  const maxIntentos = 3;

  while (intento < maxIntentos) {
    intento++;
    try {
      const r = UrlFetchApp.fetch(url, {
        method: 'post',
        contentType: 'application/json',
        payload: JSON.stringify(body),
        muteHttpExceptions: true,
      });
      const codigo = r.getResponseCode();
      if (codigo === 200) {
        respuesta = JSON.parse(r.getContentText());
        break;
      }
      if (codigo === 429 || codigo === 503) {
        Utilities.sleep(Math.pow(2, intento) * 1000);
        continue;
      }
      throw new Error('Gemini devolvio ' + codigo + ': ' +
                      r.getContentText().substring(0, 300));
    } catch (err) {
      if (intento >= maxIntentos) {
        registrarLog_('ERROR', opciones.modulo || 'IA',
          'Fallo Gemini despues de ' + intento + ' intentos: ' + err);
        throw err;
      }
      Utilities.sleep(Math.pow(2, intento) * 1000);
    }
  }

  const candidato = respuesta.candidates && respuesta.candidates[0];
  if (!candidato || !candidato.content || !candidato.content.parts) {
    throw new Error('Respuesta de Gemini sin contenido');
  }

  let texto = '';
  for (const parte of candidato.content.parts) {
    if (parte.text) texto += parte.text;
  }

  const usage = respuesta.usageMetadata || {};
  const tokensIn = usage.promptTokenCount || 0;
  const tokensOut = usage.candidatesTokenCount || 0;

  registrarConsumoGemini_(modeloEfectivo, tokensIn, tokensOut,
                          opciones.modulo || 'desconocido');

  let json = null;
  if (opciones.jsonSchema || opciones.parsearJson) {
    json = parsearJsonTolerante_(texto);
  }

  return {
    texto: texto,
    json: json,
    tokensIn: tokensIn,
    tokensOut: tokensOut,
    modelo: modeloEfectivo,
  };
}

/**
 * Extrae el primer bloque JSON valido del texto. Tolera markdown.
 */
function parsearJsonTolerante_(texto) {
  if (!texto) return null;
  // Quitar bloques de markdown ```json ... ```
  const sinMarkdown = texto.replace(/```json\s*/g, '').replace(/```/g, '').trim();
  try {
    return JSON.parse(sinMarkdown);
  } catch (e1) {
    // Intentar extraer el primer {...} o [...] del texto
    const matches = sinMarkdown.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    if (matches) {
      try {
        return JSON.parse(matches[1]);
      } catch (e2) {
        return null;
      }
    }
    return null;
  }
}

/**
 * Registra el consumo en la hoja ConsumoGemini para monitoreo de creditos.
 */
function registrarConsumoGemini_(modelo, tokensIn, tokensOut, modulo) {
  const config = leerConfig();
  let costoUsd = 0;
  if (modelo.indexOf('pro') !== -1) {
    costoUsd = (tokensIn / 1e6) * 1.25 + (tokensOut / 1e6) * 5.00;
  } else {
    costoUsd = (tokensIn / 1e6) * 0.10 + (tokensOut / 1e6) * 0.40;
  }
  try {
    const hoja = abrirHoja_(NOMBRES_HOJAS.CONSUMO_GEMINI);
    hoja.appendRow([new Date(), modelo, tokensIn, tokensOut, costoUsd, modulo]);
  } catch (e) {
    Logger.log('No se pudo registrar consumo: ' + e);
  }
}

// ============================================================
// API PUBLICA DE ALTO NIVEL
// ============================================================

/**
 * Extrae el correo de contacto de un bloque de HTML.
 * Usa Flash (alto volumen, tarea simple).
 */
function extraerCorreoDeHtml(html) {
  const htmlRecortado = (html || '').substring(0, 30000);
  const prompt =
    'Extrae el correo electronico de contacto principal de esta pagina web. ' +
    'Si hay varios, devuelve el que parezca de comercial/ventas/contacto, ' +
    'no de soporte tecnico ni de webmaster.\n\n' +
    'Devuelve SOLO un JSON con esta forma exacta:\n' +
    '{"correo": "ejemplo@empresa.com" | null, "confianza": 0.0-1.0}\n\n' +
    'HTML:\n' + htmlRecortado;

  const config = leerConfig();
  const modelo = config['ia.modelo_flash'] || 'gemini-2.5-flash';
  const resultado = llamarGemini(modelo, prompt, {
    parsearJson: true,
    modulo: 'enriquecer.extraer_correo',
  });
  if (resultado.json && resultado.json.correo) {
    return {
      correo: String(resultado.json.correo).toLowerCase().trim(),
      confianza: parseFloat(resultado.json.confianza) || 0,
    };
  }
  return { correo: null, confianza: 0 };
}

/**
 * Evalua si una empresa encaja como prospecto de dotacion.
 * Usa Flash; si la confianza es baja, re-valida con Pro.
 */
function evaluarProspecto(empresa) {
  const config = leerConfig();
  const productos = String(config['empresa.productos'] || '').split('|')
    .map(function (s) { return s.trim(); }).filter(Boolean);

  const prompt =
    'Eres asesor comercial de una empresa de dotacion en Bogota que vende: ' +
    productos.join(', ') + '.\n\n' +
    'Evalua si esta empresa es un buen prospecto. Considera tamano probable, ' +
    'sector, y si tipicamente compraria dotacion industrial.\n\n' +
    'Empresa:\n' + JSON.stringify({
      nombre: empresa.nombre,
      direccion: empresa.direccion,
      sitio_web: empresa.sitio_web,
      telefono: empresa.telefono,
    }, null, 2) + '\n\n' +
    'Devuelve SOLO un JSON:\n' +
    '{"es_prospecto": true|false, "razon": "...", "tamano_estimado": "pequena|mediana|grande", "confianza": 0.0-1.0}';

  const modeloFlash = config['ia.modelo_flash'] || 'gemini-2.5-flash';
  let resultado = llamarGemini(modeloFlash, prompt, {
    parsearJson: true,
    modulo: 'enriquecer.evaluar',
  });

  if (resultado.json && parseFloat(resultado.json.confianza) < 0.7 &&
      String(config['ia.forzar_flash']) !== 'true') {
    const modeloPro = config['ia.modelo_pro'] || 'gemini-2.5-pro';
    resultado = llamarGemini(modeloPro, prompt, {
      parsearJson: true,
      modulo: 'enriquecer.evaluar.revalidacion_pro',
    });
  }

  if (resultado.json) {
    return {
      esProspecto: Boolean(resultado.json.es_prospecto),
      razon: String(resultado.json.razon || ''),
      tamanoEstimado: String(resultado.json.tamano_estimado || 'desconocido'),
      confianza: parseFloat(resultado.json.confianza) || 0,
    };
  }
  return { esProspecto: false, razon: 'Sin respuesta de IA', tamanoEstimado: 'desconocido', confianza: 0 };
}

/**
 * Redacta una cotizacion personalizada para una empresa.
 * Usa Pro (calidad importa).
 */
function redactarCotizacion(empresa, plantilla) {
  const config = leerConfig();
  const productos = String(config['empresa.productos'] || '').split('|')
    .map(function (s) { return s.trim(); }).filter(Boolean);

  const prompt =
    'Eres el encargado comercial de una empresa de dotacion en Bogota llamada "' +
    (config['empresa.nombre'] || '') + '". ' +
    'Vendes: ' + productos.join(', ') + '. ' +
    'Tu telefono es ' + (config['empresa.telefono_contacto'] || '') + '.\n\n' +
    'Redacta un correo de prospeccion breve, profesional, en espanol colombiano, ' +
    'dirigido a esta empresa, basandote en la plantilla y personalizando solo ' +
    'el saludo y la primera linea segun el sector de la empresa.\n\n' +
    'Empresa destino:\n' + JSON.stringify({
      nombre: empresa.nombre,
      sector: empresa.notas_ia || '',
    }, null, 2) + '\n\n' +
    'Plantilla:\n' + plantilla + '\n\n' +
    'Devuelve SOLO un JSON:\n' +
    '{"asunto": "...", "cuerpo": "..."}';

  const modeloPro = config['ia.modelo_pro'] || 'gemini-2.5-pro';
  const resultado = llamarGemini(modeloPro, prompt, {
    parsearJson: true,
    modulo: 'correos.redactar',
  });

  if (resultado.json && resultado.json.asunto && resultado.json.cuerpo) {
    return {
      asunto: String(resultado.json.asunto),
      cuerpo: String(resultado.json.cuerpo),
    };
  }
  throw new Error('No se pudo redactar cotizacion (IA sin respuesta valida)');
}

/**
 * Clasifica una respuesta entrante.
 * Usa Pro (decision dispara notificacion al papa).
 */
function clasificarRespuesta(texto) {
  const prompt =
    'Clasifica esta respuesta de correo recibida en una de estas categorias:\n' +
    '- interesado: pide mas info, cotizacion formal, llamada, reunion\n' +
    '- no_interesado: declina explicitamente\n' +
    '- fuera_oficina: auto-respuesta de vacaciones o ausencia\n' +
    '- spam: contenido no relacionado o publicidad\n\n' +
    'Texto:\n' + texto.substring(0, 5000) + '\n\n' +
    'Devuelve SOLO un JSON:\n' +
    '{"categoria": "interesado|no_interesado|fuera_oficina|spam", "resumen": "1-2 frases"}';

  const config = leerConfig();
  const modeloPro = config['ia.modelo_pro'] || 'gemini-2.5-pro';
  const resultado = llamarGemini(modeloPro, prompt, {
    parsearJson: true,
    modulo: 'correos.clasificar',
  });

  if (resultado.json && resultado.json.categoria) {
    const categoria = String(resultado.json.categoria);
    if (CATEGORIAS_RESPUESTA_VALIDAS.indexOf(categoria) === -1) {
      return { categoria: 'sin_clasificar', resumen: String(resultado.json.resumen || '') };
    }
    return {
      categoria: categoria,
      resumen: String(resultado.json.resumen || ''),
    };
  }
  return { categoria: 'sin_clasificar', resumen: '' };
}
