import assert from 'node:assert/strict';
import {test} from 'node:test';
import {Duel} from '../src/game.js';
import {createFeatureFlags, FEATURE_STATES} from '../src/feature-flags.js';
import {startWarlordEvent, beginWarlordEvent} from '../src/arena/warlord-event.js';
import {CONVOY_VALVE_CENTRES, convoyValvePoints, convoyPoint,
  CONVOY_ROOF_PLATE, damageConvoyValves} from '../src/arena/convoy.js';
import {isConvoyRig, CONVOY_BODY} from '../src/arena/modes/convoy-raid.js';
import {hazardsFor, stepHazards} from '../src/arsenal/hazards.js';
import {createFighter} from '../src/onfoot.js';
import {stepFootTransition} from '../src/onfoot-transition.js';
import {TOLLKEEPER_RULES} from '../src/warlords/tollkeeper.js';
import {deployCaltrops} from '../src/arsenal/caltrops.js';
import {warlordIntroScreen, arenaHud} from '../src/screen-arena.js';
import {placeActor} from '../src/arena/arena-event.js';
import {territoryPanel} from '../src/screen-territory.js';
import {createProfile} from '../src/progression.js';
import {SOUND_BANK} from '../src/sound-bank.js';
import {EngineAudio} from '../src/audio.js';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {decodeAudioBytes} from './audio/codec.mjs';
import {createTankerModel} from '../src/arena/tanker-model.js';
import {Group, Mesh, BoxGeometry, MeshStandardMaterial} from 'three';
import {applyArmorDamage} from '../src/combat-armor.js';
import {ownsArmorKit, armorKitBonus, armorKitMass, equipArmorKit, purchaseArmorKit} from '../src/armor-kits.js';
import {createArmoryScreen} from '../src/screen-armory.js';
import {WARLORDS} from '../src/warlords.js';

const DT = 1 / 120;
let checks = 0;
const equal = (actual, expected, message) => { checks++; assert.deepEqual(actual, expected, message); };
const ok = (actual, message) => { checks++; assert.ok(actual, message); };
test.after(() => console.log(`Tollkeeper: ${checks} acceptance checks executed.`));

function admitted({difficulty = 'medium', seed = 317, enabled = true} = {}) {
  const flags = createFeatureFlags({storage: null, qa: true,
    overrides: {tollkeeper: enabled, 'salt-flats': true, 'convoy-raid': false, 'crew-gear': true}});
  const duel = new Duel({seed, featureFlags: flags});
  const events = [];
  duel.onChange((state, event) => events.push(event));
  duel.state.wastelandGateDiscovered = true;
  const started = startWarlordEvent(duel, {warlordId: 'tollkeeper', car: 'falcone_f42',
    cpuDifficulty: difficulty, playerId: 'toll-driver'});
  return {duel, started, events};
}
function fight(options) {
  const {duel, started, events} = admitted(options);
  equal(started, true, 'the native Tollkeeper entry starts independently of the normal Convoy switch');
  equal(beginWarlordEvent(duel), true, 'the actual Warlord introduction admits its countdown');
  duel.state.countdown = 0;
  duel.step(DT); duel.step(DT);
  for (const p of duel.state.arena.participants) p.protectedSec = 0;
  duel.state.invulnerableSec = 0;
  duel.state.combat.aiTimer = Infinity;
  return {duel, rig: duel.state.opponents[0], events};
}
function advance(duel, seconds) {
  for (let n = 0; n < Math.round(seconds / DT); n++) duel.step(DT);
}
function gate(f) {
  for (let n = 0; n < 240 && f.rig.tollGate?.stage !== 'window'; n++) f.duel.step(DT);
  equal(f.rig.tollGate?.stage, 'window', 'the real arena step deploys the announced gate');
  return f.rig.tollGate;
}

