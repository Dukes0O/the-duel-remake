import * as THREE from 'three';
import {createOnFootFigures} from '../onfoot-figures.js';
import {BRAND_RULE as R, brandThiefPose} from './jobs/brand-rule.js';
import {scablandsSurfaceHeightAt} from './scablands-ground.js';

// A plain runner and the stolen load. All progress comes from the job's clock.
export function createBrandThief() {
  const group = new THREE.Group();
  group.name = 'The bellows thief';
  group.visible = false;
  const figures = createOnFootFigures({capacity: 1});
  const load = new THREE.Mesh(new THREE.BoxGeometry(R.thiefLoadWidth, R.thiefLoadHeight, R.thiefLoadDepth),
    new THREE.MeshStandardMaterial({color: 0x60422c, roughness: 1}));
  group.add(figures.group, load);
  const actor = {};
  return {group, figures,
    update(worldJob, drawnShift) {
      const job = worldJob?.job;
      const pose = brandThiefPose(job?.steps?.[job.stepIndex], job?.stepState);
      group.visible = Boolean(pose);
      if (!pose) { figures.update([], {active: false}); return; }
      Object.assign(actor, pose, {y: scablandsSurfaceHeightAt(pose.x, pose.z)});
      group.position.y=drawnShift?.(actor.x,actor.z,actor.y,undefined,group)??0;
      figures.update([actor], {active: true});
      load.position.set(actor.x - Math.sin(actor.yaw) * R.thiefLoadBehind,
        actor.y + R.thiefLoadLift, actor.z - Math.cos(actor.yaw) * R.thiefLoadBehind);
      load.rotation.y = actor.yaw;
    },
    dispose() {
      figures.dispose(); load.geometry.dispose(); load.material.dispose();
      group.clear(); group.visible = false;
    },
  };
}
