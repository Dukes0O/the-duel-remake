import * as THREE from 'three';
import { makeRng } from './rng.js';

export function addLandscapeDetail(group,course,alpine){
  const rng=makeRng(9817+course.def.stage),o=new THREE.Object3D();
  const color=new THREE.Color();
  function point(s,off){const p=course.worldAt(s,off),edge=Math.max(0,Math.abs(off)-13);
    const wave=Math.sin(s*.009+off*.007)*Math.cos(off*.021+s*.004);
    p.y+=edge<1?-.06:Math.max(-2,wave*Math.min(32,edge*.13)+edge*.014-.2);return p;}
  function instances(geometry,material,count,place){
    const mesh=new THREE.InstancedMesh(geometry,material,count);
    for(let i=0;i<count;i++){o.position.set(0,0,0);o.rotation.set(0,0,0);o.scale.setScalar(1);place(i,o);o.updateMatrix();mesh.setMatrixAt(i,o.matrix);
      color.setHSL(alpine ? .22 : .11,.16+rng.float()*.2,.25+rng.float()*.25);mesh.setColorAt(i,color);}
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
  const plants=new THREE.MeshStandardMaterial({color:alpine?0x809568:0xd1b77e,vertexColors:true,roughness:1,side:THREE.DoubleSide});
  instances(tuft,plants,2400,(i,o)=>{const s=rng.range(0,course.length),off=(i%2?1:-1)*rng.range(8.5,38),p=point(s,off);o.position.set(p.x,p.y,p.z);o.rotation.y=rng.range(0,6.28);o.scale.setScalar(rng.range(.4,1.4));});
  // Gravel and fallen rocks add a readable shoulder at driving speed.
  const grit=instances(new THREE.IcosahedronGeometry(1,0),new THREE.MeshStandardMaterial({color:alpine?0xb1aca1:0xd5b891,roughness:1}),1500,(i,o)=>{
    const p=point(rng.range(0,course.length),(i%2?1:-1)*rng.range(7.25,13.5));o.position.set(p.x,p.y+.04,p.z);o.scale.set(rng.range(.05,.3),rng.range(.035,.15),rng.range(.08,.4));o.rotation.set(rng.range(0,3),rng.range(0,6),0);});
  const rockTex=new THREE.TextureLoader().load('/assets/textures/red-sandstone.png');rockTex.colorSpace=THREE.SRGBColorSpace;rockTex.wrapS=rockTex.wrapT=THREE.RepeatWrapping;rockTex.repeat.set(2,2);
  const stone=new THREE.MeshStandardMaterial({color:alpine?0x99968d:0xe7cfb0,map:rockTex,bumpMap:rockTex,bumpScale:.24,roughness:1});
  const boulders=course.features.rocks.filter(r=>!r.outcrop);
  const rock=instances(new THREE.DodecahedronGeometry(1,1),stone,boulders.length,(i,o)=>{
    const r=boulders[i],p=point(r.s,r.off);o.position.set(p.x,p.y+.1,p.z);o.scale.set(...r.scale);o.rotation.set(0,r.angle,0);});
  rock.castShadow=true;
  // Delineator posts and reflectors reinforce scale and make corners readable.
  const postCount=Math.floor(course.length/30)*2,postMaterial=new THREE.MeshStandardMaterial({color:0xd9d3ba,roughness:.6});
  const posts=new THREE.InstancedMesh(new THREE.BoxGeometry(.12,.83,.12),postMaterial,postCount);
  const lights=new THREE.InstancedMesh(new THREE.BoxGeometry(.13,.14,.03),new THREE.MeshStandardMaterial({color:0xffdf88,emissive:0xffaa4f,emissiveIntensity:.65,roughness:.4}),postCount);
  for(let i=0;i<postCount;i++){const s=(Math.floor(i/2)+.5)*30,p=course.worldAt(s,(i%2?1:-1)*8.45);o.position.set(p.x,p.y+.42,p.z);o.scale.setScalar(1);o.rotation.set(0,p.heading,0);o.updateMatrix();posts.setMatrixAt(i,o.matrix);o.position.y+=.23;o.position.z-=.08;o.updateMatrix();lights.setMatrixAt(i,o.matrix);}
  group.add(posts,lights);
  // A few larger rock formations close to the route give each bend a landmark.
  if(!alpine){
    const shelfTexture=new THREE.TextureLoader().load('/assets/textures/red-sandstone.png');
    shelfTexture.colorSpace=THREE.SRGBColorSpace;shelfTexture.wrapS=shelfTexture.wrapT=THREE.RepeatWrapping;shelfTexture.repeat.set(8,2);shelfTexture.anisotropy=8;
    const shelfMat=new THREE.MeshStandardMaterial({color:0xcaa27e,map:shelfTexture,bumpMap:shelfTexture,bumpScale:.5,roughness:1});
    const shelfGeo=new THREE.CylinderGeometry(.66,1,1,32,14);
    const a=shelfGeo.attributes.position;
    for(let i=0;i<a.count;i++){const x=a.getX(i),y=a.getY(i),z=a.getZ(i),w=1+.018*Math.sin(y*24+x*9)+.08*Math.sin(x*16+z*19);a.setXYZ(i,x*w,y,z*w);}shelfGeo.computeVertexNormals();
    const outcrops=course.features.rocks.filter(r=>r.outcrop),shelves=new THREE.InstancedMesh(shelfGeo,shelfMat,outcrops.length);
    outcrops.forEach((r,i)=>{const p=point(r.s,r.off),height=r.scale[1];
      o.position.set(p.x,p.y+height*.42-.8,p.z);o.rotation.set(0,r.angle,0);o.scale.set(...r.scale);o.updateMatrix();shelves.setMatrixAt(i,o.matrix);});
    shelves.castShadow=true;shelves.receiveShadow=true;group.add(shelves);
  }
}
