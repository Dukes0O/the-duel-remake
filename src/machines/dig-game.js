import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {machineDefinition} from './content/machines.js';
import {createMachineView, MACHINE_SOUND_CUES} from './view.js';
import {updateMachineCamera} from './camera.js';
import {machineControlsView} from './controls-view.js';
import {machineControlInput} from '../input-contexts.js';
import {closeDigSandbox,createDigSandbox, createPendingDigActions, cycleDigCamera, digSandboxMachineState, stepDigSandbox, switchDigMachine} from './dig-sandbox.js';
import {createGroundView,groundColour,GROUND_UV} from '../world/ground-view.js';
import {createDigFx} from '../world/dig-fx.js';
import {scablandsNaturalHeightAt} from '../world/scablands-ground.js';
import {machineToolPosition} from './machine.js';
import {drillYardControls, drillMaterialAt} from './drill.js';
import {createDrillSounds, createDrillView, createYardWellheadView, createDrillCuttingsView} from './drill-view.js';
import {createRoadSounds, createRoadWorkView} from './roads-view.js';
import {roadYardControls} from './roads.js';

const MODEL='/assets/models/wasteland/town/machines-1.glb';
const DOME='/assets/models/wasteland/scrapdome/yard.glb';
const MODES=['chase','cab','work'];
const MACHINE_IDS=['excavator','dumpTruck','trencher','drill','dozer','roller','paver'];
const LABELS={excavator:'Excavator',dumpTruck:'Dump truck',trencher:'Trencher',drill:'Drill rig',dozer:'Dozer',roller:'Road roller',paver:'Paver'};
const css=`.the-dig{position:fixed;inset:0;z-index:10000;background:#6e604d;color:#f7edd9;font:16px/1.35 system-ui,sans-serif}.the-dig canvas{display:block;width:100%;height:100%}.the-dig-hud{position:absolute;left:12px;top:12px;display:grid;gap:5px;max-width:min(310px,calc(100vw - 24px));padding:10px 12px;background:#15211de8;border:1px solid #9d875c}.the-dig-hud h1{font-size:18px;margin:0}.the-dig-hud p{margin:0;font-size:13px}.the-dig-line{color:#f0bf74}.the-dig button{background:#344137;color:#fff1d8;border:1px solid #aa986f;padding:6px 9px;font:inherit;cursor:pointer}.the-dig-controls{position:absolute;right:12px;top:12px;width:220px;padding:8px 11px;background:#15211de8;border:1px solid #9d875c}.the-dig-controls h2{font-size:14px;margin:0}.the-dig-controls svg{width:100%;height:auto}.the-dig-controls svg rect{fill:#334137;stroke:#d0aa69}.the-dig-controls svg text{fill:#fff1d8;font:12px system-ui}.the-dig-controls p{margin:3px 0;font-size:12px}.the-dig-error{position:absolute;inset:50% auto auto 50%;transform:translate(-50%,-50%);padding:16px 20px;background:#221c17;color:white}.the-dig-close{position:absolute;right:12px;bottom:12px}.the-dig-message{min-height:1.4em}@media(max-width:700px){.the-dig-controls{top:auto;bottom:54px;right:8px;width:200px}.the-dig-hud{left:8px;top:8px;padding:8px;font-size:13px}.the-dig-close{right:8px;bottom:8px}}`;

