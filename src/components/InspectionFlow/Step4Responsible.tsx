import React from 'react';
import { UserCheck, FileText, ArrowLeft, ArrowRight } from 'lucide-react';

interface Step4Props {
  responsavel: string;
  matricula: string;
  observacaoGeral: string;
  tecnicoResponsavel: string;
  onChange: (fields: Partial<{ responsavel: string; matricula: string; observacaoGeral: string }>) => void;
  onNext: () => void;
  onPrev: () => void;
}

export const Step4Responsible: React.FC<Step4Props> = ({
  responsavel,
  matricula,
  observacaoGeral,
  tecnicoResponsavel,
  onChange,
  onNext,
  onPrev,
}) => {
  const isValid = responsavel.trim() !== '';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isValid) {
      onNext();
    }
  };

  const handleCopyTecnico = () => {
    if (tecnicoResponsavel) {
      onChange({ responsavel: tecnicoResponsavel });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-xl mx-auto space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-5">
        <div className="border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5 text-sky-400 font-bold text-xs uppercase tracking-wider mb-1">
            <UserCheck className="w-4 h-4" />
            <span>ETAPA 4</span>
          </div>
          <h2 className="text-xl font-extrabold text-slate-100">
            RESPONSÁVEL & OBSERVAÇÕES GERAIS
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Indique o responsável pela validação da inspeção e anotações complementares.
          </p>
        </div>

        {/* Campo: Responsável */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider">
              Responsável pela Inspeção <span className="text-rose-500">*</span>
            </label>
            {tecnicoResponsavel && tecnicoResponsavel !== responsavel && (
              <button
                type="button"
                onClick={handleCopyTecnico}
                className="text-[11px] text-sky-400 hover:text-sky-300 font-semibold"
              >
                Usar técnico ({tecnicoResponsavel})
              </button>
            )}
          </div>
          <input
            type="text"
            required
            value={responsavel}
            onChange={(e) => onChange({ responsavel: e.target.value })}
            placeholder="Nome do responsável técnico ou supervisor"
            className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>

        {/* Campo: Matrícula / Identificação */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider">
            Matrícula / Registro Profissional (Opcional)
          </label>
          <input
            type="text"
            value={matricula}
            onChange={(e) => onChange({ matricula: e.target.value })}
            placeholder="Ex: TEC-8890, CREA/CFT 12345..."
            className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>

        {/* Campo: Observação Geral */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider">
            Observação Geral da Inspeção
          </label>
          <textarea
            rows={4}
            value={observacaoGeral}
            onChange={(e) => onChange({ observacaoGeral: e.target.value })}
            placeholder="Digite aqui considerações gerais sobre as condições encontradas, pendências ou liberações de serviço..."
            className="w-full bg-slate-800/90 border border-slate-700 rounded-xl p-3.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 resize-y min-h-[100px]"
          />
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onPrev}
          className="py-3 px-5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold flex items-center gap-1.5 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar</span>
        </button>

        <button
          type="submit"
          disabled={!isValid}
          className={`py-3.5 px-6 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition-all ${
            isValid
              ? 'bg-sky-600 hover:bg-sky-500 text-white shadow-sky-950 cursor-pointer active:scale-98'
              : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50'
          }`}
        >
          <span>PRÓXIMA ETAPA: LOCALIZAÇÃO</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </form>
  );
};
