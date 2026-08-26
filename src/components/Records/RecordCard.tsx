import React, { useState } from 'react';
import { Camera, MapPin, Calendar, Building, Users, FileText, Table, Eye, Trash2, Layers } from 'lucide-react';
import { Inspection } from '../../types/inspection';
import { generateInspectionPdf } from '../../utils/exportPdf';
import { generateInspectionExcel } from '../../utils/exportExcel';

interface RecordCardProps {
  inspection: Inspection;
  onOpen: (inspection: Inspection) => void;
  onDelete: (id: string) => void;
}

export const RecordCard: React.FC<RecordCardProps> = ({
  inspection,
  onOpen,
  onDelete,
}) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);

  const handlePdf = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExportingPdf(true);
    try {
      await generateInspectionPdf(inspection);
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleExcel = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExportingExcel(true);
    try {
      await generateInspectionExcel(inspection);
    } finally {
      setIsExportingExcel(false);
    }
  };

  const hasGps = inspection.localizacao && !inspection.localizacao.semGps;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-md hover:border-slate-700 transition-all flex flex-col justify-between gap-3 text-xs">
      {/* Top Row: ID & Status */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <span className="font-mono font-black text-sm text-sky-400">
            {inspection.id}
          </span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
              inspection.status === 'concluida'
                ? 'bg-emerald-950/80 border border-emerald-800 text-emerald-300'
                : inspection.status === 'processando'
                ? 'bg-sky-950/80 border border-sky-800 text-sky-300'
                : 'bg-amber-950/80 border border-amber-800 text-amber-300'
            }`}
          >
            {inspection.status === 'concluida' ? 'Concluída' : inspection.status}
          </span>
        </div>

        <button
          onClick={() => setShowDeleteConfirm(true)}
          className="p-1 rounded text-slate-500 hover:text-rose-400 transition-colors"
          title="Excluir registro"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Main Info Fields */}
      <div className="space-y-1.5 text-slate-300">
        <div className="flex items-center gap-2">
          <Building className="w-3.5 h-3.5 text-sky-400 shrink-0" />
          <span className="text-slate-400">Obra:</span>
          <span className="font-bold text-slate-100 truncate">{inspection.obra}</span>
        </div>

        <div className="flex items-center gap-2">
          <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span className="text-slate-400">Local:</span>
          <span className="font-medium text-slate-200 truncate">{inspection.local}</span>
        </div>

        <div className="flex items-center gap-2">
          <Users className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
          <span className="text-slate-400">Equipe:</span>
          <span className="font-semibold text-slate-200">{inspection.equipe}</span>
        </div>

        <div className="flex items-center gap-2">
          <Layers className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span className="text-slate-400">Tipo:</span>
          <span className="font-medium text-slate-300 truncate">{inspection.tipoInspecao}</span>
        </div>
      </div>

      {/* Badges: Photos & GPS */}
      <div className="flex flex-wrap items-center gap-2 py-1 border-t border-slate-800/80">
        <span className="px-2 py-1 rounded-md bg-slate-800 text-slate-300 font-semibold flex items-center gap-1.5">
          <Camera className="w-3.5 h-3.5 text-sky-400" />
          <span>{inspection.fotos.length} foto(s)</span>
        </span>

        <span
          className={`px-2 py-1 rounded-md font-semibold flex items-center gap-1.5 ${
            hasGps
              ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/50'
              : 'bg-slate-800 text-slate-400'
          }`}
        >
          <MapPin className="w-3.5 h-3.5" />
          <span>{hasGps ? 'Localização OK' : 'Sem GPS'}</span>
        </span>
      </div>

      {/* Date & Time */}
      <div className="text-[11px] text-slate-400 flex items-center gap-1">
        <Calendar className="w-3 h-3 text-slate-500" />
        <span>{inspection.dataEnvio || inspection.dataCriacao}</span>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-3 gap-1.5 pt-1 border-t border-slate-800">
        <button
          onClick={() => onOpen(inspection)}
          className="py-2 px-2 rounded-lg bg-sky-600/20 hover:bg-sky-600 text-sky-300 hover:text-white font-bold transition-all flex items-center justify-center gap-1"
        >
          <Eye className="w-3.5 h-3.5" />
          <span>ABRIR</span>
        </button>

        <button
          onClick={handlePdf}
          disabled={isExportingPdf}
          className="py-2 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-semibold transition-colors flex items-center justify-center gap-1"
          title="Baixar Relatório PDF"
        >
          <FileText className="w-3.5 h-3.5 text-rose-400" />
          <span>PDF</span>
        </button>

        <button
          onClick={handleExcel}
          disabled={isExportingExcel}
          className="py-2 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-semibold transition-colors flex items-center justify-center gap-1"
          title="Baixar Planilha Excel com Fotos"
        >
          <Table className="w-3.5 h-3.5 text-emerald-400" />
          <span>EXCEL</span>
        </button>
      </div>

      {/* Delete Confirmation Sub-panel */}
      {showDeleteConfirm && (
        <div className="bg-rose-950/60 border border-rose-800 rounded-xl p-2.5 space-y-2 mt-1">
          <p className="text-[11px] font-bold text-rose-200 text-center">
            Excluir este registro permanentemente?
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="flex-1 py-1.5 rounded bg-slate-800 text-slate-300 text-[11px] font-semibold"
            >
              Cancelar
            </button>
            <button
              onClick={() => {
                onDelete(inspection.id);
                setShowDeleteConfirm(false);
              }}
              className="flex-1 py-1.5 rounded bg-rose-600 text-white text-[11px] font-bold"
            >
              Excluir
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
