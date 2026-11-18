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
  let placed = null;
  return {group, update(worldJob, groundAt) {
    const step = worldJob?.job?.steps?.[worldJob.job.stepIndex];
    group.visible = Boolean(step?.gasLoad && !worldJob.job.stepState.gasLoaded);
    if (!group.visible) return;
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
  }};
}
