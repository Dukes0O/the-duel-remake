// FIELD-BATTLE-ASH (docs/board/cards/FIELD-BATTLE-ASH.md): the war party's battle on the Boneyard road.
// 1. The furnace's rules in the battle, as plain numbers (src/world/jobs/old-smoke.js with its `battle` rules).
// 2. The battle's job: the road, the raids, the pay, the lines.
// 3. A real Duel: the furnace comes out, cinders land on Big Bess, a broken door holds it, a rest starts the stretch again.
// 4. A real App: the wall, starting the battle, and the three endings with what each writes to the save and pays.
// Memory only: no real save is read or written.
import assert from 'node:assert/strict';
import {Duel} from '../src/game.js';
import '../src/story/ember-lines.js';
import {EVERBURN_JOBS} from '../src/world/jobs/everburn.js';
import {OLD_SMOKE, createFurnace, stepFurnace, furnaceHit, furnaceHealth, furnaceDoorSpot, furnaceFallBack, furnacePace, furnaceRested} from '../src/world/jobs/old-smoke.js';
import {GAS_RUN_PATHS, GAS_RUN_ROADS, FIELD_BATTLE, fieldBattleAmbushes, fieldBattleJob, fieldBattlePay, gasRunJob, gasRunPay, isFieldBattle, isGasRun} from '../src/world/jobs/gas-run.js';
import {alongPath, metresAtPlace} from '../src/world/jobs/steps/escort.js';
import {pathShare} from '../src/world/jobs/furnace-sightings.js';
import {reportWorldJobThingHit} from '../src/arena/modes/world-job.js';
import {SCABLANDS_SOLIDS} from '../src/world/scablands-scene.js';
import {App} from '../src/app.js';
import {createFeatureFlags} from '../src/feature-flags.js';
import {finishArenaEvent} from '../src/arena/arena-event.js';
import {arenaResultsScreen} from '../src/screen-arena.js';
import {EMBER_JOBS, markEmberJob, markEmberRead, emberFeud, emberRuns, emberFurnaceDead, emberOf} from '../src/story/ember-save.js';
import {EMBER_BATTLE_BUTTON, EMBER_BATTLE_RESULTS, EMBER_BATTLE_SENTENCE, emberStoryProps} from '../src/story/ember-road.js';
import {emberWallMarkup} from '../src/story/ember-ui.js';
import {EMBER_CAPTIONS} from '../src/story/ember-lines.js';

let checks = 0;
const check = (condition, message) => { assert.ok(condition, message); checks++; };
const same = (actual, expected, message) => { assert.deepEqual(actual, expected, message); checks++; };
const near = (actual, expected, tolerance, message) => { assert.ok(Math.abs(actual - expected) <= tolerance, `${message}: ${actual} is not within ${tolerance} of ${expected}`); checks++; };

const ROAD = GAS_RUN_PATHS.boneyard, DT = 1 / 60;
const battle = difficulty => fieldBattleJob({runs: 0, difficulty}).steps[0];

