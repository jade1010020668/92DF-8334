import type { ConfigApp } from '../types';

export const CLAVE_EMPRESAS = 'dotacionpro.empresas';
export const CLAVE_CONFIG = 'dotacionpro.config';
export const CLAVE_PEDIDOS = 'dotacionpro.pedidos';
export const CLAVE_CONSECUTIVO = 'dotacionpro.consecutivoCotizacion';
export const CLAVE_ULTIMA_EXPORTACION = 'dotacionpro.ultimaExportacion';
export const CLAVE_ACCESO = 'dotacionpro.acceso';
/** Bandera de sesión desbloqueada en este equipo. */
export const CLAVE_DESBLOQUEADO = 'dotacionpro.desbloqueado';
/** Bandera: ya se mostró la guía de bienvenida. */
export const CLAVE_VIO_GUIA = 'dotacionpro.vioGuia';

/** Días desde la última copia en Excel; null si nunca se ha exportado. */
export function diasDesdeUltimaExportacion(ahora: Date = new Date()): number | null {
  try {
    const guardado = localStorage.getItem(CLAVE_ULTIMA_EXPORTACION);
    if (!guardado) return null;
    const fecha = new Date(guardado);
    if (Number.isNaN(fecha.getTime())) return null;
    return Math.floor((ahora.getTime() - fecha.getTime()) / (24 * 60 * 60 * 1000));
  } catch {
    return null;
  }
}

/** Registra que se acaba de exportar la copia de seguridad. */
export function registrarExportacion(): void {
  try {
    localStorage.setItem(CLAVE_ULTIMA_EXPORTACION, new Date().toISOString());
  } catch {
    // Sin localStorage no hay recordatorio, pero la app sigue.
  }
}

export const CONFIG_DEFAULT: ConfigApp = {
  nombreEmpresa: 'Dotaciones El Manantial S.A.S',
  direccion: 'Carrera 34 No. 2-62',
  ciudad: 'Bogotá, Colombia',
  telefono: '313 574 5063',
  email: 'dot.manantial@hotmail.com',
  remitente: 'José Manuel Morales Quintana',
  textoDescuentos:
    'Manejamos descuentos especiales por volumen y precios mayoristas a partir de 20 unidades. Vea el catálogo completo con precios en: https://morales101002-dotacionpro.static.hf.space/catalogo.html',
  diasSeguimiento: 5,
  googleMapsApiKey: '',
  brevoApiKey: '',
  plantillaEmail: '',
  plantillaWhatsApp: '',
  // Precios "desde" reales de la lista Enero 2026 (valores SIN IVA). Son el
  // mínimo de cada grupo, para que el mensaje de presentación sea corto. El
  // detalle completo con cada referencia y precio está en el catálogo y en el
  // formulario de pedidos. Editables en Configuración.
  productos: [
    { nombre: 'Overoles y ropa de trabajo en dril (2 piezas, enterizo, piloto, blusa, chaleco)', precioDesde: 40900, unidad: 'unidad' },
    { nombre: 'Conjunto 2 piezas en antifluido (servicios generales)', precioDesde: 63000, unidad: 'unidad' },
    { nombre: 'Dotación de vendedores: jeans, camisas Oxford, polos y camisetas', precioDesde: 18100, unidad: 'unidad' },
    { nombre: 'Botas y calzado de seguridad (ref. 820, 920, GM, soldador, goma, dama)', precioDesde: 46500, unidad: 'par' },
    { nombre: 'Guantes industriales (ingeniero reforzado, carnaza corto y largo)', precioDesde: 8800, unidad: 'par' },
    { nombre: 'Cascos, gafas, cofias y protección (tapaoídos, casco, gafas, peto)', precioDesde: 4000, unidad: 'unidad' },
    { nombre: 'Tapabocas industrial (paquete x 100 unidades)', precioDesde: 51500, unidad: 'paquete' },
    { nombre: 'Estampado y bordado con el logo de su empresa', precioDesde: 1900, unidad: 'unidad' },
  ],
};

/**
 * Combina una config guardada (posiblemente de una versión vieja de la app)
 * con los defaults, para que nunca falte un campo.
 */
export function combinarConfig(guardada: Partial<ConfigApp> | null | undefined): ConfigApp {
  if (!guardada || typeof guardada !== 'object') return { ...CONFIG_DEFAULT };
  const combinada: ConfigApp = {
    ...CONFIG_DEFAULT,
    ...guardada,
    productos:
      Array.isArray(guardada.productos) && guardada.productos.length > 0
        ? guardada.productos
        : CONFIG_DEFAULT.productos,
  };
  // Si una versión vieja guardó vacíos los datos del negocio, los rellenamos
  // con los reales (sin pisar nada que el usuario haya escrito a propósito).
  const camposNegocio = ['nombreEmpresa', 'direccion', 'telefono', 'email', 'remitente'] as const;
  for (const campo of camposNegocio) {
    if (typeof combinada[campo] !== 'string' || combinada[campo].trim() === '') {
      combinada[campo] = CONFIG_DEFAULT[campo];
    }
  }
  return combinada;
}

/** Faltan datos de contacto críticos para los mensajes (tarea ALTA del plan). */
export function faltanDatosContacto(config: ConfigApp): boolean {
  return !config.telefono.trim() || !config.email.trim() || !config.remitente.trim();
}
