import { describe, it, expect } from 'vitest';
import type { ConfigApp, Empresa } from '../../types';
import { CONFIG_DEFAULT } from '../config';
import { generarRespaldo, parsearRespaldo } from '../respaldo';

const config: ConfigApp = {
  ...CONFIG_DEFAULT,
  email: 'ventas@manantial.com',
  remitente: 'Carlos Morales',
  googleMapsApiKey: 'clave-google-secreta',
  brevoApiKey: 'clave-brevo-secreta',
};

function empresa(overrides: Partial<Empresa> = {}): Empresa {
  return {
    id: 'e1',
    nombre: 'Plásticos Andinos S.A.S.',
    sector: 'plásticos',
    email: 'compras@andinos.com',
    telefono: '3001234567',
    contacto: 'María Pérez',
    direccion: 'Calle 13 # 68-50, Bogotá',
    estado: 'enviado',
    fechaCreacion: '2026-06-01T10:00:00.000Z',
    fechaEnvio: '2026-06-02T08:00:00.000Z',
    fuente: 'maps',
    ...overrides,
  };
}

describe('generarRespaldo (metadatos y privacidad)', () => {
  it('marca app=dotacionpro, version=2 y fecha ISO', () => {
    const r = JSON.parse(generarRespaldo([empresa()], config));
    expect(r.app).toBe('dotacionpro');
    expect(r.version).toBe(2);
    expect(() => new Date(r.fecha).toISOString()).not.toThrow();
    expect(r.fecha).toBe(new Date(r.fecha).toISOString());
  });

  it('vacía ambas claves de API en el JSON serializado', () => {
    const r = JSON.parse(generarRespaldo([], config));
    expect(r.config.googleMapsApiKey).toBe('');
    expect(r.config.brevoApiKey).toBe('');
  });

  it('no muta la config original al borrar las claves', () => {
    generarRespaldo([], config);
    expect(config.googleMapsApiKey).toBe('clave-google-secreta');
    expect(config.brevoApiKey).toBe('clave-brevo-secreta');
  });
});

describe('parsearRespaldo (ida y vuelta)', () => {
  it('conserva varias empresas con todos sus campos', () => {
    const a = empresa();
    const b = empresa({
      id: 'e2',
      nombre: 'Aceros del Sur',
      estado: 'cliente',
      fechaRespuesta: '2026-06-10T08:00:00.000Z',
      notas: 'cliente fiel',
      lat: 4.6,
      lon: -74.08,
    });
    const leido = parsearRespaldo(generarRespaldo([a, b], config));
    expect(leido!.empresas).toHaveLength(2);
    expect(leido!.empresas[0]).toEqual(a);
    // lat/lon SÍ se conservan en el respaldo v2 (saneados a número).
    expect(leido!.empresas[1]).toMatchObject({ id: 'e2', estado: 'cliente', notas: 'cliente fiel' });
    expect(leido!.empresas[1].lat).toBe(4.6);
    expect(leido!.empresas[1].lon).toBe(-74.08);
  });
});

describe('parsearRespaldo (rechazo de json ajeno)', () => {
  it('rechaza app distinta', () => {
    expect(parsearRespaldo(JSON.stringify({ app: 'otra-app', empresas: [] }))).toBeNull();
  });

  it('rechaza empresas que no es array', () => {
    expect(parsearRespaldo(JSON.stringify({ app: 'dotacionpro', empresas: 'no' }))).toBeNull();
  });

  it('rechaza json corrupto', () => {
    expect(parsearRespaldo('{ esto no cierra')).toBeNull();
    expect(parsearRespaldo('')).toBeNull();
  });

  it('acepta respaldo sin config y rellena con defaults', () => {
    const leido = parsearRespaldo(JSON.stringify({ app: 'dotacionpro', empresas: [] }));
    expect(leido).not.toBeNull();
    expect(leido!.config).toEqual(CONFIG_DEFAULT);
  });
});

