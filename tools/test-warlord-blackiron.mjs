import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import {ffmpeg} from './audio/codec.mjs';
import {Duel} from '../src/game.js';
import {App} from '../src/app.js';
import {createFeatureFlags} from '../src/feature-flags.js';
import {WARLORDS, WARLORD_LADDER, warlordUnlockSatisfied, vesperEarned} from '../src/warlords.js';
import {startWarlordEvent, beginWarlordEvent} from '../src/arena/warlord-event.js';
import {BLACKIRON_RULES, resetBlackiron, thinkBlackiron} from '../src/warlords/blackiron.js';
import {BRAIN_DIFFICULTY} from '../src/arena/arena-brains.js';
import {createProfile} from '../src/progression.js';
import {normalizeWasteland} from '../src/wasteland-progress.js';
import {territoryPanel} from '../src/screen-territory.js';
import {armorKitBonus, armorKitMass, ownsArmorKit, equipArmorKit, getEquippedArmorKit,
  getEquippedRoofLook} from '../src/armor-kits.js';
import {settleWarlordResult} from '../src/arena/warlord-settlement.js';
import {applyArmorDamage} from '../src/combat-armor.js';
import {BLACKIRON_FIGHT} from '../src/warlords/blackiron.js';
import {SAL_FIGHT, resetSawSweep, thinkSawSweep} from '../src/warlords/sal.js';
import {worldPose} from '../src/arena/arena-floor.js';
import {carEffect} from '../src/arsenal/car-effects.js';
import {deployOil} from '../src/arsenal/oil.js';
import {stepCombat, fireWeapon} from '../src/combat.js';
import {pilotStep} from '../src/arena/arena-pilot.js';
import {spawnSync} from 'node:child_process';
import * as THREE from 'three';
import {createVehicleAttachmentRegistry} from '../src/vehicle-attachments.js';
import {createArmorKitMeshes} from '../src/armor-kit-meshes.js';
import {SOUND_BANK} from '../src/sound-bank.js';
import {EngineAudio} from '../src/audio.js';

// Wave three was released on 9 October 2026; this older baseline names it off explicitly.
const flags = enabled => createFeatureFlags({storage: null, qa: true,
  overrides: {blackiron: enabled, 'arsenal-wave3': false}});
function profile() {
  const saved = createProfile();
  saved.wasteland.discoveredGate = true;
  saved.wasteland.territories.blackiron.hold = 100;
  for (const id of WARLORD_LADDER.slice(0, -1))
    saved.wasteland.warlords[id] = {defeated: true, wins: 1, losses: 0};
  return saved;
}
function fight(difficulty = 'medium') {
  const duel = new Duel({seed: 1989, featureFlags: flags(true)});
  duel.state.wastelandGateDiscovered = true;
  assert.equal(startWarlordEvent(duel, {warlordId: 'blackiron', car: 'falcone_f42',
    cpuDifficulty: difficulty, playerId: 'test-driver', seed: 1989}), true);
  assert.equal(beginWarlordEvent(duel), true);
  for (let i = 0; i < 361; i++) duel.step(1 / 120);
  return {duel, actor: duel.state.opponents[0], participant: duel.state.arena.participants[1]};
}

test('Baron unlock requires full own hold and all seven saved defeats, without writing the save', () => {
  const saved = profile(), before = structuredClone(saved);
  assert.equal(warlordUnlockSatisfied(saved, 'blackiron'), true);
  assert.match(territoryPanel(saved, {featureFlags: flags(true)}), /data-warlord="blackiron"/);
  assert.deepEqual(saved, before);
  for (const id of WARLORD_LADDER.slice(0, -1)) {
    const missing = structuredClone(saved); missing.wasteland.warlords[id].defeated = false;
    assert.equal(warlordUnlockSatisfied(missing, 'blackiron'), false, id);
    assert.doesNotMatch(territoryPanel(missing, {featureFlags: flags(true)}), /data-warlord="blackiron"/);
  }
  saved.wasteland.territories.blackiron.hold = 99;
  assert.equal(warlordUnlockSatisfied(saved, 'blackiron'), false);
});

