import type { ConfigApp, Empresa } from '../types';
import { generarEmail } from './plantillas';
import { pdfCotizacionBase64 } from './pdf';
import { fetchConTimeout } from './red';

/**
 * Envío real de correos vía la API transaccional de Brevo (plan gratis:
 * 300 correos/día). Requisitos: clave de API en Configuración y el correo
 * de la empresa verificado como remitente en el panel de Brevo.
 */

const URL_API = 'https://api.brevo.com/v3/smtp/email';

export interface AdjuntoBrevo {
  name: string;
  /** Contenido del archivo en base64. */
  content: string;
}

export interface PayloadBrevo {
  sender: { name: string; email: string };
  to: { email: string; name: string }[];
  replyTo: { email: string };
  subject: string;
  textContent: string;
  /** Versión HTML elegante del mismo cuerpo (viñetas, enlaces, firma). */
  htmlContent?: string;
  attachment?: AdjuntoBrevo[];
}

function escaparHtml(t: string): string {
  return t.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

/** Vuelve clicables las URL de una línea ya escapada. */
function enlazar(linea: string): string {
  return linea.replace(
    /https?:\/\/[^\s]+/g,
    (u) => `<a href="${u}" style="color:#047857;font-weight:600">${u}</a>`,
  );
}

/**
 * Convierte el cuerpo de texto plano en un HTML sobrio y profesional (pura,
 * con pruebas): párrafos, viñetas reales para el portafolio y firma separada.
 */
export function cuerpoAHtml(cuerpo: string): string {
  const lineas = cuerpo.split('\n');
  const bloques: string[] = [];
  let viñetas: string[] = [];
  let parrafo: string[] = [];
  const cerrarParrafo = () => {
    if (parrafo.length > 0) {
      bloques.push(`<p style="margin:0 0 14px">${parrafo.map(enlazar).join('<br/>')}</p>`);
      parrafo = [];
    }
  };
  const cerrarViñetas = () => {
    if (viñetas.length > 0) {
      bloques.push(
        `<ul style="margin:0 0 14px;padding-left:22px">${viñetas
          .map((v) => `<li style="margin:0 0 6px">${enlazar(v)}</li>`)
          .join('')}</ul>`,
      );
      viñetas = [];
    }
  };
  for (const cruda of lineas) {
    const linea = escaparHtml(cruda);
    const item = linea.match(/^\s*[•·-]\s*(.+)$/);
    if (item) {
      cerrarParrafo();
      viñetas.push(item[1]);
    } else if (linea.trim() === '') {
      cerrarParrafo();
      cerrarViñetas();
    } else {
      cerrarViñetas();
      parrafo.push(linea.trim());
    }
  }
  cerrarParrafo();
  cerrarViñetas();
  return (
    '<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.55;color:#1f2937;max-width:640px">' +
    bloques.join('') +
    '</div>'
  );
}

/** Arma el cuerpo del envío para la API de Brevo (puro, cubierto por tests). */
export function construirPayloadBrevo(
  empresa: Empresa,
  config: ConfigApp,
  adjunto?: AdjuntoBrevo,
): PayloadBrevo {
  const { asunto, cuerpo } = generarEmail(empresa, config);
  const remitente = config.remitente.trim() || config.nombreEmpresa;
  const correoEmpresa = config.email.trim();
  return {
    sender: { name: remitente, email: correoEmpresa },
    to: [{ email: empresa.email.trim(), name: empresa.nombre }],
    replyTo: { email: correoEmpresa },
    subject: asunto,
    textContent: cuerpo,
    htmlContent: cuerpoAHtml(cuerpo),
    ...(adjunto ? { attachment: [adjunto] } : {}),
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

  // La cotización en PDF va adjunta; si su generación fallara, el correo
  // sale sin adjunto en lugar de no salir.
  let adjunto: AdjuntoBrevo | undefined;
  try {
    const pdf = await pdfCotizacionBase64(empresa, config);
    adjunto = { name: pdf.nombre, content: pdf.contenidoBase64 };
  } catch {
    adjunto = undefined;
  }

  try {
    const respuesta = await fetchConTimeout(URL_API, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        'api-key': config.brevoApiKey.trim(),
      },
      body: JSON.stringify(construirPayloadBrevo(empresa, config, adjunto)),
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
