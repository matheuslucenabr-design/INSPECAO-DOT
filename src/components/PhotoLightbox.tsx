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
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/80 to-transparent z-10">
        <div className="flex items-center gap-3">
          <span className="px-2.5 py-1 rounded-md bg-sky-600 font-bold text-white text-xs">
            Foto {String(currentIndex + 1).padStart(2, '0')} de {String(photos.length).padStart(2, '0')}
          </span>
          {currentPhoto.dataUpload && (
            <span className="hidden sm:flex items-center gap-1 text-slate-400 text-xs">
              <Calendar className="w-3.5 h-3.5" />
              {currentPhoto.dataUpload}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsZoomed(!isZoomed)}
            className="p-2 rounded-full bg-slate-800/80 text-slate-200 hover:text-white hover:bg-slate-700 transition-colors"
            title={isZoomed ? 'Reduzir zoom' : 'Ampliar zoom'}
          >
            {isZoomed ? <ZoomOut className="w-5 h-5" /> : <ZoomIn className="w-5 h-5" />}
          </button>
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-slate-800/80 text-slate-200 hover:text-white hover:bg-rose-600 transition-colors"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Image Center Area */}
      <div className="relative flex-1 flex items-center justify-center p-2 sm:p-6 overflow-hidden">
        {/* Prev Arrow */}
        {photos.length > 1 && (
          <button
            onClick={handlePrev}
            className="hidden sm:flex absolute left-4 z-20 p-3 rounded-full bg-black/60 text-white hover:bg-sky-600 transition-colors border border-white/10"
            title="Foto anterior"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}

        <img
          src={currentPhoto.dataUrl}
          alt={`Foto ${currentPhoto.numero} da inspeção`}
          className={`max-w-full max-h-[75vh] object-contain rounded-lg transition-transform duration-200 cursor-pointer ${
            isZoomed ? 'scale-150 cursor-zoom-out' : 'cursor-zoom-in'
          }`}
          onClick={() => setIsZoomed(!isZoomed)}
        />

        {/* Next Arrow */}
        {photos.length > 1 && (
          <button
            onClick={handleNext}
            className="hidden sm:flex absolute right-4 z-20 p-3 rounded-full bg-black/60 text-white hover:bg-sky-600 transition-colors border border-white/10"
            title="Próxima foto"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        )}
      </div>

      {/* Bottom Info Bar: Caption */}
      <div className="bg-gradient-to-t from-black via-black/90 to-transparent p-4 sm:p-6 z-10">
        <div className="max-w-3xl mx-auto bg-slate-900/90 border border-slate-800 rounded-xl p-4 text-left">
          <div className="flex items-center gap-2 mb-1.5 text-sky-400 text-xs font-semibold uppercase tracking-wider">
            <Tag className="w-3.5 h-3.5" />
            <span>Legenda da Fotografia</span>
          </div>
          <p className="text-slate-100 text-sm sm:text-base leading-relaxed">
            {currentPhoto.legenda && currentPhoto.legenda.trim()
              ? currentPhoto.legenda
              : 'Nenhuma legenda registrada para esta fotografia.'}
          </p>
        </div>
      </div>
    </div>
  );
};
