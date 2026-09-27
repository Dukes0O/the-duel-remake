import assert from 'node:assert/strict';
import test from 'node:test';
import {createHash} from 'node:crypto';
import {existsSync, readFileSync, readdirSync, statSync} from 'node:fs';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import * as THREE from 'three';
import {createVehicleAttachmentRegistry} from '../src/vehicle-attachments.js';
import {createArmorKitMeshes} from '../src/armor-kit-meshes.js';
import {EngineAudio} from '../src/audio.js';
import {SOUND_BANK} from '../src/sound-bank.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const tick = () => new Promise(resolve => setImmediate(resolve));
let checks = 0;
const check = (value, message) => { checks++; assert.ok(value, message); };
const equal = (actual, expected, message) => { checks++; assert.equal(actual, expected, message); };
const same = (actual, expected, message) => { checks++; assert.deepEqual(actual, expected, message); };
test.after(() => console.log(`Sawtooth Sal art: ${checks} acceptance checks executed.`));

const unchangedKitHashes = Object.freeze({
  'aurora_gt.glb': '886106e2bd67489db8fb6f490e38c9a2c38a2336adadfe3c9696181567895a8d',
  'dusthawk_rally.glb': '42fe917574a3fdcd902dd5f509fe929ac8da0c5542420608dccd98c2a601f151',
  'falcone_f42.glb': '4af3739c82062697012e4708bacbc2d6409c2c17873f9e645c4554a94404705e',
  'falcone_heritage.glb': '32b7f792d85ab2cbcd1d21d3a5b058ddfef13eeb37d8bb1a6b8a3b71739cdbde',
  'koenigsegg_jesko.glb': '9562bcf5b44e82be3c82ef07845ad12fe49666adc3d591abe3d2f3e184ff3ff7',
  'stuttgart_959s.glb': 'e224c1dda1f720cdf022ce9ee50f636eeaef49af26a43e88b821da45dca3ddcf',
  'titan_monster.glb': '5257273ed5929853f379bdf1da2ff385cbc5d7af03ab36bf5048dc63eda21433',
  'viper_proto.glb': '4c500d2d11902933cbf98b2f5bdfb6195ff8a3c546a8c7e7e9705390652eef18',
});

function glbJson(bytes) {
  equal(bytes.readUInt32LE(0), 0x46546c67, 'Sal kit must remain a GLB');
  equal(bytes.readUInt32LE(4), 2, 'Sal kit must use GLB version 2');
  equal(bytes.readUInt32LE(8), bytes.length, 'Sal kit GLB must be complete');
  const length = bytes.readUInt32LE(12);
  equal(bytes.readUInt32LE(16), 0x4e4f534a, 'Sal kit GLB must start with JSON');
  return JSON.parse(bytes.subarray(20, 20 + length).toString('utf8'));
}

test('only the Banshee kit changes, with a named Sal root and left/right blades', async () => {
  const kitDir = join(root, 'public/assets/models/wasteland/kits');
  for (const [name, expected] of Object.entries(unchangedKitHashes)) {
    const bytes = await readFile(join(kitDir, name));
    equal(createHash('sha256').update(bytes).digest('hex'), expected,
      `${name} must stay byte-for-byte unchanged`);
  }
  const banshee = glbJson(await readFile(join(kitDir, 'banshee_muscle.glb')));
  const names = new Set((banshee.nodes || []).map(node => node.name));
  for (const name of ['kit-sal-saws', 'kit-sal-saw-left', 'kit-sal-saw-right'])
    check(names.has(name), `Banshee kit is missing ${name}`);
  const rootIndex = banshee.nodes.findIndex(node => node.name === 'kit-sal-saws');
  const descendants = new Set(banshee.nodes[rootIndex]?.children || []);
  for (const name of ['kit-sal-saw-left', 'kit-sal-saw-right']) {
    const index = banshee.nodes.findIndex(node => node.name === name);
    check(descendants.has(index), `${name} must be a direct child of kit-sal-saws`);
    const node = banshee.nodes[index];
    check(Number.isInteger(node?.mesh), `${name} must carry visible blade geometry`);
    check((banshee.meshes?.[node?.mesh]?.primitives?.length || 0) > 0,
      `${name} must have at least one visible primitive`);
  }
});

