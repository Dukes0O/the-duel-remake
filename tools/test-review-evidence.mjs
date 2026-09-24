import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { analyzeFolder } from './audio-analysis.mjs';
import * as browserHarness from './browser-harness.mjs';
import { wavFromPcm } from './scenarios/audio-race.mjs';

const root = resolve(fileURLToPath(new URL('../', import.meta.url)));
const looks = join(root, 'docs', 'board', 'looks');
let checks = 0;
const check = (condition, message) => { checks++; assert.ok(condition, message); };
after(() => console.log(`Review evidence: ${checks} checks`));

function pathsOnly(mode, extraEnv = {}) {
  const run = spawnSync(process.execPath, [join(root, 'tools', 'fidelity-sheet.mjs'),
    ...(mode ? [mode, '3'] : []), '--paths-only'], {
    cwd: root, encoding: 'utf8', windowsHide: true, timeout: 10_000,
    env: { ...process.env, ...extraEnv },
  });
  check(run.status === 0, `${mode} --paths-only must describe output paths without loading captures or starting Blender: ${run.stderr || run.stdout}`);
  try { return JSON.parse(run.stdout); }
  catch { assert.fail(`${mode} --paths-only must print one JSON object: ${run.stdout}`); }
}

function inEvidence(path, family) {
  const name = relative(root, path).replaceAll('\\', '/');
  check(/^\.evidence\/\d{4}-\d{2}-\d{2}\//.test(name), `${family} raw output must default under dated .evidence: ${name}`);
  check(!name.startsWith('..') && !name.startsWith('docs/board/looks/') && !name.startsWith('.qa-dist/'),
    `${family} raw output must stay outside tracked review sheets and QA build output: ${name}`);
  return name;
}

test('every fidelity mode plans raw sheets and provenance in dated ignored evidence', () => {
  for (const [mode, family, supplement, round] of [['--crew-round', 'crew', false, 3],
    ['--first-person-round', 'first-person', false, 3], ['--first-person-tools-round', 'first-person', true, 3],
    ['--rustwall-round', 'rustwall', false, 3], [null, 'test-fighter', false, 1]]) {
    const planned = pathsOnly(mode);
    const directory = inEvidence(planned.directory, family);
    check(directory.includes(`/${family}/round-${round}`), `${mode || 'default'} must keep its round in its family folder`);
    for (const key of ['output', 'manifest']) {
      const path = inEvidence(planned[key], family);
      check(dirname(planned[key]) === planned.directory, `${key} must stay beside raw captures for ${mode}: ${path}`);
    }
    const summary = supplement ? null : join(root, 'docs', 'board', 'looks', family, `round-${round}.jpg`);
    check(planned.summary === summary, `${mode || 'default'} must plan ${supplement ? 'no duplicate review sheet' : 'one JPG review sheet'}: ${planned.summary}`);
  }
});

test('fidelity evidence root can be redirected without writing review files', () => {
  const alternate = join(root, '.evidence', 'test-review-evidence-override');
  const planned = pathsOnly('--crew-round', { DUEL_EVIDENCE_DIR: alternate });
  check(resolve(planned.directory).startsWith(alternate), 'DUEL_EVIDENCE_DIR must redirect the raw round directory');
  check(resolve(planned.output).startsWith(alternate), 'DUEL_EVIDENCE_DIR must redirect the raw sheet');
  check(resolve(planned.manifest).startsWith(alternate), 'DUEL_EVIDENCE_DIR must redirect provenance');
  check(!existsSync(alternate), '--paths-only must not create output directories');
});

test('Blender path plans keep all four raw capture families in dated evidence without writing files', async () => {
  const fixtureRoot = await mkdtemp(join(tmpdir(), 'duel-blender-evidence-'));
  const env = { ...process.env };
  delete env.DUEL_EVIDENCE_DIR;
  try {
    for (const [script, family, round] of [['test-fighter.py', 'test-fighter', 1],
      ['crew-fighters.py', 'crew', 3], ['first-person-gear.py', 'first-person', 3],
      ['rustwall.py', 'rustwall', 3]]) {
      const run = spawnSync('python', [join(root, 'tools', 'blender', script), '--', '--root', fixtureRoot,
        ...(script === 'test-fighter.py' ? [] : ['--round', String(round)]), '--paths-only'],
      { cwd: root, env, encoding: 'utf8', windowsHide: true, timeout: 10_000 });
      check(run.status === 0, `${script} must plan paths without Blender: ${run.stderr || run.stdout}`);
      const plan = JSON.parse(run.stdout);
      check(Array.isArray(plan.evidence) && plan.evidence.length === 1, `${script} must plan one raw capture directory`);
      const path = relative(fixtureRoot, plan.evidence[0]).replaceAll('\\', '/');
      check(new RegExp(`^\\.evidence/\\d{4}-\\d{2}-\\d{2}/${family}/round-${round}$`).test(path),
        `${script} raw captures must default to the dated evidence family and round: ${path}`);
      check(readdirSync(fixtureRoot).length === 0, `${script} --paths-only must create no files or directories`);
    }
  } finally { await rm(fixtureRoot, { recursive: true, force: true }); }
});

test('browser, Blender and fidelity rounds plan the same raw evidence directory', () => {
  check(typeof browserHarness.reviewRoundOutputDir === 'function',
    'browser harness must expose the shared review round output plan');
  const plainEnv = { ...process.env };
  delete plainEnv.DUEL_EVIDENCE_DIR;
  const families = [
    { scenario: 'crew-fighters', family: 'crew', key: 'GFX_CREW_ROUND', mode: '--crew-round', script: 'crew-fighters.py' },
    { scenario: 'first-person-gear', family: 'first-person', key: 'GFX_FIRST_PERSON_ROUND',
      mode: '--first-person-round', script: 'first-person-gear.py' },
    { scenario: 'rustwall', family: 'rustwall', key: 'EGG_RUSTWALL_ROUND', mode: '--rustwall-round', script: 'rustwall.py' },
  ];
  for (const { scenario, family, key, mode, script } of families) {
    const defaultEnv = { ...plainEnv };
    delete defaultEnv[key];
    for (const [round, env] of [[1, defaultEnv], [3, { ...defaultEnv, [key]: '3' }],
      [3, { ...defaultEnv, [key]: '3', DUEL_EVIDENCE_DIR: join(root, '.evidence', 'acceptance', family, 'round-3') }]]) {
      const browser = browserHarness.reviewRoundOutputDir(scenario, new Date(), root, env);
      const fidelity = spawnSync(process.execPath,
        [join(root, 'tools', 'fidelity-sheet.mjs'), mode, String(round), '--paths-only'],
        { cwd: root, env, encoding: 'utf8', windowsHide: true, timeout: 10_000 });
      check(fidelity.status === 0, `${family} fidelity path plan must run: ${fidelity.stderr || fidelity.stdout}`);
      const blender = spawnSync('python', [join(root, 'tools', 'blender', script), '--', '--root', root,
        '--round', String(round), '--paths-only'],
      { cwd: root, env, encoding: 'utf8', windowsHide: true, timeout: 10_000 });
      check(blender.status === 0, `${family} Blender path plan must run: ${blender.stderr || blender.stdout}`);
      const fidelityDir = JSON.parse(fidelity.stdout).directory;
      const blenderDirs = JSON.parse(blender.stdout).evidence;
      check(Array.isArray(blenderDirs) && blenderDirs.length === 1, `${family} Blender plan must name one capture directory`);
      check(browser === fidelityDir, `${family} browser and fidelity must share round ${round} raw evidence: ${browser} vs ${fidelityDir}`);
      check(browser === blenderDirs[0], `${family} browser and Blender must share round ${round} raw evidence: ${browser} vs ${blenderDirs[0]}`);
    }
  }
  for (const env of [plainEnv, { ...plainEnv,
    DUEL_EVIDENCE_DIR: join(root, '.evidence', 'acceptance', 'test-fighter', 'round-1') }]) {
    const browser = browserHarness.reviewRoundOutputDir('rigged-fighter', new Date(), root, env);
    const fidelity = spawnSync(process.execPath, [join(root, 'tools', 'fidelity-sheet.mjs'), '--paths-only'],
      { cwd: root, env, encoding: 'utf8', windowsHide: true, timeout: 10_000 });
    check(fidelity.status === 0, `test-fighter fidelity path plan must run: ${fidelity.stderr || fidelity.stdout}`);
    const blender = spawnSync('python', [join(root, 'tools', 'blender', 'test-fighter.py'), '--',
      '--root', root, '--paths-only'], { cwd: root, env, encoding: 'utf8', windowsHide: true, timeout: 10_000 });
    check(blender.status === 0, `test-fighter Blender path plan must run: ${blender.stderr || blender.stdout}`);
    const fidelityDir = JSON.parse(fidelity.stdout).directory;
    const blenderDirs = JSON.parse(blender.stdout).evidence;
    check(Array.isArray(blenderDirs) && blenderDirs.length === 1, 'test-fighter Blender plan must name one capture directory');
    check(browser === fidelityDir, `rigged-fighter browser and fidelity must share raw evidence: ${browser} vs ${fidelityDir}`);
    check(browser === blenderDirs[0], `rigged-fighter browser and Blender must share raw evidence: ${browser} vs ${blenderDirs[0]}`);
  }
  check(browserHarness.reviewRoundOutputDir('audio-race', new Date(), root, plainEnv) === null,
    'audio recordings must keep their separate timestamped evidence folder');
});

test('Git ignores raw evidence and the looks folder stays below 20 MB', () => {
  const ignored = spawnSync('git', ['check-ignore', '--no-index', '.evidence/2026-09-24/CLEAN-03/capture.png'],
    { cwd: root, encoding: 'utf8', windowsHide: true });
  check(ignored.status === 0, 'raw .evidence captures must be ignored by Git');
  function bytes(folder) {
    return readdirSync(folder, { withFileTypes: true }).reduce((sum, entry) => {
      const path = join(folder, entry.name);
      return sum + (entry.isDirectory() ? bytes(path) : entry.isFile() ? statSync(path).size : 0);
    }, 0);
  }
  check(bytes(looks) < 20_000_000, 'docs/board/looks must total less than 20 MB');
  function jsonFiles(folder) {
    return readdirSync(folder, { withFileTypes: true }).flatMap(entry => {
      const path = join(folder, entry.name);
      return entry.isDirectory() ? jsonFiles(path) : entry.isFile() && entry.name.endsWith('.json') ? [path] : [];
    });
  }
  check(jsonFiles(looks).length === 0, 'historical raw looks JSON belongs outside the review folder');
  const tracked = spawnSync('git', ['ls-files', '-z', '--', 'docs/board/looks'],
    { cwd: root, encoding: 'utf8', windowsHide: true });
  check(tracked.status === 0, `Git must list retained review files: ${tracked.stderr}`);
  const names = new Set(tracked.stdout.split('\0').filter(Boolean).map(path => path.replaceAll('\\', '/')));
  for (const name of names) {
    if (!/^docs\/board\/looks\/[^/]+\/round-\d+\.jpg$/.test(name)) continue;
    check(statSync(join(root, name)).size <= 500_000, `${name} must be at most 500 KB`);
    check(names.has(name.replace(/\.jpg$/, '-review.md')), `${name} needs a matching review note`);
  }
});

test('frozen first-person and Rustwall QA manifests keep their needed facts', () => {
  for (const round of [1, 2, 3]) {
    const firstPerson = JSON.parse(readFileSync(join(root, 'tools', 'fixtures', 'art-review',
      'first-person', `round-${round}`, 'blender-manifest.json'), 'utf8'));
    check(firstPerson.round === round && firstPerson.hands.length === 8 && firstPerson.tools.length === 2,
      `first-person round ${round} must retain eight hands and two tools`);
    check(firstPerson.camera && firstPerson.hands.every(asset =>
      typeof asset.files?.[`${asset.id}.glb`] === 'string'),
    `first-person round ${round} must retain camera and frozen GLB hashes`);

    const rustwall = JSON.parse(readFileSync(join(root, 'tools', 'fixtures', 'art-review',
      'rustwall', `round-${round}`, 'blender-manifest.json'), 'utf8'));
    check(rustwall.round === round && rustwall.reference && rustwall.captures?.length > 0,
      `Rustwall round ${round} must retain reference and capture plans`);
    check(['wall', 'wash'].every(kind => rustwall.assets?.[kind]?.path &&
      typeof rustwall.assets[kind].sha256 === 'string'),
    `Rustwall round ${round} must retain frozen wall and wash hashes`);
  }
});

test('audio analysis writes its report and graphs beside the raw recording', async () => {
  const folder = await mkdtemp(join(tmpdir(), 'duel-audio-evidence-'));
  try {
    const pcm = Buffer.alloc(16_000 * 4);
    const wav = wavFromPcm(pcm, 16_000);
    const tracks = Object.fromEntries(['mix', 'engine', 'tires', 'weapons', 'ambience', 'ui']
      .map(name => [name, { file: `${name}.wav`, audioStartSec: 0 }]));
    await Promise.all(Object.keys(tracks).map(name => writeFile(join(folder, `${name}.wav`), wav)));
    await writeFile(join(folder, 'recording.json'), JSON.stringify({ sampleRate: 16_000, tracks,
      events: [], frames: [], memoryOnlySaves: true }));
    const log = console.log;
    try { console.log = () => {}; await analyzeFolder(folder); }
    finally { console.log = log; }
    for (const name of ['audio-analysis.json', 'spectrogram.svg', 'loudness.svg']) {
      const path = join(folder, name);
      check(existsSync(path), `${name} must be written beside recording.json`);
      check((await readFile(path)).length > 0, `${name} must contain analysis output`);
    }
  } finally { await rm(folder, { recursive: true, force: true }); }
});

test('review JPG publication enforces one bounded sheet per round', async () => {
  let publish;
  try { ({ writeReviewJpegBytes: publish } = await import('./scenarios/review-sheet.mjs')); }
  catch { assert.fail('review-sheet helper must publish one bounded JPG outside raw evidence'); }
  check(typeof publish === 'function', 'review-sheet helper must expose bounded JPG publication');
  const fixtureRoot = await mkdtemp(join(tmpdir(), 'duel-review-sheet-'));
  try {
    const small = Buffer.from([0xff, 0xd8, 0xff, 0xd9]);
    const first = await publish(small, 'crew', 1, fixtureRoot);
    const expected = join(fixtureRoot, 'docs', 'board', 'looks', 'crew', 'round-1.jpg');
    check(first === expected, 'the review JPG must use the family and round summary path');
    check((await readFile(expected)).equals(small), 'published JPG bytes must be preserved');
    await assert.rejects(() => publish(Buffer.alloc(500_001), 'crew', 2, fixtureRoot), /500|size|large/i,
      'a review JPG over 500 KB must be rejected');
    checks++;
    check(!existsSync(join(fixtureRoot, 'docs', 'board', 'looks', 'crew', 'round-2.jpg')),
      'rejecting an oversized sheet must leave no review JPG');
    await assert.rejects(() => publish(Buffer.from([1, 2, 3]), 'crew', 1, fixtureRoot), /exist|immutable|already/i,
      'a later write must not replace a reviewed round');
    checks++;
    check((await readFile(expected)).equals(small), 'the first review JPG must survive a duplicate write');
  } finally { await rm(fixtureRoot, { recursive: true, force: true }); }
});

test('hidden-road arrival assigns one review JPG publisher to each planned round', async () => {
  const { shouldPublishArrivalReview } = await import('./scenarios/hidden-road-arrival.mjs');
  check(typeof shouldPublishArrivalReview === 'function', 'arrival review publisher policy must be testable without Chrome');
  for (const [round, normal, cost, correctedCost] of [
    [1, true, false, false], [2, false, true, false], [3, false, false, true],
    [4, true, false, false], [5, true, false, false],
  ]) {
    const publishers = [shouldPublishArrivalReview(round), shouldPublishArrivalReview(round, { costOnly: true }),
      shouldPublishArrivalReview(round, { costOnly: true, corrected: true })];
    check(publishers[0] === normal, `round ${round} normal review publisher mismatch`);
    check(publishers[1] === cost, `round ${round} plain cost review publisher mismatch`);
    check(publishers[2] === correctedCost, `round ${round} corrected cost review publisher mismatch`);
    check(publishers.filter(Boolean).length === 1,
      `round ${round} must have exactly one JPG publisher across normal, plain cost and corrected cost runs`);
  }
});
