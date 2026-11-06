import * as THREE from 'three';
import {machineToolPosition} from './machine.js';

export const MACHINE_SOUND_CUES = Object.freeze({engine:'machine.engine', hydraulic:'machine.hydraulic',
  dig:'machine.dig', tip:'machine.tip'});

const material = (color, roughness = 0.98, transparent = false) => new THREE.MeshStandardMaterial({
  color, roughness, transparent, opacity:transparent ? 0.48 : 1, depthWrite:!transparent,
});

/** Build a renderer-only machine scene from the named nodes in its GLB. */
export function createMachineView({model, definition, parent = null, onSound = null} = {}) {
  if (!model?.isObject3D || !definition || !Array.isArray(definition.joints))
    throw new TypeError('A loaded machine model and machine definition are required.');
  const root = new THREE.Group();
  root.name = `machine-view-${definition.id}`;
  const body = model.clone(true);
  root.add(body);
  const nodes = new Map();
  body.traverse(node => { if (node.name) nodes.set(node.name, node); });
  const joints = definition.joints.map(joint => ({joint,
    node:nodes.get(`${definition.id}:${joint.name}`) ?? nodes.get(joint.modelNode ?? joint.name)}));
  const warnings = joints.filter(entry => !entry.node).map(entry => `Missing model node: ${definition.id}:${entry.joint.name}`);
  const bed = nodes.get(`${definition.id}:bed`) ?? nodes.get(`${definition.id}:bucket`) ??
    nodes.get('Bed') ?? nodes.get('Bucket') ?? nodes.get('bed') ?? nodes.get('bucket');
  const load = bed ? new THREE.Mesh(new THREE.SphereGeometry(0.55, 12, 8), material(0x65503a)) : null;
  if (load) { load.name = 'machine-load'; bed.add(load); load.position.set(0, 0.45, 0); load.visible = false; }

  const dustMaterial = material(0x7b6a54, 1, true);
  const dust = Array.from({length:8}, (_, index) => {
    const puff = new THREE.Mesh(new THREE.SphereGeometry(0.2, 7, 5), dustMaterial.clone());
    puff.name = `machine-dust-${index}`;
    puff.visible = false;
    root.add(puff);
    return {mesh:puff, age:2, index};
  });
  const exhaust = new THREE.Mesh(new THREE.SphereGeometry(0.075, 7, 5), material(0x34312d, 1, true));
  exhaust.name = 'machine-exhaust';
  root.add(exhaust);
  const trackMarks = new THREE.Group();
  trackMarks.name = 'machine-track-marks';
  const markMaterial = material(0x4d463b, 1, true);
  const markPairs = [];
  for (let index = 0; index < 12; index++) {
    const pair = [-1, 1].map(() => {
      const mark = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.012, 0.32), markMaterial);
      mark.visible = false;
      trackMarks.add(mark);
      return mark;
    });
    markPairs.push(pair);
  }
  if (definition.driveKind === 'tracks') parent?.add(trackMarks);
  parent?.add(root);

  let lastState = null, dustCarry = 0, markCarry = 0, markIndex = 0;
  function update(state, dtSeconds = 0, events = []) {
    if (!state || !Number.isFinite(state.x) || !Number.isFinite(state.z) || !Number.isFinite(dtSeconds) || dtSeconds < 0)
      throw new TypeError('Machine view updates need a finite state and non-negative time.');
    root.position.set(state.x, Number.isFinite(state.y) ? state.y : 0, state.z);
    root.rotation.y = state.heading ?? 0;
    for (const {joint, node} of joints) {
      if (!node) continue;
      const angle = state.jointAngles?.[joint.name] ?? 0;
      node.rotation.set(0, 0, 0);
      node.quaternion.setFromAxisAngle(new THREE.Vector3(...joint.axis), angle);
    }
    const amounts = Object.values(state.load ?? {}).filter(Number.isFinite);
    const volume = amounts.reduce((sum, amount) => sum + Math.max(0, amount), 0);
    if (load) {
      load.visible = volume > 1e-4;
      const fill = Math.max(0.08, Math.min(1, volume / (definition.tools?.bucket?.capacityM3 ?? definition.tools?.bed?.capacityM3 ?? 8)));
      load.scale.set(0.55 * Math.sqrt(fill), 0.3 * fill, 0.55 * Math.sqrt(fill));
    }
    if (bed && load) load.visible = volume > 1e-4;

    const speed = Math.abs(state.speedMps ?? 0);
    exhaust.visible = speed > 0.05;
    exhaust.position.set(0, 1.5 + Math.sin((state.timeSeconds ?? 0) * 7) * 0.04, -1.1);
    exhaust.scale.setScalar(1 + Math.min(speed, 8) * 0.035);
    const moved = lastState ? Math.hypot(state.x - lastState.x, state.z - lastState.z) : 0;
    if (definition.driveKind === 'tracks') {
      if (root.parent && trackMarks.parent !== root.parent) root.parent.add(trackMarks);
      markCarry += moved;
      if (lastState && markCarry >= 0.35 && speed > 0.15) {
        markCarry %= 0.35;
        const pair = markPairs[markIndex++ % markPairs.length];
        const side = (definition.trackWidthM ?? 1.8) / 2;
        const sin = Math.sin(state.heading ?? 0), cos = Math.cos(state.heading ?? 0);
        for (let index = 0; index < pair.length; index++) {
          const lateral = index === 0 ? -side : side;
          pair[index].position.set(lastState.x + cos * lateral, 0.025,
            lastState.z - sin * lateral);
          pair[index].rotation.y = state.heading ?? 0;
          pair[index].visible = true;
        }
      }
    }
    dustCarry += moved;
    if (dustCarry >= 0.75 && speed > 0.1) {
      dustCarry %= 0.75;
      const puff = dust.find(item => item.age >= 0.8);
      if (puff) {
        puff.age = 0;
        puff.mesh.visible = true;
        puff.mesh.position.set(state.x, 0.18, state.z);
      }
    }
    for (const puff of dust) {
      puff.age += dtSeconds;
      puff.mesh.visible = puff.age < 0.8;
      if (puff.mesh.visible) {
        puff.mesh.position.y += dtSeconds * 0.22;
        puff.mesh.scale.setScalar(0.5 + puff.age * 1.4);
        puff.mesh.material.opacity = Math.max(0, 0.48 * (1 - puff.age / 0.8));
      }
    }
    for (const event of events) {
      if (event?.type === 'dirt-plume') onSound?.(MACHINE_SOUND_CUES.dig, event);
      else if (event?.type === 'tip') onSound?.(MACHINE_SOUND_CUES.tip, event);
    }
    if (speed > 0.05) onSound?.(MACHINE_SOUND_CUES.engine, {speedMps:speed});
    if (state.jointAngles && Object.values(state.jointAngles).some(angle => Math.abs(angle) > 0.01))
      onSound?.(MACHINE_SOUND_CUES.hydraulic, {joints:state.jointAngles});
    lastState = {x:state.x, z:state.z};
    root.updateMatrixWorld(true);
    trackMarks.updateMatrixWorld(true);
    return {warnings, toolPositions:Object.fromEntries(Object.keys(definition.tools ?? {}).map(id => {
      try { return [id, machineToolPosition(definition, state, id)]; } catch { return [id, null]; }
    }))};
  }
  function dispose() {
    root.removeFromParent();
    trackMarks.removeFromParent();
    for (const pair of markPairs) for (const mark of pair) mark.geometry.dispose();
    root.traverse(node => {
      if (node.name.startsWith('machine-dust-')) node.material.dispose();
      if (['machine-load','machine-exhaust'].includes(node.name)) {node.geometry.dispose(); node.material.dispose();}
    });
    dustMaterial.dispose(); markMaterial.dispose();
  }
  return {root, body, warnings, update, dispose};
}
