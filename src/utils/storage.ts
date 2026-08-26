/**
 * Firebase Firestore Persistence & Storage Engine for INSPEÇÃO PRONTO!
 * Direct real-time cloud sync with Firebase Firestore + local cache (IndexedDB + localStorage)
 * ensuring 100% offline resilience and instant multi-device synchronization.
 */

import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
  onSnapshot,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../firebase';
import { Inspection } from '../types/inspection';
import { createPlaceholderPhotoUrl } from './imageProcessor';

const DB_NAME = 'inspecao_pronto_local_db_v2';
const DB_VERSION = 1;
const STORE_INSPECTIONS = 'inspections';
const STORE_CONFIG = 'app_config';

const STORAGE_FALLBACK_KEY = 'inspecao_pronto_records_v1';
const STORAGE_DRAFT_KEY = 'inspecao_pronto_draft_v1';
const STORAGE_TYPES_KEY = 'inspecao_pronto_types_v1';

export const DEFAULT_INSPECTION_TYPES = [
  'Inspeção Pós-Serviço',
  'Inspeção de Atividades',
  'Inspeção de Luminárias',
  'Inspeção de Redes',
  'Inspeção de Redes Compartilhadas',
  'Inspeção de 5S',
];

export const DEFAULT_TEAMS = ['EBP01', 'EBP02', 'EQUIPE-ALFA', 'EQUIPE-BETA', 'MANUT-01', 'OBRA-EXP-04'];

export const DEFAULT_SITES = [
  'Subestação Norte - SE-01',
  'Parque Solar Alvorada',
  'Complexo Industrial Delta',
  'Linha de Transmissão LT-230kV',
  'Rede Subterrânea Centro',
  'Galpão Logístico Eixo Sul',
];

/**
 * Sequential ID generator: INS-YYYY-NNNNNN
 */
export function generateInspectionId(existingCount: number = 0): string {
  const currentYear = new Date().getFullYear();
  const sequence = String(existingCount + 1).padStart(6, '0');
  return `INS-${currentYear}-${sequence}`;
}

/**
 * Initialize IndexedDB instance for local offline cache
 */
function openLocalDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB não suportado no ambiente'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const dbInstance = (event.target as IDBOpenDBRequest).result;
      if (!dbInstance.objectStoreNames.contains(STORE_INSPECTIONS)) {
        const store = dbInstance.createObjectStore(STORE_INSPECTIONS, { keyPath: 'id' });
        store.createIndex('uuid', 'uuid', { unique: true });
        store.createIndex('dataCriacao', 'dataCriacao', { unique: false });
        store.createIndex('tipoInspecao', 'tipoInspecao', { unique: false });
      }
      if (!dbInstance.objectStoreNames.contains(STORE_CONFIG)) {
        dbInstance.createObjectStore(STORE_CONFIG, { keyPath: 'key' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Initial Demo Inspections Seed
 */
function createInitialSeedData(): Inspection[] {
  const photo1 = createPlaceholderPhotoUrl('Subestação Norte', 'Painel Geral de Baixa Tensão QGBT-01');
  const photo2 = createPlaceholderPhotoUrl('Subestação Norte', 'Barramento e conexões isoladas');
  const photo3 = createPlaceholderPhotoUrl('Rede Aérea Centro', 'Fixação de luminária LED 150W');

  return [
    {
      id: 'INS-2026-000152',
      uuid: 'seed-uuid-1',
      status: 'concluida',
      dataCriacao: '25/08/2026 14:15',
      dataEnvio: '25/08/2026 15:47',
      obra: 'Subestação Norte',
      equipe: 'EBP01',
      tecnicoResponsavel: 'João Silva',
      local: 'Sala Elétrica 03 - Painéis MT/BT',
      tipoInspecao: 'Inspeção Pós-Serviço',
      responsavel: 'João Silva',
      matricula: 'TEC-9842',
      observacaoGeral: 'Inspeção pós-manutenção concluída. Todos os circuitos restabelecidos e torqueamento de barramentos verificado conforme norma técnica.',
      localizacao: {
        latitude: -23.55052,
        longitude: -46.633308,
        precisao: 8,
        dataCaptura: '25/08/2026 às 14:20',
        endereco: 'Av. Paulista, 1000 - Bela Vista, São Paulo - SP',
      },
      fotos: [
        {
          id: 'photo-1',
          numero: 1,
          dataUrl: photo1,
          legenda: 'Identificação e sinalização de segurança do painel QGBT-01 conferidas.',
          dataUpload: '25/08/2026 14:22',
          largura: 800,
          altura: 600,
          tamanhoKb: 84,
          nomeArquivo: 'foto_painel_qgbt.jpg',
        },
        {
          id: 'photo-2',
          numero: 2,
          dataUrl: photo2,
          legenda: 'Barramentos principais com aperto conferido e etiquetas de calibração.',
          dataUpload: '25/08/2026 14:25',
          largura: 800,
          altura: 600,
          tamanhoKb: 92,
          nomeArquivo: 'foto_barramento.jpg',
        },
      ],
      sincronizado: true,
      versaoApp: '2.0.0',
    },
    {
      id: 'INS-2026-000151',
      uuid: 'seed-uuid-2',
      status: 'concluida',
      dataCriacao: '25/08/2026 09:30',
      dataEnvio: '25/08/2026 10:12',
      obra: 'Rede Urbana Setor Leste',
      equipe: 'EQUIPE-ALFA',
      tecnicoResponsavel: 'Mariana Costa',
      local: 'Poste P-44 / Av. Central',
      tipoInspecao: 'Inspeção de Luminárias',
      responsavel: 'Mariana Costa',
      matricula: 'ENG-3310',
      observacaoGeral: 'Substituição de luminárias por modelo LED de alta eficiência. Teste de acendimento realizado com sucesso.',
      localizacao: {
        latitude: -22.906847,
        longitude: -43.172896,
        precisao: 12,
        dataCaptura: '25/08/2026 às 09:35',
        endereco: 'Rua Primeiro de Março, Centro, Rio de Janeiro - RJ',
      },
      fotos: [
        {
          id: 'photo-3',
          numero: 1,
          dataUrl: photo3,
          legenda: 'Luminária LED devidamente alinhada no braço metálico e com conector estanque.',
          dataUpload: '25/08/2026 09:40',
          largura: 800,
          altura: 600,
          tamanhoKb: 78,
          nomeArquivo: 'luminaria_poste44.jpg',
        },
      ],
      sincronizado: true,
      versaoApp: '2.0.0',
    },
  ];
}

// ---------------- LOCALSTORAGE & INDEXEDDB CACHE ---------------- //

/**
 * Get cached inspections instantly (synchronous)
 */
export function getStoredInspections(): Inspection[] {
  try {
    const raw = localStorage.getItem(STORAGE_FALLBACK_KEY);
    if (!raw) {
      const initial = createInitialSeedData();
      saveAllInspections(initial, false);
      return initial;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      const initial = createInitialSeedData();
      saveAllInspections(initial, false);
      return initial;
    }
    return parsed;
  } catch (err) {
    console.error('Erro ao ler cache local:', err);
    return createInitialSeedData();
  }
}

/**
 * Save all inspections to local cache and IndexedDB
 */
export function saveAllInspections(inspections: Inspection[], pushToServer: boolean = true): void {
  try {
    localStorage.setItem(STORAGE_FALLBACK_KEY, JSON.stringify(inspections));

    // Mirror to IndexedDB
    openLocalDatabase().then((localDb) => {
      const tx = localDb.transaction([STORE_INSPECTIONS], 'readwrite');
      const store = tx.objectStore(STORE_INSPECTIONS);
      store.clear();
      inspections.forEach((item) => store.put(item));
    }).catch((e) => console.debug('IndexedDB mirror sync:', e));
  } catch (err) {
    console.error('Erro ao salvar no armazenamento local:', err);
  }
}

// ---------------- FIREBASE FIRESTORE INTEGRATION ---------------- //

let hasSeededFirestore = false;

/**
 * Seed initial sample records into Firebase Firestore if empty
 */
async function seedFirestoreIfEmpty(currentCount: number): Promise<void> {
  if (hasSeededFirestore || currentCount > 0) return;
  hasSeededFirestore = true;

  try {
    const seedData = createInitialSeedData();
    const batch = writeBatch(db);
    seedData.forEach((insp) => {
      const docRef = doc(db, 'inspections', insp.id);
      batch.set(docRef, { ...insp, createdAt: new Date().toISOString() });
    });
    await batch.commit();
  } catch (e) {
    console.warn('Erro ao inicializar dados seed no Firestore:', e);
  }
}

/**
 * Fetch all inspections directly from Firebase Firestore with backend fallback
 */
export async function fetchServerInspections(): Promise<Inspection[]> {
  try {
    const querySnapshot = await getDocs(collection(db, 'inspections'));
    const items: Inspection[] = [];
    querySnapshot.forEach((docSnap) => {
      items.push(docSnap.data() as Inspection);
    });

    if (items.length > 0) {
      items.sort((a, b) => (b.id || '').localeCompare(a.id || ''));
      saveAllInspections(items, false);
      return items;
    } else {
      // Seed Firestore with initial sample data so it's ready immediately
      await seedFirestoreIfEmpty(0);
      return getStoredInspections();
    }
  } catch (firebaseErr) {
    console.warn('Firestore indisponível temporariamente, tentando servidor/cache:', firebaseErr);
    
    // Fallback to Express backend if needed
    try {
      const response = await fetch('/api/inspections', {
        headers: { Accept: 'application/json' },
      });
      if (response.ok) {
        const data = await response.json();
        if (data && Array.isArray(data.inspections)) {
          saveAllInspections(data.inspections, false);
          return data.inspections;
        }
      }
    } catch {}
  }
  return getStoredInspections();
}

/**
 * Save single inspection directly into Firebase Firestore & local cache
 */
export async function saveInspection(inspection: Inspection): Promise<void> {
  const current = getStoredInspections();
  const existingIndex = current.findIndex((i) => i.uuid === inspection.uuid || i.id === inspection.id);

  const updatedInspection = {
    ...inspection,
    sincronizado: true,
    updatedAt: new Date().toISOString(),
  };

  if (existingIndex >= 0) {
    current[existingIndex] = updatedInspection;
  } else {
    current.unshift(updatedInspection);
  }

  saveAllInspections(current, false);

  // 1. Direct Firebase Firestore Write
  try {
    const docId = inspection.id || inspection.uuid;
    const docRef = doc(db, 'inspections', docId);
    await setDoc(docRef, updatedInspection, { merge: true });
  } catch (firestoreErr) {
    console.warn('Erro ao salvar no Firestore (mantido no cache local):', firestoreErr);
  }

  // 2. Also notify backend server for SSE/backup synchronization
  try {
    await fetch('/api/inspections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedInspection),
    });
  } catch {}
}

/**
 * Delete inspection from Firebase Firestore and local cache
 */
export async function deleteInspection(idOrUuid: string): Promise<void> {
  const current = getStoredInspections();
  const filtered = current.filter((i) => i.id !== idOrUuid && i.uuid !== idOrUuid);
  saveAllInspections(filtered, false);

  // 1. Delete from Firebase Firestore
  try {
    const docRef = doc(db, 'inspections', idOrUuid);
    await deleteDoc(docRef);
  } catch (firestoreErr) {
    console.warn('Erro ao deletar no Firestore:', firestoreErr);
  }

  // 2. Also notify backend server
  try {
    await fetch(`/api/inspections/${encodeURIComponent(idOrUuid)}`, {
      method: 'DELETE',
    });
  } catch {}
}

// ---------------- DRAFT STORAGE ---------------- //

export function getSavedDraft(): Partial<Inspection> | null {
  try {
    const raw = localStorage.getItem(STORAGE_DRAFT_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveDraft(draft: Partial<Inspection>): void {
  try {
    localStorage.setItem(STORAGE_DRAFT_KEY, JSON.stringify(draft));
  } catch (err) {
    console.error('Erro ao salvar rascunho:', err);
  }
}

export function clearDraft(): void {
  try {
    localStorage.removeItem(STORAGE_DRAFT_KEY);
  } catch (err) {
    console.error('Erro ao limpar rascunho:', err);
  }
}

// ---------------- INSPECTION TYPES & APP CONFIG ---------------- //

export function getStoredInspectionTypes(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_TYPES_KEY);
    if (!raw) return DEFAULT_INSPECTION_TYPES;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_INSPECTION_TYPES;
  } catch {
    return DEFAULT_INSPECTION_TYPES;
  }
}

export async function saveCustomInspectionType(newType: string): Promise<string[]> {
  const current = getStoredInspectionTypes();
  if (!current.includes(newType.trim())) {
    const updated = [...current, newType.trim()];
    try {
      localStorage.setItem(STORAGE_TYPES_KEY, JSON.stringify(updated));
    } catch {}

    // Save to Firebase Firestore config
    try {
      await setDoc(doc(db, 'app_config', 'types'), {
        key: 'types',
        types: updated,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
    } catch (e) {
      console.warn('Erro ao persistir tipos no Firestore:', e);
    }

    try {
      await fetch('/api/types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: newType.trim() }),
      });
    } catch {}

    return updated;
  }
  return current;
}

// ---------------- REALTIME MULTI-CLIENT FIREBASE SYNCHRONIZATION ---------------- //

/**
 * Setup Realtime Firebase Firestore listener to automatically receive additions, deletions,
 * and updates from all users and browsers instantly via WebSocket/gRPC streams.
 */
export function setupRealtimeSync(
  onInspectionsUpdate: (inspections: Inspection[]) => void,
  onTypesUpdate?: (types: string[]) => void
): () => void {
  let unsubscribeFirestore: (() => void) | null = null;
  let unsubscribeTypes: (() => void) | null = null;

  try {
    // 1. Listen to 'inspections' collection in Firestore in real-time
    const inspectionsRef = collection(db, 'inspections');
    unsubscribeFirestore = onSnapshot(
      inspectionsRef,
      (snapshot) => {
        const list: Inspection[] = [];
        snapshot.forEach((d) => {
          const item = d.data() as Inspection;
          if (item && item.id) {
            list.push(item);
          }
        });

        if (list.length > 0) {
          list.sort((a, b) => (b.id || '').localeCompare(a.id || ''));
          saveAllInspections(list, false);
          onInspectionsUpdate(list);
        } else {
          // If Firestore is completely empty on first launch, seed it
          seedFirestoreIfEmpty(0).then(() => {
            onInspectionsUpdate(getStoredInspections());
          });
        }
      },
      (error) => {
        console.warn('Firebase Firestore realtime listener error:', error);
      }
    );

    // 2. Listen to custom types config in Firestore
    const typesDocRef = doc(db, 'app_config', 'types');
    unsubscribeTypes = onSnapshot(
      typesDocRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data && Array.isArray(data.types) && data.types.length > 0) {
            localStorage.setItem(STORAGE_TYPES_KEY, JSON.stringify(data.types));
            if (onTypesUpdate) onTypesUpdate(data.types);
          }
        }
      },
      (error) => {
        console.warn('Firebase Types listener error:', error);
      }
    );
  } catch (e) {
    console.warn('Erro ao inicializar listener Firestore:', e);
  }

  // Also setup SSE listener as secondary sync fallback
  let eventSource: EventSource | null = null;
  if (typeof window !== 'undefined' && 'EventSource' in window) {
    try {
      eventSource = new EventSource('/api/events');
      eventSource.addEventListener('database_update', (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          if (data && Array.isArray(data.inspections)) {
            saveAllInspections(data.inspections, false);
            onInspectionsUpdate(data.inspections);
          }
        } catch {}
      });
    } catch {}
  }

  return () => {
    if (unsubscribeFirestore) unsubscribeFirestore();
    if (unsubscribeTypes) unsubscribeTypes();
    if (eventSource) eventSource.close();
  };
}

