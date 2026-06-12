import { describe, it, expect } from 'vitest';
import type { Empresa, EstadoEmpresa } from '../../types';
import { calcularKpis, estadisticasPorSector, seguimientosPendientes } from '../stats';

let contador = 0;

function empresa(overrides: Partial<Empresa> = {}): Empresa {
  contador += 1;
  return {
    id: `emp-${contador}`,
    nombre: `Empresa ${contador}`,
    sector: 'plásticos',
    email: '',
    telefono: '',
    contacto: '',
    direccion: '',
    estado: 'pendiente',
    fechaCreacion: '2026-06-01T10:00:00.000Z',
    fuente: 'manual',
    ...overrides,
  };
}

function conEstados(estados: EstadoEmpresa[], sector = 'plásticos'): Empresa[] {
  return estados.map((estado) => empresa({ estado, sector }));
}

describe('calcularKpis', () => {
  it('cuenta totales y estados con una mezcla realista', () => {
    // 2 pendientes, 2 enviadas, 1 respondió, 2 clientes, 1 rechazada = 8
    const kpis = calcularKpis(
      conEstados([
        'pendiente',
        'pendiente',
        'enviado',
        'enviado',
        'respondio',
        'cliente',
        'cliente',
        'rechazado',
      ]),
    );
    expect(kpis.total).toBe(8);
    expect(kpis.pendientes).toBe(2);
    // enviadas = todas las no-pendientes (contactadas)
    expect(kpis.enviadas).toBe(6);
    expect(kpis.respondieron).toBe(1);
    expect(kpis.clientes).toBe(2);
    expect(kpis.rechazadas).toBe(1);
    // 4 con respuesta (respondio+cliente+rechazado) de 6 contactadas = 66.67 -> 67
    expect(kpis.tasaRespuesta).toBe(67);
    // 2 clientes de 6 contactadas = 33.33 -> 33
    expect(kpis.tasaConversion).toBe(33);
  });

  it('devuelve todo en 0 con lista vacía, sin NaN', () => {
    const kpis = calcularKpis([]);
    expect(kpis).toEqual({
      total: 0,
      pendientes: 0,
      enviadas: 0,
      respondieron: 0,
      clientes: 0,
      rechazadas: 0,
      tasaRespuesta: 0,
      tasaConversion: 0,
    });
    expect(Number.isNaN(kpis.tasaRespuesta)).toBe(false);
    expect(Number.isNaN(kpis.tasaConversion)).toBe(false);
  });
});

describe('estadisticasPorSector', () => {
  it('agrupa por sector y manda las empresas sin sector a "Sin sector"', () => {
    const stats = estadisticasPorSector([
      empresa({ sector: 'plásticos', estado: 'cliente' }),
      empresa({ sector: 'plásticos', estado: 'enviado' }),
      empresa({ sector: '   ', estado: 'pendiente' }),
      empresa({ sector: '', estado: 'pendiente' }),
    ]);
    expect(stats).toHaveLength(2);
    const plasticos = stats.find((s) => s.sector === 'plásticos');
    const sinSector = stats.find((s) => s.sector === 'Sin sector');
    expect(plasticos).toMatchObject({ total: 2, contactadas: 2, clientes: 1, tasaRespuesta: 50 });
    expect(sinSector).toMatchObject({ total: 2, contactadas: 0, tasaRespuesta: 0 });
  });

  it('ordena por tasa de respuesta descendente', () => {
    const stats = estadisticasPorSector([
      // metalmecánica: 1 de 2 contactadas respondió -> 50 %
      ...conEstados(['respondio', 'enviado'], 'metalmecánica'),
      // alimentos: 2 de 2 contactadas respondieron -> 100 %
      ...conEstados(['cliente', 'respondio'], 'alimentos'),
      // textil: 0 contactadas -> 0 %
      ...conEstados(['pendiente'], 'textil'),
    ]);
    expect(stats.map((s) => s.sector)).toEqual(['alimentos', 'metalmecánica', 'textil']);
    expect(stats.map((s) => s.tasaRespuesta)).toEqual([100, 50, 0]);
  });
});

describe('seguimientosPendientes', () => {
  const ahora = new Date('2026-06-12T12:00:00.000Z');
  const haceDias = (n: number) => new Date(ahora.getTime() - n * 24 * 60 * 60 * 1000).toISOString();

  it('incluye la enviada hace 7 días con umbral de 5 y calcula diasSinRespuesta', () => {
    const e = empresa({ estado: 'enviado', fechaEnvio: haceDias(7) });
    const resultado = seguimientosPendientes([e], 5, ahora);
    expect(resultado).toHaveLength(1);
    expect(resultado[0].empresa.id).toBe(e.id);
    expect(resultado[0].diasSinRespuesta).toBe(7);
  });

  it('excluye la enviada hace 2 días con umbral de 5', () => {
    const e = empresa({ estado: 'enviado', fechaEnvio: haceDias(2) });
    expect(seguimientosPendientes([e], 5, ahora)).toEqual([]);
  });

  it('nunca incluye empresas que ya respondieron', () => {
    const e = empresa({ estado: 'respondio', fechaEnvio: haceDias(30) });
    expect(seguimientosPendientes([e], 5, ahora)).toEqual([]);
  });

  it('excluye enviadas sin fechaEnvio y no explota con fecha inválida', () => {
    const sinFecha = empresa({ estado: 'enviado', fechaEnvio: undefined });
    const fechaRota = empresa({ estado: 'enviado', fechaEnvio: 'no-es-una-fecha' });
    expect(seguimientosPendientes([sinFecha, fechaRota], 5, ahora)).toEqual([]);
  });

  it('ordena por días sin respuesta descendente', () => {
    const a = empresa({ estado: 'enviado', fechaEnvio: haceDias(6) });
    const b = empresa({ estado: 'enviado', fechaEnvio: haceDias(15) });
    const c = empresa({ estado: 'enviado', fechaEnvio: haceDias(9) });
    const resultado = seguimientosPendientes([a, b, c], 5, ahora);
    expect(resultado.map((s) => s.diasSinRespuesta)).toEqual([15, 9, 6]);
    expect(resultado.map((s) => s.empresa.id)).toEqual([b.id, c.id, a.id]);
  });
});
