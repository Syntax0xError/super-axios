import { IndexDbAdapter } from "./adapters/index-db.adapter";
import { LocalStorageAdapter } from "./adapters/localstorage.adapter";
import type { StorageAdapter } from "./adapters/adapter";
import type { StorageProps } from "./types";

export class StorageFactory {
  static async getStorage({ storage, defaultOptions }: StorageProps): Promise<StorageAdapter> {
    switch (storage.type) {
      case "indexedDB":
        return new IndexDbAdapter(defaultOptions);
      case "localStorage":
        return new LocalStorageAdapter(defaultOptions);
      case "redis": {
        if (typeof window !== "undefined") {
          throw new Error("Redis storage is not supported in the browser environment");
        }

        if (!storage.redisUri) {
          throw new Error("Redis URI is required");
        }

        // Dynamically import only when needed (avoids bundling Redis for the client)
        const { RedisIOStorage } = await import("./adapters/redis.adapter");
        return new RedisIOStorage(storage.redisUri, defaultOptions);
      }
      default:
        throw new Error(`Unsupported storage type`);
    }
  }
}
