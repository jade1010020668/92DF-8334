import {
  AlertTriangle,
  Bell,
  Building2,
  Clock,
  Mail,
  MessageCircle,
  Reply,
  Send,
  Trophy,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ConfigApp, Empresa } from '../types';
import { faltanDatosContacto } from '../lib/config';
import { calcularKpis, seguimientosPendientes } from '../lib/stats';
import {
  generarEmailSeguimiento,
  generarWhatsAppSeguimiento,
  urlGmail,
  urlWhatsApp,
} from '../lib/plantillas';

interface Props {
  empresas: Empresa[];
  config: ConfigApp;
  actualizarEmpresa: (id: string, cambios: Partial<Empresa>) => void;
  onAbrirCampana: () => void;
  onIrAConfiguracion: () => void;
}

interface TarjetaKpi {
  etiqueta: string;
  valor: number;
  Icono: LucideIcon;
  acento: string;
  fondoIcono: string;
}

export function Dashboard({ empresas, config, actualizarEmpresa, onAbrirCampana, onIrAConfiguracion }: Props) {
  const kpis = calcularKpis(empresas);
  const seguimientos = seguimientosPendientes(empresas, config.diasSeguimiento);

  const tarjetas: TarjetaKpi[] = [
    {
      etiqueta: 'Empresas totales',
      valor: kpis.total,
      Icono: Building2,
      acento: 'text-blue-700',
      fondoIcono: 'bg-blue-100 text-blue-700',
    },
    {
      etiqueta: 'Pendientes',
      valor: kpis.pendientes,
      Icono: Clock,
      acento: 'text-amber-600',
      fondoIcono: 'bg-amber-100 text-amber-600',
    },
    {
      etiqueta: 'Cotizaciones enviadas',
      valor: kpis.enviadas,
      Icono: Send,
      acento: 'text-indigo-600',
      fondoIcono: 'bg-indigo-100 text-indigo-600',
    },
    {
      etiqueta: 'Respondieron',
      valor: kpis.respondieron + kpis.clientes,
      Icono: Reply,
      acento: 'text-emerald-600',
      fondoIcono: 'bg-emerald-100 text-emerald-600',
    },
    {
      etiqueta: 'Clientes',
      valor: kpis.clientes,
      Icono: Trophy,
      acento: 'text-green-700',
      fondoIcono: 'bg-green-100 text-green-700',
    },
  ];

  /** Abre el mensaje de seguimiento y registra que se volvió a escribir hoy. */
  const abrirSeguimiento = (empresa: Empresa, url: string) => {
    window.open(url, '_blank', 'noopener');
    actualizarEmpresa(empresa.id, { fechaEnvio: new Date().toISOString() });
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

      {/* CTA de campaña */}
      <div className="tarjeta flex flex-col items-center gap-3 py-8 text-center">
        <button
          type="button"
          className="btn-primario w-full max-w-xl px-8 py-5 text-xl sm:text-2xl"
          onClick={onAbrirCampana}
          disabled={kpis.pendientes === 0}
        >
          <Send className="h-7 w-7" aria-hidden="true" />
          {kpis.pendientes > 0
            ? `Enviar a ${kpis.pendientes} pendiente${kpis.pendientes === 1 ? '' : 's'}`
            : 'No hay empresas pendientes'}
        </button>
        <p className="max-w-xl text-lg text-slate-600">
          Abre cada empresa con su correo y WhatsApp ya escritos; tú solo revisas y envías.
        </p>
      </div>

      {/* Seguimientos sugeridos */}
      <section className="tarjeta">
        <h2 className="mb-4 flex items-center gap-2 text-xl font-bold text-slate-800">
          <Bell className="h-6 w-6 text-blue-700" aria-hidden="true" />
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
