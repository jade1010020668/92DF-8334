import { useState } from 'react';
import {
  BookOpen,
  FileDown,
  Footprints,
  Loader2,
  Mail,
  MessageCircle,
  NotebookPen,
  Phone,
  Plus,
  Search,
  ShoppingCart,
  Sparkles,
  X,
} from 'lucide-react';
import type { ConfigApp, Empresa, EventoHistorial, NuevoPedido, Pedido } from '../types';
import {
  generarEmail,
  generarWhatsApp,
  urlBuscarContacto,
  urlOutlook,
  urlWhatsApp,
  urlWhatsAppCatalogo,
  formatearPesos,
} from '../lib/plantillas';
import { buscarDatosContacto } from '../lib/enriquecerGoogle';
import { catalogoParaPedidos } from '../lib/catalogo';
import { generarPdfCotizacion } from '../lib/pdf';
import { saldoPedido, totalPedido } from '../lib/pedidos';
import { ETIQUETA_ESTADO_PEDIDO } from '../types';
import type { MostrarToast } from '../App';
import { PedidoForm } from './PedidoForm';

interface Props {
  empresa: Empresa;
  config: ConfigApp;
  pedidos: Pedido[];
  registrarEvento: (id: string, tipo: EventoHistorial['tipo'], texto: string) => void;
  actualizarEmpresa: (id: string, cambios: Partial<Empresa>) => void;
  crearPedido: (datos: NuevoPedido) => Pedido;
  mostrarToast: MostrarToast;
  onCerrar: () => void;
}

const ICONO_EVENTO: Record<EventoHistorial['tipo'], string> = {
  nota: '📝',
  correo: '✉️',
  whatsapp: '💬',
  llamada: '📞',
  estado: '🔄',
  pedido: '🛒',
  visita: '🚶',
};

