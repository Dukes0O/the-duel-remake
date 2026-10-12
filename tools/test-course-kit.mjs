import assert from 'node:assert/strict';
import test from 'node:test';
import {createHash, randomUUID} from 'node:crypto';
import {readFile, writeFile} from 'node:fs/promises';
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
  assert.deepEqual(ALL_CIRCUITS.map(row => row.id), originals.map(row => row.id));
  assert.deepEqual(api.CIRCUIT_MANIFESTS.map(row => [row.state, row.price, row.grandPrix]),
    [['on', 1600, true], ['on', 1800, true], ['on', 1800, true], ['dev', 1600, false]]);
  for (const manifest of api.CIRCUIT_MANIFESTS) {
    assert.ok(Object.isFrozen(manifest));
    assert.equal(FEATURE_STATES[manifest.flag], manifest.state);
    assert.equal(COURSE_PRICES[manifest.id], manifest.price);
    assert.equal(GRAND_PRIX_COURSES.includes(manifest.id), manifest.grandPrix);
  }
  const off = createFeatureFlags({storage: null, qa: false});
  assert.deepEqual(circuitsEnabled(off).map(row => [row.id, row.stage]),
    [['tremblant-woods', 16], ['tremblant-snow', 17], ['harbour-lights', 18]]);
  const on = createFeatureFlags({storage: null, qa: true, search: '?flags=panorama-ridge'});
  assert.deepEqual(circuitsEnabled(on).map(row => row.stage), [16, 17, 18, 19]);
});

test('derived public stage preserves exact authored generation, physical features and reference identity', async () => {
  requireApi();
  const {ALL_CIRCUITS} = await import('../src/circuits/index.js');
  for (const original of originals) {
    const view = ALL_CIRCUITS.find(row => row.id === original.id), before = JSON.stringify(original);
    assert.equal(view.generationStage, original.stage);
    assert.ok(Object.isFrozen(view));
    for (const seed of [1989, 42, 17]) {
      const authored = new Course(original, seed), derived = new Course(view, seed);
      assert.deepEqual(derived.samples, authored.samples);
      assert.deepEqual(derived.features, authored.features);
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
  for (const change of [{price: -1}, {state: 'future'}, {grandPrix: 'yes'}, {releaseOrder: -1}, {driver: null}])
    assert.throws(() => api.registerCircuits([{circuit, manifest: {...manifest, ...change}}]), /manifest/i);
});

test('adding only one course and its own reference/replay/signature files registers every consumer', async () => {
  requireApi();
  const id = 'fac04-test-' + randomUUID().replaceAll('-', '');
  const created = [], paths = [join(root, 'src/circuits', id + '.js'),
    join(root, 'src/generated/reference-laps', id + '.json'),
    join(root, 'tools/replays/courses', id + '.json'),
    join(root, 'tools/fixtures/world-signatures', id + '.json')];
  async function own(path, value) {
    assert.ok(!relative(root, path).startsWith('..'));
    await writeFile(path, value, {flag: 'wx'}); created.push(path);
  }
  try {
    await own(paths[0], `import {TREMBLANT_WOODS} from './tremblant-woods.js';
export const circuit=Object.freeze({...TREMBLANT_WOODS,id:${JSON.stringify(id)},flag:${JSON.stringify(id)}});
export const manifest=Object.freeze({id:${JSON.stringify(id)},flag:${JSON.stringify(id)},state:'dev',price:1900,grandPrix:true,releaseOrder:999,driver:{car:'stuttgart_959s',driverId:'club',controller:'racing-line',skill:.95}});
`);
    await own(paths[1], JSON.stringify({[id + '|fixed']: {eventId: id, route: 'fixed', marker: 'own reference'}}));
    await own(paths[2], JSON.stringify({eventId: id, cases: [{id: id + '-duel', eventId: id, category: 'duel', mode: 'duel', car: 'falcone_f42'}], fingerprints: {[id + '-duel']: {'30': 'own fingerprint', '60': 'own fingerprint', '144': 'own fingerprint'}}}));
    await own(paths[3], JSON.stringify({[id]: {hash: 'own signature'}}));
    const code = `
const {FEATURE_STATES,createFeatureFlags}=await import('./src/feature-flags.js');
const {circuitsEnabled}=await import('./src/circuits/index.js');
const {COURSE_PRICES}=await import('./src/course-access.js');
const {GRAND_PRIX_COURSES}=await import('./src/race-field.js');
const {referenceLap}=await import('./src/reference-laps.js');
const {loadReplayCatalog,loadWorldSignatures}=await import('./tools/course-fixtures.mjs');
const flags=createFeatureFlags({storage:null,qa:true,search:'?flags=${id}'});
const definitions=circuitsEnabled(flags);
const replay=loadReplayCatalog({definitions});
console.log(JSON.stringify({state:FEATURE_STATES['${id}'],price:COURSE_PRICES['${id}'],gp:GRAND_PRIX_COURSES.includes('${id}'),
course:definitions.find(row=>row.id==='${id}')?.stage,ref:referenceLap('${id}')?.marker,
replay:replay.fixture.cases.some(row=>row.eventId==='${id}'),fingerprint:replay.expected.fingerprints['${id}-duel']?.['30'],world:loadWorldSignatures()['${id}']?.hash}));`;
    const child = spawnSync(process.execPath, ['--input-type=module', '-e', code], {cwd: root, encoding: 'utf8', windowsHide: true});
    assert.equal(child.status, 0, child.stderr);
    assert.deepEqual(JSON.parse(child.stdout), {state: 'dev', price: 1900, gp: true, course: 19,
      ref: 'own reference', replay: true, fingerprint: 'own fingerprint', world: 'own signature'});
  } finally {
    if (created.length) {
      assert.equal(process.platform, 'win32', 'test cleanup requires the authorized Recycle Bin');
      const literals = created.map(path => "'" + path.replaceAll("'", "''") + "'");
      const script = 'Add-Type -AssemblyName Microsoft.VisualBasic; ' +
        'foreach($courseFile in @(' + literals.join(',') + ')){[Microsoft.VisualBasic.FileIO.FileSystem]::DeleteFile($courseFile,[Microsoft.VisualBasic.FileIO.UIOption]::OnlyErrorDialogs,[Microsoft.VisualBasic.FileIO.RecycleOption]::SendToRecycleBin)}';
      const cleanup = spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-EncodedCommand', Buffer.from(script, 'utf16le').toString('base64')], {windowsHide: true, encoding: 'utf8'});
      assert.equal(cleanup.status, 0, cleanup.stderr);
    }
  }
});
