import {registerSceneSystem,animateScene,syncScene} from '../src/scene-systems.js';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {Course} from '../src/course.js';
import {COURSE} from '../src/config.js';
import {addCheckpointGates} from '../src/checkpoint-gates.js';
import {disposeTree,strip} from '../src/world.js';

let checks=0,roadRays=0,minClearance=Infinity;
const check=(condition,message)=>{assert.ok(condition,message);checks++;};
const equal=(a,b,message)=>{assert.deepEqual(a,b,message);checks++;};
const previousDocument=globalThis.document;
globalThis.document={createElement(tag){
  equal(tag,'canvas');const canvas={width:0,height:0,labels:[]};
  const ctx={fillRect(){},beginPath(){},moveTo(){},lineTo(){},fill(){},fillText(text,x,y){canvas.labels.push({text,x,y,color:this.fillStyle,font:this.font});}};
  canvas.getContext=()=>ctx;return canvas;
}};
const point=new THREE.Vector3(),other=new THREE.Vector3(),normal=new THREE.Vector3(),ray=new THREE.Raycaster(),down=new THREE.Vector3(0,-1,0);
try{
  const empty=new THREE.Group();equal(addCheckpointGates(empty,{features:{rushGates:[]}}),null);equal(empty.children.length,0);animateScene(empty,1);syncScene(empty,{},0);check(!empty.userData.updates,'No legacy callback arrays are created');
  const def=COURSE.find(course=>course.id==='timberline-rush');check(!!def&&def.checkpointRush.gatesPerLap===6,'The event has six gates per lap');
  for(const seed of[1989,42,17]){
    const course=new Course(def,seed),features=JSON.stringify(course.features.rushGates),obstacles=JSON.stringify(course.features.obstacles),world=new THREE.Group();
    let previousCalls=0,lastState,lastDt;registerSceneSystem(world,{sync:(state,dt)=>{previousCalls++;lastState=state;lastDt=dt;}});
    const gates=addCheckpointGates(world,course);world.updateMatrixWorld(true);
    equal(course.features.rushGates.map(gate=>gate.index),[0,1,2,3,4,5]);equal(gates.children.length,18,'Each gate has two physical supports and one clear overhead frame');
    const road=new THREE.Mesh(strip(course,s=>-course.roadHalfWidthAt(s),s=>course.roadHalfWidthAt(s),.035),new THREE.MeshBasicMaterial({side:THREE.DoubleSide}));road.updateMatrixWorld(true);
    const banners=[],signals=[],steelMaterials=new Set(),tapeMaterials=new Set();
    for(const gate of course.features.rushGates){
      const supports=gates.children.slice(gate.index*3,gate.index*3+2),frame=gates.children[gate.index*3+2];
      for(let index=0;index<2;index++){
        const post=gate.posts[index],hull=course.features.obstacles.find(obstacle=>obstacle.id===post.id),support=supports[index],steel=support.children[0];
        check(hull?.rushGateSupport&&hull.shape==='box','Every drawn support has the matching physical post');
        const size=steel.geometry.parameters;equal([size.width,size.height,size.depth],[hull.halfX*2,hull.height,hull.halfZ*2],'Steel dimensions exactly match the collider');
        equal(support.position.toArray(),[hull.x,hull.y,hull.z]);equal(support.rotation.y,hull.heading);
        steelMaterials.add(steel.material);equal(support.children.length,4,'Original three thin visibility tapes remain on the support');
        for(const mesh of support.children){
          check(mesh.castShadow&&mesh.receiveShadow,'Supports keep natural shadow response');
          if(mesh!==steel){tapeMaterials.add(mesh.material);check(mesh.geometry.parameters.width<=hull.halfX*2+.008001&&mesh.geometry.parameters.depth<=hull.halfZ*2+.008001,'Tape is only a 4 mm cosmetic skin');}
          const vertices=mesh.geometry.attributes.position;
          for(let n=0;n<vertices.count;n++){
            point.fromBufferAttribute(vertices,n).applyMatrix4(mesh.matrixWorld);
            const dx=point.x-hull.x,dz=point.z-hull.z,c=Math.cos(hull.heading),s=Math.sin(hull.heading),margin=mesh===steel?.000001:.004001;
            check(Math.abs(dx*c-dz*s)<=hull.halfX+margin&&Math.abs(dx*s+dz*c)<=hull.halfZ+margin,'Visible support fits its physical footprint');
            check(point.y>=hull.y-.000001&&point.y<=hull.y+hull.height+.000001,'No post floats or exceeds its collider height');
            const near=course.nearest(point.x,point.z);check(Math.abs(near.lateral)>course.roadHalfWidthAt(near.s)+1.8,'Posts stay clear of the entire road corridor');
          }
        }
        check(Math.abs(post.y+post.height-(gate.bannerBottomY+gate.bannerHeight+.2))<1e-9,'Post tops follow the shared banner elevation');
      }
      const banner=frame.children.find(mesh=>mesh.geometry.type==='PlaneGeometry'),lamps=frame.children.filter(mesh=>mesh.geometry.parameters.width===.55);
      check(!!banner&&lamps.length===2,'A readable cloth banner and two signals span each gate');banners.push(banner);signals.push(lamps[0].material);
      check(lamps[0].material===lamps[1].material,'Both gate signals change together');
      const uv=banner.geometry.attributes.uv,vertices=banner.geometry.attributes.position;
      for(let i=0;i<uv.count;i++){
        const imageY=(1-uv.getY(i))*768;
        check(imageY>=gate.index*128-.0001&&imageY<=(gate.index+1)*128+.0001,'Each banner samples only its own atlas row');
      }
      const centerV=(uv.getY(0)+uv.getY(uv.count-1))/2;equal(Math.floor((1-centerV)*6),gate.index,'Atlas indices display 01 through 06 without inversion');
      normal.set(0,0,1).transformDirection(banner.matrixWorld);const center=course.worldAt(gate.s),approach=new THREE.Vector3(-Math.sin(center.heading),0,-Math.cos(center.heading));
      check(normal.dot(approach)>.99999,'Banner text faces approaching drivers');
      point.fromBufferAttribute(vertices,0).applyMatrix4(banner.matrixWorld);other.fromBufferAttribute(vertices,32).applyMatrix4(banner.matrixWorld).sub(point);
      check(other.dot(new THREE.Vector3(-Math.cos(center.heading),0,Math.sin(center.heading)))>0,'Atlas text reads left-to-right from the chase camera');
      for(const t of[0,.7,2.5,10])for(let i=0;i<vertices.count;i++){
        point.fromBufferAttribute(vertices,i);point.z+=Math.sin(point.x*2+t*2.2)*.09*Math.max(0,Math.min(1,.5-point.y/.85));
        check(banner.geometry.boundingBox.containsPoint(point)&&banner.geometry.boundingSphere.containsPoint(point),'Fabric culling bounds include every wind extreme');
        point.applyMatrix4(banner.matrixWorld);
        // Rays use the actual rendered triangle surface, including gravel
        // ripples and its 3.5 cm offset, rather than only the centerline height.
        if(i>=vertices.count/2){
          ray.set(new THREE.Vector3(point.x,point.y+1,point.z),down);const hit=ray.intersectObject(road,false)[0];
          if(hit){const clearance=point.y-hit.point.y;minClearance=Math.min(minClearance,clearance);check(clearance>=5.3-.0001,'Fabric underside stays at least 5.3 m above actual road triangles');roadRays++;}
        }
      }
      const crossbar=frame.children[0];crossbar.geometry.computeBoundingBox();const beamBox=crossbar.geometry.boundingBox.clone().applyMatrix4(crossbar.matrixWorld);
      check(beamBox.min.y>gate.bannerBottomY+gate.bannerHeight,'Rigid crossbar remains above the cloth and driving clearance');
    }
    equal(steelMaterials.size,1);equal(tapeMaterials.size,1);equal(new Set(banners.map(banner=>banner.material)).size,1,'All six fabric banners share one material and atlas');
    const material=banners[0].material,map=material.map;check(material.side===THREE.DoubleSide&&material.roughness===1&&map.colorSpace===THREE.SRGBColorSpace&&map.anisotropy===8,'Cloth keeps matte lighting and a correctly encoded sharp atlas');
    equal(map.image.labels.map(label=>label.text),['CHECKPOINT  01','CHECKPOINT  02','CHECKPOINT  03','CHECKPOINT  04','CHECKPOINT  05','CHECKPOINT  06']);
    map.image.labels.forEach((label,index)=>check(label.y>index*128&&label.y<(index+1)*128&&label.x===1024,'Each label is centered within its atlas tile'));
    const shaders=[0,1].map(()=>({uniforms:{},vertexShader:THREE.ShaderLib.standard.vertexShader}));shaders.forEach(shader=>material.onBeforeCompile(shader));
    equal(shaders[0].uniforms.gateTime,shaders[1].uniforms.gateTime,'Shader programs share one wind clock');animateScene(world,12.25);equal(shaders[0].uniforms.gateTime.value,12.25);
    for(let next=0;next<=13;next++){
      const state={checkpointRush:{nextGate:next,total:12}},before=previousCalls;syncScene(world,state,1/120);
      equal(previousCalls,before+1,'Existing scenery update callback remains composed');equal(lastState,state);equal(lastDt,1/120);
      signals.forEach((signal,index)=>{const active=next<12&&index===next%6;equal(signal.emissiveIntensity,active?1.1:.2,'Highlight follows the absolute nextGate index across both laps');equal(signal.color.getHex(),active?0x84e0b8:0xd8a660);});
    }
    syncScene(world,{checkpointRush:{nextGate:6,total:6}},0);check(signals.every(signal=>signal.emissiveIntensity===.2),'Completed events do not light an extra lap gate');
    equal(JSON.stringify(course.features.rushGates),features);equal(JSON.stringify(course.features.obstacles),obstacles,'Renderer cannot change gate positions or colliders');
    const resources=new Set();world.traverse(mesh=>{if(mesh.geometry)resources.add(mesh.geometry);if(mesh.material){resources.add(mesh.material);for(const value of Object.values(mesh.material))if(value?.isTexture)resources.add(value);}});
    const disposed=new Map([...resources].map(resource=>[resource,0]));for(const resource of resources)resource.addEventListener('dispose',()=>disposed.set(resource,disposed.get(resource)+1));
    const otherWorld=new THREE.Group(),otherGates=addCheckpointGates(otherWorld,course);otherGates.traverse(mesh=>{if(mesh.material)check(!resources.has(mesh.material),'A second scene owns independent gate materials');});
    disposeTree(world);for(const count of disposed.values())equal(count,1,'Shared resources are disposed exactly once');disposeTree(otherWorld);for(const count of disposed.values())equal(count,1,'Scene disposal does not affect another scene');
    road.geometry.dispose();road.material.dispose();
  }
}finally{globalThis.document=previousDocument;}
check(roadRays>1000,'All gate spans and wind phases were checked against rendered gravel');
console.log(`Checkpoint gates: ${checks} checks, ${roadRays} road-triangle rays across seeds 1989/42/17; minimum underside clearance ${minClearance.toFixed(3)}m; correct atlas direction, two-lap signals, physical supports, wind bounds and disposal.`);
