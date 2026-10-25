// The water bucket (docs/HELI_FIRE.md sections 5 and 6): an H1 cable load
// whose mass is the bucket plus its water, so the pendulum, drag, set-down
// and hits all apply unchanged. It fills on a lake, leaks when damaged, and
// pours in 25 litre parcels that fall, slow to spray and drift with the
// wind. Pure and repeatable, step 1/120 s like the flight. It hands wet
// patches [{x, z, litres, radius}] to heli-fire.js through applyWater and
// never imports it.
import {GRAVITY, HELI_STEP} from './heli-flight.js';
import {CABLE, createLoad} from './heli-cable.js';

export const BUCKET = Object.freeze({
  id: 'bucket', emptyKg: 50, litres: 600,
  // The model hangs 3.8 m below the hook: 2.5 m of rigging, 1.3 m of body.
  hang: 3.8,
  fillRate: 100, fullDepth: 1, minDepth: 0.3,
  slowSpeed: 5, fastSpeed: 10, waterDrag: 2000,
  pourRate: 400, parcelLitres: 25, fallSpeed: 9,
  wideBase: 2, widePerMetre: 0.12, keepAllBelow: 30, sprayBy: 90, sprayKeeps: 0.4,
  // By damage 0 to 3: whole, dented, torn, ruined.
  holds: Object.freeze([600, 450, 300, 0]),
  leaks: Object.freeze([0, 3, 8, 0]),
});
export const DROP_AIM_RINGS = Object.freeze([12, 8, 5, 0]);
export const DAMAGE_NAMES = Object.freeze(['whole', 'dented', 'torn', 'ruined']);
// The H1 cargo hit classes: light 4 to 8 m/s dents, heavy 8 to 14 tears, over 14 ruins.
export const HIT_DAMAGE = Object.freeze({cargoLight: 1, cargoHeavy: 2, cargoWreck: 3});
const AIR_DRAG = GRAVITY / BUCKET.fallSpeed ** 2;
const clamp = (v, lo, hi) => v < lo ? lo : v > hi ? hi : v;

// The bucket fitted at the pad: a load already on the hook, resting where
// the hook hangs. Its load point is the top ring, 3.8 m above the bucket's
// bottom, so on the ground the ring sits 3.8 m up.
// litres: the Lab's Bigger bucket (800); left out, the plain 600-litre bucket, which gets no `litres` field.
export function createBucket({damage = 0, x = 0, z = 0, heading = 0, ground = null, litres = BUCKET.litres} = {}) {
  const load = createLoad({id: BUCKET.id, massKg: BUCKET.emptyKg, x, z, heading, ground, restHeight: BUCKET.hang});
  Object.assign(load, {hooked: true, bucket: true, water: 0, damage: clamp(damage | 0, 0, 3),
    pouring: false, poured: 0, filling: 0, dipped: false, dentedThisDip: false, announcedFull: false, parcels: []});
  if (litres !== BUCKET.litres && Number.isFinite(litres) && litres > 0) load.litres = litres;
  return load;
}

// What this bucket holds by damage; a bigger bucket holds the same share more.
export const bucketHolds = bucket => bucket.litres ? BUCKET.holds[bucket.damage] * bucket.litres / BUCKET.litres : BUCKET.holds[bucket.damage];
// The Lab's Retardant tank: a 600-litre load, filled only at the home pad (heli-session.js loadBucket). While it is
// aboard `bucket.contents` is 'retardant'; it falls like water and its patches say so. Lakes never refill it, and
// once it is emptied the bucket is a water bucket again.
export const RETARDANT_LITRES = 600;

// Sets the water aboard (kept within what the bucket holds) and the mass the
// cable reads each step.
export function setBucketWater(bucket, litres) {
  bucket.water = clamp(litres, 0, bucketHolds(bucket));
  bucket.massKg = BUCKET.emptyKg + bucket.water;
  return bucket.water;
}

// Words for the instruments (section 6.1): full, half, low or empty; ruined
// when it holds nothing. Measured against what this bucket can hold.
export function bucketWords(bucket) {
  const holds = bucketHolds(bucket);
  if (holds <= 0) return 'ruined';
  if (bucket.water <= 1) return 'empty';
  const share = bucket.water / holds;
  return share >= 0.9 ? 'full' : share >= 0.4 ? 'half' : 'low';
}

// Damage only gets worse until it is repaired. Returns true when it changed.
export function damageBucket(bucket, level) {
  if (!(level > bucket.damage)) return false;
  bucket.damage = clamp(level | 0, 0, 3);
  setBucketWater(bucket, bucket.water);
  return true;
}

