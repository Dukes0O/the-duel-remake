// The pilot's map secrets (docs/PILOT_MAP.md section 5, card MAP-SECRETS): five
// secret courses found only by hovering over their signs from the air, the Table
// that Roger spots after the right cruise leg, and the map record that keeps
// what was found. All of it runs without graphics.
import assert from 'node:assert/strict';
import {COURSE} from '../src/config.js';
import {Course} from '../src/course.js';
import {ALL_CIRCUITS} from '../src/circuits/index.js';
import {CIRCUIT_MANIFESTS, registerCircuits} from '../src/circuit-manifests.js';
import {isCourseUnlocked, courseUnlockRequirement, purchaseCourse} from '../src/course-access.js';
import {createProfile, normalizeProfile} from '../src/progression.js';
import {groundFromCourse} from '../src/heli/heli-ground.js';
import {heliOf, carAt} from '../src/heli/heli-save.js';
import {createHeliSession} from '../src/heli/heli-session.js';
import {destinationsFor, legFuelKg, isDestination} from '../src/heli/heli-jobs.js';
import {PLACES, placeById} from '../src/heli/pilot-map-data.js';
import {noticeText} from '../src/heli/heli-ui.js';
import {HELI_EVENT_CUES} from '../src/heli/heli-audio.js';
import {
  SECRET_SIGNS, SECRET_IDS, SPOT, TABLE, TABLE_ID, TABLE_PAY, TABLE_PASS_KM, createMap, normalizeMap, mapOf, hasFound, hasSeen,
  noteFound, noteSeen, claimTable, legPassesTable, signClear, createSpotter, stepSpotter, createTableWorld, tableHeight,
} from '../src/heli/map-secrets.js';

let checks = 0;
const ok = (value, label) => { assert.ok(value, label); checks++; };
const same = (actual, expected, label) => { assert.deepEqual(actual, expected, label); checks++; };
const near = (actual, expected, tolerance, label) => {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${label}: ${actual} not within ${tolerance} of ${expected}`);
  checks++;
};

// Courses are built the way the game builds a helicopter visit (seed 1989); a secret course's sign lies on its parent's road.
const worlds = new Map();
function loadCourse(id) {
  if (!worlds.has(id)) {
    const course = new Course(COURSE.find(def => def.id === id), 1989);
    worlds.set(id, {course, ground: groundFromCourse(course)});
  }
  return worlds.get(id);
}
function pilot(view, target, {speed = 6} = {}) {
  const h = view.heli;
  const fwdX = Math.sin(h.heading), fwdZ = Math.cos(h.heading), rightX = -fwdZ, rightZ = fwdX;
  const dx = target.x - h.x, dz = target.z - h.z, distance = Math.hypot(dx, dz);
  const want = Math.min(speed, distance * 0.4);
  const wx = distance > 0.01 ? dx / distance * want : 0, wz = distance > 0.01 ? dz / distance * want : 0;
  const ex = wx - h.vx, ez = wz - h.vz, clamp = v => Math.max(-1, Math.min(1, v));
  return {pitch: clamp((ex * fwdX + ez * fwdZ) * 0.25), roll: clamp((ex * rightX + ez * rightZ) * 0.25),
    lift: clamp(((target.y ?? h.y) - h.y) * 0.3 - h.vy * 0.3), yaw: 0};
}
function run(session, seconds, controls = () => ({}), until = null) {
  const events = [];
  for (let i = 0; i < Math.round(seconds * 120); i++) {
    events.push(...session.step(controls(session.view())));
    if (until?.(session.view(), events)) break;
  }
  return events;
}
const TRAINED = Object.freeze({liftoff: true, hover: true, landing: true, carry: true});
const profileWith = ({credits = 5000, owned = [], heli = {}} = {}) => normalizeProfile({...createProfile(), credits,
  courses: {version: 1, unlocked: owned}, heli: {version: 1, fuelKg: 400, refuels: 1, ...heli, lessons: TRAINED}});
const ALL_SECRETS = SECRET_SIGNS.map(sign => sign.id);
const sessionAt = (courseId, {profile = profileWith(), secrets = ALL_SECRETS, pilotMap = true, carId = 'falcone_f42'} = {}) => {
  const session = createHeliSession({profile, enabled: true, loadCourse, carId, today: '2026-10-25', pilotMapEnabled: pilotMap, secretCourses: secrets});
  session.start(courseId);
  session.takeEvents();
  return session;
};

// ---- The five signs -------------------------------------------------------------------------------------------
{
  same(SECRET_IDS, ['tremblant-woods-reverse', 'panorama-ridge-reverse', 'panorama-ridge-night', 'harbour-lights-reverse', 'harbour-lights-dusk'], 'the five secret courses');
  for (const sign of SECRET_SIGNS) {
    const variant = ALL_CIRCUITS.find(def => def.id === sign.id), manifest = CIRCUIT_MANIFESTS.find(row => row.id === sign.id);
    ok(variant && manifest, `${sign.id} is a registered variant`);
    same(manifest.unlock, {kind: 'spotted-from-air', defaultEventId: sign.course}, `${sign.id} is found from the air on ${sign.course}`);
    same([manifest.price, manifest.state], [0, 'dev'], `${sign.id} is free and still a dev course`);
    const {course, ground} = loadCourse(sign.course);
    ok(signClear(course, ground, sign.x, sign.z), `${sign.id}: its sign stands off the road, in the dry, clear of scenery`);
    const lateral = Math.abs(course.nearest(sign.x, sign.z).lateral);
    ok(lateral >= course.roadHalfWidthAt(course.nearest(sign.x, sign.z).s) + 6, `${sign.id}: ${Math.round(lateral)} m from the road's middle, never seen from a car on it`);
  }
  // Two signs on one course are far apart, so one hover never finds both.
  for (const a of SECRET_SIGNS) for (const b of SECRET_SIGNS) if (a.id < b.id && a.course === b.course)
    ok(Math.hypot(a.x - b.x, a.z - b.z) > 2 * SPOT.radius, `${a.id} and ${b.id} are not within one hover`);
  same(SPOT, {radius: 25, minHeight: 2, maxHeight: 60, maxSpeed: 6, seconds: 3}, 'the hover rule: within 25 m, 2 to 60 m up, at most 6 m/s, 3 s');
}

