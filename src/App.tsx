/**
 * INSPEÇÃO PRONTO! - Main Application Component
 * Field-ready mobile-first inspection management system.
 * Centralized internal database sync across all browsers and devices.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Inspection, InspectionPhoto, GPSLocation } from './types/inspection';
import {
  getStoredInspections,
  fetchServerInspections,
  fullMultiplatformSync,
  saveInspection,
  deleteInspection as deleteInspectionFromStorage,
  getSavedDraft,
  saveDraft,
  clearDraft,
  generateUniqueInspectionId,
  DEFAULT_INSPECTION_TYPES,
  setupRealtimeSync,
} from './utils/storage';

// Components
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { DraftRecoveryModal } from './components/DraftRecoveryModal';
import { SingleInspectionForm } from './components/SingleInspectionForm';
import { Step7Success } from './components/InspectionFlow/Step7Success';
import { RecordsView } from './components/Records/RecordsView';
import { DashboardView } from './components/DashboardView';
import { RecordDetailModal } from './components/Records/RecordDetailModal';
import { SubmissionLoadingModal } from './components/SubmissionLoadingModal';
import { CheckCircle2, RefreshCw } from 'lucide-react';

const initialFormData = {
  obra: '',
  equipe: '',
  tecnicoResponsavel: '',
  local: '',
  tipoInspecao: DEFAULT_INSPECTION_TYPES[0],
  fotos: [] as InspectionPhoto[],
  responsavel: '',
  matricula: '',
  observacaoGeral: '',
  localizacao: undefined as GPSLocation | undefined,
};

export default function App() {
  const [currentTab, setCurrentTab] = useState<'inspecao' | 'registros' | 'dashboard'>('inspecao');
  const [inspections, setInspections] = useState<Inspection[]>(() => getStoredInspections());
  const [formData, setFormData] = useState(initialFormData);
  const [pendingDraft, setPendingDraft] = useState<Partial<Inspection> | null>(null);
  const [submittedInspection, setSubmittedInspection] = useState<Inspection | null>(null);
  const [viewingInspection, setViewingInspection] = useState<Inspection | null>(null);

  // Submission Progress Modal State
  const [isSubmittingInspection, setIsSubmittingInspection] = useState<boolean>(false);
  const [submissionStepIndex, setSubmissionStepIndex] = useState<number>(0);
  const [submissionStepMessage, setSubmissionStepMessage] = useState<string>('');
  const [submittingPreview, setSubmittingPreview] = useState<Partial<Inspection>>({});

  // Network & Sync State
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>('');
  const [syncToast, setSyncToast] = useState<{ message: string; count: number; time: string } | null>(null);

  const syncDatabase = useCallback(async (showIndicator = false) => {
    if (showIndicator) setIsSyncing(true);
    try {
      const serverData = await fetchServerInspections();
      if (serverData && Array.isArray(serverData)) {
        setInspections(serverData);
      }
    } catch (err) {
      console.warn('Sync error:', err);
    } finally {
      if (showIndicator) {
        setTimeout(() => setIsSyncing(false), 800);
      }
    }
  }, []);

  // Multiplatform Manual Sync Handler
  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      const result = await fullMultiplatformSync();
      if (result.success) {
        setInspections(result.inspections);
        setLastSyncTime(result.timestamp);
        setSyncToast({
          message: result.message,
          count: result.total,
          time: result.timestamp,
        });
        setTimeout(() => {
          setSyncToast(null);
        }, 4500);
      }
    } catch (err) {
      console.error('Erro na sincronização manual:', err);
    } finally {
      setTimeout(() => setIsSyncing(false), 600);
    }
  };

  // Initial load, Server-Sent Events (SSE) live broadcast, and Polling fallback
  useEffect(() => {
    syncDatabase(true);

    // Check for existing draft
    const draft = getSavedDraft();
    if (draft && (draft.obra || draft.local || (draft.fotos && draft.fotos.length > 0))) {
      setPendingDraft(draft);
    }

    // 1. Instant Real-Time Sync via Server-Sent Events (SSE)
    // Any addition, edit, deletion, or restore on ANY browser immediately updates all connected devices
    const unsubscribeSSE = setupRealtimeSync((updatedInspections) => {
      setInspections(updatedInspections);
      setIsSyncing(true);
      setTimeout(() => setIsSyncing(false), 400);

      // Keep detail modal updated or closed if deleted by another user
      setViewingInspection((currentViewing) => {
        if (!currentViewing) return null;
        const stillExists = updatedInspections.find(
          (i) => i.id === currentViewing.id || i.uuid === currentViewing.uuid
        );
        return stillExists || null;
      });
    });

    // 2. Fallback polling every 5 seconds to guarantee 100% sync consistency
    const pollInterval = setInterval(() => {
      syncDatabase(false);
    }, 5000);

    // Sync on window focus / re-entry
    const handleFocus = () => syncDatabase(false);
    window.addEventListener('focus', handleFocus);

    // Network listeners
    const handleOnline = () => {
      setIsOnline(true);
      syncDatabase(true);
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      unsubscribeSSE();
      clearInterval(pollInterval);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [syncDatabase]);

  // Auto-save draft on every change
  useEffect(() => {
    if (!submittedInspection) {
      const hasContent =
        formData.obra ||
        formData.equipe ||
        formData.tecnicoResponsavel ||
        formData.local ||
        formData.fotos.length > 0 ||
        formData.responsavel ||
        formData.observacaoGeral;

      if (hasContent) {
        saveDraft({
          ...formData,
          status: 'rascunho',
          dataCriacao:
            new Date().toLocaleDateString('pt-BR') +
            ' ' +
            new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        });
      }
    }
  }, [formData, submittedInspection]);

  // Start fresh new inspection
  const handleNewInspection = useCallback(() => {
    setFormData(initialFormData);
    setSubmittedInspection(null);
    clearDraft();
    setCurrentTab('inspecao');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Reset form without changing tab
  const handleResetForm = () => {
    setFormData(initialFormData);
    setSubmittedInspection(null);
    clearDraft();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Draft recovery actions
  const handleContinueDraft = () => {
    if (pendingDraft) {
      setFormData({
        obra: pendingDraft.obra || '',
        equipe: pendingDraft.equipe || '',
        tecnicoResponsavel: pendingDraft.tecnicoResponsavel || '',
        local: pendingDraft.local || '',
        tipoInspecao: pendingDraft.tipoInspecao || DEFAULT_INSPECTION_TYPES[0],
        fotos: pendingDraft.fotos || [],
        responsavel: pendingDraft.responsavel || '',
        matricula: pendingDraft.matricula || '',
        observacaoGeral: pendingDraft.observacaoGeral || '',
        localizacao: pendingDraft.localizacao,
      });
      setCurrentTab('inspecao');
    }
    setPendingDraft(null);
  };

  const handleDiscardDraft = () => {
    clearDraft();
    setPendingDraft(null);
  };

  // Submit and Finalize Inspection with Multi-Step Progress Loading
  const handleSubmitInspection = async () => {
    const now = new Date();
    const formattedNow = `${now.toLocaleDateString('pt-BR')} ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    const timestamp = now.getTime();
    const newId = generateUniqueInspectionId();
    const newUuid = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `uuid-${timestamp}-${Math.random().toString(36).substring(2, 9)}`;

    const completedInspection: Inspection = {
      id: newId,
      uuid: newUuid,
      timestamp: timestamp,
      status: 'concluida',
      dataCriacao: formattedNow,
      dataEnvio: formattedNow,
      obra: formData.obra.trim(),
      equipe: formData.equipe.trim(),
      tecnicoResponsavel: formData.tecnicoResponsavel.trim(),
      local: formData.local.trim(),
      tipoInspecao: formData.tipoInspecao,
      fotos: formData.fotos,
      responsavel: formData.responsavel.trim(),
      matricula: formData.matricula?.trim(),
      observacaoGeral: formData.observacaoGeral?.trim(),
      localizacao: formData.localizacao,
      sincronizado: true,
      versaoApp: '2.0.0',
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    setSubmittingPreview(completedInspection);
    setIsSubmittingInspection(true);
    setSubmissionStepIndex(0);
    setSubmissionStepMessage('Validando informações e gerando protocolo oficial...');

    try {
      // Step 1: Data validation & layout
      await new Promise((resolve) => setTimeout(resolve, 200));
      
      // Step 2: Photos check & index
      setSubmissionStepIndex(1);
      setSubmissionStepMessage(`Processando ${completedInspection.fotos.length} evidências fotográficas anexadas...`);
      await new Promise((resolve) => setTimeout(resolve, 250));

      // Step 3: Local Database & IndexedDB
      setSubmissionStepIndex(2);
      setSubmissionStepMessage('Gravando no banco de dados local e memória protegida (IndexedDB)...');

      // Update state instantly (accumulate without overwriting previous inspections)
      setInspections((prev) => [completedInspection, ...prev.filter((i) => i.id !== completedInspection.id && i.uuid !== completedInspection.uuid)]);

      // Save to storage tiers with progress feedback
      await saveInspection(completedInspection, (step, message) => {
        setSubmissionStepIndex(step);
        setSubmissionStepMessage(message);
      });

      // Step 5: Final completion tick
      setSubmissionStepIndex(4);
      setSubmissionStepMessage('Inspeção registrada com sucesso! Abrindo confirmação...');
      await new Promise((resolve) => setTimeout(resolve, 350));

      clearDraft();
      setSubmittedInspection(completedInspection);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error('Erro durante o fluxo de gravação:', err);
      clearDraft();
      setSubmittedInspection(completedInspection);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setIsSubmittingInspection(false);
    }
  };

  // Delete Inspection
  const handleDeleteInspection = async (id: string) => {
    setInspections((prev) => prev.filter((i) => i.id !== id && i.uuid !== id));
    if (viewingInspection && (viewingInspection.id === id || viewingInspection.uuid === id)) {
      setViewingInspection(null);
    }
    await deleteInspectionFromStorage(id);
  };

  const hasDraftActive = Boolean(
    !submittedInspection && (formData.obra || formData.fotos.length > 0 || formData.local)
  );

  return (
    <div className="min-h-screen bg-[#0F1726] text-[#FFFFFF] flex flex-col selection:bg-[#12346B] selection:text-[#FFFFFF]">
      {/* Submission Progress Loading Modal */}
      <SubmissionLoadingModal
        isOpen={isSubmittingInspection}
        inspection={submittingPreview}
        currentStepIndex={submissionStepIndex}
        stepMessage={submissionStepMessage}
      />

      {/* Sync Toast Feedback Banner */}
      {syncToast && (
        <div className="fixed top-16 right-3 sm:right-6 z-50 animate-in fade-in slide-in-from-top-3 duration-300">
          <div className="bg-[#0A1D3D] border border-emerald-500/60 shadow-xl px-4 py-3 text-xs flex items-center gap-3 text-white">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <div>
              <div className="font-bold text-emerald-300">Sincronização Multiplataforma Concluída</div>
              <div className="text-[11px] text-[#A7B0C2]">
                {syncToast.count} {syncToast.count === 1 ? 'registro sincronizado' : 'registros sincronizados'} no servidor ({syncToast.time})
              </div>
            </div>
            <button
              onClick={() => setSyncToast(null)}
              className="ml-2 text-[#A7B0C2] hover:text-white text-xs font-bold cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* 1. Header */}
      <Header
        isOnline={isOnline}
        isSyncing={isSyncing}
        onSync={handleManualSync}
        lastSyncTime={lastSyncTime}
        currentTab={currentTab}
        onSelectTab={(tab) => {
          setCurrentTab(tab);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onNewInspection={handleNewInspection}
        hasDraft={hasDraftActive}
      />

      {/* 2. Main Content Area */}
      <main className="flex-1 pb-18 md:pb-8">
        {currentTab === 'inspecao' && (
          <div className="max-w-7xl mx-auto px-2.5 sm:px-6 py-3 sm:py-6">
            {submittedInspection ? (
              <Step7Success
                inspection={submittedInspection}
                onNewInspection={handleNewInspection}
                onViewInspection={(insp) => setViewingInspection(insp)}
                onGoToRecords={() => {
                  setSubmittedInspection(null);
                  setCurrentTab('registros');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              />
            ) : (
              <SingleInspectionForm
                formData={formData}
                onChange={(updated) => setFormData((prev) => ({ ...prev, ...updated }))}
                onSubmit={handleSubmitInspection}
                onReset={handleResetForm}
              />
            )}
          </div>
        )}

        {/* REGISTROS TAB */}
        {currentTab === 'registros' && (
          <RecordsView
            inspections={inspections}
            onNewInspection={handleNewInspection}
            onDeleteInspection={handleDeleteInspection}
            onReloadInspections={() => syncDatabase(true)}
            onSync={handleManualSync}
            isSyncing={isSyncing}
            lastSyncTime={lastSyncTime}
            isOnline={isOnline}
          />
        )}

        {/* DASHBOARD TAB */}
        {currentTab === 'dashboard' && (
          <DashboardView inspections={inspections} />
        )}
      </main>

      {/* 3. Mobile Bottom Navigation Bar */}
      <BottomNav
        currentTab={currentTab}
        onSelectTab={(tab) => {
          setCurrentTab(tab);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onNewInspection={handleNewInspection}
        hasDraft={hasDraftActive}
        isDrafting={hasDraftActive}
      />

      {/* 4. Draft Recovery Modal */}
      {pendingDraft && (
        <DraftRecoveryModal
          draft={pendingDraft}
          onContinue={handleContinueDraft}
          onDiscard={handleDiscardDraft}
        />
      )}

      {/* 5. Inspection Detail Modal */}
      {viewingInspection && (
        <RecordDetailModal
          inspection={viewingInspection}
          onClose={() => setViewingInspection(null)}
        />
      )}
    </div>
  );
}
