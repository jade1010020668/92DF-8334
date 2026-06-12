import { describe, it, expect } from 'vitest';
import type { Empresa } from '../../types';
import { empresasAFilas, filasAEmpresas, normalizarEncabezado } from '../excel';

function empresa(overrides: Partial<Empresa> = {}): Empresa {
  return {
    id: 'emp-1',
    nombre: 'Aceros del Sur Ltda.',
    sector: 'metalmecánica',
    email: 'info@acerosdelsur.com',
    telefono: '3009876543',
    contacto: 'Jorge Rivas',
    direccion: 'Autopista Sur # 61-20',
    estado: 'pendiente',
    fechaCreacion: '2026-06-01T10:00:00.000Z',
    fuente: 'excel',
    ...overrides,
  };
}

describe('normalizarEncabezado', () => {
  it('quita espacios, tildes y mayúsculas', () => {
    expect(normalizarEncabezado('Teléfono ')).toBe('telefono');
    expect(normalizarEncabezado('DIRECCIÓN')).toBe('direccion');
    expect(normalizarEncabezado('Persona de Contacto')).toBe('personadecontacto');
  });
});

describe('filasAEmpresas', () => {
  it('mapea sinónimos de columnas a los campos de la empresa', () => {
    const filas = [
      {
        Empresa: 'Textiles Lina',
        Correo: 'lina@textiles.co',
        Celular: '3001112233',
        Observaciones: 'cliente referido',
      },
      { 'Razón Social': 'Calzado Bogotá S.A.' },
    ];
    const resultado = filasAEmpresas(filas);
    expect(resultado).toHaveLength(2);
    expect(resultado[0]).toEqual({
      nombre: 'Textiles Lina',
      email: 'lina@textiles.co',
      telefono: '3001112233',
      notas: 'cliente referido',
    });
    expect(resultado[1].nombre).toBe('Calzado Bogotá S.A.');
  });

  it('ignora filas sin nombre', () => {
    const resultado = filasAEmpresas([
      { Correo: 'sin-nombre@x.com', Telefono: '3000000000' },
      { Empresa: '   ' },
      { Empresa: 'Con Nombre S.A.S.' },
    ]);
    expect(resultado).toHaveLength(1);
    expect(resultado[0].nombre).toBe('Con Nombre S.A.S.');
  });

  it('ignora columnas desconocidas', () => {
    const resultado = filasAEmpresas([
      { Empresa: 'Alfa Ltda.', 'Columna Rara': 'no debería entrar', NIT: '900123456' },
    ]);
    expect(resultado[0]).toEqual({ nombre: 'Alfa Ltda.' });
  });

  it('parsea estados con etiqueta legible y sinónimos de venta', () => {
    const resultado = filasAEmpresas([
      { Empresa: 'Beta S.A.', Estado: 'Respondió' },
      { Empresa: 'Gamma S.A.', Estado: 'venta' },
      { Empresa: 'Delta S.A.', Estado: 'estado inventado' },
    ]);
    expect(resultado[0].estado).toBe('respondio');
    expect(resultado[1].estado).toBe('cliente');
    expect(resultado[2].estado).toBeUndefined();
  });

  it('convierte teléfonos numéricos a string', () => {
    const resultado = filasAEmpresas([{ Empresa: 'Numérica S.A.', Telefono: 3001234567 }]);
    expect(resultado[0].telefono).toBe('3001234567');
    expect(typeof resultado[0].telefono).toBe('string');
  });
});

describe('empresasAFilas', () => {
  it('pone los encabezados en la primera fila', () => {
    const filas = empresasAFilas([]);
    expect(filas).toHaveLength(1);
    expect(filas[0]).toEqual([
      'nombre',
      'sector',
      'email',
      'telefono',
      'contacto',
      'direccion',
      'estado',
      'fecha_envio',
      'fecha_respuesta',
      'notas',
    ]);
  });

  it('exporta el estado con etiqueta legible y las fechas como fecha corta', () => {
    const isoEnvio = '2026-06-05T15:30:00.000Z';
    const filas = empresasAFilas([
      empresa({ estado: 'pendiente', fechaEnvio: isoEnvio, fechaRespuesta: undefined, notas: undefined }),
    ]);
    const fila = filas[1];
    expect(fila[0]).toBe('Aceros del Sur Ltda.');
    expect(fila[6]).toBe('Pendiente');
    // Misma conversión que la implementación, para no depender de la zona horaria del runner.
    expect(fila[7]).toBe(new Date(isoEnvio).toLocaleDateString('es-CO'));
    expect(fila[8]).toBe(''); // sin fechaRespuesta -> vacío
    expect(fila[9]).toBe(''); // notas undefined -> vacío
  });
});
