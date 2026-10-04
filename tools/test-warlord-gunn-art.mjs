import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync, existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {Duel} from '../src/game.js';
import {createFeatureFlags} from '../src/feature-flags.js';
import {startWarlordEvent, beginWarlordEvent} from '../src/arena/warlord-event.js';
import {thinkBrain} from '../src/arena/arena-brains.js';
import {stepCombat} from '../src/combat.js';
import {worldPose} from '../src/arena/arena-floor.js';
import {sweepObstacle} from '../src/collision.js';
import {createVehicleAttachmentRegistry} from '../src/vehicle-attachments.js';
import {createArmorKitMeshes} from '../src/armor-kit-meshes.js';

// These pins are the approved nine kits, before the isolated Gunn recipe.
const OLD_KITS = {
  falcone_f42: '4af3739c82062697012e4708bacbc2d6409c2c17873f9e645c4554a94404705e',
  stuttgart_959s: 'e224c1dda1f720cdf022ce9ee50f636eeaef49af26a43e88b821da45dca3ddcf',
  falcone_heritage: '32b7f792d85ab2cbcd1d21d3a5b058ddfef13eeb37d8bb1a6b8a3b71739cdbde',
  aurora_gt: '886106e2bd67489db8fb6f490e38c9a2c38a2336adadfe3c9696181567895a8d',
  dusthawk_rally: '42fe917574a3fdcd902dd5f509fe929ac8da0c5542420608dccd98c2a601f151',
  banshee_muscle: '327fc9b841ca99387a3dbf2d6a66ffcebc6e47da80066ca918bc90f11fc129d3',
  viper_proto: '4c500d2d11902933cbf98b2f5bdfb6195ff8a3c546a8c7e7e9705390652eef18',
  titan_monster: '5257273ed5929853f379bdf1da2ff385cbc5d7af03ab36bf5048dc63eda21433',
  koenigsegg_jesko: '9562bcf5b44e82be3c82ef07845ad12fe49666adc3d591abe3d2f3e184ff3ff7',
};
const assetURL = new URL('../public/assets/models/wasteland/kits/gunn-turret.glb', import.meta.url);
const DT = 1 / 120, EPS = 1e-5;
let checks = 0;
const ok = (value, message) => {checks++; assert.ok(value, message);};
const equal = (value, expected, message) => {checks++; assert.deepEqual(value, expected, message);};
test.after(() => console.log(`Gunn turret art: ${checks} checks executed.`));

function readGLB(url = assetURL) {
  ok(existsSync(url), 'the finished Gunn turret GLB must exist, not only the plain kit mount');
  const bytes = readFileSync(url);
  equal(bytes.readUInt32LE(0), 0x46546c67, 'the local turret is a real GLB');
  equal(bytes.readUInt32LE(4), 2, 'the asset uses GLB version two');
  equal(bytes.readUInt32LE(8), bytes.length, 'the asset has a complete binary payload');
  equal(bytes.readUInt32LE(16), 0x4e4f534a, 'the GLB begins with its JSON chunk');
  const length = bytes.readUInt32LE(12);
  return {bytes, json: JSON.parse(bytes.toString('utf8', 20, 20 + length)), length};
}
async function loadGeometry(url = assetURL) {
  const {bytes, json, length} = readGLB(url);
  // Existing fit tests remove textures only in memory for headless GLTF parsing.
  const strip = value => {
    if (!value || typeof value !== 'object') return;
    for (const key of Object.keys(value)) if (/Texture$/.test(key)) delete value[key]; else strip(value[key]);
  };
  strip(json.materials); delete json.images; delete json.textures; delete json.samplers;
  const encoded = Buffer.from(JSON.stringify(json)), padded = Math.ceil(encoded.length / 4) * 4;
  const binary = bytes.subarray(20 + length), result = Buffer.alloc(20 + padded + binary.length, 0x20);
  result.writeUInt32LE(0x46546c67, 0); result.writeUInt32LE(2, 4); result.writeUInt32LE(result.length, 8);
  result.writeUInt32LE(padded, 12); result.writeUInt32LE(0x4e4f534a, 16);
  encoded.copy(result, 20); binary.copy(result, 20 + padded);
  return (await new GLTFLoader().parseAsync(result.buffer.slice(result.byteOffset,
    result.byteOffset + result.byteLength), '')).scene;
}

