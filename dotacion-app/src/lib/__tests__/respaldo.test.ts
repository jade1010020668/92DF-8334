import { describe, expect, it } from 'vitest';
import { generarRespaldo, parsearRespaldo } from '../respaldo';
import { reemplazarMarcadores, generarEmail, generarWhatsApp } from '../plantillas';
import { CONFIG_DEFAULT } from '../config';
import type { ConfigApp, Empresa } from '../../types';

const config: ConfigApp = {
  ...CONFIG_DEFAULT,
  email: 'ventas@manantial.com',
  remitente: 'Carlos Morales',
  googleMapsApiKey: 'clave-google-secreta',
  brevoApiKey: 'clave-brevo-secreta',
};

const empresa: Empresa = {
  id: 'e1',
  nombre: 'Plásticos Andinos S.A.S.',
  sector: 'plásticos',
  email: 'compras@andinos.com',
  telefono: '3001234567',
  contacto: 'María Pérez',
  direccion: 'Calle 13 # 68-50, Bogotá',
  estado: 'enviado',
  fechaCreacion: '2026-06-01T10:00:00.000Z',
  fechaEnvio: '2026-06-02T08:00:00.000Z',
  fuente: 'maps',
};

describe('respaldo completo', () => {
  it('hace ida y vuelta conservando empresas con fechas y estados', () => {
    const leido = parsearRespaldo(generarRespaldo([empresa], config));
    expect(leido).not.toBeNull();
    expect(leido!.empresas).toEqual([empresa]);
    expect(leido!.config.remitente).toBe('Carlos Morales');
  });

  it('las claves de API nunca viajan en el archivo', () => {
    const texto = generarRespaldo([empresa], config);
    expect(texto).not.toContain('clave-google-secreta');
    expect(texto).not.toContain('clave-brevo-secreta');
    const leido = parsearRespaldo(texto);
    expect(leido!.config.googleMapsApiKey).toBe('');
    expect(leido!.config.brevoApiKey).toBe('');
  });

  it('rechaza archivos que no son de DotaciónPro', () => {
    expect(parsearRespaldo('{"otra":"cosa"}')).toBeNull();
    expect(parsearRespaldo('esto no es json')).toBeNull();
    expect(parsearRespaldo('{"app":"dotacionpro"}')).toBeNull();
  });

  it('filtra empresas corruptas del respaldo', () => {
    const texto = generarRespaldo([empresa], config).replace(
      '"empresas": [',
      '"empresas": [null, {"sinId": true},',
    );
    const leido = parsearRespaldo(texto);
    expect(leido!.empresas).toEqual([empresa]);
  });
});

describe('plantillas personalizadas', () => {
  it('reemplazarMarcadores sustituye todos los marcadores', () => {
    const texto = reemplazarMarcadores(
      '[saludo] | [empresa] | [contacto] | [sector] | [remitente]',
      empresa,
      config,
      'PRODUCTOS',
    );
    expect(texto).toContain('María Pérez');
    expect(texto).toContain('Plásticos Andinos S.A.S.');
    expect(texto).toContain('plásticos');
    expect(texto).toContain('Carlos Morales');
    expect(texto).not.toContain('[');
  });

  it('generarEmail usa la plantilla personalizada cuando existe', () => {
    const conPlantilla: ConfigApp = {
      ...config,
      plantillaEmail: 'Hola [contacto], oferta para [empresa]\n[productos]',
      productos: [{ nombre: 'Guantes de carnaza', precioDesde: 0, unidad: 'par' }],
    };
    const { cuerpo } = generarEmail(empresa, conPlantilla);
    expect(cuerpo).toBe(
      'Hola María Pérez, oferta para Plásticos Andinos S.A.S.\n  • Guantes de carnaza',
    );
  });

  it('generarWhatsApp usa la plantilla personalizada cuando existe', () => {
    const conPlantilla = { ...config, plantillaWhatsApp: '¡Hola [contacto]! Somos [remitente].' };
    expect(generarWhatsApp(empresa, conPlantilla)).toBe('¡Hola María Pérez! Somos Carlos Morales.');
  });

  it('con plantillas vacías se usa el mensaje automático', () => {
    const { cuerpo } = generarEmail(empresa, config);
    expect(cuerpo).toContain('Mi nombre es Carlos Morales');
    expect(generarWhatsApp(empresa, config)).toContain('🏭');
  });
});
