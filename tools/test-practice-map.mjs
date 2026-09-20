import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {Course} from '../src/course.js';
import {COURSE} from '../src/config.js';
import {freestyleLayout} from '../src/freestyle-course.js';
import {buildCoursePreview,CoursePreview} from '../src/course-preview.js';
import {buildRouteMapGeometry,projectRoutePoint,RouteMap,PRACTICE_MAP_LEGEND} from '../src/route-map.js';

let checks=0;const check=(v,label)=>{assert.ok(v,label);checks++;},equal=(a,b,label)=>{assert.deepEqual(a,b,label);checks++;};
// Captured before this practice-only patch: preserve every public map/preview
// value, every Float32 path and every marker on the original fifteen courses.
const legacy=createHash('sha256');
for(const def of COURSE.filter(def=>!def.practice)){const c=new Course(def,1989);legacy.update(JSON.stringify([buildRouteMapGeometry(c),buildCoursePreview(c)]));}
equal(legacy.digest('hex'),'4a35afd7b957069ab89f165f5b01e2c3371ceb8f638a554fd899962348411f4a','all fifteen race maps and previews remain byte-identical');
const course=new Course(COURSE.find(def=>def.practice),1989),before=JSON.stringify(course.features),layout=freestyleLayout(course),preview=buildCoursePreview(course),map=preview.map;
equal(preview.biomes.map(b=>b.label),['Quarry'],'practice is Quarry, not Stadium');equal(preview.laps,0,'practice has no lap objective');equal(preview.distanceKm,0,'practice does not claim a race distance');
check(!preview.showElevation&&preview.elevation.length===0&&preview.reliefMeters===null,'practice does not claim relief from its flat centerline');equal(map.finish,null,'no practice finish geometry');
equal(map.practiceMarkers.filter(p=>p.kind==='jump').length,3,'all three actual jump mounds are marked');equal(map.practiceMarkers.filter(p=>p.kind==='climb').length,1,'actual climbing hill is marked');
equal(map.practiceMarkers.filter(p=>p.kind==='rocks').length,1,'one distinct rock-garden marker');equal(map.practiceMarkers.filter(p=>p.kind==='crush').length,3,'all three actual crush lanes are marked');
for(const mound of layout.mounds){const marker=map.practiceMarkers.find(p=>p.id===mound.id);equal(marker.marker,projectRoutePoint(map,course.worldAt(mound.s,mound.off)),`${mound.id}: marker follows authored world location`);}
equal(map.practiceMarkers.find(p=>p.kind==='rocks').sourceIds.length,course.features.rocks.length,'rock marker represents the real rock garden');
equal(map.practiceMarkers.filter(p=>p.kind==='crush').flatMap(p=>p.sourceIds).sort(),course.features.crushables.map(p=>p.id).sort(),'crush markers represent every actual salvage car exactly once');
for(const feature of map.practiceMarkers)check(Number.isFinite(feature.marker.x+feature.marker.y)&&feature.marker.x>=32&&feature.marker.x<=map.width-32&&feature.marker.y>=32&&feature.marker.y<=map.height-32,'activity marker fits map and leaves room for legend');
equal(JSON.stringify(course.features),before,'practice map never changes terrain/features/physics');

globalThis.Path2D=class{moveTo(){}lineTo(){}};
const commands=[];const context=()=>new Proxy({}, {get(o,key){return key in o?o[key]:(...args)=>{for(const value of args)if(typeof value==='number')check(Number.isFinite(value),'finite canvas coordinate');commands.push([key,...args]);};},set(o,key,value){o[key]=value;return true;}});
const ownerDocument={createElement:()=>({getContext:context})};
const canvas=()=>({width:320,height:200,ownerDocument,dataset:{},getContext:context,setAttribute(key,value){this[key]=value;}});
const pCanvas=canvas(),eCanvas=canvas(),view=new CoursePreview(pCanvas,eCanvas);view.update(course,'Free exploration');
check(!commands.some(c=>c[0]==='fillRect'),'preview draws no checkered finish bar');
for(const entry of PRACTICE_MAP_LEGEND){check(commands.some(c=>c[0]==='fillText'&&c[1]===entry.label),'visible short legend includes each activity');check(pCanvas['aria-label'].includes(entry.description),'screen-reader legend explains each shape and color');}
check(pCanvas['aria-label'].includes('Untimed')&&!/\d+ laps|Checkered|Elevation/.test(pCanvas['aria-label']),'preview describes untimed practice without race/elevation claims');
const n=commands.length;view.update(course,'Free exploration');equal(commands.length,n,'unchanged practice preview is fully cached');view.dispose();
commands.length=0;const rCanvas=canvas(),route=new RouteMap(rCanvas),state={s:180,lateral:0,headingError:0,currentLap:99};route.update(course,state,0);
check(!commands.some(c=>c[0]==='fillRect'),'in-game practice map draws no checkered finish');check(rCanvas['aria-label'].includes('Untimed')&&!/Lap \d|Checkered/.test(rCanvas['aria-label']),'in-game map has no lap objective');equal(rCanvas.dataset.lap,'0','practice map lap metadata stays zero');
for(const entry of PRACTICE_MAP_LEGEND)check(rCanvas['aria-label'].includes(entry.description),'in-game screen-reader legend matches preview');
const cached=route.current;commands.length=0;route.update(course,{...state,s:460},70);equal(route.current,cached,'moving in practice reuses cached activity layer');check(!commands.some(c=>c[0]==='fillText'),'dynamic frame does not redraw the static legend');route.dispose();
console.log(`Practice map: ${checks} untimed/marker/accessibility/cache checks, with all fifteen race map/preview outputs unchanged.`);
