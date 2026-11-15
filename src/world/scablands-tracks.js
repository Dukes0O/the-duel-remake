// The first drawing of the ways: a moving picture of the paired rut data.
import * as THREE from 'three';
import {LAND} from './scablands-names.js';
import {HOT_DELIVERY_WAYS, routeFor} from './scablands-ways.js';
import {tracksForWay} from './scablands-things.js';

const SIZE = 512, PIXELS = 2048, STEP = 128;

export function scablandsTracks() {
  return HOT_DELIVERY_WAYS.flatMap(way => tracksForWay(routeFor(way.legs, {
    start: LAND.yard, destination: LAND.at('tin-town'),
  })));
}

export function createScablandsTracks(canvas = typeof document === 'undefined' ? null : document.createElement('canvas')) {
  if (!canvas) return null;
  canvas.width = canvas.height = PIXELS;
  const context = canvas.getContext('2d');
  if (!context) return null;
  const segments = scablandsTracks();
  const texture = new THREE.CanvasTexture(canvas);
  texture.generateMipmaps = true;
  const box = new THREE.Vector4(0, 0, 1 / SIZE, 1 / SIZE);
  let cellX = NaN, cellZ = NaN;
  function update(x, z) {
    const i = Math.floor(x / STEP), j = Math.floor(z / STEP);
    if (i === cellX && j === cellZ) return;
    cellX = i; cellZ = j;
    const left = (i + .5) * STEP - SIZE / 2, bottom = (j + .5) * STEP - SIZE / 2;
    box.set(left, bottom, 1 / SIZE, 1 / SIZE);
    context.fillStyle = '#000'; context.fillRect(0, 0, PIXELS, PIXELS);
    context.lineWidth = 1.5; context.lineCap = 'round';
    for (const track of segments) {
      if (Math.max(track.x1, track.x2) < left || Math.min(track.x1, track.x2) > left + SIZE ||
          Math.max(track.z1, track.z2) < bottom || Math.min(track.z1, track.z2) > bottom + SIZE) continue;
      const shade = Math.round(track.strength * 255);
      context.strokeStyle = `rgb(${shade},${shade},${shade})`;
      context.beginPath();
      context.moveTo((track.x1 - left) * PIXELS / SIZE, (bottom + SIZE - track.z1) * PIXELS / SIZE);
      context.lineTo((track.x2 - left) * PIXELS / SIZE, (bottom + SIZE - track.z2) * PIXELS / SIZE);
      context.stroke();
    }
    texture.needsUpdate = true;
  }
  return {texture: {value: texture}, box: {value: box}, segments, update, dispose() { texture.dispose(); }};
}
