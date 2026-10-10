import {pathToFileURL} from 'node:url';
import {Course} from '../src/course.js';
import {COURSE} from '../src/config.js';
import {ARENA_VENUES} from '../src/arena/venues.js';
import {ROUTE_VARIANTS} from '../src/route-variants.js';
import {initializeHiddenRoadJourney} from '../src/hidden-road-journey.js';

export function colliderInventory() {
  const rows = [];
  for (const definition of [...COURSE, ...Object.values(ARENA_VENUES)]) {
    for (const route of ROUTE_VARIANTS) {
      const course = new Course(definition, route.seed, {hiddenRoad: true, muddyHollow: true});
      const duel = {course, state: {}};
      initializeHiddenRoadJourney(duel);
      const sources = [
        ['scenery', course.features.obstacles],
        ['junk', course.features.crushables],
        ['muddy-hollow', course.muddyHollow?.obstacles],
        ['rustwall', duel.state.hiddenRoadJourney?._colliders],
      ];
      for (const [source, colliders] of sources) for (const obstacle of colliders || []) {
        const bottom = obstacle.modelMinY ?? obstacle.minY ?? obstacle.y;
        const top = obstacle.modelMaxY ?? obstacle.maxY ?? obstacle.y + obstacle.height;
        rows.push({course: definition.id, route: route.id, source,
          id: obstacle.id, kind: obstacle.kind || 'junkCar', bottom, top,
          finite: Number.isFinite(bottom) && Number.isFinite(top) && top >= bottom,
          obstacle});
      }
    }
  }
  return rows;
}

// Geometry-only measurement: texture decoding is irrelevant to vertex bounds.
export async function measureModels() {
  const THREE = await import('three');
  const {buildCactusGeometry} = await import('../src/desert-detail.js');
  const {pineTreeAssets} = await import('../src/vegetation.js');
  const {addFurniture, addStation, addFinish} = await import('../src/world-props.js');
  const {createCoastLighthouse} = await import('../src/coast-lighthouse.js');
  const {buildEnvironment, disposeTree} = await import('../src/world.js');
  const load = THREE.TextureLoader.prototype.load, document = globalThis.document;
  const context = new Proxy({measureText: text => ({width: String(text).length * 8}),
    createLinearGradient: () => ({addColorStop() {}}), createRadialGradient: () => ({addColorStop() {}}),
    getImageData: () => ({data: new Uint8ClampedArray(4)}),
    createImageData: (w, h) => ({data: new Uint8ClampedArray(w * h * 4)})},
    {get: (target, key) => key in target ? target[key] : () => {}});
  THREE.TextureLoader.prototype.load = () => new THREE.Texture();
  globalThis.document = {createElement: () => ({getContext: () => context})};
  try {
    const range = geometry => {
      geometry.computeBoundingBox();
      const result = [geometry.boundingBox.min.y, geometry.boundingBox.max.y];
      geometry.dispose(); return result;
    };
    const pine = pineTreeAssets();
    const models = {pine: range(pine.crown),
      cactus: [0, 1, 2].map(index => range(buildCactusGeometry(index))),
      rock: range(new THREE.DodecahedronGeometry(1, 1)),
      hiddenBank: range(new THREE.DodecahedronGeometry(1, 0))};
    pine.trunk.dispose(); pine.bark.dispose(); pine.needles.dispose();
    const extrema = nodes => {
      const box = new THREE.Box3();
      for (const node of nodes) if (!node.isInstancedMesh || node.count)
        box.union(new THREE.Box3().setFromObject(node));
      return [box.min.y, box.max.y];
    };
    const origin={x:0,y:0,z:0,heading:0,s:0};
    for (const [name,poles,barriers] of [['rail',[],[origin]],['pole',[origin],[]]]) {
      const group=new THREE.Group();
      addFurniture(group,{def:{},features:{poles,barriers}},new THREE.MeshBasicMaterial());
      models[name]=extrema(group.children);disposeTree(group);
    }
    const station=new THREE.Group();addStation(station,{...origin,theme:'desert'});
    const parts=station.children[0].children;
    models.stationBuilding=extrema(parts.filter(mesh=>mesh.position.z===5));
    models.stationPost=extrema(parts.filter(mesh=>Math.abs(mesh.position.x)===5.5));
    models.stationPump=extrema(parts.filter(mesh=>mesh.position.z===-2.5));
    disposeTree(station);
    const finish=new THREE.Group();addFinish(finish,{worldAt:()=>origin,roadHalfWidthAt:()=>7});
    models.finish=extrema(finish.children);disposeTree(finish);
    const lighthouse=createCoastLighthouse(origin,{nearest:()=>({s:0,lateral:0}),groundAt:()=>({y:0})});
    models.pacificLighthouse=extrema([lighthouse]);disposeTree(lighthouse);
    const course = new Course(ARENA_VENUES.pit, 1989), world = buildEnvironment(course);
    world.updateMatrixWorld(true);
    const scenery = world.getObjectByName('Pit hulk wall, centre pile and oval-end scrap');
    const matrix = new THREE.Matrix4(), point = new THREE.Vector3();
    const piles = new THREE.Box3(), walls = new THREE.Box3();
    scenery.traverse(mesh => {
      if (!mesh.isInstancedMesh) return;
      const vertices = mesh.geometry.attributes.position;
      for (let index = 0; index < mesh.count; index++) {
        mesh.getMatrixAt(index, matrix);
        const radius = Math.hypot(matrix.elements[12], matrix.elements[14]);
        const box = radius < 10 ? piles : radius > 65 && radius < 85 ? walls : null;
        if (!box) continue;
        for (let vertex = 0; vertex < vertices.count; vertex++)
          box.expandByPoint(point.fromBufferAttribute(vertices, vertex).applyMatrix4(matrix));
      }
    });
    models.pitPile = [piles.min.y, piles.max.y];
    models.pitWall = [walls.min.y, walls.max.y];
    disposeTree(world);
    return models;
  } finally {
    THREE.TextureLoader.prototype.load = load;
    if (document === undefined) delete globalThis.document; else globalThis.document = document;
  }
}

