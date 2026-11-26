// One owned QA build feeds isolated scenario children. Timing scenarios run alone.
import { spawn, spawnSync } from 'node:child_process';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { buildQaBundle, removeQaBundle, evidenceOutputDir, resolveEvidenceDir } from './browser-harness.mjs';

export const PROJECT_ROOT = resolve(fileURLToPath(new URL('../', import.meta.url)));
const harness = join(PROJECT_ROOT, 'tools', 'browser-harness.mjs');
const scenarioDir = join(PROJECT_ROOT, 'tools', 'scenarios');

// Prefixes and paths are intentionally narrow; unassigned scenarios always run.
export const SCENARIO_AREAS = [
  {prefixes:['lab-'], paths:['src/lab/']},
  {prefixes:['story-night-2','story-plate-reference'], paths:['src/story/','src/world/jobs/',
    'src/world/story-people-view.js','src/world/night-2-look.js','src/screen-yard-home.js',
    'tools/art/story-plates/']},
  {prefixes:['deep-'], paths:['src/deep/']},
  {prefixes:['heli-'], paths:['src/heli/']},
  {prefixes:['ski-'], paths:['src/ski/']},
  {prefixes:['everburn-','scablands-','run-','ships-'], paths:['src/world/','src/story/','src/world.js','src/world-job-camera.js','src/arena/modes/world-job.js','src/arena/arena-event.js']},
  {prefixes:['road-riders'], paths:['src/arena/modes/road-riders.js','src/arena/modes/world-job.js','src/arena/arena-brains.js',
    'src/arena/arena-pilot.js','src/arena/arena-tell-view.js','src/world/jobs/rider-rule.js','src/world/jobs/wash-riders.js',
    'src/world/jobs/job-engine.js','src/world/brand-ash-view.js','src/combat-ai.js','src/combat-hud.js','src/sim-contacts.js',
    'src/audio.js','src/sound-bank.js','tools/menu-check.js']},
  {prefixes:['open-checkpoint'], paths:['src/world/open/', 'src/arena/modes/world-job.js',
    'src/arena/modes/road-riders.js', 'src/arena/arena-tell-view.js', 'src/world/brand-ash-view.js']},
  {prefixes:['arena-'], paths:['src/arena/','src/arena-props.js','src/screen-arena.js']},
  {prefixes:['arsenal-'], paths:['src/arsenal/']},
  // WEAPON-WATER-CANNON: the water cannon's scenario also guards the Armory's town gear and the town's Fire Station read.
  {prefixes:['arsenal-water-cannon'], paths:['src/weapon-upgrades.js','src/screen-armory.js','src/town/town-gear.js']},
  {prefixes:['crew-'], paths:['src/crew-gear/','src/crew.js','src/crew-ui.js']},
  {prefixes:['warlord-'], paths:['src/warlords/','src/warlords.js','src/warlord-cards.js','src/arena/warlord-settlement.js']},
  {prefixes:['drive-lesson-'], paths:['src/lessons/']},
  {prefixes:['circuit-','ardennes-','eifel-','kogane-','p4-','tremblant-','harbour-','stavelot-','summit-'], paths:['src/circuits/','src/circuit-intel/','src/circuit-landmarks.js','src/circuit-variants.js','src/circuit-winter.js','src/course.js']},
  {prefixes:['combat-','field-battle'], paths:['src/combat.js','src/combat-actors.js','src/combat-ai.js','src/combat-armor.js','src/combat-effects.js','src/combat-hud.js','src/combat-pickups.js','src/combat-projectiles.js','src/combat-scene.js','src/combat-scoring.js','src/combat-teams.js','src/combat-weapons.js']},
  {prefixes:['audio-','weapon-audio','fight-voices'], paths:['src/audio.js','src/audio-output.js']},
  {prefixes:['onfoot-','first-person-'], paths:['src/onfoot.js','src/onfoot-camera.js','src/onfoot-figures.js','src/onfoot-hints.js','src/onfoot-race.js','src/onfoot-transition.js','src/onfoot-weapons.js']},
  {prefixes:['machine-','the-dig'], paths:['src/machines/']},
  {prefixes:['bowl-'], paths:['src/bowl/']},
  {prefixes:['town-'], paths:['src/town/']},
  {prefixes:['armor-kit-','armored-ram','car-loadout-'], paths:['src/armor-kits.js','src/armor-kit-meshes.js','src/car-loadout.js','src/screen-armory.js']},
  {prefixes:['raider-'], paths:['src/raiders.js','src/raider-markers.js']},
  {prefixes:['grand-prix'], paths:['src/grand-prix-cups.js','src/grand-prix-career.js']},
  {prefixes:['drive-lessons-','lessons-v2-'], paths:['src/lessons/']},
  {prefixes:['everburn','rescue-','fire-finish','fire-view','map-finish','map-view','tunnel-trial'], paths:['src/world/','src/story/','src/world.js','src/world-job-camera.js','src/arena/modes/world-job.js','src/arena/arena-event.js']},
  {prefixes:['track-kits','track-review'], paths:['src/track-kits.js','src/track-script.js','src/track-script-scene.js','src/track-script-course.js']},
  {prefixes:['enzo-look'], paths:['src/enzo-vehicle.js']},
  {prefixes:['mclaren-f1-look'], paths:['src/mclaren-f1-vehicle.js']},
  {prefixes:['skyline-audio'], paths:['src/skyline-vehicle.js','src/audio.js']},
  {prefixes:['earned-cars'], paths:['src/earned-cars-ui.js','src/unlock-vehicles.js']},
  {prefixes:['skin-waste'], paths:['src/paint-finish-look.js','src/vehicle-paint.js','src/paint-presets.js']},
  {prefixes:['far-rain'], paths:['src/render/','src/scene-lighting.js']},
  // OPEN-LOOK-RATS-NEST: a look scenario of the open Scablands runs when its look file or the QA page's stand changes.
  {prefixes:['look-rats-nest'], paths:['src/world/open/looks/rats-nest-look.js','tools/open-look-stand.js']},
  {prefixes:['look-glasshouse'], paths:['src/world/open/looks/glasshouse-look.js']},
  {prefixes:['open-map'], paths:['src/world/open/map-marks.js','src/world/open/parts/ground.js','src/world/scablands-map.js']},
  {prefixes:['open-find-camp'], paths:['src/world/open/parts/sites.js','src/world/open/site-rule.js','src/world/open/site-view.js','src/world/open/content/sites.js']},
  {prefixes:['open-forge-shed'], paths:['src/world/open/parts/buildings.js','src/world/open/building-view.js','src/world/open/building-rule.js','src/world/open/content/buildings.js']},
  {prefixes:['open-burned-camp'], paths:['src/world/open/parts/threads.js','src/story/threads/','src/story/scenes/burned-camp.js','src/world/open/sign-view.js']},
  {prefixes:['open-burned-scout'], paths:['src/story/threads/content/burned-camp.js','src/world/open/parts/threads.js',
    'src/world/open/parts/missions.js','src/world/open/content/mission-kinds.js','src/arena/modes/world-job.js',
    'src/arena/modes/road-riders.js','src/world/open/looks/rats-nest-look.js','src/world/open/content/burned-scout.js',
    'src/world/open/parts/people.js','src/world/open/sign-view.js','src/world/open/looks/glasshouse-look.js',
    'src/world/jobs/story-people.js','src/world/story-people-view.js']},
  {prefixes:['open-dry-pump'], paths:['src/story/threads/content/dry-pump.js','src/world/open/parts/dry-pump.js',
    'src/world/open/content/dry-pump-places.js','src/world/open/content/mission-kinds.js','src/world/open/parts/missions.js',
    'src/world/open/parts/threads.js','src/world/open/looks/dry-pump-look.js','src/world/open/sign-view.js',
    'src/arena/modes/world-job.js','src/onfoot-transition.js']},
  {prefixes:['open-roam'], paths:['src/world/open/parts/people.js','src/world/open/routine-rule.js','src/world/open/content/people-town.js','src/world/open/content/talk-town.js',
    'src/world/story-people-view.js','src/world/jobs/steps/talk.js','src/screen-arena.js','src/screen-results.js','src/screen-router.js',
    'src/world/world-hud.js','src/combat-hud.js','src/onfoot-weapons.js','src/first-person-gear.js','src/world/open/sign-view.js']},
  {prefixes:['open-stranded-hauler'], paths:['src/story/threads/content/stranded-hauler.js','src/story/threads/signs.js',
    'src/story/threads/thread-rule.js','src/world/open/parts/threads.js','src/world/open/parts/missions.js',
    'src/world/open/content/mission-kinds.js','src/world/open/content/stranded-hauler-places.js',
    'src/world/open/content/talk-hauler.js','src/world/open/content/talk-tables.js','src/world/open/parts/people.js',
    'src/world/open/parts/checkpoints.js','src/world/open/checkpoint-rule.js','src/world/open/sign-view.js',
    'src/world/open/looks/stranded-hauler-look.js','src/arena/modes/road-riders.js','src/arena/modes/world-job.js','src/world/world-hud.js']},
  {prefixes:['open-somebody-elses-flag'], paths:['src/story/threads/content/somebody-elses-flag.js',
    'src/world/open/', 'src/story/threads/signs.js', 'src/story/scenes/burned-camp.js',
    'src/arena/modes/road-riders.js', 'src/arena/modes/world-job.js', 'src/sim-contacts.js']},
  {prefixes:['open-mall-road-toll'], paths:['src/story/threads/content/mall-road-toll.js', 'src/story/threads/signs.js',
    'src/world/open/content/mall-road-toll-places.js', 'src/world/open/content/mission-kinds.js',
    'src/world/open/parts/threads.js', 'src/world/open/parts/missions.js', 'src/world/open/parts/people.js',
    'src/world/open/sign-view.js', 'src/arena/modes/world-job.js']},
];
// These scenarios guard saved progress, including backups and migration.
export const guardsSavedProgress = name => name.startsWith('career-') || ['preview-storage','warlord-format','drive-lesson-run','earned-cars','town-opens','story-night-2'].includes(name) ||
  /save|storage|backup|restore|archive|migrat|pay|reward/.test(name);
