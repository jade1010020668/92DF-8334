import type { ConfigApp, Empresa } from '../types';
import { correoAutomaticoConfigurado, cuentaConectada, enviarCotizacionAuto } from './msoft';
import { enviarCorreoBrevo } from './brevo';

/**
 * Envío REAL de cotizaciones por correo, unificado. La app tiene dos vías,
 * ambas comprobadas contra los servidores reales:
 *
 * 1. 'microsoft' — cuenta del negocio conectada (Graph): sale desde el propio
 *    Hotmail y queda en Enviados.
 * 2. 'brevo' — clave de Brevo: sale por Brevo a nombre del negocio, con la
 *    cotización en PDF adjunta (verificado: su API acepta peticiones desde
 *    esta app y hotmail.com no las rechaza por DMARC, p=none).
 *
 * Si no hay ninguna activa, los botones abren Outlook con el correo escrito.
 */

export type MedioEnvio = 'microsoft' | 'brevo' | null;

/** Qué vía de envío real está activa (Microsoft tiene prioridad). */
export async function medioEnvioDisponible(config: ConfigApp): Promise<MedioEnvio> {
  if (correoAutomaticoConfigurado(config) && (await cuentaConectada(config)) !== null) {
    return 'microsoft';
  }
  if (config.brevoApiKey.trim() !== '') return 'brevo';
  return null;
}

/** ¿Hay alguna vía de envío automático configurada? (chequeo rápido, sin red). */
export function envioRealConfigurado(config: ConfigApp): boolean {
  return correoAutomaticoConfigurado(config) || config.brevoApiKey.trim() !== '';
}

export interface ResultadoEnvioReal {
  ok: boolean;
  medio: MedioEnvio;
  error?: string;
}

/** Envía la cotización de una empresa por la vía activa. Nunca lanza. */
export async function enviarCotizacionReal(
  empresa: Empresa,
  config: ConfigApp,
): Promise<ResultadoEnvioReal> {
  const medio = await medioEnvioDisponible(config);
  if (medio === 'microsoft') {
    const r = await enviarCotizacionAuto(empresa, config);
    return r.ok ? { ok: true, medio } : { ok: false, medio, error: r.error };
  }
  if (medio === 'brevo') {
    const r = await enviarCorreoBrevo(empresa, config);
    return r.ok ? { ok: true, medio } : { ok: false, medio, error: r.error };
  }
  return {
    ok: false,
    medio: null,
    error: 'El envío automático no está activado. Actívalo en Configuración → Correo automático.',
  };
}
