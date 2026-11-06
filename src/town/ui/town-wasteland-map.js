import {TOWN_DEEDS, TOWN_DEED_TERRITORIES} from '../content/deeds.js';

const list=value=>Array.isArray(value)?value:[];
const record=value=>value&&typeof value==='object'&&!Array.isArray(value);
const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const money=value=>{try{return BigInt(value??0).toLocaleString('en');}catch{return '0';}};

export function townWastelandMapModel(town,{profiles={},profile:suppliedProfile=null,ownerId=null,foggedTerritories=[],canTrade=true,message='',shortfall=0}={}){
  const deeds=record(town?.deeds?.items)?town.deeds.items:{};
  const owners=list(town?.mayors).map(id=>profiles?.[id]).filter(record);
  const profile=suppliedProfile||profiles?.[ownerId]||owners[0]||{};
  const career=record(profile.wasteland?.territories)?profile.wasteland.territories:{};
  const discovered=new Set(list(town?.dispatch?.explored).map(String));
  const dispatch=record(town?.dispatch)?town.dispatch:{};
  const jobs=[...list(dispatch.active).map(job=>({...job,status:'On the road'})),...list(dispatch.open).map(job=>({...job,status:'Needs a crew'}))].map(job=>({
    id:String(job.id??''),crewId:String(job.crewName??job.crewId??'crew not named'),kind:String(job.kind??'Town job'),status:job.status,
    chance:Number.isFinite(job.chance)?Math.round(job.chance*100):null,chanceWords:String(job.chanceWords??''),daysRemaining:Number.isFinite(job.daysRemaining)?job.daysRemaining:null,
  }));
  const territories=TOWN_DEED_TERRITORIES.map(territory=>{
    const deedsForTerritory=TOWN_DEEDS.filter(deed=>deed.territoryId===territory.id).map(deed=>{
      const state=record(deeds[deed.id])?deeds[deed.id]:{},bid=record(state.bid)?state.bid:null;
      const asking=bid?Number(bid.amount):state.ownerId==='vane'?Math.ceil(deed.purchasePrice*1.5):null;
      return{id:deed.id,name:deed.name,kind:deed.kind,purchasePrice:deed.purchasePrice,ownerId:state.ownerId??null,guarded:state.guarded===true,bid:bid?{...bid}:null,asking};
    });
    const heldCount=deedsForTerritory.filter(deed=>deed.ownerId==='player').length,claimed=career[territory.id]?.claimed===true;
    const fog=list(foggedTerritories).includes(territory.id)||(!claimed&&!discovered.has(territory.id));
    return{id:territory.id,name:territory.name,place:territory.place,x:territory.x,y:territory.y,color:territory.color,claimed,fog,
      flag:claimed?'Your flag':deedsForTerritory.some(deed=>deed.ownerId==='vane')?'Mrs Vane’s flag':`${territory.name}’s flag`,deeds:deedsForTerritory,
      heldCount,deedCount:deedsForTerritory.length,setHeld:deedsForTerritory.length>0&&heldCount===deedsForTerritory.length,bonus:territory.perk?.label??null};
  });
  const townRegion={id:'scablands',name:String(town?.name??'Your town'),place:'The Scablands, beside the Scrapdome',x:51,y:52,color:'#71583d',town:true};
  const wallet=Number(profile?.wasteland?.scrap)||0;
  return{name:String(town?.name??'The Scablands'),till:money(town?.till),territories,jobs,canTrade,message:String(message||''),center:townRegion,wallet,shortfall:Math.max(0,Number(shortfall)||0),
    quickDeposit:canTrade&&wallet>=Number(shortfall)&&Number(shortfall)>0?Number(shortfall):0};
}

