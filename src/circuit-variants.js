import {buildTrackScript} from './track-script.js';

// Course-owned variants keep the parent descriptor and private lazy getters intact.
export function copyCourseDescriptor(parent, changes) {
  const descriptors = Object.getOwnPropertyDescriptors(parent);
  for (const [key, value] of Object.entries(changes))
    descriptors[key] = {value, enumerable: true, writable: false, configurable: false};
  return Object.freeze(Object.defineProperties({}, descriptors));
}

// `state` is the release switch: a new variant stays 'dev' (hidden) until its own module turns it 'on'.
export function lightVariant(parent, parentManifest, {id, name, look, releaseOrder, state = 'dev'}) {
  if (!['night', 'dusk'].includes(look)) throw Error('A lighting variant needs the existing night or dusk look.');
  const lightPath = Object.freeze({axis: parent.lightPath?.axis ?? 'distance',
    ...(parent.lightPath?.palette ? {palette: parent.lightPath.palette} : {}),
    keyframes: Object.freeze([Object.freeze({at: 0, look})])});
  const definition = copyCourseDescriptor(parent, {id, name, flag: id, defaultMood: 'clear',
    timeOfDay: look === 'night' ? 'night' : undefined, lightPath});
  const manifest = Object.freeze({id, flag: id, state, price: 0, grandPrix: true, releaseOrder,
    driver: parentManifest.driver,
    unlock: Object.freeze({kind: 'spotted-from-air', defaultEventId: parent.id})});
  return Object.freeze({definition, manifest});
}


