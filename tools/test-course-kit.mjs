import assert from 'node:assert/strict';
import test from 'node:test';
import {createHash, randomUUID} from 'node:crypto';
import {cp, mkdir, mkdtemp, writeFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {join, resolve, relative} from 'node:path';
import {Course} from '../src/course.js';
import {courseFingerprint} from '../src/track-analysis.js';
import {TREMBLANT_WOODS} from '../src/circuits/tremblant-woods.js';
import {TREMBLANT_SNOW} from '../src/circuits/tremblant-snow.js';
import {HARBOUR_LIGHTS} from '../src/circuits/harbour-lights.js';
import {PANORAMA_RIDGE} from '../src/circuits/panorama-ridge.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const originals = [TREMBLANT_WOODS, TREMBLANT_SNOW, HARBOUR_LIGHTS, PANORAMA_RIDGE];
const api = await import('../src/circuit-manifests.js').catch(() => null);
const fixtureApi = await import('./course-fixtures.mjs').catch(() => null);

function requireApi() {
  assert.ok(api && fixtureApi, 'course registry and fixture loaders are missing');
}

test('manifests derive current registration, flags, prices and GP membership without mutation', async () => {
  requireApi();
  const {ALL_CIRCUITS, circuitsEnabled} = await import('../src/circuits/index.js');
  const {FEATURE_STATES, createFeatureFlags} = await import('../src/feature-flags.js');
  const {COURSE_PRICES} = await import('../src/course-access.js');
  const {GRAND_PRIX_COURSES} = await import('../src/race-field.js');
  assert.deepEqual(ALL_CIRCUITS.map(row => row.id), api.CIRCUIT_MANIFESTS.map(row => row.id));
  for (const manifest of api.CIRCUIT_MANIFESTS) {
    assert.ok(Object.isFrozen(manifest));
    assert.equal(FEATURE_STATES[manifest.flag], manifest.state);
    assert.equal(COURSE_PRICES[manifest.id], manifest.price);
    assert.equal(GRAND_PRIX_COURSES.includes(manifest.id), manifest.grandPrix);
  }
  const off = createFeatureFlags({storage: null, qa: false});
  const {COURSE} = await import('../src/config.js');
  const released = api.CIRCUIT_MANIFESTS.filter(row => row.state === 'on').map(row => row.id);
  assert.deepEqual(circuitsEnabled(off).map(row => row.id), released);
  assert.deepEqual(circuitsEnabled(off).map(row => COURSE.indexOf(row)), released.map((_, index) => api.BASE_COURSE_COUNT + index));
  const on = createFeatureFlags({storage: null, qa: true, search: '?flags=' + api.CIRCUIT_MANIFESTS.map(row => row.flag).join(',')});
  assert.deepEqual(circuitsEnabled(on).map(row => row.id), api.CIRCUIT_MANIFESTS.map(row => row.id));
});

test('derived public stage preserves exact authored generation, physical features and reference identity', async () => {
  requireApi();
  const {ALL_CIRCUITS} = await import('../src/circuits/index.js');
  for (const original of originals) {
    const view = ALL_CIRCUITS.find(row => row.id === original.id), before = JSON.stringify(original);
    assert.equal(view.stage, original.stage);
    assert.equal(view, original);
    assert.ok(Object.isFrozen(view));
    for (const seed of [1989, 42, 17]) {
      const authored = new Course(original, seed), derived = new Course(view, seed);
      const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
      assert.equal(hash(derived.samples), hash(authored.samples), 'exact complete unrounded sample data');
      assert.equal(hash(derived.features), hash(authored.features), 'exact complete physical feature data');
      assert.equal(courseFingerprint(derived), courseFingerprint(authored));
    }
    assert.equal(JSON.stringify(original), before, 'registry never mutates the authored definition');
  }
});

test('duplicate ids/flags/order and malformed manifests cannot silently register', () => {
  requireApi();
  const manifest = api.CIRCUIT_MANIFESTS[0], circuit = originals[0];
  const module = {manifest, circuit};
  assert.throws(() => api.registerCircuits([module, module]), /Duplicate/);
  assert.deepEqual(api.registerCircuits([{helper:()=>42}]), [], 'helper-only module is skipped');
  assert.throws(() => api.registerCircuits([{circuit}]), /manifest/i, 'real circuit without a manifest must fail');
  for (const change of [{price: -1}, {state: 'future'}, {grandPrix: 'yes'}, {releaseOrder: -1}, {driver: null}])
    assert.throws(() => api.registerCircuits([{circuit, manifest: {...manifest, ...change}}]), /manifest/i);
});

test('adding only one course and its own reference/replay/signature files registers every consumer', async () => {
  requireApi();
  const id = 'fac04-test-' + randomUUID().replaceAll('-', '');
  await mkdir(join(root, '.qa-dist'), {recursive: true});
  const fixtureRoot = await mkdtemp(join(root, '.qa-dist', 'fac04-test-'));
  const created = [], paths = [join(fixtureRoot, 'src/circuits', id + '.js'),
    join(fixtureRoot, 'src/generated/reference-laps', id + '.json'),
    join(fixtureRoot, 'tools/replays/courses', id + '.json'),
    join(fixtureRoot, 'tools/fixtures/world-signatures', id + '.json')];
  async function own(path, value) {
    assert.ok(!relative(fixtureRoot, path).startsWith('..'));
    await writeFile(path, value, {flag: 'wx'}); created.push(path);
  }
  try {
    await cp(join(root, 'src'), join(fixtureRoot, 'src'), {recursive: true});
    await cp(join(root, 'package.json'), join(fixtureRoot, 'package.json'));
    await cp(join(root, 'tools/replays'), join(fixtureRoot, 'tools/replays'), {recursive: true});
    await cp(join(root, 'tools/fixtures/world-signatures'), join(fixtureRoot, 'tools/fixtures/world-signatures'), {recursive: true});
    await cp(join(root, 'tools/course-fixtures.mjs'), join(fixtureRoot, 'tools/course-fixtures.mjs'));
    for (const name of ['test-feature-flags.mjs', 'test-wasteland-beta.mjs'])
      await cp(join(root, 'tools', name), join(fixtureRoot, 'tools', name));
    await cp(join(root, 'tools/scenarios'), join(fixtureRoot, 'tools/scenarios'), {recursive: true});
    await mkdir(join(fixtureRoot, 'tools/blender'), {recursive: true});
    await cp(join(root, 'tools/blender/gunn-turret.json'), join(fixtureRoot, 'tools/blender/gunn-turret.json'));
    await own(paths[0], `import {TREMBLANT_WOODS} from './tremblant-woods.js';
export const circuit=Object.freeze({...TREMBLANT_WOODS,id:${JSON.stringify(id)},flag:${JSON.stringify(id)}});
export const manifest=Object.freeze({id:${JSON.stringify(id)},flag:${JSON.stringify(id)},state:'dev',price:1900,grandPrix:true,releaseOrder:${Math.max(...api.CIRCUIT_MANIFESTS.map(row => row.releaseOrder)) + 1},driver:{car:'stuttgart_959s',driverId:'club',controller:'racing-line',skill:.95}});
`);
    await own(paths[1], JSON.stringify({[id + '|fixed']: {eventId: id, route: 'fixed', marker: 'own reference'}}));
    await own(paths[2], JSON.stringify({eventId: id, cases: [{id: id + '-duel', eventId: id, category: 'duel', mode: 'duel', car: 'falcone_f42'}], fingerprints: {[id + '-duel']: {'30': 'own fingerprint', '60': 'own fingerprint', '144': 'own fingerprint'}}}));
    await own(paths[3], JSON.stringify({[id]: {hash: 'own signature'}}));
    const code = `
const {FEATURE_STATES,createFeatureFlags}=await import('./src/feature-flags.js');
const {COURSE}=await import('./src/config.js');
const {circuitsEnabled}=await import('./src/circuits/index.js');
const {COURSE_PRICES}=await import('./src/course-access.js');
const {GRAND_PRIX_COURSES}=await import('./src/race-field.js');
const {referenceLap}=await import('./src/reference-laps.js');
const {loadReplayCatalog,loadWorldSignatures}=await import('./tools/course-fixtures.mjs');
const flags=createFeatureFlags({storage:null,qa:true,search:'?flags=${id}'});
const definitions=circuitsEnabled(flags);
const replay=loadReplayCatalog({definitions});
console.log(JSON.stringify({state:FEATURE_STATES['${id}'],price:COURSE_PRICES['${id}'],gp:GRAND_PRIX_COURSES.includes('${id}'),
course:${api.BASE_COURSE_COUNT}+definitions.findIndex(row=>row.id==='${id}'),ref:referenceLap('${id}')?.marker,
replay:replay.fixture.cases.some(row=>row.eventId==='${id}'),fingerprint:replay.expected.fingerprints['${id}-duel']?.['30'],world:loadWorldSignatures()['${id}']?.hash,production:createFeatureFlags({storage:null,qa:false}).enabled('${id}'),listed:COURSE.some(row=>row.id==='${id}')}));`;
    const child = spawnSync(process.execPath, ['--input-type=module', '-e', code], {cwd: fixtureRoot, encoding: 'utf8', windowsHide: true});
    assert.equal(child.status, 0, child.stderr);
    assert.deepEqual(JSON.parse(child.stdout), {state: 'dev', price: 1900, gp: true, course: api.BASE_COURSE_COUNT + api.CIRCUIT_MANIFESTS.filter(row => row.state === 'on').length,
      ref: 'own reference', replay: true, fingerprint: 'own fingerprint', world: 'own signature', production:false, listed:false});
    for (const state of ['dev', 'on']) {
      if (state === 'on') {
        const {readFile} = await import('node:fs/promises');
        await writeFile(paths[0], (await readFile(paths[0], 'utf8')).replace("state:'dev'", "state:'on'"));
      }
      const catalog = spawnSync(process.execPath, ['--input-type=module', '-e', code], {cwd: fixtureRoot, encoding: 'utf8', windowsHide: true});
      assert.equal(catalog.status, 0, catalog.stderr);
      const result = JSON.parse(catalog.stdout);
      assert.equal(result.state, state);
      assert.equal(result.production, state === 'on');
      assert.equal(result.listed, state === 'on');
      for (const name of ['test-feature-flags.mjs', 'test-wasteland-beta.mjs']) {
        const flags = spawnSync(process.execPath, ['tools/' + name], {cwd: fixtureRoot, encoding: 'utf8', windowsHide: true});
        assert.equal(flags.status, 0, `${state} course must need no shared flag test edit: ${flags.stdout} ${flags.stderr}`);
      }
    }
  } finally {
    assert.equal(process.platform, 'win32', 'test cleanup requires the authorized Recycle Bin');
    const part = relative(join(root, '.qa-dist'), fixtureRoot);
    assert.ok(/^fac04-test-[a-zA-Z0-9]+$/.test(part), 'recycle only the mkdtemp tree this test owns');
    const literal = "'" + fixtureRoot.replaceAll("'", "''") + "'";
    const script = 'Add-Type -AssemblyName Microsoft.VisualBasic; ' +
      '[Microsoft.VisualBasic.FileIO.FileSystem]::DeleteDirectory(' + literal + ',[Microsoft.VisualBasic.FileIO.UIOption]::OnlyErrorDialogs,[Microsoft.VisualBasic.FileIO.RecycleOption]::SendToRecycleBin)';
    const cleanup = spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-EncodedCommand', Buffer.from(script, 'utf16le').toString('base64')], {windowsHide: true, encoding: 'utf8'});
    assert.equal(cleanup.status, 0, cleanup.stderr);
  }
});


// FAC-04's consumed one-time migration proof is retained in docs/changes/FAC-04.md.
// Per-event reference, replay and world guards remain in their existing suites.
