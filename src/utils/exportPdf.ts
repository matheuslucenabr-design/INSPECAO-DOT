/**
 * Professional PDF Export for INSPEÇÃO PRONTO!
 * Implements clean document layout with company header, structured tables,
 * photographic evidence with captions, GPS coordinates, and signatures.
 */

import jsPDF from 'jspdf';
import { Inspection } from '../types/inspection';

export async function generateInspectionPdf(inspection: Inspection): Promise<void> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  let currentY = margin;

  const primaryColor = [2, 132, 199]; // #0284c7 (Sky/Blue)
  const darkTextColor = [15, 23, 42]; // #0f172a
  const mutedTextColor = [71, 85, 105]; // #475569
  const lightBg = [248, 250, 252]; // #f8fafc
  const borderColor = [226, 232, 240]; // #e2e8f0

  // Helper to add header on top of every page
  const drawHeader = (isFirstPage: boolean) => {
    // Top banner
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(margin, currentY, contentWidth, isFirstPage ? 22 : 12, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(isFirstPage ? 16 : 10);
    doc.text('INSPEÇÃO PRONTO!', margin + 6, currentY + (isFirstPage ? 9 : 7));

    doc.setFontSize(isFirstPage ? 9 : 8);
    doc.setFont('helvetica', 'normal');
    doc.text('RELATÓRIO TÉCNICO DE INSPEÇÃO EM CAMPO', margin + 6, currentY + (isFirstPage ? 16 : 10));

    // Inspection ID on right side
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(isFirstPage ? 12 : 9);
    doc.text(inspection.id, pageWidth - margin - 6, currentY + (isFirstPage ? 10 : 8), { align: 'right' });

    currentY += isFirstPage ? 26 : 16;
  };

  // Helper for footer on every page
  const drawFooter = (pageNum: number, totalPages: number) => {
    doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
    doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(mutedTextColor[0], mutedTextColor[1], mutedTextColor[2]);
    doc.text('Documento gerado pelo sistema INSPEÇÃO PRONTO!', margin, pageHeight - 7);

    const pageStr = `Página ${pageNum} de ${totalPages}`;
    doc.text(pageStr, pageWidth - margin, pageHeight - 7, { align: 'right' });
  };

  // Helper for section headers
  const drawSectionTitle = (title: string, iconStr: string = '') => {
    if (currentY > pageHeight - 40) {
      doc.addPage();
      currentY = margin;
      drawHeader(false);
    }

    doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
    doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
    doc.rect(margin, currentY, contentWidth, 7, 'FD');

    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(margin, currentY, 3, 7, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);
    doc.text(`${iconStr} ${title}`.trim(), margin + 6, currentY + 5);

    currentY += 10;
  };

  // 1. First Page Header
  drawHeader(true);

  // Metadata summary line
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(mutedTextColor[0], mutedTextColor[1], mutedTextColor[2]);
  doc.text(`Data do Envio: ${inspection.dataEnvio || inspection.dataCriacao}`, margin, currentY);
  doc.text(`Status: ${inspection.status.toUpperCase()}`, pageWidth - margin, currentY, { align: 'right' });
  currentY += 6;

  // 2. IDENTIFICAÇÃO SECTION
  drawSectionTitle('IDENTIFICAÇÃO DA INSPEÇÃO');

  const idCol1X = margin + 4;
  const idCol2X = margin + (contentWidth / 2) + 2;
  const rowHeight = 6.5;

  const idFields = [
    { label: 'Obra:', value: inspection.obra || '-' },
    { label: 'Tipo de Inspeção:', value: inspection.tipoInspecao || '-' },
    { label: 'Equipe:', value: inspection.equipe || '-' },
    { label: 'Responsável:', value: inspection.responsavel || '-' },
    { label: 'Técnico:', value: inspection.tecnicoResponsavel || '-' },
    { label: 'Matrícula:', value: inspection.matricula || 'Não informada' },
    { label: 'Local:', value: inspection.local || '-' },
    { label: 'Total de Fotos:', value: `${inspection.fotos.length} fotografias registradas` },
  ];

  for (let i = 0; i < idFields.length; i += 2) {
    const f1 = idFields[i];
    const f2 = idFields[i + 1];

    // Field 1
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(mutedTextColor[0], mutedTextColor[1], mutedTextColor[2]);
    doc.text(f1.label, idCol1X, currentY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);
    doc.text(f1.value, idCol1X + 28, currentY, { maxWidth: (contentWidth / 2) - 32 });

    // Field 2
    if (f2) {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(mutedTextColor[0], mutedTextColor[1], mutedTextColor[2]);
      doc.text(f2.label, idCol2X, currentY);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);
      doc.text(f2.value, idCol2X + 32, currentY, { maxWidth: (contentWidth / 2) - 36 });
    }

    currentY += rowHeight;
  }

  currentY += 4;

  // 3. LOCALIZAÇÃO SECTION
  drawSectionTitle('LOCALIZAÇÃO E GEORREFERENCIAMENTO');

  if (inspection.localizacao && !inspection.localizacao.semGps) {
    const loc = inspection.localizacao;
    doc.setFontSize(9);

    // Coordinates row
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(mutedTextColor[0], mutedTextColor[1], mutedTextColor[2]);
    doc.text('Latitude:', idCol1X, currentY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);
    doc.text(`${loc.latitude.toFixed(6)}°`, idCol1X + 22, currentY);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(mutedTextColor[0], mutedTextColor[1], mutedTextColor[2]);
    doc.text('Longitude:', idCol2X, currentY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);
    doc.text(`${loc.longitude.toFixed(6)}°`, idCol2X + 22, currentY);

    currentY += 5.5;

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(mutedTextColor[0], mutedTextColor[1], mutedTextColor[2]);
    doc.text('Precisão:', idCol1X, currentY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);
    doc.text(`${loc.precisao} metros`, idCol1X + 22, currentY);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(mutedTextColor[0], mutedTextColor[1], mutedTextColor[2]);
    doc.text('Data/Hora GPS:', idCol2X, currentY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);
    doc.text(loc.dataCaptura || '-', idCol2X + 26, currentY);

    currentY += 5.5;

    if (loc.endereco) {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(mutedTextColor[0], mutedTextColor[1], mutedTextColor[2]);
      doc.text('Endereço Aprox.:', idCol1X, currentY);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);
      
      const splitAddress = doc.splitTextToSize(loc.endereco, contentWidth - 36);
      doc.text(splitAddress, idCol1X + 28, currentY);
      currentY += splitAddress.length * 4.5;
    }
  } else {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(mutedTextColor[0], mutedTextColor[1], mutedTextColor[2]);
    doc.text('Localização GPS não registrada (campo operado sem sinal ou dispensado).', idCol1X, currentY);
    currentY += 6;
  }

  currentY += 4;

  // 4. OBSERVAÇÃO GERAL
  if (inspection.observacaoGeral && inspection.observacaoGeral.trim()) {
    drawSectionTitle('OBSERVAÇÕES GERAIS DA INSPEÇÃO');

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);

    const splitObs = doc.splitTextToSize(inspection.observacaoGeral, contentWidth - 8);
    
    // Background box
    doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
    doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
    doc.roundedRect(margin, currentY, contentWidth, (splitObs.length * 4.5) + 6, 2, 2, 'FD');

    doc.text(splitObs, margin + 4, currentY + 5);
    currentY += (splitObs.length * 4.5) + 10;
  }

  // 5. REGISTRO FOTOGRÁFICO SECTION
  if (inspection.fotos && inspection.fotos.length > 0) {
    drawSectionTitle(`REGISTRO FOTOGRÁFICO (${inspection.fotos.length} FOTOGRAFIAS)`);

    // Render photos 2 per page or 2 per row
    const photoBoxWidth = (contentWidth - 6) / 2; // ~88mm each
    const photoBoxHeight = 58;

    for (let index = 0; index < inspection.fotos.length; index += 2) {
      const p1 = inspection.fotos[index];
      const p2 = inspection.fotos[index + 1];

      // Check if need new page for this pair
      if (currentY + photoBoxHeight + 25 > pageHeight - 20) {
        doc.addPage();
        currentY = margin;
        drawHeader(false);
        drawSectionTitle(`REGISTRO FOTOGRÁFICO (CONTINUAÇÃO)`);
      }

      // Draw Photo 1
      drawPhotoItem(doc, p1, margin, currentY, photoBoxWidth, photoBoxHeight);

      // Draw Photo 2 if exists
      if (p2) {
        drawPhotoItem(doc, p2, margin + photoBoxWidth + 6, currentY, photoBoxWidth, photoBoxHeight);
      }

      currentY += photoBoxHeight + 24;
    }
  }

  // Add footers on all pages
  const totalPages = doc.internal.pages.length - 1;
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    drawFooter(i, totalPages);
  }

  // Download PDF
  const filename = `${inspection.id}_relatorio_inspecao.pdf`;
  doc.save(filename);
}

