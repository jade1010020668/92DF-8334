import { describe, it, expect } from 'vitest';
import type { ConfigApp, Empresa } from '../../types';
import { CONFIG_DEFAULT } from '../config';
import {
  emojiProducto,
  formatearPesos,
  generarEmail,
  generarEmailSeguimiento,
  generarWhatsApp,
  generarWhatsAppSeguimiento,
  normalizarTelefonoWhatsApp,
  reemplazarMarcadores,
  urlGmail,
  urlWhatsApp,
} from '../plantillas';

function empresa(overrides: Partial<Empresa> = {}): Empresa {
  return {
    id: 'emp-1',
    nombre: 'Plásticos Andinos S.A.S.',
    sector: 'plásticos',
    email: 'compras@plasticosandinos.com',
    telefono: '3001234567',
    contacto: 'María Pérez',
    direccion: 'Calle 13 # 68-50',
    estado: 'pendiente',
    fechaCreacion: '2026-06-01T10:00:00.000Z',
    fuente: 'manual',
    ...overrides,
  };
}

function config(overrides: Partial<ConfigApp> = {}): ConfigApp {
  return {
    ...CONFIG_DEFAULT,
    telefono: '300 765 4321',
    email: 'ventas@elmanantial.co',
    remitente: 'Carlos Morales',
    productos: [
      { nombre: 'Guantes de nitrilo', precioDesde: 25000, unidad: 'par' },
      { nombre: 'Cascos de seguridad', precioDesde: 0, unidad: 'unidad' },
    ],
    ...overrides,
  };
}

describe('formatearPesos (casos límite)', () => {
  it('formatea 0 sin separadores', () => {
    expect(formatearPesos(0)).toBe(`$ ${(0).toLocaleString('es-CO')} COP`);
  });

  it('formatea valores grandes con separador de miles', () => {
    expect(formatearPesos(1234567)).toBe(`$ ${(1234567).toLocaleString('es-CO')} COP`);
  });

  it('formatea valores negativos respetando el locale', () => {
    expect(formatearPesos(-5000)).toBe(`$ ${(-5000).toLocaleString('es-CO')} COP`);
  });
});

describe('generarEmail — empresa sin contacto ni sector', () => {
  it('usa "equipo de {nombre}" y frase de sector genérica', () => {
    const { cuerpo, asunto } = generarEmail(empresa({ contacto: '  ', sector: '  ' }), config());
    expect(cuerpo).toContain('Buen día, equipo de Plásticos Andinos S.A.S.:');
    expect(cuerpo).toContain('Sabemos que la seguridad y la dotación del personal son prioridad en su operación,');
    expect(cuerpo).not.toContain('sector de');
    expect(asunto).toContain('Plásticos Andinos S.A.S.');
  });

  it('incluye frase específica de sector cuando hay sector', () => {
    const { cuerpo } = generarEmail(empresa({ sector: 'metalmecánica' }), config());
    expect(cuerpo).toContain('en el sector de metalmecánica la seguridad');
  });

  it('omite líneas de tel y correo en la firma cuando no están configurados', () => {
    const { cuerpo } = generarEmail(empresa(), config({ telefono: '  ', email: '' }));
    expect(cuerpo).not.toContain('Tel / WhatsApp:');
    expect(cuerpo).not.toContain('Correo:');
  });

  it('cae al nombre de la empresa cuando no hay remitente', () => {
    const cfg = config({ remitente: '   ' });
    const { cuerpo } = generarEmail(empresa(), cfg);
    expect(cuerpo).toContain(`Mi nombre es ${cfg.nombreEmpresa} y les escribo`);
  });
});

describe('generarEmailSeguimiento', () => {
  it('arma asunto y cuerpo de seguimiento con saludo y firma', () => {
    const { asunto, cuerpo } = generarEmailSeguimiento(empresa(), config());
    expect(asunto).toBe('Seguimiento — cotización de dotación para Plásticos Andinos S.A.S.');
    expect(cuerpo).toContain('Buen día, María Pérez:');
    expect(cuerpo).toContain('Hace unos días les compartimos nuestro portafolio');
    expect(cuerpo).toContain('Carlos Morales');
  });

  it('saluda al equipo cuando no hay contacto', () => {
    const { cuerpo } = generarEmailSeguimiento(empresa({ contacto: '' }), config());
    expect(cuerpo).toContain('Buen día, equipo de Plásticos Andinos S.A.S.:');
  });
});

