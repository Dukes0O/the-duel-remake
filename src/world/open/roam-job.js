// The job of being out in the open (docs/story/open-scablands.md, section 14): one step, `roam`, that never completes.
// The player starts on foot at Tin Town's hearth with the car at the gate, as Night 2 leaves them. `open.world` is
// what the open land's parts read and change while the job runs (src/world/open/open-land.js).
import {NIGHT_2_SITES} from '../jobs/night-2-sites.js';
import {worldForProfile} from './open-world.js';

export const OPEN_ROAM_ID = 'open-roam';

export function openRoamJob(profile, seed = 0, {playerName, ...routine} = {}) {
  const world = {...worldForProfile(profile, seed), ...routine};
  return {id: OPEN_ROAM_ID, name: 'Out in the open', title: 'Out in the open', seed: world.seed, open: {world, dayClock: true, playerName},
    steps: [{kind: 'roam', carStart: NIGHT_2_SITES.car,
      footStart: {...NIGHT_2_SITES.hearthFront.position, heading: Math.PI}}]};
}
