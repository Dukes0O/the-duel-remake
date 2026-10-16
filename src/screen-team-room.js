import {INTEL_PRICES} from './intel-levels.js';
import {compareLapTelemetry} from './lap-telemetry.js';
import {referenceSpeedColour, cornerId, wrap} from './track-analysis.js';

const escape = value => String(value ?? '').replace(/[&<>"']/g,
  char => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[char]));
const time = milliseconds => `${Math.floor(milliseconds / 60000)}:${(milliseconds % 60000 / 1000).toFixed(3).padStart(6, '0')}`;
const kindName = {corner: 'Corner', crest: 'Crest', overtaking: 'Passing zone', signature: 'Signature view'};
const symbol = {corner: '•', crest: '↑', overtaking: '↗', signature: '★'};

// Flags that sit close together on the map (a crest on the exit of a corner, a
// signature view on a crest) would otherwise hide each other and could not be
// clicked one by one. Push them apart until every flag has its own spot; the
// true position stays in anchorX/anchorY for the thin line drawn back to it.
export const MAP_FLAG_GAP = 46;
// `fixed` lists spots that never move (the numbered corner circles): a flag keeps `fixedGap` away from each, so
// a flag never sits on a circle and hides the number that opens the same corner.
export const MAP_CIRCLE_GAP = 28;
export function spreadMarkers(points, {gap = MAP_FLAG_GAP, minX = 24, maxX = 976, minY = 28, maxY = 662, fixed = [], fixedGap = MAP_CIRCLE_GAP} = {}) {
  const spots = points.map((point, index) => ({...point, index}));
  for (let pass = 0; pass < 80; pass++) {
    let moved = false;
    for (let a = 0; a < spots.length; a++) for (let b = a + 1; b < spots.length; b++) {
      let dx = spots[b].x - spots[a].x, dy = spots[b].y - spots[a].y, distance = Math.hypot(dx, dy);
      if (distance >= gap) continue;
      if (distance < 1e-6) {const angle = (a * 2.399963 + b) % (Math.PI * 2);dx = Math.cos(angle);dy = Math.sin(angle);distance = 1;}
      const push = (gap - distance) / 2 + .05, ux = dx / distance, uy = dy / distance;
      spots[a].x -= ux * push;spots[a].y -= uy * push;spots[b].x += ux * push;spots[b].y += uy * push;moved = true;
    }
    for (const spot of spots) for (const anchor of fixed) {
      let dx = spot.x - anchor.x, dy = spot.y - anchor.y, distance = Math.hypot(dx, dy);
      if (distance >= fixedGap) continue;
      if (distance < 1e-6) {dx = 0;dy = -1;distance = 1;}
      const push = fixedGap - distance + .05;
      spot.x += dx / distance * push;spot.y += dy / distance * push;moved = true;
    }
    for (const spot of spots) {spot.x = Math.min(maxX, Math.max(minX, spot.x));spot.y = Math.min(maxY, Math.max(minY, spot.y));}
    if (!moved) break;
  }
  return spots;
}

// Corner name labels. Each label takes a spot beside its numbered circle that touches no flag marker, no
// other circle, no START mark and no other label, preferring spots that keep the label off the road. A
// label with no free spot is hidden; it still shows when its corner is the selected flag.
export const MAP_LABEL = {height: 16, charWidth: 7.6, margin: 3, gap: 6, circle: 14, flag: 13};
const rectsTouch = (a, b) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
const grow = (rect, by) => ({x0: rect.x0 - by, y0: rect.y0 - by, x1: rect.x1 + by, y1: rect.y1 + by});
const around = (x, y, half) => ({x0: x - half, y0: y - half, x1: x + half, y1: y + half});

