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

await import('../src/main.js');
