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

// The wall resolves earlier saved wins without minting rewards during load.
test('story views include saved old defeats, and posters use the finished fight snapshot',async()=>{
  const cards = await import('../src/warlord-cards.js');
  const old = profile();
  old.wasteland.warlords = {...old.wasteland.warlords,sal:{defeated:true},defeated:['blackiron']};
  const before = structuredClone(old);
  const owned = cards.ownedStoryCards(old);
  assert.equal(owned.some(c=>c.id==='sal'),true);
  assert.equal(owned.some(c=>c.id==='blackiron'),true);
  assert.deepEqual(old,before,'legacy views do not backfill or pay rewards');
  const sal = cards.storyCardFor('sal');
  assert.equal(sal.id,'sal'); assert.equal(sal.carId,'banshee_muscle');
  assert.equal(typeof sal.name,'string'); assert.equal(sal.lines.length,3);
  assert.equal(sal.lines.every(line=>typeof line==='string'&&line.trim().length>0),true);
  const arena = winningArena(); arena.clockSec = 72; arena.suddenDeathSec = 3;
  const state = {status:'arena_result',wastelandGateDiscovered:true,arena,car:'falcone_f42',crewId:'nell',combat:{scoring:{hitsLanded:17}}};
  const view = cards.wantedPosterFor(state,{warlordCardsEnabled:true});
  for (const [key,value] of Object.entries({warlordId:'sal',carId:'falcone_f42',crewId:'nell',wrecks:3,hits:17,timeSec:75}))
    assert.equal(view[key],value,'poster reads actual fight '+key);
  assert.equal(cards.wantedPosterFor(state,{warlordCardsEnabled:false}),null);
  state.arena.result.winnerId = 'cpu-1';
  assert.equal(cards.wantedPosterFor(state,{warlordCardsEnabled:true}),null,'losses do not get winner posters');
});

test('App saves card, reward and marker in one write, and a failed write awards nothing',async()=>{
  const {App} = await import('../src/app.js');
  const {loadPlayers,savePlayers,PLAYERS_KEY} = await import('../src/progression.js');
  const {applyArmorDamage} = await import('../src/combat-armor.js');
  const values = new Map(); let failing = false, writes = [];
  const storage = {getItem:key=>values.get(String(key))??null,
    setItem:(key,value)=>{if(failing)throw Error('synthetic save failure');values.set(String(key),String(value));writes.push({key:String(key),value:String(value)});},
    removeItem:key=>values.delete(String(key))};
  globalThis.localStorage = storage; globalThis.cancelAnimationFrame = ()=>{};
  const app = new App();
  try {
    app.duel.featureFlags = flags(); app.audio.unlock = ()=>{}; app.cpuDifficulty = 'medium';
    app.profile = {...app.profile,futureRoot:{keep:7},wasteland:{...app.profile.wasteland,
      discoveredGate:true,cards:[priorCard],territories:{...app.profile.wasteland.territories,sal:{hold:100,claimed:false}}}};
    assert.equal(app._saveProfile(),true);
    const registry = loadPlayers(storage), other = profile();
    registry.players.push({id:'driver-b',name:'Driver B',profile:other});
    assert.equal(savePlayers(registry,storage),true);
    const savedOther = structuredClone(loadPlayers(storage).players.find(p=>p.id==='driver-b').profile);
    assert.equal(app.visitWasteland(),true); app.advance(8);
    assert.equal(app.startWarlordFight('sal'),true); assert.equal(app.beginWarlordFight(),true);
    app.duel.state.countdown = 0; app.duel.step(1/120); app.duel.step(1/120);
    const before = structuredClone(app.profile), persisted = [...values], runId = app.runId;
    failing = true;
    const d = app.duel, loser = d.state.opponents[0];
    for(let n=0;n<3;n++) {
      for(const p of d.state.arena.participants){p.protectedSec=0;p.wreckCounted=false;}
      d.state.invulnerableSec=0;d.state.combat.shield=d.state.combat.rivalShield=0;
      loser.combatWrecking=false;loser.armor=1;
      applyArmorDamage(d,loser,'crossbow',{owner:'player'});d.step(1/120);
    }
    assert.equal(d.state.status,'arena_result'); failing = false;
    assert.deepEqual(app.profile,before); assert.deepEqual([...values],persisted);
    assert.equal(d.state.arena.result.settlementSaved,false);
    writes = [];
    assert.equal(app._settleArenaResult({result:d.state.arena.result},d.state),true);
    const resultWrites = writes.filter(w=>w.key===PLAYERS_KEY);
    assert.equal(resultWrites.length,1,'card and normal rewards share one registry commit');
    const stored = JSON.parse(resultWrites[0].value).players.find(p=>p.id===app.player.id).profile.wasteland;
    assert.deepEqual(stored.cards,[priorCard,{id:'sal',kind:'warlord-story',earnedAt:runId}]);
    assert.equal(stored.scrap,before.wasteland.scrap+720);
    assert.equal(stored.warlords.sal.defeated,true);
    assert.equal(stored.settledResults.includes('warlord:'+runId),true);
    assert.deepEqual(loadPlayers(storage).players.find(p=>p.id==='driver-b').profile,savedOther);
    assert.equal(app._settleArenaResult({result:d.state.arena.result},d.state),false);
    const saved = [...values]; writes = [];
    loadPlayers(storage);
    assert.deepEqual([...values],saved); assert.equal(writes.length,0,'load does not mint cards or write');
  } finally {failing=false;app.dispose?.();delete globalThis.localStorage;}
});
