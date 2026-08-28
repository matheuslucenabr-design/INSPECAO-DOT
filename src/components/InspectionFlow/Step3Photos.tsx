import React, { useRef, useState } from 'react';
import { Camera, Image as ImageIcon, Trash2, Eye, ArrowLeft, ArrowRight, Sparkles, AlertTriangle, X } from 'lucide-react';
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

  const handleFilesSelected = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setErrorMessage(null);

    const remainingSlots = MAX_PHOTOS - fotos.length;
    if (remainingSlots <= 0) {
      setErrorMessage('Limite de 15 fotografias atingido para esta inspeção.');
      return;
    }

    const filesToProcess = Array.from(files).slice(0, remainingSlots);
    if (files.length > remainingSlots) {
      setErrorMessage(`Apenas ${remainingSlots} foto(s) foram adicionadas para respeitar o limite máximo de 15.`);
    }

    setIsProcessing(true);
    const newPhotos: InspectionPhoto[] = [...fotos];

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
        console.error('Error processing image:', err);
      }
    }

    const reindexed = newPhotos.map((p, index) => ({
      ...p,
      numero: index + 1,
    }));

    onChange(reindexed);
    setIsProcessing(false);
    setProcessingProgress('');

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
      .map((p, index) => ({ ...p, numero: index + 1 }));
    onChange(updated);
    setPhotoToDelete(null);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Hidden file inputs */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => handleFilesSelected(e.target.files)}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleFilesSelected(e.target.files)}
      />

      <div className="bg-[#0A1D3D] border border-[#12346B] rounded-none p-5 sm:p-6 shadow-xl space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#12346B] pb-4">
          <div>
            <div className="flex items-center gap-2.5 text-[#FFFFFF] font-bold text-xs uppercase tracking-wider mb-1">
              <Camera className="w-4 h-4" />
              <span>ETAPA 3</span>
            </div>
            <h2 className="text-xl font-extrabold text-[#FFFFFF]">
              REGISTRO FOTOGRÁFICO
            </h2>
            <p className="text-xs text-[#A7B0C2] mt-0.5">
              Anexe fotos com câmera ou galeria (máximo 15 fotos).
            </p>
          </div>

          <div className="flex items-center gap-2 bg-[#0F1726] px-3.5 py-1.5 rounded-none border border-[#12346B] self-start sm:self-auto">
            <span className="text-xs text-[#A7B0C2]">Total:</span>
            <span className="text-sm font-bold text-[#FFFFFF]">
              {fotos.length}/{MAX_PHOTOS}
            </span>
          </div>
        </div>

        {/* Error banner */}
        {errorMessage && (
          <div className="bg-rose-950/80 border border-rose-800 text-rose-200 text-xs rounded-none p-3.5 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold">{errorMessage}</p>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-rose-400 hover:text-rose-200 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Processing Indicator */}
        {isProcessing && (
          <div className="bg-[#0F1726] border border-[#12346B] rounded-none p-4 text-center space-y-2">
            <div className="flex items-center justify-center gap-2 text-[#FFFFFF] font-semibold text-xs">
              <Sparkles className="w-4 h-4 animate-spin text-[#FFFFFF]" />
              <span>{processingProgress || 'Comprimindo e corrigindo orientações de imagem...'}</span>
            </div>
            <p className="text-[11px] text-[#A7B0C2]">
              Redimensionamento automático para 1920×1080px (82% JPEG).
            </p>
          </div>
        )}

        {/* Add Photo Action Buttons */}
        {fotos.length < MAX_PHOTOS && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <button
              type="button"
              disabled={isProcessing}
              onClick={() => cameraInputRef.current?.click()}
              className="py-4 px-4 rounded-none bg-[#12346B] hover:bg-[#12346B]/80 text-[#FFFFFF] font-bold text-sm flex items-center justify-center gap-2.5 shadow-md transition-all active:scale-98 cursor-pointer border border-[#A7B0C2]/30"
            >
              <Camera className="w-5 h-5 text-[#FFFFFF]" />
              <span>FOTO</span>
            </button>

            <button
              type="button"
              disabled={isProcessing}
              onClick={() => fileInputRef.current?.click()}
              className="py-4 px-4 rounded-none bg-[#0F1726] hover:bg-[#12346B] border border-[#A7B0C2]/30 text-[#FFFFFF] font-bold text-sm flex items-center justify-center gap-2.5 transition-all active:scale-98 cursor-pointer"
            >
              <ImageIcon className="w-5 h-5 text-[#FFFFFF]" />
              <span>GALERIA</span>
            </button>
          </div>
        )}

        {/* Maximum Photos reached badge */}
        {fotos.length >= MAX_PHOTOS && (
          <div className="bg-[#0F1726] border border-[#12346B] rounded-none p-3.5 text-center text-xs text-[#FFFFFF]">
            Limite máximo de 15 fotografias atingido para esta inspeção.
          </div>
        )}

        {/* Photos List */}
        {fotos.length === 0 ? (
          <div className="border-2 border-dashed border-[#12346B] rounded-none p-8 text-center space-y-2">
            <div className="w-12 h-12 rounded-none bg-[#0F1726] border border-[#12346B] text-[#A7B0C2] mx-auto flex items-center justify-center">
              <Camera className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-[#FFFFFF]">
              Nenhuma fotografia adicionada ainda
            </p>
            <p className="text-xs text-[#A7B0C2] max-w-sm mx-auto">
              Utilize os botões acima para fotografar o local ou anexar imagens da galeria (máx. 15 fotos).
            </p>
          </div>
        ) : (
          <div className="space-y-4 pt-2">
            {fotos.map((foto, index) => (
              <div
                key={foto.id}
                className="bg-[#0F1726] border border-[#12346B] rounded-none p-4 shadow-sm space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-none bg-[#0A1D3D] border border-[#12346B] text-[#FFFFFF] font-bold text-xs">
                      Foto {String(foto.numero).padStart(2, '0')} de {String(fotos.length).padStart(2, '0')}
                    </span>
                    <span className="text-[11px] text-[#A7B0C2]">
                      {foto.dataUpload} {foto.tamanhoKb ? `• ${foto.tamanhoKb} KB` : ''}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setPhotoToDelete(foto)}
                    className="p-1.5 rounded-none text-[#A7B0C2] hover:text-rose-400 hover:bg-rose-950/40 transition-colors cursor-pointer"
                    title="Excluir fotografia"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex flex-col sm:flex-row gap-3.5">
                  <div
                    onClick={() => setLightboxIndex(index)}
                    className="relative w-full sm:w-44 h-40 bg-[#0A1D3D] rounded-none overflow-hidden shrink-0 cursor-pointer group border border-[#12346B]"
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

                  <div className="flex-1 flex flex-col justify-between space-y-2">
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-[#FFFFFF]">
                        Observação / Legenda Individual:
                      </label>
                      <textarea
                        rows={3}
                        value={foto.legenda}
                        onChange={(e) => handleUpdateLegenda(foto.id, e.target.value)}
                        placeholder="Ex: Luminária instalada fora do alinhamento previsto..."
                        className="w-full bg-[#0A1D3D] border border-[#12346B] rounded-none p-2.5 text-xs text-[#FFFFFF] placeholder-[#A7B0C2]/50 focus:outline-none focus:ring-1 focus:ring-[#FFFFFF] resize-none"
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-[#A7B0C2]">
                      <span>{foto.legenda ? `${foto.legenda.length} caracteres` : 'Sem legenda'}</span>
                      <button
                        type="button"
                        onClick={() => setLightboxIndex(index)}
                        className="text-[#FFFFFF] hover:underline font-semibold flex items-center gap-1 cursor-pointer"
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
        <div className="fixed inset-0 z-50 bg-[#0F1726]/80 flex items-center justify-center p-4">
          <div className="bg-[#0A1D3D] border border-[#12346B] rounded-none p-5 max-w-sm w-full shadow-2xl">
            <h3 className="text-base font-bold text-[#FFFFFF] mb-2">
              Excluir Foto {String(photoToDelete.numero).padStart(2, '0')}?
            </h3>
            <p className="text-xs text-[#A7B0C2] mb-4 leading-relaxed">
              Esta ação removerá a imagem e sua legenda desta inspeção.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPhotoToDelete(null)}
                className="flex-1 py-2.5 bg-[#12346B] text-[#FFFFFF] text-xs font-semibold rounded-none border border-[#A7B0C2]/30 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-none cursor-pointer"
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
          className="py-3 px-5 rounded-none bg-[#12346B] hover:bg-[#12346B]/80 text-[#FFFFFF] text-sm font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-[#A7B0C2]/30"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar</span>
        </button>

        <button
          type="button"
          onClick={onNext}
          className="py-3.5 px-6 rounded-none bg-[#12346B] hover:bg-[#12346B]/80 text-[#FFFFFF] font-bold text-sm flex items-center justify-center gap-2 shadow-md transition-all active:scale-98 cursor-pointer border border-[#A7B0C2]/30"
        >
          <span>PRÓXIMA ETAPA: RESPONSÁVEL</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
