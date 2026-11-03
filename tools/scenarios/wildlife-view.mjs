// WILD-VIEW look check (docs/HELI_WILDLIFE.md sections 3.3 and 3.4): animals beside the
// road at Tremblant Woods in a race, running into cover when a car comes close, and
// the same animals plus the wildlife count's animals from the helicopter. Also proves
// the switch: off, nothing is drawn and nothing loads. Memory-only saves, no frame
// timing. Run:  node tools/browser-harness.mjs scenario wildlife-view
import {APPROVED_MODEL_IDS} from '../../src/wildlife-models.js';
import {surveyJob} from '../../src/heli/heli-survey.js';

const SIZE = {width: 1280, height: 720, deviceScaleFactor: 1, mobile: false};
const pause = ms => new Promise(done => setTimeout(done, ms));
// Let the page's own frames run, so the camera and the animals settle (a hidden headless tab draws few frames by itself).
const SETTLE = `(async () => { for (let i = 0; i < 60; i++) { window.__render.renderFrame(); await new Promise(r => setTimeout(r, 30)); } })()`;
const MENU_READY = `window.__qaApp?.visualReady && !!window.__render && document.querySelector('#view3d')?.dataset.vehicleAsset==='ready'`;

// What the wildlife group holds right now: every animal that is drawn, with where it stands.
const GROUP = `(() => {
  const group = window.__render.scene.getObjectByName('Wildlife'); const out = [];
  group?.traverse(node => { if (node.parent?.parent === group && node.visible) out.push({x: node.position.x, y: node.position.y, z: node.position.z, scale: node.scale.x}); });
  return {inScene: !!group, groupVisible: !!group?.visible, herds: group?.children.length ?? 0, drawn: out, status: document.querySelector('#view3d').dataset.wildlife ?? ''};
})()`;

