import { describe, it, expect } from 'vitest';
import {
  construirRegexBusqueda,
  distanciaMetros,
  formatearDistancia,
  normalizarUrlWeb,
  parsearGooglePlaces,
  parsearNominatim,
  parsearOverpass,
  prioridadProspecto,
} from '../maps';

describe('construirRegexBusqueda (plurales y tildes)', () => {
  it('reduce plural y deja vocales insensibles a tildes', () => {
    // "metalmecánicas" -> raíz, vocales con clases.
    const regex = construirRegexBusqueda('metalmecánicas', 'Bogotá');
    expect(new RegExp(regex, 'i').test('Metalmecánica del Norte')).toBe(true);
    expect(new RegExp(regex, 'i').test('METALMECANICA SAS')).toBe(true);
  });

  it('quita la ciudad de la consulta aunque venga sin tildes', () => {
    const regex = construirRegexBusqueda('ferreterías medellin', 'Medellín, Antioquia');
    expect(regex.split('|')).toHaveLength(1);
    expect(new RegExp(regex, 'i').test('Ferretería Central')).toBe(true);
  });

  it('descarta tokens de menos de 3 caracteres tras recortar', () => {
    // "ed" como token corto desaparece.
    const regex = construirRegexBusqueda('ed', 'Bogotá');
    expect(regex).toBe('');
  });

  it('deduplica términos repetidos', () => {
    const regex = construirRegexBusqueda('plásticos plasticos plástico', 'Bogotá');
    expect(regex.split('|')).toHaveLength(1);
  });

  it('la "ñ" se vuelve clase [nñ]', () => {
    const regex = construirRegexBusqueda('piñatas', 'Bogotá');
    expect(regex).toContain('[nñ]');
    expect(new RegExp(regex, 'i').test('Piñatería Feliz')).toBe(true);
  });
});

describe('prioridadProspecto (variedad de categorías)', () => {
  it('detecta sectores de alta necesidad de dotación', () => {
    expect(prioridadProspecto('industrial', 'Bodega Central')).toBe(1);
    expect(prioridadProspecto('shop', 'Aluminios y Vidrios')).toBe(1);
    expect(prioridadProspecto('craft', 'Carpintería La Madera')).toBe(1);
    expect(prioridadProspecto('car_repair', 'Mecánica Express')).toBe(1);
    expect(prioridadProspecto('', 'Llantas y Rines')).toBe(1);
    expect(prioridadProspecto('electrician', 'Eléctricos Bogotá')).toBe(1);
    expect(prioridadProspecto('', 'Lavadero de Autos')).toBe(1);
  });

  it('detecta sectores de necesidad media', () => {
    expect(prioridadProspecto('cafe', 'El Buen Café')).toBe(2);
    expect(prioridadProspecto('bakery', 'Panadería Trigo')).toBe(2);
    expect(prioridadProspecto('butcher', 'Carnicería La Res')).toBe(2);
    expect(prioridadProspecto('hospital', 'Clínica del Norte')).toBe(2);
    expect(prioridadProspecto('gym', 'Fitness Center')).toBe(2);
    expect(prioridadProspecto('beauty', 'Spa Relax')).toBe(2);
  });

  it('lo no relevante queda en prioridad 3', () => {
    expect(prioridadProspecto('bank', 'Banco Nacional')).toBe(3);
    expect(prioridadProspecto('library', 'Biblioteca')).toBe(3);
    expect(prioridadProspecto('', 'Notaría 5')).toBe(3);
  });

  it('alta tiene prioridad sobre media cuando ambas coinciden', () => {
    // "taller" (alta) + "restaurant" (media): debe ganar alta.
    expect(prioridadProspecto('restaurant', 'Taller Gastronómico')).toBe(1);
  });

  it('es insensible a tildes en el nombre', () => {
    expect(prioridadProspecto('', 'Mecánica Diésel')).toBe(1);
  });
});