// Reverse coordinates follow native reversePieces, including the shifted start.
// Road-space longitudinal and lateral axes both flip; the world rotates by PI.
// An open road (one run from start to finish) has no loop to rotate: the new start is the old finish, so a station is
// simply `length - s`, and the new frame is the old one turned about that point so the reversed road still begins at
// the origin heading 0 (`place`). `adjust(changes, helpers)` lets a course edit the fields only it has (its sections,
// sound spot, mist) after the shared mapping is done.
export function reverseVariant(parent, parentManifest, {id, name, releaseOrder, state = 'dev', scriptStart = parent.scriptStart, placements, adjust}) {
  const road = buildTrackScript(parent), length = road.length, open = parent.closed === false;
  const offset = open ? length : scriptStart - parent.scriptStart;
  const wrap = s => ((s % length) + length) % length;
  const station = open ? s => length - s : s => wrap(offset - s);
  const range = (from, to) => {const start = station(to);return [start, start + to - from];};
  const point = p => ({...p, ...(Number.isFinite(p.s) ? {s: station(p.s)} : {}),
    ...(Number.isFinite(p.lateral) ? {lateral: -p.lateral} : {}),
    ...(Number.isFinite(p.heading) ? {heading: p.heading + Math.PI} : {})});
  const basin = b => ({...point(b), orientation: -1});
  const spans = (rows, keys = ['from', 'to']) => (rows ?? []).flatMap(row => {
    const [a,b] = range(row[keys[0]], row[keys[1]]), side = typeof row.side === 'number' ? {side: -row.side} : {};
    const mapped = {...row, ...side, [keys[0]]: a, [keys[1]]: Math.min(b, length)};
    return b > length ? [mapped, {...mapped, [keys[0]]: 0, [keys[1]]: b - length}] : [mapped];
  });
  const sample = road.samples[Math.min(road.count - 1, Math.floor(wrap(offset) / road.step))];
  const next = road.samples[road.samples.indexOf(sample) + 1], t = (wrap(offset) - sample.s) / road.step;
  const anchor = open ? {x: road.samples.at(-1).x, z: road.samples.at(-1).z}
    : {x: sample.x + (next.x - sample.x) * t, z: sample.z + (next.z - sample.z) * t};
  // A closed loop ends heading as it began, so its reverse is a plain half turn. An open road ends at its own heading
  // and the reversed road starts at heading 0: turn the world by the difference.
  const turn = open ? -(road.samples.at(-1).heading + Math.PI) : Math.PI;
  const place = (x, z) => open
    ? {x: (x - anchor.x) * Math.cos(turn) + (z - anchor.z) * Math.sin(turn), z: -(x - anchor.x) * Math.sin(turn) + (z - anchor.z) * Math.cos(turn)}
    : {x: anchor.x - x, z: anchor.z - z};
  const effects = parent.effects && {...parent.effects,
    ...(parent.effects.lake ? {lake: basin(parent.effects.lake)} : {}),
    ...(parent.effects.lift ? {lift: {...parent.effects.lift, s: station(parent.effects.lift.s),
      towers: parent.effects.lift.towers.map(x => -x).reverse(), lines: parent.effects.lift.lines.map(x => -x).reverse()}} : {}),
    ...(parent.effects.backdrop ? {backdrop: {...parent.effects.backdrop, hills: parent.effects.backdrop.hills.map(h => ({...h,
      ...place(h.x, h.z), angle: (h.angle ?? 0) + turn}))}} : {})};
  let changes = {id, name, flag: id, reverse: true, scriptStart, intel: undefined, completeTerrainRibbon: true,
    ...(open ? {baseHeight: road.samples.at(-1).y} : {}),
    terrainDonor: Object.freeze({definition: parent, offset}),
    ...(parent.pitLane ? {pitLane: {...parent.pitLane, side: parent.pitLane.side === 'left' ? 'right' : 'left'}} : {}),
    ...(parent.ridgeLandform ? {ridgeLandform: {...parent.ridgeLandform, side: 1,
      hillside: range(...parent.ridgeLandform.hillside), ridge: range(...parent.ridgeLandform.ridge)}} : {}),
    ...(parent.basins ? {basins: parent.basins.map(basin)} : {}),
    ...(parent.hills ? {hills: parent.hills.map(h => ({...point(h), orientation: -1,
      pads: h.pads?.map(p => ({...p, du: -p.du, dv: -p.dv})),
      runs: h.runs?.map(r => ({...r, from: r.from.map(x => -x), to: r.to.map(x => -x)}))}))} : {}),
    ...(effects ? {effects} : {}),
    ...(parent.scenery?.clear ? {scenery: {...parent.scenery, clear: spans(parent.scenery.clear, ['s0','s1']).map(r => ({...r, from: -r.to, to: -r.from}))}} : {}),
    ...(parent.streetLight?.sodium ? {streetLight: {...parent.streetLight, sodium: {...parent.streetLight.sodium,
      from: station(parent.streetLight.sodium.to), to: station(parent.streetLight.sodium.from)}}} : {}),
    ...(parent.waterside ? {waterside: {...parent.waterside,
      lamps: spans(parent.waterside.lamps), ...(parent.waterside.palms ? {palms: spans(parent.waterside.palms)} : {}),
      ...(parent.waterside.marina ? {marina: {...parent.waterside.marina, centre: -(parent.waterside.marina.centre ?? 0)}} : {}),
      ...(parent.waterside.lighthouse ? {lighthouse: {...parent.waterside.lighthouse, at: parent.waterside.lighthouse.at.map(x => -x)}} : {})}} : {}),
    ...(parent.reviewFrames ? {reviewFrames: parent.reviewFrames.map(f => ({...point(f), label: f.label.replaceAll('on the left','on the right')}))} : {}),
    ...(parent.circuitLandmarks ? {circuitLandmarks: parent.circuitLandmarks.map(p => ({...point(p),
      ...(p.houses ? {houses: p.houses.map(point)} : {}), ...(p.lamps ? {lamps: p.lamps.map(point)} : {}),
      ...(p.id === 'pit-timing' ? {s: 45, lateral: -p.lateral} : {})}))} : {})};
  if (adjust) changes = adjust(changes, {station, range, spans, place, turn, length});
  let definition = copyCourseDescriptor(parent, changes), kits = null;
  definition = copyCourseDescriptor(definition, {lengthU: buildTrackScript(definition).length});
  const mappedKit = p => {
    if (p.id === 'start-gantry') return {...p, s: 0}; // Face the incoming race, not the old one.
    return {...point({...p, heading: p.heading ?? 0}), ...(p.ride ? {ride: {...p.ride,
      line: parent.effects.lift.lines.length - 1 - p.ride.line,
      ...(Number.isFinite(p.ride.a) ? {a: -p.ride.a, b: -p.ride.b} : {}),
      ...(Number.isInteger(p.ride.k) ? {k: (p.ride.count - p.ride.k) % p.ride.count} : {})}} : {})};
  };
  // Private parent getter is evaluated only when this new course's kit is requested.
  const descriptors = Object.getOwnPropertyDescriptors(definition);
  descriptors.kitPlacements = {enumerable: true, get: () => {
    if (kits) return kits;
    const rows = placements ? placements(definition, {point, spans, station, mappedKit}) : parent.kitPlacements.map(mappedKit);
    // The existing lift animation walks towers in increasing lateral order.
    // Reverse both cable-line identity and chair travel so it still follows the physical donor.
    const towers = rows.filter(p => p.id === 'chairlift-tower').sort((a,b) => a.lateral - b.lateral);
    let tower = 0;
    kits = Object.freeze(rows.map(p => Object.freeze(p.id === 'chairlift-tower' ? towers[tower++] : p)));
    return kits;
  }};
  definition = Object.freeze(Object.defineProperties({}, descriptors));
  const manifest = Object.freeze({id, flag: id, state, price: 0, grandPrix: true, releaseOrder,
    driver: parentManifest.driver, unlock: Object.freeze({kind: 'spotted-from-air', defaultEventId: parent.id})});
  return Object.freeze({definition, manifest});
}
