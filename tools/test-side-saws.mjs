import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {Duel} from '../src/game.js';
import {createFeatureFlags} from '../src/feature-flags.js';
import {createProfile, normalizeProfile} from '../src/progression.js';
import {ARMOR_KITS, validArmorKit, armorKitBonus, armorKitMass, getEquippedArmorKit,
  equipArmorKit, purchaseArmorKit} from '../src/armor-kits.js';
import {createArmoryScreen} from '../src/screen-armory.js';
import {startWarlordEvent} from '../src/arena/warlord-event.js';
import {armorDamageFor} from '../src/combat-armor.js';
import {COMBAT_TUNING} from '../src/wasteland-tuning.js';
import {COURSE, DRIVE} from '../src/config.js';

let checks = 0;
const equal = (actual, expected, message) => { checks++; assert.deepEqual(actual, expected, message); };
const ok = (value, message) => { checks++; assert.ok(value, message); };
const near = (actual, expected, message) => { checks++; assert.ok(Math.abs(actual - expected) < 1e-7,
  message + ' (actual ' + actual + ', expected ' + expected + ')'); };
test.after(() => console.log('Side Saws: ' + checks + ' acceptance checks executed.'));
const flags = (enabled = true) => createFeatureFlags({storage: null, qa: true,
  search: enabled ? '?flags=warlords' : ''});
function ownedProfile() {
  const p = createProfile();
  return normalizeProfile({...p, credits: 765, wasteland: {...p.wasteland, discoveredGate: true,
    scrap: 10, warlords: {...p.wasteland.warlords, sal: {defeated: true, wins: 1, losses: 0}},
    kits: {stuttgart_959s: {owned: ['scrapper'], equipped: 'scrapper'}}}});
}