test('native entry has a dev switch, real tanker and five-minute charge format', () => {
  equal(FEATURE_STATES.tollkeeper, 'dev', 'the new fight remains behind its own dev switch');
  equal(admitted({enabled: false}).started, false, 'disabled entry cannot build a fight');
  const f = fight(), arena = f.duel.state.arena;
  equal(arena.mode, 'warlord', 'the event uses Warlord settlement, not ordinary Convoy settlement');
  equal(arena.format, 'convoy-raid', 'metadata selects the existing charge format');
  equal(arena.venueId, 'salt-flats', 'the real rig fights on the Salt Flats loop');
  equal(arena.timeLimitSec, 300, 'the fight retains the five-minute Convoy deadline');
  equal(arena.participants.length, 4, 'the player faces the tanker and two real escorts');
  equal(isConvoyRig(f.duel, f.rig), true, 'the native body, projectile and boarding hooks recognize the rig');
  equal(f.duel._vehicleSpec(f.rig).mass, CONVOY_BODY.mass, 'the rig retains its actual twelve-tonne body');
  equal(arena.convoy.valves, [150, 150, 150], 'all three approved valves start at normal armor');
});

test('native format admission rejects arbitrary extra opponents and mismatched metadata', () => {
  const make = enabled => {
    const duel = new Duel({featureFlags: createFeatureFlags({storage: null, qa: true,
      overrides: {tollkeeper: enabled, 'salt-flats': true, 'convoy-raid': true}})});
    duel.state.wastelandGateDiscovered = true;
    return duel;
  };
  const opponents = WARLORDS.tollkeeper.team.map(({car, brain}) => ({car, brain}));
  const entry = {venueId: 'salt-flats', mode: 'warlord', opponents};
  equal(make(true).startArenaEvent(entry), false, 'ordinary Warlord entry retains its two-opponent limit');
  equal(make(false).startArenaEvent({...entry, warlordId: 'tollkeeper'}), false,
    'a direct native format request cannot bypass the disabled fight');
  equal(make(true).startArenaEvent({...entry, warlordId: 'blackiron'}), false,
    'unbuilt metadata cannot raise the native limit');
  equal(make(true).startArenaEvent({...entry, warlordId: 'tollkeeper', venueId: 'pit'}), false,
    'format admission requires the exact registered venue');
  equal(make(true).startArenaEvent({...entry, warlordId: 'tollkeeper',
    opponents: opponents.map((actor, index) => index ? actor : {...actor, brain: 'rammer'})}), false,
    'format admission requires the exact registered team');
  equal(make(true).startArenaEvent({...entry, mode: 'convoy-raid'}), true,
    'ordinary Convoy retains its standard three-opponent entry');
});

test('the real introduction and HUD show charge rules instead of three-wreck rules', () => {
  const {duel, started} = admitted();
  equal(started, true, 'the intro fixture uses real native admission');
  const intro = warlordIntroScreen(duel.state, {escapeHTML: text => text,
    metric: (label, value) => `${label}:${value};`, action: () => ''});
  ok(intro.metrics.includes('BOARDING CHARGE'), 'the Warlord introduction names its real victory condition');
  ok(intro.metrics.includes('5:00'), 'the Warlord introduction names its real deadline');
  ok(!intro.metrics.includes('THREE WRECKS'), 'the charge fight never advertises an ordinary three-wreck win');
  const f = fight(), hud = arenaHud(f.duel.state);
  equal(hud.convoy, true, 'the existing valve and boarding HUD reads charge-format state');
  ok(hud.scoreText.includes('VALVES'), 'the native HUD shows real valves before boarding');
});

test('the territory fight button follows the injected dev switch', () => {
  const profile = createProfile();
  profile.wasteland.discoveredGate = true;
  profile.wasteland.territories.tollkeeper.hold = 100;
  const flags = enabled => createFeatureFlags({storage: null, qa: true, overrides: {tollkeeper: enabled}});
  ok(!territoryPanel(profile, {featureFlags: flags(false)}).includes('data-warlord="tollkeeper"'),
    'the territory panel does not expose a disabled dev fight');
  ok(territoryPanel(profile, {featureFlags: flags(true)}).includes('data-warlord="tollkeeper"'),
    'the territory panel exposes the explicitly enabled full-hold fight');
});

