// C2 rough road from docs/courses/eifel-crown.md, section 2.2.
// Keep the released expansion road in slot 9 until this preview is enabled.
import {defineScriptedCourse, buildTrackScript} from '../track-script.js';

const roadDefinition = defineScriptedCourse({
  id: 'eifel-crown', name: 'Eifel Crown', flag: 'eifel-crown',
  theme: 'alpine', stage: 9, layoutSeed: 1989, layoutVersion: 3, kind: 'circuit',
  closed: true, laps: 2, hasRival: true, hasRadar: false, speedLimitMph: 65,
  airborne: true, terrainHalfWidth: 64, markings: 'circuit', defaultMood: 'overcast',
  sections: [
    {theme: 'alpine', name: 'Forest Esses', share: .42},
    {theme: 'alpine', name: 'Crown Ridge', share: .35},
    {theme: 'alpine', name: 'Valley Sweep', share: .23},
  ],
  scriptStart: 60,
  script: [
    ['straight', 255, {climb: 1.5, name: 'Lodge Straight', width: 14}],
    ['turn', 'L', 30, 300, {climb: 14, name: 'Start Kink'}],
    ['straight', 53, {climb: 5.3}],
    ['turn', 'R', 45.5, 180, {climb: 19.7, name: 'Spruce Bend'}],
    ['straight', 140, {climb: 11.7}],
    ['turn', 'L', 81.5, 130, {climb: 4.7, name: 'First Ess'}],
    ['straight', 53, {climb: -2}],
    ['turn', 'R', 47, 120, {climb: -8.9, name: 'Second Ess'}],
    ['straight', 96, {climb: -9.3}],
    ['turn', 'L', 62, 110, {climb: -16.5, name: 'Third Ess'}],
    ['straight', 113, {climb: -10.6}],
    ['turn', 'R', 48.5, 130, {climb: -5.2, name: 'Fourth Ess'}],
    ['straight', 96, {climb: 9.7, crest: 2.5, name: 'Forest Dip'}],
    ['turn', 'L', 85.5, 140, {climb: 46.1, name: 'Esses Exit'}],
    ['straight', 149, {climb: 24.8, name: 'Crown Climb'}],
    ['turn', 'R', 41.5, 170, {climb: 12.6, name: 'Crown Kink'}],
    ['straight', 191, {climb: -10.2, name: 'Ridge Top'}],
    ['turn', 'L', 120, 80, {climb: -36.9, name: 'Crag Corner'}],
    ['straight', 98, {climb: -18.9}],
    ['turn', 'R', 56.5, 85, {climb: -17.8, name: 'Castle Bend'}],
    ['straight', 106, {climb: -11}],
    ['turn', 'L', 87, 108, {climb: -2, name: 'Wall Left'}],
    ['straight', 170, {climb: 11.6, name: 'Village Street'}],
    ['turn', 'R', 48.5, 130, {climb: 16.5, name: 'Beech Right'}],
    ['straight', 142, {climb: 17}],
    ['turn', 'L', 77.5, 150, {climb: 15.9, name: 'Hatch Sweep'}],
    ['straight', 261, {climb: -15.3, name: 'Ridge Straight'}],
    ['turn', 'R', 41.5, 140, {climb: -15.6, name: 'Pine Right'}],
    ['straight', 198, {climb: -16.4}],
    ['turn', 'L', 70.5, 150, {climb: 5.2, name: 'Valley Brow'}],
    ['straight', 177, {climb: -7.6}],
    ['turn', 'R', 38, 220, {climb: -11.9, name: 'Reservoir Right'}],
    ['straight', 134, {climb: -.4}],
    ['turn', 'L', 114, 70, {name: 'Last Turn'}],
  ],
});

const road = buildTrackScript(roadDefinition);
// The script's automatic boards are for radii under 40 m. These three named
// braking corners need their own existing kits, on the outside of the road.
const boards = ['Crag Corner', 'Castle Bend', 'Last Turn'].flatMap(name => {
  const corner = road.pieces.find(piece => piece.name === name);
  return [150, 100, 50].map(distance => Object.freeze({
    id: `braking-board-${distance}`, s: road.phase(corner.s0 - distance),
    lateral: -corner.dir * (road.halfWidthAt(corner.s0 - distance) + 2.4), heading: Math.PI,
  }));
});

export const EIFEL_CROWN = Object.freeze({
  ...roadDefinition,
  scenery: Object.freeze({trees: 800, rocks: 80, mountains: false,
    forest: Object.freeze({from: 23, to: 60, spacing: 3.8, rows: 7, thin: .12,
      scale: Object.freeze([1.1, 2]), jitter: .8}),
  }),
  kitPlacements: Object.freeze(boards),
});

export const manifest = Object.freeze({
  id: 'eifel-crown', flag: 'eifel-crown', state: 'dev', slot: 9, price: 1400,
  grandPrix: true, releaseOrder: 12,
  driver: Object.freeze({car: 'stuttgart_959s', driverId: 'club', controller: 'racing-line', skill: .95}),
});
