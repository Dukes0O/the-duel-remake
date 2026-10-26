// RESCUE-VIEW's look check (docs/HELI_RESCUE.md sections 5, 7 and 13): the
// lost hiker with the search ring, the flare and the walk to the clearing, the
// avalanche slide with the beacon bar and the dig, the hoist rescue at the
// cliff, the supply run, and the panel at dusk, in the real game with
// memory-only saves (no frame timing: Claude runs that later).
//   node tools/browser-harness.mjs scenario rescue-view
// RESCUE_VIEW_ONLY=hiker,avalanche,hoist,supply,dusk,stretcher picks the shots.
// RESCUE_VIEW_SHEET=<round> writes docs/board/looks/heli-rescue-view/round-<round>.jpg.
// Round 3 (RESCUE-FINISH) retakes only the views that changed: RESCUE_VIEW_ONLY=avalanche,hoist,supply and
// RESCUE_VIEW_FINISH=1 adds the rescuer alone and with the skier from the side and from behind, the driver's
// car at the hoist site, and a crate set down in the yard.
import {join} from 'node:path';
import {appendFile, readFile, writeFile} from 'node:fs/promises';
import {publishReviewSheet} from './review-sheet.mjs';
import {TRAINED} from './fire-view.mjs';
import {Course} from '../../src/course.js';
import {ALL_CIRCUITS} from '../../src/circuits/index.js';
import {groundFromCourse} from '../../src/heli/heli-ground.js';
import {courseSite} from '../../src/heli/heli-session.js';
import {armMissions} from '../../src/heli/heli-missions.js';
import {createMissions} from '../../src/heli/heli-save.js';
import {hikerSpots, pickHiker} from '../../src/heli/heli-search.js';

const entry = '/tools/menu-check.html?flags=helicopter,forest-fire,rescue,tremblant-woods,tremblant-snow,panorama-ridge,summit-run';
const SHEET_ROUND = Number(process.env.RESCUE_VIEW_SHEET || 0);
const FINISH = process.env.RESCUE_VIEW_FINISH === '1';
// The round 3 sheet shows only the views RESCUE-FINISH changed.
const KEEP = ['line-alone-side', 'line-alone-behind', 'avalanche-carry', 'line-pair-behind', 'hoist-car', 'supply-yard'];
const ONLY = (process.env.RESCUE_VIEW_ONLY || 'hiker,avalanche,hoist,supply,dusk,stretcher').split(',');
const app = 'window.__qaApp';
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const shots = [];
const failures = [];
// Notes go to the console and, since the harness may not show them, to a log in the scratch folder.
const note = (...parts) => { console.log(...parts); return appendFile(join(process.cwd(), '.qa-dist', 'rescue-view-notes.log'), parts.map(String).join(' ') + '\n').catch(() => {}); };

// A pilot who has done the lessons, owns the courses, and has a rescue call waiting.
function callHeli(kind, courseId) {
  const armed = armMissions(createMissions(), {date: '2026-10-14', playerName: 'QA'});
  return {version: 1, fuelKg: 400, refuels: 3, lessons: TRAINED, playDay: {last: '2026-10-20', count: 30},
    missions: {...armed, count: armed.need, call: {kind, id: `${kind}-${armed.draws}`, courseId, day: 30, answered: false}}};
}

