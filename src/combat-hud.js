import {WEAPONS, ufoDestination} from './combat.js';
import {arenaMarker} from './screen-arena.js';
import {COMBAT_TUNING} from './wasteland-tuning.js';
import {NOTORIETY_XP} from './notoriety.js';
import {WEAPON_IDS} from './weapon-upgrades.js';
import {CAR_SLOT_DIRECTIONS,CAR_SLOT_PAD} from './car-loadout.js';
import {wastelandRulesActive} from './wasteland-access.js';
import {readFightSubtitle} from './fight-voices.js';
import {arsenalEnabled} from './combat-weapons.js';
import {carEffect} from './arsenal/car-effects.js';
import {convoyValveArmor} from './arena/modes/convoy-raid.js';
import {convoyPrompt} from './convoy-prompt.js';
import {brandHudStep} from './world/world-hud.js';
import {BRAND_RULE} from './world/jobs/brand-rule.js';
import {brandWaysFor, prepareBrandWays, townCarWay} from './world/jobs/brand-ways.js';
import {brandSites} from './world/jobs/brand-sites.js';

export function footBrandDirection(state) {
  const worldJob = state?.arena?.mode === 'world-job' && state.arena.worldJob;
  const job = worldJob?.job, step = job?.steps?.[job.stepIndex];
  if (state?.status !== 'racing' || !state.onFoot || !state.fighter || !step?.brand) return null;
  const fighter = state.fighter;
  const target = brandHudStep(step, job.stepState, fighter).target;
  if (!target) return null;
  const at = target.position ?? target;
  // The arrow leads by a way that can be walked (round the forge and the shacks), and the metres are that walk's; where
  // no way is known it points straight at the place, as it always did.
  const grid = worldJob.solidGrid?.movers ?? worldJob.solidGrid;
  const way = grid && target.id ? brandWaysFor(step, grid)?.aim(fighter, target.id) : null;
  const toward = way ?? at;
  const dx = toward.x - fighter.x, dz = toward.z - fighter.z;
  const bearing = Math.atan2(dx, dz) - (fighter.yaw || 0);
  const name = target.id === step.hearth?.id ? 'THE HEARTH'
    : ['pump', 'tower', 'mast'].includes(target.id) ? `${target.id.toUpperCase()} LAMP`
      : (target.name ?? 'Auntie Solder').toUpperCase();
  const flatGap = Math.hypot(at.x - fighter.x, at.z - fighter.z);
  // "AT THE LAMP" is said only where standing lights it: a dark lamp, with the brand burning. A lit lamp that relights the
  // brand has its own, shorter reach, and the row keeps its metres there (the review of 18 November 2026).
  const atLamp = step.places?.includes(target) && !job.stepState?.lamps?.[target.id] && (job.stepState?.brandSeconds ?? 0) > 0 &&
    flatGap <= BRAND_RULE.lampRadius;
  const metres = atLamp ? flatGap : way ? way.metres : flatGap;
  return {name, distance: metres < BRAND_RULE.lampDistanceDecimalsBelow ? metres.toFixed(1) : Math.round(metres),
    atLamp,
    angle: Math.round(Math.atan2(Math.sin(bearing), Math.cos(bearing)) * 180 / Math.PI)};
}

export function footLampProgress(state) {
  const job = state?.arena?.mode === 'world-job' && state.arena.worldJob?.job;
  const step = job?.steps?.[job.stepIndex], count = job?.stepState;
  if (!state.onFoot || !step?.brand || count?.townEnding || !(count?.brandSeconds > 0)) return null;
  const lamp = step.places?.find(place => place.id === count.lightingLamp);
  if (!lamp || !(count.lightingSeconds > 0)) return null;
  return {text: `LIGHTING THE ${(lamp.name ?? `${lamp.id} lamp`).toUpperCase()}`,
    fraction: Math.min(1, count.lightingSeconds / BRAND_RULE.lampSeconds)};
}

const clamp = value => Math.max(0, Math.min(1, Number(value) || 0));
export const combatSlotHidden = (slot, id, loanButton) =>
  slot === 3 ? loanButton !== (id === 'flamethrower') : loanButton;
// Rectangles include the pointer below the label. Stable actor order keeps
// stacked names predictable when several cars share one screen position.
export function stackOpponentLabels(labels, width, height, gap = 6) {
  const placed = [];
  for (const label of labels) {
    const w = Math.min(label.width, width), h = Math.min(label.height, height);
    const left = Math.max(0, Math.min(width - w, label.x - w / 2));
    const preferred = Math.max(0, Math.min(height - h, label.y - h));
    const intersectsX = other => left < other.left + other.width + gap &&
      left + w + gap > other.left;
    const nearby = placed.filter(intersectsX);
    const candidates = [preferred, 0, height - h,
      ...nearby.flatMap(other => [other.top - h - gap, other.top + other.height + gap])];
    candidates.sort((a, b) => Math.abs(a - preferred) - Math.abs(b - preferred) || a - b);
    const top = candidates.find(y => y >= 0 && y + h <= height &&
      nearby.every(other => y + h + gap <= other.top || y >= other.top + other.height + gap));
    // Normal play has at most 12 cars. If a very small viewport has no room,
    // hide the excess name instead of covering an already readable one.
    placed.push({...label, left, top: top ?? preferred, width: w, height: h, fits: top !== undefined});
  }
  return placed;
}

