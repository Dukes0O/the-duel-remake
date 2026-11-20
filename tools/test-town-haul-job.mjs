// TOWN-HAUL-JOB: the town's first drive, from the mission card to the town's pile (docs/board/cards/TOWN-HAUL-JOB.md).
// The rules are proved without driving: the stack, the knock and the rattle, the unload, the one mission result per run id,
// a town saved before this card, a save round trip, the town's clock and radio during the drive, and every player-facing
// line. One scripted drive shows the job can be finished: a child-pace driver on Easy wins it at least 8 times in 10.
import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {Duel} from '../src/game.js';
import {createTown, serializeTown, deserializeTown} from '../src/town/town-state.js';
import {stepTown, raiseTownReport, dispatchTownCommand} from '../src/town/index.js';
import {stockpileAt} from '../src/town/town-goods.js';
import {getTownNext} from '../src/town/town-chapters.js';
import {TOWN_CAPTIONS} from '../src/town/content/lines.js';
import {createTownMissionClock, townMissionResult, townMissionDropCell, TOWN_MISSION_SETTLED_LIMIT} from '../src/town/town-missions.js';
import {townMissionCardMarkup, townMissionCardModel, TOWN_MISSION_CARD_FACTS} from '../src/town/ui/town-mission-card.js';
import {createTownJobRun, openTownJobs, townJobDefinition, townJobResult} from '../src/world/jobs/town-jobs.js';
import {HAUL_RULE, haulKnockFreeKmh, haulKnockKg, haulLine, haulPileOrder, haulRattle, haulSentence, stepHaul} from '../src/world/jobs/steps/haul.js';
import {createJob, stepJob} from '../src/world/jobs/job-engine.js';
import {setScablandsTownLayout, clearScablandsTownLayout} from '../src/world/scablands-ground.js';
import {cleanupWorldJobLoan} from '../src/arena/modes/world-job.js';
import {routeFor, nearestOnLine} from '../src/world/scablands-ways.js';
import {wrapHeading} from '../src/offroad-physics.js';
import {makeRng} from '../src/rng.js';
import {SOUND_BANK} from '../src/sound-bank.js';

const dt = 1 / 120;
const chapterTown = (seed = 77) => {
  const town = createTown(seed, 'Haul test');
  town.story = {facts:{pitsDug:true, wellBuilt:true}, completed:{'town.act1.twelve':true, 'town.act1.water':true}};
  return town;
};
const haulStep = (seed = 5) => townJobDefinition(chapterTown(), 'town-haul-salvage', {seed}).steps[0];
const at = place => ({x:place.position.x, z:place.position.z});
const view = (position, extra = {}) => ({player:{position}, speedKmh:0, hitKmh:0, difficulty:'medium', onFoot:false, ...extra});

// Run a haul step with synthetic views (no physics): stand at a place for some seconds, or drive at a speed.
function run(step, state, seconds, viewFor) {
  let current = state, events = [];
  for (let t = 0; t < seconds; t += .1) {
    const outcome = stepHaul(step, current, viewFor(t), .1, 5);
    current = outcome.state; events = events.concat(outcome.events);
    if (outcome.complete) return {state:current, events, complete:true};
  }
  return {state:current, events, complete:false};
}

test('the stack is the choice: each tonne on the bed lowers the knock it takes to throw a piece off', () => {
  assert.ok(haulKnockFreeKmh(9000) < haulKnockFreeKmh(4000) && haulKnockFreeKmh(4000) < haulKnockFreeKmh(0));
  assert.ok(haulKnockFreeKmh(9000, 'easy') > haulKnockFreeKmh(9000), 'Easy needs a harder knock');
  assert.equal(haulKnockKg(6000, haulKnockFreeKmh(6000) - 1), 0, 'below the limit nothing comes off');
  assert.ok(haulKnockKg(6000, haulKnockFreeKmh(6000) + 10) > 0);
  assert.ok(haulKnockKg(6000, 60, 'easy') < haulKnockKg(6000, 60), 'Easy loses less in the same knock');
  // Braking hard in the flatbed sheds well under a km/h in a step (120 steps a second); it never throws a piece off.
  assert.equal(haulKnockKg(9000, 1), 0);
  assert.equal(haulRattle({roughness:.05, kmh:80, dt:1}), 0, 'a road never rattles the load');
  assert.ok(haulRattle({roughness:.55, kmh:36, loadKg:9000, dt:1}) > haulRattle({roughness:.55, kmh:20, loadKg:9000, dt:1}),
    'the scab plates rattle a fast truck more than a slow one');
  assert.deepEqual(haulPileOrder(haulStep(), 9), haulPileOrder(haulStep(), 9), 'the pile is repeatable from the seed');
});

