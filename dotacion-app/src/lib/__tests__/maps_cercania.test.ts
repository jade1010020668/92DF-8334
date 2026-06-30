import { describe, expect, it } from 'vitest';
import {
  distanciaMetros,
  formatearDistancia,
  parsearProspectosCercanos,
  prioridadProspecto,
} from '../maps';

const negocio = { lat: 4.5856304, lon: -74.1354175 };

describe('distanciaMetros', () => {
  it('mismo punto = 0', () => {
    expect(distanciaMetros(negocio, negocio)).toBe(0);
  });

  it('calcula distancia razonable entre dos puntos de Bogotá', () => {
    // ~1.1 km al norte (0.01 grados de latitud).
    const otro = { lat: negocio.lat + 0.01, lon: negocio.lon };
    const d = distanciaMetros(negocio, otro);
    expect(d).toBeGreaterThan(1050);
    expect(d).toBeLessThan(1150);
  });
});

describe('formatearDistancia', () => {
  it('metros bajo 1 km', () => {
    expect(formatearDistancia(96)).toBe('96 m');
    expect(formatearDistancia(999)).toBe('999 m');
  });
  it('kilómetros con un decimal', () => {
    expect(formatearDistancia(1000)).toBe('1.0 km');
    expect(formatearDistancia(2400)).toBe('2.4 km');
  });
});

describe('prioridadProspecto', () => {
  it('talleres, ferreterías y fábricas = prioridad 1 (alta)', () => {
    expect(prioridadProspecto('car repair', 'Taller de Motos')).toBe(1);
    expect(prioridadProspecto('hardware', 'Ferreandamios J.V.')).toBe(1);
    expect(prioridadProspecto('', 'Metalurgia del Sur')).toBe(1);
    expect(prioridadProspecto('carpenter', 'Maderas Lo Mejor')).toBe(1);
  });
  it('restaurantes, droguerías y peluquerías = prioridad 2 (media)', () => {
    expect(prioridadProspecto('restaurant', 'Surtidora de Aves')).toBe(2);
    expect(prioridadProspecto('pharmacy', 'Droguería')).toBe(2);
    expect(prioridadProspecto('hairdresser', 'La Barbería')).toBe(2);
  });
  it('lo no relevante = prioridad 3 (baja)', () => {
    expect(prioridadProspecto('travel agency', 'San José')).toBe(3);
    expect(prioridadProspecto('lawyer', 'Abogados')).toBe(3);
  });
});

describe('parsearProspectosCercanos', () => {
  const fixture = {
    elements: [
      // Taller a ~0 m (alta prioridad)
      { tags: { name: 'Taller El Pino', craft: 'metal_construction' }, lat: 4.5856304, lon: -74.1354175 },
      // Restaurante un poco más lejos (media)
      { tags: { name: 'Asadero Doña Mary', amenity: 'restaurant' }, lat: 4.59, lon: -74.135 },
      // Peluquería muy cerca pero media: va después del taller por prioridad
      { tags: { name: 'Barbería W', shop: 'hairdresser' }, lat: 4.5857, lon: -74.1355 },
      // Agencia de viajes: prioridad baja -> se descarta
      { tags: { name: 'Viajes Sol', shop: 'travel_agency' }, lat: 4.5856, lon: -74.1354 },
      // Calle (descartada por TAGS_DESCARTE) aunque tenga nombre
      { tags: { name: 'Carrera 34', highway: 'primary' }, lat: 4.586, lon: -74.135 },
      // Sin coordenadas: se omite
      { tags: { name: 'Sin ubicación', shop: 'hardware' } },
      // Sin nombre: se omite
      { tags: { shop: 'hardware' }, lat: 4.585, lon: -74.135 },
    ],
  };

  it('ordena por prioridad y luego por distancia, descartando lo irrelevante', () => {
    const r = parsearProspectosCercanos(fixture, negocio);
    expect(r.map((x) => x.nombre)).toEqual(['Taller El Pino', 'Barbería W', 'Asadero Doña Mary']);
    expect(r[0].prioridad).toBe(1);
    expect(r[0].distanciaMetros).toBe(0);
    // Barbería (media, ~15 m) antes que Asadero (media, ~480 m).
    expect(r[1].distanciaMetros).toBeLessThan(r[2].distanciaMetros!);
  });

  it('cada prospecto trae distancia y prioridad', () => {
    const r = parsearProspectosCercanos(fixture, negocio);
    for (const p of r) {
      expect(typeof p.distanciaMetros).toBe('number');
      expect([1, 2]).toContain(p.prioridad);
    }
  });

  it('entrada inválida no explota', () => {
    expect(parsearProspectosCercanos(null, negocio)).toEqual([]);
    expect(parsearProspectosCercanos({}, negocio)).toEqual([]);
  });
});

describe('buscarCercaDelNegocio — usa coordenadas del negocio sin geocodificar', () => {
  it('toma el origen de config.negocioLat/Lon y no falla por la dirección', async () => {
    const { buscarCercaDelNegocio } = await import('../maps');
    const { CONFIG_DEFAULT } = await import('../config');
    // Stub de la red: cualquier llamada Overpass devuelve 0 elementos.
    const fetchOriginal = globalThis.fetch;
    globalThis.fetch = (async () =>
      ({ ok: true, json: async () => ({ elements: [] }) }) as unknown as Response) as typeof fetch;
    try {
      const r = await buscarCercaDelNegocio(CONFIG_DEFAULT, 5);
      expect(r.origen.lat).toBeCloseTo(CONFIG_DEFAULT.negocioLat as number, 4);
      expect(r.origen.lon).toBeCloseTo(CONFIG_DEFAULT.negocioLon as number, 4);
      expect(Array.isArray(r.resultados)).toBe(true);
    } finally {
      globalThis.fetch = fetchOriginal;
    }
  });
});