async function menu(context, heli) {
  await context.navigate(entry);
  await context.waitFor(`document.readyState==='complete' && !!window.__qaApp &&
    document.querySelector('#view3d')?.dataset.vehicleAsset==='ready' && !document.querySelector('#start-engine')?.disabled`, 'menu', 90_000);
  await context.evaluate(`(() => {
    const select = document.querySelector('#graphics-quality');
    select.value = 'high'; select.dispatchEvent(new Event('change', {bubbles: true}));
    document.querySelectorAll('details').forEach(node => { node.open = false; });
    const app = window.__qaApp;
    app.profile = {...app.profile, credits: 20000,
      courses: {version: 1, unlocked: [...new Set([...(app.profile.courses?.unlocked || []), 'tremblant-woods', 'tremblant-snow', 'panorama-ridge'])]},
      heli: (() => { const heli = ${JSON.stringify(heli)}, d = new Date(), pad = n => String(n).padStart(2, '0');
        heli.playDay.last = d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
        return heli; })()};
    if (!app._saveProfile()) throw Error('fixture not saved');
    app.audio.setMuted?.(true);
    app.menuCar = 'falcone_f42';
  })()`);
  await context.waitFor(`document.querySelector('#graphics-quality')?.value==='high' && !document.querySelector('#start-engine')?.disabled`, 'high ready', 60_000);
  await context.evaluate(`document.querySelector('#heli-visit').click()`);
  await context.waitFor(`${app}.duel.state.status==='heli' && ${app}.visualReady`, 'helipad', 120_000);
  await context.evaluate(`(() => {
    const app = window.__qaApp, session = app.heliSession, step = session.step.bind(session), events = [];
    const clamp = v => Math.max(-1, Math.min(1, v)), wrap = a => Math.atan2(Math.sin(a), Math.cos(a));
    window.__pilot = null;
    // QA only: a page-side pilot that steers with the same controls a player has, and can face a point.
    session.step = (controls, dt) => {
      const v = session.view(), t = typeof window.__pilot === 'function' ? window.__pilot(v) : window.__pilot;
      if (!t || !v.heli) return step(controls, dt);
      const h = v.heli, fx = Math.sin(h.heading), fz = Math.cos(h.heading);
      const dx = t.x - h.x, dz = t.z - h.z, d = Math.hypot(dx, dz), want = Math.min(t.speed || 6, d * 0.4);
      const ex = (d > .01 ? dx / d * want : 0) - h.vx, ez = (d > .01 ? dz / d * want : 0) - h.vz;
      const sink = t.sink || 4, rise = Math.max(-sink, Math.min(sink, t.y - h.y));
      const yaw = t.face ? -clamp(wrap(Math.atan2(t.face.x - h.x, t.face.z - h.z) - h.heading) * 1.5) : 0;
      return step({pitch: clamp((ex * fx + ez * fz) * .25), roll: clamp((ex * -fz + ez * fx) * .25), lift: clamp(rise * .3 - h.vy * .3), yaw}, dt);
    };
    // Fast-forward the sim without drawing: until the test holds (checked twice a second) or the seconds run out.
    window.__go = (seconds, test = null) => {
      let hit = false;
      for (let i = 0; i < Math.round(seconds * 120); i++) {
        const got = session.step({}, 1 / 120); if (got?.length) events.push(...got);
        if (test && i % 60 === 0 && test(session.view())) { hit = true; break; }
      }
      app._heliEvents(events.splice(0));
      return hit;
    };
  })()`);
}

const press = (context, action) => context.evaluate(`${app}._inputAction(${JSON.stringify(action)})`);
const view = (context, expression) => context.evaluate(`(() => { const v = ${app}.heliView(); return ${expression}; })()`);
const pilotTo = (context, target) => context.evaluate(`window.__pilot = ${JSON.stringify(target)}`);
const sim = (context, seconds, test = 'null') => context.evaluate(`window.__go(${seconds}, ${test})`);
const groundAt = (context, x, z) => context.evaluate(`(() => { const g = ${app}.heliView()?.rescue?.ground; return g ? g(${x}, ${z}) : null; })()`);
// A world point's place on the screen, in page pixels (the real camera, so the closer looks aim at the right thing).
const screenOf = (context, p) => context.evaluate(`(() => { const {camera} = window.__render, v = new camera.position.constructor(${p.x}, ${p.y}, ${p.z}).project(camera);
  return {x: (v.x + 1) / 2 * innerWidth, y: (1 - v.y) / 2 * innerHeight, behind: v.z > 1}; })()`);

