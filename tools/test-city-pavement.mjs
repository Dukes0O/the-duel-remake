import assert from 'node:assert/strict';
import * as THREE from 'three';
import {COURSE} from '../src/config.js';
import {Course} from '../src/course.js';
import {addCityChaseDetail} from '../src/city-chase-detail.js';
import {terrainGeometry,disposeTree} from '../src/world.js';

let checks=0,quads=0,curbs=0,joins=0,cellJoins=0,minLift=Infinity,maxLift=-Infinity;
const check=(condition,label)=>{assert.ok(condition,label);checks++;};
const equal=(a,b,label)=>{assert.deepEqual(a,b,label);checks++;};
const point=(attribute,index)=>[attribute.getX(index),attribute.getY(index),attribute.getZ(index)];
const near=(a,b,tolerance=.0002)=>Math.abs(a-b)<tolerance;

// Sample the actual indexed near-terrain triangles, including their4m row
// interpolation. Course.groundAt alone would miss gaps under a raised surface.
function renderedGround(course,geometry){
  const positions=geometry.attributes.position,indices=geometry.index,rowSize=positions.count/(course.length/4+1),rows=new Map();
  assert(Number.isInteger(rowSize),'city terrain has a fixed physical row size');
  for(let i=0;i<indices.count;i+=3){const ids=[indices.getX(i),indices.getX(i+1),indices.getX(i+2)],row=Math.floor(Math.min(...ids)/rowSize);if(!rows.has(row))rows.set(row,[]);rows.get(row).push(ids.map(index=>point(positions,index)));}
  return(x,z,s)=>{
    const row=Math.floor(s/4);let height=null;
    for(let r=row-2;r<=row+2;r++)for(const [a,b,c]of rows.get(r)||[]){
      const denominator=(b[2]-c[2])*(a[0]-c[0])+(c[0]-b[0])*(a[2]-c[2]);if(Math.abs(denominator)<1e-10)continue;
      const u=((b[2]-c[2])*(x-c[0])+(c[0]-b[0])*(z-c[2]))/denominator,v=((c[2]-a[2])*(x-c[0])+(a[0]-c[0])*(z-c[2]))/denominator,w=1-u-v;
      if(u>=-1e-6&&v>=-1e-6&&w>=-1e-6){const y=u*a[1]+v*b[1]+w*c[1];height=height==null?y:Math.max(height,y);}
    }
    return height;
  };
}
function inspectPavement(course,group){
  const pavement=group.children.filter(mesh=>mesh.name==='City pavement surface'),stone=group.children.filter(mesh=>mesh.name==='City stone surface'),endpoints=new Map(),tops=new Map();
  check(pavement.length>1&&stone.length>1,'pavement and curbs use multiple finite spatial cells');
  check(new Set(pavement.map(mesh=>mesh.material)).size===1&&new Set(pavement.map(mesh=>mesh.material.map)).size===1,'all sidewalk cells share one material and one concrete map');
  const material=pavement[0].material;
  check(material.map===material.bumpMap&&material.bumpScale<=.02&&material.roughness>=.9&&!material.transparent,'concrete uses a shallow shared bump texture and an opaque rough finish');
  const terrain=terrainGeometry(course,false),ground=renderedGround(course,terrain);
  for(const mesh of pavement){
    const geometry=mesh.geometry,p=geometry.attributes.position,uv=geometry.attributes.uv,n=geometry.attributes.normal;
    check(!mesh.isInstancedMesh&&mesh.frustumCulled&&Number.isFinite(geometry.boundingSphere.radius)&&geometry.boundingSphere.radius<165,'sidewalk geometry is baked into bounded cullable cells');
    check(p.array.every(Number.isFinite)&&uv.array.every(Number.isFinite)&&n.array.every(Number.isFinite),'sidewalk vertices, UVs and normals are finite');
    check(p.count%4===0&&geometry.index.count===p.count/4*6,'each sidewalk strip retains two triangles and four source corners');
    for(let i=0;i<p.count;i+=4){
      const s0=uv.getY(i)*2,s1=uv.getY(i+2)*2,side=Math.sign(uv.getX(i)),middle=(s0+s1)/2;
      check(s1>s0&&s1-s0<=6.001,'sidewalk strips have at most six metres of course length');
      check(!course.features.shortcuts.some(cut=>s1>cut.start&&s0<cut.end),'sidewalk cannot cover a shortcut entrance or its graded corridor');
      check(course.features.stations.every(station=>Math.abs(station.s-middle)>22.99&&Math.min(Math.abs(station.s-s0),Math.abs(station.s-s1))>=19.99),'station driveways keep their full clear gap');
      for(let j=0;j<4;j++){
        const s=uv.getY(i+j)*2,off=uv.getX(i+j)*2,expected=course.groundAt(s,off),actual=point(p,i+j),edge=j%2;
        check(near(actual[0],expected.x)&&near(actual[2],expected.z)&&near(actual[1],expected.y+.17),'physical UV coordinates locate a sidewalk corner on the actual ground at17cm');
        check(near(Math.abs(off)-course.roadHalfWidthAt(s),edge?5.1:.75,.00001),'sidewalk stays beyond the drivable road with a consistent4.35m width');
        const key=`${side}:${s.toFixed(4)}:${edge}`,entry={point:actual,uv:[uv.getX(i+j),uv.getY(i+j)],mesh:mesh.uuid},prior=endpoints.get(key);
        if(prior){equal(entry.point,prior.point,'adjacent six-metre strips share the exact endpoint position');equal(entry.uv,prior.uv,'UV phase is continuous across strip boundaries');joins++;if(prior.mesh!==mesh.uuid)cellJoins++;}else endpoints.set(key,entry);
      }
      check(near(Math.abs(uv.getX(i+1)-uv.getX(i))*2,4.35,.00001),'sidewalk width keeps the two-metre texture scale');
      // A triangle centroid checks actual rasterized interpolation as well as
      // exact ground corners, including curves and the mixed harbor slopes.
      for(const indices of[[i,i+2,i+1],[i+1,i+2,i+3]]){
        const actual=indices.map(index=>point(p,index)).reduce((sum,v)=>sum.map((value,axis)=>value+v[axis]/3),[0,0,0]);
        const s=indices.reduce((sum,index)=>sum+uv.getY(index)*2/3,0),below=ground(actual[0],actual[2],s);
        check(below!=null,'rendered terrain exists beneath every sidewalk triangle');
        const lift=actual[1]-below;minLift=Math.min(minLift,lift);maxLift=Math.max(maxLift,lift);
        check(lift>.10&&lift<.24,`sidewalk remains raised without a terrain hole or floating slab (${lift})`);
      }
      quads++;
    }
    const clone=geometry.clone();equal(clone.attributes.uv.array,uv.array,'geometry cloning preserves world-scaled concrete UVs');check(clone.attributes.uv.array!==uv.array,'geometry clone owns an independent UV buffer');clone.dispose();
  }
  for(const mesh of stone){
    const p=mesh.geometry.attributes.position,uv=mesh.geometry.attributes.uv;
    check(p.array.every(Number.isFinite)&&uv.array.every(Number.isFinite),'curb cells contain finite vertices and UVs');
    for(let i=0;i<p.count;i+=4){
      const face=near(uv.getY(i),0)&&near(uv.getY(i+1),0)&&near(uv.getY(i+2),.0825)&&near(uv.getY(i+3),.0825);
      if(!face){
        for(let j=0;j<4;j++){
          const s=uv.getY(i+j)*2,off=uv.getX(i+j)*2,expected=course.groundAt(s,off),actual=point(p,i+j);
          check(near(actual[0],expected.x)&&near(actual[2],expected.z)&&near(actual[1],expected.y+.19),'curb top follows actual ground at19cm');
          check(near(Math.abs(off)-course.roadHalfWidthAt(s),j%2?1:.75,.00001),'curb top stays in the intended25cm band outside the road');
          if(j%2===0)tops.set(`${actual[0]}:${actual[2]}`,actual[1]);
        }
      }
    }
  }
  for(const mesh of stone){const p=mesh.geometry.attributes.position,uv=mesh.geometry.attributes.uv;for(let i=0;i<p.count;i+=4){
    if(!(near(uv.getY(i),0)&&near(uv.getY(i+1),0)&&near(uv.getY(i+2),.0825)&&near(uv.getY(i+3),.0825)))continue;
    for(let j=0;j<2;j++){
      const bottom=point(p,i+j),top=point(p,i+j+2),s=uv.getX(i+j)*2,projection=course.nearest(bottom[0],bottom[2]),side=Math.sign(projection.lateral),expected=course.groundAt(s,side*(course.roadHalfWidthAt(s)+.75));
      check(near(bottom[0],expected.x)&&near(bottom[2],expected.z)&&near(bottom[1],expected.y+.025),'curb face reaches the ground-side asphalt edge at2.5cm');
      check(near(top[1]-bottom[1],.165)&&top[0]===bottom[0]&&top[2]===bottom[2],'curb face has a continuous vertical16.5cm wall');
      check(tops.has(`${top[0]}:${top[2]}`)&&near(tops.get(`${top[0]}:${top[2]}`),top[1]),'curb face closes exactly against its top edge');
      check(near((uv.getY(i+j+2)-uv.getY(i+j))*2,top[1]-bottom[1]),'curb wall UV height also retains two-metre physical scale');
    }
    curbs++;
  }}
  const clone=material.clone();check(clone.map===material.map&&clone.bumpMap===material.bumpMap&&clone.color.equals(material.color),'material clone retains concrete appearance and the shared map');clone.dispose();terrain.dispose();
  return material.map;
}

