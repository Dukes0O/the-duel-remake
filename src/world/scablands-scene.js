import {createStoryPeopleView} from './story-people-view.js';
import {GAS_LOAD_RULE} from './jobs/gas-load-rule.js';
import {SALT_RIDERS} from './jobs/ember-rule.js';
import {createScablandsDrawnFeet} from './scablands-drawn-feet.js';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {clone as cloneSkeleton} from 'three/addons/utils/SkeletonUtils.js';
import {SCABLANDS_LAYOUT, SCABLANDS_PLACES} from './scablands.js';
import {scablandsSurfaceHeightAt, scablandsFloorsAt, scablandsActorFeet, scablandsGroundEdit, getScablandsOpenMarks, getScablandsTownLayout,
  onScablandsOpenMarksChanged} from './scablands-ground.js';
import {createGroundView} from './ground-view.js';
import {createNearGround,nearGroundHeightAt,NEAR_GROUND} from './near-ground.js';
import {createGroundLook,createHillField,createRoadLook,loadGroundPhotos,createTunnelMesh} from './scablands-ground-look.js';
import {HILLS,scablandsTerrainHeightAt} from './scablands-height.js';
const NO_HILLS=Object.freeze([]);
import {featureFlags} from '../feature-flags.js';
import {createRiverField,createRoadsDraw,createRiverDraw,createCrossings,createStepsWay} from './scablands-draw.js';
import {GROUND_AREAS,riverDepthAt} from './scablands-regions.js';
import {createDigFx} from './dig-fx.js';
import {registerSceneSystem} from '../scene-systems.js';
import {OLD_SMOKE,furnaceGlowingDoor} from './jobs/old-smoke.js';
import {furnaceSighting, hotDeliveryGlass, FURNACE_GLASS} from './jobs/furnace-sightings.js';
import {BED_MIST, bedMistCorners, BRIDGE_ASH, bridgeAshFall} from './jobs/ember-rule.js';
import {createGlassPatchMaterial, createGlassBeam, createMistMaterial, createMistGeometry, createAshFall} from './ember-ways-look.js';
import {createTheWhitesScene} from './the-whites-scene.js';
import {createScrapWear,createFlameMaterial,createSmokeMaterial,createGroundGlowMaterial,createSparks,createCinderArc,createGroundShade,createDustTrail} from './scrap-look.js';
import {createTinTownGate,TIN_TOWN_GATE,tinTownDoorPose} from './tin-town-gate.js';
import {createTinTownShacks,createTinTownChimneySmoke} from './tin-town-shacks.js';
import {createForge} from './forge-look.js';
import {createBrandLamps} from './brand-lamps.js';
import {createBrandAuntie} from './brand-auntie.js';
import {createCarriedBrand} from './brand-carried.js';
import {createBrandAshView} from './brand-ash-view.js';
import {createBrandThief} from './brand-thief.js';
import {createBellowsView} from './bellows-view.js';
import {createEverburnFire,EVERBURN_DERRICK_TOP} from './everburn-fire.js';
import {BONEYARD_WRECKS,BESS_REST} from './boneyard-wrecks.js';
import {LAND} from './scablands-names.js';
import {createYard} from './scablands-yard-look.js';
import {barricadeShape,barricadeSurface} from './ash-men-look.js';
import {createNight2Look} from './night-2-look.js';
import {saltLeanToShape} from './salt-lean-to-look.js';
import {BARRICADE_LENGTH} from './jobs/barricade.js';
import {createEverburnProps} from './everburn-props.js';
import {createBraziers,brazierSpotsFor,createCinderFigure} from './ember-pot.js';
import {createGasLoadView} from './gas-load-view.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {scablandsSolids,SCABLANDS_SOLIDS} from './scablands-solids.js';
import {SCARPS, SCARP, preparedScarps} from './scablands-scarps.js';

export const SCABLANDS_ASSETS = Object.freeze({
  tintown: '/assets/models/wasteland/scablands/tintown.glb',
  boneyard: '/assets/models/wasteland/scablands/boneyard.glb',
  mall: '/assets/models/wasteland/scablands/mall.glb',
  everburn: '/assets/models/wasteland/scablands/everburn.glb',
  kit: '/assets/models/wasteland/scablands/kit.glb',
  folk: '/assets/models/wasteland/scablands/folk.glb',
  bess: '/assets/models/wasteland/scablands/big-bess.glb',
  furnace: '/assets/models/wasteland/scablands/old-smoke.glb',
});

// What a car, a raider or a person on foot cannot pass is everything drawn that stands taller than a wheel, built from the same data that
// draws it (src/world/scablands-solids.js, SCABLANDS-LAND round 4, slice 2b). The list and its builder for any land live there and are
// shown here for the scene's callers and the tests.
export {scablandsSolids,SCABLANDS_SOLIDS};

const placeAssets={
  'tin-town':['tintown','folk'],'boneyard':['boneyard','bess'],'dead-mall':['mall'],'everburn':['everburn','furnace'],
  'iron-line':[],'dry-dam':[],'ships-in-sand':[],'ridge':['kit'],
};
const vehiclePart={bess:'Big Bess gas truck',furnace:"Old Smoke's rolling furnace"};
// The model loader renames every part: a space becomes an underscore and a full stop is dropped
// ("Furnace side armor.001" arrives as "Furnace_side_armor001"). Part names are compared in this plain form.
const plainName=name=>String(name??'').replace(/_/g,' ');
function findPart(root,name){
  let found=null;root.traverse(node=>{if(!found&&plainName(node.name)===name)found=node;});
  return found;
}
// The land is 14 km by 10 km (SCABLANDS-LAND round 4). Two grounds are drawn: the detailed ground, a window of 1,400 by 1,000 m
// that follows the player (src/world/near-ground.js), and the coarse ground, one mesh of 70 by 62.5 m cells over the whole
// land. The coarse ground has a hole where the detailed one lies (a fragment inside the window is not drawn), so the two never
// fight, and it stands a little below the land's own height so that nothing of it shows through at the window's edge.
const COARSE_CELLS=Object.freeze({x:200,z:160});
const COARSE_LOWER=.35;
// Nothing a place carries is drawn, animated or looked at further from the player than this: it is beyond the horizon (the camera
// sees 2,400 m and the fog is thick from 1,650 m).
const DRAW_RANGE=1800;

// The coarse ground: 200 by 160 cells over the whole land. `hole` is a vec4 uniform (middle x, middle z, half width, half depth)
// of the area not drawn, where the detailed ground is; the material is the ground's own with that hole cut out of it.
export function makeCoarseGround(material,groundEdit=scablandsGroundEdit){
  const width=SCABLANDS_LAYOUT.halfWidth*2,depth=SCABLANDS_LAYOUT.halfDepth*2,cellsX=COARSE_CELLS.x,cellsZ=COARSE_CELLS.z;
  const positions=[],indices=[], cellWidth=width/cellsX,cellDepth=depth/cellsZ;
  for(let iz=0;iz<=cellsZ;iz++)for(let ix=0;ix<=cellsX;ix++){
    const x=-width/2+cellWidth*ix,z=-depth/2+cellDepth*iz;
    positions.push(x,plainHeightAt(x,z,groundEdit)-COARSE_LOWER,z);
  }
  // Only cells touching a scarp face need smaller triangles. Their borders stay on the original
  // straight edges, so they join neighbouring cells without cracks or overlapping ground.
  const faces=preparedScarps(SCARPS).map(s=>{
    const points=[];
    for(const along of [-SCARP.taper,s.length+SCARP.taper])for(const across of [0,s.width])
      points.push({x:s.a.x+s.tx*along-s.tz*across,z:s.a.z+s.tz*along+s.tx*across});
    return {x0:Math.min(...points.map(p=>p.x)),x1:Math.max(...points.map(p=>p.x)),
      z0:Math.min(...points.map(p=>p.z)),z1:Math.max(...points.map(p=>p.z))};
  });
  const subdivisions=8;
  for(let iz=0;iz<cellsZ;iz++)for(let ix=0;ix<cellsX;ix++){
    const a=iz*(cellsX+1)+ix,b=a+1,c=a+cellsX+1,d=c+1;
    const x=-width/2+ix*cellWidth,z=-depth/2+iz*cellDepth;
    if(!faces.some(f=>x<=f.x1&&x+cellWidth>=f.x0&&z<=f.z1&&z+cellDepth>=f.z0)){
      indices.push(a,c,b,b,c,d);continue;
    }
    const grid=[];
    for(let j=0;j<=subdivisions;j++)for(let i=0;i<=subdivisions;i++){
      const u=i/subdivisions,v=j/subdivisions,px=x+u*cellWidth,pz=z+v*cellDepth;
      let y;
      if(j===0)y=positions[a*3+1]*(1-u)+positions[b*3+1]*u;
      else if(j===subdivisions)y=positions[c*3+1]*(1-u)+positions[d*3+1]*u;
      else if(i===0)y=positions[a*3+1]*(1-v)+positions[c*3+1]*v;
      else if(i===subdivisions)y=positions[b*3+1]*(1-v)+positions[d*3+1]*v;
      else y=plainHeightAt(px,pz,groundEdit)-COARSE_LOWER;
      grid.push(positions.length/3);positions.push(px,y,pz);
    }
    for(let j=0;j<subdivisions;j++)for(let i=0;i<subdivisions;i++){
      const q=j*(subdivisions+1)+i,aa=grid[q],bb=grid[q+1],cc=grid[q+subdivisions+1],dd=grid[q+subdivisions+2];
      indices.push(aa,cc,bb,bb,cc,dd);
    }
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setIndex(indices);geometry.computeVertexNormals();
  const mesh=new THREE.Mesh(geometry,material);mesh.name='Scablands far ground';mesh.receiveShadow=true;
  return mesh;
}

// Cut a rectangle out of the ground's material: the rectangle is the detailed ground's window (the material is changed in place).
function withHole(material,hole){
  const lookCompile=material.onBeforeCompile;
  const groundKey=material.customProgramCacheKey.bind(material);
  material.customProgramCacheKey=()=>groundKey()+'-near-window';
  material.onBeforeCompile=(shader,renderer)=>{
    lookCompile?.call(material,shader,renderer);
    shader.uniforms.uNearHole=hole;
    shader.fragmentShader=shader.fragmentShader
      .replace('#include <common>','#include <common>\nuniform vec4 uNearHole;')
      .replace('void main() {','void main() {\n  if(abs(vGroundPos.x-uNearHole.x)<uNearHole.z&&abs(vGroundPos.z-uNearHole.y)<uNearHole.w)discard;');
  };
  return material;
}

// The ground as the ground meshes draw it: the land's own height with the dry river's cut put back. The river's gorge is drawn by its own
// ribbons (src/world/scablands-draw.js) and the ground is not drawn where the river is, so the ground's meshes stay smooth and the gorge
// keeps its steep banks at any distance.
const plainHeightAt=(x,z,groundEdit=scablandsGroundEdit)=>scablandsSurfaceHeightAt(x,z,groundEdit)+riverDepthAt(x,z);

// The mast stands at the Iron Line, 1 m west of its place. Its parts are placed from the mast's own origin, so the mast is moved as one.
function radioMast(group){
  const mast=new THREE.Group();mast.name='Radio mast visible across the Scablands';
  const dark=new THREE.MeshStandardMaterial({color:0x302b25,metalness:.52,roughness:.78});
  const pole=new THREE.Mesh(new THREE.CylinderGeometry(.65,.95,76,8),dark);
  pole.position.set(0,38,0);mast.add(pole);
  for(let y=9;y<70;y+=10){const ring=new THREE.Mesh(new THREE.TorusGeometry(Math.max(.8,(76-y)*.025),.12,4,8),dark);ring.position.set(0,y,0);ring.rotation.x=Math.PI/2;mast.add(ring);}
  const spot=LAND.at('iron-line',-1,0);mast.position.set(spot.x,0,spot.z);group.add(mast);return mast;
}

// Parts that give off light keep the light: lamps, embers and flames are not worn.
const glows=material=>/glow|ember|lamp|flame|fire/i.test(material.name||'')||(material.emissive&&material.emissiveIntensity>0&&material.emissive.getHex()!==0);
function tintArt(scene, placeId, wear=null){
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
    // Rust, runs, grain and road dust are drawn over the plain colours in code (SCABLANDS-LAND).
    if(wear&&!glows(material))wear.apply(material);
    return material;
  };
  scene.traverse(node=>{
    if(!node.isMesh||!node.material)return;
    node.castShadow=true;node.receiveShadow=true;
    node.material=Array.isArray(node.material)?node.material.map(tint):tint(node.material);
  });
}

