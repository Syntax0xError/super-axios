import type { StorageAdapter } from "./adapter";
import type { StorageDefaultOptions } from "../types";
import { getHash } from "../utils/utils";

export class LocalStorageAdapter implements StorageAdapter {
  private readonly defaultOptions: StorageDefaultOptions;
  constructor(defaultOptions: StorageDefaultOptions) {
    this.defaultOptions = defaultOptions;
  }
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
    const record = { value, timestamp: Date.now(), staleTime: staleTime ? staleTime : this.defaultOptions.staleTime };
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
