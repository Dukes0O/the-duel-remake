// The fire on the Ridge during a Scablands visit (card HELI-RUSTWALL). The same fire rules as a forest fire at Tremblant
// (src/heli/heli-fire.js: the 20 m grid, the spread step every 200 s of engine time, the wind, water on the cells, out and
// lost) on the Ridge's scrub, with the same bucket. It has the shape heli-session.js asks of its fire run, so the bucket,
// the aim ring, the autopilot, the board's radio box and the instruments work unchanged.
//
// It is not a mission: no call, no secret count, no closed course and no pay. Its record lives in the town, which hands it
// in (inputs.ridgeFire) and is sent back through the session's `scablandsFire` events.
import {FIRE, dayWind, applyWater, fireOut, fireLost, shareOut, hottestEdge, cellIJ, runFireEngine, cruiseSeconds} from './heli-fire.js';
import {compassBearing} from './heli-flight.js';
import {SCABLANDS_ID, SCABLANDS_LINES, ridgeFireRecord} from './heli-scablands.js';

// Engine time is handed to the fire rules in whole chunks, as the forest fire does.
const FLUSH_SECONDS = 10;

// world: createScablandsWorld(inputs). emit(event) as the session's. Returns the run, or null when nothing burns.
export function createScablandsFireRun({world, inputs, emit}) {
  let fire = ridgeFireRecord(world, inputs);
  const grid = world.grid;
  // One wind for the whole fire, from its own seed (a forest fire's changes by play day; the Ridge's has none).
  const wind = fire ? dayWind(fire.seed, 1) : null;
  let engineBank = 0, halfSaid = false, tankSaid = false, ended = null;
  const radio = line => emit({type: 'radio', line});
  const say = id => emit({type: 'scablandsSaid', id, who: SCABLANDS_LINES[id].who, text: SCABLANDS_LINES[id].text});
  const report = () => { if (fire && !ended) emit({type: 'scablandsFire', state: 'burning', fire}); };

  function end(state) {
    ended = state;
    if (state === 'out') { radio('heli.radio.fire.out'); say('heli.scablands.tam.out'); }
    else say('heli.scablands.roger.lost');
    emit({type: 'scablandsFire', state, fire});
  }
  function flush() {
    if (!fire || ended || engineBank <= 0) return;
    const run = runFireEngine(fire, grid, engineBank, wind);
    engineBank = 0;
    fire = run.fire;
    if (run.lost) end('lost');
    else if (run.steps) report();
  }
  const burningNow = () => !!fire && !ended;

  return {
    start() {},
    lessonPassed() {},
    liftoff() {},
    landed() { flush(); },
    step({dt, engine}) {
      if (!burningNow() || !engine) return;
      engineBank += dt;
      if (engineBank >= FLUSH_SECONDS) flush();
    },
    cruise(fuelKg) { if (burningNow()) { engineBank += cruiseSeconds(fuelKg); flush(); } },
    refuel() {},
    pressRadio() { return false; },
    declineCall() { return false; },
    water(courseId, patches) {
      if (!burningNow() || courseId !== SCABLANDS_ID || !patches.length) return;
      const result = applyWater(fire, grid, patches);
      if (result.litresOnFire > 0) emit({type: 'fireHiss', litres: result.litresOnFire});
      fire = result.fire;
      if (result.cellsOut) emit({type: 'cellsOut', count: result.cellsOut});
      if (fireOut(fire)) end('out');
      else if (fireLost(fire, grid)) end('lost');
      else {
        if (!halfSaid && shareOut(fire) >= 50) { halfSaid = true; radio('heli.radio.fire.half'); }
        report();
      }
    },
    bucketEvent(event) {
      if (event.type === 'bucketFast') radio('heli.radio.bucket.fast');
      else if (event.type === 'bucketDamaged') { emit({type: 'cue', id: 'heli.bucket.dent'}); radio('heli.radio.bucket.dented'); }
    },
    bucketFitted() { if (burningNow() && !tankSaid) { tankSaid = true; say('heli.scablands.roger.tank'); } },
    flush,
    season() { return null; },
    windNow() { return wind ?? {kind: 'calm', speed: 0, from: 0, name: 'N', toward: {x: 0, z: 0}}; },
    // The same shape as the forest fire's view: an answered fire call on this place, the share out, the wind, the cells
    // for drawing and the hot edge to aim for. Null when nothing burns.
    view(heli = null) {
      if (!burningNow()) return null;
      const at = cell => grid.cells.get(cell);
      const info = {call: Object.freeze({kind: 'fire', id: fire.id, courseId: SCABLANDS_ID, answered: true}), answerLeft: 0,
        courseId: SCABLANDS_ID, courseName: 'The Ridge', shareOut: shareOut(fire), cells: fire.burning.length,
        wind: Object.freeze({name: wind.name, speed: wind.speed, kind: wind.kind, toward: wind.toward}), target: null,
        burning: Object.freeze(fire.burning.filter(([cell]) => at(cell)).map(([cell, percent]) => Object.freeze({cell, x: at(cell).x, z: at(cell).z, y: at(cell).y, percent}))),
        burnt: Object.freeze(fire.burnt.filter(cell => at(cell)).map(cell => Object.freeze({cell, x: at(cell).x, z: at(cell).z, y: at(cell).y})))};
      if (heli) {
        const cell = hottestEdge(fire, grid, wind);
        if (cell !== null) {
          const [i, j] = cellIJ(cell), x = (i + 0.5) * FIRE.cell, z = (j + 0.5) * FIRE.cell;
          info.target = Object.freeze({x, z, distance: Math.hypot(x - heli.x, z - heli.z), bearing: compassBearing(x - heli.x, z - heli.z)});
        }
      }
      return Object.freeze(info);
    },
    burningAt(courseId, x, z) {
      if (!burningNow() || courseId !== SCABLANDS_ID) return false;
      const id = (Math.floor(x / FIRE.cell) + 512) * 1024 + (Math.floor(z / FIRE.cell) + 512);
      return fire.burning.some(([cell]) => cell === id);
    },
    // For the session and the tests: the record now, and how it ended (null while it burns or when none was lit).
    record: () => fire,
    report,
    ended: () => ended,
    burning: burningNow,
  };
}