// ---- The hover rule ----------------------------------------------------------------------------------------------
{
  const flat = {height: () => 100};
  const sign = {id: 'a', x: 0, z: 0};
  const heli = (over = {}) => ({x: 0, y: 130, z: 0, vx: 0, vy: 0, vz: 0, onGround: false, ...over});
  const hover = (over, seconds = 3.2) => {
    const spotter = createSpotter();
    let found = null;
    for (let i = 0; i < Math.round(seconds * 120) && !found; i++) found = stepSpotter(spotter, heli(over), flat, [sign], 1 / 120);
    return found;
  };
  ok(hover({}) === sign, 'a steady hover 30 m up over the sign finds it');
  ok(hover({}, 2.9) === null, 'but not before 3 s');
  ok(hover({x: 24, z: 6}) === sign, 'within 25 m sideways counts');
  ok(hover({x: 26}) === null, '26 m sideways does not');
  ok(hover({y: 161}) === null && hover({y: 160}) === sign, 'more than 60 m up does not count');
  ok(hover({y: 101}) === null && hover({y: 102}) === sign, 'less than 2 m up does not count');
  ok(hover({onGround: true, y: 100}) === null, 'standing on the ground does not count');
  ok(hover({vx: 6.2}) === null && hover({vx: 5.8}) === sign, 'faster than 6 m/s does not count');
  ok(hover({vx: 4, vy: 4.5}) === null, 'the climb counts in the speed');
  // Leaving starts the count again.
  const spotter = createSpotter();
  let found = null;
  for (let i = 0; i < 300; i++) found = found || stepSpotter(spotter, heli(), flat, [sign], 1 / 120);
  for (let i = 0; i < 10; i++) found = found || stepSpotter(spotter, heli({x: 40}), flat, [sign], 1 / 120);
  for (let i = 0; i < 300; i++) found = found || stepSpotter(spotter, heli(), flat, [sign], 1 / 120);
  ok(found === null, '2.5 s, away for a moment, then 2.5 s more finds nothing');
  for (let i = 0; i < 100 && !found; i++) found = stepSpotter(spotter, heli(), flat, [sign], 1 / 120);
  ok(found === sign, 'but 3 s in a row after leaving does');
  // Only the sign asked about counts.
  ok(stepSpotter(createSpotter(), heli(), flat, [], 3) === null, 'no signs, nothing found');
}

