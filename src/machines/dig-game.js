import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {machineDefinition} from './content/machines.js';
import {createMachineView, MACHINE_SOUND_CUES} from './view.js';
import {updateMachineCamera} from './camera.js';
import {machineControlsView} from './controls-view.js';
import {machineControlInput} from '../input-contexts.js';
import {loadMachineInput} from '../input-setup.js';
import {borerYardControls,closeDigSandbox,createDigSandbox, createPendingDigActions, cycleDigCamera, digSandboxMachineState, stepDigSandbox, switchDigMachine} from './dig-sandbox.js';
import {createGroundView,groundColour,GROUND_UV} from '../world/ground-view.js';
import {createDigFx} from '../world/dig-fx.js';
import {scablandsNaturalHeightAt} from '../world/scablands-ground.js';
import {createGroundLook, createTunnelMesh} from '../world/scablands-ground-look.js';
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
const BORER_DIAL_CSS=`.the-dig-head{display:flex;gap:8px;align-items:center;font-size:13px}.the-dig-head[hidden]{display:none}.the-dig-head svg{width:76px;height:44px}.the-dig-head path{fill:none;stroke:#d0aa69;stroke-width:5}.the-dig-head line{stroke:#fff1d8;stroke-width:3}`;
const css=`.the-dig{position:fixed;inset:0;z-index:10000;background:#6e604d;color:#f7edd9;font:16px/1.35 system-ui,sans-serif}.the-dig canvas{display:block;width:100%;height:100%}.the-dig-hud{position:absolute;left:12px;top:12px;display:grid;gap:5px;max-width:min(310px,calc(100vw - 24px));padding:10px 12px;background:#15211de8;border:1px solid #9d875c}.the-dig-hud h1{font-size:18px;margin:0}.the-dig-hud p{margin:0;font-size:13px}.the-dig-line{color:#f0bf74}.the-dig button{background:#344137;color:#fff1d8;border:1px solid #aa986f;padding:6px 9px;font:inherit;cursor:pointer}.the-dig-controls{position:absolute;right:12px;top:12px;width:220px;padding:8px 11px;background:#15211de8;border:1px solid #9d875c}.the-dig-controls h2{font-size:14px;margin:0}.the-dig-controls svg{width:100%;height:auto}.the-dig-controls svg rect{fill:#334137;stroke:#d0aa69}.the-dig-controls svg text{fill:#fff1d8;font:12px system-ui}.the-dig-controls p{margin:3px 0;font-size:12px}.the-dig-error{position:absolute;inset:50% auto auto 50%;transform:translate(-50%,-50%);padding:16px 20px;background:#221c17;color:white}.the-dig-close{position:absolute;right:12px;bottom:12px}.the-dig-message{min-height:1.4em}@media(max-width:700px){.the-dig-controls{top:auto;bottom:54px;right:8px;width:200px}.the-dig-hud{left:8px;top:8px;padding:8px;font-size:13px}.the-dig-close{right:8px;bottom:8px}}`;

