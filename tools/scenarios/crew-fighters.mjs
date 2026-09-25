import {writeFile, mkdir, readFile, access, realpath} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {join, relative as pathRelative, resolve, isAbsolute, extname, sep} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {selectCrew, selectedCrewId} from '../../src/crew.js';

const CREW = ['rook','nell','jax','odessa','cinder','dune','wren','tusk'];
const VIEWS = [['front',0],['side',Math.PI/2],['back',Math.PI]];
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

// These same helpers are exercised independently before the browser scenario.
export async function prepareRookCandidate({candidatePath, crewOnly, root}) {
  if (!candidatePath) return null;
  if (crewOnly !== 'rook') throw Error('Candidate review requires GFX_CREW_ONLY=rook');
  const laneRoot = await realpath(root);
  const allowed = join(laneRoot, 'art-build', 'crew', 'rook-p2');
  const inside = path => {
    const part = pathRelative(allowed, path);
    return part && part !== '..' && !part.startsWith('..' + sep) && !isAbsolute(part);
  };
  const requested = resolve(laneRoot, candidatePath);
  if (!inside(requested) || extname(requested).toLowerCase() !== '.glb')
    throw Error('Candidate path must be a GLB inside ignored art-build/crew/rook-p2');
  const actual = await realpath(requested);
  if (!inside(actual)) throw Error('Candidate real path leaves ignored art-build/crew/rook-p2');
  const bytes = await readFile(actual);
  const baseline = await readFile(join(laneRoot, 'public/assets/models/wasteland/crew/rook.glb'));
  return {path:pathRelative(laneRoot, actual).replaceAll('\\', '/'),
    sha256:sha(bytes), baselineSha256:sha(baseline), bytes};
}

export function rookCandidateFetchInstallScript(base64) {
  return `(() => {
    if (!Object.getOwnPropertyDescriptor(window,'localStorage')?.value ||
        !window.name.startsWith('__duel_qa_tab_v2:'))
      throw Error('Private memory guard required for Rook candidate');
    const bytes = Uint8Array.from(atob(${JSON.stringify(base64)}), char => char.charCodeAt(0));
    const originalFetch = window.fetch.bind(window);
    const review = window.__rookCandidateReview = {substitutions:0};
    window.fetch = (input, init) => {
      const address = typeof input === 'string' ? input : input?.url || String(input);
      const url = new URL(address, window.location.href);
      if (url.origin === window.location.origin &&
          url.pathname === '/assets/models/wasteland/crew/rook.glb') {
        review.substitutions++;
        return Promise.resolve(new Response(bytes, {
          status:200, headers:{'Content-Type':'model/gltf-binary'},
        }));
      }
      return originalFetch(input, init);
    };
  })()`;
}

