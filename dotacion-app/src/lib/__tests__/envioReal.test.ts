import { afterEach, describe, expect, it, vi } from 'vitest';
import { enviarCotizacionReal, envioRealConfigurado, medioEnvioDisponible } from '../envioReal';
import { CONFIG_DEFAULT } from '../config';
import type { Empresa } from '../../types';

const EMPRESA: Empresa = {
  id: 'e1',
  nombre: 'Taller Prueba',
  sector: 'talleres',
  email: 'compras@taller.com',
  telefono: '3001234567',
  contacto: 'Ana',
  direccion: 'C1',
  estado: 'pendiente',
  fechaCreacion: '2026-01-01T00:00:00.000Z',
  fuente: 'manual',
};

afterEach(() => vi.restoreAllMocks());

describe('envioRealConfigurado / medioEnvioDisponible', () => {
  it('sin nada configurado: no hay vía', async () => {
    expect(envioRealConfigurado(CONFIG_DEFAULT)).toBe(false);
    expect(await medioEnvioDisponible(CONFIG_DEFAULT)).toBeNull();
  });

  it('con clave de Brevo: la vía es brevo', async () => {
    const config = { ...CONFIG_DEFAULT, brevoApiKey: 'xkeysib-abc' };
    expect(envioRealConfigurado(config)).toBe(true);
    expect(await medioEnvioDisponible(config)).toBe('brevo');
  });
});

describe('enviarCotizacionReal', () => {
  it('sin vía activa devuelve error claro y no lanza', async () => {
    const r = await enviarCotizacionReal(EMPRESA, CONFIG_DEFAULT);
    expect(r.ok).toBe(false);
    expect(r.medio).toBeNull();
    expect(r.error).toContain('Configuración');
  });

  it('por brevo: envía de verdad contra la API (fetch simulado) y reporta ok', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, status: 201, json: async () => ({}) } as Response),
    );
    const config = { ...CONFIG_DEFAULT, brevoApiKey: 'xkeysib-abc' };
    const r = await enviarCotizacionReal(EMPRESA, config);
    expect(r.ok).toBe(true);
    expect(r.medio).toBe('brevo');
    // La petición fue al endpoint real de Brevo con la clave puesta.
    const llamada = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(String(llamada[0])).toContain('api.brevo.com/v3/smtp/email');
    expect((llamada[1] as RequestInit).headers).toMatchObject({ 'api-key': 'xkeysib-abc' });
  });
});
