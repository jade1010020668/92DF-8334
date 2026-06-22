import { afterEach, describe, it, expect } from 'vitest';
import type { ConfigApp, ProductoCatalogo } from '../../types';
import {
  CLAVE_ULTIMA_EXPORTACION,
  CONFIG_DEFAULT,
  combinarConfig,
  diasDesdeUltimaExportacion,
  faltanDatosContacto,
} from '../config';

function configCompleta(overrides: Partial<ConfigApp> = {}): ConfigApp {
  return {
    ...CONFIG_DEFAULT,
    telefono: '300 765 4321',
    email: 'ventas@elmanantial.co',
    remitente: 'Carlos Morales',
    ...overrides,
  };
}

/** localStorage falso en memoria para probar diasDesdeUltimaExportacion. */
function localStorageFalso(inicial: Record<string, string> = {}) {
  const store = new Map<string, string>(Object.entries(inicial));
  return {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
    key: () => null,
    length: 0,
  } as unknown as Storage;
}

describe('combinarConfig (parciales y basura)', () => {
  it('descarta valores no-objeto tratándolos como ausentes', () => {
    expect(combinarConfig('texto' as unknown as Partial<ConfigApp>)).toEqual(CONFIG_DEFAULT);
    expect(combinarConfig(42 as unknown as Partial<ConfigApp>)).toEqual(CONFIG_DEFAULT);
    expect(combinarConfig(true as unknown as Partial<ConfigApp>)).toEqual(CONFIG_DEFAULT);
  });

  it('mezcla varios campos parciales preservando el resto de defaults', () => {
    const r = combinarConfig({ nombreEmpresa: 'Nueva S.A.', diasSeguimiento: 9, ciudad: 'Cali' });
    expect(r.nombreEmpresa).toBe('Nueva S.A.');
    expect(r.diasSeguimiento).toBe(9);
    expect(r.ciudad).toBe('Cali');
    expect(r.textoDescuentos).toBe(CONFIG_DEFAULT.textoDescuentos);
    expect(r.productos).toEqual(CONFIG_DEFAULT.productos);
  });

  it('conserva claves de API si vienen en el objeto guardado', () => {
    const r = combinarConfig({ googleMapsApiKey: 'abc', brevoApiKey: 'xyz' });
    expect(r.googleMapsApiKey).toBe('abc');
    expect(r.brevoApiKey).toBe('xyz');
  });

  it('un array de productos no vacío reemplaza el default', () => {
    const custom: ProductoCatalogo[] = [
      { nombre: 'Cofias', precioDesde: 1200, unidad: 'unidad' },
      { nombre: 'Botas PVC', precioDesde: 40000, unidad: 'par' },
    ];
    expect(combinarConfig({ productos: custom }).productos).toEqual(custom);
  });

  it('productos no-array o vacío caen al default', () => {
    expect(combinarConfig({ productos: null as unknown as ProductoCatalogo[] }).productos).toEqual(
      CONFIG_DEFAULT.productos,
    );
    expect(combinarConfig({ productos: {} as unknown as ProductoCatalogo[] }).productos).toEqual(
      CONFIG_DEFAULT.productos,
    );
    expect(combinarConfig({ productos: [] }).productos).toEqual(CONFIG_DEFAULT.productos);
  });

  it('el resultado es independiente de CONFIG_DEFAULT (no muta el default)', () => {
    const r = combinarConfig({ nombreEmpresa: 'Mutante' });
    expect(r).not.toBe(CONFIG_DEFAULT);
    expect(CONFIG_DEFAULT.nombreEmpresa).toBe('Dotaciones El Manantial');
  });
});

describe('faltanDatosContacto (espacios y combinaciones)', () => {
  it('campos con tabs/espacios cuentan como vacíos', () => {
    expect(faltanDatosContacto(configCompleta({ telefono: ' \t ' }))).toBe(true);
    expect(faltanDatosContacto(configCompleta({ email: '\n' }))).toBe(true);
    expect(faltanDatosContacto(configCompleta({ remitente: '   ' }))).toBe(true);
  });

  it('falta si faltan dos o los tres', () => {
    expect(faltanDatosContacto(configCompleta({ telefono: '', email: '' }))).toBe(true);
    expect(faltanDatosContacto(configCompleta({ telefono: '', email: '', remitente: '' }))).toBe(true);
  });

  it('no falta cuando los tres tienen contenido aunque con espacios alrededor', () => {
    expect(
      faltanDatosContacto(configCompleta({ telefono: ' 3001234567 ', email: ' a@b.com ', remitente: ' Ana ' })),
    ).toBe(false);
  });
});

describe('diasDesdeUltimaExportacion', () => {
  const original = (globalThis as { localStorage?: Storage }).localStorage;

  afterEach(() => {
    if (original === undefined) {
      delete (globalThis as { localStorage?: Storage }).localStorage;
    } else {
      (globalThis as { localStorage?: Storage }).localStorage = original;
    }
  });

  it('devuelve null en la rama sin localStorage (entorno node)', () => {
    // Por defecto, en el entorno node no hay localStorage: el try/catch retorna null.
    delete (globalThis as { localStorage?: Storage }).localStorage;
    expect(diasDesdeUltimaExportacion(new Date('2026-06-20T00:00:00.000Z'))).toBeNull();
  });

  it('devuelve null cuando nunca se ha exportado', () => {
    (globalThis as { localStorage?: Storage }).localStorage = localStorageFalso();
    expect(diasDesdeUltimaExportacion(new Date('2026-06-20T00:00:00.000Z'))).toBeNull();
  });

  it('cuenta los días enteros transcurridos desde la última exportación', () => {
    (globalThis as { localStorage?: Storage }).localStorage = localStorageFalso({
      [CLAVE_ULTIMA_EXPORTACION]: '2026-06-10T00:00:00.000Z',
    });
    expect(diasDesdeUltimaExportacion(new Date('2026-06-20T00:00:00.000Z'))).toBe(10);
  });

  it('redondea hacia abajo los días parciales', () => {
    (globalThis as { localStorage?: Storage }).localStorage = localStorageFalso({
      [CLAVE_ULTIMA_EXPORTACION]: '2026-06-10T00:00:00.000Z',
    });
    // 3 días y medio -> 3
    expect(diasDesdeUltimaExportacion(new Date('2026-06-13T12:00:00.000Z'))).toBe(3);
  });

  it('devuelve null si la fecha guardada es inválida', () => {
    (globalThis as { localStorage?: Storage }).localStorage = localStorageFalso({
      [CLAVE_ULTIMA_EXPORTACION]: 'no-es-fecha',
    });
    expect(diasDesdeUltimaExportacion(new Date('2026-06-20T00:00:00.000Z'))).toBeNull();
  });

  it('0 días el mismo día de la exportación', () => {
    (globalThis as { localStorage?: Storage }).localStorage = localStorageFalso({
      [CLAVE_ULTIMA_EXPORTACION]: '2026-06-20T08:00:00.000Z',
    });
    expect(diasDesdeUltimaExportacion(new Date('2026-06-20T20:00:00.000Z'))).toBe(0);
  });
});
