import type { ConfigApp, ResultadoMaps } from '../types';

/**
 * Búsqueda de empresas en el mapa.
 *
 * - Sin clave: OpenStreetMap / Nominatim (gratis, sin registro). Cobertura
 *   limitada pero suficiente para empezar.
 * - Con clave de Google Maps Platform (Places API New) en Configuración:
 *   resultados mucho más completos, con teléfono incluido.
 */

interface RespuestaNominatim {
  name?: string;
  display_name?: string;
  type?: string;
  class?: string;
  extratags?: Record<string, string> | null;
}

/** Asegura protocolo en la URL del sitio web (OSM a veces guarda "www.x.com"). */
export function normalizarUrlWeb(url: string): string {
  const limpia = url.trim();
  if (!limpia) return '';
  return /^https?:\/\//i.test(limpia) ? limpia : `https://${limpia}`;
}

/** Convierte la respuesta cruda de Nominatim en resultados de la app (pura). */
export function parsearNominatim(json: unknown): ResultadoMaps[] {
  if (!Array.isArray(json)) return [];
  const resultados: ResultadoMaps[] = [];
  for (const item of json as RespuestaNominatim[]) {
    const nombre = (item.name ?? '').trim();
    const display = (item.display_name ?? '').trim();
    if (!nombre && !display) continue;
    const extra = item.extratags ?? {};
    // display_name viene como "Nombre, calle, barrio, ciudad…": quitamos el nombre.
    let direccion = display;
    if (nombre && display.startsWith(nombre)) {
      direccion = display.slice(nombre.length).replace(/^[,\s]+/, '');
    }
    resultados.push({
      nombre: nombre || display.split(',')[0].trim(),
      direccion,
      telefono: (extra['phone'] ?? extra['contact:phone'] ?? '').trim(),
      website: normalizarUrlWeb(extra['website'] ?? extra['contact:website'] ?? ''),
      categoria: (item.type ?? item.class ?? '').replace(/_/g, ' '),
    });
  }
  return resultados;
}

async function buscarNominatim(consulta: string): Promise<ResultadoMaps[]> {
  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('q', consulta);
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('extratags', '1');
  url.searchParams.set('limit', '30');
  url.searchParams.set('countrycodes', 'co');
  url.searchParams.set('accept-language', 'es');
  const respuesta = await fetch(url.toString(), { headers: { Accept: 'application/json' } });
  if (!respuesta.ok) {
    throw new Error(`OpenStreetMap respondió ${respuesta.status}. Intenta de nuevo en un minuto.`);
  }
  return parsearNominatim(await respuesta.json());
}

interface LugarGoogle {
  displayName?: { text?: string };
  formattedAddress?: string;
  nationalPhoneNumber?: string;
  internationalPhoneNumber?: string;
  websiteUri?: string;
  primaryTypeDisplayName?: { text?: string };
}

/** Convierte la respuesta de Places API (New) en resultados de la app (pura). */
export function parsearGooglePlaces(json: unknown): ResultadoMaps[] {
  const lugares = (json as { places?: LugarGoogle[] })?.places;
  if (!Array.isArray(lugares)) return [];
  const resultados: ResultadoMaps[] = [];
  for (const lugar of lugares) {
    const nombre = (lugar.displayName?.text ?? '').trim();
    if (!nombre) continue;
    resultados.push({
      nombre,
      direccion: (lugar.formattedAddress ?? '').trim(),
      telefono: (lugar.nationalPhoneNumber ?? lugar.internationalPhoneNumber ?? '').trim(),
      website: normalizarUrlWeb(lugar.websiteUri ?? ''),
      categoria: (lugar.primaryTypeDisplayName?.text ?? '').trim(),
    });
  }
  return resultados;
}

async function buscarGooglePlaces(consulta: string, apiKey: string): Promise<ResultadoMaps[]> {
  const respuesta = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask':
        'places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.internationalPhoneNumber,places.websiteUri,places.primaryTypeDisplayName',
    },
    body: JSON.stringify({
      textQuery: consulta,
      languageCode: 'es',
      regionCode: 'CO',
      pageSize: 20,
    }),
  });
  if (!respuesta.ok) {
    throw new Error(
      `Google Places respondió ${respuesta.status}. Revisa que la clave sea válida y tenga habilitada "Places API (New)".`,
    );
  }
  return parsearGooglePlaces(await respuesta.json());
}

export interface BusquedaMaps {
  resultados: ResultadoMaps[];
  proveedor: 'google' | 'osm';
  /** Aviso no fatal, p. ej. si Google falló y se usó OSM de respaldo. */
  aviso?: string;
}

/**
 * Busca empresas con el texto que escriba el usuario (p. ej. "plásticos Bogotá").
 * Usa Google Places si hay clave configurada; si no (o si falla), OpenStreetMap.
 */
export async function buscarEmpresasEnMapa(
  consulta: string,
  config: ConfigApp,
): Promise<BusquedaMaps> {
  const texto = consulta.trim();
  if (!texto) return { resultados: [], proveedor: 'osm' };

  // Si el usuario no menciona ciudad, anclamos a la ciudad configurada.
  const ciudadBase = config.ciudad.split(',')[0].trim() || 'Bogotá';
  const consultaCompleta = texto.toLowerCase().includes(ciudadBase.toLowerCase())
    ? texto
    : `${texto} ${ciudadBase}`;

  const clave = config.googleMapsApiKey.trim();
  if (clave) {
    try {
      return { resultados: await buscarGooglePlaces(consultaCompleta, clave), proveedor: 'google' };
    } catch (error) {
      const detalle = error instanceof Error ? error.message : String(error);
      const resultados = await buscarNominatim(consultaCompleta);
      return {
        resultados,
        proveedor: 'osm',
        aviso: `Google Places falló (${detalle}). Se usó OpenStreetMap de respaldo.`,
      };
    }
  }
  return { resultados: await buscarNominatim(consultaCompleta), proveedor: 'osm' };
}
