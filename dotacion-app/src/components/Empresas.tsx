import { useEffect, useMemo, useRef, useState } from 'react';
import {
  BookOpen,
  Database,
  Download,
  FileSpreadsheet,
  Loader2,
  Mail,
  MapPinned,
  MessageCircle,
  Phone,
  Plus,
  Search,
  Sparkles,
  Upload,
} from 'lucide-react';
import type {
  ConfigApp,
  Empresa,
  EstadoEmpresa,
  EventoHistorial,
  FuenteEmpresa,
  NuevaEmpresa,
  NuevoPedido,
  Pedido,
} from '../types';
import { ESTADOS, ETIQUETA_ESTADO, COLOR_ESTADO } from '../types';
import {
  generarEmailMasivo,
  generarWhatsApp,
  urlOutlookMasivo,
  urlWhatsApp,
  urlWhatsAppCatalogo,
} from '../lib/plantillas';
import { descargarPlantilla, exportarExcel, importarExcel } from '../lib/excel';
import { enviarCotizacionReal, envioRealConfigurado, medioEnvioDisponible } from '../lib/envioReal';
import { buscarDatosContacto } from '../lib/enriquecerGoogle';
import type { ResultadoAgregar } from '../hooks/useEmpresas';
import type { MostrarToast } from '../App';
import { EmpresaForm } from './EmpresaForm';
import { FichaEmpresa } from './FichaEmpresa';

interface Props {
  empresas: Empresa[];
  config: ConfigApp;
  pedidos: Pedido[];
  agregarEmpresas: (nuevas: NuevaEmpresa[], fuente: FuenteEmpresa) => ResultadoAgregar;
  actualizarEmpresa: (id: string, cambios: Partial<Empresa>) => void;
  cambiarEstado: (id: string, estado: EstadoEmpresa) => void;
  eliminarEmpresa: (id: string) => void;
  restaurarEmpresa: (empresa: Empresa) => void;
  registrarEvento: (id: string, tipo: EventoHistorial['tipo'], texto: string) => void;
  crearPedido: (datos: NuevoPedido) => Pedido;
  mostrarToast: MostrarToast;
  onIrABuscar: () => void;
  onCargarBase: () => void;
  cargandoBase: boolean;
}

