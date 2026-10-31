// HELI-JOB-CLARITY: Kyle's helicopter jobs played end to end in the real game on the private QA page, with the switches
// as released (no flags in the address) and memory-only saves. A car job from the board (home pad to Tremblant Snow):
// the job card at each stage, the hook prompt, the cruise, the release prompt, delivered and paid. Then home for fuel and
// the crate beside the Tremblant Snow pad to Panorama Ridge the same way, a landing, Shut down, and a new visit that starts at Panorama
// Ridge. Last, a ski drop flown to Summit Run's Devils Playground pad, where the ski panel shows. No frame timing. Run:
//   node tools/browser-harness.mjs scenario heli-jobs
import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {SKI_PADS} from '../../src/ski/ski-session.js';

const entry = '/tools/menu-check.html';
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
// Play day 4's board has the Dusthawk Rally from the home pad to Tremblant Snow, and Tremblant Snow's crate goes to
// Panorama Ridge (heli-jobs.js dayJobs and returnLoadJob for the owned places below).
const PLAY_DAY = 4;

async function menu(context, {playDay = PLAY_DAY} = {}) {
  await context.navigate(entry);
  await context.waitFor(`document.readyState==='complete' && !!window.__qaApp &&
    document.querySelector('#view3d')?.dataset.vehicleAsset==='ready' && !document.querySelector('#start-engine')?.disabled`, 'menu', 90_000);
  await context.evaluate(`(() => {
    const app = window.__qaApp, d = new Date(), pad = n => String(n).padStart(2, '0');
    const today = d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
    // A trained pilot who owns the four helicopter places, on a fixed play day (test fixture, memory only).
    app.profile = {...app.profile, credits: 20000,
      courses: {version: 1, unlocked: [...new Set([...(app.profile.courses?.unlocked || []), 'tremblant-woods', 'tremblant-snow', 'panorama-ridge', 'summit-run'])]},
      heli: {version: 1, fuelKg: 400, refuels: 1, lessons: {liftoff: true, hover: true, landing: true, carry: true},
        playDay: {last: today, count: ${playDay}}, logbook: {flights: 3, jobs: {car: 1, crate: 1, fire: 0, rescue: 0, ski: 0}, visited: [], awarded: 1}}};
    if (!app._saveProfile()) throw Error('fixture not saved');
    app.audio.setMuted?.(true);
    app.menuCar = 'stuttgart_959s';
    document.querySelectorAll('details').forEach(node => { node.open = false; });
  })()`);
}

async function visit(context, label) {
  await context.evaluate(`document.querySelector('#heli-visit').click()`);
  await context.waitFor(`window.__qaApp.duel.state.status==='heli' && window.__qaApp.visualReady`, label, 120_000);
  await context.evaluate(HELPERS);
  await context.evaluate(`document.querySelector('[data-logbook-dismiss]')?.click()`);
}

