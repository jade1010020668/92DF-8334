import { useCallback } from 'react';
import type { Empresa, EstadoEmpresa, FuenteEmpresa, NuevaEmpresa } from '../types';
import { CLAVE_EMPRESAS } from '../lib/config';
import { useLocalStorageState } from './useLocalStorageState';

function generarId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Clave de deduplicación: nombre normalizado (+ dirección si existe). */
function claveDuplicado(nombre: string, direccion: string): string {
  const limpiar = (t: string) =>
    t
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '');
  return `${limpiar(nombre)}|${limpiar(direccion)}`;
}

function sanearEmpresas(guardado: unknown): Empresa[] {
  if (!Array.isArray(guardado)) return [];
  return guardado.filter(
    (e): e is Empresa => typeof e === 'object' && e !== null && typeof (e as Empresa).nombre === 'string',
  );
}

export interface ResultadoAgregar {
  agregadas: number;
  duplicadas: number;
}

interface PlanInsercion extends ResultadoAgregar {
  lista: Empresa[];
}

/** Calcula la inserción con dedup de forma pura (segura ante StrictMode). */
function planificarInsercion(
  actuales: Empresa[],
  nuevas: NuevaEmpresa[],
  fuente: FuenteEmpresa,
): PlanInsercion {
  const existentes = new Set(actuales.map((e) => claveDuplicado(e.nombre, e.direccion)));
  const aInsertar: Empresa[] = [];
  let duplicadas = 0;
  for (const nueva of nuevas) {
    const nombre = nueva.nombre.trim();
    if (!nombre) continue;
    const clave = claveDuplicado(nombre, nueva.direccion ?? '');
    if (existentes.has(clave)) {
      duplicadas++;
      continue;
    }
    existentes.add(clave);
    aInsertar.push({
      id: generarId(),
      nombre,
      sector: (nueva.sector ?? '').trim(),
      email: (nueva.email ?? '').trim(),
      telefono: (nueva.telefono ?? '').trim(),
      contacto: (nueva.contacto ?? '').trim(),
      direccion: (nueva.direccion ?? '').trim(),
      estado: nueva.estado ?? 'pendiente',
      fechaCreacion: new Date().toISOString(),
      notas: (nueva.notas ?? '').trim() || undefined,
      fuente,
    });
  }
  return {
    lista: aInsertar.length > 0 ? [...aInsertar, ...actuales] : actuales,
    agregadas: aInsertar.length,
    duplicadas,
  };
}

export interface UsoEmpresas {
  empresas: Empresa[];
  agregarEmpresas: (nuevas: NuevaEmpresa[], fuente: FuenteEmpresa) => ResultadoAgregar;
  actualizarEmpresa: (id: string, cambios: Partial<Empresa>) => void;
  cambiarEstado: (id: string, estado: EstadoEmpresa) => void;
  eliminarEmpresa: (id: string) => void;
  borrarTodo: () => void;
  /** Reemplaza toda la lista (restauración de un respaldo completo). */
  reemplazarTodo: (nuevas: Empresa[]) => void;
}

export function useEmpresas(): UsoEmpresas {
  const [empresas, setEmpresas] = useLocalStorageState<Empresa[]>(CLAVE_EMPRESAS, [], sanearEmpresas);

  const agregarEmpresas = useCallback(
    (nuevas: NuevaEmpresa[], fuente: FuenteEmpresa): ResultadoAgregar => {
      const plan = planificarInsercion(empresas, nuevas, fuente);
      setEmpresas(plan.lista);
      return { agregadas: plan.agregadas, duplicadas: plan.duplicadas };
    },
    [empresas, setEmpresas],
  );

  const actualizarEmpresa = useCallback(
    (id: string, cambios: Partial<Empresa>) => {
      setEmpresas((actuales) => actuales.map((e) => (e.id === id ? { ...e, ...cambios, id } : e)));
    },
    [setEmpresas],
  );

  const cambiarEstado = useCallback(
    (id: string, estado: EstadoEmpresa) => {
      setEmpresas((actuales) =>
        actuales.map((e) => {
          if (e.id !== id) return e;
          const ahora = new Date().toISOString();
          const cambios: Partial<Empresa> = { estado };
          if (estado === 'enviado') cambios.fechaEnvio = ahora;
          if ((estado === 'respondio' || estado === 'cliente' || estado === 'rechazado') && !e.fechaRespuesta) {
            cambios.fechaRespuesta = ahora;
          }
          return { ...e, ...cambios };
        }),
      );
    },
    [setEmpresas],
  );

  const eliminarEmpresa = useCallback(
    (id: string) => setEmpresas((actuales) => actuales.filter((e) => e.id !== id)),
    [setEmpresas],
  );

  const borrarTodo = useCallback(() => setEmpresas([]), [setEmpresas]);

  const reemplazarTodo = useCallback(
    (nuevas: Empresa[]) => setEmpresas(sanearEmpresas(nuevas)),
    [setEmpresas],
  );

  return {
    empresas,
    agregarEmpresas,
    actualizarEmpresa,
    cambiarEstado,
    eliminarEmpresa,
    borrarTodo,
    reemplazarTodo,
  };
}
