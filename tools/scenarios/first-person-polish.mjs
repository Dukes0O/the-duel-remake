import {readFile, realpath, writeFile, access} from 'node:fs/promises';
import {join, resolve, relative, extname} from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createActualContactPlan,collectActualCandidateContact} from '../first-person-contact.mjs';

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

/** Assess raw native-frame evidence; browser collection is kept separate. */
export function assessFirstPersonP1FrameCost({reports,candidateSha256,productionSha256}) {
  const failures=[],qualities={};
  const expected=['A1','B','A2'];
  const summarize=values=>{
    const sorted=[...values].sort((a,b)=>a-b);
    return {mean:values.reduce((sum,value)=>sum+value,0)/values.length,
      p50:sorted[Math.ceil(sorted.length*.5)-1],
      p95:sorted[Math.ceil(sorted.length*.95)-1],max:sorted.at(-1)};
  };
  if(!/^[0-9a-f]{64}$/i.test(candidateSha256||'')||
      !/^[0-9a-f]{64}$/i.test(productionSha256||''))
    failures.push('Asset SHA-256 evidence missing');
  if(!Array.isArray(reports)||reports.length!==2||
      reports.map(row=>row.quality).join(',')!=='high,performance')
    failures.push('Expected High and Performance reports in order');
  for(const row of reports||[]) {
    if(!['high','performance'].includes(row.quality))continue;
    if(!Array.isArray(row.branches)||row.branches.map(item=>item.branch).join(',')!==expected.join(',')) {
      failures.push(row.quality+': missing A1/B/A2');continue;
    }
    const summaries={};
    const course=row.branches[0].courseSignature,pose=row.branches[0].poseSignature;
    for(const branch of row.branches) {
      const tag=row.quality+'/'+branch.branch,selected=branch.branch==='B';
      const path=branch.asset?.path?.replaceAll('\\','/');
      const badPath=selected ? !path?.startsWith('art-build/first-person-p1/')||
        !path.endsWith('/hands/rook.glb')||path.includes('../') :
        path!=='public/assets/models/wasteland/first-person/hands/rook.glb';
      if(branch.asset?.kind!==(selected?'candidate':'production')||
          branch.asset?.sha256!==(selected?candidateSha256:productionSha256)||
          badPath)
        failures.push(tag+': wrong source asset');
      if(branch.candidateRequests!==(selected?1:0)||branch.observedQuality!==row.quality)
        failures.push(tag+': wrong swap count or observed quality');
      if(!course||!pose||branch.courseSignature!==course||branch.poseSignature!==pose)
        failures.push(tag+': course or pose changed');
      if(branch.warmFrames!==30||branch.renderFrameCalls!==630||branch.nativeRafTicks!==630)
        failures.push(tag+': expected 30 warm and 600 full native frames');
      for(const [name,positive] of [['rafSamplesMs',true],['renderCpuSamplesMs',true],
        ['drawCallSamples',true],['triangleSamples',true],['textureCountSamples',false]]) {
        const samples=branch[name];
        if(!Array.isArray(samples)||samples.length!==600||samples.some(value=>
          !Number.isFinite(value)||(positive?value<=0:value<0)))
          failures.push(tag+': invalid '+name);
      }
      for(const name of ['handsVisibleSamples','toolVisibleSamples'])if(!Array.isArray(branch[name])||
          branch[name].length!==600||branch[name].some(value=>value!==true))
        failures.push(tag+': hidden or missing '+name);
      if(['rafSamplesMs','renderCpuSamplesMs','drawCallSamples','triangleSamples',
        'textureCountSamples'].every(name=>Array.isArray(branch[name])&&
          branch[name].length===600&&branch[name].every(Number.isFinite))&&
          Array.isArray(branch.rafSamplesMs)&&branch.rafSamplesMs.length===600&&
          branch.rafSamplesMs.every(value=>Number.isFinite(value)&&value>0)&&
          Array.isArray(branch.renderCpuSamplesMs)&&branch.renderCpuSamplesMs.length===600&&
          branch.renderCpuSamplesMs.every(value=>Number.isFinite(value)&&value>0))
        summaries[branch.branch]={raf:summarize(branch.rafSamplesMs),
          renderCpu:summarize(branch.renderCpuSamplesMs),
          draws:summarize(branch.drawCallSamples),triangles:summarize(branch.triangleSamples),
          textures:summarize(branch.textureCountSamples)};
    }
    if(expected.every(branch=>summaries[branch])) {
      const ratios={};
      for(const baseline of ['A1','A2']) {
        ratios[baseline]={cpuMean:summaries.B.renderCpu.mean/summaries[baseline].renderCpu.mean,
          cpuP95:summaries.B.renderCpu.p95/summaries[baseline].renderCpu.p95,
          rafP95:summaries.B.raf.p95/summaries[baseline].raf.p95};
        if(Object.values(ratios[baseline]).some(value=>!Number.isFinite(value)||value>1.10))
          failures.push(row.quality+': candidate exceeds 1.10 versus '+baseline);
      }
      qualities[row.quality]={summaries,ratios,baselineDrift:{
        cpuMean:summaries.A2.renderCpu.mean/summaries.A1.renderCpu.mean,
        cpuP95:summaries.A2.renderCpu.p95/summaries.A1.renderCpu.p95,
        rafP95:summaries.A2.raf.p95/summaries.A1.raf.p95}};
    }
  }
  return {passed:failures.length===0,failures,qualities,
    scope:'Native RAF plus one full production renderFrame CPU submission per frame; not GPU time'};
}

