import {TOWN_DEEDS, TOWN_DEED_TERRITORIES} from '../content/deeds.js';

const COLORS = ['#a24f32','#657b4c','#b08b44','#527681','#8c684d','#78648a','#477261','#a65b53'];
const list = value => Array.isArray(value) ? value : [];
const record = value => value && typeof value === 'object' && !Array.isArray(value);
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const money = value => {
  try { return BigInt(value ?? 0).toLocaleString('en'); } catch { return '0'; }
};

function territoryPoint(index, total) {
  const angle = -Math.PI / 2 + index * Math.PI * 2 / Math.max(total, 1);
  return {x:50 + Math.cos(angle) * 34, y:50 + Math.sin(angle) * 34};
}

export function townWastelandMapModel(town, {profiles={}, profile: suppliedProfile=null, ownerId=null, foggedTerritories=[]}={}) {
  const deeds = record(town?.deeds?.items) ? town.deeds.items : {};
  const owners = list(town?.mayors).map(id => profiles?.[id]).filter(record);
  const profile = suppliedProfile || profiles?.[ownerId] || owners[0] || {};
  const careerTerritories = record(profile.wasteland?.territories) ? profile.wasteland.territories : {};
  const explored = new Set([...list(foggedTerritories).map(String), ...list(town?.dispatch?.explored).map(String)]);
  const dispatch = record(town?.dispatch) ? town.dispatch : {};
  const activeDispatch = list(dispatch.active).map(job => ({...job, status:'On the road'}));
  const openDispatch = list(dispatch.open).map(job => ({...job, status:'Needs a crew'}));
  const jobs = [...activeDispatch, ...openDispatch].map(job => ({
    id:String(job.id ?? ''), crewId:String(job.crewId ?? ''), kind:String(job.kind ?? 'Town job'),
    status:job.status, chance:Number.isFinite(job.chance) ? Math.round(job.chance * 100) : null,
    chanceWords:String(job.chanceWords ?? ''), daysRemaining:Number.isFinite(job.daysRemaining) ? job.daysRemaining : null,
  }));
  const territories = TOWN_DEED_TERRITORIES.map((territory, index) => {
    const territoryDeeds = TOWN_DEEDS.filter(deed => deed.territoryId === territory.id).map(deed => {
      const state = record(deeds[deed.id]) ? deeds[deed.id] : {};
      const bid = record(state.bid) ? state.bid : null;
      const asking = bid ? Number(bid.amount) : state.ownerId === 'vane' ? Math.ceil(deed.purchasePrice * 1.5) : null;
      return {id:deed.id, name:deed.name, kind:deed.kind, purchasePrice:deed.purchasePrice,
        ownerId:state.ownerId ?? null, guarded:state.guarded === true, bid:bid ? {...bid} : null, asking};
    });
    const heldCount = territoryDeeds.filter(deed => deed.ownerId === 'player').length;
    const point = territoryPoint(index, TOWN_DEED_TERRITORIES.length);
    const claimed = careerTerritories[territory.id]?.claimed === true;
    const fog = list(foggedTerritories).includes(territory.id) || (!claimed && !explored.has(territory.id));
    return {id:territory.id,name:territory.name,color:COLORS[index % COLORS.length],x:point.x,y:point.y,
      claimed, fog, flag:claimed ? 'Your flag' : territoryDeeds.some(deed => deed.ownerId === 'vane') ? 'Mrs Vane’s flag' : `${territory.name}’s flag`,
      deeds:territoryDeeds, heldCount, deedCount:territoryDeeds.length, setHeld:territoryDeeds.length > 0 && heldCount === territoryDeeds.length,
      bonus:territory.perk?.label ?? null};
  });
  return {name:String(town?.name ?? 'The Scablands'),till:money(town?.till),territories,jobs,
    center:{name:'The Scablands',x:50,y:50}};
}

