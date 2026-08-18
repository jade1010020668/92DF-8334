import type { Pedido } from '../types';

/** Una entrega que toca atender hoy (o que ya está atrasada). */
export interface EntregaAgenda {
  pedido: Pedido;
  /** Días hasta la entrega: 0 = hoy, negativo = atrasada (−1 = ayer). */
  dias: number;
  atrasada: boolean;
}

/** Convierte una fecha a su medianoche local (para comparar solo el día). */
function aMedianoche(fecha: Date): number {
  return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate()).getTime();
}

/**
 * Pedidos cuya entrega es hoy o ya pasó y que todavía no se entregaron
 * (estado cotizado o confirmado). Lo más atrasado primero. Sirve para el
 * panel "Para hoy" del inicio: lo que el papá tiene que cumplir hoy.
 */
export function entregasDeHoy(pedidos: Pedido[], ahora: Date = new Date()): EntregaAgenda[] {
  const hoy = aMedianoche(ahora);
  const msPorDia = 24 * 60 * 60 * 1000;
  const resultado: EntregaAgenda[] = [];
  for (const p of pedidos) {
    if (!p.fechaEntrega) continue;
    if (p.estado === 'entregado' || p.estado === 'pagado' || p.estado === 'anulado') continue;
    const fecha = new Date(p.fechaEntrega);
    if (Number.isNaN(fecha.getTime())) continue;
    const dias = Math.round((aMedianoche(fecha) - hoy) / msPorDia);
    if (dias <= 0) resultado.push({ pedido: p, dias, atrasada: dias < 0 });
  }
  return resultado.sort((a, b) => a.dias - b.dias);
}

/** Texto humano para los días de una entrega: "hoy", "ayer", "hace 3 días". */
export function textoDiasEntrega(dias: number): string {
  if (dias === 0) return 'hoy';
  if (dias === -1) return 'ayer';
  return `hace ${Math.abs(dias)} días`;
}
