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
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-slate-800 bg-slate-900/90 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-600/20 border border-sky-500/30 flex items-center justify-center text-sky-400 font-bold">
              IP!
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black text-slate-100 font-mono">
                  {inspection.id}
                </h2>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                    inspection.status === 'concluida'
                      ? 'bg-emerald-950/80 border border-emerald-800 text-emerald-300'
                      : 'bg-amber-950/80 border border-amber-800 text-amber-300'
                  }`}
                >
                  {inspection.status}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {inspection.dataEnvio || inspection.dataCriacao} • {inspection.tipoInspecao}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePdf}
              disabled={isExportingPdf}
              className="hidden sm:flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
            >
              <FileText className="w-4 h-4 text-rose-400" />
              <span>PDF</span>
            </button>
            <button
              onClick={handleExcel}
              disabled={isExportingExcel}
              className="hidden sm:flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
            >
              <Table className="w-4 h-4 text-emerald-400" />
              <span>Excel</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 text-xs text-slate-300">
          {/* Section 1: Identificação Grid */}
          <div className="bg-slate-800/60 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3">
            <h3 className="font-extrabold text-xs uppercase tracking-wider text-sky-400 flex items-center gap-2">
              <Building className="w-4 h-4" />
              <span>Identificação da Inspeção</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-1">
              <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase block">Obra</span>
                <span className="font-bold text-slate-100 text-sm">{inspection.obra}</span>
              </div>

              <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase block">Local Específico</span>
                <span className="font-semibold text-slate-200">{inspection.local}</span>
              </div>

              <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase block">Tipo de Inspeção</span>
                <span className="font-semibold text-slate-200">{inspection.tipoInspecao}</span>
              </div>

              <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase block">Equipe</span>
                <span className="font-semibold text-sky-400">{inspection.equipe}</span>
              </div>

              <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase block">Técnico Responsável</span>
                <span className="font-semibold text-slate-200">{inspection.tecnicoResponsavel}</span>
              </div>

              <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase block">Responsável / Matrícula</span>
                <span className="font-semibold text-slate-200">
                  {inspection.responsavel} {inspection.matricula ? `(${inspection.matricula})` : ''}
                </span>
              </div>
            </div>
          </div>

          {/* Section 2: Localização GPS */}
          <div className="bg-slate-800/60 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-xs uppercase tracking-wider text-emerald-400 flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                <span>Geolocalização</span>
              </h3>
              {hasGps && (
                <a
                  href={getMapsUrl(inspection.localizacao!.latitude, inspection.localizacao!.longitude)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-sky-400 hover:text-sky-300 font-semibold flex items-center gap-1"
                >
                  <span>Abrir Google Maps</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>

            {hasGps ? (
              <div className="space-y-2.5">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-500 uppercase block">Latitude</span>
                    <span className="font-mono font-bold text-slate-200">{inspection.localizacao!.latitude.toFixed(6)}°</span>
                  </div>
                  <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-500 uppercase block">Longitude</span>
                    <span className="font-mono font-bold text-slate-200">{inspection.localizacao!.longitude.toFixed(6)}°</span>
                  </div>
                  <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800 col-span-2 sm:col-span-1">
                    <span className="text-[10px] text-slate-500 uppercase block">Precisão GPS</span>
                    <span className="font-bold text-emerald-400">±{inspection.localizacao!.precisao} metros</span>
                  </div>
                </div>

                {inspection.localizacao!.endereco && (
                  <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-500 uppercase block">Endereço Identificado</span>
                    <p className="text-slate-200 mt-0.5">{inspection.localizacao!.endereco}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-slate-400 italic bg-slate-900/80 p-3 rounded-lg border border-slate-800">
                Coordenadas GPS não registradas para esta inspeção.
              </div>
            )}
          </div>

          {/* Section 3: Observação Geral */}
          {inspection.observacaoGeral && (
            <div className="bg-slate-800/60 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-2">
              <h3 className="font-extrabold text-xs uppercase tracking-wider text-amber-400 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>Observação Geral da Inspeção</span>
              </h3>
              <p className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800 text-slate-200 leading-relaxed whitespace-pre-wrap">
                {inspection.observacaoGeral}
              </p>
            </div>
          )}

          {/* Section 4: Registro Fotográfico */}
          <div className="bg-slate-800/60 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-xs uppercase tracking-wider text-sky-400 flex items-center gap-2">
                <Camera className="w-4 h-4" />
                <span>Registro Fotográfico ({inspection.fotos.length} fotos)</span>
              </h3>
              <span className="text-[11px] text-slate-400">
                Clique na foto para ampliar
              </span>
            </div>

            {inspection.fotos.length === 0 ? (
              <div className="text-center py-6 text-slate-500">
                Nenhuma fotografia registrada nesta inspeção.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                {inspection.fotos.map((photo, idx) => (
                  <div
                    key={photo.id}
                    onClick={() => setLightboxIndex(idx)}
                    className="bg-slate-900 rounded-xl overflow-hidden border border-slate-800 hover:border-sky-500/60 transition-all cursor-pointer group flex flex-col justify-between shadow-sm"
                  >
                    <div className="relative aspect-video w-full overflow-hidden bg-black">
                      <img
                        src={photo.dataUrl}
                        alt={`Foto ${photo.numero}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      />
                      <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/70 text-white font-bold text-[10px]">
                        Foto {String(photo.numero).padStart(2, '0')}
                      </div>
                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                        <Eye className="w-5 h-5" />
                      </div>
                    </div>

                    <div className="p-2.5 flex-1 flex flex-col justify-between space-y-1">
                      <p className="text-[11px] text-slate-300 line-clamp-2">
                        {photo.legenda || <span className="text-slate-500 italic">Sem legenda</span>}
                      </p>
                      {photo.dataUpload && (
                        <span className="text-[9px] text-slate-500 block text-right pt-1 border-t border-slate-800">
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
        <div className="p-4 border-t border-slate-800 flex items-center justify-between gap-2 bg-slate-900 rounded-b-2xl">
          <div className="flex gap-2 sm:hidden flex-1">
            <button
              onClick={handlePdf}
              className="flex-1 py-2.5 bg-slate-800 text-slate-200 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5"
            >
              <FileText className="w-3.5 h-3.5 text-rose-400" />
              <span>PDF</span>
            </button>
            <button
              onClick={handleExcel}
              className="flex-1 py-2.5 bg-slate-800 text-slate-200 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5"
            >
              <Table className="w-3.5 h-3.5 text-emerald-400" />
              <span>Excel</span>
            </button>
          </div>

          <button
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl transition-colors"
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
