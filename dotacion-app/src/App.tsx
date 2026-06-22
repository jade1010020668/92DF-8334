import { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  BarChart3,
  Building2,
  CheckCircle2,
  HardHat,
  Home,
  Info,
  MapPinned,
  Settings,
  ShoppingCart,
  X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ConfigApp } from './types';
import { CLAVE_CONFIG, CONFIG_DEFAULT, combinarConfig } from './lib/config';
import { useEmpresas } from './hooks/useEmpresas';
import { usePedidos } from './hooks/usePedidos';
import { useLocalStorageState, registrarAvisoFalloGuardado } from './hooks/useLocalStorageState';
import { Dashboard } from './components/Dashboard';
import { Campana } from './components/Campana';
import { Empresas } from './components/Empresas';
import { BuscarMaps } from './components/BuscarMaps';
import { Estadisticas } from './components/Estadisticas';
import { Configuracion } from './components/Configuracion';
import { Pedidos } from './components/Pedidos';

export type Pestana = 'inicio' | 'empresas' | 'buscar' | 'pedidos' | 'estadisticas' | 'configuracion';

export type TipoToast = 'exito' | 'error' | 'info';

export type MostrarToast = (mensaje: string, tipo?: TipoToast) => void;

interface Toast {
  mensaje: string;
  tipo: TipoToast;
}

const PESTANAS: { id: Pestana; etiqueta: string; Icono: LucideIcon }[] = [
  { id: 'inicio', etiqueta: 'Inicio', Icono: Home },
  { id: 'empresas', etiqueta: 'Empresas', Icono: Building2 },
  { id: 'buscar', etiqueta: 'Buscar en el mapa', Icono: MapPinned },
  { id: 'pedidos', etiqueta: 'Pedidos', Icono: ShoppingCart },
  { id: 'estadisticas', etiqueta: 'Estadísticas', Icono: BarChart3 },
  { id: 'configuracion', etiqueta: 'Configuración', Icono: Settings },
];

const ESTILO_TOAST: Record<TipoToast, string> = {
  exito: 'bg-emerald-600 text-white',
  error: 'bg-rose-600 text-white',
  info: 'bg-blue-700 text-white',
};

const ICONO_TOAST: Record<TipoToast, LucideIcon> = {
  exito: CheckCircle2,
  error: AlertCircle,
  info: Info,
};

