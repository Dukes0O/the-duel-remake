import {Duel} from '../src/game.js';
import {App} from '../src/app.js';
import {applySceneryArmorDamage} from '../src/combat-armor.js';

// Paired, headless trajectories. Every policy replays the same seed and inputs
// through the decision point; only the decision to stop differs thereafter.
const STEP = 1 / 120;
const DECISION_AT = 12;
const END_AT = 33;
const cases = [
  {stage: 0, difficulty: 'easy', seed: 1989},
  {stage: 0, difficulty: 'hard', seed: 1989},
  {stage: 2, difficulty: 'hard', seed: 1989},
];
const round = value => value == null ? null : Math.round(value * 10) / 10;
const average = values => round(values.reduce((sum, value) => sum + value, 0) / values.length);

function aimAtRival(duel) {
  const fighter = duel.state.fighter;
  const at = duel.course.groundAt(duel.state.rival.s, duel.state.rival.lateral);
  const dx = at.x - fighter.x, dz = at.z - fighter.z;
  fighter.yaw = Math.atan2(dx, dz);
  fighter.pitch = Math.atan2(at.y + 1 - fighter.y - 1.62, Math.hypot(dx, dz));
}

function run(sample, policy, opportunity = null) {
  const duel = new Duel({seed: sample.seed, featureFlags: {wasteland2: true}});
  duel.startCampaign({mode: 'wasteland', startStage: sample.stage,
    car: 'falcone_f42', seed: sample.seed, cpuDifficulty: sample.difficulty});
  const state = duel.state;
  state.status = 'racing';
  state.countdown = 0;
  const pilot = {duel, _scriptedCrashDone: true};
  const traceThis = sample.stage === 0 && policy === 'wrench' &&
    (sample.difficulty === 'hard' || opportunity === 'wrench');
  const trace = traceThis ? {positions: [], contacts: []} : null;
  const events = {playerWrecks: 0, rivalWrecks: 0, rpgShots: 0,
    repairs: 0};
  duel.onChange((_, event) => {
    if (event.combatWreck) events[event.victim === 'player'
      ? 'playerWrecks' : 'rivalWrecks']++;
    if (event.footWeaponFired === 'rpg') events.rpgShots++;
    if (event.footRepairCompleted) events.repairs++;
    if (trace && state.onFoot && (event.combatRamHit || event.roadsideImpact ||
        event.boundaryReset || event.combatWreck || event.fighterKnockdown ||
        event.combatHit && event.victim === 'player')) {
      trace.contacts.push({t: round(state.stageTimeSec),
        kind: event.combatRamHit ? 'ram' : event.roadsideImpact ? 'roadside' :
          event.boundaryReset ? 'boundary' : event.combatWreck ? 'wreck' :
            event.fighterKnockdown ? 'fighter' : 'weapon',
        victim: event.victim || null, carS: round(state.s)});
    }
  });
  for (let tick = 0; tick < DECISION_AT / STEP; tick++) {
    App.prototype._driveAutopilot.call(pilot, STEP);
    duel.step(STEP);
  }
  if (opportunity) {
    // These are explicit after-incident opportunities, applied to both arms
    // of each pair. They are excluded from the routine-stop average.
    state.speedMph = 0;
    state.gear = 0;
    state.prevS = state.s;
    if (opportunity === 'rpg') {
      state.rival.s = state.rival.prevS = state.s - 55;
      state.rival.speedMph = 0;
      state.rival.armor = 30;
      state.combat.rivalShield = 0;
      state.combat.aiTimer = Infinity;
      state.traffic = [];
    } else {
      state.armor = 20;
      state.rival.s = state.rival.prevS = state.s + 300;
      state.traffic = [];
      state.combat.aiTimer = Infinity;
      state.combat.shield = 0;
      state.invulnerableSec = 0;
      state.pushVelocity = 0;
    }
  }
  const initial = {s: state.s, armor: state.armor,
    rivalS: state.rival.s, rivalArmor: state.rival.armor,
    speedMph: state.speedMph};
  const markerS = state.s + 200;
  const hazardS = opportunity === 'wrench' ? state.s + 100 : null;
  let markerTime = null, stopFinishedAt = null;
  let hazardApplied = false;
  let nextTraceAt = null;
  let phase = policy === 'clean' ? 'drive' : 'brake';
  let footStartedAt = null, attempted = false, fighterAtExit = null;
  while (state.status === 'racing' && state.stageTimeSec < END_AT - 1e-8) {
    switch (phase) {
      case 'drive':
        App.prototype._driveAutopilot.call(pilot, STEP);
        break;
      case 'brake':
        duel.setInput({throttle: 0, brake: 1, steer: 0, boost: false,
          interact: false});
        if (Math.abs(state.speedMph) < 23 && state.impactTimer <= 0)
          phase = 'exit';
        break;
      case 'exit':
        duel.setInput({throttle: 0, brake: 1, steer: 0, boost: false,
          interact: true});
        break;
      case 'foot':
        duel.setInput({interact: false});
        if (policy === 'rpg') {
          aimAtRival(duel);
          duel.setFighterInput({aim: true,
            fire: !attempted && state.footWeapons.lockSeconds >= .8 - 1e-8});
        } else {
          duel.setFighterInput({aim: false, fire: true});
        }
        break;
      case 'reenter':
        duel.setFighterInput({aim: false, fire: false});
        duel.setInput({interact: true});
        break;
    }
    duel.step(STEP);
    if (!hazardApplied && hazardS !== null && state.s >= hazardS) {
      applySceneryArmorDamage(duel, state);
      hazardApplied = true;
    }
    if (phase === 'exit' && state.onFoot) {
      phase = 'foot';
      footStartedAt = state.stageTimeSec;
      fighterAtExit = {fighterS: round(state.fighter.s),
        fighterLateral: round(state.fighter.lateral),
        rivalS: round(state.rival.s), carS: round(state.s)};
      nextTraceAt = Math.ceil(state.stageTimeSec / 2) * 2;
      if (policy === 'wrench') duel.selectFootGear(2);
    }
    if (phase === 'foot' && policy === 'rpg' && events.rpgShots) attempted = true;
    if (phase === 'foot' && (policy === 'rpg' && (attempted ||
        state.stageTimeSec - footStartedAt >= 6) || policy === 'wrench' &&
        (state.footWeapons.repairBlockedUntilRelease ||
          state.stageTimeSec - footStartedAt >= 6))) {
      // A release tick is needed before the re-entry hold can begin.
      duel.setInput({interact: false});
      phase = 'reenter';
    }
    if (phase === 'reenter' && !state.onFoot) {
      phase = 'drive';
      stopFinishedAt = state.stageTimeSec;
    }
    if (markerTime === null && state.s >= markerS) markerTime = state.stageTimeSec;
    if (trace && state.onFoot && state.stageTimeSec + 1e-8 >= nextTraceAt) {
      const car = duel.course.groundAt(state.s, state.lateral);
      trace.positions.push({t: round(state.stageTimeSec), carS: round(state.s),
        carSpeedMph: round(state.speedMph), push: round(state.pushVelocity),
        brake: round(state.input.brake), fighterS: round(state.fighter.s),
        distance: round(Math.hypot(state.fighter.x - car.x,
          state.fighter.z - car.z))});
      nextTraceAt += 2;
    }
  }
  events.rpgDirectHits = state.combat.notorietyEvents?.filter(event =>
    event.type === 'rpgDirectHit').length || 0;
  return {policy, stage: sample.stage, route: duel.stageDef.id,
    difficulty: sample.difficulty,
    opportunity, initial: Object.fromEntries(Object.entries(initial)
      .map(([key, value]) => [key, round(value)])),
    status: state.status, markerTime: round(markerTime),
    stopSeconds: round(stopFinishedAt == null ? null : stopFinishedAt - DECISION_AT),
    completedStop: policy === 'clean' || stopFinishedAt !== null,
    phase, fighterAtExit, hazardApplied, trace,
    fighterAtEnd: state.onFoot ? {s: round(state.fighter.s),
      lateral: round(state.fighter.lateral), knockedDown: !!state.fighter.knockedDown,
      distanceToCar: round(Math.hypot(state.fighter.x -
        duel.course.groundAt(state.s, state.lateral).x,
      state.fighter.z - duel.course.groundAt(state.s, state.lateral).z))} : null,
    endTime: round(state.stageTimeSec), playerS: round(state.s),
    rivalS: round(state.rival.s), playerArmor: round(state.armor),
    rivalArmor: round(state.rival.armor), events};
}

