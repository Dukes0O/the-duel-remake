// LAB-RESTORE: restoring the Falcone Sirena on the Rust bench (docs/LAB.md section 7). The offer, the one saved step, the
// sequence as a function of time, and its room (tank, wreck, car, bubbles) released when the Lab closes.
import assert from 'node:assert/strict';
import test from 'node:test';
import {Group, Object3D, Mesh, BoxGeometry, MeshStandardMaterial} from 'three';
import {RESTORE_PRICE, RESTORE_SECONDS, RESTORE_STAGES, SALT_LEFT, SOAK_WEEKS, restoreOffer, restoreSirena, stageAt} from '../src/lab/restore.js';
import {createProfile, normalizeProfile, isCarUnlocked, getUpgradeLevels} from '../src/progression.js';
import {sirenaState, SIRENA_CAR, settleCoastCup} from '../src/deep/sirena-car.js';
import {labOf} from '../src/lab/lab-save.js';
import {restoreOfferMarkup, restoreRunMarkup} from '../src/lab/lab-markup.js';
import {createLabScene, labSceneStats, RESTORE_STAGE} from '../src/lab/lab-scene.js';
import {App} from '../src/app.js';

const on = names => ({enabled: name => names.includes(name)});
const BOTH = on(['lab', 'the-deep']);
const withDeep = (profile, raised = true) => ({...profile, deep: {...(profile.deep ?? {}), version: 1, raised: raised ? ['sirena-car'] : []}});
const rustDone = profile => ({...profile, lab: {...labOf(profile), done: {...labOf(profile).done, rust: true}}});
const waiting = (credits = 5000) => rustDone({...withDeep(createProfile()), credits});

test('the offer shows only for a raised Sirena with the Rust lesson passed and both switches on', () => {
  assert.equal(restoreOffer(waiting(), BOTH).state, 'offered');
  assert.equal(restoreOffer(waiting(), BOTH).price, RESTORE_PRICE);
  assert.equal(restoreOffer(waiting(), on(['lab'])).state, 'hidden', 'the-deep off');
  assert.equal(restoreOffer(waiting(), on(['the-deep'])).state, 'hidden', 'lab off');
  assert.equal(restoreOffer(waiting(), on([])).state, 'hidden');
  assert.equal(restoreOffer(rustDone(createProfile()), BOTH).state, 'hidden', 'not raised yet: the wreck is still in the sea');
  assert.equal(restoreOffer(withDeep(createProfile()), BOTH).state, 'locked', 'waiting, but the Rust lesson is not passed');
  assert.match(restoreOffer(withDeep(createProfile()), BOTH).note, /Rust/);
  assert.equal(restoreOffer(null, BOTH).state, 'hidden');
  assert.equal(restoreOffer('x', BOTH).state, 'hidden');
});

test('short of credits the button is disabled and says how many more', () => {
  const offer = restoreOffer(waiting(2000), BOTH);
  assert.equal(offer.state, 'offered');
  assert.equal(offer.canBuy, false);
  assert.equal(offer.note, '500 more credits');
  assert.ok(restoreOfferMarkup(offer).includes('disabled') && restoreOfferMarkup(offer).includes('500 more credits'));
  assert.ok(restoreOfferMarkup(restoreOffer(waiting(2500), BOTH)).includes('Restore the Sirena: 2,500 CR'));
  assert.ok(!restoreOfferMarkup(restoreOffer(waiting(2500), BOTH)).includes('disabled'), 'exactly the price is enough');
});

test('restoring takes 2,500 once, makes the car the player\'s and takes nothing else away', () => {
  const before = waiting(5000);
  assert.equal(sirenaState(before), 'waiting');
  const result = restoreSirena(before, {flags: BOTH});
  assert.equal(result.ok, true);
  assert.equal(result.price, RESTORE_PRICE);
  const after = result.profile;
  assert.equal(after.credits, 2500);
  assert.ok(isCarUnlocked(after, SIRENA_CAR));
  assert.equal(sirenaState(after), 'restored', 'the garage reads the car from the list: no new state');
  // Every other field is exactly what it was; the cars the player had are all still there, in order.
  const {credits: c1, unlockedCars: u1, upgrades: g1, ...rest1} = before, {credits: c2, unlockedCars: u2, upgrades: g2, ...rest2} = after;
  assert.deepEqual(rest2, rest1);
  assert.deepEqual(u2.slice(0, u1.length), u1);
  assert.equal(u2.length, u1.length + 1);
  assert.deepEqual(g2, g1);
  assert.equal(before.credits, 5000, 'the profile it was given is not changed');
  assert.deepEqual(normalizeProfile(after).unlockedCars.includes(SIRENA_CAR), true, 'the saved shape reads back');
  // Paid once: a second restore, from the restored profile or the old one, takes nothing more.
  const again = restoreSirena(after, {flags: BOTH});
  assert.equal(again.ok, false);
  assert.equal(again.profile, after, 'the very same profile comes back on a refusal');
  assert.equal(after.credits, 2500);
  assert.equal(restoreOffer(after, BOTH).state, 'again');
});

