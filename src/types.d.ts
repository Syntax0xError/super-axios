export interface StorageProps {
  storage: {
    type: "indexedDB" | "redis" | "localStorage";
    redisUri?: string;
  };
  defaultOptions: StorageDefaultOptions;
}

export interface StorageDefaultOptions {
  staleTime: number;
}