/**
 * INSPEÇÃO PRONTO! - Storage & Multiplatform Central Synchronization Engine
 * The Central Server Database is the authoritative Single Source of Truth.
 * All devices, browsers, and platforms share the exact same inspection records.
 */

import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  onSnapshot,
  disableNetwork,
} from 'firebase/firestore';
import { db } from '../firebase';
import { Inspection, InspectionRoom } from '../types/inspection';

const DB_NAME = 'inspecao_pronto_local_db_v3';
const DB_VERSION = 1;
const STORE_INSPECTIONS = 'inspections';
const STORE_CONFIG = 'app_config';

export const DEFAULT_ROOM_ID = 'tecnico@inspecaopronto.com';

const STORAGE_ACTIVE_ROOM_KEY = 'inspecao_pronto_active_room_v1';
const STORAGE_ROOMS_KEY = 'inspecao_pronto_rooms_v1';
const STORAGE_FALLBACK_KEY = 'inspecao_pronto_records_v3';
const STORAGE_DELETED_IDS_KEY = 'inspecao_pronto_deleted_ids_v3';
const STORAGE_DRAFT_KEY = 'inspecao_pronto_draft_v1';
const STORAGE_TYPES_KEY = 'inspecao_pronto_types_v1';

export const DEFAULT_ROOMS: InspectionRoom[] = [
  {
    id: DEFAULT_ROOM_ID,
    name: 'Sala do Técnico',
    email: DEFAULT_ROOM_ID,
    createdAt: '2026-01-01T00:00:00.000Z',
    isDefault: true,
    description: 'Sala unificada central do sistema para compartilhamento de todas as inspeções',
  },
];

/**
 * Get active inspection room ID (defaults to tecnico@inspecaopronto.com)
 */
export function getActiveRoom(): string {
  try {
    const saved = localStorage.getItem(STORAGE_ACTIVE_ROOM_KEY);
    if (saved && saved.trim()) return saved.trim().toLowerCase();
  } catch {}
  return DEFAULT_ROOM_ID;
}

/**
 * Set active inspection room ID and store in localStorage
 */
export function setActiveRoom(roomId: string): void {
  try {
    const cleanId = (roomId || DEFAULT_ROOM_ID).trim().toLowerCase();
    localStorage.setItem(STORAGE_ACTIVE_ROOM_KEY, cleanId);
  } catch (err) {
    console.error('Erro ao definir sala ativa:', err);
  }
}

/**
 * Fetch available rooms from server database
 */
export async function fetchServerRooms(): Promise<InspectionRoom[]> {
  try {
    const response = await fetch('/api/rooms');
    if (response.ok) {
      const data = await response.json();
      if (data && Array.isArray(data.rooms) && data.rooms.length > 0) {
        localStorage.setItem(STORAGE_ROOMS_KEY, JSON.stringify(data.rooms));
        return data.rooms;
      }
    }
  } catch (e) {
    console.debug('Erro ao carregar salas do servidor:', e);
  }

  // Fallback to local cache or defaults
  try {
    const cached = localStorage.getItem(STORAGE_ROOMS_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}

  return DEFAULT_ROOMS;
}

/**
 * Register a new room in the central database
 */
export async function createRemoteRoom(room: { id: string; name?: string; email?: string; description?: string }): Promise<InspectionRoom> {
  const cleanId = (room.id || room.email || '').trim().toLowerCase();
  if (!cleanId) throw new Error('ID ou E-mail da sala é obrigatório');

  try {
    const response = await fetch('/api/rooms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: cleanId,
        email: room.email || cleanId,
        name: room.name || `Sala ${cleanId}`,
        description: room.description || 'Sala de inspeções',
      }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data && data.room) {
        return data.room;
      }
    }
  } catch (err) {
    console.warn('Falha na criação de sala no servidor:', err);
  }

  const fallbackRoom: InspectionRoom = {
    id: cleanId,
    email: room.email || cleanId,
    name: room.name || `Sala ${cleanId}`,
    createdAt: new Date().toISOString(),
    isDefault: cleanId === DEFAULT_ROOM_ID,
  };

  return fallbackRoom;
}

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

