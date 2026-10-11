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
import { defineScriptedCourse } from '../track-script.js';
import { buildKitPlacements } from '../circuit-kit-layout.js';

const BASE = defineScriptedCourse({
  id: 'harbour-lights', name: 'Harbour Lights', flag: 'harbour-lights',
  theme: 'city', timeOfDay: 'night', stage: 17, kind: 'circuit', layoutVersion: 1,
  closed: true, laps: 4, grandPrixLaps: 4, hasRival: true, hasRadar: false, noTraffic: true, speedLimitMph: 100,
  airborne: true, terrainHalfWidth: 64, scenery: { trees: 100, rocks: 40, mountains: false },
  sections: [
    { theme: 'city', name: 'Seafront', share: .30 },
    { theme: 'city', name: 'Old Town', share: .45 },
    { theme: 'city', name: 'Reservoir', share: .25 },
  ],
  // Night all lap: the street lamps, lit windows, car lamps and the moon of P4-DAYNIGHT (src/light-path.js).
  lightPath: { axis: 'distance', keyframes: [{ at: 0, look: 'night' }] },
  scriptStart: 100,
  scriptDefaults: { walls: 'both' },
  // How the racing line and the computer racers treat a road between walls (race-lines.js,
  // race-field.js, race-field-driver.js). The line keeps 2.6 m from the road edge and crosses the
  // road no more than 60% of a bend's sagitta. Racers drive a little under their usual pace (by
  // difficulty), vary a little more from one another, attack more keenly, keep 1 m further off the
  // walls, leave room for a leader that brakes at full strength, and on the first lap, with the
  // whole field bunched, keep a longer gap and count a car about to draw level as alongside.
  lineMargin: 2.6, lineSwing: .6,
  fieldPace: { easy: .815, medium: .787, hard: .78 }, fieldForm: 2.5, fieldSpread: 1.5, fieldAggression: 1.4,
  fieldFollow: { leadBraking: 1.6, wallRoom: 1.0, firstLap: { margin: 5, reaction: .5, closeIn: .8, wallRoom: 1.4 } },
  // Wet-look road at night: glossy asphalt and soft pools of colour under lanterns and neon
  // (src/circuit-water.js). Looks only; grip is dry.
  wetRoad: { performanceShare: .5 },
  // Water beside the road: the harbour along the Seafront Straight and Harbour Road, two terraced
  // pools of the reservoir along the Reservoir Run. The ground beside the road is sunk to hold
  // them (Course.basinWeight); `level` is the water's height, `deep` how far the floor lies below it.
  basins: [
    { id: 'seafront', side: -1, s0: 150, s1: 395, from: 12, to: 120, edge: 8, level: 11.8, deep: .8 },
    { id: 'harbour-road', side: -1, s0: 3262, s1: 3735, from: 12, to: 110, edge: 8, level: 11.8, deep: .8 },
    { id: 'reservoir-upper', side: -1, s0: 2300, s1: 2620, from: 14, to: 100, edge: 10, level: 15, deep: .8 },
    { id: 'reservoir-lower', side: -1, s0: 2700, s1: 3060, from: 14, to: 100, edge: 10, level: 12.9, deep: .8 },
  ],
  // Straight run-offs behind openings in the wall, on the outside of the two
  // slow corners (src/track-script-course.js).
  escapeRoads: [
    { id: 'casino-corner', piece: 'Casino Corner', run: 70, width: 10 },
    { id: 'lantern-hairpin', piece: 'Lantern Hairpin', run: 55, width: 9 },
  ],
  // Water beside the road: the harbour along the Seafront Straight and Harbour Road, two terraced
  // pools of the reservoir along the Reservoir Run. The ground beside the road is sunk to hold
  // them (Course.basinWeight); `level` is the water's height, `deep` how far the floor lies below it.
  basins: [
    { id: 'seafront', side: -1, s0: 150, s1: 395, from: 12, to: 120, edge: 8, level: 11.8, deep: .8 },
    { id: 'harbour-road', side: -1, s0: 3262, s1: 3735, from: 12, to: 110, edge: 8, level: 11.8, deep: .8 },
    { id: 'reservoir-upper', side: -1, s0: 2300, s1: 2620, from: 14, to: 100, edge: 10, level: 15, deep: .8 },
    { id: 'reservoir-lower', side: -1, s0: 2700, s1: 3060, from: 14, to: 100, edge: 10, level: 12.9, deep: .8 },
  ],
  script: [
    ['straight', 500, { name: 'Seafront Straight', width: 14 }],
    ['turn', 'L', 20, 300, { name: 'Lantern Kink' }],
    ['straight', 294, { name: 'Casino Approach' }],
    ['turn', 'R', 104, 22, { name: 'Casino Corner' }],
    ['straight', 150, { climb: 6 }],
    ['turn', 'L', 40, 60, { climb: 6, name: 'Temple Hill' }],
    ['straight', 78, { climb: 6 }],
    ['turn', 'R', 60, 35, { climb: 5, name: 'Bell Tower Bend' }],
    ['straight', 192, { climb: 4, width: 10 }],
    ['turn', 'L', 46.5, 32, { climb: 3, name: 'Old Town Esses 1' }],
    ['turn', 'R', 51.5, 30, { name: 'Old Town Esses 2' }],
    ['turn', 'L', 43, 36, { name: 'Old Town Esses 3' }],
    ['turn', 'R', 40, 41, { name: 'Old Town Esses 4' }],
    ['straight', 103, { name: 'Hillside' }],
    ['turn', 'L', 29.5, 60, { climb: -6, name: 'Precinct Bend' }],
    ['straight', 220, { climb: -6, name: 'Hairpin Approach', width: 12 }],
    ['turn', 'R', 175, 9, { climb: -2, name: 'Lantern Hairpin' }],
    ['straight', 99, { climb: -8 }],
    ['turn', 'L', 60, 45, { climb: -4, name: 'Fishmarket Bend', width: 14 }],
    ['straight', 827, { climb: -4, name: 'Reservoir Run' }],
    ['turn', 'R', 59, 120, { name: 'Reservoir Sweep' }],
    ['straight', 500, { name: 'Harbour Road' }],
    ['turn', 'R', 109, 60, { name: 'Harbour Turn' }],
    ['straight', 61, { name: 'Harbour Return' }],
  ],
  // Team Room intel (docs/CIRCUITS.md section 7b.1), written by Claude. Target
  // speeds and gears come from the reference lap; these notes give the line.
  intel: {
    sectors: [1000, 2260],
    flags: [
      { id: 'lantern-hairpin', kind: 'signature', s: 1990, title: 'Lantern Hairpin', camera: { back: 30, up: 1.2, ahead: 40 } },
      { id: 'casino', kind: 'overtaking', s: 790, title: 'Seafront into Casino Corner' },
      { id: 'harbour-turn', kind: 'overtaking', s: 3700, title: 'Harbour Road into Harbour Turn' },
      { id: 'old-town', kind: 'corner', s: 1420, title: 'Old Town Esses' },
      { id: 'reservoir-sweep', kind: 'corner', s: 3060, title: 'Reservoir Sweep' },
    ],
    notes: {
      'lantern-kink': { line: 'Flat out. A touch left, stay off the wall.', note: 'Only scary the first time. Keep your foot down.' },
      'casino-corner': { brakeBoard: 100, line: 'Brake straight, turn late, aim for the inside barrier.', note: 'The best place to pass. If you miss your braking point, take the escape road; do not try to make the turn.' },
      'temple-hill': { line: 'Middle of the road up the hill.', note: 'Walls on both sides from here. Neat beats brave.' },
      'bell-tower-bend': { line: 'Wide in, clip the inside, straight up.', note: 'The road narrows after this. Settle the car before the old town.' },
      'old-town-esses-1': { line: 'Left, right, left, right: one smooth line through all four.', note: 'Ten metres wide. Pick a line and commit; correcting here means a wall.' },
      'old-town-esses-2': { line: 'Kerb to kerb.', note: 'Keep the rhythm.' },
      'old-town-esses-3': { line: 'Kerb to kerb.', note: 'Keep the rhythm.' },
      'old-town-esses-4': { line: 'Run wide on the exit up the Hillside.', note: 'Get the exit right; the Hillside is short.' },
      'precinct-bend': { line: 'Stay right after the bend to set up the hairpin.', note: 'Downhill now. Line up on the right for the hairpin.' },
      'lantern-hairpin': { brakeBoard: 150, line: 'Far right on entry, turn late, use the whole road around.', note: 'The slowest corner in the game: about 30 km/h. Brake early, be patient, and drive out cleanly. Rushing it loses more than braking early.' },
      'fishmarket-bend': { line: 'Wide exit onto the Reservoir Run.', note: 'Everything you carry out of here lasts the length of the reservoir.' },
      'reservoir-sweep': { line: 'Turn in early and hold it, walls close on the outside.', note: 'Flat out if you are brave. A small lift if a car is alongside.' },
      'harbour-turn': { brakeBoard: 100, line: 'Brake straight, turn in, inside kerb.', note: 'Second chance to pass, and the last on the lap.' },
    },
  },
});

