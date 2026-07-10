import { lazy, Suspense, useMemo, useState } from 'react';
import { CheckCircle2, Globe, Loader2, Map, MapPin, MapPinned, Navigation, Plus, Search } from 'lucide-react';
import type { ConfigApp, FuenteEmpresa, NuevaEmpresa, ResultadoMaps } from '../types';
import {
  buscarCercaDelNegocio,
  buscarEmpresasEnMapa,
  formatearDistancia,
  type Coordenada,
} from '../lib/maps';
import type { ResultadoAgregar } from '../hooks/useEmpresas';
import type { MostrarToast } from '../App';
import type { PinMapa } from './MapaProspectos';

// El mapa (Leaflet) es pesado: se carga solo cuando el usuario abre la vista de mapa.
const MapaProspectos = lazy(() =>
  import('./MapaProspectos').then((m) => ({ default: m.MapaProspectos })),
);

interface Props {
  config: ConfigApp;
  agregarEmpresas: (nuevas: NuevaEmpresa[], fuente: FuenteEmpresa) => ResultadoAgregar;
  mostrarToast: MostrarToast;
  onIrAConfiguracion: () => void;
  /** Lleva a la lista con las recién agregadas ya seleccionadas para cotizar. */
  onCotizarAgregadas?: (ids: string[]) => void;
}

type Modo = 'cerca' | 'palabra';

const RADIOS = [2, 5, 10] as const;

