// D0 DEEP-LOOK: the pure parts of the underwater look, with no graphics.
// Depth colour curve, fish parting rule, hard caps, trail shape, and the proof
// that only approved adapters reach the Deep code.
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  DAYLIGHT_FADE, SIGHT_FADE, causticStrengthAt, daylightAt, depthTable, exposureAt, lightShaftStrengthAt,
  sightRange, sunlightAt, waterColourAt,
} from '../src/deep/depth-colour.js';
import {
  FISH_HARD_CAP, VERTICAL_WEIGHT, cappedFishCount, partOffset, schoolCentre, schoolShape,
} from '../src/deep/fish-rules.js';
import {
  CAPS, FLOOR_HALF_WIDTH, KELP_TOP, floorHeight, forestShade, kelpDensity, kelpPlacements, pebblePlacements, rockPlacements, seagrassPlacements, trailDepth,
} from '../src/deep/sea-floor-shape.js';
import { LOOK_QUALITY, lookQuality } from '../src/deep/look-quality.js';
import { SHAFT_HARD_CAP } from '../src/deep/light-shafts.js';
import { SNOW_HARD_CAP } from '../src/deep/marine-snow.js';
import { kelpStemGeometry } from '../src/deep/kelp.js';
import { fishGeometry } from '../src/deep/fish-school.js';
import { FEATURE_STATES } from '../src/feature-flags.js';
import { makeRng } from '../src/rng.js';

let checks = 0;
const check = (condition, message) => { assert.ok(condition, message); checks++; };
const near = (a, b, tolerance, message) => check(Math.abs(a - b) <= tolerance, `${message} (${a} vs ${b})`);
const triangles = geometry => (geometry.index ? geometry.index.count : geometry.attributes.position.count) / 3;
const weighted = (p, a) => Math.hypot(p.x - a.x, (p.y - a.y) * VERTICAL_WEIGHT, p.z - a.z);

// ---- colour with depth -------------------------------------------------
{
  const depths = [0, 1, 2, 5, 10, 15, 20, 25, 30, 40];
  let previous = [1, 1, 1];
  for (const depth of depths) {
    const light = daylightAt(depth);
    check(light.every((v, i) => v <= previous[i] + 1e-12), `daylight only fades with depth (${depth} m)`);
    if (depth > 0) check(light[0] < light[1] && light[1] < light[2], `red fades first, then green, blue lasts (${depth} m)`);
    previous = light;
  }
  near(daylightAt(0)[0], 1, 1e-12, 'full daylight at the surface');
  const sun = sunlightAt(0);
  check(sun[0] >= sun[1] && sun[1] >= sun[2], 'sunlight is warm: red at least green at least blue');
  // Warm shallows, blue deep.
  const shallow = daylightAt(3), deep = waterColourAt(28);
  check(shallow[0] / shallow[2] > 0.7, 'the shallows keep much of their red');
  check(deep[2] > deep[1] * 1.8 && deep[1] > deep[0] * 5, 'at 28 m the water is blue: blue far above green, green far above red');
  check(daylightAt(20)[0] < 0.12 && daylightAt(30)[0] < 0.04, 'reds are nearly gone by 20 m');
  check(daylightAt(30)[2] > 0.25, 'blue still reaches 30 m');
  // Caustics: strong in the shallows, gone in the deep, never negative.
  check(causticStrengthAt(0) === 1, 'caustics are at full strength at the surface');
  check(causticStrengthAt(5) > 0.35 && causticStrengthAt(5) < 0.6, 'caustics are strong at 5 m');
  check(causticStrengthAt(28) < 0.01 && causticStrengthAt(30) === 0, 'caustics are gone in the deep');
  let last = Infinity;
  for (let d = 0; d <= 40; d += 0.5) { const c = causticStrengthAt(d); check(c >= 0 && c <= last + 1e-12, `caustic strength only falls (${d} m)`); last = c; }
  check(lightShaftStrengthAt(40) === 0 && lightShaftStrengthAt(2) > lightShaftStrengthAt(20), 'light shafts thin out with depth and end');
  check(exposureAt(0) === 1 && exposureAt(30) > exposureAt(10) && exposureAt(40) < 3, 'the eye adapts a little with depth, never wildly');
  // Distance: red goes first in sight too, and sight is limited but not a wall.
  const range = sightRange();
  check(range[0] < range[1] && range[1] < range[2], 'red is lost at the shortest sight distance');
  check(range[2] > 80 && range[2] < 140, 'blue is lost around the 90 to 140 m the plan calls for');
  check(SIGHT_FADE.every(v => v > 0) && DAYLIGHT_FADE.every(v => v > 0), 'every colour fades');
  // Bad input never leaks NaN.
  check(daylightAt(NaN).every(v => v === 1) && daylightAt(-5).every(v => v === 1), 'bad or negative depth reads as the surface');
  check(depthTable().length === 5 && depthTable().every(row => row.water.every(Number.isFinite)), 'the depth table is complete');
}

