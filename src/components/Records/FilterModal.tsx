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
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-slate-900 border border-slate-700 w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl max-h-[90vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom-5 sm:zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-600/20 text-sky-400 flex items-center justify-center">
              <Filter className="w-4 h-4" />
            </div>
            <h3 className="font-extrabold text-base sm:text-lg text-slate-100">
              Filtros Avançados
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleApply} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-xs">
          {/* Período */}
          <div className="space-y-1.5">
            <label className="block font-bold text-slate-300 uppercase tracking-wider">
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
                  className={`py-2 px-2 rounded-lg border font-semibold text-center transition-colors ${
                    filters.periodo === p.id
                      ? 'bg-sky-600 border-sky-500 text-white'
                      : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Custom Dates */}
            {filters.periodo === 'personalizado' && (
              <div className="grid grid-cols-2 gap-2 pt-2">
                <div>
                  <span className="text-[10px] text-slate-400 block mb-1">Data Início:</span>
                  <input
                    type="date"
                    value={filters.dataInicio || ''}
                    onChange={(e) => setFilters({ ...filters, dataInicio: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-slate-100"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block mb-1">Data Fim:</span>
                  <input
                    type="date"
                    value={filters.dataFim || ''}
                    onChange={(e) => setFilters({ ...filters, dataFim: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-slate-100"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Tipo de Inspeção */}
          <div className="space-y-1.5">
            <label className="block font-bold text-slate-300 uppercase tracking-wider">
              Tipo de Inspeção
            </label>
            <select
              value={filters.tipoInspecao || ''}
              onChange={(e) => setFilters({ ...filters, tipoInspecao: e.target.value || undefined })}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
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
          <div className="space-y-1.5">
            <label className="block font-bold text-slate-300 uppercase tracking-wider">
              Obra
            </label>
            <input
              type="text"
              value={filters.obra || ''}
              onChange={(e) => setFilters({ ...filters, obra: e.target.value || undefined })}
              placeholder="Filtrar por nome da obra..."
              className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-slate-100 placeholder-slate-500"
            />
          </div>

          {/* Equipe */}
          <div className="space-y-1.5">
            <label className="block font-bold text-slate-300 uppercase tracking-wider">
              Equipe
            </label>
            <input
              type="text"
              value={filters.equipe || ''}
              onChange={(e) => setFilters({ ...filters, equipe: e.target.value || undefined })}
              placeholder="Filtrar por equipe..."
              className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-slate-100 placeholder-slate-500"
            />
          </div>

          {/* Técnico / Responsável */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <label className="block font-bold text-slate-300 uppercase tracking-wider">
                Técnico
              </label>
              <input
                type="text"
                value={filters.tecnico || ''}
                onChange={(e) => setFilters({ ...filters, tecnico: e.target.value || undefined })}
                placeholder="Nome do técnico..."
                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-slate-100 placeholder-slate-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block font-bold text-slate-300 uppercase tracking-wider">
                Responsável
              </label>
              <input
                type="text"
                value={filters.responsavel || ''}
                onChange={(e) => setFilters({ ...filters, responsavel: e.target.value || undefined })}
                placeholder="Responsável..."
                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-slate-100 placeholder-slate-500"
              />
            </div>
          </div>
        </form>

        {/* Actions Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-800 flex gap-2.5">
          <button
            type="button"
            onClick={handleReset}
            className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>LIMPAR FILTROS</span>
          </button>

          <button
            type="button"
            onClick={(e) => handleApply(e)}
            className="flex-1 py-3 px-4 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shadow-lg shadow-sky-950 transition-colors"
          >
            APLICAR FILTROS
          </button>
        </div>
      </div>
    </div>
  );
};
