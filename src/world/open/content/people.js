// Every person of the open land, from one file for each card, so that cards built at the same time do not edit the
// same table. Checked as it is loaded.
import {checkPerson, requireSound} from '../check-tables.js';
import {TOWN_PEOPLE} from './people-town.js';
import {FORGE_PEOPLE} from './people-forge.js';
import {SITES_PEOPLE} from './people-sites.js';

export const PEOPLE = Object.freeze(requireSound([...TOWN_PEOPLE, ...FORGE_PEOPLE, ...SITES_PEOPLE], checkPerson, 'The people of the open land'));
