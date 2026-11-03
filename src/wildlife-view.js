// Drawing the animals beside the road and under the helicopter
// (docs/HELI_WILDLIFE.md sections 3.3 and 3.4, card WILD-VIEW).
//
// The rules of where animals stand are src/wildlife.js's, and which species
// have a model is src/wildlife-models.js's. This file only draws: it reads the
// race (where the cars are) and never writes to it, so no race rule, replay,
// timing, pay or world signature can change. Everything lives in one group of
// its own beside the cars, never inside the world, and the world builder never
// sees it. The animals' own seed is the course id, the play day and the race
// number of that day (wildlifeSeed), never the race's generator.
//
// What an animal does: it idles until a car comes within 35 m (the helicopter,
// when it flies low, within 100 m, the distance the count scares at), turns
// away from the road and trots or bounds 10 to 20 m into cover with its Walk
// clip played faster, then idles again. A bird takes off and flies away and
// does not come back that race. Beyond 250 m in a race (400 m from the air) an
// animal fades out, and at most 12 are drawn at once, nearest first.
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {clone as cloneSkeleton} from 'three/addons/utils/SkeletonUtils.js';
import {placeWildlife, createPlacementChecker, wildlifeRng} from './wildlife.js';
import {referenceLap} from './reference-laps.js';
import {renderedGroundHeight} from './rendered-ground.js';
import {WILDLIFE_MODELS, APPROVED_MODEL_IDS, wildlifeModelUrl} from './wildlife-models.js';

// Every number of the drawing, once. Metres, seconds, radians.
export const WILDLIFE_VIEW = Object.freeze({
  startle: 35,             // a car this close startles an animal
  heliReach: 100,          // the helicopter, below heliLow, startles at this reach (the count's scare reach)
  heliLow: 60,             // ...and "low" is below this height above the ground (the count's scare height)
  fadeRace: 250,           // animals fade out beyond this in a race...
  fadeHeli: 400,           // ...and beyond this from the helicopter
  fadeBand: 30,            // the fade runs over this last stretch
  maxDrawn: 12,            // animals drawn at once, nearest first
  fleeMin: 10, fleeMax: 20,// how far a startled animal goes
  turnRate: 7,             // radians a second
  blendRate: 6,            // idle to move and back, per second
  shadowReach: 120,        // animals nearer than this cast shadows
  birdSpeed: 9,            // a startled bird's ground speed, metres a second
  birdClimb: 5,            // and its climb, metres a second
  birdLift: .35,           // the climb quickens by this much each second
  birdGone: 12,            // seconds after take-off a bird is out of sight for the rest of the race
  ringInner: 3.3, ringOuter: 4, // the pale ring on the ground around an animal that was counted (metres)
  ringPulse: .9,           // it swells and settles once over this many seconds...
  ringStay: .3,            // ...and then stays at this opacity until the count ends
});

// The ring of a counted animal: opacity and size `age` seconds after the count. One pulse, then faint for good.
export function ringLook(age) {
  const t = Math.min(1, Math.max(0, age / WILDLIFE_VIEW.ringPulse));
  return {opacity: .95 + (WILDLIFE_VIEW.ringStay - .95) * t, scale: 1 + .5 * Math.sin(Math.PI * t)};
}

// ---------------------------------------------------------------------------
// The pure decisions (tested without graphics)
// ---------------------------------------------------------------------------
export const IDLE = 0, FLEE = 1, FLY = 2, GONE = 3;

// How near a threat must come to startle an animal. A car startles at 35 m. The
// helicopter startles only while it is low, and then at the count's reach;
// `agl` is its height above the ground, or null for a car.
export function startleReach(agl = null) {
  if (agl === null || agl === undefined) return WILDLIFE_VIEW.startle;
  return agl < WILDLIFE_VIEW.heliLow ? WILDLIFE_VIEW.heliReach : 0;
}

