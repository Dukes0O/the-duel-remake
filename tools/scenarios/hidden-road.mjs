import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';

export function driveOutbound(duel) {
  const road = duel.course.hiddenRoad, state = duel.state, pose = road.poseAt(15);
  Object.assign(state, { status: 'racing', s: pose.s, prevS: pose.s,
    lateral: pose.lateral, prevLateral: pose.lateral, speedMph: 25,
    headingError: pose.heading - duel.course.at(pose.s).heading,
    yawVelocity: 0, steerVisual: 0, slipAngle: 0, groundHeight: null,
    terrainPitch: null, terrainRoll: null, airHeight: 0, airborne: false,
    traffic: [], opponents: [], rival: null, impactTimer: 0 });
  let maxDeviation = 0, ticks = 0;
  for (; ticks < 60 * 120; ticks++) {
    const point = duel.course.worldAt(state.s, state.lateral), near = road.nearest(point.x, point.z);
    maxDeviation = Math.max(maxDeviation, near.distance);
    if (near.progress >= road.length - 5) break;
    const target = road.poseAt(near.progress + 14), targetSpeed = near.progress < 140 ? 45 : 75;
    const error = duel.course.at(state.s).heading + state.headingError - Math.atan2(target.x - point.x, target.z - point.z);
    duel.setInput({ throttle: state.speedMph < targetSpeed ? .5 : 0,
      brake: state.speedMph > targetSpeed + 3 ? .3 : 0,
      steer: Math.max(-1, Math.min(1, Math.atan2(Math.sin(error), Math.cos(error)) * 2.2)), boost: false });
    duel.step(1 / 120);
  }
  if (ticks === 60 * 120 || state.boundaryResets || state.majorCrashes || state.impactTimer)
    throw Error('Production driving could not traverse the entire prepared corridor');
  return { seconds: ticks / 120, maxDeviation, distance: road.length - 20 };
}

// Runs production driving/collision steps. Only the initial QA placement is
// synthetic; steering, the turn, and the complete return are physical inputs.
export function driveReturn(duel) {
  const road = duel.course.hiddenRoad, state = duel.state;
  const pose = road.poseAt(95, -12);
  Object.assign(state, { status: 'racing', s: pose.s, prevS: pose.s,
    lateral: pose.lateral, prevLateral: pose.lateral, speedMph: 8,
    headingError: pose.heading - duel.course.at(pose.s).heading,
    yawVelocity: 0, steerVisual: 0, slipAngle: 0, groundHeight: null,
    terrainPitch: null, terrainRoll: null, airHeight: 0, airborne: false,
    traffic: [], opponents: [], rival: null, impactTimer: 0 });
  const angle = a => Math.atan2(Math.sin(a), Math.cos(a));
  let turnTicks = 0;
  for (; turnTicks < 24 * 120; turnTicks++) {
    duel.setInput({ throttle: state.speedMph < 8 ? .2 : 0,
      brake: state.speedMph > 9 ? .2 : 0, steer: -1, boost: false });
    duel.step(1 / 120);
    if (angle(duel.course.at(state.s).heading + state.headingError - pose.heading) > 3.04) break;
  }
  if (turnTicks === 24 * 120) throw Error('Road car could not turn around in the wash widening');
  let returnTicks = 0;
  for (; returnTicks < 30 * 120; returnTicks++) {
    const point = duel.course.worldAt(state.s, state.lateral);
    const near = road.nearest(point.x, point.z);
    const target = near.progress > 12 ? road.poseAt(near.progress - 14) : duel.course.worldAt(1378, 3.4);
    const error = angle(duel.course.at(state.s).heading + state.headingError - Math.atan2(target.x - point.x, target.z - point.z));
    duel.setInput({ throttle: state.speedMph < 18 ? .25 : 0,
      brake: state.speedMph > 20 ? .3 : 0, steer: Math.max(-1, Math.min(1, error * 2.2)), boost: false });
    duel.step(1 / 120);
    if (Math.abs(state.lateral) < 6 && state.s < road.entrance.s - 8) break;
  }
  if (returnTicks === 30 * 120 || state.boundaryResets || state.majorCrashes || state.impactTimer)
    throw Error(`Physical return failed: ${JSON.stringify({ car: state.car, returnTicks, resets: state.boundaryResets, crashes: state.majorCrashes, impact: state.impactTimer })}`);
  return { car: state.car, turnSeconds: turnTicks / 120, returnSeconds: returnTicks / 120,
    s: state.s, lateral: state.lateral, boundaryResets: state.boundaryResets, majorCrashes: state.majorCrashes };
}

