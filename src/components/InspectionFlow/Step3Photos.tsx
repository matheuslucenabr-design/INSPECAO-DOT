import React, { useState, useRef } from 'react';
import { Camera, Image as ImageIcon, Plus, Trash2, ArrowLeft, ArrowRight, AlertTriangle, Eye, Sparkles, Check, X } from 'lucide-react';
import { InspectionPhoto } from '../../types/inspection';
import { processInspectionImage } from '../../utils/imageProcessor';
import { PhotoLightbox } from '../PhotoLightbox';

interface Step3Props {
  fotos: InspectionPhoto[];
  onChange: (fotos: InspectionPhoto[]) => void;
  onNext: () => void;
  onPrev: () => void;
}

export const Step3Photos: React.FC<Step3Props> = ({
  fotos,
  onChange,
  onNext,
  onPrev,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [photoToDelete, setPhotoToDelete] = useState<InspectionPhoto | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const MAX_PHOTOS = 15;

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setErrorMessage(null);

    const remainingSlots = MAX_PHOTOS - fotos.length;
    if (remainingSlots <= 0) {
      setErrorMessage('Limite atingido. Esta inspeção permite no máximo 15 fotografias.');
      return;
    }

    const filesToProcess = Array.from(files).slice(0, remainingSlots);
    if (files.length > remainingSlots) {
      setErrorMessage(`Apenas ${remainingSlots} foto(s) foram adicionadas para não exceder o limite de 15.`);
    }

    setIsProcessing(true);
    const newPhotos: InspectionPhoto[] = [...fotos];

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
        setErrorMessage(err.message || 'Falha ao processar a fotografia.');
      }
    }

    // Re-index all photos
    const reindexed = newPhotos.map((p, idx) => ({ ...p, numero: idx + 1 }));
    onChange(reindexed);
    setIsProcessing(false);
    setProcessingProgress('');

    // Reset inputs
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  const handleUpdateLegenda = (id: string, legenda: string) => {
    const updated = fotos.map((p) => (p.id === id ? { ...p, legenda } : p));
    onChange(updated);
  };

  const handleConfirmDelete = () => {
    if (!photoToDelete) return;
    const updated = fotos
      .filter((p) => p.id !== photoToDelete.id)
      .map((p, idx) => ({ ...p, numero: idx + 1 }));
    onChange(updated);
    setPhotoToDelete(null);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
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

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-5">
        {/* Header and Photo Counter */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2.5 text-sky-400 font-bold text-xs uppercase tracking-wider mb-1">
              <Camera className="w-4 h-4" />
              <span>ETAPA 3</span>
            </div>
            <h2 className="text-xl font-extrabold text-slate-100">
              REGISTRO FOTOGRÁFICO
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Documente os pontos inspecionados com fotos claras e legendas detalhadas.
            </p>
          </div>

          {/* Photo Counter Pill */}
          <div className="flex items-center gap-2 self-start sm:self-auto bg-slate-800 px-3.5 py-1.5 rounded-full border border-slate-700">
            <span className="text-xs text-slate-400">Fotos adicionadas:</span>
            <span
              className={`text-sm font-bold ${
                fotos.length === MAX_PHOTOS
                  ? 'text-amber-400'
                  : fotos.length > 0
                  ? 'text-sky-400'
                  : 'text-slate-300'
              }`}
            >
              {fotos.length}/{MAX_PHOTOS}
            </span>
          </div>
        </div>

        {/* Error / Alert banner */}
        {errorMessage && (
          <div className="bg-rose-950/80 border border-rose-800 text-rose-200 text-xs rounded-xl p-3.5 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold">{errorMessage}</p>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-rose-400 hover:text-rose-200"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Processing Indicator */}
        {isProcessing && (
          <div className="bg-sky-950/70 border border-sky-800 rounded-xl p-4 text-center space-y-2">
            <div className="flex items-center justify-center gap-2 text-sky-400 font-semibold text-xs">
              <Sparkles className="w-4 h-4 animate-spin" />
              <span>{processingProgress || 'Comprimindo e corrigindo orientações de imagem...'}</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Redimensionamento automático para 1920×1080px (82% JPEG).
            </p>
          </div>
        )}

        {/* Add Photo Action Buttons */}
        {fotos.length < MAX_PHOTOS && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {/* Tirar Foto (Camera) */}
            <button
              type="button"
              disabled={isProcessing}
              onClick={() => cameraInputRef.current?.click()}
              className="py-4 px-4 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-sm flex items-center justify-center gap-2.5 shadow-lg shadow-sky-950/60 transition-all active:scale-98 touch-manipulation cursor-pointer"
            >
              <Camera className="w-5 h-5" />
              <span>TIRAR FOTO (CÂMERA)</span>
            </button>

            {/* Escolher da Galeria */}
            <button
              type="button"
              disabled={isProcessing}
              onClick={() => fileInputRef.current?.click()}
              className="py-4 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold text-sm flex items-center justify-center gap-2.5 transition-all active:scale-98 touch-manipulation cursor-pointer"
            >
              <ImageIcon className="w-5 h-5 text-sky-400" />
              <span>ESCOLHER DA GALERIA</span>
            </button>
          </div>
        )}

        {/* Maximum Photos reached badge */}
        {fotos.length >= MAX_PHOTOS && (
          <div className="bg-amber-950/40 border border-amber-800/80 rounded-xl p-3.5 text-center text-xs text-amber-300">
            Limite máximo de 15 fotografias atingido para esta inspeção.
          </div>
        )}

        {/* Photos List / Cards */}
        {fotos.length === 0 ? (
          <div className="border-2 border-dashed border-slate-800 rounded-2xl p-8 text-center space-y-2">
            <div className="w-12 h-12 rounded-full bg-slate-800 text-slate-500 mx-auto flex items-center justify-center">
              <Camera className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-slate-300">
              Nenhuma fotografia adicionada ainda
            </p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Utilize os botões acima para fotografar o local ou anexar imagens da galeria (máx. 15 fotos).
            </p>
          </div>
        ) : (
          <div className="space-y-4 pt-2">
            {fotos.map((foto, index) => (
              <div
                key={foto.id}
                className="bg-slate-800/90 border border-slate-700/80 rounded-xl p-4 shadow-sm hover:border-slate-600 transition-all space-y-3"
              >
                {/* Photo Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-md bg-sky-600/30 border border-sky-500/40 text-sky-300 font-bold text-xs">
                      Foto {String(foto.numero).padStart(2, '0')} de {String(fotos.length).padStart(2, '0')}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {foto.dataUpload} {foto.tamanhoKb ? `• ${foto.tamanhoKb} KB` : ''}
                    </span>
                  </div>

                  {/* Delete Button */}
                  <button
                    type="button"
                    onClick={() => setPhotoToDelete(foto)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 transition-colors"
                    title="Excluir fotografia"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Photo and Caption Flex container */}
                <div className="flex flex-col sm:flex-row gap-3.5">
                  {/* Photo thumbnail */}
                  <div
                    onClick={() => setLightboxIndex(index)}
                    className="relative w-full sm:w-44 h-40 bg-slate-950 rounded-lg overflow-hidden shrink-0 cursor-pointer group border border-slate-700/60"
                  >
                    <img
                      src={foto.dataUrl}
                      alt={`Foto ${foto.numero}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                      <Eye className="w-6 h-6" />
                    </div>
                  </div>

                  {/* Caption Input Field */}
                  <div className="flex-1 flex flex-col justify-between space-y-2">
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-slate-300">
                        Observação / Legenda Individual:
                      </label>
                      <textarea
                        rows={3}
                        value={foto.legenda}
                        onChange={(e) => handleUpdateLegenda(foto.id, e.target.value)}
                        placeholder="Ex: Luminária instalada fora do alinhamento previsto..."
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none transition-colors"
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span>{foto.legenda ? `${foto.legenda.length} caracteres` : 'Sem legenda'}</span>
                      <button
                        type="button"
                        onClick={() => setLightboxIndex(index)}
                        className="text-sky-400 hover:text-sky-300 font-semibold flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Ver ampliada</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {photoToDelete && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5 max-w-sm w-full shadow-2xl">
            <h3 className="text-base font-bold text-slate-100 mb-2">
              Excluir Foto {String(photoToDelete.numero).padStart(2, '0')}?
            </h3>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              Esta ação removerá a imagem e sua legenda desta inspeção. As fotos restantes serão renumeradas automaticamente.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPhotoToDelete(null)}
                className="flex-1 py-2.5 bg-slate-800 text-slate-300 text-xs font-semibold rounded-xl hover:bg-slate-700"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="flex-1 py-2.5 bg-rose-600 text-white text-xs font-bold rounded-xl hover:bg-rose-500"
              >
                Confirmar Exclusão
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Lightbox */}
      {lightboxIndex !== null && (
        <PhotoLightbox
          photos={fotos}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onPrev}
          className="py-3 px-5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold flex items-center gap-1.5 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar</span>
        </button>

        <button
          type="button"
          onClick={onNext}
          className="py-3.5 px-6 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-sky-950 transition-all active:scale-98 cursor-pointer"
        >
          <span>PRÓXIMA ETAPA: RESPONSÁVEL</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