// An H1 cargoHit event from stepCable for the bucket: returns the new damage.
// No credits are charged (the bucket carries less until it is repaired).
export function bucketHit(bucket, event) {
  if (event?.type === 'cargoHit' && (event.id === undefined || event.id === bucket.id)) damageBucket(bucket, HIT_DAMAGE[event.kind] ?? 0);
  return bucket.damage;
}

// The share of a parcel's water that reaches the ground from a fall.
export function keptShare(fall) {
  if (fall <= BUCKET.keepAllBelow) return 1;
  if (fall >= BUCKET.sprayBy) return BUCKET.sprayKeeps;
  return 1 - (1 - BUCKET.sprayKeeps) * (fall - BUCKET.keepAllBelow) / (BUCKET.sprayBy - BUCKET.keepAllBelow);
}
export const wetRadius = fall => BUCKET.wideBase + BUCKET.widePerMetre * Math.max(0, fall);

// What water lands on: the ground, or over forest the tree tops.
const landingHeight = (ground, x, z) => ground ? ground.highest(x, z, 0) : 0;

// One step of a falling parcel: gravity and air drag against the moving air.
function fall(parcel, wind, dt) {
  const wx = wind?.toward ? wind.toward.x * wind.speed : 0, wz = wind?.toward ? wind.toward.z * wind.speed : 0;
  const rx = parcel.vx - wx, ry = parcel.vy, rz = parcel.vz - wz, speed = Math.hypot(rx, ry, rz);
  parcel.vx -= AIR_DRAG * rx * speed * dt;
  parcel.vy -= (GRAVITY + AIR_DRAG * ry * speed) * dt;
  parcel.vz -= AIR_DRAG * rz * speed * dt;
  parcel.x += parcel.vx * dt; parcel.y += parcel.vy * dt; parcel.z += parcel.vz * dt;
}

// Where water let go from here would land (the aim ring's centre): the same
// parcel model run forward from the bucket's bottom, position and speed.
// Returns {x, z, y, fall, seconds} or null if it never lands. dt 1/60 is
// plenty for a drawn ring; pass HELI_STEP to match a pour exactly.
// The ring marks the middle of the water (section 6.1): the bucket keeps
// moving while it empties, so the middle parcel leaves from half a pour on.
export function aimPoint(bucket, {ground = null, wind = null, dt = 1 / 60} = {}) {
  const lead = Math.max(0, bucket.water ?? 0) / BUCKET.pourRate / 2;
  const parcel = {x: bucket.x + bucket.vx * lead, y: bucket.y - BUCKET.hang, z: bucket.z + bucket.vz * lead,
    vx: bucket.vx, vy: bucket.vy, vz: bucket.vz};
  const start = parcel.y;
  for (let t = dt; t < 40; t += dt) {
    fall(parcel, wind, dt);
    const floor = landingHeight(ground, parcel.x, parcel.z);
    if (parcel.y <= floor) return {x: parcel.x, z: parcel.z, y: floor, fall: start - floor, seconds: t};
  }
  return null;
}

// Is the ring's centre over a burning cell? isBurning(x, z) comes from the
// fire; this file never imports it.
export const aimLocked = (aim, isBurning) => !!aim && !!isBurning(aim.x, aim.z);
// The ring's radius for a saved lesson tier (0 is the first, biggest ring).
export const aimRingRadius = (tier = 0) => DROP_AIM_RINGS[clamp(tier | 0, 0, DROP_AIM_RINGS.length - 1)];

