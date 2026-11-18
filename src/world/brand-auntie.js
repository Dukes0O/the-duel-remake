// Reuse Auntie's shipped folk figure, including its skeleton and smith's apron.
import * as THREE from 'three';
import {clone} from 'three/addons/utils/SkeletonUtils.js';
import {BRAND_RULE} from './jobs/brand-rule.js';

export function createBrandAuntie() {
  const group = new THREE.Group();
  group.name = 'Auntie Solder at the forge';
  group.visible = false;
  let source = null, sourceVisible = true, model = null;
  return {group,
    install(folk) {
      if (model) return;
      folk.traverse(node => {
        if (node.name.replace(/_/g, ' ') === 'auntie-solder root') source = node;
      });
      if (!source) throw new Error('The folk kit has no Auntie Solder figure.');
      sourceVisible = source.visible;
      model = clone(source);
      model.position.set(0, 0, 0);
      model.visible = true;
      model.updateMatrixWorld(true);
      const bounds = new THREE.Box3().setFromObject(model);
      const height = bounds.max.y - bounds.min.y;
      if (!Number.isFinite(height) || height <= 0) throw new Error('Auntie Solder has no visible body.');
      model.scale.multiplyScalar(BRAND_RULE.auntieHeight / height);
      model.updateMatrixWorld(true);
      model.position.y -= new THREE.Box3().setFromObject(model).min.y;
      group.add(model);
    },
    update(worldJob) {
      const step = worldJob?.job?.steps?.[worldJob.job.stepIndex];
      group.visible = Boolean(model && step?.brand && step.auntie);
      if (source) source.visible = group.visible ? false : sourceVisible;
      if (!group.visible) return;
      const at = step.auntie.position, bay = step.meeting.position;
      group.position.set(at.x, at.y, at.z);
      group.rotation.y = Math.atan2(bay.x - at.x, bay.z - at.z);
    },
    dispose() {
      if (source) source.visible = sourceVisible;
      model?.traverse(node => { if (node.isSkinnedMesh) node.skeleton.dispose(); });
      group.clear();
      model = null;
      source = null;
      group.visible = false;
    },
  };
}
