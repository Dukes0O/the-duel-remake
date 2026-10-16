import assert from 'node:assert/strict';
import * as THREE from 'three';
import {Course} from '../src/course.js';
import {COURSE} from '../src/config.js';
import {constrainTunnelCamera} from '../src/camera-clearance.js';
import * as clearance from '../src/camera-clearance.js';
import {sweepObstacle} from '../src/collision.js';
import {HARBOUR_LIGHTS} from '../src/circuits/harbour-lights.js';
import {TREMBLANT_SNOW} from '../src/circuits/tremblant-snow.js';
import {SUMMIT_RUN} from '../src/circuits/summit-run.js';
let checks=0;
for(const def of COURSE)for(const seed of[1989,42]){
 const course=new Course(def,seed);
 for(const tunnel of course.features.tunnels)for(const s of[tunnel.start+.1,(tunnel.start+tunnel.end)/2,tunnel.end-.1])for(const off of(tunnel.flatRoof?[-4,-2,0,2,4]:[-7.45,0,7.45])){
  const position=course.worldAt(s,off);position.y+=12;
  const target={...position};constrainTunnelCamera(course,target,s);
  position.y+=(target.y-position.y)*(1-Math.exp(-14/60));
  assert.ok(constrainTunnelCamera(course,position,s),'Damped camera is clamped in its first tunnel frame');checks++;
  const theta=Math.asin(Math.abs(off)/tunnel.width),step=Math.PI/20,index=Math.floor((theta+Math.PI/2)/step),a=-Math.PI/2+index*step,b=a+step;
  const x=Math.abs(off)/tunnel.width,u=(x-Math.sin(a))/(Math.sin(b)-Math.sin(a));
  const chord=Math.cos(a)+(Math.cos(b)-Math.cos(a))*u,roof=course.at(s).y+3.6+(tunnel.height-3.6)*chord;
  assert.ok(position.y<roof-.25,'Camera stays below the actual segmented roof with near-plane clearance');checks++;
  if(tunnel.flatRoof){
    const flatRoof=course.groundAt(s,0).y+tunnel.height;
    assert.ok(Number.isFinite(roof)&&position.y<=flatRoof-.45,'Gallery camera stays under its flat roof too');checks++;
  }
  const low=course.worldAt(s,off);low.y+=1.4;const y=low.y;
  constrainTunnelCamera(course,low,s);assert.equal(low.y,y,'Hood camera is unaffected');checks++;
 }
 const outdoor=course.worldAt(0,0);outdoor.y+=12;const y=outdoor.y;constrainTunnelCamera(course,outdoor,0);assert.equal(outdoor.y,y,'Outdoor camera is unaffected');checks++;
}
console.log(`Camera clearance: ${checks} portal, roof and damping checks passed.`);

// Positive Gallery witnesses use actual placed kit roofs, including the outer
// 4 m position where the old flat-only clamp crossed the accepted lining.
{
 const course=new Course(SUMMIT_RUN,1989),tunnel=course.features.tunnels.find(row=>row.id==='summit-gallery');
 const roofs=course.features.obstacles.filter(row=>row.sourceBounds==='gallery-heavy-concrete-roof');
 assert.ok(tunnel?.flatRoof&&roofs.length>0,'Gallery has its accepted flat kit roofs and lining');checks++;
 for(const roof of roofs)for(const off of[0,2,4]){
  const position=course.worldAt(roof.kitS,off);position.y+=12;
  assert.ok(constrainTunnelCamera(course,position,roof.kitS),'Gallery camera is clamped beneath both accepted roofs');checks++;
  const projected=course.nearest(position.x,position.z,roof.kitS),actualTunnel=course.tunnelAt(projected.s,projected.lateral);
  const road=course.at(projected.s).y,r=Math.min(.995,Math.abs(projected.lateral)/actualTunnel.width);
  const arch=road+3.6+(actualTunnel.height-3.6)*Math.sqrt(1-r*r);
  const flat=course.groundAt(projected.s,0).y+actualTunnel.height;
  assert.ok(position.y<=arch-.45&&position.y<=flat-.45,'Gallery clamp respects both analytic ceilings at the actual projected frame');checks++;
  assert.ok(sweepObstacle(position,position,roof,0,{halfWidth:0,halfLength:0}),'Gallery witness lies beneath the actual placed roof footprint');checks++;
  assert.ok(position.y<=roof.minY-.45,'Gallery camera clears the actual placed kit roof underside');checks++;
 }
}

