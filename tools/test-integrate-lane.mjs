import assert from 'node:assert/strict';
import test from 'node:test';
import {mkdtempSync, mkdirSync, readFileSync, writeFileSync, existsSync, rmSync, renameSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {integrateLane} from './integrate-lane.mjs';

const git = (cwd, ...args) => execFileSync('git', ['-C', cwd, ...args],
  {encoding: 'utf8', windowsHide: true}).trim();
function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'duel-fac02-'));
  t.after(() => rmSync(root, {recursive: true, force: true}));
  const integration = join(root, 'integration'); mkdirSync(integration);
  git(integration, 'init', '-b', 'integration/wasteland');
  git(integration, 'config', 'core.autocrlf', 'false');
  git(integration, 'config', 'user.name', 'FAC fixture');
  git(integration, 'config', 'user.email', 'fac@example.invalid');
  mkdirSync(join(integration, 'docs/board'), {recursive: true});
  writeFileSync(join(integration, '.gitignore'), '.evidence/\nnode_modules/\n');
  writeFileSync(join(integration, 'docs/board/run-log.md'), '# Run log\n');
  writeFileSync(join(integration, 'docs/board/STATUS.md'), '# Status\n');
  writeFileSync(join(integration, 'shared.txt'), 'base\n');
  git(integration, 'add', '.'); git(integration, 'commit', '-m', 'base');
  const base = git(integration, 'rev-parse', 'HEAD');
  const refreshStatus = cwd => writeFileSync(join(cwd, 'docs/board/STATUS.md'), '# Refreshed\n');
  function lane(name, content = name + '\n', file = name + '.txt') {
    const path = join(root, name), branch = 'codex/' + name;
    git(integration, 'worktree', 'add', '-b', branch, path, base);
    writeFileSync(join(path, file), content);
    git(path, 'add', file); git(path, 'commit', '-m', name);
    const commit = git(path, 'rev-parse', 'HEAD');
    mkdirSync(join(path, '.evidence'), {recursive: true});
    writeFileSync(join(path, '.evidence/build.log'), 'vite build\nbuilt in 1 s\n');
    const evidence = {schema: 1, card: name.toUpperCase(), commit,
      lane: {commit, command: ['node', 'tools/run-tests.mjs', '--tier', 'lane', '--changed', '--jobs', '4', '--json'],
        result: {schema: 1, kind: 'result', tier: 'lane', jobs: 4, exitCode: 0, passed: 3, total: 3, notRun: 0, failures: [], durationMs: 123}},
      build: {commit, command: ['npm', 'run', 'build'], exitCode: 0, durationMs: 1000, log: '.evidence/build.log'},
      review: {commit, reviewer: 'Director', passed: true}};
    return {integration, lane: path, card: name.toUpperCase(), evidence, refreshStatus};
  }
  return {root, integration, lane};
}

test('two independent green lanes merge promptly without invoking a gate or build', async t => {
  const f = fixture(t), a = f.lane('first'), b = f.lane('second'), start = Date.now();
  const first = await integrateLane(a), second = await integrateLane(b);
  assert.equal(first.merged, true); assert.equal(second.merged, true);
  assert.ok(Date.now() - start < 5 * 60 * 1000);
  assert.equal(readFileSync(join(f.integration, 'first.txt'), 'utf8'), 'first\n');
  assert.equal(readFileSync(join(f.integration, 'second.txt'), 'utf8'), 'second\n');
  assert.equal(git(f.integration, 'status', '--porcelain'), '');
  const lines = readFileSync(join(f.integration, 'docs/board/run-log.md'), 'utf8').split('\n').filter(line => line.startsWith('- '));
  assert.equal(lines.length, 2); assert.match(lines[0], /3\/3.*build.*Director/);
  assert.ok(existsSync(a.lane) && existsSync(b.lane), 'retained lanes stay by default');
});

test('stale, red, incomplete, missing build and absent review evidence prevent mutation', async t => {
  const f = fixture(t), options = f.lane('checks'), before = git(f.integration, 'rev-parse', 'HEAD');
  const changes = [e => e.commit = '0'.repeat(40), e => e.lane.result.exitCode = 1,
    e => e.lane.result.notRun = 1, e => e.lane.result.jobs = 8,
    e => e.build.log = '.evidence/missing.log', e => e.review.passed = false,
    e => e.review.commit = '0'.repeat(40), e => e.lane.command = ['node', 'tools/run-tests.mjs', '--tier', 'full']];
  for (const change of changes) {
    const evidence = structuredClone(options.evidence); change(evidence);
    await assert.rejects(integrateLane({...options, evidence}));
    assert.equal(git(f.integration, 'rev-parse', 'HEAD'), before);
  }
});

test('dirty integration or lane refuses a merge before metadata is touched', async t => {
  const f = fixture(t), options = f.lane('dirty'), before = git(f.integration, 'rev-parse', 'HEAD');
  writeFileSync(join(f.integration, 'docs/board/STATUS.md'), 'uncommitted shared metadata\n');
  await assert.rejects(integrateLane(options), /clean/);
  git(f.integration, 'restore', 'docs/board/STATUS.md');
  writeFileSync(join(options.lane, 'shared.txt'), 'uncommitted source\n');
  await assert.rejects(integrateLane(options), /clean/);
  assert.equal(git(f.integration, 'rev-parse', 'HEAD'), before);
});