test('earned Side Saws equip free at rank one on every currently owned car', () => {
  const before = ownedProfile();
  for (const car of before.unlockedCars) {
    const result = equipArmorKit(before, car, 'side-saws');
    equal(result.ok, true, car + ': settled Sal defeat owns this reward');
    equal(result.cost, 0, car + ': reward has no purchase cost');
    equal([result.profile.credits, result.profile.wasteland.scrap], [765, 10], car + ': neither currency is spent');
    equal(getEquippedArmorKit(result.profile, car), 'side-saws', car + ': public equipped lookup recognizes the earned kit');
  }
  equal(getEquippedArmorKit(before, 'stuttgart_959s'), 'scrapper', 'load does not autoequip an unknown historical winning car');
});
test('entitlement follows cars bought later without a purchase or another reward payment', () => {
  const before = ownedProfile(), later = normalizeProfile({...before, unlockedCars: [...before.unlockedCars, 'banshee_muscle']});
  const result = equipArmorKit(later, 'banshee_muscle', 'side-saws');
  equal(result.ok, true, 'a newly acquired car inherits this named player earned entitlement');
  equal(result.cost, 0, 'future car saws are free');
  equal(result.profile.wasteland.scrap, before.wasteland.scrap, 'future car does not replay first-win scrap');
  equal(result.profile.wasteland.warlords.sal.wins, 1, 'future car does not replay a win');
  equal(getEquippedArmorKit(result.profile, 'stuttgart_959s'), 'scrapper', 'equipping the new car preserves an existing car kit');
});
test('a legacy Sal defeat grants ownership on load with no extra scrap or automatic equip', () => {
  for (const warlords of [{sal: {defeated: true, wins: 1, losses: 0}}, {defeated: ['sal']}]) {
    const before = createProfile();
    const loaded = normalizeProfile({...before, wasteland: {...before.wasteland, scrap: 55, warlords}});
    equal(loaded.wasteland.scrap, 55, 'legacy load grants no scrap');
    equal(equipArmorKit(loaded, 'falcone_f42', 'side-saws').ok, true, 'legacy defeat owns usable Side Saws');
    equal(getEquippedArmorKit(loaded, 'falcone_f42'), null, 'legacy load has no known winning car to autoequip');
    const repeat = normalizeProfile(loaded);
    equal(repeat.wasteland.scrap, 55, 'repeated legacy load still grants no scrap');
  }
});
test('an undefeated named player cannot equip or buy Side Saws', () => {
  const before = createProfile();
  equal(equipArmorKit(before, 'falcone_f42', 'side-saws').ok, false, 'no defeat means no entitlement');
  equal(purchaseArmorKit(before, 'falcone_f42', 'side-saws').ok, false, 'earned reward cannot be bought');
  equal(before.wasteland.kits, {}, 'failed reward access leaves ownership empty');
});
test('Side Saws are a valid kit with zero added armor or mass; paid plating stays unchanged', () => {
  equal(validArmorKit('side-saws'), 'side-saws', 'public kit lookup includes the earned item');
  equal(armorKitBonus('side-saws'), 0, 'saws add no armor');
  equal(armorKitMass('side-saws'), 0, 'saws add no mass');
  equal(Object.values(ARMOR_KITS).map(k => k.price), [350, 950, 2500], 'paid plating catalog remains unchanged');
  const stock = new Duel({featureFlags: flags()}), saws = new Duel({featureFlags: flags()});
  stock.startArenaEvent({car: 'falcone_f42', opponents: [{car: 'banshee_muscle'}]});
  saws.startArenaEvent({car: 'falcone_f42', combatArmorKit: 'side-saws', opponents: [{car: 'banshee_muscle'}]});
  equal(saws.state.combatArmorKit, 'side-saws', 'actual event start retains the earned equipped kit');
  equal(saws.state.maxArmor, stock.state.maxArmor, 'event start adds no armor');
  equal(saws._vehicleSpec(saws.state).mass, stock._vehicleSpec(stock.state).mass, 'actual collision mass stays stock');
});
test('the armory offers only an owned earned kit and uses equip without a price', () => {
  const htmlFor = saved => createArmoryScreen({profile: () => saved, credits: String, escapeHTML: String,
    getGarageMessage: () => '', getArmoryCar: () => 'falcone_f42', kitsEnabled: () => true,
    warlordsEnabled: () => true, action: (label) => label}).yardContent();
  const owned = htmlFor(ownedProfile());
  ok(/data-kit-tier="side-saws"/.test(owned), 'owned Side Saws appear as a working armory item');
  ok(/data-kit-action="equip"[^>]*data-kit-tier="side-saws"/.test(owned), 'owned reward uses the kit equip action');
  ok(!/data-kit-action="buy"[^>]*data-kit-tier="side-saws"/.test(owned), 'earned kit has no buy action');
  ok(!/data-kit-tier="side-saws"/.test(htmlFor(createProfile())), 'undefeated player is not offered an unowned reward');
});

