// DEEP-WATER: the underwater scene for any zone (docs/THE_DEEP.md 10.1).
// Node only, no graphics card: the ground maths, the floor tiles, the crops,
// the waterline, and that the approved look test is unchanged.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import * as THREE from 'three';
import { BANK_SHARE, createZoneFloor, FLOOR_CEILING, ZONE_CAPS, ZONE_SPAN, zoneSeed } from '../src/deep/zone-floor.js';
import { createFloorMesh, createFloorTiles, createPebbles, createRocks, createSeagrass } from '../src/deep/sea-floor.js';
import { kelpPlacements, pebblePlacements, rockPlacements, seagrassPlacements } from '../src/deep/sea-floor-shape.js';
import { createWaterUniforms } from '../src/deep/water-shader.js';
import { createWaterline, waterlineShare, BUBBLE_CAP } from '../src/deep/waterline.js';
import { sampleZone } from './fixtures/deep-sample-zone.js';

const hash = value => createHash('sha256').update(typeof value === 'string' ? value : JSON.stringify(value)).digest('hex').slice(0, 16);
let checks = 0;
const ok = (value, message) => { assert.ok(value, message); checks++; };
const eq = (a, b, message) => { assert.equal(a, b, message); checks++; };

// ---- the approved look test is byte for byte what it was ------------------
{
  const uniforms = createWaterUniforms();
  const mesh = createFloorMesh(uniforms, { cell: 1.5 });
  const g = mesh.geometry.attributes;
  eq(createHash('sha256').update(Buffer.from(g.position.array.buffer)).update(Buffer.from(g.color.array.buffer)).digest('hex').slice(0, 16),
    '65149ddfdf6c7263', 'look-test floor mesh unchanged');
  eq(hash(kelpPlacements(1989, 520)), '8fb09238a452f21a', 'look-test kelp unchanged');
  eq(hash(seagrassPlacements(1989, 1100)), '15177d8ca054f606', 'look-test seagrass unchanged');
  eq(hash(rockPlacements(1989, 90)), '0ef05b14cea353a8', 'look-test rocks unchanged');
  eq(hash(pebblePlacements(1989, 900)), '5f0eddbd74a8b371', 'look-test pebbles unchanged');
}

// ---- the ground of a zone -----------------------------------------------
const zone = sampleZone();
const shape = createZoneFloor(zone);
{
  ok(shape.length > 1700 && shape.length < 2300, `sample loop is about 1.9 km (${shape.length.toFixed(0)} m)`);
  // On the trail the ground lies exactly at the trail's depth: the car and the picture agree.
  for (let along = 0; along < shape.length; along += 37) {
    const f = shape.frameAt(along);
    for (const lateral of [-5.5, 0, 5.5]) {
      const p = shape.pointAt(along, lateral), at = shape.sample(p.x, p.z);
      ok(Math.abs(Math.abs(at.lateral) - Math.abs(lateral)) < 0.05 || at.distance <= Math.abs(lateral) + 0.05, 'a point beside the trail samples back to its offset');
      eq(shape.floorHeight(p.x, p.z), -at.depth, `drivable width is flat at ${along.toFixed(0)} m, ${lateral} m across`);
    }
    eq(shape.trailHeight(along), shape.floorHeight(f.x, f.z), 'trailHeight matches the ground at the trail');
  }
  // Away from the trail the ground rises into banks but never breaks the surface.
  let rose = 0, highest = -Infinity;
  for (let along = 0; along < shape.length; along += 23) {
    const centre = shape.trailHeight(along);
    for (const lateral of [30, 60, 85, -85]) {
      const p = shape.pointAt(along, lateral), h = shape.floorHeight(p.x, p.z);
      highest = Math.max(highest, h);
      if (Math.abs(lateral) >= 60 && h > centre + 3) rose++;
    }
  }
  ok(highest <= FLOOR_CEILING, `banks stay under the surface (highest ${highest.toFixed(2)} m)`);
  // No flat shelf just under the surface: banks keep well below it.
  let shelf = 0;
  for (let along = 0; along < shape.length; along += 23) for (const lateral of [70, 88, -88]) {
    const p = shape.pointAt(along, lateral), at = shape.sample(p.x, p.z);
    if (shape.floorHeight(p.x, p.z) > -at.depth * (1 - BANK_SHARE) + 1.5) shelf++;
  }
  eq(shelf, 0, 'banks rise at most about half the depth');
  ok(rose > 100, 'the trail reads as a channel between banks');
  ok(shape.sample(5000, 5000) === null && shape.floorHeight(5000, 5000) < FLOOR_CEILING - 30, 'far from the trail there is no ground to draw');
  eq(zoneSeed('kelp-coast'), zoneSeed('kelp-coast'), 'a zone seed is repeatable');
  ok(zoneSeed('kelp-coast') !== zoneSeed('wreck-reef'), 'zones get different seeds');
  assert.throws(() => createZoneFloor({ id: 'x', trail: [{ x: 0, z: 0, depth: 5, width: 12 }] }), /at least three/); checks++;
}