describe('generarWhatsApp — empresa sin contacto ni sector', () => {
  it('saluda sin nombre y usa la frase genérica de oferta', () => {
    const mensaje = generarWhatsApp(empresa({ contacto: '', sector: '' }), config());
    expect(mensaje).toContain('¡Hola! 👋');
    expect(mensaje).toContain('Queremos ofrecerle a *Plásticos Andinos S.A.S.* nuestra dotación:');
    expect(mensaje).not.toContain('trabaja en el sector');
  });

  it('saluda al contacto y menciona el sector cuando existen', () => {
    const mensaje = generarWhatsApp(empresa({ contacto: 'Ana', sector: 'alimentos' }), config());
    expect(mensaje).toContain('¡Hola, Ana! 👋');
    expect(mensaje).toContain('trabaja en el sector de alimentos');
  });
});

describe('generarWhatsAppSeguimiento', () => {
  it('saluda "de nuevo" al contacto y menciona ambas empresas', () => {
    const mensaje = generarWhatsAppSeguimiento(empresa({ contacto: 'Ana' }), config());
    expect(mensaje).toContain('¡Hola de nuevo, Ana! 👋');
    expect(mensaje).toContain('*Plásticos Andinos S.A.S.*');
    expect(mensaje).toContain('Carlos Morales');
  });

  it('saluda "de nuevo" sin nombre cuando no hay contacto', () => {
    const mensaje = generarWhatsAppSeguimiento(empresa({ contacto: '  ' }), config());
    expect(mensaje).toContain('¡Hola de nuevo! 👋');
  });
});

describe('reemplazarMarcadores (casos límite)', () => {
  it('reemplaza marcadores repetidos en todas sus apariciones', () => {
    const texto = reemplazarMarcadores('[empresa] [empresa] [empresa]', empresa(), config(), 'X');
    expect(texto).toBe('Plásticos Andinos S.A.S. Plásticos Andinos S.A.S. Plásticos Andinos S.A.S.');
  });

  it('deja literales los marcadores que no existen', () => {
    const texto = reemplazarMarcadores('[empresa] [inexistente] [otro]', empresa(), config(), 'X');
    expect(texto).toContain('Plásticos Andinos S.A.S.');
    expect(texto).toContain('[inexistente]');
    expect(texto).toContain('[otro]');
  });

  it('usa "equipo de {nombre}" para [contacto] sin contacto y "su sector" para [sector] sin sector', () => {
    const texto = reemplazarMarcadores(
      'C=[contacto] S=[sector]',
      empresa({ contacto: '   ', sector: '' }),
      config(),
      'X',
    );
    expect(texto).toBe('C=equipo de Plásticos Andinos S.A.S. S=su sector');
  });

  it('sustituye [productos] por el texto recibido y [descuentos] por el de config', () => {
    const cfg = config({ textoDescuentos: 'DESC-XYZ' });
    const texto = reemplazarMarcadores('P=[productos] D=[descuentos]', empresa(), cfg, 'LISTA-PROD');
    expect(texto).toBe('P=LISTA-PROD D=DESC-XYZ');
  });

  it('[remitente] cae al nombre de la empresa cuando el remitente está vacío', () => {
    const cfg = config({ remitente: '  ' });
    const texto = reemplazarMarcadores('R=[remitente]', empresa(), cfg, 'X');
    expect(texto).toBe(`R=${cfg.nombreEmpresa}`);
  });
});

