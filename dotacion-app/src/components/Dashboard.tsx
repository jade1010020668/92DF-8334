import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Bell,
  BookOpen,
  Inbox,
  Building2,
  CalendarCheck,
  Clock,
  Database,
  Download,
  Loader2,
  Mail,
  MessageCircle,
  Reply,
  Rocket,
  Send,
  Trophy,
  Truck,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ConfigApp, Empresa, Pedido } from '../types';
import type { MostrarToast } from '../App';
import { diasDesdeUltimaExportacion, faltanDatosContacto, registrarExportacion } from '../lib/config';
import { descargarRespaldo } from '../lib/respaldo';
import { calcularKpis, seguimientosPendientes } from '../lib/stats';
import { entregasDeHoy, textoDiasEntrega } from '../lib/agenda';
import { correoAutomaticoConfigurado, cruzarRespuestas, remitentesRecientes } from '../lib/msoft';
import { envioRealConfigurado } from '../lib/envioReal';
import { formatearPesos } from '../lib/plantillas';
import { totalPedido } from '../lib/pedidos';
import {
  generarEmailSeguimiento,
  generarWhatsApp,
  generarWhatsAppSeguimiento,
  urlOutlook,
  urlWhatsApp,
  urlWhatsAppCatalogo,
} from '../lib/plantillas';
import { distanciaMetros, formatearDistancia } from '../lib/maps';

interface Props {
  empresas: Empresa[];
  config: ConfigApp;
  pedidos: Pedido[];
  actualizarEmpresa: (id: string, cambios: Partial<Empresa>) => void;
  cambiarEstado: (id: string, estado: Empresa['estado']) => void;
  mostrarToast: MostrarToast;
  onAbrirCampana: () => void;
  onIrAConfiguracion: () => void;
  onIrABuscar: () => void;
  onIrAPedidos: () => void;
  onCargarBase: () => void;
  cargandoBase: boolean;
}

interface TarjetaKpi {
  etiqueta: string;
  valor: number;
  Icono: LucideIcon;
  acento: string;
  fondoIcono: string;
}

