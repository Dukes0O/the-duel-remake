#!/usr/bin/env node
// Read-only inventory for the janitor. Every "unused" result is a candidate,
// never proof that deleting a file is safe (paths may be generated at runtime).
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, dirname, extname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const DEFAULT_ROOT = fileURLToPath(new URL('../', import.meta.url));
const SKIP = new Set(['.git', 'node_modules', 'dist', '.qa-dist', '.evidence', 'art-build']);
const TEXT = new Set(['.js', '.mjs', '.cjs', '.ts', '.jsx', '.tsx', '.html', '.css', '.json']);
const SOURCE = new Set(['.js', '.mjs', '.cjs', '.ts', '.jsx', '.tsx']);
const norm = path => path.split(sep).join('/');

function git(root, args) {
  const result = spawnSync('git', ['-C', root, ...args], {
    encoding: 'utf8', shell: false, windowsHide: true,
    env: { ...process.env, GIT_OPTIONAL_LOCKS: '0' },
  });
  return result.status === 0 ? result.stdout : null;
}

function isGitRoot(root) {
  const top = git(root, ['rev-parse', '--show-toplevel']);
  return top !== null && resolve(top.trim()) === resolve(root);
}

function walk(root, folder = '', output = []) {
  const directory = join(root, folder);
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (SKIP.has(entry.name) || entry.isSymbolicLink()) continue;
    const path = norm(join(folder, entry.name));
    if (entry.isDirectory()) walk(root, path, output);
    else if (entry.isFile()) output.push(path);
  }
  return output;
}

function inventory(root, warnings) {
  const listing = isGitRoot(root) ? git(root, ['ls-files', '-z']) : null;
  if (listing === null) warnings.push('Git is unavailable; file sizes and candidates use the local directory tree.');
  const files = listing === null ? walk(root) : listing.split('\0').filter(Boolean);
  return files.map(path => {
    try { return { path: norm(path), bytes: statSync(join(root, path)).size }; }
    catch { return null; }
  }).filter(Boolean);
}

function readText(root, path) {
  try { return readFileSync(join(root, path), 'utf8'); }
  catch { return ''; }
}

function sizeReport(files) {
  const folders = new Map();
  for (const file of files) {
    let folder = dirname(file.path).replaceAll('\\', '/');
    while (folder !== '.') {
      const item = folders.get(folder) || { path: folder, bytes: 0, files: 0 };
      item.bytes += file.bytes; item.files++;
      folders.set(folder, item);
      folder = dirname(folder).replaceAll('\\', '/');
    }
  }
  return {
    largestFiles: [...files].sort((a, b) => b.bytes - a.bytes || a.path.localeCompare(b.path)).slice(0, 30),
    folderSizes: [...folders.values()].sort((a, b) => b.bytes - a.bytes || a.path.localeCompare(b.path)),
  };
}

function references(root, files, includeTools = false) {
  return files.filter(row => TEXT.has(extname(row.path).toLowerCase()) &&
    !row.path.startsWith('docs/') && (includeTools || !row.path.startsWith('tools/')))
    .map(row => ({ path: row.path, text: readText(root, row.path) }));
}

function assetCandidates(files, texts) {
  return files.filter(row => row.path.startsWith('public/') && row.path !== 'public/favicon.ico')
    .filter(row => {
      const name = basename(row.path);
      const relativePath = row.path.slice('public/'.length);
      return !texts.some(source => source.path !== row.path &&
        (source.text.includes(relativePath) || source.text.includes(name)));
    })
    .map(row => ({ path: row.path, bytes: row.bytes, reason: 'No literal filename or public path found in runtime text files.' }));
}

function importSpecifiers(source) {
  const imports = [];
  for (const match of source.matchAll(/\b(?:import|export)\s+[^;]*?\s+from\s*['"]([^'"]+)['"]/g)) imports.push(match[1]);
  for (const match of source.matchAll(/\bimport\s*['"]([^'"]+)['"]/g)) imports.push(match[1]);
  for (const match of source.matchAll(/\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g)) imports.push(match[1]);
  return imports;
}

function moduleCandidates(root, files, texts) {
  const modules = files.filter(row => row.path.startsWith('src/') && SOURCE.has(extname(row.path)));
  const specs = texts.flatMap(row => importSpecifiers(row.text).map(spec => ({ from: row.path, spec })));
  const htmlEntries = texts.filter(row => row.path.endsWith('.html')).map(row => row.text).join('\n');
  const coreEntries = texts.flatMap(row => [...row.text.matchAll(/\bCORE_SUITE\s*=\s*['"]([^'"]+)['"]/g)]
    .map(match => match[1]));
  return modules.filter(row => {
    const path = row.path;
    if (htmlEntries.includes(path) || htmlEntries.includes('/' + path)) return false;
    if (coreEntries.includes(path)) return false;
    return !specs.some(({ from, spec }) => {
      if (!spec.startsWith('.')) return false;
      const target = norm(resolve(root, dirname(from), spec));
      const candidate = norm(resolve(root, path));
      return target === candidate || target + '.js' === candidate || target + '.mjs' === candidate ||
        target + '/index.js' === candidate;
    });
  }).map(row => ({ path: row.path, reason: 'No literal import, HTML entry or named core-suite entry found; dynamic loading may exist.' }));
}