const zones = ['front', 'right', 'rear', 'left'];

export function combatHudEnabled(duel, state) {
  return state.mode === 'wasteland' && !!state.combat &&
    wastelandRulesActive(state) && state.status !== 'menu';
}

export function combatHudVisible(duel, state) {
  return combatHudEnabled(duel, state) && !state.paused &&
    ['racing', 'countdown', 'exploring'].includes(state.status);
}

export function armorPresentation(actor) {
  const max = Math.max(0, Number(actor?.maxArmor) || 0);
  const armor = Math.max(0, Math.min(max, Number(actor?.armor) || 0));
  return {value: Math.round(armor), max: Math.round(max), fraction: max ? clamp(armor / max) : 0};
}

// The armored tanker's body cannot be wrecked, so its bar counts the armor
// left on its three fuel valves, which is the damage a player can deal.
export function opponentArmorPresentation(state, actor) {
  const convoy = state?.arena?.convoy;
  if (!convoy || actor?.arenaId !== convoy.rigId) return {...armorPresentation(actor), valves: false};
  const {left, max, fraction} = convoyValveArmor(convoy);
  return {value: Math.ceil(left), max: Math.round(max), fraction, valves: true};
}

export function damageZoneFromChange(previous, current) {
  let direction = null, change = 0;
  for (const zone of zones) {
    const increase = (Number(current?.[zone]) || 0) - (Number(previous?.[zone]) || 0);
    if (increase > change) {direction = zone; change = increase;}
  }
  return direction;
}

export function fallbackOpponentPosition(course, player, opponent, index) {
  const at = course?.worldAt?.(player.s, player.lateral || 0);
  const target = course?.worldAt?.(opponent.s, opponent.lateral || 0);
  const heading = Number.isFinite(player.yaw) ? player.yaw :
    (at?.heading || 0) + (player.headingError || 0);
  const x = (target?.x || 0) - (at?.x || 0);
  const z = (target?.z || 0) - (at?.z || 0);
  const right = x * Math.cos(heading) - z * Math.sin(heading);
  const forward = x * Math.sin(heading) + z * Math.cos(heading);
  if (opponent.roadRider && forward < 0) {
    // A directly trailing car sits beside the mirror, with left and right threats at their respective edges.
    const side = Math.abs(right) < .1 ? (index % 2 ? 1 : -1) : Math.sign(right);
    const bearing = Math.atan2(Math.abs(right), -forward);
    return {x: .5 + side * Math.min(.38, .18 + bearing / Math.PI), y: .24 + Math.min(.28, bearing / Math.PI), direction: 'BEHIND'};
  }
  return {
    x: right < -5 ? .12 : right > 5 ? .88 : .5,
    y: forward < 0 ? .68 + index * .065 : .29 + index * .065,
    direction: forward < 0 ? 'BEHIND' : right < -5 ? 'LEFT' : right > 5 ? 'RIGHT' : 'AHEAD',
  };
}

let keptTownEntries = null;
const townEntries = () => keptTownEntries ??= brandSites().ashEntries;
export function footCarDirection(course, state) {
  const fighter = state?.fighter;
  if (!fighter) return {distance: 0, angle: 0};
  const car = course?.groundAt?.(state.s, state.lateral || 0);
  if (!car) return {distance: 0, angle: 0};
  // Run Him Down starts on foot among Tin Town's shacks: there the arrow leads by a way that can be walked, as the
  // lamps' arrow does (it pointed through a shack, and Claude stood against a wall 36 m from the car).
  const world = state.arena?.mode === 'world-job' ? state.arena.worldJob : null, step = world?.job?.steps?.[world.job.stepIndex];
  const grid = world?.solidGrid?.movers ?? world?.solidGrid;
  const way = step?.bellows && grid ? townCarWay(step, grid, car, townEntries())?.aim(fighter, 'car') : null;
  const toward = way ?? car;
  const dx = toward.x - fighter.x, dz = toward.z - fighter.z;
  const bearing = Math.atan2(dx, dz) - (fighter.yaw || 0);
  return {distance: Math.round(way ? way.metres : Math.hypot(dx, dz)),
    angle: Math.round(Math.atan2(Math.sin(bearing), Math.cos(bearing)) * 180 / Math.PI)};
}