// Fly the page-side pilot to a point and wait (in sim time, fast) until it is there.
async function flyTo(context, target, label, {within = 4, seconds = 240, tall = 2.5} = {}) {
  // The flying area has an edge; stay 15 m inside it.
  const area = await view(context, 'v.area');
  if (area) {
    target.x = Math.min(area.maxX - 15, Math.max(area.minX + 15, target.x));
    target.z = Math.min(area.maxZ - 15, Math.max(area.minZ + 15, target.z));
  }
  await pilotTo(context, target);
  const done = await sim(context, seconds, `v => Math.hypot(v.heli.x - ${target.x}, v.heli.z - ${target.z}) < ${within} && Math.abs(v.heli.y - ${target.y}) < ${tall} && Math.hypot(v.heli.vx, v.heli.vz) < 1`);
  if (!done) throw Error(`Did not reach ${label}: target ${JSON.stringify(target)} heli ${JSON.stringify(await view(context, '({x: v.heli.x, y: v.heli.y, z: v.heli.z, vx: v.heli.vx, vz: v.heli.vz, pitch: v.heli.pitch, stage: v.rescue?.active?.stage})'))}`);
}
// Hover back from a point, up in the air, looking at it. The helicopter stands on the side toward the middle of the
// flying area, so the edge of the area never pushes it off the line of sight.
async function look(context, p, {back = 40, up = 30, speed = 22, within = 5, side = 0} = {}) {
  const area = await view(context, 'v.area');
  let dx = (area.minX + area.maxX) / 2 - p.x, dz = (area.minZ + area.maxZ) / 2 - p.z;
  const d = Math.hypot(dx, dz) || 1;
  dx /= d; dz /= d;
  const y = (await groundAt(context, p.x, p.z)) + up;
  const goal = {x: p.x + dx * back - dz * side, z: p.z + dz * back + dx * side, y, speed, face: {x: p.x, z: p.z}};
  // Straight up first (never down); across at that height when it is far; then down to the view.
  const at = await view(context, '({x: v.heli.x, z: v.heli.z, y: v.heli.y, zone: v.zone.y})');
  const far = Math.hypot(at.x - goal.x, at.z - goal.z) > 250, cruise = Math.max(y, at.y);
  await flyTo(context, {x: at.x, z: at.z, y: cruise, speed: 1, sink: 4}, 'a climb', {within: 8, tall: 5});
  if (far) await flyTo(context, {x: goal.x, z: goal.z, y: cruise, speed: 30}, 'the way across', {within: 20, tall: 8});
  await flyTo(context, goal, `a view of ${Math.round(p.x)}, ${Math.round(p.z)}`, {within});
}
// Take the picture, and a closer look at a world point beside it.
async function shoot(context, name, label, focus = null, ms = 1500) {
  await pause(ms);
  const path = await context.screenshot(name);
  const shot = {name, label, path};
  if (typeof focus === 'function') focus = await focus();
  if (focus) {
    const at = await screenOf(context, focus);
    if (!at.behind) shot.crop = [Math.min(1280 - 400, Math.max(0, at.x - 200)), Math.min(720 - 225, Math.max(0, at.y - 130)), 400, 225];
  }
  shots.push(shot);
  return shot;
}
const answer = async context => {
  await press(context, 'heli-radio');
  await context.waitFor(`!!${app}.heliView().rescue?.active`, 'the rescue begins', 30_000);
};
const fitLine = context => context.evaluate(`(() => { const r = ${app}.heliSession.fitRescueLine(); ${app}._heliEvents(${app}.heliSession.takeEvents()); if (!r.ok) throw Error(r.reason); })()`);
// To another course on the autopilot and the cruise leg, with whatever hangs on the line.
async function cruiseTo(context, courseId) {
  await context.evaluate(`(() => { const v = ${app}.heliView(); window.__pilot = {x: v.heli.x, z: v.heli.z, y: v.zone.y + 60, speed: 1, sink: 4}; })()`);
  await sim(context, 60, 'v => v.heli.y - v.zone.y > 50');
  await context.evaluate(`(() => { window.__pilot = null; ${app}.heliSetDestination(${JSON.stringify(courseId)}); if (!${app}.heliSession.autopilotOn) ${app}._inputAction('heli-autopilot'); })()`);
  if (!await sim(context, 400, 'v => v.cruiseOffered')) throw Error('The cruise leg was not offered');
  await context.evaluate(`(() => { if (${app}.heliSession.autopilotOn) ${app}._inputAction('heli-autopilot'); ${app}._inputAction('heli-cruise'); })()`);
  await sim(context, 8);
  await context.waitFor(`${app}.heliView().courseId===${JSON.stringify(courseId)} && ${app}.visualReady`, `arrive at ${courseId}`, 120_000);
  await sim(context, 2);
}
// Over a spot and down until the rescuer on the line rests on the ground there.
async function setDown(context, p, gy) {
  for (const up of [17.6, 16.8, 16.2, 15.6, 15]) {
    await flyTo(context, {x: p.x, z: p.z, y: gy + up, speed: 4, sink: 1.5, face: {x: p.x, z: p.z + 100}}, `above ${Math.round(p.x)}, ${Math.round(p.z)} at ${up}`, {within: 2.5, tall: 1.2});
    if (await sim(context, 8, 'v => v.rescue.line?.onGround')) return;
  }
  throw Error('The rescuer did not reach the ground');
}
// With a person on the line: to the landing zone, down slowly, and let the line rest in its circle.
// rough: two hard touchdowns (each a bump that hurts them one step more), then up and down again gently.
async function carryToZone(context, {rough = false} = {}) {
  const zone = await view(context, '({x: v.zone.x, z: v.zone.z, y: v.zone.y})');
  await flyTo(context, {x: zone.x, z: zone.z, y: zone.y + 24, speed: 18, face: {x: zone.x, z: zone.z + 100}}, 'over the landing zone', {within: 3, tall: 3, seconds: 300});
  if (rough) for (let touch = 0; touch < 2; touch++) {
    await pilotTo(context, {x: zone.x, z: zone.z, y: zone.y + 8, speed: 2, sink: 6, face: {x: zone.x, z: zone.z + 100}});
    await sim(context, 20, 'v => v.rescue.line?.onGround');
    await note('Rough touchdown:', await lineState(context));
    await flyTo(context, {x: zone.x, z: zone.z, y: zone.y + 24, speed: 2, sink: 4, face: {x: zone.x, z: zone.z + 100}}, 'up again', {within: 3, tall: 3});
  }
  for (const up of [19, 17.4, 16.6, 16, 15.4]) {
    await flyTo(context, {x: zone.x, z: zone.z, y: zone.y + up, speed: 2, sink: .8, face: {x: zone.x, z: zone.z + 100}}, `lowering over the zone to ${up}`, {within: 2, tall: .8});
    if (await sim(context, 10, 'v => !v.rescue.active')) return;
  }
  throw Error('The rescue was not handed over');
}
// With the rescuer resting on the ground: bring the helicopter down over the spot (the cable goes slack), so the side
// camera, which centres on the helicopter and the rescuer, shows the people above the panel.
async function lowerOver(context, p, gy, up) {
  await pilotTo(context, {x: p.x, z: p.z, y: gy + up, speed: 2, sink: 1.5, face: {x: p.x, z: p.z + 100}});
  await sim(context, 15, `v => Math.abs(v.heli.y - ${gy + up}) < .8 && Math.hypot(v.heli.vx, v.heli.vz) < .5`);
}
// The hold bar's share, and what the rescuer is doing, for the log.
const lineState = context => view(context, 'JSON.stringify({condition: v.rescue.active?.conditionName, line: v.rescue.line && {hold: v.rescue.line.hold, holding: v.rescue.line.holding, onGround: v.rescue.line.onGround, who: v.rescue.line.who}, stage: v.rescue.active?.stage, signal: v.rescue.active?.signal})');
const attempt = async (name, work) => { try { await work(); } catch (error) { failures.push(`${name}: ${error.message}`); note(`FAILED ${name}: ${error.message}`); } };