function exportCandidates(root, files, texts) {
  const out = [];
  for (const row of files.filter(row => row.path.startsWith('src/') && SOURCE.has(extname(row.path)))) {
    const source = readText(root, row.path);
    const names = new Set();
    for (const match of source.matchAll(/\bexport\s+(?:async\s+)?(?:function|class|const|let|var)\s+([A-Za-z_$][\w$]*)/g)) names.add(match[1]);
    for (const match of source.matchAll(/\bexport\s*\{([^}]+)\}/g)) {
      for (const part of match[1].split(',')) {
        const name = part.trim().split(/\s+as\s+/)[0].trim();
        if (/^[A-Za-z_$][\w$]*$/.test(name)) names.add(name);
      }
    }
    for (const name of names) {
      const word = new RegExp(`\\b${name.replace(/[$]/g, '\\$&')}\\b`);
      if (!texts.some(other => other.path !== row.path && word.test(other.text)))
        out.push({ path: row.path, name, reason: 'Export name has no literal reference in another text file.' });
    }
  }
  return out;
}

function featureStates(source) {
  const match = source.match(/\bFEATURE_STATES\s*=\s*Object\.freeze\s*\(\s*\{([\s\S]*?)\}\s*\)/);
  if (!match) return [];
  return [...match[1].matchAll(/(?:['"]([a-z][a-z0-9-]*)['"]|\b([a-z][a-z0-9-]*)\b)\s*:\s*['"]on['"]/g)]
    .map(m => m[1] || m[2]);
}

function removedFeatureTests(files, texts, flags) {
  const tests = files.filter(row => /(?:^|\/)(?:test|tests)\//.test(row.path) || /(?:^|[-.])test\.[cm]?js$/.test(row.path));
  const runtime = texts.filter(row => row.path.startsWith('src/')).map(row => row.text).join('\n');
  const allSwitches = new Set([...flags]);
  for (const text of runtime.matchAll(/(?:featureFlags|featureFlags\.state|enabled)\s*\(\s*['"]([a-z][a-z0-9-]*)['"]/g)) allSwitches.add(text[1]);
  return tests.filter(row => {
    const path = row.path.toLowerCase();
    const source = texts.find(item => item.path === row.path)?.text || '';
    return /removed|obsolete|deprecated|legacy/.test(path) &&
      ![...allSwitches].some(name => path.includes(name) || source.includes(name));
  }).map(row => ({ path: row.path, reason: 'Legacy or removed test name; verify its behavior against current code.' }));
}

function unindexedDocs(root, files, warnings) {
  const indexPath = 'docs/README.md';
  if (!existsSync(join(root, indexPath))) {
    warnings.push('docs/README.md is absent; document indexing cannot be checked.');
    return [];
  }
  const index = readText(root, indexPath);
  return files.filter(row => row.path.startsWith('docs/') && row.path.endsWith('.md') && row.path !== indexPath)
    .filter(row => !index.includes(row.path) && !index.includes(row.path.slice('docs/'.length)))
    .map(row => ({ path: row.path }));
}

function laneState(root, warnings, skipLanes) {
  const lanes = [];
  const skippedBranches = new Set(skipLanes);
  const list = isGitRoot(root) ? git(root, ['worktree', 'list', '--porcelain']) : null;
  if (list !== null) {
    const integrationHead = git(root, ['rev-parse', '--verify', 'refs/heads/integration/wasteland'])?.trim() || null;
    if (!integrationHead) warnings.push('integration/wasteland is unavailable; lane merge ancestry is unknown.');
    const refs = git(root, ['for-each-ref',
      '--format=%(refname:short)%09%(objectname)%09%(committerdate:iso-strict)', 'refs/heads']);
    const branches = new Map((refs || '').trim().split(/\r?\n/).filter(Boolean)
      .map(line => line.split('\t')).map(([branch, head, lastActivity]) =>
        [branch, { head, lastActivity }]));
    const branchFields = branch => {
      const details = branches.get(branch);
      const mergedIntoIntegration = integrationHead && details
        ? git(root, ['merge-base', '--is-ancestor', details.head, integrationHead]) !== null : null;
      return { head: details?.head || null, lastActivity: details?.lastActivity || null,
        mergedIntoIntegration };
    };
    for (const block of list.trim().split(/\r?\n\s*\r?\n/)) {
      const path = block.match(/^worktree (.+)$/m)?.[1];
      if (!path) continue;
      const branch = block.match(/^branch refs\/heads\/(.+)$/m)?.[1] || null;
      if (!branch || !/^(?:lane|codex)\//.test(branch)) continue;
      const status = block.includes('prunable') ? 'prunable' : block.includes('locked') ? 'locked' : 'registered';
      // Worktree inspection is limited to lane branches. Never inspect the live checkout.
      const isLive = norm(resolve(path)).toLowerCase() === 'c:/users/kyleb/dev/the-duel-remake';
      const inspectionSkipped = skippedBranches.has(branch);
      const worktreeStatus = !isLive && !inspectionSkipped && status === 'registered'
        ? git(path, ['status', '--porcelain=v1', '--untracked-files=all']) : null;
      const dirty = worktreeStatus === null ? null : worktreeStatus.length > 0;
      const fields = branchFields(branch);
      lanes.push({ path, branch, ...fields, dirty,
        status: inspectionSkipped ? `${status}; inspection skipped` : status, inspectionSkipped,
        cleanupCandidate: !inspectionSkipped && fields.mergedIntoIntegration === true && dirty === false,
        removable: false });
    }
    for (const [branch] of branches) {
      if (!/^(?:lane|codex)\//.test(branch) || lanes.some(row => row.branch === branch)) continue;
      const fields = branchFields(branch);
      const inspectionSkipped = skippedBranches.has(branch);
      lanes.push({ path: null, branch, ...fields, dirty: null, inspectionSkipped,
        status: inspectionSkipped ? 'branch without worktree; inspection skipped' : 'branch without worktree',
        cleanupCandidate: !inspectionSkipped && fields.mergedIntoIntegration === true, removable: false });
    }
  } else warnings.push('Git worktree state is unavailable.');
  const laneDir = join(root, '.lanes');
  if (existsSync(laneDir)) {
    for (const entry of readdirSync(laneDir, { withFileTypes: true })) {
      if (!entry.isDirectory() || entry.isSymbolicLink()) continue;
      const path = norm(join('.lanes', entry.name));
      if (!lanes.some(row => row.path && norm(row.path).endsWith('/' + path)))
        lanes.push({ path, branch: null, status: 'unmatched lane folder; inspect before removal', removable: false });
    }
  }
  return lanes;
}

export function audit(root = DEFAULT_ROOT, { skipLanes = [] } = {}) {
  if (!Array.isArray(skipLanes) || skipLanes.some(branch => typeof branch !== 'string' || !branch.trim()))
    throw Error('skipLanes must be an array of nonempty exact branch names.');
  root = resolve(root);
  const warnings = ['Candidates are advisory. Literal-reference scans cannot resolve generated paths, imports, or reflection.'];
  const files = inventory(root, warnings);
  const texts = references(root, files);
  const codeAndToolTexts = references(root, files, true);
  const flags = featureStates(readText(root, 'src/feature-flags.js'));
  return {
    root, trackedFiles: files.length, totalBytes: files.reduce((sum, row) => sum + row.bytes, 0),
    ...sizeReport(files),
    runtimeAssetCandidates: assetCandidates(files, texts),
    moduleCandidates: moduleCandidates(root, files, codeAndToolTexts),
    exportCandidates: exportCandidates(root, files, codeAndToolTexts),
    removedFeatureTestCandidates: removedFeatureTests(files, codeAndToolTexts, flags),
    unindexedDocs: unindexedDocs(root, files, warnings),
    fullyOnSwitches: flags,
    lanes: laneState(root, warnings, skipLanes),
    warnings,
  };
}

function parseArgs(args) {
  let root = DEFAULT_ROOT, json = false;
  const skipLanes = [];
  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    if (arg === '--root' && args[index + 1]) root = args[++index];
    else if (arg === '--json') json = true;
    else if (arg === '--skip-lane') {
      const branch = args[++index];
      if (!branch || !branch.trim() || branch.startsWith('--')) throw Error('--skip-lane needs a value.');
      skipLanes.push(branch);
    }
    else throw Error(`Unknown or incomplete argument: ${arg}`);
  }
  return { root, json, skipLanes };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const { root, json, skipLanes } = parseArgs(process.argv.slice(2));
    const report = audit(root, { skipLanes });
    if (json) console.log(JSON.stringify(report, null, 2));
    else {
      console.log(`Repository audit: ${report.root}`);
      console.log(`${report.trackedFiles} files, ${(report.totalBytes / 1048576).toFixed(1)} MiB`);
      for (const key of ['largestFiles', 'folderSizes', 'runtimeAssetCandidates', 'moduleCandidates',
        'exportCandidates', 'removedFeatureTestCandidates', 'unindexedDocs', 'fullyOnSwitches', 'lanes']) {
        console.log(`\n${key} (${report[key].length})`);
        for (const row of report[key]) console.log(typeof row === 'string' ? `  ${row}` : `  ${JSON.stringify(row)}`);
      }
      for (const warning of report.warnings) console.log(`Warning: ${warning}`);
    }
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
