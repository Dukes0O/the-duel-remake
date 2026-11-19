// WILD-VIEW look check (docs/HELI_WILDLIFE.md sections 3.3 and 3.4): animals beside the
// road at Tremblant Woods, seen from the driver's own chase view at racing pace and
// running into cover as the car passes; and from the helicopter, 110 m up in its normal
// view over the wildlife count's square, with the rings round counted animals. Also
// proves the switch: off, nothing is drawn and nothing loads. Memory-only saves, no
// frame timing. Run:  node tools/browser-harness.mjs scenario wildlife-view
import {APPROVED_MODEL_IDS} from '../../src/wildlife-models.js';
import {surveyJob} from '../../src/heli/heli-survey.js';
import {placeWildlife} from '../../src/wildlife.js';
import {referenceLap} from '../../src/reference-laps.js';
import {Course} from '../../src/course.js';
import {COURSE} from '../../src/config.js';

const SIZE = {width: 1280, height: 720, deviceScaleFactor: 1, mobile: false};
// The animals are planned from the play day, so the check fixes one (src/wildlife-view.js, __qaWildlifeDay) instead of
// reading the calendar: its herds stand in the same places on every day. 20776 is 19 November 2026, the day whose herd
// the old sweep had startled before the drive began (QA-NIGHT-19-NOV).
const DAY = 20776;
const FIX_DAY = `globalThis.__qaWildlifeDay = ${DAY}`;
// The drive moves the car a fixed step each frame (not by the clock), at the pace of 85 mph drawn on the HUD.
const DRIVE_STEP = 1.9;
const pause = ms => new Promise(done => setTimeout(done, ms));
const MENU_READY = `window.__qaApp?.visualReady && !!window.__render && document.querySelector('#view3d')?.dataset.vehicleAsset==='ready'`;
// Let the page's own frames run, so the camera and the animals settle (a hidden headless tab draws few frames by itself).
const frames = (count, wait = 30) => `(async () => { for (let i = 0; i < ${count}; i++) { window.__render.renderFrame(); await new Promise(r => setTimeout(r, ${wait})); } })()`;

// What the wildlife group holds right now: every animal that is drawn, and every ring.
const GROUP = `(() => {
  const group = window.__render.scene.getObjectByName('Wildlife'); const drawn = [], rings = [];
  group?.traverse(node => {
    if (node.parent?.parent !== group || !node.visible) return;
    (node.name === 'Counted ring' ? rings : drawn).push({x: node.position.x, y: node.position.y, z: node.position.z, opacity: node.material?.opacity});
  });
  return {inScene: !!group, groupVisible: !!group?.visible, herds: group?.children.length ?? 0, drawn, rings, status: document.querySelector('#view3d').dataset.wildlife ?? ''};
})()`;

// The herd of race 1 at Tremblant Woods on DAY that the drive passes: the one with the most animals, nearest the road.
// Planned here from the rules, so the check never has to drive the car up to a herd to find it (that startles it).
function plannedHerd() {
  const definition = COURSE.find(row => row.id === 'tremblant-woods'), course = new Course(definition, definition.layoutSeed ?? 1989);
  const placed = placeWildlife({courseId: 'tremblant-woods', playDay: DAY, raceNumber: 1, course, approvedModels: APPROVED_MODEL_IDS,
    referenceLap: referenceLap('tremblant-woods', 'fixed') ?? referenceLap('tremblant-woods', 'route_a')});
  const herds = placed.spots.map(spot => {
    const anchor = course.nearest(spot.animals[0].x, spot.animals[0].z);
    return {s: anchor.s, lateral: anchor.lateral, count: spot.animals.length, animals: spot.animals.map(animal => ({x: animal.x, z: animal.z}))};
  });
  herds.sort((p, q) => q.count - p.count || Math.abs(p.lateral) - Math.abs(q.lateral));
  return herds[0];
}

