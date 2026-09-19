import * as THREE from 'three';

const point=new THREE.Vector3(),inverse=new THREE.Matrix4(),local=new THREE.Matrix4();
export const TIRE_CLEARANCE=.01;

// Measure intact wheel geometry once per instance. Imported source bounding
// boxes can include rotated empty space below the actual tires. Translating the
// entire car preserves the cabin/body/wheel relationship and damage coordinates.
export function prepareVehicleGrounding(vehicle){
  if(vehicle.userData.grounding)return vehicle.userData.grounding;
  vehicle.updateMatrixWorld(true);inverse.copy(vehicle.matrixWorld).invert();
  let contactY=Infinity;
  const wheels=[];
  for(const wheel of vehicle.userData.wheels||[]){
    let low=Infinity,high=-Infinity;
    wheel.traverse(mesh=>{
      if(!mesh.isMesh||!mesh.geometry.attributes.position)return;
      local.multiplyMatrices(inverse,mesh.matrixWorld);
      const positions=mesh.geometry.attributes.position;
      for(let i=0;i<positions.count;i++){point.fromBufferAttribute(positions,i).applyMatrix4(local);low=Math.min(low,point.y);high=Math.max(high,point.y);}
    });
    if(!Number.isFinite(low)||high<=low)continue;
    const radius=(high-low)/2;contactY=Math.min(contactY,low);
    wheel.parent.userData.radius=radius;
    wheels.push(Object.freeze({contactY:low,radius}));
  }
  if(!Number.isFinite(contactY))contactY=0;
  const metadata=Object.freeze({contactY,wheels:Object.freeze(wheels)});
  vehicle.userData.grounding=metadata;vehicle.rotation.order='YXZ';
  if(vehicle.userData.contactShadow)vehicle.userData.contactShadow.position.y=contactY+.004;
  return metadata;
}

// Match the road builders' surface lifts. Paved main roads use worldAt, while
// gravel/arena roads and all shortcuts follow groundAt. At a branch join the
// visible top surface is the higher of the overlapping meshes.
export function vehicleGroundPoint(course,s,lateral=0){
  const p=course.groundAt(s,lateral),surface=course.surfaceAt(s,lateral),onMain=Math.abs(lateral)<=surface.roadHalfWidth;
  if(onMain)p.y=(course.def.offroad||course.def.arena?p.y:course.at(s).y)+.035;
  if(surface.shortcutId){const branchY=course.groundAt(s,lateral).y+.065;p.y=onMain?Math.max(p.y,branchY):branchY;}
  return p;
}

export function vehicleGroundSlope(course,s,lateral,angle=0){
  const a=vehicleGroundPoint(course,s-2,lateral),b=vehicleGroundPoint(course,s+2,lateral),c=vehicleGroundPoint(course,s,lateral-1),d=vehicleGroundPoint(course,s,lateral+1);
  // Use the physical world-space tangent lengths: an inside shortcut travels
  // fewer meters than the centerline for the same change in course distance.
  const fx=b.x-a.x,fy=b.y-a.y,fz=b.z-a.z,sx=d.x-c.x,sy=d.y-c.y,sz=d.z-c.z;
  let nx=fy*sz-fz*sy,ny=fz*sx-fx*sz,nz=fx*sy-fy*sx;
  if(ny<0){nx=-nx;ny=-ny;nz=-nz;}
  const length=Math.hypot(nx,ny,nz)||1;nx/=length;ny/=length;nz/=length;
  const yaw=c.heading+angle,cos=Math.cos(yaw),sin=Math.sin(yaw);
  return{pitch:Math.atan2(nx*sin+nz*cos,ny),roll:-Math.asin(Math.max(-1,Math.min(1,nx*cos-nz*sin)))};
}

export function placeGroundedVehicle(vehicle,p,turn=0,travel=0){
  const grounding=prepareVehicleGrounding(vehicle);
  vehicle.position.set(p.x,p.y+TIRE_CLEARANCE-grounding.contactY,p.z);
  vehicle.rotation.set(0,p.heading+turn,0,'YXZ');
  for(const wheel of vehicle.userData.wheels||[])wheel.rotation.x+=travel/(wheel.parent?.userData.radius||.36);
}
