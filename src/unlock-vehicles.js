import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { createDriver } from './driver.js';
import { prepareVehicleDamage } from './vehicles.js';

// Original reward vehicles. One builder supplies both the game and editable GLBs.
// Metres, +Y up, +Z forward, +X driver-left. No external model dependencies.
export const UNLOCK_VEHICLE_DIMENSIONS = Object.freeze({
  dusthawk_rally: { width: 2.10, length: 4.20, height: 1.68, wheelRadius: .41 },
  banshee_muscle: { width: 2.26, length: 5.10, height: 1.47, wheelRadius: .43 },
  viper_proto: { width: 2.20, length: 4.90, height: 1.10, wheelRadius: .39 },
  titan_monster: { width: 2.80, length: 5.20, height: 3.60, wheelRadius: .98 },
});
const defaults = {
  dusthawk_rally: [0xe4e3d8, 0x54a852], banshee_muscle: [0xd55b25, 0x161d21],
  viper_proto: [0x246ab3, 0xe7e5dc], titan_monster: [0x6a3c99, 0x9bd12c],
};

export function createUnlockedVehicle({ key, color, accent } = {}) {
  if (!Object.hasOwn(UNLOCK_VEHICLE_DIMENSIONS, key)) return null;
  const vehicle = new THREE.Group(); vehicle.name = key;
  const m = materials(color ?? defaults[key][0], accent ?? defaults[key][1]);
  const data = vehicle.userData;
  Object.assign(data, { paint: m.paint, originalColor: m.paint.color.clone(), wheels: [], wheelPivots: [], brakeLights: [], boostFlames: [], damageMeshes: [], size: { ...UNLOCK_VEHICLE_DIMENSIONS[key] }, unlockKey: key });
  const b = batch(vehicle);
  if (key === 'dusthawk_rally') rally(vehicle, b, m);
  if (key === 'banshee_muscle') muscle(vehicle, b, m);
  if (key === 'viper_proto') prototype(vehicle, b, m);
  if (key === 'titan_monster') monster(vehicle, b, m);
  b.finish(data);
  addFittedLivery(vehicle, m, key);
  addPanelSeams(vehicle, m, key);
  prepareVehicleDamage(vehicle);
  vehicle.updateMatrixWorld(true);
  return vehicle;
}

function materials(color, accent) {
  const result = {
    paint: new THREE.MeshPhysicalMaterial({ name: 'Lacquered body', color, metalness: .36, roughness: .31, clearcoat: .85, clearcoatRoughness: .15 }),
    accent: new THREE.MeshPhysicalMaterial({ name: 'Race livery', color: accent, metalness: .23, roughness: .34, clearcoat: .65, clearcoatRoughness: .16 }),
    carbon: new THREE.MeshStandardMaterial({ name: 'Carbon and trim', color: 0x12191e, roughness: .46, metalness: .32 }),
    rubber: new THREE.MeshStandardMaterial({ name: 'Tire rubber', color: 0x101318, roughness: .89 }),
    glass: new THREE.MeshPhysicalMaterial({ name: 'Glass', color: 0x709498, metalness: .22, roughness: .055, clearcoat: 1, transparent: true, opacity: .3, depthWrite: false, side: THREE.DoubleSide }),
    alloy: new THREE.MeshStandardMaterial({ name: 'Machined aluminum', color: 0xb9c1c5, metalness: .92, roughness: .24 }),
    darkAlloy: new THREE.MeshStandardMaterial({ name: 'Dark machined metal', color: 0x414c52, metalness: .78, roughness: .38 }),
    headlight: new THREE.MeshStandardMaterial({ name: 'Headlamp lenses', color: 0xfff0d2, emissive: 0xffdb9a, emissiveIntensity: .85, roughness: .17 }),
    brake: new THREE.MeshStandardMaterial({ name: 'Brake lenses', color: 0x98231c, emissive: 0xff3224, emissiveIntensity: 1.4, roughness: .3 }),
    plate: new THREE.MeshStandardMaterial({ name: 'Blank registration plate', color: 0xcac8b9, roughness: .63, metalness: .2 }),
    exhaust: new THREE.MeshStandardMaterial({ name: 'Exhaust inner', color: 0x080c0e, roughness: .94 }),
    seat: new THREE.MeshStandardMaterial({ name: 'Cabin fabric', color: 0x273039, roughness: .92 }),
    tireMark: new THREE.MeshStandardMaterial({ name: 'Raised sidewall rubber', color: 0x262a2c, roughness: .94 }),
  };
  return result;
}

function batch(group) {
  const bins = new Map();
  const add = (geometry, material, position = [0, 0, 0], rotation = [0, 0, 0], scale = [1, 1, 1]) => {
    const matrix = new THREE.Matrix4().compose(new THREE.Vector3(...position), new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation)), new THREE.Vector3(...scale));
    const transformed = geometry.clone().applyMatrix4(matrix), copy = transformed.index ? transformed.toNonIndexed() : transformed.clone(); transformed.dispose();
    for (const name of Object.keys(copy.attributes)) if (!['position', 'normal', 'uv'].includes(name)) copy.deleteAttribute(name);
    if (!copy.attributes.uv) copy.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(copy.attributes.position.count * 2), 2));
    if (!bins.has(material)) bins.set(material, []); bins.get(material).push(copy);
  };
  const box = (material, size, p, r = [0, 0, 0], round = .025) => {
    const g = round > 0 ? new RoundedBoxGeometry(...size, 2, Math.min(round, ...size.map(v => v * .22))) : new THREE.BoxGeometry(...size);
    add(g, material, p, r); g.dispose();
  };
  const tube = (material, points, radius = .028, segments = 16) => {
    const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)));
    const g = new THREE.TubeGeometry(curve, segments, radius, 8, false); add(g, material); g.dispose();
  };
  return { add, box, tube, finish(data) {
    for (const [material, parts] of bins) {
      const geometry = mergeGeometries(parts), mesh = new THREE.Mesh(geometry, material); parts.forEach(g => g.dispose());
      mesh.name = material.name; mesh.castShadow = material.name !== 'Glass'; mesh.receiveShadow = true; group.add(mesh);
      if (data) {
        data.damageMeshes.push({ mesh, rest: geometry.attributes.position.array.slice() });
        if (material.name === 'Brake lenses') data.brakeLights.push(mesh);
      }
    }
    bins.clear();
  } };
}

