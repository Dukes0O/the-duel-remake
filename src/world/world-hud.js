import {SCABLANDS_PLACES} from './scablands.js';

const pointOf = value => value?.position ?? value;
const finitePoint = value => Number.isFinite(pointOf(value)?.x) && Number.isFinite(pointOf(value)?.z);
const labelOf = (value, places) => {
  const point = pointOf(value);
  const known = value?.id && places.find(place => place.id === value.id);
  return value?.name ?? known?.name ?? (value?.id ? value.id.replaceAll('-', ' ') :
    finitePoint(point) ? 'the marked place' : 'the next place');
};
const markerOf = (value, places) => {
  if (!finitePoint(value)) return null;
  const point = pointOf(value);
  return {id: value?.id ?? null, name: labelOf(value, places), x: point.x, z: point.z};
};

function nextFind(step, found) {
  return (step?.finds ?? []).find(item => !found.includes(item.id)) ?? null;
}

export function worldHudStep(step, {actors = [], inventory = [], found = [], stepState = {}} = {}, places = SCABLANDS_PLACES) {
  if (!step) return {kind: null, line: 'Drive the Scablands', target: null};
  const actor = id => actors.find(item => item.id === id);
  let target = null, line;
  switch (step.kind) {
    case 'reach':
      target = step.place ?? step.destination;
      line = step.what ?? `Drive to ${labelOf(target, places)}`;
      break;
    case 'carry':
      target = step.destination ?? step.origin;
      line = step.what ?? `Carry ${labelOf({id: step.load}, places)} to ${labelOf(target, places)}`;
      break;
    case 'chase': {
      const targetActor = actor(step.targetId);
      target = targetActor ?? step.path?.at(-1);
      line = step.what ?? `Catch ${labelOf(step.actor ?? targetActor ?? {id: step.targetId}, places)}`;
      break;
    }
    case 'escort': {
      const convoy = actor(step.actorId);
      target = step.destination ?? step.path?.at(-1) ?? convoy?.position;
      line = step.what ?? `Keep ${labelOf(step.actor ?? {id: step.actorId}, places)} safe to ${labelOf(target, places)}`;
      break;
    }
    case 'onfoot': {
      target = step.places?.[stepState.index ?? 0] ?? step.returnToCar;
      line = (stepState.index ?? 0) >= (step.places?.length ?? 0)
        ? 'Return to your car' : step.what ?? `Walk to ${labelOf(target, places)}`;
      break;
    }
    case 'heist': {
      const phase = stepState.phase ?? 'infiltrate';
      target = phase === 'return' ? step.carPlace : phase === 'escape' ? step.escapePlace : step.zone;
      line = step.what ?? (phase === 'return' ? `Carry ${labelOf({id: step.takeId}, places)} to your car`
        : phase === 'escape' ? `Drive to ${labelOf(step.escapePlace, places)}` : `Take ${labelOf({id: step.takeId}, places)}`);
      break;
    }
    case 'rescue': {
      const count = stepState.rescued ?? 0;
      const needed = Math.min(step.people?.length ?? 0, step.seats ?? 2);
      const person = count < needed ? step.people?.[count] : null;
      target = person ?? step.home;
      line = step.what ?? (person ? `Rescue ${labelOf(person, places)}` : `Bring everyone to ${labelOf(step.home, places)}`);
      break;
    }
    case 'defend':
      target = step.place;
      line = step.what ?? `Defend ${labelOf(target, places)}`;
      break;
    case 'explore': {
      const find = step.finds?.[stepState.index ?? 0] ?? nextFind(step, found);
      target = find;
      line = step.what ?? (find ? `Find ${labelOf(find, places)}` : 'Explore the Scablands');
      break;
    }
    default:
      target = step.place ?? step.destination ?? null;
      line = 'Keep going';
  }
  return {kind: step.kind, line, target: markerOf(target, places)};
}

