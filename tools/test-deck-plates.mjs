// SHIPS-DECKS: still plates, ladders and the night storm (docs/story/ships-in-the-sand.md section 6). Headless.
// The four facts on the card: F at a ladder's foot moves the fighter up; a fall keeps the step's place and puts the fighter on the
// ground beside the ship; a plate's height matches the job data; the weather `dust-night` changes no rule and no replay.
import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';
import {Duel} from '../src/game.js';
import {stepArenaEvent} from '../src/arena/arena-event.js';
import {createFighter} from '../src/onfoot.js';
import {createJob, stepJob} from '../src/world/jobs/job-engine.js';
import {DECK_PLATES, DECK_LADDERS, DECK_CUES, deckPlate, groundBeside, insideOutline, plateForPlace, routeToLevel} from '../src/world/deck-plates.js';
import {DUST_NIGHT, dustNightOf, beamHeading} from '../src/world/dust-night.js';

const root = new URL('../', import.meta.url);
const DT = 1 / 120;
const flags = {'wasteland-town': true, 'hidden-road': true, arsenal: true};

// The job data as Claude wrote it (section 5); SHIPS-JOBS copies it into src/world/jobs/ships-in-the-sand.js as it stands.
const page = readFileSync(new URL('docs/story/ships-in-the-sand.md', root), 'utf8');
const block = page.slice(page.indexOf('## 5. The job list, as data')).match(/```js\n([\s\S]*?)```/)[1];
const fromPage = new Function(`${block.replace(/^export /gm, '')}\nreturn {SHIPS_JOBS, SHIPS_SIDE_JOBS};`)();
const jobFile = new URL('src/world/jobs/ships-in-the-sand.js', root);
const jobSets = [['the story page', fromPage.SHIPS_JOBS]];
if (existsSync(jobFile)) jobSets.push(['src/world/jobs/ships-in-the-sand.js', (await import(jobFile.href)).SHIPS_JOBS]);
const jobById = id => fromPage.SHIPS_JOBS.find(job => job.id === id);

// Pure sim files: no DOM, no Three.js, nothing from src/app.js.
for (const file of ['src/world/deck-plates.js', 'src/world/dust-night.js', 'src/world/jobs/steps/onfoot.js']) {
  const source = readFileSync(new URL(file, root), 'utf8');
  const imports = [...source.matchAll(/^import .* from '([^']+)';/gm)].map(match => match[1]);
  assert(imports.every(from => !/three|app\.js|render|view|look|screen/.test(from)), `${file} imports only pure sim: ${imports}`);
  assert(!/\b(document|window)\./.test(source), `${file} touches no DOM`);
}

// 3. Every place on a climbing step stands on a plate of the table at the job data's own height, and every plate is used.
{
  for (const [where, jobs] of jobSets) {
    const used = new Set();
    for (const job of jobs) for (const step of job.steps) {
      if (!step.climbs) continue;
      for (const place of step.places) {
        const found = plateForPlace(place.position);
        assert(found, `${where}: ${place.id} at height ${place.position.y} stands on a plate`);
        assert.equal(found.y, place.position.y, `${where}: ${place.id}'s plate is ${place.position.y} m up, as the job says`);
        used.add(found.id);
      }
    }
    assert.deepEqual([...used].sort(), DECK_PLATES.map(item => item.id).sort(), `${where}: the three decks, the mast top and three landings`);
  }
  assert.equal(DECK_PLATES.length, 7);
  for (const item of DECK_LADDERS) {
    assert(insideOutline(deckPlate(item.to).outline, item.top.x, item.top.z), `${item.id}'s top is on ${item.to}`);
    if (item.from !== 'ground') assert(insideOutline(deckPlate(item.from).outline, item.foot.x, item.foot.z), `${item.id}'s foot is on ${item.from}`);
  }
  // Every place can be reached from the ground by ladders, and every plate has a way back down.
  for (const plate of DECK_PLATES) {
    assert(routeToLevel('ground', plate.id), `${plate.id} can be climbed to from the ground`);
    assert(routeToLevel(plate.id, 'ground'), `${plate.id} has a way down`);
    assert(groundBeside(plate.id), `${plate.id} has ground beside its ship`);
  }
}