// Page helpers: the session stepped at once (QA only), a steady hand, the autopilot for the legs.
const HELPERS = `(window.__jobQa = {
  s() { return window.__qaApp.heliSession; },
  fly(seconds, controls, until) {
    const s = this.s();
    for (let i = 0; i < Math.round(seconds * 120); i++) {
      const events = s.step(controls(s.view())); window.__qaApp._heliEvents(events);
      const crash = events.find(e => e.type === 'crashed');
      if (crash) throw Error('crashed: ' + crash.cause + ', fuel ' + s.view().heli.fuelKg.toFixed(0) + ' kg at ' + s.view().courseId);
      if (until(s.view())) return true;
    }
    throw Error('the flight took too long');
  },
  pilot(view, t) {
    const h = view.heli, fx = Math.sin(h.heading), fz = Math.cos(h.heading), c = v => Math.max(-1, Math.min(1, v));
    const dx = t.x - h.x, dz = t.z - h.z, d = Math.hypot(dx, dz), want = Math.min(t.speed || 4, d * .4);
    const ex = (d > .01 ? dx / d * want : 0) - h.vx, ez = (d > .01 ? dz / d * want : 0) - h.vz;
    return {pitch: c((ex * fx + ez * fz) * .25), roll: c((ex * -fz + ez * fx) * .25), lift: c(Math.max(-(t.sink || 3), Math.min(t.sink || 3, t.y - h.y)) * .3 - h.vy * .3), yaw: 0};
  },
  climb(metres) { const v0 = this.s().view(); this.fly(40, v => this.pilot(v, {x: v0.heli.x, z: v0.heli.z, y: v0.heli.y + metres, speed: 1}), v => v.heli.y > v0.heli.y + metres - 3); },
  // The autopilot out of the area for a few seconds (the picture is taken in flight), then on to the cruise.
  leave(courseId, seconds) {
    const s = this.s();
    if (s.destination !== courseId && !s.setDestination(courseId)) throw Error('cannot set ' + courseId);
    if (!s.autopilotOn) s.pressAutopilot();
    try { this.fly(seconds, () => ({}), v => v.cruiseOffered); } catch (e) { if (!/too long/.test(e.message)) throw e; }
  },
  arrive(courseId) {
    const s = this.s();
    if (s.destination !== courseId && !s.setDestination(courseId)) throw Error('cannot set ' + courseId);
    if (!s.autopilotOn) s.pressAutopilot();
    this.fly(400, () => ({}), v => v.cruiseOffered);
    if (!s.acceptCruise()) throw Error('cruise refused');
    this.fly(20, () => ({}), v => v.phase === 'flying' && v.courseId === courseId);
    if (!s.autopilotOn) s.pressAutopilot();
    this.fly(400, () => ({}), v => Math.hypot(v.heli.x - v.zone.x, v.heli.z - v.zone.z) < 4 && Math.hypot(v.heli.vx, v.heli.vz) < .8);
    if (s.autopilotOn) s.pressAutopilot();
  },
  // Hover with the hook at the load's roof (the cable is 15 m), ready for H.
  overLoad(load) {
    this.fly(200, v => this.pilot(v, {x: load.x, z: load.z, y: load.y + 15.2, speed: 4}), v => {
      const h = v.heli; return Math.hypot(h.x - load.x, h.z - load.z) < 1 && Math.abs(h.y - load.y - 15.2) < .6 && Math.hypot(h.vx, h.vy, h.vz) < .5; });
  },
  // Down over the landing circle until the load touches.
  setDown() { this.fly(120, v => this.pilot(v, {x: v.zone.x, z: v.zone.z, y: v.zone.y + .7 + 14.6, speed: 1}), v => v.loads.some(l => l.hooked && l.onGround)); },
  landAt(x, z) {
    const y = this.s().view().heli.y;
    this.fly(200, v => this.pilot(v, {x, z, y, speed: 6}), v => Math.hypot(v.heli.x - x, v.heli.z - z) < 1.5 && Math.hypot(v.heli.vx, v.heli.vz) < .5);
    this.fly(200, v => this.pilot(v, {x, z, y: v.zone.y - 3, speed: 1, sink: 1.5}), v => v.heli.onGround);
    for (let i = 0; i < 240; i++) window.__qaApp._heliEvents(this.s().step({lift: -1}));
  },
  // Summit Run's ski pads lie up the mountain: climb clear of the ground ahead, then over the pad and down (as ski-view.mjs).
  ground(x, z) { const c = window.__qaApp.duel.course, n = c.nearest(x, z); return c.groundAt(n.s, n.lateral).y; },
  highest(x, z) { let top = -Infinity; for (const [dx, dz] of [[0,0],[10,0],[-10,0],[0,10],[0,-10]]) top = Math.max(top, this.ground(x + dx, z + dz)); return top; },
  toPad(pad) {
    this.fly(900, v => { const h = v.heli, d = Math.hypot(pad.x - h.x, pad.z - h.z) || 1, ux = (pad.x - h.x) / d, uz = (pad.z - h.z) / d; let top = -Infinity;
      for (let k = 0; k <= 16; k++) top = Math.max(top, this.highest(h.x + ux * k * 25, h.z + uz * k * 25));
      const y = d > 150 ? Math.min(top + 110, this.ground(h.x, h.z) + 285) : pad.y + 40;
      if (h.y < y - 12) return this.pilot(v, {x: h.x, z: h.z, y, speed: 1, sink: 8});
      return this.pilot(v, {x: pad.x, z: pad.z, y, speed: 18, sink: 8}); },
      v => Math.hypot(v.heli.x - pad.x, v.heli.z - pad.z) < 3 && Math.hypot(v.heli.vx, v.heli.vz) < .6);
    this.fly(120, v => this.pilot(v, {x: pad.x, z: pad.z, y: pad.y - 2, speed: 2, sink: 2.5}), v => v.heli.onGround);
  },
}, true)`;

