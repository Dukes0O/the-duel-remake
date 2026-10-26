import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {createUnlockedVehicle} from '../../unlock-vehicles.js';
import {KESTREL, PAD, padForces, padLoad, padOutcome} from '../benches/lift-pad.js';

export const trialInput = (input, index = 0) => ({fuel: KESTREL.tankKg, crates: index === 1 ? 1 : 0, car: 0, collective: 0, ...input});
export function rotorBlades(rotor) {
  const blades = [];
  rotor?.traverse(mesh => {
    if (!mesh.geometry) return;
    mesh.geometry = mesh.geometry.clone();
    blades.push({mesh, original: mesh.geometry.attributes.position.array.slice()});
  });
  return blades;
}
export function pitchBlades(blades, collective) {
  for (const {mesh, original} of blades) {
    if (mesh.userData.pitch === collective) continue;
    mesh.userData.pitch = collective;
    const p = mesh.geometry.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = original[i * 3], y = original[i * 3 + 1], z = original[i * 3 + 2];
      const angle = Math.abs(x) > .22 ? Math.sign(x) * collective * .48 : 0;
      if (angle === 0) p.setXYZ(i, x, y, z);
      else p.setXYZ(i, x, y * Math.cos(angle) - z * Math.sin(angle), y * Math.sin(angle) + z * Math.cos(angle));
    }
    p.needsUpdate = true; mesh.geometry.computeVertexNormals(); mesh.geometry.computeBoundingSphere();
  }
}
export function liftDrawing(input, time, mode = 'try', support = null) {
  const load = padLoad(input), f = padForces(load), h = padForces(load, PAD.hoverHeight);
  const outcome = padOutcome(load);
  const rise = mode === 'wonder' ? Math.max(0, Math.sin(time * 3)) * .07 :
    mode === 'hover' ? .3 * Math.min(1, time) : mode === 'try' && time > 0 ?
      outcome === 'up' ? Math.min(.75, time * .35) : outcome === 'hover' ? .3 * Math.min(1, time) :
        outcome === 'settles' ? Math.max(0, Math.sin(Math.min(Math.PI, time))) * .2 : 0 : 0;
  const baseY = .12 + rise;
  const showLift = !['rotor', 'weight', 'wonder'].includes(mode), showWeight = !['rotor', 'lift', 'collective', 'wonder'].includes(mode);
  const showAir = !['weight', 'rotor'].includes(mode);
  const scale = .000034;
  const forceN = mode === 'hover' || outcome === 'hover' && rise > 0 ? h.weightN : f.liftN;
  const forces = [];
  if (showLift) forces.push({kind: 'lift', newtons: forceN, origin: [-.5, 1.4 + rise, .85], direction: [0, 1, 0], labelPosition: [-1.35, 2.8, 1]});
  if (showWeight) forces.push({kind: 'weight', newtons: f.weightN, origin: [.5, 1.65 + rise, .85], direction: [0, -1, 0], labelPosition: [1.35, 2.8, 1]});
  const angle = (1 - load.collective) * 1.05;
  const objects = [{id: 'collective-shaft', position: [.45, baseY + .3 + Math.cos(angle) * .24, .52 - Math.sin(angle) * .24], size: [.045, .48, .045], rotation: [-angle, 0, 0], colour: '#8f9791'},
    {id: 'collective-handle', shape: 'sphere', control: 'collective', position: [.45, baseY + .3 + Math.cos(angle) * .48, .52 - Math.sin(angle) * .48], size: [.16, .16, .16], colour: '#edc557'}];
  objects.push({id: 'fuel-target', control: 'fuel', position: [-1.65, .5, 1.5], size: [1, .9, .8], opacity: 0},
    {id: 'car-target', control: 'car', position: [load.car ? 1.15 : 2.6, .5, -.45], size: [.8, .8, 1.6], opacity: 0},
    {id: 'crate-target', control: 'crates', position: [1.5, .4, 1.3], size: [.7, .7, .7], opacity: 0});
  // Solid coloured shafts stay legible against the steel hangar.
  forces.forEach((a, i) => objects.push({id: `force-shaft-${i}`, position: [a.origin[0], a.origin[1] + a.direction[1] * a.newtons * scale / 2, a.origin[2]], size: [.075, Math.max(.001, a.newtons * scale - .12), .075], colour: a.kind === 'lift' ? '#56d683' : '#f06464'}));
  if (support === 'guided') objects.push({id: 'guide', position: [.45, 1.65, .7], size: [.05, .35, .05], colour: '#edc557'});
  // Click targets lie on real load models; their wire-free invisible skin is
  // supplied by the mount, using the same object's control id.
  return {load, baseY, rise, mode, forces, objects, metresPerNewton: scale,
    streams: showAir ? [-.85, 0, .85].map(x => ({medium: 'air', origin: [x, baseY + 1.4, 0], direction: [0, -1, 0], speed: load.fuel ? load.collective * 8 : 0, radius: .45, length: 1.5})) : [],
    camera: {position: [3.7, 3.1, 5.5], target: [0, .65, 0]},
    graph: mode === 'ramp' ? {position: [2.3, 2.6, -.4], size: [2, 1.125, 1], xLabel: 'Time in seconds', yLabel: 'Lift in newtons', maxX: 4, maxY: f.maximumN,
      points: Array.from({length: 41}, (_, i) => [i / 10, Math.min(1, i / 40) * f.weightN])} : null};
}

