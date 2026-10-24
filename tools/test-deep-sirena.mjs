// DEEP-SIRENA (docs/THE_DEEP.md 6.2, 6.3, 6.6 and 10.1): the sonar, the lift bags,
// the order of the finds, what the save records and pays. Headless; memory-only.
import assert from 'node:assert/strict';
import test from 'node:test';
import {Duel} from '../src/game.js';
import {ROUTE_VARIANTS} from '../src/route-variants.js';
import {buildDeepRamp} from '../src/deep/deep-ramp.js';
import {defineZone} from '../src/deep/deep-zone.js';
import {kelpCoastProvider} from '../src/deep/zones/kelp-coast.js';
import {normalizeDeep} from '../src/deep/deep-discovery.js';
import {createProfile, normalizeProfile} from '../src/progression.js';
import {SIRENA, SIRENA_FINDS, SIRENA_PAY, createSirena, pingSonar, stepLift, raiseFind, recordCoastCup} from '../src/deep/deep-sirena.js';

const MPH = 1 / 1.609344;          // one km/h in mph (the car's picture is in mph)
const ON = {enabled: true};

// A straight trail heading +z, with the six finds spread along it, for exact geometry.
function straight(extra = {}) {
  const trail = Array.from({length: 40}, (_, i) => ({x: 0, z: i * 10, depth: 8, width: 14, surface: 'sea-floor', kelp: 0, grass: 0, rock: 0}));
  const at = {'sirena-badge': [2, 2], 'sirena-steering-wheel': [10, -3], 'sirena-wheel': [18, 3], 'sirena-bonnet': [24, 0],
    'sirena-door': [30, 1], 'sirena-car': [32, -1]};
  return {id: 'test-coast', trail, finds: SIRENA_FINDS.map(id => ({id, trailIndex: at[id][0], offset: at[id][1], below: id === 'sirena-car' ? 3 : 0})), ...extra};
}
const car = (x = 0, z = 0, speed = 0, heading) => ({x, z, speed, ...(heading === undefined ? {} : {heading})});
const findAt = (state, id) => state.finds.find(find => find.id === id);
const stand = (state, id) => { const f = findAt(state, id); return car(f.x, f.z); };
// Stand beside a find and let a lift run to its end at dt-second steps.
function raise(state, id, dt = 1 / 120) {
  const events = [], where = stand(state, id);
  for (let i = 0; i < 40 * 120 && !state.raised.includes(id); i++) events.push(...stepLift(state, where, {lift: true}, dt));
  return events;
}

test('a find lies at its trail point plus its offset, positive to the left (+x when heading +z)', () => {
  const state = createSirena(straight(), {}, ON);
  const badge = findAt(state, 'sirena-badge');
  assert.deepEqual([badge.x, badge.z], [2, 20], 'offset 2 at trail index 2 is 2 m to the left');
  assert.deepEqual([findAt(state, 'sirena-steering-wheel').x, findAt(state, 'sirena-steering-wheel').z], [-3, 100]);
  assert.equal(findAt(state, 'sirena-car').below, 3);
  assert.equal(state.active, true); assert.equal(state.sonar, false); assert.deepEqual(state.raised, []);
});

test('the real Kelp Coast gives six finds on every route, on the trail, in story order', () => {
  for (const route of ROUTE_VARIANTS) {
    const duel = new Duel({seed: route.seed, deepProviders: [], featureFlags: {'the-deep': true}});
    duel.startCampaign({seed: route.seed, car: 'falcone_f42', mode: 'duel', deepKit: true, opponentCount: 1, fieldSize: 2, fieldSeed: route.seed, playerId: 'node-qa'});
    const zone = defineZone(kelpCoastProvider(buildDeepRamp(duel.course)));
    const state = createSirena(zone, {}, ON);
    assert.deepEqual(state.finds.map(find => find.id), SIRENA_FINDS, `${route.id}: story order`);
    assert.equal(state.active, true);
    for (const row of zone.finds) {
      const find = findAt(state, row.id), point = zone.trail[row.trailIndex];
      assert.ok(Math.abs(Math.hypot(find.x - point.x, find.z - point.z) - Math.abs(row.offset)) < 1e-9, `${row.id} is offset sideways by its own amount`);
      assert.ok(Math.abs(row.offset) <= point.width / 2, `${row.id} is on the trail`);
    }
    // The whole story, driven: badge, four parts, the car; paid once each.
    let profile = {...createProfile(), credits: 100};
    for (const id of SIRENA_FINDS) {
      raise(state, id);
      assert.ok(state.raised.includes(id), `${route.id}: ${id} is raised`);
      const settled = raiseFind(profile, id, ON);
      assert.equal(settled.ok, true); profile = settled.profile;
    }
    assert.equal(profile.credits, 100 + 5 * SIRENA_PAY.part + SIRENA_PAY.car, 'five parts and the car pay 1,000 in all');
    assert.deepEqual(normalizeProfile(profile).deep, profile.deep, 'and the record is a fixed point of loading');
  }
});

