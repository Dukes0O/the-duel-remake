// The car on the cable (docs/HELICOPTER.md section 5): a 15 m cable with
// the load as a point mass on a damped pendulum. Pure and repeatable, step
// 1/120 s like the flight. It returns the cable's pull on the helicopter;
// the flight step takes that as its external force.
import {CARS} from '../config.js';
import {GRAVITY, HELI_STEP, KESTREL} from './heli-flight.js';

export const CABLE = Object.freeze({
  length: 15,
  // Stiff when taut (a 1,450 kg car stretches it about 5 cm), slack when not.
  stiffness: 280000,
  damping: 12000,
  maxTension: 4 * KESTREL.hookLimitKg * GRAVITY,
  // Air drag on a hanging car, newtons per (m/s) squared.
  carDrag: 1.8,
  // A little damping of the swing about the hook.
  swingDamping: 0.12,
  // The load point sits this far above the ground when the car rests on it.
  restHeight: 0.7,
  hookReach: 3,
  hookHeightSlack: 2,
  hookSpeed: 1.5,
  groundFriction: 0.7,
  loadRadius: 1.2,
  setDownSpeed: 1,
  landingRadius: 12,
  dropFrom: 1,
  hitSpeed: 4,
  heavyHit: 8,
  wreckHit: 14,
  bodyRadius: 3,
});

// Masses from src/config.js where given; the packet's table fills the rest
// (helicopter only: car physics never sees these).
const PACKET_MASSES = Object.freeze({
  viper_proto: 940, falcone_heritage: 1150, falcone_f42: 1250, dusthawk_rally: 1280,
  aurora_gt: 1350, koenigsegg_jesko: 1390, stuttgart_959s: 1450, banshee_muscle: 1810, titan_monster: 4700,
});
export const CRATE = Object.freeze({id: 'crate', name: 'Crate', massKg: 500});

export function carMassKg(carId) {
  const mass = CARS[carId]?.mass ?? PACKET_MASSES[carId];
  return Number.isFinite(mass) ? mass : null;
}

// Can Kestrel One lift this car in H1?
export function liftCheck(carId) {
  const massKg = carMassKg(carId);
  if (massKg === null) return {ok: false, massKg, reason: 'Unknown car.'};
  if (carId === 'titan_monster') return {ok: false, massKg, reason: 'Too heavy for any helicopter here.'};
  if (massKg > KESTREL.hookLimitKg) return {ok: false, massKg, reason: "Needs the Lab's lift upgrade."};
  return {ok: true, massKg, reason: null};
}

const clamp = (v, lo, hi) => v < lo ? lo : v > hi ? hi : v;

// A load sitting on the ground at (x, z), ready to hook. A load may carry its
// own restHeight (the bucket's top ring rides higher than a car's roof);
// without one it uses the cable's 0.7 m.
export function createLoad({id, massKg, x = 0, z = 0, heading = 0, ground = null, restHeight}) {
  const groundY = ground ? ground.height(x, z) : 0;
  const load = {id, massKg, x, y: groundY + (restHeight ?? CABLE.restHeight), z, vx: 0, vy: 0, vz: 0, heading,
    hooked: false, onGround: true, falling: false, dropFrom: 0, settled: true};
  if (restHeight !== undefined) load.restHeight = restHeight;
  return load;
}

// The hook hangs at the end of the cable, straight below the helicopter
// while nothing is on it.
export function hookPoint(heli) {
  return {x: heli.x, y: heli.y - CABLE.length, z: heli.z};
}

// Is the hook close enough, and the helicopter slow enough, to hook this
// load with H?
export function canHook(heli, load) {
  if (load.hooked) return false;
  const hook = hookPoint(heli);
  const relSpeed = Math.hypot(heli.vx - load.vx, heli.vy - load.vy, heli.vz - load.vz);
  return Math.hypot(hook.x - load.x, hook.z - load.z) <= CABLE.hookReach &&
    Math.abs(hook.y - load.y) <= CABLE.hookHeightSlack && relSpeed <= CABLE.hookSpeed;
}

export function hook(heli, load) {
  if (!canHook(heli, load) || !(load.massKg <= KESTREL.hookLimitKg)) return {ok: false};
  load.hooked = true;
  load.falling = false;
  load.setDownDone = false;
  return {ok: true, event: {type: 'hooked', id: load.id}};
}

// H with a load on: on the ground, or up to 1 m above it, it simply lets go
// and the load settles; higher, it falls and the drop is measured from here.
export function release(load, ground = null) {
  if (!load.hooked) return {ok: false};
  load.hooked = false;
  const below = ground ? ground.height(load.x, load.z) : 0;
  const height = Math.max(0, load.y - (load.restHeight ?? CABLE.restHeight) - below);
  if (!load.onGround) {
    load.falling = true;
    load.dropFrom = height > CABLE.dropFrom ? height : 0;
  }
  if (load.onGround || height <= CABLE.dropFrom) return {ok: true, event: {type: 'released', id: load.id, dropMetres: 0}};
  return {ok: true, event: {type: 'releasedHigh', id: load.id, heightM: height}};
}