test('Baron is Preview-only, while earlier built fights stay available', () => {
  const saved = profile();
  assert.doesNotMatch(territoryPanel(saved, {featureFlags: flags(false)}), /data-warlord="blackiron"/);
  assert.equal(WARLORDS.blackiron.car, 'viper_proto');
  assert.equal(WARLORDS.blackiron.venue, 'pit');
  assert.deepEqual(BLACKIRON_RULES.cycle, ['saw', 'dust', 'mirage', 'barrage']);
  assert.deepEqual(BLACKIRON_RULES.cooldownSec, {easy: 8, medium: 7, hard: 6});
});

test('Native entry uses the Pit, the Viper and its literal 80-times-1.5 armor', () => {
  const {duel, actor} = fight();
  assert.equal(duel.state.arena.venueId, 'pit');
  assert.equal(actor.car, 'viper_proto');
  assert.equal(actor.maxArmor, 120);
  assert.equal(actor.combatRoofLook, 'chrome-crown');
  assert.equal(duel.state.arena.timeLimitSec, 240);
});

test('Crown keeps each paid armor tier, costs nothing and has one exclusive roof slot', () => {
  for (const kit of [null, 'scrapper', 'raider', 'warlord']) {
    const saved = profile(); saved.wasteland.warlords.blackiron = {defeated: true};
    saved.wasteland.warlords.gunn = {defeated: true};
    saved.wasteland.kits.falcone_f42 = {owned: kit ? [kit] : [], equipped: kit};
    const before = structuredClone(saved), worn = equipArmorKit(saved, 'falcone_f42', 'chrome-crown');
    assert.equal(worn.ok, true); assert.equal(worn.cost, 0);
    assert.equal(getEquippedRoofLook(worn.profile, 'falcone_f42'), 'chrome-crown');
    assert.equal(getEquippedArmorKit(worn.profile, 'falcone_f42'), kit);
    assert.equal(worn.profile.wasteland.scrap, saved.wasteland.scrap);
    assert.equal(worn.profile.credits, saved.credits);
    assert.deepEqual(saved, before);
    const changed = equipArmorKit(worn.profile, 'falcone_f42', 'turret-look');
    assert.equal(changed.ok, true); assert.equal(getEquippedRoofLook(changed.profile, 'falcone_f42'), null);
    assert.equal(getEquippedArmorKit(changed.profile, 'falcone_f42'), 'turret-look');
    const crownAgain = equipArmorKit(changed.profile, 'falcone_f42', 'chrome-crown');
    assert.equal(crownAgain.ok, true); assert.equal(getEquippedArmorKit(crownAgain.profile, 'falcone_f42'), null);
    const removed = equipArmorKit(crownAgain.profile, 'falcone_f42', null);
    assert.equal(removed.ok, true); assert.equal(getEquippedRoofLook(removed.profile, 'falcone_f42'), null);
  }
});

test('Fresh-process direct weapon and native entry imports do not create an initialization cycle', () => {
  for (const entry of ['src/combat-weapons.js', 'src/arena/warlord-event.js', 'src/game.js']) {
    const child = spawnSync(process.execPath, ['--input-type=module', '-e',
      `await import('./${entry}'); const {Duel}=await import('./src/game.js');
      const {createFeatureFlags}=await import('./src/feature-flags.js');
      const {startWarlordEvent}=await import('./src/arena/warlord-event.js');
      const d=new Duel({featureFlags:createFeatureFlags({qa:true,storage:null,overrides:{blackiron:true}})});
      d.state.wastelandGateDiscovered=true;
      if(!startWarlordEvent(d,{warlordId:'blackiron',car:'falcone_f42'}))throw Error('entry denied');`],
    {cwd: new URL('..', import.meta.url), encoding: 'utf8', windowsHide: true});
    assert.equal(child.status, 0, entry + ': ' + child.stderr);
  }
});

