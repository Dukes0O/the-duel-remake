import assert from 'node:assert/strict';
import test from 'node:test';
import * as balance from './combat-balance.mjs';
import {Duel} from '../src/game.js';
import {createFeatureFlags} from '../src/feature-flags.js';
import {startRocketVolley, stepRocketVolleys, stepRocketPod, launchAimedRocket,
  ROCKET_RULES} from '../src/arsenal/rockets.js';
import {applyArmorDamage} from '../src/combat-armor.js';

function fixture({armor=100, shield=false, distance=20, secondArmor=null, seeker=false}={}) {
  const duel=new Duel({seed:1989,featureFlags:createFeatureFlags({storage:null,
    overrides:{arsenal:true,'seeker-rockets':seeker}})});
  duel.startCampaign({mode:'wasteland',discoveredGate:true,arsenalRank:13,
    opponentCount:secondArmor===null?1:2});
  const state=duel.state;
  Object.assign(state,{status:'racing',countdown:0,s:0,lateral:0,speedMph:0,
    headingError:0,invulnerableSec:0,traffic:[]});
  duel.course={groundAt:(s,lateral=0)=>({x:lateral,y:0,z:s,heading:0}),
    nearest:(x,z)=>({s:z,lateral:x}),at:()=>({heading:0,curvature:0}),
    worldAt:(s,lateral=0)=>({x:lateral,y:0,z:s})};
  duel._obstacles=()=>[];
  state.opponents.forEach((actor,i)=>Object.assign(actor,{s:distance,lateral:i?1.2:0,
    speedMph:0,headingError:0,armor:i?secondArmor:armor,airHeight:0}));
  state.combat.rivalShield=shield?10:0;
  assert.equal(typeof balance.createRocketDamageCounter,'function');
  const counter=balance.createRocketDamageCounter(duel);
  duel.onChange((_state,event)=>counter.observe(event));
  const finish=()=>{
    for(let frame=0;frame<240;frame++){
      stepRocketVolleys(duel,1/120);
      for(const shot of state.combat.projectiles)stepRocketPod(duel,shot,1/120);
    }
    return counter.snapshot();
  };
  return {duel,state,counter,finish};
}

test('one native volley is one firing, with its four actual armor hits',()=>{
  assert.equal(ROCKET_RULES.damage,10,'flag-off damage stays 10');
  const {duel,state,finish}=fixture();
  startRocketVolley(duel,state);
  assert.equal(state.combat.projectiles[0].damage,10,'legacy shot records its launch damage');
  const measured=finish();
  assert.equal(state.rival.armor,60);
  assert.equal(measured.player.firings,1);
  assert.equal(measured.player.armorRemoved,40);
  assert.equal(measured.volleys[0].launchedRockets,4);
});

test('seeker Pods record authorized 8 at launch and keep it if the flag changes in flight',()=>{
  const {duel,state,finish}=fixture({seeker:true});
  startRocketVolley(duel,state);stepRocketVolleys(duel,.4);
  assert.equal(state.combat.projectiles.length,4);
  assert.ok(state.combat.projectiles.every(shot=>shot.damage===8));
  const enabled=duel.featureFlags.enabled.bind(duel.featureFlags);
  duel.featureFlags={...duel.featureFlags,enabled:key=>key==='seeker-rockets'?false:enabled(key)};
  const measured=finish();
  assert.equal(state.rival.armor,68);
  assert.equal(measured.player.firings,1);
  assert.equal(measured.player.armorRemoved,32);
});

test('aimed Gunn shots keep native 10 with seeker mode enabled',()=>{
  const {duel,state,finish}=fixture({seeker:true});
  const shot=launchAimedRocket(duel,state,{x:0,y:1,z:20});
  assert.equal(shot.damage,10);
  assert.equal(shot.seekerTargetId,undefined);
  const measured=finish();
  assert.equal(state.rival.armor,90);
  assert.equal(measured.player.firings,0);
  assert.equal(measured.player.armorRemoved,0);
});

test('native remaining armor clips measured damage, not the report',()=>{
  const {duel,state,finish}=fixture({armor:3});
  startRocketVolley(duel,state);
  const measured=finish();
  assert.equal(state.rival.armor,0);
  assert.equal(measured.player.firings,1);
  assert.equal(measured.player.armorRemoved,3);
});

