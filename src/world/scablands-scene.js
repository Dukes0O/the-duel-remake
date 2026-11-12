import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {SCABLANDS_LAYOUT, SCABLANDS_PLACES} from './scablands.js';
import {scablandsSurfaceHeightAt, scablandsGroundEdit, getScablandsOpenMarks, getScablandsTownLayout,
  onScablandsOpenMarksChanged} from './scablands-ground.js';
import {createGroundView} from './ground-view.js';
import {createDigFx} from './dig-fx.js';
import {registerSceneSystem} from '../scene-systems.js';
import {OLD_SMOKE,furnaceGlowingDoor} from './jobs/old-smoke.js';
import {furnaceSighting} from './jobs/furnace-sightings.js';
import {createTheWhitesScene} from './the-whites-scene.js';
import {createScrapWear,createGroundLook,createFlameMaterial,createSmokeMaterial,createGroundGlowMaterial,createSparks,createGroundShade,createDustTrail} from './scrap-look.js';
import {createTinTownGate,TIN_TOWN_GATE} from './tin-town-gate.js';

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
  'tin-town':['tintown','folk'],'boneyard':['boneyard','bess'],'dead-mall':['mall'],'everburn':['everburn','furnace'],
  'iron-line':[],'dry-dam':[],'ships-in-sand':[],'ridge':['kit'],
};
const vehiclePart={bess:'Big Bess gas truck',furnace:"Old Smoke's rolling furnace"};
// The far ground's cells are 140 by 125 m, so that the edge of the near tiles (x = 700, z = 500) falls on a line between
// cells and no far cell lies half under the near ground.
const detailCounts=Object.freeze({near:30,far:Object.freeze({x:20,z:16})});
// The model loader renames every part: a space becomes an underscore and a full stop is dropped
// ("Furnace side armor.001" arrives as "Furnace_side_armor001"). Part names are compared in this plain form.
const plainName=name=>String(name??'').replace(/_/g,' ');
function findPart(root,name){
  let found=null;root.traverse(node=>{if(!found&&plainName(node.name)===name)found=node;});
  return found;
}