const rows = [];
for (const sample of cases) for (const policy of ['clean', 'rpg', 'wrench'])
  rows.push(run(sample, policy));
// A near-wreck rival is a distinct tactical opportunity, not part of the
// average. Both trajectories receive exactly the same 30-armor rival.
for (const [opportunity, policy] of [
  ['rpg', 'clean'], ['rpg', 'rpg'], ['wrench', 'clean'], ['wrench', 'wrench'],
]) rows.push(run(cases[0], policy, opportunity));

const paired = cases.map(sample => {
  const own = rows.filter(row => row.stage === sample.stage &&
    row.difficulty === sample.difficulty && !row.opportunity);
  const clean = own.find(row => row.policy === 'clean');
  const policies = Object.fromEntries(['rpg', 'wrench'].map(policy => {
    const row = own.find(item => item.policy === policy);
    return [policy, {playerMeters: round(row.playerS - clean.playerS),
      rivalMeters: round(row.rivalS - clean.rivalS),
      relativeGapMeters: round((row.playerS - row.rivalS) -
        (clean.playerS - clean.rivalS)),
      playerArmor: round(row.playerArmor - clean.playerArmor),
      rivalArmor: round(row.rivalArmor - clean.rivalArmor),
      markerSeconds: row.markerTime == null || clean.markerTime == null
        ? null : round(row.markerTime - clean.markerTime),
      stopSeconds: row.stopSeconds, events: row.events,
      completedStop: row.completedStop, phase: row.phase,
      fighterAtExit: row.fighterAtExit, fighterAtEnd: row.fighterAtEnd,
      ...(row.trace ? {trace: row.trace} : {})}];
  }));
  return {stage: sample.stage, route: clean.route,
    difficulty: sample.difficulty,
    initial: clean.initial, policies};
});
function opportunitySummary(kind, policy) {
  const clean = rows.find(row => row.opportunity === kind && row.policy === 'clean');
  const stop = rows.find(row => row.opportunity === kind && row.policy === policy);
  return {initial: clean.initial,
    playerMeters: round(stop.playerS - clean.playerS),
    rivalMeters: round(stop.rivalS - clean.rivalS),
    relativeGapMeters: round((stop.playerS - stop.rivalS) -
      (clean.playerS - clean.rivalS)),
    playerArmor: round(stop.playerArmor - clean.playerArmor),
    rivalArmor: round(stop.rivalArmor - clean.rivalArmor),
    markerSeconds: clean.markerTime == null || stop.markerTime == null
      ? null : round(stop.markerTime - clean.markerTime),
    stopSeconds: stop.stopSeconds, cleanEvents: clean.events,
    events: stop.events,
    completedStop: stop.completedStop, fighterAtExit: stop.fighterAtExit,
    phase: stop.phase, fighterAtEnd: stop.fighterAtEnd,
    hazardApplied: clean.hazardApplied && stop.hazardApplied,
    ...(stop.trace ? {trace: stop.trace} : {})};
}
const report = {seed: 1989, decisionSec: DECISION_AT, horizonSec: END_AT,
  fixedStepHz: 120, paired,
  averagePlayerMeters: Object.fromEntries(['rpg', 'wrench'].map(policy =>
    [policy, average(paired.map(item => item.policies[policy].playerMeters))])),
  averageRelativeGapMeters: Object.fromEntries(['rpg', 'wrench'].map(policy =>
    [policy, average(paired.map(item => item.policies[policy].relativeGapMeters))])),
  opportunities: {rpg: opportunitySummary('rpg', 'rpg'),
    wrench: opportunitySummary('wrench', 'wrench')},
};
console.log(JSON.stringify(report, null, 2));

