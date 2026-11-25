import { jsPDF } from 'jspdf';
import type { PDFAnnotation } from '../types';

export interface PdfExportInput {
  fileName: string;
  bodyText: string;
  signed: boolean;
  signatureText: string;
  annotations: PDFAnnotation[];
  exportedAt: Date;
}

// La fuente estándar de jsPDF (WinAnsi) cubre el rango latin-1, así que
// los acentos en español se conservan. Los caracteres fuera de ese rango
// se sustituyen por un equivalente cercano para no romper el PDF.
const sanitizeForPdf = (text: string): string => {
  const replacements: Record<string, string> = {
    '\u2018': "'",
    '\u2019': "'",
    '\u201c': '"',
    '\u201d': '"',
    '\u2013': '-',
    '\u2014': '-',
    '\u2022': '-',
    '\u2026': '...',
    '\u00a0': ' ',
  };
  return text
    .split('')
    .map((ch) => replacements[ch] ?? (ch.charCodeAt(0) > 255 ? '?' : ch))
    .join('');
};

export function exportDocumentToPdf(input: PdfExportInput): void {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 48;
  const maxWidth = pageWidth - margin * 2;
  const bottomLimit = pageHeight - 56;
  let y = 64;

  const ensureSpace = (needed: number) => {
    if (y + needed > bottomLimit) {
      doc.addPage();
      y = 56;
    }
  };

  const writeLines = (lines: string[], fontSize: number, lineHeight: number) => {
    doc.setFontSize(fontSize);
    for (const line of lines) {
      ensureSpace(lineHeight);
      doc.text(line, margin, y);
      y += lineHeight;
    }
  };

  // Encabezado
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(11, 13, 17);
  doc.text(sanitizeForPdf('YC Universal Workstation'), margin, y);
  y += 8;
  doc.setDrawColor(212, 175, 55);
  doc.setLineWidth(1.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 24;

  // Título del documento
  const title = sanitizeForPdf(input.fileName.replace(/\.[^/.]+$/, ''));
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  writeLines(doc.splitTextToSize(title || 'Documento sin título', maxWidth), 13, 18);
  y += 4;

  // Metadatos
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(90, 100, 115);
  const dateStr = input.exportedAt.toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  writeLines(
    [`Archivo: ${sanitizeForPdf(input.fileName)}`, `Exportado: ${dateStr}`],
    10,
    14
  );
  y += 10;
  doc.setTextColor(11, 13, 17);

  // Cuerpo del documento
  doc.setFont('helvetica', 'normal');
  const bodyLines = doc.splitTextToSize(sanitizeForPdf(input.bodyText || '(Documento vacío)'), maxWidth);
  writeLines(bodyLines, 11, 15);

  // Anotaciones guardadas
  if (input.annotations.length > 0) {
    y += 14;
    ensureSpace(20);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('Anotaciones', margin, y);
    y += 16;
    doc.setFont('helvetica', 'normal');
    for (const ann of input.annotations) {
      const label = ann.type === 'signature' ? 'Firma' : ann.type === 'highlight' ? 'Resaltado' : 'Nota';
      const lines = doc.splitTextToSize(sanitizeForPdf(`[${label}] ${ann.text || ''}`), maxWidth);
      writeLines(lines, 10, 14);
      y += 2;
    }
  }

  // Firma
  if (input.signed) {
    y += 18;
    ensureSpace(60);
    doc.setDrawColor(212, 175, 55);
    doc.setLineWidth(1);
    doc.line(margin, y, margin + 220, y);
    y += 16;
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(12);
    doc.text(sanitizeForPdf(input.signatureText), margin, y);
    y += 16;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(90, 100, 115);
    doc.text(`Firmado en YC Universal Workstation — ${dateStr}`, margin, y);
    doc.setTextColor(11, 13, 17);
  }

  // Pie con número de página en cada hoja
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(140, 150, 165);
    doc.text(
      `YC Universal Workstation — Página ${i} de ${totalPages}`,
      margin,
      pageHeight - 28
    );
  }

  const outName = `${input.fileName.replace(/\.[^/.]+$/, '')}_exportado.pdf`;
  doc.save(outName);
}
