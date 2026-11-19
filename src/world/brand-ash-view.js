// The town's opponents use the existing foot figures. This view reads their
// rule positions and ash countdown; it never moves or attacks for them.
import * as THREE from 'three';
import {createOnFootFigures} from '../onfoot-figures.js';
import {BRAND_RULE as R} from './jobs/brand-rule.js';

export function createBrandAshView() {
  const group = new THREE.Group();
  group.name = 'Town Ash Men';
  group.visible = false;
  const capacity = R.ashWaves.reduce((sum, count) => sum + count, 0);
  const figures = createOnFootFigures({capacity});
  group.add(figures.group);
  const ashShape = new THREE.SphereGeometry(R.ashDrawingRadius, 8, 6);
  const ashMaterial = new THREE.MeshStandardMaterial({color: 0xaaa291, roughness: 1});
  const markShape = new THREE.RingGeometry(R.ashRadius - R.ashMarkWidth, R.ashRadius, 24);
  const markMaterial = new THREE.MeshBasicMaterial({color: 0xc6bfae,
    transparent: true, opacity: .65, side: THREE.DoubleSide, depthWrite: false});
  const warnings = Array.from({length: capacity}, () => {
    const warning = new THREE.Group();
    const ash = new THREE.Mesh(ashShape, ashMaterial);
    const mark = new THREE.Mesh(markShape, markMaterial);
    mark.rotation.x = -Math.PI / 2;
    warning.add(ash, mark);
    warning.visible = false;
    group.add(warning);
    return {warning, ash, mark};
  });
  return {group, figures,
    update(worldJob, drawnShift) {
      const job = worldJob?.job, step = job?.steps?.[job.stepIndex];
      group.visible = step?.brand === true || worldJob?.night2 != null && step?.id === 'scout';
      const actors = group.visible ? (worldJob.actors ?? []).filter(actor => actor.brandAsh) : [];
      figures.update(actors, {active: group.visible, drawnShift});
      for (let index = 0; index < capacity; index++) {
        const actor = actors[index], ash = job?.stepState?.brandAsh?.men?.[actor?.id]?.ash;
        const view = warnings[index];
        view.warning.visible = Boolean(group.visible && actor && ash);
        if (!view.warning.visible) continue;
        const share = THREE.MathUtils.clamp(1 - ash.remaining / R.throwWarningSeconds, 0, 1);
        const target = ash.position;
        const sourceShift=figures.drawnShiftAt(index),targetShift=drawnShift?.(target.x,target.z,target.y,undefined,view.mark)??0;
        view.ash.position.set(THREE.MathUtils.lerp(actor.x, target.x, share),
          THREE.MathUtils.lerp(actor.y + sourceShift + R.ashReleaseHeight, target.y + targetShift, share) +
            Math.sin(share * Math.PI) * R.ashArcHeight,
          THREE.MathUtils.lerp(actor.z, target.z, share));
        view.mark.position.set(target.x, target.y + targetShift + R.ashMarkLift, target.z);
      }
    },
    dispose() {
      figures.dispose();
      ashShape.dispose(); ashMaterial.dispose(); markShape.dispose(); markMaterial.dispose();
      group.clear(); group.visible = false;
    },
  };
}