test('no sonar until the badge is raised; the badge needs no sonar and gives it', () => {
  const state = createSirena(straight(), {}, ON);
  assert.deepEqual(pingSonar(state, car(0, 0), 0), [], 'silent before the badge');
  assert.deepEqual(pingSonar(state, car(0, 0), 5), [], 'and still silent later');
  // Stopping beside the badge for a second raises it, with no F and no lift event.
  const events = [], where = stand(state, 'sirena-badge');
  for (let i = 0; i < 100; i++) events.push(...stepLift(state, where, {lift: false}, 1 / 120));
  assert.deepEqual(events, [], 'not yet: under a second');
  for (let i = 0; i < 40; i++) events.push(...stepLift(state, where, {lift: false}, 1 / 120));
  assert.deepEqual(events, [{deepRaised: {find: 'sirena-badge'}}], 'a second beside it raises the badge, nothing else');
  assert.equal(state.sonar, true);
  assert.equal(pingSonar(state, car(0, 0), 10).length, 1, 'now the sonar answers');
  // Driving past does nothing; the badge needs the car stopped.
  const fresh = createSirena(straight(), {}, ON);
  for (let i = 0; i < 300; i++) stepLift(fresh, {...stand(fresh, 'sirena-badge'), speed: 10}, {lift: true}, 1 / 120);
  assert.deepEqual(fresh.raised, [], 'at speed it is not raised');
  // A saved badge brings the sonar back with it.
  assert.equal(createSirena(straight(), {raised: ['sirena-badge']}, ON).sonar, true);
  assert.equal(createSirena(straight(), {sonar: true}, ON).sonar, true);
});

test('the sonar shows the nearest find not yet raised within 150 m, and the car only after the other five', () => {
  const state = createSirena(straight(), {sonar: true, raised: ['sirena-badge']}, ON);
  const first = pingSonar(state, car(0, 0), 0)[0].deepSonar;
  assert.equal(first.blip.find, 'sirena-steering-wheel', 'nearest of the four parts, in front of the car');
  assert.equal(first.blip.distance, Math.hypot(-3, 100));
  // Next to the car itself it still shows a part, not the car.
  const near = pingSonar(state, stand(state, 'sirena-car'), 2)[0].deepSonar.blip;
  assert.notEqual(near.find, 'sirena-car', 'the car stays hidden until the other five are up');
  for (const id of ['sirena-steering-wheel', 'sirena-wheel', 'sirena-bonnet', 'sirena-door']) raise(state, id);
  const car5 = pingSonar(state, stand(state, 'sirena-door'), 4)[0].deepSonar.blip;
  assert.equal(car5.find, 'sirena-car', 'with five up, the car shows');
  raise(state, 'sirena-car');
  assert.equal(pingSonar(state, car(0, 0), 6)[0].deepSonar.blip, null, 'all raised: No echo');
  // Out of order lifts are refused.
  const early = createSirena(straight(), {sonar: true, raised: ['sirena-badge']}, ON);
  const carEvents = raise(early, 'sirena-car', 1 / 60);
  assert.deepEqual(early.raised, ['sirena-badge'], 'the car cannot be lifted first');
  assert.ok(!carEvents.some(e => e.deepLift), 'and does not even start');
});

