import * as THREE from 'three';
import {createVehicle} from '../../../vehicles.js';
import {distance, sitePosition} from '../site-rule.js';
import {stripOfSheet} from '../../tin-town-shacks.js';
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

  // Tin Town's corrugated sheets mark the three unplaced destinations until their site art is ready.
  const iron = new THREE.MeshStandardMaterial({color: 0x706052, roughness: .96, side: THREE.DoubleSide});
  const sheet = (parent, width, height, x, z, angle = 0) => {
    const mesh = new THREE.Mesh(stripOfSheet(width, height), iron);
    mesh.position.set(x, 0, z);
    mesh.rotation.y = angle;
    parent.add(mesh);
    return mesh;
  };
  const sites = [
    {id: 'deep-sign', name: 'The Deep Sign', build(site) {
      box(site, 'Well casing', 0x454646, [.48, .62, .48], [-2, .31, 0]);
      sheet(site, 1.5, .45, -1.5, -1.5);
      sheet(site, 1.4, .48, -2.3, -.75, Math.PI / 2);
    }},
    {id: 'hangar', name: 'The Hangar', build(site) {
      sheet(site, 8, 3.3, 0, -3.8);
      sheet(site, 7, 2.8, -3.9, -.3, Math.PI / 2);
      sheet(site, 4, 2.4, 3.9, -1.8, Math.PI / 2);
      const roof = sheet(site, 8, 3.9, 0, -3.8);
      roof.rotation.x = Math.PI / 2;
      roof.position.y = 3.15;
    }},
    {id: 'crows-step', name: "The Crow's Step", build(site) {
      sheet(site, 4.8, .9, 0, -2.4);
      for (const x of [-2.1, 2.1]) box(site, 'Lookout rail post', 0x554739, [.16, 1.25, .16], [x, .625, -2.45]);
      box(site, 'Lookout bench', 0x635643, [1.9, .12, .42], [-.9, .48, -1.8]);
    }},
  ].map(({id, name, build}) => {
    const mesh = new THREE.Group();
    mesh.name = name;
    build(mesh);
    root.add(mesh);
    return {id, mesh};
  });
  let departureAt = null;

  return {
    update(open, sign, here, drawnShift) {
      const enabled = open?.parts.threads?.places.checkpointsEnabled;
      const world = open?.world, record = enabled && world.open.threads[DACE_ID];
      root.visible = !!enabled;
      if (!enabled) return;
      for (const {id, mesh} of sites) {
        const at = sitePosition(id, world.open.landSeed);
        mesh.visible = (record?.cast.site === id && !['sign', 'asking'].includes(record.beat) || world.open.found.includes(id)) &&
          distance(here, at) < 350;
        if (mesh.visible) positionAt(mesh, at, drawnShift);
      }
      if (!record) {
        departureAt = null;
        for (const item of [truck, key, stones, tracks]) item.visible = false;
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
