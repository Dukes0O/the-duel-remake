// Use the same recipe on the base and feature builds. Light the Town supplies the actual dusk lighting.
import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {TIN_TOWN_GATE} from '../../src/world/tin-town-gate.js';
import {BRAND_RULE} from '../../src/world/jobs/brand-rule.js';
import {pageSource as job2} from './everburn-job2.mjs';

const {x, z, through} = TIN_TOWN_GATE;
const gate = {x, z, through};

const place = (gate, metres, duskSeconds) => {
  const app = window.__qaApp, course = app.duel.course, state = app.duel.state;
  const from = {x: gate.x - metres * gate.through.x, z: gate.z - metres * gate.through.z};
  const pose = course.nearest(from.x, from.z);
  const turn = Math.atan2(gate.through.x, gate.through.z) - course.at(pose.s).heading;
  app.setCamera('chase');
  app.inspectionCamera = null;
  Object.assign(state, {s: pose.s, prevS: pose.s, lateral: pose.lateral, prevLateral: pose.lateral,
    airborne: false, airHeight: 0, groundHeight: course.groundAt(pose.s, pose.lateral).y,
    yawVelocity: 0, pushVelocity: 0, speedMph: 0, headingError: Math.atan2(Math.sin(turn), Math.cos(turn))});
  Object.assign(state.arena.worldJob.job.stepState, {brandBriefed: true, brandsUsed: 1, brandElapsed: duskSeconds, dusk: 1});
  app.onFrame?.(state, 0);
};

const drive = async gate => {
  const app = window.__qaApp, state = app.duel.state, host = document.querySelector('#view3d');
  const meter = [...document.querySelectorAll('button')].find(button => button.textContent === 'Measure frame pacing');
  const result = document.querySelector('#performance-results');
  if (!meter || !result || !app.running || app.ambientOcclusionEnabled !== false) throw Error('The Performance review fixture is unavailable.');
  const distance = () => {
    const p = app.duel.course.worldAt(state.s, state.lateral);
    return (gate.x - p.x) * gate.through.x + (gate.z - p.z) * gate.through.z;
  };
  const start = distance();
  const before = result.textContent;
  state.speedMph = 14;
  meter.click();
  if (!meter.disabled) throw Error('The frame meter could not start.');
  try {
    while (meter.disabled) {
      await new Promise(resolve => requestAnimationFrame(resolve));
      if (state.onFoot || state.paused || state.status !== 'racing' || app.inspectionCamera ||
          app.cameraMode !== 'chase' || host.dataset.evening !== '1.00') throw Error('The visible dusk chase fixture changed.');
      app.keys.ArrowUp = state.speedMph < 14;
    }
  } finally {
    app.keys.ArrowUp = false;
  }
  const end = distance();
  if (Math.abs(start - 48) > 1 || end < 0 || start - end < 1) throw Error('The moving sample missed the approach: ' + start + ' to ' + end);
  if (before === result.textContent) throw Error('The gate-road frame sample was cancelled.');
  const pacing = JSON.parse(result.textContent).at(-1);
  if (pacing.frames !== 120 || pacing.quality !== 'Performance') throw Error('Expected 120 delivered frames on Performance.');
  return {startMetresFromGate: start, endMetresFromGate: end, ...pacing};
};

// The job fixture and each function sent to the page are also parsed by the card's Node check.
export function gatePageSource(action, metres) {
  if (action === 'place') return '(' + place.toString() + ')(' + JSON.stringify(gate) + ',' + JSON.stringify(metres) + ',' + BRAND_RULE.duskSeconds + ')';
  if (action === 'drive') return '(' + drive.toString() + ')(' + JSON.stringify(gate) + ')';
  throw Error('Unknown gate-road fixture action ' + action);
}

export async function run(context) {
  await context.command('Emulation.setDeviceMetricsOverride', {width: 1280, height: 720, deviceScaleFactor: 1, mobile: false});
  await context.navigate('/tools/menu-check.html?flags=hidden-road,story-everburn,warlord-cards,scablands-realism&harness=tin-town-gate-road');
  await context.waitFor(job2('ready'), 'memory-only menu', 60000);
  await context.evaluate(job2('prepare'));
  await context.waitFor(job2('yard'), 'yard', 60000);
  await context.evaluate(job2('start'));
  await context.waitFor(job2('loaded'), 'Light the Town and its art', 120000);
  await context.evaluate('window.__qaApp.audio.setMuted(true)');
  const views = [];
  for (const metres of [24, 5, 48]) {
    await context.evaluate(gatePageSource('place', metres));
    await context.waitFor("document.querySelector('#view3d')?.dataset.evening === '1.00'", 'dusk', 15000);
    // Allow the normal chase spring, streamed ground and exposure to settle after moving the car.
    await new Promise(resolve => setTimeout(resolve, 3200));
    const camera = await context.evaluate('({eye: window.__render.camera.position.toArray(), fov: window.__render.camera.fov})');
    views.push({metres, camera, image: await context.screenshot('gate-dusk-' + metres + 'm')});
  }
  await context.waitFor("document.querySelector('#view3d')?.dataset.vehicleAsset === 'ready' && !['scheduled','compiling'].includes(document.querySelector('#view3d').dataset.warmupStatus)", 'vehicle and GPU warmup', 30000);
  const report = {quality: 'performance', headed: context.headed, views, moving: await context.evaluate(gatePageSource('drive'))};
  await writeFile(join(context.outputDir, 'tin-town-gate-road.json'), JSON.stringify(report, null, 2) + '\n');
}
