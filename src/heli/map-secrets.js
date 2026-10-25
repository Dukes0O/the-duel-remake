// The pilot's map secrets (docs/PILOT_MAP.md section 5): the five secret
// courses found from the air, the Table, and the map record they keep. Rules
// only: no graphics, no clock, no randomness. The session (heli-session.js)
// calls these; the screen draws what they report.
import {createHeliGround} from './heli-ground.js';
import {MAP_SAVE_VERSION, mapRecordOf, mapBlocked, writeMapRecord} from './heli-save.js';
import {placeById} from './pilot-map-data.js';

// ---- The five secret courses (section 5.1) --------------------------------------
// Each is a variant of a course, found by spotting a sign on that course that
// cannot be seen from the road: flat painted marks and lights that face up. The
// sign's place is where the packet puts it, beside the road and clear of scenery
// (signClear). x and z are in the course's own frame. A variant needs its own
// switch on as well; while it is dev, its sign is not there.
export const SECRET_SIGNS = Object.freeze([
  Object.freeze({id: 'tremblant-woods-reverse', course: 'tremblant-woods', name: 'Tremblant Woods Reverse', x: -50.5, z: 561.1,
    sign: 'Arrows painted on an old logging track by the lake, pointing the wrong way round the lap'}),
  Object.freeze({id: 'panorama-ridge-reverse', course: 'panorama-ridge', name: 'Panorama Ridge Reverse', x: 929.2, z: 561.3,
    sign: 'A second start grid painted at the far end of the Mountain Straight, facing back up the hill'}),
  Object.freeze({id: 'panorama-ridge-night', course: 'panorama-ridge', name: 'Panorama Ridge Night', x: 1546.7, z: 250.7,
    sign: 'A ring of camp-fire pits on the summit lookout, where the night crowd watches'}),
  Object.freeze({id: 'harbour-lights-reverse', course: 'harbour-lights', name: 'Harbour Lights Reverse', x: -340.5, z: -171,
    sign: 'A chalk start line on the harbour wall, the wrong way round'}),
  Object.freeze({id: 'harbour-lights-dusk', course: 'harbour-lights', name: 'Harbour Lights Dusk', x: -130, z: 270,
    sign: 'A lighthouse on the breakwater whose lamp turns only from the air\'s angle'}),
]);
export const SECRET_IDS = Object.freeze(SECRET_SIGNS.map(sign => sign.id));
export const signById = id => SECRET_SIGNS.find(sign => sign.id === id) ?? null;

// A sign stands off the road (a road half width and 6 m), out of the water and with no
// scenery within 8 m. Slopes do not matter: it is paint, not a landing.
export function signClear(course, ground, x, z) {
  const near = course.nearest(x, z);
  if (Math.abs(near.lateral) < course.roadHalfWidthAt(near.s) + 6) return false;
  if (ground.water(x, z) !== null) return false;
  const level = ground.height(x, z);
  return ground.near(x, z, 8).every(o => o.top <= level + 0.5 && o.shape !== 'cone');
}

// Spotting: hover over a sign. The helicopter must be within 25 m of it sideways, between 2 and 60 m
// over its ground, moving no faster than 6 m/s, for 3 s in a row (it starts again if the pilot leaves).
export const SPOT = Object.freeze({radius: 25, minHeight: 2, maxHeight: 60, maxSpeed: 6, seconds: 3});

export function createSpotter() { return {id: null, seconds: 0}; }

// One step. `signs` are the signs that can be found now (this course, switch on, not found yet).
// Returns the sign found this step, or null.
export function stepSpotter(spotter, heli, ground, signs, dt) {
  if (heli && !heli.onGround) {
    const speed = Math.hypot(heli.vx, heli.vy, heli.vz);
    for (const sign of signs) {
      const above = heli.y - ground.height(sign.x, sign.z);
      if (Math.hypot(heli.x - sign.x, heli.z - sign.z) > SPOT.radius || above < SPOT.minHeight || above > SPOT.maxHeight || speed > SPOT.maxSpeed) continue;
      if (spotter.id !== sign.id) { spotter.id = sign.id; spotter.seconds = 0; }
      spotter.seconds += dt;
      if (spotter.seconds >= SPOT.seconds - 1e-9) { spotter.id = null; spotter.seconds = 0; return sign; }
      return null;
    }
  }
  spotter.id = null; spotter.seconds = 0;
  return null;
}

// ---- The map record (section 6) ---------------------------------------------------------------------------------------
// profile.heli.map = {version: 1, seen: [<place>], found: [<secret>], table: <true once landed>}. Optional: an old save
// reads as nothing found. The save keeps the record (heli-save.js: names a later game wrote are kept and mean nothing
// here, a later version is left exactly as it was and every write over it is refused).
export const MAP_VERSION = MAP_SAVE_VERSION;
const MAP_FULL = 'The map record is full.';
export const createMap = () => ({version: MAP_VERSION, seen: [], found: [], table: false});

