import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createJumpHeightReadout} from '../src/jump-height.js';
import {Duel} from '../src/game.js';
import {COURSE,DRIVE,steeringYawAuthority} from '../src/config.js';

let checks=0;
const check=(value,label)=>{assert.ok(value,label);checks++;};
const same=(actual,expected,label)=>{assert.deepEqual(actual,expected,label);checks++;};
const HIDDEN={phase:'hidden',heightMeters:0,peakMeters:0};
const state=(extra={})=>({status:'racing',stageTimeSec:1,airborne:false,airHeight:0,impactTimer:0,stageCrashes:0,boundaryResets:0,...extra});
// No ground sampling is needed: airHeight already measures clearance over the
// local terrain, not elevation above sea level or a visual suspension offset.
const course=Object.freeze({groundAt(){throw Error('HUD must use simulation airHeight, not sample terrain');}});
function flight(readout,height=3,time=1,extra={}){return readout.update(state({airborne:true,airHeight:height,stageTimeSec:time,...extra}),course);}

{
  const r=createJumpHeightReadout();same(r.update(state(),course),HIDDEN,'a grounded car has no jump readout');same(r.update(undefined,course),HIDDEN,'missing state is safe');same(r.update(state({airborne:true,airHeight:2}),null),HIDDEN,'missing course clears stale height');
  same(flight(r,.25,1),{phase:'airborne',heightMeters:.25,peakMeters:.25},'flight starts with real ground clearance');
  same(flight(r,4.125,1.5),{phase:'airborne',heightMeters:4.125,peakMeters:4.125},'rising height is not rounded by the helper');
  same(flight(r,1.25,2),{phase:'airborne',heightMeters:1.25,peakMeters:4.125},'descent keeps the current jump peak');
  const landing=state({stageTimeSec:2.5,_jumpY:0});
  same(r.update(landing,course),{phase:'landed',heightMeters:0,peakMeters:4.125},'landing shows the peak, not stale airborne height');
  same(r.update({...landing,stageTimeSec:4.499},course).phase,'landed','peak remains visible just before two simulation seconds');
  same(r.update({...landing,stageTimeSec:4.5},course),HIDDEN,'peak clears exactly two simulation seconds after landing');
  same(r.update({...landing,stageTimeSec:20},course),HIDDEN,'grounded updates do not revive an expired peak');
}
{
  const r=createJumpHeightReadout();flight(r,6,1);r.update(state({stageTimeSec:2}),course);
  same(flight(r,.2,2.5),{phase:'airborne',heightMeters:.2,peakMeters:.2},'a fresh flight resets the prior jump peak during its hold');
  flight(r,1.5,3);same(r.update(state({stageTimeSec:3.5}),course),{phase:'landed',heightMeters:0,peakMeters:1.5},'new landing starts its own hold');
  same(r.update(state({stageTimeSec:5.499}),course).phase,'landed','a repeated jump is not timed from the previous landing');same(r.update(state({stageTimeSec:5.5}),course),HIDDEN,'the second landing also expires after two seconds');
}
for(const airHeight of [NaN,Infinity,-Infinity,-3,undefined,null,'4']){
  const r=createJumpHeightReadout(),value=r.update(state({airborne:true,airHeight}),course);
  same(value,{phase:'airborne',heightMeters:0,peakMeters:0},'invalid or negative airborne height cannot leak NaN, text or negative metres');
  same(r.update(state({airHeight:50,stageTimeSec:2}),course),{phase:'landed',heightMeters:0,peakMeters:0},'grounded state never displays stale airHeight');
}
{
  const r=createJumpHeightReadout();flight(r,2,1);same(flight(r,NaN,1.5),{phase:'airborne',heightMeters:0,peakMeters:2},'an invalid transient sample cannot corrupt an existing finite peak');
  same(flight(r,0,1.6),{phase:'airborne',heightMeters:0,peakMeters:2},'airborne launch and landing edges can validly have zero clearance');
}
for(const status of ['menu','countdown','ticket','stage_result','complete','gameover']){
  const r=createJumpHeightReadout();flight(r,5);
  same(r.update(state({status,stageTimeSec:2,airborne:true,airHeight:5}),course),HIDDEN,`${status} hides and resets jump data`);
  same(r.update(state({stageTimeSec:3}),course),HIDDEN,`${status} cannot leave a fake landed peak when racing resumes`);
  same(flight(r,.4,4).peakMeters,.4,`${status} cannot contaminate the next jump peak`);
}
for(const stageTimeSec of [NaN,Infinity,-Infinity,-1,undefined]){
  const r=createJumpHeightReadout();flight(r,5);
  same(r.update(state({stageTimeSec,airborne:true,airHeight:5}),course),HIDDEN,'invalid or negative simulation time resets presentation safely');
  same(r.update(state({stageTimeSec:2}),course),HIDDEN,'invalid clock cannot resume an old landing hold');
}
{
  const r=createJumpHeightReadout();flight(r,9,10);
  same(r.update(state({airborne:true,airHeight:1,stageTimeSec:11}),{}),{phase:'airborne',heightMeters:1,peakMeters:1},'course identity change starts a fresh peak from the current flight sample');
  same(flight(r,.5,.1),{phase:'airborne',heightMeters:.5,peakMeters:.5},'clock rewind cannot preserve the old-course peak');
  flight(r,8,10);same(flight(r,.25,2),{phase:'airborne',heightMeters:.25,peakMeters:.25},'same-course clock rewind resets the current peak');
  r.update(state({stageTimeSec:3}),course);same(r.update(state({stageTimeSec:1}),course),HIDDEN,'rewinding a landed readout clears its timer');
}
{
  const r=createJumpHeightReadout();flight(r,4,1);
  same(flight(r,4,2,{impactTimer:.2}),HIDDEN,'active impact hides stale crash height immediately');
  same(r.update(state({stageTimeSec:3,_jumpY:null}),course),HIDDEN,'crash recovery cannot masquerade as landing');
  same(flight(r,.5,4,{invulnerableSec:1}),{phase:'airborne',heightMeters:.5,peakMeters:.5},'a genuine new flight still displays during recovery protection');
}
for(const extra of [{stageCrashes:1},{boundaryResets:1},{_jumpY:null}]){
  const r=createJumpHeightReadout();flight(r,4,1);
  same(r.update(state({stageTimeSec:2,...extra}),course),HIDDEN,'missed-render crash or safety recovery clears the airborne peak');
  same(r.update(state({stageTimeSec:2.5,...extra}),course),HIDDEN,'recovery never starts a landing hold');
}
{
  const r=createJumpHeightReadout();flight(r,4,1);r.update(state({stageTimeSec:2,_jumpY:10}),course);
  same(r.update(state({stageTimeSec:2.5,_jumpY:null}),course),HIDDEN,'a safety reset also clears an already landed hold');
}
{
  const r=createJumpHeightReadout(),air=Object.freeze(state({stageTimeSec:1,airborne:true,airHeight:2,paused:true})),before=JSON.stringify(air);
  const shown=r.update(air,course);Object.freeze(shown);
  for(let i=0;i<100;i++)assert.deepEqual(r.update(air,course),shown);
  same(JSON.stringify(air),before,'readout never mutates frozen simulation input');
  const landed=Object.freeze(state({stageTimeSec:2,paused:true})),held=r.update(landed,course);
  for(let i=0;i<100;i++)assert.deepEqual(r.update(landed,course),held);
  same(held,{phase:'landed',heightMeters:0,peakMeters:2},'pause freezes the landing hold because stageTimeSec is frozen');
  same(r.update({...landed,stageTimeSec:3.999,paused:false},course).phase,'landed','resume retains the remaining simulation-time hold');
  same(r.update({...landed,stageTimeSec:4,paused:false},course),HIDDEN,'only resumed race time expires the hold');
  same(shown,{phase:'airborne',heightMeters:2,peakMeters:2},'later updates do not mutate previously returned readout objects');
}