for(const options of [{shield:true},{distance:200}])test('zero-damage native firing stays in denominator '+JSON.stringify(options),()=>{
  const {duel,state,finish}=fixture(options);
  startRocketVolley(duel,state);
  const measured=finish();
  assert.equal(measured.player.firings,1);
  assert.equal(measured.player.armorRemoved,0);
  assert.equal(state.rival.armor,100);
});

test('interrupted native volley remains one zero-damage firing',()=>{
  const {duel,state,finish}=fixture({distance:200});
  startRocketVolley(duel,state);state.finished=true;
  const measured=finish();
  assert.equal(measured.player.firings,1);
  assert.equal(measured.volleys[0].launchedRockets,1);
  assert.equal(measured.player.armorRemoved,0);
});

test('native splash adds actual damage to both cars and excludes unrelated damage',()=>{
  const {duel,state,finish}=fixture({secondArmor:5});
  applyArmorDamage(duel,state.rival,'fixed',{amount:7,owner:'player'});
  duel.emit({combatHit:true,strength:7/60,victim:'rival',enemy:false,
    hitPosition:{x:0,y:1,z:20}});
  startRocketVolley(duel,state);
  const measured=finish();
  assert.equal(measured.player.armorRemoved,45);
  assert.equal(state.rival.armor,53);
  assert.equal(state.opponents[1].armor,0);
});

test('CPU firings are separate and aimed boss rockets are not Rocket Pods activations',()=>{
  const {duel,state,finish}=fixture();
  state.rival.headingError=Math.PI;
  startRocketVolley(duel,state.rival);
  const measured=finish();
  assert.equal(measured.cpu.firings,1);
  assert.equal(measured.cpu.armorRemoved,40);
  assert.equal(measured.player.firings,0);
  const other=fixture();
  launchAimedRocket(other.duel,other.state,{x:0,y:1,z:20});
  const aimed=other.finish();
  assert.equal(aimed.player.firings,0);
  assert.equal(aimed.player.armorRemoved,0);
});

const race=(seed,enabled,firings,armorRemoved)=>({seed,policy:'wave-two',
  cpuDifficulty:'medium',arsenalRank:13,completed:true,
  flags:enabled?['arsenal','seeker-rockets']:['arsenal'],
  rocketPods:{player:{firings,armorRemoved},cpu:{firings:0,armorRemoved:0},
    unattributed:0,volleys:[]}});

test('paired report weights all firings and uses exact 1.3 comparison',()=>{
  assert.equal(typeof balance.buildSeekerDamageReport,'function');
  const off=[race(1989,false,1,20),race(1990,false,9,0)];
  const on=[race(1989,true,1,0),race(1990,true,9,26)];
  const report=balance.buildSeekerDamageReport(off,on);
  assert.deepEqual(report.damagePerRocket,{off:10,on:8});
  assert.equal(report.off.averageArmorRemoved,2);
  assert.equal(report.on.averageArmorRemoved,2.6);
  assert.equal(report.ratio,1.3);
  assert.equal(report.passed,true);
  assert.equal(report.pairs.length,2);
  on[1].rocketPods.player.armorRemoved+=.000001;
  assert.equal(balance.buildSeekerDamageReport(off,on).passed,false,'no rounding into a pass');
});

test('paired report rejects changed seeds/settings and incomplete or unattributed samples',()=>{
  const off=[race(1989,false,1,10)],on=[race(1989,true,1,10)];
  assert.throws(()=>balance.buildSeekerDamageReport(off,[{...on[0],seed:1990}]),/matched/);
  assert.throws(()=>balance.buildSeekerDamageReport(off,[{...on[0],cpuDifficulty:'hard'}]),/matched/);
  assert.equal(balance.buildSeekerDamageReport(off,[{...on[0],completed:false}]).passed,false);
  const bad={...on[0],rocketPods:{...on[0].rocketPods,unattributed:1}};
  assert.equal(balance.buildSeekerDamageReport(off,[bad]).passed,false);
});

test('paired CLI has one clear report mode and preserves the historical modes',()=>{
  assert.equal(balance.parseArgs(['--seeker-pair','--flags','arsenal','--check']).seekerPair,true);
  for(const other of ['--baseline-only','--wave-two-only','--wave-three-only','--probe=medium,1989','--verbose'])
    assert.throws(()=>balance.parseArgs(['--seeker-pair',other]),/Usage/);
});
