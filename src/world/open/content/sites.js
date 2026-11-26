import {checkSite, requireSound} from '../check-tables.js';
import {siteRow} from '../register.js';
import {DRY_PUMP_CAMP} from './dry-pump-places.js';
import {TOLL_SITE} from './mall-road-toll-places.js';
import {SITE_NEEDS} from './needs.js';

const site = (id, positions, rules) => ({
  ...siteRow(id),
  where: positions.map(at => ({at})),
  needs: SITE_NEEDS.filter(need => need.site === id).map(need => need.id),
  ...rules,
});

export const LAND_SITES = Object.freeze(requireSound([
  site('glasshouse', [['ships-in-sand', 2000, 700], ['dead-mall', -1500, -2150], ['tin-town', -200, 1900]],
    {foundWithin: 160, tell: 'dusk-smoke', tellWithin: 1500, leader: 'marigold', meeting: 'marigold', ashWary: true}),
  site('radio-hill', [['tin-town', -2245, -992], ['tin-town', -1400, 1100], ['ridge', -750, -550]],
    {foundWithin: 120, tell: 'mast', tellWithin: 1400, radioWithin: 800, leader: 'hetty', meeting: 'door', warns: true}),
  // OPEN-BURNED-SCOUT owns discovery and the look of the den.
  site('rats-nest', [['boneyard', -150, -900]], {foundWithin: 120, tell: 'tyre-smoke'}),
  site('sweet-seep', [['dead-mall', -1050, 300]], {foundWithin: 160, tell: 'green-patch', tellWithin: 700}),
  site(DRY_PUMP_CAMP.id, [DRY_PUMP_CAMP.at], {foundWithin: 120, tell: 'lamp', tellWithin: 500,
    leader: 'gasket', meeting: 'door', storyChoices: true}),
  TOLL_SITE,
], checkSite, 'Open Scablands sites'));

export const CAMP_SITES = Object.freeze(LAND_SITES.filter(site => site.kind === 'camp'));
export const landSite = id => LAND_SITES.find(site => site.id === id) ?? null;

// Local positions shared by Radio Hill's rules and drawing.
export const RADIO_HILL = Object.freeze({
  structures: [
    {id: 'mast', kind: 'post', x: 0, z: 0, halfX: .55, halfZ: .55, height: 25},
    {id: 'hut', kind: 'building', x: -7, z: 4, halfX: 2.8, halfZ: 2, height: 2.9},
    {id: 'generator', kind: 'prop', x: -4, z: -4, halfX: .9, halfZ: .55, height: 1.2},
    {id: 'anchor', kind: 'prop', x: 10, z: 0, halfX: .25, halfZ: .35, height: .55},
  ],
  spots: {
    mast: {x: 1.6, z: 0}, generator: {x: -4, z: -2.5}, anchor: {x: 10, z: 1.4},
    door: {x: -7, z: 6.6}, lookout: {x: 3, z: 12}, bench: {x: -10.5, z: 5}, bed: {x: -7, z: 4},
  },
});
