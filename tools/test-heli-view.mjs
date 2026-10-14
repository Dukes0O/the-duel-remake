// HELI-VIEW: Kestrel One's instruments agree with the simulation, the
// notices and radio subtitles, the route buttons and the pump, and the four
// camera views (docs/HELICOPTER.md sections 8 and 11).
import assert from 'node:assert/strict';
import {createHeliState, heliReadout, stepHeli} from '../src/heli/heli-flight.js';
import {flatGround} from '../src/heli/heli-ground.js';
import {instrumentReadings, instrumentsMarkup, controlsMarkup, noticeText, pumpLabel} from '../src/heli/heli-ui.js';
import {createProfile, normalizeProfile} from '../src/progression.js';
import {buyFuel} from '../src/heli/heli-save.js';
import {heliCameraPose, HELI_CAMERA_VIEWS} from '../src/heli/heli-camera.js';

let checks = 0;
const ok = (value, label) => { assert.ok(value, label); checks++; };
const eq = (actual, expected, label) => { assert.equal(actual, expected, label); checks++; };

// The instruments read the simulation's own numbers.
{
  const ground = flatGround(0);
  const state = createHeliState({ground, altitudeOffset: 250});
  for (let i = 0; i < 120 * 4; i++) stepHeli(state, {lift: 1, pitch: 0.4, yaw: 0.3}, {ground});
  const readout = heliReadout(state, {loadKg: 1300});
  const r = instrumentReadings(readout);
  eq(r.altitude, `${readout.altitudeFt.toFixed(0)} ft`, 'altitude in feet');
  eq(r.altitudeM, `${readout.altitudeM.toFixed(0)} m`, 'altitude in metres too');
  eq(r.height, `${readout.heightFt.toFixed(0)} ft`, 'height above the ground');
  eq(r.airspeed, `${readout.airspeedKts.toFixed(0)} kt`, 'airspeed in knots');
  eq(r.climb, `${readout.climbFpm >= 5 ? '+' : ''}${Math.round(readout.climbFpm / 10) * 10} ft/min`, 'climb rate');
  eq(r.rotor, `${readout.rotorPct.toFixed(0)}%`, 'rotor speed');
  eq(r.fuel, `${readout.fuelKg.toFixed(0)} kg`, 'fuel');
  eq(r.fuelTime, `${readout.fuelMinutes.toFixed(0)} min left`, 'minutes of fuel left');
  eq(r.weight, `${readout.weightKg.toFixed(0)} kg`, 'weight with the car');
  eq(r.maxLift, `${readout.maxLiftKg.toFixed(0)} kg`, 'most liftable here');
  eq(Number(r.heading), Math.round(readout.headingDeg) % 360, 'compass heading');
  ok(r.pitch === readout.pitchDeg && r.roll === readout.rollDeg, 'the horizon uses the real attitude');
  const html = instrumentsMarkup({readout, autopilot: true}, {cameraIndex: 2});
  for (const text of [r.altitude, r.height, r.airspeed, r.rotor, r.fuel, r.weight, 'AUTOPILOT ON', 'VIEW CABLE'])
    ok(html.includes(text), `the panel shows ${text}`);
  ok(instrumentReadings({...readout, fuelKg: 50}).lowFuel, 'low fuel shows at 15%');
  ok(instrumentReadings({...readout, rotorPct: 85, engine: false}).lowRotor, 'low rotor with the engine out');
  ok(!instrumentReadings({...readout, rotorPct: 40, engine: false, heightM: 0}).lowRotor, 'no low rotor warning parked on the ground');
  ok(!instrumentReadings({...readout, rotorPct: 85, engine: true}).lowRotor, 'no low rotor while it spins up');
  ok(instrumentReadings({...readout, weightKg: readout.maxLiftKg + 1}).heavy, 'too heavy to hover here');
  ok(instrumentReadings({...readout, fuelMinutes: Infinity}).fuelTime === 'engine off', 'engine off');
  const nose = instrumentsMarkup({readout: {...readout, pitchDeg: 10, rollDeg: 15}});
  ok(nose.includes('rotate(-15.0deg) translateY(-20.0px)'), 'nose down lifts the horizon; a right bank turns it the other way');
  eq(instrumentsMarkup({readout: null}), '', 'no readout, no panel');
}

