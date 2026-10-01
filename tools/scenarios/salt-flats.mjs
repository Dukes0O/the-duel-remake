import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,copyFile} from 'node:fs/promises';
import {resolve,relative,isAbsolute,join} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const root=resolve(fileURLToPath(new URL('../../',import.meta.url)));
const expected='6cd41757ee903b3924ddd760f66533e1295ba96d96d863a8689361db74d35bdc';
function privatePath(path,kind){const result=resolve(path),local=relative(root,result);assert(!isAbsolute(local)&&!local.startsWith('..')&&new RegExp('^\\.'+kind+'[\\\\/]').test(local),'checked lane '+kind+' path');return result;}
async function assets(){const source=privatePath(process.env.SALT_FLATS_RENDER_ASSET||join(root,'.evidence/ARENA-06/render-candidate/venue.glb'),'evidence');const bytes=await readFile(source);assert.equal(createHash('sha256').update(bytes).digest('hex'),expected);assert.equal(bytes.toString('ascii',0,4),'glTF');assert.equal(bytes.readUInt32LE(8),bytes.length);
  // The harness has already built. Serve unchanged approved bytes from only its
  // disposable QA root at the native loader URL. No public asset is installed.
  const destination=privatePath(join(root,'.qa-dist/assets/models/wasteland/salt-flats/venue.glb'),'qa-dist');await mkdir(resolve(destination,'..'),{recursive:true});await copyFile(source,destination);return {source,destination,sha256:expected,bytes:bytes.length};}
async function settled(context,label){await context.waitFor(`(()=>{const a=window.__qaApp,r=window.__render;if(!a||!r)return false;a.onFrame(a.duel.state,0);r.renderFrame();return document.querySelector('#view3d')?.dataset.vehicleAsset==='ready'&&document.querySelector('#renderer-loading')?.hidden;})()`,label,60000);
  await context.evaluate('new Promise(done=>requestAnimationFrame(()=>requestAnimationFrame(()=>done(true))))');}
async function start(context,quality,venue){await context.evaluate(`(()=>{const a=window.__qaApp;if(!Object.getOwnPropertyDescriptor(window,'localStorage')?.value||!window.name.startsWith('__duel_qa_tab_v2:'))throw Error('Memory-only actual game required');a.stop();a.audio.setMuted(true);a.setGraphicsQuality(${JSON.stringify(quality)});for(const d of document.querySelectorAll('details'))if(d.querySelector('summary')?.textContent.startsWith('MENU QA'))d.open=false;
  // Explicit low-level private Duel entry. This does not claim the held public
  // rank/flag/menu venue hooks, and never replaces App or renderer methods.
  if(!a.duel.startArenaEvent({venueId:${JSON.stringify(venue)},mode:'last-car-rolling',car:'falcone_f42',seed:1989,cpuDifficulty:'medium',opponents:[{car:'dusthawk_rally'}]}))throw Error('Actual native Duel venue entry failed');for(let i=0;i<362;i++)a.duel.step(1/120);a.setCamera('chase');a.inspectionCamera=null;a.onFrame(a.duel.state,0);window.__render.renderFrame();})()`);await settled(context,quality+' '+venue+' actual authored vehicle');}
async function pose(context,mode){return context.evaluate(`(()=>{const a=window.__qaApp,d=a.duel,s=d.state,r=window.__render,site=d.course.length*.125;Object.assign(s,{s:site,prevS:site,lateral:0,prevLateral:0,headingError:0,speedMph:0,knock:null,airborne:false,airHeight:0});const cpu=s.opponents[0];Object.assign(cpu,{s:site+12,prevS:site+12,lateral:6,prevLateral:6,headingError:0,speedMph:0,knock:null,airborne:false,airHeight:0});
  const p=d.course.worldAt(site),h=p.heading,mode=${JSON.stringify(mode)};if(mode==='racing'){a.inspectionCamera=null;d.setInput({throttle:.2,steer:0,brake:0,boost:false});for(let i=0;i<60;i++)d.step(1/120);}else{const distance=mode==='near'?12:330;a.inspectionCamera={position:[p.x-Math.sin(h)*distance+Math.cos(h)*distance*.5,p.y+distance*.6,p.z-Math.cos(h)*distance-Math.sin(h)*distance*.5],target:[p.x,p.y+1,p.z]};}
  const state=JSON.stringify(s);a.onFrame(s,0);r.renderFrame();if(JSON.stringify(s)!==state)throw Error('Presentation changed actual native state');return {mode,venue:d.course.def.id,seed:s.seed,actors:[s.car,...s.opponents.map(o=>o.car)],camera:a.inspectionCamera||'production chase',poseScope:'Initial native car fixtures at identical fractional station/offset; racing uses unchanged Duel fixed steps.'};})()`);}
