// Finish-area presentation. The course and helicopter retain their own rules.
import * as THREE from 'three';
import {crowdTexture} from './stadium-crowd.js';
import {registerSceneSystem} from './scene-systems.js';
import {worldAtExtended} from './world-surfaces.js';
import {renderedGroundHeight} from './rendered-ground.js';
import {SUMMIT_PADS} from './ski/runs/summit-zones.js';
import {winterTerrainMaterial} from './snow-world.js';
import {createVehicle} from './vehicles.js';

// Reuse the photographed crowd, including variants 0/3 with raised arms.
// Narrow the seated legs into standing proportions; keep jackets and faces.
function standingSpectator(variant) {
  const positions=[],uv=[],indices=[];
  const rows=[[0,0,.36],[.28,.5,.48],[.48,.95,.84],[1,2.2,.84]];
  for(const [v,y,width] of rows)for(const side of [-1,1]){
    positions.push(side*width/2,y,0);
    uv.push((variant+(side<0?.008:.992))/8,v);
  }
  for(let row=1;row<rows.length;row++){
    const a=row*2;indices.push(a-2,a-1,a,a,a-1,a+1);
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
  geometry.setIndex(indices);geometry.computeVertexNormals();return geometry;
}

export function addSummitFinish(group, course) {
  if (!course.def.kitPlacements?.some(row => row.id === 'summit-finish')) return;
  const finish = new THREE.Group();
  finish.name = 'Summit finish area';
  const spectators = [];
  const coats = new THREE.MeshStandardMaterial({map:crowdTexture(), alphaTest:.55,
    side:THREE.DoubleSide, roughness:1, color:0xd9d8d1,
    emissive:0xffffff,emissiveMap:crowdTexture(),emissiveIntensity:.14});
  const backs=[185,160,135,110,90,70,55,40,30,24,18,12];
  const variants=[0,1,2,3,4,5,6,7,0,3,1,2];
  for (let i = 0; i < 12; i++) {
    const side = i % 2 ? -1 : 1;
    const p = course.groundAt(course.length - backs[i], side * 9.3);
    const mesh = new THREE.Mesh(standingSpectator(variants[i]), coats);
    mesh.name = 'Summit bundled spectator';
    mesh.position.set(p.x, p.y, p.z);
    mesh.rotation.y = p.heading + Math.PI - side * .4;
    mesh.userData.restY = p.y;
    spectators.push(mesh);
    finish.add(mesh);
  }
  // This snow-dusted parking surface sits on the shared graded ground.
  // Its surrounding slope is terrain, rather than an unsupported box edge.
  const p = worldAtExtended(course, course.length + 60);
  const packedGeometry=new THREE.PlaneGeometry(56,120,14,30);
  packedGeometry.setAttribute('winterWeight',new THREE.Float32BufferAttribute(new Float32Array(packedGeometry.attributes.position.count).fill(1),1));
  const packedMaterial=winterTerrainMaterial(new THREE.MeshStandardMaterial({color:0xffffff,roughness:1}),true,true,course.def.snowWorld);
  const apron = new THREE.Mesh(packedGeometry,packedMaterial);
  apron.name = 'Summit car park - 120 m clear terrace';
  apron.position.set(p.x,p.y+.015,p.z);
  apron.rotation.set(-Math.PI/2,0,p.heading);
  apron.receiveShadow = true;
  finish.add(apron);
  for(const [along,off,color] of [[22,21,0x526367],[34,-21,0x7e4f3d]]){
    const point=worldAtExtended(course,course.length+along,off);
    const car=createVehicle({color});
    car.name='Parked summit service sedan';
    car.position.set(point.x,apron.position.y,point.z);car.rotation.y=point.heading+Math.PI;
    // These are parked, unoccupied versions of the existing traffic car.
    const darkMaterials=new Map();
    car.traverse(node=>{
      if(!node.material)return;
      const darken=material=>{
        if(!material.emissive)return material;
        if(!material.userData.sharedAsset){material.emissiveIntensity=0;return material;}
        if(!darkMaterials.has(material)){
          const owned=material.clone();owned.userData={...owned.userData,sharedAsset:false};
          owned.emissiveIntensity=0;darkMaterials.set(material,owned);
        }
        return darkMaterials.get(material);
      };
      node.material=Array.isArray(node.material)?node.material.map(darken):darken(node.material);
    });
    finish.add(car);
  }
  // Keep the established ski/rescue pad operational. The packed path links
  // its existing yard to the enlarged hut without moving a ski drop.
  const pad=course.nearest(SUMMIT_PADS.summit.x,SUMMIT_PADS.summit.z);
  const positions=[],indices=[];
  for(let i=0;i<=40;i++){
    const t=i/40,back=16+(course.length-pad.s-16)*t;
    const lateral=25+(pad.lateral-25)*t;
    for(const side of [-1,1]){
      const point=course.worldAt(course.length-back,lateral+side*1.25);
      const y=renderedGroundHeight(course,{...point,s:course.length-back,off:lateral+side*1.25},{requireSurface:true});
      positions.push(point.x,y+.045,point.z);
    }
    if(i){const a=i*2;indices.push(a-2,a-1,a,a,a-1,a+1);}
  }
  const pathGeometry=new THREE.BufferGeometry();
  pathGeometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  pathGeometry.setIndex(indices);pathGeometry.computeVertexNormals();
  const path=new THREE.Mesh(pathGeometry,new THREE.MeshStandardMaterial({color:0xa7b2b8,roughness:1,side:THREE.DoubleSide}));
  path.name='Packed path from summit helipad to finish hut';
  path.receiveShadow=true;finish.add(path);
  // Dark, readable markings drape over the exact rendered pad snow. A flat
  // paint plane can disappear beneath its small ground variations.
  const padPositions=[],padIndices=[],padHeading=course.at(pad.s).heading;
  const paintPoint=(u,v)=>{
    const x=SUMMIT_PADS.summit.x+Math.cos(padHeading)*u+Math.sin(padHeading)*v;
    const z=SUMMIT_PADS.summit.z-Math.sin(padHeading)*u+Math.cos(padHeading)*v;
    const near=course.nearest(x,z,pad.s);
    const y=renderedGroundHeight(course,{x,z,s:near.s,off:near.lateral},{requireSurface:true});
    if(!Number.isFinite(y))throw Error('Summit pad paint has no rendered ground');
    return [x,y+.035,z];
  };
  for(let i=0;i<=96;i++){
    const angle=i*Math.PI*2/96;
    for(const radius of [11.4,12])padPositions.push(...paintPoint(Math.cos(angle)*radius,Math.sin(angle)*radius));
    if(i){const a=i*2;padIndices.push(a-2,a,a-1,a,a+1,a-1);}
  }
  for(const [left,right,back,front] of [[-2.85,-1.95,-3.6,3.6],[1.95,2.85,-3.6,3.6],[-1.95,1.95,-.45,.45]]){
    const columns=Math.ceil((right-left)/.6),rows=Math.ceil((front-back)/.6),first=padPositions.length/3;
    for(let row=0;row<=rows;row++)for(let column=0;column<=columns;column++){
      padPositions.push(...paintPoint(left+(right-left)*column/columns,back+(front-back)*row/rows));
      if(row&&column){const a=first+row*(columns+1)+column;padIndices.push(a-columns-2,a-1,a-columns-1,a-columns-1,a-1,a);}
    }
  }
  const padGeometry=new THREE.BufferGeometry();
  padGeometry.setAttribute('position',new THREE.Float32BufferAttribute(padPositions,3));
  padGeometry.setIndex(padIndices);padGeometry.computeVertexNormals();
  const paint=new THREE.Mesh(padGeometry,new THREE.MeshStandardMaterial({color:0x253d4d,roughness:.95,side:THREE.DoubleSide}));
  paint.name='Ground-fitted summit H and circle';paint.receiveShadow=true;finish.add(paint);
  // Three practical lamps: one over the line and two on the snow fence.
  // No shadow maps or simulation state are needed for these light pools.
  for (const [back,off,height,power,reach] of [[0,0,6.8,190,42],[60,8.4,3.4,100,30],[150,-8.4,3.4,100,30],[-14,24,5.2,110,32]]) {
    const point=back<0?worldAtExtended(course,course.length-back,off):course.groundAt(course.length-back,off);
    const lamp=new THREE.PointLight(0xffcb8b,power,reach,2);
    lamp.name='Summit practical lamp';
    lamp.position.set(point.x,point.y+height,point.z);
    finish.add(lamp);
  }
  group.add(finish);
  registerSceneSystem(group, {animate(seconds) {
    spectators.forEach((mesh, i) => {
      mesh.rotation.z = Math.sin(seconds * 2.3 + i * 1.7) * .035;
      mesh.position.y = mesh.userData.restY + Math.max(0,Math.sin(seconds * 2 + i)) * .06;
    });
  }});
  return finish;
}