test('load at the pile, carry, lose pieces to a knock and to rough ground, unload: what was loaded is delivered or lost', () => {
  const step = haulStep(), pile = at(step.pile), drop = at(step.drop);
  let result = run(step, {}, 1, () => view(pile));
  assert.equal(result.state.phase, 'loading');
  result = run(step, result.state, 20, () => view(pile));
  const lifted = result.events.filter(event => event.type === 'haulLift');
  assert.ok(lifted.length >= 6 && lifted.length <= 7, `one piece each ${HAUL_RULE.liftSeconds} s (${lifted.length})`);
  const loadedKg = result.state.loadKg;
  assert.equal(loadedKg, result.state.load.reduce((sum, piece) => sum + piece.kg, 0));
  // Drive off: the haul sets off with what is on the bed.
  result = run(step, result.state, .3, () => view({x:pile.x + 30, z:pile.z}, {speedKmh:20}));
  assert.equal(result.state.phase, 'carry');
  assert.ok(result.events.some(event => event.type === 'haulSetOff'));
  // A hard knock (a wreck at speed) throws the top piece off, and the event says what and how much.
  const top = result.state.load.at(-1);
  const knocked = stepHaul(step, result.state, view({x:2000, z:1200}, {speedKmh:5, hitKmh:45}), dt, 5);
  const shed = knocked.events.find(event => event.type === 'haulShed');
  assert.equal(shed.cause, 'knock');
  assert.equal(shed.pieces[0], top.name);
  assert.ok(knocked.requests.some(request => request.type === 'say' && request.lineId === 'town.haul.shed'), 'Odessa says so the first time');
  // Rough ground taken fast rattles a piece loose.
  result = run(step, knocked.state, 120, () => view({x:2500, z:1400}, {speedKmh:36, roughness:.55}));
  assert.ok(result.events.some(event => event.type === 'haulShed' && event.cause === 'rough'));
  // Stop at the drop and hold still: every piece left comes off, then the job is done once.
  result = run(step, result.state, 2, () => view(drop));
  assert.equal(result.state.phase, 'unloading');
  result = run(step, result.state, 60, () => view(drop));
  assert.equal(result.complete, true);
  const delivered = result.events.filter(event => event.type === 'haulDelivered');
  assert.equal(delivered.length, 1);
  assert.equal(delivered[0].deliveredKg + delivered[0].lostKg, loadedKg, 'every kilogram loaded is delivered or lost');
  assert.match(delivered[0].sentence, /^You brought home [\d,]+ kg of salvage\. [\d,]+ kg fell off on the way and is lost\.$/);
  // Seen again (the closing line holds the job), it does not report twice.
  const again = stepHaul(step, result.state, view(drop), dt, 5);
  assert.equal(again.complete, true);
  assert.equal(again.events.some(event => event.type === 'haulDelivered'), false);
});

test('a bed that empties sends the truck back to the pile, and the pile stops when the bed is full', () => {
  const step = haulStep(), pile = at(step.pile);
  let result = run(step, {}, 1, () => view(pile));
  result = run(step, result.state, 4, () => view(pile));
  result = run(step, result.state, .3, () => view({x:pile.x + 30, z:pile.z}, {speedKmh:20}));
  const fall = stepHaul(step, result.state, view({x:2000, z:1200}, {severeHit:true, speedKmh:30}), dt, 5);
  assert.equal(fall.events.find(event => event.type === 'haulShed').cause, 'fall');
  let state = fall.state;
  for (let i = 0; i < 10 && state.phase === 'carry'; i++) state = stepHaul(step, state, view({x:2000, z:1200}, {hitKmh:90}), dt, 5).state;
  assert.equal(state.phase, 'out');
  assert.equal(state.loadKg, 0);
  result = run(step, state, 300, () => view(pile));
  assert.equal(result.state.full, true);
  assert.ok(result.state.loadKg <= 9000 && result.state.loadKg > 7000, `full is near the flatbed's 9,000 kg (${result.state.loadKg})`);
  assert.ok(result.events.some(event => event.type === 'haulFull'));
});

