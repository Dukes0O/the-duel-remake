import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createProfile} from '../src/progression.js';
import {Duel} from '../src/game.js';
import {createFeatureFlags} from '../src/feature-flags.js';
import {startWarlordEvent} from '../src/arena/warlord-event.js';
import {settleWarlordResult} from '../src/arena/warlord-settlement.js';

const flags = () => createFeatureFlags({storage:null,qa:true,overrides:{'warlord-cards':true}});
function winningArena() {
  const duel = new Duel({featureFlags:flags()});
  duel.state.wastelandGateDiscovered = true;
  assert.equal(startWarlordEvent(duel,{warlordId:'sal',car:'falcone_f42'}),true);
  const arena = structuredClone(duel.state.arena);
  arena.phase = 'over'; arena.participants[0].wrecks = 3; arena.participants[1].wrecked = 3;
  arena.result = {winnerId:'player',reason:'three-wrecks',placings:['player','cpu-1']};
  return arena;
}
const priorCard = {id:'future-card',kind:'future',earnedAt:'prior'};
function profile() {
  const p = createProfile();
  return {...p,futureRoot:{keep:7},wasteland:{...p.wasteland,discoveredGate:true,
    futureCareer:{keep:9},cards:[priorCard]}};
}
function payload(changes={}) {
  return {runId:'first-sal',ownerPlayerId:'driver-a',activePlayerId:'driver-a',
    arena:winningArena(),car:'falcone_f42',cpuDifficulty:'medium',warlordCardsEnabled:true,...changes};
}
test('native first-win settlement adds exactly one story card with existing rewards',()=>{
  const before = profile(), snapshot = structuredClone(before), result = settleWarlordResult(before,payload());
  assert.equal(result.awarded,true);
  assert.deepEqual(result.profile.wasteland.cards,[priorCard,{id:'sal',kind:'warlord-story',earnedAt:'first-sal'}],
    'first win must settle its story card beside the native scrap, kit and marker');
  assert.equal(result.scrapEarned,720);
  assert.equal(result.profile.wasteland.warlords.sal.defeated,true);
  assert.equal(result.profile.wasteland.settledResults.includes('warlord:first-sal'),true);
  assert.deepEqual(before,snapshot,'pure settlement cannot modify its input');
  assert.deepEqual(result.profile.futureRoot,before.futureRoot);
  assert.deepEqual(result.profile.wasteland.futureCareer,before.wasteland.futureCareer);
  assert.deepEqual(settleWarlordResult(result.profile,payload({runId:'rematch'})).profile.wasteland.cards,result.profile.wasteland.cards);
  assert.equal(settleWarlordResult(before,payload({activePlayerId:'driver-b'})).awarded,false);
  assert.deepEqual(settleWarlordResult(before,payload({warlordCardsEnabled:false})).profile.wasteland.cards,before.wasteland.cards);
});