// ---- 1. The furnace's rules in the battle ---------------------------------------------------------------------------------
{
  const fresh = difficulty => createFurnace(battle(difficulty).furnaceActor, difficulty);
  // Big Bess as the furnace sees her: `metres` along the road, and where she stands (on the road at that metre).
  const bessAt = (metres, arrived = false) => { const at = alongAt(metres); return {metres, x: at.x, z: at.z, arrived}; };
  function alongAt(metres) {
    let left = metres;
    for (let i = 1; i < ROAD.length; i++) {
      const a = ROAD[i - 1].position, b = ROAD[i].position, length = Math.hypot(b.x - a.x, b.z - a.z);
      if (left <= length || i === ROAD.length - 1) return {x: a.x + (b.x - a.x) * Math.min(1, left / length), z: a.z + (b.z - a.z) * Math.min(1, left / length)};
      left -= length;
    }
    return {x: ROAD[0].position.x, z: ROAD[0].position.z};
  }
  // Runs the furnace for `seconds`; `escortFor(f, t)` gives Big Bess for each step, `carFor(f)` the player's car. Returns the events and what it did.
  function run(f, seconds, escortFor = () => null, carFor = () => null) {
    const events = [], total = {armor: 0, escortBurn: 0, shove: null, speedCap: null};
    for (let t = 0; t < seconds - 1e-9; t += DT) {
      const out = stepFurnace(f, DT, {car: carFor(f), escort: escortFor(f, t)});
      events.push(...out.events.map(event => ({...event, atSec: f.timeSec})));
      total.armor += out.armor; total.escortBurn += out.escortBurn; total.shove ??= out.shove; total.speedCap ??= out.speedCapMph;
    }
    return {events, ...total};
  }
  const until = (f, condition, limit = 120, escortFor = () => null) => {
    for (let t = 0; t < limit && !condition(f); t += DT) stepFurnace(f, DT, {car: null, escort: escortFor(f, t)});
    return condition(f);
  };
  // Big Bess `ahead` metres in front of the furnace along the road (so the furnace is not held back by her).
  const aheadOf = ahead => f => bessAt(f.metres + ahead);
  // Big Bess 20 m in front of the furnace: inside its cinder range (25 m) and inside the 40 m where it drives at its own pace.
  const within = () => aheadOf(20);
  // Big Bess far from the furnace and from the road (out of its cinder range however far it drives).
  const outOfRange = f => ({metres: f.metres + 500, x: 9999, z: 9999, arrived: false});
  const typesOf = events => events.map(event => event.type);

  // Where it starts, and that its path is the Boneyard road itself.
  const step = battle('medium'), def = step.furnaceActor;
  same(def.path.map(item => item.position), ROAD.map(item => item.position), 'the furnace\'s path is the Boneyard road itself');
  same(step.path.map(item => item.position), ROAD.map(item => item.position), 'and so is Big Bess\'s');
  same(def.id, 'old-smoke-furnace', 'the battle\'s furnace is the furnace actor the scene already draws');
  // Re-recorded for the redesigned hunt: it comes out at 560 m (130 m past (0, 370)), not as she passes (0, 370) at 430 m, so that three
  // doors take most of the road that is left (chosen from 30 tries of each scripted driver).
  near(FIELD_BATTLE.comesOutAtMetres, metresAtPlace(ROAD, 2) + 130, .5, 'it comes out as Big Bess is 130 m past (0, 370)');
  same([ROAD[2].position.x, ROAD[2].position.z], [0, 370], 'which is the road\'s third place');
  near(FIELD_BATTLE.comesOutAtMetres, 560, 1e-9, '560 m into the road');
  near(FIELD_BATTLE.furnace.startMetres, 480, 1e-9, 'and it starts 480 m in');
  near(FIELD_BATTLE.furnace.comesOutAtMetres - FIELD_BATTLE.furnace.startMetres, 80, 1e-9, 'it comes out 80 m behind her');
  {
    const f = fresh('medium'), start = alongAt(f.metres);
    near(Math.hypot(f.x - start.x, f.z - start.z), 0, 1e-6, 'it starts on the road at its start metre');
    near(Math.hypot(f.x - 0, f.z - 370), 50, .5, 'which is 50 m past (0, 370), 80 m behind where she is as it comes out (it was 80 m from (0, 370) when it came out at 430 m)');
    near(f.metres, FIELD_BATTLE.furnace.startMetres, 1e-9, 'its metres are measured along Big Bess\'s own road');
    const out = run(f, .5, aheadOf(500));
    same(typesOf(out.events).filter(type => type === 'comesOut').length, 1, 'it says it has come out, once');
    check(!out.events.some(event => ['bolt', 'turnAround', 'rollIn', 'fell', 'townReached', 'gateBurnt', 'shoveWarning', 'shove'].includes(event.type)), 'and none of the story\'s other events');
  }

  // Its pace, and how it closes on Big Bess, on each difficulty. More than 40 m behind her it catches up at the catching-up pace;
  // within 40 m it drives at its own. Re-recorded for the redesigned hunt: before, one pace of 10 or 11 m/s at any distance.
  for (const [difficulty, pace, catchUp] of [['easy', 10, 12], ['medium', 11, 15], ['hard', 11, 15]]) {
    const f = fresh(difficulty);
    same(furnacePace(f), pace, `${difficulty}: ${pace} m/s before it has seen where she is`);
    const before = f.metres; run(f, 10, aheadOf(500));
    near(f.metres - before, catchUp * 10, .01, `${difficulty}: far behind her it covers ${catchUp * 10} m in 10 s (the catching-up pace, ${catchUp} m/s)`);
    same(furnacePace(f), catchUp, `${difficulty}: and furnacePace says so`);
    const near39 = fresh(difficulty); const m0 = near39.metres; run(near39, 10, f2 => bessAt(f2.metres + 39));
    near(near39.metres - m0, pace * 10, .01, `${difficulty}: 39 m behind her it drives at its own pace, ${pace} m/s (today's, not the catching-up one)`);
    same(furnacePace(near39), pace, `${difficulty}: and furnacePace says so`);
    const over41 = fresh(difficulty); const m1 = over41.metres; run(over41, 1, () => bessAt(over41.metres + 41));
    near(over41.metres - m1, catchUp, .2, `${difficulty}: 41 m behind her it is catching up`);
    // Big Bess drives away at 9 m/s from where the furnace came out, 80 m ahead of it: it closes by (catching-up pace - 9) m/s down to
    // 40 m, then by (pace - 9) m/s.
    const g = fresh(difficulty); let bess = FIELD_BATTLE.comesOutAtMetres;
    run(g, 20, () => { bess += 9 * DT; return bessAt(bess); });
    const fastSec = 40 / (catchUp - 9), gapAfter = 40 - (pace - 9) * (20 - fastSec);
    near(bess - g.metres, gapAfter, .5, `${difficulty}: it closes by ${catchUp - 9} m/s while 40 m or more behind and by ${pace - 9} m/s inside that (80 m of gap becomes ${gapAfter.toFixed(1)} m after 20 s)`);
  }

  // It never gets nearer than 12 m, so it never rams her.
  for (const difficulty of ['easy', 'medium', 'hard']) {
    const f = fresh(difficulty), stand = FIELD_BATTLE.comesOutAtMetres + 40;
    run(f, 60, () => bessAt(stand));
    near(stand - f.metres, FIELD_BATTLE.furnace.holdBehindMetres, .01, `${difficulty}: with Big Bess standing still it stops 12 m behind her`);
    check(Math.hypot(f.x - bessAt(stand).x, f.z - bessAt(stand).z) >= 11.9, `${difficulty}: and never touches her`);
  }

  // Cinders on Big Bess: 2, 4 and 6 a second within 25 m (gentler than the 6 and 9 of the first build, because they now land in
  // every battle), nothing beyond it, and a line of events the first time.
  for (const [difficulty, rate] of [['easy', 2], ['medium', 4], ['hard', 6]]) {
    const f = fresh(difficulty);
    const inRange = run(f, 3, f2 => ({...bessAt(f2.metres + 20), arrived: false}));
    near(inRange.escortBurn, rate * 3, rate * .05, `${difficulty}: ${rate} health a second at 20 m`);
    same(typesOf(inRange.events).filter(type => type === 'cindersLand').length, 1, `${difficulty}: the cinders land once, not every step`);
    const g = fresh(difficulty);
    const edge = run(g, 2, g2 => bessAt(g2.metres + 24.3));
    check(edge.escortBurn > 0, `${difficulty}: 24 m is inside the 25 m`);
    const h = fresh(difficulty);
    const far = run(h, 2, h2 => bessAt(h2.metres + 26));
    same(far.escortBurn, 0, `${difficulty}: 26 m is outside it: nothing burns`);
    same(typesOf(far.events).filter(type => type === 'cindersLand').length, 0, `${difficulty}: and nothing lands`);
  }
  {
    // They land again when it has been out of range and comes back.
    const f = fresh('medium'); let gap = 40;
    const events = [...run(f, 1, f2 => bessAt(f2.metres + gap)).events];
    gap = 20; events.push(...run(f, 1, f2 => bessAt(f2.metres + gap)).events);
    gap = 40; events.push(...run(f, 1, f2 => bessAt(f2.metres + gap)).events);
    gap = 20; events.push(...run(f, 1, f2 => bessAt(f2.metres + gap)).events);
    same(typesOf(events).filter(type => type === 'cindersLand').length, 2, 'the cinders land again when it comes back into range');
  }

  // New rule: a door begins to stoke only while the furnace is within cinder range of Big Bess. Out of range the stoke waits; a door that
  // already glows keeps its time; the next stoke (after the door shuts) waits for range as well.
  for (const difficulty of ['easy', 'medium', 'hard']) {
    const glow = {easy: 6, medium: 4.5, hard: 3.5}[difficulty];
    const f = fresh(difficulty);
    const farAway = run(f, 40, outOfRange);
    check(!farAway.events.some(event => ['stoke', 'doorOpen'].includes(event.type)) && f.phase === 'idle' && f.door === null, `${difficulty}: 40 s out of range, no door has begun to stoke`);
    const inRange = run(f, .1, within());
    check(typesOf(inRange.events).includes('stoke') && f.phase === 'stoke' && f.door === 'left', `${difficulty}: the left door begins to stoke as soon as it is within range`);
    // Out of range again in the middle of the stoke: a stoke already begun goes on.
    check(until(f, g => g.phase === 'glow', 60, outOfRange), `${difficulty}: a stoke already begun goes on out of range, to the glow`);
    // A glowing door keeps its time out of range.
    const opened = f.timeSec, seen = run(f, glow + 1, outOfRange);
    const slam = seen.events.find(event => event.type === 'doorSlam');
    check(slam && slam.reason === 'missed', `${difficulty}: a glowing door shuts when its time is up, not because Big Bess is out of range`);
    near(slam.atSec - opened, glow, DT * 2, `${difficulty}: after its own ${glow} seconds of glow`);
    // Shut, and the next stoke waits for range.
    const waited = run(f, 30, outOfRange);
    check(f.phase === 'shut' && !waited.events.some(event => ['stoke', 'doorOpen'].includes(event.type)), `${difficulty}: the shut door's next stoke waits while out of range`);
    const back = run(f, .1, within());
    check(typesOf(back.events).includes('stoke') && f.phase === 'stoke', `${difficulty}: and begins when she is back in range`);
    // A door broken while out of range still leaves the furnace stopped for its time, then waiting for range before the next door.
  }
  {
    // After a broken door the furnace waits to stoke the next until it is within range again.
    const f = fresh('medium');
    check(until(f, g => g.phase === 'glow', 60, within()) && furnaceHit(f, 'left'), 'medium: the left door breaks');
    run(f, 8.5, outOfRange);
    check(f.phase === 'idle', 'medium: after its stop with Big Bess far ahead, the next door has not begun to stoke');
    run(f, 20, outOfRange);
    check(f.phase === 'idle' && f.door === null, 'medium: nor does it while she stays out of range');
  }
  {
    // The flag the scene reads (`burning`) is true exactly while cinders land: within range, moving (not held by a broken door), not dead.
    const f = fresh('medium'); let mismatches = 0, burningSteps = 0, heldInRange = 0, gap = 20;
    for (let t = 0; t < 60; t += DT) {
      gap = Math.floor(t / 3) % 3 === 2 ? 60 : 20;
      const out = stepFurnace(f, DT, {car: null, escort: bessAt(f.metres + gap)});
      if ((out.escortBurn > 0) !== f.burning) mismatches++;
      if (f.burning) burningSteps++;
      if (f.phase === 'stagger' && f.inCinderRange && !f.burning) heldInRange++;
      if (f.phase === 'glow' && f.hits < 2) furnaceHit(f, f.door);
    }
    same(mismatches, 0, 'burning is true on exactly the steps where cinders land on Big Bess (60 s, in and out of range, with doors broken)');
    check(burningSteps > 0 && heldInRange > 0, 'and that run had steps with cinders landing, and steps held by a broken door within range, where nothing lands');
    check(f.dead === false && f.burning !== undefined, 'a living furnace has the flag');
  }

  // The furnace burns its coal: after Big Bess's third rest in one battle it is spent. It throws no more cinders, no door begins to stoke,
  // a door that already glows keeps its time and can still be broken, and it follows her as before.
  same(FIELD_BATTLE.furnace.spentAfterRests, 3, 'the furnace is spent after three rests');
  for (const difficulty of ['easy', 'medium', 'hard']) {
    const f = fresh(difficulty);
    same([f.rests, f.spent], [0, false], `${difficulty}: a new furnace has had no rests and is not spent`);
    furnaceRested(f); furnaceRested(f);
    same([f.rests, f.spent], [2, false], `${difficulty}: it is not spent before the third rest`);
    check(run(f, 20, within()).escortBurn > 0, `${difficulty}: and still throws cinders after two`);
    furnaceRested(f);
    same([f.rests, f.spent], [3, true], `${difficulty}: it is spent at the third`);
    const mid = run(f, 30, within());   // a stoke or glow that had already begun may finish; the cinders stop at once
    same([mid.escortBurn, f.burning], [0, false], `${difficulty}: a spent furnace within range of her throws no cinders`);
    const fresh3 = fresh(difficulty); furnaceRested(fresh3, 3);
    const after = run(fresh3, 30, within());
    same([after.escortBurn, fresh3.burning, fresh3.phase, typesOf(after.events).filter(type => ['stoke', 'doorOpen', 'cindersLand'].includes(type))], [0, false, 'idle', []],
      `${difficulty}: a furnace spent before any door has begun, within range of her for 30 s, throws nothing and begins no stoke`);
    furnaceRested(f);
    same(f.rests, 4, `${difficulty}: later rests are still counted`);
    const g = fresh(difficulty); furnaceRested(g, 3);
    same(g.spent, true, `${difficulty}: and three rests counted at once (rests she had before it came out) spend it`);
    // It still follows her (at the catching-up pace beyond 40 m) and never comes nearer than 12 m.
    const h = fresh(difficulty); furnaceRested(h, 3); const m0 = h.metres; run(h, 5, aheadOf(500));
    check(h.metres > m0 + 40, `${difficulty}: a spent furnace still follows her`);
    const k = fresh(difficulty); furnaceRested(k, 3); run(k, 60, () => bessAt(FIELD_BATTLE.comesOutAtMetres + 40));
    near(FIELD_BATTLE.comesOutAtMetres + 40 - k.metres, 12, .01, `${difficulty}: and stops 12 m behind her`);
  }
  for (const difficulty of ['medium', 'hard']) {
    // A door that already glows keeps its time and can still be broken after the furnace is spent.
    const f = fresh(difficulty), glow = difficulty === 'medium' ? 4.5 : 3.5;
    check(until(f, g => g.phase === 'glow', 60, within()), `${difficulty}: the left door glows`);
    furnaceRested(f, 3);
    run(f, glow / 2, within());
    same([f.phase, f.door, f.spent], ['glow', 'left', true], `${difficulty}: spent, its glowing door is still glowing half-way through its time`);
    check(furnaceHit(f, 'left') === true && f.hits === 1, `${difficulty}: and can still be broken`);
    run(f, 8.5, within());
    same([f.phase, f.door], ['idle', null], `${difficulty}: but no other door begins to stoke after its stop`);
    // A door left to glow shuts at its own time and the next stoke never begins.
    const g = fresh(difficulty);
    check(until(g, h => h.phase === 'glow', 60, within()), `${difficulty}: a door glows`);
    furnaceRested(g, 3);
    const opened = g.timeSec, seen = run(g, glow + 20, within()), slam = seen.events.find(event => event.type === 'doorSlam');
    check(slam && slam.reason === 'missed', `${difficulty}: a glowing door that is not broken shuts`);
    near(slam.atSec - opened, glow, DT * 2, `${difficulty}: after its own ${glow} seconds`);
    check(g.phase === 'shut' && !seen.events.some(event => event.type === 'stoke'), `${difficulty}: and no stoke follows`);
    // The last door, glowing when it is spent, still ends the furnace when it is broken.
    const h = fresh(difficulty);
    for (const door of ['left', 'right']) { until(h, k => k.phase === 'glow', 60, within()); furnaceHit(h, door); run(h, 8.5, within()); }
    check(until(h, k => k.phase === 'glow', 60, within()) && h.door === 'rear', `${difficulty}: the rear door glows`);
    furnaceRested(h, 3);
    check(furnaceHit(h, 'rear') === true && h.dead && h.won, `${difficulty}: spent, its last glowing door can still be broken, and it dies`);
  }
  {
    // The story's furnace has no coal rule.
    const old = createFurnace(EVERBURN_JOBS[5].steps[1].actor, 'medium');
    furnaceRested(old, 5);
    same([old.rests, old.spent], [0, false], 'the story furnace of job 6 ignores rests: never spent');
  }

  // They burn Big Bess and not the player, and nothing shoves the player.
  for (const difficulty of ['easy', 'medium', 'hard']) {
    const f = fresh(difficulty);
    const out = run(f, 25, within(), g => ({x: g.x - Math.sin(g.heading) * 6, y: 0, z: g.z - Math.cos(g.heading) * 6}));
    same([out.armor, out.shove, out.speedCap], [0, null, null], `${difficulty}: a car sitting in the furnace's cinders loses no armour, is not shoved and is not slowed`);
    const beside = run(fresh(difficulty), 12, within(), g => ({x: g.x + Math.cos(g.heading) * 5, y: 0, z: g.z - Math.sin(g.heading) * 5}));
    same([beside.armor, beside.shove, typesOf(beside.events).includes('shoveWarning')], [0, null, false], `${difficulty}: a car beside it is never shoved`);
  }

  // The doors come in turn on one long leg, each broken door holds it for 8 seconds, and three break it (one on Easy).
  for (const difficulty of ['medium', 'hard']) {
    const f = fresh(difficulty), glow = difficulty === 'medium' ? 4.5 : 3.5;
    same(run(fresh(difficulty), 30, within()).events.find(event => event.type === 'doorOpen').seconds, glow, `${difficulty}: a door glows for ${glow} seconds, as in the story`);
    same(f.legs.map(leg => leg.door), ['left', 'right', 'rear'], 'the legs are the three doors in turn');
    same(f.legs.map(leg => leg.fromMetres), [0, 0, 0], 'all on one long leg');
    for (const [index, door] of ['left', 'right', 'rear'].entries()) {
      check(until(f, g => g.phase === 'glow', 60, within()), `${difficulty}: door ${index + 1} glows`);
      same([f.door, f.hits], [door, index], `${difficulty}: the ${door} door is the one that glows, after ${index} broken`);
      const wrong = ['left', 'right', 'rear'].find(other => other !== door);
      check(furnaceHit(f, wrong) === false, `${difficulty}: a hit on the ${wrong} door while the ${door} door glows counts for nothing`);
      check(furnaceHit(f, door, 'weapon') === true && f.hits === index + 1, `${difficulty}: a hit on the glowing ${door} door breaks it`);
      if (index < 2) {
        near(f.staggerLeft, 8, 1e-9, `${difficulty}: each broken door stops it for 8 seconds`);
        const before = f.metres, x = f.x, z = f.z;
        run(f, 7.9, within());
        same([f.metres, f.x, f.z], [before, x, z], `${difficulty}: it does not move for those 8 seconds`);
        run(f, .3, within());
        check(f.metres > before, `${difficulty}: and rolls again after them`);
        const after = f.metres; run(f, 5, within());
        near((f.metres - after) / 5, 11, .01, `${difficulty}: at 11 m/s, not at the story's faster pace`);
      }
    }
    check(f.dead && f.won && !f.fallen && f.phase === 'dead', `${difficulty}: the third door breaks it for good, where it stands`);
    same(furnaceHealth(f), 0, `${difficulty}: it has no health left`);
    const stopped = {x: f.x, z: f.z, metres: f.metres};
    const after = run(f, 30, within());
    same([f.x, f.z, f.metres], [stopped.x, stopped.z, stopped.metres], `${difficulty}: it stays where it stopped`);
    check(!after.events.some(event => ['rollIn', 'fell', 'turnAround', 'bolt'].includes(event.type)) && after.escortBurn === 0, `${difficulty}: it does not roll into the well, turn round or throw cinders`);
  }
  {
    const f = fresh('easy');
    same(run(fresh('easy'), 30, within()).events.find(event => event.type === 'doorOpen').seconds, 6, 'easy: the door glows for 6 seconds');
    check(until(f, g => g.phase === 'glow', 60, within()) && f.door === 'left', 'easy: the left door glows first');
    f.pending.length = 0;
    check(furnaceHit(f, 'left') === true, 'easy: one broken door');
    check(f.dead && f.won && f.phase === 'dead' && furnaceHealth(f) === 0, 'easy: is enough to stop it for good');
    same(typesOf(f.pending), ['hit', 'plateFall', 'dead'], 'and the events say so');
  }
  {
    // A ram counts, as in the story: a car just outside the glowing door.
    const f = fresh('medium');
    until(f, g => g.phase === 'glow', 60, within());
    const spot = furnaceDoorSpot(f, 'left'), right = {x: -Math.cos(f.heading), z: Math.sin(f.heading)};
    stepFurnace(f, DT, {car: {x: spot.x - right.x * 1.5, y: 0, z: spot.z - right.z * 1.5}, escort: within()(f)});
    same(f.hits, 1, 'a ram on the glowing door breaks it');
  }

  // It never bolts to the next leg's ground, never turns round at the road's end and never shoves: run it alone for a long time.
  const STORY_ONLY = ['bolt', 'turnAround', 'escaped', 'rollIn', 'fell', 'townReached', 'gateBurnt', 'shoveWarning', 'shove'];
  for (const difficulty of ['easy', 'medium', 'hard']) {
    // A player who breaks every door the moment it glows, with Big Bess in front of the furnace (a door stokes only in cinder range).
    const f = fresh(difficulty), events = [];
    for (let t = 0; t < 200 && !f.dead; t += DT) {
      events.push(...stepFurnace(f, DT, {car: null, escort: within()(f)}).events.map(event => event.type));
      if (f.phase === 'glow') furnaceHit(f, f.door);
    }
    check(f.dead && f.hits === (difficulty === 'easy' ? 1 : 3), `${difficulty}: it is stopped by its doors alone`);
    check(!events.some(type => STORY_ONLY.includes(type)), `${difficulty}: it never bolts to the next leg's ground, turns round, escapes, rolls into the well or shoves`);
    const alone = run(fresh(difficulty), 200);
    check(!alone.events.some(event => STORY_ONLY.includes(event.type)), `${difficulty}: and left alone it does none of them either`);
  }
  {
    const f = fresh('medium');
    run(f, 200);
    near(f.metres, f.path.total, 1e-6, 'with nobody to hold it back it drives to the road\'s end and stops there');
  }

  // When Big Bess arrives it turns away at the gate and drives back the way it came.
  for (const difficulty of ['easy', 'medium', 'hard']) {
    const f = fresh(difficulty);
    f.metres = f.path.total - 30; stepFurnace(f, DT, {escort: bessAt(f.path.total - 18)});
    const heading = f.heading, metres = f.metres;
    const out = run(f, 3, () => bessAt(f.path.total, true));
    same(typesOf(out.events).filter(type => type === 'turnAway').length, 1, `${difficulty}: it turns away once when she has arrived`);
    check(f.metres < metres, `${difficulty}: and drives back down the road`);
    near(Math.abs(Math.atan2(Math.sin(f.heading - heading), Math.cos(f.heading - heading))), Math.PI, .2, `${difficulty}: facing the other way`);
    same(out.escortBurn > 0, false, `${difficulty}: with no more cinders`);
    same(f.phase === 'glow' || f.phase === 'stoke', false, `${difficulty}: and no door opening`);
  }

  // A rest sets Big Bess back; the furnace falls back to where it came out and keeps its broken doors.
  {
    const f = fresh('medium');
    until(f, g => g.phase === 'glow', 60, within()); furnaceHit(f, 'left');
    run(f, 40, aheadOf(500));
    const before = f.metres;
    furnaceFallBack(f, FIELD_BATTLE.comesOutAtMetres);
    near(f.metres, FIELD_BATTLE.furnace.startMetres, 1e-9, 'after a restart at the place she came out, it is back 80 m behind her');
    check(f.metres < before && f.hits === 1, 'and keeps its broken door');
    const x = f.x; furnaceFallBack(f, FIELD_BATTLE.comesOutAtMetres + 1000);
    same(f.x, x, 'it is not moved forward by a restart further on');
    const dead = fresh('medium'); dead.dead = true; dead.metres = 500; furnaceFallBack(dead, 450);
    same(dead.metres, 500, 'a dead furnace stays where it is');
  }

  // Job 6 is untouched: its furnace carries no battle rules and has no start event.
  {
    const old = createFurnace(EVERBURN_JOBS[5].steps[1].actor, 'medium');
    same([old.battle, old.dead, old.turnedAway, old.pending, old.metres], [null, false, false, [], 0], 'Old Smoke\'s furnace in job 6 carries no battle rules');
    same(furnacePace(old), OLD_SMOKE.baseSpeed, 'and keeps its own pace');
    const out = stepFurnace(old, DT, {car: null});
    same(out.escortBurn, 0, 'and burns no escort');
  }
}

