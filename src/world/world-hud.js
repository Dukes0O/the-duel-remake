import {worldJobMapData} from '../route-map.js';
import {SCABLANDS_PLACES} from './scablands.js';
import {getLandPicture, createPictureCanvas, createKnowledge, learn, jobFacts, drawSmallMap, drawBigMap, wayColour, wayLines, groundWords, wayKm, SMALL_MAP} from './scablands-map.js';
import {HOT_DELIVERY_WAYS, WATCH, routeFor, roadWay, describeWay, sees, nearestOnLine} from './scablands-ways.js';
import {LAND} from './scablands-names.js';
import {scablandsSurfaceHeightAt} from './scablands-ground.js';
import {scablandsDriveAt} from './scablands-regions.js';
import {EMBER_SCOOP} from './jobs/ember-rule.js';
import {BRAND_RULE, BRAND_LINES} from './jobs/brand-rule.js';
import {BELLOWS_RULE, bellowsSentence} from './jobs/bellows-rule.js';
import {GAS_LOAD_RULE} from './jobs/gas-load-rule.js';
import {FURNACE_PATIENCE_SECONDS} from './jobs/furnace-sightings.js';

const pointOf = value => value?.position ?? value;
const finitePoint = value => Number.isFinite(pointOf(value)?.x) && Number.isFinite(pointOf(value)?.z);
const labelOf = (value, places) => {
  const point = pointOf(value);
  const known = value?.id && places.find(place => place.id === value.id);
  return value?.name ?? known?.name ?? (value?.id ? value.id.replaceAll('-', ' ') :
    finitePoint(point) ? 'the marked place' : 'the next place');
};
const markerOf = (value, places) => {
  if (!finitePoint(value)) return null;
  const point = pointOf(value);
  return {id: value?.id ?? null, name: labelOf(value, places), x: point.x, z: point.z};
};

function nextFind(step, found) {
  return (step?.finds ?? []).find(item => !found.includes(item.id)) ?? null;
}

// Presentation reads the same lamp state as the rules. Choosing an arrow here
// never lights a lamp, moves a fighter or changes the brand's remaining time.
export function brandHudStep(step, state = {}, player = null) {
  if (!state.brandBriefed) return {target: step.meeting, line: 'Stop beside Auntie Solder at the forge.'};
  if (state.townEnding) return {target: null, line: state.theftStarted ? BRAND_LINES.thief : BRAND_LINES.awake};
  const burning = state.brandSeconds > 0;
  const lamps = step.places ?? [];
  const candidates = burning ? lamps.filter(lamp => !state.lamps?.[lamp.id])
    : [step.hearth, ...lamps.filter(lamp => state.lamps?.[lamp.id])];
  const here = pointOf(player);
  const gap = place => finitePoint(here) && finitePoint(place)
    ? Math.hypot(pointOf(place).x - here.x, pointOf(place).z - here.z) : Infinity;
  const target = candidates.filter(Boolean).reduce((best, place) => !best || gap(place) < gap(best) ? place : best, null);
  const atDarkLamp = !burning && lamps.some(lamp => !state.lamps?.[lamp.id] && gap(lamp) <= BRAND_RULE.lampRadius);
  const line = state.lightingLamp ? 'Stay by the lamp.'
    : atDarkLamp ? 'The brand is out. Relight it at the hearth or a lit lamp.'
    : burning ? 'Carry the brand to a dark lamp.'
      : state.brandsUsed > 0 ? 'Relight the brand at the hearth or a lit lamp.' : 'Take a brand from the hearth.';
  return {target, line};
}

export function worldHudStep(step, {actors = [], inventory = [], found = [], stepState = {}} = {}, places = SCABLANDS_PLACES) {
  if (!step) return {kind: null, line: 'Drive the Scablands', target: null};
  const actor = id => actors.find(item => item.id === id);
  let target = null, line;
  switch (step.kind) {
    case 'reach':
      target = step.place ?? step.destination;
      line = step.what ?? `Drive to ${labelOf(target, places)}`;
      break;
    case 'carry':
      target = step.pickup && !stepState.loaded ? step.pickup.place : step.destination ?? step.origin;
      line = step.pickup && !stepState.loaded ? 'Drive to Cinder and stop.' : step.what ?? `Carry ${labelOf({id: step.load}, places)} to ${labelOf(target, places)}`;
      break;
    case 'chase': {
      const targetActor = actor(step.targetId);
      target = targetActor ?? step.path?.at(-1);
      line = step.what ?? `Catch ${labelOf(step.actor ?? targetActor ?? {id: step.targetId}, places)}`;
      break;
    }
    case 'escort': {
      const convoy = actor(step.actorId);
      target = step.destination ?? step.path?.at(-1) ?? convoy?.position;
      line = step.what ?? `Keep ${labelOf(step.actor ?? {id: step.actorId}, places)} safe to ${labelOf(target, places)}`;
      break;
    }
    case 'onfoot': {
      target = step.places?.[stepState.index ?? 0] ?? step.returnToCar;
      line = (stepState.index ?? 0) >= (step.places?.length ?? 0)
        ? 'Return to your car' : step.what ?? `Walk to ${labelOf(target, places)}`;
      break;
    }
    case 'heist': {
      const phase = stepState.phase ?? 'infiltrate';
      target = phase === 'return' ? step.carPlace : phase === 'escape' ? step.escapePlace : step.zone;
      line = step.what ?? (phase === 'return' ? `Carry ${labelOf({id: step.takeId}, places)} to your car`
        : phase === 'escape' ? `Drive to ${labelOf(step.escapePlace, places)}` : `Take ${labelOf({id: step.takeId}, places)}`);
      break;
    }
    case 'rescue': {
      const count = stepState.rescued ?? 0;
      const needed = Math.min(step.people?.length ?? 0, step.seats ?? 2);
      const person = count < needed ? step.people?.[count] : null;
      target = person ?? step.home;
      line = step.what ?? (person ? `Rescue ${labelOf(person, places)}` : `Bring everyone to ${labelOf(step.home, places)}`);
      break;
    }
    case 'defend':
      target = step.place;
      line = step.what ?? `Defend ${labelOf(target, places)}`;
      break;
    case 'explore': {
      const find = step.finds?.[stepState.index ?? 0] ?? nextFind(step, found);
      target = find;
      line = step.what ?? (find ? `Find ${labelOf(find, places)}` : 'Explore the Scablands');
      break;
    }
    default:
      target = step.place ?? step.destination ?? null;
      line = step.what ?? 'Keep going';
  }
  return {kind: step.kind, line, target: markerOf(target, places)};
}

