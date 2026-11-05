import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {SCABLANDS_LAYOUT, SCABLANDS_PLACES} from './scablands.js';
import {scablandsSurfaceHeightAt} from './scablands-ground.js';
import {registerSceneSystem} from '../scene-systems.js';

export const SCABLANDS_ASSETS = Object.freeze({
  tintown: '/assets/models/wasteland/scablands/tintown.glb',
  boneyard: '/assets/models/wasteland/scablands/boneyard.glb',
  mall: '/assets/models/wasteland/scablands/mall.glb',
  everburn: '/assets/models/wasteland/scablands/everburn.glb',
  kit: '/assets/models/wasteland/scablands/kit.glb',
  folk: '/assets/models/wasteland/scablands/folk.glb',
  vehicles: '/assets/models/wasteland/scablands/vehicles.glb',
});

// Every placed solid names its anchor in the shared place table. The small
// local offsets keep roads and the eight named destinations clear.
export const SCABLANDS_SOLIDS = Object.freeze([
  ['tin-town-shell','tin-town',-46,0,31,15,23],
  ['boneyard-planes','boneyard',-12,-26,47,11,30],
  ['dead-mall-shell','dead-mall',0,0,38,13,35],
  ['everburn-well','everburn',0,0,18,9,18],
  ['iron-line-station','iron-line',12,0,28,8,20],
  ['dry-dam-gate','dry-dam',0,0,34,13,10],
  ['ships-hulk-field','ships-in-sand',0,0,60,14,27],
  ['ridge-rocks','ridge',-16,18,80,24,20],
].map(([id,placeId,dx,dz,width,height,depth])=>{
  const place=SCABLANDS_PLACES.find(row=>row.id===placeId);
  const center=Object.freeze([place.x+dx,place.height+height/2,place.z+dz]);
  const size=Object.freeze([width,height,depth]);
  return Object.freeze({id,placeId,center,size,
    collision:Object.freeze({center,halfExtents:Object.freeze(size.map(value=>value/2)),heading:0})});
}));

const placeAssets={
  'tin-town':['tintown','folk'],'boneyard':['boneyard','vehicles'],'dead-mall':['mall'],'everburn':['everburn','vehicles'],
  'iron-line':[],'dry-dam':[],'ships-in-sand':[],'ridge':['kit'],
};
const vehiclePart={'boneyard':'Big Bess gas truck','everburn':"Old Smoke's rolling furnace"};
const detailCounts=Object.freeze({near:30,far:10});