export function townWastelandMapMarkup(model) {
  const regions = model.territories.map(region => {
    const visibility = region.fog ? 'map-region-fog' : '';
    const deedCards = region.deeds.map(deed => {
      const bidText = deed.bid ? `Open offer: ${money(deed.bid.amount)} scrap.` : deed.ownerId === 'player' ? 'Your deed.' : deed.ownerId === 'vane' ? 'Mrs Vane owns this deed.' : `${money(deed.purchasePrice)} scrap.`;
      const action = deed.asking !== null
        ? `<label>Offer in whole scrap <input type="number" min="${deed.asking + 1}" step="1" value="${deed.asking + 1}" data-town-map-offer="${esc(deed.id)}"></label><button type="button" data-town-map-bid="${esc(deed.id)}">Place bid</button>`
        : deed.ownerId === 'player' || deed.ownerId === 'vane' ? ''
          : `<button type="button" data-town-map-buy="${esc(deed.id)}"${region.claimed ? '' : ' disabled'}>Buy deed</button>`;
      return `<article class="town-wmap-deed"><h4>${esc(deed.name)}</h4><p>${bidText}</p>${action}</article>`;
    }).join('');
    return `<details class="town-wmap-region ${visibility}" data-town-region="${esc(region.id)}" style="position:absolute;left:${region.x}%;top:${region.y}%;transform:translate(-50%,-50%);width:22%;max-width:190px;padding:7px;border:2px solid ${region.color};background:#e6d7b6;color:#30251a;box-shadow:1px 2px 4px #36281b66"><summary style="cursor:pointer;font-weight:700"><span>${region.fog ? 'Unseen land' : esc(region.name)}</span><span>${region.flag ? ` · ${esc(region.flag)}` : ''}</span></summary><p>${region.fog ? 'This land is still hidden.' : `${region.heldCount} of ${region.deedCount} deeds held.`}</p>${region.fog ? '' : `<p>${region.setHeld ? 'You hold the whole set.' : 'The whole set is not held yet.'}${region.bonus ? ` ${esc(region.bonus)}` : ''}</p><div class="town-wmap-deeds">${deedCards}</div>`}</details>`;
  }).join('');
  const jobs = model.jobs.length ? model.jobs.map(job => `<article class="town-wmap-dispatch"><strong>${esc(job.kind)}</strong><p>${job.crewId ? `Crew: ${esc(job.crewId)}. ` : ''}${esc(job.status)}${job.chance === null ? '' : ` Chance: ${job.chance} percent${job.chanceWords ? `, ${esc(job.chanceWords.toLowerCase())}` : ''}`}.${job.daysRemaining === null ? '' : ` ${job.daysRemaining} days left.`}</p></article>`).join('') : '<p>No crew are on dispatch jobs.</p>';
  return `<section class="town-wasteland-map" aria-labelledby="town-wmap-title" style="color:#30251a;background:#29251e;padding:12px"><header><h2 id="town-wmap-title" style="color:#efe6cf">The Wasteland</h2><p style="color:#efe6cf">${esc(model.name)} has ${esc(model.till)} scrap in the town till.</p></header><div class="town-wmap-chart" role="group" aria-label="Hand drawn territory map" style="position:relative;width:min(78vh,94vw);height:min(78vh,94vw);max-width:100%;margin:auto;background:#efe6cf;border:3px solid #5a4630;box-shadow:0 12px 40px #0008;overflow:auto"><div class="town-wmap-center" style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);padding:16px;border:2px solid #5a4630;border-radius:50%;background:#d5c6a4;text-align:center;font-weight:700">${esc(model.center.name)}</div>${regions}</div><section class="town-wmap-dispatch-list" aria-labelledby="town-wmap-dispatch-title" style="color:#efe6cf"><h3 id="town-wmap-dispatch-title">Crew on the road</h3>${jobs}</section></section>`;
}

export function bindTownWastelandMap(root, {onCommand=()=>{}}={}) {
  const click = event => {
    const target = event.target?.closest?.('[data-town-map-buy], [data-town-map-bid]');
    if (!target || target.disabled) return;
    if (target.dataset.townMapBuy) onCommand({type:'buyDeed',deedId:target.dataset.townMapBuy});
    else {
      const input=root.querySelector?.(`[data-town-map-offer="${target.dataset.townMapBid}"]`);
      const offer=Number(input?.value);
      if (Number.isSafeInteger(offer) && offer >= 0) onCommand({type:'deedBid',deedId:target.dataset.townMapBid,offer});
    }
  };
  root.addEventListener('click', click);
  return () => root.removeEventListener('click', click);
}