// Densely sampled body sections retain smooth shoulders and open wheel arches.
function body(sections, axle, radius, wheelY = radius) {
  const points = [], indices = [], ring = 20;
  // Shape-preserving tangents round transitions without overshooting the authored
  // silhouette or changing the collision envelope at the widest body sections.
  const tangent = (i, column) => {
    if (i === 0 || i === sections.length - 1) return 0;
    const a = (sections[i][column] - sections[i - 1][column]) / (sections[i][0] - sections[i - 1][0]);
    const b = (sections[i + 1][column] - sections[i][column]) / (sections[i + 1][0] - sections[i][0]);
    return a * b <= 0 ? 0 : 2 * a * b / (a + b);
  };
  const zs = [];
  for (let z = sections[0][0]; z < sections.at(-1)[0]; z += .055) zs.push(z);
  zs.push(sections.at(-1)[0]);
  for (const z of zs) {
    let i = sections.findIndex(section => section[0] >= z); if (i < 1) i = 1;
    const a = sections[i - 1], b = sections[i], t = Math.max(0, Math.min(1, (z - a[0]) / (b[0] - a[0])));
    const h = b[0] - a[0], t2 = t * t, t3 = t2 * t;
    const [, w, base, shoulder, crown, cw] = a.map((v, j) => (2*t3-3*t2+1)*v + (t3-2*t2+t)*h*tangent(i-1,j) + (-2*t3+3*t2)*b[j] + (t3-t2)*h*tangent(i,j));
    const dz = Math.min(...axle.map(center => Math.abs(z - center))), ar = radius + .055;
    const arch = dz < ar ? wheelY + Math.sqrt(ar * ar - dz * dz) : base + .06;
    const low = Math.min(shoulder - .014, Math.max(base + .06, arch));
    const left = [[-w*.69,base],[-w*.90,Math.min(low,base+.055)],[-w*.955,low],[-w*.993,Math.max(low,shoulder-.075)],[-w,shoulder-.043],[-w*.988,shoulder-.01],[-w*.955,shoulder+.025],[-cw,crown],[-cw*.88,crown+.015],[-cw*.48,crown+.023]];
    for (const [x,y] of [...left,...left.map(([x,y])=>[-x,y]).reverse()]) points.push(x,y,z);
  }
  for (let i = 0; i < zs.length - 1; i++) for (let j = 0; j < ring; j++) {
    const a = i * ring + j, b = i * ring + (j + 1) % ring, c = b + ring, d = a + ring; indices.push(a, c, b, a, d, c);
  }
  for (let j = 1; j < ring - 1; j++) { indices.push(0, j, j + 1); const n = (zs.length - 1) * ring; indices.push(n, n + j + 1, n + j); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(points, 3)); g.setIndex(indices); g.computeVertexNormals(); return g;
}
function sculpt(b, material, sections, axles, radius, wheelY, opening) {
  const g=body(sections,axles,radius,wheelY);
  if(opening) {
    const p=g.attributes.position,kept=[];
    for(let i=0;i<g.index.count;i+=3) {
      const ids=[g.index.getX(i),g.index.getX(i+1),g.index.getX(i+2)],x=ids.reduce((sum,k)=>sum+p.getX(k),0)/3,y=ids.reduce((sum,k)=>sum+p.getY(k),0)/3,z=ids.reduce((sum,k)=>sum+p.getZ(k),0)/3;
      if(Math.abs(x)<opening.width&&y>opening.y&&z>opening.back&&z<opening.front)continue;
      kept.push(...ids);
    }
    g.setIndex(kept);
  }
  b.add(g,material);g.dispose();
}
function panel(b, material, corners) {
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(corners.flat(), 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1], 2)); g.setIndex([0, 1, 2, 0, 2, 3]); g.computeVertexNormals(); b.add(g, material); g.dispose();
}
function cylinder(b, material, radius, length, p, r = [0, 0, 0], segments = 20) {
  const g = new THREE.CylinderGeometry(radius, radius, length, segments); b.add(g, material, p, r); g.dispose();
}

function cabin(b, m, { front, back, frontTop, backTop, baseY, topY, width, roofWidth }) {
  // Glazing is separate from roof panels; the seated driver stays visible.
  panel(b, m.glass, [[-width, baseY, front], [width, baseY, front], [roofWidth, topY, frontTop], [-roofWidth, topY, frontTop]]);
  panel(b, m.glass, [[width, baseY, back], [-width, baseY, back], [-roofWidth, topY, backTop], [roofWidth, topY, backTop]]);
  for (const side of [-1, 1]) {
    panel(b, m.glass, [[side * width, baseY, back], [side * width, baseY, front], [side * roofWidth, topY, frontTop], [side * roofWidth, topY, backTop]]);
    for (const [lower, upper] of [[front, frontTop], [back, backTop]]) b.tube(m.paint, [[side * width, baseY, lower], [side * (roofWidth + width) / 2, (baseY + topY) / 2, (lower + upper) / 2], [side * roofWidth, topY, upper]], .042, 8);
    b.tube(m.carbon, [[side * width, baseY, back], [side * width, baseY, front]], .027, 2);
    b.tube(m.paint, [[side * roofWidth, topY, backTop], [side * roofWidth, topY, frontTop]], .031, 2);
    b.tube(m.carbon, [[side * width, baseY, -.47], [side * roofWidth, topY, -.47]], .032, 2);
    b.box(m.paint, [.16, .10, .25], [side * (width + .13), baseY + .13, front - .15], [0, 0, 0], .028);
    b.box(m.alloy, [.118, .06, .012], [side * (width + .13), baseY + .135, front - .282], [0, 0, 0], .009);
    // Broad rear pillars, window seals and a recessed quarter window make the
    // greenhouse read as a stamped shell rather than a wire cage.
    const pillar=[[side*(width+.008),baseY,back],[side*(width+.008),baseY,back+.19],[side*(roofWidth+.009),topY,backTop+.12],[side*(roofWidth+.009),topY,backTop]];
    panel(b,m.paint,side>0 ? pillar.reverse() : pillar);
    b.tube(m.carbon,[[side*width,baseY+.006,back+.20],[side*width,baseY+.006,front-.05],[side*roofWidth,topY-.024,frontTop-.015]],.014,12);
    const point = t => [side*(width*(1-t)+roofWidth*t)*.65,baseY+(topY-baseY)*t+.009,front+(frontTop-front)*t+.013];
    const p=point(.035),q=point(.19);q[0]-=side*.21;
    b.tube(m.carbon,[p,q],.009,2);
  }
  b.box(m.paint, [roofWidth * 2 + .055, .055, frontTop - backTop + .06], [0, topY + .014, (frontTop + backTop) / 2], [0, 0, 0], .07);
  b.box(m.carbon, [width * 1.76, .13, .23], [0, baseY - .005, front - .20], [0, 0, 0], .03);
  for(const side of[-1,1])for(let i=0;i<5;i++)b.box(m.darkAlloy,[.085,.006,.007],[side*.44,baseY+.063,front-.25+i*.025],[0,0,0],0);
}

