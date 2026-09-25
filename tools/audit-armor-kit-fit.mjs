// Actual model silhouette/socket check for all nine kit recipes.
import * as THREE from 'three';
import {readFile} from 'node:fs/promises';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {models} from './audit-vehicle-grounding.mjs';
import {ensureVehicleSockets} from '../src/vehicle-sockets.js';

const ray = new THREE.Raycaster();
const rows=[];
for(const {key,vehicle,wheels} of models){
  vehicle.updateMatrixWorld(true);
  const bounds=new THREE.Box3().setFromObject(vehicle);
  const toLocal=vehicle.matrixWorld.clone().invert();
  const paintedPoint=new THREE.Vector3();
  let paintRearZ=Infinity;
  vehicle.traverse(mesh=>{
    if(!mesh.isMesh||!/^(Lacquered body|Paint 1 Carmine|Jesko pearl body)/.test(mesh.material?.name||''))return;
    const transform=toLocal.clone().multiply(mesh.matrixWorld);
    const position=mesh.geometry.attributes.position;
    for(let i=0;i<position.count;i++){
      paintedPoint.fromBufferAttribute(position,i).applyMatrix4(transform);
      paintRearZ=Math.min(paintRearZ,paintedPoint.z);
    }
  });
  const size=vehicle.userData.size;
  const sockets=ensureVehicleSockets(vehicle);
  const hood=sockets.hood.position;
  const roof=sockets.roof.position;
  const roofProbe=(x,z)=>{
    ray.set(new THREE.Vector3(x,12,z),new THREE.Vector3(0,-1,0));
    return ray.intersectObject(vehicle,true).find(hit=>hit.object.isMesh)?.point.y??null;
  };
  // Probe the actual flank above the wheel and below the glazing. This
  // excludes mirrors, tires and spoilers from the armor contact surface.
  const sideProbe=(side,y,z)=>{
    ray.set(new THREE.Vector3(side*8,y,z),new THREE.Vector3(-side,0,0));
    return ray.intersectObject(vehicle,true).find(hit=>hit.object.isMesh)?.point.x??null;
  };
  const flankY=size.height<1.2 ? .42 : Math.max(.56,Math.min(size.height*.62,2.5));
  const bodySide=[-.45,-.38,-.2,0,.2,.38,.45].map(fraction=>({
    z:+(fraction*size.length).toFixed(3),
    y:+flankY.toFixed(3),
    right:sideProbe(1,flankY,fraction*size.length),
    left:sideProbe(-1,flankY,fraction*size.length),
  }));
  const bodyGrid=[flankY-.16,flankY,flankY+.16].map(y=>({
    y:+y.toFixed(3),samples:[-.45,-.38,-.2,0,.2,.38,.45].map(fraction=>({
      z:+(fraction*size.length).toFixed(3),
      right:sideProbe(1,y,fraction*size.length),
      left:sideProbe(-1,y,fraction*size.length),
    })),
  }));
  rows.push({car:key,width:+(bounds.max.x-bounds.min.x).toFixed(2),
    length:+(bounds.max.z-bounds.min.z).toFixed(2),
    height:+(bounds.max.y-bounds.min.y).toFixed(2),
    size,sizeRoof:+size.height.toFixed(2),roofSocket:+roof.y.toFixed(2),
    paintRearZ:Number.isFinite(paintRearZ)?+paintRearZ.toFixed(4):null,
    roofSkin:roofProbe(0,roof.z),hoodSocket:+hood.y.toFixed(2),
    hoodSkin:roofProbe(0,hood.z),
    hoodSides:[roofProbe(-size.width*.25,hood.z),roofProbe(size.width*.25,hood.z)],
    bodySide,bodyGrid,
    axles:[...new Map(wheels.map(w=>[Math.round(w.center.z*10),
      {z:+w.center.z.toFixed(2),y:+w.center.y.toFixed(2),radius:+w.radius.toFixed(2)}])).values()]
      .sort((a,b)=>b.z-a.z)});
}
const rearCar=process.argv[2]==='--rear-materials' || process.argv[2]==='--rear-overlap' ? process.argv[3] : null;
if (rearCar) {
  const source=models.find(item=>item.key===rearCar);
  if (!source) throw Error(`Unknown kit car: ${rearCar}`);
  source.vehicle.updateMatrixWorld(true);
  const inverse=source.vehicle.matrixWorld.clone().invert();
  const point=new THREE.Vector3();
  const surfaces=[];
  source.vehicle.traverse(mesh=>{
    if (!mesh.isMesh || !mesh.geometry?.attributes.position) return;
    const transform=inverse.clone().multiply(mesh.matrixWorld);
    const box=new THREE.Box3();
    const attr=mesh.geometry.attributes.position;
    for(let i=0;i<attr.count;i++){
      point.fromBufferAttribute(attr,i).applyMatrix4(transform);
      box.expandByPoint(point);
    }
    surfaces.push({name:mesh.name,material:mesh.material?.name,
      color:mesh.material?.color?.getHexString(),
      min:box.min.toArray().map(x=>+x.toFixed(3)),
      max:box.max.toArray().map(x=>+x.toFixed(3))});
  });
  if(process.argv[2]==='--rear-materials') {
    console.log(JSON.stringify({car:rearCar,surfaces:surfaces.filter(row=>row.min[2]<-1.4)},null,2));
  } else {
    const sourceGlb=await readFile(new URL(`../public/assets/models/wasteland/kits/${rearCar}.glb`,import.meta.url));
    const length=sourceGlb.readUInt32LE(12);
    const json=JSON.parse(sourceGlb.toString('utf8',20,20+length));
    const stripTextures=value=>{
      if(!value||typeof value!=='object')return;
      for(const key of Object.keys(value))
        if(/Texture$/.test(key))delete value[key];else stripTextures(value[key]);
    };
    stripTextures(json.materials);
    delete json.images;delete json.textures;delete json.samplers;
    const text=Buffer.from(JSON.stringify(json));
    const padded=Math.ceil(text.length/4)*4;
    const binary=sourceGlb.subarray(20+length);
    const glb=Buffer.alloc(20+padded+binary.length,0x20);
    glb.writeUInt32LE(0x46546c67,0);glb.writeUInt32LE(2,4);
    glb.writeUInt32LE(glb.length,8);glb.writeUInt32LE(padded,12);
    glb.writeUInt32LE(0x4e4f534a,16);text.copy(glb,20);binary.copy(glb,20+padded);
    const parsed=await new GLTFLoader().parseAsync(glb.buffer.slice(glb.byteOffset,glb.byteOffset+glb.byteLength),'');
    const kit=parsed.scene;
    kit.name='audit-authored-kit';
    source.vehicle.add(kit);
    source.vehicle.traverse(mesh=>{if(mesh.isMesh){
      for(const material of Array.isArray(mesh.material)?mesh.material:[mesh.material])
        if(material)material.side=THREE.DoubleSide;
    }});
    source.vehicle.updateMatrixWorld(true);
    const probes=[];
    for(const x of [-.9,-.6,-.3,0,.3,.6,.9]) for(const y of [.35,.55,.75,.95]){
      ray.set(new THREE.Vector3(x,y,-10),new THREE.Vector3(0,0,1));
      const hits=ray.intersectObject(source.vehicle,true)
        .filter(hit=>hit.point.z<-1.5).slice(0,6);
      probes.push({x,y,hits:hits.map(hit=>({z:+hit.point.z.toFixed(3),
        name:hit.object.name,material:hit.object.material?.name,
        kit:kit===hit.object || kit.getObjectById(hit.object.id)!==undefined}))});
    }
    const contact=[];
    for(const [axis,origin,direction] of [
      ['left',[-8,.65,0],[1,0,0]],['right',[8,.65,0],[-1,0,0]],
      ['roof',[0,12,0],[0,-1,0]],['rear',[0,.55,-10],[0,0,1]]]){
      ray.set(new THREE.Vector3(...origin),new THREE.Vector3(...direction));
      contact.push({axis,hits:ray.intersectObject(source.vehicle,true).slice(0,6)
        .map(hit=>({position:hit.point.toArray().map(v=>+v.toFixed(3)),
          name:hit.object.name,kit:kit.getObjectById(hit.object.id)!==undefined}))});
    }
    console.log(JSON.stringify({car:rearCar,contact,probes},null,2));
  }
} else {
const exportCar=process.argv[2]==='--body-export' ? process.argv[3] : null;
if (exportCar) {
  const source=models.find(item=>item.key===exportCar);
  if (!source) throw Error(`Unknown kit car: ${exportCar}`);
  source.vehicle.updateMatrixWorld(true);
  const inverse=source.vehicle.matrixWorld.clone().invert();
  const point=new THREE.Vector3();
  const selected=[];
  source.vehicle.traverse(mesh=>{
    if (!mesh.isMesh || !/^(Paint 1 Carmine|Jesko pearl body)/.test(mesh.material?.name||'')) return;
    const transform=inverse.clone().multiply(mesh.matrixWorld);
    const geometry=mesh.geometry;
    const positions=[];
    for(let i=0;i<geometry.attributes.position.count;i++){
      point.fromBufferAttribute(geometry.attributes.position,i).applyMatrix4(transform);
      positions.push(+point.x.toFixed(5),+point.y.toFixed(5),+point.z.toFixed(5));
    }
    const indices=geometry.index ? [...geometry.index.array] :
      Array.from({length:geometry.attributes.position.count},(_,index)=>index);
    selected.push({material:mesh.material.name,positions,indices});
  });
  console.log(JSON.stringify({car:exportCar,meshes:selected}));
} else console.log(JSON.stringify(rows,null,2));
}
