import assert from 'node:assert/strict';
import {Course} from '../src/course.js';
import {COURSE} from '../src/config.js';
import {ALL_CIRCUITS} from '../src/circuits/index.js';
import {RouteMap,buildRouteMapGeometry,projectRoutePoint,routeActorPose,routePhase} from '../src/route-map.js';
let checks=0;const check=(value,label)=>{assert(value,label);checks++;};
const near=(a,b,tolerance=.001)=>Math.abs(a-b)<tolerance;
check(routePhase(-20,1000)===980,'negative starting grid progress wraps behind start');
check(routePhase(2250,1000)===250,'multiple laps project to the same physical route');
check(routePhase(1200,1000,false)===1000,'open route distance clamps to finish');
const courses=COURSE.map(def=>new Course(def,1989));
for(const course of courses){
  const map=buildRouteMapGeometry(course),route=map.route;
  check(map.sections.length===course.sections.length,`${course.def.name} includes every section`);
  if(course.closed)check(near(route[0],route.at(-2))&&near(route[1],route.at(-1)),`${course.def.name} circuit closes on its finish`);
  else{
    const start=projectRoutePoint(map,course.worldAt(0)),finish=projectRoutePoint(map,course.worldAt(course.length));
    check(near(route[0],start.x)&&near(route[1],start.y)&&near(route.at(-2),finish.x)&&near(route.at(-1),finish.y),`${course.def.name} open map preserves actual start and finish`);
    check(Math.hypot(start.x-finish.x,start.y-finish.y)>1,`${course.def.name} open route has distinct endpoints`);
  }
  for(const path of [route,...map.branches.map(branch=>branch.points)])check(path.every((value,index)=>Number.isFinite(value)&&value>=27.99&&value<=(index%2?map.height:map.width)-27.99),`${course.def.name} route and branches fit the inset`);
  const first=routeActorPose(course,map,{s:120,lateral:3,headingError:.2}),second=routeActorPose(course,map,{s:course.length+120,lateral:3,headingError:.2});
  if(course.closed)check(near(first.x,second.x)&&near(first.y,second.y)&&near(first.heading,second.heading),`${course.def.name} player heading/position matches on second lap`);
  else{
    const start=routeActorPose(course,map,{s:0,lateral:3,headingError:.2}),before=routeActorPose(course,map,{s:-120,lateral:3,headingError:.2}),finish=routeActorPose(course,map,{s:course.length,lateral:3,headingError:.2});
    check(near(before.x,start.x)&&near(before.y,start.y)&&near(before.heading,start.heading),`${course.def.name} actor clamps before open start`);
    check(near(second.x,finish.x)&&near(second.y,finish.y)&&near(second.heading,finish.heading),`${course.def.name} actor clamps beyond open finish`);
    check(Math.hypot(first.x-second.x,first.y-second.y)>1,`${course.def.name} later distance does not wrap onto an imaginary second lap`);
  }
  const center=projectRoutePoint(map,{x:0,z:0}),north=projectRoutePoint(map,{x:0,z:10});check(north.y<center.y,`${course.def.name} positive world Z points up on map`);
  if(course.def.practice)check(map.finish===null&&map.finishHeading===null,`${course.def.name} has no finish marker`);
  else if(course.closed)check(near(map.finish.x,route[0])&&near(map.finish.y,route[1]),`${course.def.name} finish stays at circuit start`);
  else check(near(map.finish.x,route.at(-2))&&near(map.finish.y,route.at(-1)),`${course.def.name} open finish stays at the actual route end`);
  for(let i=0;i<map.branches.length;i++){
    const branch=map.branches[i],start=projectRoutePoint(map,course.worldAt(branch.start)),end=projectRoutePoint(map,course.worldAt(branch.end)),points=branch.points;
    check(near(points[0],start.x)&&near(points[1],start.y)&&near(points.at(-2),end.x)&&near(points.at(-1),end.y),`${course.def.name} shortcut ${branch.label} joins the actual road at both ends`);
    const cut=course.features.shortcuts[i];let maxSeparation=0;
    for(let n=0;n<=100;n++){const s=cut.start+(cut.end-cut.start)*n/100,main=course.worldAt(s),off=course.worldAt(s,course.shortcutOffset(cut,s));maxSeparation=Math.max(maxSeparation,Math.hypot(main.x-off.x,main.z-off.z));}
    const authored=course.def.roadBranches?.find(row=>row.id===cut.id);
    if(authored)check(Math.abs(maxSeparation-Math.abs(authored.offset))<.001,`${course.def.name} branch ${branch.label} preserves its authored separation`);
    else check(maxSeparation>20,`${course.def.name} shortcut ${branch.label} has a distinct branch path`);
    check(Number.isFinite(branch.marker.x)&&Number.isFinite(branch.marker.y),`${course.def.name} branch label follows the greatest path separation`);
  }
  if(map.branches.length>=2)check(map.branches[0].color!==map.branches[1].color,`${course.def.name} shortcut branches have distinct colors`);
}
// Rendering cache check: the second frame only projects the three actors.
globalThis.Path2D=class {moveTo(){}lineTo(){}};
const context=()=>new Proxy({}, {get(target,key){if(key in target)return target[key];return ()=>{};},set(target,key,value){target[key]=value;return true;}});
let canvases=0;const ownerDocument={createElement(){canvases++;return {getContext:context};}};
const canvas={width:400,height:280,ownerDocument,dataset:{},getContext:context,setAttribute(name,value){this[name]=value;}};
const mapView=new RouteMap(canvas),course=courses[0],original=course.worldAt.bind(course);let worldCalls=0;course.worldAt=(...args)=>{worldCalls++;return original(...args);};
const state={s:130,lateral:2,headingError:.15,lap:1,currentLap:1,shortcutId:null,rival:{s:90,lateral:-2},police:{pursuit:{active:true,s:20,lateral:-3}}};
mapView.update(course,state,0);const cached=mapView.current;check(canvases===1,'static canvas built once for first course');worldCalls=0;mapView.update(course,state,70);check(mapView.current===cached&&canvases===1,'successive frames reuse cached geometry and raster');check(worldCalls===3,'dynamic draw projects only player, rival and patrol');check(canvas['aria-label'].includes('police patrol')&&canvas['aria-label'].includes('heading'),'map has useful accessible actor text');
mapView.update(courses[1],state,140);mapView.update(course,{...state,currentLap:2,s:course.length+130},210);check(mapView.current===cached&&canvases===2,'returning to a cached Course does not rebuild its geometry');check(canvas.dataset.lap==='2','lap display follows second lap');
mapView.dispose();check(mapView.current===null&&mapView.context===null&&mapView.canvas===null,'dispose releases current geometry and canvas references');

