// A salt-raker's barrow: an open slatted pan over a common iron axle, a thick
// wheel tyre around spoke holes, and long shafts worn smooth at the hands.
import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {HANDCART} from './jobs/story-people.js';

export function createHandcartView() {
  const root = new THREE.Group(), wood = [], iron = [], spokeParts = [];
  const box = (parts, x,y,z, w,h,d) => parts.push(new THREE.BoxGeometry(w,h,d).translate(x,y,z));
  const bar = (parts, from, to, radius, endRadius = radius) => {
    const a = new THREE.Vector3(...from), b = new THREE.Vector3(...to);
    const delta = b.clone().sub(a), length = delta.length();
    const pipe = new THREE.CylinderGeometry(endRadius,radius,length,8);
    pipe.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize()));
    pipe.translate((a.x+b.x)/2,(a.y+b.y)/2,(a.z+b.z)/2);
    parts.push(pipe);
  };
  const finish = (parts, material) => {
    const joined = mergeGeometries(parts);
    for (const part of parts) part.dispose();
    const mesh = new THREE.Mesh(joined,material);
    mesh.castShadow = mesh.receiveShadow = true;
    return mesh;
  };
  const plank = new THREE.MeshStandardMaterial({color:0x6e5136, roughness:.98});
  const forged = new THREE.MeshStandardMaterial({color:0x5b5550, metalness:.47,roughness:.78});
  const {width:w,length:l,wheelRadius:r,shaftBack} = HANDCART;
  for (let i = 0; i < 5; i++) box(wood, (i-2)*w/5,.49,.03, w/5-.012,.038,l);
  for (const side of [-1,1]) {
    for (const height of [.56,.65]) box(wood,side*w/2,height,.03, .026,.065,l);
    for (const end of [-1,1]) box(iron,side*(w/2+.012),.57,end*(l/2-.06), .027,.27,.035);
    // The shafts narrow and rise towards the person.
    bar(wood,[side*w*.37,.43,l*.39],[side*.23,.88,shaftBack],.034,.026);
    bar(iron,[side*.23,.88,shaftBack],[side*.23,.89,shaftBack-.11],.029,.028);
  }
  box(wood,0,.57,l/2+.015, w,.14,.03);
  bar(iron,[-w/2-.11,r,0],[w/2+.11,r,0],.033);
  const rim = new THREE.TorusGeometry(r-.018,.018,5,24);
  rim.rotateY(Math.PI/2);
  spokeParts.push(rim);
  for (let i = 0; i < 8; i++) {
    const angle = i*Math.PI/4;
    bar(spokeParts,[0,0,0],[0,Math.sin(angle)*(r-.025),Math.cos(angle)*(r-.025)],.009);
  }
  bar(spokeParts,[-.053,0,0],[.053,0,0],.043);
  const left = finish(spokeParts,forged), right = left.clone();
  left.position.set(-w/2-.07,r,0); right.position.set(w/2+.07,r,0);
  const bed = finish(wood,plank), bands = finish(iron,forged);
  root.add(bed,bands,left,right);
  return {root, update(cart, shift) {
    root.position.set(cart.x,cart.y+shift,cart.z);
    root.rotation.y = cart.yaw;
    left.rotation.x = right.rotation.x = cart.travel / r;
  }, dispose() {
    left.geometry.dispose(); bed.geometry.dispose(); bands.geometry.dispose();
    plank.dispose(); forged.dispose(); root.removeFromParent();
  }};
}
