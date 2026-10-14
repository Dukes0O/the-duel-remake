import {readFile, realpath} from 'node:fs/promises';
import {join, resolve, relative, extname} from 'node:path';
import {createHash} from 'node:crypto';

const IDS = ['rook', 'nell', 'jax', 'odessa', 'cinder', 'dune', 'wren', 'tusk'];
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const ASSET = '/assets/models/wasteland/first-person/hands/rook.glb';

export function selectFirstPersonProof({p1Round,p2Round,contactOnly=false}={}) {
  if(p1Round!==undefined&&p2Round!==undefined)throw Error('Conflicting P1/P2 round selectors');
  const p2=p2Round!==undefined;
  if(p2&&contactOnly)throw Error('P2 contact needs a separate approved sampling design');
  const round=Number(p2?p2Round:p1Round??1);
  if(!Number.isInteger(round)||round<1||round>10)throw Error('First-person proof round must be 1..10');
  const family=p2?'first-person-p2':'first-person-p1';
  const candidateRoot=`art-build/${family}`;
  return {family,round,candidateRoot,
    defaultCandidatePath:`${candidateRoot}/candidate/hands/rook.glb`,
    blenderManifestPath:`${candidateRoot}/candidate/evidence/blender-manifest.json`};
}

export async function validateFirstPersonCandidatePath({root,candidatePath,productionPath,family='first-person-p1'}) {
  if(!['first-person-p1','first-person-p2'].includes(family))throw Error('Unknown first-person proof family');
  const allowed = await realpath(join(root,`art-build/${family}`));
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
export function assessFirstPersonP1FrameCost({reports,candidateSha256,productionSha256,family='first-person-p1'}) {
  const failures=[],qualities={};
  if(!['first-person-p1','first-person-p2'].includes(family))
    failures.push('Unknown first-person proof family');
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
      const badPath=selected ? !path?.startsWith(`art-build/${family}/`)||
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
    if(node.name!=='rook_sleeves_gloves_fingers'||!node.isSkinnedMesh||!node.skeleton)return;
    for(let parent=node;parent;parent=parent.parent)if(!parent.visible)return;
    hands.push(node);
  });
  return hands;
}