function cockpit(vehicle, b, m, position, scale = 1, twoSeats = true) {
  const driver = createDriver({ hero: true, suitColor: m.accent.color.getHex() }); driver.position.set(...position); driver.scale.setScalar(scale); vehicle.add(driver); vehicle.userData.driver = driver;
  const wheel = new THREE.Group(); wheel.position.set(position[0], position[1] + .898 * scale, position[2] + .632 * scale); wheel.rotation.x = .378;
  const rim = new THREE.Mesh(new THREE.TorusGeometry(.16 * scale, .023 * scale, 8, 32), m.carbon); wheel.add(rim);
  const center = new THREE.Mesh(new THREE.BoxGeometry(.24 * scale, .037 * scale, .035 * scale), m.alloy); wheel.add(center);
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(.055 * scale, .055 * scale, .036 * scale, 16).rotateX(Math.PI / 2), m.carbon); wheel.add(hub);
  vehicle.add(wheel); vehicle.userData.steeringPivot = wheel;
  // A real dashboard face and center tunnel remain behind the animated hands.
  b.box(m.carbon,[.31*scale,.115*scale,.034*scale],[position[0],position[1]+.955*scale,position[2]+.755*scale],[.15,0,0],.024);
  for(const dx of[-.082,.082]) {
    cylinder(b,m.alloy,.041*scale,.008*scale,[position[0]+dx*scale,position[1]+.965*scale,position[2]+.730*scale],[Math.PI/2,0,0],16);
    cylinder(b,m.exhaust,.034*scale,.010*scale,[position[0]+dx*scale,position[1]+.965*scale,position[2]+.724*scale],[Math.PI/2,0,0],16);
    b.box(m.plate,[.004*scale,.041*scale,.005*scale],[position[0]+dx*scale,position[1]+.97*scale,position[2]+.718*scale],[0,0,-.6],0);
  }
  if(twoSeats) {
    b.box(m.carbon,[.17*scale,.14*scale,.57*scale],[0,position[1]+.55*scale,position[2]+.28*scale],[0,0,0],.025);
    b.tube(m.alloy,[[0,position[1]+.60*scale,position[2]+.32*scale],[0,position[1]+.73*scale,position[2]+.36*scale]],.014*scale,2);
    cylinder(b,m.carbon,.028*scale,.045*scale,[0,position[1]+.735*scale,position[2]+.36*scale],[0,0,0],12);
  }
  for (const x of twoSeats ? [position[0], -position[0]] : [position[0]]) {
    b.box(m.seat, [.40 * scale, .10 * scale, .42 * scale], [x, position[1] + .57 * scale, position[2] + .04 * scale], [0, 0, 0], .05);
    b.box(m.seat, [.41 * scale, .60 * scale, .12 * scale], [x, position[1] + .86 * scale, position[2] - .15 * scale], [-.13, 0, 0], .06);
    b.box(m.carbon, [.24 * scale, .16 * scale, .11 * scale], [x, position[1] + 1.18 * scale, position[2] - .19 * scale], [0, 0, 0], .035);
  }
}

function wheels(vehicle, m, { radius, width, track, axles, gravel = false, monster = false, spokes = 8, roadSmooth = false, broadSpokes = false }) {
  for (const [axleIndex, z] of axles.entries()) for (const side of [1, -1]) {
    const pivot = new THREE.Group(), spin = new THREE.Group(), b = batch(spin);
    pivot.name = `${axleIndex ? 'Rear' : 'Front'} wheel ${side > 0 ? 'left' : 'right'}`;
    pivot.position.set(side * track, radius, z); pivot.userData = { front: axleIndex === 0, restPosition: pivot.position.clone(), radius };
    const tube = radius * (monster ? .245 : .225), tire = new THREE.TorusGeometry(radius - tube, tube, monster ? 16 : 12, 48).rotateY(Math.PI / 2).scale(width / (tube * 2), 1, 1);
    b.add(tire, m.rubber); tire.dispose();
    const face = side * (width / 2 - .09), rimRadius = radius * (monster ? .45 : .63);
    // The brake disc sits behind open spokes. The outer barrel has no cap, so
    // the wheel has visible depth instead of an opaque coin behind the rim.
    cylinder(b, m.darkAlloy, rimRadius*.86, .021, [face-side*.077, 0, 0], [0, 0, Math.PI / 2], 36);
    const barrel=new THREE.CylinderGeometry(rimRadius,rimRadius*.96,width*.64,40,1,true).rotateZ(Math.PI/2);
    b.add(barrel,m.darkAlloy,[side*.018,0,0]);barrel.dispose();
    const lip = new THREE.TorusGeometry(rimRadius, radius * .026, 8, 36).rotateY(Math.PI / 2); b.add(lip, m.alloy, [face + side * .024, 0, 0]); lip.dispose();
    for (let i = 0; i < spokes; i++) {
      const a = i * Math.PI * 2 / spokes;
      const spokeMaterial=monster ? m.accent : spokes===5&&!broadSpokes ? m.darkAlloy : m.alloy;
      for(const split of spokes===5&&!broadSpokes ? [-1,1] : [0]) {
        const angle=a+split*.075;
        b.box(spokeMaterial,[.045,rimRadius*.79,radius*(broadSpokes ? .23 : spokes===5 ? .077 : .062)],[face+side*.037,Math.cos(angle)*rimRadius*.55,Math.sin(angle)*rimRadius*.55],[angle,0,0],broadSpokes?.022:.012);
      }
    }
    cylinder(b, m.alloy, radius * .145, .06, [face + side * .048, 0, 0], [0, 0, Math.PI / 2], 16);
    for (let i = 0; i < (monster ? 12 : 5); i++) {
      const a = i * Math.PI * 2 / (monster ? 12 : 5), r = monster ? rimRadius * .89 : radius * .095;
      cylinder(b, m.darkAlloy, monster ? .025 : .012, .018, [face + side * .079, Math.cos(a) * r, Math.sin(a) * r], [0, 0, Math.PI / 2], 6);
    }
    const count = roadSmooth ? 0 : monster ? 34 : gravel ? 42 : 52;
    for (let i = 0; i < count; i++) {
      const a = i * Math.PI * 2 / count;
      for (const row of [-1, 1]) b.box(m.rubber, [width * .43, monster ? .069 : gravel ? .023 : .008, monster ? .14 : gravel ? .04 : .018], [row * width * .23, Math.cos(a) * (radius - (monster ? .041 : .013)), Math.sin(a) * (radius - (monster ? .041 : .013))], [a, row * (monster ? .47 : .19), 0], monster ? .022 : 0);
    }
    if(roadSmooth)for(const row of[-.25,.25]) {
      const bandRadius=radius-tube+tube*Math.sqrt(1-(row*2)**2)-.001;
      const treadBand=new THREE.TorusGeometry(bandRadius,.0025,4,64).rotateY(Math.PI/2);
      b.add(treadBand,m.rubber,[row*width,0,0]);treadBand.dispose();
    }
    for(const ringRadius of[radius*.75,radius*.87]) {
      const sidewall=new THREE.TorusGeometry(ringRadius,radius*.006,4,48).rotateY(Math.PI/2);
      const faceX=width*.5*Math.sqrt(1-((ringRadius-(radius-tube))/tube)**2)+.001;
      b.add(sidewall,m.tireMark,[side*faceX,0,0]);sidewall.dispose();
    }
    // Raised molded size bars and short tread shoulders catch grazing light.
    for(let i=0;i<18;i++) {
      const a=i*Math.PI/9;
      const faceX=width*.5*Math.sqrt(1-((radius*.807-(radius-tube))/tube)**2)+.0016;
      b.box(m.tireMark,[.004,radius*.035,radius*(i%3===0 ? .065 : .021)],[side*faceX,Math.cos(a)*radius*.807,Math.sin(a)*radius*.807],[a,0,0],0);
      cylinder(b,m.exhaust,radius*.018,.008,[face-side*.060,Math.cos(a)*rimRadius*.72,Math.sin(a)*rimRadius*.72],[0,0,Math.PI/2],6);
    }
    b.finish();
    pivot.add(spin); vehicle.add(pivot); vehicle.userData.wheels.push(spin); vehicle.userData.wheelPivots.push(pivot);
    const caliper = new THREE.Mesh(new RoundedBoxGeometry(.065, radius * .40, radius * .18, 2, .012), m.accent);
    caliper.position.set(face - side * .065, radius * .12, -radius * .44); pivot.add(caliper);
  }
}

