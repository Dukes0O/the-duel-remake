import assert from 'node:assert/strict';
import { createHash, randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { main as runTests } from './run-tests.mjs';

// TRACK-01, SPEC 0.5/0.6. All inspected repositories, builds and evidence are
// throwaway fixtures. No game, browser, real save or live checkout is opened.
const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const statusTool = join(projectRoot, 'tools/build-status.mjs');
const sandbox = mkdtempSync(join(tmpdir(), 'duel-build-status-'));
const now = '2026-09-23T12:00:00.000Z';
const old = '2026-09-20T12:00:00.000Z';
let checks = 0;
const failures = [];
const guard = join(sandbox, 'inspection-guard.mjs');
put(guard, `
import http from 'node:http';
import https from 'node:https';
import net from 'node:net';
import tls from 'node:tls';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import { syncBuiltinESMExports } from 'node:module';
const denied = () => { throw Error('TRACK-01 status inspection attempted network access'); };
http.request = http.get = https.request = https.get = denied;
net.connect = net.createConnection = tls.connect = globalThis.fetch = denied;
for (const [object, method] of [[fs, 'readFileSync'], [fs, 'readFile'], [fsp, 'readFile']]) {
  const original = object[method];
  object[method] = function(path, ...rest) {
    if (String(path).includes('player-save-fixture')) throw Error('TRACK-01 status inspection attempted save access');
    return original.call(this, path, ...rest);
  };
}
syncBuiltinESMExports();
`);
const check = (value, label) => { checks++; assert.ok(value, label); };
const same = (actual, expected, label) => { checks++; assert.deepEqual(actual, expected, label); };
async function test(label, action) {
  try { await action(); } catch (error) { failures.push(`${label}: ${error.message}`); }
}
function put(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, value, 'utf8');
}
function git(root, ...args) {
  const result = spawnSync('git', ['-C', root, ...args], {
    encoding: 'utf8', shell: false, windowsHide: true,
    env: { ...process.env, GIT_OPTIONAL_LOCKS: '0', GIT_AUTHOR_DATE: old, GIT_COMMITTER_DATE: old },
  });
  assert.equal(result.status, 0, `fixture git ${args.join(' ')}: ${result.stderr}`);
  return result.stdout.trim();
}
function fixture(name) {
  const home = join(sandbox, name), root = join(home, 'integration');
  mkdirSync(root, { recursive: true });
  git(root, 'init', '-b', 'master');
  git(root, 'config', 'user.name', 'Build status fixture');
  git(root, 'config', 'user.email', 'fixture@example.invalid');
  git(root, 'config', 'core.autocrlf', 'false');
  put(join(root, '.gitignore'), 'dist/\ndocs/board/STATUS.md\ndocs/board/checks/full-tier.json\n');
  put(join(root, 'package.json'), '{"type":"module"}\n');
  put(join(root, 'src/feature-flags.js'), "export const FEATURE_STATES = Object.freeze({ 'hidden-road': 'dev', crew: 'beta', arena: 'on' });\n");
  put(join(root, 'source.txt'), 'unchanged source\n');
  put(join(root, 'tools/size-targets.json'), JSON.stringify({ buildBytes: 100, wastelandAssetBytes: 100, runtimeFileBytes: 100, ordinaryTrackedFileBytes: 100, lookSheetBytes: 100, lookDirectoryBytes: 100, mergeAddedBytes: 100 }));
  put(join(root, 'public/assets/models/wasteland/rustwall/wall.glb'), 'fixture wall');
  put(join(root, 'docs/board/looks/fixture.jpg'), 'fixture review sheet');
  put(join(root, 'dist/fixture.bin'), '12345');
  git(root, 'add', '.');
  git(root, 'commit', '-m', 'fixture baseline');
  const base = git(root, 'rev-parse', 'HEAD');
  git(root, 'checkout', '-b', 'integration/wasteland');
  const live = join(home, 'live');
  git(root, 'worktree', 'add', live, 'master');
  put(join(live, 'dist/player-save-fixture.json'), '{"fictional":true}');
  put(join(live, 'dist/build-version.json'), JSON.stringify({ schema: 1, id: 'fixture-live-build', label: 'Fixture build', builtAt: old }));
  const evidencePath = join(root, 'docs/board/checks/full-tier.json');
  const statusPath = join(root, 'docs/board/STATUS.md');
  function evidence(overrides = {}) {
    const commit = git(root, 'rev-parse', 'HEAD');
    put(evidencePath, JSON.stringify({
      schema: 1, commit, time: now, tier: 'full', passed: true, dirty: false,
      startDirty: false, endDirty: false, endCommit: commit, complete: true,
      total: 213, completed: 213, failures: [], ...overrides,
    }));
  }
  return { home, root, live, base, evidencePath, statusPath, evidence };
}
function report(f) {
  const child = spawnSync(process.execPath, ['--import', pathToFileURL(guard).href, statusTool, '--root', f.root, '--live-root', f.live, '--now', now, '--json'], {
    cwd: f.root, encoding: 'utf8', shell: false, windowsHide: true, timeout: 15000,
    env: { ...process.env, GIT_OPTIONAL_LOCKS: '0' },
  });
  same(child.status, 0, `build-status CLI generates fixture status successfully: ${child.stderr.split(/\r?\n/).find(line => line.startsWith('Error')) || child.stderr.trim()}`);
  const value = JSON.parse(child.stdout);
  check(existsSync(f.statusPath), 'default destination is docs/board/STATUS.md');
  return { ...value, markdown: readFileSync(f.statusPath, 'utf8') };
}
function snapshot(root, ignored = new Set()) {
  const rows = [];
  function walk(path) {
    for (const entry of readdirSync(path, { withFileTypes: true })) {
      const item = join(path, entry.name);
      if (ignored.has(item)) continue;
      if (entry.isDirectory()) walk(item);
      else rows.push([item.slice(root.length), createHash('sha256').update(readFileSync(item)).digest('hex')]);
    }
  }
  walk(root);
  return rows.sort(([a], [b]) => a.localeCompare(b));
}

