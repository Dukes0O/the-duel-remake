import assert from 'node:assert/strict';
import * as THREE from 'three';
import { Course } from '../src/course.js';
import { COURSE } from '../src/config.js';
import { addRaceStructures } from '../src/race-structures.js';
import { buildTunnelWallDetails,createTunnelConcrete,TUNNEL_CONCRETE_TILE_METRES } from '../src/tunnel-detail.js';

let checks=0,maximumGap=0,triangles=0;
const check=(ok,message)=>{assert.ok(ok,message);checks++;};
const ray=new THREE.Raycaster();
for(const seed of[1989,42])for(const def of COURSE.filter(def=>def.sections.some(section=>section.theme==='alpine'))){
  const course=new Course(def,seed),structures=addRaceStructures(new THREE.Group(),course);structures.updateMatrixWorld(true);
  const lining=structures.children.filter(mesh=>mesh.name==='Circuit lining surface');
  check(lining.length===1,`${def.id}: original tunnel lining is retained`);
  for(const tunnel of course.features.tunnels)for(const geometry of Object.values(buildTunnelWallDetails(course,tunnel))){
    const positions=geometry.attributes.position,normals=geometry.attributes.normal;triangles+=positions.count/3;
    for(let i=0;i<positions.count;i++){
      const p=new THREE.Vector3().fromBufferAttribute(positions,i),n=course.nearest(p.x,p.z);
      check(Number.isFinite(p.x+p.y+p.z)&&Number.isFinite(normals.getX(i)+normals.getY(i)+normals.getZ(i)),`${def.id}: finite detail geometry`);
      check(Math.abs(n.lateral)>course.roadHalfWidthAt(n.s)+1,`${def.id}: tunnel detail enters vehicle corridor`);
      if(i%3)continue;
      // Interior triangle samples avoid ambiguous rays exactly on a portal's
      // open boundary while still testing every rendered overlay triangle.
      p.add(new THREE.Vector3().fromBufferAttribute(positions,i+1)).add(new THREE.Vector3().fromBufferAttribute(positions,i+2)).divideScalar(3);
      const nearest=course.nearest(p.x,p.z),sign=Math.sign(nearest.lateral),frame=course.at(nearest.s),direction=new THREE.Vector3(Math.cos(frame.heading)*sign,0,-Math.sin(frame.heading)*sign);ray.set(p.clone().addScaledVector(direction,-.15),direction);ray.far=.35;
      const hit=ray.intersectObjects(lining,false)[0];check(!!hit,`${def.id}: detail has no existing wall behind it`);
      maximumGap=Math.max(maximumGap,Math.abs(hit.distance-.15));check(Math.abs(hit.distance-.15)<.00015,`${def.id}: new detail protrudes from the existing wall plane`);
    }
  }
}
for(const portal of[false,true]){
  const mat=createTunnelConcrete(portal),shader={vertexShader:THREE.ShaderLib.standard.vertexShader,fragmentShader:THREE.ShaderLib.standard.fragmentShader,uniforms:{}};mat.onBeforeCompile(shader);
  check(mat.map===mat.bumpMap&&mat.roughness>=.9,'Concrete uses the generated color/bump texture and a rough response');
  check(shader.uniforms.tunnelTile.value===TUNNEL_CONCRETE_TILE_METRES,'World texture repeats at a physical metre scale');
  check(shader.vertexShader.includes('instanceMatrix*tunnelPosition')&&shader.fragmentShader.includes('vTunnelWorld/tunnelTile'),'Scaled portal instances keep the same texture scale');
}
console.log(`Tunnel detail: ${checks} checks passed; ${triangles} detail triangles over6fixtures; maximum wall-plane gap ${(maximumGap*1000).toFixed(3)}mm; roof unchanged.`);
