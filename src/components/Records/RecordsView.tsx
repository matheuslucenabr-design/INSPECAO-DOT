import React, { useState, useMemo, useRef } from 'react';
import {
  Search,
  Filter,
  LayoutGrid,
  List,
  Download,
  Plus,
  FolderArchive,
  Database,
  Upload,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { Inspection, FilterOptions } from '../../types/inspection';
import { RecordCard } from './RecordCard';
import { RecordTable } from './RecordTable';
import { FilterModal } from './FilterModal';
import { RecordDetailModal } from './RecordDetailModal';
import { generateBulkInspectionsExcel } from '../../utils/exportExcel';
import { exportDatabaseBackup, importDatabaseBackup } from '../../utils/storage';

interface RecordsViewProps {
  inspections: Inspection[];
  onNewInspection: () => void;
  onDeleteInspection: (id: string) => void;
  onReloadInspections?: () => void;
}

export const RecordsView: React.FC<RecordsViewProps> = ({
  inspections,
  onNewInspection,
  onDeleteInspection,
  onReloadInspections,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [selectedInspection, setSelectedInspection] = useState<Inspection | null>(null);
  const [isBulkExporting, setIsBulkExporting] = useState(false);
  const [backupMessage, setBackupMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [filters, setFilters] = useState<FilterOptions>({
    periodo: 'todos',
  });

  // Calculate Metrics
  const stats = useMemo(() => {
    const total = inspections.length;
    const now = new Date();
    const todayStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
    const thisMonthStr = `/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;

    const hoje = inspections.filter(
      (i) => (i.dataEnvio || i.dataCriacao || '').startsWith(todayStr)
    ).length;

    const esteMes = inspections.filter(
      (i) => (i.dataEnvio || i.dataCriacao || '').includes(thisMonthStr)
    ).length;

    const concluidas = inspections.filter((i) => i.status === 'concluida').length;
    const emAndamento = inspections.filter((i) => i.status === 'rascunho' || i.status === 'processando').length;

    return { total, hoje, esteMes, concluidas, emAndamento };
  }, [inspections]);

  // Unique lists for filters
  const availableSites = useMemo(() => {
    return Array.from(new Set(inspections.map((i) => i.obra).filter(Boolean)));
  }, [inspections]);

  const availableTeams = useMemo(() => {
    return Array.from(new Set(inspections.map((i) => i.equipe).filter(Boolean)));
  }, [inspections]);

  // Active filter count
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.periodo !== 'todos') count++;
    if (filters.tipoInspecao) count++;
    if (filters.obra) count++;
    if (filters.equipe) count++;
    if (filters.tecnico) count++;
    if (filters.responsavel) count++;
    return count;
  }, [filters]);

  // Filter & Search Logic
  const filteredInspections = useMemo(() => {
    return inspections.filter((insp) => {
      // 1. Text Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesQuery =
          insp.id.toLowerCase().includes(q) ||
          insp.obra.toLowerCase().includes(q) ||
          insp.equipe.toLowerCase().includes(q) ||
          insp.tecnicoResponsavel.toLowerCase().includes(q) ||
          insp.local.toLowerCase().includes(q) ||
          insp.responsavel.toLowerCase().includes(q) ||
          insp.tipoInspecao.toLowerCase().includes(q) ||
          (insp.observacaoGeral && insp.observacaoGeral.toLowerCase().includes(q)) ||
          (insp.dataEnvio && insp.dataEnvio.toLowerCase().includes(q)) ||
          (insp.dataCriacao && insp.dataCriacao.toLowerCase().includes(q));

        if (!matchesQuery) return false;
      }

      // 2. Type Filter
      if (filters.tipoInspecao && insp.tipoInspecao !== filters.tipoInspecao) {
        return false;
      }

      // 3. Obra Filter
      if (filters.obra && !insp.obra.toLowerCase().includes(filters.obra.toLowerCase())) {
        return false;
      }

      // 4. Equipe Filter
      if (filters.equipe && !insp.equipe.toLowerCase().includes(filters.equipe.toLowerCase())) {
        return false;
      }

      // 5. Técnico Filter
      if (filters.tecnico && !insp.tecnicoResponsavel.toLowerCase().includes(filters.tecnico.toLowerCase())) {
        return false;
      }

      // 6. Responsável Filter
      if (filters.responsavel && !insp.responsavel.toLowerCase().includes(filters.responsavel.toLowerCase())) {
        return false;
      }

      return true;
    });
  }, [inspections, searchQuery, filters]);

  const handleBulkExport = async () => {
    if (filteredInspections.length === 0) return;
    setIsBulkExporting(true);
    try {
      await generateBulkInspectionsExcel(filteredInspections);
    } finally {
      setIsBulkExporting(false);
    }
  };

  const handleBackupExport = () => {
    exportDatabaseBackup();
    setBackupMessage({
      type: 'success',
      text: 'Backup do banco de dados exportado com sucesso (.json)!',
    });
    setTimeout(() => setBackupMessage(null), 4000);
  };

  const handleBackupImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      const result = await importDatabaseBackup(content);
      if (result.success) {
        setBackupMessage({
          type: 'success',
          text: `Banco restaurado com sucesso! ${result.count} inspeções sincronizadas.`,
        });
        if (onReloadInspections) onReloadInspections();
      } else {
        setBackupMessage({
          type: 'error',
          text: result.error || 'Erro ao importar backup.',
        });
      }
      setTimeout(() => setBackupMessage(null), 5000);
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6 pb-24 md:pb-12">
      {/* Hidden file input for backup restore */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={handleBackupImportFile}
      />

      {/* Backup Feedback Message */}
      {backupMessage && (
        <div
          className={`p-3.5 rounded-2xl border text-xs flex items-center gap-2 animate-in fade-in duration-200 ${
            backupMessage.type === 'success'
              ? 'bg-emerald-950/90 border-emerald-800 text-emerald-200'
              : 'bg-rose-950/90 border-rose-800 text-rose-200'
          }`}
        >
          {backupMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          )}
          <span>{backupMessage.text}</span>
        </div>
      )}

      {/* Top Header & Metrics Summary */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-black text-slate-100 tracking-tight">
                REGISTROS DE INSPEÇÃO
              </h1>
              <span className="px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-800 text-emerald-400 text-[10px] font-bold flex items-center gap-1">
                <Database className="w-3 h-3" /> Firebase Firestore Ativo
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Consulte, filtre e exporte todas as inspeções salvas e sincronizadas na nuvem via Firebase Firestore.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleBackupExport}
              className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Baixar cópia de segurança de todos os registros do banco local"
            >
              <Database className="w-3.5 h-3.5 text-sky-400" />
              <span>Backup JSON</span>
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Restaurar registros a partir de um backup JSON"
            >
              <Upload className="w-3.5 h-3.5 text-indigo-400" />
              <span>Restaurar</span>
            </button>

            <button
              onClick={handleBulkExport}
              disabled={isBulkExporting || filteredInspections.length === 0}
              className="py-2.5 px-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              title="Exportar registros filtrados para planilha Excel única"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span>Exportar Excel</span>
            </button>

            <button
              onClick={onNewInspection}
              className="py-2.5 px-4 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-sky-950 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Nova Inspeção</span>
            </button>
          </div>
        </div>

        {/* Metric Chips Container */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
            <span className="text-xs text-slate-400 font-semibold uppercase">Total Geral</span>
            <div className="text-2xl font-black text-slate-100 mt-1">{stats.total}</div>
            <span className="text-[10px] text-slate-500">no banco local</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
            <span className="text-xs text-sky-400 font-semibold uppercase">Hoje</span>
            <div className="text-2xl font-black text-sky-400 mt-1">{stats.hoje}</div>
            <span className="text-[10px] text-slate-500">registradas hoje</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
            <span className="text-xs text-emerald-400 font-semibold uppercase">Este Mês</span>
            <div className="text-2xl font-black text-emerald-400 mt-1">{stats.esteMes}</div>
            <span className="text-[10px] text-slate-500">no mês corrente</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
            <span className="text-xs text-indigo-400 font-semibold uppercase">Concluídas</span>
            <div className="text-2xl font-black text-indigo-400 mt-1">{stats.concluidas}</div>
            <span className="text-[10px] text-slate-500">100% validadas</span>
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        {/* Real-time Search Input */}
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por ID, Obra, Equipe, Técnico, Local, Tipo..."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white"
            >
              ✕
            </button>
          )}
        </div>

        {/* Filter & View Mode Controls */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          {/* Filter button */}
          <button
            onClick={() => setShowFilterModal(true)}
            className={`py-2.5 px-3.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeFiltersCount > 0
                ? 'bg-sky-950/80 border-sky-500 text-sky-300'
                : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Filtros</span>
            {activeFiltersCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-sky-600 text-white font-bold text-[10px] flex items-center justify-center">
                {activeFiltersCount}
              </span>
            )}
          </button>

          {/* Table / Cards toggle (Desktop) */}
          <div className="hidden md:flex items-center bg-slate-900 border border-slate-800 rounded-xl p-1">
            <button
              onClick={() => setViewMode('cards')}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === 'cards' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
              title="Visualização em Cartões"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === 'table' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
              title="Visualização em Tabela"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Active Filter Chips */}
      {activeFiltersCount > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-slate-400 text-[11px]">Filtros ativos:</span>
          {filters.tipoInspecao && (
            <span className="px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700 flex items-center gap-1">
              Tipo: {filters.tipoInspecao}
            </span>
          )}
          {filters.obra && (
            <span className="px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700 flex items-center gap-1">
              Obra: {filters.obra}
            </span>
          )}
          {filters.equipe && (
            <span className="px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700 flex items-center gap-1">
              Equipe: {filters.equipe}
            </span>
          )}
          <button
            onClick={() => setFilters({ periodo: 'todos' })}
            className="text-sky-400 hover:text-sky-300 font-semibold underline text-[11px]"
          >
            Limpar todos
          </button>
        </div>
      )}

      {/* Results Count */}
      <div className="text-xs text-slate-400 font-medium">
        Exibindo {filteredInspections.length} de {inspections.length} inspeções
      </div>

      {/* Empty State */}
      {filteredInspections.length === 0 ? (
        <div className="border border-dashed border-slate-800 rounded-3xl p-12 text-center space-y-3 bg-slate-900/40">
          <div className="w-14 h-14 rounded-2xl bg-slate-800 text-slate-500 mx-auto flex items-center justify-center">
            <FolderArchive className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-200">
            Nenhuma inspeção encontrada
          </h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {searchQuery || activeFiltersCount > 0
              ? 'Tente ajustar sua busca ou limpar os filtros selecionados.'
              : 'Comece criando o primeiro registro de inspeção em campo.'}
          </p>
          {(searchQuery || activeFiltersCount > 0) && (
            <button
              onClick={() => {
                setSearchQuery('');
                setFilters({ periodo: 'todos' });
              }}
              className="py-2 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
            >
              Resetar busca e filtros
            </button>
          )}
        </div>
      ) : viewMode === 'table' ? (
        /* Desktop Table View */
        <RecordTable
          inspections={filteredInspections}
          onOpen={(insp) => setSelectedInspection(insp)}
          onDelete={onDeleteInspection}
        />
      ) : (
        /* Mobile & Desktop Cards Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredInspections.map((insp) => (
            <RecordCard
              key={insp.id}
              inspection={insp}
              onOpen={(i) => setSelectedInspection(i)}
              onDelete={onDeleteInspection}
            />
          ))}
        </div>
      )}

      {/* Filter Modal */}
      {showFilterModal && (
        <FilterModal
          currentFilters={filters}
          availableSites={availableSites}
          availableTeams={availableTeams}
          onApply={(newFilters) => {
            setFilters(newFilters);
            setShowFilterModal(false);
          }}
          onReset={() => setFilters({ periodo: 'todos' })}
          onClose={() => setShowFilterModal(false)}
        />
      )}

      {/* Detailed View Modal */}
      {selectedInspection && (
        <RecordDetailModal
          inspection={selectedInspection}
          onClose={() => setSelectedInspection(null)}
        />
      )}
    </div>
  );
};
