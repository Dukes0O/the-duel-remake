import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Group, PerspectiveCamera, Texture, Vector3} from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {night2LightBlend} from '../src/world-job-camera.js';
import {worldHudModel, worldMapFrame} from '../src/world/world-hud.js';
import {SOUND_BANK} from '../src/sound-bank.js';
import {App} from '../src/app.js';
import {yardHomeScreen} from '../src/screen-yard-home.js';
import {pageFunctions, pageSource} from './scenarios/story-night-2.mjs';
import {Duel} from '../src/game.js';
import {namedThrow, bankHearth, createLedger} from '../src/story/ledger.js';
import {NIGHT_2_CHOICES, NIGHT_2_SCENES, night2Count} from '../src/story/scenes/night-2.js';
import {validateTalkScene} from '../src/story/talk.js';
import {night2Job, night2Odds, night2Opening} from '../src/world/jobs/night-2.js';
import {NIGHT_2_SITES as sites} from '../src/world/jobs/night-2-sites.js';
import {savedLedger} from '../src/story/ledger-save.js';
import {settleNight2} from '../src/story/night-2-save.js';
import {createScablandsScene, SCABLANDS_ASSETS} from '../src/world/scablands-scene.js';
import {syncScene} from '../src/scene-systems.js';
import {scablandsSurfaceHeightAt} from '../src/world/scablands-ground.js';
import {sees} from '../src/world/scablands-ways.js';
import {sweepObstacle} from '../src/collision.js';
import {applyArmorDamage} from '../src/combat-armor.js';
import {worldPose} from '../src/arena/arena-floor.js';
import {RIDER_RULE} from '../src/world/jobs/rider-rule.js';
import {createCombatHud} from '../src/combat-hud.js';
import {createHudScreen} from '../src/screen-hud.js';
import {placeWashSurroundReview, startWashSurroundReview} from './night-2-wash-review.js';
import {PLAYERS_KEY, createPlayer, loadPlayers, replacePlayerProfile, savePlayers, selectPlayer} from '../src/progression.js';

const seedFor = (name, chance, outcome) => {
  for (let seed = 1; seed < 10_000; seed++)
    if (namedThrow(createLedger(night2Opening(seed)), name, chance) === outcome) return seed;
  throw new Error('No seed for ' + name);
};
const theftSeed = seedFor('night-2/dace-steals', .5, true);
const giftSeed = seedFor('night-2/dace-steals', .5, false);
const refusesSeed = seedFor('night-2/clinker-offer', .5, true);
const goesSeed = seedFor('night-2/clinker-offer', .5, false);
const flags = {enabled: id => ['hidden-road', 'story-choices', 'crew-gear', 'warlord-cards'].includes(id)};

function chapter(seed, startedDuel) {
  const duel = startedDuel ?? new Duel({seed, featureFlags: flags});
  const cues = [];
  duel.onChange((_state, event) => { if (event.arenaTell) cues.push(event.arenaTell.cue); });
  if (!startedDuel) {
    duel.state.wastelandGateDiscovered = true;
    assert(duel.startArenaEvent({venueId: 'scablands', mode: 'world-job', car: 'falcone_f42', seed,
      opponents: [], job: night2Job(seed)}));
  }
  const world = duel.state.arena.worldJob;
  const view = world.night2;
  duel.state.countdown = 0;
  const tick = (n = 1) => { for (let i = 0; i < n; i++) duel.step(1 / 60); };
  const stage = () => world.job.steps[world.job.stepIndex]?.id;
  const screen = () => world.job.stepState.screen;
  const send = action => { assert(duel.talkInput(action, screen())); tick(); };
  const say = words => {
    if (!screen()) tick();
    while (screen()?.phase !== 'options') send({type: 'advance'});
    const index = screen().options.findIndex(option => option.words === words);
    assert(index >= 0, 'Missing option: ' + words);
    send({type: 'select', index});
  };
  const advance = next => {
    for (let i = 0; i < 20 && stage() !== next; i++) {
      if (!screen()) tick();
      else {
        assert.notEqual(screen().phase, 'options', 'Must answer at ' + stage());
        send({type: 'advance'});
      }
    }
    assert.equal(stage(), next);
  };
  const footAt = at => {
    const {x, y, z} = at.position ?? at;
    const {s, lateral} = duel.course.nearest(x, z);
    Object.assign(duel.state.fighter, {x, y, z, s, lateral, groundY: y, speed: 0});
  };
  const openGate = () => {
    tick(2);
    advance('walk-to-gate');
    footAt(sites.gateTalk);
    tick(2);
    assert.equal(stage(), 'gate');
  };
  const finish = count => {
    if (!screen()) tick();
    assert.equal(screen().line.words, night2Count(Math.max(0, count - 1)).lines[0].words);
    const state = duel.state, fighter = state.fighter;
    const position = fighter ? [fighter.x, fighter.y, fighter.z] : [state.s, state.lateral];
    advance(undefined);
    assert.deepEqual(fighter ? [fighter.x, fighter.y, fighter.z] : [state.s, state.lateral], position,
      'The closing camera cut leaves the player where they were');
    assert.equal(duel.state.arena.result.winnerId, 'player');
    assert.equal(view.ledger.night, 3);
    assert.deepEqual(view.bank, {burned: Math.min(1, count), needed: 1});
    assert.equal(view.page.embers, Math.max(0, count - 1));
    assert.equal(Object.hasOwn(view.page, 'feud'), false);
  };
  return {duel, world, view, tick, stage, screen, say, advance, footAt, openGate, finish, cues};
}

for (const scene of Object.values(NIGHT_2_SCENES)) validateTalkScene(scene);
for (const id of ['town.gate.bell', 'night.whistle', 'luck.kind', 'luck.unkind'])
  assert.equal(SOUND_BANK[id].flag, 'story-choices');
