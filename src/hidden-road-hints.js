import * as THREE from 'three';
import {registerSceneSystem} from './scene-systems.js';

export function hiddenRoadHints(snapshot){
  const eligible=typeof snapshot?.playerId==='string'&&snapshot.playerId.length>0&&snapshot.enabled===true;
  const found=eligible&&snapshot.discoveredGate===true;
  const count=Number.isSafeInteger(snapshot?.pacificFinishes)?Math.max(0,Math.min(10,snapshot.pacificFinishes)):0;
  return{showMenu:found,showPath:found,
    garageTip:eligible&&!found&&count>=5?"Truckers won’t take the dry wash road off Pacific Canyon.":null,
    dustDevil:eligible&&!found&&count>=10};
}

export function hiddenRoadMapKey(snapshot){
  return JSON.stringify([typeof snapshot?.playerId==='string'?snapshot.playerId:'',snapshot?.enabled===true,hiddenRoadHints(snapshot).showPath]);
}

/** Reconstruct a small visual swirl without consuming any random generator. */
export function dustDevilFrame(seconds){
  const time=Number.isFinite(seconds)?Math.max(0,seconds):0;
  return Array.from({length:48},(_,i)=>{
    const height=(i/48+time*.13)%1,angle=i*2.399963+time*2.6+height*2,radius=.35+height*1.9;
    return{x:Math.cos(angle)*radius,y:height*9,z:Math.sin(angle)*radius,
      opacity:.32*Math.sin(Math.PI*height),size:.5+height*.5};
  });
}

export function createHiddenRoadHint(course){
  const group=new THREE.Group();group.name='Hidden Road dust hint';group.visible=false;
  if(!course.hiddenRoad)return group;
  const entrance=course.hiddenRoad.poseAt(14);
  group.position.set(entrance.x,entrance.y+.15,entrance.z);
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array(48*3),3));
  geometry.setAttribute('opacity',new THREE.BufferAttribute(new Float32Array(48),1));
  const material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,
    vertexShader:'attribute float opacity; varying float alpha; void main(){alpha=opacity;vec4 p=modelViewMatrix*vec4(position,1.0);gl_Position=projectionMatrix*p;gl_PointSize=clamp(700.0/max(1.0,-p.z),2.0,48.0);}',
    fragmentShader:'varying float alpha; void main(){float r=length(gl_PointCoord-vec2(.5))*2.0;float soft=1.0-smoothstep(.1,1.0,r);gl_FragColor=vec4(.79,.58,.32,soft*alpha);}'
  });
  const points=new THREE.Points(geometry,material);points.frustumCulled=false;group.add(points);
  let active=false,lastTime=null,elapsed=0,disposed=false;
  function sync(state){
    active=!disposed&&state?.status==='racing'&&!state.paused&&
      state.playerId===state.hiddenRoadDiscovery?.playerId&&hiddenRoadHints(state.hiddenRoadDiscovery).dustDevil;
    group.visible=active;if(!active)lastTime=null;
  }
  function animate(seconds){
    if(!active||!Number.isFinite(seconds))return;
    if(lastTime!==null)elapsed+=Math.max(0,Math.min(.1,seconds-lastTime));lastTime=seconds;
    const frame=dustDevilFrame(elapsed);
    for(let i=0;i<frame.length;i++){const p=frame[i];geometry.attributes.position.setXYZ(i,p.x,p.y,p.z);geometry.attributes.opacity.setX(i,p.opacity);}
    geometry.attributes.position.needsUpdate=geometry.attributes.opacity.needsUpdate=true;
  }
  group.userData.sync=sync;group.userData.animate=animate;
  registerSceneSystem(group,{sync,animate,dispose(){disposed=true;active=false;group.visible=false;}});
  return group;
}
