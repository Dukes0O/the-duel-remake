import assert from 'node:assert/strict';
import * as THREE from 'three';
import { Course } from '../src/course.js';
import { CARS, COURSE, DRIVE } from '../src/config.js';
import { CAR_HALF_WIDTH } from '../src/collision.js';
import { SUMMIT_RUN } from '../src/circuits/summit-run.js';
import { disposeTree } from '../src/world.js';
import { addRaceStructures } from '../src/race-structures.js';
import { buildTunnelWallDetails,createTunnelConcrete,TUNNEL_CONCRETE_TILE_METRES } from '../src/tunnel-detail.js';

let checks=0,maximumGap=0,triangles=0,minimumGalleryOffset=Infinity;
// Every garage car can enter Summit. Preserve its actual ordinary lane centres
// and use the widest admitted hull, including the Titan, without extra margin.
const galleryLaneReach=DRIVE.laneOffset+Math.max(...Object.values(CARS).map(car=>car.collision?.halfWidth??CAR_HALF_WIDTH));
const check=(ok,message)=>{assert.ok(ok,message);checks++;};
const ray=new THREE.Raycaster();
for(const seed of[1989,42])for(const def of COURSE.filter(def=>def.sections.some(section=>section.theme==='alpine'))){
  const course=new Course(def,seed),structures=addRaceStructures(new THREE.Group(),course);structures.updateMatrixWorld(true);
  const lining=structures.children.filter(mesh=>mesh.name==='Circuit lining surface');
  const physicalBefore=JSON.stringify(course.features);
  const liningBefore=lining.map(mesh=>Array.from(mesh.geometry.attributes.position.array));
  check(lining.length===(course.features.tunnels.length?1:0),`${def.id}: lining exists exactly when the actual course has tunnels`);
  if(def.expansion)check(course.features.tunnels.length===def.expansion.tunnelSections.length,`${def.id}: tunnels follow the authored expansion sections`);
  for(const tunnel of course.features.tunnels)if(tunnel.clearance){
    const {width,height}=tunnel.clearance,tallest=Math.max(...Object.values(CARS).map(car=>car.height??1.35));
    check(Number.isFinite(width)&&Number.isFinite(height)&&height>=4.5&&height>=tallest+1,`${def.id}: authored Gallery clears the admitted fleet by one metre`);
    check(tunnel.width*2>=width&&tunnel.height>=height,`${def.id}: physical Gallery meets its declared clearance`);
  }
  for(const tunnel of course.features.tunnels)for(const geometry of Object.values(buildTunnelWallDetails(course,tunnel))){
    const positions=geometry.attributes.position,normals=geometry.attributes.normal;triangles+=positions.count/3;
    if(tunnel.id==='summit-gallery')check(positions.array instanceof Float32Array,`${def.id}: Gallery flush corners use the actual rendered Float32 format`);
    for(let i=0;i<positions.count;i++){
      const p=new THREE.Vector3().fromBufferAttribute(positions,i),n=course.nearest(p.x,p.z);
      check(Number.isFinite(p.x+p.y+p.z)&&Number.isFinite(normals.getX(i)+normals.getY(i)+normals.getZ(i)),`${def.id}: finite detail geometry`);
      if(tunnel.clearance){
        check(tunnel.clearance.width>=course.roadHalfWidthAt(n.s)*2,`${def.id}: authored Gallery clearance spans the road`);
        check(tunnel.clearance.width/2>=galleryLaneReach,`${def.id}: declared Gallery width contains the admitted vehicle lanes`);
        minimumGalleryOffset=Math.min(minimumGalleryOffset,Math.abs(n.lateral));
        check(Math.abs(n.lateral)>galleryLaneReach,`${def.id}: Gallery detail stays outside every admitted vehicle lane`);
      }else{
      check(Math.abs(n.lateral)>course.roadHalfWidthAt(n.s)+1,`${def.id}: tunnel detail enters vehicle corridor`);
      }
      if(i%3)continue;
      // Interior triangle samples avoid ambiguous rays exactly on a portal's
      // open boundary while still testing every rendered overlay triangle.
      p.add(new THREE.Vector3().fromBufferAttribute(positions,i+1)).add(new THREE.Vector3().fromBufferAttribute(positions,i+2)).divideScalar(3);
      const nearest=course.nearest(p.x,p.z),sign=Math.sign(nearest.lateral),frame=course.at(nearest.s),direction=new THREE.Vector3(Math.cos(frame.heading)*sign,0,-Math.sin(frame.heading)*sign);ray.set(p.clone().addScaledVector(direction,-.15),direction);ray.far=.35;
      const hit=ray.intersectObjects(lining,false)[0];check(!!hit,`${def.id}: detail has no existing wall behind it`);
      const gap=Math.abs(hit.distance-.15);
      const witness=gap<.00015?'':JSON.stringify({seed,tunnel:tunnel.id,detail:geometry.name,triangle:i/3,
        vertices:[0,1,2].map(offset=>new THREE.Vector3().fromBufferAttribute(positions,i+offset).toArray()),
        centroid:p.toArray(),float32Spacing:p.toArray().map(value=>Math.abs(value)<2**-126?2**-149:2**(Math.floor(Math.log2(Math.abs(value)))-23)),
        station:nearest.s,lateral:nearest.lateral,rayDirection:direction.toArray(),
        hitDistance:hit.distance,hitPoint:hit.point.toArray(),faceNormal:hit.face.normal.toArray(),gap});
      maximumGap=Math.max(maximumGap,gap);check(gap<.00015,`${def.id}: new detail protrudes from the existing wall plane${witness?' '+witness:''}`);
    }
  }
  assert.deepEqual(lining.map(mesh=>Array.from(mesh.geometry.attributes.position.array)),liningBefore,'Detail construction leaves the actual stored lining byte-exact');checks++;
  check(JSON.stringify(course.features)===physicalBefore,'Detail construction leaves Gallery and ordinary physical features unchanged');
}
// Compare actual generated Gallery geometry, including both rock dispatches.
// Only explicit false removes cover; every remaining mesh/light stays exact.
{
  const course=new Course(SUMMIT_RUN,1989),tunnels=course.features.tunnels;
  check(tunnels.length===1&&tunnels[0].cover===false,'Summit forwards its authored cover opt-out to the actual Gallery');
  const snapshots=[];
  for(const cover of[undefined,true,false]){
    course.features.tunnels=tunnels.map(({cover:_cover,...tunnel})=>({...tunnel,...(cover===undefined?{}:{cover})}));
    const physical=JSON.stringify(course.features),world=new THREE.Group(),structures=addRaceStructures(world,course);
    try{
      structures.updateMatrixWorld(true);
      snapshots.push(structures.children.map(object=>{
        const {uuid,...geometry}=object.geometry?.toJSON()??{};
        return {name:object.name,type:object.type,geometry,
          position:object.position.toArray(),quaternion:object.quaternion.toArray(),scale:object.scale.toArray(),
          matrix:object.matrix.toArray(),count:object.count,
          instances:object.instanceMatrix?Array.from(object.instanceMatrix.array):null,
          colours:object.instanceColor?Array.from(object.instanceColor.array):null,
          light:object.isLight?{colour:object.color.getHex(),intensity:object.intensity,distance:object.distance,decay:object.decay}:null};
      }));
      check(JSON.stringify(course.features)===physical,'Cover selection never changes physical tunnel features');
    }finally{disposeTree(world);}
  }
  assert.deepEqual(snapshots[1],snapshots[0]);checks++;
  check(snapshots[0].some(object=>object.name==='Circuit rock surface'),'Default and explicit true retain actual rock geometry');
  check(!snapshots[2].some(object=>object.name==='Circuit rock surface'),'Explicit false removes the cover and portal rock geometry');
  assert.deepEqual(snapshots[2],snapshots[0].filter(object=>object.name!=='Circuit rock surface'));checks++;
  check(snapshots[2].some(object=>object.name==='Circuit lining surface')&&
    snapshots[2].some(object=>object.name==='Circuit tunnelConcrete surface')&&
    snapshots[2].some(object=>object.name==='Tunnel ceiling pool'),'Uncovered Gallery retains lining, portals and actual lights');
}
for(const portal of[false,true]){
  const mat=createTunnelConcrete(portal),shader={vertexShader:THREE.ShaderLib.standard.vertexShader,fragmentShader:THREE.ShaderLib.standard.fragmentShader,uniforms:{}};mat.onBeforeCompile(shader);
  check(mat.map===mat.bumpMap&&mat.roughness>=.9,'Concrete uses the generated color/bump texture and a rough response');
  check(mat.map.isDataTexture&&mat.map.image.data.length===4&&mat.map.version===1,'Headless concrete pixels are ready for upload');
  check(shader.uniforms.tunnelTile.value===TUNNEL_CONCRETE_TILE_METRES,'World texture repeats at a physical metre scale');
  check(shader.vertexShader.includes('instanceMatrix*tunnelPosition')&&shader.fragmentShader.includes('vTunnelWorld/tunnelTile'),'Scaled portal instances keep the same texture scale');
}
// Exercise Three's actual asynchronous TextureLoader contract. A fresh module
// instance keeps this browser path separate from the cached headless texture.
{
  const previousDocument=globalThis.document,images=[];
  globalThis.document={createElementNS(_namespace,tag){
    assert.equal(tag,'img');
    const listeners=new Map(),image={complete:false,
      addEventListener:(type,callback)=>listeners.set(type,callback),
      removeEventListener:type=>listeners.delete(type),
      finish(){this.complete=true;listeners.get('load').call(this);},
    };
    images.push(image);return image;
  }};
  let concrete,portal;
  try{
    const browser=await import('../src/tunnel-detail.js?browser-texture-readiness');
    concrete=browser.createTunnelConcrete();portal=browser.createTunnelConcrete(true);
    check(images.length===1&&images[0].src==='/assets/textures/tunnel-concrete.png','Browser concrete shares one requested image');
    check(concrete.map===portal.map&&concrete.map===concrete.bumpMap,'Portals and lining retain their shared texture');
    check(concrete.map.image===null&&concrete.map.version===0,'Pending image must not be marked for GPU upload');
    images[0].finish();
    check(concrete.map.image===images[0]&&concrete.map.version===1,'TextureLoader marks concrete ready only after image completion');
    check(concrete.map.userData.sharedAsset&&concrete.map.wrapS===THREE.RepeatWrapping&&concrete.map.anisotropy===8,'Readiness fix preserves texture sharing and sampling');
  }finally{
    concrete?.dispose();portal?.dispose();concrete?.map.dispose();
    if(previousDocument===undefined)delete globalThis.document;else globalThis.document=previousDocument;
  }
}
console.log(`Tunnel detail: ${checks} checks passed; ${triangles} detail triangles over6fixtures; maximum wall-plane gap ${(maximumGap*1000).toFixed(3)}mm; roof unchanged.`);

console.log('Gallery physical clearance: '+JSON.stringify({laneHalfEnvelope:galleryLaneReach,minimumProjectedDetailOffset:minimumGalleryOffset}));
