import assert from 'node:assert/strict';
import test from 'node:test';
import {LegacyRoadsideDuel} from './legacy-roadside-duel.mjs';
import {footControlInput, footGamepadInput} from '../src/input-contexts.js';
import {onFootCameraPose} from '../src/onfoot-camera.js';

const STEP=1/120;
const ticks=(duel,count)=>{for(let i=0;i<count;i++)duel.step(STEP);};

test('WASD and gamepad feed fixed-step fighter movement and terrain-safe camera',()=>{
  const duel=new LegacyRoadsideDuel({seed:1989});
  duel.startCampaign({mode:'wasteland',car:'falcone_f42',seed:1989,discoveredGate:true,
    startStage:0});
  const state=duel.state;
  Object.assign(state,{status:'racing',countdown:0,s:500,prevS:500,
    lateral:0,prevLateral:0,traffic:[],opponents:[]});
  state.combat.aiTimer=Infinity;
  state.combat.pickupTimer=Infinity;
  duel.setInput({interact:true});
  ticks(duel,48);
  assert.equal(state.onFoot,true);
  duel.setInput({interact:false});
  ticks(duel,1);

  const start={x:state.fighter.x,z:state.fighter.z,yaw:state.fighter.yaw};
  const keys={KeyW:true,ShiftLeft:true};
  const pointer={lookX:24,lookY:-8,fire:true,aim:false};
  const control=footControlInput(keys,{},pointer);
  assert.equal(control.forward,true);
  assert.equal(control.sprint,true);
  assert.equal(control.fire,true);
  assert.equal(duel.setFighterInput(control),true);
  ticks(duel,1);
  // Mouse right turns the view right, which lowers yaw in this camera frame.
  assert.ok(state.fighter.yaw<start.yaw);
  assert.equal(state.fighterInput.lookX,0,'mouse delta is consumed once');
  duel.setFighterInput(footControlInput(keys,{},{}));
  ticks(duel,100);
  assert.ok(Math.hypot(state.fighter.x-start.x,state.fighter.z-start.z)>4);

  const pad=footGamepadInput({axes:[-.6,-.9,.7,-.4],
    buttons:Array.from({length:12},(_,i)=>({value:i===7?.8:0}))},
  Array.from({length:12},(_,i)=>i===0||i===2||i===10),STEP);
  assert.equal(pad.forward,true);
  assert.equal(pad.left,true);
  assert.equal(pad.jump,true);
  assert.equal(pad.interact,true);
  assert.equal(pad.fire,true);
  assert.ok(pad.lookX>0 && pad.lookY<0);

  const pose=onFootCameraPose(duel.course,state.fighter);
  const near=duel.course.nearest(pose.position.x,pose.position.z,
    state.fighter.s);
  const ground=duel.course.groundAt(near.s,near.lateral);
  assert.ok(pose.position.y>=ground.y+.65);
  assert.ok(Math.abs(pose.position.y-state.fighter.y-1.62)<1e-8);
  assert.ok(Number.isFinite(pose.target.x));
  assert.equal(onFootCameraPose(duel.course,null),null);
});

// Kyle, 12 October 2026: "they do not turn left and right". With the keyboard
// alone, Left/Right and A/D turn the fighter and the camera follows; Q/E step
// sideways without turning.
test('holding Right turns the fighter right and the camera follows, Left turns left, Q and E only strafe',()=>{
  const fresh=()=>{
    const duel=new LegacyRoadsideDuel({seed:1989});
    duel.startCampaign({mode:'wasteland',car:'falcone_f42',seed:1989,discoveredGate:true,startStage:0});
    const state=duel.state;
    Object.assign(state,{status:'racing',countdown:0,s:500,prevS:500,lateral:0,prevLateral:0,traffic:[],opponents:[]});
    state.combat.aiTimer=Infinity;state.combat.pickupTimer=Infinity;
    duel.setInput({interact:true});ticks(duel,48);
    duel.setInput({interact:false});ticks(duel,1);
    assert.equal(state.onFoot,true);
    return duel;
  };
  const heading=pose=>Math.atan2(pose.target.x-pose.position.x,pose.target.z-pose.position.z);
  for(const [keys,sign] of [[{ArrowRight:true},-1],[{KeyD:true},-1],[{ArrowLeft:true},1],[{KeyA:true},1]]){
    const duel=fresh(),f=duel.state.fighter,start={yaw:f.yaw,x:f.x,z:f.z};
    const before=heading(onFootCameraPose(duel.course,f));
    duel.setFighterInput(footControlInput(keys,{},{}));
    ticks(duel,60);
    // Yaw falls when turning right, as it does for the mouse.
    assert.ok((f.yaw-start.yaw)*sign>1,Object.keys(keys)[0]+' turns about 1.2 rad in half a second: '+(f.yaw-start.yaw));
    assert.ok(Math.abs(f.yaw-start.yaw-sign*2.4*.5)<1e-6,'turn rate is 2.4 rad/s');
    const after=heading(onFootCameraPose(duel.course,f));
    assert.ok(Math.abs(Math.atan2(Math.sin(after-before),Math.cos(after-before))-(f.yaw-start.yaw))<1e-6,
      'the camera turns with the fighter');
    assert.equal(Math.hypot(f.x-start.x,f.z-start.z),0,'turning alone does not walk');
  }
  const duel=fresh(),f=duel.state.fighter,start={yaw:f.yaw,x:f.x,z:f.z};
  duel.setFighterInput(footControlInput({KeyE:true},{},{}));ticks(duel,60);
  assert.equal(f.yaw,start.yaw,'E strafes without turning');
  assert.ok(Math.hypot(f.x-start.x,f.z-start.z)>1,'E steps sideways');
  const walker=fresh(),w=walker.state.fighter,from={x:w.x,z:w.z,yaw:w.yaw};
  walker.setFighterInput(footControlInput({KeyW:true,ArrowRight:true},{},{}));ticks(walker,120);
  assert.ok(Math.hypot(w.x-from.x,w.z-from.z)>3&&w.yaw<from.yaw-2,'walking while turning curves the path');
});
