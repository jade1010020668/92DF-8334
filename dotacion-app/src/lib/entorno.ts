/**
 * Protecciones para que la información no "se pierda":
 *
 * 1. Los datos viven en el almacenamiento del navegador. Si la app se abre en
 *    el navegador INCRUSTADO de otra app (WhatsApp, Instagram, Facebook…),
 *    ese almacenamiento es aparte y a veces se borra al cerrar → el usuario
 *    siente que "se perdió todo". Hay que avisarle que la abra en Chrome.
 * 2. `navigator.storage.persist()` le pide al navegador que NO borre el
 *    almacenamiento de esta app cuando limpie espacio.
 */

/** ¿Estamos dentro del navegador incrustado de otra app? (pura, con pruebas) */
export function esNavegadorIncrustado(userAgent: string): boolean {
  const ua = userAgent || '';
  // Apps con WebView propio (almacenamiento separado y volátil).
  if (/FBAN|FBAV|FB_IAB|Instagram|Line\/|MicroMessenger|Twitter|TikTok|Snapchat/i.test(ua)) {
    return true;
  }
  // WebView genérico de Android ("; wv)") — no es el Chrome normal.
  if (/Android/i.test(ua) && /; wv\)/i.test(ua)) return true;
  return false;
}

/** Pide al navegador que proteja el almacenamiento de la app (no lanza). */
export async function protegerAlmacenamiento(): Promise<boolean> {
  try {
    if (typeof navigator !== 'undefined' && navigator.storage?.persist) {
      return await navigator.storage.persist();
    }
  } catch {
    // Algunos navegadores no lo soportan; no pasa nada.
  }
  return false;
}