assert.notDeepEqual(SOUND_BANK['luck.kind'].layers, SOUND_BANK['luck.unkind'].layers);
assert.equal(bankHearth(createLedger(night2Opening(9))).needed, 1);
const opening = chapter(giftSeed);
opening.openGate();
assert(opening.cues.includes('town.gate.bell'));
assert.equal(opening.world.storyPeople.filter(person => person.cart).length, 4);
assert.equal(opening.world.storyPeople.length, 13);
assert.equal(opening.world.storyPeople.find(person => person.id === 'wim').seat, 'handcart');
const pose = JSON.parse(await readFile(new URL('./art/story-plates/night-2-pose.json', import.meta.url)));
const matchesPose = (point, relative) => {
  for (const [index, axis] of ['x', 'y', 'z'].entries())
    assert(Math.abs(point[axis] - pose.gateWorld[index] - relative[index]) < 1e-8, 'Gate staging ' + axis);
};
for (const {id, action, position, yaw} of pose.people) {
  const person = opening.world.storyPeople.find(person => person.id === id);
  matchesPose(person.position, position);
  assert.equal(person.action, action);
  assert.equal(person.yaw, yaw);
}
for (const {owner, axle, yaw} of pose.carts) {
  const {cart} = opening.world.storyPeople.find(person => person.id === owner);
  matchesPose(cart, axle);
  assert.equal(cart.yaw, yaw);
}
const camera = opening.view.camera;
matchesPose(camera.position, pose.camera.eye);
matchesPose(camera.target, pose.camera.aim);
assert.equal(camera.fov, pose.camera.verticalFov);
const project = (camera, point) => {
  const lens = new PerspectiveCamera(camera.fov, 1280 / 720, .15, 2400);
  lens.position.copy(camera.position);
  lens.lookAt(new Vector3(camera.target.x, camera.target.y, camera.target.z));
  lens.updateMatrixWorld(true);
  return new Vector3(point.x, point.y, point.z).project(lens);
};
assert.equal(opening.screen()?.options?.length ?? 0, 0);
const feetLine = Math.max(...opening.world.storyPeople
  .filter(person => pose.people.some(item => item.id === person.id))
  .map(person => (1 - project(camera, person.position).y) * 360));
assert(feetLine < 608, 'At 1280×720 the bottom 112 px clear the approved cast');
const hearthLook = chapter(giftSeed);
for (const point of [sites.hearth.position, {...sites.auntie.position, y: sites.auntie.position.y + 1.7}]) {
  const projected = project(hearthLook.view.camera, point);
  assert(Math.abs(projected.x) < .9 && Math.abs(projected.y) < .9,
    'The hearth shot contains the fire and Auntie');
}
assert.equal(night2LightBlend(0, true, 1), .25);
assert.equal(night2LightBlend(.25, true, 1), .5);
assert.equal(night2LightBlend(.5, true, 2), 1);
assert.equal(night2LightBlend(1, false, 2), .5);
console.log(`Gate cast feet at/before pixel ${feetLine.toFixed(1)} of 720; hearth and Auntie both in frame; four-second dusk blend.`);
opening.say(NIGHT_2_CHOICES[0].words);
assert.deepEqual([opening.view.ledger.stocks.embers, opening.view.ledger.words.walkers, opening.view.ledger.roadWord],
  [3, 'Friendly', 1]);
opening.advance('salt');
assert(opening.cues.includes('luck.kind'));
opening.advance('close');
opening.finish(3);
assert(opening.view.page.memories.includes('Dace kept a watch nobody asked for.'));
assert.equal(opening.view.ledger.feud, 'Raiding');
const profile = {wasteland: {scrap: 7}};
const saved = settleNight2(profile, opening.view);
assert(saved.ok && saved.changed);
assert.equal(saved.profile.wasteland.scrap, 17);
assert.deepEqual({...savedLedger(saved.profile), version: undefined}, {...opening.view.ledger, version: undefined});
assert.equal(settleNight2(saved.profile, opening.view).profile, saved.profile);
const newer = {story: {version: 7}, wasteland: {scrap: 91}};
assert.equal(settleNight2(newer, opening.view).profile, newer);

const nightScene = createScablandsScene(opening.duel.course, {loadAsset: async path => {
  if (path === SCABLANDS_ASSETS.folk || path.endsWith('/story-walkers.glb') || path.endsWith('/cinder.glb')) {
    const bytes = await readFile(new URL('../public' + path, import.meta.url));
    const loader = new GLTFLoader();
    loader.register(() => ({name: 'TEST_TEXTURE', loadTexture: () => Promise.resolve(new Texture())}));
    return loader.parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
  }
  const root = new Group();
  if (path === SCABLANDS_ASSETS.bess || path === SCABLANDS_ASSETS.furnace) {
    const vehicle = new Group();
    vehicle.name = path === SCABLANDS_ASSETS.bess ? 'Big Bess gas truck' : "Old Smoke's rolling furnace";
    root.add(vehicle);
  }
  return {scene: root};
}});
assert(await nightScene.ready);
const findScene = (run, name) => {
  syncScene(nightScene.group, run.duel.state);
  return nightScene.group.getObjectByName(name);
};
function checkCampSmoke(run) {
  const fires = findScene(run, 'Walkers’ camp fires');
  assert(fires.visible);
  const smoke = fires.children.map(fire => fire.getObjectByName('Brazier smoke column'));
  assert.equal(smoke.length, 2);
  for (const plume of smoke) {
    assert(plume.visible);
    const {uHeight, uFoot, uTop, uWind, uLean, uDark, uPale, uStrength} = plume.material.uniforms;
    assert(uHeight.value < 5 && uFoot.value < .3 && uTop.value < 1.6 && uFoot.value < uTop.value);
    assert(uLean.value > .3 && uWind.value.length() > .9, 'Small plumes lean with the wind');
    assert(uDark.value.g > .4 && uPale.value.g > uDark.value.g && uStrength.value < .45,
      'Campfire smoke is pale and translucent');
    assert(plume.geometry.attributes.position.count > 24, 'The plume bends over its visible height');
  }
  const seconds = () => smoke.map(plume => plume.material.uniforms.uTime.value);
  const before = seconds();
  assert.notEqual(before[0], before[1]);
  syncScene(nightScene.group, run.duel.state, 0, .5);
  assert(seconds().every((value, index) => value > before[index]));
}

