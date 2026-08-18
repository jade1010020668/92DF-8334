import { describe, expect, it } from 'vitest';
import { construirRegexBusqueda, parsearOverpass } from '../maps';

describe('construirRegexBusqueda', () => {
  it('tolera tildes, plurales y palabras de relleno', () => {
    const regex = construirRegexBusqueda('Empresas de plásticos en Bogotá', 'Bogotá, Colombia');
    expect(regex).toBe('pl[aá]st[ií]c');
    expect(new RegExp(regex, 'i').test('Plásticos de la Sabana')).toBe(true);
    expect(new RegExp(regex, 'i').test('PLASTICO Y OTROS')).toBe(true);
  });

  it('escribir sin tildes encuentra nombres con tildes', () => {
    const regex = construirRegexBusqueda('plasticos', 'Bogotá, Colombia');
    expect(new RegExp(regex, 'i').test('Plástico Industrial S.A.S.')).toBe(true);
  });

  it('combina varios términos con OR', () => {
    const regex = construirRegexBusqueda('metalmecánica soldadura', 'Bogotá');
    expect(regex.split('|')).toHaveLength(2);
    expect(new RegExp(regex, 'i').test('Taller de Soldaduras El Pino')).toBe(true);
  });

  it('devuelve vacío si solo hay relleno o ciudad', () => {
    expect(construirRegexBusqueda('empresas en Bogotá', 'Bogotá, Colombia')).toBe('');
  });

  it('solo produce caracteres seguros para la consulta Overpass', () => {
    const regex = construirRegexBusqueda('plásticos" (raros) {x}', 'Bogotá');
    expect(regex).not.toMatch(/["{}()]/);
  });
});

describe('parsearOverpass', () => {
  const fixture = {
    elements: [
      {
        tags: {
          name: 'Plásticos de la Sabana',
          shop: 'trade',
          'addr:street': 'Calle 18 Sur',
          'addr:housenumber': '12-34',
          phone: '+57 601 5550000',
          website: 'www.plasticosabana.co',
        },
      },
      { tags: { name: 'Taller Andino', craft: 'metal_construction' } },
      { tags: { name: 'Calle Plásticos', highway: 'residential' } },
      { tags: { name: 'Plásticos de la Sabana', shop: 'trade' } },
      { tags: { shop: 'trade' } },
      { tags: { name: 'Nodo suelto sin tags de negocio' } },
    ],
  };

  it('mapea, filtra calles, deduplica y exige señales de negocio', () => {
    const resultados = parsearOverpass(fixture);
    expect(resultados.map((r) => r.nombre)).toEqual(['Plásticos de la Sabana', 'Taller Andino']);
    expect(resultados[0].direccion).toBe('Calle 18 Sur 12-34');
    expect(resultados[0].telefono).toBe('+57 601 5550000');
    expect(resultados[0].website).toBe('https://www.plasticosabana.co');
    expect(resultados[1].categoria).toBe('metal construction');
  });

  it('entrada inválida no explota', () => {
    expect(parsearOverpass(null)).toEqual([]);
    expect(parsearOverpass({})).toEqual([]);
  });
});