// A real Titan ramp flight, driven with ordinary inputs. No jump state, pose,
// height, velocity, lap validation or scoring is injected. Baseline and helper
// runs must produce identical physics at different display frame rates.
const stageIndex=COURSE.findIndex(stage=>stage.id==='titan-stunt-trial');
function rampInput(d){
  const s=d.state,mps=s.speedMph*DRIVE.mphToWorld,surface=d._drivingSurface(s.s,s.lateral);
  const heading=Math.atan(-s.lateral*2.5/Math.max(15,mps)),look=d.course.at(s.s+mps*.18);
  const yaw=look.curvature*mps+(heading-s.headingError)*6,authority=Math.max(.05,steeringYawAuthority(s.speedMph,d.car.grip,surface.traction));
  d.setInput({throttle:1,brake:0,steer:Math.max(-1,Math.min(1,-yaw/authority)),boost:false});
}
function rampRun(fps,withReadout){
  const d=new Duel({seed:1989});d.startCampaign({startStage:stageIndex,car:'titan_monster',cpuDifficulty:'hard',difficulty:'casual'});
  const r=withReadout?createJumpHeightReadout():null,physics=createHash('sha256'),presentation=createHash('sha256');
  let accumulator=0,steps=0,wasAirborne=false,launchAt=null,landedAt=null,peak=0,paused=false,last=HIDDEN;
  while(steps<1560){
    accumulator+=1/fps;
    while(accumulator>=1/120-1e-10&&steps<1560){
      rampInput(d);d.step(1/120);accumulator-=1/120;steps++;
      const s=d.state;if(s.airborne){if(launchAt===null)launchAt=s.stageTimeSec;peak=Math.max(peak,s.airHeight);}
      if(wasAirborne&&!s.airborne&&landedAt===null)landedAt=s.stageTimeSec;
      if(r){
        const before=JSON.stringify(s);last=r.update(s,d.course);assert.equal(JSON.stringify(s),before,'HUD update leaves every real simulation field unchanged');
        if(s.airborne)assert.deepEqual(last,{phase:'airborne',heightMeters:s.airHeight,peakMeters:peak},'displayed flight and peak match real physics exactly');
        else if(landedAt!==null&&s.stageTimeSec-landedAt<2-1e-9)assert.deepEqual(last,{phase:'landed',heightMeters:0,peakMeters:peak},'real landing retains the physical peak');
        else assert.deepEqual(last,HIDDEN,'grounded real run is hidden before flight and after expiry');
        presentation.update(JSON.stringify(last));presentation.update('\n');
      }
      if(s.airborne&&!paused){
        s.paused=true;const before=JSON.stringify(s),frozen=r?.update(s,d.course);
        for(let i=0;i<120;i++){d.step(1/120);if(r)assert.deepEqual(r.update(s,d.course),frozen,'actual paused Duel freezes its height and peak');}
        assert.equal(JSON.stringify(s),before,'pause advances neither physics nor its simulation clock');s.paused=false;paused=true;
      }
      wasAirborne=s.airborne;physics.update(JSON.stringify(s));physics.update('\n');
    }
  }
  check(launchAt!==null&&landedAt>launchAt&&peak>1,'ordinary driving produces a real ramp flight and landing above one metre');
  same(d.state.jumps,1,'presentation neither creates nor repeats scored jumps');same([d.state.stageCrashes,d.state.majorCrashes],[0,0],'bounded ramp replay remains clean');
  if(r){same(last,HIDDEN,'real landing peak expires after two running seconds');check(paused,'real pause was exercised during flight');}
  const result={physics:physics.digest('hex'),presentation:withReadout?presentation.digest('hex'):null,launchAt,landedAt,peak,score:d.state.score,jumps:d.state.jumps};
  if(r){d.startCampaign({startStage:stageIndex});same(r.update(d.state,d.course),HIDDEN,'real campaign restart clears the height display');}
  return result;
}
const baseline=rampRun(30,false),at30=rampRun(30,true),at144=rampRun(144,true);
same(at30.physics,baseline.physics,'adding the readout has zero effect on the entire simulation trajectory');same(at144.physics,baseline.physics,'physics stays exact at 30 and 144 FPS');
same(at144,at30,'per-physics-step height, peak, timing and scoring are deterministic across frame rates');
console.log(`Jump height: ${checks} checks passed; real ramp peak ${at30.peak.toFixed(3)}m, airborne ${(at30.landedAt-at30.launchAt).toFixed(3)}s. Readout has no physics, score or save side effects.`);
