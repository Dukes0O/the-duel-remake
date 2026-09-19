import assert from 'node:assert/strict';
import {Course} from '../src/course.js';
import {COURSE} from '../src/config.js';
import {constrainTunnelCamera} from '../src/camera-clearance.js';
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
