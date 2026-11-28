// HOME-GROUND-4. A raid is outing state, never part of the saved home.
// Like town-rats, hold and fence, this rule takes play seconds and observed actors.
// The adapter supplies the existing Rat combat bodies; the renderer only reads these poses.
import {makeRng} from '../../rng.js';
import {sweepObstacle} from '../../collision.js';
import {stepMover, TRUCK_GRADE} from '../scablands-movers.js';
import {scablandsSurfaceHeightAt} from '../scablands-ground.js';
import {ratsGiveUpSeconds} from '../jobs/town-rats.js';
import {HOME_RAID as R, HOME_CUES, HOME_WORDS, HOME_CELLS, HOME_TOWER, HOME_LOOT} from './content/home-ground.js';
import {groundPoint, groundCentre, outsideBy, buildInLand, buildingDoor, pieceInLand, homeSolids} from './home-rule.js';

const gap = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const cue = name => ({type: 'homeCue', cue: name});
const at = row => row.position ?? row;
const tuning = difficulty => R[difficulty] ?? R.medium;

export function raidInterval(seed, number) {
  return makeRng((seed ^ 0x484f4d45 ^ Math.imul(number + 1, 2654435761)) >>> 0).range(R.earliest, R.latest);
}

export function openHomeSitting(home, seed) {
  const raids = home.raids;
  return {...home, raids: {...raids, sittings: raids.sittings + 1,
    nextDue: raids.nextDue ?? raids.played + raidInterval(seed, raids.won + raids.lost)}};
}

export function startHomeRaid(home, seed, test, difficulty = 'medium') {
  const rng = makeRng(seed ^ Math.imul(home.raids.won + home.raids.lost + home.raids.sittings + 1, 0x1b873593));
  const side = rng.int(0, 3), along = rng.int(3, HOME_CELLS - 4);
  const normal = [{x: 0, z: -1}, {x: 1, z: 0}, {x: 0, z: 1}, {x: -1, z: 0}][side];
  const entry = groundPoint(side === 1 ? HOME_CELLS : side === 3 ? 0 : along + .5,
    side === 0 ? 0 : side === 2 ? HOME_CELLS : along + .5);
  const centre = groundCentre(), tune = tuning(difficulty);
  const kinds = test ? ['bike'] : ['bike', 'bike', 'buggy'];
  const id = `home-raid/${home.raids.sittings}/${home.raids.won + home.raids.lost}/${test ? 'test' : 'real'}`;
  const riders = kinds.map((kind, index) => {
    const offset = test ? 0 : index === 0 ? -3.5 : index === 1 ? 3.5 : 0;
    const position = {x: entry.x + normal.x * R.startMetres + normal.z * offset,
      z: entry.z + normal.z * R.startMetres - normal.x * offset};
    const health = kind === 'bike' ? tune.bikeHealth : tune.buggyHealth;
    return {id: id + '/' + index, kind, position, yaw: Math.atan2(centre.x - position.x, centre.z - position.z),
      health, maxHealth: health, entered: false, retreat: false, fled: false, blocked: 0, travel: 0};
  });
  return {id, test, side, entry, normal, riders, seconds: 0, outcome: null, rattled: false};
}

// A swept, level-one fence contact. A slower buggy and every bike are stopped.
export function ramHomePanels(home, from, to, speedKmh, kind) {
  if (kind !== 'buggy' || !(speedKmh > R.ramKmh)) return {home, fallen: []};
  const fallen = home.pieces.filter(piece => {
    if (piece.kind !== 'panel' || piece.down) return false;
    const p = pieceInLand(piece);
    return !!sweepObstacle(from, to, {...p, halfX: p.length / 2, halfZ: .1},
      Math.atan2(to.x - from.x, to.z - from.z), {halfWidth: .85, halfLength: 1.35});
  });
  return {home: fallen.length ? {...home, pieces: home.pieces.map(piece => fallen.includes(piece) ? {...piece, down: true} : piece)} : home, fallen};
}

