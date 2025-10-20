import type { AxiosInstance, AxiosRequestConfig, AxiosResponse } from "axios";
import type { StorageDefaultOptions, StorageProps } from "./types";

import { StorageFactory } from "./factory";

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
  storage?: StorageProps["storage"];
  defaultCacheOptions?: Partial<StorageDefaultOptions> & {
    useCache?: boolean;
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
    return base;
  }
}

/**
 * Merge request-level and default cache options
 */
function resolveCacheOptions(defaultOptions: StorageOptions["defaultCacheOptions"], url: string, data?: any, config?: SuperAxiosRequestConfig) {
  const cacheOptions = config?.cacheOptions || {};
  return {
    key: cacheOptions.key || safeKey(url, data),
    useCache: cacheOptions.useCache ?? defaultOptions?.useCache,
    staleTime: cacheOptions.staleTime ?? defaultOptions?.staleTime,
  };
}

/**
 * Wrapper for Axios methods with caching support
 */
async function withCache<T>(
  fn: (...args: any[]) => Promise<AxiosResponse<T>>,
  storage: Awaited<ReturnType<typeof StorageFactory.getStorage>>,
  cacheConfig: SuperAxiosRequestConfig["cacheOptions"] = {},
  args: any[]
): Promise<T> {
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
async function createSuperAxios(
  axiosInstance: AxiosInstance,
  config: StorageOptions = {
    storage: { type: "indexedDB" },
    defaultCacheOptions: { useCache: true, staleTime: 5 * 60 * 1000 },
  }
): Promise<SuperAxiosInstance> {
  const instance = axiosInstance as SuperAxiosInstance;

  const { storage: storageCfg = { type: "indexedDB" }, defaultCacheOptions = { useCache: true, staleTime: 5 * 60 * 1000 } } = config;

  const storage = await StorageFactory.getStorage({
    storage: storageCfg,
    defaultOptions: defaultCacheOptions as Required<StorageDefaultOptions>,
  });

  // Original axios methods
  const _get = axiosInstance.get.bind(axiosInstance);
  const _post = axiosInstance.post.bind(axiosInstance);
  const _put = axiosInstance.put.bind(axiosInstance);
  const _delete = axiosInstance.delete.bind(axiosInstance);
  const _patch = axiosInstance.patch.bind(axiosInstance);
  const _head = axiosInstance.head.bind(axiosInstance);
  const _options = axiosInstance.options.bind(axiosInstance);
  const _request = axiosInstance.request.bind(axiosInstance);

  instance.get = <_ = any, D = any>(url: string, cfg?: SuperAxiosRequestConfig<D>) => withCache(_get, storage, resolveCacheOptions(defaultCacheOptions, url, undefined, cfg), [url, cfg]);

  instance.delete = <_ = any, D = any>(url: string, cfg?: SuperAxiosRequestConfig<D>) => withCache(_delete, storage, resolveCacheOptions(defaultCacheOptions, url, undefined, cfg), [url, cfg]);

  instance.head = <_ = any, D = any>(url: string, cfg?: SuperAxiosRequestConfig<D>) => withCache(_head, storage, resolveCacheOptions(defaultCacheOptions, url, undefined, cfg), [url, cfg]);

  instance.options = <_ = any, D = any>(url: string, cfg?: SuperAxiosRequestConfig<D>) => withCache(_options, storage, resolveCacheOptions(defaultCacheOptions, url, undefined, cfg), [url, cfg]);

  instance.post = <_ = any, D = any>(url: string, data?: D, cfg?: SuperAxiosRequestConfig<D>) => withCache(_post, storage, resolveCacheOptions(defaultCacheOptions, url, data, cfg), [url, data, cfg]);

  instance.put = <_ = any, D = any>(url: string, data?: D, cfg?: SuperAxiosRequestConfig<D>) => withCache(_put, storage, resolveCacheOptions(defaultCacheOptions, url, data, cfg), [url, data, cfg]);

  instance.patch = <_ = any, D = any>(url: string, data?: D, cfg?: SuperAxiosRequestConfig<D>) => withCache(_patch, storage, resolveCacheOptions(defaultCacheOptions, url, data, cfg), [url, data, cfg]);

  instance.request = <_ = any, D = any>(cfg: SuperAxiosRequestConfig<D>) => withCache(_request, storage, resolveCacheOptions(defaultCacheOptions, cfg.url || "unknown", cfg.data, cfg), [cfg]);

  instance.revalidate = async (...keys: string[]) => {
    for (const key of keys) await storage.removeItem(key);
  };

  instance.clearCache = async () => {
    await storage.clear();
  };

  return instance;
}

export { createSuperAxios };
export type { SuperAxiosRequestConfig as Config, SuperAxiosInstance };