function near(duel, actor, sideways, along) {
  const me = worldPose(duel, actor);
  const at = duel.course.nearest(me.x + Math.cos(me.heading) * sideways + Math.sin(me.heading) * along,
    me.z - Math.sin(me.heading) * sideways + Math.cos(me.heading) * along, actor.s);
  Object.assign(duel.state, {s: at.s, prevS: at.s, lateral: at.lateral, prevLateral: at.lateral,
    headingError: actor.headingError, speedMph: 0});
}

test('One cycle delegates all four real moves, in order, with their complete windows', () => {
  const {duel, actor, participant} = fight();
  const names = ['saw', 'dust', 'mirage', 'barrage'];
  for (const [index, name] of names.entries()) {
    actor.blackiron.nextSec = duel.state.stageTimeSec;
    const pose = name === 'dust' ? [0, -20] : name === 'barrage' ? [0, 50] : [4, 0];
    near(duel, actor, ...pose);
    thinkBlackiron(duel, participant, actor, BRAIN_DIFFICULTY.medium);
    assert.equal(actor.blackiron.move, name);
    assert.equal(actor.blackiron.index, index);
    assert.equal(actor.arenaTellSec > 0 || actor.arenaShimmerSec > 0 || actor.salSaw?.stage === 'tell', true);
    for (let n = 0; actor.blackiron.move && n < 1800; n++) {
      duel.state.stageTimeSec += 1 / 120;
      if (name === 'saw') near(duel, actor, 30, 0);
      thinkBlackiron(duel, participant, actor, BRAIN_DIFFICULTY.medium);
    }
    assert.equal(actor.blackiron.move, null, name + ' must end after its actual existing window');
    assert.equal(actor.blackiron.index, index + 1);
    assert.equal(duel.state.opponents.filter(car => car.decoy).length, 0);
  }
});

test('Native respawn enters phase two with full 120 armor and keeps the Crown', () => {
  const {duel, actor} = fight();
  for (let n = 0; n < 3; n++) applyArmorDamage(duel, actor, 'fixed', {amount: 80, owner: 'player'});
  duel.step(1 / 120);
  assert.equal(duel.state.arena.warlordPhase, 2);
  for (let n = 0; actor.combatWrecking && n < 600; n++) duel.step(1 / 120);
  assert.equal(actor.combatWrecking, false);
  assert.equal(actor.maxArmor, 120); assert.equal(actor.armor, 120);
  assert.equal(actor.combatRoofLook, 'chrome-crown');
});

test('Phase one cannot fire untelegraphed Nitro; player and ordinary CPU keep their wave-three gate', () => {
  const {duel, actor} = fight('hard');
  assert.equal(fireWeapon(duel, 'nitro', true, actor), false);
  assert.equal(fireWeapon(duel, 'nitro'), false);
  actor.blackiron.move = null;
  near(duel, actor, 0, 60);
  assert.equal(fireWeapon(duel, 'mortar', true, actor), true, 'the actual Baron receives the registered full-arsenal capability');
  assert.equal(fireWeapon(duel, 'mortar'), false, 'the player cannot borrow the capability');
  const oldId = duel.state.arena.warlordId;
  duel.state.arena.warlordId = 'sal'; actor.warlordId = 'sal';
  assert.equal(fireWeapon(duel, 'mortar', true, actor), false);
  duel.state.arena.warlordId = oldId; actor.warlordId = oldId;
});

