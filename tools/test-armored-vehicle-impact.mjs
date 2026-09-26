import assert from 'node:assert/strict';
import { CARS, LIVES } from '../src/config.js';
import {LegacyRoadsideDuel, ClassicDestructionDuel} from './legacy-roadside-duel.mjs';
import { combatCrashThresholdMph, rearRamResponse } from '../src/vehicle-impact.js';

const race = (mode = 'wasteland', car = 'banshee_muscle', classicDestruction = false,
  wasteland2 = false) => {
  // This suite pins the earlier armored-contact rules; CMB-08 tests the
  // released roadside rule separately.
  const duel = new (classicDestruction ? ClassicDestructionDuel : LegacyRoadsideDuel)({
    seed: 624, featureFlags: {wasteland2, 'crash-physics': true},
  });
  duel.startCampaign({ mode, car, startStage: 0 });
  const player = duel.state;
  player.status = 'racing'; player.invulnerableSec = 0; player.traffic = [];
  player.s = 100; player.prevS = 80; player.lateral = player.prevLateral = 0;
  player.speedMph = 130;
  const rival = player.rival;
  Object.assign(rival, { s: 105, prevS: 105, lateral: .6, prevLateral: .6,
    speedMph: 25, headingError: 0, pushVelocity: 0, contactCooldown: 0 });
  return { duel, player, rival };
};

assert.ok(combatCrashThresholdMph(CARS.banshee_muscle) > combatCrashThresholdMph(CARS.viper_proto),
  'heavier armored muscle body survives a larger closing speed than the lightweight prototype');
assert.ok(combatCrashThresholdMph(CARS.banshee_muscle, { targetMass: 4700 })
  < combatCrashThresholdMph(CARS.banshee_muscle, { targetMass: 940 }),
  'a heavier target lowers the attacker crash threshold');

{
  const light = race(), heavy = race();
  light.duel._dentVehicle(light.rival, 'rear', 45);
  heavy.duel._dentVehicle(heavy.rival, 'rear', 170);
  assert.ok(heavy.rival.damageZones.rear > light.rival.damageZones.rear * 2,
    'a faster closing hit visibly damages the opponent more');
}

{
  const { duel, player, rival } = race('wasteland', 'banshee_muscle', false, true);
  player.lateral = player.prevLateral = 6;
  rival.lateral = rival.prevLateral = 6.6;
  const before = { playerSpeed: player.speedMph, rivalSpeed: rival.speedMph };
  const events = [];
  duel.onChange((_, event) => events.push(event));
  assert.equal(duel._vehicleContact(player, rival, 'rival'), true);
  assert.equal(player.impactTimer, 0, 'a protected rear ram below the car threshold leaves control with the player');
  assert.equal(player.stageCrashes, 0, 'a protected rear ram adds no crash penalty');
  assert.equal(player.knock, undefined,
    'a protected Wasteland rear ram below the armored threshold leaves the player driving');
  assert.ok(rival.knock, 'the struck rival enters free-body knock motion');
  assert.ok(rival.speedMph > before.rivalSpeed + 20, 'closing speed transfers into the opponent');
  const heading = duel.course.at(rival.s).heading;
  const sideways = rival.knock.vx * Math.cos(heading) - rival.knock.vz * Math.sin(heading);
  assert.ok(Math.abs(sideways) > 1 && Math.abs(rival.knock.spin) > .01,
    'an off-centre rear hit gives the opponent sideways velocity and spin');
  assert.ok(rival.knock.vy > 0, 'a fast rear hit launches the opponent');
  const smash = events.filter(event => event.vehicleSmash)
    .map(event => event.vehicleSmash);
  assert.equal(smash.length, 1,
    'the first armored incident emits one CRASH-02 presentation event');
  assert.equal(smash[0].severity, 'launched');
  assert.equal(smash[0].actor, rival,
    'the event identifies the struck actor without a renderer guess');
  assert.equal(smash[0].zone, 'rear');
  assert.ok(smash[0].dvMph > 45 && ['x', 'z']
    .every(axis => Number.isFinite(smash[0].point?.[axis])),
  'the armored event carries solver delta-v and finite contact coordinates');
  duel._vehicleContact(player, rival, 'rival');
  assert.equal(events.filter(event => event.vehicleSmash).length, 1,
    'the latched armored incident cannot emit the presentation twice');
  let pushedOffRoad = false, maxLateral = 0;
  for (let i = 0; i < 480 && rival.knock; i++) {
    duel._rival(1 / 120);
    pushedOffRoad ||= rival.offRoad;
    maxLateral = Math.max(maxLateral, Math.abs(rival.lateral));
  }
  assert.ok(pushedOffRoad, `the rear ram can drive the opponent off the route before it steers back (${maxLateral.toFixed(1)} m peak)`);
  const height = rival.airHeight;
  assert.equal(height, 0, 'the launched car returns to the road after the shove');
}

