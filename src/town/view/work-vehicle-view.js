// TOWN-VEHICLES: draws the player's work vehicle from its truck model in place of the garage car's body.
// It reads state and never writes it. It draws only while `wasteland-town` is on and the World Job's player has a
// work vehicle; otherwise it removes what it drew and leaves the garage car exactly as the renderer made it.
// The truck takes the garage car's pose for the frame (position, heading, pitch, roll, bounce), so every pose rule
// the renderer already has applies to it too.
// TOWN-HAUL-JOB: on a haul, the pieces on the bed are drawn as a stack that grows as the gang loads and shrinks as
// pieces fall, and every piece thrown off lies on the ground where it fell until the job ends.
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {workVehicleDefinition} from '../work-vehicles.js';
import {createWaterStreamView} from '../../arsenal/water-stream-view.js';

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

// TOWN-HAUL-JOB: a piece's box, from its mass: aluminium salvage is light for its size, steel is dense.
const PIECE_COLOURS = Object.freeze({salvage:0x9ea3a6, steel:0x6e4a33});
const PIECE_DENSITY = Object.freeze({salvage:180, steel:900}); // kilograms per cubic metre of a loose piece, air and all
function pieceSize(piece, good) {
  const volume = Math.max(.15, piece.kg / (PIECE_DENSITY[good] ?? 300));
  const length = Math.min(3.4, Math.cbrt(volume) * 1.8), width = Math.min(1.1, Math.cbrt(volume) * .9);
  return {length, width, height:Math.max(.12, volume / (length * width))};
}
/** The haul step's pieces on the bed and on the ground, or null when no haul is being driven. Reads only. */
export function haulPiecesToDraw(state) {
  const job = state?.arena?.worldJob?.job, step = job?.steps?.[job.stepIndex];
  if (step?.kind !== 'haul') return null;
  return {good:step.good, load:job.stepState?.load ?? [], shed:job.stepState?.shed ?? []};
}

// TOWN-FIRE-JOB: while the fire truck sprays, the water's arc from the cannon on its roof to the flames it is aimed at. Reads only.
export function douseJetToDraw(state) {
  const job = state?.arena?.worldJob?.job, step = job?.steps?.[job.stepIndex];
  if (step?.kind !== 'douse' || job.stepState?.spraying !== true) return null;
  const building = (step.buildings ?? []).find(row => row.id === job.stepState.targetId);
  return building ? {x:building.x, z:building.z, halfX:building.halfX, halfZ:building.halfZ} : null;
}

// WEAPON-WATER-CANNON: where the fire truck's stream lands on a car ({x, z}), when it is on one (src/arena/modes/world-job.js).
export const truckStreamToDraw = state => state?.arena?.mode === 'world-job' && state.arena.worldJob?.truckStream?.to || null;

