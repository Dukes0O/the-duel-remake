import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {BUILDINGS} from './content/buildings.js';
import {buildingWalls, pointInBuilding} from './building-rule.js';
import {stripOfSheet} from '../tin-town-shacks.js';
import {scablandsSurfaceHeightAt} from '../scablands-ground.js';
import {scrapBuilder} from '../scablands-yard-look.js';
import {createCoalMaterial} from '../ember-pot.js';
import {createSparks} from '../scrap-look.js';

const iron = 0x343b3e, steel = 0x8a9595, wood = 0x775537, oak = 0xaa8555;
const brass = 0xc6a35e, rust = 0x98563c, ash = 0x282524, canvas = 0x686f56;
const halfPi = Math.PI / 2;

function cylinder(f, x, y, z, top, base, height, color, segments = 12) {
  f.add(new THREE.CylinderGeometry(top, base, height, segments).translate(x, y, z), color);
}

function ring(f, x, y, z, radius, wire, color, {arc = 2 * Math.PI, turn = 0, tilt = 0} = {}) {
  f.add(new THREE.TorusGeometry(radius, wire, 5, 20, arc).rotateX(tilt).rotateY(turn).translate(x, y, z), color);
}

function anvil(f) {
  cylinder(f, 0, .27, 0, .29, .35, .54, wood, 9);
  cylinder(f, 0, .45, 0, .316, .32, .045, iron, 9);
  // The waist flares into the feet and heel. The bright working face runs out into a tapered horn.
  const outline = new THREE.Shape();
  const profile = [[-.32, .54], [.26, .54], [.21, .63], [.10, .67], [.15, .78],
    [.32, .81], [.32, .94], [-.48, .94], [-.48, .85], [-.17, .77], [-.13, .66], [-.29, .62]];
  outline.moveTo(...profile[0]);
  for (const point of profile.slice(1)) outline.lineTo(...point);
  outline.closePath();
  f.add(new THREE.ExtrudeGeometry(outline, {depth: .23, bevelEnabled: false}).translate(0, 0, -.115), iron);
  f.box(.8, .025, .25, -.08, .95, 0, steel);
  f.add(new THREE.ConeGeometry(.137, .45, 12).rotateZ(-halfPi).translate(.535, .838, 0), steel);
}

function bottles(f) {
  for (const [x, height, paint] of [[-.395, 1.30, 0x685c45], [-.070, 1.10, 0x527678]]) {
    const profile = [[.11, 0], [.155, .05], [.155, height - .24], [.14, height - .13],
      [.08, height - .07], [.048, height - .05], [.048, height]];
    f.add(new THREE.LatheGeometry(profile.map(([r,y]) => new THREE.Vector2(r,y)), 14).translate(x, 0, 0), paint);
    cylinder(f, x, height + .04, 0, .036, .04, .08, brass);
    ring(f, x, height + .09, 0, .073, .014, rust, {tilt: halfPi});
    cylinder(f, x, height - .30, 0, .158, .158, .075, oak);
  }
  // A short length of chain around the bottles, both ends returning to eyes on the back wall.
  const chain = new THREE.CatmullRomCurve3([[-.56,.81,-.48],[-.56,.72,.06],[-.40,.68,.18],
    [-.03,.68,.18],[.095,.74,.03],[.095,.81,-.48]].map(p => new THREE.Vector3(...p)));
  for (let i = 0; i <= 26; i++) {
    const t = i / 26, p = chain.getPointAt(t), v = chain.getTangentAt(t);
    const link = new THREE.TorusGeometry(.033, .009, 4, 10).scale(1.52, .85, 1);
    link.rotateX(i % 2 * 1.12).rotateY(-Math.atan2(v.z,v.x)).translate(p.x,p.y,p.z);
    f.add(link, steel);
  }
}

