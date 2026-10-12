// FAC-02: consume frozen evidence, merge promptly, commit shared metadata.
import {spawnSync} from 'node:child_process';
import {existsSync, lstatSync, mkdirSync, readFileSync, realpathSync, writeFileSync} from 'node:fs';
import {basename, dirname, isAbsolute, relative, resolve, sep} from 'node:path';
import {pathToFileURL} from 'node:url';

const LIVE = 'C:/Users/kyleb/dev/the-duel-remake';
const METADATA = new Set(['docs/board/board.yaml', 'docs/playtest-inbox.md', 'docs/board/STATUS.md']);
const LOG = 'docs/board/run-log.md';
const fail = message => {throw Error(message);};
function command(cwd, program, args, optional = false, env = process.env) {
  const result = spawnSync(program, args, {cwd, encoding: 'utf8', shell: false,
    windowsHide: true, env: {...env, LC_ALL: 'C'}});
  if (!optional && (result.error || result.status !== 0))
    fail(program + ' ' + args[0] + ': ' + (result.error?.message || result.stderr.trim()));
  return result;
}
const git = (cwd, ...args) => command(cwd, 'git', args).stdout.trimEnd();
const same = (a, b) => resolve(a).toLowerCase() === resolve(b).toLowerCase();
function inside(root, path) {
  const gap = relative(root, path);
  return gap !== '' && gap !== '..' && !gap.startsWith('..' + sep) && !isAbsolute(gap);
}
function worktree(path) {
  const root = realpathSync(resolve(path));
  if (same(root, LIVE) || root.toLowerCase().startsWith(resolve(LIVE).toLowerCase() + sep))
    fail('The live checkout is forbidden.');
  if (!same(root, git(root, 'rev-parse', '--show-toplevel'))) fail('Use the exact worktree root.');
  if (git(root, 'status', '--porcelain', '--untracked-files=all')) fail('Worktree must be clean: ' + root);
  return {root, branch: git(root, 'branch', '--show-current'), commit: git(root, 'rev-parse', 'HEAD'),
    common: git(root, 'rev-parse', '--path-format=absolute', '--git-common-dir'),
    registration: basename(git(root, 'rev-parse', '--path-format=absolute', '--git-dir'))};
}
function evidenceFor(evidence, card, lane) {
  const {lane: run, build, review} = evidence ?? {};
  if (evidence?.schema !== 1 || evidence.card !== card || evidence.commit !== lane.commit ||
      run?.commit !== lane.commit || build?.commit !== lane.commit || review?.commit !== lane.commit)
    fail('Evidence must name the current frozen lane commit and card.');
  const result = run.result, args = run.command;
  if (!Array.isArray(args) || args[0] !== 'node' || args[1] !== 'tools/run-tests.mjs' ||
      args[args.indexOf('--tier') + 1] !== 'lane' || !args.includes('--changed') ||
      args.some(arg => !['node', 'tools/run-tests.mjs', '--tier', 'lane', '--changed', '--jobs', '1', '2', '3', '4', '--json', '--keep-going'].includes(arg))) fail('Require the targeted lane command.');
  const jobs = Number(args[args.indexOf('--jobs') + 1]);
  if (!Number.isInteger(jobs) || jobs < 1 || jobs > 4 || result?.schema !== 1 ||
      result.kind !== 'result' || result.tier !== 'lane' || result.jobs !== jobs ||
      result.exitCode !== 0 || result.notRun !== 0 || !Array.isArray(result.failures) || result.failures.length ||
      !Number.isInteger(result.total) || result.total < 1 || result.passed !== result.total ||
      !Number.isFinite(result.durationMs) || result.durationMs < 0) fail('Lane result must be green, complete and jobs <= 4.');
  if (JSON.stringify(build.command) !== JSON.stringify(['npm', 'run', 'build']) ||
      build.exitCode !== 0 || !Number.isFinite(build.durationMs) || build.durationMs < 0 ||
      typeof build.log !== 'string') fail('Require current green production-build evidence.');
  const log = resolve(lane.root, build.log), evidenceRoot = resolve(lane.root, '.evidence');
  if (!inside(evidenceRoot, log) || !existsSync(log) || !inside(lane.root, realpathSync(evidenceRoot)) ||
      !inside(realpathSync(evidenceRoot), realpathSync(log)) || !readFileSync(log, 'utf8').trim())
    fail('Build log must exist inside the lane evidence folder.');
  if (review.passed !== true || typeof review.reviewer !== 'string' ||
      !review.reviewer.trim() || /[\r\n]/.test(review.reviewer)) fail('Require one named clear review.');
  return result;
}
function pruneOutput(root) {
  const result = command(root, 'git', ['worktree', 'prune', '--dry-run', '--verbose', '--expire', 'now']);
  return (result.stdout + result.stderr).trim().split(/\r?\n/).filter(Boolean);
}
function cleanupReceipt(cleanup, lane, integration, {runId, runStartedAt, now}) {
  if (!cleanup) return null;
  const created = Date.parse(cleanup.createdAt), started = Date.parse(runStartedAt);
  if (cleanup.newlyCreated !== true || !runId || cleanup.runId !== runId ||
      !Number.isFinite(created) || !Number.isFinite(started) || created < started || created > now.getTime() ||
      typeof cleanup.lane !== 'string' || !isAbsolute(cleanup.lane) ||
      !same(cleanup.lane, lane.root) || cleanup.branch !== lane.branch)
    fail('Cleanup needs an exact current-run ownership receipt; old lanes stay.');
  if (pruneOutput(integration.root).length) fail('Cleanup receipt cannot prune another registration.');
  const modules = resolve(lane.root, 'node_modules');
  if (existsSync(modules)) {
    if (!lstatSync(modules).isSymbolicLink() ||
        !same(realpathSync(modules), resolve(integration.root, 'node_modules')))
      fail('Cleanup receipt requires an integration-only dependency junction.');
  }
  return modules;
}
export function recycleDirectory(path) {
  if (process.platform !== 'win32') fail('Recycle Bin cleanup requires Windows; no permanent-delete fallback.');
  command(dirname(path), 'powershell.exe', ['-NoProfile', '-NonInteractive', '-Command',
    'Add-Type -AssemblyName Microsoft.VisualBasic; [Microsoft.VisualBasic.FileIO.FileSystem]::DeleteDirectory($env:DUEL_FACTORY_RECYCLE, "OnlyErrorDialogs", "SendToRecycleBin", "ThrowException")'],
    false, {...process.env, DUEL_FACTORY_RECYCLE: path});
}
function unlinkJunction(path, target) {
  command(dirname(path), 'powershell.exe', ['-NoProfile', '-NonInteractive', '-Command',
    'Remove-Item -LiteralPath $env:DUEL_FACTORY_JUNCTION -ErrorAction Stop'],
    false, {...process.env, DUEL_FACTORY_JUNCTION: path});
  if (existsSync(path) || !existsSync(target)) fail('Junction unlink failed; cleanup stops.');
}
export async function integrateLane({integration: integrationPath, lane: lanePath, card, evidence,
  metadata = {}, cleanup = null, runId, runStartedAt, refreshStatus = root =>
    command(root, process.execPath, ['tools/build-status.mjs']), recycle = recycleDirectory,
  now = () => new Date()} = {}) {
  if (!/^[A-Z][A-Z0-9-]+$/.test(card ?? '')) fail('Use an explicit task card ID.');
  const integration = worktree(integrationPath), lane = worktree(lanePath);
  if (integration.branch !== 'integration/wasteland' || !/^codex\/[a-z0-9][a-z0-9/_-]*$/.test(lane.branch) ||
      same(integration.root, lane.root) || !same(integration.common, lane.common))
    fail('Require distinct integration/wasteland and codex lane worktrees of one repository.');
  const result = evidenceFor(evidence, card, lane), date = now();
  for (const [path, content] of Object.entries(metadata))
    if (!METADATA.has(path) || typeof content !== 'string') fail('Unknown or invalid shared metadata path.');
  const modules = cleanupReceipt(cleanup, lane, integration, {runId, runStartedAt, now: date});
  if (command(integration.root, 'git', ['merge-base', '--is-ancestor', lane.commit, integration.commit], true).status === 0)
    fail('This lane is already merged.');
  // The candidate need not contain a later, independent integration merge.
  // Git checks the union; only a real conflict sends it back for a fresh gate.
  const merged = command(integration.root, 'git', ['merge', '--no-ff', '--no-commit', lane.commit], true);
  if (merged.error || merged.status !== 0) {
    if (existsSync(resolve(integration.root, git(integration.root, 'rev-parse', '--git-path', 'MERGE_HEAD'))))
      git(integration.root, 'merge', '--abort');
    if (git(integration.root, 'rev-parse', 'HEAD') !== integration.commit ||
        git(integration.root, 'status', '--porcelain')) fail('Failed merge needs manual repair; no further mutation.');
    return {merged: false, needsConflictFix: true, message: 'Fix the conflict in the lane, then run one fresh targeted lane/build and review.',
      detail: (merged.stderr || merged.stdout || merged.error?.message).trim()};
  }
  git(integration.root, 'commit', '-m', 'Merge ' + card + ': green lane, build and review');
  const mergeCommit = git(integration.root, 'rev-parse', 'HEAD');
  for (const [path, content] of Object.entries(metadata)) {
    const target = resolve(integration.root, path); mkdirSync(dirname(target), {recursive: true});
    writeFileSync(target, content.replaceAll('\r\n', '\n'));
  }
  const log = resolve(integration.root, LOG);
  const sentence = '- ' + date.toISOString().slice(0, 10) + ' ' + card + ' merged ' + mergeCommit.slice(0, 8) +
    ': lane ' + result.passed + '/' + result.total + ' in ' + (result.durationMs / 1000).toFixed(2) +
    ' s, build ' + evidence.build.durationMs + ' ms, review ' + evidence.review.reviewer.trim() + ' clear.\n';
  mkdirSync(dirname(log), {recursive: true});
  writeFileSync(log, (existsSync(log) ? readFileSync(log, 'utf8').replaceAll('\r\n', '\n').trimEnd() + '\n' : '') + sentence);
  await refreshStatus(integration.root);
  const paths = git(integration.root, 'status', '--porcelain', '--untracked-files=all').split('\n').filter(Boolean).map(line => line.slice(3));
  if (paths.some(path => path !== LOG && !METADATA.has(path)))
    fail('Unexpected source mutation while recording metadata; inspect integration before continuing.');
  git(integration.root, 'add', '--', LOG, ...paths.filter(path => path !== LOG));
  git(integration.root, 'commit', '-m', 'Record ' + card + ' merge and shared status');
  const metadataCommit = git(integration.root, 'rev-parse', 'HEAD');
  if (cleanup) {
    const current = worktree(lane.root);
    if (current.commit !== lane.commit || current.branch !== lane.branch ||
        command(integration.root, 'git', ['merge-base', '--is-ancestor', lane.commit, 'HEAD'], true).status !== 0)
      fail('Cleanup requires the unchanged clean merged lane.');
    cleanupReceipt(cleanup, current, integration, {runId, runStartedAt, now: date});
    if (existsSync(modules)) unlinkJunction(modules, resolve(integration.root, 'node_modules'));
    await recycle(lane.root);
    if (existsSync(lane.root)) fail('Recycle did not remove the checkout; cleanup stops.');
    const pending = pruneOutput(integration.root), prefix = 'Removing worktrees/' + lane.registration + ':';
    if (pending.length !== 1 || !pending[0].startsWith(prefix)) fail('Prune would touch another registration; cleanup stops.');
    git(integration.root, 'worktree', 'prune', '--verbose', '--expire', 'now');
    git(integration.root, 'branch', '-d', lane.branch);
  }
  return {merged: true, mergeCommit, metadataCommit, recycled: !!cleanup};
}
export async function main(args = process.argv.slice(2)) {
  const options = {};
  const names = {'--integration': 'integration', '--lane': 'lane', '--card': 'card', '--evidence': 'evidence',
    '--metadata': 'metadata', '--recycle-owned': 'cleanup', '--run-id': 'runId', '--run-started-at': 'runStartedAt'};
  try {
    for (let index = 0; index < args.length; index += 2) {
      const key = names[args[index]], value = args[index + 1];
      if (!key || !value || options[key] !== undefined) fail('Usage: integrate-lane.mjs --integration ROOT --lane ROOT --card ID --evidence JSON [--metadata JSON] [--recycle-owned JSON --run-id ID --run-started-at ISO]');
      options[key] = ['evidence', 'metadata', 'cleanup'].includes(key) ? JSON.parse(readFileSync(value, 'utf8')) : value;
    }
    const result = await integrateLane(options); console.log(JSON.stringify(result, null, 2));
    return result.merged ? 0 : 1;
  } catch (error) {console.error('Integrator: ' + error.message); return 1;}
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href)
  process.exitCode = await main();