test('the built charge-fight territory uses the current venue label while unbuilt fights remain marked', () => {
  const profile = createProfile();
  profile.wasteland.discoveredGate = true;
  profile.wasteland.territories.tollkeeper.hold = 100;
  profile.wasteland.territories.blackiron.hold = 100;
  const panel = territoryPanel(profile, {featureFlags: createFeatureFlags({storage: null, qa: true,
    overrides: {tollkeeper: true}})});
  ok(panel.includes('Salt Flats Convoy Raid'), 'the native territory panel retains its named venue');
  ok(!panel.includes('Salt Flats Convoy Raid (coming later)'), 'the built native venue has no stale coming-later suffix');
  const unbuilt = panel.match(/<article class="territory-card"><h4>[^<]*Black[^<]*<\/h4>[\s\S]*?<\/article>/i)?.[0];
  ok(unbuilt?.includes('WARLORD FIGHT COMING LATER'), 'the separate unbuilt fight status remains coming later');
});

test('each difficulty announces a seeded twelve-metre gate with a four-metre gap', () => {
  for (const [difficulty, cooldown] of Object.entries({easy: 14, medium: 11, hard: 9})) {
    const f = fight({difficulty});
    const move = gate(f), strips = hazardsFor(f.duel).filter(item => item.kind === 'caltrops');
    equal(strips.length, 2, 'two existing caltrops strips leave one real gap');
    ok(move.gapCentre >= 3 && move.gapCentre <= 9, 'the gap centre stays in the settled seeded range');
    equal(strips.reduce((sum, item) => sum + item.width, 0), 8, 'twelve metres minus the four-metre gap is hazardous');
    equal(move.nextGateSec - move.sinceSec, cooldown, 'gate cooldown starts at its tell and uses the settled difficulty');
    equal(f.duel.state.arena.markers.filter(marker => marker.kind === 'light').length, 2,
      'two native marker positions identify the gap edges');
    ok(f.events.some(event => event.arenaTell?.cue === 'arena.toll-gate'),
      'the real tell names its klaxon cue');
  }
});

test('the gate gap is repeatable from seed and inputs', () => {
  const a = fight({seed: 19}), b = fight({seed: 19});
  gate(a); gate(b);
  equal(a.rig.tollGate.gapCentre, b.rig.tollGate.gapCentre, 'equal seeds produce equal gap centres');
  equal(hazardsFor(a.duel).map(({x, z, width, heading}) => ({x, z, width, heading})),
    hazardsFor(b.duel).map(({x, z, width, heading}) => ({x, z, width, heading})),
    'equal inputs produce identical native strip placement');
});

test('optional gate placement preserves the ordinary released caltrops strip', () => {
  const f = fight();
  const ordinary = deployCaltrops(f.duel, f.duel.state);
  equal([ordinary.width, ordinary.length, ordinary.lifetime, ordinary.ownerGraceSec], [5, 8, 8, 1],
    'the ordinary released five-by-eight strip keeps its lifetime and owner grace');
  const located = deployCaltrops(f.duel, f.duel.state, 0,
    {x: ordinary.x + 20, z: ordinary.z, heading: ordinary.heading, width: 3});
  equal([located.x, located.z, located.heading, located.width],
    [ordinary.x + 20, ordinary.z, ordinary.heading, 3], 'only explicit placement and width change');
  equal([located.length, located.lifetime, located.ownerGraceSec], [8, 8, 1],
    'the placed strip keeps the ordinary length, lifetime and owner grace');
});

test('the ordinary native caltrops producer still honors its off and released states', () => {
  for (const enabled of [false, true]) {
    const duel = new Duel({seed: 19, featureFlags: createFeatureFlags({storage: null, qa: true,
      overrides: {arsenal: enabled}})});
    duel.state.wastelandGateDiscovered = true;
    equal(duel.startArenaEvent({car: 'falcone_f42', arsenalRank: 6,
      weaponLoadout: ['harpoon', 'caltrops', 'oil', 'smoke'], opponents: [{car: 'dusthawk_rally'}]}),
    true, 'the ordinary native arena control starts');
    duel.state.countdown = 0; duel.step(DT); duel.step(DT);
    equal(duel.fireWeapon('caltrops'), enabled, 'the real ordinary producer preserves its feature admission');
    const strips = hazardsFor(duel);
    equal(strips.length, enabled ? 1 : 0, 'an off producer creates no strip and a released producer creates one');
    if (enabled) equal([strips[0].width, strips[0].length], [5, 8],
      'the actual released weapon still deploys exactly its original strip');
  }
});

