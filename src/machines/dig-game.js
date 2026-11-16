import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {machineDefinition} from './content/machines.js';
import {createMachineView, MACHINE_SOUND_CUES} from './view.js';
import {updateMachineCamera} from './camera.js';
import {machineControlsView} from './controls-view.js';
import {machineControlInput} from '../input-contexts.js';
import {loadMachineInput, onMachineInputChange, MACHINE_INPUT_STORAGE_KEY} from '../input-setup.js';
import {borerHasFace, borerSurvey} from './borer.js';
import {boreBoard,boreBoardWords,borerWatchingWords,borerYardControls,canSendBorer,sendBorer,closeDigSandbox,createDigBorer,createDigSandboxForApp, createPendingDigActions, cycleDigCamera, digSandboxMachineState, stepDigSandbox, switchDigMachine, teachBorerForCheck, toggleBoreLever, visitBore} from './dig-sandbox.js';
import {createGroundView,groundColour,GROUND_UV} from '../world/ground-view.js';
import {createDigFx} from '../world/dig-fx.js';
import {scablandsNaturalHeightAt,scablandsSurfaceHeightAt} from '../world/scablands-ground.js';
import {createNearGround} from '../world/near-ground.js';
import {SCABLANDS_LAYOUT} from '../world/scablands.js';
import {GROUND_AREAS} from '../world/scablands-regions.js';
import {createRiverField} from '../world/scablands-draw.js';
import {LAND} from '../world/scablands-names.js';
import {SUN_OFFSET} from '../atmosphere.js';
import {createGroundLook, createHillField, loadGroundPhotos, createTunnelMesh} from '../world/scablands-ground-look.js';
import {HILLS,scablandsTerrainHeightAt} from '../world/scablands-height.js';
import {tunnelPortalShape, tunnelPortalSurface} from '../world/tunnel-look.js';
import {machineToolPosition} from './machine.js';
import {drillYardControls, drillMaterialAt} from './drill.js';
import {createDrillSounds, createDrillView, createYardWellheadView, createDrillCuttingsView} from './drill-view.js';
import {createRoadSounds, createRoadWorkView} from './roads-view.js';
import {roadYardControls} from './roads.js';
import {createBorerSounds} from './borer-sounds.js';
import {createSparks} from '../world/scrap-look.js';

const MODEL='/assets/models/wasteland/town/machines-1.glb';
const DOME='/assets/models/wasteland/scrapdome/yard.glb';
const BORER_MODEL='/assets/models/wasteland/town/borer.glb';
const MODES=['chase','cab','work'];
const MACHINE_IDS=['excavator','dumpTruck','trencher','drill','dozer','roller','paver','borer'];
const LABELS={excavator:'Excavator',dumpTruck:'Dump truck',trencher:'Trencher',drill:'Drill rig',dozer:'Dozer',roller:'Road roller',paver:'Paver'};

/** Give the Dig the same hill field and ground photographs as the land. */
export function createDigGroundLook(riverField, loader) {
  const noHills=[];
  const hills=createHillField({halfWidth:SCABLANDS_LAYOUT.halfWidth,halfDepth:SCABLANDS_LAYOUT.halfDepth,
    raised:(x,z)=>scablandsTerrainHeightAt(x,z)-scablandsTerrainHeightAt(x,z,noHills),
    spots:HILLS.map(hill=>({x:hill.x,z:hill.z,reach:(hill.radius+(hill.ramp??0))*1.3+40}))});
  const photos=loadGroundPhotos(loader);
  const look=createGroundLook({regions:{areas:GROUND_AREAS,field:riverField.texture,box:riverField.box,
    burn:LAND.place('everburn'),hills},photos});
  // Reserve the mouth shader before any ground material is drawn. Otherwise
  // the first cut changes the shader and can pause the first thrust to compile it.
  look.setTunnelMouths([{start:{x:0,y:0,z:0},end:{x:0,y:0,z:1},radius:3}]);
  look.setTunnelMouths([]);
  return {look,hills,photos};
}

/** Update the survey only when one of its displayed values changes. */
export function updateBorerSurvey(panel, cache, line, b) {
  const remaining = Math.max(0, line.distanceM - b.distanceM);
  const gain = line.y + line.riseM - b.y;
  const floor = (b.y - line.y).toFixed(1);
  const distance = remaining.toFixed(0);
  const gainText = Math.abs(gain).toFixed(1);
  const grade = Math.abs(b.slope) < 0.0001 ? 'level' : `1 in ${Math.round(1 / Math.abs(Math.tan(b.slope)))} ${b.slope > 0 ? 'up' : 'down'}`;
  const key = [b.started, floor, grade, distance, gainText, gain >= 0, b.daylightMessage].join(':');
  if (cache.line === line && cache.key === key) return false;
  cache.line = line;
  cache.key = key;
  const text = b.daylightMessage || (!b.started
    ? `Far side on this line: ${line.distanceM} m on, ${Math.abs(line.riseM).toFixed(1)} m ${line.riseM >= 0 ? 'higher' : 'lower'}. ${line.gradeOneIn ? `Hold a ${line.riseM >= 0 ? 'rise' : 'fall'} of 1 in ${Math.round(line.gradeOneIn)}.` : 'Keep her level.'}`
    : `Floor: ${floor} m from the mouth. Grade: ${grade}. ${distance} m to go, ${gainText} m to ${gain >= 0 ? 'gain' : 'lose'}.`);
  if (cache.text !== text) panel.querySelector('p').textContent = text;
  cache.text = text;
  const ctx = panel.querySelector('canvas').getContext('2d');
  const low = Math.min(line.y, ...line.heights) - 2, high = Math.max(line.y, ...line.heights) + 2;
  const py = y => 65 - (y - low) / (high - low) * 60;
  ctx.clearRect(0, 0, 260, 70); ctx.fillStyle = '#a38a63'; ctx.beginPath(); ctx.moveTo(0, 70);
  line.heights.forEach((height, i) => ctx.lineTo(i * 260 / 80, py(height))); ctx.lineTo(260, 70); ctx.fill();
  ctx.strokeStyle = '#fff0cb'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, py(line.y));
  ctx.lineTo(Math.min(260, 260 * b.distanceM / line.distanceM), py(b.y)); ctx.stroke();
  ctx.fillStyle = '#fff0cb'; ctx.fillRect(257, py(line.y + line.riseM) - 3, 3, 6);
  return true;
}

/** Pitch the model around its cutting head as it follows the bore. */
export function poseBorerSlope(view, state) {
  view.body.rotation.x = state.slope ? -state.slope : 0;
}

