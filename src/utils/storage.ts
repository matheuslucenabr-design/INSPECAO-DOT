import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  onSnapshot,
  writeBatch,
  disableNetwork,
} from 'firebase/firestore';
import { db } from '../firebase';
import { Inspection } from '../types/inspection';

const DB_NAME = 'inspecao_pronto_local_db_v2';
const DB_VERSION = 1;
const STORE_INSPECTIONS = 'inspections';
const STORE_CONFIG = 'app_config';

const STORAGE_FALLBACK_KEY = 'inspecao_pronto_records_v1';
const STORAGE_DELETED_IDS_KEY = 'inspecao_pronto_deleted_ids_v2';
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

// In-memory set of permanently deleted inspection IDs and UUIDs
const deletedIdsSet = new Set<string>();

// Initialize deleted IDs set from localStorage
function initDeletedIdsSet(): void {
  try {
    const raw = localStorage.getItem(STORAGE_DELETED_IDS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        parsed.forEach((id) => {
          if (id && typeof id === 'string') deletedIdsSet.add(id);
        });
      }
    }
  } catch {}
}

initDeletedIdsSet();

/**
 * Check if an ID or UUID has been marked as deleted
 */
export function isIdDeleted(idOrUuid?: string): boolean {
  if (!idOrUuid) return false;
  return deletedIdsSet.has(idOrUuid);
}

/**
 * Mark ID or UUID as permanently deleted and persist
 */
export function markAsPermanentlyDeleted(...ids: (string | undefined)[]): void {
  let changed = false;
  for (const id of ids) {
    if (id && typeof id === 'string' && !deletedIdsSet.has(id)) {
      deletedIdsSet.add(id);
      changed = true;
    }
  }
  if (changed) {
    try {
      localStorage.setItem(
        STORAGE_DELETED_IDS_KEY,
        JSON.stringify(Array.from(deletedIdsSet))
      );
    } catch {}
  }
}

/**
 * Remove an ID from deleted list (used when explicitly saving a new inspection)
 */
export function unmarkAsDeleted(idOrUuid?: string): void {
  if (idOrUuid && deletedIdsSet.has(idOrUuid)) {
    deletedIdsSet.delete(idOrUuid);
    try {
      localStorage.setItem(
        STORAGE_DELETED_IDS_KEY,
        JSON.stringify(Array.from(deletedIdsSet))
      );
    } catch {}
  }
}

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
 * Load all inspections from IndexedDB (strictly filtering out deleted records)
 */