test('range 150 m inclusive, one ping per 1.5 s, "No echo" when nothing is in range', () => {
  const state = createSirena(straight(), {sonar: true, raised: ['sirena-badge']}, ON);
  const wheel = findAt(state, 'sirena-steering-wheel');
  const inRange = pingSonar(state, car(wheel.x, wheel.z - 150), 0);
  assert.equal(inRange[0].deepSonar.blip.find, 'sirena-steering-wheel', 'exactly 150 m is in range');
  const out = createSirena(straight(), {sonar: true, raised: ['sirena-badge']}, ON);
  const far = pingSonar(out, car(wheel.x, wheel.z - 150.01), 0);
  assert.deepEqual(far, [{deepSonar: {blip: null, echoSeconds: null}}], '150.01 m: No echo');
  // Cooldown.
  assert.deepEqual(pingSonar(state, car(0, 0), 1.49), [], '1.49 s after: not yet');
  assert.equal(pingSonar(state, car(0, 0), 1.5).length, 1, '1.5 s after: ping');
  assert.deepEqual(pingSonar(state, car(0, 0), 2.9), [], 'the clock restarts from the last ping');
  assert.equal(pingSonar(state, car(0, 0), 3.0).length, 1);
  assert.deepEqual(pingSonar(state, car(0, 0), NaN), [], 'a bad clock does nothing');
  assert.deepEqual(pingSonar(state, {x: 0, z: 'a', speed: 0}, 9), [], 'a bad car does nothing');
});

test('the echo takes 2 x distance / 1,500 s and the blip points at the find', () => {
  const state = createSirena(straight(), {sonar: true, raised: ['sirena-badge']}, ON);
  const wheel = findAt(state, 'sirena-steering-wheel');
  const ping = pingSonar(state, car(wheel.x + 60, wheel.z, 0, Math.PI / 2), 0)[0].deepSonar;
  assert.equal(ping.blip.distance, 60);
  assert.equal(ping.echoSeconds, 2 * 60 / 1500); assert.equal(ping.echoSeconds, .08);
  assert.ok(Math.abs(ping.blip.bearing + Math.PI / 2) < 1e-12, 'the find is to the -x of the car: bearing -90 degrees');
  assert.ok(Math.abs(ping.blip.relative + Math.PI) < 1e-12 || Math.abs(ping.blip.relative - Math.PI) < 1e-12, 'and behind a car heading +x (left of +z)');
  assert.equal(pingSonar(createSirena(straight(), {sonar: true, raised: ['sirena-badge']}, ON), car(0, 0), 0)[0].deepSonar.blip.relative, null, 'no heading, no relative bearing');
});

