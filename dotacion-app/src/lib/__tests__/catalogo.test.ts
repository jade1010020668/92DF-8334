import { describe, expect, it } from 'vitest';
import type { Empresa } from '../../types';
import { CONFIG_DEFAULT } from '../config';
import { URL_CATALOGO, mensajeCatalogo, urlWhatsAppCatalogo } from '../plantillas';

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

describe('mensajeCatalogo', () => {
  it('incluye el enlace del catálogo, el saludo y el nombre de la empresa', () => {
    const msg = mensajeCatalogo(empresa(), CONFIG_DEFAULT);
    expect(msg).toContain(URL_CATALOGO);
    expect(msg).toContain('María Pérez');
    expect(msg).toContain(CONFIG_DEFAULT.nombreEmpresa);
  });

  it('saluda genérico si no hay contacto', () => {
    const msg = mensajeCatalogo(empresa({ contacto: '' }), CONFIG_DEFAULT);
    expect(msg).toContain('¡Hola!');
  });
});

describe('urlWhatsAppCatalogo', () => {
  it('arma la URL de WhatsApp con el catálogo para un celular válido', () => {
    const url = urlWhatsAppCatalogo(empresa({ telefono: '3001234567' }), CONFIG_DEFAULT);
    expect(url).toContain('https://wa.me/573001234567');
    expect(url).toContain(encodeURIComponent(URL_CATALOGO));
  });

  it('devuelve null cuando el teléfono no sirve para WhatsApp', () => {
    expect(urlWhatsAppCatalogo(empresa({ telefono: '' }), CONFIG_DEFAULT)).toBeNull();
    expect(urlWhatsAppCatalogo(empresa({ telefono: '6012345' }), CONFIG_DEFAULT)).toBeNull();
  });
});