async function hiker(context) {
  await menu(context, callHeli('hiker', 'tremblant-woods'));
  await answer(context);
  const state = await view(context, 'JSON.parse(JSON.stringify({lastSeen: v.rescue.active.sites.lastSeen, clearing: v.rescue.active.sites.clearing}))');
  const seed = await context.evaluate(`${app}.profile.heli.missions.rescue.seed`);
  const course = new Course(ALL_CIRCUITS.find(def => def.id === 'tremblant-woods'), 1989), ground = groundFromCourse(course);
  const hiker = pickHiker(hikerSpots(course, ground, courseSite(course, ground, 'tremblant-woods')), seed).hiker;
  await note(`Hiker at ${hiker.x.toFixed(0)}, ${hiker.z.toFixed(0)}; clearing ${state.clearing.x.toFixed(0)}, ${state.clearing.z.toFixed(0)}`);
  // The search ring from above, before anyone is seen: climb first, so the hiker does not hear us pass.
  const last = state.lastSeen;
  await flyTo(context, {x: await view(context, 'v.heli.x'), z: await view(context, 'v.heli.z'), y: (await view(context, 'v.zone.y')) + 150, speed: 1}, 'a climb', {within: 6, tall: 5});
  await look(context, last, {back: 200, up: 150, speed: 28, within: 10});
  await context.evaluate(`${app}.heliCamera = 0`);
  await shoot(context, 'hiker-search-ring', 'Lost hiker: the search area ringed on the ground');
  // Spotted: the flare goes up and the hiker starts to walk.
  await look(context, hiker, {back: 38, up: 26, within: 4});
  await sim(context, 20, 'v => !!v.rescue.active.sites.hiker');
  if (!await view(context, '!!v.rescue.active.sites.hiker')) throw Error('The hiker was not spotted');
  await sim(context, 4);
  const at = await view(context, 'v.rescue.active.sites.hiker');
  await shoot(context, 'hiker-flare', 'The flare: orange smoke climbs from the hiker, who walks to the clearing');
  // Close in: the cockpit view, 26 m off and 4 m up (so the hiker clears the panel).
  const near0 = await view(context, 'v.rescue.active.sites.hiker');
  await look(context, near0, {back: 26, up: 4, speed: 10, within: 3});
  await context.evaluate(`${app}.heliCamera = 1`);
  const near = await view(context, 'v.rescue.active.sites.hiker');
  await shoot(context, 'hiker-close', 'The hiker close up, flare in hand', {x: near.x, y: (await groundAt(context, near.x, near.z)) + 1, z: near.z}, 600);
  await context.evaluate(`${app}.heliCamera = 0`);
  // Arrived at the clearing: waving, the ring round the landing place.
  await sim(context, 120, 'v => v.rescue.active.sites.hiker.arrived');
  const there = await view(context, 'v.rescue.active.sites.hiker');
  await note(`Hiker arrived at the clearing: ${there.arrived}`);
  await shoot(context, 'hiker-clearing', 'At the clearing: the hiker waves, the landing ring marks the place', null, 800);
}