export function townWastelandMapMarkup(model){
  const regions=model.territories.map(region=>{
    const deeds=region.deeds.map(deed=>{
      const description=deed.bid?`There is an offer of ${money(deed.bid.amount)} scrap.`:deed.ownerId==='player'?'You own this deed.':deed.ownerId==='vane'?'Mrs Vane owns this deed.':`It costs ${money(deed.purchasePrice)} scrap.`;
      const action=!model.canTrade?'':deed.asking!==null?`<label>Enter your offer in scrap. <input type="number" min="${deed.asking+1}" step="1" value="${deed.asking+1}" data-town-map-offer="${esc(deed.id)}"></label><button type="button" data-town-map-bid="${esc(deed.id)}">Place bid</button>`:
        deed.ownerId==='player'||deed.ownerId==='vane'?'':`<button type="button" data-town-map-buy="${esc(deed.id)}"${region.claimed?'':' disabled'}>Buy deed</button>`;
      return`<details class="town-wmap-deed"><summary>${esc(deed.name)}</summary><p>${description}</p>${action}</details>`;
    }).join('');
    return`<details class="town-wmap-region${region.fog?' is-fogged':''}" data-town-region="${esc(region.id)}" style="--map-x:${region.x}%;--map-y:${region.y}%;--map-ink:${region.color}"><summary>${region.fog?'<span class="town-wmap-cloud" aria-label="Unexplored land">☁</span>':'<strong>'+esc(region.name)+'</strong><span>'+esc(region.flag)+'</span>'}</summary>${region.fog?'<p>Cloud covers this land.</p>':`<p>${esc(region.place)}.</p><p>${region.heldCount} of ${region.deedCount} deeds belong to you. ${region.setHeld?'You hold the whole set.':`You do not hold the whole set yet.`} ${region.bonus?esc(region.bonus):''}</p><div class="town-wmap-deeds">${deeds}</div>`}</details>`;
  }).join('');
  const jobs=model.jobs.length?model.jobs.map(job=>`<article class="town-wmap-dispatch"><strong>${esc(job.crewId)}</strong><p>${esc(job.kind)}. ${esc(job.status)}.${job.chance===null?'':` The chance is ${esc(job.chanceWords||'not rated').toLowerCase()}, or ${job.chance} percent.`}${job.daysRemaining===null?'':` ${job.daysRemaining} days remain.`}</p></article>`).join(''):'<p>No crew are away on jobs.</p>';
  return`<section class="town-wasteland-map" aria-labelledby="town-wmap-title"><header><div><h2 id="town-wmap-title">The Wasteland</h2><p>${esc(model.name)} has ${esc(model.till)} scrap in the town till.</p>${model.message?`<p class="town-wmap-message" role="status">${esc(model.message)}</p>${model.quickDeposit?`<button type="button" data-town-map-till-in="${model.quickDeposit}">Put in ${money(model.quickDeposit)} scrap to cover the shortfall</button>`:''}`:''}</div><button type="button" data-town-map-close>Return to the town</button></header><div class="town-wmap-chart" role="group" aria-label="Hand-drawn map of the Wasteland"><svg class="town-wmap-roads" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${model.territories.map(region=>`<path d="M 51 52 Q ${(51+region.x)/2-3} ${(52+region.y)/2} ${region.x} ${region.y}"/>`).join('')}</svg><div class="town-wmap-center"><strong>${esc(model.center.name)}</strong><span>${esc(model.center.place)}</span><b>YOUR TOWN</b></div>${regions}</div><section class="town-wmap-dispatch-list"><h3>Crew on the road</h3>${jobs}</section><p class="town-wmap-hint">Click a deed to read about it. Press Escape or zoom in to return.</p></section>`;
}

export function bindTownWastelandMap(root,{onCommand=()=>{},onClose=()=>{}}={}){
  const click=event=>{
    const target=event.target?.closest?.('[data-town-map-buy],[data-town-map-bid],[data-town-map-close],[data-town-map-till-in]');if(!target)return;
    if(target.hasAttribute?.('data-town-map-close')){onClose();return;}if(target.disabled)return;
    if(target.dataset.townMapTillIn){onCommand({type:'tillIn',amount:Number(target.dataset.townMapTillIn)});return;}
    if(target.dataset.townMapBuy)onCommand({type:'buyDeed',deedId:target.dataset.townMapBuy});
    else{const input=root.querySelector?.(`[data-town-map-offer="${target.dataset.townMapBid}"]`),offer=Number(input?.value);if(Number.isSafeInteger(offer)&&offer>=0)onCommand({type:'deedBid',deedId:target.dataset.townMapBid,offer});}
  };
  root.addEventListener('click',click);return()=>root.removeEventListener('click',click);
}