/** Keep the chase view at the same height above the sloping tunnel floor. */
export function followBorerSlope(camera, target, state, distance = 8, ahead = -3) {
  const rise = Math.tan(state.slope || 0);
  camera.position.y -= distance * rise;
  target.y += ahead * rise;
  camera.lookAt(target.x, target.y, target.z);
  camera.updateMatrixWorld();
}
// The head is the simulation origin; the model's tail is about 18 m behind it.
export function updateBorerCamera(camera, state, cameraIndex, ground, dt, reset = false) {
  const segments=state.segments || [], sin=Math.sin(state.heading), cos=Math.cos(state.heading);
  const pointAt = distance => {
    let left=Math.max(0,distance);
    for(const segment of segments) {
      const dx=segment.end.x-segment.start.x, dy=segment.end.y-segment.start.y, dz=segment.end.z-segment.start.z;
      const length=Math.hypot(dx,dy,dz);
      if(left<=length) {const t=left/length; return {x:segment.start.x+dx*t,y:segment.start.y+dy*t-1.65,z:segment.start.z+dz*t};}
      left-=length;
    }
    return {x:state.x,y:state.y,z:state.z};
  };
  const mouth=segments[0]?.start, first=segments[0];
  let position, target, inside=false;
  if(cameraIndex===1 && mouth) {
    const dx=first.end.x-mouth.x,dz=first.end.z-mouth.z,length=Math.hypot(dx,dz);
    position=new THREE.Vector3(mouth.x-22*dx/length,mouth.y-1.65+4,mouth.z-22*dz/length);
    target=new THREE.Vector3(mouth.x+dx/length*8,mouth.y,mouth.z+dz/length*8);
  } else if(state.started && state.travelM>=20) {
    inside=true;
    const behind=pointAt(state.travelM-34), tail=pointAt(state.travelM-18);
    position=new THREE.Vector3(behind.x,behind.y+2.2,behind.z);
    target=new THREE.Vector3(tail.x,tail.y+2.2,tail.z);
  } else if(state.started || borerHasFace(ground,state,state.heading)) {
    position=new THREE.Vector3(state.x-24*sin+14*cos,state.y+8,state.z-24*cos-14*sin);
    target=new THREE.Vector3(state.x,state.y+2,state.z);
  } else {
    position=new THREE.Vector3(state.x-44*sin,state.y+11,state.z-44*cos);
    target=new THREE.Vector3(state.x+10*sin,state.y+2,state.z+10*cos);
  }
  const blend=1-Math.exp(-dt*4);
  const route=camera.userData.borerRoute;
  // As the tail reaches the mouth, there is no room for the camera to wait
  // inside it. Move to the outside quarter before the machine reaches it.
  const clearingMouth=route?.inside && state.travelM<20 && cameraIndex===0;
  if(reset || !camera.userData.borerTarget || !mouth || clearingMouth) {
    camera.position.copy(position);camera.userData.borerTarget=target.clone();
    camera.userData.borerRoute={inside, distance:Math.max(0,state.travelM-34)};
  } else {
    // Enter and leave along the centre line, via the mouth. Interpolating the
    // world positions directly would cut through the rock on a bend.
    const current=route || {inside:false,distance:0};
    const mouthPosition=new THREE.Vector3(mouth.x,mouth.y+0.55,mouth.z);
    const mouthDx=first.end.x-mouth.x, mouthDz=first.end.z-mouth.z;
    const mouthLength=Math.hypot(mouthDx,mouthDz);
    const outside=new THREE.Vector3(mouth.x-5*mouthDx/mouthLength,mouthPosition.y,mouth.z-5*mouthDz/mouthLength);
    outside.y=Math.max(outside.y,ground.heightAt(outside.x,outside.z)+0.5);
    if(current.inside && !inside) {
      current.distance = Math.min(Math.max(0,state.travelM-20), current.distance + (0-current.distance)*blend);
      const p=pointAt(current.distance);
      camera.position.set(p.x,p.y+2.2,p.z);
      if(current.distance<0.05) {camera.position.copy(mouthPosition);current.inside=false;current.portal='leaving';}
    } else if(inside && !current.inside) {
      if(current.portal!=='entering') {
        camera.position.lerp(outside,blend);
        camera.position.y=Math.max(camera.position.y,ground.heightAt(camera.position.x,camera.position.z)+0.5);
        // Uneven ground can hold the camera above the waypoint. Waiting for
        // its height to match leaves it stuck outside the mouth forever.
        if(Math.hypot(camera.position.x-outside.x,camera.position.z-outside.z)<0.1) current.portal='entering';
      } else {
        camera.position.lerp(mouthPosition,blend);
        if(camera.position.distanceTo(mouthPosition)<0.1) {current.inside=true;current.distance=0;current.portal=null;}
      }
    } else if(inside) {
      current.distance = Math.min(Math.max(0,state.travelM-20), current.distance + (Math.max(0,state.travelM-34)-current.distance)*blend);
      const p=pointAt(current.distance);
      camera.position.set(p.x,p.y+2.2,p.z);
    } else {
      if(current.portal==='leaving') {
        camera.position.lerp(outside,blend);
        if(camera.position.distanceTo(outside)<0.1) current.portal=null;
      } else {
        camera.position.lerp(position,blend);
        camera.position.y=Math.max(camera.position.y,ground.heightAt(camera.position.x,camera.position.z)+0.5);
      }
    }
    camera.userData.borerRoute=current;
    camera.userData.borerTarget.lerp(target,blend);
  }
  const dx=camera.position.x-state.x, dz=camera.position.z-state.z;
  const along=dx*sin+dz*cos, side=dx*cos-dz*sin;
  if (along > -19 && along < 1 && Math.abs(side)<3.5 && camera.position.y<state.y+6) {
    if (state.travelM>=21 && mouth) {
      const safe=pointAt(state.travelM-21);
      camera.position.set(safe.x,safe.y+2.2,safe.z);
      camera.userData.borerRoute={inside:true,distance:state.travelM-21};
    } else {
      camera.position.set(state.x-24*sin+14*cos,state.y+8,state.z-24*cos-14*sin);
      camera.position.y=Math.max(camera.position.y,ground.heightAt(camera.position.x,camera.position.z)+0.5);
      camera.userData.borerRoute={inside:false,distance:0};
    }
  }
  camera.lookAt(camera.userData.borerTarget);camera.updateMatrixWorld();
}
const BORER_DIAL_CSS=`.the-dig-head{display:flex;gap:8px;align-items:center;font-size:13px}.the-dig-head[hidden]{display:none}.the-dig-head svg{width:76px;height:44px}.the-dig-head path{fill:none;stroke:#d0aa69;stroke-width:5}.the-dig-head line{stroke:#fff1d8;stroke-width:3}.the-dig-head .good{stroke:#69c988;stroke-width:7}.the-dig-head meter{width:65px}`;
const css=`.the-dig{position:fixed;inset:0;z-index:10000;background:#6e604d;color:#f7edd9;font:16px/1.35 system-ui,sans-serif}.the-dig canvas{display:block;width:100%;height:100%}.the-dig-hud{position:absolute;left:12px;top:12px;display:grid;gap:5px;max-width:min(310px,calc(100vw - 24px));padding:10px 12px;background:#15211de8;border:1px solid #9d875c}.the-dig-hud h1{font-size:18px;margin:0}.the-dig-hud p{margin:0;font-size:13px}.the-dig-line{color:#f0bf74}.the-dig button{background:#344137;color:#fff1d8;border:1px solid #aa986f;padding:6px 9px;font:inherit;cursor:pointer}.the-dig-controls{position:absolute;right:12px;top:12px;width:220px;padding:8px 11px;background:#15211de8;border:1px solid #9d875c}.the-dig-controls h2{font-size:14px;margin:0}.the-dig-controls svg{width:100%;height:auto}.the-dig-controls svg rect{fill:#334137;stroke:#d0aa69}.the-dig-controls svg text{fill:#fff1d8;font:12px system-ui}.the-dig-controls p{margin:3px 0;font-size:12px}.the-dig-error{position:absolute;inset:50% auto auto 50%;transform:translate(-50%,-50%);padding:16px 20px;background:#221c17;color:white}.the-dig-close{position:absolute;right:12px;bottom:12px}.the-dig-message{min-height:1.4em}@media(max-width:700px){.the-dig-controls{top:auto;bottom:54px;right:8px;width:200px}.the-dig-hud{left:8px;top:8px;padding:8px;font-size:13px}.the-dig-close{right:8px;bottom:8px}}`;

