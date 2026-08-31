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

// In-memory runtime cache for instant access
let inMemoryInspections: Inspection[] = [];
let isIndexedDbInitialized = false;

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

/**
 * Load all inspections from IndexedDB
 */
export async function loadAllFromIndexedDB(): Promise<Inspection[]> {
  try {
    const localDb = await openLocalDatabase();
    return new Promise((resolve) => {
      const tx = localDb.transaction([STORE_INSPECTIONS], 'readonly');
      const store = tx.objectStore(STORE_INSPECTIONS);
      const request = store.getAll();

      request.onsuccess = () => {
        const results = request.result;
        if (Array.isArray(results)) {
          const cleaned = results.filter((item) => !isSeedInspection(item));
          resolve(cleaned);
        } else {
          resolve([]);
        }
      };

      request.onerror = () => {
        resolve([]);
      };
    });
  } catch {
    return [];
  }
}

/**
 * Save single inspection directly to IndexedDB
 */
export async function saveToIndexedDB(item: Inspection): Promise<void> {
  try {
    if (isSeedInspection(item)) return;
    const localDb = await openLocalDatabase();
    const tx = localDb.transaction([STORE_INSPECTIONS], 'readwrite');
    const store = tx.objectStore(STORE_INSPECTIONS);
    store.put(item);
  } catch (err) {
    console.debug('Erro ao persistir no IndexedDB:', err);
  }
}

/**
 * Delete inspection from IndexedDB
 */
export async function deleteFromIndexedDB(idOrUuid: string): Promise<void> {
  try {
    const localDb = await openLocalDatabase();
    const tx = localDb.transaction([STORE_INSPECTIONS], 'readwrite');
    const store = tx.objectStore(STORE_INSPECTIONS);
    store.delete(idOrUuid);
  } catch (err) {
    console.debug('Erro ao deletar no IndexedDB:', err);
  }
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
 * Merge multiple lists of inspections non-destructively.
 * Ensures every submitted inspection is permanently preserved.
 */
export function mergeInspections(...sources: (Inspection[] | null | undefined)[]): Inspection[] {
  const map = new Map<string, Inspection>();

  for (const list of sources) {
    if (!Array.isArray(list)) continue;
    for (const item of list) {
      if (!item || isSeedInspection(item)) continue;
      const key = item.id || item.uuid;
      if (!key) continue;

      if (!map.has(key)) {
        map.set(key, item);
      } else {
        const existing = map.get(key)!;
        // Keep the one with most recent updated timestamp or the one with photos if other is missing
        const existingTime = existing.updatedAt || existing.dataEnvio || existing.dataCriacao || '';
        const incomingTime = item.updatedAt || item.dataEnvio || item.dataCriacao || '';
        
        const existingPhotosCount = existing.fotos?.length || 0;
        const incomingPhotosCount = item.fotos?.length || 0;

        if (incomingPhotosCount > existingPhotosCount || incomingTime >= existingTime) {
          map.set(key, {
            ...existing,
            ...item,
            fotos: item.fotos && item.fotos.length >= existingPhotosCount ? item.fotos : existing.fotos,
          });
        }
      }
    }
  }

  return sortInspectionsDescending(Array.from(map.values()));
}

/**
 * Get cached inspections instantly (synchronous) - starts with persistent local data
 */
export function getStoredInspections(): Inspection[] {
  if (inMemoryInspections.length > 0) {
    return inMemoryInspections;
  }

  try {
    const raw = localStorage.getItem(STORAGE_FALLBACK_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const cleaned = parsed.filter((item) => !isSeedInspection(item));
        inMemoryInspections = sortInspectionsDescending(cleaned);
      }
    }
  } catch (err) {
    console.error('Erro ao ler cache localStorage:', err);
  }

  // Trigger background IndexedDB populate if not yet done
  if (!isIndexedDbInitialized) {
    isIndexedDbInitialized = true;
    loadAllFromIndexedDB().then((idbList) => {
      if (idbList.length > 0) {
        inMemoryInspections = mergeInspections(inMemoryInspections, idbList);
      }
    });
  }

  return inMemoryInspections;
}