for(const id of['harbor-highlands','midnight-chase','neon-drift-trial'])for(const seed of[1989,42]){
  const course=new Course(COURSE.find(def=>def.id===id),seed),before=JSON.stringify({obstacles:course.features.obstacles,shortcuts:course.features.shortcuts,stations:course.features.stations}),group=addCityChaseDetail(new THREE.Group(),course);
  const texture=inspectPavement(course,group);let releases=0;texture.addEventListener('dispose',()=>releases++);disposeTree(group);
  check(releases===1,'world disposal releases shared pavement map and bump texture only once');
  equal(JSON.stringify({obstacles:course.features.obstacles,shortcuts:course.features.shortcuts,stations:course.features.stations}),before,'visual pavement changes leave physics, shortcuts and stations untouched');
}
check(joins>1000&&cellJoins>20,'continuity assertions cover repeated strips and actual200m cell boundaries');

// Exercise the browser texture path without WebGL/network. Separate worlds get
// separate owned images; spatial cells never clone the texture per mesh.
{
  const originalDocument=globalThis.document,originalLoad=THREE.TextureLoader.prototype.load,loaded=[];
  const context=new Proxy({},{get:(o,key)=>o[key]||(()=>{}),set:(o,key,value)=>(o[key]=value,true)});
  globalThis.document={createElement:()=>({getContext:()=>context})};
  THREE.TextureLoader.prototype.load=function(url){const texture=new THREE.Texture();loaded.push({url,texture});return texture;};
  try{
    const course=new Course(COURSE.find(def=>def.id==='midnight-chase'),1989),a=addCityChaseDetail(new THREE.Group(),course),b=addCityChaseDetail(new THREE.Group(),course);
    const maps=loaded.filter(entry=>entry.url==='/assets/textures/sidewalk-concrete.png').map(entry=>entry.texture);
    check(maps.length===2&&maps[0]!==maps[1],'each world owns one concrete texture and cannot dispose a different world\'s map');
    check(maps.every(map=>map.wrapS===THREE.RepeatWrapping&&map.wrapT===THREE.RepeatWrapping&&map.colorSpace===THREE.SRGBColorSpace&&map.repeat.equals(new THREE.Vector2(1,1))&&map.anisotropy===8),'browser concrete maps repeat without overriding the baked physical UV scale');
    const copied=maps[0].clone();check(copied.wrapS===maps[0].wrapS&&copied.colorSpace===maps[0].colorSpace&&copied.repeat.equals(maps[0].repeat),'texture cloning preserves wrap, colour and scale');copied.dispose();
    const disposed=[0,0];maps.forEach((map,i)=>map.addEventListener('dispose',()=>disposed[i]++));disposeTree(a);equal(disposed,[1,0],'disposing one city cannot release the other city texture');disposeTree(b);equal(disposed,[1,1],'both world textures are released exactly once');
  }finally{THREE.TextureLoader.prototype.load=originalLoad;if(originalDocument===undefined)delete globalThis.document;else globalThis.document=originalDocument;}
}
console.log(`City pavement: ${checks} geometry, ground, driveway, UV, cell continuity and texture lifecycle checks; ${quads} sidewalk strips, ${curbs} curb faces, ${cellJoins} cross-cell joins. Rendered ground clearance ${(minLift*1000).toFixed(1)}–${(maxLift*1000).toFixed(1)}mm.`);
