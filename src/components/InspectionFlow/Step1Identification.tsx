import React from 'react';
import { Building, ArrowRight } from 'lucide-react';
import { DEFAULT_TEAMS, DEFAULT_SITES } from '../../utils/storage';

interface Step1Props {
  obra: string;
  equipe: string;
  tecnicoResponsavel: string;
  local: string;
  onChange: (fields: Partial<{ obra: string; equipe: string; tecnicoResponsavel: string; local: string }>) => void;
  onNext: () => void;
}

export const Step1Identification: React.FC<Step1Props> = ({
  obra,
  equipe,
  tecnicoResponsavel,
  local,
  onChange,
  onNext,
}) => {
  const isValid = obra.trim() !== '' && equipe.trim() !== '' && tecnicoResponsavel.trim() !== '' && local.trim() !== '';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isValid) {
      onNext();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-xl mx-auto space-y-6">
      <div className="bg-[#0A1D3D] border border-[#12346B] rounded-none p-5 sm:p-6 shadow-xl space-y-5">
        <div className="border-b border-[#12346B] pb-4">
          <div className="flex items-center gap-2.5 text-[#FFFFFF] font-bold text-xs uppercase tracking-wider mb-1">
            <Building className="w-4 h-4" />
            <span>ETAPA 1</span>
          </div>
          <h2 className="text-xl font-extrabold text-[#FFFFFF]">
            IDENTIFICAÇÃO DA INSPEÇÃO
          </h2>
          <p className="text-xs text-[#A7B0C2] mt-1">
            Informe os dados básicos de identificação do local e da equipe em campo.
          </p>
        </div>

        {/* Campo: OBRA */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-[#FFFFFF] uppercase tracking-wider">
            Obra <span className="text-[#FFFFFF]">*</span>
          </label>
          <div className="relative">
            <input
              type="text"
              required
              value={obra}
              onChange={(e) => onChange({ obra: e.target.value })}
              placeholder="Ex: Subestação Norte, Linha LT-230kV..."
              className="w-full bg-[#0F1726] border border-[#12346B] rounded-none px-4 py-3 text-[#FFFFFF] placeholder-[#A7B0C2]/50 text-sm focus:outline-none focus:ring-1 focus:ring-[#FFFFFF] transition-all"
            />
          </div>
          {/* Quick suggestions */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            <span className="text-[11px] text-[#A7B0C2] mr-1 self-center">Sugestões:</span>
            {DEFAULT_SITES.slice(0, 3).map((site) => (
              <button
                type="button"
                key={site}
                onClick={() => onChange({ obra: site })}
                className="text-[11px] bg-[#12346B] hover:bg-[#12346B]/80 text-[#FFFFFF] px-2 py-0.5 rounded-none border border-[#A7B0C2]/30 transition-colors cursor-pointer"
              >
                {site.split(' - ')[0]}
              </button>
            ))}
          </div>
        </div>

        {/* Campo: EQUIPE */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-[#FFFFFF] uppercase tracking-wider">
            Equipe <span className="text-[#FFFFFF]">*</span>
          </label>
          <div className="relative">
            <input
              type="text"
              required
              value={equipe}
              onChange={(e) => onChange({ equipe: e.target.value })}
              placeholder="Ex: EBP01, EQUIPE-ALFA..."
              className="w-full bg-[#0F1726] border border-[#12346B] rounded-none px-4 py-3 text-[#FFFFFF] placeholder-[#A7B0C2]/50 text-sm focus:outline-none focus:ring-1 focus:ring-[#FFFFFF] transition-all"
            />
          </div>
          {/* Quick suggestions for teams */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            <span className="text-[11px] text-[#A7B0C2] mr-1 self-center">Atalhos:</span>
            {DEFAULT_TEAMS.map((team) => (
              <button
                type="button"
                key={team}
                onClick={() => onChange({ equipe: team })}
                className={`text-[11px] px-2 py-0.5 rounded-none border transition-colors cursor-pointer ${
                  equipe === team
                    ? 'bg-[#12346B] border-[#FFFFFF] text-[#FFFFFF] font-bold'
                    : 'bg-[#12346B] hover:bg-[#12346B]/80 text-[#FFFFFF] border-[#A7B0C2]/30'
                }`}
              >
                {team}
              </button>
            ))}
          </div>
        </div>

        {/* Campo: TÉCNICO RESPONSÁVEL */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-[#FFFFFF] uppercase tracking-wider">
            Técnico Responsável <span className="text-[#FFFFFF]">*</span>
          </label>
          <div className="relative">
            <input
              type="text"
              required
              value={tecnicoResponsavel}
              onChange={(e) => onChange({ tecnicoResponsavel: e.target.value })}
              placeholder="Nome completo do técnico em campo"
              className="w-full bg-[#0F1726] border border-[#12346B] rounded-none px-4 py-3 text-[#FFFFFF] placeholder-[#A7B0C2]/50 text-sm focus:outline-none focus:ring-1 focus:ring-[#FFFFFF] transition-all"
            />
          </div>
        </div>

        {/* Campo: LOCAL */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-[#FFFFFF] uppercase tracking-wider">
            Local Específico <span className="text-[#FFFFFF]">*</span>
          </label>
          <div className="relative">
            <input
              type="text"
              required
              value={local}
              onChange={(e) => onChange({ local: e.target.value })}
              placeholder="Ex: Sala Elétrica 03, Poste P-44, Torre 12..."
              className="w-full bg-[#0F1726] border border-[#12346B] rounded-none px-4 py-3 text-[#FFFFFF] placeholder-[#A7B0C2]/50 text-sm focus:outline-none focus:ring-1 focus:ring-[#FFFFFF] transition-all"
            />
          </div>
        </div>
      </div>

      {/* Action Next Step */}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={!isValid}
          className={`w-full sm:w-auto min-w-[200px] py-3.5 px-6 rounded-none font-bold text-sm flex items-center justify-center gap-2 shadow-md transition-all ${
            isValid
              ? 'bg-[#12346B] hover:bg-[#12346B]/80 text-[#FFFFFF] border border-[#A7B0C2]/30 cursor-pointer active:scale-98'
              : 'bg-[#12346B]/40 text-[#A7B0C2]/50 cursor-not-allowed border border-[#12346B]/40'
          }`}
        >
          <span>PRÓXIMA ETAPA: TIPO</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </form>
  );
};
