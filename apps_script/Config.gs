/**
 * Config.gs - Lectura de secretos y configuracion del negocio.
 *
 * Los secretos viven en PropertiesService (visibles solo para el dueno del
 * script, NUNCA en el codigo fuente). La config del negocio vive en la hoja
 * "Config" del Sheet (editable por Diego sin tocar codigo).
 */

const NOMBRES_HOJAS = {
  SECTORES: 'Sectores',
  EMPRESAS: 'Empresas',
  CORREOS: 'CorreosEnviados',
  RESPUESTAS: 'Respuestas',
  CONFIG: 'Config',
  LOGS: 'Logs',
  CONSUMO_GEMINI: 'ConsumoGemini',
};

const PROPIEDADES_REQUERIDAS = [
  'GEMINI_API_KEY',
  'WHATSAPP_NUMERO_PAPA',
  'WHATSAPP_SERVICE_URL',
  'CONFIG_PIN',
];

/**
 * Lee un secreto del PropertiesService. Lanza si no esta configurado.
 */
function leerSecreto(clave) {
  const valor = PropertiesService.getScriptProperties().getProperty(clave);
  if (!valor) {
    throw new Error(
      'Falta la propiedad "' + clave + '". Configurala en: Apps Script > ' +
      'Configuracion del proyecto > Propiedades del script.'
    );
  }
  return valor;
}

/**
 * Lee un secreto opcional. Devuelve null si no esta.
 */
function leerSecretoOpcional(clave) {
  return PropertiesService.getScriptProperties().getProperty(clave) || null;
}

/**
 * Devuelve un objeto con toda la config del negocio leida de la hoja "Config".
 *
 * Formato de la hoja Config:
 *   Columna A: clave  (ej. "empresa.nombre")
 *   Columna B: valor  (ej. "Dotacion Lopez")
 *   Columna C: descripcion (libre, para Diego)
 */
function leerConfig() {
  const hoja = abrirHoja_(NOMBRES_HOJAS.CONFIG);
  const filas = hoja.getDataRange().getValues();
  const config = {};
  for (let i = 1; i < filas.length; i++) {
    const clave = String(filas[i][0] || '').trim();
    const valor = filas[i][1];
    if (!clave) continue;
    config[clave] = valor;
  }
  return config;
}

function leerConfigValor(clave, porDefecto) {
  const config = leerConfig();
  return config[clave] !== undefined && config[clave] !== '' ? config[clave] : porDefecto;
}

/**
 * Verifica que todas las propiedades requeridas esten configuradas y
 * devuelve un reporte para la pantalla de Configuracion.
 */
function verificarConfiguracion() {
  const faltantes = [];
  for (const clave of PROPIEDADES_REQUERIDAS) {
    if (!leerSecretoOpcional(clave)) {
      faltantes.push(clave);
    }
  }
  let hojaConfigExiste = false;
  try {
    abrirHoja_(NOMBRES_HOJAS.CONFIG);
    hojaConfigExiste = true;
  } catch (e) {
    // no existe
  }
  return {
    propiedadesFaltantes: faltantes,
    hojaConfigExiste: hojaConfigExiste,
    listo: faltantes.length === 0 && hojaConfigExiste,
  };
}

/**
 * Helper interno para abrir una hoja por nombre.
 */
function abrirHoja_(nombre) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const hoja = ss.getSheetByName(nombre);
  if (!hoja) {
    throw new Error(
      'No se encontro la hoja "' + nombre + '". Ejecuta inicializarTodo() ' +
      'desde el menu Dotacion Papa para crear las hojas.'
    );
  }
  return hoja;
}