// ---- crops: where the trail asks, never on the drivable width ------------------
{
  const seed = zoneSeed(zone.id);
  const kelp = shape.kelpPlacements(seed, 1200), again = shape.kelpPlacements(seed, 1200);
  eq(hash(kelp), hash(again), 'kelp placement is repeatable');
  ok(kelp.length > 600, `the forest fills (${kelp.length} stems)`);
  let onTrail = 0, outsideForest = 0;
  for (const s of kelp) {
    const at = shape.sample(s.x, s.z);
    if (Math.abs(at.lateral) < at.width * 0.5 + 2) onTrail++;
    if (at.kelp < 0.05) outsideForest++;
  }
  eq(onTrail, 0, 'no kelp on the drivable width');
  eq(outsideForest, 0, 'kelp only where the trail asks for it');
  const rocks = shape.rockPlacements(seed, 300);
  eq(rocks.filter(r => { const at = shape.sample(r.x, r.z); return Math.abs(at.lateral) < at.width * 0.5 + 2; }).length, 0, 'no rocks on the drivable width');
  const grass = shape.seagrassPlacements(seed, 4000);
  ok(grass.length > 1500, `seagrass meadows grow (${grass.length} tufts)`);
  ok(grass.every(t => { const at = shape.sample(t.x, t.z); return at.grass > 0 && -t.y < 15.5; }), 'seagrass only in shallow water where asked');
  eq(shape.kelpPlacements(seed, 1e9).length <= ZONE_CAPS.kelpStems, true, 'kelp is capped');
  eq(shape.seagrassPlacements(seed, 1e9).length <= ZONE_CAPS.seagrassTufts, true, 'seagrass is capped');
  ok(shape.coverLength('kelp') > 300 && shape.coverLength('kelp') < shape.length, 'kelp cover length is measured');
  ok(shape.forestShade(kelp[0].x, kelp[0].z) > 0, 'inside the forest the water takes the kelp cast');
  // Placements feed the existing builders.
  const uniforms = createWaterUniforms();
  eq(createSeagrass(uniforms, { placements: grass }).count, grass.length, 'seagrass builder takes zone placements');
  eq(createRocks(uniforms, { placements: rocks, detail: 1 }).count, rocks.length, 'rock builder takes zone placements');
  eq(createPebbles(uniforms, { placements: shape.pebblePlacements(seed, 500) }).count, shape.pebblePlacements(seed, 500).length, 'pebble builder takes zone placements');
}

// ---- floor tiles: only near the trail, only built near the camera ------------
{
  const uniforms = createWaterUniforms();
  const tiles = createFloorTiles(uniforms, shape, { cell: 2 });
  const area = (shape.bounds.maxX - shape.bounds.minX) * (shape.bounds.maxZ - shape.bounds.minZ) / (48 * 48);
  ok(tiles.tileCount < area * 0.8, `tiles only near the trail (${tiles.tileCount} of ${Math.round(area)})`);
  const start = shape.frameAt(0);
  tiles.prime(start);
  const primed = tiles.builtCount;
  ok(primed > 4 && primed < 70, `priming builds the ground around the start (${primed} tiles)`);
  // A tile's heights are the ground's heights.
  const mesh = tiles.group.children[0], pos = mesh.geometry.attributes.position;
  let worst = 0;
  for (let i = 0; i < pos.count; i += 97) worst = Math.max(worst, Math.abs(pos.getY(i) - shape.floorHeight(pos.getX(i), pos.getZ(i))));
  ok(worst < 1e-4, 'tile heights are the ground heights');
  // Driving away builds two tiles a frame and hides the ones behind.
  const camera = new THREE.PerspectiveCamera();
  const far = shape.frameAt(shape.length / 2);
  camera.position.set(far.x, -8, far.z);
  tiles.update(camera);
  eq(tiles.builtCount, primed + 2, 'at most two new tiles per frame');
  ok(tiles.group.children.slice(0, primed).every(m => !m.visible), 'tiles far behind are hidden');
  tiles.dispose();
  eq(tiles.group.children.length, 0, 'dispose removes every tile');
}

// ---- the waterline -----------------------------------------------------
{
  const camera = new THREE.PerspectiveCamera(60, 16 / 9, 0.15, 500);
  const shares = [];
  for (const y of [0.6, 0.05, 0.0, -0.05, -0.6]) { camera.position.set(0, y, 0); camera.lookAt(0, y, -10); shares.push(waterlineShare(camera)); }
  eq(shares[0], 0, 'above the water nothing is under');
  eq(shares[4], 1, 'below the water everything is under');
  ok(shares[1] < shares[2] && shares[2] < shares[3], `the waterline slides up as the view sinks (${shares.map(s => s.toFixed(2)).join(', ')})`);
  const line = createWaterline();
  camera.position.set(0, 0.5, 0); camera.lookAt(0, 0.5, -10);
  line.update(camera, 0);
  eq(line.bubbleCount, 0, 'no bubbles above water');
  camera.position.set(0, -0.5, 0); camera.lookAt(0, -0.5, -10);
  line.update(camera, 0.05);
  line.update(camera, 0.4);
  ok(line.bubbleCount > 20 && line.bubbleCount <= BUBBLE_CAP, `going under sets off bubbles (${line.bubbleCount})`);
  for (let t = 0.5; t < 3; t += 0.1) line.update(camera, t);
  eq(line.bubbleCount, 0, 'bubbles rise and are gone in under two seconds');
  ok(!line.active, 'nothing to draw once fully under and the bubbles are gone');
  line.dispose();
}

console.log(`The Deep water: ${checks} checks passed (zone ${shape.length.toFixed(0)} m, span ${ZONE_SPAN} m).`);