// The mall's four sand drifts at the entrance are not drawn (SCABLANDS-LAND round 3, fix 3): as modelled they were beige pillows of
// their own flat colour, and flattened onto the ground's own material they still read as cushions and barrels.
function removeSandDrifts(model){
  const drifts=[];model.traverse(node=>{if(node.isMesh&&/^sand[- ]drift/.test(plainName(node.name)))drifts.push(node);});
  for(const node of drifts)node.removeFromParent();
  return drifts.length;
}

// The mall's 254 parts are drawn as one piece for each surface (SCABLANDS-LAND round 3): the model's meshes that share a
// material are merged into one mesh at load, with each part's place in the model baked in. Only position, normal and uv are
// kept. A surface with a single part keeps that part's name. The loaded model's own geometry is shared with the cache and
// is not changed or disposed.
function mergeBySurface(model,label){
  model.updateMatrixWorld(true);
  const inverse=new THREE.Matrix4().copy(model.matrixWorld).invert(),batches=new Map();
  model.traverse(node=>{
    if(!node.isMesh||Array.isArray(node.material))return;
    if(!batches.has(node.material))batches.set(node.material,[]);
    batches.get(node.material).push(node);
  });
  for(const [material,nodes] of batches){
    const pieces=nodes.map(node=>{
      const geometry=node.geometry.index?node.geometry.toNonIndexed():node.geometry.clone();
      for(const name of Object.keys(geometry.attributes))if(!['position','normal','uv'].includes(name))geometry.deleteAttribute(name);
      if(!geometry.attributes.normal)geometry.computeVertexNormals();
      if(!geometry.attributes.uv)geometry.setAttribute('uv',new THREE.BufferAttribute(new Float32Array(geometry.attributes.position.count*2),2));
      geometry.morphAttributes={};geometry.clearGroups();
      return geometry.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverse,node.matrixWorld));
    });
    const merged=new THREE.Mesh(mergeGeometries(pieces,false),material);
    merged.name=nodes.length===1?nodes[0].name:`${label} surface: ${material.name||'unnamed'}`;
    merged.castShadow=true;merged.receiveShadow=true;
    for(const piece of pieces)piece.dispose();
    for(const node of nodes)node.removeFromParent();
    model.add(merged);
  }
}

// The Boneyard's three aircraft are lifted out of the model and set down again as BONEYARD_WRECKS says: each with its own
// heading, at its own place, one rolled onto a wing. `full` holds the model at the place's own origin. Every part of a wreck
// carries its name ("North Wreck ..."); the broken landing gear is buried on purpose and does not count when a wreck is
// set on the ground. Nothing here is read by a rule: the solids come from the same table.
function arrangeWrecks(full,model,place,placeGround){
  full.updateMatrixWorld(true);
  const corner=new THREE.Vector3();
  const extent=(nodes,test=()=>true)=>{
    const box=new THREE.Box3();
    for(const node of nodes){
      if(!test(node))continue;
      const positions=node.geometry.attributes.position;
      for(let index=0;index<positions.count;index++)box.expandByPoint(corner.fromBufferAttribute(positions,index).applyMatrix4(node.matrixWorld));
    }
    return box;
  };
  const notGear=node=>!/landing gear/.test(plainName(node.name));
  const arranged=[];
  for(const wreck of BONEYARD_WRECKS){
    const nodes=[];model.traverse(node=>{if(node.isMesh&&plainName(node.name).startsWith(wreck.part))nodes.push(node);});
    if(!nodes.length)continue;
    const box=extent(nodes,notGear),pivot=new THREE.Group();pivot.name=`${wreck.part} on the ground`;
    pivot.position.set((box.min.x+box.max.x)/2,0,(box.min.z+box.max.z)/2);
    full.add(pivot);pivot.updateMatrixWorld(true);
    for(const node of nodes)pivot.attach(node);
    pivot.rotation.order='YXZ';pivot.rotation.set(THREE.MathUtils.degToRad(wreck.roll),-THREE.MathUtils.degToRad(wreck.heading),0);
    pivot.position.set(wreck.x-place.x,0,wreck.z-place.z);pivot.updateMatrixWorld(true);
    // Rest the lowest of the wreck on the ground there, plus a finger's depth.
    const ground=scablandsSurfaceHeightAt(wreck.x,wreck.z)-placeGround;
    pivot.position.y=ground-extent(nodes,notGear).min.y-.05;pivot.updateMatrixWorld(true);
    arranged.push(pivot);
  }
  return arranged;
}

// Where each truck's wheels turn about their axle (the model's X axis) and how wide they are, in the rig's own metres.
// Old Smoke's model is stored at 1/1.5 and drawn at 1.5, so its wheels read 0.449 m stored and 0.673 m drawn.
const BESS_WHEEL=Object.freeze({name:/^Big Bess wheel \d (left|right)$/,radius:.555});
const FURNACE_WHEEL=Object.freeze({name:/^Furnace wheel \d (left|right)$/,radius:85*3.2/404});
// The two big machines as boxes in their rig's own metres (+z is the way they face, +x their left), read from the models' own extents (the
// furnace is drawn 1.5 times its stored size). Only the camera reads them: it keeps out of the boxes (src/world-job-camera.js).
export const BIG_MACHINE_BOXES=Object.freeze({
  'old-smoke-furnace':Object.freeze({halfX:2.12,minZ:-4.22,maxZ:6.18,height:5.06}),
  'big-bess':Object.freeze({halfX:1.4,minZ:-4.1,maxZ:4.02,height:3.4}),
});
const wheelsOf=(model,kind)=>{const found=[];model.traverse(node=>{if(kind.name.test(plainName(node.name)))found.push(node);});return found;};
const spinWheels=(wheels,turn)=>{for(const wheel of wheels)wheel.rotation.x=(wheel.rotation.x+turn)%(Math.PI*2);};

// How a rig moved since the last frame, read from where it stood at the last frame. `speed` is its smoothed speed in
// metres a second; `update` returns the distance gone along its heading (backwards is negative). Only drawing uses it.
function createTravelMeter(){
  const last=new THREE.Vector3();let lastSeconds=null,speed=0;
  return {
    get speed(){return speed;},
    update(rig,seconds){
      const step=lastSeconds===null?0:seconds-lastSeconds;let along=0;
      if(step>0&&step<.5){
        const moved=rig.position.distanceTo(last);
        speed+=(Math.min(40,moved/step)-speed)*Math.min(1,step*2);
        // A jump of more than 60 m a second is the rig being put somewhere, not driven there: its wheels do not spin for it.
        if(moved<step*60)along=(rig.position.x-last.x)*Math.sin(rig.rotation.y)+(rig.position.z-last.z)*Math.cos(rig.rotation.y);
      }
      last.copy(rig.position);lastSeconds=seconds;return along;
    },
  };
}

// The way an actor with no heading of its own faces: toward the path point `aim` places past the one it is walking
// to, skipping any point it is already standing on.
function headingToward(actor,path,aim,fallback){
  const from=actor.position;if(!from||!path.length)return fallback;
  for(let index=Math.min((actor.pathIndex??0)+aim,path.length-1);index<path.length;index++){
    const target=path[index]?.position??path[index],dx=target.x-from.x,dz=target.z-from.z;
    if(Math.hypot(dx,dz)>.5)return Math.atan2(dx,dz);
  }
  return fallback;
}

const SOOT_GREY=new THREE.Color(0x302c28),SOOT_BLACK=new THREE.Color(0x0c0b0a),SOOT_ORANGE=new THREE.Color(0xc8641c);
// The furnace's three fire doors in the rig's own metres (+X is the furnace's left): the middle of each door and
// the way it faces. Two tongues of fire stand in each door.
const FURNACE_DOORS=Object.freeze({left:{x:2.0,y:2.26,z:-1,out:{x:1,z:0}},right:{x:-2.0,y:2.26,z:-1,out:{x:-1,z:0}},
  rear:{x:0,y:2.22,z:-4.1,out:{x:0,z:-1}}});