export function findActiveFirstPersonHands(rig) {
  const hands=[];
  rig?.traverse?.(node=>{
    if(node.name!=='rook sleeves gloves fingers'||!node.isSkinnedMesh||!node.skeleton)return;
    for(let parent=node;parent;parent=parent.parent)if(!parent.visible)return;
    hands.push(node);
  });
  return hands;
}

function embeddedTextureEstimate(bytes) {
  if(bytes.toString('ascii',0,4)!=='glTF'||bytes.readUInt32LE(4)!==2)
    throw Error('Active hand/tool asset is not a GLB');
  const jsonLength=bytes.readUInt32LE(12),json=JSON.parse(
    bytes.subarray(20,20+jsonLength).toString('utf8'));
  const binOffset=20+jsonLength+8;
  let encodedBytes=0,estimatedRgba8MipBytes=0;
  const images=[];
  for(const image of json.images||[]) {
    const view=json.bufferViews?.[image.bufferView];
    if(!view||image.mimeType!=='image/png')throw Error('Active gear texture is not an embedded PNG');
    const at=binOffset+(view.byteOffset||0),width=bytes.readUInt32BE(at+16),
      height=bytes.readUInt32BE(at+20);
    if(bytes.toString('hex',at,at+8)!=='89504e470d0a1a0a'||width<1||height<1)
      throw Error('Active gear PNG dimensions invalid');
    const mip=Math.ceil(width*height*4*4/3);
    encodedBytes+=view.byteLength;estimatedRgba8MipBytes+=mip;
    images.push({width,height,encodedBytes:view.byteLength,estimatedRgba8MipBytes:mip});
  }
  return {imageCount:images.length,textureCount:json.textures?.length||0,
    encodedBytes,estimatedRgba8MipBytes,images,
    scope:'Embedded PNG bytes and RGBA8 full-mip arithmetic only; not measured GPU allocation'};
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
  const contactOnly = process.env.GFX_FIRST_PERSON_CONTACT_ONLY === '1';
  const costOnly = process.env.GFX_FIRST_PERSON_P1_FRAME_COST === '1';
  if(contactOnly&&costOnly)throw Error('Choose contact or frame-cost diagnostic, not both');
  const blender = JSON.parse(await readFile(join(root,
    'art-build/first-person-p1/candidate/evidence/blender-manifest.json'),'utf8'));
  if (blender.family !== 'first-person-p1' || blender.round !== round ||
      blender.candidateSha256 !== candidate.sha256 || blender.captures?.length !== 8)
    throw Error('Frozen Blender source module does not match selected Rook candidate');
  const camera = {position:[0,0,0],target:[0,0,-1],verticalFov:72,near:.15,width:1280,height:720};
  if (JSON.stringify(blender.camera) !== JSON.stringify(camera)) throw Error('Blender camera changed');
  const manifestPath = join(context.outputDir,costOnly?'cost.json':contactOnly?'contact.json':'captures.json');
  try {await access(manifestPath);throw Error('Completed first-person P1 evidence is immutable');}
  catch (error) {if (error.code !== 'ENOENT') throw error;}
  const relativePath = path => relative(root,path).replaceAll('\\','/');
  const handHashes = async () => Object.fromEntries(await Promise.all(IDS.map(async id =>
    [id,sha(await readFile(join(root,`public/assets/models/wasteland/first-person/hands/${id}.glb`)))])));
  const productionBefore = await handHashes();
  if(costOnly) {
    const baselineBytes=await readFile(productionPath);
    const rpgPath=join(root,'public/assets/models/wasteland/first-person/rpg.glb');
    const rpgBytes=await readFile(rpgPath);
    const rpgSha256=sha(rpgBytes);
    const activeGearTextures={productionHands:embeddedTextureEstimate(baselineBytes),
      candidateHands:embeddedTextureEstimate(candidateBytes),rpg:embeddedTextureEstimate(rpgBytes),
      rpgSha256};
    const reports=[];
    for(const quality of ['high','performance']) {
      const branches=[];
      for(const branch of ['A1','B','A2'])branches.push(await measureProductionHandFrameCost({
        context,root,quality,branch,candidateBytes,originPath:ASSET,
        productionSha256:productionBefore.rook,candidateSha256:candidate.sha256,
        candidatePath:relativePath(candidate.absolute)}));
      reports.push({quality,branches});
    }
    const assessment=assessFirstPersonP1FrameCost({reports,
      candidateSha256:candidate.sha256,productionSha256:productionBefore.rook});
    const productionAfter=await handHashes();
    const rpgAfterSha256=sha(await readFile(rpgPath));
    const sourceFailures=[];
    if(IDS.some(id=>productionAfter[id]!==productionBefore[id]))
      sourceFailures.push('Production hand asset changed during frame-cost measurement');
    if(rpgAfterSha256!==rpgSha256)
      sourceFailures.push('Production RPG asset changed during frame-cost measurement');
    await writeFile(manifestPath,JSON.stringify({family:'first-person-p1-frame-cost',round,
      observationCommit:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),
      candidate:{path:relativePath(candidate.absolute),sha256:candidate.sha256},
      productionBefore,productionAfter,activeGearTextures,rpgAfterSha256,
      reports,assessment,sourceFailures},null,2)+'\n',{flag:'wx'});
    if(!assessment.passed||sourceFailures.length)
      throw Error('First-person frame-cost gate failed: '+
        [...assessment.failures,...sourceFailures].join('; '));
    console.log('First-person P1 native A1/B/A2 cost: '+JSON.stringify({passed:assessment.passed,
      failures:assessment.failures,qualities:assessment.qualities}));
    return;
  }
  const evidence = {family:'first-person-p1',round,
    observationCommit:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),
    candidate:{path:relativePath(candidate.absolute),sha256:candidate.sha256},camera,
    productionBefore,productionAfter:null,qualities:{},captures:[],orderedMotion:[],
    frameStatus:'unmeasured',loadErrors:[]};
  const base64 = candidateBytes.toString('base64');
  const contactReports=[];
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
    if (contactOnly) {
      contactReports.push({quality,report:await productionContactObservation(context,root,candidate.absolute)});
      continue;
    }
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
  if (contactOnly) {
    await writeFile(manifestPath,JSON.stringify({family:'first-person-p1-contact',round,
      observationCommit:evidence.observationCommit,candidate:evidence.candidate,
      productionBefore,productionAfter:evidence.productionAfter,qualities:contactReports},null,2)+'\n',
    {flag:'wx'});
    console.log('First-person P1 actual rendered contact diagnostic saved; inspect verdict and unsupported geometry.');
    return;
  }
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

