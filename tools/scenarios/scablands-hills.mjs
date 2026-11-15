// SCABLANDS-LAND: memory-only Performance pictures for Claude's hill-country review.
// The report records the draw calls and triangles at every view. This is not a frame check.
import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {Script} from 'node:vm';
import {LAND} from '../../src/world/scablands-names.js';
import {HILLS} from '../../src/world/scablands-height.js';
import {SCARP, SCARPS} from '../../src/world/scablands-scarps.js';
import {ROAD_NET} from '../../src/world/scablands-road.js';
import {stepsWayFor} from '../../src/world/scablands-regions.js';

const offset = (p, x, z) => ({x: p.x + x, z: p.z + z});
const hill = kind => HILLS.find(item => item.kind === kind);

export function views() {
  const breaks = hill('breaks'), mesa = hill('mesa');
  const lookout = hill('lookout'), dune = hill('dune');
  const nextBreaks = HILLS.find(item => item.kind === 'breaks' && item !== breaks);
  const yardDistance = Math.hypot(LAND.yard.x - lookout.x, LAND.yard.z - lookout.z);
  const lookoutEdge = offset(lookout, (LAND.yard.x - lookout.x) * lookout.topRadius * .9 / yardDistance,
    (LAND.yard.z - lookout.z) * lookout.topRadius * .9 / yardDistance);
  const towardYard = distance => offset(lookoutEdge, (LAND.yard.x - lookout.x) * distance / yardDistance,
    (LAND.yard.z - lookout.z) * distance / yardDistance);
  // The spur is straight here. Use its actual approach, looking uphill along it.
  const ridgeRoad = ROAD_NET.road('ridge-spur').points;
  const ridgeEnd = ridgeRoad.at(-1), ridgeStart = ridgeRoad[0];
  const ridgeLength = Math.hypot(ridgeStart.x - ridgeEnd.x, ridgeStart.z - ridgeEnd.z);
  const upRidge = distance => ({x: ridgeEnd.x + (ridgeStart.x - ridgeEnd.x) * distance / ridgeLength,
    z: ridgeEnd.z + (ridgeStart.z - ridgeEnd.z) * distance / ridgeLength});
  const burn = ROAD_NET.road('burn-road').points.reduce((best, point) =>
    Math.hypot(point.x - breaks.x, point.z - breaks.z) < Math.hypot(best.x - breaks.x, best.z - breaks.z) ? point : best);
  const angle = mesa.rampAngle + Math.PI;
  const side = distance => offset(mesa, Math.cos(angle) * distance, Math.sin(angle) * distance);
  // Face the mesa from the direction of the short cut across the plates.
  const steps = stepsWayFor(), dx = steps.x - LAND.yard.x, dz = steps.z - LAND.yard.z;
  const along = ((mesa.x - LAND.yard.x) * dx + (mesa.z - LAND.yard.z) * dz) / (dx * dx + dz * dz);
  const onWay = {x: LAND.yard.x + along * dx, z: LAND.yard.z + along * dz};
  const wayDistance = Math.hypot(onWay.x - mesa.x, onWay.z - mesa.z);
  const mesaFromWay = offset(mesa, (onWay.x - mesa.x) * (mesa.radius + mesa.face + 250) / wayDistance,
    (onWay.z - mesa.z) * (mesa.radius + mesa.face + 250) / wayDistance);
  const {a, b} = SCARPS[0].stretches[0];
  const length = Math.hypot(b.x - a.x, b.z - a.z), foot = {x: (a.x + b.x) / 2, z: (a.z + b.z) / 2};
  const scarpTop = offset(foot, -SCARPS[0].height * SCARP.faceRatio * (b.z - a.z) / length,
    SCARPS[0].height * SCARP.faceRatio * (b.x - a.x) / length);
  const bankA = LAND.at('river-3'), bankB = LAND.at('river-4');
  const bankLength = Math.hypot(bankB.x - bankA.x, bankB.z - bankA.z);
  const bed = {x: (bankA.x + bankB.x) / 2, z: (bankA.z + bankB.z) / 2};
  return [
    {name: 'breaks-from-burn-road', from: burn, to: breaks},
    {name: 'breaks-valley-from-crest', from: breaks, to: {
      x: (breaks.x + nextBreaks.x) / 2, z: (breaks.z + nextBreaks.z) / 2,
    }},
    {name: 'mesa-foot', from: side(mesa.radius + mesa.face + 60), to: mesa},
    {name: 'mesa-from-plates-way', from: mesaFromWay, to: mesa},
    {name: 'mesa-top', from: mesa, to: side(mesa.radius + 120), landmark: side(mesa.radius * .8)},
    {name: 'ridge-way-up', from: upRidge(600), to: upRidge(450)},
    {name: 'lookout-to-yard', from: lookoutEdge, to: LAND.yard, landmark: towardYard(600)},
    {name: 'ships-dunes', from: offset(dune, 0, -dune.radius - 50), to: dune},
    {name: 'scarp-face', from: offset(foot, 80 * (b.z - a.z) / length, -80 * (b.x - a.x) / length), to: scarpTop, landmark: scarpTop},
    {name: 'river-bank', from: bed, to: offset(bed, -(bankB.z - bankA.z) / bankLength * 100, (bankB.x - bankA.x) / bankLength * 100)},
  ];
}

