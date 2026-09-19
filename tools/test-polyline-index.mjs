import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';
import {createPolylineIndex} from '../src/polyline-index.js';
import {Course} from '../src/course.js';
import {COURSE} from '../src/config.js';
import {makeRng} from '../src/rng.js';

let checks=0,queries=0;
const check=(condition,message)=>{assert.ok(condition,message);checks++;};
const equal=(a,b,message)=>{assert.deepEqual(a,b,message);checks++;};
function brute(points,x,z,power=false){
  let index=-1,t=0,distanceSq=Infinity;
  for(let i=1;i<points.length;i++){
    const a=points[i-1],b=points[i],dx=b.x-a.x,dz=b.z-a.z,lengthSq=dx*dx+dz*dz;
    const projection=lengthSq===0?0:Math.max(0,Math.min(1,((x-a.x)*dx+(z-a.z)*dz)/lengthSq));
    const px=x-a.x-projection*dx,pz=z-a.z-projection*dz,d=power?px**2+pz**2:px*px+pz*pz;
    if(d<distanceSq){index=i;t=projection;distanceSq=d;}
  }
  return{index,t,distanceSq};
}
function compare(points,positions,label){
  const before=JSON.stringify(points),index=createPolylineIndex(points);
  for(const[x,z]of positions){
    const result=index.query(x,z);equal(result,brute(points,x,z),`${label}: exact segment, t and squared distance`);
    equal(result,brute(points,x,z,true),`${label}: exact Course exponent arithmetic`);queries++;
  }
  equal(JSON.stringify(points),before,'Index construction and queries do not mutate source points');return index;
}
const empty={index:-1,t:0,distanceSq:Infinity};equal(createPolylineIndex([]).query(0,0),empty);equal(createPolylineIndex([{x:3,z:4}]).query(3,4),empty);
equal(createPolylineIndex([{x:3,z:4},{x:3,z:4}]).query(6,8),{index:1,t:0,distanceSq:25},'A degenerate segment acts as its start point');
for(const value of[undefined,null,{},'not a route']){assert.throws(()=>createPolylineIndex(value),TypeError);checks++;}
for(const point of[{x:NaN,z:0},{x:0,z:Infinity},{x:'1',z:2},{}]){assert.throws(()=>createPolylineIndex([point]),TypeError);checks++;}
const simple=createPolylineIndex([{x:0,z:0},{x:10,z:0}]);for(const value of[NaN,Infinity,-Infinity,'1',null]){assert.throws(()=>simple.query(value,0),TypeError);assert.throws(()=>simple.query(0,value),TypeError);checks+=2;}
const original=[{x:0,z:0},{x:10,z:0}],snapshot=createPolylineIndex(original);original[0].x=100;original.push({x:0,z:5});equal(snapshot.query(3,4),{index:1,t:.3,distanceSq:16},'The index snapshots coordinates and does not follow later source edits');
const retained=snapshot.query(7,3);snapshot.query(-1,-5);equal(retained,{index:1,t:.7,distanceSq:9},'Results are independent objects');
const tiePoints=[];for(let i=0;i<24;i++)tiePoints.push({x:i%2?100:-100,z:i%4<2?0:20});
compare(Object.freeze(tiePoints.map(Object.freeze)),[[0,0],[0,10],[0,20],[-100,0],[100,0],[0,1e15]],'overlaps and exact equidistant ties');
equal(createPolylineIndex(tiePoints).query(0,0).index,1,'Spatial traversal retains the first source segment on exact ties');
compare([{x:-1e12,z:0},{x:1e12,z:0},...Array.from({length:40},(_,i)=>({x:1e12+i*.5,z:2+i}))],[[0,1],[1e11,.001],[-1e12,-5],[1e12,1],[1e15,1e15],[-1e15,-1e15]],'very long segments and far queries');
compare([{x:1,z:1},{x:1,z:1},{x:5,z:1},{x:5,z:1},{x:1,z:1}],[[1,1],[3,2],[5,1],[0,0]],'mixed degenerate, endpoint and retraced segments');
compare([{x:0,z:0},{x:10,z:0}],[[Number.MAX_VALUE,0],[0,-Number.MAX_VALUE]],'finite queries whose squared distances overflow');

