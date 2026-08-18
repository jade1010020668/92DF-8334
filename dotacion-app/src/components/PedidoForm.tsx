import { useState } from 'react';
import { Plus, Save, Trash2, X } from 'lucide-react';
import type { Empresa, EstadoPedido, ItemPedido, NuevoPedido, Pedido } from '../types';
import { ESTADOS_PEDIDO, ETIQUETA_ESTADO_PEDIDO } from '../types';
import { formatearPesos } from '../lib/plantillas';
import { ivaPedido, saldoPedido, subtotalPedido, totalPedido } from '../lib/pedidos';

interface Props {
  empresas: Empresa[];
  /** Pedido a editar; null para crear uno nuevo. */
  inicial?: Pedido | null;
  /** Empresa preseleccionada al crear (desde la ficha de una empresa). */
  empresaIdInicial?: string;
  catalogo: { nombre: string; precioDesde: number; unidad: string }[];
  onGuardar: (datos: NuevoPedido, idEdicion?: string) => void;
  onCerrar: () => void;
}

function nuevoId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `it-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function lineaVacia(): ItemPedido {
  return { id: nuevoId(), descripcion: '', cantidad: 1, precioUnitario: 0 };
}

export function PedidoForm({
  empresas,
  inicial,
  empresaIdInicial,
  catalogo,
  onGuardar,
  onCerrar,
}: Props) {
  const editando = Boolean(inicial);
  const [empresaId, setEmpresaId] = useState(inicial?.empresaId ?? empresaIdInicial ?? '');
  const [items, setItems] = useState<ItemPedido[]>(inicial?.items?.length ? inicial.items : [lineaVacia()]);
  const [estado, setEstado] = useState<EstadoPedido>(inicial?.estado ?? 'cotizado');
  const [abono, setAbono] = useState(inicial?.abono ?? 0);
  const [iva, setIva] = useState(inicial?.iva ?? 0);
  const [fechaEntrega, setFechaEntrega] = useState(inicial?.fechaEntrega?.slice(0, 10) ?? '');
  const [notas, setNotas] = useState(inicial?.notas ?? '');
  const [error, setError] = useState('');

  const pedidoPreview = { items, iva, abono };
  const subtotal = subtotalPedido(pedidoPreview);
  const valorIva = ivaPedido(pedidoPreview);
  const total = totalPedido(pedidoPreview);
  const saldo = saldoPedido(pedidoPreview);

  const cambiarItem = (id: string, cambios: Partial<ItemPedido>) =>
    setItems((actual) => actual.map((i) => (i.id === id ? { ...i, ...cambios } : i)));

  const guardar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!empresaId) {
      setError('Elige la empresa del pedido.');
      return;
    }
    const itemsLimpios = items
      .map((i) => ({ ...i, descripcion: i.descripcion.trim(), cantidad: Math.max(1, Math.round(i.cantidad)) }))
      .filter((i) => i.descripcion && i.cantidad > 0);
    if (itemsLimpios.length === 0) {
      setError('Agrega al menos un producto con descripción y cantidad.');
      return;
    }
    const ivaLimpio = Math.min(100, Math.max(0, iva));
    const totalConIva = totalPedido({ items: itemsLimpios, iva: ivaLimpio });
    if (abono > totalConIva) {
      setError(`El abono (${formatearPesos(abono)}) no puede ser mayor que el total (${formatearPesos(totalConIva)}).`);
      return;
    }
    const empresa = empresas.find((x) => x.id === empresaId);
    onGuardar(
      {
        empresaId,
        empresaNombre: empresa?.nombre ?? inicial?.empresaNombre ?? 'Empresa',
        items: itemsLimpios,
        estado,
        abono: Math.max(0, abono),
        iva: ivaLimpio,
        fechaEntrega: fechaEntrega ? new Date(fechaEntrega).toISOString() : undefined,
        notas: notas.trim() || undefined,
      },
      inicial?.id,
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-2 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={editando ? 'Editar pedido' : 'Nuevo pedido'}
    >
      <form
        onSubmit={guardar}
        className="flex max-h-[96vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        noValidate
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="text-xl font-bold text-slate-800 sm:text-2xl">
            {editando ? 'Editar pedido' : 'Nuevo pedido'}
          </h2>
          <button type="button" className="btn-icono" aria-label="Cerrar" onClick={onCerrar}>
            <X className="h-6 w-6" aria-hidden="true" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <div>
            <label htmlFor="ped-empresa" className="etiqueta">
              Empresa <span className="text-rose-600">*</span>
            </label>
            <select
              id="ped-empresa"
              className="campo"
              value={empresaId}
              onChange={(e) => setEmpresaId(e.target.value)}
              disabled={editando}
            >
              <option value="">— Elige la empresa —</option>
              {empresas.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nombre}
                </option>
              ))}
            </select>
          </div>

          {/* Líneas del pedido */}
          <div>
            <span className="etiqueta">Productos</span>
            <div className="space-y-2">
              {items.map((item) => (
                <div key={item.id} className="flex flex-wrap items-end gap-2 rounded-xl bg-slate-50 p-2">
                  <div className="min-w-[10rem] flex-1">
                    <label className="text-sm text-slate-500" htmlFor={`d-${item.id}`}>
                      Producto
                    </label>
                    <input
                      id={`d-${item.id}`}
                      className="campo"
                      list="catalogo-pedido"
                      value={item.descripcion}
                      onChange={(e) => {
                        const desc = e.target.value;
                        const enCat = catalogo.find((c) => c.nombre === desc);
                        cambiarItem(item.id, {
                          descripcion: desc,
                          ...(enCat && enCat.precioDesde > 0 ? { precioUnitario: enCat.precioDesde } : {}),
                        });
                      }}
                      placeholder="Ej: Overol 2 piezas en dril"
                    />
                  </div>
                  <div className="w-20">
                    <label className="text-sm text-slate-500" htmlFor={`c-${item.id}`}>
                      Cant.
                    </label>
                    <input
                      id={`c-${item.id}`}
                      type="number"
                      min={1}
                      className="campo"
                      value={item.cantidad}
                      onChange={(e) => cambiarItem(item.id, { cantidad: Math.max(0, Number(e.target.value) || 0) })}
                    />
                  </div>
                  <div className="w-32">
                    <label className="text-sm text-slate-500" htmlFor={`p-${item.id}`}>
                      Precio c/u
                    </label>
                    <input
                      id={`p-${item.id}`}
                      type="number"
                      min={0}
                      className="campo"
                      value={item.precioUnitario}
                      onChange={(e) =>
                        cambiarItem(item.id, { precioUnitario: Math.max(0, Number(e.target.value) || 0) })
                      }
                    />
                  </div>
                  <div className="w-28 text-right">
                    <span className="text-sm text-slate-500">Subtotal</span>
                    <p className="font-semibold text-slate-700">
                      {formatearPesos(Math.max(0, item.cantidad) * Math.max(0, item.precioUnitario))}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="btn-icono hover:bg-rose-50 hover:text-rose-600"
                    aria-label="Quitar producto"
                    onClick={() => setItems((a) => (a.length > 1 ? a.filter((i) => i.id !== item.id) : a))}
                  >
                    <Trash2 className="h-5 w-5" aria-hidden="true" />
                  </button>
                </div>
              ))}
            </div>
            <datalist id="catalogo-pedido">
              {catalogo.map((c) => (
                <option key={c.nombre} value={c.nombre} />
              ))}
            </datalist>
            <button
              type="button"
              className="btn-secundario mt-2"
              onClick={() => setItems((a) => [...a, lineaVacia()])}
            >
              <Plus className="h-5 w-5" aria-hidden="true" />
              Agregar producto
            </button>
          </div>

          {/* Total siempre visible: para anotar una venta basta con esto. */}
          <div className="rounded-2xl bg-slate-50 p-4">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal</span>
              <span>{formatearPesos(subtotal)}</span>
            </div>
            <div className="mt-2 flex justify-between border-t border-slate-200 pt-2 text-xl font-bold text-slate-800">
              <span>Total</span>
              <span>{formatearPesos(total)}</span>
            </div>
            {saldo !== total && (
              <div className="mt-1 flex justify-between font-semibold text-emerald-700">
                <span>Saldo por cobrar</span>
                <span>{formatearPesos(saldo)}</span>
              </div>
            )}
          </div>

          {/* Venta rápida: lo demás es opcional y va plegado. */}
          <details className="rounded-2xl border border-slate-200 bg-slate-50" open={editando}>
            <summary className="cursor-pointer select-none px-4 py-3 text-lg font-semibold text-slate-700">
              Más detalles (IVA, abono, entrega, notas) — opcional
            </summary>
            <div className="space-y-4 px-4 pb-4">
              <div className="flex items-center justify-between text-slate-600">
                <label htmlFor="ped-iva">IVA (%)</label>
                <input
                  id="ped-iva"
                  type="number"
                  min={0}
                  max={100}
                  className="campo w-24 text-right"
                  value={iva}
                  onChange={(e) => setIva(Math.max(0, Number(e.target.value) || 0))}
                />
              </div>
              <div className="flex justify-between text-slate-600">
                <span>IVA</span>
                <span>{formatearPesos(valorIva)}</span>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <label htmlFor="ped-abono">Abono recibido</label>
                <input
                  id="ped-abono"
                  type="number"
                  min={0}
                  className="campo w-36 text-right"
                  value={abono}
                  onChange={(e) => setAbono(Math.max(0, Number(e.target.value) || 0))}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="ped-estado" className="etiqueta">
                    Estado
                  </label>
                  <select
                    id="ped-estado"
                    className="campo"
                    value={estado}
                    onChange={(e) => setEstado(e.target.value as EstadoPedido)}
                  >
                    {ESTADOS_PEDIDO.map((s) => (
                      <option key={s} value={s}>
                        {ETIQUETA_ESTADO_PEDIDO[s]}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="ped-entrega" className="etiqueta">
                    Fecha de entrega
                  </label>
                  <input
                    id="ped-entrega"
                    type="date"
                    className="campo"
                    value={fechaEntrega}
                    onChange={(e) => setFechaEntrega(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label htmlFor="ped-notas" className="etiqueta">
                  Notas
                </label>
                <textarea
                  id="ped-notas"
                  className="campo"
                  rows={2}
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  placeholder="Tallas, color, condiciones de pago…"
                />
              </div>
            </div>
          </details>

          {error && <p className="font-semibold text-rose-600">{error}</p>}
        </div>

        <div className="flex flex-col gap-2 border-t border-slate-200 px-5 py-4 sm:flex-row sm:justify-end">
          <button type="button" className="btn-secundario" onClick={onCerrar}>
            Cancelar
          </button>
          <button type="submit" className="btn-primario">
            <Save className="h-5 w-5" aria-hidden="true" />
            {editando ? 'Guardar pedido' : 'Crear pedido'}
          </button>
        </div>
      </form>
    </div>
  );
}