test('the actual car clears the lit gap and receives released caltrops damage outside it', () => {
  const f = fight(); gate(f);
  const lights = f.duel.state.arena.markers.filter(marker => marker.kind === 'light');
  const strips = hazardsFor(f.duel), heading = strips[0].heading;
  const centre = {x: (lights[0].x + lights[1].x) / 2, z: (lights[0].z + lights[1].z) / 2};
  const park = point => {
    const near = f.duel.course.nearest(point.x, point.z, f.rig.s);
    placeActor(f.duel, f.duel.state, {...near, headingError: heading - f.duel.course.at(near.s).heading});
  };
  park(centre);
  const before = f.duel.state.armor;
  stepHazards(f.duel, DT);
  equal(f.duel.state.armor, before, 'the real player body fits inside the four-metre gap without damage');
  park(strips[0]);
  stepHazards(f.duel, DT);
  equal(f.duel.state.armor, before - 4, 'a real strip contact deals the released four armor loss');
  ok(f.events.some(event => event.combatHit && event.enemy === true),
    'the actual gate contact retains enemy damage attribution');
});

test('the real five-minute deadline loses without a boarding charge', () => {
  const f = fight();
  f.duel.state.arena.clockSec = 300 - DT / 2;
  f.duel.step(DT);
  equal(f.duel.state.status, 'arena_result', 'the actual charge-format clock finishes the event');
  equal(f.duel.state.arena.result.reason, 'time', 'the uncharged deadline is a real timeout');
  equal(f.duel.state.arena.result.winnerId, f.rig.arenaId, 'the tanker wins an uncharged timeout');
});

test('the native tell reaches its named recorded klaxon without changing race state', () => {
  const f = fight(); gate(f);
  const event = f.events.find(event => event.arenaTell?.cue === 'arena.toll-gate');
  ok(event, 'the real native rig produces the named klaxon event');
  equal(SOUND_BANK['arena.toll-gate'].files, ['tollkeeper/gate-klaxon.ogg'],
    'the named cue uses its single derived runtime clip');
  const bytes = readFileSync(new URL('../public/assets/audio/tollkeeper/gate-klaxon.ogg', import.meta.url));
  const wave = decodeAudioBytes(bytes);
  equal(wave.readUInt16LE(22), 1, 'the genuine runtime klaxon decodes to mono');
  equal(wave.readUInt32LE(24), 48000, 'the genuine runtime klaxon is 48 kHz');
  ok(wave.length > 44 && wave.subarray(44).some(value => value !== 0), 'the genuine runtime klaxon is not silent');
  const catalog = JSON.parse(readFileSync(new URL('./audio/catalog.json', import.meta.url)));
  const rows = catalog.sounds.filter(row => row.cue === 'arena.toll-gate');
  equal(rows.length, 1, 'the new cue has exactly one source record');
  equal(rows[0].runtime.sha256, createHash('sha256').update(bytes).digest('hex'),
    'the catalog pins the actual derived clip');
  const played = [], audio = new EngineAudio({flags: {enabled: () => false}});
  audio.context = {state: 'running', currentTime: 1}; audio.muted = false; audio.paused = false;
  audio._syncMixer = () => {};
  audio._spatialOutput = () => ({level: {}, space: {distance: 20, pan: 0, gain: 1}, disconnect() {}});
  audio._playCue = id => { played.push(id); return {}; };
  const before = JSON.stringify(f.duel.state.arena);
  audio.event(event, f.duel.state, f.duel.course);
  equal(played, ['arena.toll-gate'], 'the actual audio consumer selects the klaxon instead of the charge engine roar');
  equal(JSON.stringify(f.duel.state.arena), before, 'the audio consumer leaves native race state unchanged');
});

