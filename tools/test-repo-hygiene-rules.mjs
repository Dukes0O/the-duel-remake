import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { discoverSuites, selectPlan } from './run-tests.mjs';

// CLEAN-01: all scanned paths belong to throwaway fixtures. No game save,
// browser, build output, or live checkout is opened by these checks.
const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const hygieneTool = join(projectRoot, 'tools/test-repo-hygiene.mjs');
const auditTool = join(projectRoot, 'tools/repo-audit.mjs');
const sandbox = mkdtempSync(join(tmpdir(), 'duel-repo-hygiene-'));
let checks = 0;
const failures = [];
const same = (actual, expected, label) => { checks++; assert.deepEqual(actual, expected, label); };
const check = (value, label) => { checks++; assert.ok(value, label); };
function test(label, action) {
  try { action(); } catch (error) { failures.push(`${label}: ${error.message}`); }
}
function put(root, name, contents = 'fixture\n') {
  const path = join(root, name);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, contents);
}
function fixture(name) {
  const root = join(sandbox, name);
  mkdirSync(root, { recursive: true });
  put(root, 'package.json', '{"type":"module"}\n');
  put(root, 'src/main.js', 'export const game = true;\n');
  put(root, 'public/assets/models/current.glb', 'current runtime asset');
  return root;
}
function run(tool, root) {
  const result = spawnSync(process.execPath, [tool, '--root', root, '--json'], {
    cwd: root, encoding: 'utf8', shell: false, windowsHide: true, timeout: 15000,
    env: { ...process.env, GIT_OPTIONAL_LOCKS: '0' },
  });
  check(!result.error, `tool launches: ${result.error?.message}`);
  let report;
  try { report = JSON.parse(result.stdout); }
  catch { throw Error(`expected a JSON report; exit ${result.status}; stderr: ${result.stderr.trim() || '(empty)'}`); }
  return { ...result, report };
}
function git(root, ...args) {
  const result = spawnSync('git', ['-C', root, ...args], {
    encoding: 'utf8', shell: false, windowsHide: true,
    env: { ...process.env, GIT_OPTIONAL_LOCKS: '0' },
  });
  same(result.status, 0, `fixture Git ${args.join(' ')}: ${result.stderr.trim()}`);
  return result.stdout.trim();
}
function snapshot(root) {
  const rows = [];
  function walk(path) {
    for (const entry of readdirSync(path, { withFileTypes: true })) {
      const item = join(path, entry.name);
      if (entry.isDirectory()) walk(item);
      else rows.push([relative(root, item).replaceAll('\\', '/'), createHash('sha256').update(readFileSync(item)).digest('hex')]);
    }
  }
  walk(root);
  return rows.sort(([a], [b]) => a.localeCompare(b));
}

