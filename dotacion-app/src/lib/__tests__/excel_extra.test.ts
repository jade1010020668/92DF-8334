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

describe('normalizarEncabezado (casos límite)', () => {
  it('colapsa cualquier separador no alfanumérico', () => {
    expect(normalizarEncabezado('Correo-Electrónico')).toBe('correoelectronico');
    expect(normalizarEncabezado('  Razón  Social  ')).toBe('razonsocial');
    expect(normalizarEncabezado('e-mail / contacto')).toBe('emailcontacto');
  });

  it('preserva dígitos', () => {
    expect(normalizarEncabezado('Teléfono 2')).toBe('telefono2');
  });

  it('cadena vacía o solo símbolos queda vacía', () => {
    expect(normalizarEncabezado('   ')).toBe('');
    expect(normalizarEncabezado('--//--')).toBe('');
  });
});

describe('filasAEmpresas — encabezados con tildes, mayúsculas y espacios', () => {
  it('mapea "Razón Social", "Celular" y "Observaciones" a sus campos', () => {
    const r = filasAEmpresas([
      { ' Razón Social ': 'Maderas El Roble', 'CELULAR': '3001112233', 'Observaciones ': 'referido' },
    ]);
    expect(r).toEqual([{ nombre: 'Maderas El Roble', telefono: '3001112233', notas: 'referido' }]);
  });

  it('acepta sinónimos variados: Industria, Móvil, Persona de contacto', () => {
    const r = filasAEmpresas([
      { Empresa: 'Tex S.A.', Industria: 'textil', 'Móvil': '3002223344', 'Persona de contacto': 'Luz' },
    ]);
    expect(r[0]).toEqual({
      nombre: 'Tex S.A.',
      sector: 'textil',
      telefono: '3002223344',
      contacto: 'Luz',
    });
  });

  it('ignora filas totalmente vacías y celdas vacías', () => {
    const r = filasAEmpresas([
      {},
      { Empresa: '', Correo: '' },
      { Empresa: 'Válida S.A.', Correo: '   ', Sector: 'plásticos' },
    ]);
    expect(r).toHaveLength(1);
    expect(r[0]).toEqual({ nombre: 'Válida S.A.', sector: 'plásticos' });
  });

  it('convierte valores numéricos (teléfono numérico) a string', () => {
    const r = filasAEmpresas([{ Empresa: 'Num S.A.', Whatsapp: 3001234567 }]);
    expect(r[0].telefono).toBe('3001234567');
    expect(typeof r[0].telefono).toBe('string');
  });

  it('descarta null y undefined en las celdas sin romper', () => {
    const r = filasAEmpresas([
      { Empresa: 'Con Nulos S.A.', Correo: null, Telefono: undefined, Sector: 'metal' },
    ]);
    expect(r[0]).toEqual({ nombre: 'Con Nulos S.A.', sector: 'metal' });
  });
});

describe('filasAEmpresas — parseo de fechas', () => {
  it('parsea fecha d/m/aaaa a ISO usando hora local de medianoche', () => {
    const r = filasAEmpresas([{ Empresa: 'F S.A.', 'Fecha envio': '5/6/2026' }]);
    const esperado = new Date(2026, 5, 5).toISOString();
    expect(r[0].fechaEnvio).toBe(esperado);
  });

  it('parsea fecha ISO directamente', () => {
    const iso = '2026-06-05T15:30:00.000Z';
    const r = filasAEmpresas([{ Empresa: 'F S.A.', 'Fecha de respuesta': iso }]);
    expect(r[0].fechaRespuesta).toBe(new Date(iso).toISOString());
  });

  it('parsea d/m/aaaa con un solo dígito en día y mes', () => {
    const r = filasAEmpresas([{ Empresa: 'F S.A.', 'fecha_envio': '1/1/2026' }]);
    expect(r[0].fechaEnvio).toBe(new Date(2026, 0, 1).toISOString());
  });

  it('ignora fechas no parseables y deja el campo ausente', () => {
    const r = filasAEmpresas([{ Empresa: 'F S.A.', 'Fecha envio': 'el martes' }]);
    expect(r[0].fechaEnvio).toBeUndefined();
  });
});

describe('filasAEmpresas — estados', () => {
  it('"no respondió" se interpreta como enviado', () => {
    const r = filasAEmpresas([{ Empresa: 'NR S.A.', Estado: 'No respondió' }]);
    expect(r[0].estado).toBe('enviado');
  });

  it('"vendido" y "venta" -> cliente', () => {
    const r = filasAEmpresas([
      { Empresa: 'A', Estado: 'vendido' },
      { Empresa: 'B', Estado: 'Venta' },
    ]);
    expect(r[0].estado).toBe('cliente');
    expect(r[1].estado).toBe('cliente');
  });

  it('"no interesado" -> rechazado', () => {
    const r = filasAEmpresas([{ Empresa: 'NI S.A.', Estado: 'No interesado' }]);
    expect(r[0].estado).toBe('rechazado');
  });

  it('reconoce el valor crudo del estado y la etiqueta legible', () => {
    const r = filasAEmpresas([
      { Empresa: 'A', Estado: 'cliente' },
      { Empresa: 'B', Estado: 'Pendiente' },
      { Empresa: 'C', Estado: 'ENVIADO' },
    ]);
    expect(r.map((e) => e.estado)).toEqual(['cliente', 'pendiente', 'enviado']);
  });

  it('estado vacío o desconocido deja el campo sin asignar', () => {
    const r = filasAEmpresas([
      { Empresa: 'A', Estado: '   ' },
      { Empresa: 'B', Estado: 'algo raro' },
    ]);
    expect(r[0].estado).toBeUndefined();
    expect(r[1].estado).toBeUndefined();
  });
});

describe('empresasAFilas (casos límite)', () => {
  it('serializa todos los campos en el orden de los encabezados', () => {
    const e = empresa({
      estado: 'cliente',
      fechaEnvio: '2026-06-05T15:30:00.000Z',
      fechaRespuesta: '2026-06-08T10:00:00.000Z',
      notas: 'cliente fiel',
    });
    const [, fila] = empresasAFilas([e]);
    expect(fila[0]).toBe('Aceros del Sur Ltda.');
    expect(fila[1]).toBe('metalmecánica');
    expect(fila[6]).toBe('Cliente');
    expect(fila[7]).toBe(new Date(e.fechaEnvio!).toLocaleDateString('es-CO'));
    expect(fila[8]).toBe(new Date(e.fechaRespuesta!).toLocaleDateString('es-CO'));
    expect(fila[9]).toBe('cliente fiel');
  });

  it('una fila de cabecera por cada empresa exportada', () => {
    const filas = empresasAFilas([empresa(), empresa({ nombre: 'Otra S.A.' })]);
    expect(filas).toHaveLength(3);
    expect(filas[2][0]).toBe('Otra S.A.');
  });

  it('fechas inválidas se exportan como cadena vacía', () => {
    const [, fila] = empresasAFilas([empresa({ fechaEnvio: 'no-valida' })]);
    expect(fila[7]).toBe('');
  });
});

describe('excel ida y vuelta (export -> reimport conceptual)', () => {
  it('un estado exportado como etiqueta se vuelve a importar al mismo estado', () => {
    const [, fila] = empresasAFilas([empresa({ estado: 'respondio' })]);
    const reimport = filasAEmpresas([
      { nombre: String(fila[0]), estado: String(fila[6]) },
    ]);
    expect(reimport[0].estado).toBe('respondio');
  });
});
