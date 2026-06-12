import { describe, it, expect } from 'vitest';
import type { ConfigApp, Empresa } from '../../types';
import { CONFIG_DEFAULT } from '../config';
import {
  emojiProducto,
  formatearPesos,
  generarEmail,
  generarWhatsApp,
  normalizarTelefonoWhatsApp,
  urlGmail,
  urlWhatsApp,
} from '../plantillas';

/** Factory de Empresa de prueba. */
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

/** Factory de ConfigApp de prueba, partiendo de los defaults. */
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

describe('formatearPesos', () => {
  it('formatea 25000 como pesos colombianos con separador de miles', () => {
    const resultado = formatearPesos(25000);
    // El separador de miles depende del ICU (punto o espacio): regex flexible
    // y comparación contra el mismo toLocaleString para no hacer el test frágil.
    expect(resultado).toMatch(/^\$ 25[.\s  ]000 COP$/);
    expect(resultado).toBe(`$ ${(25000).toLocaleString('es-CO')} COP`);
  });
});

describe('generarEmail', () => {
  it('saluda a la persona de contacto cuando existe', () => {
    const { cuerpo } = generarEmail(empresa({ contacto: 'María Pérez' }), config());
    expect(cuerpo).toContain('Buen día, María Pérez:');
  });

  it('usa "equipo de {nombre}" cuando no hay contacto', () => {
    const { cuerpo } = generarEmail(empresa({ contacto: '  ' }), config());
    expect(cuerpo).toContain('Buen día, equipo de Plásticos Andinos S.A.S.:');
  });

  it('incluye cada producto del catálogo configurado', () => {
    const cfg = config();
    const { cuerpo } = generarEmail(empresa(), cfg);
    for (const producto of cfg.productos) {
      expect(cuerpo).toContain(producto.nombre);
    }
  });

  it('incluye el texto de descuentos', () => {
    const cfg = config();
    const { cuerpo } = generarEmail(empresa(), cfg);
    expect(cuerpo).toContain(cfg.textoDescuentos);
  });

  it('incluye la firma con teléfono y correo cuando están configurados', () => {
    const { cuerpo } = generarEmail(empresa(), config());
    expect(cuerpo).toContain('Carlos Morales');
    expect(cuerpo).toContain('Tel / WhatsApp: 300 765 4321');
    expect(cuerpo).toContain('Correo: ventas@elmanantial.co');
  });

  it('pone el nombre de la empresa destino en el asunto', () => {
    const { asunto } = generarEmail(empresa(), config());
    expect(asunto).toContain('Plásticos Andinos S.A.S.');
  });

  it('muestra el precio formateado cuando precioDesde > 0 y omite "desde" cuando es 0', () => {
    const { cuerpo } = generarEmail(empresa(), config());
    expect(cuerpo).toContain(`desde ${formatearPesos(25000)} por par`);
    const lineaSinPrecio = cuerpo.split('\n').find((l) => l.includes('Cascos de seguridad'));
    expect(lineaSinPrecio).toBeDefined();
    expect(lineaSinPrecio).not.toContain('desde');
  });
});

describe('normalizarTelefonoWhatsApp', () => {
  it('agrega indicativo 57 a un celular de 10 dígitos con espacios', () => {
    expect(normalizarTelefonoWhatsApp('300 123 4567')).toBe('573001234567');
  });

  it('acepta un número que ya trae +57', () => {
    expect(normalizarTelefonoWhatsApp('+57 300 123 4567')).toBe('573001234567');
  });

  it('agrega indicativo 57 a un celular pegado', () => {
    expect(normalizarTelefonoWhatsApp('3001234567')).toBe('573001234567');
  });

  it('rechaza fijos de 10 dígitos que no empiezan por 3 (comportamiento documentado)', () => {
    // La implementación trata los 10 dígitos que no empiezan por 3 como fijo
    // colombiano y devuelve null porque no sirven para wa.me.
    expect(normalizarTelefonoWhatsApp('601 234 5678')).toBeNull();
  });

  it('rechaza números incompletos y vacíos', () => {
    expect(normalizarTelefonoWhatsApp('12345')).toBeNull();
    expect(normalizarTelefonoWhatsApp('')).toBeNull();
  });
});

describe('urlWhatsApp', () => {
  it('arma la URL wa.me con el mensaje codificado', () => {
    const mensaje = '¡Hola! ¿Cómo están?';
    const url = urlWhatsApp('300 123 4567', mensaje);
    expect(url).not.toBeNull();
    expect(url).toBe(`https://wa.me/573001234567?text=${encodeURIComponent(mensaje)}`);
  });

  it('devuelve null con teléfono inválido', () => {
    expect(urlWhatsApp('12345', 'Hola')).toBeNull();
  });
});

describe('urlGmail', () => {
  it('contiene view=cm, destinatario y asunto codificados', () => {
    const url = urlGmail('compras@plasticosandinos.com', 'Cotización de dotación', 'Buen día');
    const parsed = new URL(url);
    expect(parsed.origin + parsed.pathname).toBe('https://mail.google.com/mail/');
    expect(parsed.searchParams.get('view')).toBe('cm');
    expect(parsed.searchParams.get('to')).toBe('compras@plasticosandinos.com');
    expect(parsed.searchParams.get('su')).toBe('Cotización de dotación');
    expect(url).toContain('view=cm');
    expect(url).toContain(encodeURIComponent('compras@plasticosandinos.com'));
  });
});

describe('generarWhatsApp', () => {
  it('incluye la empresa destino en negrita, un emoji de producto y el remitente', () => {
    const mensaje = generarWhatsApp(empresa(), config());
    expect(mensaje).toContain('*Plásticos Andinos S.A.S.*');
    expect(mensaje).toContain('🧤 Guantes de nitrilo');
    expect(mensaje).toContain('Carlos Morales');
  });
});

describe('emojiProducto', () => {
  it('asigna el emoji por palabra clave', () => {
    expect(emojiProducto('Guantes de nitrilo')).toBe('🧤');
  });

  it('usa el emoji genérico cuando no hay keyword', () => {
    expect(emojiProducto('Producto misterioso')).toBe('✅');
  });
});
