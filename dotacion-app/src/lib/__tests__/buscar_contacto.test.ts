import { describe, expect, it } from 'vitest';
import { urlBuscarContacto } from '../plantillas';

describe('urlBuscarContacto', () => {
  it('arma una búsqueda de Google Maps con nombre y dirección', () => {
    const url = urlBuscarContacto({ nombre: 'Ferretería La Esquina', direccion: 'Calle 2 # 34-10' });
    expect(url.startsWith('https://www.google.com/maps/search/?api=1&query=')).toBe(true);
    const q = decodeURIComponent(new URL(url).searchParams.get('query') ?? '');
    expect(q).toContain('Ferretería La Esquina');
    expect(q).toContain('Calle 2 # 34-10');
    expect(q).toContain('Bogotá');
  });

  it('no repite la ciudad si ya está en la dirección', () => {
    const url = urlBuscarContacto({ nombre: 'Taller Sur', direccion: 'Cra 30, Bogotá' });
    const q = decodeURIComponent(new URL(url).searchParams.get('query') ?? '');
    expect(q.match(/Bogotá/gi)?.length).toBe(1);
  });

  it('funciona sin dirección (solo nombre + ciudad)', () => {
    const url = urlBuscarContacto({ nombre: 'Metalúrgica Andina' });
    const q = decodeURIComponent(new URL(url).searchParams.get('query') ?? '');
    expect(q).toBe('Metalúrgica Andina Bogotá');
  });

  it('respeta otra ciudad', () => {
    const url = urlBuscarContacto({ nombre: 'Plásticos Cali', direccion: '' }, 'Cali');
    const q = decodeURIComponent(new URL(url).searchParams.get('query') ?? '');
    expect(q).toBe('Plásticos Cali');
  });

  it('codifica caracteres especiales de forma válida', () => {
    const url = urlBuscarContacto({ nombre: 'A & B S.A.S.', direccion: 'Cl 1 #2-3' });
    // La URL debe ser parseable y recuperar la consulta intacta.
    expect(() => new URL(url)).not.toThrow();
    const q = decodeURIComponent(new URL(url).searchParams.get('query') ?? '');
    expect(q).toContain('A & B S.A.S.');
  });
});
