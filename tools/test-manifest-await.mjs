// FIX-MANIFEST-AWAIT: the game's modules load in a single-chunk bundle (the way the browser scenarios'
// helper bundles are made) without waiting for each other forever. Two things used to stop that:
// src/circuit-manifests.js ended in a top-level await, and src/combat-weapons.js and src/arsenal/oil.js
// imported each other. Each bundle is built with Vite and run in Node under a time limit.
import assert from 'node:assert/strict';
import {mkdirSync, readdirSync, readFileSync, writeFileSync} from 'node:fs';
import {join, resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {build} from 'vite';

const root = resolve(fileURLToPath(new URL('../', import.meta.url)));
const scratch = join(root, '.qa-dist');
const LIMIT_MS = 30_000;
let checks = 0;
const ok = (value, label) => { assert.ok(value, label); checks++; };

// No module the game loads may have a top-level await. Two files are named: src/main.js is the page's entry and nothing
// imports it; src/circuit-manifests.js waits only on its Node branch (tests and tools), which a bundle drops (checked
// below: no bundle holds the Node import, and every bundle finishes loading).
const sourceFiles = dir => readdirSync(join(root, dir), {withFileTypes: true}).flatMap(entry =>
  entry.isDirectory() ? sourceFiles(join(dir, entry.name)) : entry.name.endsWith('.js') ? [join(dir, entry.name).replaceAll('\\', '/')] : []);
const WAITS = ['src/main.js', 'src/circuit-manifests.js'];
for (const file of sourceFiles('src')) {
  const lines = readFileSync(join(root, file), 'utf8').split('\n');
  const bad = WAITS.includes(file) ? -1 : lines.findIndex(line => /^(export\s+)?(const|let|var)\s.*=\s*.*\bawait\b/.test(line) || /^await\b/.test(line) || /^for await\b/.test(line));
  ok(bad < 0, `${file}:${bad + 1} has a top-level await`);
}

// The arsenal pieces do not import the weapon file that imports them.
for (const file of sourceFiles('src/arsenal')) {
  const imports = [...readFileSync(join(root, file), 'utf8').matchAll(/from\s+'([^']+)'/g)].map(match => match[1]);
  ok(!imports.includes('../combat-weapons.js'), `${file} imports combat-weapons.js, which imports it`);
}

// Bundles that hung: the whole game, and the pair that used to wait for each other behind the manifest list.
const ENTRIES = {
  game: ['src/game.js'],
  'weapons and oil': ['src/config.js', 'src/combat-weapons.js', 'src/arsenal/oil.js'],
  'oil first': ['src/arsenal/oil.js', 'src/combat-weapons.js'],
  // The line driver imports the whole game (the yeti scenario's helper bundle used to stub that import out).
  'line driver': ['tools/track-script-drive.mjs'],
};
mkdirSync(scratch, {recursive: true});
const AsyncFunction = (async () => {}).constructor;
for (const [name, modules] of Object.entries(ENTRIES)) {
  const entry = join(scratch, `manifest-await.${name.replaceAll(' ', '-')}.js`).replaceAll('\\', '/');
  writeFileSync(entry, modules.map(file => `import ${JSON.stringify(join(root, file).replaceAll('\\', '/'))};`).join('') + 'globalThis.__bundleLoaded = true;');
  const result = await build({root, configFile: false, logLevel: 'silent', define: {__DUEL_QA__: 'true'},
    build: {write: false, emptyOutDir: false, minify: false, lib: {entry, formats: ['es']}, rolldownOptions: {output: {codeSplitting: false}}}});
  const chunk = (Array.isArray(result) ? result[0] : result).output.find(row => row.type === 'chunk');
  ok(chunk, `${name}: bundle built`);
  delete globalThis.__bundleLoaded;
  let timer;
  const finished = await Promise.race([
    new AsyncFunction(chunk.code)().then(() => true),
    new Promise(resolveTimer => { timer = setTimeout(() => resolveTimer(false), LIMIT_MS); }),
  ]);
  clearTimeout(timer);
  ok(finished && globalThis.__bundleLoaded === true, `${name}: the bundle finishes loading (it waited ${LIMIT_MS / 1000} s)`);
  ok(!chunk.code.includes('node:fs'), `${name}: the bundle holds no Node-only course reader`);
}

// Node loads in any order: a graph that imports a course file as well as the game (a test does) loads, whichever comes
// first, and each course file loads first on its own. Each in a fresh process: a module graph is decided once.
const circuitFiles = readdirSync(join(root, 'src/circuits')).filter(name => name.endsWith('.js')).sort();
const url = file => pathToFileURL(join(root, file)).href;
const loads = (name, source) => {
  const file = join(scratch, `manifest-await.order.${name}.mjs`);
  writeFileSync(file, source);
  const run = spawnSync(process.execPath, [file], {encoding: 'utf8', timeout: LIMIT_MS});
  ok(run.status === 0, `${name}: loads in a fresh process (${(run.stderr || '').split('\n').find(line => /Error/.test(line)) ?? run.error ?? 'no output'})`);
};
for (const name of circuitFiles) {
  const circuit = url('src/circuits/' + name);
  loads(`${name}.alone`, `await import(${JSON.stringify(circuit)});`);
  loads(`${name}.after-course`, `import ${JSON.stringify(url('src/course.js'))};import ${JSON.stringify(circuit)};`);
  loads(`${name}.before-course`, `import ${JSON.stringify(circuit)};import ${JSON.stringify(url('src/course.js'))};`);
}
console.log(`Manifest await: ${checks} checks passed.`);
process.exit(0);