// ---- 2. The battle's job -----------------------------------------------------------------------------------------------------
{
  const job = fieldBattleJob({runs: 0, difficulty: 'medium'}), step = job.steps[0];
  check(isGasRun(job) && isFieldBattle(job) && !isFieldBattle(gasRunJob({road: 'boneyard', feud: 4})), 'the battle is a gas run on the Boneyard road, and an ordinary War party run is not the battle');
  same([job.id, job.road, job.battle, job.feud, job.storyId, job.kind, step.kind, step.actorId], ['gas-run-boneyard-battle', 'boneyard', true, 4, 'everburn', 'escort', 'escort', 'big-bess'], 'a Boneyard road escort of Big Bess at War party');
  same([step.actor.speed, step.actor.health, step.speed, step.health, step.restSeconds, step.lentWeapon], [9, 100, 9, 100, 3, 'flamethrower'], 'Big Bess as in any run: 9 m/s, health 100, a 3 second rest, the flamethrower lent');
  same(step.ambushes.map(item => item.count), [3, 3], 'two ambushes of 3');
  same(fieldBattleJob({runs: 0, difficulty: 'easy'}).raids.map(item => item.count), [2, 2], 'and of 2 on Easy');
  same(job.raids.map(item => item.count), [3, 3], 'of 3 on Medium and Hard');
  check(step.ambushes.every(item => alongPath(step.path, item.place).gap < .5 && alongPath(step.path, item.place).metres > metresAtPlace(step.path, 2) + 100), 'both stand on the road, ahead of (0, 370) (the furnace now comes out 130 m further on, so the nearest place, 540 m, may stand just before it)');
  check(step.ambushes.every(item => FIELD_BATTLE.ambushMetres.includes(item.metres)), 'at two of the fixed places');
  same(fieldBattleJob({runs: 7}).steps[0].ambushes.map(item => item.place.position), fieldBattleJob({runs: 7}).steps[0].ambushes.map(item => item.place.position), 'the same save gets the same ambush places');
  let alike = 0;
  for (let runs = 0; runs < 300; runs++) if (fieldBattleAmbushes(runs).map(item => item.metres).join() === fieldBattleAmbushes(runs + 1).map(item => item.metres).join()) alike++;
  same(alike, 0, 'and two battles in a row are never alike (300 pairs)');
  same(job.shares, 4, 'it pays four shares');
  same([fieldBattlePay('easy'), fieldBattlePay('medium'), fieldBattlePay('hard')], [320, 384, 448], 'which is 320, 384 and 448 on Easy, Medium and Hard');
  same(fieldBattlePay('medium'), gasRunPay('boneyard', 'medium') * 2, 'twice the Boneyard road\'s two shares');
  same([job.arrivedShares, fieldBattlePay('medium', job.arrivedShares)], [2, gasRunPay('boneyard', 'medium')], 'Big Bess arriving with the furnace still rolling pays the Boneyard road\'s own two shares');
  same(step.startLineId, 'story.ember.moss.11', 'it starts on Moss\'s line about the furnace');
  same(step.arrival.battle.wonLineIds.concat(step.arrival.battle.arrivedLineIds), ['story.ember.auntie-solder.11', 'story.ember.auntie-solder.10'], 'and ends on Auntie Solder\'s line for how it ended');
  check(step.what.endsWith('.') && !step.what.includes(String.fromCharCode(0x2014)), 'its line on screen is a whole sentence');
  same(step.furnaceActor.legs.map(leg => leg.door), ['left', 'right', 'rear'], 'the furnace\'s doors come left, right, rear');
  same(Object.keys(FIELD_BATTLE.lines).length, 7, 'seven lines');
  check(Object.values(FIELD_BATTLE.lines).every(id => EMBER_CAPTIONS[id]), 'each has words');
  // Both roads clear every solid: the battle drives the Boneyard road itself, so it is the same road, and the long road is untouched.
  const distanceToBox = (x, z, solid) => {
    const [cx, , cz] = solid.center, [width, , depth] = solid.size;
    return Math.hypot(Math.max(Math.abs(x - cx) - width / 2, 0), Math.max(Math.abs(z - cz) - depth / 2, 0));
  };
  for (const [label, points] of [['Big Bess\'s road', step.path], ['the furnace\'s road', step.furnaceActor.path], ['the long road', GAS_RUN_PATHS.long]]) {
    const list = points.map(item => item.position ?? item);
    for (let piece = 0; piece < list.length - 1; piece++) {
      const a = list[piece], b = list[piece + 1], length = Math.hypot(b.x - a.x, b.z - a.z);
      for (const solid of SCABLANDS_SOLIDS) {
        if (solid.id === 'everburn-well' && piece === 0) continue;
        let closest = Infinity;
        for (let metres = 0; metres <= length; metres += .5) closest = Math.min(closest, distanceToBox(a.x + (b.x - a.x) * metres / length, a.z + (b.z - a.z) * metres / length, solid));
        check(closest >= (/^tin-town-gate-post-/.test(solid.id) ? 3.4 : 8), `${label}: piece ${piece + 1} clears ${solid.id}`);
      }
    }
  }
  same(GAS_RUN_ROADS, ['long', 'boneyard'], 'there are still two roads: the battle is not a third');
}

