import { spawnSync } from 'node:child_process';
import { existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, realpathSync, statSync, writeFileSync } from 'node:fs';
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

function directoryBytes(path) {
  if (!existsSync(path)) return null;
  let total = 0;
  for (const entry of readdirSync(path, { withFileTypes: true })) {
    const child = join(path, entry.name);
    if (entry.isSymbolicLink()) continue;
    if (entry.isDirectory()) total += directoryBytes(child) ?? 0;
    else if (entry.isFile()) total += statSync(child).size;
  }
  return total;
}

const SIZE_ROWS = [
  ['Build `dist/`', 'buildBytes', 'dist'],
  ['Wasteland models', 'wastelandAssetBytes', 'public/assets/models/wasteland'],
  ['Largest runtime file', 'runtimeFileBytes', null],
  ['Largest ordinary tracked file', 'ordinaryTrackedFileBytes', null],
  ['Largest review sheet', 'lookSheetBytes', null],
  ['Review `looks/`', 'lookDirectoryBytes', 'docs/board/looks'],
  ['Added bytes in last merge', 'mergeAddedBytes', null],
  ['All `public/`', 'publicBytes', 'public'],
  ['Git objects', 'gitObjectBytes', null],
  ['Lane folders', 'laneCount', null],
];
function largestFile(path, predicate = () => true) {
  if (!existsSync(path)) return null;
  let max = 0;
  function visit(folder) {
    for (const entry of readdirSync(folder, { withFileTypes: true })) {
      const child = join(folder, entry.name);
      if (entry.isSymbolicLink()) continue;
      if (entry.isDirectory()) visit(child);
      else if (entry.isFile() && predicate(child)) max = Math.max(max, statSync(child).size);
    }
  }
  visit(path);
  return max;
}
function lastMergeAddedBytes(root) {
  const merge = git(root, ['log', '-1', '--merges', '--format=%H'], true)?.trim();
  if (!merge) return null;
  const parent = git(root, ['rev-parse', `${merge}^1`], true)?.trim();
  if (!parent) return null;
  // Include blobs created and later removed on the lane. They remain reachable
  // through its commits and consume Git storage even if the merge tip omits them.
  const objects = [...new Set((git(root, ['rev-list', '--objects', merge, `^${parent}`], true) ?? '')
    .split('\n').filter(Boolean).map(line => line.split(' ', 1)[0]))];
  if (!objects.length) return 0;
  const result = spawnSync('git', ['-C', root, 'cat-file', '--batch-check=%(objectname) %(objecttype) %(objectsize)'], {
    input: objects.join('\n') + '\n', encoding: 'utf8', shell: false, windowsHide: true,
    env: { ...process.env, GIT_OPTIONAL_LOCKS: '0' },
  });
  if (result.error || result.status !== 0) return null;
  return result.stdout.split('\n').reduce((sum, line) => {
    const match = line.match(/^[0-9a-f]+ blob (\d+)$/);
    return sum + (match ? Number(match[1]) : 0);
  }, 0);
}
function sizes(root) {
  const targets = jsonFile(join(root, 'tools/size-targets.json')).value ?? {};
  const previous = {};
  try {
    const oldStatus = readFileSync(join(root, 'docs/board/STATUS.md'), 'utf8');
    const oldFormat = /\| Item \| Before CLEAN-/.test(oldStatus);
    for (const [label, key] of SIZE_ROWS) {
      const row = oldStatus.split(/\r?\n/).find(line => line.startsWith(`| ${label} |`));
      const cells = row?.split('|').map(cell => cell.trim()) ?? [];
      const value = cells[oldFormat ? 3 : 2]?.match(/^([\d,]+)(?: B)?$/);
      if (value) {
        const measured = Number(value[1].replaceAll(',', ''));
        if (Number.isSafeInteger(measured)) previous[key] = measured;
      }
    }
  } catch { /* A first status has no prior measurement. */ }
  const tracked = (git(root, ['ls-files', '-z'], true) ?? '').split('\0').filter(Boolean);
  const ordinary = tracked.filter(path => !path.startsWith('public/') && !path.startsWith('docs/board/looks/'));
  const ordinaryMax = ordinary.reduce((max, path) => {
    const full = join(root, path);
    return existsSync(full) && !lstatSync(full).isSymbolicLink() ? Math.max(max, statSync(full).size) : max;
  }, 0);
  const gitCount = git(root, ['count-objects', '-v'], true);
  const packKiB = Number(gitCount?.match(/^size-pack:\s*(\d+)$/m)?.[1]);
  const looseKiB = Number(gitCount?.match(/^size:\s*(\d+)$/m)?.[1]);
  const lanePath = join(root, '.lanes');
  const laneCount = existsSync(lanePath) ? readdirSync(lanePath, { withFileTypes: true }).filter(entry => entry.isDirectory() && !entry.isSymbolicLink()).length : 0;
  const rows = SIZE_ROWS.map(([label, key, path]) => {
    const full = path ? join(root, path) : null;
    let current = full && existsSync(full) && !lstatSync(full).isSymbolicLink()
      ? (lstatSync(full).isDirectory() ? directoryBytes(full) : statSync(full).size) : null;
    if (key === 'runtimeFileBytes') current = largestFile(join(root, 'public'));
    if (key === 'ordinaryTrackedFileBytes') current = ordinaryMax;
    if (key === 'lookSheetBytes') current = largestFile(join(root, 'docs/board/looks'), file => /\.(jpg|jpeg)$/i.test(file));
    if (key === 'mergeAddedBytes') current = lastMergeAddedBytes(root);
    if (key === 'gitObjectBytes') current = Number.isFinite(packKiB) && Number.isFinite(looseKiB) ? (packKiB + looseKiB) * 1024 : null;
    if (key === 'laneCount') current = laneCount;
    return { label, key, current, previous: previous[key] ?? null, target: targets[key] ?? null };
  });
  return { rows, targetIssue: jsonFile(join(root, 'tools/size-targets.json')).issue };
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
    const isCommit = commit => typeof commit === 'string' && /^(?:[0-9a-f]{40}|[0-9a-f]{64})$/.test(commit);
    const valid = value && value.schema === 1 && value.tier === 'full' &&
      isCommit(value.commit) && isCommit(value.endCommit) && typeof value.passed === 'boolean' &&
      typeof value.dirty === 'boolean' && typeof value.time === 'string' &&
      typeof value.startDirty === 'boolean' && typeof value.endDirty === 'boolean' &&
      typeof value.complete === 'boolean' && Number.isSafeInteger(value.total) && value.total > 0 &&
      Number.isSafeInteger(value.completed) && value.completed >= 0 && value.completed <= value.total &&
      Array.isArray(value.failures) && value.failures.every(failure => typeof failure === 'string') &&
      Number.isFinite(Date.parse(value.time)) && Date.parse(value.time) <= Date.parse(now);
    if (!valid) status = 'invalid';
    else if (value.commit !== integration.commit) status = 'stale';
    else if (!value.passed) status = 'failed';
    else if (value.dirty || integration.dirty) status = 'dirty';
    // A passing flag alone never grants green: require all writer provenance
    // and consistent, complete coverage, including explicit clean endpoints.
    else if (!value.complete || value.completed !== value.total || value.failures.length !== 0 ||
      value.startDirty || value.endDirty || value.endCommit !== value.commit) status = 'invalid';
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
      const changed = merged ? [] : (git(root, ['diff', '--name-only', `${commit}...${head}`], true) ?? '').trim().split('\n').filter(Boolean);
      let dirty = null, issue = null, dirtyPaths = [];
      if (tree) {
        try {
          // Lane cleanup must also preserve uncommitted evidence.
          const status = git(tree.path, ['status', '--porcelain=v1', '--untracked-files=all']);
          dirtyPaths = status.split('\n').filter(Boolean).map(line => line.slice(3).trim());
          dirty = dirtyPaths.length > 0;
        } catch (error) { issue = error.message; }
      }
      const protectedRoot = tree && [root, liveRoot].filter(Boolean).some(path => resolve(path) === resolve(tree.path));
      const card = branch.match(/(?:^|\/)([a-z]+-\d+(?:-p\d+)?)(?:-|$)/i)?.[1].toUpperCase() ?? 'unknown';
      return { branch, commit: head, ageDays: Math.max(0, Math.floor((Date.parse(now) - Date.parse(date)) / 86400000)),
        path: tree?.path ?? null, dirty, merged, card, lastCommit: date,
        activity: dirty ? 'uncommitted changes; exact activity time unknown' : `last commit ${date}`,
        holds: [...new Set([...changed, ...dirtyPaths])].slice(0, 5).join(', ') || 'no file difference',
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
  const rollback = liveRoot ? jsonFile(join(liveRoot, 'dist-previous/build-version.json')) : { value: null, issue: 'not checked' };
  return { local, remotes, remoteTracking,
    rollback: { version: rollback.value?.id ?? null, status: rollback.issue ?? 'manifest present' },
    freshness: 'Remote-tracking refs are cached locally; no fetch or remote verification was performed.' };
}

const cell = value => String(value ?? 'unknown').replaceAll('|', '\\|').replace(/[\r\n]/g, ' ');
const bytes = (value, unit = 'B') => value === null ? 'unavailable' : `${value.toLocaleString('en-US')}${unit ? ` ${unit}` : ''}`;
export function renderStatus(report) {
  const lines = ['# Build status', '', `Observed at: ${report.time}`, '',
    `Observation commit: ${report.observationCommit}`, '',
    'This snapshot applies only to the observation commit and source state shown below. A later commit, including a metadata commit, does not inherit its full-run result.', '',
    `Integration HEAD: ${report.integration.commit}`, '',
    `Integration source: ${report.integration.dirty ? 'dirty' : 'clean'} (only the full-tier evidence ledger is excluded).`, '',
    `Live commit: ${report.live.commit ?? (report.live.checked ? 'unknown' : 'not checked')}`, '',
    `Live build version: ${report.live.version ?? (report.live.checked ? 'missing or invalid manifest' : 'not checked')}`, '',
    `Full tier: ${report.fullRun.status}; exact HEAD passed: ${report.fullRun.exactHead ? 'yes' : 'no'}.`, '',
    `Last recorded full run: ${report.fullRun.time ?? 'unknown'}; tested commit: ${report.fullRun.commit ?? 'unknown'}.`, '',
    '## Feature switches', '', '| Switch | State |', '| --- | --- |',
    ...Object.entries(report.features).map(([name, state]) => `| ${cell(name)} | ${cell(state)} |`), '',
    '## Lane branches', '', 'Age is whole days since the last branch commit. Removal candidates are suggestions only; this tool never removes a worktree.', '',
    '| Branch | Age (days) | Dirty | Merged | Removable | Folder |', '| --- | --- | --- | --- | --- | --- |',
    ...report.lanes.map(row => `| ${cell(row.branch)} | ${row.ageDays} | ${cell(row.dirty)} | ${row.merged} | ${row.removable} | ${cell(row.path)} |`), '',
    '## Unmerged branches for idle review', '', 'These branches stay in place. Uncommitted changes may be newer than the last commit, so their exact activity time is unknown. This tool never deletes a branch.', '',
    '| Branch | Card | Last commit | Age (days) | Activity | Holds |', '| --- | --- | --- | ---: | --- | --- |',
    ...report.lanes.filter(row => !row.merged).map(row => `| ${cell(row.branch)} | ${cell(row.card)} | ${cell(row.lastCommit)} | ${row.ageDays} | ${cell(row.activity)} | ${cell(row.holds)} |`), '',
    '## Size targets', '', 'Targets are advisory. Change compares with the previous status observation when available. Git object storage uses Git\'s KiB estimate.', '',
    '| Item | Current | Change | Target |', '| --- | ---: | ---: | ---: |',
    ...report.sizes.rows.map(row => {
      const unit = row.key === 'laneCount' ? '' : 'B';
      const delta = row.current === null || row.previous === null ? 'unavailable' :
        `${row.current - row.previous >= 0 ? '+' : ''}${(row.current - row.previous).toLocaleString('en-US')}${unit ? ` ${unit}` : ''}`;
      return `| ${row.label} | ${bytes(row.current, unit)} | ${delta} | ${bytes(row.target, unit)} |`;
    }), '',
    '## Backups', '', 'Local branch refs preserve committed history in this repository; they are not a separate off-machine backup.', '',
    ...Object.entries(report.backups.local).map(([branch, commit]) => `- Local ${branch}: ${commit ?? 'missing'}`), '',
    `Local rollback build (dist-previous): ${report.backups.rollback.version ?? report.backups.rollback.status}. Manifest presence does not verify the full rollback build.`, '',
    report.backups.freshness, '',
    ...(report.backups.remotes.length ? report.backups.remoteTracking.map(row =>
      `- Remote ${row.remote}/${row.branch}: ${row.status}; cached commit ${row.commit ?? 'missing'}.`) : ['Remote backup: none configured.']), '',
    ...report.issues.map(issue => `Issue: ${cell(issue)}`), ''];
  return lines.join('\n').replace(/\n*$/, '\n');
}

export function collectStatus({ root = ROOT, liveRoot = null, now = new Date().toISOString() } = {}) {
  const integration = sourceState(root), issues = [];
  const manifest = liveRoot ? jsonFile(join(liveRoot, 'dist/build-version.json')) : { value: null };
  const live = { checked: Boolean(liveRoot), commit: liveRoot ? git(liveRoot, ['rev-parse', 'HEAD'], true)?.trim() ?? null : null,
    version: typeof manifest.value?.id === 'string' ? manifest.value.id : null };
  if (liveRoot && !live.commit) issues.push('Live Git commit unavailable.');
  if (liveRoot && !live.version) issues.push('Live build manifest missing or invalid.');
  let features = {};
  try { features = featureStates(root); } catch (error) { issues.push(error.message); }
  const laneRows = lanes(root, liveRoot, integration.commit, now);
  issues.push(...laneRows.filter(row => row.issue).map(row => `${row.branch}: ${row.issue}`));
  const sizeReport = sizes(root);
  if (sizeReport.targetIssue) issues.push(`Size targets ${sizeReport.targetIssue}.`);
  return { schema: 1, time: now, observationCommit: integration.commit, integration, live,
    fullRun: fullRun(root, integration, now), features, lanes: laneRows, sizes: sizeReport,
    backups: backups(root, liveRoot), issues };
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
  let liveRoot = options.liveRoot ? resolve(options.liveRoot) : null;
  if (liveRoot) try { liveRoot = realpathSync(liveRoot); } catch { /* Missing live roots remain unknown. */ }
  const insideLive = path => [LIVE_ROOT, liveRoot].filter(Boolean).some(protectedRoot => {
    const rel = relative(protectedRoot, path);
    return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel));
  });
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
