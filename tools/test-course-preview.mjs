import assert from 'node:assert/strict';
import {App} from '../src/app.js';
import {COURSE} from '../src/config.js';
import {ROUTE_VARIANTS,supportsRouteVariants} from '../src/route-variants.js';
import {buildCoursePreview,CoursePreview} from '../src/course-preview.js';
let checks=0;const check=(ok,message)=>{assert(ok,message);checks++;};
const memory=new Map();globalThis.localStorage={getItem:key=>memory.get(key)??null,setItem:(key,value)=>memory.set(key,value)};
const app=new App(),natural=COURSE.map((def,index)=>({def,index})).filter(row=>supportsRouteVariants(row.def));
const savedState=JSON.stringify(app.duel.state),savedSeed=app.seed,first=app.getMenuCourse(natural[0].index);
check(first===app.getMenuCourse(natural[0].index),'menu callers share the exact Course object');
check(savedState===JSON.stringify(app.duel.state)&&savedSeed===app.seed&&!app.duel.course,'preview creation leaves menu Duel and seed untouched');
check(app.getMenuCourse(-1)===first&&app.getMenuCourse('bad')===first,'invalid preview indices use first circuit');
const shapes=[];
for(const route of ROUTE_VARIANTS){
  app.setRouteVariant(route.id);
  for(const {def,index}of natural){
    const course=app.getMenuCourse(index),data=buildCoursePreview(course);
    check(course.seed===route.seed&&course.def===def,`${def.id} ${route.label} uses the selected geometry`);
    check(data.laps===def.laps&&data.distanceKm===def.lengthU*def.laps/1000,`${def.id}: distance covers the full race`);
    check(data.biomes.length===new Set(def.sections.map(section=>section.theme)).size,`${def.id}: legend includes unique route biomes`);
    check(data.showElevation&&data.elevation.every(Number.isFinite)&&data.elevation[0]===data.elevation.at(-1),`${def.id}: elevation is finite and closes at the finish`);
    check(data.map.branches.length===course.features.shortcuts.length&&data.map.branches.length>0,`${def.id}: all real shortcuts are shown`);
    check([data.map.route,...data.map.branches.map(branch=>branch.points)].every(points=>points.every((v,i)=>Number.isFinite(v)&&v>=18.99&&v<=(i%2?data.map.height:data.map.width)-18.99)),`${def.id}: road and shortcut paths fit the card`);
    if(index===natural[0].index)shapes.push(Array.from(data.map.route).join(','));
  }
}
check(new Set(shapes).size===3,'Route A/B/C outlines are visibly different');
check(app._menuCourses.size===12,'twelve natural previews fill the cache');
app.menuRouteId='route_a';check(app.getMenuCourse(natural[0].index)===first,'returning to Route A reuses the cached Course');
const retainedKey=`${natural[0].index}:1989`,evictedKey=app._menuCourses.keys().next().value;
for(const [index,def]of COURSE.entries())if(!supportsRouteVariants(def)){
  const course=app.getMenuCourse(index),data=buildCoursePreview(course);check(course.seed===1989&&!data.showElevation,`${def.id}: fixed event uses canonical geometry and hides elevation`);
  check(app._menuCourses.size===12,'course preview cache stays bounded');
}
check(app._menuCourses.has(retainedKey)&&!app._menuCourses.has(evictedKey),'cache evicts oldest unused course and retains recently viewed route');
app.startCampaign({startStage:natural[0].index,mode:'timetrial'});const race=app.duel.course,raceState=JSON.stringify(app.duel.state),raceFeatures=JSON.stringify(race.features),raceSeed=app.duel.state.seed;
check(race!==app.getMenuCourse(natural[0].index),'racing gets a separate Course from the read-only menu preview');
let randomReads=0;const original=race.rng.float;race.rng.float=()=>{randomReads++;return original();};
app.menuRouteId='route_c';const alternate=app.getMenuCourse(natural[0].index);buildCoursePreview(alternate);
check(app.duel.course===race&&JSON.stringify(app.duel.state)===raceState&&JSON.stringify(race.features)===raceFeatures&&app.duel.state.seed===raceSeed&&randomReads===0,'previewing another layout cannot alter active course, physics, features, seed or RNG');

let commands=0,invalidCommands=0;const context=()=>new Proxy({}, {get(target,key){return key in target?target[key]:(...args)=>{if(!args.every(value=>typeof value!=='number'||Number.isFinite(value)))invalidCommands++;commands++;};},set(target,key,value){target[key]=value;return true;}});
const canvas={width:320,height:200,getContext:context,setAttribute(name,value){this[name]=value;}},elevation={width:180,height:28,getContext:context};
const view=new CoursePreview(canvas,elevation),data=view.update(alternate,'Route C'),count=commands;
check(view.update(alternate,'Route C')===data&&commands===count,'unchanged preview reuses geometry and does not redraw');
view.update(alternate,'Custom route');check(view.current===data&&commands>count,'label changes redraw using cached geometry');
check(canvas['aria-label'].includes('2 laps')&&/dashed shortcuts?\./.test(canvas['aria-label'])&&canvas['aria-label'].includes('Custom route'),'canvas describes route, distance and shortcut meaning accessibly');
check(invalidCommands===0&&commands>100,'all canvas operations receive finite coordinates');
view.dispose();check(view.current===null&&view.course===null&&view.canvas===null&&view.context===null,'dispose releases cache and canvas references');
const unavailable=new CoursePreview({...canvas,getContext:()=>null});check(!!unavailable.update(first,'Route A'),'unavailable Canvas2D leaves route metadata usable');unavailable.dispose();
console.log(`Course preview: ${checks} geometry, seed, shared-cache, active-race isolation and static drawing checks passed`);
