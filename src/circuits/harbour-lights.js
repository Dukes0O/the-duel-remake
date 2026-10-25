// Harbour Lights (docs/CIRCUITS.md section 5.2): a night street race between
// walls with a crawling hairpin. Road layout only; art, neon, harbour,
// Lantern Tower, escape roads and the full field belong to Codex's P4-HARBOUR
// card.
//
// The drafted script ended 1,885 m from where it began (its first leg runs
// 1,050 m one way and nothing runs back), and three Old Town turns were too
// short to hold a 25 m eased join. It was fitted with tools/track-script-fit.mjs
// keeping the Seafront Straight and the Lantern Hairpin. Changes from the draft:
//   turn degrees: Lantern Kink 20 to 14, Casino Corner 95 to 152, Temple Hill 40
//     to 28.5, Bell Tower Bend 60 to 59.5, Esses 1 45 to 50 (radius 30 to 32),
//     Esses 2 50 to 48, Esses 3 40 to 48.5 (radius 35 to 36), Esses 4 35 (radius
//     40 to 41), Precinct Bend 70 to 57.5, Hairpin 175 to 173.5, Fishmarket Bend
//     60 to 96, Reservoir Sweep 80 to 71.5;
//   straights: Seafront 600 to 599, Casino Approach 450 to 60 (the overtaking run
//     into Casino Corner is now the Seafront plus the kink, about 660 m), 120 to
//     200, 90 to 66, 140 to 294, Hillside 160 to 320, Hairpin Approach 120 to 254,
//     220 to 60, 300 to 375, last 200 to 60.
// Claude's finishing pass should redraw this layout; the numbers here make the
// loop close and keep the named corners in the drafted order.
// Redrawn by Claude, 10 October 2026: Seafront Straight, Lantern Kink and the
// Casino Approach give about 900 m into Casino Corner (the overtaking zone); the
// old town climbs away from the start; Precinct Bend turns further away and the
// Lantern Hairpin turns the road for home; the Reservoir Run and Harbour Road
// bring it back. Closest separate stretches: the hairpin approach and exit.
// Easier pass, Claude, 14 October 2026 (layoutVersion 2, P4-FINISH-1014): Kyle found the street too hard.
// Casino Corner opens from radius 22 to 27; the old town is 12 m wide (was 10) and the hairpin approach,
// hairpin and the road after it 13 m (was 12). Claude's road-clearance correction opens the Lantern Hairpin
// from radius 9 to 10 m; it remains the slowest corner on purpose. The descent no longer starts as a drop at
// Precinct Bend (that crest launched a car at the hairpin's braking point) but is spread over the Hillside and the Reservoir Run, and the hairpin itself
// lies level so the two arms of the road beside it meet the same ground. The loop closes by stretching its
// straights by under 1% as before; every distance after Casino Corner moved by 9 to 20 m.
import { defineScriptedCourse } from '../track-script.js';
import { buildKitPlacements } from '../circuit-kit-layout.js';

// Dark grey run-off gravel, so the escape roads pick up the street light instead of glowing tan at night.
const GRAVEL = 0x3d4046;