function bench(f, forge) {
  for (const x of [-.49,.49]) for (const z of [-.21,.21])
    f.strut([x*1.13,0,z*1.13], [x,.78,z], .073, iron);
  f.strut([-.54,.22,.22], [.54,.22,.22], .06, wood);
  for (const [i, color] of [wood,oak,0x846842].entries()) f.box(1.10,.082,.18,0,.80,(i-1)*.188,color);
  if (!forge) return; // Moss sleeps on this bench.
  // Cross-peen hammer, open tongs and a stack of cropped strap iron.
  f.strut([-.51,.86,.20],[-.22,.87,-.11],.044,oak);
  f.box(.23,.10,.10,-.22,.90,-.11,steel,{about:-.63});
  for (const sign of [-1,1]) {
    f.strut([sign*.085,.86,.24],[-sign*.052,.87,-.14],.024,steel);
    f.strut([-sign*.052,.87,-.14],[-sign*.025,.87,-.21],.024,iron);
  }
  for (let i = 0; i < 3; i++) f.box(.27,.026,.095,.38,.86+i*.028,-.05+i*.02,
    i === 1 ? steel : rust,{about:.16+i*.23});
}

function cot(f) {
  for (const z of [-.67,.67]) for (const side of [-1,1])
    f.strut([side*.32,0,z],[-side*.32,.40,z],.045,iron);
  for (const side of [-1,1]) f.strut([side*.34,.39,-.79],[side*.34,.39,.79],.044,oak);
  // Slung canvas sags between the rails. A striped bedroll lies across the head.
  for (const s of [-1,1]) f.skin([[0,.32,-.77],[s*.34,.40,-.77],[s*.34,.40,.77],[0,.32,.77]],canvas);
  for (const [x,width,color] of [[0,.59,0x9a8566],[-.19,.04,wood],[.19,.04,wood]]) {
    const r = width > .1 ? .105 : .109;
    f.add(new THREE.CylinderGeometry(r,r,width,12).rotateZ(halfPi).translate(x,.45,-.61),color);
  }
}

function rack(f) {
  for (const x of [-.52,.52]) for (const z of [-.16,.16]) f.box(.045,1.48,.045,x,.74,z,iron);
  f.strut([-.52,.1,-.16],[.52,1.41,-.16],.04,rust);
  for (const [i,y] of [.26,.81,1.37].entries()) {
    f.box(1.1,.052,.39,0,y,0,wood);
    for (const x of [-.32,-.13,.06]) {
      const pipe = new THREE.CylinderGeometry(.08,.08,.31,10,1,true);
      f.add(pipe.rotateX(halfPi).translate(x,y+.107,0), i === 1 ? rust : steel);
    }
    ring(f,.35,y+.16,0,.13,.033,iron,{turn:.22});
  }
}

function hearth(f) {
  // The opening faces the room. A flared sheet hood draws the smoke up a narrow stovepipe.
  for (const s of [-1,1]) for (let i = 0; i < 4; i++)
    f.box(.75,.14,.13,-.02,.125+i*.147,s*.34, i%2 ? 0x744f43 : 0x61463e);
  f.box(.68,.10,.58,-.03,.39,0,ash);
  f.add(new THREE.CylinderGeometry(.16,.57,.48,4,1,true).rotateY(Math.PI/4)
    .scale(1.18,1,.98).translate(-.04,1.62,0),iron);
  cylinder(f,-.04,2.36,0,.113,.113,1.02,0x443c37);
  for (const y of [1.92,2.60]) cylinder(f,-.04,y,0,.124,.124,.038,steel);
}

function scaleOnFloor(f) {
  for (let i = 0; i < 53; i++) {
    // Hammer scale falls thickest at the foot of the anvil.
    const angle = i * 2.40, radius = .10 + (i % 11) * .085;
    const x = Math.cos(angle)*radius, z = Math.sin(angle)*radius;
    const r = .019 + (i % 4)*.009;
    f.add(new THREE.TetrahedronGeometry(r).scale(1.4,.33,1).rotateY(angle).translate(x,.061,z),
      [ash,0x686665,0x413b39,0x595049][i%4]);
  }
}

