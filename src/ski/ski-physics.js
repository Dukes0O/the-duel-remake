// The skier (docs/HELI_SKIING.md section 4). Pure and repeatable: the same
// start, inputs and ground give the same run. No graphics, no clock, no
// randomness. Metres, kilograms, seconds and degrees at the edges; radians
// inside. The skier moves at a fixed 1/120 s step like the helicopter; a
// frame of any length is run as whole steps by advanceSkier.
//
// Axes match the helicopter: y is up and is the height above sea level (the
// air thins with it), heading 0 faces +z, forward is (sin heading, cos
// heading), turning right lowers the heading, and right is (-cos heading,
// sin heading). `world.ground(x, z)` is the height of the snow there.
//
// Rules the packet leaves to the builder (SKI-RULES, 24 October 2026):
// - The skis go where they point. A grounded skier moves along the slope in
//   the direction of its heading; the edges take up any sideways pull, so a
//   traverse holds its line. Only carving or skating turns the heading.
// - The carving radius is 17 m x cos(edge) from 10 degrees of edge up (8.5 m
//   at 60). Below 10 degrees the turn eases in from nothing, so flat skis
//   run straight. A carve keeps its speed.
// - Standing still, or below 15 km/h, the skier can skate: W pushes forward
//   and A and D swing the skis round, fading out as the carve takes over.
// - Skidding replaces the snow friction with 0.4. It is the S key and it
//   stands the skier up (no tuck while skidding).
// - A finished rotation is within 30 degrees of a whole turn (0, 360, ...).
//   A half turn lands backwards and so tumbles.
// - Deep snow is the zone's business: world.extraFriction(x, z) is added to
//   the snow friction (default none).
// - A landing hill may widen the landing rule: world.safePathAngle (degrees)
//   replaces the 20 degrees for that zone (aerials: 40; see SKI-RUNS).
export const SKI_STEP = 1 / 120;
export const GRAVITY = 9.81;
const DEG = Math.PI / 180;

export const SKI = Object.freeze({
  massKg: 80,
  // Friction along the snow. Wax: the right wax is faster, the wrong wax slower.
  snowFriction: 0.05,
  wax: Object.freeze({right: 0.045, wrong: 0.06}),
  skidFriction: 0.4,
  // Effective air area (drag area, m2): force = 0.5 x air density x area x speed squared.
  standingArea: 0.6,
  tuckArea: 0.25,
  seaLevelDensity: 1.225,
  airScaleHeight: 8500,
  // Carving.
  carveRadius: 17,
  maxEdge: 60 * DEG,
  edgeEaseUntil: 10 * DEG,
  edgeRate: 240 * DEG,
  tuckEdge: 20 * DEG,
  // Skating.
  skateBelow: 15 / 3.6,
  skateAccel: 1.5,
  skateTurn: 90 * DEG,
  // Leaving the ground, popping, flying.
  liftEpsilon: 0.01,
  popSpeed: 2.0,
  spinRate: 360 * DEG,
  flipRate: 360 * DEG,
  // Landing.
  safePathAngle: 20 * DEG,
  safeRotation: 30 * DEG,
  tumbleSeconds: 3,
  // A carve or a skid is reported (for the sounds) from here.
  carveEdge: 20 * DEG,
  carveSpeed: 5,
  skidSpeed: 2,
  gradientStep: 0.2,
});

// Air density at a height above sea level, kg/m3.
export const airDensity = height => SKI.seaLevelDensity * Math.exp(-height / SKI.airScaleHeight);

// Speed where drag balances gravity on a straight slope of `angle` radians:
// the speed a long fall-line run settles at.
export function terminalSpeed({angle, height, tucked = false, friction = SKI.snowFriction}) {
  const along = Math.sin(angle) - friction * Math.cos(angle);
  if (along <= 0) return 0;
  const area = tucked ? SKI.tuckArea : SKI.standingArea;
  return Math.sqrt(2 * SKI.massKg * GRAVITY * along / (airDensity(height) * area));
}

