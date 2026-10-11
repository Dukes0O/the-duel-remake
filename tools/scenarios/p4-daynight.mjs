// Native models/world, private memory-only saves. Frame comparisons run only
// when the Director schedules P4_DAYNIGHT_MEASURE_FRAMES=1 for a quiet slot.
import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';

function prepare(quality) {
  const app = window.__qaApp, api = window.__render;
  if (!Object.getOwnPropertyDescriptor(window, 'localStorage')?.value ||
      !window.name.startsWith('__duel_qa_tab_v2:')) throw Error('Memory-only QA required');
  app.stop();app.audio.setMuted(true);app.setGraphicsQuality(quality);app.cameraMode = 'chase';
  const stageGetter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(app.duel), 'stageDef')?.get;
  if (!stageGetter) throw Error('Native stage definition getter unavailable');
  const originalDefinition = stageGetter.call({state: {stageIndex: 2, arena: false}});
  if (originalDefinition !== app.getMenuCourse(2).def) throw Error('QA does not hold the native Harbor catalog definition');
  const originalPath = Object.getOwnPropertyDescriptor(originalDefinition, 'lightPath');
  const initialPath = Object.freeze({axis: 'race-progress', keyframes: Object.freeze([
    Object.freeze({at: 0, look: 'day'}), Object.freeze({at: 1, look: 'night'}),
  ])});
  let authoredAtCreation = false;
  try {
    Object.defineProperty(originalDefinition, 'lightPath', {value: initialPath, configurable: true, enumerable: true, writable: true});
    app.duel.startCampaign({mode: 'duel', startStage: 2, car: 'falcone_f42', seed: 1989, opponentCount: 1});
    authoredAtCreation = app.duel.course.def === originalDefinition && app.duel.stageDef === originalDefinition &&
      app.duel.course.def.lightPath === initialPath;
    if (!authoredAtCreation) throw Error('Authored path was not present at native stage creation');
    app.duel.course.def = {...originalDefinition};
  } finally {
    if (originalPath) Object.defineProperty(originalDefinition, 'lightPath', originalPath);
    else delete originalDefinition.lightPath;
  }
  const restoredPath = Object.getOwnPropertyDescriptor(originalDefinition, 'lightPath');
  if (JSON.stringify(restoredPath) !== JSON.stringify(originalPath)) throw Error('Native catalog path descriptor did not restore');
  const state = app.duel.state, course = app.duel.course;
  if (course.def.id !== 'harbor-highlands') throw Error('Native harbor course missing');
  let grid = 250, busiest = -1;
  for (let s = 120; s < course.length * .31; s += 60) {
    const p = course.groundAt(s, 0);
    const count = course.features.buildings.filter(b => Math.hypot(b.x - p.x, b.z - p.z) < 160).length;
    if (count > busiest) { busiest = count;grid = s; }
  }
  Object.assign(state, {status: 'racing', countdown: 0, paused: false, s: grid, prevS: grid,
    lateral: -2.6, prevLateral: -2.6, speedMph: 0, traffic: [], knock: null,
    pushVelocity: 0, headingError: 0, slipAngle: 0, yawVelocity: 0});
  const prototype = structuredClone(state.rival);
  const nativeKeys = ['falcone_f42', 'stuttgart_959s', 'falcone_heritage', 'aurora_gt',
    'dusthawk_rally', 'banshee_muscle', 'viper_proto', 'titan_monster'];
  state.opponents = Array.from({length: 7}, (_, i) => {
    const row = Math.floor((i + 1) / 2), side = (i + 1) % 2 ? 1 : -1;
    return {...structuredClone(prototype), id: 'night-review-' + i, car: nativeKeys[i + 1],
      s: grid + row * 8, prevS: grid + row * 8, lateral: side * 2.6, prevLateral: side * 2.6,
      speedMph: 0, headingError: 0, pushVelocity: 0, knock: null, braking: false};
  });
  state.rival = state.opponents[0];
  state.police.pursuit = null;
  const at = course.groundAt(grid + 12, 0), heading = course.at(grid).heading;
  app.inspectionCamera = {position: [at.x - Math.sin(heading) * 43, at.y + 10,
    at.z - Math.cos(heading) * 43], target: [at.x, at.y + 1.4, at.z]};
  app.onFrame?.(state, 0);
  document.head.insertAdjacentHTML('beforeend', '<style>details,#race-hud,#modal-layer,.combat-opponent-marker{display:none!important}</style>');
  const fixedPath = look => Object.freeze({axis: 'race-progress', keyframes: Object.freeze([Object.freeze({at: 0, look})])});
  const review = window.__dayNightReview = {quality, grid, busiest, originalDefinition, nativeKeys, authoredAtCreation,
    profile: JSON.stringify(app.profile), state: null, scene: api.scene, legacyMaterials: null};
  review.setLook = look => {
    course.def = look === 'legacy' ? originalDefinition : {...originalDefinition, lightPath: fixedPath(look)};
    api.renderFrame();
  };
  review.witness = () => {
    api.camera.updateWorldMatrix(true, false);
    const cars = api.scene.children.filter(object => object.visible && nativeKeys.includes(object.userData.vehicleKey));
    if (cars.length !== 8) throw Error('Expected eight native visible models, got ' + cars.length);
    if (JSON.stringify(cars.map(car => car.userData.vehicleKey).sort()) !== JSON.stringify([...nativeKeys].sort()))
      throw Error('Native model set is incomplete, including the licensed pair');
    const poses = cars.map(car => {
      car.updateWorldMatrix(true, true);
      const center = car.getWorldPosition(car.position.clone());center.y += .8;center.project(api.camera);
      const visible = center.z >= -1 && center.z <= 1 && Math.abs(center.x) < .96 && Math.abs(center.y) < .96;
      if (!visible) throw Error('A native car is outside the camera view: ' + JSON.stringify(center));
      let lights = 0;car.traverse(item => { if (item.isLight) lights++; });
      if (lights) throw Error('An NPC/car adapter contains a real light');
      const head = [];
      car.traverse(item => { if (item.isMesh && /^(Headlamp lenses|Headlight)$/.test(item.material?.name)) head.push(item.material.emissiveIntensity); });
      const tails = (car.userData.brakeLights || []).map(lamp => lamp.material.emissiveIntensity);
      const rearGlow = car.getObjectByName('Night tail glow');
      const softGlowMeshes = rearGlow?.children.filter(mesh => mesh.isMesh && mesh.visible &&
        mesh.material?.transparent && mesh.material.uniforms?.strength?.value > 0).length || 0;
      return {key: car.userData.vehicleKey, position: car.position.toArray(), visible,
        headlights: head, tails, rearGlow: {visible: rearGlow?.visible === true, softGlowMeshes},
        cones: car.getObjectByName('Night headlight cones')?.visible === true};
    });
    const sky = api.scene.getObjectByName('Atmosphere and cloud deck');
    const nightGroup = api.scene.getObjectByName('Authored night details');
    const reflections = api.scene.getObjectByName('Road reflectors');
    const lampHeads = api.scene.getObjectByName('Night streetlamp heads');
    const lampPools = api.scene.getObjectByName('Night streetlamp road pools');
    const lampPoles = api.scene.getObjectByName('Night streetlamp poles');
    const lampArms = api.scene.getObjectByName('Night streetlamp arms');
    const viewport = api.renderer.domElement.getBoundingClientRect();
    const project = p => {
      const point = api.camera.position.clone().set(p.x, p.y, p.z).project(api.camera);
      return {pixel: [viewport.left + (point.x + 1) * viewport.width / 2,
        viewport.top + (1 - point.y) * viewport.height / 2],
        visible: point.z >= -1 && point.z <= 1 && Math.abs(point.x) < .98 && Math.abs(point.y) < .98};
    };
    const fixtureMatrices = [];
    if (lampHeads && lampPoles && lampArms && lampPools) for (let i = 0; i < lampHeads.count; i++) {
      const row = {};
      for (const [kind, batch] of [['head',lampHeads],['pole',lampPoles],['arm',lampArms],['pool',lampPools]]) {
        const matrix = batch.matrix.clone();batch.getMatrixAt(i, matrix);
        const position = api.camera.position.clone().setFromMatrixPosition(matrix).applyMatrix4(batch.matrixWorld);
        row[kind] = {matrix: matrix.toArray(), position: position.toArray(), ...project(position)};
      }
      const nearest = course.nearest(row.head.position[0], row.head.position[2], grid);
      row.side = nearest.lateral < 0 ? 'left' : 'right';row.ahead = nearest.s - grid;fixtureMatrices.push(row);
    }
    const markingMeshes = [];
    api.scene.traverse(mesh => {if (mesh.userData.roadMarking) markingMeshes.push({kind: mesh.userData.roadMarking,
      material: mesh.material.uuid, intensity: mesh.material.emissiveIntensity});});
    const markings50 = [];
    for (const side of [-1,1]) for (const kind of ['centre','edge']) {
      const offset = side * (kind === 'centre' ? .17 : course.roadHalfWidthAt(grid + 50) - .365);
      const paint = course.worldAt(grid + 50, offset), tarmac = course.worldAt(grid + 50, offset + side * (kind === 'centre' ? .8 : -.65));
      paint.y += kind === 'centre' ? .058 : .057;tarmac.y += .035;
      markings50.push({side,kind,metresAhead:50,paint:{position:[paint.x,paint.y,paint.z],...project(paint)},
        tarmac:{position:[tarmac.x,tarmac.y,tarmac.z],...project(tarmac)}});
    }
    const streetlamps = {
      heads: {count: lampHeads?.isInstancedMesh ? lampHeads.count : 0,
        visible: lampHeads?.visible === true && nightGroup?.visible === true,
        opacity: lampHeads?.material.opacity ?? 0, color: lampHeads?.material.color?.getHex() ?? null},
      poles: {count: lampPoles?.isInstancedMesh ? lampPoles.count : 0, visible: lampPoles?.visible === true && nightGroup?.visible === true},
      arms: {count: lampArms?.isInstancedMesh ? lampArms.count : 0, visible: lampArms?.visible === true && nightGroup?.visible === true},
      fixtureMatrices,
      pools: {count: lampPools?.isInstancedMesh ? lampPools.count : 0,
        visible: lampPools?.visible === true && nightGroup?.visible === true,
        transparent: lampPools?.material.transparent === true,
        strength: lampPools?.material.uniforms?.night?.value ?? 0},
    };
    const windows = [];
    api.scene.traverse(mesh => {
      if (mesh.isMesh && (mesh.userData.harborCell?.kind === 'windows' || /glazing|window/i.test(mesh.material?.name || '') ||
          mesh.material?.customProgramCacheKey?.().startsWith('city-room-parallax-v1')))
        windows.push({name: mesh.name, material: mesh.material.name, intensity: mesh.material.emissiveIntensity});
    });
    return {poses, streetlamps, markingMeshes, markings50, stars: sky.material.uniforms.stars?.value ?? null, moon: sky.material.uniforms.moon?.value ?? null,
      nightGroup: nightGroup?.visible === true, reflectors: reflections?.visible && nightGroup?.visible ? reflections.count : 0,
      windows, lightCount: api.scene.children.filter(item => item.isLight).length,
      viewport: [document.querySelector('#view3d').clientWidth, document.querySelector('#view3d').clientHeight],
      ratio: api.renderer.getPixelRatio(), scale: document.querySelector('#view3d').dataset.resolutionScale || '1'};
  };
  // Keep the preauthored definition until the real structural job completes.
  return {grid, busiest, seed: app.duel.seed, authoredAtCreation};
}

