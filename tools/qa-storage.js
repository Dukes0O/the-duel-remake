// Install before importing App/main. QA never reads or writes the real origin's
// storage, even if a developer opens a test page on the live game's port.
export function installIsolatedStorage(target = window) {
  const memory = new Map();
  const storage = {
    get length() { return memory.size; },
    key(index) { return [...memory.keys()][index] ?? null; },
    getItem(key) { return memory.get(String(key)) ?? null; },
    setItem(key, value) { memory.set(String(key), String(value)); },
    removeItem(key) { memory.delete(String(key)); },
    clear() { memory.clear(); },
  };
  // Failure stops the caller before it imports game code. Never fall back to
  // the user's localStorage if the isolated replacement cannot be installed.
  Object.defineProperty(target, 'localStorage', { value: storage });
  return memory;
}
