import type { ConfigApp } from '../types';

export const CLAVE_EMPRESAS = 'dotacionpro.empresas';
export const CLAVE_CONFIG = 'dotacionpro.config';
export const CLAVE_CONSECUTIVO = 'dotacionpro.consecutivoCotizacion';

export const CONFIG_DEFAULT: ConfigApp = {
  nombreEmpresa: 'Dotaciones El Manantial',
  direccion: 'Carrera 34 # 2-62',
  ciudad: 'Bogotá, Colombia',
  telefono: '',
  email: '',
  remitente: '',
  textoDescuentos:
    'Manejamos descuentos especiales por volumen y precios mayoristas a partir de 20 unidades.',
  diasSeguimiento: 5,
  googleMapsApiKey: '',
  productos: [
    { nombre: 'Guantes industriales (nitrilo, cuero, PVC, vaqueta)', precioDesde: 0, unidad: 'par' },
    { nombre: 'Cascos de seguridad y protección para la cabeza', precioDesde: 0, unidad: 'unidad' },
    { nombre: 'Calzado de seguridad con puntera de acero y dieléctrico', precioDesde: 0, unidad: 'par' },
    { nombre: 'Overoles, uniformes y ropa de trabajo', precioDesde: 0, unidad: 'unidad' },
    { nombre: 'Gafas y caretas de protección visual', precioDesde: 0, unidad: 'unidad' },
    { nombre: 'Tapabocas, respiradores y protección respiratoria', precioDesde: 0, unidad: 'caja' },
    { nombre: 'Arneses y equipos para trabajo en alturas', precioDesde: 0, unidad: 'unidad' },
    { nombre: 'Chalecos reflectivos y señalización', precioDesde: 0, unidad: 'unidad' },
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
