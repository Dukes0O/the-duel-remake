// Shared teaching drawings. The lesson supplies numbers and poses, never game state.
import * as THREE from 'three';
import {forceArrow} from './lesson-frame.js';

export function createLessonPictures({scene, camera, canvas, doc, models, modelOf, onControl}) {
  const root = new THREE.Group(); root.visible = false; scene.add(root);
  const arrows = [], objects = new Map(), ghosts = new Map(), streams = [];
  let entry = null, mounted = null;
  function label(width = 1.8, height = .36) {
    const canvas = doc.createElement('canvas'); canvas.width = 640; canvas.height = 128;
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({map: texture, depthTest: false, toneMapped: false}));
    sprite.scale.set(width, height, 1); root.add(sprite);
    return {sprite, canvas, texture, text: null};
  }
  function write(item, text, colour) {
    if (item.text === text) return;
    item.text = text;
    const ctx = item.canvas.getContext('2d');
    ctx.fillStyle = '#252c29'; ctx.fillRect(0, 0, 640, 128);
    ctx.font = 'bold 54px sans-serif'; ctx.fillStyle = colour; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(text, 320, 64); item.texture.needsUpdate = true;
  }
  const graphCanvas = doc.createElement('canvas'); graphCanvas.width = 640; graphCanvas.height = 360;
  const graphTexture = new THREE.CanvasTexture(graphCanvas);
  graphTexture.colorSpace = THREE.SRGBColorSpace;
  const graph = new THREE.Sprite(new THREE.SpriteMaterial({map: graphTexture, depthTest: false, toneMapped: false}));
  graph.scale.set(2.8, 1.575, 1); graph.position.set(2.9, 2.5, 0); root.add(graph);
  function disposeNode(node) { node.traverse(n => { n.geometry?.dispose(); for (const m of [].concat(n.material ?? [])) { m.map?.dispose(); m.dispose(); } }); node.removeFromParent(); }
  function shapes(rows, map, ghost = false) {
    for (const mesh of map.values()) mesh.visible = false;
    for (const row of rows ?? []) {
      let mesh = map.get(row.id);
      if (!mesh) {
        mesh = new THREE.Mesh(row.shape === 'sphere' ? new THREE.SphereGeometry(.5, 20, 12) : new THREE.BoxGeometry(1, 1, 1),
          new THREE.MeshStandardMaterial({color: row.colour ?? '#edc557', transparent: ghost, opacity: ghost ? .25 : 1, depthWrite: !ghost, wireframe: ghost}));
        root.add(mesh); map.set(row.id, mesh);
      }
      mesh.visible = true; mesh.position.set(...row.position); mesh.scale.set(...(row.size ?? [1, 1, 1]));
      mesh.rotation.set(...(row.rotation ?? [0, 0, 0]));
      mesh.userData.teachControl = ghost ? null : row.control;
    }
  }
  function draw(view, definition) {
    root.visible = Boolean(view && definition);
    if (!root.visible) { mounted?.dispose?.(); mounted = null; entry = null; return; }
    if (entry !== definition) {
      mounted?.dispose?.();
      for (const mesh of [...objects.values(), ...ghosts.values()]) disposeNode(mesh);
      objects.clear(); ghosts.clear(); entry = definition;
      mounted = entry.hooks.mount?.({group: root, THREE, models});
    }
    const model = models.get(modelOf[entry.definition.id]);
    if (!model) return;
    root.position.copy(model.position);
    // Keep the room and real machine visible around the teaching model.
    camera.position.set(root.position.x + 4.5, 3.4, root.position.z + 6.5);
    camera.lookAt(root.position.x, 1.5, root.position.z);
    const args = {time: view.time, input: view.input, support: view.support, stage: view.stage, index: view.index};
    const drawing = entry.hooks.animations[view.animation]?.(args) ?? {};
    mounted?.draw?.(drawing, args);
    shapes(drawing.objects, objects);
    const old = view.previous;
    const ghostDrawing = old ? entry.hooks.animations[old.animation]({...args, time: Math.min(view.time, old.time), input: old.input}) : null;
    shapes(ghostDrawing?.objects, ghosts, true);
    for (const row of arrows) { row.arrow.visible = false; row.label.sprite.visible = false; }
    (drawing.forces ?? []).forEach((f, i) => {
      const force = forceArrow(f, drawing.metresPerNewton ?? .002);
      let item = arrows[i];
      if (!item) { const arrow = new THREE.ArrowHelper(); arrow.line.material.toneMapped = arrow.cone.material.toneMapped = false; root.add(arrow); item = {arrow, label: label()}; arrows.push(item); }
      const direction = new THREE.Vector3(...f.direction).normalize();
      item.arrow.visible = force.length > 0; item.arrow.position.set(...f.origin); item.arrow.setDirection(direction);
      item.arrow.setColor(force.colour); item.arrow.setLength(Math.max(.001, force.length), Math.min(.3, force.length * .25), Math.min(.16, force.length * .13));
      item.label.sprite.visible = view.stage !== 0;
      item.label.sprite.position.copy(item.arrow.position).addScaledVector(direction, force.length * .5);
      item.label.sprite.position.y += .5;
      const introduced = view.words?.some(w => w.word.toLowerCase() === f.kind);
      write(item.label, introduced ? `${f.kind} ${force.label}` : force.label, force.colour);
    });
    for (const s of streams) s.visible = false;
    (drawing.streams ?? []).forEach((s, i) => {
      const speed = Math.max(0, s.speed), direction = new THREE.Vector3(...s.direction).normalize();
      for (let j = 0; j < 24; j++) {
        const n = i * 24 + j;
        let line = streams[n];
        if (!line) { line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]), new THREE.LineBasicMaterial()); root.add(line); streams[n] = line; }
        line.visible = speed > 0; line.material.color.set(s.medium === 'water' ? '#71c9ff' : '#d4eee3');
        const at = new THREE.Vector3(...s.origin).add(new THREE.Vector3(Math.sin(j * 13) * .5, 0, Math.cos(j * 7) * .5));
        at.addScaledVector(direction, ((view.time * speed + j * .173) % (s.length ?? 3)));
        const tail = at.clone().addScaledVector(direction, -speed * .09);
        const points = line.geometry.attributes.position;
        points.setXYZ(0, ...at.toArray()); points.setXYZ(1, ...tail.toArray()); points.needsUpdate = true; line.geometry.computeBoundingSphere();
      }
    });
    graph.visible = view.stage !== 0 && Boolean(drawing.graph);
    if (drawing.graph) {
      const g = drawing.graph, ctx = graphCanvas.getContext('2d');
      ctx.fillStyle = '#252c29'; ctx.fillRect(0, 0, 640, 360);
      ctx.strokeStyle = '#c5cdbc'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(70, 55); ctx.lineTo(70, 290); ctx.lineTo(610, 290); ctx.stroke();
      ctx.font = '26px sans-serif'; ctx.fillStyle = '#f5f0dc'; ctx.fillText(g.yLabel, 80, 35); ctx.fillText(g.xLabel, 290, 337);
      ctx.strokeStyle = '#edc557'; ctx.lineWidth = 5; ctx.beginPath();
      (g.points ?? []).filter(p => p[0] <= view.time).forEach(([x, y], i) => { const px = 70 + x / g.maxX * 530, py = 290 - y / g.maxY * 225; if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py); });
      ctx.stroke(); graphTexture.needsUpdate = true;
    }
  }
  const caster = new THREE.Raycaster();
  function click(event) {
    if (!root.visible) return;
    const b = canvas.getBoundingClientRect();
    caster.setFromCamera(new THREE.Vector2((event.clientX - b.left) / b.width * 2 - 1, -(event.clientY - b.top) / b.height * 2 + 1), camera);
    const hit = caster.intersectObjects([...objects.values()].filter(o => o.visible))[0];
    if (hit?.object.userData.teachControl) onControl?.(hit.object.userData.teachControl);
  }
  canvas.addEventListener('click', click);
  return {draw, dispose() { canvas.removeEventListener('click', click); mounted?.dispose?.(); disposeNode(root); }};
}
