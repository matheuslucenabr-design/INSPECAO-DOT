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
    <div className="w-full bg-slate-900 border-b border-slate-800 py-3 px-4 sticky top-16 z-30 shadow-md">
      <div className="max-w-4xl mx-auto">
        {/* Mobile Step Header */}
        <div className="flex items-center justify-between mb-2 sm:hidden">
          <span className="text-xs font-bold text-sky-400 uppercase tracking-wider">
            ETAPA {currentStep} DE 6
          </span>
          <span className="text-xs font-semibold text-slate-300">
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
                className={`flex flex-col items-center gap-1 py-1.5 px-1 rounded-lg transition-all text-center ${
                  isActive
                    ? 'bg-sky-600 text-white font-bold shadow-sm ring-2 ring-sky-400/40'
                    : isCompleted
                    ? 'bg-slate-800 text-slate-200 hover:bg-slate-700/80 cursor-pointer'
                    : 'bg-slate-800/40 text-slate-500 cursor-not-allowed'
                }`}
              >
                <div className="flex items-center justify-center">
                  <Icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isActive ? 'text-white' : isCompleted ? 'text-sky-400' : 'text-slate-500'}`} />
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