export function placeMapLabels(corners, flags, start, roadPoints, {width = 1000, height = 690} = {}) {
  const {height: labelHeight, charWidth, margin, gap, circle} = MAP_LABEL;
  const blocks = [
    ...flags.map(flag => ({rect: around(flag.x, flag.y, MAP_LABEL.flag + margin)})),
    ...corners.map((corner, index) => ({owner: index, rect: around(corner.x, corner.y, circle + margin)})),
    {rect: {x0: start.x - 14, y0: start.y - 12, x1: start.x + 62, y1: start.y + 12}},
  ];
  const spotsFor = corner => {
    const labelWidth = Math.ceil(corner.authoredName.length * charWidth) + 4;
    const near = circle + gap, middleX = corner.x - labelWidth / 2, middleY = corner.y - labelHeight / 2;
    const spots = [
      {anchor: 'start', x0: corner.x + near, y0: middleY},                                  // right of the circle
      {anchor: 'end', x0: corner.x - near - labelWidth, y0: middleY},                       // left of the circle
      {anchor: 'middle', x0: middleX, y0: corner.y - near - labelHeight},                   // above
      {anchor: 'middle', x0: middleX, y0: corner.y + near},                                 // below
      {anchor: 'start', x0: corner.x + circle - 2, y0: corner.y - near - labelHeight + 2},  // above and right
      {anchor: 'end', x0: corner.x - circle + 2 - labelWidth, y0: corner.y - near - labelHeight + 2},
      {anchor: 'start', x0: corner.x + circle - 2, y0: corner.y + near - 2},                // below and right
      {anchor: 'end', x0: corner.x - circle + 2 - labelWidth, y0: corner.y + near - 2},
    ];
    // Corners on the right half of the map try the left side first, so labels read inward.
    if (corner.x > width / 2) [spots[0], spots[1]] = [spots[1], spots[0]];
    return spots.map(spot => {
      const rect = {x0: spot.x0, y0: spot.y0, x1: spot.x0 + labelWidth, y1: spot.y0 + labelHeight};
      const textX = spot.anchor === 'start' ? rect.x0 : spot.anchor === 'end' ? rect.x1 : (rect.x0 + rect.x1) / 2;
      return {anchor: spot.anchor, rect, textX, textY: (rect.y0 + rect.y1) / 2 + 4};
    });
  };
  // Standing over the road costs a little; touching a marker, circle, START mark or another label is never allowed.
  const roadUnder = rect => roadPoints.filter(point =>
    point.x > rect.x0 - 5 && point.x < rect.x1 + 5 && point.y > rect.y0 - 5 && point.y < rect.y1 + 5).length;
  const crowding = corner => corners.filter(other => other !== corner && Math.hypot(other.x - corner.x, other.y - corner.y) < 110).length +
    flags.filter(flag => Math.hypot(flag.x - corner.x, flag.y - corner.y) < 90).length;
  const labels = new Array(corners.length).fill(null), taken = [];
  // The most crowded corners choose first, so a label is hidden only when its corner really has no room.
  const order = corners.map((corner, index) => index).filter(index => corners[index].authoredName)
    .sort((a, b) => crowding(corners[b]) - crowding(corners[a]) || a - b);
  for (const index of order) {
    const options = spotsFor(corners[index]);
    const best = options.map((option, rank) => ({option, rank}))
      .filter(({option}) => option.rect.x0 >= 2 && option.rect.x1 <= width - 2 && option.rect.y0 >= 2 && option.rect.y1 <= height - 2 &&
        !blocks.some(block => block.owner !== index && rectsTouch(grow(option.rect, margin), block.rect)) &&
        !taken.some(rect => rectsTouch(grow(option.rect, margin), rect)))
      .map(({option, rank}) => ({option, cost: roadUnder(option.rect) * 10 + rank}))
      .sort((a, b) => a.cost - b.cost)[0]?.option;
    labels[index] = {...(best ?? options[0]), hidden: !best};
    if (best) taken.push(best.rect);
  }
  return labels;
}

