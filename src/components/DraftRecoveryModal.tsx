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
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-100">
              Inspeção em Andamento Encontrada
            </h3>
            <p className="text-xs text-slate-400">
              Recuperação automática de dados salvos
            </p>
          </div>
        </div>

        <p className="text-sm text-slate-300 mb-4 leading-relaxed">
          Identificamos um rascunho salvo no seu dispositivo. Deseja continuar o preenchimento de onde parou?
        </p>

        {/* Draft Summary Details */}
        <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-4 mb-6 space-y-2 text-xs">
          <div className="flex items-center justify-between text-slate-300">
            <span className="flex items-center gap-1.5 text-slate-400">
              <Building className="w-3.5 h-3.5 text-sky-400" /> Obra:
            </span>
            <span className="font-semibold text-slate-200 text-right truncate max-w-[180px]">
              {draft.obra || 'Não informada'}
            </span>
          </div>

          <div className="flex items-center justify-between text-slate-300">
            <span className="flex items-center gap-1.5 text-slate-400">
              <MapPin className="w-3.5 h-3.5 text-emerald-400" /> Local:
            </span>
            <span className="font-semibold text-slate-200 text-right truncate max-w-[180px]">
              {draft.local || 'Não informado'}
            </span>
          </div>

          <div className="flex items-center justify-between text-slate-300">
            <span className="flex items-center gap-1.5 text-slate-400">
              <Clock className="w-3.5 h-3.5 text-amber-400" /> Atualização:
            </span>
            <span className="font-semibold text-slate-300">
              {draft.dataCriacao || 'Recentemente'}
            </span>
          </div>

          {draft.fotos && draft.fotos.length > 0 && (
            <div className="flex items-center justify-between text-slate-300 pt-1 border-t border-slate-700/60">
              <span className="text-slate-400">Fotos salvas:</span>
              <span className="font-bold text-sky-400">
                {draft.fotos.length} foto(s)
              </span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        {!showConfirmDiscard ? (
          <div className="flex flex-col sm:flex-row gap-2.5">
            <button
              onClick={onContinue}
              className="flex-1 py-3 px-4 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-sky-950 transition-colors"
            >
              <span>CONTINUAR INSPEÇÃO</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowConfirmDiscard(true)}
              className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-rose-950/60 border border-slate-700 hover:border-rose-800 text-slate-300 hover:text-rose-300 font-semibold text-sm transition-colors flex items-center justify-center gap-1.5"
            >
              <Trash2 className="w-4 h-4" />
              <span>Descartar</span>
            </button>
          </div>
        ) : (
          <div className="bg-rose-950/40 border border-rose-800/80 rounded-xl p-3 text-center space-y-3">
            <p className="text-xs font-semibold text-rose-300">
              Tem certeza que deseja apagar permanentemente este rascunho?
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowConfirmDiscard(false)}
                className="flex-1 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
              >
                Voltar
              </button>
              <button
                onClick={onDiscard}
                className="flex-1 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold"
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
