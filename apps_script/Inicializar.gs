/**
 * Inicializar.gs - Crea las hojas con sus encabezados la primera vez.
 *
 * Diego corre esto UNA SOLA VEZ:
 *   1. Abre el Sheet recien creado.
 *   2. Menu: Dotacion Papa > Inicializar todo.
 *
 * El script crea (o reusa si ya existen) las 7 hojas con sus columnas
 * y deja la hoja Config con valores de ejemplo.
 */

const ESQUEMA_HOJAS = {
  Sectores: [
    'id',
    'nombre',
    'palabras_clave',
    'fecha_busqueda',
    'total_empresas_encontradas',
  ],
  Empresas: [
    'id',
    'nombre',
    'sector_id',
    'direccion',
    'telefono',
    'sitio_web',
    'correo',
    'ciudad',
    'fuente',
    'validada_por_ia',
    'notas_ia',
    'estado',
    'fecha_creacion',
  ],
  CorreosEnviados: [
    'id',
    'empresa_id',
    'asunto',
    'cuerpo',
    'fecha_envio',
    'estado_envio',
    'mensaje_id',
  ],
  Respuestas: [
    'id',
    'correo_enviado_id',
    'empresa_id',
    'asunto',
    'cuerpo',
    'fecha_recepcion',
    'clasificacion_ia',
    'resumen_ia',
    'notificada_whatsapp',
  ],
  Config: ['clave', 'valor', 'descripcion'],
  Logs: ['timestamp', 'nivel', 'modulo', 'mensaje'],
  ConsumoGemini: [
    'timestamp',
    'modelo',
    'tokens_in',
    'tokens_out',
    'costo_usd',
    'modulo',
  ],
};

const CONFIG_INICIAL = [
  ['empresa.nombre', '', 'Nombre comercial de la empresa de dotacion'],
  ['empresa.productos', '', 'Productos separados por "|" - ej: uniformes|EPP|botas'],
  ['empresa.ciudad', 'Bogota', 'Ciudad base (no cambiar salvo expansion)'],
  ['empresa.telefono_contacto', '', 'Telefono del papa con codigo de pais'],
  ['empresa.correo_envio', '', 'Gmail desde el que se envian cotizaciones'],
  ['empresa.nombre_remitente', '', 'Nombre completo que firma los correos'],
  ['limites.correos_max_dia', 30, 'Maximo de correos por dia'],
  ['limites.pausa_entre_correos_seg', 90, 'Pausa entre envios consecutivos'],
  ['limites.empresas_max_busqueda', 300, 'Maximo de empresas por busqueda'],
  ['ia.modelo_pro', 'gemini-2.5-pro', 'Modelo para tareas sensibles'],
  ['ia.modelo_flash', 'gemini-2.5-flash', 'Modelo para tareas masivas'],
  ['ia.forzar_flash', false, 'true cuando se agoten los creditos'],
  ['ia.saldo_inicial_usd', 250, 'Credito prepago disponible al inicio'],
  ['scheduler.hora_envio', '08:00', 'Hora local de envio del lote diario'],
  ['scheduler.intervalo_lectura_min', 60, 'Cada cuantos minutos lee respuestas'],
];

/**
 * Punto de entrada principal. Llamado desde el menu.
 */
function inicializarTodo() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const creadas = [];
  const existentes = [];

  for (const nombre in ESQUEMA_HOJAS) {
    let hoja = ss.getSheetByName(nombre);
    if (!hoja) {
      hoja = ss.insertSheet(nombre);
      creadas.push(nombre);
    } else {
      existentes.push(nombre);
    }
    aplicarEncabezados_(hoja, ESQUEMA_HOJAS[nombre]);
  }

  // Llenar la hoja Config con plantilla si esta vacia
  const hojaConfig = ss.getSheetByName('Config');
  if (hojaConfig.getLastRow() <= 1) {
    hojaConfig.getRange(2, 1, CONFIG_INICIAL.length, 3).setValues(CONFIG_INICIAL);
  }

  // Borrar la hoja por defecto "Hoja 1" / "Sheet1" si todavia existe
  const hojaDefault = ss.getSheetByName('Hoja 1') || ss.getSheetByName('Sheet1');
  if (hojaDefault && ss.getSheets().length > 1) {
    ss.deleteSheet(hojaDefault);
  }

  registrarLog_('INFO', 'Inicializar', 'Hojas creadas: ' + creadas.join(', ') +
    '; reusadas: ' + existentes.join(', '));

  SpreadsheetApp.getUi().alert(
    'Listo. Hojas creadas: ' + creadas.length +
    '. Reusadas: ' + existentes.length + '.\n\n' +
    'Siguiente paso:\n' +
    '1. Llena la hoja Config con los datos de la empresa.\n' +
    '2. Abre Configuracion del proyecto > Propiedades del script y agrega:\n' +
    '   - GEMINI_API_KEY\n' +
    '   - WHATSAPP_NUMERO_PAPA\n' +
    '   - WHATSAPP_SERVICE_URL\n' +
    '   - CONFIG_PIN\n' +
    '3. Despliega como aplicacion web desde el menu Implementar.'
  );
}

function aplicarEncabezados_(hoja, encabezados) {
  const filaActual = hoja.getRange(1, 1, 1, hoja.getMaxColumns()).getValues()[0];
  const hayEncabezadosCorrectos = encabezados.every(function (col, i) {
    return filaActual[i] === col;
  });
  if (!hayEncabezadosCorrectos) {
    hoja.getRange(1, 1, 1, encabezados.length)
        .setValues([encabezados])
        .setFontWeight('bold')
        .setBackground('#1f6feb')
        .setFontColor('#ffffff');
    hoja.setFrozenRows(1);
  }
}
