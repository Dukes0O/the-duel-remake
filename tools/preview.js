// Install the isolated store before importing production startup. The preview
// never keeps a handle to the browser's physical localStorage.
import {createMemoryBackupStore,installIsolatedStorage} from './qa-storage.js';
import {seedPreviewProfile} from './preview-player.js';
import {
  PLAYERS_KEY,
  createPlayerRegistry,
  createProfile,
  savePlayers,
} from '../src/progression.js';

installIsolatedStorage();
globalThis.__duelQaBackupStore=createMemoryBackupStore(window);

// Seed a fresh preview tab once. Reloads keep that tab's temporary playtest
// progress, while closing it discards the isolated store.
if (!localStorage.getItem(PLAYERS_KEY)) {
  const previewPlayers = createPlayerRegistry(seedPreviewProfile(createProfile()));
  if (!savePlayers(previewPlayers, localStorage)) {
    throw new Error('Could not create the temporary preview player.');
  }
}

const {app} = await import('../src/main.js');
// Only the isolated QA build exposes the production App for repeatable checks.
if (typeof __DUEL_QA__ !== 'undefined' && __DUEL_QA__ === true) window.__qaApp = app;

// Show when this Preview was built, so it is clear which version is playing.
fetch('/preview-build.json', {cache: 'no-store'})
  .then(response => response.ok ? response.json() : null)
  .then(stamp => {
    const badge = document.querySelector('[data-preview-badge]');
    if (!badge || !stamp?.builtAt) return;
    const built = new Date(stamp.builtAt).toLocaleString([], {
      weekday: 'short', hour: 'numeric', minute: '2-digit'});
    badge.textContent = `PREVIEW · BUILT ${built.toUpperCase()}`;
  })
  .catch(() => {});