async function measureProductionHandFrameCost({context,root,quality,branch,candidateBytes,
  originPath,productionSha256,candidateSha256,candidatePath}) {
  await context.command('Emulation.setDeviceMetricsOverride',
    {width:1280,height:720,deviceScaleFactor:1,mobile:false});
  await context.navigate('/tools/menu-check.html?flags=wasteland2');
  await context.waitFor('!!window.__qaApp?.visualReady && !!window.__render && window.__qaP1CostPage===undefined',
    'fresh private first-person cost page',60000);
  const origin=await context.evaluate('window.location.origin');
  await context.evaluate(`(() => {
    const storage=Object.getOwnPropertyDescriptor(window,'localStorage');
    if(!storage?.value||!window.name.startsWith('__duel_qa_tab_v2:'))
      throw Error('First-person cost needs verified memory-only storage');
    window.__QA_MEMORY_STORAGE__=true;
    window.__qaP1CostPage=${JSON.stringify(quality+'/'+branch)};
    window.__rookProductionRequests=0;window.__rookCandidateSwapCount=0;
    const fetch=window.fetch;
    window.fetch=function(input,init) {
      const value=typeof input==='string'?input:input?.url;
      const u=new URL(value,window.location.origin);
      if((value===${JSON.stringify(originPath)}||value===u.href)&&
        u.origin===window.location.origin&&u.pathname===${JSON.stringify(originPath)}&&
        !u.search&&!u.hash)window.__rookProductionRequests++;
      return fetch.call(window,input,init);
    };
  })()`);
  if(branch==='B')await context.evaluate(rookCandidateFetchInstallScript(
    candidateBytes.toString('base64'),origin));
  await context.evaluate(`(() => {
    const select=document.querySelector('#graphics-quality');
    select.value=${JSON.stringify(quality)};select.dispatchEvent(new Event('change',{bubbles:true}));
    const app=window.__qaApp;
    if(!app.startCampaign({mode:'wasteland',startStage:0,seed:1989}))
      throw Error('First-person cost course did not start');
    app.stop();const s=app.duel.state;
    Object.assign(s,{status:'racing',countdown:0,paused:false,s:500,prevS:500,
      lateral:0,prevLateral:0,speedMph:0,traffic:[]});
    s.rival.s=s.s+55;s.rival.lateral=3;s.raids=null;
    s.combat.aiTimer=Infinity;s.combat.pickupTimer=Infinity;
    app.duel._rival=()=>{};app.duel._traffic=()=>{};
    app.onFrame?.(s);window.__render.renderFrame();
  })()`);
  await context.waitFor('window.__qaApp.visualReady','cost course visual ready',60000);
  await key(context,'keyDown','KeyF','f',70);
  await context.evaluate('window.__qaApp.advance(.42)');
  await key(context,'keyUp','KeyF','f',70);
  await context.waitFor(`(() => {window.__render.renderFrame();return (
    window.__qaApp.duel.state.onFoot &&
    window.__render.scene.getObjectByName('First-person hands and gear')?.userData.assetStatus==='ready');})()`,
    'native hand cost pose loaded',60000);
  await context.evaluate(`(() => {
    const app=window.__qaApp,s=app.duel.state;
    Object.assign(s.fighter,{crewId:'rook',speed:0,airHeight:0,verticalSpeed:0,knockedDown:false});
    s.stageTimeSec=.25;s.fighterInput={aim:false};
    Object.assign(s.footWeapons,{selected:'rpg',ammo:3,serial:0,lastFireAt:undefined,
      nextFireAt:0,repairing:false,repairSeconds:0,repairAmount:0});
    app.onFrame?.(s);window.__render.renderFrame();
  })()`);
  const observed=await context.evaluate(`(async()=>{
    const app=window.__qaApp,s=app.duel.state,r=window.__render;
    const rig=r.scene.getObjectByName('First-person hands and gear');
    if(!rig?.visible||rig.userData.assetStatus!=='ready')throw Error('Hand cost rig not visible');
    const savedRaf=window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame=()=>0;
    const signature=()=>JSON.stringify({course:app.duel.course?.def?.id,seed:1989,
      status:s.status,onFoot:s.onFoot,s:s.s,lateral:s.lateral,
      fighter:[s.fighter?.x,s.fighter?.y,s.fighter?.z,s.fighter?.yaw,s.fighter?.pitch],
      camera:r.camera.position.toArray(),quaternion:r.camera.quaternion.toArray()});
    const courseSignature=signature();
    const poseSignature=JSON.stringify({crew:rig.userData.presentation.crewId,
      weapon:rig.userData.presentation.weapon,action:rig.userData.presentation.action,
      aim:rig.userData.presentation.aim,progress:rig.userData.presentation.actionProgress,
      motion:rig.userData.presentation.motionTime});
    const rafSamplesMs=[],renderCpuSamplesMs=[],drawCallSamples=[],triangleSamples=[],
      textureCountSamples=[],handsVisibleSamples=[],toolVisibleSamples=[];
    const visible=node=>{for(let p=node;p;p=p.parent)if(!p.visible)return false;return true;};
    let last=0,renderFrameCalls=0,nativeRafTicks=0;
    for(let i=0;i<630;i++){
      const now=await new Promise(savedRaf);nativeRafTicks++;
      const started=performance.now(),metrics=r.renderFrame(),cpu=performance.now()-started;
      renderFrameCalls++;
      if(i>=30){
        const hands=[];rig.traverse(node=>{
          if(node.name!=='rook sleeves gloves fingers'||!node.isSkinnedMesh||!node.skeleton)return;
          for(let p=node;p;p=p.parent)if(!p.visible)return;
          hands.push(node);
        });
        const tool=rig.getObjectByName('rpg-body');
        rafSamplesMs.push(now-last);renderCpuSamplesMs.push(cpu);
        drawCallSamples.push(metrics.drawCalls);triangleSamples.push(metrics.triangles);
        textureCountSamples.push(r.renderer.info.memory.textures);
        handsVisibleSamples.push(hands.length===1&&visible(hands[0]));
        toolVisibleSamples.push(!!tool&&visible(tool));
      }
      last=now;
    }
    window.requestAnimationFrame=savedRaf;
    if(signature()!==courseSignature)throw Error('Course or camera drifted during hand cost sample');
    return{courseSignature,poseSignature,rafSamplesMs,renderCpuSamplesMs,
      drawCallSamples,triangleSamples,textureCountSamples,handsVisibleSamples,
      toolVisibleSamples,renderFrameCalls,nativeRafTicks,
      observedQuality:document.querySelector('#graphics-quality')?.value,
      candidateRequests:window.__rookCandidateSwapCount,
      productionRequests:window.__rookProductionRequests,
      assetStatus:rig.userData.assetStatus,textureCount:r.renderer.info.memory.textures};
  })()`);
  if(branch==='B'&&observed.candidateRequests!==1||branch!=='B'&&
      (observed.candidateRequests!==0||observed.productionRequests!==1))
    throw Error(quality+'/'+branch+': wrong actual Rook fetch counts');
  return {branch,asset:branch==='B'?{kind:'candidate',path:candidatePath,
    sha256:candidateSha256}:{kind:'production',
    path:'public/assets/models/wasteland/first-person/hands/rook.glb',
    sha256:productionSha256},warmFrames:30,...observed};
}