export function bountyArrowPresentation(course, state, projected = []) {
  const arena = state.arena, bounty = arena?.mode === 'bounty-hunt' && arena.bountyHunt;
  if (!bounty || bounty.pendingVictimId) return null;
  if (bounty.markedId === 'player') return {x: .5, y: .62, angle: 180, text: 'YOU CARRY THE BOUNTY'};
  const index = state.opponents.findIndex(actor => actor.arenaId === bounty.markedId);
  const actor = state.opponents[index];
  if (!actor || actor.combatWrecking || actor.finished || actor.crushed) return null;
  const projectedCar = projected.find(item => item.index === index);
  const exact = projectedCar?.visible === true;
  const position = exact ? projectedCar : fallbackOpponentPosition(course, state, actor, 0);
  const name = arena.participants.find(p => p.id === bounty.markedId)?.name || 'MARKED CAR';
  return {x: Math.max(.11, Math.min(.89, position.x)), y: Math.max(.14, Math.min(.72, position.y - (exact ? .1 : 0))),
    angle: exact ? 180 : {AHEAD: 0, RIGHT: 90, BEHIND: 180, LEFT: -90}[position.direction],
    text: `BOUNTY · ${name}${exact ? '' : ' · ' + position.direction}`};
}

// While carrying fuel, a large arrow in the depot colour points to the player's
// own depot, turned to the way the car (or fighter) is facing, so it reads at a glance.
export function fuelArrowPresentation(course, state) {
  const arena = state.arena, fuel = arena?.mode === 'fuel-run' && arena.fuelRun;
  const me = fuel && arena.participants.find(p => p.id === 'player');
  const depot = fuel && fuel.depots.find(d => d.participantId === 'player');
  if (!me?.fuelCanisterId || !depot) return null;
  const target = course.worldAt(depot.s, depot.lateral);
  const foot = state.onFoot && state.fighter;
  const at = foot ? state.fighter : course.worldAt(state.s, state.lateral || 0);
  const heading = foot ? (state.fighter.yaw || 0) :
    Number.isFinite(state.yaw) ? state.yaw : (at.heading || 0) + (state.headingError || 0);
  const x = target.x - at.x, z = target.z - at.z;
  const right = x * Math.cos(heading) - z * Math.sin(heading);
  const forward = x * Math.sin(heading) + z * Math.cos(heading);
  const distance = Math.round(Math.hypot(x, z));
  return {angle: Math.round(Math.atan2(right, forward) * 180 / Math.PI), distance, color: depot.color,
    text: `${depot.colorName} DEPOT · ${distance} m`};
}

export function footAmmoPresentation(state) {
  const gear = state?.footGear;
  if (!gear || typeof gear.name !== 'string')
    return {name: 'NO FOOT WEAPON', ammo: 'AMMO —'};
  if (gear.name === 'WRENCH') return {name: gear.name, ammo: 'REPAIR +40'};
  // The Hand Flamer holds seconds of fuel, not rounds: it burns while fire is held and fills again while it is not.
  // (It showed "AMMO 4" when full and "AMMO" with a dash at every other moment.)
  if (gear.name === 'HAND FLAMER' && Number.isFinite(gear.ammo))
    return {name: gear.name, ammo: `FUEL ${Math.max(0, gear.ammo).toFixed(1)} s`};
  const ammo = Number.isSafeInteger(gear.ammo) && gear.ammo >= 0
    ? String(gear.ammo) : '—';
  return {name: gear.name, ammo: `AMMO ${ammo}`};
}

export function combatXpCue(event) {
  return event?.combatWreck && event.victim === 'rival' &&
    event.owner === 'player'
    ? `+${NOTORIETY_XP.wreck} NOTORIETY · FINISH TO KEEP` : null;
}

export function footActionPresentation(state) {
  const gear = state?.footGear, weapons = state?.footWeapons;
  if (!gear || !weapons) return {text: '', locked: false};
  if (gear.name === 'WRENCH') {
    if (weapons.repairing)
      return {text: `REPAIRING ${Math.round(weapons.repairAmount || 0)} / 40`, locked: false};
    return {text: weapons.repairBlockedUntilRelease
      ? 'RELEASE FIRE TO REPAIR AGAIN' : 'HOLD FIRE NEAR YOUR CAR', locked: false};
  }
  if (gear.name !== 'LONGHORN RPG') {
    if (gear.name === 'HAND FLAMER') return {text: state.fighter?.flaming ? 'FLAMING'
      : gear.ammo === 0 ? 'OUT OF FUEL / LET GO TO REFILL' : 'HOLD FIRE TO BURN', locked: false};
    if (gear.ammo === 0) return {text: 'OUT OF GEAR', locked: false};
    const reload = Math.max(0, (weapons.nextFireAt || 0) - (state.stageTimeSec || 0));
    return {text: reload > 0 ? `READY IN ${reload.toFixed(1)}s` : 'FIRE TO USE', locked: false};
  }
  if (gear.ammo === 0) return {text: 'OUT OF ROCKETS', locked: false};
  const reload = Math.max(0, (weapons.nextFireAt || 0) - (state.stageTimeSec || 0));
  if (reload > 0) return {text: `RELOADING ${reload.toFixed(1)}s`, locked: false};
  if (weapons.lockTargetIndex === null || weapons.lockTargetIndex === undefined)
    return {text: 'HOLD AIM ON A CAR', locked: false};
  if ((weapons.lockSeconds || 0) < COMBAT_TUNING.foot.rpgLockSeconds)
    return {text: 'LOCKING TARGET', locked: false};
  return {text: 'TARGET LOCKED', locked: true};
}