async function setup(context, quality) {
  await context.navigate('/tools/menu-check.html?harness=p4-daynight');
  await context.waitFor("!!window.__qaApp && !!window.__render && document.querySelector('#view3d')?.dataset.vehicleAsset==='ready'", 'native menu', 60000);
  const setup = await context.evaluate('(' + prepare.toString() + ')(' + JSON.stringify(quality) + ')');
  try {
    await context.waitFor(`(() => {
      const app=window.__qaApp,api=window.__render;api.renderFrame();app.onFrame?.(app.duel.state,0);
      return app.visualReady && document.querySelector('#renderer-loading')?.hidden &&
        document.querySelector('#view3d').dataset.warmupStatus==='ready' &&
        JSON.stringify(api.scene.children.filter(item=>item.visible&&window.__dayNightReview.nativeKeys.includes(item.userData.vehicleKey))
          .map(item=>item.userData.vehicleKey).sort())===JSON.stringify([...window.__dayNightReview.nativeKeys].sort());
    })()`, quality + ' eight native cars', 60000);
  } catch (error) {
    const diagnostic = await context.evaluate(`(() => {
      const app=window.__qaApp,api=window.__render;
      return {visualReady:app.visualReady,loadingHidden:document.querySelector('#renderer-loading')?.hidden,
        dataset:{...document.querySelector('#view3d').dataset}, status:app.duel.state.status,
        rival:app.duel.state.rival?.car,opponents:app.duel.state.opponents.map(actor=>actor.car),
        roots:api.scene.children.map(item=>({name:item.name,visible:item.visible,key:item.userData.vehicleKey}))};
    })()`);
    await writeFile(join(context.outputDir,'startup-diagnostic.json'),JSON.stringify(diagnostic,null,2)+'\n');
    throw error;
  }
  await context.evaluate(`(() => {
    const r=window.__dayNightReview,api=window.__render;
    r.warmupPrograms=api.renderer.info.programs.map(program=>({id:program.id,cacheKey:program.cacheKey,ready:program.isReady()}));
    if(!r.authoredAtCreation||!r.warmupPrograms.length||r.warmupPrograms.some(program=>!program.ready))
      throw Error('Actual authored scene programs are not ready');
    r.setLook('legacy');
    r.preTransitionPrograms=api.renderer.info.programs.map(program=>program.id);
    r.state=JSON.stringify(window.__qaApp.duel.state);
    r.legacyMaterials=[];
    api.scene.traverse(mesh=>{if(mesh.isMesh&&mesh.material?.emissive)r.legacyMaterials.push({mesh,material:mesh.material,intensity:mesh.material.emissiveIntensity});});
    r.legacySky=api.scene.getObjectByName('Atmosphere and cloud deck').material;
  })()`);
  return setup;
}

