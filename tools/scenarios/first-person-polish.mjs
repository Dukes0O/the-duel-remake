import {readFile, realpath, writeFile, access} from 'node:fs/promises';
import {join, resolve, relative, extname} from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';

const IDS = ['rook', 'nell', 'jax', 'odessa', 'cinder', 'dune', 'wren', 'tusk'];
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const ASSET = '/assets/models/wasteland/first-person/hands/rook.glb';

export async function validateFirstPersonCandidatePath({root,candidatePath,productionPath}) {
  const allowed = await realpath(join(root,'art-build/first-person-p1'));
  const absolute = await realpath(candidatePath);
  const production = await realpath(productionPath);
  if (absolute === production || extname(absolute).toLowerCase() !== '.glb')
    throw Error('Candidate must be an isolated GLB, not the production asset');
  const part = relative(allowed,absolute);
  if (!part || part.startsWith('..') || resolve(allowed,part) !== absolute)
    throw Error('Candidate is outside the ignored first-person proof folder');
  const bytes = await readFile(absolute);
  if (bytes.toString('ascii',0,4) !== 'glTF' || bytes.readUInt32LE(4) !== 2)
    throw Error('Candidate GLB magic/version is invalid');
  return {absolute,sha256:sha(bytes)};
}

export function rookAssetUrl(url,origin) {
  if (typeof url !== 'string') return false;
  try {
    const parsed = new URL(url,origin);
    return parsed.origin === origin && parsed.pathname === ASSET &&
      !parsed.search && !parsed.hash &&
      (url === ASSET || url === parsed.href);
  } catch {return false;}
}

export function verifyCandidateSwap({requestedUrl,origin,candidateBytes,productionBefore,productionAfter,swapCount}) {
  if (!rookAssetUrl(requestedUrl,origin)) throw Error('Wrong Rook asset request URL');
  if (swapCount !== 1) throw Error('Rook candidate must substitute exactly once');
  const bytes = Buffer.from(candidateBytes || []);
  if (bytes.length < 12 || bytes.toString('ascii',0,4) !== 'glTF' ||
      bytes.readUInt32LE(4) !== 2) throw Error('Candidate GLB magic/version invalid');
  for (const hashes of [productionBefore,productionAfter]) {
    if (!hashes || Object.keys(hashes).length !== IDS.length ||
        IDS.some(id => !/^[0-9a-f]{64}$/i.test(hashes[id] || '')))
      throw Error('Production baseline needs all eight crew hashes');
  }
  for (const id of IDS)
    if (productionBefore[id] !== productionAfter[id]) throw Error('Production hash changed: '+id);
}

export function rookCandidateFetchInstallScript(base64,origin) {
  return `(() => {
    if (window.__QA_MEMORY_STORAGE__ !== true) throw Error('Private memory-only storage guard missing');
    if (window.location.origin !== ${JSON.stringify(origin)}) throw Error('Private origin changed');
    const oldFetch=window.fetch;
    let count=0;
    window.__rookCandidateSwapCount=0;
    window.fetch=async function(input,init) {
      const url=typeof input==='string'?input:input?.url;
      const target=new URL(url,window.location.origin);
      if ((url===${JSON.stringify(ASSET)} || url===target.href) &&
          target.origin===window.location.origin &&
          target.pathname===${JSON.stringify(ASSET)} && !target.search && !target.hash) {
        count++;
        window.__rookCandidateSwapCount=count;
        const raw=atob(${JSON.stringify(base64)});
        const bytes=Uint8Array.from(raw,c=>c.charCodeAt(0));
        return new Response(bytes,{status:200,headers:{'Content-Type':'model/gltf-binary'}});
      }
      return oldFetch.call(window,input,init);
    };
  })();`;
}

