// One owned QA build feeds isolated scenario children. Timing scenarios run alone.
import { spawn } from 'node:child_process';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { buildQaBundle, recycleQaBundle, evidenceOutputDir, resolveEvidenceDir } from './browser-harness.mjs';

export const PROJECT_ROOT = resolve(fileURLToPath(new URL('../', import.meta.url)));
const harness = join(PROJECT_ROOT, 'tools', 'browser-harness.mjs');
const scenarioDir = join(PROJECT_ROOT, 'tools', 'scenarios');

// These existing recipes measure RAF/render cost or construction time, including
// conditional art/diagnostic paths. Do not change their measurements or limits.
export const QUIET_SCENARIOS = Object.freeze([
  'arena-ambush-alley', 'arena-fuel-run', 'arena-pit', 'arena-shove',
  'armor-kit-visuals', 'arsenal-core', 'blackiron', 'combat-armor-frame-pacing',
  'combat-ramming', 'convoy-frames', 'convoy-raid', 'convoy-tanker-art',
  'crew-fighters', 'deep-frames', 'first-person-gear', 'first-person-polish', 'frame-pacing',
  'grand-prix', 'gunn', 'harbour-night', 'hidden-road-discovery',
  'onfoot-camera-choice', 'p4-daynight', 'p4-snow', 'polish-arena', 'polish-flame',
  'rustwall', 'rustwall-frame', 'sal-art', 'salt-flats', 'scrapdome',
  'scrapdome-review', 'track-kits',
  'vesper-art', 'wasteland-beta',
]);

export function parseSuiteArguments(args) {
  const options = {all: false, names: null, jobs: 4, outputDir: null};
  const seen = new Set();
  for (let index = 0; index < args.length; index++) {
    const flag = args[index];
    if (!['--all', '--scenarios', '--jobs', '--output-dir', '--timing-only', '--headed'].includes(flag) || seen.has(flag))
      throw Error('Unknown or repeated browser suite option: ' + flag);
    seen.add(flag);
    if (flag === '--all') {options.all = true; continue;}
    if (flag === '--timing-only') {options.timingOnly = true; continue;}
    if (flag === '--headed') {options.headed = true; continue;}
    const value = args[++index];
    if (!value || value.startsWith('--')) throw Error(flag + ' needs a value.');
    if (flag === '--jobs') {
      if (!/^[1-4]$/.test(value)) throw Error('--jobs must be a whole number from 1 to 4.');
      options.jobs = Number(value);
    } else if (flag === '--output-dir') options.outputDir = value;
    else {
      const names = value.split(',');
      if (names.some(name => !/^[a-z][a-z0-9-]*$/.test(name)) || new Set(names).size !== names.length)
        throw Error('--scenarios needs unique simple names separated by commas.');
      options.names = names;
    }
  }
  if (options.all === !!options.names)
    throw Error('Usage: node tools/run-browser-scenarios.mjs --all|--scenarios NAMES [--jobs 1..4] [--output-dir .evidence/PATH]');
  if (options.timingOnly) {
    if (!options.names || options.names.some(name => !['deep-frames','frame-pacing','tremblant-snow','tremblant-views'].includes(name)))
      throw Error('--timing-only requires explicit existing frame recipe names.');
    options.headed = true;
  }
  return options;
}

// The full tier already runs this specialized native wrapper once. Discovery
// retains its row, but the shared QA bundle cannot prepare its recorder page.
export const WRAPPER_ONLY_SCENARIOS = Object.freeze({
  'audio-crash-peak': 'tools/test-audio-crash-peak.mjs',
});

export async function namedScenarios({includeManual = false} = {}) {
  return (await readdir(scenarioDir))
    .filter(file => /^[a-z][a-z0-9-]*\.mjs$/.test(file) && !['smoke.mjs', 'review-sheet.mjs'].includes(file))
    .filter(file => !Object.hasOwn(WRAPPER_ONLY_SCENARIOS, file.slice(0, -4)))
    .filter(file => includeManual || !['rustwall-frame.mjs', 'yeti-fur-tint.mjs', 'deep-art-final-sheet.mjs'].includes(file))
    .map(file => file.slice(0, -4))
    .sort();
}

async function runScenario(name, outputDir, qaBundle, options) {
  const child = spawn(process.execPath, [harness, 'scenario', name, '--output-dir', outputDir,
    '--qa-bundle', qaBundle, ...(options.headed ? ['--headed'] : [])], {
    cwd: PROJECT_ROOT, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, DUEL_PUBLISH_REVIEW: '0',
      DUEL_TREMBLANT_QA_MODE: options.timingOnly ? 'timing' : 'views' },
  });
  let output = '';
  for (const stream of [child.stdout, child.stderr])
    stream.on('data', chunk => { output = (output + chunk.toString()).slice(-32_000); });
  const exitCode = await new Promise((done, reject) => {
    child.once('error', reject);
    // close includes final report output and the harness's private cleanup.
    child.once('close', (code, signal) => done(code ?? signal ?? 1));
  });
  const reportPath = [...output.matchAll(/^Report: (.+)$/gm)].at(-1)?.[1]?.trim();
  return {exitCode, output, reportPath};
}

