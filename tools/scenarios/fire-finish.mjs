// FIRE-FINISH (docs/HELI_FIRE.md section 16): Claude's play-through of H2
// Fire in the browser. One fire flown from the call to out (answer on R,
// the bucket, the lake, drops until it is out, the pay and the badge), and
// one left to burn (a visit on a new play day loses it and closes the
// course, with its buyback on the course menu). Saves are memory-only. Run:
//   node tools/browser-harness.mjs scenario fire-finish
// FIRE_FINISH_SHEET=<round> also writes docs/board/looks/fire-finish/round-<round>.jpg.
import {join} from 'node:path';
import {armMissions} from '../../src/heli/heli-missions.js';
import {createMissions} from '../../src/heli/heli-save.js';
import {publishReviewSheet} from './review-sheet.mjs';
import {TRAINED, biggestFire, menu, installPilot, writeSheet} from './fire-view.mjs';

const SHEET_ROUND = Number(process.env.FIRE_FINISH_SHEET || 0);
const app = 'window.__qaApp';
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const shots = [];
let refuels = 0;
// What the helicopter was doing when a step timed out.
const state = context => context.evaluate(`(() => { const v = ${app}.heliView();
  return JSON.stringify({fuel: Math.round(v.heli.fuelKg), up: Math.round(v.heli.y - v.zone.y), speed: Math.round(Math.hypot(v.heli.vx, v.heli.vz)),
    autopilot: ${app}.heliSession.autopilotOn, bucket: v.bucket?.words, fire: v.fire?.burning?.length ?? null, log: ${app}.heliLog.slice(-6).map(e => e.type)}); })()`);
const shoot = async (context, name, label) => { shots.push({label, path: await context.screenshot(name)}); };
const logged = type => `${app}.heliLog.some(e => e.type === ${JSON.stringify(type)})`;
const settled = `(() => { const v = ${app}.heliView(), t = window.__pilot;
  return Math.hypot(v.heli.x - t.x, v.heli.z - t.z) < 6 && Math.abs(v.heli.y - t.y) < 3 && Math.hypot(v.heli.vx, v.heli.vz) < 1; })()`;

// Lessons done and the mission engine armed with its need met: the next
// lift-off brings a call 20 to 60 s into the flight.
function readyForCall() {
  const armed = armMissions(createMissions(), {date: '2026-10-14', playerName: 'QA'});
  return {version: 1, fuelKg: 400, refuels: 3, lessons: TRAINED, playDay: {last: '2026-10-20', count: 5},
    missions: {...armed, count: armed.need}};
}

async function landAtPad(context) {
  await context.evaluate(`(() => { const v = ${app}.heliView(); if (${app}.heliSession.autopilotOn) ${app}._inputAction('heli-autopilot');
    window.__pilot = {x: v.zone.x, z: v.zone.z, y: v.zone.y + 25, speed: 12}; })()`);
  await context.waitFor(settled, 'over the pad', 240_000);
  await context.evaluate(`(() => { const v = ${app}.heliView(); window.__pilot = {x: v.zone.x, z: v.zone.z, y: v.zone.y - 2, speed: 1, sink: 1.5}; })()`);
  await context.waitFor(`${app}.heliView().heli.onGround`, 'landed on the pad', 120_000);
}

// One bucket: the autopilot to the lake, a dip by hand, the climb, the
// autopilot to the hot edge, H held until the bucket is empty.
async function oneDrop(context, n) {
  // Fuel low: back to the pad for the pump, as a player would.
  if (await context.evaluate(`${app}.heliView().heli.fuelKg < 220`)) {
    await landAtPad(context);
    await context.evaluate(`(() => { const r = ${app}.heliSession.buyFuel(Infinity); ${app}._heliEvents(${app}.heliSession.takeEvents()); if (!r.ok) throw Error(r.reason); })()`);
    refuels++;
    await context.evaluate(`(() => { const v = ${app}.heliView(); window.__pilot = {x: v.heli.x, z: v.heli.z, y: v.zone.y + 45, speed: 1, sink: 3}; })()`);
    await context.waitFor(`${app}.heliView().heli.y - ${app}.heliView().zone.y > 40`, `drop ${n}: lift the bucket after the pump`, 60_000);
  }
  await context.evaluate(`(() => { ${app}.heliLog = []; window.__pilot = null; if (!${app}.heliSession.autopilotOn) ${app}._inputAction('heli-autopilot'); })()`);
  await context.waitFor(logged('autopilotArrived'), `drop ${n}: the autopilot at the lake`, 300_000);
  await context.evaluate(`(() => { ${app}._inputAction('heli-autopilot'); const v = ${app}.heliView();
    window.__pilot = {x: v.heli.x, z: v.heli.z, y: v.heli.y - 7.6, speed: 1, sink: 1.5}; })()`);
  await context.waitFor(`${app}.heliView().bucket?.words === 'full'`, `drop ${n}: a full bucket`, 120_000);
  await context.evaluate(`(() => { const v = ${app}.heliView(); window.__pilot = {x: v.heli.x, z: v.heli.z, y: v.zone.y + 60, speed: 1, sink: 4}; })()`);
  await context.waitFor(`${app}.heliView().heli.y - ${app}.heliView().zone.y > 52`, `drop ${n}: climb out`, 90_000);
  await context.evaluate(`(() => { window.__pilot = null; ${app}.heliLog = []; ${app}._inputAction('heli-autopilot'); })()`);
  await context.waitFor(`${logged('autopilotArrived')} || !${app}.heliView().fire`, `drop ${n}: the autopilot at the fire`, 300_000);
  if (!await context.evaluate(`!!${app}.heliView().fire`)) return true;
  await context.evaluate(`(() => { ${app}._inputAction('heli-autopilot'); window.__pilot = null; window.__pour = true; })()`);
  await pause(700);
  if (n === 1) await shoot(context, 'fire-finish-drop', 'The first drop on the fire');
  await context.waitFor(`(${app}.heliView().bucket?.water ?? 0) <= 1`, `drop ${n}: the bucket empties`, 30_000);
  await context.evaluate(`window.__pour = false`);
  await pause(4000);
  return context.evaluate(`${logged('fireOut')} || !${app}.heliView().fire`);
}

