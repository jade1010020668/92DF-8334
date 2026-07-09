import { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  BarChart3,
  Building2,
  CheckCircle2,
  HardHat,
  HelpCircle,
  Home,
  Info,
  Lock,
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
import { Login } from './components/Login';
import { Guia } from './components/Guia';
import { CLAVE_ACCESO, CLAVE_DESBLOQUEADO, CLAVE_VIO_GUIA } from './lib/config';
import { ACCESO_DEFAULT, combinarAcceso, type Acceso } from './lib/acceso';
import { cargarBaseInicial } from './lib/baseInicial';

export type Pestana = 'inicio' | 'empresas' | 'buscar' | 'pedidos' | 'estadisticas' | 'configuracion';

export type TipoToast = 'exito' | 'error' | 'info';

/** Acción opcional del aviso (p. ej. "Deshacer"). */
export interface AccionToast {
  etiqueta: string;
  fn: () => void;
}

export type MostrarToast = (mensaje: string, tipo?: TipoToast, accion?: AccionToast) => void;

interface Toast {
  mensaje: string;
  tipo: TipoToast;
  accion?: AccionToast;
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
  exito: 'bg-emerald-700 text-white',
  error: 'bg-rose-700 text-white',
  info: 'bg-[#14181f] text-white',
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
    restaurarEmpresa,
    borrarTodo,
    reemplazarTodo,
    registrarEvento,
  } = useEmpresas();

  const { pedidos, crearPedido, actualizarPedido, eliminarPedido, reemplazarPedidos } = usePedidos();

  const [config, setConfig] = useLocalStorageState<ConfigApp>(CLAVE_CONFIG, CONFIG_DEFAULT, (guardado) =>
    combinarConfig(guardado as Partial<ConfigApp> | null),
  );

  // Acceso con clave (opcional). Si hay clave puesta, la app pide ingresar.
  const [acceso, setAcceso] = useLocalStorageState<Acceso>(CLAVE_ACCESO, ACCESO_DEFAULT, combinarAcceso);
  const [desbloqueado, setDesbloqueado] = useLocalStorageState<boolean>(
    CLAVE_DESBLOQUEADO,
    false,
    (g) => g === true,
  );
  const requiereClave = acceso.claveHash !== '' && !(acceso.recordar && desbloqueado);

  // Tutorial de bienvenida: aparece CADA vez que se entra, salvo que el usuario
  // haya elegido "Saltar tutorial / No volver a mostrar". `guiaCerradaSesion`
  // lo oculta solo en esta sesión (al recargar vuelve a salir si no se saltó).
  const [saltarTutorial, setSaltarTutorial] = useLocalStorageState<boolean>(
    CLAVE_VIO_GUIA,
    false,
    (g) => g === true,
  );
  const [guiaAbierta, setGuiaAbierta] = useState(false);
  const [guiaCerradaSesion, setGuiaCerradaSesion] = useState(false);
  const mostrarGuia =
    guiaAbierta || (!saltarTutorial && !guiaCerradaSesion && !requiereClave);
  const cerrarGuia = useCallback(
    (noMostrarMas: boolean) => {
      if (noMostrarMas) setSaltarTutorial(true);
      setGuiaCerradaSesion(true);
      setGuiaAbierta(false);
    },
    [setSaltarTutorial],
  );

  const mostrarToast: MostrarToast = useCallback((mensaje, tipo = 'info', accion) => {
    setToast({ mensaje, tipo, accion });
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

  const [cargandoBase, setCargandoBase] = useState(false);
  const cargarBase = useCallback(async () => {
    if (cargandoBase) return;
    // Si la base ya está cargada, no re-descargar 1 MB por accidente (en
    // celular tarda y no agrega nada nuevo).
    if (
      empresas.length >= 5000 &&
      !window.confirm(
        `Ya tienes ${empresas.length.toLocaleString('es-CO')} empresas cargadas. ¿Volver a descargar la base para revisar si hay nuevas? (puede tardar en celular)`,
      )
    ) {
      return;
    }
    setCargandoBase(true);
    try {
      const { empresas: nuevas } = await cargarBaseInicial();
      if (nuevas.length === 0) {
        mostrarToast('La base de datos está vacía o no se pudo leer.', 'error');
        return;
      }
      const conContacto = nuevas.filter((e) => (e.telefono ?? '').trim() || (e.email ?? '').trim()).length;
      const { agregadas, duplicadas } = agregarEmpresas(nuevas, 'maps');
      mostrarToast(
        `${agregadas} empresas reales agregadas (${conContacto} con teléfono o correo, listas para contactar). Usa el filtro "Solo con teléfono/correo".`,
        'exito',
      );
      void duplicadas;
      setPestana('empresas');
    } catch (error) {
      mostrarToast(error instanceof Error ? error.message : 'No se pudo cargar la base.', 'error');
    } finally {
      setCargandoBase(false);
    }
  }, [cargandoBase, empresas.length, agregarEmpresas, mostrarToast]);

  useEffect(() => {
    if (!toast) return;
    // Más tiempo si hay acción ("Deshacer"): el papá necesita alcanzar a tocarla.
    const temporizador = setTimeout(() => setToast(null), toast.accion ? 8000 : 7000);
    return () => clearTimeout(temporizador);
  }, [toast]);

  const IconoToast = toast ? ICONO_TOAST[toast.tipo] : null;

  // Si hay clave y no está desbloqueada, mostramos solo la pantalla de acceso.
  if (requiereClave) {
    return (
      <Login
        acceso={acceso}
        nombreEmpresa={config.nombreEmpresa}
        onDesbloquear={() => setDesbloqueado(true)}
      />
    );
  }

  return (
    <div className="min-h-screen pb-12">
      {/* Encabezado */}
      <header className="bg-[#14181f] text-white">
        <div className="mx-auto flex max-w-6xl items-center gap-3.5 px-4 py-4 sm:px-6">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15">
            <HardHat className="h-6 w-6 text-amber-300" aria-hidden="true" />
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
              Dotación<span className="text-amber-300">Pro</span>
            </h1>
            <p className="text-sm text-slate-400">{config.nombreEmpresa}</p>
          </div>
          <button
            type="button"
            onClick={() => setGuiaAbierta(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-3.5 py-2 text-sm font-semibold text-white ring-1 ring-white/15 transition hover:bg-white/20"
            title="Ver la guía de cómo funciona la app"
          >
            <HelpCircle className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">¿Cómo funciona?</span>
          </button>
          {acceso.claveHash !== '' && (
            <button
              type="button"
              onClick={() => setDesbloqueado(false)}
              className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-3.5 py-2 text-sm font-semibold text-white ring-1 ring-white/15 transition hover:bg-white/20"
              title="Bloquear la app (pedirá tu clave para volver a entrar)"
            >
              <Lock className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Bloquear</span>
            </button>
          )}
        </div>
      </header>

      {/* Navegación */}
      <nav
        className="sticky top-0 z-30 border-b bg-white/90 backdrop-blur"
        style={{ borderColor: 'var(--linea)' }}
        aria-label="Secciones de la aplicación"
      >
        <div className="mx-auto max-w-6xl overflow-x-auto whitespace-nowrap px-2 sm:px-4">
          {PESTANAS.map(({ id, etiqueta, Icono }) => {
            const activa = pestana === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setPestana(id)}
                aria-current={activa ? 'page' : undefined}
                className={`inline-flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition ${
                  activa
                    ? 'border-[#14181f] text-[#14181f]'
                    : 'border-transparent text-slate-500 hover:text-slate-900'
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
            pedidos={pedidos}
            actualizarEmpresa={actualizarEmpresa}
            cambiarEstado={cambiarEstado}
            mostrarToast={mostrarToast}
            onAbrirCampana={() => setCampanaAbierta(true)}
            onIrAConfiguracion={() => setPestana('configuracion')}
            onIrABuscar={() => setPestana('buscar')}
            onIrAPedidos={() => setPestana('pedidos')}
            onCargarBase={cargarBase}
            cargandoBase={cargandoBase}
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
            restaurarEmpresa={restaurarEmpresa}
            registrarEvento={registrarEvento}
            crearPedido={crearPedido}
            mostrarToast={mostrarToast}
            onIrABuscar={() => setPestana('buscar')}
            onCargarBase={cargarBase}
            cargandoBase={cargandoBase}
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
            acceso={acceso}
            setAcceso={setAcceso}
            desbloquear={() => setDesbloqueado(true)}
            mostrarToast={mostrarToast}
          />
        )}
      </main>

      {/* Guía de bienvenida */}
      {mostrarGuia && <Guia onCerrar={cerrarGuia} />}

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
          {toast.accion && (
            <button
              type="button"
              onClick={() => {
                toast.accion?.fn();
                setToast(null);
              }}
              className="shrink-0 rounded-lg bg-white/20 px-3 py-1.5 font-bold underline-offset-2 transition hover:bg-white/30"
            >
              {toast.accion.etiqueta}
            </button>
          )}
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
