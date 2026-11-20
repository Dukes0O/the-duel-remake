import assert from 'node:assert/strict';
import {Duel} from '../src/game.js';
import {bowlHealthLoss, chooseShowWeapon, showMotion, showTarget, stepShowWeapons} from '../src/bowl/bowl-weapons.js';
import {bowlHudView} from '../src/bowl/bowl-night.js';

const dt=1/120;
function fight(kind='hammer',level='medium',night=5) {
  const duel=new Duel({seed:1989});
  duel.featureFlags={enabled:name=>name==='titan-bowl'};
  assert.ok(duel.startBowlNight({night,eventIndex:2,cpuDifficulty:level,seed:1989}));
  assert.equal(duel.state.status,'bowl_weapon_pick');
  assert.ok(chooseShowWeapon(duel,kind));
  while(duel.state.status==='countdown') duel.step(dt);
  duel.state.invulnerableSec=0;
  duel.state.arena.participants.forEach(p=>p.protectedSec=0);
  return duel;
}
function place(d,a,s,lateral,heading=0) {
  const y=d.course.groundAt(s,lateral).y;
  Object.assign(a,{s,prevS:s,lateral,prevLateral:lateral,headingError:heading,speedMph:0,pushVelocity:0,
    _jumpY:y,airHeight:0,airborne:false,groundHeight:y,prevGroundHeight:y,_verticalSpeed:0});
}
function line(d,gap=0) {
  const s=d.state, [target,...others]=s.opponents;
  place(d,s,33,0);
  place(d,target,33+5.2+gap,0);
  others.forEach((a,i)=>place(d,a,100+12*i,0));
  return target;
}
function ticks(d,n) { for(let i=0;i<n;i++) stepShowWeapons(d,d.state.bowlNight,dt); }
function sums(a) {
  const loss=Object.values(a.damageZones).reduce((sum,v)=>sum+v*a.maxArmor/5,0);
  assert.ok(Math.abs(loss-(a.maxArmor-a.armor))<1e-7,'health lost equals the sum of actual side losses');
}
for(const night of [3,4,5]) {
  const d=fight('hammer','easy',night);
  assert.deepEqual(d.state.bowlNight.event.weaponChoices,['hammer','saw','launcher'].slice(0,night-2));
  assert.ok(!chooseShowWeapon(d,'launcher'),'cannot switch during the fight');
  d.retryBowlEvent();
  assert.equal(d.state.status,'bowl_weapon_pick');
  if(night<5) assert.ok(!chooseShowWeapon(d,'launcher'));
}
{
  const d=fight(),s=d.state,target=line(d,3.9);
  assert.equal(showTarget(d,s,4).actor,target);
  s.input.interact=true;
  ticks(d,47); assert.equal(target.armor,60);
  ticks(d,1); assert.equal(target.armor,42);assert.equal(target.bowlNoSteer,1);
  assert.equal(s.bowlWeapon.time,2.5);
  sums(target);
  assert.equal(bowlHealthLoss(d,target,1,'player','left'),42);
  sums(target);
}
{
  const d=fight(),s=d.state;line(d,4.1);
  s.input.interact=true; ticks(d,48);
  assert.equal(s.bowlHeldStill,.5);assert.equal(s.bowlWeapon.phase,'rest');
}
{
  const d=fight('saw'),s=d.state,v=line(d,.1);
  s.input.interact=true; ticks(d,120);
  assert.equal(v.armor,52.5);assert.ok(v.bowlCut&&s.bowlCut);sums(v);
  ticks(d,360);assert.equal(v.armor,30);assert.equal(s.bowlWeapon.phase,'rest');assert.equal(s.bowlWeapon.time,3);
  ticks(d,359);assert.equal(v.armor,30);
}
{
  const d=fight(),s=d.state;
  place(d,s,36,0);
  s.speedMph=24; s.bowlCut=true;
  const position=s.s;
  const coast=t=>{s.s+=s.speedMph*.44704*t;};
  for(let k=0;k<120;k++) assert.ok(showMotion(d,s,dt,coast));
  assert.ok(Math.abs(s.s-position-12*.44704)<1e-8);
  assert.equal(s.speedMph,12,'cutting halves actual speed without halving again every tick');
  s.bowlCut=false;s.bowlNoSteer=1;s.input.steer=1;
  for(let k=0;k<120;k++) showMotion(d,s,dt,(_,locked)=>{assert.ok(locked);assert.equal(s.input.steer,0);});
  assert.equal(s.input.steer,1,'held steering returns after one second');
}
{
  const d=fight('launcher'),s=d.state,v=line(d,2);
  s.input.interact=true;
  d.step(dt);
  assert.ok(v.bowlFlight?.owner==='player'); assert.equal(s.bowlWeapon.time,4);
  s.input.interact=false;
  const start=d.course.worldAt(v.s,v.lateral), original=v.bowlFlight;
  let peak=0;
  for(let k=0;k<240&&v.bowlFlight;k++){d.step(dt);peak=Math.max(peak,v.airHeight);}
  const end=d.course.worldAt(v.s,v.lateral);
  assert.ok(Math.abs(peak-6)<.1);
  assert.ok(Math.abs(Math.hypot(end.x-original.x,end.z-original.z)-12)<.1);
  assert.equal(v.bowlHeldStill,2.5); assert.equal(v.armor,50); sums(v);
  for(let k=0;k<301;k++)d.step(dt);
  assert.ok(!v.bowlRighting);
}
{
  const d=fight('launcher'),s=d.state;line(d,4);
  s.input.interact=true; let peak=0;
  for(let k=0;k<150;k++){d.step(dt);peak=Math.max(peak,s.airHeight);}
  assert.ok(Math.abs(peak-1.5)<.1 && !s.bowlRighting);
}
{
  const d=fight('launcher'),s=d.state,[v]=s.opponents,wall=d.course.features.bowl.outside.wall;
  line(d);place(d,s,34,wall-12,Math.PI/2);place(d,v,34,wall-6,Math.PI/2);
  s.input.interact=true;
  for(let k=0;k<160&&!s.bowlNight.event.rivals[0].out;k++) d.step(dt);
  const out=s.bowlNight.event.rivals[0];
  assert.ok(out.out && out.by==='player' && s.bowlNight.event.knockouts===1,'a real airborne wall crossing has one credited knockout');
  sums(v);
}
{
  const d=fight(),s=d.state,night=s.bowlNight,o=d.course.features.bowl.outside;
  line(d);place(d,s,34,o.wall+1,Math.PI/2);
  Object.assign(s,{prevLateral:o.wall-.1,airborne:true,airHeight:6});
  ticks(d,1);
  assert.ok(night.event.returnSeconds>14.99);
  assert.match(bowlHudView(s,d.course).goal,/15 s/);
  const gate=o.gates[0];
  place(d,s,gate.s,o.wall+3,-Math.PI/2);s.speedMph=15;
  night.event.visitedOutside=true;
  for(let k=0;k<120;k++){d.setInput({throttle:1,steer:0});d.step(dt);}
  assert.equal(night.event.returnSeconds,null,'driving through the gate stops the count');
  // A second excursion without re-entry runs the whole fifteen seconds.
  place(d,s,34,o.wall+1,Math.PI/2);
  Object.assign(s,{prevLateral:o.wall-.1,airborne:true,airHeight:6});
  ticks(d,1);
  place(d,s,34,o.back+22,0);
  s.input.throttle=0;
  for(let k=0;k<1798;k++)d.step(dt);
  assert.ok(night.event.returnSeconds>0 && night.lastResult===null);
  for(let k=0;k<5&&!night.lastResult;k++)d.step(dt);
  assert.equal(night.lastResult.knockedOut,true);
  assert.equal(s.armor,0);sums(s);
}
// The three difficulty levels change the rivals' warning time, never their reach.
for (const [level,seconds] of [['easy',.8],['medium',.6],['hard',.4]]) {
  const d=fight('hammer',level),s=d.state, enemy=s.opponents[0];
  place(d,s,39,0); place(d,enemy,33,0);
  for(const [i,a] of s.opponents.slice(1).entries()) place(d,a,75+15*i,0);
  enemy.speedMph=40;
  ticks(d,Math.round(seconds/dt)-1);
  assert.equal(s.armor,60); assert.equal(enemy.bowlWeapon.phase,'tell');
  assert.equal(enemy.bowlWeapon.kind,'fire');
  ticks(d,1); assert.ok(s.armor<60);
  ticks(d,119); assert.ok(Math.abs(s.armor-54)<1e-7);
  sums(s);
}
{
  const d=fight('hammer','hard',4),s=d.state,horn=s.opponents[0];
  place(d,s,38.4,0);place(d,horn,33,0);horn.speedMph=40;
  s.opponents.slice(1).forEach((a,i)=>place(d,a,80+12*i,0));
  ticks(d,48);assert.equal(s.armor,48);sums(s);
}
console.log('Bowl show weapons, four-part armor, wall knockout and gate return passed.');