function exhaust(vehicle, b, m, positions, radius = .065) {
  const flameMaterial = new THREE.MeshBasicMaterial({ name: 'Nitro flame', color: 0x82d9ff, transparent: true, opacity: .72, blending: THREE.AdditiveBlending, depthWrite: false });
  for (const p of positions) {
    cylinder(b, m.alloy, radius, .18, p, [Math.PI / 2, 0, 0]);
    cylinder(b, m.exhaust, radius * .78, .015, [p[0], p[1], p[2] - .096], [Math.PI / 2, 0, 0]);
    const flame = new THREE.Mesh(new THREE.ConeGeometry(radius * 1.45, .7, 12).rotateX(-Math.PI / 2).translate(0, 0, -.35), flameMaterial);
    flame.name = 'Nitro exhaust flame'; flame.position.set(p[0], p[1], p[2] - .11); flame.visible = false; vehicle.add(flame); vehicle.userData.boostFlames.push(flame);
  }
}

function rearPlate(b, m, y, z, width = .37, height = .13) {
  b.box(m.carbon, [width + .07, height + .045, .025], [0, y, z + .016], [0, 0, 0], .012);
  b.box(m.plate, [width, height, .008], [0, y, z], [0, 0, 0], .007);
  for (const x of [-width * .38, width * .38]) cylinder(b, m.darkAlloy, .009, .008, [x, y + height * .27, z - .005], [Math.PI / 2, 0, 0], 8);
}

// Shared original mesh craft for the classic starters. These are construction
// helpers, not a second runtime vehicle factory or shared mutable materials.
export const originalVehicleParts = Object.freeze({materials,batch,sculpt,body,panel,cylinder,cabin,cockpit,wheels,exhaust,rearPlate,fitSurfacePatch});

function addFittedLivery(vehicle, m, key) {
  vehicle.updateMatrixWorld(true);
  const surfaces = vehicle.userData.damageMeshes.filter(item => item.mesh.material === m.paint).map(item => item.mesh);
  const detail = batch(vehicle);
  const patch = (corners, axis, side = 1, material = m.accent) => {
    fitSurfacePatch(surfaces,detail,material,corners,axis,side,key === 'titan_monster' ? .88 : .85);
  };
  for (const side of [-1,1]) {
    if(key === 'dusthawk_rally') {
      patch([[.62,-1.84],[.75,-1.84],[1.075,-.48],[1.04,.24],[.72,-.77]],'side',side);
      patch([[.58,-.46],[.69,-.43],[1.02,1.75],[.83,1.90]],'side',side);
      patch([[side*.30,.93],[side*.49,.93],[side*.73,1.83],[side*.54,1.87]],'top');
    } else if(key === 'banshee_muscle') {
      patch([[side*.15,.57],[side*.57,.57],[side*.57,2.33],[side*.15,2.33]],'top',1,m.carbon);
      patch([[.49,-2.27],[.525,-2.27],[.56,2.17],[.525,2.17]],'side',side,m.carbon);
    } else if(key === 'viper_proto') {
      patch([[side*.05,.67],[side*.22,.64],[side*.22,2.20],[side*.05,2.29]],'top');
      patch([[.26,-1.20],[.40,-.88],[.59,.03],[.49,.30],[.29,-.57]],'side',side);
    } else {
      patch([[1.95,-1.95],[2.11,-1.86],[2.32,.62],[2.25,1.03]],'side',side);
      patch([[2.24,-1.65],[2.30,-1.74],[2.10,.36],[1.99,.62]],'side',side);
      patch([[side*.12,1.02],[side*.27,1.02],[side*.69,1.90],[side*.50,1.94]],'top');
    }
  }
  detail.finish(vehicle.userData);
}

