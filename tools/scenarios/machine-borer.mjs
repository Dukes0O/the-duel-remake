import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';

// Every expression is a function call, so each can be parsed independently.
const page = {
  ready: `(() => !!window.__qaApp && !!Object.getOwnPropertyDescriptor(window, 'localStorage')?.value && window.name.startsWith('__duel_qa_tab_v2:'))()`,
  enter: `(() => { const app = window.__qaApp; app.stop();
    if (!app.addPlayer('Mabel test').ok) throw Error('Could not create the memory-only player');
    app.profile = {...app.profile, wasteland:{...app.profile.wasteland, discoveredGate:true}};
    if (!app._saveProfile() || !app.visitWasteland()) throw Error('Could not enter the yard');
    app.advance(8); app.onFrame?.(app.duel.state); return true; })()`,
  yard: `(() => window.__qaApp.isYardHomeActive() && !!document.querySelector('[data-action=yard-the-dig]'))()`,
  open: `(() => { document.querySelector('[data-action=yard-the-dig]').click(); return true; })()`,
  loaded: `(() => !!window.__theDig?.host?.isConnected && (!!window.__theDig.failed || window.__theDig.simulation?.activeMachine === 'excavator'))()`,
  selected: `(() => window.__theDig.simulation.activeMachine === 'borer')()`,
  atFace: `(() => window.__theDig.viewForCheck.readyToWork)()`,
  leverReady: `(() => window.__theDig.simulation.borer.lever >= 0.30)()`,
  leverZero: `(() => window.__theDig.simulation.borer.lever <= 0)()`,
  cut: `(() => window.__theDig.simulation.borer.distanceM >= 50)()`,
  cut20: `(() => window.__theDig.simulation.borer.distanceM >= 20)()`,
  followingInside: `(() => window.__theDig.viewForCheck.camera.userData.borerRoute?.inside === true)()`,
  groundSamples: `(() => { const dig=window.__theDig, b=dig.simulation.borer, v=dig.viewForCheck;
    const forward={x:Math.sin(b.heading),z:Math.cos(b.heading)}, right={x:forward.z,z:-forward.x};
    return [-5,0,5].flatMap(side=>[0,10,20,30,40,60].map(distance=>{
      const x=b.x+distance*forward.x+side*right.x, z=b.z+distance*forward.z+side*right.z;
      return {side,distance,rules:v.surfaceHeight(x,z),hit:v.groundRay({x,y:200,z},{x:0,y:-1,z:0})};
    })); })()`,
  groundView: `(() => { const g=window.__theDig.viewForCheck.ground, m=g.mesh;
    m.updateWorldMatrix(true,false);
    return {visible:m.visible, parentVisible:m.parent?.visible, centreX:g.centreX, centreZ:g.centreZ,
      worldMatrix:m.matrixWorld.toArray(), materialVisible:m.material.visible,
      materialSide:m.material.side, groundLook:!!m.material.userData.groundLook, positionVersion:m.geometry.attributes.position.version}; })()`,
  cover: `(() => { const dig=window.__theDig, b=dig.simulation.borer, v=dig.viewForCheck;
    const crown=b.y+1.65+3, hit=v.groundRay({x:b.x,y:200,z:b.z},{x:0,y:-1,z:0});
    return {crown,rules:v.surfaceHeight(b.x,b.z),drawn:hit?.y ?? null}; })()`,
  roofRay: `(() => { const dig=window.__theDig, v=dig.viewForCheck, s=dig.simulation.tunnels.segments[0];
    const dx=s.end.x-s.start.x,dz=s.end.z-s.start.z,length=Math.hypot(dx,dz);
    let coverStart=null;
    for(let d=0; d<=dig.simulation.borer.distanceM; d+=0.25) {
      const x=s.start.x+d*dx/length, z=s.start.z+d*dz/length;
      if(v.surfaceHeight(x,z)>=s.start.y+s.radius) {coverStart=d;break;}
    }
    if(coverStart===null) return {coverStart,hit:null};
    const d=coverStart+10;
    const target={x:s.start.x+d*dx/length,y:s.start.y+s.radius+3,z:s.start.z+d*dz/length};
    const origin=v.camera.position, direction={x:target.x-origin.x,y:target.y-origin.y,z:target.z-origin.z};
    const distance=Math.hypot(direction.x,direction.y,direction.z);
    return {coverStart,origin:{x:origin.x,y:origin.y,z:origin.z},target,
      travel:dig.simulation.borer.travelM,cameraIndex:dig.simulation.cameraIndex,
      cameraRoute:v.camera.userData.borerRoute ?? null,
      originSurface:v.surfaceHeight(origin.x,origin.z),targetSurface:v.surfaceHeight(target.x,target.z),
      mouths:dig.simulation.tunnels.mouths,hit:v.groundRay(origin,direction,distance)}; })()`,
  mouth: `(() => window.__theDig.simulation.borer.travelM <= 0.1)()`,
  face: `(() => window.__theDig.simulation.borer.travelM >= 29.9)()`,
  inside: `(() => window.__theDig.simulation.borer.travelM <= 25)()`,
  overviewOn: `(() => { window.__theDig.setCheckOverview(true); return true; })()`,
  overviewOff: `(() => { window.__theDig.setCheckOverview(false); return true; })()`,
  overview: `(() => { const d=window.__theDig, b=d.simulation.borer, v=d.viewForCheck;
    const x=b.x+150*Math.sin(b.heading), z=b.z+150*Math.cos(b.heading);
    const hit=v.groundRay({x,y:200,z},{x:0,y:-1,z:0});
    return {floor:b.y,x,z,drawn:hit?.y ?? null,heightAboveFloor:hit ? hit.y-b.y : null}; })()`,
  survey: `(() => { const p=window.__theDig.host.querySelector('.the-dig-survey');
    return {visible:!!p && !p.hidden, text:p?.querySelector('p')?.textContent,
      strip:!!p?.querySelector('canvas') && p.querySelector('canvas').getBoundingClientRect().width>0}; })()`,
  spoil: `(() => { const b=window.__theDig.simulation.borer.spoilBank;
    return {far:b.far, cells:b.cells.length}; })()`,
  visibility: `(() => {
    const d=window.__theDig, v=d.viewForCheck, T=v.three, s=d.simulation.tunnels.segments[0];
    const forward=new T.Vector3(s.end.x-s.start.x,0,s.end.z-s.start.z).normalize();
    const right=new T.Vector3(forward.z,0,-forward.x), mouth=new T.Vector3(s.start.x,s.start.y,s.start.z);
    const floor=mouth.y-1.65, target=mouth.clone().addScaledVector(forward,20); target.y=floor+8;
    const camera=v.camera.clone(), body=v.machine, head=body.getObjectByName('borerhead');
    v.scene.updateMatrixWorld(true);
    const headPos=head.getWorldPosition(new T.Vector3()), middle=new T.Box3().setFromObject(body).getCenter(new T.Vector3());
    const b=d.simulation.borer;
    const geometry={headAhead:headPos.clone().sub(middle).dot(forward),headFromSimulation:Math.hypot(headPos.x-b.x,headPos.z-b.z),head:headPos.toArray(),middle:middle.toArray()};
    const saved=v.world.children.map(o=>[o,o.visible]), oldBackground=v.scene.background, oldFog=v.scene.fog;
    const oldTarget=v.renderer.getRenderTarget(), renderTarget=new T.WebGLRenderTarget(800,600);
    const marker=new T.MeshBasicMaterial({color:0xff00ff,toneMapped:false});
    const pixels=new Uint8Array(800*600*4);
    const rootOf=o=>{while(o && o.parent!==v.world)o=o.parent;return o;};
    function draw(object, withGround) {
      for(const [o] of saved)o.visible=false;
      if(withGround) for(const o of v.groundObjects)rootOf(o).visible=true;
      const root=rootOf(object); if(root)root.visible=true;
      const materials=[];
      object?.traverse(n=>{if(n.isMesh){materials.push([n,n.material]);n.material=marker;}});
      try {
        v.renderer.setRenderTarget(renderTarget);v.renderer.render(v.scene,camera);
        v.renderer.readRenderTargetPixels(renderTarget,0,0,800,600,pixels);
        let marked=0,groundAround=0;
        for(let y=0;y<600;y++)for(let x=0;x<800;x++){
          const i=(y*800+x)*4, r=pixels[i],g=pixels[i+1],bl=pixels[i+2];
          if(r>245 && g<10 && bl>245)marked++;
          else if(withGround && (r>8||g>8||bl>8) && x>200 && x<600 && y>100 && y<500 && (Math.abs(x-400)>65||Math.abs(y-300)>65))groundAround++;
        }
        return {marked,groundAround};
      } finally {for(const [n,m] of materials)n.material=m;}
    }
    try {
      v.scene.background=new T.Color(0);v.scene.fog=null;camera.aspect=800/600;camera.updateProjectionMatrix();
      camera.position.copy(target).addScaledVector(right,40);camera.lookAt(target);camera.updateMatrixWorld(true);
      const sideCamera=camera.position.toArray();
      const alone=draw(body,false), covered=draw(body,true);
      const entrance=mouth.clone();entrance.y=floor+3;
      camera.position.copy(entrance).addScaledVector(forward,-25);camera.lookAt(entrance);camera.updateMatrixWorld(true);
      const portal=draw(v.portals,true),lining=draw(v.lining,true);
      return {geometry,side:{alone,covered,camera:sideCamera},mouth:{portal,lining}};
    } finally {
      for(const [o,visible] of saved)o.visible=visible;
      v.scene.background=oldBackground;v.scene.fog=oldFog;v.renderer.setRenderTarget(oldTarget);renderTarget.dispose();marker.dispose();
    }
  })()`,
  status: `(() => { const b = window.__theDig.simulation.borer; return {distance:b.distanceM, lever:b.lever, stalled:b.stalled}; })()`,
  inputTiming: `(() => { const s = window.__theDig.simulation; return {elapsed:s.elapsed, mode:s.mode, lever:s.borer.lever, distance:s.borer.distanceM}; })()`,
  startInputTrace: `(() => {
    const trace = {events:[], frames:[], active:true};
    const snapshot = () => { const s = window.__theDig.simulation; return {time:performance.now(), elapsed:s.elapsed, mode:s.mode, lever:s.borer.lever}; };
    trace.listener = event => { if (event.code === 'Tab' || event.code === 'KeyW') trace.events.push({type:event.type, code:event.code, ...snapshot()}); };
    document.addEventListener('keydown', trace.listener, true); document.addEventListener('keyup', trace.listener, true);
    const frame = () => { if (!trace.active) return; trace.frames.push(snapshot()); requestAnimationFrame(frame); };
    window.__theDig.inputTrace = trace; requestAnimationFrame(frame); return true;
  })()`,
  stopInputTrace: `(() => {
    const trace = window.__theDig.inputTrace; trace.active = false;
    document.removeEventListener('keydown', trace.listener, true); document.removeEventListener('keyup', trace.listener, true);
    delete window.__theDig.inputTrace; return {events:trace.events, frames:trace.frames};
  })()`,
  pause: `(() => new Promise(resolve => setTimeout(resolve, 100)))()`,
  frame: `(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))()`,
  sample: `(() => { window.__theDig.requestCentreSample(); return new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))); })()`,
  view: `(() => { const dig = window.__theDig, view = dig.viewForCheck, camera = view.camera;
    const inView = root => { let found = false; root?.traverse(node => {
      if (!node.isMesh || !node.visible || !node.geometry?.attributes?.position) return;
      const positions = node.geometry.attributes.position, point = node.position.clone();
      const stride = Math.max(1, Math.floor(positions.count / 500));
      for (let i = 0; i < positions.count; i += stride) {
        point.fromBufferAttribute(positions, i).applyMatrix4(node.matrixWorld).project(camera);
        if (Math.abs(point.x) <= 1 && Math.abs(point.y) <= 1 && point.z >= -1 && point.z <= 1) { found = true; break; }
      }
    }); return found; };
    return {failed:dig.failed, machine:inView(view.machine), tunnel:inView(view.lining) || inView(view.portals),
      distance:dig.simulation.borer.distanceM, segments:dig.simulation.tunnels.segments.length,
      headSpeed:dig.simulation.borer.headSpeed, pixels:view.pixels}; })()`,
};
for (const expression of Object.values(page)) new Function(`return ${expression};`);