async function flyOneOut(context) {
  await menu(context, 'high', readyForCall());
  await context.evaluate(`document.querySelector('#heli-visit').click()`);
  await context.waitFor(`${app}.duel.state.status==='heli' && ${app}.visualReady`, 'helipad', 120_000);
  await installPilot(context);
  await context.evaluate(`(() => { ${app}.heliLog = []; const v = ${app}.heliView(); window.__pilot = {x: v.heli.x, z: v.heli.z, y: v.zone.y + 45, speed: 2, sink: 4}; ${app}.heliCamera = 0; })()`);
  // The call rings only 30 m or more above the ground (MISSION_RULES.callHeight).
  await context.waitFor(logged('fireCall'), 'the radio call', 150_000);
  await pause(1200);
  await shoot(context, 'fire-finish-call', 'The call: dispatch on the radio, R to answer');
  await context.evaluate(`${app}._inputAction('heli-radio')`);
  await context.waitFor(logged('fireAnswered'), 'answered', 10_000);
  await landAtPad(context);
  await context.evaluate(`(() => { window.__pilot = null; const r = ${app}.heliSession.fitBucket(); ${app}._heliEvents(${app}.heliSession.takeEvents()); if (!r.ok) throw Error(r.reason); })()`);
  await context.evaluate(`(() => { const v = ${app}.heliView(); window.__pilot = {x: v.heli.x, z: v.heli.z, y: v.zone.y + 45, speed: 1, sink: 3}; ${app}.heliCamera = 2; })()`);
  await context.waitFor(`${app}.heliView().heli.y - ${app}.heliView().zone.y > 40`, 'lift the bucket', 60_000);
  const start = await context.evaluate(`${app}.profile.credits`);
  let drops = 0, out = false;
  try {
    while (!out && drops < 12) out = await oneDrop(context, ++drops);
  } catch (error) {
    await context.screenshot('fire-finish-stuck');
    throw Error(`${error.message} (state: ${await state(context)})`);
  }
  if (!out) throw Error(`The fire was not out after ${drops} drops`);
  await context.evaluate(`(() => { window.__pilot = null; const v = ${app}.heliView(); window.__pilot = {x: v.heli.x, z: v.heli.z, y: v.heli.y, speed: 1}; ${app}.heliCamera = 0; })()`);
  await pause(1500);
  await shoot(context, 'fire-finish-out', 'Fire out: the pay and the badge');
  const result = await context.evaluate(`({credits: ${app}.profile.credits, firesOut: ${app}.profile.heli.missions.firesOut, fire: !!${app}.profile.heli.fire})`);
  console.log(`Fire flown out in ${drops} drops and ${refuels} refuels: +${result.credits - start} credits, fires out ${result.firesOut}, fire left ${result.fire}`);
  if (result.fire || result.firesOut !== 1 || result.credits - start < 1500) throw Error('The fire did not end as out and paid');
  return drops;
}

async function letOneBurn(context) {
  // A fire one step short of lost, unanswered for days: the next play day loses it.
  const fire = biggestFire();
  const armed = armMissions(createMissions(), {date: '2026-10-14', playerName: 'QA'});
  const heli = {version: 1, fuelKg: 400, refuels: 3, lessons: TRAINED, playDay: {last: '2026-10-20', count: 5},
    missions: {...armed, count: armed.need, call: {kind: 'fire', id: fire.id, courseId: 'tremblant-woods', day: 5, answered: false}}, fire};
  await menu(context, 'high', heli, {newDay: true});
  await context.evaluate(`document.querySelector('#heli-visit').click()`);
  await context.waitFor(`${app}.duel.state.status==='heli' && ${app}.visualReady`, 'helipad, a new play day', 120_000);
  await context.waitFor(`!${app}.profile.heli.fire && !!${app}.profile.heli.burnt?.['tremblant-woods']`, 'the fire lost overnight', 30_000);
  await pause(1500);
  await shoot(context, 'fire-finish-lost', 'Left to burn: lost overnight, the course closes');
  await context.evaluate(`${app}.requestNavigation('menu')`);
  await context.waitFor(`${app}.duel.state.status==='menu'`, 'back to the menu', 60_000);
  await context.evaluate(`document.querySelector('[data-action="courses"]').click()`);
  await context.waitFor(`!!document.querySelector('[data-course-buyback="tremblant-woods"]')`, 'the closed course card', 30_000);
  await context.evaluate(`document.querySelector('[data-course-buyback="tremblant-woods"]').scrollIntoView({block: 'center'})`);
  await pause(800);
  await shoot(context, 'fire-finish-closed', 'The closed course and its buyback');
}

export async function run(context) {
  await context.command('Emulation.setDeviceMetricsOverride', {width: 1280, height: 720, deviceScaleFactor: 1, mobile: false});
  await flyOneOut(context);
  await letOneBurn(context);
  if (SHEET_ROUND) {
    const raw = join(context.outputDir, 'sheet.png');
    await writeSheet(context, raw, shots, `FIRE-FINISH round ${SHEET_ROUND}: a fire flown out and one left to burn (browser captures, memory-only saves)`);
    console.log(`Comparison sheet: ${await publishReviewSheet(context, raw, 'fire-finish', SHEET_ROUND)}`);
  }
}
