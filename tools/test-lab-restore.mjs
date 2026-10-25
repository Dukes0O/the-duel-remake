// LAB-RESTORE: restoring the Falcone Sirena on the Rust bench (docs/LAB.md section 7). The offer, the one saved step, the
// sequence as a function of time, and its room (tank, wreck, car, bubbles) released when the Lab closes.
import {readFileSync} from 'node:fs';
import {getPaintState, paintPresetsFor, purchasePaint, applyPaint} from '../src/paint-presets.js';
import {restoreStageAt, RUNNING_SECONDS, BODY_SECONDS} from '../src/lab/restore.js';
import assert from 'node:assert/strict';
import test from 'node:test';
import {Group, Mesh, BoxGeometry, MeshStandardMaterial, BufferAttribute} from 'three';
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
  // Review: a Lab field from a newer game is not read (and so never makes the offer throw or pay); a cup without the car is no replay.
  for (const lab of [{version: 2}, {version: 2, done: {rust: true}}, {version: 1, done: null}, null, 'junk']) {
    const profile = {...withDeep(createProfile()), credits: 5000, lab};
    assert.doesNotThrow(() => restoreOffer(profile, BOTH), JSON.stringify(lab));
    assert.notEqual(restoreOffer(profile, BOTH).state, 'offered', JSON.stringify(lab));
    assert.equal(restoreSirena(profile, {flags: BOTH}).ok, false);
    assert.equal(restoreSirena(profile, {flags: BOTH}).profile, profile);
  }
  assert.equal(restoreOffer({...waiting(), deep: {version: 1, raised: ['sirena-car'], coastCup: true}}, BOTH).state, 'hidden', 'a won cup with no car on the list offers no replay');
  assert.equal(restoreOffer('x', BOTH).state, 'hidden');
});

test('short of credits the button is disabled and says how many more', () => {
  const offer = restoreOffer(waiting(500), BOTH);
  assert.equal(offer.state, 'offered');
  assert.equal(offer.canBuy, false);
  assert.equal(offer.note, '500 more credits');
  assert.ok(restoreOfferMarkup(offer).includes('disabled') && restoreOfferMarkup(offer).includes('500 more credits'));
  assert.ok(restoreOfferMarkup(restoreOffer(waiting(2500), BOTH)).includes('Get her running: 1,000 CR'));
  assert.ok(!restoreOfferMarkup(restoreOffer(waiting(2500), BOTH)).includes('disabled'), 'exactly the price is enough');
});

test('getting her running takes 1,000 once, makes the car the player\'s and takes nothing else away', () => {
  const before = waiting(5000);
  assert.equal(sirenaState(before), 'waiting');
  const result = restoreSirena(before, {flags: BOTH});
  assert.equal(result.ok, true);
  assert.equal(result.price, RESTORE_PRICE);
  const after = result.profile;
  assert.equal(after.credits, 4000);
  assert.ok(isCarUnlocked(after, SIRENA_CAR));
  assert.equal(sirenaState(after), 'restored', 'the garage reads the car from the list: no new state');
  // Every other field is exactly what it was; the cars the player had are all still there, in order.
  const {credits: c1, unlockedCars: u1, upgrades: g1, cosmetics: paint1, ...rest1} = before, {credits: c2, unlockedCars: u2, upgrades: g2, cosmetics: paint2, ...rest2} = after;
  assert.deepEqual(rest2, rest1);
  assert.deepEqual(paint2[SIRENA_CAR], {owned:['factory','sea-wreck'],selected:'sea-wreck'});
  assert.deepEqual(normalizeProfile(after).cosmetics[SIRENA_CAR], paint2[SIRENA_CAR]);
  assert.deepEqual(u2.slice(0, u1.length), u1);
  assert.equal(u2.length, u1.length + 1);
  assert.deepEqual(g2, g1);
  assert.equal(before.credits, 5000, 'the profile it was given is not changed');
  assert.deepEqual(normalizeProfile(after).unlockedCars.includes(SIRENA_CAR), true, 'the saved shape reads back');
  // Paid once: a second restore, from the restored profile or the old one, takes nothing more.
  const again = restoreSirena(after, {flags: BOTH});
  assert.equal(again.ok, false);
  assert.equal(again.profile, after, 'the very same profile comes back on a refusal');
  assert.equal(after.credits, 4000);
  assert.equal(restoreOffer(after, BOTH).state, 'again');
});

