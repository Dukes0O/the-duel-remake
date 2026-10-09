import assert from 'node:assert/strict';
import {test} from 'node:test';
import * as crew from '../src/crew.js';
import {createProfile} from '../src/progression.js';
import {crewPanel} from '../src/crew-ui.js';

const ordinary = ['rook','nell','jax','odessa','cinder','dune','wren','tusk'];
function profile(earned=false) {
  const p = createProfile();
  return {...p,wasteland:{...p.wasteland,discoveredGate:true,xp:1000000,
    crew:{unlocked:[...ordinary,'vesper'],selected:'vesper'},
    warlords:{...p.wasteland.warlords,blackiron:{defeated:earned,wins:earned?1:0,losses:0}}}};
}
test('Vesper is secret until this player has a saved Baron defeat, preserving the ordinary eight',()=>{
  assert.deepEqual(Object.keys(crew.CREW),ordinary);
  assert.equal(typeof crew.crewRoster,'function','earned metadata must keep Vesper outside the ordinary CPU catalog');
  assert.equal(crew.VESPER?.id,'vesper');
  const on = {warlordCardsEnabled:true}, hidden = profile(), earned = profile(true);
  assert.equal(crew.crewRoster(hidden,on).some(c=>c.id==='vesper'),false);
  assert.equal(crewPanel(hidden,String,{gearEnabled:true,...on}).includes('Vesper'),false);
  assert.equal(crew.selectedCrewId(hidden,on),'rook','raw unlocked IDs and rank cannot forge the secret reward');
  assert.equal(crew.selectCrew(hidden,'vesper',on).changed,false);
  assert.equal(crew.crewRoster(earned,on).some(c=>c.id==='vesper'),true);
  assert.equal(crew.selectedCrewId(earned,on),'vesper');
  assert.equal(crew.crewRoster(earned,{warlordCardsEnabled:false}).some(c=>c.id==='vesper'),false);
  assert.equal(crew.selectedCrewId(earned,{warlordCardsEnabled:false}),'rook');
});
