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
