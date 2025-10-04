import type { AxiosInstance, AxiosRequestConfig, AxiosResponse } from "axios";
import { StorageFactory } from "./factory";
import { isIndexedDBCompatible } from "./utils/utils";

/**
 * Extended Axios config with cache support
 */
interface SuperAxiosRequestConfig<D = any> extends AxiosRequestConfig<D> {
  cacheOptions?: {
    useCache?: boolean; // Enable cache for this request
    key?: string; // Custom cache key
    staleTime?: number; // Time in ms before cache is considered stale
  };
}

interface StorageOptions {
  storage: "localStorage" | "indexedDB" | "auto";
  defaultCacheOptions: {
    useCache: boolean;
    staleTime: number;
  };
}

/**
 * Extended Axios instance with cache utilities
 */
type SuperAxiosInstance = AxiosInstance & {
  revalidate: (...keys: string[]) => Promise<void>;
  clearCache: () => Promise<void>;
  get: <T = any, D = any>(url: string, config?: SuperAxiosRequestConfig<D>) => Promise<T>;
  post: <T = any, D = any>(url: string, data?: D, config?: SuperAxiosRequestConfig<D>) => Promise<T>;
  put: <T = any, D = any>(url: string, data?: D, config?: SuperAxiosRequestConfig<D>) => Promise<T>;
  delete: <T = any, D = any>(url: string, config?: SuperAxiosRequestConfig<D>) => Promise<T>;
  patch: <T = any, D = any>(url: string, data?: D, config?: SuperAxiosRequestConfig<D>) => Promise<T>;
  head: <T = any, D = any>(url: string, config?: SuperAxiosRequestConfig<D>) => Promise<T>;
  options: <T = any, D = any>(url: string, config?: SuperAxiosRequestConfig<D>) => Promise<T>;
  request: <T = any, D = any>(config: SuperAxiosRequestConfig<D>) => Promise<T>;
};

/**
 * Builds a stable cache key from URL + optional data
 */
function safeKey(base: string, data?: unknown) {
  if (!data) return base;
  try {
    const sortedKeys = Object.keys(data as any).sort();
    return base + JSON.stringify(data, sortedKeys);
  } catch {
    return base; // fallback if circular or non-serializable
  }
}

/**
 * Helper to merge cache options safely
 */
function resolveCacheOptions(defaultOptions: StorageOptions["defaultCacheOptions"], url: string, data?: any, config?: SuperAxiosRequestConfig) {
  const cacheOptions = config?.cacheOptions || {};
  return {
    key: cacheOptions.key || safeKey(url, data),
    useCache: cacheOptions.useCache ?? defaultOptions.useCache,
    staleTime: cacheOptions.staleTime ?? defaultOptions.staleTime,
  };
}

/**
 * Wrapper for Axios methods with caching support
 */
async function withCache<T>(fn: (...args: any[]) => Promise<AxiosResponse<T>>, storage: ReturnType<typeof StorageFactory.getStorage>, cacheConfig: SuperAxiosRequestConfig["cacheOptions"] = {}, args: any[]): Promise<T> {
  const { key, useCache, staleTime } = cacheConfig;

  if (useCache && key) {
    const cached = await storage.getItem<T>(key);
    if (cached) return cached;
  }

  const response = await fn(...args);

  if (useCache && key) {
    await storage.setItem(key, response.data, staleTime);
  }

  return response.data;
}

/**
 * Enhance Axios instance with caching capabilities
 */
function createSuperAxios(
  axiosInstance: AxiosInstance,
  config: StorageOptions = {
    storage: "auto",
    defaultCacheOptions: { useCache: false, staleTime: 5 * 60 * 1000 },
  }
): SuperAxiosInstance {
  // Keep references to original methods
  const _get = axiosInstance.get.bind(axiosInstance);
  const _post = axiosInstance.post.bind(axiosInstance);
  const _put = axiosInstance.put.bind(axiosInstance);
  const _delete = axiosInstance.delete.bind(axiosInstance);
  const _patch = axiosInstance.patch.bind(axiosInstance);
  const _head = axiosInstance.head.bind(axiosInstance);
  const _options = axiosInstance.options.bind(axiosInstance);
  const _request = axiosInstance.request.bind(axiosInstance);

  const instance = axiosInstance as SuperAxiosInstance;

  // Determine storage type
  const storageType = config.storage === "auto" ? (isIndexedDBCompatible() ? "indexedDB" : "localStorage") : config.storage;

  // Handle potential async storage factory
  const storage = StorageFactory.getStorage(storageType);
  const { defaultCacheOptions } = config;

  // Wrap each HTTP method with caching
  instance.get = <T = any, D = any>(url: string, config?: SuperAxiosRequestConfig<D>) => withCache(_get, storage, resolveCacheOptions(defaultCacheOptions, url, undefined, config), [url, config]);

  instance.delete = <T = any, D = any>(url: string, config?: SuperAxiosRequestConfig<D>) => withCache(_delete, storage, resolveCacheOptions(defaultCacheOptions, url, undefined, config), [url, config]);

  instance.head = <T = any, D = any>(url: string, config?: SuperAxiosRequestConfig<D>) => withCache(_head, storage, resolveCacheOptions(defaultCacheOptions, url, undefined, config), [url, config]);

  instance.options = <T = any, D = any>(url: string, config?: SuperAxiosRequestConfig<D>) => withCache(_options, storage, resolveCacheOptions(defaultCacheOptions, url, undefined, config), [url, config]);

  instance.post = <T = any, D = any>(url: string, data?: D, config?: SuperAxiosRequestConfig<D>) => withCache(_post, storage, resolveCacheOptions(defaultCacheOptions, url, data, config), [url, data, config]);

  instance.put = <T = any, D = any>(url: string, data?: D, config?: SuperAxiosRequestConfig<D>) => withCache(_put, storage, resolveCacheOptions(defaultCacheOptions, url, data, config), [url, data, config]);

  instance.patch = <T = any, D = any>(url: string, data?: D, config?: SuperAxiosRequestConfig<D>) => withCache(_patch, storage, resolveCacheOptions(defaultCacheOptions, url, data, config), [url, data, config]);

  instance.request = <T = any, D = any>(config: SuperAxiosRequestConfig<D>) => withCache(_request, storage, resolveCacheOptions(defaultCacheOptions, config.url || "unknown", config.data, config), [config]);

  // Cache management utilities
  instance.revalidate = async (...keys: string[]) => {
    for (const key of keys) {
      await storage.removeItem(key);
    }
  };

  instance.clearCache = async () => {
    await storage.clear();
  };

  return instance;
}

export { createSuperAxios };
export type { SuperAxiosRequestConfig as Config, SuperAxiosInstance };
