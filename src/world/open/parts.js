// The open land's parts, in the order they run (src/world/open/open-land.js). Each card owns its own file under
// parts/ and fills it in; nobody needs to edit this list to add to a part that is already here.
import {routinesPart} from './parts/routines.js';
import {peoplePart} from './parts/people.js';
import {buildingsPart} from './parts/buildings.js';
import {sitesPart} from './parts/sites.js';
import {checkpointsPart} from './parts/checkpoints.js';
import {threadsPart} from './parts/threads.js';
import {missionsPart} from './parts/missions.js';
import {groundPart} from './parts/ground.js';
import {homePart} from './parts/home.js';

export const OPEN_PARTS = Object.freeze([routinesPart, peoplePart, buildingsPart, sitesPart, threadsPart, missionsPart, checkpointsPart, groundPart, homePart]);
