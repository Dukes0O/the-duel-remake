// The town's opponents use the existing foot figures. This view reads their
// rule positions and ash countdown; it never moves or attacks for them.
import * as THREE from 'three';
import {createOnFootFigures} from '../onfoot-figures.js';
import {BRAND_RULE as R} from './jobs/brand-rule.js';
import {RIDER_RULE} from './jobs/rider-rule.js';

export function createBrandAshView({road = false} = {}) {
  const group = new THREE.Group();
  group.name = road ? 'Road riders and ash sacks' : 'Town Ash Men';
  group.visible = false;
  const capacity = road ? RIDER_RULE.maximumField : R.ashWaves.reduce((sum, count) => sum + count, 0);
  const figures = createOnFootFigures({capacity:road ? capacity * RIDER_RULE.crewPerCar : capacity});
  group.add(figures.group);
  const ashShape = new THREE.SphereGeometry(R.ashDrawingRadius, 8, 6);
  const ashMaterial = new THREE.MeshStandardMaterial({color: 0xaaa291, roughness: 1});
  const radius = road ? RIDER_RULE.ashRadius : R.ashRadius;
  const markShape = new THREE.RingGeometry(radius - R.ashMarkWidth, radius, 24);
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
      const fight = worldJob?.riderFight;
      // A scout knocked down by the car stays on the ground where he fell for the rest of the night's scenes.
      // OPEN-CHECKPOINTS: use the standing figure rig for the driver even before the road fight view exists.
      const driver = worldJob?.checkpointRoad?.driver;
      group.visible = road ? Boolean(fight) :
        Boolean(driver || worldJob?.threadDefence || worldJob?.actors?.some(actor => actor.missionRetreat)) || step?.brand === true || worldJob?.night2 != null && (step?.id === 'scout' || worldJob.night2.scoutDowned === true);
      const actors = group.visible ? (worldJob.actors ?? []).filter(actor => road
        ? actor.riderCrew && actor.id !== driver : actor.brandAsh || actor.id === driver) : [];
      figures.update(actors, {active: group.visible, drawnShift});
      for (let index = 0; index < capacity; index++) {
        const actor = actors[index], ash = road ? fight?.ash?.[index] : job?.stepState?.brandAsh?.men?.[actor?.id]?.ash;
        const source = road ? ash?.from : actor;
        const view = warnings[index];
        view.warning.visible = Boolean(group.visible && source && ash);
        if (!view.warning.visible) continue;
        const share = THREE.MathUtils.clamp(1 - ash.remaining / (road ? RIDER_RULE.ashFlightSec : R.throwWarningSeconds), 0, 1);
        const target = ash.position;
        const sourceShift=road ? drawnShift?.(source.x,source.z,source.y,undefined,view.ash) ?? 0 : figures.drawnShiftAt(index),targetShift=drawnShift?.(target.x,target.z,target.y,undefined,view.mark)??0;
        view.ash.position.set(THREE.MathUtils.lerp(source.x, target.x, share),
          THREE.MathUtils.lerp(source.y + sourceShift + R.ashReleaseHeight, target.y + targetShift, share) +
            Math.sin(share * Math.PI) * R.ashArcHeight,
          THREE.MathUtils.lerp(source.z, target.z, share));
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