test('the isolated Gunn build preserves every approved fitted kit byte', () => {
  for (const [car, hash] of Object.entries(OLD_KITS)) {
    const bytes = readFileSync(new URL(`../public/assets/models/wasteland/kits/${car}.glb`, import.meta.url));
    equal(createHash('sha256').update(bytes).digest('hex'), hash, `${car}: the approved kit cannot be regenerated`);
  }
});

test('the real turret has separate named pivots, heat panel and four head-owned mouths', () => {
  const {json} = readGLB();
  const names = ['gunn-turret-root', 'gunn-turret-base', 'gunn-turret-head', 'gunn-turret-heat-panel',
    ...Array.from({length: 4}, (_, n) => `gunn-turret-mouth-${n}`)];
  for (const name of names) equal(json.nodes.filter(node => node.name === name).length, 1, `one stable ${name}`);
  const index = name => json.nodes.findIndex(node => node.name === name);
  const owns = (parent, child) => (json.nodes[parent].children || []).some(n => n === child || owns(n, child));
  const root = index(names[0]), base = index(names[1]), head = index(names[2]);
  ok(owns(root, base) && owns(root, head), 'the root owns distinct fixed base and turning head');
  ok(!owns(head, base), 'turning the head cannot rotate the fitted base');
  ok(owns(head, index('gunn-turret-heat-panel')), 'the rear heat panel follows the head');
  for (let n = 0; n < 4; n++) {
    const mouth = index(`gunn-turret-mouth-${n}`);
    ok(owns(head, mouth), 'every real launch mouth follows head rotation');
    equal(json.nodes[mouth].mesh, undefined, 'a muzzle marker is a transform, not a painted closed cap');
  }
});

test('the turret stays inside the kit geometry budget and uses only local resources', () => {
  const {bytes, json} = readGLB();
  let triangles = 0;
  for (const mesh of json.meshes || []) for (const part of mesh.primitives || []) {
    equal(part.mode ?? 4, 4, 'turret surfaces use real triangles');
    ok(Number.isInteger(part.attributes?.POSITION), 'each visible primitive has positions');
    ok(Number.isInteger(part.material), 'each surface has its authored finish');
    const count = json.accessors[part.indices ?? part.attributes.POSITION].count;
    triangles += count / 3;
  }
  ok(triangles > 0 && triangles <= 12000, `the current kit triangle ceiling is 12000, got ${triangles}`);
  for (const car of Object.keys(OLD_KITS)) {
    const old = readGLB(new URL(`../public/assets/models/wasteland/kits/${car}.glb`, import.meta.url)).json;
    const fittedTriangles = old.meshes.flatMap(mesh => mesh.primitives).reduce((sum, part) =>
      sum + old.accessors[part.indices ?? part.attributes.POSITION].count / 3, 0);
    ok(fittedTriangles + triangles <= 12000, `${car}: fitted kit plus shared turret keeps the existing 12000 ceiling`);
  }
  for (const resource of [...(json.images || []), ...(json.buffers || [])])
    ok(!resource.uri || !/^(?:https?:|data:|\/)/i.test(resource.uri), 'the model adds no remote runtime resource');
  const targets = JSON.parse(readFileSync(new URL('./size-targets.json', import.meta.url), 'utf8'));
  console.log(`Gunn turret bytes: ${bytes.length}; tracked-file target: ${targets.ordinaryTrackedFileBytes}; triangles: ${triangles}.`);
});

