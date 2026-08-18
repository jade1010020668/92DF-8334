import { useCallback } from 'react';
import type { Pedido, NuevoPedido } from '../types';
import { CLAVE_PEDIDOS } from '../lib/config';
import { useLocalStorageState } from './useLocalStorageState';

function generarId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `ped-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function sanearPedidos(guardado: unknown): Pedido[] {
  if (!Array.isArray(guardado)) return [];
  return guardado.filter(
    (p): p is Pedido =>
      typeof p === 'object' &&
      p !== null &&
      typeof (p as Pedido).id === 'string' &&
      Array.isArray((p as Pedido).items),
  );
}

export interface UsoPedidos {
  pedidos: Pedido[];
  crearPedido: (datos: NuevoPedido) => Pedido;
  actualizarPedido: (id: string, cambios: Partial<Pedido>) => void;
  eliminarPedido: (id: string) => void;
  pedidosDeEmpresa: (empresaId: string) => Pedido[];
  reemplazarPedidos: (nuevos: Pedido[]) => void;
}

export function usePedidos(): UsoPedidos {
  const [pedidos, setPedidos] = useLocalStorageState<Pedido[]>(CLAVE_PEDIDOS, [], sanearPedidos);

  const crearPedido = useCallback(
    (datos: NuevoPedido): Pedido => {
      const pedido: Pedido = {
        id: generarId(),
        empresaId: datos.empresaId,
        empresaNombre: datos.empresaNombre,
        fecha: new Date().toISOString(),
        items: datos.items,
        estado: datos.estado ?? 'cotizado',
        abono: datos.abono ?? 0,
        iva: datos.iva ?? 0,
        fechaEntrega: datos.fechaEntrega,
        notas: datos.notas,
      };
      setPedidos((actuales) => [pedido, ...actuales]);
      return pedido;
    },
    [setPedidos],
  );

  const actualizarPedido = useCallback(
    (id: string, cambios: Partial<Pedido>) => {
      setPedidos((actuales) => actuales.map((p) => (p.id === id ? { ...p, ...cambios, id } : p)));
    },
    [setPedidos],
  );

  const eliminarPedido = useCallback(
    (id: string) => setPedidos((actuales) => actuales.filter((p) => p.id !== id)),
    [setPedidos],
  );

  const pedidosDeEmpresa = useCallback(
    (empresaId: string) => pedidos.filter((p) => p.empresaId === empresaId),
    [pedidos],
  );

  const reemplazarPedidos = useCallback(
    (nuevos: Pedido[]) => setPedidos(sanearPedidos(nuevos)),
    [setPedidos],
  );

  return { pedidos, crearPedido, actualizarPedido, eliminarPedido, pedidosDeEmpresa, reemplazarPedidos };
}