// ---------------- BACKUP EXPORT & IMPORT ENGINE ---------------- //

/**
 * Export full system database backup
 */
export async function exportDatabaseBackup(): Promise<void> {
  let inspections = getStoredInspections();
  try {
    const snapshot = await getDocs(collection(db, 'inspections'));
    const firestoreList: Inspection[] = [];
    snapshot.forEach((d) => firestoreList.push(d.data() as Inspection));
    if (firestoreList.length > 0) inspections = firestoreList;
  } catch {}

  const data = {
    appName: 'INSPEÇÃO PRONTO!',
    version: '2.0.0',
    exportDate: new Date().toISOString(),
    firebaseProject: 'steadfast-realm-16rpq',
    inspections,
    inspectionTypes: getStoredInspectionTypes(),
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `backup_inspecoes_firebase_${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Import and merge/restore database backup to Firebase Firestore
 */
export async function importDatabaseBackup(jsonString: string): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    const parsed = JSON.parse(jsonString);
    if (!parsed.inspections || !Array.isArray(parsed.inspections)) {
      return { success: false, count: 0, error: 'Formato de arquivo de backup inválido.' };
    }

    const current = getStoredInspections();
    const map = new Map<string, Inspection>();

    current.forEach((item) => map.set(item.id, item));
    parsed.inspections.forEach((item: Inspection) => {
      if (item.id) map.set(item.id, item);
    });

    const merged = Array.from(map.values()).sort((a, b) => b.id.localeCompare(a.id));
    saveAllInspections(merged, false);

    if (parsed.inspectionTypes && Array.isArray(parsed.inspectionTypes)) {
      localStorage.setItem(STORAGE_TYPES_KEY, JSON.stringify(parsed.inspectionTypes));
    }

    // Direct Batch Save to Firebase Firestore
    try {
      const batch = writeBatch(db);
      merged.forEach((insp) => {
        const docRef = doc(db, 'inspections', insp.id);
        batch.set(docRef, { ...insp, sincronizado: true, updatedAt: new Date().toISOString() }, { merge: true });
      });
      await batch.commit();
    } catch (e) {
      console.warn('Erro ao salvar lote de backup no Firestore:', e);
    }

    // Sync backup with system server
    try {
      await fetch('/api/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inspections: merged,
          inspectionTypes: parsed.inspectionTypes || getStoredInspectionTypes(),
        }),
      });
    } catch {}

    return { success: true, count: parsed.inspections.length };
  } catch (err: any) {
    return { success: false, count: 0, error: err.message || 'Falha ao processar arquivo JSON' };
  }
}
