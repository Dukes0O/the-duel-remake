import assert from 'node:assert/strict';
import {combatXpCue} from '../src/combat-hud.js';
import {notorietyResultPresentation} from '../src/screen-results.js';

assert.equal(combatXpCue({combatWreck:true,victim:'rival',owner:'player'}),
  '+150 NOTORIETY · FINISH TO KEEP');
for (const event of [
  {combatWreck:true,victim:'player',owner:'cpu'},
  {combatWreck:true,victim:'rival',owner:'cpu'},
  {combatHit:true,victim:'rival',owner:'player'},
]) assert.equal(combatXpCue(event),null);
assert.deepEqual(notorietyResultPresentation({notorietyEarned:550,notorietyRank:3}),
  {xp:550,rank:3});
assert.deepEqual(notorietyResultPresentation({notorietyEarned:0,notorietyRank:30}),
  {xp:0,rank:30});
assert.equal(notorietyResultPresentation({creditReward:100}),null);
console.log('Notoriety feedback: owned wreck cue and settled XP/rank presentation pass.');
