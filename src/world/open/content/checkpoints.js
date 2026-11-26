// OPEN-CHECKPOINTS: the roads, the four kinds of ground and the people who use them.
import {checkCheckpoint, checkSentence, requireSound} from '../check-tables.js';

const rats = (weight) => ({group: 'road-rats', weight});
const ash = (weight, needs) => ({group: 'ash-men', weight, needs});
const traders = (weight) => ({group: 'traders', weight});
const travellers = (weight) => ({group: 'travellers', weight});
const ashRaiding = {fact: 'feud', of: 'ash-men', atLeast: 'Raiding'};
const OPEN = {chance: .30, who: [rats(2), ash(1, ashRaiding), traders(4), travellers(3)]};
const ASH = {chance: .45, feud: 'ash-men', who: [rats(1), ash(5), traders(2), travellers(1)]};
const RAT = {chance: .45, feud: 'road-rats', who: [rats(5), ash(1, ashRaiding), traders(2), travellers(2)]};
const WEST = {chance: .25, who: [rats(1), traders(4), travellers(4)]};

const circle = (id, at, ground, toward) => ({id, at, ...ground, toward, radius: 180, cars: [1, 4]});
const road = (id, index, share, ground) => circle(id + '-' + index, {road: id, share}, ground);
export const CHECKPOINTS = requireSound([
  road('east-road', 1, .18, OPEN),
  road('east-road', 2, .42, ASH),
  road('east-road', 3, .68, OPEN),
  road('boneyard-road', 1, .35, RAT),
  road('tin-road', 1, .45, RAT),
  road('salt-road', 1, .20, OPEN),
  road('salt-road', 2, .55, OPEN),
  road('salt-road', 3, .85, OPEN),
  road('ridge-spur', 1, .50, OPEN),
  road('ridge-road', 1, .35, OPEN),
  road('west-road', 1, .25, OPEN),
  road('west-road', 2, .60, WEST),
  road('west-road', 3, .88, WEST),
  road('dam-road', 1, .35, OPEN),
  road('dam-road', 2, .75, WEST),
  road('burn-road', 1, .30, ASH),
  road('burn-road', 2, .70, ASH),
  road('mall-road', 1, .30, OPEN),
  road('mall-road', 2, .70, RAT),
  road('mall-burn-road', 1, .35, OPEN),
  road('mall-burn-road', 2, .75, ASH),
  road('mall-boneyard-road', 1, .30, RAT),
  road('mall-boneyard-road', 2, .75, RAT),
  circle('the-steps', ['the-steps', 'crossing'], ASH),
  circle('breaks-cut', ['dead-mall', 0, -700], ASH, ['everburn', .5]),
  circle('pan-cut', ['ships-in-sand', 0, 400], OPEN, ['ridge', .5]),
], checkCheckpoint, 'Open road checkpoints');

// Intent weights are [fight, pass, trouble], ordered by feud from Watching to War party.
export const ROAD_GROUPS = {
  'road-rats': {intent: [[30, 55, 15], [55, 30, 15], [70, 20, 10], [80, 15, 5]],
    bait: true, car: 'dusthawk_rally', weapon: 'crossbow', color: 0x594d41, accent: 0x87372d, pace: 32},
  'ash-men': {intent: [[10, 90, 0], [50, 50, 0], [70, 30, 0], [85, 15, 0]],
    car: 'dusthawk_rally', weapon: 'ash-sack', color: 0x8c8980, accent: 0x41372d, pace: 31},
  traders: {intent: [[0, 75, 25]],
    car: 'falcone_f42', weapon: 'crossbow', color: 0x9c8150, accent: 0x366452, pace: 26},
  travellers: {intent: [[0, 60, 40]],
    car: 'falcone_f42', weapon: 'crossbow', color: 0x768086, accent: 0x375385, pace: 23},
  'water-men': {intent: [[0, 100, 0], [100, 0, 0], [100, 0, 0], [100, 0, 0]],
    car: 'dusthawk_rally', weapon: null, color: 0xf1eee4, accent: 0xd4d6cd, pace: 23},
};

const lines = requireSound([
  {id: 'traders-hail', text: "The trader: Good day to you. I've tyres, salt and a little seed on the back, and I'll trade them for scrap at any gate that will open for me. Where are you from?"},
  {id: 'tin-town', text: "The trader: Tin Town? I heard that somebody has lit the hearth there again. I'll come by your gate one evening, if the road stays clear."},
  {id: 'travellers-hail', text: "A traveller: We're only passing through, and we don't want any trouble. Is it far to the next place with a fire?"},
  {id: 'trouble', text: "The driver: Thank goodness, somebody stopped. The fan belt has gone and I've been here since morning. I've no scrap to give you, but I never forget a kindness."},
  {id: 'mended', text: "The driver: She's running again! I told my daughter that somebody decent would come along. I'll tell everyone I meet which town you're from."},
  {id: 'bait', text: "A Road Rat: There's nothing wrong with this car at all. There's something wrong with yours, though, because it's about to be ours."},
  {id: 'road-rats-fight', text: "A Road Rat: That's a nice car, and it's a long way from home. Let's see how much of it we can carry."},
  {id: 'ash-men-fight', text: 'An Ash Man: Old Smoke says nothing glows on this road without his leave, and that goes for your headlamps too.'},
  {id: 'break-off', text: "A Road Rat: Leave it! There's something bigger going on down the road, and I want to watch."},
  {id: 'civilian-hit', text: "What did you do that for? I've done nothing to you! Every gate on this road is going to hear about this."},
  {id: 'tow', text: "We saw your smoke from our fence and came out with a rope. We'll call that the favour we owed you. Mind your head as we go over the bumps."},
  {id: 'lift', text: "The trader: You're a long way from anywhere on foot. Climb up, and I'll take you home. It will cost you 10 scrap for the ride, and your car will have to wait where it is until morning."},
  {id: 'walk', text: 'Walk to the road to flag down a trader.'},
], row => checkSentence(row.text), 'Open road dialogue');
export const ROAD_LINES = Object.fromEntries(lines.map(({id, text}) => [id, text]));
