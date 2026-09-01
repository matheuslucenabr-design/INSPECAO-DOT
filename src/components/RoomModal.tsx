import React, { useState, useEffect } from 'react';
import {
  Users,
  Building,
  KeyRound,
  CheckCircle2,
  Plus,
  ArrowRight,
  X,
  RefreshCw,
  Info,
  ShieldCheck,
  Globe,
} from 'lucide-react';
import { InspectionRoom } from '../types/inspection';
import {
  DEFAULT_ROOM_ID,
  fetchServerRooms,
  createRemoteRoom,
  getActiveRoom,
  setActiveRoom,
} from '../utils/storage';

interface RoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRoomChanged: (newRoomId: string) => void;
  totalCurrentInspections?: number;
}

export const RoomModal: React.FC<RoomModalProps> = ({
  isOpen,
  onClose,
  onRoomChanged,
  totalCurrentInspections = 0,
}) => {
  const [rooms, setRooms] = useState<InspectionRoom[]>([]);
  const [activeRoomId, setActiveRoomId] = useState<string>(getActiveRoom());
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);

  // New room form state
  const [newRoomEmail, setNewRoomEmail] = useState('');
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomDesc, setNewRoomDesc] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setActiveRoomId(getActiveRoom());
      loadRooms();
    }
  }, [isOpen]);

  const loadRooms = async () => {
    setIsLoading(true);
    try {
      const list = await fetchServerRooms();
      setRooms(list);
    } catch (err) {
      console.error('Erro ao listar salas:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectRoom = (roomId: string) => {
    const cleanId = roomId.trim().toLowerCase();
    setActiveRoom(cleanId);
    setActiveRoomId(cleanId);
    setSuccessMessage(`Sala ativa alterada para: ${cleanId}`);
    setTimeout(() => setSuccessMessage(null), 3000);
    onRoomChanged(cleanId);
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const email = newRoomEmail.trim().toLowerCase();
    if (!email) {
      setErrorMessage('Por favor, informe o e-mail ou identificador da nova sala.');
      return;
    }

    setIsCreating(true);
    try {
      const created = await createRemoteRoom({
        id: email,
        email: email,
        name: newRoomName.trim() || `Sala ${email}`,
        description: newRoomDesc.trim() || 'Sala central de inspeções',
      });

      setSuccessMessage(`Nova sala cadastrada com sucesso: ${created.id}`);
      setNewRoomEmail('');
      setNewRoomName('');
      setNewRoomDesc('');
      setShowCreateForm(false);
      await loadRooms();
      handleSelectRoom(created.id);
    } catch (err: any) {
      setErrorMessage(err.message || 'Não foi possível cadastrar a nova sala.');
    } finally {
      setIsCreating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="bg-[#0F1726] border border-[#1E293B] w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="bg-[#0A0F1D] px-4 sm:px-6 py-4 border-b border-[#1E293B] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <KeyRound className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white tracking-tight flex items-center gap-2">
                SISTEMA DE SALAS DE INSPEÇÃO
              </h2>
              <p className="text-[11px] sm:text-xs text-[#A7B0C2]">
                Armazenamento central unificado por sala compartilhada
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#A7B0C2] hover:text-white p-1 rounded transition-colors"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs sm:text-sm">
          {/* Informational Banner */}
          <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 text-amber-200 rounded-none space-y-1.5">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold text-amber-300">
                  Sala Principal Unificada:{' '}
                  <span className="font-mono text-white underline">{DEFAULT_ROOM_ID}</span>
                </p>
                <p className="text-[11px] text-amber-200/90 leading-relaxed">
                  Todos os registros, fotos e dados do servidor ficam centralizados nesta sala. Todos os
                  usuários que acessarem o link compartilham e consultam as mesmas informações em tempo real.
                </p>
              </div>
            </div>
          </div>

          {/* Messages */}
          {successMessage && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{successMessage}</span>
            </div>
          )}

          {errorMessage && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center gap-2">
              <Info className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Active Room Card */}
          <div className="border border-[#1E293B] bg-[#0A0F1D] p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold tracking-wider text-[#A7B0C2] uppercase">
                SALA EM USO NESTE NAVEGADOR
              </span>
              <span className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                CONECTADA
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Building className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="font-mono text-white font-bold text-sm break-all">
                {activeRoomId}
              </span>
            </div>
            <div className="text-[11px] text-[#A7B0C2] flex items-center gap-3 pt-1 border-t border-[#1E293B]">
              <span>Registros carregados: <strong className="text-white">{totalCurrentInspections}</strong></span>
              <span>•</span>
              <span className="flex items-center gap-1 text-emerald-400">
                <ShieldCheck className="w-3.5 h-3.5" /> Nuvem Central Sincronizada
              </span>
            </div>
          </div>

          {/* List of Registered Rooms */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-amber-400" />
                Salas Cadastradas no Sistema ({rooms.length})
              </h3>
              <button
                type="button"
                onClick={loadRooms}
                disabled={isLoading}
                className="text-[11px] text-[#A7B0C2] hover:text-white flex items-center gap-1 transition-colors"
                title="Recarregar salas"
              >
                <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
                Atualizar
              </button>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {rooms.map((room) => {
                const isSelected = room.id.toLowerCase() === activeRoomId.toLowerCase();
                const isDefault = room.id.toLowerCase() === DEFAULT_ROOM_ID.toLowerCase();

                return (
                  <div
                    key={room.id}
                    className={`p-3 border transition-all flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'border-amber-500/60 bg-amber-500/5 text-white'
                        : 'border-[#1E293B] bg-[#0A0F1D] hover:border-[#334155]'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-white text-xs truncate">
                          {room.name || room.id}
                        </span>
                        {isDefault && (
                          <span className="px-1.5 py-0.2 bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[9px] font-bold">
                            PADRÃO / PRINCIPAL
                          </span>
                        )}
                        {isSelected && (
                          <span className="px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[9px] font-bold">
                            ATIVA
                          </span>
                        )}
                      </div>
                      <p className="font-mono text-[11px] text-[#A7B0C2] truncate mt-0.5">
                        {room.email || room.id}
                      </p>
                      {room.description && (
                        <p className="text-[10px] text-[#64748B] truncate mt-0.5">
                          {room.description}
                        </p>
                      )}
                    </div>

                    <div className="shrink-0 flex items-center gap-2">
                      {typeof room.totalInspections === 'number' && (
                        <span className="text-[10px] text-[#A7B0C2] bg-[#0F1726] px-2 py-1 border border-[#1E293B]">
                          {room.totalInspections} {room.totalInspections === 1 ? 'insp.' : 'insps.'}
                        </span>
                      )}

                      {!isSelected ? (
                        <button
                          type="button"
                          onClick={() => handleSelectRoom(room.id)}
                          className="px-2.5 py-1 bg-[#1E293B] hover:bg-amber-500 hover:text-black text-white text-[11px] font-bold transition-colors flex items-center gap-1"
                        >
                          Acessar <ArrowRight className="w-3 h-3" />
                        </button>
                      ) : (
                        <div className="text-emerald-400 px-2 py-1 text-[11px] font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-4 h-4" />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Expandable Form: Register Future Room */}
          <div className="pt-2 border-t border-[#1E293B]">
            {!showCreateForm ? (
              <button
                type="button"
                onClick={() => setShowCreateForm(true)}
                className="w-full py-2 border border-dashed border-[#334155] hover:border-amber-500/50 hover:bg-amber-500/5 text-[#A7B0C2] hover:text-amber-300 text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Cadastrar Nova Sala Adicional
              </button>
            ) : (
              <form onSubmit={handleCreateRoom} className="space-y-3 bg-[#0A0F1D] border border-[#1E293B] p-3.5">
                <div className="flex items-center justify-between pb-1 border-b border-[#1E293B]">
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Plus className="w-3.5 h-3.5 text-amber-400" />
                    Cadastrar Nova Sala
                  </h4>
                  <button
                    type="button"
                    onClick={() => setShowCreateForm(false)}
                    className="text-[#A7B0C2] hover:text-white text-[11px]"
                  >
                    Cancelar
                  </button>
                </div>

                <div className="space-y-2">
                  <div>
                    <label className="block text-[11px] font-bold text-[#A7B0C2] mb-1">
                      E-MAIL / IDENTIFICADOR DA SALA *
                    </label>
                    <input
                      type="text"
                      value={newRoomEmail}
                      onChange={(e) => setNewRoomEmail(e.target.value)}
                      placeholder="ex: setor2@inspecaopronto.com"
                      className="w-full bg-[#0F1726] border border-[#1E293B] focus:border-amber-500 text-white px-3 py-1.5 text-xs outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#A7B0C2] mb-1">
                      NOME EXIBIDO DA SALA (OPCIONAL)
                    </label>
                    <input
                      type="text"
                      value={newRoomName}
                      onChange={(e) => setNewRoomName(e.target.value)}
                      placeholder="ex: Equipe Manutenção Subestações"
                      className="w-full bg-[#0F1726] border border-[#1E293B] focus:border-amber-500 text-white px-3 py-1.5 text-xs outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#A7B0C2] mb-1">
                      DESCRIÇÃO (OPCIONAL)
                    </label>
                    <input
                      type="text"
                      value={newRoomDesc}
                      onChange={(e) => setNewRoomDesc(e.target.value)}
                      placeholder="ex: Registros do setor norte e subestações"
                      className="w-full bg-[#0F1726] border border-[#1E293B] focus:border-amber-500 text-white px-3 py-1.5 text-xs outline-none"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowCreateForm(false)}
                    className="px-3 py-1.5 bg-[#0F1726] border border-[#1E293B] text-[#A7B0C2] hover:text-white text-xs font-semibold"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isCreating}
                    className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-black text-xs font-black flex items-center gap-1.5 transition-colors"
                  >
                    {isCreating ? (
                      <>
                        <RefreshCw className="w-3 h-3 animate-spin" />
                        Cadastrando...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Salvar e Conectar à Sala
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-[#0A0F1D] px-4 sm:px-6 py-3 border-t border-[#1E293B] flex items-center justify-between">
          <span className="text-[11px] text-[#A7B0C2] flex items-center gap-1">
            <Globe className="w-3 h-3 text-amber-400" />
            Centralizador Multi-Acesso
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#1E293B] hover:bg-[#334155] text-white text-xs font-bold transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
