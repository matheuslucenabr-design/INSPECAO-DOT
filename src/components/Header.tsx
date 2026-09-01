import React from 'react';
import { Wifi, WifiOff, RefreshCw, ClipboardList, FolderArchive, BarChart3, Plus, KeyRound } from 'lucide-react';

interface HeaderProps {
  isOnline: boolean;
  isSyncing?: boolean;
  onSync?: () => void;
  lastSyncTime?: string;
  currentTab: 'inspecao' | 'registros' | 'dashboard';
  onSelectTab: (tab: 'inspecao' | 'registros' | 'dashboard') => void;
  onNewInspection: () => void;
  hasDraft?: boolean;
  activeRoom?: string;
  onOpenRoomModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  isOnline,
  isSyncing,
  onSync,
  lastSyncTime,
  currentTab,
  onSelectTab,
  onNewInspection,
  hasDraft,
  activeRoom,
  onOpenRoomModal,
}) => {
  const displayRoom = activeRoom || 'tecnico@inspecaopronto.com';

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
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          {/* Room Selector / Indicator Button */}
          <button
            onClick={onOpenRoomModal}
            className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1 bg-[#0F1726] hover:bg-[#12346B] border border-amber-500/40 hover:border-amber-400 text-amber-300 text-xs font-bold transition-all shadow-sm cursor-pointer"
            title={`Sala Ativa: ${displayRoom}. Clique para gerenciar ou visualizar as salas de inspeção.`}
          >
            <KeyRound className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="hidden lg:inline text-[11px] max-w-[170px] truncate font-mono">
              {displayRoom}
            </span>
            <span className="lg:hidden text-[11px] font-mono">
              Sala
            </span>
          </button>

          {/* Multiplatform Sync Button */}
          <button
            onClick={onSync}
            disabled={isSyncing}
            className={`flex items-center gap-1.5 px-2 sm:px-3 py-1 text-xs font-bold transition-all border shadow-sm cursor-pointer ${
              isSyncing
                ? 'bg-[#12346B] border-[#A7B0C2] text-[#FFFFFF] opacity-90'
                : 'bg-[#0F1726] hover:bg-[#12346B] border-[#12346B] text-[#FFFFFF] active:scale-95'
            }`}
            title={
              lastSyncTime
                ? `Última sincronização às ${lastSyncTime}. Clique para sincronizar agora com o servidor central.`
                : 'Sincronizar todos os registros no servidor para acesso multiplataforma'
            }
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-[#FFFFFF]' : 'text-emerald-400'}`} />
            <span className="hidden sm:inline">
              {isSyncing ? 'Sincronizando...' : 'Sincronizar'}
            </span>
            <span className="sm:hidden">
              {isSyncing ? 'Sync...' : 'Sync'}
            </span>
          </button>

          {/* Online / Offline status badge */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 text-[11px] sm:text-xs font-bold border transition-colors ${
              !isOnline
                ? 'bg-[#0F1726] border-rose-800 text-rose-300'
                : isSyncing
                ? 'bg-[#0F1726] border-amber-500/50 text-amber-300'
                : 'bg-[#0F1726] border-emerald-500/50 text-emerald-300'
            }`}
            title={
              !isOnline
                ? 'Servidor Offline - Modo local ativo'
                : isSyncing
                ? 'Sincronizando dados com o servidor central...'
                : `Servidor Central Online - Sincronizado ${lastSyncTime ? `(Última sync: ${lastSyncTime})` : ''}`
            }
          >
            {!isOnline ? (
              <>
                <span className="w-2 h-2 bg-rose-500 rounded-full" />
                <span className="font-bold">SERVIDOR OFFLINE</span>
              </>
            ) : isSyncing ? (
              <>
                <span className="w-2 h-2 bg-amber-400 rounded-full animate-ping" />
                <span className="font-bold">SINCRONIZANDO...</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                <span className="font-bold">SERVIDOR ONLINE</span>
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