function drawPhotoItem(
  doc: jsPDF,
  photo: { numero: number; dataUrl: string; legenda: string; dataUpload?: string },
  x: number,
  y: number,
  boxWidth: number,
  boxHeight: number
) {
  // Border box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(x, y, boxWidth, boxHeight + 20, 2, 2, 'FD');

  // Badge header: Foto 01
  doc.setFillColor(2, 132, 199);
  doc.roundedRect(x + 3, y + 3, 26, 5, 1, 1, 'F');
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text(`FOTO ${String(photo.numero).padStart(2, '0')}`, x + 5, y + 6.8);

  if (photo.dataUpload) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(photo.dataUpload, x + boxWidth - 3, y + 6.8, { align: 'right' });
  }

  // Add photo image
  try {
    doc.addImage(photo.dataUrl, 'JPEG', x + 3, y + 10, boxWidth - 6, boxHeight - 11);
  } catch (err) {
    console.error('Error embedding image in PDF:', err);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text('[Imagem não pôde ser renderizada]', x + 6, y + 25);
  }

  // Photo Caption / Legenda
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Legenda:', x + 3, y + boxHeight + 3);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  const captionText = photo.legenda && photo.legenda.trim() ? photo.legenda : 'Sem observação específica.';
  const splitCaption = doc.splitTextToSize(captionText, boxWidth - 6);
  doc.text(splitCaption, x + 3, y + boxHeight + 7);
}
