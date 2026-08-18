import type { Empresa } from '../types';

export interface KPIs {
  total: number;
  pendientes: number;
  enviadas: number;
  respondieron: number;
  clientes: number;
  rechazadas: number;
  /** % de contactadas que respondieron (respondio + cliente + rechazado sobre contactadas). */
  tasaRespuesta: number;
  /** % de contactadas que terminaron en venta. */
  tasaConversion: number;
}

/** Empresas que ya recibieron cotización (cualquier estado posterior a pendiente). */
function fueContactada(e: Empresa): boolean {
  return e.estado !== 'pendiente';
}

function respondioAlgo(e: Empresa): boolean {
  return e.estado === 'respondio' || e.estado === 'cliente' || e.estado === 'rechazado';
}

export function calcularKpis(empresas: Empresa[]): KPIs {
  const total = empresas.length;
  const pendientes = empresas.filter((e) => e.estado === 'pendiente').length;
  const respondieron = empresas.filter((e) => e.estado === 'respondio').length;
  const clientes = empresas.filter((e) => e.estado === 'cliente').length;
  const rechazadas = empresas.filter((e) => e.estado === 'rechazado').length;
  const contactadas = empresas.filter(fueContactada).length;
  const conRespuesta = empresas.filter(respondioAlgo).length;

  return {
    total,
    pendientes,
    enviadas: contactadas,
    respondieron,
    clientes,
    rechazadas,
    tasaRespuesta: contactadas > 0 ? Math.round((conRespuesta / contactadas) * 100) : 0,
    tasaConversion: contactadas > 0 ? Math.round((clientes / contactadas) * 100) : 0,
  };
}

export interface EstadisticaSector {
  sector: string;
  total: number;
  contactadas: number;
  respondieron: number;
  clientes: number;
  tasaRespuesta: number;
}

/** Estadísticas de conversión por sector, ordenadas por tasa de respuesta. */
export function estadisticasPorSector(empresas: Empresa[]): EstadisticaSector[] {
  const porSector = new Map<string, Empresa[]>();
  for (const e of empresas) {
    const sector = e.sector.trim() || 'Sin sector';
    const lista = porSector.get(sector) ?? [];
    lista.push(e);
    porSector.set(sector, lista);
  }

  const stats: EstadisticaSector[] = [];
  for (const [sector, lista] of porSector) {
    const contactadas = lista.filter(fueContactada).length;
    const conRespuesta = lista.filter(respondioAlgo).length;
    stats.push({
      sector,
      total: lista.length,
      contactadas,
      respondieron: lista.filter((e) => e.estado === 'respondio').length,
      clientes: lista.filter((e) => e.estado === 'cliente').length,
      tasaRespuesta: contactadas > 0 ? Math.round((conRespuesta / contactadas) * 100) : 0,
    });
  }

  return stats.sort(
    (a, b) => b.tasaRespuesta - a.tasaRespuesta || b.contactadas - a.contactadas || b.total - a.total,
  );
}

export interface Seguimiento {
  empresa: Empresa;
  diasSinRespuesta: number;
}

/**
 * Empresas en estado "enviado" que llevan `dias` o más días sin respuesta
 * desde el envío — candidatas a un mensaje de seguimiento.
 */
export function seguimientosPendientes(
  empresas: Empresa[],
  dias: number,
  ahora: Date = new Date(),
): Seguimiento[] {
  const msPorDia = 24 * 60 * 60 * 1000;
  const resultado: Seguimiento[] = [];
  for (const e of empresas) {
    if (e.estado !== 'enviado' || !e.fechaEnvio) continue;
    const envio = new Date(e.fechaEnvio).getTime();
    if (Number.isNaN(envio)) continue;
    const diasPasados = Math.floor((ahora.getTime() - envio) / msPorDia);
    if (diasPasados >= dias) resultado.push({ empresa: e, diasSinRespuesta: diasPasados });
  }
  return resultado.sort((a, b) => b.diasSinRespuesta - a.diasSinRespuesta);
}