// Parse every expression in Node before sending it to the bundled page.
const evaluate = (context, expression) => {
  new Script(expression);
  return context.evaluate(expression);
};
const click = (context, selector) => evaluate(context, `(() => {
  const button = document.querySelector(${JSON.stringify(selector)});
  if (!button || button.hidden || button.disabled) throw Error('Missing ' + ${JSON.stringify(selector)});
  button.click();
})()`);
const pause = ms => new Promise(done => setTimeout(done, ms));

export async function run(context) {
  await context.command('Emulation.setDeviceMetricsOverride', {width: 1280, height: 720, deviceScaleFactor: 1, mobile: false});
  const report = {card: 'SCABLANDS-LAND', recipe: 'scablands-hills', quality: 'performance', guideOnly: true, views: []};
  const persist = () => writeFile(join(context.outputDir, 'scablands-hills.json'), JSON.stringify(report, null, 2) + '\n');
  try {
    await context.navigate('/tools/menu-check.html?flags=hidden-road,story-everburn,warlord-cards,scablands-realism&harness=scablands-hills');
    await context.waitFor('window.__qaApp?.duel.state.status==="menu" && !!window.__render', 'memory-only menu', 90000);
    await evaluate(context, `(() => {
      const a = window.__qaApp, select = document.querySelector('#graphics-quality');
      if (!window.name.startsWith('__duel_qa_tab_v2:') || !Object.getOwnPropertyDescriptor(window, 'localStorage')?.value) throw Error('Memory-only fixture required');
      select.value = 'performance'; select.dispatchEvent(new Event('change', {bubbles: true}));
      a.audio.setMuted(true); a.profile = {...a.profile, wasteland: {...a.profile.wasteland, version: 1, discoveredGate: true}}; a._saveProfile();
    })()`);
    await click(context, '#wasteland-visit');
    await context.waitFor('window.__qaApp?.isYardHomeActive?.()', 'Scablands yard', 90000);
    await click(context, '[data-action="yard-cards"]');
    await context.waitFor('document.querySelector(".ember-wall")', 'Hollis note', 30000);
    if (!await evaluate(context, '(() => window.__qaApp.profile.story?.ember?.read===true)()')) await click(context, '[data-ember-step="read"]');
    await context.waitFor('window.__qaApp.profile.story?.ember?.read===true', 'Hollis note read');
    await click(context, '[data-ember-step="hot-delivery"]');
    await context.waitFor('window.__qaApp?.duel.state.arena?.mode==="world-job" && window.__qaApp.duel.state.status==="racing" && window.__qaApp.visualReady', 'Hot Delivery racing', 120000);
    await context.waitFor(`(() => { let root = null; window.__render.scene.traverse(n => { if (n.name === 'The Scablands') root = n; }); return root?.userData.assetStatus === 'ready'; })()`, 'Scablands art', 120000);
    await evaluate(context, `(() => { const style = document.createElement('style'); style.id = 'hills-picture-style'; style.textContent = 'body *{visibility:hidden !important} canvas{visibility:visible !important} canvas.world-hud-minimap,.world-hud-minimap canvas{visibility:hidden !important}'; document.head.appendChild(style); })()`);
    const capture = async (name, landmark = null) => {
      await pause(2600);
      if (name !== 'large-map') {
      await evaluate(context, `(() => {
        const a = window.__qaApp, r = window.__render, s = a.duel.state;
        r.renderFrame();
        let land = null;
        r.scene.traverse(node => { if (node.name === 'The Scablands') land = node; });
        const drawnHeight = land?.userData?.drawnGroundHeightAt;
        if (typeof drawnHeight !== 'function') throw Error('Drawn ground is unavailable in ' + ${JSON.stringify(name)});
        const cameraPosition = r.camera.getWorldPosition(r.camera.position.clone());
        const cameraGround = drawnHeight(cameraPosition.x, cameraPosition.z);
        if (!Number.isFinite(cameraGround) || cameraPosition.y < cameraGround)
          throw Error('Camera is under the drawn ground in ' + ${JSON.stringify(name)});
        const things = land.getObjectByName('Scablands realism things');
        if (!things) throw Error('Drawn things are unavailable in ' + ${JSON.stringify(name)});
        things.updateWorldMatrix(true, true);
        let checked = 0;
        things.traverse(mesh => {
          const offsets = mesh.userData?.groundAnchorOffsets;
          if (!mesh.isInstancedMesh || !offsets) return;
          const matrix = mesh.matrixWorld.clone(), point = cameraPosition.clone();
          for (let i = 0; i < mesh.count; i++) {
            mesh.getMatrixAt(i, matrix);
            point.setFromMatrixPosition(matrix).applyMatrix4(mesh.matrixWorld);
            if (Math.hypot(point.x - cameraPosition.x, point.z - cameraPosition.z) > 300) continue;
            // Offsets describe the contact point in the batch's local vertical axis.
            const anchor = point.y - offsets[i] * mesh.matrixWorld.elements[5];
            const height = drawnHeight(point.x, point.z);
            if (!Number.isFinite(height) || Math.abs(anchor - height) > .5)
              throw Error(mesh.name + ' is away from the drawn ground in ' + ${JSON.stringify(name)});
            checked++;
          }
        });
        if (!checked) throw Error('No nearby drawn things checked in ' + ${JSON.stringify(name)});
        const ground = a.duel.course.groundAt(s.s, s.lateral);
        const cars = r.scene.children.filter(node => node.visible && node.userData?.vehicleKey === s.car &&
          Math.hypot(node.position.x - ground.x, node.position.z - ground.z) < 1);
        if (cars.length !== 1) throw Error('Player car missing or ambiguous in ' + ${JSON.stringify(name)});
        const car = cars[0];
        car.updateWorldMatrix(true, false);
        r.camera.updateMatrixWorld(true);
        const point = car.localToWorld(car.position.clone().set(0, 1, 0)).project(r.camera);
        if (Math.abs(point.x) > 1 || Math.abs(point.y) > 1 || point.z < -1 || point.z > 1)
          throw Error('Player car is outside the picture in ' + ${JSON.stringify(name)});
        const landmark = ${JSON.stringify(landmark)};
        if (landmark) {
          const height = drawnHeight(landmark.x, landmark.z);
          if (!Number.isFinite(height)) throw Error('Landmark ground is unavailable in ' + ${JSON.stringify(name)});
          const target = cameraPosition.clone().set(landmark.x, height, landmark.z).project(r.camera);
          if (Math.abs(target.x) > 1 || Math.abs(target.y) > 1 || target.z < -1 || target.z > 1)
            throw Error('Landscape feature is outside the picture in ' + ${JSON.stringify(name)});
        }
      })()`);
      }
      const picture = await context.screenshot('scablands-hills-' + name);
      const counts = await evaluate(context, `(() => { const info = window.__render.renderer.info.render; return {draws: info.calls, triangles: info.triangles}; })()`);
      report.views.push({name, picture, ...counts});
      console.log(JSON.stringify(report.views.at(-1)));
    };
    for (const view of views()) {
      await evaluate(context, `(() => {
        const a = window.__qaApp, d = a.duel, s = d.state, from = ${JSON.stringify(view.from)}, to = ${JSON.stringify(view.to)};
        const pose = d.course.nearest(from.x, from.z), wrap = v => Math.atan2(Math.sin(v), Math.cos(v));
        s.s = s.prevS = pose.s; s.lateral = s.prevLateral = pose.lateral; s.speedMph = 0; s.yawVelocity = 0; s.pushVelocity = 0;
        // A new view starts on the top floor, just like an actor without stored feet.
        s.groundHeight = s.prevGroundHeight = undefined; s._jumpY = null; s._verticalSpeed = 0;
        s.airborne = false; s.airHeight = s.prevAirHeight = 0;
        s.headingError = wrap(Math.atan2(to.x - from.x, to.z - from.z) - d.course.at(pose.s).heading);
        s.arena.worldJob.job.stepState.ember = 100; a.inspectionCamera = null;
      })()`);
      await evaluate(context, '(() => window.__qaApp.advance(1.5))()');
      await capture(view.name, view.landmark || view.to);
    }
    await evaluate(context, `(() => { document.querySelector('#hills-picture-style').remove(); document.querySelectorAll('body > details').forEach(panel => { panel.style.display = 'none'; }); document.dispatchEvent(new KeyboardEvent('keydown', {code: 'KeyM', bubbles: true, cancelable: true})); })()`);
    await context.waitFor('document.querySelector(".world-hud-map") && !document.querySelector(".world-hud-map").hidden', 'large map', 30000);
    await capture('large-map');
    await persist();
  } catch (error) {
    report.failure = error.message; await persist(); throw error;
  }
}
