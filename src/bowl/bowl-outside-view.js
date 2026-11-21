import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {addArenaCrushables} from '../arena-props.js';

// BOWL-OUT-LOOK: the outside of the Bowl drawn in code (docs/board/cards/BOWL-SHOW-2.md, section 3). The rules of the
// way out and back in are src/bowl/bowl-outside.js; this file draws them and reads the race state, writing nothing:
// - the two gates: a concrete tunnel under the stands with strip lamps, a steel arch in the stand wall and a concrete
//   arch in the stand back, the wing walls that guide a truck in, and lamps over both mouths that flash while the
//   truck is outside;
// - the car park: cracked asphalt all round the stadium, lamps on the stand back with their pools of light, the 16
//   parked cars a truck can crush (the game's junk cars), and the dirt bank at its edge; BOWL-LOOK-FIX adds floodlight
//   masts down the aisle between the parked rows and at both arches, so the cars and arches show from the stands;
// - a column of light over the selected gate's mouth that shows above the stands. The HUD draws the return arrow.
// The stadium (src/bowl/bowl-stadium.js) builds this once per course and passes its drawing helpers and stand sizes.

const AMBER = 0xffb02e, AMBER_DIM = 0x3a2a14;
// The car park's floodlight masts (BOWL-LOOK-FIX): their height, how far apart down the aisle, the pool's size, and
// how much of their own colour the parked cars show under them.
const FLOOD = Object.freeze({height: 15, every: 34, pool: 30, lift: .32});
const FLOOD_WARM = new THREE.Color(0xffd9a0);

// A frame at a gate, which stands on a straight: x is the lateral offset (as the course measures it), z metres along
// the lap from the gate's middle. `sign` keeps the frame right-handed, so faces keep their winding.
function gateFrame(course, gate) {
  const o = course.worldAt(gate.s, 0), a = course.worldAt(gate.s + 1, 0), l = course.worldAt(gate.s, 1);
  const lat = new THREE.Vector3(l.x - o.x, 0, l.z - o.z).normalize(), along = new THREE.Vector3(a.x - o.x, 0, a.z - o.z).normalize();
  const up = new THREE.Vector3(0, 1, 0), sign = new THREE.Vector3().crossVectors(lat, up).dot(along) > 0 ? 1 : -1;
  const matrix = new THREE.Matrix4().makeBasis(lat, up, along.clone().multiplyScalar(sign)).setPosition(o.x, 0, o.z);
  // A box of size [x, y, z] whose middle is at (x, y, z) in gate terms, turned `turn` about the vertical.
  const box = (size, centre, turn = 0) => new THREE.BoxGeometry(...size)
    .applyMatrix4(new THREE.Matrix4().makeRotationY(turn * sign))
    .translate(centre[0], centre[1], centre[2] * sign).applyMatrix4(matrix);
  const point = (x, y, z) => new THREE.Vector3(x, y, z * sign).applyMatrix4(matrix);
  return {box, point, sign, matrix};
}

// Flat quads from rows of points: rows[i] is a list of Vector3, each row the same length; uv in metres / 4.
function ribbon(rows, scale = 4) {
  const positions = [], uvs = [], indices = [];
  const width = rows[0].length;
  let v = 0;
  rows.forEach((row, i) => {
    if (i) v += rows[i - 1][0].distanceTo(row[0]);
    let u = 0;
    row.forEach((p, j) => {
      if (j) u += row[j - 1].distanceTo(p);
      positions.push(p.x, p.y, p.z); uvs.push(u / scale, v / scale);
      if (i && j) { const k = i * width + j; indices.push(k - width - 1, k - 1, k - width, k - width, k - 1, k); }
    });
  });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function mesh(geometries, material, name) {
  const list = geometries.filter(Boolean);
  if (!list.length) return null;
  const result = new THREE.Mesh(mergeGeometries(list, false), material);
  result.name = name;
  result.receiveShadow = true;
  return result;
}

// A rusted steel sign with the gate's name stencilled on it, an arrow either side.
function signPicture(drawn, hash, words, width = 1024, height = 192) {
  return drawn(width, height, (g, w, h) => {
    g.fillStyle = '#3b3129'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 900; i++) {
      const x = hash(i, 1) * w, y = hash(i, 2) * h, r = 2 + hash(i, 3) * 14;
      g.fillStyle = `rgba(${110 + hash(i, 4) * 60},${50 + hash(i, 5) * 30},${20 + hash(i, 6) * 15},${.08 + hash(i, 7) * .2})`;
      g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
    }
    g.strokeStyle = '#1a1512'; g.lineWidth = 10; g.strokeRect(8, 8, w - 16, h - 16);
    g.fillStyle = '#e9dfc6'; g.font = `bold ${Math.round(h * .55)}px Impact, Arial Black, sans-serif`;
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(words, w / 2, h * .54);
    g.fillStyle = '#d9a032';
    for (const side of [-1, 1]) {
      const x = w / 2 + side * w * .42;
      g.beginPath(); g.moveTo(x + side * h * .22, h / 2); g.lineTo(x - side * h * .12, h * .24); g.lineTo(x - side * h * .12, h * .76); g.fill();
    }
    // Runs of rust from the bolts and the paint worn through.
    for (let i = 0; i < 60; i++) {
      const x = hash(i, 9) * w, y = hash(i, 10) * h * .4, length = h * (.2 + hash(i, 11) * .6);
      g.fillStyle = `rgba(90,45,20,${.15 + hash(i, 12) * .25})`; g.fillRect(x, y, 2 + hash(i, 13) * 4, length);
    }
  });
}

