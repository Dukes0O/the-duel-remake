import assert from 'node:assert/strict';
import test from 'node:test';
import {Duel} from '../src/game.js';
import {footControlInput, footGamepadInput} from '../src/input-contexts.js';
import {onFootCameraPose} from '../src/onfoot-camera.js';

const STEP=1/120;
const ticks=(duel,count)=>{for(let i=0;i<count;i++)duel.step(STEP);};

test('WASD and gamepad feed fixed-step fighter movement and terrain-safe camera',()=>{
  const duel=new Duel({seed:1989,featureFlags:{wasteland2:true},
    destructiblesEnabled:false});
  duel.startCampaign({mode:'wasteland',car:'falcone_f42',seed:1989,
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
  assert.ok(state.fighter.yaw>start.yaw);
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
