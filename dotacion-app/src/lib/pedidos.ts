import type { ItemPedido, Pedido } from '../types';

/** Subtotal de una línea: cantidad × precio unitario. */
export function subtotalItem(item: ItemPedido): number {
  const c = Number.isFinite(item.cantidad) ? item.cantidad : 0;
  const p = Number.isFinite(item.precioUnitario) ? item.precioUnitario : 0;
  return Math.max(0, c) * Math.max(0, p);
}

/** Subtotal del pedido (suma de líneas, sin IVA). */
export function subtotalPedido(pedido: Pick<Pedido, 'items'>): number {
  return pedido.items.reduce((acc, i) => acc + subtotalItem(i), 0);
}

/** Valor del IVA del pedido. */
export function ivaPedido(pedido: { items: ItemPedido[]; iva?: number }): number {
  const iva = Number.isFinite(pedido.iva) ? Math.max(0, pedido.iva as number) : 0;
  return Math.round((subtotalPedido(pedido) * iva) / 100);
}

/** Total del pedido (subtotal + IVA). */
export function totalPedido(pedido: { items: ItemPedido[]; iva?: number }): number {
  return subtotalPedido(pedido) + ivaPedido(pedido);
}

/** Saldo pendiente de cobro (total − abono), nunca negativo. */
export function saldoPedido(pedido: { items: ItemPedido[]; iva?: number; abono?: number }): number {
  const abono = Number.isFinite(pedido.abono) ? Math.max(0, pedido.abono as number) : 0;
  return Math.max(0, totalPedido(pedido) - abono);
}

/** ¿El pedido cuenta como venta cerrada (entregado o pagado)? */
export function esVenta(pedido: Pick<Pedido, 'estado'>): boolean {
  return pedido.estado === 'entregado' || pedido.estado === 'pagado';
}

export interface ResumenPedidos {
  totalPedidos: number;
  /** Suma del total de los pedidos que son venta (entregado/pagado). */
  ventasTotales: number;
  /** Suma de saldos pendientes de cobro de pedidos no anulados. */
  porCobrar: number;
  /** Pedidos confirmados aún no entregados. */
  enProceso: number;
  /** Valor de los pedidos solo cotizados (oportunidades abiertas). */
  cotizadoAbierto: number;
}

/** KPIs de la cartera de pedidos (puro). */
export function resumenPedidos(pedidos: Pedido[]): ResumenPedidos {
  let ventasTotales = 0;
  let porCobrar = 0;
  let enProceso = 0;
  let cotizadoAbierto = 0;
  for (const p of pedidos) {
    if (p.estado === 'anulado') continue;
    if (esVenta(p)) ventasTotales += totalPedido(p);
    if (p.estado !== 'pagado') porCobrar += saldoPedido(p);
    if (p.estado === 'confirmado') enProceso += 1;
    if (p.estado === 'cotizado') cotizadoAbierto += totalPedido(p);
  }
  return {
    totalPedidos: pedidos.filter((p) => p.estado !== 'anulado').length,
    ventasTotales,
    porCobrar,
    enProceso,
    cotizadoAbierto,
  };
}

/** Entregas comprometidas para hoy o ya vencidas (no entregadas ni pagadas). */
export function entregasPendientes(
  pedidos: Pedido[],
  ahora: Date = new Date(),
): { pedido: Pedido; diasParaEntrega: number }[] {
  const msDia = 24 * 60 * 60 * 1000;
  const hoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate()).getTime();
  const res: { pedido: Pedido; diasParaEntrega: number }[] = [];
  for (const p of pedidos) {
    if (!p.fechaEntrega) continue;
    if (p.estado === 'entregado' || p.estado === 'pagado' || p.estado === 'anulado') continue;
    const entrega = new Date(p.fechaEntrega).getTime();
    if (Number.isNaN(entrega)) continue;
    const dias = Math.round((entrega - hoy) / msDia);
    if (dias <= 3) res.push({ pedido: p, diasParaEntrega: dias });
  }
  return res.sort((a, b) => a.diasParaEntrega - b.diasParaEntrega);
}