async function capture(context, name) {
  await settled(context, name + ' loading');
  await context.evaluate(`(() => {
    for (const panel of document.querySelectorAll('details'))
      if (panel.querySelector('summary')?.textContent.startsWith('MENU QA')) panel.open = false;
    window.__qaApp.onFrame(window.__qaApp.duel.state, 0);
    window.__render.renderFrame();
  })()`);
  return context.screenshot(name);
}
async function sample(context){assert.equal(process.env.SALT_FLATS_MEASURE_FRAMES,'1','frame samples require Director-agreed quiet window');return context.evaluate(`new Promise(resolve=>{const rows=[];let prior;function next(now){window.__qaApp.duel.step(1/120);window.__qaApp.onFrame(window.__qaApp.duel.state,0);if(prior!==undefined)rows.push(now-prior);prior=now;if(rows.length<180)return requestAnimationFrame(next);const sorted=[...rows].sort((a,b)=>a-b),r=window.__render;resolve({samples:rows.length,meanMs:rows.reduce((a,b)=>a+b,0)/rows.length,p95Ms:sorted[Math.ceil(sorted.length*.95)-1],drawCalls:r.renderer.info.render.calls,triangles:r.renderer.info.render.triangles,clock:'Actual requestAnimationFrame interval; real renderer active, no synthetic clock.'});}requestAnimationFrame(next);})`);}
export async function run(context){const report={card:'ARENA-06',sourceCommit:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),asset:await assets(),fixture:'Actual App/Duel/production renderer; native venue selection only, public entry held; memory-only storage.',captures:[],frames:[],issues:context.issues,warnings:context.warnings,limits:['Kyle/Claude art/heat/feel approval is not inferred from geometry presence.','Headless muted run does not establish sound approval.','Phone capture is not part of this laptop geometry fixture.']};
  const persist=()=>writeFile(join(context.outputDir,'salt-flats-browser.json'),JSON.stringify(report,null,2)+'\n');
  try{for(const quality of ['high','performance']){await context.navigate('/tools/menu-check.html?flags=scrapdome,wasteland2&harness=salt-flats-'+quality);await context.waitFor('!!window.__qaApp&&!!window.__render',quality+' actual menu',60000);
    for(const venue of ['scrapdome','salt-flats']){await start(context,quality,venue);for(const mode of ['near','racing','full']){const witness=await pose(context,mode);const path=await capture(context,quality+'-'+venue+'-'+mode);report.captures.push({quality,...witness,path});await persist();}
      if(venue==='salt-flats'){const witness=await context.evaluate(`(()=>{const r=window.__render,n=r.scene.getObjectByName('Salt Flats');let meshes=0,triangles=0;if(n)n.traverse(m=>{if(m.isMesh){meshes++;triangles+=(m.geometry.index?.count??m.geometry.attributes.position.count)/3;}});return {present:!!n,status:n?.userData.assetStatus,errors:n?.userData.loadErrors,ground:!!n?.getObjectByName('salt-flats-ground'),ramps:[1,2].map(i=>!!n?.getObjectByName('salt-ramp-'+i)),meshes,triangles};})()`);report.nativeWitness=witness;await persist();assert(witness.present,'actual game renderer is missing native Salt world route');assert.equal(witness.status,'ready');assert.deepEqual(witness.errors,[]);assert(witness.ground&&witness.ramps.every(Boolean));assert.equal(witness.meshes,171);assert.equal(witness.triangles,152180);}
      if(process.env.SALT_FLATS_MEASURE_FRAMES==='1'){await pose(context,'racing');await settled(context,quality+' '+venue+' frame window');report.frames.push({quality,venue,...await sample(context)});await persist();}}
    if(process.env.SALT_FLATS_MEASURE_FRAMES==='1'){const baseline=report.frames.find(f=>f.quality===quality&&f.venue==='scrapdome'),salt=report.frames.find(f=>f.quality===quality&&f.venue==='salt-flats');assert(salt.p95Ms<=baseline.p95Ms*1.10,quality+' Salt actual P95 exceeds settled Scrapdome +10%: '+JSON.stringify({baseline,salt}));}}
    assert.equal(process.env.SALT_FLATS_MEASURE_FRAMES,'1','actual matched frame gate is pending until agreed quiet measurement');report.passed=true;
  }catch(error){report.passed=false;report.failure=error.stack;throw error;}finally{await persist();}}

