import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// CLEAN-10, SPEC 0.8. Every checkout and backup below lives in a unique
// temporary directory. The fixture has no remote and cannot push anything.
const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const tool = join(projectRoot, 'tools/compact-binaries.mjs');
const sandbox = mkdtempSync(join(tmpdir(), 'duel-compact-binaries-'));
const failures = [];
let checks = 0;

function same(actual, expected, label) {
  checks++;
  assert.deepEqual(actual, expected, label);
}

function check(value, label) {
  checks++;
  assert.ok(value, label);
}

function put(path, bytes) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, bytes);
}

function git(root, ...args) {
  const result = spawnSync('git', ['-C', root, ...args], {
    encoding: 'utf8', shell: false, windowsHide: true,
    env: { ...process.env, GIT_OPTIONAL_LOCKS: '0' },
  });
  same(result.status, 0, `fixture git ${args.join(' ')}: ${result.stderr.trim()}`);
  return result.stdout.trim();
}

function binary(fill, length) {
  const bytes = Buffer.alloc(length, fill);
  bytes[0] = 0;
  bytes[1] = 255;
  return bytes;
}

function commit(root, title) {
  git(root, 'add', '-A');
  git(root, 'commit', '-m', title);
}

function fixture(name) {
  const home = join(sandbox, name);
  const root = join(home, 'repo');
  const backupDir = join(home, 'backups');
  mkdirSync(root, { recursive: true });
  mkdirSync(backupDir, { recursive: true });
  git(root, 'init', '-b', 'master');
  git(root, 'config', 'user.name', 'Compaction fixture');
  git(root, 'config', 'user.email', 'fixture@example.invalid');
  git(root, 'config', 'core.autocrlf', 'false');
  put(join(root, '.gitattributes'), '*.glb binary\n*.png binary\n*.jpg binary\n');
  put(join(root, 'public/assets/models/vehicle.glb'), binary(1, 1024));
  put(join(root, 'public/assets/old-review.jpg'), binary(2, 512));
  put(join(root, 'source.txt'), 'master baseline\n');
  commit(root, 'master baseline');
  const master = git(root, 'rev-parse', 'master');
  git(root, 'checkout', '-b', 'integration/wasteland');
  put(join(root, 'public/assets/models/vehicle.glb'), binary(3, 3072));
  put(join(root, 'public/assets/transient.png'), binary(4, 256));
  put(join(root, 'source.txt'), 'first text change\n');
  commit(root, 'large replacement and transient art');
  put(join(root, 'public/assets/models/vehicle.glb'), binary(5, 128));
  rmSync(join(root, 'public/assets/transient.png'));
  rmSync(join(root, 'public/assets/old-review.jpg'));
  put(join(root, 'source.txt'), 'second text change\n');
  commit(root, 'smaller replacement and binary removals');
  put(join(root, 'public/assets/models/vehicle.glb'), binary(6, 96));
  put(join(root, 'source.txt'), 'current text\n');
  commit(root, 'current asset');
  const head = git(root, 'rev-parse', 'HEAD');
  const tree = git(root, 'rev-parse', 'HEAD^{tree}');
  const currentBinary = git(root, 'rev-parse', 'HEAD:public/assets/models/vehicle.glb');
  const approvalFile = join(home, 'approval.json');
  const approval = { repo: root, head, master, approvedBy: 'Kyle' };
  put(approvalFile, `${JSON.stringify(approval)}\n`);
  same(git(root, 'remote'), '', 'fixture has no remote');
  return { root, backupDir, approvalFile, approval, master, head, tree, currentBinary };
}

function run(f, approvalFile = f.approvalFile) {
  return spawnSync(process.execPath, [tool, '--repo', f.root, '--backup-dir', f.backupDir, '--execute', '--approval-file', approvalFile], {
    cwd: f.root, encoding: 'utf8', shell: false, windowsHide: true, timeout: 30000,
    env: { ...process.env, GIT_OPTIONAL_LOCKS: '0' },
  });
}

function refreshApproval(f) {
  f.head = git(f.root, 'rev-parse', 'HEAD');
  f.tree = git(f.root, 'rev-parse', 'HEAD^{tree}');
  f.approval = { repo: f.root, head: f.head, master: f.master, approvedBy: 'Kyle' };
  put(f.approvalFile, `${JSON.stringify(f.approval)}\n`);
}

