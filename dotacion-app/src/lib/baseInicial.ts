import type { NuevaEmpresa } from '../types';

/**
 * Base de datos inicial: empresas reales cercanas al negocio, extraídas de
 * OpenStreetMap. El archivo se sirve estático (no infla el paquete de la app)
 * y se carga solo cuando el usuario pulsa "Cargar base de datos".
 */

interface EmpresaBase {
  nombre: string;
  sector?: string;
  email?: string;
  telefono?: string;
  direccion?: string;
  website?: string;
  lat?: number;
  lon?: number;
  metros?: number;
}

export interface BaseInicial {
  /** Total de empresas en el archivo. */
  total: number;
  empresas: NuevaEmpresa[];
}

function aMetros(m?: number): string {
  if (m == null) return '';
  return m < 1000 ? `${m} m` : `${(m / 1000).toFixed(1)} km`;
}

/** Descarga e interpreta la base inicial de empresas (ruta relativa al sitio). */
export async function cargarBaseInicial(): Promise<BaseInicial> {
  const respuesta = await fetch('./empresas-bogota.json', { cache: 'no-cache' });
  if (!respuesta.ok) {
    throw new Error('No pudimos cargar la base de datos. Revisa tu internet e intenta de nuevo.');
  }
  const datos = (await respuesta.json()) as EmpresaBase[];
  if (!Array.isArray(datos)) return { total: 0, empresas: [] };

  const empresas: NuevaEmpresa[] = datos
    .filter((e) => e && typeof e.nombre === 'string' && e.nombre.trim())
    .map((e) => {
      const nota = [
        e.metros != null ? `A ${aMetros(e.metros)} del negocio` : '',
        e.website ? `Sitio web: ${e.website}` : '',
      ]
        .filter(Boolean)
        .join(' · ');
      return {
        nombre: e.nombre.trim(),
        sector: (e.sector ?? '').trim(),
        email: (e.email ?? '').trim(),
        telefono: (e.telefono ?? '').trim(),
        direccion: (e.direccion ?? '').trim(),
        notas: nota || undefined,
        lat: typeof e.lat === 'number' ? e.lat : undefined,
        lon: typeof e.lon === 'number' ? e.lon : undefined,
      };
    });
  return { total: empresas.length, empresas };
}
