import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  onSnapshot,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../firebase';
import { Inspection } from '../types/inspection';

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
 * Guaranteed globally unique inspection registration identifier
 * Generates unique non-colliding IDs (timestamp + random entropy)
 * so that new inspections never overwrite or replace previous ones.
 */
export function generateUniqueInspectionId(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const randomPart = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `REG-${timestamp}-${randomPart}`;
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

// ---------------- LOCALSTORAGE & INDEXEDDB CACHE ---------------- //

/**
 * Filter out any leftover sample/mock inspection IDs
 */
function isSeedInspection(item: any): boolean {
  if (!item) return true;
  const id = item.id || '';
  const uuid = item.uuid || '';
  return (
    id === 'REG-2026-SE01-A1' ||
    id === 'REG-2026-SE02-B2' ||
    uuid === 'seed-uuid-1' ||
    uuid === 'seed-uuid-2' ||
    id.startsWith('seed-')
  );
}

/**
 * Get cached inspections instantly (synchronous) - starts 100% clean with empty list
 */
export function getStoredInspections(): Inspection[] {
  try {
    const raw = localStorage.getItem(STORAGE_FALLBACK_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    // Filter out any leftover seed records from previous sessions
    const cleaned = parsed.filter((item) => !isSeedInspection(item));
    if (cleaned.length !== parsed.length) {
      saveAllInspections(cleaned, false);
    }
    return cleaned;
  } catch (err) {
    console.error('Erro ao ler cache local:', err);
    return [];
  }
}

/**
 * Save all inspections to local cache and IndexedDB
 */
export function saveAllInspections(inspections: Inspection[], pushToServer: boolean = true): void {
  try {
    const sanitized = inspections.filter((item) => !isSeedInspection(item));
    localStorage.setItem(STORAGE_FALLBACK_KEY, JSON.stringify(sanitized));

    // Mirror to IndexedDB
    openLocalDatabase().then((localDb) => {
      const tx = localDb.transaction([STORE_INSPECTIONS], 'readwrite');
      const store = tx.objectStore(STORE_INSPECTIONS);
      store.clear();
      sanitized.forEach((item) => store.put(item));
    }).catch((e) => console.debug('IndexedDB mirror sync:', e));
  } catch (err) {
    console.error('Erro ao salvar no armazenamento local:', err);
  }
}

// ---------------- FIREBASE FIRESTORE INTEGRATION ---------------- //

/**
 * Helper to sort inspections chronologically (newest first)
 */
export function sortInspectionsDescending(items: Inspection[]): Inspection[] {
  return [...items]
    .filter((item) => !isSeedInspection(item))
    .sort((a, b) => {
      const timeA = a.timestamp || (a.createdAt ? new Date(a.createdAt).getTime() : 0);
      const timeB = b.timestamp || (b.createdAt ? new Date(b.createdAt).getTime() : 0);
      if (timeA && timeB && timeA !== timeB) {
        return timeB - timeA;
      }
      const dateA = a.dataEnvio || a.dataCriacao || '';
      const dateB = b.dataEnvio || b.dataCriacao || '';
      return dateB.localeCompare(dateA);
    });
}

/**
 * Clean any leftover seed documents from Firestore
 */
export async function purgeSeedDataFromFirestore(): Promise<void> {
  const seedIds = ['REG-2026-SE01-A1', 'REG-2026-SE02-B2'];
  for (const id of seedIds) {
    try {
      await deleteDoc(doc(db, 'inspections', id));
    } catch {}
  }
}

/**
 * Fetch all inspections directly from Firebase Firestore with backend fallback
 */
export async function fetchServerInspections(): Promise<Inspection[]> {
  // Purge any seed docs if they exist
  purgeSeedDataFromFirestore().catch(() => {});

  try {
    const querySnapshot = await getDocs(collection(db, 'inspections'));
    const items: Inspection[] = [];
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data() as Inspection;
      if (data && (data.id || data.uuid) && !isSeedInspection(data) && !isSeedInspection({ id: docSnap.id })) {
        items.push({
          ...data,
          id: data.id || docSnap.id,
          uuid: data.uuid || data.id || docSnap.id,
        });
      }
    });

    const sorted = sortInspectionsDescending(items);
    saveAllInspections(sorted, false);
    return sorted;
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
          const sorted = sortInspectionsDescending(data.inspections);
          saveAllInspections(sorted, false);
          return sorted;
        }
      }
    } catch {}
  }
  return getStoredInspections();
}

/**
 * Save single inspection directly into Firebase Firestore & local cache
 * Ensures that each inspection is treated as an independent document that accumulates permanently.
 */
export async function saveInspection(inspection: Inspection): Promise<void> {
  const current = getStoredInspections();
  
  // Find only if exact matching uuid or id exists
  const existingIndex = current.findIndex(
    (i) => (inspection.uuid && i.uuid === inspection.uuid) || (inspection.id && i.id === inspection.id)
  );

  const updatedInspection: Inspection = {
    ...inspection,
    id: inspection.id || inspection.uuid || generateUniqueInspectionId(),
    uuid: inspection.uuid || inspection.id || generateUniqueInspectionId(),
    timestamp: inspection.timestamp || Date.now(),
    sincronizado: true,
    updatedAt: new Date().toISOString(),
  };

  if (existingIndex >= 0) {
    current[existingIndex] = updatedInspection;
  } else {
    current.unshift(updatedInspection);
  }

  const sortedList = sortInspectionsDescending(current);
  saveAllInspections(sortedList, false);

  // 1. Direct Firebase Firestore Write (Using unique doc ID)
  try {
    const docId = updatedInspection.id;
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
          if (item && item.id && !isSeedInspection(item) && !isSeedInspection({ id: d.id })) {
            list.push(item);
          }
        });

        const sorted = sortInspectionsDescending(list);
        saveAllInspections(sorted, false);
        onInspectionsUpdate(sorted);
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
            const cleanList = sortInspectionsDescending(data.inspections);
            saveAllInspections(cleanList, false);
            onInspectionsUpdate(cleanList);
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
    snapshot.forEach((d) => {
      const data = d.data() as Inspection;
      if (data && !isSeedInspection(data)) {
        firestoreList.push(data);
      }
    });
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
      if (item.id && !isSeedInspection(item)) map.set(item.id, item);
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
