import { describe, expect, it } from 'vitest';
import { CONFIG_DEFAULT } from '../config';
import { generarEmailMasivo, urlOutlookMasivo } from '../plantillas';

describe('generarEmailMasivo', () => {
  it('genera un correo genérico con portafolio, descuentos y firma', () => {
    const { asunto, cuerpo } = generarEmailMasivo(CONFIG_DEFAULT);
    expect(asunto).toContain(CONFIG_DEFAULT.nombreEmpresa);
    expect(cuerpo).toContain('Buen día:');
    expect(cuerpo).toContain('EPP');
    // Incluye al menos un producto del catálogo por defecto.
    expect(cuerpo).toContain(CONFIG_DEFAULT.productos[0].nombre);
    // Lleva la firma (remitente real).
    expect(cuerpo).toContain(CONFIG_DEFAULT.remitente);
  });

  it('no menciona una empresa concreta (es para varios destinatarios)', () => {
    const { cuerpo } = generarEmailMasivo(CONFIG_DEFAULT);
    expect(cuerpo).not.toMatch(/\[empresa\]|\[contacto\]/);
  });
});

describe('urlOutlookMasivo', () => {
  const destinatarios = ['a@x.com', 'b@y.com', 'c@z.com'];

  it('pone a todos los destinatarios en copia oculta (bcc)', () => {
    const url = urlOutlookMasivo(destinatarios, 'Asunto', 'Cuerpo');
    expect(url).toContain('https://outlook.live.com/mail/0/deeplink/compose');
    const bcc = new URL(url).searchParams.get('bcc');
    expect(bcc).toBe('a@x.com,b@y.com,c@z.com');
  });

  it('pone el remitente en "para" cuando se pasa', () => {
    const url = urlOutlookMasivo(destinatarios, 'A', 'B', 'yo@negocio.com');
    expect(new URL(url).searchParams.get('to')).toBe('yo@negocio.com');
  });

  it('quita correos vacíos y repetidos', () => {
    const url = urlOutlookMasivo(['a@x.com', '  ', 'a@x.com', 'b@y.com'], 'A', 'B');
    expect(new URL(url).searchParams.get('bcc')).toBe('a@x.com,b@y.com');
  });

  it('incluye asunto y cuerpo codificados', () => {
    const url = urlOutlookMasivo(destinatarios, 'Cotización', 'Hola & saludos');
    const params = new URL(url).searchParams;
    expect(params.get('subject')).toBe('Cotización');
    expect(params.get('body')).toBe('Hola & saludos');
  });
});

describe('acortarCuerpoCorreo', () => {
  it('deja intacto un cuerpo corto', async () => {
    const { acortarCuerpoCorreo } = await import('../plantillas');
    expect(acortarCuerpoCorreo('Hola\nmundo')).toBe('Hola\nmundo');
  });

  it('recorta cuerpos largos y remata con el enlace del catálogo', async () => {
    const { acortarCuerpoCorreo, URL_CATALOGO } = await import('../plantillas');
    const largo = Array.from({ length: 100 }, (_, i) => `Línea ${i} con bastante texto de relleno`).join('\n');
    const r = acortarCuerpoCorreo(largo);
    expect(r.length).toBeLessThanOrEqual(1600);
    expect(r.endsWith(URL_CATALOGO)).toBe(true);
  });

  it('el correo automático real cabe en el enlace sin recorte', async () => {
    const { generarEmail } = await import('../plantillas');
    const { CONFIG_DEFAULT } = await import('../config');
    const { cuerpo } = generarEmail(
      { id: '1', nombre: 'Prueba', sector: 'talleres', email: 'a@b.co', telefono: '3001234567', contacto: 'Ana', direccion: 'C1', estado: 'pendiente', fechaCreacion: '2026-01-01T00:00:00.000Z', fuente: 'manual' },
      CONFIG_DEFAULT,
    );
    // Si esto falla, el mensaje automático creció demasiado y la firma se cortaría.
    expect(cuerpo.length).toBeLessThanOrEqual(1600);
  });
});

describe('codificación de los enlaces de correo (bug del "+")', () => {
  it('los espacios van como %20, nunca como "+" (Outlook los mostraba literales)', async () => {
    const { urlOutlook, urlOutlookMasivo } = await import('../plantillas');
    const u1 = urlOutlook('a@b.co', 'Cotización de dotación', 'Buen día:\n\nLe escribo…');
    expect(u1).not.toContain('+');
    expect(u1).toContain('Buen%20d%C3%ADa');
    const u2 = urlOutlookMasivo(['a@b.co'], 'Asunto con espacios', 'Cuerpo con espacios');
    expect(u2).not.toContain('+');
    expect(u2).toContain('Asunto%20con%20espacios');
  });
});
