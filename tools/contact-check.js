// Isolated visual fixture: replace storage BEFORE importing any game module.
// If the override fails, module execution stops without loading a real career.
import {installIsolatedStorage} from './qa-storage.js';
const memory=installIsolatedStorage();
const {app}=await import('../src/main.js');
app.stop();app.audio.setMuted(true);
const style=document.createElement('style');
style.textContent='.masthead,#race-hud,#modal-layer,#test-driver{display:none!important} .contact-review button{padding:8px 10px;background:#29434a;color:#fff;border:1px solid #82999b;border-radius:4px;cursor:pointer;font:inherit}.contact-review button:hover{background:#3b5960}.contact-review output{display:block;white-space:pre-wrap;font:12px/1.5 monospace;margin-top:8px}';
document.head.append(style);
const panel=document.createElement('aside');panel.className='contact-review';panel.setAttribute('aria-label','Temporary collision visual review');
panel.style.cssText='position:fixed;left:12px;bottom:12px;z-index:999;max-width:min(640px,calc(100vw - 24px));padding:12px;background:#0c181eea;color:#edf3ee;border:1px solid #69838a;border-radius:6px;font:13px/1.45 system-ui';
const heading=document.createElement('strong');heading.textContent='CONTACT REVIEW · TEMPORARY, ISOLATED DATA';panel.append(heading);
const note=document.createElement('p');note.textContent='Real collision rules. Simulation frozen for inspection. No saved career is loaded or changed.';note.style.margin='4px 0 9px';panel.append(note);
const buttons=document.createElement('nav');buttons.setAttribute('aria-label','Collision fixtures');buttons.style.cssText='display:flex;gap:6px;flex-wrap:wrap';panel.append(buttons);
const output=document.createElement('output');output.id='contact-telemetry';output.setAttribute('aria-live','polite');panel.append(output);document.body.append(panel);
let fixture='cactus',selectedCactus=null,other=null,viewSide=1,caption='',focus=null,yieldResult='',paintRequest=0;
const zones=value=>Object.entries(value||{}).map(([name,amount])=>`${name} ${Number(amount).toFixed(2)}`).join(' · ')||'none';
function report(){
  const s=app.duel.state;
  output.textContent=`${caption}\nFallen cacti: ${s.fallenCacti.length} · Lives: ${s.lives} · Major crashes: ${s.majorCrashes}\nPlayer: ${zones(s.damageZones)}\nOther car: ${other?zones(other.damageZones):'not present'}${yieldResult?`\n${yieldResult}`:''}${selectedCactus?`\nActual scenery: ${selectedCactus.id} · ${selectedCactus.s.toFixed(1)} m / lateral ${selectedCactus.off.toFixed(1)} m`:''}\nSimulation: ${app.running?'RUNNING — unexpected':'FROZEN'} · Temporary storage entries: ${memory.size}`;
  panel.dataset.fixture=fixture;panel.dataset.fallen=String(s.fallenCacti.length);panel.dataset.lives=String(s.lives);
}
function begin(mode='timetrial'){
  cancelAnimationFrame(paintRequest);
  app.stop();app.keys={};app.autopilot=false;app.returnToMenu();
  app.startCampaign({car:'falcone_f42',startStage:0,seed:1989,difficulty:'casual',cpuDifficulty:'medium',mode});
  app.stop();app.cameraMode='chase';app.lightingMood='clear';app.ghostEnabled=false;app.ghostPose=null;
  const s=app.duel.state;
  Object.assign(s,{status:'racing',paused:false,countdown:0,stageTimeSec:10,totalTimeSec:10,speedMph:0,revs:0,traffic:[]});
  if(mode!=='duel')s.rival=null;
  s.police.pursuit=null;s.input={throttle:0,brake:0,steer:0,boost:false,shiftUp:false,shiftDown:false};
  other=null;selectedCactus=null;yieldResult='';return s;
}
function inspect(distance,lateral,{reach=13,height=6,targetHeight=1.1}={}){
  const course=app.duel.course,target=course.groundAt(distance,lateral),heading=course.at(distance).heading;
  const sn=Math.sin(heading),cs=Math.cos(heading),ahead=fixture==='cactus'?-5:1.3;
  const eye=course.groundAt(distance+ahead,lateral+viewSide*reach);
  // Camera location follows the real road frame, with enough terrain clearance.
  app.inspectionCamera={position:[target.x+cs*viewSide*reach+sn*ahead,Math.max(target.y+height,eye.y+2),target.z-sn*viewSide*reach+cs*ahead],target:[target.x,target.y+targetHeight,target.z]};
  focus={distance,lateral,options:{reach,height,targetHeight}};
}
function settle(){
  const s=app.duel.state;
  // Freeze the settled contact pose, not a crash flash/spin. Damage and lives
  // remain exactly what the collision routines produced.
  s.speedMph=0;s.revs=0;s.impactTimer=0;s.crashFlash=0;s.crashSpin=0;s.calloutTimer=0;
  if(other)other.speedMph=0;
  paintFrozen();
}
function paintFrozen(){
  app.stop();app.audio.setPaused(true);report();
  // Renderer preparation continues independently of the stopped simulation.
  // Refresh the production loading indicator until this frozen pose is ready.
  const paint=()=>{app.onFrame?.(app.duel.state);if(!app.visualReady)paintRequest=requestAnimationFrame(paint);};
  cancelAnimationFrame(paintRequest);paintRequest=requestAnimationFrame(paint);
}
function cactusView(hit=false){
  fixture='cactus';const s=begin(),course=app.duel.course;
  selectedCactus=course.features.obstacles.find(item=>item.id==='tree-9'&&item.kind==='tree'&&item.theme==='desert');
  if(!selectedCactus)throw new Error('Expected real seed-1989 desert cactus tree-9 is missing.');
  const tree=selectedCactus;
  Object.assign(s,{s:tree.s-7,prevS:tree.s-7,lateral:tree.off,prevLateral:tree.off,offRoad:true});
  if(hit){
    s.s=tree.s+6;s.speedMph=18;app.duel._staticContacts(s,true);
    const event=s.fallenCacti.find(item=>item.id===tree.id);
    if(!event)throw new Error('The real swept contact did not hit the selected cactus.');
    s.stageTimeSec=event.atTime+1;s.totalTimeSec=s.stageTimeSec;
  }
  caption=hit?'CACTUS AFTER FIRST HIT · one real 18 mph sweep, settled fall':'CACTUS BEFORE HIT · intact roadside plant and clean car';
  inspect(tree.s,tree.off,{reach:13,height:6.4,targetHeight:1.2});settle();
}
function trafficView(hit=true){
  fixture='traffic';const s=begin(),distance=390;
  Object.assign(s,{s:distance-8,prevS:distance-8,lateral:0,prevLateral:0,speedMph:0});
  other={s:distance,prevS:distance,lateral:0,prevLateral:0,speedMph:0,dir:1,alive:true,headingError:0,pushVelocity:0,damageZones:{front:0,rear:0,left:0,right:0},damageCooldown:0};s.traffic=[other];
  if(hit){
    s.s=distance-3;s.speedMph=100;
    if(!app.duel._vehicleContact(s,other,'traffic'))throw new Error('The scripted pair did not make real vehicle contact.');
    if(!(s.damageZones.front>0&&other.damageZones.rear>0))throw new Error('Both struck panels must receive real damage.');
  }
  caption=hit?'PAIRED COLLISION · real 100 mph closing impact: player front / traffic rear':'PAIRED CARS RESET · fresh stage, clean body and glass';
  inspect((s.s+other.s)/2,0,{reach:11.5,height:5,targetHeight:.8});settle();
}
function yieldingView(kind='traffic',release=false){
  fixture='yield';const s=begin(kind==='rival'?'duel':'timetrial'),distance=390,oncoming=kind==='oncoming',lane=oncoming?3.4:-3.4;
  Object.assign(s,{s:distance,prevS:distance,lateral:lane,prevLateral:lane,speedMph:0});
  other=kind==='rival'?s.rival:kind==='police'?app.duel._newPursuit(65):{alive:true,damageZones:{front:0,rear:0,left:0,right:0}};
  Object.assign(other,{s:distance+(oncoming?65:-65),prevS:distance+(oncoming?65:-65),lateral:lane,prevLateral:lane,speedMph:80,dir:oncoming?-1:1,headingError:0,pushVelocity:0});
  if(kind==='police')s.police.pursuit=other;
  else if(kind!=='rival')s.traffic=[other];
  // Exercise the real NPC movement/contact routines. The player blocks the
  // lane at rest; police enforcement is tested separately from this stop view.
  const advance=seconds=>{for(let i=0;i<seconds*120;i++){
    if(kind==='rival')app.duel._rival(1/120);
    else if(kind==='police')app.duel._movePolice(other,1/120);
    else app.duel._traffic(1/120);
    app.duel._collisions();s.stageTimeSec+=1/120;s.totalTimeSec+=1/120;
  }};
  advance(12);
  const stopped=other.speedMph,gap=Math.abs(app.duel.relativeS(other.s)-s.s);
  if(stopped>.1||s.s!==distance||s.lateral!==lane||Object.values(s.damageZones).some(value=>value!==0)||s.majorCrashes)throw new Error(`${kind} did not stop cleanly: ${stopped.toFixed(2)} mph / ${gap.toFixed(2)} m`);
  yieldResult=`Stopped at ${stopped.toFixed(2)} mph · centre gap ${gap.toFixed(2)} m · player unmoved and undamaged`;
  if(release){
    s.lateral=s.prevLateral=-lane;advance(2);
    if(other.speedMph<=stopped+1)throw new Error(`${kind} did not resume when the lane cleared.`);
    yieldResult+=`\nLane cleared: other car resumed at ${other.speedMph.toFixed(1)} mph`;
  }
  caption=`${kind.toUpperCase()} ${release?'RESUMES':'STOPS'} · real movement, 80 mph approach${kind==='police'?' (movement-only fixture)':''}`;
  inspect((s.s+app.duel.relativeS(other.s))/2,0,{reach:16,height:9,targetHeight:.8});
  // Never call settle() here: that helper sets speeds to zero for dent views.
  // Preserve the actual speed, gap and damage produced by the simulation.
  paintFrozen();
}
function action(label,callback){const button=document.createElement('button');button.textContent=label;button.onclick=()=>{try{callback();}catch(error){caption=`FIXTURE ERROR: ${error.message}`;report();throw error;}};buttons.append(button);}
action('Cactus before',()=>cactusView(false));
action('Cactus after first hit',()=>cactusView(true));
action('Player + traffic hit',()=>trafficView(true));
for(const kind of ['traffic','oncoming','rival','police'])action(`${kind} stops`,()=>yieldingView(kind));
action('Traffic resumes',()=>yieldingView('traffic',true));
action('Reset clean',()=>fixture==='traffic'?trafficView(false):cactusView(false));
action('Other camera side',()=>{viewSide*=-1;if(focus)inspect(focus.distance,focus.lateral,focus.options);report();});
cactusView(false);
