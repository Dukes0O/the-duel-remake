// The neighbours' outposts drawn in the Scablands during a town drive (TOWN-OUTPOST-SCENE, switch `wasteland-town`): Dot's Diner, Miss
// Quill's school, Old Tam's hut, Deck Town and the Rail Halt, each from public/assets/models/wasteland/town/outposts.glb, with its people
// standing about, Bo going round the school, Tuesday the dog on the platform, Tam's goats, and the fence protection builds.
//
// Drawing only. Where each thing stands, and its solids, come from the drive's layout (src/town/town-outpost-world.js), which the job
// reads too; nothing here changes the race state. People and animals move only in the picture: they step aside when a car comes close,
// and they are never solid (src/world/scablands-solids.js says why people are not).
import * as THREE from 'three';
import {clone as cloneSkeleton} from 'three/addons/utils/SkeletonUtils.js';
import {createStoryPeopleView} from '../../world/story-people-view.js';
import {advanceStoryPeople, createStoryPeople, setStoryPersonAction} from '../../world/jobs/story-people.js';
import {scablandsSurfaceHeightAt} from '../../world/scablands-ground.js';
import {WILDLIFE_MODELS, WILDLIFE_MODEL_DIR} from '../../wildlife-models.js';
import {makeRng} from '../../rng.js';
import {OUTPOST_ANIMAL_SPECIES, OUTPOST_DRAW_RANGE, OUTPOST_FENCE, OUTPOST_MODEL, OUTPOST_WORLD_BY_ID} from '../content/outposts-world.js';
import {thingBase, thingSeed} from '../town-world-things.js';
import {createTownModelKit} from './town-world-models.js';

// A person steps aside when a car is this close to them (metres), and goes back once it is this far away.
export const OUTPOST_STEP_ASIDE = Object.freeze({near: 9, clear: 22});
// Animals are drawn and moved only this near the car.
const ANIMAL_RANGE = 120;

// The species an animal is drawn as: the first of its kind's species that has a model (src/wildlife-models.js), or null.
export function outpostAnimalSpecies(kind, models = WILDLIFE_MODELS) {
  return (OUTPOST_ANIMAL_SPECIES[kind] ?? []).find(species => Object.hasOwn(models, species)) ?? null;
}

// What each person is doing, in the picture only. `person` is a story-cast record; `plan` is the outpost's placed person.
function personBrain(plan, person) {
  return {plan, person, home: plan.home, aside: plan.aside, wander: plan.wander, next: 1, wait: 0, away: false};
}

function thinkPerson(brain, viewer, dt) {
  const {person, plan} = brain, at = person.position;
  const near = viewer ? Math.hypot(viewer.x - at.x, viewer.z - at.z) : Infinity;
  const homeNear = viewer ? Math.hypot(viewer.x - brain.home.x, viewer.z - brain.home.z) : Infinity;
  // A car close by: walk to the aside spot, whatever else was going on.
  if (brain.aside && !brain.away && near < OUTPOST_STEP_ASIDE.near) {
    brain.away = true;
    setStoryPersonAction(person, 'walk', [brain.aside]);
    return;
  }
  if (brain.away) {
    if (person.action === 'stand' && homeNear > OUTPOST_STEP_ASIDE.clear) {
      brain.away = false;
      setStoryPersonAction(person, 'walk', [brain.wander ? brain.wander[brain.next % brain.wander.length] : brain.home]);
    }
    return;
  }
  if (person.action !== 'stand') return;
  if (brain.wander) {
    brain.wait -= dt;
    if (brain.wait > 0) return;
    brain.wait = 2 + (brain.next % 3) * 1.5;
    setStoryPersonAction(person, 'walk', [brain.wander[brain.next % brain.wander.length]]);
    brain.next++;
  } else if (Math.hypot(at.x - brain.home.x, at.z - brain.home.z) < .05 && Math.abs(person.yaw - plan.yaw) > 1e-3) {
    person.yaw = plan.yaw;
  }
}

