import {WEAPONS, ufoDestination} from './combat.js';
import {COMBAT_TUNING} from './wasteland-tuning.js';
import {NOTORIETY_XP} from './notoriety.js';
import {WEAPON_IDS} from './weapon-upgrades.js';
import {CAR_SLOT_DIRECTIONS,CAR_SLOT_PAD} from './car-loadout.js';

const clamp = value => Math.max(0, Math.min(1, Number(value) || 0));
const zones = ['front', 'right', 'rear', 'left'];

export function combatHudEnabled(duel, state) {
  return state.mode === 'wasteland' && !!state.combat &&
    duel.featureFlags?.enabled('wasteland2') === true && state.status !== 'menu';
}

export function armorPresentation(actor) {
  const max = Math.max(0, Number(actor?.maxArmor) || 0);
  const armor = Math.max(0, Math.min(max, Number(actor?.armor) || 0));
  return {value: Math.round(armor), max: Math.round(max), fraction: max ? clamp(armor / max) : 0};
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
  return {
    x: right < -5 ? .12 : right > 5 ? .88 : .5,
    y: forward < 0 ? .68 + index * .065 : .29 + index * .065,
    direction: forward < 0 ? 'BEHIND' : right < -5 ? 'LEFT' : right > 5 ? 'RIGHT' : 'AHEAD',
  };
}

export function footCarDirection(course, state) {
  const fighter = state?.fighter;
  if (!fighter) return {distance: 0, angle: 0};
  const car = course?.groundAt?.(state.s, state.lateral || 0);
  if (!car) return {distance: 0, angle: 0};
  const dx = car.x - fighter.x, dz = car.z - fighter.z;
  const bearing = Math.atan2(dx, dz) - (fighter.yaw || 0);
  return {distance: Math.round(Math.hypot(dx, dz)),
    angle: Math.round(Math.atan2(Math.sin(bearing), Math.cos(bearing)) * 180 / Math.PI)};
}