// The idle or flee decision: an idle animal startles when a threat is nearer
// than its reach; a fleeing one is idle again once it has arrived. Birds that
// have flown off stay gone.
export function nextMood(mood, distance, {arrived = false, reach = WILDLIFE_VIEW.startle, bird = false} = {}) {
  if (mood === GONE) return GONE;
  if (mood === IDLE) return distance < reach ? (bird ? FLY : FLEE) : IDLE;
  if (mood === FLEE) return arrived ? IDLE : FLEE;
  return FLY;
}

// 10 to 20 m for a unit number from 0 to 1.
export const fleeLength = unit => WILDLIFE_VIEW.fleeMin + Math.min(1, Math.max(0, unit)) * (WILDLIFE_VIEW.fleeMax - WILDLIFE_VIEW.fleeMin);

// 1 near, 0 at and beyond the limit, falling over the last `fadeBand` metres.
export function fadeAlpha(distance, limit, band = WILDLIFE_VIEW.fadeBand) {
  if (!(distance < limit)) return 0;
  return Math.min(1, (limit - distance) / band);
}

// The indices of the nearest animals within `limit` metres, nearest first, at
// most `max` of them, written into `out` (no allocation); returns how many.
// `distances` holds one number per animal, Infinity for one that cannot be drawn.
export function pickNearest(distances, limit, max, out) {
  let count = 0;
  for (let i = 0; i < distances.length; i++) {
    const d = distances[i];
    if (!(d < limit)) continue;
    let at = count < max ? count++ : (d < distances[out[max - 1]] ? max - 1 : -1);
    if (at < 0) continue;
    while (at > 0 && distances[out[at - 1]] > d) { out[at] = out[at - 1]; at--; }
    out[at] = i;
  }
  return count;
}

// The way to turn: `current` moved toward `target` by at most `step` radians, by the short way round.
export function turnToward(current, target, step) {
  const difference = Math.atan2(Math.sin(target - current), Math.cos(target - current));
  return current + Math.max(-step, Math.min(step, difference));
}

// Facing for a model whose nose points along +X: the yaw that looks toward (dx, dz).
export const yawToward = (dx, dz) => Math.atan2(-dz, dx);

// Where a startled bird is `age` seconds after take-off: away along (dirX, dirZ), climbing faster as it goes.
export function birdFlight(start, dirX, dirZ, age) {
  const run = WILDLIFE_VIEW.birdSpeed * age;
  return {x: start.x + dirX * run, z: start.z + dirZ * run,
    y: start.y + WILDLIFE_VIEW.birdClimb * age + WILDLIFE_VIEW.birdLift * age * age};
}

// The play day as a whole number of calendar days, so one day's animals are the same all day.
export function calendarPlayDay(date = new Date()) {
  return Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000);
}

// ---------------------------------------------------------------------------
// The view
// ---------------------------------------------------------------------------
const defaultLoad = url => new GLTFLoader().loadAsync(url);
const MAX_THREATS = 24;

function disposeModel(scene) {
  const things = new Set();
  scene?.traverse(node => {
    if (node.geometry) things.add(node.geometry);
    for (const material of [node.material].flat().filter(Boolean)) {
      things.add(material);
      for (const value of Object.values(material)) if (value?.isTexture) things.add(value);
    }
  });
  for (const thing of things) thing.dispose();
}

