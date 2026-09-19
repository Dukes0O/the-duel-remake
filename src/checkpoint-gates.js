import * as THREE from 'three';

function bannerAtlas(){
  if(typeof document==='undefined'){
    const map=new THREE.DataTexture(new Uint8Array([245,168,61,255]),1,1);map.needsUpdate=true;return map;
  }
  const canvas=document.createElement('canvas');canvas.width=2048;canvas.height=768;
  const ctx=canvas.getContext('2d');
  for(let index=0;index<6;index++){
    const y=index*128;ctx.fillStyle='#e6d8ba';ctx.fillRect(0,y,2048,128);
    ctx.fillStyle='#dc572d';ctx.fillRect(0,y,530,128);ctx.fillRect(1518,y,530,128);
    ctx.fillStyle='#173332';ctx.font='bold 84px Arial';ctx.textAlign='center';ctx.fillText(`CHECKPOINT  ${String(index+1).padStart(2,'0')}`,1024,y+94);
    ctx.fillStyle='#eee6d4';
    for(let x=25;x<515;x+=82){ctx.beginPath();ctx.moveTo(x,y+8);ctx.lineTo(x+46,y+8);ctx.lineTo(x+10,y+120);ctx.lineTo(x-36,y+120);ctx.fill();
      ctx.beginPath();ctx.moveTo(2048-x,y+8);ctx.lineTo(2002-x,y+8);ctx.lineTo(2038-x,y+120);ctx.lineTo(2084-x,y+120);ctx.fill();}
  }
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=8;return texture;
}

// Supports use the same dimensions as their physical Course obstacles.
// Fabric and the crossbar remain above the guaranteed vehicle clearance.
export function addCheckpointGates(world,course){
  const gates=course.features.rushGates;if(!gates?.length)return null;
  const group=new THREE.Group();group.name='Timberline checkpoint gates';
  const steel=new THREE.MeshStandardMaterial({color:0x546461,metalness:.62,roughness:.49});
  const tape=new THREE.MeshStandardMaterial({color:0xf0e0ba,roughness:.85});
  const map=bannerAtlas(),time={value:0};
  const fabric=new THREE.MeshStandardMaterial({map,roughness:1,side:THREE.DoubleSide});
  fabric.onBeforeCompile=shader=>{
    shader.uniforms.gateTime=time;
    shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nuniform float gateTime;')
      .replace('#include <begin_vertex>','#include <begin_vertex>\ntransformed.z+=sin(position.x*2.0+gateTime*2.2)*.09*clamp(.5-position.y/.85,0.0,1.0);');
  };
  fabric.customProgramCacheKey=()=> 'checkpoint-fabric-v1';
  const lamps=[];
  const box=(size,position,material,parent)=>{
    const mesh=new THREE.Mesh(new THREE.BoxGeometry(...size),material);mesh.position.set(...position);mesh.castShadow=mesh.receiveShadow=true;parent.add(mesh);return mesh;
  };
  for(const gate of gates){
    for(const post of gate.posts){
      const support=new THREE.Group();support.position.set(post.x,post.y,post.z);support.rotation.y=post.heading;
      box([post.halfX*2,post.height,post.halfZ*2],[0,post.height/2,0],steel,support);
      for(const h of[.55,1.05,1.55])box([post.halfX*2+.008,.15,post.halfZ*2+.008],[0,h,0],tape,support);
      group.add(support);
    }
    const center=course.worldAt(gate.s),width=Math.hypot(gate.posts[1].x-gate.posts[0].x,gate.posts[1].z-gate.posts[0].z);
    const frame=new THREE.Group();frame.position.set(center.x,gate.bannerBottomY,center.z);frame.rotation.y=center.heading;
    box([width,.13,.13],[0,gate.bannerHeight+.12,0],steel,frame);
    const geometry=new THREE.PlaneGeometry(width-.4,gate.bannerHeight,32,1),uv=geometry.attributes.uv;
    for(let i=0;i<uv.count;i++)uv.setY(i,(uv.getY(i)+5-gate.index)/6);
    geometry.computeBoundingBox();geometry.boundingBox.min.z-=.1;geometry.boundingBox.max.z+=.1;geometry.computeBoundingSphere();geometry.boundingSphere.radius+=.1;
    const banner=new THREE.Mesh(geometry,fabric);banner.position.y=gate.bannerHeight/2;banner.rotation.y=Math.PI;banner.castShadow=banner.receiveShadow=true;frame.add(banner);
    const signalMaterial=new THREE.MeshStandardMaterial({color:0xd8a660,emissive:0x9a5120,emissiveIntensity:.2,roughness:.4});
    for(const side of[-1,1])box([.55,.12,.18],[side*(width*.5-.55),gate.bannerHeight+.23,0],signalMaterial,frame);
    lamps.push(signalMaterial);group.add(frame);
  }
  group.userData.updateSimulation=state=>{
    const next=state.checkpointRush?.nextGate??0,total=state.checkpointRush?.total??12;
    lamps.forEach((material,index)=>{
      const active=next<total&&index===next%gates.length;
      material.color.set(active?0x84e0b8:0xd8a660);material.emissive.set(active?0x24ad69:0x9a5120);material.emissiveIntensity=active?1.1:.2;
    });
  };
  (world.userData.updates??=[]).push(t=>{time.value=t;});
  const previous=world.userData.updateSimulation;
  world.userData.updateSimulation=(state,dt)=>{previous?.(state,dt);group.userData.updateSimulation(state);};
  world.add(group);return group;
}
