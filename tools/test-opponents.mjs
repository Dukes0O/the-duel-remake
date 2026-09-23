import assert from 'node:assert/strict';
import {Duel} from '../src/game.js';
import {COURSE} from '../src/config.js';

let checks = 0;
const check = (condition, message) => { assert.ok(condition, message); checks++; };

function crossCircuit(duel, actor) {
  const {course, raceLength} = duel;
  for (let lap = 0; lap < duel.state.lapsTotal; lap++) {
    for (const gate of [...duel._lapGates, course.length]) {
      const crossing = lap * course.length + gate;
      actor.prevS = crossing - .1;
      actor.s = crossing + .1;
      actor.prevLateral = actor.lateral = 0;
      actor.speedMph = 120;
      duel._advanceLaps(actor, 1 / 120);
    }
  }
  check(actor.completedLaps === duel.state.lapsTotal && actor.s >= raceLength,
    `${course.def.id}: scripted racer crosses each real lap gate`);
}

for (const [stageIndex, stage] of COURSE.entries()) {
  const duel = new Duel({seed: 9203 + stageIndex});
  duel.startCampaign({startStage: stageIndex, cpuDifficulty: 'hard', opponentCount: 3});
  const state = duel.state;
  if (stage.practice) {
    check(state.opponents.length === 0 && state.rival === null,
      `${stage.id}: untimed practice still has no opponents or finish line`);
    continue;
  }
  check(state.opponents.length === 3 && state.rival === state.opponents[0],
    `${stage.id}: first opponent is the legacy rival alias`);
  check(new Set(state.opponents).size === 3,
    `${stage.id}: opponents have separate actor state`);
  state.status = 'racing';
  state.traffic = [];
  for (let frame = 0; frame < 10; frame++) duel.step(1 / 120);
  check(state.opponents.every(actor => Number.isFinite(actor.s) && Number.isFinite(actor.lateral)),
    `${stage.id}: every opponent advances in the fixed-step race`);
  if (duel._npcRoutePlanner) check(state.opponents.every(actor => duel._npcRoutePlanner.actors.has(actor)),
    `${stage.id}: each opponent has separate route decisions`);

  for (const opponent of state.opponents) crossCircuit(duel, opponent);
  state.stageTimeSec = 100;
  state.opponents[0].finishTime = null;
  state.opponents[1].finishTime = 90;
  state.opponents[2].finishTime = 95;
  crossCircuit(duel, state);
  check(duel._finishStage() === true && state.results.completed === true,
    `${stage.id}: three-opponent race reaches a valid result`);
  check(state.results.opponentCount === 3 && state.results.position === 3,
    `${stage.id}: results rank the player against every opponent`);
  if (stage.hasRival && !stage.stuntTrial && !stage.kind)
    check(state.results.beatRival === true && state.results.beatAllOpponents === false && state.results.won === false,
      `${stage.id}: beating the first rival does not win against the full field`);
}

const single = new Duel({seed: 221});
single.startCampaign({opponentCount: 1});
check(single.state.opponents.length === 1 && single.state.rival === single.state.opponents[0],
  'ordinary duel keeps one rival in the new list');
const replacement = {...single.state.rival};
single.state.rival = replacement;
check(single.state.opponents[0] === replacement, 'legacy rival assignment updates the first list entry');
single.state.rival = null;
check(single.state.opponents.length === 0, 'legacy rival removal clears the list');

console.log(`Opponents: ${checks} scripted multi-car checks passed across ${COURSE.length} courses.`);