// Yellow and black chevrons, worn.
function hazardPicture(drawn, hash) {
  return drawn(256, 64, (g, w, h) => {
    g.fillStyle = '#17140f'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#c99a2a';
    for (let x = -h; x < w + h; x += 48) { g.beginPath(); g.moveTo(x, h); g.lineTo(x + 24, h); g.lineTo(x + 24 + h, 0); g.lineTo(x + h, 0); g.fill(); }
    for (let i = 0; i < 260; i++) {
      g.fillStyle = `rgba(30,24,18,${.2 + hash(i, 21) * .5})`;
      g.fillRect(hash(i, 22) * w, hash(i, 23) * h, 2 + hash(i, 24) * 9, 1 + hash(i, 25) * 4);
    }
  });
}

// Tyre marks and oil on the tunnel's concrete floor.
function floorPicture(drawn, hash) {
  return drawn(512, 512, (g, w, h) => {
    g.fillStyle = '#8a8378'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 400; i++) {
      g.fillStyle = `rgba(${40 + hash(i, 31) * 40},${36 + hash(i, 32) * 30},${30 + hash(i, 33) * 20},${.05 + hash(i, 34) * .12})`;
      g.beginPath(); g.arc(hash(i, 35) * w, hash(i, 36) * h, 6 + hash(i, 37) * 40, 0, Math.PI * 2); g.fill();
    }
    // Two pairs of wide tyre tracks running the length of the floor.
    for (const x of [.22, .4, .6, .78]) {
      g.fillStyle = 'rgba(25,22,20,.35)';
      for (let y = 0; y < h; y += 4) g.fillRect(w * x + Math.sin(y * .02 + x * 9) * 6 - 18, y, 36, 4);
    }
  });
}

// The car park's asphalt: cracked, patched, darker in oil stains.
function asphaltShade(hash, s, off) {
  const patch = hash(Math.floor(s / 7), Math.floor(off / 9)) < .18 ? .78 : 1;
  return (.62 + .2 * hash(Math.floor(s / 3), Math.floor(off / 3), 5)) * patch;
}

