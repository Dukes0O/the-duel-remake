// Headings and maps (docs/LAB.md 4.2): a map table with a compass, a ruler and the pilot's map. The pads and their
// positions are the pilot map's own (heli-jobs.js mapKm, north is +z); a heading is 0 north, 90 east, 180 south,
// 270 west, and one map unit stands for one kilometre.
import {destinationsFor, bearing} from '../../heli/heli-jobs.js';
import {control, choice, makeBench} from './bench-core.js';

const PADS = destinationsFor({summitRun: true});
const IDS = Object.keys(PADS);
export const MAP_UNIT_METRES = 1000;

const controls = [
  choice('from', 'From', IDS, IDS[0]), choice('to', 'To', IDS, IDS[2]),
  control('headingDeg', 'Heading', 'degrees', 0, 359, 1, 0),
  control('rulerUnits', 'Ruler', 'map units', 0, 30, 0.1, 0),
];

// The compass heading from one pad to another, by the game's own bearing, and the distance in map units.
export function leg(from, to) {
  const unit = bearing(from, to, {summitRun: true});
  if (!unit) return null;
  const a = PADS[from].mapKm, b = PADS[to].mapKm;
  return {headingDeg: (Math.atan2(unit.x, unit.z) * 180 / Math.PI + 360) % 360, distanceUnits: Math.hypot(b.x - a.x, b.z - a.z)};
}
const turnOff = (a, b) => Math.abs((a - b + 540) % 360 - 180);

export const headingsBench = makeBench({
  id: 'headings', controls, cues: [],
  run({from, to, headingDeg, rulerUnits}) {
    const truth = leg(from, to);
    if (!truth) return {from, to, truth: null, correct: false};
    const headingOffDeg = turnOff(headingDeg, truth.headingDeg), distanceOffShare = Math.abs(rulerUnits - truth.distanceUnits) / truth.distanceUnits;
    return {from, to, truth, metres: rulerUnits * MAP_UNIT_METRES, headingOffDeg, distanceOffShare,
      correct: headingOffDeg <= 5 && distanceOffShare <= 0.03};
  },
  goalMet: history => history.some(({result}) => result.correct),
  facts: () => ({north: (Math.atan2(0, 1) * 180 / Math.PI + 360) % 360, woodsToPanorama: leg('tremblant-woods', 'panorama-ridge'),
    woodsToSnow: leg('tremblant-woods', 'tremblant-snow'), unitMetres: MAP_UNIT_METRES}),
});