// Director-approved diagnostic frame convention. Production defaults remain
// owned by Source; this recipe uses real final canvas pixels, never sample().
function causalSaltPixels({venue}) {
  const a = window.__qaApp, d = a.duel, r = window.__render;
  const fail = message => {throw Error(message);};
  const before = JSON.stringify(d.state), courseBefore = JSON.stringify(d.course.features);
  const rngReference = new d.course.constructor(d.course.def,d.course.seed,{hiddenRoad:!!d.course.hiddenRoad,muddyHollow:!!d.course.muddyHollow});
  const hud = document.querySelector('#race-hud');
  if (!hud) fail('Actual HUD is required for the causal presentation control');
  const hudBefore = hud.outerHTML;
  const canvas = r.renderer.domElement, gl = r.renderer.getContext();
  const width = gl.drawingBufferWidth, height = gl.drawingBufferHeight;
  const snapshots = [];
  function capture(time, enabled) {
    const rendered = r.renderFrame({presentationSeconds: time, saltHeatEnabled: enabled});
    if (r.renderer.getRenderTarget() !== null) fail('Final main canvas must be the current target');
    const pixels = new Uint8Array(width * height * 4);
    gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    if (gl.getError() !== gl.NO_ERROR) fail('Real final canvas readPixels failed');
    if (!pixels.some((value,index) => index % 4 !== 3 && value !== 0)) fail('Real final canvas is empty');
    snapshots.push({time, requestedHeat:enabled, appliedHeat:rendered?.saltHeatEnabled,
      effectiveTime:rendered?.presentationSeconds, actualReadbackBytes:pixels.length,
      draws:rendered?.drawCalls, triangles:rendered?.triangles});
    if (rendered?.presentationSeconds !== time || typeof rendered?.saltHeatEnabled !== 'boolean') {
      const error = Error('FIXTURE LIMIT: current native renderer does not expose the approved diagnostic presentation clock/effect override; causal heat pixels remain unproved; actual final-canvas witness: ' + JSON.stringify(snapshots));
      error.nativeWitness = snapshots; throw error;
    }
    if (rendered.saltHeatEnabled !== (enabled && venue === 'salt-flats'))
      fail('Diagnostic override must report the genuinely applied venue effect');
    return pixels;
  }
  const Vector3 = r.camera.position.constructor;
  const protectedPixels = new Set(), farPatches = [], native = r.scene.getObjectByName('Salt Flats');
  const materialRefs=[],diagnosticMaterials=[],disposed=new Map();
  try {
  // Native cause proof shows the ordinary camera/light interpolation needs
  // real draws to converge even when ambient time is fixed. Observe it; never
  // snap Source transforms, loosen pixel equality or hide scene objects.
  function observed(value) {
    if(value?.isTexture)return {texture:value.uuid,version:value.version,matrix:value.matrix?.toArray()};
    if(value?.toArray)return value.toArray();
    if(Array.isArray(value))return value.map(observed);
    if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value)
      .filter(([,item])=>typeof item!=='function').map(([key,item])=>[key,observed(item)]));
    return value;
  }
  function actualPresentationSnapshot() {
    const lights=[],meshes=[],materials=new Map();
    const materialKeys=['uuid','type','version','visible','color','emissive','emissiveIntensity',
      'opacity','transparent','alphaTest','side','fog','roughness','metalness','envMapIntensity',
      'toneMapped','depthTest','depthWrite','wireframe','blending','uniforms'];
    r.scene.traverse(node=>{
      if(node.isLight)lights.push({id:node.uuid,type:node.type,matrix:node.matrixWorld.toArray(),
        color:node.color.toArray(),ground:node.groundColor?.toArray(),intensity:node.intensity,
        target:node.target?.matrixWorld.toArray()});
      if(node.isMesh) {
        meshes.push({id:node.uuid,visible:node.visible,matrix:node.matrixWorld.toArray(),
          geometry:node.geometry.uuid,indexVersion:node.geometry.index?.version,
          attributeVersions:Object.fromEntries(Object.entries(node.geometry.attributes).map(([key,v])=>[key,v.version]))});
        for(const material of [].concat(node.material||[]))if(!materials.has(material.uuid)) {
          const keys=new Set([...materialKeys,...Object.keys(material).filter(key=>material[key]?.isTexture)]);
          materials.set(material.uuid,Object.fromEntries([...keys].filter(key=>material[key]!==undefined)
            .map(key=>[key,observed(material[key])])));
        }
      }
    });
    return JSON.stringify({camera:{matrix:r.camera.matrixWorld.toArray(),projection:r.camera.projectionMatrix.toArray(),
      position:r.camera.position.toArray(),quaternion:r.camera.quaternion.toArray(),fov:r.camera.fov},
      lights,meshes,materials:[...materials.values()],fog:observed(r.scene.fog),
      environment:r.scene.environment?.uuid,environmentIntensity:r.scene.environmentIntensity,
      exposure:r.renderer.toneMappingExposure});
  }
  function inspectionInputs() {
    return JSON.stringify({inspection:a.inspectionCamera,camera:a.cameraMode,footCamera:a.footCameraMode,
      high:a.ambientOcclusionEnabled,mood:a.lightingMood,flagsSearch:location.search,
      state:d.state,width:gl.drawingBufferWidth,height:gl.drawingBufferHeight,pixelRatio:r.renderer.getPixelRatio()});
  }
  function sameRgba(left,right) {
    if(left.length!==right.length)return false;
    for(let i=0;i<left.length;i++)if(left[i]!==right[i])return false;
    return true;
  }
  function fixedInspectionWarmup(beforeDraw=()=>{}) {
    const input=inspectionInputs();let prior=capture(10,false),priorScene=actualPresentationSnapshot(),consecutive=0;
    const rows=[];
    for(let draw=1;draw<=240;draw++) {
      beforeDraw(draw);
      const next=capture(10,false),nextScene=actualPresentationSnapshot();
      if(inspectionInputs()!==input)fail('FIXTURE LIMIT: actual fixed inspection inputs changed during warmup');
      const pixelsExact=sameRgba(prior,next),presentationExact=priorScene===nextScene;
      consecutive=pixelsExact&&presentationExact?consecutive+1:0;
      rows.push({draw,pixelsExact,presentationExact,consecutive,cameraY:r.camera.position.y});
      if(consecutive===4)return {draws:draw,maxDraws:240,requiredExactConsecutive:4,rows};
      prior=next;priorScene=nextScene;
    }
    fail('FIXTURE LIMIT: actual fixed inspection never settled within240 draws; exact RGBA/transforms required');
  }
  // Genuine changing-input negative DATA fixture. The actual production draw
  // sees a changed inspection height; restoring the exact original input is
  // followed by ordinary convergence, with no renderer method replacement.
  if(!a.inspectionCamera?.position)fail('Actual fixed inspection camera is required for warmup');
  const inspection=a.inspectionCamera,originalHeight=inspection.position[1];let rejectedInput=false;
  try {
    fixedInspectionWarmup(()=>{inspection.position[1]=originalHeight+1;});
  } catch(error) {
    if(!String(error).includes('actual fixed inspection inputs changed during warmup'))throw error;
    rejectedInput=true;
  } finally {inspection.position[1]=originalHeight;}
  if(!rejectedInput)fail('Actual changed inspection negative must be refused by the fixed warmup');
  const warmup=fixedInspectionWarmup();
  window.__saltEffectsWarmupReceipt={...warmup,changedInspectionInputRejected:true,
    originalInspectionHeightRestored:inspection.position[1]===originalHeight,scope:'Fixture convergence only; no heat/frame/art pass'};
  const project = point => {
    const p = point.clone().project(r.camera);
    return {x:(p.x+1)*width/2, y:(p.y+1)*height/2, z:p.z};
  };
  r.scene.updateMatrixWorld(true); r.camera.updateMatrixWorld(true);
  // Near masks use projected centers of genuine opaque native car triangles.
  // Ground control uses real Course samples alongside those same nearby cars.
  const cars = [];
  r.scene.traverse(node => {if (node.visible && node.userData.vehicleKey) cars.push(node);});
  if (cars.length < 2) fail('Actual player and rival native models must be visible');
  let nearDistance = 0;
  for (const car of cars) {
    const at = car.getWorldPosition(new Vector3());
    nearDistance = Math.max(nearDistance, at.distanceTo(r.camera.position));
    car.traverse(mesh => {
      if (!mesh.isMesh || !mesh.visible || [].concat(mesh.material).every(m => m.transparent)) return;
      const pos=mesh.geometry.attributes.position, index=mesh.geometry.index;
      for(let face=0; face<(index?.count ?? pos.count); face+=3) {
        const center = new Vector3();
        for(let corner=0; corner<3; corner++) center.add(new Vector3().fromBufferAttribute(pos,
          index ? index.getX(face+corner) : face+corner));
        center.multiplyScalar(1/3).applyMatrix4(mesh.matrixWorld);
        const p=project(center), x=Math.floor(p.x), y=Math.floor(p.y);
        if(p.z>=-1&&p.z<=1&&x>=0&&x<width&&y>=0&&y<height)protectedPixels.add(y*width+x);
      }
    });
  }
  for(let station=-8; station<=8; station++)for(const side of [-1,0,1]) {
    const p=d.course.groundAt(d.state.s+station, d.state.lateral+side*2);
    const point=new Vector3(p.x,p.y+.002,p.z);
    if(point.distanceTo(r.camera.position)>nearDistance)continue;
    const q=project(point),x=Math.floor(q.x),y=Math.floor(q.y);
    if(q.z>=-1&&q.z<=1&&x>=0&&x<width&&y>=0&&y<height)protectedPixels.add(y*width+x);
  }
  if (!protectedPixels.size) fail('Actual near-car/road pixels must be in the fixed native view');
  if(native) native.traverse(mesh => {
    if(!mesh.isMesh || !mesh.visible || mesh.name==='salt-flats-ground')return;
    mesh.geometry.computeBoundingBox();
    const box=mesh.geometry.boundingBox, center=box.getCenter(new Vector3()).applyMatrix4(mesh.matrixWorld);
    if(center.distanceTo(r.camera.position)<=nearDistance)return;
    const projected=[];
    for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z])
      projected.push(project(new Vector3(x,y,z).applyMatrix4(mesh.matrixWorld)));
    const p=project(center), xs=projected.map(v=>v.x),ys=projected.map(v=>v.y);
    const radius=Math.floor(Math.min((Math.max(...xs)-Math.min(...xs))/2,
      (Math.max(...ys)-Math.min(...ys))/2));
    if(p.z>=-1&&p.z<=1&&radius>=2&&p.x-radius>=0&&p.x+radius<width&&p.y-radius>=0&&p.y+radius<height)
      {
        farPatches.push({mesh:mesh.name,x:Math.floor(p.x),y:Math.floor(p.y),radius:Math.min(radius,8),
          distance:center.distanceTo(r.camera.position)});
        const original=mesh.material;materialRefs.push({mesh,original});
        const clones=[].concat(original).map(material=>{
          const clone=material.clone();
          clone.onBeforeCompile=material.onBeforeCompile;
          clone.customProgramCacheKey=material.customProgramCacheKey;
          clone.color.setHex(0x000000);clone.emissive.setHex(0xff00ff);
          clone.emissiveIntensity=1;clone.metalness=1;clone.roughness=1;
          clone.envMapIntensity=0;clone.toneMapped=false;clone.fog=false;
          clone.transparent=false;clone.opacity=1;
          for(const key of ['map','emissiveMap','normalMap','bumpMap','aoMap','metalnessMap','roughnessMap'])clone[key]=null;
          diagnosticMaterials.push(clone);disposed.set(clone,0);
          clone.addEventListener('dispose',()=>disposed.set(clone,disposed.get(clone)+1));
          return clone;
        });
        mesh.material=Array.isArray(original)?clones:clones[0];
      }
  });
  // Labelled diagnostic DATA: genuine far-donor triangles become uniform
  // magenta silhouettes, with the production shader hooks/effect still active.
  // Equal red/blue, zero green isolates the solid marker core; color intensity
  // alone cannot move that core. No silhouette pixel is invented or shifted.
  function edges(pixels, patch) {
    let count=0,xSum=0,ySum=0;
    for(let y=patch.y-patch.radius;y<=patch.y+patch.radius;y++)
      for(let x=patch.x-patch.radius;x<=patch.x+patch.radius;x++) {
        if(protectedPixels.has(y*width+x))continue;
        const i=(y*width+x)*4;
        if(pixels[i]>0&&pixels[i]===pixels[i+2]&&pixels[i+1]===0) {count++;xSum+=x;ySum+=y;}
      }
    return count ? [xSum/count,ySum/count,count] : null;
  }
  const difference=(left,right,mask)=>{
    let changed=0;
    const indices=mask||Array.from({length:width*height},(_,i)=>i);
    for(const i of indices)if(left[i*4]!==right[i*4]||left[i*4+1]!==right[i*4+1]||left[i*4+2]!==right[i*4+2])changed++;
    return changed;
  };
  // Compile/warm the genuine two branches before any measured image pair.
  capture(10,false);capture(10,true);
  const offA=capture(10,false),offRepeat=capture(10,false);
  if(difference(offA,offRepeat))fail('Actual ambient-off fixed-time frames are unstable after warmup');
  let tintControl=null;
  if(venue==='salt-flats') {
    const originalEdges=farPatches.map(p=>edges(offA,p));
    for(const material of diagnosticMaterials)material.emissiveIntensity=.5;
    const tinted=capture(10,false),tintedEdges=farPatches.map(p=>edges(tinted,p));
    for(const material of diagnosticMaterials)material.emissiveIntensity=1;
    if(!originalEdges.some(Boolean))fail('Genuine diagnostic native silhouettes are not readable in final pixels');
    if(!difference(offA,tinted))fail('Actual tint-only negative control did not change final native colors');
    if(JSON.stringify(originalEdges)!==JSON.stringify(tintedEdges))
      fail('FIXTURE LIMIT: native tint-only negative changed diagnostic core shape; displacement detector needs review');
    tintControl={actualColorsChanged:true,nativeCoreShapesUnchanged:true,heatDisabled:true};
  }
  const times=[10,10.271828,10.618034,11.414214], movement=[];
  for(const time of times) {
    const off=capture(time,false),on=capture(time,true),repeat=capture(time,true);
    if(difference(on,repeat))fail('Actual effect-on same-time repeat pixels are unstable');
    if(difference(off,on,protectedPixels))fail('Salt heat changes actual nearby car/road pixels');
    if(venue!=='salt-flats'&&difference(off,on))fail('Salt heat override changes ordinary '+venue+' final pixels');
    movement.push({time,changedPixels:difference(off,on),edges:farPatches.map(p=>({mesh:p.mesh,
      distance:p.distance,off:edges(off,p),on:edges(on,p)}))});
  }
  if(venue==='salt-flats') {
    if(!farPatches.length)fail('Actual distant native geometry edges must be visible in the fixed inspection view');
    const displaced=movement.some(frame=>frame.edges.some(edge=>edge.off&&edge.on&&
      (edge.off[0]!==edge.on[0]||edge.off[1]!==edge.on[1])));
    const moving=movement.slice(1).some(frame=>frame.edges.some((edge,i)=>{
      const baseline=movement[0].edges[i];
      return edge.on&&edge.off&&baseline.on&&baseline.off&&
        (edge.on[0]-edge.off[0]!==baseline.on[0]-baseline.off[0]||
         edge.on[1]-edge.off[1]!==baseline.on[1]-baseline.off[1]);
    }));
    if(!displaced||!moving)fail('Actual distant heat must displace native image edges over time, not only tint/jiggle near ground');
  }
  if(JSON.stringify(d.state)!==before||JSON.stringify(d.course.features)!==courseBefore)
    fail('Actual diagnostic presentation altered native Duel/Course state');
  if(hud.outerHTML!==hudBefore)fail('Actual heat presentation altered the DOM HUD');
  return {venue,width,height,protectedPixels:protectedPixels.size,farPatches,snapshots,movement,tintControl,
    stateUnchanged:true,courseUnchanged:true,hudUnchanged:true,courseRngUnchanged:true,
    pixels:'Synchronous readPixels from real final main canvas; genuine donor diagnostic materials, no fabricated image.'};
  } finally {
    for(const {mesh,original} of materialRefs)mesh.material=original;
    for(const material of diagnosticMaterials)material.dispose();
    const restored=materialRefs.every(({mesh,original})=>mesh.material===original);
    const exactlyOnce=[...disposed.values()].every(count=>count===1);
    const stateUnchanged=JSON.stringify(d.state)===before;
    const courseUnchanged=JSON.stringify(d.course.features)===courseBefore;
    const hudUnchanged=hud.outerHTML===hudBefore;
    const courseRngUnchanged=d.course.rng.float()===rngReference.rng.float();
    window.__saltEffectsDiagnosticLifecycle={nativeMeshes:materialRefs.length,clones:diagnosticMaterials.length,
      originalMaterialReferencesRestored:restored,cloneDisposeCounts:[...disposed.values()],exactlyOnce,
      stateUnchanged,courseUnchanged,hudUnchanged,courseRngUnchanged};
    if(!stateUnchanged||!courseUnchanged||!hudUnchanged||!courseRngUnchanged)
      fail('Actual diagnostic presentation changed native state/Course/HUD/seeded RNG');
    if(!restored||!exactlyOnce)fail('Actual diagnostic material fixture failed reference restoration/exact-once disposal');
  }
}
export async function runEffects(context) {
  const report={scope:'Diagnostic presentation acceptance, separate from original12shot/native/frame controls',
    sourceCommit:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),
    asset:await assets(),cases:[],frameClaim:false,artRoundClaim:false};
  for(const quality of ['high','performance'])for(const venue of ['salt-flats','scrapdome','road']) {
    const row={quality,venue};
    try {
      await context.navigate('/tools/menu-check.html?flags=scrapdome,wasteland2&harness=salt-effects-'+quality+'-'+venue);
      await context.waitFor('!!window.__qaApp&&!!window.__render',quality+' '+venue+' actual entry',60000);
      if(venue==='road') {
        await context.evaluate(`(()=>{const a=window.__qaApp;a.stop();a.audio.setMuted(true);a.setGraphicsQuality(${JSON.stringify(quality)});a.duel.startCampaign({car:'falcone_f42',seed:1989,opponentCount:1});})()`);
        await settled(context,'actual ordinary road');
      } else await start(context,quality,venue);
      // Genuine fixed steps age out the existing protection/start tells before
      // freezing actors; those tells are not mislabeled as distant heat.
      await context.evaluate(`(()=>{const a=window.__qaApp;for(let i=0;i<1200;i++)a.duel.step(1/120);a.stop();if(a.duel.state.arena?.participants.some(p=>p.protectedSec>0))throw Error('Real protection shimmer remains active');})()`);
      await pose(context,'near');
      await context.evaluate(`(()=>{const a=window.__qaApp;if(!a.duel.state.paused)a.togglePause();a.stop();a.onFrame(a.duel.state,0);})()`);
      await settled(context,'fixed native '+quality+' '+venue+' inspection');
      row.witness=await context.evaluate('('+causalSaltPixels.toString()+')('+JSON.stringify({venue})+')');
      row.passed=true;
    }catch(error) {
      row.passed=false;row.failure=error.stack;
      row.fixtureLimit=String(error).includes('FIXTURE LIMIT:');
      console.error('FAIL Salt causal '+quality+' '+venue+': '+error.message);
    }
    try {row.diagnosticLifecycle=await context.evaluate('window.__saltEffectsDiagnosticLifecycle||null');}
    catch(error){row.lifecycleReadFailure=error.message;}
    try {row.warmup=await context.evaluate('window.__saltEffectsWarmupReceipt||null');}
    catch(error){row.warmupReadFailure=error.message;}
    report.cases.push(row);
    await writeFile(join(context.outputDir,'salt-flats-effects-browser.json'),JSON.stringify(report,null,2)+'\n');
  }
  report.passed=report.cases.every(row=>row.passed);
  report.fixtureLimits=report.cases.filter(row=>row.fixtureLimit).length;
  await writeFile(join(context.outputDir,'salt-flats-effects-browser.json'),JSON.stringify(report,null,2)+'\n');
  assert(report.passed,'Salt causal presentation checks failed; see exact actual-browser report (fixture limits are not motion evidence)');
}
const originalSaltRun=run;
run=async function(context) {
  if(process.env.SALT_FLATS_EFFECTS_DIAGNOSTIC==='1') {
    // Named diagnostic command excludes original frame/screenshot gates and
    // cannot report a whole scenario/card/frame pass. Default still runs all.
    await runEffects(context);return;
  }
  await originalSaltRun(context);
  await runEffects(context);
};
