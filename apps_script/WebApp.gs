/**
 * WebApp.gs - Punto de entrada de la aplicacion web del papa.
 *
 * Despliegue:
 *   Apps Script editor > Implementar > Nueva implementacion >
 *   Tipo: aplicacion web > Ejecutar como: yo > Acceso: solo yo (o cualquiera).
 *
 * El papa abre la URL en el navegador del PC o del celular.
 */

function doGet(e) {
  const pagina = (e && e.parameter && e.parameter.pagina) || 'dashboard';
  const archivo = {
    dashboard: 'Dashboard',
    buscar: 'Buscar',
    respuestas: 'Respuestas',
    configuracion: 'Configuracion',
  }[pagina] || 'Dashboard';

  const plantilla = HtmlService.createTemplateFromFile(archivo);
  plantilla.pagina = pagina;
  return plantilla.evaluate()
    .setTitle('Dotacion Papa')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/**
 * Helper para que las plantillas HTML incluyan archivos compartidos
 * (estilos, header, etc.) usando <?!= incluir('NombreArchivo') ?>.
 */
function incluir(nombreArchivo) {
  return HtmlService.createHtmlOutputFromFile(nombreArchivo).getContent();
}

// ============================================================
// Endpoints llamados desde HTML via google.script.run
// ============================================================

function apiObtenerKPIs() {
  const conteo = contarEmpresasPorEstado();
  return {
    totalEmpresas: totalEmpresas(),
    nuevas: conteo['nueva'] || 0,
    enriquecidas: conteo['enriquecida'] || 0,
    contactadas: conteo['contactada'] || 0,
    respondieron: conteo['respondio'] || 0,
    correosUltimaSemana: correosEnviadosUltimaSemana(),
    respuestasNoLeidas: respuestasNoLeidas(),
    creditoRestante: calcularCreditoRestante_(),
  };
}

function apiBuscarEmpresas(sectorNombre, instruccion, limite) {
  return buscarEmpresasConIA(sectorNombre, instruccion, limite);
}

function apiEnriquecerEmpresas(sectorId, limite) {
  return enriquecerLote(sectorId, limite);
}

function apiListarRespuestas(filtro) {
  const todas = leerTodo_(NOMBRES_HOJAS.RESPUESTAS);
  let filtradas = todas;
  if (filtro && filtro !== 'todas') {
    filtradas = todas.filter(function (r) { return r.clasificacion_ia === filtro; });
  }
  filtradas.sort(function (a, b) {
    return new Date(b.fecha_recepcion) - new Date(a.fecha_recepcion);
  });
  return filtradas.slice(0, 50).map(function (r) {
    const empresa = obtenerEmpresa(r.empresa_id);
    return {
      id: r.id,
      empresa: empresa ? empresa.nombre : '(sin empresa)',
      correo: empresa ? empresa.correo : '',
      telefono: empresa ? empresa.telefono : '',
      asunto: r.asunto,
      cuerpo: r.cuerpo,
      fecha: r.fecha_recepcion,
      clasificacion: r.clasificacion_ia,
      resumen: r.resumen_ia,
    };
  });
}

function apiMarcarRespuestaGestionada(respuestaId) {
  marcarNotificadaWhatsapp(respuestaId);
  return true;
}

function apiVerificarServicios() {
  const config = verificarConfiguracion();
  const wa = verificarEstadoWhatsApp();
  return {
    propiedadesFaltantes: config.propiedadesFaltantes,
    hojaConfigExiste: config.hojaConfigExiste,
    whatsapp: wa,
    gmail: { conectado: true, nota: 'integrado nativamente' },
    gemini: { conectado: Boolean(leerSecretoOpcional('GEMINI_API_KEY')) },
  };
}

function apiValidarPin(pinIngresado) {
  const real = leerSecreto('CONFIG_PIN');
  return String(pinIngresado) === String(real);
}

function calcularCreditoRestante_() {
  const config = leerConfig();
  const saldoInicial = parseFloat(config['ia.saldo_inicial_usd']) || 250;
  let gastado = 0;
  try {
    const consumos = leerTodo_(NOMBRES_HOJAS.CONSUMO_GEMINI);
    for (const c of consumos) {
      gastado += parseFloat(c.costo_usd) || 0;
    }
  } catch (e) {
    // Hoja no inicializada todavia
  }
  const restante = Math.max(0, saldoInicial - gastado);
  const porcentaje = saldoInicial > 0 ? (restante / saldoInicial) * 100 : 0;
  return {
    saldoInicialUsd: saldoInicial,
    gastadoUsd: Math.round(gastado * 100) / 100,
    restanteUsd: Math.round(restante * 100) / 100,
    porcentaje: Math.round(porcentaje * 10) / 10,
  };
}
