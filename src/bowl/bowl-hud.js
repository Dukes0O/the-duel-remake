// Read-only presentation for the Bowl. These views can also be checked without a DOM.
import {BOWL_FLOOR} from './bowl-course.js';
import {BIG_MO} from './bowl-lines.js';
export const BOWL_HUD_SOUNDS = Object.freeze({
  'bowl.health.hit': 'vehicle.crash',
  'bowl.health.danger': 'raider.warning',
  'bowl.card.open': 'interface.radar',
});

export const BOWL_TRICK_GUIDE = Object.freeze([
  {kind: 'wheelie', name: 'Wheelie', keys: [['W', 'Space']], points: '8 per second. Add 25 at 3 seconds.'},
  {kind: 'stoppie', name: 'Stoppie', keys: [['S', 'Space']], points: '10 per second.'},
  {kind: 'donut', name: 'Donut', keys: [['W', 'Space', '← or →']], points: '15 to 40 per turn. Three turns earn a 30-point Cyclone.'},
  {kind: 'spin', name: 'Spin', keys: [['← or →']], points: 'Tap Left or Right. Keep it held for another turn. 30, 120 or 270 points.'},
  {kind: 'frontFlip', name: 'Front flip', keys: [['W']], points: 'Tap W. Keep it held for another turn. 50, 200 or 450 points.'},
  {kind: 'backflip', name: 'Backflip', keys: [['S']], points: 'Tap S. Keep it held for another turn. 50, 200 or 450 points.'},
  {kind: 'barrelRoll', name: 'Barrel roll', keys: [['Space', '← or →']], points: 'Tap Space and Left or Right. Keep it held for another turn. 60, 240 or 540 points.'},
  {kind: 'sideFlip', name: 'Side flip', keys: [['← or →'], ['Space', '← or →']], points: 'Tap Space and Left or Right while sideways. Keep it held for another turn. 80, 320 or 720 points.'},
]);

const REX_GOALS = {
  tell: 'Stay out of the fire.',
  fire: 'Stay out of the fire.',
  lift: 'Dodge the thrown car.',
  throw: 'Dodge the thrown car.',
  rest: 'Jump off the junk car.',
  fallen: 'Stay clear of the Scrapasaurus.',
};

function shortGoal(view, event, rivalName) {
  const text = view.goal?.trim();
  if (text && text.split(/\s+/).length <= (view.event === 'scrapasaurus' ? 5 : 8)) return text;
  switch (view.event) {
    case 'carCrush': return Number.isFinite(event?.count) ? `Crush ${view.target} pieces.` : `Crush through ${view.target} rows.`;
    case 'freestyle': return `Score ${view.target} points before time runs out.`;
    case 'sideBySide': {
      const rival = rivalName(event?.rival);
      return rival ? `Beat ${rival} to the line.` : 'Finish ahead of your rival.';
    }
    case 'lastTruckRolling': {
      const names = (event?.rivals ?? []).filter(rival => !rival.out).map(rival => rivalName(rival.id)).filter(Boolean);
      const goal = `Outlast ${names.join(', ')}.`;
      return names.length && goal.split(/\s+/).length <= 8 ? goal : 'Be the last truck rolling.';
    }
    case 'scrapasaurus': return REX_GOALS[event?.rex?.phase] ?? 'Smash its battery boxes.';
    default: return 'Finish the event.';
  }
}

const whole = value => Math.round(value).toLocaleString('en-US');
const clock = value => {
  const seconds = Math.ceil(value);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
};

const popupActive = (record, now) => !!record && now - record.at < 1.5;
const popupMultiplier = factor => factor.toFixed(2).replace(/0$/, '');

function sideBySideGap(state, event) {
  const rival = state.opponents?.[0];
  if (!rival || !event?.finishS) return '';
  const playerLeft = event.finishS.player - state.s, rivalLeft = event.finishS.rival - rival.s;
  const metres = Math.round(rivalLeft - playerLeft);
  if (!Number.isFinite(metres)) return '';
  return `${metres > 0 ? 'AHEAD' : metres < 0 ? 'BEHIND' : 'LEVEL'} ${whole(Math.abs(metres))} m`;
}

