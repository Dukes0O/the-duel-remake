// OPEN-SHARED: the job of being out in the open, started through the real App. Every profile here is in memory.
import assert from 'node:assert/strict';
import {App} from '../src/app.js';
import {yardHomeScreen} from '../src/screen-yard-home.js';
import {OPEN_ROAM_ID} from '../src/world/open/roam-job.js';
import {isHeld} from '../src/world/open/holds.js';
import {NIGHT_2_SITES} from '../src/world/jobs/night-2-sites.js';

const memory = new Map();
globalThis.localStorage = {getItem: key => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, String(value)),
  removeItem: key => memory.delete(key)};
globalThis.cancelAnimationFrame = () => {};
const on = {enabled: id => ['hidden-road', 'story-choices', 'crew-gear', 'warlord-cards'].includes(id)};
const off = {enabled: id => ['hidden-road', 'crew-gear', 'warlord-cards'].includes(id)};

const app = new App();
app.audio.unlock = () => {};
app.profile = {...app.profile, wasteland: {...app.profile.wasteland, discoveredGate: true, scrap: 120}};
assert(app._saveProfile());

// The button is on the Story Wall only with the switch on.
const wall = flags => yardHomeScreen({profile: app.profile, playerName: app.player.name, escapeHTML: String, panel: 'cards', featureFlags: flags});
assert.match(wall(on), /data-action="story-open-roam"/);
assert.match(wall(on), /Go out into the Scablands/);
assert.doesNotMatch(wall(off), /story-open-roam/);

app.duel.featureFlags = on;
assert(app.visitWasteland());
app.advance(8);
assert(app.isYardHomeActive());

// With the switch off no roam job can start.
app.duel.featureFlags = off;
assert.equal(app.startOpenRoam(), false);
assert.notEqual(app.duel.state.arena?.mode, 'world-job');

// With it on, the player is on foot at the hearth, the car is at the gate, and the job carries the open state.
app.duel.featureFlags = on;
assert(app.startOpenRoam());
let state = app.duel.state;
const worldJob = state.arena.worldJob;
assert.equal(worldJob.definition.id, OPEN_ROAM_ID);
assert.equal(state.onFoot, true);
assert(Math.hypot(state.fighter.x - NIGHT_2_SITES.hearthFront.position.x, state.fighter.z - NIGHT_2_SITES.hearthFront.position.z) < 2);
assert.equal(worldJob.open.world.scrap, 120);
assert.deepEqual(worldJob.open.holds, [], 'being out in the open holds nothing');
assert.equal(isHeld(worldJob.open.holds, 'checkpoints'), false);
assert.equal(worldJob.night2, undefined);

// A minute out in the open: the job is not done, the clock of the open land runs, and nothing was changed.
const before = structuredClone(worldJob.open.world);
app.advance(60);
state = app.duel.state;
assert.equal(state.status, 'racing');
assert.equal(state.arena.worldJob.job.done, false);
assert(state.arena.worldJob.open.seconds > 50, 'the open land is stepped beside the job');
assert.deepEqual(state.arena.worldJob.open.world, before);
assert.deepEqual(state.arena.worldJob.open.events, []);

// Leaving from the pause menu ends it, as it ends any world job.
assert.equal(app.leaveWorldJob(), true);
assert.equal(app.duel.state.status, 'arena_result');

console.log('test-open-roam-start: ok');