function historyObjects(f, path) {
  return git(f.root, 'rev-list', '--objects', 'master..integration/wasteland', '--', path)
    .split(/\r?\n/).filter(line => line.endsWith(` ${path}`));
}

async function test(label, action) {
  try { await action(); } catch (error) { failures.push(`${label}: ${error.message}`); }
}

try {
  await test('verified backup and exact tip tree', () => {
    const f = fixture('success');
    const result = run(f);
    same(result.status, 0, `approved throwaway compaction succeeds: ${result.stderr.trim()}`);
    same(git(f.root, 'rev-parse', 'integration/wasteland^{tree}'), f.tree, 'tip tree is byte-identical');
    same(git(f.root, 'rev-parse', 'master'), f.master, 'master ref is untouched');
    const bundles = readdirSync(f.backupDir).filter(name => name.endsWith('.bundle'));
    same(bundles.length, 1, 'one bundle backup is created');
    const bundle = join(f.backupDir, bundles[0]);
    const verified = spawnSync('git', ['-C', f.root, 'bundle', 'verify', bundle], {
      encoding: 'utf8', shell: false, windowsHide: true,
    });
    same(verified.status, 0, `backup verifies: ${verified.stderr.trim()}`);
    const heads = git(f.root, 'bundle', 'list-heads', bundle);
    check(heads.includes(`${f.head} refs/heads/integration/wasteland`), 'backup contains original integration tip');
    check(heads.includes(`${f.master} refs/heads/master`), 'backup contains master');
  });

  await test('one current binary version and no deleted binary history', () => {
    const f = fixture('versions');
    const result = run(f);
    same(result.status, 0, `approved throwaway compaction succeeds: ${result.stderr.trim()}`);
    const current = historyObjects(f, 'public/assets/models/vehicle.glb');
    same(current, [`${f.currentBinary} public/assets/models/vehicle.glb`], 'development history contains only current binary version');
    same(historyObjects(f, 'public/assets/transient.png'), [], 'transient add/delete binary disappears from development history');
    same(historyObjects(f, 'public/assets/old-review.jpg'), [], 'deleted master binary has no development-history version');
    same(readFileSync(join(f.root, 'source.txt'), 'utf8'), 'current text\n', 'current text survives');
    same(git(f.root, 'log', '--format=%s', 'master..integration/wasteland', '--', 'source.txt').split(/\r?\n/).length,
      3, 'all three development text changes remain in history');
  });

  await test('merge commit graph preserves both text sides and exact tip tree', () => {
    const f = fixture('merge-graph');
    git(f.root, 'checkout', '-b', 'side', 'HEAD~1');
    put(join(f.root, 'side.txt'), 'side branch text\n');
    commit(f.root, 'side text change');
    git(f.root, 'checkout', 'integration/wasteland');
    put(join(f.root, 'main.txt'), 'main branch text\n');
    commit(f.root, 'main text change');
    git(f.root, 'merge', '--no-ff', 'side', '-m', 'merge side into integration');
    git(f.root, 'branch', '-d', 'side');
    refreshApproval(f);
    same(git(f.root, 'rev-list', '--parents', '-n', '1', 'HEAD').split(' ').length, 3,
      'fixture has a real two-parent merge commit');
    const result = run(f);
    same(result.status, 0, `merge graph compacts: ${result.stderr.trim()}`);
    same(git(f.root, 'rev-parse', 'integration/wasteland^{tree}'), f.tree, 'merge graph tip tree is unchanged');
    same(git(f.root, 'rev-list', '--parents', '-n', '1', 'integration/wasteland').split(' ').length, 3,
      'rewritten tip still has two parents');
    same(readFileSync(join(f.root, 'side.txt'), 'utf8'), 'side branch text\n', 'side branch text remains');
    same(readFileSync(join(f.root, 'main.txt'), 'utf8'), 'main branch text\n', 'main branch text remains');
    same(historyObjects(f, 'public/assets/models/vehicle.glb'),
      [`${f.currentBinary} public/assets/models/vehicle.glb`], 'merged history keeps only current binary');
  });

  await test('renamed and deleted binaries, text conversion, and spaced paths', () => {
    const f = fixture('paths with spaces');
    const oldPath = 'public/assets/models/vehicle.glb';
    const newPath = 'public/assets/models/new vehicle.glb';
    git(f.root, 'mv', oldPath, newPath);
    put(join(f.root, 'public/assets/state.dat'), binary(7, 320));
    commit(f.root, 'rename model and add binary state');
    put(join(f.root, 'public/assets/state.dat'), 'human-readable state\n');
    commit(f.root, 'replace binary state with text');
    refreshApproval(f);
    const newBlob = git(f.root, 'rev-parse', `HEAD:${newPath}`);
    const textBlob = git(f.root, 'rev-parse', 'HEAD:public/assets/state.dat');
    const result = run(f);
    same(result.status, 0, `spaced path and mixed content compact: ${result.stderr.trim()}`);
    same(git(f.root, 'rev-parse', 'integration/wasteland^{tree}'), f.tree, 'spaced-path tip tree is unchanged');
    same(historyObjects(f, oldPath), [], 'renamed old binary path disappears from development history');
    same(historyObjects(f, newPath), [`${newBlob} ${newPath}`], 'new spaced binary path has one current version');
    same(historyObjects(f, 'public/assets/state.dat'),
      [`${textBlob} public/assets/state.dat`], 'binary-to-text path retains only current text blob');
    same(readFileSync(join(f.root, 'public/assets/state.dat'), 'utf8'), 'human-readable state\n', 'converted text survives');
  });

  await test('unknown binary suffix is detected beyond the first 8192 bytes', () => {
    const f = fixture('late-nul');
    const path = 'public/assets/historical.dat';
    const oldBinary = Buffer.alloc(10000, 65);
    oldBinary[9000] = 0;
    put(join(f.root, path), oldBinary);
    commit(f.root, 'add unfamiliar binary with late NUL');
    put(join(f.root, path), 'current text content\n');
    commit(f.root, 'replace unfamiliar binary with text');
    refreshApproval(f);
    const textBlob = git(f.root, 'rev-parse', `HEAD:${path}`);
    const result = run(f);
    same(result.status, 0, `late-NUL binary history compacts: ${result.stderr.trim()}`);
    same(historyObjects(f, path), [`${textBlob} ${path}`], 'late-NUL binary is removed while current text remains');
    same(git(f.root, 'rev-parse', 'integration/wasteland^{tree}'), f.tree, 'late-NUL tip tree is unchanged');
  });

  await test('ANSI escaped text keeps both development-history versions', () => {
    const f = fixture('ansi-text-history');
    const path = 'docs/terminal-notes.txt';
    put(join(f.root, path), '\x1b[31mfirst note\x1b[0m\n');
    commit(f.root, 'add red ANSI terminal note');
    const first = git(f.root, 'rev-parse', `HEAD:${path}`);
    put(join(f.root, path), '\x1b[32msecond note\x1b[0m\n');
    commit(f.root, 'revise ANSI terminal note');
    const second = git(f.root, 'rev-parse', `HEAD:${path}`);
    refreshApproval(f);
    const result = run(f);
    same(result.status, 0, `ANSI text history compacts: ${result.stderr.trim()}`);
    same(historyObjects(f, path).sort(), [`${first} ${path}`, `${second} ${path}`].sort(),
      'both ANSI escaped text versions remain in development history');
    same(git(f.root, 'rev-parse', 'integration/wasteland^{tree}'), f.tree, 'ANSI text tip tree is unchanged');
  });

  await test('text suffix with earlier NUL content is refused before backup', () => {
    const f = fixture('invalid-text-content');
    const path = 'docs/terminal-notes.txt';
    put(join(f.root, path), Buffer.from([65, 0, 66, 10]));
    commit(f.root, 'add NUL-bearing text-suffix file');
    put(join(f.root, path), 'later readable text\n');
    commit(f.root, 'replace NUL-bearing content');
    refreshApproval(f);
    const result = run(f);
    check(result.status !== 0, 'NUL-bearing text suffix history is refused');
    check(/text|binary|NUL|ambiguous/i.test(`${result.stderr}\n${result.stdout}`),
      'NUL-bearing text refusal explains classification problem');
    same(git(f.root, 'rev-parse', 'integration/wasteland'), f.head, 'NUL-bearing text refusal leaves ref unchanged');
    same(readdirSync(f.backupDir).length, 0, 'NUL-bearing text refusal writes no bundle');
  });

  await test('explicit text attribute retains both unknown runtime text versions', () => {
    const f = fixture('explicit-text-runtime');
    const path = 'public/assets/unknown.dat';
    put(join(f.root, '.gitattributes'),
      '*.glb binary\n*.png binary\n*.jpg binary\n*.dat text\n');
    put(join(f.root, path), 'first UTF-8 version: caf\u00e9\n');
    commit(f.root, 'classify unknown runtime format as text');
    const first = git(f.root, 'rev-parse', `HEAD:${path}`);
    put(join(f.root, path), 'second UTF-8 version: na\u00efve\n');
    commit(f.root, 'revise classified runtime text');
    const second = git(f.root, 'rev-parse', `HEAD:${path}`);
    refreshApproval(f);
    const result = run(f);
    same(result.status, 0, `explicit runtime text attribute compacts: ${result.stderr.trim()}`);
    same(historyObjects(f, path).sort(), [`${first} ${path}`, `${second} ${path}`].sort(),
      'both classified runtime text revisions remain in development history');
    same(git(f.root, 'rev-parse', 'integration/wasteland^{tree}'), f.tree, 'classified runtime text tip tree is unchanged');
  });

  await test('nested attributes override root text classification', () => {
    const f = fixture('nested-attribute-override');
    put(join(f.root, '.gitattributes'),
      '*.glb binary\n*.png binary\n*.jpg binary\n*.dat text\n');
    put(join(f.root, 'public/assets/.gitattributes'), '*.dat -text\n');
    put(join(f.root, 'public/assets/unknown.dat'), 'ASCII runtime content\n');
    commit(f.root, 'nested rule removes root text classification');
    refreshApproval(f);
    same(git(f.root, 'check-attr', 'text', '--', 'public/assets/unknown.dat').split(': ').at(-1),
      'unset', 'fixture nested attribute overrides root text rule');
    const result = run(f);
    check(result.status !== 0, 'nested -text leaves unknown ASCII runtime asset ambiguous');
    check(/ambiguous|attribute|classification/i.test(`${result.stderr}\n${result.stdout}`),
      'nested override refusal explains classification');
    same(git(f.root, 'rev-parse', 'integration/wasteland'), f.head, 'nested override refusal leaves ref unchanged');
    same(readdirSync(f.backupDir).length, 0, 'nested override refusal writes no bundle');
  });

  await test('nested text classification keeps unknown runtime revisions', () => {
    const f = fixture('nested-text-attribute');
    const path = 'public/assets/unknown.dat';
    put(join(f.root, 'public/assets/.gitattributes'), '*.dat text\n');
    put(join(f.root, path), 'nested UTF-8 text: caf\u00e9\n');
    commit(f.root, 'classify runtime asset in nested attributes');
    const first = git(f.root, 'rev-parse', `HEAD:${path}`);
    put(join(f.root, path), 'nested UTF-8 text: na\u00efve\n');
    commit(f.root, 'revise nested classified text');
    const second = git(f.root, 'rev-parse', `HEAD:${path}`);
    refreshApproval(f);
    same(git(f.root, 'check-attr', 'text', '--', path).split(': ').at(-1),
      'set', 'fixture nested attribute classifies runtime asset as text');
    const result = run(f);
    same(result.status, 0, `nested runtime text attribute compacts: ${result.stderr.trim()}`);
    same(historyObjects(f, path).sort(), [`${first} ${path}`, `${second} ${path}`].sort(),
      'both nested-classified runtime text revisions remain in history');
    same(git(f.root, 'rev-parse', 'integration/wasteland^{tree}'), f.tree, 'nested classified tip tree is unchanged');
  });

  await test('global text default does not classify unknown runtime ASCII', () => {
    const f = fixture('global-text-default-unknown');
    put(join(f.root, '.gitattributes'), '* text eol=lf\n');
    put(join(f.root, 'public/assets/new.dat'), 'unknown ASCII runtime data\n');
    commit(f.root, 'add unknown runtime file under global text default');
    refreshApproval(f);
    same(git(f.root, 'check-attr', 'text', '--', 'public/assets/new.dat').split(': ').at(-1),
      'set', 'fixture has effective global text attribute');
    const result = run(f);
    check(result.status !== 0, 'global text default cannot silently classify unknown runtime file');
    check(/ambiguous|attribute|classification/i.test(`${result.stderr}\n${result.stdout}`),
      'unknown runtime refusal explains explicit classification needed');
    same(git(f.root, 'rev-parse', 'integration/wasteland'), f.head, 'unknown runtime refusal leaves ref unchanged');
    same(readdirSync(f.backupDir).length, 0, 'unknown runtime refusal writes no bundle');
  });

  await test('known binary compacts under global text default', () => {
    const f = fixture('global-text-default-binary');
    const path = 'public/assets/new.bin';
    put(join(f.root, '.gitattributes'), '* text eol=lf\n');
    put(join(f.root, path), binary(8, 240));
    commit(f.root, 'add known binary under global text default');
    put(join(f.root, path), binary(9, 120));
    commit(f.root, 'replace known binary under global text default');
    refreshApproval(f);
    const current = git(f.root, 'rev-parse', `HEAD:${path}`);
    const result = run(f);
    same(result.status, 0, `known binary under global text default compacts: ${result.stderr.trim()}`);
    same(historyObjects(f, path), [`${current} ${path}`], 'known binary keeps only current version');
    same(git(f.root, 'rev-parse', 'integration/wasteland^{tree}'), f.tree, 'known binary tip tree is unchanged');
  });

  await test('unknown ASCII runtime asset needs an explicit attribute', () => {
    const f = fixture('ambiguous-runtime');
    put(join(f.root, 'public/assets/unknown.dat'), 'looks like text but is an unknown runtime format\n');
    commit(f.root, 'add unknown runtime asset');
    refreshApproval(f);
    const result = run(f);
    check(result.status !== 0, 'unknown ASCII runtime asset is refused');
    check(/ambiguous|attribute|binary|text/i.test(`${result.stderr}\n${result.stdout}`),
      'unknown runtime refusal requests explicit classification');
    same(git(f.root, 'rev-parse', 'integration/wasteland'), f.head, 'unknown runtime refusal leaves integration unchanged');
    same(readdirSync(f.backupDir).length, 0, 'unknown runtime refusal writes no bundle');
  });

  await test('executable text mode remains executable', () => {
    const f = fixture('executable-mode');
    put(join(f.root, 'tools/run.sh'), '#!/bin/sh\nexit 0\n');
    git(f.root, 'add', 'tools/run.sh');
    git(f.root, 'update-index', '--chmod=+x', 'tools/run.sh');
    git(f.root, 'commit', '-m', 'add executable text recipe');
    refreshApproval(f);
    same(git(f.root, 'ls-tree', 'HEAD', 'tools/run.sh').slice(0, 6), '100755', 'fixture text recipe is executable');
    const result = run(f);
    same(result.status, 0, `executable text mode compacts: ${result.stderr.trim()}`);
    same(git(f.root, 'ls-tree', 'integration/wasteland', 'tools/run.sh').slice(0, 6),
      '100755', 'rewritten history preserves executable text mode');
    same(git(f.root, 'rev-parse', 'integration/wasteland^{tree}'), f.tree, 'executable text tip tree is unchanged');
  });

  await test('verified bundle restores original integration head', () => {
    const f = fixture('bundle-recovery');
    const result = run(f);
    same(result.status, 0, `bundle recovery fixture compacts: ${result.stderr.trim()}`);
    const bundle = join(f.backupDir, readdirSync(f.backupDir).find(name => name.endsWith('.bundle')));
    const recovered = join(dirname(f.root), 'recovered');
    mkdirSync(recovered, { recursive: true });
    git(recovered, 'init', '-b', 'recovery');
    git(recovered, 'fetch', '--no-tags', bundle,
      '+refs/heads/master:refs/heads/master',
      '+refs/heads/integration/wasteland:refs/heads/integration/wasteland');
    same(git(recovered, 'remote'), '', 'recovery repo has no configured remote');
    same(git(recovered, 'rev-parse', 'refs/heads/integration/wasteland'), f.head, 'bundle restores original integration head');
    same(git(recovered, 'rev-parse', 'refs/heads/integration/wasteland^{tree}'), f.tree, 'restored head has original exact tree');
    same(git(recovered, 'rev-parse', 'refs/heads/master'), f.master, 'bundle restores original master');
  });

  await test('dirty tracked and untracked trees are refused', () => {
    for (const [name, path] of [
      ['tracked', 'source.txt'], ['untracked', 'untracked-note.txt'],
    ]) {
      const f = fixture(`dirty-${name}`);
      put(join(f.root, path), `dirty ${name}\n`);
      const result = run(f);
      check(result.status !== 0, `${name} dirty tree is refused`);
      check(/dirty|uncommitted|untracked/i.test(`${result.stderr}\n${result.stdout}`), `${name} refusal explains dirty tree`);
      same(git(f.root, 'rev-parse', 'integration/wasteland'), f.head, `${name} refusal leaves integration ref unchanged`);
      same(readdirSync(f.backupDir).length, 0, `${name} refusal creates no backup`);
    }
  });

  await test('master checkout is refused', () => {
    const f = fixture('master-refusal');
    git(f.root, 'checkout', 'master');
    const result = run(f);
    check(result.status !== 0, 'compaction refuses master checkout');
    check(/master|branch/i.test(`${result.stderr}\n${result.stdout}`), 'master refusal explains protected branch');
    same(git(f.root, 'rev-parse', 'master'), f.master, 'master ref remains unchanged');
    same(git(f.root, 'rev-parse', 'integration/wasteland'), f.head, 'integration ref remains unchanged');
    same(readdirSync(f.backupDir).length, 0, 'master refusal creates no backup');
  });

  await test('written approval must match exact original refs', () => {
    const f = fixture('approval-refusal');
    const absent = run(f, join(dirname(f.approvalFile), 'absent-approval.json'));
    check(absent.status !== 0, 'missing written approval is refused');
    same(git(f.root, 'rev-parse', 'integration/wasteland'), f.head, 'missing approval leaves integration ref unchanged');
    same(readdirSync(f.backupDir).length, 0, 'missing approval creates no backup');
    const other = join(dirname(f.approvalFile), 'other-approval.json');
    put(other, `${JSON.stringify({ ...f.approval, approvedBy: 'Someone else' })}\n`);
    const otherResult = run(f, other);
    check(otherResult.status !== 0, 'approval from someone other than Kyle is refused');
    same(git(f.root, 'rev-parse', 'integration/wasteland'), f.head, 'different approver leaves integration ref unchanged');
    same(readdirSync(f.backupDir).length, 0, 'different approver creates no backup');
    const wrong = join(dirname(f.approvalFile), 'wrong-approval.json');
    put(wrong, `${JSON.stringify({ ...f.approval, head: f.master })}\n`);
    const result = run(f, wrong);
    check(result.status !== 0, 'stale written approval is refused');
    check(/approv|head|commit|mismatch/i.test(`${result.stderr}\n${result.stdout}`), 'refusal explains approval mismatch');
    same(git(f.root, 'rev-parse', 'integration/wasteland'), f.head, 'stale approval leaves integration ref unchanged');
    same(readdirSync(f.backupDir).length, 0, 'stale approval creates no backup');
  });

  await test('explicit execute flag is required', () => {
    const f = fixture('no-execute');
    const result = spawnSync(process.execPath,
      [tool, '--repo', f.root, '--backup-dir', f.backupDir, '--approval-file', f.approvalFile],
      { cwd: f.root, encoding: 'utf8', shell: false, windowsHide: true, timeout: 30000 });
    check(result.status !== 0, 'command without --execute is refused');
    check(/--execute/i.test(`${result.stderr}\n${result.stdout}`), 'refusal names the required execute flag');
    same(git(f.root, 'rev-parse', 'integration/wasteland'), f.head, 'missing execute leaves integration unchanged');
    same(readdirSync(f.backupDir).length, 0, 'missing execute creates no backup');
  });

  await test('backup directory junction into repository is refused', () => {
    const f = fixture('backup-junction');
    const link = join(dirname(f.root), 'backup-link');
    symlinkSync(f.root, link, 'junction');
    const result = spawnSync(process.execPath,
      [tool, '--repo', f.root, '--backup-dir', link, '--execute', '--approval-file', f.approvalFile],
      { cwd: f.root, encoding: 'utf8', shell: false, windowsHide: true, timeout: 30000 });
    check(result.status !== 0, 'backup junction into the repository is refused');
    check(/backup|repository|inside/i.test(`${result.stderr}\n${result.stdout}`), 'junction refusal explains unsafe backup location');
    same(git(f.root, 'rev-parse', 'integration/wasteland'), f.head, 'junction refusal leaves integration unchanged');
    same(git(f.root, 'status', '--porcelain=v1', '--untracked-files=all'), '', 'junction refusal leaves repository clean');
    same(readdirSync(f.root).filter(name => name.endsWith('.bundle')), [], 'junction refusal writes no bundle into repository');
  });
} finally {
  rmSync(sandbox, { recursive: true, force: true });
}

for (const failure of failures) console.error(`FAIL ${failure}`);
console.log(`Binary compaction: ${checks} checks, ${failures.length} failing scenarios.`);
if (failures.length) process.exitCode = 1;