// ---- The map record ----------------------------------------------------------------------------------------------
{
  same(createMap(), {version: 1, seen: [], found: [], table: false}, 'a new map record has found nothing');
  const old = createProfile();
  same(mapOf(old), createMap(), 'an old save (no map record) reads as nothing found');
  ok(!('map' in heliOf(old)), 'and reading it does not write one');
  for (const bad of [null, 7, 'x', [], {}, {version: 2, found: ['panorama-ridge-night']}, {version: 1, found: 'panorama-ridge-night', seen: 4, table: 'yes'}])
    same(normalizeMap(bad), createMap(), `a malformed record reads as nothing found: ${JSON.stringify(bad)}`);
  same(normalizeMap({version: 1, found: ['harbour-lights-dusk', 'nope', 'harbour-lights-dusk', 'tremblant-woods-reverse'], seen: ['pacific-canyon', 'nope', 'pacific-canyon'], table: true}),
    {version: 1, found: ['tremblant-woods-reverse', 'harbour-lights-dusk'], seen: ['pacific-canyon', TABLE_ID], table: true},
    'unknown or repeated names go; the Table landed on is also seen; found keeps the listed order');

  const first = noteFound(old, 'panorama-ridge-night');
  ok(first.ok && !first.already && hasFound(first.profile, 'panorama-ridge-night'), 'a find is noted');
  ok(!hasFound(first.profile, 'panorama-ridge-reverse'), 'and only that one');
  const again = noteFound(first.profile, 'panorama-ridge-night');
  ok(again.ok && again.already && again.profile === first.profile, 'noting it again changes nothing');
  ok(!noteFound(old, 'pacific-canyon').ok, 'a course that is not a secret cannot be noted');
  ok(!('map' in heliOf(old)), 'noting a find never changes the profile it was given');
  const seen = noteSeen(old, 'harbour-lights');
  ok(seen.ok && hasSeen(seen.profile, 'harbour-lights') && !noteSeen(old, 'nowhere').ok, 'a place on the map can be seen, others cannot');
  // The record survives the profile's own normaliser (it is kept as a key the save does not otherwise know).
  const kept = normalizeProfile(JSON.parse(JSON.stringify(first.profile)));
  same(mapOf(kept), mapOf(first.profile), 'the record comes back from a saved and loaded profile');
}

// ---- Found from the air: the course list ---------------------------------------------------------------------------------
{
  const owned = SECRET_SIGNS.map(sign => sign.course).filter((id, i, all) => all.indexOf(id) === i);
  const bare = normalizeProfile({...createProfile(), courses: {version: 1, unlocked: owned}});
  // The variants join COURSE only when their switches are on; the access rules look them up by id in the registry.
  const added = [];
  for (const def of ALL_CIRCUITS.filter(def => SECRET_IDS.includes(def.id))) if (!COURSE.includes(def)) { COURSE.push(def); added.push(def); }
  try {
    for (const id of SECRET_IDS) ok(!isCourseUnlocked(bare, id), `${id}: not in the course list before it is found`);
    const found = noteFound(bare, 'panorama-ridge-night').profile;
    ok(isCourseUnlocked(found, 'panorama-ridge-night'), 'once found, Panorama Ridge Night is in that player\'s list');
    for (const id of SECRET_IDS.filter(id => id !== 'panorama-ridge-night')) ok(!isCourseUnlocked(found, id), `${id}: still hidden`);
    same(COURSE.filter(def => isCourseUnlocked(found, def)).map(def => def.id).filter(id => !isCourseUnlocked(bare, id)), ['panorama-ridge-night'], 'the only course that appears is the one found');
    ok(!isCourseUnlocked(noteFound(createProfile(), 'panorama-ridge-night').profile, 'panorama-ridge-night'), 'found, but without owning Panorama Ridge: still not open');
    ok(!isCourseUnlocked({...bare, heli: {...heliOf(bare), map: {version: 1, found: ['pacific-canyon'], seen: [], table: false}}}, 'panorama-ridge-night'), 'a hand-written list naming other courses opens nothing');
    const requirement = courseUnlockRequirement('panorama-ridge-night');
    same([requirement.kind, requirement.defaultEventId], ['spotted-from-air', 'panorama-ridge'], 'the course list says how it is found');
    ok(/air/i.test(requirement.condition) && !/Grand Prix/.test(requirement.condition), `and says so in words: ${requirement.condition}`);
    const bought = purchaseCourse(bare, 'panorama-ridge-night');
    ok(!bought.ok && bought.cost === 0 && /air/i.test(bought.reason), 'it cannot be bought, and the refusal says how to find it');
    ok(!purchaseCourse(found, 'panorama-ridge-night').ok, 'nor bought once found');
    // A podium on the parent no longer opens it.
    ok(!isCourseUnlocked({...bare, grandPrixPodiums: ['panorama-ridge']}, 'panorama-ridge-night'), 'a Grand Prix podium alone does not open a secret course');
  } finally { for (const def of added) COURSE.splice(COURSE.indexOf(def), 1); }

  // The registry knows the kind and keeps its checks.
  const parent = {manifest: CIRCUIT_MANIFESTS.find(row => row.id === 'panorama-ridge'), circuit: ALL_CIRCUITS.find(def => def.id === 'panorama-ridge')};
  const child = {manifest: CIRCUIT_MANIFESTS.find(row => row.id === 'panorama-ridge-night'), circuit: ALL_CIRCUITS.find(def => def.id === 'panorama-ridge-night')};
  ok(registerCircuits([parent, child]).length === 2, 'the registry accepts a spotted-from-air child of a Grand Prix event');
  let threw = 0;
  for (const manifest of [{...child.manifest, price: 1}, {...child.manifest, unlock: {kind: 'spotted-from-air', defaultEventId: 'nowhere'}},
    {...child.manifest, unlock: {kind: 'spotted-from-air', defaultEventId: child.manifest.id}}, {...child.manifest, unlock: {kind: 'found-somehow', defaultEventId: 'panorama-ridge'}}])
    try { registerCircuits([parent, {...child, manifest}]); } catch { threw++; }
  same(threw, 4, 'a price, an unknown parent, itself as parent and an unknown kind are all refused');
}