export function installMeasurement(quality, diagnose) {
  const app = window.__qaApp, api = window.__render, fixture = window.__dayNightReview;
  const gl = api.renderer.getContext(), ext = gl.getExtension('EXT_disjoint_timer_query_webgl2');
  const owner = quality === 'high' ? api.composer : api.composer.passes[0], originalDraw = owner.render;
  const originalDiagnostics = app.frameDiagnostics;
  const run = window.__dayNightFrames = {frames: [], cpu: [], gpu: [], rendererUpdate: [], updateAndSubmit: [], pending: [], seen: 0,
    active: false, done: false, disjoint: false, previous: null, before: fixture.witness(),
    gpuSupported: !!ext, scales: new Set(), ratios: new Set()};
  const poll = () => {
    if (!ext || run.disjoint) return;
    if (gl.getParameter(ext.GPU_DISJOINT_EXT)) {run.disjoint=true;return;}
    for (let i=run.pending.length-1;i>=0;i--) {
      const query=run.pending[i];
      if(!gl.getQueryParameter(query,gl.QUERY_RESULT_AVAILABLE))continue;
      run.gpu.push(gl.getQueryParameter(query,gl.QUERY_RESULT)/1e6);gl.deleteQuery(query);run.pending.splice(i,1);
    }
  };
  owner.render = function(...args) {
    poll();let query=null;
    if(run.active&&ext&&!run.disjoint&&run.pending.length<32&&!gl.getQuery(ext.TIME_ELAPSED_EXT,gl.CURRENT_QUERY)) {
      query=gl.createQuery();if(query)gl.beginQuery(ext.TIME_ELAPSED_EXT,query);
    }
    try{return originalDraw.apply(this,args);}
    finally{if(query){gl.endQuery(ext.TIME_ELAPSED_EXT);run.pending.push(query);}}
  };
  app.frameDiagnostics={active:true,now:()=>performance.now(),recordAppFrame(){},stop(){},
    recordRendererFrame(now,updateMs,submitMs){
      if(run.done)return;
      if(++run.seen<=120)return;
      run.active=true;
      if(run.previous!==null)run.frames.push(now-run.previous);
      run.previous=now;run.cpu.push(submitMs);
      // Native update includes lighting and other renderer preparation. These
      // writes occur after the measured phases but can affect later frames.
      if(diagnose){run.rendererUpdate.push(updateMs);run.updateAndSubmit.push(updateMs+submitMs);}
      run.scales.add(document.querySelector('#view3d').dataset.resolutionScale||'1');run.ratios.add(api.renderer.getPixelRatio());
      if(run.cpu.length>=360){run.active=false;run.done=true;run.after=fixture.witness();poll();}
    }};
  run.poll=poll;
  run.cleanup=()=>{owner.render=originalDraw;app.frameDiagnostics=originalDiagnostics;
    for(const query of run.pending)gl.deleteQuery(query);run.pending.length=0;};
}