test('every refusal returns the same profile and takes nothing', () => {
  for (const [profile, flags, why] of [
    [waiting(2499), BOTH, /500|1 more|more credits/], [withDeep(createProfile()), BOTH, /Rust/], [createProfile(), BOTH, /nothing to restore/],
    [waiting(), on(['lab']), /not available/], [waiting(), on(['the-deep']), /not available/], [waiting(), null, /not available/]]) {
    const result = restoreSirena(profile, {flags});
    assert.equal(result.ok, false);
    assert.equal(result.profile, profile);
    assert.match(result.reason, why);
  }
  assert.equal(restoreSirena(waiting()).ok, false, 'no switches given: refused');
});

test('a stale upgrade record for the unowned car is cleared as for any bought car; owned cars keep theirs', () => {
  const base = waiting(5000);
  const stale = {...base, upgrades: {...base.upgrades, [SIRENA_CAR]: {engine: 3, handling: 3, tires: 3, brakes: 3, suspension: 3, aero: 3, nitro: 3}}};
  const restored = restoreSirena(stale, {flags: BOTH}).profile;
  assert.deepEqual(restored.upgrades[SIRENA_CAR], getUpgradeLevels(null, SIRENA_CAR));
  const other = Object.keys(base.upgrades).find(key => key !== SIRENA_CAR);
  assert.deepEqual(restored.upgrades[other], base.upgrades[other]);
});

test('restored, the Coast Cup works as SIRENA-CAR built it, and the replay stays on offer after it is won', () => {
  const restored = restoreSirena(waiting(5000), {flags: BOTH}).profile;
  const cup = settleCoastCup(restored, {enabled: true, valid: true, eventId: 'pacific-canyon', car: SIRENA_CAR, mode: 'duel'});
  assert.ok(cup.paid > 0);
  assert.equal(sirenaState(cup.profile), 'cupDone');
  assert.equal(restoreOffer(cup.profile, BOTH).state, 'again');
});

test('the sequence is about a minute in five stages and every reading moves the right way', () => {
  assert.equal(RESTORE_STAGES.length, 5);
  assert.equal(RESTORE_SECONDS, 60);
  assert.deepEqual(RESTORE_STAGES.map(stage => stage.id), ['soak', 'current', 'strip', 'rebuild', 'paint']);
  const first = stageAt(0), last = stageAt(RESTORE_SECONDS);
  assert.equal(first.stage, 'soak'); assert.equal(first.saltShare, 1); assert.equal(first.weeks, 0); assert.equal(first.rust, 1);
  assert.equal(first.wreck, 1); assert.equal(first.car, 0);
  assert.equal(last.done, true); assert.equal(last.red, 1); assert.equal(last.stripe, 1); assert.equal(last.car, 1); assert.equal(last.wreck, 0); assert.equal(last.rust, 0);
  assert.ok(Math.abs(last.saltShare - SALT_LEFT) < 1e-9 && last.weeks === SOAK_WEEKS);
  let previous = stageAt(0);
  for (let t = 0.5; t <= RESTORE_SECONDS; t += 0.5) {
    const now = stageAt(t);
    assert.ok(now.overall >= previous.overall && now.weeks >= previous.weeks && now.saltShare <= previous.saltShare + 1e-12, `at ${t}: time, weeks and salt run one way`);
    assert.ok(now.rust <= previous.rust + 1e-12 && now.car >= previous.car && now.red >= previous.red && now.stripe >= previous.stripe, `at ${t}: rust goes, the car comes`);
    for (const key of ['overall', 'saltShare', 'rust', 'wreck', 'car', 'red', 'stripe', 'bubbles', 'into']) assert.ok(now[key] >= 0 && now[key] <= 1, `${key} at ${t}`);
    previous = now;
  }
  assert.equal(stageAt(30).bubbles, 1, 'the current fizzes');
  assert.equal(stageAt(5).bubbles, 0);
  assert.equal(stageAt(57).stripe, 0, 'the red goes on before the white stripe');
  assert.ok(stageAt(57).red > 0.9);
});

test('the sequence function takes any time: junk, negative or huge', () => {
  assert.equal(stageAt(-5).overall, 0);
  assert.equal(stageAt(NaN).stage, 'soak');
  assert.equal(stageAt(undefined).overall, 0);
  assert.equal(stageAt(1e9).done, true);
  assert.equal(stageAt('x').overall, 0);
});