test('Crown preserves authored transforms and material variants through normal-Crown-normal switches', async () => {
  const source = new THREE.Group(), warlord = new THREE.Group(), raider = new THREE.Group();
  warlord.name = 'kit-warlord'; raider.name = 'kit-raider'; source.add(warlord, raider);
  warlord.position.set(.1, .2, -.3); warlord.scale.set(.8, 1.1, .9);
  const material = new THREE.MeshStandardMaterial({map: new THREE.Texture(), color: 0x897866,
    roughness: .73, metalness: .67});
  const crown = new THREE.Mesh(new THREE.BoxGeometry(), material); crown.name = 'kit-crown';
  crown.position.set(.2, .8, -.4); crown.scale.set(.7, .9, 1.2); crown.rotation.y = .2;
  warlord.add(crown);
  const base = new THREE.Mesh(new THREE.BoxGeometry(), material); base.name = 'warlord-crossbar';
  base.position.set(0, .5, 0); base.scale.set(1.2, .1, .2); raider.add(base);
  const car = new THREE.Group(); car.userData.vehicleKey = 'viper_proto';
  car.userData.size = {width: 2.6, length: 4.8, height: 1.55};
  const state = {s: 0, lateral: 0, armor: 100, maxArmor: 100, combatArmorKit: 'warlord',
    mode: 'wasteland', wastelandGateDiscovered: true, status: 'racing', stageTimeSec: 1,
    combat: {}, opponents: []};
  const duel = {state, course: {groundAt: () => ({y: 0})}};
  const registry = createVehicleAttachmentRegistry();
  const kits = createArmorKitMeshes(registry, {loadKitAsset: async () => ({scene: source})});
  const visible = node => {
    for (let current = node; current; current = current.parent) if (!current.visible) return false;
    return !!node;
  };
  try {
    kits.update(duel, {player: car}, true);
    await new Promise(resolve => setImmediate(resolve));
    kits.update(duel, {player: car}, true); car.updateMatrixWorld(true);
    const original = car.getObjectByName('kit-crown'), spikes = car.getObjectByName('chrome-crown-spikes');
    const originalParent = original.parent, transform = original.matrixWorld.toArray();
    const scale = original.scale.toArray(), map = original.material.map;
    const color = original.material.color.toArray(), originalVersion = original.material.version;
    const bindScale = spikes.scale.clone(), ordinaryVersion = spikes.material.version;
    let cloneDisposed = false;
    spikes.geometry.addEventListener('dispose', () => {cloneDisposed = true;});
    assert.equal(visible(original), true); assert.equal(visible(spikes), false);
    const before = structuredClone(state);
    state.combatRoofLook = 'chrome-crown';
    kits.update(duel, {player: car}, true); car.updateMatrixWorld(true);
    assert.equal(visible(original), false); assert.equal(visible(spikes), true);
    assert.equal(visible(car.getObjectByName('chrome-crown-base')), true);
    assert.deepEqual(original.matrixWorld.toArray(), transform); assert.equal(original.parent, originalParent);
    assert.deepEqual(original.scale.toArray(), scale); assert.equal(original.material.map, map);
    assert.deepEqual(original.material.color.toArray(), color); assert.equal(original.material.version, originalVersion);
    assert.equal(spikes.material.map, null); assert.equal(spikes.material.roughnessMap, map);
    assert.equal(spikes.material.color.getHex(), 0xf6f8fa);
    assert.equal(spikes.material.roughness, .13); assert.equal(spikes.material.metalness, 1);
    assert.equal(spikes.material.envMapIntensity, 1.9);
    assert.notEqual(spikes.geometry, original.geometry, 'stretch never edits authored geometry');
    const oldBounds = new THREE.Box3().setFromObject(original, true);
    const tallerBounds = new THREE.Box3().setFromObject(spikes, true);
    assert.ok(Math.abs(tallerBounds.min.y - oldBounds.min.y) < 1e-7, 'fitted lower edge stays put');
    for (const axis of ['x', 'z']) for (const edge of ['min', 'max'])
      assert.ok(Math.abs(tallerBounds[edge][axis] - oldBounds[edge][axis]) < 1e-7, 'width and depth keep their fit: ' + JSON.stringify({axis, edge, old:oldBounds[edge][axis], taller:tallerBounds[edge][axis]}));
    const blackBase = car.getObjectByName('chrome-crown-base');
    assert.deepEqual(blackBase.matrixWorld.toArray(), car.getObjectByName('warlord-crossbar').matrixWorld.toArray());
    assert.equal(blackBase.material.color.getHex(), 0x15191b);
    assert.ok(Math.abs((tallerBounds.max.y - tallerBounds.min.y) /
      (oldBounds.max.y - oldBounds.min.y) - 1.5) < 1e-7, 'spikes are 1.5 times taller');
    assert.equal(spikes.material.version, ordinaryVersion + 1);
    const chromeVersion = spikes.material.version;
    for (let i = 0; i < 10; i++) kits.update(duel, {player: car}, true);
    assert.equal(spikes.material.version, chromeVersion, 'unchanged frames do not recompile');
    state.arenaNitroTellSec = 1; kits.update(duel, {player: car}, true);
    assert.ok(spikes.scale.distanceTo(bindScale.clone().multiplyScalar(1.12)) < 1e-12);
    assert.deepEqual(original.scale.toArray(), scale);
    state.arenaNitroTellSec = 0; state.arenaNitroSpentSec = 1;
    kits.update(duel, {player: car}, true); assert.equal(visible(spikes), false);
    state.arenaNitroSpentSec = 0;
    for (const tier of [null, 'scrapper', 'raider', 'warlord']) {
      state.combatArmorKit = tier; kits.update(duel, {player: car}, true);
      assert.equal(visible(original), false); assert.equal(visible(spikes), true, String(tier));
    }
    state.combatArmorKit = 'warlord'; delete state.combatRoofLook;
    delete state.arenaNitroTellSec; delete state.arenaNitroSpentSec;
    kits.update(duel, {player: car}, true); car.updateMatrixWorld(true);
    assert.equal(visible(original), true); assert.equal(visible(spikes), false);
    assert.equal(spikes.material.map, map); assert.equal(spikes.material.version, chromeVersion + 1);
    assert.deepEqual(original.matrixWorld.toArray(), transform); assert.deepEqual(state, before);
    kits.update(duel, {player: car}, true);
    assert.equal(spikes.material.version, chromeVersion + 1);
    kits.dispose();
    assert.equal(cloneDisposed, true, 'dispose releases the cloned spike geometry');
  } finally {kits.dispose();}
});