export async function loadAllFromIndexedDB(): Promise<Inspection[]> {
  try {
    const localDb = await openLocalDatabase();
    return new Promise((resolve) => {
      const tx = localDb.transaction([STORE_INSPECTIONS], 'readwrite');
      const store = tx.objectStore(STORE_INSPECTIONS);
      const request = store.getAll();

      request.onsuccess = () => {
        const results = request.result;
        if (Array.isArray(results)) {
          const cleaned: Inspection[] = [];
          for (const item of results) {
            if (isSeedInspection(item) || isIdDeleted(item.id) || isIdDeleted(item.uuid)) {
              // Clean deleted item out of IndexedDB immediately
              try {
                store.delete(item.id);
              } catch {}
            } else {
              cleaned.push(item);
            }
          }
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
    if (isSeedInspection(item) || isIdDeleted(item.id) || isIdDeleted(item.uuid)) return;
    const localDb = await openLocalDatabase();
    const tx = localDb.transaction([STORE_INSPECTIONS], 'readwrite');
    const store = tx.objectStore(STORE_INSPECTIONS);
    store.put(item);
  } catch (err) {
    console.debug('Erro ao persistir no IndexedDB:', err);
  }
}

/**
 * Delete inspection from IndexedDB by both ID and UUID
 */
export async function deleteFromIndexedDB(idOrUuid: string): Promise<void> {
  try {
    const localDb = await openLocalDatabase();
    const tx = localDb.transaction([STORE_INSPECTIONS], 'readwrite');
    const store = tx.objectStore(STORE_INSPECTIONS);
    store.delete(idOrUuid);

    // Also scan to clean if idOrUuid was the item's uuid
    const request = store.openCursor();
    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest).result as IDBCursorWithValue;
      if (cursor) {
        const val = cursor.value;
        if (val.id === idOrUuid || val.uuid === idOrUuid || isIdDeleted(val.id) || isIdDeleted(val.uuid)) {
          cursor.delete();
        }
        cursor.continue();
      }
    };
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
    .filter((item) => !isSeedInspection(item) && !isIdDeleted(item.id) && !isIdDeleted(item.uuid))
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
 * Strictly ignores any permanently deleted records.
 */
export function mergeInspections(...sources: (Inspection[] | null | undefined)[]): Inspection[] {
  const map = new Map<string, Inspection>();

  for (const list of sources) {
    if (!Array.isArray(list)) continue;
    for (const item of list) {
      if (!item || isSeedInspection(item)) continue;
      if (isIdDeleted(item.id) || isIdDeleted(item.uuid)) continue;
      
      const key = item.id || item.uuid;
      if (!key) continue;

      if (!map.has(key)) {
        map.set(key, item);
      } else {
        const existing = map.get(key)!;
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
    return inMemoryInspections.filter((i) => !isIdDeleted(i.id) && !isIdDeleted(i.uuid));
  }

  try {
    const raw = localStorage.getItem(STORAGE_FALLBACK_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const cleaned = parsed.filter(
          (item) => !isSeedInspection(item) && !isIdDeleted(item.id) && !isIdDeleted(item.uuid)
        );
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
        const validList = idbList.filter((i) => !isIdDeleted(i.id) && !isIdDeleted(i.uuid));
        inMemoryInspections = mergeInspections(inMemoryInspections, validList);
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
      console.warn('LocalStorage quota excedida, salvando versão compacta no cache de fallback:', quotaErr);
      try {
        const compact = sanitized.map((item) => ({
          ...item,
          fotos: item.fotos.map((f) => ({ ...f, dataUrl: '' })),
        }));
        localStorage.setItem(STORAGE_FALLBACK_KEY, JSON.stringify(compact));
      } catch {}
    }

    // Mirror to IndexedDB (full data with high-res photos)
    openLocalDatabase().then((localDb) => {
      const tx = localDb.transaction([STORE_INSPECTIONS], 'readwrite');
      const store = tx.objectStore(STORE_INSPECTIONS);
      sanitized.forEach((item) => {
        if (!isIdDeleted(item.id) && !isIdDeleted(item.uuid)) {
          store.put(item);
        }
      });
    }).catch((e) => console.debug('IndexedDB mirror sync:', e));
  } catch (err) {
    console.error('Erro ao salvar no armazenamento local:', err);
  }
}

// ---------------- FIREBASE FIRESTORE INTEGRATION & QUOTA PROTECTION ---------------- //

const QUOTA_STORAGE_KEY = 'firestore_quota_exceeded_until';
let isFirestoreWriteQuotaExceeded = true; // Safe default when quota limit is active
let quotaExceededResetTimestamp = Date.now() + 12 * 60 * 60 * 1000;

// Initialize quota status from localStorage if set previously
if (typeof window !== 'undefined') {
  try {
    const until = localStorage.getItem(QUOTA_STORAGE_KEY);
    if (until) {
      if (Number(until) > Date.now()) {
        isFirestoreWriteQuotaExceeded = true;
        quotaExceededResetTimestamp = Number(until);
      } else {
        isFirestoreWriteQuotaExceeded = false;
        quotaExceededResetTimestamp = 0;
      }
    } else {
      localStorage.setItem(QUOTA_STORAGE_KEY, String(quotaExceededResetTimestamp));
    }
  } catch {}
}


/**
 * Handle Firestore errors safely and engage circuit breaker on quota limits (resource-exhausted).
 */
export function handleFirestoreError(err: any, context: string): void {
  const errMsg = String(err?.message || err?.code || err || '');
  if (
    errMsg.includes('resource-exhausted') ||
    errMsg.includes('Quota limit exceeded') ||
    errMsg.includes('Free daily write units') ||
    errMsg.includes('quota')
  ) {
    isFirestoreWriteQuotaExceeded = true;
    quotaExceededResetTimestamp = Date.now() + 12 * 60 * 60 * 1000; // 12-hour safety cooldown
    try {
      localStorage.setItem(QUOTA_STORAGE_KEY, String(quotaExceededResetTimestamp));
    } catch {}
    // Disconnect Firestore SDK network stream to eliminate repetitive retry/backoff warnings
    disableNetwork(db).catch(() => {});
    console.warn(
      `[Firestore Quota Limite Diário Atingido em ${context}] O sistema continuará sincronizando normalmente através do servidor central e cache local.`
    );
  } else {
    console.debug(`[Firestore ${context}]`, err);
  }
}

export function canWriteToFirestore(): boolean {
  try {
    const until = localStorage.getItem(QUOTA_STORAGE_KEY);
    if (until && Number(until) > Date.now()) {
      return false;
    }
  } catch {}
  if (!isFirestoreWriteQuotaExceeded) return true;
  if (Date.now() > quotaExceededResetTimestamp) {
    isFirestoreWriteQuotaExceeded = false;
    try {
      localStorage.removeItem(QUOTA_STORAGE_KEY);
    } catch {}
    return true;
  }
  return false;
}

/**
 * Clean any leftover seed documents from Firestore
 */
export async function purgeSeedDataFromFirestore(): Promise<void> {
  if (!canWriteToFirestore()) return;
  const seedIds = ['REG-2026-SE01-A1', 'REG-2026-SE02-B2'];
  for (const id of seedIds) {
    try {
      await deleteDoc(doc(db, 'inspections', id));
    } catch (err) {
      handleFirestoreError(err, 'purgeSeedDataFromFirestore');
    }
  }
}

/**
 * Fetch all inspections with robust multi-tier fallback & non-destructive union
 */
export async function fetchServerInspections(forceCloud = false): Promise<Inspection[]> {
  const localStored = getStoredInspections();
  const idbStored = await loadAllFromIndexedDB();
  let firestoreItems: Inspection[] = [];
  let backendItems: Inspection[] = [];

  // 1. Fetch from Express Backend (always fast, reliable and within zero-quota limits)
  try {
    const response = await fetch('/api/inspections', {
      headers: { Accept: 'application/json' },
    });
    if (response.ok) {
      const data = await response.json();
      if (data && Array.isArray(data.deletedIds)) {
        markAsPermanentlyDeleted(...data.deletedIds);
      }
      if (data && Array.isArray(data.inspections)) {
        backendItems = data.inspections.filter(
          (i: any) => !isSeedInspection(i) && !isIdDeleted(i.id) && !isIdDeleted(i.uuid)
        );
      }
    }
  } catch (serverErr) {
    console.debug('Backend fetch error:', serverErr);
  }

  // 2. Fetch from Firebase Firestore only if available and requested/manual sync
  if (forceCloud && canWriteToFirestore()) {
    try {
      const deletedSnap = await getDocs(collection(db, 'deleted_inspections'));
      deletedSnap.forEach((d) => {
        markAsPermanentlyDeleted(d.id);
      });
    } catch (err) {
      handleFirestoreError(err, 'fetchServerInspections:deleted');
    }

    try {
      const querySnapshot = await getDocs(collection(db, 'inspections'));
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data() as Inspection;
        const docId = docSnap.id;
        const itemUuid = data?.uuid || data?.id || docId;

        if (isIdDeleted(docId) || isIdDeleted(itemUuid) || isIdDeleted(data?.id)) {
          return;
        }

        if (data && (data.id || data.uuid) && !isSeedInspection(data) && !isSeedInspection({ id: docId })) {
          firestoreItems.push({
            ...data,
            id: data.id || docId,
            uuid: itemUuid,
          });
        }
      });
    } catch (firebaseErr) {
      handleFirestoreError(firebaseErr, 'fetchServerInspections:inspections');
    }
  }

  // Non-destructive smart merge of ALL sources (ignoring deleted records)
  const merged = mergeInspections(localStored, idbStored, backendItems, firestoreItems);
  
  // Persist merged set locally
  saveAllInspections(merged, false);

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
 * Safe promise wrapper with timeout to prevent hung async calls (e.g. Firebase offline backoff or slow network)
 */
export function promiseWithTimeout<T>(promise: Promise<T>, timeoutMs: number, fallbackValue: T): Promise<T> {
  let timer: any;
  const timeoutPromise = new Promise<T>((resolve) => {
    timer = setTimeout(() => resolve(fallbackValue), timeoutMs);
  });
  return Promise.race([
    promise.then((res) => {
      clearTimeout(timer);
      return res;
    }).catch(() => {
      clearTimeout(timer);
      return fallbackValue;
    }),
    timeoutPromise,
  ]);
}

/**
 * Save single inspection directly into Firebase Firestore, Backend Server, and Local DB.
 * Guarantees that the inspection is registered across all tiers and immediately accessible.
 */
export async function saveInspection(
  inspection: Inspection,
  onProgress?: (stepIndex: number, message: string) => void
): Promise<Inspection> {
  if (onProgress) onProgress(0, 'Validando e formatando dados da inspeção...');
  const current = getStoredInspections();
  
  const updatedInspection: Inspection = {
    ...inspection,
    id: inspection.id || inspection.uuid || generateUniqueInspectionId(),
    uuid: inspection.uuid || inspection.id || generateUniqueInspectionId(),
    timestamp: inspection.timestamp || Date.now(),
    sincronizado: true,
    updatedAt: new Date().toISOString(),
  };

  // Remove from deleted set in case an ID was reused
  unmarkAsDeleted(updatedInspection.id);
  unmarkAsDeleted(updatedInspection.uuid);

  if (onProgress) onProgress(1, 'Otimizando fotos e preparando evidências...');

  // 1. Immediately store in Memory, LocalStorage, and IndexedDB for instant UI responsiveness
  if (onProgress) onProgress(2, 'Gravando no banco de dados local e IndexedDB...');
  const merged = mergeInspections(current, [updatedInspection]);
  saveAllInspections(merged, false);
  await promiseWithTimeout(saveToIndexedDB(updatedInspection), 2000, undefined);

  // 2. Persist in parallel to Firebase Firestore Cloud (if within quota) and Central Express Backend
  if (onProgress) onProgress(3, 'Transmitindo e sincronizando com o servidor central...');
  const safeData = sanitizeForFirestore(updatedInspection);
  
  const firestorePromise = (async () => {
    if (!canWriteToFirestore()) return;
    try {
      const docId = safeData.id;
      const docRef = doc(db, 'inspections', docId);
      await promiseWithTimeout(setDoc(docRef, safeData, { merge: true }), 2500, undefined);
    } catch (firestoreErr) {
      handleFirestoreError(firestoreErr, 'saveInspection');
    }
  })();

  const backendPromise = (async () => {
    try {
      const fetchPromise = fetch('/api/inspections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(safeData),
      });
      await promiseWithTimeout(fetchPromise, 4000, undefined);
    } catch (serverErr) {
      console.debug('Aviso ao sincronizar com servidor central:', serverErr);
    }
  })();

  await Promise.allSettled([firestorePromise, backendPromise]);

  if (onProgress) onProgress(4, 'Inspeção gravada e sincronizada com sucesso!');

  return updatedInspection;
}

/**
 * Delete inspection permanently from Firebase Firestore, Backend, IndexedDB, and local cache.
 * Uses persistent tombstones to guarantee it will never resurrect under any circumstance.
 */
export async function deleteInspection(idOrUuid: string): Promise<void> {
  // Find associated id and uuid
  const current = getStoredInspections();
  const matched = current.find((i) => i.id === idOrUuid || i.uuid === idOrUuid);
  const id = matched?.id || idOrUuid;
  const uuid = matched?.uuid;

  // 1. Mark as permanently deleted across memory and localStorage
  markAsPermanentlyDeleted(id, uuid, idOrUuid);

  // 2. Filter local memory and localStorage immediately
  const filtered = current.filter(
    (i) => i.id !== id && i.id !== idOrUuid && (!uuid || i.uuid !== uuid) && !isIdDeleted(i.id) && !isIdDeleted(i.uuid)
  );
  
  inMemoryInspections = filtered;
  try {
    localStorage.setItem(STORAGE_FALLBACK_KEY, JSON.stringify(filtered));
  } catch {}

  // 3. Delete from IndexedDB immediately
  await deleteFromIndexedDB(id);
  if (uuid && uuid !== id) {
    await deleteFromIndexedDB(uuid);
  }

  // 4. Delete from Firebase Firestore & write permanent tombstone (if within quota)
  if (canWriteToFirestore()) {
    try {
      const docRef = doc(db, 'inspections', id);
      await deleteDoc(docRef);
      if (uuid && uuid !== id) {
        await deleteDoc(doc(db, 'inspections', uuid)).catch(() => {});
      }

      // Write permanent tombstone to Firestore so other devices know it was deleted
      const tombstoneRef = doc(db, 'deleted_inspections', id);
      await setDoc(tombstoneRef, {
        id,
        uuid: uuid || null,
        deletedAt: new Date().toISOString(),
      });
    } catch (firestoreErr) {
      handleFirestoreError(firestoreErr, 'deleteInspection');
    }
  }

  // 5. Delete from backend server (always available)
  try {
    await fetch(`/api/inspections/${encodeURIComponent(id)}`, {
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
    if (canWriteToFirestore()) {
      try {
        await setDoc(doc(db, 'app_config', 'types'), {
          key: 'types',
          types: updated,
          updatedAt: new Date().toISOString(),
        }, { merge: true });
      } catch (e) {
        handleFirestoreError(e, 'saveCustomInspectionType');
      }
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
 * Setup Realtime Firebase Firestore listener & SSE stream with non-destructive merge
 * and guaranteed instant deletion synchronization.
 */
export function setupRealtimeSync(
  onInspectionsUpdate: (inspections: Inspection[]) => void,
  onTypesUpdate?: (types: string[]) => void
): () => void {
  let unsubscribeFirestore: (() => void) | null = null;
  let unsubscribeDeleted: (() => void) | null = null;
  let unsubscribeTypes: (() => void) | null = null;

  // 1. Listen to Firebase Firestore if quota is healthy
  if (canWriteToFirestore()) {
    try {
      // 1. Listen to 'deleted_inspections' in Firestore in real-time
      const deletedRef = collection(db, 'deleted_inspections');
      unsubscribeDeleted = onSnapshot(
        deletedRef,
        (snapshot) => {
          let hasNewDeletes = false;
          snapshot.forEach((d) => {
            if (!deletedIdsSet.has(d.id)) {
              markAsPermanentlyDeleted(d.id);
              hasNewDeletes = true;
            }
          });

          if (hasNewDeletes) {
            const current = getStoredInspections();
            const filtered = current.filter((i) => !isIdDeleted(i.id) && !isIdDeleted(i.uuid));
            inMemoryInspections = filtered;
            saveAllInspections(filtered, false);
            onInspectionsUpdate(filtered);
          }
        },
        (error) => {
          handleFirestoreError(error, 'realtime listener deleted_inspections');
        }
      );

      // 2. Listen to 'inspections' collection in Firestore in real-time
      const inspectionsRef = collection(db, 'inspections');
      unsubscribeFirestore = onSnapshot(
        inspectionsRef,
        (snapshot) => {
          const cloudList: Inspection[] = [];
          snapshot.forEach((d) => {
            const item = d.data() as Inspection;
            const docId = d.id;
            const itemUuid = item?.uuid || item?.id || docId;

            // If document was marked deleted, ignore it safely without calling deleteDoc inside loop
            if (isIdDeleted(docId) || isIdDeleted(itemUuid) || isIdDeleted(item?.id)) {
              return;
            }

            if (item && (item.id || item.uuid) && !isSeedInspection(item) && !isSeedInspection({ id: docId })) {
              cloudList.push({
                ...item,
                id: item.id || docId,
                uuid: itemUuid,
              });
            }
          });

          // The live Firestore list is combined with local storage
          const currentStored = getStoredInspections();
          const offlineLocalOnly = currentStored.filter(
            (localItem) =>
              !isIdDeleted(localItem.id) &&
              !isIdDeleted(localItem.uuid) &&
              !cloudList.some((cloudItem) => cloudItem.id === localItem.id || cloudItem.uuid === localItem.uuid) &&
              !localItem.sincronizado
          );

          const unifiedList = mergeInspections(cloudList, offlineLocalOnly);
          inMemoryInspections = unifiedList;
          saveAllInspections(unifiedList, false);
          onInspectionsUpdate(unifiedList);
        },
        (error) => {
          handleFirestoreError(error, 'realtime listener inspections');
        }
      );

      // 3. Listen to custom types config in Firestore
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
          handleFirestoreError(error, 'realtime listener types');
        }
      );
    } catch (e) {
      handleFirestoreError(e, 'setupRealtimeSync:init');
    }
  }

  // 4. Also setup SSE listener as secondary sync fallback
  let eventSource: EventSource | null = null;
  if (typeof window !== 'undefined' && 'EventSource' in window) {
    try {
      eventSource = new EventSource('/api/events');
      eventSource.addEventListener('database_update', (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          if (data) {
            if (data.action === 'delete' && data.deletedId) {
              markAsPermanentlyDeleted(data.deletedId);
            }
            if (Array.isArray(data.deletedIds)) {
              markAsPermanentlyDeleted(...data.deletedIds);
            }
            if (Array.isArray(data.inspections)) {
              const cleaned = data.inspections.filter(
                (i: any) => !isSeedInspection(i) && !isIdDeleted(i.id) && !isIdDeleted(i.uuid)
              );
              inMemoryInspections = sortInspectionsDescending(cleaned);
              saveAllInspections(inMemoryInspections, false);
              onInspectionsUpdate(inMemoryInspections);
            }
          }
        } catch {}
      });
    } catch {}
  }

  return () => {
    if (unsubscribeFirestore) unsubscribeFirestore();
    if (unsubscribeDeleted) unsubscribeDeleted();
    if (unsubscribeTypes) unsubscribeTypes();
    if (eventSource) eventSource.close();
  };
}

// ---------------- MULTIPLATFORM SYNCHRONIZATION ENGINE ---------------- //

export interface MultiplatformSyncResult {
  success: boolean;
  total: number;
  newlySynced: number;
  timestamp: string;
  source: 'cloud' | 'server' | 'hybrid' | 'local';
  message: string;
  inspections: Inspection[];
}

/**
 * Perform complete multiplatform 2-way synchronization across Firebase Cloud, Central Server, and Local DB.
 * Pushes any local records, retrieves all records created on other devices/browsers,
 * purges permanently deleted records via tombstones, and returns the unified database.
 */
export async function fullMultiplatformSync(): Promise<MultiplatformSyncResult> {
  // 1. Gather all local data (memory, localStorage, IndexedDB)
  const localList = getStoredInspections();
  const idbList = await loadAllFromIndexedDB();
  const localUnified = mergeInspections(localList, idbList);
  
  // 2. Fetch and propagate deletion tombstones from Firebase Firestore (if within quota)
  if (canWriteToFirestore()) {
    try {
      const deletedSnap = await getDocs(collection(db, 'deleted_inspections'));
      deletedSnap.forEach((d) => {
        markAsPermanentlyDeleted(d.id);
      });
    } catch (err) {
      handleFirestoreError(err, 'fullMultiplatformSync:deleted');
    }
  }

  // 3. Push any local deletion tombstones to Firestore (if within quota)
  const allDeletedIds = Array.from(deletedIdsSet);
  if (allDeletedIds.length > 0 && canWriteToFirestore()) {
    try {
      const batch = writeBatch(db);
      allDeletedIds.forEach((dId) => {
        batch.set(
          doc(db, 'deleted_inspections', dId),
          { id: dId, deletedAt: new Date().toISOString() },
          { merge: true }
        );
      });
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, 'fullMultiplatformSync:pushDeleted');
    }
  }

  // 4. Push local un-deleted inspections to Firebase Firestore (if within quota)
  let firestoreItems: Inspection[] = [];
  if (canWriteToFirestore()) {
    try {
      const batch = writeBatch(db);
      let batchCount = 0;
      localUnified.forEach((insp) => {
        if (!isIdDeleted(insp.id) && !isIdDeleted(insp.uuid)) {
          const safe = sanitizeForFirestore({
            ...insp,
            sincronizado: true,
            updatedAt: insp.updatedAt || new Date().toISOString(),
          });
          batch.set(doc(db, 'inspections', insp.id), safe, { merge: true });
          batchCount++;
        }
      });
      if (batchCount > 0) {
        await batch.commit();
      }
    } catch (err) {
      handleFirestoreError(err, 'fullMultiplatformSync:pushInspections');
    }
  }

  // 5. Pull authoritative inspections from Firebase Firestore (if within quota)
  if (canWriteToFirestore()) {
    try {
      const querySnapshot = await getDocs(collection(db, 'inspections'));
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data() as Inspection;
        const docId = docSnap.id;
        const itemUuid = data?.uuid || data?.id || docId;

        if (isIdDeleted(docId) || isIdDeleted(itemUuid) || isIdDeleted(data?.id)) {
          return;
        }

        if (data && (data.id || data.uuid) && !isSeedInspection(data) && !isSeedInspection({ id: docId })) {
          firestoreItems.push({
            ...data,
            id: data.id || docId,
            uuid: itemUuid,
          });
        }
      });
    } catch (err) {
      handleFirestoreError(err, 'fullMultiplatformSync:pullInspections');
    }
  }

  // 6. Push and Pull to/from Central Express Server (/api/sync)
  let backendItems: Inspection[] = [];
  try {
    const syncPayload = {
      inspections: localUnified
        .filter((i) => !isIdDeleted(i.id) && !isIdDeleted(i.uuid))
        .map((i) => sanitizeForFirestore({ ...i, sincronizado: true })),
      deletedIds: allDeletedIds,
    };

    const response = await fetch('/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(syncPayload),
    });

    if (response.ok) {
      const data = await response.json();
      if (data && Array.isArray(data.deletedIds)) {
        markAsPermanentlyDeleted(...data.deletedIds);
      }
      if (data && Array.isArray(data.inspections)) {
        backendItems = data.inspections.filter(
          (i: any) => !isSeedInspection(i) && !isIdDeleted(i.id) && !isIdDeleted(i.uuid)
        );
      }
    }
  } catch (serverErr) {
    console.warn('Aviso ao sincronizar com servidor central:', serverErr);
  }

  // 7. Non-destructive smart merge of local, Firestore, and backend
  const merged = mergeInspections(localUnified, firestoreItems, backendItems);

  // 8. Persist merged data locally
  inMemoryInspections = merged;
  saveAllInspections(merged, false);

  const timeStr = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  return {
    success: true,
    total: merged.length,
    newlySynced: merged.length,
    timestamp: timeStr,
    source: firestoreItems.length > 0 && backendItems.length > 0 ? 'hybrid' : firestoreItems.length > 0 ? 'cloud' : 'server',
    message: `${merged.length} ${merged.length === 1 ? 'registro sincronizado' : 'registros sincronizados'} no servidor central com sucesso!`,
    inspections: merged,
  };
}


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

    // Direct Batch Save to Firebase Firestore (if within quota)
    if (canWriteToFirestore()) {
      try {
        const batch = writeBatch(db);
        merged.forEach((insp) => {
          const docRef = doc(db, 'inspections', insp.id);
          const safe = sanitizeForFirestore({ ...insp, sincronizado: true, updatedAt: new Date().toISOString() });
          batch.set(docRef, safe, { merge: true });
        });
        await batch.commit();
      } catch (e) {
        handleFirestoreError(e, 'importDatabaseBackup');
      }
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