function makeGround(width,depth,segments,material,detail,offsetX=0,offsetZ=0){
  const positions=[],uv=[],indices=[];
  for(let iz=0;iz<=segments;iz++)for(let ix=0;ix<=segments;ix++){
    const x=-width/2+width*ix/segments,z=-depth/2+depth*iz/segments;
    positions.push(x,scablandsSurfaceHeightAt(x+offsetX,z+offsetZ)+.025,z);uv.push(ix/segments*12,iz/segments*12);
    if(ix<segments&&iz<segments){const a=iz*(segments+1)+ix,b=a+1,c=a+segments+1,d=c+1;indices.push(a,c,b,b,c,d);}
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.setIndex(indices);geometry.computeVertexNormals();
  const mesh=new THREE.Mesh(geometry,material);mesh.name=detail?'Scablands near ground':'Scablands far ground';mesh.receiveShadow=true;
  return mesh;
}

function mastAndSmoke(group){
  const mast=new THREE.Group();mast.name='Radio mast visible across the Scablands';
  const dark=new THREE.MeshStandardMaterial({color:0x302b25,metalness:.52,roughness:.78});
  const pole=new THREE.Mesh(new THREE.CylinderGeometry(.65,.95,76,8),dark);
  pole.position.set(-601,38,0);mast.add(pole);
  for(let y=9;y<70;y+=10){const ring=new THREE.Mesh(new THREE.TorusGeometry(Math.max(.8,(76-y)*.025),.12,4,8),dark);ring.position.set(-601,y,0);ring.rotation.x=Math.PI/2;mast.add(ring);}
  group.add(mast);
  const smoke=new THREE.Group();smoke.name='Everburn smoke pillar visible across the Scablands';
  const soot=new THREE.MeshStandardMaterial({color:0x433a32,transparent:true,opacity:.36,roughness:1,depthWrite:false});
  for(let i=0;i<7;i++){
    const radius=4.8+i*1.25,particle=new THREE.Mesh(new THREE.SphereGeometry(radius,8,6),soot);
    particle.position.set(-424+(i%2)*3,18+i*12,304);particle.scale.set(1,.72,1);smoke.add(particle);
  }
  group.add(smoke);
}

function tintArt(scene, placeId){
  scene.traverse(node=>{
    if(!node.isMesh)return;
    node.castShadow=true;node.receiveShadow=true;
    for(const material of [].concat(node.material||[])){
      material.color?.multiplyScalar(placeId==='dead-mall'?.72:.84);
      if(material.roughness!==undefined)material.roughness=Math.max(.78,material.roughness);
      if(placeId==='dead-mall'&&/sign|letter|goods/i.test(material.name||''))
        material.color?.set(/letter|goods/i.test(material.name)?0xf0d397:0x173e32);
    }
  });
}

function addMallRubble(group,place){
  const rubble=new THREE.Group();rubble.name='Dead Mall sand drifts and rubble';
  const stone=new THREE.MeshStandardMaterial({color:0x55483a,roughness:1});
  const sand=new THREE.MeshStandardMaterial({color:0x8a6e4e,roughness:1});
  for(let i=0;i<9;i++){
    const mesh=new THREE.Mesh(new THREE.DodecahedronGeometry(1,0),i%2?sand:stone);
    const a=i/9*Math.PI*2,r=30+(i%3)*4,x=place.x+Math.cos(a)*r,z=place.z+Math.sin(a)*r;
    mesh.position.set(x,scablandsSurfaceHeightAt(x,z)+1,z);
    mesh.scale.set(4+(i%3),1.4+(i%2),3+(i%4));mesh.rotation.y=a;mesh.castShadow=true;mesh.receiveShadow=true;rubble.add(mesh);
  }
  group.add(rubble);
}

function addFurnaceFire(group,place){
  const effects=new THREE.Group();effects.name="Old Smoke's furnace fire and chimney smoke";
  const flame=new THREE.MeshStandardMaterial({color:0xff6a18,emissive:0xc33508,emissiveIntensity:1.4,roughness:.6});
  const core=new THREE.MeshStandardMaterial({color:0xffd36b,emissive:0xf08014,emissiveIntensity:1.7,roughness:.5});
  const soot=new THREE.MeshStandardMaterial({color:0x302c28,transparent:true,opacity:.48,roughness:1,depthWrite:false});
  for(let door=0;door<3;door++){
    const x=place.x+15+door*2.2,z=place.z-7;
    const outer=new THREE.Mesh(new THREE.ConeGeometry(.8,2.8,6),flame);outer.position.set(x,1.7,z);outer.rotation.z=Math.PI;
    const inner=new THREE.Mesh(new THREE.ConeGeometry(.38,1.65,6),core);inner.position.set(x,.95,z-.18);inner.rotation.z=Math.PI;
    effects.add(outer,inner);
  }
  for(let puff=0;puff<5;puff++){
    const cloud=new THREE.Mesh(new THREE.SphereGeometry(2.1+puff*.55,7,5),soot);
    cloud.position.set(place.x+22+(puff%2),10+puff*5,place.z-7);cloud.scale.y=1.5;effects.add(cloud);
  }
  group.add(effects);
}

export function createScablandsScene(course,{loadAsset=path=>new GLTFLoader().loadAsync(path)}={}){
  const group=new THREE.Group();group.name='The Scablands';
  let retired=false;
  const groundMaterial=new THREE.MeshStandardMaterial({color:0x76624b,roughness:1});
  const roadMaterial=new THREE.MeshStandardMaterial({color:0x594b39,roughness:1});
  const ground=new THREE.Group();ground.name='Scablands ground chunks';group.add(ground);
  // Four near tiles carry the shared physics height at a fine grid; the single
  // distant mesh uses a coarser grid to keep the horizon inexpensive.
  for(let z=-1;z<=0;z++)for(let x=-1;x<=0;x++){
    const tile=makeGround(700,500,detailCounts.near,groundMaterial,true,x*700+350,z*500+250);
    tile.position.set(x*700+350,0,z*500+250);ground.add(tile);
  }
  const far=makeGround(2800,2000,detailCounts.far,groundMaterial,false);far.position.y=-.12;ground.add(far);
  // A broad gravel ribbon follows the stable oval frame used by driving and
  // never changes the shared terrain height function.
  const roadPoints=[];
  for(let i=0;i<=192;i++){const a=i/192*Math.PI*2,x=Math.cos(a)*SCABLANDS_LAYOUT.frameRadiusX,z=Math.sin(a)*SCABLANDS_LAYOUT.frameRadiusZ;
    roadPoints.push(new THREE.Vector3(x,scablandsSurfaceHeightAt(x,z)+.12,z));}
  const curve=new THREE.CatmullRomCurve3(roadPoints,true,'centripetal');
  const road=new THREE.Mesh(new THREE.TubeGeometry(curve,384,SCABLANDS_LAYOUT.roadHalfWidth,6,true),roadMaterial);
  road.name='Scablands dirt road';road.receiveShadow=true;ground.add(road);
  mastAndSmoke(group);

  const ready=(async()=>{
    const cache=new Map();
    const load=async key=>{
      if(!cache.has(key))cache.set(key,Promise.resolve(loadAsset(SCABLANDS_ASSETS[key])));
      return cache.get(key);
    };
    await Promise.all(SCABLANDS_PLACES.map(async place=>{
      const assets=await Promise.all(placeAssets[place.id].map(load));
      if(retired)return;
      const lod=new THREE.LOD();lod.name=`${place.name} detail LOD`;
      const full=new THREE.Group();full.name=`${place.name} full detail`;
      assets.forEach((asset,index)=>{
        const key=placeAssets[place.id][index];
        if(!asset?.scene)throw Error(`Scablands ${key} art has no scene.`);
        const source=key==='vehicles'?asset.scene.getObjectByName(vehiclePart[place.id]):asset.scene;
        if(!source)throw Error(`Scablands ${key} art is missing its ${place.id} model.`);
        const model=source.clone(true);tintArt(model,place.id);
        model.position.x=index?18:0;model.rotation.y=(SCABLANDS_PLACES.indexOf(place)%4)*Math.PI/2;
        if(key==='vehicles'&&place.id==='everburn')model.scale.setScalar(1.5);
        full.add(model);
      });
      const distant=new THREE.Mesh(new THREE.BoxGeometry(32,12,24),new THREE.MeshStandardMaterial({color:0x4c4236,roughness:1}));
      distant.name=`${place.name} far silhouette`;distant.position.y=6;distant.castShadow=true;
      lod.addLevel(full,0);lod.addLevel(distant,280);
      lod.position.set(place.x,scablandsSurfaceHeightAt(place.x,place.z),place.z);group.add(lod);
      if(place.id==='dead-mall')addMallRubble(group,place);
      if(place.id==='everburn')addFurnaceFire(group,place);
    }));
    group.userData.assetStatus='ready';return true;
  })().catch(error=>{if(!retired){group.userData.assetStatus='failed';group.userData.loadErrors.push(String(error?.message||error));}return false;});
  function dispose(){
    if(retired)return;retired=true;
    const geometries=new Set(),materials=new Set();
    group.traverse(node=>{if(node.geometry)geometries.add(node.geometry);for(const material of [].concat(node.material||[]))materials.add(material);});
    for(const geometry of geometries)geometry.dispose();
    for(const material of materials)material.dispose();
    group.clear();group.userData.assetStatus='retired';
  }
  registerSceneSystem(group,{dispose});
  group.userData.assetStatus='loading';group.userData.loadErrors=[];group.userData.solids=SCABLANDS_SOLIDS;
  return {group,ready,solids:SCABLANDS_SOLIDS,dispose};
}