function targetOf(raid, rider, home) {
  const p = rider.position;
  if (rider.retreat) {
    // Leave through the approach gap. Running straight away from the coop can trap a bike against intact tin.
    const dx = p.x - raid.entry.x, dz = p.z - raid.entry.z;
    if (dx * raid.normal.x + dz * raid.normal.z < 0 && Math.abs(dx * raid.normal.z - dz * raid.normal.x) > .25)
      return {x: raid.entry.x - raid.normal.x * 2, z: raid.entry.z - raid.normal.z * 2};
    if (outsideBy(p.x, p.z) < 3.9) return {x: raid.entry.x + raid.normal.x * 4, z: raid.entry.z + raid.normal.z * 4};
    return {x: p.x + raid.normal.x * 100, z: p.z + raid.normal.z * 100};
  }
  if (raid.test) {
    // A square lap keeps the bike outside the fence, including at its corners.
    const corners = [[-4, -4], [HOME_CELLS + 4, -4], [HOME_CELLS + 4, HOME_CELLS + 4], [-4, HOME_CELLS + 4]];
    const [i, j] = corners[rider.corner ?? raid.side];
    return groundPoint(i, j);
  }
  if (!rider.entered) return {x: raid.entry.x - raid.normal.x * 4, z: raid.entry.z - raid.normal.z * 4};
  const coop = home.builds.find(row => row.kind === 'coop' && row.stage === 4);
  // Hens are at the coop's open front. The buggy stays inside the breach to cover the bikes.
  if (rider.kind === 'buggy') return {x: raid.entry.x - raid.normal.x * 6, z: raid.entry.z - raid.normal.z * 6};
  return coop ? buildingDoor(coop) : groundCentre();
}

function moveRider(raid, rider, home, dt, view) {
  if (rider.health <= 0 || rider.fled) return {home, rider, events: []};
  const target = targetOf(raid, rider, home), from = rider.position, far = gap(from, target);
  const speed = rider.kind === 'bike' ? R.bikeMps : R.buggyMps;
  const travel = Math.min(far, speed * dt);
  if (far < .1) {
    return {home, rider: raid.test ? {...rider, corner: ((rider.corner ?? raid.side) + 1) % 4} : rider, events: []};
  }
  const yaw = Math.atan2(target.x - from.x, target.z - from.z);
  const to = {x: from.x + Math.sin(yaw) * travel, z: from.z + Math.cos(yaw) * travel};
  const ram = !raid.test && !rider.retreat ? ramHomePanels(home, from, to, speed * 3.6, rider.kind) : {home, fallen: []};
  home = ram.home;
  const solids = homeSolids(home, {gateOpen: view.gateOpen, heightAt: scablandsSurfaceHeightAt});
  // Reuse the land mover, with this tick's fallen panels already removed from its grid.
  const sourceGrid = view.peopleGrid?.movers ?? view.peopleGrid;
  const grid = {near(ax, az, bx, bz, pad) {
    return [...(sourceGrid?.near(ax, az, bx, bz, pad) ?? []).filter(row => !String(row.id).startsWith('home/')),
      ...solids.map(row => ({...row, y: row.base}))];
  }};
  const radius = rider.kind === 'bike' ? .45 : .85;
  // A sweep prevents a long tick from skipping a fence; the ordinary mover handles grades and corners.
  const hit = solids.map(solid => sweepObstacle(from, to, solid, yaw, {halfWidth: radius, halfLength: radius}))
    .filter(Boolean).sort((a, b) => a.t - b.t)[0];
  const clipped = hit ? {x: from.x + (to.x - from.x) * Math.max(0, hit.t - .01),
    z: from.z + (to.z - from.z) * Math.max(0, hit.t - .01)} : to;
  const moved = stepMover(from, clipped, {radius, grade: TRUCK_GRADE, grid});
  const covered = gap(from, moved), blocked = covered < travel * .2 ? rider.blocked + dt : 0;
  const entered = rider.entered || outsideBy(moved.x, moved.z) === 0;
  const gaveUp = !entered && blocked >= ratsGiveUpSeconds({giveUpSeconds: tuning(view.difficulty).blockedSeconds,
    easyGiveUpSeconds: tuning(view.difficulty).blockedSeconds}, view.difficulty);
  return {home, rider: {...rider, position: {x: moved.x, z: moved.z}, yaw, entered, blocked,
    retreat: rider.retreat || gaveUp, travel: rider.travel + covered,
    fled: rider.retreat && outsideBy(moved.x, moved.z) >= R.fled},
  events: ram.fallen.length ? [cue(HOME_CUES.raidRam), ...ram.fallen.map(() => cue(HOME_CUES.fenceFall))] : []};
}

