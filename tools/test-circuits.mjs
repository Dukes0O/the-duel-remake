import assert from 'node:assert/strict';
import {Course} from '../src/course.js';
import {COURSE,CARS} from '../src/config.js';
import {sweepObstacle} from '../src/collision.js';
let checks=0,maxGrade=0,maxExpansionGrade=0;
const check=(value,message)=>{assert.ok(value,message);checks++;};
for(const seed of[1989,42,17,2026])for(const def of COURSE){
 const course=new Course(def,seed),tag=`${def.id}/${seed}`;
 let roofProbeDone=false;
 check(course.raceLength===course.length*(def.laps||2),`${tag}: ${def.laps||2} complete laps`);
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
 if(course.closed){
 for(const s of[-25,0,80,course.length*.53,course.length-1]){
  const a=course.worldAt(s,4),b=course.worldAt(s+course.length,4);
  check(Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z)<1e-7,`${tag}: seamless lap at ${s}`);
  const near=course.nearest(a.x,a.z,s+course.length);
  check(Math.abs(near.s-s-course.length)<.08,`${tag}: nearest frame retains lap phase`);
 }
 }else{
  for(const [outside,endpoint] of[[-25,0],[course.length+25,course.length]])for(const lateral of[-4,0,4]){
   const a=course.worldAt(outside,lateral),b=course.worldAt(endpoint,lateral);
   check(Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z)<1e-7,`${tag}: open route clamps at ${endpoint}`);
  }
  for(const station of[0,80,course.length*.53,course.length-80,course.length])for(const lateral of[-4,0,4]){
   const point=course.worldAt(station,lateral);
   for(const hint of[-25,station,course.length+25]){
    const near=course.nearest(point.x,point.z,hint);
    check(near.s>=0&&near.s<=course.length,`${tag}: open nearest remains in range`);
    check(Math.abs(near.s-station)<.08,`${tag}: open nearest station ${station} with hint ${hint}`);
    check(Math.abs(near.lateral-lateral)<.08,`${tag}: open nearest lateral`);
   }
  }
 }
 for(let s=0;s<course.length;s+=8){
  const width=course.roadHalfWidthAt(s),previous=course.worldAt(s-4),next=course.worldAt(s+4);
  const grade=Math.abs(next.y-previous.y)/8;
  if(def.expansion||def.script)maxExpansionGrade=Math.max(maxExpansionGrade,grade);else maxGrade=Math.max(maxGrade,grade);
  // In a hairpin (bend radius under 15 m within the next 8 m) the 4.9 m car body cuts the inside of the bend by about half a metre, so the probe on the
  // inside is one metre closer to the centre line (RELEASE-HARBOUR: the Lantern Hairpin, 9 m radius). The outside and all other bends keep the full reach.
  const bend=[0,4,8].map(step=>course.at(s+step).curvature).reduce((worst,k)=>Math.abs(k)>Math.abs(worst)?k:worst),hairpin=Math.abs(bend)>1/15;
  for(const lateral of[-1,0,1].map(side=>side*(Math.min(5,width-2)-(hairpin&&side&&Math.sign(bend)===side?1:0)))){
   const a=course.worldAt(s,lateral),b=course.worldAt(s+4,lateral);
   const body={halfWidth:1.1,halfLength:2.45};
   const contact=course.obstaclesNear(s,s+4).find(o=>{
    // Match sim-contacts' authored overhead contract; all ordinary sweeps stay exact.
    const dimensions=o.verticalClearance?{...body,height:1.35,useModelBounds:false}:body;
    const hit=sweepObstacle(a,b,o,a.heading,dimensions);
    if(o.verticalClearance&&!hit&&!roofProbeDone&&sweepObstacle(a,b,o,a.heading,body)){
     const minY=Math.min(a.y,b.y),lowered={...o,y:minY,minY,maxY:minY+o.height};
     check(!!sweepObstacle(a,b,lowered,a.heading,dimensions),`${tag}: a lowered roof still obstructs the car`);
     roofProbeDone=true;
    }
    return hit;
   });
   check(!contact,`${tag}: ${contact?.id} blocks the road at ${s}/${lateral}`);
  }
 }
 if(course.features.obstacles.some(o=>o.verticalClearance&&o.sourceBounds?.includes('roof')))check(roofProbeDone,`${tag}: overhead clearance regression exercised`);
 for(const section of course.sections){check(course.themeAt((section.start+section.end)/2)===section.theme,`${tag}: section theme`);}
 for(const boundary of[0,...course.sections.map(sec=>sec.start),...course.features.shortcuts.flatMap(c=>[c.start,c.end])])for(const off of[-70,-4,0,4,70]){
  const before=course.groundAt(boundary-.001,off),after=course.groundAt(boundary+.001,off);
  check(Math.abs(before.y-after.y)<.01,`${tag}: continuous ground at ${boundary}/${off}`);
 }
 for(const tunnel of course.features.tunnels){
  if(tunnel.clearance){
   const {width,height}=tunnel.clearance;
   // Every garage car can race Summit, including the 3.6 m Titan.
   const tallest=Math.max(...Object.values(CARS).map(car=>car.height??1.35));
   check(Number.isFinite(width)&&Number.isFinite(height),`${tag}: authored clearance is finite`);
   check(height>=4.5&&height>=tallest+1,`${tag}: authored gallery clears the admitted fleet by one metre`);
   check(tunnel.width*2>=width&&tunnel.height>=height,`${tag}: physical gallery meets its declared clearance`);
   for(let s=tunnel.start;s<=tunnel.end;s=Math.min(tunnel.end,s+8)){
    check(width>=course.roadHalfWidthAt(s)*2,`${tag}: authored gallery clears the road at ${s}`);
    if(s===tunnel.end)break;
   }
   const placements=(def.kitPlacements??[]).filter(row=>row.id==='gallery'&&row.s>=tunnel.start&&row.s<=tunnel.end);
   const sides=(tunnel.collisions??[]).filter(bounds=>bounds.name!=='gallery-heavy-concrete-roof');
   check(placements.length>0&&sides.length>0,`${tag}: authored gallery has placed side bounds`);
   for(const row of placements)for(const bounds of sides){
    const wall=course.features.obstacles.find(o=>o.kitS===row.s&&o.sourceBounds===bounds.name);
    check(wall?.trackWall&&!wall.verticalClearance&&wall.halfX>0&&wall.halfZ>0&&wall.height>0,`${tag}: actual gallery side ${bounds.name} at ${row.s} is solid`);
    const point={x:wall.x,y:wall.y,z:wall.z};
    check(!!sweepObstacle(point,point,wall,wall.heading,{halfWidth:1.1,halfLength:2.45,height:1.35,useModelBounds:false}),`${tag}: actual gallery side catches a vehicle`);
   }
  }else{
  check(tunnel.width>=8&&tunnel.height>=7,`${tag}: tall vehicle tunnel clearance`);
  check(course.features.obstacles.some(o=>o.tunnelWall&&o.s>=tunnel.start&&o.s<tunnel.end),`${tag}: tunnel walls are solid`);
  }
 }
 check(course.features.lapGates.every((gate,i,a)=>gate.s>0&&gate.s<course.length&&(!i||gate.s>a[i-1].s)),`${tag}: ordered lap gates`);
 // Authored Grand Prix circuits (def.script) set their own relief in docs/CIRCUITS.md; their tests check it.
 if(!def.script&&course.sections.some(s=>s.theme==='alpine'))check(Math.max(...course.samples.map(s=>s.y))-Math.min(...course.samples.map(s=>s.y))>60,`${tag}: real mountain climbs`);
}
check(maxGrade<.17,`Maximum road grade remains drivable: ${maxGrade}`);
check(maxExpansionGrade<.32,`Expansion road grade stays within the authored 32% limit: ${maxExpansionGrade}`);
console.log(`Circuit geometry: ${checks} checks across ${COURSE.length} events and four seeds; steepest legacy road ${(maxGrade*100).toFixed(1)}%, expansion ${(maxExpansionGrade*100).toFixed(1)}%.`);