export function teamRoomMap(dossier) {
  const {analysis} = dossier, rows = analysis.profile.rows;
  const xs = rows.map(row => row.x), zs = rows.map(row => row.z);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minZ = Math.min(...zs), maxZ = Math.max(...zs);
  const scale = Math.min(860 / Math.max(1, maxX - minX), 590 / Math.max(1, maxZ - minZ));
  const project = (x, z) => ({x: 500 + (x - (minX + maxX) / 2) * scale,
    y: 345 - (z - (minZ + maxZ) / 2) * scale});
  const at = distance => {
    const index = Math.round(wrap(distance, analysis.profile.length) / analysis.profile.spacing) % rows.length;
    return project(rows[index].x, rows[index].z);
  };
  const flagIds = new Set(dossier.flags.filter(flag => flag.kind === 'corner').map(flag => flag.id));
  // Each pin rides above the spot it marks, then moves aside only if it crowds another.
  const pins = spreadMarkers(dossier.flags.map(flag => {const spot = at(flag.s);return {x: spot.x, y: spot.y - 24, anchorX: spot.x, anchorY: spot.y};}),
    // The START mark and its word are kept clear too, so a flag never hides them.
    {fixed: [...analysis.corners.map(corner => at(corner.apexS)), ...[22, 48].map(across => ({x: at(0).x + across, y: at(0).y}))]});
  const corners = analysis.corners.map(corner => ({...at(corner.apexS), id: cornerId(corner),
    flagId: flagIds.has(cornerId(corner)) ? cornerId(corner) : null,
    number: corner.number, name: corner.name || `Corner ${corner.number}`, authoredName: corner.name}));
  const flags = dossier.flags.map((flag, index) => ({...flag, x: pins[index].x, y: pins[index].y,
    anchorX: pins[index].anchorX, anchorY: pins[index].anchorY}));
  const start = at(0);
  const labels = placeMapLabels(corners, flags, start, analysis.mapPoints.map(([x, z]) => project(x, z)));
  return {
    segments: analysis.mapPoints.map(([x, z, mph], index) => {
      const next = analysis.mapPoints[(index + 1) % analysis.mapPoints.length];
      return {from: project(x, z), to: project(next[0], next[1]),
        colour: referenceSpeedColour(mph, analysis.reference.minMph, analysis.reference.topMph)};
    }),
    corners: corners.map((corner, index) => ({...corner, label: labels[index]})), flags, start,
  };
}

function mapMarkup(dossier) {
  const map = teamRoomMap(dossier);
  const segments = map.segments.map(({from, to, colour}) =>
    `<path d="M${from.x.toFixed(1)} ${from.y.toFixed(1)}L${to.x.toFixed(1)} ${to.y.toFixed(1)}" stroke="${colour}"/>`).join('');
  const leaders = map.flags.map(flag => `<line x1="${flag.anchorX.toFixed(1)}" y1="${flag.anchorY.toFixed(1)}" x2="${flag.x.toFixed(1)}" y2="${flag.y.toFixed(1)}"/><circle cx="${flag.anchorX.toFixed(1)}" cy="${flag.anchorY.toFixed(1)}" r="3.5"/>`).join('');
  const corner = item => {
    const label = item.flagId ? ` data-team-flag="${escape(item.flagId)}" role="button" tabindex="0" aria-pressed="false" aria-label="Corner ${item.number}: ${escape(item.name)}. Study the approach."` : '';
    // The name is drawn beside the circle, not inside the pressable marker, so the marker's own box stays on its circle.
    const name = item.label ? `<text x="${item.label.textX.toFixed(1)}" y="${item.label.textY.toFixed(1)}" text-anchor="${item.label.anchor}" class="team-map-name${item.label.hidden ? ' team-map-name-hidden' : ''}">${escape(item.authoredName)}</text>` : '';
    return `<g class="${item.flagId ? 'team-map-corner' : ''}" transform="translate(${item.x.toFixed(1)} ${item.y.toFixed(1)})"${label}><circle r="14"/><text text-anchor="middle" dy="5">${item.number}</text><title>${escape(item.name)}</title></g>${name}`;
  };
  return `<div class="team-map"><svg viewBox="0 0 1000 690" role="group" aria-label="${escape(dossier.name)}. Track coloured by reference speed. Numbered corners and start line.">
    <g fill="none" stroke-width="9" stroke-linecap="round">${segments}</g>
    <g transform="translate(${map.start.x.toFixed(1)} ${map.start.y.toFixed(1)})"><rect x="-10" y="-7" width="20" height="14" fill="#f0ead5" stroke="#081b24" stroke-width="3"/><text x="16" y="6" class="team-map-start">START</text></g>
    <g class="team-map-leaders" stroke-width="1.5">${leaders}</g>
    <g class="team-map-corners">${map.corners.map(corner).join('')}</g>
    </svg>${map.flags.map(flag => `<button type="button" class="team-map-flag team-kind-${flag.kind}" data-team-flag="${escape(flag.id)}" data-team-label="${escape(flag.title)}" style="left:${(flag.x / 10).toFixed(2)}%;top:${(flag.y / 6.9).toFixed(2)}%" aria-pressed="false" aria-label="${escape(kindName[flag.kind])}: ${escape(flag.title)}">${symbol[flag.kind]}</button>`).join('')}<div class="team-map-tip" data-team-tip role="presentation" hidden></div></div>`;
}