test('four real mouth transforms form a two-by-two open tube front, not capped cylinders', async () => {
  const scene = await loadGeometry(), head = scene.getObjectByName('gunn-turret-head');
  ok(head, 'the loaded geometry contains the actual turning head'); scene.updateMatrixWorld(true);
  const mouths = Array.from({length: 4}, (_, n) => scene.getObjectByName(`gunn-turret-mouth-${n}`));
  ok(mouths.every(Boolean), 'all four launch transforms load');
  const local = mouths.map(mouth => head.worldToLocal(mouth.getWorldPosition(new THREE.Vector3())));
  const unique = axis => new Set(local.map(at => Math.round(at[axis] / EPS))).size;
  equal(unique('x'), 2, 'the tubes have two columns'); equal(unique('y'), 2, 'the tubes have two rows');
  equal(unique('z'), 1, 'the four markers lie on the actual common front plane');
  const surfaces = [];
  head.traverse(node => {
    if (node.isMesh) {surfaces.push(node); for (const material of [].concat(node.material)) material.side = THREE.DoubleSide;}
  });
  ok(surfaces.length > 0, 'the head contains authored tube geometry');
  for (const mouth of mouths) {
    const centre = mouth.getWorldPosition(new THREE.Vector3());
    const span = Math.min(...mouths.filter(other => other !== mouth)
      .map(other => centre.distanceTo(other.getWorldPosition(new THREE.Vector3()))));
    ok(span > EPS, 'tube mouths occupy separate physical positions');
    const forward = new THREE.Vector3(0, 0, 1).transformDirection(mouth.matrixWorld);
    const right = new THREE.Vector3(1, 0, 0).transformDirection(mouth.matrixWorld);
    const up = new THREE.Vector3(0, 1, 0).transformDirection(mouth.matrixWorld);
    const cast = offset => new THREE.Raycaster(centre.clone().addScaledVector(forward, span).add(offset),
      forward.clone().negate(), 0, span * 4).intersectObjects(surfaces, false)[0];
    const centreHit = cast(new THREE.Vector3());
    const rimHits = [];
    for (const fraction of [.05, .1, .15, .2, .25, .3, .35, .4, .45])
      for (const direction of [right, up, right.clone().negate(), up.clone().negate()]) {
        const hit = cast(direction.clone().multiplyScalar(span * fraction)); if (hit) rimHits.push(hit);
      }
    const rim = rimHits.sort((a, b) => a.distance - b.distance)[0];
    ok(rim, `${mouth.name}: real metal surrounds the mouth`);
    ok(!centreHit || centreHit.distance > rim.distance + EPS,
      `${mouth.name}: the central launch ray enters a hollow tube, not a front cap`);
    ok(Math.abs(rim.point.clone().sub(centre).dot(forward)) < EPS,
      `${mouth.name}: the launch marker sits on the real open front surface`);
  }
});

function nativeGunn() {
  const duel = new Duel({seed: 304, featureFlags: createFeatureFlags({storage: null, qa: true,
    overrides: {gunn: true}})});
  duel.state.wastelandGateDiscovered = true;
  equal(startWarlordEvent(duel, {warlordId: 'gunn', car: 'falcone_f42', cpuDifficulty: 'hard',
    combatArmorKit: 'turret-look'}), true,
    'the test starts the actual Gunn fight');
  equal(beginWarlordEvent(duel), true, 'the native intro advances to countdown');
  duel.state.countdown = 0; duel.step(DT); duel.step(DT);
  const boss = duel.state.opponents[0], participant = duel.state.arena.participants.find(p => p.id === boss.arenaId);
  for (const p of duel.state.arena.participants) p.protectedSec = 0;
  duel.state.invulnerableSec = 0; duel.state.combat.aiTimer = Infinity;
  duel.state.combat.shield = duel.state.combat.rivalShield = 0; boss.combatShield = 0;
  for (const actor of [duel.state, boss]) {
    actor.s = actor.prevS = 100; actor.speedMph = 0; actor.headingError = 0;
  }
  duel.state.lateral = duel.state.prevLateral = -27.5;
  boss.lateral = boss.prevLateral = 2.5;
  participant.targetId = 'player';
  return {duel, boss, participant};
}

const tick = () => new Promise(resolve => setImmediate(resolve));
function vehicleFor(duel, actor) {
  const car = new THREE.Group(), spec = duel._vehicleSpec(actor), at = duel.course.groundAt(actor.s, actor.lateral);
  car.userData.vehicleKey = actor.car;
  car.userData.size = {width: spec.halfWidth * 2, length: spec.halfLength * 2, height: spec.height};
  car.position.set(at.x, at.y + (actor.airHeight || 0), at.z);
  car.rotation.y = at.heading + (actor.headingError || 0);
  return car;
}
async function presentation(f) {
  const cachedTurret = await loadGeometry(), assets = new Map(), requests = [];
  const registry = createVehicleAttachmentRegistry();
  const kits = createArmorKitMeshes(registry, {loadKitAsset: async key => {
    requests.push(key);
    if (key === 'gunn-turret') return {scene: cachedTurret};
    if (!assets.has(key)) assets.set(key, await loadGeometry(new URL(
      `../public/assets/models/wasteland/kits/${key}.glb`, import.meta.url)));
    return {scene: assets.get(key)};
  }});
  const vehicles = {player: vehicleFor(f.duel, f.duel.state), rival: vehicleFor(f.duel, f.boss), extraOpponents: []};
  kits.update(f.duel, vehicles, true); await tick(); await tick();
  kits.update(f.duel, vehicles, true); await tick(); await tick();
  kits.update(f.duel, vehicles, true);
  return {kits, registry, vehicles, cachedTurret, requests};
}

