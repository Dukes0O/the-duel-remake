import assert from 'node:assert/strict';
import test from 'node:test';
import {join, resolve} from 'node:path';
import * as suite from './run-browser-scenarios.mjs';

const root = resolve('browser runner mock project');
const archive = resolve(suite.PROJECT_ROOT ?? root, '.evidence', 'FAC-07-pure');
const turn = () => new Promise(setImmediate);

function fixture(names, overrides = {}) {
  const calls = [], reports = new Map(), rows = [];
  let active = 0, maximum = 0, bundle, summary;
  const operations = {
    discover: async () => names,
    build: async () => { calls.push('build'); bundle = join(root, '.qa-dist', 'browser-suite-owned'); return bundle; },
    mkdir: async () => { calls.push('mkdir'); },
    scenario: async (name, outputDir, sharedBundle) => {
      assert.equal(sharedBundle, bundle, 'every child reads the one completed bundle');
      active++; maximum = Math.max(maximum, active); calls.push('start:' + name);
      const quiet = suite.QUIET_SCENARIOS?.includes(name);
      if (quiet) assert.equal(active, 1, 'timing begins only after all prior children close');
      await turn(); await turn();
      if (quiet) assert.equal(active, 1, 'no new scenario overlaps a timing child');
      active--; calls.push('close:' + name);
      const reportPath = join(outputDir, 'report.json');
      reports.set(reportPath, {passed: true, memoryOnlySaves: true, screenshots: [name + '.png'], warnings: [], issues: []});
      rows.push(name);
      return {exitCode: 0, output: '', reportPath};
    },
    read: async path => JSON.stringify(reports.get(path)),
    write: async (path, value) => { assert.equal(active, 0); summary = JSON.parse(value); calls.push('summary'); },
    cleanup: async path => { assert.equal(path, bundle); assert.equal(active, 0, 'owned bundle cleanup waits for every child'); calls.push('cleanup'); },
    log: () => {}, error: () => {},
    ...overrides,
  };
  return {operations, calls, reports, rows, get maximum() {return maximum;}, get summary() {return summary;}};
}

test('suite CLI retains all/output and rejects unsafe or ambiguous input before work', () => {
  assert.equal(typeof suite.parseSuiteArguments, 'function', 'explicit suite arguments are parsed before building');
  assert.deepEqual(suite.parseSuiteArguments(['--all']), {all: true, names: null, jobs: 4, outputDir: null});
  assert.deepEqual(suite.parseSuiteArguments(['--output-dir', '.evidence/test', '--scenarios', 'menu,night-race', '--jobs', '2']),
    {all: false, names: ['menu', 'night-race'], jobs: 2, outputDir: '.evidence/test'});
  for (const args of [[], ['--all', '--all'], ['--all', '--scenarios', 'menu'], ['--scenarios', '../private'],
    ['--scenarios', 'menu,menu'], ['--scenarios', 'menu,'], ['--all', '--jobs', '0'], ['--all', '--jobs', '5'],
    ['--all', '--jobs', '1.5'], ['--all', '--jobs'], ['--all', '--output-dir'], ['--all', '--unknown']])
    assert.throws(() => suite.parseSuiteArguments(args));
});

test('one completed build feeds up to four private child runs and ordered unchanged results', async () => {
  const names = ['one', 'two', 'three', 'four', 'five', 'six'];
  const f = fixture(names);
  assert.equal(await suite.main(['--all', '--jobs', '4', '--output-dir', archive], f.operations), 0);
  assert.equal(f.maximum, 4, 'four children actually overlap, never five');
  assert.equal(f.calls.filter(call => call === 'build').length, 1);
  assert.equal(f.calls.at(-1), 'cleanup');
  assert.deepEqual(f.summary.rows.map(row => row.name), names);
  assert.deepEqual([f.summary.schema, f.summary.count, f.summary.passed, f.summary.failed], [1, 6, 6, 0]);
  for (const row of f.summary.rows) assert.deepEqual([row.passed, row.exitCode, row.screenshots, row.warnings, row.issues, row.error],
    [true, 0, [row.name + '.png'], 0, 0, null]);
});

