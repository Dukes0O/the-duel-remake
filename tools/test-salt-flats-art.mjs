import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync} from 'node:fs';
import {join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {Course} from '../src/course.js';
import {Duel} from '../src/game.js';
import {CARS} from '../src/config.js';
import {sweepObstacle} from '../src/collision.js';
import {ARENA_VENUES, SCRAPDOME_LAYOUT} from '../src/arena/venues.js';
import {containInArena, floorLimit} from '../src/arena/arena-floor.js';
import {createFeatureFlags} from '../src/feature-flags.js';
import {disposeTree} from '../src/world.js';

// Independent ARENA-06 boundary acceptance. This does not import or change the
// older suite, its selection, assertions or pins. Every case runs by default.
// Director criterion: preserve the original Scrapdome center buffer, rather
// than demanding a zero center/mesh gap or accepting new Salt tuning.
const root=resolve(fileURLToPath(new URL('../',import.meta.url)));
const fitPath=join(root,'tools/art/salt-flats-fit.json');
const fit=JSON.parse(readFileSync(fitPath,'utf8'));
assert.equal(SCRAPDOME_LAYOUT.wallOffset,21,'frozen inherited wall offset');
assert.equal(SCRAPDOME_LAYOUT.floorHalfWidth,18,'frozen inherited floor width');
const clearance=SCRAPDOME_LAYOUT.wallOffset-SCRAPDOME_LAYOUT.floorHalfWidth;
const precision=.002; // Existing native float-export allowance, not a fitting margin.
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const protectedPaths=execFileSync('git',['ls-files'],{cwd:root,encoding:'utf8'}).trim().split(/\r?\n/)
  .filter(path=>path!=='docs/changes/ARENA-06.md'&&path!=='tools/test-salt-flats-art.mjs');
const protectedBefore=protectedPaths.map(path=>[path,hash(readFileSync(join(root,path)))]);
const qaHome=join(root,'.qa-dist');mkdirSync(qaHome,{recursive:true});
const scratch=mkdtempSync(join(qaHome,'salt-boundary-tests-'));
const output=join(scratch,'candidate');
const blender=process.env.BLENDER_EXE||'C:/Users/kyleb/AppData/Local/Programs/Blender/current/blender.exe';
const recipe=join(root,'tools/blender/salt-flats.py');
const buildLog=execFileSync(blender,['-b','--disable-autoexec','--python-exit-code','1','--python',recipe,'--',
  '--root',root,'--output-dir',output,'--fit-config',fitPath,'--seed',String(fit.seed)],
  {cwd:root,encoding:'utf8',timeout:240000,maxBuffer:8*1024*1024});
writeFileSync(join(scratch,'native-build.log'),buildLog);
const bytes=readFileSync(join(output,'venue.glb'));
const manifest=JSON.parse(readFileSync(join(output,'manifest.json'),'utf8'));
assert.equal(bytes.toString('ascii',0,4),'glTF','genuine generated native candidate');
assert.equal(bytes.readUInt32LE(8),bytes.length,'complete actual GLB');
const loader=new GLTFLoader();
// Headless image decoding only; geometry, indices and matrices are native GLB.
loader.register(()=>({name:'SALT_BOUNDARY_TEXTURE',loadTexture:()=>Promise.resolve(new THREE.Texture())}));
const model=await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
model.scene.updateMatrixWorld(true);
const course=new Course(ARENA_VENUES['salt-flats'],fit.seed);
function arena(car='falcone_f42',venueId='salt-flats'){
  const duel=new Duel({seed:fit.seed,featureFlags:createFeatureFlags({storage:null,qa:true,search:'?flags=scrapdome,wasteland2,salt-flats'})});
  assert.equal(duel.startArenaEvent({venueId,car,seed:fit.seed,cpuDifficulty:'medium',
    opponents:[{car:'dusthawk_rally'}]}),true,'actual registered native arena starts');
  return duel;
}
const reference=arena('falcone_f42','scrapdome');
const body=reference._vehicleSpec(reference.state);
const nativeBodies=Object.keys(CARS).map(car=>({car,...reference._vehicleSpec({car})}));
function nativeTriangles(mesh){
  const positions=mesh.geometry.attributes.position,index=mesh.geometry.index,result=[];
  for(let at=0;at<(index?.count??positions.count);at+=3)
    result.push([0,1,2].map(k=>new THREE.Vector3().fromBufferAttribute(positions,index?index.getX(at+k):at+k)
      .applyMatrix4(mesh.matrixWorld).toArray()));
  return result;
}
function clipY(polygon,y,above){
  const clipped=[];
  for(let index=0;index<polygon.length;index++){
    const a=polygon[index],b=polygon[(index+1)%polygon.length];
    const ain=above?a[1]>=y:a[1]<=y,bin=above?b[1]>=y:b[1]<=y;
    if(ain)clipped.push(a);
    if(ain!==bin){const t=(y-a[1])/(b[1]-a[1]);clipped.push(a.map((value,k)=>value+(b[k]-value)*t));}
  }
  return clipped;
}
function bodyFootprints(triangles){
  return triangles.map(triangle=>clipY(clipY(triangle,-precision,true),body.height+precision,false))
    .filter(polygon=>polygon.length).map(polygon=>polygon.map(point=>[point[0],point[2]]));
}
function segmentDistanceSquared(p,a,b){
  const dx=b[0]-a[0],dz=b[1]-a[1],length=dx*dx+dz*dz;
  const t=length?Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dz)/length)):0;
  return (p[0]-a[0]-t*dx)**2+(p[1]-a[1]-t*dz)**2;
}
function polygonDistanceSquared(p,polygon){
  let positive=false,negative=false,area=0,distance=Infinity;
  for(let i=0;i<polygon.length;i++){
    const a=polygon[i],b=polygon[(i+1)%polygon.length];
    const cross=(b[0]-a[0])*(p[1]-a[1])-(b[1]-a[1])*(p[0]-a[0]);
    positive||=cross>1e-12;negative||=cross< -1e-12;
    area+=a[0]*b[1]-b[0]*a[1];distance=Math.min(distance,segmentDistanceSquared(p,a,b));
  }
  return Math.abs(area)>1e-12&&!(positive&&negative)?0:distance;
}
const solids=manifest.features.filter(feature=>feature.collision).map(feature=>{
  const mesh=model.scene.getObjectByName(feature.node);
  assert.ok(mesh?.isMesh,feature.id+': actual solid source mesh');
  const triangles=nativeTriangles(mesh),polygons=bodyFootprints(triangles);
  const bounds=new THREE.Box3().setFromObject(mesh);
  const center=bounds.getCenter(new THREE.Vector3()),side=course.nearest(center.x,center.z).lateral>0?1:-1;
  const obstacle=course.features.obstacles.find(row=>Math.hypot(row.x-center.x,row.z-center.z)<=precision);
  return {feature,mesh,triangles,polygons,bounds,side,obstacle};
});
function nearestVisible(point,side){
  let squared=Infinity,feature=null;
  for(const solid of solids.filter(row=>row.side===side)){
    const dx=Math.max(solid.bounds.min.x-point.x,0,point.x-solid.bounds.max.x);
    const dz=Math.max(solid.bounds.min.z-point.z,0,point.z-solid.bounds.max.z);
    if(dx*dx+dz*dz>squared)continue;
    for(const polygon of solid.polygons){
      const distance=polygonDistanceSquared([point.x,point.z],polygon);
      if(distance<squared){squared=distance;feature=solid.feature.id;}
    }
  }
  return {distance:Math.sqrt(squared),feature};
}
const frames=course.samples.slice(0,-1).flatMap((sample,index)=>{
  const next=course.samples[index+1];return [sample.s,(sample.s+next.s)/2];
});
const measured=[];
for(const side of [-1,1])for(const s of frames){
  const at=course.worldAt(s,side*floorLimit({course}));
  measured.push({side,s,x:at.x,z:at.z,...nearestVisible(at,side)});
}
const checks=[],check=(name,run)=>checks.push({name,run});
check('native source triangles, genuine body and frozen floor buffer are measurable',()=>{
  assert.equal(clearance,3);assert.equal(body.halfWidth,1.02);assert.equal(body.halfLength,2.35);
  assert.equal(body.height,1.35);assert.ok(solids.length>0);
  for(const solid of solids){assert.ok(solid.triangles.length>0);assert.ok(solid.polygons.length>0);}
});
for(const car of Object.keys(CARS))check(car+': exact inherited floor containment remains body independent',()=>{
  const duel=arena(car),state=duel.state;
  const spec=duel._vehicleSpec(state);assert.ok(spec.halfWidth>0&&spec.halfLength>0&&spec.height>0);
  assert.equal(floorLimit(duel),SCRAPDOME_LAYOUT.floorHalfWidth,'Salt preserves inherited floor width');
  for(const side of [-1,1]){
    state.s=course.length/8;state.lateral=side*floorLimit(duel);state.speedMph=20;
    state.headingError=side*Math.PI/2;state.pushVelocity=0;
    assert.equal(containInArena(duel,state,1/120),0,'exact band edge is allowed');
    state.lateral+=side*precision;
    assert.equal(containInArena(duel,state,1/120),20,'genuine outward movement reaches the wall rule');
    assert.equal(state.lateral,side*SCRAPDOME_LAYOUT.floorHalfWidth,'center is clamped by unchanged floor rule');
    assert.equal(state.speedMph,4,'existing steep contact loses eighty percent of speed');
  }
});
check('all native visible solid envelopes retain actual Course collision correspondence',()=>{
  for(const solid of solids){
    assert.ok(solid.obstacle,solid.feature.id+': native obstacle corresponds to visible source');
    for(const [axis,half]of [['x','halfX'],['z','halfZ']]){
      assert.ok(Math.abs(solid.obstacle[axis]-(solid.bounds.min[axis]+solid.bounds.max[axis])/2)<=precision);
      const index=axis==='x'?0:2;
      const exported=solid.feature.collision.halfExtents[index];
      const padding=exported-(solid.bounds.max[axis]-solid.bounds.min[axis])/2;
      assert.ok(padding>=-1e-6&&padding<=precision+1e-6,solid.feature.id+': float-only native envelope');
      assert.ok(Math.abs(solid.obstacle[half]-exported)<=precision,solid.feature.id+': Course retains native envelope');
    }
    const obstacle=solid.obstacle,from={x:obstacle.x-obstacle.halfX-body.halfWidth-1,y:0,z:obstacle.z};
    const to={x:obstacle.x,y:0,z:obstacle.z};
    const hit=sweepObstacle(from,to,obstacle,0,body);
    assert.ok(hit,solid.feature.id+': actual ground-level car sweep is solid');
    assert.ok(solid.polygons.length,'solid contact is backed by actual body-height source triangles');
  }
});
for(const side of [-1,1])for(let quarter=0;quarter<4;quarter++)check(
  (side>0?'outer wall':'inner island')+' quadrant '+(quarter+1)+': full native frames and segment midpoints have visible correspondence',()=>{
    const rows=measured.filter(row=>row.side===side&&row.s>=quarter*course.length/4&&row.s<(quarter+1)*course.length/4);
    assert.ok(rows.length>0);
    const bad=rows.filter(row=>row.distance>clearance+precision);
    const worst=[...rows].sort((a,b)=>b.distance-a.distance)[0];
    assert.equal(bad.length,0,JSON.stringify({reason:'invisible band boundary exceeds inherited3m buffer',
      stations:rows.length,unbacked:bad.length,worst}));
  });
