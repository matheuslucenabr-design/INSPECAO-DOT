import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Sparkles,
  Database,
  Cloud,
  Layers,
  Camera,
  ShieldCheck,
} from 'lucide-react';
import { Inspection } from '../types/inspection';

interface SubmissionLoadingModalProps {
  inspection: Partial<Inspection>;
  isOpen: boolean;
  currentStepIndex: number;
  totalSteps?: number;
  stepMessage?: string;
}

export const SUBMISSION_STEPS = [
  {
    id: 1,
    title: 'Validação e Registro dos Dados',
    description: 'Formatando protocolo, obra, equipe e georreferenciamento.',
    icon: Layers,
  },
  {
    id: 2,
    title: 'Processamento de Evidências Fotográficas',
    description: 'Otimizando e indexando fotografias anexadas.',
    icon: Camera,
  },
  {
    id: 3,
    title: 'Gravação no Banco Seguro (IndexedDB)',
    description: 'Armazenando cópia local para operação offline e relatórios.',
    icon: Database,
  },
  {
    id: 4,
    title: 'Sincronização Multiplataforma (Servidor & Nuvem)',
    description: 'Transmitindo dados para acesso compartilhado em tempo real.',
    icon: Cloud,
  },
  {
    id: 5,
    title: 'Conclusão e Emissão do Protocolo',
    description: 'Inspeção confirmada e pronta para geração de PDF/Excel.',
    icon: ShieldCheck,
  },
];

export const SubmissionLoadingModal: React.FC<SubmissionLoadingModalProps> = ({
  inspection,
  isOpen,
  currentStepIndex,
  stepMessage,
}) => {
  const [smoothProgress, setSmoothProgress] = useState(15);

  useEffect(() => {
    if (!isOpen) {
      setSmoothProgress(15);
      return;
    }

    // Map step index (0 to 4) to percentage (20% to 100%)
    const targetProgress = Math.min(100, Math.max(20, ((currentStepIndex + 1) / SUBMISSION_STEPS.length) * 100));
    setSmoothProgress(targetProgress);
  }, [isOpen, currentStepIndex]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#0F1726]/85 backdrop-blur-sm flex items-center justify-center p-3.5 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-[#0A1D3D] border border-[#12346B] rounded-none p-5 sm:p-7 max-w-lg w-full shadow-2xl space-y-5">
        {/* Header with animated icon */}
        <div className="flex items-center gap-3.5 border-b border-[#12346B] pb-4">
          <div className="w-11 h-11 bg-[#12346B] border border-[#12346B] flex items-center justify-center text-[#FFFFFF] shrink-0">
            <Sparkles className="w-6 h-6 animate-spin text-emerald-400" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[10px] sm:text-xs font-bold text-emerald-400 uppercase tracking-widest block">
              Processando Envio
            </span>
            <h3 className="text-base sm:text-lg font-black text-[#FFFFFF] tracking-tight truncate">
              REGISTRANDO INSPEÇÃO TÉCNICA
            </h3>
          </div>
          <span className="font-mono text-xs font-bold text-[#FFFFFF] bg-[#0F1726] px-2.5 py-1 border border-[#12346B]">
            {Math.round(smoothProgress)}%
          </span>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1.5">
          <div className="w-full bg-[#0F1726] border border-[#12346B] h-2.5 p-0.5 overflow-hidden">
            <div
              className="h-full bg-emerald-500 transition-all duration-300 ease-out"
              style={{ width: `${smoothProgress}%` }}
            />
          </div>
          <p className="text-[11px] text-[#A7B0C2] truncate">
            {stepMessage || SUBMISSION_STEPS[currentStepIndex]?.description || 'Gravando informações com segurança...'}
          </p>
        </div>

        {/* Step-by-Step Status Checklist */}
        <div className="bg-[#0F1726] border border-[#12346B] divide-y divide-[#12346B]/60 text-xs">
          {SUBMISSION_STEPS.map((step, idx) => {
            const Icon = step.icon;
            const isFinished = idx < currentStepIndex;
            const isCurrent = idx === currentStepIndex;

            return (
              <div
                key={step.id}
                className={`p-2.5 sm:p-3 flex items-center gap-3 transition-colors ${
                  isCurrent
                    ? 'bg-[#12346B]/40 text-[#FFFFFF]'
                    : isFinished
                    ? 'text-[#FFFFFF]'
                    : 'text-[#A7B0C2]/50'
                }`}
              >
                <div className="shrink-0">
                  {isFinished ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : isCurrent ? (
                    <Sparkles className="w-4 h-4 text-emerald-400 animate-spin" />
                  ) : (
                    <Icon className="w-4 h-4 text-[#A7B0C2]/40" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className={`font-bold ${isCurrent ? 'text-[#FFFFFF]' : isFinished ? 'text-[#FFFFFF]' : 'text-[#A7B0C2]/60'}`}>
                      {step.title}
                    </span>
                    {isCurrent && (
                      <span className="text-[10px] uppercase font-bold text-emerald-400 animate-pulse">
                        Em andamento
                      </span>
                    )}
                    {isFinished && (
                      <span className="text-[10px] text-emerald-400 font-semibold">
                        OK
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Inspection Summary Pill */}
        <div className="bg-[#0F1726] border border-[#12346B] p-3 text-[11px] space-y-1">
          <div className="flex justify-between text-[#A7B0C2]">
            <span>Obra:</span>
            <span className="font-semibold text-[#FFFFFF] truncate max-w-[200px]">
              {inspection.obra || 'Não informada'}
            </span>
          </div>
          <div className="flex justify-between text-[#A7B0C2]">
            <span>Equipe:</span>
            <span className="font-semibold text-[#FFFFFF] truncate max-w-[200px]">
              {inspection.equipe || 'Não informada'}
            </span>
          </div>
          <div className="flex justify-between text-[#A7B0C2]">
            <span>Evidências Fotográficas:</span>
            <span className="font-semibold text-[#FFFFFF]">
              {inspection.fotos?.length || 0} fotos anexadas
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