export function footAmmoPresentation(state) {
  const gear = state?.footGear;
  if (!gear || typeof gear.name !== 'string')
    return {name: 'NO FOOT WEAPON', ammo: 'AMMO —'};
  if (gear.name === 'WRENCH') return {name: gear.name, ammo: 'REPAIR +40'};
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

export function createCombatHud({root, app, projectOpponents = () => []}) {
  const overlay = root.querySelector('#overlay');
  const host = document.createElement('section');
  host.className = 'combat-upgraded-hud';
  host.hidden = true;
  host.setAttribute('aria-label', 'Combat information');
  host.innerHTML = `<div class="combat-opponent-layer" aria-label="Opponent armor and positions"></div>
    <div class="combat-hit-marker" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
    <div class="combat-damage-direction" aria-hidden="true"><span>▲</span></div>
    <div class="combat-xp-toast" role="status" aria-live="polite"></div>
    <div class="combat-foot-reticle" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
    <div class="combat-foot-action"></div>
    <div class="combat-foot-car" role="status" aria-label="Direction and distance to your car"><span class="combat-foot-car-arrow" aria-hidden="true">▲</span><b>YOUR CAR</b><strong></strong></div>
    <div class="combat-foot-gear" aria-label="On-foot weapon and ammunition"><b></b><strong></strong></div>
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
  const markers = [];
  const buttons = [...host.querySelectorAll('[data-combat-weapon]')];
  const hitMarker = host.querySelector('.combat-hit-marker');
  const damageArrow = host.querySelector('.combat-damage-direction');
  const xpToast = host.querySelector('.combat-xp-toast');
  const armorValue = playerArmor.querySelector('strong');
  const armorFill = playerArmor.querySelector('i');
  const footHealthValue = footHealth.querySelector('strong');
  const footHealthFill = footHealth.querySelector('i');
  const carDistance = host.querySelector('.combat-foot-car strong');
  const carArrow = host.querySelector('.combat-foot-car-arrow');
  const footGearName = host.querySelector('.combat-foot-gear b');
  const footGearAmmo = host.querySelector('.combat-foot-gear strong');
  const footAction = host.querySelector('.combat-foot-action');
  const footReticle = host.querySelector('.combat-foot-reticle');
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
    const active = combatHudEnabled(app.duel, state);
    const onFoot = active && state.onFoot && !!state.fighter;
    if (host.hidden === active) host.hidden = !active;
    if (playerArmor.hidden === (active && !onFoot)) playerArmor.hidden = !active || onFoot;
    if (footHealth.hidden === onFoot) footHealth.hidden = !onFoot;
    const stage = root.querySelector('#stage');
    stage.classList.toggle('combat-upgraded', active);
    stage.classList.toggle('on-foot', onFoot);
    host.classList.toggle('on-foot', onFoot);
    if (!active) return;

    if (onFoot) {
      const maxHealth=Math.max(1,Number(state.fighter.maxHealth)||100);
      const health = Math.max(0, Math.min(maxHealth, Number(state.fighter.health) || 0));
      setText(footHealthValue, `${Math.round(health)} / ${Math.round(maxHealth)}`);
      setFraction(footHealthFill, health / maxHealth);
      footHealth.classList.toggle('is-critical', health <= maxHealth*.25);
      footHealth.classList.toggle('is-knocked-down', !!state.fighter.knockedDown);
      const direction = footCarDirection(app.duel.course, state);
      setText(carDistance, `${direction.distance} m`);
      const rotation = `rotate(${direction.angle}deg)`;
      if (carArrow.style.transform !== rotation) carArrow.style.transform = rotation;
      const gear = footAmmoPresentation(state);
      setText(footGearName, gear.name);
      setText(footGearAmmo, gear.ammo);
      const action = footActionPresentation(state);
      setText(footAction, action.text);
      footReticle.classList.toggle('is-locked', action.locked);
    }

    const combat = state.combat;
    const armor = armorPresentation(state);
    setText(armorValue, `${armor.value} / ${armor.max}`);
    setFraction(armorFill, armor.fraction);
    playerArmor.classList.toggle('is-critical', armor.fraction <= .25);
    playerArmor.classList.toggle('is-wrecked', !!state.combatWrecking);

    const ufo = combat.cooldowns.ufo <= 0 && state.status === 'racing' ? ufoDestination(app.duel) : null;
    for (const button of buttons) {
      const slot=Number(button.dataset.combatSlot);
      const id=state.weaponLoadout?.[slot]||WEAPON_IDS[slot];
      const weapon=WEAPONS[id];
      if(button.dataset.combatWeapon!==id)button.dataset.combatWeapon=id;
      setText(button.querySelector('.combat-slot-name'),weapon.name);
      setAttribute(button,'title',`${weapon.name} · Key ${slot+1} · Gamepad D-pad ${CAR_SLOT_PAD[slot]}`);
      const left = Math.max(0, combat.cooldowns[id] || 0);
      const blocked = id === 'ufo' && ufo?.kind === 'blocked';
      const disabled = onFoot || state.status !== 'racing' || state.paused || left > 0 || blocked;
      const full = weapon.cooldown * (1 - (combat.levels[id] || 0) * COMBAT_TUNING.cooldownUpgradeDiscount);
      const angle = `${Math.round(360 * (1 - clamp(left / Math.max(.01, full))))}deg`;
      if (button.style.getPropertyValue('--ready-angle') !== angle) button.style.setProperty('--ready-angle', angle);
      if (button.disabled !== disabled) button.disabled = disabled;
      const label = left > 0 ? `${Math.ceil(left)}s` : blocked ? ufo.reason === 'lap-used' ? 'LAP USED' : 'CHARGING' : 'READY';
      setText(button.querySelector('.combat-slot-state'), label);
      setAttribute(button, 'aria-label', `${weapon.name}, level ${combat.levels[id] || 0}, keyboard ${slot+1}, gamepad D-pad ${CAR_SLOT_PAD[slot]}, ${label.toLowerCase()}`);
    }

    const opponents = state.opponents || [];
    const projected = projectOpponents();
    while (markers.length < opponents.length) {
      const marker = createOpponentMarker(markers.length);
      markers.push(marker);
      layer.append(marker);
    }
    for (let index = 0; index < markers.length; index++) {
      const marker = markers[index], opponent = opponents[index];
      if (!opponent) {marker.hidden = true; continue;}
      const projection = projected.find(item => item.index === index);
      const exact = projection?.visible === true;
      const position = exact ? projection : fallbackOpponentPosition(app.duel.course,
        onFoot ? state.fighter : state, opponent, index);
      marker.hidden = !!opponent.finished || !!opponent.crushed;
      marker.dataset.placement = exact ? 'over-car' : 'direction';
      // Keep the whole label on screen when the car reaches the camera edge.
      marker.style.left = `${(Math.max(.11, Math.min(.89, clamp(position.x))) * 100).toFixed(1)}%`;
      marker.style.top = `${(clamp(position.y) * 100).toFixed(1)}%`;
      const opponentArmor = armorPresentation(opponent);
      setText(marker.querySelector('.combat-marker-heading'), index ? `OPPONENT ${index + 1}` : 'RIVAL');
      setText(marker.querySelector('.combat-marker-value'), exact ? `${opponentArmor.value} / ${opponentArmor.max}` : `${position.direction} · ${Math.round(Math.abs(opponent.s - state.s))} m · ${opponentArmor.value} / ${opponentArmor.max}`);
      setFraction(marker.querySelector('.combat-marker-track i'), opponentArmor.fraction);
      marker.classList.toggle('is-critical', opponentArmor.fraction <= .25);
      marker.classList.toggle('is-wrecked', !!opponent.combatWrecking);
      setAttribute(marker, 'aria-label', `${index ? `Opponent ${index + 1}` : 'Rival'} armor ${opponentArmor.value} of ${opponentArmor.max}${exact ? '' : `, ${position.direction.toLowerCase()}, ${Math.round(Math.abs(opponent.s - state.s))} metres away`}`);
    }
    hitMarker.classList.toggle('is-visible', hitUntil > state.stageTimeSec && !state.paused);
    damageArrow.classList.toggle('is-visible', damageUntil > state.stageTimeSec && !state.paused);
    xpToast.classList.toggle('is-visible', xpUntil > state.stageTimeSec && !state.paused);
    if (damageArrow.dataset.direction !== damageDirection) damageArrow.dataset.direction = damageDirection;
    previousZones = {...state.damageZones};
  }

  return {update, dispose() {off(); host.remove(); playerArmor.remove(); footHealth.remove();}};
}
