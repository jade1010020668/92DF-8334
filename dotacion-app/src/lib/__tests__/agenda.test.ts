import { describe, expect, it } from 'vitest';
import { entregasDeHoy, textoDiasEntrega } from '../agenda';
import type { Pedido } from '../../types';

function pedido(parcial: Partial<Pedido>): Pedido {
  return {
    id: parcial.id ?? 'p1',
    empresaId: 'e1',
    empresaNombre: 'Empresa',
    fecha: '2026-06-01T00:00:00.000Z',
    items: [],
    estado: parcial.estado ?? 'confirmado',
    abono: 0,
    iva: 0,
    ...parcial,
  };
}

const HOY = new Date(2026, 5, 29, 10, 0, 0); // 29 jun 2026, 10am local

describe('entregasDeHoy', () => {
  it('incluye entregas de hoy', () => {
    const p = pedido({ fechaEntrega: new Date(2026, 5, 29, 18).toISOString() });
    const r = entregasDeHoy([p], HOY);
    expect(r).toHaveLength(1);
    expect(r[0].dias).toBe(0);
    expect(r[0].atrasada).toBe(false);
  });

  it('incluye entregas atrasadas y las marca', () => {
    const p = pedido({ fechaEntrega: new Date(2026, 5, 27, 9).toISOString() });
    const r = entregasDeHoy([p], HOY);
    expect(r).toHaveLength(1);
    expect(r[0].dias).toBe(-2);
    expect(r[0].atrasada).toBe(true);
  });

  it('excluye entregas futuras', () => {
    const p = pedido({ fechaEntrega: new Date(2026, 5, 30).toISOString() });
    expect(entregasDeHoy([p], HOY)).toHaveLength(0);
  });

  it('excluye pedidos ya entregados, pagados o anulados', () => {
    const fechaEntrega = new Date(2026, 5, 27).toISOString();
    expect(entregasDeHoy([pedido({ estado: 'entregado', fechaEntrega })], HOY)).toHaveLength(0);
    expect(entregasDeHoy([pedido({ estado: 'pagado', fechaEntrega })], HOY)).toHaveLength(0);
    expect(entregasDeHoy([pedido({ estado: 'anulado', fechaEntrega })], HOY)).toHaveLength(0);
  });

  it('ignora pedidos sin fecha de entrega o con fecha inválida', () => {
    expect(entregasDeHoy([pedido({ fechaEntrega: undefined })], HOY)).toHaveLength(0);
    expect(entregasDeHoy([pedido({ fechaEntrega: 'no-es-fecha' })], HOY)).toHaveLength(0);
  });

  it('ordena lo más atrasado primero', () => {
    const a = pedido({ id: 'a', fechaEntrega: new Date(2026, 5, 29).toISOString() }); // hoy
    const b = pedido({ id: 'b', fechaEntrega: new Date(2026, 5, 25).toISOString() }); // -4
    const c = pedido({ id: 'c', fechaEntrega: new Date(2026, 5, 28).toISOString() }); // -1
    const r = entregasDeHoy([a, b, c], HOY);
    expect(r.map((x) => x.pedido.id)).toEqual(['b', 'c', 'a']);
  });
});

describe('textoDiasEntrega', () => {
  it('da texto humano', () => {
    expect(textoDiasEntrega(0)).toBe('hoy');
    expect(textoDiasEntrega(-1)).toBe('ayer');
    expect(textoDiasEntrega(-3)).toBe('hace 3 días');
  });
});
