import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {REGIONS,regionAt} from './regions.js';
import {registerSceneSystem} from '../scene-systems.js';

export const THE_WHITES_ASSET='/assets/models/wasteland/rail/whites.glb';
export const THE_WHITES_NODES=Object.freeze([
  'salt-pan','salt-pan-crust','salt-heap','dead-conveyor','canteen',
  'school-hut','pay-office','works-platform','vane-fence',
]);
export const SALT_STORM_CLEAR_MARK='rail-2-15-off-bank';
const SALT_STORM_FOG=new THREE.Color(0xe7e4d8);

export function saltStormActive(openMarks=[]){
  if(openMarks instanceof Set)return !openMarks.has(SALT_STORM_CLEAR_MARK);
  if(Array.isArray(openMarks))return !openMarks.includes(SALT_STORM_CLEAR_MARK);
  return openMarks?.[SALT_STORM_CLEAR_MARK]!==true;
}

export function applySaltStormFog(scene,weather,dt,openMarks=[]){
  if(weather!=='salt-storm'||!saltStormActive(openMarks)||!scene?.fog)return false;
  scene.fog.near=Math.min(scene.fog.near,24);
  scene.fog.far=Math.min(scene.fog.far,115);
  scene.fog.color.lerp(SALT_STORM_FOG,1-Math.exp(-dt*1.5));
  return true;
}

function makeSaltGround(region){
  const positions=[],uv=[],indices=[],segments=80;
  const base=region.heightAt(-480,0);
  for(let iz=0;iz<=segments;iz++)for(let ix=0;ix<=segments;ix++){
    const x=region.bounds.minX+(region.bounds.maxX-region.bounds.minX)*ix/segments;
    const z=region.bounds.minZ+(region.bounds.maxZ-region.bounds.minZ)*iz/segments;
    positions.push(x,region.heightAt(x,z)-base+.035,z);
    uv.push(ix/segments*8,iz/segments*8);
    if(ix<segments&&iz<segments){const a=iz*(segments+1)+ix,b=a+1,c=a+segments+1,d=c+1;indices.push(a,c,b,b,c,d);}
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const material=new THREE.MeshStandardMaterial({color:0xe7e4d8,roughness:1});
  const mesh=new THREE.Mesh(geometry,material);
  mesh.name='Near-white salt plateau';
  mesh.receiveShadow=true;
  return mesh;
}

export function createTheWhitesScene({openMarks=[],loadAsset=path=>new GLTFLoader().loadAsync(path)}={}){
  const region=REGIONS.find(item=>item.id==='the-whites');
  if(!regionAt(region.origin.x,region.origin.z,openMarks))return null;
  const group=new THREE.Group();
  group.name='The Whites';
  group.position.set(region.origin.x,region.heightAt(-480,0),region.origin.z);
  group.add(makeSaltGround(region));
  let retired=false;
  const ready=Promise.resolve().then(()=>loadAsset(THE_WHITES_ASSET)).then(asset=>{
    if(retired)return false;
    if(!asset?.scene)throw Error('The Whites art has no scene.');
    for(const name of THE_WHITES_NODES){
      const source=asset.scene.getObjectByName(name);
      if(!source)throw Error(`The Whites art is missing ${name}.`);
      group.add(source.clone(true));
    }
    group.userData.assetStatus='ready';
    return true;
  }).catch(error=>{
    if(!retired){group.userData.assetStatus='failed';group.userData.loadErrors.push(String(error?.message||error));}
    return false;
  });
  function dispose(){
    if(retired)return;
    retired=true;
    const geometries=new Set(),materials=new Set();
    group.traverse(node=>{
      if(node.geometry)geometries.add(node.geometry);
      for(const material of [].concat(node.material||[]))materials.add(material);
    });
    for(const geometry of geometries)geometry.dispose();
    for(const material of materials)material.dispose();
    group.clear();
    group.userData.assetStatus='retired';
  }
  registerSceneSystem(group,{dispose});
  group.userData.assetStatus='loading';
  group.userData.loadErrors=[];
  group.userData.windCue='rail.salt-wind';
  group.userData.clearMark=SALT_STORM_CLEAR_MARK;
  group.userData.weather=saltStormActive(openMarks)?'salt-storm':null;
  return {group,ready,dispose};
}