async function presentedFrame(context, label) {
  await context.waitFor(`(() => {
    const app = window.__qaApp, render = window.__render;
    const frame = render.renderFrame(); app.onFrame?.(app.duel.state);
    const host = document.querySelector('#view3d');
    return app.visualReady && ['ready','fallback','off','unsupported-fallback'].includes(host.dataset.warmupStatus)
      && frame.drawCalls > 0 && !!render.scene.getObjectByName('Hidden Road');
  })()`, label, 60_000);
}

export async function run(context) {
  // Optional review capture only; the default still runs every original view
  // and the complete outbound/return driving acceptance on all three routes.
  const reviewCapture = process.env.EGG01_CAPTURE_REVIEW === '1';
  await context.command('Emulation.setDeviceMetricsOverride', { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false });
  await context.navigate('/tools/menu-check.html?flags=hidden-road');
  await context.waitFor('!!window.__qaApp && !!window.__render', 'private Hidden Road page', 60_000);
  await context.evaluate(`document.querySelectorAll('details').forEach(panel => panel.open = false)`);
  const measurements = [];
  for (const [route, seed] of [['a', 1989], ['b', 42], ['c', 17]]) {
    await context.evaluate(`(() => {
      const app = window.__qaApp;
      app.startCampaign({ mode: 'wasteland', startStage: 0, seed: ${seed}, car: 'falcone_f42', difficulty: 'casual' });
      app.stop(); Object.assign(app.duel.state, { status: 'racing', countdown: 0, paused: false });
      window.__render.renderFrame();
    })()`);
    await presentedFrame(context, 'flagged race replaces the ordinary menu world');
    for (const quality of ['high', 'performance']) {
      await context.evaluate(`window.__qaApp.setGraphicsQuality('${quality}')`);
      for (const [shot, progress] of [['racing-line', -1], ['entrance', 12], ['wash', 260], ['salt-flat', 850], ['wall-contact', 250]]) {
        if (reviewCapture && !(shot === 'racing-line' && (route !== 'a' || quality === 'performance')
          || shot === 'wall-contact' && route === 'a' && quality === 'high')) continue;
        await context.evaluate(`(() => {
          const app = window.__qaApp, d = app.duel, road = d.course.hiddenRoad;
          if (!road) throw Error('Hidden Road flag did not reach production Course');
          const p = ${progress} < 0 ? {...d.course.groundAt(1350, -2), s: 1350, lateral: -2} : road.poseAt(${progress});
          const s = d.state;
          Object.assign(s, { s: p.s, prevS: p.s, lateral: p.lateral, prevLateral: p.lateral, speedMph: 0,
            headingError: p.heading - d.course.at(p.s).heading, yawVelocity: 0, steerVisual: 0,
            groundHeight: null, terrainPitch: null, terrainRoll: null, airHeight: 0, airborne: false, impactTimer: 0 });
          const h = p.heading;
          app.inspectionCamera = { position: [p.x - Math.sin(h) * 7, p.y + 3, p.z - Math.cos(h) * 7],
            target: [p.x + Math.sin(h) * 50, p.y + 2, p.z + Math.cos(h) * 50] };
          window.__render.camera.position.fromArray(app.inspectionCamera.position);
          if ('${shot}' === 'wall-contact') {
            s.headingError += Math.PI / 2; s.speedMph = 12;
            for (let tick = 0; tick < 120 * 3; tick++) { d.setInput({ throttle: .15, brake: 0, steer: 0 }); d.step(1 / 120); }
            const world = d.course.worldAt(s.s, s.lateral);
            if (!road.contains(world.x, world.z)) throw Error('Wash wall allowed car to escape');
            const ground = d.course.groundAt(s.s, s.lateral);
            app.inspectionCamera = { position: [world.x - Math.sin(h) * 9, ground.y + 5, world.z - Math.cos(h) * 9],
              target: [world.x, ground.y + 1, world.z] };
            window.__render.camera.position.fromArray(app.inspectionCamera.position);
          }
          window.__render.renderFrame(); app.onFrame?.(s);
          document.querySelectorAll('details').forEach(panel => panel.open = false);
        })()`);
        await presentedFrame(context, `${route}/${quality}/${shot} current presented frame`);
        await context.screenshot(`route-${route}-${quality}-${shot}`);
      }
    }
    const outbound = reviewCapture ? null : await context.evaluate(`(${driveOutbound.toString()})(window.__qaApp.duel)`);
    const result = await context.evaluate(`(${driveReturn.toString()})(window.__qaApp.duel)`);
    await context.evaluate(`window.__qaApp.inspectionCamera = null; window.__render.renderFrame(); window.__qaApp.onFrame?.(window.__qaApp.duel.state)`);
    await presentedFrame(context, `${route} returned road car current presented frame`);
    const grounding = await context.evaluate(`(() => {
      const d = window.__qaApp.duel, s = d.state, point = d.course.worldAt(s.s, s.lateral);
      if (s.groundHeight !== null || s.terrainPitch !== null || s.terrainRoll !== null)
        throw Error('Ordinary road-car QA placement retained a synthetic terrain support pose');
      const car = window.__render.scene.children.find(o => o.visible && o.userData.grounding
        && Math.hypot(o.position.x - point.x, o.position.z - point.z) < .2);
      if (!car) throw Error('Returned player mesh was not found at its actual position');
      car.updateMatrixWorld(true);
      let lowestWheelClearance = Infinity;
      for (const wheel of car.userData.wheels) wheel.traverse(mesh => {
        if (!mesh.isMesh || !mesh.geometry?.attributes.position) return;
        const positions = mesh.geometry.attributes.position, e = mesh.matrixWorld.elements;
        for (let i = 0; i < positions.count; i++) {
          const x = positions.getX(i), y = positions.getY(i), z = positions.getZ(i);
          const wx = e[0]*x + e[4]*y + e[8]*z + e[12];
          const wy = e[1]*x + e[5]*y + e[9]*z + e[13];
          const wz = e[2]*x + e[6]*y + e[10]*z + e[14];
          const pose = d.course.nearest(wx,wz), surface = d.course.surfaceAt(pose.s,pose.lateral);
          const ground = Math.abs(pose.lateral) <= surface.roadHalfWidth ? d.course.at(pose.s).y + .035 : d.course.groundAt(pose.s,pose.lateral).y;
          lowestWheelClearance = Math.min(lowestWheelClearance, wy-ground);
        }
      });
      if (!Number.isFinite(lowestWheelClearance) || lowestWheelClearance < -.15)
        throw Error('Returned wheels are buried: ' + lowestWheelClearance);
      return {heldGroundHeight:s.groundHeight, sampledGroundHeight:d.course.groundAt(s.s,s.lateral).y, lowestWheelClearance};
    })()`);
    measurements.push({ route, outbound, ...result, grounding });
    await context.screenshot(`route-${route}-driven-return`);
  }
  await writeFile(join(context.outputDir, 'hidden-road-driving.json'), JSON.stringify(measurements, null, 2) + '\n');
  console.log(`Hidden Road actual turns and returns: ${JSON.stringify(measurements)}`);
}
