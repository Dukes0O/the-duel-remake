import assert from 'node:assert/strict';
import * as THREE from 'three';
import {readFile} from 'node:fs/promises';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {EngineAudio, combatAudioSpace} from '../src/audio.js';
import {SOUND_BANK} from '../src/sound-bank.js';
import {createScablandsScene} from '../src/world/scablands-scene.js';
import {createCombatEffects, smokeHazeOpacity} from '../src/combat-effects.js';
import {syncScene} from '../src/scene-systems.js';
import {Duel} from '../src/game.js';
import {App} from '../src/app.js';
import {arenaResultsScreen} from '../src/screen-arena.js';
import {createFeatureFlags} from '../src/feature-flags.js';
import {worldPose} from '../src/arena/arena-floor.js';
import {placeActor} from '../src/arena/arena-event.js';
import {arenaActor, arenaParticipant} from '../src/combat-teams.js';
import {COMBAT_TUNING} from '../src/wasteland-tuning.js';
import {applyArmorDamage} from '../src/combat-armor.js';
import {fireWeapon} from '../src/combat-weapons.js';
import {setCarEffect, carEffect} from '../src/arsenal/car-effects.js';
import {hazardsFor} from '../src/arsenal/hazards.js';
import {targetFor} from '../src/arsenal/targeting.js';
import {WEAPON_IDS, ARSENAL_WEAPONS} from '../src/weapon-upgrades.js';
import {scablandsActorHeightAt, scablandsSurfaceHeightAt} from '../src/world/scablands-ground.js';
import {sees} from '../src/world/scablands-ways.js';
import {EVERBURN_JOBS} from '../src/world/jobs/everburn.js';
import {stepJob} from '../src/world/jobs/job-engine.js';
import {RIDER_RULE as RULE} from '../src/world/jobs/rider-rule.js';
import {washRiderJob} from '../src/world/jobs/wash-riders.js';
import {throwRiderAsh, updateRoadFight} from '../src/arena/modes/road-riders.js';
import {readySource, prepareSource, visitReadySource, visitSource, yardSource, loadedSource, fightSource, stateSource} from './scenarios/road-riders.mjs';

const DT = 1 / 60;
const FLAGS = {'hidden-road':true, 'road-riders':true, 'scablands-realism':true, arsenal:true, 'arsenal-wave3':true};
const nativeWeapons = [...WEAPON_IDS, ...Object.keys(ARSENAL_WEAPONS)];
const distance = (a,b) => Math.hypot(a.x-b.x, a.z-b.z);
const selected = process.argv[2];

function runEvent({seed=1, difficulty='easy', count=1, boxIn=false, fightToEnd=false, overrides={}, flags=FLAGS, job, weaponLoadout=['crossbow','bomb','star']}={}) {
  const duel = new Duel({seed,featureFlags:flags});
  duel.state.wastelandGateDiscovered = true;
  job ??= washRiderJob({seed,count,boxIn,fightToEnd});
  assert.ok(duel.startArenaEvent({venueId:'scablands',mode:'world-job',car:'falcone_f42',opponents:[],
    cpuDifficulty:difficulty,seed,weaponLoadout,job,...overrides}), 'native Scablands event starts');
  while (duel.state.status === 'countdown') duel.step(DT);
  const state = duel.state, world = state.arena.worldJob;
  const events = [];
  duel.onChange((_state, event) => {
    if (event.riderFight || event.riderAsh || event.vehicleSmash || event.combatRamHit || event.weaponFired || event.arenaTell || event.arsenalCue) events.push(event);
  });
  return {duel,state,world,fight:world?.riderFight,events};
}

function advance(sim, seconds, input, until) {
  for (let frame=0; frame<Math.ceil(seconds/DT); frame++) {
    input?.(sim,frame);
    sim.duel.step(DT);
    if (until?.(sim)) break;
  }
}

function place(sim, car, location, heading=0, speed=0) {
  const {duel} = sim;
  const near = duel.course.nearest(location.x,location.z);
  placeActor(duel,car,{...near,headingError:heading-duel.course.at(near.s).heading,
    height:scablandsActorHeightAt(location.x,location.z,location.y)},speed);
}

