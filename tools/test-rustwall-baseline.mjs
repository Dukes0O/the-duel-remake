import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {after, test} from 'node:test';
import {fileURLToPath} from 'node:url';

// HK-RUSTWALL-BASELINE, SPEC 0.8: preserve the synthetic validator inputs.
// These are a test recipe, not recorded browser timings or an art verdict.
const root = fileURLToPath(new URL('../', import.meta.url));
const fixturePath = 'tools/fixtures/rustwall-frame-baseline.json';
const expected = {
  schemaVersion: 1,
  kind: 'synthetic-frame-test-baseline',
  baselineCommit: '5a994ad1b99f6a90734f960cb89dbd5eb26e6675',
  samples: 600,
  warmup: 20,
  generation: {
    cpu: {baseMs: 4, period: 7, incrementMs: .11, highOffsetMs: .8, approachOffsetMs: .25},
    raf: {baseMs: 16, period: 9, incrementMs: .07, highOffsetMs: .3, approachOffsetMs: .1},
    mirrorRefreshPeriod: 2,
    warmEndTimestampMs: 1000,
  },
  defaults: {cpuScale: 1, rafScale: 1, draws: 90, triangles: 50000},
  runs: {
    a1: {cpuScale: 1, rafScale: 1, draws: 90, triangles: 50000},
    b: {cpuScale: 1.08, rafScale: 1.06, draws: 96, triangles: 51200},
    a2: {cpuScale: 1.02, rafScale: 1.01, draws: 90, triangles: 50000},
  },
};
let checks = 0;
after(() => console.log(`Rustwall baseline: ${checks} checks.`));

function command(repo, executable, args) {
  const env = {...process.env};
  // Nested Node test contexts suppress the child reporter output.
  delete env.NODE_TEST_CONTEXT;
  // A caller's Git environment must never redirect this fixture to shared history.
  for (const name of Object.keys(env)) if (name.startsWith('GIT_')) delete env[name];
  Object.assign(env, {GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: join(repo, '.empty-git-global-config')});
  return spawnSync(executable, args, {
    cwd: repo, env, encoding: 'utf8', shell: false, windowsHide: true, timeout: 30000,
  });
}

function git(repo, ...args) {
  const result = command(repo, 'git', args);
  assert.equal(result.status, 0, `Temporary repository setup: git ${args.join(' ')}\n${result.stderr}`);
  return result.stdout.trim();
}

function put(repo, path, content) {
  const target = join(repo, path);
  mkdirSync(dirname(target), {recursive: true});
  writeFileSync(target, content);
}

function runFrames(repo) {
  return command(repo, process.execPath, [
    '--test', '--test-reporter=tap', 'tools/test-rustwall-frame.mjs',
  ]);
}

function passingVerdicts(result, label) {
  assert.equal(result.status, 0, `${label}\n${result.stdout}\n${result.stderr}`);
  for (const name of [
    'Rustwall frame report rejects missing samples, fabricated summaries and unstable review state',
    'Rustwall A1/B/A2 compares both exact baselines in every quality and camera stratum',
  ]) {
    assert.ok(result.stdout.includes(`- ${name}\n`), `${label}: existing verdict '${name}' retained`);
  }
  assert.match(result.stdout, /# tests 2\r?\n/, `${label}: both existing tests run`);
  assert.match(result.stdout, /# pass 2\r?\n/, `${label}: both existing verdicts pass`);
  assert.match(result.stdout, /# fail 0\r?\n/, `${label}: no failure hidden`);
  assert.match(result.stdout, /# skipped 0\r?\n/, `${label}: neither test skipped`);
}

test('Rustwall stores the exact synthetic baseline identity and numerical recipe in a small tools fixture', () => {
  checks++;
  const path = join(root, fixturePath);
  assert.ok(existsSync(path), 'Rustwall baseline must be checked in under tools instead of requiring Git history');
  const bytes = readFileSync(path);
  assert.ok(bytes.length < 4096, 'Rustwall baseline is a small numeric recipe, without images or captures');
  const fixture = JSON.parse(bytes.toString('utf8'));
  assert.deepEqual(fixture, expected,
    'Rustwall baseline preserves the pinned full commit and every original synthetic sample-generation number');
});

test('Both existing Rustwall frame verdicts survive a repository without the historical baseline commit', () => {
  checks++;
  const scratch = resolve(root, '.qa-dist');
  mkdirSync(scratch, {recursive: true});
  const repo = mkdtempSync(join(scratch, 'rustwall-baseline-'));
  try {
    // Copy only the suite and its real transitive dependencies. No models,
    // browser, saves, worktree Git metadata, or runtime dependencies are used.
    for (const path of [
      'tools/test-rustwall-frame.mjs',
      'tools/scenarios/rustwall-frame.mjs',
      'tools/performance-review.js',
      'tools/render-profile.js',
      'src/phase-diagnostics.js',
    ]) put(repo, path, readFileSync(join(root, path)));
    put(repo, 'package.json', JSON.stringify({private: true, type: 'module'}) + '\n');
    if (existsSync(join(root, fixturePath))) put(repo, fixturePath, readFileSync(join(root, fixturePath)));
    git(repo, 'init', '--quiet');
    git(repo, 'add', '--all');
    git(repo, '-c', 'user.name=Rustwall acceptance fixture',
      '-c', 'user.email=rustwall-fixture@example.invalid',
      '-c', 'core.hooksPath=nonexistent-fixture-hooks', 'commit', '--quiet', '-m', 'Independent test fixture');
    assert.equal(git(repo, 'rev-list', '--count', 'HEAD'), '1', 'Fixture has only its own new commit');
    assert.equal(git(repo, 'remote'), '', 'Fixture has no remote');
    const absent = command(repo, 'git', ['rev-parse', '--verify', '5a994ad^{commit}']);
    assert.notEqual(absent.status, 0, 'The historical baseline really is unavailable in the independent repository');
    passingVerdicts(runFrames(repo),
      'Rustwall frame verdicts must pass without resolving historical commit 5a994ad');

    // Passing must depend on the checked-in recipe, not a new hard-coded SHA
    // with an unused JSON file beside it. Delete only this temporary copy.
    rmSync(join(repo, fixturePath));
    const missing = runFrames(repo);
    assert.notEqual(missing.status, 0, 'Rustwall frame suite must require its numerical baseline fixture');
    assert.match(missing.stdout + missing.stderr, /rustwall-frame-baseline\.json|ENOENT/,
      'Removing the fixture fails because its numeric baseline is unavailable');
  } finally {
    assert.equal(dirname(resolve(repo)), scratch, 'Cleanup stays inside this lane scratch directory');
    rmSync(repo, {recursive: true});
  }
});
