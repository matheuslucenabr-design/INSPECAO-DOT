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
  saveInspection,
  deleteInspection as deleteInspectionFromStorage,
  getSavedDraft,
  saveDraft,
  clearDraft,
  generateInspectionId,
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

  // Network & Sync State
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

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

  // Submit and Finalize Inspection
  const handleSubmitInspection = async () => {
    const now = new Date();
    const formattedNow = `${now.toLocaleDateString('pt-BR')} ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;

    const newId = generateInspectionId(inspections.length);
    const completedInspection: Inspection = {
      id: newId,
      uuid: `uuid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
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
    };

    // Update state instantly and persist to system central database
    setInspections((prev) => [completedInspection, ...prev]);
    await saveInspection(completedInspection);
    clearDraft();
    setSubmittedInspection(completedInspection);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Delete Inspection
  const handleDeleteInspection = async (id: string) => {
    setInspections((prev) => prev.filter((i) => i.id !== id));
    await deleteInspectionFromStorage(id);
    if (viewingInspection && viewingInspection.id === id) {
      setViewingInspection(null);
    }
  };

  const hasDraftActive = Boolean(
    !submittedInspection && (formData.obra || formData.fotos.length > 0 || formData.local)
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-sky-500 selection:text-white">
      {/* 1. Header */}
      <Header
        isOnline={isOnline}
        isSyncing={isSyncing}
        currentTab={currentTab}
        onSelectTab={(tab) => {
          setCurrentTab(tab);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onNewInspection={handleNewInspection}
        hasDraft={hasDraftActive}
      />

      {/* 2. Main Content Area */}
      <main className="flex-1 pb-20 md:pb-8">
        {currentTab === 'inspecao' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
            {submittedInspection ? (
              <Step7Success
                inspection={submittedInspection}
                onNewInspection={handleNewInspection}
                onViewInspection={(insp) => setViewingInspection(insp)}
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