export function summarizeFrameTiming(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  if (sorted.some(value => !Number.isFinite(value) || value < 0)) throw Error('Invalid timing value');
  const p95 = sorted[Math.ceil(sorted.length * .95) - 1];
  if (!(p95 > 0)) throw Error('Frame timings need a positive p95.');
  return {samples: sorted.length, p50: sorted[Math.ceil(sorted.length * .5) - 1], p95};
}

async function measure(context, quality, look, pair, diagnose) {
  await context.evaluate('window.__dayNightReview.setLook(' + JSON.stringify(look) + ')');
  await context.evaluate('(' + installMeasurement.toString() + ')(' + JSON.stringify(quality) + ',' + JSON.stringify(diagnose) + ')');
  try {
    await context.waitFor('window.__dayNightFrames.done', quality + ' ' + look + ' frame sample', 60000);
    await context.waitFor('(() => {const r=window.__dayNightFrames;r.poll();return r.pending.length===0||r.disjoint;})()', 'completed GPU timers', 10000);
    const row = await context.evaluate(`(() => {
      const r=window.__dayNightFrames;
      if(r.disjoint)throw Error('Disjoint GPU sample');
      if(JSON.stringify(r.before)!==JSON.stringify(r.after))throw Error('Frame view/model witness changed');
      return {frames:r.frames,cpu:r.cpu,gpu:r.gpu,rendererUpdate:r.rendererUpdate,updateAndSubmit:r.updateAndSubmit,gpuSupported:r.gpuSupported,
        before:r.before,scales:[...r.scales],ratios:[...r.ratios]};
    })()`);

    const pacing={delivered:summarizeFrameTiming(row.frames),cpu:summarizeFrameTiming(row.cpu),gpu:summarizeFrameTiming(row.gpu)};
    if(row.scales.length!==1||row.ratios.length!==1||!pacing.cpu||!pacing.delivered||pacing.cpu.samples!==360||pacing.delivered.samples<359||
        row.gpuSupported&&(!pacing.gpu||pacing.gpu.samples<288))throw Error('Incomplete or changing-resolution frame sample');
    const diagnostics=diagnose?{
      rendererUpdate:summarizeFrameTiming(row.rendererUpdate),
      updateAndSubmit:summarizeFrameTiming(row.updateAndSubmit),
      orderedSamples:{rendererUpdate:row.rendererUpdate,updateAndSubmit:row.updateAndSubmit,
        cpuSubmit:row.cpu,delivered:row.frames},
      gpuCompletionSamples:row.gpu,
    }:null;
    return {quality,look,pair,pacing,diagnostics,witness:row.before,scales:row.scales,ratios:row.ratios,gpuSupported:row.gpuSupported};
  } finally {await context.evaluate('window.__dayNightFrames.cleanup()');}
}