test('existing tanker lamps flash from read-only signals and retain ordinary boarding light behavior', async () => {
  const scene = new Group(), material = new MeshStandardMaterial();
  for (let n = 0; n < 2; n++) {
    const lamp = new Mesh(new BoxGeometry(.2, .2, .2), material);
    lamp.name = 'tanker-warning-lamp-' + n; scene.add(lamp);
  }
  const model = createTankerModel({loadAsset: async () => ({scene})});
  equal(await model.ready, true, 'the existing tanker presentation loads its native named lamps');
  model.setValveHealth([150, 150, 150]);
  equal(material.emissiveIntensity, 0, 'ordinary intact valves leave the approved lamps off');
  const signal = Object.freeze({untilSec: 3, kind: 'core'});
  model.setLampSignal(signal, 0);
  equal(material.emissiveIntensity, 1.2, 'the settled core window lights existing materials');
  model.setLampSignal(signal, .125);
  equal(material.emissiveIntensity, 0, 'the settled signal flashes instead of staying solid');
  model.setLampSignal(signal, 3);
  equal(material.emissiveIntensity, 0, 'the three-second window ends without changing valve state');
  model.setValveHealth([0, 0, 0]); model.setLampSignal(null, 4);
  equal(material.emissiveIntensity, 1.2, 'ordinary all-broken boarding lamps retain their original intensity');
  equal(signal, {untilSec: 3, kind: 'core'}, 'presentation never changes the supplied native timer');
  model.dispose();
});

test('only the most-rear actual valve doubles damage during the three-second window', () => {
  const f = fight(); gate(f);
  const rear = CONVOY_VALVE_CENTRES.reduce((best, at, index, list) => at[2] < list[best][2] ? index : best, 0);
  equal(TOLLKEEPER_RULES.coreValve, rear, 'the core comes from the approved actual handwheel positions');
  let points = convoyValvePoints(f.duel, f.rig);
  for (let index = 0; index < points.length; index++)
    damageConvoyValves(f.duel, f.rig, 10, 'fixed', {owner: 'player', hitPosition: points[index]});
  equal(f.duel.state.arena.convoy.valves, [130, 140, 140], 'only the real rear core doubles a selected direct hit');
  const before = [...f.duel.state.arena.convoy.valves];
  points = convoyValvePoints(f.duel, f.rig);
  damageConvoyValves(f.duel, f.rig, 10, 'bomb', {owner: 'player', hitPosition: points[rear], blastRadius: 20});
  equal(f.duel.state.arena.convoy.valves, before.map((hp, index) => hp - (index === rear ? 20 : 10)),
    'a blast doubles the core independently rather than every valve in its radius');
  equal(f.rig.tollGate.untilSec - f.rig.tollGate.deployedSec, 3, 'the lamp and damage window lasts exactly three seconds');
  advance(f.duel, 3.1);
  const after = [...f.duel.state.arena.convoy.valves];
  damageConvoyValves(f.duel, f.rig, 10, 'fixed', {owner: 'player', hitPosition: convoyValvePoints(f.duel, f.rig)[rear]});
  equal(f.duel.state.arena.convoy.valves[rear], after[rear] - 10, 'the rear valve resumes normal damage after the window');
});

test('the first broken valve, not escort wrecks, starts phase two once', () => {
  const f = fight();
  f.rig.tollGate.nextGateSec = Infinity;
  equal(f.duel.state.arena.warlordPhase, 1, 'the actual fight starts in phase one');
  const at = convoyValvePoints(f.duel, f.rig)[2];
  damageConvoyValves(f.duel, f.rig, 150, 'fixed', {owner: 'player', hitPosition: at});
  f.duel.step(DT);
  equal(f.duel.state.arena.warlordPhase, 2, 'the first real broken valve triggers phase two');
});