test('a lift starts within 4 m under 3 km/h on F, takes 3 s (12 for the car), and finishes at any step size', () => {
  const ready = () => createSirena(straight(), {sonar: true, raised: ['sirena-badge']}, ON);
  const wheel = ready(), where = stand(wheel, 'sirena-steering-wheel');
  const here = findAt(wheel, 'sirena-steering-wheel');
  assert.deepEqual(stepLift(wheel, where, {lift: false}, 1 / 120), [], 'F is needed');
  const started = stepLift(wheel, where, {lift: true}, 1 / 120);
  assert.deepEqual(started, [{deepLift: {find: 'sirena-steering-wheel', seconds: 3}}]);
  // The lift ends at exactly 3 s whatever the step.
  for (const dt of [1 / 120, 1 / 60, 1 / 30, .25, .5]) {
    const state = ready(), at = stand(state, 'sirena-steering-wheel'), log = [];
    let t = 0;
    log.push(...stepLift(state, at, {lift: true}, dt));
    while (!state.raised.includes('sirena-steering-wheel') && t < 10) { t += dt; log.push(...stepLift(state, at, {}, dt)); }
    assert.ok(Math.abs(t - 3) < dt + 1e-9, `dt ${dt}: raised after ${t.toFixed(3)} s`);
    assert.ok(t >= 3 - 1e-6 && t <= 3 + dt, `dt ${dt}: not before 3 s`);
    assert.deepEqual(log.map(e => Object.keys(e)[0]), ['deepLift', 'deepRaised']);
  }
  // 12 seconds for the Sirena herself.
  const big = createSirena(straight(), {sonar: true, raised: SIRENA_FINDS.filter(id => id !== 'sirena-car')}, ON);
  assert.deepEqual(stepLift(big, stand(big, 'sirena-car'), {lift: true}, 1 / 120), [{deepLift: {find: 'sirena-car', seconds: 12}}]);
  let seconds = 0;
  while (!big.raised.includes('sirena-car') && seconds < 30) { seconds += 1 / 120; stepLift(big, stand(big, 'sirena-car'), {}, 1 / 120); }
  assert.ok(seconds >= 12 - 1e-6 && seconds <= 12 + 1 / 60, `the car needs ${seconds.toFixed(3)} s`);
  // Start boundaries: 4 m and 3 km/h.
  const edge = (dx, speed) => { const s = ready(); return stepLift(s, car(here.x + dx, here.z, speed), {lift: true}, 1 / 120).length; };
  assert.equal(edge(4, 0), 1, 'exactly 4 m starts'); assert.equal(edge(4.01, 0), 0, 'over 4 m does not');
  assert.equal(edge(0, 2.99 * MPH), 1, 'under 3 km/h starts'); assert.equal(edge(0, 3.01 * MPH), 0, 'over 3 km/h does not');
  assert.equal(edge(0, -2 * MPH), 1, 'reversing slowly is still slow');
  // Depth is ignored: the car being 3 m down on its ledge is reached from above.
  const ledge = createSirena(straight(), {sonar: true, raised: SIRENA_FINDS.filter(id => id !== 'sirena-car')}, ON);
  assert.equal(stepLift(ledge, stand(ledge, 'sirena-car'), {lift: true}, 1 / 120).length, 1);
});

test('driving off cancels a lift; a new one starts from nothing', () => {
  for (const [label, away] of [['past 4 m', c => ({...c, x: c.x + 4.5})], ['over 3 km/h', c => ({...c, speed: 5})]]) {
    const state = createSirena(straight(), {sonar: true, raised: ['sirena-badge']}, ON), at = stand(state, 'sirena-wheel');
    stepLift(state, at, {lift: true}, 1 / 120);
    for (let i = 0; i < 120; i++) stepLift(state, at, {}, 1 / 120);          // a second in
    assert.equal(state.lift.elapsed > .9, true);
    assert.deepEqual(stepLift(state, away(at), {}, 1 / 120), [{deepLiftCancel: {find: 'sirena-wheel'}}], `${label}: cancelled`);
    assert.equal(state.lift, null); assert.deepEqual(state.raised, ['sirena-badge'], 'and nothing raised');
    stepLift(state, at, {lift: true}, 1 / 120);                              // back and press F again
    assert.ok(state.lift && state.lift.elapsed === 0, 'the new lift starts from zero');
    let seconds = 0;
    while (!state.raised.includes('sirena-wheel') && seconds < 10) { seconds += 1 / 120; stepLift(state, at, {}, 1 / 120); }
    assert.ok(seconds >= 3 - 1e-6 && seconds <= 3.02, `${label}: the full 3 s again (${seconds.toFixed(3)})`);
  }
});

