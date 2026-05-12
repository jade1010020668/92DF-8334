/**
 * Menu.gs - Menu personalizado en el Sheet y entrada de la web app.
 */

/**
 * Se ejecuta al abrir el Sheet. Crea el menu "Dotacion Papa".
 */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Dotacion Papa')
    .addItem('1. Inicializar todo (primera vez)', 'inicializarTodo')
    .addSeparator()
    .addItem('Abrir app del papa', 'abrirWebApp')
    .addSeparator()
    .addSubMenu(
      SpreadsheetApp.getUi().createMenu('Acciones manuales')
        .addItem('Buscar empresas (preguntar sector)', 'menuBuscar')
        .addItem('Enriquecer empresas nuevas', 'menuEnriquecer')
        .addItem('Enviar lote de cotizaciones ahora', 'enviarLoteDelDia')
        .addItem('Leer respuestas ahora', 'jobLeerRespuestas')
        .addItem('Notificar interesados pendientes', 'notificarPendientes')
    )
    .addSeparator()
    .addItem('Configurar triggers automaticos', 'configurarTriggers')
    .addItem('Verificar configuracion', 'menuVerificarConfig')
    .addItem('Verificar instalacion completa (smoke test)', 'menuVerificarInstalacion')
    .addToUi();
}

function menuVerificarInstalacion() {
  const reporte = verificarInstalacion();
  let mensaje = 'Smoke test de instalacion:\n\n';
  for (const c of reporte.chequeos) {
    mensaje += (c.ok ? '[OK]   ' : '[FAIL] ') + c.nombre + '\n';
    if (!c.ok) mensaje += '       ' + c.detalle + '\n';
  }
  mensaje += '\n' + (reporte.todoOk ? 'TODO OK - listo para entregar al papa.' : 'HAY FALLOS - revisar arriba.');
  SpreadsheetApp.getUi().alert(mensaje);
}

function abrirWebApp() {
  const url = ScriptApp.getService().getUrl();
  if (!url) {
    SpreadsheetApp.getUi().alert(
      'La web app no esta desplegada todavia.\n\n' +
      'En el editor de Apps Script ve a: Implementar > Nueva implementacion > ' +
      'Aplicacion web. Despues vuelve aqui.'
    );
    return;
  }
  const html = HtmlService.createHtmlOutput(
    '<script>window.open("' + url + '", "_blank"); google.script.host.close();</script>'
  ).setWidth(100).setHeight(50);
  SpreadsheetApp.getUi().showModalDialog(html, 'Abriendo app...');
}

function menuBuscar() {
  const ui = SpreadsheetApp.getUi();
  const sector = ui.prompt(
    'Buscar empresas',
    'Que tipo de empresas quieres buscar?\n(Ej: "empresas de plasticos en Bogota")',
    ui.ButtonSet.OK_CANCEL
  );
  if (sector.getSelectedButton() !== ui.Button.OK) return;
  const nombre = sector.getResponseText().trim();
  if (!nombre) return;

  const limite = ui.prompt(
    'Cantidad',
    'Cuantas empresas como maximo? (default 30)',
    ui.ButtonSet.OK_CANCEL
  );
  if (limite.getSelectedButton() !== ui.Button.OK) return;
  const n = parseInt(limite.getResponseText(), 10) || 30;

  const resultado = buscarEmpresasConIA(nombre, 'Pequenas y medianas, con presencia web', n);
  ui.alert(
    'Listo.\n' +
    'Validadas: ' + resultado.validadas + '\n' +
    'Descartadas: ' + resultado.descartadas + '\n\n' +
    'Siguiente paso: "Enriquecer empresas nuevas" desde el menu.'
  );
}

function menuEnriquecer() {
  const resultado = enriquecerLote(null, 50);
  SpreadsheetApp.getUi().alert(
    'Enriquecimiento terminado.\n' +
    'Procesadas: ' + resultado.procesadas + '\n' +
    'Con correo: ' + resultado.conCorreo + '\n' +
    'Sin correo: ' + resultado.sinCorreo + '\n' +
    'Descartadas (no son prospecto): ' + resultado.descartadas
  );
}

function menuVerificarConfig() {
  const reporte = verificarConfiguracion();
  const estadoWa = verificarEstadoWhatsApp();
  let mensaje = 'Configuracion:\n';
  mensaje += '- Hojas creadas: ' + (reporte.hojaConfigExiste ? 'SI' : 'NO') + '\n';
  mensaje += '- Propiedades faltantes: ' +
    (reporte.propiedadesFaltantes.length === 0
      ? 'ninguna'
      : reporte.propiedadesFaltantes.join(', ')) + '\n';
  mensaje += '- Servicio WhatsApp: ' + (estadoWa.conectado ? 'conectado' : 'NO conectado') + '\n';
  mensaje += '\nListo para usar: ' + (reporte.listo && estadoWa.conectado ? 'SI' : 'NO');
  SpreadsheetApp.getUi().alert(mensaje);
}
