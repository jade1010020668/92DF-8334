import type { ConfigApp, Empresa, EstadoEmpresa, FuenteEmpresa } from '../types';
import { ESTADOS } from '../types';
import { combinarConfig } from './config';

/**
 * Respaldo completo: empresas (con fechas y estados exactos) + configuración.
 * Sirve para pasar TODO de un dispositivo a otro (PC ↔ celular) enviándose
 * el archivo por WhatsApp o correo. Las claves de API NO viajan en el archivo
 * (se quedan en cada dispositivo) para que compartirlo no las exponga.
 */

export interface Respaldo {
  app: 'dotacionpro';
  version: 1;
  fecha: string;
  empresas: Empresa[];
  config: Partial<ConfigApp>;
}

/** Serializa el respaldo (puro, cubierto por tests). */
export function generarRespaldo(empresas: Empresa[], config: ConfigApp): string {
  const respaldo: Respaldo = {
    app: 'dotacionpro',
    version: 1,
    fecha: new Date().toISOString(),
    empresas,
    config: { ...config, googleMapsApiKey: '', brevoApiKey: '' },
  };
  return JSON.stringify(respaldo, null, 2);
}

export interface RespaldoLeido {
  empresas: Empresa[];
  config: ConfigApp;
}

/**
 * Valida y lee un respaldo. Devuelve null si el archivo no es de DotaciónPro.
 * Cada campo se sanea a su tipo esperado: un .json manipulado no puede meter
 * estructuras raras a la app.
 */
export function parsearRespaldo(texto: string): RespaldoLeido | null {
  try {
    const datos = JSON.parse(texto) as Partial<Respaldo>;
    if (datos?.app !== 'dotacionpro' || !Array.isArray(datos.empresas)) return null;

    const cadena = (v: unknown): string => (typeof v === 'string' ? v : '');
    const fechaOpcional = (v: unknown): string | undefined =>
      typeof v === 'string' && v ? v : undefined;

    const empresas: Empresa[] = [];
    for (const cruda of datos.empresas as Partial<Empresa>[]) {
      if (!cruda || typeof cruda !== 'object') continue;
      const id = cadena(cruda.id);
      const nombre = cadena(cruda.nombre).trim();
      if (!id || !nombre) continue;
      empresas.push({
        id,
        nombre,
        sector: cadena(cruda.sector),
        email: cadena(cruda.email),
        telefono: cadena(cruda.telefono),
        contacto: cadena(cruda.contacto),
        direccion: cadena(cruda.direccion),
        estado: ESTADOS.includes(cruda.estado as EstadoEmpresa)
          ? (cruda.estado as EstadoEmpresa)
          : 'pendiente',
        fechaCreacion: cadena(cruda.fechaCreacion) || new Date().toISOString(),
        fechaEnvio: fechaOpcional(cruda.fechaEnvio),
        fechaRespuesta: fechaOpcional(cruda.fechaRespuesta),
        notas: cadena(cruda.notas) || undefined,
        fuente: (['manual', 'excel', 'maps'] as FuenteEmpresa[]).includes(
          cruda.fuente as FuenteEmpresa,
        )
          ? (cruda.fuente as FuenteEmpresa)
          : 'manual',
      });
    }
    return { empresas, config: combinarConfig(datos.config ?? null) };
  } catch {
    return null;
  }
}

/** Descarga el respaldo como archivo .json. */
export function descargarRespaldo(empresas: Empresa[], config: ConfigApp): void {
  const blob = new Blob([generarRespaldo(empresas, config)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = `Respaldo DotacionPro ${new Date().toISOString().slice(0, 10)}.json`;
  enlace.click();
  URL.revokeObjectURL(url);
}