export const TOWN_GATE_ARROW = Object.freeze({pastMetres: 2});
export function worldHudModel({worldJob, player = null, speedKmh = null, found = [], onFoot = false, places = SCABLANDS_PLACES} = {}) {
  const job = worldJob?.job, step = job?.steps?.[job.stepIndex] ?? null;
  const next = worldHudStep(step, {actors: worldJob?.actors, inventory: worldJob?.inventory,
    found, stepState: job?.stepState}, places);
  if (step?.brand) {
    const brand = brandHudStep(step, job.stepState, player);
    next.line = brand.line;
    next.target = markerOf(brand.target, places);
  }
  // Run Him Down starts inside Tin Town's fence with the thief beyond it: until the car is through the gate the arrow
  // leads to the gate (it pointed at the thief through the fence, and Claude's car met a gate post; 17 November 2026).
  if (step?.bellows && step.townGate && !onFoot && finitePoint(player) && !job.stepState?.thiefStopped) {
    const gate = pointOf(step.townGate), at = pointOf(player), through = step.townGate.through ?? {x: 0, z: -1};
    const inside = (at.x - gate.x) * through.x + (at.z - gate.z) * through.z, box = step.townGate.box;
    // Inside the town's own extent and on the town's side of the gate (ground west of the fence is not the town).
    if (inside > TOWN_GATE_ARROW.pastMetres && box && at.x >= box.minX && at.x <= box.maxX && at.z >= box.minZ && at.z <= box.maxZ) {
      next.target = {id: 'town-gate', name: 'the town gate', x: gate.x, z: gate.z};
      next.line = 'Out by the town gate, then after him.';
    }
  }
  const chapter = worldJob?.night2;
  if (chapter && onFoot && step?.kind === 'reach') {
    const route = chapter.routes[0];
    next.target = route ? markerOf({name: route.name, position: route.point}, places) : null;
  }
  if (step?.pickup?.atCar && !job.stepState.loaded) {
    next.target = markerOf({name: 'Your car', position: worldJob.marker}, places);
    next.line = onFoot ? 'Find your car and hold F to get in with the ember.' : 'Stop the car to load the ember.';
  }
  const position = markerOf(player, places);
  const target = next.target;
  const nearbyFence = step?.ember && job?.stepState?.loaded && finitePoint(player) &&
    (step.barriers ?? []).some(barrier => !(job.stepState.burntBarricades ?? []).includes(barrier.id) &&
      Math.hypot(pointOf(player).x - pointOf(barrier).x, pointOf(player).z - pointOf(barrier).z) <= 40);
  if (nearbyFence && !job.stepState.out) next.line = 'Burn the fence: get close and press 4.';
  // Slow Ride's blocks burn the same way, and the flame reaches 9 m: say so while one stands near (Claude flamed one
  // from 11 m for five seconds and nothing told him it was out of reach). Not before the meeting with Moss: until then
  // flame on a block counts for nothing.
  const nearbyBlock = step?.gasLoad && job.stepState?.gasLoaded && finitePoint(player) && !onFoot &&
    (step.barriers ?? []).some(barrier => !(job.stepState?.burntBarricades ?? []).includes(barrier.id) &&
      Math.hypot(pointOf(player).x - pointOf(barrier).x, pointOf(player).z - pointOf(barrier).z) <= 40);
  if (nearbyBlock) next.line = 'Burn the block: get within 9 m and hold 4.';
  if (step?.ember && step.pickup && !step.pickup.atCar && finitePoint(player) && !onFoot) {
    const loaded = job.stepState.loaded;
    const ring = loaded ? step.destination : step.pickup.place;
    const radius = loaded ? step.radius : step.pickup.radius;
    const distance = Math.hypot(pointOf(player).x - pointOf(ring).x, pointOf(player).z - pointOf(ring).z);
    const gate = step.riderSafeWall, at = pointOf(player);
    const throughGate = gate && worldJob.tinTownGateRequested &&
      (at.x - gate.x) * gate.through.x + (at.z - gate.z) * gate.through.z >= 0;
    if (loaded && !job.stepState.out && throughGate) next.line = 'Stop in the ring at the forge.';
    // Not while Cinder is already handing the pot over: the stop was made, and she finishes wherever the car then stands.
    if (!job.stepState.out && !job.stepState.pickingUp && speedKmh !== null && Math.abs(speedKmh) < 1 && distance > radius && distance <= radius + 6)
      next.line = 'A little closer: stop inside the ring.';
  }
  if (step?.scout && job.stepState.scoutWarned && !job.stepState.scoutStopped && !job.stepState.scoutHome && !job.stepState.out)
    next.line = 'Catch the scout before the camp.';
  if (step?.ember && job.stepState.out && finitePoint(player)) {
    const nearFire = step.braziers?.some(brazier =>
      Math.hypot(pointOf(player).x - pointOf(brazier).x, pointOf(player).z - pointOf(brazier).z) <= 60);
    if (nearFire) {
      const seconds = EMBER_SCOOP.seconds === 3 ? 'three' : String(EMBER_SCOOP.seconds);
      next.line = `Stop beside the fire for ${seconds} seconds to relight the pot.`;
      if (job.stepState.scoopBrazier && job.stepState.scoopTime > 0 &&
          speedKmh !== null && Math.abs(speedKmh) < EMBER_SCOOP.stoppedKmh &&
          step.braziers.some(brazier => brazier.id === job.stepState.scoopBrazier &&
            Math.hypot(pointOf(player).x - pointOf(brazier).x, pointOf(player).z - pointOf(brazier).z) <= EMBER_SCOOP.radius))
        next.line = 'Relighting: hold still.';
    }
  }
  const gate=worldJob?.definition?.kind==='town-drive'?worldJob.definition.layout?.gate:null;
  const at=pointOf(player);
  const townGatePrompt=gate&&finitePoint(player)&&Math.hypot(at.x-gate.x,at.z-gate.z)<=gate.halfWidth+8
    ?gate.prompt:'';
  const dx = target && position ? target.x - position.x : 0;
  const dz = target && position ? target.z - position.z : 0;
  const bearing = target && position ? (Math.atan2(dx, dz) * 180 / Math.PI + 360) % 360 : null;
  const finds = [...(worldJob?.definition?.finds ?? []), ...(job?.steps ?? []).flatMap(item => item.finds ?? [])];
  return {
    line: worldJob?.arrivalHold ? 'Delivered. The forge takes the fire.' : next.line, kind: next.kind, target, bearing,
    // While the town's ending is watched there is nothing to do, so nothing is asked.
    prompt: townGatePrompt || (step?.kind==='onfoot' && !job?.stepState?.townEnding ? (onFoot ? 'HOLD F TO RETURN TO YOUR CAR' : 'HOLD F TO GET OUT') : ''),
    wave: step?.kind==='defend' ? {value:worldJob?.job?.stepState?.wave??0,max:step.waveCount??3} : null,
    well: step?.kind==='defend' ? {value:worldJob?.places?.[step.placeId]?.health??step.health??100,max:step.health??100} : null,
    // RUN-GAS: the escorted truck's health, while a step has raids on her road.
    truck: step?.kind==='escort'&&!step.gasLoad&&step.ambushes?.length ? {value:worldJob?.actors?.find(item=>item.id===step.actorId)?.health??step.health??100,max:step.health??100} : null,
    gas: step?.gasLoad ? {value: job.stepState.gas ?? GAS_LOAD_RULE.start, max: GAS_LOAD_RULE.start,
      holes: job.stepState.holes ?? GAS_LOAD_RULE.startHoles} : null,
    // EVERBURN-REMAKE: the ember in Cinder's pot (src/world/jobs/ember-rule.js), while a carry step holds one.
    ember: step?.ember && (!step.pickup || job.stepState.loaded) ? {value: job.stepState.ember ?? step.ember.start, max: step.ember.start, out: job.stepState.out === true,
      rate: job.stepState.rate ?? 0, jolts: job.stepState.joltCount ?? 0, relights: job.stepState.relights ?? 0} : null,
    brand: step?.brand && job.stepState?.brandsUsed > 0 && !job.stepState.townEnding ? {
      value: job.stepState.brandSeconds ?? 0, max: BRAND_RULE.burnSeconds,
      out: !(job.stepState.brandSeconds > 0), brandsUsed: job.stepState.brandsUsed,
    } : null,
    bellows: step?.bellows ? {
      value: job.stepState.bellows ?? BELLOWS_RULE.start, max: BELLOWS_RULE.start,
    } : null,
    seen: worldJob?.definition?.storyId === 'everburn' && worldJob.definition.number === 1 &&
      !job?.done && !worldJob.settled && (worldJob.skylineSight?.seenSeconds ?? 0) > 0
      ? {value: Math.min(worldJob.skylineSight.seenSeconds, FURNACE_PATIENCE_SECONDS), max: FURNACE_PATIENCE_SECONDS} : null,
    arrow: bearing,
    places: places.map(place => ({id: place.id, name: place.name, x: place.x, z: place.z})),
    finds: finds.map(item => {
      const marker = markerOf(item, places);
      return marker ? {...marker, found: found.includes(item.id)} : null;
    }).filter(Boolean),
    player: position,
  };
}

