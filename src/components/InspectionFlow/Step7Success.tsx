import React, { useEffect } from 'react';
import { CheckCircle2, FileText, Table, PlusCircle, ArrowRight, Eye, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';
import { Inspection } from '../../types/inspection';
import { generateInspectionPdf } from '../../utils/exportPdf';
import { generateInspectionExcel } from '../../utils/exportExcel';

interface Step7Props {
  inspection: Inspection;
  onNewInspection: () => void;
  onViewInspection: (inspection: Inspection) => void;
}

export const Step7Success: React.FC<Step7Props> = ({
  inspection,
  onNewInspection,
  onViewInspection,
}) => {
  useEffect(() => {
    // Fire confetti celebration on complete
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#0284c7', '#38bdf8', '#10b981', '#f59e0b'],
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
    <div className="max-w-xl mx-auto py-4 px-2 space-y-6 animate-in fade-in zoom-in-95 duration-300">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl text-center space-y-5">
        {/* Success Icon */}
        <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 mx-auto flex items-center justify-center shadow-lg shadow-emerald-950/50">
          <CheckCircle2 className="w-9 h-9" />
        </div>

        <div>
          <span className="text-xs font-extrabold uppercase tracking-widest text-emerald-400">
            Registro Concluído
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-100 mt-1">
            INSPEÇÃO ENVIADA COM SUCESSO!
          </h2>
          <p className="text-xs text-slate-400 mt-2 max-w-sm mx-auto">
            Os dados técnicos e fotografias foram processados e salvos com segurança.
          </p>
        </div>

        {/* Highlighted ID Card */}
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-5 text-left space-y-3">
          <div className="flex items-center justify-between border-b border-slate-700/60 pb-3">
            <span className="text-xs text-slate-400 font-semibold uppercase">Número do Registro</span>
            <span className="font-mono font-black text-base sm:text-lg text-sky-400 bg-sky-950/80 px-3 py-1 rounded-lg border border-sky-800">
              {inspection.id}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs text-slate-300">
            <div>
              <span className="text-slate-500 block">Obra</span>
              <span className="font-semibold text-slate-200 truncate block">{inspection.obra}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Equipe</span>
              <span className="font-semibold text-slate-200 truncate block">{inspection.equipe}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Data/Hora</span>
              <span className="font-semibold text-slate-200">{inspection.dataEnvio || inspection.dataCriacao}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Fotografias</span>
              <span className="font-semibold text-sky-400">{inspection.fotos.length} fotos anexadas</span>
            </div>
          </div>
        </div>

        {/* Quick Export Actions */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <button
            onClick={handleExportPdf}
            className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 text-slate-200 font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <FileText className="w-4 h-4 text-rose-400" />
            <span>EXPORTAR PDF</span>
          </button>

          <button
            onClick={handleExportExcel}
            className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 text-slate-200 font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <Table className="w-4 h-4 text-emerald-400" />
            <span>EXPORTAR EXCEL</span>
          </button>
        </div>

        {/* Main Flow Navigation */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            onClick={() => onViewInspection(inspection)}
            className="flex-1 py-3.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-sm flex items-center justify-center gap-2 border border-slate-700 transition-colors"
          >
            <Eye className="w-4 h-4 text-sky-400" />
            <span>VER INSPEÇÃO</span>
          </button>

          <button
            onClick={onNewInspection}
            className="flex-1 py-3.5 px-4 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-sky-950 transition-colors cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>NOVA INSPEÇÃO</span>
          </button>
        </div>
      </div>
    </div>
  );
};