const DOOR_FLAMES=Object.freeze([['left',2.15,-1.45],['left',2.15,-.55],['right',-2.15,-1.45],['right',-2.15,-.55],['rear',-.45,-4.3],['rear',.45,-4.3]]);
const SMOKE_PUFFS=14;
// The doors in the order they break, and the furnace as the dead wreck a Boneyard run shows once the battle is won
// (FIELD-BATTLE-ASH): all three doors broken, no fire, and a thin plume.
const FURNACE_DOOR_ORDER=Object.freeze(['left','right','rear']);
const WRECKED_FURNACE=Object.freeze({dead:true,phase:'dead',hits:3});
const THIN_SMOKE=.45;
// The furnace's last fire: where each tongue stands from the chimney's mouth (x, z), its width and its height in metres;
// how long the fire lasts, and how long the heavy smoke takes to thin afterwards.
const LAST_FIRE=Object.freeze([[0,0,3.4,7.5],[-.5,-.4,2.6,5.2]]);
const LAST_FIRE_SEC=5,LAST_SMOKE_SEC=12,LAST_SMOKE=1.7;
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
  // The furnace's last fire (FIELD-BATTLE-ASH): when it dies on the road its chimney throws up fire for a few seconds,
  // and then only thin smoke rises. Two tongues stand in the chimney's mouth, hidden until then.
  const lastFire=LAST_FIRE.map(([x,z,wide,tall],index)=>{
    const tongue=new THREE.Mesh(standing,flame);tongue.name="The furnace's last fire";
    tongue.position.set(chimney.x+x,chimney.y-.4,chimney.z+z);tongue.scale.set(wide,tall,1);tongue.userData.tall=tall;
    tongue.visible=false;tongue.renderOrder=3;
    tongue.onBeforeRender=()=>{flame.uniforms.uSeed.value=2.1+index*.53;flame.uniformsNeedUpdate=true;};
    effects.add(tongue);return tongue;
  });
  const sparks=createSparks();sparks.visible=false;effects.add(sparks);
  const glowMaterial=createGroundGlowMaterial(),glow=new THREE.Mesh(card,glowMaterial);
  glow.name='Firelight on the ground';glow.rotation.x=-Math.PI/2;glow.scale.setScalar(11);glow.visible=false;glow.renderOrder=1;effects.add(glow);
  const shade=new THREE.Mesh(card,createGroundShade());shade.name='Shade under the furnace';
  shade.rotation.x=-Math.PI/2;shade.position.set(0,.1,1);shade.scale.set(7.6,14,1);effects.add(shade);
  parent.add(effects);
  const fire={effects,flames,lastFire,smoke,sparks,glow,flame,glowMaterial,chimneyX:chimney.x,chimneyY:chimney.y,chimneyZ:chimney.z,glowingDoor:null,
    // How full the plume is: 1, or thin once the furnace is dead (FIELD-BATTLE-ASH).
    density:1,
    // The plume rises and spreads, and leans back as the furnace gathers speed (`drift`, metres a second).
    placeSmoke(seconds,drift=0){
      smoke.forEach((puff,index)=>{
        const age=(seconds*.11+index/SMOKE_PUFFS)%1;
        puff.position.set(chimney.x+Math.sin(seconds*.31+index*2.4)*2.4*age,chimney.y+age*(24-Math.min(drift,30)*.45),
          chimney.z+Math.cos(seconds*.27+index*1.7)*1.6*age-Math.min(drift,30)*age*1.1);
        puff.scale.setScalar(2.4+age*11);
        puff.userData.fade=Math.min(1,age/.05)*Math.pow(1-age,1.3)*.85*fire.density;
      });
    }};
  fire.placeSmoke(0);
  return fire;
}

// Big Bess's exhaust stack: the mouth stands behind the cab on the truck's left, read from tools/blender/big-bess-photo.py.
const BESS_STACK=Object.freeze({x:.98,y:3.26,z:1.4});
const BESS_PUFFS=6;
// Where cinders land and burn on Big Bess (FIELD-BATTLE-ASH), in the rig's own metres: the middle of her tank's top, and
// the three fires that stand on it (x, z, width, height).
const BESS_TANK_TOP=Object.freeze({x:0,y:3.0,z:-1.7});
const BESS_TANK_FIRES=Object.freeze([[.45,-.3,1.7,2.6],[-.35,-1.9,2.1,3.3],[.3,-3.4,1.6,2.4]]);
// Road dust is born behind the rear axle of each truck, one place a side, in the rig's own metres.
const BESS_DUST=Object.freeze([{x:1.2,z:-3.7},{x:-1.2,z:-3.7}]);
const FURNACE_DUST=Object.freeze([{x:1.7,z:-3.8},{x:-1.7,z:-3.8}]);
function addBessEffects(parent){
  const effects=new THREE.Group();effects.name='Big Bess exhaust, shade and road dust';
  const grey=createSmokeMaterial(0x4a4640),card=new THREE.PlaneGeometry(1,1);
  const smoke=[];
  for(let puff=0;puff<BESS_PUFFS;puff++){
    const cloud=new THREE.Mesh(card,grey);cloud.name='Exhaust smoke';cloud.userData.fade=0;cloud.renderOrder=2;
    cloud.onBeforeRender=()=>{grey.uniforms.uFade.value=cloud.userData.fade;grey.uniforms.uSeed.value=puff*.29;grey.uniformsNeedUpdate=true;};
    effects.add(cloud);smoke.push(cloud);
  }
  const shade=new THREE.Mesh(card,createGroundShade());shade.name='Shade under Big Bess';
  shade.rotation.x=-Math.PI/2;shade.position.set(0,.1,0);shade.scale.set(4.4,10.5,1);effects.add(shade);
  const dust=createDustTrail();effects.add(dust);
  // Fire on her tank and firelight on the road, drawn only while cinders are landing on her.
  const flame=createFlameMaterial(),standing=new THREE.PlaneGeometry(1,1);standing.translate(0,.5,0);
  const fires=BESS_TANK_FIRES.map(([x,z,wide,tall],index)=>{
    const tongue=new THREE.Mesh(standing,flame);tongue.name='Fire on Big Bess';
    tongue.position.set(x,BESS_TANK_TOP.y-.35,z);tongue.scale.set(wide,tall,1);tongue.userData.tall=tall;
    tongue.visible=false;tongue.renderOrder=3;
    tongue.onBeforeRender=()=>{flame.uniforms.uSeed.value=.7+index*.41;flame.uniformsNeedUpdate=true;};
    effects.add(tongue);return tongue;
  });
  const glowMaterial=createGroundGlowMaterial(),glow=new THREE.Mesh(card,glowMaterial);
  glow.name='Firelight under Big Bess';glow.rotation.x=-Math.PI/2;glow.position.set(0,.14,-1.7);glow.scale.setScalar(12);
  glow.visible=false;glow.renderOrder=1;effects.add(glow);
  parent.add(effects);
  const fx={effects,smoke,dust,fires,flame,glow,glowMaterial,
    // Thin grey smoke rising about 5 m, leaning back as she gathers speed (`drift`, metres a second).
    placeSmoke(seconds,drift=0){
      smoke.forEach((puff,index)=>{
        const age=(seconds*.35+index/BESS_PUFFS)%1,lean=Math.min(drift,30);
        puff.position.set(BESS_STACK.x+Math.sin(seconds*.9+index*2.4)*.45*age,BESS_STACK.y+age*(5-lean*.04),
          BESS_STACK.z+Math.cos(seconds*.8+index*1.7)*.35*age-lean*age*.28);
        puff.scale.setScalar(.6+age*2.75);
        puff.userData.fade=Math.min(1,age/.08)*Math.pow(1-age,1.2)*.6;
      });
    }};
  fx.placeSmoke(0);
  return fx;
}

// Tin Town's gate afire (EVERBURN-RUN-AT-TOWN; redrawn by Claude on 12 November after five thin flames on the beam
// read as candles). The fire takes the whole gate: one great flame up each post from the ground, three over the beam,
// and four along the fences, with sparks, a plume of twelve smoke puffs that rises 30 m and firelight on the ground.
// Each entry is where a flame stands across the gate (x), the height its foot is at (y), its width and its height.
// It is drawn only, and stays hidden until the furnace has burnt the gate.
const GATE_TONGUES=Object.freeze([
  {x:-5.1,y:0,w:5.2,h:10.5},{x:5.1,y:0,w:5.2,h:11},
  {x:-2.6,y:6.4,w:4.2,h:5.2},{x:0,y:6.8,w:3.8,h:4.4},{x:2.6,y:6.4,w:4.2,h:5.6},
  {x:-10.5,y:0,w:5.4,h:5.4},{x:10.5,y:0,w:5.4,h:5},{x:-15.5,y:0,w:4.6,h:3.8},{x:15.5,y:0,w:4.6,h:4.1},
]);
const GATE_PUFFS=12;
const GATE_PLUME_METRES=30;
function addGateFire(){
  const effects=new THREE.Group();effects.name='Tin Town gate fire and smoke';effects.visible=false;
  const flame=createFlameMaterial(),soot=createSmokeMaterial(0x302c28),card=new THREE.PlaneGeometry(1,1);
  const standing=new THREE.PlaneGeometry(1,1);standing.translate(0,.5,0);
  // The firelight pool on the ground, under everything else that is drawn here.
  const glowMaterial=createGroundGlowMaterial(),glow=new THREE.Mesh(card,glowMaterial);
  glow.name='Firelight on the ground at the gate';glow.rotation.x=-Math.PI/2;glow.position.set(0,.14,0);glow.scale.set(48,30,1);glow.renderOrder=1;effects.add(glow);
  const tongues=GATE_TONGUES.map((spot,index)=>{
    const tongue=new THREE.Mesh(standing,flame);tongue.name='Fire on the gate';
    tongue.position.set(spot.x,spot.y,0);tongue.scale.set(spot.w,spot.h,1);tongue.renderOrder=3;
    tongue.onBeforeRender=()=>{flame.uniforms.uSeed.value=index*.41;flame.uniformsNeedUpdate=true;};
    effects.add(tongue);return tongue;
  });
  const sparks=GATE_TONGUES.map(()=>{const points=createSparks(30);points.name='Sparks from the gate fire';effects.add(points);return points;});
  const smoke=[];
  for(let puff=0;puff<GATE_PUFFS;puff++){
    const cloud=new THREE.Mesh(card,soot);cloud.name='Gate smoke';cloud.userData.fade=0;cloud.renderOrder=2;
    cloud.onBeforeRender=()=>{soot.uniforms.uFade.value=cloud.userData.fade;soot.uniforms.uSeed.value=puff*.31;soot.uniformsNeedUpdate=true;};
    effects.add(cloud);smoke.push(cloud);
  }
  return {effects,tongues,smoke,sparks,glow,flame,glowMaterial,
    // The plume rises about 30 m and spreads; the flames flicker between 6 and 8 m; the sparks and the firelight follow the clock.
    animate(seconds){
      this.flame.uniforms.uTime.value=seconds;this.glowMaterial.uniforms.uTime.value=seconds;
      tongues.forEach((tongue,index)=>{tongue.scale.y=GATE_TONGUES[index].h*(.86+.2*Math.abs(Math.sin(seconds*4.7+index*2.1)));});
      sparks.forEach((points,index)=>points.userData.place(seconds+index*.37,{x:GATE_TONGUES[index].x,y:GATE_TONGUES[index].y+2,z:0},{x:0,z:index%2?1:-1}));
      smoke.forEach((puff,index)=>{
        const age=(seconds*.1+index/GATE_PUFFS)%1;
        puff.position.set(Math.sin(seconds*.3+index*2.2)*4*age,2.5+age*GATE_PLUME_METRES,Math.cos(seconds*.25+index*1.9)*2.4*age);
        puff.scale.setScalar(3.5+age*12);
        puff.userData.fade=Math.min(1,age/.06)*Math.pow(1-age,1.3)*.8;
      });
    }};
}

