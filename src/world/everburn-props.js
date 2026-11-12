// Things that stand beside the Everburn well (SCABLANDS-LAND round 3, fix 7): fire pots, tyre-and-slat barricades, a signpost,
// basalt rocks and a radio mast, all cut from pieces of the Ridge's kit model that the Scablands already loads (no new
// model). They stand in one cluster north of the apron, away from the raiders' way in (-448, 288), the furnace's parking
// place (-406, 304), the car's start at the well and the road in from the south-east. Drawing only: nothing here has a solid.
import * as THREE from 'three';

// Where the cluster stands, in metres from the well, and which pieces of the kit make each prop.
export const EVERBURN_PROP_CENTRE=Object.freeze({x:10,z:-22});
const KINDS=Object.freeze({
  pot:/^(ember-pot-|pot-leg|pot-vent|visible-coal)/,
  barricade:/^barricade-whole-/,
  sign:/^(sign-|post-brace)/,
  mast:/^(mast-|crossed-mast-brace|antenna-radial)/,
  'rock-1':/^basalt-rock-1$/,'rock-2':/^basalt-rock-2$/,'rock-3':/^basalt-rock-3$/,'rock-4':/^basalt-rock-4$/,
});
// kind, metres east and south of the well, turn in radians, size factor
export const EVERBURN_PROPS=Object.freeze([
  ['pot',8,-18,.3,1.3],['pot',13,-20,1.1,1.1],['pot',11,-25,2,1],
  ['barricade',6,-24,.6,1.6],['barricade',16,-24,-.5,1.4],
  ['sign',4,-16,.2,1.3],['mast',12,-30,0,1],
  ['rock-1',14,-17,.5,1.2],['rock-2',17,-21,2.2,1.2],['rock-3',9,-27,1,1.1],['rock-4',5,-20,3,1.3],
].map(row=>Object.freeze(row)));

// Each prop is a group of the kit's meshes (cloned, moved so that its middle stands on the group's origin and its lowest point
// on the ground). Returns the cluster as one group and the number of props found; a kind the kit lacks is skipped.
export function createEverburnProps(kitScene,{groundAt=()=>0}={}){
  const cluster=new THREE.Group();cluster.name='Everburn well props';
  kitScene.updateMatrixWorld(true);
  const plain=name=>String(name??'').replace(/_/g,' ');
  const pieces=new Map();
  for(const kind of Object.keys(KINDS))pieces.set(kind,[]);
  kitScene.traverse(node=>{
    if(!node.isMesh)return;
    for(const [kind,pattern] of Object.entries(KINDS))if(pattern.test(plain(node.name)))pieces.get(kind).push(node);
  });
  const box=new THREE.Box3();
  for(const [kind,east,south,turn,size] of EVERBURN_PROPS){
    const nodes=pieces.get(kind);
    if(!nodes?.length)continue;
    box.makeEmpty();for(const node of nodes)box.expandByObject(node);
    const middle=box.getCenter(new THREE.Vector3()),prop=new THREE.Group();prop.name=`Everburn prop: ${kind}`;
    for(const node of nodes){
      const part=node.clone(false);part.matrix.copy(node.matrixWorld);part.matrix.decompose(part.position,part.quaternion,part.scale);
      part.position.set(part.position.x-middle.x,part.position.y-box.min.y,part.position.z-middle.z);
      part.castShadow=true;part.receiveShadow=true;prop.add(part);
    }
    prop.rotation.y=turn;prop.scale.setScalar(size);prop.position.set(east,groundAt(east,south),south);
    cluster.add(prop);
  }
  return cluster;
}
