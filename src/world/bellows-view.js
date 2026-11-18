import * as THREE from 'three';
import {createOnFootFigures} from '../onfoot-figures.js';
import {BELLOWS_RULE as R} from './jobs/bellows-rule.js';

// Plain load and ash for Claude to redraw. Only the job owns their state.
export function createBellowsView(course) {
  const group = new THREE.Group();
  group.name = 'The stolen bellows and ash';
  group.visible = false;
  const loadShape = new THREE.BoxGeometry(R.roofLoadWidth, R.roofLoadHeight, R.roofLoadLength);
  const leather = new THREE.MeshStandardMaterial({color: 0x60422c, roughness: 1});
  const load = new THREE.Mesh(loadShape, leather);
  load.name = 'Bellows roof load';
  const ashShape = new THREE.BoxGeometry(1, 1, 1);
  // Opaque on both sides: the cloud hides its contents, including when the
  // camera enters it. A translucent shell would leave opponents visible.
  const ashMaterial = new THREE.MeshBasicMaterial({color: 0x77736e, side: THREE.DoubleSide,
    fog: false, transparent: false, depthWrite: true});
  const clouds = new Map();
  const figures = createOnFootFigures({capacity:1});
  group.add(load, figures.group);
  return {group, load, clouds, figures,
    update(state) {
      const worldJob = state?.arena?.mode === 'world-job' ? state.arena.worldJob : null;
      const job = worldJob?.job, step = job?.steps?.[job.stepIndex];
      group.visible = step?.bellows === true;
      load.visible = false;
      figures.update(group.visible ? (worldJob.actors ?? []).filter(actor => actor.bellowsThief) : [],
        {active:group.visible});
      const active = new Set();
      if (group.visible) {
        const carried = job.stepState ?? {};
        const thief = worldJob.actors?.find(actor => actor.id === step.targetId);
        const at = carried.bellowsLoaded ? course.groundAt(state.s, state.lateral) : thief?.position;
        const heading = carried.bellowsLoaded
          ? course.at(state.s).heading + (state.headingError ?? 0) : thief?.heading ?? 0;
        if (at) {
          load.visible = true;
          load.position.set(at.x, (at.y ?? 0) + R.roofLoadLift, at.z);
          load.rotation.y = heading;
        }
        for (const cloud of carried.clouds ?? []) {
          if (!(cloud.remaining > 0)) continue;
          active.add(cloud.id);
          let mesh = clouds.get(cloud.id);
          if (!mesh) {
            mesh = new THREE.Mesh(ashShape, ashMaterial);
            mesh.name = cloud.id;
            clouds.set(cloud.id, mesh); group.add(mesh);
          }
          const pose = course.nearest(cloud.x, cloud.z);
          const floor = course.groundAt(pose.s, pose.lateral).y;
          mesh.position.set(cloud.x, floor + R.ashHeightMetres / 2, cloud.z);
          mesh.rotation.y = cloud.yaw;
          mesh.scale.set(cloud.width, R.ashHeightMetres, cloud.length);
        }
      }
      for (const [id, mesh] of clouds) {
        if (active.has(id)) continue;
        group.remove(mesh); clouds.delete(id);
      }
    },
    dispose() {
      figures.dispose();
      loadShape.dispose(); leather.dispose(); ashShape.dispose(); ashMaterial.dispose();
      clouds.clear(); group.clear(); group.visible = false;
    },
  };
}