export function createScablandsScene(course,options={}){
  const loadAsset=options.loadAsset??(path=>new GLTFLoader().loadAsync(path));
  const followsOpenMarks=!Object.hasOwn(options,'openMarks');
  let openMarks=options.openMarks??getScablandsOpenMarks();
  const group=new THREE.Group();group.name='The Scablands';
  // Rings give the light enough ground samples to follow the slopes between rocks.
  const glassGrid = new THREE.RingGeometry(0, FURNACE_GLASS.glassRadius,
    FURNACE_GLASS.drawSegments, FURNACE_GLASS.drawRings);
  glassGrid.rotateX(-Math.PI / 2);
  const glassLocal = glassGrid.attributes.position.array.slice();
  // The glass stands this high on the furnace, above the ground the furnace stands on.
  const GLASS_ON_FURNACE_METRES = 9;
  // The light, the mist and the ash are drawn by src/world/ember-ways-look.js; the job's rules say where each is.
  const glassMaterial = createGlassPatchMaterial();
  const glassPatch = new THREE.Mesh(glassGrid, glassMaterial);
  glassPatch.name = "The furnace's glass on the ground";
  glassPatch.visible = false; glassPatch.renderOrder = 2;
  group.add(glassPatch);
  // The shaft from the furnace on its mesa down to the patch, and the flash of the glass itself.
  const glassBeam = createGlassBeam();
  glassBeam.group.visible = false;
  group.add(glassBeam.group);
  const glassSource = {x:0, y:0, z:0}, glassTarget = {x:0, y:0, z:0};
  const mist = new THREE.Group();
  mist.name = 'Cold mist in the river bed';
  group.add(mist);
  const mistMaterial = createMistMaterial();
  let mistPatches = null;
  const ashColumn = createAshFall();
  ashColumn.visible = false;
  group.add(ashColumn);
  const ashFloors = [];
  let yard=null;
  let retired=false;
  let townDraw=null,townLife=null,townFx=null;
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
    // TOWN-VIEW-LIFE: the town's people, carts and smoke near the car, drawn from the saved layout (drawing only).
    const [{createTownWalkers},{createTownFx}]=await Promise.all([import('../town/view/town-walkers.js'),import('../town/view/town-fx.js')]);
    if(retired)return;
    const lifeTown={seed:townLayout.seed,buildings:townLayout.buildings||[],homePlots:[],people:(townLayout.walkers||[]).map(walker=>({id:walker.id}))};
    townLife=createTownWalkers({town:lifeTown});townFx=createTownFx({town:lifeTown,buildings:root,fog:false});
    group.add(townLife.group,townFx.group);
  };
  void addTown();
  const furnaceVents=[],furnacePlates=[];
  let furnaceEffects=null, furnaceRig=null, furnaceModel=null, furnacePlace=null;
  // The furnace's surfaces are photos, which carry their own rust and soot; the code adds only the road dust.
  const furnaceWear=createScrapWear({paint:0});
  const furnaceTravel=createTravelMeter(),furnaceWheels=[];
  const gateFire=addGateFire();group.add(gateFire.effects);gateFire.animate(0);
  // Big Bess has her own rig, like the furnace's: the Everburn escort moves it, and it stands at her Boneyard place otherwise.
  let bessRig=null,bessPlace=null,bessEffects=null;
  // Cinders in the air between the furnace's chimney and Big Bess's tank (FIELD-BATTLE-ASH), drawn only while the
  // battle's furnace is throwing them. `clock` is the last drawn second, so that the furnace's last fire can be timed.
  const cinderArc=createCinderArc();cinderArc.visible=false;group.add(cinderArc);
  const arcFrom=new THREE.Vector3(),arcTo=new THREE.Vector3();
  let clock=0,diedAt=null,lastFire=0,lastSmoke=0;
  const bessWheels=[],bessTravel=createTravelMeter(),bessWear=createScrapWear({paint:0});
  // `restAt` ({x, z, heading}) is where a rig stands with no actor, when it is not at its place's own +18 m spot.
  const placeRig=(rig,actor,path,aim,onGround,rest,restAt=null)=>{
    if(!actor){
      if(restAt){rig.position.set(restAt.x,scablandsSurfaceHeightAt(restAt.x,restAt.z),restAt.z);rig.rotation.y=restAt.heading;return;}
      rig.position.set(rest.x+18,scablandsSurfaceHeightAt(rest.x,rest.z),rest.z);
      rig.rotation.y=(SCABLANDS_PLACES.indexOf(rest)%4)*Math.PI/2;return;
    }
    const at=actor.position,x=at?.x??rest.x,z=at?.z??rest.z;
    // Layered job movers carry their actual support height, including beneath a deck.
    const layered=onGround&&actor.hasFloorHeight&&Number.isFinite(at?.y);
    rig.position.set(x,layered?at.y:(onGround?scablandsSurfaceHeightAt(x,z):0)+(at?.y??0),z);
    rig.position.y+=group.userData.drawnFeet?.shiftFor(rig,clock,x,z,layered?at.y:undefined,onGround?undefined:rig.position.y)??0;
    rig.rotation.y=Number.isFinite(actor.heading)?actor.heading:headingToward(actor,path,aim,rig.rotation.y);
  };
  // The ground, the road and the edited chunks share one look, drawn in code over their plain colours (SCABLANDS-LAND).
  // Each region has its own ground, drawn from the same data the driving reads (src/world/scablands-ground-look.js).
  const riverField=createRiverField({halfWidth:SCABLANDS_LAYOUT.halfWidth,halfDepth:SCABLANDS_LAYOUT.halfDepth});
  const tunnels=featureFlags.enabled('wasteland-town')?course.groundTunnels:null;
  const groundPhotos=(options.groundPhotos??(typeof document!=='undefined'&&!!course.realismThings))?loadGroundPhotos():null;
  // Hill country's own surface (beds of rock, rills) is drawn where the land stands above its old ground.
  const hillField=createHillField({halfWidth:SCABLANDS_LAYOUT.halfWidth,halfDepth:SCABLANDS_LAYOUT.halfDepth,raised:(x,z)=>scablandsTerrainHeightAt(x,z)-scablandsTerrainHeightAt(x,z,NO_HILLS),
    spots:HILLS.map(hill=>({x:hill.x,z:hill.z,reach:(hill.radius+(hill.ramp??0))*1.3+40}))});
  const groundLook=createGroundLook({tunnels,regions:{areas:GROUND_AREAS,field:riverField.texture,box:riverField.box,burn:LAND.place('everburn'),hills:hillField},photos:groundPhotos});
  const groundMaterial=groundLook.apply(new THREE.MeshStandardMaterial({color:0x76624b,roughness:1}));
  const roadLook = createRoadLook({photo: groundPhotos?.road ?? null, gate: course.realismThings ? TIN_TOWN_GATE : null});
  const roadMaterial=roadLook.apply(new THREE.MeshStandardMaterial({color:0x6e5d47,roughness:1,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2}));
  const gorgeMaterial=groundLook.apply(new THREE.MeshStandardMaterial({color:0x76624b,roughness:1}),{riverHole:false});
  const editedMaterial=groundLook.apply(new THREE.MeshStandardMaterial({vertexColors:true,roughness:1}),{made:true});
  const ground=new THREE.Group();ground.name='Scablands ground chunks';group.add(ground);
  let tunnelLining=tunnels?.segments.length?createTunnelMesh(tunnels):null;
  if(tunnelLining)ground.add(tunnelLining);
  let tunnelRevision=course.groundTunnelsRevision;
  const syncTunnels=()=>{
    if(!featureFlags.enabled('wasteland-town')||tunnelRevision===course.groundTunnelsRevision)return;
    tunnelRevision=course.groundTunnelsRevision;
    const current=course.groundTunnels;
    groundLook.setTunnelMouths(current?.mouths??[]);
    if(current?.segments.length){
      if(tunnelLining)createTunnelMesh(current,tunnelLining);
      else {tunnelLining=createTunnelMesh(current);ground.add(tunnelLining);}
    }else if(tunnelLining){
      ground.remove(tunnelLining);
      tunnelLining.traverse(node=>{node.geometry?.dispose();node.material?.dispose();});
      tunnelLining=null;
    }
  };
  const realismEnabled=!!course.realismThings;
  let things=null,tracks=null;
  // The detailed ground is a window of 1,400 by 1,000 m that follows the player in whole cells and carries the shared physics
  // height; the coarse ground covers the whole land, with a hole where the window is (see the top of this file).
  const nearHole={value:new THREE.Vector4(0,0,0,0)};
  const coarseMaterial=withHole(groundLook.apply(new THREE.MeshStandardMaterial({color:0x76624b,roughness:1})),nearHole);
  const near=createNearGround({material:groundMaterial,heightAt:(x,z)=>plainHeightAt(x,z)});
  // The hole is a metre smaller each way than the window, so that the coarse ground (which stands a little lower) is never seen through a gap.
  const placeNearGround=(x,z)=>{
    if(!near.follow(x,z))return;
    nearHole.value.set(near.centreX,near.centreZ,NEAR_GROUND.cellsX*NEAR_GROUND.cellX/2-1,NEAR_GROUND.cellsZ*NEAR_GROUND.cellZ/2-1);
  };
  placeNearGround(0,0);ground.add(near.mesh);
  const far=makeCoarseGround(coarseMaterial);ground.add(far);
  let editedGround=createGroundView({group:ground,groundEdit:scablandsGroundEdit,material:editedMaterial});
  const digTexture=typeof document==='undefined'?null:new THREE.TextureLoader().load('/assets/textures/dig-dirt.png');
  if(digTexture)digTexture.colorSpace=THREE.SRGBColorSpace;
  const digFx=createDigFx({group,atlasTexture:digTexture,seed:course.seed});
  // The road net as flat ribbons laid on the ground (never changing a height a car touches), the dry river's gorge, and the Girder Bridge
  // and the Pipe over it. Each is built in pieces of about a kilometre when the player nears it (src/world/scablands-draw.js).
  const roads=createRoadsDraw({plainAt:plainHeightAt,material:roadMaterial});ground.add(roads.group);
  const gorge=createRiverDraw({plainAt:plainHeightAt,material:gorgeMaterial});ground.add(gorge.group);
  const crossings=createCrossings({plainAt:plainHeightAt,material:(crossing,mesh)=>{
    const material=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.82,metalness:.3}),wear=createScrapWear({paint:1,dust:0x6b5a44,dustTop:3});
    wear.uniforms.uScrapInverse.value.makeTranslation(mesh.position.x,mesh.position.y,mesh.position.z).invert();return wear.apply(material);
  }});group.add(crossings.group);
  // The Steps' marked way: a worn lane with a dashed line, cairns and painted posts, where the river's ledges are climbed (slice 2b).
  const stepsWay=createStepsWay({plainAt:plainHeightAt});ground.add(stepsWay.group);
  roads.update(0,0);gorge.update(0,0);crossings.update(0,0);stepsWay.update(0,0);
  // Tin Town's gate, across the road at the place the furnace's path names (src/world/tin-town-gate.js).
  const tinTownGate=createTinTownGate({ground:scablandsSurfaceHeightAt(TIN_TOWN_GATE.x,TIN_TOWN_GATE.z)});group.add(tinTownGate);
  const townDoor=new THREE.Mesh(new THREE.BoxGeometry(TIN_TOWN_GATE.opening,3,.5),
    createScrapWear({paint:1,dust:0x6b5a44,dustTop:3}).apply(
      new THREE.MeshStandardMaterial({color:0x66584b,roughness:1})));
  townDoor.name='Hot Delivery town gate door';
  townDoor.position.y=1.5;tinTownGate.add(townDoor);
  // The shacks, scaffolds, water tower and fence round the town's own model, drawn in code.
  const tinTownShacks=createTinTownShacks();group.add(tinTownShacks);
  // Smoke from three of the shacks' stovepipes, placed from the clock in animate.
  const chimneySmoke=createTinTownChimneySmoke(tinTownShacks.userData.chimneys);group.add(chimneySmoke.group);chimneySmoke.animate(0);
  // The fire stands on the gate's beam, with its three tongues along the beam.
  gateFire.effects.rotation.y=tinTownGate.userData.yaw;
  const mast=radioMast(group);
  // The Everburn's fire and its column of smoke, drawn in code and always burning (src/world/everburn-fire.js).
  const everburnPlace=LAND.place('everburn'),tinTownPlace=LAND.place('tin-town'),ironLinePlace=LAND.place('iron-line');
  // The braziers and their smoke are shown while the ember carry step is on.
  const braziers=createBraziers(3);group.add(braziers.group);let brazierKey='';
  // The salt riders' lean-to, drawn by src/world/salt-lean-to-look.js to the plan the job's solids use.
  const saltShelter = new THREE.Group(); saltShelter.name = 'The salt lean-to'; saltShelter.visible = false; group.add(saltShelter);
  let saltShelterBuilt = false;
  function buildSaltShelter() {
    if (saltShelterBuilt) return;
    saltShelterBuilt = true;
    const lean = new THREE.Mesh(saltLeanToShape({halfX:SALT_RIDERS.shelterHalfX, halfZ:SALT_RIDERS.shelterHalfZ,
      postWidth:SALT_RIDERS.shelterPostWidth, height:SALT_RIDERS.shelterHeight, roofWidth:SALT_RIDERS.shelterRoofWidth,
      roofDepth:SALT_RIDERS.shelterRoofDepth, roofSlope:SALT_RIDERS.shelterRoofSlope}), barricadeMaterial);
    lean.name = 'Lean-to, windbreak and horn'; lean.castShadow = true; lean.receiveShadow = true;
    saltShelter.add(lean);
  }
  const cinder=createCinderFigure();group.add(cinder);
  const gasLoadView=createGasLoadView();group.add(gasLoadView.group);
  const brandLamps=createBrandLamps({surface:()=>barricadeMaterial});group.add(brandLamps.group);
  const storyPeople = createStoryPeopleView(loadAsset);
  group.add(storyPeople.group);
  let night2;
  let peopleSeconds = 0;
  const brandAuntie=createBrandAuntie();group.add(brandAuntie.group);
  const carriedBrand=createCarriedBrand();group.add(carriedBrand.group);
  const brandAshView=createBrandAshView();group.add(brandAshView.group);
  let roadRidersView;
  const brandThief=createBrandThief();group.add(brandThief.group);
  const bellowsView=createBellowsView(course);group.add(bellowsView.group);
  let cinderRequested=false;
  function requestCinder(){
    if(cinderRequested)return;
    cinderRequested=true;
    cinder.userData.modelReady=Promise.resolve().then(()=>loadAsset('/assets/models/wasteland/crew/cinder.glb')).then(asset=>{
      if(retired||!asset?.scene)return;
      const model=asset.scene;
      let near=null;
      model.traverse(node=>{
        const detail=String(node.userData?.lod||node.name).toLowerCase();
        if(/(^|[-_ ])far($|[-_ ])/.test(detail))node.visible=false;
        if(/(^|[-_ ])near($|[-_ ])/.test(detail))near=node;
      });
      const visibleModel=near||model,box=new THREE.Box3().setFromObject(visibleModel),height=box.max.y-box.min.y;
      if(!Number.isFinite(height)||height<=0)return;
      model.scale.multiplyScalar(1.7/height);
      model.updateMatrixWorld(true);
      const feet=new THREE.Box3().setFromObject(visibleModel).min.y;
      model.position.y-=feet;
      model.name='Cinder crew model';
      for(const child of [...cinder.children])child.visible=false;
      cinder.add(model);
    }).catch(error=>{cinder.userData.loadError=String(error?.message||error);});
  }
  // Tin Town's forge and its crane (src/world/forge-look.js). The crane keeps its hook over a car that is near, lifts the pot off
  // the stopped car and tips the ember into the hearth; the fire that follows is as strong as the ember was.
  const forge=createForge({heightAt:scablandsSurfaceHeightAt});forge.group.visible=false;group.add(forge.group);
  forge.flame.name='Hot Delivery forge fire';forge.pot.name='Hot Delivery pot transfer';
  let forgeGiven=false;
  const barricadeMaterial=barricadeSurface();
  const barricades=[0,1].map(index=>{
    const rig=new THREE.Group();rig.name='Ash Men barricade';
    for(const burnt of [false,true]){
      const geometry=barricadeShape({length:BARRICADE_LENGTH,height:2,depth:1.4,seed:index+1,burnt});
      // The drawing's stakes extend beyond its box. Fit the standing drawing to the solid's depth.
      if(!burnt){geometry.computeBoundingBox();const box=geometry.boundingBox;
        geometry.translate(0,0,-(box.min.z+box.max.z)/2);geometry.scale(1,1,1.4/(box.max.z-box.min.z));}
      const mesh=new THREE.Mesh(geometry,barricadeMaterial);mesh.name=burnt?'Burnt barricade':'Standing barricade';rig.add(mesh);
    }
    group.add(rig);return rig;
  });
  const everburnFire=createEverburnFire();
  everburnFire.group.position.set(everburnPlace.x,scablandsSurfaceHeightAt(everburnPlace.x,everburnPlace.z),everburnPlace.z);group.add(everburnFire.group);everburnFire.animate(0);

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
      // One wear for the place, with the place's own ground point as its origin. Places do not move, so it is set once.
      const placeWear=createScrapWear({paint:1});
      placeWear.uniforms.uScrapInverse.value.makeTranslation(place.x,scablandsSurfaceHeightAt(place.x,place.z),place.z).invert();
      assets.forEach((asset,index)=>{
        const key=placeAssets[place.id][index];
        if(!asset?.scene)throw Error(`Scablands ${key} art has no scene.`);
        const source=vehiclePart[key]?findPart(asset.scene,vehiclePart[key]):asset.scene;
        if(!source)throw Error(`Scablands ${key} art is missing its ${place.id} model.`);
        // The people carry their own look, and the two trucks their own wear.
        const model=key==='folk'?cloneSkeleton(source):source.clone(true);
        if(key==='folk')brandAuntie.install(model);
        // The well's flame is drawn in code (src/world/everburn-fire.js); the model's own flame solids are not drawn.
        if(key==='everburn'){
          const solids=[];model.traverse(node=>{if(/flame/i.test(node.name))solids.push(node);});
          for(const node of solids)node.removeFromParent();
        }
        // The Boneyard's flat dirt slab is not drawn: laid flat over rising and falling ground it showed as hard-edged brown pieces
        // (SCABLANDS-LAND round 3), and the ground is drawn in code already.
        if(key==='boneyard'){
          const slabs=[];model.traverse(node=>{if(/^Boneyard ground/.test(plainName(node.name)))slabs.push(node);});
          for(const node of slabs)node.removeFromParent();
        }
        tintArt(model,place.id,key==='folk'||vehiclePart[key]?null:placeWear);
        if(key==='mall'){removeSandDrifts(model);mergeBySurface(model,'Dead Mall');}
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
          furnaceWheels.push(...wheelsOf(model,FURNACE_WHEEL));
          furnaceEffects.effects.add(furnaceEffects.dust=createDustTrail());
          return;
        }
        if(key==='bess'){
          // Her surfaces are photos; the code adds only the road dust.
          model.traverse(node=>{if(node.isMesh)for(const material of [].concat(node.material))bessWear.apply(material);});
          bessPlace=place;
          bessRig=new THREE.Group();bessRig.name='Big Bess moving rig';
          placeRig(bessRig,null,[],0,true,place,BESS_REST);
          bessRig.add(model);group.add(bessRig);
          bessEffects=addBessEffects(bessRig);
          bessWheels.push(...wheelsOf(model,BESS_WHEEL));
          return;
        }
        model.position.x=index?18:0;model.rotation.y=(SCABLANDS_PLACES.indexOf(place)%4)*Math.PI/2;
        full.add(model);
        if(key==='boneyard')arrangeWrecks(full,model,place,scablandsSurfaceHeightAt(place.x,place.z));
      });
      // The well is not alone on its disc: fire pots, barricades, a signpost, rocks and a mast cut from the kit the Ridge loads.
      if(place.id==='everburn'){
        const kit=await load('kit'),placeGround=scablandsSurfaceHeightAt(place.x,place.z);
        if(retired)return;
        if(kit?.scene){
          const props=createEverburnProps(kit.scene,{groundAt:(east,south)=>scablandsSurfaceHeightAt(place.x+east,place.z+south)-placeGround});
          tintArt(props,place.id,placeWear);mergeBySurface(props,'Everburn well props');full.add(props);
        }
      }
      // Past 280 m a place is a plain dark shape. The well's is a thin mast the height of its derrick; the fire and smoke stay drawn.
      const wellMast=place.id==='everburn';
      const distant=new THREE.Mesh(wellMast?new THREE.CylinderGeometry(.35,.6,EVERBURN_DERRICK_TOP,6):new THREE.BoxGeometry(32,12,24),
        new THREE.MeshStandardMaterial({color:wellMast?0x2b2622:0x4c4236,roughness:1}));
      distant.name=`${place.name} far silhouette`;distant.position.y=wellMast?EVERBURN_DERRICK_TOP/2:6;distant.castShadow=true;
      // Beyond the draw range a place is not drawn at all.
      lod.addLevel(full,0);lod.addLevel(distant,280);lod.addLevel(new THREE.Object3D(),DRAW_RANGE);
      lod.position.set(place.x,scablandsSurfaceHeightAt(place.x,place.z),place.z);
      // A place does not move: its matrices are worked out once, not every frame.
      lod.updateMatrixWorld(true);lod.traverse(node=>{node.matrixAutoUpdate=false;});group.add(lod);
    }));
    if(realismEnabled&&!retired){
      const {createRealismThingsView}=await import('./scablands-things-view.js');
      if(retired)return false;
      const {createScablandsTracks}=await import('./scablands-tracks.js');
      if(retired)return false;
      tracks=createScablandsTracks();
      if(tracks){tracks.update(here.x,here.z);groundLook.setTracks(tracks);}
      const {jobStarts}=course.realismThings;
      things=createRealismThingsView({enabled:true,seed:course.seed,jobStarts,
        halfWidth:SCABLANDS_LAYOUT.halfWidth,halfDepth:SCABLANDS_LAYOUT.halfDepth,heightAt:plainHeightAt,
        drawnHeightAt:(x,z)=>riverField.distanceAt(x,z)<80?gorge.heightAtDrawn(x,z):null,photos:groundPhotos,data:course.realismThings});
      group.add(things.group);things.update(here.x,here.z);
    }
    group.userData.assetStatus='ready';return true;
  })().catch(error=>{if(!retired){group.userData.assetStatus='failed';group.userData.loadErrors.push(String(error?.message||error));
    console.error('Scablands art did not load:',String(error?.message||error));}return false;});
  // Where the player is, as world x and z, read from the game's state without allocating anything (the frame of the course is
  // read the way Course.worldAt reads it). `locate` is false when the state has no position (the menu).
  const here={x:0,z:0};
  let nearTinTown=true,nearWell=true;
  const within=spot=>{const dx=here.x-spot.x,dz=here.z-spot.z;return dx*dx+dz*dz<=DRAW_RANGE*DRAW_RANGE;};
  // The tunnel's lining is lit by the player's headlights and by day at its open mouths (src/world/tunnel-look.js). Drawing only.
  const tunnelCar={x:0,y:0,z:0},tunnelForward={x:0,z:1};
  function lightTunnel(state){
    const {samples,step,length}=course,p=((state.s%length)+length)%length,sample=samples[Math.min(samples.length-1,Math.floor(p/step))];
    const heading=(sample?.heading??0)+(state.headingError??0);
    tunnelCar.x=here.x;tunnelCar.z=here.z;tunnelCar.y=scablandsActorFeet(state,scablandsSurfaceHeightAt(here.x,here.z))+.7;
    tunnelForward.x=Math.sin(heading);tunnelForward.z=Math.cos(heading);
    const mouths=(course.groundTunnels?.mouths??[]).map(mouth=>mouth.start)
      .sort((a,b)=>(a.x-here.x)**2+(a.z-here.z)**2-(b.x-here.x)**2-(b.z-here.z)**2);
    tunnelLining.userData.look.update({car:tunnelCar,forward:tunnelForward,mouths,headlights:state.onFoot?0:1});
  }
  function locate(state){
    if(state?.onFoot&&Number.isFinite(state.fighter?.x)&&Number.isFinite(state.fighter?.z)){here.x=state.fighter.x;here.z=state.fighter.z;return true;}
    if(!Number.isFinite(state?.s)||!Number.isFinite(state?.lateral))return false;
    const {samples,step,length}=course,p=((state.s%length)+length)%length,index=Math.min(samples.length-2,Math.floor(p/step));
    const a=samples[index],b=samples[index+1],t=(p-a.s)/step,heading=a.heading+(b.heading-a.heading)*t;
    here.x=a.x+(b.x-a.x)*t+Math.cos(heading)*state.lateral;here.z=a.z+(b.z-a.z)*t-Math.sin(heading)*state.lateral;
    return true;
  }
  registerSceneSystem(group,{
    animate(seconds){
      if(bessRig&&bessEffects){
        bessWear.follow(bessRig);
        // Her wheels turn by the distance she has gone, and the dust behind them thickens with her speed.
        spinWheels(bessWheels,bessTravel.update(bessRig,seconds)/BESS_WHEEL.radius);
        bessEffects.placeSmoke(seconds,bessTravel.speed);
        bessEffects.dust.userData.place(seconds,bessTravel.speed,BESS_DUST);
        bessEffects.flame.uniforms.uTime.value=seconds;bessEffects.glowMaterial.uniforms.uTime.value=seconds;
        bessEffects.fires.forEach((fire,index)=>{fire.scale.y=fire.userData.tall*(.8+.3*Math.abs(Math.sin(seconds*4.7+index*2.3)));});
      }
      clock=seconds;
      glassMaterial.uniforms.uTime.value=seconds;mistMaterial.uniforms.uTime.value=seconds;
      if(ashColumn.visible)ashColumn.userData.update(seconds);
      if(forge.group.visible)forge.animate(seconds);
      if(cinderArc.visible&&furnaceRig&&furnaceEffects&&bessRig){
        furnaceRig.updateWorldMatrix(true,false);bessRig.updateWorldMatrix(true,false);group.updateWorldMatrix(true,false);
        group.worldToLocal(furnaceRig.localToWorld(arcFrom.set(furnaceEffects.chimneyX,furnaceEffects.chimneyY,furnaceEffects.chimneyZ)));
        group.worldToLocal(bessRig.localToWorld(arcTo.set(BESS_TANK_TOP.x,BESS_TANK_TOP.y,BESS_TANK_TOP.z)));
        cinderArc.userData.place(seconds,arcFrom,arcTo);
      }
      // What stands in a place is worked out only while the player is near it (see `sync`).
      if(nearTinTown){gateFire.animate(seconds);chimneySmoke.animate(seconds);}
      if(nearWell)everburnFire.animate(seconds);
      braziers.animate(seconds);
      brandLamps.animate(seconds);carriedBrand.animate(seconds);
      if(!furnaceEffects||!furnaceRig)return;
      furnaceWear.follow(furnaceRig);
      // How fast the furnace is moving, from where it stood at the last frame; this only leans the smoke and turns the wheels.
      spinWheels(furnaceWheels,furnaceTravel.update(furnaceRig,seconds)/FURNACE_WHEEL.radius);
      const furnaceDrift=furnaceTravel.speed;
      furnaceEffects.dust.userData.place(seconds,furnaceDrift,FURNACE_DUST);
      furnaceEffects.placeSmoke(seconds,furnaceDrift);
      furnaceEffects.flame.uniforms.uTime.value=seconds;furnaceEffects.glowMaterial.uniforms.uTime.value=seconds;
      furnaceEffects.flames.forEach((flame,index)=>{flame.scale.y=3.8*(.85+.25*Math.abs(Math.sin(seconds*5.3+index*1.9)));});
      // The last fire sinks as it burns out.
      furnaceEffects.lastFire.forEach((flame,index)=>{flame.scale.y=Math.max(.01,flame.userData.tall*lastFire*(.8+.3*Math.abs(Math.sin(seconds*5.9+index*2.7))));});
      const door=FURNACE_DOORS[furnaceEffects.glowingDoor];
      furnaceEffects.sparks.visible=furnaceEffects.glow.visible=Boolean(door);
      if(door){
        furnaceEffects.sparks.userData.place(seconds,door,door.out,door.out.z?0:furnaceDrift*.25);
        furnaceEffects.glow.position.set(door.x+door.out.x*3.2,.14,door.z+door.out.z*3.2);
      }
    },
    sync(state, dt = 0, presentationDt = dt){
      syncTunnels();
      if(tunnelLining?.userData.look&&locate(state))lightTunnel(state);
      // The detailed ground follows the player, and what stands in a place is drawn and updated only while the player is near it.
      if(things)things.setFallen(course.fallenFenceIds);
      if(locate(state)){
        placeNearGround(here.x,here.z);things?.update(here.x,here.z);tracks?.update(here.x,here.z);
        nearTinTown=within(tinTownPlace);nearWell=within(everburnPlace);
        tinTownGate.visible=tinTownShacks.visible=chimneySmoke.group.visible=forge.group.visible=nearTinTown;
        forge.watch(here.x,here.z);
        everburnFire.group.visible=nearWell;mast.visible=within(ironLinePlace);
        roads.update(here.x,here.z);gorge.update(here.x,here.z);crossings.update(here.x,here.z);stepsWay.update(here.x,here.z);
        group.userData.drawnFeet?.refresh();
        townLife?.update({dt:presentationDt,focus:here,distance:60,car:here});townFx?.update({dt:presentationDt,focus:here,distance:60});
      }
      const worldJob=state?.arena?.mode==='world-job'?state.arena.worldJob:null;
      brandLamps.update(worldJob);
      brandAuntie.update(worldJob);
      // The town's windows light when the third lamp is lit (Light the Town's ending), and are dark in every other job.
      {const townJob=worldJob?.job,townStep=townJob?.steps?.[townJob.stepIndex];
        tinTownShacks.userData.lightWindows(townStep?.brand&&townJob.stepState?.townEnding?townJob.stepState.endingElapsed??0:null);}
      const drawnShift=(x,z,support,airborneFeet,object)=>object?
        group.userData.drawnFeet.shiftFor(object,clock,x,z,support,airborneFeet):group.userData.drawnFeet.shift(x,z,support,airborneFeet);
      carriedBrand.update(state,drawnShift);
      if (worldJob?.storyPeople) peopleSeconds += Math.max(0, presentationDt);
      storyPeople.update(worldJob, worldJob?.night2?.camera?.target ?? here, peopleSeconds, drawnShift);
      if (worldJob?.night2 && !night2) {
        night2 = createNight2Look(course);
        group.add(night2.group);
      }
      night2?.update(worldJob, peopleSeconds, drawnShift, state?.opponents ?? []);
      brandAshView.update(worldJob,drawnShift);
      if (worldJob?.riderFight && !roadRidersView) {
        roadRidersView = createBrandAshView({road:true});
        group.add(roadRidersView.group);
      }
      roadRidersView?.update(worldJob,drawnShift);
      brandThief.update(worldJob,drawnShift);
      bellowsView.update(state,drawnShift);
      const glass = hotDeliveryGlass(worldJob);
      glassPatch.visible = !!glass;
      if (glass) {
        const vertices = glassGrid.attributes.position;
        for (let index = 0; index < vertices.count; index++) {
          const x = glass.x + glassLocal[index * 3], z = glass.z + glassLocal[index * 3 + 2];
          vertices.setXYZ(index, x, group.userData.drawnGroundHeightAt(x, z) + FURNACE_GLASS.drawLift, z);
        }
        vertices.needsUpdate = true;
        glassGrid.computeBoundingSphere();
        // The glass is on the furnace, which stands where the job's sighting puts it.
        const furnaceAt = furnaceSighting(worldJob);
        glassBeam.group.visible = Boolean(furnaceAt && !furnaceAt.hidden);
        if (glassBeam.group.visible) {
          glassSource.x = furnaceAt.x; glassSource.z = furnaceAt.z;
          glassSource.y = scablandsSurfaceHeightAt(furnaceAt.x, furnaceAt.z) + GLASS_ON_FURNACE_METRES;
          glassTarget.x = glass.x; glassTarget.z = glass.z;
          glassTarget.y = group.userData.drawnGroundHeightAt(glass.x, glass.z) + FURNACE_GLASS.drawLift;
          glassBeam.place(glassSource, glassTarget, glass.radius ?? FURNACE_GLASS.glassRadius, clock);
        }
      } else glassBeam.group.visible = false;
      const gasStep = worldJob?.job?.steps?.[worldJob.job.stepIndex];
      const storyEmbers = worldJob?.night2?.ledger.stocks.embers;
      forge.gas(storyEmbers !== undefined ? Math.min(1, storyEmbers / 4) :
        gasStep?.gasLoad ? GAS_LOAD_RULE.forgeBeforeGasShare +
          (1 - GAS_LOAD_RULE.forgeBeforeGasShare) * (worldJob.forgeGasShare ?? 0) : null);
      const delivered=worldJob?.definition?.id==='everburn-hot-delivery'?worldJob.forgeFire:null;
      if(delivered&&!forgeGiven){
        forgeGiven=true;
        // The pot's place: where the car's own pot stood at the last frame (src/render3d.js notes it), or the back of the car. A noted
        // place that is not at the car (left from an earlier frame or job) is not believed.
        const heading=course.at(state.s).heading+(state.headingError??0),noted=group.userData.emberPotAt;
        const seen=noted&&Math.hypot(noted.x-here.x,noted.z-here.z)<4?noted:null;
        forge.deliver(seen??{x:here.x-Math.sin(heading)*2,y:scablandsSurfaceHeightAt(here.x,here.z)+.85,z:here.z-Math.cos(heading)*2},
          delivered.grade,delivered.ember/(worldJob.job?.steps?.[0]?.ember?.start??100),clock);
      }
      if(!delivered&&forgeGiven){forgeGiven=false;forge.reset();}
      // The crane and the fire keep the job's own count of its hold, so a pause stops them with the game and the cue lands with the ember.
      if(forgeGiven)forge.hold(worldJob.arrivalHold?.elapsed??null,state.paused===true);
      if(worldJob?.definition?.yard){
        if(!yard){
          yard=createYard({heightAt:(x,z)=>scablandsSurfaceHeightAt(LAND.yard.x+x,LAND.yard.z+z)});
          yard.position.set(LAND.yard.x,0,LAND.yard.z);
        }
        if(!yard.parent)group.add(yard);
      }else if(yard?.parent)group.remove(yard);
      const stepNow=worldJob?.job?.steps?.[worldJob.job.stepIndex];
      // The furnace follows its actor in Old Smoke's chase and in the battle on the Boneyard road (FIELD-BATTLE-ASH), where it stays
      // where it stopped or turned away when the job is over.
      const chasing=worldJob?.definition?.storyId==='everburn'&&(stepNow?.kind==='chase'||worldJob.definition.battle===true);
      const actor=chasing?worldJob.actors?.find(item=>item.id==='old-smoke-furnace'):null;
      // After the battle is won, a Boneyard run shows the dead furnace as a wreck at the place the run's definition names.
      const wreck=!actor&&worldJob?.definition?.run===true?worldJob.definition.wreck??null:null;
      if(furnaceRig&&furnaceModel&&furnacePlace){
        // In jobs 1, 3 and 4 the furnace is seen before it is fought: drawn where the job's own state and clock put it
        // (src/world/jobs/furnace-sightings.js), with no actor behind it. Otherwise it stands in the Everburn or follows the chase.
        const sighting=actor?null:furnaceSighting(worldJob);
        if(sighting&&!sighting.hidden){
          furnaceRig.position.set(sighting.x,scablandsSurfaceHeightAt(sighting.x,sighting.z),sighting.z);
          furnaceRig.rotation.y=sighting.heading;
        }else if(wreck){
          furnaceRig.position.set(wreck.x,scablandsSurfaceHeightAt(wreck.x,wreck.z),wreck.z);
          furnaceRig.rotation.y=wreck.heading;
        }else placeRig(furnaceRig,actor,worldJob?.job?.steps?.[worldJob.job.stepIndex]?.path||[],1,false,furnacePlace);
        furnaceRig.visible=!sighting?.hidden;
        furnaceModel.position.x=0;
      }
      // Big Bess follows her escort actor in the Everburn story and stands in the Boneyard otherwise.
      if(bessRig&&bessPlace){
        const escort=worldJob?.definition?.storyId==='everburn'?worldJob.actors?.find(item=>item.id==='big-bess'):null;
        placeRig(bessRig,escort,worldJob?.job?.steps?.[worldJob.job.stepIndex]?.path||[],0,true,bessPlace,BESS_REST);
        bessWear.follow(bessRig);
      }
      // Place each brazier at the carry step's named position.
      const emberStep=stepNow?.ember?stepNow:null;
      saltShelter.visible = Boolean(emberStep?.saltPost);
      if (saltShelter.visible) {
        buildSaltShelter();
        const point = emberStep.saltPost.position;
        saltShelter.position.set(point.x, scablandsSurfaceHeightAt(point.x, point.z), point.z);
      }
      const ash = emberStep?.bridgeAsh && !worldJob.job.done ?
        bridgeAshFall(worldJob.job.stepState?.bridgeAsh, emberStep.bridgeAsh) : null;
      ashColumn.visible = Boolean(ash);
      if (ash) {
        const count = scablandsFloorsAt(ash.x, ash.z, ashFloors);
        const bottom = ashFloors[count - 1];
        const height = count > 1 ? ashFloors[0] - bottom : BRIDGE_ASH.drawHeight;
        ashColumn.position.set(ash.x, bottom + height / 2, ash.z);
        ashColumn.rotation.y = Math.atan2(ash.tx, ash.tz);
        ashColumn.scale.set(ash.halfWidth * 2, height, ash.halfLength * 2);
      }
      mist.visible = Boolean(emberStep && !worldJob.job.done);
      if (mist.visible && mistPatches !== emberStep.bedMist) {
        for (const sheet of [...mist.children]) { sheet.geometry.dispose(); mist.remove(sheet); }
        mistPatches = emberStep.bedMist;
        for (const patch of mistPatches ?? []) {
          const geometry = createMistGeometry(bedMistCorners(patch), group.userData.drawnGroundHeightAt, BED_MIST.drawLift);
          const sheet = new THREE.Mesh(geometry, mistMaterial);
          sheet.name = patch.id; sheet.renderOrder = 2;
          mist.add(sheet);
        }
      }
      townDoor.visible=Boolean(worldJob?.night2)||worldJob?.definition?.id==='everburn-hot-delivery';
      const doorPose=tinTownDoorPose(TIN_TOWN_GATE,worldJob?.tinTownGateProgress??0);
      townDoor.rotation.y=doorPose.angle;
      townDoor.position.set(doorPose.localX,1.5,doorPose.localZ);
      braziers.group.visible=Boolean(emberStep);
      braziers.setYardPotLoaded(Boolean(emberStep?.pickup&&worldJob?.job?.stepState?.loaded));
      gasLoadView.update(worldJob,group.userData.drawnGroundHeightAt);
      barricades.forEach((rig,index)=>{
        const barrier=(stepNow?.gasLoad?stepNow:emberStep)?.barriers?.[index],burnt=worldJob?.job?.stepState?.burntBarricades?.includes(barrier?.id);
        rig.visible=Boolean(barrier);rig.children[0].visible=!burnt;rig.children[1].visible=Boolean(burnt);
        if(barrier){const at=barrier.position;rig.position.set(at.x,at.y,at.z);rig.rotation.y=barrier.heading+Math.PI;}
      });
      cinder.visible=worldJob?.definition?.id==='everburn-hot-delivery'&&Boolean(emberStep?.pickup);
      if(cinder.visible){
        const at=(emberStep.pickup.figure??emberStep.pickup.place).position;
        cinder.position.set(at.x,scablandsSurfaceHeightAt(at.x,at.z),at.z);
        cinder.position.y+=group.userData.drawnFeet.shiftFor(cinder,clock,at.x,at.z);
        const start=emberStep.carStart;
        if(start)cinder.rotation.y=Math.atan2(start.x-at.x,start.z-at.z);
        requestCinder();
        if(worldJob.job?.stepState?.loaded&&Math.hypot(here.x-at.x,here.z-at.z)>=60)cinder.visible=false;
      }
      if(emberStep){
        const spots=brazierSpotsFor(emberStep),key=JSON.stringify(spots);
        if(key!==brazierKey){
          brazierKey=key;
          braziers.place(spots.map(offset=>({x:offset.x,y:scablandsSurfaceHeightAt(offset.x,offset.z),z:offset.z})));
        }
      }
      // Tin Town's gate burns once the furnace has set it alight, and stays alight until the job ends.
      const gateStep=worldJob?.definition?.storyId==='everburn'?worldJob.job?.steps?.find(step=>Number.isInteger(step.actor?.gateWaypoint)):null;
      const gateAt=gateStep?.path?.[gateStep.actor.gateWaypoint],gateSpot=gateAt?.position??gateAt;
      const burning=Boolean(gateSpot)&&(worldJob?.gateBurnt===true||actor?.furnace?.gateBurnt===true);
      gateFire.effects.visible=burning&&nearTinTown;
      // The fire stands on the gate itself, from the ground up, wherever the job's path stops in front of it.
      if(burning)gateFire.effects.position.set(tinTownGate.position.x,scablandsSurfaceHeightAt(tinTownGate.position.x,tinTownGate.position.z),tinTownGate.position.z);
      const furnace=actor?.furnace??(wreck?WRECKED_FURNACE:null);
      // A door is gone (its two shields off, its door scorched) once it has been broken. The battle's furnace comes out already
      // hurt: its definition names the doors drawn that way from the start (drawing only; the rules do not read it), also while it
      // still stands by the well waiting to come out.
      const hurtDoors=furnace?.battle?.hurtAtStart??stepNow?.furnaceActor?.battle?.hurtAtStart??[];
      const doorGone=index=>index<(furnace?.hits??0)||hurtDoors.includes(FURNACE_DOOR_ORDER[index]);
      furnacePlates.forEach((plate,index)=>{plate.visible=index>>1>2||!doorGone(index>>1);});
      // A broken door stays scorched: the left door after the first hit, the right after the second, the rear after the third.
      FURNACE_DOOR_ORDER.forEach((door,index)=>{const spot=FURNACE_DOORS[door],broken=doorGone(index);
        furnaceWear.uniforms.uScrapSoot.value[index].set(spot.x,broken?spot.y+.3:-99,spot.z,broken?2.7:.01);});
      // A dead furnace's door fire is out. The battle's furnace dies with a last fire from its chimney and heavy smoke
      // for a few seconds; after that, and on the wreck of later runs, only thin smoke rises.
      const furnaceDeadNow=furnace?.dead===true||furnace?.phase==='dead';
      if(furnaceDeadNow&&actor){if(diedAt===null)diedAt=clock;}else diedAt=null;
      const sinceDeath=diedAt===null?Infinity:Math.max(0,clock-diedAt);
      lastFire=Math.max(0,1-sinceDeath/LAST_FIRE_SEC);lastSmoke=Math.max(0,1-sinceDeath/LAST_SMOKE_SEC);
      if(furnaceEffects){
        furnaceEffects.density=furnaceDeadNow?THIN_SMOKE+(LAST_SMOKE-THIN_SMOKE)*lastSmoke:1;
        for(const flame of furnaceEffects.lastFire)flame.visible=lastFire>0;
      }
      // Cinders fly and Big Bess burns for as long as the battle's furnace is throwing them on her.
      const cindersOn=Boolean(actor&&furnace?.burning===true&&!furnaceDeadNow&&bessRig&&furnaceRig?.visible);
      cinderArc.visible=cindersOn;
      if(bessEffects){for(const fire of bessEffects.fires)fire.visible=cindersOn;bessEffects.glow.visible=cindersOn;}
      const sootMaterial=furnaceEffects?.smoke[0]?.material;
      if(sootMaterial){
        // The smoke is grey, turns orange through the 4-second stoke, and is blacker after each hit.
        sootMaterial.color.copy(SOOT_GREY).lerp(SOOT_BLACK,FURNACE_DOOR_ORDER.filter((_,index)=>doorGone(index)).length/OLD_SMOKE.hitsToWin);
        if(furnace?.phase==='stoke')sootMaterial.color.lerp(SOOT_ORANGE,Math.min(1,furnace.phaseSec/(furnace.battle?.stokeSec??OLD_SMOKE.stokeSec)));
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
    if(yard){
      if(!yard.parent)group.add(yard);
      yard.traverse(node=>{for(const material of [].concat(node.material||[]))material.map?.dispose();});
    }
    storyPeople.dispose(); night2?.dispose(); townLife?.dispose(); townFx?.dispose();
    barricadeMaterial.map?.dispose();gasLoadView.dispose();forge.dispose();brandLamps.dispose();brandAuntie.dispose();carriedBrand.dispose();brandAshView.dispose();roadRidersView?.dispose();brandThief.dispose();bellowsView.dispose();
    stopOpenMarkWatch();
    things?.dispose();tracks?.dispose();editedGround.dispose();digFx.dispose();digTexture?.dispose();whites?.dispose();tinTownGate.userData.dispose();tinTownShacks.userData.dispose();riverField.texture.dispose();groundPhotos?.dispose();
    const geometries=new Set(),materials=new Set();
    group.traverse(node=>{if(node.geometry)geometries.add(node.geometry);for(const material of [].concat(node.material||[]))materials.add(material);});
    for(const geometry of geometries)geometry.dispose();
    for(const material of materials)material.dispose();
    group.clear();group.userData.assetStatus='retired';townDraw=null;
  }
  registerSceneSystem(group,{dispose});
  group.userData.assetStatus='loading';group.userData.loadErrors=[];group.userData.solids=SCABLANDS_SOLIDS;
  // The road net, the gorge and the crossings are drawn in pieces built as the player nears them; a check or a picture can build them all.
  group.userData.roads=roads;group.userData.gorge=gorge;group.userData.crossings=crossings;group.userData.stepsWay=stepsWay;
  group.userData.drawnFeet=createScablandsDrawnFeet({near,gorge,riverField,course});
  group.userData.drawnGroundHeightAt=(x,z)=>
    (riverField.distanceAt(x,z)<80?gorge.heightAtDrawn(x,z):null) ?? nearGroundHeightAt(x,z,plainHeightAt);
  // Where the furnace and Big Bess stand as drawn this frame, for the camera: [{id, x, y, z, heading, halfX, minZ, maxZ, height}].
  group.userData.bigMachineBoxes=()=>{
    const boxes=[];
    for(const [id,rig] of [['old-smoke-furnace',furnaceRig],['big-bess',bessRig]])
      if(rig?.visible)boxes.push({id,x:rig.position.x,y:rig.position.y,z:rig.position.z,heading:rig.rotation.y,...BIG_MACHINE_BOXES[id]});
    return boxes;
  };
  // Call after a work order commits its edits. The same height layer drives
  // physics; only changed chunk meshes are replaced, then the horizon is rebuilt.
  group.userData.updateGroundView=()=>{
    const changed=editedGround.update();
    if(changed){const geometry=makeCoarseGround(coarseMaterial,scablandsGroundEdit).geometry;const old=far.geometry;far.geometry=geometry;old.dispose();
      roads.refresh();gorge.refresh();}
    return changed;
  };
  const refreshOpenMarks=marks=>{
    if(retired||!followsOpenMarks)return;
    openMarks=marks;
    // The detailed window and the coarse ground are worked out again; the road and the edited chunks follow.
    near.refresh();
    const coarse=makeCoarseGround(coarseMaterial,scablandsGroundEdit).geometry,coarseBefore=far.geometry;far.geometry=coarse;coarseBefore.dispose();
    editedGround.dispose();
    editedGround=createGroundView({group:ground,groundEdit:scablandsGroundEdit,material:editedMaterial});
    editedGround.update();
    roads.refresh();gorge.refresh();
    whites?.dispose();
    if(whites?.group.parent)whites.group.parent.remove(whites.group);
    whites=createTheWhitesScene({openMarks,loadAsset});
    if(whites)group.add(whites.group);
  };
  const stopOpenMarkWatch=followsOpenMarks?onScablandsOpenMarksChanged(refreshOpenMarks):()=>{};
  group.userData.digFx=digFx;
  return {group,ready,solids:SCABLANDS_SOLIDS,dispose};
}
