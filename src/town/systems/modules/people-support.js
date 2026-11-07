import {registerTownSystem} from '../../town-sim.js';
import {stepTownPeopleSupport} from '../../town-support-people.js';

registerTownSystem('town-support-people', 12, 24, stepTownPeopleSupport);