if (process.argv.includes('--check')) {
  const failures = [];
  if (report.averagePlayerMeters.rpg >= 0 || report.averagePlayerMeters.wrench >= 0)
    failures.push('a routine stop beats clean driving on average');
  if (report.averageRelativeGapMeters.rpg >= 0 ||
      report.averageRelativeGapMeters.wrench >= 0)
    failures.push('a routine stop improves race position on average');
  if (report.opportunities.rpg.events.rpgShots !== 1)
    failures.push('the tactical ambush did not fire its rocket');
  if (report.opportunities.rpg.events.rpgDirectHits !== 1)
    failures.push('the tactical ambush did not hit its wounded rival');
  if (report.opportunities.rpg.events.rivalWrecks !== 1 ||
      report.opportunities.rpg.relativeGapMeters <= 0)
    failures.push('the tactical ambush did not repay its race position cost');
  if (!paired.some(item => item.policies.wrench.playerArmor > 0))
    failures.push('the wrench did not recover armor in any sampled stop');
  if (report.opportunities.wrench.events.repairs !== 1)
    failures.push('the safe repair opportunity did not restore a full 40 armor');
  if (!report.opportunities.wrench.hazardApplied ||
      report.opportunities.wrench.cleanEvents.playerWrecks !== 1 ||
      report.opportunities.wrench.events.playerWrecks !== 0 ||
      report.opportunities.wrench.markerSeconds > 2)
    failures.push('the safe repair did not roughly repay its time cost');
  if (failures.length) {
    console.error(failures.join('\n'));
    process.exitCode = 1;
  }
}