test('Actual native Nitro preserves its 35-percent effect, oil cancels it and the full window remains', () => {
  const {duel, actor, participant} = fight('hard');
  duel.state.arena.warlordPhase = 2;
  actor.blackiron.index = 4; actor.blackiron.nextSec = duel.state.stageTimeSec;
  near(duel, actor, 0, 20);
  thinkBlackiron(duel, participant, actor, BRAIN_DIFFICULTY.hard);
  assert.equal(actor.blackiron.stage, 'tell');
  assert.equal(carEffect(actor, 'nitro'), null);
  duel.state.stageTimeSec = actor.blackiron.untilSec;
  const ram = thinkBlackiron(duel, participant, actor, BRAIN_DIFFICULTY.hard);
  assert.equal(actor.blackiron.stage, 'ram'); assert.equal(ram.boost, false);
  assert.equal(carEffect(actor, 'nitro').topSpeed, 1.35);
  assert.equal(carEffect(actor, 'nitro').acceleration, 1.35);
  assert.equal(carEffect(actor, 'nitro').ramMultiplier, 3);
  near(duel, actor, 0, 6);
  duel.state.headingError = actor.headingError;
  assert.ok(deployOil(duel, duel.state));
  stepCombat(duel, 1 / 120);
  assert.equal(carEffect(actor, 'nitro'), null, 'actual oil hazard contact cancels Nitro');
  const window = thinkBlackiron(duel, participant, actor, BRAIN_DIFFICULTY.hard);
  assert.equal(actor.blackiron.stage, 'window'); assert.equal(actor.arenaNitroSpentSec, 2.5);
  for (const face of ['front', 'rear', 'left', 'right', undefined])
    assert.equal(BLACKIRON_FIGHT.defense(duel, actor, face), 1.5);
  actor.speedMph = 220; actor._arenaUTurn = 1; actor.boost = 1;
  pilotStep(duel, actor, {...window, boost: true}, 1 / 120);
  assert.ok(actor.speedMph <= window.speedCapMph);
  duel.state.stageTimeSec = actor.blackiron.untilSec - 1 / 120;
  thinkBlackiron(duel, participant, actor, BRAIN_DIFFICULTY.hard);
  assert.equal(actor.blackiron.move, 'nitro', 'phase-two chaining cannot truncate the window');
  duel.state.stageTimeSec += 1 / 120;
  thinkBlackiron(duel, participant, actor, BRAIN_DIFFICULTY.hard);
  assert.equal(actor.blackiron.move, null); assert.equal(actor.arenaNitroSpentSec, 0);
});