test('actual fitted Gunn and earned-look clones share geometry, isolate heat and never change race state', async () => {
  const f = nativeGunn(), before = structuredClone(f.duel.state), p = await presentation(f);
  try {
    equal(f.duel.state, before, 'native kit loading and binding cannot alter race state');
    equal(p.requests.filter(key => key === 'gunn-turret').length, 1, 'both actors reuse one real turret asset request');
    const roots = [p.vehicles.player, p.vehicles.rival].map(car => car.getObjectByName('gunn-turret-root'));
    ok(roots.every(Boolean), 'Gunn and the earned look both mount the finished model');
    for (const root of roots) for (let node = root; node; node = node.parent)
      equal(node.visible, true, 'the mounted model is actually visible through its attachment ancestors');
    for (const car of [p.vehicles.player, p.vehicles.rival]) {
      car.updateMatrixWorld(true);
      const mount = car.getObjectByName('kit-turret-mount'), base = car.getObjectByName('gunn-turret-base');
      ok(mount && base, 'the actual approved kit mount carries the authored base');
      const mountBox = new THREE.Box3().setFromObject(mount, true), baseBox = new THREE.Box3().setFromObject(base, true);
      const centre = baseBox.getCenter(new THREE.Vector3());
      ok(baseBox.min.y <= mountBox.max.y + EPS && baseBox.max.y >= mountBox.max.y - EPS,
        'the base contacts the actual mount top rather than floating or sinking below it');
      ok(centre.x >= mountBox.min.x - EPS && centre.x <= mountBox.max.x + EPS &&
        centre.z >= mountBox.min.z - EPS && centre.z <= mountBox.max.z + EPS,
      'the base is centred over the actual mount footprint');
    }
    const meshFor = root => {
      let mesh; root.getObjectByName('gunn-turret-heat-panel').traverse(node => {if (!mesh && node.isMesh) mesh = node;});
      ok(mesh, 'the real heat panel has an authored surface'); return mesh;
    };
    const playerPanel = meshFor(roots[0]), bossPanel = meshFor(roots[1]), sourcePanel = meshFor(p.cachedTurret);
    equal(playerPanel.geometry, bossPanel.geometry, 'actor clones reuse the real heat geometry');
    ok(playerPanel.material !== bossPanel.material && bossPanel.material !== sourcePanel.material,
      'live heat materials cannot tint a peer or the cached asset');
    const cold = playerPanel.material.emissive.clone(), sourceCold = sourcePanel.material.emissive.clone();
    f.boss.gunnBarrage.stage = 'window'; f.boss.gunnBarrage.untilSec = f.duel.state.stageTimeSec + 3;
    const hotState = structuredClone(f.duel.state);
    p.kits.update(f.duel, p.vehicles, true);
    equal(f.duel.state, hotState, 'overheat presentation cannot write simulation state');
    ok(bossPanel.material.emissive.r > cold.r && bossPanel.material.emissive.r > bossPanel.material.emissive.g &&
      bossPanel.material.emissive.r > bossPanel.material.emissive.b, 'only Gunn actual overheat turns his panel red');
    ok(playerPanel.material.emissive.equals(cold), 'the cosmetic peer stays cold');
    ok(sourcePanel.material.emissive.equals(sourceCold), 'the reusable source finish stays unchanged');
    const disposed = {geometry: 0, sourceMaterial: 0, playerMaterial: 0, bossMaterial: 0};
    for (const [key, resource] of Object.entries({geometry: sourcePanel.geometry, sourceMaterial: sourcePanel.material,
      playerMaterial: playerPanel.material, bossMaterial: bossPanel.material}))
      resource.addEventListener('dispose', () => disposed[key]++);
    p.kits.dispose(); p.kits.dispose(); await tick(); await tick();
    equal(disposed, {geometry: 1, sourceMaterial: 1, playerMaterial: 1, bossMaterial: 1},
      'shared geometry and each owned finish release exactly once');
    equal(p.registry.size, 0, 'disposing the native attachment owner leaves no bindings');
    for (const car of [p.vehicles.player, p.vehicles.rival])
      equal(car.getObjectByName('gunn-turret-root'), undefined, 'disposed turret clones leave their cars');
  } finally {p.kits.dispose();}
});

