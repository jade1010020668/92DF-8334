import type {
  ConfigApp,
  Empresa,
  EstadoEmpresa,
  EstadoPedido,
  EventoHistorial,
  FuenteEmpresa,
  ItemPedido,
  Pedido,
} from '../types';
import { ESTADOS, ESTADOS_PEDIDO } from '../types';
import { combinarConfig } from './config';

/**
 * Respaldo completo: empresas (con fechas, estados e historial), pedidos y
 * configuración. Sirve para pasar TODO de un dispositivo a otro (PC ↔ celular)
 * enviándose el archivo por WhatsApp o correo. Las claves de API NO viajan en
 * el archivo (se quedan en cada dispositivo) para que compartirlo no las exponga.
 */

export interface Respaldo {
  app: 'dotacionpro';
  version: 2;
  fecha: string;
  empresas: Empresa[];
  pedidos: Pedido[];
  config: Partial<ConfigApp>;
}

/** Serializa el respaldo (puro, cubierto por tests). */
export function generarRespaldo(empresas: Empresa[], config: ConfigApp, pedidos: Pedido[] = []): string {
  const respaldo: Respaldo = {
    app: 'dotacionpro',
    version: 2,
    fecha: new Date().toISOString(),
    empresas,
    pedidos,
    config: { ...config, googleMapsApiKey: '', brevoApiKey: '' },
  };
  return JSON.stringify(respaldo, null, 2);
}

export interface RespaldoLeido {
  empresas: Empresa[];
  pedidos: Pedido[];
  config: ConfigApp;
}

const cadena = (v: unknown): string => (typeof v === 'string' ? v : '');
const fechaOpcional = (v: unknown): string | undefined => (typeof v === 'string' && v ? v : undefined);
const numero = (v: unknown, def = 0): number => (typeof v === 'number' && Number.isFinite(v) ? v : def);

function sanearHistorial(v: unknown): EventoHistorial[] | undefined {
  if (!Array.isArray(v)) return undefined;
  const tipos: EventoHistorial['tipo'][] = ['nota', 'correo', 'whatsapp', 'llamada', 'estado', 'pedido'];
  const eventos = v
    .filter((e): e is Partial<EventoHistorial> => !!e && typeof e === 'object')
    .map((e) => ({
      id: cadena(e.id) || Math.random().toString(36).slice(2),
      fecha: cadena(e.fecha) || new Date().toISOString(),
      tipo: tipos.includes(e.tipo as EventoHistorial['tipo']) ? (e.tipo as EventoHistorial['tipo']) : 'nota',
      texto: cadena(e.texto),
    }))
    .filter((e) => e.texto);
  return eventos.length > 0 ? eventos : undefined;
}

function sanearItems(v: unknown): ItemPedido[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((i): i is Partial<ItemPedido> => !!i && typeof i === 'object')
    .map((i) => ({
      id: cadena(i.id) || Math.random().toString(36).slice(2),
      descripcion: cadena(i.descripcion),
      cantidad: numero(i.cantidad),
      precioUnitario: numero(i.precioUnitario),
    }))
    .filter((i) => i.descripcion);
}

/**
 * Valida y lee un respaldo. Devuelve null si el archivo no es de DotaciónPro.
 * Cada campo se sanea a su tipo esperado: un .json manipulado no puede meter
 * estructuras raras a la app.
 */
export function parsearRespaldo(texto: string): RespaldoLeido | null {
  try {
    const datos = JSON.parse(texto) as Partial<Respaldo>;
    if (datos?.app !== 'dotacionpro' || !Array.isArray(datos.empresas)) return null;

    const empresas: Empresa[] = [];
    for (const cruda of datos.empresas as Partial<Empresa>[]) {
      if (!cruda || typeof cruda !== 'object') continue;
      const id = cadena(cruda.id);
      const nombre = cadena(cruda.nombre).trim();
      if (!id || !nombre) continue;
      empresas.push({
        id,
        nombre,
        sector: cadena(cruda.sector),
        email: cadena(cruda.email),
        telefono: cadena(cruda.telefono),
        contacto: cadena(cruda.contacto),
        direccion: cadena(cruda.direccion),
        estado: ESTADOS.includes(cruda.estado as EstadoEmpresa) ? (cruda.estado as EstadoEmpresa) : 'pendiente',
        fechaCreacion: cadena(cruda.fechaCreacion) || new Date().toISOString(),
        fechaEnvio: fechaOpcional(cruda.fechaEnvio),
        fechaRespuesta: fechaOpcional(cruda.fechaRespuesta),
        notas: cadena(cruda.notas) || undefined,
        fuente: (['manual', 'excel', 'maps'] as FuenteEmpresa[]).includes(cruda.fuente as FuenteEmpresa)
          ? (cruda.fuente as FuenteEmpresa)
          : 'manual',
        lat: typeof cruda.lat === 'number' ? cruda.lat : undefined,
        lon: typeof cruda.lon === 'number' ? cruda.lon : undefined,
        historial: sanearHistorial(cruda.historial),
      });
    }

    const pedidos: Pedido[] = [];
    if (Array.isArray(datos.pedidos)) {
      for (const cruda of datos.pedidos as Partial<Pedido>[]) {
        if (!cruda || typeof cruda !== 'object') continue;
        const id = cadena(cruda.id);
        const items = sanearItems(cruda.items);
        if (!id || items.length === 0) continue;
        pedidos.push({
          id,
          empresaId: cadena(cruda.empresaId),
          empresaNombre: cadena(cruda.empresaNombre) || 'Empresa',
          fecha: cadena(cruda.fecha) || new Date().toISOString(),
          items,
          estado: ESTADOS_PEDIDO.includes(cruda.estado as EstadoPedido)
            ? (cruda.estado as EstadoPedido)
            : 'cotizado',
          abono: numero(cruda.abono),
          iva: numero(cruda.iva),
          fechaEntrega: fechaOpcional(cruda.fechaEntrega),
          notas: cadena(cruda.notas) || undefined,
        });
      }
    }

    return { empresas, pedidos, config: combinarConfig(datos.config ?? null) };
  } catch {
    return null;
  }
}

/** Descarga el respaldo como archivo .json. */
export function descargarRespaldo(empresas: Empresa[], config: ConfigApp, pedidos: Pedido[] = []): void {
  const blob = new Blob([generarRespaldo(empresas, config, pedidos)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = `Respaldo DotacionPro ${new Date().toISOString().slice(0, 10)}.json`;
  enlace.click();
  URL.revokeObjectURL(url);
}
