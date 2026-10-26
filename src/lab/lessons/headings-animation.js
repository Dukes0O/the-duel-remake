import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {headingsBench, leg, MAP_UNIT_METRES} from '../benches/headings.js';
import {box, camera, mountMachine, pictureBase, pictureArrow} from './workshop-display.js';

export const MAP_LEGS = ['tremblant-snow', 'panorama-ridge', 'summit-run'].map(to => ({from: 'tremblant-woods', to, truth: leg('tremblant-woods', to)}));
export const readHeading = (input = {}, index = 0) => ({from: MAP_LEGS[index].from, to: MAP_LEGS[index].to, headingDeg: 270, rulerUnits: 4, ...input});
export function headingOutcome(load) {
  const result = headingsBench.run(load);
  return result.correct ? 'pad' : result.headingOffDeg > 5 ? 'off' : 'distance';
}
export const headingSamples = {
  pad: {...readHeading(), headingDeg: Math.round(MAP_LEGS[0].truth.headingDeg), rulerUnits: 2},
  distance: {...readHeading(), headingDeg: Math.round(MAP_LEGS[0].truth.headingDeg), rulerUnits: .8},
  off: readHeading(),
};
const direction = degrees => [Math.sin(degrees * Math.PI / 180), -Math.cos(degrees * Math.PI / 180)];
export function headingsDrawing(input, time, mode = 'leg') {
  const result = headingsBench.run(input), load = result.settings;
  const truth = result.truth, unit = direction(load.headingDeg), target = direction(truth.headingDeg);
  // Reserve map-edge space for a whole H circle and its printed destination.
  // The grid, ruler, flight and destination all retain this single scale.
  const scale = .55 / Math.max(truth.distanceUnits, load.rulerUnits, 1), progress = Math.min(1, time / 3);
  const x = unit[0] * load.rulerUnits * scale * progress, z = unit[1] * load.rulerUnits * scale * progress;
  return {input: load, actual: headingOutcome(load), reading: {heading: load.headingDeg, metres: load.rulerUnits * MAP_UNIT_METRES},
    truth, x, z, scale, mode,
    objects: [{...box('heading-crank', [-.85, 1.18, .5], [.4, .2, .4], '#edc557', 'headingDeg'), opacity: 0},
      {...box('ruler-handle', [unit[0] * load.rulerUnits * scale / 2, 1.15, unit[1] * load.rulerUnits * scale / 2],
        [load.rulerUnits * scale, .12, .2], '#edc557', 'rulerUnits', [0, Math.PI / 2 - load.headingDeg * Math.PI / 180, 0]), opacity: 0},
    ],
    captions: [`${Math.round(load.headingDeg)}°\n${Math.round(load.rulerUnits * MAP_UNIT_METRES)} m`, `1 square = ${MAP_UNIT_METRES} m`],
    props: [{id: 'compass-control', model: 'heading-wheel', position: [-.85, 1.14, .5], scale: .6}],
    captionAnchors: [[-.85, 1.2, .5], [.4, 1.12, -.3]], captionOffsets: [[-190, 5], [25, -70]],
    streams: [{medium: 'air', origin: [target[0] * truth.distanceUnits * scale, 1.14, target[1] * truth.distanceUnits * scale], direction: [0, 1, 0], speed: .35, radius: .05, length: .5}],
    camera: camera([1.65, 2.25, 2.65], [0, .95, 0]),
  };
}
export function mountHeadings(options) {
  const {THREE, group, doc} = options;
  const map = doc.createElement('canvas'); map.width = 1024; map.height = 640;
  const ctx = map.getContext('2d'), texture = new THREE.CanvasTexture(map); texture.colorSpace = THREE.SRGBColorSpace;
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(2.16, 1.35), new THREE.MeshBasicMaterial({map: texture}));
  plane.rotation.x = -Math.PI / 2; plane.position.set(0, 1.09, 0); group.add(plane);
  let toy = null, disposed = false;
  const mounted = mountMachine(options, 'map-table', (machine, d, clock, own) => {
    if (!own.includes(plane)) own.push(plane);
    const needle = machine.getObjectByName('compass-needle'); if (needle) needle.rotation.y = -d.input.headingDeg * Math.PI / 180;
    const ruler = machine.getObjectByName('ruler');
    if (ruler) { const [dx, dz] = direction(d.input.headingDeg), length = d.input.rulerUnits * d.scale; ruler.rotation.y = Math.PI / 2 - d.input.headingDeg * Math.PI / 180; ruler.scale.x = length / .9; ruler.position.set(dx * length / 2, 1.14, dz * length / 2); }
    ctx.fillStyle = '#bfb788'; ctx.fillRect(0, 0, 1024, 640);
    ctx.strokeStyle = '#7b815c'; ctx.lineWidth = 2;
    const squareX = d.scale * 1024 / 2.16, squareY = d.scale * 640 / 1.35;
    for (let x = 512 % squareX; x < 1024; x += squareX) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 640); ctx.stroke(); }
    for (let y = 320 % squareY; y < 640; y += squareY) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(1024, y); ctx.stroke(); }
    ctx.fillStyle = '#4f8192'; ctx.beginPath(); ctx.ellipse(770, 320, 120, 90, .4, 0, 7); ctx.fill();
    ctx.fillStyle = '#314332'; ctx.font = 'bold 34px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('N · 0°', 512, 45); ctx.fillText('E · 90°', 930, 325); ctx.fillText('S · 180°', 512, 620); ctx.fillText('W · 270°', 95, 325);
    const [dx, dy] = direction(d.input.headingDeg);
    pictureArrow(ctx, 512, 320, dx * d.input.rulerUnits * squareX, dy * d.input.rulerUnits * squareY, '#ad3631');
    for (let i = 0; i <= Math.floor(d.input.rulerUnits); i++) {
      const x = 512 + dx * i * squareX, y = 320 + dy * i * squareY;
      ctx.strokeStyle = '#ece4bd'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x - dy * 10, y + dx * 10); ctx.lineTo(x + dy * 10, y - dx * 10); ctx.stroke();
    }
    const [tx, tz] = direction(d.truth.headingDeg);
    for (const [x, y, name, colour] of [[512, 320, 'HOME', '#315e77'],
      [512 + tx * d.truth.distanceUnits * squareX, 320 + tz * d.truth.distanceUnits * squareY, 'SMOKE', '#2f6341']]) {
      ctx.fillStyle = '#e8dfb2'; ctx.strokeStyle = colour; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.arc(x, y, 25, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = colour; ctx.font = 'bold 30px sans-serif'; ctx.fillText('H', x, y + 10);
      ctx.font = 'bold 22px sans-serif'; ctx.fillText(name, x, y + 51);
    }
    texture.needsUpdate = true;
    if (toy) { toy.position.set(d.x, 1.17, d.z); toy.rotation.y = Math.PI - d.input.headingDeg * Math.PI / 180; const rotor = toy.getObjectByName('main_rotor'); if (rotor) rotor.rotation.y = clock.time * 20; }
  });
  new GLTFLoader().loadAsync('/assets/heli/kestrel-one.glb').then(gltf => {
    if (disposed) { release(gltf.scene); return; }
    toy = gltf.scene; toy.scale.setScalar(.055); group.add(toy);
  }).catch(() => { options.canvas.dataset.workshopToy = 'failed'; });
  const release = root => {
    const resources = new Set(); root.traverse(n => { if (n.geometry) resources.add(n.geometry); for (const m of [].concat(n.material ?? [])) { resources.add(m); for (const v of Object.values(m)) if (v?.isTexture) resources.add(v); } }); resources.forEach(r => r.dispose()); root.removeFromParent();
  };
  return {draw(d, clock) { mounted.draw(d, clock); options.canvas.dataset.workshopToy = toy ? 'ready' : 'loading'; },
    dispose() { disposed = true; mounted.dispose(); texture.dispose(); if (toy) release(toy); delete options.canvas.dataset.workshopToy; }};
}
export function headingPicture(load, cardinal = false) {
  return (ctx, w, h) => {
    pictureBase(ctx, w, h);
    const dir = direction(load.headingDeg), truth = leg(load.from, load.to), target = direction(truth.headingDeg);
    ctx.fillStyle = '#bdb486'; ctx.fillRect(20, 10, w - 40, h - 20);
    ctx.strokeStyle = '#7a805e'; ctx.lineWidth = 1;
    for (let i = 40; i < w - 20; i += 24) { ctx.beginPath(); ctx.moveTo(i, 10); ctx.lineTo(i, h - 10); ctx.stroke(); }
    if (cardinal) { ctx.fillStyle = '#407f9c'; ctx.beginPath(); ctx.ellipse(198, 60, 22, 16, 0, 0, 7); ctx.fill(); }
    const scale = 48 / Math.max(truth.distanceUnits, load.rulerUnits, 1);
    if (!cardinal) { ctx.fillStyle = '#56d683'; ctx.fillRect(123 + target[0] * truth.distanceUnits * scale, 72 + target[1] * truth.distanceUnits * scale, 14, 12); }
    pictureArrow(ctx, 130, 78, dir[0] * (cardinal ? 48 : load.rulerUnits * scale), dir[1] * (cardinal ? 48 : load.rulerUnits * scale), '#a73028');
    ctx.fillStyle = '#263330'; ctx.font = 'bold 18px sans-serif'; ctx.fillText('N', 130, 29);
    ctx.fillText(`${Math.round(load.headingDeg)}°${cardinal ? '' : ` · ${Math.round(load.rulerUnits * MAP_UNIT_METRES)} m`}`, w / 2, h - 12);
  };
}
