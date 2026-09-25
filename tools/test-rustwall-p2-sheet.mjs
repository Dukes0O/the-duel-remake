import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {existsSync, readFileSync} from 'node:fs';
import {mkdir, mkdtemp, rm, writeFile} from 'node:fs/promises';
import {join, relative, resolve} from 'node:path';
import {test} from 'node:test';
import {fileURLToPath} from 'node:url';

const root = resolve(fileURLToPath(new URL('../', import.meta.url)));
const sheet = join(root, 'tools/fidelity-sheet.mjs');
function plan(mode, override) {
  const env = {...process.env};
  delete env.DUEL_EVIDENCE_DIR;
  if (override) env.DUEL_EVIDENCE_DIR = override;
  const run = spawnSync(process.execPath, [sheet, mode, '3', '--paths-only'],
    {cwd: root, env, encoding: 'utf8', timeout: 10_000, windowsHide: true});
  assert.equal(run.status, 0, `${mode} must plan paths without Blender or captures: ${run.stderr || run.stdout}`);
  return JSON.parse(run.stdout);
}

test('P2 Rustwall sheet plans isolated immutable review paths and preserves P1 default', () => {
  const before = plan('--rustwall-round');
  const next = plan('--rustwall-p2-round');
  assert.match(before.directory.replaceAll('\\', '/'), /\/\.evidence\/\d{4}-\d{2}-\d{2}\/rustwall\/round-3$/);
  assert.match(next.directory.replaceAll('\\', '/'), /\/\.evidence\/\d{4}-\d{2}-\d{2}\/rustwall-p2\/round-3$/);
  assert.equal(before.summary, join(root, 'docs/board/looks/rustwall/round-3.jpg'));
  assert.equal(next.summary, join(root, 'docs/board/looks/rustwall-p2/round-3.jpg'));
  assert.equal(next.output, join(next.directory, 'sheet.png'));
  assert.equal(next.manifest, join(next.directory, 'sheet.json'));
  const alternate = join(root, '.evidence', 'test-rustwall-p2-sheet-paths');
  const redirected = plan('--rustwall-p2-round', alternate);
  assert.equal(redirected.directory, alternate);
  assert.equal(redirected.summary, next.summary, 'private evidence override does not move the published P2 sheet');
  assert.ok(!existsSync(alternate), '--paths-only has zero writes');
});

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const rel = path => relative(root, path).replaceAll('\\', '/');
const tinyPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL/nwAAAABJRU5ErkJggg==', 'base64');
const template = join(root, 'tools/fixtures/art-review/rustwall/round-1/blender-manifest.json');

async function fixture(change = () => {}) {
  const parent = join(root, '.evidence');
  await mkdir(parent, {recursive: true});
  const directory = await mkdtemp(join(parent, 'test-rustwall-p2-sheet-'));
  const imagePath = join(directory, 'one-pixel.png');
  await writeFile(imagePath, tinyPng);
  const png = {path: rel(imagePath), sha256: hash(tinyPng)};
  const blender = JSON.parse(readFileSync(template, 'utf8'));
  for (const asset of Object.values(blender.assets))
    asset.sha256 = hash(readFileSync(join(root, asset.path)));
  for (const sample of blender.captures) Object.assign(sample, png);
  const captures = {assets: blender.assets, captures: [], context: [], placement: [],
    observationCommit: 'fixture', baseline: 'fixture', cost: {}, preparedGroundTriangles: {}};
  for (const sample of blender.captures) for (const quality of ['high', 'performance'])
    captures.captures.push({id: sample.id, quality, camera: sample.camera,
      cameraSpace: sample.cameraSpace, gateOpen: sample.gateOpen || 0,
      moduleScale: sample.moduleScale,
      ...(sample.id === 'wash-module' ? {counts: {scope: 'joined bank in the actual wash course'}} : {}),
      ...png});
  for (const route of ['a', 'b', 'c']) for (const quality of ['high', 'performance']) {
    captures.placement.push({route, quality, gate: [0, 0, 0], bankCount: 3,
      ground: [{offset: -210, height: 0}, {offset: 0, height: 0}, {offset: 210, height: 0}]});
    captures.context.push({route, quality, view: 'approach', ...png});
  }
  change({captures, blender});
  await writeFile(join(directory, 'blender-manifest.json'), JSON.stringify(blender));
  await writeFile(join(directory, 'captures.json'), JSON.stringify(captures));
  return directory;
}