// The record this game can read, for any profile. A table landed on is also seen.
export function mapOf(profile) {
  const stored = mapRecordOf(profile);
  const map = {...stored, seen: [...stored.seen], found: [...stored.found]};
  if (map.table && !map.seen.includes(TABLE_ID)) map.seen.push(TABLE_ID);
  return map;
}

export const hasFound = (profile, id) => mapOf(profile).found.includes(id);
export const hasSeen = (profile, id) => mapOf(profile).seen.includes(id);

// The profile with a secret found. {ok, already, profile}, or {ok: false, reason, profile} for a name that is no secret or a
// record this game must not write over.
export function noteFound(profile, id) {
  if (!SECRET_IDS.includes(id)) return {ok: false, reason: 'Not a secret course.', profile};
  const blocked = mapBlocked(profile);
  if (blocked) return {ok: false, reason: blocked, profile};
  const stored = mapRecordOf(profile);
  if (stored.found.includes(id)) return {ok: true, already: true, profile};
  const written = writeMapRecord(profile, {...stored, found: [...stored.found, id]});
  // A list already at the save's limit cannot take another name: nothing is found.
  if (written.ok && !written.profile.heli.map.found.includes(id)) return {ok: false, reason: MAP_FULL, profile};
  return {...written, already: false};
}

// The profile with a place seen. Same answers as noteFound.
export function noteSeen(profile, id) {
  if (!placeById(id)) return {ok: false, reason: 'Not a place on the map.', profile};
  const blocked = mapBlocked(profile);
  if (blocked) return {ok: false, reason: blocked, profile};
  const stored = mapRecordOf(profile);
  if (stored.seen.includes(id)) return {ok: true, already: true, profile};
  const written = writeMapRecord(profile, {...stored, seen: [...stored.seen, id]});
  if (written.ok && !written.profile.heli.map.seen.includes(id)) return {ok: false, reason: MAP_FULL, profile};
  return {...written, already: false};
}

// ---- The Table (section 5.2) ----------------------------------------------------------------------------------
export const TABLE_ID = 'the-table';
// A leg whose straight line (between the places' table positions) passes within this far of the Table brings the call.
export const TABLE_PASS_KM = 4;
export const TABLE_PAY = 500;
// Roger's call on arrival. No recording yet (it needs the voice service): the screen shows the words, and the radio
// plays the line once it is in HELI_RADIO_LINES.
export const TABLE_CALL = Object.freeze({line: 'heli.radio.table.spotted', voice: 'roger',
  text: 'Kestrel One, odd thing back there. Flat-topped mesa off your left, looked like a tower on top.'});
export const TABLE_FOUND_TEXT = 'The Table: an old fire lookout, the wreck of a 1950s bush plane and the pilot\'s logbook. Its last page marks a red car on the bottom off the Pacific cove.';

function distanceToSegment(p, a, b) {
  const dx = b.x - a.x, dz = b.z - a.z, span = dx * dx + dz * dz;
  const k = span === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.z - a.z) * dz) / span));
  return Math.hypot(p.x - (a.x + dx * k), p.z - (a.z + dz * k));
}

// Does the cruise leg between two places (ids on the map) pass close enough to the Table to see it?
export function legPassesTable(from, to) {
  const a = placeById(from)?.at, b = placeById(to)?.at, table = placeById(TABLE_ID)?.at;
  if (!a || !b || !table || from === TABLE_ID || to === TABLE_ID) return false;
  return distanceToSegment(table, a, b) <= TABLE_PASS_KM;
}

// First landing on top: 500 credits, once; the map's last blank corner is filled in (table: true).
// {ok, already, paid, profile}, or {ok: false, reason, profile} over a record this game must not write over.
export function claimTable(profile) {
  const blocked = mapBlocked(profile);
  if (blocked) return {ok: false, already: false, paid: 0, reason: blocked, profile};
  const stored = mapRecordOf(profile);
  if (stored.table) return {ok: true, already: true, paid: 0, profile};
  const wallet = Number.isFinite(profile?.credits) ? Math.max(0, Math.floor(profile.credits)) : 0;
  const total = Math.min(1_000_000_000, wallet + TABLE_PAY);
  const seen = stored.seen.includes(TABLE_ID) ? stored.seen : [...stored.seen, TABLE_ID];
  const written = writeMapRecord(profile, {...stored, seen, table: true}, {credits: total});
  if (written.ok && !written.profile.heli.map.seen.includes(TABLE_ID)) return {ok: false, already: false, paid: 0, reason: MAP_FULL, profile};
  return {ok: written.ok, already: false, paid: total - wallet, profile: written.profile};
}

