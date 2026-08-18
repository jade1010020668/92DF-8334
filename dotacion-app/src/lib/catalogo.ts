import type { ConfigApp, ProductoCatalogo } from '../types';

/**
 * Catálogo completo con los precios REALES de la lista Enero 2026 de
 * Dotaciones El Manantial S.A.S (valores SIN IVA). Se usa para autocompletar
 * el formulario de pedidos: el papá elige el producto exacto y el precio entra
 * solo. Así las cotizaciones salen con los valores correctos.
 */
export const CATALOGO_PRECIOS: ProductoCatalogo[] = [
  // Dotaciones
  { nombre: 'Overol 2 piezas en dril (hasta talla 42)', precioDesde: 58500, unidad: 'unidad' },
  { nombre: 'Overol enterizo tres cremalleras en dril (hasta talla 42)', precioDesde: 58800, unidad: 'unidad' },
  { nombre: 'Overol piloto en dril (hasta talla 42)', precioDesde: 72500, unidad: 'unidad' },
  { nombre: 'Blusa 3/4 en dril (hasta talla 42)', precioDesde: 40900, unidad: 'unidad' },
  { nombre: 'Chaleco tipo periodista en dril (hasta talla XL)', precioDesde: 41500, unidad: 'unidad' },
  { nombre: 'Conjunto 2 piezas en antifluido - servicios generales (hasta talla XL)', precioDesde: 63000, unidad: 'unidad' },
  // Dotación de vendedores tipo calle
  { nombre: 'Pantalón en jeans prelavado (hasta talla 36)', precioDesde: 31500, unidad: 'unidad' },
  { nombre: 'Chaqueta en jeans prelavado (hasta talla XL)', precioDesde: 46900, unidad: 'unidad' },
  { nombre: 'Camisa cuello para corbata Oxford (hasta talla XL)', precioDesde: 41500, unidad: 'unidad' },
  { nombre: 'Camisa en jean prelavado (hasta talla XL)', precioDesde: 33000, unidad: 'unidad' },
  { nombre: 'Camiseta tipo polo manga larga (hasta talla XL)', precioDesde: 30500, unidad: 'unidad' },
  { nombre: 'Camiseta tipo polo manga corta (hasta talla XL)', precioDesde: 25600, unidad: 'unidad' },
  { nombre: 'Camiseta cuello redondo manga corta (hasta talla XL)', precioDesde: 18100, unidad: 'unidad' },
  { nombre: 'Camiseta cuello redondo manga larga (hasta talla XL)', precioDesde: 23100, unidad: 'unidad' },
  { nombre: 'Chaqueta impermeable (hasta talla XL)', precioDesde: 68000, unidad: 'unidad' },
  // Botas y calzado
  { nombre: 'Bota de seguridad liviana negra referencia 820', precioDesde: 61500, unidad: 'par' },
  { nombre: 'Bota de seguridad liviana negra referencia 920', precioDesde: 65000, unidad: 'par' },
  { nombre: 'Bota de seguridad liviana negra referencia GM', precioDesde: 68000, unidad: 'par' },
  { nombre: 'Bota soldador', precioDesde: 55500, unidad: 'par' },
  { nombre: 'Zapato en goma', precioDesde: 50500, unidad: 'par' },
  { nombre: 'Zapato dama', precioDesde: 46500, unidad: 'par' },
  // Guantes
  { nombre: 'Guante tipo ingeniero reforzado', precioDesde: 9800, unidad: 'par' },
  { nombre: 'Guante en carnaza corto', precioDesde: 8800, unidad: 'par' },
  { nombre: 'Guante en carnaza largo', precioDesde: 10500, unidad: 'par' },
  // Gorros y tapabocas
  { nombre: 'Tapaboca industrial (paquete x 100 unidades)', precioDesde: 51500, unidad: 'paquete' },
  { nombre: 'Cachucha', precioDesde: 13000, unidad: 'unidad' },
  { nombre: 'Casco', precioDesde: 24500, unidad: 'unidad' },
  { nombre: 'Gafas transparentes', precioDesde: 9500, unidad: 'unidad' },
  { nombre: 'Tapa oídos tipo llavero', precioDesde: 4000, unidad: 'unidad' },
  { nombre: 'Cofia en lino', precioDesde: 8500, unidad: 'unidad' },
  { nombre: 'Peto en carnaza', precioDesde: 26000, unidad: 'unidad' },
  // Servicio de estampado y bordado
  { nombre: 'Bordado tamaño bolsillo (según cantidad y puntada)', precioDesde: 4000, unidad: 'unidad' },
  { nombre: 'Bordado tamaño espalda (según cantidad y puntada)', precioDesde: 7000, unidad: 'unidad' },
  { nombre: 'Estampado en espalda a una tinta (según cantidad)', precioDesde: 2900, unidad: 'unidad' },
  { nombre: 'Estampado en bolsillo a una tinta (según cantidad)', precioDesde: 1900, unidad: 'unidad' },
];

/**
 * Catálogo para autocompletar pedidos: la lista real de precios primero y,
 * después, cualquier producto propio que el usuario haya agregado en
 * Configuración y que no esté ya en la lista (sin duplicar por nombre).
 */
export function catalogoParaPedidos(config: ConfigApp): ProductoCatalogo[] {
  const nombres = new Set(CATALOGO_PRECIOS.map((p) => p.nombre.toLowerCase()));
  const propios = config.productos.filter((p) => !nombres.has(p.nombre.toLowerCase()));
  return [...CATALOGO_PRECIOS, ...propios];
}