function rulesAndRoster() {
  const saved=new Map();
  globalThis.localStorage={getItem:key=>saved.get(key)??null,setItem:(key,value)=>saved.set(key,String(value)),removeItem:key=>saved.delete(key)};
  globalThis.cancelAnimationFrame ??= ()=>{};
  const app=new App();app.audio.unlock=()=>{};
  app.duel.featureFlags=createFeatureFlags({storage:null,overrides:{...FLAGS,'story-everburn':true}});
  app.addPlayer('Wasteland QA');
  app.profile={...app.profile,wasteland:{...app.profile.wasteland,version:1,discoveredGate:true}};
  assert.ok(app._saveProfile());
  assert.ok(app.visitWasteland());
  for(let tick=0;tick<60/DT&&!app.isYardHomeActive();tick++) app.duel.step(DT);
  assert.ok(app.isYardHomeActive(),'the real gate opens and the memory-only player reaches the yard');
  for(const difficulty of ['easy','medium','hard']) {
    app.cpuDifficulty=difficulty;
    assert.ok(app._startArenaFight({venueId:'scablands',mode:'world-job',opponents:0,job:washRiderJob()}));
    assert.equal(app.duel.state.cpuDifficulty,difficulty);
    assert.equal(app.duel.state.arena.worldJob.riderFight.riders.length,3);
  }
  assert.ok(app.worldJobAgain(),'the Wash replay action starts the same event');
  assert.equal(app.duel.state.arena.worldJob.definition.id,'wash-road-riders');
  for (const pageSource of [readySource,prepareSource,visitReadySource,visitSource,yardSource,loadedSource,stateSource,...['easy','medium','hard','roadblock'].map(fightSource)]) new Function('return '+pageSource);
  const gated = new Duel({seed:7,featureFlags:{...FLAGS,'road-riders':false}});
  gated.state.wastelandGateDiscovered = true;
  assert.equal(gated.startArenaEvent({venueId:'scablands',mode:'world-job',opponents:[],job:washRiderJob()}),false);
  for (const job of EVERBURN_JOBS.slice(0,4)) {
    const {state, world} = runEvent({job});
    assert.equal(world.riderFight,undefined,job.id);
    assert.ok(state.opponents.every(car => !car.roadRider));
  }
  const job = washRiderJob({count:2});
  const following = structuredClone(job.steps[0]);
  following.id='next';
  job.steps.push(following);
  const sim = runEvent({job});
  assert.equal(sim.state.opponents.length,2);
  assert.equal(sim.world.riderReserve.length,2);
  assert.equal(sim.state.arena.participants.length,3);
  const firstIds = [...sim.fight.riders];
  for (const car of sim.state.opponents) car.armor = car.maxArmor*RULE.retreatFraction;
  advance(sim,4);
  assert.equal(sim.world.job.stepIndex,1);
  assert.equal(sim.world.riderFight.index,1);
  assert.ok(sim.world.riderFight.riders.every(id => !firstIds.includes(id)));
  assert.equal(sim.world.riderReserve.length,0);
  const secondFight=sim.world.riderFight;
  for (const car of sim.state.opponents) car.armor=car.maxArmor*RULE.retreatFraction;
  advance(sim,DT*2);
  assert.equal(secondFight.outcome,'won');
  // A talk choice can reset the step state and point to the original fight after a different field has entered.
  sim.world.job={...sim.world.job,stepIndex:0,stepState:{},done:false};
  advance(sim,DT);
  assert.equal(sim.world.job.stepIndex,1);
  assert.equal(sim.world.riderFight.outcome,'won');
  assert.equal(sim.state.opponents.length,0,'completed rosters do not spawn again');
  assert.equal(sim.events.filter(event=>event.riderFight).length,2);
  assert.equal(sim.events.filter(event=>event.arenaTell?.cue==='rider.won').length,2);
  assert.deepEqual(sim.world.job.storyMarks.riderFightReports,{0:true,1:true});
  const branched=washRiderJob({count:3});
  const marker={x:1200,y:0,z:1200};
  branched.steps.unshift({kind:'reach',id:'choose',position:marker});
  const entered=runEvent({job:branched});
  assert.equal(entered.state.opponents.length,0);
  assert.equal(entered.world.riderReserve.length,3);
  // A job owner can complete the prior step outside the usual stepWorldJob tail, as a choice screen does.
  entered.world.job=stepJob(entered.world.job,{player:{position:marker}},DT);
  assert.equal(entered.world.job.stepIndex,1);
  advance(entered,DT*3);
  assert.equal(entered.world.riderFight?.riders.length,3);
  assert.equal(entered.world.riderReserve.length,0);
  assert.equal(entered.state.opponents.length,3);
  assert.ok(entered.world.riderFight.elapsed>0);
  const protectedJob=washRiderJob({count:1}), ally={car:'dusthawk_rally',jobId:'wash-truck',brain:'gunner'};
  protectedJob.steps[0].targetId=ally.jobId;
  ally.start={...protectedJob.steps[0].carStart,x:protectedJob.steps[0].carStart.x+42};
  protectedJob.riderAllies=[ally];
  const escorted=runEvent({job:protectedJob});
  const [truck,attacker]=escorted.state.opponents;
  assert.equal(arenaActor(escorted.duel,attacker.roadRider.targetId),truck);
  assert.equal(arenaParticipant(escorted.duel,truck).team,'player');
  const pose=worldPose(escorted.duel,escorted.state);
  place(escorted,truck,{x:pose.x+42,z:pose.z});
  place(escorted,attacker,{x:pose.x+42,z:pose.z+20},Math.PI);
  assert.equal(targetFor(escorted.duel,attacker,{range:40}),truck);
  assert.ok(throwRiderAsh(escorted.duel,attacker));
  assert.ok(distance(escorted.fight.ash[0].position,worldPose(escorted.duel,truck))<1);
  const remote=runEvent(), ahead=worldPose(remote.duel,remote.state), foe=remote.state.opponents[0];
  const ringHeading=remote.duel.course.at(remote.state.s).heading;
  place(remote,remote.state,ahead,ringHeading);
  place(remote,foe,{x:ahead.x+Math.sin(ringHeading)*11,z:ahead.z+Math.cos(ringHeading)*11},ringHeading);
  assert.ok(Math.abs(foe.s-remote.state.s)<2,'the small arena oval compresses this real 11 m gap');
  const before=worldPose(remote.duel,foe);
  assert.equal(remote.duel._vehicleContact(remote.state,foe,'rival'),false,'11 actual metres leave both bumpers clear');
  assert.deepEqual(worldPose(remote.duel,foe),before);
  place(escorted,escorted.state,pose,ringHeading);
  place(escorted,truck,{x:pose.x+Math.sin(ringHeading)*11,z:pose.z+Math.cos(ringHeading)*11},ringHeading);
  assert.ok(Math.abs(truck.s-escorted.state.s)<2,'the truck reproduces the compressed ring gap');
  const truckBefore=worldPose(escorted.duel,truck);
  assert.equal(escorted.duel._vehicleContact(escorted.state,truck,'rival'),false,'the allied truck uses the same 11 m world gap');
  assert.deepEqual(worldPose(escorted.duel,truck),truckBefore);
  const continueJob=washRiderJob();
  continueJob.steps[0].onLost='continue';
  continueJob.steps.push({kind:'reach',id:'carry-on',place:{id:'far',position:{x:0,z:0},radius:5}});
  const continuing=runEvent({job:continueJob});
  continuing.state.armor=1;
  applyArmorDamage(continuing.duel,continuing.state,'crossbow',{owner:continuing.state.opponents[0].arenaId});
  advance(continuing,RULE.aftermathSec+DT*5);
  assert.equal(continuing.world.job.stepIndex,1);
  assert.equal(continuing.world.job.storyMarks.riderFight.outcome,'lost');
  assert.equal(continuing.state.arena.result,null);
  const missingJob=washRiderJob({count:1});
  missingJob.riderAllies=[ally];
  missingJob.steps[0].targetId=ally.jobId;
  missingJob.steps[0].onLost='continue';
  missingJob.steps.unshift({kind:'reach',id:'start',position:marker});
  missingJob.steps.push({kind:'reach',id:'carry-on',position:{x:0,z:0}});
  const missing=runEvent({job:missingJob});
  const missingTruck=missing.state.opponents[0];
  missing.state.opponents.splice(0,1);
  missing.state.arena.participants=missing.state.arena.participants.filter(p=>p.id!==missingTruck.arenaId);
  missing.world.job=stepJob(missing.world.job,{player:{position:marker}},DT);
  advance(missing,RULE.aftermathSec+DT*5);
  assert.equal(missing.world.job.stepIndex,2,'a missing target settles as authored and lets the game advance');
  assert.equal(missing.world.job.storyMarks.riderFight.outcome,'lost');
  assert.equal(missing.events.filter(event=>event.riderFight).length,1);
  assert.equal(missing.state.opponents.length,0);
  console.log('Opt-in and subsequent rosters, four previous Everburn jobs, protected truck, world-metre contact and laptop page expressions passed.');
}

