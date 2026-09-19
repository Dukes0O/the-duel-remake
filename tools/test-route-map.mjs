import assert from 'node:assert/strict';
import {Course} from '../src/course.js';
import {COURSE} from '../src/config.js';
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
  check(near(route[0],route.at(-2))&&near(route[1],route.at(-1)),`${course.def.name} circuit closes on its finish`);
  for(const path of [route,...map.branches.map(branch=>branch.points)])check(path.every((value,index)=>Number.isFinite(value)&&value>=27.99&&value<=(index%2?map.height:map.width)-27.99),`${course.def.name} route and branches fit the inset`);
  const first=routeActorPose(course,map,{s:120,lateral:3,headingError:.2}),second=routeActorPose(course,map,{s:course.length+120,lateral:3,headingError:.2});
  check(near(first.x,second.x)&&near(first.y,second.y)&&near(first.heading,second.heading),`${course.def.name} player heading/position matches on second lap`);
  const center=projectRoutePoint(map,{x:0,z:0}),north=projectRoutePoint(map,{x:0,z:10});check(north.y<center.y,`${course.def.name} positive world Z points up on map`);
  check(near(map.finish.x,route[0])&&near(map.finish.y,route[1]),`${course.def.name} finish stays at circuit start`);
  for(let i=0;i<map.branches.length;i++){
    const branch=map.branches[i],start=projectRoutePoint(map,course.worldAt(branch.start)),end=projectRoutePoint(map,course.worldAt(branch.end)),points=branch.points;
    check(near(points[0],start.x)&&near(points[1],start.y)&&near(points.at(-2),end.x)&&near(points.at(-1),end.y),`${course.def.name} shortcut ${branch.label} joins the actual road at both ends`);
    const cut=course.features.shortcuts[i];let maxSeparation=0;
    for(let n=0;n<=100;n++){const s=cut.start+(cut.end-cut.start)*n/100,main=course.worldAt(s),off=course.worldAt(s,course.shortcutOffset(cut,s));maxSeparation=Math.max(maxSeparation,Math.hypot(main.x-off.x,main.z-off.z));}
    check(maxSeparation>20,`${course.def.name} shortcut ${branch.label} has a distinct branch path`);
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
console.log(`Route map: ${checks} projection, branch and cache checks passed.`);
