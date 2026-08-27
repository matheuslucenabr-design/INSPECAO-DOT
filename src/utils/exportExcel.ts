/**
 * Professional Multi-Tab Excel Export for INSPEÇÃO PRONTO!
 * Implements requirement:
 * Sheet 1: INSPEÇÃO (Structured metadata, technical fields, GPS data, summary)
 * Sheet 2: FOTOGRAFIAS (Images embedded into worksheet cells + captions and metadata)
 */

import ExcelJS from 'exceljs';
import { Inspection } from '../types/inspection';

export async function generateInspectionExcel(inspection: Inspection): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'INSPEÇÃO PRONTO!';
  workbook.created = new Date();

  // -------------------------------------------------------------
  // ABA 1 — INSPEÇÃO
  // -------------------------------------------------------------
  const wsInspecao = workbook.addWorksheet('INSPEÇÃO', {
    views: [{ showGridLines: true }],
  });

  // Set column widths
  wsInspecao.columns = [
    { key: 'campo', width: 28 },
    { key: 'valor', width: 65 },
  ];

  // Header Banner
  const titleRow = wsInspecao.addRow(['INSPEÇÃO PRONTO!', 'RELATÓRIO DE INSPEÇÃO EM CAMPO']);
  titleRow.height = 28;
  titleRow.getCell(1).font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  titleRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0284C7' } };
  titleRow.getCell(2).font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
  titleRow.getCell(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0369A1' } };

  wsInspecao.addRow([]); // Blank line

  // Section Header: Identificação
  const addSectionHeader = (title: string) => {
    const row = wsInspecao.addRow([title, '']);
    row.height = 20;
    row.getCell(1).font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    row.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
    row.getCell(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
  };

  const addDataRow = (label: string, value: string | number | undefined) => {
    const row = wsInspecao.addRow([label, value || '-']);
    row.height = 19;
    row.getCell(1).font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF334155' } };
    row.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
    row.getCell(2).font = { name: 'Arial', size: 10, color: { argb: 'FF0F172A' } };
    row.getCell(1).border = {
      top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    };
    row.getCell(2).border = {
      top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    };
    return row;
  };

  addSectionHeader('1. IDENTIFICAÇÃO E DADOS GERAIS');
  addDataRow('Protocolo / Registro', inspection.id);
  addDataRow('Data de Criação', inspection.dataCriacao);
  addDataRow('Data de Finalização / Envio', inspection.dataEnvio || '-');
  addDataRow('Status', inspection.status.toUpperCase());
  addDataRow('Obra', inspection.obra);
  addDataRow('Tipo de Inspeção', inspection.tipoInspecao);
  addDataRow('Equipe', inspection.equipe);
  addDataRow('Técnico Responsável', inspection.tecnicoResponsavel);
  addDataRow('Local Específico', inspection.local);
  addDataRow('Responsável pelo Registro', inspection.responsavel);
  addDataRow('Matrícula / Identificação', inspection.matricula || 'N/A');

  wsInspecao.addRow([]); // Blank line

  addSectionHeader('2. LOCALIZAÇÃO E GEORREFERENCIAMENTO');
  if (inspection.localizacao && !inspection.localizacao.semGps) {
    addDataRow('Latitude', inspection.localizacao.latitude);
    addDataRow('Longitude', inspection.localizacao.longitude);
    addDataRow('Precisão do GPS', `${inspection.localizacao.precisao} metros`);
    addDataRow('Data/Hora da Captura GPS', inspection.localizacao.dataCaptura);
    addDataRow('Endereço Aproximado', inspection.localizacao.endereco || '-');
  } else {
    addDataRow('Localização GPS', 'Não registrada ou dispensada');
  }

  wsInspecao.addRow([]); // Blank line

  addSectionHeader('3. OBSERVAÇÕES E RESUMO');
  const obsRow = addDataRow('Observação Geral', inspection.observacaoGeral || 'Sem observações gerais.');
  obsRow.height = 36;
  obsRow.getCell(2).alignment = { wrapText: true };
  addDataRow('Total de Fotografias Registradas', inspection.fotos.length);

  // -------------------------------------------------------------
  // ABA 2 — FOTOGRAFIAS
  // -------------------------------------------------------------
  const wsFotos = workbook.addWorksheet('FOTOGRAFIAS', {
    views: [{ showGridLines: true }],
  });

  wsFotos.columns = [
    { key: 'num', header: 'Nº', width: 8 },
    { key: 'foto', header: 'Fotografia', width: 34 },
    { key: 'legenda', header: 'Observação / Legenda Individual', width: 48 },
    { key: 'data', header: 'Data/Hora de Registro', width: 22 },
    { key: 'arquivo', header: 'Nome / Tamanho', width: 24 },
  ];

  // Header styling
  const headerRow = wsFotos.getRow(1);
  headerRow.height = 24;
  headerRow.eachCell((cell) => {
    cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0284C7' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  if (inspection.fotos && inspection.fotos.length > 0) {
    for (let i = 0; i < inspection.fotos.length; i++) {
      const photo = inspection.fotos[i];
      const rowIndex = i + 2;
      const row = wsFotos.addRow([
        String(photo.numero).padStart(2, '0'),
        '', // Image cell
        photo.legenda || 'Sem observação específica.',
        photo.dataUpload || inspection.dataCriacao,
        `${photo.nomeArquivo || `foto_${photo.numero}.jpg`} (${photo.tamanhoKb || 0} KB)`,
      ]);

      row.height = 120; // Room for thumbnail
      row.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
      row.getCell(3).alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
      row.getCell(4).alignment = { vertical: 'middle', horizontal: 'center' };
      row.getCell(5).alignment = { vertical: 'middle', horizontal: 'center' };

      // Try embedding the image
      try {
        if (photo.dataUrl && photo.dataUrl.startsWith('data:image')) {
          const base64Data = photo.dataUrl.split(',')[1];
          const imageId = workbook.addImage({
            base64: base64Data,
            extension: 'jpeg',
          });

          wsFotos.addImage(imageId, {
            tl: { col: 1.1, row: rowIndex - 0.9 },
            ext: { width: 175, height: 110 },
            editAs: 'oneCell',
          });
        }
      } catch (err) {
        console.error('Failed to embed image in Excel cell:', err);
        row.getCell(2).value = '[Foto em anexo]';
      }
    }
  } else {
    const emptyRow = wsFotos.addRow(['-', 'Nenhuma foto anexada nesta inspeção', '', '', '']);
    emptyRow.height = 30;
  }

  // Export buffer and trigger download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${inspection.id}_dados_inspecao.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Bulk export multiple inspections to a single consolidated Excel workbook
 */
export async function generateBulkInspectionsExcel(inspections: Inspection[]): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'INSPEÇÃO PRONTO!';
  workbook.created = new Date();

  const ws = workbook.addWorksheet('TODAS_INSPEÇÕES', {
    views: [{ showGridLines: true }],
  });

  ws.columns = [
    { key: 'id', header: 'ID Inspeção', width: 18 },
    { key: 'data', header: 'Data Envio', width: 18 },
    { key: 'obra', header: 'Obra', width: 26 },
    { key: 'equipe', header: 'Equipe', width: 16 },
    { key: 'tecnico', header: 'Técnico Responsável', width: 22 },
    { key: 'tipo', header: 'Tipo de Inspeção', width: 24 },
    { key: 'local', header: 'Local', width: 24 },
    { key: 'responsavel', header: 'Responsável', width: 20 },
    { key: 'fotos', header: 'Qtd Fotos', width: 12 },
    { key: 'gps', header: 'GPS (Lat, Lon)', width: 26 },
    { key: 'endereco', header: 'Endereço', width: 34 },
    { key: 'observacao', header: 'Observação Geral', width: 40 },
    { key: 'status', header: 'Status', width: 14 },
  ];

  const headerRow = ws.getRow(1);
  headerRow.height = 24;
  headerRow.eachCell((cell) => {
    cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0284C7' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  inspections.forEach((insp) => {
    const gpsStr =
      insp.localizacao && !insp.localizacao.semGps
        ? `${insp.localizacao.latitude.toFixed(5)}, ${insp.localizacao.longitude.toFixed(5)} (±${insp.localizacao.precisao}m)`
        : 'Sem GPS';

    ws.addRow({
      id: insp.id,
      data: insp.dataEnvio || insp.dataCriacao,
      obra: insp.obra,
      equipe: insp.equipe,
      tecnico: insp.tecnicoResponsavel,
      tipo: insp.tipoInspecao,
      local: insp.local,
      responsavel: insp.responsavel,
      fotos: insp.fotos.length,
      gps: gpsStr,
      endereco: insp.localizacao?.endereco || '-',
      observacao: insp.observacaoGeral || '-',
      status: insp.status.toUpperCase(),
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `inspecoes_relatorio_consolidado_${new Date().toISOString().slice(0, 10)}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
