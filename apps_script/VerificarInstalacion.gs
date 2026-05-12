/**
 * VerificarInstalacion.gs - Smoke test que Diego ejecuta una vez instalado todo.
 *
 * Corre desde el editor (selecciona la funcion verificarInstalacion y Run),
 * o desde el menu "Dotacion Papa > Verificar instalacion". Imprime un reporte
 * en el Logger (Ver > Logs) y devuelve un objeto con el estado de cada chequeo.
 */

function verificarInstalacion() {
  const reporte = {
    timestamp: new Date().toISOString(),
    chequeos: [],
    todoOk: true,
  };

  function chequear(nombre, fn) {
    try {
      const detalle = fn();
      reporte.chequeos.push({ nombre: nombre, ok: true, detalle: detalle || 'OK' });
      Logger.log('[OK]   ' + nombre + ' - ' + (detalle || ''));
    } catch (e) {
      reporte.chequeos.push({ nombre: nombre, ok: false, detalle: e.message });
      reporte.todoOk = false;
      Logger.log('[FAIL] ' + nombre + ' - ' + e.message);
    }
  }

  Logger.log('=== Verificacion de instalacion Dotacion Papa ===');

  // 1. Propiedades del script
  chequear('Propiedades del script (4 requeridas)', function () {
    const verif = verificarConfiguracion();
    if (verif.propiedadesFaltantes.length > 0) {
      throw new Error('Faltan: ' + verif.propiedadesFaltantes.join(', '));
    }
    return 'Todas configuradas';
  });

  // 2. Hojas del Sheet
  chequear('Hojas del Sheet (7 requeridas)', function () {
    const nombres = Object.values(NOMBRES_HOJAS);
    const faltantes = [];
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    for (const nombre of nombres) {
      if (!ss.getSheetByName(nombre)) faltantes.push(nombre);
    }
    if (faltantes.length > 0) {
      throw new Error('Faltan hojas: ' + faltantes.join(', ') + '. Ejecuta inicializarTodo().');
    }
    return nombres.length + ' hojas presentes';
  });

  // 3. Config del negocio
  chequear('Config del negocio llena', function () {
    const config = leerConfig();
    const clavesCriticas = [
      'empresa.nombre',
      'empresa.productos',
      'empresa.correo_envio',
    ];
    const vacias = clavesCriticas.filter(function (c) {
      return !config[c] || String(config[c]).trim() === '';
    });
    if (vacias.length > 0) {
      throw new Error('Faltan valores en hoja Config: ' + vacias.join(', '));
    }
    return 'empresa=' + config['empresa.nombre'];
  });

  // 4. Gemini (smoke test minimo, 1 call de bajo costo)
  chequear('Gemini API (smoke con Flash)', function () {
    const resp = llamarGemini('gemini-2.5-flash', 'Responde solo: OK', {
      maxOutputTokens: 10,
    });
    if (!resp || !resp.texto) {
      throw new Error('Respuesta vacia de Gemini');
    }
    return 'Gemini respondio (' + resp.tokensIn + ' in / ' + resp.tokensOut + ' out tokens)';
  });

  // 5. Gmail (verifica que tenemos permiso, no envia nada)
  chequear('Gmail autorizado', function () {
    const email = Session.getActiveUser().getEmail();
    if (!email) throw new Error('No se pudo obtener el correo del usuario');
    // GmailApp.getInboxUnreadCount() valida que el scope este otorgado
    GmailApp.getInboxUnreadCount();
    return 'Cuenta: ' + email;
  });

  // 6. Servicio Node de WhatsApp
  chequear('Servicio Node WhatsApp', function () {
    const estado = verificarEstadoWhatsApp();
    if (!estado.conectado) {
      throw new Error('Servicio no conectado: ' + (estado.error || 'sin detalle'));
    }
    return 'Conectado y listo';
  });

  // 7. Triggers automaticos
  chequear('Triggers automaticos configurados', function () {
    const triggers = ScriptApp.getProjectTriggers();
    const funcionesEsperadas = ['jobLeerRespuestas', 'jobEnviarLote'];
    const configuradas = triggers.map(function (t) { return t.getHandlerFunction(); });
    const faltantes = funcionesEsperadas.filter(function (f) {
      return configuradas.indexOf(f) === -1;
    });
    if (faltantes.length > 0) {
      throw new Error(
        'Faltan triggers: ' + faltantes.join(', ') +
        '. Ejecuta "Configurar triggers automaticos" desde el menu.'
      );
    }
    return triggers.length + ' triggers activos';
  });

  Logger.log('=== Resultado: ' + (reporte.todoOk ? 'TODO OK' : 'HAY FALLOS') + ' ===');

  // Tambien lo registramos en hoja Logs para historico
  try {
    registrarLog_(
      reporte.todoOk ? 'INFO' : 'WARN',
      'VerificarInstalacion',
      JSON.stringify(reporte.chequeos)
    );
  } catch (e) {
    Logger.log('No se pudo registrar en hoja Logs: ' + e.message);
  }

  return reporte;
}