// quick: skip the pictures on the way and set the skier down hard first, for the stretcher.
async function avalanche(context, {quick = false} = {}) {
  await menu(context, callHeli('avalanche', 'tremblant-snow'));
  await answer(context);
  await fitLine(context);
  await cruiseTo(context, 'tremblant-snow');
  const sites = await view(context, 'JSON.parse(JSON.stringify(v.rescue.active.sites))');
  const b = sites.beacon;
  await note(`Beacon at ${b.x.toFixed(0)}, ${b.z.toFixed(0)}; slide ${sites.slide.x.toFixed(0)}, ${sites.slide.z.toFixed(0)}`);
  await context.evaluate(`${app}.heliCamera = 0`);
  // The slide from a distance: the snow blocks, no signal yet.
  if (!quick) {
    await look(context, sites.slide, {back: 150, up: 60, speed: 28, within: 8});
    await shoot(context, 'avalanche-slide', 'The slide: rough snow blocks over the slope, no signal yet');
    if (FINISH) {
      // The rescuer alone on the line, held steady under the helicopter: the side camera, then the chase camera.
      const alone = () => view(context, '({x: v.rescue.line.x, y: v.rescue.line.y - 1.4, z: v.rescue.line.z})');
      await context.evaluate(`${app}.heliCamera = 3`);
      await shoot(context, 'line-alone-side', 'The rescuer on the line, alone: from the side', alone, 1200);
    }
    // Closing on the beacon: the bar fills.
    await look(context, b, {back: 45, up: 28, within: 4});
    await note('Signal at 45 m back:', await lineState(context));
    await shoot(context, 'avalanche-beacon-bar', 'Closing on the beacon: the bar fills as the beeps quicken');
  } else await look(context, b, {back: 45, up: 28, speed: 28, within: 4});
  // Set the rescuer down and dig, seen from the side with the helicopter brought low.
  const gy = await groundAt(context, b.x, b.z);
  await setDown(context, b, gy);
  await lowerOver(context, b, gy, 10.5);
  if (FINISH && !quick) {
    // From behind the cable is long: with the helicopter brought low the rescuer stands clear of the panel.
    await context.evaluate(`${app}.heliCamera = 0`);
    await shoot(context, 'line-alone-behind', 'The rescuer on the line, alone: from behind (set down at the beacon)', () => view(context, '({x: v.rescue.line.x, y: v.rescue.line.y - 1.4, z: v.rescue.line.z})'), 900);
  }
  await context.evaluate(`${app}.heliCamera = 3`);
  await sim(context, 8, 'v => v.rescue.line?.holding && v.rescue.line.hold > .4');
  await note('Digging:', await lineState(context));
  if (!quick) await shoot(context, 'avalanche-dig', 'The dig: the skier comes up out of the snow as the bar fills', {x: b.x, y: gy + 1, z: b.z}, 400);
  await sim(context, 30, 'v => v.rescue.active.stage === "carry"');
  await note('After the dig:', await lineState(context));
  if (FINISH && !quick) {
    // The skier clipped on, the helicopter still low: from behind, then the side.
    await context.evaluate(`${app}.heliCamera = 0`);
    await shoot(context, 'line-pair-behind', 'The rescuer with the skier clipped on: from behind', () => view(context, '({x: v.rescue.line.x, y: v.rescue.line.y - 1.4, z: v.rescue.line.z})'), 900);
    await context.evaluate(`${app}.heliCamera = 3`);
  }
  if (!quick) {
    // The pair under the helicopter, seen from behind as a pilot sees them.
    await context.evaluate(`${app}.heliCamera = 3`);
    await flyTo(context, {x: b.x, z: b.z - 40, y: gy + 40, speed: 12, face: {x: b.x, z: b.z + 100}}, 'a climb with the pair', {within: 6, tall: 4});
    await sim(context, 3);
    const pair = await view(context, '({x: v.rescue.line.x, y: v.rescue.line.y, z: v.rescue.line.z})');
    await shoot(context, 'avalanche-carry', 'The rescuer with the skier clipped on: from the side, in the air', pair, 600);
  }
  // Carried to the landing zone and set down gently: the paramedics come for the skier.
  await carryToZone(context, {rough: quick});
  await note('Handed over:', await view(context, 'JSON.stringify({active: !!v.rescue.active, line: v.rescue.line && {who: v.rescue.line.who, onGround: v.rescue.line.onGround, done: v.rescue.line.done}})'));
  const spot = await view(context, '({x: v.rescue.line.x, z: v.rescue.line.z})'), ground = await groundAt(context, spot.x, spot.z);
  await lowerOver(context, spot, ground, 9);
  await context.evaluate(`${app}.heliCamera = 3`);
  await shoot(context, quick ? 'stretcher-handover' : 'avalanche-handover', quick ? 'A badly hurt skier: the paramedics bring a stretcher' : 'The handover: two paramedics walk in to take the skier', {x: spot.x, y: ground + 1, z: spot.z}, 3800);
}

