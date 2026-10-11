import {compareLapTelemetry} from './lap-telemetry.js';
import {referenceSpeedColour, cornerId, wrap} from './track-analysis.js';

const escape = value => String(value ?? '').replace(/[&<>"']/g,
  char => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[char]));
const time = milliseconds => `${Math.floor(milliseconds / 60000)}:${(milliseconds % 60000 / 1000).toFixed(3).padStart(6, '0')}`;
const kindName = {corner: 'Corner', crest: 'Crest', overtaking: 'Passing zone', signature: 'Signature view'};
const symbol = {corner: '•', crest: '↑', overtaking: '↗', signature: '★'};

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
  return {
    segments: analysis.mapPoints.map(([x, z, mph], index) => {
      const next = analysis.mapPoints[(index + 1) % analysis.mapPoints.length];
      return {from: project(x, z), to: project(next[0], next[1]),
        colour: referenceSpeedColour(mph, analysis.reference.minMph, analysis.reference.topMph)};
    }),
    corners: analysis.corners.map(corner => ({...at(corner.apexS), id: cornerId(corner),
      number: corner.number, name: corner.name || `Corner ${corner.number}`, authoredName: corner.name})),
    flags: dossier.flags.map(flag => ({...at(flag.s), ...flag})), start: at(0),
  };
}

function mapMarkup(dossier) {
  const map = teamRoomMap(dossier);
  const segments = map.segments.map(({from, to, colour}) =>
    `<path d="M${from.x.toFixed(1)} ${from.y.toFixed(1)}L${to.x.toFixed(1)} ${to.y.toFixed(1)}" stroke="${colour}"/>`).join('');
  return `<div class="team-map"><svg viewBox="0 0 1000 690" role="img" aria-label="${escape(dossier.name)}. Track coloured by reference speed. Numbered corners and start line.">
    <g fill="none" stroke-width="9" stroke-linecap="round">${segments}</g>
    <g class="team-map-corners">${map.corners.map(corner => `<g transform="translate(${corner.x.toFixed(1)} ${corner.y.toFixed(1)})"><circle r="14"/><text text-anchor="middle" dy="5">${corner.number}</text>${corner.authoredName ? `<text x="${corner.x > 500 ? -22 : 22}" dy="5" text-anchor="${corner.x > 500 ? 'end' : 'start'}" class="team-map-name">${escape(corner.authoredName)}</text>` : ''}<title>${escape(corner.name)}</title></g>`).join('')}</g>
    <g transform="translate(${map.start.x.toFixed(1)} ${map.start.y.toFixed(1)})"><rect x="-10" y="-7" width="20" height="14" fill="#f0ead5" stroke="#081b24" stroke-width="3"/><text x="16" y="6" class="team-map-start">START</text></g>
    </svg>${map.flags.map(flag => `<button type="button" class="team-map-flag team-kind-${flag.kind}" data-team-flag="${escape(flag.id)}" style="left:${(flag.x / 10).toFixed(2)}%;top:${(flag.y / 6.9).toFixed(2)}%" aria-label="${escape(kindName[flag.kind])}: ${escape(flag.title)}">${symbol[flag.kind]}</button>`).join('')}</div>`;
}

