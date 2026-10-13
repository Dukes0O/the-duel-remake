import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {App} from '../src/app.js';
import {Duel} from '../src/game.js';
import {createKeyboardSteering,keyboardSteeringDirection,KEYBOARD_STEERING_START,KEYBOARD_STEERING_RISE_SEC,keyboardSteeringLimit,createKeyboardThrottle} from '../src/keyboard-steering.js';

let checks=0;
const check=(value,label)=>{assert(value,label);checks++;};
const equal=(a,b,label)=>{assert.deepEqual(a,b,label);checks++;};
const near=(a,b,tolerance,label)=>check(Math.abs(a-b)<=tolerance,`${label}: ${a} vs ${b}`);
const dt=1/120,firstAuthority=.30+.70*(dt/2)/.45;
equal([KEYBOARD_STEERING_START,KEYBOARD_STEERING_RISE_SEC],[.30,.45],'road keyboard curve starts at 30% and reaches full in 450 ms');
for(const [keys,want]of [[{},0],[{KeyA:true},0],[{ArrowLeft:true},-1],[{KeyD:true},0],[{ArrowRight:true},1],[{KeyA:true,ArrowRight:true},1],[{ArrowLeft:true,ArrowRight:true},0],[{KeyD:true,KeyA:true},0],[{KeyD:true,ArrowLeft:true},-1]])
  equal(keyboardSteeringDirection(keys),want,'only arrow keys steer; A and D never steer');
for(const [duration,want]of [[.025,.3194444444444444],[.05,.3388888888888889],[.1,.37777777777777777],[.2,.45555555555555555],[.5,.685]]){
  const steering=createKeyboardSteering();let integral=0;
  for(let i=0;i<Math.round(duration/dt);i++)integral+=steering.update(1,dt)*dt;
  near(integral/duration,want,1e-12,`${duration*1000} ms keyboard hold has the exact integrated authority`);
}
{
  const steering=createKeyboardSteering();near(steering.update(-1,dt),-firstAuthority,1e-12,'left and right use the same soft onset');
  for(let i=0;i<54;i++)steering.update(-1,dt);
  equal(steering.update(-1,dt),-1,'sustained key has full authority');
  equal(steering.update(0,dt),0,'release is immediate with no steering tail');
  near(steering.update(-1,dt),-firstAuthority,1e-12,'a fresh tap starts gently again');
  near(steering.update(1,dt),firstAuthority,1e-12,'direction reversal resets immediately, without crossing through a decaying old input');
  steering.reset();near(steering.update(1,dt),firstAuthority,1e-12,'explicit reset drops held-key history');
  for(const invalid of [NaN,Infinity,-1,0])equal(steering.update(1,invalid),0,'invalid elapsed time cannot create a steering spike');
  equal(steering.update(NaN,dt),0,'invalid direction is neutral');
}

for(const [speed,limit]of [[0,1],[40,1],[80,.8],[120,.6],[200,.6],[-80,.8]]){
  near(keyboardSteeringLimit(speed),limit,1e-12,'road keyboard speed cap uses absolute mph');
  const steering=createKeyboardSteering();
  for(let i=0;i<54;i++)steering.update(1,dt,speed);
  near(steering.update(1,dt,speed),limit,1e-12,'held steering reaches the speed cap');
}
for(const [duration,mean]of [[.05,1/24],[.3,.25],[.6,.5],[.9,2/3]]){
  const throttle=createKeyboardThrottle();let impulse=0;
  for(let i=0;i<Math.round(duration/dt);i++)impulse+=throttle.update(true,dt)*dt;
  near(impulse/duration,mean,1e-12,'throttle has the exact ramp integral');
  equal(throttle.update(false,dt),0,'throttle release is instant');
  near(throttle.update(true,dt),dt/(2*.6),1e-12,'fresh throttle press starts at zero');
  throttle.reset();near(throttle.update(true,dt),dt/(2*.6),1e-12,'throttle reset clears held history');
}
{
  const steering=createKeyboardSteering({arena:true});
  for(const duration of [.025,.05,.1,.2,.5]){
    steering.reset();let actual=0;
    for(let i=0;i<Math.round(duration/dt);i++)actual+=steering.update(1,dt,200)*dt;
    const expected=.78*duration+.22*(duration<.2?duration*duration/.4:duration-.1);
    near(actual,expected,1e-12,'arena preserves the original steering integral at every speed');
  }
}

