import assert from 'node:assert/strict';
import {chooseShowWeapon} from '../src/bowl/bowl-weapons.js';
import {Duel} from '../src/game.js';
import {DRIVE} from '../src/config.js';
import {carAlongPush} from '../src/arsenal/car-effects.js';
import {worldPose} from '../src/arena/arena-floor.js';

const dt = 1 / 120;
const degreesBetween = (a, b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b))) * 180 / Math.PI;

function start(night, eventIndex, cpuDifficulty='easy') {
  const duel = new Duel({seed: 1989});
  duel.featureFlags = {enabled: name => name === 'titan-bowl'};
  assert.ok(duel.startBowlNight({night, eventIndex, cpuDifficulty, seed: 1989}));
  if (duel.state.status === 'bowl_weapon_pick') assert.ok(chooseShowWeapon(duel, 'hammer'));
  return duel;
}

function contact(surface, speed, angle, kind, fraction, fight = true, rival = false, rex = false, level = 'medium') {
  const duel = rex ? start(5, 2) : fight ? start(3, 2, level) : start(1, 1);
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
  const before = actor.armor, originalHeading = worldPose(duel, actor).heading;
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
  assert.ok(degreesBetween(originalHeading, nose) < .01, label + ' keeps its heading at impact');
  assert.ok(Math.abs(Math.sin(nose + actor.bowlContactTurn.angle - h)) <= Math.sin(20 * Math.PI / 180),
    label + ' turns toward the original glide angle');
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
    if (fight) assert.equal(truck.armor,truck.maxArmor * (1 - (truck === a ? .5 : 1) / 12), 'Easy player ram recoil and full rival loss');
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
      assert.equal(player.maxArmor - player.armor, level === 'easy' ? (rivalStarts ? 1 : 2.5) : 5, label);
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

for (const [night, index] of [[1,0],[1,1],[1,2],[3,2],[5,2]]) {
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
function raceReady(night, index) {
  const duel = start(night, index, 'medium');
  while (duel.state.status === 'countdown') duel.step(dt);
  duel.state.opponents.forEach((actor, i) => {
    actor.bowlWeapon.kind = null;
    place(duel, actor, 172 + i * 12, 8, 0, 0);
  });
  for (const participant of duel.state.arena?.participants ?? []) participant.protectedSec = 0;
  return duel;
}

function place(duel, actor, s, lateral, headingError, speedMph, height, verticalSpeed = 0) {
  const groundHeight = duel.course.groundAt(s, lateral).y;
  const y = height ?? groundHeight;
  Object.assign(actor, {s, lateral, headingError, speedMph, groundHeight, prevS: s, prevLateral: lateral,
    _jumpY: y, airHeight: y - groundHeight, prevAirHeight: y - groundHeight, prevGroundHeight: groundHeight,
    airborne: y > groundHeight, _verticalSpeed: verticalSpeed});
}

for (const [night, label] of [[3, 'Last Truck Rolling'], [5, 'Scrapasaurus']]) {
  for (const steer of [0, .5]) {
    const duel = raceReady(night, 2), state = duel.state;
    place(duel, state, 38, 17, Math.PI / 2, 35);
    let prior = worldPose(duel, state).heading, hitAt = null, turnDegrees = 0, steeredDuringTurn = false;
    duel.onChange((_, event) => { if (event.bowlWall) hitAt ??= state.stageTimeSec; });
    for (let tick = 0; tick < 70; tick++) {
      duel.setInput({throttle: 1, steer: hitAt === null ? 0 : steer});
      duel.step(dt);
      const heading = worldPose(duel, state).heading, turn = degreesBetween(heading, prior);
      assert.ok(turn <= 15, label + ' wall turn stays under 15 degrees per physics step');
      prior = heading;
      if (hitAt !== null && state.stageTimeSec - hitAt <= .25 + 1e-8) {
        turnDegrees += turn;
        steeredDuringTurn ||= Math.abs(state.yawVelocity) > .1;
      }
    }
    assert.ok(hitAt !== null && turnDegrees >= 80, label + ' eased through the wall turn in a quarter-second');
    assert.ok(state.lateral < 20 && state.speedMph > 15, label + ' is clear of the wall and driving');
    assert.equal(steeredDuringTurn, !!steer, label + ' lets steering continue during the recovery turn');
    if (!steer) assert.ok(degreesBetween(prior, 0) < 1, label + ' straightens along the wall with neutral steering');
  }
}
{
  const duel = raceReady(3, 2), state = duel.state, rival = state.opponents[0];
  place(duel, state, 38, -6, Math.PI / 2, 34);
  place(duel, rival, 38, 0, -Math.PI / 2, 24);
  let sawContact = false, headings = [state, rival].map(actor => worldPose(duel, actor).heading);
  duel.onChange((_, event) => { if (event.bowlWall) sawContact = true; });
  for (let tick = 0; tick < 65; tick++) {
    duel.setInput({throttle: 1, steer: 0});
    duel.step(dt);
    headings = [state, rival].map((actor, index) => {
      const heading = worldPose(duel, actor).heading;
      assert.ok(degreesBetween(heading, headings[index]) <= 15, 'the two trucks turn without a snap after a ram');
      return heading;
    });
  }
  assert.ok(sawContact && state.speedMph > 15, 'a real ram rebounds and leaves the player driving');
}
{
  const duel = raceReady(3, 2), state = duel.state, rival = state.opponents[0];
  place(duel, state, 72, 18, Math.PI / 2, 39);
  place(duel, rival, 76, 18, Math.PI / 2, 11);
  let last = worldPose(duel, state).heading, impacts = 0;
  duel.onChange((_, event) => { if (event.bowlWall) impacts++; });
  for (let tick = 0; tick < 75; tick++) {
    duel.setInput({throttle: 1, steer: tick < 30 ? 1 : -1});
    duel.step(dt);
    const next = worldPose(duel, state).heading;
    assert.ok(degreesBetween(next, last) <= 15 + 1e-8, 'repeated contacts and steering share the 15-degree limit');
    last = next;
  }
  assert.ok(impacts >= 2, 'the same truck meets repeated contacts by the end wall');
}
for (const eventIndex of [0, 1]) {
  const duel = raceReady(3, eventIndex), state = duel.state;
  place(duel, state, 209, -19, -Math.PI / 2, 33, 5.5, -1);
  let reset = false, landed = false, prior = worldPose(duel, state);
  duel.onChange((_, event) => { reset ||= !!(event.checkpointReset || event.boundaryReset || event.terrainRescue); });
  for (let tick = 0; tick < 110; tick++) {
    duel.setInput({throttle: 1, steer: 0});
    duel.step(dt);
    const pose = worldPose(duel, state);
    assert.ok(Math.hypot(pose.x - prior.x, pose.z - prior.z) < .4, 'the airborne lane change is real travel');
    prior = pose;
    if (!state.airborne && !landed) {
      assert.ok(duel.course.phase(state.s) <= 70, 'the truck lands on the far straight');
      assert.equal(state._jumpY, duel._supportAt(state.s, state.lateral, state).y);
      landed = true;
    }
  }
  assert.ok(!reset && landed && state.speedMph > 20, 'Night 3 lands across the Spine and drives on');
  duel._safeReset(state, {s: 48, lateral: -13, headingError: Math.PI / 2});
  assert.equal(state.headingError, 0, 'a real recovery faces along the lap');
  assert.equal(state._jumpY, duel._supportAt(state.s, state.lateral, state).y, 'a real recovery resets at wheel height');
  const {terrainPitch, terrainRoll} = state;
  duel._terrainPose(state);
  assert.deepEqual([state.terrainPitch, state.terrainRoll], [terrainPitch, terrainRoll],
    'the recovery samples wheel support after aligning the truck');
}
for (const start of [51, 162]) {
  const duel = raceReady(3, 1), state = duel.state;
  place(duel, state, start, -23, -Math.PI / 2, 5, 3.5, -4);
  let onRoof = false, offRoof = false, last = worldPose(duel, state);
  for (let tick = 0; tick < 140; tick++) {
    duel.setInput({throttle: 0, steer: 0});
    duel.step(dt);
    const pose = worldPose(duel, state);
    assert.ok(Math.hypot(pose.x - last.x, pose.z - last.z) < .15, 'the roof descent slides without a sideways hop');
    last = pose;
    if (!state.airborne && state._jumpY === duel.course.features.bowl.spine.height) onRoof = true;
    if (onRoof && !state.airborne && state._jumpY === duel.course.groundAt(state.s, state.lateral).y) offRoof = true;
  }
  assert.ok(onRoof && offRoof, 'a descending truck lands on the Spine roof and slides down to the dirt');
}
console.log('Bowl walls, eased contact turns, the Spine crossing, health and held-throttle starts passed.');
