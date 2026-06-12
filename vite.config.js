import { defineConfig } from 'vite';

// Offline-only: no proxy, no external origins. strictPort so verification can
// rely on the pinned port (brief requires 5174 for The Duel).
export default defineConfig({
  server: { port: 5174, strictPort: true },
  preview: { port: 5174, strictPort: true },
});
