import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {SCABLANDS_LAYOUT, SCABLANDS_PLACES} from '../../world/scablands.js';
import {scablandsSurfaceHeightAt} from '../../world/scablands-ground.js';
import {TOWN_CHUNK_METRES, visibleTownChunks, townChunkLod} from './town-chunks.js';
import {buildTownChunkInstances, createTownPlacementGhost} from './town-instances.js';
import {createTownCamera, moveTownCamera, resizeTownCamera, updateTownCamera} from './town-camera.js';
import {pickTownGround, pickTownItem} from './town-pick.js';
import {GROUND_UV, groundColour} from '../../world/ground-view.js';
import {buildTownMapMarkers, layoutTownMapMarkers} from './town-map-markers.js';

function terrainChunk(chunk, material) {
  const segments = 16, positions = [], colours = [], uvs = [], indices = [], startX = chunk.x*TOWN_CHUNK_METRES, startZ = chunk.z*TOWN_CHUNK_METRES;
  const heightSamples=[];
  for (let z=0; z<=segments; z++) for (let x=0; x<=segments; x++) {
    const px=startX+x*TOWN_CHUNK_METRES/segments, pz=startZ+z*TOWN_CHUNK_METRES/segments;
    const height=scablandsSurfaceHeightAt(px,pz), colour=groundColour(px,pz,0); heightSamples.push(height); positions.push(px,height,pz); colours.push(colour.r,colour.g,colour.b); uvs.push(px*GROUND_UV,pz*GROUND_UV);
    if (x<segments && z<segments) {const a=z*(segments+1)+x,b=a+1,c=a+segments+1,d=c+1;indices.push(a,c,b,b,c,d);}
  }
  const geometry=new THREE.BufferGeometry(); geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3)); geometry.setAttribute('color',new THREE.Float32BufferAttribute(colours,3)); geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2)); geometry.setIndex(indices); geometry.computeVertexNormals();
  const mesh=new THREE.Mesh(geometry,material); mesh.receiveShadow=true; mesh.name=`Scablands ground ${chunk.x},${chunk.z}`; mesh.userData.townGround=true; mesh.userData.heightSamples=heightSamples; return mesh;
}

function terrainChunkChanged(mesh,chunk){
  let index=0; const startX=chunk.x*TOWN_CHUNK_METRES,startZ=chunk.z*TOWN_CHUNK_METRES;
  for(let z=0;z<=16;z++)for(let x=0;x<=16;x++,index++){
    const height=scablandsSurfaceHeightAt(startX+x*TOWN_CHUNK_METRES/16,startZ+z*TOWN_CHUNK_METRES/16);
    if(height!==mesh.userData.heightSamples[index])return true;
  }
  return false;
}

function scablandsGround(material){
  const segments=128,positions=[],colours=[],uvs=[],indices=[];
  for(let z=0;z<=segments;z++)for(let x=0;x<=segments;x++){
    const px=-SCABLANDS_LAYOUT.halfWidth+x*SCABLANDS_LAYOUT.halfWidth*2/segments;
    const pz=-SCABLANDS_LAYOUT.halfDepth+z*SCABLANDS_LAYOUT.halfDepth*2/segments;
    const height=scablandsSurfaceHeightAt(px,pz)-2.5,colour=groundColour(px,pz,0);
    positions.push(px,height,pz);colours.push(colour.r,colour.g,colour.b);uvs.push(px*GROUND_UV,pz*GROUND_UV);
    if(x<segments&&z<segments){const a=z*(segments+1)+x,b=a+1,c=a+segments+1,d=c+1;indices.push(a,c,b,b,c,d);}
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('color',new THREE.Float32BufferAttribute(colours,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));geometry.setIndex(indices);geometry.computeVertexNormals();
  const mesh=new THREE.Mesh(geometry,material);mesh.name='Scablands far ground';mesh.userData.townGround=true;mesh.visible=false;mesh.receiveShadow=false;
  const roadPoints=[];
  for(let index=0;index<=256;index++){
    const angle=index/256*Math.PI*2,x=SCABLANDS_LAYOUT.frameRadiusX*Math.cos(angle),z=SCABLANDS_LAYOUT.frameRadiusZ*Math.sin(angle);
    roadPoints.push(new THREE.Vector3(x,scablandsSurfaceHeightAt(x,z)+.45,z));
  }
  const road=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(roadPoints),256,10,6,false),new THREE.MeshBasicMaterial({color:0x514535}));
  road.name='Scablands road';road.userData.townGround=true;mesh.add(road);
  for(const place of SCABLANDS_PLACES){
    const point=new THREE.Vector3(place.x,scablandsSurfaceHeightAt(place.x,place.z)+.8,place.z);
    const mark=new THREE.Mesh(new THREE.CircleGeometry(6,12),new THREE.MeshBasicMaterial({color:0x352f26,side:THREE.DoubleSide}));
    mark.rotation.x=-Math.PI/2;mark.position.copy(point);mark.name=`Scablands place mark ${place.id}`;mark.userData.townGround=true;mesh.add(mark);
  }
  return mesh;
}

