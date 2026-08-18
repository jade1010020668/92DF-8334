import type { ConfigApp, ResultadoMaps } from '../types';
import { fetchConTimeout } from './red';

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
  const respuesta = await fetchConTimeout(url.toString(), { headers: { Accept: 'application/json' } });
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
    const respuesta = await fetchConTimeout(url.toString(), { headers: { Accept: 'application/json' } });
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

/** Varios espejos de Overpass: si uno falla o limita, se intenta el siguiente. */
const SERVIDORES_OVERPASS = [
  // Verificados con CORS abierto (funcionan desde el navegador).
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
  'https://overpass.osm.ch/api/interpreter',
  // De respaldo (a veces limitan o rechazan).
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];

async function buscarOverpass(regex: string, bbox: string): Promise<ResultadoMaps[]> {
  if (!regex) return [];
  const consulta = `[out:json][timeout:25];(node["name"~"${regex}",i](${bbox});way["name"~"${regex}",i](${bbox}););out tags center 60;`;
  let ultimoError = new Error('OpenStreetMap no respondió. Intenta de nuevo en un minuto.');
  for (const servidor of SERVIDORES_OVERPASS) {
    try {
      const respuesta = await fetchConTimeout(
        servidor,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: `data=${encodeURIComponent(consulta)}`,
        },
        45000,
      );
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
  const respuesta = await fetchConTimeout('https://places.googleapis.com/v1/places:searchText', {
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

/* ================================================================== */
/* BÚSQUEDA POR CERCANÍA — el corazón del producto:                   */
/* encontrar clientes reales cerca del negocio para no gastar el día  */
/* en transporte. Geolocaliza la dirección del negocio y trae         */
/* empresas en un radio, ordenadas por relevancia para dotación y     */
/* por distancia.                                                     */
/* ================================================================== */

export interface Coordenada {
  lat: number;
  lon: number;
}

/** Distancia en metros entre dos coordenadas (fórmula de Haversine, pura). */
export function distanciaMetros(a: Coordenada, b: Coordenada): number {
  const R = 6371000;
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLon = (b.lon - a.lon) * rad;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(s)));
}

/** Texto amable de distancia: "120 m" o "2.4 km". */
export function formatearDistancia(metros: number): string {
  return metros < 1000 ? `${metros} m` : `${(metros / 1000).toFixed(1)} km`;
}

// Palabras que delatan un buen cliente de dotación (alta necesidad de uniforme/EPP).
const SECTORES_ALTA = [
  'metal', 'soldad', 'carpinter', 'madera', 'ornamenta', 'industr', 'fabrica', 'works', 'taller',
  'car repair', 'car_repair', 'construc', 'builder', 'machin', 'welder', 'electric', 'hvac',
  'painter', 'scaffold', 'andamio', 'ferret', 'hardware', 'doityourself', 'trade', 'plast',
  'aluminio', 'vidrio', 'glazier', 'mecanic', 'moto', 'automot', 'llanta', 'lavader', 'manufactur',
  'bodega', 'warehouse', 'clothes', 'fabric', 'logist',
];
const SECTORES_MEDIA = [
  'restaurant', 'fast food', 'fast_food', 'cafe', 'panad', 'bakery', 'food', 'carnicer', 'butcher',
  'fruver', 'supermarket', 'convenience', 'clinic', 'hospital', 'pharmacy', 'health', 'dentist',
  'veterinar', 'laundry', 'cleaning', 'segur', 'transport', 'hotel', 'gym', 'fitness', 'beauty',
  'peluquer', 'hairdresser', 'spa', 'estetica',
];

/** Prioridad de un prospecto para dotación según su categoría/nombre (pura). */
export function prioridadProspecto(categoria: string, nombre: string): 1 | 2 | 3 {
  const txt = quitarTildes_(`${categoria} ${nombre}`);
  if (SECTORES_ALTA.some((k) => txt.includes(k))) return 1;
  if (SECTORES_MEDIA.some((k) => txt.includes(k))) return 2;
  return 3;
}

interface ElementoOverpassCercano extends ElementoOverpass {
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
}

/**
 * Convierte la respuesta de un Overpass "around" en prospectos con distancia
 * y prioridad, ordenados por (prioridad, distancia). Pura y testeable.
 */
export function parsearProspectosCercanos(json: unknown, origen: Coordenada): ResultadoMaps[] {
  const elementos = (json as { elements?: ElementoOverpassCercano[] })?.elements;
  if (!Array.isArray(elementos)) return [];
  const resultados: ResultadoMaps[] = [];
  const vistos = new Set<string>();
  for (const el of elementos) {
    const tags = el.tags ?? {};
    const nombre = (tags['name'] ?? '').trim();
    if (!nombre) continue;
    if (TAGS_DESCARTE.some((t) => tags[t])) continue;
    const clave = quitarTildes_(nombre);
    if (vistos.has(clave)) continue;
    const punto = el.center ?? (el.lat != null && el.lon != null ? { lat: el.lat, lon: el.lon } : null);
    if (!punto) continue;
    vistos.add(clave);
    const categoria = (
      tags['craft'] ||
      tags['shop'] ||
      tags['industrial'] ||
      tags['office'] ||
      tags['amenity'] ||
      (tags['man_made'] === 'works' ? 'fábrica' : '') ||
      (tags['building'] === 'industrial' ? 'industrial' : '')
    ).replace(/_/g, ' ');
    resultados.push({
      nombre,
      direccion: [tags['addr:street'], tags['addr:housenumber']].filter(Boolean).join(' '),
      telefono: (tags['phone'] ?? tags['contact:phone'] ?? '').trim(),
      website: normalizarUrlWeb(tags['website'] ?? tags['contact:website'] ?? ''),
      categoria,
      distanciaMetros: distanciaMetros(origen, punto),
      prioridad: prioridadProspecto(categoria, nombre),
      lat: punto.lat,
      lon: punto.lon,
    });
  }
  return resultados
    .filter((r) => (r.prioridad ?? 3) <= 2)
    .sort(
      (a, b) =>
        (a.prioridad ?? 3) - (b.prioridad ?? 3) ||
        (a.distanciaMetros ?? 0) - (b.distanciaMetros ?? 0),
    );
}

const cacheGeocodificacion_ = new Map<string, Coordenada>();

/** Geolocaliza una dirección con Nominatim (con caché). Null si no la ubica. */
export async function geocodificarDireccion(direccion: string): Promise<Coordenada | null> {
  const consulta = direccion.trim();
  if (!consulta) return null;
  const cacheada = cacheGeocodificacion_.get(consulta);
  if (cacheada) return cacheada;
  try {
    const url = new URL('https://nominatim.openstreetmap.org/search');
    url.searchParams.set('q', consulta);
    url.searchParams.set('format', 'jsonv2');
    url.searchParams.set('limit', '1');
    url.searchParams.set('countrycodes', 'co');
    const respuesta = await fetchConTimeout(url.toString(), { headers: { Accept: 'application/json' } });
    if (!respuesta.ok) return null;
    const datos = (await respuesta.json()) as { lat?: string; lon?: string }[];
    const primero = datos[0];
    if (!primero?.lat || !primero?.lon) return null;
    const punto = { lat: Number(primero.lat), lon: Number(primero.lon) };
    cacheGeocodificacion_.set(consulta, punto);
    return punto;
  } catch {
    return null;
  }
}

async function buscarOverpassCercano(origen: Coordenada, radioMetros: number): Promise<ResultadoMaps[]> {
  const { lat, lon } = origen;
  const a = `around:${radioMetros},${lat},${lon}`;
  const consulta =
    `[out:json][timeout:40];(` +
    `nwr["shop"]["name"](${a});nwr["craft"]["name"](${a});` +
    `nwr["office"]["name"](${a});nwr["industrial"]["name"](${a});` +
    `nwr["man_made"="works"]["name"](${a});nwr["building"="industrial"]["name"](${a});` +
    `nwr["amenity"~"car_repair|fuel|marketplace|restaurant|cafe|fast_food|pharmacy"]["name"](${a});` +
    `);out tags center;`;
  let ultimoError = new Error('No pudimos buscar cerca del negocio. Intenta de nuevo en un minuto.');
  for (const servidor of SERVIDORES_OVERPASS) {
    try {
      const respuesta = await fetchConTimeout(
        servidor,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: `data=${encodeURIComponent(consulta)}`,
        },
        45000,
      );
      if (!respuesta.ok) {
        throw new Error(`OpenStreetMap respondió ${respuesta.status}. Espera un minuto y reintenta.`);
      }
      return parsearProspectosCercanos(await respuesta.json(), origen);
    } catch (error) {
      ultimoError = error instanceof Error ? error : new Error(String(error));
    }
  }
  throw ultimoError;
}

export interface BusquedaCercana {
  resultados: ResultadoMaps[];
  origen: Coordenada;
}

/**
 * Busca clientes potenciales cerca del negocio. Geolocaliza la dirección de
 * Configuración (dirección + ciudad) y trae empresas dentro de `radioKm`,
 * ordenadas por prioridad para dotación y distancia.
 */
export async function buscarCercaDelNegocio(
  config: ConfigApp,
  radioKm: number,
): Promise<BusquedaCercana> {
  // 1) Si tenemos las coordenadas del negocio (vienen por defecto), úsalas:
  //    es instantáneo y no depende de geolocalizar el texto de la dirección.
  let origen: Coordenada | null =
    Number.isFinite(config.negocioLat) && Number.isFinite(config.negocioLon)
      ? { lat: config.negocioLat as number, lon: config.negocioLon as number }
      : null;
  // 2) Si no hay coordenadas, intenta ubicar la dirección escrita.
  if (!origen) {
    const direccionCompleta = [config.direccion, config.ciudad].filter((s) => s.trim()).join(', ');
    if (!direccionCompleta.trim()) {
      throw new Error('Primero escribe la dirección de tu negocio en Configuración.');
    }
    origen = await geocodificarDireccion(direccionCompleta);
    if (!origen) {
      throw new Error(
        `No pudimos ubicar "${direccionCompleta}" en el mapa. Revisa la dirección en Configuración.`,
      );
    }
  }
  const radio = Math.round(Math.min(Math.max(radioKm, 0.5), 15) * 1000);
  const resultados = await buscarOverpassCercano(origen, radio);
  return { resultados, origen };
}
