import * as THREE from 'three';
import {addArenaCrushables} from '../../arena-props.js';

// Cover is the released salvage kit at the simulation's actual solid poses.
export function createAmbushAlleyView(disposeTree) {
  const group = new THREE.Group();
  group.name = 'Ambush Alley scrap fort';
  group.visible = false;
  let fort = null, disposed = false;
  function clear() {
    for (const child of [...group.children]) {
      child.removeFromParent(); disposeTree(child);
    }
    fort = null;
  }
  return {group,
    update(state) {
      const current = state.arena?.mode === 'ambush-alley' && state.arena.ambushAlley?.fort;
      group.visible = !disposed && !!current && !['menu', 'yard_home'].includes(state.status);
      if (!group.visible) return;
      if (current !== fort) {
        clear(); fort = current;
        addArenaCrushables(group, {features: {crushables: fort.cover.map((cover, index) =>
          ({...cover, color: [0x53645b, 0x935143, 0x557185][index % 3]}))}});
        group.userData.coverCount = fort.cover.length;
      }
      group.userData.health = current.health;
    },
    dispose() {
      if (disposed) return;
      disposed = true; clear(); group.visible = false; group.removeFromParent();
    },
  };
}
