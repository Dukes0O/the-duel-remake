// Tremblant Woods (docs/CIRCUITS.md section 5.3): a rolling forest circuit with
// a plunge to a lake, crests, a hairpin at the end of a short spur and the long
// Timber Straight back. The road layout is Claude's; the autumn scenery, the
// lodge, lake, chairlift and the safety kit are placed below (P4-TREMBLANT).
//
// Redrawn by Claude, 10 October 2026: a clockwise loop. The top edge runs east
// from the lodge down to the lake and through the Fir Esses; Ridge Corner turns
// south; the road kinks east onto a short spur, turns back through Beaver
// Hairpin and runs the length of Timber Straight west; Devil's Chicane, then
// Lodge Bend and the climb north to the Final Turn. Closest separate stretches
// of road: 66 m centre to centre, at the hairpin spur (wall between).
import { buildTrackScript, defineScriptedCourse } from '../track-script.js';
import { hillHeight, hillLocal, hillReach, runWeight } from '../circuit-hills.js';

const BASE = {
  id: 'tremblant-woods', name: 'Tremblant Woods', flag: 'tremblant-woods',
  theme: 'alpine', stage: 18, kind: 'circuit', layoutVersion: 1,
  closed: true, laps: 3, hasRival: true, hasRadar: false, noTraffic: true, speedLimitMph: 100,
  airborne: true, terrainHalfWidth: 64, defaultMood: 'golden',
  sections: [
    { theme: 'alpine', name: 'Lodge and Lake', share: .35 },
    { theme: 'alpine', name: 'Ridge Run', share: .25 },
    { theme: 'alpine', name: 'Timber Straight', share: .40 },
  ],
  // Pine Drop runs straight into Lakeside Plunge, a right then a left with a crest
  // in the first: a line from kerb to kerb is more than a car can follow there.
  racingLine: { roadShare: .85, maxSlope: .08 },
  // The computer racers drive this much of their usual pace here (src/race-field-driver.js).
  // Found with tools/race-field-balance.mjs --course tremblant-woods: the test driver
  // wins about 90, 47 and 17% on Easy, Medium and Hard.
  fieldPace: .85,
  scriptStart: 100,
  script: [
    ['straight', 414, { climb: -6, name: 'Lodge Straight' }],
    ['turn', 'R', 60, 90, { crest: 2, climb: -10, name: 'Pine Drop' }],
    ['turn', 'L', 70, 50, { climb: -12, name: 'Lakeside Plunge' }],
    ['straight', 258, { climb: -4, name: 'Lakeshore' }],
    ['turn', 'R', 40, 55, { climb: 2, name: 'Fir Esses 1' }],
    ['turn', 'L', 35, 60, { climb: 2, name: 'Fir Esses 2' }],
    ['straight', 326, { crest: 2.5, climb: 12, name: 'Ridge Run' }],
    ['turn', 'R', 90.5, 45, { climb: 4, name: 'Ridge Corner' }],
    ['straight', 323, { climb: 6, name: 'Beaver Run' }],
    ['turn', 'L', 80, 40, { name: 'Beaver Kink' }],
    ['straight', 80, { name: 'The Spur' }],
    ['turn', 'R', 170.5, 22, { climb: 2, name: 'Beaver Hairpin' }],
    // Timber Straight carries the two crests of docs/CIRCUITS.md 5.3. A piece has
    // one crest, so the straight is three pieces; the second crest sits at about
    // s 2700 and the chairlift crosses the road right there.
    ['straight', 540, { climb: -3.2, crest: 1.5, name: 'Timber Straight' }],
    ['straight', 520, { climb: -3.2, crest: 2.5, name: 'Timber Straight' }],
    ['straight', 242, { climb: -1.6, name: 'Timber Straight' }],
    ['turn', 'R', 30, 60, { name: "Devil's Chicane 1" }],
    ['turn', 'L', 30, 60, { name: "Devil's Chicane 2" }],
    ['straight', 283, { climb: 4 }],
    ['turn', 'R', 114, 50, { climb: 6, name: 'Lodge Bend' }],
    ['straight', 500, { climb: 2, name: 'Lodge Climb' }],
    ['turn', 'R', 70, 70, { name: 'Final Turn' }],
  ],
  // Team Room intel (docs/CIRCUITS.md section 7b.1), written by Claude. Target
  // speeds and gears come from the reference lap; these notes give the line.
  intel: {
    sectors: [1240, 3330],
    flags: [
      { id: 'chairlift', kind: 'signature', s: 2700, title: 'Timber Straight and the chairlift', camera: { back: 40, up: 1.2, ahead: 90 } },
      { id: 'timber', kind: 'overtaking', s: 3170, title: "Timber Straight into Devil's Chicane" },
      { id: 'pine-drop', kind: 'corner', s: 290, title: 'Pine Drop' },
      { id: 'ridge-run', kind: 'crest', s: 1050, title: 'Ridge Run crest' },
      { id: 'beaver-hairpin', kind: 'corner', s: 1780, title: 'Beaver Hairpin' },
    ],
    notes: {
      'pine-drop': { line: 'Turn in before the crest, let the car fall into the right-hander.', note: 'The commitment corner. Fast and downhill over a crest; the careful lift a little, the brave do not.' },
      'lakeside-plunge': { line: 'Brake as the road levels, left, then straight along the lake.', note: 'The lake opens up in front of you. Do not stare at the view.' },
      'fir-esses-1': { line: 'Straight-line the esses, kerb to kerb.', note: 'Light right, light left. Barely a lift.' },
      'fir-esses-2': { line: 'Set up straight for the Ridge Run crest.', note: 'Be straight before the crest; the car takes off.' },
      'ridge-corner': { brakeBoard: 100, line: 'Wide in, late apex.', note: 'Heavy braking after the crest. Land, then brake.' },
      'beaver-kink': { line: 'Stay right onto the spur.', note: 'Lines you up for the hairpin.' },
      'beaver-hairpin': { brakeBoard: 100, line: 'Wide entry, slow in, fast out.', note: 'Everything here is about the exit: the longest straight in the game comes next.' },
      "devil-s-chicane-1": { brakeBoard: 100, line: 'Brake straight, right then left, use the kerbs.', note: 'The place to pass after Timber Straight. Out-brake them into the first part.' },
      "devil-s-chicane-2": { line: 'Exit wide, then hug the inside up to Lodge Bend.', note: 'A clean exit keeps them behind you.' },
      'lodge-bend': { line: 'Long right: patient on the throttle.', note: 'A long uphill corner. Throttle on gently, all the way round.' },
      'final-turn': { line: 'Wide exit onto Lodge Straight.', note: 'Speed onto the straight is your lap time.' },
    },
  },
};