test('the washout is named before it is reached, holds the stack at a crawl, and shakes pieces off at speed', () => {
  const step = haulStep(), pile = at(step.pile), [a, b] = step.washouts[0].line;
  assert.ok(Math.hypot(pile.x, pile.z + 112) < 2600, 'Chapter 3\'s first pile is at the halfway camp, about 2.5 km out');
  const along = (share, side = 0) => ({x:a.x + (b.x - a.x) * share + side, z:a.z + (b.z - a.z) * share});
  const loaded = () => {
    let result = run(step, {}, 1, () => view(pile));
    result = run(step, result.state, 30, () => view(pile));
    return run(step, result.state, .3, () => view({x:pile.x + 40, z:pile.z}, {speedKmh:20})).state;
  };
  // Coming home, the truck is 250 m short of the washout's far (camp) end.
  const dx = b.x - a.x, dz = b.z - a.z, length = Math.hypot(dx, dz);
  const ahead = {x:b.x + dx / length * 250, z:b.z + dz / length * 250};
  const warned = stepHaul(step, loaded(), view(ahead, {speedKmh:40}), dt, 5);
  assert.ok(warned.events.some(event => event.type === 'haulWashoutAhead'));
  assert.ok(warned.requests.some(request => request.lineId === 'town.haul.washout'), 'Odessa names it');
  assert.match(haulLine(step, warned.state), /^Washed-out road ahead\./);
  assert.equal(stepHaul(step, warned.state, view(ahead, {speedKmh:40}), dt, 5).events.some(event => event.type === 'haulWashoutAhead'), false,
    'named once a trip');
  const cross = kmh => {
    let state = warned.state, shed = 0;
    for (let metres = 0; metres <= 200; metres += kmh / 3.6 * .1) {
      const out = stepHaul(step, state, view(along(1 - metres / 200), {speedKmh:kmh}), .1, 5);
      state = out.state; shed += out.events.filter(event => event.type === 'haulShed').length;
    }
    return {shed, line:haulLine(step, state)};
  };
  assert.equal(cross(10).shed, 0, 'at a crawl the stack holds');
  assert.ok(cross(40).shed >= 2, `at 40 km/h pieces shake off (${cross(40).shed})`);
  assert.equal(stepHaul(step, loaded(), view(along(.5, 400), {speedKmh:40}), dt, 5).state.washout, null, 'round it, over the flats, is clear of it');
});

test('the job engine runs the haul step, and the town jobs open from the town', () => {
  assert.doesNotThrow(() => createJob(townJobDefinition(chapterTown(), 'town-haul-salvage')));
  const fresh = createTown(3, 'No well yet');
  assert.deepEqual(openTownJobs(fresh), [], 'nothing opens before the well (Chapter 3 follows Chapter 2)');
  assert.equal(townJobDefinition(fresh, 'town-haul-salvage'), null);
  assert.deepEqual(openTownJobs(chapterTown()).map(job => job.id), ['town-haul-salvage']);
  const done = chapterTown(); done.story.completed['town.act1.salvage'] = true;
  assert.deepEqual(openTownJobs(done).map(job => job.id), ['town-salvage-run'], 'after Chapter 3 the same drive repeats');
  raiseTownReport(done, 'site-stopped', {siteStopped:true, where:'Water tower', detail:'Work stopped. It needs 800 more steel.'});
  done.reports.at(-1).shortage = {type:'get-ingredient', good:'steel', amount:800};
  assert.deepEqual(openTownJobs(done).map(job => job.id), ['town-steel-run', 'town-salvage-run']);
  const steel = townJobDefinition(done, 'town-steel-run');
  assert.equal(steel.steps[0].good, 'steel');
  assert.equal(steel.vehicle, 'flatbed');
  // A finished job's result is the one thing handed to the town.
  const job = {...createJob(townJobDefinition(chapterTown(), 'town-haul-salvage')), done:true};
  assert.equal(townJobResult({definition:townJobDefinition(chapterTown(), 'town-haul-salvage'), job}, 'run-1'), null, 'no haul, no result');
});

