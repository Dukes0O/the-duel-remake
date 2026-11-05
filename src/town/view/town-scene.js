import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {SCABLANDS_PLACES} from '../../world/scablands.js';
import {scablandsSurfaceHeightAt} from '../../world/scablands-ground.js';
import {TOWN_CHUNK_METRES, visibleTownChunks, townChunkLod} from './town-chunks.js';
import {buildTownChunkInstances, createTownPlacementGhost} from './town-instances.js';
import {createTownCamera, moveTownCamera, resizeTownCamera, updateTownCamera} from './town-camera.js';
import {pickTownItem} from './town-pick.js';

function terrainChunk(chunk) {
  const segments = 16, positions = [], indices = [], startX = chunk.x*TOWN_CHUNK_METRES, startZ = chunk.z*TOWN_CHUNK_METRES;
  for (let z=0; z<=segments; z++) for (let x=0; x<=segments; x++) {
    const px=startX+x*TOWN_CHUNK_METRES/segments, pz=startZ+z*TOWN_CHUNK_METRES/segments;
    positions.push(px,scablandsSurfaceHeightAt(px,pz),pz);
    if (x<segments && z<segments) {const a=z*(segments+1)+x,b=a+1,c=a+segments+1,d=c+1;indices.push(a,c,b,b,c,d);}
  }
  const geometry=new THREE.BufferGeometry(); geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3)); geometry.setIndex(indices); geometry.computeVertexNormals();
  const mesh=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color:0x766e59,roughness:1,flatShading:true})); mesh.receiveShadow=true; mesh.name=`Scablands ground ${chunk.x},${chunk.z}`; mesh.userData.townGround=true; return mesh;
}

