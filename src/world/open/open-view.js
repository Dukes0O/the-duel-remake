// The open land's drawn parts, in one group (docs/story/open-scablands.md). src/world/scablands-scene.js makes this
// the first time a job begins in the open and updates it every frame. A card draws by filling in its own view file;
// it edits neither this file nor the scene.
//
// A view part is a function that takes {course, loadAsset} and returns null to draw nothing, or
//   {group, update(worldJob, here, seconds, drawnShift), animate?(seconds), dispose()}
// `worldJob.open` is the open state of src/world/open/open-land.js. A view only reads it.
import * as THREE from 'three';
import {createBuildingView} from './building-view.js';
import {createSiteView} from './site-view.js';
import {createSignView} from './sign-view.js';
import {createHomeGroundView} from './looks/home-ground-look.js';

const VIEW_PARTS = [createSiteView, createBuildingView, createSignView, createHomeGroundView];

export function createOpenView(context, makers = VIEW_PARTS) {
  const group = new THREE.Group();
  group.name = 'open-land';
  const views = makers.map(make => make(context)).filter(Boolean);
  for (const view of views) group.add(view.group);
  let seconds = 0;
  return {
    group,
    update(worldJob, here, presentationDt, drawnShift) {
      group.visible = !!worldJob?.open;
      if (!group.visible) return;
      seconds += Math.max(0, presentationDt);
      for (const view of views) view.update(worldJob, here, seconds, drawnShift);
    },
    animate(clock) { for (const view of views) view.animate?.(clock); },
    dispose() { for (const view of views) view.dispose(); },
  };
}