// Memory-only real App and real fixed-step physics. No game rules, tuning,
// positions, speeds, traffic or collision outcomes are changed by the fixture.
let memory=new Map();
globalThis.localStorage={getItem:key=>memory.get(key)??null,setItem:(key,value)=>memory.set(key,String(value))};
globalThis.window=new EventTarget();window.location={search:''};globalThis.Element=class{};globalThis.cancelAnimationFrame=()=>{};
const bootstrap=new App();bootstrap.dispose();const initialMemory=new Map(memory);
const options={car:'falcone_f42',startStage:0,mode:'timetrial',difficulty:'casual',cpuDifficulty:'medium',seed:1989};
function fixture(){
  memory=new Map(initialMemory);
  const app=new App();app.audio.unlock=()=>{};app.audio.setPaused=()=>{};app.startCampaign(options);app.runId='keyboard-fixture';
  return app;
}
const key=(type,code,repeat=false)=>{const event=new Event(type,{cancelable:true});Object.assign(event,{code,repeat});window.dispatchEvent(event);};
const pose=state=>[state.status,state.stageTimeSec,state.s,state.lateral,state.headingError,state.speedMph,state.steerVisual,state.slipAngle,state.stageCrashes,state.score,state.gear,state.input];
{
  const app=fixture();
  app.setCamera('front');key('keydown','KeyD');app._applyInput(dt);
  equal(app.cameraMode,'chase','removed front falls back to chase; D does not change the camera');
  equal(app.duel.state.input.steer,0,'D does not steer in the car');
  key('keyup','KeyD');key('keydown','KeyA');app._applyInput(dt);
  equal(app.duel.state.input.steer,0,'A does not steer in the car');
  key('keyup','KeyA');key('keydown','KeyW');app._applyInput(dt);
  near(app.duel.state.input.throttle,dt/(2*.6),1e-12,'W starts the road throttle ramp');
  key('keyup','KeyW');key('keydown','KeyS');app._applyInput(dt);
  equal(app.duel.state.input.brake,1,'S remains the brake pedal');
  key('keyup','KeyS');app.dispose();
}
function physicalTap({duration=.05,legacy=false,neutral=false,fps=60,keyCode='ArrowRight'}={}){
  const app=fixture();
  if(legacy)app._keyboardSteering={reset(){},update:direction=>direction}; // prior keyboard mapping, comparison only
  key('keydown','KeyW');app.advance(6,1/fps);
  const before=structuredClone(app.duel.state);
  check(before.status==='racing'&&before.speedMph>40&&before.stageCrashes===0,'normal input-only approach reaches road speed without a crash');
  let integral=0,predicted=0,frames=0;const step=app.duel.step.bind(app.duel);
  app.duel.step=seconds=>{
    integral+=app.duel.state.input.steer*seconds;
    const pressed=keyboardSteeringDirection(app.keys)!==0,previousS=app.duel.state.s;
    if(pressed){
      const mph=Math.abs(app.duel.state.speedMph),cap=1-.4*Math.min(1,Math.max(0,(mph-40)/80));
      predicted+=(.30+.70*(frames+.5)*seconds/.45)*cap*seconds;
    }
    frames++;const result=step(seconds);
    if(pressed){
      check(app.duel.state.s>previousS,'every actual tap step travels forward without a wall stop');
      check(app.duel.state.speedMph>40,'every actual tap step keeps road speed');
      check(app.duel.state.stageCrashes===0&&app.duel.state.status==='racing','every actual tap step keeps healthy native physics');
    }
    return result;
  };
  if(!neutral)key('keydown',keyCode);app.advance(duration,1/fps);
  const pressed=structuredClone(app.duel.state);key('keyup',keyCode);app.advance(dt,dt);
  equal(app.duel.state.input.steer,0,'real App removes keyboard steering on the first release step');
  check(app.duel.state.stageCrashes===0&&app.duel.state.status==='racing','short tap and release keep the actual race healthy');
  const result={before,pressed,integral,frames,predicted};app.dispose();return result;
}
const physical=[];
for(const duration of [.05,.1]){
  const control=physicalTap({duration,neutral:true}),old=physicalTap({duration,legacy:true}),soft=physicalTap({duration});
  near(soft.integral,soft.predicted,1e-12,'actual impulse matches the independent pressed-tick curve and speed cap');
  const yawRatio=Math.abs(soft.pressed.headingError-control.pressed.headingError)/Math.abs(old.pressed.headingError-control.pressed.headingError);
  const lateralRatio=Math.abs(soft.pressed.lateral-control.pressed.lateral)/Math.abs(old.pressed.lateral-control.pressed.lateral);
  check(yawRatio>0&&yawRatio<1,'real vehicle yaw response is positive and below the same full-key control');
  check(lateralRatio>0&&lateralRatio<1,'real lateral tap movement is positive and below the same full-key control');
  physical.push({tapMs:duration*1000,speedMph:+soft.before.speedMph.toFixed(2),inputRatio:+(soft.integral/old.integral).toFixed(4),yawRatio:+yawRatio.toFixed(4),lateralRatio:+lateralRatio.toFixed(4)});
}
const arrow=physicalTap({keyCode:'ArrowRight'});
check(arrow.pressed.input.steer>0,'right arrow steers the real car');

