import assert from 'node:assert/strict';
import * as THREE from 'three';
import {Course} from '../src/course.js';
import {COURSE} from '../src/config.js';
import {addLandscapeDetail} from '../src/landscape-detail.js';
import {terrainGeometry,farTerrainGeometry,strip} from '../src/world-surfaces.js';
import {indexTriangles,drawnHeight} from './course-ground-checks.mjs';

// FIX-GRASS-GROUND: every grass card, tuft and grit piece stands on the ground
// that is drawn, read from the terrain triangles themselves rather than from
// the height formula. A base more than 5 cm from the drawn ground floats or sinks.
// And none stands on a road: the drawn road strip of every stretch of the course,
// widened by half a metre each side, must hold no base (a different stretch can pass
// under the spot a piece was placed from, as at a hairpin).
const LIMIT=.05,ROAD_MARGIN=.5;
const oldLoad=THREE.TextureLoader.prototype.load,oldDocument=globalThis.document;
THREE.TextureLoader.prototype.load=function(url){const texture=new THREE.Texture();texture.image={src:url};return texture;};
globalThis.document={createElement(){
  const context=new Proxy({createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),measureText:()=>({width:40}),
    createLinearGradient:()=>({addColorStop(){}}),createRadialGradient:()=>({addColorStop(){}})},
  {get:(target,key)=>target[key]??(()=>{}),set:(target,key,value)=>{target[key]=value;return true;}});
  return {width:0,height:0,getContext:()=>context};
}};
// Each kind's authored lift above its root: meadow cards sit 2.5 cm in, grit 4 cm up.
const lift=mesh=>mesh.userData.landscapeCell.kind==='grit'?.04:mesh.material.map?-.025:0;
const results=[],failures=[];let checks=0;
try{
  for(const def of COURSE){
    if(def.arena||def.practice)continue;
    // The same per-theme views world.js gives the detail builder.
    const course=new Course(def,1989),world=new THREE.Group(),winter=def.snowWorld;
    for(const theme of new Set(course.sections.map(s=>s.theme))){
      if(theme==='arena')continue;
      const view=Object.create(course);view.def={...def,theme};
      if(winter&&(!winter.mixed||theme==='alpine'))view.def={...view.def,theme:'alpine',winterMountainCaps:true};
      view.features={...course.features,rocks:course.features.rocks.filter(p=>p.theme===theme)};
      view.detailSections=course.sections.filter(s=>s.theme===theme);
      addLandscapeDetail(world,view,theme==='alpine');
    }
    const near=indexTriangles(terrainGeometry(course)),far=indexTriangles(farTerrainGeometry(course));
    const roads=indexTriangles(strip(course,s=>-(course.roadHalfWidthAt(s)+ROAD_MARGIN),s=>course.roadHalfWidthAt(s)+ROAD_MARGIN,.035));
    const matrix=new THREE.Matrix4(),position=new THREE.Vector3();
    let worst=0,where=null,pieces=0,unseen=0,onRoad=0,onRoadAt=null;
    world.traverse(mesh=>{
      const kind=mesh.userData.landscapeCell?.kind;
      if(kind!=='foliage'&&kind!=='grit')return;
      for(let i=0;i<mesh.count;i++){
        mesh.getMatrixAt(i,matrix);position.setFromMatrixPosition(matrix);
        if(drawnHeight(roads,position.x,position.z)!==null){onRoad++;onRoadAt??={kind,x:+position.x.toFixed(1),z:+position.z.toFixed(1)};}
        const a=drawnHeight(near,position.x,position.z),b=drawnHeight(far,position.x,position.z);
        if(a===null&&b===null){unseen++;continue;}
        const ground=Math.max(a??-Infinity,b??-Infinity),gap=position.y-lift(mesh)-ground;pieces++;
        if(Math.abs(gap)>Math.abs(worst)){worst=gap;where={kind,x:+position.x.toFixed(1),z:+position.z.toFixed(1)};}
      }
    });
    world.traverse(object=>object.geometry?.dispose());
    const avoid=world.userData.landscapeRoadAvoid??{placed:0,moved:0,dropped:0};
    results.push({id:def.id,pieces,unseen,worst:+worst.toFixed(3),onRoad,moved:avoid.moved,dropped:avoid.dropped,placed:avoid.placed});
    if(onRoad)failures.push(`${def.id}: ${onRoad} bases on a road, first at ${JSON.stringify(onRoadAt)}`);
    if(!(Math.abs(worst)<=LIMIT))failures.push(`${def.id}: ${worst.toFixed(3)} m at ${JSON.stringify(where)}`);
    checks++;
  }
}finally{THREE.TextureLoader.prototype.load=oldLoad;if(oldDocument===undefined)delete globalThis.document;else globalThis.document=oldDocument;}
if(process.argv.includes('--report'))console.table(results);
assert.deepEqual(failures,[],'grass, tufts and grit sit on the drawn ground within 5 cm and never on a road');
console.log(`Grass ground: ${checks} courses, every grass, tuft and grit base within ${LIMIT} m of the drawn ground and clear of every road.`);
