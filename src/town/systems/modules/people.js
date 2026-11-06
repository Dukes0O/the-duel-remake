import {registerTownSystem} from '../../town-sim.js';
import {stepTownPeople} from '../../town-people.js';

registerTownSystem('town-people', 20, 1, stepTownPeople);
