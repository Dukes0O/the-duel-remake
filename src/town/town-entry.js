import * as THREE from 'three';
import {createTown, stepTown} from './index.js';
import {createTownStore, readTownPointer, saveTown, backupTownFile} from './town-store.js';
import {createTownScene} from './view/town-scene.js';
import {renderTownScreen} from './ui/town-screen.js';
import {bindTownInput} from './ui/town-input.js';
import './ui/town-screen.css';

const css = `.town-entry{position:fixed;inset:0;z-index:10001;background:#18211e;color:#f7edd9;font:14px/1.4 system-ui,sans-serif}.town-entry>canvas{position:absolute;inset:0;z-index:0;width:100%;height:100%;pointer-events:auto}.town-entry-interface{position:absolute;inset:0;z-index:1;pointer-events:none}.town-entry-interface>*{pointer-events:auto}.town-entry .town-screen{height:100%;display:flex;flex-direction:column;background:transparent;pointer-events:none}.town-entry .town-screen button{pointer-events:auto}.town-entry .town-topbar,.town-entry .town-next,.town-entry .town-build-panel,.town-entry .town-reports,.town-entry .town-toolbar,.town-entry .town-onboard{background:#15211de8;color:#f7edd9;padding:8px}.town-entry .town-workspace{flex:1;display:grid;grid-template-columns:190px 1fr 190px;gap:8px;min-height:0}.town-entry .town-map{position:relative;min-height:200px}.town-entry button,.town-entry input{font:inherit;padding:6px;color:#f7edd9;background:#344137;border:1px solid #aa986f}.town-entry .town-onboard{position:absolute;inset:20% 25%;height:max-content;z-index:2;box-shadow:0 4px 30px #000}.town-entry .town-onboard p{max-width:48ch}.town-entry .town-message{color:#ffd18c;min-height:1.5em}@media(max-width:700px){.town-entry .town-workspace{grid-template-columns:1fr}.town-entry .town-reports{display:none}}`;