describe('normalizarTelefonoWhatsApp (formatos raros)', () => {
  it('acepta celular con guiones', () => {
    expect(normalizarTelefonoWhatsApp('300-123-4567')).toBe('573001234567');
  });

  it('acepta celular ya con 57 pegado (12 dígitos)', () => {
    expect(normalizarTelefonoWhatsApp('573001234567')).toBe('573001234567');
  });

  it('acepta +57 con paréntesis y espacios mezclados', () => {
    expect(normalizarTelefonoWhatsApp('(+57) 300 123 4567')).toBe('573001234567');
  });

  it('rechaza el fijo de Bogotá 601 de 10 dígitos (no empieza por 3)', () => {
    expect(normalizarTelefonoWhatsApp('6011234567')).toBeNull();
  });

  it('intenta tal cual un internacional de 11+ dígitos que no es colombiano', () => {
    // 11 dígitos, no empieza por 573 ni es celular de 10: se devuelve como está.
    expect(normalizarTelefonoWhatsApp('12025550123')).toBe('12025550123');
  });

  it('devuelve null cuando no hay dígitos', () => {
    expect(normalizarTelefonoWhatsApp('sin numero')).toBeNull();
    expect(normalizarTelefonoWhatsApp('+++ --- ()')).toBeNull();
  });

  it('rechaza un fijo de 7 dígitos', () => {
    expect(normalizarTelefonoWhatsApp('2345678')).toBeNull();
  });
});

describe('urlGmail (codificación de caracteres especiales)', () => {
  it('codifica acentos, & y saltos de línea en el cuerpo de forma recuperable', () => {
    const cuerpo = 'Atención & cariño\nsegunda línea';
    const url = urlGmail('a@b.com', 'Asunto', cuerpo);
    const parsed = new URL(url);
    // Lo importante: el valor se recupera idéntico al parsear de vuelta.
    expect(parsed.searchParams.get('body')).toBe(cuerpo);
    // No deben aparecer crudos en la query string.
    expect(url).not.toContain('\n');
    // URLSearchParams codifica el espacio como '+' y el '&' como '%26', así que
    // los caracteres especiales sueltos van escapados (tilde y ñ en %XX).
    expect(url).toContain('Atenci%C3%B3n');
    expect(url).toContain('%26');
    expect(url).toContain('cari%C3%B1o');
    expect(url).not.toContain('& cariño');
  });

  it('codifica el asunto con acentos y símbolos', () => {
    const asunto = 'Cotización 100% EPP + dotación';
    const url = urlGmail('a@b.com', asunto, 'cuerpo');
    expect(new URL(url).searchParams.get('su')).toBe(asunto);
  });

  it('siempre incluye view=cm y fs=1', () => {
    const parsed = new URL(urlGmail('a@b.com', 's', 'c'));
    expect(parsed.searchParams.get('view')).toBe('cm');
    expect(parsed.searchParams.get('fs')).toBe('1');
  });
});

describe('urlWhatsApp (codificación de caracteres especiales)', () => {
  it('codifica acentos, & y saltos de línea de forma recuperable', () => {
    const mensaje = '¡Hola! Atención & EPP\nlínea 2';
    const url = urlWhatsApp('3001234567', mensaje);
    expect(url).not.toBeNull();
    expect(url).toBe(`https://wa.me/573001234567?text=${encodeURIComponent(mensaje)}`);
    // Decodificar el text recupera el mensaje original.
    const text = url!.slice(url!.indexOf('?text=') + '?text='.length);
    expect(decodeURIComponent(text)).toBe(mensaje);
  });

  it('devuelve null cuando el teléfono es un fijo', () => {
    expect(urlWhatsApp('6011234567', 'Hola')).toBeNull();
  });
});

describe('emojiProducto (variedad de productos)', () => {
  it('asigna emojis por palabra clave para distintos productos', () => {
    expect(emojiProducto('Casco de obra')).toBe('⛑️');
    expect(emojiProducto('Botas de seguridad')).toBe('👢');
    expect(emojiProducto('Calzado dieléctrico')).toBe('👢');
    expect(emojiProducto('Overol enterizo')).toBe('👕');
    expect(emojiProducto('Uniforme de vendedor')).toBe('👕');
    expect(emojiProducto('Gafas de protección')).toBe('🥽');
    expect(emojiProducto('Tapabocas industrial')).toBe('😷');
    expect(emojiProducto('Respirador media cara')).toBe('😷');
    expect(emojiProducto('Arnés de altura')).toBe('🪢');
    expect(emojiProducto('Chaleco reflectivo')).toBe('🦺');
  });

  it('es insensible a mayúsculas', () => {
    expect(emojiProducto('GUANTES DE CARNAZA')).toBe('🧤');
  });

  it('genérico para producto sin palabra clave', () => {
    expect(emojiProducto('Termo plástico')).toBe('✅');
  });
});