// Actual target-aware positions: no renderer, race or input mutation.
{
 const wall={id:'lining',barrier:true,kitSolid:true,shape:'box',x:0,z:-4,y:0,minY:0,maxY:4,height:4,heading:.35,halfX:8,halfZ:.3};
 const course={features:{obstacles:[wall],tunnels:[]}};
 const camera={x:0,y:2,z:-12},target={x:0,y:1.1,z:0};
 const before=JSON.stringify({course,camera,target});
 assert.ok(sweepObstacle(target,camera,wall,0,{halfWidth:0,halfLength:0,height:0}),'original camera is behind actual rotated lining');
 const clear=clearance.clearCameraSightline(course,camera,target,123);
 assert.notEqual(clear,camera,'pure camera result is a new position');
 assert.equal(JSON.stringify({course,camera,target}),before,'course, target and input camera stay unchanged');
 assert.equal(sweepObstacle(target,clear,wall,0,{halfWidth:0,halfLength:0,height:0}),null,'actual target has clear 3D sightline');
 assert.ok(clear.y>camera.y&&Math.hypot(clear.x-target.x,clear.z-target.z)<12,'blocked camera pulls in and rises');
 const outside={x:20,y:2,z:-12};
 assert.deepEqual(clearance.clearCameraSightline(course,outside,target,123),outside,'clear existing camera position stays exact');
 checks+=6;
}

for(const def of [HARBOUR_LIGHTS,TREMBLANT_SNOW]){
 const course=new Course(def,1989),snapshot=JSON.stringify(course.features);
 const visible=p=>course.features.obstacles.filter(row=>row.barrier||row.tunnelWall||row.kitSolid||row.trackWall);
 for(let s=0;s<course.length;s+=25){
  const camera=course.worldAt(s-12,0);camera.y+=5;
  const target=course.worldAt(s,0);target.y+=1.1;
  const input=JSON.stringify({camera,target});
  const clear=clearance.clearCameraSightline(course,camera,target,s);
  assert.ok([clear.x,clear.y,clear.z].every(Number.isFinite),'finite target-aware position on '+def.id+' at '+s);
  assert.ok(visible(clear).every(row=>!sweepObstacle(target,clear,row,0,{halfWidth:0,halfLength:0,height:0})),
    'no wall between actual car target and returned camera on '+def.id+' at '+s);
  assert.equal(JSON.stringify({camera,target}),input,'camera/target remain read only');
  checks+=3;
 }
 assert.equal(JSON.stringify(course.features),snapshot,'camera sweep never changes physical features');checks++;
}
console.log('Target-aware camera: '+checks+' total tunnel/visibility/input checks passed.');

// Real native Lantern pose: a clear ray can still point the car out of frame.
{
 const camera=new THREE.PerspectiveCamera(55,1280/800,.15,2400);
 camera.position.set(-975.5890524510698,38.68503138833465,964.8968751048432);
 const body=new THREE.Vector3(-984.1301261934653,36.095000005960486,966.5034248215527);
 const forward=new THREE.Vector3(-998.0272022253633,36.085,951.3105459699659);
 camera.lookAt(forward);camera.updateMatrixWorld();
 const projection=body.clone().project(camera);
 assert.ok(projection.x < -1,'actual Lantern forward aim leaves the player outside the frame');
 const before=JSON.stringify({projection,forward,body});
 const aim=clearance.selectCameraAim(projection,forward,body);
 assert.equal(aim,body,'out-of-frame actual player becomes the viewing aim');
 camera.lookAt(aim);camera.updateMatrixWorld();
 const corrected=body.clone().project(camera);
 assert.ok(Math.abs(corrected.x)<=1&&Math.abs(corrected.y)<=1&&corrected.z>=-1&&corrected.z<=1,
   'actual body is inside the native perspective frustum after the aim correction');
 assert.equal(JSON.stringify({projection,forward,body}),before,'projection and both aim inputs are read only');
 camera.position.set(0,3.65,-8.7);forward.set(0,1.05,26);body.set(0,1.05,0);
 camera.lookAt(forward);camera.updateMatrixWorld();
 const straight=body.clone().project(camera);
 assert.ok(Math.abs(straight.x)<=1&&Math.abs(straight.y)<=1&&straight.z>=-1&&straight.z<=1,
   'existing straight-road forward aim already keeps the body inside the frame');
 assert.equal(clearance.selectCameraAim(straight,forward,body),forward,'inside-frustum forward aim is preserved by identity');
 for(const outside of [{x:1.01,y:0,z:0},{x:0,y:-1.01,z:0},{x:0,y:0,z:1.01},
   {x:0,y:0,z:-1.01},{x:NaN,y:0,z:0},{x:0,y:Infinity,z:0}]){
  assert.equal(clearance.selectCameraAim(outside,forward,body),body,'outside, behind and nonfinite projections use the actual body');
 }
 assert.equal(clearance.selectCameraAim({x:1,y:-1,z:1},forward,body),forward,'exact native frustum boundaries stay unchanged');
 checks+=13;
}
console.log('Camera framing: '+checks+' total unchanged-clearance and real perspective checks passed.');