function fireAndCrew() {
  const armed=runEvent({difficulty:'hard',job:washRiderJob({count:1,weapon:'crossbow',fightToEnd:true})});
  advance(armed,15,undefined,()=>armed.events.some(e=>e.weaponFired));
  const shots=armed.events.filter(e=>e.weaponFired&&e.actor===armed.state.opponents[0]);
  assert.ok(shots.length>0 && shots.every(e=>e.weaponFired==='crossbow'),'the native CPU uses its one job-specified arsenal weapon');
  const sim=runEvent(), {duel,state,world,fight,events}=sim, rider=state.opponents[0];
  const at=worldPose(duel,state);
  place(sim,rider,{x:at.x,z:at.z+22},Math.PI);
  world.job.steps[0].fires=[{id:'wash-fire',position:at}];
  assert.ok(targetFor(duel,rider,{range:50})===state);
  setCarEffect(state,'burning',{duration:5});
  state.combat.flameBurns={player:{remainingSec:5, ownerId:rider.arenaId}};
  setCarEffect(rider,'disabled',{duration:5});
  assert.equal(throwRiderAsh(duel,rider),false,'tesla lockout prevents the ash throw');
  setCarEffect(rider,'disabled',{duration:0});
  assert.ok(throwRiderAsh(duel,rider));
  assert.equal(throwRiderAsh(duel,rider),false);
  advance(sim,RULE.ashFlightSec+DT*2);
  assert.equal(events.filter(e=>e.riderAsh?.smothered.includes('wash-fire')).length,1);
  assert.deepEqual(fight.smothered,['wash-fire']);
  assert.equal(state.combat.flameBurns.player,undefined);
  assert.equal(carEffect(state,'burning'),null);
  assert.ok(hazardsFor(duel).some(h=>h.kind==='smoke'&&distance(h,at)<RULE.ashRadius));
  assert.equal(targetFor(duel,rider,{range:50}),null);
  rider.roadRider.ashWait=0;
  assert.equal(throwRiderAsh(duel,rider),false,'an otherwise available throw respects smoke');
  assert.equal(fireWeapon(duel,'crossbow',true,rider),false);
  const away=runEvent(), foe=away.state.opponents[0], location=worldPose(away.duel,away.state);
  place(away,foe,{x:location.x,z:location.z+22},Math.PI);
  assert.ok(throwRiderAsh(away.duel,foe));
  place(away,away.state,{x:location.x+15,z:location.z});
  advance(away,RULE.ashFlightSec+DT*2);
  assert.ok(hazardsFor(away.duel).every(h=>distance(h,worldPose(away.duel,away.state))>RULE.ashRadius));

  const basic=runEvent({flags:{...FLAGS,arsenal:false}}), basicFoe=basic.state.opponents[0], base=worldPose(basic.duel,basic.state);
  place(basic,basicFoe,{x:base.x,z:base.z+22},Math.PI);
  assert.ok(throwRiderAsh(basic.duel,basicFoe));
  basicFoe.weaponsDisabledUntil=Infinity;
  advance(basic,RULE.ashFlightSec+.1);
  assert.ok(smokeHazeOpacity(hazardsFor(basic.duel),{...base,y:basic.state.groundHeight+1})>0);
  advance(basic,RULE.ashLifetime+.1);
  assert.equal(hazardsFor(basic.duel).length,0,'a job ash cloud expires with the arsenal switch off');
  const two=runEvent({count:2}), [retiring,other]=two.state.opponents;
  retiring.roadRider.home={...worldPose(two.duel,retiring),z:worldPose(two.duel,retiring).z-24};
  retiring.armor=retiring.maxArmor*RULE.retreatFraction;
  advance(two,DT);
  assert.equal(retiring.roadRider.phase,'withdrawing');
  assert.equal(two.events.filter(e=>e.arenaTell?.cue==='rider.breaks-off').length,1);
  const gap=distance(worldPose(two.duel,retiring),retiring.roadRider.home);
  advance(two,2);
  assert.ok(distance(worldPose(two.duel,retiring),retiring.roadRider.home)<gap);
  assert.equal(two.events.filter(e=>e.arenaTell?.cue==='rider.breaks-off').length,1);
  assert.ok(other.roadRider);
  const toEnd=runEvent({fightToEnd:true}), stubborn=toEnd.state.opponents[0];
  stubborn.armor=stubborn.maxArmor*RULE.retreatFraction;
  advance(toEnd,DT);
  assert.equal(stubborn.roadRider.phase,'fighting');
  applyArmorDamage(toEnd.duel,stubborn,'fixed',{amount:100,owner:'player'});
  advance(toEnd,DT);
  const crew=toEnd.world.actors.filter(a=>a.riderCrew), positions=crew.map(a=>({x:a.x,z:a.z}));
  assert.equal(crew.length,RULE.crewPerCar);
  assert.ok(crew.every(a=>a.health>0));
  advance(toEnd,.5);
  assert.ok(crew.every((a,i)=>distance(a,positions[i])>.5));
  assert.equal(toEnd.world.actors.filter(a=>a.riderCrew).length,crew.length);
  assert.equal(stubborn.roadRider.phase,'wrecked');
  assert.equal(toEnd.events.filter(event=>event.arenaTell?.cue==='rider.crew-bail').length,1);
  assert.equal(toEnd.events.filter(event=>event.arenaTell?.cue==='rider.won').length,1);
  advance(toEnd,RULE.aftermathSec+DT*3);
  assert.equal(toEnd.state.arena.result?.winnerId,'player');
  const result=arenaResultsScreen(toEnd.state,{metric:()=>'',action:(_text,id)=>id,escapeHTML:String});
  assert.match(result.description,/drove the Ash riders from the Wash/);
  assert.ok(!result.actions.includes('ember-next-job'),'practice never opens an unrelated Everburn job');
  console.log('Ash aim, smoke, smothering, missed throw, smoking retreat and living crew passed.');
}

