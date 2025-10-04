import { getHash } from "../utils/utils";
import type { StorageAdapter } from "./adapter";

export class LocalStorageAdapter implements StorageAdapter {
  async getItem<T>(key: string): Promise<T | null> {
    const __key = getHash(key);
    const value = localStorage.getItem(__key);
    if (!value) return null;
    try {
      const record = JSON.parse(value) as {
        value: T;
        timestamp: number;
        staleTime: number;
      };
      if (record.staleTime !== -1 && Date.now() - record.timestamp > record.staleTime) {
        localStorage.removeItem(__key);
        return null;
      }
      return record.value;
    } catch {
      localStorage.removeItem(__key);
      return null;
    }
  }

  async setItem<T>(key: string, value: T, staleTime?: number): Promise<boolean> {
    const __key = getHash(key);
    if (staleTime) {
      const record = { value, timestamp: Date.now(), staleTime };
      localStorage.setItem(__key, JSON.stringify(record));
      return true;
    }

    const record = { value, timestamp: Date.now(), staleTime };
    localStorage.setItem(__key, JSON.stringify(record));

    return true;
  }

  async removeItem(key: string): Promise<boolean> {
    const __key = getHash(key);
    localStorage.removeItem(__key);
    return true;
  }

  async clear(): Promise<boolean> {
    localStorage.clear();
    return true;
  }
}