// The street (docs/CIRCUITS.md 5.2), laid out for the kit loader by src/circuit-kit-layout.js.
const TINTS = [0xe9d3b0, 0xd89a8a, 0x9cc0bb, 0xdcb25a, 0xa9b4d0, 0xc98562];
const STREET = {
  walls: { wall: 'concrete-wall', fence: 'catch-fence', tyres: 'tyre-wall' },
  paddock: {
    gantry: { at: -2.5 },
    garages: { side: 1, from: -92, to: 96, lane: 9 },
    stands: { side: -1, from: -58, to: 62, setback: 5 },
  },
  rows: [
    { id: 'casino-street', pieces: ['shopfront-a', 'shopfront-b'], from: 895, to: 1045, side: 'both' },
    { id: 'temple-hill', pieces: ['shopfront-a', 'shopfront-b'], from: 1112, to: 1250, side: 'both' },
    { id: 'old-town', pieces: ['shopfront-a', 'shopfront-b'], from: 1252, to: 1760, side: 'both', setback: 1.8, gap: .3 },
    { id: 'hairpin-street', pieces: ['shopfront-a', 'shopfront-b'], from: 1760, to: 2030, side: 'both', setback: 2.2 },
    { id: 'fishmarket', pieces: ['shopfront-b', 'shopfront-a'], from: 2083, to: 2255, side: 'both', setback: 3, density: .6 },
    { id: 'quay-front', pieces: ['shopfront-b'], from: 140, to: 394, side: 1, setback: 5, scale: [.9, 1.1], density: .6 },
  ],
  singles: [{ id: 'lantern-tower', at: { piece: 'Casino Corner', at: 'middle' }, lateral: -62, scale: 1.5 }],
  signs: { from: 905, to: 2250, every: 46, side: 'both', lift: 4.6 },
  strings: [
    { from: 920, to: 1040, every: 30 },
    { from: 1255, to: 1665, every: 27 },
    { from: 1985, to: 2125, every: 14 },
  ],
  boats: [{ basin: 'seafront', count: 11 }, { basin: 'harbour-road', count: 12 }],
};

// The placements take a third of a second to work out, so they are worked out the first time
// someone reads them (the kit loader, when this circuit's world is built), not when the game starts.
let placements = null;
export const HARBOUR_LIGHTS = Object.freeze(Object.defineProperty({ ...BASE }, 'kitPlacements', {
  enumerable: true, get: () => (placements ??= Object.freeze(buildKitPlacements(BASE, STREET))),
}));