async function hoist(context) {
  await menu(context, callHeli('hoist', 'panorama-ridge'));
  await answer(context);
  await fitLine(context);
  await cruiseTo(context, 'panorama-ridge');
  const sites = await view(context, 'JSON.parse(JSON.stringify(v.rescue.active.sites))');
  const d = sites.driver;
  await note(`Driver at ${d.x.toFixed(0)}, ${d.z.toFixed(0)}, ${d.y.toFixed(0)}`);
  await context.evaluate(`${app}.heliCamera = 0`);
  await look(context, d, {back: 110, up: 30, speed: 25, within: 6, side: 30});
  await shoot(context, 'hoist-approach', 'The hoist: the driver stands on the slope below the road');
  const gy = await groundAt(context, d.x, d.z);
  if (FINISH) {
    // Closer, to see the driver and the car that went off the road beside him.
    const c = sites.car, mid = {x: (d.x + c.x) / 2, y: gy + 1, z: (d.z + c.z) / 2};
    await note(`Car at ${c.x.toFixed(0)}, ${c.z.toFixed(0)}, ${c.y.toFixed(0)} heading ${c.heading.toFixed(2)}`);
    await look(context, mid, {back: 42, up: 24, speed: 14, within: 4, side: 16});
    await shoot(context, 'hoist-car', 'The hoist site: the driver and the car that left the road', mid, 900);
  }
  await context.evaluate(`${app}.heliCamera = 2`);
  await setDown(context, d, gy);
  // Lower the helicopter a little on the cliff for the side view; if the slope will not have it, the view stays down the cable.
  try { await lowerOver(context, d, gy, 11); await context.evaluate(`${app}.heliCamera = 3`); } catch (error) { await note('Hoist kept high:', error.message); }
  await sim(context, 40, 'v => v.rescue.line?.holding && v.rescue.line.hold > .4');
  await note('Hold:', await lineState(context));
  await shoot(context, 'hoist-hold', 'The hold: the rescuer at the driver on the steep slope', {x: d.x, y: gy + 1, z: d.z}, 400);
}

