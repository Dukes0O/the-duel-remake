import assert from 'node:assert/strict';
import {chooseShowWeapon} from '../src/bowl/bowl-weapons.js';
import {Duel} from '../src/game.js';
import {DRIVE} from '../src/config.js';
import {carAlongPush} from '../src/arsenal/car-effects.js';

function start(night, eventIndex, cpuDifficulty='easy') {
  const duel = new Duel({seed: 1989});
  duel.featureFlags = {enabled: name => name === 'titan-bowl'};
  assert.ok(duel.startBowlNight({night, eventIndex, cpuDifficulty, seed: 1989}));
  if (duel.state.status === 'bowl_weapon_pick') assert.ok(chooseShowWeapon(duel, 'hammer'));
  return duel;
}

function contact(surface, speed, angle, kind, fraction, fight = true, rival = false, rex = false, level = 'medium') {
  const duel = rex ? start(5, 3) : fight ? start(3, 2, level) : start(1, 1);
  const actor = rival ? duel.state.opponents[0] : duel.state;
  const walls = duel.course.features.barriers.filter(wall => wall.arenaWall);
  const at = surface === 'end' ? 105 : 35;
  const wall = walls.filter(w => (w.off < 0) === (surface === 'spine'))
    .sort((a,b) => Math.abs(a.s-at) - Math.abs(b.s-at))[0];
  const side = Math.sign(wall.off), h = wall.heading;
  const nx = -side * Math.cos(h), nz = side * Math.sin(h);
  const point = distance => duel._roadPosition({x: wall.x + nx*distance, z: wall.z + nz*distance}, wall.s);
  const from = point(6), to = point(1.8);
  const heading = h + side * angle * Math.PI / 180;
  Object.assign(actor, {s: to.s, lateral: to.lateral, prevS: from.s, prevLateral: from.lateral,
    headingError: heading - duel.course.at(to.s).heading, speedMph: speed, pushVelocity: 0});
  if (fight && !rex) for (const participant of duel.state.arena.participants) participant.protectedSec = 0;
  const before = actor.armor;
  let hit;
  duel.onChange((_, ev) => { if (ev.bowlWall) hit = ev.bowlWall; });
  duel._staticContacts(actor, !rival);
  const label = [surface, speed, angle, kind, rival ? 'rival' : 'player'].join(' ');
  assert.equal(hit?.kind, kind, label);
  assert.ok(Math.abs(hit.mph - speed * Math.sin(angle * Math.PI/180)) < 1, label + ' normal speed');
  const frame = duel.course.at(actor.s).heading, nose = frame + actor.headingError;
  const vx = Math.sin(nose)*actor.speedMph + (Math.cos(frame)*actor.pushVelocity + Math.sin(frame)*carAlongPush(actor))/DRIVE.mphToWorld;
  const vz = Math.cos(nose)*actor.speedMph + (-Math.sin(frame)*actor.pushVelocity + Math.cos(frame)*carAlongPush(actor))/DRIVE.mphToWorld;
  assert.ok(vx*nx + vz*nz > 0, label + ' leaves the wall');
  assert.ok(Math.abs(Math.sin(nose-h)) <= Math.sin(20*Math.PI/180), label + ' points along wall');
  if (kind === 'scrape') assert.ok(Math.abs(Math.hypot(vx,vz) - speed*.95) < .01, label + ' retains 95%');
  else assert.ok(Math.abs(vx*nx + vz*nz - Math.max(2/DRIVE.mphToWorld, hit.mph*({big:.25,hard:.3,bounce:.4})[kind])) < .1,
    label + ' normal restitution');
  if (rex) assert.equal(duel.state.bowlNight.event.rex.hits, fraction * 5, label + ' fractional scorch');
  else if (fight) assert.ok(Math.abs(before - actor.armor - actor.maxArmor*fraction) < 1e-8, label + ' armor');
  else assert.ok(Object.values(actor.damageZones).every(d => d === 0), label + ' no wear');
}

for (const surface of ['stand','spine','end']) {
  for (const [speed, angle, kind, fraction] of [[10,90,'bounce',0],[35,90,'hard',1/12],[55,90,'big',1/6],[55,20,'scrape',0]]) {
    contact(surface, speed, angle, kind, fraction);
  }
}
// The approved player's Easy wall share leaves rival walls and all other levels at full cost.
contact('stand', 35, 90, 'hard', 1/60, true, false, false, 'easy');
contact('stand', 55, 90, 'big', 1/30, true, false, false, 'easy');
contact('stand', 35, 90, 'hard', 1/12, true, true, false, 'easy');
contact('stand', 55, 90, 'big', 1/6, true, false, false, 'hard');
contact('stand', 55, 90, 'big', 0, false);
contact('stand', 35, 90, 'hard', 1/12, true, true);

contact('stand', 35, 90, 'hard', 1/12, true, false, true);

