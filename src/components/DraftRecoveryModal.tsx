import React, { useState } from 'react';
import { AlertCircle, Clock, MapPin, Building, Trash2, ArrowRight } from 'lucide-react';
import { Inspection } from '../types/inspection';

interface DraftRecoveryModalProps {
  draft: Partial<Inspection>;
  onContinue: () => void;
  onDiscard: () => void;
}

export const DraftRecoveryModal: React.FC<DraftRecoveryModalProps> = ({
  draft,
  onContinue,
  onDiscard,
}) => {
  const [showConfirmDiscard, setShowConfirmDiscard] = useState(false);

  return (
    <div className="fixed inset-0 z-50 bg-[#0F1726]/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-[#0A1D3D] border border-[#12346B] max-w-md w-full p-4 sm:p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center gap-2.5 mb-3.5">
          <div className="w-8 h-8 bg-[#12346B] border border-[#12346B] flex items-center justify-center text-[#FFFFFF] font-bold">
            <AlertCircle className="w-5 h-5 text-[#FFFFFF]" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-[#FFFFFF]">
              Inspeção em Andamento Encontrada
            </h3>
            <p className="text-[10px] sm:text-xs text-[#A7B0C2]">
              Recuperação automática de dados salvos
            </p>
          </div>
        </div>

        <p className="text-xs sm:text-sm text-[#FFFFFF] mb-3.5 leading-relaxed">
          Identificamos um rascunho salvo no seu dispositivo. Deseja continuar o preenchimento de onde parou?
        </p>

        {/* Draft Summary Details */}
        <div className="bg-[#0F1726] border border-[#12346B] p-3 sm:p-4 mb-4 space-y-2 text-xs">
          <div className="flex items-center justify-between text-[#FFFFFF]">
            <span className="flex items-center gap-1.5 text-[#A7B0C2]">
              <Building className="w-3.5 h-3.5 text-[#FFFFFF]" /> Obra:
            </span>
            <span className="font-semibold text-[#FFFFFF] text-right truncate max-w-[180px]">
              {draft.obra || 'Não informada'}
            </span>
          </div>

          <div className="flex items-center justify-between text-[#FFFFFF]">
            <span className="flex items-center gap-1.5 text-[#A7B0C2]">
              <MapPin className="w-3.5 h-3.5 text-emerald-400" /> Local:
            </span>
            <span className="font-semibold text-[#FFFFFF] text-right truncate max-w-[180px]">
              {draft.local || 'Não informado'}
            </span>
          </div>

          <div className="flex items-center justify-between text-[#FFFFFF]">
            <span className="flex items-center gap-1.5 text-[#A7B0C2]">
              <Clock className="w-3.5 h-3.5 text-[#FFFFFF]" /> Atualização:
            </span>
            <span className="font-semibold text-[#A7B0C2]">
              {draft.dataCriacao || 'Recentemente'}
            </span>
          </div>

          {draft.fotos && draft.fotos.length > 0 && (
            <div className="flex items-center justify-between text-[#FFFFFF] pt-1 border-t border-[#12346B]">
              <span className="text-[#A7B0C2]">Fotos salvas:</span>
              <span className="font-bold text-[#FFFFFF]">
                {draft.fotos.length} foto(s)
              </span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        {!showConfirmDiscard ? (
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={onContinue}
              className="flex-1 py-2.5 px-3.5 bg-[#12346B] hover:bg-[#12346B]/80 text-[#FFFFFF] font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-colors cursor-pointer border border-[#A7B0C2]/30"
            >
              <span>CONTINUAR INSPEÇÃO</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setShowConfirmDiscard(true)}
              className="py-2.5 px-3.5 bg-[#0F1726] hover:bg-rose-950/60 border border-[#A7B0C2]/30 hover:border-rose-800 text-[#FFFFFF] hover:text-rose-300 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Descartar</span>
            </button>
          </div>
        ) : (
          <div className="bg-[#0F1726] border border-rose-800 p-3 text-center space-y-2.5">
            <p className="text-xs font-semibold text-rose-300">
              Tem certeza que deseja apagar permanentemente este rascunho?
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowConfirmDiscard(false)}
                className="flex-1 py-2 bg-[#12346B] hover:bg-[#12346B]/80 text-[#FFFFFF] text-xs font-semibold cursor-pointer border border-[#A7B0C2]/30"
              >
                Voltar
              </button>
              <button
                onClick={onDiscard}
                className="flex-1 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold cursor-pointer"
              >
                Sim, descartar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