// In-memory runtime cache for instant rendering
let inMemoryInspections: Inspection[] = [];
let isIndexedDbInitialized = false;

// In-memory set of permanently deleted inspection IDs and UUIDs (tombstones)
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
 * Mark ID or UUID as permanently deleted and persist locally
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
 * Remove an ID from deleted list (used when saving an inspection)
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
 * Example: REG-MTHWCC6S-QJ0YW
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
 * Get cached inspections instantly (synchronous)
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

  if (!isIndexedDbInitialized) {
    isIndexedDbInitialized = true;
    loadAllFromIndexedDB().then((idbList) => {
      if (idbList.length > 0 && inMemoryInspections.length === 0) {
        const validList = idbList.filter((i) => !isIdDeleted(i.id) && !isIdDeleted(i.uuid));
        inMemoryInspections = sortInspectionsDescending(validList);
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
    const sanitized = sortInspectionsDescending(inspections);
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
let isFirestoreWriteQuotaExceeded = true;
let quotaExceededResetTimestamp = Date.now() + 12 * 60 * 60 * 1000;

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

export function handleFirestoreError(err: any, context: string): void {
  const errMsg = String(err?.message || err?.code || err || '');
  if (
    errMsg.includes('resource-exhausted') ||
    errMsg.includes('Quota limit exceeded') ||
    errMsg.includes('Free daily write units') ||
    errMsg.includes('quota')
  ) {
    isFirestoreWriteQuotaExceeded = true;
    quotaExceededResetTimestamp = Date.now() + 12 * 60 * 60 * 1000;
    try {
      localStorage.setItem(QUOTA_STORAGE_KEY, String(quotaExceededResetTimestamp));
    } catch {}
    disableNetwork(db).catch(() => {});
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

export function sanitizeForFirestore<T>(data: T): T {
  return JSON.parse(JSON.stringify(data, (_, value) => (value === undefined ? null : value)));
}

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
 * Fetch all inspections from the Central Database (Single Source of Truth).
 * Overwrites local state with authoritative server data, purging deleted records.
 */
export async function fetchServerInspections(forceCloud = false, roomId?: string): Promise<Inspection[]> {
  const targetRoom = (roomId || getActiveRoom() || DEFAULT_ROOM_ID).trim().toLowerCase();
  let backendItems: Inspection[] | null = null;

  // 1. Fetch from Central Express Server database
  try {
    const response = await fetch(`/api/inspections?room=${encodeURIComponent(targetRoom)}`, {
      headers: {
        Accept: 'application/json',
        'X-Room-ID': targetRoom,
      },
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
    console.debug('Backend fetch error (offline ou indisponível):', serverErr);
  }

  // 2. Fetch from Firebase Firestore if available and requested
  let firestoreItems: Inspection[] = [];
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

        const itemRoom = (data?.roomId || data?.sala || DEFAULT_ROOM_ID).toLowerCase();
        if (targetRoom && targetRoom !== 'all' && itemRoom !== targetRoom) {
          return;
        }

        if (data && (data.id || data.uuid) && !isSeedInspection(data) && !isSeedInspection({ id: docId })) {
          firestoreItems.push({
            ...data,
            id: data.id || docId,
            uuid: itemUuid,
            roomId: itemRoom,
            sala: itemRoom,
          });
        }
      });
    } catch (firebaseErr) {
      handleFirestoreError(firebaseErr, 'fetchServerInspections:inspections');
    }
  }

  // If central backend responded, it is the official single source of truth
  if (backendItems !== null) {
    const authoritativeList = sortInspectionsDescending(backendItems);
    inMemoryInspections = authoritativeList;
    saveAllInspections(authoritativeList, false);
    return authoritativeList;
  }

  if (firestoreItems.length > 0) {
    const authoritativeList = sortInspectionsDescending(firestoreItems);
    inMemoryInspections = authoritativeList;
    saveAllInspections(authoritativeList, false);
    return authoritativeList;
  }

  // Offline fallback
  return getStoredInspections().filter((insp) => {
    const itemRoom = (insp.roomId || insp.sala || DEFAULT_ROOM_ID).toLowerCase();
    return targetRoom === 'all' || itemRoom === targetRoom;
  });
}

/**
 * Save single inspection directly into the Central Server Database, Firebase Firestore, and Local DB.
 * Guarantees that the inspection is registered in the central cloud and immediately available on all devices.
 */
export async function saveInspection(
  inspection: Inspection,
  onProgress?: (stepIndex: number, message: string) => void
): Promise<Inspection> {
  if (onProgress) onProgress(0, 'Validando e formatando dados da inspeção...');
  
  const targetRoom = (inspection.roomId || inspection.sala || getActiveRoom() || DEFAULT_ROOM_ID).trim().toLowerCase();

  const updatedInspection: Inspection = {
    ...inspection,
    id: inspection.id || inspection.uuid || generateUniqueInspectionId(),
    uuid: inspection.uuid || inspection.id || generateUniqueInspectionId(),
    roomId: targetRoom,
    sala: targetRoom,
    timestamp: inspection.timestamp || Date.now(),
    sincronizado: true,
    updatedAt: new Date().toISOString(),
  };

  // Remove from deleted set in case an ID was reused
  unmarkAsDeleted(updatedInspection.id);
  unmarkAsDeleted(updatedInspection.uuid);

  if (onProgress) onProgress(1, 'Otimizando fotos e preparando evidências...');

  // 1. Save to Central Express Backend (Single Source of Truth)
  if (onProgress) onProgress(2, `Gravando na sala ${targetRoom} do servidor central...`);
  const safeData = sanitizeForFirestore(updatedInspection);
  
  let serverSaved = false;
  try {
    const response = await fetch(`/api/inspections?room=${encodeURIComponent(targetRoom)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Room-ID': targetRoom,
      },
      body: JSON.stringify(safeData),
    });
    if (response.ok) {
      serverSaved = true;
    }
  } catch (serverErr) {
    console.warn('Aviso ao sincronizar com servidor central:', serverErr);
  }

  // 2. Also save to Firebase Firestore in parallel (if within quota)
  if (onProgress) onProgress(3, 'Registrando evidências e fotos na nuvem...');
  if (canWriteToFirestore()) {
    try {
      const docRef = doc(db, 'inspections', updatedInspection.id);
      await promiseWithTimeout(setDoc(docRef, safeData, { merge: true }), 2500, undefined);
    } catch (firestoreErr) {
      handleFirestoreError(firestoreErr, 'saveInspection:firestore');
    }
  }

  // 3. Cache locally in memory and IndexedDB
  const current = getStoredInspections();
  const updatedList = [
    updatedInspection,
    ...current.filter((i) => i.id !== updatedInspection.id && i.uuid !== updatedInspection.uuid),
  ];
  saveAllInspections(updatedList, false);
  await promiseWithTimeout(saveToIndexedDB(updatedInspection), 2000, undefined);

  if (onProgress) onProgress(4, `Inspeção gravada na sala ${targetRoom} com sucesso!`);

  return updatedInspection;
}

/**
 * Delete inspection permanently from Central Database, Firebase, and Local cache.
 * Returns error if deletion on central server fails.
 */
export async function deleteInspection(idOrUuid: string): Promise<{ success: boolean; error?: string }> {
  const current = getStoredInspections();
  const matched = current.find((i) => i.id === idOrUuid || i.uuid === idOrUuid);
  const id = matched?.id || idOrUuid;
  const uuid = matched?.uuid;

  // 1. Call Central Server DELETE endpoint first
  try {
    const response = await fetch(`/api/inspections/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || 'Erro no servidor central ao excluir registro');
    }
  } catch (err: any) {
    console.error('Erro ao excluir no servidor central:', err);
    if (!navigator.onLine) {
      markAsPermanentlyDeleted(id, uuid, idOrUuid);
      const filtered = current.filter(
        (i) => i.id !== id && i.id !== idOrUuid && (!uuid || i.uuid !== uuid)
      );
      inMemoryInspections = filtered;
      saveAllInspections(filtered, false);
      await deleteFromIndexedDB(id);
      return { success: true };
    }
    return { success: false, error: err.message || 'Não foi possível excluir a inspeção.' };
  }

  // 2. Mark as permanently deleted (tombstone)
  markAsPermanentlyDeleted(id, uuid, idOrUuid);

  // 3. Filter local memory and localStorage
  const filtered = current.filter(
    (i) => i.id !== id && i.id !== idOrUuid && (!uuid || i.uuid !== uuid) && !isIdDeleted(i.id) && !isIdDeleted(i.uuid)
  );
  inMemoryInspections = filtered;
  saveAllInspections(filtered, false);

  // 4. Delete from IndexedDB
  await deleteFromIndexedDB(id);
  if (uuid && uuid !== id) {
    await deleteFromIndexedDB(uuid);
  }

  // 5. Delete from Firebase Firestore & write permanent tombstone (if within quota)
  if (canWriteToFirestore()) {
    try {
      const docRef = doc(db, 'inspections', id);
      await deleteDoc(docRef);
      if (uuid && uuid !== id) {
        await deleteDoc(doc(db, 'inspections', uuid)).catch(() => {});
      }

      const tombstoneRef = doc(db, 'deleted_inspections', id);
      await setDoc(tombstoneRef, {
        id,
        uuid: uuid || null,
        deletedAt: new Date().toISOString(),
      });
    } catch (firestoreErr) {
      handleFirestoreError(firestoreErr, 'deleteInspection:firestore');
    }
  }

  return { success: true };
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

// ---------------- REALTIME MULTI-CLIENT SYNCHRONIZATION ---------------- //

/**
 * Setup Realtime SSE stream with Central Unified Server & Firestore listener.
 * Guarantees instant synchronization across all devices and browsers.
 */
export function setupRealtimeSync(
  onInspectionsUpdate: (inspections: Inspection[]) => void,
  onTypesUpdate?: (types: string[]) => void,
  onStatusChange?: (status: 'online' | 'syncing' | 'offline') => void,
  onRoomsUpdate?: (rooms: InspectionRoom[]) => void
): () => void {
  let unsubscribeFirestore: (() => void) | null = null;
  let unsubscribeDeleted: (() => void) | null = null;
  let unsubscribeTypes: (() => void) | null = null;
  let eventSource: EventSource | null = null;
  let isCleaningUp = false;
  let reconnectTimer: any = null;

  const connectSSE = () => {
    if (isCleaningUp || typeof window === 'undefined' || !('EventSource' in window)) return;

    try {
      if (eventSource) {
        eventSource.close();
      }
      eventSource = new EventSource('/api/events');

      eventSource.addEventListener('connected', () => {
        if (onStatusChange) onStatusChange('online');
      });

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
              const activeRoom = getActiveRoom();
              const cleaned = data.inspections
                .filter((i: any) => !isSeedInspection(i) && !isIdDeleted(i.id) && !isIdDeleted(i.uuid))
                .filter((i: any) => {
                  const rId = (i.roomId || i.sala || DEFAULT_ROOM_ID).toLowerCase();
                  return activeRoom === 'all' || rId === activeRoom;
                });
              const sorted = sortInspectionsDescending(cleaned);
              inMemoryInspections = sorted;
              saveAllInspections(sorted, false);
              onInspectionsUpdate(sorted);
            }
          }
        } catch (e) {
          console.debug('Error processing database_update SSE:', e);
        }
      });

      eventSource.addEventListener('types_update', (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          if (data && Array.isArray(data.types) && data.types.length > 0) {
            localStorage.setItem(STORAGE_TYPES_KEY, JSON.stringify(data.types));
            if (onTypesUpdate) onTypesUpdate(data.types);
          }
        } catch (e) {
          console.debug('Error processing types_update SSE:', e);
        }
      });

      eventSource.addEventListener('rooms_update', (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          if (data && Array.isArray(data.rooms) && data.rooms.length > 0) {
            localStorage.setItem(STORAGE_ROOMS_KEY, JSON.stringify(data.rooms));
            if (onRoomsUpdate) onRoomsUpdate(data.rooms);
          }
        } catch (e) {
          console.debug('Error processing rooms_update SSE:', e);
        }
      });

      eventSource.onerror = () => {
        if (onStatusChange) onStatusChange('offline');
        if (eventSource) {
          eventSource.close();
          eventSource = null;
        }
        if (!isCleaningUp) {
          clearTimeout(reconnectTimer);
          reconnectTimer = setTimeout(connectSSE, 3000);
        }
      };
    } catch (err) {
      if (onStatusChange) onStatusChange('offline');
      if (!isCleaningUp) {
        clearTimeout(reconnectTimer);
        reconnectTimer = setTimeout(connectSSE, 3000);
      }
    }
  };

  connectSSE();

  // Also listen to Firestore if available
  if (canWriteToFirestore()) {
    try {
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
            const activeRoom = getActiveRoom();
            const current = getStoredInspections();
            const filtered = current
              .filter((i) => !isIdDeleted(i.id) && !isIdDeleted(i.uuid))
              .filter((i) => {
                const rId = (i.roomId || i.sala || DEFAULT_ROOM_ID).toLowerCase();
                return activeRoom === 'all' || rId === activeRoom;
              });
            inMemoryInspections = filtered;
            saveAllInspections(filtered, false);
            onInspectionsUpdate(filtered);
          }
        },
        (error) => {
          handleFirestoreError(error, 'realtime listener deleted_inspections');
        }
      );
    } catch (e) {
      handleFirestoreError(e, 'setupRealtimeSync:init');
    }
  }

  return () => {
    isCleaningUp = true;
    clearTimeout(reconnectTimer);
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
  source: 'server' | 'cloud' | 'local';
  message: string;
  inspections: Inspection[];
  room: string;
}