// ---------------------------------------------------------------------------
// Scenery: where the kit pieces (public/assets/models/circuits/kits/) and the
// circuit's own lake, mist and hill stand. Everything is placed from the road
// below, so a change to the script above carries the scenery with it. Kit
// pieces are `{ id, s, lateral, heading, scale }`: s along the road, lateral
// across it (positive is left), both in metres. A piece on the right of the
// road with its front to the road turns +90 degrees; on the left, -90.
// `clear` keeps the planted pines that far from the piece; `lift` and `hill`
// tell circuit-effects.js how to move the piece once it has loaded.
// ---------------------------------------------------------------------------
const road = buildTrackScript(BASE);
const LENGTH = road.length;
const wrap = s => ((s % LENGTH) + LENGTH) % LENGTH;
const named = (name, nth = 0) => road.pieces.filter(item => item.name === name)[nth];
const halfAt = s => road.halfWidthAt(wrap(s));
const FACE_LEFT = Math.PI / 2, FACE_RIGHT = -Math.PI / 2;
// Roadside pieces face the road; `side` is -1 for the right of the road, +1 for the left.
const facing = side => side < 0 ? FACE_LEFT : FACE_RIGHT;
const kit = (id, s, lateral, extra = {}) => ({ id, s: wrap(s), lateral, heading: 0, scale: 1, ...extra });
// A small repeatable random stream (mulberry32), so the scenery is the same on every machine.
const stream = seed => () => {
  seed = (seed + 0x6D2B79F5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
// A row of pieces along the road from s0 to s1, every `step` metres.
const along = (id, s0, s1, step, lateral, extra = {}) => {
  const side = Math.sign(lateral), out = [];
  for (let s = s0; s <= s1 + 1e-6; s += step) out.push(kit(id, s, lateral, { heading: facing(side), ...extra }));
  return out;
};
// The outside of a corner is the side the road is turning away from.
const outside = item => -item.dir;
const barrier = (id, name, margin, gap, extra = {}) => {
  const corner = named(name), side = outside(corner);
  return along(id, corner.s0 - margin, corner.s1 + margin, 4.05, side * (halfAt((corner.s0 + corner.s1) / 2) + gap), extra);
};

const START = { gantry: 0, pits: [-12, 70], stands: [10, 70] };
const HILL = {
  s: 235, lateral: 112, along: 190, across: 84, height: 36, pines: 260,
  // Three runs down the slope toward the road, wide and a little crooked.
  runs: [
    { from: [-35, 8], to: [-78, -70], width: 20 },
    { from: [6, 10], to: [30, -76], width: 16 },
    { from: [48, 4], to: [118, -58], width: 22 },
  ],
};
const LAKE = { s: 690, lateral: 58, along: 190, across: 38, level: .75 };
const LIFT = (() => {
  // The chairlift crosses the road where the second crest on Timber Straight throws the cars into the air.
  const timber = road.pieces.filter(item => item.name === 'Timber Straight');
  const s = wrap((timber[1].s0 + timber[1].s1) / 2);
  const towers = [-130, -95, -60, -22, 22, 60, 95, 130];
  return { s, towers, lines: [-1.6, 1.6], height: 9.4, spacing: 26, speed: 2.4 };
})();

function paddock() {
  // The gantry's lamps face +z, so it turns round to face the cars coming up to the line.
  const out = [kit('start-gantry', START.gantry, 0, { heading: Math.PI })];
  out.push(...along('pit-garage', START.pits[0], START.pits[1], 7.4, -31));
  out.push(...along('pit-wall', START.pits[0] - 2, START.pits[1] + 2, 4.05, -22));
  for (let s = START.stands[0]; s <= START.stands[1]; s += 15) out.push(kit('grandstand', s, 31, { heading: FACE_RIGHT, clear: 10 }));
  return out;
}

function safety() {
  const out = [];
  // Armco on the outside of the fast corners, just beyond where a car can go.
  for (const name of ['Pine Drop', 'Lakeside Plunge', 'Ridge Corner', 'Lodge Bend', 'Final Turn']) out.push(...barrier('armco', name, 6, 2.6));
  // Tyre walls where the slow corners run out.
  out.push(...barrier('tyre-wall', 'Beaver Hairpin', -30, 4.4));
  out.push(...barrier('tyre-wall', 'Ridge Corner', -34, 5));
  // Braking boards (150, 100, 50 m) at the two corners the track script leaves without them;
  // the script's own board already stands before Beaver Hairpin. They face the oncoming cars.
  for (const name of ['Ridge Corner', "Devil's Chicane 1"]) {
    const corner = named(name), side = outside(corner);
    for (const distance of [150, 100, 50]) {
      const s = corner.s0 - distance, board = `braking-board-${distance}`;
      if (road.pieceAt(wrap(s)).kind === 'straight') out.push(kit(board, s, side * (halfAt(s) + 2.4), { heading: Math.PI }));
    }
  }
  // Marshal posts behind them.
  for (const [name, at] of [['Pine Drop', .5], ['Ridge Corner', .5], ['Beaver Hairpin', .3], ["Devil's Chicane 2", .6], ['Lodge Bend', .5]]) {
    const corner = named(name), side = outside(corner), s = corner.s0 + (corner.s1 - corner.s0) * at;
    out.push(kit('marshal-post', s, side * (halfAt(s) + 9), { heading: facing(side), clear: 4 }));
  }
  // The catch fence between the spur and Timber Straight: the two roads run side by side, 66 m apart.
  // Find which side of Timber Straight the spur is on, and fence both roads on that divide.
  const timber = named('Timber Straight'), spur = named('The Spur'), kink = named('Beaver Kink');
  const here = road.samples[Math.round(wrap(timber.s0 + 60) / road.step)], there = road.samples[Math.round(wrap(spur.s0) / road.step)];
  const side = Math.sign((there.x - here.x) * Math.cos(here.heading) - (there.z - here.z) * Math.sin(here.heading));
  out.push(...along('catch-fence', timber.s0 + 6, timber.s0 + 126, 4.05, side * (halfAt(timber.s0 + 60) + 3.4)));
  out.push(...along('catch-fence', kink.s0 + 36, spur.s1 - 4, 4.05, -side * (halfAt(spur.s0) + 3.4)));
  return out;
}

function lakeside() {
  // The dock reaches out from the shore toward the middle of the lake.
  return [kit('wooden-dock', LAKE.s, 17.5, { heading: FACE_RIGHT + Math.PI, clear: 6 })];
}

function lodge() {
  // On the lower slope of the hill, looking down the straight.
  const du = -72, dv = -34;
  return [kit('ski-lodge', HILL.s + du, HILL.lateral + dv, { heading: FACE_RIGHT, clear: 16, hill: 0 })];
}

function chairlift() {
  const out = [], { towers, lines, spacing } = LIFT;
  for (const lateral of towers) out.push(kit('chairlift-tower', LIFT.s, lateral, { heading: Math.PI / 2, clear: 5 }));
  lines.forEach((ds, line) => {
    for (let i = 0; i + 1 < towers.length; i++) {
      const a = towers[i], b = towers[i + 1];
      // The cable is drawn between the tower tops once it loads; it starts off the road.
      out.push(kit('chairlift-cable', LIFT.s + ds, Math.abs((a + b) / 2) < 25 ? 30 : (a + b) / 2, { lift: { role: 'cable', line, a, b } }));
    }
    const span = towers.at(-1) - towers[0], count = Math.floor(span / spacing);
    for (let k = 0; k < count; k++) out.push(kit('chairlift-chair', LIFT.s + ds, 40, { lift: { role: 'chair', line, k, count } }));
  });
  return out;
}

function trees() {
  const random = stream(0x7e11), ids = ['autumn-tree', 'autumn-tree-golden', 'autumn-tree-copper'], out = [];
  const avoid = (s, lateral) => {
    const p = wrap(s);
    const lake = Math.abs(p - LAKE.s) < LAKE.along + 20 && lateral > 0 && lateral < LAKE.lateral + LAKE.across + 14;
    const lift = Math.abs(p - LIFT.s) < 16;
    const start = p < 240 || p > LENGTH - 80;
    const bend = road.pieceAt(p);
    const inside = bend.kind === 'turn' && Math.sign(lateral) === bend.dir && Math.abs(lateral) < halfAt(p) + 40;
    const hill = hillReach(HILL, ...hillLocal(HILL, p, lateral)) < 1.1;
    return lake || lift || start || inside || hill || Math.abs(lateral) < 26;
  };
  // Groves of three or four, on both sides of the road all the way round.
  for (let grove = 0; out.length < 78 && grove < 400; grove++) {
    const s = random() * LENGTH, side = random() < .5 ? -1 : 1, lateral = side * (28 + random() * 40);
    if (avoid(s, lateral)) continue;
    const count = 3 + Math.floor(random() * 2);
    for (let i = 0; i < count; i++) {
      const ts = s + (random() - .5) * 22, tl = lateral + (random() - .5) * 16;
      if (avoid(ts, tl)) continue;
      out.push(kit(ids[(grove + i) % 3], ts, tl, { heading: random() * Math.PI * 2, scale: .85 + random() * .6, clear: 3.2 }));
    }
  }
  // And on the hill, off the ski runs.
  let onHill = 0;
  for (let attempt = 0; onHill < 26 && attempt < 800; attempt++) {
    const du = (random() * 2 - 1) * HILL.along * .8, dv = (random() * 2 - 1) * HILL.across * .8;
    if (hillReach(HILL, du, dv) > .8 || runWeight(HILL, du, dv) > .02) continue;
    out.push(kit(ids[attempt % 3], HILL.s + du, HILL.lateral + dv, { heading: random() * Math.PI * 2, scale: 1 + random() * .5, clear: 3.2, hill: 0 }));
    onHill++;
  }
  return out;
}

export const TREMBLANT_WOODS = defineScriptedCourse({
  ...BASE,
  // Planted pines keep out of the lake and the chairlift's cut through the forest;
  // the hill below plants its own.
  scenery: { clear: [
    { s0: LAKE.s - LAKE.along - 10, s1: LAKE.s + LAKE.along + 10, from: 8, to: LAKE.lateral + LAKE.across + 10 },
    { s0: LIFT.s - 7, s1: LIFT.s + 7, from: -135, to: 135 },
  ] },
  hills: [HILL],
  effects: { lake: LAKE, mist: { count: 12, height: 1.4, spread: .8 } },
  kitPlacements: [...paddock(), ...safety(), ...lakeside(), ...lodge(), ...chairlift(), ...trees()],
});
