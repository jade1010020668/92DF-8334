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

/* ------------------------------------------------------------------ */
/* Overpass: el motor principal de la búsqueda gratuita.               */
/* Busca negocios por NOMBRE dentro de la ciudad, tolerando tildes,    */
/* mayúsculas y plurales. No requiere clave ni configuración.          */
/* ------------------------------------------------------------------ */

const PALABRAS_IGNORADAS = new Set([
  'empresas', 'empresa', 'fabrica', 'fabricas', 'negocio', 'negocios', 'de', 'del', 'la', 'las',
  'el', 'los', 'en', 'y', 'o', 'u', 'para', 'con', 'tipo', 'sector', 'zona', 'cerca',
]);

const quitarTildes_ = (texto: string) =>
  texto.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/**
 * Convierte lo que escribe el usuario ("Empresas de plásticos en Bogotá")
 * en una regex para Overpass: quita ciudad y palabras de relleno, reduce
 * plurales a su raíz y hace las vocales insensibles a tildes.
 */
export function construirRegexBusqueda(consulta: string, ciudad: string): string {
  const ciudadPlana = quitarTildes_(ciudad.split(',')[0] ?? '').trim();
  const tokens = quitarTildes_(consulta)
    .replace(/[^a-z0-9ñ\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .filter((p) => !PALABRAS_IGNORADAS.has(p) && p !== ciudadPlana)
    .map((p) => {
      let raiz = p.replace(/es$|s$/, '');
      if (raiz.length > 5 && /[aeiou]$/.test(raiz)) raiz = raiz.slice(0, -1);
      return raiz;
    })
    .filter((p) => p.length >= 3);
  const clases: Record<string, string> = {
    a: '[aá]', e: '[eé]', i: '[ií]', o: '[oó]', u: '[uúü]', n: '[nñ]',
  };
  return [...new Set(tokens)]
    .map((p) => p.replace(/[aeioun]/g, (v) => clases[v] ?? v))
    .join('|');
}

/** Bbox de Bogotá; otras ciudades se geocodifican una vez y se cachean. */
const BBOX_BOGOTA = '4.45,-74.25,4.85,-73.98';
const cacheBbox_ = new Map<string, string>();

async function bboxCiudad_(ciudad: string): Promise<string> {
  const nombre = ciudad.split(',')[0].trim() || 'Bogotá';
  if (quitarTildes_(nombre) === 'bogota') return BBOX_BOGOTA;
  const cacheada = cacheBbox_.get(nombre);
  if (cacheada) return cacheada;
  try {
    const url = new URL('https://nominatim.openstreetmap.org/search');
    url.searchParams.set('q', `${nombre}, Colombia`);
    url.searchParams.set('format', 'jsonv2');
    url.searchParams.set('limit', '1');
    const respuesta = await fetch(url.toString(), { headers: { Accept: 'application/json' } });
    const datos = (await respuesta.json()) as { boundingbox?: [string, string, string, string] }[];
    const bb = datos[0]?.boundingbox;
    if (bb) {
      // Nominatim entrega [sur, norte, oeste, este]; Overpass pide (sur,oeste,norte,este).
      const bbox = `${bb[0]},${bb[2]},${bb[1]},${bb[3]}`;
      cacheBbox_.set(nombre, bbox);
      return bbox;
    }
  } catch {
    // Sin geocodificación se usa el bbox de Bogotá.
  }
  return BBOX_BOGOTA;
}

interface ElementoOverpass {
  tags?: Record<string, string>;
}

const TAGS_NEGOCIO = [
  'shop', 'craft', 'office', 'industrial', 'man_made', 'amenity', 'brand',
  'phone', 'contact:phone', 'website', 'contact:website', 'addr:street',
];
const TAGS_DESCARTE = ['highway', 'railway', 'public_transport', 'boundary', 'landuse', 'natural', 'waterway'];

/** Convierte la respuesta de Overpass en resultados de la app (pura). */
export function parsearOverpass(json: unknown): ResultadoMaps[] {
  const elementos = (json as { elements?: ElementoOverpass[] })?.elements;
  if (!Array.isArray(elementos)) return [];
  const resultados: ResultadoMaps[] = [];
  const vistos = new Set<string>();
  for (const el of elementos) {
    const tags = el.tags ?? {};
    const nombre = (tags['name'] ?? '').trim();
    if (!nombre) continue;
    if (TAGS_DESCARTE.some((t) => tags[t])) continue;
    if (!TAGS_NEGOCIO.some((t) => tags[t])) continue;
    const claveNombre = quitarTildes_(nombre);
    if (vistos.has(claveNombre)) continue;
    vistos.add(claveNombre);
    const categoria =
      tags['craft'] ||
      tags['shop'] ||
      tags['industrial'] ||
      (tags['man_made'] === 'works' ? 'fábrica' : '') ||
      (tags['office'] ? 'oficina' : '');
    resultados.push({
      nombre,
      direccion: [tags['addr:street'], tags['addr:housenumber']].filter(Boolean).join(' '),
      telefono: (tags['phone'] ?? tags['contact:phone'] ?? '').trim(),
      website: normalizarUrlWeb(tags['website'] ?? tags['contact:website'] ?? ''),
      categoria: categoria.replace(/_/g, ' '),
    });
  }
  return resultados;
}

/** Servidor principal y espejo: si uno falla o limita, se intenta el otro. */
const SERVIDORES_OVERPASS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];

async function buscarOverpass(regex: string, bbox: string): Promise<ResultadoMaps[]> {
  if (!regex) return [];
  const consulta = `[out:json][timeout:25];(node["name"~"${regex}",i](${bbox});way["name"~"${regex}",i](${bbox}););out tags center 60;`;
  let ultimoError = new Error('OpenStreetMap no respondió. Intenta de nuevo en un minuto.');
  for (const servidor of SERVIDORES_OVERPASS) {
    try {
      const respuesta = await fetch(servidor, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `data=${encodeURIComponent(consulta)}`,
      });
      if (!respuesta.ok) {
        throw new Error(`OpenStreetMap respondió ${respuesta.status}. Espera un minuto y reintenta.`);
      }
      return parsearOverpass(await respuesta.json());
    } catch (error) {
      ultimoError = error instanceof Error ? error : new Error(String(error));
    }
  }
  throw ultimoError;
}

