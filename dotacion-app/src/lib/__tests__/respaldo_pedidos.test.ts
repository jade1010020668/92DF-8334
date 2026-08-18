import { describe, expect, it } from 'vitest';
import { generarRespaldo, parsearRespaldo } from '../respaldo';
import { parsearProspectosCercanos } from '../maps';
import { CONFIG_DEFAULT } from '../config';
import type { ConfigApp, Empresa, Pedido } from '../../types';

const config: ConfigApp = { ...CONFIG_DEFAULT, brevoApiKey: 'secreta-brevo', googleMapsApiKey: 'secreta-maps' };

const empresa: Empresa = {
  id: 'e1',
  nombre: 'Taller El Pino',
  sector: 'metalmecánica',
  email: 'compras@elpino.co',
  telefono: '3001234567',
  contacto: 'Ana',
  direccion: 'Calle 2 # 34-10',
  estado: 'cliente',
  fechaCreacion: '2026-06-01T10:00:00.000Z',
  fechaEnvio: '2026-06-02T10:00:00.000Z',
  fechaRespuesta: '2026-06-03T10:00:00.000Z',
  fuente: 'maps',
  lat: 4.5856,
  lon: -74.1354,
  historial: [
    { id: 'h1', fecha: '2026-06-03T10:00:00.000Z', tipo: 'llamada', texto: 'Llamé, pidió 20 overoles' },
    { id: 'h2', fecha: '2026-06-02T10:00:00.000Z', tipo: 'correo', texto: 'Cotización enviada' },
  ],
};

const pedido: Pedido = {
  id: 'p1',
  empresaId: 'e1',
  empresaNombre: 'Taller El Pino',
  fecha: '2026-06-04T10:00:00.000Z',
  items: [
    { id: 'i1', descripcion: 'Overol 2 piezas', cantidad: 20, precioUnitario: 64800 },
    { id: 'i2', descripcion: 'Guante carnaza', cantidad: 30, precioUnitario: 9500 },
  ],
  estado: 'confirmado',
  abono: 500000,
  iva: 19,
  fechaEntrega: '2026-06-20T00:00:00.000Z',
  notas: 'Tallas 38-42',
};

describe('respaldo v2 con pedidos e historial', () => {
  it('hace ida y vuelta conservando empresas, historial, coordenadas y pedidos', () => {
    const leido = parsearRespaldo(generarRespaldo([empresa], config, [pedido]));
    expect(leido).not.toBeNull();
    expect(leido!.empresas).toHaveLength(1);
    expect(leido!.empresas[0].lat).toBe(4.5856);
    expect(leido!.empresas[0].historial).toHaveLength(2);
    expect(leido!.empresas[0].historial?.[0].texto).toContain('20 overoles');
    expect(leido!.pedidos).toHaveLength(1);
    expect(leido!.pedidos[0].items).toHaveLength(2);
    expect(leido!.pedidos[0].abono).toBe(500000);
    expect(leido!.pedidos[0].iva).toBe(19);
    expect(leido!.pedidos[0].fechaEntrega).toBe('2026-06-20T00:00:00.000Z');
  });

  it('marca el respaldo como version 2', () => {
    expect(JSON.parse(generarRespaldo([empresa], config, [pedido])).version).toBe(2);
  });

  it('las claves API nunca viajan en el archivo', () => {
    const texto = generarRespaldo([empresa], config, [pedido]);
    expect(texto).not.toContain('secreta-brevo');
    expect(texto).not.toContain('secreta-maps');
  });

  it('descarta pedidos sin ítems o sin id, sin romper', () => {
    const json = JSON.stringify({
      app: 'dotacionpro',
      version: 2,
      empresas: [empresa],
      pedidos: [pedido, { id: 'malo', items: [] }, { items: [{ descripcion: 'x', cantidad: 1, precioUnitario: 1 }] }],
      config: {},
    });
    const leido = parsearRespaldo(json);
    expect(leido!.pedidos).toHaveLength(1);
    expect(leido!.pedidos[0].id).toBe('p1');
  });

  it('un respaldo viejo (v1 sin pedidos) se lee con lista de pedidos vacía', () => {
    const json = JSON.stringify({ app: 'dotacionpro', version: 1, empresas: [empresa], config: {} });
    const leido = parsearRespaldo(json);
    expect(leido).not.toBeNull();
    expect(leido!.pedidos).toEqual([]);
    expect(leido!.empresas).toHaveLength(1);
  });

  it('sanea historial con tipos inválidos', () => {
    const json = JSON.stringify({
      app: 'dotacionpro',
      version: 2,
      empresas: [{ ...empresa, historial: [{ id: 'x', fecha: '2026-01-01', tipo: 'hackeo', texto: 'ok' }, { texto: '' }] }],
      pedidos: [],
      config: {},
    });
    const leido = parsearRespaldo(json);
    const hist = leido!.empresas[0].historial!;
    expect(hist).toHaveLength(1); // el de texto vacío se descarta
    expect(hist[0].tipo).toBe('nota'); // 'hackeo' -> 'nota'
  });
});

describe('parsearProspectosCercanos conserva coordenadas para el mapa', () => {
  it('cada prospecto trae lat/lon del elemento', () => {
    const r = parsearProspectosCercanos(
      { elements: [{ tags: { name: 'Ferretería Sur', shop: 'hardware' }, lat: 4.6, lon: -74.1 }] },
      { lat: 4.61, lon: -74.08 },
    );
    expect(r[0].lat).toBe(4.6);
    expect(r[0].lon).toBe(-74.1);
    expect(r[0].prioridad).toBe(1);
  });
});