for (const [answer, count, word, mark] of [
  [0, 3, 'Sworn', 'dace-runner'], [1, 2, 'Friendly', 'dace-secret'], [2, 3, 'Wary', 'dace-sent-away'], [null, 1, 'Friendly', null],
]) {
  const run = chapter(theftSeed);
  run.openGate();
  run.say(NIGHT_2_CHOICES[0].words);
  run.advance('theft');
  assert(run.cues.includes('luck.unkind'));
  const {x, y, z} = run.duel.state.fighter;
  run.advance('reach-store');
  assert.deepEqual([run.duel.state.fighter.x, run.duel.state.fighter.y, run.duel.state.fighter.z], [x, y, z]);
  run.footAt(sites.storeApproach);
  run.tick(2);
  assert.equal(run.stage(), 'chase');
  const dace = run.world.storyPeople.find(person => person.id === 'dace');
  run.tick();
  assert.equal(run.view.routes.length, 2);
  if (answer === null) {
    let lastSeen, disappeared = false;
    // Standing by the store leaves time for Dace to turn the corner.
    for (let i = 0; i < 230 && run.stage() === 'chase'; i++) {
      run.duel.step(.5);
      const track = run.view.daceTrack;
      if (track?.visible) lastSeen = null;
      else if (track) {
        if (lastSeen) assert.deepEqual(track.position, lastSeen, 'A hidden map mark stays at the last sighting');
        else lastSeen = {...track.position};
        const map = worldMapFrame({state: run.duel.state, course: run.duel.course});
        assert.deepEqual(map.actors.find(actor => actor.id === 'dace')?.position, track.position);
        disappeared = true;
      }
    }
    assert(disappeared, 'Dace disappears behind a solid or beyond sight of the store');
    assert.equal(run.stage(), 'escaped');
    const fires = findScene(run, 'Walkers’ camp fires');
    assert(fires.visible && fires.children.every(fire => fire.visible));
    checkCampSmoke(run);
    const cast = run.world.storyPeople;
    const carts = cast.filter(person => person.cart);
    assert.equal(carts.length, 4);
    const rell = cast.find(person => person.id === 'rell');
    const peopleView = nightScene.group.getObjectByName('Wasteland story people');
    await peopleView.userData.ready;
    assert.ifError(peopleView.userData.loadError);
    syncScene(nightScene.group, run.duel.state);
    const drawnCarts = carts.map(({id}) => peopleView.getObjectByName('story-handcart-' + id));
    assert(drawnCarts.every(cart => cart?.visible));
    const rellDraw = peopleView.getObjectByName('story-person-' + rell.id);
    assert(rellDraw.visible);
    const targets = [rellDraw.getWorldPosition(new Vector3()), ...fires.children.map(fire => fire.position),
      ...drawnCarts.map(cart => cart.getWorldPosition(new Vector3()))];
    for (const target of targets) {
      const image = project(run.view.camera, target);
      assert(Math.abs(image.x) < .9 && Math.abs(image.y) < .9 && image.z > 0 && image.z < 1,
        'Escape camera frames Rell, her fires and all four carts');
    }
    assert.match(run.world.job.steps[run.world.job.stepIndex].scene.lines[0].words, /they've burned away/);
    assert(run.view.ledger.obligations.some(item => item.id === 'walkers-great-favour'));
  } else {
    run.footAt(dace.position);
    run.tick(2);
    assert.equal(run.stage(), 'caught');
    run.say(NIGHT_2_SCENES.caught.choices[answer].words);
    assert(run.view.ledger.marks.includes(mark));
  }
  assert.equal(run.view.ledger.words.walkers, word);
  run.advance('close');
  run.finish(count);
}

// Run the production App mouse handler against the native fighter. The laptop
// scenario additionally dispatches a real CDP mouse press at the canvas.
function withMouse(run, press) {
  const win = new EventTarget(), doc = new EventTarget();
  class Canvas {
    closest(selector) { return selector === '#view3d canvas' ? this : null; }
    requestPointerLock() { doc.pointerLockElement = this; }
  }
  const previous = {window: globalThis.window, document: globalThis.document, Element: globalThis.Element};
  const input = Object.assign(Object.create(App.prototype), {duel: run.duel, _footPointer: {},
    _resetKeyboardInput() {}, _readGamepad() { return {}; }, keys: {}});
  try {
    Object.assign(globalThis, {window: win, document: doc, Element: Canvas});
    input._bindKeys();
    const event = new Event('mousedown', {cancelable: true});
    Object.defineProperties(event, {button: {value: 0}, target: {value: new Canvas()}});
    win.dispatchEvent(event);
    assert(event.defaultPrevented && input._footPointer.fire, 'The canvas press reaches the fighter input');
    input._applyInput(1 / 60);
    assert(run.duel.state.fighterInput.fire);
    press();
  } finally {
    input._inputEvents?.abort();
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete globalThis[key];
      else globalThis[key] = value;
    }
  }
}

function pumpFalloff(lamp, radius, intensity) {
  const light = lamp.children.find(object => object.isPointLight);
  assert(light.intensity >= intensity && light.distance >= radius && light.decay === 2,
    'The pump illuminates ground nearby with falloff');
}

for (const stopped of [false, true]) {
  const run = chapter(giftSeed);
  run.openGate();
  run.say(NIGHT_2_CHOICES[1].words);
  assert.equal(run.view.ledger.stocks.embers, 3);
  assert.equal(run.view.ledger.roadWord, 1);
  assert.equal(run.view.ledger.words.walkers, 'Friendly');
  assert(run.view.ledger.obligations.some(item => item.id === 'walkers-watch'));
  run.advance('walk-watch-post');
  run.footAt(sites.watchPost);
  run.tick(2);
  run.advance('scout');
  assert(run.cues.includes('night.whistle'));
  if (stopped) {
    const scout = run.world.actors.find(actor => actor.brandAsh);
    run.footAt({x: scout.x, y: scout.y, z: scout.z + 3.5});
    Object.assign(run.duel.state.fighter, {yaw: Math.PI, pitch: 0});
    pumpFalloff(findScene(run, 'Town lamp: pump'), 25, 100);
    assert.equal(findScene(run, 'Night 2 hearth light').visible, true);
    withMouse(run, () => run.tick(12));
    assert(run.view.scoutTurned, 'The canvas press works with the loaned hand flamer');
    run.duel.setFighterInput({fire: false});
  }
  for (let i = 0; i < 750 && run.stage() === 'scout'; i++) run.tick(7);
  assert.equal(run.stage(), stopped ? 'scout-stopped' : 'scout-escaped');
  assert.equal(run.view.ledger.feud, stopped ? 'Watching' : 'Raiding');
  run.advance('close');
  run.finish(3);
}