/** Búsqueda gratuita: Overpass (por nombre) + Nominatim (por lugar), combinadas. */
async function buscarGratuita_(
  consulta: string,
  consultaCompleta: string,
  ciudad: string,
): Promise<ResultadoMaps[]> {
  const regex = construirRegexBusqueda(consulta, ciudad);
  const bbox = await bboxCiudad_(ciudad);
  const [porNombre, porLugar] = await Promise.allSettled([
    buscarOverpass(regex, bbox),
    buscarNominatim(consultaCompleta),
  ]);
  if (porNombre.status === 'rejected' && porLugar.status === 'rejected') {
    throw porNombre.reason instanceof Error ? porNombre.reason : new Error(String(porNombre.reason));
  }
  const resultados = porNombre.status === 'fulfilled' ? [...porNombre.value] : [];
  const vistos = new Set(resultados.map((r) => quitarTildes_(r.nombre)));
  if (porLugar.status === 'fulfilled') {
    for (const r of porLugar.value) {
      const clave = quitarTildes_(r.nombre);
      if (!vistos.has(clave)) {
        vistos.add(clave);
        resultados.push(r);
      }
    }
  }
  return resultados;
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
      const resultados = await buscarGratuita_(texto, consultaCompleta, config.ciudad);
      return {
        resultados,
        proveedor: 'osm',
        aviso: `Google Places falló (${detalle}). Se usó OpenStreetMap de respaldo.`,
      };
    }
  }
  return { resultados: await buscarGratuita_(texto, consultaCompleta, config.ciudad), proveedor: 'osm' };
}