// A real job through the real mode: the climbing step of job 2 (Nothing to Report), the fighter on foot at Deck Town.
function startJob(steps, seed = 4242) {
  const duel = new Duel({seed, featureFlags: flags});
  duel.state.wastelandGateDiscovered = true;
  assert.equal(duel.startArenaEvent({venueId: 'scablands', mode: 'world-job', car: 'falcone_f42', seed, cpuDifficulty: 'easy',
    opponents: [], weaponLoadout: ['bomb'], arsenalRank: 9, job: {id: 'ships-decks-test', seed, steps}}), true, 'the job starts in Duel');
  for (let i = 0; i < 600 && duel.state.status !== 'racing'; i++) duel.step(DT);
  assert.equal(duel.state.status, 'racing');
  return duel;
}
const groundAt = (duel, at) => { const near = duel.course.nearest(at.x, at.z, duel.state.s); return duel.course.groundAt(near.s, near.lateral); };
function standAt(duel, at) {
  const ground = groundAt(duel, at);
  duel.state.onFoot = true;
  duel.state.fighter = {...createFighter(duel.course, duel.state), x: at.x, y: ground.y, z: at.z, groundY: ground.y};
  duel.state.footTransition.needsRelease = true;
}
const tells = [];
function tick(duel, {interact = false, toward = null} = {}) {
  duel.state.input.interact = interact;
  const fighter = duel.state.fighter;
  duel.state.fighterInput = {forward: false, back: false, left: false, right: false, turnLeft: false, turnRight: false,
    sprint: false, jump: false, fire: false, aim: false, lookX: 0, lookY: 0};
  if (fighter && toward) {
    fighter.yaw = Math.atan2(toward.x - fighter.x, toward.z - fighter.z);
    duel.state.fighterInput.forward = Math.hypot(toward.x - fighter.x, toward.z - fighter.z) > .05;
  }
  const emitted = [];
  const emit = duel.emit;
  duel.emit = event => { emitted.push(event); return emit.call(duel, event); };
  stepArenaEvent(duel, DT);
  duel.emit = emit;
  for (const event of emitted) if (event?.arenaTell?.id === 'deck-climb') tells.push(event.arenaTell.cue);
}
const walkTo = (duel, target, limit = 2400, until = () => false) => {
  for (let i = 0; i < limit; i++) {
    const fighter = duel.state.fighter;
    if (until() || Math.hypot(target.x - fighter.x, target.z - fighter.z) <= .1) return true;
    tick(duel, {toward: target});
  }
  return false;
};
const climbStep = jobById('ships-nothing-to-report').steps[0];
const shipLadder = id => DECK_LADDERS.find(item => item.id === id);

