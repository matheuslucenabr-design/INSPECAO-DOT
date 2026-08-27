import React from 'react';
import { Wifi, WifiOff, RefreshCw, ClipboardList, FolderArchive, BarChart3, Plus } from 'lucide-react';

interface HeaderProps {
  isOnline: boolean;
  isSyncing?: boolean;
  currentTab: 'inspecao' | 'registros' | 'dashboard';
  onSelectTab: (tab: 'inspecao' | 'registros' | 'dashboard') => void;
  onNewInspection: () => void;
  hasDraft?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  isOnline,
  isSyncing,
  currentTab,
  onSelectTab,
  onNewInspection,
  hasDraft,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-[#0A1D3D]/95 backdrop-blur-sm border-b border-[#12346B] text-[#FFFFFF]">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 h-13 sm:h-16 flex items-center justify-between gap-2 sm:gap-4">
        {/* Brand Zone */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-7 h-7 sm:w-9 sm:h-9 bg-[#12346B] border border-[#12346B] flex items-center justify-center text-[#FFFFFF] font-black text-xs sm:text-base shadow-sm">
            IP!
          </div>
          <span className="font-extrabold text-sm sm:text-lg tracking-tight text-[#FFFFFF]">
            INSPEÇÃO PRONTO!
          </span>
        </div>

        {/* Navigation Zone - Desktop */}
        <nav className="hidden md:flex items-center gap-1 bg-[#0F1726] p-1 border border-[#12346B]">
          <button
            onClick={() => onSelectTab('inspecao')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
              currentTab === 'inspecao'
                ? 'bg-[#12346B] text-[#FFFFFF] shadow-sm'
                : 'text-[#A7B0C2] hover:text-[#FFFFFF] hover:bg-[#12346B]'
            }`}
          >
            <ClipboardList className="w-3.5 h-3.5" />
            <span>Inspeção</span>
            {hasDraft && <span className="inline-block w-2 h-2 bg-[#FFFFFF] ml-1 animate-pulse" />}
          </button>
          <button
            onClick={() => onSelectTab('registros')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
              currentTab === 'registros'
                ? 'bg-[#12346B] text-[#FFFFFF] shadow-sm'
                : 'text-[#A7B0C2] hover:text-[#FFFFFF] hover:bg-[#12346B]'
            }`}
          >
            <FolderArchive className="w-3.5 h-3.5" />
            <span>Registros</span>
          </button>
          <button
            onClick={() => onSelectTab('dashboard')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
              currentTab === 'dashboard'
                ? 'bg-[#12346B] text-[#FFFFFF] shadow-sm'
                : 'text-[#A7B0C2] hover:text-[#FFFFFF] hover:bg-[#12346B]'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Indicadores</span>
          </button>
        </nav>

        {/* Primary Action & Status Zone */}
        <div className="flex items-center gap-1.5 sm:gap-3">
          {/* Online / Offline status badge */}
          <div
            className={`flex items-center gap-1 sm:gap-1.5 px-2 py-0.5 sm:px-2.5 sm:py-1 text-[11px] sm:text-xs font-semibold border ${
              !isOnline
                ? 'bg-[#0F1726] border-rose-800 text-rose-300'
                : isSyncing
                ? 'bg-[#0F1726] border-[#12346B] text-[#FFFFFF]'
                : 'bg-[#0F1726] border-[#12346B] text-[#A7B0C2]'
            }`}
            title={
              !isOnline
                ? 'Operando offline com salvamento local'
                : isSyncing
                ? 'Sincronizando alterações com todos os dispositivos...'
                : 'Sincronização em tempo real ativa para todos os usuários'
            }
          >
            {!isOnline ? (
              <>
                <WifiOff className="w-3 h-3 text-rose-400" />
                <span className="hidden sm:inline">Sem conexão</span>
                <span className="sm:hidden">Off</span>
              </>
            ) : isSyncing ? (
              <>
                <RefreshCw className="w-3 h-3 animate-spin text-[#FFFFFF]" />
                <span className="hidden sm:inline">Atualizando...</span>
                <span className="sm:hidden">Sync</span>
              </>
            ) : (
              <>
                <span className="w-1.5 h-1.5 bg-emerald-400 animate-pulse" />
                <span className="hidden sm:inline">Tempo Real</span>
                <span className="sm:hidden">Online</span>
              </>
            )}
          </div>

          {/* Quick New Inspection Button (Desktop) */}
          <button
            onClick={onNewInspection}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-[#12346B] hover:bg-[#12346B]/80 text-[#FFFFFF] text-xs font-bold transition-colors shadow-sm active:scale-98 whitespace-nowrap cursor-pointer border border-[#A7B0C2]/30"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nova Inspeção</span>
          </button>
        </div>
      </div>
    </header>
  );
};
