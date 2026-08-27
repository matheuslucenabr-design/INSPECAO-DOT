import React from 'react';
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
  return (
    <div className="overflow-x-auto border border-[#12346B] bg-[#0F1726] shadow-md">
      <table className="w-full text-left text-xs text-[#FFFFFF]">
        <thead className="bg-[#12346B] text-[11px] font-bold uppercase text-[#FFFFFF] border-b border-[#12346B]">
          <tr>
            <th className="py-3 px-4">Protocolo / Registro</th>
            <th className="py-3 px-4">Data/Hora</th>
            <th className="py-3 px-4">Obra & Local</th>
            <th className="py-3 px-4">Equipe / Técnico</th>
            <th className="py-3 px-4">Tipo</th>
            <th className="py-3 px-4 text-center">Fotos</th>
            <th className="py-3 px-4 text-center">GPS</th>
            <th className="py-3 px-4 text-right">Ações</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#12346B] font-medium">
          {inspections.map((insp) => {
            const hasGps = insp.localizacao && !insp.localizacao.semGps;

            return (
              <tr
                key={insp.id}
                className="hover:bg-[#12346B]/40 transition-colors group cursor-pointer"
                onClick={() => onOpen(insp)}
              >
                {/* ID */}
                <td className="py-3 px-4 font-mono font-bold text-[#FFFFFF] whitespace-nowrap">
                  {insp.id}
                </td>

                {/* Data */}
                <td className="py-3 px-4 text-[#A7B0C2] whitespace-nowrap">
                  {insp.dataEnvio || insp.dataCriacao}
                </td>

                {/* Obra & Local */}
                <td className="py-3 px-4 max-w-[200px]">
                  <p className="font-bold text-[#FFFFFF] truncate">{insp.obra}</p>
                  <p className="text-[11px] text-[#A7B0C2] truncate">{insp.local}</p>
                </td>

                {/* Equipe & Técnico */}
                <td className="py-3 px-4 max-w-[180px]">
                  <span className="inline-block px-1.5 py-0.5 bg-[#12346B] text-[#FFFFFF] font-semibold text-[10px] mr-1.5 border border-[#A7B0C2]/20">
                    {insp.equipe}
                  </span>
                  <span className="text-[#A7B0C2] text-[11px] truncate">{insp.tecnicoResponsavel}</span>
                </td>

                {/* Tipo */}
                <td className="py-3 px-4 text-[#A7B0C2] whitespace-nowrap">
                  {insp.tipoInspecao}
                </td>

                {/* Fotos */}
                <td className="py-3 px-4 text-center whitespace-nowrap">
                  <span className="inline-flex items-center gap-1 font-bold text-[#FFFFFF] bg-[#0A1D3D] px-2 py-0.5 border border-[#12346B]">
                    <Camera className="w-3 h-3" />
                    {insp.fotos.length}
                  </span>
                </td>

                {/* GPS */}
                <td className="py-3 px-4 text-center whitespace-nowrap">
                  {hasGps ? (
                    <span className="inline-flex items-center gap-1 font-semibold text-emerald-400 bg-[#0A1D3D] px-2 py-0.5 border border-emerald-800 text-[11px]">
                      <MapPin className="w-3 h-3" /> OK
                    </span>
                  ) : (
                    <span className="text-[#A7B0C2]/60 text-[11px]">Sem GPS</span>
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
                      className="p-1.5 bg-[#12346B] text-[#FFFFFF] hover:bg-[#12346B]/80 border border-[#A7B0C2]/30 transition-colors cursor-pointer"
                      title="Ver detalhes"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => generateInspectionPdf(insp)}
                      className="p-1.5 bg-[#12346B] text-[#FFFFFF] hover:text-rose-400 border border-[#A7B0C2]/30 transition-colors cursor-pointer"
                      title="Exportar PDF"
                    >
                      <FileText className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => generateInspectionExcel(insp)}
                      className="p-1.5 bg-[#12346B] text-[#FFFFFF] hover:text-emerald-400 border border-[#A7B0C2]/30 transition-colors cursor-pointer"
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
                      className="p-1.5 text-[#A7B0C2] hover:text-rose-400 hover:bg-[#12346B] transition-colors cursor-pointer"
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