export function worldHudModel({worldJob, player = null, found = [], onFoot = false, places = SCABLANDS_PLACES} = {}) {
  const job = worldJob?.job, step = job?.steps?.[job.stepIndex] ?? null;
  const next = worldHudStep(step, {actors: worldJob?.actors, inventory: worldJob?.inventory,
    found, stepState: job?.stepState}, places);
  const position = markerOf(player, places);
  const target = next.target;
  const gate=worldJob?.definition?.kind==='town-drive'?worldJob.definition.layout?.gate:null;
  const at=pointOf(player);
  const townGatePrompt=gate&&finitePoint(player)&&Math.hypot(at.x-gate.x,at.z-gate.z)<=gate.halfWidth+8
    ?gate.prompt:'';
  const dx = target && position ? target.x - position.x : 0;
  const dz = target && position ? target.z - position.z : 0;
  const bearing = target && position ? (Math.atan2(dx, dz) * 180 / Math.PI + 360) % 360 : null;
  const finds = [...(worldJob?.definition?.finds ?? []), ...(job?.steps ?? []).flatMap(item => item.finds ?? [])];
  return {
    line: next.line, kind: next.kind, target, bearing,
    prompt: townGatePrompt || (step?.kind==='onfoot' ? (onFoot ? 'HOLD F TO RETURN TO YOUR CAR' : 'HOLD F TO GET OUT') : ''),
    wave: step?.kind==='defend' ? {value:worldJob?.job?.stepState?.wave??0,max:step.waveCount??3} : null,
    well: step?.kind==='defend' ? {value:worldJob?.places?.[step.placeId]?.health??step.health??100,max:step.health??100} : null,
    arrow: bearing,
    places: places.map(place => ({id: place.id, name: place.name, x: place.x, z: place.z})),
    finds: finds.map(item => {
      const marker = markerOf(item, places);
      return marker ? {...marker, found: found.includes(item.id)} : null;
    }).filter(Boolean),
    player: position,
  };
}

const STYLE_ID = 'world-hud-style';
const MAP_WIDTH = 640, MAP_HEIGHT = 440;