export async function run(context) {
  await context.command('Emulation.setDeviceMetricsOverride', SIZE);

  // ---- The switch off: nothing drawn, nothing loaded --------------------------
  await context.navigate('/tools/menu-check.html');
  await context.waitFor(MENU_READY, 'menu with the wildlife switch off', 90_000);
  await startRace(context);
  await pause(1500);
  const off = await context.evaluate(GROUP);
  if (off.drawn.length || off.herds || off.status !== 'off') throw Error(`Switch off should draw nothing: ${JSON.stringify(off)}`);
  const requested = await context.evaluate(`performance.getEntriesByType('resource').filter(e => e.name.includes('/assets/wildlife/')).length`);
  if (requested) throw Error('Switch off should load no animal model.');

  // ---- A race with animals ------------------------------------------------------
  await context.navigate('/tools/menu-check.html?flags=wildlife');
  await context.waitFor(MENU_READY, 'menu with the wildlife switch on', 90_000);
  await startRace(context);
  await context.waitFor(`/animals/.test(document.querySelector('#view3d').dataset.wildlife ?? '')`, 'animals planned', 30_000);
  // Drive nothing: slide the throwaway car along the road until an animal is within sight.
  const found = await context.evaluate(`(async () => {
    const a = window.__qaApp, state = a.duel.state, length = a.duel.course.length;
    for (let s = 20; s < length; s += 150) {
      state.s = s; state.lateral = 0;
      for (let i = 0; i < 12; i++) { await new Promise(r => setTimeout(r, 40)); }
      const group = window.__render.scene.getObjectByName('Wildlife'); let drawn = 0;
      group.traverse(node => { if (node.parent?.parent === group && node.visible) drawn++; });
      if (drawn) return {s, drawn};
    }
    return null;
  })()`);
  if (!found) throw Error('No animal came into view anywhere along the lap.');
  // The animal nearest the road: park the throwaway car 36 m from it (just outside the 35 m that startles), where the race camera looks ahead at it.
  const first = await context.evaluate(`(async () => {
    const a = window.__qaApp, state = a.duel.state, course = a.duel.course;
    const group = window.__render.scene.getObjectByName('Wildlife'); let best = null;
    group.traverse(node => { if (node.parent?.parent === group && node.visible) {
      const near = course.nearest(node.position.x, node.position.z);
      if (!best || Math.abs(near.lateral) < Math.abs(best.lateral)) best = {s: near.s, x: node.position.x, y: node.position.y, z: node.position.z, lateral: near.lateral};
    } });
    state.s = best.s - 33; state.lateral = Math.sign(best.lateral) * (Math.abs(best.lateral) - 15);
    return best;
  })()`);
  for (let i = 0; i < 8; i++) await context.evaluate(SETTLE);
  const idle = await context.evaluate(GROUP);
  if (!idle.drawn.length) throw Error('The animals should be drawn from 36 m.');
  await context.screenshot('race-animals-idle');
  const before = idle.drawn.map(row => ({x: row.x, z: row.z}));
  // A car comes within 35 m (here driven out to 20 m from it): they turn away from the road and run 10 to 20 m into cover.
  await context.evaluate(`(() => { const a = window.__qaApp, course = a.duel.course, st = a.duel.state;
    const road = course.worldAt(${first.s}, 0), dx = ${first.x} - road.x, dz = ${first.z} - road.z, d = Math.hypot(dx, dz);
    st.s = ${first.s}; st.lateral = Math.sign(${first.lateral}) * Math.max(0, Math.abs(${first.lateral}) - 20); })()`);
  await context.evaluate(`(async () => { for (let i = 0; i < 30; i++) { window.__render.renderFrame(); await new Promise(r => setTimeout(r, 30)); } })()`);
  await context.screenshot('race-animals-startled');
  // The car backs off, so the animal runs once and then stands again.
  await context.evaluate(`(() => { const st = window.__qaApp.duel.state; st.s = ${first.s} - 120; st.lateral = 0; })()`);
  await context.evaluate(SETTLE); await context.evaluate(SETTLE); await context.evaluate(SETTLE);
  const after = await context.evaluate(GROUP);
  await context.screenshot('race-animals-in-cover');
  const moved = after.drawn.map(row => before.reduce((best, b) => Math.min(best, Math.hypot(row.x - b.x, row.z - b.z)), Infinity));
  const runs = after.drawn;
  console.log('DEBUG ' + JSON.stringify({found, first, idle: idle.drawn, after: after.drawn, moved}));
  if (!moved.some(distance => distance >= 4)) throw Error(`Nothing ran: ${JSON.stringify(moved)}`);
  if (moved.some(distance => distance > 21)) throw Error(`Something ran too far: ${JSON.stringify(moved)}`);

  // ---- From the helicopter -------------------------------------------------------
  // A play day whose count is at Tremblant Woods, the course the helicopter starts on.
  const day = [...Array(80).keys()].find(n => n > 0 && surveyJob(n, {approved: APPROVED_MODEL_IDS})?.courseId === 'tremblant-woods');
  await context.navigate('/tools/menu-check.html?flags=helicopter,wildlife');
  await context.waitFor(MENU_READY, 'menu with the helicopter and wildlife', 90_000);
  await context.evaluate(`(() => { const app = window.__qaApp; app.audio.setMuted?.(true); document.querySelector('#heli-visit').click(); })()`);
  await context.waitFor(`window.__qaApp.duel.state.status==='heli' && window.__qaApp.visualReady`, 'helipad scene', 120_000);
  await context.evaluate(`(() => {
    const app = window.__qaApp; app.returnToMenu();
    app.profile = {...app.profile, heli: {...app.profile.heli, fuelKg: 300, playDay: {...app.profile.heli.playDay, count: ${day}},
      lessons: {liftoff: true, hover: true, landing: true, carry: true}}};
    app._saveProfile(); app.visitHeli();
  })()`);
  await context.waitFor(`window.__qaApp.duel.state.status==='heli' && window.__qaApp.visualReady && window.__qaApp.heliView().survey`, 'the count on the board', 120_000);
  const flown = await context.evaluate(`(() => {
    const app = window.__qaApp, session = app.heliSession, job = session.view().survey;
    const taken = session.takeJob(job.jobId); app._heliEvents(session.takeEvents());
    if (!taken.ok) throw Error('Could not take the count: ' + taken.reason);
    const square = session.view().survey.square;
    const pilot = (v, t, speed) => {
      const h = v.heli, fx = Math.sin(h.heading), fz = Math.cos(h.heading);
      const dx = t.x - h.x, dz = t.z - h.z, d = Math.hypot(dx, dz), want = Math.min(speed, d * .4);
      const ex = (d > .01 ? dx / d * want : 0) - h.vx, ez = (d > .01 ? dz / d * want : 0) - h.vz;
      const clamp = n => Math.max(-1, Math.min(1, n));
      return {pitch: clamp((ex * fx + ez * fz) * .25), roll: clamp((-ex * fz + ez * fx) * .25), lift: clamp((t.y - h.y) * .3 - h.vy * .3), yaw: 0};
    };
    const agl = 110, target = {x: square.cx, z: square.cz};
    for (let n = 0; n < 120 * 400; n++) {
      const v = session.view(), ground = app.heliGroundHeight(v.heli.x, v.heli.z);
      const to = {x: v.heli.y - ground > agl - 12 ? target.x : v.heli.x, z: v.heli.y - ground > agl - 12 ? target.z : v.heli.z, y: ground + agl};
      app._heliEvents(session.step(pilot(v, to, 14)));
      if (Math.hypot(v.heli.x - target.x, v.heli.z - target.z) < 25 && Math.abs(v.heli.y - ground - agl) < 8) break;
    }
    const view = session.view();
    return {square, animals: view.survey.animals.length, species: [...new Set(view.survey.animals.map(a => a.species))], agl: view.heli.y - app.heliGroundHeight(view.heli.x, view.heli.z), job: job.title};
  })()`);
  if (!(flown.animals >= 6)) throw Error(`The count should have animals: ${JSON.stringify(flown)}`);
  await context.waitFor(`(() => { const s = document.querySelector('#view3d').dataset.wildlife ?? ''; return /animals/.test(s) && !/ 0 drawn/.test(s); })()`, 'animals drawn from the air', 60_000);
  await pause(1200);
  const air = await context.evaluate(GROUP);
  // The pilot's own view: from the helicopter, 110 m up, looking down the square at the nearest herd.
  await context.evaluate(`(async () => {
    const app = window.__qaApp, view = app.heliView(), group = window.__render.scene.getObjectByName('Wildlife'); let best = null;
    group.traverse(node => { if (node.parent?.parent === group && node.visible) {
      const d = Math.hypot(node.position.x - view.heli.x, node.position.z - view.heli.z);
      if (!best || d < best.d) best = {d, x: node.position.x, y: node.position.y, z: node.position.z};
    } });
    app.inspectionCamera = {position: [view.heli.x, view.heli.y, view.heli.z], target: [best.x, best.y, best.z]};
    await new Promise(r => setTimeout(r, 1000));
  })()`);
  await context.screenshot('heli-count-square');
  // Closer and lower, from the ground beside three of the animals, so the trees do not hide them.
  const closes = [];
  for (let n = 0; n < 3; n++) {
    const target = await context.evaluate(`(async () => {
      const app = window.__qaApp, view = app.heliView(), group = window.__render.scene.getObjectByName('Wildlife'); const found = [];
      group.traverse(node => { if (node.parent?.parent === group && node.visible) found.push({d: Math.hypot(node.position.x - view.heli.x, node.position.z - view.heli.z), x: node.position.x, y: node.position.y, z: node.position.z}); });
      found.sort((p, q) => p.d - q.d);
      const best = found[Math.min(${n} * 2, found.length - 1)];
      if (!best) return null;
      app.inspectionCamera = {position: [best.x - 7, best.y + 1.7, best.z - 5], target: [best.x, best.y + 0.9, best.z]};
      for (let i = 0; i < 20; i++) { window.__render.renderFrame(); await new Promise(r => setTimeout(r, 30)); }
      return best;
    })()`);
    if (target) { closes.push(target); await context.screenshot('heli-animals-close-' + (n + 1)); }
  }
  const result = {day, race: {found, first, idle: idle.drawn.length, ran: moved.map(distance => Math.round(distance * 10) / 10), runs: runs.length}, air: {drawn: air.drawn.length, closes: closes.length, ...flown}};
  console.log('WILD-VIEW look: ' + JSON.stringify(result));
}

async function startRace(context) {
  await context.evaluate(`(() => {
    const a = window.__qaApp; a.audio.setMuted?.(true);
    if (!a.player) a.addPlayer('Wildlife QA');
    let index = -1; for (let i = 0; i < 80; i++) if (a.getMenuCourse(i)?.def.id === 'tremblant-woods') { index = i; break; }
    if (index < 0) throw Error('Tremblant Woods not in the menu');
    // A throwaway memory career that owns every course (the way the other scenarios do).
    a.profile = {...a.profile, courses: {version: 1, unlocked: Array.from({length: 80}, (_, i) => a.getMenuCourse(i)?.def.id).filter(Boolean)}}; a._saveProfile();
    if (!a.startCampaign({mode: 'timetrial', startStage: index, car: 'falcone_f42', seed: 1989, difficulty: 'casual'})) throw Error('Race start rejected: ' + a.courseAccessMessage + ' index ' + index + ' player ' + !!a.player);
    document.head.insertAdjacentHTML('beforeend', '<style>details,#overlay{display:none!important}</style>');
  })()`);
  await context.waitFor(`window.__qaApp.duel.state.status !== 'menu' && window.__qaApp.visualReady`, 'the race is on', 90_000);
}