function chaseAndLoss() {
  for (const difficulty of ['easy','medium','hard']) {
    const sim = runEvent({difficulty,count:3}), {duel,state,world,fight,events}=sim;
    const car=state.opponents[0], parked=worldPose(duel,state), gap=distance(parked,worldPose(duel,car));
    for (const rider of state.opponents) {
      const start=worldPose(duel,rider);
      assert.ok(distance(parked,start)>=150 && distance(parked,start)<=250,'the field approaches from across the bank');
      assert.ok(sees(parked,start,{heightAt:scablandsSurfaceHeightAt,eye:3,target:1.5,step:5}),'each approach starts in clear view over the terrain');
    }
    let firstTouch, windup, windupTimer, armorAtContact;
    duel.onChange((_state,event)=>{
      if (!windup && event.arenaTell?.cue==='arena.tell') {
        windup={...event.arenaTell,at:fight.elapsed};
        windupTimer=car.arenaTellSec;
      }
      if (!firstTouch && event.combatRamHit && event.attackerIndex>=0 && event.victimIndex===-1 && event.armorRemoved>0) {
        firstTouch={rider:state.opponents[event.attackerIndex].arenaId,at:fight.elapsed+DT};
        armorAtContact=state.armor;
      }
    });
    advance(sim,1.2);
    assert.ok(distance(worldPose(duel,state),worldPose(duel,car))<gap-5);
    advance(sim,4.8);
    assert.equal(firstTouch,undefined,'the first ram gives the parked driver six seconds');
    assert.equal(state.armor,state.maxArmor);
    advance(sim,110,undefined,()=>!!fight.outcome);
    assert.ok(firstTouch.at>=6 && firstTouch.at<12,'the riders follow their visible approach with an actual crash');
    assert.equal(firstTouch.rider,windup.id);
    assert.equal(windup.seconds,RULE.openingTellSec);
    assert.equal(windupTimer,RULE.openingTellSec);
    assert.ok(firstTouch.at-windup.at>=RULE.openingTellSec);
    assert.ok(armorAtContact>state.maxArmor*.65,'the first blow leaves armour to fight with');
    assert.equal(fight.outcome,'lost',difficulty);
    assert.ok(events.some(e=>e.combatRamHit&&e.attackerIndex>=0&&e.victimIndex===-1&&e.armorRemoved>0));
    assert.ok(events.some(e=>e.combatRamHit&&e.attackerIndex===-1&&e.victimIndex>=0&&e.armorRemoved>0));
    assert.ok(events.some(e=>e.vehicleSmash?.dvMph>0));
    assert.ok(distance(parked,worldPose(duel,state))>1,'the real crash shoves the unpowered player car');
    assert.ok(state.opponents.some(c=>c.armor<c.maxArmor));
    assert.equal(world.job.storyMarks.riderFight.outcome,'lost');
    advance(sim,RULE.aftermathSec+DT*3);
    assert.equal(state.arena.result?.winnerId,'raiders');
    const result=arenaResultsScreen(state,{metric:()=>'',action:(_text,id)=>id,escapeHTML:String});
    assert.match(result.description,/wrecked your car/);
    assert.ok(!result.actions.includes('ember-next-job'));
    assert.equal(events.filter(e=>e.riderFight).length,1);
    if(difficulty==='easy') {
      const record=run=>run.events.flatMap(e=>e.combatRamHit?[[e.attackerIndex,e.victimIndex,e.closingKph,e.armorRemoved]]:
        e.riderAsh?[[e.riderAsh.ownerId,e.riderAsh.position]]:e.riderFight?[[e.riderFight.outcome]]:[]);
      const again=runEvent({difficulty,count:3});
      advance(again,1.2);
      advance(again,4.8);
      advance(again,110,undefined,()=>!!again.fight.outcome);
      advance(again,RULE.aftermathSec+DT*3);
      assert.deepEqual(record(again),record(sim),'same inputs repeat every impact and ash landing');
      assert.equal(again.fight.endedAt,fight.endedAt);
    }
    console.log(difficulty+' first ram '+firstTouch.at.toFixed(2)+'s after a '+windup.seconds.toFixed(2)+'s charge tell, '
      +(state.maxArmor-armorAtContact).toFixed(2)+' armour removed. Idle wreck '+fight.endedAt.toFixed(2)+'s.');
    for (const boost of [false,true]) {
      const driving=runEvent({difficulty,count:3});
      advance(driving,RULE.openingSafeSec,({duel,state})=>{
        const at=worldPose(duel,state), lead=worldPose(duel,state.opponents[0]);
        const bearing=Math.atan2(lead.x-at.x,lead.z-at.z)-at.heading;
        const steer=boost ? Math.max(-1,Math.min(1,-2*Math.atan2(Math.sin(bearing),Math.cos(bearing)))) : 0;
        duel.setInput({steer,throttle:1,boost});
      });
      assert.equal(driving.state.armor,driving.state.maxArmor,difficulty+' preserves the opening for a moving driver');
      assert.ok(!driving.events.some(event=>event.combatRamHit && (event.attackerIndex===-1 || event.victimIndex===-1) ||
        event.vehicleSmash?.actor.roadRider),difficulty+' keeps real contact clear in the opening');
    }
  }
}

