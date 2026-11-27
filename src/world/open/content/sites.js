import {checkSite, requireSound} from '../check-tables.js';
import {siteRow} from '../register.js';
import {POCKET_ID, POCKET_POSITIONS} from './radio-hill-voice-places.js';
import {TOLL_SITE} from './mall-road-toll-places.js';
import {SITE_NEEDS} from './needs.js';

const site = (id, positions, rules) => ({
  ...siteRow(id),
  where: positions.map(at => ({at})),
  needs: SITE_NEEDS.filter(need => need.site === id).map(need => need.id),
  ...rules,
});

export const BUOY_POSITIONS = [['ships-in-sand', 2600, 150], ['ships-in-sand', 3500, 250], ['ships-in-sand', 2900, 700]];

export const LAND_SITES = Object.freeze(requireSound([
  site('glasshouse', [['ships-in-sand', 2000, 700], ['dead-mall', -1500, -2150], ['tin-town', -200, 1900]],
    {foundWithin: 160, tell: 'dusk-smoke', tellWithin: 1500, leader: 'marigold', meeting: 'marigold', ashWary: true}),
  site('radio-hill', [['tin-town', -2245, -992], ['tin-town', -1400, 1100], ['ridge', -750, -550]],
    {foundWithin: 120, tell: 'mast', tellWithin: 1400, radioWithin: 800, leader: 'hetty', meeting: 'door', warns: true}),
  // OPEN-BURNED-SCOUT owns discovery and the look of the den.
  site('rats-nest', [['boneyard', -150, -900]], {foundWithin: 120, tell: 'tyre-smoke', tellWithin: 1400}),
  site('grey-camp', [['boneyard', 185, -1520]], {foundWithin: 95, tell: 'tyre-smoke'}),
  site('sweet-seep', [['dead-mall', -1050, 300]], {foundWithin: 160, tell: 'green-patch', tellWithin: 700}),
  site('bus-ring', [['ridge', -665, -345]], {foundWithin: 135, tell: 'lamp', tellWithin: 850,
    leader: 'gasket', meeting: 'workbench', hostileTo: ['glasshouse'], storyOnly: true, storyChoices: true}),
  TOLL_SITE,
  site(POCKET_ID, POCKET_POSITIONS, {foundWithin: 80, tell: 'lamp', tellWithin: 4000, storyChoices: true}),
  site('bell-buoy', BUOY_POSITIONS, {foundWithin: 24, tell: 'bell', tellWithin: 400, storyChoices: true}),
], checkSite, 'Open Scablands sites'));

export const CAMP_SITES = Object.freeze(LAND_SITES.filter(site => site.kind === 'camp'));
export const landSite = id => LAND_SITES.find(site => site.id === id) ?? null;