// ---- The Table: the leg, the mesa and the logbook -----------------------------------------------------------------------------
{
  const table = placeById(TABLE_ID);
  ok(table.air && table.courses.length === 0, 'the Table is an air-only place with no road');
  ok(legPassesTable('tremblant-woods', 'pacific-canyon'), 'home to Pacific Canyon passes it');
  ok(legPassesTable('pacific-canyon', 'tremblant-woods'), 'in either direction');
  ok(!legPassesTable('tremblant-woods', 'tremblant-snow') && !legPassesTable('tremblant-woods', 'eifel-crown'), 'short legs and legs the other way do not');
  ok(!legPassesTable('tremblant-woods', TABLE_ID) && !legPassesTable(TABLE_ID, 'pacific-canyon'), 'a leg to or from the Table itself is no sighting');
  ok(!legPassesTable('nowhere', 'pacific-canyon'), 'an unknown place is no sighting');
  const passing = PLACES.filter(a => a.courses.length).flatMap(a => PLACES.filter(b => b.courses.length && a.id < b.id).map(b => [a.id, b.id])).filter(([a, b]) => legPassesTable(a, b));
  ok(passing.length >= 8 && passing.length < 40, `${passing.length} of the legs pass within ${TABLE_PASS_KM} km`);
  // The line passes within 4 km of the mesa exactly when its distance says so.
  const distance = (a, b) => {
    const p = placeById(a).at, q = placeById(b).at, t = table.at, dx = q.x - p.x, dz = q.z - p.z;
    const k = Math.max(0, Math.min(1, ((t.x - p.x) * dx + (t.z - p.z) * dz) / (dx * dx + dz * dz)));
    return Math.hypot(t.x - (p.x + dx * k), t.z - (p.z + dz * k));
  };
  for (const [a, b] of passing) ok(distance(a, b) <= TABLE_PASS_KM, `${a} to ${b}: ${distance(a, b).toFixed(1)} km from the Table`);

  // The first landing: 500 credits, once, and the map's last corner is filled in.
  const profile = createProfile();
  const claim = claimTable(profile);
  same([claim.ok, claim.already, claim.paid, claim.profile.credits - profile.credits], [true, false, TABLE_PAY, TABLE_PAY], 'the logbook pays 500 credits');
  ok(mapOf(claim.profile).table && hasSeen(claim.profile, TABLE_ID), 'and the Table is on the map');
  const second = claimTable(claim.profile);
  same([second.already, second.paid, second.profile === claim.profile], [true, 0, true], 'a second landing pays nothing and changes nothing');
  near(claimTable({...profile, credits: 999_999_900}).profile.credits, 1_000_000_000, 0, 'the wallet stops at the game\'s limit');
  same(claimTable({...profile, credits: 999_999_900}).paid, 100, 'and the payment says what was really paid');

  // The mesa answers what a course is asked.
  const world = createTableWorld();
  near(tableHeight(0, 0), TABLE.topY, 0, 'the top is flat at 90 m');
  near(tableHeight(TABLE.topRadius - 1, 0), TABLE.topY, 0.01, 'out to its edge');
  near(tableHeight(TABLE.topRadius + TABLE.cliffWidth + 1, 0), TABLE.floorY, 0.01, 'and the desert floor below');
  ok(tableHeight(TABLE.topRadius + TABLE.cliffWidth / 2, 0) < TABLE.topY - 30 && tableHeight(TABLE.topRadius + TABLE.cliffWidth / 2, 0) > 30, 'with a cliff between');
  const {course, ground} = world;
  ok(course.length > 200 && course.closed, 'the strip is a closed loop of a few hundred metres');
  for (let s = 0; s < course.length; s += 17) {
    const p = course.at(s);
    near(Math.hypot(p.x / TABLE.strip.rx, p.z / TABLE.strip.rz), 1, 0.02, 'the strip follows its oval');
    near(ground.height(p.x, p.z), TABLE.topY, 0.01, 'on the flat top');
    const nearest = course.nearest(p.x, p.z);
    near(nearest.lateral, 0, 0.05, 'and finds itself');
  }
  near(course.roadHalfWidthAt(0), TABLE.strip.halfWidth, 0, 'the strip is 8 m across');
  const lookout = ground.near(TABLE.tower.x, TABLE.tower.z, 1)[0];
  ok(lookout && lookout.top === TABLE.topY + TABLE.tower.height, 'the lookout tower stands 14 m over the top');
  ok(ground.near(TABLE.wreck.x, TABLE.wreck.z, 1).length === 1, 'and the wreck beside the strip');
  ok(ground.rotorStrike(TABLE.tower.x, TABLE.topY + 6, TABLE.tower.z, 5), 'a rotor at the height of the tower strikes it');
}

