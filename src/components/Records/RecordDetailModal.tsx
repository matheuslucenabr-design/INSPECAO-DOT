import React, { useState } from 'react';
import { X, FileText, Table, Camera, MapPin, Building, Users, UserCheck, Calendar, ExternalLink, Eye, Clock, ShieldCheck, Tag } from 'lucide-react';
import { Inspection } from '../../types/inspection';
import { generateInspectionPdf } from '../../utils/exportPdf';
import { generateInspectionExcel } from '../../utils/exportExcel';
import { getMapsUrl, getOsmEmbedUrl } from '../../utils/geo';
import { PhotoLightbox } from '../PhotoLightbox';

interface RecordDetailModalProps {
  inspection: Inspection;
  onClose: () => void;
}

export const RecordDetailModal: React.FC<RecordDetailModalProps> = ({
  inspection,
  onClose,
}) => {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);

  const handlePdf = async () => {
    setIsExportingPdf(true);
    try {
      await generateInspectionPdf(inspection);
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleExcel = async () => {
    setIsExportingExcel(true);
    try {
      await generateInspectionExcel(inspection);
    } finally {
      setIsExportingExcel(false);
    }
  };

  const hasGps = inspection.localizacao && !inspection.localizacao.semGps;

  return (
    <div className="fixed inset-0 z-50 bg-[#0F1726]/85 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4">
      <div className="bg-[#0A1D3D] border border-[#12346B] w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-3.5 sm:p-5 border-b border-[#12346B] bg-[#0A1D3D]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-[#12346B] border border-[#12346B] flex items-center justify-center text-[#FFFFFF] font-bold text-xs">
              IP!
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-[#FFFFFF] font-mono">
                  {inspection.id}
                </h2>
                <span
                  className={`px-1.5 py-0.5 text-[9px] sm:text-[10px] font-bold uppercase border ${
                    inspection.status === 'concluida'
                      ? 'bg-[#0F1726] border-emerald-800 text-emerald-300'
                      : 'bg-[#0F1726] border-[#12346B] text-[#FFFFFF]'
                  }`}
                >
                  {inspection.status}
                </span>
              </div>
              <p className="text-[10px] sm:text-xs text-[#A7B0C2]">
                {inspection.dataEnvio || inspection.dataCriacao} • {inspection.tipoInspecao}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handlePdf}
              disabled={isExportingPdf}
              className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 bg-[#12346B] hover:bg-[#12346B]/80 text-[#FFFFFF] text-xs font-semibold border border-[#A7B0C2]/30 transition-colors cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5 text-rose-400" />
              <span>PDF</span>
            </button>
            <button
              onClick={handleExcel}
              disabled={isExportingExcel}
              className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 bg-[#12346B] hover:bg-[#12346B]/80 text-[#FFFFFF] text-xs font-semibold border border-[#A7B0C2]/30 transition-colors cursor-pointer"
            >
              <Table className="w-3.5 h-3.5 text-emerald-400" />
              <span>Excel</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-[#A7B0C2] hover:text-white hover:bg-[#12346B] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-5 space-y-4 sm:space-y-5 text-xs text-[#FFFFFF]">
          {/* Section 1: Identificação Grid */}
          <div className="bg-[#0F1726] border border-[#12346B] p-3 sm:p-4 space-y-2.5">
            <h3 className="font-extrabold text-[11px] sm:text-xs uppercase tracking-wider text-[#FFFFFF] flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5" />
              <span>Identificação da Inspeção</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-0.5">
              <div className="bg-[#12346B]/40 p-2.5 border border-[#12346B]">
                <span className="text-[9px] sm:text-[10px] text-[#A7B0C2] uppercase block">Obra</span>
                <span className="font-bold text-[#FFFFFF] text-xs sm:text-sm">{inspection.obra}</span>
              </div>

              <div className="bg-[#12346B]/40 p-2.5 border border-[#12346B]">
                <span className="text-[9px] sm:text-[10px] text-[#A7B0C2] uppercase block">Local Específico</span>
                <span className="font-semibold text-[#FFFFFF] text-xs">{inspection.local}</span>
              </div>

              <div className="bg-[#12346B]/40 p-2.5 border border-[#12346B]">
                <span className="text-[9px] sm:text-[10px] text-[#A7B0C2] uppercase block">Tipo de Inspeção</span>
                <span className="font-semibold text-[#FFFFFF] text-xs">{inspection.tipoInspecao}</span>
              </div>

              <div className="bg-[#12346B]/40 p-2.5 border border-[#12346B]">
                <span className="text-[9px] sm:text-[10px] text-[#A7B0C2] uppercase block">Equipe</span>
                <span className="font-semibold text-[#FFFFFF] text-xs">{inspection.equipe}</span>
              </div>

              <div className="bg-[#12346B]/40 p-2.5 border border-[#12346B]">
                <span className="text-[9px] sm:text-[10px] text-[#A7B0C2] uppercase block">Técnico Responsável</span>
                <span className="font-semibold text-[#FFFFFF] text-xs">{inspection.tecnicoResponsavel}</span>
              </div>

              <div className="bg-[#12346B]/40 p-2.5 border border-[#12346B]">
                <span className="text-[9px] sm:text-[10px] text-[#A7B0C2] uppercase block">Responsável / Matrícula</span>
                <span className="font-semibold text-[#FFFFFF] text-xs">
                  {inspection.responsavel} {inspection.matricula ? `(${inspection.matricula})` : ''}
                </span>
              </div>

              <div className="bg-[#12346B]/40 p-2.5 border border-[#12346B] sm:col-span-2 md:col-span-3">
                <span className="text-[9px] sm:text-[10px] text-amber-300 uppercase block font-bold">
                  Sala de Armazenamento Central
                </span>
                <span className="font-mono font-bold text-amber-200 text-xs">
                  {inspection.roomId || inspection.sala || 'tecnico@inspecaopronto.com'}
                </span>
              </div>
            </div>
          </div>

          {/* Section 2: Localização GPS */}
          <div className="bg-[#0F1726] border border-[#12346B] p-3 sm:p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-[11px] sm:text-xs uppercase tracking-wider text-[#FFFFFF] flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" />
                <span>Geolocalização</span>
              </h3>
              {hasGps && (
                <a
                  href={getMapsUrl(inspection.localizacao!.latitude, inspection.localizacao!.longitude)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-[#FFFFFF] hover:underline font-semibold flex items-center gap-1"
                >
                  <span>Google Maps</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
              )}
            </div>

            {hasGps ? (
              <div className="space-y-2.5">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <div className="bg-[#12346B]/40 p-2.5 border border-[#12346B]">
                    <span className="text-[10px] text-[#A7B0C2] uppercase block">Latitude</span>
                    <span className="font-mono font-bold text-[#FFFFFF]">{inspection.localizacao!.latitude.toFixed(6)}°</span>
                  </div>
                  <div className="bg-[#12346B]/40 p-2.5 border border-[#12346B]">
                    <span className="text-[10px] text-[#A7B0C2] uppercase block">Longitude</span>
                    <span className="font-mono font-bold text-[#FFFFFF]">{inspection.localizacao!.longitude.toFixed(6)}°</span>
                  </div>
                  <div className="bg-[#12346B]/40 p-2.5 border border-[#12346B] col-span-2 sm:col-span-1">
                    <span className="text-[10px] text-[#A7B0C2] uppercase block">Precisão GPS</span>
                    <span className="font-bold text-emerald-400">±{inspection.localizacao!.precisao} metros</span>
                  </div>
                </div>

                {inspection.localizacao!.endereco && (
                  <div className="bg-[#12346B]/40 p-3 border border-[#12346B]">
                    <span className="text-[10px] text-[#A7B0C2] uppercase block">Endereço Identificado</span>
                    <p className="text-[#FFFFFF] mt-0.5">{inspection.localizacao!.endereco}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-[#A7B0C2] italic bg-[#12346B]/40 p-3 border border-[#12346B]">
                Coordenadas GPS não registradas para esta inspeção.
              </div>
            )}
          </div>

          {/* Section 3: Observação Geral */}
          {inspection.observacaoGeral && (
            <div className="bg-[#0F1726] border border-[#12346B] p-4 sm:p-5 space-y-2">
              <h3 className="font-extrabold text-xs uppercase tracking-wider text-[#FFFFFF] flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>Observação Geral da Inspeção</span>
              </h3>
              <p className="bg-[#12346B]/40 p-3.5 border border-[#12346B] text-[#FFFFFF] leading-relaxed whitespace-pre-wrap">
                {inspection.observacaoGeral}
              </p>
            </div>
          )}

          {/* Section 4: Registro Fotográfico */}
          <div className="bg-[#0F1726] border border-[#12346B] p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-xs uppercase tracking-wider text-[#FFFFFF] flex items-center gap-2">
                <Camera className="w-4 h-4" />
                <span>Registro Fotográfico ({inspection.fotos.length} fotos)</span>
              </h3>
              <span className="text-[11px] text-[#A7B0C2]">
                Clique na foto para ampliar
              </span>
            </div>

            {inspection.fotos.length === 0 ? (
              <div className="text-center py-6 text-[#A7B0C2]">
                Nenhuma fotografia registrada nesta inspeção.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                {inspection.fotos.map((photo, idx) => (
                  <div
                    key={photo.id}
                    onClick={() => setLightboxIndex(idx)}
                    className="bg-[#0A1D3D] overflow-hidden border border-[#12346B] hover:border-[#12346B] transition-all cursor-pointer group flex flex-col justify-between shadow-sm"
                  >
                    <div className="relative aspect-video w-full overflow-hidden bg-[#0F1726]">
                      <img
                        src={photo.dataUrl}
                        alt={`Foto ${photo.numero}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      />
                      <div className="absolute top-2 left-2 px-2 py-0.5 bg-[#0F1726]/90 text-[#FFFFFF] font-bold text-[10px] border border-[#12346B]">
                        Foto {String(photo.numero).padStart(2, '0')}
                      </div>
                      <div className="absolute inset-0 bg-[#0F1726]/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-[#FFFFFF]">
                        <Eye className="w-5 h-5" />
                      </div>
                    </div>

                    <div className="p-2.5 flex-1 flex flex-col justify-between space-y-1">
                      <p className="text-[11px] text-[#FFFFFF] line-clamp-2">
                        {photo.legenda || <span className="text-[#A7B0C2] italic">Sem legenda</span>}
                      </p>
                      {photo.dataUpload && (
                        <span className="text-[9px] text-[#A7B0C2] block text-right pt-1 border-t border-[#12346B]">
                          {photo.dataUpload}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer (Mobile Actions) */}
        <div className="p-4 border-t border-[#12346B] flex items-center justify-between gap-2 bg-[#0A1D3D]">
          <div className="flex gap-2 sm:hidden flex-1">
            <button
              onClick={handlePdf}
              className="flex-1 py-2.5 bg-[#12346B] text-[#FFFFFF] font-bold text-xs flex items-center justify-center gap-1.5 border border-[#A7B0C2]/30"
            >
              <FileText className="w-3.5 h-3.5 text-rose-400" />
              <span>PDF</span>
            </button>
            <button
              onClick={handleExcel}
              className="flex-1 py-2.5 bg-[#12346B] text-[#FFFFFF] font-bold text-xs flex items-center justify-center gap-1.5 border border-[#A7B0C2]/30"
            >
              <Table className="w-3.5 h-3.5 text-emerald-400" />
              <span>Excel</span>
            </button>
          </div>

          <button
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2.5 bg-[#12346B] hover:bg-[#12346B]/80 text-[#FFFFFF] font-bold text-xs transition-colors cursor-pointer border border-[#A7B0C2]/30"
          >
            Fechar
          </button>
        </div>
      </div>

      {/* Lightbox for full screen viewing */}
      {lightboxIndex !== null && (
        <PhotoLightbox
          photos={inspection.fotos}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </div>
  );
};
