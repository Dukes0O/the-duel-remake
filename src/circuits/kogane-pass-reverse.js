import {KOGANE_PASS, manifest as parentManifest} from './kogane-pass.js';
import {reverseVariant} from '../circuit-variants.js';
import {buildTrackScript} from '../track-script.js';

// The climb: the same mountain road driven from the village at the foot up to the lake (an open road, so the reversed
// road starts where the downhill run finished). Everything standing beside the road keeps its place on the mountain;
// what depends on the direction of travel (corner warnings, mirrors, chevron boards, the lamp row) is laid again for
// the climb.
const ROAD = buildTrackScript(KOGANE_PASS);
const isWall = id => id === 'armco-white' || id === 'concrete-wall' || id.startsWith('stone-retaining-wall');
const isWarning = id => id === 'curve-mirror' || id === 'chevron-board' || id.startsWith('braking-board-');
const LAMPS = KOGANE_PASS.waterside.lamps[0];

function climbPlacements(d, {mappedKit}) {
  const road = buildTrackScript(d), length = road.length;
  const rows = KOGANE_PASS.kitPlacements.filter(p => p.id !== 'start-gantry' && !isWarning(p.id)).map(mappedKit).map(p => {
    if (!isWall(p.id)) return p;
    // A wall keeps its distance from the road edge; the climb blends its widths at the other end of each bend.
    const gap = Math.abs(p.lateral) - ROAD.halfWidthAt(length - p.s);
    return {...p, lateral: Math.sign(p.lateral) * (road.halfWidthAt(p.s) + gap)};
  });
  // Mirrors and boards stand beyond the outside wall of each hairpin as it now comes, with the arrow into the turn.
  for (const piece of road.pieces.filter(piece => piece.name?.endsWith('Hairpin'))) {
    const side = -piece.dir;
    rows.push({id: 'curve-mirror', s: piece.s0 - 8, lateral: side * 9.5, heading: side > 0 ? -Math.PI / 2 : Math.PI / 2});
    for (const t of [.18, .4, .62, .84])
      rows.push({id: 'chevron-board', s: piece.s0 + (piece.s1 - piece.s0) * t, lateral: side * 9.6, heading: Math.PI / 2});
  }
  // The same gantry marks the start (45 m in) and the finish, as on the descent.
  rows.push({id: 'start-gantry', s: 45, lateral: 0, heading: Math.PI, scale: 1},
    {id: 'start-gantry', s: length - 2, lateral: 0, heading: Math.PI, scale: 1});
  for (const board of road.boards) rows.push({id: `braking-board-${board.distance}`, s: board.s,
    lateral: board.side * (road.halfWidthAt(board.s) + 2.4), heading: Math.PI, scale: 1});
  return rows;
}

// Fields only this course has, moved to the climb: the section names in the new order, the shrine bell, the mist, the
// forest across the lake, the lamp row and the lamp light pools (which stand at fixed spots on the ground).
function climbFields(changes, {station, range, spans, place, length}) {
  const flip = rows => spans(rows, ['s0', 's1']).map(r => ({...r, from: -r.to, to: -r.from}));
  const sodium = KOGANE_PASS.scenery.lampWash;
  const lampWash = {...sodium, pools: sodium.pools.map(([x, z]) => { const at = place(x, z); return [at.x, at.z]; })};
  const last = Math.floor((length - 20 - LAMPS.from) / LAMPS.every);
  const [from] = range(LAMPS.from, LAMPS.from + LAMPS.every * last);
  const shore = KOGANE_PASS.scenery.shoreForest;
  const kitLook = Object.fromEntries(Object.entries(KOGANE_PASS.kitLook).map(([id, look]) =>
    [id, look.wash === sodium ? {...look, wash: lampWash} : look]));
  return {...changes,
    sections: KOGANE_PASS.sections.slice().reverse(),
    landmarkSound: {...KOGANE_PASS.landmarkSound, s: station(KOGANE_PASS.landmarkSound.s)},
    kitLook,
    scenery: {...changes.scenery, lampWash,
      shoreForest: {...shore, sides: shore.sides.map(side => -side),
        ranges: shore.ranges.map(({fadeOut, ...r}) => ({...r, from: station(r.to), to: Math.min(station(r.from), length - .01), fadeIn: fadeOut})),
        clear: flip(shore.clear)}},
    effects: {...changes.effects, valleyMist: KOGANE_PASS.effects.valleyMist.map(bank =>
      ({...bank, s: station(bank.s), lateral: -bank.lateral}))},
    waterside: {...changes.waterside, lamps: [{...LAMPS, side: -LAMPS.side, from, to: from + LAMPS.every * last}]},
    // The ploughed arrival terrace belongs to the old finish, which is now the start, and the lake end has none.
    finishArea: false,
  };
}

export const {definition, manifest} = reverseVariant(KOGANE_PASS, parentManifest, {
  id: 'kogane-pass-reverse', name: 'Kogane Pass Reverse', releaseOrder: 16,
  placements: climbPlacements, adjust: climbFields,
});
