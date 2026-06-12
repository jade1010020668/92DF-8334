import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { ConfigApp, Empresa } from '../types';
import { CLAVE_CONSECUTIVO } from './config';
import { formatearPesos } from './plantillas';

const AZUL: [number, number, number] = [29, 78, 216];
const GRIS: [number, number, number] = [100, 116, 139];

/** Número consecutivo de cotización, persistido en el navegador. */
function siguienteNumeroCotizacion(): string {
  let consecutivo = 1;
  try {
    consecutivo = Number(localStorage.getItem(CLAVE_CONSECUTIVO) ?? '0') + 1;
    localStorage.setItem(CLAVE_CONSECUTIVO, String(consecutivo));
  } catch {
    // Sin localStorage (p. ej. modo incógnito estricto) se usa 1.
  }
  const fecha = new Date();
  const ymd = `${fecha.getFullYear()}${String(fecha.getMonth() + 1).padStart(2, '0')}${String(
    fecha.getDate(),
  ).padStart(2, '0')}`;
  return `COT-${ymd}-${String(consecutivo).padStart(3, '0')}`;
}

/** Construye el documento de cotización con los datos y catálogo configurados. */
function crearDocumentoCotizacion(
  empresa: Empresa,
  config: ConfigApp,
): { doc: jsPDF; nombreArchivo: string } {
  const doc = new jsPDF();
  const anchoPagina = doc.internal.pageSize.getWidth();
  const margen = 14;

  // Encabezado con banda azul.
  doc.setFillColor(...AZUL);
  doc.rect(0, 0, anchoPagina, 34, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(19);
  doc.text(config.nombreEmpresa, margen, 14);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  const lineasEmpresa = [
    'Dotación industrial y elementos de protección personal (EPP)',
    [config.direccion, config.ciudad].filter(Boolean).join(', '),
    [
      config.telefono.trim() ? `Tel/WhatsApp: ${config.telefono.trim()}` : '',
      config.email.trim() ? `Correo: ${config.email.trim()}` : '',
    ]
      .filter(Boolean)
      .join('   |   '),
  ].filter(Boolean);
  lineasEmpresa.forEach((linea, i) => doc.text(linea, margen, 20 + i * 4.5));

  // Título y datos de la cotización.
  const numero = siguienteNumeroCotizacion();
  const hoy = new Date().toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  let y = 46;
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text('COTIZACIÓN', margen, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...GRIS);
  doc.text(`No. ${numero}`, anchoPagina - margen, y - 4, { align: 'right' });
  doc.text(`Bogotá, ${hoy}`, anchoPagina - margen, y + 1, { align: 'right' });

  // Bloque del cliente.
  y += 8;
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Señores:', margen, y);
  doc.setFontSize(12);
  y += 6;
  doc.text(empresa.nombre, margen, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  const lineasCliente = [
    empresa.contacto.trim() ? `Atn.: ${empresa.contacto.trim()}` : '',
    empresa.direccion.trim(),
    [empresa.telefono.trim(), empresa.email.trim()].filter(Boolean).join('   |   '),
  ].filter(Boolean);
  lineasCliente.forEach((linea) => {
    y += 5;
    doc.text(linea, margen, y);
  });

  // Tabla de productos.
  y += 9;
  const hayPrecios = config.productos.some((p) => p.precioDesde > 0);
  const cabecera = hayPrecios ? ['Producto', 'Unidad', 'Precio desde'] : ['Producto', 'Unidad'];
  const filas = config.productos.map((p) =>
    hayPrecios
      ? [p.nombre, p.unidad, p.precioDesde > 0 ? formatearPesos(p.precioDesde) : 'A convenir']
      : [p.nombre, p.unidad],
  );
  autoTable(doc, {
    startY: y,
    head: [cabecera],
    body: filas,
    margin: { left: margen, right: margen },
    styles: { fontSize: 10, cellPadding: 2.5 },
    headStyles: { fillColor: AZUL, fontSize: 10.5 },
    alternateRowStyles: { fillColor: [241, 245, 249] },
  });

  const finTabla = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;

  // Condiciones comerciales.
  let yCond = finTabla + 9;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Condiciones comerciales', margen, yCond);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  const condiciones = [
    `- ${config.textoDescuentos}`,
    '- Atendemos pedidos desde 10 unidades, con entrega en Bogotá y alrededores.',
    '- Precios de referencia antes de IVA; cotización formal según cantidades y tallas.',
    '- Validez de la oferta: 15 días calendario.',
  ];
  for (const linea of condiciones) {
    yCond += 5.5;
    const partes = doc.splitTextToSize(linea, anchoPagina - margen * 2) as string[];
    doc.text(partes, margen, yCond);
    yCond += (partes.length - 1) * 5;
  }

  // Firma.
  yCond += 14;
  doc.setFont('helvetica', 'bold');
  doc.text(config.remitente.trim() || config.nombreEmpresa, margen, yCond);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...GRIS);
  doc.text(config.nombreEmpresa, margen, yCond + 5);

  const nombreLimpio = empresa.nombre.replace(/[\\/:*?"<>|]/g, '').slice(0, 60);
  return { doc, nombreArchivo: `Cotizacion ${nombreLimpio}.pdf` };
}

/**
 * Genera y descarga el PDF de cotización para una empresa. No depende de
 * ningún archivo externo.
 */
export function generarPdfCotizacion(empresa: Empresa, config: ConfigApp): void {
  const { doc, nombreArchivo } = crearDocumentoCotizacion(empresa, config);
  doc.save(nombreArchivo);
}

/** El mismo PDF en base64, para adjuntarlo en los envíos por la API de Brevo. */
export function pdfCotizacionBase64(
  empresa: Empresa,
  config: ConfigApp,
): { nombre: string; contenidoBase64: string } {
  const { doc, nombreArchivo } = crearDocumentoCotizacion(empresa, config);
  const dataUri = doc.output('datauristring');
  return { nombre: nombreArchivo, contenidoBase64: dataUri.slice(dataUri.indexOf(',') + 1) };
}