// 1. F at a ladder's foot moves the fighter up, onto a plate they can walk.
{
  const duel = startJob([climbStep]);
  const side = shipLadder('good-hope-side');
  standAt(duel, side.foot);
  tick(duel);
  const before = duel.state.fighter.y;
  assert(before < 4 - .5, `the fighter starts on the ground (${before.toFixed(2)} m)`);
  tick(duel, {interact: true});
  let fighter = duel.state.fighter, job = duel.state.arena.worldJob.job;
  assert.equal(fighter.y, 4, 'one press of F takes the fighter up to Good Hope\'s deck, 4 m up');
  assert.equal(fighter.groundY, 4);
  assert.equal(job.stepState.plate, 'good-hope-deck', 'the step knows the fighter is on the deck');
  assert.equal(fighter.deckPlate, 'good-hope-deck', 'the walk knows the floor under the fighter');
  assert.deepEqual(tells, [DECK_CUES.climbed], 'the climb plays its sound');
  for (let i = 0; i < 30; i++) tick(duel, {interact: true});
  assert.equal(duel.state.fighter.y, 4, 'F held down climbs one ladder, not two');
  // Walk the deck to the ship's log: the floor holds, and the log counts on the deck.
  const log = climbStep.places[0].position;
  assert(walkTo(duel, {x: log.x + .5, z: log.z}), 'the fighter walks along the deck to the log');
  fighter = duel.state.fighter; job = duel.state.arena.worldJob.job;
  assert.equal(fighter.y, 4, 'the deck holds the fighter at its own height all the way');
  assert.equal(fighter.slopeStops, 0, 'walking the deck is never stopped as a slope');
  assert.equal(job.stepState.index, 1, 'Good Hope\'s log is taken on her deck');

  // 2. A fall keeps the place and puts the fighter on the ground beside the ship.
  const plate = deckPlate('good-hope-deck'), edge = {x: log.x + .5, z: Math.max(...plate.outline.map(p => p.z)) + 2};
  tells.length = 0;
  assert(walkTo(duel, edge, 400, () => !duel.state.fighter.deckPlate), 'the fighter steps off the deck\'s edge');
  tick(duel);
  fighter = duel.state.fighter; job = duel.state.arena.worldJob.job;
  const beside = groundBeside('good-hope-deck'), ground = groundAt(duel, beside);
  assert.equal(job.stepState.plate, null, 'the step knows the fighter has fallen');
  assert.equal(fighter.deckPlate, undefined, 'the floor is gone from under the fighter');
  assert(Math.hypot(fighter.x - beside.x, fighter.z - beside.z) < .01, 'the fighter lands at the foot of Good Hope\'s ladder');
  assert(Math.abs(fighter.y - ground.y) < 1e-9, 'on the ground, not in the air');
  assert.equal(job.stepState.index, 1, 'the fall keeps the log already taken');
  assert.equal(job.failedStep, false, 'a fall is not a failed step');
  assert(tells.includes(DECK_CUES.fell), 'the fall plays its sound');
  // Climbing again works at once from where the fall put them.
  tick(duel, {interact: true});
  assert.equal(duel.state.fighter.y, 4, 'F at the ladder takes the fighter straight back up');
  // And F at the top of a ladder brings them back down to its foot.
  tick(duel);
  tick(duel, {interact: true});
  assert(Math.abs(duel.state.fighter.y - ground.y) < 1e-9, 'F at the ladder\'s top climbs back down');
  assert.equal(duel.state.arena.worldJob.job.stepState.plate, null);
}

// The mast: up Patience's side, along her deck to the mast, and up 18 m to the top, with the marker on each ladder in turn.
{
  const duel = startJob([{...climbStep, places: climbStep.places.slice(2)}]);
  const side = shipLadder('patience-side'), mast = shipLadder('patience-mast');
  standAt(duel, side.foot);
  tick(duel);
  const marker = () => duel.state.arena.worldJob.job.requests.find(request => request.type === 'marker')?.place;
  assert(Math.hypot(marker().x - side.foot.x, marker().z - side.foot.z) < .01, 'the marker shows the ladder up Patience first');
  tick(duel, {interact: true});
  assert.equal(duel.state.fighter.y, 4);
  const log = climbStep.places[2].position;
  assert(walkTo(duel, {x: log.x, z: log.z + .5}), 'along Patience\'s deck to her log');
  assert.equal(duel.state.arena.worldJob.job.stepState.index, 1, 'Patience\'s log is taken');
  assert(Math.hypot(marker().x - mast.foot.x, marker().z - mast.foot.z) < .01, 'then the marker shows the foot of the mast');
  assert(walkTo(duel, mast.foot), 'to the foot of the mast');
  tick(duel, {interact: true});
  tick(duel);
  assert.equal(duel.state.fighter.y, 18, 'one press of F takes the fighter to the mast top, 18 m up');
  assert.equal(duel.state.arena.worldJob.job.stepState.index, 2, 'the mast top counts as reached');
  // Knocked down up there: the place is kept and the fighter is beside the ship.
  duel.state.fighter.knockedDown = true;
  tick(duel);
  const job = duel.state.arena.worldJob.job;
  assert.equal(job.stepState.index, 2, 'a knockdown at the mast top keeps both places');
  const beside = groundBeside('patience-mast-top');
  assert(Math.hypot(duel.state.fighter.x - beside.x, duel.state.fighter.z - beside.z) < .01, 'and lands beside Patience');
}

