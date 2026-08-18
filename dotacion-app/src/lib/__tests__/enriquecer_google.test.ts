import { describe, expect, it } from 'vitest';
import { parsearPrimerLugar, buscarDatosContacto } from '../enriquecerGoogle';

describe('parsearPrimerLugar', () => {
  it('extrae teléfono y web del primer lugar', () => {
    const r = parsearPrimerLugar({
      places: [
        { displayName: { text: 'Taller X' }, nationalPhoneNumber: '601 123 4567', websiteUri: 'tallerx.co' },
        { nationalPhoneNumber: '999' },
      ],
    });
    expect(r).toEqual({ telefono: '601 123 4567', website: 'https://tallerx.co' });
  });

  it('usa el teléfono internacional si no hay nacional', () => {
    const r = parsearPrimerLugar({ places: [{ internationalPhoneNumber: '+57 601 123 4567' }] });
    expect(r?.telefono).toBe('+57 601 123 4567');
    expect(r?.website).toBe('');
  });

  it('respeta el protocolo si la web ya lo trae', () => {
    const r = parsearPrimerLugar({ places: [{ websiteUri: 'https://ya.co' }] });
    expect(r?.website).toBe('https://ya.co');
  });

  it('devuelve null si no hay lugares o no hay contacto', () => {
    expect(parsearPrimerLugar({ places: [] })).toBeNull();
    expect(parsearPrimerLugar({})).toBeNull();
    expect(parsearPrimerLugar({ places: [{ displayName: { text: 'Sin contacto' } }] })).toBeNull();
  });
});

describe('buscarDatosContacto — validación previa', () => {
  it('falla sin clave, sin tocar la red', async () => {
    const r = await buscarDatosContacto({ nombre: 'Taller', direccion: '' }, '');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain('clave de Google');
  });
});