// Clip the actual body triangles against an authored 2D patch. Every new vertex
// stays on its source triangle, including wheel-arch/shoulder creases. Sampling
// a coarse grid here would bridge those creases and flicker through the paint.
function fitSurfacePatch(surfaces,detail,material,corners,axis='top',side=1,minSide=.5,lift=.004) {
  const outline=corners.map(p=>new THREE.Vector2(...p)),faces=THREE.ShapeUtils.triangulateShape(outline,[]),positions=[],normals=[];
  const project=p=>new THREE.Vector2(axis==='side'?p.y:p.x,axis==='front'?p.y:p.z),cross=(a,b,p)=>(b.x-a.x)*(p.y-a.y)-(b.y-a.y)*(p.x-a.x);
  for(const mesh of surfaces) {
    const a=mesh.geometry.attributes.position,n=mesh.geometry.attributes.normal,index=mesh.geometry.index,count=index?.count??a.count;
    for(let i=0;i<count;i+=3) {
      const tri=[0,1,2].map(j=>{const k=index?index.getX(i+j):i+j,p=new THREE.Vector3().fromBufferAttribute(a,k);return{p,n:new THREE.Vector3().fromBufferAttribute(n,k),q:project(p)};});
      const faceNormal=tri[1].p.clone().sub(tri[0].p).cross(tri[2].p.clone().sub(tri[0].p)).normalize();
      if(axis==='side' ? faceNormal.x*side<.25||tri.every(v=>v.p.x*side<minSide) : axis==='front' ? faceNormal.z*side<.25 : faceNormal.y<.30)continue;
      for(const face of faces) {
        const clip=face.map(k=>outline[k]),sign=Math.sign(cross(clip[0],clip[1],clip[2]));let polygon=tri;
        for(let edge=0;edge<3&&polygon.length;edge++) {
          const start=clip[edge],end=clip[(edge+1)%3],next=[];
          for(let j=0;j<polygon.length;j++) {
            const p=polygon[j],q=polygon[(j+1)%polygon.length],dp=cross(start,end,p.q)*sign,dq=cross(start,end,q.q)*sign;
            if(dp>=-1e-8)next.push(p);
            if((dp>=0)!==(dq>=0)) {const t=dp/(dp-dq);next.push({p:p.p.clone().lerp(q.p,t),n:p.n.clone().lerp(q.n,t).normalize(),q:p.q.clone().lerp(q.q,t)});}
          }
          polygon=next;
        }
        for(let j=1;j<polygon.length-1;j++)for(const vertex of[polygon[0],polygon[j],polygon[j+1]]){positions.push(...vertex.p.clone().addScaledVector(vertex.n,lift).toArray());normals.push(...vertex.n.toArray());}
      }
    }
  }
  if(!positions.length)return;
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));detail.add(geometry,material);geometry.dispose();
}

function addPanelSeams(vehicle, m, key) {
  // Project thin shut lines onto the actual sculpted surface. This avoids
  // floating door outlines or trim disappearing under a curved body panel.
  vehicle.updateMatrixWorld(true);
  const surfaces = vehicle.userData.damageMeshes.filter(item => item.mesh.material === m.paint || item.mesh.material === m.accent).map(item => item.mesh);
  const detail = batch(vehicle), ray = new THREE.Raycaster();
  const line = (corners, axis, side = 1) => {
    let points = [];
    const flush = () => { if (points.length > 1) detail.tube(m.carbon, points, .0055, Math.max(8, points.length * 2)); points = []; };
    for (let edge = 1; edge < corners.length; edge++) for (let i = 0; i <= 7; i++) {
      const a = corners[edge - 1], b = corners[edge], u = a[0] + (b[0] - a[0]) * i / 7, v = a[1] + (b[1] - a[1]) * i / 7;
      const origin = axis === 'side' ? new THREE.Vector3(side * 3, u, v) : new THREE.Vector3(u, 4, v);
      ray.set(origin, axis === 'side' ? new THREE.Vector3(-side, 0, 0) : new THREE.Vector3(0, -1, 0));
      const hit = ray.intersectObjects(surfaces, false)[0];
      if (!hit || axis === 'side' && hit.point.x * side < .5) { flush(); continue; }
      const p = hit.point.addScaledVector(hit.face.normal, .007);
      if (!points.length || p.distanceTo(new THREE.Vector3(...points.at(-1))) > .0001) points.push(p.toArray());
    }
    flush();
  };
  if (key !== 'viper_proto') {
    const door = key === 'titan_monster' ? [[2.25,.69],[1.96,.69],[1.96,-.73],[2.25,-.73]] : key === 'banshee_muscle' ? [[.905,.52],[.46,.52],[.46,-.91],[.93,-.91]] : [[.965,.60],[.56,.60],[.56,-.80],[1.00,-.80]];
    for (const side of [-1, 1]) line(door, 'side', side);
  }
  if (key === 'banshee_muscle') {
    for (const side of [-1, 1]) line([[side * .66,.55],[side * .73,2.28]], 'top');
    line([[-.67,-1.88],[-.67,-2.32],[.67,-2.32],[.67,-1.88]], 'top');
  } else if (key === 'dusthawk_rally') {
    for (const side of [-1, 1]) line([[side * .61,.97],[side * .69,1.79]], 'top');
  } else if (key === 'viper_proto') {
    line([[-.27,.64],[-.27,1.81],[.27,1.81],[.27,.64]], 'top');
    line([[-.39,-1.23],[-.39,-2.08],[.39,-2.08],[.39,-1.23]], 'top');
  } else {
    for (const side of [-1, 1]) line([[side * .63,1.06],[side * .69,1.86]], 'top');
  }
  detail.finish(vehicle.userData);
}