const clamp = (v, lo, hi) => v < lo ? lo : v > hi ? hi : v;
const approach = (value, target, maxStep) => value + clamp(target - value, -maxStep, maxStep);
// Distance from an angle to the nearest whole turn, radians.
const offTurn = angle => Math.abs(angle - Math.round(angle / (2 * Math.PI)) * 2 * Math.PI);

export function createSkier({x = 0, z = 0, heading = 0, speed = 0, world, wax = null} = {}) {
  const y = world.ground(x, z);
  const skier = {
    x, y, z, vx: 0, vy: 0, vz: 0, heading, speed: 0, edge: 0,
    grounded: true, tucked: false, skidding: false, carving: false, carvingNow: false, skiddingNow: false, wax,
    tumble: 0, popHeld: false, acc: 0, time: 0,
    // The air summary: filled while airborne, read at the landing.
    air: null,
  };
  setGroundVelocity(skier, world, speed);
  return skier;
}

// The snow's normal at (x, z), pointing up and away from the slope.
function normalAt(world, x, z) {
  const h = SKI.gradientStep;
  const gx = (world.ground(x + h, z) - world.ground(x - h, z)) / (2 * h);
  const gz = (world.ground(x, z + h) - world.ground(x, z - h)) / (2 * h);
  const length = Math.hypot(gx, 1, gz);
  return {x: -gx / length, y: 1 / length, z: -gz / length};
}

// The unit vector along the snow in the direction of `heading`.
function tangentFor(n, heading) {
  const hx = Math.sin(heading), hz = Math.cos(heading);
  const dot = hx * n.x + hz * n.z;
  const tx = hx - dot * n.x, ty = -dot * n.y, tz = hz - dot * n.z;
  const length = Math.hypot(tx, ty, tz) || 1;
  return {x: tx / length, y: ty / length, z: tz / length};
}

function setGroundVelocity(skier, world, speed) {
  const n = normalAt(world, skier.x, skier.z), t = tangentFor(n, skier.heading);
  skier.speed = speed;
  skier.vx = t.x * speed; skier.vy = t.y * speed; skier.vz = t.z * speed;
}

// One fixed step. controls: {turn -1..1 (D right, A left), flip -1..1 (W
// forward, S back; in the air), skid, tuck, skate, pop}. world: {ground(x,
// z), extraFriction?(x, z), safePathAngle?}. Returns the events of the step: skiPop,
// skiLand, skiTumble, skiCarve and skiSkid (each {on}).
export function stepSkier(skier, controls, world, dt = SKI_STEP) {
  const events = [];
  const pop = controls.pop === true, popPressed = pop && !skier.popHeld;
  skier.popHeld = pop;
  skier.time += dt;
  if (skier.tumble > 0) {
    skier.tumble = Math.max(0, skier.tumble - dt);
    controls = {};
  }
  if (skier.grounded) stepGround(skier, controls, world, dt, events, popPressed);
  else stepAir(skier, controls, world, dt, events);
  return events;
}

// Run a frame of any length as whole fixed steps; the left-over time waits
// for the next frame, so 30, 60 and 144 frames a second give the same run.
export function advanceSkier(skier, controls, world, frameSeconds) {
  const events = [];
  skier.acc += Math.max(0, frameSeconds);
  while (skier.acc >= SKI_STEP - 1e-9) {
    skier.acc = Math.max(0, skier.acc - SKI_STEP);
    events.push(...stepSkier(skier, controls, world));
  }
  return events;
}

function report(skier, events, key, on, type) {
  if (skier[key] === on) return;
  skier[key] = on;
  events.push({type, on});
}