const lamp = chapter(23);
lamp.openGate();
lamp.say(NIGHT_2_CHOICES[2].words);
assert.equal(lamp.view.ledger.extraHeatFrom, 2);
assert.equal(lamp.view.ledger.stocks.embers, 4);
assert.equal(lamp.view.ledger.words['auntie-solder'], 'Wary');
assert.equal(lamp.view.ledger.roadWord, 2);
lamp.advance('light-pump');
lamp.tick();
const lampHud = () => worldHudModel({worldJob: lamp.world, player: lamp.duel.state.fighter, onFoot: true});
assert.equal(lampHud().line, 'Take a brand from the hearth.');
assert.equal(lampHud().target.name, 'The hearth');
const darkLamp = findScene(lamp, 'Town lamp: pump');
assert.equal(darkLamp.children.find(object => object.isPointLight).intensity, 0);
lamp.footAt(sites.hearthFront);
lamp.tick();
assert(lamp.world.job.stepState.brandSeconds > 0);
const guide = lampHud();
assert.equal(guide.line, 'Carry the brand to the pump lamp.');
assert.equal(guide.target.name, 'The pump lamp');
assert.deepEqual([guide.target.x, guide.target.z], [lamp.world.marker.x, lamp.world.marker.z]);
const weapon = lamp.duel.state.footWeapons;
assert.equal(weapon.selected, 'rpg');
assert(weapon.ammo > 0);
const {ammo, serial} = weapon;
withMouse(lamp, () => lamp.tick(5));
assert.equal(weapon.ammo, ammo);
assert.equal(weapon.serial, serial);
assert(!lamp.duel.state.combat.projectiles.some(projectile => projectile.kind === 'rpg'));
lamp.duel.setFighterInput({fire: false});
// Use the new arrow from the hearth to the pump through the real foot mover.
let atPump = false;
for (let frame = 0; frame < 1800 && lamp.stage() === 'light-pump'; frame++) {
  const fighter = lamp.duel.state.fighter;
  if (!atPump && Math.hypot(fighter.x - sites.pump.position.x, fighter.z - sites.pump.position.z) < 8) {
    atPump = true;
    withMouse(lamp, () => lamp.tick(5));
    assert.equal(weapon.ammo, ammo);
    assert.equal(weapon.serial, serial);
  }
  const route = lamp.view.routes[0];
  if (route) pointAt(lamp.duel, route.point, {forward: route.metres > .4, sprint: true});
  lamp.tick();
}
assert(atPump, 'The mouse press also reaches the peaceful guard among the shacks by the pump');
assert.equal(lamp.stage(), 'back-to-hearth');
assert(lamp.view.lamps.pump);
pumpFalloff(findScene(lamp, 'Town lamp: pump'), 25, 100);
assert.equal(findScene(lamp, 'Night 2 hearth light').visible, true);
followRoute(lamp, 'back-to-hearth', 1800, true);
assert.equal(lamp.stage(), 'at-hearth');
lamp.advance('close');
lamp.finish(4);

for (const [seed, mall, outcome] of [
  [refusesSeed, false, 'walkers-refuse-clinker'],
  [goesSeed, false, 'walkers-go-with-clinker'],
  [refusesSeed, true, 'walkers-refuse-clinker'],
]) {
  const run = chapter(seed);
  run.openGate();
  run.say(NIGHT_2_CHOICES[3].words);
  run.say(NIGHT_2_SCENES.refuse.choices[mall ? 0 : 1].words);
  run.advance('tower');
  if (!run.screen()) run.tick();
  assert.equal(night2Odds(run.view).refuseClinker, mall ? .75 : .5);
  assert.equal(run.view.ledger.words.walkers, mall ? 'Wary' : 'Cold');
  assert.equal(run.view.ledger.roadWord, 0);
  const options = run.world.job.steps[run.world.job.stepIndex].scene.choices;
  assert.deepEqual(options.map(choice => choice.id), ['watch-clinker', 'carry-ember']);
  assert.match(options[0].detail, mall ? /^Rell will probably turn Clinker down/ : /^Rell might take Clinker/);
  if (mall) {
    const camera = run.view.camera, eye = camera.position;
    const fires = findScene(run, 'Walkers’ camp fires');
    assert(fires.visible && fires.children.length === 2);
    checkCampSmoke(run);
    const points = fires.children.map(fire => {
      assert(fire.visible && Math.hypot(fire.position.x - sites.camp.position.x, fire.position.z - sites.camp.position.z) < 8);
      return fire.children.find(object => object.renderOrder === 3);
    });
    for (const [index, actor] of run.world.actors.filter(actor => actor.id.startsWith('wash-rider-')).entries()) {
      const pair = nightScene.group.getObjectByName(`Wash rider ${index + 1} lights`);
      assert(pair.visible && pair.children.length === 2);
      assert.deepEqual([pair.position.x, pair.position.z], [actor.position.x, actor.position.z]);
      points.push(...pair.children);
    }
    assert.equal(points.length, 8);
    const screenPoints = points.map(light => {
      const at = light.getWorldPosition(new Vector3());
      const center = project(camera, at);
      assert(Math.abs(center.x) < .75 && Math.abs(center.y) < .75 && center.z > -1 && center.z < 1,
        'All camp flames and rider lights fit inside the actual tower camera');
      assert(sees(eye, at, {heightAt: scablandsSurfaceHeightAt, eye: 0, target: 0, step: 2, actorFloors: true}),
        'No land hides the light from the tower');
      const nearby = run.world.solidGrid.near(eye.x, eye.z, at.x, at.z, 1);
      assert(!nearby.some(solid => solid.kind !== 'person' && sweepObstacle(eye, at, solid, 0,
        {halfWidth: 0, halfLength: 0, height: 0})), 'No town solid hides the light from the tower');
      const radius = light.geometry.parameters.radius ?? light.geometry.parameters.width * light.getWorldScale(new Vector3()).x / 2;
      const edge = project(camera, {...at, z: at.z + radius});
      assert(Math.abs(edge.x - center.x) * 1280 >= 4, 'Projected light is at least four pixels across');
      return center;
    });
    assert(screenPoints.every((point, index) => screenPoints.every((other, j) => index === j ||
      Math.hypot((point.x - other.x) * 640, (point.y - other.y) * 360) >= 4)), 'The projected lights stay distinct');
    const [first, second] = screenPoints;
    const fireGap = Math.hypot((first.x - second.x) * 640, (first.y - second.y) * 360);
    console.log(`Tower camera resolves two camp fires (${fireGap.toFixed(1)} px apart) and six rider lights through actual scene geometry.`);
  }
  run.say('Stay on the tower and watch');
  assert.equal(run.view.watchOutcome, outcome);
  run.advance('close');
  run.finish(4);
  assert.equal(run.view.ledger.feud, outcome === 'walkers-go-with-clinker' ? 'Hunting' : 'Raiding');
}

console.log('PASS Night 2 real world job: opening cast, both named throws, caught choices and escape, scout, lamp, Mall and bank.');

// The scripted play follows the two real navigation arrows and uses only
// talk choices and on-foot controls to carry out the watch, from start to end.
const memory = new Map();
globalThis.localStorage = {getItem: key => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, String(value)),
  removeItem: key => memory.delete(key)};