test('every refusal returns the same profile and takes nothing', () => {
  for (const [profile, flags, why] of [
    [waiting(999), BOTH, /500|1 more|more credits/], [withDeep(createProfile()), BOTH, /Rust/], [createProfile(), BOTH, /nothing to restore/],
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
  assert.equal(first.water, 1); assert.equal(last.water, 0);
  assert.equal(last.done, true); assert.equal(last.red, 1); assert.equal(last.stripe, 1); assert.equal(last.car, 1); assert.equal(last.wreck, 0); assert.equal(last.rust, 0);
  assert.ok(Math.abs(last.saltShare - SALT_LEFT) < 1e-9 && last.weeks === SOAK_WEEKS);
  let previous = stageAt(0);
  for (let t = 0.5; t <= RESTORE_SECONDS; t += 0.5) {
    const now = stageAt(t);
    assert.ok(now.overall >= previous.overall && now.weeks >= previous.weeks && now.saltShare <= previous.saltShare + 1e-12, `at ${t}: time, weeks and salt run one way`);
    assert.ok(now.water <= previous.water + 1e-12, `at ${t}: the tank only drains`);
    assert.ok(now.rust <= previous.rust + 1e-12 && now.car >= previous.car && now.red >= previous.red && now.stripe >= previous.stripe, `at ${t}: rust goes, the car comes`);
    for (const key of ['overall', 'saltShare', 'rust', 'wreck', 'car', 'red', 'stripe', 'bubbles', 'into', 'water']) assert.ok(now[key] >= 0 && now[key] <= 1, `${key} at ${t}`);
    previous = now;
  }
  assert.equal(stageAt(30).bubbles, 1, 'the current fizzes');
  assert.equal(stageAt(5).bubbles, 0);
  assert.equal(stageAt(57).stripe, 0, 'the red goes on before the white stripe');
  // The strip must read without its label: the crust is clearly gone between the current's frame and the strip's.
  assert.ok(stageAt(29).rust - stageAt(40).rust > 0.25, 'the rust colour fades visibly from the current to the strip');
  assert.ok(stageAt(40).rust < 0.3 && stageAt(44).rust < 0.1, 'the metal is bare by the end of the strip');
  // The tank drains before the car stands in it, and the red car is never under water.
  assert.equal(stageAt(44).water, 1); assert.equal(stageAt(50).water, 0);
  for (let t = 0; t <= RESTORE_SECONDS; t += 0.25) if (stageAt(t).red > 0 || stageAt(t).car > .5) assert.equal(stageAt(t).water, 0, `no car in the water at ${t}`);
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
  assert.ok(html.includes('<li class="now" aria-current="step">Soak</li>'), 'the running step is marked');
  const later = restoreRunMarkup({...stageAt(40), first: true, skippable: false});
  assert.ok(later.includes('✓ Soak') && later.includes('✓ Current') && later.includes('class="now" aria-current="step">Strip') && !later.includes('✓ Strip'), 'the finished steps are ticked');
  assert.ok(restoreRunMarkup({...stageAt(61), first: true, skippable: false}).includes('✓ Paint'), 'all five are ticked at the end');
  assert.ok(restoreRunMarkup({...stageAt(61), first: true, skippable: false, unsaved: true}).includes('could not save'));
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
  assert.equal(app.profile.credits, 3000);
  assert.equal(sirenaState(app.profile), 'restored');
  assert.equal(app.labCommit((profile, flags) => restoreSirena(profile, {flags})).ok, false);
  assert.equal(app.profile.credits, 3000, 'not charged twice');
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
  assert.ok(loaded.includes('/assets/models/sirena/wreck-hull.glb') && !loaded.includes('/assets/models/sirena/wreck.glb'), 'the tank holds the hull alone, never the sand mound');
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

test('the hull\'s rust colour fades to bare grey as it is stripped, and comes back if the sequence is watched again', async () => {
  const win = fakeWindow(), host = fakeHost(win);
  const renderer = {setPixelRatio() {}, setSize() {}, render() {}, dispose() {}, forceContextLoss() {}};
  const hull = new Group(), geometry = new BoxGeometry(1, 1, 1), count = geometry.attributes.position.count;
  const rusty = new Float32Array(count * 3).map((_, i) => [.55, .22, .12][i % 3]);
  geometry.setAttribute('color', new BufferAttribute(rusty.slice(), 3));
  hull.add(new Mesh(geometry, new MeshStandardMaterial({vertexColors: true})));
  const scene = createLabScene({host, manifest: {models: [], layout: {}}, createRenderer: () => renderer, createCar: fakeCar,
    load: async path => path.includes('wreck-hull') ? hull : new Group()});
  await scene.ready;
  scene.restore(stageAt(1));
  await new Promise(resolve => setTimeout(resolve, 10));
  const spread = () => { const c = geometry.attributes.color.array; return Math.abs(c[0] - c[2]); };   // red minus blue: rust is red, bare metal is not
  scene.renderOnce(10);
  const rustySpread = spread();
  scene.restore(stageAt(29)); scene.renderOnce(20);
  const midSpread = spread();
  scene.restore(stageAt(40)); scene.renderOnce(30);
  const stripSpread = spread();
  scene.restore(stageAt(46)); scene.renderOnce(40);
  const bareSpread = spread();
  assert.ok(rustySpread > .35 && midSpread < rustySpread && stripSpread < midSpread && bareSpread < .08, `${rustySpread} > ${midSpread} > ${stripSpread} > ${bareSpread}`);
  assert.ok(midSpread - stripSpread > .1, 'the strip\'s frame differs from the current\'s without its label');
  scene.restore(stageAt(1)); scene.renderOnce(50);
  assert.ok(Math.abs(spread() - rustySpread) < .02, 'a second watch starts rusty again');
  scene.dispose();
});

const PAINT_ON = {labEnabled:true, deepEnabled:true};
test('both payments, free reapplication, and Coast Cup in either finish', () => {
  const running = restoreSirena(waiting(2500), {flags:BOTH}).profile;
  assert.equal(running.credits,1500);
  assert.deepEqual(paintPresetsFor(running,SIRENA_CAR,PAINT_ON).map(p=>p.id),['sea-wreck','restored-1966']);
  assert.equal(applyPaint(running,SIRENA_CAR,'factory',PAINT_ON).ok,false,'factory cannot bypass restoration');
  assert.equal(applyPaint(running,SIRENA_CAR,'restored-1966',PAINT_ON).ok,false);
  const body = purchasePaint(running,SIRENA_CAR,'restored-1966',PAINT_ON);
  assert.equal(body.cost,1500); assert.equal(body.profile.credits,0);
  assert.equal(body.purchased,true);
  assert.deepEqual(body.profile.cosmetics[SIRENA_CAR],{owned:['factory','sea-wreck','restored-1966'],selected:'restored-1966'});
  assert.equal(purchasePaint(body.profile,SIRENA_CAR,'restored-1966',PAINT_ON).cost,0);
  const wreck = applyPaint(body.profile,SIRENA_CAR,'sea-wreck',PAINT_ON);
  assert.equal(wreck.cost,0); assert.equal(wreck.profile.cosmetics[SIRENA_CAR].selected,'sea-wreck');
  for (const profile of [running,body.profile,wreck.profile]) {
    assert.ok(settleCoastCup(profile,{enabled:true,valid:true,eventId:'pacific-canyon',car:SIRENA_CAR,mode:'duel'}).paid>0);
    assert.deepEqual(normalizeProfile(profile).cosmetics,profile.cosmetics);
  }
});
test('forged and short wallets cannot pay, and special finishes are Sirena-only and dev-only', () => {
  for (const credits of [999,999.9,NaN,Infinity,'5000',-1,null]) {
    const profile=waiting(credits),result=restoreSirena(profile,{flags:BOTH});
    assert.equal(result.ok,false); assert.equal(result.profile,profile);
  }
  for (const credits of [1499,1499.9,NaN,Infinity,'5000',-1,null]) {
    const profile={...restoreSirena(waiting(),{flags:BOTH}).profile,credits};
    const result=purchasePaint(profile,SIRENA_CAR,'restored-1966',PAINT_ON);
    assert.equal(result.ok,false); assert.equal(result.profile,profile);
  }
  const profile=restoreSirena(waiting(),{flags:BOTH}).profile;
  for(const options of [{},{labEnabled:true},{deepEnabled:true}]) {
    for(const id of ['sea-wreck','restored-1966']) assert.equal(purchasePaint(profile,SIRENA_CAR,id,options).ok,false);
    assert.ok(!paintPresetsFor(profile,SIRENA_CAR,options).some(p=>p.id==='restored-1966'));
  }
  for(const car of ['falcone_f42','constructor','no-car'])
    assert.equal(purchasePaint(profile,car,'restored-1966',PAINT_ON).ok,false);
});
test('old restored fixture gets both only in the dev view; normalization and lab-off leave old saves alone', () => {
  const fixture=JSON.parse(readFileSync(new URL('./fixtures/saves/lab-restore-2.json',import.meta.url),'utf8')).storage['the-duel-players-v2'].players[0].profile;
  const before=JSON.stringify(fixture),profile=normalizeProfile(fixture);
  assert.deepEqual(profile.cosmetics,{}); assert.equal(JSON.stringify(fixture),before);
  assert.deepEqual(getPaintState(profile,SIRENA_CAR).owned,['factory']);
  const state=getPaintState(profile,SIRENA_CAR,PAINT_ON);
  assert.ok(state.owned.includes('sea-wreck')&&state.owned.includes('restored-1966'));
  assert.equal(state.selected,'restored-1966');
  const result=purchasePaint(profile,SIRENA_CAR,'sea-wreck',PAINT_ON);
  assert.equal(result.cost,0); assert.equal(result.profile.credits,fixture.credits);
  assert.deepEqual(result.profile.futureNote,fixture.futureNote);
  assert.deepEqual(normalizeProfile(result.profile).cosmetics,result.profile.cosmetics);
  const liveApply=applyPaint(result.profile,SIRENA_CAR,'factory');
  assert.ok(liveApply.profile.cosmetics[SIRENA_CAR].owned.includes('sea-wreck'),'inactive finishes survive ordinary paint writes');
  for(const p of [createProfile(),{version:1,credits:100,unlockedCars:['falcone_f42']}])
    assert.ok(!Object.hasOwn(normalizeProfile(p).cosmetics,SIRENA_CAR));
});
test('two sequential stale tabs reread a shared memory save for each payment', () => {
  let saved=waiting(4000),writes=0;
  const makeApp=()=>{const app=new App();app._switches=()=>BOTH;app.profile=saved;
    app._refreshPlayer=()=>{app.profile=saved;};app._saveProfile=()=>{saved=normalizeProfile(app.profile);writes++;return true;};return app;};
  const a=makeApp(),b=makeApp();
  assert.equal(a.labCommit((p,flags)=>restoreSirena(p,{flags})).ok,true);
  assert.equal(b.labCommit((p,flags)=>restoreSirena(p,{flags})).ok,false);
  assert.equal(saved.credits,3000); assert.equal(writes,1);
  assert.equal(a.purchasePaint(SIRENA_CAR,'restored-1966').cost,1500);
  assert.equal(b.purchasePaint(SIRENA_CAR,'restored-1966').cost,0);
  assert.equal(saved.credits,1500); assert.equal(writes,2);
});
test('mechanical and body shows are disjoint and mechanical work leaves the body crust intact', () => {
  assert.equal(RUNNING_SECONDS+BODY_SECONDS,RESTORE_SECONDS);
  for(let t=0;t<=RUNNING_SECONDS;t+=.5){const v=restoreStageAt(t);
    assert.ok(['soak','current','strip'].includes(v.stage)); assert.equal(v.rust,1);assert.equal(v.car,0);assert.equal(v.red,0);}
  const done=restoreStageAt(RUNNING_SECONDS);assert.equal(done.done,true);
  assert.equal(restoreStageAt(0,'body').stage,'rebuild');
  assert.equal(restoreStageAt(BODY_SECONDS,'body').red,1);
  assert.equal(restoreStageAt(BODY_SECONDS,'body').done,true);
  assert.ok(!restoreRunMarkup(restoreStageAt(12)).includes('>Paint</li>'));
  assert.ok(!restoreRunMarkup(restoreStageAt(0,'body')).includes('>Soak</li>'));
});