// ---- In the helicopter: finding a sign ---------------------------------------------------------------------------------------
const groundOf = session => loadCourse(session.courseId).ground;
// Height to fly at: the target's own, but never lower than the ground and trees ahead (so the rotor never strikes).
const above = (session, point, height, v = null) => {
  const ground = groundOf(session);
  let y = ground.height(point.x, point.z) + height;
  if (v) {
    const h = v.heli, near = Math.hypot(point.x - h.x, point.z - h.z);
    for (const ahead of [0, 40, 80, 120]) {
      const x = h.x + Math.sin(h.heading) * ahead + h.vx * 2, z = h.z + Math.cos(h.heading) * ahead + h.vz * 2;
      if (near > 60) y = Math.max(y, ground.highest(x, z, 12) + 25);
    }
  }
  return {x: point.x, z: point.z, y};
};
// Climb first when below the height wanted, then go (a helicopter that moves while climbing meets the hillside).
const goTo = (session, point, height, speed, v) => {
  const goal = above(session, point, height, v), h = v.heli;
  const climbing = h.y < goal.y - 10 && Math.hypot(point.x - h.x, point.z - h.z) > 60;
  return pilot(v, climbing ? {x: h.x, z: h.z, y: goal.y} : goal, {speed});
};
const flyTo = (session, point, {height = 25, speed = 25, seconds = 400, until = null} = {}) =>
  run(session, seconds, v => goTo(session, point, height, speed, v), until);
const secretEvents = events => events.filter(e => e.type === 'secretFound');
const withVariants = fn => {
  const added = [];
  for (const def of ALL_CIRCUITS.filter(def => SECRET_IDS.includes(def.id))) if (!COURSE.includes(def)) { COURSE.push(def); added.push(def); }
  try { return fn(); } finally { for (const def of added) COURSE.splice(COURSE.indexOf(def), 1); }
};

