import assert from 'node:assert/strict';
import {Course} from '../src/course.js';
import {COURSE} from '../src/config.js';
import {constrainTunnelCamera} from '../src/camera-clearance.js';
import * as clearance from '../src/camera-clearance.js';
import {sweepObstacle} from '../src/collision.js';
import {HARBOUR_LIGHTS} from '../src/circuits/harbour-lights.js';
import {TREMBLANT_SNOW} from '../src/circuits/tremblant-snow.js';
let checks=0;
for(const def of COURSE)for(const seed of[1989,42]){
 const course=new Course(def,seed);
 for(const tunnel of course.features.tunnels)for(const s of[tunnel.start+.1,(tunnel.start+tunnel.end)/2,tunnel.end-.1])for(const off of[-7.45,0,7.45]){
  const position=course.worldAt(s,off);position.y+=12;
  const target={...position};constrainTunnelCamera(course,target,s);
  position.y+=(target.y-position.y)*(1-Math.exp(-14/60));
  assert.ok(constrainTunnelCamera(course,position,s),'Damped camera is clamped in its first tunnel frame');checks++;
  const theta=Math.asin(Math.abs(off)/tunnel.width),step=Math.PI/20,index=Math.floor((theta+Math.PI/2)/step),a=-Math.PI/2+index*step,b=a+step;
  const x=Math.abs(off)/tunnel.width,u=(x-Math.sin(a))/(Math.sin(b)-Math.sin(a));
  const chord=Math.cos(a)+(Math.cos(b)-Math.cos(a))*u,roof=course.at(s).y+3.6+(tunnel.height-3.6)*chord;
  assert.ok(position.y<roof-.25,'Camera stays below the actual segmented roof with near-plane clearance');checks++;
  const low=course.worldAt(s,off);low.y+=1.4;const y=low.y;
  constrainTunnelCamera(course,low,s);assert.equal(low.y,y,'Hood camera is unaffected');checks++;
 }
 const outdoor=course.worldAt(0,0);outdoor.y+=12;const y=outdoor.y;constrainTunnelCamera(course,outdoor,0);assert.equal(outdoor.y,y,'Outdoor camera is unaffected');checks++;
}
console.log(`Camera clearance: ${checks} portal, roof and damping checks passed.`);

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
