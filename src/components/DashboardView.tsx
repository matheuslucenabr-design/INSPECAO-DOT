import React from 'react';
import { BarChart3, Users, Building, Layers, Camera, CheckCircle2, TrendingUp, MapPin, ClipboardList } from 'lucide-react';
import { Inspection } from '../types/inspection';

interface DashboardViewProps {
  inspections: Inspection[];
  onSelectObra?: (obra: string) => void;
  onSelectEquipe?: (equipe: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  inspections,
  onSelectObra,
  onSelectEquipe,
}) => {
  // Aggregate by Team
  const byTeam = inspections.reduce((acc, curr) => {
    const team = curr.equipe || 'Não informada';
    acc[team] = (acc[team] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Aggregate by Type
  const byType = inspections.reduce((acc, curr) => {
    const type = curr.tipoInspecao || 'Outros';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Aggregate by Site (Obra)
  const bySite = inspections.reduce((acc, curr) => {
    const site = curr.obra || 'Não informada';
    acc[site] = (acc[site] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const totalPhotos = inspections.reduce((sum, curr) => sum + (curr.fotos?.length || 0), 0);
  const withGpsCount = inspections.filter((i) => i.localizacao && !i.localizacao.semGps).length;
  const gpsCoverage = inspections.length > 0 ? Math.round((withGpsCount / inspections.length) * 100) : 0;

  return (
    <div className="max-w-7xl mx-auto px-2.5 sm:px-6 py-3.5 sm:py-6 space-y-3.5 sm:space-y-5 pb-20 md:pb-12 text-xs">
      <div>
        <h1 className="text-base sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
          <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 text-[#FFFFFF]" />
          PAINEL DE INDICADORES DE CAMPO
        </h1>
        <p className="text-[10px] sm:text-xs text-[#A7B0C2] mt-0.5">
          Estatísticas consolidadas de produtividade, conformidade e cobertura técnica operacional.
        </p>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        <div className="bg-[#12346B]/40 border border-[#12346B] rounded-none p-2.5 sm:p-4">
          <div className="flex items-center justify-between text-[#A7B0C2]">
            <span className="font-semibold uppercase text-[9px] sm:text-[10px] tracking-wider">Volume Total</span>
            <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#FFFFFF]" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-white mt-0.5 sm:mt-1">{inspections.length}</div>
          <span className="text-[9px] sm:text-[10px] text-[#A7B0C2]">Inspeções cadastradas</span>
        </div>

        <div className="bg-[#12346B]/40 border border-[#12346B] rounded-none p-2.5 sm:p-4">
          <div className="flex items-center justify-between text-[#A7B0C2]">
            <span className="font-semibold uppercase text-[9px] sm:text-[10px] tracking-wider">Evidências Fotográficas</span>
            <Camera className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#FFFFFF]" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-[#FFFFFF] mt-0.5 sm:mt-1">{totalPhotos}</div>
          <span className="text-[9px] sm:text-[10px] text-[#A7B0C2]">
            Média de {inspections.length > 0 ? (totalPhotos / inspections.length).toFixed(1) : 0} fotos/inspeção
          </span>
        </div>

        <div className="bg-[#12346B]/40 border border-[#12346B] rounded-none p-2.5 sm:p-4">
          <div className="flex items-center justify-between text-[#A7B0C2]">
            <span className="font-semibold uppercase text-[9px] sm:text-[10px] tracking-wider">Cobertura GPS</span>
            <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#FFFFFF]" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-white mt-0.5 sm:mt-1">{gpsCoverage}%</div>
          <span className="text-[9px] sm:text-[10px] text-[#A7B0C2]">{withGpsCount} com georreferenciamento</span>
        </div>

        <div className="bg-[#12346B]/40 border border-[#12346B] rounded-none p-2.5 sm:p-4">
          <div className="flex items-center justify-between text-[#A7B0C2]">
            <span className="font-semibold uppercase text-[9px] sm:text-[10px] tracking-wider">Equipes Ativas</span>
            <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#FFFFFF]" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-[#FFFFFF] mt-0.5 sm:mt-1">{Object.keys(byTeam).length}</div>
          <span className="text-[9px] sm:text-[10px] text-[#A7B0C2]">Equipes com registros</span>
        </div>
      </div>

      {inspections.length === 0 ? (
        <div className="bg-[#0A1D3D] border border-[#12346B] rounded-none p-8 sm:p-10 text-center space-y-2.5">
          <ClipboardList className="w-10 h-10 sm:w-12 sm:h-12 text-[#FFFFFF] mx-auto opacity-75" />
          <h3 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider">NENHUM REGISTRO REGISTRADO</h3>
          <p className="text-[11px] sm:text-xs text-[#A7B0C2] max-w-md mx-auto">
            O sistema está limpo e pronto para iniciar suas operações. Assim que você cadastrar a primeira inspeção, os gráficos e métricas serão atualizados em tempo real.
          </p>
        </div>
      ) : (
        /* Breakdown Grids */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-6">
          {/* Inspeções por Equipe */}
          <div className="bg-[#0A1D3D] border border-[#12346B] rounded-none p-3.5 sm:p-5 space-y-3 sm:space-y-4">
            <h3 className="font-bold text-xs sm:text-sm text-white flex items-center gap-1.5 sm:gap-2">
              <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#FFFFFF]" />
              <span>Inspeções por Equipe</span>
            </h3>

            <div className="space-y-2.5">
              {Object.entries(byTeam).map(([team, countVal]) => {
                const count = Number(countVal);
                const percentage = Math.round((count / (inspections.length || 1)) * 100);
                return (
                  <div key={team} className="space-y-1">
                    <div className="flex justify-between font-semibold text-white text-[11px] sm:text-xs">
                      <span className="truncate pr-2">{team}</span>
                      <span className="text-[#A7B0C2] shrink-0">{count} ({percentage}%)</span>
                    </div>
                    <div className="w-full h-1.5 sm:h-2 rounded-none bg-[#0F1726] border border-[#12346B]/60 overflow-hidden">
                      <div
                        className="h-full rounded-none bg-[#FFFFFF]"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Inspeções por Tipo */}
          <div className="bg-[#0A1D3D] border border-[#12346B] rounded-none p-3.5 sm:p-5 space-y-3 sm:space-y-4">
            <h3 className="font-bold text-xs sm:text-sm text-white flex items-center gap-1.5 sm:gap-2">
              <Layers className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#FFFFFF]" />
              <span>Inspeções por Categoria / Tipo</span>
            </h3>

            <div className="space-y-2.5">
              {Object.entries(byType).map(([type, countVal]) => {
                const count = Number(countVal);
                const percentage = Math.round((count / (inspections.length || 1)) * 100);
                return (
                  <div key={type} className="space-y-1">
                    <div className="flex justify-between font-semibold text-white text-[11px] sm:text-xs">
                      <span className="truncate pr-2">{type}</span>
                      <span className="text-[#A7B0C2] shrink-0">{count} ({percentage}%)</span>
                    </div>
                    <div className="w-full h-1.5 sm:h-2 rounded-none bg-[#0F1726] border border-[#12346B]/60 overflow-hidden">
                      <div
                        className="h-full rounded-none bg-[#FFFFFF]"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Distribuição por Obra */}
          <div className="bg-[#0A1D3D] border border-[#12346B] rounded-none p-3.5 sm:p-5 space-y-3 sm:space-y-4 md:col-span-2">
            <h3 className="font-bold text-xs sm:text-sm text-white flex items-center gap-1.5 sm:gap-2">
              <Building className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#FFFFFF]" />
              <span>Distribuição por Obra / Local</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3">
              {Object.entries(bySite).map(([site, count]) => (
                <div
                  key={site}
                  className="bg-[#12346B]/30 border border-[#12346B] rounded-none p-2.5 sm:p-3.5 flex items-center justify-between"
                >
                  <div className="truncate pr-2">
                    <p className="font-bold text-white truncate text-xs">{site}</p>
                    <p className="text-[9px] sm:text-[10px] text-[#A7B0C2] mt-0.5">{count} inspeções registradas</p>
                  </div>
                  <span className="w-6 h-6 sm:w-8 sm:h-8 rounded-none bg-[#0A1D3D] border border-[#12346B] text-[#FFFFFF] font-bold text-xs flex items-center justify-center shrink-0">
                    {count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
