import assert from 'node:assert/strict';
import {test} from 'node:test';
import * as crew from '../src/crew.js';
import {createProfile} from '../src/progression.js';
import {crewPanel} from '../src/crew-ui.js';

const ordinary = ['rook','nell','jax','odessa','cinder','dune','wren','tusk'];
function profile(earned=false) {
  const p = createProfile();
  return {...p,wasteland:{...p.wasteland,discoveredGate:true,xp:1000000,
    crew:{unlocked:[...ordinary,'vesper'],selected:'vesper'},
    warlords:{...p.wasteland.warlords,blackiron:{defeated:earned,wins:earned?1:0,losses:0}}}};
}
test('Vesper is secret until this player has a saved Baron defeat, preserving the ordinary eight',()=>{
  assert.deepEqual(Object.keys(crew.CREW),ordinary);
  assert.equal(typeof crew.crewRoster,'function','earned metadata must keep Vesper outside the ordinary CPU catalog');
  assert.equal(crew.VESPER?.id,'vesper');
  const on = {warlordCardsEnabled:true}, hidden = profile(), earned = profile(true);
  assert.equal(crew.crewRoster(hidden,on).some(c=>c.id==='vesper'),false);
  assert.equal(crewPanel(hidden,String,{gearEnabled:true,...on}).includes('Vesper'),false);
  assert.equal(crew.selectedCrewId(hidden,on),'rook','raw unlocked IDs and rank cannot forge the secret reward');
  assert.equal(crew.selectCrew(hidden,'vesper',on).changed,false);
  assert.equal(crew.crewRoster(earned,on).some(c=>c.id==='vesper'),true);
  assert.equal(crew.selectedCrewId(earned,on),'vesper');
  assert.equal(crew.crewRoster(earned,{warlordCardsEnabled:false}).some(c=>c.id==='vesper'),false);
  assert.equal(crew.selectedCrewId(earned,{warlordCardsEnabled:false}),'rook');
});

import {Duel} from '../src/game.js';
import {createFeatureFlags,FEATURE_STATES} from '../src/feature-flags.js';
import {SIGNATURE_GEAR} from '../src/crew-gear/gear.js';
import {stepFootWeapons} from '../src/onfoot-weapons.js';
import {stepCombat} from '../src/combat.js';
import {fireWeapon} from '../src/combat-weapons.js';
import {carEffect} from '../src/arsenal/car-effects.js';

const DT = 1/120, near = (a,b,label)=>assert.ok(Math.abs(a-b)<1e-7,label+': '+a+' versus '+b);
const switches = (enabled=true,gear=true,waveThree=true)=>createFeatureFlags({storage:null,qa:true,
  overrides:{'warlord-cards':enabled,'crew-gear':gear,'arsenal-wave3':waveThree}});
function race({crewId='vesper',enabled=true,gear=true,discovered=true,levels={},waveThree=true}={}) {
  const duel = new Duel({seed:1989,featureFlags:switches(enabled,gear,waveThree)});
  duel.startCampaign({mode:'wasteland',car:'falcone_f42',driverId:'club',crewId,
    discoveredGate:discovered,arsenalRank:30,seed:1989,opponentCount:1,cpuDifficulty:'easy',
    weaponLoadout:['tesla','crossbow','magnet','decoy'],weaponLevels:levels});
  const s = duel.state;
  Object.assign(s,{status:'racing',countdown:0,invulnerableSec:0,traffic:[],s:500,prevS:500,
    lateral:0,prevLateral:0,speedMph:0,headingError:0});
  Object.assign(s.opponents[0],{s:650,prevS:650,lateral:0,prevLateral:0,speedMph:0,headingError:0});
  s.combat.aiTimer = s.combat.pickupTimer = Infinity;
  const events=[];duel.onChange((_,e)=>events.push(e));
  return {duel,state:s,rival:s.opponents[0],events};
}
function footFixture(options={}) {
  const f = race(options);
  assert.equal(f.state.crewId,'vesper','native campaign admission uses the earned identity');
  f.duel.setInput({interact:true});for(let i=0;i<48;i++)f.duel.step(DT);
  assert.equal(f.state.onFoot,true,'native F hold exits the actual car');
  f.duel.setInput({interact:false});f.duel.step(DT);
  assert.equal(f.duel.selectFootGear(3),true);
  assert.equal(f.state.footWeapons.selected,'shock-charge','native slot 3 dispatches Shock Charge');
  // Existing arsenal fixture convention: flat geometry isolates effects and
  // native dispatch from driving. The actual exit and gear initialization above
  // run through Duel; no charge, projectile or effect is manufactured here.
  const point=(s,lateral=0)=>({x:lateral,y:0,z:s,heading:0,curvature:0});
  f.duel.course={...f.duel.course,length:10000,closed:false,at:point,groundAt:point,worldAt:point,
    nearest:(x,z)=>({s:z,lateral:x,distance:Math.abs(x)}),obstaclesNear:()=>[],roadHalfWidthAt:()=>20};
  f.duel._obstacles=()=>[];
  Object.assign(f.state.fighter,{x:0,y:0,z:520,s:520,lateral:0,yaw:0,pitch:0});
  Object.assign(f.rival,{s:528,prevS:528,lateral:0,prevLateral:0,speedMph:0,
    headingError:0,armor:100,maxArmor:100,combatShield:0});
  f.events.length=0;return f;
}
function ticks(f,count) {
  for(let i=0;i<count;i++){f.state.stageTimeSec+=DT;stepFootWeapons(f.duel,DT);stepCombat(f.duel,DT);}
}
function press(f) {f.duel.setFighterInput({fire:true});ticks(f,1);f.duel.setFighterInput({fire:false});}
const pulses=f=>f.events.filter(e=>e.arsenalCue==='weapon.tesla.pulse');

