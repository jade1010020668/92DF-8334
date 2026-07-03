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

/** Clases Tailwind para la insignia de cada estado (paleta sobria). */
export const COLOR_ESTADO: Record<EstadoEmpresa, string> = {
  pendiente: 'border-slate-200 bg-slate-100 text-slate-600',
  enviado: 'border-sky-200 bg-sky-50 text-sky-700',
  respondio: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  cliente: 'border-emerald-300 bg-emerald-600 text-white',
  rechazado: 'border-rose-200 bg-rose-50 text-rose-600',
};

export type FuenteEmpresa = 'manual' | 'excel' | 'maps';

/** Un evento del historial de gestión de una empresa (llamada, correo, nota…). */
export interface EventoHistorial {
  id: string;
  /** ISO 8601. */
  fecha: string;
  tipo: 'nota' | 'correo' | 'whatsapp' | 'llamada' | 'estado' | 'pedido' | 'visita';
  texto: string;
}

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
  /** Coordenadas para el mapa (de la búsqueda por cercanía o geocodificación). */
  lat?: number;
  lon?: number;
  /** Historial de gestión, lo más reciente primero. */
  historial?: EventoHistorial[];
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
  /** ISO 8601; se respeta al importar un Excel que ya traía historia. */
  fechaEnvio?: string;
  fechaRespuesta?: string;
  lat?: number;
  lon?: number;
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
  /** Coordenadas del negocio (origen del mapa "cerca de mi negocio"). */
  negocioLat?: number;
  negocioLon?: number;
  /** Clave opcional de Google Maps Platform (Places API New) para búsqueda. */
  googleMapsApiKey: string;
  /** Clave opcional de Brevo para enviar correos reales desde la app. */
  brevoApiKey: string;
  /** Client ID de Microsoft (correo automático oficial). No es secreto. */
  microsoftClientId?: string;
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
  /** Distancia al negocio en metros (solo en la búsqueda por cercanía). */
  distanciaMetros?: number;
  /** Prioridad como cliente de dotación: 1 = alta, 2 = media, 3 = baja. */
  prioridad?: 1 | 2 | 3;
  /** Coordenadas del prospecto (para el mapa visual). */
  lat?: number;
  lon?: number;
}

/* ===================== Módulo de pedidos ===================== */

export const ESTADOS_PEDIDO = ['cotizado', 'confirmado', 'entregado', 'pagado', 'anulado'] as const;

export type EstadoPedido = (typeof ESTADOS_PEDIDO)[number];

export const ETIQUETA_ESTADO_PEDIDO: Record<EstadoPedido, string> = {
  cotizado: 'Cotizado',
  confirmado: 'Confirmado',
  entregado: 'Entregado',
  pagado: 'Pagado',
  anulado: 'Anulado',
};

export const COLOR_ESTADO_PEDIDO: Record<EstadoPedido, string> = {
  cotizado: 'border-slate-200 bg-slate-100 text-slate-600',
  confirmado: 'border-sky-200 bg-sky-50 text-sky-700',
  entregado: 'border-amber-200 bg-amber-50 text-amber-700',
  pagado: 'border-emerald-300 bg-emerald-600 text-white',
  anulado: 'border-rose-200 bg-rose-50 text-rose-600',
};

/** Una línea de un pedido: producto, cantidad y precio unitario en COP. */
export interface ItemPedido {
  id: string;
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
}

export interface Pedido {
  id: string;
  empresaId: string;
  /** Nombre de la empresa congelado al crear (por si se borra la empresa). */
  empresaNombre: string;
  /** ISO 8601. */
  fecha: string;
  items: ItemPedido[];
  estado: EstadoPedido;
  /** Abono recibido en COP. El saldo se calcula contra el total. */
  abono: number;
  /** % de IVA a aplicar sobre el subtotal (0 = sin IVA). */
  iva: number;
  /** ISO 8601 de la entrega comprometida. */
  fechaEntrega?: string;
  notas?: string;
}

export interface NuevoPedido {
  empresaId: string;
  empresaNombre: string;
  items: ItemPedido[];
  estado?: EstadoPedido;
  abono?: number;
  iva?: number;
  fechaEntrega?: string;
  notas?: string;
}