test('Blackiron-only admission plays native barrage, Nitro tell and spent cues using the old warning layers', () => {
  assert.equal(SOUND_BANK['arena.blackiron-barrage'].layers, SOUND_BANK['arena.gunn-barrage'].layers);
  assert.equal(SOUND_BANK['warlord.nitroTell'].files, SOUND_BANK['weapon.nitro.start'].files);
  const {duel, actor, participant} = fight('hard'), events = [];
  const emit = duel.emit.bind(duel); duel.emit = event => {events.push(event); emit(event);};
  actor.blackiron.index = 3; actor.blackiron.nextSec = duel.state.stageTimeSec;
  near(duel, actor, 0, 50); thinkBlackiron(duel, participant, actor, BRAIN_DIFFICULTY.hard);
  assert.equal(events.find(event => event.arenaTell)?.arenaTell.cue, 'arena.blackiron-barrage');
  resetBlackiron(duel, actor); duel.state.arena.warlordPhase = 2;
  actor.blackiron.index = 4; actor.blackiron.nextSec = duel.state.stageTimeSec;
  near(duel, actor, 0, 20); thinkBlackiron(duel, participant, actor, BRAIN_DIFFICULTY.hard);
  duel.state.stageTimeSec = actor.blackiron.untilSec;
  thinkBlackiron(duel, participant, actor, BRAIN_DIFFICULTY.hard);
  duel.state.stageTimeSec = actor.blackiron.untilSec;
  thinkBlackiron(duel, participant, actor, BRAIN_DIFFICULTY.hard);
  assert.equal(events.filter(event => event.arenaTell?.cue === 'warlord.nitroTell').length, 1);
  assert.equal(events.filter(event => event.arsenalCue === 'warlord.nitroSpent').length, 1);
  const audio = new EngineAudio({flags: duel.featureFlags}), admitted = [];
  audio.context = {state: 'running'}; audio.buses = {weapons: {}, impacts: {}};
  audio._syncMixer = () => {};
  audio._runCue = id => {admitted.push(id); return {id};};
  audio._spatialOutput = () => ({level: {}, disconnect() {}});
  for (const event of events) if (event.arenaTell || event.arsenalCue === 'warlord.nitroSpent')
    audio.event(event, duel.state, duel.course);
  assert.deepEqual(admitted, ['arena.blackiron-barrage', 'warlord.nitroTell', 'warlord.nitroSpent']);
  audio.flags = flags(false);
  for (const id of admitted) assert.equal(audio._playCue(id), null);
});