// One step of the bucket, before stepCable moves it. env: {ground, wind
// {speed, toward: {x, z}}, pour}. The water surface comes from ground.water.
// Returns {events, patches}.
export function stepBucket(bucket, {ground = null, wind = null, pour = false} = {}, dt = HELI_STEP) {
  const events = [], patches = [];
  const retardant = bucket.contents === 'retardant';
  const bottom = bucket.y - BUCKET.hang;
  const surface = ground?.water ? ground.water(bucket.x, bucket.z) : null;
  const depth = surface === null || surface === undefined ? -Infinity : surface - bottom;
  const speed = Math.hypot(bucket.vx, bucket.vz);
  bucket.filling = 0;
  if (depth > 0) {
    if (!bucket.dipped) { bucket.dipped = true; bucket.dentedThisDip = false; events.push({type: 'bucketDip'}); }
    // Dragging the bucket through the water pulls it back.
    if (speed > BUCKET.slowSpeed) {
      const pull = Math.min(BUCKET.waterDrag * speed, CABLE.maxTension), slow = Math.min(speed, pull / bucket.massKg * dt);
      bucket.vx -= bucket.vx / speed * slow; bucket.vz -= bucket.vz / speed * slow;
    }
    // Too fast: no filling and one light hit per dip.
    if (speed > BUCKET.fastSpeed && !bucket.dentedThisDip) {
      bucket.dentedThisDip = true;
      events.push({type: 'bucketFast', speed});
      if (damageBucket(bucket, HIT_DAMAGE.cargoLight)) events.push({type: 'bucketDamaged', damage: bucket.damage, cause: 'water'});
    }
    if (depth >= BUCKET.minDepth - 1e-9 && speed <= BUCKET.fastSpeed && bucket.water < bucketHolds(bucket) && !retardant) {
      const rate = BUCKET.fillRate * Math.min(1, depth / BUCKET.fullDepth) * (speed > BUCKET.slowSpeed ? 0.5 : 1);
      setBucketWater(bucket, bucket.water + rate * dt);
      bucket.filling = rate;
    }
  } else if (bucket.dipped) bucket.dipped = false;
  // A damaged bucket leaks wherever it is.
  const leak = BUCKET.leaks[bucket.damage];
  if (leak > 0 && bucket.water > 0) setBucketWater(bucket, bucket.water - leak * dt);
  const holds = bucketHolds(bucket);
  if (holds > 0 && bucket.water >= holds - 0.5 && !bucket.announcedFull) { bucket.announcedFull = true; events.push({type: 'bucketFull', litres: bucket.water}); }
  else if (bucket.announcedFull && bucket.water < holds - 5) bucket.announcedFull = false;

  // Pouring: 400 litres a second while held, in parcels of 25 that start at
  // the bucket's bottom with its position and speed.
  const pouring = !!pour && bucket.water > 0;
  if (pouring !== bucket.pouring) events.push({type: pouring ? 'pourStart' : 'pourStop', ...(retardant ? {retardant: true} : {})});
  bucket.pouring = pouring;
  if (pouring) {
    const out = Math.min(bucket.water, BUCKET.pourRate * dt);
    bucket.poured += out;
    setBucketWater(bucket, bucket.water - out);
    if (bucket.water < 1e-9) setBucketWater(bucket, 0);
  }
  // A parcel goes at 25 litres. Closing the valve or running dry lets the
  // last, smaller parcel go.
  while (bucket.poured >= BUCKET.parcelLitres - 1e-9 || (bucket.poured > 1e-6 && (!pouring || bucket.water <= 0))) {
    const litres = Math.min(BUCKET.parcelLitres, bucket.poured);
    bucket.poured = bucket.poured - litres < 1e-6 ? 0 : bucket.poured - litres;
    bucket.parcels.push({x: bucket.x, y: bottom, z: bucket.z, vx: bucket.vx, vy: bucket.vy, vz: bucket.vz, litres, from: bottom, ...(retardant ? {retardant: true} : {})});
  }

  // Falling water. A parcel lands where its path meets the ground or the
  // tree tops, and becomes a wet patch.
  const still = [];
  for (const parcel of bucket.parcels) {
    fall(parcel, wind, dt);
    const floor = landingHeight(ground, parcel.x, parcel.z);
    if (parcel.y > floor) { still.push(parcel); continue; }
    const drop = Math.max(0, parcel.from - floor);
    patches.push({x: parcel.x, z: parcel.z, litres: parcel.litres * keptShare(drop), radius: wetRadius(drop), ...(parcel.retardant ? {retardant: true} : {})});
  }
  bucket.parcels = still;
  if (retardant && bucket.water <= 0) delete bucket.contents;
  return {events, patches};
}

// ---- gear: the fire service skin (docs/HELI_WILDLIFE.md section 5.3) --------
// gear is the worn gear's numbers (heli-skins.js gearStats); with the base kit,
// or none, the panel keeps its words and there is no sight dot.

// What the panel says about the water aboard. Always the words; with the water
// gauge worn (gear.litreGauge) also the litres, and the text is the litres
// instead of the words. capacity is what this bucket can hold now.
export function bucketReading(bucket, gear) {
  const words = bucketWords(bucket), capacity = bucketHolds(bucket);
  if (gear?.litreGauge !== true) return {words, litres: null, capacity, text: words};
  const litres = Math.round(bucket.water);
  return {words, litres, capacity, text: `${litres} L`};
}

// The drop sight (gear.dropSight): a dot at the exact centre of the aim ring,
// {x, z}, or null when the sight is not worn or there is no water to drop.
export function dropSightDot(bucket, gear, env = {}) {
  if (gear?.dropSight !== true || !(bucket.water > 0)) return null;
  const point = aimPoint(bucket, env);
  return point ? {x: point.x, z: point.z} : null;
}
