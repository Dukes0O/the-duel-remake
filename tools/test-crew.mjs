import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import {CREW,availableCrew,crewPerks,selectCrew,selectedCrewId} from '../src/crew.js';
import {crewPanel} from '../src/crew-ui.js';
import {normalizeWasteland} from '../src/wasteland-progress.js';
import {LegacyRoadsideDuel} from './legacy-roadside-duel.mjs';
import {respawnFighter} from '../src/onfoot.js';
import {createOnFootFigures} from '../src/onfoot-figures.js';
import {stepProjectiles} from '../src/combat-projectiles.js';
import {COMBAT_TUNING} from '../src/wasteland-tuning.js';
import {resetFootWeaponUser} from '../src/onfoot-weapons.js';

const profile=xp=>({credits:0,wasteland:normalizeWasteland({xp})});
const STEP=1/120;
const ticks=(duel,count)=>{for(let i=0;i<count;i++)duel.step(STEP);};
function crewRace(id,startS=500){
  const duel=new LegacyRoadsideDuel({seed:1989,featureFlags:{wasteland2:true}});
  duel.startCampaign({mode:'wasteland',car:'falcone_f42',startStage:0,
    seed:1989,crewId:id,opponentCount:1});
  const state=duel.state;
  Object.assign(state,{status:'racing',countdown:0,s:startS,prevS:startS,
    lateral:0,prevLateral:0,traffic:[]});
  state.combat.aiTimer=Infinity;
  state.combat.pickupTimer=Infinity;
  duel._rival=()=>{};
  duel._traffic=()=>{};
  duel.setInput({interact:true});ticks(duel,48);
  assert.equal(state.onFoot,true);
  duel.setInput({interact:false});ticks(duel,1);
  return duel;
}

test('eight exact roster entries, free Rook, rank gates and per-player save',()=>{
  assert.deepEqual(Object.keys(CREW),['rook','nell','jax','odessa','cinder',
    'dune','wren','tusk']);
  assert.deepEqual(Object.values(CREW).map(c=>c.rank),[1,4,8,10,12,16,20,25]);
  const first=profile(0),other=profile(0);
  assert.deepEqual(availableCrew(first).map(c=>c.id),['rook']);
  assert.equal(selectCrew(first,'nell').ok,false);
  assert.equal(selectCrew(first,'__proto__').ok,false,
    'prototype names are not crew identities');
  const high=profile(100_000),selected=selectCrew(high,'wren');
  assert.equal(selected.ok,true);
  assert.equal(selectedCrewId(selected.profile),'wren');
  assert.equal(selected.profile.wasteland.crew.unlocked.includes('wren'),true);
  assert.equal(selectedCrewId(other),'rook');
  assert.equal(selectCrew({credits:0},'rook').ok,false,
    'crew selection cannot skip the verified profile migration');
  assert.equal(selectCrew({...high,wasteland:{...high.wasteland,version:2}},
    'wren').ok,false);
});

test('Rook health and Wren sprint are real fixed-step perks; future hooks stay metadata',()=>{
  const make=id=>{
    const duel=new LegacyRoadsideDuel({seed:1989,featureFlags:{wasteland2:true}});
    duel.startCampaign({mode:'wasteland',car:'falcone_f42',startStage:0,
      seed:1989,crewId:id});
    const s=duel.state;
    Object.assign(s,{status:'racing',countdown:0,s:500,prevS:500,
      lateral:0,prevLateral:0,traffic:[],opponents:[]});
    s.combat.aiTimer=Infinity;s.combat.pickupTimer=Infinity;
    duel.setInput({interact:true});ticks(duel,48);
    assert.equal(s.onFoot,true);
    duel.setInput({interact:false});ticks(duel,1);
    return duel;
  };
  const rook=make('rook'),wren=make('wren');
  assert.equal(rook.state.fighter.maxHealth,110);
  assert.equal(rook.state.fighter.health,110);
  assert.equal(wren.state.fighter.maxHealth,100);
  rook.state.fighter.health=1;
  respawnFighter(rook.course,rook.state,rook.state.fighter);
  assert.equal(rook.state.fighter.health,110);
  const startR={x:rook.state.fighter.x,z:rook.state.fighter.z};
  const startW={x:wren.state.fighter.x,z:wren.state.fighter.z};
  rook.setFighterInput({forward:true,sprint:true});
  wren.setFighterInput({forward:true,sprint:true});
  ticks(rook,60);ticks(wren,60);
  const movedR=Math.hypot(rook.state.fighter.x-startR.x,
    rook.state.fighter.z-startR.z);
  const movedW=Math.hypot(wren.state.fighter.x-startW.x,
    wren.state.fighter.z-startW.z);
  assert.ok(movedW>movedR*1.15,{movedR,movedW});
  assert.equal(crewPerks('nell').blastRadiusMultiplier,1.2);
  assert.equal(crewPerks('odessa').repairRateMultiplier,2);
  assert.equal(crewPerks('cinder').fireImmune,true);
});

