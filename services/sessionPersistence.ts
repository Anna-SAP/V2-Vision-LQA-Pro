import { ScreenshotReport, StyleGuideRule } from '../types';

export interface PersistedSession {
  pairs: Array<{
    id: string;
    fileName: string;
    enImageBase64: string;     // Base64 Data URL format
    deImageBase64: string;     // Base64 Data URL format
    targetLanguage: string;
    status: string;
    report?: ScreenshotReport;
    errorMessage?: string;
    reverifySuggested?: boolean;
    isReverified?: boolean;
  }>;
  glossaryText: string;
  styleGuideRules: StyleGuideRule[];
  glossaryLoadedFiles: Array<{
    id: string;
    name: string;
    count: number;
    type: 'glossary' | 'styleguide';
    terms: string[];
    rules?: StyleGuideRule[];
  }>;
  savedAt: number;
}

const DB_NAME = 'VisionLQA_SessionDB';
const DB_VERSION = 1;
const STORE_NAME = 'sessions';
const SESSION_KEY = 'current_session';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };

    request.onerror = (event) => {
      reject((event.target as IDBOpenDBRequest).error);
    };
  });
}

export async function saveSession(data: PersistedSession): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(data, SESSION_KEY);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('[SessionPersistence] Failed to save session:', error);
  }
}

export async function loadSession(): Promise<PersistedSession | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(SESSION_KEY);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('[SessionPersistence] Failed to load session:', error);
    return null;
  }
}

export async function clearSession(): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(SESSION_KEY);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('[SessionPersistence] Failed to clear session:', error);
  }
}

let throttleTimer: number | null = null;
let pendingData: PersistedSession | null = null;

export function saveSessionThrottled(data: PersistedSession): Promise<void> {
  pendingData = data;
  
  if (throttleTimer === null) {
    throttleTimer = window.setTimeout(() => {
      if (pendingData) {
        saveSession(pendingData);
        pendingData = null;
      }
      throttleTimer = null;
    }, 2000);
  }
  
  return Promise.resolve();
}
