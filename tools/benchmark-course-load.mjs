// Read-only course benchmark. A fresh process measures the first preset load
// and subsequent warm constructors; unknown seeds exercise solver/cache cost.
// Example: node tools/benchmark-course-load.mjs --samples=2 --queries=10000
import { performance } from 'node:perf_hooks';
import { Course } from '../src/course.js';
import { COURSE } from '../src/config.js';

const option=(name,fallback,min,max)=>{
  const value=Number(process.argv.find(arg=>arg.startsWith(`--${name}=`))?.split('=')[1]??fallback);
  return Number.isFinite(value)?Math.max(min,Math.min(max,Math.floor(value))):fallback;
};
const seed=option('seed',1989,0,0xffffffff),samples=option('samples',2,1,5),queries=option('queries',10000,1000,100000);
const originals=Object.fromEntries(['_build','_solidScenery','nearest'].map(key=>[key,Course.prototype[key]]));
let active=null;
for(const key of Object.keys(originals))Course.prototype[key]=function(...args){
  if(!active)return originals[key].apply(this,args);
  const start=performance.now();active[key].calls++;
  try{return originals[key].apply(this,args);}finally{active[key].ms+=performance.now()-start;}
};
function construct(definition){
  const stats=Object.fromEntries(Object.keys(originals).map(key=>[key,{ms:0,calls:0}]));
  active=stats;const cpu=process.cpuUsage(),start=performance.now();let course;
  try{course=new Course(definition,seed);}finally{active=null;}
  const wallMs=performance.now()-start,used=process.cpuUsage(cpu);
  return{course,wallMs,cpuMs:(used.user+used.system)/1000,sceneryMs:stats._solidScenery.ms,
    routeAndShortcutMs:stats._build.ms-stats._solidScenery.ms,nearestMs:stats.nearest.ms,nearestCalls:stats.nearest.calls};
}
const round=value=>+value.toFixed(3),median=values=>{const sorted=[...values].sort((a,b)=>a-b),middle=Math.floor(sorted.length/2);return sorted.length%2?sorted[middle]:(sorted[middle-1]+sorted[middle])/2;};
const report=[];
try{
  for(const definition of COURSE){
    const cold=construct(definition),warm=[];
    for(let i=0;i<samples;i++)warm.push(construct(definition));
    const course=warm.at(-1).course;
    report.push({event:definition.id,segments:course.samples.length-1,obstacles:course.features.obstacles.length,shortcuts:course.features.shortcuts.length,
      first:{wallMs:round(cold.wallMs),cpuMs:round(cold.cpuMs),routeAndShortcutMs:round(cold.routeAndShortcutMs),sceneryMs:round(cold.sceneryMs),nearestMs:round(cold.nearestMs),nearestCalls:cold.nearestCalls},
      warm:Object.fromEntries(['wallMs','cpuMs','routeAndShortcutMs','sceneryMs','nearestMs','nearestCalls'].map(key=>[key,round(median(warm.map(run=>run[key])))])),course});
  }
}finally{for(const [key,value]of Object.entries(originals))Course.prototype[key]=value;}

let checksum=0;
for(const row of report){
  const {course}=row;delete row.course;
  const offsets=[0,5,-8,40,-60,100,-160,250,-360,620],points=[];
  for(let i=0;i<queries;i++){
    const s=((i*7919)%queries)/queries*course.length,point=course.worldAt(s,offsets[i%offsets.length]);
    points.push({x:point.x,z:point.z,referenceS:s+(i%3-1)*course.length});
  }
  for(let i=0;i<Math.min(512,points.length);i++){const p=points[i];checksum+=course.nearest(p.x,p.z,p.referenceS).s*.000001;}
  const cpu=process.cpuUsage(),start=performance.now();
  for(const p of points){const nearest=course.nearest(p.x,p.z,p.referenceS);checksum+=nearest.s*.000001+nearest.lateral*.0000001;}
  const wallMs=performance.now()-start,used=process.cpuUsage(cpu);
  row.lookups={queries,wallMs:round(wallMs),cpuMs:round((used.user+used.system)/1000),microsecondsEach:round(wallMs*1000/queries)};
}
console.table(report.map(row=>({event:row.event,firstMs:row.first.wallMs,warmMs:row.warm.wallMs,
  firstRouteMs:row.first.routeAndShortcutMs,warmSceneryMs:row.warm.sceneryMs,warmNearestMs:row.warm.nearestMs,
  callsDuringLoad:row.warm.nearestCalls,lookupUs:row.lookups.microsecondsEach})));
console.log(JSON.stringify({node:process.version,seed,samples,queriesPerCourse:queries,instrumentedConstruction:true,
  notes:'Construction sub-times are inclusive: nearest is mostly inside scenery. First route time includes shortcut cache misses and JIT. Wall time may include contention; CPU milliseconds are reported separately.',
  checksum:round(checksum),courses:report}));
