import React, { useState } from 'react';
import { X, Filter, RotateCcw, Calendar, Building, Users, Layers, MapPin } from 'lucide-react';
import { FilterOptions } from '../../types/inspection';
import { getStoredInspectionTypes, DEFAULT_TEAMS } from '../../utils/storage';

interface FilterModalProps {
  currentFilters: FilterOptions;
  availableSites: string[];
  availableTeams: string[];
  onApply: (filters: FilterOptions) => void;
  onReset: () => void;
  onClose: () => void;
}

export const FilterModal: React.FC<FilterModalProps> = ({
  currentFilters,
  availableSites,
  availableTeams,
  onApply,
  onReset,
  onClose,
}) => {
  const [filters, setFilters] = useState<FilterOptions>({ ...currentFilters });
  const inspectionTypes = getStoredInspectionTypes();

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    onApply(filters);
  };

  const handleReset = () => {
    onReset();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0F1726]/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-[#0A1D3D] border border-[#12346B] w-full sm:max-w-lg max-h-[90vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom-5 sm:zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-3.5 sm:p-5 border-b border-[#12346B]">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-[#12346B] text-[#FFFFFF] flex items-center justify-center border border-[#12346B]">
              <Filter className="w-3.5 h-3.5" />
            </div>
            <h3 className="font-extrabold text-sm sm:text-base text-[#FFFFFF]">
              Filtros Avançados
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#A7B0C2] hover:text-white hover:bg-[#12346B] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleApply} className="flex-1 overflow-y-auto p-3.5 sm:p-5 space-y-3 sm:space-y-4 text-xs">
          {/* Período */}
          <div className="space-y-1">
            <label className="block text-[11px] sm:text-xs font-bold text-[#A7B0C2] uppercase tracking-wider">
              Período
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { id: 'todos', label: 'Todos' },
                { id: 'hoje', label: 'Hoje' },
                { id: '7dias', label: '7 dias' },
                { id: '30dias', label: '30 dias' },
                { id: 'este_mes', label: 'Este mês' },
                { id: 'personalizado', label: 'Personalizado' },
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setFilters({ ...filters, periodo: p.id as any })}
                  className={`py-1.5 px-2 border font-semibold text-center text-xs transition-colors cursor-pointer ${
                    filters.periodo === p.id
                      ? 'bg-[#12346B] border-[#FFFFFF] text-[#FFFFFF] font-bold'
                      : 'bg-[#0F1726] border-[#12346B] text-[#A7B0C2] hover:bg-[#12346B] hover:text-[#FFFFFF]'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Custom Dates */}
            {filters.periodo === 'personalizado' && (
              <div className="grid grid-cols-2 gap-2 pt-1.5">
                <div>
                  <span className="text-[10px] text-[#A7B0C2] block mb-1">Data Início:</span>
                  <input
                    type="date"
                    value={filters.dataInicio || ''}
                    onChange={(e) => setFilters({ ...filters, dataInicio: e.target.value })}
                    className="w-full bg-[#0F1726] border border-[#12346B] p-1.5 text-xs text-[#FFFFFF]"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-[#A7B0C2] block mb-1">Data Fim:</span>
                  <input
                    type="date"
                    value={filters.dataFim || ''}
                    onChange={(e) => setFilters({ ...filters, dataFim: e.target.value })}
                    className="w-full bg-[#0F1726] border border-[#12346B] p-1.5 text-xs text-[#FFFFFF]"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Tipo de Inspeção */}
          <div className="space-y-1">
            <label className="block text-[11px] sm:text-xs font-bold text-[#A7B0C2] uppercase tracking-wider">
              Tipo de Inspeção
            </label>
            <select
              value={filters.tipoInspecao || ''}
              onChange={(e) => setFilters({ ...filters, tipoInspecao: e.target.value || undefined })}
              className="w-full bg-[#0F1726] border border-[#12346B] p-2 text-xs text-[#FFFFFF] focus:outline-none focus:ring-1 focus:ring-[#12346B]"
            >
              <option value="">Todos os tipos</option>
              {inspectionTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          {/* Obra */}
          <div className="space-y-1">
            <label className="block text-[11px] sm:text-xs font-bold text-[#A7B0C2] uppercase tracking-wider">
              Obra
            </label>
            <input
              type="text"
              value={filters.obra || ''}
              onChange={(e) => setFilters({ ...filters, obra: e.target.value || undefined })}
              placeholder="Filtrar por obra..."
              className="w-full bg-[#0F1726] border border-[#12346B] p-2 text-xs text-[#FFFFFF] placeholder-[#A7B0C2]/50"
            />
          </div>

          {/* Equipe */}
          <div className="space-y-1">
            <label className="block text-[11px] sm:text-xs font-bold text-[#A7B0C2] uppercase tracking-wider">
              Equipe
            </label>
            <input
              type="text"
              value={filters.equipe || ''}
              onChange={(e) => setFilters({ ...filters, equipe: e.target.value || undefined })}
              placeholder="Filtrar por equipe..."
              className="w-full bg-[#0F1726] border border-[#12346B] p-2 text-xs text-[#FFFFFF] placeholder-[#A7B0C2]/50"
            />
          </div>

          {/* Técnico / Responsável */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="block text-[11px] sm:text-xs font-bold text-[#A7B0C2] uppercase tracking-wider">
                Técnico
              </label>
              <input
                type="text"
                value={filters.tecnico || ''}
                onChange={(e) => setFilters({ ...filters, tecnico: e.target.value || undefined })}
                placeholder="Nome do técnico..."
                className="w-full bg-[#0F1726] border border-[#12346B] p-2 text-xs text-[#FFFFFF] placeholder-[#A7B0C2]/50"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] sm:text-xs font-bold text-[#A7B0C2] uppercase tracking-wider">
                Responsável
              </label>
              <input
                type="text"
                value={filters.responsavel || ''}
                onChange={(e) => setFilters({ ...filters, responsavel: e.target.value || undefined })}
                placeholder="Responsável..."
                className="w-full bg-[#0F1726] border border-[#12346B] p-2 text-xs text-[#FFFFFF] placeholder-[#A7B0C2]/50"
              />
            </div>
          </div>
        </form>

        {/* Actions Footer */}
        <div className="p-3 sm:p-4 border-t border-[#12346B] flex gap-2">
          <button
            type="button"
            onClick={handleReset}
            className="py-2.5 px-3 bg-[#12346B] hover:bg-[#12346B]/80 text-[#FFFFFF] border border-[#A7B0C2]/30 font-semibold text-xs flex items-center justify-center gap-1 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            <span>LIMPAR</span>
          </button>

          <button
            type="button"
            onClick={(e) => handleApply(e)}
            className="flex-1 py-2.5 px-4 bg-[#12346B] hover:bg-[#12346B]/80 text-[#FFFFFF] font-bold text-xs shadow-sm transition-colors cursor-pointer border border-[#A7B0C2]/30"
          >
            APLICAR FILTROS
          </button>
        </div>
      </div>
    </div>
  );
};