// One animal in the picture: it goes between its spots at its pace, waits, and goes on.
function createAnimal(plan, entry, asset, rng) {
  const root = cloneSkeleton(asset.scene);
  root.name = `${plan.who}: ${plan.id}`;
  root.scale.setScalar(entry.scale ?? 1);
  root.traverse(node => { if (node.isMesh) { node.castShadow = true; node.receiveShadow = true; } });
  const mixer = new THREE.AnimationMixer(root), clips = asset.animations ?? [];
  const idleClip = THREE.AnimationClip.findByName(clips, entry.idle), moveClip = THREE.AnimationClip.findByName(clips, entry.move);
  const idle = idleClip ? mixer.clipAction(idleClip).play() : null, move = moveClip ? mixer.clipAction(moveClip).play() : null;
  if (idle) idle.time = rng.float() * idleClip.duration;
  if (move) move.weight = 0;
  const start = plan.wander[0];
  return {plan, entry, root, mixer, idle, move, x: start.x, z: start.z, yaw: rng.float() * Math.PI * 2, next: 1, wait: rng.range(0, 4), rng};
}

function stepAnimal(animal, dt) {
  const {plan} = animal, goal = plan.wander[animal.next % plan.wander.length];
  let moving = false;
  if (animal.wait > 0) animal.wait -= dt;
  else {
    const dx = goal.x - animal.x, dz = goal.z - animal.z, length = Math.hypot(dx, dz), step = (plan.pace ?? 1) * dt;
    if (length <= step) {
      animal.x = goal.x; animal.z = goal.z; animal.next++;
      animal.wait = plan.kind === 'goat' ? animal.rng.range(3, 9) : animal.rng.range(1, 4);
    } else {
      animal.x += dx / length * step; animal.z += dz / length * step;
      // The models' noses are along +x (src/wildlife-models.js).
      animal.yaw = Math.atan2(-dz, dx);
      moving = true;
    }
  }
  if (animal.idle) animal.idle.weight = moving ? 0 : 1;
  if (animal.move) {
    animal.move.weight = moving ? 1 : 0;
    animal.move.timeScale = (animal.entry.run?.rate ?? 1) * Math.min(1, (plan.pace ?? 1) / 1.5);
  }
  animal.mixer.update(dt);
}