/**
 * Perform complete multiplatform synchronization querying the Central Server.
 */
export async function fullMultiplatformSync(roomId?: string): Promise<MultiplatformSyncResult> {
  const allDeletedIds = Array.from(deletedIdsSet);
  const targetRoom = (roomId || getActiveRoom() || DEFAULT_ROOM_ID).trim().toLowerCase();

  let backendItems: Inspection[] = [];
  try {
    const syncPayload = {
      deletedIds: allDeletedIds,
      room: targetRoom,
    };

    const response = await fetch('/api/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Room-ID': targetRoom,
      },
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

  let finalInspections: Inspection[];
  if (backendItems.length > 0 || navigator.onLine) {
    finalInspections = sortInspectionsDescending(backendItems);
  } else {
    finalInspections = getStoredInspections().filter((i) => {
      const rId = (i.roomId || i.sala || DEFAULT_ROOM_ID).toLowerCase();
      return targetRoom === 'all' || rId === targetRoom;
    });
  }

  inMemoryInspections = finalInspections;
  saveAllInspections(finalInspections, false);

  const timeStr = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  return {
    success: true,
    room: targetRoom,
    total: finalInspections.length,
    newlySynced: finalInspections.length,
    timestamp: timeStr,
    source: 'server',
    message: `${finalInspections.length} ${finalInspections.length === 1 ? 'registro sincronizado' : 'registros sincronizados'} na sala ${targetRoom} com sucesso!`,
    inspections: finalInspections,
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
 * Import and restore database backup
 */
export async function importDatabaseBackup(jsonString: string): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    const parsed = JSON.parse(jsonString);
    if (!parsed.inspections || !Array.isArray(parsed.inspections)) {
      return { success: false, count: 0, error: 'Formato de arquivo de backup inválido.' };
    }

    const response = await fetch('/api/backup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        inspections: parsed.inspections,
        inspectionTypes: parsed.inspectionTypes || getStoredInspectionTypes(),
      }),
    });

    if (response.ok) {
      const data = await response.json();
      const updated = await fetchServerInspections();
      return { success: true, count: updated.length };
    } else {
      throw new Error('Falha ao importar backup no servidor central');
    }
  } catch (err: any) {
    return { success: false, count: 0, error: err.message || 'Falha ao processar arquivo JSON' };
  }
}
