/** Tipos centrales de DotaciónPro. */

export const ESTADOS = ['pendiente', 'enviado', 'respondio', 'cliente', 'rechazado'] as const;

export type EstadoEmpresa = (typeof ESTADOS)[number];

export const ETIQUETA_ESTADO: Record<EstadoEmpresa, string> = {
  pendiente: 'Pendiente',
  enviado: 'Enviado',
  respondio: 'Respondió',
  cliente: 'Cliente',
  rechazado: 'Rechazado',
};

/** Clases Tailwind para la insignia de cada estado. */
export const COLOR_ESTADO: Record<EstadoEmpresa, string> = {
  pendiente: 'border-amber-300 bg-amber-100 text-amber-800',
  enviado: 'border-blue-300 bg-blue-100 text-blue-800',
  respondio: 'border-emerald-300 bg-emerald-100 text-emerald-800',
  cliente: 'border-green-400 bg-green-200 text-green-900',
  rechazado: 'border-rose-300 bg-rose-100 text-rose-700',
};

export type FuenteEmpresa = 'manual' | 'excel' | 'maps';

export interface Empresa {
  id: string;
  nombre: string;
  sector: string;
  email: string;
  telefono: string;
  /** Persona de contacto dentro de la empresa. */
  contacto: string;
  direccion: string;
  estado: EstadoEmpresa;
  /** ISO 8601. */
  fechaCreacion: string;
  /** ISO 8601 del último envío de cotización. */
  fechaEnvio?: string;
  /** ISO 8601 de cuando respondió. */
  fechaRespuesta?: string;
  notas?: string;
  fuente: FuenteEmpresa;
}

/** Datos mínimos para crear una empresa (el resto se completa al insertar). */
export interface NuevaEmpresa {
  nombre: string;
  sector?: string;
  email?: string;
  telefono?: string;
  contacto?: string;
  direccion?: string;
  estado?: EstadoEmpresa;
  notas?: string;
}

export interface ProductoCatalogo {
  nombre: string;
  /** Precio de referencia en COP. 0 = "precio a convenir" (no se muestra). */
  precioDesde: number;
  /** Unidad de venta: par, unidad, caja… */
  unidad: string;
}

export interface ConfigApp {
  nombreEmpresa: string;
  direccion: string;
  ciudad: string;
  /** Teléfono / WhatsApp de la empresa (sale en mensajes y PDF). */
  telefono: string;
  /** Correo de la empresa (sale en mensajes y PDF). */
  email: string;
  /** Nombre de quien firma los mensajes. */
  remitente: string;
  /** Frase sobre descuentos por volumen que va en email/WhatsApp/PDF. */
  textoDescuentos: string;
  /** Días sin respuesta tras los cuales se sugiere hacer seguimiento. */
  diasSeguimiento: number;
  /** Clave opcional de Google Maps Platform (Places API New) para búsqueda. */
  googleMapsApiKey: string;
  /** Clave opcional de Brevo para enviar correos reales desde la app. */
  brevoApiKey: string;
  /** Cuerpo personalizado del correo; vacío = usar el mensaje automático. */
  plantillaEmail: string;
  /** Mensaje personalizado de WhatsApp; vacío = usar el automático. */
  plantillaWhatsApp: string;
  productos: ProductoCatalogo[];
}

/** Resultado de la búsqueda de empresas en el mapa (OSM o Google Places). */
export interface ResultadoMaps {
  nombre: string;
  direccion: string;
  telefono: string;
  website: string;
  categoria: string;
}
