import { useCallback } from 'react';
import type { Empresa, EstadoEmpresa, EventoHistorial, FuenteEmpresa, NuevaEmpresa } from '../types';
import { ETIQUETA_ESTADO } from '../types';
import { CLAVE_EMPRESAS } from '../lib/config';
import { useLocalStorageState } from './useLocalStorageState';

function generarId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Antepone un evento al historial (lo más reciente primero, máx. 100). */
function agregarEvento(
  historial: EventoHistorial[] | undefined,
  tipo: EventoHistorial['tipo'],
  texto: string,
): EventoHistorial[] {
  const evento: EventoHistorial = { id: generarId(), fecha: new Date().toISOString(), tipo, texto };
  return [evento, ...(historial ?? [])].slice(0, 100);
}

/** Normaliza nombre/dirección para comparar duplicados. */
function limpiarClave(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
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
  // nombre normalizado → direcciones normalizadas conocidas. Si cualquiera de
  // las dos direcciones está vacía, basta el nombre para considerarla repetida.
  const porNombre = new Map<string, string[]>();
  const registrar = (nombre: string, direccion: string) => {
    const lista = porNombre.get(nombre) ?? [];
    lista.push(direccion);
    porNombre.set(nombre, lista);
  };
  const esDuplicada = (nombre: string, direccion: string): boolean => {
    const direcciones = porNombre.get(nombre);
    if (!direcciones) return false;
    return direccion === '' || direcciones.some((d) => d === '' || d === direccion);
  };
  for (const e of actuales) registrar(limpiarClave(e.nombre), limpiarClave(e.direccion));

  const aInsertar: Empresa[] = [];
  let duplicadas = 0;
  for (const nueva of nuevas) {
    const nombre = nueva.nombre.trim();
    if (!nombre) continue;
    const claveNombre = limpiarClave(nombre);
    const claveDir = limpiarClave(nueva.direccion ?? '');
    if (esDuplicada(claveNombre, claveDir)) {
      duplicadas++;
      continue;
    }
    registrar(claveNombre, claveDir);

    const ahora = new Date().toISOString();
    const estado = nueva.estado ?? 'pendiente';
    // Una empresa importada como ya contactada necesita fechas para que
    // seguimientos y estadísticas la vean.
    let fechaEnvio = nueva.fechaEnvio;
    let fechaRespuesta = nueva.fechaRespuesta;
    if (estado !== 'pendiente' && !fechaEnvio) fechaEnvio = ahora;
    if ((estado === 'respondio' || estado === 'cliente' || estado === 'rechazado') && !fechaRespuesta) {
      fechaRespuesta = ahora;
    }

    aInsertar.push({
      id: generarId(),
      nombre,
      sector: (nueva.sector ?? '').trim(),
      email: (nueva.email ?? '').trim(),
      telefono: (nueva.telefono ?? '').trim(),
      contacto: (nueva.contacto ?? '').trim(),
      direccion: (nueva.direccion ?? '').trim(),
      estado,
      fechaCreacion: ahora,
      fechaEnvio,
      fechaRespuesta,
      notas: (nueva.notas ?? '').trim() || undefined,
      fuente,
      lat: typeof nueva.lat === 'number' ? nueva.lat : undefined,
      lon: typeof nueva.lon === 'number' ? nueva.lon : undefined,
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
  /** Anota un evento en el historial de gestión de una empresa. */
  registrarEvento: (id: string, tipo: EventoHistorial['tipo'], texto: string) => void;
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
          if (estado === 'pendiente') {
            // Retroceder a pendiente limpia la historia para no falsear reportes.
            cambios.fechaEnvio = undefined;
            cambios.fechaRespuesta = undefined;
          }
          if (estado === 'enviado') {
            cambios.fechaEnvio = ahora;
            // Re-cotizar borra la respuesta anterior para que el ciclo arranque limpio.
            cambios.fechaRespuesta = undefined;
          }
          if ((estado === 'respondio' || estado === 'cliente' || estado === 'rechazado') && !e.fechaRespuesta) {
            cambios.fechaRespuesta = ahora;
          }
          cambios.historial = agregarEvento(e.historial, 'estado', `Estado → ${ETIQUETA_ESTADO[estado]}`);
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

  const registrarEvento = useCallback(
    (id: string, tipo: EventoHistorial['tipo'], texto: string) => {
      setEmpresas((actuales) =>
        actuales.map((e) => (e.id === id ? { ...e, historial: agregarEvento(e.historial, tipo, texto) } : e)),
      );
    },
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
    registrarEvento,
  };
}
