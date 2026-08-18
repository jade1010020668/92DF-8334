import { describe, expect, it } from 'vitest';
import { normalizarUrlWeb, parsearNominatim } from '../maps';

describe('normalizarUrlWeb', () => {
  it('agrega https:// cuando falta el protocolo', () => {
    expect(normalizarUrlWeb('www.plasticosandinos.com')).toBe('https://www.plasticosandinos.com');
  });

  it('respeta URLs que ya tienen protocolo', () => {
    expect(normalizarUrlWeb('https://empresa.co')).toBe('https://empresa.co');
    expect(normalizarUrlWeb('http://empresa.co')).toBe('http://empresa.co');
    expect(normalizarUrlWeb('HTTPS://empresa.co')).toBe('HTTPS://empresa.co');
  });

  it('devuelve vacío para vacío o espacios', () => {
    expect(normalizarUrlWeb('')).toBe('');
    expect(normalizarUrlWeb('   ')).toBe('');
  });
});

describe('parsearNominatim — sitios web sin protocolo', () => {
  it('los resultados quedan con URL navegable', () => {
    const resultados = parsearNominatim([
      {
        name: 'Fábrica Demo',
        display_name: 'Fábrica Demo, Calle 1, Bogotá',
        type: 'works',
        extratags: { website: 'www.fabricademo.co' },
      },
    ]);
    expect(resultados[0].website).toBe('https://www.fabricademo.co');
  });
});