test('all/jobs4 drains around timing scenarios even when an earlier child fails', async () => {
  assert.ok(suite.QUIET_SCENARIOS?.includes('frame-pacing'));
  assert.ok(suite.QUIET_SCENARIOS?.includes('grand-prix'), 'embedded timing is exclusive too');
  const f = fixture(['one', 'two', 'frame-pacing', 'three', 'grand-prix', 'four']);
  const actual = f.operations.scenario;
  f.operations.scenario = async (...args) => {
    const run = await actual(...args);
    if (args[0] === 'one') run.exitCode = 1;
    return run;
  };
  assert.equal(await suite.main(['--all', '--jobs', '4', '--output-dir', archive], f.operations), 1);
  const start = f.calls.indexOf('start:frame-pacing');
  assert.ok(f.calls.indexOf('close:one') < start && f.calls.indexOf('close:two') < start);
  assert.ok(f.calls.indexOf('close:frame-pacing') < f.calls.indexOf('start:three'));
  assert.equal(f.summary.count, 6, 'failure preserves every scenario result');
  assert.equal(f.summary.failed, 1);
});

test('explicit touched-only selection uses caller order and rejects unknown names without a build', async () => {
  const f = fixture(['one', 'two', 'three']);
  assert.equal(await suite.main(['--scenarios', 'three,one', '--jobs', '1', '--output-dir', archive], f.operations), 0);
  assert.equal(f.maximum, 1);
  assert.deepEqual(f.summary.rows.map(row => row.name), ['three', 'one']);
  const bad = fixture(['one']);
  await assert.rejects(suite.main(['--scenarios', 'missing'], bad.operations), /Unknown scenario/);
  assert.deepEqual(bad.calls, []);
});

test('build failure starts no scenario and propagates a runner error', async () => {
  const f = fixture(['one'], {build: async () => {throw Error('actual build failed');}});
  await assert.rejects(suite.main(['--all', '--output-dir', archive], f.operations), /actual build failed/);
  assert.ok(!f.calls.some(call => call.startsWith('start:')));
  assert.ok(!f.summary);
});

test('scenario crashes and report defects all fail without weakening acceptance or dropping rows', async () => {
  const names = ['launch', 'missing', 'malformed', 'warnings', 'issues', 'persistent', 'exit', 'false', 'valid'];
  const f = fixture(names);
  const actual = f.operations.scenario;
  f.operations.scenario = async (...args) => {
    if (args[0] === 'launch') throw Error('child spawn failed');
    const run = await actual(...args), report = f.reports.get(run.reportPath);
    if (args[0] === 'missing') run.reportPath = null;
    if (args[0] === 'warnings') report.warnings = ['real warning'];
    if (args[0] === 'issues') report.issues = ['real issue'];
    if (args[0] === 'persistent') report.memoryOnlySaves = false;
    if (args[0] === 'exit') run.exitCode = 7;
    if (args[0] === 'false') report.passed = false;
    return run;
  };
  const read = f.operations.read;
  f.operations.read = path => path.includes('malformed') ? '{invalid' : read(path);
  assert.equal(await suite.main(['--all', '--jobs', '4', '--output-dir', archive], f.operations), 1);
  assert.deepEqual(f.summary.rows.map(row => row.name), names);
  assert.deepEqual([f.summary.count, f.summary.passed, f.summary.failed], [9, 1, 8]);
  assert.equal(f.calls.at(-1), 'cleanup');
});