function fixture({warlord = true, enabled = true} = {}) {
  const duel = new Duel({seed: 1989, featureFlags: flags(enabled)});
  if (warlord) assert.equal(startWarlordEvent(duel, {warlordId: 'sal', car: 'falcone_f42'}), true);
  else assert.equal(duel.startArenaEvent({car: 'falcone_f42', opponents: [{car: 'banshee_muscle'}]}), true);
  duel.state.status = 'racing'; duel.state.arena.phase = 'fight';
  const layout = duel.course.def.scrapdome;
  const point = (s, lateral = 0) => ({x: lateral, y: 0, z: s, heading: 0, curvature: 0});
  duel.course = {def: {theme: 'desert', scrapdome: layout}, length: 10000, closed: false,
    at: point, worldAt: point, groundAt: point, nearest: (x, z) => ({s: z, lateral: x, distance: Math.abs(x)}),
    features: {obstacles: [], ramps: [], flocks: [], shortcuts: [], radarTraps: []},
    roadHalfWidthAt: () => 1000, surfaceAt: () => ({road: true, mainRoad: true, roadHalfWidth: 1000}),
    obstaclesNear: () => [], phase: s => s, themeAt: () => 'desert'};
  const actor = duel.state.opponents[0];
  for (const a of [duel.state, actor]) Object.assign(a, {s: 100, prevS: 100, lateral: 0, prevLateral: 0,
    speedMph: 0, headingError: 0, slipAngle: 0, pushVelocity: 0, yawVelocity: 0, dir: 1,
    combatBumperSpikes: false, combatArmorKit: null, combatWrecking: false, maxArmor: 1000, armor: 1000,
    knock: null, tumble: null, airborne: false, airHeight: 0, prevAirHeight: 0, groundHeight: null,
    damageCooldown: 0, contactCooldown: 0, combatShield: 0});
  for (const p of duel.state.arena.participants) p.protectedSec = 0;
  duel.state.invulnerableSec = 0; duel.state.combat.shield = 0; duel.state.combat.rivalShield = 0;
  return {duel, player: duel.state, actor};
}
function contact({kit = false, stage = null, victimFace = 'side', attackerFace = 'side', side = 1,
  protectedBy = null, speed = 35, warlord = true, enabled = true} = {}) {
  const f = fixture({warlord, enabled}), hits = [];
  if (kit) f.player.combatArmorKit = 'side-saws';
  if (stage) { f.actor.warlordId = 'sal'; f.actor.salSaw = {stage, phase: stage === 'window' ? 'sparking' : 'sweeping', sinceSec: 0}; }
  if (victimFace === 'rear' || victimFace === 'front') {
    Object.assign(f.player, {prevS: 100, s: 107, speedMph: speed});
    Object.assign(f.actor, {prevS: 110, s: 110, headingError: victimFace === 'front' ? Math.PI : 0});
  } else {
    Object.assign(f.player, {prevLateral: -side * 6, lateral: -side, pushVelocity: side * speed * DRIVE.mphToWorld});
    if (attackerFace === 'front') Object.assign(f.player, {headingError: side * Math.PI / 2, pushVelocity: 0, speedMph: speed});
    else if (attackerFace === 'rear') Object.assign(f.player, {headingError: -side * Math.PI / 2, pushVelocity: 0, speedMph: -speed});
  }
  if (protectedBy === 'shield') f.duel.state.combat.rivalShield = 3;
  if (protectedBy === 'respawn') f.duel.state.arena.participants[1].protectedSec = 2;
  if (protectedBy === 'attacker-respawn') f.duel.state.arena.participants[0].protectedSec = 2;
  if (protectedBy === 'invulnerability') f.player.invulnerableSec = 3;
  f.duel.onChange((_state, event) => { if (event.combatRamHit) hits.push(event); });
  const before = [f.player.armor, f.actor.armor];
  ok(f.duel._vehicleContact(f.player, f.actor, 'rival'), 'fixture reaches production swept contact');
  return {...f, hits, removed: before[1] - f.actor.armor, playerRemoved: before[0] - f.player.armor};
}

