import React, { useState } from 'react';
import { Layers, ArrowLeft, ArrowRight, Plus, CheckCircle, Sparkles } from 'lucide-react';
import { getStoredInspectionTypes, saveCustomInspectionType } from '../../utils/storage';

interface Step2Props {
  tipoInspecao: string;
  onChange: (tipo: string) => void;
  onNext: () => void;
  onPrev: () => void;
}

export const Step2Type: React.FC<Step2Props> = ({
  tipoInspecao,
  onChange,
  onNext,
  onPrev,
}) => {
  const [types, setTypes] = useState<string[]>(getStoredInspectionTypes());
  const [showNewTypeModal, setShowNewTypeModal] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');

  const handleSelect = (type: string) => {
    onChange(type);
  };

  const handleAddType = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTypeName.trim()) {
      const updated = saveCustomInspectionType(newTypeName.trim());
      setTypes(updated);
      onChange(newTypeName.trim());
      setNewTypeName('');
      setShowNewTypeModal(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-5">
        <div className="border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5 text-sky-400 font-bold text-xs uppercase tracking-wider mb-1">
            <Layers className="w-4 h-4" />
            <span>ETAPA 2</span>
          </div>
          <h2 className="text-xl font-extrabold text-slate-100">
            TIPO DE INSPEÇÃO
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Selecione a categoria técnica correspondente ao serviço realizado.
          </p>
        </div>

        {/* Options Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {types.map((type) => {
            const isSelected = tipoInspecao === type;
            return (
              <button
                type="button"
                key={type}
                onClick={() => handleSelect(type)}
                className={`p-4 rounded-xl border text-left transition-all flex items-start justify-between gap-2 touch-manipulation ${
                  isSelected
                    ? 'bg-sky-950/60 border-sky-500 ring-2 ring-sky-500/30 text-white shadow-md'
                    : 'bg-slate-800/80 border-slate-700/80 text-slate-300 hover:bg-slate-800 hover:border-slate-600 hover:text-white'
                }`}
              >
                <div>
                  <p className="font-bold text-sm leading-tight">{type}</p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    {type.includes('Pós-Serviço')
                      ? 'Validação de conclusão e entrega'
                      : type.includes('Luminárias')
                      ? 'Iluminação pública e postes'
                      : type.includes('Redes')
                      ? 'Distribuição MT/BT e cabos'
                      : type.includes('5S')
                      ? 'Organização, limpeza e segurança'
                      : 'Procedimento operacional padrão'}
                  </p>
                </div>
                {isSelected && (
                  <CheckCircle className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
                )}
              </button>
            );
          })}
        </div>

        {/* Add custom type trigger */}
        <div className="pt-2">
          <button
            type="button"
            onClick={() => setShowNewTypeModal(true)}
            className="w-full py-2.5 px-4 rounded-xl border border-dashed border-slate-700 hover:border-sky-500 bg-slate-800/40 hover:bg-sky-950/20 text-slate-400 hover:text-sky-300 text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Cadastrar Novo Tipo de Inspeção</span>
          </button>
        </div>
      </div>

      {/* Modal to add custom type */}
      {showNewTypeModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5 max-w-sm w-full shadow-2xl">
            <h3 className="text-base font-bold text-slate-100 mb-1">
              Novo Tipo de Inspeção
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Adicione um tipo que ficará disponível em todas as inspeções futuras.
            </p>
            <form onSubmit={handleAddType} className="space-y-4">
              <input
                type="text"
                autoFocus
                required
                value={newTypeName}
                onChange={(e) => setNewTypeName(e.target.value)}
                placeholder="Ex: Inspeção Termográfica"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewTypeModal(false)}
                  className="flex-1 py-2 bg-slate-800 text-slate-300 text-xs font-semibold rounded-lg hover:bg-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-sky-600 text-white text-xs font-bold rounded-lg hover:bg-sky-500"
                >
                  Salvar Tipo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
          type="button"
          disabled={!tipoInspecao}
          onClick={onNext}
          className={`py-3.5 px-6 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition-all ${
            tipoInspecao
              ? 'bg-sky-600 hover:bg-sky-500 text-white shadow-sky-950 cursor-pointer active:scale-98'
              : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50'
          }`}
        >
          <span>PRÓXIMA ETAPA: FOTOS</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
