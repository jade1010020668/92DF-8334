/**
 * Sheets.gs - Capa de acceso a las hojas como si fueran tablas.
 *
 * Cada funcion recibe/devuelve objetos planos. Las hojas usan la primera fila
 * como encabezados; ese array determina el orden de columnas al escribir.
 */

const ESTADOS_EMPRESA_VALIDOS = [
  'nueva',
  'enriquecida',
  'sin_correo',
  'contactada',
  'respondio',
  'descartada',
];

const CATEGORIAS_RESPUESTA_VALIDAS = [
  'interesado',
  'no_interesado',
  'fuera_oficina',
  'spam',
  'sin_clasificar',
];

// ============================================================
// Helpers internos
// ============================================================

function leerEncabezados_(hoja) {
  const ultima = Math.max(hoja.getLastColumn(), 1);
  return hoja.getRange(1, 1, 1, ultima).getValues()[0];
}

function filaAObjeto_(encabezados, fila) {
  const obj = {};
  for (let i = 0; i < encabezados.length; i++) {
    obj[encabezados[i]] = fila[i];
  }
  return obj;
}

function objetoAFila_(encabezados, obj) {
  const fila = [];
  for (let i = 0; i < encabezados.length; i++) {
    const valor = obj[encabezados[i]];
    fila.push(valor === undefined ? '' : valor);
  }
  return fila;
}

function siguienteId_(hoja) {
  const ultimaFila = hoja.getLastRow();
  if (ultimaFila < 2) return 1;
  const ids = hoja.getRange(2, 1, ultimaFila - 1, 1).getValues();
  let max = 0;
  for (const fila of ids) {
    const n = parseInt(fila[0], 10);
    if (!isNaN(n) && n > max) max = n;
  }
  return max + 1;
}

function leerTodo_(nombreHoja) {
  const hoja = abrirHoja_(nombreHoja);
  const ultimaFila = hoja.getLastRow();
  if (ultimaFila < 2) return [];
  const encabezados = leerEncabezados_(hoja);
  const filas = hoja.getRange(2, 1, ultimaFila - 1, encabezados.length).getValues();
  return filas.map(function (f) {
    return filaAObjeto_(encabezados, f);
  });
}

function insertarFila_(nombreHoja, objeto) {
  const hoja = abrirHoja_(nombreHoja);
  const encabezados = leerEncabezados_(hoja);
  if (objeto.id === undefined || objeto.id === '' || objeto.id === null) {
    objeto.id = siguienteId_(hoja);
  }
  const fila = objetoAFila_(encabezados, objeto);
  hoja.appendRow(fila);
  return objeto.id;
}

function actualizarFila_(nombreHoja, id, cambios) {
  const hoja = abrirHoja_(nombreHoja);
  const ultimaFila = hoja.getLastRow();
  if (ultimaFila < 2) return false;
  const encabezados = leerEncabezados_(hoja);
  const datos = hoja.getRange(2, 1, ultimaFila - 1, encabezados.length).getValues();
  for (let i = 0; i < datos.length; i++) {
    if (parseInt(datos[i][0], 10) === parseInt(id, 10)) {
      const objeto = filaAObjeto_(encabezados, datos[i]);
      for (const clave in cambios) {
        objeto[clave] = cambios[clave];
      }
      const filaActualizada = objetoAFila_(encabezados, objeto);
      hoja.getRange(i + 2, 1, 1, encabezados.length).setValues([filaActualizada]);
      return true;
    }
  }
  return false;
}

function buscarFila_(nombreHoja, predicado) {
  const todos = leerTodo_(nombreHoja);
  for (const obj of todos) {
    if (predicado(obj)) return obj;
  }
  return null;
}

// ============================================================
// SECTORES
// ============================================================

function insertarSector(sector) {
  return insertarFila_(NOMBRES_HOJAS.SECTORES, {
    id: '',
    nombre: sector.nombre,
    palabras_clave: sector.palabras_clave,
    fecha_busqueda: new Date(),
    total_empresas_encontradas: sector.total_empresas_encontradas || 0,
  });
}

function listarSectores() {
  return leerTodo_(NOMBRES_HOJAS.SECTORES);
}

function actualizarConteoSector(sectorId, total) {
  return actualizarFila_(NOMBRES_HOJAS.SECTORES, sectorId, {
    total_empresas_encontradas: total,
  });
}

// ============================================================
// EMPRESAS
// ============================================================

function insertarEmpresa(empresa) {
  if (empresa.estado && ESTADOS_EMPRESA_VALIDOS.indexOf(empresa.estado) === -1) {
    throw new Error('Estado de empresa invalido: ' + empresa.estado);
  }
  const existente = buscarEmpresaPorNombreDireccion(empresa.nombre, empresa.direccion);
  if (existente) return null;

  return insertarFila_(NOMBRES_HOJAS.EMPRESAS, {
    id: '',
    nombre: empresa.nombre,
    sector_id: empresa.sector_id || '',
    direccion: empresa.direccion || '',
    telefono: empresa.telefono || '',
    sitio_web: empresa.sitio_web || '',
    correo: empresa.correo || '',
    ciudad: empresa.ciudad || 'Bogota',
    fuente: empresa.fuente || '',
    validada_por_ia: empresa.validada_por_ia ? 'true' : 'false',
    notas_ia: empresa.notas_ia || '',
    estado: empresa.estado || 'nueva',
    fecha_creacion: new Date(),
  });
}

