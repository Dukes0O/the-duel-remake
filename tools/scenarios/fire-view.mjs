// FIRE-VIEW's look and frame check (docs/HELI_FIRE.md section 16): a
// 60-cell fire at Tremblant Woods seen from 150 m on High and Performance,
// a drop with the aim ring, and a race on the burnt course at each regrowth
// stage. Saves are memory-only. Run:
//   node tools/browser-harness.mjs scenario fire-view
// FIRE_VIEW_FRAMES=0 takes the pictures only.
import {Course} from '../../src/course.js';
import {ALL_CIRCUITS} from '../../src/circuits/index.js';
import {groundFromCourse} from '../../src/heli/heli-ground.js';
import {courseSite} from '../../src/heli/heli-session.js';
import {fireGrid, startCells, startFire, spreadStep} from '../../src/heli/heli-fire.js';
import {armMissions} from '../../src/heli/heli-missions.js';
import {createMissions} from '../../src/heli/heli-save.js';

const entry = '/tools/menu-check.html?flags=helicopter,forest-fire,tremblant-woods,tremblant-snow';
const P95_LIMIT_MS = 18.5;
const FRAMES = process.env.FIRE_VIEW_FRAMES !== '0';
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

// The biggest fire that can burn: one cell short of the lost size (45 since
// FIRE-SPREAD's tuning; the packet's 60-cell figure predates it).
function biggestFire() {
  const course = new Course(ALL_CIRCUITS.find(def => def.id === 'tremblant-woods'), 1989), ground = groundFromCourse(course);
  const grid = fireGrid(course, ground, courseSite(course, ground, 'tremblant-woods'));
  let fire = startFire({id: 'fire-1', courseId: 'tremblant-woods', grid, seed: 4242, startDay: 5, candidates: startCells(course, ground, grid, [])});
  const calm = {speed: 0.5, toward: {x: 1, z: 0}};
  while (fire.burning.length + fire.burnt.length < grid.lostAt - 1) {
    const next = spreadStep(fire, grid, calm);
    if (next.burning.length + next.burnt.length >= grid.lostAt) break;
    fire = next;
  }
  return {...fire, burnt: [], damp: []};
}

async function menu(context, quality, heli) {
  await context.navigate(entry);
  await context.waitFor(`document.readyState==='complete' && !!window.__qaApp &&
    document.querySelector('#view3d')?.dataset.vehicleAsset==='ready' && !document.querySelector('#start-engine')?.disabled`, `${quality} menu`, 90_000);
  await context.evaluate(`(() => {
    const select = document.querySelector('#graphics-quality');
    select.value = ${JSON.stringify(quality)}; select.dispatchEvent(new Event('change', {bubbles: true}));
    document.querySelectorAll('details').forEach(node => { node.open = false; });
    const app = window.__qaApp;
    app.profile = {...app.profile, credits: 20000,
      courses: {version: 1, unlocked: [...new Set([...(app.profile.courses?.unlocked || []), 'tremblant-woods'])]},
      heli: (() => { const heli = ${JSON.stringify(heli)}, d = new Date(), pad = n => String(n).padStart(2, '0');
        if (heli.playDay) heli.playDay.last = d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
        return heli; })()};
    if (!app._saveProfile()) throw Error('fixture not saved');
    app.audio.setMuted?.(true);
    app.menuCar = 'falcone_f42';
  })()`);
  await context.waitFor(`document.querySelector('#graphics-quality')?.value===${JSON.stringify(quality)} && !document.querySelector('#start-engine')?.disabled`, `${quality} ready`, 60_000);
}

async function installPilot(context) {
  await context.evaluate(`(() => {
    const app = window.__qaApp, session = app.heliSession, step = session.step.bind(session);
    const clamp = v => Math.max(-1, Math.min(1, v));
    window.__pilot = null; window.__pour = false;
    session.step = (controls, dt) => {
      const t = window.__pilot, v = session.view();
      if (!t || !v.heli) return step({...controls, ...(window.__pour ? {pour: true} : {})}, dt);
      const h = v.heli, fx = Math.sin(h.heading), fz = Math.cos(h.heading);
      const dx = t.x - h.x, dz = t.z - h.z, d = Math.hypot(dx, dz), want = Math.min(t.speed || 6, d * 0.4);
      const ex = (d > .01 ? dx / d * want : 0) - h.vx, ez = (d > .01 ? dz / d * want : 0) - h.vz;
      const sink = t.sink || 4, rise = Math.max(-sink, Math.min(sink, t.y - h.y));
      return step({pitch: clamp((ex * fx + ez * fz) * .25), roll: clamp((ex * -fz + ez * fx) * .25),
        lift: clamp(rise * .3 - h.vy * .3), yaw: 0, ...(window.__pour ? {pour: true} : {})}, dt);
    };
  })()`);
}

