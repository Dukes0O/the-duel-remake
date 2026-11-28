// TOWN-VEHICLES: draws the player's work vehicle from its truck model in place of the garage car's body.
// It reads state and never writes it. It draws only while `wasteland-town` is on and the World Job's player has a
// work vehicle; otherwise it removes what it drew and leaves the garage car exactly as the renderer made it.
// The truck takes the garage car's pose for the frame (position, heading, pitch, roll, bounce), so every pose rule
// the renderer already has applies to it too.
// TOWN-HAUL-JOB: on a haul, the pieces on the bed are drawn as a stack that grows as the gang loads and shrinks as
// pieces fall, and every piece thrown off lies on the ground where it fell until the job ends.
// TOWN-HAUL-LOAD-LOOK: each piece is drawn as what it is (src/town/view/haul-load-look.js), on the bed and on the ground.
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {workVehicleDefinition} from '../work-vehicles.js';
import {createWaterStreamView} from '../../arsenal/water-stream-view.js';
import {createHaulLoadLook, stackHaulPieces} from './haul-load-look.js';
import {scablandsSurfaceHeightAt} from '../../world/scablands-ground.js';
import {createGroundShade} from '../../world/scrap-look.js';
import {createDrillView} from '../../machines/drill-view.js';

const MODEL_FOLDER = '/assets/models/wasteland/town/';
// Wheel centres stand 0.52 to 0.57 m up on the models, which is their radius.
const WHEEL_RADIUS_M = 0.54;
const MPH_TO_MPS = 0.44704;
// The truck is drawn on its own layer, which the main camera sees and the rear-view mirror's camera does not:
// the mirror sits inside the cab, where a garage car is hidden for the same reason.
export const WORK_VEHICLE_LAYER = 7;
const ALONG_Y = new THREE.Vector3(0, 1, 0), ALONG_X = new THREE.Vector3(1, 0, 0);
// GLTFLoader takes the colons out of node names and keeps the model's own name in userData.name.
const modelName = object => object.userData?.name ?? object.name;

// TOWN-HAUL-LOAD-LOOK: a piece lifted on comes down onto the stack in SETTLE_SECONDS, and a piece thrown off takes
// TUMBLE_SECONDS to reach the ground. Both are drawing only: the rules have already moved the piece.
const SETTLE_SECONDS = .3, SETTLE_METRES = .45, TUMBLE_SECONDS = .7;
/** The haul step's pieces on the bed and on the ground, or null when no haul is being driven. Reads only. */
export function haulPiecesToDraw(state) {
  const job = state?.arena?.worldJob?.job, step = job?.steps?.[job.stepIndex];
  if (step?.kind !== 'haul') return null;
  return {good:step.good, load:job.stepState?.load ?? [], shed:job.stepState?.shed ?? []};
}

// TOWN-FIRE-JOB: while the fire truck sprays, the water's arc from the cannon on its roof to the flames it is aimed at. Reads only.
// TOWN-FIRE-STREAM-LOOK: with the building's id and how hard its fire is burning (0 to 1), for the steam the water throws.
export function douseJetToDraw(state) {
  const job = state?.arena?.worldJob?.job, step = job?.steps?.[job.stepIndex];
  if (step?.kind !== 'douse' || job.stepState?.spraying !== true) return null;
  const building = (step.buildings ?? []).find(row => row.id === job.stepState.targetId);
  // A fire call holds its last state while its closing lines are said: water on a fire that is out is not drawn.
  if (building && job.stepState.fires?.[building.id]?.state !== 'burning') return null;
  return building ? {id:building.id, x:building.x, z:building.z, halfX:building.halfX, halfZ:building.halfZ,
    heat:job.stepState.fires?.[building.id]?.heat ?? 0} : null;
}
/** The fires of a fire call by building id ({state, heat}), or null when no fire call is being driven. Reads only. */
export function douseFiresToDraw(state) {
  const job = state?.arena?.worldJob?.job, step = job?.steps?.[job.stepIndex];
  return step?.kind === 'douse' ? job.stepState?.fires ?? null : null;
}

// WEAPON-WATER-CANNON: where the fire truck's stream lands on a car ({x, z}), when it is on one (src/arena/modes/world-job.js).
export const truckStreamToDraw = state => state?.arena?.mode === 'world-job' && state.arena.worldJob?.truckStream?.to || null;

