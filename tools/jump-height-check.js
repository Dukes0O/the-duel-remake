// Override storage before main imports players, preferences or race recovery.
// A failed override stops this module before any real save can be read.
const memory=new Map();
Object.defineProperty(window,'localStorage',{value:{getItem:key=>memory.get(String(key))??null,setItem:(key,value)=>memory.set(String(key),String(value)),removeItem:key=>memory.delete(String(key)),clear:()=>memory.clear()}});
const {app}=await import('../src/main.js');
const {COURSE,DRIVE}=await import('../src/config.js');
app.stop();app.audio.setMuted(true);
const panel=document.createElement('aside');panel.setAttribute('aria-label','Temporary jump-height review');
panel.style.cssText='position:fixed;left:12px;bottom:12px;z-index:999;width:min(430px,calc(100vw - 24px));padding:12px;background:#101d24ed;color:white;border:1px solid #738f96;border-radius:6px;font:13px/1.45 system-ui';
const heading=document.createElement('strong');heading.textContent='JUMP HEIGHT REVIEW · TEMPORARY DATA';panel.append(heading);
const note=document.createElement('p');note.textContent='Real Titan ramp flight, frozen at each phase. The production HUD is unchanged. No real saves are loaded or changed.';note.style.margin='5px 0 9px';panel.append(note);
const nav=document.createElement('nav');nav.setAttribute('aria-label','Jump phases');nav.style.cssText='display:flex;gap:6px;flex-wrap:wrap';panel.append(nav);
const output=document.createElement('output');output.id='jump-height-telemetry';output.setAttribute('aria-live','polite');output.style.cssText='display:block;white-space:pre-wrap;margin-top:8px;font:12px/1.5 monospace';panel.append(output);document.body.append(panel);
let snapshots=[],phases={},run=0,maximumHeight=0;
const copy=state=>structuredClone(state);
function prepare(){
  app.stop();app.keys={};app.autopilot=false;app.returnToMenu();
  // This grant exists only in the fixture's private in-memory profile.
  if(!app.profile.unlockedCars.includes('titan_monster'))app.profile.unlockedCars.push('titan_monster');
  app._saveProfile();
  const stage=COURSE.findIndex(item=>item.kind==='arena'&&!item.stuntTrial);
  if(stage<0)throw new Error('Titan arena is missing.');
  app.startCampaign({car:'titan_monster',startStage:stage,seed:1989,difficulty:'casual',cpuDifficulty:'medium',mode:'timetrial'});
  app.stop();app.cameraMode='wide';app.ghostEnabled=false;app.ghostPose=null;
  const s=app.duel.state,ramp=app.duel.course.features.ramps[0];
  if(!ramp)throw new Error('The real arena ramp is missing.');
  Object.assign(s,{status:'racing',paused:false,countdown:0,s:ramp.start-10,prevS:ramp.start-10,lateral:0,prevLateral:0,speedMph:85,gear:1,revs:.6,stageTimeSec:10,totalTimeSec:10,traffic:[],rival:null});
  s.police.pursuit=null;s.input={throttle:0,brake:0,steer:0,boost:false,shiftUp:false,shiftDown:false};
  snapshots=[copy(s)];maximumHeight=0;let peak=0,landed=-1;
  // Drive the actual ramp surface through the actual ballistic jump routine at
  // a fixed 85 mph. No airHeight, vertical velocity or landing is fabricated.
  const dt=1/120;
  for(let frame=0;frame<1200;frame++){
    s.prevS=s.s;s.prevLateral=s.lateral;s.prevAirHeight=s.airHeight;
    if(landed<0)s.s+=s.speedMph*DRIVE.mphToWorld*dt;
    s.stageTimeSec+=dt;s.totalTimeSec+=dt;
    app.duel._jump(s,dt);s.calloutTimer=0;
    snapshots.push(copy(s));
    if(s.airHeight>maximumHeight){maximumHeight=s.airHeight;peak=snapshots.length-1;}
    // Ignore the sub-millimetre crest contact before the main ramp launch.
    if(landed<0&&maximumHeight>.5&&!s.airborne&&snapshots.length-1>peak){landed=snapshots.length-1;s.speedMph=0;}
    if(landed>=0&&s.stageTimeSec-snapshots[landed].stageTimeSec>2.1)break;
  }
  if(maximumHeight<.5||landed<0)throw new Error('The real ramp did not produce a complete jump.');
  const rising=snapshots.findIndex((frame,index)=>index<peak&&frame.airborne&&frame.airHeight>=maximumHeight*.45);
  phases={approach:0,rising,peak,landed,after:snapshots.length-1};run++;
}
function show(phase){
  const index=phases[phase],state=app.duel.state,course=app.duel.course;
  if(!Number.isInteger(index)||index<0)throw new Error(`Missing phase: ${phase}`);
  // Prime the real HUD in time order, even when a reviewer selects peak or
  // landing first. Countdown resets the readout without changing game code.
  state.status='countdown';app.onFrame?.(state);
  for(let frame=0;frame<=index;frame++){Object.assign(state,copy(snapshots[frame]));app.onFrame?.(state);}
  const ground=course.groundAt(state.s,state.lateral),heading=course.at(state.s).heading,sn=Math.sin(heading),cs=Math.cos(heading);
  const lift=state.airHeight||0,side=12,back=-13;
  const eyeGround=course.groundAt(state.s+back,state.lateral+side).y;
  app.inspectionCamera={position:[ground.x+cs*side+sn*back,Math.max(ground.y+7+lift*.4,eyeGround+3),ground.z-sn*side+cs*back],target:[ground.x,ground.y+1.2+lift*.45,ground.z]};
  app.stop();app.audio.setPaused(true);
  panel.dataset.phase=phase;panel.dataset.run=String(run);
  const read=id=>document.getElementById(id)?.textContent?.trim()||'(not yet available)';
  const heightPanel=document.getElementById('jump-height-panel');
  output.textContent=`Run ${run} · ${phase.toUpperCase()} · simulation frozen\nRaw airHeight: ${state.airHeight.toFixed(3)} m · airborne: ${state.airborne}\nGround elevation: ${ground.y.toFixed(3)} m (not the jump height)\nActual flight peak: ${maximumHeight.toFixed(3)} m\nStage time: ${state.stageTimeSec.toFixed(3)} s · landed jumps: ${state.jumps}\nHUD: ${heightPanel?.hidden?'hidden':'visible'} · ${read('jump-height-label')} ${read('jump-height-value')}\nPeak line: ${read('jump-height-peak')}`;
}
for(const [label,phase]of[['Approach','approach'],['Rising','rising'],['Peak','peak'],['Landed','landed'],['After 2 seconds','after']]){
  const button=document.createElement('button');button.textContent=label;button.style.cssText='padding:7px 9px;background:#29434a;color:white;border:1px solid #78969c;border-radius:4px;cursor:pointer';button.onclick=()=>show(phase);nav.append(button);
}
const fresh=document.createElement('button');fresh.textContent='New run';fresh.style.cssText='padding:7px 9px;background:#29434a;color:white;border:1px solid #78969c;border-radius:4px;cursor:pointer';fresh.onclick=()=>{prepare();show('approach');};nav.append(fresh);
prepare();show('approach');
