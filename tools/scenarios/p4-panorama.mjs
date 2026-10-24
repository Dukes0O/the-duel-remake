// Native memory-only Panorama: approved scenery, genuine eight-car race and sunset.
import {writeFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {build} from 'vite';
const root=resolve(fileURLToPath(new URL('../../',import.meta.url)));
export async function nativeBundle() {
  const entry = join(root, '.qa-dist/panorama.virtual.js').replaceAll('\\', '/');
  const source = id => JSON.stringify(join(root, id).replaceAll('\\', '/'));
  const result = await build({
    root, configFile: false, logLevel: 'silent', define: {__DUEL_QA__: 'true'},
    plugins: [{
      // src/circuit-manifests.js ends in a top-level await. In this single-chunk helper bundle that makes
      // config.js and combat-weapons.js wait for it, and combat-weapons.js and arsenal/oil.js import each
      // other, so each waits for the other and the bundle never finishes loading ("Runtime.evaluate timed
      // out"). Vite resolves the course files at build time here, so read them without the await.
      name: 'panorama-synchronous-circuits',
      enforce: 'pre',
      transform(code, id) {
        if (!id.replaceAll('\\', '/').endsWith('/src/circuit-manifests.js')) return null;
        const wait = 'export const CIRCUIT_ENTRIES = registerCircuits(await modulesFromFiles());';
        if (!code.includes(wait)) throw Error('Native helper bundle: circuit-manifests.js changed; update the synchronous course read.');
        return {code: code.replace(wait, "export const CIRCUIT_ENTRIES = registerCircuits(Object.values(import.meta.glob(['./circuits/*.js', '!./circuits/index.js'], {eager: true})));"), map: null};
      },
    }, {
      name: 'panorama-private',
      resolveId(id) {
        if (id.replaceAll('\\', '/') === entry) return '\0panorama';
      },
      load(id) {
        if (id !== '\0panorama') return;
        return 'import {useRacingLine} from ' + source('tools/track-script-drive.mjs') +
          ';import {ownTestCourses} from ' + source('tools/career-fixture.mjs') +
          ';import {sampleCourseLightPath} from ' + source('src/light-path.js') +
          ';import {renderedGroundHeight} from ' + source('src/rendered-ground.js') +
          ';import {sweepObstacle} from ' + source('src/collision.js') +
          ';import {sceneryIdentity} from ' + source('src/destructibles.js') +
          ';import {offroadCapability} from ' + source('src/offroad-physics.js') +
          ';globalThis.__panQa={useRacingLine,ownTestCourses,sampleCourseLightPath,renderedGroundHeight,sweepObstacle,sceneryIdentity,offroadCapability};';
      },
    }],
    build: {write: false, emptyOutDir: false, minify: false,
      lib: {entry, formats: ['es']}, rolldownOptions: {output: {codeSplitting: false}}},
  });
  const output = (Array.isArray(result) ? result[0] : result).output;
  const chunk = output.find(row => row.type === 'chunk');
  if (!chunk) throw Error('Native helper bundle missing');
  return '(async()=>{'+chunk.code+'})()';
}

export async function run(context) {
  const report={passed:false,qualities:[],captures:[]};
  const bundle=await nativeBundle();
  const persist=()=>writeFile(join(context.outputDir,'p4-panorama.json'),JSON.stringify(report,null,2)+'\n');
  await context.command('Emulation.setDeviceMetricsOverride',{width:1280,height:720,deviceScaleFactor:1,mobile:false});
  try {
    for(const quality of ['high','performance']) {
      await context.navigate('/tools/menu-check.html?flags=grand-prix,panorama-ridge');
      await context.waitFor('window.__qaApp?.visualReady && !!window.__render','memory-only menu',60000);
      await context.evaluate(bundle);
      const setup=await context.evaluate('(async()=>{'+
        'const {ownTestCourses,useRacingLine}=window.__panQa;'+
        'const app=window.__qaApp;'+
        'if(!Object.getOwnPropertyDescriptor(window,"localStorage")?.value||!window.name.startsWith("__duel_qa_tab_v2:"))throw Error("Memory-only QA required");'+
        'ownTestCourses(app);app.audio.setMuted(true);app.setGraphicsQuality('+JSON.stringify(quality)+');'+
        'const stage=[...document.querySelector("#scene-select").options].map(o=>Number(o.value)).find(i=>app.getMenuCourse(i)?.def.id==="panorama-ridge");'+
        'if(stage<0||!app.startCampaign({mode:"grandprix",startStage:stage,car:"stuttgart_959s",seed:1989,fieldSeed:1000,cpuDifficulty:"medium",difficulty:"casual"}))throw Error("Native Panorama start rejected");'+
        'app.stop();app.autopilot=true;app._scriptedCrashDone=true;useRacingLine(app,.95);app.onFrame?.(app.duel.state,0);'+
        // Let all native cars finish rather than stopping on the player's line.
        'app.duel.state.field.deferFinish=true;'+
        'document.head.insertAdjacentHTML("beforeend","<style>details,#overlay,.rear-view-frame{display:none!important}</style>");const d=app.duel,s=d.state;'+
        'if(s.opponents.length!==7||s.lapsTotal!==3||s.traffic.length||d.course.features.radarTraps.length||s.police.pursuit)throw Error("Pure eight-car grid missing");'+
        'window.__panoramaProfile=JSON.stringify(app.profile);'+
        'window.__panoramaView=(name)=>{const c=d.course;const p=c.script.pieces.find(p=>p.name===name);if(!p)throw Error("Missing named piece "+name);const t=c.groundAt((p.s0+p.s1)/2,0),e=c.groundAt(p.s0,-30),y=window.__panQa.renderedGroundHeight(c,{...e,s:p.s0,off:-30},{requireSurface:true});if(!Number.isFinite(y))throw Error("Missing grid camera terrain");app.inspectionCamera={position:[e.x,y+18,e.z],target:[t.x,t.y+2,t.z]};window.__render.renderFrame();};'+
        'return {id:d.course.def.id,name:d.course.def.name,length:d.course.length,placements:d.course.def.kitPlacements.length,pit:!!d.course.pitLane,field:s.opponents.map(r=>({name:r.name,car:r.car})),corners:d.course.script.pieces.filter(p=>p.kind==="turn").map(p=>({name:p.name,s:p.s0}))};})()');
      await context.waitFor('(()=>{window.__render.renderFrame();return window.__qaApp.visualReady && document.querySelector("#view3d").dataset.trackKitAsset==="ready";})()',quality+' full native scene',90000);
      const witness=await context.evaluate('(()=>{const a=window.__qaApp,v=window.__render,s=a.duel.state,before=JSON.stringify(s);v.renderFrame();const kits=v.scene.getObjectByName("Approved track kits"),landmarks=v.scene.getObjectByName("Authored circuit landmarks");if(!kits?.children.length||!landmarks?.getObjectByName("ridge-radio")||!landmarks?.getObjectByName("pit-timing"))throw Error("Real circuit structures missing");let decoded=0;const textures=new Set();kits.traverse(n=>{if(n.isMesh)for(const m of [].concat(n.material||[]))for(const t of Object.values(m))if(t?.isTexture)textures.add(t);});for(const t of textures){if(!t.image?.width||!t.image?.height)throw Error("Approved texture failed to decode");decoded++;}if(!decoded||JSON.stringify(s)!==before||JSON.stringify(a.profile)!==window.__panoramaProfile)throw Error("Scenery mutated native race/profile");return {textures:decoded,kits:kits.children.length,landmarks:landmarks.children.length,programs:v.renderer.info.programs.length};})()');
      async function capture(name,phase){
        await context.evaluate('(()=>{const a=window.__qaApp,d=a.duel,s=d.state,c=d.course;'+
          'if('+JSON.stringify(phase)+'==="golden-grid")window.__panoramaView("Pit Straight");else if('+JSON.stringify(name)+'==="Skyline"||('+JSON.stringify(phase)+'==="dusk"&&'+JSON.stringify(name)+'==="Conrod Straight")){'+
          // Skyline: valley side, 96 m before the crest, 45 m out and 50 m up (about 100 m from the radio mast),
          // looking down the ridge so the road, the drop and the lower town share the frame.
          // Conrod: 129 m down the straight, 30 m above the road, looking at the town on its hillside.
          'const skyline=c.script.pieces.find(p=>p.name==="Skyline"),conrod=c.script.pieces.find(p=>p.name==="Conrod Straight"),isSkyline='+JSON.stringify(name)+'==="Skyline",'+
          's=isSkyline?skyline.s0-96:conrod.s0+129,off=isSkyline?45:-10,rise=isSkyline?50:30,ts=isSkyline?skyline.s0+254:conrod.s0+276,toff=isSkyline?40:112,tlift=isSkyline?0:10,'+
          'e=c.groundAt(s,off),t=c.groundAt(ts,toff),height=window.__panQa.renderedGroundHeight(c,{...e,s,off},{requireSurface:true}),targetHeight=window.__panQa.renderedGroundHeight(c,{...t,s:ts,off:toff},{requireSurface:true});'+
          'if(!Number.isFinite(height)||!Number.isFinite(targetHeight))throw Error("Missing actual valley camera/target terrain");'+
          'if(isSkyline){const mast=window.__render.scene.getObjectByName("Authored circuit landmarks")?.getObjectByName("ridge-radio");if(!mast||Math.hypot(e.x-mast.position.x,e.z-mast.position.z)<15)throw Error("Skyline camera must stay 15 m clear of the radio mast");}'+
          'a.inspectionCamera={position:[e.x,height+rise,e.z],target:[t.x,targetHeight+tlift,t.z]};}else {'+
          'const e=c.groundAt(s.s-40,-16),t=c.groundAt(s.s+20,0),height=window.__panQa.renderedGroundHeight(c,{...e,s:s.s-40,off:-16},{requireSurface:true});if(!Number.isFinite(height))throw Error("Inspection camera has no drawn ground");a.inspectionCamera={position:[e.x,height+18,e.z],target:[t.x,t.y+1.5,t.z]};}'+
          'window.__render.renderFrame();})()');
        await context.waitFor('(()=>{const a=window.__qaApp,c=window.__render.camera,p=a.inspectionCamera.position;return Math.hypot(c.position.x-p[0],c.position.y-p[1],c.position.z-p[2])<.001;})()','native inspection camera reaches drawn-ground view',10000);
        const meta=await context.evaluate('(()=>{const a=window.__qaApp,d=a.duel,s=d.state,c=d.course;'+
          'const before=JSON.stringify(s);window.__render.renderFrame();if(JSON.stringify(s)!==before)throw Error("Capture changed native race");'+
          'const distance=s.completedLaps*c.length+c.phase(s.s);const light=window.__panQa.sampleCourseLightPath(c,{distance});'+
          'const cars=window.__render.scene.children.filter(o=>o.visible&&o.userData.vehicleKey);'+
          'const road=c.groundAt(s.s,0),ground=window.__panQa.renderedGroundHeight(c,{...road,s:s.s,off:0},{requireSurface:true});const camera=window.__render.camera,nearest=c.nearest(camera.position.x,camera.position.z),cameraGround=window.__panQa.renderedGroundHeight(c,{x:camera.position.x,z:camera.position.z,s:nearest.s,off:nearest.lateral},{requireSurface:true});if(!Number.isFinite(cameraGround)||camera.position.y<cameraGround+.69)throw Error("Camera below drawn mountain");return {roadY:road.y,drawnGroundY:ground,cameraGroundY:cameraGround,cameraY:window.__render.camera.position.y,status:s.status,s:s.s,laps:s.completedLaps,distance,nightAmount:light.settings.nightAmount,field:s.opponents.map(r=>({name:r.name,s:r.s,finished:r.finished})),nativeCars:cars.length,nativeFieldSize:1+s.opponents.length};})()');
        const file='panorama-'+name.toLowerCase().replace(/ /g,'-')+'-'+quality+'-'+phase;
        await context.screenshot(file);report.captures.push({quality,name,file:file+'.png',phase,...meta});await persist();
      }
      await capture('Pit Straight','golden-grid');
      // Named straight and crest distances come from the actual authored script.
      const targets=await context.evaluate('(()=>{const c=window.__qaApp.duel.course;return '+JSON.stringify(['Ridge Top','Skyline','The Esses 1','Conrod Straight','Murray Corner'])+'.map(name=>({name,s:c.script.pieces.find(p=>p.name===name).s0}));})()');
      const progress=[];let captureIndex=0,duskIndex=0,dusk=false;
      for(let batch=0;batch<60;batch++) {
        const lap=dusk?2:0,index=dusk?duskIndex:captureIndex,target=targets[index]?.s??null;
        const result=await context.evaluate('(()=>{const a=window.__qaApp,d=a.duel,s=d.state,target='+JSON.stringify(target)+',lap='+lap+',dusk='+dusk+';for(let i=0;i<600;i++){if(!["racing","countdown"].includes(s.status))break;if(s.completedLaps>=3&&s.opponents.every(r=>r.finished))break;if(!dusk&&s.completedLaps>=2)break;if(target!==null&&s.completedLaps===lap&&d.course.phase(s.s)>=target)break;a.advance(1/60,1/60);}const before=JSON.stringify(s);window.__render.renderFrame();if(JSON.stringify(s)!==before)throw Error("Render changed native race");if(![s,...s.opponents].every(r=>[r.s,r.lateral,r.speedMph].every(Number.isFinite)))throw Error("Nonfinite native racer");return {status:s.status,time:s.stageTimeSec,laps:s.completedLaps,s:s.s,phase:d.course.phase(s.s),finished:s.opponents.filter(r=>r.finished).length,passes:s.field.stats.passes,pileUp:new Set(s.field.stats.crashes.filter(c=>c.t<=30).map(c=>c.index)).size>=3,lapTimes:[...s.lapTimes],allDone:s.completedLaps>=3&&s.opponents.every(r=>r.finished)};})()');
        progress.push(result);
        if(!dusk&&target!==null&&result.laps===0&&result.phase>=target){await capture(targets[captureIndex].name,'golden-racing');if(targets[captureIndex].name==='Ridge Top'){await context.evaluate('(()=>{const a=window.__qaApp;a.inspectionCamera=null;window.__render.renderFrame();})()');await context.screenshot('panorama-ridge-native-chase-'+quality);}captureIndex++;}
        // Final lap: the same named views again at dusk, with the field in them.
        if(result.laps>=2&&!dusk){await capture('Final Lap','dusk');dusk=true;}
        else if(dusk&&target!==null&&result.laps===2&&result.phase>=target){await capture(targets[duskIndex].name,'dusk');duskIndex++;}
        if(result.allDone||!['racing','countdown'].includes(result.status))break;
      }
      const final=progress.at(-1);
      report.qualities.push({quality,...setup,witness,progress,final});await persist();
      if(final.laps!==3||final.finished!==7||!final.allDone)throw Error('Native field did not finish: '+JSON.stringify(final));
      if(!report.captures.some(c=>c.quality===quality&&c.phase==='dusk'))throw Error('Actual final-lap dusk not captured');
    }
    report.passed=true;
  } finally {await persist();}
  console.log('Panorama: real High/Performance kits, native eight-car finish and final-lap dusk.');
}