// Random polylines include crossing segments, large translations and scales
// that expose unsafe box pruning due to floating-point cancellation.
const rng=makeRng(61429);
for(const scale of[1e-9,.01,1,1e6,1e12])for(let trial=0;trial<8;trial++){
  const offsetX=rng.range(-200,200)*scale,offsetZ=rng.range(-200,200)*scale;
  const points=Array.from({length:50},()=>({x:offsetX+rng.range(-40,40)*scale,z:offsetZ+rng.range(-40,40)*scale}));
  const positions=Array.from({length:120},()=>[offsetX+rng.range(-60,60)*scale,offsetZ+rng.range(-60,60)*scale]);
  positions.push(...points.map(point=>[point.x,point.z]));compare(points,positions,'scaled crossing routes');
}

const benchmarks=[];let buildMs=0;
for(const def of COURSE){
  const course=new Course(def,1989),points=course.samples,coarse=points.filter((_,i)=>i%4===0);if(coarse.at(-1)!==points.at(-1))coarse.push(points.at(-1));
  const minX=Math.min(...points.map(p=>p.x)),maxX=Math.max(...points.map(p=>p.x)),minZ=Math.min(...points.map(p=>p.z)),maxZ=Math.max(...points.map(p=>p.z));
  const positions=[];
  for(let i=0;i<1200;i++){
    if(i%3===0){const p=course.worldAt(rng.range(0,course.length),rng.range(-130,130));positions.push([p.x,p.z]);}
    else positions.push([rng.range(minX-700,maxX+700),rng.range(minZ-700,maxZ+700)]);
  }
  positions.push(...points.map(point=>[point.x,point.z]));
  for(const cut of course.features.shortcuts)for(let s=cut.start;s<=cut.end;s+=13){const p=course.worldAt(s,course.shortcutOffset(cut,s));positions.push([p.x,p.z]);}
  const start=performance.now(),index=createPolylineIndex(points);buildMs+=performance.now()-start;
  for(const[x,z]of positions){equal(index.query(x,z),brute(points,x,z),`${def.id}: unchanged dense route result`);queries++;}
  const coarseIndex=compare(coarse,positions,`${def.id}: unchanged terrain route result`);
  benchmarks.push({name:def.id,points,index,positions,coarse,coarseIndex});
}

// One bounded benchmark after semantic assertions. Timings are reported, not
// gated on a noisy machine-speed threshold. Both paths consume the same work.
function legacyScan(points,x,z){
  let index=-1,t=0,distanceSq=Infinity;
  for(let i=1;i<points.length;i++){
    const a=points[i-1],b=points[i],dx=b.x-a.x,dz=b.z-a.z,projection=Math.max(0,Math.min(1,((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz)));
    const px=x-a.x-projection*dx,pz=z-a.z-projection*dz,d=px*px+pz*pz;
    if(d<distanceSq){index=i;t=projection;distanceSq=d;}
  }
  return{index,t,distanceSq};
}
function timed(indexed,coarse=false){
  let checksum=0;const start=performance.now();
  for(const sample of benchmarks)for(let round=0;round<3;round++)for(const[x,z]of sample.positions){const result=indexed?(coarse?sample.coarseIndex:sample.index).query(x,z):legacyScan(coarse?sample.coarse:sample.points,x,z);checksum+=result.index+result.t;}
  return{ms:performance.now()-start,checksum};
}
const reports=[];for(const coarse of[false,true]){
  timed(true,coarse);timed(false,coarse);const indexed=timed(true,coarse),scanned=timed(false,coarse);equal(indexed.checksum,scanned.checksum,'Timed indexed and legacy runs still produce identical results');
  reports.push(`${coarse?'coarse terrain':'dense course'} ${indexed.ms.toFixed(1)}ms indexed / ${scanned.ms.toFixed(1)}ms scan (${(scanned.ms/indexed.ms).toFixed(2)}×)`);
}
check(COURSE.length>=9,'All nine current events participate in the exact-route audit');
console.log(`Polyline index: ${checks} checks, ${queries} exact dense/coarse/scaled queries across ${COURSE.length} events. Dense index build ${buildMs.toFixed(2)}ms total; bounded benchmarks: ${reports.join('; ')}, with identical checksums.`);
