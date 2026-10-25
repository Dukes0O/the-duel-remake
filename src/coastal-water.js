import * as THREE from 'three';
import { registerSceneSystem } from './scene-systems.js';

export const SEA_LEVEL=-15;

// Locate the first beach crossing, leaving headlands and elevated sections dry.
export function shoreOffset(course,s){
  let previous=28,previousY=course.groundAt(s,previous).y;
  for(let off=30;off<=124;off+=2){
    const y=course.groundAt(s,off).y;
    if(previousY>SEA_LEVEL&&y<=SEA_LEVEL){
      let low=previous,high=off;
      for(let i=0;i<12;i++){const middle=(low+high)/2;if(course.groundAt(s,middle).y>SEA_LEVEL)low=middle;else high=middle;}
      return(low+high)/2;
    }
    previous=off;previousY=y;
  }
  return null;
}

export function shoreFoamGeometry(course){
  const positions=[],uv=[],indices=[];
  for(const section of course.sections.filter(section=>section.theme==='coast')){
    let last=null;
    for(let s=section.start;s<=section.end;s+=8){
      const off=shoreOffset(course,s);if(off===null){last=null;continue;}
      const row=positions.length/3;
      for(const [edge,offset]of [[0,off-.3],[1,off+3.8]]){const p=course.worldAt(s,offset);positions.push(p.x,SEA_LEVEL+.035,p.z);uv.push(edge,s*.09);}
      if(last!==null)indices.push(last,row,last+1,last+1,row,row+1);
      last=row;
    }
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.setIndex(indices);geometry.computeVertexNormals();return geometry;
}

export function addCoastalWater(group,course){
  const time={value:0};
  const showcase=course.def.id==='pacific-canyon';
  const material=new THREE.MeshPhysicalMaterial({color:0x245765,metalness:.02,roughness:.19,ior:1.333,specularIntensity:1,envMapIntensity:1.2,transparent:true,opacity:.96});
  if(showcase){material.color.set(0x3b666d);material.roughness=.24;}
  material.customProgramCacheKey=()=> showcase?'pacific-layered-waves-v1':'coastal-world-waves-v1';
  material.onBeforeCompile=shader=>{
    shader.uniforms.coastalTime=time;
    shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vCoastalPosition;').replace('#include <begin_vertex>','#include <begin_vertex>\nvCoastalPosition=(modelMatrix*vec4(transformed,1.0)).xyz;');
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vCoastalPosition;\nuniform float coastalTime;').replace('#include <normal_fragment_maps>',`
      vec2 sea=vCoastalPosition.xz;
      float a=dot(sea,vec2(.12,.19))-coastalTime*.72;
      float b=dot(sea,vec2(.31,-.14))-coastalTime*1.13;
      float c=dot(sea,vec2(.73,.64))-coastalTime*1.52;
      vec2 gradient=cos(a)*vec2(.045,.071)+cos(b)*vec2(.056,-.025)+cos(c)*vec2(.023,.02);
      float farFade=1.0/(1.0+pow(distance(cameraPosition,vCoastalPosition)/1600.0,2.0));
      normal=normalize(mat3(viewMatrix)*normalize(vec3(-gradient.x*farFade,1.0,-gradient.y*farFade)));
    `).replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nroughnessFactor=clamp(roughnessFactor+.035*sin(vCoastalPosition.x*.031+vCoastalPosition.z*.021),.12,.3);');
    if(showcase)shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
      vec2 wavePlace=vCoastalPosition.xz;
      float longSwell=sin(dot(wavePlace,vec2(.083,.127))-coastalTime*.53);
      float crossSwell=sin(dot(wavePlace,vec2(.29,-.18))-coastalTime*.92);
      float fragments=sin(wavePlace.x*.78+sin(wavePlace.y*.56)*1.7);
      float whitecap=smoothstep(.84,.995,longSwell)*smoothstep(.58,.93,crossSwell)*smoothstep(.25,.88,fragments);
      diffuseColor.rgb*=.94+.065*longSwell+.025*crossSwell;
      diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.59,.69,.65),whitecap*.28);
    `);
  };
  const water=new THREE.Mesh(new THREE.PlaneGeometry(12000,12000),material);water.name='Coastal ocean';water.rotation.x=-Math.PI/2;water.position.set(0,SEA_LEVEL,course.length*.45);water.receiveShadow=true;group.add(water);
  const foamMaterial=new THREE.MeshBasicMaterial({color:0xcbdcd8,transparent:true,opacity:.7,depthWrite:false,side:THREE.DoubleSide});
  foamMaterial.customProgramCacheKey=()=> 'shore-foam-v1';
  foamMaterial.onBeforeCompile=shader=>{
    shader.uniforms.coastalTime=time;
    shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec2 vShoreUv;').replace('#include <begin_vertex>','#include <begin_vertex>\nvShoreUv=uv;');
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec2 vShoreUv;\nuniform float coastalTime;').replace('#include <color_fragment>',`#include <color_fragment>
      float edge=sin(clamp(vShoreUv.x,0.0,1.0)*3.14159265);
      float broken=sin(vShoreUv.y*3.7+sin(vShoreUv.y*.71)*2.0+coastalTime*.8)*.5+.5;
      float wash=sin(vShoreUv.x*17.0-vShoreUv.y*.7-coastalTime*1.5)*.5+.5;
      diffuseColor.a*=pow(edge,1.6)*smoothstep(.22,.83,broken*.6+wash*.4);
    `);
  };
  const foam=new THREE.Mesh(shoreFoamGeometry(course),foamMaterial);foam.name='Breaking shoreline foam';group.add(foam);
  // Draw the Pacific ocean before either transparent foam layer. Keep depth
  // testing so the terrain and solid sea stacks still occlude the surf.
  if(showcase){water.renderOrder=-2;foam.renderOrder=-1;}
  if(course.deepRamp){
    // DEEP-RAMP-2: a full-width worn concrete deck, kerbs and visible turn-off.
    const ramp=course.deepRamp,positions=[],indices=[],uv=[];
    for(const point of ramp.points)for(const side of [-1,1]){uv.push(side<0?0:1,point.progress/4);positions.push(
      point.x+Math.cos(ramp.heading)*ramp.width/2*side,point.y+.035,
      point.z-Math.sin(ramp.heading)*ramp.width/2*side);}
    for(let row=1;row<ramp.points.length;row++){const a=(row-1)*2,b=row*2;indices.push(a,b,a+1,a+1,b,b+1);}
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
    geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
    geometry.setIndex(indices);geometry.computeVertexNormals();
    const boatRamp=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color:0x92988b,roughness:.96,side:THREE.DoubleSide}));
    boatRamp.name='Pacific Deep boat ramp';boatRamp.receiveShadow=true;group.add(boatRamp);
    const material=boatRamp.material;
    material.onBeforeCompile=shader=>{
      shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec2 vRampUv;').replace('#include <begin_vertex>','#include <begin_vertex>\nvRampUv=uv;');
      shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec2 vRampUv;').replace('#include <color_fragment>',`#include <color_fragment>
        float grain=sin(vRampUv.x*873.0+sin(vRampUv.y*741.0))*sin(vRampUv.y*937.0);
        float groove=smoothstep(.85,.98,cos(vRampUv.y*25.13));
        float tracks=exp(-pow((abs(vRampUv.x-.5)-.12)*24.0,2.0));
        diffuseColor.rgb*=.92+grain*.045-groove*.16-tracks*.10;`);
    };
    material.customProgramCacheKey=()=> 'deep-ramp-2-concrete';
    const kerbMaterial=new THREE.MeshStandardMaterial({color:0xaaa999,roughness:1});
    const first=ramp.points[0],last=ramp.points.at(-1),pitch=Math.atan2(first.y-last.y,last.horizontal);
    for(const side of [-1,1]){
      const kerb=new THREE.Mesh(new THREE.BoxGeometry(.24,.22,ramp.length),kerbMaterial);
      kerb.name='Boat ramp low kerb';kerb.position.set((first.x+last.x)/2+Math.cos(ramp.heading)*side*6,
        (first.y+last.y)/2+.12,(first.z+last.z)/2-Math.sin(ramp.heading)*side*6);
      kerb.rotation.set(0,ramp.heading,0);kerb.rotateX(pitch);kerb.receiveShadow=true;group.add(kerb);
      const post=new THREE.Mesh(new THREE.BoxGeometry(.3,1.2,.3),kerbMaterial);
      post.name='Boat ramp entrance post';post.position.set(first.x+Math.cos(ramp.heading)*side*6.6,first.y+.6,
        first.z-Math.sin(ramp.heading)*side*6.6);group.add(post);
    }
    const canvas=document.createElement('canvas');canvas.width=512;canvas.height=160;
    const ctx=canvas.getContext('2d');ctx.fillStyle='#65776a';ctx.fillRect(0,0,512,160);
    ctx.strokeStyle='#c0bda3';ctx.lineWidth=6;ctx.strokeRect(8,8,496,144);
    ctx.fillStyle='#ded8b9';ctx.font='bold 57px sans-serif';ctx.textAlign='center';ctx.fillText('BOAT RAMP',256,99);
    const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
    const sign=new THREE.Group();sign.name='Faded BOAT RAMP sign';
    const signMaterial=new THREE.MeshStandardMaterial({map:texture,roughness:1});
    for(const facing of [0,Math.PI]){const face=new THREE.Mesh(new THREE.PlaneGeometry(2.8,.9),signMaterial);
      face.rotation.y=facing;face.position.z=facing===0?.04:-.04;sign.add(face);}
    const stem=new THREE.Mesh(new THREE.BoxGeometry(.12,2.1,.12),kerbMaterial);stem.position.y=-.8;sign.add(stem);
    sign.position.set(first.x+Math.cos(ramp.heading)*7.6,first.y+2,first.z-Math.sin(ramp.heading)*7.6);
    sign.rotation.y=ramp.heading-Math.PI/2;group.add(sign);
  }

  registerSceneSystem(group, { animate: t => { time.value = t; } });
  return {water,foam};
}
