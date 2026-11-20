// Mrs Vane's things drawn in the Scablands during a town drive (TOWN-VANE-SCENE, switch `wasteland-town`): her white kiosks at the town's
// edge, her billboards, depots, tanks and white fences at the territories' sites for the deeds she holds, and Vane Reach, far off and white
// beyond the Dry Dam. All are parts of public/assets/models/wasteland/town/vane.glb.
//
// Drawing only. Where each stands, and its solids, come from the drive's layout (src/town/town-vane-world.js), which the job reads too. A
// kiosk that has closed or a deed won back is not in the layout, so it is not drawn.
import * as THREE from 'three';
import {scablandsSurfaceHeightAt} from '../../world/scablands-ground.js';
import {VANE_MODEL, VANE_PIECES, VANE_REACH} from '../content/vane-world.js';
import {thingBase} from '../town-world-things.js';
import {createTownModelKit} from './town-world-models.js';

// Her kiosks and her sites are drawn this near the car (metres). Vane Reach is drawn as far as the camera sees (VANE_REACH.drawRange).
export const VANE_DRAW_RANGE = 1400;

// `vane` is the drive's layout (`layout.vane`). `drawnHeightAt` is the ground as drawn: each part stands on its lowest drawn ground, less
// the sink, so the edges of its pad are in the ground all round.
export function createTownVaneScene({vane = null, loadAsset, drawnHeightAt = null, heightAt = scablandsSurfaceHeightAt} = {}) {
  const group = new THREE.Group();
  group.name = 'Vane things';
  group.userData.loadErrors = [];
  const kit = createTownModelKit(loadAsset);
  const drawnAt = (x, z) => drawnHeightAt?.(x, z) ?? heightAt(x, z);
  const things = [];
  const add = (placed, range, what) => {
    const piece = VANE_PIECES[placed.piece], holder = new THREE.Group();
    holder.name = `${what} (${placed.id})`;
    holder.position.set(placed.x, thingBase(placed, piece.bounds, drawnAt).y, placed.z);
    holder.rotation.y = placed.heading;
    holder.userData.vaneThing = placed.id;
    group.add(holder);
    things.push({placed, piece, holder, range});
  };
  for (const kiosk of vane?.kiosks ?? []) add(kiosk, VANE_DRAW_RANGE, 'Vane kiosk');
  for (const site of vane?.sites ?? []) for (const piece of site.pieces) add(piece, VANE_DRAW_RANGE, `Vane ${piece.piece} at ${site.territoryId}`);
  if (vane?.reach) add(vane.reach, VANE_REACH.drawRange, 'Vane Reach');
  let disposed = false;
  const ready = Promise.all(things.map(thing => kit.part(VANE_MODEL, thing.piece.node, {lift: thing.piece.lift}).then(model => {
    if (!disposed) thing.holder.add(model);
  }).catch(error => group.userData.loadErrors.push(`${thing.placed.id}: ${error.message || error}`)))).then(() => !disposed);
  group.userData.ready = ready;
  group.userData.things = things;

  // `viewer` is where the car is.
  function update(viewer) {
    if (disposed) return;
    for (const thing of things)
      thing.holder.visible = !viewer || Math.hypot(viewer.x - thing.placed.x, viewer.z - thing.placed.z) < thing.range;
  }
  function dispose() {
    if (disposed) return;
    disposed = true;
    kit.dispose();
    group.removeFromParent();
    group.clear();
  }
  return {group, ready, update, dispose};
}