// Course heading grows to the driver's left; canvas clockwise is positive.
for(const def of new Map([...COURSE,...ALL_CIRCUITS].map(d=>[d.id,d])).values()){
 const c=new Course(def,1989),g=buildRouteMapGeometry(c);
 const corners=c.script?.pieces.filter(p=>p.kind==='turn'&&p.name)??c.features.turns.map(t=>({name:`bend ${t.s}`,s0:t.s-3,s1:t.s+3}));
 for(const corner of corners){
  const mid=((corner.s0+corner.s1)/2%c.length+c.length)%c.length;
  const samples=c.samples.slice(0,-1),index=samples.reduce((best,row,i)=>Math.abs(row.s-mid)<Math.abs(samples[best].s-mid)?i:best,0);
  const a=samples[(index-1+samples.length)%samples.length],b=samples[index],d=samples[(index+1)%samples.length],pa=projectRoutePoint(g,a),pb=projectRoutePoint(g,b),pd=projectRoutePoint(g,d);
  const cross=(pb.x-pa.x)*(pd.y-pb.y)-(pb.y-pa.y)*(pd.x-pb.x),curvature=b.curvature;
  check(Math.abs(curvature)>1e-7,`${def.id}: ${corner.name} samples contain its actual bend`);
  check(cross*curvature<0,`${def.id}: ${corner.name} map follows actual road turn direction`);
 }
 const pose=routeActorPose(c,g,{s:120,lateral:0,headingError:.2});check(near(pose.heading,-(c.worldAt(120).heading+.2)),`${def.id}: actor heading follows mirrored road`);
 if(g.finish)check(near(g.finishHeading,-c.at(c.closed?0:c.length).heading),`${def.id}: finish follows mirrored road`);
}

console.log(`Route map: ${checks} projection, branch, cache and actual-corner handedness checks passed.`);
