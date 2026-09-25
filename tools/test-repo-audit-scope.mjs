import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import test from 'node:test';

const tool = resolve('tools/repo-audit.mjs');
function git(root, ...args) {
  const run = spawnSync('git', ['-C', root, ...args], { encoding: 'utf8', windowsHide: true });
  assert.equal(run.status, 0, run.stderr);
  return run.stdout.trim();
}
function fixture(t) {
  const home = mkdtempSync(join(tmpdir(), 'duel-audit-scope-'));
  t.after(() => rmSync(home, { recursive: true, force: true }));
  const root = join(home, 'integration');
  mkdirSync(root);
  git(root, 'init', '-b', 'integration/wasteland');
  git(root, 'config', 'user.name', 'Audit fixture');
  git(root, 'config', 'user.email', 'audit@example.invalid');
  writeFileSync(join(root, 'package.json'), '{"type":"module"}\n');
  git(root, 'add', '.');
  git(root, 'commit', '-m', 'fixture');
  const excluded = join(home, 'external-audio');
  const ordinary = join(home, 'ordinary');
  const prefix = join(home, 'external-audio-extra');
  git(root, 'worktree', 'add', '-b', 'codex/external-audio', excluded);
  git(root, 'worktree', 'add', '-b', 'codex/ordinary', ordinary);
  git(root, 'worktree', 'add', '-b', 'codex/external-audio-extra', prefix);
  writeFileSync(join(excluded, 'dirty.txt'), 'private fixture\n');
  writeFileSync(join(ordinary, 'dirty.txt'), 'ordinary fixture\n');
  writeFileSync(join(prefix, 'dirty.txt'), 'prefix fixture\n');
  const guard = join(home, 'guard.mjs');
  writeFileSync(guard, `
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import child from 'node:child_process';
import { syncBuiltinESMExports } from 'node:module';
const denied = String(process.env.AUDIT_FORBIDDEN).replaceAll('\\\\','/').toLowerCase();
function check(path) {
  const value = String(path).replaceAll('\\\\','/').toLowerCase();
  if (value === denied || value.startsWith(denied + '/')) throw Error('FIX-AUDIT-SCOPE forbidden lane access: ' + value);
}
for (const method of ['readFileSync','existsSync','readdirSync','statSync','lstatSync','realpathSync','accessSync','openSync']) {
  const original = fs[method]; fs[method] = function(path,...rest) { check(path); return original.call(this,path,...rest); };
}
for (const method of ['readFile','stat','lstat','realpath','access','open','readdir']) {
  const original = fsp[method]; fsp[method] = function(path,...rest) { check(path); return original.call(this,path,...rest); };
}
const spawn = child.spawnSync;
child.spawnSync = function(command,args,...rest) {
  if (command === 'git' && Array.isArray(args) && args[0] === '-C') check(args[1]);
  return spawn.call(this,command,args,...rest);
};
syncBuiltinESMExports();
`);
  return { root, excluded, ordinary, prefix, guard };
}
function invoke(f, args, direct = false) {
  const script = direct
    ? `import { audit } from ${JSON.stringify(pathToFileURL(tool).href)}; console.log(JSON.stringify(audit(${JSON.stringify(f.root)}, {skipLanes:['codex/external-audio']})))`
    : null;
  const child = spawnSync(process.execPath, [
    '--import', pathToFileURL(f.guard).href,
    ...(direct ? ['--input-type=module', '-e', script] : [tool, '--root', f.root, '--json', ...args]),
  ], { cwd: f.root, encoding: 'utf8', windowsHide: true, timeout: 15000,
    env: { ...process.env, AUDIT_FORBIDDEN: f.excluded, GIT_OPTIONAL_LOCKS: '0' } });
  return child;
}
function checkedReport(child) {
  assert.equal(child.status, 0, child.stderr || child.stdout);
  const report = JSON.parse(child.stdout);
  assert.ok(!JSON.stringify(report).includes('FIX-AUDIT-SCOPE forbidden lane access'));
  return report;
}
function assertRows(report) {
  const by = branch => report.lanes.find(row => row.branch === branch);
  const skipped = by('codex/external-audio');
  assert.ok(skipped, 'skipped branch remains visible from root refs');
  assert.equal(skipped.mergedIntoIntegration, true, 'merged branch is still retained');
  assert.equal(skipped.dirty, null);
  assert.equal(skipped.cleanupCandidate, false);
  assert.equal(skipped.removable, false);
  assert.equal(skipped.inspectionSkipped, true);
  assert.match(skipped.status, /inspection skipped/i);
  assert.equal(by('codex/ordinary')?.dirty, true, 'ordinary lane is still inspected');
  assert.equal(by('codex/external-audio-extra')?.dirty, true, 'prefix match is not skipped');
}

test('repeatable exact CLI skip retains branch without touching excluded worktree', t => {
  const f = fixture(t);
  const report = checkedReport(invoke(f, ['--skip-lane', 'codex/external-audio', '--skip-lane', 'codex/unregistered']));
  assertRows(report);
});

test('audit(root,{skipLanes}) has the same safe result', t => {
  const f = fixture(t);
  assertRows(checkedReport(invoke(f, [], true)));
});

test('default behavior and incomplete option remain explicit', t => {
  const f = fixture(t);
  const normal = spawnSync(process.execPath, [tool, '--root', f.root, '--json'], {
    encoding: 'utf8', windowsHide: true, timeout: 15000 });
  const report = checkedReport(normal);
  assert.equal(report.lanes.find(row => row.branch === 'codex/external-audio')?.dirty, true);
  const missing = spawnSync(process.execPath, [tool, '--root', f.root, '--skip-lane'], {
    encoding: 'utf8', windowsHide: true, timeout: 15000 });
  assert.notEqual(missing.status, 0);
  assert.match(missing.stderr, /skip-lane|incomplete|missing/i);
});