// ---- 3. A real Duel ------------------------------------------------------------------------------------------------------------
const FLAGS = {'hidden-road': true, arsenal: true, 'arsenal-wave3': true, 'warlord-cards': true, 'crew-gear': true};
const idle = {throttle: 0, brake: 1, steer: 0, boost: false, interact: false};
const worldOf = duel => duel.state.arena.worldJob;
const bessOf = duel => worldOf(duel).actors.find(actor => actor.id === 'big-bess');
const furnaceOf = duel => worldOf(duel).actors.find(actor => actor.furnace);
function startBattle(difficulty, {job = fieldBattleJob({runs: 0, difficulty}), seed = 1} = {}) {
  const duel = new Duel({seed, featureFlags: FLAGS});
  duel.state.wastelandGateDiscovered = true;
  assert.equal(duel.startArenaEvent({venueId: 'scablands', mode: 'world-job', car: 'falcone_f42', seed, cpuDifficulty: difficulty,
    opponents: [], weaponLoadout: ['bomb', 'crossbow', 'star'], arsenalRank: 9, job: {...job, seed}}), true, 'the battle starts'); checks++;
  duel.lines = [];
  const callout = duel._callout.bind(duel); duel._callout = (text, seconds) => { duel.lines.push(String(text)); return callout(text, seconds); };
  duel.cues = [];
  duel.onChange((_state, event) => { if (event.arenaTell?.cue) duel.cues.push(event.arenaTell.cue); if (event.raiderWarning) duel.cues.push('raiderWarning'); });
  return duel;
}
function runUntil(duel, condition, seconds = 200, each = null) {
  for (let tick = 0; tick < Math.round(seconds / (1 / 120)) && !condition() && duel.state.status !== 'arena_result'; tick++) {
    duel.setInput(duel.state.status === 'racing' ? idle : {...idle, brake: 0});
    each?.();
    duel.step(1 / 120);
  }
  return condition();
}
// A weapon hit on the glowing door, reported the way the combat code reports it.
const hitDoor = duel => {
  const f = furnaceOf(duel).furnace;
  reportWorldJobThingHit(duel, {id: `old-smoke-furnace:door-${f.door}`, actorId: 'old-smoke-furnace', kind: 'furnace-vent', door: f.door, damage: 1, glowing: true});
};
// A battle with no ambushes, so that only the furnace can hurt Big Bess.
const noRaiders = difficulty => { const job = fieldBattleJob({runs: 0, difficulty}); return {...job, steps: [{...job.steps[0], ambushes: []}]}; };
{
  // The furnace does not exist until Big Bess is 560 m along the road (130 m past (0, 370)); then it comes out behind her and Clinker speaks.
  const duel = startBattle('medium', {job: noRaiders('medium')});
  check(runUntil(duel, () => bessOf(duel)?.pathIndex >= 2, 60), 'Big Bess drives on');
  check(!furnaceOf(duel), 'the furnace is not out when she passes (0, 370): it comes out 130 m later');
  same(duel.lines.filter(text => text.startsWith('Moss: That is his furnace')), ['Moss: That is his furnace on the road behind us. Somebody pulled it out of the well.'], 'the battle opened on Moss\'s line, once');
  check(runUntil(duel, () => furnaceOf(duel), 60), 'the furnace comes out');
  const f = furnaceOf(duel).furnace, bess = bessOf(duel);
  near(pathShare(bess.position, bess.pathIndex, worldOf(duel).job.steps[0].path).metres - f.metres, 80, 3, 'about 80 m behind her');
  check(duel.lines.includes('Clinker: You put him in the well. I am putting you in the ground.'), 'and Clinker speaks, once the furnace has come out');
  same(duel.lines.filter(text => text.startsWith('Clinker')).length, 1, 'once');
  near(furnaceOf(duel).position.x - f.x, 0, 1e-6, 'the actor is where the furnace is');
  check(furnaceOf(duel).health === 3, 'with its three doors');

  // Cinders: within 25 m behind her they cost 4 a second on Medium (6 in the first build); Moss says so once.
  const gapOf = () => Math.hypot(f.x - bessOf(duel).position.x, f.z - bessOf(duel).position.z);
  let healthAtRange = null, rangeAt = null, last = bessOf(duel).health;
  check(runUntil(duel, () => { if (healthAtRange === null && gapOf() <= 25) { healthAtRange = bessOf(duel).health; rangeAt = duel.state.stageTimeSec; } return healthAtRange !== null && duel.state.stageTimeSec > rangeAt + 2; }, 60),
    'the furnace comes within 25 m of her');
  near(healthAtRange - bessOf(duel).health, 8, 1.5, 'Medium: 4 health a second while it is within 25 m (8 in 2 s)');
  check(duel.lines.includes('Moss: It is throwing fire on the tank! Get it off us!'), 'Moss says the fire is on the tank');
  runUntil(duel, () => false, 3);
  same(duel.lines.filter(text => text.includes('throwing fire')).length, 1, 'once');
  check(duel.cues.includes('weapon.flame.start'), 'the fire cue sounds when the cinders land');
  check(gapOf() >= 11.9, 'the furnace has not come nearer than 12 m');
  check(!furnaceOf(duel).furnace.won && duel.state.arena.result == null, 'and the battle is not over');
}
{
  // A broken door stops it for 8 seconds; Clinker speaks about the door; the fire cue is the story's.
  const duel = startBattle('medium', {job: noRaiders('medium')});
  check(runUntil(duel, () => furnaceOf(duel)?.furnace.phase === 'glow', 120), 'the left door glows');
  const f = furnaceOf(duel).furnace, metres = f.metres;
  hitDoor(duel); runUntil(duel, () => false, .05);
  same([f.hits, furnaceOf(duel).health], [1, 2], 'a hit on the glowing door breaks it');
  check(duel.lines.includes('Clinker: That door was the last thing he made. You will pay for that door.'), 'Clinker says the door was the last thing Old Smoke made');
  check(duel.cues.includes('combat.hit-confirm'), 'with the story\'s hit cue');
  const stopped = f.metres;
  runUntil(duel, () => false, 7.8);
  near(f.metres, stopped, .001, 'it stands still for 8 seconds');
  runUntil(duel, () => false, .6);
  check(f.metres > stopped, 'and rolls again');
  // The second door, then the third: the furnace dies where it stands.
  check(runUntil(duel, () => f.phase === 'glow', 60) && f.door === 'right', 'the right door is next');
  hitDoor(duel); runUntil(duel, () => false, .05);
  check(runUntil(duel, () => f.phase === 'glow', 60) && f.door === 'rear', 'then the rear door');
  const lines = duel.lines.length; hitDoor(duel); runUntil(duel, () => false, .05);
  check(f.dead && furnaceOf(duel).health === 0, 'the third door breaks it for good');
  same(duel.lines.slice(lines), ['Cinder: That is the last of his fire, and it went out on a road. Bring the gas home.'], 'and Cinder says that is the last of his fire (nothing about a door as well)');
  const spot = {x: furnaceOf(duel).position.x, z: furnaceOf(duel).position.z};
  // Re-recorded: the furnace now dies later on the road (it comes out at 560 m and a door stokes only in range), so Big Bess can reach Tin Town
  // within the 20 seconds that used to be left; the claim that its death does not end the battle is checked at the moment of death, and the
  // claim that she drives on to Tin Town is kept: by the end of those seconds the battle is either still going or won.
  check(duel.state.arena.result == null, 'Big Bess is still on the road when the furnace dies: the battle is not over');
  runUntil(duel, () => false, 20);
  same([furnaceOf(duel).position.x, furnaceOf(duel).position.z], [spot.x, spot.z], 'it stays where it stopped');
  check(duel.state.arena.result == null || worldOf(duel).battleEnding === 'won', 'and Big Bess drives on to Tin Town: the battle is going on or won');
}
{
  // Cinders by difficulty in a real Duel: 2 a second on Easy, 6 on Hard (9 in the first build).
  for (const [difficulty, rate] of [['easy', 2], ['hard', 6]]) {
    const duel = startBattle(difficulty, {job: noRaiders(difficulty)});
    check(runUntil(duel, () => furnaceOf(duel), 80), `${difficulty}: the furnace comes out`);
    const f = furnaceOf(duel).furnace, gapOf = () => Math.hypot(f.x - bessOf(duel).position.x, f.z - bessOf(duel).position.z);
    let start = null;
    check(runUntil(duel, () => { if (start === null && gapOf() <= 25) start = {health: bessOf(duel).health, at: duel.state.stageTimeSec}; return start !== null && duel.state.stageTimeSec > start.at + 2; }, 120), `${difficulty}: it comes within 25 m`);
    near(start.health - bessOf(duel).health, rate * 2, rate * .25, `${difficulty}: ${rate} health a second`);
  }
}
{
  // Big Bess rests when she is at 0; she starts the stretch again with at least 60, the furnace falls back behind her and keeps its door.
  const duel = startBattle('medium', {job: noRaiders('medium')});
  check(runUntil(duel, () => furnaceOf(duel)?.furnace.phase === 'glow', 120), 'the left door glows');
  hitDoor(duel); runUntil(duel, () => false, .05);
  const f = furnaceOf(duel).furnace, path = worldOf(duel).job.steps[0].path;
  runUntil(duel, () => false, 3);
  bessOf(duel).health = 0;
  runUntil(duel, () => worldOf(duel).job.stepState.rested === true, 3);
  check(worldOf(duel).job.stepState.rested === true, 'at 0 health Big Bess rests');
  check(runUntil(duel, () => worldOf(duel).job.stepState.rested === false && bessOf(duel).health > 0, 12), 'and starts the stretch again');
  check(bessOf(duel).health >= 60, 'with at least 60 health');
  const bessMetres = pathShare(bessOf(duel).position, bessOf(duel).pathIndex, path).metres;
  near(bessMetres - f.metres, 80, 2, 'the furnace is back 80 m behind her');
  same(f.hits, 1, 'and keeps its broken door');
  check(duel.state.arena.result == null && duel.state.status !== 'arena_result', 'a battle is never a game over');
}
{
  // Riders: both ambushes appear with the raid warning, and the furnace rules do not touch them.
  const duel = startBattle('medium');
  check(runUntil(duel, () => duel.cues.includes('raiderWarning'), 120), 'the riders appear with the raid warning');
  same(worldOf(duel).actors.filter(actor => actor.ambushKey).length, 3, 'three of them');
}

