import * as THREE from 'three';
import {createCinderFigure} from './ember-pot.js';
import {GAS_LOAD_RULE} from './jobs/gas-load-rule.js';

// Plain meeting drawing for Claude to redraw. It reads job state only.
export function createGasLoadView() {
  const group = new THREE.Group();
  group.name = 'Slow Ride meeting';
  const moss = createCinderFigure();
  moss.name = 'Moss beside Big Bess';
  moss.visible = true;
  group.add(moss);
  const ring = new THREE.Mesh(new THREE.RingGeometry(GAS_LOAD_RULE.meetingRadiusMetres - .15,
    GAS_LOAD_RULE.meetingRadiusMetres, 48), new THREE.MeshBasicMaterial({color: 0xe4c58a, side: THREE.DoubleSide}));
  ring.rotation.x = -Math.PI / 2;
  group.add(ring);
  const hose = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({color: 0x211e19}));
  hose.name = 'Plane wing gas hose';
  group.add(hose);
  const leaks = new THREE.Group();
  leaks.name = 'Tank holes and spray';
  group.add(leaks);
  const holes = Array.from({length:GAS_LOAD_RULE.maxHoles}, (_, index) => {
    const mark = new THREE.Group();
    mark.position.set(1.42, 2, (index - 1) * 1.1);
    const hole = new THREE.Mesh(new THREE.CircleGeometry(.12, 8), new THREE.MeshBasicMaterial({color:0x171714, side:THREE.DoubleSide}));
    hole.rotation.y = Math.PI / 2;
    mark.add(hole);
    const spray = new THREE.Line(new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0), new THREE.Vector3(.9, -.7, .12)]),
      new THREE.LineBasicMaterial({color:0xd4d2b2}));
    mark.add(spray);
    leaks.add(mark);
    return mark;
  });
  const flash = new THREE.Mesh(new THREE.PlaneGeometry(5, 2), new THREE.MeshBasicMaterial({
    color:0xffe7a0, transparent:true, opacity:.85, side:THREE.DoubleSide, depthWrite:false}));
  flash.name = 'Tank gas flash';
  flash.rotation.y = Math.PI / 2;
  flash.position.set(1.5, 2, 0);
  leaks.add(flash);
  const tank = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 4, 12),
    new THREE.MeshStandardMaterial({color:0x544c3a, roughness:.9}));
  tank.name = 'Forge gas tank';
  group.add(tank);
  const arrivalHose = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({color:0x211e19}));
  arrivalHose.name = 'Forge tank hose';
  group.add(arrivalHose);
  let placed = null;
  return {group, update(worldJob, groundAt) {
    const step = worldJob?.job?.steps?.[worldJob.job.stepIndex];
    group.visible = Boolean(step?.gasLoad);
    if (!group.visible) return;
    const state = worldJob.job.stepState;
    const meeting = !state.gasLoaded;
    moss.visible = ring.visible = hose.visible = meeting;
    const bess = worldJob.actors?.find(actor => actor.id === step.actorId);
    leaks.visible = !!bess?.position;
    if (leaks.visible) {
      leaks.position.set(bess.position.x, groundAt(bess.position.x, bess.position.z), bess.position.z);
      leaks.rotation.y = bess.heading ?? 0;
      flash.visible = state.flashVisible > 0;
      holes.forEach((hole, index) => {hole.visible = index < (state.holes ?? 0);});
    }
    const destination = step.gasTank?.position;
    tank.visible = !!destination;
    arrivalHose.visible = !!destination && worldJob.forgeGasShare != null && !!bess;
    if (destination) tank.position.set(destination.x, groundAt(destination.x, destination.z) + 2, destination.z);
    if (arrivalHose.visible) {
      const from = bess.position;
      arrivalHose.geometry.setFromPoints([new THREE.Vector3(from.x, groundAt(from.x, from.z) + 2, from.z),
        new THREE.Vector3((from.x + destination.x) / 2, groundAt(from.x, from.z) + .15, (from.z + destination.z) / 2),
        new THREE.Vector3(destination.x, groundAt(destination.x, destination.z) + 1, destination.z)]);
    }
    if (!meeting) return;
    const at = step.meeting.position;
    moss.position.set(at.x, groundAt(at.x, at.z), at.z);
    ring.position.set(at.x, groundAt(at.x, at.z) + .08, at.z);
    // Lower the hose to the ground when Moss starts speaking.
    const key = `${step.path[0].position.x}:${step.path[0].position.z}:${!!worldJob.job.stepState.gasMeeting}`;
    if (key !== placed) {
      placed = key;
      const from = step.hoseFrom.position, to = step.path[0].position;
      const lift = worldJob.job.stepState.gasMeeting ? .08 : 2.5;
      hose.geometry.setFromPoints([new THREE.Vector3(from.x, groundAt(from.x, from.z) + lift, from.z),
        new THREE.Vector3(to.x, groundAt(to.x, to.z) + lift, to.z)]);
    }
  }, dispose() {
    const geometries = new Set(), materials = new Set();
    group.traverse(node => {
      if (node.geometry) geometries.add(node.geometry);
      for (const material of [].concat(node.material ?? [])) materials.add(material);
    });
    for (const geometry of geometries) geometry.dispose();
    for (const material of materials) material.dispose();
    group.clear();
  }};
}