function drawWorldMap(ctx, model) {
  ctx.clearRect(0, 0, MAP_WIDTH, MAP_HEIGHT);
  ctx.fillStyle = '#b8a27e'; ctx.fillRect(0, 0, MAP_WIDTH, MAP_HEIGHT);
  const project = (x, z) => [28 + (x + 700) / 1400 * (MAP_WIDTH - 56), 26 + (500 - z) / 1000 * (MAP_HEIGHT - 52)];
  ctx.fillStyle = '#82765e'; ctx.beginPath(); ctx.ellipse(MAP_WIDTH / 2, MAP_HEIGHT / 2, 264, 174, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#d5bd90'; ctx.lineWidth = 8; ctx.setLineDash([10, 8]); ctx.beginPath();
  model.places.forEach((place, index) => { const [x, y] = project(place.x, place.z); if (index) ctx.lineTo(x, y); else ctx.moveTo(x, y); });
  ctx.closePath(); ctx.stroke(); ctx.setLineDash([]);
  for (const place of model.places) {
    const [x, y] = project(place.x, place.z);
    ctx.fillStyle = '#e4d4b2'; ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#201d18'; ctx.font = '12px system-ui'; ctx.textAlign = 'center'; ctx.fillText(place.name, x, y - 9);
  }
  for (const find of model.finds) {
    const [x, y] = project(find.x, find.z); ctx.fillStyle = find.found ? '#91d29a' : '#f0c04f';
    ctx.beginPath(); ctx.arc(x, y, 7, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#201d18'; ctx.textAlign = 'left'; ctx.fillText(find.found ? '✓' : '?', x + 8, y + 4);
  }
  if (model.target) {
    const [x, y] = project(model.target.x, model.target.z); ctx.strokeStyle = '#ff6e36'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(x, y, 11, 0, Math.PI * 2); ctx.stroke();
  }
  if (model.player) {
    const [x, y] = project(model.player.x, model.player.z); ctx.fillStyle = '#71c8ff';
    ctx.beginPath(); ctx.arc(x, y, 7, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#102536'; ctx.lineWidth = 2; ctx.stroke();
  }
}

export function createWorldHud({host}) {
  const doc = host.ownerDocument;
  if (doc?.head && !doc.getElementById(STYLE_ID)) {
    const link = doc.createElement('link'); link.id = STYLE_ID; link.rel = 'stylesheet';
    link.href = new URL('./world-hud.css', import.meta.url).href; doc.head.append(link);
  }
  const root = doc.createElement('section'); root.className = 'world-hud'; root.hidden = true;
  root.setAttribute('aria-label', 'Scablands job guidance');
  root.innerHTML = `<div class="world-hud-line" role="status"></div><div class="world-hud-prompt" role="status"></div><div class="world-hud-progress" hidden></div><div class="world-hud-compass" aria-label="Direction to goal"><b>N</b><i></i></div>
    <button class="world-hud-map-button" type="button" aria-expanded="false">M · MAP</button>
    <section class="world-hud-map" role="dialog" aria-label="Scablands map" hidden><header><b>SCABLANDS</b><button type="button" data-world-map-close>CLOSE</button></header>
      <canvas width="${MAP_WIDTH}" height="${MAP_HEIGHT}" aria-label="Map with your position and job marker"></canvas>
      <p class="world-hud-find-label">FINDS</p><ul class="world-hud-finds"></ul></section>`;
  host.append(root);
  const line = root.querySelector('.world-hud-line'), compass = root.querySelector('.world-hud-compass i');
  const prompt = root.querySelector('.world-hud-prompt'), progress = root.querySelector('.world-hud-progress');
  const mapButton = root.querySelector('.world-hud-map-button'), map = root.querySelector('.world-hud-map');
  const canvas = root.querySelector('canvas'), context = canvas?.getContext?.('2d');
  const findList = root.querySelector('.world-hud-finds');
  let active = false, mapOpen = false, lastMap = '', disposed = false;
  const setMapOpen = value => { mapOpen = value; map.hidden = !mapOpen; mapButton.setAttribute('aria-expanded', String(mapOpen)); };
  const click = event => {
    if (event.target.closest?.('[data-world-map-close]')) setMapOpen(false);
    else if (event.target.closest?.('.world-hud-map-button')) setMapOpen(!mapOpen);
  };
  const keydown = event => {
    if (!active || event.repeat || event.altKey || event.ctrlKey || event.metaKey ||
      /^(INPUT|TEXTAREA|SELECT)$/.test(event.target?.tagName) || event.target?.isContentEditable) return;
    if (event.code === 'KeyM') { event.preventDefault(); setMapOpen(!mapOpen); }
    else if (event.code === 'Escape' && mapOpen) { event.preventDefault(); setMapOpen(false); }
  };
  root.addEventListener('click', click); doc.addEventListener('keydown', keydown);
  return {
    update(state, duel, profile) {
      if (disposed) return;
      active = state?.arena?.mode === 'world-job' && ['countdown', 'racing'].includes(state.status);
      root.hidden = !active;
      if (!active) { setMapOpen(false); return; }
      const actor = state.onFoot && state.fighter ? state.fighter : state;
      const point = duel.course?.worldAt?.(actor.s, actor.lateral);
      const model = worldHudModel({worldJob: state.arena.worldJob, player: point, onFoot:state.onFoot,
        found: profile?.world?.found ?? []});
      line.textContent = model.line;
      prompt.textContent = model.prompt;
      const bars=model.wave?[{label:`WAVE ${Math.min(model.wave.value+1,model.wave.max)} / ${model.wave.max}`,value:Math.min(model.wave.value+1,model.wave.max),max:model.wave.max}]:[];
      if(model.well)bars.push({label:`WELL ${Math.ceil(model.well.value)} / ${model.well.max}`,value:model.well.value,max:model.well.max});
      progress.hidden=!bars.length;
      progress.replaceChildren(...bars.flatMap(bar=>{const label=doc.createElement('span'),meter=doc.createElement('progress');label.textContent=bar.label;meter.max=bar.max;meter.value=bar.value;meter.setAttribute('aria-label',bar.label);return[label,meter];}));
      compass.style.transform = model.arrow === null ? 'rotate(0deg)' : `rotate(${model.arrow}deg)`;
      const mapKey = JSON.stringify([model.places, model.finds, model.target, model.player]);
      if (mapKey !== lastMap) {
        lastMap = mapKey;
        if (context) drawWorldMap(context, model);
        findList.innerHTML = model.finds.length ? model.finds.map(item =>
          `<li class="${item.found ? 'is-found' : ''}"><span>${item.found ? '✓' : '○'}</span> ${item.name}</li>`).join('') : '<li>Nothing found yet</li>';
      }
    },
    dispose() {
      if (disposed) return;
      disposed = true; root.removeEventListener('click', click); doc.removeEventListener('keydown', keydown); root.remove();
    },
  };
}
