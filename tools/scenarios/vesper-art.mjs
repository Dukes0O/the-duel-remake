// Private Vesper fit review in the actual game world, lighting and renderer.
// Original crew comparison positions are declared QA fixtures, not new gameplay.
import assert from 'node:assert/strict';
import {readFile, writeFile} from 'node:fs/promises';
import {join, resolve, relative, isAbsolute} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {build} from 'vite';
const root = resolve(fileURLToPath(new URL('../../', import.meta.url)));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const candidateSha = '29a3873ae936dcd80ca6593d46537ce77cccda206a645e8948c06ea89a9a4f46';
async function nativeBundle() {
  const entry = join(root, '.qa-dist/vesper-comparison.virtual.js').replaceAll('\\', '/');
  const module = join(root, 'src/rigged-fighter.js').replaceAll('\\', '/');
  const diagnostics = join(root, 'src/phase-diagnostics.js').replaceAll('\\', '/');
  const result = await build({root, configFile: false, logLevel: 'silent', plugins: [{
    name: 'private-production-crew-pool',
    resolveId(id) {if (id.replaceAll('\\', '/') === entry) return '\0vesper-comparison';},
    load(id) {if (id === '\0vesper-comparison') return `export {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js'; export {createRiggedFighterFigures} from ${JSON.stringify(module)}; export {createPhaseDiagnostics} from ${JSON.stringify(diagnostics)};`;},
  }], build: {write: false, minify: false,
    lib: {entry, name: 'VesperComparison', formats: ['iife']}}});
  return (Array.isArray(result) ? result[0] : result).output.find(row => row.type === 'chunk').code;
}
async function measureFrames(context, candidateBytes, assets, bundle) {
  const report = {card: 'ART-FIT-CREW-W', mode: 'stationary twelve-fighter paired frame measurement',
    observationCommit: execFileSync('git', ['rev-parse', 'HEAD'], {cwd: root, encoding: 'utf8'}).trim(),
    fixture: 'Fresh Odessa/Vesper/Odessa actual App/Duel pages per quality; eleven staged raiders plus the local fighter, fixed near-detail poses, production renderer/world/camera. Only the fetched Odessa model bytes differ.',
    clock: 'All 180 consecutive real requestAnimationFrame intervals, with the production renderer RAF active. CPU submission is separate, not GPU time.',
    frames: [], comparisons: [], limits: ['Stationary worst-case presentation only; moving gameplay, motion feel and sound are not assessed.',
      'Frame evidence does not approve the art, install Vesper, reveal her or clear the held shared Blender registration.']};
  const persist = () => writeFile(join(context.outputDir, 'vesper-frames.json'), JSON.stringify(report, null, 2) + '\n');
  const originalBytes = await readFile(join(root, assets.odessa.path));
  let stateHash;
  try {
    for (const quality of ['high', 'performance']) {
      for (const phase of ['odessa-a1', 'vesper-b', 'odessa-a2']) {
        const bytes = phase === 'vesper-b' ? candidateBytes : originalBytes;
        await context.command('Emulation.setDeviceMetricsOverride', {width: 1280, height: 800, deviceScaleFactor: 1, mobile: false});
        await context.navigate('/tools/menu-check.html?flags=wasteland2&vesper-frames=' + quality + '-' + phase);
        await context.waitFor('window.__qaApp?.visualReady && !!window.__render', quality + ' ' + phase + ' actual game ready', 60000);
        await context.evaluate(bundle);
        await context.evaluate(`(() => {
          const app=window.__qaApp,view=window.__render;
          if(!Object.getOwnPropertyDescriptor(window,'localStorage')?.value || !window.name.startsWith('__duel_qa_tab_v2:'))
            throw Error('Memory-only Vesper measurement required');
          app.stop();app.audio.setMuted(true);app.setGraphicsQuality('${quality}');
          const originalFetch=window.fetch.bind(window),bytes=Uint8Array.from(atob(${JSON.stringify(bytes.toString('base64'))}),c=>c.charCodeAt(0));
          window.__vesperFrames={originalFetch,substitutions:0};
          window.fetch=(input,init)=>{
            const url=new URL(typeof input==='string'?input:input?.url||String(input),location.href);
            if(url.origin===location.origin&&url.pathname==='/assets/models/wasteland/crew/odessa.glb'){
              window.__vesperFrames.substitutions++;
              return Promise.resolve(new Response(bytes,{status:200,headers:{'Content-Type':'model/gltf-binary'}}));
            }
            return originalFetch(input,init);
          };
          app.duel.startCampaign({mode:'wasteland',car:'banshee_muscle',seed:1989,discoveredGate:true,crewId:'odessa'});
          const state=app.duel.state;
          Object.assign(state,{status:'racing',countdown:0,paused:false,s:500,prevS:500,speedMph:0,traffic:[],opponents:[],stageTimeSec:10});
          state.raids=null;state.combat.aiTimer=state.combat.pickupTimer=Infinity;state.input.interact=true;
          for(let i=0;i<50&&!state.onFoot;i++)app.duel.step(1/120);
          if(!state.onFoot||state.fighter.crewId!=='odessa')throw Error('Actual production exit failed');
          state.input.interact=false;state.fighter.presentation=null;state.fighterInput={};state.stageTimeSec=10;
          const at=app.duel.course.groundAt(500,8);
          const poses=Array.from({length:12},(_,i)=>{
            const x=at.x+(i%4-1.5)*2.1,z=at.z+(Math.floor(i/4)-1)*2.3;
            const nearest=app.duel.course.nearest(x,z,500),ground=app.duel.course.groundAt(nearest.s,nearest.lateral);
            return {x,y:ground.y,z,s:nearest.s,lateral:nearest.lateral,yaw:0,groundY:ground.y,speed:0,crewId:'odessa'};
          });
          Object.assign(state.fighter,poses[11]);
          state.raids={zones:[{warning:{x:at.x+10000,y:at.y,z:at.z,heading:0},salvage:null,raiders:poses.slice(0,11)}]};
          app._footCameraMode='overhead';app.inspectionCamera={position:[at.x,at.y+6,at.z+16],target:[at.x,at.y+1,at.z]};
          app.onFrame?.(state);view.renderFrame();
          for(const panel of document.querySelectorAll('details'))panel.hidden=true;
        })()`);
        await context.waitFor(`(() => {
          const app=window.__qaApp,view=window.__render;app.onFrame?.(app.duel.state);view.renderFrame();
          const pool=view.scene.getObjectByName('Rigged on-foot fighters');
          return app.visualReady&&pool?.userData.crews.odessa==='ready'&&document.querySelector('#renderer-loading')?.hidden;
        })()`, quality + ' ' + phase + ' model and production warmup ready', 60000);
        // Asset decoding, cloning and first program compilation happen before samples.
        await context.evaluate('new Promise(done=>{let frames=0;function warm(){if(++frames<90)requestAnimationFrame(warm);else done(true);}requestAnimationFrame(warm);})');
        const result = await context.evaluate(`new Promise((resolve,reject)=>{
          const app=window.__qaApp,view=window.__render,q=window.__vesperFrames;
          const before=JSON.stringify(app.duel.state),rows=[];let prior;
          const diagnostics=app.frameDiagnostics=VesperComparison.createPhaseDiagnostics({capacity:180});
          const visible=node=>{for(let p=node;p;p=p.parent)if(!p.visible)return false;return true;};
          function witness(){
            const pool=view.scene.getObjectByName('Rigged on-foot fighters'),figures=[];
            for(const figure of pool.children){
              if(!figure.userData.crewId||!visible(figure))continue;
              const skins=[];figure.traverse(mesh=>{if(mesh.isSkinnedMesh&&visible(mesh))skins.push(mesh);});
              const screen=figure.position.clone();screen.y+=1;screen.project(view.camera);
              figures.push({detail:figure.userData.detail,clip:figure.userData.clip,skins:skins.length,
                triangles:skins.reduce((sum,mesh)=>sum+(mesh.geometry.index?.count??mesh.geometry.attributes.position.count)/3,0),
                inCamera:Math.abs(screen.x)<1&&Math.abs(screen.y)<1&&screen.z>=-1&&screen.z<=1});
            }
            if(figures.length!==12||figures.some(f=>f.detail!=='near'||f.skins!==1||!f.inCamera)||q.substitutions!==1||pool.userData.loadErrors.length)
              throw Error('Actual twelve near-detail fighter fixture/load failed');
            return {figures,draws:view.renderer.info.render.calls,triangles:view.renderer.info.render.triangles,
              renderSize:{width:view.renderer.domElement.width,height:view.renderer.domElement.height,pixelRatio:view.renderer.getPixelRatio()},
              quality:app.ambientOcclusionEnabled?'high':'performance',dpr:devicePixelRatio,substitutions:q.substitutions,
              camera:{position:view.camera.position.toArray(),target:app.inspectionCamera.target},hidden:document.hidden};
          }
          const first=witness();
          function next(now){try{
            if(document.hidden)throw Error('Frame measurement page became hidden');
            if(prior===undefined)diagnostics.start({afterTimestamp:now});else rows.push(now-prior);
            prior=now;
            if(rows.length<180)return requestAnimationFrame(next);
            diagnostics.stop();const last=witness();
            if(JSON.stringify(app.duel.state)!==before)throw Error('RAF rendering changed whole Duel state');
            if(JSON.stringify(first)!==JSON.stringify(last))throw Error('Measured fixture/counters/resolution changed during sample');
            resolve({intervalsMs:rows,cpu:diagnostics.summary(),...last,stateJson:before,stateUnchanged:true});
          }catch(error){diagnostics.stop();reject(error);}}
          requestAnimationFrame(next);
        })`);
        const actualHash = sha(Buffer.from(result.stateJson));
        stateHash ??= actualHash;
        assert.equal(actualHash, stateHash, 'Every paired page must use the same complete Duel state');
        delete result.stateJson;
        const sorted = [...result.intervalsMs].sort((a,b)=>a-b);
        const frame = {quality,phase,modelSha256:sha(bytes),modelBytes:bytes.length,stateSha256:actualHash,...result,
          samples:sorted.length,meanMs:result.intervalsMs.reduce((sum,v)=>sum+v,0)/sorted.length,
          p50Ms:sorted[Math.ceil(sorted.length*.5)-1],p95Ms:sorted[Math.ceil(sorted.length*.95)-1],maxMs:sorted.at(-1),
          over33Ms:result.intervalsMs.filter(value=>value>33).length};
        report.frames.push(frame);await persist();
        await context.screenshot('vesper-frames-' + quality + '-' + phase);
      }
      const [a1,b,a2]=report.frames.filter(row=>row.quality===quality);
      const comparison={quality,baselineMeanDrift:Math.abs(a2.meanMs/a1.meanMs-1),baselineP95Drift:Math.abs(a2.p95Ms/a1.p95Ms-1),
        candidateMeanRatio:b.meanMs/Math.min(a1.meanMs,a2.meanMs),candidateP95Ratio:b.p95Ms/Math.min(a1.p95Ms,a2.p95Ms)};
      report.comparisons.push(comparison);await persist();
      assert(comparison.baselineMeanDrift<=.10&&comparison.baselineP95Drift<=.10,quality+' baseline drifts beyond 10%; frame result inconclusive');
      assert(comparison.candidateMeanRatio<=1.10&&comparison.candidateP95Ratio<=1.10,quality+' candidate exceeds paired baseline +10%');
    }
    report.passed=true;
  }catch(error){report.passed=false;report.failure=error.stack;throw error;}finally{await persist();}
}
export async function run(context) {
  const candidate = resolve(process.env.VESPER_ART_ASSET || join(root, '.evidence/vesper-round2/candidate/vesper.glb'));
  const local = relative(root, candidate);
  assert(!isAbsolute(local) && !local.startsWith('..') && /^\.evidence[\\/]/.test(local));
  const bytes = await readFile(candidate); assert.equal(sha(bytes), candidateSha);
  const assets = {};
  for (const id of ['nell', 'odessa', 'wren']) assets[id] = {
    path: 'public/assets/models/wasteland/crew/' + id + '.glb',
    sha256: sha(await readFile(join(root, 'public/assets/models/wasteland/crew/' + id + '.glb'))),
  };
  assert.equal(assets.odessa.sha256, '364de3fd43de474eb4ef0fd12b859940f067549b02f2922b432d3a0c422170ca');
  const bundle = await nativeBundle();
  if (process.env.VESPER_MEASURE_FRAMES === '1') return measureFrames(context, bytes, assets, bundle);
  const report = {card: 'ART-FIT-CREW-W', subject: 'Private Vesper costume fit',
    observationCommit: execFileSync('git', ['rev-parse', 'HEAD'], {cwd: root, encoding: 'utf8'}).trim(),
    candidate: {path: candidate, sha256: candidateSha, bytes: bytes.length}, assets,
    fixture: 'Actual App/Duel exit, private Odessa fetch substitution, production original-crew comparison pool; normal world, lights, fog and HUD remain.',
    captures: [], cleanup: [], limits: ['No roster install, Vesper reveal, gameplay, audio or art approval.',
      'Render counters are actual counts, not frame-time measurements.']};
  const persist = () => writeFile(join(context.outputDir, 'vesper-comparison.json'), JSON.stringify(report, null, 2) + '\n');
  for (const quality of ['high', 'performance']) {
    await context.command('Emulation.setDeviceMetricsOverride', {width: 1280, height: 800, deviceScaleFactor: 1, mobile: false});
    await context.navigate('/tools/menu-check.html?flags=wasteland2');
    await context.waitFor('window.__qaApp?.visualReady && !!window.__render', 'private Vesper game ready', 60000);
    await context.evaluate(bundle);
    await context.evaluate(`(() => {
      const app = window.__qaApp, view = window.__render;
      if (!Object.getOwnPropertyDescriptor(window, 'localStorage')?.value || !window.name.startsWith('__duel_qa_tab_v2:'))
        throw Error('Memory-only Vesper review required');
      app.stop(); app.audio.setMuted(true); app.setGraphicsQuality('${quality}');
      const originalFetch = window.fetch.bind(window);
      const bytes = Uint8Array.from(atob(${JSON.stringify(bytes.toString('base64'))}), char => char.charCodeAt(0));
      window.__vesperReview = {originalFetch, substitutions: 0};
      window.fetch = (input, init) => {
        const url = new URL(typeof input === 'string' ? input : input?.url || String(input), location.href);
        if (url.origin === location.origin && url.pathname === '/assets/models/wasteland/crew/odessa.glb') {
          window.__vesperReview.substitutions++;
          return Promise.resolve(new Response(bytes, {status: 200, headers: {'Content-Type': 'model/gltf-binary'}}));
        }
        return originalFetch(input, init);
      };
      app.duel.startCampaign({mode: 'wasteland', car: 'banshee_muscle', seed: 1989, discoveredGate: true, crewId: 'odessa'});
      const state = app.duel.state;
      Object.assign(state, {status: 'racing', countdown: 0, paused: false, s: 500, prevS: 500, speedMph: 0,
        traffic: [], opponents: [], stageTimeSec: 10});
      state.raids = null; state.combat.aiTimer = state.combat.pickupTimer = Infinity;
      state.input.interact = true;
      for (let i = 0; i < 50 && !state.onFoot; i++) app.duel.step(1/120);
      if (!state.onFoot || state.fighter.crewId !== 'odessa') throw Error('Actual production exit failed');
      state.input.interact = false; state.fighter.presentation = null;
      app._footCameraMode = 'overhead'; app.onFrame?.(state); view.renderFrame();
      for (const panel of document.querySelectorAll('details'))
        if (panel.querySelector('summary')?.textContent.includes('TEMPORARY SAVES') || panel.querySelector('summary')?.textContent.startsWith('Performance samples')) panel.hidden = true;
    })()`);
    await context.waitFor(`(() => {const app=window.__qaApp;app.onFrame?.(app.duel.state);window.__render.renderFrame();
      return app.visualReady && window.__render.scene.getObjectByName('Rigged on-foot fighters')?.userData.crews.odessa === 'ready';})()`,
    quality + ' actual candidate rig loaded', 60000);
    await context.evaluate(`(async () => {
      const q = window.__vesperReview, app = window.__qaApp, state = app.duel.state, view = window.__render;
      const at = app.duel.course.groundAt(500, 8);
      // Four native skins in a grounded row beside, not inside, the parked car.
      const groundPose = x => {
        const near=app.duel.course.nearest(x,at.z,500),ground=app.duel.course.groundAt(near.s,near.lateral);
        return {x,y:ground.y,z:at.z,s:near.s,lateral:near.lateral,yaw:0,groundY:ground.y,speed:0};
      };
      Object.assign(state.fighter, groundPose(at.x-3.45));
      state.stageTimeSec = 10; state.fighterInput = {};
      q.center = at; q.local = view.scene.getObjectByName('Rigged on-foot fighters');
      q.pool = VesperComparison.createRiggedFighterFigures({loadAsset: async id => {
        const response = await q.originalFetch('/assets/models/wasteland/crew/' + id + '.glb');
        if (!response.ok) throw Error('Original comparison crew load failed: ' + id);
        return new VesperComparison.GLTFLoader().parseAsync(await response.arrayBuffer(), '');
      }});
      q.pool.group.name = 'Vesper original women comparison'; view.scene.add(q.pool.group);
      q.entries = ['nell', 'odessa', 'wren'].map((id, index) => ({fighter: {
        ...groundPose(at.x+(index-.5)*2.3),crewId:id}}));
      q.update = () => q.pool.update(q.entries, {active: true, enabled: true, time: state.stageTimeSec, cameraPosition: view.camera.position});
      q.update();
      q.paint = () => {
        const before = JSON.stringify(state); q.update(); app.onFrame?.(state); view.renderFrame();
        if (JSON.stringify(state) !== before) throw Error('Vesper draw mutated whole Duel state');
      };
      q.paint();
    })()`);
    await context.waitFor(`(() => {const q=window.__vesperReview;q.paint();return ['nell','odessa','wren'].every(id=>q.pool.group.userData.crews[id]==='ready');})()`,
      quality + ' original crew loaded beside Vesper', 60000);
    for (const mode of ['front', 'side', 'back', 'overhead', 'walk']) {
      const capture = await context.evaluate(`(() => {
        const q=window.__vesperReview,app=window.__qaApp,state=app.duel.state,view=window.__render;
        const mode='${mode}',at=q.center;
        // Matched pose rotations keep four distinct profiles visible in one row.
        const yaw=mode==='side'?Math.PI/2:mode==='back'?Math.PI:0;
        state.fighter.yaw=yaw;for(const entry of q.entries)entry.fighter.yaw=yaw;
        if (mode === 'overhead' || mode === 'walk') delete app.inspectionCamera;
        else app.inspectionCamera={position:[at.x,at.y+2.7,at.z+10],target:[at.x,at.y+1,at.z]};
        if (mode === 'walk') {
          state.fighterInput={forward:true}; for(let i=0;i<24;i++)app.duel.step(1/120);
          if (!(state.fighter.speed > .01)) throw Error('Actual walking input did not move candidate');
        }
        q.paint();q.paint();
        const visible = node => {for(let p=node;p;p=p.parent)if(!p.visible)return false;return true;};
        const figures=[];
        for(const group of [q.local,q.pool.group]) for(const figure of group.children) {
          if (!figure.visible || !figure.userData.crewId) continue;
          const meshes=[];figure.traverse(mesh=>{if(mesh.isMesh&&visible(mesh))meshes.push(mesh);});
          figures.push({subject:group===q.local?'vesper':figure.userData.crewId,
            crewSlot:figure.userData.crewId,clip:figure.userData.clip,detail:figure.userData.detail,
            draws:meshes.length,triangles:meshes.reduce((sum,mesh)=>sum+(mesh.geometry.index?.count??mesh.geometry.attributes.position.count)/3,0)});
        }
        const candidate=figures.find(row=>row.subject==='vesper');
        if (!candidate || candidate.draws!==1 || candidate.triangles>6500) throw Error('Candidate native skin budget failed');
        if (mode==='walk'&&candidate.clip!=='walk') throw Error('Actual native walk clip did not play');
        if (figures.length!==4 || q.substitutions!==1 || q.local.userData.loadErrors.length || q.pool.group.userData.loadErrors.length)
          throw Error('Actual four-figure comparison/load failed');
        return {mode,figures,substitutions:q.substitutions,worldDraws:view.renderer.info.render.calls,
          worldTriangles:view.renderer.info.render.triangles,camera:app.inspectionCamera||'production on-foot overhead',stateUnchanged:true};
      })()`);
      const name='vesper-'+mode+'-'+quality; await context.screenshot(name);
      report.captures.push({quality,name,...capture}); await persist();
    }
    const cleanup=await context.evaluate(`(async () => {
      const q=window.__vesperReview,app=window.__qaApp,before=JSON.stringify(app.duel.state);
      const resources=new Set(),counts=new Map();
      q.pool.group.traverse(node=>{
        if(node.geometry)resources.add(node.geometry);if(node.skeleton)resources.add(node.skeleton);
        for(const material of [].concat(node.material||[])){
          resources.add(material);for(const value of Object.values(material))if(value?.isTexture)resources.add(value);
        }
      });
      for(const resource of resources){
        counts.set(resource,0);
        if(resource.addEventListener)resource.addEventListener('dispose',()=>counts.set(resource,counts.get(resource)+1));
        else {const nativeDispose=resource.dispose.bind(resource);resource.dispose=()=>{counts.set(resource,counts.get(resource)+1);return nativeDispose();};}
      }
      q.pool.dispose();q.pool.dispose();window.fetch=q.originalFetch;
      if(q.pool.group.parent||q.pool.group.children.length||!resources.size||[...counts.values()].some(count=>count!==1))
        throw Error('Owned native comparison resources did not retire exactly once');
      if(JSON.stringify(app.duel.state)!==before)throw Error('Cleanup changed Duel state');
      return {originalCrewRetired:true,resourcesDisposedOnce:resources.size,fetchRestored:true,stateUnchanged:true,
        candidateLifecycle:'Native tests cover resources; this game page is retired by normal navigation.'};
    })()`);
    await context.navigate('/tools/menu-check.html?flags=wasteland2&vesper-page-retired=1');
    await context.waitFor('window.__qaApp?.visualReady && !window.__vesperReview', quality+' candidate page retired',60000);
    report.cleanup.push({quality,...cleanup,pageRetiredByNavigation:true});await persist();
  }
  assert.equal(report.captures.length,10); report.passed=true;await persist();
}
