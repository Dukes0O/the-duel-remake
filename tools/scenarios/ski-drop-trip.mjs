// SKI-FINISH: Kyle's report (2 November 2026), "I tried to get to drop off skiers at Summit but I couldn't find the ski
// pad, it wasn't clearly marked and I ran out of fuel", played end to end on the private QA page (memory-only save) the
// way a new pilot plays it: the drop taken on the ski box, P for the autopilot and ENTER for the cruise, the autopilot on
// to the marked pad, a landing, the slalom picked on the run menu and skied by the scripted skier, the pump at the pickup
// pad, and the autopilot home to a landing. At each step the job card must say what to do next. Pictures: the home pad,
// the arrival at Summit Run (the light columns), the pad, the pickup pump, home. No frame timing. Run:
//   node tools/browser-harness.mjs scenario ski-drop-trip
import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {skiZone} from '../../src/ski/runs/summit-zones.js';
import {SKI_PADS} from '../../src/ski/ski-session.js';
import {GUIDE} from '../../src/ski/ski-guide.js';
import {HELPERS} from './ski-view.mjs';

const pause = ms => new Promise(done => setTimeout(done, ms));
const card = `(document.querySelector('.heli-job-card')?.textContent || '').replace(/\\s+/g, ' ').trim()`;
const landed = `(document.querySelector('.heli-arrival')?.textContent || '').replace(/\\s+/g, ' ').trim()`;
async function expect(context, expression, pattern, label) {
  await pause(300);
  const got = await context.evaluate(expression);
  if (!pattern.test(got)) throw Error(`${label}: got "${got}"`);
  return got;
}
// The player's keys and buttons, through the game's own input (P, ENTER) and the panel's own buttons.
const press = action => `window.__qaApp._inputAction(${JSON.stringify(action)})`;
// The game's own step with no stick input (the autopilot flies), until a condition; a crash or an engine out fails.
const hands = (seconds, until) => `(() => { const s = window.__qaApp.heliSession;
  for (let i = 0; i < ${Math.round(seconds * 120)}; i++) { const events = s.step({}); window.__qaApp._heliEvents(events);
    const bad = events.find(e => e.type === 'crashed' || e.type === 'engineOut'); if (bad) throw Error(bad.type + ' with ' + s.view().heli.fuelKg.toFixed(0) + ' kg');
    if ((${until})(s.view())) return Math.round(s.view().heli.fuelKg); }
  throw Error('the autopilot took too long'); })()`;

