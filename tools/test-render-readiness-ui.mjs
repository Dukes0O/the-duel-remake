import assert from 'node:assert/strict';
import {screenMarkup} from '../src/screen-menu.js';
import {createRendererReadiness} from '../src/screen-readiness.js';
import {App} from '../src/app.js';
import {CARS} from '../src/config.js';
import {isCourseUnlocked} from '../src/course-access.js';
let checks=0;
const check=(value,label)=>{assert(value,label);checks++;};
const equal=(actual,expected,label)=>{assert.deepEqual(actual,expected,label);checks++;};
const markup=screenMarkup({choices:{car:'falcone_f42',cpuDifficulty:'medium',difficulty:'arcade',startStage:0},arrow:'',sound:'',escapeHTML:String});
const buttonTag=markup.match(/<button id="start-engine"[^>]*>/)?.[0];
check(/\bdisabled(?:\s|>)/.test(buttonTag),'production Start button begins disabled before the renderer import');
check(typeof createRendererReadiness==='function','the production readiness controller is exported for direct checks');
const bootstrap=(ui,app,CARS,choices,importRenderer,logger,isCourseUnlocked)=>createRendererReadiness({ui,app,choices,profile:()=>app.profile,isDisposed:()=>false,importRenderer,reportError:logger.error});
check(typeof bootstrap==='function','readiness fixture calls the same controller used by production');
const flush=async()=>{for(let i=0;i<12;i++)await Promise.resolve();};
const memory=new Map();
globalThis.localStorage={getItem:key=>memory.get(key)??null,setItem:(key,value)=>memory.set(key,value)};
globalThis.window=new EventTarget();window.location={search:''};globalThis.Element=class{};globalThis.cancelAnimationFrame=()=>{};
function fixture(){
  // These nodes expose the actual properties used by the production functions;
  // the real App gate determines readiness. No parallel readiness logic is used.
  const errorNodes={strong:{textContent:"The road couldn't load."},span:{textContent:''},button:{textContent:'RETRY GRAPHICS'}};
  const ui={view3d:{dataset:{},classList:{add(){}}},'renderer-loading':{hidden:false,lastChild:{textContent:' FINDING THE OPEN ROAD'}},
    'renderer-error':{hidden:true,querySelector:selector=>errorNodes[selector]},'start-engine':{disabled:/\bdisabled(?:\s|>)/.test(buttonTag)}};
  const app=new App(),owner={},prepared=[],errors=[];
  let resolve,reject,asset='ready',imports=0,attached=0;
  const imported=new Promise((a,b)=>{resolve=a;reject=b;});
  const renderer={prepareVehicle(key){prepared.push(key);ui.view3d.dataset.vehicleKey=key;ui.view3d.dataset.vehicleAsset=asset;},dispose(){}};
  const importedModule={attachRenderer(){attached++;app.claimVisualReadiness(owner);return renderer;}};
  const controller=bootstrap(ui,app,CARS,{car:'falcone_f42',startStage:0},()=>{imports++;return imported;},{error:(...args)=>errors.push(args)},isCourseUnlocked);
  return {app,ui,owner,controller,renderer,errorNodes,errors,prepared,resolve:()=>resolve(importedModule),reject,
    setAsset:value=>{asset=value;},get imports(){return imports;},get attached(){return attached;},
    clickStart(){if(!ui['start-engine'].disabled)app.startCampaign({car:'falcone_f42',startStage:0,mode:'timetrial'});}};
}
{
  const h=fixture(),saved=JSON.stringify([...memory]);
  h.clickStart();h.app._simulate(.1);
  equal(h.app.duel.state.status,'menu','a pre-import Start activation cannot begin a race');
  equal(JSON.stringify([...memory]),saved,'pre-import activation does not change saved progress');
  h.ui['start-engine'].disabled=false;const first=h.controller.ensureRenderer();
  check(h.ui['start-engine'].disabled&&!h.ui['renderer-loading'].hidden,'ensureRenderer immediately disables Start and shows loading');
  equal(h.controller.ensureRenderer(),first,'repeated startup calls share the pending import');equal(h.imports,1,'only one renderer import is started');
  h.clickStart();h.app._simulate(.1);equal(h.app.duel.state.status,'menu','the entire pending-import interval remains non-startable');
  h.resolve();await first;await flush();
  equal(h.attached,1,'resolved import attaches exactly one renderer');
  check(h.ui['start-engine'].disabled&&!h.ui['renderer-loading'].hidden,'attachment does not clear a pending first-frame gate');
  equal(h.ui['renderer-loading'].lastChild.textContent,' PREPARING THE ROAD','ready car plus a held visual gate explains preparation');
  check(h.ui['renderer-error'].hidden,'normal preparation does not show an error');
  for(const phase of ['scheduled','compiling','fallback']){
    h.ui.view3d.dataset.warmupStatus=phase;h.controller.syncRendererReadiness(h.app.duel.state);
    check(h.ui['start-engine'].disabled&&!h.ui['renderer-loading'].hidden,`${phase} cannot enable Start before presentation`);
  }
  h.app.presentVisualFrame(h.owner,h.app.duel.state,h.app.duel.course);h.controller.syncRendererReadiness(h.app.duel.state);
  check(!h.ui['start-engine'].disabled&&h.ui['renderer-loading'].hidden,'only an actual completed-frame acknowledgement enables Start');
  h.clickStart();equal(h.app.duel.state.status,'countdown','ready Start uses the normal campaign path');
  const countdown=h.app.duel.state.countdown;h.app._simulate(.1);equal(h.app.duel.state.countdown,countdown,'new run identity holds countdown until its own first frame');
  h.controller.syncRendererReadiness(h.app.duel.state);equal(h.ui['renderer-loading'].lastChild.textContent,' PREPARING THE ROAD','new-run preparation is visible during countdown');
  h.app.duel.state.paused=true;
  h.app.presentVisualFrame(h.owner,h.app.duel.state,h.app.duel.course);h.controller.syncRendererReadiness(h.app.duel.state);
  check(h.app.duel.state.paused,'readiness UI does not unpause the user');
  for(const asset of ['idle','loading']){
    h.setAsset(asset);h.controller.syncRendererReadiness(h.app.duel.state);
    check(h.ui['start-engine'].disabled&&!h.ui['renderer-loading'].hidden,`${asset} asset keeps Start disabled and shows loading`);
    equal(h.ui['renderer-loading'].lastChild.textContent,` LOADING ${CARS.falcone_f42.name.toUpperCase()}`,'asset loading names the selected car');
  }
  h.setAsset('error');h.controller.syncRendererReadiness(h.app.duel.state);
  check(h.ui['start-engine'].disabled&&h.ui['renderer-loading'].hidden&&!h.ui['renderer-error'].hidden,'failed car keeps the existing error/retry path rather than a permanent preparation spinner');
  equal(h.errorNodes.button.textContent,'RETRY CAR ↗','failed asset retains the actionable retry button');
  h.setAsset('ready');h.app.holdVisualReadiness(h.owner);h.controller.syncRendererReadiness(h.app.duel.state);
  check(h.ui['renderer-error'].hidden&&!h.ui['renderer-loading'].hidden,'successful retry returns to first-frame preparation');
  const writes=JSON.stringify(h.ui);h.controller.dispose();h.setAsset('error');h.controller.syncRendererReadiness(h.app.duel.state);
  equal(JSON.stringify(h.ui),writes,'disposed UI rejects late readiness updates');h.app.dispose();
}
{
  const h=fixture();const promise=h.controller.ensureRenderer();h.reject(new Error('Import unavailable'));await promise;await flush();
  check(h.ui['start-engine'].disabled&&h.ui['renderer-loading'].hidden&&!h.ui['renderer-error'].hidden,'import failure stops the spinner and preserves the graphics-retry error');
  equal(h.errors.length,1,'import failure is reported once');equal(h.attached,0,'failed import never attaches a renderer');h.app.dispose();
}
{
  const h=fixture();const promise=h.controller.ensureRenderer();h.controller.dispose();const before=JSON.stringify(h.ui);h.resolve();await promise;await flush();
  equal(h.attached,0,'a late import cannot attach into a disposed UI');equal(JSON.stringify(h.ui),before,'late success/finally cannot mutate disposed loading controls');h.app.dispose();
}
console.log(`Renderer readiness UI: ${checks} production startup, import, App-gate, first-frame, pause, failure and disposal checks passed.`);