test('A saved Baron defeat earns Vesper and Crown without changing an older save', () => {
  const saved = profile(); saved.wasteland.warlords.blackiron = {defeated: true, wins: 1, losses: 0};
  const before = structuredClone(saved);
  assert.equal(vesperEarned(saved), true);
  assert.equal(ownsArmorKit(saved, 'falcone_f42', 'chrome-crown'), true);
  assert.equal(armorKitBonus('chrome-crown'), 0);
  assert.equal(armorKitMass('chrome-crown'), 0);
  assert.deepEqual(saved, before);
  assert.equal(normalizeWasteland(saved.wasteland).title, undefined);
});

test('Normalization retains only a valid bounded earned title and never grants it', () => {
  const saved = profile();
  assert.equal(normalizeWasteland(saved.wasteland).title, undefined);
  saved.wasteland.title = 'Warlord of the Wastes';
  assert.equal(normalizeWasteland(saved.wasteland).title, 'Warlord of the Wastes');
  saved.wasteland.title = 'x'.repeat(129);
  assert.equal(normalizeWasteland(saved.wasteland).title, undefined);
});

test('Native three-wreck win settles pay, Crown, title and Vesper entitlement exactly once', () => {
  const {duel, actor} = fight();
  for (let wreck = 0; wreck < 3; wreck++) {
    if (wreck) for (let n = 0; n < 700; n++) duel.step(1 / 120);
    for (let n = 0; n < 3; n++) applyArmorDamage(duel, actor, 'fixed', {amount: 80, owner: 'player'});
    duel.step(1 / 120);
  }
  assert.equal(duel.state.status, 'arena_result');
  assert.equal(duel.state.arena.result.winnerId, 'player');
  const saved = profile();
  saved.wasteland.kits.falcone_f42 = {owned: ['raider'], equipped: 'raider'};
  const before = structuredClone(saved), args = {runId: 'baron-first', ownerPlayerId: 'test-driver',
    activePlayerId: 'test-driver', arena: duel.state.arena, car: 'falcone_f42', cpuDifficulty: 'medium'};
  const settled = settleWarlordResult(saved, args);
  assert.equal(settled.awarded, true); assert.equal(settled.scrapEarned, 1560);
  assert.equal(settled.titleEarned, 'Warlord of the Wastes');
  assert.equal(settled.profile.wasteland.title, 'Warlord of the Wastes');
  assert.equal(vesperEarned(settled.profile), true);
  assert.ok(!settled.profile.wasteland.crew.unlocked.includes('vesper'));
  assert.equal(getEquippedArmorKit(settled.profile, 'falcone_f42'), 'raider');
  assert.equal(getEquippedRoofLook(settled.profile, 'falcone_f42'), 'chrome-crown');
  assert.equal(settleWarlordResult(settled.profile, args).awarded, false);
  assert.deepEqual(saved, before);
  const rematch = settleWarlordResult(settled.profile, {...args, runId: 'baron-rematch'});
  assert.equal(rematch.scrapEarned, 312); assert.equal(rematch.titleEarned, null);
  assert.equal(rematch.profile.wasteland.title, 'Warlord of the Wastes');
  assert.equal(settleWarlordResult(saved, {...args, activePlayerId: 'another-player'}).awarded, false);
});

