import React from 'react';
import { UserCheck, ArrowLeft, ArrowRight } from 'lucide-react';

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
      <div className="bg-[#0A1D3D] border border-[#12346B] rounded-none p-5 sm:p-6 shadow-xl space-y-5">
        <div className="border-b border-[#12346B] pb-4">
          <div className="flex items-center gap-2.5 text-[#FFFFFF] font-bold text-xs uppercase tracking-wider mb-1">
            <UserCheck className="w-4 h-4" />
            <span>ETAPA 4</span>
          </div>
          <h2 className="text-xl font-extrabold text-[#FFFFFF]">
            RESPONSÁVEL & OBSERVAÇÕES GERAIS
          </h2>
          <p className="text-xs text-[#A7B0C2] mt-1">
            Indique o responsável pela validação da inspeção e anotações complementares.
          </p>
        </div>

        {/* Campo: Responsável */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold text-[#FFFFFF] uppercase tracking-wider">
              Responsável pela Inspeção <span className="text-[#FFFFFF]">*</span>
            </label>
            {tecnicoResponsavel && tecnicoResponsavel !== responsavel && (
              <button
                type="button"
                onClick={handleCopyTecnico}
                className="text-[11px] text-[#FFFFFF] hover:underline font-semibold cursor-pointer"
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
            className="w-full bg-[#0F1726] border border-[#12346B] rounded-none px-4 py-3 text-[#FFFFFF] placeholder-[#A7B0C2]/50 text-sm focus:outline-none focus:ring-1 focus:ring-[#FFFFFF] transition-all"
          />
        </div>

        {/* Campo: Matrícula / Identificação */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-[#FFFFFF] uppercase tracking-wider">
            Matrícula / Registro Profissional <span className="text-[#A7B0C2] font-normal">(Opcional)</span>
          </label>
          <input
            type="text"
            value={matricula}
            onChange={(e) => onChange({ matricula: e.target.value })}
            placeholder="Ex: TEC-8890, CREA/CFT 12345..."
            className="w-full bg-[#0F1726] border border-[#12346B] rounded-none px-4 py-3 text-[#FFFFFF] placeholder-[#A7B0C2]/50 text-sm focus:outline-none focus:ring-1 focus:ring-[#FFFFFF] transition-all"
          />
        </div>

        {/* Campo: Observação Geral */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-[#FFFFFF] uppercase tracking-wider">
            Observação Geral da Inspeção
          </label>
          <textarea
            rows={4}
            value={observacaoGeral}
            onChange={(e) => onChange({ observacaoGeral: e.target.value })}
            placeholder="Digite aqui considerações gerais sobre as condições encontradas, pendências ou liberações de serviço..."
            className="w-full bg-[#0F1726] border border-[#12346B] rounded-none p-3.5 text-sm text-[#FFFFFF] placeholder-[#A7B0C2]/50 focus:outline-none focus:ring-1 focus:ring-[#FFFFFF] resize-y min-h-[100px] transition-all"
          />
        </div>
      </div>

      {/* Navigation Buttons */}
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
          type="submit"
          disabled={!isValid}
          className={`py-3.5 px-6 rounded-none font-bold text-sm flex items-center justify-center gap-2 shadow-md transition-all ${
            isValid
              ? 'bg-[#12346B] hover:bg-[#12346B]/80 text-[#FFFFFF] border border-[#A7B0C2]/30 cursor-pointer active:scale-98'
              : 'bg-[#12346B]/40 text-[#A7B0C2]/50 cursor-not-allowed border border-[#12346B]/40'
          }`}
        >
          <span>PRÓXIMA ETAPA: LOCALIZAÇÃO</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </form>
  );
};