test('a native Gunn barrage launches at a real fitted tube mouth and retains its tell-end lock', async () => {
  const f = nativeGunn(), p = await presentation(f), shots = [];
  const stop = f.duel.onChange((_state, event) => {
    if (event.arsenalCue !== 'weapon.rockets.fire' || event.actor !== f.boss) return;
    const before = structuredClone(f.duel.state);
    p.kits.update(f.duel, p.vehicles, true);
    equal(f.duel.state, before, 'reading the launch transforms cannot alter the real shot');
    p.vehicles.rival.updateMatrixWorld(true);
    const mouths = Array.from({length: 4}, (_, n) => p.vehicles.rival.getObjectByName(`gunn-turret-mouth-${n}`));
    ok(mouths.every(Boolean), 'native launches have the four actual fitted mouth transforms');
    const origin = new THREE.Vector3(event.projectile.x, event.projectile.y, event.projectile.z);
    shots.push({origin, mouths: mouths.map(mouth => mouth.getWorldPosition(new THREE.Vector3())),
      lock: structuredClone(f.boss.gunnBarrage.aim)});
  });
  try {
    for (let n = 0; n < Math.round(5.6 / DT); n++) {
      f.duel.state.stageTimeSec += DT; thinkBrain(f.duel, f.participant, f.boss, DT); stepCombat(f.duel, DT);
    }
    ok(shots.length > 0, 'the real cooldown and full tell produce a rocket from the fitted turret');
    ok(shots[0].mouths.some(mouth => mouth.distanceTo(shots[0].origin) < EPS),
      'the actual native launch starts at a tube mouth, not the car-centre spawn offset');
    const lock = shots[0].lock;
    f.duel.state.lateral = f.duel.state.prevLateral = -26.5;
    for (let n = 0; n < Math.round(.6 / DT); n++) {
      f.duel.state.stageTimeSec += DT; thinkBrain(f.duel, f.participant, f.boss, DT); stepCombat(f.duel, DT);
    }
    equal(shots.length, 3, 'the native phase-one barrage still fires three rockets');
    for (const shot of shots) equal(shot.lock, lock, 'moving after the tell cannot move the committed arrival aim');
  } finally {stop(); p.kits.dispose();}
});

test('real Gunn barrage flight aims down to a lower car and delivers native Rocket Pods damage', () => {
  const {duel, boss, participant} = nativeGunn();
  boss.airHeight = boss.prevAirHeight = 2;
  const from = {...worldPose(duel, boss), y: duel.course.groundAt(boss.s, boss.lateral).y + 3};
  const to = {...worldPose(duel, duel.state), y: duel.course.groundAt(duel.state.s, duel.state.lateral).y + 1};
  equal(duel._obstacles(0, 200).filter(obstacle => sweepObstacle(from, to, obstacle, 0,
    {halfWidth: 0, halfLength: 0, height: 0})).map(obstacle => obstacle.id), [],
  'the actual Pit leaves the elevated launch-to-lower-car line clear');
  const launches = [], hits = [];
  duel.onChange((_state, event) => {
    if (event.arsenalCue === 'weapon.rockets.fire' && event.actor === boss) launches.push({...event.projectile});
    if (event.combatHit && event.enemy && event.victim === 'player') hits.push(event);
  });
  const armor = duel.state.armor;
  for (let n = 0; n < Math.round(5.6 / DT); n++) {
    duel.state.stageTimeSec += DT; thinkBrain(duel, participant, boss, DT); stepCombat(duel, DT);
  }
  ok(launches.length > 0, 'the real cooldown and full tell produce a native barrage');
  ok(launches[0].vy < 0, 'an elevated real Gunn rocket must aim down rather than fly horizontally above the lower car');
  for (let n = 0; n < Math.round(1.5 / DT); n++) {
    duel.state.stageTimeSec += DT; thinkBrain(duel, participant, boss, DT); stepCombat(duel, DT);
  }
  ok(hits.length > 0 && duel.state.armor < armor, 'native swept rocket flight actually damages the lower car');
  equal(hits[0].strength * 60, 10, 'the vertical shot keeps Rocket Pods ten-armor damage');
});