// This diagnostic samples the production renderer after each pose. The bind
// transfer is full once; later transfers contain only stable selected IDs.
async function productionContactObservation(context,root,candidatePath) {
  await key(context,'keyDown','KeyF','f',70);
  await context.evaluate('window.__qaApp.advance(.42)');
  await key(context,'keyUp','KeyF','f',70);
  await context.evaluate('window.__render.renderFrame()');
  await context.waitFor("window.__render.scene.getObjectByName('First-person hands and gear')?.userData.assetStatus==='ready'",
    'contact diagnostic Rook hands ready',60000);
  await context.evaluate(`(() => {
    window.__qaP1ContactStamp=0;
    window.__qaP1Snapshot=(requested,selection=null) => {
      const r=window.__render,s=window.__qaApp.duel.state;
      r.renderFrame();
      const rig=r.scene.getObjectByName('First-person hands and gear');
      if(rig?.userData.assetStatus!=='ready'||!rig.visible)
        throw Error('Production first-person gear is not rendered');
      rig.updateMatrixWorld(true);r.camera.updateMatrixWorld(true);
      const active=node=>{for(let p=node;p;p=p.parent)if(!p.visible)return false;return true;};
      const hand=[];rig.traverse(node=>{if(node.isSkinnedMesh&&node.userData.handRegions&&active(node))hand.push(node);});
      if(hand.length!==1)throw Error('Expected one visible Rook hand skinned mesh, got '+hand.length);
      const mesh=hand[0],geometry=mesh.geometry,position=geometry.attributes.position;
      const point=(node,id)=>{
        const value=node.position.clone().fromBufferAttribute(node.geometry.attributes.position,id);
        if(node.isSkinnedMesh)node.applyBoneTransform(id,value);
        node.localToWorld(value);r.camera.worldToLocal(value);
        return value.toArray();
      };
      const faceIds=(geo)=>{
        const idx=geo.index;const count=idx?idx.count:geo.attributes.position.count;
        return Array.from({length:count/3},(_,i)=>({id:i,vertexIds:[0,1,2].map(k=>idx?idx.getX(i*3+k):i*3+k)}));
      };
      const allHand=selection===null;
      const wanted=allHand?Array.from({length:position.count},(_,i)=>i):selection.handIds;
      const positions=Object.fromEntries(wanted.map(id=>[id,point(mesh,id)]));
      const regions={};
      if(allHand)for(const [name,hint] of Object.entries(mesh.userData.handRegions)) {
        const center=hint.center,radius=hint.radiusMetres;
        let closest=-1,best=Infinity;
        for(let id=0;id<position.count;id++) {
          const v=mesh.position.clone().fromBufferAttribute(position,id).toArray();
          const d=Math.hypot(...v.map((n,k)=>n-center[k]));
          if(d<best){best=d;closest=id;}
        }
        if(best>radius)throw Error('Hand region has no source vertex: '+name);
        // The authored selector center is skinned with the nearest source
        // vertex's weights. Keep its offset rather than snapping it to that
        // vertex, which would silently move the 15 mm selection sphere.
        const posed=mesh.position.clone().set(...center);
        mesh.applyBoneTransform(closest,posed);mesh.localToWorld(posed);
        r.camera.worldToLocal(posed);
        regions[name]={center:posed.toArray(),radiusMetres:radius,
          sourceCenter:center,weightVertexId:closest};
      }
      if(allHand) {
        regions['R:index']=regions['R:indexTip'];regions['R:thumb']=regions['R:thumbTip'];
        regions['L:index']=regions['L:indexTip'];regions['L:thumb']=regions['L:thumbTip'];
        regions['L:support']=regions['L:palm'];
      }
      const tools={};
      for(const [key,name] of [['rpgBody','rpg-body'],['loadedRocket','loaded-rocket'],['wrenchBody','wrench-body']]) {
        const nodes=[];rig.traverse(node=>{if(node.isMesh&&node.name===name&&active(node))nodes.push(node);});
        if(nodes.length>1)throw Error('Duplicate visible mounted tool mesh: '+name);
        if(!nodes.length)continue;
        const node=nodes[0],faces=faceIds(node.geometry);
        const allowed=selection?.toolIds?.[key];
        tools[key]=faces.filter(face=>!allowed||allowed.includes(face.id)).map(face=>({
          id:face.id,vertices:face.vertexIds.map(id=>point(node,id))}));
      }
      const p=rig.userData.presentation;
      const clip=p.action==='idle'?(p.weapon==='wrench'?'wrench-idle':p.aim?'aim':'idle'):p.action;
      const actual={clip,progress:p.action==='idle'?s.stageTimeSec%1:p.actionProgress};
      return {sampleStamp:++window.__qaP1ContactStamp,requested,actual,
        hand:{positions,...(allHand?{faces:faceIds(geometry),regions}:{})},tools,
        presentation:{...p},candidateRequests:window.__rookCandidateSwapCount};
    };
  })()`);
  const setPose=async (clip,progress,tool) => {
    await context.evaluate(`(() => {
      const s=window.__qaApp.duel.state,r=window.__render;
      const clip=${JSON.stringify(clip)},progress=${progress},tool=${JSON.stringify(tool)};
      if(clip==='post-reload-idle') {
        if(s.footWeapons.serial!==1||!Number.isFinite(s.footWeapons.nextFireAt))
          throw Error('Post-reload sample lost the production shot state');
        s.stageTimeSec=Math.ceil(s.footWeapons.nextFireAt)+progress;
        r.renderFrame();return;
      }
      Object.assign(s.fighter,{crewId:'rook',speed:0,airHeight:0,verticalSpeed:0,knockedDown:false});
      s.stageTimeSec=clip==='idle'||clip==='wrench-idle'||clip==='aim'?progress:10;
      s.fighterInput={aim:clip==='aim'};
      Object.assign(s.footWeapons,{selected:tool,ammo:3,serial:0,lastFireAt:undefined,
        nextFireAt:0,repairing:false,repairSeconds:0,repairAmount:0});
      if(clip==='fire')Object.assign(s.footWeapons,{serial:1,lastFireAt:10-.22*progress,nextFireAt:12});
      else if(clip==='reload') {
        const age=.22+1.98*progress;
        Object.assign(s.footWeapons,{serial:1,lastFireAt:10-age,nextFireAt:10-age+2.2});
      } else if(clip==='repair')Object.assign(s.footWeapons,{repairing:true,
        repairSeconds:progress*4,repairAmount:40*progress});
      r.renderFrame();
    })()`);
    await context.waitFor("window.__render.scene.getObjectByName('First-person hands and gear')?.userData.assetStatus==='ready'",
      'mounted contact tool ready',60000);
  };
  await setPose('idle',.25,'rpg');
  const rpgBind=await context.evaluate("window.__qaP1Snapshot({clip:'idle',progress:.25})");
  await setPose('wrench-idle',.25,'wrench');
  const wrenchBind=await context.evaluate("window.__qaP1Snapshot({clip:'wrench-idle',progress:.25})");
  const bindSnapshot={hand:rpgBind.hand,handByTool:{rpg:rpgBind.hand,wrench:wrenchBind.hand},
    tools:{...rpgBind.tools,...wrenchBind.tools}};
  const plan=createActualContactPlan({candidatePath,
    rpgPath:join(root,'public/assets/models/wasteland/first-person/rpg.glb'),
    wrenchPath:join(root,'public/assets/models/wasteland/first-person/wrench.glb'),bindSnapshot});
  const handIds=[...new Set(Object.values(plan.patches).flatMap(patch=>patch.vertexIds))];
  const toolIds={
    rpgBody:[...new Set(['rpg-right-handle','rpg-left-support'].flatMap(name=>plan.componentIds[name].triangleIds))],
    loadedRocket:plan.componentIds['rpg-rocket'].triangleIds,
    wrenchBody:plan.componentIds['wrench-handle'].triangleIds,
  };
  const phases=[['idle',.25,'rpg'],['aim',.25,'rpg'],['fire',.1,'rpg'],
    ...[.18,.48,.76,.90,.999].map(progress=>['reload',progress,'rpg']),
    ['idle',.25,'rpg','post-reload-idle'],
    ['wrench-idle',.25,'wrench'],...[.25,.5,.75,1].map(progress=>['repair',progress,'wrench'])];
  const poseSamples=[];
  for(const [clip,progress,tool,kind] of phases) {
    await setPose(kind||clip,progress,tool);
    const requested={clip,progress};
    const sample=await context.evaluate(`window.__qaP1Snapshot(${JSON.stringify(requested)},${JSON.stringify({handIds,toolIds})})`);
    sample.geometryHash=sha(Buffer.from(JSON.stringify({hand:sample.hand,tools:sample.tools})));
    if(sample.candidateRequests!==1)throw Error('Contact sample did not use exactly one Rook candidate request');
    poseSamples.push(sample);
  }
  const report=collectActualCandidateContact({plan,poseSamples});
  return {...report,renderedPresentation:poseSamples.map(sample=>sample.presentation),
    bind:{handVertices:Object.keys(bindSnapshot.hand.positions).length,
      handFaces:bindSnapshot.hand.faces.length,
      toolTriangles:Object.fromEntries(Object.entries(bindSnapshot.tools).map(([name,faces])=>[name,faces.length]))}};
}
