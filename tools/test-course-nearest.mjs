import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import { Course } from '../src/course.js';
import { COURSE } from '../src/config.js';
import { makeRng } from '../src/rng.js';

// Frozen pre-index Course.nearest, including all three road-frame refinements.
// Equality here covers final game coordinates, not only the BVH segment seed.
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
function originalNearest(x,z,referenceS){let best=Infinity,bestS=0;
  for(let i=1;i<this.samples.length;i++){const a=this.samples[i-1],b=this.samples[i],dx=b.x-a.x,dz=b.z-a.z,t=clamp(((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz)),d=(x-a.x-t*dx)**2+(z-a.z-t*dz)**2;if(d<best){best=d;bestS=a.s+t*this.step;}}
  for(let i=0;i<3;i++){const f=this.at(bestS),lat=(x-f.x)*Math.cos(f.heading)-(z-f.z)*Math.sin(f.heading),along=(x-f.x)*Math.sin(f.heading)+(z-f.z)*Math.cos(f.heading);bestS=this.phase(bestS+along/Math.max(.3,1-f.curvature*lat));}
  const frame=this.at(bestS),lateral=(x-frame.x)*Math.cos(frame.heading)-(z-frame.z)*Math.sin(frame.heading);
  if(Number.isFinite(referenceS))bestS+=Math.round((referenceS-bestS)/this.length)*this.length;
  return{...frame,s:bestS,lateral,distance:Math.hypot(x-frame.x,z-frame.z)};}

// Open routes use the same frozen brute-force search and three refinements,
// but have no absolute lap to recover. The historical closed oracle above stays exact.
const expectedNearest=function(x,z,referenceS){return originalNearest.call(this,x,z,this.closed?referenceS:undefined);};

let checks=0,queries=0;const equal=(a,b,label)=>{assert.deepEqual(a,b,label);checks++;};
const random=makeRng(977013),indexedNearest=Course.prototype.nearest,fixtures=[];
for(const definition of COURSE){
  const course=new Course(definition,1989);let original;
  try{Course.prototype.nearest=expectedNearest;original=new Course(definition,1989);}finally{Course.prototype.nearest=indexedNearest;}
  equal(course.samples,original.samples,`${definition.id}: indexing never changes route samples`);
  equal(course.features,original.features,`${definition.id}: every generated feature and collision hull is identical`);
  const positions=[];
  const add=(s,lateral)=>{const p=course.worldAt(s,lateral);positions.push({x:p.x,z:p.z,referenceS:s});};
  // Segment endpoints, midpoints, bends, both boundary thresholds, all nearby
  // driving offsets and very distant landscape positions.
  for(let s=0;s<course.length;s+=8){add(s,0);add(s+4,(Math.floor(s/8)%2?1:-1)*5);add(s,Math.floor(s/8)%2?78:-60);}
  for(const s of[0,.000001,course.length-.000001,...course.sections.map(section=>section.start),...course.features.lapGates.map(gate=>gate.s),...course.features.rushGates.map(gate=>gate.s)])
    for(const offset of[-115,-78,-60,-7,0,7,60,78,115])for(const delta of[-.000001,0,.000001])add(s+delta,offset);
  for(const branch of course.features.shortcuts)for(let s=branch.start;s<=branch.end;s+=13)for(const side of[-1,0,1])add(s,course.shortcutOffset(branch,s)+side*(branch.halfWidth+1.6));
  const bounds={minX:Math.min(...course.samples.map(p=>p.x)),maxX:Math.max(...course.samples.map(p=>p.x)),minZ:Math.min(...course.samples.map(p=>p.z)),maxZ:Math.max(...course.samples.map(p=>p.z))};
  for(let i=0;i<900;i++)positions.push({x:random.range(bounds.minX-2500,bounds.maxX+2500),z:random.range(bounds.minZ-2500,bounds.maxZ+2500),referenceS:random.range(-course.length,course.raceLength+course.length)});
  for(const x of[-1e9,1e9])for(const z of[-1e9,1e9])positions.push({x,z,referenceS:course.raceLength});
  for(const p of positions)for(const reference of[undefined,p.referenceS,p.referenceS+course.length*7]){
    equal(course.nearest(p.x,p.z,reference),expectedNearest.call(course,p.x,p.z,reference),`${definition.id}: exact complete nearest result including absolute lap phase`);queries++;
  }
  if(!course.closed)for(const s of[-25,0,course.length/2,course.length,course.length+25])for(const lateral of[-4,0,4]){
    const p=course.worldAt(s,lateral),endpoint=course.worldAt(clamp(s,0,course.length),lateral);
    equal(p,endpoint,`${definition.id}: out-of-range world distance clamps to its endpoint`);
    for(const hint of[-course.length,s,course.length*8]){
      const result=course.nearest(p.x,p.z,hint);
      assert.ok(result.s>=0&&result.s<=course.length&&Math.abs(result.s-clamp(s,0,course.length))<.04&&Math.abs(result.lateral-lateral)<.04,`${definition.id}: real open world inverse ignores lap hints`);checks++;
    }
  }
  fixtures.push({course,positions});
}

function timed(indexed){let checksum=0;const start=performance.now();
  for(const {course,positions}of fixtures)for(const p of positions){const result=(indexed?indexedNearest:expectedNearest).call(course,p.x,p.z,p.referenceS);checksum+=result.s+result.lateral*.01+result.distance*.001;}
  return{ms:performance.now()-start,checksum};}
timed(true);timed(false);const indexed=timed(true),original=timed(false);
equal(indexed.checksum,original.checksum,'benchmark consumes exactly identical complete results');
console.log(`Course nearest: ${checks} checks, ${queries} exact complete queries across ${COURSE.length} courses; all samples/features/colliders unchanged. Bounded lookup timing ${indexed.ms.toFixed(1)}ms indexed / ${original.ms.toFixed(1)}ms original (${(original.ms/indexed.ms).toFixed(2)}x).`);
