// HOME-GROUND-1: the player's own ground, drawn (docs/HOME_GROUND.md, sections 5 and 6). It reads the ground's part
// (worldJob.open.parts.home) and its record (world.open.home) and changes neither. It draws nothing until the part has
// run with its switch on (`state.on`). Level 1 is tin: galvanised corrugated panels on two posts, the same sheet that
// Tin Town's own fence is made of (src/world/tin-town-gate.js), and a gate of two tin leaves in angle-iron frames.
import * as THREE from 'three';
import {HOME_CELLS, HOME_CORNER, HOME_PANELS, HOME_PIECES, HOME_SIZE, HOME_STEP} from '../content/home-ground.js';
import {GATE_POST, boardSpot, gateOf, panelsLeft, pieceInLand} from '../home-rule.js';
import {scablandsSurfaceHeightAt} from '../../scablands-ground.js';

const MOST_MARKS = 96;
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

export function createHomeGroundView({course} = {}) {
  if (course && !course.def?.scablands) return null;
  const group = new THREE.Group(); group.name = 'home-ground'; group.visible = false;
  const wear = tinTexture();
  const std = (name, color, extra = {}) => new THREE.MeshStandardMaterial({name, color, roughness: .82, metalness: .18, ...extra});
  const materials = {
    tin: std('home tin', 0xc4c2b8, {map: wear, side: THREE.DoubleSide, flatShading: true}),
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
  };
  const ground = (x, z, shift) => scablandsSurfaceHeightAt(x, z) + (shift?.(x, z) ?? 0);
  const geometries = [];
  const keep = geometry => { geometries.push(geometry); return geometry; };

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

  // ---- The outline he builds with, its hammered fill, and the marks made from above. ----------------------------
  const outline = new THREE.Group(); outline.name = 'home-outline'; group.add(outline);
  const outlineBox = new THREE.Mesh(keep(new THREE.BoxGeometry(1, 1, 1).translate(0, .5, 0)), materials.outline);
  const outlineFill = new THREE.Mesh(keep(new THREE.BoxGeometry(1, 1, 1).translate(0, .5, 0)), materials.fill);
  const outlineEdges = new THREE.LineSegments(keep(new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1).translate(0, .5, 0))), materials.edge);
  outline.add(outlineBox, outlineFill, outlineEdges);
  const marks = new THREE.InstancedMesh(keep(new THREE.BoxGeometry(1, .08, .32).translate(0, .04, 0)), materials.mark, MOST_MARKS);
  marks.name = 'home-marks'; group.add(marks);
  // The 2 m grid, shown only from above.
  const gridPoints = [];
  for (let n = 0; n <= HOME_CELLS; n++) {
    gridPoints.push(n * HOME_STEP, 0, 0, n * HOME_STEP, 0, HOME_SIZE, 0, 0, n * HOME_STEP, HOME_SIZE, 0, n * HOME_STEP);
  }
  const gridGeometry = keep(new THREE.BufferGeometry());
  gridGeometry.setAttribute('position', new THREE.Float32BufferAttribute(gridPoints, 3));
  const grid = new THREE.LineSegments(gridGeometry, materials.grid); grid.name = 'home-grid'; grid.renderOrder = 2; group.add(grid);

  const matrix = new THREE.Matrix4(), quaternion = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), scale = new THREE.Vector3(1, 1, 1);
  const place = (mesh, index, x, y, z, yaw = 0, sx = 1, sy = 1, sz = 1) => {
    quaternion.setFromAxisAngle(up, yaw); scale.set(sx, sy, sz);
    mesh.setMatrixAt(index, matrix.compose(new THREE.Vector3(x, y, z), quaternion, scale));
  };
  // A piece's run in the land as a turn of the drawing: a heading of 0 runs east (+x), -PI/2 south (+z).
  const yawOf = heading => heading;
  let drawnKey = '', boundsKey = '';

  return {
    group,
    update(worldJob, here, seconds, drawnShift) {
      const state = worldJob?.open?.parts?.home;
      group.visible = state?.on === true;
      if (!group.visible) return;
      const record = worldJob.open.world.open.home ?? null;
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
        drawnKey = '';
      }
      // The pieces, the stack and the board, when the record changes.
      const key = JSON.stringify([record?.pieces ?? [], record?.marks ?? [], shiftKey]);
      if (key !== drawnKey) {
        drawnKey = key;
        let panelCount = 0, postCount = 0;
        for (const piece of (record?.pieces ?? []).filter(row => row.kind === 'panel')) {
          const {x, z, length, heading} = pieceInLand(piece);
          const along = {x: Math.cos(heading), z: -Math.sin(heading)};
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
        gate.visible = board.visible = !!standing;
        if (standing) {
          const {x, z, heading} = pieceInLand(standing);
          gate.position.set(x, ground(x, z, drawnShift), z); gate.rotation.y = yawOf(heading);
          const spot = boardSpot(standing);
          board.position.set(spot.x, ground(spot.x, spot.z, drawnShift), spot.z); board.rotation.y = spot.yaw;
        }
        const markList = (record?.marks ?? []).slice(0, MOST_MARKS);
        markList.forEach((mark, index) => {
          const {x, z, length, heading} = pieceInLand(mark);
          place(marks, index, x, ground(x, z, drawnShift) + .02, z, yawOf(heading), length, 1, 1);
        });
        marks.count = markList.length; marks.instanceMatrix.needsUpdate = true; marks.computeBoundingSphere();
      }
      if (record && boardName !== record.name) { boardName = record.name; plate.write(record.name); }
      // The gate swings in over about a second when he comes near, and shuts behind him.
      const target = state.gateOpen ? 1 : 0;
      gateSwing += Math.sign(target - gateSwing) * Math.min(Math.abs(target - gateSwing), 1 / 60);
      for (const {leaf, side} of leaves) leaf.rotation.y = side * gateSwing * Math.PI * .45;
      // The outline: pale where he can build, yellow where he can pick up, red where he cannot. The fill rises as he
      // hammers. From above it stands taller and the grid is shown.
      const shape = state.outline;
      outline.visible = !!shape;
      grid.visible = state.above === true;
      if (grid.visible) grid.position.set(HOME_CORNER.x, ground(HOME_CORNER.x + HOME_SIZE / 2, HOME_CORNER.z + HOME_SIZE / 2, drawnShift) + .15, HOME_CORNER.z);
      if (shape) {
        const piece = shape.mode === 'lift' ? shape.target : shape.piece;
        const {x, z, length, heading} = pieceInLand(piece);
        const height = (HOME_PIECES[piece.kind].height + .1) * (state.above ? 1.4 : 1);
        const colour = OUTLINE[shape.mode] ?? OUTLINE.build;
        materials.outline.color.setHex(colour); materials.fill.color.setHex(colour); materials.edge.color.setHex(colour);
        const wobble = shape.shake ? Math.sin(seconds * 60) * .06 : 0;
        outline.position.set(x + wobble, ground(x, z, drawnShift), z); outline.rotation.y = yawOf(heading);
        outlineBox.scale.set(length, height, .3); outlineEdges.scale.set(length, height, .3);
        outlineFill.visible = shape.progress > 0;
        outlineFill.scale.set(length * .98, Math.max(.01, height * shape.progress), .32);
      }
    },
    dispose() {
      for (const geometry of geometries) geometry.dispose();
      for (const material of Object.values(materials)) { material.map?.dispose?.(); material.dispose(); }
      for (const mesh of [pegs, ropes, stakes, flags, stack, panels, posts, marks]) mesh.dispose();
    },
  };
}
