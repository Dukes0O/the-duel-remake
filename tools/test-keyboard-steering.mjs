import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {App} from '../src/app.js';
import {Duel} from '../src/game.js';
import {createKeyboardSteering,keyboardSteeringDirection,KEYBOARD_STEERING_START,KEYBOARD_STEERING_RISE_SEC} from '../src/keyboard-steering.js';

let checks=0;
const check=(value,label)=>{assert(value,label);checks++;};
const equal=(a,b,label)=>{assert.deepEqual(a,b,label);checks++;};
const near=(a,b,tolerance,label)=>check(Math.abs(a-b)<=tolerance,`${label}: ${a} vs ${b}`);
const dt=1/120,firstAuthority=.78+.22*(dt/2)/.2;
equal([KEYBOARD_STEERING_START,KEYBOARD_STEERING_RISE_SEC],[.78,.2],'keyboard-only curve starts at 78% and reaches full in 200 ms');
for(const [keys,want]of [[{},0],[{KeyA:true},0],[{ArrowLeft:true},-1],[{KeyD:true},0],[{ArrowRight:true},1],[{KeyA:true,ArrowRight:true},1],[{ArrowLeft:true,ArrowRight:true},0],[{KeyD:true,KeyA:true},0],[{KeyD:true,ArrowLeft:true},-1]])
  equal(keyboardSteeringDirection(keys),want,'only arrow keys steer; A and D never steer');
for(const [duration,want]of [[.025,.79375],[.05,.8075],[.1,.835],[.2,.89],[.5,.956]]){
  const steering=createKeyboardSteering();let integral=0;
  for(let i=0;i<Math.round(duration/dt);i++)integral+=steering.update(1,dt)*dt;
  near(integral/duration,want,1e-12,`${duration*1000} ms keyboard hold has the exact integrated authority`);
}
{
  const steering=createKeyboardSteering();near(steering.update(-1,dt),-firstAuthority,1e-12,'left and right use the same soft onset');
  for(let i=0;i<24;i++)steering.update(-1,dt);
  equal(steering.update(-1,dt),-1,'sustained key has full authority');
  equal(steering.update(0,dt),0,'release is immediate with no steering tail');
  near(steering.update(-1,dt),-firstAuthority,1e-12,'a fresh tap starts gently again');
  near(steering.update(1,dt),firstAuthority,1e-12,'direction reversal resets immediately, without crossing through a decaying old input');
  steering.reset();near(steering.update(1,dt),firstAuthority,1e-12,'explicit reset drops held-key history');
  for(const invalid of [NaN,Infinity,-1,0])equal(steering.update(1,invalid),0,'invalid elapsed time cannot create a steering spike');
  equal(steering.update(NaN,dt),0,'invalid direction is neutral');
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
  equal(app.cameraMode,'chase','D resets the chase camera through the real key handler');
  equal(app.duel.state.input.steer,0,'D does not steer in the car');
  key('keyup','KeyD');key('keydown','KeyA');app._applyInput(dt);
  equal(app.duel.state.input.steer,0,'A does not steer in the car');
  key('keyup','KeyA');key('keydown','KeyW');app._applyInput(dt);
  equal(app.duel.state.input.throttle,1,'W remains the throttle pedal');
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
  let integral=0,frames=0;const step=app.duel.step.bind(app.duel);
  app.duel.step=seconds=>{integral+=app.duel.state.input.steer*seconds;frames++;return step(seconds);};
  if(!neutral)key('keydown',keyCode);app.advance(duration,1/fps);
  const pressed=structuredClone(app.duel.state);key('keyup',keyCode);app.advance(dt,dt);
  equal(app.duel.state.input.steer,0,'real App removes keyboard steering on the first release step');
  check(app.duel.state.stageCrashes===0&&app.duel.state.status==='racing','short tap and release keep the actual race healthy');
  const result={before,pressed,integral,frames};app.dispose();return result;
}
const physical=[];
for(const duration of [.05,.1]){
  const control=physicalTap({duration,neutral:true}),old=physicalTap({duration,legacy:true}),soft=physicalTap({duration});
  near(soft.integral/old.integral,duration===.05?.8075:.835,1e-12,'real fixed-step App supplies the exact reduced tap impulse');
  const yawRatio=Math.abs(soft.pressed.headingError-control.pressed.headingError)/Math.abs(old.pressed.headingError-control.pressed.headingError);
  const lateralRatio=Math.abs(soft.pressed.lateral-control.pressed.lateral)/Math.abs(old.pressed.lateral-control.pressed.lateral);
  check(yawRatio>.74&&yawRatio<.9,'real vehicle yaw response is softer by a modest amount');
  check(lateralRatio>.74&&lateralRatio<.9,'real lateral tap movement is softer by a modest amount');
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
  const app=fixture();const fill=()=>{app.keys={ArrowRight:true};for(let i=0;i<30;i++)app._applyInput(dt);equal(app.duel.state.input.steer,1,'held key reaches full steering promptly');};
  const fresh=()=>{app.keys={ArrowRight:true};app._applyInput(dt);near(app.duel.state.input.steer,firstAuthority,1e-12,'lifecycle reset gives the next key a fresh ramp');};
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
}
const raw=new Duel();raw.setInput({steer:.37});equal(raw.state.input.steer,.37,'raw Duel analog input remains exact');raw.setInput({steer:1});equal(raw.state.input.steer,1,'raw Duel full steering remains exact');
console.log(`Keyboard steering: ${checks} curve, input-only physics, release, lifecycle, FPS, analog and raw-input checks passed.`);
console.log(JSON.stringify({physicalTapComparisons:physical,trajectoryHash:trajectories[0].hash.slice(0,16)}));