function stepGround(skier, controls, world, dt, events, popPressed) {
  const tumbling = skier.tumble > 0;
  const skidding = !tumbling && controls.skid === true;
  skier.tucked = !tumbling && controls.tuck === true && !skidding;
  const turn = tumbling ? 0 : clamp(controls.turn ?? 0, -1, 1);
  // The edge follows the keys; a tuck allows no hard turn.
  const limit = skier.tucked ? SKI.tuckEdge : SKI.maxEdge;
  skier.edge = approach(skier.edge, turn * limit, SKI.edgeRate * dt);

  const n = normalAt(world, skier.x, skier.z);
  const tangent = tangentFor(n, skier.heading);
  const extra = world.extraFriction?.(skier.x, skier.z) ?? 0;
  const base = skier.wax === 'right' ? SKI.wax.right : skier.wax === 'wrong' ? SKI.wax.wrong : SKI.snowFriction;
  const friction = skidding || tumbling ? SKI.skidFriction : base + extra;
  const area = skier.tucked ? SKI.tuckArea : SKI.standingArea;

  let speed = skier.speed;
  const drag = 0.5 * airDensity(skier.y) * area * speed * speed / SKI.massKg;
  speed += (-GRAVITY * tangent.y - friction * GRAVITY * n.y - drag) * dt;
  if (!tumbling && controls.skate === true && speed < SKI.skateBelow) speed = Math.min(SKI.skateBelow, speed + SKI.skateAccel * dt);
  speed = Math.max(0, speed);

  // Turning: the carve, and below the skating speed the swing of the skis.
  const sign = Math.sign(skier.edge);
  const ease = Math.min(1, Math.abs(skier.edge) / SKI.edgeEaseUntil);
  let rate = sign * ease * speed / (SKI.carveRadius * Math.cos(skier.edge));
  if (!tumbling && speed < SKI.skateBelow) rate += turn * SKI.skateTurn * (1 - speed / SKI.skateBelow);
  // Casual gate assist is supplied only by the run, never by the renderer.
  if (!tumbling && Number.isFinite(controls.lineAssist)) {
    rate += clamp(controls.lineAssist, -1 / 3, 1 / 3) * speed / (SKI.carveRadius * Math.cos(limit));
  }
  const half = skier.heading - rate * dt / 2;
  skier.heading -= rate * dt;

  // Move along the snow, or leave it where the ground falls away.
  const move = tangentFor(n, half);
  const vx = move.x * speed, vy = move.y * speed, vz = move.z * speed;
  const nx = skier.x + vx * dt, nz = skier.z + vz * dt;
  const ballistic = skier.y + vy * dt - 0.5 * GRAVITY * dt * dt;
  skier.carving = skier.carving && Math.abs(skier.edge) > SKI.carveEdge * 0.75 || Math.abs(skier.edge) > SKI.carveEdge;
  if (ballistic > world.ground(nx, nz) + SKI.liftEpsilon) {
    leaveGround(skier, world, nx, ballistic, nz, vx, vy - GRAVITY * dt, vz, events);
  } else {
    skier.x = nx; skier.z = nz; skier.y = world.ground(nx, nz);
    skier.speed = speed;
    skier.vx = vx; skier.vy = vy; skier.vz = vz;
    if (popPressed && !tumbling) {
      const here = normalAt(world, skier.x, skier.z);
      skier.vx += here.x * SKI.popSpeed; skier.vy += here.y * SKI.popSpeed; skier.vz += here.z * SKI.popSpeed;
      events.push({type: 'skiPop'});
      leaveGround(skier, world, skier.x, skier.y, skier.z, skier.vx, skier.vy, skier.vz, events);
    }
  }
  report(skier, events, 'carvingNow', skier.grounded && !tumbling && !skidding && skier.carving && speed > SKI.carveSpeed, 'skiCarve');
  report(skier, events, 'skiddingNow', skier.grounded && (skidding || tumbling) && speed > SKI.skidSpeed, 'skiSkid');
}

function leaveGround(skier, world, x, y, z, vx, vy, vz, events) {
  skier.grounded = false;
  skier.x = x; skier.y = y; skier.z = z; skier.vx = vx; skier.vy = vy; skier.vz = vz;
  skier.speed = Math.hypot(vx, vy, vz);
  skier.air = {startX: x, startZ: z, time: 0, peak: 0, spin: 0, flip: 0, spinMax: 0, flipMax: 0};
  report(skier, events, 'carvingNow', false, 'skiCarve');
  report(skier, events, 'skiddingNow', false, 'skiSkid');
}