// `outposts` is the drive's layout (`layout.outposts.outposts`). `drawnHeightAt` is the ground as drawn (the Scablands scene's
// `drawnGroundHeightAt`): a pad's edge is buried in the ground it is drawn on. `wildlife` is the table of animal models.
export function createTownOutpostsScene({outposts = [], loadAsset, drawnHeightAt = null, heightAt = scablandsSurfaceHeightAt,
  wildlife = WILDLIFE_MODELS} = {}) {
  const group = new THREE.Group();
  group.name = 'Town outposts';
  group.userData.loadErrors = [];
  const kit = createTownModelKit(loadAsset);
  const drawnAt = (x, z) => drawnHeightAt?.(x, z) ?? heightAt(x, z);
  const sites = [];
  let disposed = false, time = null;
  for (const outpost of outposts) {
    const row = OUTPOST_WORLD_BY_ID.get(outpost.id);
    if (!row) continue;
    const site = new THREE.Group();
    site.name = `${outpost.name} (${outpost.id})`;
    // The model stands on the lowest drawn ground under it, less the sink, so its pad's edges are in the ground all round.
    site.position.set(outpost.x, thingBase(outpost, row.bounds, drawnAt).y, outpost.z);
    site.rotation.y = outpost.heading;
    site.userData.outpostId = outpost.id;
    group.add(site);
    const fence = new THREE.Group();
    fence.name = `${outpost.name}: the fence`;
    group.add(fence);
    // People from the story cast, one cast an outpost so that each may use any figure. Lifted people stand on the outpost's floor,
    // which is drawn where the site stands.
    const raise = site.position.y - outpost.base;
    const cast = createStoryPeople(outpost.people.map(person => ({id: person.figure,
      position: {...person.home, y: person.lift ? person.home.y + raise : person.home.y}, yaw: person.yaw, action: 'stand'})));
    const brains = outpost.people.map((plan, index) => personBrain(plan, cast[index]));
    const people = createStoryPeopleView(kit.load);
    people.group.name = `${outpost.name}: people`;
    group.add(people.group);
    sites.push({outpost, row, site, fence, cast, brains, people, worldJob: {storyPeople: cast}, animals: [], animalGroup: null});
  }
  const pieces = async site => {
    const model = await kit.part(OUTPOST_MODEL, site.row.node, {lift: site.row.lift});
    if (disposed) return;
    site.site.add(model);
    for (const piece of site.outpost.fence) {
      const post = await kit.part(OUTPOST_FENCE.model, OUTPOST_FENCE.node);
      if (disposed) return;
      const [a, b] = piece.ends, low = Math.min(drawnAt(a.x, a.z), drawnAt(b.x, b.z));
      post.position.set(piece.x, low - .05, piece.z);
      post.rotation.y = piece.heading;
      post.scale.x = piece.length / OUTPOST_FENCE.length;
      post.name = piece.id;
      site.fence.add(post);
    }
  };
  const animals = async site => {
    const kinds = new Map();
    for (const plan of site.outpost.animals) {
      const species = outpostAnimalSpecies(plan.kind, wildlife);
      if (!species) continue;
      if (!kinds.has(species)) kinds.set(species, kit.load(WILDLIFE_MODEL_DIR + wildlife[species].file));
      const asset = await kinds.get(species);
      if (disposed) return;
      site.animalGroup ??= Object.assign(new THREE.Group(), {name: `${site.outpost.name}: animals`});
      if (!site.animalGroup.parent) group.add(site.animalGroup);
      const animal = createAnimal(plan, wildlife[species], asset, makeRng(thingSeed(site.outpost.x * 1000 + site.outpost.z, plan.id)));
      animal.species = species;
      site.animals.push(animal);
      site.animalGroup.add(animal.root);
    }
  };
  const ready = Promise.all(sites.map(site => Promise.all([
    pieces(site).catch(error => group.userData.loadErrors.push(`${site.outpost.id}: ${error.message || error}`)),
    animals(site).catch(error => group.userData.loadErrors.push(`${site.outpost.id} animals: ${error.message || error}`)),
  ]))).then(() => !disposed);
  group.userData.ready = ready;
  group.userData.sites = sites;

  // `viewer` is where the car is; `seconds` the presentation clock; `drawnShift` the Scablands scene's feet-on-the-drawn-ground shift.
  function update(viewer, seconds, drawnShift) {
    if (disposed) return;
    const dt = time === null ? 1 / 60 : Math.max(0, Math.min(.2, seconds - time));
    time = seconds;
    for (const site of sites) {
      const far = viewer ? Math.hypot(viewer.x - site.outpost.x, viewer.z - site.outpost.z) : 0;
      const shown = far < OUTPOST_DRAW_RANGE;
      site.site.visible = site.fence.visible = shown;
      if (!shown) { site.people.group.visible = false; if (site.animalGroup) site.animalGroup.visible = false; continue; }
      for (const brain of site.brains) thinkPerson(brain, viewer, dt);
      advanceStoryPeople(site.cast, dt, (x, z) => heightAt(x, z));
      site.people.update(site.worldJob, viewer ?? site.outpost, seconds, drawnShift);
      const animalsShown = far < ANIMAL_RANGE;
      if (site.animalGroup) site.animalGroup.visible = animalsShown;
      if (!animalsShown) continue;
      const floor = site.site.position.y;
      for (const animal of site.animals) {
        stepAnimal(animal, dt);
        animal.root.position.set(animal.x, animal.plan.lift ? floor + animal.plan.lift : drawnAt(animal.x, animal.z), animal.z);
        animal.root.rotation.y = animal.yaw;
      }
    }
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    for (const site of sites) {
      site.people.dispose();
      for (const animal of site.animals) {
        animal.mixer.stopAllAction();
        animal.root.traverse(node => { if (node.isSkinnedMesh) node.skeleton.dispose(); });
      }
    }
    kit.dispose();
    group.removeFromParent();
    group.clear();
  }
  return {group, ready, update, dispose};
}
