import React, { useState, useRef } from 'react';
import {
  Building,
  UserCheck,
  MapPin,
  Camera,
  Image as ImageIcon,
  Send,
  Trash2,
  Eye,
  RefreshCw,
  Navigation,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  X,
} from 'lucide-react';
import { InspectionPhoto, GPSLocation } from '../types/inspection';
import { processInspectionImage } from '../utils/imageProcessor';
import { captureCurrentLocation, getMapsUrl, getOsmEmbedUrl } from '../utils/geo';
import { getStoredInspectionTypes } from '../utils/storage';
import { PhotoLightbox } from './PhotoLightbox';

interface SingleInspectionFormData {
  obra: string;
  equipe: string;
  tecnicoResponsavel: string;
  local: string;
  tipoInspecao: string;
  fotos: InspectionPhoto[];
  responsavel: string;
  matricula: string;
  observacaoGeral: string;
  localizacao?: GPSLocation;
}

interface SingleInspectionFormProps {
  formData: SingleInspectionFormData;
  onChange: (updated: Partial<SingleInspectionFormData>) => void;
  onSubmit: () => Promise<void>;
  onReset: () => void;
}

export const SingleInspectionForm: React.FC<SingleInspectionFormProps> = ({
  formData,
  onChange,
  onSubmit,
  onReset,
}) => {
  const [inspectionTypes] = useState<string[]>(() => getStoredInspectionTypes());

  // Photos state
  const [isProcessingPhotos, setIsProcessingPhotos] = useState(false);
  const [processingProgress, setProcessingProgress] = useState('');
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [photoToDelete, setPhotoToDelete] = useState<InspectionPhoto | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // GPS state
  const [isCapturingGps, setIsCapturingGps] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [showMapEmbed, setShowMapEmbed] = useState(false);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showValidationErrors, setShowValidationErrors] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const MAX_PHOTOS = 15;

  // Validation
  const errors = {
    obra: !formData.obra.trim() ? 'Informe a obra' : null,
    equipe: !formData.equipe.trim() ? 'Selecione ou informe a equipe' : null,
    tecnicoResponsavel: !formData.tecnicoResponsavel.trim() ? 'Informe o técnico responsável' : null,
    local: !formData.local.trim() ? 'Informe o local específico' : null,
    tipoInspecao: !formData.tipoInspecao.trim() ? 'Selecione o tipo de inspeção' : null,
    responsavel: !formData.responsavel.trim() ? 'Informe o responsável pela inspeção' : null,
  };

  const hasErrors = Object.values(errors).some((err) => err !== null);

  // Photo handlers
  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setPhotoError(null);

    const remainingSlots = MAX_PHOTOS - formData.fotos.length;
    if (remainingSlots <= 0) {
      setPhotoError('Limite de 15 fotografias atingido para esta inspeção.');
      return;
    }

    const filesToProcess = Array.from(files).slice(0, remainingSlots);
    if (files.length > remainingSlots) {
      setPhotoError(`Apenas ${remainingSlots} foto(s) foram adicionadas para respeitar o limite de 15.`);
    }

    setIsProcessingPhotos(true);
    const newPhotos: InspectionPhoto[] = [...formData.fotos];

    for (let i = 0; i < filesToProcess.length; i++) {
      const file = filesToProcess[i];
      setProcessingProgress(`Processando evidência ${i + 1} de ${filesToProcess.length}...`);

      try {
        const result = await processInspectionImage(file, 1440, 0.80);
        const photoItem: InspectionPhoto = {
          id: `photo-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
          numero: newPhotos.length + 1,
          dataUrl: result.dataUrl,
          legenda: '',
          dataUpload: result.timestamp,
          largura: result.width,
          altura: result.height,
          tamanhoKb: result.sizeKb,
          nomeArquivo: result.originalName,
        };
        newPhotos.push(photoItem);
      } catch (err: any) {
        console.error('Erro ao processar foto:', err);
      }
    }

    const reindexed = newPhotos.map((p, idx) => ({ ...p, numero: idx + 1 }));
    onChange({ fotos: reindexed });
    setIsProcessingPhotos(false);
    setProcessingProgress('');

    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  const handleUpdateLegenda = (id: string, legenda: string) => {
    const updated = formData.fotos.map((p) => (p.id === id ? { ...p, legenda } : p));
    onChange({ fotos: updated });
  };

  const handleConfirmDeletePhoto = () => {
    if (!photoToDelete) return;
    const updated = formData.fotos
      .filter((p) => p.id !== photoToDelete.id)
      .map((p, idx) => ({ ...p, numero: idx + 1 }));
    onChange({ fotos: updated });
    setPhotoToDelete(null);
  };

  // GPS handler
  const handleCaptureGps = async () => {
    setIsCapturingGps(true);
    setGpsError(null);
    const result = await captureCurrentLocation();
    setIsCapturingGps(false);

    if (result.success && result.location) {
      onChange({ localizacao: result.location });
    } else {
      setGpsError(result.error || 'Não foi possível capturar o sinal GPS.');
    }
  };

  const handleSetNoGps = () => {
    onChange({
      localizacao: {
        latitude: 0,
        longitude: 0,
        precisao: 0,
        dataCaptura: new Date().toLocaleDateString('pt-BR'),
        semGps: true,
        endereco: 'Não registrado (dispensado em campo)',
      },
    });
  };

  // Final submit
  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setShowValidationErrors(true);

    if (hasErrors) {
      const firstErrorElement = document.querySelector('.border-rose-500');
      if (firstErrorElement) {
        firstErrorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit();
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasValidGps = formData.localizacao && !formData.localizacao.semGps;

  return (
    <form onSubmit={handleFinalSubmit} className="max-w-4xl mx-auto space-y-3.5 sm:space-y-5 pb-6">
      {/* Hidden file inputs for Camera vs Gallery */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {/* Top Header Card */}
      <div className="bg-[#0A1D3D] border border-[#12346B] rounded-none p-3.5 sm:p-5 shadow-xl flex items-center justify-between gap-2 sm:gap-4">
        <div>
          <h1 className="text-base sm:text-2xl font-black text-[#FFFFFF] tracking-tight">
            REGISTRO DE INSPEÇÃO
          </h1>
          <p className="text-[10px] sm:text-xs text-[#A7B0C2] mt-0.5">
            Preencha os dados, anexe as fotos e conclua o envio em uma única tela.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setShowResetConfirm(true)}
            className="py-1.5 px-2.5 bg-[#12346B] hover:bg-[#12346B]/80 text-[#FFFFFF] text-[11px] sm:text-xs font-semibold flex items-center gap-1 border border-[#A7B0C2]/30 transition-colors cursor-pointer rounded-none"
            title="Limpar todos os campos e reiniciar formulário"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Limpar</span>
          </button>
        </div>
      </div>

      {/* Validation Alert */}
      {showValidationErrors && hasErrors && (
        <div className="bg-rose-950/90 border border-rose-800 rounded-none p-3 text-xs text-rose-200 space-y-1.5 animate-in fade-in duration-200">
          <div className="flex items-center gap-2 font-bold text-rose-300">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
            <span>Campos obrigatórios pendentes:</span>
          </div>
          <ul className="list-disc list-inside space-y-0.5 text-rose-200 pl-1 text-[11px]">
            {errors.obra && <li>{errors.obra}</li>}
            {errors.equipe && <li>{errors.equipe}</li>}
            {errors.tecnicoResponsavel && <li>{errors.tecnicoResponsavel}</li>}
            {errors.local && <li>{errors.local}</li>}
            {errors.tipoInspecao && <li>{errors.tipoInspecao}</li>}
            {errors.responsavel && <li>{errors.responsavel}</li>}
          </ul>
        </div>
      )}

      {/* SEÇÃO 1: Identificação */}
      <div className="bg-[#0A1D3D] border border-[#12346B] rounded-none p-3.5 sm:p-5 shadow-xl space-y-3">
        <div className="flex items-center gap-2 border-b border-[#12346B] pb-2.5">
          <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-none bg-[#12346B] border border-[#12346B] text-[#FFFFFF] flex items-center justify-center">
            <Building className="w-3.5 h-3.5" />
          </div>
          <div>
            <h2 className="text-xs sm:text-sm font-extrabold text-[#FFFFFF] tracking-wide uppercase">
              IDENTIFICAÇÃO DA OBRA E EQUIPE
            </h2>
            <p className="text-[10px] sm:text-xs text-[#A7B0C2]">
              Dados cadastrais da atividade inspecionada
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 sm:gap-3.5 text-xs">
          {/* Obra */}
          <div className="space-y-1 md:col-span-2">
            <label className="block text-[11px] sm:text-xs font-bold text-[#FFFFFF] uppercase tracking-wider">
              Obra <span className="text-[#FFFFFF]">*</span>
            </label>
            <input
              type="text"
              value={formData.obra}
              onChange={(e) => onChange({ obra: e.target.value })}
              placeholder="Ex: Subestação Norte, Linha LT-230kV..."
              className={`w-full bg-[#0F1726] border rounded-none p-2 sm:p-2.5 text-xs sm:text-sm text-[#FFFFFF] placeholder-[#A7B0C2]/50 focus:outline-none focus:ring-1 focus:ring-[#12346B] transition-all ${
                showValidationErrors && errors.obra ? 'border-rose-500 ring-1 ring-rose-500' : 'border-[#12346B]'
              }`}
            />
          </div>

          {/* Equipe */}
          <div className="space-y-1">
            <label className="block text-[11px] sm:text-xs font-bold text-[#FFFFFF] uppercase tracking-wider">
              Equipe <span className="text-[#FFFFFF]">*</span>
            </label>
            <input
              type="text"
              value={formData.equipe}
              onChange={(e) => onChange({ equipe: e.target.value })}
              placeholder="Ex: EBP01, EQUIPE-ALFA..."
              className={`w-full bg-[#0F1726] border rounded-none p-2 sm:p-2.5 text-xs sm:text-sm text-[#FFFFFF] placeholder-[#A7B0C2]/50 focus:outline-none focus:ring-1 focus:ring-[#12346B] transition-all ${
                showValidationErrors && errors.equipe ? 'border-rose-500 ring-1 ring-rose-500' : 'border-[#12346B]'
              }`}
            />
          </div>

          {/* Técnico Responsável */}
          <div className="space-y-1">
            <label className="block text-[11px] sm:text-xs font-bold text-[#FFFFFF] uppercase tracking-wider">
              Técnico Responsável <span className="text-[#FFFFFF]">*</span>
            </label>
            <input
              type="text"
              value={formData.tecnicoResponsavel}
              onChange={(e) => onChange({ tecnicoResponsavel: e.target.value })}
              placeholder="Nome completo do técnico em campo"
              className={`w-full bg-[#0F1726] border rounded-none p-2 sm:p-2.5 text-xs sm:text-sm text-[#FFFFFF] placeholder-[#A7B0C2]/50 focus:outline-none focus:ring-1 focus:ring-[#12346B] transition-all ${
                showValidationErrors && errors.tecnicoResponsavel ? 'border-rose-500 ring-1 ring-rose-500' : 'border-[#12346B]'
              }`}
            />
          </div>

          {/* Local Específico */}
          <div className="space-y-1 md:col-span-2">
            <label className="block text-[11px] sm:text-xs font-bold text-[#FFFFFF] uppercase tracking-wider">
              Local Específico <span className="text-[#FFFFFF]">*</span>
            </label>
            <input
              type="text"
              value={formData.local}
              onChange={(e) => onChange({ local: e.target.value })}
              placeholder="Ex: Sala Elétrica 03, Poste P-44, Torre 12..."
              className={`w-full bg-[#0F1726] border rounded-none p-2 sm:p-2.5 text-xs sm:text-sm text-[#FFFFFF] placeholder-[#A7B0C2]/50 focus:outline-none focus:ring-1 focus:ring-[#12346B] transition-all ${
                showValidationErrors && errors.local ? 'border-rose-500 ring-1 ring-rose-500' : 'border-[#12346B]'
              }`}
            />
          </div>
        </div>
      </div>

      {/* SEÇÃO 2: Tipo de Inspeção */}
      <div className="bg-[#0A1D3D] border border-[#12346B] rounded-none p-3.5 sm:p-5 shadow-xl space-y-3">
        <div className="flex items-center justify-between border-b border-[#12346B] pb-2.5">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-none bg-[#12346B] border border-[#12346B] text-[#FFFFFF] flex items-center justify-center">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
            <div>
              <h2 className="text-xs sm:text-sm font-extrabold text-[#FFFFFF] tracking-wide uppercase">
                TIPO DE INSPEÇÃO <span className="text-[#FFFFFF]">*</span>
              </h2>
              <p className="text-[10px] sm:text-xs text-[#A7B0C2]">
                Selecione a categoria técnica correspondente
              </p>
            </div>
          </div>
        </div>

        <div>
          <select
            value={formData.tipoInspecao}
            onChange={(e) => onChange({ tipoInspecao: e.target.value })}
            className={`w-full bg-[#0F1726] border rounded-none p-2.5 text-xs sm:text-sm text-[#FFFFFF] focus:outline-none focus:ring-1 focus:ring-[#12346B] transition-all cursor-pointer ${
              showValidationErrors && errors.tipoInspecao ? 'border-rose-500 ring-1 ring-rose-500' : 'border-[#12346B]'
            }`}
          >
            <option value="" disabled className="text-[#A7B0C2]">
              Selecione o tipo de inspeção...
            </option>
            {inspectionTypes.map((type) => (
              <option key={type} value={type} className="bg-[#0A1D3D] text-[#FFFFFF]">
                {type}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* SEÇÃO 3: Registro Fotográfico (Até 15 Fotos) */}
      <div className="bg-[#0A1D3D] border border-[#12346B] rounded-none p-3.5 sm:p-5 shadow-xl space-y-3">
        <div className="flex items-center justify-between gap-2 border-b border-[#12346B] pb-2.5">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-none bg-[#12346B] border border-[#12346B] text-[#FFFFFF] flex items-center justify-center">
              <Camera className="w-3.5 h-3.5" />
            </div>
            <div>
              <h2 className="text-xs sm:text-sm font-extrabold text-[#FFFFFF] tracking-wide uppercase">
                REGISTRO FOTOGRÁFICO
              </h2>
              <p className="text-[10px] sm:text-xs text-[#A7B0C2]">
                Evidências visuais tratadas
              </p>
            </div>
          </div>

          {/* Photo Counter */}
          <div className="flex items-center gap-1.5 bg-[#0F1726] px-2 py-1 rounded-none border border-[#12346B]">
            <span className="text-[10px] sm:text-xs text-[#A7B0C2]">Total:</span>
            <span className="text-xs sm:text-sm font-bold text-[#FFFFFF]">
              {formData.fotos.length}/{MAX_PHOTOS}
            </span>
          </div>
        </div>

        {/* Error Alert */}
        {photoError && (
          <div className="bg-rose-950/80 border border-rose-800 text-rose-200 text-xs rounded-none p-2.5 flex items-start gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1 text-[11px]">
              <p className="font-semibold">{photoError}</p>
            </div>
            <button
              type="button"
              onClick={() => setPhotoError(null)}
              className="text-rose-400 hover:text-rose-200 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Processing Indicator */}
        {isProcessingPhotos && (
          <div className="bg-[#0F1726] border border-[#12346B] rounded-none p-3 text-center space-y-1">
            <div className="flex items-center justify-center gap-2 text-[#FFFFFF] font-semibold text-xs">
              <Sparkles className="w-3.5 h-3.5 animate-spin text-[#FFFFFF]" />
              <span>{processingProgress || 'Comprimindo fotografias...'}</span>
            </div>
            <p className="text-[10px] text-[#A7B0C2]">
              Redimensionamento automático para 1920×1080px (82% JPEG).
            </p>
          </div>
        )}

        {/* Photo Action Buttons */}
        {formData.fotos.length < MAX_PHOTOS && (
          <div className="grid grid-cols-2 gap-2 pt-0.5">
            <button
              type="button"
              disabled={isProcessingPhotos}
              onClick={() => cameraInputRef.current?.click()}
              className="py-2.5 px-3 rounded-none bg-[#12346B] hover:bg-[#12346B]/80 text-[#FFFFFF] font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all active:scale-98 cursor-pointer border border-[#A7B0C2]/30"
            >
              <Camera className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>FOTO</span>
            </button>

            <button
              type="button"
              disabled={isProcessingPhotos}
              onClick={() => fileInputRef.current?.click()}
              className="py-2.5 px-3 rounded-none bg-[#12346B] hover:bg-[#12346B]/80 border border-[#A7B0C2]/30 text-[#FFFFFF] font-bold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-98 cursor-pointer"
            >
              <ImageIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#FFFFFF]" />
              <span>GALERIA</span>
            </button>
          </div>
        )}

        {formData.fotos.length >= MAX_PHOTOS && (
          <div className="bg-[#0F1726] border border-[#12346B] rounded-none p-2.5 text-center text-xs text-[#FFFFFF]">
            Limite máximo de 15 fotografias atingido para esta inspeção.
          </div>
        )}

        {/* Photos Grid & Captions */}
        {formData.fotos.length === 0 ? (
          <div className="border border-dashed border-[#12346B] rounded-none p-4 sm:p-5 text-center space-y-1">
            <div className="w-8 h-8 rounded-none bg-[#0F1726] border border-[#12346B] text-[#A7B0C2] mx-auto flex items-center justify-center">
              <Camera className="w-4 h-4" />
            </div>
            <p className="text-xs font-semibold text-[#FFFFFF]">
              Nenhuma fotografia anexada
            </p>
            <p className="text-[10px] text-[#A7B0C2]">
              Utilize os botões acima para fotografar ou anexar da galeria.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            {formData.fotos.map((foto, index) => (
              <div
                key={foto.id}
                className="bg-[#0F1726] border border-[#12346B] rounded-none p-2.5 shadow-sm space-y-2"
              >
                {/* Photo Top Bar */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="px-1.5 py-0.5 rounded-none bg-[#0A1D3D] border border-[#12346B] text-[#FFFFFF] font-bold text-[10px]">
                      Foto {String(foto.numero).padStart(2, '0')}
                    </span>
                    <span className="text-[10px] text-[#A7B0C2]">
                      {foto.dataUpload}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setPhotoToDelete(foto)}
                    className="p-1 rounded-none text-[#A7B0C2] hover:text-rose-400 hover:bg-rose-950/40 transition-colors cursor-pointer"
                    title="Excluir fotografia"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>

                {/* Photo and Caption */}
                <div className="flex gap-2">
                  <div
                    onClick={() => setLightboxIndex(index)}
                    className="relative w-20 h-18 sm:w-24 sm:h-20 bg-[#0A1D3D] rounded-none overflow-hidden shrink-0 cursor-pointer group border border-[#12346B]"
                  >
                    <img
                      src={foto.dataUrl}
                      alt={`Foto ${foto.numero}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                      <Eye className="w-3.5 h-3.5" />
                    </div>
                  </div>

                  <div className="flex-1 flex flex-col justify-between space-y-1 text-xs">
                    <textarea
                      rows={2}
                      value={foto.legenda}
                      placeholder="Legenda da foto..."
                      onChange={(e) => handleUpdateLegenda(foto.id, e.target.value)}
                      className="w-full bg-[#0A1D3D] border border-[#12346B] rounded-none p-1.5 text-xs text-[#FFFFFF] placeholder-[#A7B0C2]/50 focus:outline-none focus:ring-1 focus:ring-[#12346B] resize-none"
                    />
                    <div className="flex justify-between items-center text-[10px] text-[#A7B0C2]">
                      <span>{foto.legenda ? `${foto.legenda.length} carac.` : 'Sem legenda'}</span>
                      <button
                        type="button"
                        onClick={() => setLightboxIndex(index)}
                        className="text-[#FFFFFF] hover:underline cursor-pointer"
                      >
                        Ampliar
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SEÇÃO 4: Responsável */}
      <div className="bg-[#0A1D3D] border border-[#12346B] rounded-none p-3.5 sm:p-5 shadow-xl space-y-3">
        <div className="flex items-center gap-2 border-b border-[#12346B] pb-2.5">
          <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-none bg-[#12346B] border border-[#12346B] text-[#FFFFFF] flex items-center justify-center">
            <UserCheck className="w-3.5 h-3.5" />
          </div>
          <div>
            <h2 className="text-xs sm:text-sm font-extrabold text-[#FFFFFF] tracking-wide uppercase">
              RESPONSÁVEL
            </h2>
            <p className="text-[10px] sm:text-xs text-[#A7B0C2]">
              Assinatura do executor e anotações complementares
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 sm:gap-3.5 text-xs">
          {/* Responsável */}
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <label className="font-bold text-[11px] sm:text-xs text-[#FFFFFF] uppercase tracking-wider">
                Responsável <span className="text-[#FFFFFF]">*</span>
              </label>
              {formData.tecnicoResponsavel && formData.responsavel !== formData.tecnicoResponsavel && (
                <button
                  type="button"
                  onClick={() => onChange({ responsavel: formData.tecnicoResponsavel })}
                  className="text-[10px] text-[#FFFFFF] hover:underline font-medium cursor-pointer"
                >
                  Copiar Técnico
                </button>
              )}
            </div>
            <input
              type="text"
              value={formData.responsavel}
              onChange={(e) => onChange({ responsavel: e.target.value })}
              placeholder="Nome do responsável pela inspeção"
              className={`w-full bg-[#0F1726] border rounded-none p-2 sm:p-2.5 text-xs sm:text-sm text-[#FFFFFF] placeholder-[#A7B0C2]/50 focus:outline-none focus:ring-1 focus:ring-[#12346B] transition-all ${
                showValidationErrors && errors.responsavel ? 'border-rose-500 ring-1 ring-rose-500' : 'border-[#12346B]'
              }`}
            />
          </div>

          {/* Matrícula / Registro */}
          <div className="space-y-1">
            <label className="block font-bold text-[11px] sm:text-xs text-[#FFFFFF] uppercase tracking-wider">
              Matrícula / Registro <span className="text-[#A7B0C2] font-normal">(Opcional)</span>
            </label>
            <input
              type="text"
              value={formData.matricula}
              onChange={(e) => onChange({ matricula: e.target.value })}
              placeholder="Ex: CREA 123456, MAT-890..."
              className="w-full bg-[#0F1726] border border-[#12346B] rounded-none p-2 sm:p-2.5 text-xs sm:text-sm text-[#FFFFFF] placeholder-[#A7B0C2]/50 focus:outline-none focus:ring-1 focus:ring-[#12346B] transition-all"
            />
          </div>

          {/* Observação Geral */}
          <div className="space-y-1 md:col-span-2">
            <label className="block font-bold text-[11px] sm:text-xs text-[#FFFFFF] uppercase tracking-wider">
              Observação Geral da Inspeção
            </label>
            <textarea
              rows={2}
              value={formData.observacaoGeral}
              onChange={(e) => onChange({ observacaoGeral: e.target.value })}
              placeholder="Anotações gerais, pendências ou recomendações técnicas..."
              className="w-full bg-[#0F1726] border border-[#12346B] rounded-none p-2 text-xs sm:text-sm text-[#FFFFFF] placeholder-[#A7B0C2]/50 focus:outline-none focus:ring-1 focus:ring-[#12346B] resize-none transition-all"
            />
          </div>
        </div>
      </div>

      {/* SEÇÃO 5: Localização */}
      <div className="bg-[#0A1D3D] border border-[#12346B] rounded-none p-3.5 sm:p-5 shadow-xl space-y-3">
        <div className="flex items-center justify-between border-b border-[#12346B] pb-2.5">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-none bg-[#12346B] border border-[#12346B] text-[#FFFFFF] flex items-center justify-center">
              <MapPin className="w-3.5 h-3.5" />
            </div>
            <div>
              <h2 className="text-xs sm:text-sm font-extrabold text-[#FFFFFF] tracking-wide uppercase">
                LOCALIZAÇÃO
              </h2>
              <p className="text-[10px] sm:text-xs text-[#A7B0C2]">
                Coordenadas geográficas em campo
              </p>
            </div>
          </div>

          {hasValidGps && (
            <span className="px-2 py-0.5 rounded-none bg-[#0F1726] border border-[#12346B] text-[#FFFFFF] font-bold text-[10px] sm:text-xs flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> GPS OK
            </span>
          )}
        </div>

        {/* GPS Capture Button */}
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            type="button"
            disabled={isCapturingGps}
            onClick={handleCaptureGps}
            className="flex-1 py-2.5 px-3 rounded-none bg-[#12346B] hover:bg-[#12346B]/80 text-[#FFFFFF] font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all active:scale-98 cursor-pointer border border-[#A7B0C2]/30"
          >
            {isCapturingGps ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>OBTENDO COORDENADAS...</span>
              </>
            ) : hasValidGps ? (
              <>
                <RefreshCw className="w-3.5 h-3.5" />
                <span>ATUALIZAR GPS</span>
              </>
            ) : (
              <>
                <Navigation className="w-3.5 h-3.5" />
                <span>REGISTRAR GPS</span>
              </>
            )}
          </button>

          {!hasValidGps && (
            <button
              type="button"
              onClick={handleSetNoGps}
              className="py-2.5 px-3 rounded-none bg-[#0F1726] hover:bg-[#0A1D3D] border border-[#12346B] text-[#A7B0C2] hover:text-[#FFFFFF] text-xs font-semibold transition-colors cursor-pointer"
            >
              Sem sinal / Dispensar GPS
            </button>
          )}
        </div>

        {/* GPS Error */}
        {gpsError && (
          <div className="bg-rose-950/80 border border-rose-800 text-rose-200 text-xs rounded-none p-2.5 space-y-1.5">
            <div className="flex items-start gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
              <div className="text-[11px]">
                <p className="font-bold">Aviso de GPS:</p>
                <p className="text-rose-300">{gpsError}</p>
              </div>
            </div>
            <div className="flex gap-2 pt-0.5">
              <button
                type="button"
                onClick={handleCaptureGps}
                className="px-2.5 py-1 bg-rose-700 hover:bg-rose-600 text-white rounded-none text-[10px] font-bold cursor-pointer"
              >
                Tentar novamente
              </button>
              <button
                type="button"
                onClick={handleSetNoGps}
                className="px-2.5 py-1 bg-[#12346B] text-[#FFFFFF] rounded-none text-[10px] cursor-pointer border border-[#A7B0C2]/30"
              >
                Dispensar
              </button>
            </div>
          </div>
        )}

        {/* GPS Success Details */}
        {hasValidGps && (
          <div className="bg-[#0F1726] border border-[#12346B] rounded-none p-2.5 space-y-2 text-xs">
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-[#0A1D3D] p-2 rounded-none border border-[#12346B]">
                <span className="text-[#A7B0C2] text-[9px] uppercase block font-semibold">Latitude</span>
                <span className="font-mono font-bold text-[#FFFFFF] text-xs">{formData.localizacao!.latitude.toFixed(6)}°</span>
              </div>
              <div className="bg-[#0A1D3D] p-2 rounded-none border border-[#12346B]">
                <span className="text-[#A7B0C2] text-[9px] uppercase block font-semibold">Longitude</span>
                <span className="font-mono font-bold text-[#FFFFFF] text-xs">{formData.localizacao!.longitude.toFixed(6)}°</span>
              </div>
            </div>

            {formData.localizacao!.endereco && (
              <div className="bg-[#0A1D3D] p-2 rounded-none border border-[#12346B] text-[#FFFFFF]">
                <span className="text-[#A7B0C2] text-[9px] uppercase block font-semibold">Endereço Aproximado</span>
                <p className="text-[#FFFFFF] text-[11px] mt-0.5">{formData.localizacao!.endereco}</p>
              </div>
            )}

            <div className="flex items-center justify-between pt-0.5">
              <button
                type="button"
                onClick={() => setShowMapEmbed(!showMapEmbed)}
                className="text-[11px] text-[#FFFFFF] hover:underline font-semibold flex items-center gap-1 cursor-pointer"
              >
                <Eye className="w-3 h-3" />
                <span>{showMapEmbed ? 'Ocultar mapa' : 'Ver mapa aqui'}</span>
              </button>

              <a
                href={getMapsUrl(formData.localizacao!.latitude, formData.localizacao!.longitude)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-[#A7B0C2] hover:text-[#FFFFFF] font-semibold flex items-center gap-1"
              >
                <span>Google Maps</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>

            {showMapEmbed && (
              <div className="mt-1.5 h-36 w-full rounded-none overflow-hidden border border-[#12346B]">
                <iframe
                  title="Localização da Inspeção"
                  width="100%"
                  height="100%"
                  frameBorder="0"
                  scrolling="no"
                  src={getOsmEmbedUrl(formData.localizacao!.latitude, formData.localizacao!.longitude)}
                />
              </div>
            )}
          </div>
        )}

        {formData.localizacao?.semGps && (
          <div className="bg-[#0F1726] border border-[#12346B] rounded-none p-2.5 text-xs text-[#FFFFFF]">
            Registro marcado sem localização GPS (dispensado em campo).
          </div>
        )}
      </div>

      {/* FINAL SUBMIT BUTTON BAR */}
      <div className="sticky bottom-14 md:bottom-4 z-30 bg-[#0A1D3D]/95 backdrop-blur-md border border-[#12346B] rounded-none p-2.5 sm:p-4 shadow-2xl flex items-center justify-between gap-2">
        <div className="hidden sm:block text-xs text-[#A7B0C2]">
          <span className="font-bold text-[#FFFFFF]">Pronto para finalizar?</span>
          <p className="text-[11px] text-[#A7B0C2]">
            {formData.fotos.length} fotos anexadas • {hasValidGps ? 'GPS registrado' : 'Sem GPS'}
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setShowResetConfirm(true)}
            className="py-2.5 px-3 rounded-none bg-[#12346B] hover:bg-[#12346B]/80 text-[#FFFFFF] text-xs font-semibold transition-colors cursor-pointer border border-[#A7B0C2]/30"
          >
            Limpar
          </button>

          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 sm:flex-initial py-2.5 sm:py-3 px-4 sm:px-8 rounded-none bg-[#12346B] hover:bg-[#12346B]/80 text-[#FFFFFF] font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-md transition-all active:scale-98 cursor-pointer disabled:opacity-50 border border-[#A7B0C2]/30"
          >
            {isSubmitting ? (
              <>
                <Sparkles className="w-3.5 h-3.5 animate-spin" />
                <span>GRAVANDO...</span>
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                <span>ENVIAR INSPEÇÃO</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Photo Delete Modal */}
      {photoToDelete && (
        <div className="fixed inset-0 z-50 bg-[#0F1726]/80 flex items-center justify-center p-4">
          <div className="bg-[#0A1D3D] border border-[#12346B] rounded-none p-5 max-w-sm w-full shadow-2xl space-y-3">
            <h3 className="text-sm font-bold text-[#FFFFFF]">
              Excluir Foto {String(photoToDelete.numero).padStart(2, '0')}?
            </h3>
            <p className="text-xs text-[#A7B0C2]">
              A imagem e sua legenda serão removidas desta inspeção.
            </p>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setPhotoToDelete(null)}
                className="flex-1 py-2.5 bg-[#12346B] text-[#FFFFFF] text-xs font-semibold rounded-none border border-[#A7B0C2]/30 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDeletePhoto}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-none cursor-pointer"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 bg-[#0F1726]/80 flex items-center justify-center p-4">
          <div className="bg-[#0A1D3D] border border-[#12346B] rounded-none p-5 max-w-sm w-full shadow-2xl space-y-3">
            <h3 className="text-sm font-bold text-[#FFFFFF]">
              Limpar todo o formulário?
            </h3>
            <p className="text-xs text-[#A7B0C2]">
              Todos os campos preenchidos e fotografias anexadas serão apagados.
            </p>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="flex-1 py-2.5 bg-[#12346B] text-[#FFFFFF] text-xs font-semibold rounded-none border border-[#A7B0C2]/30 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  onReset();
                  setShowResetConfirm(false);
                }}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-none cursor-pointer"
              >
                Limpar Tudo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox for Zoom */}
      {lightboxIndex !== null && (
        <PhotoLightbox
          photos={formData.fotos}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </form>
  );
};