function rally(vehicle, b, m) {
  sculpt(b, m.paint, [[-2.045,.84,.42,.97,1.03,.76],[-1.65,1.02,.40,1.01,1.10,.84],[-.8,.98,.38,1.02,1.09,.81],[.4,.96,.39,.97,1.03,.81],[1.30,1.01,.42,.95,1.04,.82],[1.83,.94,.45,.88,.99,.82],[2.05,.85,.50,.83,.93,.77]], [1.27,-1.30], .41,undefined,{width:.68,y:.86,back:-1.35,front:.66});
  b.box(m.carbon,[1.35,.075,1.98],[0,.69,-.34],[0,0,0],.022);
  cabin(b, m, { front: .87, back: -1.78, frontTop: .31, backTop: -1.04, baseY: 1.04, topY: 1.62, width: .82, roofWidth: .71 });
  for (const side of [-1, 1]) {
    b.box(m.carbon, [.11,.20,2.03], [side*.973,.40,-.02], [0,0,0], .03);
    b.box(m.carbon, [.35,.31,.035], [side*.88,.48,-1.77], [-.13,0,0], .009);
    b.box(m.carbon, [.11,.038,.19], [side*.978,1.0,-.56], [0,0,0], .015);
    b.tube(m.accent, [[side*.59,.77,-.68],[side*.59,1.49,-.72],[side*.54,1.55,-.83]], .028, 8);
    b.tube(m.accent, [[side*.58,.78,-1.34],[-side*.57,1.49,-.74]], .023, 3);
    b.box(m.carbon,[.205,.43,.040],[side*.78,1.105,-2.055],[0,0,0],.025);
    b.box(m.brake,[.16,.37,.020],[side*.78,1.105,-2.08],[0,0,0],.024);
    b.box(m.plate,[.14,.042,.009],[side*.78,1.07,-2.093],[0,0,0],.008);
    b.box(m.headlight,[.41,.145,.038],[side*.57,.89,2.09],[0,0,0],.045);
  }
  b.box(m.carbon,[1.90,.20,.13],[0,.57,2.035],[0,0,0],.04);
  b.box(m.carbon,[1.91,.17,.13],[0,.46,-2.035],[0,0,0],.04);
  b.box(m.carbon,[1.44,.11,.027],[0,.64,-2.065],[0,0,0],.012);
  b.box(m.darkAlloy,[.51,.034,.021],[0,.86,-2.063],[0,0,0],.006);
  rearPlate(b,m,.745,-2.083,.35,.14);
  b.tube(m.carbon,[[-.58,1.24,-1.54],[.18,1.24,-1.54]],.011,2);
  b.box(m.carbon,[.83,.22,.03],[0,.81,2.081],[0,0,0],.025);
  for(let i=-4;i<=4;i++)b.box(m.darkAlloy,[.019,.18,.024],[i*.08,.81,2.086],[0,0,0],0);
  // The grille ends at z=2.098; lamp housings end at 2.122 and the lens
  // faces at 2.137. The entire bank is therefore in front of every grille bar.
  for(const x of[-.57,-.19,.19,.57]) { cylinder(b,m.carbon,.113,.064,[x,.742,2.090],[Math.PI/2,0,0]); cylinder(b,m.headlight,.094,.014,[x,.742,2.130],[Math.PI/2,0,0]); }
  // Deep lower intake and a perforated gravel skid plate echo the rally sheet.
  b.box(m.carbon,[1.24,.105,.040],[0,.505,2.083],[0,0,0],.017);
  b.box(m.alloy,[1.22,.105,.032],[0,.398,2.035],[-.20,0,0],.012);
  for(let x=-.49;x<=.5;x+=.14)cylinder(b,m.exhaust,.026,.012,[x,.4,2.057],[Math.PI/2,0,0],12);
  b.box(m.paint,[.46,.072,.30],[0,1.10,1.18],[.025,0,0],.032);
  b.box(m.carbon,[.35,.043,.017],[0,1.104,1.334],[0,0,0],.012);
  for(const side of[-1,1])for(let i=0;i<5;i++)b.box(m.carbon,[.15,.009,.026],[side*.51,1.085-i*.003,1.05+i*.069],[.055,0,side*.12],.003);
  b.box(m.accent,[.29,.016,1.34],[.13,1.658,-.36],[0,0,0],.004);
  b.box(m.carbon,[1.57,.05,.32],[0,1.65,-1.13],[-.06,0,0],.018);
  for(const side of[-1,1])b.box(m.carbon,[.045,.14,.18],[side*.58,1.57,-1.16],[-.10,0,0],.009);
  b.box(m.paint,[.34,.052,.29],[0,1.662,-.39],[0,0,0],.022);
  b.box(m.carbon,[.265,.025,.014],[0,1.662,-.239],[0,0,0],.008);
  cockpit(vehicle,b,m,[.36,.205,-.25]);
  wheels(vehicle,m,{radius:.41,width:.28,track:.91,axles:[1.27,-1.30],gravel:true});
  exhaust(vehicle,b,m,[[.59,.34,-1.998]]);
  vehicle.userData.damageSpace = { scale:[.90,1.08,.88], offset:[0,.12,0], rearGlassZ:-1.59 };
}

function muscle(vehicle, b, m) {
  sculpt(b,m.paint,[[-2.49,.97,.35,.92,1.03,.83],[-1.9,1.095,.33,1.00,1.10,.87],[-1.5,1.10,.31,.99,1.08,.86],[-.65,1.02,.31,.93,1.00,.82],[.6,1.01,.31,.92,.99,.85],[1.61,1.10,.32,.94,1.00,.88],[2.3,1.07,.36,.90,.98,.90],[2.49,1.00,.39,.87,.94,.87]],[1.64,-1.61],.43,undefined,{width:.69,y:.78,back:-1.42,front:.31});
  b.box(m.carbon,[1.38,.075,1.78],[0,.49,-.53],[0,0,0],.022);
  cabin(b,m,{front:.48,back:-1.81,frontTop:-.13,backTop:-1.03,baseY:.98,topY:1.40,width:.83,roofWidth:.71});
  for(const side of[-1,1]) {
    b.box(m.carbon,[.11,.12,2.25],[side*1.032,.32,-.04],[0,0,0],.014);
    b.box(m.alloy,[1.02,.065,.09],[side*.52,.59,2.505],[0,0,0],.025);
    b.box(m.carbon,[.94,.27,.048],[side*.535,.78,2.518],[0,0,0],.018);
    for(const x of[.72,.93]) {cylinder(b,m.alloy,.104,.026,[side*x,.805,2.535],[Math.PI/2,0,0]);cylinder(b,m.headlight,.088,.016,[side*x,.805,2.542],[Math.PI/2,0,0]);}
    b.box(m.brake,[.67,.12,.020],[side*.62,.82,-2.537],[0,0,0],.02);
    for (const dx of [-.2, 0, .2]) b.box(m.carbon,[.013,.123,.012],[side*.62+dx,.82,-2.547],[0,0,0],.002);
    b.box(m.carbon,[.16,.045,.12],[side*1.028,.91,-.65],[0,0,0],.012);
    for(let i=0;i<5;i++)b.box(m.carbon,[.018,.036,.20],[side*.86,1.108-i*.012,-1.51-i*.10],[.11,0,0],.002);
    // Small side markers, quarter vents and chrome beltline retain the long,
    // low fastback profile and are visible from the standard chase camera.
    b.box(m.headlight,[.009,.033,.13],[side*1.077,.74,1.98],[0,0,0],.005);
    b.box(m.brake,[.009,.033,.12],[side*1.084,.75,-1.93],[0,0,0],.005);
    for(let i=0;i<3;i++)b.box(m.carbon,[.012,.11,.035],[side*1.053,.76,-.95-i*.09],[.25,0,0],.004);
    b.tube(m.alloy,[[side*.848,1.004,.44],[side*.738,1.418,-.13],[side*.738,1.418,-1.025],[side*.846,1.004,-1.78]],.009,20);
  }
  b.box(m.carbon,[1.92,.09,.13],[0,.41,2.49],[0,0,0],.018);
  for(let i=-7;i<=7;i++)b.box(m.darkAlloy,[.025,.19,.008],[i*.075,.78,2.546],[0,0,0],0);
  b.box(m.carbon,[1.91,.26,.048],[0,.80,-2.510],[0,0,0],.018);
  b.box(m.alloy,[1.94,.07,.07],[0,.565,-2.515],[0,0,0],.02);
  b.box(m.carbon,[1.94,.12,.09],[0,.505,-2.505],[0,0,0],.025);
  b.box(m.carbon,[1.52,.018,.025],[0,.978,-2.497],[0,0,0],.003);
  rearPlate(b,m,.694,-2.538,.40,.13);
  // Exposed roots-type blower, intake butterflies, drive belt and fuel rails.
  b.box(m.darkAlloy,[.58,.20,.63],[0,1.135,1.37],[0,0,0],.04);
  for(let i=0;i<9;i++)b.box(m.alloy,[.62,.025,.024],[0,1.23,1.09+i*.068],[0,0,0],.004);
  b.box(m.alloy,[.62,.22,.45],[0,1.347,1.48],[0,0,0],.045);
  for(const x of[-.19,0,.19])cylinder(b,m.carbon,.075,.024,[x,1.348,1.713],[Math.PI/2,0,0]);
  for(const x of[-.19,0,.19]) {
    const ring=new THREE.TorusGeometry(.075,.007,6,20);b.add(ring,m.alloy,[x,1.348,1.727]);ring.dispose();
    b.box(m.darkAlloy,[.125,.017,.009],[x,1.348,1.729],[0,0,.28],.003);
  }
  for(const x of[-.32,.32])b.tube(m.alloy,[[x,1.14,1.1],[x,1.24,1.4],[x,1.12,1.65]],.021,10);
  b.box(m.carbon,[.08,.29,.05],[0,1.12,1.785],[0,0,0],.014);
  b.box(m.carbon,[1.80,.055,.23],[0,1.06,-2.29],[-.045,0,0],.02);
  cockpit(vehicle,b,m,[.39,.005,-.62]);
  wheels(vehicle,m,{radius:.43,width:.34,track:.96,axles:[1.64,-1.61],spokes:5});
  exhaust(vehicle,b,m,[[-.71,.32,-2.440],[.71,.32,-2.440]],.08);
  vehicle.userData.damageSpace={scale:[.97,1,1.075],offset:[0,0,0],frontGlassZ:.10,rearGlassZ:-1.26};
}

