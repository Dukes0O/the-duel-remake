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
    local.multiplyMatrices(inverse,wheel.parent.matrixWorld);
    point.set(0,0,0).applyMatrix4(local);
    const radius=(high-low)/2;contactY=Math.min(contactY,low);
    wheel.parent.userData.radius=radius;
    wheels.push(Object.freeze({contactY:low,radius,x:point.x,z:point.z}));
  }
  if(!Number.isFinite(contactY))contactY=0;
  const bounds=new THREE.Box3(),part=new THREE.Box3();
  vehicle.traverse(mesh=>{
    if(!mesh.isMesh||!mesh.visible||mesh===vehicle.userData.contactShadow)return;
    mesh.geometry.computeBoundingBox();local.multiplyMatrices(inverse,mesh.matrixWorld);
    part.copy(mesh.geometry.boundingBox).applyMatrix4(local);bounds.union(part);
  });
  const tumbleBounds=Object.freeze({min:Object.freeze(bounds.min.toArray()),max:Object.freeze(bounds.max.toArray())});
  const metadata=Object.freeze({contactY,wheels:Object.freeze(wheels),tumbleBounds});
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

// Optional physics-owned wheel support and orientation. Ordinary road actors
// omit these fields and keep the exact existing grounding path. Pitch in the
// simulation is nose-up positive; Three's +X rotation points the nose down.
export function applyVehicleTerrainPose(vehicle,course,actor){
  if(Number.isFinite(actor?.groundHeight))vehicle.position.y+=actor.groundHeight-course.groundAt(actor.s,actor.lateral).y;
  if(Number.isFinite(actor?.terrainPitch))vehicle.rotation.x=-actor.terrainPitch;
  if(Number.isFinite(actor?.terrainRoll)){
    const pitch=Number.isFinite(actor.terrainPitch)?actor.terrainPitch:0,roll=actor.terrainRoll;
    // Ground grades are measured independently along/across the tire plane.
    // YXZ applies roll before pitch, so remove that pitch cross-coupling.
    vehicle.rotation.z=actor.tumble?roll:Math.atan2(Math.sin(roll)*Math.cos(pitch),Math.cos(roll));
  }
  if(!actor?.tumble&&!actor?.airborne&&(actor?.airHeight||0)<=.08&&
      actor?.car==='titan_monster'&&Number.isFinite(actor?.groundHeight)&&
      course?.muddyHollow?.contains){
    const ground=course.groundAt(actor.s,actor.lateral);
    if(course.muddyHollow.contains(ground.x,ground.z)){
      const {contactY,wheels}=prepareVehicleGrounding(vehicle);
      let low=Infinity;
      for(const wheel of wheels){
        point.set(wheel.x,wheel.contactY,wheel.z).applyEuler(vehicle.rotation);
        low=Math.min(low,point.y);
      }
      if(Number.isFinite(low))vehicle.position.y+=Math.max(0,contactY-low);
    }
  }
  if(actor?.tumble){
    // A complete roll rotates around the chassis, not the tire-plane origin.
    // Keep the rotated box above its physics support without rebuilding meshes
    // or scanning vertices each frame. This offset never enters simulation.
    const {tumbleBounds:{min,max},contactY}=prepareVehicleGrounding(vehicle);
    const pitch=vehicle.rotation.x,roll=vehicle.rotation.z,sy=Math.sin(pitch),cy=Math.cos(pitch),sr=Math.sin(roll),cr=Math.cos(roll);
    const centerX=(min[0]+max[0])*.5,centerY=(min[1]+max[1])*.5,centerZ=(min[2]+max[2])*.5;
    point.set(centerX,centerY,centerZ).applyEuler(vehicle.rotation);
    const yaw=vehicle.rotation.y,c=Math.cos(yaw),s=Math.sin(yaw);
    vehicle.position.x+=c*centerX+s*centerZ-point.x;
    vehicle.position.z+=-s*centerX+c*centerZ-point.z;
    let low=Infinity;
    for(let ix=0;ix<2;ix++)for(let iy=0;iy<2;iy++)for(let iz=0;iz<2;iz++){
      const x=ix?max[0]:min[0],y=iy?max[1]:min[1],z=iz?max[2]:min[2];
      low=Math.min(low,cy*(sr*x+cr*y)-sy*z);
    }
    vehicle.position.y+=Math.max(centerY-point.y,contactY-low);
  }
}