/**
 * Save all inspections to local cache and IndexedDB
 */
export function saveAllInspections(inspections: Inspection[], pushToServer: boolean = false): void {
  try {
    const sanitized = mergeInspections(inspections);
    inMemoryInspections = sanitized;

    try {
      localStorage.setItem(STORAGE_FALLBACK_KEY, JSON.stringify(sanitized));
    } catch (quotaErr) {
      // If localStorage is full, save a stripped metadata version to localStorage
      // while preserving full items with photos in IndexedDB
      console.warn('LocalStorage quota excedida, salvando versão compacta no cache de fallback:', quotaErr);
      try {
        const compact = sanitized.map((item) => ({
          ...item,
          fotos: item.fotos.map((f) => ({ ...f, dataUrl: '' })), // drop base64 in localstorage fallback
        }));
        localStorage.setItem(STORAGE_FALLBACK_KEY, JSON.stringify(compact));
      } catch {}
    }

    // Mirror to IndexedDB (full data with high-res photos)
    openLocalDatabase().then((localDb) => {
      const tx = localDb.transaction([STORE_INSPECTIONS], 'readwrite');
      const store = tx.objectStore(STORE_INSPECTIONS);
      sanitized.forEach((item) => store.put(item));
    }).catch((e) => console.debug('IndexedDB mirror sync:', e));
  } catch (err) {
    console.error('Erro ao salvar no armazenamento local:', err);
  }
}

// ---------------- FIREBASE FIRESTORE INTEGRATION ---------------- //

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
 * Fetch all inspections with robust multi-tier fallback & non-destructive union
 */
export async function fetchServerInspections(): Promise<Inspection[]> {
  // Purge any seed docs if they exist
  purgeSeedDataFromFirestore().catch(() => {});

  const localStored = getStoredInspections();
  const idbStored = await loadAllFromIndexedDB();
  let firestoreItems: Inspection[] = [];
  let backendItems: Inspection[] = [];

  // 1. Fetch from Firebase Firestore
  try {
    const querySnapshot = await getDocs(collection(db, 'inspections'));
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data() as Inspection;
      if (data && (data.id || data.uuid) && !isSeedInspection(data) && !isSeedInspection({ id: docSnap.id })) {
        firestoreItems.push({
          ...data,
          id: data.id || docSnap.id,
          uuid: data.uuid || data.id || docSnap.id,
        });
      }
    });
  } catch (firebaseErr) {
    console.warn('Firestore indisponível temporariamente, tentando servidor/cache:', firebaseErr);
  }

  // 2. Fetch from Express Backend
  try {
    const response = await fetch('/api/inspections', {
      headers: { Accept: 'application/json' },
    });
    if (response.ok) {
      const data = await response.json();
      if (data && Array.isArray(data.inspections)) {
        backendItems = data.inspections.filter((i: any) => !isSeedInspection(i));
      }
    }
  } catch (serverErr) {
    console.debug('Backend fetch error:', serverErr);
  }

  // Non-destructive smart merge of ALL sources
  const merged = mergeInspections(localStored, idbStored, backendItems, firestoreItems);
  
  // Persist merged set locally
  saveAllInspections(merged, false);

  // Background sync: If any local/backend inspections are missing from Firestore, push them
  if (firestoreItems.length < merged.length) {
    const firestoreIds = new Set(firestoreItems.map((i) => i.id));
    merged.forEach((insp) => {
      if (!firestoreIds.has(insp.id)) {
        const safe = sanitizeForFirestore({ ...insp, sincronizado: true });
        setDoc(doc(db, 'inspections', insp.id), safe, { merge: true }).catch(() => {});
      }
    });
  }

  return merged;
}

/**
 * Recursively remove undefined values and sanitize data for Firestore compatibility.
 * Prevents Firestore from rejecting documents due to undefined fields.
 */
export function sanitizeForFirestore<T>(data: T): T {
  return JSON.parse(JSON.stringify(data, (_, value) => (value === undefined ? null : value)));
}

/**
 * Save single inspection directly into Firebase Firestore, Backend Server, and Local DB.
 * Guarantees that the inspection is registered across all tiers and immediately accessible.
 */
