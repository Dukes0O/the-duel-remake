// The job of being out in the open (docs/story/open-scablands.md, section 14): one step, `roam`, that never completes.
// The player starts on foot at Tin Town's hearth with the car at the gate, as Night 2 leaves them. `open.world` is
// what the open land's parts read and change while the job runs (src/world/open/open-land.js).
import {NIGHT_2_SITES} from '../jobs/night-2-sites.js';
import {worldForProfile} from './open-world.js';

export const OPEN_ROAM_ID = 'open-roam';

// HOME-GROUND-2: `homeClock` is the laptop's clock in seconds since 1970, read once as the outing opens, only while the
// switch `home-ground` is on; the ground's part takes the time since his last visit from it.
export function openRoamJob(profile, seed = 0, {playerName, homeClock, ...routine} = {}) {
  const world = {...worldForProfile(profile, seed), ...routine};
  return {id: OPEN_ROAM_ID, name: 'Out in the open', title: 'Out in the open', seed: world.seed,
    open: {world, dayClock: true, playerName, ...(Number.isFinite(homeClock) ? {homeClock} : {})},
    steps: [{kind: 'roam', carStart: NIGHT_2_SITES.car,
      footStart: {...NIGHT_2_SITES.hearthFront.position, heading: Math.PI}}]};
}
