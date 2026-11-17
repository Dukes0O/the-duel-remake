// Memory-only visual handoff for Hot Delivery. Claude runs this on Performance.
import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {EAST_ROAD, roadPointFrom} from '../../src/world/scablands-road.js';
import {pointAlong} from '../../src/world/scablands-road-geometry.js';
import {LAND} from '../../src/world/scablands-names.js';

export function mapFailures(name, measurement, start = false, metBarricade = false) {
  if (measurement.map === null) return [`${name}: the large map is not open`];
  const failures = [];
  if (!/what you know/i.test(measurement.map)) failures.push(`${name}: the map has no What you know heading`);
  if (!/east road/i.test(measurement.map)) failures.push(`${name}: the East Road is missing from the map`);
  if (start && (measurement.mapWays.length !== 1 || !/east road/i.test(measurement.mapWays[0]))) {
    failures.push(`${name}: the starting map must list only the East Road`);
  }
  if (metBarricade && !/a barricade of the ash men/i.test(measurement.map)) {
    failures.push(`${name}: the barricade met on the road is missing from the map`);
  }
  return failures;
}

export function pictureFailures(name, measurement, options = {}) {
  const failures = [];
  if (!measurement.visible || !measurement.inView) failures.push(`${name}: ${measurement.target} is not visible inside the picture`);
  if (options.loaded && !measurement.loaded) failures.push(`${name}: the pot is not on the car`);
  if (options.pot && !measurement.potInView) failures.push(`${name}: the pot is not visible inside the picture`);
  if (options.forge && !measurement.forgeFire) failures.push(`${name}: the forge has not caught fire`);
  if (options.aboveCar && !measurement.aboveCar) failures.push(`${name}: the pot is not above the car`);
  if (options.holdAt != null && Math.abs((measurement.holdElapsed ?? -100) - options.holdAt) > 0.02) {
    failures.push(`${name}: the delivery hold is not at ${options.holdAt} seconds`);
  }
  return failures;
}

// Draw the chosen view without running the game camera again.
export function drawFocusedPicture(camera, renderer, scene, point, options) {
  camera.position.set(point.x + (options.dx || 0), point.y + (options.dy || 8), point.z + (options.dz || 30));
  camera.lookAt(point.x, point.y + (options.aimHeight || 1), point.z);
  camera.updateMatrixWorld(true);
  renderer.render(scene, camera);
}

// Every page expression is a self-contained function, checked before it is sent.
const page = (context, fn, ...args) => {
  const source = `(${fn.toString()})(...${JSON.stringify(args)})`;
  new Function(`return ${source}`);
  return context.evaluate(source);
};
const wait = (context, expression, description, timeout) => {
  const source = `(() => (${expression}))()`;
  new Function(`return ${source}`);
  return context.waitFor(source, description, timeout);
};
const click = (context, selector) => page(context, selector => {
  const button = document.querySelector(selector);
  if (!button || button.hidden || button.disabled) throw Error(`Missing ${selector}`);
  button.click();
}, selector);
const key = async (context, name, code, value) => {
  for (const type of ['keyDown', 'keyUp']) await context.command('Input.dispatchKeyEvent', {type, key:name, code, windowsVirtualKeyCode:value});
};

