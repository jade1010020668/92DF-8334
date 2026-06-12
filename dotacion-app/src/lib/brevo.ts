import type { ConfigApp, Empresa } from '../types';
import { generarEmail } from './plantillas';

/**
 * Envío real de correos vía la API transaccional de Brevo (plan gratis:
 * 300 correos/día). Requisitos: clave de API en Configuración y el correo
 * de la empresa verificado como remitente en el panel de Brevo.
 */

const URL_API = 'https://api.brevo.com/v3/smtp/email';

export interface PayloadBrevo {
  sender: { name: string; email: string };
  to: { email: string; name: string }[];
  replyTo: { email: string };
  subject: string;
  textContent: string;
}

/** Arma el cuerpo del envío para la API de Brevo (puro, cubierto por tests). */
export function construirPayloadBrevo(empresa: Empresa, config: ConfigApp): PayloadBrevo {
  const { asunto, cuerpo } = generarEmail(empresa, config);
  const remitente = config.remitente.trim() || config.nombreEmpresa;
  const correoEmpresa = config.email.trim();
  return {
    sender: { name: remitente, email: correoEmpresa },
    to: [{ email: empresa.email.trim(), name: empresa.nombre }],
    replyTo: { email: correoEmpresa },
    subject: asunto,
    textContent: cuerpo,
  };
}

export type ResultadoEnvio = { ok: true } | { ok: false; error: string };

/** Envía la cotización de una empresa por Brevo. Nunca lanza: devuelve {ok, error}. */
export async function enviarCorreoBrevo(empresa: Empresa, config: ConfigApp): Promise<ResultadoEnvio> {
  if (!config.brevoApiKey.trim()) {
    return { ok: false, error: 'No hay clave de Brevo configurada.' };
  }
  if (!config.email.trim()) {
    return {
      ok: false,
      error: 'Configura el correo de tu empresa en Configuración: es el remitente de los envíos.',
    };
  }
  if (!empresa.email.trim()) {
    return { ok: false, error: `${empresa.nombre} no tiene correo.` };
  }

  try {
    const respuesta = await fetch(URL_API, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        'api-key': config.brevoApiKey.trim(),
      },
      body: JSON.stringify(construirPayloadBrevo(empresa, config)),
    });
    if (respuesta.ok) return { ok: true };

    let detalle = `Brevo respondió HTTP ${respuesta.status}.`;
    try {
      const json = (await respuesta.json()) as { message?: string };
      if (json.message) detalle = json.message;
    } catch {
      // Respuesta sin cuerpo JSON: se conserva el código HTTP.
    }
    if (respuesta.status === 401) {
      detalle = 'La clave de Brevo no es válida o venció. Revísala en Configuración.';
    } else if (detalle.toLowerCase().includes('sender')) {
      detalle = `Brevo no reconoce tu remitente (${config.email.trim()}). Verifícalo en Brevo: Settings → Senders.`;
    }
    return { ok: false, error: detalle };
  } catch {
    return { ok: false, error: 'No se pudo conectar con Brevo. Revisa tu internet e intenta de nuevo.' };
  }
}
