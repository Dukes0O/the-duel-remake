// Home Ground's dug water, the cellar hatch and the bucket's working outline. The land's existing edited-ground
// view draws the actual cuts, as it does in the Dig. This view reads the record and never changes it.
import * as THREE from 'three';
import {HOME_DIG, HOME_POND} from '../content/home-ground.js';
import {buildInLand, groundPoint, pondInLand, pondConnected, wellInLand} from '../home-rule.js';

export function createHomeDigLook(parent, ground) {
  const group = new THREE.Group(); group.name = 'home-digging'; parent.add(group);
  const geometries = [], keep = shape => (geometries.push(shape), shape);
  const materials = {
    water: new THREE.MeshStandardMaterial({color: 0x547a74, roughness: .26, metalness: .18, transparent: true, opacity: .8}),
    pipe: new THREE.MeshStandardMaterial({color: 0x645d4c, roughness: .82, metalness: .4}),
    rim: new THREE.MeshStandardMaterial({color: 0x756e60, roughness: 1}),
    dark: new THREE.MeshStandardMaterial({color: 0x26241e, roughness: 1}),
    wood: new THREE.MeshStandardMaterial({color: 0x66563e, roughness: 1}),
    outline: new THREE.LineBasicMaterial({color: 0xe8e2cf}),
  };
  const box = keep(new THREE.BoxGeometry(1, 1, 1));
  const water = new THREE.Mesh(keep(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2)), materials.water);
  water.name = 'home-pond-water'; water.receiveShadow = true; group.add(water);
  const pipe = new THREE.Mesh(keep(new THREE.CylinderGeometry(.035, .035, 1, 8)), materials.pipe);
  pipe.name = 'home-pond-pipe'; group.add(pipe);
  const cellar = new THREE.Group(); cellar.name = 'home-cellar-hatch'; group.add(cellar);
  function slab(material, x, y, z, w, h, d) {
    const mesh = new THREE.Mesh(box, material); mesh.position.set(x, y, z); mesh.scale.set(w, h, d);
    mesh.receiveShadow = mesh.castShadow = true; cellar.add(mesh); return mesh;
  }
  slab(materials.dark, 0, .09, 0, 1.25, .05, 1.5);
  for (const x of [-.7, .7]) slab(materials.rim, x, .14, 0, .15, .18, 1.8);
  for (const z of [-.85, .85]) slab(materials.rim, 0, .14, z, 1.55, .18, .15);
  const hatch = slab(materials.wood, .86, .5, 0, 1.25, .1, 1.5); hatch.rotation.z = .65;
  for (const z of [-.55, .55]) slab(materials.pipe, .86, .54, z, 1.15, .04, .08).rotation.z = .65;
  const outline = new THREE.LineSegments(keep(new THREE.EdgesGeometry(new THREE.BoxGeometry(1, .04, 1))), materials.outline);
  outline.name = 'home-bucket-mark'; group.add(outline);
  const up = new THREE.Vector3(0, 1, 0);
  return {
    update(record, state, shift) {
      group.visible = !!record;
      if (!record) return;
      const pond = record.pond;
      water.visible = !!pond && pond.litres > 0;
      pipe.visible = pondConnected(record);
      if (pond) {
        const at = pondInLand(pond), share = pond.litres / HOME_POND.litres;
        const depth = HOME_DIG.depth * pond.scoops / HOME_DIG.scoops;
        const base = ground(at.x, at.z, shift);
        water.position.set(at.x, base + share * HOME_DIG.depth + .025, at.z);
        const width = Math.min(3.9, 2 + share * 2); water.scale.set(width, 1, width);
        if (pipe.visible) {
          const well = wellInLand(record.well), a = new THREE.Vector3(well.x, ground(well.x, well.z, shift) + .18, well.z);
          const b = new THREE.Vector3(at.x - 1.8, base + depth + .08, at.z);
          pipe.position.copy(a).add(b).multiplyScalar(.5); pipe.scale.y = a.distanceTo(b);
          pipe.quaternion.setFromUnitVectors(up, b.sub(a).normalize());
        }
      }
      const shed = record.builds.find(row => row.kind === 'shed' && row.stage >= 1) ??
        record.piles?.find(pile => pile.building.kind === 'shed')?.building;
      cellar.visible = !!shed && record.cellar?.dug > 0;
      if (cellar.visible) {
        const at = buildInLand(shed);
        cellar.position.set(at.x, ground(at.x, at.z, shift) + .04, at.z); cellar.rotation.y = at.heading;
        cellar.scale.setScalar(.65 + .35 * record.cellar.dug / HOME_DIG.scoops);
        hatch.visible = record.cellar.dug === HOME_DIG.scoops;
      }
      const target = state.digger?.target;
      outline.visible = !!target;
      if (target) {
        const building = ['tear', 'cellar'].includes(target.kind) && target.row;
        const width = target.kind === 'pond' ? 4 : 2;
        const at = building ? buildInLand(building) : groundPoint(target.cell.i + width / 4, target.cell.j + width / 4);
        const depth = target.kind === 'pond' && record.pond ? HOME_DIG.depth * record.pond.scoops / HOME_DIG.scoops : 0;
        outline.position.set(at.x, ground(at.x, at.z, shift) + depth + .08, at.z);
        outline.scale.set(building ? at.width : width, 1, building ? at.depth : width);
        materials.outline.color.setHex(target.reason ? 0xe0442c : 0xe8e2cf);
      }
    },
    dispose() { group.removeFromParent(); geometries.forEach(shape => shape.dispose()); Object.values(materials).forEach(material => material.dispose()); },
  };
}