test('default discovery retires consumed art but retains current Salt and explicit manual frames',async()=>{
  const ordinary=await suite.namedScenarios(),manual=await suite.namedScenarios({includeManual:true});
  assert.ok(ordinary.includes('salt-flats'),'reachable Salt gameplay stays in all');
  for(const consumed of ['vesper-art','convoy-tanker-art','first-person-polish'])assert.ok(!manual.includes(consumed),consumed+' consumed recipe is removed');
  assert.ok(!ordinary.includes('rustwall-frame'),'dedicated manual frame recipe is not all-browser work');
  assert.ok(manual.includes('rustwall-frame'),'manual recipe remains discoverable for explicit use');
  assert.ok(!ordinary.includes('yeti-fur-tint'),'one-shot fur comparison is not all-browser work');
  assert.ok(manual.includes('yeti-fur-tint'),'fur comparison remains discoverable for explicit use');
  assert.ok(!ordinary.includes('deep-art-final-sheet'),'Deep final-art photography is not all-browser work');
  assert.ok(manual.includes('deep-art-final-sheet'),'Deep final-art photography remains discoverable for explicit use');
  assert.ok(!ordinary.includes('heli-logbook-art'),'rank paint photography is manual-only');
  assert.ok(manual.includes('heli-logbook-art'),'rank paint photography remains explicitly discoverable');
  assert.deepEqual(ordinary,manual.filter(name=>!['rustwall-frame','yeti-fur-tint','deep-art-final-sheet','heli-logbook-art'].includes(name)),'no other current scenario is hidden');
});

test('all omits manual frame while explicit selection preserves its original quiet execution',async()=>{
  for(const explicit of [false,true]){
    const f=fixture(['salt-flats','rustwall-frame']);let discovery;
    f.operations.discover=async options=>{discovery=options;return options?.includeManual?['salt-flats','rustwall-frame']:['salt-flats'];};
    const args=explicit?['--scenarios','rustwall-frame','--jobs','4','--output-dir',archive]:['--all','--jobs','4','--output-dir',archive];
    assert.equal(await suite.main(args,f.operations),0);
    assert.deepEqual(discovery,{includeManual:explicit});
    assert.deepEqual(f.summary.rows.map(row=>row.name),[explicit?'rustwall-frame':'salt-flats']);
    assert.equal(f.maximum,1);assert.equal(f.calls.at(-1),'cleanup');
  }
});


test('all omits one-shot fur comparison while explicit selection executes it normally',async()=>{
  for(const explicit of [false,true]){
    const f=fixture(['salt-flats','yeti-fur-tint']);let discovery;
    f.operations.discover=async options=>{discovery=options;return options?.includeManual?['salt-flats','yeti-fur-tint']:['salt-flats'];};
    const args=explicit?['--scenarios','yeti-fur-tint','--jobs','4','--output-dir',archive]:['--all','--jobs','4','--output-dir',archive];
    assert.equal(await suite.main(args,f.operations),0);
    assert.deepEqual(discovery,{includeManual:explicit});
    assert.deepEqual(f.summary.rows.map(row=>row.name),[explicit?'yeti-fur-tint':'salt-flats']);
    assert.equal(f.summary.passed,1);assert.equal(f.calls.at(-1),'cleanup');
  }
});

test('wrapper-only audio recipe is visible but never executed or counted as a browser pass', async () => {
  assert.ok(!(await suite.namedScenarios()).includes('audio-crash-peak'), 'wrapper-only recipe is not a directly executable browser name');
  assert.ok(!(await suite.namedScenarios({includeManual:true})).includes('audio-crash-peak'));
  assert.equal(suite.WRAPPER_ONLY_SCENARIOS['audio-crash-peak'], 'tools/test-audio-crash-peak.mjs');
  for (const explicit of [false, true]) {
    const f = fixture(['audio-crash-peak']);
    const args = explicit ? ['--scenarios', 'audio-crash-peak'] : ['--all'];
    assert.equal(await suite.main([...args, '--output-dir', archive], f.operations), 0);
    assert.deepEqual(f.rows, [], 'the incompatible direct scenario is never launched');
    assert.ok(!f.calls.includes('build'), 'delegation alone needs no QA bundle');
    assert.ok(!f.calls.includes('cleanup'));
    assert.deepEqual([f.summary.count, f.summary.executed, f.summary.passed, f.summary.failed, f.summary.delegated], [0, 0, 0, 0, 1]);
    assert.deepEqual(f.summary.delegations[0], {name: 'audio-crash-peak', passed: null,
      status: 'run by its wrapper', wrapper: 'tools/test-audio-crash-peak.mjs',
      exitCode: null, evidenceDir: null, reportPath: null, screenshots: [], warnings: null, issues: null, error: null});
  }
});

