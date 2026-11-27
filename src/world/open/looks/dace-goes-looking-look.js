// Dace Goes Looking, as it is drawn in the open land (OPEN-LOOK-DACE, round 1). The rules say where each thing stands and when
// it shows; this file only draws. Moss's pickup and its key are in dace-pickup-look.js; the Walker stones, the tracks, the Deep
// Sign, the Hangar and the Crow's Step are in dace-sites-look.js; the kit they share is dace-look-kit.js.
//
// `createDaceLook(group, positionAt)` is what the open land's sign view calls. `buildDaceStand(name, options)` stands one of the
// things for the QA page's look stand (tools/open-look-stand.js), where no storyline is running.
import * as THREE from 'three';
import {scablandsSurfaceHeightAt} from '../../scablands-ground.js';
import {distance, sitePosition} from '../site-rule.js';
import {DACE_ID, DACE_PLACES as places, daceMarked} from '../content/dace-goes-looking-places.js';
import {KEY_HEIGHT, buildMossPickup, buildPickupKey} from './dace-pickup-look.js';
import {buildCrowsStep, buildDeepSign, buildHangar, buildPickupTracks, buildWalkerStones} from './dace-sites-look.js';

// What each thing may cost in the picture: its draws and its triangles.
export const DACE_LOOK_BUDGET = Object.freeze({
  pickup: Object.freeze({draws: 14, triangles: 16000}), key: Object.freeze({draws: 3, triangles: 300}),
  stones: Object.freeze({draws: 2, triangles: 2500}), tracks: Object.freeze({draws: 1, triangles: 8000}),
  'deep-sign': Object.freeze({draws: 8, triangles: 12000}), hangar: Object.freeze({draws: 5, triangles: 40000}),
  'crows-step': Object.freeze({draws: 6, triangles: 9000}),
});
export const DACE_SITES = Object.freeze({'deep-sign': buildDeepSign, hangar: buildHangar, 'crows-step': buildCrowsStep});
const SITE_NAMES = Object.freeze({'deep-sign': 'The Deep Sign', hangar: 'The Hangar', 'crows-step': "The Crow's Step"});

// How far the ground at a point near `at` stands above the ground at `at`. `turn` is the heading of the thing's own z.
function groundRound(at, turn = 0) {
  const cos = Math.cos(turn), sin = Math.sin(turn), base = scablandsSurfaceHeightAt(at.x, at.z);
  return (x, z) => scablandsSurfaceHeightAt(at.x + x * cos + z * sin, at.z - x * sin + z * cos) - base;
}
// The way he drove from where his tracks are found: on towards the hill.
const TRACKS_HEADING = Math.atan2(places.hill.x - places['his-tracks'].x, places.hill.z - places['his-tracks'].z);