// Models are local runtime assets. Only their display pose changes here.
export function mountLift({group, THREE, models, doc, canvas}) {
  const own = new THREE.Group(); group.add(own);
  let disposed = false, heli = null, rotor = null, ghostHeli = null;
  const blades = [];
  const car = createUnlockedVehicle({key: 'dusthawk_rally'}); car.scale.setScalar(.33); own.add(car);
  const cargo = new THREE.Group(); own.add(cargo);
  const weightSource = models.get('weights-and-cans');
  const cans = weightSource?.clone(true); if (cans) { cans.scale.setScalar(.65); cans.position.set(-1.75, 0, 1.3); own.add(cans); }
  const labels = [];
  function label(text, position, width = 1.7) {
    const image = doc.createElement('canvas'); image.width = 640; image.height = 100;
    const ctx = image.getContext('2d'); ctx.fillStyle = '#252c29'; ctx.fillRect(0, 0, 640, 100);
    ctx.font = 'bold 42px sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#f5f0dc'; ctx.fillText(text, 320, 65, 620);
    const map = new THREE.CanvasTexture(image); map.colorSpace = THREE.SRGBColorSpace;
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({map, depthTest: false, toneMapped: false}));
    sprite.position.set(...position); sprite.scale.set(width, width / 6.4, 1); own.add(sprite); labels.push(sprite); return sprite;
  }
  const fuelLabel = label(`Can → ${PAD.canKg} kg fuel`, [-1.6, .8, 1.5]);
  const carLabel = label(`Dusthawk · ${PAD.carKg} kg`, [1.7, .75, -.1]);
  const crateLabel = label(`Crate · ${PAD.crateKg} kg`, [1.6, .4, 1.25]);
  const leverLabel = label('Left-hand lever · drag / ↑ ↓', [.4, .8, 1.6], 2.2);
  const totalLabel = label('', [0, .25, 2.1], 2.8); let totalText = '';
  let loadedCrates = 0;
  const cable = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]), new THREE.LineBasicMaterial({color: '#c6c8be'})); own.add(cable);
  const loader = new GLTFLoader();
  loader.loadAsync('/assets/heli/rescue/crate-food.glb').then(gltf => {
    if (disposed) { release(gltf.scene); return; }
    for (let i = 0; i <= PAD.maxCrates; i++) {
      const crate = gltf.scene.clone(true); crate.scale.setScalar(.45);
      crate.position.set(i === PAD.maxCrates ? 1.5 : .9 + (i % 2) * .5, i === PAD.maxCrates ? .12 : .12 + Math.floor(i / 2) * .5, i === PAD.maxCrates ? 1.3 : -.1);
      crate.visible = i === PAD.maxCrates || i < loadedCrates; cargo.add(crate);
    }
  }).catch(() => { canvas.dataset.labLiftCrates = 'failed'; });
  loader.loadAsync('/assets/heli/kestrel-one.glb').then(gltf => {
    if (disposed) { release(gltf.scene); return; }
    heli = gltf.scene; heli.scale.setScalar(.48); own.add(heli);
    rotor = heli.getObjectByName('main_rotor');
    blades.push(...rotorBlades(rotor));
    ghostHeli = heli.clone(true); ghostHeli.scale.setScalar(.35); own.add(ghostHeli);
    ghostHeli.traverse(n => {
      if (n.material) {
        const copies = [].concat(n.material).map(m => { const copy = m.clone(); copy.transparent = true; copy.opacity = .18; copy.depthWrite = false; return copy; });
        n.material = Array.isArray(n.material) ? copies : copies[0];
      }
    });
    canvas.dataset.labLiftModel = 'ready';
  }).catch(() => { canvas.dataset.labLiftModel = 'failed'; });
  function release(root) { root.traverse(n => { n.geometry?.dispose(); for (const m of [].concat(n.material ?? [])) { m.map?.dispose(); m.dispose(); } }); }
  return {
    draw(d, clock) {
      if (!d.load) return;
      const l = d.load;
      if (heli) heli.position.y = d.baseY;
      if (rotor) {
        rotor.rotation.y = l.fuel ? clock.time * (d.mode === 'collective' ? 1.1 : 3) : 0;
        pitchBlades(blades, l.collective);
      }
      car.position.set(1.4, .13 + (l.car && d.mode !== 'wonder' ? d.rise : 0), -.45);
      car.rotation.y = -.6;
      // Unloaded objects wait beside the pad instead of disappearing.
      car.position.x = l.car ? 1.15 : 2.6;
      loadedCrates = l.crates;
      cargo.children.forEach((c, i) => { c.visible = i === PAD.maxCrates || i < l.crates; });
      if (ghostHeli) {
        ghostHeli.visible = Boolean(clock.previous) && clock.stage === 3;
        if (clock.previous) {
          const old = clock.previous;
          const pose = liftDrawing(trialInput(old.input, old.index), Math.min(clock.time, old.time));
          ghostHeli.position.set(-2.1, pose.baseY, -.5);
        }
      }
      cable.visible = Boolean(l.car);
      const p = cable.geometry.attributes.position; p.setXYZ(0, 0, d.baseY + .35, 0); p.setXYZ(1, car.position.x, .5 + d.rise, -.45); p.needsUpdate = true; cable.geometry.computeBoundingSphere();
      const txt = `${Math.round(padForces(l).massKg)} kg total · ${l.fuel} kg in tank · ${l.crates} crates`;
      if (txt !== totalText) { totalText = txt; const ctx = totalLabel.material.map.image.getContext('2d'); ctx.fillStyle = '#252c29'; ctx.fillRect(0, 0, 640, 100); ctx.fillStyle = '#f5f0dc'; ctx.fillText(txt, 320, 65, 620); totalLabel.material.map.needsUpdate = true; }
      leverLabel.visible = d.mode === 'collective' || clock.stage === 3;
      fuelLabel.visible = carLabel.visible = crateLabel.visible = clock.stage === 3 || Boolean(l.car);
      canvas.dataset.labLiftLoad = JSON.stringify(l);
    },
    dispose() {
      disposed = true; cans?.removeFromParent(); // cloned Lab geometry belongs to the room
      release(own); own.removeFromParent();
      delete canvas.dataset.labLiftModel; delete canvas.dataset.labLiftLoad;
    },
  };
}