export function createTownScene({town, loadModel=url=>new GLTFLoader().loadAsync(url).then(result=>result.scene), width=1, height=1, now=new Date()}={}) {
  if (!town || typeof town !== 'object') throw new TypeError('Choose a town to view.');
  const scene=new THREE.Scene(); scene.background=new THREE.Color(0x9eaaa9); scene.fog=new THREE.Fog(0x9eaaa9,350,3600);
  scene.add(new THREE.HemisphereLight(0xc8d8df,0x50483a,2.0));
  const sun=new THREE.DirectionalLight(0xffe4b6,2.4); sun.position.set(-140,260,90); sun.castShadow=true; scene.add(sun);
  const camera=createTownCamera({width,height,target:{x:0,y:scablandsSurfaceHeightAt(0,0),z:0}});
  const ground=new THREE.Group(); ground.name='Town ground chunks'; scene.add(ground);
  const buildings=new THREE.Group(); buildings.name='Town buildings'; scene.add(buildings);
  const overlays=new THREE.Group(); overlays.name='Town underground'; overlays.visible=false; scene.add(overlays);
  const lights=new THREE.Group(); lights.name='Town lamps'; scene.add(lights);
  const assets=new THREE.Group(); assets.name='Scablands landmarks'; scene.add(assets);
  const ghost=createTownPlacementGhost(); ghost.visible=false; scene.add(ghost);
  const state={camera,scene,ground,buildings,overlays,lights,assets,ghost,selected:null,underground:false,disposed:false,season:String(town.calendar?.season || 'spring').toLowerCase(),timeOfDay:town.calendar?.hour??now.getHours()+now.getMinutes()/60,loadModel,lastLampHour:null,lastLampBuildingCount:-1};
  const update=()=>{
    if(state.disposed) return;
    const wanted=visibleTownChunks(town,camera,{radius:2}), keys=new Set(wanted.map(c=>`${c.x}:${c.z}`));
    for(const group of [ground,buildings]) for(const child of [...group.children]) if(!keys.has(child.userData.chunkKey)){group.remove(child);child.geometry?.dispose?.();child.material?.dispose?.();}
    for(const chunk of wanted){const key=`${chunk.x}:${chunk.z}`;
      if(!ground.children.some(child=>child.userData.chunkKey===key)){const mesh=terrainChunk(chunk);mesh.userData.chunkKey=key;ground.add(mesh);}
      if(!buildings.children.some(child=>child.userData.chunkKey===key)){const group=new THREE.Group();group.userData.chunkKey=key;group.name=`Town chunk ${key} ${townChunkLod(camera,chunk)}`;buildTownChunkInstances(town,chunk,townChunkLod(camera,chunk)).forEach(mesh=>group.add(mesh));buildings.add(group);}
    }
    const lampHour=Math.floor(state.timeOfDay),buildingCount=town.buildings?.length??0;
    if(lampHour!==state.lastLampHour||buildingCount!==state.lastLampBuildingCount){
      state.lastLampHour=lampHour;state.lastLampBuildingCount=buildingCount;lights.clear();
      lights.visible=state.timeOfDay>=18||state.timeOfDay<6;
      if(lights.visible) {
      const roads=(town.buildings||[]).filter(building=>building.buildingId?.startsWith('road-'));
      const stride=Math.max(1,Math.ceil(roads.length/128));
      for(let index=0;index<roads.length;index+=stride){const building=roads[index],lamp=new THREE.PointLight(0xffbf69,0.65,22);lamp.position.set((building.x+.5)*8,4,(building.z+.5)*8);lights.add(lamp);}
      }
    }
    overlays.visible=state.underground;
  };
  const addLandmarks=async()=>{
    for(const [id,url] of [['dome','/assets/models/wasteland/scrapdome/yard.glb'],['tin-town','/assets/models/wasteland/scablands/tintown.glb']]){
      try{const model=await loadModel(url);if(state.disposed){model.traverse(object=>{object.geometry?.dispose?.();});return;}model.name=`${id} landmark`;model.userData.landmark=id;assets.add(model);}catch{/* The ground and town remain usable if optional distant art is absent. */}
    }
    for(const place of SCABLANDS_PLACES){const beacon=new THREE.Mesh(new THREE.CylinderGeometry(0.4,2,Math.max(3,place.height||8),6),new THREE.MeshStandardMaterial({color:0x8b6b48,roughness:.95}));beacon.position.set(place.x,(place.height||0)/2,place.z);beacon.name=`Scablands ${place.id||'place'}`;assets.add(beacon);}
  };
  const setPlacement=(x,z,{valid=true,width=1,depth=1}={})=>{ghost.geometry.dispose();ghost.geometry=new THREE.BoxGeometry(width*8*.85,1.2,depth*8*.85);ghost.material.color.set(valid?0x56b56f:0xc94d42);ghost.name=valid?'Valid town placement':'Invalid town placement';ghost.userData.placementValid=valid;ghost.position.set((x+width/2)*8,(scablandsSurfaceHeightAt((x+width/2)*8,(z+depth/2)*8)||0)+1,(z+depth/2)*8);ghost.visible=true;return ghost;};
  const pointer=(x,y,rect)=>{state.selected=pickTownItem(camera,[...ground.children,...buildings.children],x,y,rect);return state.selected;};
  const setUnderground=value=>{state.underground=Boolean(value);overlays.clear();if(state.underground){for(const building of town.buildings||[])if(/pipe|sewer|wire/.test(building.buildingId||'')){const material=new THREE.MeshBasicMaterial({color:building.buildingId.startsWith('wire')?0xd5b754:building.buildingId.startsWith('sewer')?0x775343:0x377e9d});const line=new THREE.Mesh(new THREE.BoxGeometry(4,.25,4),material);line.position.set((building.x+.5)*8,(building.groundY??0)-1,(building.z+.5)*8);overlays.add(line);}}update();};
  const setCalendar=(calendar,{hour=calendar?.hour??state.timeOfDay}={})=>{state.season=String(calendar?.season||state.season).toLowerCase();state.timeOfDay=hour;sun.color.set(state.season==='winter'?0xc7dcff:0xffe4b6);update();};
  const dispose=()=>{state.disposed=true;for(const root of [ground,buildings,overlays,lights,assets,ghost])root.traverse(object=>{object.geometry?.dispose?.();if(Array.isArray(object.material))object.material.forEach(m=>m.dispose());else object.material?.dispose?.();});};
  update(); void addLandmarks();
  return {scene,camera,state,update,move:input=>moveTownCamera(camera,input),resize:(w,h)=>resizeTownCamera(camera,w,h),step:delta=>{updateTownCamera(camera,delta);update();},pick:pointer,setPlacement,setUnderground,setCalendar,dispose};
}
