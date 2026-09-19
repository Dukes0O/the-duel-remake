import assert from 'node:assert/strict';
import * as THREE from 'three';
import { Course } from '../src/course.js';
import { COURSE } from '../src/config.js';
import { sweepObstacle } from '../src/collision.js';
import { addRaceStructures } from '../src/race-structures.js';

let checks=0,sweeps=0,minRock=Infinity,maxArchError=0;
const check=(ok,message)=>{assert.ok(ok,message);checks++;};
const ray=new THREE.Raycaster(),down=new THREE.Vector3(0,-1,0),up=new THREE.Vector3(0,1,0);
for(const seed of[1989,42,17,9999])for(const def of COURSE){
  const course=new Course(def,seed),features=course.features,hulls=features.obstacles.filter(o=>o.signSupport||o.tunnelCover);
  for(const sign of features.signs){
    check(sign.posts.length===2,`${def.id}: two visible sign supports`);
    for(const post of sign.posts){
      const collider=hulls.find(o=>o.id===post.id);check(!!collider,`${def.id}: missing sign support hull`);
      const x=sign.x+Math.cos(sign.heading)*post.localX,z=sign.z-Math.sin(sign.heading)*post.localX;
      check(Math.hypot(x-collider.x,z-collider.z)<1e-6,`${def.id}: physical support differs from drawn support`);
      check(Math.abs(post.y+post.height-(sign.y+4.25))<1e-6,`${def.id}: support reaches sign without floating`);
    }
  }
  for(const sign of[...features.signs,...features.chevrons]){
    const width=sign.posts?2.6:.6;
    for(const x of[-width,0,width]){
      const p={x:sign.x+Math.cos(sign.heading)*x,z:sign.z-Math.sin(sign.heading)*x},n=course.nearest(p.x,p.z);
      check(Math.abs(n.lateral)>course.roadHalfWidthAt(n.s)+1.85,`${def.id}: sign board intrudes on driving clearance`);
      for(const cut of features.shortcuts)if(n.s>=cut.start&&n.s<=cut.end)check(Math.abs(n.lateral-course.shortcutOffset(cut,n.s))>cut.halfWidth+1.85,`${def.id}: sign board blocks shortcut clearance`);
    }
    if(!sign.posts)check(hulls.some(o=>o.id===sign.id),`${def.id}: missing chevron support hull`);
  }
  const route=(start,end,offset)=>{
    let previous=course.groundAt(start,offset(start));const count=Math.ceil((end-start)/8);
    for(let i=1;i<=count;i++){
      const s=start+(end-start)*i/count,p=course.groundAt(s,offset(s)),heading=Math.atan2(p.x-previous.x,p.z-previous.z);
      for(const o of course.obstaclesNear(s-12,s+12).filter(o=>o.signSupport||o.tunnelCover)){
        check(!sweepObstacle(previous,p,o,heading,{halfWidth:1.4,halfLength:2.6}),`${def.id}/${seed}: new hull ${o.id} blocks a Titan-width route at ${s}`);sweeps++;
      }
      previous=p;
    }
  };
  for(const side of[-1,0,1])route(0,course.length,s=>side*(course.roadHalfWidthAt(s)-1.45));
  for(const cut of features.shortcuts)for(const side of[-1,0,1])route(cut.start,cut.end,s=>course.shortcutOffset(cut,s)+side*(cut.halfWidth-1.45));
  if(features.tunnels.length){
    const structures=addRaceStructures(new THREE.Group(),course);structures.updateMatrixWorld(true);
    const rock=structures.children.filter(mesh=>mesh.name==='Circuit rock surface'),lining=structures.children.filter(mesh=>mesh.name==='Circuit lining surface');
    for(const o of hulls.filter(o=>o.tunnelCover))for(const ax of[-1,0,1])for(const az of[-1,0,1]){
      const c=Math.cos(o.heading),s=Math.sin(o.heading),x=o.x+c*o.halfX*ax+s*o.halfZ*az,z=o.z-s*o.halfX*ax+c*o.halfZ*az,n=course.nearest(x,z),floor=course.groundAt(n.s,n.lateral).y;
      ray.set(new THREE.Vector3(x,floor+100,z),down);const hit=ray.intersectObjects(rock,false)[0];
      check(!!hit,`${def.id}/${seed}: cover collider extends outside visible rock`);
      minRock=Math.min(minRock,hit.point.y-floor);check(hit.point.y-floor>1,`${def.id}: hillside hull has no substantial rock overhead`);
    }
    for(const tunnel of features.tunnels)for(let s=tunnel.start+.5;s<tunnel.end;s+=11)for(const off of[-7.45,-6,0,6,7.45]){
      const p=course.worldAt(s,off),ceiling=p.y+3.6+(tunnel.height-3.6)*Math.sqrt(1-(off/tunnel.width)**2);
      ray.set(new THREE.Vector3(p.x,p.y+.1,p.z),up);const hit=ray.intersectObjects(lining,false)[0];
      check(!!hit,`${def.id}: continuous tunnel roof`);maxArchError=Math.max(maxArchError,ceiling-hit.point.y);
      check(ceiling-hit.point.y<.1,`${def.id}: analytic camera ceiling differs from rendered arch`);
    }
  }
}
console.log(`Road furniture: ${checks} checks, ${sweeps} clear Titan hull sweeps; all cover cells within rendered rock (minimum ${minRock.toFixed(2)}m depth); arch approximation error ${maxArchError.toFixed(3)}m.`);