test('a mission result is applied exactly once per run id, and only a clear one', () => {
  const town = chapterTown(), cell = townMissionDropCell(town);
  const result = {runId:'run-a', jobId:'town-haul-salvage', kind:'haul', good:'salvage', deliveredKg:5200, lostKg:700, chapter:'town.act1.salvage'};
  const first = townMissionResult(town, result);
  assert.equal(first.settled, true);
  assert.equal(stockpileAt(town, cell).salvage, 5200, 'real kilograms on the town pile');
  for (let i = 0; i < 3; i++) assert.equal(townMissionResult(town, result).settled, false, 'the same run never adds twice');
  assert.equal(stockpileAt(town, cell).salvage, 5200);
  assert.equal(town.story.facts.salvageDelivered, true);
  assert.equal(town.story.completed['town.act1.salvage'], true);
  assert.equal(getTownNext(town).chapter?.id, 'town.act1.soup', 'Chapter 4 is next');
  assert.equal(townMissionResult(town, {...result, runId:'run-b', chapter:null, jobId:'town-salvage-run', deliveredKg:3000}).settled, true);
  assert.equal(stockpileAt(town, cell).salvage, 8200);
  // A run that unloaded part, lost the rest and loaded again can bring home more than one 9,000 kg bedful.
  assert.equal(townMissionResult(town, {...result, runId:'run-twice', chapter:null, jobId:'town-salvage-run', deliveredKg:11_000}).settled, true);
  assert.equal(stockpileAt(town, cell).salvage, 19_200);
  for (const bad of [{deliveredKg:100_001}, {lostKg:100_001}, {deliveredKg:-1}, {deliveredKg:1.5}, {good:'gold'}, {kind:'fight'}, {runId:''}, {chapter:'town.act1.fire'}])
    assert.equal(townMissionResult(town, {...result, runId:'run-bad', ...bad}).ok, false, JSON.stringify(bad));
  assert.equal(stockpileAt(town, cell).salvage, 19_200, 'a refused result changes nothing');
  assert.equal(dispatchTownCommand(town, {type:'townMissionResult', ...result, runId:'forged'}).ok, false,
    'a result is not an ordinary town command');
  // The settled list is bounded, and the newest ids are the ones kept.
  for (let i = 0; i < TOWN_MISSION_SETTLED_LIMIT + 5; i++) townMissionResult(town, {...result, runId:`bulk-${i}`, chapter:null, deliveredKg:0});
  assert.equal(town.missions.settled.length, TOWN_MISSION_SETTLED_LIMIT);
  assert.equal(townMissionResult(town, {...result, runId:`bulk-${TOWN_MISSION_SETTLED_LIMIT + 4}`}).settled, false);
});

test('a town saved before this card loads unchanged, and a save round trip keeps the pile and the settled runs', () => {
  const fixture = readFileSync(new URL('./fixtures/town/town-v1.json', import.meta.url), 'utf8');
  const old = deserializeTown(fixture);
  assert.equal(Object.hasOwn(old, 'missions'), false, 'loading adds nothing');
  const before = serializeTown(old);
  openTownJobs(old); townMissionCardModel(old); townJobDefinition(old, 'town-haul-salvage');
  assert.equal(serializeTown(old), before, 'reading the jobs and the card writes nothing');
  assert.equal(serializeTown(deserializeTown(before)), before, 'and it saves back the same');
  const town = chapterTown();
  for (let i = 0; i < 30; i++) stepTown(town);
  townMissionResult(town, {runId:'run-save', jobId:'town-haul-salvage', kind:'haul', good:'salvage', deliveredKg:4100, lostKg:0, chapter:'town.act1.salvage'});
  const loaded = deserializeTown(serializeTown(town));
  assert.deepEqual(loaded, town);
  assert.equal(stockpileAt(loaded, townMissionDropCell(loaded)).salvage, 4100);
  assert.equal(townMissionResult(loaded, {runId:'run-save', jobId:'town-haul-salvage', kind:'haul', good:'salvage', deliveredKg:4100, lostKg:0}).settled, false,
    'a result already settled before the save is still settled after it');
});