export function createBowlOutsideView(course, {photo, drawn, hash, glow, stand}) {
  const group = new THREE.Group();
  group.name = 'Bowl outside: gates and car park';
  const outside = course.features.bowl.outside, face = stand.face;
  const at = (s, off, y = 0) => { const p = course.worldAt(s, off); return new THREE.Vector3(p.x, y, p.z); };

  const concretePhoto = photo('/assets/textures/tunnel-concrete.png');
  const concrete = new THREE.MeshStandardMaterial({color: 0x9a948a, map: concretePhoto, roughness: .95, side: THREE.DoubleSide});
  // Inside the tunnels the concrete is lit by its strip lamps: drawn with a warm glow of its own, not with lights.
  const tunnelConcrete = new THREE.MeshStandardMaterial({color: 0x8d877c, map: concretePhoto, roughness: .95, side: THREE.DoubleSide,
    emissive: 0x6a5a40, emissiveMap: concretePhoto, emissiveIntensity: .32});
  const floorMap = floorPicture(drawn, hash);
  if (floorMap) { floorMap.wrapS = floorMap.wrapT = THREE.RepeatWrapping; floorMap.repeat.set(.5, .25); }
  const floor = new THREE.MeshStandardMaterial({color: 0xb0a898, map: floorMap, roughness: .97,
    emissive: 0x3a3022, emissiveIntensity: .35, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2});
  const hazardMap = hazardPicture(drawn, hash);
  if (hazardMap) hazardMap.wrapS = hazardMap.wrapT = THREE.RepeatWrapping;
  const hazard = new THREE.MeshStandardMaterial({color: 0xffffff, map: hazardMap, roughness: .8, metalness: .2});
  const steel = new THREE.MeshStandardMaterial({color: 0x4a4038, map: photo('/assets/textures/scrap-plating.png'), roughness: .7, metalness: .6});
  const strip = new THREE.MeshStandardMaterial({color: 0xfff1d6, emissive: 0xffe2b0, emissiveIntensity: 2.4, roughness: .3});
  const dark = new THREE.MeshStandardMaterial({color: 0x1d1a17, roughness: .8, metalness: .4});

  // ---- The gates.
  const gates = outside.gates.map(gate => {
    const {box, point} = gateFrame(course, gate);
    const half = gate.width / 2, jamb = half + .2, back = outside.back, throatEnd = back - (gate.mouthWidth - gate.width) / 2;
    const reach = gate.guideLength / Math.SQRT2, outer = face + stand.outer, cut = face + stand.first + stand.cutRows * stand.depth;
    const lintel = stand.lintel, mouth = gate.mouthWidth / 2;
    // The inner face of the guides and the flared tunnel, as a half width at each lateral offset.
    const guideHalf = x => x < throatEnd ? half : Math.min(half + reach, half + (x - throatEnd));
    const walls = [], tunnel = [], hazards = [], steels = [], strips = [], darks = [];
    // Side walls of the throat, their tops stepped with the rows above, so they close the cut and the stand's edge.
    const top = x => {
      const d = x - face;
      if (d < stand.walk) return 2.4;
      if (d < stand.first) return stand.low;
      return stand.rowY(Math.min(stand.rows - 1, Math.floor((d - stand.first) / stand.depth)));
    };
    for (const side of [-1, 1]) {
      const edges = [face, face + stand.walk, face + stand.first];
      for (let r = 1; face + stand.first + r * stand.depth < throatEnd; r++) edges.push(face + stand.first + r * stand.depth);
      edges.push(throatEnd);
      for (let i = 0; i < edges.length - 1; i++) {
        const x0 = edges[i], x1 = edges[i + 1], h = top((x0 + x1) / 2), z = side * (half + .2);
        (x1 <= cut ? walls : tunnel).push(box([x1 - x0, h, .4], [(x0 + x1) / 2, h / 2, z]));
      }
      // The guides: inside the stand they rise to the tunnel's lintel; outside they are wing walls in hazard paint.
      const startX = throatEnd, startZ = side * jamb, insideLength = (outer - throatEnd) * Math.SQRT2;
      const turn = -side * Math.PI / 4, dirZ = side / Math.SQRT2, dirX = 1 / Math.SQRT2;
      tunnel.push(box([insideLength, lintel, .4], [startX + dirX * insideLength / 2, lintel / 2, startZ + dirZ * insideLength / 2], turn));
      const wing = gate.guideLength - insideLength, wingX = startX + dirX * (insideLength + wing / 2), wingZ = startZ + dirZ * (insideLength + wing / 2);
      walls.push(box([wing, 2.2, .45], [wingX, 1.1, wingZ], turn));
      hazards.push(box([wing, .7, .5], [wingX, 1.55, wingZ], turn));
      // The arch in the stand wall: two steel posts and a lintel with the gate's sign.
      steels.push(box([.5, 7.4, .5], [face + .5, 3.7, side * (jamb + .1)]));
      hazards.push(box([.55, 2.4, .55], [face + .5, 1.2, side * (jamb + .1)]));
      // The arch in the stand back: concrete pilasters either side of the mouth.
      walls.push(box([.7, lintel + 1.3, .8], [outer + .35, (lintel + 1.3) / 2, side * (mouth + .4)]));
      hazards.push(box([.75, 2.2, .85], [outer + .35, 1.1, side * (mouth + .4)]));
    }
    steels.push(box([.6, .7, gate.width + 1.8], [face + .5, 7.05, 0]));
    // The header over the floor end of the tunnel, where the stand above is first high enough for a truck.
    tunnel.push(box([.5, stand.rowY(stand.cutRows) - lintel, gate.width + .8], [cut - .25, (stand.rowY(stand.cutRows) + lintel) / 2, 0]));
    hazards.push(box([.06, .55, gate.width], [cut - .52, lintel + .3, 0]));
    // The header over the mouth in the stand back.
    walls.push(box([.7, 1.3, gate.mouthWidth + 1.6], [outer + .35, lintel + .65, 0]));
    // The ceiling: flat concrete from the header to the stand back, flaring with the guides, with steel beams across.
    const ceilingRows = [];
    for (const x of [cut, throatEnd, outer]) {
      const w = guideHalf(x) + .4;
      ceilingRows.push([point(x, lintel, -w), point(x, lintel, w)]);
    }
    tunnel.push(ribbon(ceilingRows));
    for (let x = cut + 1.5; x < outer - .5; x += 3) darks.push(box([.35, .4, 2 * guideHalf(x) + .6], [x, lintel - .2, 0]));
    // Strip lamps down the middle of the ceiling and a pair along the walls.
    for (let x = cut + 2; x < outer - 1; x += 4) {
      strips.push(box([1.6, .1, .22], [x, lintel - .45, 0]));
      for (const side of [-1, 1]) strips.push(box([1.2, .12, .08], [x + 1, 3.4, side * (guideHalf(x) - .05)]));
    }
    // The floor, from the arena's floor through the tunnel and out between the wing walls.
    const floorRows = [];
    for (const x of [face - .6, throatEnd, outer, throatEnd + reach, throatEnd + reach + 3]) {
      const w = x > throatEnd + reach ? half + reach + 1.5 : guideHalf(x);
      floorRows.push([point(x, .04, -w), point(x, .04, w)]);
    }
    const floorMesh = new THREE.Mesh(ribbon(floorRows, 8), floor);
    floorMesh.name = `Bowl ${gate.name} tunnel floor`;
    floorMesh.receiveShadow = true;

    // The signs: on the stand wall's arch, facing the floor, and over the mouth in the stand back, facing the car park.
    const picture = signPicture(drawn, hash, gate.name.toUpperCase());
    const signMaterial = new THREE.MeshStandardMaterial({map: picture, color: picture ? 0xffffff : 0x3b3129, roughness: .8, metalness: .3,
      emissive: 0x2a2014, emissiveMap: picture, emissiveIntensity: .7});
    const signs = new THREE.Group();
    signs.name = `Bowl ${gate.name} signs`;
    for (const [x, y, width, faceIn] of [[face + .1, 7.05, gate.width + 1.4, true], [outer + .72, lintel + .65, gate.mouthWidth, false]]) {
      const sign = new THREE.Mesh(new THREE.PlaneGeometry(width, width * 192 / 1024 * 1.1), signMaterial);
      const p = point(x, y, 0), q = point(x + (faceIn ? -1 : 1), y, 0);
      sign.position.copy(p);
      sign.lookAt(q);
      signs.add(sign);
    }

    // The lamps over both mouths: amber beacons that flash while the truck is outside.
    const lampMaterial = new THREE.MeshStandardMaterial({color: 0x2a1c0c, emissive: AMBER_DIM, emissiveIntensity: 1, roughness: .35});
    const lamps = [], halos = [];
    for (const [x, y] of [[face + .5, 7.55], [outer + .35, lintel + 1.45]]) {
      for (const z of [-2.6, 2.6]) {
        lamps.push(box([.5, .4, .5], [x, y, z]));
        if (glow) {
          const halo = new THREE.Sprite(new THREE.SpriteMaterial({map: glow, color: AMBER, transparent: true, depthWrite: false,
            blending: THREE.AdditiveBlending, opacity: 0}));
          halo.position.copy(point(x, y + .1, z)); halo.scale.set(4.5, 4.5, 1); halo.name = 'gate lamp halo';
          halos.push({halo, phase: z > 0 ? 0 : Math.PI});
        }
      }
    }

    // A column of light over the selected mouth in the stand back, taller than the stands.
    const columnHeight = 70, column = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 3.4, columnHeight, 20, 1, true).translate(0, columnHeight / 2, 0),
      new THREE.ShaderMaterial({transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
        uniforms: {uStrength: {value: 0}, uHeight: {value: columnHeight}},
        vertexShader: `uniform float uHeight; varying float vUp; varying vec3 vNormal; varying vec3 vView;
          void main(){ vUp = position.y / uHeight; vec4 view = modelViewMatrix * vec4(position, 1.0); vView = normalize(-view.xyz);
            vNormal = normalize(normalMatrix * normal); gl_Position = projectionMatrix * view; }`,
        fragmentShader: `uniform float uStrength; varying float vUp; varying vec3 vNormal; varying vec3 vView;
          void main(){ float edge = pow(abs(dot(vNormal, vView)), 1.4); float fade = pow(1.0 - vUp, 1.6);
            gl_FragColor = vec4(vec3(1.0, 0.66, 0.2) * 0.5 * uStrength * edge * fade, 1.0); }`}));
    column.position.copy(point(outer + 3, 0, 0));
    column.name = `Bowl ${gate.name} light column`;
    column.visible = false;

    const parts = new THREE.Group();
    parts.name = `Bowl ${gate.name}`;
    parts.userData.gate = gate.name;
    for (const [geometries, material, name] of [[walls, concrete, 'walls'], [tunnel, tunnelConcrete, 'tunnel'], [hazards, hazard, 'hazard paint'],
      [steels, steel, 'arch steel'], [strips, strip, 'strip lamps'], [darks, dark, 'ceiling beams'], [lamps, lampMaterial, 'lamps']]) {
      const part = mesh(geometries, material, `Bowl ${gate.name} ${name}`);
      if (part) parts.add(part);
    }
    parts.add(floorMesh, signs, column, ...halos.map(({halo}) => halo));
    group.add(parts);
    return {gate, parts, lampMaterial, halos, column};
  });

  // ---- The car park.
  const parkFrom = face + stand.outer + .02, parkTo = outside.bank - 3;
  const asphaltMap = photo('/assets/textures/race-asphalt.png');
  const asphalt = new THREE.MeshStandardMaterial({color: 0x938d84, map: asphaltMap, vertexColors: true, roughness: .97,
    emissive: 0x0b0a09, emissiveMap: asphaltMap,
    polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1});
  {
    const positions = [], uvs = [], colours = [], indices = [], across = [0, .18, .4, .65, 1];
    const steps = Math.ceil(course.length);
    for (let i = 0; i <= steps; i++) {
      const s = course.length * i / steps;
      across.forEach((share, j) => {
        const off = parkFrom + (parkTo - parkFrom) * share, p = at(s, off, .02), shade = asphaltShade(hash, s, off);
        positions.push(p.x, p.y, p.z); uvs.push(p.x / 6, p.z / 6); colours.push(shade, shade * .98, shade * .95);
        if (i && j) { const k = i * across.length + j, w = across.length; indices.push(k - w - 1, k - w, k - 1, k - 1, k - w, k); }
      });
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colours, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    // The ring is wound so its face looks up wherever the course turns.
    if (geometry.attributes.normal.getY(0) < 0) { geometry.index.array.reverse(); geometry.computeVertexNormals(); }
    const ground = new THREE.Mesh(geometry, asphalt);
    ground.name = 'Bowl car park';
    ground.receiveShadow = true;
    group.add(ground);
  }
  // Worn bay lines either side of each parked car, and a painted row line.
  const paint = new THREE.MeshStandardMaterial({color: 0xcfc6ad, roughness: .9, transparent: true, opacity: .55, depthWrite: false,
    polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3});
  const lines = [];
  const palette = [0x6b4a36, 0x4f5d55, 0x5b6470, 0x7a6a4c, 0x4d3c35, 0x6e5f58];
  const parked = outside.parking.map((car, index) => {
    for (const side of [-1, 1]) {
      const p = course.worldAt(car.s, car.off + side * 1.55);
      lines.push(new THREE.BoxGeometry(.14, .02, 5.2).applyMatrix4(new THREE.Matrix4().makeRotationY(p.heading)).translate(p.x, .045, p.z));
    }
    // Parked as people park: a few degrees off square, some nose in and some nose out.
    const turn = (hash(index, 41) - .5) * .09 + (hash(index, 42) < .5 ? Math.PI : 0);
    return {...car, heading: car.heading + turn, color: palette[index % palette.length]};
  });
  const lineMesh = mesh(lines, paint, 'Bowl car park bay lines');
  if (lineMesh) group.add(lineMesh);
  const cars = addArenaCrushables(group, {features: {crushables: parked}});
  if (cars) cars.name = 'Bowl car park cars';

  // Lamps on the stand back with their pools of light on the asphalt (drawn, not lit: the car park has no lights of
  // its own), and the dirt bank at the car park's edge.
  const heads = [], pools = [], washes = [], ribs = [];
  const lampsAt = [];
  {
    let last = null, along = 0;
    for (let s = 0; s < course.length; s += .5) {
      const p = at(s, face + stand.outer);
      if (last) along += p.distanceTo(last);
      last = p;
      if (along < 26 && s) continue;
      if (outside.gates.some(gate => Math.abs(((s - gate.s) % course.length + 1.5 * course.length) % course.length - course.length / 2) < 12)) continue;
      along = 0;
      lampsAt.push(s);
    }
  }
  for (const s of lampsAt) {
    const p = course.worldAt(s, face + stand.outer + .6), pool = course.worldAt(s, face + stand.outer + 8);
    heads.push(new THREE.BoxGeometry(1.4, .35, .7).applyMatrix4(new THREE.Matrix4().makeRotationY(p.heading)).translate(p.x, 10, p.z));
    pools.push(new THREE.PlaneGeometry(26, 26).rotateX(-Math.PI / 2).translate(pool.x, .08, pool.z));
    // The lamp's light washing down the concrete below it.
    const wall = course.worldAt(s, face + stand.outer + .06), out = course.worldAt(s, face + stand.outer + 1);
    washes.push(new THREE.PlaneGeometry(18, 16).rotateY(Math.atan2(out.x - wall.x, out.z - wall.z)).translate(wall.x, 6.5, wall.z));
  }
  // The stand back as a structure: concrete ribs every nine metres and the edges of two floors across it, standing
  // out a hand's width (a truck coming from the car park meets the rules' wall a little further out).
  {
    let last = null, along = 0;
    for (let s = 0; s < course.length; s += .25) {
      const p = course.worldAt(s, face + stand.outer + .1);
      if (last) along += Math.hypot(p.x - last.x, p.z - last.z);
      last = p;
      const nearGate = outside.gates.some(gate => Math.abs(((s - gate.s) % course.length + 1.5 * course.length) % course.length - course.length / 2) < 8.5);
      if (!nearGate && (along >= 9 || !s)) {
        along = 0;
        ribs.push(new THREE.BoxGeometry(.2, stand.top, .9).applyMatrix4(new THREE.Matrix4().makeRotationY(p.heading)).translate(p.x, stand.top / 2, p.z));
      }
    }
    const band = (y, height) => {
      const rows = [];
      for (let s = 0; s <= course.length + 1e-6; s += 1) rows.push([at(Math.min(s, course.length), face + stand.outer + .12, y), at(Math.min(s, course.length), face + stand.outer + .12, y + height)]);
      return ribbon(rows);
    };
    ribs.push(band(8.2, .5), band(16.1, .5));
  }
  const ribMesh = mesh(ribs, new THREE.MeshStandardMaterial({color: 0x8c867c, map: concretePhoto, roughness: .95, side: THREE.DoubleSide}), 'Bowl stand back ribs');
  if (ribMesh) group.add(ribMesh);
  const lampHeads = mesh(heads, new THREE.MeshStandardMaterial({color: 0x3a3226, emissive: 0xffb866, emissiveIntensity: 3, roughness: .4}), 'Bowl stand back lamps');
  if (lampHeads) group.add(lampHeads);
  if (glow && pools.length) {
    const poolMesh = mesh(pools, new THREE.MeshBasicMaterial({map: glow, color: 0x8a6438, transparent: true, depthWrite: false,
      blending: THREE.AdditiveBlending, opacity: .85, toneMapped: false}), 'Bowl car park light pools');
    poolMesh.renderOrder = 2;
    group.add(poolMesh);
    const washMesh = mesh(washes, new THREE.MeshBasicMaterial({map: glow, color: 0x6a4a2a, transparent: true, depthWrite: false,
      blending: THREE.AdditiveBlending, opacity: .8, toneMapped: false, side: THREE.DoubleSide}), 'Bowl stand back light washes');
    washMesh.renderOrder = 2;
    group.add(washMesh);
  }
  // BOWL-LOOK-FIX: floodlight masts. The car park was dark beyond about 20 m, so masts stand down the aisle between the
  // two rows of parked cars and a pair flanks each arch in the stand back: a tapered steel pole on a concrete footing,
  // a crossarm with four lamps tilted down, their glare, a faint cone of light in the night air and a wide pool on the
  // asphalt. The parked cars and the arches' concrete take a warm lift in their own colour: drawn, not lit, because
  // real lights out here would cost every frame inside the arena as well.
  const masts = [], mastGeometries = {steel: [], footing: [], lamps: [], cones: [], pools: []};
  {
    const aisle = outside.back + 37, every = FLOOD.every;
    let last = null, along = 0;
    for (let s = 0; s < course.length; s += .5) {
      const p = at(s, aisle);
      if (last) along += p.distanceTo(last);
      last = p;
      if (along < every && s) continue;
      if (outside.gates.some(gate => Math.abs(((s - gate.s) % course.length + 1.5 * course.length) % course.length - course.length / 2) < 10)) continue;
      along = 0;
      masts.push({s, off: aisle, facing: 0});
    }
    // Two at each arch, on the asphalt either side of its mouth, their lamps turned to the arch.
    for (const gate of outside.gates) for (const side of [-1, 1]) masts.push({s: gate.s + side * (gate.mouthWidth / 2 + 4), off: outside.back + 9, facing: -1});
  }
  for (const {s, off, facing} of masts) {
    const p = course.worldAt(s, off), turn = new THREE.Matrix4().makeRotationY(p.heading);
    const place = (geometry, x, y, z) => {
      const local = new THREE.Vector3(x, 0, z).applyMatrix4(turn);
      return geometry.applyMatrix4(turn).translate(p.x + local.x, y, p.z + local.z);
    };
    const H = FLOOD.height;
    mastGeometries.footing.push(place(new THREE.CylinderGeometry(.55, .65, .6, 10), 0, .3, 0));
    mastGeometries.steel.push(place(new THREE.CylinderGeometry(.14, .26, H, 10), 0, H / 2, 0));
    mastGeometries.steel.push(place(new THREE.BoxGeometry(.18, .18, 3.4), 0, H - .3, 0));
    // A ladder's rungs up one side, and a junction box at head height for a walker.
    mastGeometries.steel.push(place(new THREE.BoxGeometry(.32, .45, .22), .28, 1.6, 0));
    for (let i = 0; i < 4; i++) {
      const z = -1.35 + i * .9, head = new THREE.BoxGeometry(.75, .42, .55);
      mastGeometries.steel.push(place(head.clone().rotateX(facing ? .5 : 0).rotateZ(facing ? 0 : (i % 2 ? .45 : -.45)), 0, H, z));
      mastGeometries.lamps.push(place(new THREE.PlaneGeometry(.62, .42).rotateX(Math.PI / 2).rotateZ(facing ? 0 : (i % 2 ? .45 : -.45)), 0, H - .22, z));
    }
    // The light falling from the head: a soft cone, bright at the lamps and gone at the ground, and a pool beneath.
    const cone = new THREE.CylinderGeometry(1.2, FLOOD.pool * .32, H - .4, 18, 6, true);
    const position = cone.getAttribute('position'), shade = [];
    for (let i = 0; i < position.count; i++) { const share = (position.getY(i) + (H - .4) / 2) / (H - .4); shade.push(share * share, share * share, share * share); }
    cone.setAttribute('color', new THREE.Float32BufferAttribute(shade, 3));
    mastGeometries.cones.push(place(cone, 0, (H - .4) / 2, 0));
    mastGeometries.pools.push(place(new THREE.PlaneGeometry(FLOOD.pool, FLOOD.pool).rotateX(-Math.PI / 2), facing ? -3 : 0, .09, 0));
  }
  {
    const footing = mesh(mastGeometries.footing, concrete, 'Bowl car park mast footings');
    const steelMast = mesh(mastGeometries.steel, new THREE.MeshStandardMaterial({color: 0x5b5752, roughness: .62, metalness: .7}), 'Bowl car park floodlight masts');
    const lampFaces = mesh(mastGeometries.lamps, new THREE.MeshBasicMaterial({color: 0xfff1d0, toneMapped: false, side: THREE.DoubleSide}), 'Bowl car park floodlight lamps');
    for (const part of [footing, steelMast, lampFaces]) if (part) group.add(part);
    const cones = mesh(mastGeometries.cones, new THREE.MeshBasicMaterial({color: 0x9a8360, vertexColors: true, transparent: true, opacity: .09,
      depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false}), 'Bowl car park floodlight cones');
    if (cones) { cones.renderOrder = 2; group.add(cones); }
    if (glow) {
      const pools = mesh(mastGeometries.pools, new THREE.MeshBasicMaterial({map: glow, color: 0xd6a768, transparent: true, depthWrite: false,
        blending: THREE.AdditiveBlending, opacity: 1, toneMapped: false}), 'Bowl car park floodlight pools');
      if (pools) { pools.renderOrder = 2; group.add(pools); }
      // The lamps' glare, seen from anywhere in the car park and over the stands.
      const glare = new THREE.SpriteMaterial({map: glow, color: 0xffe3b0, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false});
      for (const {s, off} of masts) {
        const p = course.worldAt(s, off), sprite = new THREE.Sprite(glare);
        sprite.position.set(p.x, FLOOD.height - .1, p.z); sprite.scale.set(7, 4, 1); sprite.name = 'Bowl car park floodlight glare';
        group.add(sprite);
      }
    }
  }
  group.userData.floodlights = masts.length;
  // The parked cars and the arches' concrete under the floods: a warm lift in their own colour.
  if (cars) {
    const lifted = new Map();
    cars.traverse(node => {
      if (!node.isMesh || !node.material) return;
      node.material = [node.material].flat().map(material => {
        if (!material.emissive) return material;
        if (!lifted.has(material)) {
          const copy = material.clone();
          copy.emissive.copy(copy.color).lerp(FLOOD_WARM, .35).multiplyScalar(FLOOD.lift);
          lifted.set(material, copy);
        }
        return lifted.get(material);
      });
      if (node.material.length === 1) node.material = node.material[0];
    });
  }
  concrete.emissive.setHex(0x564630); concrete.emissiveMap = concretePhoto; concrete.emissiveIntensity = .38;
  {
    const rows = [];
    const dirt = new THREE.MeshStandardMaterial({color: 0x5c4733, map: photo('/assets/textures/scrapyard-dirt.png'), roughness: 1});
    const profile = [[-4, -.1], [0, 1.2], [3, 3.4], [6, 3.9], [9, 3.2], [13, 0]];
    for (let s = 0; s <= course.length + 1e-6; s += 1) {
      rows.push(profile.map(([d, y]) => at(Math.min(s, course.length), outside.bank + d, y + Math.sin(s * .37) * .25 * Math.min(1, y))));
    }
    const bank = new THREE.Mesh(ribbon(rows, 6), dirt);
    bank.material.side = THREE.DoubleSide;
    bank.name = 'Bowl car park dirt bank';
    bank.receiveShadow = true;
    group.add(bank);
  }

  group.userData.gateCount = gates.length;
  group.userData.parkedCars = cars?.userData.crushableCount ?? 0;

  return {group, update(now, state, dt = 0) {
    const out = state?.bowlOutside, target = out?.gate;
    const truck = out ? course.worldAt(state.s, state.lateral) : null;
    // The lamps over the mouths flash, the two of each pair in turn, while the truck is outside the wall.
    const flash = out ? (Math.sin(now * .011) > 0 ? 1 : 0) : 0;
    for (const entry of gates) {
      const aimed = !!target && target.name === entry.gate.name;
      entry.lampMaterial.emissive.setHex(out ? AMBER : AMBER_DIM);
      entry.lampMaterial.emissiveIntensity = out ? .6 + 2.6 * flash : 1;
      for (const {halo, phase} of entry.halos) halo.material.opacity = out ? Math.max(0, Math.sin(now * .011 + phase)) * (aimed ? 1 : .55) : 0;
      entry.column.visible = aimed;
      // The column fades as the truck nears it, so it never fills the screen at the mouth.
      const near = aimed ? Math.hypot(truck.x - entry.column.position.x, truck.z - entry.column.position.z) : 0;
      entry.column.material.uniforms.uStrength.value = aimed ? (.75 + .25 * Math.sin(now * .004)) * Math.min(1, Math.max(0, (near - 10) / 25)) : 0;
    }
    if (cars) cars.userData.updateSimulation(state || {}, dt);
  }};
}
