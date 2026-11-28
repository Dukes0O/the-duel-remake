// HOME-GROUND-1 and HOME-GROUND-2: the player's own ground, drawn (docs/HOME_GROUND.md, sections 5 to 7). It reads the
// ground's part (worldJob.open.parts.home) and its record (world.open.home) and changes neither. It draws nothing until
// the part has run with its switch on (`state.on`). Level 1 is tin: galvanised corrugated panels on two posts, the same
// sheet that Tin Town's own fence is made of (src/world/tin-town-gate.js), and a gate of two tin leaves in angle-iron
// frames. The hens, the nest boxes and the eggs are HOME-GROUND-LOOK-1's parts (src/world/open/looks/home-hens-look.js);
// Moss's travelling crate and the spare crates are plain slatted crates drawn here.
import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {scrapBuilder, yardSurface} from '../../scablands-yard-look.js';
import {createHaulLoadLook} from '../../../town/view/haul-load-look.js';
import {createStoryPeople} from '../../jobs/story-people.js';
import {createStoryPeopleView} from '../../story-people-view.js';
import {BOX_HOLDS, HOME_BOX, HOME_BUILDS, HOME_LOAD_STACK, HOME_CELLS, HOME_CORNER, HOME_PANELS, HOME_PIECES, HOME_SIZE, HOME_STEP, HOME_TANK} from '../content/home-ground.js';
import {GATE_POST, boardSpot, boxInLand, crateSpot, cratesLeft, gateOf, hensWaiting, newsBoardSpot, panelsLeft,
  pieceInLand, buildInLand, groundPoint, wellInLand, tankConnected, homeDrillHole} from '../home-rule.js';
import {scablandsSurfaceHeightAt} from '../../scablands-ground.js';
import {HOME_HEN_MODEL, createEgg, createHen, createNestBox, corrugated as buildingTin} from './home-hens-look.js';
import {createHomeTowerLook} from './home-tower-look.js';
import {createHomeRaidersLook} from './home-raiders-look.js';
import {createDrillCuttingsView} from '../../../machines/drill-view.js';

const MOST_MARKS = 96;
// The eggs drawn in one nest box: a clutch of up to this many shows how full it is.
const EGGS_DRAWN = 6;
// Where the eggs of a clutch lie round the first, in the box's own metres.
const CLUTCH = [[0, 0], [.045, .012], [-.043, .016], [.018, -.04], [-.02, -.036], [.004, .046]];
const OUTLINE = Object.freeze({build: 0xe8f0c8, lift: 0xf2c14a, refused: 0xe0442c});

// A zig-zag sheet `width` wide and `height` tall, its foot at y 0, running along x and centred on it.
function corrugated(width, height) {
  const ribs = Math.round(width / .11), positions = [], uv = [], indices = [];
  for (let index = 0; index <= ribs; index++) {
    const x = -width / 2 + width * index / ribs, z = index % 2 ? .035 : -.035;
    positions.push(x, 0, z, x, height, z); uv.push(index / ribs, 0, index / ribs, 1);
  }
  for (let index = 0; index < ribs; index++) { const a = index * 2; indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geometry.setIndex(indices); geometry.computeVertexNormals();
  return geometry;
}

// Rust and weather, painted once on a small canvas: streaks run down from the top edge and rust gathers at the foot.
function tinTexture() {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = 256;
  const draw = canvas.getContext('2d');
  draw.fillStyle = '#8c8a82'; draw.fillRect(0, 0, 256, 256);
  let seed = 7;
  const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let n = 0; n < 60; n++) {
    const x = random() * 256, length = 30 + random() * 140;
    draw.fillStyle = `rgba(${110 + random() * 40},${60 + random() * 20},${30 + random() * 15},${.12 + random() * .2})`;
    draw.fillRect(x, 0, 2 + random() * 5, length);
  }
  const foot = draw.createLinearGradient(0, 256, 0, 170);
  foot.addColorStop(0, 'rgba(120,62,30,.75)'); foot.addColorStop(1, 'rgba(120,62,30,0)');
  draw.fillStyle = foot; draw.fillRect(0, 170, 256, 86);
  for (let n = 0; n < 220; n++) {
    draw.fillStyle = `rgba(${random() < .5 ? '60,45,35' : '170,165,150'},${.15 + random() * .2})`;
    draw.fillRect(random() * 256, random() * 256, 1 + random() * 3, 1 + random() * 3);
  }
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping; texture.anisotropy = 4;
  return texture;
}

// A pale, trodden earth over his ground, a shade apart from the plain round it.
function groundTint(width) {
  return new THREE.PlaneGeometry(width, width, HOME_CELLS, HOME_CELLS).rotateX(-Math.PI / 2).translate(width / 2, 0, width / 2);
}

// A crate of grey, split slats on four corner posts, `w` wide, `d` deep and `h` tall, its foot at y 0. With `open` its
// front is a low lip, as a nest box has.
function crateParts(w, d, h, open) {
  const parts = [];
  const slat = (x, y, z, sx, sy, sz) => parts.push({x, y, z, sx, sy, sz});
  slat(0, .02, 0, w, .04, d);
  for (const cx of [-1, 1]) for (const cz of [-1, 1]) slat(cx * (w / 2 - .025), h / 2, cz * (d / 2 - .025), .05, h, .05);
  const rows = Math.max(2, Math.round(h / .14));
  for (let n = 0; n < rows; n++) {
    const y = .08 + n * (h - .12) / (rows - 1);
    slat(0, y, -d / 2 + .01, w - .02, .07, .02);
    slat(-w / 2 + .01, y, 0, .02, .07, d - .02); slat(w / 2 - .01, y, 0, .02, .07, d - .02);
    if (!open || n === 0) slat(0, y, d / 2 - .01, w - .02, .07, .02);
  }
  if (open) slat(0, h + .02, -d * .12, w + .06, .03, d * .85);
  return parts;
}

function nameTexture() {
  if (typeof document === 'undefined') return {texture: null, write() {}};
  const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 160;
  const draw = canvas.getContext('2d');
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = 4;
  return {texture, write(name) {
    draw.fillStyle = '#a9a69a'; draw.fillRect(0, 0, 512, 160);
    draw.strokeStyle = '#5b3b26'; draw.lineWidth = 10; draw.strokeRect(6, 6, 500, 148);
    draw.fillStyle = '#2a211a'; draw.textAlign = 'center'; draw.textBaseline = 'middle';
    let size = 84;
    do { draw.font = `bold ${size}px Impact, "Arial Black", sans-serif`; size -= 4; } while (draw.measureText(name).width > 470 && size > 28);
    draw.fillText(name.toUpperCase(), 256, 84);
    texture.needsUpdate = true;
  }};
}

// The board of news at the gate: a heading and his store of eggs, painted on the tin. The full sentences are the HUD's.
function newsTexture() {
  if (typeof document === 'undefined') return {texture: null, write() {}};
  const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 256;
  const draw = canvas.getContext('2d');
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = 4;
  return {texture, write(eggs, hens) {
    draw.fillStyle = '#2b2f28'; draw.fillRect(0, 0, 512, 256);
    draw.strokeStyle = '#6b4a30'; draw.lineWidth = 12; draw.strokeRect(6, 6, 500, 244);
    draw.fillStyle = '#e8e2d0'; draw.textAlign = 'center'; draw.textBaseline = 'middle';
    draw.font = 'bold 46px Impact, "Arial Black", sans-serif'; draw.fillText('WHILE YOU WERE AWAY', 256, 70);
    draw.font = 'bold 60px Impact, "Arial Black", sans-serif';
    draw.fillText(hens ? `${eggs} EGG${eggs === 1 ? '' : 'S'} IN STORE` : 'NO HENS YET', 256, 160);
    texture.needsUpdate = true;
  }};
}

