import React from 'react';
import { BarChart3, Users, Building, Layers, Camera, CheckCircle2, TrendingUp, MapPin } from 'lucide-react';
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6 pb-24 md:pb-12 text-xs">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-100 tracking-tight">
          PAINEL DE INDICADORES DE CAMPO
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Estatísticas consolidadas de produtividade, conformidade e cobertura técnica.
        </p>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <div className="flex items-center justify-between text-slate-400">
            <span className="font-semibold uppercase text-[10px]">Volume Total</span>
            <CheckCircle2 className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-black text-slate-100 mt-1">{inspections.length}</div>
          <span className="text-[10px] text-slate-500">Inspeções finalizadas</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <div className="flex items-center justify-between text-slate-400">
            <span className="font-semibold uppercase text-[10px]">Evidências Fotográficas</span>
            <Camera className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400 mt-1">{totalPhotos}</div>
          <span className="text-[10px] text-slate-500">
            Média de {inspections.length > 0 ? (totalPhotos / inspections.length).toFixed(1) : 0} fotos/inspeção
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <div className="flex items-center justify-between text-slate-400">
            <span className="font-semibold uppercase text-[10px]">Cobertura GPS</span>
            <MapPin className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-black text-indigo-400 mt-1">{gpsCoverage}%</div>
          <span className="text-[10px] text-slate-500">{withGpsCount} com georreferenciamento</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <div className="flex items-center justify-between text-slate-400">
            <span className="font-semibold uppercase text-[10px]">Equipes Ativas</span>
            <Users className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-400 mt-1">{Object.keys(byTeam).length}</div>
          <span className="text-[10px] text-slate-500">Equipes com registros</span>
        </div>
      </div>

      {/* Breakdown Grids */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Inspeções por Equipe */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
            <Users className="w-4 h-4 text-sky-400" />
            <span>Inspeções por Equipe</span>
          </h3>

          <div className="space-y-3">
            {Object.entries(byTeam).map(([team, countVal]) => {
              const count = Number(countVal);
              const percentage = Math.round((count / (inspections.length || 1)) * 100);
              return (
                <div key={team} className="space-y-1">
                  <div className="flex justify-between font-semibold text-slate-300">
                    <span>{team}</span>
                    <span className="text-slate-400">{count} ({percentage}%)</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-sky-500"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Inspeções por Tipo */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-400" />
            <span>Inspeções por Categoria / Tipo</span>
          </h3>

          <div className="space-y-3">
            {Object.entries(byType).map(([type, countVal]) => {
              const count = Number(countVal);
              const percentage = Math.round((count / (inspections.length || 1)) * 100);
              return (
                <div key={type} className="space-y-1">
                  <div className="flex justify-between font-semibold text-slate-300">
                    <span className="truncate pr-2">{type}</span>
                    <span className="text-slate-400 shrink-0">{count} ({percentage}%)</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-emerald-500"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Inspeções por Obra */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 md:col-span-2">
          <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
            <Building className="w-4 h-4 text-indigo-400" />
            <span>Distribuição por Obra / Local</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {Object.entries(bySite).map(([site, count]) => (
              <div
                key={site}
                className="bg-slate-800/70 border border-slate-700/80 rounded-xl p-3.5 flex items-center justify-between"
              >
                <div className="truncate pr-2">
                  <p className="font-bold text-slate-200 truncate">{site}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{count} inspeções realizadas</p>
                </div>
                <span className="w-8 h-8 rounded-lg bg-indigo-950/80 border border-indigo-800 text-indigo-300 font-bold flex items-center justify-center shrink-0">
                  {count}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