async function supply(context) {
  await menu(context, callHeli('supply', 'tremblant-snow'));
  await answer(context);
  const crates = await view(context, 'JSON.parse(JSON.stringify(v.rescue.crates))');
  await note(`Crates at ${crates.map(c => `${c.id} ${c.x.toFixed(0)},${c.z.toFixed(0)}`).join('; ')}`);
  const mid = {x: crates.reduce((s, c) => s + c.x, 0) / 3, z: crates.reduce((s, c) => s + c.z, 0) / 3};
  await context.evaluate(`${app}.heliCamera = 0`);
  await look(context, mid, {back: 30, up: 10, within: 4, side: 22});
  await shoot(context, 'supply-crates', 'The supply run: three crates wait by the pad', {x: mid.x, y: (await groundAt(context, mid.x, mid.z)) + 1, z: mid.z});
  // Hook the food crate and carry it up.
  const food = crates.find(c => c.id === 'food');
  await flyTo(context, {x: food.x, z: food.z, y: food.y + 15.4, speed: 5, sink: 3, face: {x: food.x, z: food.z + 100}}, 'over the food crate', {within: 1.2, tall: 1});
  await press(context, 'heli-hook');
  if (!await view(context, 'v.rescue.crates.some(c => c.hooked)')) throw Error('The crate did not hook');
  await flyTo(context, {x: food.x, z: food.z, y: food.y + 40, speed: 5, sink: 3, face: {x: food.x, z: food.z + 100}}, 'up with the crate', {within: 3, tall: 3});
  await sim(context, 5);
  await context.evaluate(`${app}.heliCamera = 3`);
  const hung = await view(context, 'v.rescue.crates.find(c => c.hooked)');
  await shoot(context, 'supply-carry', 'A crate on the line, from the side: the run counts crates down', {x: hung.x, y: hung.y, z: hung.z}, 800);
  if (FINISH) {
    // Over to the yard by the lodge, and set the crate down gently inside its ring.
    await cruiseTo(context, 'tremblant-snow');
    const yard = await view(context, 'JSON.parse(JSON.stringify(v.rescue.active.sites.yard))');
    const yg = await groundAt(context, yard.x, yard.z);
    await note(`Yard at ${yard.x.toFixed(0)}, ${yard.z.toFixed(0)}, ${yg.toFixed(0)}`);
    await flyTo(context, {x: yard.x, z: yard.z, y: yg + 40, speed: 20, face: {x: yard.x, z: yard.z + 100}}, 'over the yard', {within: 3, tall: 3, seconds: 300});
    let state = null;
    for (let i = 0; i < 160; i++) {
      state = JSON.parse(await view(context, 'JSON.stringify({h: v.heli, c: v.rescue.crates.find(c => c.hooked) || null})'));
      if (!state.c || state.c.y < yg + 1) break;
      const high = state.c.y - yg > 8;
      await pilotTo(context, {x: yard.x - (state.c.x - state.h.x), z: yard.z - (state.c.z - state.h.z), y: state.h.y - (high ? 3 : .5), speed: 1.5, sink: high ? 4 : .6, face: {x: yard.x, z: yard.z + 100}});
      await sim(context, 1);
    }
    if (!state?.c) throw Error('The crate was not on the line over the yard');
    await press(context, 'heli-hook');
    await sim(context, 2);
    await note('Crate states:', await view(context, 'JSON.stringify(v.rescue.active?.crates)'));
    await context.evaluate(`${app}.heliCamera = 0`);
    const down = () => view(context, '(c => ({x: c.x, y: c.y, z: c.z}))(v.rescue.crates.find(c => c.id === "food"))');
    await look(context, await down(), {back: 15, up: 8, speed: 8, within: 3, side: 6});
    await shoot(context, 'supply-yard', 'A crate set down in the yard, inside its ring', down, 1000);
  }
}

