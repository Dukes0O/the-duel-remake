// WILD-HIT look check (docs/HELI_WILDLIFE.md section 3.5, switch wildlife-hits): a car that drives onto an animal
// beside the road knocks it down into a small heap on its side with a dark red stain under it, and the monster
// truck flattens it. The race's own loop is stopped and the car is put where the rules planned the animal (fixed
// play day), so the picture is the same on every run. Memory-only saves, no frame timing. Run:
//   node tools/browser-harness.mjs scenario wildlife-hits
import {APPROVED_MODEL_IDS} from '../../src/wildlife-models.js';
import {placeWildlife} from '../../src/wildlife.js';
import {referenceLap} from '../../src/reference-laps.js';
import {Course} from '../../src/course.js';
import {COURSE} from '../../src/config.js';

const SIZE = {width: 1280, height: 720, deviceScaleFactor: 1, mobile: false};
const DAY = 20776;   // the same fixed play day as tools/scenarios/wildlife-view.mjs
const MENU_READY = `window.__qaApp?.visualReady && !!window.__render && document.querySelector('#view3d')?.dataset.vehicleAsset==='ready'`;
const frames = (count, wait = 30) => `(async () => { for (let i = 0; i < ${count}; i++) { window.__render.renderFrame(); await new Promise(r => setTimeout(r, ${wait})); } })()`;
const STATE = `(() => {
  const group = window.__render.scene.getObjectByName('Wildlife'), down = [], blood = [];
  group?.traverse(node => {
    if (node.name === 'Wildlife blood' && node.visible) blood.push({x: node.position.x, y: node.position.y, z: node.position.z, opacity: node.material.opacity});
    else if (node.parent?.parent === group && node.visible && Math.abs(node.rotation.x - Math.PI / 2) < 1e-6)
      down.push({x: node.position.x, y: node.position.y, z: node.position.z, squash: node.scale.z / node.scale.x});
  });
  return {down, blood, status: document.querySelector('#view3d').dataset.wildlife ?? ''};
})()`;

// The first animal of the biggest herd of race 1 at Tremblant Woods on DAY.
function plannedAnimal() {
  const definition = COURSE.find(row => row.id === 'tremblant-woods'), course = new Course(definition, definition.layoutSeed ?? 1989);
  const placed = placeWildlife({courseId: 'tremblant-woods', playDay: DAY, raceNumber: 1, course, approvedModels: APPROVED_MODEL_IDS,
    referenceLap: referenceLap('tremblant-woods', 'fixed') ?? referenceLap('tremblant-woods', 'route_a')});
  const spot = [...placed.spots].sort((p, q) => q.animals.length - p.animals.length)[0];
  const animal = spot.animals[0], near = course.nearest(animal.x, animal.z);
  return {x: animal.x, z: animal.z, s: near.s, lateral: near.lateral, species: animal.species};
}

export async function run(context) {
  await context.command('Emulation.setDeviceMetricsOverride', SIZE);
  const animal = plannedAnimal();
  const results = {};
  for (const [label, car] of [['car', 'falcone_f42'], ['monster', 'titan_monster']]) {
    await context.navigate('/tools/menu-check.html?flags=wildlife,wildlife-hits');
    await context.waitFor(MENU_READY, 'the menu with animals that can be hit', 90_000);
    await context.evaluate(`globalThis.__qaWildlifeDay = ${DAY}`);
    await startRace(context, car);
    await context.waitFor(`/animals/.test(document.querySelector('#view3d').dataset.wildlife ?? '')`, 'animals planned', 30_000);
    // Near enough for the models to load, then onto the animal itself.
    await context.evaluate(`(() => { const st = window.__qaApp.duel.state; st.s = ${animal.s} - 140; st.lateral = 0; st.speedMph = 0; })()`);
    await context.evaluate(frames(40));
    await context.evaluate(`(() => { const st = window.__qaApp.duel.state; st.s = ${animal.s}; st.lateral = ${animal.lateral}; st.speedMph = 40; })()`);
    await context.evaluate(frames(10));
    const hit = await context.evaluate(STATE);
    if (!/hit/.test(hit.status) || !hit.down.length || hit.blood.length !== hit.down.length)
      throw Error(`The ${label} should knock the animal down, with a stain under it: ${JSON.stringify(hit)}`);
    // Drive on 25 m and look back at the heap from beside it.
    await context.evaluate(`(() => { const st = window.__qaApp.duel.state; st.s = ${animal.s} + 25; st.lateral = 0; st.speedMph = 0; })()`);
    await context.evaluate(frames(10));
    const heap = hit.down.reduce((best, row) => Math.hypot(row.x - animal.x, row.z - animal.z) < Math.hypot(best.x - animal.x, best.z - animal.z) ? row : best);
    await context.evaluate(`(() => { window.__qaApp.inspectionCamera = {position: [${heap.x} + 4.5, ${heap.y} + 2.2, ${heap.z} + 3], target: [${heap.x}, ${heap.y} + .2, ${heap.z}]}; })()`);
    await context.evaluate(frames(20));
    await context.screenshot(`${label}-heap`);
    await context.evaluate(`(() => { window.__qaApp.inspectionCamera = null; })()`);
    const after = await context.evaluate(STATE);
    if (after.down.length !== hit.down.length) throw Error(`The heap should stay for the race: ${JSON.stringify(after)}`);
    results[label] = {down: hit.down.length, squash: hit.down.map(row => Math.round(row.squash * 100) / 100), status: hit.status};
  }
  if (!(Math.max(...results.monster.squash) < Math.min(...results.car.squash))) throw Error(`The monster truck should flatten it: ${JSON.stringify(results)}`);
  console.log('HITS ' + JSON.stringify({day: DAY, animal, ...results}));
}

async function startRace(context, car) {
  await context.evaluate(`(() => {
    const a = window.__qaApp; a.audio.setMuted?.(true);
    if (!a.player) a.addPlayer('Wildlife QA');
    let index = -1; for (let i = 0; i < 80; i++) if (a.getMenuCourse(i)?.def.id === 'tremblant-woods') { index = i; break; }
    if (index < 0) throw Error('Tremblant Woods not in the menu');
    // A throwaway memory career that owns every course and the monster truck.
    a.profile = {...a.profile, unlockedCars: [...new Set([...(a.profile.unlockedCars || []), ${JSON.stringify(car)}])],
      courses: {version: 1, unlocked: Array.from({length: 80}, (_, i) => a.getMenuCourse(i)?.def.id).filter(Boolean)}}; a._saveProfile();
    if (!a.startCampaign({mode: 'timetrial', startStage: index, car: ${JSON.stringify(car)}, seed: 1989, difficulty: 'casual'})) throw Error('Race start rejected: ' + a.courseAccessMessage);
    document.head.insertAdjacentHTML('beforeend', '<style>details,#overlay{display:none!important}</style>');
    // Only this check moves its car; traffic and the rival stay where the start put them.
    a.stop();
  })()`);
  await context.waitFor(`window.__qaApp.duel.state.status !== 'menu' && window.__qaApp.visualReady`, 'the race is on', 90_000);
}
