import { useMemo, useState } from 'react';
import {
  CalendarClock,
  CircleDollarSign,
  FileDown,
  Pencil,
  Plus,
  ShoppingCart,
  Trash2,
  Wallet,
} from 'lucide-react';
import type { ConfigApp, Empresa, EstadoPedido, NuevoPedido, Pedido } from '../types';
import { ESTADOS_PEDIDO, ETIQUETA_ESTADO_PEDIDO, COLOR_ESTADO_PEDIDO } from '../types';
import { formatearPesos } from '../lib/plantillas';
import {
  entregasPendientes,
  resumenPedidos,
  saldoPedido,
  totalPedido,
} from '../lib/pedidos';
import { generarPdfPedido } from '../lib/pdf';
import type { MostrarToast } from '../App';
import { PedidoForm } from './PedidoForm';

interface Props {
  pedidos: Pedido[];
  empresas: Empresa[];
  config: ConfigApp;
  crearPedido: (datos: NuevoPedido) => Pedido;
  actualizarPedido: (id: string, cambios: Partial<Pedido>) => void;
  eliminarPedido: (id: string) => void;
  registrarEvento: (id: string, tipo: 'pedido', texto: string) => void;
  mostrarToast: MostrarToast;
  onIrAEmpresas: () => void;
}

function fechaCorta(iso?: string): string {
  if (!iso) return '';
  const f = new Date(iso);
  return Number.isNaN(f.getTime()) ? '' : f.toLocaleDateString('es-CO');
}

