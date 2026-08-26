import React from 'react';
import { Wifi, WifiOff, RefreshCw, ShieldCheck } from 'lucide-react';

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
    <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-sm border-b border-slate-800 text-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Brand Zone (Single text element as per contract) */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-sky-600 flex items-center justify-center text-white font-black text-lg shadow-sm">
            IP!
          </div>
          <span className="font-extrabold text-lg sm:text-xl tracking-tight text-white">
            INSPEÇÃO PRONTO!
          </span>
        </div>

        {/* Navigation Zone (4-6 nav links, single-line) */}
        <nav className="hidden md:flex items-center gap-1 bg-slate-800/80 p-1 rounded-lg border border-slate-700/60">
          <button
            onClick={() => onSelectTab('inspecao')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
              currentTab === 'inspecao'
                ? 'bg-sky-600 text-white shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            📋 Inspeção {hasDraft && <span className="inline-block w-2 h-2 rounded-full bg-amber-400 ml-1.5 animate-pulse" />}
          </button>
          <button
            onClick={() => onSelectTab('registros')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
              currentTab === 'registros'
                ? 'bg-sky-600 text-white shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            🗂️ Registros
          </button>
          <button
            onClick={() => onSelectTab('dashboard')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
              currentTab === 'dashboard'
                ? 'bg-sky-600 text-white shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            📊 Indicadores
          </button>
        </nav>

        {/* Primary Action & Status Zone */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Online / Offline status badge */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
              !isOnline
                ? 'bg-rose-950/80 border-rose-800 text-rose-300'
                : isSyncing
                ? 'bg-amber-950/80 border-amber-800 text-amber-300'
                : 'bg-emerald-950/80 border-emerald-800 text-emerald-300'
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
                <WifiOff className="w-3.5 h-3.5 text-rose-400" />
                <span className="hidden sm:inline">Sem conexão</span>
              </>
            ) : isSyncing ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" />
                <span className="hidden sm:inline">Atualizando...</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="hidden sm:inline">Tempo Real</span>
              </>
            )}
          </div>

          {/* Quick New Inspection Button (Desktop) */}
          <button
            onClick={onNewInspection}
            className="hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-sm font-semibold transition-colors shadow-sm active:scale-98 whitespace-nowrap"
          >
            <span>＋</span>
            <span>Nova Inspeção</span>
          </button>
        </div>
      </div>
    </header>
  );
};
