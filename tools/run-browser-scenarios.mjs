// Run every named browser scenario into one ignored evidence directory.
import { spawn } from 'node:child_process';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { evidenceOutputDir, resolveEvidenceDir } from './browser-harness.mjs';

const root = resolve(fileURLToPath(new URL('../', import.meta.url)));
const harness = join(root, 'tools', 'browser-harness.mjs');
const scenarioDir = join(root, 'tools', 'scenarios');

export async function namedScenarios() {
  return (await readdir(scenarioDir))
    .filter(file => /^[a-z][a-z0-9-]*\.mjs$/.test(file) && !['smoke.mjs', 'review-sheet.mjs'].includes(file))
    .map(file => file.slice(0, -4))
    .sort();
}

async function runScenario(name, outputDir) {
  const child = spawn(process.execPath, [harness, 'scenario', name, '--output-dir', outputDir], {
    cwd: root, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, DUEL_PUBLISH_REVIEW: '0' },
  });
  let output = '';
  for (const stream of [child.stdout, child.stderr]) {
    stream.on('data', chunk => { output = (output + chunk.toString()).slice(-32_000); });
  }
  const exitCode = await new Promise((done, reject) => {
    child.once('error', reject);
    // 'close' waits for both output streams, including the final Report line.
    child.once('close', (code, signal) => done(code ?? signal ?? 1));
  });
  const reportPath = [...output.matchAll(/^Report: (.+)$/gm)].at(-1)?.[1]?.trim();
  return { exitCode, output, reportPath };
}

export async function main(args = process.argv.slice(2)) {
  if (args[0] !== '--all' || (args.length !== 1 && !(args.length === 3 && args[1] === '--output-dir' && args[2])))
    throw Error('Usage: node tools/run-browser-scenarios.mjs --all [--output-dir .evidence/PATH]');
  const names = await namedScenarios();
  if (!names.length) throw Error('No named browser scenarios were found.');
  const archive = args[2] ? resolveEvidenceDir(args[2]) : evidenceOutputDir('browser-suite');
  await mkdir(archive, { recursive: true });
  const rows = [];
  for (const name of names) {
    const run = await runScenario(name, join(archive, name));
    let report = null, evidenceDir = null, error = null;
    try {
      if (!run.reportPath) throw Error('The browser harness did not write a report path.');
      report = JSON.parse(await readFile(run.reportPath, 'utf8'));
      evidenceDir = join(archive, name);
    } catch (cause) {
      error = cause.message;
    }
    const screenshots = report && evidenceDir ? (report.screenshots ?? []) : [];
    const warnings = report?.warnings?.length ?? 0;
    const issues = report?.issues?.length ?? 0;
    const passed = run.exitCode === 0 && report?.passed === true &&
      report.memoryOnlySaves === true && warnings === 0 && issues === 0 && !error;
    rows.push({ name, passed, exitCode: run.exitCode, evidenceDir,
      reportPath: evidenceDir ? join(evidenceDir, 'report.json') : null, screenshots,
      warnings, issues, error: error ?? report?.error ?? null });
    console.log(`${passed ? 'PASS' : 'FAIL'} ${name}: ${screenshots.length} screenshots, ${warnings} warnings, ${issues} errors`);
    if (!passed) console.error(error ?? report?.error ?? run.output.slice(-1000));
  }
  const summary = { schema: 1, count: rows.length, passed: rows.filter(row => row.passed).length,
    failed: rows.filter(row => !row.passed).length, archive, rows };
  const summaryPath = join(archive, 'summary.json');
  await writeFile(summaryPath, JSON.stringify(summary, null, 2) + '\n');
  console.log(`Browser scenarios: ${summary.passed}/${summary.count} passed. Evidence: ${summaryPath}`);
  return summary.failed ? 1 : 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href)
  main().then(code => { process.exitCode = code; })
    .catch(error => { console.error(`Browser scenario suite: ${error.message}`); process.exitCode = 2; });
