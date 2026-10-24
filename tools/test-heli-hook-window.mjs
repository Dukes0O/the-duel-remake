// FIX-HELI-HOOK (docs/board/cards/FIX-HELI-HOOK.md): the hook's window, the
// one-line hint a failed H press gives, and the ground ring that turns green
// when H would hook. Flown headless over lesson 4's crate, the way a pilot
// hovers it, plus the cable rule on its own.
import assert from 'node:assert/strict';
import {Course} from '../src/course.js';
import {ALL_CIRCUITS} from '../src/circuits/index.js';
import {createProfile, normalizeProfile} from '../src/progression.js';
import {groundFromCourse} from '../src/heli/heli-ground.js';
import {createHeliState} from '../src/heli/heli-flight.js';
import {flatGround} from '../src/heli/heli-ground.js';
import {CABLE, CRATE, createLoad, canHook} from '../src/heli/heli-cable.js';
import {createHeliSession} from '../src/heli/heli-session.js';
import {noticeText, HOOK_HINT_SECONDS} from '../src/heli/heli-ui.js';

let checks = 0;
const ok = (value, label) => { assert.ok(value, label); checks++; };
const same = (actual, expected, label) => { assert.deepEqual(actual, expected, label); checks++; };
const worlds = new Map();
function loadCourse(id) {
  if (!worlds.has(id)) {
    const course = new Course(ALL_CIRCUITS.find(def => def.id === id), 1989);
    worlds.set(id, {course, ground: groundFromCourse(course)});
  }
  return worlds.get(id);
}
function pilot(view, target, {speed = 4} = {}) {
  const h = view.heli;
  const fwdX = Math.sin(h.heading), fwdZ = Math.cos(h.heading), rightX = -fwdZ, rightZ = fwdX;
  const dx = target.x - h.x, dz = target.z - h.z, distance = Math.hypot(dx, dz);
  const want = Math.min(speed, distance * 0.4);
  const wx = distance > 0.01 ? dx / distance * want : 0, wz = distance > 0.01 ? dz / distance * want : 0;
  const ex = wx - h.vx, ez = wz - h.vz, clamp = v => Math.max(-1, Math.min(1, v));
  return {pitch: clamp((ex * fwdX + ez * fwdZ) * 0.25), roll: clamp((ex * rightX + ez * rightZ) * 0.25),
    lift: target.y === undefined ? -1 : clamp((target.y - h.y) * 0.3 - h.vy * 0.3), yaw: 0};
}
function run(session, seconds, controls = () => ({}), until = null) {
  const events = [];
  for (let i = 0; i < Math.round(seconds * 120); i++) {
    events.push(...session.step(controls(session.view())));
    if (until?.(session.view(), events)) break;
  }
  return events;
}
const trained = () => normalizeProfile({...createProfile(), credits: 3000,
  heli: {version: 1, lessons: {liftoff: true, hover: true, landing: true}, fuelKg: 400, refuels: 1}});
// Lesson 4 started, the helicopter in the air beside its crate.
function overCrate() {
  const session = createHeliSession({profile: trained(), enabled: true, loadCourse, carId: 'falcone_f42'});
  session.start();
  ok(session.startLesson('carry').ok, 'lesson 4 starts');
  const crate = session.view().loads.find(load => load.id === 'crate');
  const ground = crate.y - CABLE.restHeight;
  return {session, crate, ground};
}
// Hover still with the skids `height` m over the crate's ground, `side` m off it.
function hover(session, crate, ground, height, {side = 0} = {}) {
  const at = {x: crate.x + side, z: crate.z, y: ground + height};
  run(session, 60, v => pilot(v, at, {speed: 3}),
    v => Math.hypot(v.heli.x - at.x, v.heli.z - at.z) < 0.3 && Math.abs(v.heli.y - at.y) < 0.15 && Math.hypot(v.heli.vx, v.heli.vy, v.heli.vz) < 0.15);
  run(session, 1, v => pilot(v, at, {speed: 1}));
  const h = session.view().heli;
  ok(Math.hypot(h.x - at.x, h.z - at.z) < 0.5 && Math.abs(h.y - at.y) < 0.3, `holding ${height} m up, ${side} m to the side`);
  return session.view();
}
const hint = event => event?.type === 'hookRefused' ? noticeText(event) : null;

// The cable rule on its own: 18.5 m over a crate (the hook 2.8 m above its
// lifting point) and 2 m/s across it both hook now; 3 m/s does not.
{
  const ground = flatGround(0);
  const heli = createHeliState({ground});
  const crate = createLoad({id: 'crate', massKg: CRATE.massKg, ground});
  heli.onGround = false;
  heli.y = 18.5;
  ok(canHook(heli, crate), '18.5 m over the crate: the hook takes it');
  heli.y = crate.y + CABLE.length; heli.vx = 2;
  ok(canHook(heli, crate), 'drifting across at 2 m/s: the hook takes it');
  heli.vx = 3;
  ok(!canHook(heli, crate), 'not at 3 m/s');
  heli.vx = 0; heli.x = 4;
  ok(canHook(heli, crate), '4 m to the side is within reach');
  heli.x = 4.5;
  ok(!canHook(heli, crate), 'not from 4.5 m');
}

