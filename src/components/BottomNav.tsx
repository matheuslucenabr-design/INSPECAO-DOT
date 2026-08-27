import React from 'react';
import { Plus, ClipboardList, FolderArchive, BarChart3 } from 'lucide-react';

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
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0A1D3D]/98 backdrop-blur-md border-t border-[#12346B] safe-bottom">
      <div className="grid grid-cols-4 h-13 max-w-lg mx-auto py-1">
        {/* Button: Nova Inspeção */}
        <button
          onClick={onNewInspection}
          className="flex flex-col items-center justify-center gap-0.5 text-[#FFFFFF] hover:text-[#FFFFFF]/80 transition-colors active:scale-95 touch-manipulation cursor-pointer"
        >
          <div className="w-6 h-6 bg-[#12346B] border border-[#12346B] flex items-center justify-center">
            <Plus className="w-3.5 h-3.5 text-[#FFFFFF]" />
          </div>
          <span className="text-[10px] font-bold whitespace-nowrap">Nova</span>
        </button>

        {/* Button: Inspeção */}
        <button
          onClick={() => onSelectTab('inspecao')}
          className={`relative flex flex-col items-center justify-center gap-0.5 transition-colors active:scale-95 touch-manipulation cursor-pointer ${
            currentTab === 'inspecao' ? 'text-[#FFFFFF] font-bold' : 'text-[#A7B0C2] hover:text-[#FFFFFF]'
          }`}
        >
          <div className="relative">
            <ClipboardList className="w-4 h-4" />
            {hasDraft && (
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-[#FFFFFF] ring-1 ring-[#0A1D3D] animate-pulse" />
            )}
          </div>
          <span className="text-[10px] whitespace-nowrap">
            {isDrafting ? 'Em Edição' : 'Inspeção'}
          </span>
        </button>

        {/* Button: Registros */}
        <button
          onClick={() => onSelectTab('registros')}
          className={`flex flex-col items-center justify-center gap-0.5 transition-colors active:scale-95 touch-manipulation cursor-pointer ${
            currentTab === 'registros' ? 'text-[#FFFFFF] font-bold' : 'text-[#A7B0C2] hover:text-[#FFFFFF]'
          }`}
        >
          <FolderArchive className="w-4 h-4" />
          <span className="text-[10px] whitespace-nowrap">Registros</span>
        </button>

        {/* Button: Indicadores */}
        <button
          onClick={() => onSelectTab('dashboard')}
          className={`flex flex-col items-center justify-center gap-0.5 transition-colors active:scale-95 touch-manipulation cursor-pointer ${
            currentTab === 'dashboard' ? 'text-[#FFFFFF] font-bold' : 'text-[#A7B0C2] hover:text-[#FFFFFF]'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span className="text-[10px] whitespace-nowrap">Indicadores</span>
        </button>
      </div>
    </div>
  );
};
