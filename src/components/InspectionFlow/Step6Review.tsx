import React, { useState } from 'react';
import { CheckCircle2, AlertTriangle, Send, ArrowLeft, Lock, Sparkles } from 'lucide-react';
import { InspectionPhoto, GPSLocation } from '../../types/inspection';

interface Step6Props {
  formData: {
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
  };
  onSubmit: () => Promise<void>;
  onPrev: () => void;
  onJumpToStep: (step: number) => void;
}

export const Step6Review: React.FC<Step6Props> = ({
  formData,
  onSubmit,
  onPrev,
  onJumpToStep,
}) => {
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Validation rules
  const checklist = [
    {
      id: 'obra',
      label: 'Obra',
      step: 1,
      value: formData.obra,
      isComplete: formData.obra.trim().length > 0,
      required: true,
    },
    {
      id: 'equipe',
      label: 'Equipe',
      step: 1,
      value: formData.equipe,
      isComplete: formData.equipe.trim().length > 0,
      required: true,
    },
    {
      id: 'tecnico',
      label: 'Técnico Responsável',
      step: 1,
      value: formData.tecnicoResponsavel,
      isComplete: formData.tecnicoResponsavel.trim().length > 0,
      required: true,
    },
    {
      id: 'local',
      label: 'Local Específico',
      step: 1,
      value: formData.local,
      isComplete: formData.local.trim().length > 0,
      required: true,
    },
    {
      id: 'tipo',
      label: 'Tipo de Inspeção',
      step: 2,
      value: formData.tipoInspecao,
      isComplete: formData.tipoInspecao.trim().length > 0,
      required: true,
    },
    {
      id: 'fotos',
      label: 'Fotografias',
      step: 3,
      value: `${formData.fotos.length}/15 fotos`,
      isComplete: formData.fotos.length > 0,
      required: false,
      warningText: formData.fotos.length === 0 ? 'Nenhuma foto anexada' : undefined,
    },
    {
      id: 'responsavel',
      label: 'Responsável',
      step: 4,
      value: formData.responsavel,
      isComplete: formData.responsavel.trim().length > 0,
      required: true,
    },
    {
      id: 'observacao',
      label: 'Observação Geral',
      step: 4,
      value: formData.observacaoGeral ? 'Preenchido' : 'Sem observações adicionais',
      isComplete: true,
      required: false,
    },
    {
      id: 'localizacao',
      label: 'Localização GPS',
      step: 5,
      value: formData.localizacao && !formData.localizacao.semGps ? 'Coordenadas registradas' : 'Não registrada (dispensada)',
      isComplete: !!formData.localizacao,
      required: false,
      warningText: (!formData.localizacao || formData.localizacao.semGps) ? 'Sem GPS' : undefined,
    },
  ];

  const pendingRequired = checklist.filter((item) => item.required && !item.isComplete);
  const canSubmit = pendingRequired.length === 0;

  const handleFinalSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onSubmit();
    } catch (err) {
      console.error(err);
      setIsSubmitting(false);
      setShowConfirmModal(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="bg-[#0A1D3D] border border-[#12346B] rounded-none p-5 sm:p-6 shadow-xl space-y-5">
        <div className="border-b border-[#12346B] pb-4">
          <div className="flex items-center gap-2.5 text-[#FFFFFF] font-bold text-xs uppercase tracking-wider mb-1">
            <CheckCircle2 className="w-4 h-4" />
            <span>ETAPA 6</span>
          </div>
          <h2 className="text-xl font-extrabold text-[#FFFFFF]">
            REVISÃO E VALIDAÇÃO DA INSPEÇÃO
          </h2>
          <p className="text-xs text-[#A7B0C2] mt-1">
            Verifique o resumo de todas as informações antes do envio definitivo.
          </p>
        </div>

        {/* Pending Items Warning */}
        {!canSubmit && (
          <div className="bg-rose-950/80 border border-rose-800 rounded-none p-4 text-xs space-y-2">
            <div className="flex items-center gap-2 text-rose-300 font-bold">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              <span>Não é possível enviar a inspeção. Informações obrigatórias pendentes:</span>
            </div>
            <ul className="list-disc list-inside text-rose-200 pl-1 space-y-1">
              {pendingRequired.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => onJumpToStep(item.step)}
                    className="underline hover:text-white font-semibold cursor-pointer"
                  >
                    {item.label} (Ir para Etapa {item.step})
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Review Table */}
        <div className="divide-y divide-[#12346B] border border-[#12346B] rounded-none overflow-hidden bg-[#0F1726]">
          {checklist.map((item) => (
            <div
              key={item.id}
              className="p-3.5 flex items-center justify-between gap-3 text-xs hover:bg-[#12346B]/40 transition-colors"
            >
              <div className="flex items-center gap-2.5 min-w-[140px]">
                <span className="font-bold text-[#FFFFFF]">{item.label}</span>
                {item.required && <span className="text-[#FFFFFF] font-bold">*</span>}
              </div>

              <div className="flex-1 text-right truncate text-[#FFFFFF]">
                <span className="text-[#A7B0C2]">{item.value || '-'}</span>
              </div>

              <div className="shrink-0 flex items-center gap-2">
                {item.isComplete && !item.warningText ? (
                  <span className="px-2 py-0.5 rounded-none bg-[#0A1D3D] border border-[#12346B] text-[#FFFFFF] font-bold text-[11px] flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-[#FFFFFF]" /> Preenchido
                  </span>
                ) : item.warningText ? (
                  <span className="px-2 py-0.5 rounded-none bg-[#0A1D3D] border border-[#12346B] text-[#A7B0C2] font-semibold text-[11px]">
                    {item.warningText}
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => onJumpToStep(item.step)}
                    className="px-2 py-0.5 rounded-none bg-rose-950/80 border border-rose-800 text-rose-300 font-bold text-[11px] hover:bg-rose-900 cursor-pointer"
                  >
                    Pendente
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => onJumpToStep(item.step)}
                  className="text-[#A7B0C2] hover:text-[#FFFFFF] text-[11px] underline ml-1 cursor-pointer"
                >
                  Editar
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Summary Details Card */}
        <div className="bg-[#0F1726] border border-[#12346B] rounded-none p-4 space-y-2 text-xs text-[#FFFFFF]">
          <div className="flex justify-between">
            <span className="text-[#A7B0C2]">Total de Fotografias Anexadas:</span>
            <span className="font-bold text-[#FFFFFF]">{formData.fotos.length} fotos</span>
          </div>
          {formData.localizacao && !formData.localizacao.semGps && (
            <div className="flex justify-between">
              <span className="text-[#A7B0C2]">Georreferenciamento:</span>
              <span className="font-semibold text-[#FFFFFF]">
                {formData.localizacao.latitude.toFixed(4)}°, {formData.localizacao.longitude.toFixed(4)}°
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 bg-[#0F1726]/80 flex items-center justify-center p-4">
          <div className="bg-[#0A1D3D] border border-[#12346B] rounded-none p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-none bg-[#12346B] border border-[#12346B] flex items-center justify-center text-[#FFFFFF]">
                <Send className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#FFFFFF]">
                  Enviar Inspeção?
                </h3>
                <p className="text-xs text-[#A7B0C2]">
                  Validação e gravação definitiva
                </p>
              </div>
            </div>

            <p className="text-sm text-[#A7B0C2] leading-relaxed">
              Após o envio, este registro será armazenado na base de dados como <strong className="text-[#FFFFFF]">inspeção concluída</strong> e disponibilizado para relatórios em PDF e Excel.
            </p>

            <div className="bg-[#0F1726] rounded-none p-3.5 border border-[#12346B] text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-[#A7B0C2]">Obra:</span>
                <span className="font-semibold text-[#FFFFFF]">{formData.obra}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#A7B0C2]">Equipe:</span>
                <span className="font-semibold text-[#FFFFFF]">{formData.equipe}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#A7B0C2]">Fotos:</span>
                <span className="font-semibold text-[#FFFFFF]">{formData.fotos.length} fotos</span>
              </div>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 py-3 bg-[#12346B] hover:bg-[#12346B]/80 text-[#FFFFFF] text-sm font-semibold rounded-none border border-[#A7B0C2]/30 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleFinalSubmit}
                className="flex-1 py-3 bg-[#12346B] hover:bg-[#12346B]/80 text-[#FFFFFF] text-sm font-bold rounded-none border border-[#A7B0C2]/30 shadow-md flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Sparkles className="w-4 h-4 animate-spin" />
                    <span>ENVIANDO...</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>CONFIRMAR ENVIO</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Action Submit */}
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
          disabled={!canSubmit || isSubmitting}
          onClick={() => setShowConfirmModal(true)}
          className={`py-3.5 px-8 rounded-none font-bold text-sm flex items-center justify-center gap-2 shadow-md transition-all ${
            canSubmit && !isSubmitting
              ? 'bg-[#12346B] hover:bg-[#12346B]/80 text-[#FFFFFF] border border-[#A7B0C2]/30 cursor-pointer active:scale-98'
              : 'bg-[#12346B]/40 text-[#A7B0C2]/50 cursor-not-allowed border border-[#12346B]/40'
          }`}
        >
          <Send className="w-4 h-4" />
          <span>ENVIAR INSPEÇÃO</span>
        </button>
      </div>
    </div>
  );
};