export async function run(context) {
  await context.command('Emulation.setDeviceMetricsOverride', SIZE);

  // ---- The switch off: nothing drawn, nothing loaded --------------------------
  await context.navigate('/tools/menu-check.html');
  await context.waitFor(MENU_READY, 'menu with the wildlife switch off', 90_000);
  await context.evaluate(FIX_DAY);
  // Wildlife is released and therefore on by default. Make this negative-control
  // page explicitly disable the switch instead of relying on the old dev default.
  await context.evaluate(`(()=>{const app=window.__qaApp,original=app._switches.bind(app);app._switches=()=>{const flags=original();return {...flags,enabled:name=>name==='wildlife'?false:flags.enabled(name)};};})()`);
  await startRace(context);
  await pause(1500);
  const off = await context.evaluate(GROUP);
  if (off.drawn.length || off.herds || off.status !== 'off') throw Error(`Switch off should draw nothing: ${JSON.stringify(off)}`);
  const requested = await context.evaluate(`performance.getEntriesByType('resource').filter(e => e.name.includes('/assets/wildlife/')).length`);
  if (requested) throw Error('Switch off should load no animal model.');

  // ---- A race with animals ------------------------------------------------------
  await context.navigate('/tools/menu-check.html?flags=wildlife');
  await context.waitFor(MENU_READY, 'menu with the wildlife switch on', 90_000);
  await context.evaluate(FIX_DAY);
  await startRace(context);
  await context.waitFor(`/animals/.test(document.querySelector('#view3d').dataset.wildlife ?? '')`, 'animals planned', 30_000);
  // The herd to drive past is planned from the rules for the fixed day, never found by driving up to it: a car that
  // comes within 35 m startles a herd, and a herd already run into cover is out of reach of the road's middle.
  const herd = plannedHerd();
  if (!herd || herd.count < 2) throw Error(`The fixed day should plan a herd of two or more: ${JSON.stringify(herd)}`);
  // Drive by in the normal chase view at the pace of about 85 mph, one fixed step a frame, so a busy laptop that draws
  // fewer frames a second still sends the car through the same places.
  const drive = toS => context.evaluate(`(async () => {
    const st = window.__qaApp.duel.state;
    while (st.s < ${toS}) {
      window.__render.renderFrame(); await new Promise(r => setTimeout(r, 16));
      st.s += ${DRIVE_STEP}; st.speedMph = 85; st.lateral = 0;
    }
    window.__render.renderFrame();
  })()`);
  await context.evaluate(`(() => { const st = window.__qaApp.duel.state; st.s = ${herd.s} - 140; st.lateral = 0; st.speedMph = 85; })()`);
  await context.evaluate(frames(40));
  await drive(herd.s - 62);
  const far = await context.evaluate(GROUP);
  await context.screenshot('race-chase-62m');
  await drive(herd.s - 44);
  await context.screenshot('race-chase-44m');
  const idle = await context.evaluate(GROUP);
  // The herd stands where the rules put it on the fixed day (the day is the only thing that places it).
  const planned = herd.animals.map(spot => idle.drawn.reduce((best, row) => Math.min(best, Math.hypot(row.x - spot.x, row.z - spot.z)), Infinity));
  if (planned.some(distance => distance > 1.5)) throw Error(`The herd should stand where the plan put it: ${JSON.stringify({herd, planned, drawn: idle.drawn})}`);
  await drive(herd.s - 36);
  await context.screenshot('race-chase-36m');
  // Inside 35 m the herd turns away from the road and runs 10 to 20 m into cover.
  await drive(herd.s - 22);
  await context.screenshot('race-chase-startled');
  await drive(herd.s + 30);
  // Let the frames run until nothing moves any more, rather than a fixed number of frames a slow laptop might not finish.
  await context.evaluate(`(async () => {
    const spots = () => JSON.stringify(window.__render.scene.getObjectByName('Wildlife').children.flatMap(herd => herd.children.map(node => [node.position.x, node.position.z])));
    let last = '', still = 0;
    for (let i = 0; i < 600 && still < 10; i++) { window.__render.renderFrame(); await new Promise(r => setTimeout(r, 30)); const now = spots(); still = now === last ? still + 1 : 0; last = now; }
  })()`);
  await context.screenshot('race-chase-passed');
  const after = await context.evaluate(GROUP);
  const before = idle.drawn;
  const moved = after.drawn.map(row => before.reduce((best, b) => Math.min(best, Math.hypot(row.x - b.x, row.z - b.z)), Infinity));
  console.log('RACE ' + JSON.stringify({day: DAY, herd: {s: herd.s, lateral: herd.lateral, count: herd.count}, drawnAt62: far.drawn.length, idle: idle.drawn.length, planned, moved}));
  if (!idle.drawn.length) throw Error('The herd should be drawn from 44 m.');
  if (!moved.some(distance => distance >= 4)) throw Error(`Nothing ran: ${JSON.stringify(moved)}`);
  if (moved.some(distance => distance > 41)) throw Error(`Something ran too far: ${JSON.stringify(moved)}`);

  // ---- From the helicopter -------------------------------------------------------
  // A play day whose count is at Tremblant Woods, the course the helicopter starts on.
  const day = [...Array(80).keys()].find(n => n > 0 && surveyJob(n, {approved: APPROVED_MODEL_IDS})?.courseId === 'tremblant-woods');
  await context.navigate('/tools/menu-check.html?flags=helicopter,wildlife');
  await context.waitFor(MENU_READY, 'menu with the helicopter and wildlife', 90_000);
  await context.evaluate(FIX_DAY);
  await context.evaluate(`(() => { const app = window.__qaApp; app.audio.setMuted?.(true); document.querySelector('#heli-visit').click(); })()`);
  await context.waitFor(`window.__qaApp.duel.state.status==='heli' && window.__qaApp.visualReady`, 'helipad scene', 120_000);
  await context.evaluate(`(() => {
    const app = window.__qaApp; app.returnToMenu();
    app.profile = {...app.profile, heli: {...app.profile.heli, fuelKg: 300, playDay: {...app.profile.heli.playDay, count: ${day}},
      lessons: {liftoff: true, hover: true, landing: true, carry: true}}};
    app._saveProfile(); app.visitHeli();
  })()`);
  await context.waitFor(`window.__qaApp.duel.state.status==='heli' && window.__qaApp.visualReady && window.__qaApp.heliView().survey`, 'the count on the board', 120_000);
  // Take the count, climb to 110 m above the ground, turn toward the biggest herd and fly at it until its animals are in reach.
  const flown = await context.evaluate(`(() => {
    const app = window.__qaApp, session = app.heliSession, job = session.view().survey;
    const taken = session.takeJob(job.jobId); app._heliEvents(session.takeEvents());
    if (!taken.ok) throw Error('Could not take the count: ' + taken.reason);
    const animals = session.view().survey.animals;
    // The animal with the most others within 40 m: the middle of the herd to fly at.
    let herd = null;
    for (const a of animals) {
      const n = animals.filter(b => Math.hypot(a.x - b.x, a.z - b.z) < 40).length;
      if (!herd || n > herd.n) herd = {x: a.x, z: a.z, n};
    }
    const clamp = n => Math.max(-1, Math.min(1, n)), wrap = a => Math.atan2(Math.sin(a), Math.cos(a));
    const agl = 110;
    const ground = v => app.heliGroundHeight(v.heli.x, v.heli.z);
    const pilot = (v, t, speed, yaw) => {
      const h = v.heli, fx = Math.sin(h.heading), fz = Math.cos(h.heading);
      const dx = t.x - h.x, dz = t.z - h.z, d = Math.hypot(dx, dz), want = Math.min(speed, d * .4);
      const ex = (d > .01 ? dx / d * want : 0) - h.vx, ez = (d > .01 ? dz / d * want : 0) - h.vz;
      return {pitch: clamp((ex * fx + ez * fz) * .25), roll: clamp((-ex * fz + ez * fx) * .25), lift: clamp((t.y - h.y) * .3 - h.vy * .3), yaw};
    };
    // Which way does a yaw input turn her? Find out, then face the herd.
    let sign = 1;
    { const before = session.view().heli.heading; for (let i = 0; i < 30; i++) app._heliEvents(session.step({yaw: 1})); sign = Math.sign(wrap(session.view().heli.heading - before)) || 1; }
    const events = [];
    const faceHerd = v => wrap(Math.atan2(herd.x - v.heli.x, herd.z - v.heli.z) - v.heli.heading);
    const start = session.view().heli;
    // Phase 1: climb, face the herd and fly over it (the animals within 60 m are counted and get their rings).
    // Phase 2: carry on 190 m past it. Phase 3: turn round and hold, looking back at the herd and its rings.
    const away = {x: herd.x - start.x, z: herd.z - start.z}, awayLength = Math.hypot(away.x, away.z) || 1;
    const beyond = {x: herd.x + away.x / awayLength * 190, z: herd.z + away.z / awayLength * 190};
    let phase = 1;
    for (let n = 0; n < 120 * 600; n++) {
      const v = session.view(), g = ground(v), diff = faceHerd(v), dist = Math.hypot(herd.x - v.heli.x, herd.z - v.heli.z);
      const climbing = v.heli.y - g < agl - 8, speed = Math.hypot(v.heli.vx, v.heli.vz);
      if (phase === 1 && dist < 25) phase = 2;
      if (phase === 2 && Math.hypot(beyond.x - v.heli.x, beyond.z - v.heli.z) < 20) phase = 3;
      const hold = {x: v.heli.x, z: v.heli.z, y: g + agl};
      let target = hold, yaw = 0;
      if (phase === 1) { target = climbing ? hold : {x: herd.x, z: herd.z, y: g + agl}; yaw = clamp(sign * diff * 2); }
      else if (phase === 2) target = {x: beyond.x, z: beyond.z, y: g + agl};
      else yaw = clamp(sign * diff * 2);
      const evs = session.step(pilot(v, target, 12, yaw)); app._heliEvents(evs); events.push(...evs);
      if (phase === 3 && speed < .6 && Math.abs(diff) < .1) break;
    }
    const view = session.view();
    return {herd, counted: events.filter(e => e.type === 'surveyCount').length, scared: events.filter(e => e.type === 'surveyScare').length,
      animals: view.survey.animals.length, species: [...new Set(view.survey.animals.map(a => a.species))],
      agl: view.heli.y - app.heliGroundHeight(view.heli.x, view.heli.z), heading: view.heli.heading, job: job.title, camera: app.heliCamera};
  })()`);
  if (!(flown.animals >= 6)) throw Error(`The count should have animals: ${JSON.stringify(flown)}`);
  if (flown.scared) throw Error(`Flying at 110 m should scare nothing: ${JSON.stringify(flown)}`);
  await context.evaluate(`window.__qaApp.heliCamera = 0`);
  await context.evaluate(frames(4));
  const pulse = await context.evaluate(GROUP);
  await context.screenshot('heli-count-rings-pulse');
  await context.evaluate(frames(100));
  const air = await context.evaluate(GROUP);
  await context.screenshot('heli-count-rings');
  if (!pulse.rings.length || !air.rings.length) throw Error(`Counted animals should have rings: ${JSON.stringify(flown)} ${pulse.rings.length} ${air.rings.length}`);
  const ringLast = air.rings.map(row => Math.round(row.opacity * 100) / 100);
  // A close look from the ground beside a counted animal, ring and all.
  const close = await context.evaluate(`(async () => {
    const app = window.__qaApp, group = window.__render.scene.getObjectByName('Wildlife'); let ring = null;
    group.traverse(node => { if (node.name === 'Counted ring' && node.visible && !ring) ring = node.position.clone(); });
    if (!ring) return null;
    app.inspectionCamera = {position: [ring.x - 9, ring.y + 2.2, ring.z - 6], target: [ring.x, ring.y + 1, ring.z]};
    for (let i = 0; i < 20; i++) { window.__render.renderFrame(); await new Promise(r => setTimeout(r, 30)); }
    return {x: ring.x, z: ring.z};
  })()`);
  if (close) await context.screenshot('heli-count-ring-close');
  console.log('AIR ' + JSON.stringify({day, drawn: air.drawn.length, rings: air.rings.length, ringOpacity: ringLast, ...flown}));
}

