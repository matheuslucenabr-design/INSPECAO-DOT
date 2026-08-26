import React, { useState } from 'react';
import { Camera, MapPin, FileText, Table, Eye, Trash2 } from 'lucide-react';
import { Inspection } from '../../types/inspection';
import { generateInspectionPdf } from '../../utils/exportPdf';
import { generateInspectionExcel } from '../../utils/exportExcel';

interface RecordTableProps {
  inspections: Inspection[];
  onOpen: (inspection: Inspection) => void;
  onDelete: (id: string) => void;
}

export const RecordTable: React.FC<RecordTableProps> = ({
  inspections,
  onOpen,
  onDelete,
}) => {
  const [selectedForDelete, setSelectedForDelete] = useState<string | null>(null);

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900 shadow-md">
      <table className="w-full text-left text-xs text-slate-300">
        <thead className="bg-slate-800/90 text-[11px] font-bold uppercase text-slate-400 border-b border-slate-700">
          <tr>
            <th className="py-3 px-4">ID / Registro</th>
            <th className="py-3 px-4">Data/Hora</th>
            <th className="py-3 px-4">Obra & Local</th>
            <th className="py-3 px-4">Equipe / Técnico</th>
            <th className="py-3 px-4">Tipo</th>
            <th className="py-3 px-4 text-center">Fotos</th>
            <th className="py-3 px-4 text-center">GPS</th>
            <th className="py-3 px-4 text-right">Ações</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800 font-medium">
          {inspections.map((insp) => {
            const hasGps = insp.localizacao && !insp.localizacao.semGps;

            return (
              <tr
                key={insp.id}
                className="hover:bg-slate-800/50 transition-colors group cursor-pointer"
                onClick={() => onOpen(insp)}
              >
                {/* ID */}
                <td className="py-3 px-4 font-mono font-bold text-sky-400 whitespace-nowrap">
                  {insp.id}
                </td>

                {/* Data */}
                <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                  {insp.dataEnvio || insp.dataCriacao}
                </td>

                {/* Obra & Local */}
                <td className="py-3 px-4 max-w-[200px]">
                  <p className="font-bold text-slate-100 truncate">{insp.obra}</p>
                  <p className="text-[11px] text-slate-400 truncate">{insp.local}</p>
                </td>

                {/* Equipe & Técnico */}
                <td className="py-3 px-4 max-w-[180px]">
                  <span className="inline-block px-1.5 py-0.5 rounded bg-slate-800 text-slate-200 font-semibold text-[10px] mr-1.5">
                    {insp.equipe}
                  </span>
                  <span className="text-slate-300 text-[11px] truncate">{insp.tecnicoResponsavel}</span>
                </td>

                {/* Tipo */}
                <td className="py-3 px-4 text-slate-300 whitespace-nowrap">
                  {insp.tipoInspecao}
                </td>

                {/* Fotos */}
                <td className="py-3 px-4 text-center whitespace-nowrap">
                  <span className="inline-flex items-center gap-1 font-bold text-sky-400 bg-sky-950/60 px-2 py-0.5 rounded border border-sky-800/40">
                    <Camera className="w-3 h-3" />
                    {insp.fotos.length}
                  </span>
                </td>

                {/* GPS */}
                <td className="py-3 px-4 text-center whitespace-nowrap">
                  {hasGps ? (
                    <span className="inline-flex items-center gap-1 font-semibold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/40 text-[11px]">
                      <MapPin className="w-3 h-3" /> OK
                    </span>
                  ) : (
                    <span className="text-slate-500 text-[11px]">Sem GPS</span>
                  )}
                </td>

                {/* Actions */}
                <td
                  className="py-3 px-4 text-right whitespace-nowrap"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      onClick={() => onOpen(insp)}
                      className="p-1.5 rounded-lg bg-sky-600/20 text-sky-400 hover:bg-sky-600 hover:text-white transition-colors"
                      title="Ver detalhes"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => generateInspectionPdf(insp)}
                      className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-rose-400 hover:bg-rose-950/40 transition-colors"
                      title="Exportar PDF"
                    >
                      <FileText className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => generateInspectionExcel(insp)}
                      className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-emerald-400 hover:bg-emerald-950/40 transition-colors"
                      title="Exportar Excel"
                    >
                      <Table className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Excluir inspeção ${insp.id}?`)) {
                          onDelete(insp.id);
                        }
                      }}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 transition-colors"
                      title="Excluir"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
