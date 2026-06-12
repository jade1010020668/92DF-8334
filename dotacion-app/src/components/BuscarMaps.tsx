import { useState } from 'react';
import { CheckCircle2, Globe, Loader2, MapPinned, Plus, Search } from 'lucide-react';
import type { ConfigApp, FuenteEmpresa, NuevaEmpresa, ResultadoMaps } from '../types';
import { buscarEmpresasEnMapa } from '../lib/maps';
import type { ResultadoAgregar } from '../hooks/useEmpresas';
import type { MostrarToast } from '../App';

interface Props {
  config: ConfigApp;
  agregarEmpresas: (nuevas: NuevaEmpresa[], fuente: FuenteEmpresa) => ResultadoAgregar;
  mostrarToast: MostrarToast;
  onIrAConfiguracion: () => void;
}

export function BuscarMaps({ config, agregarEmpresas, mostrarToast, onIrAConfiguracion }: Props) {
  const [consulta, setConsulta] = useState('');
  const [sectorEtiqueta, setSectorEtiqueta] = useState('');
  const [cargando, setCargando] = useState(false);
  const [resultados, setResultados] = useState<ResultadoMaps[] | null>(null);
  const [seleccion, setSeleccion] = useState<Set<number>>(new Set());

  const hayClave = Boolean(config.googleMapsApiKey.trim());

  const buscar = async () => {
    if (!consulta.trim() || cargando) return;
    setCargando(true);
    try {
      const res = await buscarEmpresasEnMapa(consulta, config);
      setResultados(res.resultados);
      setSeleccion(new Set(res.resultados.map((_, i) => i)));
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
    const { agregadas, duplicadas } = agregarEmpresas(
      elegidos.map((r) => ({
        nombre: r.nombre,
        direccion: r.direccion,
        telefono: r.telefono,
        sector: sectorEtiqueta.trim() || consulta.trim(),
        notas: r.website ? `Sitio web: ${r.website}` : undefined,
      })),
      'maps',
    );
    mostrarToast(
      `${agregadas} ${agregadas === 1 ? 'empresa agregada' : 'empresas agregadas'}, ${duplicadas} ya ${
        duplicadas === 1 ? 'estaba' : 'estaban'
      } en tu lista.`,
      'exito',
    );
    setResultados(null);
    setSeleccion(new Set());
  };

  return (
    <div className="space-y-4">
      {/* Hero de búsqueda */}
      <div className="tarjeta space-y-4">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-bold text-slate-800">
            <MapPinned className="h-7 w-7 text-blue-700" aria-hidden="true" />
            Buscar empresas en el mapa
          </h2>
          <p className="mt-1 text-lg text-slate-600">
            Escribe qué tipo de empresas buscas y la app las encuentra con dirección y teléfono.
          </p>
        </div>

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
                if (e.key === 'Enter') void buscar();
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
          onClick={() => void buscar()}
          disabled={cargando || !consulta.trim()}
        >
          {cargando ? (
            <Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" />
          ) : (
            <Search className="h-6 w-6" aria-hidden="true" />
          )}
          {cargando ? 'Buscando…' : 'Buscar empresas'}
        </button>

        {hayClave ? (
          <p className="insignia border-emerald-300 bg-emerald-100 text-emerald-800">
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            Buscando con Google Maps
          </p>
        ) : (
          <div className="flex flex-col items-start gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-4 sm:flex-row sm:items-center">
            <p className="flex-1 text-blue-900">
              Estás usando la búsqueda gratuita (OpenStreetMap). Para resultados más completos y con
              teléfono, agrega tu clave de Google Maps en Configuración.
            </p>
            <button type="button" className="btn-secundario shrink-0" onClick={onIrAConfiguracion}>
              Ir a Configuración
            </button>
          </div>
        )}
      </div>

      {/* Resultados */}
      {resultados !== null &&
        (resultados.length === 0 ? (
          <div className="tarjeta space-y-2 py-8 text-center">
            <p className="text-xl font-bold text-slate-700">No encontramos resultados.</p>
            <p className="text-lg text-slate-600">
              Prueba con otras palabras, por ejemplo «fábrica de plásticos Bogotá» o «metalmecánica
              Fontibón».
            </p>
            {!hayClave && (
              <p className="text-lg text-slate-600">
                También puedes configurar tu clave de Google Maps para una búsqueda más completa.
              </p>
            )}
          </div>
        ) : (
          <div className="tarjeta space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-lg font-bold text-slate-800">
                {resultados.length} {resultados.length === 1 ? 'resultado' : 'resultados'} —{' '}
                {seleccion.size} {seleccion.size === 1 ? 'seleccionado' : 'seleccionados'}
              </p>
              <div className="flex gap-2">
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
                      className="mt-1.5 h-5 w-5 shrink-0 rounded border-slate-300 text-blue-700 focus:ring-blue-400"
                      checked={seleccion.has(i)}
                      onChange={() => alternar(i)}
                    />
                    <span className="flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="text-lg font-bold text-slate-800">{r.nombre}</span>
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
              disabled={seleccion.size === 0}
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