test('the first valve resets both real escorts once, then ordinary wreck returns continue', () => {
  const f = fight(), [one, two] = f.duel.state.opponents.slice(1);
  f.rig.tollGate.nextGateSec = Infinity;
  one.armor = 1; two.armor = two.maxArmor - 12;
  applyArmorDamage(f.duel, one, 'fixed', {owner: 'player', amount: 10});
  f.duel.step(DT);
  equal(one.combatWrecking, true, 'one real escort is waiting for its ordinary return');
  equal(f.duel.state.arena.participants[0].wrecks, 0, 'an actual escort wreck never scores');
  equal(f.duel.state.combat.scoring.wrecksCaused, 0, 'a real escort wreck grants no combat wreck score');
  equal(f.duel.state.arena.warlordPhase, 1, 'an escort wreck cannot trigger phase two');
  damageConvoyValves(f.duel, f.rig, 150, 'fixed', {owner: 'player',
    hitPosition: convoyValvePoints(f.duel, f.rig)[2]});
  f.duel.step(DT);
  equal([one.armor, two.armor], [one.maxArmor, two.maxArmor], 'the first real broken valve resets both escorts at full armor');
  equal([one.combatWrecking, two.combatWrecking], [false, false], 'waiting and damaged escorts both return once');
  for (const p of f.duel.state.arena.participants) p.protectedSec = 0;
  two.armor -= 15;
  damageConvoyValves(f.duel, f.rig, 150, 'fixed', {owner: 'player',
    hitPosition: convoyValvePoints(f.duel, f.rig)[1]});
  f.duel.step(DT);
  equal(two.armor, two.maxArmor - 15, 'a later broken valve never grants another phase reset');
  one.armor = 1;
  applyArmorDamage(f.duel, one, 'fixed', {owner: 'player', amount: 10});
  f.duel.step(DT);
  equal(one.combatWrecking, true, 'a phase-two escort wreck enters the ordinary return path');
  advance(f.duel, 3.4);
  equal(one.combatWrecking, true, 'ordinary escort return still waits for 3.5 seconds');
  advance(f.duel, .2);
  equal(one.combatWrecking, false, 'ordinary escort return continues after the one-time reset');
  equal(one.armor, one.maxArmor, 'ordinary escort return restores its normal armor');
});

test('ordinary Convoy escort wreck scoring stays unchanged', () => {
  const duel = new Duel({seed: 31, featureFlags: createFeatureFlags({storage: null, qa: true,
    overrides: {'convoy-raid': true, 'salt-flats': true}})});
  duel.state.wastelandGateDiscovered = true;
  equal(duel.startArenaEvent({mode: 'convoy-raid', venueId: 'salt-flats', car: 'falcone_f42',
    opponents: [{car: 'stuttgart_959s'}, {car: 'dusthawk_rally'}, {car: 'aurora_gt'}]}), true,
    'the actual ordinary Convoy control starts');
  duel.state.countdown = 0; duel.step(DT); duel.step(DT);
  for (const p of duel.state.arena.participants) p.protectedSec = 0;
  const escort = duel.state.opponents[1]; escort.armor = 1;
  applyArmorDamage(duel, escort, 'fixed', {owner: 'player', amount: 10}); duel.step(DT);
  equal(duel.state.arena.participants[0].wrecks, 1, 'the ordinary arena wreck score remains unchanged');
  equal(duel.state.combat.scoring.wrecksCaused, 1, 'the ordinary combat wreck score remains unchanged');
});

test('the saved defeat earns existing plating on any unlocked car without save mutation', () => {
  const profile = createProfile();
  profile.unlockedCars = ['falcone_f42', 'dusthawk_rally'];
  profile.wasteland.warlords.tollkeeper = {defeated: true, unknown: {kept: 9}};
  const before = structuredClone(profile);
  equal(ownsArmorKit(profile, 'falcone_f42', 'warlord'), true, 'the saved win earns plating on the first car');
  equal(ownsArmorKit(profile, 'dusthawk_rally', 'warlord'), true, 'the saved win earns the same look on another unlocked car');
  equal([armorKitBonus('warlord'), armorKitMass('warlord')], [30, 270], 'the reward keeps the existing armor and mass numbers');
  equal(profile, before, 'entitlement lookup never grants by changing the save');
  const screen = createArmoryScreen({profile: () => profile, credits: String, escapeHTML: String,
    getGarageMessage: () => '', getArmoryCar: () => 'dusthawk_rally', kitsEnabled: () => true,
    action: () => ''});
  ok(screen().includes('data-kit-action="equip" data-kit-tier="warlord"'),
    'the real Armory offers the saved any-car reward as EQUIP, not another purchase');
  const purchase = purchaseArmorKit(profile, 'dusthawk_rally', 'warlord');
  equal(purchase.ok, false, 'a direct purchase cannot charge for the already earned any-car look');
  equal(purchase.profile, profile, 'refusing an earned duplicate leaves the original profile unchanged');
  const equipped = equipArmorKit(profile, 'dusthawk_rally', 'warlord');
  equal(equipped.ok, true, 'the earned existing look can be equipped through the real Armory transaction');
  equal(equipped.profile.wasteland.kits.dusthawk_rally.equipped, 'warlord', 'the ordinary existing model id is equipped');
  equal(equipped.profile.wasteland.warlords.tollkeeper.unknown, {kept: 9}, 'the equip transaction preserves unknown saved defeat fields');
  const paid = createProfile();
  paid.unlockedCars = ['falcone_f42', 'dusthawk_rally'];
  paid.wasteland.kits.falcone_f42 = {owned: ['warlord'], equipped: 'warlord'};
  equal(ownsArmorKit(paid, 'dusthawk_rally', 'warlord'), false, 'ordinary paid plating remains per car without the earned defeat');
  const legacy = structuredClone(profile);
  legacy.wasteland.warlords = {defeated: ['tollkeeper']};
  equal(ownsArmorKit(legacy, 'dusthawk_rally', 'warlord'), true, 'the supported legacy saved defeat also earns any-car plating');
});

