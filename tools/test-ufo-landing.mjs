import assert from 'node:assert/strict';
import {Duel} from '../src/game.js';
import {COURSE,DRIVE,steeringYawAuthority} from '../src/config.js';
import {supportsCombat} from '../src/combat.js';

const stages=COURSE.map((stage,index)=>supportsCombat(stage)?index:null).filter(index=>index!==null);
assert.equal(stages.length,11,'the swap matrix covers all 11 combat courses');
let shortcutLandings=0;
for(let n=0;n<100;n++){
  const stage=stages[n%stages.length],seed=9100+n*37;
  const duel=new Duel({seed});duel.startCampaign({mode:'wasteland',startStage:stage,cpuDifficulty:'hard'});
  const player=duel.state,rival=player.rival,course=duel.course;
  player.status='racing';player.traffic=[];
  const cut=course.features.shortcuts?.[0],onShortcut=Boolean(cut&&n%2===0);
  if(onShortcut){
    const phase=.08+.84*(n%9)/8,landingS=cut.start+(cut.end-cut.start)*phase;
    rival.s=landingS;rival.lateral=course.shortcutOffset(cut,landingS);
    const ahead=course.worldAt(landingS+.5,course.shortcutOffset(cut,landingS+.5));
    const behind=course.worldAt(landingS-.5,course.shortcutOffset(cut,landingS-.5));
    const tangent=Math.atan2(ahead.x-behind.x,ahead.z-behind.z);
    rival.headingError=Math.atan2(Math.sin(tangent-course.at(landingS).heading),Math.cos(tangent-course.at(landingS).heading));
    player.s=landingS-40;shortcutLandings++;
  }else{
    player.s=course.length*(.27+.002*(n%13));rival.s=player.s+40;
    rival.lateral=-3.4;rival.headingError=0;
  }
  player.lateral=-3.4;player.headingError=0;
  player.speedMph=110+n%5*8;rival.speedMph=100+n%7*7;
  assert.ok(duel.fireWeapon('ufo'),`swap fires on ${COURSE[stage].id} seed ${seed}`);
  const crashes=player.stageCrashes,resets=player.boundaryResets;
  for(let frame=0;frame<120&&player.status==='racing';frame++){
    // Drive the landing corridor with the same steering model as the game demo.
    const metresPerSec=player.speedMph*DRIVE.mphToWorld;
    const targetLateral=onShortcut&&player.s<cut.end?course.shortcutOffset(cut,player.s):-3.4;
    const headingTarget=Math.atan((targetLateral-player.lateral)*2.5/Math.max(15,metresPerSec));
    const desiredYaw=course.at(player.s+metresPerSec*.18).curvature*metresPerSec+(headingTarget-player.headingError)*6;
    const traction=duel._drivingSurface(player.s,player.lateral).traction;
    const authority=Math.max(.05,steeringYawAuthority(player.speedMph,duel.car.grip,traction));
    duel.setInput({throttle:0,brake:0,steer:Math.max(-1,Math.min(1,-desiredYaw/authority))});
    duel.step(1/60);
  }
  assert.equal(player.stageCrashes,crashes,`no landing crash on ${COURSE[stage].id} seed ${seed}`);
  assert.equal(player.boundaryResets,resets,`no landing reset on ${COURSE[stage].id} seed ${seed}`);
  assert.ok(!rival.crushed,`rival survives landing on ${COURSE[stage].id} seed ${seed}`);
}
assert.ok(shortcutLandings>=15,'the matrix includes at least 15 shortcut landings');
console.log(`UFO landing: 100 seeded swaps across ${stages.length} combat courses, ${shortcutLandings} shortcut landings, zero crashes or resets within two seconds.`);
