import * as XLSX from 'xlsx';
import type { Empresa, EstadoEmpresa, NuevaEmpresa } from '../types';
import { ESTADOS, ETIQUETA_ESTADO } from '../types';

/** Quita tildes, espacios y mayúsculas para comparar encabezados de Excel. */
export function normalizarEncabezado(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

type CampoImportable = keyof NuevaEmpresa;

/** Sinónimos aceptados por columna para que cualquier Excel razonable funcione. */
const SINONIMOS: Record<string, CampoImportable> = {
  nombre: 'nombre',
  empresa: 'nombre',
  razonsocial: 'nombre',
  nombreempresa: 'nombre',
  sector: 'sector',
  industria: 'sector',
  actividad: 'sector',
  email: 'email',
  correo: 'email',
  correoelectronico: 'email',
  emailcontacto: 'email',
  telefono: 'telefono',
  tel: 'telefono',
  celular: 'telefono',
  movil: 'telefono',
  whatsapp: 'telefono',
  contacto: 'contacto',
  personadecontacto: 'contacto',
  personacontacto: 'contacto',
  nombrecontacto: 'contacto',
  direccion: 'direccion',
  estado: 'estado',
  notas: 'notas',
  observaciones: 'notas',
};

function parsearEstado(valor: string): EstadoEmpresa | undefined {
  const v = normalizarEncabezado(valor);
  if (!v) return undefined;
  for (const estado of ESTADOS) {
    if (v === estado || v === normalizarEncabezado(ETIQUETA_ESTADO[estado])) return estado;
  }
  if (v === 'venta' || v === 'vendido') return 'cliente';
  if (v === 'nointeresado' || v === 'norespondio') return 'rechazado';
  return undefined;
}

/**
 * Convierte filas crudas de Excel (objetos encabezado -> valor) en empresas.
 * Pura para poder probarla sin archivos. Ignora filas sin nombre.
 */
export function filasAEmpresas(filas: Record<string, unknown>[]): NuevaEmpresa[] {
  const empresas: NuevaEmpresa[] = [];
  for (const fila of filas) {
    const empresa: NuevaEmpresa = { nombre: '' };
    for (const [encabezado, valor] of Object.entries(fila)) {
      const campo = SINONIMOS[normalizarEncabezado(encabezado)];
      if (!campo) continue;
      const texto = String(valor ?? '').trim();
      if (!texto) continue;
      if (campo === 'estado') {
        const estado = parsearEstado(texto);
        if (estado) empresa.estado = estado;
      } else {
        empresa[campo] = texto;
      }
    }
    if (empresa.nombre.trim()) empresas.push(empresa);
  }
  return empresas;
}

/** Lee el primer Excel/CSV del archivo subido y devuelve las empresas. */
export async function importarExcel(archivo: File): Promise<NuevaEmpresa[]> {
  const datos = await archivo.arrayBuffer();
  const libro = XLSX.read(datos);
  const primeraHoja = libro.Sheets[libro.SheetNames[0]];
  if (!primeraHoja) return [];
  const filas = XLSX.utils.sheet_to_json<Record<string, unknown>>(primeraHoja, {
    defval: '',
    raw: false,
  });
  return filasAEmpresas(filas);
}

const ENCABEZADOS_EXPORT = [
  'nombre',
  'sector',
  'email',
  'telefono',
  'contacto',
  'direccion',
  'estado',
  'fecha_envio',
  'fecha_respuesta',
  'notas',
] as const;

function fechaCorta(iso?: string): string {
  if (!iso) return '';
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return '';
  return fecha.toLocaleDateString('es-CO');
}

/** Matriz de filas para exportar (pura, para poder probarla). */
export function empresasAFilas(empresas: Empresa[]): (string | number)[][] {
  const filas: (string | number)[][] = [[...ENCABEZADOS_EXPORT]];
  for (const e of empresas) {
    filas.push([
      e.nombre,
      e.sector,
      e.email,
      e.telefono,
      e.contacto,
      e.direccion,
      ETIQUETA_ESTADO[e.estado],
      fechaCorta(e.fechaEnvio),
      fechaCorta(e.fechaRespuesta),
      e.notas ?? '',
    ]);
  }
  return filas;
}

function autoAncho(filas: (string | number)[][]): { wch: number }[] {
  const columnas = filas[0]?.length ?? 0;
  const anchos: { wch: number }[] = [];
  for (let c = 0; c < columnas; c++) {
    let max = 10;
    for (const fila of filas) max = Math.max(max, String(fila[c] ?? '').length);
    anchos.push({ wch: Math.min(max + 2, 50) });
  }
  return anchos;
}

/** Descarga toda la lista como Excel. */
export function exportarExcel(empresas: Empresa[]): void {
  const filas = empresasAFilas(empresas);
  const hoja = XLSX.utils.aoa_to_sheet(filas);
  hoja['!cols'] = autoAncho(filas);
  const libro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(libro, hoja, 'Empresas');
  const fecha = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(libro, `DotacionPro empresas ${fecha}.xlsx`);
}

/** Descarga una plantilla vacía con las columnas correctas y una fila de ejemplo. */
export function descargarPlantilla(): void {
  const filas: (string | number)[][] = [
    ['nombre', 'sector', 'email', 'telefono', 'contacto', 'direccion'],
    [
      'Plásticos Ejemplo S.A.S.',
      'plásticos',
      'compras@plasticosejemplo.com',
      '3001234567',
      'María Pérez',
      'Calle 13 # 68-50, Bogotá',
    ],
  ];
  const hoja = XLSX.utils.aoa_to_sheet(filas);
  hoja['!cols'] = autoAncho(filas);
  const libro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(libro, hoja, 'Empresas');
  XLSX.writeFile(libro, 'Plantilla empresas DotacionPro.xlsx');
}