const STYLE_ID = 'world-hud-style';
export function drawGasGauge(gas, gauge, bar, label, note) {
  const share = Math.max(0, Math.min(1, gas.value / gas.max));
  bar.style.width = `${(share * 100).toFixed(1)}%`;
  gauge.style.setProperty('--ember-glow', share.toFixed(2));
  gauge.classList.remove('is-out', 'is-losing', 'is-flashing');
  label.textContent = 'GAS';
  const holes = `${gas.holes} ${gas.holes === 1 ? 'hole' : 'holes'} open.`;
  // Rounded down, so that the figure shown is never above the grade the gas is paid at (79.2 is paid as under 80).
  note.textContent = `${Math.floor(gas.value)} / ${gas.max}. ${holes}`;
  gauge.setAttribute('aria-label', `Gas is ${Math.floor(gas.value)} out of ${gas.max}. ${holes}`);
}

export function drawBellowsGauge(bellows, gauge, bar, label, note) {
  const share = Math.max(0, Math.min(1, bellows.value / bellows.max));
  bar.style.width = `${(share * 100).toFixed(1)}%`;
  gauge.style.setProperty('--ember-glow', share.toFixed(2));
  gauge.classList.remove('is-out', 'is-losing', 'is-flashing');
  label.textContent = 'BELLOWS';
  note.textContent = `${Math.ceil(bellows.value)} / ${bellows.max}`;
  gauge.setAttribute('aria-label', bellowsSentence(bellows.value));
}