async function startRace(context) {
  await context.evaluate(`(() => {
    const a = window.__qaApp; a.audio.setMuted?.(true);
    if (!a.player) a.addPlayer('Wildlife QA');
    let index = -1; for (let i = 0; i < 80; i++) if (a.getMenuCourse(i)?.def.id === 'tremblant-woods') { index = i; break; }
    if (index < 0) throw Error('Tremblant Woods not in the menu');
    // A throwaway memory career that owns every course (the way the other scenarios do).
    a.profile = {...a.profile, courses: {version: 1, unlocked: Array.from({length: 80}, (_, i) => a.getMenuCourse(i)?.def.id).filter(Boolean)}}; a._saveProfile();
    if (!a.startCampaign({mode: 'timetrial', startStage: index, car: 'falcone_f42', seed: 1989, difficulty: 'casual'})) throw Error('Race start rejected: ' + a.courseAccessMessage);
    document.head.insertAdjacentHTML('beforeend', '<style>details,#overlay{display:none!important}</style>');
    // The game's own loop stops at once. A race in progress moves the traffic and the rival by the clock, and they startle a
    // herd they pass as a car does; this check moves only its own car, a fixed step a frame. The renderer has a loop of its own.
    a.stop();
  })()`);
  await context.waitFor(`window.__qaApp.duel.state.status !== 'menu' && window.__qaApp.visualReady`, 'the race is on', 90_000);
}
