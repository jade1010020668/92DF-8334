import { describe, expect, it } from 'vitest';
import { construirPayloadBrevo, enviarCorreoBrevo } from '../brevo';
import { CONFIG_DEFAULT } from '../config';
import type { ConfigApp, Empresa } from '../../types';

const config: ConfigApp = {
  ...CONFIG_DEFAULT,
  email: 'ventas@manantial.com',
  telefono: '+57 300 123 4567',
  remitente: 'Carlos Morales',
  brevoApiKey: 'clave-de-prueba',
};

const empresa: Empresa = {
  id: 'e1',
  nombre: 'Plásticos Andinos S.A.S.',
  sector: 'plásticos',
  email: 'compras@plasticosandinos.com',
  telefono: '3001234567',
  contacto: 'María Pérez',
  direccion: 'Calle 13 # 68-50, Bogotá',
  estado: 'pendiente',
  fechaCreacion: '2026-06-01T10:00:00.000Z',
  fuente: 'manual',
};

describe('construirPayloadBrevo', () => {
  it('arma remitente, destinatario, respuesta, asunto y cuerpo', () => {
    const payload = construirPayloadBrevo(empresa, config);
    expect(payload.sender).toEqual({ name: 'Carlos Morales', email: 'ventas@manantial.com' });
    expect(payload.to).toEqual([
      { email: 'compras@plasticosandinos.com', name: 'Plásticos Andinos S.A.S.' },
    ]);
    expect(payload.replyTo).toEqual({ email: 'ventas@manantial.com' });
    expect(payload.subject).toContain('Plásticos Andinos S.A.S.');
    expect(payload.textContent).toContain('María Pérez');
    expect(payload.textContent).toContain(config.textoDescuentos);
  });

  it('usa el nombre de la empresa propia si no hay remitente configurado', () => {
    const sinRemitente = { ...config, remitente: '  ' };
    const payload = construirPayloadBrevo(empresa, sinRemitente);
    expect(payload.sender.name).toBe(CONFIG_DEFAULT.nombreEmpresa);
  });

  it('incluye el PDF adjunto cuando se entrega', () => {
    const payload = construirPayloadBrevo(empresa, config, {
      name: 'Cotizacion Demo.pdf',
      content: 'JVBERi0xLjc=',
    });
    expect(payload.attachment).toEqual([{ name: 'Cotizacion Demo.pdf', content: 'JVBERi0xLjc=' }]);
  });

  it('sin adjunto no incluye el campo attachment', () => {
    expect(construirPayloadBrevo(empresa, config).attachment).toBeUndefined();
  });

  it('recorta espacios en los correos', () => {
    const payload = construirPayloadBrevo(
      { ...empresa, email: '  compras@plasticosandinos.com  ' },
      { ...config, email: ' ventas@manantial.com ' },
    );
    expect(payload.sender.email).toBe('ventas@manantial.com');
    expect(payload.to[0].email).toBe('compras@plasticosandinos.com');
  });
});

describe('enviarCorreoBrevo — validaciones previas (sin red)', () => {
  it('falla sin clave de Brevo', async () => {
    const resultado = await enviarCorreoBrevo(empresa, { ...config, brevoApiKey: '' });
    expect(resultado.ok).toBe(false);
    if (!resultado.ok) expect(resultado.error).toContain('clave de Brevo');
  });

  it('falla sin correo del remitente', async () => {
    const resultado = await enviarCorreoBrevo(empresa, { ...config, email: '  ' });
    expect(resultado.ok).toBe(false);
    if (!resultado.ok) expect(resultado.error).toContain('Configuración');
  });

  it('falla si la empresa no tiene correo', async () => {
    const resultado = await enviarCorreoBrevo({ ...empresa, email: '' }, config);
    expect(resultado.ok).toBe(false);
    if (!resultado.ok) expect(resultado.error).toContain(empresa.nombre);
  });
});

describe('cuerpoAHtml (correo bonito)', () => {
  it('convierte el correo real en HTML con viñetas, enlace clicable y sin "+"', async () => {
    const { cuerpoAHtml } = await import('../brevo');
    const { generarEmail } = await import('../plantillas');
    const { CONFIG_DEFAULT } = await import('../config');
    const { cuerpo } = generarEmail(
      { id: '1', nombre: 'Taller X', sector: 'talleres', email: 'a@b.co', telefono: '3001234567', contacto: 'Ana', direccion: 'C1', estado: 'pendiente', fechaCreacion: '2026-01-01T00:00:00.000Z', fuente: 'manual' },
      CONFIG_DEFAULT,
    );
    const html = cuerpoAHtml(cuerpo);
    expect(html).toContain('<ul');
    expect(html).toContain('<li');
    expect(html).toContain('Overoles');
    expect(html).toContain('<a href="https://morales101002-dotacionpro.static.hf.space/catalogo.html"');
    expect(html).not.toContain('+•');
  });

  it('escapa HTML peligroso del contenido', async () => {
    const { cuerpoAHtml } = await import('../brevo');
    const html = cuerpoAHtml('Hola <script>alert(1)</script>\n\n  • item <b>x</b>');
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });
});