function setText(node, value) {
  const next = String(value);
  if (node.textContent !== next) node.textContent = next;
}

function setAttribute(node, name, value) {
  if (node.getAttribute(name) !== value) node.setAttribute(name, value);
}

function setFraction(node, fraction) {
  const next = `scaleX(${(Math.round(clamp(fraction) * 100) / 100).toFixed(2)})`;
  if (node.style.transform !== next) node.style.transform = next;
}

function createOpponentMarker(index) {
  const marker = document.createElement('div');
  marker.className = 'combat-opponent-marker';
  marker.dataset.opponentIndex = String(index);
  marker.innerHTML = `<span class="combat-marker-pointer" aria-hidden="true">⌄</span><span class="combat-marker-heading"></span><span class="combat-marker-value"></span><span class="combat-marker-track"><i></i></span>`;
  return marker;
}

export function createCombatHud({root, app, projectOpponents = () => [], projectFootAim = () => null}) {
  const overlay = root.querySelector('#overlay');
  const host = document.createElement('section');
  host.className = 'combat-upgraded-hud';
  host.hidden = true;
  host.setAttribute('aria-label', 'Combat information');
  host.innerHTML = `<div class="combat-opponent-layer" aria-label="Opponent armor and positions"></div>
    <div class="bounty-screen-arrow" role="status" hidden><span aria-hidden="true">▲</span><b></b></div>
    <div class="fuel-screen-arrow" role="status" hidden><span aria-hidden="true">▲</span><b></b></div>
    <div class="convoy-prompt" role="status" hidden><span aria-hidden="true">▲</span><b></b><em></em><i><u></u></i></div>
    <div class="combat-hit-marker" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
    <div class="combat-damage-direction" aria-hidden="true"><span>▲</span></div>
    <div class="combat-edge-cue" data-side="left" aria-hidden="true"></div>
    <div class="combat-edge-cue" data-side="right" aria-hidden="true"></div>
    <div class="combat-xp-toast" role="status" aria-live="polite"></div>
    <div class="combat-fight-subtitle" role="status" aria-live="polite" hidden></div>
    <div class="combat-foot-reticle" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
    <div class="combat-foot-action"></div>
    <div class="combat-foot-action combat-lamp-progress" role="status" hidden><b></b><div class="combat-armor-track"><i></i></div></div>
    <div class="combat-foot-car" role="status" aria-label="Direction and distance to your car"><span class="combat-foot-car-arrow" aria-hidden="true">▲</span><b>YOUR CAR</b><strong></strong></div>
    <div class="combat-foot-car combat-foot-town" role="status" hidden><span class="combat-foot-car-arrow" aria-hidden="true">▲</span><b></b><strong></strong></div>
    <div class="combat-foot-car combat-foot-town night-2-alternative-route" role="status" hidden><span class="combat-foot-car-arrow" aria-hidden="true">▲</span><b></b><strong></strong></div>
    <div class="combat-foot-gear" aria-label="On-foot equipment and controls"><b></b><strong></strong><small class="combat-foot-mouse"></small></div>
    <div class="combat-slot-bar" role="group" aria-label="Combat weapons">
      ${WEAPON_IDS.map((id,slot) => `<button type="button" data-combat-weapon="${id}" data-combat-slot="${slot}" title="${WEAPONS[id].name} · Key ${slot+1} · Gamepad D-pad ${CAR_SLOT_PAD[slot]}"><span class="combat-slot-ring" aria-hidden="true"></span><span class="combat-slot-key">${slot+1} ${CAR_SLOT_DIRECTIONS[slot]}</span><span class="combat-slot-name">${WEAPONS[id].name}</span><span class="combat-slot-state"></span></button>`).join('')}
    </div>`;
  overlay.append(host);
  const playerArmor = document.createElement('div');
  playerArmor.className = 'combat-player-armor';
  playerArmor.hidden = true;
  playerArmor.innerHTML = `<span><b>PLAYER ARMOR</b><strong></strong></span><div class="combat-armor-track"><i></i></div>`;
  root.querySelector('.race-health').append(playerArmor);
  const footHealth = document.createElement('div');
  footHealth.className = 'combat-foot-health';
  footHealth.hidden = true;
  footHealth.innerHTML = `<span><b>FIGHTER HEALTH</b><strong></strong></span><div class="combat-armor-track"><i></i></div>`;
  root.querySelector('.race-health').append(footHealth);

  const layer = host.querySelector('.combat-opponent-layer');
  const bountyArrow = host.querySelector('.bounty-screen-arrow');
  const fuelArrow = host.querySelector('.fuel-screen-arrow');
  const convoyBanner = host.querySelector('.convoy-prompt');
  const markers = [];
  const buttons = [...host.querySelectorAll('[data-combat-weapon]')];
  const slotBar = host.querySelector('.combat-slot-bar');
  const loanSlot = document.createElement('button');
  loanSlot.type = 'button'; loanSlot.dataset.combatWeapon = 'flamethrower'; loanSlot.dataset.combatSlot = '3';
  loanSlot.title = `${WEAPONS.flamethrower.name} · Key 4`;
  loanSlot.innerHTML = `<span class="combat-slot-ring" aria-hidden="true"></span><span class="combat-slot-key">4 ↓</span><span class="combat-slot-name">${WEAPONS.flamethrower.name}</span><span class="combat-slot-state"></span>`;
  // The loaned flamethrower joins the bar only while it is on loan, so the bar always holds the car's real slots.
  loanSlot.hidden = true; buttons.push(loanSlot);
  const hitMarker = host.querySelector('.combat-hit-marker');
  const damageArrow = host.querySelector('.combat-damage-direction');
  const xpToast = host.querySelector('.combat-xp-toast');
  const fightSubtitle = host.querySelector('.combat-fight-subtitle');
  const edgeCues = [...host.querySelectorAll('.combat-edge-cue')];
  const armorValue = playerArmor.querySelector('strong');
  const armorFill = playerArmor.querySelector('i');
  const footHealthValue = footHealth.querySelector('strong');
  const footHealthFill = footHealth.querySelector('i');
  const carPointer = host.querySelector('.combat-foot-car');
  const carDistance = carPointer.querySelector('strong');
  const carArrow = carPointer.querySelector('.combat-foot-car-arrow');
  const townPointer = host.querySelector('.combat-foot-town');
  townPointer.style.bottom = `${BRAND_RULE.footMarkerBottomPixels}px`;
  const townName = townPointer.querySelector('b');
  const townDistance = townPointer.querySelector('strong');
  const townArrow = townPointer.querySelector('span');
  const alternativePointer = host.querySelector('.night-2-alternative-route');
  alternativePointer.style.bottom = (BRAND_RULE.footMarkerBottomPixels + 45) + 'px';
  const alternativeName = alternativePointer.querySelector('b');
  const alternativeDistance = alternativePointer.querySelector('strong');
  const alternativeArrow = alternativePointer.querySelector('span');
  const footGearBox = host.querySelector('.combat-foot-gear');
  const footGearName = host.querySelector('.combat-foot-gear b');
  const footGearAmmo = host.querySelector('.combat-foot-gear strong');
  const footMouse = host.querySelector('.combat-foot-mouse');
  const footAction = host.querySelector('.combat-foot-action');
  const footReticle = host.querySelector('.combat-foot-reticle');
  const lampProgress = host.querySelector('.combat-lamp-progress');
  lampProgress.style.top = `calc(50% + ${BRAND_RULE.lampProgressTopPixels}px)`;
  lampProgress.style.width = `${BRAND_RULE.lampProgressWidthPixels}px`;
  // The existing action row and armor track supply the same border, lettering and fill as the other rows.
  const drawLampProgress = state => {
    const progress = footLampProgress(state);
    lampProgress.hidden = !progress;
    lampProgress.style.display = progress ? 'block' : 'none';
    if (progress) {
      setText(lampProgress.querySelector('b'), progress.text);
      setFraction(lampProgress.querySelector('i'), progress.fraction);
    }
  };
  let hitUntil = -1, damageUntil = -1, xpUntil = -1, damageDirection = 'front';
  let previousZones = null;

  host.addEventListener('click', event => {
    const button = event.target.closest('[data-combat-weapon]');
    if (button && !button.disabled) app.duel.fireWeapon(button.dataset.combatWeapon);
  });

  const off = app.duel.onChange((state, event) => {
    if (event.stageLoaded != null || event.menu) {
      hitUntil = damageUntil = xpUntil = -1;
      previousZones = {...state.damageZones};
      return;
    }
    if (!combatHudEnabled(app.duel, state)) return;
    const xpCue = combatXpCue(event);
    if (xpCue) {
      setText(xpToast, xpCue);
      xpUntil = state.stageTimeSec + 2.2;
    }
    if (event.combatHit && event.victim === 'rival' && !event.enemy ||
        event.combatRamHit && event.attacker === 'player' && event.victim === 'rival') {
      hitUntil = state.stageTimeSec + .32;
    }
    if (event.combatHit && event.victim === 'player' ||
        event.combatRamHit && event.victim === 'player') {
      damageDirection = damageZoneFromChange(previousZones, state.damageZones) ||
        (state.impactSide < 0 ? 'left' : 'right');
      damageUntil = state.stageTimeSec + .75;
      previousZones = {...state.damageZones};
    }
  });

  function update(state) {
    // Light the Town's walking ways are worked out while the countdown runs, not at the walker's first step.
    if (state.status === 'countdown' && state.arena?.mode === 'world-job') {
      const world = state.arena.worldJob, step = world?.job?.steps?.[world.job.stepIndex];
      if (step?.brand && world.solidGrid) prepareBrandWays(step, world.solidGrid.movers ?? world.solidGrid);
    }
    const active = combatHudVisible(app.duel, state);
    const subtitle = active ? readFightSubtitle(state) : null;
    if (fightSubtitle.hidden !== !subtitle) fightSubtitle.hidden = !subtitle;
    setText(fightSubtitle, subtitle || '');
    const onFoot = active && state.onFoot && !!state.fighter;
    // Light the Town's ending is watched from over the town: the walker's gauges, arrows and aiming mark go for those seconds.
    const watching = state.arena?.mode === 'world-job' && state.arena.worldJob?.job?.stepState?.townEnding === true;
    if (host.hidden === (active && !watching)) host.hidden = !active || watching;
    if (playerArmor.hidden === (active && !onFoot)) playerArmor.hidden = !active || onFoot;
    if (footHealth.hidden === (onFoot && !watching)) footHealth.hidden = !onFoot || watching;
    const stage = root.querySelector('#stage');
    stage.classList.toggle('combat-upgraded', active);
    stage.classList.toggle('on-foot', onFoot);
    host.classList.toggle('on-foot', onFoot);
    drawLampProgress(state);
    if (!active) return;

    const worldJob = state.arena?.worldJob, chapter = worldJob?.night2;
    // One "Your car" pill: a story that names its own route to the car (Night 2) shows that one, not this straight-line pointer too.
    const storyNamesCar = chapter?.routes?.some(route => route.name === 'Your car') === true;
    carPointer.hidden = !onFoot || chapter?.washCarUnavailable === true || storyNamesCar;
    if (onFoot) {
      const maxHealth=Math.max(1,Number(state.fighter.maxHealth)||100);
      const health = Math.max(0, Math.min(maxHealth, Number(state.fighter.health) || 0));
      setText(footHealthValue, `${Math.round(health)} / ${Math.round(maxHealth)}`);
      setFraction(footHealthFill, health / maxHealth);
      footHealth.classList.toggle('is-critical', health <= maxHealth*.25);
      footHealth.classList.toggle('is-knocked-down', !!state.fighter.knockedDown);
      if (!carPointer.hidden) {
        const direction = footCarDirection(app.duel.course, state);
        setText(carDistance, `${direction.distance} m`);
        const rotation = `rotate(${direction.angle}deg)`;
        if (carArrow.style.transform !== rotation) carArrow.style.transform = rotation;
      }
      const walkingRoutes = chapter?.routes ?? [];
      const [firstWalk, secondWalk] = walkingRoutes;
      const walkPointer = route => {
        const bearing = Math.atan2(route.point.x - state.fighter.x, route.point.z - state.fighter.z) - state.fighter.yaw;
        return {name: route.name, distance: Math.round(route.metres), angle: bearing * 180 / Math.PI};
      };
      const town = firstWalk ? walkPointer(firstWalk) : footBrandDirection(state);
      alternativePointer.hidden = !secondWalk;
      if (secondWalk) {
        const alternate = walkPointer(secondWalk);
        setText(alternativeName, alternate.name);
        setText(alternativeDistance, `${alternate.distance} m`);
        alternativeArrow.style.transform = `rotate(${alternate.angle}deg)`;
      }

      townPointer.hidden = !town;
      if (town) {
        setText(townName, town.name);
        setText(townDistance, town.atLamp ? 'AT THE LAMP' : `${town.distance} m`);
        townArrow.style.transform = `rotate(${town.angle}deg)`;
        townPointer.setAttribute('aria-label', `${town.name}, ${town.distance} metres away`);
      }
      const holstered = chapter?.holstered === true;
      footGearBox.hidden = holstered && !app.footMouseHint;
      footGearName.hidden = holstered;
      footGearAmmo.hidden = holstered;
      footAction.hidden = holstered;
      const gear = footAmmoPresentation(state);
      setText(footGearName, gear.name);
      setText(footGearAmmo, gear.ammo);
      setText(footMouse, app.footMouseHint || '');
      const action = footActionPresentation(state);
      setText(footAction, action.text);
      footReticle.classList.toggle('is-locked', action.locked);
      const aim=projectFootAim();
      footReticle.hidden=holstered || aim?.visible===false;
      const left=`${((aim?.x??.5)*100).toFixed(3)}%`,top=`${((aim?.y??.5)*100).toFixed(3)}%`;
      if(footReticle.style.left!==left)footReticle.style.left=left;
      if(footReticle.style.top!==top)footReticle.style.top=top;
    }

    const combat = state.combat;
    const armor = armorPresentation(state);
    setText(armorValue, `${armor.value} / ${armor.max}`);
    setFraction(armorFill, armor.fraction);
    playerArmor.classList.toggle('is-critical', armor.fraction <= .25);
    playerArmor.classList.toggle('is-wrecked', !!state.combatWrecking);

    const ufo = combat.cooldowns.ufo <= 0 && state.status === 'racing' ? ufoDestination(app.duel) : null;
    const arsenal = arsenalEnabled(app.duel);
    const lockout = arsenal ? carEffect(state, 'disabled') : null;
    for (const button of buttons) {
      const slot=Number(button.dataset.combatSlot);
      const id=state.weaponLoadout?.[slot]||WEAPON_IDS[slot];
      button.hidden = combatSlotHidden(slot, id, button === loanSlot);
      if (button === loanSlot) {
        if (button.hidden) button.remove();
        else if (!button.isConnected) slotBar.append(button);
      }
      if (button.hidden) continue;
      const weapon=WEAPONS[id];
      if(button.dataset.combatWeapon!==id)button.dataset.combatWeapon=id;
      setText(button.querySelector('.combat-slot-name'),weapon.name);
      setAttribute(button,'title',`${weapon.name} · Key ${slot+1} · Gamepad D-pad ${CAR_SLOT_PAD[slot]}`);
      const left = Math.max(0, combat.cooldowns[id] || 0);
      const blocked = id === 'ufo' && ufo?.kind === 'blocked';
      const disabled = onFoot || state.status !== 'racing' || state.paused || left > 0 || blocked || !!lockout;
      const level = combat.levels[id] || 0;
      const full = arsenal ? weapon.cooldown / 1.15 ** level
        : weapon.cooldown * (1 - level * COMBAT_TUNING.cooldownUpgradeDiscount);
      const angle = `${Math.round(360 * (1 - clamp(left / Math.max(.01, full))))}deg`;
      if (button.style.getPropertyValue('--ready-angle') !== angle) button.style.setProperty('--ready-angle', angle);
      if (button.disabled !== disabled) button.disabled = disabled;
      const label = lockout ? `DISABLED ${Math.ceil(lockout.remainingSec)}s` : left > 0 ? `${Math.ceil(left)}s` : blocked ? ufo.reason === 'lap-used' ? 'LAP USED' : ufo.reason === 'landing' ? 'NO ROOM' : 'CHARGING' : 'READY';
      setText(button.querySelector('.combat-slot-state'), label);
      setAttribute(button, 'aria-label', `${weapon.name}, level ${combat.levels[id] || 0}, keyboard ${slot+1}, gamepad D-pad ${CAR_SLOT_PAD[slot]}, ${label.toLowerCase()}`);
    }

    const opponents = state.opponents || [];
    const projected = projectOpponents();
    const fuelPointer = fuelArrowPresentation(app.duel.course, state);
    fuelArrow.hidden = !fuelPointer || fuelPointer.distance < 6;
    if (!fuelArrow.hidden) {
      fuelArrow.style.color = fuelPointer.color;
      fuelArrow.querySelector('span').style.transform = `rotate(${fuelPointer.angle}deg)`;
      setText(fuelArrow.querySelector('b'), fuelPointer.text);
    }
    const prompt = convoyPrompt(app.duel);
    convoyBanner.hidden = !prompt;
    if (prompt) {
      const arrow = convoyBanner.querySelector('span');
      arrow.hidden = prompt.angle === null;
      arrow.style.transform = `rotate(${prompt.angle ?? 0}deg)`;
      setText(convoyBanner.querySelector('b'), prompt.title);
      setText(convoyBanner.querySelector('em'), prompt.sub);
      const track = convoyBanner.querySelector('i');
      track.hidden = prompt.progress === null;
      convoyBanner.querySelector('u').style.transform = `scaleX(${clamp(prompt.progress)})`;
    }
    const bounty = bountyArrowPresentation(app.duel.course, state, projected);
    bountyArrow.hidden = !bounty;
    if (bounty) {
      bountyArrow.style.left = `${(bounty.x * 100).toFixed(1)}%`;
      bountyArrow.style.top = `${(bounty.y * 100).toFixed(1)}%`;
      bountyArrow.querySelector('span').style.transform = `rotate(${bounty.angle}deg)`;
      setText(bountyArrow.querySelector('b'), bounty.text);
    }
    while (markers.length < opponents.length) {
      const marker = createOpponentMarker(markers.length);
      markers.push(marker);
      layer.append(marker);
    }
    const washEnded = chapter && worldJob.riderFight?.outcome;
    for (let index = 0; index < markers.length; index++) {
      const marker = markers[index], opponent = opponents[index];
      if (!opponent || opponent.drone || washEnded && opponent.roadRider) {marker.hidden = true; continue;}
      const projection = projected.find(item => item.index === index);
      const exact = projection?.visible === true;
      const position = exact ? projection : fallbackOpponentPosition(app.duel.course,
        onFoot ? state.fighter : state, opponent, index);
      marker.hidden = !!opponent.finished || !!opponent.crushed;
      marker.dataset.placement = exact ? 'over-car' : 'direction';
      // Keep the whole label on screen when the car reaches the camera edge.
      marker.style.left = `${(Math.max(.11, Math.min(.89, clamp(position.x))) * 100).toFixed(1)}%`;
      marker.style.top = `${(clamp(position.y) * 100).toFixed(1)}%`;
      // A decoy copy shows its original's name and armor, so the HUD never gives it away.
      const opponentArmor = opponentArmorPresentation(state, opponent.decoy ?
        opponents.find(car => car.arenaId === opponent.ownerId) ?? opponent : opponent);
      const barName = opponentArmor.valves ? 'valve armor' : 'armor', barPrefix = opponentArmor.valves ? 'VALVES ' : '';
      // In the Scrapdome, cars carry names and a red tag when hunting you, and
      // distance is measured across the floor, not along the ring.
      const arena = arenaMarker(state, opponent);
      let gapMetres = Math.round(Math.abs(opponent.s - state.s));
      if (arena) {
        const a = app.duel.course.worldAt(opponent.s, opponent.lateral || 0);
        const b = app.duel.course.worldAt(state.s, state.lateral || 0);
        gapMetres = Math.round(Math.hypot(a.x - b.x, a.z - b.z));
      }
      setText(marker.querySelector('.combat-marker-heading'), arena ? `${arena.heading}${arena.hunting ? ' · HUNTING YOU' : ''}` : index ? `OPPONENT ${index + 1}` : 'RIVAL');
      marker.classList.toggle('is-hunting', !!arena?.hunting);
      marker.classList.toggle('is-marked', !!arena?.marked);
      marker.classList.toggle('is-protected', !!arena?.protected);
      setText(marker.querySelector('.combat-marker-value'), exact ? `${barPrefix}${opponentArmor.value} / ${opponentArmor.max}` : `${position.direction} · ${gapMetres} m · ${barPrefix}${opponentArmor.value} / ${opponentArmor.max}`);
      setFraction(marker.querySelector('.combat-marker-track i'), opponentArmor.fraction);
      marker.classList.toggle('is-critical', opponentArmor.fraction <= .25);
      marker.classList.toggle('is-wrecked', !!opponent.combatWrecking);
      setAttribute(marker, 'aria-label', `${arena ? `${arena.heading}${arena.hunting ? ', hunting you' : ''}` : index ? `Opponent ${index + 1}` : 'Rival'} ${barName} ${opponentArmor.value} of ${opponentArmor.max}${exact ? '' : `, ${position.direction.toLowerCase()}, ${gapMetres} metres away`}`);
    }
    const layerRect = layer.getBoundingClientRect();
    const visibleLabels = markers.filter(marker => !marker.hidden).map(marker => {
      const rect = marker.getBoundingClientRect();
      return {marker, x: parseFloat(marker.style.left) * layerRect.width / 100,
        y: parseFloat(marker.style.top) * layerRect.height / 100 + 15,
        width: rect.width, height: rect.height + 15};
    });
    for (const label of stackOpponentLabels(visibleLabels, layerRect.width, layerRect.height)) {
      label.marker.hidden = !label.fits;
      label.marker.style.left = `${label.left + label.width / 2}px`;
      label.marker.style.top = `${label.top + label.height - 15}px`;
    }
    hitMarker.classList.toggle('is-visible', hitUntil > state.stageTimeSec && !state.paused);
    damageArrow.classList.toggle('is-visible', damageUntil > state.stageTimeSec && !state.paused);
    xpToast.classList.toggle('is-visible', xpUntil > state.stageTimeSec && !state.paused);
    // A warlord move may light a screen edge for the side something comes from.
    for (const cue of edgeCues) cue.classList.toggle('is-visible', !state.paused &&
      !!state.arena?.edgeCues?.some(item => item.side === cue.dataset.side && item.untilSec > state.stageTimeSec));
    if (damageArrow.dataset.direction !== damageDirection) damageArrow.dataset.direction = damageDirection;
    previousZones = {...state.damageZones};
  }

  return {update, dispose() {off(); host.remove(); playerArmor.remove(); footHealth.remove();}};
}