test('Shock uses a full .4 s Tesla tell, eight metre fighter radius and exact native disable',()=>{
  assert.equal(SIGNATURE_GEAR.vesper?.id,'shock-charge');
  assert.equal(SIGNATURE_GEAR.vesper.capacity,null);
  assert.equal(SIGNATURE_GEAR.vesper.recharge,18);
  const f=footFixture({waveThree:false}), outside={...f.rival,id:'cpu-2',s:528.01,prevS:528.01};f.state.opponents.push(outside);
  f.rival.boosting=true;press(f);
  assert.equal(f.events.filter(e=>e.arsenalCue==='weapon.tesla.charge').length,1);
  ticks(f,46);assert.equal(pulses(f).length,0,'47 native ticks cannot finish the .4 s tell');
  assert.equal(carEffect(f.rival,'disabled'),null);
  ticks(f,1);assert.equal(pulses(f).length,1);
  const pulse=pulses(f)[0].pulse;
  near(pulse.x,0,'pulse fighter x');near(pulse.z,520,'pulse fighter z');assert.equal(pulse.radius,8);
  assert.ok(carEffect(f.rival,'disabled'),'exact eight metre boundary is inside');
  assert.equal(carEffect(outside,'disabled'),null,'eight metres plus one centimetre is outside');
  assert.equal(f.rival.boosting,false);
  assert.equal(fireWeapon(f.duel,'crossbow',true,f.rival),false,'native weapon dispatch is disabled');
  // Native Tesla advances car effects in the same tick that resolves the pulse.
  near(carEffect(f.rival,'disabled').remainingSec,3-DT,'native three-second disable countdown');
  ticks(f,Math.round(3/DT)-2);assert.ok(carEffect(f.rival,'disabled'));
  ticks(f,1);assert.equal(carEffect(f.rival,'disabled'),null,'native disable ends at three seconds');
});

test('Shock consumes Star instead of disable, ends even shielded Scrap Magnet and destroys decoys',()=>{
  const f=footFixture();f.rival.s=f.rival.prevS=525;f.rival.lateral=f.rival.prevLateral=-5;f.rival.weaponLoadout=['magnet','decoy'];
  assert.equal(fireWeapon(f.duel,'magnet',true,f.rival),true);
  assert.equal(fireWeapon(f.duel,'decoy',true,f.rival),true);
  const drone=f.state.opponents.find(a=>a.drone);assert.ok(drone?.active);
  // The owner at -5 m and its native +10 m decoy both lie inside the ring.
  f.state.combat.rivalShield=5;press(f);ticks(f,47);
  assert.equal(f.state.combat.rivalShield,0);assert.equal(carEffect(f.rival,'disabled'),null);
  assert.equal(f.state.combat.magnets.length,0);
  assert.ok(!f.state.opponents.includes(drone)||!drone.active);
});