const key = (context, code, type) => {
  const expression = `(() => { document.dispatchEvent(new KeyboardEvent(${JSON.stringify(type)}, {code:${JSON.stringify(code)}, bubbles:true, cancelable:true})); return true; })()`;
  new Function(`return ${expression};`);
  return context.evaluate(expression);
};
async function press(context, code) {
  await key(context, code, 'keydown');
  await context.evaluate(page.frame);
  await key(context, code, 'keyup');
}
async function holdUntil(context, code, expression, label, timeout) {
  await key(context, code, 'keydown');
  try { await context.waitFor(expression, label, timeout); }
  finally { await key(context, code, 'keyup'); }
}
async function cutUntil(context, metres) {
  const deadline = Date.now() + 450000;
  let nextReport = Date.now() + 30000, held = null, recovering = false;
  try {
    while (Date.now() < deadline) {
      const state = await context.evaluate(page.status);
      if (Date.now() >= nextReport) {
        console.log(`Mabel: ${state.distance.toFixed(1)} m, lever ${state.lever.toFixed(2)}, stalled ${state.stalled}`);
        nextReport += 30000;
      }
      if (state.distance >= metres) return;
      if (state.stalled) recovering = true;
      if (recovering && !state.stalled && state.lever <= 0) recovering = false;
      const wanted = recovering ? (state.lever > 0 ? 'KeyS' : null) :
        state.lever < 0.30 ? 'KeyW' : state.lever > 0.32 ? 'KeyS' : null;
      if (wanted !== held) {
        if (held) await key(context, held, 'keyup');
        held = wanted;
        if (held) await key(context, held, 'keydown');
      }
      await context.evaluate(page.pause);
    }
    const state = await context.evaluate(page.status);
    throw Error(`Cut timed out at ${state.distance.toFixed(1)} m, lever ${state.lever.toFixed(2)}, stalled ${state.stalled}`);
  } finally { if (held) await key(context, held, 'keyup'); }
}
async function picture(context, name, minimum = 30) {
  await context.evaluate(page.sample);
  const view = await context.evaluate(page.view);
  assert.equal(view.failed, false, 'Mabel and the yard models loaded');
  assert.ok(view.distance >= minimum && view.segments > 0, `the tunnel grew by ${minimum} m`);
  assert.ok(view.machine, `${name}: Mabel is in the camera view`);
  assert.ok(view.tunnel, `${name}: tunnel lining or portal is in the camera view`);
  assert.ok(view.pixels?.length === 5 && view.pixels.some(pixel => pixel.some((value, i) => i < 3 && Math.abs(value - view.pixels[0][i]) > 2)), `${name}: picture centre is not a flat colour`);
  await context.screenshot(name);
  return view;
}
export async function run(context) {
  const measurements = {groundSamples:null, groundView:null, cover:null, roofRay:null, overview:null, survey:null, spoil:null, visibility:null, firstPush:null};
  const persist = () => writeFile(join(context.outputDir, 'machine-borer-measurements.json'), JSON.stringify(measurements, null, 2) + '\n');
  await persist();
  await context.navigate('/tools/menu-check.html?flags=wasteland-town');
  await context.waitFor(page.ready, 'isolated test game', 60000);
  await context.evaluate(page.enter);
  await context.waitFor(page.yard, 'The Dig button', 60000);
  await context.evaluate(page.open);
  await context.waitFor(page.loaded, 'The Dig loaded', 60000);
  for (let i = 0; i < 7; i++) await press(context, 'KeyQ');
  await context.waitFor(page.selected, 'Mabel selected', 10000);
  await context.evaluate(page.frame);
  const samples = await context.evaluate(page.groundSamples);
  measurements.groundSamples = samples;
  measurements.groundView = await context.evaluate(page.groundView);
  await persist();
  for (const sample of samples) {
    console.log(`Ground ${sample.distance} m ahead, ${sample.side} m right: rules ${sample.rules.toFixed(2)}, mesh ${sample.hit?.y?.toFixed(2) ?? 'no hit'}`);
  }
  assert.ok(measurements.groundView.groundLook, 'the ground uses the Scablands ground look');
  for (const sample of samples) {
    assert.ok(sample.hit && Math.abs(sample.rules - sample.hit.y) <= 0.5, 'drawn ground matches the rules');
  }
  await holdUntil(context, 'KeyW', page.atFace, 'Mabel reaches the rock', 90000);
  await context.evaluate(page.overviewOn);
  await context.evaluate(page.frame);
  measurements.overview = await context.evaluate(page.overview);
  measurements.survey = await context.evaluate(page.survey);
  await persist();
  assert.ok(measurements.overview.heightAboveFloor > 6, 'the overview shows the mesa above Mabel');
  assert.ok(measurements.survey.visible && measurements.survey.strip && measurements.survey.text.includes('Far side'), 'the survey and strip are shown at the face');
  const overviewView = await context.evaluate(page.view);
  assert.ok(overviewView.machine, 'Mabel is in the mesa overview');
  await context.screenshot('machine-borer-mesa-overview');
  await context.evaluate(page.overviewOff);
  await context.evaluate(page.frame);
  await context.evaluate(page.startInputTrace);
  await press(context, 'Tab');
  const beforePush = await context.evaluate(page.inputTiming), pushStart = Date.now();
  const pushSamples = [];
  await key(context, 'KeyW', 'keydown');
  try {
    while (Date.now() - pushStart < 1300) {
      await new Promise(resolve => setTimeout(resolve, 100));
      pushSamples.push({wallSeconds:(Date.now()-pushStart)/1000, ...await context.evaluate(page.inputTiming)});
    }
  }
  finally { await key(context, 'KeyW', 'keyup'); }
  const afterPush = await context.evaluate(page.inputTiming);
  const trace = await context.evaluate(page.stopInputTrace);
  measurements.firstPush = {before:beforePush, samples:pushSamples, after:afterPush, trace, wallSeconds:(Date.now()-pushStart)/1000};
  await persist();
  assert.equal(beforePush.mode, 'work', 'Mabel is in work mode before the first W press');
  assert.ok(afterPush.lever - beforePush.lever >= 0.25, 'the first W press moves the lever promptly');
  await cutUntil(context, 20);
  await holdUntil(context, 'KeyS', page.leverZero, 'pull the lever back', 10000);
  const cover = await context.evaluate(page.cover);
  measurements.cover = cover;
  await persist();
  console.log(`Cover at 20 m: crown ${cover.crown.toFixed(2)}, rules ${cover.rules.toFixed(2)}, mesh ${cover.drawn?.toFixed(2) ?? 'no hit'}`);
  assert.ok(cover.rules >= cover.crown + 6 && cover.drawn !== null && cover.drawn >= cover.crown + 6, 'rules and mesh give six metres of cover');
  await press(context, 'KeyC');
  await picture(context, 'machine-borer-mouth-20m', 20);
  await press(context, 'KeyC');
  await cutUntil(context, 45);
  measurements.spoil = await context.evaluate(page.spoil);
  measurements.survey = await context.evaluate(page.survey);
  measurements.visibility = await context.evaluate(page.visibility);
  await persist();
  const visibility = measurements.visibility;
  assert.ok(visibility.geometry.headAhead > 0 && visibility.geometry.headFromSimulation <= 2, 'the head leads and is at the simulation position');
  assert.ok(visibility.side.alone.marked > 0 && visibility.side.covered.marked === 0, 'the hill hides the whole machine from the side');
  assert.ok(visibility.mouth.portal.marked > 0 && visibility.mouth.lining.marked > 0 && visibility.mouth.portal.groundAround > 0, 'the mouth shows the portal, lining and surrounding ground');
  assert.ok(measurements.spoil.far > 0 && measurements.spoil.cells > 0, 'the spoil bank grows');
  assert.ok(measurements.survey.visible && measurements.survey.strip && measurements.survey.text.includes('to go'), 'the running survey and strip are shown');
  await holdUntil(context, 'KeyS', page.leverZero, 'pull the lever back', 10000);
  await context.waitFor(page.followingInside, 'following camera enters the bore', 15000);
  const roof = await context.evaluate(page.roofRay);
  measurements.roofRay = roof;
  await persist();
  console.log(`Ground above the bore: ${JSON.stringify(roof)}`);
  assert.ok(roof.cameraRoute?.inside && roof.cameraIndex === 0, 'the roof ray starts at the following camera inside the bore');
  assert.ok(roof.hit, 'ground blocks the view from inside to above the crown');
  await press(context, 'KeyC');
  await picture(context, 'machine-borer-mouth', 45);
  await press(context, 'KeyC');
  await picture(context, 'machine-borer-face', 45);
  await key(context, 'KeyS', 'keydown');
  try {
    await context.waitFor(page.inside, '20 m back from the face', 60000);
    const inside = await picture(context, 'machine-borer-inside', 45);
    assert.equal(inside.headSpeed, 0, 'the head is stopped while reversing');
  } finally { await key(context, 'KeyS', 'keyup'); }
}