globalThis.cancelAnimationFrame = () => {};
const app = new App();
app.audio.unlock = () => {};
app.profile = {...app.profile, unlockedCars: [...app.profile.unlockedCars, 'falcone_vasca'],
  wasteland: {...app.profile.wasteland, discoveredGate: true}};
assert(app._saveProfile());
app.duel.featureFlags = flags;
const wall = yardHomeScreen({profile: app.profile, playerName: app.player.name, escapeHTML: String, panel: 'cards', featureFlags: flags});
assert.match(wall, /Five Cold Nights/);
assert.match(wall, /data-action="story-night-2"/);
assert(app.visitWasteland());
app.advance(8);
assert(app.isYardHomeActive());
app.duel.featureFlags = {enabled: id => id === 'hidden-road'};
assert.equal(app.startNight2(), false);
app.duel.featureFlags = flags;
assert(app.startNight2());
const drive = chapter(app.seed, app.duel);
function pointAt(duel, point, options) {
  const fighter = duel.state.fighter;
  const yaw = Math.atan2(point.x - fighter.x, point.z - fighter.z);
  const turn = Math.atan2(Math.sin(fighter.yaw - yaw), Math.cos(fighter.yaw - yaw));
  duel.setFighterInput({...options, lookX: turn / .0022, lookY: fighter.pitch / .0022});
}
drive.tick(2);
drive.advance('walk-to-gate');
for (let i = 0; i < 800 && drive.stage() === 'walk-to-gate'; i++) {
  const route = drive.view.routes[0];
  if (route) pointAt(drive.duel, route.point, {forward: true, sprint: true});
  drive.tick();
}
assert.equal(drive.stage(), 'gate');
drive.duel.setFighterInput({forward: false});
drive.say(NIGHT_2_CHOICES[1].words);
drive.advance('walk-watch-post');
for (let i = 0; i < 1800 && drive.stage() === 'walk-watch-post'; i++) {
  const route = drive.view.routes[0];
  if (route) pointAt(drive.duel, route.point, {forward: true, sprint: true});
  drive.tick();
}
assert.equal(drive.stage(), 'whistle');
drive.advance('scout');
for (let i = 0; i < 3600 && drive.stage() === 'scout'; i++) {
  const route = drive.view.routes[0];
  if (route) pointAt(drive.duel, route.point, {
    forward: !drive.view.scoutTurned && route.metres > 3, sprint: true, fire: !drive.view.scoutTurned && route.metres < 5,
  });
  drive.tick();
}
assert.equal(drive.stage(), 'scout-stopped');
drive.advance('close');
drive.finish(3);
assert.equal(savedLedger(app.profile).night, 3);
assert.equal(savedLedger(app.profile).feud, 'Watching');
assert.equal(app.duel.state.arena.result.settlementSaved, true);
console.log('PASS Night 2 scripted play: the watch, hearth to close, scout driven out by the gate.');

// The carry uses the ordinary pot from pickup to arrival. Set the car's
// position only to isolate the cost and delivery rule from the scripted play.
const pot = chapter(22);
pot.openGate();
pot.say(NIGHT_2_CHOICES[3].words);
pot.say('Say nothing');
pot.advance('tower');
pot.say('Carry one ember out to the Walkers now');
assert.equal(pot.stage(), 'pot');
assert.equal(pot.view.ledger.stocks.embers, 3);
assert(pot.world.actors.filter(actor => actor.renderCar).length === 3);
const parked = {x: sites.car.x + 18, y: sites.car.y, z: sites.car.z + 6};
const relocated = pot.duel.course.nearest(parked.x, parked.z);
Object.assign(pot.duel.state, {s: relocated.s, lateral: relocated.lateral, prevS: relocated.s,
  prevLateral: relocated.lateral, speedMph: 0});
pot.footAt({x: parked.x + 2, y: parked.y, z: parked.z});
pot.tick();
assert.equal(pot.world.job.stepState.loaded, undefined, 'The parked car needs to be boarded');
assert(Math.hypot(pot.world.marker.x - parked.x, pot.world.marker.z - parked.z) < .05);
pot.duel.setInput({interact: true});
for (let i = 0; i < 120 && pot.duel.state.onFoot; i++) pot.tick();
assert.equal(pot.duel.state.onFoot, false, 'The pot branch starts next to the usable car');
pot.duel.setInput({interact: false});
pot.tick(3);
assert(pot.world.job.stepState.loaded);
const {s, lateral} = pot.duel.course.nearest(sites.camp.position.x + 6, sites.camp.position.z);
Object.assign(pot.duel.state, {s, lateral, prevS: s, prevLateral: lateral, speedMph: 0});
pot.tick(2);
assert.equal(pot.stage(), 'delivery');
assert.equal(pot.view.ledger.words.walkers, 'Friendly');
assert(pot.view.ledger.marks.includes('changed-mind-in-night'));
pot.advance('close');
pot.finish(3);

const asked = chapter(11);
asked.openGate();
asked.say("Who's the boy staring at our hearth?");
asked.say('Dace, can I have a word with you?');
asked.say('Where are you going?');
asked.say('Why not just take a light from our hearth?');
asked.say(NIGHT_2_CHOICES[0].words);
assert.equal(asked.view.ledger.stocks.embers, 3);
assert(asked.view.ledger.marks.includes('know-south-ford'));
assert.equal(night2Odds(asked.view).theft, .22);
for (const [name, fn] of Object.entries(pageFunctions)) new Function('return ' + pageSource(name, ...Array(fn.length).fill(null)));
for (const source of [
  "document.querySelector('.night-2-alternative-route')?.hidden === false",
  'window.__qaApp.duel.state.arena.worldJob.job.stepState.brandSeconds > 0',
]) new Function('return (' + source + ')');
console.log('PASS Night 2 pot, questions, memory-only entry and scenario expression syntax.');

