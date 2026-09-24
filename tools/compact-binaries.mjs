import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// This tool has no push or release step. An approval file binds a future
// authorized rewrite to one repository and its exact current refs.
const LIVE_ROOT = 'C:/Users/kyleb/dev/the-duel-remake';
const BINARY_SUFFIXES = new Set(['.bin', '.blend', '.glb', '.hdr', '.ico', '.jpg', '.jpeg', '.mp3', '.png', '.wav', '.webm', '.zip']);
const TEXT_SUFFIXES = new Set(['.bat', '.cjs', '.css', '.csv', '.gltf', '.html', '.htm', '.js', '.json', '.jsx', '.md', '.mjs', '.obj', '.ps1', '.sh', '.svg', '.toml', '.ts', '.tsv', '.tsx', '.txt', '.xml', '.yaml', '.yml']);
const TEXT_BASENAMES = new Set(['.gitattributes', '.gitignore', '.npmrc', 'LICENSE']);
const inside = (parent, child) => {
  const part = relative(parent, child);
  return part === '' || (!part.startsWith('..') && !isAbsolute(part));
};
function git(root, args, { input, env = {}, allowFailure = false, binary = false } = {}) {
  const result = spawnSync('git', ['-C', root, ...args], {
    input, encoding: binary ? null : 'utf8', shell: false, windowsHide: true,
    env: { ...process.env, GIT_OPTIONAL_LOCKS: '0', ...env },
    maxBuffer: 128 * 1024 * 1024,
  });
  if (result.error || result.status !== 0) {
    if (allowFailure) return null;
    throw Error(`git ${args[0]} failed: ${result.error?.message ?? String(result.stderr).trim()}`);
  }
  return result.stdout;
}
const lines = text => text.trim().split(/\r?\n/).filter(Boolean);
const nulPaths = bytes => bytes.toString('utf8').split('\0').filter(Boolean);

function parseArgs(args) {
  const options = {};
  for (let i = 0; i < args.length; i++) {
    const flag = args[i];
    if (flag === '--execute') options.execute = true;
    else if (['--repo', '--backup-dir', '--approval-file'].includes(flag)) {
      const value = args[++i];
      if (!value || value.startsWith('--')) throw Error(`${flag} needs a path.`);
      options[{ '--repo': 'repo', '--backup-dir': 'backupDir', '--approval-file': 'approvalFile' }[flag]] = value;
    } else throw Error(`Unknown argument: ${flag}`);
  }
  if (!options.repo || !options.backupDir || !options.execute || !options.approvalFile) {
    throw Error('Required: --repo, --backup-dir, --execute and --approval-file. No ref changes were made.');
  }
  return options;
}

function commitInfo(root, oid) {
  const raw = git(root, ['cat-file', '-p', oid]);
  const split = raw.indexOf('\n\n');
  if (split < 0) throw Error(`Commit ${oid} has no message separator.`);
  const headers = lines(raw.slice(0, split));
  if (headers.some(line => /^\s|^(gpgsig|mergetag|encoding) /.test(line))) {
    throw Error(`Commit ${oid} has an unsupported signed or encoded header.`);
  }
  const field = name => headers.find(line => line.startsWith(name + ' '))?.slice(name.length + 1);
  const identity = value => {
    const match = value?.match(/^(.*) <([^<>]+)> (\d+) ([+-]\d{4})$/);
    if (!match) throw Error(`Commit ${oid} has an unsupported identity.`);
    return { name: match[1], email: match[2], date: `${match[3]} ${match[4]}` };
  };
  return { author: identity(field('author')), committer: identity(field('committer')),
    message: raw.slice(split + 2) };
}

function changedPaths(root, commits) {
  const paths = new Map();
  for (const oid of commits) {
    const raw = git(root, ['diff-tree', '--no-commit-id', '--name-only', '--no-renames', '-r', '-m', '-z', oid], { binary: true });
    for (const path of nulPaths(raw)) {
      if (!paths.has(path)) paths.set(path, new Set());
      paths.get(path).add(oid);
    }
  }
  return paths;
}

