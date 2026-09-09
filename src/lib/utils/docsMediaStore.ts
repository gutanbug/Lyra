/**
 * Lyra Docs 첨부파일 저장소.
 * Electron에서는 로컬 파일시스템(media/ 폴더)에 저장하고, 브라우저에서는 IndexedDB를 사용한다.
 * localStorage에 base64로 직렬화하면 저장소 용량과 매 저장/로드마다의 JSON 직렬화 비용이
 * 파일 크기에 비례해 커지므로, 실제 바이너리는 IndexedDB/파일에 두고
 * docs 상태에는 참조 id만 남긴다.
 */
import { docsStorageController, isDocsFileStorageAvailable } from 'controllers/docsStorage';

const DB_NAME = 'lyraDocsMedia';
const STORE_NAME = 'media';
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

const openDb = (): Promise<IDBDatabase> => {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains(STORE_NAME)) req.result.createObjectStore(STORE_NAME);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  return dbPromise;
};

export const putMedia = async (id: string, blob: Blob): Promise<void> => {
  if (isDocsFileStorageAvailable()) {
    const buf = await blob.arrayBuffer();
    await docsStorageController.writeMedia(id, buf, blob.type || 'application/octet-stream');
    return;
  }
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(blob, id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

export const getMedia = async (id: string): Promise<Blob | undefined> => {
  if (isDocsFileStorageAvailable()) {
    const result = await docsStorageController.readMedia(id);
    if (!result) return undefined;
    return new Blob([result.data], { type: result.mime });
  }
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).get(id);
    req.onsuccess = () => resolve(req.result as Blob | undefined);
    req.onerror = () => reject(req.error);
  });
};

export const deleteMedia = async (id: string): Promise<void> => {
  if (isDocsFileStorageAvailable()) {
    await docsStorageController.deleteMedia(id);
    return;
  }
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};