test('rewards: 100 a part (the badge included), 500 the car, 1,000 the cup, each once, in order', () => {
  let profile = {...createProfile(), credits: 50, futureField: {keep: true}, deep: {found: ['kelp-coast'], mystery: 7}};
  const before = structuredClone(profile);
  // Out of order or unknown: refused, nothing changes.
  for (const id of ['sirena-wheel', 'sirena-car', 'nope', undefined, '__proto__']) {
    const refused = raiseFind(profile, id, ON);
    assert.equal(refused.ok, false, String(id)); assert.equal(refused.profile, profile); assert.equal(refused.paid, 0);
  }
  const badge = raiseFind(profile, 'sirena-badge', ON);
  assert.equal(badge.paid, 100); assert.equal(badge.profile.credits, 150);
  assert.deepEqual(badge.profile.deep, {found: ['kelp-coast'], mystery: 7, raised: ['sirena-badge'], sonar: true}, 'the badge records the sonar too; unknown keys survive');
  assert.deepEqual(profile, before, 'the input is never changed');
  profile = badge.profile;
  assert.equal(raiseFind(profile, 'sirena-badge', ON).profile, profile, 'the badge pays once');
  assert.equal(raiseFind(profile, 'sirena-car', ON).ok, false, 'the car waits for the parts');
  for (const id of ['sirena-door', 'sirena-steering-wheel', 'sirena-bonnet']) profile = raiseFind(profile, id, ON).profile;
  assert.equal(raiseFind(profile, 'sirena-car', ON).ok, false, 'one part still missing');
  const wheel = raiseFind(profile, 'sirena-wheel', ON);
  assert.equal(wheel.paid, 100); profile = wheel.profile;
  assert.equal(profile.credits, 50 + 5 * 100, 'five parts: 500');
  const car = raiseFind(profile, 'sirena-car', ON);
  assert.equal(car.paid, 500); profile = car.profile;
  assert.deepEqual(profile.deep.raised, ['sirena-badge', 'sirena-door', 'sirena-steering-wheel', 'sirena-bonnet', 'sirena-wheel', 'sirena-car']);
  assert.equal(raiseFind(profile, 'sirena-car', ON).profile, profile, 'the car pays once');
  // The Coast Cup.
  assert.equal(recordCoastCup(before, ON).ok, false, 'no cup before the car is raised');
  const cup = recordCoastCup(profile, ON);
  assert.equal(cup.paid, 1000); assert.equal(cup.profile.deep.coastCup, true); assert.deepEqual(cup.events, [{deepCoastCup: {}}]);
  assert.equal(cup.profile.credits, profile.credits + 1000);
  const again = recordCoastCup(cup.profile, ON);
  assert.equal(again.profile, cup.profile); assert.equal(again.paid, 0); assert.deepEqual(again.events, []);
  assert.equal(cup.profile.credits, 50 + 1000 + 1000, 'the whole story pays 2,000 on top of the start');
});

test('credits stop at the cap, and a bad wallet is treated as empty', () => {
  const rich = {...createProfile(), credits: 999_999_950};
  const paid = raiseFind(rich, 'sirena-badge', ON);
  assert.equal(paid.profile.credits, 1_000_000_000); assert.equal(paid.paid, 50, 'only what fits');
  const over = raiseFind({...createProfile(), credits: 2_000_000_000}, 'sirena-badge', ON);
  assert.equal(over.profile.credits, 2_000_000_000); assert.equal(over.paid, 0, 'a wallet past the cap is left alone');
  for (const credits of [undefined, NaN, -5]) {
    const result = raiseFind({...createProfile(), credits}, 'sirena-badge', ON);
    assert.equal(result.profile.credits, 100, `credits ${String(credits)} count as 0`);
  }
  // A hand-built wallet is read as loading reads it (whole, from 0) and never reduced.
  for (const [credits, expected] of [[1500.5, 1600], ['500', 600], [2500.7, 2600], ['12', 112], [1.5, 101]]) {
    const result = raiseFind({...createProfile(), credits}, 'sirena-badge', ON);
    assert.equal(result.profile.credits, expected, `credits ${String(credits)}`);
    assert.ok(result.profile.credits >= Math.floor(Number(credits)), 'never below what the wallet held');
  }
});

test('the same inputs give the same events, byte for byte', () => {
  const script = () => {
    const state = createSirena(straight(), {}, ON), log = [];
    for (const id of SIRENA_FINDS) {
      const at = stand(state, id);
      for (let i = 0; i < 40 * 120 && !state.raised.includes(id); i++) {
        log.push(...stepLift(state, at, {lift: i % 7 === 0}, 1 / 120));
        if (i % 90 === 0) log.push(...pingSonar(state, at, i / 120));
      }
    }
    return JSON.stringify({log, raised: state.raised, lastPing: state.lastPing});
  };
  assert.equal(script(), script());
  assert.ok(script().includes('deepRaised'));
});