if (process.argv.includes('--models')) console.log(JSON.stringify(await measureModels(), null, 2));
else if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const rows = colliderInventory();
  if (!process.argv.includes('--summary')) for (const {obstacle, ...row} of rows)
    console.log(JSON.stringify(row));
  const missing = rows.filter(row => !row.finite);
  const kinds = {};
  for (const row of missing) {
    const key = row.obstacle.barrier ? 'barrier' : row.obstacle.tunnelWall ? 'tunnelWall' :
      row.id?.replace(/-?[\d.]+/g, '#');
    kinds[key] = (kinds[key] || 0) + 1;
  }
  console.log(JSON.stringify({colliders: rows.length, missing: missing.length, kinds}, null, 2));
  if (missing.length) process.exitCode = 1;
}

// Shared native/browser fixture. It crosses real scenery using the production
// car contact method; only the pose and selected nearby scenery are controlled.
export function checkCarHeightCrossing(duel, obstacle, heightMode, expectedClear = heightMode === 'clear') {
  const car = duel.state, course = duel.course;
  const distance = obstacle.halfX + duel._vehicleSpec(car).halfLength + 3;
  const cs = Math.cos(obstacle.heading || 0), sn = Math.sin(obstacle.heading || 0);
  const from = course.nearest(obstacle.x - cs * distance, obstacle.z + sn * distance, obstacle.s);
  const to = course.nearest(obstacle.x + cs * distance, obstacle.z - sn * distance, obstacle.s);
  const fromGround = course.groundAt(from.s, from.lateral), toGround = course.groundAt(to.s, to.lateral);
  const top = obstacle.modelMaxY ?? obstacle.maxY ?? obstacle.y + obstacle.height;
  const airborne = heightMode !== 'grounded';
  const feet = top + (heightMode === 'clear' ? .3 : -.2);
  Object.assign(car, {prevS: from.s, prevLateral: from.lateral, s: to.s, lateral: to.lateral,
    prevGroundHeight: fromGround.y, groundHeight: toGround.y,
    airborne, prevAirHeight: airborne ? feet - fromGround.y : 0,
    airHeight: airborne ? feet - toGround.y : 0, speedMph: 20,
    headingError: Math.atan2(cs, -sn) - course.at(to.s).heading,
    slipAngle: 0, pushVelocity: 0, invulnerableSec: 10, impactTimer: 0,
    combatWrecking: null, tumble: null, crushed: false});
  const query = duel._obstacles;
  duel._obstacles = () => [obstacle];
  try { duel._staticContacts(car, true); } finally { duel._obstacles = query; }
  const error = Math.hypot(car.s - to.s, car.lateral - to.lateral);
  const clear = error < 1e-5 && car.speedMph === 20;
  if (clear !== expectedClear)
    throw Error(`${course.def.id}/${obstacle.id}/${heightMode}: ${clear ? 'passed through' : 'blocked'}, displacement ${error}`);
  return {course: course.def.id, obstacle: obstacle.id, heightMode, clear, top};
}