function prototype(vehicle,b,m) {
  sculpt(b,m.paint,[[-2.405,.68,.22,.46,.52,.60],[-2.10,.96,.18,.60,.65,.78],[-1.55,1.03,.16,.77,.79,.86],[-.82,.88,.16,.53,.56,.64],[.2,.82,.16,.49,.52,.55],[1.35,1.06,.16,.72,.76,.82],[1.87,.86,.18,.50,.55,.70],[2.45,.51,.23,.33,.38,.44]],[1.42,-1.45],.39);
  for(const side of[-1,1]) {
    const fender = body([[-2.22,.10,.35,.63,.68,.07],[-1.47,.23,.31,.77,.79,.18],[-.84,.13,.29,.59,.62,.08]],[1.42,-1.45],.01);
    b.add(fender,m.accent,[side*.78,0,0]); fender.dispose();
    const frontFender = body([[.82,.12,.30,.58,.68,.08],[1.42,.25,.27,.77,.79,.19],[1.94,.18,.22,.61,.68,.12],[2.22,.11,.24,.44,.53,.07]],[1.42],.39);
    b.add(frontFender,m.accent,[side*.78,0,0]); frontFender.dispose();
    // Sidepods and deep open duct mouths sit beside the narrow cockpit.
    b.box(m.carbon,[.25,.22,.74],[side*.69,.49,-.1],[0,0,0],.09);
    b.box(m.headlight,[.14,.027,.55],[side*.86,.818,1.38],[.11,0,0],.010);
    b.box(m.carbon,[.17,.225,.041],[side*.78,.401,2.222],[0,0,0],.025);
    for (const y of [.329,.376,.423,.470]) b.box(m.headlight,[.113,.025,.009],[side*.78,y,2.247],[0,0,0],.009);
    b.box(m.carbon,[.073,.40,.22],[side*.70,.82,-2.08],[-.12,0,0],.013);
    b.box(m.accent,[.035,.18,.52],[side*1.078,1.003,-2.13],[0,0,0],.006);
    b.box(m.brake,[.34,.048,.012],[side*.64,.58,-2.442],[0,0,0],.01);
    b.box(m.carbon,[.065,.026,1.60],[side*1.035,.255,.03],[0,0,0],.008);
    for(let i=0;i<6;i++)b.box(m.carbon,[.24,.012,.025],[side*.84,.776-i*.005,-1.33-i*.065],[.05,0,0],0);
  }
  b.box(m.carbon,[2.13,.055,.49],[0,1.018,-2.13],[-.04,0,0],.019);
  b.box(m.carbon,[1.71,.115,.043],[0,.552,-2.419],[0,0,0],.015);
  rearPlate(b,m,.554,-2.442,.28,.089);
  b.box(m.accent,[.27,.018,1.61],[0,.529,1.31],[.07,0,0],.01);
  b.box(m.carbon,[1.78,.043,.32],[0,.194,2.03],[0,0,0],.018);
  b.box(m.carbon,[.58,.12,1.02],[0,.39,-.34],[0,0,0],.05);
  panel(b,m.glass,[[-.32,.60,.21],[.32,.60,.21],[.23,.87,-.03],[-.23,.87,-.03]]);
  const canopy = new THREE.SphereGeometry(1, 32, 18, 0, Math.PI*2, 0, Math.PI/2);
  b.add(canopy,m.glass,[0,.52,-.25],[0,0,0],[.35,.58,.81]); canopy.dispose();
  const roofSpine=[];for(let i=0;i<=24;i++){const a=i/24*Math.PI;roofSpine.push([0,.52+Math.sin(a)*.565,-.25+Math.cos(a)*.80]);}b.tube(m.paint,roofSpine,.014,24);
  b.tube(m.alloy,[[-.30,.60,-.63],[-.27,1.0,-.69],[.27,1.0,-.69],[.30,.60,-.63]],.036,20);
  b.box(m.paint,[.19,.18,.34],[0,.82,-1.04],[0,0,0],.08);
  // Airbox, cockpit sill and exposed wishbones distinguish the prototype's
  // narrow central fuselage from its separate wheel covers.
  b.box(m.accent,[.22,.16,.41],[0,.88,-1.10],[0,0,0],.065);
  b.box(m.carbon,[.145,.075,.016],[0,.895,-.887],[0,0,0],.025);
  for(const side of[-1,1]) {
    b.tube(m.carbon,[[side*.35,.57,.34],[side*.38,.58,-.39],[side*.32,.60,-.91]],.024,14);
    for(const axle of[1.42,-1.45])for(const dz of[-.22,.22])b.tube(m.darkAlloy,[[side*.40,.38,axle+dz],[side*.91,.43,axle]],.018,2);
    b.box(m.carbon,[.19,.19,.023],[side*.61,.458,.39],[0,0,side*.11],.027);
    for(let i=0;i<5;i++)b.box(m.darkAlloy,[.12,.008,.027],[side*.61,.40+i*.026,.406],[0,0,0],.002);
  }
  for(let i=-3;i<=3;i++)b.box(m.carbon,[.027,.17,.42],[i*.22,.278,-2.22],[.09,0,0],.003);
  cockpit(vehicle,b,m,[0,-.03,-.35],.80,false);
  wheels(vehicle,m,{radius:.39,width:.34,track:.93,axles:[1.42,-1.45],spokes:10});
  exhaust(vehicle,b,m,[[-.23,.435,-2.34],[.23,.435,-2.34]],.071);
  vehicle.userData.damageSpace={scale:[.96,.72,1.03],offset:[0,0,0],frontGlassZ:.21,rearGlassZ:-.64};
}

