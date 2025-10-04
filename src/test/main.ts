/**
 * Example usage of Super-Axios
 * ------------------------------------
 * This script demonstrates how to use Super-Axios
 * with caching enabled for GET, POST, and DELETE requests.
 *
 * - Uses IndexedDB if available, otherwise falls back to localStorage
 * - Allows custom cache keys and stale times
 */

import axios from "axios";
import { createSuperAxios } from "..";

// Create a Super-Axios instance
const api = createSuperAxios(axios, {
  storage: "auto", // "auto" = use IndexedDB if supported, fallback to localStorage
  defaultCacheOptions: {
    useCache: true, // Default caching behavior (false = always fetch fresh)
    staleTime: 5 * 60 * 1000, // Default stale time = 5 minutes
  },
});

async function runExamples() {
  try {
    // Example 1: GET request with caching (stale for 10s)
    const request1 = await api.get("https://jsonplaceholder.typicode.com/todos/1", {
      cacheOptions: { useCache: true, staleTime: 10000 },
    });

    // Example 2: POST request with custom cache key
    const request2 = await api.post(
      "https://jsonplaceholder.typicode.com/posts",
      { title: "foo", body: "bar", userId: 1 },
      {
        cacheOptions: {
          useCache: true,
          staleTime: 10_000,
          key: "custom-post-key", // Always cache under this key
        },
      }
    );

    // Example 3: DELETE request with caching enabled
    const request3 = await api.delete("https://jsonplaceholder.typicode.com/posts/1", {
      cacheOptions: { useCache: true, staleTime: 10000 },
    });

    // Example 4: GET request that never goes stale (-1 = permanent cache)
    const request4 = await api.get("https://jsonplaceholder.typicode.com/todos/1", {
      cacheOptions: { useCache: true, staleTime: 10 },
    });

    // Log results
    console.log("✅ Request 1 Data:", request1);
    console.log("✅ Request 2 Data:", request2);
    console.log("✅ Request 3 Data:", request3);
    console.log("✅ Request 4 Data:", request4);
  } catch (error) {
    console.error("❌ API request failed:", error);
  }
}

// Run the examples
runExamples();