function drawBrandGauge(brand, gauge, bar, label, note) {
  const share = Math.max(0, Math.min(1, brand.value / brand.max));
  bar.style.width = `${(share * 100).toFixed(1)}%`;
  gauge.style.setProperty('--ember-glow', share.toFixed(2));
  gauge.classList.toggle('is-out', brand.out);
  gauge.classList.remove('is-losing', 'is-flashing');
  label.textContent = 'BRAND';
  note.textContent = brand.out ? 'The brand is out.' : `${Math.ceil(brand.value)} s`;
  gauge.setAttribute('aria-label', brand.out ? 'The brand is out.' : `The brand has ${Math.ceil(brand.value)} seconds of fire left.`);
}

const BIG_MAP = Object.freeze({width: 1400, height: 1000});
// The picture of the land is made in slices, a frame at a time, from the first frame of a job: 10 ms a frame while the countdown
// runs (the car stands still), 4 ms a frame once the car is driving.
const PICTURE_SLICE_COUNTDOWN_MS = 10, PICTURE_SLICE_MS = 4;
// The small map is drawn at most this often; the arrow and markers move between draws by no more than a pixel or two.
const SMALL_MAP_EVERY_MS = 33;

// Where the car is and which way it faces, in the land's own metres (a person on foot is the person).
export function worldMapCar(state, course) {
  if (state.onFoot && state.fighter) return {x: state.fighter.x, z: state.fighter.z, heading: state.fighter.yaw ?? 0};
  const at = course.worldAt(state.s, state.lateral || 0);
  return {x: at.x, y: at.y, z: at.z, heading: (at.heading ?? 0) + (state.headingError || 0)};
}

// Direction on screen is relative to the car, with zero pointing towards the top.
export function brazierArrow(ember, car, knowledge) {
  if (!ember?.out || !car || !knowledge?.braziers?.size) return null;
  let nearest = null, distance = Infinity;
  for (const brazier of knowledge.braziers.values()) {
    const gap = Math.hypot(brazier.x - car.x, brazier.z - car.z);
    if (gap < distance) { nearest = brazier; distance = gap; }
  }
  const angle = Math.atan2(nearest.x - car.x, nearest.z - car.z) - (car.heading ?? 0);
  const x = Math.sin(angle), y = -Math.cos(angle);
  const scale = 1 / Math.max(Math.abs(x), Math.abs(y));
  return {id: nearest.id, distance, angle: angle * 180 / Math.PI, x: 50 + x * scale * 46, y: 50 + y * scale * 44};
}

// What both maps are drawn from at this moment: only reads the game.
export function worldMapFrame({state, course, model, knowledge, picture, canvas}) {
  const worldJob = state.arena.worldJob, car = worldMapCar(state, course);
  const data = worldJobMapData(course, state);
  const target = model?.target ? {id: model.target.id, name: model.target.name, x: model.target.x, z: model.target.z} : null;
  const step = worldJob?.job?.steps?.[worldJob.job.stepIndex];
  const awaitingPickup = worldJob?.definition?.id === 'everburn-hot-delivery' && step?.pickup && !worldJob.job.stepState.loaded;
  const actors = awaitingPickup ? [] : (data?.marks ?? []).filter(mark => mark.kind !== 'player');
  const dace = step?.id === 'chase' ? worldJob.night2?.daceTrack : null;
  if (dace) actors.push({id: 'dace', kind: dace.visible ? 'dace' : 'dace-last', position: dace.position});
  return {picture, canvas, car, target, knowledge, actors, worldJob,
    onFoot: state.onFoot === true, racing: state.status === 'racing'};
}

// The ways to the job's place, each with its numbers (src/world/scablands-ways.js). From the job's own starting place when it has one
// (what is known before setting off), otherwise from the car.
export function worldMapWays({worldJob, car, target, land = LAND}) {
  if (!target) return {start: null, ways: []};
  const step = worldJob?.job?.steps?.[worldJob.job.stepIndex], origin = step?.origin?.position ?? step?.origin;
  const start = origin && Number.isFinite(origin.x) ? {x: origin.x, z: origin.z} : {x: car.x, z: car.z}, end = {x: target.x, z: target.z};
  const facts = jobFacts(worldJob);
  const watchers = facts.furnaces.filter(item => !item.hidden).map(item => ({id: item.id, name: 'the furnace', x: item.x, z: item.z, range: WATCH.furnace.range, eye: WATCH.furnace.eye}));
  const options = {barricades: facts.barricades, land};
  const made = [];
  if (worldJob?.definition?.id === 'everburn-hot-delivery') {
    for (const way of HOT_DELIVERY_WAYS) {
      const lookouts = (way.lookouts ?? []).map(id => { const place = land.at(id); return {id, name: "the Ridge's lookout", x: place.x, z: place.z, range: WATCH.lookout.range, eye: WATCH.lookout.eye}; });
      made.push(describeWay(way, routeFor(way.legs, {start, destination: end, land}), {...options, watchers: [...watchers, ...lookouts]}));
    }
  } else {
    const byRoad = roadWay(start, end);
    if (byRoad) made.push(describeWay({id: 'roads', name: 'By the roads'}, byRoad, {...options, watchers}));
    made.push(describeWay({id: 'straight', name: 'Straight over open ground'}, [start, end], {...options, watchers}));
  }
  return {start, ways: made};
}