function trajectory(fps){
  const app=fixture(),hash=createHash('sha256'),step=app.duel.step.bind(app.duel);
  app.duel.step=seconds=>{const result=step(seconds);hash.update(JSON.stringify(pose(app.duel.state)));return result;};
  key('keydown','KeyW');app.advance(6,1/fps);
  for(const [code,seconds]of [['ArrowRight',.05],[null,.15],['ArrowLeft',.1],[null,.1],['ArrowRight',.3],[null,.15]]){
    if(code)key('keydown',code);app.advance(seconds,1/fps);if(code)key('keyup',code);
  }
  const result={hash:hash.digest('hex'),pose:pose(app.duel.state)};app.dispose();return result;
}
const trajectories=[30,60,144].map(trajectory);
equal(trajectories[0],trajectories[1],'30 and 60 FPS have identical fixed-step keyboard trajectories');
equal(trajectories[0],trajectories[2],'30 and 144 FPS have identical fixed-step keyboard trajectories');

// Input dispatch tests use the actual App adapter, including release events
// between physics steps and every lifecycle that could retain held-key history.
{
  const app=fixture();const fill=()=>{app.keys={ArrowRight:true,KeyW:true};for(let i=0;i<73;i++)app._applyInput(dt);equal(app.duel.state.input.steer,1,'held key reaches full steering promptly');equal(app.duel.state.input.throttle,1,'held throttle reaches full authority');};
  const fresh=()=>{app.keys={ArrowRight:true,KeyW:true};app._applyInput(dt);near(app.duel.state.input.steer,firstAuthority,1e-12,'lifecycle reset gives the next key a fresh ramp');near(app.duel.state.input.throttle,dt/(2*.6),1e-12,'lifecycle reset gives throttle a fresh ramp');};
  fill();key('keyup','ArrowRight');key('keydown','ArrowRight');app._applyInput(dt);near(app.duel.state.input.steer,firstAuthority,1e-12,'keyup and re-press between physics steps starts a new tap');
  fill();key('keydown','ArrowRight',true);app._applyInput(dt);equal(app.duel.state.input.steer,1,'OS key-repeat does not restart a sustained hold');
  fill();key('keydown','ArrowLeft');app._applyInput(dt);equal(app.duel.state.input.steer,0,'opposing arrow directions cancel immediately');key('keyup','ArrowLeft');app._applyInput(dt);near(app.duel.state.input.steer,firstAuthority,1e-12,'leaving opposed arrows starts fresh');
  fill();app.restart();fresh();
  fill();app.returnToMenu();app.startCampaign(options);fresh();
  app.startCampaign(options);fill();app.togglePause();app.resume();fresh();
  fill();window.dispatchEvent(new Event('blur'));app.resume();fresh();
  fill();app.duel.state.paused=true;app._applyInput(dt);app.duel.state.paused=false;fresh();
  fill();const owner={};app.claimVisualReadiness(owner);app._simulate(.1);app.presentVisualFrame(owner,app.duel.state,app.duel.course);fresh();
  fill();app.holdVisualReadiness(owner);app.presentVisualFrame(owner,app.duel.state,app.duel.course);fresh();
  fill();app.duel.emit({stageLoaded:0});fresh();
  app.releaseVisualReadiness(owner);app.dispose();
}
{
  const app=fixture();app.duel.state.status='racing';
  const previousNavigator=Object.getOwnPropertyDescriptor(globalThis,'navigator');
  Object.defineProperty(globalThis,'navigator',{configurable:true,value:{getGamepads:()=>[{connected:true,axes:[.56],buttons:Array.from({length:10},(_,i)=>({pressed:false,value:i===7?.63:i===6?.18:0}))}]}});
  for(let i=0;i<3;i++){
    app.keys={};app._applyInput(dt);near(app.duel.state.input.steer,.5,1e-12,'analog steering keeps the existing deadzone mapping without a ramp');
    equal([app.duel.state.input.throttle,app.duel.state.input.brake],[.63,.18],'controller pedal values are unchanged');
  }
  app.keys={ArrowLeft:true};app._applyInput(dt);near(app.duel.state.input.steer,-firstAuthority,1e-12,'left arrow has priority over analog while held');
  key('keyup','ArrowLeft');app._applyInput(dt);near(app.duel.state.input.steer,.5,1e-12,'arrow release immediately restores analog steering, with no residual keyboard tail');
  app.keys={KeyA:true,KeyD:true};app._applyInput(dt);near(app.duel.state.input.steer,.5,1e-12,'A and D leave analog steering unchanged');
  app.autopilot=true;app._keyboardSteering.update=()=>{throw Error('Autopilot must not pass through keyboard shaping');};
  app._applyInput(dt);check(Number.isFinite(app.duel.state.input.steer),'autopilot bypasses keyboard shaping');app.dispose();
  if(previousNavigator)Object.defineProperty(globalThis,'navigator',previousNavigator);else delete globalThis.navigator;
}
{
  const app=fixture();
  key('keydown','KeyW');for(let i=0;i<72;i++)app._applyInput(dt);
  key('keydown','KeyW',true);app._applyInput(dt);equal(app.duel.state.input.throttle,1,'OS repeats do not restart throttle');
  key('keydown','ArrowUp');key('keyup','KeyW');app._applyInput(dt);equal(app.duel.state.input.throttle,1,'W and Up are one pedal; releasing one keeps the hold');
  key('keyup','ArrowUp');app._applyInput(dt);equal(app.duel.state.input.throttle,0,'both throttle keys released are instantly neutral');
  key('keydown','KeyW');app._applyInput(dt);near(app.duel.state.input.throttle,dt/(2*.6),1e-12,'released pedal starts a fresh ramp');
  key('keyup','KeyW');key('keydown','KeyW');app._applyInput(dt);near(app.duel.state.input.throttle,dt/(2*.6),1e-12,'release and re-press between ticks resets throttle');
  app.setInputContext('foot');app._applyInput(dt);equal(app.duel.state.input.throttle,0,'on-foot controls never throttle the car');
  app.setInputContext('car');app.keys={KeyW:true};app._applyInput(dt);near(app.duel.state.input.throttle,dt/(2*.6),1e-12,'return from foot input starts fresh');
  app.autopilot=true;app._keyboardThrottle.update=()=>{throw Error('Autopilot must bypass throttle shaping');};app._applyInput(dt);app.dispose();
}
{
  const app=fixture();app.duel.state.wastelandGateDiscovered=true;app._clearHiddenRoadInput();
  const arenaOptions={car:'falcone_f42',seed:1989,cpuDifficulty:'medium',opponents:[{car:'falcone_f42',brain:'rammer'}]};
  equal(app.duel.startArenaEvent(arenaOptions),true,'real Scrapdome starts in memory-only App');
  check(app.duel.course.def.venue===true&&app.duel.course.def.arena===true,'actual Scrapdome has the exact arena predicate');
  let held=0,direction=0;
  for(const next of [1,1,1,0,-1,-1,1,...Array(70).fill(1)]){
    if(!next){held=0;direction=0;}
    else if(next!==direction){held=0;direction=next;}
    const area=time=>.78*time+(1-.78)*(time<.2?time*time/(2*.2):time-.2/2);
    const expected=!next?0:held>=.2?direction:direction*Math.min(1,Math.max(.78,(area(held+dt)-area(held))/dt));
    if(next)held=Math.min(.2,held+dt);
    app.keys={ArrowRight:next===1,ArrowLeft:next===-1,KeyW:true};app.duel.state.speedMph=200;app._applyInput(dt);
    equal(app.duel.state.input.steer,expected,'Scrapdome keyboard steering is byte-identical to the original curve');
    equal(app.duel.state.input.throttle,1,'Scrapdome keyboard throttle stays instant');
  }
  app._clearHiddenRoadInput();equal(app.duel.startArenaEvent(arenaOptions),true,'actual arena admission clear precedes Scrapdome reload');
  app.keys={ArrowRight:true,KeyW:true};app._applyInput(dt);
  near(app.duel.state.input.steer,.78+.22*(dt/2)/.2,1e-12,'arena reload starts the original curve fresh');
  equal(app.duel.state.input.throttle,1,'reloaded arena throttle remains instant');
  app.startCampaign(options);app.keys={ArrowRight:true,KeyW:true};app._applyInput(dt);
  near(app.duel.state.input.steer,firstAuthority,1e-12,'arena to road starts a fresh road steering ramp');
  near(app.duel.state.input.throttle,dt/(2*.6),1e-12,'arena to road starts a fresh road throttle ramp');app.dispose();
}
const raw=new Duel();raw.setInput({throttle:.37});equal(raw.state.input.throttle,.37,'raw Duel throttle is unchanged');raw.setInput({steer:.37});equal(raw.state.input.steer,.37,'raw Duel analog input remains exact');raw.setInput({steer:1});equal(raw.state.input.steer,1,'raw Duel full steering remains exact');
console.log(`Keyboard steering: ${checks} curve, input-only physics, release, lifecycle, FPS, analog and raw-input checks passed.`);
console.log(JSON.stringify({physicalTapComparisons:physical,trajectoryHash:trajectories[0].hash.slice(0,16)}));
