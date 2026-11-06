import {registerTownSystem} from '../../town-sim.js';
import {stepTownPeople} from '../../town-people.js';

registerTownSystem('town-people', 20, 24, stepTownPeople);