export function checkNativeUfo(duel) {
  const course=duel.course, car=duel.state;
  const targets=course.def.pit ? course.features.obstacles.filter(o=>o.id==='pit-centre-pile') :
    course.features.obstacles.filter(o=>o.barrier && o.s>duel._lapGates[0]+20);
  for(const target of targets) {
    const from=course.def.pit ? course.nearest(-14,0) :
      {s:target.s-12,lateral:target.off+Math.sign(target.off)*3};
    const next=duel._lapGates.findIndex(gate=>gate>from.s);
    Object.assign(car,{s:from.s,prevS:from.s,lateral:from.lateral,prevLateral:from.lateral,
      headingError:course.def.pit?Math.PI/2-course.at(from.s).heading:0,
      speedMph:0,status:'racing',countdown:0,nextLapGate:next<0?duel._lapGates.length:next,
      completedLaps:0,airborne:false,airHeight:0,prevAirHeight:0,groundHeight:null,
      prevGroundHeight:null,pushVelocity:0,slipAngle:0});
    Object.assign(car.combat,{ufoUsedLaps:[]});car.combat.cooldowns.ufo=0;car.combat.levels.ufo=4;
    const start=course.worldAt(car.s,car.lateral);
    if(!duel.fireWeapon('ufo'))continue;
    const jump={...car.combat.lastUfo},landing={s:car.s,lateral:car.lateral,headingError:car.headingError};
    const end=course.worldAt(car.s,car.lateral);
    // The same direct path would strike the scenery if driven on the ground.
    const query=duel._obstacles;
    const snapshot={...car};
    Object.assign(car,{prevS:from.s,prevLateral:from.lateral,s:landing.s,lateral:landing.lateral,
      headingError:Math.atan2(end.x-start.x,end.z-start.z)-course.at(landing.s).heading,
      speedMph:20,groundHeight:course.groundAt(landing.s,landing.lateral).y,
      prevGroundHeight:course.groundAt(from.s,from.lateral).y});
    duel._obstacles=()=>[target];
    try{duel._staticContacts(car,true);}finally{duel._obstacles=query;}
    const groundedHit=Math.hypot(car.s-landing.s,car.lateral-landing.lateral)>1e-5;
    Object.assign(car,snapshot);
    if(!groundedHit)continue;
    duel.setInput({throttle:0,brake:0,steer:0});
    for(let tick=0;tick<12;tick++)duel.step(1/120);
    if(jump.kind!=='jump'||jump.gainMeters<=0||Math.hypot(end.x-start.x,end.z-start.z)<2)
      throw Error('Native UFO did not relocate');
    return {course:course.def.id,target:target.id,from:{s:from.s,lateral:from.lateral},
      landing,gainMeters:jump.gainMeters,groundedHit,rule:'instant relocation'};
  }
  throw Error(`${course.def.id}: no native UFO crossing of real scenery found`);
}