const BASE = defineScriptedCourse({
  id: 'harbour-lights', name: 'Harbour Lights', flag: 'harbour-lights',
  theme: 'city', timeOfDay: 'night', stage: 17, kind: 'circuit', layoutVersion: 2,
  closed: true, laps: 4, grandPrixLaps: 4, hasRival: true, hasRadar: false, noTraffic: true, noCombat: true, speedLimitMph: 100,
  airborne: true, terrainHalfWidth: 64, completeTerrainRibbon: true, scenery: { trees: 100, rocks: 40, mountains: false },
  sections: [
    { theme: 'city', name: 'Seafront', share: .30 },
    { theme: 'city', name: 'Old Town', share: .45 },
    { theme: 'city', name: 'Reservoir', share: .25 },
  ],
  // Night all lap: the street lamps, lit windows, car lamps and the moon of P4-DAYNIGHT (src/light-path.js).
  lightPath: { axis: 'distance', keyframes: [{ at: 0, look: 'night' }] },
  scriptStart: 100,
  scriptDefaults: { walls: 'both' },
  markings: 'circuit',
  // How the racing line and the computer racers treat a road between walls (race-lines.js,
  // race-field.js, race-field-driver.js). The line keeps 2.6 m from the road edge and crosses the
  // road no more than 60% of a bend's sagitta. Racers drive a little under their usual pace (by
  // difficulty), vary a little more from one another, attack more keenly, keep 1 m further off the
  // walls, leave room for a leader that brakes at full strength, and on the first lap, with the
  // whole field bunched, keep a longer gap and count a car about to draw level as alongside.
  racingLine: { lineMargin: 2.6, lineSwing: .6, holdRacers: true },
  fieldPace: { easy: .75, medium: .725, hard: .716 }, fieldForm: 2.5, fieldSpread: 1.5, fieldAggression: 1.4,
  fieldFollow: { leadBraking: 1.6, wallRoom: 1.0, firstLap: { margin: 5, reaction: .5, closeIn: .8, wallRoom: 1.4 } },
  // Wet-look road at night: glossy asphalt and soft pools of colour under lanterns and neon
  // (src/circuit-water.js). Looks only; grip is dry.
  wetRoad: { performanceShare: .5 },
  // Water beside the road, in the circuit-hills.js basin format: the harbour along the Seafront
  // Straight and Harbour Road, two terraced pools of the reservoir along the Reservoir Run. Each
  // is an uneven oval; `surface` is the water's height against the road at `s`, `depth` how far
  // the floor lies below it (boats stand on the shallow floor). src/circuit-water.js draws the water.
  water: { glitter: true },
  basins: [
    { id: 'seafront', s: 272, lateral: -66, along: 125, across: 54, surface: -2.2, depth: .8, bank: .1, blend: 20, keep: 4 },
    { id: 'harbour-road', s: 3514, lateral: -61, along: 230, across: 49, surface: -2.2, depth: .8, bank: .1, blend: 20, keep: 4 },
    { id: 'reservoir-upper', s: 2474, lateral: -57, along: 160, across: 43, surface: -2, depth: .8, bank: .1, blend: 20, keep: 4 },
    { id: 'reservoir-lower', s: 2894, lateral: -57, along: 180, across: 43, surface: -2.2, depth: .8, bank: .1, blend: 20, keep: 4 },
  ],
  // The wall inside the Lantern Hairpin (radius 10 m) is drawn as one smooth ribbon, not as short boxes that splay into a jagged edge.
  smoothInnerWalls: { maxRadius: 15 },
  // Straight run-offs behind openings in the wall, on the outside of the two
  // slow corners (src/track-script-course.js).
  escapeRoads: [
    { id: 'casino-corner', piece: 'Casino Corner', run: 70, width: 10, colour: GRAVEL },
    { id: 'lantern-hairpin', piece: 'Lantern Hairpin', run: 55, width: 9, colour: GRAVEL },
  ],
  // Night looks of the street (src/track-kits.js `kitLook`, src/night-glows.js). The paper lanterns
  // glow at about a third of their stored strength (warm paper, not white balls) and each carries a
  // small soft halo; the boats carry masthead, stern and cabin lights (red and green on the two
  // funnels), with a dim copy on the water; neon signs and the Lantern Tower get a halo; the street
  // lamps get head halos and light pools on the road, sodium through the old town, white elsewhere.
  // Pieces made of many small parts are joined by material: the same picture for far fewer draws.
  mergeKitMeshes: ['shopfront-a', 'shopfront-b', 'neon-sign', 'lantern-string', 'lantern-tower', 'pit-garage'],
  kitLook: {
    'lantern-string': { glow: 1.1 },
    'shopfront-a': { wash: { colour: 0xffd9a8, strength: .45, height: 9, floor: .08, tint: .9 } },
    'shopfront-b': { wash: { colour: 0xffd9a8, strength: .45, height: 9, floor: .08, tint: .9 } },
  },
  // The town behind the walls (src/scenery-detail.js, src/street-facades.js): plaster walls in warm
  // Mediterranean colours washed in street light near the ground, trim, shutters, balconies, awnings and lit shop windows.
  facades: {
    palette: [0xe9d6ae, 0xd9a95a, 0xd99a8a, 0xc4745a, 0xa9bfa0, 0xe2c9a0, 0x9fb4c4],
    trims: [0xefe4cc, 0xd8c9a8, 0xcdb89a],
    wash: { colour: 0xffd9a8, strength: .4, height: 12, floor: .08 },
    dress: true,
  },
  glows: [
    { piece: 'lantern-string', points: [-3.13, -1.88, -.63, .63, 1.88, 3.13].map(x => [x, 1.85, 0]), colour: [0xff9a3c, 0xffc060], size: 1.2, strength: .9 },
    { piece: 'harbour-boat', points: [[-.65, 3.1, -.45], [.65, 3.1, -.45]], colour: [0xff3028, 0x28ff60], size: .55, strength: 1.1, reflect: .35 },
    { piece: 'harbour-boat', points: [[0, 1.25, -2.4], [0, 1.45, 1.0]], colour: [0xfff0d0, 0xffb860], size: .5, strength: .9, reflect: .35 },
    { piece: 'neon-sign', points: [[0, .6, .3]], colour: [0xff3a7a, 0x2fd6ff, 0xffb02e, 0x7dff6a], size: 2.9, strength: .7 },
    { piece: 'lantern-tower', points: [[0, 31.5, 0], [0, 33.4, 0]], colour: 0xffb060, size: 9, strength: 1.2 },
  ],
  // Pools are small and soft; through the old town most lamps burn warm white and every third burns sodium.
  streetLight: { every: 40, haloSize: 1.2, haloStrength: .45, poolWidth: 6, poolLength: 20,
    sodium: { from: 889, to: 2268, colour: 0xffa23c, pool: .16, mix: 3, warm: { colour: 0xffe2bc, pool: .17 } },
    white: { colour: 0xcfe2ff, pool: .15 } },
  // The waterside (src/waterside-scenery.js): a low railing instead of the catch fence where the road runs
  // beside water, tall harbour lamps between the ordinary ones (their lights show in the water), yachts
  // and a marina, a lighthouse at the harbour mouth, palms along the Seafront.
  waterside: {
    rail: { height: 1.7 },
    lamps: [
      { from: 140, to: 430, every: 40, side: -1 },
      { from: 2314, to: 3076, every: 40, side: -1 },
      { from: 3176, to: 3660, every: 40, side: -1 },
    ],
    palms: [
      { from: 130, to: 430, side: -1, every: 20 },
      { from: 140, to: 394, side: 1, every: 22 },
      { from: 420, to: 880, side: 1, every: 22 },
      { from: 440, to: 880, side: -1, every: 26 },
    ],
    yachts: [{ basin: 'seafront', count: 5 }, { basin: 'harbour-road', count: 12 }],
    marina: { basin: 'seafront', pier: 36, length: 110, centre: 0 },
    lighthouse: { basin: 'harbour-road', at: [.78, 0], height: 24 },
    farLights: 14,
  },
  script: [
    ['straight', 500, { name: 'Seafront Straight', width: 14 }],
    ['turn', 'L', 20, 300, { name: 'Lantern Kink' }],
    ['straight', 294, { name: 'Casino Approach' }],
    ['turn', 'R', 104, 27, { name: 'Casino Corner' }],
    ['straight', 150, { climb: 6 }],
    ['turn', 'L', 40, 60, { climb: 6, name: 'Temple Hill' }],
    ['straight', 78, { climb: 6 }],
    ['turn', 'R', 60, 35, { climb: 5, name: 'Bell Tower Bend' }],
    ['straight', 192, { climb: 4, width: 12 }],
    ['turn', 'L', 46.5, 32, { climb: 3, name: 'Old Town Esses 1' }],
    ['turn', 'R', 51.5, 30, { name: 'Old Town Esses 2' }],
    ['turn', 'L', 43, 36, { name: 'Old Town Esses 3' }],
    ['turn', 'R', 40, 41, { name: 'Old Town Esses 4' }],
    ['straight', 103, { climb: -4, name: 'Hillside' }],
    ['turn', 'L', 29.5, 60, { climb: -3, name: 'Precinct Bend' }],
    ['straight', 220, { climb: -2, name: 'Hairpin Approach', width: 13 }],
    ['turn', 'R', 175, 10, { name: 'Lantern Hairpin' }],
    ['straight', 99],
    ['turn', 'L', 60, 45, { climb: -4, name: 'Fishmarket Bend', width: 14 }],
    ['straight', 827, { climb: -17, name: 'Reservoir Run' }],
    ['turn', 'R', 59, 120, { name: 'Reservoir Sweep' }],
    ['straight', 500, { name: 'Harbour Road' }],
    ['turn', 'R', 109, 60, { name: 'Harbour Turn' }],
    ['straight', 63, { name: 'Harbour Return' }],
  ],
  // Views for Claude's review sheet (tools/track-review.mjs): where the road runs beside the water, and the tower.
  reviewFrames: [
    { key: 'seafront-harbour', label: 'Seafront Straight, harbour on the left', s: 285 },
    { key: 'lantern-tower', label: 'Lantern Tower from the Seafront', s: 700 },
    { key: 'reservoir-upper', label: 'Reservoir Run, upper pool', s: 2484 },
    { key: 'reservoir-lower', label: 'Reservoir Run, lower pool', s: 2914 },
    { key: 'harbour-road', label: 'Harbour Road, harbour on the left', s: 3576 },
  ],
  // Team Room intel (docs/CIRCUITS.md section 7b.1), written by Claude. Target
  // speeds and gears come from the reference lap; these notes give the line.
  intel: {
    sectors: [1008, 2268],
    flags: [
      { id: 'lantern-hairpin', kind: 'signature', s: 2000, title: 'Lantern Hairpin' },
      { id: 'casino', kind: 'overtaking', s: 790, title: 'Seafront into Casino Corner' },
      { id: 'harbour-turn', kind: 'overtaking', s: 3716, title: 'Harbour Road into Harbour Turn' },
      { id: 'old-town', kind: 'corner', s: 1430, title: 'Old Town Esses' },
      { id: 'reservoir-sweep', kind: 'corner', s: 3074, title: 'Reservoir Sweep' },
    ],
    notes: {
      'casino': { line: 'Stay in the slipstream down the Seafront, pull out before the 100 board and take the inside for Casino Corner.', note: 'The best place to pass on the lap. Commit before the board or stay behind.' },
      'lantern-kink': { line: 'Flat out. A touch left, stay off the wall.', note: 'Only scary the first time. Keep your foot down.' },
      'casino-corner': { brakeBoard: 100, line: 'Brake straight, turn late, aim for the inside barrier.', note: 'The best place to pass. If you miss your braking point, take the escape road; do not try to make the turn.' },
      'temple-hill': { line: 'Middle of the road up the hill.', note: 'Walls on both sides from here. Neat beats brave.' },
      'bell-tower-bend': { line: 'Wide in, clip the inside, straight up.', note: 'The road narrows after this. Settle the car before the old town.' },
      'old-town-esses-1': { line: 'Left, right, left, right: one smooth line through all four.', note: 'Twelve metres wide. Pick a line and commit; correcting here means a wall.' },
      'old-town-esses-2': { line: 'Kerb to kerb.', note: 'Keep the rhythm.' },
      'old-town-esses-3': { line: 'Kerb to kerb.', note: 'Keep the rhythm.' },
      'old-town-esses-4': { line: 'Run wide on the exit up the Hillside.', note: 'Get the exit right; the Hillside is short.' },
      'precinct-bend': { line: 'Stay right after the bend to set up the hairpin.', note: 'Downhill now. Line up on the right for the hairpin.' },
      'lantern-hairpin': { brakeBoard: 150, line: 'Far right on entry, turn late, use the whole road around.', note: 'The slowest corner on the lap: about 55 km/h. Brake early, be patient, and drive out cleanly. Rushing it loses more than braking early.' },
      'fishmarket-bend': { line: 'Wide exit onto the Reservoir Run.', note: 'Everything you carry out of here lasts the length of the reservoir.' },
      'reservoir-sweep': { line: 'Turn in early and hold it, walls close on the outside.', note: 'Flat out if you are brave. A small lift if a car is alongside.' },
      'harbour-turn': { brakeBoard: 100, line: 'Brake straight, turn in, inside kerb.', note: 'Second chance to pass, and the last on the lap.' },
    },
  },
});

