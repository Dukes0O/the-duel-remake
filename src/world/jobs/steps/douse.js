// TOWN-FIRE-JOB: the douse step, a fire call (docs/WASTELAND_TOWN.md sections 3, 7 and 11). Fire on the town's real buildings,
// with the town's wind in it; the fire truck's 3,000 L tank at 1,000 L a minute; refill at a well, a tap or the Water Road's
// tap at the gate, each at the flow it really gives; hold H to spray at the nearest flames in front. Pure: no DOM, no Three.js,
// nothing from app.js; repeatable from the job's data and what the truck did (it draws no random numbers at all).
//
// What the player decides. The fire grows while nobody is spraying it and spreads downwind to the next building, so being slow
// costs buildings. Each building needs water in proportion to its size, and the tank holds three minutes of it, so water runs
// out on a fire that has spread. Every water point is a choice: the well may stand near the fire but holds only what is in it,
// and the gate's tap never runs dry but is slower and further. The result says plainly what was saved and what burnt down.
//
// Real numbers, and where they come from:
// - The truck's tank and pump (src/town/content/work-vehicles.js): 3,000 L and 1,000 L a minute. A deck gun at that flow
//   throws its water about 40 m; beyond 25 m the wind takes part of it.
// - How much water a fire needs: the National Fire Academy's fire flow formula, used by fire services to plan an attack. A
//   building fully alight needs its floor area in square feet divided by 3, in US gallons a minute: 13.6 L a minute for each
//   square metre. A fire given the flow it needs is knocked down in about 30 seconds (the Iowa State rule of the 1950s). The
//   step uses both: the water a building gets, over the flow it needs, sets how fast its fire falls. From outside, a stream
//   lands only part of its water on what is burning (the rest runs off, or boils away above the fire); the step counts about a
//   third, the low end of what fire-stream studies give for an attack from outside.
// - A hand-dug, lined well 1.2 m across holds about 2 m of standing water, about 2,200 L. The truck's pump can draw it up from
//   six metres (a fire pump lifts water about 7.5 m). The well's own 1,000 L a day refills it too slowly to matter in a fire.
// - The Water Road's tap at the gate is the end of a 100 mm main. Water in a main moves at about 1.3 m a second, so the tap
//   gives about 600 L a minute, for as long as the day's Water Road water lasts.
// - A tap on the town's pipes gives what its pressure pushes through its pipe: 0.6 of the pipe's area times the speed the head
//   gives (the square root of 2 g h). No pressure, no water.
// - How fast a fire grows, spreads and burns a building down is set by the game's own clock, which runs faster than life, as
//   the town's building does (section 2: "nothing makes you wait around"). The fuel a building holds is town-fire.js's.

export const DOUSE_RULE = Object.freeze({
  // The deck gun: full effect to `fullMetres`, half at `reachMetres`, nothing beyond; only flames within `coneDeg` of the nose.
  reachMetres:40, fullMetres:25, coneDeg:35,
  // Litres a minute a square metre of floor needs when fully alight (NFA), and the seconds that flow takes to knock it down.
  needLpmPerM2:13.6, knockSeconds:30, landShare:.35,
  // A fire grows by `growPerSecond` x heat x (1 - heat) each second. Below `outHeat` it is out.
  growPerSecond:.035, outHeat:.02,
  // A building burns down when its fuel is used: each second at full heat uses 1 / (fuel hours x `burnSecondsPerHour`).
  burnSecondsPerHour:10,
  // A fire at `spreadFromHeat` and up warms buildings within `spreadMetres` of it, most of all downwind. A building warmed for
  // `spreadSeconds` at full heat, straight downwind in a wind factor of 1, catches.
  spreadFromHeat:.4, spreadMetres:18, spreadSeconds:30, caughtHeat:.15,
  // Standing still: below this speed (km/h). A water point's ring.
  stillKmh:1.5, ringMetres:8,
  // The most the truck takes in through its 65 mm hose at a tap (litres a minute).
  intakeLpm:2000,
  // Odessa warns once the tank is down to this.
  lowLitres:600,
  easy:Object.freeze({grow:.75, spread:1.3, burn:1.4, cone:50, reach:45}),
  hard:Object.freeze({grow:1.25, spread:.8, burn:.8, cone:30, reach:36}),
});