function compileFixture(directory) {
  return spawnSync(process.execPath, [sheet, '--rustwall-p2-round', '3',
    '--blender', join(directory, 'missing-blender.exe')], {cwd: root,
    env: {...process.env, DUEL_EVIDENCE_DIR: directory}, encoding: 'utf8', timeout: 10_000, windowsHide: true});
}

test('P2 sheet records five camera matches and one honestly labeled canyon context row', async () => {
  const directory = await fixture();
  try {
    const run = compileFixture(directory);
    const path = join(directory, 'sheet.json');
    assert.ok(existsSync(path), `P2 provenance must be compiled before Blender composition: ${run.stderr || run.stdout}`);
    assert.match(run.stderr, /missing-blender\.exe|ENOENT/i, 'only the intentionally absent Blender renderer should stop fixture composition');
    const report = JSON.parse(readFileSync(path, 'utf8'));
    assert.equal(report.rows.length, 6);
    for (const row of report.rows.slice(0, 5)) assert.equal(row.comparisonScope, 'numeric-camera-match');
    const wash = report.rows[5];
    assert.equal(wash.view, 'wash-module');
    assert.equal(wash.comparisonScope, 'source-module-vs-runtime-bank');
    assert.equal(wash.label, 'WASH SOURCE MODULE AND GAME JOINED BANK NO CAMERA MATCH');
    assert.deepEqual(wash.columnLabels, ['REFERENCE ENVIRONMENT CONTEXT', 'BLENDER SOURCE MODULE',
      'HIGH GAME JOINED BANK', 'PERFORMANCE GAME JOINED BANK']);
    assert.equal(wash.reference, 'public/assets/reference/wasteland-art-direction.png');
    assert.deepEqual(wash.crop, [1010, 15, 1470, 310]);
    assert.deepEqual(report.contextReference, {path: wash.reference,
      sha256: hash(readFileSync(join(root, wash.reference))), crop: wash.crop,
      scope: 'environment-context'});
    assert.equal(report.placement.length, 6);
    assert.equal(report.routeCaptures.length, 6);
    assert.equal(report.sources[wash.reference], report.contextReference.sha256);
  } finally { await rm(directory, {recursive: true, force: true}); }
});

test('P2 sheet rejects missing route placement before writing provenance', async () => {
  const directory = await fixture(({captures}) => captures.placement.pop());
  try {
    const run = compileFixture(directory);
    assert.match(run.stderr, /placement|route a\/b\/c/i,
      `missing placement must be rejected for that reason: ${run.stderr}`);
    assert.ok(!existsSync(join(directory, 'sheet.json')), 'five of six A/B/C placement records must fail');
  } finally { await rm(directory, {recursive: true, force: true}); }
});

test('P2 sheet rejects duplicated route capture before writing provenance', async () => {
  const directory = await fixture(({captures}) => captures.context.push({...captures.context[0]}));
  try {
    const run = compileFixture(directory);
    assert.match(run.stderr, /duplicate.*route|route.*duplicate|context.*duplicate/i,
      `duplicate route capture must be rejected for that reason: ${run.stderr}`);
    assert.ok(!existsSync(join(directory, 'sheet.json')), 'duplicate route/quality approach image must fail');
  } finally { await rm(directory, {recursive: true, force: true}); }
});

test('P2 sheet rejects a wash game image without joined-bank provenance', async () => {
  const directory = await fixture(({captures}) => {
    const wash = captures.captures.find(item => item.id === 'wash-module' && item.quality === 'high');
    wash.counts.scope = 'not a joined bank';
  });
  try {
    const run = compileFixture(directory);
    assert.match(run.stderr, /joined.bank|wash.*scope|scope.*wash/i,
      `source module must not be relabeled as a joined game bank: ${run.stderr}`);
    assert.ok(!existsSync(join(directory, 'sheet.json')), 'bad wash scope must fail before provenance is written');
  } finally { await rm(directory, {recursive: true, force: true}); }
});

test('P2 sheet rejects an unverified game capture before writing provenance', async () => {
  const directory = await fixture(({captures}) => {
    delete captures.captures.find(item => item.id === 'front' && item.quality === 'high').sha256;
  });
  try {
    const run = compileFixture(directory);
    assert.match(run.stderr, /sha256|hash|unverified/i,
      `a missing capture hash must be rejected for that reason: ${run.stderr}`);
    assert.ok(!existsSync(join(directory, 'sheet.json')), 'unverified capture must fail before provenance');
  } finally { await rm(directory, {recursive: true, force: true}); }
});
