import { describe, it, expect } from 'vitest';
import { parsearGooglePlaces, parsearNominatim } from '../maps';

describe('parsearNominatim', () => {
  const fixture = [
    {
      name: 'Ferretería La 13',
      display_name: 'Ferretería La 13, Calle 13 # 68-50, Puente Aranda, Bogotá, Colombia',
      type: 'hardware_store',
      class: 'shop',
      extratags: {
        phone: '+57 601 123 4567',
        website: 'https://ferreterialaa13.co',
      },
    },
  ];

  it('mapea nombre, dirección sin duplicar el nombre, teléfono y website', () => {
    const resultados = parsearNominatim(fixture);
    expect(resultados).toHaveLength(1);
    expect(resultados[0]).toEqual({
      nombre: 'Ferretería La 13',
      direccion: 'Calle 13 # 68-50, Puente Aranda, Bogotá, Colombia',
      telefono: '+57 601 123 4567',
      website: 'https://ferreterialaa13.co',
      categoria: 'hardware store',
    });
  });

  it('devuelve [] con entrada que no es array', () => {
    expect(parsearNominatim(null)).toEqual([]);
    expect(parsearNominatim({ resultados: [] })).toEqual([]);
    expect(parsearNominatim('texto')).toEqual([]);
  });

  it('omite elementos sin nombre ni display_name', () => {
    const resultados = parsearNominatim([
      { type: 'industrial', extratags: null },
      { name: '', display_name: '  ' },
      ...fixture,
    ]);
    expect(resultados).toHaveLength(1);
    expect(resultados[0].nombre).toBe('Ferretería La 13');
  });

  it('no explota con extratags null y deja teléfono/website vacíos', () => {
    const resultados = parsearNominatim([
      { name: 'Industrias Beta', display_name: 'Industrias Beta, Fontibón, Bogotá', extratags: null },
    ]);
    expect(resultados).toHaveLength(1);
    expect(resultados[0].telefono).toBe('');
    expect(resultados[0].website).toBe('');
    expect(resultados[0].direccion).toBe('Fontibón, Bogotá');
  });

  it('usa el primer tramo de display_name como nombre cuando falta name', () => {
    const resultados = parsearNominatim([
      { display_name: 'Solo Display, Kennedy, Bogotá', class: 'shop' },
    ]);
    expect(resultados[0].nombre).toBe('Solo Display');
    expect(resultados[0].categoria).toBe('shop');
  });
});

describe('parsearGooglePlaces', () => {
  const fixture = {
    places: [
      {
        displayName: { text: 'Dotaciones Industriales del Centro' },
        formattedAddress: 'Cra. 17 # 12-34, Bogotá, Colombia',
        nationalPhoneNumber: '(601) 234 5678',
        websiteUri: 'https://dotacionescentro.com',
        primaryTypeDisplayName: { text: 'Tienda de ropa de trabajo' },
      },
    ],
  };

  it('mapea los campos de Places API (New) al resultado de la app', () => {
    const resultados = parsearGooglePlaces(fixture);
    expect(resultados).toHaveLength(1);
    expect(resultados[0]).toEqual({
      nombre: 'Dotaciones Industriales del Centro',
      direccion: 'Cra. 17 # 12-34, Bogotá, Colombia',
      telefono: '(601) 234 5678',
      website: 'https://dotacionescentro.com',
      categoria: 'Tienda de ropa de trabajo',
    });
  });

  it('devuelve [] con objeto vacío o sin places', () => {
    expect(parsearGooglePlaces({})).toEqual([]);
    expect(parsearGooglePlaces(null)).toEqual([]);
    expect(parsearGooglePlaces({ places: 'no-array' })).toEqual([]);
  });

  it('omite places sin displayName.text', () => {
    const resultados = parsearGooglePlaces({
      places: [
        { formattedAddress: 'Sin nombre 1' },
        { displayName: { text: '   ' }, formattedAddress: 'Sin nombre 2' },
        ...fixture.places,
      ],
    });
    expect(resultados).toHaveLength(1);
    expect(resultados[0].nombre).toBe('Dotaciones Industriales del Centro');
  });

  it('usa internationalPhoneNumber como respaldo del teléfono', () => {
    const resultados = parsearGooglePlaces({
      places: [
        { displayName: { text: 'Solo Internacional' }, internationalPhoneNumber: '+57 300 111 2233' },
      ],
    });
    expect(resultados[0].telefono).toBe('+57 300 111 2233');
    expect(resultados[0].direccion).toBe('');
  });
});