describe('distanciaMetros (propiedades)', () => {
  const a = { lat: 4.6097, lon: -74.0817 };
  const b = { lat: 4.65, lon: -74.05 };
  const c = { lat: 4.7, lon: -74.1 };

  it('es simétrica', () => {
    expect(distanciaMetros(a, b)).toBe(distanciaMetros(b, a));
  });

  it('cumple desigualdad triangular aproximada', () => {
    const directo = distanciaMetros(a, c);
    const viaB = distanciaMetros(a, b) + distanciaMetros(b, c);
    expect(directo).toBeLessThanOrEqual(viaB + 2); // +2 m por redondeo
  });

  it('a mayor separación, mayor distancia (monótona)', () => {
    const cerca = distanciaMetros(a, { lat: a.lat + 0.001, lon: a.lon });
    const lejos = distanciaMetros(a, { lat: a.lat + 0.01, lon: a.lon });
    expect(lejos).toBeGreaterThan(cerca);
  });

  it('un grado de latitud ronda los 111 km', () => {
    const d = distanciaMetros({ lat: 0, lon: 0 }, { lat: 1, lon: 0 });
    expect(d).toBeGreaterThan(110000);
    expect(d).toBeLessThan(112000);
  });
});

describe('formatearDistancia (frontera del km)', () => {
  it('justo bajo 1000 m sigue en metros', () => {
    expect(formatearDistancia(0)).toBe('0 m');
    expect(formatearDistancia(1)).toBe('1 m');
    expect(formatearDistancia(1500)).toBe('1.5 km');
    expect(formatearDistancia(12345)).toBe('12.3 km');
  });
});

describe('normalizarUrlWeb (mayúsculas y rutas)', () => {
  it('respeta el protocolo en mayúsculas mixtas', () => {
    expect(normalizarUrlWeb('HtTpS://Empresa.CO/ruta')).toBe('HtTpS://Empresa.CO/ruta');
  });

  it('agrega https a dominios con ruta y query', () => {
    expect(normalizarUrlWeb('empresa.co/productos?id=3')).toBe('https://empresa.co/productos?id=3');
  });

  it('recorta espacios antes de evaluar el protocolo', () => {
    expect(normalizarUrlWeb('   www.x.com  ')).toBe('https://www.x.com');
  });
});

describe('parsearNominatim (más casos)', () => {
  it('prefiere contact:phone y contact:website cuando faltan los directos', () => {
    const r = parsearNominatim([
      {
        name: 'Industrias Gamma',
        display_name: 'Industrias Gamma, Bogotá',
        type: 'industrial',
        extratags: { 'contact:phone': '601 222 3333', 'contact:website': 'gamma.co' },
      },
    ]);
    expect(r[0].telefono).toBe('601 222 3333');
    expect(r[0].website).toBe('https://gamma.co');
  });

  it('usa class cuando no hay type para la categoría', () => {
    const r = parsearNominatim([
      { name: 'Sin Type', display_name: 'Sin Type, Bogotá', class: 'shop' },
    ]);
    expect(r[0].categoria).toBe('shop');
  });
});

describe('parsearGooglePlaces (más casos)', () => {
  it('normaliza el website y deja categoría vacía si falta', () => {
    const r = parsearGooglePlaces({
      places: [{ displayName: { text: 'Sin Cat' }, websiteUri: 'sincat.co' }],
    });
    expect(r[0].website).toBe('https://sincat.co');
    expect(r[0].categoria).toBe('');
  });
});

describe('parsearOverpass (más casos)', () => {
  it('exige al menos un tag de negocio: descarta lo que no lo tiene', () => {
    const r = parsearOverpass({
      elements: [
        { tags: { name: 'Solo Nombre' } },
        { tags: { name: 'Oficina X', office: 'company' } },
      ],
    });
    expect(r.map((x) => x.nombre)).toEqual(['Oficina X']);
    expect(r[0].categoria).toBe('oficina');
  });

  it('man_made=works se etiqueta como fábrica', () => {
    const r = parsearOverpass({
      elements: [{ tags: { name: 'Fábrica Z', man_made: 'works' } }],
    });
    expect(r[0].categoria).toBe('fábrica');
  });
});