export function helicopterPicture({fuel = KESTREL.tankKg, crates = 0, car = 0, collective = 1, outcome}, label) {
  return (ctx, w, h) => {
    const f = padForces({fuel, crates, car, collective}), actual = outcome ?? padOutcome({fuel, crates, car, collective});
    ctx.fillStyle = '#28332f'; ctx.fillRect(0, 0, w, h);
    const y = actual === 'down' ? 68 : 43;
    ctx.strokeStyle = '#a6afa6'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(10, 100); ctx.lineTo(w - 10, 100); ctx.stroke();
    ctx.fillStyle = '#b7b5a2'; ctx.beginPath(); ctx.ellipse(115, y, 32, 14, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#333e43'; ctx.fillRect(123, y - 10, 19, 13);
    ctx.strokeStyle = '#c6c5b1'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(83, y); ctx.lineTo(43, y - 10); ctx.moveTo(108, y - 15); ctx.lineTo(108, y - 25); ctx.moveTo(54, y - 25); ctx.lineTo(163, y - 25); ctx.moveTo(90, y + 22); ctx.lineTo(140, y + 22); ctx.moveTo(100, y + 12); ctx.lineTo(100, y + 22); ctx.stroke();
    for (let i = 0; i < crates; i++) { ctx.fillStyle = '#a58b5b'; ctx.fillRect(154 + i % 2 * 12, 87 - Math.floor(i / 2) * 13, 11, 12); }
    if (car) { ctx.fillStyle = '#ddd9c6'; ctx.fillRect(178, 79, 39, 12); ctx.fillRect(185, 72, 19, 9); ctx.fillStyle = '#131b19'; ctx.fillRect(181, 89, 8, 8); ctx.fillRect(205, 89, 8, 8); }
    function arrow(x, from, to, colour) { ctx.strokeStyle = colour; ctx.fillStyle = colour; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(x, from); ctx.lineTo(x, to); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x, to); ctx.lineTo(x - 7, to + (to < from ? 9 : -9)); ctx.lineTo(x + 7, to + (to < from ? 9 : -9)); ctx.fill(); }
    const max = Math.max(f.weightN, f.liftN); arrow(22, 86, 86 - f.liftN / max * 50, '#56d683'); arrow(238, 25, 25 + f.weightN / max * 50, '#f06464');
    ctx.fillStyle = '#f5f0dc'; ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(label ?? `${Math.round(f.massKg)} kg · ${Math.round(collective * 100)}%`, w / 2, h - 7);
  };
}
