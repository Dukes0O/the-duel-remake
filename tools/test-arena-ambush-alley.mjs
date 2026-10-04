import assert from 'node:assert/strict';
import {test} from 'node:test';
import {Duel} from '../src/game.js';
import {createFeatureFlags} from '../src/feature-flags.js';

// ARENA-05: settled native admission only. Pay, wave-end buggy rules and the
// fort's location need Claude before authoring the rest of the mode tests.
let checks = 0;
const equal = (actual, expected, message) => { checks++; assert.deepEqual(actual, expected, message); };
test.after(() => console.log(`Ambush Alley: ${checks} acceptance checks executed.`));

for (const venueId of ['scrapdome', 'salt-flats']) test(`native Ambush Alley entry admits ${venueId}`, () => {
  const duel = new Duel({seed: 305, featureFlags: createFeatureFlags({storage: null,
    qa: true, overrides: {scrapdome: true, 'salt-flats': true, 'crew-gear': true}})});
  duel.state.wastelandGateDiscovered = true;
  equal(duel.startArenaEvent({venueId, mode: 'ambush-alley', car: 'falcone_f42',
    crewId: 'rook', arsenalRank: 30, cpuDifficulty: 'medium', opponents: []}), true,
    `${venueId}: native arena entry must admit the registered on-foot Ambush Alley event`);
  equal(duel.state.arena.mode, 'ambush-alley', 'native entry retains Ambush Alley');
  equal(duel.state.arena.venueId, venueId, 'entry retains the requested supported venue');
  equal(duel.course.def.id, venueId, 'the actual arena course matches the selected venue');
});