export function Empresas({
  empresas,
  config,
  pedidos,
  agregarEmpresas,
  actualizarEmpresa,
  cambiarEstado,
  eliminarEmpresa,
  restaurarEmpresa,
  registrarEvento,
  crearPedido,
  mostrarToast,
  onIrABuscar,
  onCargarBase,
  cargandoBase,
}: Props) {
  const [busqueda, setBusqueda] = useState('');
  const [filtroSector, setFiltroSector] = useState('todos');
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [soloContacto, setSoloContacto] = useState(false);
  // Con 6.000+ empresas, pintar toda la tabla congela el navegador: se pintan
  // de a 100 y un botón trae las siguientes.
  const [limite, setLimite] = useState(100);
  const [seleccion, setSeleccion] = useState<Set<string>>(() => new Set());
  const [formAbierto, setFormAbierto] = useState(false);
  const [editando, setEditando] = useState<Empresa | null>(null);
  const [ficha, setFicha] = useState<Empresa | null>(null);
  const [enriqueciendo, setEnriqueciendo] = useState<{ hecho: number; total: number; hallados: number } | null>(
    null,
  );
  const detenerEnriq = useRef(false);
  const inputArchivo = useRef<HTMLInputElement>(null);

  const hayClaveGoogle = config.googleMapsApiKey.trim() !== '';

  const totalContactables = useMemo(
    () => empresas.filter((e) => e.telefono.trim() || e.email.trim()).length,
    [empresas],
  );

  const sectores = useMemo(() => {
    const unicos = new Set<string>();
    for (const e of empresas) {
      const s = e.sector.trim();
      if (s) unicos.add(s);
    }
    return [...unicos].sort((a, b) => a.localeCompare(b, 'es'));
  }, [empresas]);

  const filtradas = useMemo(() => {
    // Sin tildes ni mayúsculas: buscar "plasticos" encuentra "Plásticos".
    const normalizar = (t: string) =>
      t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    const texto = normalizar(busqueda.trim());
    return empresas.filter((e) => {
      if (soloContacto && !e.telefono.trim() && !e.email.trim()) return false;
      if (filtroSector !== 'todos' && e.sector.trim() !== filtroSector) return false;
      if (filtroEstado !== 'todos' && e.estado !== filtroEstado) return false;
      if (!texto) return true;
      return [e.nombre, e.contacto, e.email, e.direccion].some((campo) =>
        normalizar(campo).includes(texto),
      );
    });
  }, [empresas, busqueda, filtroSector, filtroEstado, soloContacto]);

  // Al cambiar búsqueda o filtros, se vuelve a las primeras 100.
  useEffect(() => {
    setLimite(100);
  }, [busqueda, filtroSector, filtroEstado, soloContacto]);

  const visibles = useMemo(() => filtradas.slice(0, limite), [filtradas, limite]);

  // --- Selección múltiple para envío masivo ---
  const alternarSeleccion = (id: string) =>
    setSeleccion((actual) => {
      const nueva = new Set(actual);
      if (nueva.has(id)) nueva.delete(id);
      else nueva.add(id);
      return nueva;
    });

  const idsFiltradas = filtradas.map((e) => e.id);
  const todasVisiblesSeleccionadas =
    idsFiltradas.length > 0 && idsFiltradas.every((id) => seleccion.has(id));

  const alternarTodasVisibles = () =>
    setSeleccion((actual) => {
      const nueva = new Set(actual);
      if (todasVisiblesSeleccionadas) idsFiltradas.forEach((id) => nueva.delete(id));
      else idsFiltradas.forEach((id) => nueva.add(id));
      return nueva;
    });

  const limpiarSeleccion = () => setSeleccion(new Set());

  const empresasSeleccionadas = empresas.filter((e) => seleccion.has(e.id));
  const seleccionadasConCorreo = empresasSeleccionadas.filter((e) => e.email.trim() !== '');

  /**
   * Envío masivo de la cotización por correo, en LOTES de máximo 10: un correo
   * genérico a muchos desconocidos es spam y Hotmail puede bloquear la cuenta.
   * Cada toque envía un lote; las demás quedan seleccionadas para el siguiente.
   */
  const LOTE_CORREO = 10;
  /** Con vía real activa (Microsoft/Brevo) se pueden enviar tandas grandes. */
  const LOTE_REAL = 50;
  const [enviandoMasivo, setEnviandoMasivo] = useState(false);
  const [progresoMasivo, setProgresoMasivo] = useState<{ hecho: number; total: number } | null>(null);
  const enviarCorreoMasivo = async () => {
    if (seleccionadasConCorreo.length === 0) {
      mostrarToast('Ninguna de las empresas seleccionadas tiene correo. Usa WhatsApp para esas.', 'info');
      return;
    }

    // Con el envío automático activo (Microsoft o Brevo): cada empresa recibe
    // SU cotización personalizada, enviada de verdad, con progreso en vivo.
    const viaReal = envioRealConfigurado(config) && (await medioEnvioDisponible(config)) !== null;
    if (viaReal) {
      const lote = seleccionadasConCorreo.slice(0, LOTE_REAL);
      const restantes = seleccionadasConCorreo.slice(LOTE_REAL);
      setEnviandoMasivo(true);
      setProgresoMasivo({ hecho: 0, total: lote.length });
      let enviados = 0;
      let fallidos = 0;
      for (let i = 0; i < lote.length; i++) {
        const e = lote[i];
        const r = await enviarCotizacionReal(e, config);
        if (r.ok) {
          enviados++;
          if (e.estado === 'pendiente') cambiarEstado(e.id, 'enviado');
          registrarEvento(e.id, 'correo', 'Correo enviado automáticamente');
        } else {
          fallidos++;
        }
        setProgresoMasivo({ hecho: i + 1, total: lote.length });
        // Pausa corta entre envíos: los servidores de correo castigan las ráfagas.
        if (i < lote.length - 1) await new Promise((r2) => setTimeout(r2, 400));
      }
      setEnviandoMasivo(false);
      setProgresoMasivo(null);
      setSeleccion(new Set(restantes.map((e) => e.id)));
      mostrarToast(
        fallidos === 0
          ? `✓ ${enviados} correos enviados.${restantes.length > 0 ? ` Quedan ${restantes.length} seleccionadas: toca el botón otra vez para la siguiente tanda.` : ''}`
          : `${enviados} enviados y ${fallidos} fallaron. Revisa tu internet y vuelve a tocar el botón.`,
        fallidos === 0 ? 'exito' : 'error',
      );
      return;
    }

    const lote = seleccionadasConCorreo.slice(0, LOTE_CORREO);
    const restantes = seleccionadasConCorreo.slice(LOTE_CORREO);
    const { asunto, cuerpo } = generarEmailMasivo(config);
    const correos = lote.map((e) => e.email.trim());
    window.open(urlOutlookMasivo(correos, asunto, cuerpo, config.email), '_blank', 'noopener');
    lote.forEach((e) => {
      if (e.estado === 'pendiente') cambiarEstado(e.id, 'enviado');
      registrarEvento(e.id, 'correo', 'Cotización enviada (correo masivo)');
    });
    setSeleccion(new Set(restantes.map((e) => e.id)));
    mostrarToast(
      restantes.length > 0
        ? `Se abrió tu correo ya escrito para ${lote.length} empresas. Dale «Enviar» y vuelve a tocar el botón: quedan ${restantes.length} para el siguiente grupo.`
        : `Se abrió tu correo ya escrito para ${lote.length} ${lote.length === 1 ? 'empresa' : 'empresas'}. Revisa y dale «Enviar».`,
      'exito',
    );
  };

  const importar = async (evento: React.ChangeEvent<HTMLInputElement>) => {
    const input = evento.target;
    const archivo = input.files?.[0];
    if (!archivo) return;
    try {
      const filas = await importarExcel(archivo);
      if (filas.length === 0) {
        mostrarToast(
          'No encontramos empresas en ese archivo. Revisa que tenga una columna "nombre". Puedes descargar la plantilla como guía.',
          'error',
        );
      } else {
        const { agregadas, duplicadas } = agregarEmpresas(filas, 'excel');
        mostrarToast(
          `${agregadas} ${agregadas === 1 ? 'empresa agregada' : 'empresas agregadas'}, ${duplicadas} ${
            duplicadas === 1 ? 'duplicada omitida' : 'duplicadas omitidas'
          }.`,
          'exito',
        );
      }
    } catch {
      mostrarToast('No pudimos leer el archivo. Revisa que sea un Excel o CSV válido.', 'error');
    } finally {
      input.value = '';
    }
  };

  const guardarFormulario = (datos: NuevaEmpresa) => {
    if (editando) {
      actualizarEmpresa(editando.id, {
        nombre: datos.nombre,
        sector: datos.sector ?? '',
        contacto: datos.contacto ?? '',
        email: datos.email ?? '',
        telefono: datos.telefono ?? '',
        direccion: datos.direccion ?? '',
        notas: datos.notas,
      });
      if (datos.estado && datos.estado !== editando.estado) {
        cambiarEstado(editando.id, datos.estado);
      }
      mostrarToast('Cambios guardados.', 'exito');
    } else {
      const { duplicadas } = agregarEmpresas([datos], 'manual');
      if (duplicadas > 0) {
        mostrarToast('Esa empresa ya estaba en tu lista, no se agregó de nuevo.', 'info');
      } else {
        mostrarToast(`${datos.nombre} quedó agregada a tu lista.`, 'exito');
      }
    }
    setFormAbierto(false);
    setEditando(null);
  };

  const eliminar = (e: Empresa) => {
    if (window.confirm(`¿Eliminar ${e.nombre}?`)) {
      eliminarEmpresa(e.id);
      mostrarToast(`${e.nombre} se eliminó.`, 'info', {
        etiqueta: 'Deshacer',
        fn: () => restaurarEmpresa(e),
      });
    }
  };

  /** Llena con Google el teléfono/web de las empresas visibles que no lo tengan. */
  const completarConGoogle = async () => {
    if (enriqueciendo) return;
    const sinTelefono = filtradas.filter((e) => !e.telefono.trim());
    if (sinTelefono.length === 0) {
      mostrarToast('Las empresas que ves ya tienen teléfono. Usa los filtros para elegir otras.', 'info');
      return;
    }
    const LOTE = 150;
    const objetivo = sinTelefono.slice(0, LOTE);
    if (
      !window.confirm(
        `Google buscará el teléfono y sitio web de ${objetivo.length} empresas (de las que ves sin teléfono). ` +
          `OJO: Google puede COBRAR estas búsquedas a la tarjeta de tu cuenta de Google. ¿Continuar?`,
      )
    ) {
      return;
    }
    detenerEnriq.current = false;
    const ciudad = config.ciudad.split(',')[0] || 'Bogotá';
    let hecho = 0;
    let hallados = 0;
    setEnriqueciendo({ hecho, total: objetivo.length, hallados });
    for (const e of objetivo) {
      if (detenerEnriq.current) break;
      const r = await buscarDatosContacto(e, config.googleMapsApiKey, ciudad);
      hecho++;
      if (r.ok) {
        const cambios: Partial<Empresa> = {};
        if (r.datos.telefono) cambios.telefono = r.datos.telefono;
        if (r.datos.website && !e.notas?.includes(r.datos.website)) {
          cambios.notas = [e.notas, `Sitio web: ${r.datos.website}`].filter(Boolean).join(' · ');
        }
        if (Object.keys(cambios).length > 0) {
          actualizarEmpresa(e.id, cambios);
          registrarEvento(e.id, 'nota', 'Teléfono/web completados con Google');
          hallados++;
        }
      }
      setEnriqueciendo({ hecho, total: objetivo.length, hallados });
      if (hecho < objetivo.length && !detenerEnriq.current) {
        await new Promise((res) => setTimeout(res, 250));
      }
    }
    setEnriqueciendo(null);
    mostrarToast(
      `Listo: se completó el teléfono de ${hallados} de ${hecho} empresas.`,
      hallados > 0 ? 'exito' : 'info',
    );
  };

  /**
   * Botones de acción de una empresa: solo 3, con texto, para que se entiendan
   * sin adivinar íconos. Todo lo demás (correo, llamar, PDF, editar, borrar…)
   * vive dentro de la ficha, bajo «Más opciones».
   */
  const acciones = (e: Empresa) => {
    const whatsapp = urlWhatsApp(e.telefono, generarWhatsApp(e, config));
    const catalogo = urlWhatsAppCatalogo(e, config);
    return (
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="btn-verde px-3 py-2"
          disabled={!whatsapp}
          title={whatsapp ? 'Abrir WhatsApp con el mensaje listo' : 'Sin celular válido'}
          onClick={() => {
            if (!whatsapp) return;
            window.open(whatsapp, '_blank', 'noopener');
            registrarEvento(e.id, 'whatsapp', 'WhatsApp abierto');
          }}
        >
          <MessageCircle className="h-5 w-5" aria-hidden="true" />
          WhatsApp
        </button>
        <button
          type="button"
          className="btn-secundario px-3 py-2"
          disabled={!catalogo}
          title={catalogo ? 'Enviar el catálogo por WhatsApp' : 'Sin celular válido'}
          onClick={() => {
            if (!catalogo) return;
            window.open(catalogo, '_blank', 'noopener');
            registrarEvento(e.id, 'whatsapp', 'Catálogo enviado por WhatsApp');
          }}
        >
          <BookOpen className="h-5 w-5" aria-hidden="true" />
          Catálogo
        </button>
        <button
          type="button"
          className="btn-secundario px-3 py-2"
          aria-label={`Ver ficha de ${e.nombre}`}
          title="Ver todo: llamar, correo, PDF, editar…"
          onClick={() => setFicha(e)}
        >
          Más…
        </button>
      </div>
    );
  };

  const selectorEstado = (e: Empresa) => (
    <select
      aria-label={`Estado de ${e.nombre}`}
      className={`cursor-pointer rounded-full border px-3 py-1.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-300 ${COLOR_ESTADO[e.estado]}`}
      value={e.estado}
      onChange={(evento) => cambiarEstado(e.id, evento.target.value as EstadoEmpresa)}
    >
      {ESTADOS.map((estado) => (
        <option key={estado} value={estado}>
          {ETIQUETA_ESTADO[estado]}
        </option>
      ))}
    </select>
  );

  return (
    <div className="space-y-4">
      {/* Barra de herramientas */}
      <div className="tarjeta space-y-3">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="relative md:col-span-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <input
              type="search"
              className="campo pl-10"
              placeholder="Buscar empresa…"
              aria-label="Buscar empresa por nombre, contacto, correo o dirección"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>
          <select
            className="campo"
            aria-label="Filtrar por sector"
            value={filtroSector}
            onChange={(e) => setFiltroSector(e.target.value)}
          >
            <option value="todos">Todos los sectores</option>
            {sectores.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <select
            className="campo"
            aria-label="Filtrar por estado"
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
          >
            <option value="todos">Todos los estados</option>
            {ESTADOS.map((estado) => (
              <option key={estado} value={estado}>
                {ETIQUETA_ESTADO[estado]}
              </option>
            ))}
          </select>
        </div>

        {/* Filtro de oro: solo las que tienen teléfono o correo real (se pueden contactar). */}
        {totalContactables > 0 && (
          <button
            type="button"
            onClick={() => setSoloContacto((v) => !v)}
            aria-pressed={soloContacto}
            className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 font-semibold transition ${
              soloContacto
                ? 'border-emerald-600 bg-emerald-600 text-white'
                : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Phone className="h-5 w-5" aria-hidden="true" />
            {soloContacto ? 'Mostrando solo con contacto' : `Solo con teléfono/correo (${totalContactables})`}
          </button>
        )}

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn-primario"
            onClick={() => {
              setEditando(null);
              setFormAbierto(true);
            }}
          >
            <Plus className="h-5 w-5" aria-hidden="true" />
            Agregar empresa
          </button>
          <button type="button" className="btn-verde" onClick={onCargarBase} disabled={cargandoBase}>
            {cargandoBase ? (
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
            ) : (
              <Database className="h-5 w-5" aria-hidden="true" />
            )}
            {cargandoBase ? 'Cargando…' : 'Cargar empresas de Bogotá'}
          </button>
          <button type="button" className="btn-secundario" onClick={() => inputArchivo.current?.click()}>
            <Upload className="h-5 w-5" aria-hidden="true" />
            Importar Excel
          </button>
          <input
            ref={inputArchivo}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            aria-hidden="true"
            tabIndex={-1}
            onChange={importar}
          />
          <button
            type="button"
            className="btn-secundario"
            onClick={() => exportarExcel(empresas)}
            disabled={empresas.length === 0}
          >
            <Download className="h-5 w-5" aria-hidden="true" />
            Exportar
          </button>
          <button type="button" className="btn-secundario" onClick={() => descargarPlantilla()}>
            <FileSpreadsheet className="h-5 w-5" aria-hidden="true" />
            Plantilla
          </button>
          {hayClaveGoogle && (
            <button
              type="button"
              className="btn-secundario"
              onClick={() => void completarConGoogle()}
              disabled={enriqueciendo !== null}
              title="Buscar en Google el teléfono y sitio web de las empresas que ves sin teléfono"
            >
              <Sparkles className="h-5 w-5 text-amber-500" aria-hidden="true" />
              Completar teléfonos (Google)
            </button>
          )}
        </div>

        {/* Progreso del llenado con Google */}
        {enriqueciendo && (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="flex items-center gap-2 font-semibold text-slate-700">
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                Buscando teléfonos en Google… {enriqueciendo.hecho} de {enriqueciendo.total}
                {enriqueciendo.hallados > 0 && ` · ${enriqueciendo.hallados} encontrados`}
              </p>
              <button
                type="button"
                className="btn-secundario px-3 py-1.5"
                onClick={() => {
                  detenerEnriq.current = true;
                }}
              >
                Detener
              </button>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all"
                style={{ width: `${Math.round((enriqueciendo.hecho / enriqueciendo.total) * 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {empresas.length === 0 ? (
        <div className="tarjeta flex flex-col items-center gap-4 py-12 text-center">
          <p className="max-w-md text-xl text-slate-600">
            Empieza con nuestra base de empresas reales de Bogotá (1.400 traen teléfono para contactar ya), o importa tu propio Excel.
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <button type="button" className="btn-verde" onClick={onCargarBase} disabled={cargandoBase}>
              {cargandoBase ? (
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
              ) : (
                <Database className="h-5 w-5" aria-hidden="true" />
              )}
              {cargandoBase ? 'Cargando…' : 'Cargar empresas de Bogotá (1.400 con teléfono)'}
            </button>
            <button type="button" className="btn-secundario" onClick={() => inputArchivo.current?.click()}>
              <Upload className="h-5 w-5" aria-hidden="true" />
              Importar Excel
            </button>
            <button type="button" className="btn-secundario" onClick={onIrABuscar}>
              <MapPinned className="h-5 w-5" aria-hidden="true" />
              Buscar en el mapa
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-lg font-semibold text-slate-600">
              Mostrando {filtradas.length} de {empresas.length}{' '}
              {empresas.length === 1 ? 'empresa' : 'empresas'}
            </p>
            {filtradas.length > 0 && (
              <button type="button" className="btn-secundario px-3 py-1.5 text-sm" onClick={alternarTodasVisibles}>
                {todasVisiblesSeleccionadas ? 'Quitar selección' : 'Seleccionar todas'}
              </button>
            )}
          </div>

          {/* Barra de envío masivo: aparece al seleccionar empresas */}
          {seleccion.size > 0 && (
            <div className="sticky top-2 z-20 flex flex-col gap-3 rounded-2xl border border-emerald-300 bg-emerald-50 p-4 shadow-md sm:flex-row sm:items-center sm:justify-between">
              <p className="text-lg font-semibold text-emerald-900">
                {seleccion.size} {seleccion.size === 1 ? 'empresa seleccionada' : 'empresas seleccionadas'}
                {seleccionadasConCorreo.length < seleccion.size && (
                  <span className="ml-1 text-sm font-normal text-emerald-700">
                    ({seleccionadasConCorreo.length} con correo)
                  </span>
                )}
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="btn-verde px-4 py-2"
                  disabled={seleccionadasConCorreo.length === 0 || enviandoMasivo}
                  onClick={() => void enviarCorreoMasivo()}
                >
                  <Mail className="h-5 w-5" aria-hidden="true" />
                  {enviandoMasivo
                    ? progresoMasivo
                      ? `Enviando ${progresoMasivo.hecho} de ${progresoMasivo.total}…`
                      : 'Enviando…'
                    : `Enviar cotización por correo (${
                        seleccionadasConCorreo.length > LOTE_CORREO
                          ? `${LOTE_CORREO} de ${seleccionadasConCorreo.length}`
                          : seleccionadasConCorreo.length
                      })`}
                </button>
                <button type="button" className="btn-secundario px-4 py-2" onClick={limpiarSeleccion}>
                  Limpiar
                </button>
              </div>
            </div>
          )}

          {filtradas.length === 0 ? (
            <div className="tarjeta py-10 text-center text-lg text-slate-600">
              Ninguna empresa coincide con tu búsqueda. Prueba con otras palabras o quita los filtros.
            </div>
          ) : (
            <>
              {/* Tabla en pantallas grandes */}
              <div className="tarjeta hidden overflow-x-auto p-0 md:block">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-200 text-sm uppercase tracking-wide text-slate-500">
                      <th scope="col" className="px-4 py-3">
                        <input
                          type="checkbox"
                          className="h-5 w-5 cursor-pointer accent-emerald-600"
                          checked={todasVisiblesSeleccionadas}
                          onChange={alternarTodasVisibles}
                          aria-label="Seleccionar todas las empresas visibles"
                        />
                      </th>
                      <th scope="col" className="px-4 py-3">
                        Empresa
                      </th>
                      <th scope="col" className="px-4 py-3">
                        Sector
                      </th>
                      <th scope="col" className="px-4 py-3">
                        Contacto
                      </th>
                      <th scope="col" className="px-4 py-3">
                        Estado
                      </th>
                      <th scope="col" className="px-4 py-3">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {visibles.map((e) => (
                      <tr key={e.id} className="align-top hover:bg-slate-50" title={e.notas}>
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            className="h-5 w-5 cursor-pointer accent-emerald-600"
                            checked={seleccion.has(e.id)}
                            onChange={() => alternarSeleccion(e.id)}
                            aria-label={`Seleccionar ${e.nombre}`}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-bold text-slate-800">{e.nombre}</p>
                          {e.contacto && <p className="text-sm text-slate-500">{e.contacto}</p>}
                          {e.notas && (
                            <p className="mt-0.5 max-w-xs truncate text-sm italic text-slate-400">
                              {e.notas}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-600">{e.sector || '—'}</td>
                        <td className="px-4 py-3 text-slate-600">
                          {e.email && <p className="break-all text-sm">{e.email}</p>}
                          {e.telefono && <p className="text-sm">{e.telefono}</p>}
                          {!e.email && !e.telefono && <p className="text-sm text-slate-400">Sin datos</p>}
                        </td>
                        <td className="px-4 py-3">{selectorEstado(e)}</td>
                        <td className="px-4 py-3">{acciones(e)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Tarjetas en celular */}
              <div className="space-y-3 md:hidden">
                {visibles.map((e) => {
                  return (
                    <div key={e.id} className="tarjeta space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <label className="flex items-start gap-2">
                          <input
                            type="checkbox"
                            className="mt-1 h-5 w-5 shrink-0 cursor-pointer accent-emerald-600"
                            checked={seleccion.has(e.id)}
                            onChange={() => alternarSeleccion(e.id)}
                            aria-label={`Seleccionar ${e.nombre}`}
                          />
                          <span>
                            <span className="block text-lg font-bold text-slate-800">{e.nombre}</span>
                            {e.sector && <span className="block text-slate-600">Sector: {e.sector}</span>}
                            {e.contacto && <span className="block text-slate-600">{e.contacto}</span>}
                          </span>
                        </label>
                        {selectorEstado(e)}
                      </div>
                      {e.email && <p className="break-all text-sm text-slate-600">{e.email}</p>}
                      {e.telefono && <p className="text-sm text-slate-600">{e.telefono}</p>}
                      {e.direccion && <p className="text-sm text-slate-600">{e.direccion}</p>}
                      {e.notas && <p className="text-sm italic text-slate-400">{e.notas}</p>}
                      {acciones(e)}
                    </div>
                  );
                })}
              </div>

              {/* Traer las siguientes 100 (evita congelar el navegador) */}
              {filtradas.length > limite && (
                <div className="flex justify-center">
                  <button
                    type="button"
                    className="btn-secundario"
                    onClick={() => setLimite((n) => n + 100)}
                  >
                    Mostrar 100 más (faltan {(filtradas.length - limite).toLocaleString('es-CO')})
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}

      {formAbierto && (
        <EmpresaForm
          inicial={editando}
          onGuardar={guardarFormulario}
          onCerrar={() => {
            setFormAbierto(false);
            setEditando(null);
          }}
        />
      )}

      {ficha && (
        <FichaEmpresa
          empresa={empresas.find((e) => e.id === ficha.id) ?? ficha}
          config={config}
          pedidos={pedidos.filter((p) => p.empresaId === ficha.id)}
          registrarEvento={registrarEvento}
          actualizarEmpresa={actualizarEmpresa}
          crearPedido={crearPedido}
          mostrarToast={mostrarToast}
          onCerrar={() => setFicha(null)}
          onEditar={() => {
            const actual = empresas.find((e) => e.id === ficha.id) ?? ficha;
            setFicha(null);
            setEditando(actual);
            setFormAbierto(true);
          }}
          onEliminar={() => {
            const actual = empresas.find((e) => e.id === ficha.id) ?? ficha;
            setFicha(null);
            eliminar(actual);
          }}
        />
      )}
    </div>
  );
}