export default function App() {
  const [pestana, setPestana] = useState<Pestana>('inicio');
  const [campanaAbierta, setCampanaAbierta] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);

  const {
    empresas,
    agregarEmpresas,
    actualizarEmpresa,
    cambiarEstado,
    eliminarEmpresa,
    borrarTodo,
    reemplazarTodo,
    registrarEvento,
  } = useEmpresas();

  const { pedidos, crearPedido, actualizarPedido, eliminarPedido, reemplazarPedidos } = usePedidos();

  const [config, setConfig] = useLocalStorageState<ConfigApp>(CLAVE_CONFIG, CONFIG_DEFAULT, (guardado) =>
    combinarConfig(guardado as Partial<ConfigApp> | null),
  );

  const mostrarToast: MostrarToast = useCallback((mensaje, tipo = 'info') => {
    setToast({ mensaje, tipo });
  }, []);

  // Aviso cuando el navegador no puede guardar (cuota llena / almacenamiento bloqueado).
  useEffect(() => {
    registrarAvisoFalloGuardado(() =>
      mostrarToast(
        'No pudimos guardar en este navegador (memoria llena o bloqueada). Exporta una copia en Excel y libera espacio.',
        'error',
      ),
    );
    return () => registrarAvisoFalloGuardado(null);
  }, [mostrarToast]);

  useEffect(() => {
    if (!toast) return;
    const temporizador = setTimeout(() => setToast(null), 4500);
    return () => clearTimeout(temporizador);
  }, [toast]);

  const IconoToast = toast ? ICONO_TOAST[toast.tipo] : null;

  return (
    <div className="min-h-screen pb-12">
      {/* Encabezado */}
      <header className="bg-gradient-to-r from-blue-800 to-blue-600 text-white shadow-md">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-5 sm:px-6">
          <div className="rounded-2xl bg-white/15 p-3">
            <HardHat className="h-9 w-9" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl">DotaciónPro</h1>
            <p className="text-sm text-blue-100 sm:text-base">{config.nombreEmpresa}</p>
          </div>
        </div>
      </header>

      {/* Navegación */}
      <nav className="border-b border-slate-200 bg-white shadow-sm" aria-label="Secciones de la aplicación">
        <div className="mx-auto max-w-6xl overflow-x-auto whitespace-nowrap px-2 sm:px-4">
          {PESTANAS.map(({ id, etiqueta, Icono }) => {
            const activa = pestana === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setPestana(id)}
                aria-current={activa ? 'page' : undefined}
                className={`inline-flex items-center gap-2 border-b-4 px-4 py-3 font-semibold transition ${
                  activa
                    ? 'border-blue-700 bg-blue-50 text-blue-700'
                    : 'border-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Icono className="h-5 w-5" aria-hidden="true" />
                {etiqueta}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Contenido */}
      <main className="mx-auto max-w-6xl px-3 py-6 sm:px-6">
        {pestana === 'inicio' && (
          <Dashboard
            empresas={empresas}
            config={config}
            actualizarEmpresa={actualizarEmpresa}
            onAbrirCampana={() => setCampanaAbierta(true)}
            onIrAConfiguracion={() => setPestana('configuracion')}
            onIrAEmpresas={() => setPestana('empresas')}
            onIrABuscar={() => setPestana('buscar')}
          />
        )}
        {pestana === 'empresas' && (
          <Empresas
            empresas={empresas}
            config={config}
            pedidos={pedidos}
            agregarEmpresas={agregarEmpresas}
            actualizarEmpresa={actualizarEmpresa}
            cambiarEstado={cambiarEstado}
            eliminarEmpresa={eliminarEmpresa}
            registrarEvento={registrarEvento}
            crearPedido={crearPedido}
            mostrarToast={mostrarToast}
            onIrABuscar={() => setPestana('buscar')}
          />
        )}
        {pestana === 'buscar' && (
          <BuscarMaps
            config={config}
            agregarEmpresas={agregarEmpresas}
            mostrarToast={mostrarToast}
            onIrAConfiguracion={() => setPestana('configuracion')}
          />
        )}
        {pestana === 'pedidos' && (
          <Pedidos
            pedidos={pedidos}
            empresas={empresas}
            config={config}
            crearPedido={crearPedido}
            actualizarPedido={actualizarPedido}
            eliminarPedido={eliminarPedido}
            registrarEvento={registrarEvento}
            mostrarToast={mostrarToast}
            onIrAEmpresas={() => setPestana('empresas')}
          />
        )}
        {pestana === 'estadisticas' && <Estadisticas empresas={empresas} pedidos={pedidos} />}
        {pestana === 'configuracion' && (
          <Configuracion
            config={config}
            setConfig={setConfig}
            empresas={empresas}
            pedidos={pedidos}
            borrarTodo={borrarTodo}
            reemplazarTodo={reemplazarTodo}
            reemplazarPedidos={reemplazarPedidos}
            mostrarToast={mostrarToast}
          />
        )}
      </main>

      {/* Modal de campaña */}
      {campanaAbierta && (
        <Campana
          empresas={empresas}
          config={config}
          cambiarEstado={cambiarEstado}
          mostrarToast={mostrarToast}
          onCerrar={() => setCampanaAbierta(false)}
        />
      )}

      {/* Toast */}
      {toast && IconoToast && (
        <div
          role={toast.tipo === 'error' ? 'alert' : 'status'}
          aria-live="polite"
          className={`fixed bottom-4 left-1/2 z-[70] flex w-[calc(100%-1.5rem)] max-w-xl -translate-x-1/2 items-start gap-3 rounded-2xl px-5 py-4 text-base font-semibold shadow-xl ${ESTILO_TOAST[toast.tipo]}`}
        >
          <IconoToast className="mt-0.5 h-6 w-6 shrink-0" aria-hidden="true" />
          <span className="flex-1">{toast.mensaje}</span>
          <button
            type="button"
            onClick={() => setToast(null)}
            aria-label="Cerrar aviso"
            className="rounded-lg p-1 transition hover:bg-white/20"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
}