export function workVehicleToDraw(state, flags) {
  if (flags?.enabled?.('wasteland-town') !== true || state?.arena?.mode !== 'world-job') return null;
  return state.arena.worldJob?.vehicle ?? null;
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
    const turned = new THREE.Group();
    turned.rotation.y = Math.PI;
    turned.add(body);
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
    const stack = new THREE.Group();
    stack.name = 'haul-stack';
    turned.add(stack);
    return {id:vehicle.id, group, turned, contactY:tyres.isEmpty() ? 0 : tyres.min.y, steers, spins,
      bedBox:bedBox && !bedBox.isEmpty() ? bedBox : null, stack, stackKey:'',
      load:loadNode ? findModelNode(body, loadNode) : null,
      maxSteer:definition.maxSteerDeg * Math.PI / 180, roll:0, clock:null};
  }

  // Pieces lying where they fell, by piece id; kept until the job ends.
  const fallen = new Map();
  const pieceMesh = (piece, good) => {
    const size = pieceSize(piece, good);
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(size.length, size.height, size.width),
      new THREE.MeshStandardMaterial({color:PIECE_COLOURS[good] ?? 0x8a7a66, roughness:.85, metalness:good === 'steel' ? .4 : .6}));
    mesh.castShadow = true; mesh.receiveShadow = true; mesh.layers.set(WORK_VEHICLE_LAYER);
    mesh.userData.size = size;
    return mesh;
  };
  function clearFallen() {
    for (const mesh of fallen.values()) { mesh.removeFromParent(); mesh.geometry.dispose(); mesh.material.dispose(); }
    fallen.clear();
  }
  function drawStack(pieces) {
    const key = pieces?.load.map(piece => piece.id).join(',') ?? '';
    if (!shown || key === shown.stackKey) return;
    shown.stackKey = key;
    for (const mesh of [...shown.stack.children]) { mesh.removeFromParent(); mesh.geometry.dispose(); mesh.material.dispose(); }
    if (!pieces || !shown.bedBox) return;
    // Two rows along the bed, laid from the cab back, then a layer up: a tall stack is plain to see.
    const box = shown.bedBox, rows = 2, along = box.max.z - box.min.z, across = box.max.x - box.min.x;
    const slots = Math.max(1, Math.floor(along / 1.3));
    let layerY = box.min.y;
    pieces.load.forEach((piece, index) => {
      const slot = index % (rows * slots), row = slot % rows, column = Math.floor(slot / rows);
      if (index > 0 && slot === 0) layerY += .45;
      const mesh = pieceMesh(piece, pieces.good), size = mesh.userData.size;
      mesh.rotation.y = Math.PI / 2;
      mesh.position.set(box.min.x + across * (row + .5) / rows, layerY + size.height / 2,
        box.min.z + along * (column + .5) / slots);
      shown.stack.add(mesh);
    });
  }
  function drawFallen(scene, pieces, groundY) {
    for (const piece of pieces?.shed ?? []) {
      if (fallen.has(piece.id)) continue;
      const mesh = pieceMesh(piece, pieces.good);
      // The scene is in world metres (as the job's floor ring is), so the piece lies where the truck was when it fell.
      const turnSeed = [...piece.id].reduce((total, char) => total + char.charCodeAt(0), 0);
      mesh.position.set(piece.x, (Number.isFinite(piece.y) ? piece.y : groundY) + mesh.userData.size.height / 2, piece.z);
      mesh.rotation.y = turnSeed * .7;
      scene.add(mesh);
      fallen.set(piece.id, mesh);
    }
  }

  // The jet: drops of water along a curve from the cannon to the nearest side of the flames, moving out along it. The look is
  // the one every water cannon shares (src/arsenal/water-stream-view.js, WEAPON-WATER-CANNON). With no flames in front, the
  // stream may be on a car (truckStreamToDraw): then it lands on that car.
  const CANNON = new THREE.Vector3(0, 3.1, 2.2);
  const jet = createWaterStreamView({name:'fire-truck-jet', layer:WORK_VEHICLE_LAYER});
  const from = new THREE.Vector3(), to = new THREE.Vector3();
  function drawJet(scene, player, target, onCar, clock) {
    if (!target && !onCar) { jet.hide(); return; }
    from.copy(CANNON).applyQuaternion(player.quaternion).add(player.position);
    if (target) to.set(Math.max(target.x - target.halfX, Math.min(target.x + target.halfX, from.x)), player.position.y + 2,
      Math.max(target.z - target.halfZ, Math.min(target.z + target.halfZ, from.z)));
    else to.set(onCar.x, player.position.y + 1, onCar.z);
    jet.draw(scene, from, to, clock);
  }

  function remove() {
    shown?.group.removeFromParent();
    shown = null;
    clearFallen();
    jet.remove();
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
    drawStack(pieces);
    drawFallen(scene, pieces, player.position.y);
    drawJet(scene, player, douseJetToDraw(state), truckStreamToDraw(state), Number.isFinite(state.stageTimeSec) ? state.stageTimeSec : 0);
    // Wheels: the front ones turn with the steering, all of them roll with the distance driven.
    const clock = Number.isFinite(state.stageTimeSec) ? state.stageTimeSec : 0;
    const seconds = shown.clock === null ? 0 : Math.max(0, Math.min(0.25, clock - shown.clock));
    shown.clock = clock;
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
