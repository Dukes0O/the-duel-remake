import {registerTownSystem} from './town-sim.js';
import {settleIgnoredReports} from './town-reports.js';

registerTownSystem('town-events', 80, 24, ({town}) => settleIgnoredReports(town));