export function bowlStrip(state, view, rivalName = () => null) {
  if (!view) return null;
  const night = state.bowlNight, event = night?.event;
  const crush = view.event === 'carCrush' && Number.isFinite(event?.count);
  const trick = event?.trickPopups?.[0];
  const showingTrick = Number.isFinite(trick?.multiplier) && popupActive(trick, night?.clock);
  const crowd = showingTrick ? Math.round((trick.multiplier - 1) * 100) : view.crowd;
  const multiplier = showingTrick ? popupMultiplier(trick.multiplier) : (1 + crowd / 100).toFixed(1);
  return {
    name: view.name, goal: shortGoal(view, event, rivalName), driver: view.driver,
    points: `${whole(view.score)} points`,
    time: view.timeLeft == null && view.event !== 'scrapasaurus' ? '' : clock(view.timeLeft ?? state.stageTimeSec ?? 0),
    crowd, crowdLabel: `CROWD x${multiplier}`, caption: view.caption,
    gapLabel: view.event === 'sideBySide' ? sideBySideGap(state, event) : '',
    crushLabel: crush ? `CRUSHED ${event.count} OF ${view.target}` : '',
    chainLabel: crush && event.chain > 1 ? `CHAIN x${event.chain}` : '',
  };
}

export function bowlOpeningLines(night, lent) {
  return [BIG_MO[`night.${night}.open`], lent ? BIG_MO['lent.truck'] : null].filter(Boolean);
}

export function bowlTrickPopup(record, now) {
  if (!popupActive(record, now)) return null;
  if (record.notice) return {name: record.notice, points: '', fresh: false};
  const trick = BOWL_TRICK_GUIDE.find(entry => entry.kind === record.kind);
  const name = trick?.name ?? (record.kind === 'cyclone' ? 'Cyclone' : '');
  if (!name) return null;
  const prefix = record.kind === 'cyclone' || record.turns < 2 ? '' :
    record.turns === 2 ? 'Double ' : record.turns === 3 ? 'Triple ' : `${record.turns}× `;
  const base = Number(record.base.toFixed(1));
  const multiplier = popupMultiplier(record.multiplier);
  const relation = Math.round(base * Number(multiplier)) === record.points ? '=' : '≈';
  return {name: (prefix + name).toUpperCase(),
    points: `${base.toLocaleString('en-US')} x${multiplier} ${relation} ${whole(record.points)}`, fresh: record.fresh};
}

export function bowlResultReady(night) {
  if (!night?.lastResult || !Number.isFinite(night.resultAt)) return false;
  const rexWon = night.lastResult.event === 'scrapasaurus' && night.lastResult.won;
  const start = rexWon ? night.event?.resultHoldSince ?? night.resultAt : night.resultAt;
  return night.clock - start >= (rexWon ? 10 : 2) - 1e-8;
}

const clamp01 = value => Math.max(0, Math.min(1, Number(value) || 0));
const ZONES = ['front', 'right', 'rear', 'left'];
// The contact and armor rules record wear on a scale from zero to five.
const ZONE_WEAR_MAX = 5;

export function bowlHealth(actor, {value = actor.armor, max = actor.maxArmor, zones = actor.damageZones} = {}) {
  const fraction = max > 0 ? clamp01(value / max) : 0;
  return {value, max, fraction,
    segments: Array.from({length: 5}, (_, index) => clamp01(fraction * 5 - index)),
    zones: Object.fromEntries(ZONES.map(zone => [zone, 1 - clamp01(zones?.[zone] / ZONE_WEAR_MAX)])),
    danger: fraction > 0 && fraction <= .2};
}

export function bowlHealthHit(before, after) {
  if (!before || before.value <= after.value) return null;
  let zone = null, biggest = 0;
  for (const part of ZONES) {
    const lost = before.zones[part] - after.zones[part];
    if (lost > biggest) { zone = part; biggest = lost; }
  }
  const lost = before.value - after.value;
  return {zone, lost: Math.max(.1, Math.round(lost * 10) / 10)};
}


export const bowlFightActive = state => ['lastTruckRolling', 'scrapasaurus'].includes(state.bowlNight?.event?.type);

export function bowlHealthOf(state) {
  const rex = state.bowlNight?.event?.rex;
  return rex ? bowlHealth(state, {value: Math.max(0, rex.maxHits - rex.hits), max: rex.maxHits}) : bowlHealth(state);
}

export function bowlTrickEntryMarkup(entry, done = false) {
  const keys = entry.keys.map(group => group.map(key => `<kbd>${key}</kbd>`).join(' ')).join(' then ');
  return `<div class="bowl-trick-picture" data-trick="${entry.kind}" aria-hidden="true"><i></i></div>
    <div><b>${entry.name}</b><p>${keys}</p><small>${entry.points}</small></div>
    ${done ? '<span class="bowl-trick-tick" aria-label="Landed tonight">✓</span>' : ''}`;
}

const healthTone = fraction => fraction > .6 ? 'green' : fraction > .4 ? 'yellow' : fraction > .2 ? 'orange' : 'red';

export const bowlSegmentsMarkup = '<span class="bowl-health-segments" aria-hidden="true">' +
  '<i></i>'.repeat(5) + '</span>';

