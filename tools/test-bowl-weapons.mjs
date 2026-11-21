import assert from 'node:assert/strict';
import {BOWL_SOUND_CUES} from '../src/bowl/bowl-lines.js';
import {Duel} from '../src/game.js';
import {bowlHealthLoss, chooseShowWeapon, showMotion, showTarget, stepShowWeapons} from '../src/bowl/bowl-weapons.js';
import {bowlHudView} from '../src/bowl/bowl-night.js';
import {worldPose} from '../src/arena/arena-floor.js';

const dt=1/120;
function fight(kind='hammer',level='medium',night=5) {
  const duel=new Duel({seed:1989});
  duel.featureFlags={enabled:name=>name==='titan-bowl'};
  const eventIndex=night===5?1:2;
  assert.ok(duel.startBowlNight({night,eventIndex,cpuDifficulty:level,seed:1989}));
  assert.equal(duel.state.bowlNight.event.type,'lastTruckRolling');
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
for (const [level, hammer, launcher] of [['easy', 8, 8], ['medium', 18, 10], ['hard', 18, 10]]) {
  for (const [kind, expected] of [['hammer', hammer], ['launcher', launcher], ['horn', hammer]]) {
    const duel = fight('hammer', level), state = duel.state;
    const rival = line(duel);
    place(duel, rival, kind === 'horn' ? 29.5 : 27.8, 0);
    if (kind === 'horn') rival.speedMph = 50;
    rival.bowlWeapon.kind = kind;
    ticks(duel, Math.round(({easy: .8, medium: .6, hard: .4})[level] / dt));
    if (kind === 'launcher') {
      assert.ok(state.bowlFlight?.owner && state.bowlFlight.owner !== 'player');
      for (let tick = 0; tick < 240 && state.bowlFlight; tick++) showMotion(duel, state, dt, () => {});
      assert.equal(state.bowlFlight, undefined, 'the rival throw landed');
    }
    assert.ok(Math.abs(state.maxArmor - state.armor - expected) < 1e-8,
      level + ' rival ' + kind + ' takes the expected health from the player');
    sums(state);
  }
}

for (const [level, expected] of [['easy', 4], ['medium', 13.5], ['hard', 13.5]]) {
  const duel = fight('hammer', level), state = duel.state;
  const [saw, fire] = state.opponents;
  line(duel);
  place(duel, saw, 29.5, 0);
  place(duel, fire, 36.5, 0, Math.PI);
  Object.assign(saw.bowlWeapon, {kind: 'saw', phase: 'active'});
  Object.assign(fire.bowlWeapon, {kind: 'fire', phase: 'active'});
  assert.equal(showTarget(duel, saw, 1.5).actor, state);
  assert.equal(showTarget(duel, fire, 6).actor, state);
  ticks(duel, 120);
  assert.ok(Math.abs(state.maxArmor - state.armor - expected) < 1e-8,
    level + ' simultaneous saw and fire draw from the expected damage budget');
  sums(state);
}

{
  const d=fight(),s=d.state,[a,b]=s.opponents;
  line(d);place(d,a,38.5,-2.4);place(d,b,38.5,2.4);
  s.input.interact=true;ticks(d,48);
  assert.deepEqual([a.armor,b.armor],[42,42],'the hammer swing reaches both bodies beside its nose');
  const v=s.opponents[2];
  for(const side of ['front','rear','left','right']) {
    assert.equal(bowlHealthLoss(d,v,1/12,'player',side),5);sums(v);
  }
  assert.equal(bowlHealthLoss(d,v,1,'player','rear'),40);sums(v);
}
{
  const d=fight(),s=d.state;line(d,4.1);
  s.input.interact=true; ticks(d,48);
  assert.equal(s.bowlHeldStill,.5);assert.equal(s.bowlWeapon.phase,'rest');
}
{
  const d=fight('saw'),s=d.state,v=line(d,1.49);
  s.input.interact=true; ticks(d,120);
  assert.equal(v.armor,52.5);assert.ok(v.bowlCut&&s.bowlCut);sums(v);
  ticks(d,360);assert.equal(v.armor,30);assert.equal(s.bowlWeapon.phase,'rest');assert.equal(s.bowlWeapon.time,3);
  ticks(d,359);assert.equal(v.armor,30);
  line(d,1.51);ticks(d,120);assert.equal(v.armor,30,'a bumper gap over 1.5 m is out of reach');
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
  const d=fight('launcher'),s=d.state;line(d,4.1);
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
  // Reproduce the laptop setup on the straight side and the rounded stadium end.
  for (const road of [34,106]) for (const low of [false,true]) {
    const d=fight('launcher'),s=d.state,[v]=s.opponents,wall=d.course.features.bowl.outside.wall;
    line(d);place(d,s,road,wall-8,Math.PI/2);place(d,v,road,wall-3.4,Math.PI/2);
    s.input.interact=true;d.step(dt);
    assert.ok(v.bowlFlight);
    if (low) v.bowlFlight.height=1;
    let crossed=false;
    for (let k=0;k<240;k++) {
      d.step(dt);
      if (v.airborne && v.lateral>wall) crossed=true;
    }
    assert.equal(crossed,!low,'only a flight above the rim crosses it');
    assert.equal(s.bowlNight.event.knockouts,low?0:1);
    assert.equal(s.bowlNight.event.rivals[0].out,!low);
    if (!low) assert.equal(s.bowlNight.event.rivals[0].by,'player');
  }
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
// The three difficulty levels change the rivals' warning time for the fire weapon.
for (const [level,seconds] of [['easy',.8],['medium',.6],['hard',.4]]) {
  const d=fight('hammer',level),s=d.state, enemy=s.opponents[0];
  place(d,s,39,0); place(d,enemy,33,0);
  for(const [i,a] of s.opponents.slice(1).entries()) place(d,a,75+15*i,0);
  enemy.speedMph=40;
  ticks(d,Math.round(seconds/dt)-1);
  assert.equal(s.armor,60); assert.equal(enemy.bowlWeapon.phase,'tell');
  assert.equal(enemy.bowlWeapon.kind,'fire');
  ticks(d,1); assert.ok(s.armor<60);
  const expected = level === 'easy' ? 56 : 54;
  ticks(d,119); assert.ok(Math.abs(s.armor-expected)<1e-7);
  sums(s);
}
{
  const d=fight('hammer','easy',3),s=d.state,launcher=s.opponents[2];
  line(d);place(d,launcher,27,0);place(d,s,33,0);const cues=[];
  d.onChange((_,ev)=>{if(ev.bowlWeaponCue) cues.push(ev.bowlWeaponCue);});
  ticks(d,1);assert.equal(launcher.bowlWeapon.phase,'tell');
  place(d,s,70,10);ticks(d,96);
  assert.ok(!launcher.bowlFlight && !cues.includes('bowl.launcher.fire'),'a rival does not fire into empty space');
}
{
  const d=fight('hammer','hard',4),s=d.state,horn=s.opponents[0];
  place(d,s,38.4,0);place(d,horn,33,0);horn.speedMph=40;
  s.opponents.slice(1).forEach((a,i)=>place(d,a,80+12*i,0));
  ticks(d,48);assert.equal(s.armor,48);sums(s);
}
// Keep the target's ordinary pilot and mute its weapon for these contact drives.
function isolate(duel) {
  const [target, ...others] = duel.state.opponents;
  target.bowlWeapon.kind = null;
  others.forEach((actor, index) => {
    actor.bowlWeapon.kind = null;
    place(duel, actor, 172 + index * 12, 8);
  });
  return target;
}
for (const level of ['easy', 'medium', 'hard']) {
  const d = fight('hammer', level), s = d.state, target = isolate(d);
  place(d, s, 8, 6);
  place(d, target, 17.5, 8.7);
  s.speedMph = target.speedMph = 25;
  assert.equal(showTarget(d, s, 4), null, 'the truck is out of reach at the press');
  d.setInput({throttle: .5, steer: 0, interact: true});
  for (let tick = 0; tick < 47; tick++) d.step(dt);
  assert.ok(s.s > 12 && target.s > 20, 'both trucks are moving during the tell');
  assert.equal(showTarget(d, s, 4)?.actor, target, 'the landing position is now in reach');
  assert.equal(target.armor, 60, 'the hammer is still raised');
  d.step(dt);
  assert.equal(target.armor, 42, 'the hammer hits the moving truck on the 48th step');
  assert.ok(level === 'hard' ? s.bowlWeapon.lean === 0 : s.bowlWeapon.lean > 0 && s.bowlWeapon.lean <= Math.PI / 6,
    'only Easy and Medium lean toward the truck');
}
{
  const d = fight('saw', 'medium', 4), s = d.state, target = isolate(d);
  place(d, s, 34, 0);
  place(d, target, 39, 1.9);
  s.speedMph = 25;
  target.speedMph = 17;
  d.setInput({throttle: 1, steer: 0, interact: true});
  const first = worldPose(d, s);
  let ram = false;
  d.onChange((_, event) => { ram ||= !!event.bowlWall; });
  for (let tick = 0; tick < 30; tick++) d.step(dt);
  assert.ok(s.bowlCut && target.bowlCut && target.armor < 60, 'both trucks slow during a real cut');
  assert.ok(!ram && Math.abs(worldPose(d, s).x - first.x) < .01, 'the saw contact does not shove the truck sideways');
  d.setInput({throttle: .5, steer: .5, interact: true});
  for (let tick = 0; tick < 10; tick++) d.step(dt);
  assert.ok(s.bowlCut && Math.abs(s.headingError) > .001, 'steering still works during contact');
  d.setInput({throttle: 1, steer: 0, interact: false});
  d.step(dt);
  assert.ok(!s.bowlCut && !target.bowlCut, 'letting go releases both trucks');
}
for (const [level, distance, degrees, hits] of [
  ['easy', 3.8, 35, true], ['medium', 3.8, -35, true], ['hard', 3.8, 35, false],
  ['hard', 2.9, 35, true], ['easy', 3.5, 45, false],
]) {
  const d = fight('launcher', level), s = d.state, target = isolate(d), spec = d._vehicleSpec(s);
  place(d, s, 34, 0);
  const angle = degrees * Math.PI / 180;
  const off = Math.sign(angle) * spec.halfWidth + distance * Math.sin(angle);
  place(d, target, 34 + 2 * spec.halfLength + distance * Math.cos(angle), off);
  d.setInput({interact: true});
  d.step(dt);
  assert.equal(!!target.bowlFlight, hits, `${level}: ${distance} m at ${degrees} degrees`);
  assert.equal(!!s.bowlFlight, !hits, 'an empty shot still hops the launcher truck');
}

// Run the actual App event dispatch with memory-only storage and silent audio output.
{
  const values=new Map();
  globalThis.localStorage={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};
  globalThis.window=new EventTarget(); window.location={search:''};
  globalThis.Element??=class {};
  globalThis.requestAnimationFrame=()=>1; globalThis.cancelAnimationFrame=()=>{};
  const {App}=await import('../src/app.js');
  const app=new App(),d=app.duel;
  d.featureFlags={enabled:name=>name==='titan-bowl'};
  assert.ok(d.startBowlNight({night:3,eventIndex:2,cpuDifficulty:'easy',seed:1989}));
  assert.ok(chooseShowWeapon(d,'hammer')); while(d.state.status==='countdown') d.step(dt);
  const named=[],played=[],audio=app.audio;
  const route=app._showNightCue.bind(app), receive=audio.event.bind(audio);
  app._showNightCue=id=>{named.push(id);route(id);};
  audio.flags=d.featureFlags; audio.context={state:'running',close:()=>Promise.resolve()};
  audio.muted=false; audio.paused=false; audio._syncMixer=()=>{};
  audio._playCue=id=>played.push(id);
  audio.event=(ev,...args)=>{if(ev.arenaWreck) receive(ev,...args);};
  const key=type=>{
    const event=new Event(type,{cancelable:true});
    Object.defineProperty(event,'code',{value:'KeyF'});
    window.dispatchEvent(event);
    app._applyInput(dt);
  };
  key('keydown');assert.equal(d.state.input.interact,true);ticks(d,1);
  assert.equal(d.state.bowlWeapon.phase,'tell');
  key('keyup');assert.equal(d.state.input.interact,false);
  for (let tick=0;tick<480;tick++) d.step(dt);
  key('keydown');assert.equal(d.state.input.interact,true);ticks(d,1);
  assert.equal(d.state.bowlWeapon.phase,'tell','a second physical F press starts another hammer swing');
  key('keyup');
  bowlHealthLoss(d,d.state.opponents[0],1,'player','front');
  d.step(dt);d.step(dt);
  assert.equal(named.filter(id=>id==='bowl.knockout').length,1);
  assert.equal(played.filter(id=>id===BOWL_SOUND_CUES['bowl.knockout']).length,1);
  assert.ok(!played.includes('arena.wreck-credit'));
  audio.event({arenaWreck:{victimId:'cpu-1',creditedId:'player'}},{arena:{mode:'last-car-rolling'}});
  assert.equal(played.filter(id=>id==='arena.wreck-credit').length,1);
  audio.context=null;
  app.dispose();
}
console.log('Bowl show weapons, four-part armor, wall knockout and gate return passed.');