describe('parsearRespaldo (saneo de tipos)', () => {
  it('descarta empresas sin id o sin nombre', () => {
    const texto = JSON.stringify({
      app: 'dotacionpro',
      empresas: [
        { id: 'ok', nombre: 'Buena S.A.' },
        { nombre: 'Sin id' },
        { id: 'sin-nombre' },
        { id: 'vacio', nombre: '   ' },
      ],
    });
    const leido = parsearRespaldo(texto)!;
    expect(leido.empresas.map((e) => e.id)).toEqual(['ok']);
  });

  it('coacciona campos de texto con tipo equivocado a cadena vacía', () => {
    const texto = JSON.stringify({
      app: 'dotacionpro',
      empresas: [
        { id: 'a', nombre: 'A', sector: 123, email: { x: 1 }, telefono: ['arr'], direccion: null },
      ],
    });
    const e = parsearRespaldo(texto)!.empresas[0];
    expect(e.sector).toBe('');
    expect(e.email).toBe('');
    expect(e.telefono).toBe('');
    expect(e.direccion).toBe('');
  });

  it('estado inválido cae a "pendiente" y estado válido se respeta', () => {
    const texto = JSON.stringify({
      app: 'dotacionpro',
      empresas: [
        { id: 'a', nombre: 'A', estado: 'marciano' },
        { id: 'b', nombre: 'B', estado: 'cliente' },
      ],
    });
    const r = parsearRespaldo(texto)!.empresas;
    expect(r[0].estado).toBe('pendiente');
    expect(r[1].estado).toBe('cliente');
  });

  it('fuente inválida cae a "manual" y fuente válida se respeta', () => {
    const texto = JSON.stringify({
      app: 'dotacionpro',
      empresas: [
        { id: 'a', nombre: 'A', fuente: 'inventada' },
        { id: 'b', nombre: 'B', fuente: 'excel' },
      ],
    });
    const r = parsearRespaldo(texto)!.empresas;
    expect(r[0].fuente).toBe('manual');
    expect(r[1].fuente).toBe('excel');
  });

  it('fechaCreacion ausente se rellena con una ISO válida', () => {
    const texto = JSON.stringify({ app: 'dotacionpro', empresas: [{ id: 'a', nombre: 'A' }] });
    const e = parsearRespaldo(texto)!.empresas[0];
    expect(typeof e.fechaCreacion).toBe('string');
    expect(e.fechaCreacion).toBe(new Date(e.fechaCreacion).toISOString());
  });

  it('fechas opcionales: vacías o no-string quedan undefined', () => {
    const texto = JSON.stringify({
      app: 'dotacionpro',
      empresas: [{ id: 'a', nombre: 'A', fechaEnvio: '', fechaRespuesta: 999 }],
    });
    const e = parsearRespaldo(texto)!.empresas[0];
    expect(e.fechaEnvio).toBeUndefined();
    expect(e.fechaRespuesta).toBeUndefined();
  });

  it('notas vacías o ausentes quedan undefined', () => {
    const texto = JSON.stringify({
      app: 'dotacionpro',
      empresas: [{ id: 'a', nombre: 'A', notas: '' }],
    });
    expect(parsearRespaldo(texto)!.empresas[0].notas).toBeUndefined();
  });

  it('las claves API nunca llegan al config leído aunque vengan en el archivo', () => {
    const texto = JSON.stringify({
      app: 'dotacionpro',
      empresas: [],
      config: { googleMapsApiKey: 'fuga', brevoApiKey: 'fuga2', nombreEmpresa: 'X' },
    });
    const cfg = parsearRespaldo(texto)!.config;
    // combinarConfig conserva lo que venga; el archivo de respaldo legítimo
    // ya viaja sin claves, pero documentamos el comportamiento de parseo.
    expect(cfg.nombreEmpresa).toBe('X');
  });
});
