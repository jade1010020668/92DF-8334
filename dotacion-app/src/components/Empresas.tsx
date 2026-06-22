import { useMemo, useRef, useState } from 'react';
import {
  Download,
  FileDown,
  FileSpreadsheet,
  IdCard,
  Mail,
  MapPinned,
  MessageCircle,
  Pencil,
  Phone,
  Plus,
  Search,
  Trash2,
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
import { generarEmail, generarWhatsApp, urlGmail, urlWhatsApp } from '../lib/plantillas';
import { generarPdfCotizacion } from '../lib/pdf';
import { descargarPlantilla, exportarExcel, importarExcel } from '../lib/excel';
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
  registrarEvento: (id: string, tipo: EventoHistorial['tipo'], texto: string) => void;
  crearPedido: (datos: NuevoPedido) => Pedido;
  mostrarToast: MostrarToast;
  onIrABuscar: () => void;
}

export function Empresas({
  empresas,
  config,
  pedidos,
  agregarEmpresas,
  actualizarEmpresa,
  cambiarEstado,
  eliminarEmpresa,
  registrarEvento,
  crearPedido,
  mostrarToast,
  onIrABuscar,
}: Props) {
  const [busqueda, setBusqueda] = useState('');
  const [filtroSector, setFiltroSector] = useState('todos');
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [formAbierto, setFormAbierto] = useState(false);
  const [editando, setEditando] = useState<Empresa | null>(null);
  const [ficha, setFicha] = useState<Empresa | null>(null);
  const inputArchivo = useRef<HTMLInputElement>(null);

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
      if (filtroSector !== 'todos' && e.sector.trim() !== filtroSector) return false;
      if (filtroEstado !== 'todos' && e.estado !== filtroEstado) return false;
      if (!texto) return true;
      return [e.nombre, e.contacto, e.email, e.direccion].some((campo) =>
        normalizar(campo).includes(texto),
      );
    });
  }, [empresas, busqueda, filtroSector, filtroEstado]);

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
    if (window.confirm(`¿Eliminar ${e.nombre}? Esta acción no se puede deshacer.`)) {
      eliminarEmpresa(e.id);
      mostrarToast(`${e.nombre} se eliminó de tu lista.`, 'info');
    }
  };

  /** Botones de acción de una empresa (compartidos entre tabla y tarjetas). */
  const acciones = (e: Empresa) => {
    const correo = generarEmail(e, config);
    const whatsapp = urlWhatsApp(e.telefono, generarWhatsApp(e, config));
    return (
      <div className="flex items-center gap-1">
        <button
          type="button"
          className="btn-icono"
          aria-label={`Ver ficha de ${e.nombre}`}
          title="Ver ficha e historial"
          onClick={() => setFicha(e)}
        >
          <IdCard className="h-5 w-5" aria-hidden="true" />
        </button>
        <button
          type="button"
          className="btn-icono"
          aria-label={`Enviar correo a ${e.nombre}`}
          title="Enviar correo (Gmail)"
          disabled={!e.email}
          onClick={() => {
            window.open(urlGmail(e.email, correo.asunto, correo.cuerpo), '_blank', 'noopener');
            registrarEvento(e.id, 'correo', 'Correo abierto en Gmail');
          }}
        >
          <Mail className="h-5 w-5" aria-hidden="true" />
        </button>
        <button
          type="button"
          className="btn-icono"
          aria-label={`Enviar WhatsApp a ${e.nombre}`}
          title="Enviar WhatsApp"
          disabled={!whatsapp}
          onClick={() => {
            if (!whatsapp) return;
            window.open(whatsapp, '_blank', 'noopener');
            registrarEvento(e.id, 'whatsapp', 'WhatsApp abierto');
          }}
        >
          <MessageCircle className="h-5 w-5" aria-hidden="true" />
        </button>
        <button
          type="button"
          className="btn-icono"
          aria-label={`Llamar a ${e.nombre}`}
          title="Llamar"
          disabled={!e.telefono}
          onClick={() => {
            registrarEvento(e.id, 'llamada', 'Llamada realizada');
            window.location.href = `tel:${e.telefono.replace(/[^+\d]/g, '')}`;
          }}
        >
          <Phone className="h-5 w-5" aria-hidden="true" />
        </button>
        <button
          type="button"
          className="btn-icono"
          aria-label={`Descargar cotización en PDF para ${e.nombre}`}
          title="Descargar cotización en PDF"
          onClick={() => generarPdfCotizacion(e, config)}
        >
          <FileDown className="h-5 w-5" aria-hidden="true" />
        </button>
        <button
          type="button"
          className="btn-icono"
          aria-label={`Editar ${e.nombre}`}
          title="Editar"
          onClick={() => {
            setEditando(e);
            setFormAbierto(true);
          }}
        >
          <Pencil className="h-5 w-5" aria-hidden="true" />
        </button>
        <button
          type="button"
          className="btn-icono hover:bg-rose-50 hover:text-rose-600"
          aria-label={`Eliminar ${e.nombre}`}
          title="Eliminar"
          onClick={() => eliminar(e)}
        >
          <Trash2 className="h-5 w-5" aria-hidden="true" />
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
        </div>
      </div>

      {empresas.length === 0 ? (
        <div className="tarjeta flex flex-col items-center gap-4 py-12 text-center">
          <p className="max-w-md text-xl text-slate-600">
            Aún no tienes empresas. Impórtalas desde Excel o búscalas en el mapa.
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <button type="button" className="btn-primario" onClick={() => inputArchivo.current?.click()}>
              <Upload className="h-5 w-5" aria-hidden="true" />
              Importar Excel
            </button>
            <button type="button" className="btn-verde" onClick={onIrABuscar}>
              <MapPinned className="h-5 w-5" aria-hidden="true" />
              Buscar en el mapa
            </button>
          </div>
        </div>
      ) : (
        <>
          <p className="text-lg font-semibold text-slate-600">
            Mostrando {filtradas.length} de {empresas.length}{' '}
            {empresas.length === 1 ? 'empresa' : 'empresas'}
          </p>

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
                    {filtradas.map((e) => (
                      <tr key={e.id} className="align-top hover:bg-slate-50" title={e.notas}>
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
                {filtradas.map((e) => (
                  <div key={e.id} className="tarjeta space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-lg font-bold text-slate-800">{e.nombre}</p>
                        {e.sector && <p className="text-slate-600">Sector: {e.sector}</p>}
                        {e.contacto && <p className="text-slate-600">{e.contacto}</p>}
                      </div>
                      {selectorEstado(e)}
                    </div>
                    {e.email && <p className="break-all text-sm text-slate-600">{e.email}</p>}
                    {e.telefono && <p className="text-sm text-slate-600">{e.telefono}</p>}
                    {e.direccion && <p className="text-sm text-slate-600">{e.direccion}</p>}
                    {e.notas && <p className="text-sm italic text-slate-400">{e.notas}</p>}
                    {acciones(e)}
                  </div>
                ))}
              </div>
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
          crearPedido={crearPedido}
          mostrarToast={mostrarToast}
          onCerrar={() => setFicha(null)}
        />
      )}
    </div>
  );
}
