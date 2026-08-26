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
      setProcessingProgress(`Otimizando foto ${i + 1} de ${filesToProcess.length}...`);

      try {
        const result = await processInspectionImage(file, 1920, 0.82);
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
        setPhotoError(err.message || 'Falha ao processar a fotografia.');
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
    <form onSubmit={handleFinalSubmit} className="max-w-4xl mx-auto space-y-6 pb-8">
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
        accept="image/jpeg,image/png,image/webp,image/heic"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {/* Top Header Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-100">
            REGISTRO DE INSPEÇÃO
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Preencha os dados, anexe as fotos e conclua o envio em uma única tela.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setShowResetConfirm(true)}
            className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition-colors cursor-pointer"
            title="Limpar todos os campos e reiniciar formulário"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Limpar</span>
          </button>
        </div>
      </div>

      {/* Validation Alert */}
      {showValidationErrors && hasErrors && (
        <div className="bg-rose-950/90 border border-rose-800 rounded-2xl p-4 text-xs text-rose-200 space-y-2 animate-in fade-in duration-200">
          <div className="flex items-center gap-2 font-bold text-rose-300">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>Existem campos obrigatórios pendentes de preenchimento:</span>
          </div>
          <ul className="list-disc list-inside space-y-1 text-rose-200 pl-1">
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
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
        <div className="flex items-center gap-2.5 border-b border-slate-800 pb-3">
          <div className="w-8 h-8 rounded-lg bg-sky-600/20 text-sky-400 flex items-center justify-center">
            <Building className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-slate-100 tracking-wide uppercase">
              IDENTIFICAÇÃO DA OBRA E EQUIPE
            </h2>
            <p className="text-xs text-slate-400">
              Dados cadastrais da atividade inspecionada
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {/* Obra */}
          <div className="space-y-1.5 md:col-span-2">
            <label className="block font-bold text-slate-300 uppercase tracking-wider">
              Obra <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={formData.obra}
              onChange={(e) => onChange({ obra: e.target.value })}
              className={`w-full bg-slate-800 border rounded-xl p-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all ${
                showValidationErrors && errors.obra ? 'border-rose-500 ring-1 ring-rose-500' : 'border-slate-700'
              }`}
            />
          </div>

          {/* Equipe */}
          <div className="space-y-1.5">
            <label className="block font-bold text-slate-300 uppercase tracking-wider">
              Equipe <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={formData.equipe}
              onChange={(e) => onChange({ equipe: e.target.value })}
              className={`w-full bg-slate-800 border rounded-xl p-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all ${
                showValidationErrors && errors.equipe ? 'border-rose-500 ring-1 ring-rose-500' : 'border-slate-700'
              }`}
            />
          </div>

          {/* Técnico Responsável */}
          <div className="space-y-1.5">
            <label className="block font-bold text-slate-300 uppercase tracking-wider">
              Técnico Responsável <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={formData.tecnicoResponsavel}
              onChange={(e) => onChange({ tecnicoResponsavel: e.target.value })}
              className={`w-full bg-slate-800 border rounded-xl p-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all ${
                showValidationErrors && errors.tecnicoResponsavel ? 'border-rose-500 ring-1 ring-rose-500' : 'border-slate-700'
              }`}
            />
          </div>

          {/* Local Específico */}
          <div className="space-y-1.5 md:col-span-2">
            <label className="block font-bold text-slate-300 uppercase tracking-wider">
              Local Específico <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={formData.local}
              onChange={(e) => onChange({ local: e.target.value })}
              className={`w-full bg-slate-800 border rounded-xl p-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all ${
                showValidationErrors && errors.local ? 'border-rose-500 ring-1 ring-rose-500' : 'border-slate-700'
              }`}
            />
          </div>
        </div>
      </div>

      {/* SEÇÃO 2: Tipo de Inspeção */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600/20 text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-slate-100 tracking-wide uppercase">
                TIPO DE INSPEÇÃO <span className="text-rose-500">*</span>
              </h2>
              <p className="text-xs text-slate-400">
                Selecione a categoria técnica correspondente
              </p>
            </div>
          </div>
        </div>

        <div className="pt-1">
          <select
            value={formData.tipoInspecao}
            onChange={(e) => onChange({ tipoInspecao: e.target.value })}
            className={`w-full bg-slate-800 border rounded-xl p-3.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all cursor-pointer ${
              showValidationErrors && errors.tipoInspecao ? 'border-rose-500 ring-1 ring-rose-500' : 'border-slate-700'
            }`}
          >
            <option value="" disabled className="text-slate-500">
              Selecione o tipo de inspeção...
            </option>
            {inspectionTypes.map((type) => (
              <option key={type} value={type} className="bg-slate-900 text-slate-100">
                {type}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* SEÇÃO 3: Registro Fotográfico (Até 15 Fotos) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-600/20 text-sky-400 flex items-center justify-center">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-slate-100 tracking-wide uppercase">
                REGISTRO FOTOGRÁFICO
              </h2>
              <p className="text-xs text-slate-400">
                Evidências visuais com tratamento automático de imagem
              </p>
            </div>
          </div>

          {/* Photo Counter */}
          <div className="flex items-center gap-2 bg-slate-800 px-3.5 py-1.5 rounded-full border border-slate-700 self-start sm:self-auto">
            <span className="text-xs text-slate-400">Total anexado:</span>
            <span
              className={`text-sm font-bold ${
                formData.fotos.length === MAX_PHOTOS
                  ? 'text-amber-400'
                  : formData.fotos.length > 0
                  ? 'text-sky-400'
                  : 'text-slate-300'
              }`}
            >
              {formData.fotos.length}/{MAX_PHOTOS} fotos
            </span>
          </div>
        </div>

        {/* Error Alert */}
        {photoError && (
          <div className="bg-rose-950/80 border border-rose-800 text-rose-200 text-xs rounded-xl p-3.5 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold">{photoError}</p>
            </div>
            <button
              type="button"
              onClick={() => setPhotoError(null)}
              className="text-rose-400 hover:text-rose-200"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Processing Indicator */}
        {isProcessingPhotos && (
          <div className="bg-sky-950/70 border border-sky-800 rounded-xl p-4 text-center space-y-1.5">
            <div className="flex items-center justify-center gap-2 text-sky-400 font-semibold text-xs">
              <Sparkles className="w-4 h-4 animate-spin" />
              <span>{processingProgress || 'Comprimindo e tratando fotografias...'}</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Redimensionamento automático para 1920×1080px (82% JPEG).
            </p>
          </div>
        )}

        {/* Photo Action Buttons */}
        {formData.fotos.length < MAX_PHOTOS && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <button
              type="button"
              disabled={isProcessingPhotos}
              onClick={() => cameraInputRef.current?.click()}
              className="py-3.5 px-4 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-sky-950/60 transition-all active:scale-98 cursor-pointer"
            >
              <Camera className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>FOTO</span>
            </button>

            <button
              type="button"
              disabled={isProcessingPhotos}
              onClick={() => fileInputRef.current?.click()}
              className="py-3.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all active:scale-98 cursor-pointer"
            >
              <ImageIcon className="w-4 h-4 sm:w-5 sm:h-5 text-sky-400" />
              <span>GALERIA</span>
            </button>
          </div>
        )}

        {formData.fotos.length >= MAX_PHOTOS && (
          <div className="bg-amber-950/40 border border-amber-800/80 rounded-xl p-3 text-center text-xs text-amber-300">
            Limite máximo de 15 fotografias atingido para esta inspeção.
          </div>
        )}

        {/* Photos Grid & Captions */}
        {formData.fotos.length === 0 ? (
          <div className="border-2 border-dashed border-slate-800 rounded-2xl p-6 text-center space-y-1.5">
            <div className="w-10 h-10 rounded-full bg-slate-800 text-slate-500 mx-auto flex items-center justify-center">
              <Camera className="w-5 h-5" />
            </div>
            <p className="text-xs font-semibold text-slate-300">
              Nenhuma fotografia anexada
            </p>
            <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
              Utilize os botões acima para fotografar ou anexar da galeria.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-2">
            {formData.fotos.map((foto, index) => (
              <div
                key={foto.id}
                className="bg-slate-800/90 border border-slate-700/80 rounded-xl p-3.5 shadow-sm space-y-3"
              >
                {/* Photo Top Bar */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-sky-600/30 border border-sky-500/40 text-sky-300 font-bold text-[11px]">
                      Foto {String(foto.numero).padStart(2, '0')}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {foto.dataUpload}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setPhotoToDelete(foto)}
                    className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 transition-colors"
                    title="Excluir fotografia"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Photo and Caption */}
                <div className="flex gap-3">
                  <div
                    onClick={() => setLightboxIndex(index)}
                    className="relative w-28 h-24 bg-slate-950 rounded-lg overflow-hidden shrink-0 cursor-pointer group border border-slate-700/60"
                  >
                    <img
                      src={foto.dataUrl}
                      alt={`Foto ${foto.numero}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                      <Eye className="w-4 h-4" />
                    </div>
                  </div>

                  <div className="flex-1 flex flex-col justify-between space-y-1 text-xs">
                    <textarea
                      rows={2}
                      value={foto.legenda}
                      onChange={(e) => handleUpdateLegenda(foto.id, e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none"
                    />
                    <div className="flex justify-between items-center text-[10px] text-slate-500">
                      <span>{foto.legenda ? `${foto.legenda.length} carac.` : 'Sem legenda'}</span>
                      <button
                        type="button"
                        onClick={() => setLightboxIndex(index)}
                        className="text-sky-400 hover:underline"
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
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
        <div className="flex items-center gap-2.5 border-b border-slate-800 pb-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center">
            <UserCheck className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-slate-100 tracking-wide uppercase">
              RESPONSÁVEL
            </h2>
            <p className="text-xs text-slate-400">
              Assinatura do executor e anotações técnicas complementares
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {/* Responsável */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="font-bold text-slate-300 uppercase tracking-wider">
                Responsável pela Inspeção <span className="text-rose-500">*</span>
              </label>
              {formData.tecnicoResponsavel && formData.responsavel !== formData.tecnicoResponsavel && (
                <button
                  type="button"
                  onClick={() => onChange({ responsavel: formData.tecnicoResponsavel })}
                  className="text-[11px] text-sky-400 hover:text-sky-300 underline font-medium"
                >
                  Copiar do Técnico
                </button>
              )}
            </div>
            <input
              type="text"
              value={formData.responsavel}
              onChange={(e) => onChange({ responsavel: e.target.value })}
              className={`w-full bg-slate-800 border rounded-xl p-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all ${
                showValidationErrors && errors.responsavel ? 'border-rose-500 ring-1 ring-rose-500' : 'border-slate-700'
              }`}
            />
          </div>

          {/* Matrícula / Registro */}
          <div className="space-y-1.5">
            <label className="block font-bold text-slate-300 uppercase tracking-wider">
              Matrícula / Registro Profissional <span className="text-slate-500 font-normal">(Opcional)</span>
            </label>
            <input
              type="text"
              value={formData.matricula}
              onChange={(e) => onChange({ matricula: e.target.value })}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all"
            />
          </div>

          {/* Observação Geral */}
          <div className="space-y-1.5 md:col-span-2">
            <label className="block font-bold text-slate-300 uppercase tracking-wider">
              Observação Geral da Inspeção
            </label>
            <textarea
              rows={3}
              value={formData.observacaoGeral}
              onChange={(e) => onChange({ observacaoGeral: e.target.value })}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none transition-all"
            />
          </div>
        </div>
      </div>

      {/* SEÇÃO 5: Localização */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600/20 text-emerald-400 flex items-center justify-center">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-slate-100 tracking-wide uppercase">
                LOCALIZAÇÃO
              </h2>
              <p className="text-xs text-slate-400">
                Coordenadas geográficas e validação de presença em campo
              </p>
            </div>
          </div>

          {hasValidGps && (
            <span className="px-2.5 py-1 rounded-full bg-emerald-950/80 border border-emerald-800 text-emerald-400 font-bold text-xs flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> GPS Capturado
            </span>
          )}
        </div>

        {/* GPS Capture Button */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            disabled={isCapturingGps}
            onClick={handleCaptureGps}
            className="flex-1 py-3 px-4 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-sky-950/60 transition-all active:scale-98 cursor-pointer"
          >
            {isCapturingGps ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>OBTENDO COORDENADAS GPS...</span>
              </>
            ) : hasValidGps ? (
              <>
                <RefreshCw className="w-4 h-4" />
                <span>ATUALIZAR COORDENADAS GPS</span>
              </>
            ) : (
              <>
                <Navigation className="w-4 h-4" />
                <span>REGISTRAR LOCALIZAÇÃO GPS</span>
              </>
            )}
          </button>

          {!hasValidGps && (
            <button
              type="button"
              onClick={handleSetNoGps}
              className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-semibold transition-colors"
            >
              Sem sinal / Dispensar GPS
            </button>
          )}
        </div>

        {/* GPS Error */}
        {gpsError && (
          <div className="bg-rose-950/80 border border-rose-800 text-rose-200 text-xs rounded-xl p-3.5 space-y-2">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Aviso de GPS:</p>
                <p className="text-rose-300">{gpsError}</p>
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={handleCaptureGps}
                className="px-3 py-1.5 bg-rose-700 hover:bg-rose-600 text-white rounded-lg text-[11px] font-bold"
              >
                Tentar novamente
              </button>
              <button
                type="button"
                onClick={handleSetNoGps}
                className="px-3 py-1.5 bg-slate-800 text-slate-200 rounded-lg text-[11px]"
              >
                Dispensar
              </button>
            </div>
          </div>
        )}

        {/* GPS Success Details */}
        {hasValidGps && (
          <div className="bg-emerald-950/40 border border-emerald-800/70 rounded-xl p-3.5 space-y-2.5 text-xs">
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                <span className="text-slate-500 text-[10px] uppercase block font-semibold">Latitude</span>
                <span className="font-mono font-bold text-slate-200 text-sm">{formData.localizacao!.latitude.toFixed(6)}°</span>
              </div>
              <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                <span className="text-slate-500 text-[10px] uppercase block font-semibold">Longitude</span>
                <span className="font-mono font-bold text-slate-200 text-sm">{formData.localizacao!.longitude.toFixed(6)}°</span>
              </div>
            </div>

            {formData.localizacao!.endereco && (
              <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800 text-slate-300">
                <span className="text-slate-500 text-[10px] uppercase block font-semibold">Endereço Aproximado</span>
                <p className="text-slate-200 mt-0.5">{formData.localizacao!.endereco}</p>
              </div>
            )}

            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={() => setShowMapEmbed(!showMapEmbed)}
                className="text-xs text-sky-400 hover:text-sky-300 font-semibold flex items-center gap-1"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>{showMapEmbed ? 'Ocultar mapa interativo' : 'Ver mapa aqui'}</span>
              </button>

              <a
                href={getMapsUrl(formData.localizacao!.latitude, formData.localizacao!.longitude)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-slate-400 hover:text-slate-200 font-semibold flex items-center gap-1"
              >
                <span>Abrir Google Maps</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            {showMapEmbed && (
              <div className="mt-2 h-44 w-full rounded-lg overflow-hidden border border-slate-700">
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
          <div className="bg-amber-950/30 border border-amber-800/50 rounded-xl p-3 text-xs text-amber-300">
            Registro marcado sem localização GPS (dispensado em campo).
          </div>
        )}
      </div>

      {/* FINAL SUBMIT BUTTON BAR */}
      <div className="sticky bottom-4 z-30 bg-slate-900/95 backdrop-blur-md border border-slate-700 rounded-2xl p-4 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="hidden sm:block text-xs text-slate-400">
          <span className="font-bold text-slate-200">Pronto para finalizar?</span>
          <p className="text-[11px] text-slate-500">
            {formData.fotos.length} fotos anexadas • {hasValidGps ? 'GPS registrado' : 'Sem GPS'}
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setShowResetConfirm(true)}
            className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
          >
            Limpar
          </button>

          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 sm:flex-initial py-3.5 px-8 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-950 transition-all active:scale-98 cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Sparkles className="w-4 h-4 animate-spin" />
                <span>GRAVANDO...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>FINALIZAR E ENVIAR INSPEÇÃO</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Photo Delete Modal */}
      {photoToDelete && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5 max-w-sm w-full shadow-2xl space-y-3">
            <h3 className="text-sm font-bold text-slate-100">
              Excluir Foto {String(photoToDelete.numero).padStart(2, '0')}?
            </h3>
            <p className="text-xs text-slate-400">
              A imagem e sua legenda serão removidas desta inspeção.
            </p>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setPhotoToDelete(null)}
                className="flex-1 py-2.5 bg-slate-800 text-slate-300 text-xs font-semibold rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDeletePhoto}
                className="flex-1 py-2.5 bg-rose-600 text-white text-xs font-bold rounded-xl"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5 max-w-sm w-full shadow-2xl space-y-3">
            <h3 className="text-sm font-bold text-slate-100">
              Limpar todo o formulário?
            </h3>
            <p className="text-xs text-slate-400">
              Todos os campos preenchidos e fotografias anexadas serão apagados.
            </p>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="flex-1 py-2.5 bg-slate-800 text-slate-300 text-xs font-semibold rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  onReset();
                  setShowResetConfirm(false);
                }}
                className="flex-1 py-2.5 bg-rose-600 text-white text-xs font-bold rounded-xl"
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