function material(color,roughness=1){return new THREE.MeshStandardMaterial({color,roughness});}
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
  const host=document.createElement('div');host.className='the-dig';host.innerHTML=`<style>${css}</style><canvas aria-label="The Dig machine yard"></canvas><section class="the-dig-hud"><h1>THE DIG</h1><p class="the-dig-machine"></p><p class="the-dig-load"></p><p class="the-dig-hint">Tab: drive or work. Q: next machine. C: camera.</p><p class="the-dig-message" role="status"></p></section><section class="the-dig-controls"><div class="the-dig-control-content">${machineControlsView({mode:'work'})}<p>A and D swing. W and S raise and lower the boom. I and K move the arm. J and L curl the bucket. Space digs. E empties the bucket.</p></div><button type="button" data-dismiss>Hide controls</button></section><button type="button" class="the-dig-close">Escape Â· Yard</button>`;
  document.body.append(host);
  const canvas=host.querySelector('canvas'),message=host.querySelector('.the-dig-message'),controlsPanel=host.querySelector('.the-dig-controls');
  let sim=createDigSandbox({playerId:app?.player?.id??'player'}),stopped=false,failed=false,lastTime=performance.now(),accumulator=0,soundAfter=0;
  let shownMessage='',messageUntil=0;
  const keys=Object.create(null),pending=createPendingDigActions(),scene=new THREE.Scene();scene.background=new THREE.Color(0xb4a286);scene.fog=new THREE.Fog(0xb4a286,90,260);
  scene.add(new THREE.HemisphereLight(0xe9e2d2,0x4a3e30,1.15));
  const sun=new THREE.DirectionalLight(0xffe7c2,2.4);sun.position.set(-30,55,-20);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);
  Object.assign(sun.shadow.camera,{left:-45,right:45,top:45,bottom:-45,near:1,far:180});scene.add(sun,sun.target);
  const camera=new THREE.PerspectiveCamera(55,1,.1,900);
  const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false});renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));renderer.shadowMap.enabled=true;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1;
  const world=new THREE.Group();scene.add(world);
  const dirtTexture=new THREE.TextureLoader().load('/assets/textures/ground-color.jpg');dirtTexture.colorSpace=THREE.SRGBColorSpace;dirtTexture.wrapS=dirtTexture.wrapT=THREE.RepeatWrapping;dirtTexture.anisotropy=8;
  const groundMaterial=new THREE.MeshStandardMaterial({map:dirtTexture,vertexColors:true,roughness:1});
  const yardFloor=staticYard(world,groundMaterial);
  const editedGroup=new THREE.Group();world.add(editedGroup);
  const groundView=createGroundView({group:editedGroup,groundEdit:sim.ground,material:groundMaterial});
  const wellheadView=createYardWellheadView(world,(x,z)=>sim.ground.heightAt(x,z));
  const cuttingsView=createDrillCuttingsView(world,(x,z)=>sim.ground.heightAt(x,z));
  const drillSounds=createDrillSounds(app?.audio);
  const roadSounds=createRoadSounds(app?.audio);
  const roadView=createRoadWorkView(world,(x,z)=>sim.ground.heightAt(x,z),yardFloor);
  let controlsMachine=null, originalControls=controlsPanel.querySelector('.the-dig-control-content').innerHTML;
  const effects=createDigFx({group:world,seed:1});
  const machineViews=new Map();let modelAsset=null, drillView=null;
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
    const [machineAsset,domeAsset]=await Promise.all([new GLTFLoader().loadAsync(MODEL),new GLTFLoader().loadAsync(DOME)]);
    if(stopped){renderer.dispose();return {stop(){}};}
    modelAsset=machineAsset;
    const dome=domeAsset.scene;dome.name='Scrapdome';dome.position.set(0,0,0);world.add(dome);
    const parkedDozer=machineAsset.scene.getObjectByName('dozer')?.clone(true);
    if(parkedDozer){parkedDozer.name='Parked dozer';parkedDozer.position.set(-24,scablandsNaturalHeightAt(-24,12),12);parkedDozer.rotation.y=.5;parkedDozer.traverse(node=>{if(node.isMesh){node.castShadow=true;dullMetal(node);}});world.add(parkedDozer);}
    for(const id of MACHINE_IDS){
      let root=machineRoot(machineAsset,id==='drill'?'trencher':id);
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
    }
  }catch(error){
    failed=true;message.textContent='The yard model could not be loaded. Check the machine and Dome models.';
    const alert=document.createElement('p');alert.className='the-dig-error';alert.setAttribute('role','alert');alert.textContent='The yard model could not be loaded. You can return to the yard.';host.append(alert);
    console.warn('THE DIG model load failed:',error?.message||error);
  }
  function stop(){
    if(stopped)return;stopped=true;document.removeEventListener('keydown',onDown,true);document.removeEventListener('keyup',onUp,true);
    window.removeEventListener('blur',onBlur);observer.disconnect();for(const view of machineViews.values())view.dispose();
    roadSounds.dispose();roadView.dispose();drillSounds.dispose();wellheadView.dispose();cuttingsView.dispose();effects.dispose();groundView.dispose();disposeScene(world);renderer.dispose();closeDigSandbox();host.remove();onExit();
  }
  function frame(now){
    if(stopped)return;
    const elapsed=Math.min(.1,(now-lastTime)/1000);lastTime=now;accumulator+=elapsed;
    const padKeys={...keys};
    // Material loading is one clear action. It transfers real bucket contents to the truck.
    const frameEvents=[];
    while(accumulator>=1/60){
      if(pending.consume('mode'))sim={...sim,mode:sim.mode==='drive'?'work':'drive'};
      if(pending.consume('machine'))sim=switchDigMachine(sim);
      if(pending.consume('camera'))sim=cycleDigCamera(sim);
      const roadMachine=!!sim.roadMachines[sim.activeMachine];
      let stepControls=sim.activeMachine==='drill'?drillYardControls(padKeys,sim.mode):machineControlInput(padKeys,null,roadMachine||sim.activeMachine==='trencher'?'drive':sim.mode);
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
    roadView.update(sim.roadWork, sim.roadMachines.dozer.machine);
    wellheadView.update(sim.drill.wellheads);
    cuttingsView.update(sim.drill.hole);
    if(controlsMachine!==sim.activeMachine){
      controlsMachine=sim.activeMachine;
      controlsPanel.querySelector('.the-dig-control-content').innerHTML=controlsMachine==='drill'
        ? '<h2>DRILL RIG CONTROLS</h2><p>Drive with W, A, S and D. Press Tab to lower or raise the mast.</p><p>Hold Space to feed the drill. Add W for a harder feed. Hold S to reverse the bit.</p>'
        : sim.roadMachines[controlsMachine]
          ? `<h2>${LABELS[controlsMachine].toUpperCase()} CONTROLS</h2><p>Drive with W, A, S and D. Hold Space while driving to work the ground.</p>${controlsMachine==='paver'?'<p>Hold Shift to pave slowly and smoothly.</p>':''}<p>Press Q to choose another machine. Press C to change the view.</p>`
          : originalControls;
    }
    const active=digSandboxMachineState(sim),definition=machineDefinition(sim.activeMachine==='dumpTruck'?'dumpTruck':sim.activeMachine);
    for(const id of MACHINE_IDS){
      const state=digSandboxMachineState(sim,id),view=machineViews.get(id);
      if(view){view.update({...state,y:sim.ground.heightAt(state.x,state.z)},elapsed,id===sim.activeMachine?frameEvents:[]);view.root.visible=true;}
    }
    if(modelAsset){
      const y=sim.ground.heightAt(active.x,active.z),mode=MODES[sim.cameraIndex]||'chase',wide=sim.activeMachine==='excavator';
      const toolId=Object.keys(definition.tools??{})[0],target=toolId&&definition.tools[toolId].joint?machineToolPosition(definition,active,toolId):null;
      updateMachineCamera(camera,definition,{...active,y},mode,{distance:wide?17:13,height:wide?9:6,ahead:wide?4:1,target});
      sun.position.set(active.x-30,y+55,active.z-20);sun.target.position.set(active.x,y,active.z);sun.target.updateMatrixWorld();
    }
    else {camera.position.set(0,22,68);camera.lookAt(0,0,30);}
    for(const event of frameEvents)if(event.type==='dirt-plume'||event.type==='tip'||event.type==='spill')effects.burst({x:event.x,y:(event.y||0)+.25,z:event.z,
      direction:{x:Math.sin(active.heading||0),z:Math.cos(active.heading||0)},strength:event.type==='dirt-plume'?3.1:2.4,material:event.material});
    groundView.update();effects.update(elapsed);
    const name=LABELS[sim.activeMachine],load=sim.roadMachines[sim.activeMachine] ? 'Hold Space while driving to work.' : sim.activeMachine==='drill'?sim.drill.hole ? `${sim.drill.hole.depth.toFixed(1)} m deep, in ${drillMaterialAt(sim.drill.hole.site,sim.drill.hole.depth)}.` : 'Ready to drill.' : sim.activeMachine==='trencher'?`${sim.trencher.cutVolumeM3.toFixed(1)} mÂ³ cut Â· ${sim.trencher.ridgeLooseVolumeM3.toFixed(1)} mÂ³ in the ridge`:
      sim.activeMachine==='excavator'?`${Object.values(sim.haul.machines.excavator.load).reduce((a,b)=>a+b,0).toFixed(1)} mÂ³ in bucket Â· ${Object.values(sim.haul.machines.dumpTruck.load).reduce((a,b)=>a+b,0).toFixed(1)} mÂ³ in truck`:
      `${Object.values(sim.haul.machines.dumpTruck.load).reduce((a,b)=>a+b,0).toFixed(1)} mÂ³ in truck`;
    host.querySelector('.the-dig-machine').textContent=`${name.toUpperCase()} Â· ${sim.mode.toUpperCase()} MODE`;
    host.querySelector('.the-dig-load').textContent=load;
    if(sim.lastMessage&&sim.lastMessage!==shownMessage){shownMessage=sim.lastMessage;messageUntil=now+4000;}
    if(now<messageUntil)message.textContent=shownMessage;
    else if(!failed&&sim.activeMachine==='excavator'){
      const tip=machineToolPosition(machineDefinition('excavator'),digSandboxMachineState(sim,'excavator'),'bucket');
      const full=Object.values(sim.haul.machines.excavator.load).reduce((a,b)=>a+b,0)>=machineDefinition('excavator').tools.bucket.capacityM3-.01;
      message.textContent=full?'The bucket is full. Press E over the truck bed to load it.':tip&&tip.y>sim.ground.heightAt(tip.x,tip.z)+.05?'Lower the boom until the bucket touches the ground.':'The bucket is on the ground. Hold Space to dig.';
    } else if(!failed && sim.activeMachine==='drill')message.textContent=sim.drill.hole?.jammed?'The bit is jammed. Hold S to back it out.':sim.drill.hole?.struckWater?'Water reached. Raise the mast before driving on.':'Drive to a spot. Press Tab to lower the mast. Hold Space to drill. Add W for harder feed. Hold S to reverse.';
    else if(!failed && sim.roadMachines[sim.activeMachine])message.textContent=sim.activeMachine==='dozer'
      ? 'Hold Space while driving to gather ground. Let go of Space and drive to spread it.'
      : sim.activeMachine==='roller' ? 'Hold Space and drive over the spread ground until it is firm.'
      : 'Hold Space and Shift while driving over firm ground to lay a smooth surface.';
    else if(!failed)message.textContent=sim.activeMachine==='dumpTruck'?'Drive with W, A, S and D. Press Tab, then hold Space to tip the load.':'Drive with W, A, S and D. Press Tab, then hold Space to lower the chain and cut a ditch while you drive.';
    const controlsSvg=controlsPanel.querySelector('svg');if(controlsSvg)controlsSvg.setAttribute('aria-label',`${name} controls`);
    renderer.render(scene,camera);requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  return {stop,get simulation(){return sim;},get failed(){return failed;},host};
}