export function finishHomeRaid(home, raid, outcome, seed) {
  if (raid.outcome) return {home, raid, events: []};
  const eggs = outcome === 'lost' && !raid.test ? Math.floor(home.eggs * R.eggShare) : 0;
  const raids = {...home.raids};
  if (raid.test) raids.testDone = outcome !== 'left';
  else {
    if (outcome === 'won') raids.won++;
    if (outcome === 'lost') raids.lost++;
    raids.nextDue = raids.played + raidInterval(seed, raids.won + raids.lost);
  }
  const news = raid.test && outcome !== 'left' ? HOME_WORDS.raidTest : outcome === 'left' ? HOME_WORDS.raidLeft :
    outcome === 'won' ? HOME_WORDS.raidWon : eggs === 1 ? HOME_WORDS.raidLostOne : HOME_WORDS.raidLost.replace('{count}', eggs);
  let loot = home.loot;
  if (outcome === 'won' && !raid.test) {
    const piece = (kind, position, yaw) => ({kind, position: {x: position.x, z: position.z, yaw}, worth: HOME_LOOT[kind].worth});
    const wrecks = raid.riders.filter(row => row.health <= 0).map(row => piece(row.kind, row.position, row.yaw));
    const rng = makeRng(seed ^ Math.imul(raids.won, 0x4c4f4f54));
    const crates = Array.from({length: rng.int(1, 2)}, (_, index) => piece('crate',
      {x: raid.entry.x + raid.normal.x * 3 + raid.normal.z * (index * 2 - 1),
        z: raid.entry.z + raid.normal.z * 3 - raid.normal.x * (index * 2 - 1)}, rng.range(-Math.PI, Math.PI)));
    loot = [...(home.loot ?? []), ...wrecks, ...crates];
  }
  return {home: {...home, eggs: home.eggs - eggs, raids, loot}, raid: {...raid, outcome}, news,
    events: outcome === 'left' ? [] : [cue(outcome === 'lost' ? HOME_CUES.raidLost : HOME_CUES.raidWon)]};
}

// The call site increments played using dt only. Leaving, including a job's own leave request, wins over loss.
export function stepHomeRaid(home, raid, view, dt, seed) {
  if (!raid || raid.outcome) return {home, raid, events: []};
  const where = view.onFoot ? view.fighter?.position : view.carPosition;
  if (view.leaving || !where || outsideBy(where.x, where.z) > R.near) return finishHomeRaid(home, raid, 'left', seed);
  const seconds = Math.min(raid.test ? R.testSeconds : R.seconds, raid.seconds + Math.max(0, dt));
  const tune = tuning(view.difficulty);
  const riders = raid.riders.map(row => {
    const seen = (view.actors ?? []).find(actor => actor.id === row.id);
    const health = seen ? Math.min(row.health, seen.health) : row.health;
    const chased = raid.test && gap(where, row.position) <= R.chaseMetres;
    return {...row, health, retreat: row.retreat || chased || (raid.test && health < row.health) ||
      health <= row.maxHealth * tune.retreatHealth};
  });
  let next = {...raid, seconds, riders}, events = [];
  if (raid.test && !raid.rattled && seconds >= 5) {
    next.rattled = true; events.push(cue(HOME_CUES.raidRam));
  }
  // The last step never moves past the four-minute judgement.
  let left = seconds - raid.seconds;
  while (left > 1e-9) {
    const slice = Math.min(left, .05);
    next.riders = next.riders.map(rider => {
      const moved = moveRider(next, rider, home, slice, view);
      home = moved.home; events.push(...moved.events); return moved.rider;
    });
    left -= slice;
  }
  const allGone = next.riders.every(row => row.health <= 0 || row.fled);
  const timedOut = seconds >= (raid.test ? R.testSeconds : R.seconds);
  if (!allGone && !timedOut) return {home, raid: next, events};
  const inside = next.riders.some(row => row.health > 0 && !row.fled && outsideBy(row.position.x, row.position.z) === 0);
  const done = finishHomeRaid(home, next, !raid.test && !allGone && inside ? 'lost' : 'won', seed);
  return {...done, events: [...events, ...done.events]};
}

// The first seen day is remembered by the part; this is called only on a later transition into dusk.
export function homeRaidDue(home) {
  if (!home.raids.testDone && home.builds.some(row => row.kind === 'coop' && row.stage === 4)) return 'test';
  return home.raids.sittings >= R.firstSitting && home.raids.nextDue !== null && home.raids.played >= home.raids.nextDue ? 'real' : null;
}

export function towerAtLadder(home, position) {
  return home.builds.find(row => row.kind === 'tower' && row.stage === 4 && gap(position, buildingDoor(row)) <= HOME_TOWER.reach) ?? null;
}
export function stepHomeTower(tower, row, pressed, dt) {
  if (!tower && pressed && row) return {row, progress: 0, direction: 1};
  if (!tower) return null;
  let direction = tower.direction;
  if (pressed && tower.progress === 1) direction = -1;
  const progress = Math.max(0, Math.min(1, tower.progress + direction * Math.max(0, dt) / HOME_TOWER.climbSeconds));
  return direction < 0 && progress === 0 ? null : {...tower, progress, direction: progress === 1 ? 0 : direction};
}
export function homeTowerPose(tower) {
  const door = buildingDoor(tower.row), top = buildInLand(tower.row), t = tower.progress;
  return {x: door.x + (top.x - door.x) * t, z: door.z + (top.z - door.z) * t,
    y: scablandsSurfaceHeightAt(top.x, top.z) + HOME_TOWER.platform * t};
}