test('wrapper delegation preserves actual warnings, failures and caller row order', async () => {
  const f = fixture(['one', 'audio-crash-peak', 'warnings', 'last']);
  const run = f.operations.scenario;
  f.operations.scenario = async (...args) => {
    const result = await run(...args);
    if (args[0] === 'warnings') f.reports.get(result.reportPath).warnings.push('real warning');
    return result;
  };
  assert.equal(await suite.main(['--all', '--jobs', '4', '--output-dir', archive], f.operations), 1);
  assert.deepEqual(f.summary.rows.map(row => row.name), ['one', 'warnings', 'last']);
  assert.deepEqual([f.summary.count, f.summary.executed, f.summary.passed, f.summary.failed, f.summary.delegated], [3, 3, 2, 1, 1]);
  assert.equal(f.summary.rows[1].passed, false, 'zero-warning acceptance is unchanged');
  assert.ok(!f.rows.includes('audio-crash-peak'));
  assert.equal(f.summary.delegations[0].name, 'audio-crash-peak');
  assert.equal(f.calls.filter(call => call === 'build').length, 1);
  assert.equal(f.calls.at(-1), 'cleanup');
});


test('named timing mode is explicit, headed and restricted to the existing frame recipes', async () => {
  const options = suite.parseSuiteArguments(['--scenarios', 'frame-pacing,tremblant-snow,tremblant-views', '--timing-only', '--headed', '--jobs', '1']);
  assert.equal(options.timingOnly, true); assert.equal(options.headed, true);
  for (const args of [['--all','--timing-only'],['--scenarios','menu','--timing-only'],
    ['--scenarios','tremblant-snow','--timing-only','--timing-only']]) assert.throws(() => suite.parseSuiteArguments(args));
  const f = fixture(['frame-pacing','tremblant-snow','tremblant-views']);
  const run = f.operations.scenario, modes = [];
  f.operations.scenario = async (...args) => { modes.push(args[3]); return run(...args); };
  assert.equal(await suite.main(['--scenarios','tremblant-snow,tremblant-views','--timing-only','--headed','--jobs','1','--output-dir',archive],f.operations),0);
  assert.equal(f.maximum,1); assert.equal(f.summary.timingMode,'timing-only');
  assert.ok(f.summary.rows.every(row=>row.timing==='timing-only'));
  assert.deepEqual(modes,[{timingOnly:true,headed:true},{timingOnly:true,headed:true}]);
});

test('ordinary Tremblant views run concurrently with explicit semantic mode and no timing-pass claim', async () => {
  assert.ok(!suite.QUIET_SCENARIOS.includes('tremblant-snow'));
  assert.ok(!suite.QUIET_SCENARIOS.includes('tremblant-views'));
  const f = fixture(['tremblant-snow','tremblant-views']); const run = f.operations.scenario;
  f.operations.scenario = async (...args) => { assert.deepEqual(args[3],{timingOnly:false,headed:false});return run(...args); };
  assert.equal(await suite.main(['--all','--jobs','4','--output-dir',archive],f.operations),0);
  assert.equal(f.maximum,2);assert.equal(f.summary.timingMode,undefined);
  assert.ok(f.summary.rows.every(row=>row.timing==='run in the frame step'));
});


test('named Snow timing rejects the legacy Woods course override without removing direct comparison mode', async () => {
  const keys=['DUEL_TREMBLANT_QA_MODE','TREMBLANT_SNOW_COURSE','TREMBLANT_SNOW_PACING'];
  const old=keys.map(key=>process.env[key]);
  try {
    Object.assign(process.env,{DUEL_TREMBLANT_QA_MODE:'timing',TREMBLANT_SNOW_COURSE:'tremblant-woods',TREMBLANT_SNOW_PACING:'1'});
    await assert.rejects(import('./scenarios/tremblant-snow.mjs?timing-course-guard'),/actual Tremblant Snow/);
    process.env.DUEL_TREMBLANT_QA_MODE='combined';
    assert.equal(typeof (await import('./scenarios/tremblant-snow.mjs?legacy-course-guard')).run,'function');
  } finally {keys.forEach((key,i)=>{if(old[i]===undefined)delete process.env[key];else process.env[key]=old[i];});}
});
