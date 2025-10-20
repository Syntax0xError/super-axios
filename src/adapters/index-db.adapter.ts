import type { StorageAdapter } from "./adapter";
import type { StorageDefaultOptions } from "../types";
import { getHash } from "../utils/utils";

export class IndexDbAdapter implements StorageAdapter {
  private readonly DB_NAME = import.meta.env.VITE_INDEX_DB_STORAGE_NAME;
  private readonly STORE_NAME = import.meta.env.VITE_INDEX_DB_STORAGE_NAME_OBJECT_STORE || "cache";
  private readonly DB_VERSION = parseInt(import.meta.env.VITE_INDEX_DB_STORAGE_NAME_VERSION || "1", 10);
  private readonly defaultOptions: StorageDefaultOptions;

  constructor(defaultOptions: StorageDefaultOptions) {
    this.defaultOptions = defaultOptions;
  }

  private createConnection(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.STORE_NAME)) {
          db.createObjectStore(this.STORE_NAME);
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getItem<T>(key: string): Promise<T | null> {
    const __key = getHash(key);
    const db = await this.createConnection();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.STORE_NAME, "readwrite");
      const store = tx.objectStore(this.STORE_NAME);
      const request = store.get(__key);

      request.onsuccess = () => {
        const result = request.result;
        if (result && result.staleTime !== -1 && Date.now() - result.timestamp > result.staleTime) {
          store.delete(__key);
          resolve(null);
        } else {
          resolve(result?.value ?? null);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  async setItem<T>(key: string, value: T, staleTime?: number): Promise<boolean> {
    const __key = getHash(key);
    const db = await this.createConnection();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.STORE_NAME, "readwrite");
      const store = tx.objectStore(this.STORE_NAME);
      const record = { value, timestamp: Date.now(), staleTime: staleTime ?? this.defaultOptions.staleTime };
      const request = store.put(record, __key);

      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  }

  async removeItem(key: string): Promise<boolean> {
    const __key = getHash(key);
    const db = await this.createConnection();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.STORE_NAME, "readwrite");
      const store = tx.objectStore(this.STORE_NAME);
      const request = store.delete(__key);

      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  }

  async clear(): Promise<boolean> {
    const db = await this.createConnection();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.STORE_NAME, "readwrite");
      const store = tx.objectStore(this.STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  }
}