// Private, memory-only fixture: production crew selection, transition and render
// hook; matched cameras then isolate its scene for legible comparison images.
export async function run(context) {
  const round = Number(process.env.GFX_CREW_ROUND || 1);
  if (!Number.isInteger(round) || round < 1 || round > 10) throw Error('Crew round must be 1..10');
  const only = process.env.GFX_CREW_ONLY || '';
  if (only && only !== 'rook') throw Error('GFX_CREW_ONLY currently supports rook');
  const crew = only ? [only] : CREW;
  const root = fileURLToPath(new URL('../../', import.meta.url));
  const candidate = await prepareRookCandidate({candidatePath:process.env.GFX_ROOK_CANDIDATE, crewOnly:only, root});
  const directory = context.outputDir;
  const relative = pathRelative(root, directory).replaceAll('\\', '/');
  await mkdir(directory, {recursive:true});
  const manifestPath = join(directory,'captures.json');
  try { await access(manifestPath); throw Error('Completed crew evidence is immutable; use the next round'); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  const evidence = {round, only:only || null, observationCommit:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),
    camera:{position:[0,.96,5],target:[0,.96,0],fov:28,width:432,height:576},
    qualities:['high','performance'],assets:{},captures:[],counts:{},selection:[],loadErrors:[]};
  for (const id of crew) evidence.assets[id] = {
    path:`public/assets/models/wasteland/crew/${id}.glb`,
    sha256:sha(await readFile(join(root,`public/assets/models/wasteland/crew/${id}.glb`)))};
  if (candidate) {
    evidence.assets.rook = {path:candidate.path, sha256:candidate.sha256};
    evidence.candidate = {path:candidate.path, sha256:candidate.sha256, baselineRookSha256:candidate.baselineSha256};
    evidence.qa = {baselineRookSha256:candidate.baselineSha256, candidateSha256:candidate.sha256, substitutionRequests:{}};
  }
  const profile={wasteland:{version:1,xp:1000000,crew:{selected:'rook',unlocked:CREW}}};
  const selected=crew.map(id=>{
    const choice=selectCrew(profile,id);
    if(!choice.ok||selectedCrewId(choice.profile)!==id)throw Error('Crew selection failed '+id);
    return {id,selected:selectedCrewId(choice.profile)};
  });
  for (const quality of evidence.qualities) {
    await context.navigate('/tools/menu-check.html?flags=wasteland2');
    await context.waitFor("window.__qaApp?.visualReady && window.__render && !document.querySelector('#start-engine')?.disabled", 'ready private menu',60000);
    if (candidate) await context.evaluate(rookCandidateFetchInstallScript(candidate.bytes.toString('base64')));
    await context.evaluate(`(async () => {
      if (!Object.getOwnPropertyDescriptor(window,'localStorage')?.value || !window.name.startsWith('__duel_qa_tab_v2:')) throw Error('Private memory store missing');
      const app=window.__qaApp;
      const select=document.querySelector('#graphics-quality');
      select.value='${quality}';select.dispatchEvent(new Event('change',{bubbles:true}));
      app.startCampaign({mode:'wasteland',startStage:0,seed:1989});app.stop();
      const s=app.duel.state;
      Object.assign(s,{status:'racing',countdown:0,paused:false,s:500,prevS:500,speedMph:0,traffic:[],opponents:[],stageTimeSec:10,crewId:'rook'});
      s.raids=null;s.combat.aiTimer=Infinity;s.combat.pickupTimer=Infinity;
      s.input.interact=true;
      for(let i=0;i<50&&!s.onFoot;i++)app.duel.step(1/120);
      if(!s.onFoot||s.fighter.crewId!=='rook')throw Error('Production crew exit did not create fighter');
      s.input.interact=false;s.fighter.presentation=null;
      window.__crewReview={selected:${JSON.stringify(selected)}};
      window.__render.renderFrame();
    })()`);
    await context.waitFor("window.__qaApp.visualReady && window.__render.scene.getObjectByName('Rigged on-foot fighters')?.userData.crews.rook==='ready'",'ready crew world',60000);
    const setup = await context.evaluate(`(() => {
      const r=window.__render,s=window.__qaApp.duel.state,review=window.__crewReview;
      window.requestAnimationFrame=()=>0;r.renderFrame();
      review.rig=r.scene.getObjectByName('Rigged on-foot fighters');
      review.lights=[];r.scene.traverse(n=>{if(n.isLight)review.lights.push(n.clone());});
      const skin=review.rig.getObjectByProperty('isSkinnedMesh',true);
      const box=review.rig.getObjectByName('fighter-plates').geometry;
      let plain;r.scene.traverse(n=>{if(!plain&&n.type==='Mesh')plain=n;});
      const material=skin.material.clone();material.map=null;material.vertexColors=false;material.color.setHex(0x777777);material.roughness=1;
      review.floor=new plain.constructor(new box.constructor(200,.02,200),material);
      review.floor.position.y=-.022;review.floor.receiveShadow=true;
      r.scene.add(review.floor,...review.lights);
      review.show=()=>{
        for(const child of r.scene.children)child.visible=false;
        // Move the existing production fighter group under the same scene.
        r.scene.add(review.rig);review.rig.visible=true;review.floor.visible=true;
        for(const light of review.lights)light.visible=true;
        r.scene.background=material.color.clone();r.scene.fog=null;r.scene.environment=null;
        r.renderer.setPixelRatio(1);r.renderer.setSize(432,576,false);r.composer.setSize(432,576);
        r.renderer.shadowMap.enabled='${quality}'==='high';
        r.camera.position.set(0,.96,5);r.camera.lookAt(0,.96,0);
        r.camera.fov=28;r.camera.aspect=432/576;r.camera.near=.05;r.camera.far=250;r.camera.updateProjectionMatrix();
      };
      review.draw=(action=null,view='front')=>{
        review.show();
        if(action==='jump'){r.camera.position.set(0,1.65,7);r.camera.lookAt(0,1.65,0);}
        // Keep the entire prone body in frame, including its forward head.
        if(view==='side'){r.camera.position.set(7,.65,.75);r.camera.lookAt(0,.65,.75);}
        r.camera.updateProjectionMatrix();r.renderer.info.reset();
        if('${quality}'==='high')r.composer.render(0);else r.renderer.render(r.scene,r.camera);
        return r.renderer.domElement.toDataURL('image/png');
      };
      return {selection:review.selected};
    })()`);
    evidence.selection.push({quality,...setup});
    for (const id of crew) {
      // The successful transition receives the selected crew ID, just as a new
      // campaign does. Reuse this isolated course to avoid eight world rebuilds.
      if (!only) await context.evaluate(`(() => {
        const app=window.__qaApp,s=app.duel.state;
        s.onFoot=false;s.fighter=null;s.crewId='${id}';s.input.interact=true;
        s.footTransition.needsRelease=false;s.footTransition.heldSeconds=0;
        for(let i=0;i<50&&!s.onFoot;i++)app.duel.step(1/120);
        if(s.fighter?.crewId!=='${id}')throw Error('Wrong selected crew after exit');
        s.input.interact=false;s.fighter.presentation=null;s.stageTimeSec=.25;
        Object.assign(s.fighter,{x:0,y:0,z:0,yaw:0,groundY:0,speed:0});
        s.fighterInput={};s.footWeapons.lastFireAt=undefined;
        window.__render.renderFrame();
      })()`);
      else await context.evaluate(`(() => {
        const s=window.__qaApp.duel.state;
        if (!s.onFoot || s.fighter?.crewId!=='rook')throw Error('Rook transition lost');
        s.stageTimeSec=.25;s.fighter.presentation=null;
        Object.assign(s.fighter,{x:0,y:0,z:0,yaw:0,groundY:0,speed:0});
        s.fighterInput={};s.footWeapons.lastFireAt=undefined;
      })()`);
      await context.waitFor(`window.__render.scene.getObjectByName('Rigged on-foot fighters').userData.crews['${id}']==='ready'`,'crew '+id,60000);
      for (const [view,baseYaw] of VIEWS) {
        // Tusk's reference profile faces left; the other seven face right.
        const yaw = id==='tusk' && view==='side' ? -Math.PI/2 : baseYaw;
        const result=await context.evaluate(`(() => {
          const r=window.__render,s=window.__qaApp.duel.state,review=window.__crewReview;
          s.fighter.yaw=${yaw};r.renderFrame();const png=review.draw();
          let active;review.rig.traverse(n=>{if(n.visible&&n.userData.clip&&n.userData.crewId==='${id}')active=n;});
          if(!active||active.userData.clip!=='idle')throw Error('Invalid matched idle pose');
          return {png,clip:active.userData.clip,time:active.userData.clipTime,detail:active.userData.detail};
        })()`);
        const path=`${relative}/game-${quality}-${id}-idle-${view}.png`;
        await writeFile(join(root,path),Buffer.from(result.png.split(',')[1],'base64'));
        context.screenshots.push(join(root,path));
        const {png,...metrics}=result;
        evidence.captures.push({crew:id,quality,clip:'idle',time:.25,view,yaw,path,sha256:sha(Buffer.from(result.png.split(',')[1],'base64')),...metrics});
      }
    }
    const actionCases = [
      ['walk',{speed:4.5},{}],['sprint',{speed:7.5,locomotion:'sprint'},{sprint:true}],
      ['jump',{airHeight:1.1,verticalSpeed:.2,y:1.1},{}],
      ['knockdown',{knockedDown:true,knockdownDuration:3,knockdownRemaining:2},{}],
      ['get-up',{presentation:{clip:'get-up',startedAt:9.75,duration:.8}},{}],
      ['aim',{}, {aim:true}],['fire',{},{}],['reload',{},{}],['repair',{},{}],
      ['enter',{presentation:{clip:'enter',startedAt:9.75,duration:.65}},{}],
      ['exit',{presentation:{clip:'exit',startedAt:9.75,duration:.65}},{}],
    ];
    // Recovery must show the support sequence, not just one flattering frame.
    for (const fraction of [.08,.48,.8]) actionCases.push([
      'get-up',{presentation:{clip:'get-up',startedAt:10-.8*fraction,duration:.8}},
      {},`-phase-${Math.round(fraction*100)}`,
    ]);
    for(const [clip,fields,input,sample=''] of actionCases) {
      for(const view of ['knockdown','get-up'].includes(clip) ? ['front','side'] : ['front']) {
        const result=await context.evaluate(`(() => {
          const r=window.__render,s=window.__qaApp.duel.state,review=window.__crewReview;
          Object.assign(s.fighter,{crewId:'rook',x:0,y:0,z:0,yaw:0,groundY:0,speed:0,
            locomotion:'idle',airHeight:0,verticalSpeed:0,knockedDown:false,presentation:null},${JSON.stringify(fields)});
          s.fighterInput=${JSON.stringify(input)};s.stageTimeSec=10;
          Object.assign(s.footWeapons,{selected:'rpg',serial:0,repairing:false,lastFireAt:undefined,nextFireAt:0});
          if('${clip}'==='fire'||'${clip}'==='reload')Object.assign(s.footWeapons,{serial:1,lastFireAt:'${clip}'==='fire'?9.9:9,nextFireAt:11.2});
          if('${clip}'==='repair')Object.assign(s.footWeapons,{selected:'wrench',repairing:true,repairSeconds:.25});
          r.renderFrame();const png=review.draw('${clip}','${view}');
          const rig=review.rig.children.find(n=>n.visible&&n.userData.clip);
          if(rig?.userData.clip!=='${clip}')throw Error('Wrong representative action '+rig?.userData.clip);
          return {png,time:rig.userData.clipTime};
        })()`);
        const path=`${relative}/game-${quality}-rook-${clip}${sample}-${view}.png`;
        await writeFile(join(root,path),Buffer.from(result.png.split(',')[1],'base64'));
        context.screenshots.push(join(root,path));
        evidence.captures.push({crew:'rook',quality,clip,time:result.time,view,yaw:0,path,camera:clip==='jump'?{position:[0,1.65,7],target:[0,1.65,0]}:view==='side'?{position:[7,.65,.75],target:[0,.65,.75]}:evidence.camera,source:'representative simulation snapshot'});
      }
    }
    if (only) {
      const count=evidence.captures.filter(capture=>capture.quality===quality).length;
      if (count!==22) throw Error(`Rook-only capture count was ${count}, expected 22`);
      evidence.counts[quality]={captureCount:count,scope:'one selected crew, matched views and Rook actions'};
      if (candidate) {
        const substitutions = await context.evaluate('window.__rookCandidateReview?.substitutions || 0');
        if (!Number.isInteger(substitutions) || substitutions < 1)
          throw Error('Rook candidate was not loaded in ' + quality);
        evidence.qa.substitutionRequests[quality] = substitutions;
        evidence.counts[quality].scope = 'private Rook candidate, matched views and actions; no crowd or frame gate';
      }
      continue;
    }
    evidence.counts[quality]=await context.evaluate(`(() => {
      const r=window.__render,s=window.__qaApp.duel.state,review=window.__crewReview;
      const ids=${JSON.stringify(CREW)};
      Object.assign(s.fighter,{crewId:'rook',x:1.5,y:0,z:-2,yaw:0,airHeight:0,verticalSpeed:0,speed:0,knockedDown:false,presentation:null});
      s.fighterInput={};s.footWeapons.serial=0;s.footWeapons.repairing=false;
      s.raids={zones:[{warning:{x:0,y:0,z:0},salvage:null,raiders:Array.from({length:11},(_,i)=>({
        crewId:ids[i%8],x:(i%4-1.5)*1.05,y:0,z:-Math.floor(i/4)*1.05,yaw:0,speed:i%2?4.5:0,knockedDown:false}))}]};
      const visible=node=>{for(let n=node;n;n=n.parent)if(!n.visible)return false;return true;};
      r.renderFrame();review.show();review.floor.visible=false;r.renderer.shadowMap.enabled=false;
      r.camera.position.set(0,3.5,9);r.camera.lookAt(0,.8,-1);r.camera.fov=40;r.camera.updateProjectionMatrix();
      r.renderer.info.reset();r.renderer.render(r.scene,r.camera);
      const near={drawCalls:r.renderer.info.render.calls,triangles:r.renderer.info.render.triangles};
      const shown=[];review.rig.traverse(n=>{if(n.isSkinnedMesh&&visible(n))shown.push(n);});
      if(shown.length!==12||near.drawCalls>24)throw Error('Near fighter budget exceeded');
      const localRoot=review.rig.children.find(n=>n.visible&&n.position.x===s.fighter.x&&n.position.z===s.fighter.z);
      const local=localRoot.getObjectByProperty('isSkinnedMesh',true);
      r.camera.position.set(s.fighter.x,1.62,s.fighter.z);local.onBeforeRender(null,null,r.camera);
      const hiddenAtEye=local.geometry.drawRange.count===0;local.onAfterRender();
      r.camera.position.x+=6;local.onBeforeRender(null,null,r.camera);
      const visibleOutside=local.geometry.drawRange.count>0;local.onAfterRender();
      if(!hiddenAtEye||!visibleOutside)throw Error('Crew first person body hiding failed');
      // Drive the actual camera far away before the production update reads it.
      // RenderFrame may restore its camera, so distance behavior is also recorded
      // against the public view in a separate independent Node acceptance test.
      for(const raider of s.raids.zones[0].raiders)raider.z+=65;
      r.renderFrame();
      let distant=0,nearLocal=0;
      review.rig.traverse(n=>{if(n.visible&&n.userData.clip){
        if(n.userData.detail==='far')distant++;else nearLocal++;
      }});
      if(distant!==11||nearLocal!==1)throw Error('Production camera distance did not choose eleven far rigs and one local near rig');
      for(const raider of s.raids.zones[0].raiders)raider.z-=65;
      const frames=[];
      for(let i=0;i<45;i++){
        const started=performance.now();r.renderFrame();review.show();r.renderer.render(r.scene,r.camera);
        if(i>=5)frames.push(performance.now()-started);
      }
      frames.sort((a,b)=>a-b);
      return {near,lod:{distant,nearLocal},firstPerson:{hiddenAtEye,visibleOutside},independentSkeletons:new Set(shown.map(n=>n.skeleton)).size,
        cpuFrameMs:{median:frames[Math.floor(frames.length*.5)],p95:frames[Math.floor(frames.length*.95)],samples:frames.length,
          scope:'production update plus extra isolated colour render; CPU submission, not GPU time'},
        loadErrors:review.rig.userData.loadErrors};
    })()`);
    evidence.loadErrors.push(...evidence.counts[quality].loadErrors);
    if(round>=2)evidence.counts[quality].course=await courseContext(context,quality,root,relative);
  }
  if (only && (evidence.captures.length!==44 || evidence.captures.some(capture=>capture.crew!==only)))
    throw Error('Selected crew capture scope is incomplete');
  if (candidate && sha(await readFile(join(root,'public/assets/models/wasteland/crew/rook.glb'))) !== candidate.baselineSha256)
    throw Error('Production Rook changed during candidate review');
  await writeFile(manifestPath,JSON.stringify(evidence,null,2)+'\n');
  console.log('Crew captured evidence: '+manifestPath);
}