// ---- the fish parting rule ---------------------------------------------
{
  const car = { x: 3, y: -8, z: 40 }, inner = 2.7, outer = 6.5;
  const rng = makeRng(77);
  let moved = 0, left = 0;
  for (let i = 0; i < 4000; i++) {
    const p = { x: car.x + rng.range(-9, 9), y: car.y + rng.range(-5, 5), z: car.z + rng.range(-9, 9) };
    const before = weighted(p, car);
    const offset = partOffset(p, car, inner, outer);
    const q = { x: p.x + offset.x, y: p.y + offset.y, z: p.z + offset.z };
    const after = weighted(q, car);
    if (before >= outer) {
      check(offset.x === 0 && offset.y === 0 && offset.z === 0, 'fish outside the outer ring are left alone');
      left++;
    } else {
      check(after >= inner - 1e-9, 'no fish ends up inside the gap around the car');
      check(after >= before - 1e-9 && after <= outer + 1e-9, 'fish only move away, and never past the outer ring');
      moved++;
    }
  }
  check(moved > 500 && left > 500, 'the test covered fish inside and outside the ring');
  // Order is kept: a fish nearer the car stays nearer after parting (no jumping past another).
  let lastAfter = -1;
  for (let d = 0; d < outer; d += 0.05) {
    const p = { x: car.x + d, y: car.y, z: car.z };
    const offset = partOffset(p, car, inner, outer);
    const after = d + offset.x;
    check(after >= lastAfter - 1e-9, 'parting keeps fish in order along a line');
    lastAfter = after;
  }
  // Smooth at the edge: tiny step inside gives a tiny push.
  const edge = partOffset({ x: car.x + outer - 0.01, y: car.y, z: car.z }, car, inner, outer);
  check(Math.abs(edge.x) < 0.01, 'the push fades to nothing at the outer ring');
  // A fish exactly on the point is sent out sideways, not dropped.
  const on = partOffset({ ...car }, car, inner, outer, undefined, { x: 0, y: 0, z: 1 });
  near(Math.hypot(on.x, on.y, on.z), inner, 1e-9, 'a fish on the point is moved out to the gap edge');
  // Height counts for more than width, so fish may pass close over a low car.
  const over = partOffset({ x: car.x, y: car.y + 2, z: car.z }, car, inner, outer);
  check(over.y >= 0 && weighted({ x: car.x, y: car.y + 2 + over.y, z: car.z }, car) >= inner - 1e-9, 'a fish just over the roof is lifted only as far as it must be');
  // Reading only: the car point is never changed.
  const keep = { ...car };
  partOffset({ x: 3.5, y: -7.5, z: 40.5 }, car, inner, outer);
  assert.deepEqual(car, keep); checks++;
  check(partOffset({ x: 0, y: 0, z: 0 }, car, 5, 5).x === 0, 'a ring with no width does nothing');
}

