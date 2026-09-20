import assert from 'node:assert/strict';
import {Course} from '../src/course.js';
import {COURSE} from '../src/config.js';
import {sweepObstacle} from '../src/collision.js';
let checks=0,maxGrade=0,maxExpansionGrade=0;
const check=(value,message)=>{assert.ok(value,message);checks++;};
for(const seed of[1989,42,17,2026])for(const def of COURSE){
 const course=new Course(def,seed),tag=`${def.id}/${seed}`;
 check(course.raceLength===course.length*2,`${tag}: two complete laps`);
 if(def.layout&&def.layout!=='city'&&!def.practice){
  const curves=course.samples.map(p=>p.curvature);
  check(curves.some(k=>k>.00003)&&curves.some(k=>k<-.001),`${tag}: flowing reverse bends`);
  check(Math.max(...curves.map(Math.abs))<1/(def.expansion?84:170),`${tag}: terrain ribbon cannot fold across the road`);
  check(def.layoutVersion>=2,`${tag}: revised geometry uses separate leaderboard records`);
 }
 if(['canyon','highland','harbor','ridge'].includes(def.layout)){
  check(def.layoutVersion>=4,`${tag}: landform revision cannot compare against old times or ghosts`);
  const heights=course.samples.map(p=>p.y),ascent=heights.reduce((total,y,i)=>total+(i?Math.max(0,y-heights[i-1]):0),0);
  check(ascent>50,`${tag}: repeated climbs create meaningful road-height variation`);
  if(def.layout==='canyon')check(Math.max(...heights)-Math.min(...heights)>30,`${tag}: canyon now has visible hills rather than the old 7.6 metre ripple`);
  for(const section of course.sections.filter(sec=>sec.theme==='alpine')){
   const summit=(section.start+section.end)/2,valley=course.at(summit).y;
   const before=course.samples.filter(p=>p.s>summit-course.length*.10&&p.s<summit),after=course.samples.filter(p=>p.s>summit&&p.s<summit+course.length*.10);
   check(Math.max(...before.map(p=>p.y))>valley+1&&Math.max(...after.map(p=>p.y))>valley+1,`${tag}: two mountain crests frame a real saddle`);
  }
 }
 if(def.offroad&&!def.practice){check(course.roadHalfWidthAt(0)===5.5&&!course.features.passingLanes.length,`${tag}: narrow unpainted rally trail`);}
 if(def.practice)check(course.roadHalfWidthAt(0)===24&&!course.features.lapGates.length,`${tag}: broad untimed practice loop`);
 for(const s of[-25,0,80,course.length*.53,course.length-1]){
  const a=course.worldAt(s,4),b=course.worldAt(s+course.length,4);
  check(Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z)<1e-7,`${tag}: seamless lap at ${s}`);
  const near=course.nearest(a.x,a.z,s+course.length);
  check(Math.abs(near.s-s-course.length)<.08,`${tag}: nearest frame retains lap phase`);
 }
 for(let s=0;s<course.length;s+=8){
  const width=course.roadHalfWidthAt(s),previous=course.worldAt(s-4),next=course.worldAt(s+4);
  const grade=Math.abs(next.y-previous.y)/8;
  if(def.expansion)maxExpansionGrade=Math.max(maxExpansionGrade,grade);else maxGrade=Math.max(maxGrade,grade);
  for(const lateral of[-Math.min(5,width-2),0,Math.min(5,width-2)]){
   const a=course.worldAt(s,lateral),b=course.worldAt(s+4,lateral);
   const contact=course.obstaclesNear(s,s+4).find(o=>sweepObstacle(a,b,o,a.heading,{halfWidth:1.1,halfLength:2.45}));
   check(!contact,`${tag}: ${contact?.id} blocks the road at ${s}/${lateral}`);
  }
 }
 for(const section of course.sections){check(course.themeAt((section.start+section.end)/2)===section.theme,`${tag}: section theme`);}
 for(const boundary of[0,...course.sections.map(sec=>sec.start),...course.features.shortcuts.flatMap(c=>[c.start,c.end])])for(const off of[-70,-4,0,4,70]){
  const before=course.groundAt(boundary-.001,off),after=course.groundAt(boundary+.001,off);
  check(Math.abs(before.y-after.y)<.01,`${tag}: continuous ground at ${boundary}/${off}`);
 }
 for(const tunnel of course.features.tunnels){
  check(tunnel.width>=8&&tunnel.height>=7,`${tag}: tall vehicle tunnel clearance`);
  check(course.features.obstacles.some(o=>o.tunnelWall&&o.s>=tunnel.start&&o.s<tunnel.end),`${tag}: tunnel walls are solid`);
 }
 check(course.features.lapGates.every((gate,i,a)=>gate.s>0&&gate.s<course.length&&(!i||gate.s>a[i-1].s)),`${tag}: ordered lap gates`);
 if(course.sections.some(s=>s.theme==='alpine'))check(Math.max(...course.samples.map(s=>s.y))-Math.min(...course.samples.map(s=>s.y))>60,`${tag}: real mountain climbs`);
}
check(maxGrade<.17,`Maximum road grade remains drivable: ${maxGrade}`);
check(maxExpansionGrade<.32,`Expansion road grade stays within the authored 32% limit: ${maxExpansionGrade}`);
console.log(`Circuit geometry: ${checks} checks across ${COURSE.length} events and four seeds; steepest legacy road ${(maxGrade*100).toFixed(1)}%, expansion ${(maxExpansionGrade*100).toFixed(1)}%.`);
