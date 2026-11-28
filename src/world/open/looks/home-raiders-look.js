// HOME-GROUND-4: mounted Road Rats. The cage, exposed motor, staggered wheels and
// colours follow the parked Rats' Nest buggies. Bikes use the same scrap frame kit.
// The existing Road Rat figures sit on them. Every pose comes from the home rule.
import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {scrapBuilder, yardSurface} from '../../scablands-yard-look.js';
import {createStoryPeople} from '../../jobs/story-people.js';
import {createStoryPeopleView} from '../../story-people-view.js';
import {scablandsSurfaceHeightAt} from '../../scablands-ground.js';

export function createHomeRaidersLook(loadAsset) {
  const group = new THREE.Group(); group.name = 'home-road-rats';
  const figures = createStoryPeopleView(loadAsset); group.add(figures.group);
  const steel = yardSurface(), rubber = new THREE.MeshStandardMaterial({color: 0x24221f, roughness: .96});
  const rim = new THREE.MeshStandardMaterial({color: 0x76634e, roughness: .65, metalness: .7});
  const geometry = [], models = new Map();
  const keep = value => { geometry.push(value); return value; };
  let cast = [], castKey = '';
  function model(kind, id) {
    if (models.has(id)) return models.get(id);
    const root = new THREE.Group(); root.name = 'home-raid-' + kind;
    const builder = scrapBuilder(), f = builder.frame(0, 0, 0, 0), wheels = [];
    const tube = (a, b, width = .06, color = 0x56463a) => f.strut(a, b, width, color);
    const wheel = (x, z, radius, width) => {
      const spin = new THREE.Group(); spin.position.set(x, radius, z); root.add(spin);
      const tyre = new THREE.Mesh(keep(new THREE.TorusGeometry(radius - width / 2, width / 2, 8, 20).rotateY(Math.PI / 2)), rubber);
      const hub = new THREE.Mesh(keep(new THREE.CylinderGeometry(radius * .45, radius * .45, width * 1.06, 10).rotateZ(Math.PI / 2)), rim);
      spin.add(tyre, hub);
      for (let n = 0; n < 6; n++) {
        const spoke = new THREE.Mesh(keep(new THREE.BoxGeometry(width * .7, radius * 1.6, .035)), rim);
        spoke.rotation.x = n * Math.PI / 3; spin.add(spoke);
      }
      wheels.push({spin, radius});
    };
    if (kind === 'bike') {
      for (const z of [-.92, .92]) wheel(0, z, .4, .19);
      for (const side of [-1, 1]) {
        const x = side * .12;
        tube([x, .4, -.92], [x, .8, -.27]); tube([x, .8, -.27], [x, .48, .18]);
        tube([x, .48, .18], [x, .95, .58]); tube([x, .95, .58], [x, .8, -.27]);
        tube([x, .4, .92], [x, 1.12, .55], .055, 0x9a8b75);
        tube([x, .44, -.92], [x, .48, .18]);
        tube([side * .2, .48, -.6], [side * .22, .48, .25], .08, 0x9a8b75);
        tube([0, 1.12, .55], [side * .4, 1.12, .4], .045);
      }
      f.box(.4, .22, .58, 0, .83, .15, 0x87372d, {ribs: true});
      f.box(.35, .11, .65, 0, .83, -.4, 0x292722);
      f.box(.36, .32, .38, 0, .49, -.08, 0x403b33, {ribs: true});
      f.box(.25, .1, .65, 0, .86, -.88, 0x67543e);
      f.box(.22, .22, .12, 0, 1.03, .77, 0xc3b887);
      tube([-.3, .34, -.15], [.3, .34, -.15], .06);
    } else {
      for (const side of [-1, 1]) {
        for (const [z, radius] of [[1.05, .38], [-1.05, .47]]) {
          wheel(side * .89, z, radius, .28);
          tube([side * .41, .41, z + .3], [side * .89, radius, z], .07);
        }
        const rail = [[side * .45, .55, 1.64], [side * .56, .76, .47], [side * .48, 1.52, -.02],
          [side * .47, 1.58, -.67], [side * .6, .68, -1.44]];
        for (let n = 1; n < rail.length; n++) tube(rail[n - 1], rail[n], .09);
        tube([side * .64, .45, .85], [side * .65, .5, -1.4], .08);
        tube([side * .59, .53, .54], [side * .47, 1.58, -.67], .046, 0x87372d);
      }
      for (const [y, z] of [[1.52, -.02], [1.58, -.67], [.53, 1.65]]) tube([-.47, y, z], [.47, y, z]);
      f.box(.95, .09, 1.05, 0, .63, 1.04, 0x87372d, {ribs: true, lean: -.15});
      f.box(1.02, .07, .7, 0, 1.6, -.34, 0x67543e, {ribs: true});
      f.box(.81, .12, 1.22, 0, .39, -.16, 0x302d28);
      f.box(.55, .57, .14, 0, .79, -.55, 0x292722);
      f.box(.67, .44, .56, 0, .61, -1.16, 0x403b33, {ribs: true});
      for (const side of [-1, 1]) {
        tube([side * .25, .66, -1.12], [side * .41, .91, -1.49], .1);
        f.box(.2, .2, .1, side * .38, .69, 1.5, 0xc3b887);
      }
    }
    const body = new THREE.Mesh(keep(mergeGeometries(builder.parts, false)), steel);
    builder.parts.forEach(part => part.dispose()); root.add(body);
    root.traverse(node => { if (node.isMesh) node.castShadow = node.receiveShadow = true; });
    group.add(root); const result = {root, wheels}; models.set(id, result); return result;
  }
  return {
    group,
    update(world, here, seconds, shift) {
      const rows = world.open?.parts.home?.raid?.riders ?? [];
      const alive = rows.filter(row => row.health > 0 && !row.fled);
      for (const value of models.values()) value.root.visible = false;
      for (const row of rows) {
        const {root, wheels} = model(row.kind, row.id), {x, z} = row.position;
        root.visible = !row.fled;
        root.position.set(x, scablandsSurfaceHeightAt(x, z) + (shift?.(x, z) ?? 0), z);
        root.rotation.set(0, row.yaw, row.health <= 0 ? row.kind === 'bike' ? 1.2 : .18 : 0);
        for (const {spin, radius} of wheels) spin.rotation.x = row.travel / radius;
      }
      const key = alive.map(row => row.id).join('|');
      if (key !== castKey) {
        castKey = key;
        cast = createStoryPeople(alive.map((row, index) => ({id: row.id,
          figure: index % 2 ? 'road-rat-lookout' : 'road-rat-lamp', action: 'sit', seat: 'handcart',
          position: {x: row.position.x, y: scablandsSurfaceHeightAt(row.position.x, row.position.z) + .15, z: row.position.z}, yaw: row.yaw})));
      }
      cast.forEach((person, index) => {
        const row = alive[index], {x, z} = row.position;
        person.position = {x, z, y: scablandsSurfaceHeightAt(x, z) + .15}; person.yaw = row.yaw;
      });
      figures.update({open: world.open, storyPeople: cast}, here, seconds, shift);
    },
    dispose() { figures.dispose(); geometry.forEach(part => part.dispose()); steel.dispose(); rubber.dispose(); rim.dispose(); group.clear(); },
  };
}