export async function run(context) {
  const root = fileURLToPath(new URL('../../',import.meta.url));
  const round = Number(process.env.GFX_FIRST_PERSON_P1_ROUND || 1);
  if (!Number.isInteger(round) || round < 1 || round > 10) throw Error('First-person P1 round must be 1..10');
  const candidatePath = process.env.GFX_FIRST_PERSON_P1_CANDIDATE ||
    join(root,'art-build/first-person-p1/candidate/hands/rook.glb');
  const productionPath = join(root,'public/assets/models/wasteland/first-person/hands/rook.glb');
  const candidate = await validateFirstPersonCandidatePath({root,candidatePath,productionPath});
  const candidateBytes = await readFile(candidate.absolute);
  const blender = JSON.parse(await readFile(join(root,
    'art-build/first-person-p1/candidate/evidence/blender-manifest.json'),'utf8'));
  if (blender.family !== 'first-person-p1' || blender.round !== round ||
      blender.candidateSha256 !== candidate.sha256 || blender.captures?.length !== 8)
    throw Error('Frozen Blender source module does not match selected Rook candidate');
  const camera = {position:[0,0,0],target:[0,0,-1],verticalFov:72,near:.15,width:1280,height:720};
  if (JSON.stringify(blender.camera) !== JSON.stringify(camera)) throw Error('Blender camera changed');
  const manifestPath = join(context.outputDir,'captures.json');
  try {await access(manifestPath);throw Error('Completed first-person P1 evidence is immutable');}
  catch (error) {if (error.code !== 'ENOENT') throw error;}
  const relativePath = path => relative(root,path).replaceAll('\\','/');
  const handHashes = async () => Object.fromEntries(await Promise.all(IDS.map(async id =>
    [id,sha(await readFile(join(root,`public/assets/models/wasteland/first-person/hands/${id}.glb`)))])));
  const productionBefore = await handHashes();
  const evidence = {family:'first-person-p1',round,
    observationCommit:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),
    candidate:{path:relativePath(candidate.absolute),sha256:candidate.sha256},camera,
    productionBefore,productionAfter:null,qualities:{},captures:[],orderedMotion:[],
    frameStatus:'unmeasured',loadErrors:[]};
  const base64 = candidateBytes.toString('base64');
  for (const quality of ['high','performance']) {
    await context.command('Emulation.setDeviceMetricsOverride',
      {width:1280,height:720,deviceScaleFactor:1,mobile:false});
    await context.navigate('/tools/menu-check.html?flags=wasteland2');
    // Page.navigate may return before the old quality's document is replaced.
    // Its visualReady flag is still true, so require the new document's unset
    // candidate marker before installing the second private fetch wrapper.
    await context.waitFor('!!window.__qaApp?.visualReady && !!window.__render && window.__rookCandidateSwapCount===undefined && window.__QA_MEMORY_STORAGE__!==true',
      'new private first-person menu',60000);
    const origin = await context.evaluate('window.location.origin');
    await context.evaluate(`(() => {
      const storage=Object.getOwnPropertyDescriptor(window,'localStorage');
      if (!storage?.value || !window.name.startsWith('__duel_qa_tab_v2:'))
        throw Error('Private memory-only storage is not installed');
      window.__QA_MEMORY_STORAGE__=true;
    })()`);
    await context.evaluate(rookCandidateFetchInstallScript(base64,origin));
    await context.evaluate(`(() => {
      if (window.__rookCandidateSwapCount!==0) throw Error('Candidate requested before campaign');
      const select=document.querySelector('#graphics-quality');
      select.value=${JSON.stringify(quality)};select.dispatchEvent(new Event('change',{bubbles:true}));
      const app=window.__qaApp;app.startCampaign({mode:'wasteland',startStage:0,seed:1989});app.stop();
      const s=app.duel.state;
      Object.assign(s,{status:'racing',countdown:0,paused:false,s:500,prevS:500,
        lateral:0,prevLateral:0,speedMph:0,traffic:[]});
      s.rival.s=s.s+55;s.rival.lateral=3;s.raids=null;
      s.combat.aiTimer=Infinity;s.combat.pickupTimer=Infinity;
      app.duel._rival=()=>{};app.duel._traffic=()=>{};
      app.onFrame?.(s);window.__render.renderFrame();
    })()`);
    await context.waitFor('window.__qaApp.visualReady','first-person course ready',60000);
    const qualityObserved = await context.evaluate("document.querySelector('#graphics-quality')?.value");
    if (qualityObserved !== quality) throw Error('Actual browser quality differs from requested '+quality);
    const motion = await realInputMotion(context,quality,relativePath);
    evidence.orderedMotion.push(...motion);
    await key(context,'keyDown','KeyF','f',70);
    await context.evaluate('window.__qaApp.advance(.42)');
    await key(context,'keyUp','KeyF','f',70);
    await context.waitFor("window.__render.scene.getObjectByName('First-person hands and gear')?.userData.assetStatus==='ready'",
      'loaded Rook candidate after reentry',60000);
    for (const source of blender.captures) {
      if (source.crew !== 'rook') throw Error('Blender candidate includes another crew member');
      const sample = await matchedPose(context,source,quality);
      const bytes = Buffer.from(sample.png.split(',')[1],'base64');
      const label = `${source.clip}-${String(source.time).replace('.','p')}`;
      const path = join(context.outputDir,`game-${quality}-rook-${label}.png`);
      await writeFile(path,bytes,{flag:'wx'});
      context.screenshots.push(path);
      evidence.captures.push({path:relativePath(path),sha256:sha(bytes),clip:source.clip,
        time:source.time,tool:source.tool,quality,scope:'game course',
        presentation:sample.presentation,triangles:sample.triangles,draws:sample.draws,
        actualCamera:sample.actualCamera});
      evidence.loadErrors.push(...sample.loadErrors);
    }
    const candidateRequests = await context.evaluate('window.__rookCandidateSwapCount');
    evidence.qualities[quality] = {candidateRequests,assetStatus:'ready',qualityObserved};
    verifyCandidateSwap({requestedUrl:`${origin}${ASSET}`,origin,candidateBytes,
      productionBefore,productionAfter:await handHashes(),swapCount:candidateRequests});
  }
  evidence.productionAfter = await handHashes();
  if (evidence.loadErrors.length) throw Error('First-person candidate load errors: '+evidence.loadErrors.join('; '));
  if (evidence.captures.length !== 16) throw Error('Missing High/Performance matched Rook poses');
  await writeFile(manifestPath,JSON.stringify(evidence,null,2)+'\n',{flag:'wx'});
  console.log(`First-person P1 Rook: ${evidence.captures.length} matched course captures; real exit, shot, reload, repair and reentry in both qualities; candidate fetched once each.`);
}

