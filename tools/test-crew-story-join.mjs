import assert from 'node:assert/strict';
import {availableCrew, selectCrew, selectedCrewId} from '../src/crew.js';
import {crewPanel} from '../src/crew-ui.js';
import {Duel} from '../src/game.js';

const profile = unlocked => ({wasteland:{version:1,xp:0,
  crew:{unlocked,selected:'rook'}}});
const names = profile => availableCrew(profile).map(member=>member.id);
const plainText = value => value;

for (const id of ['cinder','jax']) {
  const joined = profile(['rook',id]);
  assert.ok(names(joined).includes(id), `${id} story reward appears at rank 1`);
  assert.equal(selectCrew(joined,id).ok, true, `${id} can be selected at rank 1`);
  assert.equal(selectedCrewId({...joined,wasteland:{...joined.wasteland,
    crew:{...joined.wasteland.crew,selected:id}}}), id);
  const panel = crewPanel(joined,plainText);
  assert.match(panel, new RegExp(`data-crew-select="${id}"[^>]*>SELECT CREW`));
}

assert.ok(!names(profile(['rook'])).includes('cinder'));
assert.ok(!names(profile(['rook'])).includes('jax'));
assert.equal(selectCrew(profile(['rook']),'cinder').ok, false);
assert.equal(selectCrew(profile(['rook']),'jax').ok, false);

const rank12 = profile(['rook']);
rank12.wasteland.xp = 400 + 550 + 700 + 850 + 1000 + 1150 + 1300 + 1450 + 1600 + 1750 + 1900;
for (const id of ['cinder','jax']) assert.ok(names(rank12).includes(id));

const seededField = seed => {
  const duel = new Duel({seed});
  duel.startCampaign({mode:'wasteland',car:'falcone_f42',seed,
    discoveredGate:true,opponentCount:3,cpuDifficulty:'hard'});
  return duel.state.opponents.map(actor=>({id:actor.id,car:actor.car,crewId:actor.cpuCrew?.crewId}));
};
// Taken from integration before this change. The computer field must not move.
assert.deepEqual(seededField(3004),Array.from({length:3},()=>({id:undefined,car:'falcone_f42',crewId:undefined})),
  'a fixed seed still creates the same computer field');

console.log('Crew story join: Cinder and Jax admission, picking, rank 12, and seeded field passed.');
