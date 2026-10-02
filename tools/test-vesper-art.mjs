import assert from 'node:assert/strict';
import {createHash, randomUUID} from 'node:crypto';
import {existsSync, readFileSync, mkdirSync, mkdtempSync, readdirSync, writeFileSync} from 'node:fs';
import {join, resolve, relative, isAbsolute} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {createRiggedFighterFigures} from '../src/rigged-fighter.js';

// Private artifact acceptance. No install, reveal, real storage or renderer-state writes.
const root = fileURLToPath(new URL('../', import.meta.url));
const SOURCE = 'public/assets/models/wasteland/crew/odessa.glb';
const RECIPE = 'tools/blender/vesper-blackiron.py';
const CONFIG = 'tools/art/vesper-fit.json';
const CLIPS = ['idle', 'walk', 'sprint', 'jump', 'knockdown', 'get-up', 'aim', 'fire', 'reload', 'repair', 'enter', 'exit'];
const SOURCES = Object.freeze({
  [SOURCE]: '364de3fd43de474eb4ef0fd12b859940f067549b02f2922b432d3a0c422170ca',
  'tools/blender/crew-fighters.py': '661eb808f94c338ba913b0fc8efdb9118d12984d0ba0669bc2e1de932d391857',
  'public/assets/reference/wasteland-crew-1.png': 'af27e7925f95972c5ec842f5573640f2b8d36aece5429c0357325f7c28078058',
  'public/assets/reference/CREDITS.md': '1062f54070340b87c10ec40b1d528f17845d723ac313b446b9bd4d2ecae863ad',
});
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const checks = [];
let assertions = 0;
const check = (name, run) => checks.push({name, run});
const ok = (value, message) => {assertions++; assert.ok(value, message);};
const eq = (a, b, message) => {assertions++; assert.equal(a, b, message);};
const same = (a, b, message) => {assertions++; assert.deepEqual(a, b, message);};
const path = value => resolve(root, value);
const required = (value, purpose) => {
  ok(existsSync(path(value)), `${purpose}: missing ${value}`);
  return readFileSync(path(value));
};
function protectedInventory() {
  const files = directory => readdirSync(path(directory), {withFileTypes: true}).flatMap(entry =>
    entry.isDirectory() ? files(directory + '/' + entry.name) : [directory + '/' + entry.name]);
  return Object.fromEntries([...files('src'), ...files('public'), ...files('tools/replays')].sort()
    .map(name => [name, hash(readFileSync(path(name)))]));
}
// Freeze current game bytes before any private recipe command can run.
const protectedBefore = Object.freeze(protectedInventory());
const outputArgument = process.argv.indexOf('--output-dir');
const output = resolve(outputArgument < 0 ? path('.qa-dist/vesper-art/' + randomUUID()) : process.argv[outputArgument + 1]);
function privatePath(value) {
  const local = relative(root, value).replaceAll('\\', '/');
  ok(!isAbsolute(local) && !local.startsWith('../') && /^(\.qa-dist|\.evidence)\/[^/]+/.test(local),
    'Vesper output must be a named private child of this lane .qa-dist/ or .evidence/');
  return value;
}
privatePath(output);
function glb(bytes) {
  eq(bytes.toString('ascii', 0, 4), 'glTF', 'real GLB header');
  eq(bytes.readUInt32LE(4), 2, 'GLB2'); eq(bytes.readUInt32LE(8), bytes.length, 'complete GLB');
  let json, binary;
  for (let offset = 12; offset < bytes.length;) {
    const length = bytes.readUInt32LE(offset), type = bytes.readUInt32LE(offset + 4);
    const chunk = bytes.subarray(offset + 8, offset + 8 + length);
    if (type === 0x4e4f534a) json = JSON.parse(chunk.toString('utf8'));
    if (type === 0x004e4942) binary = chunk;
    offset += length + 8;
  }
  ok(json && binary, 'actual embedded geometry and JSON');
  for (const item of [...(json.buffers || []), ...(json.images || [])])
    ok(!item.uri || item.uri.startsWith('data:'), 'no external image/buffer/network dependency');
  return {json, binary, bytes};
}
async function parse(bytes) {
  // Only the unavailable Node image decoder is replaced. Geometry, skeletons,
  // animation binding, GLTFLoader and native view all remain genuine.
  const loader = new GLTFLoader();
  loader.register(() => ({name: 'TEST_EMBEDDED_TEXTURE', loadTexture: () => Promise.resolve(new THREE.Texture())}));
  return loader.parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
}
const skins = scene => {const result = []; scene.traverse(n => {if (n.isSkinnedMesh) result.push(n);}); return result;};
function detail(node) {
  for (let n = node; n; n = n.parent) {
    const label = String(n.userData?.lod || n.name).toLowerCase();
    for (const level of ['near', 'far']) if (new RegExp(`(^|[-_ ])${level}($|[-_ ])`).test(label)) return level;
  }
  return null;
}
const visible = node => {for (let n = node; n; n = n.parent) if (!n.visible) return false; return true;};
const draws = mesh => Array.isArray(mesh.material) ? mesh.geometry.groups.length : 1;
function imageBytes(raw, image) {
  if (image.uri) {ok(image.uri.startsWith('data:image/png;base64,'), 'embedded PNG URI'); return Buffer.from(image.uri.split(',')[1], 'base64');}
  eq(image.mimeType, 'image/png', 'lossless embedded costume atlas');
  const view = raw.json.bufferViews[image.bufferView];
  return raw.binary.subarray(view.byteOffset || 0, (view.byteOffset || 0) + view.byteLength);
}
function textureAudit(raw) {
  const roles = new Map();
  for (const m of raw.json.materials || []) for (const [role, t] of Object.entries({color: m.pbrMetallicRoughness?.baseColorTexture,
    surface: m.pbrMetallicRoughness?.metallicRoughnessTexture, normal: m.normalTexture, occlusion: m.occlusionTexture, emissive: m.emissiveTexture})) {
    if (!t) continue;
    if (!roles.has(role)) roles.set(role, new Set());
    roles.get(role).add(raw.json.textures[t.index].source);
  }
  ok(roles.has('color'), 'real textured costume');
  for (const [role, values] of roles) eq(values.size, 1, `${role}: one atlas per material role`);
  for (const image of raw.json.images || []) {
    const png = imageBytes(raw, image);
    eq(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', 'actual PNG signature');
    eq(png.readUInt32BE(16), 1024, '1024 atlas width'); eq(png.readUInt32BE(20), 1024, '1024 atlas height');
  }
}
function geometryAudit(asset) {
  const meshes = skins(asset.scene);
  const measured = {};
  for (const [level, limit] of [['near', 6500], ['far', 2000]]) {
    const at = meshes.filter(m => detail(m) === level);
    ok(at.length > 0, `${level}: genuine bound LOD is required`);
    measured[level] = {triangles: at.reduce((n, m) => n + (m.geometry.index?.count || m.geometry.attributes.position.count) / 3, 0),
      draws: at.reduce((n, m) => n + draws(m), 0)};
    ok(measured[level].triangles > 0 && measured[level].triangles <= limit, `${level}: settled triangle budget ${limit}`);
    // The approved donor has one draw per visible LOD. Both levels together
    // are two draws; hidden detail must not be counted as a visible fighter.
    eq(measured[level].draws, 1, `${level}: one skinned draw per figure`);
    for (const m of at) {
      eq(m.skeleton.bones.length, 17, `${level}: retain approved seventeen-joint rig`);
      for (const a of Object.values(m.geometry.attributes)) ok(Array.from(a.array).every(Number.isFinite), 'finite native attributes');
      const w = m.geometry.attributes.skinWeight, j = m.geometry.attributes.skinIndex, uv = m.geometry.attributes.uv;
      ok(w && j && uv, 'weights, joint indices and UVs exist');
      for (let i = 0; i < w.count; i++) {
        ok(Math.abs(w.getX(i) + w.getY(i) + w.getZ(i) + w.getW(i) - 1) < .001, 'normalized actual bound weights');
        for (let c = 0; c < 4; c++) ok(j.array[i * j.itemSize + c] >= 0 && j.array[i * j.itemSize + c] < 17, 'joint indices address the real rig');
      }
    }
  }
  return measured;
}
async function animationAudit(asset) {
  same(asset.animations.map(c => c.name).sort(), [...CLIPS].sort(), 'all twelve retained action names');
  for (const name of CLIPS) {
    const clip = asset.animations.find(c => c.name === name);
    ok(clip.duration > 0 && clip.tracks.length > 0, `${name}: actual animated tracks`);
    const mixer = new THREE.AnimationMixer(asset.scene); mixer.clipAction(clip).play();
    const sample = t => {
      mixer.setTime(t); asset.scene.updateMatrixWorld(true);
      return skins(asset.scene).flatMap(m => {
        m.skeleton.update(); const values = [];
        for (let i = 0; i < m.geometry.attributes.position.count; i += Math.max(1, Math.floor(m.geometry.attributes.position.count / 192)))
          values.push(...m.getVertexPosition(i, new THREE.Vector3()).toArray());
        return values;
      });
    };
    const start = sample(0);
    ok([.23, .61].some(f => sample(clip.duration * f).some((v, i) => Math.abs(v - start[i]) > .001)), `${name}: deforms genuine bound vertices`);
    mixer.stopAllAction(); mixer.uncacheRoot(asset.scene);
  }
}
const sourceRaw = () => glb(required(SOURCE, 'Approved Odessa baseline'));
const candidateRaw = () => {
  ok(existsSync(join(output, 'vesper.glb')), 'Vesper costume candidate is missing from private output; unchanged Odessa is not a completed fit');
  return glb(readFileSync(join(output, 'vesper.glb')));
};
function config() {
  const fit = JSON.parse(required(CONFIG, 'Vesper source-bound fit configuration'));
  eq(fit.id, 'vesper', 'private identity');
  same(fit.source, {path: SOURCE, sha256: SOURCES[SOURCE]}, 'the approved actual Odessa GLB is the only donor');
  same(fit.provenance, Object.entries(SOURCES).map(([path, sha256]) => ({path, sha256})), 'source recipe/reference/rights remain bound to their actual bytes');
  return fit;
}
function command(args) {
  required(RECIPE, 'Vesper private recipe');
  const run = spawnSync(process.env.PYTHON || 'python', [path(RECIPE), '--root', root, '--fit-config', path(CONFIG), ...args],
    {cwd: root, encoding: 'utf8', timeout: 30000, windowsHide: true});
  ok(!run.error, `private recipe starts: ${run.error?.message}`);
  return run;
}
function protectedFiles() {
  for (const [name, expected] of Object.entries(SOURCES)) eq(hash(required(name, 'Approved source')), expected, 'recipe/reference/rights bytes stay intact');
  same(protectedInventory(), protectedBefore,
    'private fit preserves exact current source/public/replay file paths and bytes');
}
async function lifecycle(bytes) {
  const loaded = await parse(bytes), resources = new Set();
  loaded.scene.traverse(n => {
    for (const r of [n.geometry, n.skeleton, ...[].concat(n.material || [])]) if (r) resources.add(r);
    for (const m of [].concat(n.material || [])) for (const r of Object.values(m)) if (r?.isTexture) resources.add(r);
  });
  const releases = new Map([...resources].map(r => [r, 0]));
  for (const r of resources) {
    if (r.addEventListener) r.addEventListener('dispose', () => releases.set(r, releases.get(r) + 1));
    else {const dispose = r.dispose.bind(r); r.dispose = () => {releases.set(r, releases.get(r) + 1); return dispose();};}
  }
  let requests = 0;
  // Existing recognized donor identity is a PRIVATE loader seam only. It does
  // not add Vesper to the public roster or modify simulation/state/rewards.
  const view = createRiggedFighterFigures({loadAsset: async () => {requests++; return loaded;}});
  const roster = Array.from({length: 12}, (_, i) => ({crewId: 'odessa', x: i * 2, y: 0, z: 0, yaw: 0, speed: 0, airHeight: 0, knockedDown: false}));
  const options = detail => ({active: true, enabled: true, detail, time: .25});
  try {
    view.update(roster, options('near')); await new Promise(r => setImmediate(r));
    eq(view.group.userData.crews.odessa, 'ready', 'actual native fighter pipeline accepts the private GLB');
    same(view.group.userData.loadErrors, [], 'no fallback loader errors');
    let identities;
    for (const level of ['near', 'far', 'near']) {
      eq(view.update(roster, options(level)), 12, 'bounded genuine twelve-figure roster');
      const shown = skins(view.group).filter(visible);
      eq(shown.length, 12, 'one real visible bound LOD per fighter');
      ok(shown.every(m => detail(m) === level), 'actual LOD visibility follows native view');
      ok(shown.reduce((n, m) => n + draws(m), 0) <= 24, 'SPEC twelve-figure draw budget');
      eq(new Set(shown.map(m => m.skeleton)).size, 12, 'cloned independent skeletons');
      const next = skins(view.group).map(m => [m.uuid, m.geometry.uuid, m.material.uuid]);
      if (identities) same(next, identities, 'detail changes reuse actual meshes/materials'); else identities = next;
    }
    eq(requests, 1, 'one donor request across all twelve figures/frames');
  } finally {view.dispose(); view.dispose();}
  eq(view.group.children.length, 0, 'native view releases its scene');
  for (const [r, count] of releases) eq(count, 1, `${r.type || r.constructor.name}: actual resource disposed once`);
}

check('baseline: approved source, original recipe and original generated-reference rights are intact', () => {
  for (const [name, expected] of Object.entries(SOURCES)) eq(hash(required(name, 'Approved source')), expected, `${name}: approved checksum`);
  const credits = readFileSync(path('public/assets/reference/CREDITS.md'), 'utf8');
  ok(credits.includes('wasteland-crew-1.png') && credits.includes('original') && credits.includes('Codex'), 'original generated source rights; no CC0 donor attribution invented');
});
check('baseline: actual Odessa both LODs, bound weights, atlas and geometry budgets', async () => {
  const raw = sourceRaw(); textureAudit(raw);
  const measured = geometryAudit(await parse(raw.bytes));
  same(measured, {near: {triangles: 4876, draws: 1}, far: {triangles: 1880, draws: 1}}, 'native source geometry, not combined-LOD metadata guess');
});
check('baseline: all twelve genuine Odessa actions deform the skin', async () => animationAudit(await parse(sourceRaw().bytes)));
check('baseline: genuine Odessa loads, switches detail, clones twelve figures and disposes', async () => lifecycle(sourceRaw().bytes));
check('preservation: existing source/public/crew/roster/save code and every replay stay byte exact', protectedFiles);
check('private recipe: a separate costume-fitting recipe exists before export', () => required(RECIPE, 'Vesper costume-fitting recipe'));
check('private fit: exact existing-source and rights binding', config);
check('private fit: output plan is private and has no installation side effects', () => {
  config(); required(RECIPE, 'Vesper private recipe');
  const scratch = path('.qa-dist/vesper-plan'); mkdirSync(scratch, {recursive: true});
  const planned = join(mkdtempSync(join(scratch, 'run-')), 'output');
  const run = command(['--output-dir', planned, '--paths-only']); eq(run.status, 0, run.stderr);
  const plan = JSON.parse(run.stdout);
  eq(resolve(plan.model), join(planned, 'vesper.glb'), 'private model output');
  eq(resolve(plan.manifest), join(planned, 'manifest.json'), 'private manifest output');
  eq(existsSync(planned), false, 'paths-only neither creates output nor installs assets');
});
check('private fit: stale donor hashes are rejected before output', () => {
  const fit = config(); required(RECIPE, 'Vesper private recipe');
  const scratch = path('.qa-dist/vesper-negative'); mkdirSync(scratch, {recursive: true});
  const directory = mkdtempSync(join(scratch, 'stale-'));
  // Deliberate test config is ignored evidence, never a source replacement.
  const altered = {...fit, source: {...fit.source, sha256: '0'.repeat(64)}};
  // Write only this task-specific ignored fixture after the recipe exists.
  return import('node:fs').then(({writeFileSync}) => {
    writeFileSync(join(directory, 'fit.json'), JSON.stringify(altered));
    const rejectedOutput = join(directory, 'output');
    const run = spawnSync(process.env.PYTHON || 'python', [path(RECIPE), '--root', root, '--fit-config', join(directory, 'fit.json'), '--output-dir', rejectedOutput, '--validate-sources'], {encoding: 'utf8', cwd: root, timeout: 30000, windowsHide: true});
    ok(!run.error, 'actual source-validation CLI starts'); ok(run.status !== 0, 'stale donor digest must reject');
    ok(/hash|sha|checksum/i.test(run.stdout + run.stderr), 'rejection identifies actual donor checksum'); eq(existsSync(rejectedOutput), false, 'reject before creating output');
  });
});
check('private fit: output guard rejects public/root/other-lane destinations before writing', () => {
  config();
  for (const forbidden of [path('public/assets/models/wasteland/crew'), root, resolve(root, '..', 'vesper-output')]) {
    const existed = existsSync(forbidden);
    const before = readdirSync(forbidden === root ? root : path('public/assets/models/wasteland/crew')).sort();
    const run = command(['--output-dir', forbidden, '--paths-only']);
    ok(run.status !== 0, 'guard rejects non-private output');
    eq(existsSync(forbidden), existed, 'rejected output plan creates no destination');
    ok(/private|output|\.qa-dist|\.evidence/i.test(run.stdout + run.stderr), 'guard identifies private-output policy');
    same(readdirSync(forbidden === root ? root : path('public/assets/models/wasteland/crew')).sort(), before, 'rejected plan creates no runtime/root files');
  }
});
check('private recipe: a genuine private candidate is rebuilt from the bound original source', () => {
  required(RECIPE, 'Vesper costume-fitting recipe'); config();
  const blender = process.env.BLENDER_BIN || join(process.env.LOCALAPPDATA || '', 'Programs/Blender/current/blender.exe');
  ok(existsSync(blender), 'actual local Blender is required; no fake exporter');
  const run = spawnSync(blender, ['-b', '--python-exit-code', '1', '--python', path(RECIPE), '--',
    '--root', root, '--fit-config', path(CONFIG), '--output-dir', output],
    {cwd: root, encoding: 'utf8', timeout: 180000, windowsHide: true, maxBuffer: 8 * 1024 * 1024});
  ok(!run.error, `actual private Blender export starts: ${run.error?.message}`); eq(run.status, 0, run.stderr);
  candidateRaw(); protectedFiles();
});
check('candidate: actual distinct private model, both LODs and embedded costume atlas', async () => {
  const raw = candidateRaw(); ok(hash(raw.bytes) !== SOURCES[SOURCE], 'unchanged donor cannot stand in for Vesper');
  textureAudit(raw); geometryAudit(await parse(raw.bytes));
});
check('candidate: retained bones/bind pose, topology, normalized weights and UV layout', async () => {
  const original = await parse(sourceRaw().bytes), candidate = await parse(candidateRaw().bytes);
  for (const level of ['near', 'far']) {
    const a = skins(original.scene).filter(m => detail(m) === level), b = skins(candidate.scene).filter(m => detail(m) === level);
    eq(b.length, a.length, `${level}: retain approved topology, not replacement anatomy`);
    for (let i = 0; i < a.length; i++) {
      same(b[i].skeleton.bones.map(n => n.name), a[i].skeleton.bones.map(n => n.name), 'retained joint names/order');
      same(b[i].skeleton.bones.map(n => n.parent?.name), a[i].skeleton.bones.map(n => n.parent?.name), 'retained bone parenting');
      const near = (x, y, label) => {eq(x.length, y.length, label); ok(x.every((v, k) => Math.abs(v - y[k]) <= 1e-6), label);};
      near(b[i].bindMatrix.elements, a[i].bindMatrix.elements, 'retained bind matrix');
      for (let j = 0; j < a[i].skeleton.boneInverses.length; j++) near(b[i].skeleton.boneInverses[j].elements, a[i].skeleton.boneInverses[j].elements, 'retained inverse bind pose');
      same(Array.from(b[i].geometry.index.array), Array.from(a[i].geometry.index.array), 'retained actual triangle indices');
      for (const key of ['position', 'normal', 'uv', 'skinIndex', 'skinWeight']) {
        eq(b[i].geometry.attributes[key].itemSize, a[i].geometry.attributes[key].itemSize, `${key}: retained attribute shape`);
        near(Array.from(b[i].geometry.attributes[key].array), Array.from(a[i].geometry.attributes[key].array), `${key}: costume-only retained native geometry/UV/skin`);
      }
    }
  }
});
check('candidate: all twelve original action tracks/times/values remain and visibly deform', async () => {
  const a = await parse(sourceRaw().bytes), b = await parse(candidateRaw().bytes);
  for (const name of CLIPS) {
    const old = a.animations.find(c => c.name === name), current = b.animations.find(c => c.name === name);
    ok(current, `${name}: retained action`); eq(current.duration, old.duration, `${name}: duration`);
    same(current.tracks.map(t => ({name: t.name, times: Array.from(t.times), values: Array.from(t.values)})),
      old.tracks.map(t => ({name: t.name, times: Array.from(t.times), values: Array.from(t.values)})), `${name}: actual original animation data`);
  }
  await animationAudit(b);
});
check('candidate: blackened-steel/dark-red costume evidence refers to actual materials and changed embedded color', () => {
  const raw = candidateRaw(), original = sourceRaw();
  const manifest = JSON.parse(required(relative(root, join(output, 'manifest.json')), 'Vesper private fit manifest'));
  eq(manifest.id, 'vesper', 'private manifest identity'); same(manifest.source, {path: SOURCE, sha256: SOURCES[SOURCE]}, 'manifest source lineage');
  eq(manifest.modelSha256, hash(raw.bytes), 'manifest binds the actual candidate');
  for (const role of ['blackenedSteel', 'darkRed']) {
    const indices = manifest.costume?.[role]?.materialIndices;
    ok(Array.isArray(indices) && indices.length > 0, `${role}: nonempty actual costume material evidence`);
    for (const index of indices) {
      const material = raw.json.materials?.[index]; ok(material, `${role}: references a real exported material`);
      ok(raw.json.meshes.some(m => m.primitives.some(p => p.material === index)), `${role}: material is actually used by bound geometry`);
    }
  }
  const colors = raw.json.materials.map(m => m.pbrMetallicRoughness?.baseColorTexture).filter(Boolean)
    .map(t => hash(imageBytes(raw, raw.json.images[raw.json.textures[t.index].source])));
  const oldColors = original.json.materials.map(m => m.pbrMetallicRoughness?.baseColorTexture).filter(Boolean)
    .map(t => hash(imageBytes(original, original.json.images[original.json.textures[t.index].source])));
  ok(colors.some(h => !oldColors.includes(h)), 'actual costume color atlas changes, not only manifest labels');
  // Material evidence cannot prove gritty tone, recognizability or a look score.
});
check('candidate: genuine native private view compatibility, twelve-figure LOD reuse and disposal', async () => lifecycle(candidateRaw().bytes));
check('private recipe: two genuine exports are repeatable and preserve source/runtime/replays', async () => {
  config(); required(RECIPE, 'Vesper private recipe');
  const blender = process.env.BLENDER_BIN || join(process.env.LOCALAPPDATA || '', 'Programs/Blender/current/blender.exe');
  ok(existsSync(blender), 'actual local Blender is required for repeatability; no fake exporter');
  const scratch = path('.qa-dist/vesper-repeat'); mkdirSync(scratch, {recursive: true});
  const session = mkdtempSync(join(scratch, 'run-')), hashes = [];
  for (const name of ['first', 'second']) {
    const at = join(session, name);
    const run = spawnSync(blender, ['-b', '--python-exit-code', '1', '--python', path(RECIPE), '--', '--root', root, '--fit-config', path(CONFIG), '--output-dir', at],
      {cwd: root, encoding: 'utf8', timeout: 180000, windowsHide: true, maxBuffer: 8 * 1024 * 1024});
    ok(!run.error, `actual Blender export starts: ${run.error?.message}`); eq(run.status, 0, run.stderr);
    const bytes = readFileSync(join(at, 'vesper.glb')); geometryAudit(await parse(bytes)); hashes.push(hash(bytes));
  }
  eq(hashes[0], hashes[1], 'identical inputs yield identical real private GLB bytes'); protectedFiles();
});
check('preservation after private recipe checks: source/public/roster/saves/replays remain exact', protectedFiles);

// Claude's fresh-folder export contract replaces the old link/capability matrix.
// These genuine CLI checks do not import Blender or require OS settings.
const freshDirectory = name => {
  const parent = path('.qa-dist/vesper-fresh-output');
  mkdirSync(parent, {recursive: true});
  return join(mkdtempSync(join(parent, name + '-')), 'output');
};
check('fresh output: an absent named private folder plans without creation', () => {
  const at = freshDirectory('plan');
  const run = command(['--output-dir', at, '--paths-only']);
  eq(run.status, 0, run.stderr);
  const plan = JSON.parse(run.stdout);
  eq(resolve(plan.model), join(at, 'vesper.glb'), 'plan uses the new private folder');
  eq(resolve(plan.manifest), join(at, 'manifest.json'), 'manifest shares the new private folder');
  eq(existsSync(at), false, 'planning creates neither the output folder nor artifacts');
});
check('fresh output: a pre-existing ordinary destination rejects and preserves its bytes', () => {
  const at = freshDirectory('existing-file');
  mkdirSync(at);
  const model = join(at, 'vesper.glb'), before = Buffer.from('existing private candidate must stay intact');
  writeFileSync(model, before);
  const run = command(['--output-dir', at, '--paths-only']);
  same(readFileSync(model), before, 'rejected plan preserves existing candidate bytes');
  same(readdirSync(at), ['vesper.glb'], 'rejected plan creates no further output');
  ok(run.status !== 0, 'pre-existing ordinary output must reject instead of accepting a rerun destination');
  ok(/exist|empty|new|output/i.test(run.stderr), 'rejection identifies the fresh-output contract');
});
check('fresh output: an existing empty export folder rejects before Blender import', () => {
  const at = freshDirectory('existing-empty');
  mkdirSync(at);
  const run = command(['--output-dir', at]);
  same(readdirSync(at), [], 'rejected export leaves the existing empty folder unchanged');
  ok(run.status !== 0, 'export must reject an existing empty output folder');
  ok(/VESPER_PRIVATE_REJECT.*(?:exist|empty|new|output)/i.test(run.stderr),
    'existing empty export folder must reject for the fresh-folder contract before importing Blender');
  ok(!/ModuleNotFoundError|No module named ['"]bpy/.test(run.stderr), 'rejection precedes Blender-only imports');
});

const selected = process.argv.includes('--fresh-output-only')
  ? checks.filter(({name}) => name.startsWith('fresh output:')) : checks;
let failures = 0;
for (const {name, run} of selected) {
  try {await run();} catch (error) {failures++; console.error(`FAIL ${name}: ${error.message}`);}
}
console.log(`Vesper private art: ${selected.length} cases, ${selected.length - failures} passed, ${failures} failed; ${assertions} acceptance checks.`);
if (failures) process.exitCode = 1;