// Stepping the job alone: a ground place under a deck does not count from the ground, and without `climbs` nothing changes.
{
  const step = {kind: 'onfoot', places: [{id: 'log', action: 'use', position: {x: -45, y: 4, z: -415}},
    {id: 'far', action: 'use', position: {x: 400, y: 0, z: 400}}], radius: 3, climbs: true};
  let job = stepJob(createJob({steps: [step]}), {onFoot: true, fighter: {position: {x: -45, y: 1.5, z: -415}}}, DT);
  assert.equal(job.stepState.index, 0, 'a log on the deck cannot be taken from the ground under it');
  const plain = stepJob(createJob({steps: [{...step, climbs: undefined}]}), {onFoot: true, fighter: {position: {x: -45, y: 1.5, z: -415}}}, DT);
  assert.equal(plain.stepState.index, 1, 'a step without climbs is the on-foot step it always was');
  assert(!('plate' in plain.stepState) && !('fHeld' in plain.stepState), 'and keeps no climbing state');
  job = stepJob(createJob({steps: [step]}), {onFoot: true, interact: true, fighter: {position: {x: 0, y: 0, z: 0}}}, DT);
  assert.deepEqual([job.stepState.index, job.stepState.plate, job.events], [0, null, []], 'F far from any ladder does nothing');
}

// 4. The weather changes no rule and no replay: the same seed and the same inputs give the same game, storm or no storm.
{
  const nightWatch = jobById('ships-night-watch').steps[0], keeper = jobById('ships-the-keeper').steps[0];
  assert.equal(nightWatch.weather, 'dust-night');
  assert.equal(keeper.weather, 'dust-night');
  const clear = step => { const {weather, ...rest} = step; return rest; };
  const strip = (key, value) => key === 'weather' && value === 'dust-night' ? undefined : value;
  function run(steps) {
    const duel = startJob(steps, 9090), trace = [], startS = duel.state.s;
    let seen = 0;
    // Drive the night rescue for a while: throttle, a little steering, a stop, then out on foot.
    for (let i = 0; i < 1800; i++) {
      const input = duel.state.input;
      input.throttle = i < 1200 ? 1 : 0; input.brake = i >= 1200 ? 1 : 0; input.steer = Math.sin(i / 90) * .4;
      stepArenaEvent(duel, DT);
      if (dustNightOf(duel.state)) seen++;
      if (i % 60 === 0) trace.push(JSON.stringify(duel.state, strip));
    }
    const driven = Math.abs(duel.state.s - startS);
    const stairs = shipLadder('stairs-1');
    duel.state.arena.worldJob.job = {...duel.state.arena.worldJob.job, stepIndex: 1, stepState: {}};
    standAt(duel, stairs.foot);
    for (const [index, interact] of [[0, false], [1, true], [2, false], [3, false]]) {
      tick(duel, {interact, toward: index > 1 ? shipLadder('stairs-2').foot : null});
      if (dustNightOf(duel.state)) seen++;
      trace.push(JSON.stringify(duel.state, strip));
    }
    return {trace, seen, driven, final: JSON.stringify(duel.state, strip), fighterY: duel.state.fighter.y};
  }
  const stormy = run([nightWatch, keeper]), calm = run([clear(nightWatch), clear(keeper)]);
  assert(stormy.seen > 1000, 'the view sees the storm on both stepped steps');
  assert.equal(calm.seen, 0, 'and none without it');
  assert(stormy.driven > 100, `the car really drives through the storm (${stormy.driven.toFixed(0)} m)`);
  assert.equal(stormy.fighterY, 8, 'the stairs climb in the storm as in clear air');
  assert.equal(stormy.trace.length, calm.trace.length);
  for (let i = 0; i < calm.trace.length; i++) assert.equal(stormy.trace[i], calm.trace[i], `the game state matches at sample ${i}`);
  assert.equal(stormy.final, calm.final, 'the storm changes nothing in the game state');
  // The beam keeps the view's own clock and turns once in its time.
  assert.equal(beamHeading(0), 0);
  assert(Math.abs(beamHeading(DUST_NIGHT.beamTurnSeconds / 4) - Math.PI / 2) < 1e-12);
  assert.equal(beamHeading(DUST_NIGHT.beamTurnSeconds), 0);
}

console.log('deck plates: ladders, falls, plate heights and the night storm passed');
