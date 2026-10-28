// Draws what a track script adds to the road: surface overlays (gravel, packed
// snow, ice, deep snow) and braking and ICE boards. Drawing only: the driving
// code reads the same positions from the Course and nothing here changes state.
import * as THREE from 'three';
import { strip, worldAtExtended } from './world-surfaces.js';
import {createOnFootFigures} from './onfoot-figures.js';
import {PIT,otherTyre} from './pit-lane.js';
import { SURFACES } from './race-surfaces.js';
import {winterSurfaceMaterial} from './snow-world.js';
import { addCircuitEffects } from './circuit-effects.js';
import { TRACK_SCRIPT } from './track-script.js';

const OVERLAY = {
  gravel: { color: 0x8c775a, roughness: 1, metalness: 0, lift: .046, tracks: false },
  snow: { color: 0xe3e9ee, roughness: .93, metalness: 0, lift: .047, tracks: true },
  ice: { color: 0x9db6c6, roughness: .07, metalness: .18, lift: .048, tracks: false, emissive: 0x16222c },
  'deep-snow': { color: 0xf1f5f8, roughness: 1, metalness: 0, lift: .16, tracks: false },
};

// Runs of one surface along the road: stretches from the script, then patches.
export function surfaceRuns(course) {
  const runs = [], script = course.script;
  let open = null;
  for (const piece of script.pieces) {
    if (piece.surface !== 'asphalt' && piece.surface !== 'warm-tarmac') {
      if (open && open.kind === piece.surface && Math.abs(open.s1 - piece.s0) < 1e-6) open.s1 = piece.s1;
      else { open = { kind: piece.surface, s0: piece.s0, s1: piece.s1, from: -Infinity, to: Infinity }; runs.push(open); }
    } else open = null;
  }
  for (const patch of course.features.surfacePatches ?? []) runs.push({ kind: patch.kind, s0: patch.s0, s1: patch.s1, from: patch.from ?? -Infinity, to: patch.to ?? Infinity });
  return runs;
}

