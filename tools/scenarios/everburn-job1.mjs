// Memory-only visual handoff for Hot Delivery. Claude runs this on Performance.
import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';

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
      const measurement = await page(context, (target, options) => {
        const app = window.__qaApp, duel = app.duel, state = duel.state, render = window.__render;
        const job = state.arena.worldJob, step = job.job.steps[0], camera = render.camera;
        const nodes = [];
        render.scene.traverse(node => { if (node.name === target) nodes.push(node); });
        const node = nodes[options.index || 0];
        app.onFrame?.(state, 0); render.renderFrame();
        if (options.focus && node) {
          node.updateWorldMatrix(true, false);
          const p = node.getWorldPosition(camera.position.clone());
          camera.position.set(p.x + (options.dx || 0), p.y + (options.dy || 8), p.z + (options.dz || 30));
          camera.lookAt(p.x, p.y + (options.aimHeight || 1), p.z);
          camera.updateMatrixWorld(true); render.renderFrame();
        }
        const visible = node && (() => { for (let p = node; p; p = p.parent) if (!p.visible) return false; return true; })();
        let projection = null;
        if (node) { node.updateWorldMatrix(true, false); const p = node.getWorldPosition(camera.position.clone()); p.y += options.aimHeight || 1; projection = p.project(camera); }
        const inView = !!projection && Math.abs(projection.x) < 1 && Math.abs(projection.y) < 1 && projection.z > -1 && projection.z < 1;
        const at = duel.course.worldAt(state.s, state.lateral);
        const map = document.querySelector('.world-hud-map:not([hidden])');
        return {car:{x:at.x, z:at.z}, ember:job.job.stepState?.ember ?? null, loaded:job.job.stepState?.loaded ?? false,
          status:state.status, target, found:nodes.length, visible:!!visible, inView,
          projection:projection && {x:projection.x,y:projection.y,z:projection.z}, map:map?.innerText ?? null,
          namedInScene:[...new Set(nodes.map(item=>item.name))], forgeFire:job.forgeFire ?? null};
      }, target, options);
      report.pictures.push({name, ...measurement});
      if (!measurement.visible || !measurement.inView) report.failures.push(`${name}: ${target} is not visible inside the picture`);
      if (options.map && measurement.map === null) report.failures.push(`${name}: the large map is not open`);
      if (options.loaded && !measurement.loaded) report.failures.push(`${name}: the pot is not on the car`);
      if (options.forge && !measurement.forgeFire) report.failures.push(`${name}: the forge has not caught fire`);
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
    await page(context, () => { window.__qaApp.duel.state.cpuDifficulty='medium'; window.__qaApp.advance(0.2); });
    await picture('1-yard-start','Scrapdome yard on the land');
    await key(context,'m','KeyM',77);
    await picture('2-map-start','Scrapdome yard on the land',{map:true});
    await key(context,'m','KeyM',77);
    await place('pickup',0,5);
    await page(context, () => { for(let i=0;i<120;i++) window.__qaApp.advance(0.1); });
    await picture('3-cinder-pot','Cinder at the yard gate',{focus:true,dx:12,dy:6,dz:15,loaded:true});
    await place('pickup',0,160);
    await picture('4-east-road-yard','Scrapdome yard on the land',{focus:true,dx:100,dy:35,dz:100,loaded:true});
    await place('barrier',0,35);
    await picture('5-halfway-barricade','Ash Men barricade',{focus:true,index:0,dx:18,dy:8,dz:25,loaded:true});
    await place('barrier',1,35);
    await picture('6-bridge-barricade','Ash Men barricade',{focus:true,index:1,dx:18,dy:8,dz:25,loaded:true});
    await page(context, () => { window.__qaApp.advance(0.2); });
    await key(context,'m','KeyM',77);
    await picture('7-map-after-bridge','Ash Men barricade',{index:1,map:true,focus:true,dx:18,dy:8,dz:25});
    await key(context,'m','KeyM',77);
    await place('gate',0,15);
    await page(context, () => { window.__qaApp.advance(0.5); });
    await picture('8-tin-town-gate','Hot Delivery town gate door',{focus:true,dx:20,dy:12,dz:35,loaded:true});
    await place('forge',0,2);
    await page(context, () => { for(let i=0;i<80;i++) window.__qaApp.advance(0.1); });
    await picture('9-forge-alight','Hot Delivery forge fire',{focus:true,dx:10,dy:6,dz:12,forge:true});
  } catch (error) { report.failures.push(`Scenario setup: ${error.message}`); }
  await persist();
  if (report.failures.length) throw Error(report.failures.join('\n'));
}