export function BuscarMaps({ config, agregarEmpresas, mostrarToast, onIrAConfiguracion, onCotizarAgregadas }: Props) {
  const [modo, setModo] = useState<Modo>('cerca');
  const [consulta, setConsulta] = useState('');
  const [sectorEtiqueta, setSectorEtiqueta] = useState('');
  const [radioKm, setRadioKm] = useState<number>(5);
  const [cargando, setCargando] = useState(false);
  const [resultados, setResultados] = useState<ResultadoMaps[] | null>(null);
  const [seleccion, setSeleccion] = useState<Set<number>>(new Set());
  const [, setOrigen] = useState<Coordenada | null>(null);

  const hayClave = Boolean(config.googleMapsApiKey.trim());
  const hayDireccion = Boolean(config.direccion.trim());

  const recibirResultados = (lista: ResultadoMaps[]) => {
    setResultados(lista);
    setSeleccion(new Set(lista.map((_, i) => i)));
  };

  const buscarCerca = async () => {
    if (cargando) return;
    setCargando(true);
    try {
      const { resultados: lista, origen: punto } = await buscarCercaDelNegocio(config, radioKm);
      recibirResultados(lista);
      setOrigen(punto);
      if (lista.length > 0) {
        mostrarToast(`${lista.length} clientes potenciales a menos de ${radioKm} km de tu negocio.`, 'exito');
      }
    } catch (error) {
      const detalle = error instanceof Error ? error.message : 'Inténtalo de nuevo en un momento.';
      mostrarToast(detalle, 'error');
    } finally {
      setCargando(false);
    }
  };

  const buscarPorPalabra = async () => {
    if (!consulta.trim() || cargando) return;
    setCargando(true);
    try {
      const res = await buscarEmpresasEnMapa(consulta, config);
      recibirResultados(res.resultados);
      setOrigen(null);
      if (res.aviso) mostrarToast(res.aviso, 'info');
    } catch (error) {
      const detalle = error instanceof Error ? error.message : 'Inténtalo de nuevo en un momento.';
      mostrarToast(`No pudimos buscar en el mapa. ${detalle}`, 'error');
    } finally {
      setCargando(false);
    }
  };

  const alternar = (indice: number) => {
    setSeleccion((actual) => {
      const nueva = new Set(actual);
      if (nueva.has(indice)) nueva.delete(indice);
      else nueva.add(indice);
      return nueva;
    });
  };

  const agregarSeleccionados = () => {
    if (!resultados) return;
    const elegidos = resultados.filter((_, i) => seleccion.has(i));
    const { agregadas, duplicadas, idsAgregados } = agregarEmpresas(
      elegidos.map((r) => {
        const notas = [
          r.distanciaMetros != null ? `A ${formatearDistancia(r.distanciaMetros)} del negocio` : '',
          r.prioridad === 1 ? 'Prioridad ALTA' : '',
          r.website ? `Sitio web: ${r.website}` : '',
        ]
          .filter(Boolean)
          .join(' · ');
        return {
          nombre: r.nombre,
          direccion: r.direccion,
          telefono: r.telefono,
          sector: sectorEtiqueta.trim() || r.categoria || consulta.trim(),
          notas: notas || undefined,
          lat: r.lat,
          lon: r.lon,
        };
      }),
      'maps',
    );
    mostrarToast(
      agregadas > 0
        ? `${agregadas} ${agregadas === 1 ? 'empresa agregada' : 'empresas agregadas'} y ya quedaron seleccionadas: solo toca enviarles la cotización.`
        : `Las ${duplicadas} ya estaban en tu lista.`,
      'exito',
    );
    setResultados(null);
    setSeleccion(new Set());
    if (agregadas > 0) onCotizarAgregadas?.(idsAgregados);
  };

  /** Agrega una sola empresa desde un clic en el mapa. */
  const agregarUnoPorMapa = (indiceTexto: string) => {
    if (!resultados) return;
    const i = Number(indiceTexto);
    const r = resultados[i];
    if (!r) return;
    const notas = [
      r.distanciaMetros != null ? `A ${formatearDistancia(r.distanciaMetros)} del negocio` : '',
      r.prioridad === 1 ? 'Prioridad ALTA' : '',
      r.website ? `Sitio web: ${r.website}` : '',
    ]
      .filter(Boolean)
      .join(' · ');
    const { agregadas, duplicadas } = agregarEmpresas(
      [
        {
          nombre: r.nombre,
          direccion: r.direccion,
          telefono: r.telefono,
          sector: sectorEtiqueta.trim() || r.categoria || consulta.trim(),
          notas: notas || undefined,
          lat: r.lat,
          lon: r.lon,
        },
      ],
      'maps',
    );
    mostrarToast(
      agregadas > 0 ? `${r.nombre} agregada a tu lista.` : `${r.nombre} ya estaba en tu lista.`,
      agregadas > 0 ? 'exito' : 'info',
    );
    void duplicadas;
  };

  const pines: PinMapa[] = useMemo(
    () =>
      (resultados ?? [])
        .map((r, i): PinMapa | null =>
          r.lat != null && r.lon != null
            ? {
                id: String(i),
                nombre: r.nombre,
                lat: r.lat,
                lon: r.lon,
                prioridad: r.prioridad,
                detalle: [r.categoria, r.distanciaMetros != null ? formatearDistancia(r.distanciaMetros) : '']
                  .filter(Boolean)
                  .join(' · '),
              }
            : null,
        )
        .filter((p): p is PinMapa => p !== null),
    [resultados],
  );
  const hayPines = pines.length > 0;

  const conContacto = resultados?.filter((r) => seleccion.has(resultados.indexOf(r))) ?? [];

  // Coordenadas del negocio: el mapa se muestra SIEMPRE centrado aquí.
  const negocioCoords =
    Number.isFinite(config.negocioLat) && Number.isFinite(config.negocioLon)
      ? { lat: config.negocioLat as number, lon: config.negocioLon as number, nombre: config.nombreEmpresa }
      : undefined;

  return (
    <div className="space-y-4">
      {/* Selector de modo */}
      <div className="tarjeta space-y-4">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-bold text-slate-800">
            <MapPinned className="h-7 w-7 text-slate-700" aria-hidden="true" />
            Buscar empresas en el mapa
          </h2>
          <p className="mt-1 text-lg text-slate-600">
            Encuentra clientes nuevos cerca de tu negocio o por tipo de empresa.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setModo('cerca');
              setResultados(null);
            }}
            className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 font-semibold transition ${
              modo === 'cerca'
                ? 'border-[#14181f] bg-slate-100 text-[#14181f]'
                : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Navigation className="h-5 w-5" aria-hidden="true" />
            Cerca de mi negocio
          </button>
          <button
            type="button"
            onClick={() => {
              setModo('palabra');
              setResultados(null);
            }}
            className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 font-semibold transition ${
              modo === 'palabra'
                ? 'border-[#14181f] bg-slate-100 text-[#14181f]'
                : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Search className="h-5 w-5" aria-hidden="true" />
            Por tipo de empresa
          </button>
        </div>

        {/* Modo cercanía */}
        {modo === 'cerca' && (
          <div className="space-y-4">
            <p className="rounded-2xl bg-slate-50 p-4 text-slate-700">
              Buscamos empresas que necesitan dotación (talleres, ferreterías, fábricas, restaurantes…)
              alrededor de <strong>{config.direccion || 'tu negocio'}</strong> y te las mostramos
              ordenadas de la más cercana a la más lejana.
            </p>

            {!hayDireccion ? (
              <div className="flex flex-col items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 sm:flex-row sm:items-center">
                <p className="flex-1 text-amber-900">
                  Primero escribe la dirección de tu negocio en Configuración para buscar a su alrededor.
                </p>
                <button type="button" className="btn-primario shrink-0" onClick={onIrAConfiguracion}>
                  Ir a Configuración
                </button>
              </div>
            ) : (
              <>
                <div>
                  <span className="etiqueta">¿A qué distancia?</span>
                  <div className="flex flex-wrap gap-2">
                    {RADIOS.map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setRadioKm(r)}
                        className={`rounded-xl border px-5 py-2.5 font-semibold transition ${
                          radioKm === r
                            ? 'border-blue-700 bg-blue-700 text-white'
                            : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {r} km a la redonda
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  type="button"
                  className="btn-primario w-full text-lg sm:w-auto sm:px-8"
                  onClick={() => void buscarCerca()}
                  disabled={cargando}
                >
                  {cargando ? (
                    <Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" />
                  ) : (
                    <Navigation className="h-6 w-6" aria-hidden="true" />
                  )}
                  {cargando ? 'Buscando cerca…' : 'Buscar clientes cerca de mi negocio'}
                </button>
              </>
            )}
          </div>
        )}

        {/* Modo por palabra */}
        {modo === 'palabra' && (
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label htmlFor="maps-consulta" className="etiqueta">
                  ¿Qué empresas buscas?
                </label>
                <input
                  id="maps-consulta"
                  className="campo"
                  placeholder="Ej: empresas de plásticos en Bogotá"
                  value={consulta}
                  onChange={(e) => setConsulta(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void buscarPorPalabra();
                  }}
                />
              </div>
              <div>
                <label htmlFor="maps-sector" className="etiqueta">
                  Sector para etiquetarlas
                </label>
                <input
                  id="maps-sector"
                  className="campo"
                  placeholder="Ej: plásticos"
                  value={sectorEtiqueta}
                  onChange={(e) => setSectorEtiqueta(e.target.value)}
                />
              </div>
            </div>
            <button
              type="button"
              className="btn-primario w-full text-lg sm:w-auto sm:px-8"
              onClick={() => void buscarPorPalabra()}
              disabled={cargando || !consulta.trim()}
            >
              {cargando ? (
                <Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" />
              ) : (
                <Search className="h-6 w-6" aria-hidden="true" />
              )}
              {cargando ? 'Buscando…' : 'Buscar empresas'}
            </button>
          </div>
        )}

        {/* La búsqueda es gratis (OpenStreetMap); no se le pide nada al usuario.
            Solo si él ya configuró Google Maps se le confirma que está activo. */}
        {hayClave && (
          <p className="insignia border-emerald-300 bg-emerald-100 text-emerald-800">
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            Buscando con Google Maps
          </p>
        )}
      </div>

      {/* Mapa SIEMPRE visible en modo cercanía (centrado en el negocio) */}
      {modo === 'cerca' && negocioCoords && (
        <div className="tarjeta space-y-2">
          <p className="flex items-center gap-2 text-lg font-bold text-slate-800">
            <Map className="h-6 w-6 text-slate-700" aria-hidden="true" />
            Mapa de tu zona
          </p>
          <Suspense
            fallback={
              <div className="flex h-96 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50">
                <Loader2 className="h-8 w-8 animate-spin text-slate-700" aria-hidden="true" />
              </div>
            }
          >
            <MapaProspectos
              negocio={negocioCoords}
              pines={pines}
              onSeleccionar={agregarUnoPorMapa}
              textoBotonPin="Agregar a mi lista"
            />
          </Suspense>
          <p className="text-sm text-slate-500">
            🟠 tu negocio · 🟢 prioridad alta · ⚫ media.{' '}
            {hayPines
              ? 'Toca un punto para ver la empresa y agregarla.'
              : 'Toca «Buscar clientes cerca de mi negocio» para ver empresas alrededor.'}
          </p>
        </div>
      )}

      {/* Resultados */}
      {resultados !== null &&
        (resultados.length === 0 ? (
          <div className="tarjeta space-y-2 py-8 text-center">
            <p className="text-xl font-bold text-slate-700">No encontramos resultados.</p>
            <p className="text-lg text-slate-600">
              {modo === 'cerca'
                ? 'Prueba con un radio mayor (10 km) e intenta de nuevo en un momento.'
                : 'Revisa la ortografía (por ejemplo «plásticos», con s) o prueba otras palabras: «fábrica de plásticos», «metalmecánica», «alimentos».'}
            </p>
          </div>
        ) : (
          <div className="tarjeta space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-lg font-bold text-slate-800">
                {resultados.length} {resultados.length === 1 ? 'resultado' : 'resultados'} —{' '}
                {seleccion.size} {seleccion.size === 1 ? 'seleccionado' : 'seleccionados'}
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="btn-secundario px-4 py-2"
                  onClick={() => setSeleccion(new Set(resultados.map((_, i) => i)))}
                >
                  Todos
                </button>
                <button
                  type="button"
                  className="btn-secundario px-4 py-2"
                  onClick={() => setSeleccion(new Set())}
                >
                  Ninguno
                </button>
              </div>
            </div>

            <ul className="divide-y divide-slate-100">
              {resultados.map((r, i) => (
                <li key={`${r.nombre}-${i}`}>
                  <label className="flex cursor-pointer items-start gap-3 py-3">
                    <input
                      type="checkbox"
                      className="mt-1.5 h-5 w-5 shrink-0 rounded border-slate-300 text-[#14181f] focus:ring-slate-400"
                      checked={seleccion.has(i)}
                      onChange={() => alternar(i)}
                    />
                    <span className="flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="text-lg font-bold text-slate-800">{r.nombre}</span>
                        {r.distanciaMetros != null && (
                          <span className="insignia border-blue-300 bg-blue-100 text-blue-800">
                            <MapPin className="h-4 w-4" aria-hidden="true" />
                            {formatearDistancia(r.distanciaMetros)}
                          </span>
                        )}
                        {r.prioridad === 1 && (
                          <span className="insignia border-emerald-300 bg-emerald-100 text-emerald-800">
                            Prioridad alta
                          </span>
                        )}
                        {r.categoria && (
                          <span className="insignia border-slate-300 bg-slate-100 text-slate-600">
                            {r.categoria}
                          </span>
                        )}
                      </span>
                      {r.direccion && <span className="block text-slate-600">{r.direccion}</span>}
                      <span className={`block ${r.telefono ? 'text-slate-600' : 'text-slate-400'}`}>
                        {r.telefono || 'Sin teléfono'}
                      </span>
                      {r.website && (
                        <a
                          href={r.website}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 break-all text-blue-700 underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Globe className="h-4 w-4 shrink-0" aria-hidden="true" />
                          {r.website}
                        </a>
                      )}
                    </span>
                  </label>
                </li>
              ))}
            </ul>

            <button
              type="button"
              className="btn-verde w-full text-lg sm:w-auto sm:px-8"
              disabled={conContacto.length === 0}
              onClick={agregarSeleccionados}
            >
              <Plus className="h-6 w-6" aria-hidden="true" />
              Agregar {seleccion.size} a mi lista
            </button>
          </div>
        ))}
    </div>
  );
}
