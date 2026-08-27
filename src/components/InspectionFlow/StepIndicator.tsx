import React from 'react';
import { InspectionStep } from '../../types/inspection';
import { Building, Layers, Camera, UserCheck, MapPin, CheckCircle2 } from 'lucide-react';

interface StepIndicatorProps {
  currentStep: InspectionStep;
  onSelectStep: (step: InspectionStep) => void;
  maxStepReached: number;
}

export const StepIndicator: React.FC<StepIndicatorProps> = ({
  currentStep,
  onSelectStep,
  maxStepReached,
}) => {
  const steps = [
    { number: 1 as InspectionStep, label: 'Identificação', shortLabel: 'Identif.', icon: Building },
    { number: 2 as InspectionStep, label: 'Tipo', shortLabel: 'Tipo', icon: Layers },
    { number: 3 as InspectionStep, label: 'Fotos', shortLabel: 'Fotos', icon: Camera },
    { number: 4 as InspectionStep, label: 'Responsável', shortLabel: 'Resp.', icon: UserCheck },
    { number: 5 as InspectionStep, label: 'Localização', shortLabel: 'Local', icon: MapPin },
    { number: 6 as InspectionStep, label: 'Revisão', shortLabel: 'Revisão', icon: CheckCircle2 },
  ];

  if (currentStep === 7) return null;

  return (
    <div className="w-full bg-[#0A1D3D] border-b border-[#12346B] py-3 px-4 sticky top-16 z-30 shadow-md">
      <div className="max-w-4xl mx-auto">
        {/* Mobile Step Header */}
        <div className="flex items-center justify-between mb-2 sm:hidden">
          <span className="text-xs font-bold text-[#FFFFFF] uppercase tracking-wider">
            ETAPA {currentStep} DE 6
          </span>
          <span className="text-xs font-semibold text-[#FFFFFF]">
            {steps[currentStep - 1]?.label}
          </span>
        </div>

        {/* Progress Bar Container */}
        <div className="grid grid-cols-6 gap-1.5 sm:gap-2">
          {steps.map((s) => {
            const Icon = s.icon;
            const isActive = currentStep === s.number;
            const isCompleted = currentStep > s.number;
            const isClickable = s.number <= maxStepReached;

            return (
              <button
                key={s.number}
                type="button"
                disabled={!isClickable}
                onClick={() => isClickable && onSelectStep(s.number)}
                className={`flex flex-col items-center gap-1 py-1.5 px-1 rounded-none transition-all text-center border ${
                  isActive
                    ? 'bg-[#12346B] border-[#FFFFFF] text-[#FFFFFF] font-bold shadow-sm'
                    : isCompleted
                    ? 'bg-[#12346B]/60 border-[#12346B] text-[#FFFFFF] hover:bg-[#12346B] cursor-pointer'
                    : 'bg-[#0F1726] border-[#12346B]/40 text-[#A7B0C2]/50 cursor-not-allowed'
                }`}
              >
                <div className="flex items-center justify-center">
                  <Icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isActive ? 'text-[#FFFFFF]' : isCompleted ? 'text-[#FFFFFF]' : 'text-[#A7B0C2]/50'}`} />
                </div>
                <span className="text-[10px] sm:text-xs leading-none whitespace-nowrap truncate max-w-full">
                  <span className="hidden sm:inline">{s.label}</span>
                  <span className="sm:hidden">{s.shortLabel}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