// Drive only the reviewed approach and chase segment with the same fighter
// inputs a player has. The opening-to-closing scripted play remains the watch.
const chaseDrive = chapter(theftSeed);
chaseDrive.openGate();
chaseDrive.say(NIGHT_2_CHOICES[0].words);
chaseDrive.advance('reach-store');
function followRoute(run, scene, limit, sprint) {
  for (let frame = 0; frame < limit && run.stage() === scene; frame++) {
    const route = run.view.routes[0];
    if (route) pointAt(run.duel, route.point, {forward: true, sprint});
    run.tick();
  }
}
followRoute(chaseDrive, 'reach-store', 1800, true);
assert.equal(chaseDrive.stage(), 'chase');
chaseDrive.tick();
assert(chaseDrive.view.daceTrack?.visible, 'Dace is seen before leaving the store');
const firstDace = {...chaseDrive.view.daceTrack.position};
assert.match(worldHudModel({worldJob: chaseDrive.world, onFoot: true}).line, /Catch Dace.*west alleys/);
assert.equal(chaseDrive.view.holstered, true);
const map = worldMapFrame({state: chaseDrive.duel.state, course: chaseDrive.duel.course});
assert.equal(map.actors.find(actor => actor.id === 'dace')?.kind, 'dace');
let seen = 0, hidden = 0;
for (let frame = 0; frame < 5400 && chaseDrive.stage() === 'chase'; frame++) {
  const track = chaseDrive.view.daceTrack;
  const route = chaseDrive.view.routes[0];
  if (route) pointAt(chaseDrive.duel, route.point, {forward: true, sprint: true});
  if (track?.visible) seen++;
  else hidden++;
  chaseDrive.tick();
  if (track && !track.visible && chaseDrive.view.daceTrack && !chaseDrive.view.daceTrack.visible)
    assert.deepEqual(chaseDrive.view.daceTrack.position, track.position, 'A hidden map mark stays at the last sighting');
}
assert.equal(chaseDrive.stage(), 'caught', 'The sprint can catch Dace before the Wash');
assert(seen > 0, 'The sprint starts from a visible Dace');
assert(Math.hypot(firstDace.x - sites.store.position.x, firstDace.z - sites.store.position.z) < 1);
console.log(`PASS Night 2 chase: real route caught Dace, ${seen} visible steps and ${hidden} last-seen steps.`);

// Use the same installed player for each replay through the ordinary result path.
const firstSave = memory.get(PLAYERS_KEY);
const keptBefore = savedLedger(app.profile);
function reachReplayClose(tellMall = false) {
  assert(app.returnToYard());
  app.advance(8);
  assert(app.startNight2());
  const replay = chapter(app.seed, app.duel);
  replay.openGate();
  replay.say(NIGHT_2_CHOICES[3].words);
  replay.say(tellMall ? NIGHT_2_SCENES.refuse.choices[0].words : 'Say nothing');
  replay.advance('tower');
  replay.say('Stay on the tower and watch');
  replay.advance('close');
  return replay;
}
reachReplayClose();
assert.equal(app.chooseNight2Replay('replace'), false);
assert(app.leaveWorldJob());
assert.equal(app.duel.state.arena.result.night2Replay, undefined);
assert.equal(memory.get(PLAYERS_KEY), firstSave);

const firstReplay = reachReplayClose();
firstReplay.finish(4);
assert(firstReplay.duel.state.arena.result.night2Replay.differences.some(({key, kept, played}) =>
  key === 'embers' && kept === keptBefore.stocks.embers && played === 3));
assert.equal(memory.get(PLAYERS_KEY), firstSave);
assert.equal(savedLedger(new App().profile).stocks.embers, keptBefore.stocks.embers, 'reload before choice');
assert(app.chooseNight2Replay('keep'));
assert.equal(firstReplay.duel.state.arena.result.night2Page.embers, keptBefore.stocks.embers);
assert.equal(memory.get(PLAYERS_KEY), firstSave);

const secondReplay = reachReplayClose();
secondReplay.finish(4);
assert.equal(app.chooseNight2Replay('replace'), false, 'require confirmation');
assert(app.chooseNight2Replay('review'));
assert.equal(memory.get(PLAYERS_KEY), firstSave);
assert(app.chooseNight2Replay('cancel'));
assert.equal(memory.get(PLAYERS_KEY), firstSave);
assert(app.chooseNight2Replay('review'));
const setItem = localStorage.setItem;
localStorage.setItem = (key, value) => {
  if (key === PLAYERS_KEY) throw Error('Temporary write failure');
  setItem(key, value);
};
assert.equal(app.chooseNight2Replay('replace'), false);
assert.equal(memory.get(PLAYERS_KEY), firstSave);
assert.deepEqual(savedLedger(app.profile), keptBefore);
assert(secondReplay.duel.state.arena.result.night2Replay.confirming);
localStorage.setItem = setItem;
const registry = loadPlayers();
const invalid = JSON.parse(memory.get(PLAYERS_KEY));
invalid.players.find(player => player.id === app.player.id).profile.unlockedCars.push('bogus-car');
const invalidBytes = JSON.stringify(invalid);
memory.set(PLAYERS_KEY, invalidBytes);
assert.equal(app.chooseNight2Replay('replace'), false, 'invalid registry never gets normalized and overwritten');
assert.equal(memory.get(PLAYERS_KEY), invalidBytes);
const career = {...app.profile, credits: 412, wasteland: {...app.profile.wasteland, scrap: 37}};
assert(savePlayers(replacePlayerProfile(registry, app.player.id, career)));
assert(app.chooseNight2Replay('replace'), 'retry after storage failure');
assert.equal(secondReplay.duel.state.arena.result.night2Page.embers, 3);
assert.equal(secondReplay.duel.state.arena.result.night2Replay, undefined);
const refreshed = new App().profile;
assert.equal(savedLedger(refreshed).stocks.embers, 3);
assert(refreshed.unlockedCars.includes('falcone_vasca'), 'previously earned car stays owned while its switch is off');
assert.equal(refreshed.credits, 412);
assert.equal(refreshed.wasteland.scrap, 37);
const secondSave = memory.get(PLAYERS_KEY);
assert.equal(app.chooseNight2Replay('replace'), false);
assert.equal(memory.get(PLAYERS_KEY), secondSave);
console.log('PASS Night 2 replay: unfinished, reload, both choices, failed write and retry through the App.');

const ownerId = app.player.id;
const other = createPlayer(loadPlayers(), 'Second Night 2 player');
assert(other.ok);
const otherId = other.registry.activePlayerId;
assert(savePlayers(selectPlayer(other.registry, ownerId)));
const liveReplay = reachReplayClose(true);
liveReplay.finish(4);
assert(app.chooseNight2Replay('review'));
const beforeGain = loadPlayers();
const beforeGainBytes = memory.get(PLAYERS_KEY);
const rejectSave = (key, value) => {
  if (key === PLAYERS_KEY) throw Error('Temporary write failure');
  setItem(key, value);
};
localStorage.setItem = rejectSave;
app.profile = {...app.profile, credits: 427, wasteland: {...app.profile.wasteland, scrap: 53}};
assert.equal(app._saveProfile(), false);
assert.equal(app.profileSaved, false);
assert.equal(memory.get(PLAYERS_KEY), beforeGainBytes);
const liveBeforeConfirm = app.profile;