export function createDaceLook(group, positionAt) {
  const root = new THREE.Group();
  root.name = 'Dace goes looking';
  group.add(root);

  const truck = buildMossPickup();
  const {cover, folded, blanket} = truck.userData;
  const key = buildPickupKey();
  root.add(truck, key);
  // The stones and the tracks lie on ground that is known only when they are first shown, so they are drawn then.
  let stones = null, tracks = null;
  const sites = Object.keys(DACE_SITES).map(id => {
    const mesh = new THREE.Group();
    mesh.name = SITE_NAMES[id];
    mesh.visible = false;
    root.add(mesh);
    return {id, mesh, built: null};
  });
  let departureAt = null, lit = null;

  return {
    update(open, sign, here, drawnShift) {
      const enabled = open?.parts.threads?.places.checkpointsEnabled;
      const world = open?.world, record = enabled && world.open.threads[DACE_ID];
      root.visible = !!enabled;
      if (!enabled) return;
      const seconds = open.seconds ?? 0;
      for (const site of sites) {
        const {id, mesh} = site, at = sitePosition(id, world.open.landSeed);
        mesh.visible = (record?.cast.site === id && !['sign', 'asking'].includes(record.beat) || world.open.found.includes(id)) &&
          distance(here, at) < 350;
        if (!mesh.visible) continue;
        if (!site.built || site.built.userData.at !== at.x + ':' + at.z) {
          site.built?.userData.dispose();
          site.built?.removeFromParent();
          site.built = DACE_SITES[id]({heightAt: groundRound(at)});
          site.built.name = SITE_NAMES[id] + ', drawn';
          site.built.userData.at = at.x + ':' + at.z;
          mesh.add(site.built);
        }
        positionAt(mesh, at, drawnShift);
        site.built.userData.update(seconds);
      }
      if (!record) {
        departureAt = null;
        for (const item of [truck, key, stones, tracks]) if (item) item.visible = false;
        return;
      }
      const {beat, end} = record;
      const active = open.parts.missions?.active;
      const staged = open.parts.threads?.dace;
      const taken = daceMarked(world, 'pickup-taken');
      const left = daceMarked(world, 'pickup-left-out');
      const reported = world.ledger.marks.includes(DACE_ID + '/later/moss-fetches-the-pickup');
      const fetch = active?.id === DACE_ID + '/fetch' && staged?.rescue;
      const departure = !end && beat === 'away' && open.events.findLast(event => event.cue === 'open.pickup.started');
      if (departure && departureAt?.seq !== departure.seq) departureAt = {seq: departure.seq, seconds: open.seconds};
      if (beat !== 'away') departureAt = null;
      const age = departureAt ? open.seconds - departureAt.seconds : Infinity;
      const leaving = departure && age < 4;
      const roadside = (fetch && ['hill', 'stones', 'the-place'].includes(fetch.reason) || left && !reported) && staged?.rescue?.truck;
      const yard = end ? !taken && (!left || reported) : ['sign', 'asking', 'ready', 'radio-check', 'telling',
        'leaving', 'key', 'night-after', 'key-was-taken', 'he-stayed', 'together'].includes(beat);
      const at = taken ? places.den : roadside || (leaving ? places.start : yard ? places.pickup : null);
      truck.visible = distance(here, at) <= 500;
      if (truck.visible) {
        // As it leaves it keeps to the ground it drives over.
        positionAt(truck, leaving ? {x: at.x, z: at.z + age * 8} : at, drawnShift);
        const uncovered = !!sign || !end && ['asking', 'ready', 'radio-check', 'telling', 'leaving', 'together'].includes(beat);
        cover.visible = yard && !uncovered && (!end || end === 'never-asked' || end === 'stayed');
        folded.visible = yard && uncovered;
        truck.userData.setBonnet(!!roadside || beat === 'ready');
        truck.userData.setFlat(!daceMarked(world, 'spare-mended') && (yard || staged?.rescue?.reason === 'stones'));
        blanket.visible = !!roadside && (!fetch?.walking || daceMarked(world, 'told-stay'));
        // The lamps are lit at dusk and in the dark while Dace is with the pickup: as he drives off, and while he waits with it
        // by the road, so that a player can find it there. Their light is laid on the ground once for each place the truck is.
        const lamps = ['dusk', 'dark'].includes(open.partOfDay) && (!!leaving || blanket.visible);
        truck.userData.setLamps(lamps);
        const {x, y, z} = truck.position, place = x + ':' + z;
        if (!lamps) lit = truck.userData.groundAt = null;
        else if (lit !== place) {
          lit = place;
          truck.userData.groundAt = (dx, dz) => scablandsSurfaceHeightAt(x + dx, z + dz) + (drawnShift?.(x + dx, z + dz) ?? 0) - y;
        }
        truck.userData.update(seconds);
      }
      key.visible = ['asking', 'key', 'night-after'].includes(beat) && !daceMarked(world, 'key-taken') &&
        !daceMarked(world, 'took-it-in-the-night') && distance(here, places.key) < 24;
      if (key.visible) {
        positionAt(key, places.key, drawnShift);
        key.position.y += KEY_HEIGHT;
        key.userData.update(seconds);
      }
      const stonesShown = !!fetch && (fetch.reason === 'rocks' || fetch.walking) && distance(here, places.walking) < 85;
      const tracksShown = !!fetch && distance(here, places['his-tracks']) < 85;
      if (stonesShown && !stones) root.add(stones = buildWalkerStones({heightAt: groundRound(places.walking)}));
      if (tracksShown && !tracks) {
        root.add(tracks = buildPickupTracks({heightAt: groundRound(places['his-tracks'], TRACKS_HEADING)}));
        tracks.rotation.y = TRACKS_HEADING;
      }
      if (stones) stones.visible = stonesShown;
      if (tracks) tracks.visible = tracksShown;
      if (stonesShown) { positionAt(stones, places.walking, drawnShift); stones.userData.update(seconds); }
      if (tracksShown) { positionAt(tracks, places['his-tracks'], drawnShift); tracks.userData.update(seconds); }
    },
    dispose() {
      for (const thing of [truck, key, stones, tracks, ...sites.map(site => site.built)]) thing?.userData.dispose();
      root.removeFromParent();
    },
  };
}