function buckets(f) {
  for (const [x,z,s,paint] of [[0,0,1,0x647c80],[.16,.51,.79,0x916b4e]]) {
    const profile = [[.13,0],[.17,.025],[.225,.36],[.24,.38],[.216,.38],[.16,.05]];
    f.add(new THREE.LatheGeometry(profile.map(([r,y]) => new THREE.Vector2(r*s,y*s)),14).translate(x,0,z), paint);
    ring(f,x,.375*s,z,.226*s,.013,steel,{tilt:halfPi});
    ring(f,x,.32*s,z,.225*s,.014,steel,{arc:Math.PI,turn:.24});
    cylinder(f,x,.26*s,z,.202*s,.202*s,.012,0x536b6e);
  }
}

function brushes(f) {
  for (const [x,z,height] of [[0,0,1.36],[.39,-.11,.91]]) {
    f.strut([x,.13,z],[x-.13,height,z-.28],.045,oak);
    f.box(.34,.07,.13,x,.16,z,wood);
    for (let i=0; i<8; i++) f.strut([x-.136+i*.039,.137,z],[x-.15+i*.043,.055,z+.025],.034,0xab915d);
  }
}

function hose(f) {
  f.box(.30,.12,.16,0,1.17,-.015,iron);
  for (let i=0; i<4; i++) ring(f,0,.86,.05+i*.033,.295,.029,0x384d47,{turn:.055*i});
  const tail = new THREE.CatmullRomCurve3([[.24,1.03,.15],[.37,.73,.18],[.38,.34,.23],
    [.49,.14,.35],[.64,.105,.45]].map(p => new THREE.Vector3(...p)));
  f.add(new THREE.TubeGeometry(tail,14,.029,7,false),0x384d47);
  f.strut([.63,.105,.45],[.77,.10,.54],.071,brass);
}

function drain(f) {
  cylinder(f,0,.065,0,.33,.33,.02,ash,20);
  ring(f,0,.08,0,.31,.027,steel,{tilt:halfPi});
  for (let i=-3; i<=3; i++) {
    const z = i*.078, length = 2*Math.sqrt(.30**2-z**2);
    f.box(length,.033,.035,0,.084,z,iron);
  }
}

const furnishings = {anvil, bench, cot, 'gas-bottles': bottles, 'parts-rack': rack,
  hearth, 'forge-scale': scaleOnFloor, bucket: buckets, brush: brushes, hose, 'floor-drain': drain};

function furniture(id, forge, material) {
  const {parts,frame} = scrapBuilder();
  furnishings[id](frame(0,0,0,0), forge);
  const prop = new THREE.Mesh(mergeGeometries(parts), material);
  prop.name = id;
  prop.castShadow = prop.receiveShadow = true;
  return prop;
}

export function roomCamera(row, floor) {
  const p = pointInBuilding(row);
  return {position: {x: p.x + .65, y: floor + 4, z: p.z + row.size[1]/2 + 2.6},
    target: {x: p.x, y: floor + .65, z: p.z}, side: 'south'};
}

