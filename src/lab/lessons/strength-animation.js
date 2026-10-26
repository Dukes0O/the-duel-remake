import {ARM, MATERIALS, hookArm, lightestArm, loadBar} from '../benches/strength.js';
import {createUnlockedVehicle} from '../../unlock-vehicles.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {box, camera, arrow, thickArrows, mountMachine, pictureBase} from './workshop-display.js';

const strengthInput = input => ({material: 'steel', thicknessMm: 30, ...input, part: 'hook arm'});
export function strengthResult(input) {
  const arm = hookArm(input.material, input.thicknessMm);
  const material = MATERIALS[input.material];
  const broke = arm.stressMPa * 1e6 >= material.strength;
  return {arm, actual: broke ? material.brittle ? 'snaps' : 'bends' : arm.tipDropMm > ARM.maxDropM * 1000 ? 'bends' : 'holds'};
}
export const strengthSamples = {
  holds: {material: 'carbon fibre', thicknessMm: lightestArm().thicknessMm},
  bends: {material: 'steel', thicknessMm: 30}, snaps: {material: 'carbon fibre', thicknessMm: 20},
  'check-steel': {material: 'steel', thicknessMm: 80},
  'check-carbon': {material: 'carbon fibre', thicknessMm: lightestArm().thicknessMm},
  'check-thin': {material: 'aluminium', thicknessMm: 20},
};
const colours = {'steel': '#7b8a92', aluminium: '#ccd8df', 'carbon fibre': '#303c42'};
export function strengthDrawing(input, time, mode = 'hook') {
  const load = strengthInput(input), physical = strengthResult(load), arm = physical.arm;
  const hanging = input.hanging !== false, actual = hanging ? physical.actual : 'holds';
  const progress = Math.min(1, time / 3), shown = mode === 'bars' ? 2100 * progress : ARM.loadKg * progress;
  const bars = Object.keys(MATERIALS).map(m => loadBar(m, shown));
  const drop = Math.min(.65, arm.tipDropMm / 1000 * 12) * progress;
  const objects = [box('load-target', [.7, .65, .1], [1.3, .5, .6], '#d77b40', 'part'), box('material', [-1.65, 1.1, .8], [.35, .35, .35], colours[load.material], 'materialDial'),
    box('thickness', [1.65, 1.1, .8], [.12, .65, .12], '#edc557', 'thicknessMm', [0, 0, -load.thicknessMm / 120])];
  objects[0].opacity = 0;
  if (mode !== 'bars') objects.push(box('hook-line', [.7, 1.1 - drop / 2, .1], [.025, .8 + drop, .025], '#e4dcc1'));
  const force = hanging ? ARM.loadKg * progress : 0;
  if (!hanging) { objects.find(o => o.id === 'load-target').position[1] = .05; const cable = objects.find(o => o.id === 'hook-line'); if (cable) cable.opacity = 0; }
  return thickArrows({input: load, actual, arm, bars, mode, drop: hanging ? drop : 0, hanging,
    objects, hideLabels: true, metresPerNewton: .00045,
    forces: mode === 'bars' ? [] : [arrow('weight', force, [.8, 1.35, .5], [0, -1, 0]), arrow('push', actual === 'holds' ? force : force * .4, [.8, 1.4, .5], [0, 1, 0])],
    captions: mode === 'bars' ? bars.map(b => `${MATERIALS[b.material].name}: 1 kg\n${Math.round(shown)} kg load`) :
      [`${MATERIALS[load.material].name}\n${load.thicknessMm} mm · ${arm.massKg.toFixed(1)} kg arm`, `${ARM.loadKg} kg test load\n${actual}`],
    reading: arm.massKg,
    camera: camera([2.8, 2.3, 5.3], [.1, 1.05, 0]),
  });
}
export function mountStrength(options) {
  let car, heli, disposed = false;
  const release = root => { const resources = new Set(); root.traverse(n => { if (n.geometry) resources.add(n.geometry); for (const m of [].concat(n.material ?? [])) { resources.add(m); for (const v of Object.values(m)) if (v?.isTexture) resources.add(v); } }); resources.forEach(r => r.dispose()); root.removeFromParent(); };
  new GLTFLoader().loadAsync('/assets/heli/kestrel-one.glb').then(gltf => {
    if (disposed) { release(gltf.scene); return; }
    heli = gltf.scene; heli.scale.setScalar(.22); heli.position.set(.4, 2, 0); options.group.add(heli);
  }).catch(() => { options.canvas.dataset.workshopHookHeli = 'failed'; });
  const mounted = mountMachine(options, 'bending-rig', (machine, d, clock, own, {group}) => {
    if (!car) {
      car = createUnlockedVehicle({key: 'banshee_muscle'}); car.scale.setScalar(.25); car.rotation.y = Math.PI / 2; group.add(car); own.push(car);
    }
    car.visible = d.mode !== 'bars'; car.position.set(.7, d.hanging ? .65 - d.drop : .05, .1);
    if (heli) { heli.visible = d.mode === 'wonder'; heli.position.y = 2 + Math.sin(clock.time * 3) * .03; const rotor = heli.getObjectByName('main_rotor'); if (rotor) rotor.rotation.y = clock.time * 20; }
    for (const material of Object.keys(MATERIALS)) {
      const part = machine.getObjectByName(material === 'carbon fibre' ? 'bar-carbon' : `bar-${material}`);
      if (!part) continue;
      part.visible = d.mode === 'bars' || material === d.input.material;
      const result = d.mode === 'bars' ? d.bars.find(b => b.material === material) : null;
      const nativeThickness = material === 'steel' ? .06 : material === 'aluminium' ? .1 : .08;
      const thickness = result?.thicknessMm ?? d.input.thicknessMm;
      part.scale.y = thickness * .004 / nativeThickness;
      part.scale.z = (d.mode === 'bars' ? .04 : ARM.widthM) * 4 / (material === 'steel' ? .07 : material === 'aluminium' ? .1 : .09);
      part.position.z = d.mode === 'bars' ? (Object.keys(MATERIALS).indexOf(material) - 1) * .48 : .1;
      part.position.y = d.mode === 'bars' ? .66 : 1.5;
      const deformation = result ? Math.min(.6, result.tipDropMm / 1000 * 4) : d.drop;
      part.traverse(n => {
        if (!n.geometry) return;
        const p = n.geometry.attributes.position;
        n.userData.rest ??= p.array.slice();
        for (let i = 0; i < p.count; i++) {
          const [x, y, z] = n.userData.rest.slice(i * 3, i * 3 + 3);
          const snapped = result ? result.state === 'snapped' : d.actual === 'snaps' && clock.time > 1;
          p.setXYZ(i, x, y - (deformation * (x + 1) ** 2 / 4 + (snapped && x > 0 ? .4 : 0)) / part.scale.y, z);
        }
        p.needsUpdate = true; n.geometry.computeVertexNormals(); n.geometry.computeBoundingSphere();
      });
    }
    const ram = machine.getObjectByName('ram'); if (ram) ram.position.y = 1.8 - Math.min(.35, clock.time * .08);
  });
  return {draw: mounted.draw, dispose() { disposed = true; mounted.dispose(); if (heli) release(heli); delete options.canvas.dataset.workshopHookHeli; }};
}
export function strengthPicture(input) {
  const {arm, actual} = strengthResult(input);
  return (ctx, w, h) => {
    pictureBase(ctx, w, h);
    ctx.fillStyle = '#78877e'; ctx.fillRect(22, 40, 18, 68);
    ctx.strokeStyle = colours[input.material]; ctx.lineWidth = 14;
    ctx.beginPath(); ctx.moveTo(38, 44); ctx.lineTo(110, 44);
    ctx.lineTo(175, actual === 'holds' ? 44 : 65); ctx.stroke();
    if (actual === 'snaps') { ctx.clearRect(111, 30, 12, 55); ctx.strokeStyle = '#f06464'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(112, 30); ctx.lineTo(120, 80); ctx.stroke(); }
    ctx.fillStyle = '#d77b40'; ctx.fillRect(149, 76, 62, 22); ctx.fillStyle = '#111c1b';
    for (const x of [160, 201]) { ctx.beginPath(); ctx.arc(x, 101, 8, 0, Math.PI * 2); ctx.fill(); }
    ctx.strokeStyle = '#edc557'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(174, actual === 'holds' ? 44 : 65); ctx.lineTo(174, 76); ctx.stroke();
    ctx.fillStyle = '#f5f0dc'; ctx.fillText(`${arm.massKg.toFixed(1)} kg`, w / 2, 22);
  };
}