// A crossing becomes useful map knowledge only when the car can see it.
export function learnWayCrossings(knowledge, result, crossings, car, tunnels = null, trace = sees) {
  let changed = false;
  for (const way of result.ways) {
    if (way.id === 'east-road' || knowledge.ways.has(way.id)) continue;
    const visible = way.crossings.some(item => {
      const crossing = crossings.find(place => place.id === item.id);
      return crossing && trace(car, crossing, {heightAt: scablandsSurfaceHeightAt, actorFloors: true,
        tunnels, eye: 1.5, target: 2, step: 5, range: 400});
    });
    if (visible) { knowledge.ways.add(way.id); changed = true; }
  }
  if (changed) knowledge.version++;
  return changed;
}

// Check crossing visibility at most twice per second for each job.
export function checkWayCrossings(schedule, now, knowledge, result, crossings, car, tunnels = null, trace = sees) {
  if (now - schedule.last < 0.5) return false;
  schedule.last = now;
  return learnWayCrossings(knowledge, result, crossings, car, tunnels, trace);
}

// Count distinct stretches driven near each way, so reversing over one stretch
// or jumping to a distant position cannot uncover a way.
export function learnDrivenWays(knowledge, result, car) {
  const progress = knowledge.drivenWays ??= new Map();
  let changed = false;
  for (const way of result.ways) {
    if (way.id === 'east-road' || knowledge.ways.has(way.id)) continue;
    const hit = nearestOnLine(way.points, car.x, car.z);
    if (!hit) continue;
    let record = progress.get(way.id);
    if (!record) progress.set(way.id, record = {previous:null, ranges:[]});
    const previous = record.previous;
    record.previous = hit.distance <= 30 ? {along:hit.along, x:car.x, z:car.z} : null;
    if (!previous || !record.previous || Math.hypot(car.x - previous.x, car.z - previous.z) > 50 ||
        Math.abs(hit.along - previous.along) > 50) continue;
    const ranges = [...record.ranges, [Math.min(previous.along, hit.along), Math.max(previous.along, hit.along)]]
      .sort((a, b) => a[0] - b[0]);
    record.ranges = [];
    for (const range of ranges) {
      const last = record.ranges.at(-1);
      if (last && range[0] <= last[1]) last[1] = Math.max(last[1], range[1]);
      else record.ranges.push(range);
    }
    if (record.ranges.reduce((sum, range) => sum + range[1] - range[0], 0) >= 300) {
      knowledge.ways.add(way.id); knowledge.version++; changed = true;
    }
  }
  return changed;
}

const escapeText = value => String(value).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
// Remember hazards only after the car meets them during this job.
export function learnHotDeliveryDangers(knowledge, worldJob, car) {
  const dangers = knowledge.hotDeliveryDangers ??= new Set();
  const before = dangers.size;
  if (car && scablandsDriveAt(car.x, car.z).id === 'salt-pan') dangers.add('salt-pan');
  if (car && scablandsDriveAt(car.x, car.z).id === 'river-bed') dangers.add('river-bed');
  if (worldJob.pipeDeck?.onDeck) dangers.add('pipe');
  if (dangers.size !== before) knowledge.version++;
}

export function waysMarkup(result, targetName, knowledge, {hotDelivery = false} = {}) {
  if (hotDelivery) {
    const east = result.ways.find(way => way.id === 'east-road');
    const items = result.ways.map((way, index) => {
      if (way !== east && !knowledge.ways.has(way.id)) return '';
      const detail = way === east ? '<ul><li>The Ash Men hold the Girder Bridge.</li></ul>' : ` <em>${wayKm(way.length)}</em>`;
      return `<li class="world-hud-way" style="--way:${wayColour(index)}"><b>${String.fromCharCode(65 + index)}</b><div><strong>${escapeText(way.name)}</strong>${detail}</div></li>`;
    }).join('');
    const dangers = [...knowledge.barricades.values()].map(item => `A barricade of the ${item.who}.`);
    if (knowledge.sights.size) dangers.push('The furnace watches the land.');
    if (knowledge.hotDeliveryDangers?.has('salt-pan')) dangers.push('The wind on the salt pan cools the ember faster.');
    if (knowledge.hotDeliveryDangers?.has('river-bed')) dangers.push('Cold mist lies in the hollows. Steer round it.');
    if (knowledge.hotDeliveryDangers?.has('pipe')) dangers.push('Cross the Pipe at 40 km/h or less.');
    const learnt = dangers.length ? `<ul class="world-hud-learnt">${dangers.map(line => `<li>${escapeText(line)}</li>`).join('')}</ul>` : '';
    return `<h3>WHAT YOU KNOW</h3><ol>${items}</ol>${learnt}`;
  }
  const heading = `<h3>WAYS TO ${escapeText((targetName ?? 'THE MARKED PLACE').toUpperCase())}</h3>`;
  const items = result.ways.map((way, index) => {
    const lines = wayLines(way).map(line => `<li>${escapeText(line)}</li>`).join('');
    return `<li class="world-hud-way" style="--way:${wayColour(index)}"><b>${String.fromCharCode(65 + index)}</b><div><strong>${escapeText(way.name)}</strong> <em>${wayKm(way.length)}</em><span>${escapeText(groundWords(way))}</span>${lines ? `<ul>${lines}</ul>` : ''}</div></li>`;
  }).join('');
  const learnt = [...knowledge.barricades.values()].map(item => `A barricade of the ${item.who}`)
    .concat([...knowledge.crossings.values()].map(item => `${item.name} is held by the ${item.who}`), [...knowledge.sights.values()].map(() => "The furnace's sight, as far as the ground allows"));
  return `${heading}<ol>${items || '<li class="world-hud-way">No way is known.</li>'}</ol><h3>WHAT YOU HAVE LEARNT</h3>` +
    (learnt.length ? `<ul class="world-hud-learnt">${learnt.map(line => `<li>${escapeText(line)}</li>`).join('')}</ul>` : '<p class="world-hud-none">Nothing yet. Drive, and look.</p>');
}

