import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { Duel } from '../src/game.js';
import { App } from '../src/app.js';
import { applyArmorDamage } from '../src/combat-armor.js';

// BAL-01: no full campaigns in this suite. The builder runs both complete
// --check reports once and records measured gaps and timings in the change note.
const toolUrl = new URL('./combat-balance.mjs', import.meta.url);
const toolPath = fileURLToPath(toolUrl);
const imported = spawnSync(process.execPath, ['--input-type=module', '-e',
  `await import(${JSON.stringify(toolUrl.href)}); console.log('BAL01_IMPORT_READY');`],
{ encoding: 'utf8', timeout: 4000 });
const importReady = imported.status === 0 && imported.stdout.trim() === 'BAL01_IMPORT_READY';
const api = importReady ? await import(toolUrl.href) : {};
let checks = 0;
const failures = [];
function check(name, run) {
  checks++;
  try { run(); }
  catch (error) { failures.push(`${name}: ${error.message}`); }
}
function required(name) {
  assert.equal(typeof api[name], 'function',
    `combat-balance must export ${name} without running the full CLI report`);
  return api[name];
}
const difficulties = ['easy', 'medium', 'hard'];
const policies = ['none', 'ufo', 'ufo-max', 'bomb', 'crossbow', 'star', 'all'];
const wrecks = (player = 0, opponent = 0, traffic = 0) => ({ player, opponent, traffic,
  byOwner: { player: opponent + traffic, cpu: player, raider: 0, environment: 0, unknown: 0 } });
function fixture(flags = []) {
  const race = (policy, cpuDifficulty, seed = 1989) => ({ policy, cpuDifficulty, seed,
    flags, completed: true, won: true, timeSec: 100, rivalTimeSec: 101,
    shots: { ufo: 0, bomb: 0, crossbow: 1, star: 0 }, rivalHits: 1,
    cpuHits: { easy: 1, medium: 4, hard: 7 }[cpuDifficulty],
    unattributedEnemyHits: 0, majorCrashes: 0, wrecks: wrecks(1, 2, 3) });
  const runs = policies.flatMap(policy => difficulties.map(difficulty => race(policy, difficulty)));
  const wins = { easy: 8, medium: 5, hard: 3 };
  const baselineRuns = difficulties.flatMap(difficulty => Array.from({ length: 9 }, (_, index) =>
    ({ ...race('none', difficulty, 1990 + index), won: index < wins[difficulty] - 1 })));
  return { flags, runs, baselineRuns, firstTwelveSec: 1, elapsedSec: 2,
    crossbowAim: { shots: 26, hits: 13, hitRate: .5, cases: [] },
    ownBombs: { maxSpeedLossPct: 15, cases: [] } };
}
function observeStarts(action, enabled) {
  const original = Duel.prototype.startCampaign;
  let starts = 0;
  Duel.prototype.startCampaign = function (...args) {
    const result = original.apply(this, args);
    starts++;
    assert.equal(this.featureFlags.enabled('wasteland2'), enabled, 'real Duel receives selected flag');
    assert.equal(Number.isFinite(this.state.maxArmor) && this.state.maxArmor > 0, enabled,
      'selected flag activates real armor rules at campaign start');
    if (enabled) assert.equal(this.state.armor, this.state.maxArmor, 'real armor starts full');
    return result;
  };
  try { action(); } finally { Duel.prototype.startCampaign = original; }
  assert.ok(starts > 0, 'probe starts a real Duel campaign');
}

check('import is safe and fast', () => assert.ok(importReady,
  'importing combat-balance must not execute its full campaign or print a report'));