export function Pedidos({
  pedidos,
  empresas,
  config,
  crearPedido,
  actualizarPedido,
  eliminarPedido,
  registrarEvento,
  mostrarToast,
  onIrAEmpresas,
}: Props) {
  const [formAbierto, setFormAbierto] = useState(false);
  const [editando, setEditando] = useState<Pedido | null>(null);
  const [filtro, setFiltro] = useState<'todos' | EstadoPedido>('todos');

  const resumen = useMemo(() => resumenPedidos(pedidos), [pedidos]);
  const entregas = useMemo(() => entregasPendientes(pedidos), [pedidos]);
  const filtrados = useMemo(
    () => (filtro === 'todos' ? pedidos : pedidos.filter((p) => p.estado === filtro)),
    [pedidos, filtro],
  );

  const guardar = (datos: NuevoPedido, idEdicion?: string) => {
    if (idEdicion) {
      actualizarPedido(idEdicion, datos);
      mostrarToast('Pedido actualizado.', 'exito');
    } else {
      crearPedido(datos);
      registrarEvento(datos.empresaId, 'pedido', `Pedido por ${formatearPesos(totalPedido(datos))}`);
      mostrarToast('Pedido creado.', 'exito');
    }
    setFormAbierto(false);
    setEditando(null);
  };

  const eliminar = (p: Pedido) => {
    if (window.confirm(`¿Eliminar el pedido de ${p.empresaNombre}? No se puede deshacer.`)) {
      eliminarPedido(p.id);
      mostrarToast('Pedido eliminado.', 'info');
    }
  };

  const kpis = [
    {
      etiqueta: 'Ventas (entregado/pagado)',
      valor: formatearPesos(resumen.ventasTotales),
      Icono: CircleDollarSign,
      color: 'text-emerald-700',
      fondo: 'bg-emerald-50 text-emerald-700',
    },
    {
      etiqueta: 'Por cobrar',
      valor: formatearPesos(resumen.porCobrar),
      Icono: Wallet,
      color: 'text-slate-900',
      fondo: 'bg-slate-100 text-slate-700',
    },
    {
      etiqueta: 'Cotizado abierto',
      valor: formatearPesos(resumen.cotizadoAbierto),
      Icono: ShoppingCart,
      color: 'text-slate-900',
      fondo: 'bg-slate-100 text-slate-700',
    },
    {
      etiqueta: 'En proceso',
      valor: String(resumen.enProceso),
      Icono: CalendarClock,
      color: 'text-slate-900',
      fondo: 'bg-slate-100 text-slate-700',
    },
  ];

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {kpis.map(({ etiqueta, valor, Icono, color, fondo }) => (
          <div key={etiqueta} className="tarjeta flex flex-col gap-2">
            <span className={`inline-flex h-11 w-11 items-center justify-center rounded-xl ${fondo}`}>
              <Icono className="h-6 w-6" aria-hidden="true" />
            </span>
            <p className={`text-xl font-bold lg:text-2xl ${color}`}>{valor}</p>
            <p className="text-sm font-semibold text-slate-600">{etiqueta}</p>
          </div>
        ))}
      </div>

      {/* Entregas próximas/vencidas */}
      {entregas.length > 0 && (
        <div className="tarjeta border-l-4 border-amber-400">
          <h2 className="mb-2 flex items-center gap-2 text-lg font-bold text-slate-800">
            <CalendarClock className="h-5 w-5 text-amber-600" aria-hidden="true" />
            Entregas por atender
          </h2>
          <ul className="space-y-1">
            {entregas.map(({ pedido, diasParaEntrega }) => (
              <li key={pedido.id} className="flex flex-wrap justify-between gap-2 text-slate-700">
                <span className="font-semibold">{pedido.empresaNombre}</span>
                <span className={diasParaEntrega < 0 ? 'font-bold text-rose-600' : 'text-amber-700'}>
                  {diasParaEntrega < 0
                    ? `Vencida hace ${Math.abs(diasParaEntrega)} día(s)`
                    : diasParaEntrega === 0
                      ? 'Entrega hoy'
                      : `Entrega en ${diasParaEntrega} día(s)`}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Barra de acciones */}
      <div className="tarjeta flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <label htmlFor="filtro-pedido" className="font-semibold text-slate-600">
            Mostrar:
          </label>
          <select
            id="filtro-pedido"
            className="campo w-auto"
            value={filtro}
            onChange={(e) => setFiltro(e.target.value as 'todos' | EstadoPedido)}
          >
            <option value="todos">Todos los pedidos</option>
            {ESTADOS_PEDIDO.map((s) => (
              <option key={s} value={s}>
                {ETIQUETA_ESTADO_PEDIDO[s]}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          className="btn-primario"
          onClick={() => {
            if (empresas.length === 0) {
              mostrarToast('Primero agrega una empresa para crearle un pedido.', 'info');
              onIrAEmpresas();
              return;
            }
            setEditando(null);
            setFormAbierto(true);
          }}
        >
          <Plus className="h-5 w-5" aria-hidden="true" />
          Nuevo pedido
        </button>
      </div>

      {/* Lista */}
      {filtrados.length === 0 ? (
        <div className="tarjeta py-12 text-center">
          <p className="text-xl text-slate-600">
            {pedidos.length === 0
              ? 'Aún no tienes pedidos. Crea el primero cuando una empresa te confirme una compra.'
              : 'No hay pedidos con ese estado.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtrados.map((p) => {
            const saldo = saldoPedido(p);
            return (
              <div key={p.id} className="tarjeta">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-bold text-slate-800">{p.empresaNombre}</p>
                    <p className="text-sm text-slate-500">
                      {fechaCorta(p.fecha)} · {p.items.length} {p.items.length === 1 ? 'ítem' : 'ítems'}
                      {p.fechaEntrega ? ` · entrega ${fechaCorta(p.fechaEntrega)}` : ''}
                    </p>
                  </div>
                  <select
                    aria-label={`Estado del pedido de ${p.empresaNombre}`}
                    className={`cursor-pointer rounded-full border px-3 py-1.5 text-sm font-semibold ${COLOR_ESTADO_PEDIDO[p.estado]}`}
                    value={p.estado}
                    onChange={(e) => actualizarPedido(p.id, { estado: e.target.value as EstadoPedido })}
                  >
                    {ESTADOS_PEDIDO.map((s) => (
                      <option key={s} value={s}>
                        {ETIQUETA_ESTADO_PEDIDO[s]}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-x-6 gap-y-1">
                  <span className="text-lg font-bold text-slate-800">{formatearPesos(totalPedido(p))}</span>
                  {saldo > 0 ? (
                    <span className="font-semibold text-amber-700">Saldo: {formatearPesos(saldo)}</span>
                  ) : (
                    <span className="font-semibold text-emerald-700">Pagado completo</span>
                  )}
                </div>

                {p.notas && <p className="mt-1 text-sm italic text-slate-500">{p.notas}</p>}

                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="btn-secundario px-4 py-2"
                    onClick={() => generarPdfPedido(p, config)}
                  >
                    <FileDown className="h-5 w-5" aria-hidden="true" />
                    PDF
                  </button>
                  <button
                    type="button"
                    className="btn-secundario px-4 py-2"
                    onClick={() => {
                      setEditando(p);
                      setFormAbierto(true);
                    }}
                  >
                    <Pencil className="h-5 w-5" aria-hidden="true" />
                    Editar
                  </button>
                  <button
                    type="button"
                    className="btn-peligro px-4 py-2"
                    onClick={() => eliminar(p)}
                  >
                    <Trash2 className="h-5 w-5" aria-hidden="true" />
                    Eliminar
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {formAbierto && (
        <PedidoForm
          empresas={empresas}
          inicial={editando}
          catalogo={config.productos}
          onGuardar={guardar}
          onCerrar={() => {
            setFormAbierto(false);
            setEditando(null);
          }}
        />
      )}
    </div>
  );
}