test('during the drive the town ticks once every 10 real seconds, and serious news comes on the radio at most once a minute', async () => {
  const town = chapterTown();
  let steps = 0;
  const step = target => {
    stepTown(target); steps++;
    if (steps === 2 || steps === 3) raiseTownReport(target, steps === 2 ? 'dust-storm' : 'drought-warning', steps === 2 ? {dustStorm:true} : {droughtWarning:true});
    if (steps === 4) raiseTownReport(target, 'trader-deal', {traderDeal:true});
  };
  const clock = createTownMissionClock(town, {step});
  const said = [];
  for (let second = 0; second < 180; second++) {
    const out = clock.advance(1);
    if (out.radio) said.push({second, ...out.radio});
  }
  assert.equal(clock.ticks, 18, 'one game hour each 10 real seconds');
  assert.deepEqual(said.map(row => row.report), ['A dust storm is moving across town.', 'The wells are running low.'], 'only serious news, in order');
  assert.ok(said[1].second - said[0].second >= 60, 'a minute at least between radio news');
  assert.equal(said[0].lineId, 'town.radio.report');
  // The run: ticks while driven, settles once and saves once.
  let saves = 0;
  const runner = createTownJobRun({town, runId:'run-clock', save:async () => { saves++; return true; }});
  runner.frame(25);
  assert.equal(runner.ticks, 2);
  const definition = townJobDefinition(town, 'town-haul-salvage');
  const worldJob = {definition, job:{done:true}, haulResult:{good:'salvage', deliveredKg:3000, lostKg:450}};
  const [a, b] = await Promise.all([runner.settle(worldJob), runner.settle(worldJob)]);
  assert.deepEqual(a, b);
  assert.equal(a.settled, true);
  assert.equal(a.saved, true);
  assert.equal(saves, 1, 'a second settle does not save again');
  // A save that fails is tried again on the next settle; the result is still applied only once.
  const failing = chapterTown();
  let tries = 0;
  const flaky = createTownJobRun({town:failing, runId:'run-flaky', save:async () => { tries++; if (tries === 1) throw new Error('Town storage is busy.'); return true; }});
  const first = await flaky.settle(worldJob);
  assert.equal(first.saved, false);
  const second = await flaky.settle(worldJob);
  assert.equal(second.saved, true);
  assert.equal(tries, 2);
  assert.equal(stockpileAt(failing, townMissionDropCell(failing)).salvage, 3000, 'applied once across both settles');
});

