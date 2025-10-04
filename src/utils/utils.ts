export function getHash(input: string): string {
  // 32-bit FNV-1a
  let h = 0x811c9dc5 >>> 0;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = ((h >>> 0) * 0x01000193) >>> 0; // multiply and ensure 32-bit unsigned
  }
  // Return as 8-character hex
  return ("00000000" + (h >>> 0).toString(16)).slice(-8);
}

export function isIndexedDBCompatible() {
  // Check for the indexedDB property on the window object
  // It's also good practice to check for vendor prefixes for older browsers,
  // though modern browsers generally don't require them.
  return (
    "indexedDB" in window ||
    "mozIndexedDB" in window || // Firefox
    "webkitIndexedDB" in window || // Chrome, Safari
    "msIndexedDB" in window // IE
  );
}