test('with the switch off, or no finds, nothing pings, lifts, records or pays', () => {
  const off = createSirena(straight(), {sonar: true, raised: ['sirena-badge']});
  assert.equal(off.active, false);
  assert.deepEqual(pingSonar(off, car(0, 0), 0), []);
  assert.deepEqual(stepLift(off, stand(off, 'sirena-wheel'), {lift: true}, 1), []);
  assert.deepEqual(off.lift, null);
  const profile = {...createProfile(), credits: 10};
  for (const options of [{}, {enabled: false}, {enabled: undefined}, {enabled: 'yes'}]) {
    assert.equal(raiseFind(profile, 'sirena-badge', options).profile, profile);
    assert.equal(recordCoastCup({...profile, deep: {raised: [...SIRENA_FINDS]}}, options).paid, 0);
  }
  assert.equal(raiseFind(profile, 'sirena-badge').paid, 0);
  assert.ok(!Object.hasOwn(profile, 'deep'), 'and no Deep field appears');
  // A zone with no finds (any other place) is inert even when on.
  const bare = createSirena({...straight(), finds: undefined}, {}, ON);
  assert.equal(bare.active, false); assert.deepEqual(bare.finds, []);
  assert.deepEqual(pingSonar(bare, car(0, 0), 0), []);
  assert.equal(createSirena(null, {}, ON).active, false);
});

test('the save: three optional fields, unknown keys kept, old saves unchanged, bad values cleaned', () => {
  for (const old of [undefined, null, {}, {found: ['kelp-coast'], kit: true, pacificFinishes: 3}]) {
    const loaded = normalizeDeep(old);
    for (const key of ['sonar', 'raised', 'coastCup']) assert.equal(Object.hasOwn(loaded, key), false, `${JSON.stringify(old)} gains no ${key}`);
  }
  const profile = {...createProfile(), deep: {found: ['kelp-coast'], kit: true}};
  assert.deepEqual(normalizeProfile(profile).deep, {found: ['kelp-coast'], kit: true}, 'an old save loads exactly');
  const saved = normalizeDeep({sonar: true, raised: ['sirena-badge', 'sirena-badge', 'BAD ID', 7, '../x'], coastCup: true, future: {keep: 1}});
  assert.deepEqual(saved, {sonar: true, raised: ['sirena-badge'], coastCup: true, future: {keep: 1}});
  assert.deepEqual(normalizeDeep({sonar: 'yes', raised: 'sirena-badge', coastCup: 1}), {sonar: false, raised: [], coastCup: false});
  assert.deepEqual(normalizeDeep(saved), saved, 'normalising twice changes nothing');
  assert.equal(createSirena(straight(), {raised: ['sirena-wheel', 'not-a-find', 'sirena-badge']}, ON).raised.join(), 'sirena-wheel,sirena-badge', 'ids the zone does not know are ignored');
});

test('odd saves keep the badge payment in step and never lose the id just raised', () => {
  // sonar given without the badge in the list: the part is accepted, in step with the dive state.
  const sonarOnly = {...createProfile(), credits: 0, deep: {sonar: true}};
  assert.equal(createSirena(straight(), sonarOnly.deep, ON).sonar, true);
  const part = raiseFind(sonarOnly, 'sirena-wheel', ON);
  assert.equal(part.ok, true); assert.equal(part.paid, 100); assert.deepEqual(part.profile.deep.raised, ['sirena-wheel']);
  // A raised list already at the 128-id limit loses an id this game does not know, not the new one.
  const crowded = {...createProfile(), deep: {raised: Array.from({length: 128}, (_, i) => `other-${i}`)}};
  const badge = raiseFind(crowded, 'sirena-badge', ON);
  assert.equal(badge.profile.deep.raised.length, 128); assert.equal(badge.profile.deep.raised.at(-1), 'sirena-badge');
  assert.ok(normalizeProfile(badge.profile).deep.raised.includes('sirena-badge'), 'and it survives a reload');
  assert.equal(raiseFind(normalizeProfile(badge.profile), 'sirena-badge', ON).paid, 0, 'so it is not paid twice');
});