// The street (docs/CIRCUITS.md 5.2), laid out for the kit loader by src/circuit-kit-layout.js.
const TINTS = [0xe9d3b0, 0xd89a8a, 0x9cc0bb, 0xdcb25a, 0xa9b4d0, 0xc98562];
export const HARBOUR_STREET = {
  walls: { wall: 'concrete-wall', fence: 'catch-fence', tyres: 'tyre-wall', openToWater: true,
    alignEscapeTurns: ['Casino Corner', 'Lantern Hairpin'] },
  paddock: {
    gantry: { at: -2.5 },
    garages: { side: 1, from: -92, to: 96, lane: 9 },
    stands: { side: -1, from: -58, to: 62, setback: 5 },
  },
  rows: [
    { id: 'casino-street', pieces: ['shopfront-a', 'shopfront-b'], from: 904, to: 1054, side: 'both' },
    { id: 'temple-hill', pieces: ['shopfront-a', 'shopfront-b'], from: 1121, to: 1260, side: 'both' },
    { id: 'old-town', pieces: ['shopfront-a', 'shopfront-b'], from: 1260, to: 1763, side: 'both', setback: 1.8, gap: .3 },
    { id: 'hairpin-street', pieces: ['shopfront-a', 'shopfront-b'], from: 1763, to: 2038, side: 'both', setback: 2.2 },
    { id: 'fishmarket', pieces: ['shopfront-b', 'shopfront-a'], from: 2097, to: 2268, side: 'both', setback: 3, density: .6 },
    { id: 'quay-front', pieces: ['shopfront-b'], from: 140, to: 394, side: 1, setback: 5, scale: [.9, 1.1], density: .6 },
  ],
  singles: [{ id: 'lantern-tower', at: { piece: 'Casino Corner', at: 'middle' }, lateral: -62, scale: 1.5 }],
  signs: { from: 600, to: 2262, every: 24, side: 'both', lift: 4.6 },
  // Strings of lanterns across the street, tied at the shopfronts beyond the walls.
  strings: [
    { from: 929, to: 1049, every: 30, beyond: 2.4, lift: 4.9, bulb: .85 },
    { from: 1264, to: 1672, every: 27, beyond: 2.4, lift: 4.9, bulb: .85 },
    { from: 1995, to: 2140, every: 14, beyond: 2.4, lift: 4.9, bulb: .85 },
    { from: 2150, to: 2260, every: 28, beyond: 2.4, lift: 4.9, bulb: .85 },
  ],
  boats: [{ basin: 'seafront', count: 11 }, { basin: 'harbour-road', count: 12 }],
};

// The placements take a third of a second to work out, so they are worked out the first time
// someone reads them (the kit loader, when this circuit's world is built), not when the game starts.
let placements = null;
export const HARBOUR_LIGHTS = Object.freeze(Object.defineProperty({ ...BASE }, 'kitPlacements', {
  enumerable: true, get: () => (placements ??= Object.freeze(buildKitPlacements(BASE, HARBOUR_STREET))),
}));

// Registration belongs to this course; generation and geometry stay unchanged.
export const manifest = Object.freeze({
  id: 'harbour-lights', flag: 'harbour-lights', state: 'on', price: 1800,
  grandPrix: true, releaseOrder: 2,
  driver: Object.freeze({car: 'stuttgart_959s', driverId: 'club', controller: 'racing-line', skill: .95}),
});
