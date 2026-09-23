import assert from 'node:assert/strict';
import {Duel} from '../src/game.js';
import {COURSE,DRIVE,steeringYawAuthority} from '../src/config.js';
import {supportsCombat,ufoDestination} from '../src/combat.js';

const stages=COURSE.map((stage,index)=>supportsCombat(stage)?index:null).filter(index=>index!==null);
assert.equal(stages.length,11,'the landing matrix covers all 11 combat courses');
let shortcutLandings=0,landings=0;
for(let n=0;n<260&&landings<100;n++){
  const onShortcut=n%4===0,stage=onShortcut?stages[0]:stages[n%stages.length],seed=9100+n*37;
  const duel=new Duel({seed});duel.startCampaign({mode:'wasteland',startStage:stage,cpuDifficulty:'hard'});
  const player=duel.state,rival=player.rival,course=duel.course;
  player.status='racing';player.traffic=[];
  const cut=course.features.shortcuts?.[0];
  const sourceS=onShortcut?cut.start+20+(cut.end-cut.start-60)*(n%9)/8
    :duel._lapGates[0]+50+(n*73)%(course.length-duel._lapGates[0]-250);
  player.s=player.prevS=sourceS;
  player.nextLapGate=duel._lapGates.findIndex(gate=>gate>sourceS+1);
  if(player.nextLapGate<0)player.nextLapGate=duel._lapGates.length;
  player.lateral=player.prevLateral=onShortcut?course.shortcutOffset(cut,sourceS):-DRIVE.laneOffset;
  player.speedMph=110+n%5*8;rival.s=sourceS+45;rival.lateral=-DRIVE.laneOffset;
  rival.speedMph=100+n%7*7;
  const preview=ufoDestination(duel);
  if(preview.kind==='blocked')continue;
  const beforeLap=player.completedLaps,beforeGate=player.nextLapGate,beforeRival=rival.s;
  assert.ok(duel.fireWeapon('ufo'),'jump fires on '+COURSE[stage].id+' seed '+seed);
  landings++;if(onShortcut)shortcutLandings++;
  assert.equal(player.s,preview.toS,'actual route position matches the visible preview');
  assert.equal(player.lateral,preview.lateral,'actual lane matches the visible preview');
  assert.equal(player.completedLaps,beforeLap,'jump does not skip a lap');
  assert.equal(player.nextLapGate,beforeGate,'jump does not skip a checkpoint');
  assert.equal(rival.s,beforeRival,'jump never relocates the rival');
  const crashes=player.stageCrashes,resets=player.boundaryResets;
  for(let frame=0;frame<120&&player.status==='racing';frame++){
    const metresPerSec=player.speedMph*DRIVE.mphToWorld;
    const surface=duel._surface(player.s,player.lateral);
    const activeCut=course.features.shortcuts?.find(branch=>branch.id===surface.shortcutId);
    const targetLateral=activeCut&&player.s<activeCut.end?course.shortcutOffset(activeCut,player.s):-DRIVE.laneOffset;
    const headingTarget=Math.atan((targetLateral-player.lateral)*2.5/Math.max(15,metresPerSec));
    const desiredYaw=course.at(player.s+metresPerSec*.18).curvature*metresPerSec+(headingTarget-player.headingError)*6;
    const traction=duel._drivingSurface(player.s,player.lateral).traction;
    const authority=Math.max(.05,steeringYawAuthority(player.speedMph,duel.car.grip,traction));
    duel.setInput({throttle:0,brake:0,steer:Math.max(-1,Math.min(1,-desiredYaw/authority))});
    duel.step(1/60);
  }
  assert.equal(player.stageCrashes,crashes,'no landing crash on '+COURSE[stage].id+' seed '+seed);
  assert.equal(player.boundaryResets,resets,'no landing reset on '+COURSE[stage].id+' seed '+seed);
}
assert.equal(landings,100,'one hundred seeded safe jumps are available');
assert.ok(shortcutLandings>=15,'matrix includes at least fifteen shortcut landings');
console.log('UFO landing: '+landings+' safe jumps across '+stages.length+' combat courses, '+shortcutLandings+' on shortcuts, zero crashes or resets within two seconds.');
