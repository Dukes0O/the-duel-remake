// OPEN-CHECKPOINTS: locate the authored circles and answer their four seeded questions.
import {LAND} from '../scablands-names.js';
import {ROAD_NET, roadNet, roadPointFrom} from '../scablands-road.js';
import {sees} from '../scablands-ways.js';
import {isTrue} from './facts.js';
import {feudOf} from './open-record.js';
import {FEUD_WORDS, SITES} from './register.js';
import {CHECKPOINTS, ROAD_GROUPS} from './content/checkpoints.js';

export const gap = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
export const TIN_TOWN_CLEARANCE = 1200;
export const TIN_TOWN = LAND.at('tin-town');

export function buildCheckpoints(land = LAND, net = land === LAND ? ROAD_NET : roadNet(land)) {
  return CHECKPOINTS.map(row => {
    const road = row.at.road && net.road(row.at.road);
    if (row.at.road && !road) throw new RangeError('Unknown checkpoint road: ' + row.at.road);
    if (road) {
      const start = road.points[0];
      return {...row, position: roadPointFrom(road, start.x, start.z, road.length * row.at.share)};
    }
    const [name, east, south] = row.at;
    const position = row.toward ? land.between(name, ...row.toward, east, south)
      : typeof east === 'string' ? land.at(name) : land.at(name, east, south);
    return {...row, position};
  });
}
export const OPEN_CHECKPOINTS = buildCheckpoints();

// OPEN-SITES will provide resolved positions. Until it lands these are its authored candidate positions.
const CAMP_ANCHORS = {
  glasshouse: [['ships-in-sand', 2000, 700], ['dead-mall', -1500, -2150], ['tin-town', -200, 1900]],
  'radio-hill': [['tin-town', -2245, -992], ['tin-town', -1400, 1100], ['ridge', -750, -550]],
};

function temporaryCampPosition(id, seed) {
  const anchors = CAMP_ANCHORS[id];
  if (!anchors) return null;
  const index = anchors.findIndex((_, i) => isTrue({fact: 'draw', name: 'place', chance: (i + 1) / anchors.length},
    {seed}, {draw: 'site/' + id}));
  return LAND.at(...anchors[index]);
}

export function friendlyCamps(world, sitePositions) {
  return SITES.filter(site => site.kind === 'camp' && site.people && isTrue({all: [
    {fact: 'found', site: site.id}, {fact: 'word', of: site.people, atLeast: 'Friendly'},
    {not: {fact: 'stage', site: site.id, is: 'burned'}}, {not: {fact: 'stage', site: site.id, is: 'empty'}},
  ]}, world)).map(site => ({people: site.people,
    position: sitePositions?.[site.id] ?? temporaryCampPosition(site.id, world.open.landSeed)}))
    .filter(camp => camp.position);
}

const TOWERS = {
  'tower/crows-step': LAND.at('furnace-watch'),
  'tower/west-fence': LAND.at('tin-town'),
};
function towerSees(world, at) {
  return Object.entries(TOWERS).some(([id, position]) => isTrue({fact: 'made', id}, world) &&
    sees(position, at, {eye: 9, range: 2500}));
}

export function isArmed(checkpoint, world, camps) {
  return !world.open.resting.includes(checkpoint.id) && gap(checkpoint.position, TIN_TOWN) >= TIN_TOWN_CLEARANCE &&
    !camps.some(camp => gap(checkpoint.position, camp.position) <= TIN_TOWN_CLEARANCE);
}

const feudRank = (world, group) => Math.max(0, FEUD_WORDS.indexOf(feudOf(world, group)));
export function arrivalChance(checkpoint, world, camps) {
  const {position, feud, chance} = checkpoint;
  const weighted = chance + (feud ? .10 * feudRank(world, feud) : 0) + .03 * world.ledger.roadWord
    - (towerSees(world, position) ? .15 : 0) - (camps.some(camp => gap(position, camp.position) <= 2000) ? .10 : 0);
  return Math.max(.05, Math.min(.75, weighted));
}

const RIDER_CAR_WEIGHTS = [[45, 35, 15, 5], [30, 40, 20, 10], [20, 35, 30, 15], [10, 30, 35, 25]];
const INTENTS = ['fight', 'pass', 'trouble'];
// Cumulative cuts ask the SAME named throw, so the categories partition one draw.
function weightedIndex(weights, draw, name) {
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  let below = 0;
  return weights.findIndex(weight => draw(name, (below += weight) / total));
}

export function drawCheckpoint(checkpoint, world, crossing, {difficulty, camps = friendlyCamps(world)} = {}) {
  const first = Object.values(world.open.crossings).every(count => count === 0);
  const subject = {draw: 'checkpoint/' + checkpoint.id + '/crossing-' + crossing};
  const draw = (name, chance) => isTrue({fact: 'draw', name, chance}, world, subject);
  if (!draw('arrival', first ? 1 : arrivalChance(checkpoint, world, camps))) return null;
  const who = checkpoint.who.filter(row => !row.needs || isTrue(row.needs, world));
  const {group} = who[weightedIndex(who.map(row => row.weight), draw, 'group')];
  const {intent, bait} = ROAD_GROUPS[group], feud = feudRank(world, group);
  const countWeights = intent.length === 1 ? [75, 25] : RIDER_CAR_WEIGHTS[feud];
  const count = checkpoint.cars[0] + weightedIndex(countWeights, draw, 'count');
  const weights = [...(intent[feud] ?? intent[0])];
  if (group === 'ash-men' && world.open.car.dirt >= .5) {
    weights[1] += weights[0] / 2;
    weights[0] /= 2;
  }
  const purpose = INTENTS[weightedIndex(weights, draw, 'intent')];
  const toll = group === 'road-rats' && world.open.threads['mall-road-toll']?.end;
  const keepsPass = toll === 'kept' && checkpoint.at?.road === 'mall-road' && purpose === 'fight';
  const kind = first || keepsPass ? 'pass' : purpose;
  const fewer = group === 'road-rats' && world.ledger.marks.includes('stranded-hauler/one-gate-only') ? 1 : 0;
  const extra = toll === 'stands' && checkpoint.feud === 'road-rats' && kind === 'fight' ? 2 : 0;
  return {group, kind, count: first || kind === 'trouble' ? 1 :
    Math.max(1, Math.min(count, difficulty === 'easy' ? 2 : checkpoint.cars[1]) - fewer) + extra,
    bait: kind === 'trouble' && bait === true, scout: kind === 'pass' && group === 'ash-men' && feud === 0};
}