// ---- fish caps and the school's path -----------------------------------
{
  check(cappedFishCount(450) === 450 && cappedFishCount(99999) === FISH_HARD_CAP, 'fish count is capped at the hard cap');
  check(cappedFishCount(-3) === 0 && cappedFishCount(NaN) === 0 && cappedFishCount(12.9) === 12, 'bad fish counts are safe');
  check(cappedFishCount(500, 100) === 100 && cappedFishCount(5000, 99999) === FISH_HARD_CAP, 'a caller cannot raise the cap');
  const a = schoolShape(450, makeRng(5)), b = schoolShape(450, makeRng(5)), c = schoolShape(450, makeRng(6));
  check(a.count === 450 && a.offsets.length === 450 * 3 && a.traits.length === 450 * 4, 'a school has what each fish needs');
  assert.deepEqual([...a.offsets], [...b.offsets]); checks++;
  check([...a.offsets].some((v, i) => v !== c.offsets[i]), 'a different seed gives a different school');
  check(schoolShape(99999, makeRng(1)).count === FISH_HARD_CAP, 'a school cannot be bigger than the hard cap');
  let reach = 0;
  for (let i = 0; i < a.count; i++) reach = Math.max(reach, Math.hypot(a.offsets[i * 3] / 1.7, a.offsets[i * 3 + 1] / 1.4, a.offsets[i * 3 + 2] / 3.8));
  check(reach <= 1.0001, 'every fish sits inside the egg-shaped cloud');
  // The loop passes through its anchor twice a lap and keeps a steady turn.
  const anchor = { x: 12, y: -6, z: 80 }, lap = 60, out = {};
  const through = [0, lap / 2].map(t => schoolCentre(t, { anchor, lap, lift: 0 }, {}));
  for (const p of through) { near(p.x, anchor.x, 1e-9, 'the loop crosses its anchor (x)'); near(p.z, anchor.z, 1e-9, 'the loop crosses its anchor (z)'); }
  let speedMin = Infinity, speedMax = 0, previous = schoolCentre(0, { anchor, lap }, {});
  for (let t = 0.5; t <= lap; t += 0.5) {
    const p = schoolCentre(t, { anchor, lap }, out);
    const speed = Math.hypot(p.x - previous.x, p.z - previous.z) / 0.5;
    speedMin = Math.min(speedMin, speed); speedMax = Math.max(speedMax, speed);
    previous = { x: p.x, y: p.y, z: p.z };
  }
  check(speedMax < 4 && speedMax > 0.5 && speedMin >= 0, 'the school swims at a believable speed');
}

