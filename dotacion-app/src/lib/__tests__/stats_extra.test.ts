import { describe, it, expect } from 'vitest';
import type { Empresa, EstadoEmpresa } from '../../types';
import { calcularKpis, estadisticasPorSector, seguimientosPendientes } from '../stats';

let contador = 0;
function empresa(overrides: Partial<Empresa> = {}): Empresa {
  contador += 1;
  return {
    id: `x-${contador}`,
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

describe('calcularKpis (todos los estados mezclados)', () => {
  it('una sola empresa por estado da las tasas correctas', () => {
    // 1 de cada: pendiente, enviado, respondio, cliente, rechazado.
    const kpis = calcularKpis(conEstados(['pendiente', 'enviado', 'respondio', 'cliente', 'rechazado']));
    expect(kpis.total).toBe(5);
    expect(kpis.pendientes).toBe(1);
    expect(kpis.enviadas).toBe(4); // contactadas = no pendientes
    expect(kpis.respondieron).toBe(1);
    expect(kpis.clientes).toBe(1);
    expect(kpis.rechazadas).toBe(1);
    // conRespuesta = respondio+cliente+rechazado = 3 de 4 contactadas = 75 %
    expect(kpis.tasaRespuesta).toBe(75);
    // clientes 1 de 4 = 25 %
    expect(kpis.tasaConversion).toBe(25);
  });

  it('todas pendientes: contactadas 0 y tasas 0 sin NaN', () => {
    const kpis = calcularKpis(conEstados(['pendiente', 'pendiente', 'pendiente']));
    expect(kpis.enviadas).toBe(0);
    expect(kpis.tasaRespuesta).toBe(0);
    expect(kpis.tasaConversion).toBe(0);
  });

  it('redondea la tasa de respuesta (1 de 3 = 33)', () => {
    // 1 enviado (sin respuesta) + 1 respondio + 1 enviado: contactadas=3, conRespuesta=1
    const kpis = calcularKpis(conEstados(['enviado', 'respondio', 'enviado']));
    expect(kpis.enviadas).toBe(3);
    expect(kpis.tasaRespuesta).toBe(33);
  });

  it('100 % de respuesta cuando todas las contactadas respondieron', () => {
    const kpis = calcularKpis(conEstados(['cliente', 'respondio', 'rechazado']));
    expect(kpis.tasaRespuesta).toBe(100);
  });
});

describe('estadisticasPorSector (orden y agrupación)', () => {
  it('agrupa varias empresas del mismo sector y cuenta bien', () => {
    const stats = estadisticasPorSector([
      ...conEstados(['cliente', 'respondio', 'enviado', 'pendiente'], 'metal'),
    ]);
    const metal = stats.find((s) => s.sector === 'metal')!;
    expect(metal.total).toBe(4);
    expect(metal.contactadas).toBe(3); // no pendiente
    expect(metal.respondieron).toBe(1);
    expect(metal.clientes).toBe(1);
    // conRespuesta = cliente+respondio = 2 de 3 contactadas = 67
    expect(metal.tasaRespuesta).toBe(67);
  });

  it('empata por tasa: desempata por contactadas y luego por total', () => {
    const stats = estadisticasPorSector([
      // sectorA: 100 % con 1 contactada
      ...conEstados(['cliente'], 'sectorA'),
      // sectorB: 100 % con 2 contactadas -> debe ir antes que sectorA
      ...conEstados(['cliente', 'respondio'], 'sectorB'),
    ]);
    expect(stats[0].tasaRespuesta).toBe(100);
    expect(stats[1].tasaRespuesta).toBe(100);
    expect(stats[0].sector).toBe('sectorB');
    expect(stats[1].sector).toBe('sectorA');
  });

  it('agrupa sectores en blanco bajo "Sin sector"', () => {
    const stats = estadisticasPorSector([
      empresa({ sector: '', estado: 'cliente' }),
      empresa({ sector: '   ', estado: 'enviado' }),
      empresa({ sector: '\t', estado: 'pendiente' }),
    ]);
    const sin = stats.find((s) => s.sector === 'Sin sector')!;
    expect(sin.total).toBe(3);
    expect(sin.contactadas).toBe(2);
    expect(sin.clientes).toBe(1);
  });

  it('lista vacía produce []', () => {
    expect(estadisticasPorSector([])).toEqual([]);
  });
});

describe('seguimientosPendientes (umbral exacto con ahora fijo)', () => {
  const ahora = new Date('2026-06-20T12:00:00.000Z');
  const haceDias = (n: number) => new Date(ahora.getTime() - n * 24 * 60 * 60 * 1000).toISOString();

  it('incluye la enviada justo en el umbral (5 días con dias=5)', () => {
    const e = empresa({ estado: 'enviado', fechaEnvio: haceDias(5) });
    const r = seguimientosPendientes([e], 5, ahora);
    expect(r).toHaveLength(1);
    expect(r[0].diasSinRespuesta).toBe(5);
  });

  it('excluye la que va un día por debajo del umbral', () => {
    const e = empresa({ estado: 'enviado', fechaEnvio: haceDias(4) });
    expect(seguimientosPendientes([e], 5, ahora)).toEqual([]);
  });

  it('umbral 0 incluye hasta lo enviado hoy mismo', () => {
    const e = empresa({ estado: 'enviado', fechaEnvio: haceDias(0) });
    const r = seguimientosPendientes([e], 0, ahora);
    expect(r).toHaveLength(1);
    expect(r[0].diasSinRespuesta).toBe(0);
  });

  it('ignora estados distintos de enviado aunque tengan fechaEnvio antigua', () => {
    const cliente = empresa({ estado: 'cliente', fechaEnvio: haceDias(30) });
    const pendiente = empresa({ estado: 'pendiente', fechaEnvio: haceDias(30) });
    const rechazado = empresa({ estado: 'rechazado', fechaEnvio: haceDias(30) });
    expect(seguimientosPendientes([cliente, pendiente, rechazado], 5, ahora)).toEqual([]);
  });

  it('usa el parámetro ahora (no la hora del sistema)', () => {
    const e = empresa({ estado: 'enviado', fechaEnvio: '2026-01-01T00:00:00.000Z' });
    const ahoraTarde = new Date('2026-01-11T00:00:00.000Z');
    const r = seguimientosPendientes([e], 5, ahoraTarde);
    expect(r[0].diasSinRespuesta).toBe(10);
  });
});