test('Failed Crown wear and Baron settlement writes expose no partial reward and retry once', () => {
  const storageDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const cancelDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'cancelAnimationFrame');
  const saved = new Map(); let fail = false;
  Object.defineProperty(globalThis, 'localStorage', {configurable: true, value: {
    getItem: key => saved.get(String(key)) ?? null,
    setItem: (key, value) => {if (fail) throw Error('synthetic failed write'); saved.set(String(key), String(value));},
    removeItem: key => saved.delete(String(key)),
  }});
  globalThis.cancelAnimationFrame = () => {};
  const app = new App();
  try {
    app.duel.featureFlags = flags(true); app.audio.unlock = () => {}; app.cpuDifficulty = 'medium';
    app.profile = profile(); app.profile.wasteland.warlords.blackiron = {defeated: true, wins: 1, losses: 0};
    assert.equal(app._saveProfile(), true);
    const original = structuredClone(app.profile), registry = [...saved];
    fail = true;
    assert.equal(app.equipArmorKit('falcone_f42', 'chrome-crown').ok, false);
    assert.deepEqual(app.profile, original); assert.deepEqual([...saved], registry);
    fail = false;
    app.profile = profile(); assert.equal(app._saveProfile(), true);
    assert.equal(app.visitWasteland(), true); app.advance(8);
    assert.equal(app.startWarlordFight('blackiron'), true); assert.equal(app.beginWarlordFight(), true);
    app.duel.state.countdown = 0; app.duel.step(1 / 120); app.duel.step(1 / 120);
    const before = structuredClone(app.profile), durable = [...saved];
    fail = true;
    for (let wreck = 0; wreck < 3; wreck++) {
      for (const p of app.duel.state.arena.participants) {p.protectedSec = 0; p.wreckCounted = false;}
      const actor = app.duel.state.opponents[0]; actor.combatWrecking = false; actor.armor = 1;
      applyArmorDamage(app.duel, actor, 'crossbow', {owner: 'player'}); app.duel.step(1 / 120);
    }
    const result = app.duel.state.arena.result;
    assert.equal(app.duel.state.status, 'arena_result');
    assert.deepEqual(app.profile, before); assert.deepEqual([...saved], durable);
    assert.equal(result.settlementSaved, false); assert.equal(result.scrapEarned, 0);
    assert.ok(!result.titleEarned); assert.equal(vesperEarned(app.profile), false);
    fail = false;
    assert.equal(app._settleArenaResult({result}, app.duel.state), true);
    assert.equal(app.profile.wasteland.scrap, before.wasteland.scrap + 1560);
    assert.equal(app.profile.wasteland.title, 'Warlord of the Wastes');
    assert.equal(getEquippedRoofLook(app.profile, 'falcone_f42'), 'chrome-crown');
    assert.equal(app._settleArenaResult({result}, app.duel.state), false);
  } finally {
    fail = false; app.dispose?.();
    if (storageDescriptor) Object.defineProperty(globalThis, 'localStorage', storageDescriptor);
    else delete globalThis.localStorage;
    if (cancelDescriptor) Object.defineProperty(globalThis, 'cancelAnimationFrame', cancelDescriptor);
    else delete globalThis.cancelAnimationFrame;
  }
});

test('Native spent engine cue avoids the rejected regular digital chopping', () => {
  const bytes = readFileSync(new URL('../public/assets/audio/blackiron/nitro-spent.ogg', import.meta.url));
  const pcm = ffmpeg(['-i', 'pipe:0', '-ac', '1', '-ar', '48000', '-f', 'f32le', 'pipe:1'], {input: bytes});
  assert.ok(Math.abs(pcm.length / 4 / 48000 - .85) < .03, 'same short cue, allowing codec padding');
  const envelope = [];
  for (let i = 0; i + 480 * 4 < pcm.length; i += 480 * 4) {
    let energy = 0;
    for (let j = 0; j < 480; j++) energy += pcm.readFloatLE(i + j * 4) ** 2;
    envelope.push(Math.sqrt(energy / 480));
  }
  const mean = envelope.reduce((sum, value) => sum + value, 0) / envelope.length;
  let cosine = 0, sine = 0;
  for (let i = 0; i < envelope.length; i++) {
    const phase = i * .01 * 9.1 * 2 * Math.PI;
    cosine += (envelope[i] - mean) * Math.cos(phase);
    sine += (envelope[i] - mean) * Math.sin(phase);
  }
  const regularChop = 2 * Math.hypot(cosine, sine) / envelope.length / mean;
  assert.ok(regularChop < .35, '9.1 Hz artificial chopping must be subdued: ' + regularChop);
});
