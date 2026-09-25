import {createHash} from 'node:crypto';
import {readFileSync,realpathSync} from 'node:fs';
import {resolve, relative, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const EPS = 1e-9;
const sub = (a,b) => a.map((value,index) => value-b[index]);
const add = (a,b) => a.map((value,index) => value+b[index]);
const mul = (a,n) => a.map(value => value*n);
const dot = (a,b) => a.reduce((sum,value,index) => sum+value*b[index],0);
const cross = (a,b) => [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const length = a => Math.sqrt(dot(a,a));
const distance = (a,b) => length(sub(a,b));
const sha = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');

function closestPoint(point,triangle) {
  const [a,b,c]=triangle.vertices, ab=sub(b,a), ac=sub(c,a), ap=sub(point,a);
  const d1=dot(ab,ap),d2=dot(ac,ap);
  if(d1<=0&&d2<=0)return a;
  const bp=sub(point,b),d3=dot(ab,bp),d4=dot(ac,bp);
  if(d3>=0&&d4<=d3)return b;
  const vc=d1*d4-d3*d2;
  if(vc<=0&&d1>=0&&d3<=0)return add(a,mul(ab,d1/(d1-d3)));
  const cp=sub(point,c),d5=dot(ab,cp),d6=dot(ac,cp);
  if(d6>=0&&d5<=d6)return c;
  const vb=d5*d2-d1*d6;
  if(vb<=0&&d2>=0&&d6<=0)return add(a,mul(ac,d2/(d2-d6)));
  const va=d3*d6-d5*d4;
  if(va<=0&&(d4-d3)>=0&&(d5-d6)>=0)return add(b,mul(sub(c,b),(d4-d3)/((d4-d3)+(d5-d6))));
  const denom=1/(va+vb+vc);
  return add(a,add(mul(ab,vb*denom),mul(ac,vc*denom)));
}

function nearest(point,triangles) {
  let found=null;
  for(const triangle of triangles) {
    const closest=closestPoint(point,triangle),gap=distance(point,closest);
    if(!found||gap<found.gap)found={triangle,closest,gap};
  }
  if(!found)throw Error('Contact target has no triangles');
  return found;
}

function closedSurface(triangles) {
  if(!Array.isArray(triangles)||triangles.length<4)return false;
  const key=point=>point.map(value=>Math.round(value*1e6)).join(',');
  const edges=new Map();
  for(const triangle of triangles) {
    if(!Array.isArray(triangle.vertices)||triangle.vertices.length!==3)return false;
    const vertices=triangle.vertices.map(key);
    if(new Set(vertices).size!==3)return false;
    for(let index=0;index<3;index++) {
      const a=vertices[index],b=vertices[(index+1)%3],edge=a<b?`${a}|${b}`:`${b}|${a}`;
      edges.set(edge,(edges.get(edge)||0)+1);
    }
  }
  return [...edges.values()].every(count=>count===2);
}

function rayHit(point,direction,triangle) {
  const [a,b,c]=triangle.vertices,ab=sub(b,a),ac=sub(c,a),h=cross(direction,ac),det=dot(ab,h);
  if(Math.abs(det)<EPS)return null;
  const inv=1/det,s=sub(point,a),u=dot(s,h)*inv;
  if(u<-EPS||u>1+EPS)return null;
  const q=cross(s,ab),v=dot(direction,q)*inv;
  if(v<-EPS||u+v>1+EPS)return null;
  const t=dot(ac,q)*inv;
  return t>EPS?t:null;
}

function insideClosed(point,triangles) {
  const direction=[1,.173,.067],hits=[];
  for(const triangle of triangles) {
    const hit=rayHit(point,direction,triangle);
    if(hit!=null&&!hits.some(prior=>Math.abs(prior-hit)<1e-6))hits.push(hit);
  }
  return hits.length%2===1;
}

function validTriangle(triangle) {
  return Number.isInteger(triangle?.id) && Array.isArray(triangle.vertices) &&
    triangle.vertices.length===3 && triangle.vertices.every(point=>
      Array.isArray(point)&&point.length===3&&point.every(Number.isFinite));
}

/** Choose actual adjacent hand faces and intended handle faces once in bind pose. */
export function selectBindContactPatch({regionVertices,regionFaces,handleTriangles,closedHandleFaces,minVertices=6}) {
  if(!Array.isArray(regionVertices)||!Array.isArray(regionFaces)||
      !Array.isArray(handleTriangles)||!Array.isArray(closedHandleFaces)||
      !handleTriangles.every(validTriangle)||!closedHandleFaces.every(validTriangle))
    throw Error('Bind contact needs actual hand faces and tool triangles');
  const points=new Map(regionVertices.map(item=>[item.id,item.position]));
  const adjacency=new Map([...points.keys()].map(id=>[id,new Set()]));
  for(const face of regionFaces) {
    const ids=face.vertexIds;
    if(!Array.isArray(ids)||ids.length!==3||ids.some(id=>!points.has(id)))throw Error('Invalid hand contact face');
    for(let i=0;i<3;i++)for(let j=i+1;j<3;j++){
      adjacency.get(ids[i]).add(ids[j]);adjacency.get(ids[j]).add(ids[i]);
    }
  }
  // Exported UV seams duplicate vertex IDs on one physical palm surface.
  // Weld only connectivity at the same 0.1 mm precision as topology checks;
  // retain every original ID for later skinned pose sampling.
  const weldKey=id=>points.get(id).map(value=>Math.round(value*10000)).join(',');
  const weldGroups=new Map();
  for(const id of points.keys()) {
    const key=weldKey(id);if(!weldGroups.has(key))weldGroups.set(key,[]);
    weldGroups.get(key).push(id);
  }
  for(const ids of weldGroups.values())for(const a of ids)for(const b of ids)
    if(a!==b)adjacency.get(a).add(b);
  const contactFacing=new Set();
  for(const face of regionFaces) {
    const [a,b,c]=face.vertexIds.map(id=>points.get(id));
    const center=mul(add(add(a,b),c),1/3),normal=cross(sub(b,a),sub(c,a));
    const target=nearest(center,handleTriangles);
    if(dot(normal,sub(target.closest,center))>EPS)
      face.vertexIds.forEach(id=>contactFacing.add(id));
  }
  const distinct=ids=>new Set([...ids].map(weldKey)).size;
  if(distinct(contactFacing)<minVertices)throw Error('No connected contact-facing hand patch');
  const scores=[...contactFacing].map(id=>({id,gap:nearest(points.get(id),handleTriangles).gap}));
  scores.sort((a,b)=>a.gap-b.gap);
  const seed=scores[0].id,chosen=new Set([seed]),queue=[seed];
  while(queue.length&&distinct(chosen)<Math.max(minVertices,Math.min(16,distinct(contactFacing)))) {
    const id=queue.shift();
    const neighbors=[...adjacency.get(id)].filter(next=>contactFacing.has(next)&&!chosen.has(next))
      .sort((a,b)=>nearest(points.get(a),handleTriangles).gap-nearest(points.get(b),handleTriangles).gap);
    for(const next of neighbors){chosen.add(next);queue.push(next);}
  }
  if(distinct(chosen)<minVertices) {
    const unseen=new Set(contactFacing),groups=[];
    while(unseen.size) {
      const first=unseen.values().next().value,part=new Set([first]),pending=[first];unseen.delete(first);
      while(pending.length)for(const next of adjacency.get(pending.pop()))if(unseen.delete(next)){
        part.add(next);pending.push(next);
      }
      groups.push({size:part.size,distinct:distinct(part),minGap:Math.min(...[...part].map(id=>
        nearest(points.get(id),handleTriangles).gap))});
    }
    throw Error(`Contact-facing patch is disconnected or too small `+
      `(facing ${contactFacing.size}, connected ${chosen.size}, distinct ${distinct(chosen)}, `+
      `seed ${seed}, groups ${JSON.stringify(groups)})`);
  }
  const vertexIds=[...chosen].sort((a,b)=>a-b);
  const best=Math.min(...vertexIds.map(id=>nearest(points.get(id),handleTriangles).gap));
  const handleTriangleIds=handleTriangles.filter(triangle=>
    Math.min(...vertexIds.map(id=>distance(points.get(id),closestPoint(points.get(id),triangle))))<=best+.015)
    .map(triangle=>triangle.id).sort((a,b)=>a-b);
  if(!handleTriangleIds.length)throw Error('No intended handle faces near bind contact');
  const bounds={min:[0,1,2].map(axis=>Math.min(...vertexIds.map(id=>points.get(id)[axis]))),
    max:[0,1,2].map(axis=>Math.max(...vertexIds.map(id=>points.get(id)[axis])))};
  return {vertexIds,handleTriangleIds,bounds,selectionHash:sha({vertexIds,handleTriangleIds,bounds})};
}

/** Measure fixed skin IDs against fixed tool faces at one actual posed sample. */
export function measureContactFrame({patch,skinnedVertexPositions,posedHandleTriangles,
  posedClosedHandleFaces,requested,actual,sampleStamp,geometryHash}) {
  if(typeof requested?.clip!=='string'||!requested.clip||
      !Number.isFinite(requested?.progress)||
      typeof actual?.clip!=='string'||!actual.clip||!Number.isFinite(actual?.progress))
    throw Error('Contact phase needs finite requested and actual clip/progress');
  if(requested?.clip!==actual?.clip||Math.abs((requested?.progress??NaN)-(actual?.progress??NaN))>1e-6)
    throw Error('Actual production clip/progress differs from requested contact phase');
  if(!Number.isFinite(sampleStamp))throw Error('Contact sample needs a fresh numeric stamp');
  const target=posedHandleTriangles.filter(triangle=>patch.handleTriangleIds.includes(triangle.id));
  if(target.length!==patch.handleTriangleIds.length||!target.every(validTriangle))
    throw Error('Fixed handle triangle IDs missing in posed frame');
  const closed=closedSurface(posedClosedHandleFaces);
  const gaps=[],penetrations=[];
  for(const id of patch.vertexIds) {
    const point=skinnedVertexPositions[id];
    if(!Array.isArray(point)||point.length!==3||!point.every(Number.isFinite))
      throw Error('Fixed hand vertex missing in posed frame: '+id);
    const gap=nearest(point,target).gap;gaps.push(gap);
    if(closed&&insideClosed(point,posedClosedHandleFaces))
      penetrations.push(nearest(point,posedClosedHandleFaces).gap);
  }
  gaps.sort((a,b)=>a-b);
  return {minGap:gaps[0],p90Gap:gaps[Math.ceil(.9*gaps.length)-1],
    maxPenetration:closed?Math.max(0,...penetrations):null,
    insideCount:closed?penetrations.length:null,closed,unsupported:!closed,
    selectionHash:patch.selectionHash,sampleStamp,geometryHash,
    actual:{...actual},requested:{...requested}};
}

/** Check ordered observed phases without treating a repeated legitimate pose as stale. */
export function assessContactSequence({frames}) {
  const failures=[];
  if(!Array.isArray(frames)||!frames.length)return {passed:false,phases:[],failures:['No contact frames']};
  const rpgRight=[['rpg','R','palm'],['rpg','R','index'],['rpg','R','thumb']];
  const expected=[
    ['idle',.25,[...rpgRight,['rpg','L','support']]],
    ['aim',.25,[...rpgRight,['rpg','L','support']]],
    ['fire',.1,[...rpgRight,['rpg','L','support']]],
    ['reload',.18,rpgRight],
    ['reload',.48,[...rpgRight,['rpg','L','rocket-guide']]],
    ['reload',.76,[...rpgRight,['rpg','L','rocket-guide']]],
    ['reload',.90,[...rpgRight,['rpg','L','support']]],
    ['reload',.999,[...rpgRight,['rpg','L','support']]],
    ['idle',.25,[...rpgRight,['rpg','L','support']]],
    ['wrench-idle',.25,[['wrench','R','palm'],['wrench','R','thumb']]],
    ...[.25,.5,.75,1].map(progress=>['repair',progress,
      [['wrench','R','palm'],['wrench','R','thumb']]]),
  ];
  if(frames.length!==expected.length)failures.push(`Expected ${expected.length} ordered contact poses`);
  let priorStamp=-Infinity;
  const phases=[];
  const patchIdentity=new Map();
  for(const [index,frame] of frames.entries()) {
    const {requested,actual,sampleStamp,contacts}=frame;
    const [clip,progress,required]=expected[index]||[];
    const name=`${requested?.clip}@${requested?.progress}`;
    phases.push(name);
    if(!Number.isFinite(sampleStamp)||sampleStamp<=priorStamp)failures.push(name+': stale sample stamp');
    priorStamp=sampleStamp;
    if(requested?.clip!==clip||Math.abs((requested?.progress??NaN)-(progress??NaN))>1e-6)
      failures.push(name+': missing or out-of-order required pose');
    if(typeof requested?.clip!=='string'||!Number.isFinite(requested?.progress)||
        typeof actual?.clip!=='string'||!Number.isFinite(actual?.progress))
      failures.push(name+': missing or nonfinite production phase');
    if(requested?.clip!==actual?.clip||Math.abs((requested?.progress??NaN)-(actual?.progress??NaN))>1e-6)
      failures.push(name+': wrong actual production phase');
    if(!Array.isArray(contacts)) {failures.push(name+': contacts missing');continue;}
    const found=new Map();
    for(const contact of contacts) {
      const {tool,hand,region,measurement}=contact,key=`${tool}/${hand}/${region}`;
      if(found.has(key))failures.push(name+': duplicate '+key);
      found.set(key,contact);
      if(!measurement?.closed||measurement.unsupported)failures.push(name+': open or unsupported '+key);
      if(!Number.isFinite(measurement?.maxPenetration)||measurement.maxPenetration<0||
          measurement.maxPenetration>.005)
        failures.push(name+': '+key+' has invalid or over-5-mm penetration');
      if(measurement?.sampleStamp!==sampleStamp||
          !Number.isFinite(measurement.actual?.progress)||
          !Number.isFinite(measurement.requested?.progress)||
          measurement.actual?.clip!==actual?.clip||
          Math.abs((measurement.actual?.progress??NaN)-(actual?.progress??NaN))>1e-6||
          measurement.requested?.clip!==requested?.clip||
          Math.abs((measurement.requested?.progress??NaN)-(requested?.progress??NaN))>1e-6)
        failures.push(name+': stale or wrongly labelled '+key+' measurement');
      const identity=patchIdentity.get(key);
      if(typeof measurement?.selectionHash!=='string'||!measurement.selectionHash)
        failures.push(name+': contact patch selection missing for '+key);
      else if(identity&&identity!==measurement.selectionHash)
        failures.push(name+': contact patch changed for '+key);
      else patchIdentity.set(key,measurement.selectionHash);
      const limit=hand==='R'?.015:.020;
      if(!Number.isFinite(measurement?.p90Gap)||measurement.p90Gap>limit)
        failures.push(name+`: ${key} gap exceeds ${Math.round(limit*1000)} mm`);
    }
    for(const [tool,hand,region] of required||[])
      if(!found.has(`${tool}/${hand}/${region}`))failures.push(name+': required '+`${tool}/${hand}/${region}`+' absent');
  }
  return {passed:failures.length===0,phases,failures};
}

const ROOT=resolve(fileURLToPath(new URL('../',import.meta.url)));
const pointKey=point=>point.map(value=>Math.round(value*10000)).join(',');
const edgeKey=(a,b)=>a<b?`${a}|${b}`:`${b}|${a}`;

function componentMetadata(triangles) {
  const parent=triangles.map((_,index)=>index);
  const find=index=>{while(parent[index]!==index)index=parent[index]=parent[parent[index]];return index;};
  const edgeFaces=new Map();
  for(const [index,triangle] of triangles.entries()) {
    if(!validTriangle(triangle))throw Error('Invalid mounted tool triangle');
    const keys=triangle.vertices.map(pointKey);
    for(let side=0;side<3;side++) {
      const edge=edgeKey(keys[side],keys[(side+1)%3]);
      if(!edgeFaces.has(edge))edgeFaces.set(edge,[]);
      edgeFaces.get(edge).push(index);
    }
  }
  for(const faces of edgeFaces.values())for(const index of faces.slice(1))parent[find(index)]=find(faces[0]);
  const groups=new Map();
  for(const [index,triangle] of triangles.entries()) {
    const root=find(index);
    if(!groups.has(root))groups.set(root,[]);
    groups.get(root).push(triangle);
  }
  const results=[];
  for(const group of groups.values()) {
    const ids=new Set(group.map(triangle=>triangle.id)),all=group.flatMap(triangle=>triangle.vertices);
    let openEdges=0,overfullEdges=0;
    for(const faces of edgeFaces.values()) {
      const count=faces.filter(index=>ids.has(triangles[index].id)).length;
      if(count===1)openEdges++;
      if(count>2)overfullEdges++;
    }
    const triangleIds=[...ids].sort((a,b)=>a-b);
    results.push({id:triangleIds[0],triangleIds,triangles:group,
      bounds:{min:[0,1,2].map(axis=>Math.min(...all.map(point=>point[axis]))),
        max:[0,1,2].map(axis=>Math.max(...all.map(point=>point[axis])))},
      openEdges,overfullEdges,closed:openEdges===0&&overfullEdges===0});
  }
  return results;
}

function source(path,kind) {
  const absolute=realpathSync(resolve(path));
  const relativePath=relative(realpathSync(ROOT),absolute).replaceAll('\\','/');
  const expected=kind==='candidate'?'art-build/first-person-p1/':
    'public/assets/models/wasteland/first-person/';
  if(!relativePath.startsWith(expected)||relativePath.includes('../')||
      (kind==='rpg'&&!relativePath.endsWith('/rpg.glb'))||
      (kind==='wrench'&&!relativePath.endsWith('/wrench.glb')))
    throw Error('Contact source is outside the approved '+kind+' asset path');
  const bytes=readFileSync(absolute);
  if(bytes.toString('ascii',0,4)!=='glTF'||bytes.readUInt32LE(4)!==2)
    throw Error('Contact source is not a GLB: '+kind);
  return {path:relativePath,sha256:createHash('sha256').update(bytes).digest('hex')};
}

function handRegion(bind,key) {
  const hint=bind.hand?.regions?.[key],positions=bind.hand?.positions||{};
  if(!hint||!Array.isArray(hint.center)||!Number.isFinite(hint.radiusMetres))
    throw Error('Missing exported hand region: '+key);
  const faces=(bind.hand.faces||[]).filter(face=>{
    const corners=face.vertexIds.map(id=>positions[id]);
    return corners.every(point=>Array.isArray(point))&&
      distance([0,1,2].map(axis=>corners.reduce((sum,point)=>sum+point[axis],0)/3),
        hint.center)<=hint.radiusMetres;
  });
  const ids=new Set(faces.flatMap(face=>face.vertexIds));
  const selected=[...ids].map(id=>({id:Number(id),position:positions[id]}));
  if(selected.length<6||faces.length<2)throw Error('Actual hand region lacks contact surface: '+key+
    ` (${selected.length} vertices, ${faces.length} faces; center ${JSON.stringify(hint.center)}, radius ${hint.radiusMetres})`);
  return {regionVertices:selected,regionFaces:faces};
}

/** Build stable ID selection from one production-rendered bind snapshot. */
export function createActualContactPlan({candidatePath,rpgPath,wrenchPath,bindSnapshot}) {
  const sources={candidate:source(candidatePath,'candidate'),rpg:source(rpgPath,'rpg'),
    wrench:source(wrenchPath,'wrench')};
  const tools=bindSnapshot?.tools||{};
  const handFor=tool=>({hand:bindSnapshot.handByTool?.[tool]||bindSnapshot.hand});
  const specs=[
    ['rpg-right-handle','rpgBody','R:palm'],
    ['rpg-left-support','rpgBody','L:support'],
    ['rpg-rocket','loadedRocket','L:thumb'],
    ['wrench-handle','wrenchBody','R:palm'],
  ];
  const componentIds={},components={};
  for(const [name,tool,region] of specs) {
    const center=handFor(tool==='wrenchBody'?'wrench':'rpg').hand?.regions?.[region]?.center;
    if(!Array.isArray(center))throw Error('Grip center missing: '+region);
    const groups=componentMetadata(tools[tool]||[]);
    if(!groups.length)throw Error('Mounted tool has no geometry: '+tool);
    // Choose the geometry that actually lies at the authored grip. Closure is
    // measured afterwards, never used to steer selection toward a prop piece.
    groups.sort((a,b)=>nearest(center,a.triangles).gap-nearest(center,b.triangles).gap);
    const chosen=groups[0];components[name]=chosen;
    componentIds[name]={id:chosen.id,triangleIds:chosen.triangleIds,
      bounds:chosen.bounds,closed:chosen.closed,openEdges:chosen.openEdges,
      overfullEdges:chosen.overfullEdges,nearestGripGap:nearest(center,chosen.triangles).gap};
  }
  const mapping=[
    ['rpg:R:palm','R:palm','rpg-right-handle'],
    ['rpg:R:index','R:index','rpg-right-handle'],
    ['rpg:R:thumb','R:thumb','rpg-right-handle'],
    ['rpg:L:support','L:support','rpg-left-support'],
    ['rocket:L:thumb','L:thumb','rpg-rocket'],
    ['rocket:L:index','L:index','rpg-rocket'],
    ['wrench:R:palm','R:palm','wrench-handle'],
    ['wrench:R:thumb','R:thumb','wrench-handle'],
  ];
  const patches={};
  for(const [name,region,component] of mapping) {
    const actual=handRegion(handFor(component==='wrench-handle'?'wrench':'rpg'),region);
    try {
      patches[name]=selectBindContactPatch({...actual,
        handleTriangles:components[component].triangles,
        closedHandleFaces:components[component].triangles,minVertices:6});
    } catch(error) {
      throw Error(`${name}: ${error.message} (${actual.regionVertices.length} vertices, `+
        `${actual.regionFaces.length} faces; nearest component ${componentIds[component].id}, `+
        `gap ${componentIds[component].nearestGripGap.toFixed(4)} m)`);
    }
  }
  return {sources,patches,componentIds};
}

function combinedRocket(thumb,index,requested,actual,sampleStamp,geometryHash) {
  return {minGap:Math.min(thumb.minGap,index.minGap),p90Gap:Math.max(thumb.p90Gap,index.p90Gap),
    maxPenetration:thumb.closed&&index.closed?Math.max(thumb.maxPenetration,index.maxPenetration):null,
    insideCount:thumb.closed&&index.closed?thumb.insideCount+index.insideCount:null,
    closed:thumb.closed&&index.closed,unsupported:thumb.unsupported||index.unsupported,
    selectionHash:sha([thumb.selectionHash,index.selectionHash]),
    sampleStamp,geometryHash,requested,actual,
    subpatches:{thumb:thumb.selectionHash,index:index.selectionHash}};
}

/** Measure only selected actual world-space geometry from production renders. */
export function collectActualCandidateContact({plan,poseSamples}) {
  const frames=[],unsupported=[];
  const componentTool={'rpg-right-handle':'rpgBody','rpg-left-support':'rpgBody',
    'rpg-rocket':'loadedRocket','wrench-handle':'wrenchBody'};
  const triangleCounts={rpgBody:0,loadedRocket:0,wrenchBody:0};
  for(const sample of poseSamples||[]) {
    const {sampleStamp,requested,actual,geometryHash}=sample;
    const contacts=[];
    const isRpg=['idle','aim','fire','reload'].includes(requested?.clip);
    const needed=isRpg ? ['rpg:R:palm','rpg:R:index','rpg:R:thumb',
      ...((requested.clip!=='reload'||requested.progress>=.90)?['rpg:L:support']:[]),
      ...(requested.clip==='reload'&&[.48,.76].some(p=>Math.abs(requested.progress-p)<1e-6)?
        ['rocket:L:thumb','rocket:L:index']:[])] :
      ['wrench:R:palm','wrench:R:thumb'];
    for(const [name,patch] of Object.entries(plan.patches)) {
      if(!needed.includes(name))continue;
      const component=name.startsWith('rpg:R:')?'rpg-right-handle':
        name==='rpg:L:support'?'rpg-left-support':
        name.startsWith('rocket:')?'rpg-rocket':'wrench-handle';
      const tool=componentTool[component],ids=new Set(plan.componentIds[component].triangleIds);
      const posed=(sample.tools?.[tool]||[]).filter(triangle=>ids.has(triangle.id));
      triangleCounts[tool]=Math.max(triangleCounts[tool],posed.length);
      const measured=measureContactFrame({patch,skinnedVertexPositions:sample.hand?.positions||{},
        posedHandleTriangles:posed,posedClosedHandleFaces:posed,
        requested,actual,sampleStamp,geometryHash});
      if(measured.unsupported)unsupported.push({sampleStamp,component,
        openEdges:plan.componentIds[component].openEdges,
        overfullEdges:plan.componentIds[component].overfullEdges});
      contacts.push({name,measurement:measured});
    }
    const one=name=>contacts.find(contact=>contact.name===name)?.measurement;
    const phase=[];
    if(isRpg) {
      for(const region of ['palm','index','thumb'])phase.push({tool:'rpg',hand:'R',region,
        measurement:one(`rpg:R:${region}`)});
      if(requested.clip!=='reload'||requested.progress>=.90)phase.push({tool:'rpg',hand:'L',
        region:'support',measurement:one('rpg:L:support')});
      if(requested.clip==='reload'&&[.48,.76].some(p=>Math.abs(requested.progress-p)<1e-6))
        phase.push({tool:'rpg',hand:'L',region:'rocket-guide',
          measurement:combinedRocket(one('rocket:L:thumb'),one('rocket:L:index'),
            requested,actual,sampleStamp,geometryHash)});
    } else {
      for(const region of ['palm','thumb'])phase.push({tool:'wrench',hand:'R',region,
        measurement:one(`wrench:R:${region}`)});
    }
    frames.push({sampleStamp,requested,actual,geometryHash,contacts:phase});
  }
  const verdict=assessContactSequence({frames});
  if(unsupported.length)verdict.passed=false;
  return {sources:plan.sources,patches:plan.patches,componentIds:plan.componentIds,
    frames,verdict,unsupported,triangleCounts};
}
