import { useState } from 'react';
import {
  AlertTriangle,
  Bell,
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
import { diasDesdeUltimaExportacion, faltanDatosContacto } from '../lib/config';
import { exportarExcel } from '../lib/excel';
import { calcularKpis, seguimientosPendientes } from '../lib/stats';
import { entregasDeHoy, textoDiasEntrega } from '../lib/agenda';
import { formatearPesos } from '../lib/plantillas';
import { totalPedido } from '../lib/pedidos';
import {
  generarEmailSeguimiento,
  generarWhatsAppSeguimiento,
  urlGmail,
  urlWhatsApp,
} from '../lib/plantillas';

interface Props {
  empresas: Empresa[];
  config: ConfigApp;
  pedidos: Pedido[];
  actualizarEmpresa: (id: string, cambios: Partial<Empresa>) => void;
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
  // Solo cuentan las pendientes que se pueden contactar (WhatsApp o correo).
  const contactablesPend = empresas.filter(
    (e) => e.estado === 'pendiente' && (e.email.trim() !== '' || urlWhatsApp(e.telefono, 'x') !== null),
  ).length;
  // Cambia tras exportar para recalcular el aviso de copia de seguridad.
  const [, setRefrescoRespaldo] = useState(0);
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

  /** Abre el mensaje de seguimiento y, si se envió, reinicia el contador. */
  const abrirSeguimiento = (empresa: Empresa, url: string) => {
    window.open(url, '_blank', 'noopener');
    if (
      window.confirm(
        `¿Enviaste el mensaje de seguimiento a ${empresa.nombre}? Acepta para reiniciar el contador de días.`,
      )
    ) {
      actualizarEmpresa(empresa.id, { fechaEnvio: new Date().toISOString() });
    }
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
              {cargandoBase ? 'Cargando…' : '2. Cargar 6.000 empresas reales de Bogotá'}
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
              exportarExcel(empresas);
              setRefrescoRespaldo((n) => n + 1);
            }}
          >
            Exportar ahora
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
        <h2 className="mb-4 flex items-center gap-2 text-xl font-bold text-slate-800">
          <Bell className="h-6 w-6 text-slate-700" aria-hidden="true" />
          Seguimientos sugeridos
        </h2>
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
                      onClick={() => abrirSeguimiento(empresa, urlGmail(empresa.email, asunto, cuerpo))}
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