{
  const sign = SECRET_SIGNS.find(item => item.id === 'panorama-ridge-night');
  const session = sessionAt('panorama-ridge', {profile: profileWith({owned: ['panorama-ridge']})});
  same(session.view().secrets.signs.map(item => item.id), ['panorama-ridge-reverse', 'panorama-ridge-night'], 'the sign of each secret course here is in the view');
  const shown = session.view().secrets.signs.find(item => item.id === sign.id);
  same([shown.x, shown.z], [sign.x, sign.z], 'at its place');
  same(session.view().secrets.spotting, null, 'with nobody hovering');

  // Flying over it at speed finds nothing; the hover does.
  const start = session.view().heli;
  const beyond = {x: sign.x + 400, z: sign.z};
  const passed = flyTo(session, beyond, {height: 25, speed: 30, seconds: 300, until: v => v.heli.x > sign.x + 60});
  ok(start.x < sign.x && session.view().heli.x > sign.x + 60, 'the helicopter flew over the sign, at speed');
  same(secretEvents(passed).length, 0, 'flying over the sign at speed does not find it');
  const events = flyTo(session, sign, {height: 25, speed: 25, seconds: 120, until: (v, got) => secretEvents(got).length > 0});
  const found = secretEvents(events);
  same(found.length, 1, 'hovering over the sign finds it, once');
  same([found[0].id, found[0].name], ['panorama-ridge-night', 'Panorama Ridge Night'], 'the right course');
  ok(/Panorama Ridge Night/.test(found[0].text) && /course list/.test(found[0].text), `the screen says what was found: ${found[0].text}`);
  same(noticeText(found[0]), found[0].text, 'the flight panel shows those words');
  same(HELI_EVENT_CUES.secretFound(found[0]), [['heli.found']], 'and the find has its own sound');
  same(session.profile.heli.map.found, ['panorama-ridge-night'], 'the find is in the save');
  withVariants(() => {
    ok(isCourseUnlocked(session.profile, 'panorama-ridge-night'), 'and the course is in that player\'s list');
    ok(!isCourseUnlocked(session.profile, 'panorama-ridge-reverse'), 'the other one is not');
  });
  same(session.view().secrets.signs.map(item => item.id), ['panorama-ridge-reverse'], 'the sign is gone from the view');
  same(session.view().secrets.found, ['panorama-ridge-night'], 'and listed as found');
  const more = run(session, 8, v => goTo(session, sign, 25, 25, v));
  same(secretEvents(more).length, 0, 'hovering on does not find it twice');
}

// A hover that breaks the rule finds nothing, and a sign with its switch off is not there.
{
  const sign = SECRET_SIGNS.find(item => item.id === 'panorama-ridge-night');
  const hoverAt = (session, height, seconds = 12) => {
    flyTo(session, sign, {height: Math.min(height, 40), speed: 25, seconds: 200, until: v => Math.hypot(v.heli.x - sign.x, v.heli.z - sign.z) < 8});
    return secretEvents(run(session, seconds, v => goTo(session, sign, height, 25, v)));
  };
  const high = sessionAt('panorama-ridge', {secrets: [sign.id]});
  same(hoverAt(high, 90).length, 0, 'hovering 90 m up finds nothing');
  const off = sessionAt('panorama-ridge', {secrets: []});
  same(off.view().secrets.signs, [], 'with its switch off the sign is not there');
  same(hoverAt(off, 25).length, 0, 'and hovering over the place finds nothing');
  same(off.profile.heli.map, undefined, 'nothing was written');
  const elsewhere = sessionAt('panorama-ridge', {secrets: ['harbour-lights-dusk']});
  same(elsewhere.view().secrets.signs, [], 'the signs of another course are not on this one');
  const switchOff = sessionAt('panorama-ridge', {pilotMap: false});
  ok(!('secrets' in switchOff.view()), 'with the pilot\'s map off the view has no secrets');
  same(hoverAt(switchOff, 25).length, 0, 'and hovering over a sign finds nothing');
  same(switchOff.profile.heli.map, undefined, 'and writes nothing');
}

// Found over a course the player does not own: recorded, but the words do not promise a course that is not listed yet.
{
  const sign = SECRET_SIGNS.find(item => item.id === 'panorama-ridge-night');
  const session = sessionAt('panorama-ridge', {secrets: [sign.id]});
  const events = flyTo(session, sign, {height: 25, speed: 25, seconds: 200, until: (v, got) => secretEvents(got).length > 0});
  const found = secretEvents(events);
  same(found.length, 1, 'a sign over an unowned course is still found');
  ok(/once you own Panorama Ridge/.test(found[0].text) && !/in your course list now/.test(found[0].text), `and the words say what is missing: ${found[0].text}`);
  withVariants(() => ok(!isCourseUnlocked(session.profile, sign.id), 'the course is not listed until the parent is owned'));
  withVariants(() => ok(!isCourseUnlocked({...profileWith({owned: ['panorama-ridge']}), heli: {...heliOf(profileWith()), map: {found: [sign.id], seen: [], table: false}}}, sign.id), 'a record with no version opens nothing'));
}