for (const side of [-1, 1]) test('equipped Side Saws multiply actual ' + (side < 0 ? 'left' : 'right') + ' contact by 1.6 with sparks', () => {
  const plain = contact({side}), saw = contact({side, kit: true});
  ok(plain.removed > 0, 'control is an actual damaging side impact');
  near(saw.removed, plain.removed * 1.6, 'equipped attacker side deals exactly 1.6 damage');
  near(saw.playerRemoved, plain.playerRemoved, 'attacker does not receive more damage from its own reward');
  ok(saw.hits.some(hit => hit.sideSaws === true && hit.armorRemoved > 0), 'positive equipped saw contact emits sparks');
});
for (const face of ['front', 'rear']) test('Side Saws do not multiply the attacker ' + face + ' when the victim side is hit', () => {
  const plain = contact({attackerFace: face}), saw = contact({attackerFace: face, kit: true});
  ok(plain.removed > 0, 'control damages victim through the chosen attacker face');
  near(saw.removed, plain.removed, 'attacker face, not victim side, controls equipped saw damage');
  equal(saw.hits.some(hit => hit.sideSaws === true), false, 'front/rear contacts emit no equipped saw sparks');
});
test('Side Saws multiply raw damage before the existing cap instead of multiplying a capped hit', () => {
  const saw = contact({kit: true, speed: 240});
  near(saw.removed, COMBAT_TUNING.armor.maximumHitDamage, 'high-speed saw hit retains maximum damage cap');
});
test('front bumper spikes stay effective and cannot combine with front Side Saws', () => {
  const f = fixture(); f.player.combatArmorKit = 'side-saws'; f.player.combatBumperSpikes = true;
  Object.assign(f.player, {prevS: 100, s: 107, speedMph: 35});
  Object.assign(f.actor, {prevS: 110, s: 110});
  f.duel._vehicleContact(f.player, f.actor, 'rival');
  near(1000 - f.actor.armor, armorDamageFor('ram', {relativeKph: 35 * 1.609344, spiked: true}),
    'front spikes keep their existing 1.5 multiplier without side-saw stacking');
});