test('real phase-two gates use the settled twenty-percent shorter interval', () => {
  const f = fight(); gate(f);
  damageConvoyValves(f.duel, f.rig, 150, 'fixed', {owner: 'player',
    hitPosition: convoyValvePoints(f.duel, f.rig)[2]});
  f.rig.tollGate.nextGateSec = Infinity;
  advance(f.duel, 3.1);
  f.rig.tollGate.nextGateSec = f.duel.state.stageTimeSec;
  f.duel.step(DT);
  equal(f.rig.tollGate.stage, 'tell', 'the next actual native tell begins in phase two');
  ok(Math.abs(f.rig.tollGate.nextGateSec - f.rig.tollGate.sinceSec - 11 * .8) < 1e-9,
    'the native Medium phase-two cooldown is exactly twenty percent shorter');
});

test('only a real roof crossing, one-second plant and finishing fuse win the fight', () => {
  const f = fight(), state = f.duel.state;
  f.rig.tollGate.nextGateSec = Infinity;
  damageConvoyValves(f.duel, f.rig, 450, 'bomb', {owner: 'player',
    hitPosition: convoyValvePoints(f.duel, f.rig)[0], blastRadius: 20});
  f.duel.step(DT);
  equal(state.status, 'racing', 'broken valves alone never win a Warlord charge fight');
  const plate = CONVOY_ROOF_PLATE, ground = f.duel.course.groundAt(f.rig.s, f.rig.lateral);
  const at = convoyPoint(f.duel, f.rig, [plate.x, plate.y, plate.z]);
  state.onFoot = true; state.crewId = 'rook';
  state.fighter = createFighter(f.duel.course, state, {s: f.rig.s, lateral: f.rig.lateral});
  Object.assign(state.fighter, {x: at.x, z: at.z, y: at.y + .02,
    groundY: ground.y, airHeight: at.y - ground.y + .02, verticalSpeed: -3});
  state.fighterInput = {fire: false};
  stepFootTransition(f.duel, DT);
  equal(state.boarding?.phase, 'roof', 'the existing approved roof plate admits the real crossing');
  state.fighterInput.fire = true;
  for (let n = 0; n < Math.round(.9 / DT); n++) stepFootTransition(f.duel, DT);
  equal(state.arena.convoy.chargePlanted, false, 'a short fire hold cannot plant a charge');
  for (let n = 0; n < Math.round(.2 / DT); n++) stepFootTransition(f.duel, DT);
  equal(state.boarding?.phase, 'charge', 'one second on the real roof plants the actual charge');
  equal(state.status, 'racing', 'the actual planted charge still needs its fuse');
  for (let n = 0; n < Math.round(2.1 / DT); n++) stepFootTransition(f.duel, DT);
  f.duel.step(DT);
  equal(state.status, 'arena_result', 'the finishing fuse completes the native Warlord fight');
  equal(state.arena.mode, 'warlord', 'the charge cannot switch settlement to ordinary Convoy pay');
  equal(state.arena.result.reason, 'charge', 'the real native charge is the winning proof');
  equal(state.arena.result.winnerId, 'player', 'the actual charge awards the player victory');
});