test('every line on the mission card and the radio is a plain whole sentence, and every haul event names its sound cue', () => {
  const ids = Object.keys(TOWN_CAPTIONS).filter(id => /^town\.(haul|steel|radio)\./.test(id) || ['town.3.nothing', 'town.3.load', 'town.3.won'].includes(id));
  assert.ok(ids.length >= 16);
  const card = townMissionCardModel(chapterTown());
  const lines = [...ids.map(id => TOWN_CAPTIONS[id].text.replace('{report}', 'A fire has started.')), card.line, ...card.facts, card.later,
    ...TOWN_MISSION_CARD_FACTS.steel, haulSentence({good:'salvage'}, 4200, 0), haulSentence({good:'steel'}, 6300, 630)];
  for (const line of lines) {
    assert.ok(line.length <= 260, line);
    assert.doesNotMatch(line, /—|–| - /, `no dashes: ${line}`);
    assert.match(line, /^[A-Z0-9"'].*[.?!]$/, `a whole sentence: ${line}`);
  }
  assert.match(townMissionCardMarkup(card), /GO YOURSELF/);
  assert.match(townMissionCardMarkup(card), /NOT NOW/);
  const visiting = townMissionCardMarkup(townMissionCardModel(chapterTown(), {readOnly:true}));
  assert.doesNotMatch(visiting, /GO YOURSELF/);
  assert.match(visiting, /data-town-mission-later/, 'a visitor can close the card');
  for (const cue of ['world.bellows.load', 'vehicle.crush', 'interface.bonus']) assert.ok(SOUND_BANK[cue], cue);
});

// ---- The one scripted drive --------------------------------------------------------------------------------------------
// A child's pace: about 40 km/h on the road, slowing well before the stops, steering late (a fifth of a second) and a little
// unevenly, and loading a different amount each time. A win is a job that ends with salvage on the town's pile.
function childDrive(seed) {
  const rng = makeRng(seed * 977 + 13), town = chapterTown(seed), definition = townJobDefinition(town, 'town-haul-salvage', {seed});
  const step = definition.steps[0];
  const duel = new Duel({seed:1989 + seed, featureFlags:{'wasteland-town':true}});
  duel.state.wastelandGateDiscovered = true;
  setScablandsTownLayout(definition.layout);
  try {
    assert.equal(duel.startArenaEvent({venueId:'scablands', mode:'world-job', job:definition}), true);
    duel.state.cpuDifficulty = 'easy';
    while (duel.state.status === 'countdown') duel.step(dt);
    const pose = () => { const s = duel.state, p = duel.course.worldAt(s.s, s.lateral); return {x:p.x, z:p.z, heading:duel.course.at(s.s).heading + s.headingError}; };
    const steerSign = -1;
    // A careful child slows for the washout when the screen line names it, some a little less than others.
    const wantKg = 3500 + rng.int(0, 5500), cruise = 36 + rng.int(0, 10), wobble = .1 + rng.float() * .15, crawl = 8 + rng.int(0, 6);
    const outWay = routeFor([{road:'east-road', until:'safe-road'}], {start:pose(), destination:step.pile.position});
    let setOffAt = null, deliveredAt = null;
    let path = outWay, goal = step.pile.position, heard = [], late = [];
    let lastSteer = 0;
    for (let t = 0; t < 1500; t += dt) {
      const worldJob = duel.state.arena.worldJob, state = worldJob.job.stepState;
      if (duel.state.status !== 'racing') break;
      if (state.phase === 'carry' && goal !== step.drop.position) {
        goal = step.drop.position;
        setOffAt ??= duel.state.stageTimeSec;
        path = [...routeFor([{road:'east-road', until:'safe-road'}], {start:pose(), destination:{x:26, z:15}}),
          {x:20, z:-30}, {...goal}];
      }
      if (state.phase === 'out' && goal !== step.pile.position) { goal = step.pile.position; path = [...outWay].reverse().slice(0, 1).concat(outWay); }
      const p = pose();
      late.push(p); if (late.length > 24) late.shift();
      const seen = late[0];
      const near = nearestOnLine(path, seen.x, seen.z);
      let ahead = near.along + 22, sum = 0, target = path.at(-1);
      for (let i = 0; i + 1 < path.length; i++) {
        const a = path[i], b = path[i + 1], span = Math.hypot(b.x - a.x, b.z - a.z);
        if (sum + span >= ahead) { const k = (ahead - sum) / span; target = {x:a.x + (b.x - a.x) * k, z:a.z + (b.z - a.z) * k}; break; }
        sum += span;
      }
      const error = wrapHeading(Math.atan2(target.x - seen.x, target.z - seen.z) - seen.heading);
      // Signed: the brake held at a stand reverses the truck, so a driver lets it go once stopped.
      const distance = Math.hypot(goal.x - p.x, goal.z - p.z), kmh = duel.state.speedMph * 1.609344;
      const loading = state.phase === 'loading' && state.loadKg < wantKg && !state.full;
      const unloading = state.phase === 'unloading';
      // The child keeps going until the broken road is close, then crawls over it.
      const toWashout = Math.min(...step.washouts.flatMap(washout => washout.line.map(end => Math.hypot(end.x - p.x, end.z - p.z))));
      const careful = state.washout === 'inside' || state.washout === 'ahead' && toWashout < 40 ? crawl : cruise;
      const speed = loading || unloading ? 0 : state.phase === 'loading' ? cruise : Math.min(careful, distance < 7 ? 0 : Math.max(6, distance * .45));
      if (unloading) deliveredAt ??= duel.state.stageTimeSec;
      if (Math.round(t / dt) % 30 === 0) lastSteer = steerSign * error * 2 + (rng.float() - .5) * wobble;
      duel.setInput({throttle:kmh < speed - 2 ? 1 : 0, brake:kmh > speed + 3 || speed === 0 && kmh > .3 ? 1 : 0,
        steer:Math.max(-1, Math.min(1, lastSteer)), boost:false});
      duel.step(dt);
      heard.push(...worldJob.job.events.map(event => event.type));
    }
    const worldJob = duel.state.arena.worldJob;
    const won = duel.state.arena.result?.winnerId === 'player' && worldJob.haulResult?.deliveredKg > 0;
    return {won, result:worldJob.haulResult, seconds:duel.state.stageTimeSec, outSeconds:setOffAt, homeSeconds:deliveredAt - setOffAt, heard, town, runResult:won ? townJobResult(worldJob, `drive-${seed}`) : null,
      massRose:worldJob.vehicle.massKg};
  } finally { cleanupWorldJobLoan(duel); clearScablandsTownLayout(); }
}

test('a child-pace driver on Easy finishes the haul at least 8 times in 10, and the town gets what reached it', () => {
  const drives = Array.from({length:10}, (_, index) => childDrive(index + 1));
  const wins = drives.filter(drive => drive.won).length;
  const minutes = values => values.map(value => (value / 60).toFixed(1)).join(', ');
  console.log(`minutes out to the camp and loaded: ${minutes(drives.map(drive => drive.outSeconds))}; home to the drop: ${minutes(drives.map(drive => drive.homeSeconds))}`);
  // The first haul is short: each way under 6 minutes at a child's pace, loading and the crawl over the washout included (the
  // Boneyard run is about 9 minutes each way).
  for (const drive of drives.filter(row => row.won)) {
    assert.ok(drive.outSeconds < 6 * 60, `out to the camp and loaded in ${(drive.outSeconds / 60).toFixed(1)} minutes`);
    assert.ok(drive.homeSeconds < 6 * 60, `home in ${(drive.homeSeconds / 60).toFixed(1)} minutes`);
  }
  assert.ok(drives.some(drive => drive.heard.includes('haulWashoutAhead')), 'the washout is named on the way home');
  console.log(`child-pace haul on Easy: ${wins} of 10. Delivered ${drives.map(drive => drive.result?.deliveredKg ?? 0).join(', ')} kg; lost ${drives.map(drive => drive.result?.lostKg ?? 0).join(', ')} kg.`);
  assert.ok(wins >= 8, `${wins} of 10`);
  const drive = drives.find(row => row.won);
  assert.ok(drive.heard.includes('haulLift') && drive.heard.includes('haulSetOff') && drive.heard.includes('haulUnload'));
  const before = serializeTown(drive.town);
  assert.equal(townMissionResult(drive.town, drive.runResult).settled, true);
  assert.equal(stockpileAt(drive.town, townMissionDropCell(drive.town)).salvage, drive.result.deliveredKg);
  assert.notEqual(serializeTown(drive.town), before);
});

test('the weight on the bed is the truck\'s weight: loaded, it pulls away more slowly', () => {
  const town = chapterTown(), definition = townJobDefinition(town, 'town-haul-salvage');
  const duel = new Duel({seed:1989, featureFlags:{'wasteland-town':true}});
  duel.state.wastelandGateDiscovered = true;
  setScablandsTownLayout(definition.layout);
  try {
    assert.equal(duel.startArenaEvent({venueId:'scablands', mode:'world-job', job:definition}), true);
    while (duel.state.status === 'countdown') duel.step(dt);
    const worldJob = duel.state.arena.worldJob, empty = duel.car.accel;
    worldJob.job = {...worldJob.job, stepState:{...worldJob.job.stepState, phase:'carry', load:[{id:'x', name:'wing rib', kg:6000}]}};
    duel.setInput({throttle:0, brake:1, steer:0, boost:false});
    duel.step(dt);
    assert.ok(worldJob.vehicle.loadKg > 0 || worldJob.job.stepState.loadKg === worldJob.vehicle.loadKg);
    assert.equal(worldJob.vehicle.loadKg, 6000);
    assert.ok(duel.car.accel < empty, 'a loaded flatbed pulls away more slowly');
  } finally { cleanupWorldJobLoan(duel); clearScablandsTownLayout(); }
});
