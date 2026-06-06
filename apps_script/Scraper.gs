/**
 * Scraper.gs - Asistente que busca empresas en internet con Gemini grounding.
 *
 * Reemplaza al scraper Playwright del plan original. Funciona asi:
 *   1. Recibe una instruccion en lenguaje natural ("busca 30 empresas de
 *      plasticos en Bogota").
 *   2. Llama a Gemini 2.5 Pro con la herramienta google_search activa.
 *   3. Gemini busca en Google, lee paginas, y devuelve lista estructurada
 *      en JSON.
 *   4. Cada empresa se valida con un fetch al sitio web para eliminar las
 *      "alucinaciones" (empresas que Gemini se inventa).
 *   5. Solo las que pasan validacion se guardan en la hoja Empresas.
 */

/**
 * Punto de entrada desde la UI o trigger manual.
 *
 * @param {string} sectorNombre - p.ej. "empresas de plasticos"
 * @param {string} instruccion - lenguaje natural del usuario
 * @param {number} limite - cuantas empresas como maximo
 * @return {Object} { sectorId, encontradas, validadas, descartadas }
 */
function buscarEmpresasConIA(sectorNombre, instruccion, limite) {
  if (!sectorNombre) throw new Error('Falta el nombre del sector');
  if (!instruccion) instruccion = 'Busca empresas medianas y pequenas';
  limite = parseInt(limite, 10) || 50;

  registrarLog_('INFO', 'Scraper',
    'Iniciando busqueda. Sector: ' + sectorNombre +
    '. Limite: ' + limite + '. Instruccion: ' + instruccion);

  const sectorId = insertarSector({
    nombre: sectorNombre,
    palabras_clave: instruccion,
    total_empresas_encontradas: 0,
  });

  const empresas = pedirEmpresasAGemini_(sectorNombre, instruccion, limite);
  registrarLog_('INFO', 'Scraper',
    'Gemini devolvio ' + empresas.length + ' candidatas');

  let validadas = 0;
  let descartadas = 0;
  for (const candidata of empresas) {
    if (!candidata.nombre) {
      descartadas++;
      continue;
    }
    const valida = validarEmpresa_(candidata);
    if (!valida) {
      descartadas++;
      continue;
    }
    const id = insertarEmpresa({
      nombre: candidata.nombre,
      sector_id: sectorId,
      direccion: candidata.direccion || '',
      telefono: candidata.telefono || '',
      sitio_web: candidata.sitio_web || '',
      fuente: 'gemini_grounding',
      estado: 'nueva',
    });
    if (id) {
      validadas++;
    } else {
      descartadas++;
    }
  }

  actualizarConteoSector(sectorId, validadas);
  registrarLog_('INFO', 'Scraper',
    'Busqueda terminada. Validadas: ' + validadas + ' / descartadas: ' + descartadas);

  return {
    sectorId: sectorId,
    encontradas: empresas.length,
    validadas: validadas,
    descartadas: descartadas,
  };
}

/**
 * Construye el prompt y llama a Gemini con grounding.
 */
function pedirEmpresasAGemini_(sectorNombre, instruccion, limite) {
  const config = leerConfig();
  const ciudad = config['empresa.ciudad'] || 'Bogota';
  const modeloPro = config['ia.modelo_pro'] || 'gemini-2.5-pro';

  const prompt =
    'Eres un asistente de prospeccion comercial. Necesito que busques en ' +
    'internet (usa la herramienta google_search) empresas reales en ' + ciudad +
    ', Colombia, que encajen con este criterio:\n\n' +
    'Sector: ' + sectorNombre + '\n' +
    'Instrucciones adicionales: ' + instruccion + '\n' +
    'Cantidad objetivo: ' + limite + ' empresas\n\n' +
    'Reglas estrictas:\n' +
    '1. SOLO empresas que realmente existan; verifica con busqueda. NO inventes.\n' +
    '2. SOLO empresas con presencia digital comprobable (web, directorio, ' +
    '   redes sociales con datos).\n' +
    '3. Prioriza pequenas y medianas (no multinacionales).\n' +
    '4. Para cada empresa devuelve: nombre exacto, sitio_web (URL completa o ' +
    '   null), direccion, telefono.\n' +
    '5. Si no encuentras ' + limite + ', devuelve las que si verificaste.\n\n' +
    'Devuelve SOLO un JSON con esta forma exacta, sin texto adicional:\n' +
    '{\n' +
    '  "empresas": [\n' +
    '    {\n' +
    '      "nombre": "Razon social o nombre comercial",\n' +
    '      "sitio_web": "https://... o null",\n' +
    '      "direccion": "direccion completa o null",\n' +
    '      "telefono": "telefono o null",\n' +
    '      "fuente_url": "URL de donde sacaste el dato"\n' +
    '    }\n' +
    '  ]\n' +
    '}';

  const resultado = llamarGemini(modeloPro, prompt, {
    conGrounding: true,
    parsearJson: true,
    modulo: 'scraper.buscar',
  });

  if (resultado.json && Array.isArray(resultado.json.empresas)) {
    return resultado.json.empresas;
  }
  registrarLog_('WARN', 'Scraper',
    'Respuesta sin lista de empresas. Texto: ' +
    String(resultado.texto || '').substring(0, 500));
  return [];
}

/**
 * Valida que la empresa tenga al menos UN dato verificable.
 *
 * Si tiene sitio_web, intenta un fetch HEAD/GET corto. Si responde,
 * la empresa pasa. Si no tiene sitio web, exige al menos telefono Y direccion.
 */
function validarEmpresa_(empresa) {
  if (empresa.sitio_web) {
    try {
      const r = UrlFetchApp.fetch(empresa.sitio_web, {
        method: 'get',
        muteHttpExceptions: true,
        followRedirects: true,
        validateHttpsCertificates: false,
        // timeout pequeno: si tarda mucho, descartar
      });
      const codigo = r.getResponseCode();
      if (codigo >= 200 && codigo < 400) {
        return true;
      }
    } catch (e) {
      // dominio invalido -> descartar
    }
  }
  // Sin web verificable: exigir telefono + direccion
  if (empresa.telefono && empresa.direccion) {
    return true;
  }
  return false;
}
