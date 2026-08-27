import React, { useState, useEffect, useRef } from 'react';
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Calendar, Tag } from 'lucide-react';
import { InspectionPhoto } from '../types/inspection';

interface PhotoLightboxProps {
  photos: InspectionPhoto[];
  initialIndex: number;
  onClose: () => void;
}

export const PhotoLightbox: React.FC<PhotoLightboxProps> = ({
  photos,
  initialIndex,
  onClose,
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isZoomed, setIsZoomed] = useState(false);
  const touchStartX = useRef<number | null>(null);

  const currentPhoto = photos[currentIndex];

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === 'ArrowLeft') handlePrev();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, photos.length]);

  const handlePrev = () => {
    setIsZoomed(false);
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : photos.length - 1));
  };

  const handleNext = () => {
    setIsZoomed(false);
    setCurrentIndex((prev) => (prev < photos.length - 1 ? prev + 1 : 0));
  };

  // Touch handlers for mobile swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const deltaX = touchEndX - touchStartX.current;

    if (Math.abs(deltaX) > 45) {
      if (deltaX > 0) {
        handlePrev();
      } else {
        handleNext();
      }
    }
    touchStartX.current = null;
  };

  if (!currentPhoto) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/95 flex flex-col justify-between select-none animate-in fade-in duration-200"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Top Bar */}
      <div className="flex items-center justify-between px-3 sm:px-4 py-2 sm:py-3 bg-[#0A1D3D] border-b border-[#12346B] z-10">
        <div className="flex items-center gap-2 sm:gap-3">
          <span className="px-2 py-0.5 bg-[#12346B] font-bold text-[#FFFFFF] text-[11px] sm:text-xs border border-[#12346B]">
            Foto {String(currentIndex + 1).padStart(2, '0')} de {String(photos.length).padStart(2, '0')}
          </span>
          {currentPhoto.dataUpload && (
            <span className="hidden sm:flex items-center gap-1 text-[#A7B0C2] text-xs">
              <Calendar className="w-3.5 h-3.5" />
              {currentPhoto.dataUpload}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setIsZoomed(!isZoomed)}
            className="p-1.5 sm:p-2 bg-[#12346B] text-[#FFFFFF] hover:bg-[#12346B]/80 transition-colors cursor-pointer border border-[#A7B0C2]/30"
            title={isZoomed ? 'Reduzir zoom' : 'Ampliar zoom'}
          >
            {isZoomed ? <ZoomOut className="w-4 h-4 sm:w-5 sm:h-5" /> : <ZoomIn className="w-4 h-4 sm:w-5 sm:h-5" />}
          </button>
          <button
            onClick={onClose}
            className="p-1.5 sm:p-2 bg-[#12346B] text-[#FFFFFF] hover:bg-rose-600 transition-colors cursor-pointer border border-[#A7B0C2]/30"
            title="Fechar"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
      </div>

      {/* Main Image Center Area */}
      <div className="relative flex-1 flex items-center justify-center p-2 sm:p-6 overflow-hidden">
        {/* Prev Arrow */}
        {photos.length > 1 && (
          <button
            onClick={handlePrev}
            className="hidden sm:flex absolute left-4 z-20 p-2.5 bg-[#0A1D3D]/80 text-[#FFFFFF] hover:bg-[#12346B] transition-colors border border-[#12346B] cursor-pointer"
            title="Foto anterior"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}

        <img
          src={currentPhoto.dataUrl}
          alt={`Foto ${currentPhoto.numero} da inspeção`}
          className={`max-w-full max-h-[75vh] object-contain border border-[#12346B] transition-transform duration-200 cursor-pointer ${
            isZoomed ? 'scale-150 cursor-zoom-out' : 'cursor-zoom-in'
          }`}
          onClick={() => setIsZoomed(!isZoomed)}
        />

        {/* Next Arrow */}
        {photos.length > 1 && (
          <button
            onClick={handleNext}
            className="hidden sm:flex absolute right-4 z-20 p-2.5 bg-[#0A1D3D]/80 text-[#FFFFFF] hover:bg-[#12346B] transition-colors border border-[#12346B] cursor-pointer"
            title="Próxima foto"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Bottom Info Bar: Caption */}
      <div className="bg-[#0A1D3D] border-t border-[#12346B] p-3 sm:p-5 z-10">
        <div className="max-w-3xl mx-auto bg-[#0F1726] border border-[#12346B] p-2.5 sm:p-3.5 text-left">
          <div className="flex items-center gap-1.5 mb-1 text-[#FFFFFF] text-[11px] font-semibold uppercase tracking-wider">
            <Tag className="w-3 h-3" />
            <span>Legenda</span>
          </div>
          <p className="text-[#FFFFFF] text-xs sm:text-sm leading-relaxed">
            {currentPhoto.legenda && currentPhoto.legenda.trim()
              ? currentPhoto.legenda
              : 'Nenhuma legenda registrada para esta fotografia.'}
          </p>
        </div>
      </div>
    </div>
  );
};
