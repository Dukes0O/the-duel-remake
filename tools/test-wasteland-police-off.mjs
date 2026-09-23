import assert from 'node:assert/strict';
import { Duel } from '../src/game.js';

function atRadar(mode) {
  const duel = new Duel({ seed: 1989 });
  duel.startCampaign({ mode, startStage: 0 });
  const state = duel.state;
  state.status = 'racing';
  state.s = state.prevS = 1721;
  state.speedMph = 120;
  return duel;
}

const combat = atRadar('wasteland');
combat._police(1 / 120);
assert.equal(combat.state.police.triggered, false, 'combat radar cannot trigger police');
assert.equal(combat.state.police.pursuit, null, 'combat races have no police pursuer');
assert.equal(combat.state.police.beep, 0, 'combat radar stays silent');
combat._ticket({ limitMph: 65 });
assert.equal(combat.state.status, 'racing', 'combat race cannot be stopped for a ticket');
assert.equal(combat.state.racePenaltySec, 0, 'combat race pays no police time penalty');

const ordinary = atRadar('duel');
ordinary._police(1 / 120);
assert.equal(ordinary.state.police.triggered, true, 'ordinary race keeps its radar rule');
assert.equal(ordinary.state.police.pursuit?.active, true, 'ordinary race keeps pursuit');

console.log('Wasteland police exclusion and ordinary radar preservation passed.');
