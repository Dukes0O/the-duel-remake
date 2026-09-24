import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, relative, resolve, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const LIVE_ROOT = 'C:/Users/kyleb/dev/the-duel-remake';
export const FULL_TIER_FILE = 'docs/board/checks/full-tier.json';

// Inspection must not refresh an index or contact a remote.
function git(root, args, optional = false) {
  const result = spawnSync('git', ['-C', root, ...args], {
    encoding: 'utf8', shell: false, windowsHide: true,
    env: { ...process.env, GIT_OPTIONAL_LOCKS: '0' },
  });
  if (result.error || result.status !== 0) {
    if (optional) return null;
    throw Error(`Git inspection failed (${args[0]}): ${result.error?.message || result.stderr.trim()}`);
  }
  return result.stdout;
}

export function sourceState(root) {
  const commit = git(root, ['rev-parse', 'HEAD']).trim();
  const entries = git(root, ['status', '--porcelain=v1', '-z', '--untracked-files=all', '--no-renames'])
    .split('\0').filter(Boolean);
  // Only the runner's own ledger is exempt. STATUS and every other document count.
  const paths = entries.map(entry => entry.slice(3)).filter(path => path !== FULL_TIER_FILE);
  return { commit, dirty: paths.length > 0, paths };
}

function jsonFile(path) {
  try { return { value: JSON.parse(readFileSync(path, 'utf8')), issue: null }; }
  catch (error) { return { value: null, issue: error.code === 'ENOENT' ? 'missing' : 'invalid' }; }
}

export function writeFullTierEvidence(root, start, { result = null, plan = [], now = () => new Date() } = {}) {
  const end = sourceState(root);
  const complete = result !== null && plan.length > 0 && result.total === plan.length &&
    result.notRun === 0 && result.results?.length === plan.length &&
    plan.every((task, index) => result.results[index]?.label === task.label);
  const passed = complete && result.exitCode === 0 && result.passed === plan.length &&
    result.failures?.length === 0 && result.results.every(row => row.passed === true && row.exitCode === 0);
  const evidence = {
    schema: 1, commit: start.commit, time: now().toISOString(), tier: 'full', passed,
    dirty: start.dirty || end.dirty || start.commit !== end.commit,
    startDirty: start.dirty, endDirty: end.dirty, endCommit: end.commit, complete,
    total: plan.length, completed: result?.results?.length ?? 0,
    failures: result?.failures ?? [],
  };
  const target = join(root, FULL_TIER_FILE);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, JSON.stringify(evidence, null, 2) + '\n');
  return evidence;
}

function fullRun(root, integration, now) {
  const { value, issue } = jsonFile(join(root, FULL_TIER_FILE));
  let status = issue;
  if (!status) {
    const valid = value && value.schema === 1 && value.tier === 'full' &&
      /^[0-9a-f]{40,64}$/.test(value.commit) && typeof value.passed === 'boolean' &&
      typeof value.dirty === 'boolean' && typeof value.time === 'string' &&
      Number.isFinite(Date.parse(value.time)) && Date.parse(value.time) <= Date.parse(now);
    if (!valid) status = 'invalid';
    else if (value.commit !== integration.commit) status = 'stale';
    else if (!value.passed) status = 'failed';
    else if (value.dirty || integration.dirty) status = 'dirty';
    else if (value.complete === false || value.startDirty === true || value.endDirty === true ||
      (value.endCommit && value.endCommit !== value.commit)) status = 'invalid';
    else status = 'passed';
  }
  return { status, exactHead: status === 'passed', commit: value?.commit ?? null,
    time: value?.time ?? null, evidence: value };
}

