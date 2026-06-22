import type { Empresa } from '../types';

/**
 * Enriquecimiento de contactos con Google Places API (New).
 *
 * Para empresas que NO tienen teléfono, busca el negocio en Google por nombre
 * y dirección y rellena el teléfono y el sitio web reales. Google NO entrega
 * correos (no los comparte), así que esto llena teléfono + web; el correo se
 * consigue entrando al sitio web.
 *
 * Coste: cada búsqueda es una petición facturable de Google. El crédito mensual
 * gratuito (~USD 200) cubre miles de búsquedas, pero conviene hacerlo por lotes.
 */

interface LugarGoogle {
  nationalPhoneNumber?: string;
  internationalPhoneNumber?: string;
  websiteUri?: string;
  displayName?: { text?: string };
}

export interface DatosContacto {
  telefono: string;
  website: string;
}

/** Asegura protocolo en una URL ("www.x.com" -> "https://www.x.com"). */
function normalizarWeb(url: string): string {
  const u = (url ?? '').trim();
  if (!u) return '';
  return /^https?:\/\//i.test(u) ? u : `https://${u}`;
}

/** Extrae teléfono y web del primer lugar de la respuesta de Places (puro). */
export function parsearPrimerLugar(json: unknown): DatosContacto | null {
  const lugares = (json as { places?: LugarGoogle[] })?.places;
  if (!Array.isArray(lugares) || lugares.length === 0) return null;
  const l = lugares[0];
  const telefono = (l.nationalPhoneNumber ?? l.internationalPhoneNumber ?? '').trim();
  const website = normalizarWeb(l.websiteUri ?? '');
  if (!telefono && !website) return null;
  return { telefono, website };
}

export type ResultadoContacto =
  | { ok: true; datos: DatosContacto }
  | { ok: false; error: string };

/** Busca en Google Places el teléfono/web de una empresa. Nunca lanza. */
export async function buscarDatosContacto(
  empresa: Pick<Empresa, 'nombre' | 'direccion'>,
  apiKey: string,
  ciudad = 'Bogotá',
): Promise<ResultadoContacto> {
  const clave = apiKey.trim();
  if (!clave) return { ok: false, error: 'No hay clave de Google configurada.' };

  const direccion = (empresa.direccion ?? '').trim();
  let consulta = [empresa.nombre.trim(), direccion].filter(Boolean).join(', ');
  if (!consulta.toLowerCase().includes(ciudad.toLowerCase())) consulta = `${consulta}, ${ciudad}`;

  try {
    const respuesta = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': clave,
        'X-Goog-FieldMask':
          'places.displayName,places.nationalPhoneNumber,places.internationalPhoneNumber,places.websiteUri',
      },
      body: JSON.stringify({ textQuery: consulta, languageCode: 'es', regionCode: 'CO', pageSize: 1 }),
    });
    if (!respuesta.ok) {
      const detalle =
        respuesta.status === 403
          ? 'La clave de Google no es válida o no tiene habilitada "Places API (New)".'
          : `Google respondió ${respuesta.status}.`;
      return { ok: false, error: detalle };
    }
    const datos = parsearPrimerLugar(await respuesta.json());
    if (!datos) return { ok: false, error: 'Google no encontró datos de contacto para esta empresa.' };
    return { ok: true, datos };
  } catch {
    return { ok: false, error: 'No se pudo conectar con Google. Revisa tu internet.' };
  }
}