export async function main(args = process.argv.slice(2), {
  discover = namedScenarios, build = buildQaBundle, scenario = runScenario,
  mkdir: makeDirectory = mkdir, read = readFile, write = writeFile,
  cleanup = recycleQaBundle, log = console.log, error: logError = console.error,
} = {}) {
  const options = parseSuiteArguments(args);
  const discovered = await discover({includeManual: !!options.names});
  const selected = options.names ?? discovered;
  for (const name of selected) if (!discovered.includes(name) && !Object.hasOwn(WRAPPER_ONLY_SCENARIOS, name))
    throw Error('Unknown scenario: ' + name);
  const names = selected.filter(name => !Object.hasOwn(WRAPPER_ONLY_SCENARIOS, name));
  const delegatedNames = options.names ? selected.filter(name => Object.hasOwn(WRAPPER_ONLY_SCENARIOS, name))
    : Object.keys(WRAPPER_ONLY_SCENARIOS);
  if (!names.length && !delegatedNames.length) throw Error('No named browser scenarios were found.');
  const delegations = delegatedNames.map(name => ({name, passed: null, status: 'run by its wrapper',
    wrapper: WRAPPER_ONLY_SCENARIOS[name], exitCode: null, evidenceDir: null, reportPath: null,
    screenshots: [], warnings: null, issues: null, error: null}));
  const archive = options.outputDir ? resolveEvidenceDir(options.outputDir) : evidenceOutputDir('browser-suite');
  await makeDirectory(archive, {recursive: true});
  let bundle;
  const rows = new Array(names.length);
  try {
    for (const row of delegations) log(`${row.name}: run by its wrapper (${row.wrapper}); not executed here`);
    if (names.length) bundle = await build();
    async function checkScenario(index) {
      const name = names[index], outputDir = join(archive, name);
      let run, report = null, evidenceDir = null, error = null;
      try {
        run = await scenario(name, outputDir, bundle, {timingOnly: !!options.timingOnly, headed: !!options.headed});
        if (!run.reportPath) throw Error('The browser harness did not write a report path.');
        report = JSON.parse(await read(run.reportPath, 'utf8'));
        evidenceDir = outputDir;
      } catch (cause) {error = cause.message;}
      const screenshots = report && evidenceDir ? (report.screenshots ?? []) : [];
      const warnings = report?.warnings?.length ?? 0;
      const issues = report?.issues?.length ?? 0;
      const passed = run?.exitCode === 0 && report?.passed === true &&
        report.memoryOnlySaves === true && warnings === 0 && issues === 0 && !error;
      rows[index] = {name, passed, exitCode: run?.exitCode ?? 1, evidenceDir,
        reportPath: evidenceDir ? join(evidenceDir, 'report.json') : null, screenshots,
        warnings, issues, error: error ?? report?.error ?? null};
      if (['tremblant-snow','tremblant-views'].includes(name))
        rows[index].timing = options.timingOnly ? 'timing-only' : 'run in the frame step';
      log(`${passed ? 'PASS' : 'FAIL'} ${name}: ${screenshots.length} screenshots, ${warnings} warnings, ${issues} errors${rows[index].timing ? '; timing: ' + rows[index].timing : ''}`);
      if (!passed) logError(error ?? report?.error ?? run?.output.slice(-1000));
    }
    const quiet = name => options.timingOnly || QUIET_SCENARIOS.includes(name);
    // Drain each contiguous non-timing group before its next quiet recipe.
    for (let start = 0; start < names.length;) {
      if (quiet(names[start])) {await checkScenario(start++); continue;}
      let end = start;
      while (end < names.length && !quiet(names[end])) end++;
      let next = start;
      async function worker() {
        while (next < end) {const index = next++; await checkScenario(index);}
      }
      await Promise.all(Array.from({length: Math.min(options.jobs, end - start)}, worker));
      start = end;
    }
    const delegated = delegations.length;
    const summary = {schema: 1, count: rows.length, executed: rows.length, delegated, delegations,
      passed: rows.filter(row => row.passed === true).length,
      failed: rows.filter(row => row.passed === false).length, archive, rows};
    if (options.timingOnly) summary.timingMode = 'timing-only';
    const summaryPath = join(archive, 'summary.json');
    await write(summaryPath, JSON.stringify(summary, null, 2) + '\n');
    log(`Browser scenarios: ${summary.passed}/${summary.executed} executed passed; ${delegated} run by its wrapper. Evidence: ${summaryPath}`);
    return summary.failed ? 1 : 0;
  } finally {
    if (bundle) await cleanup(bundle);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href)
  main().then(code => { process.exitCode = code; })
    .catch(error => { console.error(`Browser scenario suite: ${error.message}`); process.exitCode = 2; });
