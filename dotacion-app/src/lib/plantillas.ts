import type { ConfigApp, Empresa } from '../types';

/** Formatea un valor en pesos colombianos: 25000 -> "$ 25.000 COP". */
export function formatearPesos(valor: number): string {
  return `$ ${valor.toLocaleString('es-CO')} COP`;
}

function saludoFormal(empresa: Empresa): string {
  const contacto = empresa.contacto.trim();
  if (contacto) return `Buen día, ${contacto}:`;
  return `Buen día, equipo de ${empresa.nombre}:`;
}

function listaProductosEmail(config: ConfigApp): string {
  return config.productos
    .map((p) => {
      const precio = p.precioDesde > 0 ? ` — desde ${formatearPesos(p.precioDesde)} por ${p.unidad}` : '';
      return `  • ${p.nombre}${precio}`;
    })
    .join('\n');
}

function firmaEmail(config: ConfigApp): string {
  const lineas = [
    config.remitente.trim(),
    config.nombreEmpresa,
    [config.direccion, config.ciudad].filter(Boolean).join(', '),
    config.telefono.trim() ? `Tel / WhatsApp: ${config.telefono.trim()}` : '',
    config.email.trim() ? `Correo: ${config.email.trim()}` : '',
  ];
  return lineas.filter(Boolean).join('\n');
}

/**
 * Marcadores disponibles en las plantillas personalizadas:
 * [saludo] [empresa] [contacto] [sector] [productos] [descuentos] [remitente] [firma]
 */
export function reemplazarMarcadores(
  plantilla: string,
  empresa: Empresa,
  config: ConfigApp,
  productos: string,
): string {
  return plantilla
    .replaceAll('[saludo]', saludoFormal(empresa))
    .replaceAll('[empresa]', empresa.nombre)
    .replaceAll('[contacto]', empresa.contacto.trim() || `equipo de ${empresa.nombre}`)
    .replaceAll('[sector]', empresa.sector.trim() || 'su sector')
    .replaceAll('[productos]', productos)
    .replaceAll('[descuentos]', config.textoDescuentos)
    .replaceAll('[remitente]', config.remitente.trim() || config.nombreEmpresa)
    .replaceAll('[firma]', firmaEmail(config));
}

/** Email de primera cotización, personalizado por empresa y sector. */
export function generarEmail(empresa: Empresa, config: ConfigApp): { asunto: string; cuerpo: string } {
  const personalizada = config.plantillaEmail.trim();
  if (personalizada) {
    return {
      asunto: `Cotización de dotación industrial y EPP para ${empresa.nombre}`,
      cuerpo: reemplazarMarcadores(personalizada, empresa, config, listaProductosEmail(config)),
    };
  }
  return generarEmailAutomatico_(empresa, config);
}

function generarEmailAutomatico_(empresa: Empresa, config: ConfigApp): { asunto: string; cuerpo: string } {
  const sector = empresa.sector.trim();
  const fraseSector = sector
    ? `Sabemos que en el sector de ${sector} la seguridad y la dotación del personal son prioridad, `
    : 'Sabemos que la seguridad y la dotación del personal son prioridad en su operación, ';

  const asunto = `Cotización de dotación industrial y EPP para ${empresa.nombre}`;

  const cuerpo = [
    saludoFormal(empresa),
    '',
    `Mi nombre es ${config.remitente.trim() || config.nombreEmpresa} y les escribo de ${config.nombreEmpresa}, empresa bogotana especializada en dotación industrial y elementos de protección personal (EPP).`,
    '',
    `${fraseSector}por eso queremos presentarles nuestro portafolio:`,
    '',
    listaProductosEmail(config),
    '',
    config.textoDescuentos,
    'Atendemos pedidos desde 10 unidades, con entrega en Bogotá y alrededores.',
    '',
    'Con gusto les preparamos una cotización formal sin ningún compromiso. ¿Me podrían indicar qué productos y cantidades necesitan?',
    '',
    'Cordial saludo,',
    '',
    firmaEmail(config),
  ].join('\n');

  return { asunto, cuerpo };
}

/** Email corto de seguimiento cuando la empresa no ha respondido. */
export function generarEmailSeguimiento(
  empresa: Empresa,
  config: ConfigApp,
): { asunto: string; cuerpo: string } {
  const asunto = `Seguimiento — cotización de dotación para ${empresa.nombre}`;
  const cuerpo = [
    saludoFormal(empresa),
    '',
    `Hace unos días les compartimos nuestro portafolio de dotación industrial y EPP de ${config.nombreEmpresa} y quería saber si tuvieron oportunidad de revisarlo.`,
    '',
    'Si les interesa, con mucho gusto les preparo una cotización ajustada a las cantidades que necesiten. También puedo atenderlos por teléfono o WhatsApp si les queda más fácil.',
    '',
    'Quedo atento a sus comentarios.',
    '',
    'Cordial saludo,',
    '',
    firmaEmail(config),
  ].join('\n');
  return { asunto, cuerpo };
}