export async function run(context) {
  await context.command('Emulation.setDeviceMetricsOverride',{width:1280,height:800,deviceScaleFactor:1,mobile:false});
  const frames = process.env.P4_DAYNIGHT_MEASURE_FRAMES === '1';
  const diagnose = frames && process.env.P4_DAYNIGHT_DIAGNOSE_FRAMES === '1';
  const report={card:'P4-DAYNIGHT',captures:[],frames:[],comparisons:[],frameStatus:frames?'running':'not scheduled',passed:false};
  if(diagnose)report.diagnosis={deliveredDecisionLimitMs:20,order:['legacy','night'],
    scope:'Fixed scene and inspection camera; fixed night look, not moving blend or camera cost.',
    timingScope:'rendererUpdate includes lighting and all other native renderer preparation; updateAndSubmit sums each frame before percentile calculation.',
    observerEffect:'Additional array writes reuse existing clock readings and occur after measured phases; later RAF or collection pauses may still be affected. No overhead is subtracted.',
    decisionScope:'Kyle/Claude diagnostic routing only, not technical causal proof or a release floor. Original CPU/GPU/delivered 10% gate remains authoritative.',
    dispositions:[]};
  const persist=()=>writeFile(join(context.outputDir,'p4-daynight.json'),JSON.stringify(report,null,2)+'\n');
  try {
    for(const quality of ['high','performance']) {
      const initial=await setup(context,quality);
      for(const look of ['day','golden','dusk','night']) {
        await context.evaluate('window.__dayNightReview.setLook('+JSON.stringify(look)+')');
        await context.waitFor(`(() => {
          window.__render.renderFrame();
          const view=document.querySelector('#view3d');
          return view?.dataset.lightPath==='true' && view.dataset.rearView==='ready' && view.dataset.rearViewRefreshed==='true';
        })()`, 'native path and current rear-view frame', 20000);
        const witness=await context.evaluate('window.__dayNightReview.witness()');
        if(look==='night'&&(!witness.poses.every(car=>car.cones&&car.headlights.some(v=>v>0)&&car.tails.some(v=>v>0))||
            witness.stars!==1||witness.moon!==1||!witness.reflectors||!witness.windows.some(row=>row.intensity>0)))
          throw Error('Native night presentation incomplete: '+JSON.stringify(witness));
        if(look==='day'&&(witness.stars!==0||witness.moon!==0||witness.poses.some(car=>car.cones)))
          throw Error('Day view contains night extras');
        if(look==='dusk'||look==='night') {
          const {heads,pools}=witness.streetlamps;
          if(!(heads.count>0&&heads.count<=32&&heads.visible&&heads.opacity>0&&heads.color!==null&&
              pools.count===heads.count&&pools.visible&&pools.transparent&&pools.strength>0))
            throw Error('Native streetlamp batches incomplete: '+JSON.stringify(witness.streetlamps));
          if(!witness.poses.every(car=>car.rearGlow.visible&&car.rearGlow.softGlowMeshes>0))
            throw Error('Native rear glow incomplete: '+JSON.stringify(witness.poses));
          const {poles,arms,fixtureMatrices}=witness.streetlamps;
          if(poles.count!==heads.count||arms.count!==heads.count||!poles.visible||!arms.visible||
              !['left','right'].every(side=>fixtureMatrices.some(row=>row.side===side&&row.ahead>=0&&row.ahead<=120&&
                row.head.visible&&row.pole.visible&&row.arm.visible&&row.pool.visible)))
            throw Error('Supported lamps are not actually in view on both road sides');
          if(witness.markingMeshes.length!==4||witness.markings50.some(row=>!row.paint.visible||!row.tarmac.visible))
            throw Error('Actual native centre/edge marking points at 50 m are not visible');
        }
        const programs=await context.evaluate(`(() => {
          const r=window.__dayNightReview,programs=window.__render.renderer.info.programs;
          const inventory=programs.map(program=>({id:program.id,cacheKey:program.cacheKey,ready:program.isReady()}));
          if(inventory.some(program=>!program.ready))throw Error('A submitted native shader program is not ready');
          const warmed=new Set(r.warmupPrograms.map(program=>program.id));
          const baseline=new Set(r.preTransitionPrograms);
          return {warmup:r.warmupPrograms,current:inventory,added:inventory.filter(program=>!warmed.has(program.id)),
            afterInitialPreparation:inventory.filter(program=>!baseline.has(program.id))};
        })()`);
        if((look==='dusk'||look==='night')&&programs.afterInitialPreparation.length)
          throw Error('Night transition compiled programs after structural preparation: '+JSON.stringify(programs.afterInitialPreparation));
        const capture=await context.screenshot(quality+'-'+look);
        report.captures.push({quality,look,capture,...initial,witness,programs});await persist();
      }
      if(frames) for(const pair of diagnose?[1]:[1,2]) {
        for(const look of pair===1?['legacy','night']:['night','legacy']) {
          report.frames.push(await measure(context,quality,look,pair,diagnose));await persist();
        }
        const baseline=report.frames.find(row=>row.quality===quality&&row.pair===pair&&row.look==='legacy');
        const candidate=report.frames.find(row=>row.quality===quality&&row.pair===pair&&row.look==='night');
        for(const key of ['scales','ratios'])if(JSON.stringify(baseline[key])!==JSON.stringify(candidate[key]))throw Error('Matched frame '+key+' differs');
        if(JSON.stringify(baseline.witness.poses.map(car=>car.position))!==JSON.stringify(candidate.witness.poses.map(car=>car.position)))
          throw Error('Eight-car poses changed across the frame pair');
        const addedPercent={};
        for(const key of ['delivered','cpu','gpu'])addedPercent[key]=baseline.pacing[key]&&candidate.pacing[key]?
          (candidate.pacing[key].p95/baseline.pacing[key].p95-1)*100:null;
        const comparison={quality,pair,addedPercent};
        if(diagnose){
          comparison.diagnosticAddedPercent={};
          for(const key of ['rendererUpdate','updateAndSubmit']){
            const off=baseline.diagnostics[key],on=candidate.diagnostics[key];
            comparison.diagnosticAddedPercent[key]=off&&on&&off.p95>0?(on.p95/off.p95-1)*100:null;
          }
          const offMs=baseline.pacing.delivered.p95,onMs=candidate.pacing.delivered.p95;
          const offExceeds=offMs>report.diagnosis.deliveredDecisionLimitMs;
          const onExceeds=onMs>report.diagnosis.deliveredDecisionLimitMs;
          report.diagnosis.dispositions.push({quality,pair,offDeliveredP95Ms:offMs,onDeliveredP95Ms:onMs,
            offExceeds,onExceeds,classification:offExceeds&&onExceeds?'route-to-measurement-diagnosis':
              onExceeds?'route-to-feature-investigation':offExceeds?'off-only-exceeds-decision-limit':'neither-exceeds-decision-limit'});
        }
        report.comparisons.push(comparison);await persist();
      }
      await context.evaluate(`(() => {
        const r=window.__dayNightReview,api=window.__render;r.setLook('legacy');
        if(api.scene.getObjectByName('Atmosphere and cloud deck').material!==r.legacySky)throw Error('Legacy sky identity changed');
        for(const row of r.legacyMaterials)if(row.mesh.material!==row.material||row.material.emissiveIntensity!==row.intensity)
          throw Error('Legacy native material changed after path: '+row.material.name);
        if(JSON.stringify(window.__qaApp.duel.state)!==r.state||JSON.stringify(window.__qaApp.profile)!==r.profile)
          throw Error('Presentation changed native race state or profile');
        if(api.scene.getObjectByName('Authored night details')?.visible)throw Error('Legacy course inherited path-only details');
      })()`);
    }
    if(frames) {
      report.frameStatus=report.comparisons.some(row=>Object.values(row.addedPercent).some(value=>value>10))?'over budget':'passed';
      if(report.frameStatus!=='passed')throw Error('Day/night exceeds the existing 10 percent frame-cost limit');
    }
    report.passed=true;
  } finally {await persist();}
  console.log('P4-DAYNIGHT: eight native cars, four looks, both presets; frame status '+report.frameStatus+'.');
}