export function createTownScene({town, loadModel=url=>new GLTFLoader().loadAsync(url).then(result=>result.scene), width=1, height=1, now=new Date()}={}) {
  if (!town || typeof town !== 'object') throw new TypeError('Choose a town to view.');
  const scene=new THREE.Scene(); scene.background=new THREE.Color(0xb4a286); scene.fog=new THREE.Fog(0xb4a286,90,260);
  scene.add(new THREE.HemisphereLight(0xe9e2d2,0x4a3e30,1.15));
  const sun=new THREE.DirectionalLight(0xffe7c2,2.4); sun.position.set(-30,55,-20); sun.castShadow=true; sun.shadow.mapSize.set(2048,2048); Object.assign(sun.shadow.camera,{left:-45,right:45,top:45,bottom:-45,near:1,far:180}); scene.add(sun,sun.target);
  let dirtTexture=null;
  if(globalThis.document)try{dirtTexture=new THREE.TextureLoader().load('/assets/textures/ground-color.jpg');dirtTexture.colorSpace=THREE.SRGBColorSpace;dirtTexture.wrapS=dirtTexture.wrapT=THREE.RepeatWrapping;dirtTexture.anisotropy=8;}catch{}
  const groundMaterial=new THREE.MeshStandardMaterial({map:dirtTexture,vertexColors:true,roughness:1});
  const camera=createTownCamera({width,height,target:{x:0,y:scablandsSurfaceHeightAt(0,0),z:0}});
  const farGround=scablandsGround(groundMaterial);scene.add(farGround);
  const ground=new THREE.Group(); ground.name='Town ground chunks'; scene.add(ground);
  const buildings=new THREE.Group(); buildings.name='Town buildings'; scene.add(buildings);
  const overlays=new THREE.Group(); overlays.name='Town underground'; overlays.visible=false; scene.add(overlays);
  const lights=new THREE.Group(); lights.name='Town lamps'; scene.add(lights);
  const assets=new THREE.Group(); assets.name='Scablands landmarks'; scene.add(assets);
  const ghost=createTownPlacementGhost(); ghost.visible=false; scene.add(ghost);
  const state={camera,scene,ground,buildings,overlays,lights,assets,ghost,selected:null,underground:false,disposed:false,season:String(town.calendar?.season || 'spring').toLowerCase(),timeOfDay:town.calendar?.hour??now.getHours()+now.getMinutes()/60,loadModel,lastLampHour:null,lastLampBuildingCount:-1,lastRenderedBuildingCount:town.buildings?.length??0};
  const update=()=>{
    if(state.disposed) return;
    const distance=camera.position.distanceTo(camera.userData.townView.target);
    scene.fog.near=Math.max(90,distance*.78);scene.fog.far=Math.max(260,distance*1.35);
    farGround.visible=camera.userData.townView.zoom>=.4;
    const currentBuildingCount=town.buildings?.length??0;
    if(currentBuildingCount!==state.lastRenderedBuildingCount){
      for(const group of [...buildings.children]){group.traverse(object=>{object.geometry?.dispose?.();if(Array.isArray(object.material))object.material.forEach(material=>material.dispose());else object.material?.dispose?.();});buildings.remove(group);}
      state.lastRenderedBuildingCount=currentBuildingCount;
    }
    const wanted=visibleTownChunks(town,{position:camera.userData.townView.target,userData:camera.userData},{radius:2}), keys=new Set(wanted.map(c=>`${c.x}:${c.z}`));
    for(const group of [ground,buildings]) for(const child of [...group.children]) if(!keys.has(child.userData.chunkKey)){group.remove(child);child.geometry?.dispose?.();child.material?.dispose?.();}
    for(const chunk of wanted){const key=`${chunk.x}:${chunk.z}`;
      const oldGround=ground.children.find(child=>child.userData.chunkKey===key);
      if(!oldGround||terrainChunkChanged(oldGround,chunk)){if(oldGround){ground.remove(oldGround);oldGround.geometry.dispose();}const mesh=terrainChunk(chunk,groundMaterial);mesh.userData.chunkKey=key;ground.add(mesh);}
      if(!buildings.children.some(child=>child.userData.chunkKey===key)){const group=new THREE.Group();group.userData.chunkKey=key;group.name=`Town chunk ${key} ${townChunkLod(camera,chunk)}`;buildTownChunkInstances(town,chunk,townChunkLod(camera,chunk)).forEach(mesh=>group.add(mesh));buildings.add(group);}
    }
    const lampHour=Math.floor(state.timeOfDay),buildingCount=currentBuildingCount;
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
      try{const model=await loadModel(url);if(state.disposed){model.traverse(object=>{object.geometry?.dispose?.();});return;}model.traverse(object=>{if(object.name)object.name=object.name.replaceAll(':','');if(object.isMesh){object.castShadow=true;object.receiveShadow=true;}});model.name=`${id} landmark`;model.userData.landmark=id;if(id==='dome')model.position.z=-289;if(id==='tin-town'){const place=SCABLANDS_PLACES.find(item=>item.id==='tin-town');model.position.set(place.x,0,place.z);}assets.add(model);}catch{/* The ground and town remain usable if optional distant art is absent. */}
    }
    for(const place of SCABLANDS_PLACES){const beacon=new THREE.Mesh(new THREE.CylinderGeometry(0.4,2,Math.max(3,place.height||8),6),new THREE.MeshStandardMaterial({color:0x8b6b48,roughness:.95}));beacon.position.set(place.x,(place.height||0)/2,place.z);beacon.name=`Scablands ${place.id||'place'}`;assets.add(beacon);}
  };
  const setPlacement=(x,z,{valid=true,width=1,depth=1}={})=>{ghost.geometry.dispose();ghost.geometry=new THREE.BoxGeometry(width*8*.85,1.2,depth*8*.85);ghost.material.color.set(valid?0x56b56f:0xc94d42);ghost.name=valid?'Valid town placement':'Invalid town placement';ghost.userData.placementValid=valid;ghost.position.set((x+width/2)*8,(scablandsSurfaceHeightAt((x+width/2)*8,(z+depth/2)*8)||0)+1,(z+depth/2)*8);ghost.visible=true;return ghost;};
  const pointer=(x,y,rect)=>{state.selected=pickTownItem(camera,[...ground.children,...buildings.children],x,y,rect);return state.selected;};
  const pickGround=(x,y,rect)=>pickTownGround(camera,ground.children,x,y,rect);
  const setUnderground=value=>{state.underground=Boolean(value);overlays.clear();if(state.underground){
    const routeLayers=[['pipes',0x377e9d],['sewers',0x775343],['wires',0xd5b754]];
    for(const [layer,color] of routeLayers)for(const segment of town.utilities?.[layer]||[]){
      const from=segment.from,to=segment.to;if(!from||!to)continue;
      const dx=to.x-from.x,dz=to.z-from.z,length=Math.hypot(dx,dz);if(!length)continue;
      const route=new THREE.Mesh(new THREE.BoxGeometry(length,.25,.3),new THREE.MeshBasicMaterial({color}));
      route.position.set((from.x+to.x)/2,(scablandsSurfaceHeightAt((from.x+to.x)/2,(from.z+to.z)/2)||0)-1,(from.z+to.z)/2);
      route.rotation.y=-Math.atan2(dz,dx);overlays.add(route);
    }
    for(const building of town.buildings||[])if(/pipe|sewer|wire/.test(building.buildingId||'')){const material=new THREE.MeshBasicMaterial({color:building.buildingId.startsWith('wire')?0xd5b754:building.buildingId.startsWith('sewer')?0x775343:0x377e9d});const line=new THREE.Mesh(new THREE.BoxGeometry(4,.25,4),material);line.position.set((building.x+.5)*8,(building.groundY??0)-1,(building.z+.5)*8);overlays.add(line);}
  }update();};
  const setCalendar=(calendar,{hour=calendar?.hour??state.timeOfDay}={})=>{state.season=String(calendar?.season||state.season).toLowerCase();state.timeOfDay=hour;sun.color.set(state.season==='winter'?0xc7dcff:0xffe4b6);update();};
  const dispose=()=>{state.disposed=true;for(const root of [ground,buildings,overlays,lights,assets,ghost,farGround])root.traverse(object=>{object.geometry?.dispose?.();if(Array.isArray(object.material))object.material.forEach(m=>m.dispose());else object.material?.dispose?.();});groundMaterial.dispose();dirtTexture?.dispose?.();};
  update(); void addLandmarks();
  return {scene,camera,state,update,move:input=>moveTownCamera(camera,input),resize:(w,h)=>resizeTownCamera(camera,w,h),step:delta=>{updateTownCamera(camera,delta);update();},
    mapMarkers:()=>buildTownMapMarkers(town),layoutMarkers:(options={})=>layoutTownMapMarkers(options.markers||buildTownMapMarkers(town),camera,options),
    pick:pointer,pickGround,setPlacement,setUnderground,setCalendar,dispose};
}