localStorage.setItem = setItem;
const concurrent = replacePlayerProfile(beforeGain, otherId, {...other.player.profile, credits: 553});
const durableOwner = concurrent.players.find(player => player.id === ownerId).profile;
assert(savePlayers(replacePlayerProfile(concurrent, ownerId, {...durableOwner, credits: 719})));
const conflictingBytes = memory.get(PLAYERS_KEY);
assert.equal(app.chooseNight2Replay('replace'), false, 'never overwrite a changed durable owner while live progress is pending');
assert.match(liveReplay.duel.state.arena.result.night2Replay.issue, /Try again/);
assert.equal(memory.get(PLAYERS_KEY), conflictingBytes);
assert.strictEqual(app.profile, liveBeforeConfirm);

assert(savePlayers(concurrent));
const verifiedBytes = memory.get(PLAYERS_KEY);
localStorage.setItem = rejectSave;
assert.equal(app.chooseNight2Replay('replace'), false);
assert.strictEqual(app.profile, liveBeforeConfirm);
assert.equal(memory.get(PLAYERS_KEY), verifiedBytes);
localStorage.setItem = setItem;
assert(app.chooseNight2Replay('replace'));
const afterConfirm = loadPlayers();
const ownerSaved = afterConfirm.players.find(player => player.id === ownerId).profile;
assert.equal(ownerSaved.credits, 427);
assert.equal(ownerSaved.wasteland.scrap, 53);
assert(savedLedger(ownerSaved).marks.includes('told-walkers-of-mall'));
assert.deepEqual(afterConfirm.players.find(player => player.id === otherId),
  concurrent.players.find(player => player.id === otherId));
console.log('PASS Night 2 replay preserves unsaved live gains and concurrent changes to a second player.');

// Both mounted HUDs read the real arena state. This small DOM adapter records
// their actual text and visibility without needing a browser or WebGL.
function inspectWashHud(duel, check) {
  function element() {
    const children = new Map(), attrs = new Map(), styles = new Map();
    return {dataset: {}, hidden: false, textContent: '', firstChild: {textContent: ''}, lastChild: {textContent: ''},
      style: {getPropertyValue: key => styles.get(key) ?? '', setProperty: (key, value) => styles.set(key, value)},
      classList: {toggle() {}}, append() {}, remove() {}, addEventListener() {},
      getBoundingClientRect: () => ({left: 0, top: 0, width: 1280, height: 720}),
      setAttribute: (key, value) => attrs.set(key, String(value)), getAttribute: key => attrs.get(key) ?? null,
      querySelector(key) {
        if (!children.has(key)) children.set(key, element());
        return children.get(key);
      }, querySelectorAll() { return []; }};
  }
  const previous = globalThis.document, created = [];
  globalThis.document = {createElement() {const node = element(); created.push(node); return node;}};
  const app = {duel, player: {name: 'QA'}}, ui = new Proxy({}, {get: (all, key) => all[key] ??= element()});
  const raceHud = createHudScreen({app, ui, text: (key, value) => {ui[key].textContent = String(value);},
    time: String, credits: String, clamp: value => Math.max(0, Math.min(1, value)), routeMap: {update() {}}});
  const combatHud = createCombatHud({root: element(), app});
  const refresh = () => {raceHud(duel.state); combatHud.update(duel.state);};
  try { check({refresh, ui, nodes: created}); }
  finally {
    combatHud.dispose();
    if (previous === undefined) delete globalThis.document;
    else globalThis.document = previous;
  }
}