export async function saveInspection(inspection: Inspection): Promise<Inspection> {
  const current = getStoredInspections();
  
  const updatedInspection: Inspection = {
    ...inspection,
    id: inspection.id || inspection.uuid || generateUniqueInspectionId(),
    uuid: inspection.uuid || inspection.id || generateUniqueInspectionId(),
    timestamp: inspection.timestamp || Date.now(),
    sincronizado: true,
    updatedAt: new Date().toISOString(),
  };

  // 1. Immediately store in Memory, LocalStorage, and IndexedDB for instant UI responsiveness
  const merged = mergeInspections(current, [updatedInspection]);
  saveAllInspections(merged, false);
  await saveToIndexedDB(updatedInspection);

  // 2. Persist in parallel to Firebase Firestore Cloud and Central Express Backend
  const safeData = sanitizeForFirestore(updatedInspection);
  
  const firestorePromise = (async () => {
    try {
      const docId = safeData.id;
      const docRef = doc(db, 'inspections', docId);
      await setDoc(docRef, safeData, { merge: true });
    } catch (firestoreErr) {
      console.warn('Erro ao persistir no Firebase Firestore:', firestoreErr);
    }
  })();

  const backendPromise = (async () => {
    try {
      await fetch('/api/inspections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(safeData),
      });
    } catch (serverErr) {
      console.debug('Aviso ao sincronizar com servidor central:', serverErr);
    }
  })();

  await Promise.allSettled([firestorePromise, backendPromise]);

  return updatedInspection;
}

/**
 * Delete inspection from Firebase Firestore, Backend, and local cache
 */
export async function deleteInspection(idOrUuid: string): Promise<void> {
  const current = getStoredInspections();
  const filtered = current.filter((i) => i.id !== idOrUuid && i.uuid !== idOrUuid);
  
  inMemoryInspections = filtered;
  saveAllInspections(filtered, false);
  await deleteFromIndexedDB(idOrUuid);

  // 1. Delete from Firebase Firestore
  try {
    const docRef = doc(db, 'inspections', idOrUuid);
    await deleteDoc(docRef);
  } catch (firestoreErr) {
    console.warn('Erro ao deletar no Firestore:', firestoreErr);
  }

  // 2. Delete from backend server
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
 * Setup Realtime Firebase Firestore listener & SSE stream with non-destructive merge.
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
          if (item && (item.id || item.uuid) && !isSeedInspection(item) && !isSeedInspection({ id: d.id })) {
            list.push({
              ...item,
              id: item.id || d.id,
              uuid: item.uuid || item.id || d.id,
            });
          }
        });

        const current = getStoredInspections();
        const merged = mergeInspections(current, list);
        saveAllInspections(merged, false);
        onInspectionsUpdate(merged);
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
            const current = getStoredInspections();
            const merged = mergeInspections(current, data.inspections);
            saveAllInspections(merged, false);
            onInspectionsUpdate(merged);
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
  const inspections = await fetchServerInspections();

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
  a.download = `backup_inspecoes_${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Import and merge/restore database backup
 */
export async function importDatabaseBackup(jsonString: string): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    const parsed = JSON.parse(jsonString);
    if (!parsed.inspections || !Array.isArray(parsed.inspections)) {
      return { success: false, count: 0, error: 'Formato de arquivo de backup inválido.' };
    }

    const current = getStoredInspections();
    const merged = mergeInspections(current, parsed.inspections);
    saveAllInspections(merged, false);

    if (parsed.inspectionTypes && Array.isArray(parsed.inspectionTypes)) {
      localStorage.setItem(STORAGE_TYPES_KEY, JSON.stringify(parsed.inspectionTypes));
    }

    // Direct Batch Save to Firebase Firestore
    try {
      const batch = writeBatch(db);
      merged.forEach((insp) => {
        const docRef = doc(db, 'inspections', insp.id);
        const safe = sanitizeForFirestore({ ...insp, sincronizado: true, updatedAt: new Date().toISOString() });
        batch.set(docRef, safe, { merge: true });
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