// ---- In the helicopter: the Table -------------------------------------------------------------------------------------------------
const cruiseLeg = (session, to) => {
  ok(session.setDestination(to), `${to} can be chosen`);
  session.pressAutopilot();
  run(session, 900, () => ({}), v => v.cruiseOffered);
  ok(session.view().cruiseOffered && session.acceptCruise(), `the leg to ${to} is taken`);
  return run(session, 8, () => ({}), (v, events) => events.some(e => e.type === 'entered'));
};
{
  const session = sessionAt('tremblant-woods');
  ok(!session.view().destinations.includes(TABLE_ID) && !session.setDestination(TABLE_ID), 'before the sighting the Table is not on the list and cannot be chosen');
  ok(!isDestination(TABLE_ID, {pilotMap: true}) && isDestination(TABLE_ID, {pilotMap: true, table: true}), 'it is a destination only once seen');
  const short = cruiseLeg(sessionAt('tremblant-woods'), 'tremblant-snow');
  same(short.filter(e => e.type === 'tableSpotted').length, 0, 'a short leg brings no call');
  const events = cruiseLeg(session, 'pacific-canyon');
  const calls = events.filter(e => e.type === 'tableSpotted');
  same(calls.length, 1, 'the leg that passes the Table brings Roger\'s call on arrival');
  ok(/mesa/.test(calls[0].text) && /tower/.test(calls[0].text), `with his words: ${calls[0].text}`);
  same(events.filter(e => e.type === 'radio' && e.line === calls[0].line).length, 1, 'and his radio line (recorded later: until then the screen shows the words)');
  same(noticeText(calls[0]), calls[0].text, 'the flight panel shows them');
  ok(hasSeen(session.profile, TABLE_ID) && !mapOf(session.profile).table, 'the Table is seen, not yet landed on');
  ok(session.view().destinations.includes(TABLE_ID), 'and is on the list now');
  ok(legFuelKg('pacific-canyon', TABLE_ID, {pilotMap: true, table: true}) <= 120 && legFuelKg('pacific-canyon', TABLE_ID, {pilotMap: true}) === null, 'with a leg from Pacific Canyon (and none before it was seen)');
  // A save that has seen it before gets no second call.
  const seenBefore = sessionAt('tremblant-woods', {profile: profileWith({heli: {map: {version: 1, seen: [TABLE_ID], found: [], table: false}}})});
  same(cruiseLeg(seenBefore, 'pacific-canyon').filter(e => e.type === 'tableSpotted').length, 0, 'a second sighting brings no second call');
}

// The Table itself: the leg there, the landing on top, the logbook and the car that cannot be left.
{
  const seen = profileWith({heli: {map: {version: 1, seen: [TABLE_ID], found: [], table: false}}});
  const session = sessionAt('pacific-canyon', {profile: seen});
  const events = cruiseLeg(session, TABLE_ID);
  ok(events.some(e => e.type === 'entered' && e.courseId === TABLE_ID && e.arrived === true), 'the leg from Pacific Canyon ends at the Table');
  const view = session.view();
  same(view.courseId, TABLE_ID, 'the session is on the Table');
  near(view.zone.y, TABLE.topY, 0.01, 'its landing circle is on top');
  ok(Math.hypot(view.zone.x, view.zone.z) + view.zone.radius < TABLE.topRadius, 'well inside the cliffs');
  ok(Math.hypot(view.zone.x - TABLE.tower.x, view.zone.z - TABLE.tower.z) > 20 && Math.hypot(view.zone.x - TABLE.wreck.x, view.zone.z - TABLE.wreck.z) > 20, 'clear of the tower and the wreck');
  ok(Math.hypot(view.heli.x - view.zone.x, view.heli.z - view.zone.z) > 1000, 'arriving from out over the desert');
  const credits = session.profile.credits;
  // Down onto the circle: hold 25 m over the top until over it, then settle.
  const landed = run(session, 240, v => {
    const away = Math.hypot(v.zone.x - v.heli.x, v.zone.z - v.heli.z);
    const settling = away < 6 || away < 40 && v.heli.y < v.zone.y + 14;
    return pilot(v, {x: v.zone.x, z: v.zone.z, y: settling ? v.zone.y - 4 : v.zone.y + 25}, {speed: away > 60 ? 20 : 4});
  }, (v, got) => got.some(e => e.type === 'touchdown' || e.type === 'crash'));
  ok(landed.some(e => e.type === 'touchdown' && e.result !== 'crash') && !landed.some(e => e.type === 'crash'), 'it lands on top without a crash');
  const logbook = landed.filter(e => e.type === 'tableFound');
  same(logbook.length, 1, 'the first landing in the circle finds the logbook');
  same([logbook[0].pay, session.profile.credits - credits], [TABLE_PAY, TABLE_PAY], 'and pays 500 credits');
  ok(/lookout/.test(logbook[0].text) && /logbook/.test(logbook[0].text), `with its words: ${logbook[0].text}`);
  ok(noticeText(logbook[0]).includes('500'), 'the flight panel says the pay');
  same(HELI_EVENT_CUES.tableFound(logbook[0]), [['heli.found']], 'and the find has its sound');
  ok(mapOf(session.profile).table, 'the map is filled in');
  // Up and down again: no second payment.
  run(session, 30, v => pilot(v, {x: v.zone.x, z: v.zone.z, y: v.zone.y + 20}, {speed: 5}), v => v.heli.y > v.zone.y + 15);
  const again = run(session, 120, v => pilot(v, {x: v.zone.x, z: v.zone.z, y: v.heli.y > v.zone.y + 12 ? v.zone.y + 6 : v.zone.y - 5}, {speed: 3}),
    (v, got) => got.some(e => e.type === 'touchdown' || e.type === 'crash'));
  ok(again.some(e => e.type === 'touchdown'), 'it lands a second time');
  same([again.filter(e => e.type === 'tableFound').length, session.profile.credits - credits], [0, TABLE_PAY], 'and is paid nothing more');
}