function overlayMaterial(kind, winter = false) {
  const look = OVERLAY[kind];
  const material = new THREE.MeshStandardMaterial({ name: `${SURFACES[kind].name} road`, color: look.color, roughness: look.roughness, metalness: look.metalness,
    emissive: look.emissive ?? 0x000000, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  return winter && ['snow','ice','deep-snow'].includes(kind) ? winterSurfaceMaterial(material,kind) : material;
}

function plateTexture(text, background, ink) {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 128; canvas.height = 80;
  const ctx = canvas.getContext?.('2d');
  if (!ctx) return null;
  ctx.fillStyle = background; ctx.fillRect(0, 0, 128, 80);
  ctx.strokeStyle = ink; ctx.lineWidth = 5; ctx.strokeRect(5, 5, 118, 70);
  ctx.fillStyle = ink; ctx.font = `bold ${Math.min(46,Math.floor(114/Math.max(1,text.length*.65)))}px Arial, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, 64, 42);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function addBoards(group, course) {
  const boards = course.features.boards ?? [];
  if (!boards.length) return;
  const post = new THREE.BoxGeometry(.1, 1.9, .1), plate = new THREE.BoxGeometry(1.5, .95, .06);
  const postMaterial = new THREE.MeshStandardMaterial({ color: 0x4a4d50, roughness: .8, metalness: .3 });
  const materials = new Map();
  const materialFor = board => {
    const text = board.kind === 'ice' ? 'ICE' : String(board.distance), key = text;
    if (!materials.has(key)) {
      const ice = board.kind === 'ice', texture = plateTexture(text, ice ? '#1d4f7a' : '#f2c400', ice ? '#ffffff' : '#111111');
      materials.set(key, new THREE.MeshStandardMaterial(texture ? { map: texture, roughness: .6 } : { color: ice ? 0x1d4f7a : 0xf2c400, roughness: .6 }));
    }
    return materials.get(key);
  };
  for (const board of boards) {
    const off = board.side * (course.roadHalfWidthAt(board.s) + 2.4), p = course.groundAt(board.s, off);
    const mast = new THREE.Mesh(post, postMaterial), face = new THREE.Mesh(plate, materialFor(board));
    if (board.kind !== 'ice') face.scale.set(2, 2, 1);
    mast.position.set(p.x, p.y + .95, p.z);
    face.position.set(p.x, p.y + 1.95, p.z);
    // Face the oncoming car: the plate's front looks back along the road.
    mast.rotation.y = face.rotation.y = p.heading + Math.PI;
    group.add(mast, face);
  }
}

// The walls: one instanced box per solid segment, the same boxes a car hits. A circuit may ask for the
// wall on the inside of its tightest turns to be drawn as one smooth ribbon instead
// (`smoothInnerWalls: { maxRadius }`): short boxes round a very small circle splay and overlap into a
// jagged edge. The boxes stay in the physics; only their drawing is replaced.
function smoothInnerSpans(course) {
  const limit = course.def.smoothInnerWalls?.maxRadius;
  if (!limit) return [];
  return (course.script.walls ?? []).filter(span => { const piece = course.script.pieces[span.piece]; return piece.kind === 'turn' && piece.radius < limit && span.side === piece.dir; });
}

function addSmoothWalls(group, spans, course, material) {
  const thick = TRACK_SCRIPT.wallThickness, setback = TRACK_SCRIPT.wallSetback, top = TRACK_SCRIPT.wallHeight;
  const positions = [], indices = [];
  for (const span of spans) {
    const count = Math.max(2, Math.ceil((span.s1 - span.s0) / .4)), rows = [];
    for (let i = 0; i <= count; i++) {
      const s = span.s0 + (span.s1 - span.s0) * i / count, half = course.roadHalfWidthAt(s);
      const near = course.groundAt(s, span.side * (half + setback)), far = course.groundAt(s, span.side * (half + setback + thick));
      const base = Math.min(near.y, far.y) - .1;
      rows.push({ near, far, base, top: Math.max(near.y, far.y) + top });
    }
    // Road face, top and back face, each its own strip so the edges stay crisp and the length stays smooth.
    const strip = (pick, flip) => {
      const first = positions.length / 3;
      rows.forEach(row => { for (const [p, y] of pick(row)) { positions.push(p.x, y, p.z); } });
      for (let i = 0; i < rows.length - 1; i++) {
        const a = first + i * 2, b = a + 1, c = a + 2, d = a + 3;
        if (flip) indices.push(a, c, b, b, c, d); else indices.push(a, b, c, b, d, c);
      }
    };
    strip(row => [[row.near, row.base], [row.near, row.top]], span.side > 0);
    strip(row => [[row.near, row.top], [row.far, row.top]], span.side < 0);
    strip(row => [[row.far, row.top], [row.far, row.base]], span.side > 0);
  }
  if (!indices.length) return;
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices); geometry.computeVertexNormals();
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'track-walls-smooth'; mesh.castShadow = mesh.receiveShadow = true;
  group.add(mesh);
}

function addWalls(group, course) {
  const smooth = smoothInnerSpans(course);
  const smoothed = wall => smooth.length > 0 && wall.trackWall && !wall.escapeRoad && smooth.some(span => wall.side === span.side && wall.s >= span.s0 - 1e-6 && wall.s <= span.s1 + 1e-6);
  const walls = (course.features.walls ?? []).filter(wall => !smoothed(wall));
  const material = new THREE.MeshStandardMaterial({ color: course.def.plainSafetyWalls ? 0x747975 : 0xaeada6, roughness: .92, metalness: 0, side: smooth.length ? THREE.DoubleSide : THREE.FrontSide });
  if (smooth.length) addSmoothWalls(group, smooth, course, material);
  if (!walls.length) return;

  const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), material, walls.length);
  const matrix = new THREE.Matrix4(), rotation = new THREE.Quaternion(), position = new THREE.Vector3(), scale = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  walls.forEach((wall, i) => {
    const height = wall.maxY - wall.minY;
    rotation.setFromAxisAngle(up, wall.heading);
    position.set(wall.x, wall.minY + height / 2, wall.z);
    scale.set(wall.halfX * 2, height, wall.halfZ * 2 - .1);
    mesh.setMatrixAt(i, matrix.compose(position, rotation, scale));
  });
  mesh.name = 'track-walls'; mesh.castShadow = mesh.receiveShadow = true;
  group.add(mesh);
}

// Kerbs: red and white blocks two metres long on the edge of the road.
function addKerbs(group, course) {
  const kerbs = course.features.kerbs ?? [];
  if (!kerbs.length) return;
  const build = parity => {
    const positions = [], indices = [];
    for (const kerb of kerbs) {
      const first = Math.ceil(kerb.s0 / 2), last = Math.floor(kerb.s1 / 2);
      for (let block = first; block < last; block++) {
        if (((block % 2) + 2) % 2 !== parity) continue;
        const a = block * 2, b = a + 2, edge = s => course.roadHalfWidthAt(s);
        const corners = [[a, kerb.side * (edge(a) - kerb.width)], [a, kerb.side * edge(a)], [b, kerb.side * (edge(b) - kerb.width)], [b, kerb.side * edge(b)]]
          .map(([s, off]) => worldAtExtended(course, s, off));
        const base = positions.length / 3;
        for (const p of corners) positions.push(p.x, p.y + .05, p.z);
        indices.push(base, base + 1, base + 2, base + 2, base + 1, base + 3);
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); geometry.setIndex(indices); geometry.computeVertexNormals();
    return geometry;
  };
  for (const [parity, color] of [[0, 0xc9332a], [1, 0xe8e6df]]) {
    const mesh = new THREE.Mesh(build(parity), new THREE.MeshStandardMaterial({ color, roughness: .75, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4, side: THREE.DoubleSide }));
    mesh.name = 'track-kerbs'; mesh.receiveShadow = true; group.add(mesh);
  }
}

// Escape roads: loose ground behind the opening in the wall, drawn as a grid
// whose corners stay clear of the road (a corner that falls on the road is
// pushed out to its edge), so the gravel never lies over the road surface.
function addEscapeRoads(group, course) {
  for (const escape of course.escapeRoads ?? []) {
    const columns = Math.ceil(escape.width / 2.5), rows = Math.ceil(escape.run / 3), positions = [], indices = [], uvs = [];
    for (let row = 0; row <= rows; row++) for (let column = 0; column <= columns; column++) {
      const u = escape.run * row / rows, v = escape.inner + escape.width * column / columns;
      let x = escape.origin.x + escape.forward.x * u + escape.left.x * escape.side * v, z = escape.origin.z + escape.forward.z * u + escape.left.z * escape.side * v;
      const found = course.nearest(x, z), edge = course.roadHalfWidthAt(found.s) + .3;
      if (found.distance < edge) {
        const reach = found.distance || 1e-6, away = reach > 1e-3 ? { x: (x - found.x) / reach, z: (z - found.z) / reach } : { x: escape.left.x * escape.side, z: escape.left.z * escape.side };
        x = found.x + away.x * edge; z = found.z + away.z * edge;
      }
      const near = course.nearest(x, z);
      positions.push(x, course.groundAt(near.s, near.lateral).y + .04, z); uvs.push(column / columns * escape.width / 4, row / rows * escape.run / 4);
    }
    for (let row = 0; row < rows; row++) for (let column = 0; column < columns; column++) {
      const a = row * (columns + 1) + column, b = a + 1, c = a + columns + 1, d = c + 1;
      // Both windings: the ribbon is seen from above whichever way it was folded.
      indices.push(a, c, b, b, c, d);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices); geometry.computeVertexNormals();
    const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ name: 'Escape road gravel', color: escape.colour ?? OVERLAY.gravel.color, roughness: 1, metalness: 0,
      polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1, side: THREE.DoubleSide }));
    mesh.name = `escape-road-${escape.id}`; mesh.receiveShadow = true; group.add(mesh);
  }
}

function addPit(group, course, roadMaterial) {
  const lane = course.pitLane;
  if (!lane) return;
  const pit = new THREE.Group();
  pit.name = 'pit-facility';
  group.add(pit);
  // Opt-in damp courses share the real textured road; other pits keep their legacy material.
  const asphalt = roadMaterial ?? new THREE.MeshStandardMaterial({color: 0x41454a, roughness: .95});
  const road = new THREE.Mesh(strip(course, s => lane.offsetAt(s) - 4.5,
    s => lane.offsetAt(s) + 4.5, .045, lane.entry, lane.exit), asphalt);
  road.name = 'pit-lane-road';
  road.receiveShadow = true;
  pit.add(road);
  const paint = new THREE.MeshStandardMaterial({
    color: 0xffd34f, roughness: .85, side: THREE.DoubleSide,
  });
  const mark = (name, a, b, left, right) => {
    const mesh = new THREE.Mesh(strip(course, left, right, .06, a, b), paint);
    mesh.name = name;
    pit.add(mesh);
  };
  for (const [name, s] of [['pit-entry-line', lane.entry + 60], ['pit-exit-line', lane.exit - 60]])
    mark(name, s, s + .35, t => lane.offsetAt(t) - 4.5, t => lane.offsetAt(t) + 4.5);
  for (const side of [-1, 1])
    mark('pit-player-box', lane.box - 4, lane.box + 4,
      s => lane.offsetAt(s) + side * 2 - .08, s => lane.offsetAt(s) + side * 2 + .08);
  for (const s of [lane.box - 4, lane.box + 4])
    mark('pit-player-box', s, s + .16, t => lane.offsetAt(t) - 2, t => lane.offsetAt(t) + 2);
  const board = new THREE.Mesh(new THREE.BoxGeometry(3.6, 1.2, .12),
    new THREE.MeshStandardMaterial({color: 0xf2c400, roughness: .65}));
  const point = course.worldAt(lane.entry - 40,
    lane.side * (course.roadHalfWidthAt(lane.entry - 40) + 3));
  board.name = 'pit-choice-board';
  board.position.set(point.x, point.y + 2.4, point.z);
  board.rotation.y = point.heading + Math.PI;
  pit.add(board);
  const stopBoard = board.clone();
  stopBoard.name = 'pit-go-board';
  const stopPoint = course.worldAt(lane.box + 8, lane.offsetAt(lane.box) + 3.5);
  stopBoard.position.set(stopPoint.x, stopPoint.y + 2.4, stopPoint.z);
  stopBoard.rotation.y = stopPoint.heading + Math.PI;
  pit.add(stopBoard);
  const crew = createOnFootFigures({capacity: 2, pitCrew: true});
  crew.group.name = 'pit-crew';
  pit.add(crew.group);
  const figures = ['odessa', 'nell'].map(crewId => ({
    crewId, x: 0, y: 0, z: 0, yaw: 0, steps: 0, work: 0,
  }));
  let lastText = '';
  group.userData.updatePitCrew = state => {
    const actor = [state, ...(state.opponents || [])].find(a => a.pit?.phase === 'servicing') || state;
    const work = actor.pit?.phase === 'servicing' ? actor.pit.elapsed : 0;
    const box = actor.pit?.phase === 'servicing' ? course.phase(actor.s) : lane.box;
    figures.forEach((f, i) => {
      const p = course.worldAt(box + (i ? 1.6 : -1.6), lane.offsetAt(box) + (work ? 2.1 : 3.5));
      Object.assign(f, {x: p.x, y: p.y, z: p.z, yaw: p.heading - Math.PI / 2, work});
    });
    crew.update(figures, {active: true});
    const text = state.pit?.phase === 'ready' ? 'GO' : `${otherTyre(state.tyre).toUpperCase()} TYRES`;
    if (text !== lastText) {
      lastText = text;
      const texture = plateTexture(text, text === 'GO' ? '#16802b' : '#f2c400', '#111111');
      board.material.map?.dispose();
      board.material.map = texture;
      board.material.needsUpdate = true;
    }
  };
  group.userData.updatePitCrew({tyre: 'summer'});
}

export function addTrackScriptScene(group, course, {snow = false, roadMaterial} = {}) {
  for (const run of surfaceRuns(course)) {
    const look = OVERLAY[run.kind];
    if (!look) continue;
    const left = s => Math.max(run.from, -course.roadHalfWidthAt(s)), right = s => Math.min(run.to, course.roadHalfWidthAt(s));
    if (left((run.s0 + run.s1) / 2) >= right((run.s0 + run.s1) / 2)) continue;
    const mesh = new THREE.Mesh(strip(course, left, right, look.lift, run.s0, run.s1), overlayMaterial(run.kind,snow));
    mesh.receiveShadow = true; mesh.name = `surface-${run.kind}`;
    group.add(mesh);
    if (look.tracks) {
      // Two pairs of darker wheel tracks, tyre-worn into the snow.
      const trackMaterial = new THREE.MeshStandardMaterial({ color: snow?0x596b78:0x8e979d, roughness: 1, transparent: true, opacity: .55, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3, depthWrite: false });
      let narrowest = Infinity;
      for (let s = run.s0; s <= run.s1; s += 8) narrowest = Math.min(narrowest, course.roadHalfWidthAt(s));
      for (const centre of [-4.25, -2.55, 2.55, 4.25].filter(value => Math.abs(value) + .5 < narrowest)) {
        const track = new THREE.Mesh(strip(course, s => centre - .3, s => centre + .3, look.lift + .006, run.s0, run.s1), trackMaterial);
        track.name = 'snow-tracks'; group.add(track);
      }
    }
  }
  addWalls(group, course);
  addEscapeRoads(group, course);
  addKerbs(group, course);
  addBoards(group, course);
  addPit(group, course, roadMaterial);
  addCircuitEffects(group, course);
}

// Opt-in Summit presentation only: no authored geometry or collider mutation.
export function createSummitForkSigns(course) {
  const group=new THREE.Group();group.name='Gallery / Open Road fork signs';
  const postGeometry=new THREE.BoxGeometry(.12,2.2,.12),plateGeometry=new THREE.BoxGeometry(3.2,1.1,.08);
  const postMaterial=new THREE.MeshStandardMaterial({color:0x4a4d50,roughness:.8});
  for(const [text,lateral] of [['GALLERY <',8.5],['OPEN ROAD >',-8.5]]){
    const p=course.groundAt(10090,lateral),texture=plateTexture(text,'#1d4f7a','#ffffff');
    const material=new THREE.MeshStandardMaterial({map:texture,color:texture?0xffffff:0x1d4f7a,roughness:.6});
    const mast=new THREE.Mesh(postGeometry,postMaterial),face=new THREE.Mesh(plateGeometry,material);
    mast.position.set(p.x,p.y+1.1,p.z);face.position.set(p.x,p.y+2.2,p.z);
    mast.rotation.y=face.rotation.y=p.heading+Math.PI;face.name=text;group.add(mast,face);
  }
  return group;
}
export function createSummitDrift(course) {
  const cut=course.features.shortcuts.find(row=>row.id==='summit-open-road');
  const mesh=new THREE.Mesh(strip(course,s=>course.shortcutOffset(cut,s)-cut.halfWidth,
    s=>course.shortcutOffset(cut,s)+cut.halfWidth,.16,10420,10580,true),overlayMaterial('deep-snow',true));
  mesh.name='Summit avalanche drift';mesh.receiveShadow=true;return mesh;
}