const text = selector => `[...document.querySelectorAll(${JSON.stringify(selector)})].map(n => n.textContent.replace(/\\s+/g, ' ').trim())`;
const card = `(document.querySelector('.heli-job-card')?.textContent || '').replace(/\\s+/g, ' ').trim()`;
const prompt = `(() => { const p = document.querySelector('.heli-hook-prompt'); return p && !p.hidden ? p.textContent : ''; })()`;
async function drawn(context, ms = 1200) {
  await context.waitFor(`window.__qaApp.visualReady`, 'drawn', 120_000);
  await pause(ms);
}
async function expect(context, expression, pattern, label) {
  await pause(250);
  const got = await context.evaluate(expression);
  if (!pattern.test(got)) throw Error(`${label}: got "${got}"`);
  return got;
}

export async function run(context) {
  await context.command('Emulation.setDeviceMetricsOverride', {width: 1366, height: 768, deviceScaleFactor: 1, mobile: false});
  const report = {scope: 'Private QA page, released switches, memory-only saves; no frame timing.', facts: {}, pictures: {}};
  const shot = async (name, label) => { report.pictures[name] = label; await context.screenshot(name); };

  // ---- The car job, taken from the board at the home pad ----
  await menu(context);
  await visit(context, 'home helipad');
  if (await context.evaluate(`window.__qaApp.heliView().courseId`) !== 'tremblant-woods') throw Error('a new save starts at home');
  const job = await context.evaluate(`window.__qaApp.heliSession.boardJobs().find(j => !j.own && j.from === 'tremblant-woods' && j.to === 'tremblant-snow')`);
  if (!job) throw Error('no home to Tremblant Snow job on the fixture day');
  await context.evaluate(`document.querySelector('[data-heli-board="take:${job.id}"]').click()`);
  report.facts.taken = {job: job.title, card: await expect(context, card, /Hook the Dusthawk Rally beside the pad: hover low over it and press H\./, 'the card after taking the job')};
  const credits0 = await context.evaluate(`window.__qaApp.profile.credits`);
  await context.evaluate(`(() => { const q = window.__jobQa; q.climb(20); q.overLoad(q.s().view().loads.find(l => l.job)); })()`);
  await drawn(context);
  report.facts.hookPrompt = await expect(context, prompt, /^Press H to hook$/, 'the hook prompt');
  await shot('hook-prompt', 'Hook prompt over the customer car');
  await context.evaluate(`window.__qaApp._inputAction('heli-hook')`);
  if (!await context.evaluate(`!!window.__qaApp.heliView().loads.find(l => l.job)?.hooked`)) throw Error('the car did not hook');
  await context.evaluate(`window.__jobQa.climb(45); window.__jobQa.leave('tremblant-snow', 8)`);
  await drawn(context);
  report.facts.flying = await expect(context, card, /Carrying\. Fly to Tremblant Snow\./, 'the card while carrying');
  await shot('job-card-flying', 'Job card while flying with the car');
  await context.evaluate(`window.__jobQa.arrive('tremblant-snow'); window.__jobQa.setDown()`);
  await drawn(context);
  report.facts.releasePrompt = await expect(context, prompt, /^Press H to let go$/, 'the release prompt');
  report.facts.releaseCard = await expect(context, card, /Lower it onto the pad and press H to let go\./, 'the card at the drop-off');
  await shot('release-prompt', 'Release prompt with the car down in the circle');
  await context.evaluate(`window.__qaApp._inputAction('heli-hook')`);
  report.facts.delivered = await expect(context, card, /Delivered: [\d,]+ credits/, 'delivered');
  report.facts.carPaid = (await context.evaluate(`window.__qaApp.profile.credits`)) - credits0;
  if (!(report.facts.carPaid > 0)) throw Error('the car job did not pay');
  await shot('delivered', 'Delivered and paid');

  // ---- Home for fuel (one tank does not carry the car and the 524 kg crate as well), then the crate beside the
  // Tremblant Snow pad, to Panorama Ridge ----
  await context.evaluate(`(() => { const q = window.__jobQa; q.climb(45); q.arrive('tremblant-woods'); const v = q.s().view(); q.landAt(v.zone.x, v.zone.z); })()`);
  await pause(600);
  await context.waitFor(`!!document.querySelector('[data-heli-fuel="fill"]')`, 'the pump', 30_000);
  await context.evaluate(`document.querySelector('[data-heli-fuel="fill"]').click()`);
  report.facts.refuelled = await context.evaluate(`window.__qaApp.heliView().heli.fuelKg`);
  await context.evaluate(`(() => { const q = window.__jobQa; q.climb(45); q.arrive('tremblant-snow'); const v = q.s().view(); q.landAt(v.zone.x + 8, v.zone.z); })()`);
  await pause(5500);
  report.facts.crateOffer = await context.evaluate(text('.heli-arrival p'));
  const crate = await context.evaluate(`window.__qaApp.heliView().returnLoad`);
  if (crate?.to !== 'panorama-ridge') throw Error(`the fixture crate should go to Panorama Ridge, got ${crate?.to}`);
  const credits1 = await context.evaluate(`window.__qaApp.profile.credits`);
  await context.evaluate(`(() => { const q = window.__jobQa; q.climb(20); q.overLoad(q.s().view().loads.find(l => l.returnJob)); })()`);
  await context.evaluate(`window.__qaApp._inputAction('heli-hook')`);
  report.facts.crateCard = await expect(context, card, /CRATE JOB.*Carrying\. Fly to Panorama Ridge\./, 'the crate card');
  await context.evaluate(`window.__jobQa.climb(45); window.__jobQa.arrive('panorama-ridge'); window.__jobQa.setDown()`);
  await expect(context, prompt, /^Press H to let go$/, 'the crate release prompt');
  await context.evaluate(`window.__qaApp._inputAction('heli-hook')`);
  report.facts.crateDelivered = await expect(context, card, /Delivered: [\d,]+ credits/, 'crate delivered');
  report.facts.cratePaid = (await context.evaluate(`window.__qaApp.profile.credits`)) - credits1;
  if (!(report.facts.cratePaid > 0)) throw Error('the crate did not pay');
  await context.evaluate(`(() => { const q = window.__jobQa, v = q.s().view(); q.climb(10); q.landAt(v.zone.x + 8, v.zone.z); })()`);
  await pause(5500);
  report.facts.lastPad = await context.evaluate(`window.__qaApp.profile.heli.lastPad`);
  if (report.facts.lastPad !== 'panorama-ridge') throw Error(`lastPad should be Panorama Ridge, got ${report.facts.lastPad}`);
  await context.waitFor(`!!document.querySelector('[data-heli-arrival="shutdown"]')`, 'shut down button', 30_000);
  await context.evaluate(`document.querySelector('[data-heli-arrival="shutdown"]').click()`);
  await context.waitFor(`window.__qaApp.duel.state.status==='menu'`, 'menu after shut down', 30_000);
  await pause(800);

  // ---- A new visit starts where the helicopter last stood ----
  await visit(context, 'the next visit');
  report.facts.newVisit = await context.evaluate(`window.__qaApp.heliView().courseId`);
  if (report.facts.newVisit !== 'panorama-ridge') throw Error(`the new visit should start at Panorama Ridge, got ${report.facts.newVisit}`);
  await drawn(context, 2500);
  await shot('new-visit-last-pad', 'New visit starts at Panorama Ridge, where it landed');
  await context.evaluate(`window.__qaApp.returnToMenu()`);

  // ---- The ski drop: the card points to a ski pad, and on it the ski panel shows ----
  await menu(context);
  await visit(context, 'home helipad for the ski drop');
  await context.waitFor(`!!document.querySelector('[data-ski-board="drop"]')`, 'ski box', 30_000);
  await context.evaluate(`document.querySelector('[data-ski-board="drop"]').click()`);
  await context.evaluate(`window.__jobQa.climb(45); window.__jobQa.arrive('summit-run')`);
  report.facts.skiCardOverCircle = await expect(context, card, /Land on a ski pad to step out\. Nearest: .*km, heading \d{3}\./, 'the ski card at Summit Run');
  await context.evaluate(`window.__jobQa.toPad(${JSON.stringify(SKI_PADS.devils)})`);
  await drawn(context, 2500);
  await context.waitFor(`!!document.querySelector('[data-ski-run]')`, 'the ski panel', 30_000);
  report.facts.skiPanel = await context.evaluate(text('.ski-menu [data-ski-run]'));
  report.facts.skiCardOnPad = await expect(context, card, /Pick a run on the ski panel\./, 'the ski card on the pad');
  await shot('ski-panel-summit', 'Ski panel on the Devils Playground pad at Summit Run');
  await context.evaluate(`window.__qaApp.returnToMenu()`);
  await writeFile(join(context.outputDir, 'jobs.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}