function monster(vehicle,b,m) {
  sculpt(b,m.paint,[[-2.05,.94,1.80,2.28,2.34,.86],[-1.62,1.00,1.74,2.30,2.36,.88],[-.65,.96,1.74,2.24,2.32,.86],[.45,.96,1.77,2.28,2.34,.84],[1.3,1.02,1.85,2.29,2.38,.86],[2.06,.89,1.91,2.17,2.29,.77]],[1.62,-1.62],.98,.98);
  cabin(b,m,{front:.95,back:-.92,frontTop:.55,backTop:-.67,baseY:2.40,topY:3.29,width:.79,roofWidth:.70});
  b.box(m.carbon,[1.57,.08,1.10],[0,2.375,-1.48],[0,0,0],.025);
  for(const side of[-1,1]) {
    b.box(m.accent,[.17,.19,3.94],[side*.66,1.76,0],[0,0,0],.028);
    b.tube(m.accent,[[side*.77,1.75,-1.50],[side*.85,2.33,-1.12],[side*.77,3.34,-.64],[side*.73,3.37,.52],[side*.84,2.39,.96],[side*.72,1.77,1.70]],.064,30);
    b.tube(m.accent,[[side*.76,2.34,-1.89],[-side*.73,3.25,-.68]],.045,10);
    b.box(m.carbon,[.17,.08,1.17],[side*1.005,1.93,-.09],[0,0,0],.018);
    b.box(m.headlight,[.31,.17,.045],[side*.62,2.18,2.059],[0,0,0],.035);
    b.box(m.brake,[.19,.25,.041],[side*.78,2.16,-2.063],[0,0,0],.025);
    b.box(m.carbon,[.24,.30,.032],[side*.78,2.16,-2.052],[0,0,0],.025);
    b.box(m.carbon,[.10,.045,.18],[side*.972,2.28,-.55],[0,0,0],.010);
  }
  b.box(m.carbon,[1.84,.16,.18],[0,1.95,2.065],[0,0,0],.045);
  b.box(m.carbon,[1.84,.15,.16],[0,1.91,-2.07],[0,0,0],.035);
  b.box(m.darkAlloy,[.33,.034,.022],[0,2.28,-2.063],[0,0,0],.005);
  rearPlate(b,m,2.12,-2.081,.38,.145);
  b.tube(m.carbon,[[-.65,2.28,-2.063],[-.65,1.99,-2.063],[.65,1.99,-2.063],[.65,2.28,-2.063]],.009,16);
  b.box(m.carbon,[.89,.26,.04],[0,2.17,2.075],[0,0,0],.025);
  for(let i=-4;i<=4;i++)b.box(m.alloy,[.037,.205,.022],[i*.085,2.17,2.10],[0,0,0],.004);
  b.tube(m.darkAlloy,[[-.85,1.85,2.13],[-.83,2.04,2.16],[-.54,2.04,2.17],[0,1.99,2.18],[.54,2.04,2.17],[.83,2.04,2.16],[.85,1.85,2.13]],.040,24);
  for(const side of[-1,1]) {
    b.tube(m.darkAlloy,[[side*.84,1.81,1.94],[side*.84,1.85,2.13],[side*.39,1.79,2.14]],.035,10);
    b.tube(m.accent,[[side*.62,1.19,-1.4],[-side*.53,1.64,.72]],.037,3);
    b.tube(m.darkAlloy,[[side*.52,1.75,-1.72],[side*.65,2.26,-1.45]],.030,3);
    cylinder(b,m.alloy,.053,.50,[side*.77,1.46,1.40],[0,0,side*.07],14);
  }
  // An inset, ribbed bed floor catches shadows beneath the rear cage.
  for(let i=-5;i<=5;i++)b.box(m.darkAlloy,[.022,.016,.95],[i*.12,2.424,-1.48],[0,0,0],.005);
  b.box(m.carbon,[1.35,.071,.14],[0,3.43,.48],[0,0,0],.022);
  for(const x of[-.54,-.27,0,.27,.54]) {cylinder(b,m.carbon,.117,.10,[x,3.48,.50],[Math.PI/2,0,0]);cylinder(b,m.headlight,.095,.015,[x,3.48,.558],[Math.PI/2,0,0]);}
  for(const axle of[-1,1]) {
    cylinder(b,m.darkAlloy,.104,2.17,[0,.98,axle*1.62],[0,0,Math.PI/2],16);
    const diff=new THREE.SphereGeometry(.24,16,12);b.add(diff,m.darkAlloy,[0,.99,axle*1.62],[0,0,0],[1.15,.95,1]);diff.dispose();
    b.box(m.accent,[1.39,.14,.19],[0,1.73,axle*1.56],[0,0,0],.025);
    for(const side of[-1,1]) {
      b.tube(m.alloy,[[side*.88,.99,axle*1.60],[side*.57,1.65,axle*.65]],.042,3);
      b.tube(m.accent,[[side*.93,1.01,axle*1.52],[side*.75,1.76,axle*1.34]],.052,3);
      const coil=[];for(let i=0;i<=80;i++){const t=i/80,a=t*Math.PI*16;coil.push([side*.75+Math.sin(a)*.095,1.12+t*.60,axle*1.42+Math.cos(a)*.095]);}b.tube(m.alloy,coil,.018,80);
    }
  }
  cylinder(b,m.darkAlloy,.068,3.05,[0,1.19,0],[Math.PI/2,0,0],12);
  b.box(m.darkAlloy,[.57,.42,.79],[0,1.61,.48],[0,0,0],.06);
  cockpit(vehicle,b,m,[.37,1.87,-.20]);
  wheels(vehicle,m,{radius:.98,width:.56,track:1.12,axles:[1.62,-1.62],gravel:true,monster:true,spokes:8});
  exhaust(vehicle,b,m,[[-.70,1.81,-2.10],[.70,1.81,-2.10]],.092);
  vehicle.userData.damageSpace={scale:[.91,1.30,.88],offset:[0,1.43,0]};
}
