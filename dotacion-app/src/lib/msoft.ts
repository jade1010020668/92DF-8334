import type { ConfigApp, Empresa } from '../types';
import { generarEmail } from './plantillas';
import { fetchConTimeout } from './red';

/**
 * Correo automático con la cuenta Microsoft del negocio (Hotmail/Outlook),
 * por el sistema oficial de permisos de Microsoft (Graph):
 *
 * - El dueño inicia sesión UNA vez («Conectar mi correo») y autoriza a la app.
 *   La sesión queda guardada y se renueva sola; no se guarda ninguna contraseña.
 * - Desde ahí, «Correo» ENVÍA la cotización en segundo plano (sin abrir Outlook)
 *   y «Revisar respuestas» lee la bandeja de entrada para marcar quién contestó.
 *
 * Requiere un identificador de aplicación (Client ID) que se crea gratis una
 * sola vez en el portal de Microsoft; se pega en Configuración. El Client ID
 * no es secreto (es una app pública con PKCE).
 */

type Msal = typeof import('@azure/msal-browser');
type ClienteMsal = import('@azure/msal-browser').PublicClientApplication;

const PERMISOS = ['Mail.Send', 'Mail.Read'];

let instancia: ClienteMsal | null = null;
let clientIdActual = '';

/** Carga msal-browser bajo demanda (pesa; no debe ir en el arranque). */
async function obtenerMsal(clientId: string): Promise<ClienteMsal> {
  if (instancia && clientIdActual === clientId) return instancia;
  const msal: Msal = await import('@azure/msal-browser');
  const cliente = new msal.PublicClientApplication({
    auth: {
      clientId,
      // Solo cuentas personales (Hotmail/Outlook.com), como la del negocio.
      authority: 'https://login.microsoftonline.com/consumers',
      redirectUri: window.location.origin + window.location.pathname,
    },
    cache: { cacheLocation: 'localStorage' },
  });
  await cliente.initialize();
  instancia = cliente;
  clientIdActual = clientId;
  return cliente;
}

/** ¿El dueño pegó el Client ID en Configuración? */
export function correoAutomaticoConfigurado(config: ConfigApp): boolean {
  return (config.microsoftClientId ?? '').trim() !== '';
}

/** Correo de la cuenta conectada, o null si aún no se ha conectado. */
export async function cuentaConectada(config: ConfigApp): Promise<string | null> {
  if (!correoAutomaticoConfigurado(config)) return null;
  try {
    const m = await obtenerMsal(config.microsoftClientId!.trim());
    return m.getAllAccounts()[0]?.username ?? null;
  } catch {
    return null;
  }
}

/** Inicia sesión con Microsoft (ventana emergente, una sola vez). */
export async function conectarCorreo(
  config: ConfigApp,
): Promise<{ ok: true; cuenta: string } | { ok: false; error: string }> {
  try {
    const m = await obtenerMsal(config.microsoftClientId!.trim());
    const r = await m.loginPopup({ scopes: PERMISOS, prompt: 'select_account' });
    return { ok: true, cuenta: r.account?.username ?? 'cuenta conectada' };
  } catch {
    return {
      ok: false,
      error:
        'No se pudo conectar el correo. Permite las ventanas emergentes para esta página e intenta de nuevo.',
    };
  }
}

/** Cierra la conexión (borra la sesión guardada de Microsoft en este equipo). */
export async function desconectarCorreo(config: ConfigApp): Promise<void> {
  try {
    const m = await obtenerMsal(config.microsoftClientId!.trim());
    const cuenta = m.getAllAccounts()[0];
    if (cuenta) await m.clearCache({ account: cuenta });
  } catch {
    // sin conexión no hay nada que limpiar
  }
}

/** Token de acceso vigente; renueva solo y, si no puede, pide la ventana. */
async function obtenerToken(config: ConfigApp): Promise<string> {
  const m = await obtenerMsal(config.microsoftClientId!.trim());
  const cuenta = m.getAllAccounts()[0];
  if (!cuenta) {
    throw new Error('El correo no está conectado. Ve a Configuración y toca «Conectar mi correo».');
  }
  try {
    const r = await m.acquireTokenSilent({ scopes: PERMISOS, account: cuenta });
    return r.accessToken;
  } catch {
    const r = await m.acquireTokenPopup({ scopes: PERMISOS, account: cuenta });
    return r.accessToken;
  }
}

/** Envía un correo real desde la cuenta conectada (sin abrir Outlook). */
export async function enviarCorreoGraph(
  config: ConfigApp,
  destinatario: string,
  asunto: string,
  cuerpo: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const token = await obtenerToken(config);
    const respuesta = await fetchConTimeout(
      'https://graph.microsoft.com/v1.0/me/sendMail',
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: {
            subject: asunto,
            body: { contentType: 'Text', content: cuerpo },
            toRecipients: [{ emailAddress: { address: destinatario } }],
          },
          saveToSentItems: true,
        }),
      },
      20000,
    );
    if (respuesta.status === 202) return { ok: true };
    if (respuesta.status === 429) {
      return { ok: false, error: 'Microsoft pide ir más despacio. Espera un minuto y reintenta.' };
    }
    return { ok: false, error: `No se pudo enviar (Microsoft respondió ${respuesta.status}).` };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'No se pudo enviar el correo.' };
  }
}

/** Genera la cotización de una empresa y la envía automáticamente. */
export async function enviarCotizacionAuto(
  empresa: Empresa,
  config: ConfigApp,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { asunto, cuerpo } = generarEmail(empresa, config);
  return enviarCorreoGraph(config, empresa.email.trim(), asunto, cuerpo);
}

/** Interpreta la respuesta cruda de Graph y devuelve los remitentes (pura). */
export function extraerRemitentes(json: unknown): Set<string> {
  const remitentes = new Set<string>();
  const lista = (json as { value?: unknown[] })?.value;
  if (!Array.isArray(lista)) return remitentes;
  for (const m of lista) {
    const direccion = (m as { from?: { emailAddress?: { address?: string } } })?.from?.emailAddress
      ?.address;
    if (typeof direccion === 'string' && direccion.trim()) {
      remitentes.add(direccion.trim().toLowerCase());
    }
  }
  return remitentes;
}

/** Lee la bandeja de entrada y devuelve quiénes han escrito últimamente. */
export async function remitentesRecientes(
  config: ConfigApp,
): Promise<{ ok: true; correos: Set<string> } | { ok: false; error: string }> {
  try {
    const token = await obtenerToken(config);
    const respuesta = await fetchConTimeout(
      'https://graph.microsoft.com/v1.0/me/mailFolders/inbox/messages?$top=100&$select=from,receivedDateTime&$orderby=receivedDateTime desc',
      { headers: { Authorization: `Bearer ${token}` } },
      20000,
    );
    if (!respuesta.ok) {
      return { ok: false, error: `No se pudo leer la bandeja (Microsoft respondió ${respuesta.status}).` };
    }
    return { ok: true, correos: extraerRemitentes(await respuesta.json()) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'No se pudo revisar el correo.' };
  }
}

/**
 * Cruza la bandeja con la lista: empresas ya contactadas ("enviado") cuyo
 * correo aparece entre los remitentes → respondieron (pura, con pruebas).
 */
export function cruzarRespuestas(empresas: Empresa[], remitentes: Set<string>): Empresa[] {
  return empresas.filter(
    (e) => e.estado === 'enviado' && e.email.trim() !== '' && remitentes.has(e.email.trim().toLowerCase()),
  );
}