for(const side of [-1,1])check((side>0?'outer wall':'inner island')+': every native band frame has a genuine body-blocking solid for every native car',()=>{
  const obstacles=solids.filter(row=>row.side===side).map(row=>row.obstacle).filter(Boolean),missing=[];
  for(const spec of nativeBodies){const stations=[];
    for(const s of frames){
      const heading=course.at(s).heading;
      const from=course.worldAt(s,side*SCRAPDOME_LAYOUT.floorHalfWidth);
      const to=course.worldAt(s,side*SCRAPDOME_LAYOUT.wallOffset);
      const hit=obstacles.map(obstacle=>sweepObstacle({...from,y:0},{...to,y:0},obstacle,heading,spec)).find(Boolean);
      if(!hit)stations.push(s);
    }
    if(stations.length)missing.push({car:spec.car,missing:stations.length,first:stations.slice(0,8)});
  }
  assert.equal(missing.length,0,JSON.stringify({reason:'floor wall has no real car contact in inherited buffer',
    stations:frames.length,cars:missing}));
});
check('genuine shorter Dusthawk sweep prevents a Falcone-only solidity claim',()=>{
  const wall=reference.course.features.barriers.find(row=>row.arenaWall);
  assert.ok(wall,'actual inherited physical wall');
  const dusthawk=nativeBodies.find(row=>row.car==='dusthawk_rally');
  assert.ok(dusthawk.halfLength<body.halfLength,'genuine shorter playable car');
  const delta=wall.halfX+(body.halfLength+dusthawk.halfLength)/2;
  const point={x:wall.x+Math.cos(wall.heading)*delta,y:wall.y,z:wall.z-Math.sin(wall.heading)*delta};
  assert.ok(sweepObstacle(point,point,wall,wall.heading+Math.PI/2,body),'same native position touches Falcone');
  assert.equal(sweepObstacle(point,point,wall,wall.heading+Math.PI/2,dusthawk),null,'same native position clears shorter Dusthawk');
});
// Continuity uses genuine donor subsets of native triangle indices, not a
// merged-mesh AABB spanning gaps. The contact expansion is exactly the existing
// sweepObstacle projected car shell. No new aperture size is chosen.
const pieces=manifest.sourceInstances.map(instance=>{
  const solid=solids.find(row=>row.feature.node===instance.node);if(!solid)return null;
  const polygons=bodyFootprints(solid.triangles.slice(instance.triangleStart,
    instance.triangleStart+instance.sourceTriangleIndices.length));
  if(!polygons.length)return null;
  const points=polygons.flat(),low=[0,1].map(axis=>Math.min(...points.map(point=>point[axis])));
  const high=[0,1].map(axis=>Math.max(...points.map(point=>point[axis])));
  const center=low.map((value,axis)=>(value+high[axis])/2);
  const heading=course.at(course.nearest(center[0],center[1]).s).heading;
  const c=Math.abs(Math.cos(heading)),s=Math.abs(Math.sin(heading));
  // This is the conservative component-wise minimum support of all genuine
  // native shells at this ring frame, not an invented aperture margin.
  const support=[Math.min(...nativeBodies.map(spec=>spec.halfWidth*c+spec.halfLength*s)),
    Math.min(...nativeBodies.map(spec=>spec.halfLength*c+spec.halfWidth*s))];
  return {node:instance.node,side:solid.side,low:low.map((v,k)=>v-support[k]),high:high.map((v,k)=>v+support[k])};
}).filter(Boolean);
const TAU=Math.PI*2;
function overlap(a,b){return [0,1].every(axis=>a.low[axis]<=b.high[axis]&&b.low[axis]<=a.high[axis]);}
function center(piece){return piece.low.map((value,axis)=>(value+piece.high[axis])/2);}
function angleStep(a,b){return Math.atan2(a[0]*b[1]-a[1]*b[0],a[0]*b[0]+a[1]*b[1]);}
function edgeTurn(a,b){
  // The connection travels through the actual rectangle intersection. Both
  // halves stay inside their native contact footprints, unlike a shortcut
  // between arbitrary centers. A closed nonzero-winding walk encloses origin.
  const junction=[0,1].map(axis=>(Math.max(a.low[axis],b.low[axis])+Math.min(a.high[axis],b.high[axis]))/2);
  return angleStep(center(a),junction)+angleStep(junction,center(b));
}
function enclosure(rows){
  const remaining=new Set(rows.map((_,i)=>i)),components=[],cycles=[];
  while(remaining.size){
    const rootIndex=remaining.values().next().value;
    const queue=[rootIndex],component=[],turns=new Map([[rootIndex,0]]);remaining.delete(rootIndex);
    while(queue.length){
      const i=queue.shift();component.push(i);
      // A genuinely filled contact footprint containing origin has its own
      // closed rectangular outline. Otherwise prove a connected winding cycle.
      if(rows[i].low[0]<0&&rows[i].high[0]>0&&rows[i].low[1]<0&&rows[i].high[1]>0)
        cycles.push({type:'native-origin-containing-footprint',node:rows[i].node});
      for(let j=0;j<rows.length;j++)if(j!==i&&overlap(rows[i],rows[j])){
        const turn=turns.get(i)+edgeTurn(rows[i],rows[j]);
        if(!turns.has(j)){turns.set(j,turn);remaining.delete(j);queue.push(j);}
        else {const winding=Math.round((turn-turns.get(j))/TAU);
          if(winding!==0)cycles.push({type:'connected-native-footprint-cycle',edge:[i,j],winding});}
      }
    }
    components.push(component);
  }
  return {components,cycles};
}
for(const side of [-1,1])check((side>0?'outer wall':'inner island')+': native donor footprints form a closed connected cycle for the smallest native shell',()=>{
  const rows=pieces.filter(row=>row.side===side);assert.ok(rows.length>0);
  const proof=enclosure(rows);
  assert.ok(proof.cycles.length,JSON.stringify({reason:'no closed connected native body-blocking cycle around bowl origin',
    donorPieces:rows.length,componentSizes:proof.components.map(row=>row.length)}));
});
check('enclosure proof rejects an angularly covering connected spiral without a closed footprint cycle',()=>{
  // Explicit mathematical negative control, not a substitute game asset.
  // These rectangles form one winding open staircase: every direction has a
  // projection, but its two ends have different radii and leave a real opening.
  const boxes=[
    [[2,-.5],[4,.5]],[[3,0],[4,4]],[[-4,3],[4,4]],[[-4,-4],[-3,4]],
    [[-4,-4],[7,-3]],[[6,-4],[7,7]],[[-7,6],[7,7]],[[-7,-7],[-6,7]]
  ].map(([low,high],index)=>({low,high,node:'mathematical-control-'+index}));
  const proof=enclosure(boxes);
  assert.equal(proof.components.length,1,'negative control is connected');
  assert.equal(proof.cycles.length,0,'angular projection coverage cannot replace a closed cycle');
});
for(const side of [-1,1])check((side>0?'outer wall':'inner island')+': stopped native boundary has actual visible surface instead of distant flat salt',()=>{
  const witness=[...measured.filter(row=>row.side===side)].sort((a,b)=>b.distance-a.distance)[0];
  const duel=arena(),actor=duel.state;
  actor.s=witness.s;actor.lateral=side*(floorLimit(duel)+precision);actor.headingError=side*Math.PI/2;
  actor.speedMph=20;actor.pushVelocity=0;
  assert.equal(containInArena(duel,actor,1/120),20);
  assert.equal(actor.lateral,side*floorLimit(duel),'real player is stopped by native floor rule');
  const at=duel.course.groundAt(actor.s,actor.lateral),visible=nearestVisible(at,side);
  assert.ok(visible.distance<=clearance+precision,JSON.stringify({reason:'player stops on salt away from visible solid',
    s:actor.s,lateral:actor.lateral,x:at.x,z:at.z,groundY:at.y,...visible}));
});
check('native closed loop and seeded floor/body rules repeat without save storage',()=>{
  assert.deepEqual(new Course(ARENA_VENUES['salt-flats'],fit.seed).features,course.features);
  const first=course.worldAt(0,18),last=course.worldAt(course.length,18);
  assert.deepEqual(first,last);
  for(const s of frames){
    const point=course.worldAt(s,0),nearest=course.nearest(point.x,point.z);
    assert.ok(Math.abs(nearest.lateral)<=precision,'actual native loop maps back to the floor');
  }
});
check('protected source, fit, settings, old tests, pins, public and flags remain byte exact',()=>{
  for(const [path,before]of protectedBefore)assert.equal(hash(readFileSync(join(root,path))),before,path);
});
const results=[];
for(const {name,run}of checks){
  try{await run();results.push({name,pass:true});console.log('PASS '+name);}
  catch(error){results.push({name,pass:false,message:error.message});console.error('FAIL '+name+': '+error.message);}
}
const receipt={sourceCommit:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),
  frozenReference:{floorHalfWidth:SCRAPDOME_LAYOUT.floorHalfWidth,wallOffset:SCRAPDOME_LAYOUT.wallOffset,
    maximumVisibleClearance:clearance,precision},body,nativeBodies,glb:{bytes:bytes.length,sha256:hash(bytes)},
  measured,results,protectedBefore,scratch};
writeFileSync(join(scratch,'boundary-receipt.json'),JSON.stringify(receipt,null,2)+'\n');
disposeTree(model.scene);
const failures=results.filter(row=>!row.pass).length;
console.log('Salt Flats boundary: '+checks.length+' checks, '+(checks.length-failures)+' passed, '+failures+' failed. Receipt: '+join(scratch,'boundary-receipt.json'));
if(failures)process.exitCode=1;