function stepAir(skier, controls, world, dt, events) {
  const air = skier.air;
  skier.tucked = controls.tuck === true;
  const area = skier.tucked ? SKI.tuckArea : SKI.standingArea;
  const speed = Math.hypot(skier.vx, skier.vy, skier.vz);
  const drag = 0.5 * airDensity(skier.y) * area * speed / SKI.massKg;
  const ox = skier.vx, oy = skier.vy, oz = skier.vz;
  skier.vx -= drag * ox * dt; skier.vz -= drag * oz * dt;
  skier.vy += (-GRAVITY - drag * oy) * dt;
  // The mean of the old and new velocity, so a drag-free flight is exactly a parabola.
  skier.x += (ox + skier.vx) / 2 * dt; skier.y += (oy + skier.vy) / 2 * dt; skier.z += (oz + skier.vz) / 2 * dt;
  skier.speed = Math.hypot(skier.vx, skier.vy, skier.vz);
  // A and D spin, W and S flip.
  air.spin += clamp(controls.turn ?? 0, -1, 1) * SKI.spinRate * dt;
  air.flip += clamp(controls.flip ?? 0, -1, 1) * SKI.flipRate * dt;
  air.spinMax = Math.max(air.spinMax, Math.abs(air.spin));
  air.flipMax = Math.max(air.flipMax, Math.abs(air.flip));
  air.time += dt;
  const below = world.ground(skier.x, skier.z);
  air.peak = Math.max(air.peak, skier.y - below);
  if (skier.y <= below) land(skier, world, events);
}

function land(skier, world, events) {
  const air = skier.air;
  const n = normalAt(world, skier.x, skier.z);
  skier.y = world.ground(skier.x, skier.z);
  const speed = Math.hypot(skier.vx, skier.vy, skier.vz) || 1e-9;
  const into = -(skier.vx * n.x + skier.vy * n.y + skier.vz * n.z);
  const angle = Math.asin(clamp(into / speed, 0, 1));
  const finished = offTurn(air.spin) <= SKI.safeRotation && offTurn(air.flip) <= SKI.safeRotation;
  const window = world.safePathAngle === undefined ? SKI.safePathAngle : world.safePathAngle * DEG;
  const safe = angle <= window && finished;
  // What is kept is the speed along the snow; the push into it is absorbed.
  const keep = Math.max(0, into);
  const tx = skier.vx + n.x * keep, ty = skier.vy + n.y * keep, tz = skier.vz + n.z * keep;
  skier.grounded = true;
  skier.vx = tx; skier.vy = ty; skier.vz = tz;
  skier.speed = Math.hypot(tx, ty, tz);
  if (Math.hypot(tx, tz) > 0.1) skier.heading = Math.atan2(tx, tz);
  skier.edge = 0;
  events.push({type: 'skiLand', safe, impact: keep, angle: angle / DEG, airTime: air.time, height: air.peak,
    distance: Math.hypot(skier.x - air.startX, skier.z - air.startZ),
    spin: air.spin / DEG, flip: air.flip / DEG, spinMax: air.spinMax / DEG, flipMax: air.flipMax / DEG});
  if (!safe) {
    skier.tumble = SKI.tumbleSeconds;
    events.push({type: 'skiTumble'});
  }
  skier.air = null;
}

// The skier as the sounds, the camera and the score read it.
export function skierView(skier, world) {
  return Object.freeze({
    x: skier.x, y: skier.y, z: skier.z, heading: skier.heading, speed: skier.speed, edge: skier.edge / DEG,
    grounded: skier.grounded, tucked: skier.tucked, skidding: skier.skiddingNow, carving: skier.carvingNow,
    tumbling: skier.tumble > 0, tumbleLeft: skier.tumble,
    height: skier.grounded ? 0 : skier.y - world.ground(skier.x, skier.z),
    spin: skier.air ? skier.air.spin / DEG : 0, flip: skier.air ? skier.air.flip / DEG : 0,
  });
}

// A short text of the run, to compare two runs exactly.
export function skierFingerprint(skier) {
  const f = value => Number(value).toFixed(6);
  return [skier.x, skier.y, skier.z, skier.vx, skier.vy, skier.vz, skier.heading, skier.edge, skier.tumble]
    .map(f).join('|') + `|${skier.grounded}`;
}