function material(color,roughness=1){return new THREE.MeshStandardMaterial({color,roughness});}
// The yard floor does not reach the west scarp, where Mabel is parked.
function scarpGround(scene, groundMaterial, centre) {
  const size=1024, divisions=512, geometry=new THREE.PlaneGeometry(size,size,divisions,divisions);
  geometry.rotateX(-Math.PI/2);
  const position=geometry.attributes.position, uv=geometry.attributes.uv;
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(new Float32Array(position.count*3),3));
  for(let i=0;i<position.count;i++){
    const x=position.getX(i)+centre.x,z=position.getZ(i)+centre.z;
    position.setXYZ(i,x,scablandsNaturalHeightAt(x,z),z);uv.setXY(i,x*GROUND_UV,z*GROUND_UV);
    const color=groundColour(x,z,0);geometry.attributes.color.setXYZ(i,color.r,color.g,color.b);
  }
  geometry.computeVertexNormals();
  const floor=new THREE.Mesh(geometry,groundMaterial);floor.name='West scarp ground';floor.receiveShadow=true;scene.add(floor);
  return floor;
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
  dial.innerHTML='<span>Head speed</span><svg viewBox="0 0 80 46" role="img"><path d="M 6 40 A 34 34 0 0 1 74 40"/><line x1="40" y1="40" x2="10" y2="40"/></svg>';
  host.querySelector('.the-dig-load').after(dial);
  document.body.append(host);
  const canvas=host.querySelector('canvas'),message=host.querySelector('.the-dig-message'),controlsPanel=host.querySelector('.the-dig-controls');
  let sim=createDigSandbox({playerId:app?.player?.id??'player'}),stopped=false,failed=false,lastTime=performance.now(),accumulator=0,soundAfter=0;
  let shownMessage='',lastMachineMessage='',messageUntil=0, muckUntil=0, borerFxAfter=0;
  const keys=Object.create(null),pending=createPendingDigActions(),scene=new THREE.Scene();scene.background=new THREE.Color(0xb4a286);scene.fog=new THREE.Fog(0xb4a286,90,260);
  scene.add(new THREE.HemisphereLight(0xe9e2d2,0x4a3e30,1.15));
  const sun=new THREE.DirectionalLight(0xffe7c2,2.4);sun.position.set(-30,55,-20);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);
  Object.assign(sun.shadow.camera,{left:-45,right:45,top:45,bottom:-45,near:1,far:180});scene.add(sun,sun.target);
  const camera=new THREE.PerspectiveCamera(55,1,.1,900);
  const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false});renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));renderer.shadowMap.enabled=true;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1;
  const world=new THREE.Group();scene.add(world);
  const dirtTexture=new THREE.TextureLoader().load('/assets/textures/ground-color.jpg');dirtTexture.colorSpace=THREE.SRGBColorSpace;dirtTexture.wrapS=dirtTexture.wrapT=THREE.RepeatWrapping;dirtTexture.anisotropy=8;
  const groundLook=createGroundLook();
  const groundMaterial=groundLook.apply(new THREE.MeshStandardMaterial({map:dirtTexture,vertexColors:true,roughness:1}));
  const yardFloor=staticYard(world,groundMaterial);
  scarpGround(world,groundMaterial,sim.borer);
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
  let drawnTunnels=sim.tunnels, tunnelLining=null, tunnelUpdateAfter=0;
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
    if(['Tab','Escape','KeyQ','KeyC','Space','KeyW','KeyA','KeyS','KeyD','KeyI','KeyK','KeyJ','KeyL','KeyE','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(event.code))event.preventDefault();
    if(!down&&event.code==='Space')keys.Space=false;
    else if(down&&!event.repeat&&event.code==='Escape'){event.stopImmediatePropagation();stop();return;}
    else if(down&&!event.repeat&&event.code==='Tab'){event.stopImmediatePropagation();pending.push('mode');return;}
    else if(down&&!event.repeat&&event.code==='KeyQ'){event.stopImmediatePropagation();pending.push('machine');return;}
    else if(down&&!event.repeat&&event.code==='KeyC'){event.stopImmediatePropagation();pending.push('camera');return;}
    if(down&&!event.repeat&&event.code==='KeyE'&&sim.activeMachine==='excavator')pending.push('load');
    keys[event.code]=down;
  }
  const onDown=e=>keyboard(e,true),onUp=e=>keyboard(e,false),onBlur=()=>{for(const key of Object.keys(keys))keys[key]=false;};
  document.addEventListener('keydown',onDown,true);document.addEventListener('keyup',onUp,true);window.addEventListener('blur',onBlur);
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
    window.removeEventListener('blur',onBlur);observer.disconnect();for(const view of machineViews.values())view.dispose();
    borerSounds.dispose();roadSounds.dispose();roadView.dispose();drillSounds.dispose();wellheadView.dispose();cuttingsView.dispose();effects.dispose();groundView.dispose();disposeScene(world);renderer.dispose();closeDigSandbox();host.remove();onExit();
  }
  function frame(now){
    if(stopped)return;
    const elapsed=Math.min(.1,(now-lastTime)/1000);lastTime=now;accumulator+=elapsed;
    const padKeys={...keys};
    let pad=null;
    try { pad=Array.from(navigator.getGamepads?.() || []).find(device=>device?.connected) || null; } catch {}
    const savedMapping=loadMachineInput();
    const axes=savedMapping && (!pad || savedMapping.deviceId===pad.id) ? savedMapping.axes : {};
    const borerMapping={drive:{steer:axes.swing ?? 0,forward:axes.boom ?? 1},slope:axes.arm ?? 3};
    // Material loading is one clear action. It transfers real bucket contents to the truck.
    const frameEvents=[], previousBoreDistance=sim.borer.distanceM;
    while(accumulator>=1/60){
      if(pending.consume('mode'))sim={...sim,mode:sim.mode==='drive'?'work':'drive'};
      if(pending.consume('machine'))sim=switchDigMachine(sim);
      if(pending.consume('camera'))sim=cycleDigCamera(sim);
      const roadMachine=!!sim.roadMachines[sim.activeMachine];
      let stepControls=sim.activeMachine==='borer'?borerYardControls(padKeys,pad,borerMapping,sim.mode):sim.activeMachine==='drill'?drillYardControls(padKeys,sim.mode):machineControlInput(padKeys,null,roadMachine||sim.activeMachine==='trencher'?'drive':sim.mode);
      if(roadMachine)stepControls=roadYardControls(sim.activeMachine,stepControls,padKeys);
      const action=pending.consume('load')?'load':actionFor();
      sim=stepDigSandbox(sim,{controls:stepControls,action},1/60);frameEvents.push(...sim.events);accumulator-=1/60;
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
    if(sim.tunnels!==drawnTunnels && now>=tunnelUpdateAfter){
      drawnTunnels=sim.tunnels;
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
          ? '<h2>MABEL CONTROLS</h2><p>Drive with W, A, S and D. Press Tab to start work.</p><p>Hold W to cut and S to reverse. Hold Shift with W to push gently through hard rock. Use A and D to turn, and the up and down arrows to change slope.</p><p>Keep the head turning. Ease off if it slows.</p>'
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
      const cameraView=updateMachineCamera(camera,definition,{...active,y},mode,{distance:isBorer?(active.started?8:20):wide?17:13,height:isBorer?(active.started?4:10):wide?9:6,ahead:isBorer?-3:wide?4:1,target});
      if(isBorer && active.started && mode==='chase')followBorerSlope(camera,cameraView.target,active);
      sun.position.set(active.x-30,y+55,active.z-20);sun.target.position.set(active.x,y,active.z);sun.target.updateMatrixWorld();
    }
    else {camera.position.set(0,22,68);camera.lookAt(0,0,30);}
    for(const event of frameEvents)if(event.type==='dirt-plume'||event.type==='tip'||event.type==='spill')effects.burst({x:event.x,y:(event.y||0)+.25,z:event.z,
      direction:{x:Math.sin(active.heading||0),z:Math.cos(active.heading||0)},strength:event.type==='dirt-plume'?3.1:2.4,material:event.material});
    groundView.update();effects.update(elapsed);
    const name=sim.activeMachine==='borer'?sim.borer.name:LABELS[sim.activeMachine],load=sim.activeMachine==='borer'?`${sim.borer.distanceM.toFixed(1)} m cut.`:sim.roadMachines[sim.activeMachine] ? 'Hold Space while driving to work.' : sim.activeMachine==='drill'?sim.drill.hole ? `${sim.drill.hole.depth.toFixed(1)} m deep, in ${drillMaterialAt(sim.drill.hole.site,sim.drill.hole.depth)}.` : 'Ready to drill.' : sim.activeMachine==='trencher'?`${sim.trencher.cutVolumeM3.toFixed(1)} m³ cut · ${sim.trencher.ridgeLooseVolumeM3.toFixed(1)} m³ in the ridge`:
      sim.activeMachine==='excavator'?`${Object.values(sim.haul.machines.excavator.load).reduce((a,b)=>a+b,0).toFixed(1)} m³ in bucket · ${Object.values(sim.haul.machines.dumpTruck.load).reduce((a,b)=>a+b,0).toFixed(1)} m³ in truck`:
      `${Object.values(sim.haul.machines.dumpTruck.load).reduce((a,b)=>a+b,0).toFixed(1)} m³ in truck`;
    host.querySelector('.the-dig-machine').textContent=`${name.toUpperCase()} · ${sim.mode.toUpperCase()} MODE`;
    host.querySelector('.the-dig-load').textContent=load;
    dial.hidden=sim.activeMachine!=='borer';
    const headSpeed=sim.mode==='work'?sim.borer.headSpeed:0;
    dial.querySelector('line').setAttribute('transform',`rotate(${headSpeed*180} 40 40)`);
    dial.querySelector('svg').setAttribute('aria-label',`Head speed ${Math.round(headSpeed*100)} percent.`);
    if(sim.lastMessage&&sim.lastMessage!==lastMachineMessage){shownMessage=sim.lastMessage;messageUntil=now+4000;}
    lastMachineMessage=sim.lastMessage;
    if(now<messageUntil)message.textContent=shownMessage;
    else if(!failed&&sim.activeMachine==='excavator'){
      const tip=machineToolPosition(machineDefinition('excavator'),digSandboxMachineState(sim,'excavator'),'bucket');
      const full=Object.values(sim.haul.machines.excavator.load).reduce((a,b)=>a+b,0)>=machineDefinition('excavator').tools.bucket.capacityM3-.01;
      message.textContent=full?'The bucket is full. Press E over the truck bed to load it.':tip&&tip.y>sim.ground.heightAt(tip.x,tip.z)+.05?'Lower the boom until the bucket touches the ground.':'The bucket is on the ground. Hold Space to dig.';
    } else if(!failed && sim.activeMachine==='borer')message.textContent=sim.mode==='drive'?'Drive to the rock. Press Tab to start work.':'Hold W to cut. Ease off if the head slows.';
    else if(!failed && sim.activeMachine==='drill')message.textContent=sim.drill.hole?.jammed?'The bit is jammed. Hold S to back it out.':sim.drill.hole?.struckWater?'Water reached. Raise the mast before driving on.':'Drive to a spot. Press Tab to lower the mast. Hold Space to drill. Add W for harder feed. Hold S to reverse.';
    else if(!failed && sim.roadMachines[sim.activeMachine])message.textContent=sim.activeMachine==='dozer'
      ? 'Hold Space while driving to gather ground. Let go of Space and drive to spread it.'
      : sim.activeMachine==='roller' ? 'Hold Space and drive over the spread ground until it is firm.'
      : 'Hold Space and Shift while driving over firm ground to lay a smooth surface.';
    else if(!failed)message.textContent=sim.activeMachine==='dumpTruck'?'Drive with W, A, S and D. Press Tab, then hold Space to tip the load.':'Drive with W, A, S and D. Press Tab, then hold Space to lower the chain and cut a ditch while you drive.';
    const controlsSvg=controlsPanel.querySelector('svg');if(controlsSvg)controlsSvg.setAttribute('aria-label',`${name} controls`);
    renderer.render(scene,camera);requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  return {stop,get simulation(){return sim;},get failed(){return failed;},host,
    get viewForCheck(){return {camera,machine:machineViews.get('borer')?.body,lining:tunnelLining,portals};}};
}