// Use a fresh memory profile for each outcome so the existing replay policy
// can never mask an incorrect durable Wash result.
for (const result of ['win', 'wreck', 'surrounded', 'win-and-wreck']) {
  const won = result.startsWith('win'), surrounded = result === 'surrounded', towed = result.includes('wreck');
  const washApp = new App();
  washApp.audio.unlock = () => {};
  assert(washApp.addPlayer('Wash ' + result).ok);
  washApp.profile = {...washApp.profile, wasteland: {...washApp.profile.wasteland, discoveredGate: true}};
  assert(washApp._saveProfile());
  washApp.duel.featureFlags = {enabled: id => id === 'road-riders' || flags.enabled(id)};
  assert(washApp.visitWasteland());
  washApp.advance(8);
  assert(surrounded ? startWashSurroundReview(washApp) : washApp.startNight2());
  const run = chapter(washApp.seed, washApp.duel), {duel, world, view} = run, state = duel.state;
  assert.equal(state.opponents.length, 0, 'Reserved riders stay out of earlier chapter branches');
  const riderCount = surrounded ? 5 : 3;
  assert.equal(world.riderReserve.length, riderCount);
  run.openGate();
  run.say(NIGHT_2_CHOICES[3].words);
  run.say('Say nothing');
  run.advance('tower');
  const tower = world.job.steps[world.job.stepIndex];
  assert.deepEqual(tower.scene.choices.map(option => option.id), ['watch-clinker', 'drive-riders-off', 'carry-ember']);
  run.say('Drive out and run the riders off');
  assert.equal(run.stage(), 'wash-get-car');
  assert.equal(view.ledger.stocks.embers, 4);
  const parked = worldPose(duel, state);
  for (let frame = 0; frame < 850; frame++) {
    const route = view.routes[0];
    if (route) pointAt(duel, route.point, {forward: route.metres > 2.3, sprint: true});
    run.tick();
  }
  assert.equal(run.stage(), 'wash-get-car', 'Approaching the marker cannot board for the player');
  assert(Math.hypot(state.fighter.x - parked.x, state.fighter.z - parked.z) < 3);
  duel.setFighterInput({forward: false});
  duel.setInput({interact: true});
  for (let i = 0; i < 120 && run.stage() === 'wash-get-car'; i++) run.tick();
  assert.equal(run.stage(), 'wash-drive');
  assert(!state.onFoot && !world.riderFight);
  duel.setInput({interact: false});
  const park = ({x, z}, heading) => {
    const {s, lateral} = duel.course.nearest(x, z);
    Object.assign(state, {s, lateral, prevS: s, prevLateral: lateral, speedMph: 0,
      headingError: heading - duel.course.at(s).heading});
  };
  // Sample the edge of the arrival ring, and cross it on the drivetrain.
  if (surrounded) assert(placeWashSurroundReview(duel));
  else park({...sites.washApproach.position, x: sites.washApproach.position.x + sites.washApproach.radius + 3}, -Math.PI / 2);
  duel.setInput({throttle: 1});
  for (let i = 0; i < 210 && run.stage() === 'wash-drive'; i++) run.tick();
  assert.equal(run.stage(), 'wash-fight');
  assert(!state.onFoot);
  assert.equal(world.riderFight.riders.length, riderCount);
  assert(state.opponents.every(actor => actor.roadRider?.weapon === 'ash-sack'));
  assert.equal(world.actors.filter(actor => actor.id.startsWith('wash-rider-')).length, 0, 'The fight replaces the three distant silhouettes');
  if (!surrounded) assert(findScene(run, 'Wash rider 1 lights').visible, 'The real arena cars have the lights seen from the tower');
  checkCampSmoke(run);
  const at = worldPose(duel, state);
  assert(Math.hypot(at.x - sites.washApproach.position.x, at.z - sites.washApproach.position.z) < sites.washApproach.radius);
  let wreckAt;
  const finishFight = (afterOutcome = () => {}) => {
    if (surrounded) {
      for (let i = 0; i < 3900 && !world.riderFight.outcome; i++) run.tick();
      assert.equal(world.riderFight.outcome, 'surrounded');
      assert(world.riderFight.heldSec >= RIDER_RULE.boxSeconds && !state.combatWrecking);
      console.log(`QA roadblock reports intact surround at ${world.riderFight.elapsed.toFixed(2)} s.`);
    }
    duel.setInput({throttle: 0, brake: 1});
    const wreckPlayer = () => {
      wreckAt = worldPose(duel, state);
      state.armor = 1;
      assert(applyArmorDamage(duel, state, 'crossbow', {owner: state.opponents[0].arenaId}));
      assert(state.combatWrecking);
    };
    if (won) {
      for (const rider of state.opponents) {
        rider.armor = 2;
        assert(applyArmorDamage(duel, rider, 'crossbow', {owner: 'player', amount: 1}));
      }
      if (towed) {
        const fight = world.riderFight;
        const step = 1 / 120;
        for (let i = 0; i < 400 && (!fight.outcome || fight.elapsed + step - fight.endedAt < RIDER_RULE.aftermathSec); i++)
          duel.step(step);
        assert.equal(fight.outcome, 'won');
        assert.equal(run.stage(), 'wash-fight', 'Deliver the final hit in the same tick as the story settles the win');
        wreckPlayer();
        duel.step(step);
        assert.equal(run.stage(), 'wash-fight-won');
      }
    } else if (towed) wreckPlayer();
    for (let i = 0; i < 300 && !world.riderFight.outcome; i++) run.tick();
    assert(world.riderFight.outcome);
    afterOutcome();
    for (let i = 0; i < 300 && run.stage() === 'wash-fight'; i++) run.tick();
  };
  if (result === 'wreck') inspectWashHud(duel, ({refresh, ui, nodes}) => {
    refresh();
    const riders = nodes.filter(node => node.className === 'combat-opponent-marker');
    assert(riders.length === 3 && riders.every(node => node.querySelector('.combat-marker-heading').textContent.includes('HUNTING YOU')));
    finishFight(() => {
      assert.equal(run.stage(), 'wash-fight', 'The combat HUD updates during the aftermath');
      refresh();
      assert(riders.every(node => node.hidden), 'Resolved Wash riders lose their floating labels');
    });
    refresh();
    assert(nodes[0].querySelector('.combat-foot-car').hidden, 'The towed-car arrow disappears');
    assert(!ui['callout-text'].textContent.includes('Wrecked. Open ground'));
    assert(ui['race-callout'].hidden, 'The wreck leaves the story objective as the only notice');
  });
  else finishFight();
  assert.equal(world.riderFight.outcome, won ? 'won' : surrounded ? 'surrounded' : 'lost');
  assert.equal(state.arena.result, null, 'The fight hands back to the chapter');
  if (won) {
    assert.equal(run.stage(), 'wash-fight-won');
    run.tick();
    assert.equal(run.screen().line.words, NIGHT_2_SCENES['wash-fight-won'].lines[0].words);
    assert.equal(view.ledger.words.walkers, 'Strangers');
    assert.equal(view.ledger.feud, 'Raiding');
    run.advance(towed ? 'wash-walk-to-cut' : 'wash-drive-home');
  }
  assert.equal(view.washCarUnavailable, towed);
  if (!towed) {
    assert.equal(run.stage(), 'wash-drive-home');
    assert(!state.onFoot && !state.combatWrecking, 'An intact car drives home even after a surround');
    park({...sites.carHome.position, x: sites.carHome.position.x - sites.carHome.radius - 3}, Math.PI / 2);
    duel.setInput({throttle: 1, brake: 0});
    for (let i = 0; i < 210 && run.stage() === 'wash-drive-home'; i++) run.tick();
  } else {
    assert.equal(run.stage(), 'wash-walk-to-cut');
    assert(state.onFoot && state.combatWrecking);
    assert.match(worldHudModel({worldJob: world}).line, /towed in at dawn/);
    assert(Math.hypot(state.fighter.x - wreckAt.x, state.fighter.z - wreckAt.z) < 12, 'The fighter comes out near the wreck');
    duel.setInput({interact: true});
    run.tick(120);
    assert(state.onFoot && state.combatWrecking, 'Holding F and waiting cannot recover the wreck tonight');
    duel.setInput({interact: false});
    for (const name of ['wash-walk-to-cut', 'wash-walk-to-gap', 'wash-walk-home']) {
      assert.equal(run.stage(), name);
      followRoute(run, name, 4800, true);
      assert.notEqual(run.stage(), name, 'The walker can follow the way back from the wreck');
    }
  }
  assert.equal(run.stage(), 'close');
  run.finish(4);
  const kept = savedLedger(washApp.profile);
  assert.equal(kept.stocks.embers, 3);
  assert.equal(kept.marks.includes('wash-car-towed-at-dawn'), towed);
  assert.equal(kept.history.some(change => change.choiceId === 'wash-fight-won'), won);
  assert.equal(kept.words.walkers, won ? 'Strangers' : 'Cold');
  assert.equal(kept.feud, won ? 'Hunting' : 'Raiding');
  assert.equal(view.page.memories.some(line => line.includes('Bess leaves late')), towed);
  assert(washApp.returnToYard());
  washApp.dispose();
  console.log('PASS Wash outcome ' + result);
}
nightScene.dispose();
console.log('PASS Night 2 Wash: real boarding and approach, three actual rider cars, victory and wreck, distinct returns and saved ledgers.');