try {
  await test('clean exact-HEAD report', () => {
    const f = fixture('clean'); f.evidence();
    const result = report(f);
    same(result.observationCommit, f.base, 'observation names the full integration commit');
    same(result.integration.commit, f.base, 'integration HEAD is read from Git');
    same(result.integration.dirty, false, 'clean integration is reported clean');
    same(result.live.commit, f.base, 'live commit is read independently from its Git checkout');
    same(result.live.version, 'fixture-live-build', 'live build comes from its dist manifest');
    same(result.features, { 'hidden-road': 'dev', crew: 'beta', arena: 'on' }, 'every configured feature state is shown');
    same(result.fullRun.status, 'passed', 'clean successful full evidence is passed');
    same(result.fullRun.exactHead, true, 'only current clean full evidence qualifies as exact HEAD');
    for (const value of [f.base, 'fixture-live-build', 'hidden-road', 'crew', 'arena', 'dev', 'beta', 'on', '2026-09-23']) {
      check(result.markdown.includes(value), `status page includes ${value}`);
    }
    check(/observ/i.test(result.markdown), 'page labels its observation commit explicitly');
    check(/backup/i.test(result.markdown), 'page includes backup state');
    same(result.sizes.rows.find(row => row.key === 'buildBytes').current, 5, 'build size is measured in bytes');
    check(result.markdown.includes('## Size targets'), 'status reports size targets');
  });

  await test('size changes compare with the previous observation', () => {
    const f = fixture('size-delta'); f.evidence();
    const first = report(f);
    same(first.sizes.rows.find(row => row.key === 'buildBytes').previous, null, 'first observation has no invented baseline');
    put(join(f.root, 'dist/fixture.bin'), '123456789');
    const second = report(f);
    const build = second.sizes.rows.find(row => row.key === 'buildBytes');
    same(build.current, 9, 'growth is measured');
    same(build.previous, 5, 'previous observation is retained');
    check(second.markdown.includes('+4 B'), 'growth appears as a signed delta');
    const third = report(f);
    same(third.sizes.rows.find(row => row.key === 'buildBytes').previous, 9, 'repeated observation uses the immediately preceding measurement');
    check(third.markdown.includes('+0 B'), 'an unchanged repeated observation reports zero change');
    rmSync(join(f.root, 'dist/fixture.bin'));
    const missing = report(f);
    same(missing.sizes.rows.find(row => row.key === 'buildBytes').current, 0, 'empty build folder measures zero bytes');
    check(missing.markdown.includes('-9 B'), 'shrinkage appears as a signed delta');
    rmSync(join(f.root, 'dist'), { recursive: true });
    same(report(f).sizes.rows.find(row => row.key === 'buildBytes').current, null, 'missing build folder is unavailable');
    put(f.statusPath, '| Item | Current | Change | Target |\n| Build `dist/` | 999999999999999999999999 B | +0 B | 100 B |\n');
    same(report(f).sizes.rows.find(row => row.key === 'buildBytes').previous, null, 'invalid prior measurement is rejected');
  });

  await test('default status collection does not inspect live metadata', () => {
    const f = fixture('offline-live'); f.evidence();
    const child = spawnSync(process.execPath, [statusTool, '--root', f.root, '--now', now, '--json'], {
      cwd: f.root, encoding: 'utf8', shell: false, windowsHide: true, timeout: 15000,
      env: { ...process.env, GIT_OPTIONAL_LOCKS: '0' },
    });
    same(child.status, 0, 'status runs without a live-root argument');
    const result = JSON.parse(child.stdout);
    same(result.live.commit, null, 'default status does not claim a live commit');
    same(result.live.version, null, 'default status does not claim a live build version');
  });

  await test('Git storage includes loose objects and a replacement binary counts as added', () => {
    const f = fixture('git-growth');
    const before = report(f).sizes.rows.find(row => row.key === 'gitObjectBytes').current;
    put(join(f.root, 'large.txt'), randomBytes(16384).toString('hex'));
    git(f.root, 'add', 'large.txt'); git(f.root, 'commit', '-m', 'grow loose object storage');
    const after = report(f).sizes.rows.find(row => row.key === 'gitObjectBytes').current;
    check(after > before, 'Git storage grows when new loose objects are committed');
    put(join(f.root, 'source.bin'), 'A'.repeat(200));
    git(f.root, 'add', 'source.bin'); git(f.root, 'commit', '-m', 'old binary');
    git(f.root, 'checkout', '-b', 'lane/sim/binary-replacement');
    put(join(f.root, 'source.bin'), 'B'.repeat(150));
    git(f.root, 'add', 'source.bin'); git(f.root, 'commit', '-m', 'replace binary');
    git(f.root, 'checkout', 'integration/wasteland');
    git(f.root, 'merge', '--no-ff', 'lane/sim/binary-replacement', '-m', 'merge replacement');
    const added = report(f).sizes.rows.find(row => row.key === 'mergeAddedBytes').current;
    check(added >= 150, 'new replacement blob counts despite a smaller tip tree');
    git(f.root, 'checkout', '-b', 'lane/sim/transient-binary');
    put(join(f.root, 'transient.bin'), randomBytes(8192).toString('hex'));
    git(f.root, 'add', 'transient.bin'); git(f.root, 'commit', '-m', 'add temporary binary');
    rmSync(join(f.root, 'transient.bin'));
    git(f.root, 'add', '-u'); git(f.root, 'commit', '-m', 'remove temporary binary');
    git(f.root, 'checkout', 'integration/wasteland');
    git(f.root, 'merge', '--no-ff', 'lane/sim/transient-binary', '-m', 'merge transient history');
    const transient = report(f).sizes.rows.find(row => row.key === 'mergeAddedBytes').current;
    check(transient >= 16384, 'binary added and removed in lane history still counts toward merge');
  });

  for (const [label, overrides, expected] of [
    ['missing', null, 'missing'],
    ['failed', { passed: false, failures: ['tools/test-fixture.mjs'] }, 'failed'],
    ['dirty', { dirty: true, startDirty: true }, 'dirty'],
    ['stale', { commit: '0'.repeat(40), endCommit: '0'.repeat(40) }, 'stale'],
    ['wrong tier', { tier: 'lane' }, null],
    ['missing source state', { dirty: undefined }, null],
    ['missing time', { time: undefined }, null],
  ]) await test(`${label} evidence cannot turn HEAD green`, () => {
    const f = fixture(`evidence-${label.replaceAll(' ', '-')}`);
    if (overrides) f.evidence(overrides);
    const result = report(f);
    same(result.fullRun.exactHead, false, `${label} evidence does not qualify as exact-HEAD green`);
    check(result.fullRun.status !== 'passed', `${label} evidence does not claim a passing current full run`);
    if (expected) same(result.fullRun.status, expected, `${label} evidence has an honest status`);
  });

  // Reviewer regression: a passing flag cannot override absent provenance or
  // contradictory coverage. Keep this fixture aligned with the runner ledger.
  const ledgerFixture = fixture('ledger-schema');
  const missingFields = ['complete', 'startDirty', 'endDirty', 'endCommit', 'total', 'completed', 'failures'];
  for (const [label, overrides] of [
    ...missingFields.map(field => [`missing ${field}`, { [field]: undefined }]),
    ['contradictory completion and failures', { completed: 0, failures: ['tools/test-fixture.mjs'] }],
    ['incomplete suite count', { completed: 212 }],
    ['failed suite in passing ledger', { failures: ['tools/test-fixture.mjs'] }],
    ['zero-suite passing ledger', { total: 0, completed: 0 }],
    ['noninteger suite counts', { total: 1.5, completed: 1.5 }],
    ['nonboolean completion', { complete: 'true' }],
    ['nonboolean start state', { startDirty: 'false' }],
    ['nonboolean end state', { endDirty: 'false' }],
    ['nonarray failures', { failures: '' }],
    ['explicitly incomplete passing ledger', { complete: false, completed: 0 }],
  ]) await test(`${label} cannot certify HEAD`, () => {
    ledgerFixture.evidence(overrides);
    const result = report(ledgerFixture);
    same(result.fullRun.exactHead, false, `${label} cannot certify exact HEAD`);
    check(result.fullRun.status !== 'passed', `${label} stays visibly unsuccessful`);
  });
  await test('valid failed and unfinished ledgers remain unsuccessful', () => {
    for (const overrides of [
      { passed: false, failures: ['tools/test-fixture.mjs'] },
      { passed: false, complete: false, completed: 0 },
    ]) {
      ledgerFixture.evidence(overrides);
      const result = report(ledgerFixture);
      same(result.fullRun.exactHead, false, 'valid failed or unfinished evidence never certifies HEAD');
      check(result.fullRun.status !== 'passed', 'failed or unfinished run remains visibly unsuccessful');
    }
  });

  await test('malformed evidence and absent build manifest', () => {
    const f = fixture('malformed');
    put(f.evidencePath, '{unfinished');
    rmSync(join(f.live, 'dist/build-version.json'));
    const result = report(f);
    same(result.fullRun.exactHead, false, 'malformed JSON cannot certify HEAD');
    check(result.fullRun.status !== 'passed', 'malformed evidence remains visibly unverified');
    check(result.live.version == null || /missing|unknown|unavailable/i.test(result.live.version), 'absent live manifest has no invented build version');
    check(/missing|unknown|unavailable/i.test(result.markdown), 'missing metadata is visible in the page');
  });

  await test('source edits after successful evidence', () => {
    const f = fixture('source-dirty'); f.evidence();
    put(join(f.root, 'source.txt'), 'edited since full run\n');
    const result = report(f);
    same(result.integration.dirty, true, 'current tracked source edits are visible');
    same(result.fullRun.exactHead, false, 'clean old evidence cannot certify dirty current source');
  });

  await test('later metadata commit must not inherit green', () => {
    const f = fixture('later-commit'); f.evidence();
    report(f);
    git(f.root, 'add', '-f', 'docs/board/STATUS.md');
    git(f.root, 'commit', '-m', 'record observed status');
    const next = git(f.root, 'rev-parse', 'HEAD');
    check(next !== f.base, 'fixture makes a later metadata-only commit');
    const result = report(f);
    same(result.observationCommit, next, 'refresh explicitly names the new observation commit');
    same(result.fullRun.exactHead, false, 'metadata descendants need their own full run');
    same(result.fullRun.status, 'stale', 'old successful evidence is stale after metadata commit');
  });

  await test('lanes and backup inspection has no side effects', () => {
    const f = fixture('lanes'); f.evidence();
    const clean = join(f.home, 'clean-lane'), dirty = join(f.home, 'dirty-lane'), pending = join(f.home, 'pending-lane');
    git(f.root, 'worktree', 'add', '-b', 'codex/merged-clean', clean);
    git(f.root, 'worktree', 'add', '-b', 'codex/merged-dirty', dirty);
    put(join(dirty, 'untracked.txt'), 'keep this work\n');
    git(f.root, 'worktree', 'add', '-b', 'codex/pending', pending);
    put(join(pending, 'pending.txt'), 'unmerged work\n');
    git(pending, 'add', '.'); git(pending, 'commit', '-m', 'pending fixture work');
    put(join(pending, 'fresh-work.txt'), 'new uncommitted work\n');
    git(f.root, 'branch', 'codex/parked', git(pending, 'rev-parse', 'HEAD'));
    for (const name of ['codex/gfx-01-p2', 'codex/egg-02-p1',
      'codex/gfx-01-p2-neutral-review', 'codex/bal-02', 'codex/notes-only'])
      git(f.root, 'branch', name, f.base);
    const before = snapshot(f.home);
    const result = report(f);
    const lane = name => result.lanes.find(row => row.branch === name);
    check(lane('codex/pending'), 'branch with unmerged work appears');
    same(lane('codex/pending').merged, false, 'pending lane is not merged');
    same(lane('codex/pending').removable, false, 'pending lane cannot be removed');
    same(lane('codex/pending').ageDays, 3, 'lane age uses last branch commit and observation time');
    check(lane('codex/pending').lastCommit?.includes('2026-09-20'), 'unmerged branch reports last commit time');
    check(lane('codex/pending').holds.includes('pending.txt'), 'unmerged branch reports retained committed work');
    same(lane('codex/pending').card, 'unknown', 'branch without a card ID is marked unknown');
    same(lane('codex/gfx-01-p2').card, 'GFX-01-P2', 'phase-2 graphics card keeps its full ID');
    same(lane('codex/egg-02-p1').card, 'EGG-02-P1', 'phase-1 canyon card keeps its full ID');
    same(lane('codex/gfx-01-p2-neutral-review').card, 'GFX-01-P2',
      'branch description after the phase does not become part of the card ID');
    same(lane('codex/bal-02').card, 'BAL-02', 'ordinary base card ID is unchanged');
    same(lane('codex/notes-only').card, 'unknown', 'branch without a card ID remains unknown');
    check(result.markdown.includes('## Unmerged branches for idle review'), 'status presents unmerged branch review list');
    check(lane('codex/pending').activity.includes('exact activity time unknown'), 'dirty worktree is not falsely dated by its last commit');
    check(lane('codex/pending').holds.includes('fresh-work.txt'), 'uncommitted file is named in retained work');
    check(lane('codex/parked'), 'unmerged branch without a worktree is still listed');
    same(lane('codex/merged-clean').removable, true, 'clean merged lane can be removed');
    same(lane('codex/merged-dirty').merged, true, 'dirty lane can still have merged commits');
    same(lane('codex/merged-dirty').dirty, true, 'untracked work makes a merged lane dirty');
    same(lane('codex/merged-dirty').removable, false, 'dirty merged lane is never eligible for removal');
    check(!result.lanes.some(row => ['master', 'integration/wasteland'].includes(row.branch) && row.removable), 'live and integration roots cannot be removal candidates');
    check(/remote.*(?:none|missing|absent|unconfigured|unavailable)|(?:none|missing|absent|unconfigured|unavailable).*remote/i.test(result.markdown), 'absent remote backup is explicit');
    same(snapshot(f.home, new Set([f.statusPath])), before, 'report writes only STATUS: repositories, live manifest, branches and all worktrees survive byte-for-byte');
    git(f.root, 'remote', 'add', 'origin', join(f.home, 'offline-remote.git'));
    git(f.root, 'update-ref', 'refs/remotes/origin/master', f.base);
    git(f.root, 'update-ref', 'refs/remotes/origin/integration/wasteland', f.base);
    const withRemote = snapshot(f.home, new Set([f.statusPath]));
    const backed = report(f);
    check(backed.markdown.includes('origin'), 'configured remote backup is named');
    check(backed.markdown.includes('master') && backed.markdown.includes('integration/wasteland'), 'both backup branches are reported');
    check(/local|rollback|dist-previous/i.test(backed.markdown), 'local backup availability is stated');
    same(snapshot(f.home, new Set([f.statusPath])), withRemote, 'backup inspection never fetches, pushes or removes a worktree');
  });

  async function runFixture(f, args, { fail = false, during = () => {} } = {}) {
    return runTests(args, {
      projectRoot: f.root, now: () => new Date(now),
      discover: () => ['tools/test-fixture.mjs'],
      run: async plan => {
        during();
        return { exitCode: fail ? 1 : 0, passed: fail ? 0 : plan.length, total: plan.length,
          failures: fail ? ['tools/test-fixture.mjs'] : [], notRun: 0, durationMs: 1,
          results: plan.map(task => ({ suite: task.suite, label: task.label, passed: !fail, exitCode: fail ? 1 : 0 })) };
      }, log: () => {}, error: () => {},
    });
  }
  for (const fail of [false, true]) await test(`runner records ${fail ? 'failed' : 'passed'} full evidence`, async () => {
    const f = fixture(`runner-${fail}`);
    same(await runFixture(f, ['--tier', 'full', '--json'], { fail }), fail ? 1 : 0, 'recording preserves run exit code');
    check(existsSync(f.evidencePath), 'complete full run writes persistent evidence');
    const evidence = JSON.parse(readFileSync(f.evidencePath, 'utf8'));
    same(evidence.commit, f.base, 'evidence records the commit actually tested');
    same(evidence.time, now, 'evidence records the full-run time');
    same(evidence.tier, 'full', 'evidence names its tier');
    same(evidence.passed, !fail, 'evidence records passing and failing results honestly');
    same(evidence.dirty, false, 'clean fixture source is recorded clean');
    const status = report(f);
    same(status.fullRun.exactHead, !fail, 'status accepts complete real writer output only when passed');
    same(status.fullRun.status, fail ? 'failed' : 'passed', 'real writer ledger retains its pass or fail result');
  });
  for (const timing of ['before', 'during']) await test(`runner captures source edits ${timing} testing`, async () => {
    const f = fixture(`runner-dirty-${timing}`);
    const edit = () => put(join(f.root, 'source.txt'), 'source edit\n');
    if (timing === 'before') edit();
    await runFixture(f, ['--tier', 'full'], { during: timing === 'during' ? edit : () => {} });
    check(existsSync(f.evidencePath), 'dirty run still writes honest evidence');
    same(JSON.parse(readFileSync(f.evidencePath, 'utf8')).dirty, true, `${timing}-run edit cannot produce clean evidence`);
  });
  await test('runner cannot certify a commit made during testing', async () => {
    const f = fixture('runner-head-changed');
    await runFixture(f, ['--tier', 'full'], { during: () => {
      put(join(f.root, 'source.txt'), 'new committed source\n');
      git(f.root, 'add', 'source.txt'); git(f.root, 'commit', '-m', 'concurrent change');
    } });
    check(existsSync(f.evidencePath), 'changed HEAD run has evidence');
    const evidence = JSON.parse(readFileSync(f.evidencePath, 'utf8'));
    check(evidence.dirty === true || evidence.passed === false, 'changing HEAD during execution invalidates its clean pass');
    same(evidence.commit, f.base, 'run evidence keeps its starting commit');
  });
  await test('runner excludes only its evidence from source dirt', async () => {
    const f = fixture('runner-evidence-dirty'); f.evidence();
    git(f.root, 'add', '-f', 'docs/board/checks/full-tier.json');
    git(f.root, 'commit', '-m', 'previous full evidence');
    f.evidence({ passed: false });
    await runFixture(f, ['--tier', 'full']);
    same(JSON.parse(readFileSync(f.evidencePath, 'utf8')).dirty, false, 'rewriting full-tier evidence does not contaminate source state');
    put(join(f.root, 'notes.md'), 'untracked documentation change\n');
    await runFixture(f, ['--tier', 'full']);
    same(JSON.parse(readFileSync(f.evidencePath, 'utf8')).dirty, true, 'untracked documentation is still dirty source');
  });
  await test('filtered, listed and merge runs preserve full evidence', async () => {
    const f = fixture('runner-partial'); f.evidence({ passed: false });
    const before = readFileSync(f.evidencePath, 'utf8');
    for (const args of [['--tier', 'full', '--filter', 'fixture'], ['--tier', 'full', '--list'], ['--tier', 'merge']]) {
      await runFixture(f, args);
      same(readFileSync(f.evidencePath, 'utf8'), before, `${args.join(' ')} never overwrites complete full-tier evidence`);
    }
  });
} finally {
  // Only the unique temporary fixture directory created above is removed.
  rmSync(sandbox, { recursive: true, force: true });
}
for (const failure of failures) console.error(`FAIL ${failure}`);
console.log(`Build status: ${checks} checks, ${failures.length} failing scenarios.`);
if (failures.length) process.exitCode = 1;
