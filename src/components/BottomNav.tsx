import React from 'react';
import { PlusCircle, ClipboardList, FolderArchive, BarChart3 } from 'lucide-react';

interface BottomNavProps {
  currentTab: 'inspecao' | 'registros' | 'dashboard';
  onSelectTab: (tab: 'inspecao' | 'registros' | 'dashboard') => void;
  onNewInspection: () => void;
  hasDraft?: boolean;
  isDrafting?: boolean;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentTab,
  onSelectTab,
  onNewInspection,
  hasDraft,
  isDrafting,
}) => {
  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/98 backdrop-blur-md border-t border-slate-800 safe-bottom">
      <div className="grid grid-cols-4 h-16 max-w-lg mx-auto">
        {/* Button: Nova Inspeção */}
        <button
          onClick={onNewInspection}
          className="flex flex-col items-center justify-center gap-1 text-sky-400 hover:text-sky-300 transition-colors active:scale-95 touch-manipulation"
        >
          <div className="w-8 h-8 rounded-full bg-sky-600/30 flex items-center justify-center">
            <PlusCircle className="w-5 h-5 text-sky-400" />
          </div>
          <span className="text-[11px] font-semibold whitespace-nowrap">Nova</span>
        </button>

        {/* Button: Inspeção (Ativa) */}
        <button
          onClick={() => onSelectTab('inspecao')}
          className={`relative flex flex-col items-center justify-center gap-1 transition-colors active:scale-95 touch-manipulation ${
            currentTab === 'inspecao' ? 'text-sky-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className="relative">
            <ClipboardList className="w-5 h-5" />
            {hasDraft && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-400 ring-2 ring-slate-900 animate-pulse" />
            )}
          </div>
          <span className="text-[11px] whitespace-nowrap">
            {isDrafting ? 'Em Edição' : 'Inspeção'}
          </span>
        </button>

        {/* Button: Registros */}
        <button
          onClick={() => onSelectTab('registros')}
          className={`flex flex-col items-center justify-center gap-1 transition-colors active:scale-95 touch-manipulation ${
            currentTab === 'registros' ? 'text-sky-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <FolderArchive className="w-5 h-5" />
          <span className="text-[11px] whitespace-nowrap">Registros</span>
        </button>

        {/* Button: Indicadores */}
        <button
          onClick={() => onSelectTab('dashboard')}
          className={`flex flex-col items-center justify-center gap-1 transition-colors active:scale-95 touch-manipulation ${
            currentTab === 'dashboard' ? 'text-sky-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <BarChart3 className="w-5 h-5" />
          <span className="text-[11px] whitespace-nowrap">Indicadores</span>
        </button>
      </div>
    </div>
  );
};