export function drawBowlSegments(node, health) {
  const tone = healthTone(health.fraction);
  if (node.dataset.tone !== tone) node.dataset.tone = tone;
  node.classList.toggle('bowl-health-danger', health.danger);
  for (let index = 0; index < node.children.length; index++) {
    const style = node.children[index].style, fill = String(health.segments[index]);
    if (style.getPropertyValue('--filled') !== fill) style.setProperty('--filled', fill);
  }
}

export function playBowlHudCue(app, id) {
  const audio = app.audio, cue = BOWL_HUD_SOUNDS[id];
  if (!cue || audio?.muted || audio?.context?.state !== 'running') return;
  // The pause action mutes the race bus. The card's short UI cue still goes through the output limiter.
  const options = id === 'bowl.card.open' ? {destination: audio.output, scale: .42} : undefined;
  audio._playCue(cue, options);
}

function drawPlan(canvas, state, course) {
  const bowl = course.features.bowl;
  const {straight, radius} = bowl.ring;
  const wallOffset = bowl.outside?.wall ?? BOWL_FLOOR.outerWallOffset;
  const outerRadius = radius + wallOffset;
  const centre = course.worldAt(straight / 2, -radius);
  const ctx = canvas.getContext('2d');
  const {width, height} = canvas;
  const scale = Math.min((width - 36) / (straight + 2 * outerRadius), (height - 22) / (2 * outerRadius));
  const midX = width / 2, midY = height / 2;
  const point = (s, lateral) => {
    const at = course.worldAt(s, lateral);
    return {
      x: Math.max(5, Math.min(width - 5, midX + (at.z - centre.z) * scale)),
      y: Math.max(5, Math.min(height - 5, midY + (at.x - centre.x) * scale)),
    };
  };
  ctx.clearRect(0, 0, width, height);
  ctx.beginPath();
  ctx.roundRect(midX - (straight / 2 + outerRadius) * scale, midY - outerRadius * scale,
    (straight + 2 * outerRadius) * scale, 2 * outerRadius * scale, outerRadius * scale);
  ctx.fillStyle = '#4b3526';
  ctx.strokeStyle = '#b49163';
  ctx.lineWidth = 2;
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#dcc6a6';
  ctx.fillRect(midX - bowl.spine.length * scale / 2, midY - 1.5, bowl.spine.length * scale, 3);
  for (const gate of bowl.gates ?? []) {
    const p = point(gate.s, wallOffset);
    ctx.fillStyle = '#f7ce76';
    ctx.fillRect(p.x - 4, p.y - 3, 8, 6);
  }
  const dot = (s, lateral, colour, size) => {
    const p = point(s, lateral);
    ctx.beginPath();
    ctx.arc(p.x, p.y, size, 0, 2 * Math.PI);
    ctx.fillStyle = colour;
    ctx.fill();
  };
  for (const truck of state.opponents ?? []) dot(truck.s, truck.lateral, truck.combatWrecking ? '#8a7a75' : '#ff9b62', 3);
  const rex = state.bowlNight?.event?.rex;
  if (rex) dot(rex.s, rex.lateral ?? rex.places.rail, '#ff664f', 4);
  dot(state.s, state.lateral, '#fff4cc', 4);
}