// A car carried to the Table cannot be left there until the save can keep it (part two of the card): it is told so, and the car stays where it was.
{
  const seen = profileWith({heli: {fuelKg: 330, refuels: 1, carsAt: {falcone_f42: 'pacific-canyon'}, map: {version: 1, seen: [TABLE_ID], found: [], table: false}}});
  const session = sessionAt('pacific-canyon', {profile: seen});
  const own = () => session.view().loads.find(load => load.own);
  ok(own(), 'the player\'s car waits at Pacific Canyon');
  run(session, 60, v => pilot(v, {x: own().x, z: own().z, y: own().y + 15.2}, {speed: 4}),
    v => Math.hypot(v.heli.x - own().x, v.heli.z - own().z) < 1 && Math.abs(v.heli.y - own().y - 15.2) < 0.6 && Math.hypot(v.heli.vx, v.heli.vy, v.heli.vz) < 0.5);
  session.takeEvents();
  ok(session.pressHook()?.type === 'hooked', 'the car is hooked');
  run(session, 12, v => pilot(v, {x: v.heli.x, z: v.heli.z, y: v.zone.y + 60}));
  ok(session.setDestination(TABLE_ID), 'with the Table as the destination');
  ok(session.pressAutopilot(), 'the autopilot takes it toward the edge');
  run(session, 600, () => ({}), () => session.cruiseOffered);
  ok(session.acceptCruise(), 'and the leg is taken with the car');
  run(session, 3, () => ({}), (v, got) => got.some(e => e.type === 'entered'));
  same(session.courseId, TABLE_ID, 'at the Table');
  ok(session.view().load?.hooked, 'the car came along');
  const log = [];
  log.push(...run(session, 300, () => ({}), (v, got) => got.some(e => e.type === 'autopilotArrived')));
  if (session.autopilotOn) session.pressAutopilot();
  const final = v => v.zone.y + 0.7 + 14.6;
  log.push(...run(session, 60, v => pilot(v, {x: v.zone.x, z: v.zone.z, y: final(v)}, {speed: 1}), v => v.load.onGround));
  log.push(...run(session, 1, v => pilot(v, {x: v.heli.x, z: v.heli.z, y: v.heli.y})));
  session.takeEvents();
  const released = session.pressHook();
  const after = session.takeEvents();
  ok(released?.type === 'released' || released?.type === 'setDown', `H lets the car go (${released?.type})`);
  const refusal = after.filter(e => e.type === 'carNotKept');
  same(refusal.length, 1, 'the pilot is told the car cannot be left');
  same(noticeText(refusal[0]), refusal[0].reason, 'in words on the flight panel');
  ok(!after.some(e => e.type === 'delivered'), 'and it is not delivered');
  same(carAt(session.profile, 'falcone_f42'), 'pacific-canyon', 'the car is still where the save has it');
}
console.log(`Map secrets: ${checks} checks passed.`);