// ---- the trail and its caps --------------------------------------------
{
  near(trailDepth(0), 5, 0.2, 'the trail starts in 5 m of water');
  check(trailDepth(100) > 8 && trailDepth(100) < 16, 'the forest sits in about 10 to 15 m');
  near(trailDepth(300), 30, 1.5, 'the slope reaches about 30 m at 300 m');
  check(trailDepth(500) > trailDepth(300), 'the slope keeps falling past the end, so there is no visible edge');
  for (let z = 0; z <= 300; z += 5) check(floorHeight(0, z) < 0 && Number.isFinite(floorHeight(0, z)), `the floor is under water and finite at ${z} m`);
  check(floorHeight(FLOOR_HALF_WIDTH, 100) > floorHeight(0, 100) + 4, 'the sides rise into banks');
  const kelp = kelpPlacements(1989, 520), again = kelpPlacements(1989, 520);
  check(kelp.length > 300 && kelp.length <= 520, `the forest has stems (${kelp.length})`);
  assert.deepEqual(kelp, again); checks++;
  check(kelpPlacements(1989, 99999).length <= CAPS.kelpStems, 'kelp is capped');
  check(kelpPlacements(1990, 520).some((s, i) => s.x !== kelp[i]?.x), 'a different seed gives a different forest');
  check(kelp.every(s => -s.y >= 5 && -s.y <= 25), 'kelp grows only in 5 to 25 m of water');
  check(kelp.every(s => Math.abs(s.y + s.height + KELP_TOP) < 0.8 && s.height > 3), 'every stem reaches to just under the surface');
  check(kelp.every(s => s.z >= 40 && s.z <= 260), 'kelp stays in its forest');
  check(kelpDensity(0, 5) === 0 && kelpDensity(0, 295) === 0, 'no kelp in the shallows or the deep');
  check(seagrassPlacements(1989, 99999).length <= CAPS.seagrassTufts, 'seagrass is capped');
  check(seagrassPlacements(1989, 1700).every(t => -t.y < 16), 'seagrass stays in the shallows');
  check(rockPlacements(1989, 99999).length <= CAPS.rocks, 'rocks are capped');
  check(pebblePlacements(1989, 99999).length <= CAPS.pebbles && pebblePlacements(1989, NaN).length === 0, 'pebbles are capped and bad counts are safe');
  const pebbles = pebblePlacements(1989, 900);
  check(pebbles.length > 500 && pebbles.every(p => p.size >= 0.03 && p.size < 0.5), 'pebbles are small');
  assert.deepEqual(pebbles, pebblePlacements(1989, 900)); checks++;
  let shadeOk = true;
  for (let z = -20; z <= 320; z += 5) for (let x = -90; x <= 90; x += 10) { const v = forestShade(x, z); if (!(v >= 0 && v <= 1)) shadeOk = false; }
  check(shadeOk && forestShade(0, 5) === 0 && forestShade(0, 300) === 0 && forestShade(0, 140) > 0.9 && forestShade(80, 140) < 0.2, 'canopy shade is 0 in open water, near 1 mid-forest, and fades toward the banks');
  check(kelpPlacements(1989, -4).length === 0 && seagrassPlacements(1989, NaN).length === 0, 'bad counts give nothing, not a crash');
}

// ---- quality settings stay inside every cap ------------------------------
{
  for (const [name, q] of Object.entries(LOOK_QUALITY)) {
    check(q.kelpStems <= CAPS.kelpStems && q.seagrassTufts <= CAPS.seagrassTufts && q.rocks <= CAPS.rocks && q.pebbles <= CAPS.pebbles, `${name}: scenery within caps`);
    check(q.fish <= FISH_HARD_CAP && q.snowSpecks <= SNOW_HARD_CAP && q.lightShafts <= SHAFT_HARD_CAP, `${name}: fish, specks and shafts within caps`);
    check(q.shadowSize >= 1024 && q.pixelRatioMax >= 1, `${name}: sensible shadow size and pixel ratio`);
  }
  const high = LOOK_QUALITY.high, perf = LOOK_QUALITY.performance;
  check(high.pipeline === 'composite' && perf.pipeline === 'direct', 'High uses post-processing, Performance draws directly, as in the game');
  check(high.shadowSize === 2048 && perf.shadowSize === 1024, 'shadow sizes match the game');
  check(perf.kelpStems < high.kelpStems && perf.fish < high.fish && perf.snowSpecks < high.snowSpecks, 'Performance draws less than High');
  check(lookQuality('nonsense') === high, 'an unknown quality name gets High');
}

// ---- cheap meshes ------------------------------------------------------
{
  const stem = kelpStemGeometry(), light = kelpStemGeometry({ stipes: 2, nodes: 6, bladeSegments: 2 }), fish = fishGeometry();
  check(triangles(stem) > 500 && triangles(stem) < 4000, `a kelp clump is a couple of thousand triangles (${triangles(stem)})`);
  check(triangles(light) < triangles(stem), 'the light kelp is cheaper');
  check(triangles(fish) < 250, `a fish is under 250 triangles (${triangles(fish)})`);
  for (const geometry of [stem, fish]) {
    check([...geometry.attributes.position.array].every(Number.isFinite), 'no bad numbers in a mesh');
    check([...geometry.attributes.normal.array].every(Number.isFinite), 'no bad normals in a mesh');
  }
  // Same recipe, same mesh.
  assert.deepEqual([...kelpStemGeometry().attributes.position.array], [...stem.attributes.position.array]); checks++;
}

