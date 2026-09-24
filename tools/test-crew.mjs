import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import {CREW,availableCrew,crewPerks,selectCrew,selectedCrewId} from '../src/crew.js';
import {crewPanel} from '../src/crew-ui.js';
import {normalizeWasteland} from '../src/wasteland-progress.js';
import {Duel} from '../src/game.js';
import {respawnFighter} from '../src/onfoot.js';
import {createOnFootFigures} from '../src/onfoot-figures.js';

const profile=xp=>({credits:0,wasteland:normalizeWasteland({xp})});
const STEP=1/120;
const ticks=(duel,count)=>{for(let i=0;i<count;i++)duel.step(STEP);};

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
    const duel=new Duel({seed:1989,featureFlags:{wasteland2:true},
      destructiblesEnabled:false});
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