function authoredSalScene(disposals = null) {
  const scene = new THREE.Group();
  scene.name = 'authored-kit';
  const add = (parent, name) => { const node = new THREE.Group(); node.name = name; parent.add(node); return node; };
  const scrapper = add(scene, 'kit-scrapper');
  for (const name of ['kit-bull-bar', 'kit-stack-0', 'kit-stack-1',
    'kit-plate-0', 'kit-plate-1', 'kit-plate-2', 'kit-plate-3']) add(scrapper, name);
  const raider = add(scene, 'kit-raider');
  for (const name of ['kit-cage', 'kit-saw-0', 'kit-saw-1', 'kit-turret-mount']) add(raider, name);
  const warlord = add(scene, 'kit-warlord');
  for (const name of ['kit-crown', 'kit-full-plating', 'kit-warlord-mount']) add(warlord, name);
  const sal = add(scene, 'kit-sal-saws');
  const left = add(sal, 'kit-sal-saw-left');
  const right = add(sal, 'kit-sal-saw-right');
  const sparks = add(sal, 'kit-sal-sparks');
  if (disposals) {
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshStandardMaterial();
    const disposeGeometry = geometry.dispose.bind(geometry);
    const disposeMaterial = material.dispose.bind(material);
    geometry.dispose = () => { disposals.geometry++; disposeGeometry(); };
    material.dispose = () => { disposals.material++; disposeMaterial(); };
    left.add(new THREE.Mesh(geometry, material));
  }
  return {scene, left, right, sparks};
}

function vehicle(key = 'banshee_muscle') {
  const mesh = new THREE.Group();
  mesh.userData.vehicleKey = key;
  mesh.userData.size = {width: 2.6, length: 4.8, height: 1.55};
  return mesh;
}

async function salRig({car = 'banshee_muscle', warlordId = 'sal'} = {}) {
  const registry = createVehicleAttachmentRegistry();
  const asset = authoredSalScene();
  const kits = createArmorKitMeshes(registry, {loadKitAsset: async () => ({scene: asset.scene})});
  const player = vehicle(car);
  const state = {
    s: 100, lateral: 0, armor: 100, maxArmor: 100, combatArmorKit: 'warlord',
    mode: 'wasteland', status: 'racing', stageTimeSec: 5, combat: {},
    warlordId, salSaw: {phase: 'idle', sinceSec: 5}, opponents: [],
  };
  const duel = {state, course: {groundAt: () => ({x: 0, y: 0, z: 0})},
    featureFlags: {enabled: key => key === 'wasteland2'}};
  const vehicles = {player, rival: null, extraOpponents: []};
  kits.update(duel, vehicles, true);
  await tick(); await tick();
  kits.update(duel, vehicles, true);
  return {registry, kits, state, duel, vehicles, player};
}

const rotation = node => [node.rotation.x, node.rotation.y, node.rotation.z];

test('Sal saw states are renderer-only, stage-time driven and deterministic', async () => {
  const fixture = await salRig();
  const {kits, registry, state, duel, vehicles, player} = fixture;
  try {
    const sal = player.getObjectByName('kit-sal-saws');
    const left = player.getObjectByName('kit-sal-saw-left');
    const right = player.getObjectByName('kit-sal-saw-right');
    const sparks = player.getObjectByName('kit-sal-sparks');
    check(sal && left && right && sparks, 'the loaded Banshee must expose the complete Sal saw rig');

    let before = structuredClone(state);
    kits.update(duel, vehicles, true);
    same(state, before, 'idle rendering must not mutate race state');
    const idle = [rotation(left), rotation(right)];
    equal(sparks.visible, false, 'idle saws must not show sparks');
    state.stageTimeSec = 5.6;
    before = structuredClone(state);
    kits.update(duel, vehicles, true);
    same(state, before, 'later idle rendering must not mutate race state');
    same([rotation(left), rotation(right)], idle, 'idle blades must stay still as stage time advances');

    state.salSaw = {phase: 'spin-up', sinceSec: 5};
    state.stageTimeSec = 5.6;
    before = structuredClone(state);
    kits.update(duel, vehicles, true);
    same(state, before, 'spin-up rendering must not mutate race state');
    const spun = [rotation(left), rotation(right)];
    check(JSON.stringify(spun) !== JSON.stringify(idle), 'spin-up must rotate both blades from idle');
    equal(sparks.visible, false, 'spin-up must not show the missed-window sparks');
    state.stageTimeSec = 5.2;
    kits.update(duel, vehicles, true);
    state.stageTimeSec = 5.6;
    kits.update(duel, vehicles, true);
    same([rotation(left), rotation(right)], spun,
      'the same phase and stage time must reproduce the same blade pose');

    state.salSaw = {phase: 'sparking', sinceSec: 5};
    state.stageTimeSec = 5.8;
    before = structuredClone(state);
    kits.update(duel, vehicles, true);
    same(state, before, 'sparking rendering must not mutate race state');
    equal(sparks.visible, true, 'sparking state must expose the authored spark node');
  } finally {
    kits.dispose();
  }
  equal(registry.size, 0, 'disposing the Sal renderer must release every vehicle attachment');
});

