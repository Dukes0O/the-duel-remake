import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { Duel } from '../src/game.js';
import { App } from '../src/app.js';
import { applyArmorDamage } from '../src/combat-armor.js';
import { fireWeapon as nativeBalanceFire } from '../src/combat-weapons.js';
import { stepCombatAI as nativeBalanceAI } from '../src/combat-ai.js';
import { hazardsFor as nativeBalanceHazards } from '../src/arsenal/hazards.js';

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
  assert.throws(() => parse(['--check', '--flags', 'wasteland2,crash-physics']),
    /Unsupported flags/, 'retired crash physics needs no balance option');
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
    assert.equal(row.playerOpponentWrecks, 1, 'the payoff count requires player ownership and opponent victim');
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
check('single-race targets use the mean of the repeated seeds', () => {
  const input = fixture(['wasteland2']);
  const race = (policy, cpuDifficulty, seed, timeSec, cpuHits) =>
    ({ ...input.runs.find(run => run.policy === policy && run.cpuDifficulty === cpuDifficulty),
      seed, timeSec, cpuHits });
  input.runs = input.runs.map(run => run.policy === 'ufo-max' && run.cpuDifficulty === 'medium'
    ? { ...run, timeSec: 95 } : run);
  input.runs.push(race('ufo-max', 'medium', 1990, 100, 4), race('ufo-max', 'medium', 1991, 100, 4));
  input.baselineRuns = input.baselineRuns.map(run => run.cpuDifficulty === 'medium' && run.seed === 1990
    ? { ...run, timeSec: 101, cpuHits: 7 } : run.cpuDifficulty === 'medium' && run.seed === 1991
      ? { ...run, timeSec: 99, cpuHits: 1 } : run);
  const report = required('buildReport')(input);
  // Gains 5, 1 and -1 seconds: one lucky race no longer fails the 4 s target.
  assert.equal(report.ufoGainByDifficulty['ufo-max'].medium, 1.67);
  // Seeds 1989-1991 give 4, 7 and 1 hits; the other 27 fixture races give 4.
  assert.equal(report.cpuHitsByDifficulty.medium, 4, 'the mean covers every no-weapon race');
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
    // CRASH-RELEASE: bands for the thirty-race mean (were one-race counts).
    for (const [difficulty, low, high] of [['easy', 1, 4], ['medium', 4, 9], ['hard', 4, 10]]) {
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
// A current roadsideImpact carries the struck traffic actor, not the attacker.
// Exercise production contacts so reporting cannot silently depend on the older
// trafficWrecked event or label every traffic incident as player-owned.
for (const flags of [[], ['wasteland2']]) for (const attacker of ['player', 'cpu']) {
  // CRASH-RELEASE: crash physics decides; a hard hit smashes traffic (a wreck)
  // and a light one knocks it clear. The cars start just touching.
  for (const outcome of ['knock', 'smash']) {
    check(`${flags.length ? 'flag-on' : 'flag-off'} ${attacker} traffic ${outcome} accounting`, () => {
      const run = required('run');
      const original = App.prototype.advance;
      const impacts = [];
      App.prototype.advance = function (...args) {
        const duel = this.duel, state = duel.state;
        const striking = attacker === 'player' ? state : state.rival;
        Object.assign(striking, { car: 'falcone_f42', s: 105.6, prevS: 104.5,
          lateral: 0, prevLateral: 0, speedMph: duel.car.topSpeed * (outcome === 'smash' ? .7 : .15),
          headingError: 0, slipAngle: 0, pushVelocity: 0, dir: 1,
          airborne: false, groundHeight: undefined, airHeight: 0 });
        const traffic = { alive: true, s: 110, prevS: 110,
          lateral: .6, prevLateral: .6, speedMph: 0, dir: 1,
          headingError: 0, slipAngle: 0, pushVelocity: 0 };
        state.traffic = [traffic];
        duel.onChange((_, event) => { if (event.roadsideImpact) impacts.push(event.roadsideImpact); });
        assert.equal(duel._vehicleContact(striking, traffic, 'traffic'), true,
          'the production swept contact reaches traffic');
        assert.equal(impacts.length, 1, 'one real contact emits one roadside impact');
        assert.equal(impacts[0].kind, 'traffic');
        assert.equal(impacts[0].outcome, outcome, 'fixture reaches the intended contact tier');
        assert.equal(impacts[0].actor, traffic, 'event actor identifies the victim');
        assert.equal(impacts[0].owner, undefined, 'current event supplies no attacker ownership');
        return original.apply(this, args);
      };
      try {
        const row = run('none', 'medium', 1989, { flags, maxFrames: 1 });
        const expected = wrecks();
        expected.traffic = expected.byOwner.unknown = outcome === 'smash' ? 1 : 0;
        assert.deepEqual(row.wrecks, expected,
          outcome === 'smash' ? 'a real traffic smash counts once with unknown ownership' :
            'traffic knocked clear is not a wreck');
      } finally { App.prototype.advance = original; }
    });
  }
}

// ARS-CORE: use the existing calibrated report, with bounded native fixtures.
const arsenalFlags = ['wasteland2', 'arsenal'];
const nativeUsageRows = [];
check('Arsenal CLI keeps both supported flags', () => {
  for (const args of [['--check', '--flags', 'wasteland2,arsenal'],
    ['--probe=hard,1989', '--flags', 'wasteland2,arsenal']]) {
    assert.deepEqual(required('parseArgs')(args).flags, arsenalFlags,
      'the existing report accepts both real gameplay switches');
  }
});
check('Arsenal report starts a named discovered rank-six career through real App transactions', () => {
  const originalStart = App.prototype.startCampaign;
  const originalBuy = App.prototype.purchaseArsenalWeapon;
  const originalEquip = App.prototype.equipCarWeapon;
  const purchases = [], equipment = [], starts = [];
  App.prototype.purchaseArsenalWeapon = function (id) {
    const result = originalBuy.call(this, id);
    purchases.push({id, ok: result.ok}); return result;
  };
  App.prototype.equipCarWeapon = function (slot, id) {
    const result = originalEquip.call(this, slot, id);
    equipment.push({id, ok: result.ok}); return result;
  };
  App.prototype.startCampaign = function (...args) {
    const result = originalStart.apply(this, args);
    assert.equal(this.duel.featureFlags.enabled('wasteland2'), true);
    assert.equal(this.duel.featureFlags.enabled('arsenal'), true);
    assert.equal(this.profile.wasteland.rank, 6, 'native report uses the settled wave-one career rank');
    assert.equal(this.profile.wasteland.discoveredGate, true, 'native named career has discovered the gate');
    assert.ok(this.player.name.trim(), 'the synthetic career belongs to a named player');
    for (const id of ['oil', 'smoke']) assert.ok(this.profile.wasteland.weapons.unlocked.includes(id));
    starts.push(this.duel.state.opponents.map(cpu => [...cpu.weaponLoadout]));
    return result;
  };
  try {
    for (let repeat = 0; repeat < 2; repeat++) {
      const row = required('run')('none', 'hard', 1989, {flags: arsenalFlags, maxFrames: 1});
      assert.deepEqual(row.flags, arsenalFlags);
      assert.equal(row.completed, false, 'one frame never claims a complete sample');
    }
    assert.deepEqual(starts[0], starts[1], 'same seed reproduces real assigned CPU weapons');
    for (const id of ['oil', 'smoke']) {
      assert.equal(purchases.filter(row => row.id === id && row.ok).length, 2,
        'every fresh report career really purchases ' + id);
      assert.ok(equipment.some(row => row.id === id && row.ok), 'the real App equips ' + id);
    }
  } finally {
    App.prototype.startCampaign = originalStart;
    App.prototype.purchaseArsenalWeapon = originalBuy;
    App.prototype.equipCarWeapon = originalEquip;
  }
});
for (const weapon of ['oil', 'smoke', 'crossbow']) check('Arsenal counts actual native CPU ' + weapon + ' use', () => {
  const original = App.prototype.advance;
  let deployed = false, measured;
  App.prototype.advance = function (...args) {
    const duel = this.duel, state = duel.state;
    const cpu = state.opponents.find(actor => actor.weaponLoadout?.includes(weapon));
    if (!cpu) return original.apply(this, args);
    deployed = true;
    Object.assign(state, {status: 'racing', countdown: 0, invulnerableSec: 0, traffic: [],
      s: weapon === 'crossbow' ? 260 : weapon === 'smoke' ? 165 : 180,
      lateral: 0, headingError: 0, speedMph: 0});
    Object.assign(cpu, {s: 200, prevS: 200, lateral: 0, prevLateral: 0,
      headingError: 0, speedMph: 0, impactTimer: 0});
    for (const other of state.opponents) other.finished = other !== cpu;
    state.combat.aiTimer = 0;
    if (weapon === 'smoke') assert.ok(applyArmorDamage(duel, cpu, 'crossbow', {owner: 'player'}) > 0,
      'real positive damage supplies native defensive smoke eligibility');
    if (weapon === 'crossbow') {
      assert.equal(nativeBalanceFire(duel, weapon, true, cpu), true);
      assert.equal(state.combat.projectiles.filter(shot => shot.kind === weapon && shot.enemy).length, 1,
        'a real CPU bolt exists, rather than an inferred loadout use');
    } else {
      nativeBalanceAI(duel, 1 / 120);
      assert.equal(nativeBalanceHazards(duel).filter(hazard => hazard.kind === weapon && hazard.owner === cpu).length, 1,
        'the native CPU scheduler actually deploys its assigned rear weapon');
    }
    if (weapon === 'oil') assert.equal(duel.fireWeapon('oil'), true,
      'one genuine player deployment also exercises ownership attribution');
    state.combat.aiTimer = Infinity;
    return original.apply(this, args);
  };
  try {
    for (let seed = 1989; seed < 1995 && !deployed; seed++) {
      measured = required('run')('none', 'hard', seed, {flags: arsenalFlags, maxFrames: 1});
    }
    assert.ok(deployed, 'the bounded seeded native field really assigns ' + weapon);
    assert.equal(measured.weaponUses?.cpu?.[weapon], 1, 'report counts one actual CPU deployment, not cue plus fire twice');
    assert.equal(measured.weaponUses?.player?.[weapon] ?? 0, weapon === 'oil' ? 1 : 0,
      'report keeps real player and CPU uses separate');
    nativeUsageRows.push(measured);
  } finally { App.prototype.advance = original; }
});
check('Arsenal report aggregates the measured native per-weapon usage', () => {
  assert.equal(nativeUsageRows.length, 3, 'three bounded native deployment rows supply the measured totals');
  const input = fixture(arsenalFlags);
  input.runs.push(...nativeUsageRows);
  const report = required('buildReport')(input);
  for (const weapon of ['oil', 'smoke', 'crossbow']) {
    assert.equal(report.weaponUses?.cpu?.[weapon], 1, 'aggregate retains exactly the measured CPU ' + weapon + ' use');
    assert.equal(report.weaponUses?.player?.[weapon] ?? 0, weapon === 'oil' ? 1 : 0);
  }
});


check('Arsenal check requires measured CPU Oil and Smoke use without changing target bands', () => {
  assert.equal(nativeUsageRows.length, 3, 'native deployment rows supply the usage evidence');
  const input = fixture(arsenalFlags), report = required('buildReport')(input);
  report.weaponUses = required('buildReport')({...input, runs: [...input.runs, ...nativeUsageRows]}).weaponUses;
  const validate = required('reportFailures');
  assert.deepEqual(validate(report, input.runs, input.baselineRuns), [],
    'original target bands and genuine measured rear-weapon use pass together');
  for (const weapon of ['oil', 'smoke']) {
    const missing = structuredClone(report);
    missing.weaponUses.cpu[weapon] = 0;
    assert.match(validate(missing, input.runs, input.baselineRuns).join('\n'),
      new RegExp('CPU.*' + weapon + '|' + weapon + '.*CPU', 'i'),
      'Arsenal --check rejects zero measured native CPU ' + weapon + ' use');
  }
});

for (const failure of failures) console.error(`FAIL ${failure}`);
console.log(`Combat balance acceptance: ${checks} checks, ${checks - failures.length} passed, ${failures.length} failed.`);
if (failures.length) process.exitCode = 1;