export function createBuildingView() {
  const group = new THREE.Group(), unit = new THREE.BoxGeometry();
  const palette = {iron, wood, sheet: 0x89604c, roof: 0x696b60, brass, soot: 0x383434, floor: 0x483d34};
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
  materials.furniture = new THREE.MeshStandardMaterial({vertexColors: true, roughness: .77, metalness: .24, side: THREE.DoubleSide});
  materials.coals = createCoalMaterial();
  const sparkOrigin = {x: 0, y: 0, z: 0}, sparkDirection = {x: 1, z: 0};
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
      const sheet = mesh(panel, stripOfSheet(span,h), [0,0,0], 'sheet');
      for (const x of [-span/2,span/2]) box(panel,[x,h/2,0],[.09,h,.09],'iron');
      box(panel,[0,.35,0],[span,.08,.12],'wood');
      return {side: wall.side, panel, sheet};
    });
    box(root,[0,.02,0],[w,.07,d],'floor');
    const roof = mesh(root,stripOfSheet(w+.5,d+.5),[0,h+.1,d/2+.25],'roof');
    roof.name = row.id + '/roof';
    roof.rotation.x = -Math.PI/2+.07;
    const interior = new THREE.Group();
    interior.name = row.id + '/interior';
    root.add(interior);
    for (const thing of row.room.things) {
      const id = thing.id ?? thing, [x,z] = typeof thing === 'string' ? row.room.spots[id] : thing.at;
      const prop = furniture(id, row.id === 'forge-shed', materials.furniture);
      prop.position.set(x,0,z);
      interior.add(prop);
    }
    const doorway = new THREE.PointLight(0xffe4bd, 7, 3.2);
    doorway.name = 'Doorway light';
    doorway.position.set(0,.82,d/2+.08);
    interior.add(doorway);
    const sill = box(interior,[0,.064,d/2],[row.door.width,.034,.20],'wood');
    sill.name = 'Worn threshold';
    let sparks, fire;
    const stove = interior.getObjectByName('hearth');
    if (stove) {
      const coals = mesh(stove,new THREE.CircleGeometry(.29,16),[.02,.449,0],'coals');
      coals.rotation.x = -halfPi;
      fire = new THREE.PointLight(0xff792d, 5, 3);
      fire.position.set(.19,.69,0);
      stove.add(fire);
      sparks = createSparks(8);
      sparks.position.set(.04,.51,0);
      sparks.scale.set(.14,.27,.14);
      stove.add(sparks);
    }
    if (row.carBay) {
      const [x,z] = row.carBay.at, half = row.carBay.radius;
      for (const sign of [-1,1]) {
        const y = scablandsSurfaceHeightAt(p.x+x+sign*1.65,p.z+z)-root.position.y+.035;
        box(root,[x+sign*1.65,y,z],[.12,.055,half*2],'brass');
        box(root,[x,y,z+sign*half],[3.4,.055,.12],'brass');
      }
    }
    return {row, root, walls, roof, interior, doorway, sparks, fire};
  });
  return {group, update(worldJob, here, seconds = 0) {
    group.visible = !!worldJob.serviceSheds;
    if (!group.visible) return;
    for (const {row,root,walls,roof,interior,doorway,sparks,fire} of rooms) {
      const inside = worldJob.open.parts.buildings?.inside === row.id;
      root.visible = inside || !here || Math.hypot(root.position.x-here.x,root.position.z-here.z) < 550;
      roof.visible = !inside;
      const side = inside && roomCamera(row, root.position.y).side;
      for (const wall of walls) {
        wall.panel.visible = wall.side !== side;
        wall.sheet.material = inside ? materials.soot : materials.sheet;
      }
      // A walker can still see the fittings through the doorway on approach.
      interior.visible = inside || !here || Math.hypot(root.position.x-here.x,root.position.z-here.z) < 25;
      doorway.visible = inside;
      if (fire) fire.visible = inside;
      if (!interior.visible) continue;
      const dark = worldJob.definition?.open?.partOfDay === 'dark';
      doorway.color.setHex(dark ? 0xb7d5ff : 0xffe4bd);
      doorway.intensity = dark ? 2.8 : 7;
      if (fire) {
        fire.intensity = 5 + .35 * Math.sin(seconds * 5);
        materials.coals.uniforms.uTime.value = seconds;
        sparks.userData.place(seconds, sparkOrigin, sparkDirection);
      }
    }
  }, dispose() {
    for (const {sparks} of rooms) sparks?.material.dispose();
    const geometries = new Set();
    group.traverse(node => { if (node.geometry) geometries.add(node.geometry); });
    for (const geometry of geometries) geometry.dispose();
    for (const material of Object.values(materials)) material.dispose();
  }};
}