test('the Sal saw rig is limited to Sawtooth Sal in the Banshee', async () => {
  for (const options of [
    {car: 'falcone_f42', warlordId: 'sal'},
    {car: 'banshee_muscle', warlordId: 'dustmonger'},
  ]) {
    const {kits, player} = await salRig(options);
    try {
      equal(player.getObjectByName('kit-sal-saws')?.visible, false,
        `${options.warlordId} in ${options.car} must not show Sal's Banshee-only saw rig`);
    } finally { kits.dispose(); }
  }
});

test('Sal asset resources and attachments are released cleanly', async () => {
  const disposals = {geometry: 0, material: 0};
  const asset = authoredSalScene(disposals);
  const registry = createVehicleAttachmentRegistry();
  const kits = createArmorKitMeshes(registry, {loadKitAsset: async () => ({scene: asset.scene})});
  const player = vehicle();
  const state = {s: 0, lateral: 0, armor: 100, maxArmor: 100, combatArmorKit: 'warlord',
    mode: 'wasteland', status: 'racing', stageTimeSec: 0, combat: {}, warlordId: 'sal',
    salSaw: {phase: 'idle', sinceSec: 0}, opponents: []};
  const duel = {state, course: {groundAt: () => ({y: 0})},
    featureFlags: {enabled: key => key === 'wasteland2'}};
  kits.update(duel, {player, rival: null, extraOpponents: []}, true);
  await tick(); await tick();
  kits.dispose();
  await tick();
  equal(registry.size, 0, 'dispose must detach the Sal rig');
  check(disposals.geometry > 0, 'dispose must release Sal blade geometry');
  check(disposals.material > 0, 'dispose must release Sal blade materials');
  equal(kits.group.children.length, 0, 'dispose must clear renderer-owned Sal objects');
});

test('the future Sal event plays one positional scrapdome-gated saw scream', () => {
  const cue = SOUND_BANK['arena.sal-saw'];
  check(cue, 'sound bank is missing arena.sal-saw');
  equal(cue.flag, 'scrapdome', 'arena.sal-saw must stay behind the scrapdome switch');
  equal(cue.file, 'sal-saw-scream.ogg', 'arena.sal-saw must use the reviewed runtime scream');
  const event = {salSaw: {position: {x: 8, y: 0.5, z: -3}}};
  const state = {mode: 'wasteland', maxArmor: 100, s: 2, lateral: 0};
  const beforeEvent = structuredClone(event), beforeState = structuredClone(state);
  const played = [], spatial = [];
  const audio = new EngineAudio({flags: {enabled: name => name === 'scrapdome'}});
  Object.assign(audio, {context: {state: 'running', currentTime: 1}, muted: false, paused: false});
  audio._syncMixer = () => {};
  audio._spatialOutput = (request) => {
    spatial.push(request.hitPosition);
    return {level: {}, disconnect() {}};
  };
  audio._playCue = (id, options) => { played.push({id, positional: !!options?.destination}); return {}; };
  audio.event(event, state, {groundAt: () => ({x: 0, y: 0, z: 0, heading: 0})});
  same(played, [{id: 'arena.sal-saw', positional: true}],
    'one salSaw event must play one positional arena.sal-saw cue');
  same(spatial, [event.salSaw.position], 'the event position must drive saw-scream spatial audio');
  same(event, beforeEvent, 'audio must not mutate the future Sal event');
  same(state, beforeState, 'audio must not mutate race state');

  const off = new EngineAudio({flags: {enabled: () => false}});
  Object.assign(off, {context: {state: 'running', currentTime: 1}, muted: false, paused: false});
  off._syncMixer = () => {};
  const offPlayed = [];
  off._playCue = id => { offPlayed.push(id); return {}; };
  off.event(event, state, null);
  same(offPlayed, [], 'scrapdome off must silence the Sal saw event');
});