// options: scene (the parent the animals' group joins), host (an element that
// shows the view's state in data-wildlife, for the browser checks), loadModel(url)
// -> a glTF (tests give their own), playDay() -> a whole number.
export function createWildlifeView({scene, host = null, loadModel = defaultLoad, playDay = calendarPlayDay} = {}) {
  const group = new THREE.Group();
  group.name = 'Wildlife';
  group.visible = false;
  scene.add(group);

  const models = new Map();           // species -> {status, gltf, idle, move}
  const checkers = new WeakMap();     // course -> placement checker, made when an animal first flees
  const herds = new Map();            // herd key -> Group
  let entities = [];
  let distances = new Float64Array(0), picked = new Int32Array(WILDLIFE_VIEW.maxDrawn);
  const threats = new Float64Array(MAX_THREATS * 2);
  const heliNow = {x: 0, y: 0, z: 0, agl: 0};
  let threatCount = 0;

  const countIndex = new Map();       // the count's animal id -> its entity
  let ringGeometry = null;
  let planKey = null, countKey = null, planCourse = null;
  let lastRun = null, raceCount = 0, countDay = null;
  let revision = 0, retired = false, shown = false, lastStatus = '';
  let drawnCount = 0;

  const shownState = () => `${planKey ? entities.length : 0} animals, ${drawnCount} drawn`;
  function report(text) {
    if (host && text !== lastStatus) { lastStatus = text; host.dataset.wildlife = text; }
  }

  // ---- models ---------------------------------------------------------------
  function ensureModel(species) {
    let model = models.get(species);
    if (!model) { model = {status: 'idle'}; models.set(species, model); }
    if (model.status !== 'idle' || !WILDLIFE_MODELS[species]) return model;
    model.status = 'loading';
    Promise.resolve().then(() => loadModel(wildlifeModelUrl(species))).then(gltf => {
      const entry = WILDLIFE_MODELS[species];
      const idle = THREE.AnimationClip.findByName(gltf.animations, entry.idle), move = THREE.AnimationClip.findByName(gltf.animations, entry.fly ?? entry.move);   // a bird flies in its Fly loop
      if (retired || !idle || !move) { disposeModel(gltf.scene); model.status = 'failed'; return; }
      Object.assign(model, {gltf, idle, move, status: 'ready'});
      revision++;
    }).catch(() => { model.status = 'failed'; });
    return model;
  }

  // ---- entities ---------------------------------------------------------------
  function makeEntity(source, id, herd, animal, unit) {
    return {
      source, id, herd, species: animal.species, cub: animal.cub === true, bird: animal.kind === 'bird',
      x: animal.x, y: animal.y, z: animal.z, s: animal.s ?? null, lateral: animal.lateral ?? null,
      yaw: unit * Math.PI * 2, yawTarget: null, mood: IDLE, drawn: false, picked: false, blend: 0, alpha: -1, shadow: null, flees: 0,
      fromX: 0, fromY: 0, fromZ: 0, toX: 0, toY: 0, toZ: 0, travel: 0, length: 0, speed: 0, age: 0, dirX: 0, dirZ: 0, startY: 0,
      root: null, mixer: null, idleAction: null, moveAction: null, materials: null, meshes: null,
      scale: 1, unit, ring: null, ringAge: 0,
    };
  }

  // ---- the ring round a counted animal -----------------------------------------
  function addRing(entity) {
    ringGeometry ??= new THREE.RingGeometry(WILDLIFE_VIEW.ringInner, WILDLIFE_VIEW.ringOuter, 48).rotateX(-Math.PI / 2);
    // Seen through grass and trees on purpose: it is the pilot's mark, not part of the scenery.
    const material = new THREE.MeshBasicMaterial({color: 0xf3eedc, transparent: true, depthTest: false, depthWrite: false, fog: false, side: THREE.DoubleSide});
    const ring = new THREE.Mesh(ringGeometry, material);
    ring.name = 'Counted ring'; ring.renderOrder = 5;
    ring.position.set(entity.x, entity.y + .15, entity.z);
    entity.herd.add(ring);
    entity.ring = ring; entity.ringAge = 0;
    revision++;
  }

  function stepRing(entity, dt, distance, limit) {
    entity.ringAge += dt;
    const look = ringLook(entity.ringAge), ring = entity.ring;
    ring.material.opacity = look.opacity * fadeAlpha(distance, limit);
    ring.scale.setScalar(look.scale);
    ring.visible = ring.material.opacity > .01;
  }

  function clearEntities(source) {
    for (const entity of entities) if (entity.source === source) release(entity);
    entities = entities.filter(entity => entity.source !== source);
    for (const [key, herd] of herds) {
      if (!key.startsWith(source + '|')) continue;
      group.remove(herd); herds.delete(key);
    }
    distances = new Float64Array(entities.length);
    revision++;
  }

  function herdGroup(source, herdId) {
    const key = source + '|' + herdId;
    let herd = herds.get(key);
    if (!herd) { herd = new THREE.Group(); herd.name = `Wildlife herd ${herdId}`; group.add(herd); herds.set(key, herd); }
    return herd;
  }

  function groundHeight(course, entity) {
    const near = course.nearest(entity.x, entity.z);
    entity.s = near.s; entity.lateral = near.lateral;
    const y = renderedGroundHeight(course, {x: entity.x, z: entity.z, s: near.s, off: near.lateral});
    return Number.isFinite(y) ? y : entity.y;
  }

  function planRace(course, raceNumber, day) {
    clearEntities('race');
    const id = course.def.id;
    let placed = null;
    try {
      placed = placeWildlife({courseId: id, playDay: day, raceNumber, course,
        referenceLap: referenceLap(id, 'fixed') ?? referenceLap(id, 'route_a'), approvedModels: APPROVED_MODEL_IDS});
    } catch { placed = null; }   // an animal never stops a race
    if (!placed) return;
    const rng = wildlifeRng(id, day, raceNumber, 'view');
    for (const spot of placed.spots) {
      const herd = herdGroup('race', spot.index);
      spot.animals.forEach((animal, k) => {
        const entity = makeEntity('race', `${spot.index}.${k}`, herd, animal, rng.float());
        entity.y = groundHeight(course, entity);
        entities.push(entity);
        ensureModel(animal.species);
      });
    }
    distances = new Float64Array(entities.length);
    revision++;
  }

  function planCount(course, survey) {
    clearEntities('count');
    countIndex.clear();
    const rng = wildlifeRng(course.def.id, 0, 0, 'count-view|' + survey.jobId);
    for (const animal of survey.animals) {
      if (!WILDLIFE_MODELS[animal.species]) continue;   // no model, nothing to draw (and the count's numbers never depend on it)
      const herdId = animal.id.split('-')[0];
      const entity = makeEntity('count', 'c' + animal.id, herdGroup('count', herdId), {species: animal.species, kind: 'ground', x: animal.x, y: 0, z: animal.z}, rng.float());
      entity.y = groundHeight(course, entity);
      entities.push(entity);
      countIndex.set(animal.id, entity);
      ensureModel(animal.species);
    }
    distances = new Float64Array(entities.length);
    revision++;
  }

  // ---- the clone each drawn animal wears -------------------------------------
  function dress(entity) {
    const model = models.get(entity.species), entry = WILDLIFE_MODELS[entity.species];
    const root = cloneSkeleton(model.gltf.scene);
    const materials = [], meshes = [];
    root.traverse(node => {
      if (!node.isMesh) return;
      // Its own material, so one animal can fade without the others, drawn in the see-through pass for good so a fade never changes the shader.
      node.material = node.material.clone();
      node.material.transparent = true; node.material.depthWrite = true;
      materials.push(node.material); meshes.push(node);
      node.castShadow = false; node.receiveShadow = false;
    });
    const mixer = new THREE.AnimationMixer(root);
    entity.idleAction = mixer.clipAction(model.idle).play();
    entity.moveAction = mixer.clipAction(model.move).play();
    entity.idleAction.time = entity.unit * model.idle.duration;
    entity.idleAction.weight = 1; entity.moveAction.weight = 0;
    entity.moveAction.timeScale = entry.run.rate;
    entity.scale = entry.scale * (entity.cub ? entry.cubScale ?? .5 : 1);
    root.scale.setScalar(entity.scale);
    entity.root = root; entity.mixer = mixer; entity.materials = materials; entity.meshes = meshes;
    entity.herd.add(root);
    revision++;
  }

  function release(entity) {
    if (entity.ring) { entity.herd?.remove(entity.ring); entity.ring.material.dispose(); entity.ring = null; }
    if (!entity.root) return;
    entity.herd?.remove(entity.root);
    entity.root.traverse(node => { if (node.isSkinnedMesh) node.skeleton.dispose(); });
    for (const material of entity.materials) material.dispose();
    entity.mixer.stopAllAction();
    entity.root = entity.mixer = entity.materials = entity.meshes = null;
  }

  // ---- what startles an animal ---------------------------------------------
  function gatherThreats(frame) {
    threatCount = 0;
    const add = object => {
      if (!object || object.visible === false || threatCount >= MAX_THREATS) return;
      threats[threatCount * 2] = object.position.x; threats[threatCount * 2 + 1] = object.position.z; threatCount++;
    };
    add(frame.player); add(frame.rival);
    const extras = frame.extras, traffic = frame.traffic;
    if (extras) for (let i = 0; i < extras.length; i++) add(extras[i].mesh);
    if (traffic) for (let i = 0; i < traffic.length; i++) add(traffic[i]);
  }

  function nearestThreat(entity) {
    let best = Infinity;
    for (let i = 0; i < threatCount; i++) {
      const dx = threats[i * 2] - entity.x, dz = threats[i * 2 + 1] - entity.z;
      best = Math.min(best, dx * dx + dz * dz);
    }
    return Math.sqrt(best);
  }

  // ---- fleeing ---------------------------------------------------------------
  // Away from the road in a race (along the lateral axis, outward), away from the
  // helicopter from the air. The first spot that is standable, not a road, wall or
  // lake, wins; an animal with no such spot just turns and stays.
  function checkerFor(course) {
    let checker = checkers.get(course);
    if (!checker) { checker = createPlacementChecker(course); checkers.set(course, checker); }
    return checker;
  }

  function startFlee(entity, course, awayX, awayZ) {
    const checker = checkerFor(course);
    const near = course.nearest(entity.x, entity.z);
    const side = Math.sign(near.lateral) || 1;
    const here = course.worldAt(near.s, near.lateral), out = course.worldAt(near.s, near.lateral + side * 5);
    let outX = out.x - here.x, outZ = out.z - here.z;
    const outLength = Math.hypot(outX, outZ) || 1;
    outX /= outLength; outZ /= outLength;
    let dirX = outX, dirZ = outZ;
    if (awayX !== null) {
      const length = Math.hypot(awayX, awayZ);
      if (length > .5) { dirX = awayX / length; dirZ = awayZ / length; }
    }
    if (entity.bird) { takeOff(entity, dirX, dirZ); return; }
    const full = fleeLength((entity.unit * 7.31 + entity.flees++ * .37) % 1);
    const base = Math.atan2(dirZ, dirX), outAngle = Math.atan2(outZ, outX);
    let found = null;
    search: for (const turn of [0, .6, -.6, 1.2, -1.2, null]) {
      const angle = turn === null ? outAngle : base + turn;
      for (const share of [1, .7, .45]) {
        const x = entity.x + Math.cos(angle) * full * share, z = entity.z + Math.sin(angle) * full * share;
        const spot = checker.inspect(x, z, {minEdge: 6, maxEdge: Infinity});
        if (spot) { found = {spot, angle, length: full * share}; break search; }
      }
    }
    if (!found) {
      entity.yawTarget = yawToward(dirX, dirZ);  // nowhere to go: it turns away and stays
      return;
    }
    const ground = renderedGroundHeight(course, {x: found.spot.x, z: found.spot.z, s: found.spot.s, off: found.spot.lateral});
    entity.fromX = entity.x; entity.fromY = entity.y; entity.fromZ = entity.z;
    entity.toX = found.spot.x; entity.toY = Number.isFinite(ground) ? ground : found.spot.y; entity.toZ = found.spot.z;
    entity.length = found.length; entity.travel = 0; entity.speed = WILDLIFE_MODELS[entity.species].run.speed;
    entity.yawTarget = yawToward(Math.cos(found.angle), Math.sin(found.angle));
    entity.mood = FLEE;
  }

  function takeOff(entity, dirX, dirZ) {
    entity.dirX = dirX; entity.dirZ = dirZ; entity.age = 0; entity.startY = entity.y;
    entity.fromX = entity.x; entity.fromY = entity.y; entity.fromZ = entity.z;
    entity.yawTarget = yawToward(dirX, dirZ);
    entity.mood = FLY;
  }

  function hide(entity) {
    if (entity.root) entity.root.visible = false;
    entity.drawn = false;
  }

  function step(entity, dt, course, heli, limit, distance) {
    if (!entity.root) dress(entity);
    // Startle: the nearest threat decides, by the pure rule above. A car is the
    // nearest of the cars; the helicopter counts only while it is low.
    if (entity.mood === IDLE) {
      const reach = heli ? startleReach(heli.agl) : WILDLIFE_VIEW.startle;
      const dx = heli ? entity.x - heli.x : 0, dz = heli ? entity.z - heli.z : 0;
      const near = !heli ? nearestThreat(entity) : reach > 0 ? Math.hypot(dx, dz) : Infinity;
      if (nextMood(IDLE, near, {reach, bird: entity.bird}) !== IDLE) startFlee(entity, course, heli ? dx : null, heli ? dz : null);
    }
    if (entity.mood === FLEE) {
      entity.travel += entity.speed * dt;
      const t = Math.min(1, entity.travel / entity.length);
      entity.x = entity.fromX + (entity.toX - entity.fromX) * t;
      entity.z = entity.fromZ + (entity.toZ - entity.fromZ) * t;
      entity.y = entity.fromY + (entity.toY - entity.fromY) * t;
      entity.mood = nextMood(FLEE, 0, {arrived: t >= 1});
    } else if (entity.mood === FLY) {
      entity.age += dt;
      const at = birdFlight({x: entity.fromX, y: entity.startY, z: entity.fromZ}, entity.dirX, entity.dirZ, entity.age);
      entity.x = at.x; entity.y = at.y; entity.z = at.z;
      if (entity.age > WILDLIFE_VIEW.birdGone) { entity.mood = GONE; hide(entity); return; }
    }
    // Turning and the idle-to-move blend.
    if (entity.yawTarget !== null) entity.yaw = turnToward(entity.yaw, entity.yawTarget, WILDLIFE_VIEW.turnRate * dt);
    const moving = entity.mood === FLEE || entity.mood === FLY ? 1 : 0;
    entity.blend += (moving - entity.blend) * Math.min(1, WILDLIFE_VIEW.blendRate * dt);
    entity.idleAction.weight = 1 - entity.blend; entity.moveAction.weight = entity.blend;
    entity.mixer.update(dt);
    const root = entity.root;
    root.position.set(entity.x, entity.y, entity.z);
    root.rotation.y = entity.yaw;
    // Fade and shadows.
    const alpha = fadeAlpha(distance, limit);
    if (Math.abs(alpha - entity.alpha) > .01) {
      entity.alpha = alpha;
      for (let i = 0; i < entity.materials.length; i++) entity.materials[i].opacity = alpha;
    }
    const shadow = distance < WILDLIFE_VIEW.shadowReach;
    if (shadow !== entity.shadow) { entity.shadow = shadow; for (let i = 0; i < entity.meshes.length; i++) entity.meshes[i].castShadow = shadow; }
    root.visible = true; entity.drawn = true;
  }

  function hideAll() {
    if (shown) {
      group.visible = false; shown = false;
      for (let i = 0; i < entities.length; i++) hide(entities[i]);
      drawnCount = 0;
    }
  }

  // ---- once a frame -----------------------------------------------------------
  // frame: enabled (the switch), hidden (menus and the Deep), course, runId (the
  // app's id for the race in hand), dt (0 while paused), worldVisible, heli (the
  // helicopter's view while flying, else null), and the cars: player, rival,
  // extras (the extra opponents, each {mesh}) and traffic. Reads only.
  function update(frame) {
    if (retired) return;
    const course = frame.course;
    if (!frame.enabled || frame.hidden || !course?.def) { hideAll(); report(frame.enabled ? 'hidden' : 'off'); return; }
    let heli = null;
    if (frame.heli?.heli) {
      const pose = frame.heli.heli;
      heliNow.x = pose.x; heliNow.y = pose.y; heliNow.z = pose.z; heliNow.agl = pose.y - (pose.groundY ?? 0);
      heli = heliNow;
    }
    if (frame.runId && frame.runId !== lastRun) {
      lastRun = frame.runId;
      const today = playDay();
      if (today !== countDay) { countDay = today; raceCount = 0; }
      raceCount++;
    }
    // The animals of the race in hand; from the air, the race there would be next.
    const key = `${course.def.id}|${heli ? raceCount + 1 : Math.max(1, raceCount)}|${heli ? 'air' : 'road'}`;
    if (key !== planKey || planCourse !== course) {
      planKey = key; planCourse = course;
      const today = playDay(), raceNumber = heli ? (today === countDay ? raceCount : 0) + 1 : Math.max(1, raceCount);
      planRace(course, raceNumber, today);
      // Leaving the helicopter or the course ends the count's animals too, so they
      // never stand in a race; planCount rebuilds them below if a count is still on.
      clearEntities('count'); countIndex.clear(); countKey = null;
    }
    const survey = heli && frame.heli.survey?.active && frame.heli.survey.courseId === course.def.id ? frame.heli.survey : null;
    const wantCount = survey ? `${survey.jobId}|${survey.animals.length}` : null;
    if (wantCount !== countKey) {
      countKey = wantCount;
      if (survey) planCount(course, survey); else { clearEntities('count'); countIndex.clear(); }
    }
    // The shutter click: an animal just counted gets its ring, where it stood.
    if (survey) for (let i = 0; i < survey.animals.length; i++) {
      const row = survey.animals[i];
      if (!row.counted) continue;
      const entity = countIndex.get(row.id);
      if (entity && !entity.ring) addRing(entity);
    }

    group.visible = frame.worldVisible !== false;
    shown = true;
    if (!entities.length) { drawnCount = 0; report('no animals'); return; }

    // How far each animal is from the viewer: the player's car, or the helicopter.
    const viewer = heli ?? frame.player?.position;
    if (!viewer) { hideAll(); return; }
    const vx = viewer.x, vy = viewer.y ?? 0, vz = viewer.z;
    const limit = heli ? WILDLIFE_VIEW.fadeHeli : WILDLIFE_VIEW.fadeRace;
    for (let i = 0; i < entities.length; i++) {
      const e = entities[i], model = models.get(e.species);
      if (e.mood === GONE || model?.status !== 'ready') { distances[i] = Infinity; continue; }
      const dx = e.x - vx, dy = e.y - vy, dz = e.z - vz;
      distances[i] = Math.sqrt(dx * dx + dy * dy + dz * dz);
    }
    const count = pickNearest(distances, limit, WILDLIFE_VIEW.maxDrawn, picked);
    for (let i = 0; i < entities.length; i++) entities[i].picked = false;
    for (let i = 0; i < count; i++) entities[picked[i]].picked = true;
    for (let i = 0; i < entities.length; i++) if (entities[i].drawn && !entities[i].picked) hide(entities[i]);
    if (!heli) gatherThreats(frame);
    const dt = Math.max(0, frame.dt ?? 0);
    for (let i = 0; i < count; i++) {
      const e = entities[picked[i]];
      step(e, dt, course, heli, limit, distances[picked[i]]);
    }
    for (let i = 0; i < entities.length; i++) {
      const e = entities[i];
      if (!e.ring) continue;
      const dx = e.x - vx, dy = e.y - vy, dz = e.z - vz;
      stepRing(e, dt, Math.sqrt(dx * dx + dy * dy + dz * dz), limit);
    }
    drawnCount = count;
    report(shownState());
  }

  function dispose() {
    if (retired) return;
    retired = true;
    for (const entity of entities) release(entity);
    entities = [];
    for (const model of models.values()) if (model.gltf) disposeModel(model.gltf.scene);
    models.clear(); herds.clear(); countIndex.clear();
    ringGeometry?.dispose();
    scene.remove(group);
    group.clear();
  }

  return {
    group, update, dispose,
    get revision() { return revision; },
  };
}