try {
  test('lane tier always runs placement checks', () => {
    const suites = discoverSuites();
    check(suites.includes('tools/test-repo-hygiene.mjs'), 'placement suite is discovered');
    const lane = selectPlan(suites, { tier: 'lane', affected: ['tools/test-speed-format.mjs'] });
    check(lane.some(task => task.suite === 'tools/test-repo-hygiene.mjs'),
      'unrelated changes still run the placement check in the lane tier');
  });

  test('correctly placed files pass', () => {
    const root = fixture('valid-placement');
    const { status, report } = run(hygieneTool, root);
    same(status, 0, 'valid repository exits successfully');
    same(report.failures, [], 'runtime assets and normal source files have valid homes');
  });

  for (const [label, path, contents] of [
    ['raw audio source in public', 'public/assets/audio/engine-source.wav', 'RAW SOURCE'],
    ['raw tire source in public', 'public/assets/audio/tire-squeal.wav', 'RAW SOURCE'],
    ['Blender source in public', 'public/assets/models/source.blend', 'BLENDER'],
    ['Blender script in public', 'public/assets/models/source.py', 'SOURCE'],
    ['raw review evidence in docs', 'docs/board/looks/race-capture.png', 'RAW CAPTURE'],
    ['raw audio in checks', 'docs/board/checks/race-capture.wav', 'RAW AUDIO'],
    ['raw video in tools', 'tools/captures/race.webm', 'RAW VIDEO'],
    ['raw JPG in tools', 'tools/captures/race.jpg', 'RAW JPG'],
    ['raw WebP in checks', 'docs/board/checks/race.webp', 'RAW WEBP'],
    ['unexpected root file', 'stray-output.bin', 'scratch'],
  ]) test(`${label} fails placement`, () => {
    const root = fixture(label.replaceAll(' ', '-').toLowerCase());
    put(root, path, contents);
    const { status, report } = run(hygieneTool, root);
    same(status, 1, `${label} is a failing placement violation`);
    check(Array.isArray(report.failures), 'failure list is machine readable');
    check(report.failures.some(failure => String(failure).replaceAll('\\', '/').includes(path)),
      `failure identifies ${path}`);
  });

  test('a kept audio take has a valid home in audio-src', () => {
    const root = fixture('kept-audio');
    put(root, 'audio-src/voices/gatekeeper-welcome.mp3', 'kept voice take');
    const { status, report } = run(hygieneTool, root);
    same(status, 0, 'SPEC 0.9 kept audio passes placement');
    same(report.failures, [], 'audio in audio-src is a kept source, not a raw capture');
  });

  test('size targets report without blocking a lane', () => {
    const root = fixture('large-runtime-file');
    const path = 'public/assets/models/large-runtime.glb';
    put(root, path, Buffer.alloc(9 * 1024 * 1024, 1));
    const { status, report } = run(hygieneTool, root);
    same(status, 0, 'an oversized runtime asset is advisory');
    same(report.failures, [], 'size alone creates no placement failures');
    check(report.targets && typeof report.targets === 'object', 'size target results are reported');
    check(JSON.stringify(report.targets).includes(path), 'advisory result identifies the large runtime file');
  });

  test('one round summary JPG has a valid review home', () => {
    const root = fixture('round-summary');
    put(root, 'docs/board/looks/crew/round-1.jpg', 'compressed review sheet');
    put(root, 'docs/board/looks/crew/round-1-review.md', '# Review\n');
    const { status, report } = run(hygieneTool, root);
    same(status, 0, 'the approved review sheet and note pass placement');
    same(report.failures, [], 'round summary JPG is not treated as a raw capture');
  });

  test('audit reports cleanup candidates without changing files', () => {
    const root = fixture('audit');
    put(root, 'public/assets/models/orphan.glb', 'unreferenced runtime asset');
    put(root, 'src/orphan.js', 'export const unusedThing = true;\n');
    put(root, 'src/tool-used.js', 'export const usedThing = true;\n');
    put(root, 'tools/consumer.mjs', "import {usedThing} from '../src/tool-used.js';\n");
    put(root, 'src/core-entry.js', 'export const coreEntry = true;\n');
    put(root, 'tools/run-suite.mjs', "const CORE_SUITE = 'src/core-entry.js';\n");
    put(root, 'src/comment-only.js', 'export const trulyUnused = true;\n');
    put(root, 'tools/comment.mjs', '// src/comment-only.js has no import or entry\n');
    put(root, 'src/feature-flags.js', "export const FEATURE_STATES = Object.freeze({ 'old-switch': 'on' });\n");
    put(root, 'tests/legacy-removed.test.js', 'export const removedBehavior = true;\n');
    put(root, 'docs/README.md', '# Current docs\n\n- [Index](README.md)\n');
    put(root, 'docs/extra.md', '# Unindexed fixture note\n');
    put(root, '.lanes/old-lane/note.txt', 'idle lane fixture\n');
    const before = snapshot(root);
    const { status, report } = run(auditTool, root);
    same(status, 0, 'audit completes without treating candidates as failures');
    for (const key of ['largestFiles', 'folderSizes', 'runtimeAssetCandidates', 'moduleCandidates',
      'exportCandidates', 'removedFeatureTestCandidates', 'unindexedDocs', 'fullyOnSwitches', 'lanes']) {
      check(report[key] !== undefined, `audit includes ${key}`);
    }
    check(JSON.stringify(report.largestFiles).includes('orphan.glb'), 'largest file list names fixture files');
    check(JSON.stringify(report.folderSizes).includes('public'), 'folder sizes include public assets');
    check(JSON.stringify(report.runtimeAssetCandidates).includes('orphan.glb'), 'unreferenced runtime asset is flagged');
    check(JSON.stringify(report.moduleCandidates).includes('orphan.js'), 'unimported module is flagged');
    check(!JSON.stringify(report.moduleCandidates).includes('tool-used.js'), 'module imported only by a tool is retained');
    check(!JSON.stringify(report.moduleCandidates).includes('core-entry.js'), 'named test entry is retained');
    check(report.moduleCandidates.some(row => row.path === 'src/comment-only.js'),
      'a comment mentioning a module does not prove it is used');
    check(JSON.stringify(report.exportCandidates).includes('unusedThing'), 'unreferenced export is flagged');
    check(!report.exportCandidates.some(row => row.name === 'usedThing'), 'export imported only by a tool is retained');
    check(JSON.stringify(report.removedFeatureTestCandidates).includes('legacy-removed.test.js'),
      'test for removed behavior is flagged');
    check(JSON.stringify(report.unindexedDocs).includes('extra.md'), 'unindexed document is flagged');
    check(JSON.stringify(report.fullyOnSwitches).includes('old-switch'), 'fully enabled switch is flagged');
    check(JSON.stringify(report.lanes).includes('old-lane'), 'stale lane folder is reported, not removed');
    same(snapshot(root), before, 'audit leaves every fixture file unchanged');
  });

  test('audit distinguishes merged, dirty, and unmerged lane worktrees', () => {
    const root = fixture('git-lanes/integration');
    git(root, 'init', '-b', 'integration/wasteland');
    git(root, 'config', 'user.name', 'Repo audit fixture');
    git(root, 'config', 'user.email', 'fixture@example.invalid');
    git(root, 'add', '.');
    git(root, 'commit', '-m', 'fixture baseline');
    const mergedPath = join(sandbox, 'git-lanes', 'lane-merged');
    const unmergedPath = join(sandbox, 'git-lanes', 'lane-unmerged');
    git(root, 'worktree', 'add', '-b', 'lane/tool/merged', mergedPath);
    git(root, 'worktree', 'add', '-b', 'lane/tool/unmerged', unmergedPath);
    put(mergedPath, 'uncommitted-note.txt', 'dirty lane\n');
    put(unmergedPath, 'new-work.txt', 'unmerged lane work\n');
    git(unmergedPath, 'add', 'new-work.txt');
    git(unmergedPath, 'commit', '-m', 'unmerged fixture work');
    const { status, report } = run(auditTool, root);
    same(status, 0, 'audit reads temporary worktree state');
    const merged = report.lanes.find(row => row.branch === 'lane/tool/merged');
    const unmerged = report.lanes.find(row => row.branch === 'lane/tool/unmerged');
    check(merged, 'merged lane appears in audit');
    check(unmerged, 'unmerged lane appears in audit');
    same(merged.mergedIntoIntegration, true, 'merged ancestry is reported');
    same(merged.dirty, true, 'uncommitted lane work is reported');
    same(unmerged.mergedIntoIntegration, false, 'unmerged lane is not called merged');
    same(unmerged.dirty, false, 'clean lane is reported clean');
    check(typeof merged.lastActivity === 'string' && merged.lastActivity.length > 0,
      'merged lane has last activity time');
    check(typeof unmerged.lastActivity === 'string' && unmerged.lastActivity.length > 0,
      'unmerged lane has last activity time');
    check(existsSync(mergedPath) && existsSync(unmergedPath), 'audit leaves both lane folders in place');
  });
} finally {
  rmSync(sandbox, { recursive: true, force: true });
}

console.log(`CLEAN-01 repository hygiene: ${checks} checks, ${failures.length} failures.`);
for (const failure of failures) console.error(`FAIL ${failure}`);
if (failures.length) process.exitCode = 1;
