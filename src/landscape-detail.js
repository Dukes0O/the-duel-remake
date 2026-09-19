import * as THREE from 'three';
import { makeRng } from './rng.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export function addLandscapeDetail(group,course,alpine){
  const rng=makeRng(9817+course.def.stage),o=new THREE.Object3D();
  const desert=course.def.theme==='desert',coolStone=course.def.theme==='alpine'||course.def.theme==='coast';
  const color=new THREE.Color();
  const point=(s,off)=>course.groundAt(s,off);
  function instances(geometry,material,count,place,palette='plants'){
    const mesh=new THREE.InstancedMesh(geometry,material,count);
    for(let i=0;i<count;i++){o.position.set(0,0,0);o.rotation.set(0,0,0);o.scale.setScalar(1);place(i,o);o.updateMatrix();mesh.setMatrixAt(i,o.matrix);
      if(palette==='meadow')color.setHSL(.14,.06,.75+rng.float()*.2);
      else if(palette==='stone')color.setHSL(desert?.1:.53,desert?.12:.025,.6+rng.float()*.3);
      else color.setHSL(coolStone ? .22 : .11,.16+rng.float()*.2,.25+rng.float()*.25);
      mesh.setColorAt(i,color);}
    mesh.receiveShadow=true;group.add(mesh);return mesh;
  }
  // Tufts use individual bent blades, with darker roots and warm sunlit tips.
  const v=[],c=[];
  for(let i=0;i<11;i++){
    const a=i*2.4,x=Math.sin(a),z=Math.cos(a),h=.4+(i%4)*.17;
    const vertices=[[-z*.035,0,x*.035],[z*.035,0,-x*.035],[x*.12+z*.02,h*.6,z*.12-x*.02],
      [-z*.035,0,x*.035],[x*.12+z*.02,h*.6,z*.12-x*.02],[x*.3,h,z*.3]];
    vertices.forEach(([x,y,z])=>{v.push(x,y,z);c.push(.42+y*.4,.44+y*.3,.3+y*.2);});
  }
  const tuft=new THREE.BufferGeometry();tuft.setAttribute('position',new THREE.Float32BufferAttribute(v,3));tuft.setAttribute('color',new THREE.Float32BufferAttribute(c,3));tuft.computeVertexNormals();
  const plants=new THREE.MeshStandardMaterial({color:coolStone?0x809568:0xd1b77e,vertexColors:true,roughness:1,side:THREE.DoubleSide});
  if(coolStone){
    const parts=[];for(let i=0;i<3;i++)parts.push(new THREE.PlaneGeometry(1.15,.78).translate(0,.29,0).rotateY(i*Math.PI/3));
    const geometry=mergeGeometries(parts);parts.forEach(g=>g.dispose());
    const map=new THREE.TextureLoader().load('/assets/textures/meadow-grass.png');map.colorSpace=THREE.SRGBColorSpace;map.anisotropy=4;
    const meadow=new THREE.MeshStandardMaterial({map,color:0xe1e6cb,roughness:1,alphaTest:.5,side:THREE.DoubleSide});
    meadow.onBeforeCompile=shader=>{shader.uniforms.meadowTime={value:0};(group.userData.updates??=[]).push(t=>{shader.uniforms.meadowTime.value=t;});shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nuniform float meadowTime;').replace('#include <begin_vertex>','#include <begin_vertex>\ntransformed.x+=max(0.,position.y)*max(0.,position.y)*sin(meadowTime*1.5+instanceMatrix[3].x*.17+instanceMatrix[3].z*.11)*.14;');};
    instances(geometry,meadow,14000,(i,o)=>{const s=rng.range(0,course.length);let off=(i%2?1:-1)*rng.range(8.4,60),p=point(s,off);if(course.def.theme==='coast'&&p.y<-13){off=-off;p=point(s,off);}o.position.set(p.x,p.y-.025,p.z);o.rotation.y=rng.range(0,6.28);o.scale.setScalar(rng.range(.65,1.7));},'meadow');
    tuft.dispose();plants.dispose();
  }else instances(tuft,plants,desert?3500:1200,(i,o)=>{const s=rng.range(0,course.length),off=(i%2?1:-1)*rng.range(8.5,38),p=point(s,off);o.position.set(p.x,p.y,p.z);o.rotation.y=rng.range(0,6.28);o.scale.setScalar(rng.range(.4,1.4));});
  // Gravel and fallen rocks add a readable shoulder at driving speed.
  const grit=instances(new THREE.IcosahedronGeometry(1,0),new THREE.MeshStandardMaterial({color:alpine?0xb1aca1:0xd5b891,roughness:1}),1500,(i,o)=>{
    const p=point(rng.range(0,course.length),(i%2?1:-1)*rng.range(7.25,13.5));o.position.set(p.x,p.y+.04,p.z);o.scale.set(rng.range(.05,.3),rng.range(.035,.15),rng.range(.08,.4));o.rotation.set(rng.range(0,3),rng.range(0,6),0);},'stone');
  const rockTex=new THREE.TextureLoader().load(desert?'/assets/textures/red-sandstone.png':'/assets/textures/alpine-granite.png');rockTex.colorSpace=THREE.SRGBColorSpace;rockTex.wrapS=rockTex.wrapT=THREE.RepeatWrapping;rockTex.repeat.set(2,2);rockTex.anisotropy=8;
  const stone=new THREE.MeshStandardMaterial({color:coolStone?0xc1c6c2:desert?0xe7cfb0:0x9ca29e,map:rockTex,bumpMap:rockTex,bumpScale:.24,roughness:1});
  const boulders=course.features.rocks.filter(r=>!r.outcrop);
  const rock=instances(new THREE.DodecahedronGeometry(1,1),stone,boulders.length,(i,o)=>{
    const r=boulders[i],p=point(r.s,r.off);o.position.set(p.x,p.y+.1,p.z);o.scale.set(...r.scale);o.rotation.set(0,p.heading+r.angle,0);},'stone');
  rock.castShadow=true;
  // Delineator posts and reflectors reinforce scale and make corners readable.
  const postCount=Math.floor(course.length/30)*2,postMaterial=new THREE.MeshStandardMaterial({color:0xd9d3ba,roughness:.6});
  const posts=new THREE.InstancedMesh(new THREE.BoxGeometry(.12,.83,.12),postMaterial,postCount);
  const lights=new THREE.InstancedMesh(new THREE.BoxGeometry(.13,.14,.03),new THREE.MeshStandardMaterial({color:0xffdf88,emissive:0xffaa4f,emissiveIntensity:.65,roughness:.4}),postCount);
  for(let i=0;i<postCount;i++){const s=(Math.floor(i/2)+.5)*30,p=point(s,(i%2?1:-1)*8.45);o.position.set(p.x,p.y+.42,p.z);o.scale.setScalar(1);o.rotation.set(0,p.heading,0);o.updateMatrix();posts.setMatrixAt(i,o.matrix);o.position.y+=.23;o.position.x-=Math.sin(p.heading)*.08;o.position.z-=Math.cos(p.heading)*.08;o.updateMatrix();lights.setMatrixAt(i,o.matrix);}
  group.add(posts,lights);
  // A few larger rock formations close to the route give each bend a landmark.
  if(course.features.rocks.some(r=>r.outcrop)){
    const shelfTexture=new THREE.TextureLoader().load(desert?'/assets/textures/red-sandstone.png':'/assets/textures/alpine-granite.png');
    shelfTexture.colorSpace=THREE.SRGBColorSpace;shelfTexture.wrapS=shelfTexture.wrapT=THREE.RepeatWrapping;shelfTexture.repeat.set(8,2);shelfTexture.anisotropy=8;
    const shelfMat=new THREE.MeshStandardMaterial({color:desert?0xcaa27e:0xa8b0ab,map:shelfTexture,bumpMap:shelfTexture,bumpScale:.5,roughness:1});
    const shelfGeo=new THREE.CylinderGeometry(.66,1,1,32,14);
    const a=shelfGeo.attributes.position;
    for(let i=0;i<a.count;i++){const x=a.getX(i),y=a.getY(i),z=a.getZ(i),w=.9+.018*Math.sin(y*24+x*9)+.08*Math.sin(x*16+z*19);a.setXYZ(i,x*w,y,z*w);}shelfGeo.computeVertexNormals();
    const outcrops=course.features.rocks.filter(r=>r.outcrop),shelves=new THREE.InstancedMesh(shelfGeo,shelfMat,outcrops.length);
    outcrops.forEach((r,i)=>{const p=point(r.s,r.off),height=r.scale[1];
      o.position.set(p.x,p.y+height*.42-.8,p.z);o.rotation.set(0,p.heading+r.angle,0);o.scale.set(...r.scale);o.updateMatrix();shelves.setMatrixAt(i,o.matrix);});
    shelves.castShadow=true;shelves.receiveShadow=true;group.add(shelves);
  }
}
