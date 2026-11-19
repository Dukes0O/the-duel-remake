// QA only. The story keeps its three riders. A temporary review job uses the
// existing five-car roadblock so the native engine can produce a surround.
import {night2Job} from '../src/world/jobs/night-2.js';
import {NIGHT_2_SITES as sites} from '../src/world/jobs/night-2-sites.js';
import {washRiderJob} from '../src/world/jobs/wash-riders.js';

const {x, z} = sites.washApproach.position;
const roadblock = washRiderJob({boxIn: true, count: 5}).steps[0];
const translate = point => ({...point, x: x + point.x - roadblock.carStart.x, z: z + point.z - roadblock.carStart.z});

export function startWashSurroundReview(app) {
  if (!app.isYardHomeActive()) return false;
  const job = night2Job(app.seed, {washFight: true});
  const fight = job.steps.find(step => step.id === 'wash-fight');
  fight.riders = roadblock.riders.map(rider => ({...rider, start: translate(rider.start), home: translate(rider.home)}));
  app.cpuDifficulty = 'easy';
  return app._startArenaFight({venueId: 'scablands', mode: 'world-job', opponents: 0, job});
}

export function placeWashSurroundReview(duel) {
  const {state, course} = duel, world = state.arena?.worldJob;
  if (state.onFoot || world?.job.steps[world.job.stepIndex]?.id !== 'wash-drive' || world.riderReserve?.length !== 5) return false;
  const {s, lateral} = course.nearest(x, z), {y} = course.groundAt(s, lateral);
  Object.assign(state, {s, lateral, prevS: s, prevLateral: lateral, groundHeight: y, prevGroundHeight: y,
    headingError: roadblock.carStart.heading - course.at(s).heading, speedMph: roadblock.carStart.speedMph});
  return true;
}
