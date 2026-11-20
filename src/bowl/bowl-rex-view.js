import * as THREE from 'three';
import {REX_RULES, rexFacing, rexFightOf, rexPlaces} from './bowl-rex.js';

// The Scrapasaurus in the Bowl (BOWL-REX-FIGHT): its model on the rails, its
// poses, its battery boxes, the cone its fire will fill (drawn on the floor from
// the start of its tell), the ring where a thrown car will land, and its pen of
// junk cars. On nights three and four it stands behind the stands' wall, seen
// before it is fought. It reads state.bowlNight and never writes it.
const MODEL = '/assets/models/wasteland/bowl/scrapasaurus.glb';
const ORANGE = 0xff7a1a, FLAME = 0xffc24a, RING = 0xffe27a;

function disposeTree(root) {
  root?.traverse?.(node => {
    node.geometry?.dispose?.();
    for (const material of [node.material].flat().filter(Boolean)) material.dispose?.();
  });
}

// A flat fan on the floor, its point at the origin, opening along +Z, one metre long.
function fanGeometry(halfAngle, segments = 24) {
  const points = [0, 0, 0];
  for (let i = 0; i <= segments; i++) {
    const a = -halfAngle + 2 * halfAngle * i / segments;
    points.push(Math.sin(a), 0, Math.cos(a));
  }
  const index = [];
  for (let i = 1; i <= segments; i++) index.push(0, i, i + 1);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
  geometry.setIndex(index);
  return geometry;
}

// Drawn over the floor and the ramps, so the cone and the ring are seen even where a ramp rises through them.
const glowMaterial = (color, depthTest = false) => new THREE.MeshBasicMaterial({color, transparent: true, opacity: .5,
  depthWrite: false, depthTest, side: THREE.DoubleSide, toneMapped: false, blending: THREE.AdditiveBlending});