const levelOf = dossier => Number.isInteger(dossier.intelLevel) ? Math.max(0, Math.min(4, dossier.intelLevel)) : 4;
function intelLock(level, dossier) {
  if (level === 2) return '<p class="team-intel-lock">Corner notes locked. Drive 3 laps of this track in any mode.</p>';
  const requirement = level === 3 ? 'Finish in the top 5' : 'Finish on the podium';
  return '<section class="team-intel-lock"><h3>' + (level === 3 ? 'Telemetry locked' : 'Team ghost locked') + '</h3><p>' + requirement +
    ', or buy access.</p><button type="button" data-team-buy="' + level + '"' + (dossier.canBuyIntel === true ? '' : ' disabled') + '>' +
    INTEL_PRICES[level] + ' credits</button>' + (dossier.canBuyIntel === true ? '' : '<p>Return to the menu to buy intel.</p>') + '</section>';
}
function intelProgress(dossier) {
  if (!Object.hasOwn(dossier, 'intelLevel')) return '';
  const level = levelOf(dossier);
  return '<section class="team-intel-progress" aria-label="Track intel"><p>Intel level ' + level + ' of 4</p>' +
    (level < 2 ? intelLock(2, dossier) : '') + (level < 3 ? intelLock(3, dossier) : '') + (level < 4 ? intelLock(4, dossier) : '') +
    '<p role="status" data-team-intel-message>' + escape(dossier.intelMessage || '') + '</p></section>';
}

export function teamRoomMarkup(dossier) {
  const {analysis, reference} = dossier;
  const route = dossier.route === 'fixed' ? 'Circuit dossier' : dossier.route.replace('route_', 'Route ').toUpperCase();
  return `<section class="team-room" role="dialog" aria-modal="true" aria-labelledby="team-room-title">
    <header class="team-room-header"><div><p class="eyebrow">YOUR ENGINEER · ${escape(route)}</p><h2 id="team-room-title">${escape(dossier.name)}</h2></div><button type="button" class="shop-close" data-team-close aria-label="Close Team Room">×</button></header>
    <div class="team-room-summary"><span><b>${(analysis.profile.length / 1000).toFixed(2)} km</b> lap distance</span><span><b>${analysis.corners.length}</b> corners</span><span><b>${time(reference.lapMs)}</b> reference lap</span></div>
    <p class="team-reference-label">Reference lap: Stuttgart 959-S <span>· Club Driver · Medium · stock car</span></p>
    ${intelProgress(dossier)}
    <div class="team-room-body"><section class="team-map-panel" aria-label="Track map">${mapMarkup(dossier)}
      <div class="team-speed-key"><span>${Math.round(analysis.reference.minMph * 1.609344)} km/h</span><i aria-hidden="true"></i><span>${Math.round(analysis.reference.topMph * 1.609344)} km/h</span></div>
      ${levelOf(dossier) >= 3 ? '<div class="team-sector-strip">' + reference.sectorMs.map((value, index) => '<span>SECTOR ' + (index + 1) + '<b>' + time(value) + '</b></span>').join('') + '</div>' : ''}
      <details class="team-corner-index"><summary>All corners</summary><ol>${analysis.corners.map(corner => `<li>${escape(corner.name || `Corner ${corner.number}`)} <span>${corner.direction === 'L' ? 'Left' : 'Right'} · ${corner.radius} m radius</span></li>`).join('')}</ol></details>
    </section><aside class="team-study-panel" aria-label="Study a track feature"><h3>Study the approach</h3><p class="team-study-intro">Choose a flag, on the list or on the map, to see the corner from above.</p>
      <div class="team-flag-list">${dossier.flags.map(flag => `<button type="button" data-team-flag="${escape(flag.id)}" data-team-snapshot-s="${flag.snapshotS}" data-team-camera-up="${flag.camera.up}" data-team-camera-ahead="${flag.camera.ahead}" data-team-kind="${flag.kind}" aria-pressed="false"><span class="team-flag-symbol">${symbol[flag.kind]}</span><span><small>${escape(kindName[flag.kind])} · ${Math.round(flag.s)} m</small><b>${escape(flag.title)}</b></span></button>`).join('')}</div>
      <section class="team-snapshot-panel" aria-live="polite"><h4 data-team-feature-title>Choose a flag</h4><div class="team-snapshot" data-team-snapshot></div><p class="team-snapshot-status" data-team-status role="status">The current track will be rendered when you select a feature.</p><div class="team-engineer" data-team-note></div></section>
    </aside></div><div data-team-telemetry>${levelOf(dossier) >= 3 ? telemetryMarkup(dossier) : ''}</div></section>`;
}