const key = (context,type,code,name,virtual) => context.command('Input.dispatchKeyEvent',
  {type,code,key:name,windowsVirtualKeyCode:virtual});

async function realInputMotion(context,quality,relativePath) {
  const records=[];
  const capture=async phase => {
    const state=await context.evaluate(`(() => {
      const app=window.__qaApp,s=app.duel.state,r=window.__render;
      app.onFrame?.(s);r.renderFrame();
      const rig=r.scene.getObjectByName('First-person hands and gear');
      return{onFoot:s.onFoot,ammo:s.footWeapons?.ammo,armor:s.armor,
        action:rig?.userData.presentation?.action,assetStatus:rig?.userData.assetStatus,
        candidateRequests:window.__rookCandidateSwapCount};
    })()`);
    const path=await context.screenshot(`p1-${quality}-${phase}`);
    records.push({quality,phase,path:relativePath(path),sha256:sha(await readFile(path)),...state});
  };
  await key(context,'keyDown','KeyF','f',70);
  await context.evaluate('window.__qaApp.advance(.42)');
  await key(context,'keyUp','KeyF','f',70);
  const exitState=await context.evaluate(`(() => {
    const app=window.__qaApp,s=app.duel.state;
    app.onFrame?.(s);window.__render.renderFrame();
    return{onFoot:s.onFoot,status:s.status,stage:s.stageTimeSec,
      input:s.fighterInput,flag:app.flags?.wasteland2,
      memory:window.__QA_MEMORY_STORAGE__,quality:document.querySelector('#graphics-quality')?.value};
  })()`);
  if (!exitState.onFoot) throw Error('Real exit input did not switch to on-foot: '+JSON.stringify(exitState));
  try {
    await context.waitFor("window.__render.scene.getObjectByName('First-person hands and gear')?.userData.assetStatus==='ready'",
      'real Rook exit and candidate load',60000);
  } catch (error) {
    const state=await context.evaluate(`(() => {
      const app=window.__qaApp,rig=window.__render.scene.getObjectByName('First-person hands and gear');
      return{onFoot:app.duel.state.onFoot,status:app.duel.state.status,
        assetStatus:rig?.userData.assetStatus,loadErrors:rig?.userData.loadErrors,
        requests:window.__rookCandidateSwapCount};
    })()`);
    throw Error(`${error.message}: ${JSON.stringify(state)}`);
  }
  const point=await context.evaluate(`(() => {
    const app=window.__qaApp,s=app.duel.state,f=s.fighter;
    if(!s.onFoot)throw Error('Real exit did not reach on-foot state');
    const at=app.duel.course.groundAt(s.rival.s,s.rival.lateral);
    f.yaw=Math.atan2(at.x-f.x,at.z-f.z);
    f.pitch=Math.atan2(at.y+1-f.y-1.62,Math.hypot(at.x-f.x,at.z-f.z));
    const rect=document.querySelector('#view3d canvas').getBoundingClientRect();
    return{x:Math.round(rect.left+rect.width/2),y:Math.round(rect.top+rect.height/2)};
  })()`);
  const mouse=(type,button)=>context.command('Input.dispatchMouseEvent',
    {type,button,clickCount:1,...point});
  await capture('exit');
  await mouse('mousePressed','right');
  await context.waitFor("document.pointerLockElement===document.querySelector('#view3d canvas')",
    'real aim pointer lock',10000);
  await context.evaluate('window.__qaApp.advance(.81)');await capture('aim');
  await mouse('mousePressed','left');
  const shot=await context.evaluate(`(() => {
    const app=window.__qaApp;app.advance(.1);app.onFrame?.(app.duel.state);window.__render.renderFrame();
    const s=app.duel.state,g=window.__render.scene.getObjectByName('First-person hands and gear');
    if(s.footWeapons.ammo!==2||g.userData.presentation.action!=='fire'||
        !s.combat.projectiles.some(p=>p.kind==='rpg'))throw Error('Real RPG input did not fire');
    return true;
  })()`);
  if (!shot) throw Error('RPG shot missing');
  await capture('fire');await mouse('mouseReleased','left');
  await context.evaluate('window.__qaApp.advance(.9);window.__render.renderFrame()');
  const action=await context.evaluate("window.__render.scene.getObjectByName('First-person hands and gear').userData.presentation.action");
  if (action!=='reload') throw Error('Real shot did not enter reload');
  await capture('reload');await mouse('mouseReleased','right');
  await key(context,'keyDown','Digit2','2',50);await key(context,'keyUp','Digit2','2',50);
  await context.evaluate('window.__qaApp.duel.state.armor=40;window.__qaApp.duel.state.footWeapons.lastArmor=40;window.__render.renderFrame()');
  await context.waitFor("window.__render.scene.getObjectByName('First-person hands and gear')?.userData.assetStatus==='ready'",
    'real wrench loaded',60000);
  await mouse('mousePressed','left');
  await context.evaluate('window.__qaApp.advance(1.12);window.__render.renderFrame()');
  await capture('repair');
  await context.evaluate('window.__qaApp.advance(2.9);window.__render.renderFrame()');
  await mouse('mouseReleased','left');
  const armor=await context.evaluate('window.__qaApp.duel.state.armor');
  if (Math.abs(armor-80)>.01) throw Error('Real wrench repair did not restore 40 armor');
  await key(context,'keyDown','KeyF','f',70);
  await context.evaluate('window.__qaApp.advance(.62)');
  await key(context,'keyUp','KeyF','f',70);
  await context.evaluate('window.__qaApp.advance(1/120);window.__render.renderFrame()');
  const reentered=await context.evaluate("!window.__qaApp.duel.state.onFoot&&!window.__render.scene.getObjectByName('First-person hands and gear').visible");
  if (!reentered) throw Error('Real reentry left hands visible');
  await capture('reentry');
  return records;
}

