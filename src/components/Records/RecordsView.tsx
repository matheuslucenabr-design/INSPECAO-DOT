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
  RefreshCw,
  KeyRound,
} from 'lucide-react';
import { Inspection, FilterOptions } from '../../types/inspection';
import { RecordCard } from './RecordCard';
import { RecordTable } from './RecordTable';
import { FilterModal } from './FilterModal';
import { RecordDetailModal } from './RecordDetailModal';
import { generateBulkInspectionsExcel } from '../../utils/exportExcel';
import { exportDatabaseBackup, importDatabaseBackup, DEFAULT_ROOM_ID } from '../../utils/storage';

interface RecordsViewProps {
  inspections: Inspection[];
  onNewInspection: () => void;
  onDeleteInspection: (id: string) => void;
  onReloadInspections?: () => void;
  onSync?: () => void;
  isSyncing?: boolean;
  lastSyncTime?: string;
  isOnline?: boolean;
  activeRoom?: string;
  onOpenRoomModal?: () => void;
}

export const RecordsView: React.FC<RecordsViewProps> = ({
  inspections,
  onNewInspection,
  onDeleteInspection,
  onReloadInspections,
  onSync,
  isSyncing,
  lastSyncTime,
  isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true,
  activeRoom,
  onOpenRoomModal,
}) => {
  const currentRoom = activeRoom || DEFAULT_ROOM_ID;
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
    <div className="max-w-7xl mx-auto px-2.5 sm:px-6 py-3.5 sm:py-6 space-y-3.5 sm:space-y-5 pb-20 md:pb-12">
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
          className={`p-2.5 sm:p-3.5 border text-xs flex items-center gap-2 animate-in fade-in duration-200 ${
            backupMessage.type === 'success'
              ? 'bg-[#0F1726] border-emerald-800 text-emerald-300'
              : 'bg-[#0F1726] border-rose-800 text-rose-300'
          }`}
        >
          {backupMessage.type === 'success' ? (
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
          )}
          <span>{backupMessage.text}</span>
        </div>
      )}

      {/* Top Header */}
      <div className="space-y-2.5 sm:space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-base sm:text-2xl font-black text-[#FFFFFF] tracking-tight">
                REGISTROS DE INSPEÇÃO
              </h1>
              <div
                className={`px-2 py-0.5 border text-[10px] sm:text-[11px] font-bold flex items-center gap-1.5 ${
                  !isOnline
                    ? 'bg-[#0F1726] border-rose-800 text-rose-300'
                    : isSyncing
                    ? 'bg-[#0F1726] border-amber-500/50 text-amber-300'
                    : 'bg-[#0F1726] border-emerald-500/50 text-emerald-300'
                }`}
              >
                {!isOnline ? (
                  <>
                    <span className="w-2 h-2 bg-rose-500 rounded-full" />
                    <span>SERVIDOR OFFLINE</span>
                  </>
                ) : isSyncing ? (
                  <>
                    <span className="w-2 h-2 bg-amber-400 rounded-full animate-ping" />
                    <span>SINCRONIZANDO...</span>
                  </>
                ) : (
                  <>
                    <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                    <span>SERVIDOR ONLINE</span>
                  </>
                )}
              </div>
              {lastSyncTime && (
                <span className="text-[10px] sm:text-[11px] text-[#A7B0C2] font-mono">
                  Última sincronização: {lastSyncTime}
                </span>
              )}
            </div>
            <p className="text-[10px] sm:text-xs text-[#A7B0C2] mt-0.5">
              Consulte, filtre e exporte todas as inspeções salvas e sincronizadas em tempo real em todas as plataformas.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            {/* Room Indicator / Switcher Button */}
            <button
              onClick={onOpenRoomModal}
              className="py-1.5 sm:py-2.5 px-2.5 sm:px-3 bg-[#0F1726] hover:bg-[#12346B] border border-amber-500/40 hover:border-amber-400 text-amber-300 text-[11px] sm:text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
              title={`Sala Central: ${currentRoom}. Clique para gerenciar e alternar salas de inspeção.`}
            >
              <KeyRound className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="font-mono text-white max-w-[140px] sm:max-w-[200px] truncate">
                {currentRoom}
              </span>
            </button>

            {/* Multiplatform Sync Button */}
            <button
              onClick={onSync}
              disabled={isSyncing}
              className={`py-1.5 sm:py-2.5 px-2.5 sm:px-3 text-[11px] sm:text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border shadow-sm ${
                isSyncing
                  ? 'bg-[#12346B] border-[#A7B0C2] text-[#FFFFFF] opacity-90'
                  : 'bg-[#0F1726] hover:bg-[#12346B] border-[#12346B] text-[#FFFFFF] active:scale-95'
              }`}
              title={
                lastSyncTime
                  ? `Última sincronização às ${lastSyncTime}. Clique para atualizar os registros com o servidor central.`
                  : 'Sincronizar com o servidor do sistema para que todos tenham acesso aos mesmos registros'
              }
            >
              <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin text-[#FFFFFF]' : 'text-emerald-400'}`} />
              <span>{isSyncing ? 'Sincronizando...' : 'Sincronizar'}</span>
            </button>

            <button
              onClick={handleBackupExport}
              className="py-1.5 sm:py-2.5 px-2 sm:px-3 bg-[#12346B] hover:bg-[#12346B]/80 border border-[#A7B0C2]/30 text-[#FFFFFF] text-[11px] sm:text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
              title="Baixar cópia de segurança de todos os registros do banco local"
            >
              <Database className="w-3 h-3 text-[#FFFFFF]" />
              <span>Backup</span>
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="py-1.5 sm:py-2.5 px-2 sm:px-3 bg-[#12346B] hover:bg-[#12346B]/80 border border-[#A7B0C2]/30 text-[#FFFFFF] text-[11px] sm:text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
              title="Restaurar registros a partir de um backup JSON"
            >
              <Upload className="w-3 h-3 text-[#FFFFFF]" />
              <span>Restaurar</span>
            </button>

            <button
              onClick={handleBulkExport}
              disabled={isBulkExporting || filteredInspections.length === 0}
              className="py-1.5 sm:py-2.5 px-2 sm:px-3.5 bg-[#12346B] hover:bg-[#12346B]/80 border border-[#A7B0C2]/30 text-[#FFFFFF] text-[11px] sm:text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
              title="Exportar registros filtrados para planilha Excel única"
            >
              <Download className="w-3 h-3 text-[#FFFFFF]" />
              <span>Excel Geral</span>
            </button>

            <button
              onClick={onNewInspection}
              className="py-1.5 sm:py-2.5 px-3 sm:px-4 bg-[#12346B] hover:bg-[#12346B]/80 text-[#FFFFFF] text-[11px] sm:text-xs font-bold flex items-center gap-1 shadow-sm transition-all cursor-pointer border border-[#A7B0C2]/30"
            >
              <Plus className="w-3 h-3 text-[#FFFFFF]" />
              <span>Nova</span>
            </button>
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3">
        {/* Real-time Search Input */}
        <div className="relative flex-1 w-full">
          <Search className="w-3.5 h-3.5 text-[#A7B0C2] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por ID, Obra, Equipe, Técnico..."
            className="w-full bg-[#0F1726] border border-[#12346B] pl-8 sm:pl-9 pr-4 py-2 sm:py-2.5 text-xs text-[#FFFFFF] placeholder-[#A7B0C2]/60 focus:outline-none focus:ring-1 focus:ring-[#12346B] transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#A7B0C2] hover:text-[#FFFFFF] cursor-pointer"
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
            className={`py-2 px-3 border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeFiltersCount > 0
                ? 'bg-[#12346B] border-[#A7B0C2]/50 text-[#FFFFFF]'
                : 'bg-[#0F1726] border-[#12346B] text-[#A7B0C2] hover:text-[#FFFFFF] hover:bg-[#12346B]'
            }`}
          >
            <Filter className="w-3 h-3 text-[#FFFFFF]" />
            <span>Filtros</span>
            {activeFiltersCount > 0 && (
              <span className="w-3.5 h-3.5 bg-[#FFFFFF] text-[#0A1D3D] font-bold text-[9px] flex items-center justify-center">
                {activeFiltersCount}
              </span>
            )}
          </button>

          {/* Table / Cards toggle (Desktop) */}
          <div className="hidden md:flex items-center bg-[#0F1726] border border-[#12346B] p-0.5">
            <button
              onClick={() => setViewMode('cards')}
              className={`p-1.5 transition-colors cursor-pointer ${
                viewMode === 'cards' ? 'bg-[#12346B] text-[#FFFFFF]' : 'text-[#A7B0C2] hover:text-[#FFFFFF]'
              }`}
              title="Visualização em Cartões"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 transition-colors cursor-pointer ${
                viewMode === 'table' ? 'bg-[#12346B] text-[#FFFFFF]' : 'text-[#A7B0C2] hover:text-[#FFFFFF]'
              }`}
              title="Visualização em Tabela"
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Active Filter Chips */}
      {activeFiltersCount > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-[#A7B0C2] text-[10px]">Filtros:</span>
          {filters.tipoInspecao && (
            <span className="px-2 py-0.5 bg-[#12346B] text-[#FFFFFF] border border-[#A7B0C2]/30 text-[10px] flex items-center gap-1">
              Tipo: {filters.tipoInspecao}
            </span>
          )}
          {filters.obra && (
            <span className="px-2 py-0.5 bg-[#12346B] text-[#FFFFFF] border border-[#A7B0C2]/30 text-[10px] flex items-center gap-1">
              Obra: {filters.obra}
            </span>
          )}
          {filters.equipe && (
            <span className="px-2 py-0.5 bg-[#12346B] text-[#FFFFFF] border border-[#A7B0C2]/30 text-[10px] flex items-center gap-1">
              Equipe: {filters.equipe}
            </span>
          )}
          <button
            onClick={() => setFilters({ periodo: 'todos' })}
            className="text-[#FFFFFF] hover:underline font-semibold text-[10px] cursor-pointer"
          >
            Limpar todos
          </button>
        </div>
      )}

      {/* Results Count */}
      <div className="text-[11px] text-[#A7B0C2] font-medium">
        Exibindo {filteredInspections.length} de {inspections.length} inspeções
      </div>

      {/* Empty State */}
      {filteredInspections.length === 0 ? (
        <div className="border border-dashed border-[#12346B] p-8 sm:p-12 text-center space-y-2.5 bg-[#0F1726]/60">
          <div className="w-10 h-10 sm:w-14 sm:h-14 bg-[#12346B] text-[#A7B0C2] mx-auto flex items-center justify-center">
            <FolderArchive className="w-5 h-5 sm:w-7 sm:h-7" />
          </div>
          <h3 className="text-sm sm:text-base font-bold text-[#FFFFFF]">
            Nenhuma inspeção encontrada
          </h3>
          <p className="text-[11px] sm:text-xs text-[#A7B0C2] max-w-sm mx-auto">
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
              className="py-1.5 px-3 bg-[#12346B] hover:bg-[#12346B]/80 text-[#FFFFFF] text-xs font-semibold transition-colors cursor-pointer border border-[#A7B0C2]/30"
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-4">
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
