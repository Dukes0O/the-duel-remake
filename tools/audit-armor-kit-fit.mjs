// Actual model silhouette/socket check for all nine kit recipes.
import * as THREE from 'three';
import {models} from './audit-vehicle-grounding.mjs';
import {ensureVehicleSockets} from '../src/vehicle-sockets.js';

const ray = new THREE.Raycaster();
const rows=[];
for(const {key,vehicle,wheels} of models){
  vehicle.updateMatrixWorld(true);
  const bounds=new THREE.Box3().setFromObject(vehicle);
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
    roofSkin:roofProbe(0,roof.z),hoodSocket:+hood.y.toFixed(2),
    hoodSkin:roofProbe(0,hood.z),
    hoodSides:[roofProbe(-size.width*.25,hood.z),roofProbe(size.width*.25,hood.z)],
    bodySide,bodyGrid,
    axles:[...new Map(wheels.map(w=>[Math.round(w.center.z*10),
      {z:+w.center.z.toFixed(2),y:+w.center.y.toFixed(2),radius:+w.radius.toFixed(2)}])).values()]
      .sort((a,b)=>b.z-a.z)});
}
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
