import * as THREE from 'three';
import {createTown, stepTown, buildingById} from './index.js';
import {cellIsReserved, getTownChunk} from './town-world-data.js';
import {createTownStore, readTownPointer, saveTown, backupTownFile} from './town-store.js';
import {createTownScene} from './view/town-scene.js';
import {renderTownScreen} from './ui/town-screen.js';
import {bindTownInput} from './ui/town-input.js';
import './ui/town-screen.css';

const QA_TOWN_MEMORY={towns:new Map(),copies:new Map()};
  const css=`.town-entry{position:fixed;inset:0;z-index:10001;background:#b4a286;color:#f7edd9;font:14px/1.4 system-ui,sans-serif}.town-entry>canvas{position:absolute;inset:0;z-index:0;width:100%;height:100%;pointer-events:auto}.town-entry-interface{position:absolute;inset:0;z-index:1;pointer-events:none}.town-entry-interface>*{pointer-events:auto}.town-entry .town-screen{height:100%;display:flex;flex-direction:column;background:transparent;pointer-events:none}.town-entry .town-screen button,.town-entry input{pointer-events:auto}.town-entry .town-topbar,.town-entry .town-next,.town-entry .town-toolbar{background:#15211dcc;color:#f7edd9;padding:8px}.town-entry .town-workspace{flex:1;display:grid;grid-template-columns:190px minmax(0,1fr) 170px;gap:8px;min-height:0}.town-entry .town-build-panel,.town-entry .town-reports{background:#15211dcc;color:#f7edd9;padding:8px;max-width:190px;overflow:auto;pointer-events:auto}.town-entry .town-map{position:relative;min-height:200px;pointer-events:none;background:transparent;border:0;overflow:visible}.town-entry .town-map-hint{pointer-events:none}.town-entry .town-command-message{pointer-events:none}.town-entry button,.town-entry input{font:inherit;padding:6px;color:#f7edd9;background:#344137;border:1px solid #aa986f}.town-entry .town-onboard{position:absolute;inset:20% 25%;height:max-content;z-index:2;box-shadow:0 4px 30px #000;background:#15211dee;padding:18px}.town-entry .town-onboard p{max-width:48ch}.town-entry .town-message{color:#ffd18c;min-height:1.5em}@media(max-width:700px){.town-entry .town-workspace{grid-template-columns:150px minmax(0,1fr)}.town-entry .town-reports{display:none}}`;

function roadLine(start,end){
  const cells=[],dx=Math.abs(end.x-start.x),sx=start.x<end.x?1:-1,dz=-Math.abs(end.z-start.z),sz=start.z<end.z?1:-1;let error=dx+dz,x=start.x,z=start.z;
  for(;;){cells.push({x,z});if(x===end.x&&z===end.z)break;const twice=2*error;if(twice>=dz){error+=dz;x+=sx;}if(twice<=dx){error+=dx;z+=sz;}}
  return cells;
}

