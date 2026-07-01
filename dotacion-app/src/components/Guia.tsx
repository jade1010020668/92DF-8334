import { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Building2,
  HardHat,
  MapPinned,
  Rocket,
  Settings,
  ShoppingCart,
  X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface Paso {
  Icono: LucideIcon;
  titulo: string;
  texto: string;
  porque?: string;
}

const PASOS: Paso[] = [
  {
    Icono: HardHat,
    titulo: 'Bienvenido a DotaciónPro',
    texto:
      'Esta app le ayuda a su empresa a conseguir clientes y vender más dotación (overoles, EPP) sin tener que ir empresa por empresa. Aquí le explicamos en 1 minuto cómo funciona.',
    porque: 'Pensada para usarse desde el celular o el computador, sin instalar nada.',
  },
  {
    Icono: Building2,
    titulo: '1. Empresas — su lista de clientes',
    texto:
      'Aquí vive su lista de empresas a contactar. Toque «Cargar +6.000 empresas reales» para empezar con negocios reales cercanos, o importe su propio Excel. Cada empresa tiene botones para escribir, llamar y ver su ficha.',
    porque: 'Use el filtro «Solo con teléfono/correo» para ver únicamente a las que sí puede contactar hoy.',
  },
  {
    Icono: MapPinned,
    titulo: '2. Buscar en el mapa — clientes cerca',
    texto:
      'Encuentra empresas que necesitan dotación cerca de su negocio (a 2, 5 o 10 km), ordenadas de la más cercana a la más lejana. Puede verlas en lista o en un mapa.',
    porque: 'Así visita clientes a pocas cuadras, sin cruzar la ciudad. Es gratis (OpenStreetMap).',
  },
  {
    Icono: Rocket,
    titulo: '3. Enviar cotizaciones',
    texto:
      'En Inicio, toque «Enviar a X pendientes». La app le muestra cada empresa con el correo y el WhatsApp ya escritos. Usted solo revisa y da Enviar (en su Outlook/Hotmail o en WhatsApp).',
    porque: 'Despacha muchas cotizaciones en minutos, en vez de escribirlas una por una.',
  },
  {
    Icono: ShoppingCart,
    titulo: '4. Pedidos — controle sus ventas',
    texto:
      'Cuando un cliente le compre, registre el pedido: productos, cantidades, abono y saldo por cobrar. La app le avisa de las entregas y le saca el PDF.',
    porque: 'Para saber siempre cuánto le deben y qué tiene que entregar.',
  },
  {
    Icono: BarChart3,
    titulo: '5. Estadísticas',
    texto:
      'Vea cuánto ha vendido, cuánto le deben y qué sectores le responden más, para enfocar su esfuerzo donde sí vende.',
  },
  {
    Icono: Settings,
    titulo: '6. Configuración — antes de empezar',
    texto:
      'Ponga aquí los datos de su empresa: teléfono, correo y quién firma los mensajes. Estos datos salen en cada cotización. También puede poner una clave para que solo usted entre.',
    porque: 'Es lo único que debe llenar una vez. ¡Y listo para vender!',
  },
];

interface Props {
  /** Cierra el tutorial. Si `noMostrarMas` es true, no vuelve a salir al entrar. */
  onCerrar: (noMostrarMas: boolean) => void;
}

export function Guia({ onCerrar }: Props) {
  const [i, setI] = useState(0);
  const paso = PASOS[i];
  const ultimo = i === PASOS.length - 1;
  const { Icono } = paso;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Cómo funciona la aplicación"
    >
      <div className="flex w-full max-w-lg flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between bg-[#14181f] px-4 py-3 text-white sm:px-6">
          <span className="text-sm font-semibold text-slate-300">
            Tutorial · paso {i + 1} de {PASOS.length}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onCerrar(true)}
              className="rounded-lg px-3 py-1 text-sm font-semibold text-slate-200 transition hover:bg-white/10 hover:text-white"
            >
              Saltar tutorial
            </button>
            <button
              type="button"
              onClick={() => onCerrar(false)}
              aria-label="Cerrar tutorial"
              className="rounded-lg p-1 text-slate-300 transition hover:bg-white/10 hover:text-white"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="flex flex-col items-center gap-4 px-6 py-8 text-center sm:px-10">
          <span className="inline-flex h-20 w-20 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
            <Icono className="h-11 w-11" aria-hidden="true" />
          </span>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">{paso.titulo}</h2>
          <p className="text-lg leading-relaxed text-slate-600">{paso.texto}</p>
          {paso.porque && (
            <p className="rounded-2xl bg-slate-50 px-4 py-3 text-slate-600">💡 {paso.porque}</p>
          )}
        </div>

        {/* Puntos de progreso */}
        <div className="flex justify-center gap-2 pb-4">
          {PASOS.map((_, idx) => (
            <button
              key={idx}
              type="button"
              aria-label={`Ir al paso ${idx + 1}`}
              onClick={() => setI(idx)}
              className={`h-2.5 rounded-full transition-all ${
                idx === i ? 'w-6 bg-[#14181f]' : 'w-2.5 bg-slate-300 hover:bg-slate-400'
              }`}
            />
          ))}
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-slate-200 px-6 py-4">
          <button
            type="button"
            className="btn-secundario"
            disabled={i === 0}
            onClick={() => setI(i - 1)}
          >
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
            Atrás
          </button>
          <button
            type="button"
            className={ultimo ? 'btn-verde' : 'btn-primario'}
            onClick={() => (ultimo ? onCerrar(true) : setI(i + 1))}
          >
            {ultimo ? (
              '¡Empezar!'
            ) : (
              <>
                Siguiente
                <ArrowRight className="h-5 w-5" aria-hidden="true" />
              </>
            )}
          </button>
        </div>

        <p className="border-t border-slate-100 bg-slate-50 px-6 py-2.5 text-center text-sm text-slate-500">
          El tutorial aparece al entrar hasta que lo termine (<strong>«¡Empezar!»</strong>) o toque{' '}
          <strong>«Saltar tutorial»</strong>. Siempre puede reabrirlo con «¿Cómo funciona?».
        </p>
      </div>
    </div>
  );
}