test('Vesper personal recharge is 13.5 s with unlimited uses; car Tesla recharge and feature isolation stay native',()=>{
  assert.equal(FEATURE_STATES['warlord-cards'],'on');
  const f=footFixture();f.rival.s=f.rival.prevS=580;press(f);
  const user=f.state.crewGear;near(user.nextFireAt-user.lastFireAt,13.5,'Vesper signature recharge');
  assert.equal(user.ammo,null);
  ticks(f,Math.round(13.5/DT)-3);press(f);
  assert.equal(f.events.filter(e=>e.footWeaponFired==='shock-charge').length,1,'cannot fire before ready');
  ticks(f,1);press(f);
  assert.equal(f.events.filter(e=>e.footWeaponFired==='shock-charge').length,2,'can fire when ready');
  ticks(f,Math.round(13.5/DT));press(f);
  assert.equal(f.events.filter(e=>e.footWeaponFired==='shock-charge').length,3);assert.equal(user.ammo,null);
  for(const level of [0,2]) {
    const a=race({levels:{tesla:level}}),b=race({crewId:'rook',levels:{tesla:level}});
    assert.equal(fireWeapon(a.duel,'tesla'),true);assert.equal(fireWeapon(b.duel,'tesla'),true);
    near(a.state.combat.cooldowns.tesla,b.state.combat.cooldowns.tesla,'crew cannot change car recharge');
    near(a.state.combat.cooldowns.tesla,18/1.15**level,'native car upgrade recharge');
  }
  for(const options of [{enabled:false},{gear:false},{discovered:false}])
    assert.notEqual(race(options).state.crewId,'vesper','each required feature/discovery gate protects native admission');
  for(const crewId of ordinary)assert.equal(race({crewId}).state.crewId,crewId,'ordinary admission stays '+crewId);
});

test('native Shock charge and pulse play recorded Tesla cues with wave three off, without opening ordinary car Tesla',async()=>{
  const {EngineAudio}=await import('../src/audio.js');
  const f=footFixture({waveThree:false}),started=[];
  const node=()=>({connect(){},disconnect(){},gain:{value:1,setValueAtTime(){},linearRampToValueAtTime(){}}});
  // Only Web Audio hardware is replaced. Bank definitions, event routing,
  // _playCue, _runCue and _sample remain the production implementations.
  const context={state:'running',currentTime:10,createGain:node,
    createStereoPanner:()=>({...node(),pan:{value:0}}),
    createBufferSource:()=>({connect(){},disconnect(){},stop(){},playbackRate:{value:1},
      start(){started.push(this.buffer.cue);}})};
  const audio=new EngineAudio({flags:f.duel.featureFlags});audio.context=context;
  audio.muted=false;audio.buses={weapons:{}};
  for(const cue of ['weapon.tesla.charge','weapon.tesla.pulse'])audio.cueBuffers[cue]={duration:.6,cue};
  assert.equal(audio._playCue,EngineAudio.prototype._playCue);
  assert.equal(audio._sample,EngineAudio.prototype._sample);
  f.rival.s=f.rival.prevS=580;
  const off=f.duel.onChange((state,event)=>{
    if(!event.arsenalCue)return;
    const before=JSON.stringify(state);audio.event(event,state,f.duel.course);
    assert.equal(JSON.stringify(state),before,'audio cannot change the native race');
  });
  try {
    press(f);ticks(f,47);
    assert.deepEqual(started,['weapon.tesla.charge','weapon.tesla.pulse'],
      'both real native Shock events must start their existing recorded bank samples');
    assert.equal(audio._playCue('weapon.tesla.charge'),null,'ordinary cue calls still require wave three');
    assert.equal(audio._playCue('weapon.tesla.pulse'),null);
    const ordinary=race({crewId:'rook',waveThree:false});
    assert.equal(fireWeapon(ordinary.duel,'tesla'),false,'ordinary car Tesla remains unavailable');
    const shock=f.events.find(event=>event.arsenalCue==='weapon.tesla.charge');
    audio.flags=switches(false,true,false);audio.event(shock,f.state,f.duel.course);
    audio.flags=switches(true,true,false);audio.event(shock,{...f.state,wastelandGateDiscovered:false},f.duel.course);
    assert.equal(started.length,2,'cards-off and undiscovered events cannot start Shock samples');
  } finally {off();}
});
