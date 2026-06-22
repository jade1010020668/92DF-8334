import type { ConfigApp } from '../types';

export const CLAVE_EMPRESAS = 'dotacionpro.empresas';
export const CLAVE_CONFIG = 'dotacionpro.config';
export const CLAVE_PEDIDOS = 'dotacionpro.pedidos';
export const CLAVE_CONSECUTIVO = 'dotacionpro.consecutivoCotizacion';
export const CLAVE_ULTIMA_EXPORTACION = 'dotacionpro.ultimaExportacion';

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
  nombreEmpresa: 'Dotaciones El Manantial',
  direccion: 'Carrera 34 # 2-62',
  ciudad: 'Bogotá, Colombia',
  telefono: '',
  email: '',
  remitente: '',
  textoDescuentos:
    'Manejamos descuentos especiales por volumen y precios mayoristas a partir de 20 unidades. Vea el catálogo completo con precios en: https://morales101002-dotacionpro.static.hf.space/catalogo.html',
  diasSeguimiento: 5,
  googleMapsApiKey: '',
  brevoApiKey: '',
  plantillaEmail: '',
  plantillaWhatsApp: '',
  // Precios "desde" según lista 2023 de la empresa con incremento del 20%
  // (valores sin IVA). Editables en Configuración.
  productos: [
    { nombre: 'Overoles y ropa de trabajo en dril (2 piezas, enterizo, piloto)', precioDesde: 46200, unidad: 'unidad' },
    { nombre: 'Dotación de vendedores: jeans, camisas Oxford, polos y camisetas', precioDesde: 19800, unidad: 'unidad' },
    { nombre: 'Botas y calzado de seguridad (livianas, dieléctricas, soldador)', precioDesde: 33000, unidad: 'par' },
    { nombre: 'Guantes industriales (neopreno, ingeniero, carnaza)', precioDesde: 9400, unidad: 'par' },
    { nombre: 'Cascos, gafas y protección (casco blanco, gafas, tapaoídos)', precioDesde: 2800, unidad: 'unidad' },
    { nombre: 'Tapabocas industrial (paquete x 100 unidades)', precioDesde: 66000, unidad: 'paquete' },
    { nombre: 'Petos y delantales (caucho, carnaza)', precioDesde: 30000, unidad: 'unidad' },
    { nombre: 'Bordado y estampado con el logo de su empresa', precioDesde: 1800, unidad: 'unidad' },
  ],
};

/**
 * Combina una config guardada (posiblemente de una versión vieja de la app)
 * con los defaults, para que nunca falte un campo.
 */
export function combinarConfig(guardada: Partial<ConfigApp> | null | undefined): ConfigApp {
  if (!guardada || typeof guardada !== 'object') return { ...CONFIG_DEFAULT };
  return {
    ...CONFIG_DEFAULT,
    ...guardada,
    productos:
      Array.isArray(guardada.productos) && guardada.productos.length > 0
        ? guardada.productos
        : CONFIG_DEFAULT.productos,
  };
}

/** Faltan datos de contacto críticos para los mensajes (tarea ALTA del plan). */
export function faltanDatosContacto(config: ConfigApp): boolean {
  return !config.telefono.trim() || !config.email.trim() || !config.remitente.trim();
}