test('the run panel names the five steps, the readouts and, for a replay, a Skip', () => {
  const html = restoreRunMarkup({...stageAt(12), first: true, skippable: false});
  for (const word of ['Soak', 'Current', 'Strip', 'Rebuild', 'Paint', 'Salt in the metal', 'week 13 of 26 (fast-forward)', '20%']) assert.ok(html.includes(word), word);
  assert.ok(!html.includes('restore-skip'), 'the first run has no Skip');
  assert.ok(restoreRunMarkup({...stageAt(12), first: false, skippable: true}).includes('data-lab="restore-skip"'));
  const done = restoreRunMarkup({...stageAt(61), first: true, skippable: false});
  assert.ok(done.includes('waits at Pacific Canyon') && done.includes('restore-close'));
});

// ---- through the app: the Lab's one save call ----

test('through the app: restoring is saved once, the garage state follows, and with a switch off nothing shows or saves', () => {
  const app = new App();
  app._switches = () => ({enabled: name => ['lab', 'the-deep'].includes(name)});
  app.profile = {...app.profile, ...waiting(4000), unlockedCars: app.profile.unlockedCars, upgrades: app.profile.upgrades};
  assert.equal(sirenaState(app.profile), 'waiting');
  const result = app.labCommit((profile, flags) => restoreSirena(profile, {flags}));
  assert.equal(result.ok, true);
  assert.equal(app.profile.credits, 1500);
  assert.equal(sirenaState(app.profile), 'restored');
  assert.equal(app.labCommit((profile, flags) => restoreSirena(profile, {flags})).ok, false);
  assert.equal(app.profile.credits, 1500, 'not charged twice');
  const off = new App();
  off._switches = () => ({enabled: name => name === 'lab'});
  off.profile = {...off.profile, ...waiting(4000), unlockedCars: off.profile.unlockedCars, upgrades: off.profile.upgrades};
  assert.equal(off.labCommit((profile, flags) => restoreSirena(profile, {flags})).ok, false);
  assert.equal(sirenaState(off.profile), 'waiting');
});

// ---- the room ----

function fakeWindow() {
  const listeners = new Map(), frames = new Set();
  let next = 1;
  return {listeners, frames, devicePixelRatio: 1,
    addEventListener(type, fn) { listeners.set(fn, type); }, removeEventListener(type, fn) { listeners.delete(fn); },
    requestAnimationFrame() { const id = next++; frames.add(id); return id; }, cancelAnimationFrame(id) { frames.delete(id); }};
}
function fakeHost(win) {
  const children = new Set();
  return {ownerDocument: {defaultView: win, createElement: tag => ({tag, className: '', remove() { children.delete(this); }})},
    clientWidth: 640, clientHeight: 360, children, append(node) { children.add(node); }};
}
const fakeCar = () => {
  const car = new Group();
  const paint = new MeshStandardMaterial({color: 0x888888}), livery = new MeshStandardMaterial({name: 'White livery', color: 0xffffff});
  car.add(new Mesh(new BoxGeometry(1, 1, 1), paint), new Mesh(new BoxGeometry(1, 1, 1), livery));
  car.userData.paint = paint;
  return car;
};
const fakeWreck = () => { const g = new Group(); g.add(new Mesh(new BoxGeometry(1, 1, 1), new MeshStandardMaterial({color: 0x664422}))); return g; };

test('the tank, wreck, car and bubbles follow the sequence and are all released on dispose', async () => {
  const win = fakeWindow(), host = fakeHost(win);
  const renderer = {setPixelRatio() {}, setSize() {}, render() {}, dispose() {}, forceContextLoss() {}};
  const loaded = [];
  const scene = createLabScene({host, manifest: {models: [], layout: {}}, createRenderer: () => renderer, createCar: fakeCar,
    load: async path => { loaded.push(path); return path.includes('wreck') ? fakeWreck() : new Group(); }});
  await scene.ready;
  scene.restore(stageAt(5));
  await new Promise(resolve => setTimeout(resolve, 10));
  assert.ok(loaded.includes('/assets/models/sirena/wreck.glb'), 'the wreck model is the one SIRENA-ART made');
  scene.renderOnce(1000);
  const toward = scene.camera();
  assert.ok(Math.abs(toward.goal[2] - RESTORE_STAGE.camera.position[2]) < 1e-9, 'the camera comes to the tank');
  scene.restore(stageAt(30)); scene.renderOnce(1100);
  scene.restore(stageAt(58)); scene.renderOnce(1200);
  scene.restore(stageAt(RESTORE_SECONDS)); scene.renderOnce(1300);
  scene.restore(null); scene.renderOnce(1400);
  scene.dispose();
  assert.equal(labSceneStats().live, 0);
  assert.equal(win.listeners.size, 0); assert.equal(win.frames.size, 0); assert.equal(host.children.size, 0);
});
