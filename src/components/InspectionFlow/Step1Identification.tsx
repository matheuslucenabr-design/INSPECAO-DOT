import React from 'react';
import { Building, Users, UserCheck, MapPin, ArrowRight } from 'lucide-react';
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
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-5">
        <div className="border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5 text-sky-400 font-bold text-xs uppercase tracking-wider mb-1">
            <Building className="w-4 h-4" />
            <span>ETAPA 1</span>
          </div>
          <h2 className="text-xl font-extrabold text-slate-100">
            IDENTIFICAÇÃO DA INSPEÇÃO
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Informe os dados básicos de identificação do local e da equipe em campo.
          </p>
        </div>

        {/* Campo: OBRA */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider">
            Obra <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <input
              type="text"
              required
              value={obra}
              onChange={(e) => onChange({ obra: e.target.value })}
              placeholder="Ex: Subestação Norte, Linha LT-230kV..."
              className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all"
            />
          </div>
          {/* Quick suggestions */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            <span className="text-[11px] text-slate-400 mr-1 self-center">Sugestões:</span>
            {DEFAULT_SITES.slice(0, 3).map((site) => (
              <button
                type="button"
                key={site}
                onClick={() => onChange({ obra: site })}
                className="text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-0.5 rounded border border-slate-700 transition-colors"
              >
                {site.split(' - ')[0]}
              </button>
            ))}
          </div>
        </div>

        {/* Campo: EQUIPE */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider">
            Equipe <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <input
              type="text"
              required
              value={equipe}
              onChange={(e) => onChange({ equipe: e.target.value })}
              placeholder="Ex: EBP01, EQUIPE-ALFA..."
              className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all"
            />
          </div>
          {/* Quick suggestions for teams */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            <span className="text-[11px] text-slate-400 mr-1 self-center">Atalhos:</span>
            {DEFAULT_TEAMS.map((team) => (
              <button
                type="button"
                key={team}
                onClick={() => onChange({ equipe: team })}
                className={`text-[11px] px-2 py-0.5 rounded border transition-colors ${
                  equipe === team
                    ? 'bg-sky-600 border-sky-500 text-white font-semibold'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                }`}
              >
                {team}
              </button>
            ))}
          </div>
        </div>

        {/* Campo: TÉCNICO RESPONSÁVEL */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider">
            Técnico Responsável <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <input
              type="text"
              required
              value={tecnicoResponsavel}
              onChange={(e) => onChange({ tecnicoResponsavel: e.target.value })}
              placeholder="Nome completo do técnico em campo"
              className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all"
            />
          </div>
        </div>

        {/* Campo: LOCAL */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider">
            Local Específico <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <input
              type="text"
              required
              value={local}
              onChange={(e) => onChange({ local: e.target.value })}
              placeholder="Ex: Sala Elétrica 03, Poste P-44, Torre 12..."
              className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all"
            />
          </div>
        </div>
      </div>

      {/* Action Next Step */}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={!isValid}
          className={`w-full sm:w-auto min-w-[200px] py-3.5 px-6 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition-all ${
            isValid
              ? 'bg-sky-600 hover:bg-sky-500 text-white shadow-sky-950 cursor-pointer active:scale-98'
              : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50'
          }`}
        >
          <span>PRÓXIMA ETAPA: TIPO</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </form>
  );
};