export async function startTown({app,onExit=()=>{}}={}) {
  const host=document.createElement('div');host.className='town-entry';host.innerHTML=`<style>${css}</style><div class="town-entry-interface"></div>`;document.body.append(host);
  let ui=host.querySelector('.town-entry-interface');const qa=typeof __DUEL_QA__!=='undefined'&&__DUEL_QA__===true,store=createTownStore({memoryOnly:qa,memory:qa?QA_TOWN_MEMORY:undefined});let town=null,sceneView=null,renderer=null,input=null,canvas=null,raf=0,closed=false,speed=1,accumulator=0,last=performance.now(),saveDay=null,message='',saveBusy=false,key=()=>{},keyUp=()=>{},resize=()=>{},blur=()=>{};const heldKeys=new Set();
  const dispose=()=>{if(closed)return;closed=true;cancelAnimationFrame(raf);input?.dispose();document.removeEventListener('keydown',key,true);document.removeEventListener('keyup',keyUp,true);window.removeEventListener('resize',resize);window.removeEventListener('blur',blur);sceneView?.dispose();renderer?.dispose();renderer?.forceContextLoss?.();host.remove();onExit();};
  const save=async reason=>{if(saveBusy)return false;saveBusy=true;try{await saveTown(town,{store,reason});message='';saveBusy=false;return true;}catch(error){message=error?.message||'The town could not be saved.';saveBusy=false;paint();return false;}};
  const leave=async()=>{if(await save('leaving'))dispose();};
  const paint=()=>{if(closed||!town)return;renderTownScreen(ui,town,{speed,next:message||'Nothing needs your attention. Make a plan.'});ui.querySelector('[data-town-action="yard"]')?.addEventListener('click',leave);};
  const pointers=readTownPointer();
  if(pointers.length){const loaded=await store.load(pointers[0]);if(!loaded.town){host.innerHTML=`<style>${css}</style><section class="town-onboard"><p>${loaded.message}</p><button type="button" data-close>THE YARD</button></section>`;host.querySelector('[data-close]').onclick=dispose;return{stop:dispose,host};}town=loaded.town;message=loaded.message||'';
    // One town on this laptop, shared by whoever plays (docs/WASTELAND_TOWN.md section 13): opening it makes you a mayor.
    if(app?.player?.id&&!town.mayors?.includes(app.player.id))town.mayors=[...(town.mayors||[]),app.player.id];}
  else{
    host.innerHTML=`<style>${css}</style><section class="town-onboard"><p>Driver, people keep turning up at the gate.</p><p>I keep a gate. I do not keep a town. There is flat ground all round the Dome. You build it.</p><p>Hollis</p><form><label for="town-name">Name your town</label><br><input id="town-name" name="name" value="Tin Flat" maxlength="48" required><button type="submit">START THE TOWN</button></form></section>`;
    await new Promise(resolve=>host.querySelector('form').addEventListener('submit',event=>{event.preventDefault();const seed=(Number(app.getMenuSeed?.())||1989)>>>0||1;town=createTown(seed,host.querySelector('[name=name]').value,[]);town.mayors=[app.player?.id].filter(Boolean);resolve();},{once:true}));
    host.innerHTML=`<style>${css}</style><div class="town-entry-interface"></div>`;ui=host.querySelector('.town-entry-interface');
    try{await saveTown(town,{store,reason:'first visit'});}catch(error){message=error?.message||'The town could not be saved.';}
  }
  host.__town=town;
  canvas=document.createElement('canvas');canvas.setAttribute('aria-label','The town map');host.append(canvas);
  renderer=new THREE.WebGLRenderer({canvas,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));renderer.setSize(host.clientWidth,host.clientHeight,false);renderer.shadowMap.enabled=true;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1;
  sceneView=createTownScene({town,width:host.clientWidth,height:host.clientHeight});const view=sceneView.camera.userData.townView;view.zoom=62/(1450-28);view.target.set(0,view.target.y,0);sceneView.step(0);
  const command=cmd=>{if(cmd.type==='setSpeed'){speed=cmd.speed;paint();return [];}const answers=stepTown(town,cmd),answer=answers[0];message=answer?.ok?(cmd.type==='placeBuilding'&&cmd.buildingId?.startsWith('road-')?'Road laid.':answer.message):answer?.message||'';sceneView.update();paint();return answers;};
  input=bindTownInput(ui,{command,viewAction:action=>{if(action.type==='yard')void leave();if(action.type==='backup')void(async()=>{if(!await save('backup'))return;try{const result=await backupTownFile(town.id,{store});message=typeof result==='string'?result:'The town backup was downloaded.';}catch(error){message=error?.message||'The town backup could not be made.';}paint();})();}});
  resize=()=>{renderer.setSize(host.clientWidth,host.clientHeight,false);sceneView.resize(host.clientWidth,host.clientHeight);};window.addEventListener('resize',resize);
  const placementAt=event=>sceneView.pickGround(event.clientX,event.clientY,canvas.getBoundingClientRect());
  host.__townPickGround=(x,y)=>sceneView.pickGround(x,y,canvas.getBoundingClientRect());
  const placementValid=(row,x,z)=>{
    if(cellIsReserved('scablands',x,z,row.width,row.depth))return false;
    for(let dx=0;dx<row.width;dx++)for(let dz=0;dz<row.depth;dz++){
      const found=getTownChunk(town.regions?.scablands||{chunks:{}},x+dx,z+dz);
      if(found?.cell.buildingId||found?.cell.roadId)return false;
    }
    return true;
  };
  let dragStart=null,rightDrag=null;
  canvas.addEventListener('pointerdown',event=>{
    if(event.button===2){rightDrag={x:event.clientX,y:event.clientY,startX:event.clientX,startY:event.clientY,moved:false};canvas.setPointerCapture(event.pointerId);event.preventDefault();return;}
    if(event.button!==0)return;const selected=input.getPlacement().buildingId;if(!selected)return;const point=placementAt(event);if(!point)return;dragStart=point;canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointermove',event=>{
    if(rightDrag){const dx=event.clientX-rightDrag.x,dy=event.clientY-rightDrag.y;if(Math.hypot(event.clientX-rightDrag.startX,event.clientY-rightDrag.startY)>3)rightDrag.moved=true;if(rightDrag.moved){const rect=canvas.getBoundingClientRect();sceneView.move({right:-dx/rect.width*60,forward:dy/rect.height*60,delta:1/60});}rightDrag.x=event.clientX;rightDrag.y=event.clientY;return;}
    const selected=input.getPlacement().buildingId,row=buildingById.get(selected),point=placementAt(event);if(!row||!point){sceneView.state.ghost.visible=false;return;}const valid=placementValid(row,point.x,point.z);sceneView.setPlacement(point.x,point.z,{valid,width:row.width,depth:row.depth});
  });
  canvas.addEventListener('pointerup',event=>{
    if(rightDrag){if(!rightDrag.moved&&input.getPlacement().buildingId){input.cancel();sceneView.state.ghost.visible=false;}rightDrag=null;return;}if(!dragStart)return;const selected=input.getPlacement().buildingId,row=buildingById.get(selected),start=dragStart,end=placementAt(event)||dragStart;dragStart=null;if(!row)return;
    const points=row.id.startsWith('road-')?roadLine(start,end):[start];
    sceneView.state.ghost.visible=false;
    for(const cell of points)command({type:'placeBuilding',buildingId:row.id,x:cell.x,z:cell.z});
  });
  canvas.addEventListener('pointercancel',()=>{dragStart=null;rightDrag=null;});canvas.addEventListener('contextmenu',event=>event.preventDefault());
  canvas.addEventListener('wheel',event=>{event.preventDefault();sceneView.move({zoom:Math.sign(event.deltaY)*.025,delta:1/60});},{passive:false});
  key=event=>{
    if(event.code==='Escape'){if(input.getPlacement().buildingId){input.cancel();sceneView.state.ghost.visible=false;return;}event.preventDefault();event.stopImmediatePropagation();void leave();return;}
    if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(event.code)&&!event.target.matches?.('input,textarea')){heldKeys.add(event.code);event.preventDefault();}
  };keyUp=event=>heldKeys.delete(event.code);blur=()=>heldKeys.clear();document.addEventListener('keydown',key,true);document.addEventListener('keyup',keyUp,true);window.addEventListener('blur',blur);
  saveDay=String(BigInt(town.tick)/24n);const frame=now=>{if(closed)return;const dt=Math.min(.1,(now-last)/1000);last=now;accumulator+=dt*speed*24/45;let changed=false;while(accumulator>=1){stepTown(town);accumulator-=1;changed=true;}let forward=0,right=0;if(document.activeElement?.tagName!=='INPUT'){forward=Number(heldKeys.has('ArrowUp'))-Number(heldKeys.has('ArrowDown'));right=Number(heldKeys.has('ArrowRight'))-Number(heldKeys.has('ArrowLeft'));}sceneView.move({forward,right,delta:dt});sceneView.step(dt);renderer.render(sceneView.scene,sceneView.camera);if(changed){const day=String(town.tick/24n);if(day!==saveDay){saveDay=day;void save('game day');}paint();}raf=requestAnimationFrame(frame);};
  paint();raf=requestAnimationFrame(frame);return{stop:leave,get town(){return town;},host};
}