{
  const { duel, player, rival } = race();
  player.speedMph = rival.speedMph = 300;
  player.input.steer = 1;
  const speed = player.speedMph;
  duel._vehicleContact(player, rival, 'rival');
  assert.equal(player.impactTimer, 0, 'two cars travelling at 300 mph do not crash from their absolute speed');
  assert.ok(player.speedMph >= speed * .95, 'equal-speed contact does not erase the player speed');
  assert.ok(rival.pushVelocity > 0, 'steering into an equal-speed opponent still shovels it sideways');
}

{
  const { duel, player, rival } = race('wasteland', 'banshee_muscle', false, true);
  player.speedMph = 260;
  duel._vehicleContact(player, rival, 'rival');
  assert.ok(player.armor < player.maxArmor,
    'an extreme rear closing speed removes ram armor from the attacker');
  assert.equal(player.lastCrashReason, null,
    'Mad Max keeps its armor rule instead of applying an ordinary-race crash');
  assert.notEqual(player.racePenaltySec, 30,
    'the armored hit does not add the Rival Duel 30-second penalty');
  assert.ok(player.knock,
    'an extreme Wasteland hit can still knock the armored player out of driving motion');
  assert.ok(rival.knock?.vy > 0, 'the high-speed collision still launches the opponent');
}

{
  const { duel, player, rival } = race('duel');
  duel._vehicleContact(player, rival, 'rival');
  assert.equal(player.lastCrashReason, 'rival', 'ordinary race collision rules remain unchanged');
  assert.equal(player.racePenaltySec, 30, 'ordinary race crash keeps its existing time cost');
}

{
  const { duel, player } = race('wasteland', 'banshee_muscle', false, false);
  player.speedMph = 160;
  duel._crash('rock', 1, 160, 'front');
  assert.equal(player.racePenaltySec, 2, 'a combat wreck has a short time cost instead of the ordinary 30 seconds');
  assert.ok(player.impactTimer>1.5&&player.impactTimer<2.1, 'visible combat recovery still takes about two seconds');
  assert.equal(player.lives, LIVES.start, 'a combat wreck does not consume an ordinary race life');
}

{
  const { duel, player } = race('wasteland', 'banshee_muscle', true);
  const traffic = { s: 105, prevS: 115, lateral: .6, prevLateral: .6,
    speedMph: 20, dir: -1, alive: true };
  player.traffic = [traffic];
  player.speedMph = 90;
  const events = [];
  duel.onChange((_, event) => events.push(event));
  const entrySpeed = player.speedMph;
  assert.equal(duel._vehicleContact(player, traffic, 'head_on'), true);
  assert.ok(traffic.wrecked && !traffic.alive, 'an armored head-on ram can wreck oncoming traffic');
  assert.equal(player.impactTimer, 0, 'wrecking light traffic does not lock the player in crash recovery');
  assert.equal(player.stageCrashes, 0, 'a traffic wreck adds no crash penalty');
  assert.equal(player.callout, 'TRAFFIC WRECKED', 'a protected wreck reports only the traffic outcome');
  assert.ok(player.speedMph < entrySpeed && player.speedMph > entrySpeed - 25,
    'the hit has a modest felt speed cost');
  assert.equal(events.filter(event => event.trafficWrecked).length, 1, 'a traffic wreck emits one event');
  assert.equal(duel._vehicleContact(player, traffic, 'head_on'), false, 'the same wreck cannot hit again');
  duel._traffic(.2);
  assert.ok(traffic.airHeight > 0, 'the wreck visibly flies after the impact');
}

{
  const { duel, player } = race('wasteland', 'banshee_muscle', true);
  const traffic = { s: 105, prevS: 115, lateral: .6, prevLateral: .6,
    speedMph: 60, dir: -1, alive: true };
  player.traffic = [traffic];
  duel._vehicleContact(player, traffic, 'head_on');
  assert.ok(traffic.wrecked, 'a severe impact still destroys light oncoming traffic');
  assert.equal(player.lastCrashReason, 'head_on', 'extreme closing speed also breaches player armor');
  assert.ok(player.impactTimer > 0 && player.stageCrashes === 1,
    'the attacker pays one recovery penalty when its own threshold is exceeded');
  assert.match(player.callout, /TRAFFIC WRECKED \/ IMPACT \+2 SECONDS/,
    'a severe wreck tells the player about both the traffic wreck and own crash penalty');
}

{
  const { duel, player } = race('wasteland', 'banshee_muscle', true);
  const traffic = { s: 105, prevS: 105, lateral: .6, prevLateral: .6,
    speedMph: 20, dir: 1, alive: true };
  player.traffic = [traffic];
  player.speedMph = 100;
  duel._vehicleContact(player, traffic, 'traffic');
  assert.ok(traffic.wrecked && player.impactTimer === 0,
    'an armored same-direction rear hit can wreck slower traffic without a player crash');
}

{
  const ram = rearRamResponse({ closingMph: 0, attackerMph: 300, attackerMass: 1800,
    targetMass: 1800, steer: 0, offset: 0 });
  assert.equal(ram.launchMps, 0);
  assert.equal(ram.lateralKick, 0, 'aligned equal-speed cars do not receive an arbitrary sideways impulse');
}

console.log('armored vehicle impacts: passed');