async function measure(context, label) {
  const before = await context.evaluate(`(document.querySelector('#performance-results')?.textContent.match(/"frames": 120/g) || []).length`);
  await context.evaluate(`[...document.querySelectorAll('button')].find(node => node.textContent === 'Measure frame pacing').click()`);
  await context.waitFor(`(document.querySelector('#performance-results')?.textContent.match(/"frames": 120/g) || []).length > ${before}`, `${label} frames`, 90_000);
  const report = await context.evaluate(`JSON.parse(document.querySelector('#performance-results').textContent).at(-1)`);
  console.log(`Frames ${label}: p50 ${report.p50} ms, p95 ${report.p95} ms, >33ms ${report.over33ms}, draws ${report.drawCalls}, triangles ${report.triangles}`);
  return {label, ...report};
}

const trained = {liftoff: true, hover: true, landing: true, carry: true};
function fightingHeli(fire) {
  const missions = {...armMissions(createMissions(), {date: '2026-10-14', playerName: 'QA'}), count: 4,
    call: {kind: 'fire', id: fire.id, courseId: 'tremblant-woods', day: 5, answered: true}};
  return {version: 1, fuelKg: 400, refuels: 3, lessons: trained, playDay: {last: '2026-10-20', count: 5}, missions, fire};
}

async function overTheFire(context, quality, fire, {pictures}) {
  await menu(context, quality, fightingHeli(fire));
  await context.evaluate(`document.querySelector('#heli-visit').click()`);
  await context.waitFor(`window.__qaApp.duel.state.status==='heli' && window.__qaApp.visualReady`, 'helipad', 120_000);
  await installPilot(context);
  // 150 m over the fire, looking at it.
  await context.evaluate(`(() => { const v = window.__qaApp.heliView(), t = v.fire.target;
    window.__pilot = {x: t.x - 120, z: t.z - 120, y: v.zone.y + 150, speed: 18}; window.__qaApp.heliCamera = 2; })()`);
  await context.waitFor(`(() => { const v = window.__qaApp.heliView(), t = window.__pilot;
    return Math.hypot(v.heli.x - t.x, v.heli.z - t.z) < 6 && Math.abs(v.heli.y - t.y) < 3 && Math.hypot(v.heli.vx, v.heli.vz) < 1; })()`, 'over the fire', 240_000);
  await pause(1500);
  if (pictures) await context.screenshot(`fire-150m-${quality}`);
  return FRAMES ? measure(context, `${quality}, 150 m over a ${fire.burning.length}-cell fire`) : null;
}

async function burntRace(context, quality, {stage, days}) {
  const heli = {version: 1, fuelKg: 0, refuels: 1, lessons: trained, playDay: {last: '2026-10-20', count: 70},
    burnt: {'tremblant-woods': {day: 70 - days, boughtBack: days < 10}}};
  await menu(context, quality, heli);
  await context.evaluate(`(() => { const app = window.__qaApp;
    for (let i = 0; i < 40; i++) { const course = app.getMenuCourse(i); if (course?.def?.id === 'tremblant-woods') { app.returnToMenu?.(); return app.startCampaign({startStage: i, car: 'falcone_f42'}); } }
    throw Error('Tremblant Woods is not on the menu'); })()`);
  await context.waitFor(`['countdown','racing'].includes(window.__qaApp.duel.state.status) && window.__qaApp.duel.course.def.id==='tremblant-woods' && window.__qaApp.visualReady`, `race ${stage}`, 120_000);
  await pause(2500);
  await context.screenshot(`burnt-${stage}-${quality}`);
  const frames = FRAMES && stage === 'black' ? await measure(context, `${quality}, a race on the burnt course`) : null;
  await context.evaluate(`window.__qaApp.returnToMenu()`);
  return frames;
}

export async function run(context) {
  await context.command('Emulation.setDeviceMetricsOverride', {width: 1280, height: 720, deviceScaleFactor: 1, mobile: false});
  const fire = biggestFire();
  console.log(`Fire for the check: ${fire.burning.length} burning cells`);
  const frames = [];
  for (const quality of ['high', 'performance']) {
    const result = await overTheFire(context, quality, fire, {pictures: true});
    if (result) frames.push(result);
  }
  for (const [stage, days] of [['black', 12], ['shoots', 25], ['fireweed', 40]]) {
    const result = await burntRace(context, 'high', {stage, days});
    if (result) frames.push(result);
  }
  if (FRAMES) {
    const result = await burntRace(context, 'performance', {stage: 'black', days: 12});
    if (result) frames.push(result);
    const failed = frames.filter(item => item.p95 > P95_LIMIT_MS);
    console.log(`Frame check: ${frames.map(item => `${item.label} p95 ${item.p95} ms`).join('; ')} (limit ${P95_LIMIT_MS} ms)${failed.length ? ' FAILED' : ''}`);
  }
}