test('a conflict aborts the merge and returns the lane for one new gate after fixing', async t => {
  const f = fixture(t), a = f.lane('left', 'left\n', 'shared.txt'), b = f.lane('right', 'right\n', 'shared.txt');
  await integrateLane(a); const before = git(f.integration, 'rev-parse', 'HEAD');
  const result = await integrateLane(b);
  assert.equal(result.merged, false); assert.equal(result.needsConflictFix, true);
  assert.equal(git(f.integration, 'rev-parse', 'HEAD'), before);
  assert.equal(git(f.integration, 'status', '--porcelain'), '');
  assert.equal(readFileSync(join(b.lane, 'shared.txt'), 'utf8'), 'right\n');
});

test('caller board and inbox updates are committed immediately and arbitrary writes are refused', async t => {
  const f = fixture(t), options = f.lane('metadata');
  await assert.rejects(integrateLane({...options, metadata: {'src/game.js': 'bad'}}), /metadata/);
  const result = await integrateLane({...options, metadata: {'docs/board/board.yaml': 'cards: []\n', 'docs/playtest-inbox.md': '# Merged\n'}});
  assert.equal(result.merged, true); assert.equal(git(f.integration, 'status', '--porcelain'), '');
  assert.equal(readFileSync(join(f.integration, 'docs/playtest-inbox.md'), 'utf8'), '# Merged\n');
});

test('cleanup refuses an old lane or mismatched current-run receipt before mutation', async t => {
  const f = fixture(t), options = f.lane('old'), before = git(f.integration, 'rev-parse', 'HEAD');
  for (const cleanup of [{newlyCreated: false}, {newlyCreated: true, lane: options.lane, branch: 'codex/other', runId: 'today'}]) {
    await assert.rejects(integrateLane({...options, cleanup, runId: 'today'}), /receipt/);
    assert.equal(git(f.integration, 'rev-parse', 'HEAD'), before);
    assert.ok(existsSync(options.lane));
  }
});

test('explicit current-run clean merged lane is recycled without permanent-delete fallback', async t => {
  const f = fixture(t), options = f.lane('owned'); let recycled = null;
  const started = new Date(Date.now() - 60_000).toISOString();
  const cleanup = {newlyCreated: true, lane: options.lane, branch: 'codex/owned', runId: 'today', createdAt: new Date().toISOString()};
  const result = await integrateLane({...options, cleanup, runId: 'today', runStartedAt: started,
    recycle: path => {recycled = path; rmSync(path, {recursive: true});}});
  assert.equal(result.merged, true); assert.equal(recycled, options.lane);
  assert.equal(git(f.integration, 'worktree', 'list', '--porcelain').includes(options.lane.replaceAll('\\', '/')), false);
  assert.equal(git(f.integration, 'branch', '--list', 'codex/owned'), '');
});


test('wrong integration branch and another repository are rejected', async t => {
  const f = fixture(t), other = fixture(t), options = f.lane('identity');
  await assert.rejects(integrateLane({...options, integration: other.integration}), /one repository/);
  git(f.integration, 'checkout', '-b', 'codex/wrong-target');
  await assert.rejects(integrateLane(options), /integration\/wasteland/);
});

test('cleanup never prunes an unrelated missing registration', async t => {
  const f = fixture(t), options = f.lane('prune-check'), other = f.lane('unrelated');
  renameSync(other.lane, other.lane + '-retained');
  const before = git(f.integration, 'rev-parse', 'HEAD');
  const cleanup = {newlyCreated: true, lane: options.lane, branch: 'codex/prune-check', runId: 'today', createdAt: new Date().toISOString()};
  await assert.rejects(integrateLane({...options, cleanup, runId: 'today', runStartedAt: new Date(Date.now()-60_000).toISOString()}), /another registration/);
  assert.equal(git(f.integration, 'rev-parse', 'HEAD'), before);
  assert.ok(existsSync(options.lane));
  assert.ok(git(f.integration, 'worktree', 'list', '--porcelain').includes('/unrelated'));
});

test('Recycle Bin failure leaves lane and branch intact with committed merge metadata', async t => {
  const f = fixture(t), options = f.lane('recycle-failure');
  const cleanup = {newlyCreated: true, lane: options.lane, branch: 'codex/recycle-failure', runId: 'today', createdAt: new Date().toISOString()};
  await assert.rejects(integrateLane({...options, cleanup, runId: 'today', runStartedAt: new Date(Date.now()-60_000).toISOString(),
    recycle: () => {throw Error('Recycle Bin unavailable');}}), /Recycle Bin unavailable/);
  assert.ok(existsSync(options.lane));
  assert.equal(git(f.integration, 'rev-parse', 'refs/heads/codex/recycle-failure'), options.evidence.commit);
  assert.equal(git(f.integration, 'status', '--porcelain'), '');
});