// A piece's middle, run and height in the land; a nest box stands in its cell.
function shapeOf(piece) {
  if (piece.kind === 'well') return {...wellInLand(piece), length: HOME_STEP, depth: HOME_STEP, heading: 0, height: 1.2};
  if (HOME_BUILDS[piece.kind]) return {...buildInLand(piece), length: HOME_BUILDS[piece.kind].width * HOME_STEP,
    depth: HOME_BUILDS[piece.kind].depth * HOME_STEP, height: piece.kind === 'tower' ? 6.7 : 2.5};
  if (piece.kind === 'box') return {...boxInLand(piece), length: HOME_BOX.size, heading: 0, height: HOME_BOX.height};
  return {...pieceInLand(piece), height: HOME_PIECES[piece.kind].height};
}

export function createHomeGroundView({course, loadAsset} = {}) {
  if (course && !course.def?.scablands) return null;
  const matrix = new THREE.Matrix4(), quaternion = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), scale = new THREE.Vector3(1, 1, 1);
  const place = (mesh, index, x, y, z, yaw = 0, sx = 1, sy = 1, sz = 1) => {
    quaternion.setFromAxisAngle(up, yaw); scale.set(sx, sy, sz);
    mesh.setMatrixAt(index, matrix.compose(new THREE.Vector3(x, y, z), quaternion, scale));
  };
  const group = new THREE.Group(); group.name = 'home-ground'; group.visible = false;
  const moss = createStoryPeopleView(loadAsset);
  group.add(moss.group);
  let mossCast = [], mossKey = '';
  const crew = createStoryPeopleView(loadAsset);
  group.add(crew.group);
  let crewCast = [], crewKey = '';
  const wear = tinTexture();
  const std = (name, color, extra = {}) => new THREE.MeshStandardMaterial({name, color, roughness: .82, metalness: .18, ...extra});
  const materials = {
    tin: std('home tin', 0xc4c2b8, {map: wear, side: THREE.DoubleSide, flatShading: true}),
    buildingTin: std('home building tin', 0xa39b89, {map: wear, side: THREE.DoubleSide, roughness: .94, flatShading: true}),
    seamRust: std('home sheet seams', 0x623923, {roughness: 1}),
    post: std('home posts', 0x4a4036, {roughness: .9}),
    stake: std('home stakes', 0x8a6a44, {roughness: .95, metalness: 0}),
    flag: std('home flags', 0xb8432a, {roughness: .95, metalness: 0, side: THREE.DoubleSide}),
    rope: std('home rope', 0xb59a6a, {roughness: 1, metalness: 0}),
    board: std('home board', 0xffffff, {roughness: .7, metalness: .1}),
    outline: new THREE.MeshBasicMaterial({name: 'home outline', color: OUTLINE.build, transparent: true, opacity: .32, depthWrite: false}),
    fill: new THREE.MeshBasicMaterial({name: 'home outline fill', color: OUTLINE.build, transparent: true, opacity: .55, depthWrite: false}),
    edge: new THREE.LineBasicMaterial({name: 'home outline edge', color: OUTLINE.build}),
    mark: new THREE.MeshBasicMaterial({name: 'home marks', color: 0xf4f1e6, transparent: true, opacity: .8, depthWrite: false}),
    grid: new THREE.LineBasicMaterial({name: 'home grid', color: 0xf4f1e6, transparent: true, opacity: .22, depthWrite: false}),
    // HOME-GROUND-2
    tint: new THREE.MeshStandardMaterial({name: 'home ground tint', color: 0x5c4a36, roughness: 1, metalness: 0, transparent: true,
      opacity: .3, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2}),
    crate: std('home crate', 0x8b7a62, {roughness: .95, metalness: 0}),
    straw: std('home straw', 0xc8a55a, {roughness: 1, metalness: 0}),
    egg: std('home egg', 0xb27a4e, {roughness: .55, metalness: 0}),
    top: new THREE.MeshBasicMaterial({name: 'home pieces from above', color: 0x26241f}),
    me: new THREE.MeshBasicMaterial({name: 'home where he stands', color: 0xf2c14a, depthTest: false, transparent: true}),
    news: std('home news board', 0xffffff, {roughness: .7, metalness: .1}),
  };
  const ground = (x, z, shift) => scablandsSurfaceHeightAt(x, z) + (shift?.(x, z) ?? 0);
  const geometries = [];
  const keep = geometry => { geometries.push(geometry); return geometry; };

  const buildings = new Map(), haul = createHaulLoadLook(), loadDraws = new Map();
  const towers = createHomeTowerLook(loadAsset);
  const raiders = createHomeRaidersLook(loadAsset); group.add(raiders.group);
  const cuttings = createDrillCuttingsView(group, scablandsSurfaceHeightAt);
  let waterClock = null;
  materials.chalk = new THREE.LineBasicMaterial({color: 0xe8e2cf});
  materials.water = std('home tank water gauge', 0x558c98, {roughness: .3, metalness: .1});
  const cylinder = (radius, height, material) => new THREE.Mesh(keep(new THREE.CylinderGeometry(radius, radius, height, 20)), material);
  const well = new THREE.Group(); well.name = 'home-well'; group.add(well);
  const wellMark = new THREE.LineSegments(keep(new THREE.EdgesGeometry(new THREE.BoxGeometry(HOME_STEP, .03, HOME_STEP))), materials.chalk);
  wellMark.name = 'home-well-mark'; wellMark.position.y = .04; well.add(wellMark);
  const hole = cylinder(.17, .025, materials.post); hole.name = 'home-well-hole'; hole.position.y = .03; well.add(hole);
  const pump = new THREE.Group(); pump.name = 'home-hand-pump'; well.add(pump);
  const foot = cylinder(.25, .08, materials.post); foot.position.y = .04; pump.add(foot);
  const barrel = cylinder(.12, .85, materials.tin); barrel.position.y = .5; pump.add(barrel);
  const cap = cylinder(.17, .07, materials.post); cap.position.y = .96; pump.add(cap);
  const spout = cylinder(.045, .38, materials.tin); spout.rotation.z = Math.PI / 2; spout.position.set(-.22, .72, 0); pump.add(spout);
  const tip = cylinder(.045, .12, materials.tin); tip.position.set(-.4, .67, 0); pump.add(tip);
  const handle = new THREE.Mesh(keep(new THREE.BoxGeometry(.055, .055, .65)), materials.post);
  handle.name = 'home-pump-handle'; handle.position.set(0, 1.06, .22); handle.rotation.x = -.22; pump.add(handle);
  materials.building = yardSurface();
  const crewProps = ['rook', 'wren'].map(id => {
    const prop = new THREE.Group(); prop.name = 'home-tool-' + id;
    if (id === 'rook') {
      for (let n = 0; n < 3; n++) {
        const sheet = new THREE.Mesh(keep(buildingTin(.8, 1.2, {seed: n + 90})), materials.tin);
        sheet.position.z = n * .03; prop.add(sheet);
      }
    } else {
      const handle = new THREE.Mesh(keep(new THREE.BoxGeometry(.035, .32, .035)), materials.post);
      handle.position.y = .13; prop.add(handle);
      const head = new THREE.Mesh(keep(new THREE.BoxGeometry(.18, .075, .075)), materials.tin);
      head.position.y = .3; prop.add(head);
    }
    group.add(prop); return prop;
  });
  function buildingDraw(kind, key) {
    if (buildings.has(key)) return buildings.get(key);
    const drawn = new THREE.Group(); drawn.name = 'home-' + kind; group.add(drawn);
    const w = HOME_BUILDS[kind].width * HOME_STEP, d = HOME_BUILDS[kind].depth * HOME_STEP;
    const stages = Array.from({length: 4}, (_, index) => { const part = new THREE.Group(); part.name = kind + '-stage-' + (index + 1); drawn.add(part); return part; });
    if (kind === 'tank') {
      // A small riveted tin drum on a braced steel stand, built with the coop's materials and stage renderer.
      for (const x of [-.8, .8]) {
        const rail = new THREE.Mesh(keep(new THREE.BoxGeometry(.14, .12, 1.8)), materials.post);
        rail.position.set(x, .06, 0); stages[0].add(rail);
      }
      for (const x of [-.7, .7]) for (const z of [-.7, .7]) {
        const leg = new THREE.Mesh(keep(new THREE.BoxGeometry(.1, .8, .1)), materials.post);
        leg.position.set(x, .5, z); stages[1].add(leg);
      }
      for (const side of [-1, 1]) {
        const brace = new THREE.Mesh(keep(new THREE.BoxGeometry(1.6, .07, .07)), materials.post);
        brace.position.set(0, .5, side * .7); brace.rotation.z = side * .4; stages[1].add(brace);
      }
      const drum = cylinder(.65, .75, materials.tin); drum.name = 'home-tank-drum'; drum.position.y = 1.25; stages[2].add(drum);
      for (const y of [.9, 1.25, 1.6]) {
        const seam = new THREE.Mesh(keep(new THREE.TorusGeometry(.655, .018, 6, 32)), materials.seamRust);
        seam.rotation.x = Math.PI / 2; seam.position.y = y; stages[2].add(seam);
      }
      for (let n = 0; n < 8; n++) {
        const bolt = cylinder(.018, .035, materials.post); bolt.rotation.x = Math.PI / 2;
        bolt.position.set(Math.sin(n * Math.PI / 4) * .66, 1.58, Math.cos(n * Math.PI / 4) * .66);
        bolt.rotation.z = -n * Math.PI / 4; stages[2].add(bolt);
      }
      const lid = cylinder(.67, .07, materials.tin); lid.name = 'home-tank-lid'; lid.position.y = 1.67; stages[3].add(lid);
      const hatch = cylinder(.16, .06, materials.post); hatch.position.y = 1.73; stages[3].add(hatch);
      const gaugeBack = new THREE.Mesh(keep(new THREE.BoxGeometry(.12, .7, .025)), materials.post);
      gaugeBack.position.set(0, 1.25, .66); stages[2].add(gaugeBack);
      const water = new THREE.Mesh(keep(new THREE.BoxGeometry(.065, .64, .03).translate(0, .32, 0)), materials.water);
      water.name = 'home-tank-water-level'; water.position.set(0, .93, .68); stages[2].add(water);
      const pipe = cylinder(.045, 1, materials.post); pipe.name = 'home-well-tank-pipe'; group.add(pipe);
      const mark = new THREE.LineSegments(keep(new THREE.EdgesGeometry(new THREE.BoxGeometry(w, .03, d))), materials.chalk);
      mark.name = 'tank-footprint'; mark.position.y = .07; drawn.add(mark);
      const result = {drawn, stages, mark, water, pipe}; buildings.set(key, result); return result;
    }
    if (kind === 'tower') {
      towers.add(stages);
      const mark = new THREE.LineSegments(keep(new THREE.EdgesGeometry(new THREE.BoxGeometry(w, .03, d))), materials.chalk);
      mark.name = 'tower-footprint'; mark.position.y = .07; drawn.add(mark);
      const result = {drawn, stages, mark}; buildings.set(key, result); return result;
    }
    const scrap = (stage, make) => {
      const builder = scrapBuilder(); make(builder.frame(0, 0, 0, 0));
      const geometry = keep(mergeGeometries(builder.parts, false));
      builder.parts.forEach(part => part.dispose());
      const mesh = new THREE.Mesh(geometry, materials.building); mesh.castShadow = mesh.receiveShadow = true; stages[stage].add(mesh);
    };
    scrap(0, f => {
      for (let x = -w / 2 + .25; x < w / 2; x += .5) f.box(.49, .08, d, x, .04, 0, 0x655a47, {ribs: true, foot: .3});
    });
    scrap(1, f => {
      for (const x of [-w / 2, w / 2]) for (const z of [-d / 2, d / 2])
        f.strut([x, 0, z], [x + (x < 0 ? .035 : -.02), z < 0 ? 2.45 : 2.1, z + .02], .13, 0x51473b);
      for (const z of [-d / 2, d / 2]) f.box(w, .13, .12, 0, z < 0 ? 2.4 : 2.05, z, 0x51473b);
      for (const x of [-w / 2, w / 2]) {
        f.strut([x, 2.4, -d / 2], [x, 2.05, d / 2], .12, 0x51473b);
        f.strut([x, .1, -d / 2], [x, 1.7, -d / 2 + 1.3], .08, 0x493d31);
      }
    });
    const tin = (stage, width, height, x, y, z, yaw = 0, pitch = 0, seed = 1) => {
      const sheets = new THREE.Group(); sheets.position.set(x, y, z); sheets.rotation.set(pitch, yaw, 0);
      stages[stage].add(sheets);
      // Separate overlapping sheets carry their own rust seams, bent corners and dents.
      const count = Math.ceil(width / 1.05), span = width / count;
      for (let n = 0; n < count; n++) {
        const bent = (n + seed) % 3 === 0;
        const geometry = keep(buildingTin(span + .035, height, {seed: seed + n,
          dents: [{x: -.17, y: height * .3, r: .28, depth: .09},
            {x: span / 2, y: .08, r: .22, depth: bent ? -.13 : .025}]}));
        const mesh = new THREE.Mesh(geometry, materials.buildingTin);
        mesh.position.x = -width / 2 + span * (n + .5); mesh.rotation.y = bent ? .018 : -.008;
        mesh.castShadow = mesh.receiveShadow = true; sheets.add(mesh);
        const seam = new THREE.Mesh(keep(buildingTin(.045, height, {seed: seed + n})), materials.seamRust);
        seam.position.set(-width / 2 + span * n, 0, .012); sheets.add(seam);
      }
    };
    tin(2, w, 2.4, 0, .08, -d / 2, Math.PI, 0, 7);
    for (const side of [-1, 1]) tin(2, d, 2.1, side * w / 2, .08, 0, side * Math.PI / 2, 0, 12 + side);
    if (kind === 'shed') {
      for (const side of [-1, 1]) tin(2, 1.3, 2.1, side * 1.35, .08, d / 2, 0, 0, 19 + side);
      tin(2, 1.3, 1.95, .72, .08, d / 2 - .65, Math.PI / 2, 0, 22);
    } else {
      // Wire on the front of the run, with a central opening. Hens remain visible inside.
      const points = [];
      for (const side of [-1, 1]) {
        const lo = side < 0 ? -2 : .65, hi = side < 0 ? -.65 : 2;
        for (let x = lo; x <= hi; x += .1) points.push(x, .1, d / 2, x, 1.2, d / 2);
        for (let y = .1; y <= 1.2; y += .1) points.push(lo, y, d / 2, hi, y, d / 2);
      }
      const geometry = keep(new THREE.BufferGeometry()); geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
      materials.wire ??= new THREE.LineBasicMaterial({color: 0x6a655a});
      stages[2].add(new THREE.LineSegments(geometry, materials.wire));
    }
    const slope = Math.atan2(.35, d), run = Math.hypot(d, .35) + .3;
    tin(3, w + .3, run, 0, 2.03, d / 2 + .15, 0, -Math.PI / 2 + slope, 31);
    const mark = new THREE.LineSegments(keep(new THREE.EdgesGeometry(new THREE.BoxGeometry(w, .03, d))), materials.chalk);
    mark.name = kind + '-footprint'; mark.position.y = .07; drawn.add(mark);
    const result = {drawn, stages, mark}; buildings.set(key, result); return result;
  }

  // ---- The bare ground: four stakes with rag flags, pegs every 8 m and a rope between them, 0.35 m up. ----------
  const bounds = new THREE.Group(); bounds.name = 'home-ground-bounds'; group.add(bounds);
  const stakeGeometry = keep(new THREE.BoxGeometry(.12, 1.3, .12).translate(0, .65, 0));
  const pegGeometry = keep(new THREE.BoxGeometry(.07, .5, .07).translate(0, .25, 0));
  const flagGeometry = keep(new THREE.PlaneGeometry(.42, .28).translate(.21, 1.12, 0));
  const ropeGeometry = keep(new THREE.CylinderGeometry(.018, .018, 1, 5).rotateZ(Math.PI / 2));
  const corners = [[0, 0], [HOME_SIZE, 0], [HOME_SIZE, HOME_SIZE], [0, HOME_SIZE]];
  const rope = [];
  for (let side = 0; side < 4; side++) {
    const [ax, az] = corners[side], [bx, bz] = corners[(side + 1) % 4];
    for (let step = 0; step < 5; step++) rope.push([ax + (bx - ax) * step / 5, az + (bz - az) * step / 5]);
  }
  const pegs = new THREE.InstancedMesh(pegGeometry, materials.stake, rope.length);
  const ropes = new THREE.InstancedMesh(ropeGeometry, materials.rope, rope.length);
  const stakes = new THREE.InstancedMesh(stakeGeometry, materials.stake, 4), flags = new THREE.InstancedMesh(flagGeometry, materials.flag, 4);
  bounds.add(pegs, ropes, stakes, flags);

  // ---- His ground, a shade apart from the plain (HOME-GROUND-2). ------------------------------------------------
  const tintGeometry = keep(groundTint(HOME_SIZE));
  const tint = new THREE.Mesh(tintGeometry, materials.tint); tint.name = 'home-ground-tint'; tint.renderOrder = 1; group.add(tint);

  // ---- The stack of panels by the north-east corner, outside the rope. ------------------------------------------
  const stackSheet = keep(corrugated(2, 1).rotateX(-Math.PI / 2));
  const stack = new THREE.InstancedMesh(stackSheet, materials.tin, HOME_PANELS);
  stack.name = 'home-panel-stack'; group.add(stack);
  const stackAt = {x: HOME_CORNER.x + HOME_SIZE + 1.6, z: HOME_CORNER.z + 2.5};

  // ---- Panels: a sheet and a post at each end, one instance each. ------------------------------------------------
  const sheet = keep(corrugated(HOME_STEP, HOME_PIECES.panel.height - .1).translate(0, .1, 0));
  const post = keep(new THREE.BoxGeometry(.09, HOME_PIECES.panel.height + .15, .09).translate(0, (HOME_PIECES.panel.height + .15) / 2, 0));
  const panels = new THREE.InstancedMesh(sheet, materials.tin, HOME_PANELS);
  const posts = new THREE.InstancedMesh(post, materials.post, HOME_PANELS * 2);
  panels.name = 'home-panels'; posts.name = 'home-panel-posts';
  panels.castShadow = posts.castShadow = panels.receiveShadow = true;
  group.add(panels, posts);

  // ---- The gate: two posts, a top bar and two leaves that swing in. ------------------------------------------------
  const gate = new THREE.Group(); gate.name = 'home-gate'; group.add(gate);
  const gateLength = HOME_PIECES.gate.cells * HOME_STEP, gateHeight = HOME_PIECES.gate.height;
  for (const side of [-1, 1]) {
    const mesh = new THREE.Mesh(keep(new THREE.BoxGeometry(GATE_POST * 2, gateHeight + .5, GATE_POST * 2).translate(0, (gateHeight + .5) / 2, 0)), materials.post);
    mesh.position.x = side * gateLength / 2; mesh.castShadow = true; gate.add(mesh);
  }
  const leafWidth = gateLength / 2 - GATE_POST - .05;
  const leafSheet = keep(corrugated(leafWidth - .12, gateHeight - .35).translate(leafWidth / 2, .2, 0));
  const leafFrame = keep(new THREE.BoxGeometry(leafWidth, .07, .07).translate(leafWidth / 2, 0, 0));
  const leafStile = keep(new THREE.BoxGeometry(.07, gateHeight - .2, .07).translate(0, (gateHeight - .2) / 2 + .1, 0));
  const leaves = [-1, 1].map(side => {
    const leaf = new THREE.Group(); leaf.name = 'home-gate-leaf';
    const turn = new THREE.Group(); turn.scale.x = -side; leaf.add(turn);
    turn.add(new THREE.Mesh(leafSheet, materials.tin));
    for (const y of [.15, gateHeight / 2, gateHeight - .1]) { const bar = new THREE.Mesh(leafFrame, materials.post); bar.position.y = y; turn.add(bar); }
    for (const x of [0, leafWidth]) { const stile = new THREE.Mesh(leafStile, materials.post); stile.position.x = x; turn.add(stile); }
    // A brace from the hinge's foot to the far top corner, as a farm gate has.
    const brace = new THREE.Mesh(keep(new THREE.BoxGeometry(Math.hypot(leafWidth, gateHeight - .3), .06, .06)), materials.post);
    brace.position.set(leafWidth / 2, gateHeight / 2, 0); brace.rotation.z = Math.atan2(gateHeight - .3, leafWidth); turn.add(brace);
    leaf.position.x = side * (gateLength / 2 - GATE_POST);
    leaf.traverse(child => { child.castShadow = true; });
    gate.add(leaf);
    return {leaf, side};
  });
  let gateSwing = 0;

  // ---- The board with his ground's name, outside the gate. -------------------------------------------------------
  const board = new THREE.Group(); board.name = 'home-name-board'; group.add(board);
  const plate = nameTexture();
  materials.board.map = plate.texture;
  for (const x of [-.95, .95]) { const leg = new THREE.Mesh(stakeGeometry, materials.post); leg.position.x = x; leg.scale.y = 1.6; board.add(leg); }
  const face = new THREE.Mesh(keep(new THREE.BoxGeometry(2.4, .75, .06)), [materials.post, materials.post, materials.post, materials.post, materials.board, materials.board]);
  face.position.y = 1.75; face.castShadow = true; board.add(face);
  let boardName = null;

  // ---- The board of news, beside the gate's other post (HOME-GROUND-2). ------------------------------------------
  const newsBoard = new THREE.Group(); newsBoard.name = 'home-news-board'; group.add(newsBoard);
  const newsPlate = newsTexture();
  materials.news.map = newsPlate.texture;
  for (const x of [-.85, .85]) { const leg = new THREE.Mesh(stakeGeometry, materials.post); leg.position.x = x; leg.scale.y = 1.4; newsBoard.add(leg); }
  const newsFace = new THREE.Mesh(keep(new THREE.BoxGeometry(2, 1, .06)), [materials.post, materials.post, materials.post, materials.post, materials.news, materials.news]);
  newsFace.position.y = 1.55; newsFace.castShadow = true; newsBoard.add(newsFace);
  let newsKey = null;

  // ---- Nest boxes, Moss's crate of hens and the spare crates (HOME-GROUND-2). -----------------------------------
  // One unit box, scaled into every slat of every crate.
  const slatGeometry = keep(new THREE.BoxGeometry(1, 1, 1));
  const crateParts2 = crateParts(1.1, .6, .55, false);
  const spareParts = crateParts(.8, .55, .5, false);
  const crateSlats = new THREE.InstancedMesh(slatGeometry, materials.crate, crateParts2.length + spareParts.length * 2);
  crateSlats.name = 'home-crates'; crateSlats.castShadow = true;
  group.add(crateSlats);
  // Each nest box is HOME-GROUND-LOOK-1's crate on its side, its open front to the south; the egg it shows is the first
  // of a clutch, and more lie round it as the box fills.
  const nests = [];
  function nest(index) {
    if (nests[index]) return nests[index];
    const box = createNestBox();
    const first = box.userData.egg;
    const clutch = CLUTCH.slice(1).map(([dx, dz]) => {
      const egg = createEgg(); egg.position.set(first.position.x + dx, first.position.y, first.position.z + dz);
      egg.rotation.set(first.rotation.x, first.rotation.y + dx * 20, first.rotation.z); egg.visible = false; box.add(egg);
      return egg;
    });
    group.add(box);
    return (nests[index] = {box, clutch});
  }
  let boxesKey = '';

  // ---- The hens: the wildlife chicken until HOME-GROUND-LOOK-1 (HOME-GROUND-2). ---------------------------------
  const hens = new THREE.Group(); hens.name = 'home-hens'; group.add(hens);
  const henDraws = [];
  let henModel = null, henAsked = false;
  function askHen() {
    if (henAsked || typeof loadAsset !== 'function') return;
    henAsked = true;
    Promise.resolve().then(() => loadAsset(HOME_HEN_MODEL)).then(gltf => { henModel = gltf; }).catch(() => { henModel = null; });
  }
  // The first two wear blue and yellow leg bands, so that he can tell them apart.
  function henDraw(index) {
    if (henDraws[index] || !henModel) return henDraws[index] ?? null;
    const hen = createHen(henModel, {band: index % 2 ? 'yellow' : 'blue', pose: 'peck', phase: index * 1.7});
    hens.add(hen.object);
    return (henDraws[index] = hen);
  }

  // ---- What is rising as he hammers: the panel, the gate's leaves or the nest box, growing up out of the ground. --
  const rising = new THREE.Group(); rising.name = 'home-rising'; group.add(rising);
  const risingSheet = new THREE.Mesh(sheet, materials.tin); risingSheet.castShadow = true;
  const risingPosts = [-1, 1].map(() => { const mesh = new THREE.Mesh(post, materials.post); mesh.castShadow = true; return mesh; });
  const risingLeaves = new THREE.Mesh(keep(corrugated(HOME_PIECES.gate.cells * HOME_STEP - GATE_POST * 2, HOME_PIECES.gate.height - .35).translate(0, .2, 0)), materials.tin);
  const risingCrate = createNestBox({name: 'home-rising-nest-box'});
  rising.add(risingSheet, ...risingPosts, risingLeaves, risingCrate);

  // ---- From above: where he stands, and each built piece as a dark strip of its real length. ------------------
  const tops = new THREE.InstancedMesh(keep(new THREE.BoxGeometry(1, .04, 1)), materials.top, HOME_PANELS + 4);
  tops.name = 'home-pieces-from-above'; tops.renderOrder = 3; group.add(tops);
  const me = new THREE.Group(); me.name = 'home-where-he-stands'; me.renderOrder = 4; group.add(me);
  const meRing = new THREE.Mesh(keep(new THREE.RingGeometry(.9, 1.25, 28).rotateX(-Math.PI / 2)), materials.me);
  const meArrow = new THREE.Mesh(keep(new THREE.ConeGeometry(.55, 1.4, 3).rotateX(Math.PI / 2).translate(0, 0, 1.6)), materials.me);
  meRing.renderOrder = meArrow.renderOrder = 4;
  me.add(meRing, meArrow);

  // ---- The outline he builds with, its hammered fill, and the marks made from above. ----------------------------
  const outline = new THREE.Group(); outline.name = 'home-outline'; group.add(outline);
  const outlineBox = new THREE.Mesh(keep(new THREE.BoxGeometry(1, 1, 1).translate(0, .5, 0)), materials.outline);
  const outlineFill = new THREE.Mesh(keep(new THREE.BoxGeometry(1, 1, 1).translate(0, .5, 0)), materials.fill);
  const outlineEdges = new THREE.LineSegments(keep(new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1).translate(0, .5, 0))), materials.edge);
  outline.add(outlineBox, outlineFill, outlineEdges);
  const outlineCorners = Array.from({length: 4}, () => {
    const post = new THREE.Mesh(keep(new THREE.BoxGeometry(.055, .25, .055)), materials.fill);
    outline.add(post); return post;
  });
  // A mark is a chalk strip half a metre wide, so that it can be seen from straight above.
  const marks = new THREE.InstancedMesh(keep(new THREE.BoxGeometry(1, .08, .5).translate(0, .04, 0)), materials.mark, MOST_MARKS);
  marks.name = 'home-marks'; group.add(marks);
  // The 2 m grid, shown only from above.
  const gridPoints = [];
  for (let n = 0; n <= HOME_CELLS; n++) {
    gridPoints.push(n * HOME_STEP, 0, 0, n * HOME_STEP, 0, HOME_SIZE, 0, 0, n * HOME_STEP, HOME_SIZE, 0, n * HOME_STEP);
  }
  const gridGeometry = keep(new THREE.BufferGeometry());
  gridGeometry.setAttribute('position', new THREE.Float32BufferAttribute(gridPoints, 3));
  const grid = new THREE.LineSegments(gridGeometry, materials.grid); grid.name = 'home-grid'; grid.renderOrder = 2; group.add(grid);

  // A piece's run in the land as a turn of the drawing: a heading of 0 runs east (+x), -PI/2 south (+z).
  const yawOf = heading => heading;
  let drawnKey = '', boundsKey = '';

  return {
    group,
    update(worldJob, here, seconds, drawnShift) {
      const state = worldJob?.open?.parts?.home;
      group.visible = state?.on === true;
      if (!group.visible) return;
      raiders.update(worldJob, here, seconds, drawnShift);
      const record = worldJob.open.world.open.home ?? null;
      const waterDt = waterClock === null ? 0 : Math.max(0, Math.min(.25, seconds - waterClock)); waterClock = seconds;
      well.visible = !!record?.well;
      if (record?.well) {
        const at = wellInLand(record.well);
        well.position.set(at.x, ground(at.x, at.z, drawnShift), at.z);
        wellMark.visible = record.well.depth === 0;
        hole.visible = record.well.depth > 0;
        pump.visible = record.well.pump;
      }
      cuttings.update(state.drillRig?.hole ?? (record?.well ? homeDrillHole(record, worldJob.open.world.seed) : null), waterDt,
        state.drillRig?.machine.heading ?? 0);
      for (const drawing of buildings.values()) { drawing.drawn.visible = false; if (drawing.pipe) drawing.pipe.visible = false; }
      for (const row of record?.builds ?? []) {
        const key = `${row.kind}/${row.i}/${row.j}`, drawing = buildingDraw(row.kind, key);
        const at = buildInLand(row), shape = state.outline;
        const progress = shape?.piece?.kind === row.kind && shape.piece.i === row.i && shape.piece.j === row.j ? shape.progress : 0;
        drawing.drawn.visible = true;
        drawing.drawn.position.set(at.x, ground(at.x, at.z, drawnShift), at.z); drawing.drawn.rotation.y = at.heading;
        drawing.mark.visible = row.stage === 0;
        if (drawing.water) {
          drawing.water.scale.y = Math.max(.001, row.litres / HOME_TANK.litres);
          drawing.pipe.visible = tankConnected(record, row);
          if (drawing.pipe.visible) {
            const from = wellInLand(record.well);
            const a = new THREE.Vector3(from.x, ground(from.x, from.z, drawnShift) + .12, from.z);
            const b = new THREE.Vector3(at.x, ground(at.x, at.z, drawnShift) + .9, at.z);
            drawing.pipe.position.copy(a).add(b).multiplyScalar(.5);
            drawing.pipe.scale.y = a.distanceTo(b);
            drawing.pipe.quaternion.setFromUnitVectors(up, b.sub(a).normalize());
          }
        }
        drawing.stages.forEach((stage, index) => {
          stage.visible = index < row.stage || (index === row.stage && progress > 0);
          stage.scale.y = index === row.stage ? Math.max(.01, progress) : 1;
        });
      }
      for (const kind of Object.keys(HOME_BUILDS)) {
        const row = record?.builds?.find(item => item.kind === kind && item.stage < 4) ?? record?.builds?.find(item => item.kind === kind);
        const location = record?.loads?.[kind];
        const onBed = location === 'bed' && state.flatbedOuting;
        const show = !!record?.boxes?.length && location && (location !== 'bed' || onBed) && !(row?.stage > 0);
        let load = loadDraws.get(kind);
        if (show && !load) {
          load = new THREE.Group(); load.name = 'home-load-' + kind;
          const sheetCount = kind === 'coop' ? 8 : 10, postCount = kind === 'coop' ? 4 : 6;
          for (let n = 0; n < sheetCount; n++) {
            const sheet = new THREE.Mesh(keep(buildingTin(2, 1, {seed: n + 3})), materials.tin);
            sheet.rotation.x = -Math.PI / 2; sheet.position.set((n % 3 - 1) * .02, .06 + n * .035, .5);
            sheet.castShadow = true; load.add(sheet);
          }
          for (let n = 0; n < postCount; n++) {
            const post = haul.piece({id: 'home-' + kind + '-post-' + n, kind: 'rail'}, 'steel');
            post.position.set(0, .5 + Math.floor(n / 3) * .1, -.25 + n % 3 * .17); post.scale.set(.6, .18, .18);
            load.add(post);
          }
          if (kind === 'coop') {
            for (let n = 0; n < 8; n++) {
              const roll = new THREE.Mesh(keep(new THREE.TorusGeometry(.22, .008, 4, 20)), materials.post);
              roll.rotation.y = Math.PI / 2; roll.position.set(.55 + n * .04, .63, .3); load.add(roll);
            }
          } else if (kind === 'shed') {
            const door = new THREE.Mesh(keep(buildingTin(.9, 1.9, {seed: 50})), materials.tin);
            door.rotation.x = -Math.PI / 2; door.position.set(0, .85, .95); load.add(door);
          }
          group.add(load); loadDraws.set(kind, load);
        }
        if (load) {
          load.visible = !!show;
          if (show) {
            const at = onBed ? record.flatbed : location === 'stack' ?
              {...HOME_LOAD_STACK, x: HOME_LOAD_STACK.x + (kind === 'shed' ? 2.7 : kind === 'tower' ? -2.7 : 0),
                z: HOME_LOAD_STACK.z + (kind === 'tank' ? 2.7 : 0)} : groundPoint(location.i, location.j);
            // The supply-truck model's deck is 1.5125 m high, behind its cab. Its wheels touch y=0.
            const yaw = onBed ? at.yaw : 0, behind = onBed ? -1.4 : 0;
            load.position.set(at.x + Math.sin(yaw) * behind, ground(at.x, at.z, drawnShift) + (onBed ? 1.5125 : 0),
              at.z + Math.cos(yaw) * behind);
            load.rotation.y = yaw;
          }
        }
      }
      const deliveryGate = gateOf(record), delivery = record && hensWaiting(record) ? crateSpot(deliveryGate) : null;
      const nextMossKey = delivery ? `${delivery.x}/${delivery.z}` : '';
      if (mossKey !== nextMossKey) {
        mossKey = nextMossKey;
        mossCast = [];
        if (delivery) {
          const gateAt = pieceInLand(deliveryGate);
          const x = delivery.x + Math.cos(gateAt.heading) * 1.3;
          const z = delivery.z - Math.sin(gateAt.heading) * 1.3;
          mossCast = createStoryPeople([{id: 'moss', position: {x, y: ground(x, z), z},
            yaw: Math.atan2(gateAt.x - x, gateAt.z - z)}]);
        }
      }
      moss.update({open: worldJob.open, storyPeople: mossCast, storySpeaker: state.crateTalk ? 'moss' : null}, here, seconds, drawnShift);
      const people = state.crewPeople ?? [], nextCrewKey = people.map(person => person.id).join('/');
      if (nextCrewKey !== crewKey) {
        crewKey = nextCrewKey;
        crewCast = createStoryPeople(people.map(person => ({id: person.id,
          figure: person.id === 'rook' ? 'clinker' : 'dace',
          position: {x: person.x, y: ground(person.x, person.z), z: person.z}, yaw: person.yaw})));
      }
      crewCast.forEach((person, index) => {
        const at = people[index];
        person.position = {x: at.x, y: ground(at.x, at.z), z: at.z};
        person.yaw = at.yaw; person.distance = at.walked;
        person.action = at.working || state.crewTalk ? 'stand' : 'walk';
      });
      crew.update({open: worldJob.open, storyPeople: crewCast, storySpeaker: state.crewTalk ? 'wren' : null}, here, seconds, drawnShift);
      crewProps.forEach((prop, index) => {
        const person = crewCast[index], at = people[index];
        prop.visible = !!person && !state.crewTalk;
        if (!person) return;
        // The figures and their implements are presentation only. No work is counted by this stroke.
        const root = crew.group.getObjectByName('home-person-' + person.id) ??
          crew.group.getObjectByName('story-person-' + person.figure);
        if (root) {
          root.name = 'home-person-' + person.id;
          root.scale.set(person.id === 'rook' ? 1.08 : 1, person.id === 'rook' ? 1.05 : 1, 1);
        }
        const yaw = person.yaw, swing = at.working && index === 1 ? Math.sin(seconds * Math.PI * 2 / .6) : 0;
        prop.position.set(person.position.x + Math.sin(yaw) * .5 + Math.cos(yaw) * .3,
          person.position.y + (index ? 1.05 + swing * .12 : .65) + (drawnShift?.(at.x, at.z) ?? 0),
          person.position.z + Math.cos(yaw) * .5 - Math.sin(yaw) * .3);
        prop.rotation.set(swing * .7, yaw, 0);
        if (root && at.working && index === 1 && !state.crewTalk) {
          root.traverse(node => { if (node.isBone && node.name.replace(/_\d+$/, '').replace(/\./g, '') === 'upper_armR') node.rotateX(-.8 + swing * .35); });
        }
      });
      // The bounds and the stack: drawn once, again when the drawn ground moves.
      const shiftKey = String(drawnShift?.(HOME_CORNER.x, HOME_CORNER.z) ?? 0);
      if (boundsKey !== shiftKey) {
        boundsKey = shiftKey;
        rope.forEach(([x, z], index) => {
          const at = {x: HOME_CORNER.x + x, z: HOME_CORNER.z + z}, [nx, nz] = rope[(index + 1) % rope.length];
          const to = {x: HOME_CORNER.x + nx, z: HOME_CORNER.z + nz};
          const y = ground(at.x, at.z, drawnShift), y2 = ground(to.x, to.z, drawnShift);
          place(pegs, index, at.x, y, at.z);
          const length = Math.hypot(to.x - at.x, to.z - at.z, y2 - y);
          quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), new THREE.Vector3(to.x - at.x, y2 - y, to.z - at.z).normalize());
          ropes.setMatrixAt(index, matrix.compose(new THREE.Vector3((at.x + to.x) / 2, (y + y2) / 2 + .35, (at.z + to.z) / 2), quaternion, scale.set(length, 1, 1)));
        });
        corners.forEach(([x, z], index) => {
          const at = {x: HOME_CORNER.x + x, z: HOME_CORNER.z + z}, y = ground(at.x, at.z, drawnShift);
          place(stakes, index, at.x, y, at.z); place(flags, index, at.x, y, at.z, index * .9);
        });
        for (const mesh of [pegs, ropes, stakes, flags]) mesh.instanceMatrix.needsUpdate = true;
        // The tint follows the ground's rise, a few centimetres above it.
        const at = tintGeometry.attributes.position;
        for (let n = 0; n < at.count; n++) at.setY(n, ground(HOME_CORNER.x + at.getX(n), HOME_CORNER.z + at.getZ(n), drawnShift) + .04);
        at.needsUpdate = true; tintGeometry.computeVertexNormals(); tintGeometry.computeBoundingSphere();
        tint.position.set(HOME_CORNER.x, 0, HOME_CORNER.z);
        drawnKey = ''; boxesKey = '';
      }
      // The pieces, the stack and the board, when the record changes.
      const key = JSON.stringify([record?.pieces ?? [], record?.marks ?? [], shiftKey]);
      if (key !== drawnKey) {
        drawnKey = key;
        let panelCount = 0, postCount = 0;
        for (const piece of (record?.pieces ?? []).filter(row => row.kind === 'panel')) {
          const {x, z, length, heading} = pieceInLand(piece);
          const along = {x: Math.cos(heading), z: -Math.sin(heading)};
          if (piece.down) {
            const pose = new THREE.Object3D();
            pose.position.set(x, ground(x, z, drawnShift) + .06, z);
            pose.rotation.set(Math.PI / 2, 0, 0); pose.rotateOnWorldAxis(up, heading); pose.updateMatrix();
            panels.setMatrixAt(panelCount++, pose.matrix);
            continue;
          }
          place(panels, panelCount++, x, ground(x, z, drawnShift), z, yawOf(heading));
          for (const end of [-1, 1]) {
            const px = x + along.x * end * length / 2, pz = z + along.z * end * length / 2;
            place(posts, postCount++, px, ground(px, pz, drawnShift), pz, yawOf(heading));
          }
        }
        panels.count = panelCount; posts.count = postCount;
        panels.instanceMatrix.needsUpdate = posts.instanceMatrix.needsUpdate = true;
        panels.computeBoundingSphere(); posts.computeBoundingSphere();
        const left = record ? panelsLeft(record) : HOME_PANELS;
        // Four stacks side by side, each sheet laid a little askew.
        for (let n = 0; n < left; n++) {
          const pile = n % 4, level = Math.floor(n / 4);
          const x = stackAt.x + pile * 1.15 + ((n * 37) % 7 - 3) * .012, z = stackAt.z + ((n * 23) % 5 - 2) * .015;
          place(stack, n, x, ground(x, z, drawnShift) + .05 + level * .045, z, Math.PI / 2 + ((n * 13) % 9 - 4) * .01);
        }
        stack.count = left; stack.instanceMatrix.needsUpdate = true; stack.computeBoundingSphere();
        const standing = gateOf(record);
        gate.visible = board.visible = newsBoard.visible = !!standing;
        if (standing) {
          const {x, z, heading} = pieceInLand(standing);
          gate.position.set(x, ground(x, z, drawnShift), z); gate.rotation.y = yawOf(heading);
          const spot = boardSpot(standing);
          board.position.set(spot.x, ground(spot.x, spot.z, drawnShift), spot.z); board.rotation.y = spot.yaw;
          const news = newsBoardSpot(standing);
          newsBoard.position.set(news.x, ground(news.x, news.z, drawnShift), news.z); newsBoard.rotation.y = news.yaw;
        }
        // From above, every built piece is a dark strip along its run, as long as it is and easily seen.
        let topCount = 0;
        for (const piece of record?.pieces ?? []) {
          const {x, z, length, heading} = pieceInLand(piece);
          place(tops, topCount++, x, ground(x, z, drawnShift) + HOME_PIECES[piece.kind].height + .05, z, yawOf(heading), length, 1,
            piece.kind === 'gate' ? .6 : .32);
        }
        tops.count = topCount; tops.instanceMatrix.needsUpdate = true; tops.computeBoundingSphere();
        const markList = (record?.marks ?? []).slice(0, MOST_MARKS);
        markList.forEach((mark, index) => {
          const {x, z, length, heading} = pieceInLand(mark);
          place(marks, index, x, ground(x, z, drawnShift) + .02, z, yawOf(heading), length, 1, 1);
        });
        marks.count = markList.length; marks.instanceMatrix.needsUpdate = true; marks.computeBoundingSphere();
      }
      if (record && boardName !== record.name) { boardName = record.name; plate.write(record.name); }
      const hensKept = record?.hens ?? [];
      const nextNews = `${record?.eggs ?? 0}/${hensKept.length}`;
      if (record && newsKey !== nextNews) { newsKey = nextNews; newsPlate.write(record.eggs ?? 0, hensKept.length > 0); }

      // The nest boxes with their straw and eggs, Moss's crate of hens by the gate, and the crates he still has.
      const waiting = !!record && hensWaiting(record);
      const crateAt = crateSpot(gateOf(record));
      const nextBoxes = JSON.stringify([record?.boxes ?? [], waiting, hensKept.length, crateAt, boundsKey]);
      if (nextBoxes !== boxesKey) {
        boxesKey = nextBoxes;
        const boxes = record?.boxes ?? [];
        for (let index = 0; index < Math.max(boxes.length, nests.length); index++) {
          const box = boxes[index], drawn = box ? nest(index) : nests[index];
          drawn.box.visible = !!box;
          if (!box) continue;
          const {x, z} = boxInLand(box);
          drawn.box.position.set(x, ground(x, z, drawnShift), z);
          const shown = Math.min(EGGS_DRAWN, Math.ceil(box.eggs * EGGS_DRAWN / BOX_HOLDS));
          drawn.box.userData.setEgg(shown > 0);
          drawn.clutch.forEach((egg, n) => { egg.visible = n + 1 < shown; });
        }
        let crates = 0;
        const spares = waiting ? 1 : crateAt ? cratesLeft(record) : 0;
        if (crateAt) {
          const y0 = ground(crateAt.x, crateAt.z, drawnShift);
          if (waiting) for (const part of crateParts2) place(crateSlats, crates++, crateAt.x + part.x, y0 + part.y, crateAt.z + part.z, 0, part.sx, part.sy, part.sz);
          for (let n = 0; n < spares; n++) {
            const sx = crateAt.x + 1.4 + n * .95, sz = crateAt.z + .4;
            const y = ground(sx, sz, drawnShift);
            for (const part of spareParts) place(crateSlats, crates++, sx + part.x, y + part.y, sz + part.z, .2, part.sx, part.sy, part.sz);
          }
        }
        crateSlats.count = crates;
        crateSlats.instanceMatrix.needsUpdate = true; crateSlats.computeBoundingSphere();
      }

      // The hens: in Moss's crate until he takes them, then about his ground as the part walks them. A hen sitting is on
      // the seat of the box she lays in.
      const flock = state.flock ?? [];
      const henCount = waiting ? 2 : flock.length;
      if (henCount) askHen();
      for (let index = 0; index < Math.max(henCount, henDraws.length); index++) {
        const drawn = index < henCount ? henDraw(index) : henDraws[index];
        if (!drawn) continue;
        drawn.object.visible = index < henCount;
        if (!drawn.object.visible) continue;
        let x, z, yaw, mode;
        if (waiting && crateAt) ({x, z, yaw, mode} = {x: crateAt.x + (index ? .25 : -.25), z: crateAt.z, yaw: index ? -2.2 : .8, mode: 'stand'});
        else ({x, z, yaw, mode} = flock[index]);
        let y = ground(x, z, drawnShift) + (waiting ? .05 : 0);
        if (mode === 'sit') {
          // On the nest box nearest her, facing out of its open front.
          const sat = nests.filter(row => row.box.visible).map(row => row.box)
            .sort((a, b) => Math.hypot(a.position.x - x, a.position.z - z) - Math.hypot(b.position.x - x, b.position.z - z))[0];
          if (sat) { const seat = sat.userData.seat; x = sat.position.x + seat.x; z = sat.position.z + seat.z; y = sat.position.y + seat.y; yaw = 0; }
        }
        drawn.object.position.set(x, y, z);
        // The hen's nose is along +X; a yaw of 0 faces +z.
        drawn.object.rotation.y = yaw - Math.PI / 2;
        const pose = mode === 'roost' ? 'stand' : mode;
        if (drawn.pose !== pose) drawn.setPose(pose);
        drawn.update(seconds);
      }
      hens.visible = henCount > 0;
      // The gate swings in over about a second when he comes near, and shuts behind him.
      const target = state.gateOpen ? 1 : 0;
      gateSwing += Math.sign(target - gateSwing) * Math.min(Math.abs(target - gateSwing), 1 / 60);
      for (const {leaf, side} of leaves) leaf.rotation.y = side * gateSwing * Math.PI * .45;
      // A ground rectangle and four short posts leave the view clear. The faint first stage stays near the soil.
      const shape = state.outline;
      outline.visible = !!shape;
      grid.visible = tops.visible = state.above === true;
      // From above, a yellow ring and arrow where he stands, the way he faces.
      me.visible = state.above === true && !!state.standing;
      if (me.visible) {
        me.position.set(state.standing.x, ground(state.standing.x, state.standing.z, drawnShift) + 2.4, state.standing.z);
        me.rotation.y = state.standing.yaw;
      }
      // The ground slopes half a metre, so the flat grid stands just above its highest corner.
      if (grid.visible) grid.position.set(HOME_CORNER.x, Math.max(...corners.map(([x, z]) =>
        ground(HOME_CORNER.x + x, HOME_CORNER.z + z, drawnShift))) + .12, HOME_CORNER.z);
      rising.visible = !!shape && !HOME_BUILDS[shape.piece?.kind] && shape.piece?.kind !== 'well' && shape.mode === 'build' && shape.progress > 0 && !state.above;
      if (shape) {
        const piece = shape.mode === 'lift' ? shape.target : shape.piece;
        const {x, z, length, heading, height: tall, depth: buildingDepth} = shapeOf(piece);
        const height = state.above ? .12 : Math.min(.18, tall * .1);
        const colour = OUTLINE[shape.mode] ?? OUTLINE.build;
        materials.outline.color.setHex(colour); materials.fill.color.setHex(colour); materials.edge.color.setHex(colour);
        const wobble = shape.shake ? Math.sin(seconds * 60) * .06 : 0;
        outline.position.set(x + wobble, ground(x, z, drawnShift) + .045, z); outline.rotation.y = yawOf(heading);
        // From above the outline is drawn a metre thick, or it would be a hair seen from 60 m.
        const depth = buildingDepth ?? (state.above ? 1 : .3);
        outlineBox.scale.set(length, height, depth); outlineEdges.scale.set(length, .025, depth);
        outlineCorners.forEach((post, index) => post.position.set((index % 2 ? 1 : -1) * length / 2, .1,
          (index < 2 ? -1 : 1) * depth / 2));
        // While he hammers, the real piece rises out of the ground through its seconds, and the pale fill is not drawn.
        outlineFill.visible = shape.progress > 0 && !rising.visible && !buildingDepth;
        // The outline fades to a faint frame so that the rising piece is what he sees.
        materials.outline.opacity = rising.visible || (buildingDepth && shape.progress > 0) ? .04 : .1;
        outlineFill.scale.set(length * .98, Math.max(.01, height * shape.progress), depth + .02);
        if (rising.visible) {
          const grow = Math.max(.04, shape.progress);
          rising.position.copy(outline.position); rising.position.x -= wobble; rising.rotation.y = outline.rotation.y;
          risingSheet.visible = piece.kind === 'panel'; risingLeaves.visible = piece.kind === 'gate'; risingCrate.visible = piece.kind === 'box';
          for (const [index, side] of [-1, 1].entries()) {
            risingPosts[index].visible = piece.kind === 'panel';
            risingPosts[index].position.set(side * length / 2, 0, 0);
            // The posts are driven in first, in the first third of the hammering.
            risingPosts[index].scale.y = Math.min(1, grow * 3);
          }
          risingSheet.scale.y = risingLeaves.scale.y = grow;
          risingCrate.scale.set(1, grow, 1);
        }
      }
    },
    dispose() {
      cuttings.dispose();
      towers.dispose();
      raiders.dispose();
      moss.dispose();
      crew.dispose();
      for (const load of loadDraws.values()) for (const mesh of [...load.children]) if (mesh.name.startsWith('haul-piece:')) haul.release(mesh);
      haul.dispose();
      for (const geometry of geometries) geometry.dispose();
      for (const material of Object.values(materials)) { material.map?.dispose?.(); material.dispose(); }
      for (const mesh of [pegs, ropes, stakes, flags, stack, panels, posts, marks, crateSlats, tops]) mesh.dispose();
      for (const drawn of henDraws) drawn?.dispose();
    },
  };
}
