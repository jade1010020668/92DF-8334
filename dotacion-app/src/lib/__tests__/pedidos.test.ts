import { describe, expect, it } from 'vitest';
import {
  entregasPendientes,
  esVenta,
  ivaPedido,
  resumenPedidos,
  saldoPedido,
  subtotalItem,
  subtotalPedido,
  totalPedido,
} from '../pedidos';
import type { ItemPedido, Pedido } from '../../types';

const item = (cantidad: number, precio: number): ItemPedido => ({
  id: Math.random().toString(36).slice(2),
  descripcion: 'Overol',
  cantidad,
  precioUnitario: precio,
});

const pedido = (over: Partial<Pedido> = {}): Pedido => ({
  id: 'p1',
  empresaId: 'e1',
  empresaNombre: 'Plásticos Andinos',
  fecha: '2026-06-01T10:00:00.000Z',
  items: [item(10, 50000)],
  estado: 'cotizado',
  abono: 0,
  iva: 0,
  ...over,
});

describe('cálculos de un pedido', () => {
  it('subtotalItem multiplica cantidad por precio, ignora negativos', () => {
    expect(subtotalItem(item(10, 50000))).toBe(500000);
    expect(subtotalItem(item(-5, 50000))).toBe(0);
    expect(subtotalItem(item(3, -10))).toBe(0);
  });

  it('subtotalPedido suma todas las líneas', () => {
    expect(subtotalPedido({ items: [item(10, 50000), item(2, 30000)] })).toBe(560000);
  });

  it('subtotalPedido tolera NaN en cantidad/precio', () => {
    expect(subtotalPedido({ items: [item(Number.NaN, 50000), item(2, 30000)] })).toBe(60000);
  });

  it('ivaPedido aplica el porcentaje y redondea', () => {
    expect(ivaPedido({ items: [item(10, 50000)], iva: 19 })).toBe(95000);
    expect(ivaPedido({ items: [item(10, 50000)], iva: 0 })).toBe(0);
    expect(ivaPedido({ items: [item(10, 50000)] })).toBe(0);
  });

  it('totalPedido = subtotal + IVA', () => {
    expect(totalPedido({ items: [item(10, 50000)], iva: 19 })).toBe(595000);
  });

  it('saldoPedido = total − abono, nunca negativo', () => {
    expect(saldoPedido({ items: [item(10, 50000)], iva: 0, abono: 200000 })).toBe(300000);
    expect(saldoPedido({ items: [item(10, 50000)], iva: 0, abono: 999999999 })).toBe(0);
    expect(saldoPedido({ items: [item(10, 50000)], iva: 0 })).toBe(500000);
  });

  it('esVenta solo para entregado o pagado', () => {
    expect(esVenta({ estado: 'entregado' })).toBe(true);
    expect(esVenta({ estado: 'pagado' })).toBe(true);
    expect(esVenta({ estado: 'cotizado' })).toBe(false);
    expect(esVenta({ estado: 'confirmado' })).toBe(false);
    expect(esVenta({ estado: 'anulado' })).toBe(false);
  });
});

describe('resumenPedidos', () => {
  it('agrega ventas, por cobrar, cotizado y en proceso; ignora anulados', () => {
    const r = resumenPedidos([
      pedido({ id: 'a', estado: 'pagado', items: [item(10, 50000)], abono: 500000 }),
      pedido({ id: 'b', estado: 'entregado', items: [item(2, 100000)], abono: 50000 }), // saldo 150000
      pedido({ id: 'c', estado: 'cotizado', items: [item(1, 80000)] }),
      pedido({ id: 'd', estado: 'confirmado', items: [item(4, 25000)] }),
      pedido({ id: 'e', estado: 'anulado', items: [item(99, 99999)] }),
    ]);
    expect(r.totalPedidos).toBe(4); // sin el anulado
    expect(r.ventasTotales).toBe(500000 + 200000);
    expect(r.porCobrar).toBe(150000 + 80000 + 100000); // entregado con saldo + cotizado + confirmado
    expect(r.cotizadoAbierto).toBe(80000);
    expect(r.enProceso).toBe(1);
  });

  it('lista vacía => todo en cero', () => {
    const r = resumenPedidos([]);
    expect(r).toEqual({ totalPedidos: 0, ventasTotales: 0, porCobrar: 0, enProceso: 0, cotizadoAbierto: 0 });
  });
});

describe('entregasPendientes', () => {
  const hoy = new Date('2026-06-15T12:00:00.000Z');
  it('incluye entregas dentro de 3 días o vencidas, no las entregadas', () => {
    const pedidos = [
      pedido({ id: 'hoy', estado: 'confirmado', fechaEntrega: '2026-06-15T00:00:00.000Z' }),
      pedido({ id: 'manana', estado: 'confirmado', fechaEntrega: '2026-06-16T00:00:00.000Z' }),
      pedido({ id: 'lejos', estado: 'confirmado', fechaEntrega: '2026-06-30T00:00:00.000Z' }),
      pedido({ id: 'vencida', estado: 'confirmado', fechaEntrega: '2026-06-10T00:00:00.000Z' }),
      pedido({ id: 'entregada', estado: 'entregado', fechaEntrega: '2026-06-15T00:00:00.000Z' }),
      pedido({ id: 'sinfecha', estado: 'confirmado' }),
    ];
    const r = entregasPendientes(pedidos, hoy);
    const ids = r.map((x) => x.pedido.id);
    expect(ids).toContain('hoy');
    expect(ids).toContain('manana');
    expect(ids).toContain('vencida');
    expect(ids).not.toContain('lejos');
    expect(ids).not.toContain('entregada');
    expect(ids).not.toContain('sinfecha');
    // La vencida (días negativos) va primero por orden ascendente.
    expect(r[0].pedido.id).toBe('vencida');
    expect(r[0].diasParaEntrega).toBeLessThan(0);
  });
});
