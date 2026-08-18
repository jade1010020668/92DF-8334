export const meta = {
  name: 'verificar-lote-archivo',
  description: 'Verifica en internet un lote de empresas leído de un archivo JSON (activa, correo real, teléfono, sitio)',
  phases: [
    { title: 'Cargar', detail: 'leer el lote del disco' },
    { title: 'Verificar', detail: 'un agente por empresa, búsqueda web con evidencia' },
  ],
}

const ESQUEMA = {
  type: 'object',
  required: ['id', 'existe', 'correo_pertenece', 'evidencia', 'nota'],
  properties: {
    id: { type: 'string' },
    existe: { type: 'string', enum: ['activa', 'inactiva', 'no_claro'], description: 'El negocio existe y opera hoy en Bogotá' },
    correo_pertenece: { type: 'string', enum: ['si', 'no', 'no_claro'], description: 'El correo de la base pertenece de verdad a este negocio' },
    sitio_web: { type: 'string', description: 'URL oficial, o vacío' },
    telefonos: { type: 'array', items: { type: 'string' } },
    direccion: { type: 'string', description: 'Dirección actual si se encontró mejor que la de la base, o vacío' },
    correos_nuevos: { type: 'array', items: { type: 'string' }, description: 'Correos del negocio encontrados (distintos al de la base)' },
    contacto: { type: 'string', description: 'Nombre de persona de contacto si aparece, o vacío' },
    evidencia: { type: 'array', items: { type: 'string' }, description: 'URLs que respaldan lo dicho (mínimo 1 si afirmas algo)' },
    nota: { type: 'string', description: 'Una frase: qué encontraste y qué tan seguro' },
  },
}

phase('Cargar')
const crudo = await agent(
  'Lee el archivo ' + args.ruta + ' con la herramienta Read (completo, puede tener cientos de líneas) y devuelve ' +
  'EXACTAMENTE su contenido JSON como tu texto final, sin comentarios ni cercas de código. Es un array JSON de empresas.',
  { label: 'cargar lote', phase: 'Cargar', effort: 'low' }
)
let empresas
try {
  empresas = JSON.parse(String(crudo).replace(/^\s*```(json)?\s*/i, '').replace(/\s*```\s*$/, ''))
} catch (e) {
  throw new Error('El lote no se pudo parsear: ' + String(crudo).slice(0, 200))
}
log('Lote cargado: ' + empresas.length + ' empresas desde ' + args.ruta)

phase('Verificar')
const resultados = await pipeline(
  empresas,
  e => agent(
    'Verifica UNA empresa de Bogotá, Colombia para una base de datos B2B de venta de dotación (uniformes/EPP). ' +
    'Primero carga las herramientas WebSearch y WebFetch con ToolSearch (query "select:WebSearch,WebFetch"). ' +
    'Empresa: nombre=' + JSON.stringify(e.nombre) + ', sector=' + JSON.stringify(e.sector) +
    ', correo en base=' + JSON.stringify(e.email) + ', tel en base=' + JSON.stringify(e.telefono) +
    ', dirección en base=' + JSON.stringify(e.direccion) + ', id=' + JSON.stringify(e.id) + '.\n' +
    'Haz 2-5 búsquedas web (nombre + Bogotá, nombre + sector, el dominio del correo, la dirección). ' +
    'Consulta si hace falta directorios (empresite.co, informacion-empresas.co, Google Maps, páginas amarillas) o el sitio oficial.\n' +
    'Responde: (1) ¿existe y opera HOY? (2) ¿el correo de la base pertenece a ESTE negocio? — ojo con señales de dataset mal ' +
    'cruzado: correos institucionales del Estado en negocios de barrio, artefactos técnicos (@sentry-*, @*.wixpress.com), ' +
    'correos personales sin relación con el nombre. (3) sitio web oficial, teléfonos, dirección y correos del negocio que SÍ encuentres.\n' +
    'REGLAS: no inventes NADA; cada afirmación necesita URL de evidencia; si no encuentras rastro claro, existe=no_claro y campos vacíos. ' +
    'Devuelve SOLO el objeto estructurado con el id tal cual te lo di.',
    { schema: ESQUEMA, model: 'sonnet', label: (e.nombre || e.id).slice(0, 28), phase: 'Verificar' }
  )
)

const ok = resultados.filter(Boolean)
log('Verificadas ' + ok.length + ' de ' + empresas.length)
return { total: empresas.length, respondieron: ok.length, resultados: ok }