async function matchedPose(context,source,quality) {
  return context.evaluate(`(() => {
    const s=window.__qaApp.duel.state,r=window.__render;
    const rig=r.scene.getObjectByName('First-person hands and gear');
    const clips={idle:1,aim:1,fire:.22,reload:2.2,'aim-reload':2.2,'wrench-idle':1,repair:4};
    const clip=${JSON.stringify(source.clip)},time=${source.time},tool=${JSON.stringify(source.tool)};
    const duration=clips[clip];if(!duration||time>duration)throw Error('Invalid matched clip time');
    const progress=time/duration;
    Object.assign(s.fighter,{crewId:'rook',speed:0,airHeight:0,verticalSpeed:0,knockedDown:false});
    s.stageTimeSec=10;s.fighterInput={aim:clip.startsWith('aim')};
    Object.assign(s.footWeapons,{selected:tool,ammo:3,serial:0,lastFireAt:undefined,
      nextFireAt:0,repairing:false,repairSeconds:0,repairAmount:0});
    if(clip==='fire')Object.assign(s.footWeapons,{serial:1,lastFireAt:10-.22*progress,nextFireAt:12});
    else if(clip.includes('reload')) {
      const age=.22+1.98*progress;
      Object.assign(s.footWeapons,{serial:1,lastFireAt:10-age,nextFireAt:10-age+2.2});
    } else if(clip==='repair')Object.assign(s.footWeapons,{repairing:true,
      repairSeconds:progress*4,repairAmount:40*progress});
    else s.stageTimeSec=time;
    r.renderFrame();
    if(rig.userData.assetStatus!=='ready')throw Error('Candidate not ready for matched pose');
    // Preserve the production course, light, fog, shadow and camera. Blender
    // shows an isolated source module; these are intentionally game-context
    // captures, with the actual game camera recorded below.
    let triangles=0,draws=0;
    rig.traverse(node=>{if(!node.isMesh)return;
      for(let p=node;p;p=p.parent)if(!p.visible)return;
      triangles+=(node.geometry.index?.count||node.geometry.attributes.position.count)/3;
      draws+=Array.isArray(node.material)?node.geometry.groups.length:1;
    });
    if(triangles>8000||draws>3)throw Error('First-person hand draw budget exceeded');
    r.renderFrame();
    return{png:r.renderer.domElement.toDataURL('image/png'),triangles,draws,
      presentation:{...rig.userData.presentation},loadErrors:[...rig.userData.loadErrors],
      actualCamera:{position:r.camera.position.toArray(),quaternion:r.camera.quaternion.toArray(),
        fov:r.camera.fov,near:r.camera.near,far:r.camera.far,aspect:r.camera.aspect}};
  })()`);
}
