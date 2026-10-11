// Tremblant Woods (docs/CIRCUITS.md section 5.3): a rolling forest circuit with
// a plunge to a lake, crests, a hairpin at the end of a short spur and the long
// Timber Straight back. Road layout only; autumn light, the lodge, lake,
// chairlift and the full field belong to Codex's P4-TREMBLANT card.
//
// Redrawn by Claude, 10 October 2026: a clockwise loop. The top edge runs east
// from the lodge down to the lake and through the Fir Esses; Ridge Corner turns
// south; the road kinks east onto a short spur, turns back through Beaver
// Hairpin and runs the length of Timber Straight west; Devil's Chicane, then
// Lodge Bend and the climb north to the Final Turn. Closest separate stretches
// of road: 66 m centre to centre, at the hairpin spur (wall between).
import { defineScriptedCourse } from '../track-script.js';

export const TREMBLANT_WOODS = defineScriptedCourse({
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
});