check('CLI default and selected flags', () => {
  const parse = required('parseArgs');
  assert.deepEqual(parse([]).flags, [], 'default retains flag-off Wasteland');
  for (const args of [['--flags', 'wasteland2'], ['--check', '--flags', 'wasteland2'],
    ['--baseline-only', '--flags', 'wasteland2'], ['--probe=medium,1989', '--flags', 'wasteland2']]) {
    assert.deepEqual(parse(args).flags, ['wasteland2'], `valid CLI: ${args.join(' ')}`);
  }
});
check('CLI rejects unsupported flags and malformed values', () => {
  const parse = required('parseArgs');
  for (const args of [['--flags'], ['--flags', ''], ['--flags', 'unknown'],
    ['--flags', 'wasteland2,unknown'], ['--flags', 'wasteland2,'], ['--flags', '--check'],
    ['--probe=medium,'], ['--probe=medium,1.5'], ['--probe=medium,1989,extra'],
    ['--probe=unknown,1989'], ['--unknown'], ['--baseline-only', '--check']]) {
    assert.throws(() => parse(args), Error, `reject ${JSON.stringify(args)}`);
  }
  const child = spawnSync(process.execPath, [toolPath, '--flags', 'unknown'],
    { encoding: 'utf8', timeout: 4000 });
  assert.equal(child.error, undefined, 'invalid CLI exits promptly');
  assert.notEqual(child.status, 0, 'invalid CLI exits nonzero');
});
for (const flags of [[], ['wasteland2']]) {
  const label = flags.length ? 'flag-on' : 'flag-off';
  check(`${label} every policy reaches real simulation`, () => {
    const run = required('run');
    for (const policy of policies) observeStarts(() => {
      const row = run(policy, 'medium', 1989, { flags, maxFrames: 1 });
      assert.deepEqual(row.flags, flags, 'race reports flags actually selected');
      assert.equal(row.completed, false, 'bounded probe never claims a completed race');
    }, flags.length > 0);
  });
  for (const name of ['crossbowProbe', 'bombSpeedProbe']) {
    check(`${label} ${name} reaches real simulation`, () => observeStarts(() => {
      const result = required(name)({ flags });
      assert.deepEqual(result.flags, flags, 'weapon probe reports selected flags');
      assert.equal(result.cases.length, name === 'crossbowProbe' ? 26 : 10,
        'all original probe cases remain');
    }, flags.length > 0));
  }
}
check('default keeps the same short flag-off result', () => {
  const run = required('run');
  assert.deepEqual(run('none', 'easy', 1989, { maxFrames: 1 }),
    run('none', 'easy', 1989, { flags: [], maxFrames: 1 }));
});
check('real combat wrecks retain victim and owner identity', () => {
  const run = required('run');
  const original = App.prototype.advance;
  App.prototype.advance = function (...args) {
    const state = this.duel.state;
    state.invulnerableSec = 0;
    state.combat.shield = state.combat.rivalShield = 0;
    state.armor = state.rival.armor = 1;
    applyArmorDamage(this.duel, state.rival, 'rocket', { owner: 'player' });
    applyArmorDamage(this.duel, state, 'rocket', { owner: 'cpu' });
    return original.apply(this, args);
  };
  try {
    const row = run('none', 'medium', 1989, { flags: ['wasteland2'], maxFrames: 1 });
    assert.deepEqual(row.wrecks, wrecks(1, 1, 0), 'two real wrecks count once with separate owners');
  } finally { App.prototype.advance = original; }
});
check('report includes flags and separate difficulty win, hit and wreck totals', () => {
  const input = fixture(['wasteland2']);
  const report = required('buildReport')(input);
  assert.deepEqual(report.flags, ['wasteland2']);
  assert.equal(report.policyRuns, 21);
  assert.equal(report.baselineRaces, 30);
  for (const [difficulty, wins] of [['easy', 8], ['medium', 5], ['hard', 3]]) {
    assert.deepEqual(report.winRateByDifficulty[difficulty], { wins, races: 10, winRate: wins / 10 });
    assert.equal(report.cpuHitsByDifficulty[difficulty], { easy: 1, medium: 4, hard: 7 }[difficulty]);
    assert.deepEqual(report.wrecksByDifficulty[difficulty], wrecks(16, 32, 48),
      'aggregate all seven policies and nine additional baseline seeds, retaining traffic ownership');
  }
});
check('both reports retain every existing target band and failure', () => {
  const build = required('buildReport'), validate = required('reportFailures');
  for (const flags of [[], ['wasteland2']]) {
    const input = fixture(flags), report = build(input);
    const errors = candidate => validate(candidate, input.runs, input.baselineRuns);
    assert.deepEqual(errors(report), [], 'valid measured report passes');
    const outside = [
      ['firstTwelveSec', 120, /120s/],
      ['crossbowAim', { hitRate: .349 }, /0\.35.*0\.60/],
      ['crossbowAim', { hitRate: .601 }, /0\.35.*0\.60/],
      ['ownBombs', { maxSpeedLossPct: 15.01 }, /15%/],
    ];
    for (const [key, value, message] of outside) assert.match(errors({ ...report, [key]: value }).join('\n'), message);
    for (const rate of [.35, .60]) assert.deepEqual(errors({ ...report, crossbowAim: { hitRate: rate } }), []);
    for (const policy of ['ufo', 'ufo-max']) for (const difficulty of difficulties) {
      const candidate = structuredClone(report);
      candidate.ufoGainByDifficulty[policy][difficulty] = 4.01;
      assert.match(errors(candidate).join('\n'), /exceeds 4s/);
      candidate.ufoGainByDifficulty[policy][difficulty] = 4;
      assert.deepEqual(errors(candidate), []);
    }
    for (const [difficulty, low, high] of [['easy', 0, 3], ['medium', 2, 6], ['hard', 4, 10]]) {
      for (const hits of [low, high]) assert.deepEqual(errors({ ...report,
        cpuHitsByDifficulty: { ...report.cpuHitsByDifficulty, [difficulty]: hits } }), []);
      for (const hits of [low - 1, high + 1]) assert.match(errors({ ...report,
        cpuHitsByDifficulty: { ...report.cpuHitsByDifficulty, [difficulty]: hits } }).join('\n'), /CPU hits.*outside/);
    }
    for (const [difficulty, low, high] of [['easy', 80, 95], ['medium', 45, 65], ['hard', 20, 40]]) {
      for (const wins of [low - 1, high + 1]) assert.match(errors({ ...report,
        winRateByDifficulty: { ...report.winRateByDifficulty, [difficulty]: { wins, races: 100 } } }).join('\n'), /win rate.*outside/);
    }
    assert.match(validate(report, [{ ...input.runs[0], completed: false }], input.baselineRuns).join('\n'), /policy races did not complete/);
    assert.match(validate(report, input.runs, [{ ...input.baselineRuns[0], completed: false }]).join('\n'), /baseline.*did not complete/);
    assert.match(validate(report, [{ ...input.runs[0], unattributedEnemyHits: 1 }], input.baselineRuns).join('\n'), /victim identity/);
  }
});
for (const failure of failures) console.error(`FAIL ${failure}`);
console.log(`Combat balance acceptance: ${checks} checks, ${checks - failures.length} passed, ${failures.length} failed.`);
if (failures.length) process.exitCode = 1;