export function workVehicleToDraw(state, flags) {
  if (state?.arena?.mode !== 'world-job') return null;
  const worldJob = state.arena.worldJob;
  // HOME-GROUND-3: Tin Town's flatbed on an open outing is drawn with Home Ground's switch alone.
  const homeMachine = flags?.enabled?.('home-ground') === true && worldJob?.definition?.id === 'open-roam' &&
    ['flatbed', 'drill'].includes(worldJob?.vehicle?.id);
  if (worldJob?.vehicle?.id === 'drill' && !homeMachine) return null;
  if (flags?.enabled?.('wasteland-town') !== true && !homeMachine) return null;
  return worldJob?.vehicle ?? null;
}

export function createWorkVehicleView({loadModel = url => new GLTFLoader().loadAsync(url).then(result => result.scene)} = {}) {
  const files = new Map();
  let shown = null;

  function modelFile(name) {
    if (!files.has(name)) {
      const entry = {status:'loading', scene:null};
      files.set(name, entry);
      loadModel(MODEL_FOLDER + name).then(scene => { entry.scene = scene; entry.status = 'ready'; },
        () => { entry.status = 'error'; });
    }
    return files.get(name);
  }

  const findModelNode = (root, name) => {
    let found = null;
    root.traverse(object => { if (!found && modelName(object) === name) found = object; });
    return found;
  };

  function build(vehicle, source) {
    const definition = workVehicleDefinition(vehicle.id), node = findModelNode(source, definition.model.node);
    if (!node) return null;
    const body = node.clone(true);
    body.position.set(0, 0, 0);
    // The models face along -z; the renderer's cars face along +z.
    const drill = vehicle.id === 'drill' ? createDrillView(body) : null;
    const turned = drill?.root ?? new THREE.Group();
    if (!drill) { turned.rotation.y = Math.PI; turned.add(body); }
    const group = new THREE.Group();
    group.name = `work-vehicle:${vehicle.id}`;
    group.add(turned);
    const hidden = new Set(definition.model.hide ?? []), loadNode = definition.tools.bed?.modelNode ?? null;
    const steers = [], spins = [];
    body.traverse(object => {
      const name = modelName(object);
      object.layers.set(WORK_VEHICLE_LAYER);
      if (hidden.has(name)) object.visible = false;
      if (object.isMesh) { object.castShadow = true; object.receiveShadow = true; }
      // A front wheel is a steering node holding a rolling node: the first only turns, the second only rolls.
      if (name.includes(':steer-')) steers.push({object, base:object.quaternion.clone()});
      if (name.includes(':spin-')) spins.push({object, base:object.quaternion.clone()});
    });
    // The lowest point of the truck's wheels, in its own frame: the renderer stands a car on its lowest wheel point.
    turned.updateMatrixWorld(true);
    const tyres = new THREE.Box3();
    for (const wheel of [...steers, ...spins]) tyres.expandByObject(wheel.object);
    // The bed: the box of the model's own load (hidden on the flatbed), in the turned frame, where a stack is put.
    const bedNode = loadNode ?? (definition.model.hide ?? []).find(name => name.endsWith(':load')) ?? null;
    const bedObject = bedNode ? findModelNode(body, bedNode) : null;
    const bedBox = bedObject ? new THREE.Box3().setFromObject(bedObject) : null;
    if (bedBox) { const inverse = turned.matrixWorld.clone().invert(); bedBox.applyMatrix4(inverse); }
    // The model's load is a heap behind the cab; the deck itself runs from the heap's front edge for the bed's own length.
    const deck = definition.tools.bed;
    if (bedBox && deck?.lengthM > 0 && deck.widthM > 0) {
      const middle = (bedBox.min.x + bedBox.max.x) / 2;
      bedBox.min.x = middle - deck.widthM / 2; bedBox.max.x = middle + deck.widthM / 2; bedBox.max.z = bedBox.min.z + deck.lengthM - .1;
    }
    const stack = new THREE.Group();
    stack.name = 'haul-stack';
    turned.add(stack);
    return {id:vehicle.id, group, turned, drill, body, contactY:tyres.isEmpty() ? 0 : tyres.min.y, steers, spins,
      bedBox:bedBox && !bedBox.isEmpty() ? bedBox : null, stack, stackKey:'', stackIds:null,
      load:loadNode ? findModelNode(body, loadNode) : null,
      maxSteer:definition.maxSteerDeg * Math.PI / 180, roll:0, clock:null};
  }

  // Pieces lying where they fell, by piece id; kept until the job ends.
  const look = createHaulLoadLook({layer:WORK_VEHICLE_LAYER});
  const fallen = new Map();
  let fallenSeen = false;
  const seedOf = id => [...String(id)].reduce((total, char) => (total * 31 + char.charCodeAt(0)) >>> 0, 7);
  const share = (seed, salt) => ((Math.imul(seed ^ salt, 2654435761) >>> 0) % 10007) / 10007;
  // The ground a fallen piece has scuffed: a soft dark patch under it, which also sets it apart from pale ground.
  const scuff = createGroundShade(), scuffShape = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
  function clearFallen() {
    for (const entry of fallen.values()) { look.release(entry.mesh); entry.shade?.removeFromParent(); }
    fallen.clear();
    fallenSeen = false;
  }
  // The stack: each piece laid on the lowest place it fits, along the bed or across it, tilted where it rests on an uneven
  // stack. A piece's place depends only on the pieces under it, so the stack keeps its shape as it grows and as it sheds.
  function drawStack(pieces, clock) {
    if (!shown) return;
    const key = pieces?.load.map(piece => piece.id).join(',') ?? '';
    if (key !== shown.stackKey || shown.stackIds === null) {
      const first = shown.stackIds === null, before = new Set(shown.stackIds ?? []);
      for (const mesh of [...shown.stack.children]) look.release(mesh);
      shown.stackKey = key; shown.stackIds = pieces?.load.map(piece => piece.id) ?? [];
      if (pieces && shown.bedBox) {
        const box = shown.bedBox, bed = {across:box.max.x - box.min.x, along:box.max.z - box.min.z};
        const poses = stackHaulPieces(pieces.load.map(piece => ({id:piece.id, ...look.sizeOf(piece)})), bed);
        pieces.load.forEach((piece, index) => {
          const mesh = look.piece(piece, pieces.good), pose = poses[index];
          // A piece's length is its own x. Along the bed that is the truck's z; `turned` lays it end for end.
          const yaw = (pose.cross ? 0 : Math.PI / 2) + (pose.turned ? Math.PI : 0) + pose.yaw;
          mesh.rotation.set(0, yaw, Math.atan(pose.slope * (pose.cross ? Math.cos(yaw) : -Math.sin(yaw))), 'YZX');
          mesh.position.set((box.min.x + box.max.x) / 2 + pose.x, box.min.y + pose.y, (box.min.z + box.max.z) / 2 + pose.z);
          mesh.userData.restY = mesh.position.y;
          // Lifted on just now: it comes down the last half metre onto the stack. A stack first seen whole is not dropped.
          mesh.userData.landed = first || before.has(piece.id) ? -Infinity : clock;
          shown.stack.add(mesh);
        });
      }
    }
    for (const mesh of shown.stack.children) {
      const t = (clock - mesh.userData.landed) / SETTLE_SECONDS;
      mesh.position.y = mesh.userData.restY + (t >= 0 && t < 1 ? SETTLE_METRES * (1 - t) * (1 - t) : 0);
    }
  }
  // A piece thrown off lies beside the road, clear of the truck's wheels: out to one side of where the truck was, ahead of it
  // after a hard knock (the truck stopped and the load did not) and behind it when rough ground shook it loose. It lies on the
  // ground's own slope, and it is the piece it was: a bundle that has burst lies spread out.
  const offset = new THREE.Vector3(), normal = new THREE.Vector3(), slopeTurn = new THREE.Quaternion(), yawTurn = new THREE.Quaternion();
  const propTurn = new THREE.Quaternion(), propAngles = new THREE.Euler();
  // The ground as it is drawn (the Scablands' own drawn ground stands a little off the rules' ground on sand and dunes),
  // so that a thin piece is neither buried nor left in the air.
  let land = null;
  const findLand = scene => { if (land?.parent !== scene) land = scene.children.find(child => typeof child.userData?.drawnGroundHeightAt === 'function') ?? null; };
  const groundAt = (x, z, fallback) => {
    const drawn = land?.userData.drawnGroundHeightAt?.(x, z), y = Number.isFinite(drawn) ? drawn : scablandsSurfaceHeightAt(x, z);
    return Number.isFinite(y) ? y : fallback;
  };
  function drawFallen(scene, pieces, player, clock) {
    if (pieces?.shed.length) findLand(scene);
    for (const piece of pieces?.shed ?? []) {
      if (fallen.has(piece.id)) continue;
      const mesh = look.piece(piece, pieces.good, {fallen:true}), seed = seedOf(piece.id), size = mesh.userData.size;
      const side = share(seed, 11) < .5 ? -1 : 1, reach = Math.max(size.length, size.width) / 2;
      // Pieces thrown off together land one after another along the road, not in one heap.
      const along = 1.5 + (fallen.size * 2.6 + share(seed, 37) * 1.6) % 7.8;
      offset.set(side * (1.7 + size.width / 2 + reach * .5 + share(seed, 23) * .9), 0, (piece.cause === 'rough' ? -1 : 1) * along)
        .applyQuaternion(player.quaternion);
      const x = (Number.isFinite(piece.x) ? piece.x : player.position.x) + offset.x;
      const z = (Number.isFinite(piece.z) ? piece.z : player.position.z) + offset.z, flat = player.position.y;
      normal.set(groundAt(x - .8, z, flat) - groundAt(x + .8, z, flat), 1.6, groundAt(x, z - .8, flat) - groundAt(x, z + .8, flat)).normalize();
      slopeTurn.setFromUnitVectors(ALONG_Y, normal);
      // Long pieces lie roughly along the road, so that none reaches back under the truck.
      offset.set(0, 0, 1).applyQuaternion(player.quaternion);
      yawTurn.setFromAxisAngle(ALONG_Y, Math.atan2(offset.x, offset.z) + Math.PI / 2 + (share(seed, 51) - .5) * 1.1);
      // A flat piece seldom lands flat: it lies propped on one edge or one end.
      const flatPiece = size.height < .3 && size.width < 1.3, lean = flatPiece ? (share(seed, 91) - .5) * .5 : 0;
      propTurn.setFromEuler(propAngles.set(lean, 0, flatPiece ? (share(seed, 97) - .5) * .12 : 0));
      const lift = Math.abs(Math.sin(lean)) * size.width / 2;
      // It leaves from over the bed, where it was. The truck faces the other way from its model (see `build`).
      const bed = shown?.bedBox, from = new THREE.Vector3(0, (bed?.min.y ?? 1.2) + 1, bed ? -(bed.min.z + bed.max.z) / 2 : 0)
        .applyQuaternion(player.quaternion).add(player.position);
      scene.add(mesh);
      const shade = new THREE.Mesh(scuffShape, scuff);
      shade.name = 'haul-piece-scuff'; shade.layers.set(WORK_VEHICLE_LAYER); shade.renderOrder = -1; shade.visible = false;
      shade.scale.set(size.length + 1.2, 1, size.width + 1.2);
      shade.quaternion.copy(slopeTurn).multiply(yawTurn); shade.position.set(x, groundAt(x, z, flat) + .04, z);
      scene.add(shade);
      fallen.set(piece.id, {mesh, shade, from, to:new THREE.Vector3(x, groundAt(x, z, flat) + .01 + lift, z), end:slopeTurn.clone().multiply(yawTurn).multiply(propTurn),
        spin:new THREE.Vector3(share(seed, 61) - .5, share(seed, 67) - .5, share(seed, 71) - .5).normalize(),
        turns:(1 + share(seed, 83)) * Math.PI, thrown:fallenSeen ? clock : -Infinity, done:false});
    }
    if (pieces) fallenSeen = true;
    for (const entry of fallen.values()) {
      if (entry.done) continue;
      const t = Math.min(1, Math.max(0, (clock - entry.thrown) / TUMBLE_SECONDS));
      entry.mesh.position.lerpVectors(entry.from, entry.to, t);
      entry.mesh.position.y += 1.1 * 4 * t * (1 - t);
      entry.mesh.quaternion.setFromAxisAngle(entry.spin, entry.turns * (1 - t) * (1 - t)).premultiply(entry.end);
      entry.done = t >= 1;
      entry.shade.visible = entry.done;
    }
  }

  // The jet: water from the cannon to the nearest side of the flames. The look is the one every water cannon shares
  // (src/arsenal/water-stream-view.js, WEAPON-WATER-CANNON). With no flames in front, the stream may be on a car
  // (truckStreamToDraw): then it lands on that car.
  // TOWN-FIRE-STREAM-LOOK: the rules give the side of the building's plot the water lands on. The building drawn on that plot
  // is smaller than the plot and is not a box, so the jet is carried on along its own line, across the plot, to the first
  // thing of the town it meets (a wall, a post, a roof), and that is the surface it wets. When the fire it was on goes out, the stream throws its cloud.
  const CANNON = new THREE.Vector3(0, 3.1, 2.2);
  const jet = createWaterStreamView({name:'fire-truck-jet', layer:WORK_VEHICLE_LAYER});
  const from = new THREE.Vector3(), to = new THREE.Vector3(), aim = new THREE.Vector3(), facing = new THREE.Vector3();
  const ray = new THREE.Raycaster(), probe = new THREE.Vector3(), probeX = new THREE.Vector3(), probeY = new THREE.Vector3();
  let townArt = null, found = {key:'', at:-Infinity, point:null, normal:null, wall:false}, sprayed = null;
  // The daylight, read from the colour of the air: water and steam are drawn without the scene's lamps, so they are taken
  // down by hand at night (docs/ART_LINE.md, "Unlit things glow at night").
  const daylight = scene => {
    const air = scene.fog?.color;
    return air ? Math.max(.28, Math.min(1, (air.r + air.g + air.b) / 3 / .3)) : 1;
  };
  function surface(scene, clock, across) {
    const key = [from.x, from.z, to.x, to.z].map(value => Math.round(value * 2)).join(':');
    if (key === found.key || Math.abs(clock - found.at) < .25) return found;
    found = {key, at:clock, point:null, normal:null, wall:false};
    if (!townArt?.parent) townArt = scene.getObjectByName('Town roads, sites and buildings') ?? null;
    if (!townArt) return found;
    const first = (target, least, further = across) => {
      aim.subVectors(target, from);
      const reach = aim.length();
      ray.set(from, aim.normalize()); ray.near = 2; ray.far = reach + further;
      // Anything solid counts, cloth and glass too (they write depth); flames, smoke and light cards do not.
      return ray.intersectObject(townArt, true).find(row => row.face && row.object.isMesh && row.object.visible &&
        row.object.material?.depthWrite !== false && row.distance > reach - least) ?? null;
    };
    const hit = first(to, 5);
    if (!hit) return found;
    found.point = hit.point.clone();
    found.normal = hit.face.normal.clone().transformDirection(hit.object.matrixWorld);
    if (found.normal.dot(aim) > 0) found.normal.negate();
    // A wall is wide and tall: four more lines of sight, to points round the first, must end on the same face. A post, a rail
    // or the edge of a roof fails this, and then the water wets the ground under it and no wall.
    probeX.crossVectors(ALONG_Y, found.normal).normalize(); probeY.crossVectors(found.normal, probeX).normalize();
    let same = 0;
    for (const [x, y] of [[.8, 0], [-.8, 0], [0, .7], [0, -.7]]) {
      const near = first(probe.copy(found.point).addScaledVector(probeX, x).addScaledVector(probeY, y), 1.5, 1.5);
      if (near && Math.abs(probe.subVectors(near.point, found.point).dot(found.normal)) < .35) same++;
    }
    found.wall = same >= 3 && found.normal.y < .8;
    return found;
  }
  function drawJet(scene, player, target, onCar, fires, clock) {
    const light = daylight(scene);
    // The fire the water was on has gone out: its last steam, thrown from where the water was landing.
    if (sprayed && fires?.[sprayed.id]?.state === 'out') { jet.burst(scene, sprayed.at, clock, light); sprayed = null; }
    if (!fires) sprayed = null;
    if (!target && !onCar) { jet.rest(clock); return; }
    findLand(scene);
    from.copy(CANNON).applyQuaternion(player.quaternion).add(player.position);
    if (!target) { jet.draw(scene, from, to.set(onCar.x, player.position.y + 1, onCar.z), clock, {light}); return; }
    to.set(Math.max(target.x - target.halfX, Math.min(target.x + target.halfX, from.x)), player.position.y + 2,
      Math.max(target.z - target.halfZ, Math.min(target.z + target.halfZ, from.z)));
    const drawn = surface(scene, clock, 2 * Math.max(target.halfX, target.halfZ));
    if (drawn.point) to.copy(drawn.point);
    else {
      // Nothing of the building stands in the water's way (an open frame): it falls to the ground towards the plot's middle.
      facing.set(target.x - to.x, 0, target.z - to.z);
      to.addScaledVector(facing, Math.min(1, 4 / Math.max(.01, facing.length())));
      to.setY(groundAt(to.x, to.z, player.position.y) + .1);
    }
    sprayed = {id:target.id, at:to.clone()};
    if (drawn.wall) jet.draw(scene, from, to, clock, {wall:drawn.normal, heat:target.heat, light});
    else jet.draw(scene, from, to, clock, {ground:groundAt(to.x, to.z, player.position.y), heat:target.heat, light});
  }

  function remove() {
    if (shown) for (const mesh of [...shown.stack.children]) look.release(mesh);
    // Only the auger was made for this view; shared model geometry and materials belong to the asset cache.
    shown?.body.getObjectByName('drill-auger')?.traverse(node => {
      if (node.isMesh) { node.geometry.dispose(); node.material.dispose(); }
    });
    shown?.group.removeFromParent();
    shown = null;
    clearFallen();
    look.dispose();
    jet.remove();
    sprayed = null; townArt = null; found = {key:'', at:-Infinity, point:null, normal:null, wall:false};
  }

  const turn = new THREE.Quaternion();

  /** Once a frame, just before drawing. Returns true when it added or removed something from the scene. */
  function update({scene, player, camera, state, flags}) {
    const vehicle = player ? workVehicleToDraw(state, flags) : null;
    if (!vehicle) { const had = !!shown; remove(); return had; }
    const entry = modelFile(workVehicleDefinition(vehicle.id).model.file);
    let changed = false;
    if (shown && shown.id !== vehicle.id) { remove(); changed = true; }
    if (!shown && entry.status === 'ready') {
      shown = build(vehicle, entry.scene);
      if (shown) { scene.add(shown.group); changed = true; }
    }
    if (!shown) {
      // While the model loads the garage car is not drawn either: a truck never shows as a sports car. If the
      // model cannot be loaded at all, the garage car is drawn so that the player is never invisible.
      if (entry.status === 'loading') player.visible = false;
      return changed;
    }
    camera?.layers.enable(WORK_VEHICLE_LAYER);
    shown.group.position.copy(player.position);
    // The car stands at the ground plus a clearance less its own lowest wheel point (src/vehicle-grounding.js);
    // the truck's wheels are put where the car's are.
    shown.turned.position.y = (player.userData.grounding?.contactY ?? 0) - shown.contactY;
    shown.group.quaternion.copy(player.quaternion);
    shown.group.visible = player.visible;
    player.visible = false;
    const pieces = haulPiecesToDraw(state);
    if (shown.load) shown.load.visible = vehicle.loadKg > 0 && !pieces;
    const clock = Number.isFinite(state.stageTimeSec) ? state.stageTimeSec : 0;
    drawStack(pieces, clock);
    drawFallen(scene, pieces, player, clock);
    drawJet(scene, player, douseJetToDraw(state), truckStreamToDraw(state), douseFiresToDraw(state), clock);
    // Wheels: the front ones turn with the steering, all of them roll with the distance driven.
    const seconds = shown.clock === null ? 0 : Math.max(0, Math.min(0.25, clock - shown.clock));
    shown.clock = clock;
    const rig = state.arena.worldJob.open?.parts.home?.drillRig;
    if (shown.drill && rig) shown.drill.update(rig, shown.body, seconds);
    shown.roll -= (state.speedMph || 0) * MPH_TO_MPS * seconds / WHEEL_RADIUS_M;
    turn.setFromAxisAngle(ALONG_Y, -(state.steerVisual || 0) * shown.maxSteer);
    for (const wheel of shown.steers) wheel.object.quaternion.copy(turn).multiply(wheel.base);
    turn.setFromAxisAngle(ALONG_X, shown.roll);
    for (const wheel of shown.spins) wheel.object.quaternion.copy(turn).multiply(wheel.base);
    return changed;
  }

  /** True while a work vehicle is driven: the renderer then sets its cameras as it does for the tall Titan. */
  const drawsFor = (state, flags) => workVehicleToDraw(state, flags) !== null;

  return {update, drawsFor, get shown() { return shown?.id ?? null; }};
}