async function dusk(context) {
  await menu(context, callHeli('hiker', 'tremblant-woods'));
  await answer(context);
  await context.evaluate(`${app}.heliCamera = 0`);
  // Most of the clock gone: run it on without drawing, then stop with under a minute left.
  if (!await sim(context, 900, 'v => v.rescue.active.left <= 70')) throw Error('The clock did not reach dusk');
  await context.evaluate(`(() => { const v = ${app}.heliView(); window.__pilot = {x: v.heli.x, z: v.heli.z, y: v.zone.y + 40, speed: 1, sink: 3}; })()`);
  await sim(context, 8);
  await note('Dusk:', await view(context, 'JSON.stringify({left: v.rescue.active.left, dusk: v.rescue.active.dusk, orange: v.rescue.active.orange})'));
  await shoot(context, 'dusk-panel', 'Dusk: the light falls over the last minutes and the clock turns orange', null, 1200);
}

// The sheet: each picture, and a closer look at the subject beside it. Drawn one picture at a time, so no
// single message to the browser carries every screenshot.
async function writeSheet(context, path, title) {
  const cells = [];
  for (const shot of shots) {
    if (FINISH && !KEEP.includes(shot.name)) continue;
    cells.push({label: shot.label, path: shot.path});
    if (shot.crop) cells.push({label: `${shot.label.split(':')[0]}: closer`, path: shot.path, crop: shot.crop});
  }
  const w = 640, h = 360, cols = 3;
  await context.evaluate(`(() => {
    const c = window.__sheet = document.createElement('canvas');
    c.width = ${w * cols}; c.height = 44 + Math.ceil(${cells.length} / ${cols}) * (${h} + 30);
    const x = c.getContext('2d'); x.fillStyle = '#14191a'; x.fillRect(0, 0, c.width, c.height);
    x.fillStyle = '#eadabc'; x.font = '22px sans-serif'; x.fillText(${JSON.stringify(title)}, 16, 30);
  })()`);
  for (let i = 0; i < cells.length; i++) {
    const data = 'data:image/png;base64,' + (await readFile(cells[i].path)).toString('base64');
    await context.evaluate(`(async () => {
      const c = window.__sheet, x = c.getContext('2d'), i = ${i}, r = ${JSON.stringify(cells[i].crop ?? null)};
      const im = new Image(); im.src = ${JSON.stringify(data)}; await im.decode();
      const left = (i % ${cols}) * ${w}, top = 44 + Math.floor(i / ${cols}) * (${h} + 30), k = im.width / 1280;
      if (r) x.drawImage(im, r[0] * k, r[1] * k, r[2] * k, r[3] * k, left + 4, top, ${w - 8}, ${h});
      else x.drawImage(im, left + 4, top, ${w - 8}, ${h});
      x.fillStyle = '#fff'; x.font = '17px sans-serif'; x.fillText(${JSON.stringify(cells[i].label.slice(0, 70))}, left + 10, top + ${h} + 21);
    })()`);
  }
  const png = await context.evaluate(`window.__sheet.toDataURL('image/png')`);
  await writeFile(path, Buffer.from(png.split(',')[1], 'base64'));
}

export async function run(context) {
  // Twice the pixels, so the closer looks have detail to show.
  await context.command('Emulation.setDeviceMetricsOverride', {width: 1280, height: 720, deviceScaleFactor: 2, mobile: false});
  if (ONLY.includes('hiker')) await attempt('hiker', () => hiker(context));
  if (ONLY.includes('avalanche')) await attempt('avalanche', () => avalanche(context));
  if (ONLY.includes('hoist')) await attempt('hoist', () => hoist(context));
  if (ONLY.includes('supply')) await attempt('supply', () => supply(context));
  if (ONLY.includes('dusk')) await attempt('dusk', () => dusk(context));
  if (ONLY.includes('stretcher')) await attempt('stretcher', () => avalanche(context, {quick: true}));
  if (SHEET_ROUND && shots.length) {
    const raw = join(context.outputDir, 'sheet.png');
    await writeSheet(context, raw, `RESCUE-VIEW round ${SHEET_ROUND}: H4 Rescue (browser captures, High quality, memory-only saves)`);
    await note(`Comparison sheet: ${await publishReviewSheet(context, raw, 'heli-rescue-view', SHEET_ROUND)}`);
  }
  if (failures.length) throw Error(failures.join(' | '));
}

// Shared flight controls for the RESCUE-FINISH evidence recipe.
export {menu, callHeli, answer, fitLine, cruiseTo, flyTo, look, setDown, lowerOver,
  carryToZone, shoot, view, pilotTo, sim, groundAt};
