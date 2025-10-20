import { Redis } from "ioredis";
import type { StorageAdapter } from "./adapter";
import type { StorageDefaultOptions } from "../types";
import { getHash } from "../utils/utils";

export class RedisIOStorage implements StorageAdapter {
  private readonly redis;
  private readonly defaultOptions: StorageDefaultOptions;
  constructor(redisUri: string, defaultOptions: StorageDefaultOptions) {
    this.redis = new Redis(redisUri);
    this.defaultOptions = defaultOptions;
  }
  async getItem<T>(key: string): Promise<T | null> {
    const __key = getHash(key);
    const value: string | null = await this.redis.get(__key);
    if (!value) return null;

    try {
      const record = JSON.parse(value) as T;
      return record;
    } catch {
      await this.redis.del(__key);
      return null;
    }
  }

  async setItem<T>(key: string, value: T, staleTime?: number): Promise<boolean> {
    const __key = getHash(key);
    try {
      await this.redis.set(__key, JSON.stringify(value), "EX", staleTime ? staleTime / 1000 : this.defaultOptions.staleTime / 1000);
    } catch {
      return false;
    }
    return true;
  }

  async removeItem(key: string): Promise<boolean> {
    const __key = getHash(key);
    await this.redis.del(__key);
    return true;
  }

  async clear(): Promise<boolean> {
    return true;
  }
}
