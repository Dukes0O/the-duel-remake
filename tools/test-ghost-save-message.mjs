import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {App} from '../src/app.js';
import {createGhostStore} from '../src/ghost.js';
import {createResultsScreen} from '../src/screen-results.js';
import {createProfile} from '../src/progression.js';

const before = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
try {
  for (const success of [true, false]) {
    let resolveWrite, rejectWrite;
    Object.defineProperty(globalThis, 'localStorage', {configurable: true, value: {
      setItem: () => new Promise((resolve, reject) => {resolveWrite = resolve; rejectWrite = reject;})
    }});
    const app = {ghosts: createGhostStore()};
    App.prototype._saveGhostStore.call(app);
    assert.equal(app.ghostSaveStatus, 'pending', 'unsettled write has an explicit pending status');
    const screen = createResultsScreen({app, profile: createProfile, credits: String,
      escapeHTML: String, time: String, arrow: ''});
    const state = {status: 'stage_result', stageIndex: 0, mode: 'timetrial',
      cpuDifficulty: 'medium', difficulty: 'casual', results: {won: true, ghostRecorded: true}};
    assert.match(screen(state), /SAVING BEST GHOST…/);
    assert.doesNotMatch(screen(state), /SAVE FAILED|THIS SESSION ONLY|BEST GHOST SAVED/);
    if (success) resolveWrite(); else rejectWrite(Error('memory fixture write failed'));
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(app.ghostSaveStatus, success ? 'saved' : 'failed');
    assert.equal(app.ghostSaved, success);
    assert.match(screen(state), success ? /BEST GHOST SAVED/ : /BEST GHOST SAVE FAILED.*YOUR RACE RESULT IS SAFE/);
  }

  for (const mode of ['duel', 'timetrial', 'grandprix']) {
    const app = {_switches: () => ({enabled: () => true})};
    const screen = createResultsScreen({app, profile: createProfile, credits: String,
      escapeHTML: String, time: String, arrow: ''});
    const state = {status: 'stage_result', stageIndex: 0, mode,
      cpuDifficulty: 'medium', difficulty: 'casual', results: {
        won: true, ghostRecorded: mode !== 'grandprix', grandPrix: mode === 'grandprix',
        stageName: 'Pacific Canyon', field: [], position: 1, fieldSize: 8}};
    for (const [status, expected] of [['pending', /SAVING BEST GHOST…/],
      ['saved', /BEST GHOST SAVED/], ['failed', /BEST GHOST SAVE FAILED.*YOUR RACE RESULT IS SAFE/]]) {
      app.ghostSaveStatus = status; app.ghostSaved = status === 'saved';
      app.grandPrixGhostSaveStatus = status === 'failed' ? 'session' : status;
      assert.match(screen(state), expected, `${mode}: ${status}`);
    }
    if (mode === 'grandprix') {
      app.grandPrixGhostSaveStatus = 'capacity';
      assert.match(screen(state), /GHOST STORAGE FULL; EXISTING RECORDINGS KEPT.*YOUR RACE RESULT IS SAFE/);
    }
  }
  // The browser scenario proves the real cache refresh; guard its inputs here too.
  const router = readFileSync(new URL('../src/screen-router.js', import.meta.url), 'utf8');
  const cacheKey = router.match(/const screen=`([^`]+)`/)[1];
  for (const key of ['app.ghostSaveStatus', 'app.ghostSaved', 'app.grandPrixGhostSaveStatus'])
    assert.ok(cacheKey.includes(key), `result cache observes ${key}`);
} finally {
  if (before) Object.defineProperty(globalThis, 'localStorage', before);
  else delete globalThis.localStorage;
}
console.log('Ghost save messages: pending, saved, failed and capacity passed.');