function hitClass(speed) {
  if (speed > CABLE.wreckHit) return 'cargoWreck';
  if (speed > CABLE.heavyHit) return 'cargoHeavy';
  return 'cargoLight';
}

// One step of the load. Returns {force, events}: force is the cable's pull
// on the helicopter (newtons) and supportedKg the weight it carries.
// zone: {x, z, radius} landing circle for the set-down check, or null.
export function stepCable(load, heli, {ground = null, zone = null, fallen = null} = {}, dt = HELI_STEP) {
  const events = [];
  const force = {x: 0, y: 0, z: 0};
  if (!load.hooked && load.onGround && !load.falling) return {force, events, supportedKg: 0};
  const m = load.massKg;
  let fx = 0, fy = -m * GRAVITY, fz = 0;

  if (load.hooked) {
    const dx = heli.x - load.x, dy = heli.y - load.y, dz = heli.z - load.z;
    const distance = Math.hypot(dx, dy, dz) || 1e-9;
    const ux = dx / distance, uy = dy / distance, uz = dz / distance;
    const relX = heli.vx - load.vx, relY = heli.vy - load.vy, relZ = heli.vz - load.vz;
    const stretchRate = -(relX * ux + relY * uy + relZ * uz);
    // Capped at four times the hook limit's weight, so a stretched cable
    // can never fling the load.
    // The damping is capped by the load's mass, so a light load (an empty
    // bucket, 50 kg) does not shake at the step rate; every H1 load is heavier.
    const tension = distance > CABLE.length ? Math.min(CABLE.maxTension,
      Math.max(0, CABLE.stiffness * (distance - CABLE.length) - Math.min(CABLE.damping, m / dt) * stretchRate)) : 0;
    fx += tension * ux; fy += tension * uy; fz += tension * uz;
    force.x -= tension * ux; force.y -= tension * uy; force.z -= tension * uz;
    // Swing damping: slows motion across the cable relative to the hook.
    const along = relX * ux + relY * uy + relZ * uz;
    const crossX = relX - along * ux, crossY = relY - along * uy, crossZ = relZ - along * uz;
    const damp = CABLE.swingDamping * m;
    fx += damp * crossX; fy += damp * crossY; fz += damp * crossZ;
    force.x -= damp * crossX; force.y -= damp * crossY; force.z -= damp * crossZ;
  }

  // Air drag on the load.
  const speed = Math.hypot(load.vx, load.vy, load.vz);
  fx -= CABLE.carDrag * load.vx * speed; fy -= CABLE.carDrag * load.vy * speed; fz -= CABLE.carDrag * load.vz * speed;

  // On the ground: the ground holds it up and friction (0.7 of the weight
  // left on the ground) resists sliding, so a hooked car can be dragged
  // but anchors nothing.
  if (load.onGround) {
    if (fy <= 0) {
      const grip = CABLE.groundFriction * -fy;
      fy = 0;
      load.vy = Math.max(0, load.vy);
      const slideSpeed = Math.hypot(load.vx, load.vz), push = Math.hypot(fx, fz);
      if (slideSpeed < 0.05 && push <= grip) {
        load.vx = 0; load.vz = 0; fx = 0; fz = 0;
      } else {
        const dirX = slideSpeed >= 0.05 ? load.vx / slideSpeed : fx / push, dirZ = slideSpeed >= 0.05 ? load.vz / slideSpeed : fz / push;
        fx -= grip * dirX; fz -= grip * dirZ;
        // Friction stops a slide; it never pushes the load backward.
        const nextX = load.vx + fx / m * dt, nextZ = load.vz + fz / m * dt;
        if (slideSpeed >= 0.05 && nextX * dirX + nextZ * dirZ < 0 && push <= grip) { load.vx = 0; load.vz = 0; fx = 0; fz = 0; }
      }
    } else {
      load.onGround = false;
      events.push({type: 'loadLifted', id: load.id});
    }
  }

  load.vx += fx / m * dt; load.vy += fy / m * dt; load.vz += fz / m * dt;
  load.x += load.vx * dt; load.y += load.vy * dt; load.z += load.vz * dt;

  // The car hangs nose first and turns with the air once it is moving
  // faster than a swing (5 m/s).
  const flat = Math.hypot(load.vx, load.vz);
  if (flat > 5) {
    const want = Math.atan2(load.vx, load.vz);
    load.heading += Math.atan2(Math.sin(want - load.heading), Math.cos(want - load.heading)) * Math.min(1, dt * 1.5);
  }

  const groundY = (ground ? ground.height(load.x, load.z) : 0) + (load.restHeight ?? CABLE.restHeight);
  if (!load.onGround && load.y <= groundY) {
    const impact = Math.max(0, -load.vy);
    const slide = Math.hypot(load.vx, load.vz);
    load.y = groundY;
    load.vy = 0;
    load.onGround = true;
    if (load.falling) {
      load.falling = false;
      if (load.dropFrom > CABLE.dropFrom) events.push({type: 'drop', id: load.id, dropMetres: load.dropFrom});
      else events.push({type: 'settled', id: load.id});
      load.vx = 0; load.vz = 0;
    } else {
      const hit = Math.max(impact, slide * 0.5);
      const inZone = !!zone && Math.hypot(load.x - zone.x, load.z - zone.z) <= (zone.radius ?? CABLE.landingRadius);
      if (hit > CABLE.hitSpeed) events.push({type: 'cargoHit', id: load.id, with: 'ground', speed: hit, kind: hitClass(hit)});
      else if (inZone && Math.hypot(impact, slide) <= CABLE.setDownSpeed) {
        // One set-down per hook-up: bobbing on the ground does not repeat it.
        if (!load.setDownDone) events.push({type: 'setDown', id: load.id});
        load.setDownDone = true;
      } else events.push({type: 'touched', id: load.id, inZone});
    }
  } else if (load.onGround) {
    load.y = groundY;
  }

  // Trees, buildings and rocks the load swings or slides into. A tree falls
  // and is out of the way; anything else pushes the load back out and
  // stops it going further in. One strike is charged once: a contact must
  // end before the same obstacle can be hit again.
  const fallenTrees = fallen || (load.fallenTrees ??= new Set());
  const touching = load.touching ??= new Set();
  if (ground && (!load.onGround || Math.hypot(load.vx, load.vz) > 0.5)) {
    const still = new Set();
    for (const o of ground.near(load.x, load.z, CABLE.loadRadius)) {
      const distance = Math.hypot(o.x - load.x, o.z - load.z);
      if (o.base > load.y || ground.topAt(o, distance) < load.y - 0.5) continue;
      if (o.kind === 'tree' && fallenTrees.has(o.id)) continue;
      const key = o.id ?? `${o.x}:${o.z}`;
      still.add(key);
      const hitSpeed = Math.hypot(load.vx, load.vz);
      if (!touching.has(key) && hitSpeed > CABLE.hitSpeed) {
        if (o.kind === 'tree') {
          fallenTrees.add(o.id);
          events.push({type: 'treeDown', id: o.id});
        }
        events.push({type: 'cargoHit', id: load.id, with: o.kind || 'obstacle', speed: hitSpeed, kind: hitClass(hitSpeed)});
      }
      if (o.kind === 'tree' && fallenTrees.has(o.id)) { load.vx *= 0.6; load.vz *= 0.6; continue; }
      // Push out to the obstacle's edge and cancel motion into it.
      const nx = distance > 1e-6 ? (load.x - o.x) / distance : 1, nz = distance > 1e-6 ? (load.z - o.z) / distance : 0;
      const edge = o.radius + CABLE.loadRadius;
      if (o.shape !== 'cone' && distance < edge) { load.x = o.x + nx * edge; load.z = o.z + nz * edge; }
      const inward = load.vx * nx + load.vz * nz;
      if (inward < 0) { load.vx -= inward * nx; load.vz -= inward * nz; }
    }
    for (const key of touching) if (!still.has(key)) touching.delete(key);
    for (const key of still) touching.add(key);
  } else touching.clear();

  // The load swinging up into the helicopter.
  if (load.hooked) {
    const rel = Math.hypot(heli.vx - load.vx, heli.vy - load.vy, heli.vz - load.vz);
    const gap = Math.hypot(heli.x - load.x, heli.y - load.y, heli.z - load.z);
    if (gap < CABLE.bodyRadius && rel > CABLE.hitSpeed && !load.touchingHeli) {
      load.touchingHeli = true;
      events.push({type: 'cargoHit', id: load.id, with: 'helicopter', speed: rel, kind: hitClass(rel)});
    } else if (gap >= CABLE.bodyRadius + 1) load.touchingHeli = false;
  }

  const supportedKg = load.hooked ? clamp(force.y / -GRAVITY, 0, Infinity) : 0;
  return {force, events, supportedKg};
}

// Swing angle of the cable from straight down, in radians.
export function swingAngle(load, heli) {
  const dx = load.x - heli.x, dy = load.y - heli.y, dz = load.z - heli.z;
  return Math.atan2(Math.hypot(dx, dz), Math.max(1e-9, -dy));
}