export function moveMapCaption(caption, map, original = null) {
  if (!caption) return null;
  if (original) {
    original.parent.insertBefore(caption, original.next);
    return null;
  }
  const place = {parent: caption.parentNode, next: caption.nextSibling};
  map.append(caption);
  return place;
}

export function createWorldHud({host, app = null, picture = null}) {
  const doc = host.ownerDocument;
  if (doc?.head && !doc.getElementById(STYLE_ID)) {
    const link = doc.createElement('link'); link.id = STYLE_ID; link.rel = 'stylesheet';
    link.href = new URL('./world-hud.css', import.meta.url).href; doc.head.append(link);
  }
  const root = doc.createElement('section'); root.className = 'world-hud'; root.hidden = true;
  root.setAttribute('aria-label', 'Scablands job guidance');
  root.innerHTML = `<div class="world-hud-line" role="status"></div><div class="world-hud-prompt" role="status"></div><div class="world-hud-progress" hidden></div><div class="world-hud-truck" hidden><span></span><progress></progress></div><div class="world-hud-ember" hidden><b>EMBER</b><span class="world-hud-ember-bar"><i></i></span><em></em></div><div class="world-hud-brazier-arrow" role="status" hidden><i>▲</i><span></span></div><div class="world-hud-compass" aria-label="Direction to goal"><b>N</b><i></i></div>
    <section class="world-hud-minimap" aria-label="Map of the land round your car"><canvas class="world-hud-minimap-canvas" width="${SMALL_MAP.width}" height="${SMALL_MAP.height}" role="img" aria-label="Map of the land round your car"></canvas></section>
    <button class="world-hud-map-button" type="button" aria-expanded="false">M · MAP</button>
    <section class="world-hud-map" role="dialog" aria-label="Scablands map" hidden><header><b>THE SCABLANDS</b><span class="world-hud-map-sub">The whole land, north at the top. The game stands still while this is open.</span><button type="button" data-world-map-close>CLOSE</button></header>
      <div class="world-hud-map-body"><canvas class="world-hud-map-canvas" width="${BIG_MAP.width}" height="${BIG_MAP.height}" role="img" aria-label="Map of the whole land with your car, the job's place and the ways to it"></canvas>
      <aside class="world-hud-ways" aria-label="Ways to the job's place"></aside></div>
      </section>`;
  host.append(root);
  const seenGauge = doc.createElement('div');
  seenGauge.className = 'world-hud-seen';
  seenGauge.hidden = true;
  seenGauge.innerHTML = '<b>SEEN</b><progress aria-label="Seen by the furnace"></progress>';
  root.append(seenGauge);
  const seenMeter = seenGauge.querySelector('progress');
  const line = root.querySelector('.world-hud-line'), compass = root.querySelector('.world-hud-compass i');
  const prompt = root.querySelector('.world-hud-prompt'), progress = root.querySelector('.world-hud-progress');
  const truckBar = root.querySelector('.world-hud-truck'), truckLabel = truckBar.querySelector('span'), truckMeter = truckBar.querySelector('progress');
  const emberGauge = root.querySelector('.world-hud-ember'), emberBar = emberGauge.querySelector('i'), emberNote = emberGauge.querySelector('em'), emberLabel = emberGauge.querySelector('b');
  const brazierPointer = root.querySelector('.world-hud-brazier-arrow'), brazierDirection = brazierPointer.querySelector('i'), brazierDistance = brazierPointer.querySelector('span');
  let lastJolts = 0;
  const mapButton = root.querySelector('.world-hud-map-button'), map = root.querySelector('.world-hud-map');
  const canvas = root.querySelector('.world-hud-map-canvas'), context = canvas?.getContext?.('2d');
  const smallCanvas = root.querySelector('.world-hud-minimap-canvas'), smallContext = smallCanvas?.getContext?.('2d');
  const ways = root.querySelector('.world-hud-ways');
  let active = false, mapOpen = false, disposed = false, pausedByMap = false, captionPlace = null;
  const caption = host.querySelector('#race-callout');
  const land = picture ?? getLandPicture();
  let landCanvas = null, lastSmall = -Infinity, lastKnowledgeVersion = -1, lastFrame = null;
  const knowledgeOf = new WeakMap(), hotWaysOf = new WeakMap(), crossingChecksOf = new WeakMap();
  // What the maps cost, kept where a check can read it: draws, milliseconds drawing, the slowest draw, and the milliseconds that
  // making the picture of the land took.
  const stats = root.worldMapStats = {smallDraws: 0, smallMs: 0, smallMaxMs: 0, bigDraws: 0, bigMs: 0, waysMs: 0, pictureMs: 0, updateMs: 0, updates: 0};
  const clock = () => globalThis.performance?.now?.() ?? Date.now();
  const drawBig = frame => {
    const began = clock();
    const hotDelivery = frame.worldJob?.definition?.id === 'everburn-hot-delivery';
    const target = hotDelivery ? LAND.at('tin-town') : frame.target;
    const result = worldMapWays({worldJob: frame.worldJob, car: frame.car, target});
    stats.waysMs = clock() - began;
    ways.innerHTML = waysMarkup(result, frame.target?.name, frame.knowledge, {hotDelivery});
    if (context) drawBigMap(context, {...frame, ways: hotDelivery ? result.ways.filter(way => way.id === 'east-road' || frame.knowledge.ways.has(way.id)) : result.ways}, BIG_MAP);
    stats.bigDraws++; stats.bigMs = clock() - began;
  };
  // The caption sits on the map's lower edge while the game is paused for the map.
  const setMapOpen = value => {
    if (value === mapOpen) return;
    if (value && app) {
      if (app.duel.state.paused) return;
      app.worldMapOpen = true; app.togglePause(); pausedByMap = true;
    }
    mapOpen = value; map.hidden = !mapOpen; mapButton.setAttribute('aria-expanded', String(mapOpen)); host.classList?.toggle('world-map-open', mapOpen);
    captionPlace = moveMapCaption(caption, map, captionPlace);
    if (!value && app) { app.worldMapOpen = false; if (pausedByMap && app.duel.state.paused) app.togglePause(); pausedByMap = false; }
    if (mapOpen && lastFrame) drawBig(lastFrame);
  };
  const click = event => {
    if (event.target.closest?.('[data-world-map-close]')) setMapOpen(false);
    else if (event.target.closest?.('.world-hud-map-button')) setMapOpen(!mapOpen);
  };
  const keydown = event => {
    if (!active || event.repeat || event.altKey || event.ctrlKey || event.metaKey ||
      /^(INPUT|TEXTAREA|SELECT)$/.test(event.target?.tagName) || event.target?.isContentEditable) return;
    if (event.code === 'KeyM') { event.preventDefault(); setMapOpen(!mapOpen); }
    else if (event.code === 'Escape' && mapOpen) { event.preventDefault(); setMapOpen(false); }
  };
  root.addEventListener('click', click); doc.addEventListener('keydown', keydown);
  return {
    stats,
    update(state, duel, profile) {
      if (disposed) return;
      active = state?.arena?.mode === 'world-job' && ['countdown', 'racing'].includes(state.status);
      root.hidden = !active;
      host.classList?.toggle('world-minimap-on', active);
      if (!active) { setMapOpen(false); return; }
      const began = clock();
      // The picture of the land is made, a slice a frame, from the first frame of the first job; until it is whole the maps show what is done.
      if (!land.done) { const before = clock(); land.step(state.status === 'countdown' ? PICTURE_SLICE_COUNTDOWN_MS : PICTURE_SLICE_MS); stats.pictureMs += clock() - before; }
      if (doc.createElement && !landCanvas) landCanvas = createPictureCanvas(land, doc);
      if (landCanvas && landCanvas.update()) lastSmall = -Infinity;
      const actor = state.onFoot && state.fighter ? state.fighter : state;
      const point = state.onFoot && state.fighter ? state.fighter : duel.course?.worldAt?.(actor.s, actor.lateral);
      const model = worldHudModel({worldJob: state.arena.worldJob, player: point, speedKmh:(state.speedMph ?? 0) * 1.609344, onFoot:state.onFoot,
        found: profile?.world?.found ?? []});
      line.textContent = model.line;
      prompt.textContent = model.prompt;
      // With nothing to ask, the box goes too (it stayed as an empty dark pill beside the mirror).
      prompt.hidden = !model.prompt;
      const bars=model.wave?[{label:`WAVE ${Math.min(model.wave.value+1,model.wave.max)} / ${model.wave.max}`,value:Math.min(model.wave.value+1,model.wave.max),max:model.wave.max}]:[];
      if(model.well)bars.push({label:`WELL ${Math.ceil(model.well.value)} / ${model.well.max}`,value:model.well.value,max:model.well.max});
      progress.hidden=!bars.length;
      progress.replaceChildren(...bars.flatMap(bar=>{const label=doc.createElement('span'),meter=doc.createElement('progress');label.textContent=bar.label;meter.max=bar.max;meter.value=bar.value;meter.setAttribute('aria-label',bar.label);return[label,meter];}));
      // RUN-GAS: Big Bess's health sits at the lower left above the armour bar, clear of the rear-view mirror and the caption line.
      truckBar.hidden=!model.truck;
      if(model.truck){const label=`BIG BESS ${Math.ceil(model.truck.value)} / ${model.truck.max}`;truckLabel.textContent=label;truckMeter.max=model.truck.max;truckMeter.value=model.truck.value;truckMeter.setAttribute('aria-label',label);}
      // The ember gauge: a glowing bar that dims as the ember falls, flashes when a jolt takes ember, and says OUT at 0.
      seenGauge.hidden = !model.seen;
      if (model.seen) {
        seenMeter.max = model.seen.max;
        seenMeter.value = model.seen.value;
      }
      emberGauge.hidden = !model.ember && !model.brand && !model.bellows && !model.gas;
      if (model.gas) drawGasGauge(model.gas, emberGauge, emberBar, emberLabel, emberNote);
      if (model.bellows) drawBellowsGauge(model.bellows, emberGauge, emberBar, emberLabel, emberNote);
      if (model.brand) drawBrandGauge(model.brand, emberGauge, emberBar, emberLabel, emberNote);
      if (model.ember) {
        const share = Math.max(0, Math.min(1, model.ember.value / model.ember.max));
        emberBar.style.width = `${(share * 100).toFixed(1)}%`;
        emberGauge.style.setProperty('--ember-glow', share.toFixed(2));
        emberGauge.classList.toggle('is-out', model.ember.out);
        emberGauge.classList.toggle('is-losing', !model.ember.out && model.ember.rate > 1);
        emberLabel.textContent = model.ember.out ? 'OUT' : 'EMBER';
        emberNote.textContent = model.ember.out ? 'back to the brazier' : `${Math.ceil(model.ember.value)}`;
        if (model.ember.jolts !== lastJolts) {
          lastJolts = model.ember.jolts;
          emberGauge.classList.remove('is-flashing'); void emberGauge.offsetWidth; emberGauge.classList.add('is-flashing');
        }
        emberGauge.setAttribute('aria-label', model.ember.out ? 'Ember out, go back to the brazier' : `Ember ${Math.ceil(model.ember.value)} out of ${model.ember.max}`);
      }
      compass.style.transform = model.arrow === null ? 'rotate(0deg)' : `rotate(${model.arrow}deg)`;
      // The maps read the game and change nothing in it. What the player has learnt stays for the job.
      const worldJob = state.arena.worldJob;
      let knowledge = knowledgeOf.get(worldJob);
      if (!knowledge) knowledgeOf.set(worldJob, knowledge = createKnowledge());
      const frame = worldMapFrame({state, course: duel.course, model, knowledge, picture: land, canvas: landCanvas?.canvas ?? null});
      frame.landmarkLines = duel.course.realismThings?.landmarkLines ?? [];
      learn(knowledge, {car: frame.car, ...jobFacts(worldJob), crossings: land.marks.crossings, tunnels: duel.course.groundTunnels});
      if (worldJob?.definition?.id === 'everburn-hot-delivery') {
        let result = hotWaysOf.get(worldJob);
        if (!result) {
          result = worldMapWays({worldJob, car: frame.car, target: LAND.at('tin-town')});
          hotWaysOf.set(worldJob, result);
        }
        let crossingChecks = crossingChecksOf.get(worldJob);
        if (!crossingChecks) crossingChecksOf.set(worldJob, crossingChecks = {last: -Infinity});
        checkWayCrossings(crossingChecks, state.stageTimeSec ?? 0, knowledge, result, land.marks.crossings, frame.car, duel.course.groundTunnels);
        learnDrivenWays(knowledge, result, frame.car);
        learnHotDeliveryDangers(knowledge, worldJob, frame.car);
      }
      const pointer = brazierArrow(model.ember, frame.car, knowledge);
      brazierPointer.hidden = !pointer;
      if (pointer) {
        brazierPointer.style.left = `${pointer.x}%`;
        brazierPointer.style.top = `${pointer.y}%`;
        brazierDirection.style.transform = `rotate(${pointer.angle}deg)`;
        brazierDistance.textContent = `${Math.round(pointer.distance)} m`;
        brazierPointer.setAttribute('aria-label', `Nearest known brazier, ${Math.round(pointer.distance)} metres away`);
      }
      lastFrame = frame;
      if (mapOpen) { stats.updates++; stats.updateMs += clock() - began; return; }
      const now = clock();
      if (smallContext && (now - lastSmall >= SMALL_MAP_EVERY_MS || knowledge.version !== lastKnowledgeVersion)) {
        lastSmall = now; lastKnowledgeVersion = knowledge.version;
        const before = clock();
        const marker = drawSmallMap(smallContext, frame, SMALL_MAP);
        const cost = clock() - before;
        stats.smallDraws++; stats.smallMs += cost; stats.smallMaxMs = Math.max(stats.smallMaxMs, cost);
        const label = `Map of the land round your car, north at the top. ${frame.target ? (marker?.onMap ? `${frame.target.name} is on the map.` : `${frame.target.name} is ${marker?.km?.toFixed(1)} km away.`) : ''}`;
        const dace = frame.actors.find(actor => actor.id === 'dace');
        const tracking = dace?.kind === 'dace' ? ' Dace is in sight.' : dace ? ' Dace’s last seen position is marked.' : '';
        if (smallCanvas.getAttribute('aria-label') !== label + tracking) smallCanvas.setAttribute('aria-label', label + tracking);
        smallCanvas.dataset.dace = dace?.kind ?? '';
      }
      stats.updates++; stats.updateMs += clock() - began;
    },
    dispose() {
      if (disposed) return;
      if (captionPlace) captionPlace = moveMapCaption(caption, map, captionPlace);
      disposed = true; root.removeEventListener('click', click); doc.removeEventListener('keydown', keydown); host.classList?.remove('world-map-open'); host.classList?.remove('world-minimap-on'); root.remove();
    },
  };
}