// ---- only approved adapters reach it -----------------------
{
  check(FEATURE_STATES['the-deep'] === 'on', 'the-deep is released (on in the game)');
  const root = fileURLToPath(new URL('../', import.meta.url));
  const walk = (dir, out = []) => {
    for (const name of readdirSync(dir)) {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) walk(path, out); else if (/\.(?:js|mjs|html)$/.test(name)) out.push(path);
    }
    return out;
  };
  // Director-granted contracts; every other Deep module/specifier stays isolated.
  const approvedImports = new Set([
    'src/deep/deep-ramp.js|../pacific-coast-layout.js',
    'tools/test-deep-zone.mjs|../src/deep/deep-ui.js',
    'tools/test-deep-zone.mjs|../src/deep/deep-zone.js',
    'tools/test-deep-zone.mjs|../src/deep/deep-journey.js',
    'src/screen-router.js|./deep/deep-ui.css',
    'src/screen-router.js|./deep/deep-ui.js',
    'src/render3d.js|./deep/underwater-scene.js',
    'src/render3d.js|./deep/waterline.js',
    'src/render3d.js|./deep/deep-ui.js',
    'src/app.js|./deep/deep-audio.js',
    'src/game.js|./deep/deep-journey.js',
    'src/course.js|./deep/deep-journey.js',
    'src/audio.js|./deep/deep-audio.js',
    'tools/test-deep-audio.mjs|../src/deep/deep-audio.js',
    'src/app.js|./deep/deep-discovery.js',
    'src/app.js|./deep/deep-hints.js',
    'src/progression.js|./deep/deep-discovery.js',
    'src/screen-garage.js|./deep/deep-hints.js',
    'tools/test-deep-save.mjs|../src/deep/deep-discovery.js',
    'tools/test-deep-save.mjs|../src/deep/deep-hints.js',
    'tools/test-deep-zone-format.mjs|../src/deep/deep-zone.js',
    'tools/test-deep-zone-format.mjs|../src/deep/zone-floor.js',
    'tools/test-deep-ramp.mjs|../src/deep/deep-ramp.js',
    'src/main.js|./deep/zones/kelp-coast.js',
    // DEEP-RADIO: Ana's phone lines join the sound bank; the phone chain is rendered and tested in Node.
    'src/sound-bank.js|./deep/deep-phone-lines.js',
    'tools/audio/build-deep-phone.mjs|../../src/deep/deep-phone-lines.js',
    'tools/audio/render-deep-phone.mjs|../../src/deep/deep-phone.js',
    'tools/test-deep-phone.mjs|../src/deep/deep-phone-lines.js',
    'tools/test-deep-phone.mjs|../src/deep/deep-phone.js',
    'tools/test-deep-kelp-coast.mjs|../src/deep/deep-ramp.js',
    'tools/test-deep-kelp-coast.mjs|../src/deep/deep-zone.js',
    'tools/test-deep-kelp-coast.mjs|../src/deep/zones/kelp-coast.js',
    'tools/test-deep-sirena.mjs|../src/deep/deep-ramp.js',
    'tools/test-deep-sirena.mjs|../src/deep/deep-zone.js',
    'tools/test-deep-sirena.mjs|../src/deep/zones/kelp-coast.js',
    'tools/test-deep-sirena.mjs|../src/deep/deep-discovery.js',
    'tools/test-deep-sirena.mjs|../src/deep/deep-sirena.js',
    'src/progression.js|./deep/sirena-car.js',
    'tools/test-sirena-car.mjs|../src/deep/sirena-car.js',
    'src/lab/restore.js|../deep/sirena-car.js',
    'tools/test-lab-restore.mjs|../src/deep/sirena-car.js',
    'tools/test-sirena-car.mjs|../src/deep/deep-sirena.js',
    // DEEP-LOG: the garage log page and pearl white (its named hooks), its test and its picture recipe.
    'src/screen-garage.js|./deep/deep-log.js',
    'src/paint-presets.js|./deep/deep-log.js',
    ...['deep-ramp', 'deep-zone', 'zones/kelp-coast', 'deep-phone-lines', 'deep-log'].map(name => `tools/test-deep-log.mjs|../src/deep/${name}.js`),
    'tools/scenarios/deep-log-pictures.mjs|../../src/deep/deep-log.js',
    // DEEP-SIRENA-VIEW: the one wiring card for the story (its named hooks) and its test.
    'src/game.js|./deep/deep-story.js',
    'src/app.js|./deep/deep-sirena.js',
    'src/app.js|./deep/deep-log.js',
    'src/render3d.js|./deep/sirena-view.js',
    'src/screen-router.js|./deep/sirena-view.js',
    'src/screen-router.js|./deep/sirena-ui.css',
    'src/screen-garage.js|./deep/sirena-car.js',
    ...['zones/kelp-coast', 'deep-sirena', 'deep-phone-lines', 'deep-story', 'sirena-view', 'deep-discovery']
      .map(name => `tools/test-deep-story.mjs|../src/deep/${name}.js`),
    // DEEP-LIFE: the sea life's checks run its rules and drawing code in Node on the real Kelp Coast.
    'tools/test-deep-life.mjs|../src/deep/deep-ramp.js',
    'tools/test-deep-life.mjs|../src/deep/deep-zone.js',
    'tools/test-deep-life.mjs|../src/deep/zones/kelp-coast.js',
    'tools/test-deep-life.mjs|../src/deep/zone-floor.js',
    'tools/test-deep-life.mjs|../src/deep/water-shader.js',
    'tools/test-deep-life.mjs|../src/deep/fish-rules.js',
    'tools/test-deep-life.mjs|../src/deep/fish-school.js',
    'tools/test-deep-life.mjs|../src/deep/sea-life-rules.js',
    'tools/test-deep-life.mjs|../src/deep/sea-life.js',
    // DEEP-PLAYTEST-1: read-only map test and the released dive-kit results notice.
    'tools/test-deep-map.mjs|../src/deep/deep-map.js',
    'tools/test-deep-map.mjs|../src/deep/zones/kelp-coast.js',
    'src/screen-results.js|./deep/deep-hints.js',
  ]);
  const importers = walk(join(root, 'src')).filter(path => !path.replaceAll('\\', '/').includes('/src/deep/'))
    .concat(walk(join(root, 'tools')).filter(path => !/deep-look|test-deep-look/.test(path)))
    .filter(path => {
      const importer = relative(root, path).replaceAll('\\', '/');
      // Exact photography helper source access; all other Deep paths remain guarded.
      const source = readFileSync(path, 'utf8')
        .replace(importer === 'tools/scenarios/deep-art.mjs'
          ? "source('src/deep/sea-floor-shape.js')" : '\0', '').replace(
        /(?:from\s+|import\(\s*)['"]([^'"]*\/deep\/[^'"]+)['"]/g,
        (statement, specifier) => approvedImports.has(importer + '|' + specifier) ? '' : statement,
      );
      return /from\s+['"][^'"]*\/deep\/|import\(\s*['"][^'"]*\/deep\/|src\/deep\//.test(source);
    });
  assert.deepEqual(importers, [], `no unapproved src/deep imports: ${importers.join(', ')}`); checks++;
  const flags = readFileSync(join(root, 'src/feature-flags.js'), 'utf8');
  check(/'the-deep':\s*'on'/.test(flags), 'the switch is declared in src/feature-flags.js');
}

console.log(`D0 DEEP-LOOK: ${checks} checks passed.`);
