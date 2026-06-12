import { describe, it, expect } from 'vitest';
import type { ConfigApp, ProductoCatalogo } from '../../types';
import { CONFIG_DEFAULT, combinarConfig, faltanDatosContacto } from '../config';

function configCompleta(overrides: Partial<ConfigApp> = {}): ConfigApp {
  return {
    ...CONFIG_DEFAULT,
    telefono: '300 765 4321',
    email: 'ventas@elmanantial.co',
    remitente: 'Carlos Morales',
    ...overrides,
  };
}

describe('combinarConfig', () => {
  it('devuelve los defaults completos con null o undefined', () => {
    expect(combinarConfig(null)).toEqual(CONFIG_DEFAULT);
    expect(combinarConfig(undefined)).toEqual(CONFIG_DEFAULT);
    // Debe ser una copia, no el mismo objeto compartido.
    expect(combinarConfig(null)).not.toBe(CONFIG_DEFAULT);
  });

  it('conserva el resto de defaults al sobreescribir un solo campo', () => {
    const resultado = combinarConfig({ telefono: '3001234567' });
    expect(resultado.telefono).toBe('3001234567');
    expect(resultado.nombreEmpresa).toBe(CONFIG_DEFAULT.nombreEmpresa);
    expect(resultado.diasSeguimiento).toBe(CONFIG_DEFAULT.diasSeguimiento);
    expect(resultado.textoDescuentos).toBe(CONFIG_DEFAULT.textoDescuentos);
    expect(resultado.productos).toEqual(CONFIG_DEFAULT.productos);
  });

  it('usa el catálogo default cuando productos viene vacío o ausente', () => {
    expect(combinarConfig({ productos: [] }).productos).toEqual(CONFIG_DEFAULT.productos);
    expect(combinarConfig({ nombreEmpresa: 'Otra' }).productos).toEqual(CONFIG_DEFAULT.productos);
    // Config vieja con productos corruptos (no-array) tampoco rompe.
    expect(
      combinarConfig({ productos: 'roto' as unknown as ProductoCatalogo[] }).productos,
    ).toEqual(CONFIG_DEFAULT.productos);
  });

  it('respeta los productos custom cuando existen', () => {
    const custom: ProductoCatalogo[] = [{ nombre: 'Botas dieléctricas', precioDesde: 90000, unidad: 'par' }];
    expect(combinarConfig({ productos: custom }).productos).toEqual(custom);
  });
});

describe('faltanDatosContacto', () => {
  it('es true si falta teléfono, email o remitente', () => {
    expect(faltanDatosContacto(configCompleta({ telefono: '' }))).toBe(true);
    expect(faltanDatosContacto(configCompleta({ email: '' }))).toBe(true);
    expect(faltanDatosContacto(configCompleta({ remitente: '' }))).toBe(true);
  });

  it('es true si los campos son solo espacios', () => {
    expect(faltanDatosContacto(configCompleta({ telefono: '   ' }))).toBe(true);
    expect(faltanDatosContacto(configCompleta({ remitente: '\t ' }))).toBe(true);
  });

  it('es false cuando están los tres datos', () => {
    expect(faltanDatosContacto(configCompleta())).toBe(false);
  });
});