export async function run(context) {
  const report = {scope: 'Private QA page, released switches, memory-only save; no frame timing.', facts: {}, pictures: {}};
  // The QA page's own panel (not part of the game) is hidden before each picture, so the job card shows.
  const shot = async (name, label) => { report.pictures[name] = label;
    await context.evaluate(`document.querySelectorAll('details').forEach(node => { node.hidden = true; })`); await context.screenshot(name); };
  const zone = skiZone('slalom');
  await context.command('Emulation.setDeviceMetricsOverride', {width: 1366, height: 768, deviceScaleFactor: 1, mobile: false});
  await context.navigate('/tools/menu-check.html');
  await context.waitFor(`document.readyState==='complete' && !!window.__qaApp && window.__qaApp.visualReady &&
    window.name.startsWith('__duel_qa_tab_v2:')`, 'private memory-only QA page', 90_000);
  // A pilot who has passed the landing lesson and owns Summit Run, on a full first tank (test fixture, memory only).
  await context.evaluate(`(() => { const a = window.__qaApp;
    a.profile = {...a.profile, credits: 3000, courses: {version: 1, unlocked: [...new Set([...(a.profile.courses?.unlocked || []), 'tremblant-woods', 'summit-run'])]},
      heli: {version: 1, fuelKg: 400, refuels: 1, lessons: {liftoff: true, hover: true, landing: true, carry: true}}};
    if (!a._saveProfile()) throw Error('fixture not saved');
    a.audio.setMuted?.(true); a.heliAudio?.setMuted?.(true);
    document.querySelectorAll('details').forEach(node => { node.hidden = true; });
    if (!a.visitHeli()) throw Error('no helicopter visit');
    ${HELPERS(zone.line, zone.pickup, SKI_PADS, GUIDE)}; })()`);
  await context.waitFor(`window.__qaApp.duel.state.status==='heli' && window.__qaApp.visualReady`, 'the home pad', 120_000);
  await context.evaluate(`document.querySelector('[data-logbook-dismiss]')?.click()`);

  // ---- The home pad: take the drop ----
  await context.waitFor(`!!document.querySelector('[data-ski-board="drop"]')`, 'the ski box', 30_000);
  await context.evaluate(`document.querySelector('[data-ski-board="drop"]').click()`);
  report.facts.homeCard = await expect(context, card, /Fly to Summit Run\. The flight ends beside the ski pads\./, 'the card at home');
  report.facts.homeLanded = await expect(context, landed, /Ski drop waiting\. Fly to Summit Run/, 'the landed panel at home');
  await pause(1500);
  await shot('home', 'Home pad: the ski drop taken');

  // ---- P, out of the area, ENTER ----
  await context.evaluate(press('heli-autopilot'));
  report.facts.fuelAtCruise = await context.evaluate(hands(400, 'v => v.cruiseOffered'));
  await context.evaluate(press('heli-cruise'));
  await context.waitFor(`window.__qaApp.heliSession.view().courseId==='summit-run' && window.__qaApp.heliSession.view().phase==='flying' && window.__qaApp.visualReady`,
    'Summit Run drawn', 300_000);
  await pause(4000);
  report.facts.arrival = await context.evaluate(`(() => { const v = window.__qaApp.heliSession.view();
    return {fuelKg: Math.round(v.heli.fuelKg), marks: v.ski.marks.map(m => [m.name, Math.round(Math.hypot(m.x - v.heli.x, m.z - v.heli.z))])}; })()`);
  report.facts.arrivalCard = await expect(context, card, /Land on the ski pad under the orange light: Devils Playground, 0\.4 km, heading \d{3}\..*pump is on the pickup pad/, 'the card on arrival');
  await shot('arrival', 'Arrival at Summit Run: the ski pads under orange light columns');

  // ---- The autopilot (still on) to the pad, then down by hand ----
  report.facts.fuelOverPad = await context.evaluate(hands(240, `v => { const m = v.ski.marks.find(p => p.name === 'devils'); return Math.hypot(v.heli.x - m.x, v.heli.z - m.z) < 6 && Math.hypot(v.heli.vx, v.heli.vz) < 1; }`));
  await context.evaluate(press('heli-autopilot'));
  await context.evaluate(`(() => { const q = window.__skiQa, p = ${JSON.stringify(SKI_PADS.devils)}; q.fly(120, v => q.pilot(v, {x: p.x, z: p.z, y: p.y - 2}, {speed: 2, sink: 2.5}), v => v.heli.onGround); })()`);
  await context.waitFor(`!!document.querySelector('[data-ski-run="slalom"]')`, 'the run menu', 30_000);
  report.facts.padCard = await expect(context, card, /Pick a run on the ski panel\./, 'the card on the pad');
  await pause(2500);
  await shot('pad', 'On Devils Playground: the ring on the snow and the run menu');

  // ---- The slalom, skied in the game's own loop to the pickup ----
  await context.evaluate(`(() => { const s = window.__qaApp.heliSession, step = s.step.bind(s), drive = window.__skiQa.skier();
    s.step = controls => step(s.phase === 'skiing' ? drive(s.view().ski.run.skier) : controls);
    document.querySelector('[data-ski-run="slalom"]').click(); })()`);
  await context.waitFor(`window.__qaApp.heliSession.phase === 'skiing'`, 'stepped out', 20_000);
  await context.waitFor(`window.__qaApp.heliSession.phase === 'flying' && window.__qaApp.heliSession.view().ski.flight?.skied`, 'the pickup', 300_000);
  await context.waitFor(`window.__qaApp.visualReady`, 'drawn at the pickup', 120_000);
  await pause(3000);
  report.facts.pickupCard = await expect(context, card, /Fill up at the pump here first: the way home needs about 240 kg of fuel and you have \d+ kg\./, 'the card at the pickup');
  await context.waitFor(`!!document.querySelector('.heli-job-card [data-heli-fuel="fill"]') && !!document.querySelector('.heli-pump')`, 'the pump buttons', 30_000);
  report.facts.pumpButton = await context.evaluate(`document.querySelector('.heli-pump').textContent.trim()`);
  await shot('pickup', 'Back aboard at the pickup pad: the pump and the card');
  await context.evaluate(`document.querySelector('.heli-job-card [data-heli-fuel="fill"]').click()`);
  report.facts.homeboundCard = await expect(context, card, /Fly home and land on the home pad\./, 'the card after filling up');

  // ---- P, ENTER, home, down by hand ----
  await context.evaluate(press('heli-autopilot'));
  report.facts.fuelLeavingSummit = await context.evaluate(hands(600, 'v => v.cruiseOffered'));
  await context.evaluate(press('heli-cruise'));
  await context.waitFor(`window.__qaApp.heliSession.view().courseId==='tremblant-woods' && window.__qaApp.heliSession.view().phase==='flying'`, 'home side', 120_000);
  report.facts.fuelOverHome = await context.evaluate(hands(400, 'v => Math.hypot(v.heli.x - v.zone.x, v.heli.z - v.zone.z) < 4 && Math.hypot(v.heli.vx, v.heli.vz) < .8'));
  await context.evaluate(press('heli-autopilot'));
  await context.evaluate(`(() => { const q = window.__skiQa; q.fly(120, v => q.pilot(v, {x: v.zone.x, z: v.zone.z, y: v.zone.y - 3}, {speed: 1, sink: 1.5}), v => v.heli.onGround); })()`);
  await context.waitFor(`window.__qaApp.heliSession.view().ski.flight === null`, 'the drop done', 20_000);
  await context.waitFor(`window.__qaApp.visualReady`, 'drawn at home', 120_000);
  await pause(2500);
  report.facts.homeAgain = {fuelKg: await context.evaluate(`Math.round(window.__qaApp.heliSession.view().heli.fuelKg)`),
    slalom: await context.evaluate(`window.__qaApp.profile.ski?.best?.slalom ?? null`)};
  await shot('home-again', 'Home again: the drop done');
  await context.evaluate(`window.__qaApp.returnToMenu()`);
  await writeFile(join(context.outputDir, 'ski-drop-trip.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}