export function teamRoomMarkup(dossier) {
  const {analysis, reference} = dossier;
  const route = dossier.route === 'fixed' ? 'Circuit dossier' : dossier.route.replace('route_', 'Route ').toUpperCase();
  return `<section class="team-room" role="dialog" aria-modal="true" aria-labelledby="team-room-title">
    <header class="team-room-header"><div><p class="eyebrow">YOUR ENGINEER · ${escape(route)}</p><h2 id="team-room-title">${escape(dossier.name)}</h2></div><button type="button" class="shop-close" data-team-close aria-label="Close Team Room">×</button></header>
    <div class="team-room-summary"><span><b>${(analysis.profile.length / 1000).toFixed(2)} km</b> lap distance</span><span><b>${analysis.corners.length}</b> corners</span><span><b>${time(reference.lapMs)}</b> reference lap</span></div>
    <p class="team-reference-label">Reference lap: Stuttgart 959-S <span>· Club Driver · Medium · stock car</span></p>
    <div class="team-room-body"><section class="team-map-panel" aria-label="Track map">${mapMarkup(dossier)}
      <div class="team-speed-key"><span>${Math.round(analysis.reference.minMph * 1.609344)} km/h</span><i aria-hidden="true"></i><span>${Math.round(analysis.reference.topMph * 1.609344)} km/h</span></div>
      <div class="team-sector-strip">${reference.sectorMs.map((value, index) => `<span>SECTOR ${index + 1}<b>${time(value)}</b></span>`).join('')}</div>
      <details class="team-corner-index"><summary>All corners</summary><ol>${analysis.corners.map(corner => `<li>${escape(corner.name || `Corner ${corner.number}`)} <span>${corner.direction === 'L' ? 'Left' : 'Right'} · ${corner.radius} m radius</span></li>`).join('')}</ol></details>
    </section><aside class="team-study-panel" aria-label="Study a track feature"><h3>Study the approach</h3><p class="team-study-intro">Choose a flag to see the road from the driver’s seat.</p>
      <div class="team-flag-list">${dossier.flags.map(flag => `<button type="button" data-team-flag="${escape(flag.id)}" data-team-snapshot-s="${flag.snapshotS}" data-team-camera-up="${flag.camera.up}" data-team-camera-ahead="${flag.camera.ahead}" data-team-kind="${flag.kind}" aria-pressed="false"><span class="team-flag-symbol">${symbol[flag.kind]}</span><span><small>${escape(kindName[flag.kind])} · ${Math.round(flag.s)} m</small><b>${escape(flag.title)}</b></span></button>`).join('')}</div>
      <section class="team-snapshot-panel" aria-live="polite"><h4 data-team-feature-title>Choose a flag</h4><div class="team-snapshot" data-team-snapshot></div><p class="team-snapshot-status" data-team-status role="status">The current track will be rendered when you select a feature.</p><div class="team-engineer" data-team-note></div></section>
    </aside></div><div data-team-telemetry>${telemetryMarkup(dossier)}</div></section>`;
}

function engineerMarkup(flag) {
  const note = flag.engineer ?? {}, values = [];
  if (Number.isFinite(note.brakeBoard)) values.push(`Brake at the ${note.brakeBoard} m board.`);
  if (Number.isFinite(note.gear)) values.push(`Gear ${note.gear}.`);
  if (Number.isFinite(note.targetKph)) values.push(`Target ${note.targetKph} km/h.`);
  return `<p class="eyebrow">YOUR ENGINEER</p>${values.length ? `<p class="team-note-values">${escape(values.join(' '))}</p>` : ''}<p>${escape(note.line)}</p><p>${escape(note.note)}</p>${flag.kind === 'corner' ? '<small>View shown from the suggested braking point.</small>' : ''}`;
}

// Owns only DOM and transient canvases. All course/reference data and native
// renderer access arrive through read-only providers from the router.
export function createTeamRoom({host, getDossier, capture, clearCapture, onClose = () => {}}) {
  const layer = document.createElement('div');
  layer.className = 'team-room-layer';layer.hidden = true;host.append(layer);
  const events = new AbortController();
  let dossier = null, returnFocus = null, request = 0, captureAbort = null;
  async function select(id) {
    const flag = dossier?.flags.find(item => item.id === id);
    if (!flag) return;
    const ticket = ++request;
    captureAbort?.abort();captureAbort = new AbortController();
    layer.querySelectorAll('[data-team-flag]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.teamFlag === id)));
    layer.querySelector('[data-team-feature-title]').textContent = flag.title;
    layer.querySelector('[data-team-note]').innerHTML = engineerMarkup(flag);
    const picture = layer.querySelector('[data-team-snapshot]'), status = layer.querySelector('[data-team-status]');
    picture.replaceChildren();status.textContent = 'Rendering the current track…';
    try {
      const canvas = await capture(dossier, flag, {signal: captureAbort.signal});
      if (ticket !== request || layer.hidden) return;
      canvas.setAttribute('role', 'img');canvas.setAttribute('aria-label', `${flag.title}. Driver-seat approach on ${dossier.name}.`);
      picture.replaceChildren(canvas);status.textContent = 'Live track view · driver’s seat';
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
    const flag = event.target.closest('[data-team-flag]');
    if (flag) select(flag.dataset.teamFlag);
  }, {signal: events.signal});
  layer.addEventListener('keydown', event => {
    if (event.code === 'Escape') {event.preventDefault();event.stopPropagation();close();return;}
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