import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {SCABLANDS_LAYOUT, SCABLANDS_PLACES} from './scablands.js';
import {scablandsSurfaceHeightAt, scablandsGroundEdit, getScablandsOpenMarks, getScablandsTownLayout,
  onScablandsOpenMarksChanged} from './scablands-ground.js';
import {createGroundView} from './ground-view.js';
import {createDigFx} from './dig-fx.js';
import {registerSceneSystem} from '../scene-systems.js';
import {OLD_SMOKE,furnaceGlowingDoor} from './jobs/old-smoke.js';
import {createTheWhitesScene} from './the-whites-scene.js';
import {createScrapWear,createFlameMaterial,createSmokeMaterial,createGroundGlowMaterial,createSparks,createGroundShade} from './scrap-look.js';

export const SCABLANDS_ASSETS = Object.freeze({
  tintown: '/assets/models/wasteland/scablands/tintown.glb',
  boneyard: '/assets/models/wasteland/scablands/boneyard.glb',
  mall: '/assets/models/wasteland/scablands/mall.glb',
  everburn: '/assets/models/wasteland/scablands/everburn.glb',
  kit: '/assets/models/wasteland/scablands/kit.glb',
  folk: '/assets/models/wasteland/scablands/folk.glb',
  vehicles: '/assets/models/wasteland/scablands/vehicles.glb',
  furnace: '/assets/models/wasteland/scablands/old-smoke.glb',
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
  'tin-town':['tintown','folk'],'boneyard':['boneyard','vehicles'],'dead-mall':['mall'],'everburn':['everburn','furnace'],
  'iron-line':[],'dry-dam':[],'ships-in-sand':[],'ridge':['kit'],
};
const vehiclePart={vehicles:'Big Bess gas truck',furnace:"Old Smoke's rolling furnace"};
const detailCounts=Object.freeze({near:30,far:10});
// The model loader renames every part: a space becomes an underscore and a full stop is dropped
// ("Furnace side armor.001" arrives as "Furnace_side_armor001"). Part names are compared in this plain form.
const plainName=name=>String(name??'').replace(/_/g,' ');
function findPart(root,name){
  let found=null;root.traverse(node=>{if(!found&&plainName(node.name)===name)found=node;});
  return found;
}

function makeGround(width,depth,segments,material,detail,offsetX=0,offsetZ=0,groundEdit=scablandsGroundEdit){
  const positions=[],uv=[],indices=[];
  for(let iz=0;iz<=segments;iz++)for(let ix=0;ix<=segments;ix++){
    const x=-width/2+width*ix/segments,z=-depth/2+depth*iz/segments;
    positions.push(x,scablandsSurfaceHeightAt(x+offsetX,z+offsetZ,groundEdit)+.025,z);uv.push(ix/segments*12,iz/segments*12);
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
  // Many parts share one material, and one model file serves more than one place. Each material is copied
  // and tinted once for this place; tinting it again for every part that used it drew the art near black.
  const tinted=new Map();
  const tint=source=>{
    if(tinted.has(source))return tinted.get(source);
    const material=source.clone();tinted.set(source,material);
    material.color?.multiplyScalar(placeId==='dead-mall'?.72:.84);
    if(material.roughness!==undefined)material.roughness=Math.max(.78,material.roughness);
    if(placeId==='dead-mall'&&/sign|letter|goods/i.test(material.name||''))
      material.color?.set(/letter|goods/i.test(material.name)?0xf0d397:0x173e32);
    return material;
  };
  scene.traverse(node=>{
    if(!node.isMesh||!node.material)return;
    node.castShadow=true;node.receiveShadow=true;
    node.material=Array.isArray(node.material)?node.material.map(tint):tint(node.material);
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

const SOOT_GREY=new THREE.Color(0x302c28),SOOT_BLACK=new THREE.Color(0x0c0b0a),SOOT_ORANGE=new THREE.Color(0xc8641c);
// The furnace's three fire doors in the rig's own metres (+X is the furnace's left): the middle of each door and
// the way it faces. Two tongues of fire stand in each door.
const FURNACE_DOORS=Object.freeze({left:{x:2.0,y:2.26,z:-1,out:{x:1,z:0}},right:{x:-2.0,y:2.26,z:-1,out:{x:-1,z:0}},
  rear:{x:0,y:2.22,z:-4.1,out:{x:0,z:-1}}});
const DOOR_FLAMES=Object.freeze([['left',2.15,-1.45],['left',2.15,-.55],['right',-2.15,-1.45],['right',-2.15,-.55],['rear',-.45,-4.3],['rear',.45,-4.3]]);
const SMOKE_PUFFS=14;
function addFurnaceFire(parent,place,scale=1.5){
  const effects=new THREE.Group();effects.name="Old Smoke's furnace fire and chimney smoke";
  const flame=createFlameMaterial(),soot=createSmokeMaterial(0x302c28),card=new THREE.PlaneGeometry(1,1);
  const standing=new THREE.PlaneGeometry(1,1);standing.translate(0,.5,0);
  // Fire drawn in code: it faces the viewer, flickers, and shows only while its door glows.
  DOOR_FLAMES.forEach(([door,x,z],index)=>{
    const tongue=new THREE.Mesh(standing,flame);tongue.name=`Fire over the ${door} door`;
    tongue.position.set(x,1.75,z);tongue.scale.set(2.3,3.8,1);tongue.userData.door=door;tongue.visible=false;tongue.renderOrder=3;
    tongue.onBeforeRender=()=>{flame.uniforms.uSeed.value=index*.37;flame.uniformsNeedUpdate=true;};
    effects.add(tongue);
  });
  // The chimney's mouth, read from the side photo.
  const chimney={x:1.1,y:5.15,z:2.0};
  for(let puff=0;puff<SMOKE_PUFFS;puff++){
    const cloud=new THREE.Mesh(card,soot);cloud.name='Chimney smoke';cloud.userData.fade=0;cloud.renderOrder=2;
    cloud.onBeforeRender=()=>{soot.uniforms.uFade.value=cloud.userData.fade;soot.uniforms.uSeed.value=puff*.213;soot.uniformsNeedUpdate=true;};
    effects.add(cloud);
  }
  const flames=effects.children.slice(0,6),smoke=effects.children.slice(6);
  const sparks=createSparks();sparks.visible=false;effects.add(sparks);
  const glowMaterial=createGroundGlowMaterial(),glow=new THREE.Mesh(card,glowMaterial);
  glow.name='Firelight on the ground';glow.rotation.x=-Math.PI/2;glow.scale.setScalar(11);glow.visible=false;glow.renderOrder=1;effects.add(glow);
  const shade=new THREE.Mesh(card,createGroundShade());shade.name='Shade under the furnace';
  shade.rotation.x=-Math.PI/2;shade.position.set(0,.1,1);shade.scale.set(7.6,14,1);effects.add(shade);
  parent.add(effects);
  const fire={effects,flames,smoke,sparks,glow,flame,glowMaterial,chimneyX:chimney.x,chimneyY:chimney.y,chimneyZ:chimney.z,glowingDoor:null,
    // The plume rises and spreads, and leans back as the furnace gathers speed (`drift`, metres a second).
    placeSmoke(seconds,drift=0){
      smoke.forEach((puff,index)=>{
        const age=(seconds*.11+index/SMOKE_PUFFS)%1;
        puff.position.set(chimney.x+Math.sin(seconds*.31+index*2.4)*2.4*age,chimney.y+age*(24-Math.min(drift,30)*.45),
          chimney.z+Math.cos(seconds*.27+index*1.7)*1.6*age-Math.min(drift,30)*age*1.1);
        puff.scale.setScalar(2.4+age*11);
        puff.userData.fade=Math.min(1,age/.05)*Math.pow(1-age,1.3)*.85;
      });
    }};
  fire.placeSmoke(0);
  return fire;
}

export function createScablandsScene(course,options={}){
  const loadAsset=options.loadAsset??(path=>new GLTFLoader().loadAsync(path));
  const followsOpenMarks=!Object.hasOwn(options,'openMarks');
  let openMarks=options.openMarks??getScablandsOpenMarks();
  const group=new THREE.Group();group.name='The Scablands';
  let retired=false;
  let townDraw=null;
  let whites=createTheWhitesScene({openMarks,loadAsset});
  if(whites)group.add(whites.group);
  const townLayout=getScablandsTownLayout();
  const addTown=async()=>{
    if(!townLayout)return;
    const {buildTownChunkInstances}=await import('../town/view/town-instances.js');
    if(retired)return;
    const town={regions:{scablands:{}},buildings:townLayout.buildings||[],zones:[]};
    const chunks=new Set();
    for(const building of town.buildings)if(building.regionId==='scablands')chunks.add(`${Math.floor(building.x/16)}:${Math.floor(building.z/16)}`);
    const root=new THREE.Group();root.name='Town roads, sites and buildings';
    for(const key of chunks){const [x,z]=key.split(':').map(Number);for(const mesh of buildTownChunkInstances(town,{x,z},'near'))root.add(mesh);}
    const roadMat=new THREE.MeshStandardMaterial({color:0x756b59,roughness:1});
    for(const road of townLayout.roads||[]){
      const dx=road.b.x-road.a.x,dz=road.b.z-road.a.z,length=Math.hypot(dx,dz);
      if(!length)continue;
      const mesh=new THREE.Mesh(new THREE.BoxGeometry(length,.16,road.halfWidth*2),roadMat);
      const x=(road.a.x+road.b.x)/2,z=(road.a.z+road.b.z)/2;
      mesh.position.set(x,scablandsSurfaceHeightAt(x,z)+.12,z);mesh.rotation.y=-Math.atan2(dz,dx);mesh.name=`Town road ${road.id}`;root.add(mesh);
    }
    group.add(root);townDraw=root;
  };
  void addTown();
  const furnaceVents=[],furnacePlates=[];
  let furnaceEffects=null, furnaceRig=null, furnaceModel=null, furnacePlace=null;
  // The furnace's surfaces are photos, which carry their own rust and soot; the code adds only the road dust.
  const furnaceWear=createScrapWear({paint:0});
  const furnaceLast=new THREE.Vector3();let furnaceLastSeconds=null,furnaceDrift=0;
  const groundMaterial=new THREE.MeshStandardMaterial({color:0x76624b,roughness:1});
  const roadMaterial=new THREE.MeshStandardMaterial({color:0x594b39,roughness:1});
  const ground=new THREE.Group();ground.name='Scablands ground chunks';group.add(ground);
  // Four near tiles carry the shared physics height at a fine grid; the single
  // distant mesh uses a coarser grid to keep the horizon inexpensive.
  const nearTiles=[];
  for(let z=-1;z<=0;z++)for(let x=-1;x<=0;x++){
    const tile=makeGround(700,500,detailCounts.near,groundMaterial,true,x*700+350,z*500+250);
    tile.position.set(x*700+350,0,z*500+250);ground.add(tile);nearTiles.push(tile);
  }
  const far=makeGround(2800,2000,detailCounts.far,groundMaterial,false);far.position.y=-.12;ground.add(far);
  let editedGround=createGroundView({group:ground,groundEdit:scablandsGroundEdit});
  const digTexture=typeof document==='undefined'?null:new THREE.TextureLoader().load('/assets/textures/dig-dirt.png');
  if(digTexture)digTexture.colorSpace=THREE.SRGBColorSpace;
  const digFx=createDigFx({group,atlasTexture:digTexture,seed:course.seed});
  // A broad gravel ribbon follows the stable oval frame used by driving and
  // never changes the shared terrain height function.
  const roadPoints=[];
  for(let i=0;i<=192;i++){const a=i/192*Math.PI*2,x=Math.cos(a)*SCABLANDS_LAYOUT.frameRadiusX,z=Math.sin(a)*SCABLANDS_LAYOUT.frameRadiusZ;
    roadPoints.push(new THREE.Vector3(x,scablandsSurfaceHeightAt(x,z)+.12,z));}
  const roadGeometry=()=>{
    const curve=new THREE.CatmullRomCurve3(roadPoints,true,'centripetal');
    return new THREE.TubeGeometry(curve,384,SCABLANDS_LAYOUT.roadHalfWidth,6,true);
  };
  const road=new THREE.Mesh(roadGeometry(),roadMaterial);
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
        const source=vehiclePart[key]?findPart(asset.scene,vehiclePart[key]):asset.scene;
        if(!source)throw Error(`Scablands ${key} art is missing its ${place.id} model.`);
        const model=source.clone(true);tintArt(model,place.id);
        if(key==='furnace'){
          model.traverse(node=>{
            // Six armour plates; two fall off the furnace with each hit.
            const name=plainName(node.name);
            if(node.isMesh)for(const material of [].concat(node.material))if(!/glow|ember/i.test(material.name||''))furnaceWear.apply(material);
            if(/^(Furnace side armor|Furnace torn corner plate|Hanging torn furnace plate)[ .\d]*$/.test(name))furnacePlates.push(node);
            // The three rear vents are the rear door; the flank vents on each side are the left and right doors.
            const ventMatch=name.match(/old-smoke-vent-\d+-glow|Flank vent ([+-]?)1 \d+ ember/i);
            if(!node.isMesh||!ventMatch)return;
            node.material=Array.isArray(node.material)?node.material.map(material=>material.clone()):node.material.clone();
            // A door's lights are hidden until it glows, so the photo's own shut door shows.
            node.visible=false;
            furnaceVents.push({door:ventMatch[1]===undefined?'rear':ventMatch[1]==='-'?'right':'left',material:node.material,mesh:node});
          });
          furnacePlace=place;
          furnaceRig=new THREE.Group();furnaceRig.name="Old Smoke's moving furnace rig";
          furnaceRig.position.set(place.x+18,scablandsSurfaceHeightAt(place.x,place.z),place.z);
          furnaceRig.rotation.y=(SCABLANDS_PLACES.indexOf(place)%4)*Math.PI/2;
          model.position.x=0;model.rotation.y=0;model.scale.setScalar(1.5);
          furnaceModel=model;furnaceRig.add(model);group.add(furnaceRig);
          // The left side's plates fall with the first hit (the left door), the right side's with the second,
          // and the rear corner shields with the third.
          const plateRank=plate=>/corner/.test(plate.name)?2:plate.position.x>0?0:1;
          furnacePlates.sort((a,b)=>plateRank(a)-plateRank(b));
          furnaceEffects=addFurnaceFire(furnaceRig,place,1.5);
          return;
        }
        model.position.x=index?18:0;model.rotation.y=(SCABLANDS_PLACES.indexOf(place)%4)*Math.PI/2;
        full.add(model);
      });
      const distant=new THREE.Mesh(new THREE.BoxGeometry(32,12,24),new THREE.MeshStandardMaterial({color:0x4c4236,roughness:1}));
      distant.name=`${place.name} far silhouette`;distant.position.y=6;distant.castShadow=true;
      lod.addLevel(full,0);lod.addLevel(distant,280);
      lod.position.set(place.x,scablandsSurfaceHeightAt(place.x,place.z),place.z);group.add(lod);
      if(place.id==='dead-mall')addMallRubble(group,place);
    }));
    group.userData.assetStatus='ready';return true;
  })().catch(error=>{if(!retired){group.userData.assetStatus='failed';group.userData.loadErrors.push(String(error?.message||error));
    console.error('Scablands art did not load:',String(error?.message||error));}return false;});
  registerSceneSystem(group,{
    animate(seconds){
      if(!furnaceEffects||!furnaceRig)return;
      furnaceWear.follow(furnaceRig);
      // How fast the furnace is moving, from where it stood at the last frame; this only leans the smoke.
      const step=furnaceLastSeconds===null?0:seconds-furnaceLastSeconds;
      if(step>0&&step<.5)furnaceDrift+=(Math.min(40,furnaceRig.position.distanceTo(furnaceLast)/step)-furnaceDrift)*Math.min(1,step*2);
      furnaceLast.copy(furnaceRig.position);furnaceLastSeconds=seconds;
      furnaceEffects.placeSmoke(seconds,furnaceDrift);
      furnaceEffects.flame.uniforms.uTime.value=seconds;furnaceEffects.glowMaterial.uniforms.uTime.value=seconds;
      furnaceEffects.flames.forEach((flame,index)=>{flame.scale.y=3.8*(.85+.25*Math.abs(Math.sin(seconds*5.3+index*1.9)));});
      const door=FURNACE_DOORS[furnaceEffects.glowingDoor];
      furnaceEffects.sparks.visible=furnaceEffects.glow.visible=Boolean(door);
      if(door){
        furnaceEffects.sparks.userData.place(seconds,door,door.out,door.out.z?0:furnaceDrift*.25);
        furnaceEffects.glow.position.set(door.x+door.out.x*3.2,.14,door.z+door.out.z*3.2);
      }
    },
    sync(state){
      const worldJob=state?.arena?.mode==='world-job'?state.arena.worldJob:null;
      const chasing=worldJob?.definition?.storyId==='everburn'&&worldJob.job?.steps?.[worldJob.job.stepIndex]?.kind==='chase';
      const actor=chasing?worldJob.actors?.find(item=>item.id==='old-smoke-furnace'):null;
      if(furnaceRig&&furnaceModel&&furnacePlace){
        if(actor){
          furnaceRig.position.set(actor.position?.x??furnacePlace.x,actor.position?.y??0,actor.position?.z??furnacePlace.z);
          const path=worldJob.job.steps[worldJob.job.stepIndex]?.path||[];
          const next=path[Math.min((actor.pathIndex??0)+1,path.length-1)];
          const target=next?.position??next;
          const heading=Number.isFinite(actor.heading)?actor.heading:target&&actor.position
            ?Math.atan2(target.x-actor.position.x,target.z-actor.position.z):furnaceRig.rotation.y;
          furnaceRig.rotation.y=heading;furnaceModel.position.x=0;
        }else{
          furnaceRig.position.set(furnacePlace.x+18,scablandsSurfaceHeightAt(furnacePlace.x,furnacePlace.z),furnacePlace.z);
          furnaceRig.rotation.y=(SCABLANDS_PLACES.indexOf(furnacePlace)%4)*Math.PI/2;furnaceModel.position.x=0;
        }
      }
      const furnace=actor?.furnace;
      furnacePlates.forEach((plate,index)=>{plate.visible=index>=(furnace?.hits??0)*2;});
      // A broken door stays scorched: the left door after the first hit, the right after the second, the rear after the third.
      ['left','right','rear'].forEach((door,index)=>{const spot=FURNACE_DOORS[door],broken=(furnace?.hits??0)>index;
        furnaceWear.uniforms.uScrapSoot.value[index].set(spot.x,broken?spot.y+.3:-99,spot.z,broken?2.7:.01);});
      const sootMaterial=furnaceEffects?.smoke[0]?.material;
      if(sootMaterial){
        // The smoke is grey, turns orange through the 4-second stoke, and is blacker after each hit.
        sootMaterial.color.copy(SOOT_GREY).lerp(SOOT_BLACK,(furnace?.hits??0)/OLD_SMOKE.hitsToWin);
        if(furnace?.phase==='stoke')sootMaterial.color.lerp(SOOT_ORANGE,Math.min(1,furnace.phaseSec/OLD_SMOKE.stokeSec));
      }
      const glowingDoor=actor&&furnace?furnaceGlowingDoor(furnace):null;
      for(const flame of furnaceEffects?.flames??[])flame.visible=flame.userData.door===glowingDoor;
      if(furnaceEffects)furnaceEffects.glowingDoor=glowingDoor;
      for(const vent of furnaceVents)vent.mesh.visible=vent.door===glowingDoor;
      if(furnaceRig)furnaceWear.follow(furnaceRig);
      if(!actor)return;
      for(const vent of furnaceVents){
        const active=vent.door===glowingDoor;
        const materials=Array.isArray(vent.material)?vent.material:[vent.material];
        for(const material of materials){
          if(material.emissive)material.emissive.set(active?0xff7020:0x160904);
          if('emissiveIntensity' in material)material.emissiveIntensity=active?2.8:.15;
          if(material.color)material.color.set(active?0xffad46:0x241a14);
        }
      }
    },
  });
  function dispose(){
    if(retired)return;retired=true;
    stopOpenMarkWatch();
    editedGround.dispose();digFx.dispose();digTexture?.dispose();whites?.dispose();
    const geometries=new Set(),materials=new Set();
    group.traverse(node=>{if(node.geometry)geometries.add(node.geometry);for(const material of [].concat(node.material||[]))materials.add(material);});
    for(const geometry of geometries)geometry.dispose();
    for(const material of materials)material.dispose();
    group.clear();group.userData.assetStatus='retired';townDraw=null;
  }
  registerSceneSystem(group,{dispose});
  group.userData.assetStatus='loading';group.userData.loadErrors=[];group.userData.solids=SCABLANDS_SOLIDS;
  // Call after a work order commits its edits. The same height layer drives
  // physics; only changed chunk meshes are replaced, then the horizon is rebuilt.
  group.userData.updateGroundView=()=>{
    const changed=editedGround.update();
    if(changed){const geometry=makeGround(2800,2000,detailCounts.far,groundMaterial,false,0,0,scablandsGroundEdit).geometry;const old=far.geometry;far.geometry=geometry;old.dispose();}
    return changed;
  };
  const refreshOpenMarks=marks=>{
    if(retired||!followsOpenMarks)return;
    openMarks=marks;
    for(const tile of [...nearTiles,far]){
      const offsetX=tile.position.x,offsetZ=tile.position.z;
      const geometry=tile===far?makeGround(2800,2000,detailCounts.far,groundMaterial,false,0,0,scablandsGroundEdit).geometry:
        makeGround(700,500,detailCounts.near,groundMaterial,true,offsetX-350,offsetZ-250,scablandsGroundEdit).geometry;
      const previous=tile.geometry;tile.geometry=geometry;previous.dispose();
    }
    editedGround.dispose();
    editedGround=createGroundView({group:ground,groundEdit:scablandsGroundEdit});
    editedGround.update();
    for(const point of roadPoints)point.y=scablandsSurfaceHeightAt(point.x,point.z)+.12;
    const previousRoad=road.geometry;road.geometry=roadGeometry();previousRoad.dispose();
    whites?.dispose();
    if(whites?.group.parent)whites.group.parent.remove(whites.group);
    whites=createTheWhitesScene({openMarks,loadAsset});
    if(whites)group.add(whites.group);
  };
  const stopOpenMarkWatch=followsOpenMarks?onScablandsOpenMarksChanged(refreshOpenMarks):()=>{};
  group.userData.digFx=digFx;
  return {group,ready,solids:SCABLANDS_SOLIDS,dispose};
}