test('the saw recording has a CC0 Freesound recipe, reproducible build and runtime Ogg', () => {
  const catalog = JSON.parse(readFileSync(join(root, 'tools/audio/catalog.json'), 'utf8'));
  const source = catalog.sounds?.find(item => item.cue === 'arena.sal-saw');
  check(source, 'audio catalog is missing the arena.sal-saw source');
  equal(source.source, 'freesound', 'Sal saw source must come from Freesound');
  equal(source.license, 'CC0 1.0', 'Sal saw source must be CC0');
  check(/^https:\/\/freesound\.org\/people\/.+\/sounds\/\d+\/$/.test(source.page || ''),
    'Sal saw catalog entry needs its primary Freesound page');
  check(/^https:\/\/cdn\.freesound\.org\//.test(source.download || ''),
    'Sal saw catalog entry needs its public Freesound download');
  check(/^[a-f0-9]{64}$/i.test(source.sha256 || ''), 'Sal saw source needs a SHA-256');
  equal(source.processing?.script, 'tools/audio/build-sal.mjs',
    'Sal saw catalog entry must name the rebuild script');

  const buildPath = join(root, 'tools/audio/build-sal.mjs');
  check(existsSync(buildPath), 'tools/audio/build-sal.mjs must keep the rebuild recipe');
  const build = readFileSync(buildPath, 'utf8');
  check(/sal-saw-scream\.ogg/.test(build) && /catalog\.json/.test(build),
    'the Sal build must use the catalog recipe and write the named runtime file');
  const runtimePath = join(root, 'public/assets/audio/sal-saw-scream.ogg');
  check(existsSync(runtimePath), 'runtime is missing sal-saw-scream.ogg');
  const runtime = readFileSync(runtimePath);
  check(runtime.length > 1000, 'runtime Sal scream must not be an empty placeholder');
  equal(runtime.subarray(0, 4).toString('ascii'), 'OggS', 'runtime Sal scream must be an Ogg file');
});

test('both shipped credit views name the Sal source, author, licence and processing', () => {
  const catalog = JSON.parse(readFileSync(join(root, 'tools/audio/catalog.json'), 'utf8'));
  const source = catalog.sounds?.find(item => item.cue === 'arena.sal-saw');
  check(source, 'credits require the catalogued arena.sal-saw source');
  for (const name of ['public/assets/audio/CREDITS.md', 'public/assets/audio/credits.html']) {
    const credit = readFileSync(join(root, name), 'utf8');
    for (const [value, label] of [[source.title, 'title'], [source.author, 'author'],
      [source.page, 'primary page'], ['CC0', 'CC0 licence'], ['build-sal', 'processing recipe']])
      check(value && credit.includes(value), `${name} is missing the Sal saw ${label}`);
  }
});

test('Sal review output is limited to one small sheet per round and three rounds', async () => {
  const scenarioPath = join(root, 'tools/scenarios/sal-art.mjs');
  check(existsSync(scenarioPath), 'tools/scenarios/sal-art.mjs must define bounded Sal review paths');
  const {salReviewPaths} = await import('./scenarios/sal-art.mjs');
  equal(typeof salReviewPaths, 'function', 'Sal scenario must expose its review-path policy');
  const sheets = new Set();
  for (let round = 1; round <= 3; round++) {
    const paths = salReviewPaths(round);
    equal(paths.evidence, `.evidence/sal/round-${round}`,
      `round ${round} raw captures must stay in ignored evidence`);
    equal(paths.sheet, `docs/board/looks/sal/round-${round}.jpg`,
      `round ${round} must publish one stable review sheet`);
    sheets.add(paths.sheet);
  }
  equal(sheets.size, 3, 'each permitted review round must have one distinct sheet path');
  for (const round of [0, 4]) {
    checks++;
    assert.throws(() => salReviewPaths(round), /round|1.*3|three/i,
      `review round ${round} must be rejected`);
  }
  check(existsSync(join(root, 'tools/sal-sheet.py')), 'tools/sal-sheet.py must build the bounded sheet');
});

test('published Sal review sheets are JPGs, one per round, at most 500 KB', () => {
  const folder = join(root, 'docs/board/looks/sal');
  check(existsSync(folder), 'Sal art must publish at least one review sheet');
  const files = readdirSync(folder).filter(name => /\.(?:jpe?g)$/i.test(name));
  check(files.length >= 1 && files.length <= 3, 'Sal must publish one to three review sheets');
  const rounds = new Set();
  for (const name of files) {
    const match = /^round-([1-3])\.jpg$/i.exec(name);
    check(match, `${name} must use the bounded round-N.jpg path`);
    check(!rounds.has(match[1]), `round ${match[1]} has more than one review sheet`);
    rounds.add(match[1]);
    check(statSync(join(folder, name)).size <= 500_000, `${name} must be at most 500 KB`);
  }
});