/** Emoji para un producto del catálogo según palabras clave (para WhatsApp). */
export function emojiProducto(nombre: string): string {
  const n = nombre.toLowerCase();
  if (n.includes('guante')) return '🧤';
  if (n.includes('casco')) return '⛑️';
  if (n.includes('calzado') || n.includes('bota')) return '👢';
  if (n.includes('overol') || n.includes('uniforme') || n.includes('ropa')) return '👕';
  if (n.includes('gafa') || n.includes('careta') || n.includes('visual')) return '🥽';
  if (n.includes('tapaboca') || n.includes('respirador') || n.includes('respiratoria')) return '😷';
  if (n.includes('arn') || n.includes('altura')) return '🪢';
  if (n.includes('chaleco') || n.includes('reflectiv') || n.includes('señal')) return '🦺';
  return '✅';
}

/** Mensaje de WhatsApp de primer contacto, cercano y con emojis. */
export function generarWhatsApp(empresa: Empresa, config: ConfigApp): string {
  const personalizada = config.plantillaWhatsApp.trim();
  if (personalizada) {
    const productos = config.productos
      .map((p) => `${emojiProducto(p.nombre)} ${p.nombre}`)
      .join('\n');
    return reemplazarMarcadores(personalizada, empresa, config, productos);
  }
  return generarWhatsAppAutomatico_(empresa, config);
}

function generarWhatsAppAutomatico_(empresa: Empresa, config: ConfigApp): string {
  const contacto = empresa.contacto.trim();
  const saludo = contacto ? `¡Hola, ${contacto}! 👋` : '¡Hola! 👋';
  const sector = empresa.sector.trim();
  const fraseSector = sector
    ? `Sabemos que *${empresa.nombre}* trabaja en el sector de ${sector} y queremos ofrecerles nuestra dotación:`
    : `Queremos ofrecerle a *${empresa.nombre}* nuestra dotación:`;

  const productos = config.productos.map((p) => `${emojiProducto(p.nombre)} ${p.nombre}`).join('\n');

  const lineas = [
    saludo,
    '',
    `Le escribo de *${config.nombreEmpresa}* 🏭, proveedores de dotación industrial y EPP en Bogotá.`,
    '',
    fraseSector,
    '',
    productos,
    '',
    `💰 ${config.textoDescuentos}`,
    '🚚 Entregamos en Bogotá y alrededores.',
    '',
    '¿Le interesa que le enviemos una cotización sin compromiso? 😊',
    '',
    [config.remitente.trim(), config.nombreEmpresa].filter(Boolean).join(' — '),
    `📍 ${[config.direccion, config.ciudad].filter(Boolean).join(', ')}`,
  ];
  return lineas.join('\n');
}

/** Mensaje corto de seguimiento por WhatsApp. */
export function generarWhatsAppSeguimiento(empresa: Empresa, config: ConfigApp): string {
  const contacto = empresa.contacto.trim();
  const saludo = contacto ? `¡Hola de nuevo, ${contacto}! 👋` : '¡Hola de nuevo! 👋';
  return [
    saludo,
    '',
    `Le escribí hace unos días de *${config.nombreEmpresa}* con nuestro portafolio de dotación industrial y EPP para *${empresa.nombre}*.`,
    '',
    '¿Tuvo oportunidad de revisarlo? Con gusto le preparo una cotización con los productos y cantidades que necesite. 😊',
    '',
    [config.remitente.trim(), config.nombreEmpresa].filter(Boolean).join(' — '),
  ].join('\n');
}

/**
 * Normaliza un teléfono colombiano al formato que exige wa.me (solo dígitos,
 * con indicativo de país). Devuelve null si no sirve para WhatsApp.
 */
export function normalizarTelefonoWhatsApp(telefono: string): string | null {
  const digitos = telefono.replace(/\D/g, '');
  if (!digitos) return null;
  // Celular colombiano de 10 dígitos (empieza por 3): agregar indicativo 57.
  if (digitos.length === 10 && digitos.startsWith('3')) return `57${digitos}`;
  // Ya viene con indicativo 57 + celular.
  if (digitos.length === 12 && digitos.startsWith('573')) return digitos;
  // Otro número internacional completo (>= 11 dígitos): se intenta tal cual.
  if (digitos.length >= 11) return digitos;
  // Fijos o números incompletos no sirven para WhatsApp.
  return null;
}

/** URL para abrir Gmail con el correo ya escrito. */
export function urlGmail(destinatario: string, asunto: string, cuerpo: string): string {
  const params = new URLSearchParams({
    view: 'cm',
    fs: '1',
    to: destinatario,
    su: asunto,
    body: cuerpo,
  });
  return `https://mail.google.com/mail/?${params.toString()}`;
}

/** URL para abrir WhatsApp con el mensaje ya cargado. Null si el teléfono no sirve. */
export function urlWhatsApp(telefono: string, mensaje: string): string | null {
  const numero = normalizarTelefonoWhatsApp(telefono);
  if (!numero) return null;
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`;
}
