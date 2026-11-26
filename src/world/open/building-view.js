import * as THREE from 'three';
import {BUILDINGS} from './content/buildings.js';
import {buildingWalls, pointInBuilding} from './building-rule.js';
import {stripOfSheet} from '../tin-town-shacks.js';
import {scablandsSurfaceHeightAt} from '../scablands-ground.js';

const palette = {iron: 0x42403c, wood: 0x715944, sheet: 0x89604c, roof: 0x696b60,
  rust: 0x9c5836, brass: 0xb79a57, canvas: 0x747761, water: 0x677979, straw: 0x977345};

function furnish(kind, group, box, cylinder, iron) {
  if (kind === 'anvil') {
    box(group, [0,.25,0], [.55,.5,.55], 'wood');
    box(group, [0,.56,0], [.45,.14,.3], 'iron');
    box(group, [0,.69,0], [.27,.2,.22], 'iron');
    box(group, [0,.84,0], [.76,.12,.3], 'iron');
    cylinder(group, [.46,.84,0], [.015,.13,.3], 'iron').rotation.z = -Math.PI/2;
  } else if (kind === 'gas-bottles') {
    for (const x of [-.17,.17]) {
      cylinder(group, [x,.45,0], [.13,.16,.82], x < 0 ? 'rust' : 'canvas');
      cylinder(group, [x,.89,0], [.07,.13,.12], 'iron');
      box(group, [x,.99,0], [.13,.07,.07], 'brass');
    }
  } else if (kind === 'parts-rack') {
    for (const x of [-.54,.54]) box(group,[x,.69,0],[.06,1.38,.32],'iron');
    for (const y of [.25,.78,1.31]) {
      box(group,[0,y,0],[1.14,.065,.38],'wood');
      for (const x of [-.33,.1,.35]) cylinder(group,[x,y+.1,0],[.1,.12,.14],'iron');
    }
  } else if (kind === 'bench' || kind === 'cot') {
    const bed = kind === 'cot', h = bed ? .38 : .83, w = bed ? .7 : 1.3, d = bed ? 1.65 : .5;
    for (const x of [-1,1]) for (const z of [-1,1])
      box(group,[x*(w/2-.07),h/2,z*(d/2-.07)],[.07,h,.07],'iron');
    box(group,[0,h,0],[w,.12,d],bed ? 'canvas' : 'wood');
    if (bed) box(group,[0,h+.11,-.55],[.52,.12,.29],'straw');
  } else if (kind === 'bucket') {
    cylinder(group,[0,.18,0],[.25,.18,.35],'iron');
    cylinder(group,[0,.36,0],[.22,.22,.01],'water');
    const handle = new THREE.Mesh(new THREE.TorusGeometry(.24,.014,5,14,Math.PI),iron);
    handle.position.y = .3;
    group.add(handle);
  } else if (kind === 'brush') {
    group.rotation.z = -.14;
    box(group,[0,.77,0],[.045,1.48,.045],'wood');
    box(group,[0,.11,0],[.39,.085,.16],'wood');
    box(group,[0,.045,0],[.36,.07,.14],'straw');
  }
}

export function roomCamera(row, floor) {
  const p = pointInBuilding(row);
  return {position: {x: p.x + .65, y: floor + 4, z: p.z + row.size[1]/2 + 2.6},
    target: {x: p.x, y: floor + .65, z: p.z}, side: 'south'};
}

export function createBuildingView() {
  const group = new THREE.Group(), unit = new THREE.BoxGeometry();
  const materials = Object.fromEntries(Object.entries(palette).map(([key, color]) =>
    [key, new THREE.MeshStandardMaterial({color, roughness: .84, metalness: key === 'iron' ? .58 : .1,
      side: THREE.DoubleSide})]));
  function mesh(parent, geometry, at, material) {
    const m = new THREE.Mesh(geometry, materials[material]);
    m.position.fromArray(at);
    m.castShadow = m.receiveShadow = true;
    parent.add(m);
    return m;
  }
  function box(parent, at, size, mat) {
    const m = mesh(parent, unit, at, mat);
    m.scale.fromArray(size);
    return m;
  }
  const cylinder = (parent, at, size, mat) => mesh(parent, new THREE.CylinderGeometry(...size, 12), at, mat);
  const rooms = BUILDINGS.map(row => {
    const root = new THREE.Group(), p = pointInBuilding(row), [w,d,h] = row.size;
    root.name = row.id;
    root.position.set(p.x, scablandsSurfaceHeightAt(p.x,p.z), p.z);
    group.add(root);
    const walls = buildingWalls(row).map(wall => {
      const side = wall.side === 'west' || wall.side === 'east', span = side ? wall.halfZ*2 : wall.halfX*2;
      const panel = new THREE.Group();
      panel.position.set(wall.x-p.x,0,wall.z-p.z);
      if (side) panel.rotation.y = Math.PI/2;
      root.add(panel);
      mesh(panel, stripOfSheet(span,h), [0,0,0], 'sheet');
      for (const x of [-span/2,span/2]) box(panel,[x,h/2,0],[.09,h,.09],'iron');
      box(panel,[0,.35,0],[span,.08,.12],'wood');
      return {side: wall.side, panel};
    });
    box(root,[0,.02,0],[w,.07,d],'wood');
    const roof = mesh(root,stripOfSheet(w+.5,d+.5),[0,h+.1,d/2+.25],'roof');
    roof.name = row.id + '/roof';
    roof.rotation.x = -Math.PI/2+.07;
    for (const thing of row.room.things) {
      const prop = new THREE.Group(), [x,z] = row.room.spots[thing];
      prop.name = thing;
      prop.position.set(x,0,z);
      furnish(thing,prop,box,cylinder,materials.iron);
      root.add(prop);
    }
    if (row.carBay) {
      const [x,z] = row.carBay.at, half = row.carBay.radius;
      for (const sign of [-1,1]) {
        const y = scablandsSurfaceHeightAt(p.x+x+sign*1.65,p.z+z)-root.position.y+.035;
        box(root,[x+sign*1.65,y,z],[.12,.055,half*2],'brass');
        box(root,[x,y,z+sign*half],[3.4,.055,.12],'brass');
      }
    }
    return {row, root, walls, roof};
  });
  return {group, update(worldJob, here) {
    for (const {row,root,walls,roof} of rooms) {
      const inside = worldJob.open.parts.buildings?.inside === row.id;
      root.visible = inside || !here || Math.hypot(root.position.x-here.x,root.position.z-here.z) < 550;
      roof.visible = !inside;
      const side = inside && roomCamera(row, root.position.y).side;
      for (const wall of walls) wall.panel.visible = wall.side !== side;
    }
  }, dispose() {
    const geometries = new Set();
    group.traverse(node => { if (node.geometry) geometries.add(node.geometry); });
    for (const geometry of geometries) geometry.dispose();
    for (const material of Object.values(materials)) material.dispose();
  }};
}
