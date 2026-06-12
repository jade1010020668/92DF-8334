import { useRef, useState } from 'react';
import {
  AlertTriangle,
  Check,
  Copy,
  FileDown,
  Loader2,
  Mail,
  MessageCircle,
  PartyPopper,
  Phone,
  X,
  Zap,
} from 'lucide-react';
import type { ConfigApp, Empresa, EstadoEmpresa } from '../types';
import { generarEmail, generarWhatsApp, urlGmail, urlWhatsApp } from '../lib/plantillas';
import { enviarCorreoBrevo } from '../lib/brevo';
import { generarPdfCotizacion } from '../lib/pdf';
import type { MostrarToast } from '../App';

interface Props {
  empresas: Empresa[];
  config: ConfigApp;
  cambiarEstado: (id: string, estado: EstadoEmpresa) => void;
  mostrarToast: MostrarToast;
  onCerrar: () => void;
}

type SubPestana = 'correo' | 'whatsapp';

export function Campana({ empresas, config, cambiarEstado, mostrarToast, onCerrar }: Props) {
  // La cola se captura una sola vez al abrir la campaña.
  const [cola] = useState<string[]>(() =>
    empresas.filter((e) => e.estado === 'pendiente').map((e) => e.id),
  );
  const [indice, setIndice] = useState(0);
  const [enviadas, setEnviadas] = useState(0);
  const [subPestana, setSubPestana] = useState<SubPestana>('correo');
  const [enviandoBrevo, setEnviandoBrevo] = useState(false);
  const [masivo, setMasivo] = useState<{ hecho: number; total: number; fallidas: number } | null>(
    null,
  );
  const detenerMasivo = useRef(false);
  const brevoActivo = config.brevoApiKey.trim() !== '';

  // Busca la empresa actual "viva": si alguna ya no está pendiente, se salta sola.
  let posicion = indice;
  let actual: Empresa | undefined;
  while (posicion < cola.length) {
    const viva = empresas.find((e) => e.id === cola[posicion]);
    if (viva && viva.estado === 'pendiente') {
      actual = viva;
      break;
    }
    posicion++;
  }

  const copiar = async (texto: string) => {
    try {
      await navigator.clipboard.writeText(texto);
      mostrarToast('Mensaje copiado. Ya lo puedes pegar donde lo necesites.', 'exito');
    } catch {
      mostrarToast('No se pudo copiar el mensaje. Selecciónalo y cópialo a mano.', 'error');
    }
  };

  const enviarActualPorBrevo = async () => {
    if (!actual) return;
    setEnviandoBrevo(true);
    const resultado = await enviarCorreoBrevo(actual, config);
    setEnviandoBrevo(false);
    if (resultado.ok) {
      mostrarToast(`Correo enviado a ${actual.nombre}.`, 'exito');
      cambiarEstado(actual.id, 'enviado');
      setEnviadas((n) => n + 1);
      setIndice(posicion + 1);
      setSubPestana('correo');
    } else {
      mostrarToast(resultado.error, 'error');
    }
  };

  const enviarTodosPorBrevo = async () => {
    const porEnviar = cola
      .slice(posicion)
      .map((id) => empresas.find((e) => e.id === id))
      .filter((e): e is Empresa => !!e && e.estado === 'pendiente' && e.email.trim() !== '');
    if (porEnviar.length === 0) {
      mostrarToast('Ninguna de las empresas pendientes tiene correo.', 'info');
      return;
    }
    if (
      !window.confirm(
        `¿Enviar ${porEnviar.length} correos de una vez por Brevo? Saldrán automáticamente, sin revisarlos uno por uno.`,
      )
    ) {
      return;
    }
    detenerMasivo.current = false;
    let hecho = 0;
    let fallidas = 0;
    setMasivo({ hecho, total: porEnviar.length, fallidas });
    for (const e of porEnviar) {
      if (detenerMasivo.current) break;
      const resultado = await enviarCorreoBrevo(e, config);
      hecho++;
      if (resultado.ok) {
        cambiarEstado(e.id, 'enviado');
        setEnviadas((n) => n + 1);
      } else {
        fallidas++;
      }
      setMasivo({ hecho, total: porEnviar.length, fallidas });
      if (hecho < porEnviar.length && !detenerMasivo.current) {
        // Pausa corta entre envíos para no parecer ráfaga de spam.
        await new Promise((r) => setTimeout(r, 1200));
      }
    }
    setMasivo(null);
    const exitosos = hecho - fallidas;
    mostrarToast(
      fallidas === 0
        ? `¡Listo! Se ${exitosos === 1 ? 'envió 1 correo' : `enviaron ${exitosos} correos`}.`
        : `Se enviaron ${exitosos} correos y fallaron ${fallidas}. Revisa los datos de las que fallaron.`,
      fallidas === 0 ? 'exito' : 'info',
    );
  };

  const email = actual ? generarEmail(actual, config) : null;
  const whatsappTexto = actual ? generarWhatsApp(actual, config) : '';
  const linkWhatsApp = actual ? urlWhatsApp(actual.telefono, whatsappTexto) : null;
  const sinContacto = actual ? !actual.email && !linkWhatsApp : false;
  const progreso = cola.length > 0 ? Math.round((Math.min(posicion, cola.length) / cola.length) * 100) : 100;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-2 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Campaña de cotizaciones"
    >
      <div className="flex max-h-[96vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* Cabecera */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div className="flex-1">
            <h2 className="text-xl font-bold text-slate-800 sm:text-2xl">
              Campaña de cotizaciones
              {actual && (
                <span className="font-semibold text-slate-500">
                  {' '}
                  — Empresa {posicion + 1} de {cola.length}
                </span>
              )}
            </h2>
            <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-blue-600 transition-all"
                style={{ width: `${actual ? progreso : 100}%` }}
              />
            </div>
          </div>
          <button type="button" className="btn-icono" aria-label="Cerrar campaña" onClick={onCerrar}>
            <X className="h-6 w-6" aria-hidden="true" />
          </button>
        </div>

        {masivo ? (
          /* Envío masivo en curso */
          <div className="flex flex-col items-center gap-4 px-6 py-12 text-center">
            <Loader2 className="h-14 w-14 animate-spin text-blue-700" aria-hidden="true" />
            <h3 className="text-2xl font-bold text-slate-800">Enviando correos…</h3>
            <p className="text-lg text-slate-600">
              {masivo.hecho} de {masivo.total}
              {masivo.fallidas > 0 &&
                ` — ${masivo.fallidas} ${masivo.fallidas === 1 ? 'fallido' : 'fallidos'}`}
            </p>
            <div className="h-3 w-full max-w-md overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all"
                style={{ width: `${Math.round((masivo.hecho / masivo.total) * 100)}%` }}
              />
            </div>
            <button
              type="button"
              className="btn-secundario"
              onClick={() => {
                detenerMasivo.current = true;
              }}
            >
              Detener
            </button>
          </div>
        ) : actual && email ? (
          <>
            {/* Cuerpo escroleable */}
            <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
              {/* Datos de la empresa */}
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-2xl font-bold text-slate-800">{actual.nombre}</p>
                <div className="mt-1 space-y-0.5 text-slate-600">
                  {actual.sector && <p>Sector: {actual.sector}</p>}
                  {actual.contacto && <p>Contacto: {actual.contacto}</p>}
                  {actual.email && <p>Correo: {actual.email}</p>}
                  {actual.telefono && <p>Teléfono: {actual.telefono}</p>}
                  {actual.direccion && <p>Dirección: {actual.direccion}</p>}
                </div>
              </div>

              {sinContacto && (
                <div className="flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-900">
                  <AlertTriangle className="mt-0.5 h-6 w-6 shrink-0 text-amber-600" aria-hidden="true" />
                  <p className="text-lg">
                    Esta empresa no tiene correo ni celular válido. Puedes saltarla y completar sus
                    datos en la pestaña Empresas.
                  </p>
                </div>
              )}

              {/* Sub-pestañas de mensaje */}
              <div>
                <div className="flex gap-2">
                  {(
                    [
                      { id: 'correo' as const, etiqueta: 'Correo' },
                      { id: 'whatsapp' as const, etiqueta: 'WhatsApp' },
                    ]
                  ).map(({ id, etiqueta }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setSubPestana(id)}
                      className={`rounded-t-xl px-5 py-2.5 font-semibold transition ${
                        subPestana === id
                          ? 'border border-b-0 border-slate-200 bg-white text-blue-700'
                          : 'bg-slate-100 text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      {etiqueta}
                    </button>
                  ))}
                </div>
                <div className="rounded-b-2xl rounded-tr-2xl border border-slate-200 p-4">
                  {subPestana === 'correo' ? (
                    <div className="space-y-3">
                      <div>
                        <label htmlFor="campana-asunto" className="etiqueta">
                          Asunto
                        </label>
                        <input
                          id="campana-asunto"
                          className="campo text-sm"
                          value={email.asunto}
                          readOnly
                        />
                      </div>
                      <div>
                        <label htmlFor="campana-cuerpo" className="etiqueta">
                          Mensaje
                        </label>
                        <textarea
                          id="campana-cuerpo"
                          className="campo text-sm"
                          rows={11}
                          value={email.cuerpo}
                          readOnly
                        />
                      </div>
                      <button
                        type="button"
                        className="btn-secundario px-4 py-2"
                        onClick={() => copiar(`Asunto: ${email.asunto}\n\n${email.cuerpo}`)}
                      >
                        <Copy className="h-5 w-5" aria-hidden="true" />
                        Copiar
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div>
                        <label htmlFor="campana-whatsapp" className="etiqueta">
                          Mensaje de WhatsApp
                        </label>
                        <textarea
                          id="campana-whatsapp"
                          className="campo text-sm"
                          rows={11}
                          value={whatsappTexto}
                          readOnly
                        />
                      </div>
                      <button
                        type="button"
                        className="btn-secundario px-4 py-2"
                        onClick={() => copiar(whatsappTexto)}
                      >
                        <Copy className="h-5 w-5" aria-hidden="true" />
                        Copiar
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Acciones de envío */}
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {brevoActivo && (
                  <button
                    type="button"
                    className="btn-primario"
                    disabled={!actual.email || enviandoBrevo}
                    title={actual.email ? undefined : 'Esta empresa no tiene correo'}
                    onClick={enviarActualPorBrevo}
                  >
                    {enviandoBrevo ? (
                      <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                    ) : (
                      <Zap className="h-5 w-5" aria-hidden="true" />
                    )}
                    {enviandoBrevo ? 'Enviando…' : 'Enviar correo ya'}
                  </button>
                )}
                <button
                  type="button"
                  className={brevoActivo ? 'btn-secundario' : 'btn-primario'}
                  disabled={!actual.email}
                  title={actual.email ? undefined : 'Esta empresa no tiene correo'}
                  onClick={() =>
                    window.open(urlGmail(actual.email, email.asunto, email.cuerpo), '_blank', 'noopener')
                  }
                >
                  <Mail className="h-5 w-5" aria-hidden="true" />
                  Abrir Gmail
                </button>
                <button
                  type="button"
                  className="btn-verde"
                  disabled={!linkWhatsApp}
                  title={linkWhatsApp ? undefined : 'Esta empresa no tiene un celular válido'}
                  onClick={() => linkWhatsApp && window.open(linkWhatsApp, '_blank', 'noopener')}
                >
                  <MessageCircle className="h-5 w-5" aria-hidden="true" />
                  Abrir WhatsApp
                </button>
                <button
                  type="button"
                  className="btn-secundario"
                  disabled={!actual.telefono}
                  title={actual.telefono ? undefined : 'Esta empresa no tiene teléfono'}
                  onClick={() => {
                    window.location.href = `tel:${actual.telefono.replace(/[^+\d]/g, '')}`;
                  }}
                >
                  <Phone className="h-5 w-5" aria-hidden="true" />
                  Llamar
                </button>
                <button
                  type="button"
                  className="btn-secundario"
                  onClick={() => generarPdfCotizacion(actual, config)}
                >
                  <FileDown className="h-5 w-5" aria-hidden="true" />
                  Descargar PDF
                </button>
              </div>

              {brevoActivo && (
                <button
                  type="button"
                  className="btn-secundario w-full"
                  disabled={enviandoBrevo}
                  onClick={enviarTodosPorBrevo}
                >
                  <Zap className="h-5 w-5 text-amber-500" aria-hidden="true" />
                  Enviar TODOS los pendientes con correo de una vez
                </button>
              )}
            </div>

            {/* Pie */}
            <div className="flex flex-col gap-2 border-t border-slate-200 px-5 py-4 sm:flex-row">
              <button
                type="button"
                className="btn-verde flex-1 text-lg"
                disabled={enviandoBrevo}
                onClick={() => {
                  cambiarEstado(actual.id, 'enviado');
                  setEnviadas((n) => n + 1);
                  setIndice(posicion + 1);
                  setSubPestana('correo');
                }}
              >
                <Check className="h-6 w-6" aria-hidden="true" />
                Marcar como enviada y seguir
              </button>
              <button
                type="button"
                className="btn-secundario"
                disabled={enviandoBrevo}
                onClick={() => {
                  setIndice(posicion + 1);
                  setSubPestana('correo');
                }}
              >
                Saltar
              </button>
            </div>
          </>
        ) : (
          /* Pantalla final */
          <div className="flex flex-col items-center gap-4 px-6 py-12 text-center">
            <PartyPopper className="h-16 w-16 text-emerald-600" aria-hidden="true" />
            <h3 className="text-2xl font-bold text-slate-800">¡Campaña terminada!</h3>
            <p className="text-lg text-slate-600">
              Marcaste {enviadas} {enviadas === 1 ? 'cotización' : 'cotizaciones'} como{' '}
              {enviadas === 1 ? 'enviada' : 'enviadas'}.
            </p>
            <button type="button" className="btn-primario px-10" onClick={onCerrar}>
              Cerrar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