export function Dashboard({
  empresas,
  config,
  pedidos,
  actualizarEmpresa,
  cambiarEstado,
  mostrarToast,
  onAbrirCampana,
  onIrAConfiguracion,
  onIrABuscar,
  onIrAPedidos,
  onCargarBase,
  cargandoBase,
}: Props) {
  const kpis = calcularKpis(empresas);
  const seguimientos = seguimientosPendientes(empresas, config.diasSeguimiento);
  const entregasHoy = entregasDeHoy(pedidos);

  // «Revisar respuestas»: lee la bandeja (correo conectado) y marca quién contestó.
  const [revisando, setRevisando] = useState(false);
  const revisarRespuestas = async () => {
    setRevisando(true);
    const r = await remitentesRecientes(config);
    setRevisando(false);
    if (!r.ok) {
      mostrarToast(r.error, 'error');
      return;
    }
    const respondieron = cruzarRespuestas(empresas, r.correos);
    respondieron.forEach((e) => cambiarEstado(e.id, 'respondio'));
    mostrarToast(
      respondieron.length > 0
        ? `🎉 ${respondieron.length} ${respondieron.length === 1 ? 'empresa respondió' : 'empresas respondieron'}: ${respondieron
            .slice(0, 3)
            .map((e) => e.nombre)
            .join(', ')}${respondieron.length > 3 ? '…' : ''}`
        : 'Ninguna respuesta nueva por ahora.',
      respondieron.length > 0 ? 'exito' : 'info',
    );
  };

  // "Para contactar hoy": las 5 pendientes con WhatsApp más cercanas al
  // negocio. La primera pantalla del día debe ser vender, no mirar números.
  const contactarHoy = useMemo(() => {
    const origen =
      Number.isFinite(config.negocioLat) && Number.isFinite(config.negocioLon)
        ? { lat: config.negocioLat as number, lon: config.negocioLon as number }
        : null;
    return empresas
      .filter((e) => e.estado === 'pendiente' && urlWhatsApp(e.telefono, 'x') !== null)
      .map((e) => ({
        empresa: e,
        metros:
          origen && e.lat != null && e.lon != null
            ? distanciaMetros(origen, { lat: e.lat, lon: e.lon })
            : Number.POSITIVE_INFINITY,
      }))
      .sort((a, b) => a.metros - b.metros)
      .slice(0, 5);
  }, [empresas, config.negocioLat, config.negocioLon]);

  /** Abre el WhatsApp y marca la empresa sola (con «Deshacer» por si acaso). */
  const contactarPorWhatsApp = (empresa: Empresa) => {
    const url = urlWhatsApp(empresa.telefono, generarWhatsApp(empresa, config));
    if (!url) return;
    window.open(url, '_blank', 'noopener');
    cambiarEstado(empresa.id, 'enviado');
    mostrarToast(`${empresa.nombre} quedó marcada como contactada.`, 'exito', {
      etiqueta: 'Deshacer',
      fn: () => cambiarEstado(empresa.id, 'pendiente'),
    });
  };
  // Solo cuentan las pendientes que se pueden contactar (WhatsApp o correo).
  const contactablesPend = empresas.filter(
    (e) => e.estado === 'pendiente' && (e.email.trim() !== '' || urlWhatsApp(e.telefono, 'x') !== null),
  ).length;
  // Cambia tras exportar para recalcular el aviso de copia de seguridad.
  const [, setRefrescoRespaldo] = useState(0);
  // Aviso de una sola vez por aparato: la lista vive en ESTE dispositivo.
  const [avisoDispositivoVisto, setAvisoDispositivoVisto] = useState(() => {
    try { return localStorage.getItem('dotacionpro.avisoDispositivo') === 'si'; } catch { return true; }
  });
  const cerrarAvisoDispositivo = () => {
    try { localStorage.setItem('dotacionpro.avisoDispositivo', 'si'); } catch { /* sin storage no insistimos */ }
    setAvisoDispositivoVisto(true);
  };
  const diasSinRespaldo = diasDesdeUltimaExportacion();
  const sugerirRespaldo = empresas.length >= 10 && (diasSinRespaldo === null || diasSinRespaldo >= 7);

  // Paleta sobria: tarjetas neutras; solo "Clientes" lleva el acento esmeralda.
  const tarjetas: TarjetaKpi[] = [
    {
      etiqueta: 'Empresas totales',
      valor: kpis.total,
      Icono: Building2,
      acento: 'text-slate-900',
      fondoIcono: 'bg-slate-100 text-slate-700',
    },
    {
      etiqueta: 'Pendientes',
      valor: kpis.pendientes,
      Icono: Clock,
      acento: 'text-slate-900',
      fondoIcono: 'bg-slate-100 text-slate-700',
    },
    {
      etiqueta: 'Cotizaciones enviadas',
      valor: kpis.enviadas,
      Icono: Send,
      acento: 'text-slate-900',
      fondoIcono: 'bg-slate-100 text-slate-700',
    },
    {
      etiqueta: 'Respondieron',
      valor: kpis.respondieron + kpis.clientes,
      Icono: Reply,
      acento: 'text-slate-900',
      fondoIcono: 'bg-slate-100 text-slate-700',
    },
    {
      etiqueta: 'Clientes',
      valor: kpis.clientes,
      Icono: Trophy,
      acento: 'text-emerald-700',
      fondoIcono: 'bg-emerald-50 text-emerald-700',
    },
  ];

  /** Abre el seguimiento y reinicia el contador solo (con «Deshacer»). */
  const abrirSeguimiento = (empresa: Empresa, url: string) => {
    const fechaAnterior = empresa.fechaEnvio;
    window.open(url, '_blank', 'noopener');
    actualizarEmpresa(empresa.id, { fechaEnvio: new Date().toISOString() });
    mostrarToast(`Seguimiento a ${empresa.nombre} registrado.`, 'exito', {
      etiqueta: 'Deshacer',
      fn: () => actualizarEmpresa(empresa.id, { fechaEnvio: fechaAnterior }),
    });
  };

  return (
    <div className="space-y-6">
      {/* Aviso de datos incompletos */}
      {faltanDatosContacto(config) && (
        <div className="flex flex-col items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-5 sm:flex-row sm:items-center">
          <AlertTriangle className="h-7 w-7 shrink-0 text-amber-600" aria-hidden="true" />
          <p className="flex-1 text-lg text-amber-900">
            ⚠️ Faltan datos de tu empresa (teléfono, correo o quién firma). Salen en cada mensaje y
            cotización.
          </p>
          <button type="button" className="btn-primario" onClick={onIrAConfiguracion}>
            Completar ahora
          </button>
        </div>
      )}

      {/* Una sola vez por aparato: dónde vive la información */}
      {kpis.total > 0 && !avisoDispositivoVisto && (
        <div className="flex flex-col items-start gap-3 rounded-2xl border border-sky-200 bg-sky-50 p-5 sm:flex-row sm:items-center">
          <Download className="h-7 w-7 shrink-0 text-sky-700" aria-hidden="true" />
          <p className="flex-1 text-sky-900">
            <strong>Bueno saberlo:</strong> tu lista se guarda <strong>en este aparato</strong> y no se
            borra al cerrar. Pero el celular y el computador no se comparten solos: para pasarla o ante
            cualquier percance, usa <strong>«Guardar copia de mi lista»</strong> (la app te lo recuerda
            cada semana).
          </p>
          <button type="button" className="btn-secundario shrink-0" onClick={cerrarAvisoDispositivo}>
            Entendido
          </button>
        </div>
      )}

      {/* Falta 1 paso para que los correos salgan solos */}
      {kpis.total > 0 && !envioRealConfigurado(config) && (
        <div className="flex flex-col items-start gap-3 rounded-2xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-center">
          <Mail className="h-7 w-7 shrink-0 text-slate-700" aria-hidden="true" />
          <p className="flex-1 text-lg text-slate-700">
            Hoy los correos se abren en tu Outlook para que tú des «Enviar». ¿Quieres que{' '}
            <strong>salgan solos con un clic</strong>? Se activa gratis una sola vez (5 minutos).
          </p>
          <button type="button" className="btn-primario shrink-0" onClick={onIrAConfiguracion}>
            Activar envío automático
          </button>
        </div>
      )}

      {/* Para hoy: entregas comprometidas para hoy o atrasadas */}
      {entregasHoy.length > 0 && (
        <section className="rounded-2xl border border-amber-300 bg-amber-50 p-5">
          <h2 className="mb-3 flex items-center gap-2 text-xl font-bold text-amber-900">
            <CalendarCheck className="h-6 w-6 text-amber-700" aria-hidden="true" />
            Para hoy: {entregasHoy.length} entrega{entregasHoy.length === 1 ? '' : 's'}
          </h2>
          <ul className="divide-y divide-amber-200">
            {entregasHoy.map(({ pedido, dias, atrasada }) => (
              <li
                key={pedido.id}
                className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Truck className="h-5 w-5 text-amber-700" aria-hidden="true" />
                  <span className="text-lg font-bold text-slate-800">{pedido.empresaNombre}</span>
                  <span className="font-semibold text-slate-600">
                    {formatearPesos(totalPedido(pedido))}
                  </span>
                  <span
                    className={`insignia ${
                      atrasada
                        ? 'border-rose-300 bg-rose-100 text-rose-700'
                        : 'border-amber-300 bg-amber-100 text-amber-800'
                    }`}
                  >
                    {atrasada ? `Atrasada (${textoDiasEntrega(dias)})` : 'Entrega hoy'}
                  </span>
                </div>
                <button type="button" className="btn-secundario px-4 py-2" onClick={onIrAPedidos}>
                  Ver pedido
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Para contactar hoy: las 5 más cercanas listas para WhatsApp */}
      {contactarHoy.length > 0 && (
        <section className="tarjeta">
          <h2 className="mb-1 flex items-center gap-2 text-xl font-bold text-slate-800">
            <MessageCircle className="h-6 w-6 text-emerald-700" aria-hidden="true" />
            Para contactar hoy
          </h2>
          <p className="mb-3 text-slate-600">
            Las {contactarHoy.length} empresas pendientes más cercanas a tu negocio, con el WhatsApp listo.
          </p>
          <ul className="divide-y divide-slate-100">
            {contactarHoy.map(({ empresa, metros }) => (
              <li
                key={empresa.id}
                className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-lg font-bold text-slate-800">{empresa.nombre}</span>
                  {Number.isFinite(metros) && (
                    <span className="insignia border-slate-200 bg-slate-100 text-slate-600">
                      a {formatearDistancia(metros)}
                    </span>
                  )}
                  {empresa.sector.trim() && (
                    <span className="text-sm text-slate-500">{empresa.sector}</span>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="btn-verde px-4 py-2"
                    onClick={() => contactarPorWhatsApp(empresa)}
                  >
                    <MessageCircle className="h-5 w-5" aria-hidden="true" />
                    WhatsApp
                  </button>
                  <button
                    type="button"
                    className="btn-secundario px-4 py-2"
                    title="Enviar el catálogo con precios por WhatsApp"
                    onClick={() => {
                      const url = urlWhatsAppCatalogo(empresa, config);
                      if (url) window.open(url, '_blank', 'noopener');
                    }}
                  >
                    <BookOpen className="h-5 w-5" aria-hidden="true" />
                    Catálogo
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Primeros pasos (solo cuando la lista está vacía) */}
      {kpis.total === 0 && (
        <div className="tarjeta space-y-4">
          <h2 className="flex items-center gap-2 text-xl font-bold text-slate-800">
            <Rocket className="h-6 w-6 text-slate-700" aria-hidden="true" />
            Primeros pasos
          </h2>
          <ol className="list-inside list-decimal space-y-2 text-lg text-slate-700">
            <li>
              Completa los datos de tu empresa en <strong>Configuración</strong> (teléfono, correo y
              quién firma).
            </li>
            <li>
              Carga tus primeras empresas: <strong>busca clientes cerca de tu negocio</strong> en el
              mapa o <strong>importa un Excel</strong>.
            </li>
            <li>
              Vuelve aquí y toca <strong>«Enviar a X pendientes»</strong>. La app te muestra cada
              correo y WhatsApp ya escritos.
            </li>
          </ol>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-primario" onClick={onIrAConfiguracion}>
              1. Ir a Configuración
            </button>
            <button type="button" className="btn-verde" onClick={onCargarBase} disabled={cargandoBase}>
              {cargandoBase ? (
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
              ) : (
                <Database className="h-5 w-5" aria-hidden="true" />
              )}
              {cargandoBase ? 'Cargando…' : '2. Cargar empresas de Bogotá (1.400 con teléfono)'}
            </button>
            <button type="button" className="btn-secundario" onClick={onIrABuscar}>
              o buscar en el mapa
            </button>
          </div>
          <p className="text-sm text-slate-500">
            La base trae empresas reales (talleres, ferreterías, fábricas, restaurantes…) cercanas a tu
            negocio, listas para cotizarles. También puedes importar tu propio Excel desde «Empresas».
          </p>
        </div>
      )}

      {/* Recordatorio de copia de seguridad */}
      {sugerirRespaldo && (
        <div className="flex flex-col items-start gap-3 rounded-2xl border bg-slate-50 p-5 sm:flex-row sm:items-center">
          <Download className="h-7 w-7 shrink-0 text-slate-700" aria-hidden="true" />
          <p className="flex-1 text-lg text-slate-700">
            {diasSinRespaldo === null
              ? 'Aún no has guardado una copia de seguridad de tu lista.'
              : `Llevas ${diasSinRespaldo} días sin guardar copia de seguridad.`}{' '}
            Tu lista vive en este navegador: exporta el Excel para no perderla.
          </p>
          <button
            type="button"
            className="btn-primario"
            onClick={() => {
              descargarRespaldo(empresas, config, pedidos);
              registrarExportacion();
              setRefrescoRespaldo((n) => n + 1);
              mostrarToast('Copia guardada. Ese archivo restaura TODO si cambias de equipo.', 'exito');
            }}
          >
            Guardar copia de mi lista
          </button>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
        {tarjetas.map(({ etiqueta, valor, Icono, acento, fondoIcono }) => (
          <div key={etiqueta} className="tarjeta flex flex-col gap-2">
            <span className={`inline-flex h-11 w-11 items-center justify-center rounded-xl ${fondoIcono}`}>
              <Icono className="h-6 w-6" aria-hidden="true" />
            </span>
            <p className={`text-3xl font-bold lg:text-4xl ${acento}`}>{valor}</p>
            <p className="font-semibold text-slate-600">{etiqueta}</p>
          </div>
        ))}
      </div>

      {/* CTA de campaña — solo cuenta las empresas que sí se pueden contactar */}
      <div className="tarjeta flex flex-col items-center gap-3 py-8 text-center">
        <button
          type="button"
          className="btn-verde w-full max-w-xl px-8 py-5 text-xl sm:text-2xl"
          onClick={onAbrirCampana}
          disabled={contactablesPend === 0}
        >
          <Send className="h-7 w-7" aria-hidden="true" />
          {contactablesPend > 0
            ? `Contactar a ${contactablesPend} cliente${contactablesPend === 1 ? '' : 's'}`
            : 'No hay clientes con contacto'}
        </button>
        <p className="max-w-xl text-lg text-slate-600">
          La app abre cada empresa con el <strong>WhatsApp ya escrito</strong>. Tú solo das «Enviar».
          {kpis.pendientes > contactablesPend && contactablesPend >= 0 && (
            <>
              {' '}
              {kpis.pendientes - contactablesPend} empresas más no tienen teléfono ni correo todavía;
              consíguelos con el botón «Buscar contacto» en cada una.
            </>
          )}
        </p>
      </div>

      {/* Seguimientos sugeridos */}
      <section className="tarjeta">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-xl font-bold text-slate-800">
            <Bell className="h-6 w-6 text-slate-700" aria-hidden="true" />
            Seguimientos sugeridos
          </h2>
          {correoAutomaticoConfigurado(config) && (
            <button
              type="button"
              className="btn-secundario px-4 py-2"
              disabled={revisando}
              onClick={() => void revisarRespuestas()}
              title="Lee tu bandeja de entrada y marca solas las empresas que contestaron"
            >
              <Inbox className="h-5 w-5" aria-hidden="true" />
              {revisando ? 'Revisando…' : 'Revisar respuestas'}
            </button>
          )}
        </div>
        {seguimientos.length === 0 ? (
          <p className="text-lg text-slate-600">Nada pendiente por ahora 🎉</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {seguimientos.map(({ empresa, diasSinRespuesta }) => {
              const whatsapp = urlWhatsApp(empresa.telefono, generarWhatsAppSeguimiento(empresa, config));
              const { asunto, cuerpo } = generarEmailSeguimiento(empresa, config);
              return (
                <li
                  key={empresa.id}
                  className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-lg font-bold text-slate-800">{empresa.nombre}</span>
                    <span className="insignia border-amber-300 bg-amber-100 text-amber-800">
                      {diasSinRespuesta} {diasSinRespuesta === 1 ? 'día' : 'días'} sin respuesta
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="btn-verde px-4 py-2"
                      disabled={!whatsapp}
                      title={whatsapp ? undefined : 'Esta empresa no tiene un celular válido'}
                      onClick={() => whatsapp && abrirSeguimiento(empresa, whatsapp)}
                    >
                      <MessageCircle className="h-5 w-5" aria-hidden="true" />
                      WhatsApp
                    </button>
                    <button
                      type="button"
                      className="btn-secundario px-4 py-2"
                      disabled={!empresa.email}
                      title={empresa.email ? undefined : 'Esta empresa no tiene correo'}
                      onClick={() => abrirSeguimiento(empresa, urlOutlook(empresa.email, asunto, cuerpo))}
                    >
                      <Mail className="h-5 w-5" aria-hidden="true" />
                      Correo
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
