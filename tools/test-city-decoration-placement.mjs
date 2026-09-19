import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as THREE from 'three';
import {COURSE} from '../src/config.js';
import {Course} from '../src/course.js';
import {addLandscapeDetail} from '../src/landscape-detail.js';
import {addCityChaseDetail} from '../src/city-chase-detail.js';
import {createCityDecorationPlacement} from '../src/city-decoration-placement.js';
import {disposeTree} from '../src/world.js';

let checks=0,decorations=0,relocated=0,omitted=0,unchanged=0,minPavement=Infinity;
const check=(condition,message)=>{assert.ok(condition,message);checks++;};
const equal=(a,b,message)=>{assert.deepEqual(a,b,message);checks++;};
// Independently retain the former placements with city filtering/tint disabled.
// Production does not expose a test switch or accept a different scene API.
const sourceUrl=new URL('../src/landscape-detail.js',import.meta.url);
let source=await readFile(sourceUrl,'utf8');source=source.replace('city?createCityDecorationPlacement(course):null','null').replaceAll('coolStone||city','coolStone');
source=source.replace(/from\s+(['"])([^'"]+)\1/g,(match,quote,specifier)=>`from ${JSON.stringify(specifier.startsWith('.')?new URL(specifier,sourceUrl).href:import.meta.resolve(specifier))}`);
const oldFactory=(await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'))).addLandscapeDetail;
const toy={length:240,sections:[{theme:'city',start:0,end:240}],features:{stations:[{s:60,x:-26,y:0,z:60,heading:0,theme:'city'}],shortcuts:[{start:100,end:150}],buildings:[]},phase:s=>((s%240)+240)%240,roadHalfWidthAt:()=>7,groundAt:(s,off)=>({x:off,y:0,z:s}),themeAt:()=> 'city',nearest:(x,z)=>({s:z,lateral:x}),surfaceAt:(s,off)=>({road:Math.abs(off)<=7}),tunnelAt:()=>null};
const toyPlacement=createCityDecorationPlacement(toy);
check(!toyPlacement.clearAt(9,24),'Existing sidewalk tile is excluded');check(toyPlacement.clearAt(9,60),'The opposite station-side sidewalk gap is preserved');check(toyPlacement.clearAt(9,120),'The actual shortcut omission stays a gap');check(toyPlacement.clearAt(9,2),'Unrendered section-end pavement is not invented');check(!toyPlacement.clearAt(-26,60),'Station apron is excluded even where sidewalk tiles are omitted');

const matrix=new THREE.Matrix4(),p=new THREE.Vector3(),closest=new THREE.Vector3(),color=new THREE.Color();
function records(group){
  const result=new Map();for(const mesh of group.children){const meta=mesh.userData.landscapeCell;for(let i=0;i<mesh.count;i++){
    const key=`${meta.kind}:${meta.indices[i]}`;check(!result.has(key),'Cell grouping keeps unique source identities');mesh.getMatrixAt(i,matrix);if(mesh.instanceColor)mesh.getColorAt(i,color);
    result.set(key,{matrix:[...matrix.elements],color:mesh.instanceColor?color.toArray():null,mesh});
  }}return result;
}
function pavementTriangles(group){
  const result=[];for(const mesh of group.children.filter(mesh=>mesh.name==='City pavement surface')){
    const positions=mesh.geometry.attributes.position,index=mesh.geometry.index;
    for(let i=0;i<index.count;i+=3){const points=[0,1,2].map(n=>new THREE.Vector3(positions.getX(index.getX(i+n)),0,positions.getZ(index.getX(i+n))));
      const triangle=new THREE.Triangle(...points),box=new THREE.Box3().setFromPoints(points).expandByScalar(.66);result.push({triangle,box});}
  }return result;
}
const originalLoad=THREE.TextureLoader.prototype.load;THREE.TextureLoader.prototype.load=()=>new THREE.Texture();
try{
  for(const id of['harbor-highlands','midnight-chase','neon-drift-trial'])for(const seed of[1989,42,17]){
    const course=new Course(COURSE.find(def=>def.id===id),seed),features=JSON.stringify(course.features),world=new THREE.Group(),city=addCityChaseDetail(world,course),triangles=pavementTriangles(city);
    check(triangles.length>0,'Clearance checks use actual rendered sidewalk triangles');
    for(const theme of new Set(course.sections.map(section=>section.theme))){
      const view=Object.create(course);view.def={...course.def,theme};view.features={...course.features,rocks:course.features.rocks.filter(rock=>rock.theme===theme)};view.detailSections=course.sections.filter(section=>section.theme===theme);
      const group=new THREE.Group(),legacy=new THREE.Group();addLandscapeDetail(group,view,theme==='alpine');oldFactory(legacy,view,theme==='alpine');const actual=records(group),before=records(legacy);
      for(const[key,record]of actual){
        const previous=before.get(key);check(!!previous,'Every retained decoration preserves its original identity');
        const kind=key.split(':')[0],cosmetic=theme==='city'&&['foliage','grit'].includes(kind);
        if(!cosmetic){equal(record.matrix,previous.matrix,'All non-city and physical object transforms are exact');equal(record.color,previous.color,'All non-city and physical object colours are exact');unchanged++;continue;}
        for(let index=0;index<16;index++)if(index<12||index>14)equal(record.matrix[index],previous.matrix[index],'Cosmetic relocation preserves scale and rotation');
        if(kind==='grit')equal(record.color,previous.color,'Gravel keeps its exact random tint');
        else equal(record.mesh.material.color.getHex(),0x809568,'City weeds use muted green instead of the desert plant tint');
        p.set(record.matrix[12],0,record.matrix[14]);
        for(const entry of triangles)if(entry.box.containsPoint(p)){
          const distance=entry.triangle.closestPointToPoint(p,closest).distanceTo(p);minPavement=Math.min(minPavement,distance);check(distance>.649,'No cosmetic center lies within the actual pavement triangles plus clearance');
        }
        for(const feature of[...course.features.buildings.filter(building=>(building.theme||course.themeAt(building.s))==='city').map(b=>({...b,halfX:b.halfX+.45,halfZ:b.halfZ+.45})),...course.features.stations.filter(station=>(station.theme||course.themeAt(station.s))==='city').map(station=>({...station,halfX:10.5,halfZ:9}))]){
          const dx=p.x-feature.x,dz=p.z-feature.z,c=Math.cos(feature.heading),s=Math.sin(feature.heading),x=dx*c-dz*s,z=dx*s+dz*c;
          check(Math.hypot(Math.max(0,Math.abs(x)-feature.halfX),Math.max(0,Math.abs(z)-feature.halfZ))>.649,'Cosmetic detail clears building frames and station aprons');
        }
        const nearest=course.nearest(p.x,p.z);check(!course.surfaceAt(nearest.s,nearest.lateral).road,'Relocated decoration does not enter a legal road or shortcut');decorations++;
      }
      if(theme==='city'){
        const metadata=group.userData.cityDecorations;relocated+=metadata.reduce((total,item)=>total+item.relocated,0);omitted+=metadata.reduce((total,item)=>total+item.omitted,0);
        equal(actual.size+metadata.reduce((total,item)=>total+item.omitted,0),before.size,'All source instances are accounted for, including explicit omissions');
        check(metadata.every(item=>item.omitted===0),'Curated city routes retain all decoration identities');
      }else equal(actual.size,before.size,'Non-city density is unchanged');
      disposeTree(group);disposeTree(legacy);
    }
    equal(JSON.stringify(course.features),features,'Rendering never moves any route, building or physical rock');disposeTree(world);
  }
}finally{THREE.TextureLoader.prototype.load=originalLoad;}
check(relocated>100,'The audit exercises actual blocked city placements');
console.log(`City decoration: ${checks} checks; ${decorations} clear city tufts/gravel, ${relocated} relocated, ${omitted} omitted; ${unchanged} exact non-city/physical instances. Rendered pavement and station/building footprints stay clear.`);
