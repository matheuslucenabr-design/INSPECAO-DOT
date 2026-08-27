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
    <div className="bg-[#12346B]/40 border border-[#12346B] p-3 sm:p-4 shadow-sm hover:border-[#FFFFFF]/40 transition-all flex flex-col justify-between gap-2.5 text-xs">
      {/* Top Row: ID & Status */}
      <div className="flex items-center justify-between border-b border-[#12346B] pb-2">
        <div className="flex items-center gap-1.5">
          <span className="font-mono font-black text-xs sm:text-sm text-[#FFFFFF]">
            {inspection.id}
          </span>
          <span
            className={`px-1.5 py-0.5 text-[9px] sm:text-[10px] font-bold uppercase border ${
              inspection.status === 'concluida'
                ? 'bg-[#0F1726] border-emerald-800 text-emerald-300'
                : inspection.status === 'processando'
                ? 'bg-[#0F1726] border-[#12346B] text-[#FFFFFF]'
                : 'bg-[#0F1726] border-amber-800 text-amber-300'
            }`}
          >
            {inspection.status === 'concluida' ? 'Concluída' : inspection.status}
          </span>
        </div>

        <button
          onClick={() => setShowDeleteConfirm(true)}
          className="p-1 text-[#A7B0C2] hover:text-rose-400 transition-colors cursor-pointer"
          title="Excluir registro"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>

      {/* Main Info Fields */}
      <div className="space-y-1 text-[#FFFFFF] text-[11px] sm:text-xs">
        <div className="flex items-center gap-1.5">
          <Building className="w-3 h-3 text-[#FFFFFF] shrink-0" />
          <span className="text-[#A7B0C2]">Obra:</span>
          <span className="font-bold text-[#FFFFFF] truncate">{inspection.obra}</span>
        </div>

        <div className="flex items-center gap-1.5">
          <MapPin className="w-3 h-3 text-emerald-400 shrink-0" />
          <span className="text-[#A7B0C2]">Local:</span>
          <span className="font-medium text-[#FFFFFF] truncate">{inspection.local}</span>
        </div>

        <div className="flex items-center gap-1.5">
          <Users className="w-3 h-3 text-[#A7B0C2] shrink-0" />
          <span className="text-[#A7B0C2]">Equipe:</span>
          <span className="font-semibold text-[#FFFFFF]">{inspection.equipe}</span>
        </div>

        <div className="flex items-center gap-1.5">
          <Layers className="w-3 h-3 text-[#FFFFFF] shrink-0" />
          <span className="text-[#A7B0C2]">Tipo:</span>
          <span className="font-medium text-[#A7B0C2] truncate">{inspection.tipoInspecao}</span>
        </div>
      </div>

      {/* Badges: Photos & GPS */}
      <div className="flex flex-wrap items-center gap-1.5 py-1 border-t border-[#12346B]">
        <span className="px-1.5 py-0.5 bg-[#0F1726] text-[#FFFFFF] border border-[#12346B] font-semibold text-[10px] flex items-center gap-1">
          <Camera className="w-3 h-3 text-[#FFFFFF]" />
          <span>{inspection.fotos.length} foto(s)</span>
        </span>

        <span
          className={`px-1.5 py-0.5 font-semibold text-[10px] flex items-center gap-1 border ${
            hasGps
              ? 'bg-[#0F1726] text-emerald-300 border-emerald-800'
              : 'bg-[#0F1726] text-[#A7B0C2] border-[#12346B]'
          }`}
        >
          <MapPin className="w-3 h-3" />
          <span>{hasGps ? 'GPS OK' : 'Sem GPS'}</span>
        </span>
      </div>

      {/* Date & Time */}
      <div className="text-[10px] text-[#A7B0C2] flex items-center gap-1">
        <Calendar className="w-2.5 h-2.5 text-[#A7B0C2]" />
        <span>{inspection.dataEnvio || inspection.dataCriacao}</span>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-3 gap-1.5 pt-1 border-t border-[#12346B]">
        <button
          onClick={() => onOpen(inspection)}
          className="py-1.5 px-2 bg-[#12346B] hover:bg-[#12346B]/80 text-[#FFFFFF] font-bold text-[11px] sm:text-xs transition-all flex items-center justify-center gap-1 cursor-pointer border border-[#A7B0C2]/30"
        >
          <Eye className="w-3 h-3" />
          <span>ABRIR</span>
        </button>

        <button
          onClick={handlePdf}
          disabled={isExportingPdf}
          className="py-1.5 px-2 bg-[#12346B] hover:bg-[#12346B]/80 text-[#FFFFFF] border border-[#A7B0C2]/30 font-semibold text-[11px] sm:text-xs transition-colors flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
          title="Baixar Relatório PDF"
        >
          <FileText className="w-3 h-3 text-rose-400" />
          <span>PDF</span>
        </button>

        <button
          onClick={handleExcel}
          disabled={isExportingExcel}
          className="py-1.5 px-2 bg-[#12346B] hover:bg-[#12346B]/80 text-[#FFFFFF] border border-[#A7B0C2]/30 font-semibold text-[11px] sm:text-xs transition-colors flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
          title="Baixar Planilha Excel com Fotos"
        >
          <Table className="w-3 h-3 text-emerald-400" />
          <span>EXCEL</span>
        </button>
      </div>

      {/* Delete Confirmation Sub-panel */}
      {showDeleteConfirm && (
        <div className="bg-[#0F1726] border border-rose-800 p-2 space-y-1.5 mt-1">
          <p className="text-[10px] font-bold text-rose-200 text-center">
            Excluir este registro permanentemente?
          </p>
          <div className="flex gap-1.5">
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="flex-1 py-1 bg-[#12346B] text-[#FFFFFF] text-[10px] font-semibold cursor-pointer border border-[#A7B0C2]/30"
            >
              Cancelar
            </button>
            <button
              onClick={() => {
                onDelete(inspection.id);
                setShowDeleteConfirm(false);
              }}
              className="flex-1 py-1 bg-rose-600 text-white text-[10px] font-bold cursor-pointer"
            >
              Excluir
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