test('a Sal sweep doubles real damage to the player side and records a hit', () => {
  function sweep(stage) {
    const f = fixture(); f.actor.salSaw = {stage, phase: 'sweeping', sinceSec: 0};
    Object.assign(f.player, {prevLateral: -4, lateral: -1, pushVelocity: 10});
    Object.assign(f.actor, {prevLateral: 6, lateral: 1, pushVelocity: -10});
    f.duel._vehicleContact(f.player, f.actor, 'rival');
    return {...f, removed: 1000 - f.player.armor};
  }
  const plain = sweep('idle'), saw = sweep('sweep');
  ok(plain.removed > 0, 'control really damages player side rather than invoking NPC yield');
  near(saw.removed, plain.removed * 2, 'signature sweep doubles side damage');
  equal(saw.actor.salSaw.hit, true, 'positive side damage records the contact handshake');
  equal(saw.duel.state.callout, 'SAW SWEEP!', 'positive sweep hit immediately shows its callout');
});
test('a sweep hitting the player front cannot claim doubled side damage or a sweep hit', () => {
  function front(stage) {
    const f = fixture(); f.actor.salSaw = {stage, phase: 'sweeping', sinceSec: 0};
    Object.assign(f.player, {prevS: 100, s: 107, speedMph: 35});
    Object.assign(f.actor, {prevS: 110, s: 110, speedMph: 0});
    f.duel._vehicleContact(f.player, f.actor, 'rival'); return {...f, removed: 1000 - f.player.armor};
  }
  const plain = front('idle'), sweep = front('sweep');
  ok(plain.removed > 0, 'control hits the target front');
  near(sweep.removed, plain.removed, 'signature applies only to the target side');
  equal(sweep.actor.salSaw.hit === true, false, 'front damage cannot end the sweep as a successful side hit');
});
for (const victimFace of ['rear', 'front', 'side']) test('Sal window scales only her rear: ' + victimFace, () => {
  const plain = contact({victimFace}), window = contact({victimFace, stage: 'window'});
  ok(plain.removed > 0, 'control is a damaging contact');
  near(window.removed, plain.removed * (victimFace === 'rear' ? 1.5 : 1), 'window respects Sal rear face');
});
for (const protectedBy of ['shield', 'respawn', 'attacker-respawn']) test('Side Saws preserve ' + protectedBy + ' protection and emit no damage sparks', () => {
  const result = contact({kit: true, protectedBy});
  equal(result.removed, 0, 'protected armor remains intact');
  equal(result.hits.some(hit => hit.sideSaws === true), false, 'blocked damage emits no saw sparks');
});
test('player invulnerability prevents signature damage', () => {
  const f = fixture(); f.player.invulnerableSec = 3;
  f.actor.salSaw = {stage: 'sweep', phase: 'sweeping', sinceSec: 0};
  Object.assign(f.player, {prevLateral: -4, lateral: -1, pushVelocity: 10});
  Object.assign(f.actor, {prevLateral: 6, lateral: 1, pushVelocity: -10});
  f.duel._vehicleContact(f.player, f.actor, 'rival');
  equal(f.player.armor, 1000, 'invulnerability remains authoritative over sweep damage');
  equal(f.actor.salSaw.hit === true, false, 'a blocked sweep cannot record a positive hit');
});
test('continuous overlap cannot farm saw damage; clearing the pair allows a new hit', () => {
  const f = contact({kit: true}), first = f.actor.armor;
  for (let repeat = 0; repeat < 20; repeat++) {
    Object.assign(f.player, {prevLateral: -6, lateral: -1, pushVelocity: 35 * DRIVE.mphToWorld});
    Object.assign(f.actor, {prevLateral: 0, lateral: 0, pushVelocity: 0, speedMph: 0, knock: null, tumble: null});
    f.duel._vehicleContact(f.player, f.actor, 'rival');
  }
  equal(f.actor.armor, first, 'one latched contact produces one saw hit');
  Object.assign(f.player, {prevLateral: -20, lateral: -20});
  f.duel._vehicleContact(f.player, f.actor, 'rival');
  Object.assign(f.player, {prevLateral: -6, lateral: -1, pushVelocity: 35 * DRIVE.mphToWorld});
  f.duel._vehicleContact(f.player, f.actor, 'rival');
  ok(f.actor.armor < first, 'a cleared pair can receive the next real saw impact');
});
test('Sal state fields outside an enabled warlord event cannot grant rear vulnerability', () => {
  for (const enabled of [true, false]) {
    const plain = contact({victimFace: 'rear', warlord: false, enabled});
    const fake = contact({victimFace: 'rear', stage: 'window', warlord: false, enabled});
    near(fake.removed, plain.removed, 'ordinary arena ignores stray signature state');
  }
});
test('allied cars cannot receive earned saw damage or score a friendly hit', () => {
  const f = fixture(); f.player.combatArmorKit = 'side-saws';
  f.duel.state.arena.participants[1].team = 'player';
  Object.assign(f.player, {prevLateral: -6, lateral: -1, pushVelocity: 35 * DRIVE.mphToWorld});
  f.duel._vehicleContact(f.player, f.actor, 'rival');
  equal(f.actor.armor, 1000, 'saw damage preserves combat team protection');
  equal(f.duel.state.arena.participants[0].damageDealt, 0, 'friendly contact earns no damage credit');
});
test('ordinary races reuse the three existing reviewed fingerprint controls unchanged', () => {
  const fixture = JSON.parse(readFileSync(new URL('./replays/warlord-format-ordinary.json', import.meta.url), 'utf8'));
  for (const spec of fixture.cases) {
    const duel = new Duel({seed: spec.seed, featureFlags: flags()});
    duel.startCampaign({seed: spec.seed, mode: spec.mode, car: 'falcone_f42',
      startStage: COURSE.findIndex(c => c.id === spec.course), difficulty: 'casual', cpuDifficulty: 'medium'});
    const samples = [];
    for (let tick = 0; tick < 1200; tick++) {
      duel.setInput({throttle: 1, brake: tick >= 800 ? .2 : 0, steer: tick < 500 ? .08 : -.04, boost: false});
      duel.step(1 / 120);
      if (tick % 120 === 119) samples.push({status: duel.state.status, s: duel.state.s, lateral: duel.state.lateral,
        speedMph: duel.state.speedMph, time: duel.state.stageTimeSec, laps: duel.state.completedLaps,
        score: duel.state.score, rivals: duel.state.opponents.map(a => [a.s, a.lateral, a.speedMph]), result: duel.state.results});
    }
    equal(createHash('sha256').update(JSON.stringify(samples)).digest('hex'), spec.fingerprint,
      spec.mode + '/' + spec.course + ': ordinary rules unchanged');
  }
});
