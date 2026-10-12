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
  'crew-fighters', 'first-person-gear', 'first-person-polish', 'frame-pacing',
  'grand-prix', 'gunn', 'harbour-night', 'hidden-road-discovery',
  'onfoot-camera-choice', 'p4-daynight', 'p4-snow', 'polish-arena', 'polish-flame',
  'rustwall', 'rustwall-frame', 'sal-art', 'salt-flats', 'scrapdome',
  'scrapdome-review', 'track-kits', 'tremblant-snow', 'tremblant-views',
  'vesper-art', 'wasteland-beta',
]);

export function parseSuiteArguments(args) {
  const options = {all: false, names: null, jobs: 4, outputDir: null};
  const seen = new Set();
  for (let index = 0; index < args.length; index++) {
    const flag = args[index];
    if (!['--all', '--scenarios', '--jobs', '--output-dir'].includes(flag) || seen.has(flag))
      throw Error('Unknown or repeated browser suite option: ' + flag);
    seen.add(flag);
    if (flag === '--all') {options.all = true; continue;}
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
  return options;
}

export async function namedScenarios() {
  return (await readdir(scenarioDir))
    .filter(file => /^[a-z][a-z0-9-]*\.mjs$/.test(file) && !['smoke.mjs', 'review-sheet.mjs'].includes(file))
    .map(file => file.slice(0, -4))
    .sort();
}

async function runScenario(name, outputDir, qaBundle) {
  const child = spawn(process.execPath, [harness, 'scenario', name, '--output-dir', outputDir,
    '--qa-bundle', qaBundle], {
    cwd: PROJECT_ROOT, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, DUEL_PUBLISH_REVIEW: '0' },
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
  const discovered = await discover();
  const names = options.names ?? discovered;
  if (!names.length) throw Error('No named browser scenarios were found.');
  for (const name of names) if (!discovered.includes(name)) throw Error('Unknown scenario: ' + name);
  const archive = options.outputDir ? resolveEvidenceDir(options.outputDir) : evidenceOutputDir('browser-suite');
  await makeDirectory(archive, {recursive: true});
  let bundle;
  const rows = new Array(names.length);
  try {
    bundle = await build();
    async function checkScenario(index) {
      const name = names[index], outputDir = join(archive, name);
      let run, report = null, evidenceDir = null, error = null;
      try {
        run = await scenario(name, outputDir, bundle);
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
      log(`${passed ? 'PASS' : 'FAIL'} ${name}: ${screenshots.length} screenshots, ${warnings} warnings, ${issues} errors`);
      if (!passed) logError(error ?? report?.error ?? run?.output.slice(-1000));
    }
    // Drain each contiguous non-timing group before its next quiet recipe.
    for (let start = 0; start < names.length;) {
      if (QUIET_SCENARIOS.includes(names[start])) {await checkScenario(start++); continue;}
      let end = start;
      while (end < names.length && !QUIET_SCENARIOS.includes(names[end])) end++;
      let next = start;
      async function worker() {
        while (next < end) {const index = next++; await checkScenario(index);}
      }
      await Promise.all(Array.from({length: Math.min(options.jobs, end - start)}, worker));
      start = end;
    }
    const summary = {schema: 1, count: rows.length, passed: rows.filter(row => row.passed).length,
      failed: rows.filter(row => !row.passed).length, archive, rows};
    const summaryPath = join(archive, 'summary.json');
    await write(summaryPath, JSON.stringify(summary, null, 2) + '\n');
    log(`Browser scenarios: ${summary.passed}/${summary.count} passed. Evidence: ${summaryPath}`);
    return summary.failed ? 1 : 0;
  } finally {
    if (bundle) await cleanup(bundle);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href)
  main().then(code => { process.exitCode = code; })
    .catch(error => { console.error(`Browser scenario suite: ${error.message}`); process.exitCode = 2; });