function featureStates(root) {
  // Read the declarative catalog, never import game code or access its storage.
  const source = readFileSync(join(root, 'src/feature-flags.js'), 'utf8');
  const catalog = source.match(/export\s+const\s+FEATURE_STATES\s*=\s*Object\.freeze\(\s*\{([^}]*)\}\s*\)/);
  if (!catalog) throw Error('Feature catalog format is unknown.');
  const body = catalog[1].replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, '').trim();
  const entries = body.split(',').map(entry => entry.trim()).filter(Boolean);
  return Object.fromEntries(entries.map(entry => {
    const match = entry.match(/^(?:'([a-z][a-z0-9-]*)'|"([a-z][a-z0-9-]*)"|([a-z][a-z0-9-]*))\s*:\s*['"](dev|beta|on)['"]$/);
    if (!match) throw Error('Feature catalog entry is unknown: ' + entry);
    return [match[1] || match[2] || match[3], match[4]];
  }));
}

function worktrees(root) {
  const rows = [], fields = git(root, ['worktree', 'list', '--porcelain', '-z']).split('\0');
  let row = null;
  for (const field of fields) {
    if (field.startsWith('worktree ')) { row = { path: field.slice(9) }; rows.push(row); }
    else if (row && field.startsWith('branch ')) row.branch = field.slice(7).replace(/^refs\/heads\//, '');
    else if (row && field.startsWith('HEAD ')) row.commit = field.slice(5);
    else if (row && field.startsWith('locked')) row.locked = true;
    else if (row && field.startsWith('prunable')) row.prunable = true;
  }
  return rows;
}

function lanes(root, liveRoot, commit, now) {
  const trees = worktrees(root);
  return git(root, ['for-each-ref', '--format=%(refname:short)%09%(objectname)%09%(committerdate:iso-strict)', 'refs/heads'])
    .trim().split('\n').filter(Boolean).map(line => line.split('\t'))
    .filter(([branch]) => /^(codex|lane)\//.test(branch)).map(([branch, head, date]) => {
      const tree = trees.find(row => row.branch === branch);
      const merged = git(root, ['merge-base', '--is-ancestor', head, commit], true) !== null;
      let dirty = null, issue = null;
      if (tree) {
        try {
          // Lane cleanup must also preserve uncommitted evidence.
          dirty = git(tree.path, ['status', '--porcelain=v1', '--untracked-files=all']).trim().length > 0;
        } catch (error) { issue = error.message; }
      }
      const protectedRoot = tree && [root, liveRoot].some(path => resolve(path) === resolve(tree.path));
      return { branch, commit: head, ageDays: Math.max(0, Math.floor((Date.parse(now) - Date.parse(date)) / 86400000)),
        path: tree?.path ?? null, dirty, merged,
        removable: Boolean(tree && !protectedRoot && !tree.locked && !tree.prunable && merged && dirty === false), issue };
    });
}

function backups(root, liveRoot) {
  const branches = ['master', 'main', 'integration/wasteland'];
  const local = Object.fromEntries(branches.map(branch => [branch,
    git(root, ['rev-parse', '--verify', 'refs/heads/' + branch], true)?.trim() ?? null]));
  const remotes = git(root, ['remote']).trim().split('\n').filter(Boolean);
  const remoteTracking = remotes.flatMap(remote => branches.map(branch => {
    const commit = git(root, ['rev-parse', '--verify', `refs/remotes/${remote}/${branch}`], true)?.trim() ?? null;
    let status = !commit ? 'missing' : !local[branch] ? 'local branch missing' : 'diverged';
    if (commit && local[branch]) {
      if (commit === local[branch]) status = 'matches local';
      else if (git(root, ['merge-base', '--is-ancestor', commit, local[branch]], true) !== null) status = 'behind local';
      else if (git(root, ['merge-base', '--is-ancestor', local[branch], commit], true) !== null) status = 'ahead of local';
    }
    return { remote, branch, commit, status };
  }));
  const rollback = jsonFile(join(liveRoot, 'dist-previous/build-version.json'));
  return { local, remotes, remoteTracking,
    rollback: { version: rollback.value?.id ?? null, status: rollback.issue ?? 'manifest present' },
    freshness: 'Remote-tracking refs are cached locally; no fetch or remote verification was performed.' };
}

const cell = value => String(value ?? 'unknown').replaceAll('|', '\\|').replace(/[\r\n]/g, ' ');
export function renderStatus(report) {
  const lines = ['# Build status', '', `Observed at: ${report.time}`, '',
    `Observation commit: ${report.observationCommit}`, '',
    'This snapshot applies only to the observation commit and source state shown below. A later commit, including a metadata commit, does not inherit its full-run result.', '',
    `Integration HEAD: ${report.integration.commit}`, '',
    `Integration source: ${report.integration.dirty ? 'dirty' : 'clean'} (only the full-tier evidence ledger is excluded).`, '',
    `Live commit: ${report.live.commit ?? 'unknown'}`, '', `Live build version: ${report.live.version ?? 'missing or invalid manifest'}`, '',
    `Full tier: ${report.fullRun.status}; exact HEAD passed: ${report.fullRun.exactHead ? 'yes' : 'no'}.`, '',
    `Last recorded full run: ${report.fullRun.time ?? 'unknown'}; tested commit: ${report.fullRun.commit ?? 'unknown'}.`, '',
    '## Feature switches', '', '| Switch | State |', '| --- | --- |',
    ...Object.entries(report.features).map(([name, state]) => `| ${cell(name)} | ${cell(state)} |`), '',
    '## Lane branches', '', 'Age is whole days since the last branch commit. Removal candidates are suggestions only; this tool never removes a worktree.', '',
    '| Branch | Age (days) | Dirty | Merged | Removable | Folder |', '| --- | --- | --- | --- | --- | --- |',
    ...report.lanes.map(row => `| ${cell(row.branch)} | ${row.ageDays} | ${cell(row.dirty)} | ${row.merged} | ${row.removable} | ${cell(row.path)} |`), '',
    '## Backups', '', 'Local branch refs preserve committed history in this repository; they are not a separate off-machine backup.', '',
    ...Object.entries(report.backups.local).map(([branch, commit]) => `- Local ${branch}: ${commit ?? 'missing'}`), '',
    `Local rollback build (dist-previous): ${report.backups.rollback.version ?? report.backups.rollback.status}. Manifest presence does not verify the full rollback build.`, '',
    report.backups.freshness, '',
    ...(report.backups.remotes.length ? report.backups.remoteTracking.map(row =>
      `- Remote ${row.remote}/${row.branch}: ${row.status}; cached commit ${row.commit ?? 'missing'}.`) : ['Remote backup: none configured.']), '',
    ...report.issues.map(issue => `Issue: ${cell(issue)}`), ''];
  return lines.join('\n');
}

export function collectStatus({ root = ROOT, liveRoot = LIVE_ROOT, now = new Date().toISOString() } = {}) {
  const integration = sourceState(root), issues = [];
  const manifest = jsonFile(join(liveRoot, 'dist/build-version.json'));
  const live = { commit: git(liveRoot, ['rev-parse', 'HEAD'], true)?.trim() ?? null,
    version: typeof manifest.value?.id === 'string' ? manifest.value.id : null };
  if (!live.commit) issues.push('Live Git commit unavailable.');
  if (!live.version) issues.push('Live build manifest missing or invalid.');
  let features = {};
  try { features = featureStates(root); } catch (error) { issues.push(error.message); }
  const laneRows = lanes(root, liveRoot, integration.commit, now);
  issues.push(...laneRows.filter(row => row.issue).map(row => `${row.branch}: ${row.issue}`));
  return { schema: 1, time: now, observationCommit: integration.commit, integration, live,
    fullRun: fullRun(root, integration, now), features, lanes: laneRows, backups: backups(root, liveRoot), issues };
}

export function main(args = process.argv.slice(2)) {
  const options = {};
  let json = false;
  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    if (arg === '--json') json = true;
    else if (['--root', '--live-root', '--now'].includes(arg)) {
      const value = args[++index];
      if (!value || value.startsWith('--')) throw Error(`${arg} needs a value.`);
      options[{ '--root': 'root', '--live-root': 'liveRoot', '--now': 'now' }[arg]] = value;
    } else throw Error('Unknown argument: ' + arg);
  }
  const root = realpathSync(resolve(options.root ?? ROOT));
  let liveRoot = resolve(options.liveRoot ?? LIVE_ROOT);
  try { liveRoot = realpathSync(liveRoot); } catch { /* Missing live roots remain unknown. */ }
  const insideLive = path => { const rel = relative(liveRoot, path); return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel)); };
  if (insideLive(root)) throw Error('Status output must be outside the live checkout.');
  const now = new Date(options.now ?? Date.now()).toISOString();
  const target = join(root, 'docs/board/STATUS.md');
  // Resolve existing parent links before creating output directories.
  let parent = target;
  while (true) {
    try { if (insideLive(realpathSync(parent))) throw Error('Status output resolves into the live checkout.'); break; }
    catch (error) { if (error.code !== 'ENOENT') throw error; parent = dirname(parent); }
  }
  const report = collectStatus({ root, liveRoot, now });
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, renderStatus(report));
  console.log(json ? JSON.stringify(report) : `Wrote ${target}; full tier ${report.fullRun.status} for ${report.observationCommit}.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try { main(); } catch (error) { console.error('Build status: ' + error.message); process.exitCode = 1; }
}
