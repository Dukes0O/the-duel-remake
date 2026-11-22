// Read-only presentation for the Bowl. These views can also be checked without a DOM.
import {crowdAfter} from './bowl-show.js';
import {SECRETS, secretOf} from './bowl-secrets.js';
import {BOWL_FLOOR} from './bowl-course.js';
import {rexPullProgress} from './bowl-rex.js';
import {BIG_MO, BOWL_GOALS} from './bowl-lines.js';
export const BOWL_HUD_SOUNDS = Object.freeze({
  'bowl.health.hit': 'bowl.health.hit',
  'bowl.health.danger': 'bowl.health.danger',
  'bowl.card.open': 'bowl.card.open',
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
    case 'scrapasaurus': return BOWL_GOALS.scrapasaurus(event?.rex);
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

function bestGoLabel(type, bestGo) {
  if (!bestGo) return '';
  const result = whole(bestGo.result);
  if (type === 'longJump') return `BEST GO: ${result} ${bestGo.result === 1 ? 'BUS' : 'BUSES'}`;
  if (type === 'highJump') return `BEST GO: ${result} m`;
  if (type === 'bestTrick') return `BEST GO: ${result} POINTS`;
  return '';
}

function sideBySideGap(state, event) {
  const rival = state.opponents?.[0];
  if (!rival || !event?.finishS) return '';
  const playerLeft = event.finishS.player - state.s, rivalLeft = event.finishS.rival - rival.s;
  const metres = Math.round(rivalLeft - playerLeft);
  if (!Number.isFinite(metres)) return '';
  return `${metres > 0 ? 'AHEAD' : metres < 0 ? 'BEHIND' : 'LEVEL'} ${whole(Math.abs(metres))} m`;
}

export function arenaTrickStrip(state) {
  const show = state.arenaTrickShow;
  if (!show) return null;
  const event = show.event, crowd = Math.round(crowdAfter(event.crowd, show.clock-event.crowdAt));
  return {name:'Tricks', points:whole(event.score)+' points', crowd, crowdLabel:'CROWD x'+(1+crowd/100).toFixed(1)};
}
export function bowlGateLabel(state) {
  const gate = state.bowlOutside?.gate;
  return gate ? `${gate.name.toUpperCase()} · ${whole(Math.max(0, gate.metres))} m` : '';
}

export function bowlStrip(state, view, rivalName = () => null) {
  if (!view) return null;
  const night = state.bowlNight, event = night?.event;
  const crush = view.event === 'carCrush' && Number.isFinite(event?.count);
  const rivalTrick = view.event === 'bestTrick' ? event?.go?.rival : null;
  const rounds = rivalTrick ? event.goes : [];
  const wonRounds = rounds.filter(go => go.won).length;
  const trick = event?.trickPopups?.[0];
  const showingTrick = Number.isFinite(trick?.multiplier) && popupActive(trick, night?.clock);
  const freestyle = view.event === 'freestyle' ? event : null;
  const challenger = freestyle?.rivalName?.toUpperCase();
  const margin = challenger ? view.score - freestyle.rivalScore : 0;
  const gap = margin === 0 ? 'TIED' : `${margin > 0 ? 'AHEAD' : 'BEHIND'} BY ${whole(Math.abs(margin))}`;
  const featured = freestyle ? (night.featuredTricks ?? []).map(kind => kind === 'doubles' ? 'Doubles'
    : BOWL_TRICK_GUIDE.find(trick => trick.kind === kind)?.name).filter(Boolean) : [];
  const crowd = showingTrick ? Math.round((trick.multiplier - 1) * 100) : view.crowd;
  const multiplier = showingTrick ? popupMultiplier(trick.multiplier) : (1 + crowd / 100).toFixed(1);
  return {
    name: view.name, goal: shortGoal(view, event, rivalName), driver: view.driver,
    points: challenger ? '' : `${whole(view.score)} points`,
    time: view.timeLeft == null && view.event !== 'scrapasaurus' ? '' : clock(view.timeLeft ?? state.stageTimeSec ?? 0),
    crowd, crowdLabel: `CROWD x${multiplier}`, caption: view.caption,
    rexPull: rexPullProgress(event?.rex), rexPullPoint: event?.rex?.hook.tip ?? null,
    gapLabel: challenger ? `YOU ${whole(view.score)}, ${challenger} ${whole(freestyle.rivalScore)}, ${gap}`
      : rivalTrick ? `ROUND ${event.go.number} OF 3` : view.event === 'sideBySide' ? sideBySideGap(state, event) : '',
    freestyleBeaten: freestyle?.rivalBeaten ? `${challenger} BEATEN` : '',
    freestylePopup: challenger && popupActive(freestyle.rivalPopup, night.clock)
      ? `${challenger}: ${freestyle.rivalPopup.trick.toUpperCase()} ${whole(freestyle.rivalPopup.points)}` : '',
    crushLabel: rivalTrick ? `BIG KETTLE: ${rivalTrick.trick.toUpperCase()} ${whole(rivalTrick.points)}`
      : !crush ? '' : event.count >= view.target ? `CRUSHED ${event.count} OF ${event.total} · GOAL MET`
      : `CRUSHED ${event.count} OF ${view.target}`,
    bestGoLabel: bestGoLabel(view.event, event?.bestGo),
    gateLabel: bowlGateLabel(state),
    chainLabel: rivalTrick ? `YOU ${wonRounds}, BIG KETTLE ${rounds.length - wonRounds}`
      : crush && event.chain > 1 ? `CHAIN x${event.chain}`
      : featured.length ? `TONIGHT: ${featured.map(name => name.toUpperCase() + ' x2').join(', ')}` : '',
  };
}

export function freestyleBestLabel(view, score) {
  if (!view.freestyleBeaten) return '';
  return Number.isSafeInteger(score) && score >= 0
    ? `${view.freestyleBeaten} · YOUR BEST ${whole(score)}` : view.freestyleBeaten;
}

export function bowlOpeningLines(night, lent) {
  return [BIG_MO[`night.${night}.open`], BIG_MO[`night.${night}.freestyleFloor`],
    lent ? BIG_MO['lent.truck'] : null].filter(Boolean);
}

export function bowlTrickPopup(record, now) {
  if (!popupActive(record, now)) return null;
  if (record.notice) return {name: record.notice, points: record.detail ?? '', fresh: false};
  const trick = BOWL_TRICK_GUIDE.find(entry => entry.kind === record.kind);
  const name = trick?.name ?? secretOf(record.kind)?.name ?? (record.kind === 'cyclone' ? 'Cyclone' : '');
  if (!name) return null;
  const prefix = record.kind === 'cyclone' || record.turns < 2 ? '' :
    record.turns === 2 ? 'Double ' : record.turns === 3 ? 'Triple ' : `${record.turns}× `;
  const base = Number(record.base.toFixed(1));
  const multiplier = popupMultiplier(record.multiplier);
  const relation = Math.round(base * Number(multiplier)) === record.points ? '=' : '≈';
  return {name: (prefix + name).toUpperCase(),
    points: `${base.toLocaleString('en-US')} x${multiplier} ${relation} ${whole(record.points)}`, fresh: record.fresh};
}

export function bowlTrickPopups(event, now) {
  const records = event.crushPopup ? [...(event.trickPopups ?? []), event.crushPopup] : event.trickPopups ?? [];
  return records.map(trick => bowlTrickPopup(trick, now)).filter(Boolean);
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

// Three views of the same truck, projected from the actual trick pose.
function secretPicture(trick) {
  const samples = [.11, .39, .72].map((time,index) => {
    const {pitch,yaw,roll} = trick.pose(time);
    const point = ([x,y,z]) => {
      const xr = x*Math.cos(roll)-y*Math.sin(roll), yr = x*Math.sin(roll)+y*Math.cos(roll);
      const yp = yr*Math.cos(pitch)-z*Math.sin(pitch), zp = yr*Math.sin(pitch)+z*Math.cos(pitch);
      const xw = xr*Math.cos(yaw)+zp*Math.sin(yaw), zw = zp*Math.cos(yaw)-xr*Math.sin(yaw);
      return [(16+33*index+zw+.32*xw).toFixed(1), (19-yp+.22*xw).toFixed(1)];
    };
    const body = [[-3,0,-10],[-3,4,-10],[-3,4,-5],[-3,7,-3],[-3,7,3],[-3,4,6],[-3,3,10],[-3,0,10]];
    const wheels = [-6,6].map(z => { const [x,y] = point([-3,-1,z]);
      return '<circle cx="'+x+'" cy="'+y+'" r="2.7" fill="#232024" stroke="#ffd596"/>'; }).join('');
    return '<polygon points="'+body.map(p=>point(p).join(',')).join(' ')+'" fill="#e29b4c"/>'+wheels;
  }).join('');
  return '<svg class="bowl-trick-picture" viewBox="0 0 98 35" role="img" aria-label="'+trick.name+' in three poses">'+samples+'</svg>';
}
export function secretCardMarkup(found = []) {
  const rows = SECRETS.map(trick => {
    if (!found.includes(trick.id)) return '<li aria-label="Undiscovered secret trick">? ? ?</li>';
    const entry = {kind: trick.id, name: trick.name, points: trick.points + ' points.',
      keys: (trick.code.length ? trick.code : ['Front flip', 'Backflip']).map(key => [key])};
    return '<li>' + bowlTrickEntryMarkup(entry, true) + '</li>';
  });
  return '<h3>SECRET TRICKS: ' + SECRETS.filter(t => found.includes(t.id)).length + ' of 7</h3><ul>' + rows.join('') + '</ul>';
}
export function bowlTrickEntryMarkup(entry, done = false) {
  const keys = entry.keys.map(group => group.map(key => `<kbd>${key}</kbd>`).join(' ')).join(' then ');
  return `${secretOf(entry.kind) ? secretPicture(secretOf(entry.kind)) : `<div class="bowl-trick-picture" data-trick="${entry.kind}" aria-hidden="true"><i></i></div>`}
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


export function offscreenRexPull(view, projectPoint) {
  if (view.rexPull == null || !view.rexPullPoint || projectPoint(view.rexPullPoint)?.visible) return null;
  return Math.round(view.rexPull * 100);
}

export function bowlWaypoint(state, course, projectPoint, aspect = 1) {
  const outside = state.bowlOutside, gate = outside?.gate;
  const crush = state.bowlNight?.event?.crushHint;
  if (!gate && !crush) return null;
  if (gate) {
    const inside = outside.where === 'stands';
    const boundary = course.features.bowl.outside;
    const point = course.worldAt(gate.s, inside ? boundary.wall : boundary.back);
    const arch = projectPoint({...point, y: inside ? 8 : 5.8});
    if (arch?.visible && arch.y > .13) {
      return {x: Math.max(.02, Math.min(.98, arch.x)), y: Math.min(.98, arch.y), angle: 180, edge: false};
    }
  }
  const target = gate ? {...gate.aim, y: 2.5} : crush;
  const marker = projectPoint(target);
  if (!marker) return null;
  const dx = (marker.guideX ?? marker.x) - .5;
  const dy = (marker.guideY ?? marker.y) - .5;
  const scale = Math.max(Math.abs(dx) / .46, Math.abs(dy) / (dy > 0 ? .40 : .32));
  if (scale) return {x: .5 + dx / scale, y: .5 + dy / scale, angle: Math.atan2(dx * aspect, -dy) * 180 / Math.PI, edge: true};
  return marker.behind ? {x: .96, y: .5, angle: 90, edge: true} : {x: .5, y: .18, angle: 0, edge: true};
}

export function createBowlHud({stage, app, projectPlayer = () => null}) {
  const host = document.createElement('div');
  host.className = 'bowl-event-overlay';
  host.hidden = true;
  host.innerHTML = `<div class="bowl-event-panels"><section class="bowl-hud" aria-label="Show Night">
    <div class="bowl-hud-title"><b class="bowl-hud-event"></b>
      <div style="display:flex;align-items:center;gap:8px"><span class="bowl-hud-goal"></span><span class="bowl-hud-gate" hidden></span>
      <span class="bowl-hud-pull" hidden><svg width="25" height="25" viewBox="0 0 24 24" fill="none" role="progressbar"
        aria-label="Battery pull" aria-valuemin="0" aria-valuemax="100">
        <circle cx="12" cy="12" r="9" stroke="currentColor" opacity=".3" stroke-width="3"></circle>
        <circle cx="12" cy="12" r="9" pathLength="100" transform="rotate(-90 12 12)" stroke="#ffe19b"
          stroke-width="3" stroke-linecap="round" stroke-dasharray="0 100"></circle>
      </svg></span></div></div>
    <div class="bowl-hud-numbers"><span class="bowl-hud-score"></span><span class="bowl-hud-clock"></span>
      <span class="bowl-hud-gap" hidden></span><span class="bowl-hud-crush" hidden></span><span class="bowl-hud-chain" hidden></span>
      <span class="bowl-hud-best-go" hidden></span><span class="bowl-hud-rival-trick" role="status" hidden></span>
      <span class="bowl-hud-freestyle-best" hidden></span></div>
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
  </div></div>
  <span class="bowl-waypoint" aria-hidden="true" hidden>▲</span>`;
  stage.append(host);
  const find = selector => host.querySelector(selector);
  const strip = find('.bowl-hud');
  const caption = find('.bowl-hud-mo'), plan = find('.bowl-plan'), popup = find('.bowl-trick-popup');
  const panels = find('.bowl-event-panels'), waypoint = find('.bowl-waypoint');
  const healthNode = find('.bowl-health'), hitLabel = find('.bowl-health-hit'), danger = find('.bowl-health-alert');
  const segments = find('.bowl-health-segments'), zoneNodes = [...healthNode.querySelectorAll('[data-zone]')];
  const fields = [
    ['.bowl-hud-goal', view => view.gateLabel ? '' : view.goal],
    ['.bowl-hud-gate', view => view.gateLabel],
    ['.bowl-hud-score', view => view.points],
    ['.bowl-hud-clock', view => view.time],
    ['.bowl-hud-gap', view => view.gapLabel],
    ['.bowl-hud-crush', view => view.crushLabel],
    ['.bowl-hud-chain', view => view.chainLabel],
    ['.bowl-hud-best-go', view => view.bestGoLabel],
    ['.bowl-hud-rival-trick', view => view.freestylePopup],
    ['.bowl-hud-freestyle-best', view => freestyleBestLabel(view, app.profile?.bowl?.bestScores?.freestyle)],
    ['.bowl-hud-event', view => view.driver ? `${view.driver} IS DRIVING · ${view.name.toUpperCase()}` : view.name.toUpperCase()],
    ['.bowl-hud-crowd span', view => view.crowdLabel],
  ].map(([selector, value]) => [find(selector), value]);
  const meter = find('meter'), pullRing = find('.bowl-hud-pull'), pullGraphic = pullRing.firstElementChild;
  const pullArc = pullGraphic.lastElementChild;
  let lastEvent, previousHealth, lastHit, lastPopups, popupSize;
  const text = (node, content) => { if (node.textContent !== content) node.textContent = content; };
  const hide = (node, hidden) => { if (node.hidden !== hidden) node.hidden = hidden; };
  return (state, course, view, schoolOutside = false) => {
    hide(host, !view && !schoolOutside);
    if (host.hidden) return;
    hide(panels, !view);
    const guiding = state.bowlOutside?.gate || state.bowlNight?.event?.crushHint;
    const direction = guiding ? bowlWaypoint(state, course, projectPlayer, stage.clientWidth / Math.max(1, stage.clientHeight)) : null;
    hide(waypoint, !direction);
    if (direction) {
      waypoint.style.left = `${direction.x * 100}%`;
      waypoint.style.top = `${direction.y * 100}%`;
      waypoint.style.transform = `translate(-50%, -50%) rotate(${direction.angle}deg)`;
    }
    if (!view) return;
    const night = state.bowlNight ?? state.arenaTrickShow;
    if (lastEvent !== night.event) {
      lastEvent = night.event;
      const eventType = state.bowlNight?.event?.type;
      if (eventType) strip.dataset.event = eventType;
      else delete strip.dataset.event;
      previousHealth = lastHit = lastPopups = null;
    }
    for (const [node, value] of fields) {
      const label = value(view) ?? '';
      text(node, label);
      hide(node, !label);
    }
    if (meter.value !== view.crowd) meter.value = view.crowd;
    const pull = offscreenRexPull(view, projectPlayer);
    hide(pullRing, pull == null);
    if (pull != null && pullGraphic.getAttribute('aria-valuenow') !== String(pull)) {
      pullGraphic.setAttribute('aria-valuenow', String(pull));
      pullArc.setAttribute('stroke-dasharray', `${pull} 100`);
    }
    hide(caption, !view.caption);
    text(caption, view.caption ? `BIG MO: ${view.caption}` : '');

    const popups = bowlTrickPopups(lastEvent, night.clock);
    if (state.bowlSecretSavePending && popups.some(t => t.name === 'SECRET TRICK FOUND'))
      popups.push({name: 'SAVED FOR THIS SESSION', points: 'Local save unavailable.'});
    const marker = popups.length ? projectPlayer() : null;
    hide(popup, !marker?.visible);
    if (!popup.hidden) {
      const markup = popups.map(trick => `<p><b>${trick.name}</b> <span>${trick.points}</span>${trick.fresh ? ' <em>NEW</em>' : ''}</p>`).join('');
      if (lastPopups !== markup) {
        popup.innerHTML = markup;
        lastPopups = markup;
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