export function createBowlHud({stage, app, projectPlayer = () => null}) {
  const host = document.createElement('div');
  host.className = 'bowl-event-overlay';
  host.hidden = true;
  host.innerHTML = `<section class="bowl-hud" aria-label="Show Night">
    <div class="bowl-hud-title"><b class="bowl-hud-event"></b><span class="bowl-hud-goal"></span></div>
    <div class="bowl-hud-numbers"><span class="bowl-hud-score"></span><span class="bowl-hud-clock"></span>
      <span class="bowl-hud-gap" hidden></span><span class="bowl-hud-crush" hidden></span><span class="bowl-hud-chain" hidden></span></div>
    <label class="bowl-hud-crowd"><span></span><meter min="0" max="100" value="0"></meter></label>
  </section>
  <p class="bowl-hud-mo" role="status" hidden></p>
  <div class="bowl-trick-popup" role="status" hidden></div>
  <div class="bowl-hud-corner">
    <canvas class="bowl-plan" width="208" height="120" role="img" aria-label="Bowl floor, spine, gates and trucks" hidden></canvas>
    <section class="bowl-health" aria-label="Truck health" hidden>
      <div class="bowl-health-truck" aria-hidden="true">${ZONES.map(zone => `<i data-zone="${zone}"></i>`).join('')}<b class="bowl-health-hit" hidden></b></div>
      ${bowlSegmentsMarkup}
      <b class="bowl-health-alert" hidden>DANGER</b>
    </section>
  </div>`;
  stage.append(host);
  const find = selector => host.querySelector(selector);
  const caption = find('.bowl-hud-mo'), plan = find('.bowl-plan'), popup = find('.bowl-trick-popup');
  const healthNode = find('.bowl-health'), hitLabel = find('.bowl-health-hit'), danger = find('.bowl-health-alert');
  const segments = find('.bowl-health-segments'), zoneNodes = [...healthNode.querySelectorAll('[data-zone]')];
  const fields = [
    ['.bowl-hud-goal', view => view.goal],
    ['.bowl-hud-score', view => view.points],
    ['.bowl-hud-clock', view => view.time],
    ['.bowl-hud-gap', view => view.gapLabel],
    ['.bowl-hud-crush', view => view.crushLabel],
    ['.bowl-hud-chain', view => view.chainLabel],
    ['.bowl-hud-event', view => view.driver ? `${view.driver} IS DRIVING · ${view.name.toUpperCase()}` : view.name.toUpperCase()],
    ['.bowl-hud-crowd span', view => view.crowdLabel],
  ].map(([selector, value]) => [find(selector), value]);
  const meter = find('meter');
  let lastEvent, previousHealth, lastHit, lastPopups, popupSize;
  const text = (node, content) => { if (node.textContent !== content) node.textContent = content; };
  const hide = (node, hidden) => { if (node.hidden !== hidden) node.hidden = hidden; };
  return (state, course, view) => {
    hide(host, !view);
    if (!view) return;
    const night = state.bowlNight;
    if (lastEvent !== night.event) {
      lastEvent = night.event;
      previousHealth = lastHit = lastPopups = null;
    }
    for (const [node, value] of fields) {
      const label = value(view);
      text(node, label);
      hide(node, !label);
    }
    if (meter.value !== view.crowd) meter.value = view.crowd;
    hide(caption, !view.caption);
    text(caption, view.caption ? `BIG MO: ${view.caption}` : '');

    const tricks = lastEvent.trickPopups ?? [];
    const popups = tricks.map(trick => bowlTrickPopup(trick, night.clock)).filter(Boolean);
    const marker = popups.length ? projectPlayer() : null;
    hide(popup, !marker?.visible);
    if (!popup.hidden) {
      if (lastPopups !== tricks) {
        popup.innerHTML = popups.map(trick => `<p><b>${trick.name}</b> <span>${trick.points}</span>${trick.fresh ? ' <em>NEW</em>' : ''}</p>`).join('');
        lastPopups = tricks;
        popupSize = null;
      }
      const width = stage.clientWidth, height = stage.clientHeight;
      if (!popupSize || popupSize.width !== width || popupSize.height !== height) {
        popupSize = {width, height, half: popup.offsetWidth / 2, top: popup.offsetHeight + 12};
      }
      const left = Math.max(popupSize.half, Math.min(width - popupSize.half, marker.x * width));
      popup.style.left = `${left}px`;
      popup.style.top = `${Math.max(marker.y * height, popupSize.top)}px`;
    }
    const fight = bowlFightActive(state);
    hide(plan, !(fight || state.bowlOutside) || !course.features?.bowl);
    if (!plan.hidden) drawPlan(plan, state, course);
    hide(healthNode, !fight);
    if (!fight) return;
    const health = bowlHealthOf(state);
    const hit = bowlHealthHit(previousHealth, health);
    if (hit) {
      lastHit = {...hit, until: night.clock + .7};
      playBowlHudCue(app, 'bowl.health.hit');
      if (health.danger && !previousHealth.danger) playBowlHudCue(app, 'bowl.health.danger');
    }
    previousHealth = health;
    const showHit = lastHit && lastHit.until > night.clock;
    drawBowlSegments(segments, health);
    for (const zone of zoneNodes) {
      const tone = healthTone(health.zones[zone.dataset.zone]);
      if (zone.dataset.tone !== tone) zone.dataset.tone = tone;
      zone.classList.toggle('bowl-zone-hit', !!showHit && (!lastHit.zone || lastHit.zone === zone.dataset.zone));
    }
    hide(hitLabel, !showHit);
    if (showHit) {
      if (hitLabel.dataset.zone !== (lastHit.zone ?? '')) hitLabel.dataset.zone = lastHit.zone ?? '';
      text(hitLabel, `−${lastHit.lost}`);
      hitLabel.style.transform = `translateY(-${(.7 - (lastHit.until - night.clock)) * 28}px)`;
    }
    hide(danger, !health.danger);
    const label = `Truck health ${whole(health.value)} of ${whole(health.max)}${health.danger ? ', danger' : ''}`;
    if (healthNode.getAttribute('aria-label') !== label) healthNode.setAttribute('aria-label', label);
  };
}
