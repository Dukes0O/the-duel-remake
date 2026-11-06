import {townCalendarAt} from '../town-calendar.js';
import {townBuildMenuModel,townBuildMenuMarkup} from './town-build-menu.js';

const overlays=['Water','Pressure','Clean','Food','Goods','Safety','Fire','Mood','Reach','Underground'];
const safe = value => String(value ?? '—').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const number = value => typeof value==='number'?new Intl.NumberFormat('en').format(value):'—';

export function townScreenModel(town,{speed=1,paused=false,next='Nothing needs your attention. Make a plan.',tab='roads',overlay=null,unlockedBuildingIds,availableBuildingIds}={}) {
  const date=town.calendar||townCalendarAt(town.tick||0);
  const year=typeof date.year==='bigint'?date.year.toString():date.year;
  return {name:town.name,date:`Year ${year}, ${date.season}, day ${date.day}`,till:town.till??null,people:town.people?.length??0,
    mood:town.mood??null,waterIn:town.water?.in??null,waterOut:town.water?.out??null,powerIn:town.power?.in??null,powerOut:town.power?.out??null,
    next,paused,speed,overlay,menu:townBuildMenuModel({tab,unlockedBuildingIds,availableBuildingIds})};
}

export function townScreenMarkup(model) {
  const metric=(label,value,unit='')=>`<div class="town-metric"><span>${label}</span><strong>${value===null?'—':safe(number(value))}${unit}</strong></div>`;
  const speeds=[0,1,2,4].map(value=>`<button type="button" data-town-speed="${value}" aria-pressed="${model.speed===value}">${value===0?'Pause':`${value}×`}</button>`).join('');
  const layerButtons=overlays.map(label=>`<button type="button" data-town-overlay="${label.toLowerCase()}" aria-pressed="${model.overlay===label.toLowerCase()}">${label}</button>`).join('');
  return `<main class="town-screen" aria-label="The Town"><header class="town-topbar"><div class="town-heading"><strong>${safe(model.name)}</strong><span>${safe(model.date)}</span></div>${metric('TILL',model.till,' scrap')}${metric('PEOPLE',model.people)}${metric('MOOD',model.mood)}${metric('WATER IN',model.waterIn,' L/day')}${metric('WATER OUT',model.waterOut,' L/day')}${metric('POWER IN',model.powerIn,' kW')}${metric('POWER OUT',model.powerOut,' kW')}<div class="town-clock">${speeds}<button type="button" data-town-action="yard">THE YARD</button></div></header>
  <section class="town-next" aria-live="polite"><strong>NEXT</strong><span>${safe(model.next)}</span><button type="button" data-town-action="next">↗</button></section>
  <section class="town-workspace"><aside class="town-build-panel"><h2>Build</h2>${townBuildMenuMarkup(model.menu)}</aside><div class="town-map" aria-label="Town map"><div class="town-map-hint">Choose a plan, then drag it onto the map.</div><div class="town-command-message" role="status" aria-live="polite"></div></div><aside class="town-reports"><h2>Reports</h2><p>No reports.</p></aside></section>
  <footer class="town-toolbar"><nav class="town-overlays" aria-label="Map overlays">${layerButtons}</nav><nav class="town-tools" aria-label="Town tools">${['DRIVE','MAP','LEDGER','CREW','THE BOOK'].map(label=>`<button type="button" data-town-action="${label.toLowerCase().replaceAll(' ','-')}">${label}</button>`).join('')}<button type="button" data-town-action="backup">BACK UP</button></nav></footer></main>`;
}

export function renderTownScreen(root,town,options={}) {
  if(!root||typeof root.innerHTML!=='string') throw new TypeError('Choose a place for the town screen first.');
  const model=townScreenModel(town,options);root.innerHTML=townScreenMarkup(model);
  return model;
}