// The card's first case: H at 18.5 m over the crate hooks it (it used to do
// nothing and say nothing).
{
  const {session, crate, ground} = overCrate();
  const view = hover(session, crate, ground, 18.5);
  same([session.hookGuide()?.id, session.hookGuide()?.ready], ['crate', true], '18.5 m up: the ring under the crate is green');
  ok(Math.abs(session.hookGuide().y - ground) < 0.05, 'the ring lies on the ground under the crate');
  const pressed = session.pressHook();
  ok(pressed?.type === 'hooked' || hint(pressed) === `Lower ${pressed?.metres} m`, 'H at 18.5 m hooks the crate or says how far to come down');
  same(pressed?.type, 'hooked', 'with the wider window it hooks');
}

// The card's second case: drifting across the crate at 2 m/s, H hooks (it
// used to do nothing and say nothing; "Slow down" starts above 2.5 m/s).
{
  const {session, crate, ground} = overCrate();
  hover(session, crate, ground, 15.7, {side: -25});
  const far = {x: crate.x + 40, z: crate.z, y: ground + 15.7};
  run(session, 30, v => pilot(v, far, {speed: 2}), v => v.heli.x > crate.x - 0.3);
  const h = session.view().heli;
  ok(Math.abs(Math.hypot(h.vx, h.vy, h.vz) - 2) < 0.2, `crossing at ${Math.hypot(h.vx, h.vy, h.vz).toFixed(2)} m/s`);
  same(session.pressHook()?.type, 'hooked', 'at 2 m/s it hooks');
}

// Too high: H says how far to come down, and the ring stays white.
{
  const {session, crate, ground} = overCrate();
  const view = hover(session, crate, ground, 23);
  same(session.hookGuide()?.ready, false, '23 m up: the ring is not green');
  const pressed = session.pressHook();
  same([pressed?.type, pressed?.reason, pressed?.metres], ['hookRefused', 'lower', 7], 'too high: the reason is a rules value with the metres');
  same(hint(pressed), 'Lower 7 m', 'and the panel says "Lower 7 m"');
  ok(session.takeEvents().some(e => e.type === 'hookRefused' && e.reason === 'lower'), 'the session sends it as an event for the panel and the sound');
  ok(!session.view().loads.find(load => load.id === 'crate').hooked, 'nothing is hooked');
}

// Too low: "Higher N m".
{
  const {session, crate, ground} = overCrate();
  hover(session, crate, ground, 11);
  const pressed = session.pressHook();
  same([pressed?.reason, hint(pressed)], ['higher', 'Higher 5 m'], 'the hook 5 m below the crate: "Higher 5 m"');
}

// To the side: "Closer" within the ring's 10 m; beyond it H stays quiet.
{
  const {session, crate, ground} = overCrate();
  let view = hover(session, crate, ground, 15.7, {side: 6});
  same(session.hookGuide()?.ready, false, '6 m to the side: the ring shows, not green');
  same(hint(session.pressHook()), 'Closer', '6 m to the side: "Closer"');
  session.takeEvents();
  view = hover(session, crate, ground, 15.7, {side: 14});
  same(session.hookGuide(), null, '14 m to the side: no ring');
  same(session.pressHook(), null, '14 m to the side: H stays quiet');
  ok(!session.takeEvents().some(e => e.type === 'hookRefused'), 'and sends nothing');
}

// Flying across the crate faster than the window: "Slow down", which comes
// before the height (the hook is also too high here).
{
  const {session, crate, ground} = overCrate();
  hover(session, crate, ground, 20.5, {side: -25});
  const far = {x: crate.x + 40, z: crate.z, y: ground + 20.5};
  run(session, 30, v => pilot(v, far, {speed: 4}), v => v.heli.x > crate.x - 0.5);
  const h = session.view().heli;
  ok(Math.hypot(h.vx, h.vy, h.vz) > CABLE.hookSpeed && Math.abs(h.x - crate.x) < 2, `crossing the crate at ${Math.hypot(h.vx, h.vz).toFixed(1)} m/s`);
  const pressed = session.pressHook();
  same([pressed?.reason, hint(pressed)], ['slowDown', 'Slow down'], 'too fast: "Slow down" first');
}

ok(HOOK_HINT_SECONDS === 2, 'the hint shows for two seconds');
console.log(`PASS FIX-HELI-HOOK: the wider window, the hints and the ring (${checks} checks)`);