export async function run(context) {
  const report = {quality:'performance', pictures:[], failures:[]};
  const persist = () => writeFile(join(context.outputDir, 'everburn-job1-measurements.json'), JSON.stringify(report, null, 2) + '\n');
  const picture = async (name, target, options = {}) => {
    try {
      const measurement = await page(context, (target, options, focusSource) => {
        const app = window.__qaApp, duel = app.duel, state = duel.state, render = window.__render;
        const job = state.arena.worldJob, step = job.job.steps[0], camera = render.camera;
        const nodes = [];
        render.scene.traverse(node => { if (node.name === target) nodes.push(node); });
        const node = nodes[options.index || 0];
        // The page keeps running between this script's calls, so a picture of the hold steps to its own moment here, in the call that measures it.
        // The scene hears of the hold's count in one drawn frame and shows it in the next, so two frames are drawn.
        if (options.holdAt != null && job.arrivalHold) {
          app.advance(options.holdAt - job.arrivalHold.elapsed); app.onFrame?.(state, 0); render.renderFrame();
        }
        app.onFrame?.(state, 0); render.renderFrame();
        const pointFor = item => {
          item.updateWorldMatrix(true, false);
          const point=item.getWorldPosition(camera.position.clone());
          if (item.userData.plan?.gate) { point.x+=item.userData.plan.gate.x; point.z+=item.userData.plan.gate.z; point.y+=3; }
          return point;
        };
        if (options.focus && node) {
          const p = pointFor(node);
          const drawFocused = new Function(`return (${focusSource})`)();
          drawFocused(camera, render.renderer, render.scene, p, options);
        }
        const visible = node && (() => { for (let p = node; p; p = p.parent) if (!p.visible) return false; return true; })();
        let projection = null;
        if (node) { const p = pointFor(node); p.y += options.aimHeight ?? 1; projection = p.project(camera); }
        const inView = !!projection && Math.abs(projection.x) < 1 && Math.abs(projection.y) < 1 && projection.z > -1 && projection.z < 1;
        let potInView = false;
        render.scene.traverse(item => {
          if (item.name !== "Cinder's ember pot") return;
          for (let parent=item; parent; parent=parent.parent) if (!parent.visible) return;
          const point=item.getWorldPosition(camera.position.clone()).project(camera);
          potInView = Math.abs(point.x)<1 && Math.abs(point.y)<1 && point.z>-1 && point.z<1;
        });
        const at = duel.course.worldAt(state.s, state.lateral);
        const ground = duel.course.groundAt(state.s, state.lateral);
        const aboveCar = !!node && pointFor(node).y > ground.y + 1.5;
        const map = document.querySelector('.world-hud-map:not([hidden])');
        const inPicture = [];
        render.scene.traverse(item => {
          if (!item.name || !item.visible || inPicture.length >= 200) return;
          for (let parent=item.parent; parent; parent=parent.parent) if (!parent.visible) return;
          const point=item.getWorldPosition(camera.position.clone()).project(camera);
          if (Math.abs(point.x)<1 && Math.abs(point.y)<1 && point.z>-1 && point.z<1) inPicture.push(item.name);
        });
        return {car:{x:at.x, z:at.z}, ember:job.job.stepState?.ember ?? null, loaded:job.job.stepState?.loaded ?? false,
          status:state.status, target, found:nodes.length, visible:!!visible, inView, potInView,
          projection:projection && {x:projection.x,y:projection.y,z:projection.z}, map:map?.innerText ?? null,
          mapWays:map ? [...map.querySelectorAll('.world-hud-way strong')].map(item => item.innerText) : [],
          namedInView:[...new Set(inPicture)], forgeFire:job.forgeFire ?? null,
          aboveCar, holdElapsed:job.arrivalHold?.elapsed ?? null};
      }, target, options, drawFocusedPicture.toString());
      report.pictures.push({name, ...measurement});
      report.failures.push(...pictureFailures(name, measurement, options));
      if (options.map) report.failures.push(...mapFailures(name, measurement, options.startMap, options.metBarricade));
      await context.screenshot(name);
    } catch (error) { report.failures.push(`${name}: ${error.message}`); }
    await persist();
  };
  const place = (which, index = 0, distance = 0) => page(context, (which, index, distance) => {
    const app=window.__qaApp, duel=app.duel, state=duel.state, step=state.arena.worldJob.job.steps[0];
    const target = which === 'pickup' ? step.pickup.place.position : which === 'barrier' ? step.barriers[index].position :
      which === 'gate' ? step.riderSafeWall : step.destination.position;
    const start=step.carStart, dx=start.x-target.x, dz=start.z-target.z, length=Math.hypot(dx,dz)||1;
    const x=target.x+dx/length*distance, z=target.z+dz/length*distance, pose=duel.course.nearest(x,z);
    state.s=state.prevS=pose.s; state.lateral=state.prevLateral=pose.lateral; state.speedMph=0;
    state.yawVelocity=0; state.pushVelocity=0; state.arena.worldJob.lastKmh=0;
    const angle=Math.atan2(target.x-x,target.z-z)-duel.course.at(pose.s).heading;
    state.headingError=Math.atan2(Math.sin(angle),Math.cos(angle));
    app.onFrame?.(state,0); window.__render.renderFrame();
  }, which,index,distance);
  try {
    await context.navigate('/tools/menu-check.html?flags=hidden-road,story-everburn,warlord-cards&harness=everburn-job1');
    await wait(context, 'window.__qaApp?.duel.state.status==="menu" && !!window.__render', 'memory-only menu', 60000);
    await page(context, () => {
      if (!window.name.startsWith('__duel_qa_tab_v2:')) throw Error('Memory-only storage is missing');
      const app=window.__qaApp, select=document.querySelector('#graphics-quality');
      select.value='performance'; select.dispatchEvent(new Event('change',{bubbles:true}));
      app.profile={...app.profile,wasteland:{...app.profile.wasteland,version:1,discoveredGate:true}}; app._saveProfile();
    });
    await click(context,'#wasteland-visit');
    await wait(context, 'window.__qaApp?.isYardHomeActive?.()', 'yard', 60000);
    await click(context,'[data-action="yard-cards"]');
    await wait(context, 'document.querySelector(".ember-wall")', 'story wall');
    await click(context,'[data-ember-step="read"]');
    await wait(context, 'window.__qaApp.profile.story?.ember?.read===true', 'note read');
    await click(context,'[data-ember-step="hot-delivery"]');
    await wait(context, 'window.__qaApp?.duel.state.arena?.mode==="world-job" && window.__qaApp.duel.state.status==="racing"', 'Hot Delivery', 90000);
    await wait(context, `(() => { let land; window.__render.scene.traverse(node => { if (node.name === 'The Scablands') land=node; }); return land?.userData.assetStatus === 'ready'; })()`, 'Scablands art', 120000);
    await page(context, () => { window.__qaApp.duel.state.cpuDifficulty='medium'; window.__qaApp.advance(0.2); });
    await wait(context, `(() => { let cinder; window.__render.scene.traverse(node => { if (node.name === 'Cinder at the yard gate') cinder=node; }); return !!cinder?.getObjectByName('Cinder crew model'); })()`, 'Cinder model', 60000);
    await picture('yard-cinder-ring-from-start','Cinder at the yard gate');
    await picture('1-yard-start','Scrapdome yard on the land');
    await key(context,'m','KeyM',77);
    await picture('2-map-start','Scrapdome yard on the land',{map:true,startMap:true});
    await key(context,'m','KeyM',77);
    await place('pickup',0,5);
    await wait(context, `(() => { let cinder; window.__render.scene.traverse(node => { if (node.name === 'Cinder at the yard gate') cinder=node; }); return !!cinder?.getObjectByName('Cinder crew model'); })()`, 'Cinder model', 60000);
    await page(context, () => { for(let i=0;i<120;i++) window.__qaApp.advance(0.1); });
    await picture('3-cinder-pot','Cinder at the yard gate',{focus:true,dx:12,dy:6,dz:15,loaded:true,pot:true});
    // The riders only exist after the pot has been collected.
    for (const distance of [250, 60]) {
      const road = pointAlong(EAST_ROAD.points, 900 - distance);
      await page(context, road => {
        const app=window.__qaApp, duel=app.duel, state=duel.state;
        const scout=state.arena.worldJob.actors.find(actor => actor.id === 'ash-scout');
        if (!scout) throw Error('The scout is missing');
        const pose=duel.course.nearest(road.x,road.z);
        state.s=state.prevS=pose.s; state.lateral=state.prevLateral=pose.lateral; state.speedMph=0;
        const angle=Math.atan2(scout.position.x-road.x,scout.position.z-road.z)-duel.course.at(pose.s).heading;
        state.headingError=Math.atan2(Math.sin(angle),Math.cos(angle));
        app.onFrame?.(state,0); window.__render.renderFrame();
      }, road);
      await picture(`scout-post-from-${distance}m`, 'World job actor: ash-scout', {loaded:true});
    }
    for (const [index, name] of ['safe-road', 'girder-bridge'].entries()) {
      const fence = LAND.at(name), road = roadPointFrom(EAST_ROAD, fence.x, fence.z, -60);
      await page(context, (index, road) => {
        const app = window.__qaApp, duel = app.duel, state = duel.state, job = state.arena.worldJob;
        const rider = job.actors[index], post = job.job.steps[0].waitingActors[index].start.position;
        rider.position = {...rider.position, x:post.x, z:post.z};
        rider.pursuing = false;
        const pose = duel.course.nearest(road.x, road.z);
        state.s = state.prevS = pose.s; state.lateral = state.prevLateral = pose.lateral; state.speedMph = 0;
        const angle = Math.atan2(post.x - road.x, post.z - road.z) - duel.course.at(pose.s).heading;
        state.headingError = Math.atan2(Math.sin(angle), Math.cos(angle));
        app.onFrame?.(state, 0); window.__render.renderFrame();
      }, index, road);
      await picture(`rider-${index + 1}-from-road`, `World job actor: ash-rider-${index + 1}`, {loaded:true});
    }
    // Wake the camp while the car is far away, then view the waiting rider from the road.
    await place('pickup',0,5);
    await page(context, () => {
      const app=window.__qaApp, job=app.duel.state.arena.worldJob;
      job.job.stepState.campAwake=true;
      for (let i=0; i<100; i++) app.advance(0.1);
    });
    const campRoad=roadPointFrom(EAST_ROAD, LAND.at('safe-road').x, LAND.at('safe-road').z, -60);
    await page(context, road => {
      const app=window.__qaApp, duel=app.duel, state=duel.state;
      const rider=state.arena.worldJob.actors.find(actor => actor.id === 'ash-rider-1');
      const pose=duel.course.nearest(road.x,road.z);
      state.s=state.prevS=pose.s; state.lateral=state.prevLateral=pose.lateral; state.speedMph=0;
      const angle=Math.atan2(rider.position.x-road.x,rider.position.z-road.z)-duel.course.at(pose.s).heading;
      state.headingError=Math.atan2(Math.sin(angle),Math.cos(angle));
      app.onFrame?.(state,0); window.__render.renderFrame();
    }, campRoad);
    await picture('camp-awake-at-fence-end','World job actor: ash-rider-1',{loaded:true});
    await page(context, () => {
      const job=window.__qaApp.duel.state.arena.worldJob;
      job.job.stepState.campAwake=false;
      job.actors.find(actor => actor.id === 'ash-rider-1').position={...job.job.steps[0].waitingActors[0].start.position};
    });
    const road=pointAlong(EAST_ROAD.points, 400);
    await page(context, road => {
      const app=window.__qaApp, duel=app.duel, state=duel.state, pose=duel.course.nearest(road.x,road.z);
      state.s=state.prevS=pose.s; state.lateral=state.prevLateral=pose.lateral; state.speedMph=0;
      state.headingError=Math.atan2(Math.sin(Math.atan2(-road.x,-road.z)-duel.course.at(pose.s).heading),Math.cos(Math.atan2(-road.x,-road.z)-duel.course.at(pose.s).heading));
      app.onFrame?.(state,0); window.__render.renderFrame();
    }, road);
    await picture('4-east-road-yard','Scrapdome yard on the land',{loaded:true});
    await place('barrier',0,35);
    await picture('5-halfway-barricade','Ash Men barricade',{focus:true,index:0,dx:18,dy:8,dz:25,loaded:true});
    await place('barrier',1,35);
    await picture('6-bridge-barricade','Ash Men barricade',{focus:true,index:1,dx:18,dy:8,dz:25,loaded:true});
    await page(context, () => { window.__qaApp.advance(0.2); });
    await key(context,'m','KeyM',77);
    await picture('7-map-after-bridge','Ash Men barricade',{index:1,map:true,metBarricade:true,focus:true,dx:18,dy:8,dz:25});
    await key(context,'m','KeyM',77);
    await place('gate',0,15);
    await page(context, () => { window.__qaApp.advance(0.5); });
    await picture('8-tin-town-gate','Hot Delivery town gate door',{focus:true,dx:20,dy:12,dz:35,loaded:true});
    await place('forge',0,2);
    await page(context, () => {
      const app=window.__qaApp;
      for (let i=0; i<600 && !app.duel.state.arena.worldJob.arrivalHold; i++) app.advance(1/60);
      if (!app.duel.state.arena.worldJob.arrivalHold) throw Error('The delivery hold did not start');
      app.onFrame?.(app.duel.state,0); window.__render.renderFrame();
    });
    await picture('9-pot-in-air','Hot Delivery pot transfer',{aboveCar:true,holdAt:3,aimHeight:0});
    await picture('10-forge-alight','Hot Delivery forge fire',{forge:true,holdAt:8,aimHeight:0});
    await page(context, () => { window.__qaApp.advance(2); });
  } catch (error) { report.failures.push(`Scenario setup: ${error.message}`); }
  for (const name of ['yard-cinder-ring-from-start','rider-1-from-road','rider-2-from-road','scout-post-from-250m','scout-post-from-60m','camp-awake-at-fence-end','1-yard-start','2-map-start','3-cinder-pot','4-east-road-yard','5-halfway-barricade',
    '6-bridge-barricade','7-map-after-bridge','8-tin-town-gate','9-pot-in-air','10-forge-alight']) {
    if (!report.pictures.some(picture => picture.name === name)) report.failures.push(`${name}: no measurement was recorded`);
  }
  await persist();
  if (report.failures.length) throw Error(report.failures.join('\n'));
}