// ---- For the look stand ---------------------------------------------------------------------------------------------------
// Where each stood thing is, in the land's own metres, and how wide a piece of land it takes. `at(landSeed)`.
export const DACE_STAND = Object.freeze({
  'dace-forge': {at: () => places.pickup, radius: 12, stages: ['ready', 'covered', 'mended']},
  'dace-gate': {at: () => places['gate-at-dusk'], radius: 12, stages: ['leaving']},
  'dace-roadside': {at: () => places.hill, radius: 12, stages: ['stopped', 'waiting']},
  'dace-stones': {at: () => places.walking, radius: 12, stages: ['left']},
  'dace-tracks': {at: () => places['his-tracks'], radius: 30, stages: ['left']},
  'deep-sign': {at: seed => sitePosition('deep-sign', seed), radius: 12, stages: ['found']},
  hangar: {at: seed => sitePosition('hangar', seed), radius: 34, stages: ['found']},
  'crows-step': {at: seed => sitePosition('crows-step', seed), radius: 14, stages: ['found']},
});

// One thing stood for a picture. `heightAt(x, z)` is the ground's own height at a point measured from the thing's spot.
export function buildDaceStand(name, {stage, heightAt = () => 0} = {}) {
  const row = DACE_STAND[name];
  if (!row) throw new RangeError(`Dace Goes Looking has nothing called ${JSON.stringify(name)} to stand.`);
  stage = row.stages.includes(stage) ? stage : row.stages[0];
  const base = heightAt(0, 0), round = (x, z) => heightAt(x, z) - base, group = new THREE.Group(), things = [];
  group.name = 'Dace look stand: ' + name;
  const add = (thing, x = 0, z = 0, lift = 0) => { thing.position.set(x, heightAt(x, z) + lift, z); group.add(thing); things.push(thing); return thing; };
  if (name === 'dace-forge' || name === 'dace-gate' || name === 'dace-roadside') {
    const truck = add(buildMossPickup()), {cover, folded, blanket} = truck.userData;
    cover.visible = stage === 'covered';
    folded.visible = stage === 'ready' || stage === 'mended';
    blanket.visible = stage === 'stopped' || stage === 'waiting';
    truck.userData.setBonnet(stage === 'ready' || stage === 'stopped' || stage === 'waiting');
    truck.userData.setFlat(stage === 'ready' || stage === 'covered');
    truck.userData.setLamps(stage === 'leaving' || stage === 'waiting');
    truck.userData.groundAt = round;
    if (name === 'dace-forge') add(buildPickupKey(), places.key.x - places.pickup.x, places.key.z - places.pickup.z, KEY_HEIGHT);
  } else if (name === 'dace-stones') add(buildWalkerStones({heightAt: round}));
  else if (name === 'dace-tracks') {
    const cos = Math.cos(TRACKS_HEADING), sin = Math.sin(TRACKS_HEADING);
    add(buildPickupTracks({heightAt: (x, z) => round(x * cos + z * sin, -x * sin + z * cos)})).rotation.y = TRACKS_HEADING;
  } else add(DACE_SITES[name]({heightAt: round}));
  const draws = things.flatMap(thing => thing.userData.draws), triangles = things.reduce((sum, thing) => sum + thing.userData.triangles, 0);
  group.userData = {stage, draws, triangles, lights: [], things,
    update(seconds) { for (const thing of things) thing.userData.update(seconds); },
    dispose() { for (const thing of things) thing.userData.dispose(); }};
  return group;
}