export async function startTown({app, onExit=()=>{}}={}) {
  const host=document.createElement('div');host.className='town-entry';host.innerHTML=`<style>${css}</style><div class="town-entry-interface"></div>`;document.body.append(host);
  let ui=host.querySelector('.town-entry-interface');const qa=typeof __DUEL_QA__!=='undefined'&&__DUEL_QA__===true,store=createTownStore({memoryOnly:qa});let town=null,sceneView=null,renderer=null,input=null,raf=0,closed=false,speed=1,accumulator=0,last=performance.now(),saveDay=null,message='',saveBusy=false,key=()=>{},resize=()=>{};
  const dispose=()=>{if(closed)return;closed=true;cancelAnimationFrame(raf);input?.dispose();document.removeEventListener('keydown',key,true);window.removeEventListener('resize',resize);sceneView?.dispose();renderer?.dispose();renderer?.forceContextLoss?.();host.remove();onExit();};
  const save=async reason=>{if(saveBusy)return false;saveBusy=true;try{await saveTown(town,{store,reason});message='';saveBusy=false;return true;}catch(error){message=error?.message||'The town could not be saved.';saveBusy=false;paint();return false;}};
  const leave=async()=>{if(await save('leaving'))dispose();};
  const paint=()=>{if(closed||!town)return;renderTownScreen(ui,town,{speed,next:message||'Nothing needs your attention. Make a plan.'});const map=ui.querySelector('.town-map');if(sceneView?.canvas){map.append(sceneView.canvas);sceneView.canvas.style.cssText='position:absolute;inset:0;width:100%;height:100%;';}ui.querySelector('[data-town-action="yard"]')?.addEventListener('click',leave);};
  const pointers=readTownPointer();
  if(pointers.length){const loaded=await store.load(pointers[0]);if(!loaded.town){host.innerHTML=`<style>${css}</style><section class="town-onboard"><p>${loaded.message}</p><button type="button" data-close>THE YARD</button></section>`;host.querySelector('[data-close]').onclick=dispose;return{stop:dispose,host};}town=loaded.town;message=loaded.message||'';}
  else{
    host.innerHTML=`<style>${css}</style><section class="town-onboard"><p>Driver, people keep turning up at the gate.</p><p>I keep a gate. I do not keep a town. There is flat ground all round the Dome. You build it.</p><p>Hollis</p><form><label for="town-name">Name your town</label><br><input id="town-name" name="name" value="Tin Flat" maxlength="48" required><button type="submit">START THE TOWN</button></form></section>`;
    await new Promise(resolve=>host.querySelector('form').addEventListener('submit',event=>{event.preventDefault();const seed=(Number(app.getMenuSeed?.())||1989)>>>0||1;town=createTown(seed,host.querySelector('[name=name]').value,[]);town.mayors=[app.player?.id].filter(Boolean);resolve();},{once:true}));
    host.innerHTML=`<style>${css}</style><div class="town-entry-interface"></div>`;
    ui=host.querySelector('.town-entry-interface');
    try{await saveTown(town,{store,reason:'first visit'});}catch(error){message=error?.message||'The town could not be saved.';}
  }
  ui.innerHTML='';const canvas=document.createElement('canvas');host.append(canvas);
  renderer=new THREE.WebGLRenderer({canvas,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));renderer.setSize(host.clientWidth,host.clientHeight,false);renderer.shadowMap.enabled=true;
  sceneView=createTownScene({town,width:host.clientWidth,height:host.clientHeight});sceneView.camera.userData.townView.zoom=0;sceneView.camera.userData.townView.target.set(0,0,0);
  input=bindTownInput(ui,{command,viewAction:action=>{if(action.type==='yard')void leave();if(action.type==='backup')void(async()=>{if(!await save('backup'))return;try{const result=await backupTownFile(town.id,{store});message=typeof result==='string'?result:'The town backup was downloaded.';}catch(error){message=error?.message||'The town backup could not be made.';}paint();})();}});
  resize=()=>{renderer.setSize(host.clientWidth,host.clientHeight,false);sceneView.resize(host.clientWidth,host.clientHeight);};window.addEventListener('resize',resize);
  let chosen='road-dirt';ui.addEventListener('click',event=>{const build=event.target.closest('[data-town-build]');if(build)chosen=build.dataset.townBuild;});
  canvas.addEventListener('pointerdown',event=>{if(!chosen)return;const rect=canvas.getBoundingClientRect(),x=Math.floor((event.clientX-rect.left)/rect.width*16)+12,z=Math.floor((event.clientY-rect.top)/rect.height*16)+12;const answer=stepTown(town,{type:'placeBuilding',buildingId:chosen,x,z})[0];message=answer?.message||'';sceneView.update();paint();});
  function command(cmd){if(cmd.type==='setSpeed'){speed=cmd.speed;paint();}else{const answer=stepTown(town,cmd)[0];message=answer?.message||'';sceneView.update();paint();}}
  key=event=>{if(event.code==='Escape'){event.preventDefault();event.stopImmediatePropagation();void leave();}};document.addEventListener('keydown',key,true);
  saveDay=String(BigInt(town.tick)/24n);const frame=now=>{if(closed)return;const dt=Math.min(.1,(now-last)/1000);last=now;accumulator+=dt*speed*24/45;let changed=false;while(accumulator>=1){stepTown(town);accumulator-=1;changed=true;}sceneView.step(dt);sceneView.camera.userData.townView.zoom=Math.min(.27,sceneView.camera.userData.townView.zoom+dt*.07);renderer.render(sceneView.scene,sceneView.camera);if(changed){const day=String(town.tick/24n);if(day!==saveDay){saveDay=day;void save('game day');}paint();}raf=requestAnimationFrame(frame);};
  paint();raf=requestAnimationFrame(frame);return{stop:leave,get town(){return town;},host};
}
