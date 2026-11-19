// TOWN-VEHICLES: draws the player's work vehicle from its truck model in place of the garage car's body.
// It reads state and never writes it. It draws only while `wasteland-town` is on and the World Job's player has a
// work vehicle; otherwise it removes what it drew and leaves the garage car exactly as the renderer made it.
// The truck takes the garage car's pose for the frame (position, heading, pitch, roll, bounce), so every pose rule
// the renderer already has applies to it too.
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {workVehicleDefinition} from '../work-vehicles.js';

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
    return {id:vehicle.id, group, turned, contactY:tyres.isEmpty() ? 0 : tyres.min.y, steers, spins,
      load:loadNode ? findModelNode(body, loadNode) : null,
      maxSteer:definition.maxSteerDeg * Math.PI / 180, roll:0, clock:null};
  }

  function remove() {
    shown?.group.removeFromParent();
    shown = null;
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
    if (shown.load) shown.load.visible = vehicle.loadKg > 0;
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