function material(color,roughness=1){return new THREE.MeshStandardMaterial({color,roughness});}
// A finer window keeps steep faces faithful to the surface used by the Dig.
export function createDigNearGround(material, ground) {
  // A tunnel camera sees the underside of the land.
  material.side = THREE.DoubleSide;
  return createNearGround({material, heightAt:(x,z)=>scablandsSurfaceHeightAt(x,z,ground),
    name:'Dig near ground', grid:{cellX:2,cellZ:2,cellsX:192,cellsZ:192,lift:.025}});
}
function staticYard(scene,groundMaterial){
  const floorGeometry=new THREE.PlaneGeometry(800,800,800,800);floorGeometry.rotateX(-Math.PI/2);
  const position=floorGeometry.attributes.position,uv=floorGeometry.attributes.uv;
  floorGeometry.setAttribute('color',new THREE.Float32BufferAttribute(new Float32Array(position.count*3),3));
  for(let i=0;i<position.count;i++){
    const x=position.getX(i),z=position.getZ(i);
    position.setY(i,scablandsNaturalHeightAt(x,z));uv.setXY(i,x*GROUND_UV,z*GROUND_UV);
    const color=groundColour(x,z,0);floorGeometry.attributes.color.setXYZ(i,color.r,color.g,color.b);
  }
  floorGeometry.computeVertexNormals();const floor=new THREE.Mesh(floorGeometry,groundMaterial);floor.name='Scablands natural ground';floor.receiveShadow=true;scene.add(floor);
  const yard=new THREE.Group();yard.name='Machine yard props';
  const pipeMaterial=material(0x4c4a44,.7);
  for(let i=0;i<7;i++){
    const row=i<4?0:i<6?1:2,along=row===0?i:row===1?i-4+.5:1.5;
    const pipe=new THREE.Mesh(new THREE.CylinderGeometry(.22,.22,6,12,1,true),pipeMaterial);
    pipe.rotation.x=Math.PI/2;pipe.position.set(-20+along*.46,scablandsNaturalHeightAt(-20,4)+.24+row*.4,4);pipe.castShadow=true;yard.add(pipe);
  }
  scene.add(yard);
  return floor;
}

// With no surroundings to reflect, full metal draws black. Keep the paint and rust visible.
function dullMetal(node){
  for(const mat of [].concat(node.material||[]))if(mat.metalness>.3){mat.metalness=.3;mat.roughness=Math.max(mat.roughness,.6);}
}

function machineRoot(asset,id){
  const modelId=id==='dumpTruck'?'dump-truck':id;
  const source=asset.scene.getObjectByName(modelId);
  if(!source)return null;
  // The family file lays machines out in a row; the machine itself starts at its own origin.
  const root=source.clone(true);root.name=`${modelId} display`;root.position.set(0,0,0);
  root.traverse(node=>{if(node.isMesh){node.castShadow=true;node.receiveShadow=true;dullMetal(node);}});
  return root;
}

function disposeScene(group){
  const geometries=new Set(),materials=new Set(),textures=new Set();
  group.traverse(node=>{
    if(node.geometry)geometries.add(node.geometry);
    for(const mat of [].concat(node.material||[]))if(mat){materials.add(mat);for(const value of Object.values(mat))if(value?.isTexture)textures.add(value);}
  });
  for(const geometry of geometries)geometry.dispose();
  for(const texture of textures)texture.dispose();
  for(const mat of materials)mat.dispose();
}

