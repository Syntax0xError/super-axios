import { IndexDbAdapter } from "./adapters/index-db.adapter";
import type { StorageAdapter } from "./adapters/adapter";
import { LocalStorageAdapter } from "./adapters/localstorage.adapter";

export class StorageFactory {
  static getStorage(type: "indexedDB" | "localStorage"): StorageAdapter {
    switch (type) {
      case "indexedDB":
        return new IndexDbAdapter();
      case "localStorage":
        return new LocalStorageAdapter();
      default:
        throw new Error(`Unsupported storage type: ${type}`);
    }
  }
}