function roadblock(boxIn, weaving, seed=1) {
  const sim=runEvent({count:5,boxIn,seed}), {state,duel,fight,events}=sim;
  let heldFrames=0, topHold=0;
  const initial=state.opponents.map(c=>distance(worldPose(duel,state),worldPose(duel,c)));
  assert.ok(initial[0]>RULE.boxRange && initial[1]>RULE.boxRange,'both ends of the roadblock must close a real gap');
  advance(sim,65,(_sim,i)=>{
    duel.setInput({throttle:1,steer:weaving?Math.sin(i*DT*1.1+1.3)*.62:0});
    if(fight.heldSec>0) {
      assert.ok(Math.abs(state.speedMph)<RULE.boxMph);
      heldFrames++; topHold=Math.max(topHold,fight.heldSec);
    }
  },()=>!!fight.outcome);
  const elapsed=fight.elapsed;
  if(fight.outcome) advance(sim,RULE.aftermathSec+DT*3);
  return {outcome:fight.outcome,elapsed,winner:state.arena.result?.winnerId,heldFrames,topHold,
    job:sim.world.job.storyMarks?.riderFight?.outcome, reports:events.filter(e=>e.riderFight).length,
    surroundedCues:events.filter(event=>event.arenaTell?.cue==='rider.surrounded').length,
    armor:Math.round(state.armor*1000),positions:state.opponents.map(c=>[c.s,c.lateral,c.armor])};
}