async function courseContext(context,quality,root,relative) {
  await context.command('Emulation.setDeviceMetricsOverride',{width:1280,height:720,deviceScaleFactor:1,mobile:false});
  await context.navigate('/tools/menu-check.html?flags=wasteland2');
  await context.waitFor("window.__qaApp?.visualReady && !document.querySelector('#start-engine')?.disabled",'course context menu',60000);
  await context.evaluate(`(() => {
    const app=window.__qaApp,select=document.querySelector('#graphics-quality');
    select.value='${quality}';select.dispatchEvent(new Event('change',{bubbles:true}));
    app.startCampaign({mode:'wasteland',startStage:0,seed:1989});app.stop();
    const s=app.duel.state;
    Object.assign(s,{status:'racing',countdown:0,paused:false,s:500,prevS:500,lateral:0,speedMph:0,traffic:[],opponents:[],stageTimeSec:10,crewId:'rook'});
    s.raids=null;s.combat.aiTimer=Infinity;s.combat.pickupTimer=Infinity;
    s.input.interact=true;for(let i=0;i<50&&!s.onFoot;i++)app.duel.step(1/120);
    s.input.interact=false;s.fighter.presentation=null;s.fighterInput={};
    app.cameraMode='chase';
    window.__courseCrew={};
    window.__render.renderFrame();
  })()`);
  await context.waitFor("window.__qaApp.visualReady && window.__render.scene.getObjectByName('Rigged on-foot fighters')?.userData.crews.rook==='ready'",'course fighter ready',60000);
  const baseline=await context.evaluate(`(async()=>{
    const sample=(animate=false)=>new Promise(resolve=>{
      const intervals=[];let previous=null,warm=15;
      const tick=now=>{if(previous!==null){
        const dt=Math.min(.05,(now-previous)/1000);
        if(animate){
          const app=window.__qaApp,s=app.duel.state;s.stageTimeSec+=dt;
          for(const actor of s.raids.zones[0].raiders){
            actor.s+=actor.speed*dt;const p=app.duel.course.groundAt(actor.s,actor.lateral);
            actor.x=p.x;actor.y=p.y;actor.z=p.z;actor.yaw=p.heading;
          }
        }
        if(warm>0)warm--;else intervals.push(now-previous);
      }previous=now;
        if(intervals.length<120){requestAnimationFrame(tick);return;}
        intervals.sort((a,b)=>a-b);resolve({frames:120,p50:intervals[59],p95:intervals[113],max:intervals[119],over33ms:intervals.filter(x=>x>33).length});};
      requestAnimationFrame(tick);
    });window.__courseCrew.sample=sample;return await sample();
  })()`);
  await context.evaluate(`(()=>{
    const app=window.__qaApp,s=app.duel.state,ids=${JSON.stringify(CREW)};
    const raiders=Array.from({length:11},(_,i)=>{
      const atS=s.s+8+Math.floor(i/4)*2.2,off=(i%4-1.5)*1.6;
      const p=app.duel.course.groundAt(atS,off);
      return {crewId:ids[i%8],s:atS,lateral:off,x:p.x,y:p.y,z:p.z,yaw:p.heading,speed:i%2?4.5:0,knockedDown:false};
    });
    s.raids={zones:[{warning:{x:0,y:0,z:0},salvage:null,raiders}]};
    window.__render.renderFrame();
  })()`);
  await context.waitFor(`${JSON.stringify(CREW)}.every(id=>window.__render.scene.getObjectByName('Rigged on-foot fighters').userData.crews[id]==='ready')`,'all course crew assets',60000);
  const report=await context.evaluate(`(async()=>{
    const r=window.__render,s=window.__qaApp.duel.state;
    // Capture the real production scene and its normal lighting/composer.
    // The renderer RAF remains active throughout both matched interval samples.
    const stream=r.renderer.domElement.captureStream(30),chunks=[];
    const recorder=new MediaRecorder(stream,{mimeType:'video/webm'});
    recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};recorder.start();
    const crowded=await window.__courseCrew.sample(true);
    const png=r.renderer.domElement.toDataURL('image/png');
    const clip=await new Promise(resolve=>{recorder.onstop=async()=>{
      const blob=new Blob(chunks,{type:'video/webm'}),reader=new FileReader();
      reader.onload=()=>resolve(reader.result);reader.readAsDataURL(blob);};recorder.stop();});
    stream.getTracks().forEach(track=>track.stop());
    let visible=0;const rig=r.scene.getObjectByName('Rigged on-foot fighters');
    rig.traverse(n=>{if(n.isSkinnedMesh){let shown=true;for(let p=n;p;p=p.parent)if(!p.visible)shown=false;if(shown)visible++;}});
    return {crowded,png,clip,visible,quality:'${quality}',width:innerWidth,height:innerHeight,
      scope:'real course production RAF; one local fighter baseline versus twelve staged crew; full scene/composer/shadows; walking snapshots move at 4.5m/s along course ground, not raider AI'};
  })()`);
  const pngPath=`${relative}/course-${quality}-twelve.png`,videoPath=`${relative}/course-${quality}-motion.webm`;
  await writeFile(join(root,pngPath),Buffer.from(report.png.split(',')[1],'base64'));
  await writeFile(join(root,videoPath),Buffer.from(report.clip.split(',')[1],'base64'));
  context.screenshots.push(join(root,pngPath));
  const {png,clip,...metrics}=report;
  return {...metrics,baseline,frameRatio:report.crowded.p95/baseline.p95,png:pngPath,motion:videoPath};
}