export function createRexView({loadModel}) {
  const group = new THREE.Group();
  group.name = 'Bowl Scrapasaurus';
  group.visible = false;
  let course = null, places = null, model = null, mixer = null, actions = {}, loading = null, disposed = false;
  let lastNow = null, boxes = [], fallRoll = 0;
  const holder = new THREE.Group(); holder.name = 'Scrapasaurus on its rails';
  const pose = new THREE.Group(); pose.name = 'Scrapasaurus pose';
  holder.add(pose);
  // The tell's chest glow: a furnace light in its chest, under the neck, that brightens until the fire comes.
  const chest = new THREE.Mesh(new THREE.SphereGeometry(.9, 16, 10), glowMaterial(ORANGE, true));
  chest.name = 'Scrapasaurus chest glow'; chest.position.set(0, 3.4, 2.6); chest.visible = false;
  const chestLight = new THREE.PointLight(ORANGE, 0, 14, 2);
  chestLight.position.copy(chest.position);
  pose.add(chest, chestLight);
  let asset = null;
  // The cone on the floor (the tell), and the fire filling it.
  const cone = new THREE.Mesh(fanGeometry(REX_RULES.fire.halfAngle), glowMaterial(ORANGE));
  cone.name = 'Scrapasaurus fire cone'; cone.renderOrder = 4; cone.visible = false;
  const fire = new THREE.Group(); fire.name = 'Scrapasaurus fire'; fire.visible = false;
  for (let layer = 0; layer < 3; layer++) {
    const sheet = new THREE.Mesh(fanGeometry(REX_RULES.fire.halfAngle * (1 - layer * .25)), glowMaterial(layer ? FLAME : ORANGE));
    sheet.position.y = .6 + layer * .9; sheet.renderOrder = 6;
    fire.add(sheet);
  }
  // The ring where a thrown car will land, and the car.
  const ring = new THREE.Mesh(new THREE.RingGeometry(REX_RULES.thrown.hitRadius - .35, REX_RULES.thrown.hitRadius, 40), glowMaterial(RING));
  ring.rotation.x = -Math.PI / 2; ring.name = 'Scrapasaurus throw ring'; ring.visible = false; ring.renderOrder = 4;
  const rust = new THREE.MeshStandardMaterial({color: 0x6b4a33, roughness: .9, metalness: .2});
  const thrown = new THREE.Mesh(new THREE.BoxGeometry(1.9, 1.2, 4.2), rust);
  thrown.name = 'Scrapasaurus thrown junk car'; thrown.visible = false;
  const pen = new THREE.Group(); pen.name = 'Scrapasaurus pen of junk cars';
  group.add(holder, cone, fire, ring, thrown, pen);

  // The model loads once for the view; each event on a new course only moves it and rebuilds the pen.
  function clear() {
    for (const child of [...pen.children]) { child.removeFromParent(); child.geometry?.dispose?.(); }
    course = null; places = null;
  }

  function build(next) {
    clear();
    course = next; places = rexPlaces(next);
    loading ??= loadModel(MODEL).then(loaded => {
      if (disposed) { disposeTree(loaded.scene); return; }
      asset = loaded;
      model = asset.scene;
      model.name = 'Scrapasaurus model';
      model.traverse(node => { if (node.isMesh) { node.castShadow = true; node.receiveShadow = true; } });
      pose.add(model);
      boxes = [1, 2, 3].map(index => {
        const whole = model.getObjectByName(`battery-box-${index}-whole`), smashed = model.getObjectByName(`battery-box-${index}-smashed`);
        // Each box gets its own material so only the open one glows.
        if (whole?.material) whole.material = whole.material.clone();
        return {whole, smashed};
      });
      mixer = new THREE.AnimationMixer(model);
      for (const clip of asset.animations || []) actions[/jaw/.test(clip.name) ? 'jaw' : /tail/.test(clip.name) ? 'tail' : clip.name] = mixer.clipAction(clip);
      group.userData.rexReady = true;
    }).catch(error => { if (!disposed) group.userData.rexError = error?.message || 'The Scrapasaurus could not load'; });
    // The pen beside the rails, between them and the wall (rexPlaces).
    const box = new THREE.BoxGeometry(1.9, 1.15, 4.1);
    for (let i = 0; i < REX_RULES.penCars; i++) {
      const car = new THREE.Mesh(box, rust);
      const p = next.groundAt(places.penS + (i % 4) * 2.2 - 3.3, places.penLateral - places.side * Math.floor(i / 4) * .2);
      car.position.set(p.x, p.y + .58 + Math.floor(i / 4) * 1.15, p.z);
      car.rotation.y = p.heading + (i % 2 ? .25 : -.2);
      pen.add(car);
    }
  }

  function place(at, heading) {
    holder.position.set(at.x, at.y, at.z);
    holder.rotation.y = heading;
  }

  return {group, update(next, state, now, show) {
    const night = state?.bowlNight, fight = rexFightOf(night);
    const teaser = !fight && (night?.night === 3 || night?.night === 4);
    const enabled = show === true && next?.def?.bowl === true && !disposed && (!!fight || teaser);
    group.visible = enabled;
    if (!enabled) { lastNow = now; chestLight.intensity = 0; return; }
    if (next !== course) build(next);
    const dt = lastNow == null ? 0 : Math.max(0, Math.min(.1, (now - lastNow) / 1000));
    lastNow = now;
    mixer?.update(dt);
    const seconds = now / 1000;
    pen.visible = !!fight;
    cone.visible = fire.visible = ring.visible = thrown.visible = chest.visible = false;
    chestLight.intensity = 0;
    if (teaser) {
      // Behind the wall in front of the stands, at the head of the crush line, looking in.
      const at = next.groundAt(places.startS, places.side * (places.edge + 4.5));
      place(at, at.heading - Math.PI / 2);
      pose.position.y = 0; pose.rotation.set(0, 0, 0);
      boxes.forEach(({whole, smashed}) => { if (whole) whole.visible = true; if (smashed) smashed.visible = false; });
      actions.tail?.play();
      return;
    }
    pen.children.forEach((car, index) => { car.visible = index < fight.penCars; });
    place(next.groundAt(fight.s, places.rail), rexFacing(fight, next));
    // Poses: it rears for its tell, crouches to rest with its back low, and rolls over when it falls.
    const crouch = REX_RULES.boxTop.standing - REX_RULES.boxTop.resting;
    const low = fight.phase === 'rest' || fight.phase === 'stagger' ? 1 : 0;
    pose.position.y += (-crouch * low - pose.position.y) * Math.min(1, dt * 4);
    const pitch = fight.phase === 'tell' ? -.14 : fight.phase === 'rest' ? .1 : fight.phase === 'eat' ? .18 : 0;
    pose.rotation.x += (pitch - pose.rotation.x) * Math.min(1, dt * 3);
    fallRoll = fight.phase === 'fallen' ? Math.min(1.45, 1.45 * fight.t / REX_RULES.fallSec) : 0;
    pose.rotation.z = -fallRoll;
    if (fight.phase === 'fallen') pose.position.y = -crouch * .5 * fallRoll / 1.45;
    // Its jaw works when it breathes, eats or lifts a car; its tail swings while it walks.
    const jaw = ['tell', 'fire', 'eat', 'lift'].includes(fight.phase), tail = fight.phase === 'walk';
    if (actions.jaw) { if (jaw) actions.jaw.play(); else actions.jaw.stop(); }
    if (actions.tail) { if (tail) actions.tail.play(); else actions.tail.stop(); }
    const open = fight.phase === 'rest' ? fight.boxes.indexOf(false) : -1;
    boxes.forEach(({whole, smashed}, index) => {
      if (whole) {
        whole.visible = !fight.boxes[index];
        // The open box flashes hazard yellow; the shut ones do not.
        whole.material.emissive?.setHex(index === open ? 0xffd23a : 0x000000);
        if (index === open) whole.material.emissiveIntensity = 1.2 + Math.sin(seconds * 9) * .8;
      }
      if (smashed) smashed.visible = !!fight.boxes[index];
    });
    if (fight.cone && (fight.phase === 'tell' || fight.phase === 'fire')) {
      const y = next.groundAt(fight.s, places.rail).y + .06;
      for (const item of [cone, fire]) {
        item.position.set(fight.cone.x, y, fight.cone.z);
        item.rotation.y = fight.cone.heading;
        item.scale.set(fight.cone.range, 1, fight.cone.range);
      }
      cone.visible = true;
      // The tell: the cone pulses faster as the fire gets close, and its chest glows brighter. The fire: the cone burns.
      const level = REX_RULES.level[fight.level];
      const share = fight.phase === 'tell' ? Math.min(1, fight.t / level.tellSec) : 1;
      chest.visible = true;
      chest.material.opacity = .35 + .55 * share;
      chest.scale.setScalar(.8 + .5 * share + .08 * Math.sin(seconds * 14));
      chestLight.intensity = 40 + 260 * share;
      cone.material.opacity = fight.phase === 'tell' ? .22 + .3 * share * (.5 + .5 * Math.sin(seconds * (6 + share * 10))) : .6;
      fire.visible = fight.phase === 'fire';
      if (fire.visible) fire.children.forEach((sheet, layer) => {
        sheet.material.opacity = .45 + .25 * Math.sin(seconds * 23 + layer * 2.1);
        sheet.scale.setScalar(.92 + .08 * Math.sin(seconds * 17 + layer));
      });
    }
    if (fight.throwAt && (fight.phase === 'lift' || fight.phase === 'throw')) {
      const target = next.groundAt(fight.throwAt.s, fight.throwAt.lateral);
      ring.position.set(target.x, target.y + .07, target.z);
      ring.visible = true;
      ring.material.opacity = .4 + .3 * Math.sin(seconds * 10);
      const head = next.groundAt(fight.s - REX_RULES.headAhead, places.rail);
      const from = new THREE.Vector3(head.x, head.y + REX_RULES.boxTop.standing + 1, head.z);
      thrown.visible = true;
      if (fight.phase === 'lift') thrown.position.copy(from);
      else {
        const u = Math.min(1, fight.t / REX_RULES.thrown.flightSec);
        thrown.position.set(from.x + (target.x - from.x) * u, from.y + (target.y + .6 - from.y) * u + 6 * u * (1 - u),
          from.z + (target.z - from.z) * u);
        thrown.rotation.x = u * 2.4;
      }
    }
  }, dispose() {
    if (disposed) return;
    disposed = true; clear(); mixer?.stopAllAction(); disposeTree(group);
  }};
}