test('Armory copy and pooled figure colors distinguish the roster',()=>{
  const escape=value=>String(value).replaceAll('&','&amp;')
    .replaceAll('<','&lt;').replaceAll('>','&gt;');
  const locked=crewPanel(profile(0),escape);
  assert.equal((locked.match(/data-crew-select=/g)||[]).length,8);
  assert.match(locked,/UNLOCKS AT RANK 25/);
  assert.match(locked,/PASSIVE HOOK · LATER CARD/);
  assert.match(crewPanel(profile(100_000),escape),/SELECT CREW/);
  const unmigrated=crewPanel({credits:0},escape);
  assert.equal((unmigrated.match(/CAREER NOT READY/g)||[]).length,8);
  assert.equal((unmigrated.match(/disabled/g)||[]).length,8);
  const figures=createOnFootFigures();
  const fighter=(crewId,x)=>({crewId,x,y:0,z:0,yaw:0,steps:0,
    airHeight:0,knockedDown:false});
  figures.update([{fighter:fighter('rook',0)},{fighter:fighter('nell',3)}],
    {active:true});
  const first=new THREE.Color(),second=new THREE.Color();
  figures.meshes.plates.getColorAt(0,first);
  figures.meshes.plates.getColorAt(12,second);
  assert.notEqual(first.getHex(),second.getHex());
  assert.equal(figures.drawCallBudget,4);
  figures.dispose();
});

test('Nell splash, Odessa repair, and Dune lock range affect current weapons',()=>{
  const rook=crewRace('rook'),nell=crewRace('nell');
  for(const duel of [rook,nell]){
    const state=duel.state,target=state.opponents[0];
    target.s=state.s+55;target.prevS=target.s;target.lateral=3;
    target.prevLateral=3;
    duel.setFighterInput({fire:true});ticks(duel,1);
    const rocket=state.combat.projectiles.find(p=>p.kind==='rpg');
    assert.ok(rocket);
    const ground=duel.course.groundAt(target.s,target.lateral);
    rocket.x=ground.x+8.7;rocket.z=ground.z;
    rocket.y=ground.y+1;rocket.vx=rocket.vy=rocket.vz=0;
    rocket.age=COMBAT_TUNING.foot.rpgLifetimeSeconds;
    const before=target.armor;
    stepProjectiles(duel,STEP);
    if(state.crewId==='nell'){
      assert.equal(rocket.splashRadius,9.6);
      assert.ok(target.armor<before,'Nell hits beyond the normal eight-metre radius');
    }else{
      assert.equal(rocket.splashRadius,8);
      assert.equal(target.armor,before);
    }
  }
  const odessa=crewRace('odessa'),standard=crewRace('rook');
  for(const duel of [odessa,standard]){
    duel.state.armor=30;
    resetFootWeaponUser(duel);
    assert.equal(duel.selectFootGear(2),true);
    duel.setFighterInput({fire:true});ticks(duel,240);
  }
  assert.ok(Math.abs(odessa.state.armor-70)<1e-6);
  assert.ok(Math.abs(standard.state.armor-50)<1e-6);
  assert.equal(odessa.state.footWeapons.repairBlockedUntilRelease,true);
  const dune=crewRace('dune',50),normal=crewRace('rook',50);
  for(const duel of [dune,normal]){
    const fighter=duel.state.fighter,target=duel.state.opponents[0];
    const candidate=Array.from({length:500},(_,i)=>fighter.s+i+1)
      .map(s=>({s,point:duel.course.groundAt(s,0)}))
      .find(({point})=>Math.hypot(point.x-fighter.x,
        point.y+1-fighter.y-COMBAT_TUNING.foot.rpgEyeHeight,
        point.z-fighter.z)>252 && Math.hypot(point.x-fighter.x,
        point.z-fighter.z)<265);
    assert.ok(candidate,'course offers a target beyond base lock range');
    target.s=target.prevS=candidate.s;
    target.lateral=target.prevLateral=0;
    fighter.yaw=Math.atan2(candidate.point.x-fighter.x,
      candidate.point.z-fighter.z);
    fighter.pitch=Math.atan2(candidate.point.y+1-fighter.y-
      COMBAT_TUNING.foot.rpgEyeHeight,
      Math.hypot(candidate.point.x-fighter.x,
        candidate.point.z-fighter.z));
    duel.setFighterInput({aim:true});ticks(duel,1);
  }
  assert.equal(crewPerks('dune').lockRangeMultiplier,1.25);
  assert.equal(dune.state.footWeapons.lockTargetIndex,0);
  assert.equal(normal.state.footWeapons.lockTargetIndex,null);
  normal.setFighterInput({fire:true});ticks(normal,1);
  assert.equal(normal.state.combat.projectiles.find(p=>p.kind==='rpg')
    ?.lifetimeSeconds,4,'ordinary crew keeps the four-second RPG');
  ticks(dune,95);
  assert.ok(dune.state.footWeapons.lockSeconds>=
    COMBAT_TUNING.foot.rpgLockSeconds-1e-8);
  const distant=dune.state.opponents[0];
  const origin=dune.state.fighter;
  const targetPoint=dune.course.groundAt(distant.s,distant.lateral);
  assert.ok(Math.hypot(targetPoint.x-origin.x,targetPoint.z-origin.z)>250);
  const armorBefore=distant.armor;
  dune.setFighterInput({aim:true,fire:true});ticks(dune,1);
  const lockedRocket=dune.state.combat.projectiles.find(p=>p.kind==='rpg');
  assert.ok(lockedRocket);
  assert.equal(lockedRocket.targetIndex,0);
  assert.equal(lockedRocket.lifetimeSeconds,5);
  dune.setFighterInput({aim:false,fire:false});
  for(let i=0;i<600&&distant.armor===armorBefore;i++)ticks(dune,1);
  assert.ok(lockedRocket.age>4,'rocket needed travel beyond the standard lifetime');
  assert.ok(distant.armor<armorBefore,'locked Dune rocket hits beyond 220 m');
  assert.ok(dune.state.combat.notorietyEvents?.some(event=>
    event.type==='rpgDirectHit'),'the distant impact is a direct hit');
});