// Notices and the route panel.
{
  eq(noticeText({type: 'charged', kind: 'hardLanding', charged: 150, forgiven: 0}), 'Hard landing: 150 credits', 'repair notice');
  eq(noticeText({type: 'charged', kind: 'fuelTruck', charged: 40, forgiven: 860}), 'Fuel truck: 40 credits (860 forgiven)', 'forgiven part shown');
  eq(noticeText({type: 'fuelBought', kg: 400, cost: 0}), 'Fuel: 400.0 kg, the first tank is free', 'free tank notice');
  eq(noticeText({type: 'cruiseRefused', needKg: 120}), 'Not enough fuel for that leg: it needs 120 kg', 'cruise refused');
  eq(noticeText({type: 'delivered', courseId: 'panorama-ridge'}), 'Delivered to Panorama Ridge', 'delivered');
  eq(noticeText({type: 'touchdown'}), null, 'quiet events say nothing');
  const zone = {x: 0, z: 0, y: 10, radius: 12};
  const onPad = {heli: {x: 1, z: 1, y: 10, onGround: true, fuelKg: 300}, zone, courseId: 'tremblant-woods', destination: 'tremblant-snow', cruiseOffered: true};
  const html = controlsMarkup(onPad, {credits: 1000, refuels: 2});
  ok(html.includes('Tremblant Woods (here)') && html.includes('Tremblant Snow · 25 kg') && html.includes('Panorama Ridge · 120 kg'), 'routes with leg fuel');
  ok(html.includes('data-heli-destination="tremblant-snow" aria-pressed="true"'), 'the chosen destination is marked');
  ok(html.includes('FILL UP · 150 CR'), 'the pump prices 100 kg at 1.5 credits a kg');
  ok(html.includes('ENTER') && html.includes('cruise to Tremblant Snow'), 'the cruise prompt');
  ok(controlsMarkup(onPad, {credits: 1000, refuels: 0}).includes('FREE FIRST TANK'), 'the first tank is free');
  ok(controlsMarkup({...onPad, heli: {...onPad.heli, fuelKg: 400}}, {credits: 1000, refuels: 2}).includes('TANK FULL'), 'full tank');
  ok(!controlsMarkup({...onPad, heli: {...onPad.heli, onGround: false}}, {}).includes('FILL UP'), 'no pump in the air');
  ok(!controlsMarkup({...onPad, courseId: 'tremblant-snow'}, {}).includes('FILL UP'), 'the pump is at the home pad only');
}

// The pump's label promises exactly what buyFuel then does.
for (const [fuelKg, credits, refuels] of [[300, 1000, 2], [300.64, 1000, 2], [123.46, 1000, 1], [300, 40, 2], [300, 1, 2], [300, 0, 2], [0, 0, 0], [399.95, 500, 3], [123.4, 77, 1]]) {
  const label = pumpLabel(fuelKg, {credits, refuels});
  const profile = normalizeProfile({...createProfile(), credits, heli: {version: 1, fuelKg, refuels}});
  const result = buyFuel(profile, Infinity, {enabled: true});
  if (label.disabled) ok(!result.ok, `${label.text}: the pump refuses (${fuelKg} kg, ${credits} credits)`);
  else {
    ok(result.ok, `${label.text}: the pump sells`);
    const cost = /(\d+) CR/.exec(label.text)?.[1];
    eq(cost === undefined ? 0 : Number(cost), result.cost, `${label.text}: the price shown is the price charged`);
    const kg = /BUY ([\d.]+) KG/.exec(label.text)?.[1];
    if (kg) eq(Number(kg), result.kg, `${label.text}: the amount shown is the amount sold`);
  }
}

// The four camera views.
{
  const view = {heli: {x: 0, y: 40, z: 0, heading: 0, pitch: 0, roll: 0}, load: {x: 0, y: 24, z: 0, hooked: true}};
  eq(HELI_CAMERA_VIEWS.join(','), 'behind,cockpit,cable,side', 'four views');
  const behind = heliCameraPose(view, 0), cockpit = heliCameraPose(view, 1), cable = heliCameraPose(view, 2), side = heliCameraPose(view, 3);
  ok(behind.position.z < -20 && behind.position.y > view.heli.y, 'behind and above, far enough to see the car swing');
  ok(Math.abs(cockpit.position.z - 1.1) < 1e-9 && cockpit.target.z > 30, 'the cockpit looks ahead from the pilot seat');
  ok(cable.target.y < view.load.y && Math.abs(cable.position.y - view.heli.y) < 1, 'down the cable from the hook');
  ok(Math.abs(side.position.x) === 30 && side.target.y === (view.heli.y + view.load.y) / 2, 'side view frames helicopter and car');
  eq(heliCameraPose(view, 4).name, 'behind', 'C wraps round');
}

console.log(`test-heli-view: ${checks} checks passed`);