/** Starts the page-only sandbox. All digging and driving are fixed-step simulation work. */
export async function startTheDig({app,onExit=()=>{}}={}){
  const host=document.createElement('div');host.className='the-dig';host.innerHTML=`<style>${css}</style><canvas aria-label="The Dig machine yard"></canvas><section class="the-dig-hud"><h1>THE DIG</h1><p class="the-dig-machine"></p><p class="the-dig-load"></p><p class="the-dig-hint">Tab: drive or work. Q: next machine. C: camera.</p><p class="the-dig-message" role="status"></p></section><section class="the-dig-controls"><div class="the-dig-control-content">${machineControlsView({mode:'work'})}<p>A and D swing. W and S raise and lower the boom. I and K move the arm. J and L curl the bucket. Space digs. E empties the bucket.</p></div><button type="button" data-dismiss>Hide controls</button></section><button type="button" class="the-dig-close">Escape · Yard</button>`;
  const dialStyle=document.createElement('style');dialStyle.textContent=BORER_DIAL_CSS;host.append(dialStyle);
  const dial=document.createElement('div');dial.className='the-dig-head';dial.hidden=true;
  dial.innerHTML='<span>Head speed</span><svg viewBox="0 0 80 46" role="img"><path d="M 6 40 A 34 34 0 0 1 74 40"/><path class="good" d="M 57 11 A 34 34 0 0 1 74 40"/><line x1="40" y1="40" x2="10" y2="40"/></svg><label>Thrust <meter min="0" max="1" value="0"></meter></label>';
  host.querySelector('.the-dig-load').after(dial);
  const surveyPanel=document.createElement('section');surveyPanel.className='the-dig-survey';surveyPanel.hidden=true;
  surveyPanel.innerHTML='<p></p><canvas width="260" height="70" aria-label="The hill and the tunnel from the side"></canvas>';
  surveyPanel.querySelector('canvas').style.cssText='width:260px;height:70px;max-width:100%;background:#394037';
  dial.after(surveyPanel);
  const watchingPanel=document.createElement('section');watchingPanel.className='the-dig-survey';
  surveyPanel.after(watchingPanel);
  const sendButton=document.createElement('button');sendButton.type='button';sendButton.hidden=true;watchingPanel.after(sendButton);
  const borePanel=document.createElement('section');borePanel.className='the-dig-survey';sendButton.after(borePanel);
  const boreWords=document.createElement('p'),visitButton=document.createElement('button'),leverButton=document.createElement('button');
  visitButton.type=leverButton.type='button';borePanel.append(boreWords,visitButton,leverButton);
  let surveyLine=null, surveyKey='';
  const surveyDisplayCache={};
  let sendOffered=false;
  document.body.append(host);
  const canvas=host.querySelector('canvas'),message=host.querySelector('.the-dig-message'),controlsPanel=host.querySelector('.the-dig-controls');
  let sim=createDigSandboxForApp(app),stopped=false,failed=false,lastTime=performance.now(),accumulator=0,soundAfter=0;
  let savedMapping=loadMachineInput();
  const refreshMapping=()=>{savedMapping=loadMachineInput();};
  const unsubscribeMapping=onMachineInputChange(refreshMapping);
  const onStorage=event=>{if(event.key===MACHINE_INPUT_STORAGE_KEY || event.key===null)refreshMapping();};
  window.addEventListener('storage',onStorage);
  let shownMessage='',lastMachineMessage='',messageUntil=0, muckUntil=0, borerFxAfter=0, previousCameraMachine='', sampleCentre=false, checkOverview=false, checkFarMouth=false;
  const keys=Object.create(null),pending=createPendingDigActions(),scene=new THREE.Scene();scene.background=new THREE.Color(0xb4a286);scene.fog=new THREE.Fog(0xb4a286,90,260);
  scene.add(new THREE.HemisphereLight(0xb2cde0,0x714226,1.65));
  const sun=new THREE.DirectionalLight(0xffddac,3.3);sun.position.set(SUN_OFFSET.x,SUN_OFFSET.y,SUN_OFFSET.z);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);
  Object.assign(sun.shadow.camera,{left:-45,right:45,top:45,bottom:-45,near:1,far:240});sun.shadow.bias=-.00035;sun.shadow.normalBias=.03;scene.add(sun,sun.target);
  const camera=new THREE.PerspectiveCamera(55,1,.1,900);
  const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false});renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));renderer.shadowMap.enabled=true;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1;
  const world=new THREE.Group();scene.add(world);
  const dirtTexture=new THREE.TextureLoader().load('/assets/textures/ground-color.jpg');dirtTexture.colorSpace=THREE.SRGBColorSpace;dirtTexture.wrapS=dirtTexture.wrapT=THREE.RepeatWrapping;dirtTexture.anisotropy=8;
  const riverField=createRiverField({halfWidth:SCABLANDS_LAYOUT.halfWidth,halfDepth:SCABLANDS_LAYOUT.halfDepth});
  const {look:groundLook,hills:hillField,photos:groundPhotos}=createDigGroundLook(riverField);
  const groundMaterial=groundLook.apply(new THREE.MeshStandardMaterial({map:dirtTexture,vertexColors:true,roughness:1}));
  const yardFloor=staticYard(world,groundMaterial);
  const nearMaterial=groundLook.apply(new THREE.MeshStandardMaterial({color:0x76624b,roughness:1}));
  const nearGround=createDigNearGround(nearMaterial,sim.ground);
  nearGround.follow(0,18);world.add(nearGround.mesh);
  const editedGroup=new THREE.Group();world.add(editedGroup);
  const groundView=createGroundView({group:editedGroup,groundEdit:sim.ground,material:groundMaterial});
  const wellheadView=createYardWellheadView(world,(x,z)=>sim.ground.heightAt(x,z));
  const cuttingsView=createDrillCuttingsView(world,(x,z)=>sim.ground.heightAt(x,z));
  const drillSounds=createDrillSounds(app?.audio);
  const roadSounds=createRoadSounds(app?.audio);
  const borerSounds=createBorerSounds(app?.audio);
  const roadView=createRoadWorkView(world,(x,z)=>sim.ground.heightAt(x,z),yardFloor,true);
  let controlsMachine=null, originalControls=controlsPanel.querySelector('.the-dig-control-content').innerHTML;
  const effects=createDigFx({group:world,seed:1});
  const machineViews=new Map();let modelAsset=null, drillView=null, borerHead=null, borerDirt=null, beltTime=0;
  const borerSparks=createSparks(24);borerSparks.name='Borer face sparks';borerSparks.visible=false;world.add(borerSparks);
  let drawnTunnels=sim.tunnels, drawnTunnelRevision=sim.tunnels.revision, tunnelLining=null, tunnelUpdateAfter=0;
  const portals=new THREE.Group();world.add(portals);let portalKey='';
  const sound=(cue,data)=>{
    const now=performance.now();if(now<soundAfter)return;
    if(cue===MACHINE_SOUND_CUES.engine||cue===MACHINE_SOUND_CUES.hydraulic)soundAfter=now+700;
    else soundAfter=now+120;
    if(app?.audio?.context&&!app.audio.muted)app.audio._playCue?.(cue,{scale:cue===MACHINE_SOUND_CUES.engine ? .45 : .7});
  };
  function resize(){const width=host.clientWidth,height=host.clientHeight;renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();}
  const observer=new ResizeObserver(resize);observer.observe(host);resize();
  const actionFor=()=>{
    const space=!!keys.Space;
    if(sim.mode!=='work'||!space)return null;
    if(sim.activeMachine==='excavator')return 'dig';
    if(sim.activeMachine==='dumpTruck')return 'tip';
    return 'trench';
  };
  function keyboard(event,down){
    if(['Tab','Escape','KeyQ','KeyC','Space','KeyW','KeyA','KeyS','KeyD','KeyI','KeyK','KeyJ','KeyL','KeyE','KeyF','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(event.code))event.preventDefault();
    if(!down&&event.code==='Space')keys.Space=false;
    else if(down&&!event.repeat&&event.code==='Escape'){event.stopImmediatePropagation();stop();return;}
    else if(down&&!event.repeat&&event.code==='Tab'){event.stopImmediatePropagation();pending.push('mode');return;}
    else if(down&&!event.repeat&&event.code==='KeyQ'){event.stopImmediatePropagation();pending.push('machine');return;}
    else if(down&&!event.repeat&&event.code==='KeyV'){event.stopImmediatePropagation();pending.push('lever');return;}
    else if(down&&!event.repeat&&event.code==='KeyF'){event.stopImmediatePropagation();pending.push('send');return;}
    else if(down&&!event.repeat&&event.code==='KeyC'){event.stopImmediatePropagation();pending.push('camera');return;}
    if(down&&!event.repeat&&event.code==='KeyE'&&sim.activeMachine==='excavator')pending.push('load');
    keys[event.code]=down;
  }
  const onDown=e=>keyboard(e,true),onUp=e=>keyboard(e,false),onBlur=()=>{for(const key of Object.keys(keys))keys[key]=false;};
  document.addEventListener('keydown',onDown,true);document.addEventListener('keyup',onUp,true);window.addEventListener('blur',onBlur);
  sendButton.addEventListener('click',()=>pending.push('send'));
  visitButton.addEventListener('click',()=>pending.push('visit'));
  leverButton.addEventListener('click',()=>pending.push('lever'));
  host.querySelector('[data-dismiss]').addEventListener('click',()=>{controlsPanel.hidden=true;});
  host.querySelector('.the-dig-close').addEventListener('click',stop);
  try{
    const [machineAsset,domeAsset,borerAsset]=await Promise.all([new GLTFLoader().loadAsync(MODEL),new GLTFLoader().loadAsync(DOME),new GLTFLoader().loadAsync(BORER_MODEL)]);
    if(stopped){renderer.dispose();return {stop(){}};}
    modelAsset=machineAsset;
    const dome=domeAsset.scene;dome.name='Scrapdome';dome.position.set(0,0,0);world.add(dome);
    const parkedDozer=machineAsset.scene.getObjectByName('dozer')?.clone(true);
    if(parkedDozer){parkedDozer.name='Parked dozer';parkedDozer.position.set(-24,scablandsNaturalHeightAt(-24,12),12);parkedDozer.rotation.y=.5;parkedDozer.traverse(node=>{if(node.isMesh){node.castShadow=true;dullMetal(node);}});world.add(parkedDozer);}
    for(const id of MACHINE_IDS){
      let root;
      if(id==='borer'){
        const model=machineRoot(borerAsset,'borer');
        if(model){
          // The asset faces -Z and its head is at z=-15.45. The simulation faces +Z at the head.
          model.scale.setScalar(.6);model.rotation.y=Math.PI;model.position.z=-15.45*.6;
          root=new THREE.Group();root.add(model);
        }
      } else root=machineRoot(machineAsset,id==='drill'?'trencher':id);
      if(!root && (id==='roller'||id==='paver')){
        root=new THREE.Group();
        const body=new THREE.Mesh(new THREE.BoxGeometry(2.2,1.4,3.5),material(id==='roller'?0xc49a42:0x777d45));
        body.position.y=1;body.castShadow=true;root.add(body);
        const drum=new THREE.Mesh(new THREE.CylinderGeometry(.6,.6,2.3,16),material(0x55534e));
        drum.rotation.z=Math.PI/2;drum.position.set(0,.6,1.2);root.add(drum);
      }
      if(id==='drill' && root){drillView=createDrillView(root);root=drillView.root;}
      if(!root)throw new Error(`The machine model is missing ${id}.`);
      const view=createMachineView({model:root,definition:machineDefinition(id),parent:world,onSound:id==='drill'?null:sound});
      machineViews.set(id,view);
      if(id==='borer'){
        borerHead=view.body.getObjectByName('borerhead');
        const belt=view.body.getObjectByName('borerbelt');
        if(belt){
          borerDirt=new THREE.Group();borerDirt.name='Muck on the conveyor';belt.add(borerDirt);
          const geometry=new THREE.IcosahedronGeometry(.38,0),dirt=material(0x77624b);
          for(let i=0;i<12;i++){
            const clod=new THREE.Mesh(geometry,dirt);clod.scale.set(1+i%3*.18,.45,1.1);borerDirt.add(clod);
          }
        }
      }
    }
  }catch(error){
    failed=true;message.textContent='The yard model could not be loaded. Check the machine and Dome models.';
    const alert=document.createElement('p');alert.className='the-dig-error';alert.setAttribute('role','alert');alert.textContent='The yard model could not be loaded. You can return to the yard.';host.append(alert);
    console.warn('THE DIG model load failed:',error?.message||error);
  }
  function stop(){
    if(stopped)return;stopped=true;document.removeEventListener('keydown',onDown,true);document.removeEventListener('keyup',onUp,true);
    window.removeEventListener('blur',onBlur);window.removeEventListener('storage',onStorage);unsubscribeMapping();observer.disconnect();for(const view of machineViews.values())view.dispose();
    borerSounds.dispose();roadSounds.dispose();roadView.dispose();drillSounds.dispose();wellheadView.dispose();cuttingsView.dispose();effects.dispose();groundView.dispose();disposeScene(world);riverField.texture.dispose();hillField.texture.dispose();groundPhotos.dispose();renderer.dispose();closeDigSandbox();host.remove();onExit();
  }
  function frame(now){
    if(stopped)return;
    const elapsed=Math.min(.1,(now-lastTime)/1000);lastTime=now;accumulator+=elapsed;
    const padKeys={...keys};
    let pad=null;
    try { pad=Array.from(navigator.getGamepads?.() || []).find(device=>device?.connected) || null; } catch {}
    const axes=savedMapping && (!pad || savedMapping.deviceId===pad.id) ? savedMapping.axes : {};
    const borerMapping={drive:{steer:axes.swing ?? 0,forward:axes.boom ?? 1},slope:axes.arm ?? 3};
    // Material loading is one clear action. It transfers real bucket contents to the truck.
    const frameEvents=[], previousBoreDistance=sim.borer.distanceM;
    while(accumulator>=1/60){
      if(pending.consume('mode'))sim={...sim,mode:sim.mode==='drive'?'work':'drive'};
      if(pending.consume('machine'))sim=switchDigMachine(sim);
      if(pending.consume('camera'))sim=cycleDigCamera(sim);
      if(pending.consume('visit')) {sim=visitBore(sim,sim.activeBoreId);previousCameraMachine='';}
      if(pending.consume('lever'))sim=toggleBoreLever(sim);
      if(pending.consume('send') && sendOffered)sim=sendBorer(sim,surveyLine);
      const roadMachine=!!sim.roadMachines[sim.activeMachine];
      let stepControls=sim.activeMachine==='borer'?borerYardControls(padKeys,pad,borerMapping,sim.mode):sim.activeMachine==='drill'?drillYardControls(padKeys,sim.mode):machineControlInput(padKeys,null,roadMachine||sim.activeMachine==='trencher'?'drive':sim.mode);
      if(roadMachine)stepControls=roadYardControls(sim.activeMachine,stepControls,padKeys);
      const action=pending.consume('load')?'load':actionFor();
      sim=stepDigSandbox(sim,{controls:stepControls,action,borerSurvey:!surveyPanel.hidden ? surveyLine : null},1/60);frameEvents.push(...sim.events);accumulator-=1/60;
    }
    if(drillView && machineViews.has('drill'))drillView.update(sim.drill,machineViews.get('drill').body);
    if(sim.activeMachine==='drill'){
      if(Math.abs(sim.drill.machine.speedMps)>.05 || frameEvents.some(event=>event.type==='drill-cuttings'))drillSounds.play('drill-engine');
      if(frameEvents.some(event=>event.type==='drill-cuttings'))drillSounds.play('drill-feed');
      for(const event of frameEvents)if(event.cue)drillSounds.play(event.cue);
    }
    for(const event of frameEvents)if(event.cue)roadSounds.play(event.cue);
    const borerActive=sim.activeMachine==='borer' && sim.mode==='work';
    if(borerHead)borerHead.rotateZ(elapsed * sim.borer.headSpeed * 2);
    if(sim.borer.distanceM>previousBoreDistance){
      muckUntil=now+100;
      if(now>=borerFxAfter){
        effects.burst({x:sim.borer.x,y:sim.borer.y+2,z:sim.borer.z,
          direction:{x:-Math.sin(sim.borer.heading),z:-Math.cos(sim.borer.heading)},strength:1.2,material:'rock'});
        borerFxAfter=now+300;
      }
    }
    const conveying=borerActive && now<muckUntil;
    if(borerDirt){
      borerDirt.visible=conveying;
      if(conveying)beltTime+=elapsed*2;
      borerDirt.children.forEach((clod,i)=>clod.position.set((i%3-1)*.62,.4,((i*1.07+beltTime)%12)-6));
    }
    borerSparks.visible=conveying;
    if(conveying)borerSparks.userData.place(now/1000,{x:sim.borer.x,y:sim.borer.y+2,z:sim.borer.z},
      {x:-Math.sin(sim.borer.heading),z:-Math.cos(sim.borer.heading)},0);
    borerSounds.update(borerActive?sim.borer.headSpeed:0,borerActive && now<muckUntil);
    for(const event of frameEvents)if(event.cue?.startsWith('borer.'))borerSounds.play(event.cue);
    // The simulation can add several cuts per frame. Redraw the lining at most
    // four times a second, and catch the last cut after the machine stops.
    if((sim.tunnels!==drawnTunnels || sim.tunnels.revision!==drawnTunnelRevision) && now>=tunnelUpdateAfter){
      drawnTunnels=sim.tunnels;
      drawnTunnelRevision=sim.tunnels.revision;
      const mouths=drawnTunnels.mouths;
      groundLook.setTunnelMouths(mouths);
      const nextPortalKey=mouths.map(mouth=>[mouth.start.x,mouth.start.y,mouth.start.z,mouth.radius,
        Math.atan2(mouth.start.x-mouth.end.x,mouth.start.z-mouth.end.z)].map(value=>value.toFixed(3)).join(',')).join(';');
      if(nextPortalKey!==portalKey){
        portalKey=nextPortalKey;
        for(const portal of [...portals.children]){portals.remove(portal);disposeScene(portal);}
        for(const mouth of mouths){
          const portal=new THREE.Mesh(tunnelPortalShape(mouth.radius),tunnelPortalSurface());
          portal.name='Tunnel portal';
          portal.position.set(mouth.start.x,mouth.start.y,mouth.start.z);
          // The portal's positive Z points outward, away from the bore.
          portal.rotation.y=Math.atan2(mouth.start.x-mouth.end.x,mouth.start.z-mouth.end.z);
          portal.castShadow=true;portal.receiveShadow=true;portals.add(portal);
        }
      }
      if(drawnTunnels.segments.length){
        if(tunnelLining)createTunnelMesh(drawnTunnels,tunnelLining);
        else {tunnelLining=createTunnelMesh(drawnTunnels);world.add(tunnelLining);}
      } else if(tunnelLining){
        world.remove(tunnelLining);disposeScene(tunnelLining);tunnelLining=null;
      }
      tunnelUpdateAfter=now+250;
    }
    if(tunnelLining?.userData.look){
      const actor=digSandboxMachineState(sim);
      const y=sim.activeMachine==='borer'?actor.y:sim.ground.heightAt(actor.x,actor.z);
      const mouths=drawnTunnels.mouths.map(mouth=>mouth.start)
        .sort((a,b)=>(a.x-actor.x)**2+(a.z-actor.z)**2-(b.x-actor.x)**2-(b.z-actor.z)**2);
      tunnelLining.userData.look.update({car:{x:actor.x,y:y+1,z:actor.z},
        forward:{x:Math.sin(actor.heading||0),z:Math.cos(actor.heading||0)},mouths,headlights:1});
    }
    roadView.update(sim.roadWork, sim.roadMachines.dozer.machine);
    wellheadView.update(sim.drill.wellheads);
    cuttingsView.update(sim.drill.hole);
    if(controlsMachine!==sim.activeMachine){
      controlsMachine=sim.activeMachine;
      controlsPanel.querySelector('.the-dig-control-content').innerHTML=controlsMachine==='drill'
        ? '<h2>DRILL RIG CONTROLS</h2><p>Drive with W, A, S and D. Press Tab to lower or raise the mast.</p><p>Hold Space to feed the drill. Add W for a harder feed. Hold S to reverse the bit.</p>'
        : controlsMachine==='borer'
          ? '<h2>MABEL CONTROLS</h2><p>Hold W to push the thrust lever forward and S to pull it back; keep the head turning, and hold S at zero to reverse.</p><p>Use A and D to turn, the up and down arrows to change slope, Tab to change mode and C to change view.</p>'
        : sim.roadMachines[controlsMachine]
          ? `<h2>${LABELS[controlsMachine].toUpperCase()} CONTROLS</h2><p>Drive with W, A, S and D. Hold Space while driving to work the ground.</p>${controlsMachine==='paver'?'<p>Hold Shift to pave slowly and smoothly.</p>':''}<p>Press Q to choose another machine. Press C to change the view.</p>`
          : originalControls;
    }
    const active=digSandboxMachineState(sim),definition=machineDefinition(sim.activeMachine==='dumpTruck'?'dumpTruck':sim.activeMachine);
    for(const id of MACHINE_IDS){
      const state=digSandboxMachineState(sim,id),view=machineViews.get(id);
      if(view){view.update({...state,y:id==='borer'?state.y:sim.ground.heightAt(state.x,state.z)},elapsed,id===sim.activeMachine?frameEvents:[]);
        if(id==='borer')poseBorerSlope(view,state);
        view.root.visible=true;}
    }
    if(modelAsset){
      const isBorer=sim.activeMachine==='borer';
      const y=isBorer?active.y:sim.ground.heightAt(active.x,active.z),mode=MODES[sim.cameraIndex]||'chase',wide=sim.activeMachine==='excavator';
      const toolId=Object.keys(definition.tools??{})[0],target=toolId&&definition.tools[toolId].joint?machineToolPosition(definition,active,toolId):null;
      if(isBorer) updateBorerCamera(camera,active,sim.cameraIndex,sim.ground,elapsed,previousCameraMachine!=='borer');
      else updateMachineCamera(camera,definition,{...active,y},mode,{distance:wide?17:13,height:wide?9:6,ahead:wide?4:1,target});
      previousCameraMachine=sim.activeMachine;
      sun.position.set(active.x+SUN_OFFSET.x,y+SUN_OFFSET.y,active.z+SUN_OFFSET.z);sun.target.position.set(active.x,y,active.z);sun.target.updateMatrixWorld();
    }
    else {camera.position.set(0,22,68);camera.lookAt(0,0,30);}
    for(const event of frameEvents)if(event.type==='dirt-plume'||event.type==='tip'||event.type==='spill')effects.burst({x:event.x,y:(event.y||0)+.25,z:event.z,
      direction:{x:Math.sin(active.heading||0),z:Math.cos(active.heading||0)},strength:event.type==='dirt-plume'?3.1:2.4,material:event.material});
    if(checkFarMouth && sim.activeMachine==='borer' && active.finished) {
      const dx=Math.sin(active.heading), dz=Math.cos(active.heading);
      camera.position.set(active.x+25*dx,active.y+5,active.z+25*dz);
      camera.lookAt(active.x,active.y+2,active.z);
    }
    if(checkOverview && sim.activeMachine==='borer') {
      const forwardX=Math.sin(active.heading), forwardZ=Math.cos(active.heading);
      camera.position.set(active.x-120*forwardX,active.y+90,active.z-120*forwardZ);
      camera.lookAt(active.x+150*forwardX,active.y+12,active.z+150*forwardZ);
      nearGround.follow(active.x+150*forwardX,active.z+150*forwardZ);
    } else nearGround.follow(active.x,active.z);
    if(groundView.update()) for(const bounds of groundView.changedBounds) nearGround.refreshBounds(bounds);
    effects.update(elapsed);
    const name=sim.activeMachine==='borer'?sim.borer.name:LABELS[sim.activeMachine],load=sim.activeMachine==='borer'?`${sim.borer.distanceM.toFixed(1)} m cut.`:sim.roadMachines[sim.activeMachine] ? 'Hold Space while driving to work.' : sim.activeMachine==='drill'?sim.drill.hole ? `${sim.drill.hole.depth.toFixed(1)} m deep, in ${drillMaterialAt(sim.drill.hole.site,sim.drill.hole.depth)}.` : 'Ready to drill.' : sim.activeMachine==='trencher'?`${sim.trencher.cutVolumeM3.toFixed(1)} m³ cut · ${sim.trencher.ridgeLooseVolumeM3.toFixed(1)} m³ in the ridge`:
      sim.activeMachine==='excavator'?`${Object.values(sim.haul.machines.excavator.load).reduce((a,b)=>a+b,0).toFixed(1)} m³ in bucket · ${Object.values(sim.haul.machines.dumpTruck.load).reduce((a,b)=>a+b,0).toFixed(1)} m³ in truck`:
      `${Object.values(sim.haul.machines.dumpTruck.load).reduce((a,b)=>a+b,0).toFixed(1)} m³ in truck`;
    host.querySelector('.the-dig-machine').textContent=`${name.toUpperCase()} · ${sim.mode.toUpperCase()} MODE`;
    host.querySelector('.the-dig-load').textContent=load;
    dial.hidden=sim.activeMachine!=='borer';
    const b=sim.borer;
    if(sim.activeMachine==='borer' && !b.started && borerHasFace(sim.ground,b,b.heading)) {
      const key=[b.x.toFixed(1),b.z.toFixed(1),b.y.toFixed(1),b.heading.toFixed(3)].join(':');
      if(key!==surveyKey) {
        const result=borerSurvey(sim.ground,b);surveyKey=key;
        surveyLine=result && {...result,x:b.x,y:b.y,z:b.z,heading:b.heading,
          heights:Array.from({length:81},(_,i)=>sim.ground.heightAt(b.x+Math.sin(b.heading)*result.distanceM*i/80,b.z+Math.cos(b.heading)*result.distanceM*i/80))};
      }
    } else if(!b.started) {surveyLine=null;surveyKey='';}
    surveyPanel.hidden=sim.activeMachine!=='borer' || !surveyLine;
    // Face and ground checks run only when the displayed survey or eligibility changes.
    const offerKey=[surveyKey,sim.activeMachine,b.started,sim.boreOrders.length,sim.apprenticeTown.apprenticeships.length].join(':');
    if (offerKey !== sendButton.dataset.offerKey) {
      sendButton.dataset.offerKey=offerKey;sendOffered=canSendBorer(sim,surveyLine);
    }
    sendButton.hidden=!sendOffered;
    if(sendOffered)sendButton.textContent=`F: Send ${sim.apprenticeTown.people[0].name}`;
    const board=boreBoard(sim), boardWords=board.map(boreBoardWords);
    borePanel.hidden=boardWords.length===0;
    boreWords.textContent=boardWords.length ? `Bore board. ${boardWords.join(' ')}` : '';
    const workingBore=board.find(row=>row.active);
    visitButton.hidden=!workingBore;
    if(workingBore)visitButton.textContent=`Go and see bore ${workingBore.id.replace(/^bore-/, '')}.`;
    leverButton.hidden=!workingBore || sim.activeMachine!=='borer';
    leverButton.textContent=sim.borePlayerAtLever?'V: Hand back the lever.':'V: Take the lever.';
    watchingPanel.hidden=sim.activeMachine!=='borer';
    if (!watchingPanel.hidden) watchingPanel.textContent=borerWatchingWords(sim).join(' ');
    if(!surveyPanel.hidden) updateBorerSurvey(surveyPanel,surveyDisplayCache,surveyLine,{...b,daylightMessage:sim.daylightMessage});
    const headSpeed=sim.mode==='work'?sim.borer.headSpeed:0;
    dial.querySelector('meter').value=sim.borer.lever || 0;
    dial.querySelector('line').setAttribute('transform',`rotate(${headSpeed*180} 40 40)`);
    dial.querySelector('svg').setAttribute('aria-label',`Head speed ${Math.round(headSpeed*100)} percent.`);
    if(sim.lastMessage&&sim.lastMessage!==lastMachineMessage){shownMessage=sim.lastMessage;messageUntil=now+4000;}
    const boreNotice=frameEvents.find(event=>event.type==='bore-call'||event.type==='bore-daylight');
    if(boreNotice){shownMessage=boreNotice.message;messageUntil=now+8000;}
    lastMachineMessage=sim.lastMessage;
    if(now<messageUntil)message.textContent=shownMessage;
    else if(!failed&&sim.activeMachine==='excavator'){
      const tip=machineToolPosition(machineDefinition('excavator'),digSandboxMachineState(sim,'excavator'),'bucket');
      const full=Object.values(sim.haul.machines.excavator.load).reduce((a,b)=>a+b,0)>=machineDefinition('excavator').tools.bucket.capacityM3-.01;
      message.textContent=full?'The bucket is full. Press E over the truck bed to load it.':tip&&tip.y>sim.ground.heightAt(tip.x,tip.z)+.05?'Lower the boom until the bucket touches the ground.':'The bucket is on the ground. Hold Space to dig.';
    } else if(!failed && sim.activeMachine==='borer' && sim.activeBoreId && sim.boreOrders.some(order=>order.id===sim.activeBoreId && order.status!=='finished'))message.textContent=sim.borePlayerAtLever?'You have the lever. Press V to hand it back.':'Pim is cutting. Press V to take the lever.';
    else if(!failed && sim.activeMachine==='borer')message.textContent=sim.mode==='drive'?'Drive to the rock. Press Tab to start work.':'Hold W to push the lever forward and S to pull it back. Keep the head turning.';
    else if(!failed && sim.activeMachine==='drill')message.textContent=sim.drill.hole?.jammed?'The bit is jammed. Hold S to back it out.':sim.drill.hole?.struckWater?'Water reached. Raise the mast before driving on.':'Drive to a spot. Press Tab to lower the mast. Hold Space to drill. Add W for harder feed. Hold S to reverse.';
    else if(!failed && sim.roadMachines[sim.activeMachine])message.textContent=sim.activeMachine==='dozer'
      ? 'Hold Space while driving to gather ground. Let go of Space and drive to spread it.'
      : sim.activeMachine==='roller' ? 'Hold Space and drive over the spread ground until it is firm.'
      : 'Hold Space and Shift while driving over firm ground to lay a smooth surface.';
    else if(!failed)message.textContent=sim.activeMachine==='dumpTruck'?'Drive with W, A, S and D. Press Tab, then hold Space to tip the load.':'Drive with W, A, S and D. Press Tab, then hold Space to lower the chain and cut a ditch while you drive.';
    const controlsSvg=controlsPanel.querySelector('svg');if(controlsSvg)controlsSvg.setAttribute('aria-label',`${name} controls`);
    renderer.render(scene,camera);
    // Read immediately after drawing, before the browser clears the drawing buffer.
    if(sampleCentre) {
    const gl=renderer.getContext(), pixels=new Uint8Array(4), samples=[];
    for(const [dx,dy] of [[0,0],[-.08,0],[.08,0],[0,-.08],[0,.08]]) {
      gl.readPixels(Math.floor(gl.drawingBufferWidth*(.5+dx)),Math.floor(gl.drawingBufferHeight*(.5+dy)),1,1,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
      samples.push(Array.from(pixels));
    }
    camera.userData.centrePixels=samples; sampleCentre=false;
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  return {stop,get simulation(){return sim;},get failed(){return failed;},host,
    requestCentreSample(){sampleCentre=true;},
    setCheckOverview(value){checkOverview=!!value;},
    setCheckFarMouth(value){checkFarMouth=!!value;},
    teachBorerForCheck(){sim=teachBorerForCheck(sim);},
    get viewForCheck(){return {camera,scene,world,renderer,three:THREE,groundObjects:[nearGround.mesh,yardFloor,editedGroup],groundRay:(origin,direction,far=Infinity)=>{
      world.updateMatrixWorld(true);
      const ray=new THREE.Raycaster(new THREE.Vector3(origin.x,origin.y,origin.z),
        new THREE.Vector3(direction.x,direction.y,direction.z).normalize(),0,far);
      // Raycaster cannot see the shader's mouth discard; apply the same capsule test.
      const mouths=drawnTunnels.mouths;
      const hit=ray.intersectObjects([nearGround.mesh,yardFloor,...editedGroup.children],false).find(({point})=>!mouths.some(mouth=>{
        const start=new THREE.Vector3(mouth.start.x,mouth.start.y,mouth.start.z);
        const axis=new THREE.Vector3(mouth.end.x,mouth.end.y,mouth.end.z).sub(start);
        const t=THREE.MathUtils.clamp(point.clone().sub(start).dot(axis)/Math.max(axis.lengthSq(),1e-8),0,1);
        return point.distanceToSquared(start.addScaledVector(axis,t)) < mouth.radius ** 2;
      }));
      return hit ? {x:hit.point.x,y:hit.point.y,z:hit.point.z,distance:hit.distance,mesh:hit.object.name} : null;
    },surfaceHeight:(x,z)=>scablandsSurfaceHeightAt(x,z,sim.ground),readyToWork:Math.hypot(sim.borer.x-createDigBorer(sim.ground).x,sim.borer.z-createDigBorer(sim.ground).z)>=31 && borerHasFace(sim.ground,sim.borer,sim.borer.heading),pixels:camera.userData.centrePixels,ground:nearGround,machine:machineViews.get('borer')?.body,lining:tunnelLining,portals};}};
}