// The far ground is a coarse copy of the same land. Where the four near tiles cover it (SCABLANDS_LAYOUT.halfWidth by
// halfDepth) its corners drop by FAR_GROUND_DROP, and further wherever its straight slopes would still show through the
// near ground as drawn (at the foot of the ridges the land climbs faster than a far cell can follow); elsewhere it is
// unchanged. The far mesh itself stands .12 m below its own heights.
const FAR_GROUND_DROP=40,FAR_GROUND_LOWER=.12,FAR_GROUND_CLEARANCE=.3;
function lowerFarUnderNear(heights,cellsX,cellsZ,width,depth,underNear){
  const across=cellsX+1,stepsX=6,stepsZ=15,cells=[];
  // Where the near ground bends is along its own grid lines (23.3 m by 16.7 m), which a far cell (140 m by 125 m) holds
  // 6 and 7.5 of, so the samples are taken at those lines: the far ground can only come through at a place where
  // the near ground bends. The near heights are worked out once; the passes below only reread the far corners.
  for(let iz=0;iz<cellsZ;iz++)for(let ix=0;ix<cellsX;ix++){
    const a=iz*across+ix,b=a+1,c=a+across,d=c+1;
    if(!(underNear[a]&&underNear[b]&&underNear[c]&&underNear[d]))continue;
    const samples=[];
    for(let sz=0;sz<=stepsZ;sz++)for(let sx=0;sx<=stepsX;sx++){
      const u=sx/stepsX,v=sz/stepsZ;
      samples.push([u,v,nearGroundHeightAt(-width/2+width*(ix+u)/cellsX,-depth/2+depth*(iz+v)/cellsZ)-FAR_GROUND_CLEARANCE+FAR_GROUND_LOWER]);
    }
    cells.push({a,b,c,d,samples});
  }
  for(let pass=0;pass<20;pass++){
    let lowered=false;
    for(const {a,b,c,d,samples} of cells){
      let worst=0;
      for(const [u,v,limit] of samples){
        // The cell's two triangles meet along the line from its (1, 0) corner to its (0, 1) corner.
        const far=u+v<=1?heights[a]+(heights[b]-heights[a])*u+(heights[c]-heights[a])*v:heights[d]+(heights[c]-heights[d])*(1-u)+(heights[b]-heights[d])*(1-v);
        worst=Math.max(worst,far-limit);
      }
      if(worst>0){for(const corner of [a,b,c,d])heights[corner]-=worst+.05;lowered=true;}
    }
    if(!lowered)break;
  }
}
function makeGround(width,depth,segments,material,detail,offsetX=0,offsetZ=0,groundEdit=scablandsGroundEdit){
  const positions=[],uv=[],indices=[];
  const cellsX=segments.x??segments,cellsZ=segments.z??segments,heights=[],underNear=[];
  for(let iz=0;iz<=cellsZ;iz++)for(let ix=0;ix<=cellsX;ix++){
    const x=-width/2+width*ix/cellsX,z=-depth/2+depth*iz/cellsZ;
    const covered=!detail&&Math.abs(x+offsetX)<=SCABLANDS_LAYOUT.halfWidth&&Math.abs(z+offsetZ)<=SCABLANDS_LAYOUT.halfDepth;
    heights.push(scablandsSurfaceHeightAt(x+offsetX,z+offsetZ,groundEdit)+.025-(covered?FAR_GROUND_DROP:0));underNear.push(covered);
  }
  if(!detail)lowerFarUnderNear(heights,cellsX,cellsZ,width,depth,underNear);
  for(let iz=0;iz<=cellsZ;iz++)for(let ix=0;ix<=cellsX;ix++){
    const x=-width/2+width*ix/cellsX,z=-depth/2+depth*iz/cellsZ;
    positions.push(x,heights[iz*(cellsX+1)+ix],z);uv.push(ix/cellsX*12,iz/cellsZ*12);
    if(ix<cellsX&&iz<cellsZ){const a=iz*(cellsX+1)+ix,b=a+1,c=a+cellsX+1,d=c+1;indices.push(a,c,b,b,c,d);}
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.setIndex(indices);geometry.computeVertexNormals();
  const mesh=new THREE.Mesh(geometry,material);mesh.name=detail?'Scablands near ground':'Scablands far ground';mesh.receiveShadow=true;
  return mesh;
}

// The near ground as drawn: four tiles of 30 by 30 cells, each corner at the land's height. A cell is 23 by 17 m, so
// between its corners the drawn ground is a straight slope, and where the land bends sharply (the foot of the north and
// south ridges) it differs from the land's own height by several metres. This is the drawn height at (x, z), worked
// out the way the tiles' triangles are cut (see makeGround), so that a thing laid on the ground can lie on what is seen.
function nearGroundHeightAt(x,z){
  const tileWidth=700,tileDepth=500,cells=detailCounts.near;
  if(Math.abs(x)>=tileWidth||Math.abs(z)>=tileDepth)return scablandsSurfaceHeightAt(x,z)+.025;
  const originX=Math.floor(x/tileWidth)*tileWidth,originZ=Math.floor(z/tileDepth)*tileDepth,cellX=tileWidth/cells,cellZ=tileDepth/cells;
  const fx=(x-originX)/cellX,fz=(z-originZ)/cellZ,ix=Math.min(cells-1,Math.floor(fx)),iz=Math.min(cells-1,Math.floor(fz)),u=fx-ix,v=fz-iz;
  const corner=(i,j)=>scablandsSurfaceHeightAt(originX+(ix+i)*cellX,originZ+(iz+j)*cellZ)+.025;
  // Each cell is two triangles meeting along the line from its (1, 0) corner to its (0, 1) corner.
  if(u+v<=1){const a=corner(0,0);return a+(corner(1,0)-a)*u+(corner(0,1)-a)*v;}
  const d=corner(1,1);return d+(corner(0,1)-d)*(1-u)+(corner(1,0)-d)*(1-v);
}

// Where the ground drops away steeply the ribbon takes the lowest drawn ground within 1.5 m of a point, so that its edge
// is tucked into the slope there and never stands out from it.
function roadHeightAt(x,z){
  let low=nearGroundHeightAt(x,z);
  for(const [dx,dz] of [[1.5,0],[-1.5,0],[0,1.5],[0,-1.5]])low=Math.min(low,nearGroundHeightAt(x+dx,z+dz));
  return low-.025+ROAD_LIFT;
}

// The dirt road: a ribbon laid flat along the oval the drivers follow, 1.2 times the road's half width to each side,
// built from cross-sections of twenty points that each lie 6 cm above the ground at their own place. Two ruts run
// along it as slightly darker strips (vertex colour), and the ground look is drawn over the whole.
const ROAD_SECTIONS=384,ROAD_LIFT=.06,ROAD_REACH=1.2;
const ROAD_ACROSS=Object.freeze([-1,-.94,-.88,-.76,-.64,-.50,-.40,-.33,-.26,-.10,.10,.26,.33,.40,.50,.64,.76,.88,.94,1]);
const ROAD_RUT=Object.freeze([1,1,1,1,1,1,1,.68,1,1,1,1,.68,1,1,1,1,1,1,1]);
function roadRibbon(){
  const {frameRadiusX:rx,frameRadiusZ:rz,roadHalfWidth}=SCABLANDS_LAYOUT,reach=roadHalfWidth*ROAD_REACH,across=ROAD_ACROSS.length;
  const positions=[],colours=[],indices=[];
  for(let section=0;section<ROAD_SECTIONS;section++){
    const angle=section/ROAD_SECTIONS*Math.PI*2,cx=Math.cos(angle)*rx,cz=Math.sin(angle)*rz;
    // The line's outward normal: the oval's gradient.
    const nx=Math.cos(angle)*rz,nz=Math.sin(angle)*rx,length=Math.hypot(nx,nz);
    for(let point=0;point<across;point++){
      const x=cx+nx/length*ROAD_ACROSS[point]*reach,z=cz+nz/length*ROAD_ACROSS[point]*reach;
      positions.push(x,roadHeightAt(x,z),z);colours.push(ROAD_RUT[point],ROAD_RUT[point],ROAD_RUT[point]);
    }
    const next=(section+1)%ROAD_SECTIONS;
    for(let point=0;point<across-1;point++){
      const a=section*across+point,b=a+1,c=next*across+point,d=c+1;
      indices.push(a,c,b,b,c,d);
    }
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(colours,3));geometry.setIndex(indices);geometry.computeVertexNormals();
  return geometry;
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

// Where each truck's wheels turn about their axle (the model's X axis) and how wide they are, in the rig's own metres.
// Old Smoke's model is stored at 1/1.5 and drawn at 1.5, so its wheels read 0.449 m stored and 0.673 m drawn.
const BESS_WHEEL=Object.freeze({name:/^Big Bess wheel \d (left|right)$/,radius:.555});
const FURNACE_WHEEL=Object.freeze({name:/^Furnace wheel \d (left|right)$/,radius:85*3.2/404});
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

// Big Bess's exhaust stack: the mouth stands behind the cab on the truck's left, read from tools/blender/big-bess-photo.py.
const BESS_STACK=Object.freeze({x:.98,y:3.26,z:1.4});
const BESS_PUFFS=6;
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
  parent.add(effects);
  const fx={effects,smoke,dust,
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

// Tin Town's gate afire (EVERBURN-RUN-AT-TOWN, grown by RUN-GAS): five tongues of fire 6 to 8 m tall spread along 18 m (the outer ones are 14 m apart and 4 m wide) centred
// on the gate's place, sparks thrown off them, a plume of twelve smoke puffs that rises 30 m and firelight on the ground.
// Built the way the furnace's door fire is. It is drawn only, and stays hidden until the furnace has burnt the gate.
const GATE_TONGUES=Object.freeze([-7,-3.5,0,3.5,7]);
const GATE_PUFFS=12;
const GATE_PLUME_METRES=30;
function addGateFire(){
  const effects=new THREE.Group();effects.name='Tin Town gate fire and smoke';effects.visible=false;
  const flame=createFlameMaterial(),soot=createSmokeMaterial(0x302c28),card=new THREE.PlaneGeometry(1,1);
  const standing=new THREE.PlaneGeometry(1,1);standing.translate(0,.5,0);
  // The firelight pool on the ground, under everything else that is drawn here.
  const glowMaterial=createGroundGlowMaterial(),glow=new THREE.Mesh(card,glowMaterial);
  glow.name='Firelight on the ground at the gate';glow.rotation.x=-Math.PI/2;glow.position.set(0,.14,0);glow.scale.set(34,24,1);glow.renderOrder=1;effects.add(glow);
  const tongues=GATE_TONGUES.map((x,index)=>{
    const tongue=new THREE.Mesh(standing,flame);tongue.name='Fire on the gate';
    tongue.position.set(x,0,0);tongue.scale.set(4,7,1);tongue.renderOrder=3;
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
      tongues.forEach((tongue,index)=>{tongue.scale.y=6+2*Math.abs(Math.sin(seconds*4.7+index*2.1));});
      sparks.forEach((points,index)=>points.userData.place(seconds+index*.37,{x:GATE_TONGUES[index],y:1.5,z:0},{x:0,z:1}));
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
  const furnaceTravel=createTravelMeter(),furnaceWheels=[];
  const gateFire=addGateFire();group.add(gateFire.effects);gateFire.animate(0);
  // Big Bess has her own rig, like the furnace's: the Everburn escort moves it, and it stands at her Boneyard place otherwise.
  let bessRig=null,bessPlace=null,bessEffects=null;
  const bessWheels=[],bessTravel=createTravelMeter(),bessWear=createScrapWear({paint:0});
  const placeRig=(rig,actor,path,aim,onGround,rest)=>{
    if(!actor){
      rig.position.set(rest.x+18,scablandsSurfaceHeightAt(rest.x,rest.z),rest.z);
      rig.rotation.y=(SCABLANDS_PLACES.indexOf(rest)%4)*Math.PI/2;return;
    }
    const at=actor.position,x=at?.x??rest.x,z=at?.z??rest.z;
    rig.position.set(x,(onGround?scablandsSurfaceHeightAt(x,z):0)+(at?.y??0),z);
    rig.rotation.y=Number.isFinite(actor.heading)?actor.heading:headingToward(actor,path,aim,rig.rotation.y);
  };
  // The ground, the road and the edited chunks share one look, drawn in code over their plain colours (SCABLANDS-LAND).
  const groundLook=createGroundLook();
  const groundMaterial=groundLook.apply(new THREE.MeshStandardMaterial({color:0x76624b,roughness:1}));
  const roadMaterial=groundLook.apply(new THREE.MeshStandardMaterial({color:0x594b39,roughness:1,vertexColors:true,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2}));
  const editedMaterial=groundLook.apply(new THREE.MeshStandardMaterial({vertexColors:true,roughness:1}));
  const ground=new THREE.Group();ground.name='Scablands ground chunks';group.add(ground);
  // Four near tiles carry the shared physics height at a fine grid; the single
  // distant mesh uses a coarser grid to keep the horizon inexpensive.
  const nearTiles=[];
  for(let z=-1;z<=0;z++)for(let x=-1;x<=0;x++){
    const tile=makeGround(700,500,detailCounts.near,groundMaterial,true,x*700+350,z*500+250);
    tile.position.set(x*700+350,0,z*500+250);ground.add(tile);nearTiles.push(tile);
  }
  const far=makeGround(2800,2000,detailCounts.far,groundMaterial,false);far.position.y=-FAR_GROUND_LOWER;ground.add(far);
  let editedGround=createGroundView({group:ground,groundEdit:scablandsGroundEdit,material:editedMaterial});
  const digTexture=typeof document==='undefined'?null:new THREE.TextureLoader().load('/assets/textures/dig-dirt.png');
  if(digTexture)digTexture.colorSpace=THREE.SRGBColorSpace;
  const digFx=createDigFx({group,atlasTexture:digTexture,seed:course.seed});
  // A broad flat dirt ribbon follows the stable oval frame used by driving and never changes the shared terrain height
  // function: every point of it takes the ground's height at its own place.
  const road=new THREE.Mesh(roadRibbon(),roadMaterial);
  road.name='Scablands dirt road';road.receiveShadow=true;ground.add(road);
  // Tin Town's gate, across the road at the place the furnace's path names (src/world/tin-town-gate.js).
  const tinTownGate=createTinTownGate({ground:scablandsSurfaceHeightAt(TIN_TOWN_GATE.x,TIN_TOWN_GATE.z)});group.add(tinTownGate);
  // The fire stands on the gate's beam, with its three tongues along the beam.
  gateFire.effects.rotation.y=tinTownGate.userData.yaw;
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
      // One wear for the place, with the place's own ground point as its origin. Places do not move, so it is set once.
      const placeWear=createScrapWear({paint:1});
      placeWear.uniforms.uScrapInverse.value.makeTranslation(place.x,scablandsSurfaceHeightAt(place.x,place.z),place.z).invert();
      assets.forEach((asset,index)=>{
        const key=placeAssets[place.id][index];
        if(!asset?.scene)throw Error(`Scablands ${key} art has no scene.`);
        const source=vehiclePart[key]?findPart(asset.scene,vehiclePart[key]):asset.scene;
        if(!source)throw Error(`Scablands ${key} art is missing its ${place.id} model.`);
        // The people carry their own look, and the two trucks their own wear.
        const model=source.clone(true);tintArt(model,place.id,key==='folk'||vehiclePart[key]?null:placeWear);
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
          placeRig(bessRig,null,[],0,true,place);
          bessRig.add(model);group.add(bessRig);
          bessEffects=addBessEffects(bessRig);
          bessWheels.push(...wheelsOf(model,BESS_WHEEL));
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
      if(bessRig&&bessEffects){
        bessWear.follow(bessRig);
        // Her wheels turn by the distance she has gone, and the dust behind them thickens with her speed.
        spinWheels(bessWheels,bessTravel.update(bessRig,seconds)/BESS_WHEEL.radius);
        bessEffects.placeSmoke(seconds,bessTravel.speed);
        bessEffects.dust.userData.place(seconds,bessTravel.speed,BESS_DUST);
      }
      gateFire.animate(seconds);
      if(!furnaceEffects||!furnaceRig)return;
      furnaceWear.follow(furnaceRig);
      // How fast the furnace is moving, from where it stood at the last frame; this only leans the smoke and turns the wheels.
      spinWheels(furnaceWheels,furnaceTravel.update(furnaceRig,seconds)/FURNACE_WHEEL.radius);
      const furnaceDrift=furnaceTravel.speed;
      furnaceEffects.dust.userData.place(seconds,furnaceDrift,FURNACE_DUST);
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
        // In jobs 1, 3 and 4 the furnace is seen before it is fought: drawn where the job's own state and clock put it
        // (src/world/jobs/furnace-sightings.js), with no actor behind it. Otherwise it stands in the Everburn or follows the chase.
        const sighting=actor?null:furnaceSighting(worldJob);
        if(sighting&&!sighting.hidden){
          furnaceRig.position.set(sighting.x,scablandsSurfaceHeightAt(sighting.x,sighting.z),sighting.z);
          furnaceRig.rotation.y=sighting.heading;
        }else placeRig(furnaceRig,actor,worldJob?.job?.steps?.[worldJob.job.stepIndex]?.path||[],1,false,furnacePlace);
        furnaceRig.visible=!sighting?.hidden;
        furnaceModel.position.x=0;
      }
      // Big Bess follows her escort actor in the Everburn story and stands in the Boneyard otherwise.
      if(bessRig&&bessPlace){
        const escort=worldJob?.definition?.storyId==='everburn'?worldJob.actors?.find(item=>item.id==='big-bess'):null;
        placeRig(bessRig,escort,worldJob?.job?.steps?.[worldJob.job.stepIndex]?.path||[],0,true,bessPlace);
        bessWear.follow(bessRig);
      }
      // Tin Town's gate burns once the furnace has set it alight, and stays alight until the job ends.
      const gateStep=worldJob?.definition?.storyId==='everburn'?worldJob.job?.steps?.find(step=>Number.isInteger(step.actor?.gateWaypoint)):null;
      const gateAt=gateStep?.path?.[gateStep.actor.gateWaypoint],gateSpot=gateAt?.position??gateAt;
      const burning=Boolean(gateSpot)&&(worldJob?.gateBurnt===true||actor?.furnace?.gateBurnt===true);
      gateFire.effects.visible=burning;
      if(burning)gateFire.effects.position.set(gateSpot.x,scablandsSurfaceHeightAt(gateSpot.x,gateSpot.z)+tinTownGate.userData.fireHeight,gateSpot.z);
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
    editedGround.dispose();digFx.dispose();digTexture?.dispose();whites?.dispose();tinTownGate.userData.dispose();
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
    if(changed){const geometry=makeGround(2800,2000,detailCounts.far,groundMaterial,false,0,0,scablandsGroundEdit).geometry;const old=far.geometry;far.geometry=geometry;old.dispose();
      const previousRoad=road.geometry;road.geometry=roadRibbon();previousRoad.dispose();}
    return changed;
  };
  const refreshOpenMarks=marks=>{
    if(retired||!followsOpenMarks)return;
    openMarks=marks;
    for(const tile of [...nearTiles,far]){
      const offsetX=tile.position.x,offsetZ=tile.position.z;
      const geometry=tile===far?makeGround(2800,2000,detailCounts.far,groundMaterial,false,0,0,scablandsGroundEdit).geometry:
        makeGround(700,500,detailCounts.near,groundMaterial,true,offsetX,offsetZ,scablandsGroundEdit).geometry;
      const previous=tile.geometry;tile.geometry=geometry;previous.dispose();
    }
    editedGround.dispose();
    editedGround=createGroundView({group:ground,groundEdit:scablandsGroundEdit,material:editedMaterial});
    editedGround.update();
    const previousRoad=road.geometry;road.geometry=roadRibbon();previousRoad.dispose();
    whites?.dispose();
    if(whites?.group.parent)whites.group.parent.remove(whites.group);
    whites=createTheWhitesScene({openMarks,loadAsset});
    if(whites)group.add(whites.group);
  };
  const stopOpenMarkWatch=followsOpenMarks?onScablandsOpenMarksChanged(refreshOpenMarks):()=>{};
  group.userData.digFx=digFx;
  return {group,ready,solids:SCABLANDS_SOLIDS,dispose};
}