// ---- 4. A real App: the wall, starting, and the three endings --------------------------------------------------------------------
{
  const values = new Map();
  globalThis.localStorage = {getItem: key => values.get(String(key)) ?? null, setItem: (key, value) => values.set(String(key), String(value)),
    removeItem: key => values.delete(String(key))};
  globalThis.cancelAnimationFrame ??= () => {};
  const metric = (label, value) => `<m>${label}:${value}</m>`, action = (label, verb, primary = false) => `<button data-action="${verb}"${primary ? ' data-primary="true"' : ''}>${label}</button>`;
  function yard({jobs = 6, on = ['story-everburn', 'scablands-runs'], extra = {}, difficulty = 'medium'} = {}) {
    values.clear();
    const app = new App(); app.audio.unlock = () => {};
    app.duel.featureFlags = createFeatureFlags({storage: null, overrides: Object.fromEntries([...['hidden-road', 'arsenal', 'arsenal-wave3', 'warlord-cards'], ...on].map(name => [name, true]))});
    let profile = {...app.profile, wasteland: {...app.profile.wasteland, version: 1, discoveredGate: true}};
    profile = markEmberRead(profile).profile;
    for (const id of EMBER_JOBS.slice(0, jobs)) profile = markEmberJob(profile, id).profile;
    if (Object.keys(extra).length) profile = {...profile, story: {...profile.story, ember: {...profile.story.ember, ...extra}}};
    app.profile = profile; app.cpuDifficulty = difficulty;
    assert.equal(app._saveProfile(), true); checks++;
    const state = app.duel.state; state.status = 'exploring'; state.playerId = app.player.id;
    state.hiddenRoadJourney = {id: 'test-yard', phase: 'arrived', departed: true}; state.wastelandGateDiscovered = true;
    assert.equal(app.isYardHomeActive(), true); checks++;
    return app;
  }
  const wallOf = app => emberWallMarkup(app.storyProps('ember'));
  const boneyardButton = wall => wall.match(/data-ember-run="boneyard"><span>([^<]*)<\/span><small>([^<]*)<\/small>/);

  // The battle is offered only at War party on the Boneyard road, while the furnace is alive.
  for (const feud of [1, 2, 3]) {
    const app = yard({extra: {feud, runs: 2}}), wall = wallOf(app);
    check(!wall.includes('dragged the furnace') && !wall.includes('THE BATTLE'), `feud ${feud}: no battle on the wall`);
    check(app.gasRun('boneyard') && worldOf(app.duel).definition.id === 'gas-run-boneyard' && !worldOf(app.duel).definition.battle, `feud ${feud}: the Boneyard road is an ordinary run`);
    app.dispose?.();
  }
  {
    const app = yard({extra: {feud: 4, runs: 2}}), wall = wallOf(app);
    check(wall.includes(EMBER_BATTLE_SENTENCE) && EMBER_BATTLE_SENTENCE === 'The Ash Men have dragged the furnace out of the well. They are waiting on the Boneyard road.', 'at War party the wall says the furnace is out of the well and the Ash Men are waiting');
    check(!wall.includes('have gathered a war party'), 'in place of the War party line');
    same(boneyardButton(wall)?.slice(1), ['BONEYARD ROAD: THE BATTLE', '384 scrap'], 'the Boneyard road button reads BONEYARD ROAD: THE BATTLE with the pay of four shares (384 on Medium)');
    check(EMBER_BATTLE_BUTTON === 'BONEYARD ROAD: THE BATTLE', 'and that is the card\'s word for word');
    check(wall.includes('data-ember-run="long"><span>LONG ROAD</span><small>96 scrap</small>'), 'the long road keeps its button and its one share');
    same((wall.match(/data-ember-run="/g) || []).length, 2, 'two road buttons');
    same(app.storyProps('ember').run.battle, true, 'the wall\'s props say it is the battle');
    const easy = yard({extra: {feud: 4}, difficulty: 'easy'});
    same(boneyardButton(wallOf(easy))?.slice(1), ['BONEYARD ROAD: THE BATTLE', '320 scrap'], 'on Easy the pay is 320');
    easy.dispose?.();
    // The long road is still an ordinary run, and still lowers the feud on arrival.
    check(app.gasRun('long') && worldOf(app.duel).definition.id === 'gas-run-long' && !worldOf(app.duel).definition.battle, 'the long road is an ordinary run at War party');
    app.dispose?.();
  }
  {
    const app = yard({extra: {feud: 4, runs: 2, furnaceDead: true}}), wall = wallOf(app);
    check(wall.includes('The Ash Men have gathered a war party.') && !wall.includes('THE BATTLE'), 'with the furnace dead, War party reads as it did before');
    same(boneyardButton(wall)?.slice(1), ['BONEYARD ROAD', '192 scrap'], 'and the Boneyard button is the ordinary one (192 on Medium)');
    check(app.gasRun('boneyard') && worldOf(app.duel).definition.id === 'gas-run-boneyard' && !worldOf(app.duel).definition.battle, 'a Boneyard run is the ordinary War party run');
    same(worldOf(app.duel).definition.steps[0].ambushes.map(item => item.count), [3, 3, 4], 'with the three raids of 3, 3 and 4, and no furnace');
    check(!worldOf(app.duel).definition.steps[0].furnaceActor, 'no furnace is sent against it');
    same(worldOf(app.duel).definition.wreck, FIELD_BATTLE.wreck, 'but the dead furnace lies by the road, as a wreck for the scene to draw');
    check(app.gasRun('long') && !worldOf(app.duel).definition.wreck, 'the long road shows no wreck');
    app.dispose?.();
  }
  {
    const off = yard({on: ['story-everburn'], extra: {feud: 4}});
    check(!/BATTLE|GAS RUN/.test(wallOf(off)) && off.gasRun('boneyard') === false, 'with the runs switch off there is no battle and no run');
    off.dispose?.();
  }

  // Playing a battle through in the App with a scripted car. `breaks` is how many doors the scripted player breaks.
  function playBattle(app, breaks) {
    const duel = app.duel, lines = [];
    const callout = duel._callout.bind(duel); duel._callout = (text, seconds) => { lines.push(String(text)); return callout(text, seconds); };
    let broken = 0;
    for (let tick = 0; tick < 900 * 120 && duel.state.status !== 'arena_result'; tick++) {
      duel.setInput(duel.state.status === 'racing' ? idle : {...idle, brake: 0});
      const hunter = worldOf(duel).actors.find(actor => actor.furnace);
      if (hunter && broken < breaks && hunter.furnace.phase === 'glow') { hitDoor(duel); broken++; }
      duel.step(1 / 120);
    }
    return {lines, result: duel.state.arena.result};
  }

  // Ending one: the furnace is dead when Big Bess arrives. The battle is won.
  {
    const app = yard({extra: {feud: 4, runs: 5}}), scrap = app.profile.wasteland.scrap, before = JSON.stringify(app.profile.story.ember);
    check(app.gasRun('boneyard') && worldOf(app.duel).definition.battle === true, 'the Boneyard button at War party starts the battle');
    const {lines, result} = playBattle(app, 3);
    check(worldOf(app.duel).battleEnding === 'won' && result.winnerId === 'player' && result.won === true, 'ending one: the furnace dead when Big Bess arrives is a win');
    same(result.settlementSaved, true, 'it settles');
    same(result.scrapEarned, 384, 'it pays four shares (384 on Medium)');
    same(app.profile.wasteland.scrap - scrap, 384, 'and the scrap is in the save');
    same([emberFeud(app.profile), emberRuns(app.profile), emberFurnaceDead(app.profile)], [1, 6, true], 'the feud is Watching, one run is counted and the furnace is dead for good');
    same(app.profile.story.ember.jobs, EMBER_JOBS.slice(), 'the six jobs are as they were');
    same(result.gasRun, {road: 'boneyard', feud: 1, word: 'Watching', runs: 6, reachedWarParty: false, battle: 'won'}, 'the result says where it stands and that the battle was won');
    check(lines.includes('Auntie Solder: No more toll on the Boneyard road. Tin Town owes you a supper.') && !lines.some(text => text.includes('That thing will be back')), 'Auntie Solder says there is no more toll');
    check(lines.includes('Cinder: That is the last of his fire, and it went out on a road. Bring the gas home.'), 'and Cinder said the furnace had died');
    const screen = arenaResultsScreen(app.duel.state, {metric, action, escapeHTML: String});
    same(screen.description, EMBER_BATTLE_RESULTS.won, 'the result screen says in one sentence which ending it was');
    check(screen.description === 'The furnace has stopped for good on the Boneyard road, and Big Bess is in Tin Town.', 'the furnace has stopped for good');
    check(screen.metrics.includes('THE ASH MEN:WATCHING') && screen.metrics.includes('GAS RUNS:6') && screen.metrics.includes('SCRAP EARNED'), 'with the Ash Men and the runs');
    check(screen.actions.includes('DRIVE ANOTHER RUN'), 'and another run offered');
    const paid = app.profile.wasteland.scrap;
    check(app._settleArenaResult({result}, app.duel.state) === false && app.profile.wasteland.scrap === paid && emberRuns(app.profile) === 6, 'a second settle changes nothing');
    check(JSON.stringify(app.profile.story.ember) !== before, 'the save did change');
    // Afterwards: no battle until the feud climbs back; the next Boneyard run is the ordinary one with the wreck.
    check(!wallOf(app).includes('THE BATTLE'), 'the wall no longer offers the battle');
    app.dispose?.();
  }
  {
    // The battle does not come again at War party once won: the riders come without the furnace; the wreck shows.
    const app = yard({extra: {feud: 3, runs: 6, furnaceDead: true}});
    check(app.gasRun('boneyard'), 'a Boneyard run from Hunting');
    const {result} = playBattle(app, 0);
    same(result.gasRun?.reachedWarParty, true, 'it reaches War party');
    same([emberFeud(app.profile), emberFurnaceDead(app.profile)], [4, true], 'and the furnace is still dead');
    check(app.gasRun('boneyard') && worldOf(app.duel).definition.id === 'gas-run-boneyard' && worldOf(app.duel).definition.wreck, 'the next Boneyard run is an ordinary War party run with the wreck, not the battle');
    app.dispose?.();
  }

  // Ending two: Big Bess arrives with the furnace still rolling. The gas is home; the battle is not won.
  {
    const app = yard({extra: {feud: 4, runs: 5}}), scrap = app.profile.wasteland.scrap;
    check(app.gasRun('boneyard'), 'the battle starts');
    const {lines, result} = playBattle(app, 0);
    check(worldOf(app.duel).battleEnding === 'arrived' && result.winnerId === 'player' && result.won === true, 'ending two: Big Bess arrives with the furnace rolling');
    same(result.scrapEarned, 192, 'the gas is home: the Boneyard road\'s own two shares (192 on Medium)');
    same(app.profile.wasteland.scrap - scrap, 192, 'and the scrap is in the save');
    same([emberFeud(app.profile), emberRuns(app.profile), emberFurnaceDead(app.profile)], [4, 6, false], 'the feud stays at War party, one run is counted and the furnace lives');
    check(!Object.hasOwn(emberOf(app.profile), 'furnaceDead'), 'no furnaceDead is written');
    same(result.gasRun, {road: 'boneyard', feud: 4, word: 'War party', runs: 6, reachedWarParty: false, battle: 'arrived'}, 'the result says it is still War party');
    check(lines.includes('Auntie Solder: The gas is in and the gate is shut. That thing will be back. Next time, finish it.') && !lines.some(text => text.includes('No more toll')), 'Auntie Solder says it will be back');
    const screen = arenaResultsScreen(app.duel.state, {metric, action, escapeHTML: String});
    same(screen.description, EMBER_BATTLE_RESULTS.arrived, 'the result screen says which ending it was');
    check(screen.description === 'Big Bess is in Tin Town, but the furnace is still rolling and will be back on the next Boneyard run.', 'in one sentence');
    check(wallOf(app).includes(EMBER_BATTLE_SENTENCE) && boneyardButton(wallOf(app))[1] === 'BONEYARD ROAD: THE BATTLE', 'and the wall offers the battle again');
    check(app.gasRun('boneyard') && worldOf(app.duel).definition.battle === true, 'the furnace is back on the next Boneyard run');
    app.dispose?.();
  }
  {
    // A battle in which only one or two doors broke before she arrived is still ending two.
    const app = yard({extra: {feud: 4, runs: 1}});
    check(app.gasRun('boneyard'));
    const {result} = playBattle(app, 2);
    same([worldOf(app.duel).battleEnding, result.scrapEarned, emberFeud(app.profile), emberFurnaceDead(app.profile)], ['arrived', 192, 4, false], 'two doors broken is not the battle won');
    app.dispose?.();
  }

  {
    // The furnace burns its coal: Big Bess rests three times (the test takes her health to 0 each time), the furnace is spent, throws no more cinders
    // and begins no more doors, and she arrives with it still rolling: ending two, with its save and its pay.
    const app = yard({extra: {feud: 4, runs: 5}}), scrap = app.profile.wasteland.scrap, duel = app.duel;
    check(app.gasRun('boneyard') && worldOf(duel).definition.battle === true, 'the battle starts');
    let forced = 0, nextKill = 0, spentAt = null, burningAfter = 0, stokeAfter = 0, restsSeen = 0, spentEarly = 0;
    const lines = [], callout = duel._callout.bind(duel); duel._callout = (text, seconds) => { lines.push(String(text)); return callout(text, seconds); };
    for (let tick = 0; tick < 900 * 120 && duel.state.status !== 'arena_result'; tick++) {
      duel.setInput(duel.state.status === 'racing' ? idle : {...idle, brake: 0});
      const hunter = worldOf(duel).actors.find(actor => actor.furnace), bess = bessOf(duel);
      if (hunter && forced < 3 && bess && bess.health > 0 && worldOf(duel).job.stepState.rested !== true && duel.state.stageTimeSec >= nextKill) { bess.health = 0; forced++; nextKill = duel.state.stageTimeSec + 12; }
      duel.step(1 / 120);
      if (worldOf(duel).job.events.some(event => event.type === 'rest')) restsSeen++;
      const f = furnaceOf(duel)?.furnace;
      if (f) {
        if (f.spent && f.rests < 3) spentEarly++;
        if (f.spent && spentAt === null) spentAt = duel.state.stageTimeSec;
        if (spentAt !== null && f.burning) burningAfter++;
        if (spentAt !== null && f.phase === 'stoke' && f.phaseSec < .1 && f.hits === 0) stokeAfter++;
      }
    }
    const result = duel.state.arena.result, f = furnaceOf(duel).furnace;
    check(restsSeen >= 3 && forced === 3, 'Big Bess rested three times');
    same([spentEarly, f.spent, f.rests >= 3], [0, true, true], 'the furnace was not spent before the third rest and is spent after it');
    same([burningAfter, stokeAfter], [0, 0], 'no cinders land and no door begins to stoke once it is spent');
    check(f.hits === 0 && !f.dead, 'with no door broken it is still rolling');
    check(worldOf(duel).battleEnding === 'arrived' && result.winnerId === 'player' && result.won === true, 'the battle ends as arrived: the gas is home');
    same(result.scrapEarned, 192, 'with the arrived pay, the Boneyard road own two shares (192 on Medium)');
    same(app.profile.wasteland.scrap - scrap, 192, 'and the scrap is in the save');
    same([emberFeud(app.profile), emberRuns(app.profile), emberFurnaceDead(app.profile)], [4, 6, false], 'the feud stays at War party, one run is counted and the furnace lives');
    check(!Object.hasOwn(emberOf(app.profile), 'furnaceDead'), 'no furnaceDead is written');
    same(result.gasRun, {road: 'boneyard', feud: 4, word: 'War party', runs: 6, reachedWarParty: false, battle: 'arrived'}, 'the result says it is still War party');
    check(lines.includes('Auntie Solder: The gas is in and the gate is shut. That thing will be back. Next time, finish it.'), 'Auntie Solder says it will be back');
    app.dispose?.();
  }

  // Ending three: a rest is not the end; leaving or failing writes nothing.
  for (const [label, reason, winner] of [['failing', 'job-failed', 'raiders'], ['leaving', 'job-quit', 'raiders']]) {
    const app = yard({extra: {feud: 4, runs: 5}}), before = JSON.stringify(app.profile.story), scrap = app.profile.wasteland.scrap;
    check(app.gasRun('boneyard'), `${label}: starts`);
    finishArenaEvent(app.duel, reason, winner);
    const result = app.duel.state.arena.result;
    check(!result.gasRun && result.won !== true, `${label}: no run arrived`);
    same(JSON.stringify(app.profile.story), before, `${label}: the whole story save is untouched`);
    same(app.profile.wasteland.scrap, scrap, `${label}: and nothing is paid`);
    same([emberFeud(app.profile), emberRuns(app.profile), emberFurnaceDead(app.profile)], [4, 5, false], `${label}: still War party, 5 runs, furnace alive`);
    const screen = arenaResultsScreen(app.duel.state, {metric, action, escapeHTML: String});
    check(/world-job-retry/.test(screen.actions), `${label}: offers the battle again`);
    app.dispose?.();
  }
  {
    // The save with a damaged furnaceDead reads as false: the battle is offered.
    const app = yard({extra: {feud: 4, furnaceDead: 'yes'}});
    check(wallOf(app).includes(EMBER_BATTLE_SENTENCE) && app.gasRun('boneyard') && worldOf(app.duel).definition.battle === true, 'a damaged furnaceDead reads as false: the battle is offered');
    app.dispose?.();
  }
}

console.log(`test-field-battle: ${checks} checks passed`);