function formation() {
  const rig=runEvent({count:5,boxIn:true}), at=worldPose(rig.duel,rig.state);
  place(rig,rig.state,at);
  const offsets=[[0,5],[0,-5],[-3,0],[3,0],[14,14]];
  for(const [i,car] of rig.state.opponents.entries()) place(rig,car,{x:at.x+offsets[i][0],z:at.z+offsets[i][1]});
  const check=dt=>updateRoadFight(rig.duel,rig.world,dt);
  check(.1);
  assert.equal(rig.fight.heldSec,.1);
  const left=rig.state.opponents[2],leftAt=worldPose(rig.duel,left);
  place(rig,left,{x:at.x,z:at.z-12});
  check(.1);assert.equal(rig.fight.heldSec,0,'opening either side clears a partial hold');
  place(rig,left,leftAt);left.groundHeight=rig.state.groundHeight+RULE.verticalReach+1;
  check(.1);assert.equal(rig.fight.heldSec,0,'a vehicle on a different deck cannot hold the player');
  place(rig,left,leftAt);
  rig.state.speedMph=30;check(DT);
  assert.equal(rig.fight.heldSec,0,'moving faster than 10 km/h clears a hold');
  const held=roadblock(true,false);
  assert.equal(held.outcome,'surrounded');
  assert.equal(held.job,'surrounded');
  assert.equal(held.reports,1);
  assert.equal(held.surroundedCues,1);
  assert.equal(held.winner,'raiders');
  assert.ok(held.topHold>=RULE.boxSeconds-DT*2);
  const escaped=roadblock(true,true);
  assert.equal(escaped.outcome,null);
  assert.ok(escaped.elapsed>=60);
  assert.ok(escaped.topHold<RULE.boxSeconds);
  assert.deepEqual(roadblock(true,false),held);
  console.log('Five real cars held the straight car for three seconds after '+held.elapsed.toFixed(2)+'s. The weaving car stayed free for '+escaped.elapsed.toFixed(0)+'s. Seed replay matched.');
}

// A single set of legal controls across all seeds/difficulties. Keep a moving offset from the nearest car,
// shoot the stock crossbow as it closes, use the shield when threatened and drop a bomb at close range.
function carefulDriver({duel,state},frame) {
  const me=worldPose(duel,state);
  let nearest=null, gap=Infinity;
  for(const car of state.opponents) {
    if(car.roadRider?.phase!=='fighting') continue;
    const at=worldPose(duel,car), range=distance(at,me);
    if(range<gap) {nearest=at;gap=range;}
  }
  if(!nearest) return;
  const difference=Math.atan2(nearest.x-me.x,nearest.z-me.z)-me.heading;
  const angle=Math.atan2(Math.sin(difference),Math.cos(difference));
  duel.setInput({steer:Math.max(-.85,Math.min(.85,-angle+(angle>=0?1:-1)*1.15)),throttle:state.speedMph<40?1:0});
  if(gap<115&&frame%18===0) duel.fireWeapon('crossbow');
  if(gap<28&&frame%12===0) duel.fireWeapon('star');
  if(gap<12&&frame%18===0) duel.fireWeapon('bomb');
}

function balance() {
  const winsByDifficulty=[];
  for (const difficulty of ['easy','medium','hard']) {
    const result=[];
    for(let seed=1;seed<=10;seed++) {
      const sim=runEvent({seed,count:3,difficulty});
      advance(sim,150,carefulDriver,()=>!!sim.fight.outcome);
      result.push(sim.fight.outcome);
    }
    const wins=result.filter(outcome=>outcome==='won').length;
    console.log(difficulty+' Wash driver '+wins+'/10 ('+result.join(', ')+')');
    assert.ok(result.every(outcome=>outcome==='won'||outcome==='lost'),'all ten fights must finish');
    winsByDifficulty.push(wins);
  }
  const [easy,medium,hard]=winsByDifficulty;
  assert.ok(easy>=7 && hard<5,'the same driver wins a clear majority on Easy and fewer than half on Hard');
  assert.ok(easy>medium && medium>hard,'Medium is an intermediate fight for the same driver and ten seeds');
}


