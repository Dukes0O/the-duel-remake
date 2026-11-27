import * as THREE from 'three';
import {createVehicle} from '../../../vehicles.js';
import {distance} from '../site-rule.js';
import {DACE_ID, DACE_PLACES as places, daceMarked} from '../content/dace-goes-looking-places.js';

export function createDaceLook(group, positionAt) {
  const root = new THREE.Group();
  root.name = 'Dace goes looking';
  group.add(root);

  const truck = createVehicle({color: 0x7e5d3f, accent: 0x554b3a});
  truck.name = "Moss's old pickup";
  root.add(truck);
  function box(parent, name, color, size, at) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), new THREE.MeshStandardMaterial({color, roughness: .91}));
    mesh.name = name;
    mesh.position.set(...at);
    parent.add(mesh);
    return mesh;
  }
  const cover = box(truck, 'Grey pickup cover', 0x787975, [2.16, 1.25, 4.55], [0, .92, 0]);
  const folded = box(truck, 'Cover dropped on the ground', 0x787975, [.95, .10, 1.2], [1.65, .06, -1.38]);
  const bonnet = box(truck, 'Open bonnet', 0x836344, [1.77, .07, 1.45], [0, 1.22, 1.58]);
  bonnet.rotation.x = -.57;
  const aerial = box(truck, 'Pickup aerial', 0x39332b, [.03, 1.08, .03], [.84, 1.4, .8]);
  const blanket = box(truck, "Rell's red blanket", 0x942e25, [.42, .59, .05], [1.03, 1.65, .82]);
  const key = box(root, 'Pickup key on its nail', 0x86734d, [.055, .18, .02], [0, 0, 0]);
  const stones = new THREE.Group();
  stones.name = 'Three Walker stones';
  [.35, .26, .16].forEach((size, index) => {
    const stone = new THREE.Mesh(new THREE.DodecahedronGeometry(size, 0),
      new THREE.MeshStandardMaterial({color: 0x8f7861, roughness: 1}));
    stone.position.set(-index * .66, size * .48, index * .13);
    stones.add(stone);
  });
  const tracks = new THREE.Group();
  tracks.name = "The old pickup's tracks";
  for (const x of [-.86, .86]) box(tracks, 'Tyre rut', 0x77624a, [.18, .018, 5], [x, .021, 0]);
  root.add(stones, tracks);
  let departureAt = null;

  return {
    update(open, sign, here, drawnShift) {
      const enabled = open?.parts.threads?.places.checkpointsEnabled;
      const world = open?.world, record = enabled && world.open.threads[DACE_ID];
      root.visible = !!record;
      if (!record) {
        departureAt = null;
        return;
      }
      const {beat, end} = record;
      const active = open.parts.missions?.active;
      const staged = open.parts.threads?.dace;
      const taken = daceMarked(world, 'pickup-taken');
      const left = daceMarked(world, 'pickup-left-out');
      const reported = world.ledger.marks.includes(DACE_ID + '/later/moss-fetches-the-pickup');
      const fetch = active?.id === DACE_ID + '/fetch' && staged?.rescue;
      const departure = !end && beat === 'away' && open.events.findLast(event => event.cue === 'open.pickup.started');
      if (departure && departureAt?.seq !== departure.seq) departureAt = {seq: departure.seq, seconds: open.seconds};
      if (beat !== 'away') departureAt = null;
      const age = departureAt ? open.seconds - departureAt.seconds : Infinity;
      const leaving = departure && age < 4;
      const roadside = (fetch && ['hill', 'stones', 'the-place'].includes(fetch.reason) || left && !reported) && staged?.rescue?.truck;
      const yard = end ? !taken && (!left || reported) : ['sign', 'asking', 'ready', 'radio-check', 'telling',
        'leaving', 'key', 'night-after', 'key-was-taken', 'he-stayed', 'together'].includes(beat);
      const at = taken ? places.den : roadside || (leaving ? places.start : yard ? places.pickup : null);
      truck.visible = distance(here, at) <= 500;
      if (truck.visible) {
        positionAt(truck, at, drawnShift);
        if (leaving) truck.position.z += age * 8;
        const uncovered = !!sign || !end && ['asking', 'ready', 'radio-check', 'telling', 'leaving', 'together'].includes(beat);
        cover.visible = yard && !uncovered && (!end || end === 'never-asked' || end === 'stayed');
        folded.visible = yard && uncovered;
        bonnet.visible = !!roadside || beat === 'ready';
        const flat = !daceMarked(world, 'spare-mended') && (yard || staged?.rescue?.reason === 'stones');
        truck.userData.wheelPivots[0].scale.y = flat ? .64 : 1;
        aerial.visible = !cover.visible;
        blanket.visible = !!roadside && (!fetch?.walking || daceMarked(world, 'told-stay'));
      }
      key.visible = ['asking', 'key', 'night-after'].includes(beat) && !daceMarked(world, 'key-taken') &&
        !daceMarked(world, 'took-it-in-the-night') && distance(here, places.key) < 24;
      if (key.visible) {
        positionAt(key, places.key, drawnShift);
        key.position.y += 1.45;
      }
      stones.visible = !!fetch && (fetch.reason === 'rocks' || fetch.walking) && distance(here, places.walking) < 85;
      tracks.visible = !!fetch && distance(here, places['his-tracks']) < 85;
      if (stones.visible) positionAt(stones, places.walking, drawnShift);
      if (tracks.visible) positionAt(tracks, places['his-tracks'], drawnShift);
    },
    dispose() {
      const resources = new Set();
      root.traverse(node => {
        if (!node.isMesh) return;
        for (const resource of [node.geometry, node.material]) {
          if (!resource.userData.sharedAsset) resources.add(resource);
        }
      });
      for (const resource of resources) resource.dispose();
      root.removeFromParent();
    },
  };
}