function hasSpecificTextRule(root, path) {
  const parts = path.split('/');
  for (let depth = 0; depth < parts.length; depth++) {
    const folder = parts.slice(0, depth).join('/');
    const attributesPath = join(root, folder, '.gitattributes');
    let source;
    try { source = readFileSync(attributesPath, 'utf8'); }
    catch { continue; }
    const localPath = parts.slice(depth).join('/');
    for (const line of source.split(/\r?\n/)) {
      const [pattern, ...rules] = line.trim().split(/\s+/);
      if (!pattern || pattern.startsWith('#') || pattern === '*' || !rules.includes('text')) continue;
      const target = pattern.includes('/') ? localPath : basename(localPath);
      const glob = pattern.replace(/^\//, '').replace(/[.+^${}()|[\]\\]/g, '\\$&')
        .replace(/\*\*/g, '\u0001').replace(/\*/g, '[^/]*').replace(/\u0001/g, '.*').replace(/\?/g, '[^/]');
      if (new RegExp(`^${glob}$`).test(target)) return true;
    }
  }
  return false;
}

function isBinaryPath(root, path, commits) {
  const suffix = path.slice(path.lastIndexOf('.')).toLowerCase();
  const attribute = git(root, ['check-attr', 'binary', '--', path]);
  if (attribute.trim().endsWith(': set')) return true;
  const textAttribute = git(root, ['check-attr', 'text', '--', path]).trim();
  const textState = textAttribute.slice(textAttribute.lastIndexOf(': ') + 2);
  const markedText = (textState === 'set' && hasSpecificTextRule(root, path)) ||
    (textState !== 'unset' && (TEXT_SUFFIXES.has(suffix) || TEXT_BASENAMES.has(basename(path))));
  if (BINARY_SUFFIXES.has(suffix) && !markedText) return true;
  // For an unfamiliar suffix, inspect every changed blob. Large unknown
  // assets are classified conservatively so they cannot evade compaction.
  for (const oid of commits) {
    const object = git(root, ['rev-parse', `${oid}:${path}`], { allowFailure: true })?.trim();
    if (!object) continue;
    const size = Number(git(root, ['cat-file', '-s', object]).trim());
    if (size > 64 * 1024 * 1024) {
      if (markedText) throw Error(`Text-marked file ${path} is too large to validate; classification required.`);
      return true;
    }
    const blob = git(root, ['cat-file', 'blob', object], { binary: true });
    if (blob.includes(0)) {
      if (markedText) throw Error(`Text-marked file ${path} contains NUL bytes; mark it binary or repair it.`);
      return true;
    }
    try { new TextDecoder('utf-8', { fatal: true }).decode(blob); }
    catch {
      if (markedText) throw Error(`Text-marked file ${path} is not valid UTF-8; mark it binary or repair it.`);
      return true;
    }
    if (!markedText && blob.some(byte => byte < 9 || (byte > 13 && byte < 32))) {
      throw Error(`Ambiguous file ${path}; mark it binary or text in .gitattributes before compaction.`);
    }
  }
  if (markedText) return false;
  if (path.startsWith('public/')) {
    throw Error(`Ambiguous runtime file ${path}; mark it binary or text in .gitattributes before compaction.`);
  }
  return false;
}

function baseEntry(root, master, path) {
  const raw = git(root, ['ls-tree', '-z', master, '--', path], { binary: true });
  const row = nulPaths(raw)[0];
  if (!row) return null;
  const match = row.match(/^(\d+) blob ([0-9a-f]+)\t/);
  if (!match) throw Error(`Unsupported base entry for ${path}.`);
  return { mode: match[1], oid: match[2] };
}

function treeEntries(root, ref) {
  const raw = git(root, ['ls-tree', '-r', '-z', ref], { binary: true });
  return new Map(nulPaths(raw).map(row => {
    const match = row.match(/^(\d+) blob ([0-9a-f]+)\t([\s\S]+)$/);
    return match ? [match[3], { mode: match[1], oid: match[2] }] : null;
  }).filter(Boolean));
}

function bundleBackup(root, backupDir, head, master) {
  mkdirSync(backupDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const bundle = join(backupDir, `integration-before-${head.slice(0, 12)}-${stamp}.bundle`);
  git(root, ['bundle', 'create', bundle, '--all']);
  git(root, ['bundle', 'verify', bundle]);
  const heads = git(root, ['bundle', 'list-heads', bundle]);
  if (!heads.includes(head) || !heads.includes(master)) throw Error('Bundle is missing the protected refs.');
  const retainUntil = new Date(Date.now() + 7 * 86400000).toISOString();
  writeFileSync(bundle + '.retention.json', JSON.stringify({ head, master, verified: true, retainUntil }, null, 2) + '\n');
  return bundle;
}

export function compact({ repo, backupDir, approvalFile }) {
  if (inside(resolve(LIVE_ROOT), resolve(repo))) throw Error('Refusing the live checkout.');
  const root = realpathSync(resolve(repo));
  if (inside(resolve(LIVE_ROOT), root)) throw Error('Refusing the live checkout.');
  const top = realpathSync(git(root, ['rev-parse', '--show-toplevel']).trim());
  if (top !== root) throw Error('Repository path must be the worktree root.');
  const branch = git(root, ['symbolic-ref', '--quiet', '--short', 'HEAD'], { allowFailure: true })?.trim();
  if (branch !== 'integration/wasteland') throw Error('Only integration/wasteland can be compacted; master is protected.');
  if (git(root, ['status', '--porcelain=v1', '--untracked-files=all']).trim()) throw Error('Refusing a dirty worktree.');
  const head = git(root, ['rev-parse', 'HEAD']).trim();
  const master = git(root, ['rev-parse', 'refs/heads/master']).trim();
  if (git(root, ['merge-base', '--is-ancestor', master, head], { allowFailure: true }) === null) {
    throw Error('Master must be an ancestor of integration.');
  }
  const otherBranches = lines(git(root, ['for-each-ref', '--format=%(refname:short)', 'refs/heads']))
    .filter(name => !['master', 'integration/wasteland'].includes(name));
  if (otherBranches.length) throw Error('Other branches must be resolved before compaction; none were deleted.');
  const approvalPath = resolve(approvalFile);
  if (inside(resolve(LIVE_ROOT), approvalPath) || inside(resolve(LIVE_ROOT), realpathSync(approvalPath))) {
    throw Error('Refusing to read approval from the live checkout.');
  }
  const approval = JSON.parse(readFileSync(approvalPath, 'utf8'));
  if (approval.approvedBy !== 'Kyle' || realpathSync(resolve(approval.repo)) !== root || approval.head !== head || approval.master !== master) {
    throw Error('Approval file does not bind this exact repository and ref state.');
  }
  const backup = realpathSync(resolve(backupDir));
  if (inside(root, backup) || inside(resolve(LIVE_ROOT), backup)) throw Error('Backup directory must be outside the repository and live checkout.');

  const graph = lines(git(root, ['rev-list', '--reverse', '--topo-order', '--parents', `${master}..${head}`]))
    .map(line => line.split(' '));
  if (!graph.length) throw Error('No integration commits to compact.');
  const originalCommits = graph.map(row => row[0]);
  const paths = [...changedPaths(root, originalCommits)]
    .filter(([path, touched]) => isBinaryPath(root, path, touched)).map(([path]) => path);
  const inherited = new Map(paths.map(path => [path, baseEntry(root, master, path)]));
  const oldTree = git(root, ['rev-parse', `${head}^{tree}`]).trim();
  const bundle = bundleBackup(root, backup, head, master);
  const scratch = mkdtempSync(join(tmpdir(), 'duel-compact-index-'));
  const indexEnv = { GIT_INDEX_FILE: join(scratch, 'index') };
  const rewritten = new Map();
  try {
    for (const [oid, ...parents] of graph) {
      let tree;
      if (oid === head) tree = oldTree;
      else {
        git(root, ['read-tree', oid], { env: indexEnv });
        for (const path of paths) {
          const entry = inherited.get(path);
          if (entry) git(root, ['update-index', '--add', '--cacheinfo', entry.mode, entry.oid, path], { env: indexEnv });
          else git(root, ['update-index', '--force-remove', '--', path], { env: indexEnv });
        }
        tree = git(root, ['write-tree'], { env: indexEnv }).trim();
      }
      const info = commitInfo(root, oid);
      const parentArgs = parents.flatMap(parent => ['-p', rewritten.get(parent) ?? parent]);
      const next = git(root, ['commit-tree', tree, ...parentArgs], {
        input: info.message,
        env: {
          GIT_AUTHOR_NAME: info.author.name, GIT_AUTHOR_EMAIL: info.author.email, GIT_AUTHOR_DATE: info.author.date,
          GIT_COMMITTER_NAME: info.committer.name, GIT_COMMITTER_EMAIL: info.committer.email, GIT_COMMITTER_DATE: info.committer.date,
        },
      }).trim();
      rewritten.set(oid, next);
    }
  } finally { rmSync(scratch, { recursive: true, force: true }); }
  const newHead = rewritten.get(head);
  const newTree = git(root, ['rev-parse', `${newHead}^{tree}`]).trim();
  if (newTree !== oldTree) throw Error('Tip tree changed; original ref and verified bundle retained.');
  for (const [oldId, newId] of rewritten) {
    if (oldId === head) continue;
    const entries = treeEntries(root, newId);
    for (const path of paths) {
      const entry = entries.get(path);
      const expected = inherited.get(path);
      if (entry?.oid !== expected?.oid || entry?.mode !== expected?.mode) {
        throw Error(`Historical binary entry ${path} was not compacted; original ref and bundle retained.`);
      }
    }
  }
  if (git(root, ['rev-parse', 'refs/heads/master']).trim() !== master ||
      git(root, ['rev-parse', 'refs/heads/integration/wasteland']).trim() !== head ||
      git(root, ['status', '--porcelain=v1', '--untracked-files=all']).trim()) {
    throw Error('Repository changed during compaction; original ref and bundle retained.');
  }
  const mapPath = bundle + '.commit-map.txt';
  writeFileSync(mapPath, [...rewritten].map(([oldId, newId]) => `${oldId} ${newId}`).join('\n') + '\n');
  git(root, ['update-ref', 'refs/heads/integration/wasteland', newHead, head]);
  if (git(root, ['rev-parse', 'refs/heads/master']).trim() !== master) throw Error('Master changed unexpectedly.');
  return { oldHead: head, newHead, tree: newTree, binaryPaths: paths.length, bundle, mapPath };
}

export function main(args = process.argv.slice(2)) {
  const options = parseArgs(args);
  const result = compact(options);
  process.stdout.write(JSON.stringify(result) + '\n');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(); } catch (error) { console.error('Binary compaction: ' + error.message); process.exitCode = 1; }
}