for (const fight of [false, true]) {
  const duel = fight ? start(3,2) : start(1,2), a = duel.state, b = a.opponents[0];
  Object.assign(a, {s: 34, prevS: 25, lateral: 0, prevLateral: 0, speedMph: 35, headingError: 0});
  Object.assign(b, {s: 35, prevS: 35, lateral: 0, prevLateral: 0, speedMph: 0, headingError: 0});
  if (fight) for (const participant of a.arena.participants) participant.protectedSec = 0;
  let hit;
  duel.onChange((_, ev) => { if (ev.bowlWall) hit = ev.bowlWall; });
  duel._vehicleContact(a,b,'rival');
  assert.equal(hit?.kind, 'hard', 'the trucks meet');
  const along = actor => Math.cos(actor.headingError)*actor.speedMph + carAlongPush(actor)/DRIVE.mphToWorld;
  assert.ok(along(b) > along(a), 'the two trucks separate');
  for (const truck of [a,b]) {
    if (fight) assert.equal(truck.armor,truck.maxArmor*(1-1/12), 'each loses a twelfth');
    else assert.ok(Object.values(truck.damageZones).every(value => value === 0), 'neither truck wears');
  }
}

// A faster closing rival gets the Easy ram share on either contact axis.
for (const side of [false, true]) {
  for (const level of ['easy', 'medium', 'hard']) {
    for (const rivalStarts of [false, true]) {
      const duel = start(3, 2, level), player = duel.state, rival = player.opponents[0];
      for (const participant of player.arena.participants) participant.protectedSec = 0;
      const heading = side ? Math.PI / 2 : 0;
      Object.assign(player, {s:34, prevS:side ? 34 : 28, lateral:0, prevLateral:side ? -6 : 0,
        speedMph:rivalStarts ? 8 : 27, headingError:heading});
      Object.assign(rival, {s:side ? 34 : 35, prevS:side ? 34 : 41,
        lateral:side ? 1 : 0, prevLateral:side ? 7 : 0,
        speedMph:rivalStarts ? 27 : 8, headingError:heading + Math.PI});
      if (side) {
        player.pushVelocity = player.speedMph * DRIVE.mphToWorld;
        player.headingError = 0;
        player.speedMph = 0;
      }
      duel._vehicleContact(rival, player, 'rival');
      const label = [level, side ? 'lateral' : 'head-on', rivalStarts ? 'rival' : 'player'].join(' ');
      assert.equal(player.maxArmor - player.armor, level === 'easy' && rivalStarts ? 1 : 5, label);
      assert.equal(rival.maxArmor - rival.armor, 5, label + ' rival armor');
      if (side) assert.ok(player.damageZones.left > 0 || player.damageZones.right > 0, label + ' hit the flank');
    }
  }
}

// The moving pair shares its across-road drift, so that drift cannot turn a
// square closing impact into a scrape. Both bodies keep drifting the same way.
for (const swapped of [false, true]) {
  const duel = start(3,2);
  const [a,b] = swapped ? [duel.state.opponents[1],duel.state.opponents[0]] : duel.state.opponents;
  Object.assign(a, {s:34,prevS:25,lateral:0,prevLateral:0,speedMph:35,headingError:0,pushVelocity:50});
  Object.assign(b, {s:35,prevS:35,lateral:0,prevLateral:0,speedMph:0,headingError:0,pushVelocity:50});
  let hit;
  duel.onChange((_,ev) => { if (ev.bowlWall) hit = ev.bowlWall; });
  if (swapped) duel._vehicleContact(b,a,'rival');
  else duel._vehicleContact(a,b,'rival');
  assert.equal(hit?.kind, 'hard', 'shared sideways motion leaves the relative impact square');
  for (const actor of [a,b]) {
    const lateral = Math.sin(actor.headingError)*actor.speedMph*DRIVE.mphToWorld + actor.pushVelocity;
    assert.ok(Math.abs(lateral - 45) < 1e-8, 'both trucks retain 90% of shared drift');
  }
}

for (const [night, index] of [[1,0],[1,1],[1,2],[3,2],[5,3]]) {
  const duel = start(night, index);
  const s = duel.state, type = s.bowlNight.event.type;
  let slow = 0, elapsed = 0;
  for (let tick = 0; tick < 120*36 && elapsed < 30; tick++) {
    duel.setInput({throttle: 1, steer: 0, brake: 0});
    duel.step(1/120);
    if (s.bowlNight.phase !== 'event') break;
    if (s.status !== 'racing') continue;
    elapsed += 1/120;
    slow = s.speedMph < 5 ? slow + 1/120 : 0;
    assert.ok(slow <= 1, type + ' stuck at ' + elapsed + 's, speed ' + s.speedMph + ', S ' + s.s + ', lateral ' + s.lateral);
  }
  assert.ok(elapsed > 0, type + ' ran');
}
console.log('Bowl wall positions, responses, health and held-throttle starts passed.');