const shared = new Set(['src/game.js','src/main.js','src/render3d.js','src/app.js','src/config.js']);
const matchesPath = (file, entry) => entry.endsWith('/') ? file.startsWith(entry) : file === entry;

export async function changedSelection(names, commit, {root=PROJECT_ROOT, read=readFile} = {}) {
  const diff = spawnSync('git', ['diff','--name-only','--no-renames',commit,'HEAD','--'],
    {cwd:root, encoding:'utf8', shell:false, windowsHide:true});
  if (diff.error || diff.status !== 0) throw Error('Cannot compare the previous full check commit: ' + (diff.error?.message || diff.stderr.trim()));
  const changed = diff.stdout.split(/\r?\n/).filter(Boolean);
  const changedSet = new Set(changed);
  const isShared = changed.some(file => shared.has(file));
  async function importsChanged(file, visited = new Set()) {
    if (visited.has(file)) return false;
    visited.add(file);
    if (changedSet.has(file)) return true;
    let text;
    try { text = await read(join(root, file), 'utf8'); } catch { return false; }
    for (const match of text.matchAll(/(?:\bfrom\s*|\bimport\s*\(?\s*)['"](\.\.?\/[^'"]+)['"]/g)) {
      const target = resolve(root, file, '..', match[1]).replaceAll('\\','/');
      const base = resolve(root, 'tools/scenarios').replaceAll('\\','/') + '/';
      if (target.startsWith(base)) {
        const relative = 'tools/scenarios/' + target.slice(base.length);
        if (await importsChanged(relative, visited)) return true;
      }
    }
    return false;
  }
  const selected = [];
  for (const name of names) {
    const areas = SCENARIO_AREAS.filter(area => area.prefixes.some(prefix => name.startsWith(prefix)));
    let reason = guardsSavedProgress(name) ? 'guards saved progress or pay' : isShared ? 'shared file changed' : null;
    if (!reason && await importsChanged('tools/scenarios/' + name + '.mjs')) reason = 'scenario or helper changed';
    if (!reason && areas.some(area => changed.some(file => area.paths.some(entry => matchesPath(file, entry))))) reason = 'area changed';
    if (!reason && !areas.length) reason = 'no area';
    if (reason) selected.push({name, reason});
  }
  return selected;
}


// These existing recipes measure RAF/render cost or construction time, including
// conditional art/diagnostic paths. Do not change their measurements or limits.
export const QUIET_SCENARIOS = Object.freeze([
  'arena-ambush-alley', 'arena-fuel-run', 'arena-pit', 'arena-shove',
  'armor-kit-visuals', 'arsenal-core', 'blackiron', 'combat-armor-frame-pacing',
  'combat-ramming', 'convoy-frames', 'convoy-raid', 'convoy-tanker-art',
  'crew-fighters', 'deep-frames', 'everburn-frames', 'fire-view', 'first-person-gear', 'first-person-polish', 'frame-pacing',
  'grand-prix', 'gunn', 'harbour-night', 'hidden-road-discovery',
  'onfoot-camera-choice', 'p4-daynight', 'p4-snow', 'polish-arena', 'polish-flame',
  'rustwall', 'rustwall-frame', 'sal-art', 'salt-flats', 'scrapdome',
  'scrapdome-review', 'tin-town-gate-road', 'track-kits',
  'vesper-art', 'wasteland-beta',
]);

export function parseSuiteArguments(args) {
  const options = {all: false, names: null, jobs: 4, outputDir: null};
  const seen = new Set();
  for (let index = 0; index < args.length; index++) {
    const flag = args[index];
    if (!['--all', '--scenarios', '--jobs', '--output-dir', '--timing-only', '--headed', '--changed-since', '--list'].includes(flag) || seen.has(flag))
      throw Error('Unknown or repeated browser suite option: ' + flag);
    seen.add(flag);
    if (flag === '--all') {options.all = true; continue;}
    if (flag === '--list') {options.list = true; continue;}
    if (flag === '--timing-only') {options.timingOnly = true; continue;}
    if (flag === '--headed') {options.headed = true; continue;}
    const value = args[++index];
    if (!value || value.startsWith('--')) throw Error(flag + ' needs a value.');
    if (flag === '--jobs') {
      if (!/^[1-4]$/.test(value)) throw Error('--jobs must be a whole number from 1 to 4.');
      options.jobs = Number(value);
    } else if (flag === '--output-dir') options.outputDir = value;
    else if (flag === '--changed-since') options.changedSince = value;
    else {
      const names = value.split(',');
      if (names.some(name => !/^[a-z][a-z0-9-]*$/.test(name)) || new Set(names).size !== names.length)
        throw Error('--scenarios needs unique simple names separated by commas.');
      options.names = names;
    }
  }
  if ([options.all, !!options.names, !!options.changedSince].filter(Boolean).length !== 1)
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
    .filter(file => includeManual || !['rustwall-frame.mjs', 'yeti-fur-tint.mjs', 'deep-art-final-sheet.mjs', 'heli-logbook-art.mjs'].includes(file))
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
  cleanup = removeQaBundle, log = console.log, error: logError = console.error,
} = {}) {
  const options = parseSuiteArguments(args);
  const discovered = await discover({includeManual: !!options.names});
  const selection = options.changedSince ? await changedSelection(discovered, options.changedSince) : null;
  const selected = options.names ?? (selection ? selection.map(row => row.name) : discovered);
  if (options.list) {
    for (const name of selected) log(`${name}: ${selection?.find(row => row.name === name)?.reason ?? (options.all ? 'all scenarios' : 'explicitly selected')}`);
    log(`Selected ${selected.length}; left for Saturday ${discovered.length - selected.length}.`);
    return 0;
  }
  for (const name of selected) if (!discovered.includes(name) && !Object.hasOwn(WRAPPER_ONLY_SCENARIOS, name))
    throw Error('Unknown scenario: ' + name);
  const names = selected.filter(name => !Object.hasOwn(WRAPPER_ONLY_SCENARIOS, name));
  const delegatedNames = (options.names || options.changedSince) ? selected.filter(name => Object.hasOwn(WRAPPER_ONLY_SCENARIOS, name))
    : Object.keys(WRAPPER_ONLY_SCENARIOS);
  if (!names.length && !delegatedNames.length && !options.changedSince) throw Error('No named browser scenarios were found.');
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
      leftForSaturday: discovered.length - names.length, passed: rows.filter(row => row.passed === true).length,
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
