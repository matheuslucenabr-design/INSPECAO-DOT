import React, { useEffect } from 'react';
import { CheckCircle2, FileText, Table, PlusCircle, Eye, FolderArchive } from 'lucide-react';
import confetti from 'canvas-confetti';
import { Inspection } from '../../types/inspection';
import { generateInspectionPdf } from '../../utils/exportPdf';
import { generateInspectionExcel } from '../../utils/exportExcel';

interface Step7Props {
  inspection: Inspection;
  onNewInspection: () => void;
  onViewInspection: (inspection: Inspection) => void;
  onGoToRecords?: () => void;
}

export const Step7Success: React.FC<Step7Props> = ({
  inspection,
  onNewInspection,
  onViewInspection,
  onGoToRecords,
}) => {
  useEffect(() => {
    // Fire confetti celebration on complete
    try {
      confetti({
        particleCount: 70,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#0A1D3D', '#12346B', '#FFFFFF', '#A7B0C2'],
      });
    } catch {
      // Ignore if confetti fails
    }
  }, []);

  const handleExportPdf = () => {
    generateInspectionPdf(inspection);
  };

  const handleExportExcel = () => {
    generateInspectionExcel(inspection);
  };

  return (
    <div className="max-w-xl mx-auto py-2 sm:py-4 px-1 sm:px-2 space-y-4 sm:space-y-6 animate-in fade-in zoom-in-95 duration-300">
      <div className="bg-[#0A1D3D] border border-[#12346B] rounded-none p-4 sm:p-8 shadow-2xl text-center space-y-4 sm:space-y-5">
        {/* Success Icon */}
        <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-none bg-[#12346B] border border-[#12346B] text-[#FFFFFF] mx-auto flex items-center justify-center shadow-lg">
          <CheckCircle2 className="w-7 h-7 sm:w-9 sm:h-9" />
        </div>

        <div>
          <span className="text-[10px] sm:text-xs font-extrabold uppercase tracking-widest text-[#FFFFFF]">
            Registro Concluído
          </span>
          <h2 className="text-xl sm:text-3xl font-black text-[#FFFFFF] mt-0.5 sm:mt-1">
            INSPEÇÃO ENVIADA COM SUCESSO!
          </h2>
          <p className="text-[10px] sm:text-xs text-[#A7B0C2] mt-1 sm:mt-2 max-w-sm mx-auto">
            Os dados técnicos e fotografias foram salvos e sincronizados com segurança.
          </p>
        </div>

        {/* Highlighted ID Card */}
        <div className="bg-[#0F1726] border border-[#12346B] rounded-none p-3.5 sm:p-5 text-left space-y-2.5 sm:space-y-3">
          <div className="flex items-center justify-between border-b border-[#12346B] pb-2 sm:pb-3">
            <span className="text-[10px] sm:text-xs text-[#A7B0C2] font-semibold uppercase">Protocolo</span>
            <span className="font-mono font-black text-sm sm:text-lg text-[#FFFFFF] bg-[#0A1D3D] px-2 sm:px-3 py-0.5 sm:py-1 border border-[#12346B]">
              {inspection.id}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px] sm:text-xs text-[#FFFFFF]">
            <div>
              <span className="text-[9px] sm:text-[10px] text-[#A7B0C2] block">Obra</span>
              <span className="font-semibold text-[#FFFFFF] truncate block">{inspection.obra}</span>
            </div>
            <div>
              <span className="text-[9px] sm:text-[10px] text-[#A7B0C2] block">Equipe</span>
              <span className="font-semibold text-[#FFFFFF] truncate block">{inspection.equipe}</span>
            </div>
            <div>
              <span className="text-[9px] sm:text-[10px] text-[#A7B0C2] block">Data/Hora</span>
              <span className="font-semibold text-[#FFFFFF]">{inspection.dataEnvio || inspection.dataCriacao}</span>
            </div>
            <div>
              <span className="text-[9px] sm:text-[10px] text-[#A7B0C2] block">Fotografias</span>
              <span className="font-semibold text-[#FFFFFF]">{inspection.fotos.length} fotos anexadas</span>
            </div>
          </div>
        </div>

        {/* Quick Export Actions */}
        <div className="grid grid-cols-2 gap-2 sm:gap-3 pt-0.5">
          <button
            onClick={handleExportPdf}
            className="py-2.5 px-3 rounded-none bg-[#12346B] hover:bg-[#12346B]/80 border border-[#A7B0C2]/30 text-[#FFFFFF] font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5 text-rose-400" />
            <span>EXPORTAR PDF</span>
          </button>

          <button
            onClick={handleExportExcel}
            className="py-2.5 px-3 rounded-none bg-[#12346B] hover:bg-[#12346B]/80 border border-[#A7B0C2]/30 text-[#FFFFFF] font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <Table className="w-3.5 h-3.5 text-emerald-400" />
            <span>EXPORTAR EXCEL</span>
          </button>
        </div>

        {/* Main Flow Navigation */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-1">
          <button
            onClick={() => onViewInspection(inspection)}
            className="flex-1 py-2.5 sm:py-3.5 px-3 rounded-none bg-[#0F1726] hover:bg-[#12346B] text-[#FFFFFF] font-bold text-xs flex items-center justify-center gap-1.5 border border-[#A7B0C2]/30 transition-colors cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5 text-[#FFFFFF]" />
            <span>VER DETALHES</span>
          </button>

          {onGoToRecords && (
            <button
              onClick={onGoToRecords}
              className="flex-1 py-2.5 sm:py-3.5 px-3 rounded-none bg-[#0F1726] hover:bg-[#12346B] text-[#FFFFFF] font-bold text-xs flex items-center justify-center gap-1.5 border border-[#A7B0C2]/30 transition-colors cursor-pointer"
            >
              <FolderArchive className="w-3.5 h-3.5 text-[#FFFFFF]" />
              <span>VER REGISTROS</span>
            </button>
          )}

          <button
            onClick={onNewInspection}
            className="flex-1 py-2.5 sm:py-3.5 px-3 rounded-none bg-[#12346B] hover:bg-[#12346B]/80 text-[#FFFFFF] font-bold text-xs flex items-center justify-center gap-1.5 border border-[#A7B0C2]/30 transition-colors cursor-pointer"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>NOVA INSPEÇÃO</span>
          </button>
        </div>
      </div>
    </div>
  );
};
