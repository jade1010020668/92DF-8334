import { describe, expect, it } from 'vitest';
import { CATALOGO_PRECIOS, catalogoParaPedidos } from '../catalogo';
import { CONFIG_DEFAULT } from '../config';
import { urlOutlook } from '../plantillas';

describe('CATALOGO_PRECIOS', () => {
  it('trae los productos reales con precios positivos y unidad', () => {
    expect(CATALOGO_PRECIOS.length).toBeGreaterThanOrEqual(30);
    for (const p of CATALOGO_PRECIOS) {
      expect(p.nombre.trim()).not.toBe('');
      expect(p.precioDesde).toBeGreaterThan(0);
      expect(p.unidad.trim()).not.toBe('');
    }
  });

  it('incluye referencias concretas de la lista Enero 2026', () => {
    const overol = CATALOGO_PRECIOS.find((p) => p.nombre.startsWith('Overol 2 piezas'));
    expect(overol?.precioDesde).toBe(58500);
    const bota820 = CATALOGO_PRECIOS.find((p) => p.nombre.includes('referencia 820'));
    expect(bota820?.precioDesde).toBe(61500);
  });
});

describe('catalogoParaPedidos', () => {
  it('agrega los productos propios que no están en la lista real', () => {
    const config = {
      ...CONFIG_DEFAULT,
      productos: [{ nombre: 'Producto especial X', precioDesde: 5000, unidad: 'unidad' }],
    };
    const r = catalogoParaPedidos(config);
    expect(r.length).toBe(CATALOGO_PRECIOS.length + 1);
    expect(r.some((p) => p.nombre === 'Producto especial X')).toBe(true);
  });

  it('no duplica un producto propio que ya está en la lista real', () => {
    const config = {
      ...CONFIG_DEFAULT,
      productos: [{ nombre: 'casco', precioDesde: 1, unidad: 'unidad' }], // mismo nombre (otra capitalización)
    };
    expect(catalogoParaPedidos(config).length).toBe(CATALOGO_PRECIOS.length);
  });
});

describe('urlOutlook', () => {
  it('arma el enlace de redacción de Outlook con destinatario, asunto y cuerpo', () => {
    const url = urlOutlook('compras@empresa.com', 'Cotización', 'Hola, ¿qué necesitan?');
    expect(url).toContain('https://outlook.live.com/mail/0/deeplink/compose');
    expect(url).toContain('to=compras%40empresa.com');
    expect(url).toContain('subject=Cotizaci%C3%B3n');
    expect(url).toContain('body=Hola');
  });
});