// The mesa, in its own frame (the middle of the top is the origin; north is +z). A flat top 90 m over the desert,
// cliffs on every side, an old dirt strip (an oval loop) with the lookout, the wreck and the logbook beside it.
export const TABLE = Object.freeze({
  topY: 90, floorY: 0, topRadius: 130, cliffWidth: 20,
  strip: Object.freeze({rx: 50, rz: 28, halfWidth: 4, samples: 96}),
  tower: Object.freeze({x: -60, z: -55, radius: 3.5, height: 14}),
  wreck: Object.freeze({x: -85, z: 60, heading: 2.2, radius: 6, height: 2}),
  logbook: Object.freeze({x: -60, z: -55}),
});

const smooth = t => { const k = Math.min(1, Math.max(0, t)); return k * k * (3 - 2 * k); };
export const tableHeight = (x, z) => TABLE.floorY + (TABLE.topY - TABLE.floorY) * (1 - smooth((Math.hypot(x, z) - TABLE.topRadius) / TABLE.cliffWidth));

// The hand-made world the session loads when you fly to the Table: it answers the few things a course is asked
// (where the road is, how wide, where the start is, how long) so the usual landing-zone search works on it.
export function createTableWorld() {
  const {rx, rz, halfWidth, samples: count} = TABLE.strip;
  // The oval, resampled to even steps along its length.
  const fine = [];
  for (let i = 0; i < 2880; i++) { const t = i / 2880 * Math.PI * 2; fine.push({x: rx * Math.cos(t), z: rz * Math.sin(t)}); }
  const cumulative = [0];
  for (let i = 1; i <= fine.length; i++) cumulative.push(cumulative[i - 1] + Math.hypot(fine[i % fine.length].x - fine[i - 1].x, fine[i % fine.length].z - fine[i - 1].z));
  const length = cumulative[fine.length], step = length / count;
  const points = [];
  for (let k = 0, i = 0; k < count; k++) {
    while (cumulative[i + 1] < k * step) i++;
    const a = fine[i], b = fine[(i + 1) % fine.length], t = (k * step - cumulative[i]) / (cumulative[i + 1] - cumulative[i]);
    points.push({x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t});
  }
  const samples = points.map((p, k) => {
    const n = points[(k + 1) % count];
    return {s: k * step, x: p.x, z: p.z, y: TABLE.topY, heading: Math.atan2(n.x - p.x, n.z - p.z), curvature: 0, tunnel: false};
  });
  const wrap = s => ((s % length) + length) % length;
  const angleDiff = (a, b) => Math.atan2(Math.sin(b - a), Math.cos(b - a));
  const at = s => {
    const p = wrap(s), i = Math.floor(p / step) % count, a = samples[i], b = samples[(i + 1) % count], t = (p - a.s) / step;
    return {x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t, y: TABLE.topY, heading: a.heading + angleDiff(a.heading, b.heading) * t, curvature: 0, tunnel: false};
  };
  const worldAt = (s, lateral = 0) => {
    const f = at(s);
    return {x: f.x + Math.cos(f.heading) * lateral, y: TABLE.topY, z: f.z - Math.sin(f.heading) * lateral, heading: f.heading};
  };
  const nearest = (x, z) => {
    let best = null;
    for (let k = 0; k < count; k++) {
      const a = samples[k], b = samples[(k + 1) % count];
      const dx = b.x - a.x, dz = b.z - a.z, span = dx * dx + dz * dz;
      const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / span));
      const px = a.x + dx * t, pz = a.z + dz * t, distance = Math.hypot(x - px, z - pz);
      if (!best || distance < best.distance) best = {k, t, px, pz, distance};
    }
    const s = wrap(samples[best.k].s + best.t * step), f = at(s);
    const lateral = (x - best.px) * Math.cos(f.heading) - (z - best.pz) * Math.sin(f.heading);
    return {x: best.px, z: best.pz, y: TABLE.topY, heading: f.heading, curvature: 0, tunnel: false, s, lateral, distance: best.distance};
  };
  const course = Object.freeze({
    def: Object.freeze({id: TABLE_ID, name: 'The Table'}), closed: true, length, step, samples: Object.freeze(samples), sections: Object.freeze([]),
    features: Object.freeze({obstacles: Object.freeze([])}),
    phase: wrap, at, worldAt, nearest, roadHalfWidthAt: () => halfWidth,
    groundAt: (s, off = 0) => { const p = worldAt(s, off); return {...p, y: tableHeight(p.x, p.z)}; },
  });
  const obstacles = [
    {x: TABLE.tower.x, z: TABLE.tower.z, radius: TABLE.tower.radius, base: TABLE.topY, top: TABLE.topY + TABLE.tower.height, shape: 'column', id: 'lookout', kind: 'building'},
    {x: TABLE.wreck.x, z: TABLE.wreck.z, radius: TABLE.wreck.radius, base: TABLE.topY, top: TABLE.topY + TABLE.wreck.height, shape: 'column', id: 'wreck', kind: 'rock'},
  ];
  const ground = createHeliGround({heightAt: tableHeight, obstacles});
  return Object.freeze({course, ground});
}