// Both rows are real Duels at the same Wash pose. The stationary fixture pins only the vehicles' poses
// while projectiles, blasts, hazards, shields and timed effects advance through the ordinary game loop.
function sampleWeapon(weapon, rider, range=30, crossHazard=false) {
  const sim=runEvent({fightToEnd:true,weaponLoadout:[weapon],overrides:rider?{}:{
    mode:'last-car-rolling',opponents:[{car:'dusthawk_rally',brain:'rammer'}]}});
  const {duel,state}=sim, target=state.opponents[0], at=washRiderJob().steps[0].carStart;
  let targetAt={x:at.x,z:at.z+range}, playerAt=at;
  place(sim,state,at);
  place(sim,target,targetAt,Math.PI);
  target.weaponsDisabledUntil=Infinity;
  const initial=target.armor;
  const fired=duel.fireWeapon(weapon);
  assert.ok(fired,weapon+' activated on '+(rider?'rider':'arena')+' at '+range+' m');
  const combat=state.combat, cloud=hazardsFor(duel).find(h=>h.kind===weapon);
  const evidence={
    ownerShield:combat.shield>0, jumped:!!combat.lastUfo?.arena, magnet:(combat.magnets?.length||0)>0,
    drone:state.opponents.some(c=>c.decoy), nitro:!!carEffect(state,'nitro'),
    hazard:cloud?.kind??null, hidden:false, tether:false,burn:false,disabled:false,slick:false,grip:false,
    shells:(combat.mortarShells?.length||0)>0, armor:0
  };
  if(weapon==='ufo') playerAt=worldPose(duel,state);
  if(crossHazard) {assert.ok(cloud); targetAt=cloud;playerAt={x:at.x+20,z:at.z};}
  for(let i=0;i<150;i++) {
    place(sim,state,playerAt);
    place(sim,target,targetAt,Math.PI);
    duel.step(DT);
    evidence.tether ||= !!carEffect(target,'tether');
    evidence.burn ||= !!carEffect(target,'burning');
    evidence.disabled ||= !!carEffect(target,'disabled');
    evidence.slick ||= !!carEffect(target,'slick');
    evidence.grip ||= !!carEffect(target,'grip');
    if (weapon==='smoke') {
      const clouds=hazardsFor(duel).filter(h=>h.kind==='smoke').map(h=>{
        const at=duel.course.nearest(h.x,h.z);
        return {...h,y:duel.course.groundAt(at.s,at.lateral).y};
      });
      const eye={...worldPose(duel,target),y:target.groundHeight+1};
      evidence.hidden ||= smokeHazeOpacity(clouds,eye)>0 && !targetFor(duel,state,{range:100});
    }
  }
  evidence.armor=Math.round((initial-target.armor)*1000)/1000;
  return evidence;
}

function weaponParity() {
  const charge=runEvent({fightToEnd:true,weaponLoadout:['nitro']});
  const foil=charge.state.opponents[0], at=worldPose(charge.duel,charge.state);
  place(charge,charge.state,at,0,45);
  place(charge,foil,{x:at.x,z:at.z+13});
  foil.weaponsDisabledUntil=Infinity;
  assert.ok(charge.duel.fireWeapon('nitro'));
  charge.duel.setInput({throttle:1});
  advance(charge,2,undefined,()=>charge.events.some(e=>e.combatRamHit&&e.attackerIndex===-1&&e.armorRemoved>0));
  assert.ok(charge.events.some(e=>e.combatRamHit&&e.attackerIndex===-1&&e.armorRemoved>0),'a real nitro charge damages a rider');
  for(const weapon of nativeWeapons) {
    const standard=sampleWeapon(weapon,false), rider=sampleWeapon(weapon,true);
    assert.deepEqual(rider,standard,weapon+' at 30 m');
    if (['bomb','crossbow','rockets','mortar'].includes(weapon)) assert.ok(rider.armor>0,weapon+' hits at 30 m');
    if (weapon==='harpoon') assert.ok(rider.tether&&rider.armor>0);
    if (weapon==='star') assert.ok(rider.ownerShield);
    if (weapon==='ufo') assert.ok(rider.jumped);
    if (weapon==='magnet') assert.ok(rider.magnet);
    if (weapon==='decoy') assert.ok(rider.drone);
    if (weapon==='nitro') assert.ok(rider.nitro);
    if (['oil','caltrops','smoke'].includes(weapon)) {
      const native=sampleWeapon(weapon,false,30,true), crossed=sampleWeapon(weapon,true,30,true);
      assert.deepEqual(crossed,native,weapon+' on crossing');
      assert.ok(weapon==='oil'?crossed.slick:weapon==='caltrops'?crossed.grip&&crossed.armor>0:crossed.hidden);
    }
    if (['tesla','flamethrower','bomb'].includes(weapon)) {
      const near=weapon==='bomb'?10:7;
      const native=sampleWeapon(weapon,false,near), close=sampleWeapon(weapon,true,near);
      assert.deepEqual(close,native,weapon+' in range');
      if(weapon==='tesla') assert.ok(close.disabled);
      if(weapon==='flamethrower') assert.ok(close.burn&&close.armor>0);
    }
    console.log(weapon+' arena parity, 30 m target armour loss '+rider.armor);
  }
}