// What each water point is, in words, for the screen line and the result.
export const DOUSE_WATER = Object.freeze({
  well:Object.freeze({name:'the well', wellStoreL:2200, flowLpm:1000}),
  gate:Object.freeze({name:"the Water Road's tap at the gate", flowLpm:600}),
  tower:Object.freeze({name:'the water tower', storeL:20000}),
  tap:Object.freeze({name:'the tap'}),
});

const finite = Number.isFinite;
const spot = value => value?.position ?? value ?? {};
const gap = (a, b) => Math.hypot((a?.x ?? 0) - (spot(b).x ?? 0), (a?.z ?? 0) - (spot(b).z ?? 0));
export const groupLitres = value => String(Math.round(value)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

function scaleFor(difficulty) {
  return difficulty === 'easy' ? DOUSE_RULE.easy : difficulty === 'hard' ? DOUSE_RULE.hard
    : {grow:1, spread:1, burn:1, cone:DOUSE_RULE.coneDeg, reach:DOUSE_RULE.reachMetres};
}

/** The flow (litres a minute) a tap on the pipes gives the truck at this head (metres) through this pipe (mm). */
export function tapFlowLpm(pressureMetres, pipeMm = 50) {
  if (!(pressureMetres > 0) || !(pipeMm > 0)) return 0;
  const area = Math.PI * (pipeMm / 1000) ** 2 / 4;
  return Math.min(DOUSE_RULE.intakeLpm, Math.round(.6 * area * Math.sqrt(2 * 9.81 * pressureMetres) * 60_000));
}

/** Litres a minute a building of this floor area needs when fully alight (the NFA formula). */
export const douseNeedLpm = areaM2 => Math.max(1, areaM2) * DOUSE_RULE.needLpmPerM2;

// The gap between two footprints (each {x, z, halfX, halfZ}), 0 when they touch.
function footprintGap(a, b) {
  return Math.hypot(Math.max(0, Math.abs(a.x - b.x) - a.halfX - b.halfX), Math.max(0, Math.abs(a.z - b.z) - a.halfZ - b.halfZ));
}
// The nearest point of a footprint to a point.
function nearestPoint(building, point) {
  return {x:Math.max(building.x - building.halfX, Math.min(building.x + building.halfX, point.x)),
    z:Math.max(building.z - building.halfZ, Math.min(building.z + building.halfZ, point.z))};
}

/** How much of the cannon's water reaches this building from here (0 to 1): in front, and within reach. */
export function douseAim(building, point, heading, difficulty = 'medium') {
  const scale = scaleFor(difficulty), near = nearestPoint(building, point);
  const distance = Math.hypot(near.x - point.x, near.z - point.z);
  if (distance > scale.reach) return 0;
  if (distance > 1) {
    // Aim at the nearest point of the building, or its middle, whichever is nearer the nose.
    const off = target => Math.abs(Math.atan2(Math.sin(Math.atan2(target.x - point.x, target.z - point.z) - heading),
      Math.cos(Math.atan2(target.x - point.x, target.z - point.z) - heading)));
    if (Math.min(off(near), off(building)) * 180 / Math.PI > scale.cone) return 0;
  }
  if (distance <= DOUSE_RULE.fullMetres) return 1;
  return 1 - .5 * (distance - DOUSE_RULE.fullMetres) / (scale.reach - DOUSE_RULE.fullMetres);
}

function startState(step, difficulty) {
  const fires = {};
  for (const building of step.buildings ?? []) {
    const heat = finite(building.heat) ? Math.max(0, Math.min(1, building.heat)) : 0;
    fires[building.id] = {state:heat > 0 ? 'burning' : 'standing', heat, burnt:0, warmth:0, caught:heat > 0};
  }
  // Nobody sees a fire the moment it starts: it has burned for `headStartSeconds` when the call comes, so it has grown and
  // warmed its neighbours. A building it has already caught counts as caught by this fire.
  const state = {fires, tankL:step.tank?.startL ?? 3000, usedL:0, drawn:{}, spraying:false, targetId:null, filling:null,
    said:[], seconds:0, reported:false, emptied:false, low:false};
  for (let t = 0; t < (step.headStartSeconds ?? 0); t += .5) burnFires(step, state, .5, scaleFor(difficulty), null, []);
  return state;
}

// One step of every fire: it grows (not the one being sprayed), uses up its building, and warms the buildings near it, most of
// all downwind. Changes `state.fires` in place and adds what happened to `events`.
function burnFires(step, state, dt, scale, sprayedId, events, sayOnce = () => {}) {
  const buildings = step.buildings ?? [];
  const wind = step.wind ?? {x:1, z:0, factor:1};
  const windFactor = finite(wind.factor) ? Math.max(0, wind.factor) : 1;
  for (const building of buildings) {
    const fire = state.fires[building.id];
    if (fire.state !== 'burning') continue;
    if (fire.heat <= DOUSE_RULE.outHeat) {
      fire.state = 'out'; fire.heat = 0;
      events.push({type:'douseOut', id:building.id, name:building.name});
      continue;
    }
    if (building.id !== sprayedId) fire.heat += DOUSE_RULE.growPerSecond * scale.grow * fire.heat * (1 - fire.heat) * dt;
    fire.heat = Math.min(1, fire.heat);
    fire.burnt += fire.heat * dt / (Math.max(6, building.fuelHours ?? 24) * DOUSE_RULE.burnSecondsPerHour * scale.burn);
    if (fire.burnt >= 1) {
      fire.state = 'lost'; fire.heat = 0; fire.burnt = 1;
      events.push({type:'douseLost', id:building.id, name:building.name});
      sayOnce(step.lines?.lost);
      continue;
    }
    if (fire.heat < DOUSE_RULE.spreadFromHeat) continue;
    for (const other of buildings) {
      const near = state.fires[other.id];
      if (near.state !== 'standing' || !(other.fuelHours > 0)) continue;
      const apart = footprintGap(building, other);
      if (apart > DOUSE_RULE.spreadMetres) continue;
      const dx = other.x - building.x, dz = other.z - building.z, length = Math.hypot(dx, dz) || 1;
      const downwind = (dx * (wind.x ?? 1) + dz * (wind.z ?? 0)) / length;
      const rate = fire.heat * Math.max(.1, .3 + .7 * downwind) * (.5 + .5 * windFactor) * (1 - apart / DOUSE_RULE.spreadMetres);
      near.warmth += rate * dt / (DOUSE_RULE.spreadSeconds * scale.spread);
      if (near.warmth >= 1) {
        near.state = 'burning'; near.heat = DOUSE_RULE.caughtHeat; near.caught = true;
        events.push({type:'douseCaught', id:other.id, name:other.name, from:building.id});
        sayOnce(step.lines?.spread);
      }
    }
  }
}

/** The burning building the marker points at: the call's own while it burns, else the nearest. */
function markedFire(step, state, here) {
  const burning = (step.buildings ?? []).filter(building => state.fires[building.id]?.state === 'burning');
  if (!burning.length) return null;
  const main = burning.find(building => building.id === step.mainId);
  return main ?? burning.reduce((best, building) => gap(here, building) < gap(here, best) ? building : best);
}

/** The water point nearest the truck that still has water, or null. */
export function douseNearestWater(step, state, here) {
  let best = null;
  for (const point of step.water ?? []) {
    if (douseWaterLeft(point, state) <= 0) continue;
    if (!best || gap(here, point) < gap(here, best)) best = point;
  }
  return best;
}

/** Litres this water point can still give (Infinity when it does not run dry). */
export function douseWaterLeft(point, state = {}) {
  if (!(point.flowLpm > 0)) return 0;
  return finite(point.storeL) ? Math.max(0, point.storeL - (state.drawn?.[point.id] ?? 0)) : Infinity;
}

/** The names of a list, in a plain sentence: "the soup kitchen", "the soup kitchen and the chicken run", "a, b and c". */
export function douseNames(names) {
  if (names.length <= 1) return names[0] ?? '';
  return `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`;
}

/** The results screen's sentences: what was saved, what burnt down, and the water used. */
export function douseSentence(saved, lost, usedL) {
  const capital = text => text.charAt(0).toUpperCase() + text.slice(1);
  const parts = [];
  if (saved.length) parts.push(`You saved ${douseNames(saved)} from the fire.`);
  if (lost.length) parts.push(`${capital(douseNames(lost))} burnt down.`);
  else parts.push('Nothing burnt down.');
  parts.push(`You used ${groupLitres(usedL)} litres of water.`);
  return parts.join(' ');
}

/** What the screen line asks for now. */
export function douseLine(step, state = {}) {
  const fires = state.fires ?? {}, byId = id => (step.buildings ?? []).find(building => building.id === id);
  if (state.filling) {
    const point = (step.water ?? []).find(row => row.id === state.filling);
    return `Filling the tank at ${point?.name ?? 'the tap'}. Hold still until you have enough, then go back to the fire.`;
  }
  if (!(state.tankL > 0)) return 'The tank is empty. Drive into a blue ring at a tap or a well and hold still to fill up.';
  if (state.spraying && state.targetId) return `Keep the water on ${byId(state.targetId)?.name ?? 'the fire'}.`;
  const burning = (step.buildings ?? []).filter(building => fires[building.id]?.state === 'burning');
  if (burning.length > 1) return 'The fire has spread. Put out whatever is downwind first, and hold H to spray.';
  const main = burning[0] ?? byId(step.mainId);
  return `Drive up to ${main?.name ?? 'the fire'}, face the flames and hold H to spray.`;
}

export function stepDouse(step, state, view, dt = 0) {
  const here = view.player?.position ?? {};
  const kmh = Math.abs(finite(view.speedKmh) ? view.speedKmh : 0);
  const still = kmh < DOUSE_RULE.stillKmh && !view.onFoot;
  const difficulty = view.difficulty ?? 'medium', scale = scaleFor(difficulty);
  const heading = finite(view.heading) ? view.heading : 0;
  const base = state.fires ? state : {...state, ...startState(step, difficulty)};
  const next = {...base, fires:Object.fromEntries(Object.entries(base.fires).map(([id, fire]) => [id, {...fire}])),
    drawn:{...base.drawn}, said:[...base.said], spraying:false, targetId:null, filling:null};
  next.seconds += dt;
  const events = [], requests = [];
  const sayOnce = (lineId, key = lineId) => {
    if (!lineId || next.said.includes(key)) return;
    next.said.push(key);
    requests.push({type:'say', lineId});
  };
  const buildings = step.buildings ?? [];
  const capacity = step.tank?.capacityL ?? 3000, pumpLpm = step.tank?.pumpLpm ?? 1000;

  // The cannon: while H is held and flames are in front, the tank empties at the pump's rate onto the nearest of them.
  let target = null, share = 0;
  if (view.controls?.spray === true && !view.onFoot && next.tankL > 0) {
    let best = Infinity;
    for (const building of buildings) {
      if (next.fires[building.id].state !== 'burning') continue;
      const aim = douseAim(building, here, heading, difficulty);
      const distance = gap(here, nearestPoint(building, here));
      if (aim > 0 && distance < best) { best = distance; target = building; share = aim; }
    }
  }
  if (target) {
    const litres = Math.min(next.tankL, pumpLpm / 60 * dt);
    next.tankL -= litres; next.usedL += litres;
    next.spraying = true; next.targetId = target.id;
    const fire = next.fires[target.id];
    // The water it gets, over the flow it needs, knocks it down; a fire given all it needs is out in `knockSeconds`.
    const flowLpm = dt > 0 ? litres / dt * 60 * share * DOUSE_RULE.landShare : 0;
    fire.heat -= flowLpm / douseNeedLpm(target.areaM2) / DOUSE_RULE.knockSeconds * dt;
    if (!base.spraying) events.push({type:'douseSpray', id:target.id});
  } else {
    // WEAPON-WATER-CANNON: with no flames in front, the stream may be on a car (src/arsenal/water-cannon.js, told by the
    // World Job as `waterOnCar`). It is the same cannon, so the same tank pays for it at the pump's rate.
    if (view.waterOnCar === true && view.controls?.spray === true && !view.onFoot && next.tankL > 0) {
      const litres = Math.min(next.tankL, pumpLpm / 60 * dt);
      next.tankL -= litres; next.usedL += litres;
    }
    if (base.spraying) events.push({type:'douseSprayStop'});
  }

  // TOWN-JOBS-2: a fire a long drive away (`heldUntilMetres`) is held with buckets until the truck first comes that near, so
  // the drive out is not a race against it (docs/WASTELAND_TOWN.md section 7: no racing clock). From then on it burns as any fire.
  if (step.heldUntilMetres > 0 && !next.reached) {
    const main = buildings.find(building => building.id === step.mainId) ?? buildings[0];
    if (main && gap(here, main) <= step.heldUntilMetres) next.reached = true;
  }
  if (!(step.heldUntilMetres > 0) || next.reached) burnFires(step, next, dt, scale, target?.id ?? null, events, sayOnce);

  // Filling: standing still inside a water point's ring, the tank fills at the flow that point gives.
  if (still && next.tankL < capacity) {
    const point = (step.water ?? []).find(row => gap(here, row) <= (row.radius ?? DOUSE_RULE.ringMetres));
    if (point) {
      const left = douseWaterLeft(point, next);
      if (left > 0) {
        const litres = Math.min(capacity - next.tankL, left, Math.min(point.flowLpm, DOUSE_RULE.intakeLpm) / 60 * dt);
        next.tankL += litres;
        if (finite(point.storeL)) next.drawn[point.id] = (next.drawn[point.id] ?? 0) + litres;
        next.filling = point.id;
        if (base.filling !== point.id) events.push({type:'douseFill', id:point.id, name:point.name, flowLpm:point.flowLpm});
        if (next.tankL >= capacity - 1e-6) { next.tankL = capacity; events.push({type:'douseFull'}); }
        if (douseWaterLeft(point, next) <= 0) {
          events.push({type:'douseDry', id:point.id, name:point.name});
          sayOnce(step.lines?.dry, `dry:${point.id}`);
        }
      } else if (!next.said.includes(`dry:${point.id}`)) sayOnce(step.lines?.dry, `dry:${point.id}`);
    }
  }
  if (next.tankL <= 1e-6) {
    next.tankL = 0;
    if (!next.emptied) { next.emptied = true; events.push({type:'douseEmpty'}); sayOnce(step.lines?.empty); }
  } else if (next.tankL >= capacity / 2) next.emptied = false;
  if (next.tankL <= DOUSE_RULE.lowLitres && next.tankL > 0 && !next.low) { next.low = true; sayOnce(step.lines?.low); }
  if (next.tankL > DOUSE_RULE.lowLitres * 2) next.low = false;

  // The marker: the water when the tank is empty, else the fire.
  const fire = markedFire(step, next, here);
  const water = next.tankL <= 0 || next.filling ? douseNearestWater(step, next, here) : null;
  const place = water ?? fire;
  next.markId = place?.id ?? null;
  if (place) requests.push({type:'marker', place:{id:place.id, name:place.name, position:{...spot(place)}, radius:place.radius ?? 12}});

  const complete = buildings.every(building => next.fires[building.id].state !== 'burning');
  let closingLines;
  if (complete) {
    const saved = buildings.filter(building => next.fires[building.id].caught && next.fires[building.id].state === 'out');
    const lost = buildings.filter(building => next.fires[building.id].state === 'lost');
    const mainSaved = next.fires[step.mainId]?.state === 'out';
    closingLines = [mainSaved ? step.lines?.won : step.lines?.burnt, ...(step.closing ?? [])].filter(Boolean);
    // The step's closing lines hold the job while they are said, so a finished call is seen more than once; it reports once.
    if (!next.reported) {
      next.reported = true;
      events.push({type:'douseDone', savedIds:saved.map(row => row.id), lostIds:lost.map(row => row.id), mainSaved,
        usedL:Math.round(next.usedL), lineId:closingLines[0] ?? null,
        sentence:douseSentence(saved.map(row => row.name), lost.map(row => row.name), next.usedL)});
    }
  }
  return {state:next, complete, events, requests, ...(complete ? {closingLines} : {})};
}
