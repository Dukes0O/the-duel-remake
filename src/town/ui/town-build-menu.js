import {BUILDINGS} from '../content/buildings.js';
import {GOODS} from '../content/goods.js';

export const TOWN_BUILD_TABS = Object.freeze([
  {id:'roads',label:'Roads',test:id=>id.startsWith('road-')},
  {id:'pipes',label:'Pipes and Wires',test:id=>id.startsWith('pipe-')},
  {id:'homes',label:'Homes and Shops',test:id=>['soup-kitchen','tavern','drive-in','trading-post','salvage-yard','warehouse'].includes(id)},
  {id:'water',label:'Water',test:id=>['hand-well','standpipe','water-tower','pump-house','reservoir'].includes(id)},
  {id:'clean',label:'Clean',test:id=>['treatment-plant','latrine','bathhouse','reed-bed','trash-sorter','compost-heap'].includes(id)},
  {id:'food',label:'Food',test:id=>['chicken-run','goat-pen','greenhouse','soup-kitchen'].includes(id)},
  {id:'goods',label:'Goods',test:id=>['salvage-yard','forge','sawmill','kiln','warehouse'].includes(id)},
  {id:'power',label:'Power',test:id=>['windmill','generator','solar-rack'].includes(id)},
  {id:'safety',label:'Safety',test:id=>id.startsWith('fence-')||id.startsWith('wall-')||['watchtower','guard-post','fire-station'].includes(id)},
  {id:'services',label:'Services',test:id=>['school','clinic','town-hall','old-ground','workshop','motor-pool','radio-mast','helipad','toll-bank'].includes(id)},
  {id:'fun',label:'Fun',test:id=>['wreck-ring','mud-pit','big-wheel','scrap-coaster'].includes(id)},
]);

const title = id => id.split('-').map(word=>word[0].toUpperCase()+word.slice(1)).join(' ');
const amount = value => new Intl.NumberFormat('en').format(value);
const units = new Map(GOODS.map(good=>[good.id,good.unit]));

export function townBuildMenuModel({buildings=BUILDINGS, tab='roads', unlockedBuildingIds=['road-dirt','pipe-50mm'], availableBuildingIds=null}={}) {
  const selected=TOWN_BUILD_TABS.find(item=>item.id===tab)||TOWN_BUILD_TABS[0];
  const unlocked=new Set(unlockedBuildingIds);
  const available=availableBuildingIds===null?null:new Set(availableBuildingIds);
  return {tabs:TOWN_BUILD_TABS.map(({id,label})=>({id,label,selected:id===selected.id})),tab:selected.id,
    entries:buildings.filter(row=>selected.test(row.id)).map(row=>{
      const open=unlocked.has(row.id)||row.opensWith==='start';
      const supplied=available===null||available.has(row.id);
      const reason=!open?`Opens with ${row.opensWith}.`:!supplied?'You do not have what this needs.':null;
      const needs=Object.entries(row.materials).map(([good,count])=>`${amount(count)} ${units.get(good)||''} ${title(good)}`).join(', ')||'No materials';
      return {id:row.id,name:title(row.id),needs,does:row.gives,locked:!open||!supplied,reason,row};
    })};
}

export function townBuildMenuMarkup(model) {
  const tabs=model.tabs.map(tab=>`<button type="button" role="tab" aria-selected="${tab.selected}" data-town-tab="${tab.id}">${tab.label}</button>`).join('');
  const homeTool=model.tab==='homes'?'<section class="town-home-tool"><h3>Paint home plots</h3><p>Paint a plot to invite a household to build a home there with goods from the nearest store.</p><button type="button" data-town-home-tool="paint">Paint ground for homes</button><button type="button" data-town-home-tool="clear">Clear an empty plot</button></section>':'';
  const entries=model.entries.map(entry=>`<button type="button" class="town-build-entry${entry.locked?' is-locked':''}" data-town-build="${entry.id}" ${entry.locked?'disabled aria-disabled="true"':''}><strong>${entry.name}</strong><span>Needs: ${entry.needs}</span><span>${entry.does}</span>${entry.reason?`<span class="town-build-reason">${entry.reason}</span>`:''}</button>`).join('');
  return `<nav class="town-build-tabs" role="tablist" aria-label="Build plans">${tabs}</nav>${homeTool}<div class="town-build-list">${entries}</div>`;
}