function fechaHora(iso: string): string {
  const f = new Date(iso);
  return Number.isNaN(f.getTime())
    ? ''
    : f.toLocaleString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export function FichaEmpresa({
  empresa,
  config,
  pedidos,
  registrarEvento,
  actualizarEmpresa,
  crearPedido,
  mostrarToast,
  onCerrar,
}: Props) {
  const [nota, setNota] = useState('');
  const [pedidoAbierto, setPedidoAbierto] = useState(false);
  const [buscandoTel, setBuscandoTel] = useState(false);

  const conseguirTelefono = async () => {
    setBuscandoTel(true);
    const r = await buscarDatosContacto(empresa, config.googleMapsApiKey, config.ciudad.split(',')[0] || 'Bogotá');
    setBuscandoTel(false);
    if (r.ok) {
      const cambios: Partial<Empresa> = {};
      if (r.datos.telefono) cambios.telefono = r.datos.telefono;
      if (r.datos.website && !empresa.notas?.includes(r.datos.website)) {
        cambios.notas = [empresa.notas, `Sitio web: ${r.datos.website}`].filter(Boolean).join(' · ');
      }
      if (Object.keys(cambios).length > 0) {
        actualizarEmpresa(empresa.id, cambios);
        registrarEvento(empresa.id, 'nota', 'Teléfono/web completados con Google');
        mostrarToast(r.datos.telefono ? `Teléfono encontrado: ${r.datos.telefono}` : 'Sitio web encontrado.', 'exito');
      } else {
        mostrarToast('Google no trae datos nuevos para esta empresa.', 'info');
      }
    } else {
      mostrarToast(r.error, 'error');
    }
  };
  const historial = empresa.historial ?? [];
  const whatsapp = urlWhatsApp(empresa.telefono, generarWhatsApp(empresa, config));
  const whatsappCatalogo = urlWhatsAppCatalogo(empresa, config);
  const correo = generarEmail(empresa, config);

  const abrir = (url: string, tipo: EventoHistorial['tipo'], texto: string) => {
    window.open(url, '_blank', 'noopener');
    registrarEvento(empresa.id, tipo, texto);
  };

  const guardarNota = () => {
    const t = nota.trim();
    if (!t) return;
    registrarEvento(empresa.id, 'nota', t);
    setNota('');
    mostrarToast('Nota guardada en el historial.', 'exito');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-2 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={`Ficha de ${empresa.nombre}`}
    >
      <div className="flex max-h-[96vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="text-xl font-bold text-slate-800 sm:text-2xl">{empresa.nombre}</h2>
            <p className="text-slate-500">
              {[empresa.sector, empresa.contacto, empresa.telefono, empresa.email].filter(Boolean).join(' · ')}
            </p>
          </div>
          <button type="button" className="btn-icono" aria-label="Cerrar ficha" onClick={onCerrar}>
            <X className="h-6 w-6" aria-hidden="true" />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
          {/* Acciones rápidas */}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn-primario px-4 py-2"
              disabled={!empresa.email}
              onClick={() => abrir(urlOutlook(empresa.email, correo.asunto, correo.cuerpo), 'correo', 'Correo enviado')}
            >
              <Mail className="h-5 w-5" aria-hidden="true" />
              Correo
            </button>
            <button
              type="button"
              className="btn-verde px-4 py-2"
              disabled={!whatsapp}
              onClick={() => whatsapp && abrir(whatsapp, 'whatsapp', 'WhatsApp enviado')}
            >
              <MessageCircle className="h-5 w-5" aria-hidden="true" />
              WhatsApp
            </button>
            <button
              type="button"
              className="btn-secundario px-4 py-2"
              disabled={!whatsappCatalogo}
              title={whatsappCatalogo ? 'Enviar el catálogo por WhatsApp' : 'Esta empresa no tiene un celular válido'}
              onClick={() => whatsappCatalogo && abrir(whatsappCatalogo, 'whatsapp', 'Catálogo enviado por WhatsApp')}
            >
              <BookOpen className="h-5 w-5" aria-hidden="true" />
              Catálogo
            </button>
            <button
              type="button"
              className="btn-secundario px-4 py-2"
              disabled={!empresa.telefono}
              onClick={() => {
                registrarEvento(empresa.id, 'llamada', 'Llamada realizada');
                window.location.href = `tel:${empresa.telefono.replace(/[^+\d]/g, '')}`;
              }}
            >
              <Phone className="h-5 w-5" aria-hidden="true" />
              Llamar
            </button>
            <button
              type="button"
              className="btn-secundario px-4 py-2"
              title="Registrar que visitaste esta empresa hoy"
              onClick={() => {
                registrarEvento(empresa.id, 'visita', 'Visitada hoy');
                mostrarToast(`Visita a ${empresa.nombre} registrada.`, 'exito');
              }}
            >
              <Footprints className="h-5 w-5" aria-hidden="true" />
              Visitada hoy
            </button>
            <button
              type="button"
              className="btn-secundario px-4 py-2"
              title="Buscar el teléfono y datos de esta empresa en Google Maps"
              onClick={() =>
                abrir(urlBuscarContacto(empresa, config.ciudad.split(',')[0] || 'Bogotá'), 'nota', 'Buscó contacto en Google')
              }
            >
              <Search className="h-5 w-5" aria-hidden="true" />
              Buscar contacto
            </button>
            {config.googleMapsApiKey.trim() !== '' && !empresa.telefono.trim() && (
              <button
                type="button"
                className="btn-secundario px-4 py-2"
                disabled={buscandoTel}
                onClick={() => void conseguirTelefono()}
                title="Conseguir el teléfono automáticamente con Google"
              >
                {buscandoTel ? (
                  <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                ) : (
                  <Sparkles className="h-5 w-5 text-amber-500" aria-hidden="true" />
                )}
                {buscandoTel ? 'Buscando…' : 'Conseguir teléfono'}
              </button>
            )}
            <button
              type="button"
              className="btn-secundario px-4 py-2"
              onClick={() => generarPdfCotizacion(empresa, config)}
            >
              <FileDown className="h-5 w-5" aria-hidden="true" />
              PDF
            </button>
            <button
              type="button"
              className="btn-secundario px-4 py-2"
              onClick={() => setPedidoAbierto(true)}
            >
              <ShoppingCart className="h-5 w-5" aria-hidden="true" />
              Nuevo pedido
            </button>
          </div>

          {/* Pedidos de la empresa */}
          {pedidos.length > 0 && (
            <section>
              <h3 className="mb-2 font-bold text-slate-700">Pedidos de esta empresa</h3>
              <ul className="space-y-1">
                {pedidos.map((p) => {
                  const saldo = saldoPedido(p);
                  return (
                    <li key={p.id} className="flex flex-wrap justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2">
                      <span className="font-semibold text-slate-700">
                        {formatearPesos(totalPedido(p))} · {ETIQUETA_ESTADO_PEDIDO[p.estado]}
                      </span>
                      {saldo > 0 && <span className="text-amber-700">Saldo {formatearPesos(saldo)}</span>}
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {/* Agregar nota */}
          <section>
            <h3 className="mb-2 flex items-center gap-2 font-bold text-slate-700">
              <NotebookPen className="h-5 w-5 text-slate-700" aria-hidden="true" />
              Anotar en el historial
            </h3>
            <div className="flex gap-2">
              <input
                className="campo"
                placeholder="Ej: Llamé, pidió cotización de 20 overoles talla 40"
                value={nota}
                onChange={(e) => setNota(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') guardarNota();
                }}
              />
              <button type="button" className="btn-primario shrink-0" onClick={guardarNota}>
                <Plus className="h-5 w-5" aria-hidden="true" />
                Anotar
              </button>
            </div>
          </section>

          {/* Historial */}
          <section>
            <h3 className="mb-2 font-bold text-slate-700">Historial de gestión</h3>
            {historial.length === 0 ? (
              <p className="text-slate-500">
                Aún no hay actividad. Cada correo, WhatsApp, llamada, cambio de estado o nota quedará
                registrado aquí con su fecha.
              </p>
            ) : (
              <ol className="space-y-2">
                {historial.map((ev) => (
                  <li key={ev.id} className="flex gap-3 border-l-2 border-slate-200 pl-3">
                    <span aria-hidden="true">{ICONO_EVENTO[ev.tipo]}</span>
                    <div>
                      <p className="text-slate-700">{ev.texto}</p>
                      <p className="text-sm text-slate-400">{fechaHora(ev.fecha)}</p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>
      </div>

      {pedidoAbierto && (
        <PedidoForm
          empresas={[empresa]}
          empresaIdInicial={empresa.id}
          catalogo={catalogoParaPedidos(config)}
          onGuardar={(datos) => {
            crearPedido(datos);
            registrarEvento(empresa.id, 'pedido', `Pedido por ${formatearPesos(totalPedido(datos))}`);
            setPedidoAbierto(false);
            mostrarToast('Pedido creado.', 'exito');
          }}
          onCerrar={() => setPedidoAbierto(false)}
        />
      )}
    </div>
  );
}
