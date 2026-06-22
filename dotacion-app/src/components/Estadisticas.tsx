import { Building2, CircleDollarSign, Lightbulb, Reply, Send, Trophy, Wallet } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Empresa, Pedido } from '../types';
import { calcularKpis, estadisticasPorSector } from '../lib/stats';
import { resumenPedidos } from '../lib/pedidos';
import { formatearPesos } from '../lib/plantillas';

interface Props {
  empresas: Empresa[];
  pedidos?: Pedido[];
}

interface PasoEmbudo {
  etiqueta: string;
  valor: number;
  Icono: LucideIcon;
  color: string;
}

export function Estadisticas({ empresas, pedidos = [] }: Props) {
  const kpis = calcularKpis(empresas);
  const stats = estadisticasPorSector(empresas);
  const mejorSector = stats[0];
  const ventas = resumenPedidos(pedidos);

  const embudo: PasoEmbudo[] = [
    { etiqueta: 'Empresas en total', valor: kpis.total, Icono: Building2, color: 'text-blue-700' },
    { etiqueta: 'Contactadas', valor: kpis.enviadas, Icono: Send, color: 'text-indigo-600' },
    {
      etiqueta: 'Respondieron',
      valor: kpis.respondieron + kpis.clientes,
      Icono: Reply,
      color: 'text-emerald-600',
    },
    { etiqueta: 'Clientes', valor: kpis.clientes, Icono: Trophy, color: 'text-green-700' },
  ];

  return (
    <div className="space-y-6">
      {/* Embudo */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {embudo.map(({ etiqueta, valor, Icono, color }, i) => (
          <div key={etiqueta} className="tarjeta relative flex flex-col gap-1">
            <Icono className={`h-7 w-7 ${color}`} aria-hidden="true" />
            <p className={`text-3xl font-bold lg:text-4xl ${color}`}>{valor}</p>
            <p className="font-semibold text-slate-600">
              {i > 0 && <span aria-hidden="true">→ </span>}
              {etiqueta}
            </p>
          </div>
        ))}
      </div>

      {/* Ventas (pedidos) */}
      {pedidos.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
          <div className="tarjeta flex items-center gap-4">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-green-100 text-green-700">
              <CircleDollarSign className="h-7 w-7" aria-hidden="true" />
            </span>
            <div>
              <p className="text-2xl font-bold text-green-700">{formatearPesos(ventas.ventasTotales)}</p>
              <p className="font-semibold text-slate-600">Ventas cerradas</p>
            </div>
          </div>
          <div className="tarjeta flex items-center gap-4">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
              <Wallet className="h-7 w-7" aria-hidden="true" />
            </span>
            <div>
              <p className="text-2xl font-bold text-amber-600">{formatearPesos(ventas.porCobrar)}</p>
              <p className="font-semibold text-slate-600">Por cobrar</p>
            </div>
          </div>
        </div>
      )}

      {/* Tasas */}
      <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
        <div className="tarjeta text-center">
          <p className="text-5xl font-bold text-emerald-600">{kpis.tasaRespuesta}%</p>
          <p className="mt-2 text-xl font-semibold text-slate-700">Tasa de respuesta</p>
          <p className="text-slate-500">De cada 100 empresas contactadas, cuántas te contestan.</p>
        </div>
        <div className="tarjeta text-center">
          <p className="text-5xl font-bold text-blue-700">{kpis.tasaConversion}%</p>
          <p className="mt-2 text-xl font-semibold text-slate-700">Tasa de conversión</p>
          <p className="text-slate-500">De cada 100 empresas contactadas, cuántas se vuelven clientes.</p>
        </div>
      </div>

      {/* Sectores */}
      <section className="tarjeta">
        <h2 className="mb-4 text-xl font-bold text-slate-800">¿Qué sectores responden mejor?</h2>

        {kpis.enviadas === 0 ? (
          <p className="text-lg text-slate-600">
            Cuando envíes tus primeras cotizaciones, aquí verás qué sectores responden más.
          </p>
        ) : (
          <>
            {mejorSector && mejorSector.contactadas >= 3 && (
              <div className="mb-5 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                <Lightbulb className="mt-0.5 h-6 w-6 shrink-0 text-emerald-600" aria-hidden="true" />
                <p className="text-lg text-emerald-900">
                  💡 El sector que mejor te responde es <strong>{mejorSector.sector}</strong> (
                  {mejorSector.tasaRespuesta}%). Vale la pena buscar más empresas de ese sector.
                </p>
              </div>
            )}

            <ul className="space-y-4">
              {stats.map((s) => (
                <li key={s.sector}>
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                    <p className="text-lg font-bold text-slate-800">{s.sector}</p>
                    <p className="text-sm text-slate-500">
                      {s.total} {s.total === 1 ? 'empresa' : 'empresas'} · {s.contactadas} contactadas ·{' '}
                      {s.respondieron} respondieron · {s.clientes} clientes
                    </p>
                  </div>
                  <div className="mt-1 flex items-center gap-3">
                    <div className="h-3 flex-1 overflow-hidden rounded bg-slate-100">
                      <div
                        className="h-3 rounded bg-emerald-500"
                        style={{ width: `${s.tasaRespuesta}%` }}
                      />
                    </div>
                    <span className="w-12 text-right font-bold text-slate-700">{s.tasaRespuesta}%</span>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </div>
  );
}
