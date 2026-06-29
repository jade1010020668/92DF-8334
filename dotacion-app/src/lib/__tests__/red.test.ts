import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchConTimeout } from '../red';

describe('fetchConTimeout', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('devuelve la respuesta cuando el servidor responde a tiempo', async () => {
    const respuestaFalsa = { ok: true, status: 200 } as Response;
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respuestaFalsa));
    const r = await fetchConTimeout('https://ejemplo.com');
    expect(r).toBe(respuestaFalsa);
  });

  it('pasa las opciones y agrega la señal de aborto', async () => {
    const espia = vi.fn().mockResolvedValue({ ok: true } as Response);
    vi.stubGlobal('fetch', espia);
    await fetchConTimeout('https://ejemplo.com', { method: 'POST' });
    expect(espia).toHaveBeenCalledTimes(1);
    const [, opciones] = espia.mock.calls[0];
    expect(opciones.method).toBe('POST');
    expect(opciones.signal).toBeInstanceOf(AbortSignal);
  });

  it('lanza un error claro cuando se agota el tiempo', async () => {
    // fetch que respeta la señal de aborto y rechaza con AbortError.
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (_url: string, opciones: RequestInit) =>
          new Promise((_resolve, reject) => {
            opciones.signal?.addEventListener('abort', () => {
              reject(new DOMException('Aborted', 'AbortError'));
            });
          }),
      ),
    );
    await expect(fetchConTimeout('https://lento.com', {}, 5)).rejects.toThrow(
      /tardó demasiado/i,
    );
  });

  it('propaga otros errores de red sin enmascararlos', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    await expect(fetchConTimeout('https://caido.com')).rejects.toThrow('Failed to fetch');
  });
});
