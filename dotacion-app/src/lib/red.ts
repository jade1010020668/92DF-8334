/**
 * fetch con tiempo límite: si el servidor no responde en `ms`, corta y lanza
 * un error claro en vez de dejar la app esperando para siempre.
 */
export async function fetchConTimeout(
  url: string,
  opciones: RequestInit = {},
  ms = 15000,
): Promise<Response> {
  const controlador = new AbortController();
  const id = setTimeout(() => controlador.abort(), ms);
  try {
    return await fetch(url, { ...opciones, signal: controlador.signal });
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') {
      throw new Error('El servidor tardó demasiado en responder. Intenta de nuevo en un momento.');
    }
    throw e;
  } finally {
    clearTimeout(id);
  }
}