export function engineerMarkup(flag, {intelLevel = 4} = {}) {
  if (intelLevel < 2) return intelLock(2, {});
  const note = flag.engineer ?? {}, values = [];
  if (Number.isFinite(note.brakeBoard)) values.push(`Brake at the ${note.brakeBoard} m board.`);
  if (Number.isFinite(note.gear)) values.push(`Gear ${note.gear}.`);
  if (Number.isFinite(note.targetKph)) values.push(`Target ${note.targetKph} km/h.`);
  return `<p class="eyebrow">YOUR ENGINEER</p>${values.length ? `<p class="team-note-values">${escape(values.join(' '))}</p>` : ''}<p>${escape(note.line)}</p><p>${escape(note.note)}</p>${flag.kind === 'corner' ? '<small>View shown from above and behind the suggested braking point.</small>' : ''}`;
}

// Owns only DOM and transient canvases. All course/reference data and native
// renderer access arrive through read-only providers from the router.
export function createTeamRoom({host, getDossier, capture, clearCapture, buyIntel = () => ({ok:false,reason:'Purchasing is unavailable.'}), onClose = () => {}}) {
  const layer = document.createElement('div');
  layer.className = 'team-room-layer';layer.hidden = true;host.append(layer);
  const events = new AbortController();
  let dossier = null, returnFocus = null, request = 0, captureAbort = null;
  // Bring the chosen flag into view in the list without moving the whole page.
  function showInList(id) {
    const list = layer.querySelector('.team-flag-list'), item = list?.querySelector(`[data-team-flag="${CSS.escape(id)}"]`);
    if (!list || !item) return;
    const listBox = list.getBoundingClientRect(), itemBox = item.getBoundingClientRect();
    list.scrollTop += itemBox.top - listBox.top - (list.clientHeight - itemBox.height) / 2;
  }
  // One small name label for the map, shared by every marker (no clipping at the edges).
  function showTip(marker) {
    const tip = layer.querySelector('[data-team-tip]'), map = marker?.closest('.team-map');
    if (!tip || !map) return;
    const label = marker.dataset.teamLabel || marker.querySelector('title')?.textContent;
    if (!label) return;
    tip.textContent = label;tip.hidden = false;
    const mapBox = map.getBoundingClientRect(), box = marker.getBoundingClientRect();
    const x = Math.min(mapBox.width - tip.offsetWidth - 6, Math.max(6, box.left - mapBox.left + box.width / 2 - tip.offsetWidth / 2));
    const above = box.top - mapBox.top - tip.offsetHeight - 6, below = box.bottom - mapBox.top + 6;
    tip.style.left = `${x}px`;tip.style.top = `${above >= 4 ? above : below}px`;
  }
  const hideTip = () => {const tip = layer.querySelector('[data-team-tip]');if (tip) tip.hidden = true;};
  async function select(id) {
    const flag = dossier?.flags.find(item => item.id === id);
    if (!flag) return;
    const ticket = ++request;
    captureAbort?.abort();captureAbort = new AbortController();
    layer.querySelectorAll('[data-team-flag]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.teamFlag === id)));
    showInList(id);
    layer.querySelector('[data-team-feature-title]').textContent = flag.title;
    layer.querySelector('[data-team-note]').innerHTML = engineerMarkup(flag, {intelLevel:levelOf(dossier)});
    const picture = layer.querySelector('[data-team-snapshot]'), status = layer.querySelector('[data-team-status]');
    picture.replaceChildren();status.textContent = 'Rendering the current track…';
    try {
      const canvas = await capture(dossier, flag, {signal: captureAbort.signal});
      if (ticket !== request || layer.hidden) return;
      canvas.setAttribute('role', 'img');canvas.setAttribute('aria-label', `${flag.title}. View from above the approach on ${dossier.name}.`);
      picture.replaceChildren(canvas);status.textContent = `Live track view · from above the ${flag.kind === 'corner' ? 'braking point' : 'approach'}`;
    } catch (error) {
      if (ticket === request && !layer.hidden) status.textContent = `Track view unavailable. ${error.message}`;
    }
  }
  function close() {
    if (layer.hidden) return;
    request++;captureAbort?.abort();captureAbort = null;clearCapture();layer.replaceChildren();layer.hidden = true;dossier = null;
    returnFocus?.focus({preventScroll: true});returnFocus = null;onClose();
  }
  layer.addEventListener('click', event => {
    if (event.target.closest('[data-team-close]')) close();
    const purchase = event.target.closest('[data-team-buy]');
    if (purchase && !purchase.disabled && dossier) {
      const result = buyIntel(dossier.courseId, Number(purchase.dataset.teamBuy));
      const next = getDossier(dossier.courseId);
      if (!next) {close();return;}
      const reasons = {credits:'Not enough credits.', unavailable:'Intel is unavailable for this track or profile.'};
      const message = result.ok ? (result.saved === false ? 'Intel unlocked for this session. Saving is unavailable.' : 'Intel unlocked.') :
        reasons[result.reason] || result.reason || 'Intel could not be purchased.';
      request++;captureAbort?.abort();captureAbort = null;clearCapture();dossier = next;
      layer.innerHTML = teamRoomMarkup({...dossier,intelMessage:message});
      layer.querySelector('[data-team-close]').focus({preventScroll:true});
      return;
    }
    const flag = event.target.closest('[data-team-flag]');
    if (flag) select(flag.dataset.teamFlag);
  }, {signal: events.signal});
  for (const [type, show] of [['pointerover', true], ['focusin', true], ['pointerout', false], ['focusout', false]])
    layer.addEventListener(type, event => {
      const marker = event.target.closest?.('.team-map [data-team-flag]');
      if (marker) show ? showTip(marker) : hideTip();
    }, {signal: events.signal});
  layer.addEventListener('keydown', event => {
    if (event.code === 'Escape') {event.preventDefault();event.stopPropagation();close();return;}
    // The numbered corners on the map are drawn in SVG, so give them the button keys.
    const mapCorner = event.target.closest?.('g[data-team-flag]');
    if (mapCorner && (event.code === 'Enter' || event.code === 'Space')) {event.preventDefault();select(mapCorner.dataset.teamFlag);return;}
    if (event.code !== 'Tab') return;
    const buttons = [...layer.querySelectorAll('button:not(:disabled),summary')], first = buttons[0], last = buttons.at(-1);
    if (event.shiftKey && document.activeElement === first) {event.preventDefault();last?.focus();}
    else if (!event.shiftKey && document.activeElement === last) {event.preventDefault();first?.focus();}
  }, {signal: events.signal});
  return {
    open(eventId, trigger) {
      const next = getDossier(eventId);
      if (!next) return false;
      request++;captureAbort?.abort();captureAbort = null;clearCapture();dossier = next;returnFocus = trigger ?? document.activeElement;
      layer.innerHTML = teamRoomMarkup(dossier);layer.hidden = false;
      layer.querySelector('[data-team-close]').focus({preventScroll: true});
      return true;
    },
    close, get isOpen() { return !layer.hidden; },
    dispose() {close();events.abort();layer.remove();},
  };
}

export function telemetryMarkup(dossier){
  if (levelOf(dossier) < 3) return intelLock(3, dossier);
  const view=dossier.telemetry;
  if(!view||view.status==='off')return '';
  const {lap}=view,comparison=compareLapTelemetry(lap,dossier.reference);
  if(!lap||comparison.status!=='ready')return `<section class="team-telemetry"><h3>Your best lap</h3><p>${escape(lap?'Lap comparison is unavailable for this track version.':view.message)}</p></section>`;
  const reference=dossier.reference,length=lap.courseLength;
  const maximum=Math.max(1,...lap.trace.map(row=>row[1]),...reference.trace.map(row=>row[1]));
  const points=trace=>trace.map(([s,kph])=>`${(50+s/length*820).toFixed(1)},${(170-kph/maximum*140).toFixed(1)}`).join(' ');
  const delta=value=>`${value>0?'+':value<0?'−':''}${(Math.abs(value)/1000).toFixed(3)} s`;
  const names=new Map(dossier.analysis.corners.map(corner=>[cornerId(corner),corner.name||`Corner ${corner.number}`]));
  return `<section class="team-telemetry" style="padding:22px;border-top:1px solid #435458"><h3>Your best lap · ${time(lap.lapMs)}</h3>
    <p>${escape(lap.playerName)} · ${escape(lap.car.replaceAll('_',' '))} · ${escape(lap.mode)} · ${escape(lap.tyre)} tyres</p>
    ${view.message?`<p role="status">${escape(view.message)}</p>`:''}
    <p><b style="color:#7ae0ed">Your speed</b> · <b style="color:#ecc77d">Reference lap: Stuttgart 959-S</b> · ${delta(comparison.deltaMs)}</p>
    <svg data-telemetry-speed viewBox="0 0 900 215" role="img" aria-label="Speed in kilometres per hour over lap distance. Your best lap is cyan; the Stuttgart reference is gold." style="display:block;width:100%;max-height:260px;background:#0c2028;border-radius:8px">
      <path d="M50 20V170H870" fill="none" stroke="#728387"/>
      <text x="8" y="28" fill="#eee" font-size="14">${maximum}</text><text x="8" y="174" fill="#eee" font-size="14">0</text>
      <text x="50" y="199" fill="#eee" font-size="14">0 m</text><text x="785" y="199" fill="#eee" font-size="14">${Math.round(length)} m</text>
      <polyline points="${points(reference.trace)}" fill="none" stroke="#ecc77d" stroke-width="3" stroke-dasharray="7 4"/>
      <polyline points="${points(lap.trace)}" fill="none" stroke="#7ae0ed" stroke-width="3"/>
    </svg>
    <table style="width:100%;margin:16px 0;text-align:left;border-spacing:0 8px"><caption style="text-align:left">Sector comparison</caption><thead><tr><th scope="col">Sector</th><th scope="col">Your lap</th><th scope="col">Reference</th><th scope="col">Difference</th></tr></thead>
      <tbody>${comparison.sectors.map(row=>`<tr><th scope="row">Sector ${row.number}</th><td>${time(row.lapMs)}</td><td>${time(row.referenceMs)}</td><td>${delta(row.deltaMs)}</td></tr>`).join('')}</tbody></table>
    <h4>Largest measured corner losses</h4>${comparison.losses.length?`<ol>${comparison.losses.map(loss=>`<li data-telemetry-loss><b>${escape(names.get(loss.id)||loss.id)} · ${delta(loss.lossMs)}</b><p>${escape(loss.cause)}</p></li>`).join('')}</ol>`:'<p>No slower corner sections in this lap.</p>'}</section>`;
}