function buscarEmpresaPorNombreDireccion(nombre, direccion) {
  return buscarFila_(NOMBRES_HOJAS.EMPRESAS, function (e) {
    return String(e.nombre).toLowerCase() === String(nombre).toLowerCase() &&
           String(e.direccion || '') === String(direccion || '');
  });
}

function obtenerEmpresa(empresaId) {
  return buscarFila_(NOMBRES_HOJAS.EMPRESAS, function (e) {
    return parseInt(e.id, 10) === parseInt(empresaId, 10);
  });
}

function listarEmpresasPorEstado(estado, limite) {
  if (ESTADOS_EMPRESA_VALIDOS.indexOf(estado) === -1) {
    throw new Error('Estado invalido: ' + estado);
  }
  const todas = leerTodo_(NOMBRES_HOJAS.EMPRESAS).filter(function (e) {
    return e.estado === estado;
  });
  todas.sort(function (a, b) {
    return new Date(b.fecha_creacion) - new Date(a.fecha_creacion);
  });
  return limite ? todas.slice(0, limite) : todas;
}

function actualizarEstadoEmpresa(empresaId, estado) {
  if (ESTADOS_EMPRESA_VALIDOS.indexOf(estado) === -1) {
    throw new Error('Estado invalido: ' + estado);
  }
  return actualizarFila_(NOMBRES_HOJAS.EMPRESAS, empresaId, { estado: estado });
}

function actualizarEmpresaEnriquecida(empresaId, correo, validadaPorIa, notasIa, estado) {
  if (ESTADOS_EMPRESA_VALIDOS.indexOf(estado) === -1) {
    throw new Error('Estado invalido: ' + estado);
  }
  return actualizarFila_(NOMBRES_HOJAS.EMPRESAS, empresaId, {
    correo: correo || '',
    validada_por_ia: validadaPorIa ? 'true' : 'false',
    notas_ia: notasIa || '',
    estado: estado,
  });
}

// ============================================================
// CORREOS ENVIADOS
// ============================================================

function insertarCorreoEnviado(correo) {
  return insertarFila_(NOMBRES_HOJAS.CORREOS, {
    id: '',
    empresa_id: correo.empresa_id,
    asunto: correo.asunto,
    cuerpo: correo.cuerpo,
    fecha_envio: new Date(),
    estado_envio: correo.estado_envio || 'enviado',
    mensaje_id: correo.mensaje_id,
  });
}

function buscarCorreoPorMensajeId(mensajeId) {
  return buscarFila_(NOMBRES_HOJAS.CORREOS, function (c) {
    return c.mensaje_id === mensajeId;
  });
}

function marcarEnvioFallo(correoId) {
  return actualizarFila_(NOMBRES_HOJAS.CORREOS, correoId, { estado_envio: 'fallo' });
}

function correosEnviadosUltimaSemana() {
  const hace7dias = new Date();
  hace7dias.setDate(hace7dias.getDate() - 7);
  return leerTodo_(NOMBRES_HOJAS.CORREOS).filter(function (c) {
    return c.fecha_envio && new Date(c.fecha_envio) >= hace7dias;
  }).length;
}

// ============================================================
// RESPUESTAS
// ============================================================

function insertarRespuesta(respuesta) {
  if (CATEGORIAS_RESPUESTA_VALIDAS.indexOf(respuesta.clasificacion_ia) === -1) {
    throw new Error('Categoria de respuesta invalida: ' + respuesta.clasificacion_ia);
  }
  return insertarFila_(NOMBRES_HOJAS.RESPUESTAS, {
    id: '',
    correo_enviado_id: respuesta.correo_enviado_id,
    empresa_id: respuesta.empresa_id,
    asunto: respuesta.asunto || '',
    cuerpo: respuesta.cuerpo || '',
    fecha_recepcion: new Date(),
    clasificacion_ia: respuesta.clasificacion_ia,
    resumen_ia: respuesta.resumen_ia || '',
    notificada_whatsapp: respuesta.notificada_whatsapp ? 'true' : 'false',
  });
}

function marcarNotificadaWhatsapp(respuestaId) {
  return actualizarFila_(NOMBRES_HOJAS.RESPUESTAS, respuestaId, {
    notificada_whatsapp: 'true',
  });
}

function respuestasNoNotificadas() {
  return leerTodo_(NOMBRES_HOJAS.RESPUESTAS).filter(function (r) {
    return String(r.notificada_whatsapp) !== 'true' &&
           r.clasificacion_ia === 'interesado';
  });
}

function respuestasNoLeidas() {
  return leerTodo_(NOMBRES_HOJAS.RESPUESTAS).filter(function (r) {
    return String(r.notificada_whatsapp) !== 'true';
  }).length;
}

// ============================================================
// KPIs DASHBOARD
// ============================================================

function contarEmpresasPorEstado() {
  const empresas = leerTodo_(NOMBRES_HOJAS.EMPRESAS);
  const conteo = {};
  for (const e of empresas) {
    conteo[e.estado] = (conteo[e.estado] || 0) + 1;
  }
  return conteo;
}

function totalEmpresas() {
  const hoja = abrirHoja_(NOMBRES_HOJAS.EMPRESAS);
  return Math.max(0, hoja.getLastRow() - 1);
}

// ============================================================
// LOG INTERNO
// ============================================================

function registrarLog_(nivel, modulo, mensaje) {
  try {
    const hoja = abrirHoja_(NOMBRES_HOJAS.LOGS);
    hoja.appendRow([new Date(), nivel, modulo, mensaje]);
  } catch (e) {
    // Si la hoja no existe todavia (primera ejecucion), caer en Logger
    Logger.log(nivel + ' | ' + modulo + ' | ' + mensaje);
  }
}