async function crewPresentation() {
  const sim=runEvent({count:5,fightToEnd:true}), {duel,state}=sim;
  const loader=new GLTFLoader();
  // The cloud has no browser JPEG decoder. Parse every committed model, joint and material.
  loader.register(()=>({name:'TEST_TEXTURE',loadTexture:()=>Promise.resolve(new THREE.Texture())}));
  const scene=createScablandsScene(duel.course,{loadAsset:async path=>{
    const bytes=await readFile(new URL('../public'+path,import.meta.url));
    return loader.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
  }});
  const effects=createCombatEffects({loadTexture:()=>new THREE.Texture()});
  try {
    assert.equal(await scene.ready,true);
    syncScene(scene.group,state,DT);
    const view=scene.group.getObjectByName('Road riders and ash sacks');
    const legs=view.getObjectByName('fighter-limbs');
    assert.ok(view.visible&&legs.isInstancedMesh);
    assert.equal(legs.count,0);
    const warning=view.children.find(child=>child.children.some(mesh=>mesh.geometry?.type==='RingGeometry'));
    const ring=warning.children.find(mesh=>mesh.geometry?.type==='RingGeometry');
    assert.equal(ring.geometry.parameters.outerRadius,RULE.ashRadius);
    const car=state.opponents.at(-1);
    car.armor=.5;
    applyArmorDamage(duel,car,'crossbow',{owner:'player'});
    advance(sim,DT);
    syncScene(scene.group,state,DT);
    effects.update({state,course:duel.course,dt:DT});
    assert.ok(effects.group.getObjectByName('combat-vfx-wreck-5-fire')?.visible);
    assert.ok(effects.group.getObjectByName('combat-vfx-wreck-5-explosion')?.visible);
    assert.equal(effects.group.getObjectByName('combat-vfx-wreck-5-smoke')?.visible,false);
    assert.equal(legs.count,RULE.crewPerCar*8);
    const shinOffset=index=>{
      const thigh=new THREE.Matrix4(), shin=new THREE.Matrix4();
      legs.getMatrixAt(index*8+4,thigh);
      legs.getMatrixAt(index*8+5,shin);
      return new THREE.Vector3().setFromMatrixPosition(shin).sub(new THREE.Vector3().setFromMatrixPosition(thigh));
    };
    const offsets=Array.from({length:RULE.crewPerCar},(_,index)=>shinOffset(index));
    for(let frame=0;frame<15;frame++) {
      duel.step(DT);
      syncScene(scene.group,state,DT);
      effects.update({state,course:duel.course,dt:DT});
    }
    assert.ok(effects.group.getObjectByName('combat-vfx-wreck-5-smoke')?.visible);
    for(const [index,offset] of offsets.entries())
      assert.ok(shinOffset(index).distanceTo(offset)>.01,'crew member '+index+' articulates while running');
    const retreating=state.opponents[3];
    retreating.roadRider.fightToEnd=false;
    retreating.armor=retreating.maxArmor*RULE.retreatFraction;
    advance(sim,DT);
    effects.update({state,course:duel.course,dt:DT});
    const smoke=effects.group.getObjectByName('combat-vfx-damage-4-smoke');
    assert.ok(smoke.visible);
    const cue=sim.events.find(e=>e.arenaTell?.cue==='rider.breaks-off');
    assert.equal(cue.arenaTell.sourceId,retreating.arenaId);
    assert.ok(Number.isFinite(cue.arenaTell.position.y));
    const audio=new EngineAudio({flags:{enabled:key=>!!FLAGS[key]}});
    audio.muted=false;audio.context={state:'running',currentTime:0};
    const output={level:{gain:{}},panner:{pan:{}},disconnect(){}};
    let end;
    audio._syncMixer=()=>{};
    audio._spatialOutput=(event,live,course)=>{assert.ok(live===state&&course===duel.course);return output;};
    audio._playCue=(id,{onEnd})=>{assert.equal(id,'rider.breaks-off');end=onEnd;return {};};
    audio.event(cue,state,duel.course);
    assert.equal(audio.riderNotes.size,1);
    audio._updateRiderNotes(state,duel.course);
    const first=output.panner.pan.value, firstLevel=output.level.gain.value;
    advance(sim,.35);
    audio._updateRiderNotes(state,duel.course);
    const ground=duel.course.groundAt(retreating.s,retreating.lateral);
    const position={...ground,y:ground.y+COMBAT_TUNING.pointHeight+(retreating.airHeight||0)};
    const expected=combatAudioSpace({hitPosition:position,combatHit:true},state,duel.course);
    assert.equal(output.panner.pan.value,expected.pan);assert.equal(output.level.gain.value,expected.gain);
    assert.ok(first!==expected.pan||firstLevel!==expected.gain,'the retreating source changes pan or level');
    assert.ok(SOUND_BANK['rider.breaks-off'].layers.every(layer=>layer.endFrequency<layer.frequency));
    end();assert.equal(audio.riderNotes.size,0);
    console.log('Scablands scene displayed both articulated fleeing crew. The fifth car had wreck smoke, the fourth had retreat smoke, and its two falling notes followed the moving sound source.');
  } finally {effects.dispose();scene.dispose();}
}

if (!selected||selected==='--weapons') weaponParity();
if (!selected||selected==='--presentation') await crewPresentation();
if (!selected||selected==='--rules') {rulesAndRoster();fireAndCrew();chaseAndLoss();}
if (!selected||selected==='--formation') formation();
if (!selected||selected==='--balance') balance();
