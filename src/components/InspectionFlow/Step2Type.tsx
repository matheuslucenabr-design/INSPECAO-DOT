import React, { useState } from 'react';
import { Layers, ArrowLeft, ArrowRight, Plus, CheckCircle } from 'lucide-react';
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
      <div className="bg-[#0A1D3D] border border-[#12346B] rounded-none p-5 sm:p-6 shadow-xl space-y-5">
        <div className="border-b border-[#12346B] pb-4">
          <div className="flex items-center gap-2.5 text-[#FFFFFF] font-bold text-xs uppercase tracking-wider mb-1">
            <Layers className="w-4 h-4" />
            <span>ETAPA 2</span>
          </div>
          <h2 className="text-xl font-extrabold text-[#FFFFFF]">
            TIPO DE INSPEÇÃO
          </h2>
          <p className="text-xs text-[#A7B0C2] mt-1">
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
                className={`p-4 rounded-none border text-left transition-all flex items-start justify-between gap-2 touch-manipulation cursor-pointer ${
                  isSelected
                    ? 'bg-[#0F1726] border-[#FFFFFF] text-[#FFFFFF] shadow-md'
                    : 'bg-[#12346B]/40 border-[#12346B] text-[#FFFFFF] hover:bg-[#12346B]'
                }`}
              >
                <div>
                  <p className="font-bold text-sm leading-tight text-[#FFFFFF]">{type}</p>
                  <p className="text-[11px] text-[#A7B0C2] mt-1">
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
                  <CheckCircle className="w-5 h-5 text-[#FFFFFF] shrink-0 mt-0.5" />
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
            className="w-full py-2.5 px-4 rounded-none border border-dashed border-[#12346B] hover:border-[#12346B] bg-[#0F1726] hover:bg-[#0A1D3D] text-[#A7B0C2] hover:text-[#FFFFFF] text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Cadastrar Novo Tipo de Inspeção</span>
          </button>
        </div>
      </div>

      {/* Modal to add custom type */}
      {showNewTypeModal && (
        <div className="fixed inset-0 z-50 bg-[#0F1726]/80 flex items-center justify-center p-4">
          <div className="bg-[#0A1D3D] border border-[#12346B] rounded-none p-5 max-w-sm w-full shadow-2xl">
            <h3 className="text-base font-bold text-[#FFFFFF] mb-1">
              Novo Tipo de Inspeção
            </h3>
            <p className="text-xs text-[#A7B0C2] mb-4">
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
                className="w-full bg-[#0F1726] border border-[#12346B] rounded-none px-3.5 py-2.5 text-sm text-[#FFFFFF] placeholder-[#A7B0C2]/50 focus:outline-none focus:ring-1 focus:ring-[#FFFFFF]"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewTypeModal(false)}
                  className="flex-1 py-2 bg-[#12346B] text-[#FFFFFF] text-xs font-semibold rounded-none border border-[#A7B0C2]/30 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-[#12346B] hover:bg-[#12346B]/80 text-[#FFFFFF] text-xs font-bold rounded-none border border-[#A7B0C2]/30 cursor-pointer"
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
          className="py-3 px-5 rounded-none bg-[#12346B] hover:bg-[#12346B]/80 text-[#FFFFFF] text-sm font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-[#A7B0C2]/30"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar</span>
        </button>

        <button
          type="button"
          disabled={!tipoInspecao}
          onClick={onNext}
          className={`py-3.5 px-6 rounded-none font-bold text-sm flex items-center justify-center gap-2 shadow-md transition-all ${
            tipoInspecao
              ? 'bg-[#12346B] hover:bg-[#12346B]/80 text-[#FFFFFF] border border-[#A7B0C2]/30 cursor-pointer active:scale-98'
              : 'bg-[#12346B]/40 text-[#A7B0C2]/50 cursor-not-allowed border border-[#12346B]/40'
          }`}
        >
          <span>PRÓXIMA ETAPA: FOTOS</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
