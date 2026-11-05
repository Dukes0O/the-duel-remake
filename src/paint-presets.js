import {CARS} from './config.js';
import {yetiRewards} from './yeti.js';
import {MUDDY_HOLLOW_HUBCAP_IDS, normalizeMuddyHollow} from './wasteland-progress.js';
import {hasAllPearls} from './deep/deep-log.js';

// Appearance values only. Factory restores the renderer's exact original
// material instead of guessing a shared finish for seven different vehicles.
export const PAINT_PRESETS=Object.freeze({
  frost:Object.freeze({id:'frost',name:'Frost',finish:'Frosted reward',price:0,reward:'yeti',appearance:Object.freeze({id:'frost',name:'Frost',color:0xdce8f0,metalness:.1,roughness:.55})}),
  'sea-wreck':Object.freeze({id:'sea-wreck',name:'Sea wreck',finish:'As raised from the sea',price:0,car:'falcone_sirena',appearance:Object.freeze({id:'sea-wreck',name:'Sea wreck',color:0xffffff,metalness:.035,roughness:.94,clearcoat:0,clearcoatRoughness:.14})}),
  'restored-1966':Object.freeze({id:'restored-1966',name:'Restored 1966',finish:'Rebuild and factory red paint',price:1500,car:'falcone_sirena',appearance:Object.freeze({id:'restored-1966',name:'Restored 1966',color:0x9c1217,metalness:.22,roughness:.27,clearcoat:.85,clearcoatRoughness:.14})}),
  // The Nissan Skyline's three extra finishes (docs/cars/nissan-skyline-gtr-r34.md 8.2), for that car only. The values equal SKYLINE_PAINTS in
  // src/skyline-vehicle.js (tools/test-skyline-handling.mjs checks it). Bayside Blue is its factory finish. Appearance only.
  skyline_white:Object.freeze({id:'skyline_white',name:'Skyline White',finish:'Pearl white',price:250,car:'nissan_skyline_gtr_r34',appearance:Object.freeze({id:'skyline_white',name:'Skyline White',color:0xe8e8e2,metalness:.35,roughness:.29,clearcoat:.9,clearcoatRoughness:.16})}),
  skyline_silver:Object.freeze({id:'skyline_silver',name:'Sonic Silver',finish:'Light metallic',price:250,car:'nissan_skyline_gtr_r34',appearance:Object.freeze({id:'skyline_silver',name:'Sonic Silver',color:0xb4bac0,metalness:.55,roughness:.26,clearcoat:.9,clearcoatRoughness:.16})}),
  skyline_black:Object.freeze({id:'skyline_black',name:'Midnight Black',finish:'Deep gloss',price:250,car:'nissan_skyline_gtr_r34',appearance:Object.freeze({id:'skyline_black',name:'Midnight Black',color:0x16181b,metalness:.30,roughness:.2,clearcoat:1,clearcoatRoughness:.1})}),  factory:Object.freeze({id:'factory',name:'Factory',finish:'Original finish',price:0,appearance:null}),
  copper_metallic:Object.freeze({id:'copper_metallic',name:'Copper Metallic',finish:'Warm metallic gloss',price:250,appearance:Object.freeze({id:'copper_metallic',name:'Copper Metallic',color:0xb97046,metalness:.65,roughness:.24,clearcoat:1,clearcoatRoughness:.10})}),
  glacier_satin:Object.freeze({id:'glacier_satin',name:'Glacier Satin',finish:'Pale blue-grey satin',price:400,appearance:Object.freeze({id:'glacier_satin',name:'Glacier Satin',color:0xb9d0d2,metalness:.22,roughness:.48,clearcoat:.35,clearcoatRoughness:.28})}),
  'rust-patina':Object.freeze({id:'rust-patina',name:'Rust Patina',finish:'Oxide with rubbed steel edges',price:250,currency:'scrap',wasteland:true,appearance:Object.freeze({id:'rust-patina',name:'Rust Patina',color:0x74462d,metalness:.48,roughness:.82,clearcoat:.05,clearcoatRoughness:.9})}),
  'salt-bleach':Object.freeze({id:'salt-bleach',name:'Salt Bleach',finish:'Sun-faded salt crust',price:250,currency:'scrap',wasteland:true,appearance:Object.freeze({id:'salt-bleach',name:'Salt Bleach',color:0xb6ad91,metalness:.22,roughness:.91,clearcoat:.02,clearcoatRoughness:.95})}),
  'desert-sand':Object.freeze({id:'desert-sand',name:'Desert Sand',finish:'Dusty ochre enamel',price:250,currency:'scrap',wasteland:true,appearance:Object.freeze({id:'desert-sand',name:'Desert Sand',color:0x9a7442,metalness:.18,roughness:.88,clearcoat:.04,clearcoatRoughness:.9})}),
  'boneyard-silver':Object.freeze({id:'boneyard-silver',name:'Boneyard Silver',finish:'Dull metal with worn patches',price:250,currency:'scrap',wasteland:true,appearance:Object.freeze({id:'boneyard-silver',name:'Boneyard Silver',color:0x777a73,metalness:.72,roughness:.74,clearcoat:.08,clearcoatRoughness:.82})}),
  'scrap-patchwork':Object.freeze({id:'scrap-patchwork',name:'Scrap Patchwork',finish:'Welded plates in old colors',price:250,currency:'scrap',wasteland:true,appearance:Object.freeze({id:'scrap-patchwork',name:'Scrap Patchwork',color:0x65705d,metalness:.32,roughness:.86,clearcoat:.04,clearcoatRoughness:.92})}),
  'bowl-flame':Object.freeze({id:'bowl-flame',name:'Bowl Flame',finish:'Scorched red-orange enamel',price:250,currency:'scrap',wasteland:true,appearance:Object.freeze({id:'bowl-flame',name:'Bowl Flame',color:0xa63b20,metalness:.28,roughness:.78,clearcoat:.08,clearcoatRoughness:.86})}),
  'soot-black':Object.freeze({id:'soot-black',name:'Soot Black',finish:'Flat black with ash in the grain',price:250,currency:'scrap',wasteland:true,appearance:Object.freeze({id:'soot-black',name:'Soot Black',color:0x292a27,metalness:.16,roughness:.92,clearcoat:.02,clearcoatRoughness:.96})}),
  'hazard-stripe':Object.freeze({id:'hazard-stripe',name:'Hazard Stripe',finish:'Worn safety yellow',price:250,currency:'scrap',wasteland:true,appearance:Object.freeze({id:'hazard-stripe',name:'Hazard Stripe',color:0xb18c29,metalness:.24,roughness:.84,clearcoat:.04,clearcoatRoughness:.9})}),
  titan_gold:Object.freeze({id:'titan_gold',name:'Hollow Gold',finish:'Gold metallic reward',price:0,reward:'muddy-hollow',car:'titan_monster',appearance:Object.freeze({id:'titan_gold',name:'Hollow Gold',color:0xd8a72e,metalness:.82,roughness:.2,clearcoat:1,clearcoatRoughness:.08})}),
  // The Deep (THE_DEEP 6.5): all nine pearls, for every car the player owns. Earned
  // from the save itself and never taken away, so it needs no switch argument.
  pearl_white:Object.freeze({id:'pearl_white',name:'Pearl White',finish:'Pearl sheen reward',price:0,reward:'deep',appearance:Object.freeze({id:'pearl_white',name:'Pearl White',color:0xf1ede4,metalness:.25,roughness:.28,clearcoat:1,clearcoatRoughness:.12})}),
});
const factory=Object.freeze({owned:Object.freeze(['factory']),selected:'factory'});
const WASTELAND_PAINT_IDS=Object.freeze(Object.values(PAINT_PRESETS).filter(item=>item.wasteland).map(item=>item.id));
const ordinaryIds=Object.freeze(Object.values(PAINT_PRESETS).filter(item=>!item.reward&&!item.car&&!item.wasteland).map(item=>item.id));
const knownCar=car=>Object.hasOwn(CARS,car);
const ownsCar=(profile,car)=>knownCar(car)&&(!(CARS[car].price>0)&&!CARS[car].unlockRequirement||profile?.unlockedCars?.includes(car));
const makeState=(owned,selected)=>Object.freeze({owned:Object.freeze(owned),selected});

function rewardEarned(profile,car){
  if(car!=='titan_monster')return false;
  if(profile?.wasteland?.version!==1||profile.wasteland.discoveredGate!==true)return false;
  const progress=normalizeMuddyHollow(profile?.wasteland?.muddyHollow);
  return MUDDY_HOLLOW_HUBCAP_IDS.every(id=>progress.hubcaps.includes(id));
}
function rewardIds(profile,car,{muddyHollowEnabled=false,yetiEnabled=false,includeInactiveRewards=false}={}){
  const muddy=rewardEarned(profile,car)&&(muddyHollowEnabled===true||includeInactiveRewards)?['titan_gold']:[];
  return [...muddy,...(ownsCar(profile,car)&&yetiRewards(profile).frost&&(yetiEnabled===true||includeInactiveRewards)?['frost']:[]),
    ...(ownsCar(profile,car)&&hasAllPearls(profile)?['pearl_white']:[])];
}
const sirenaIds=['sea-wreck','restored-1966'];
const skylineIds=['skyline_white','skyline_silver','skyline_black'];
const sirenaOn=options=>options?.labEnabled===true&&options?.deepEnabled===true;
function allowedIds(profile,car,options){
  const wasteland=options?.wastelandTownEnabled===true&&profile?.wasteland?.version===1&&profile.wasteland.discoveredGate===true?WASTELAND_PAINT_IDS:[];
  if(car==='falcone_sirena'&&sirenaOn(options))return sirenaIds;
  return [...ordinaryIds,...wasteland,...(car==='nissan_skyline_gtr_r34'?skylineIds:[]),...rewardIds(profile,car,options)];
}
export function normalizePaintState(value,allowed=ordinaryIds){
  const source=value&&typeof value==='object'&&!Array.isArray(value)?value:{};
  const rewards=allowed.filter(id=>PAINT_PRESETS[id]?.reward);
  const owned=[...new Set(['factory',...(Array.isArray(source.owned)?source.owned:[]).filter(id=>typeof id==='string'&&(allowed.includes(id)||WASTELAND_PAINT_IDS.includes(id))),...rewards])];
  const selected=owned.includes(source.selected)?source.selected:'factory';
  return owned.length===1?factory:makeState(owned,selected);
}
export function normalizeCosmetics(value,profile){
  if(!value||typeof value!=='object'||Array.isArray(value))return Object.freeze({});
  return Object.freeze(Object.fromEntries(Object.entries(value).filter(([car])=>knownCar(car)).map(([car,state])=>[car,normalizePaintState(state,[...allowedIds(profile,car,{includeInactiveRewards:true,wastelandTownEnabled:true}),...(car==='falcone_sirena'?sirenaIds:[])])])));
}
export function getPaintState(profile,car,options){
  if(!ownsCar(profile,car))return factory;
  const saved=profile?.cosmetics?.[car];
  // The old dev-only 2,500 restore had no finish marker. Read it without
  // changing the save; the next explicit Lab/paint action persists both.
  if(car==='falcone_sirena'&&sirenaOn(options)&&!saved?.owned?.includes('sea-wreck'))
    return makeState([...new Set(['factory',...(Array.isArray(saved?.owned)?saved.owned:[]).filter(id=>ordinaryIds.includes(id)),...sirenaIds])],
      saved?.selected&&saved.selected!=='factory'&&ordinaryIds.includes(saved.selected)?saved.selected:'restored-1966');
  return normalizePaintState(saved,allowedIds(profile,car,options));
}
export function getEquippedPaintId(profile,car,options){return getPaintState(profile,car,options).selected;}
export function getPaintAppearance(profile,car,options){return PAINT_PRESETS[getEquippedPaintId(profile,car,options)].appearance;}
export function paintPresetsFor(profile,car,options){return allowedIds(profile,car,options).map(id=>PAINT_PRESETS[id]);}

function operation(profile,car,id,buy,options){
  const fail=reason=>({profile,ok:false,reason,cost:0,purchased:false,changed:false});
  if(!knownCar(car))return fail('Choose an available car.');
  if(!ownsCar(profile,car))return fail('Unlock this car before choosing paint.');
  if(!Object.hasOwn(PAINT_PRESETS,id))return fail('Choose an available paint finish.');
  if(!allowedIds(profile,car,options).includes(id))return fail('Earn this paint finish before applying it.');
  const state=getPaintState(profile,car,options),owned=state.owned.includes(id),preset=PAINT_PRESETS[id];
  if(!owned&&!buy)return fail('Buy this finish for this car before applying it.');
  if(id==='sea-wreck'&&!owned)return fail('Get her running at the Rust bench first.');
  const cost=owned?0:preset.price,wastelandCurrency=preset.currency==='scrap';
  const balance=wastelandCurrency?profile?.wasteland?.scrap:profile?.credits;
  const funds=Number.isFinite(balance)?Math.min(1_000_000_000,Math.max(0,Math.floor(balance))):0;
  if(wastelandCurrency&&(options?.wastelandTownEnabled!==true||profile?.wasteland?.version!==1||profile.wasteland.discoveredGate!==true))return fail('Open the Wasteland town before buying this finish.');
  if(cost>funds)return fail(`You need ${cost-funds} more ${wastelandCurrency?'scrap':'credits'}.`);
  if(owned&&state.selected===id)return {profile,ok:true,reason:'',cost:0,purchased:false,changed:false};
  const cosmetics=Object.freeze({...normalizeCosmetics(profile.cosmetics,profile),[car]:makeState([...new Set([...(normalizeCosmetics(profile.cosmetics,profile)[car]?.owned??[]),...state.owned,...(owned?[]:[id])])],id)});
  return {profile:{...profile,credits:cost&&!wastelandCurrency?funds-cost:profile.credits,...(wastelandCurrency?{wasteland:{...profile.wasteland,scrap:cost?funds-cost:profile.wasteland.scrap}}:{}),cosmetics},ok:true,reason:'',cost,purchased:!owned,changed:true};
}
// Purchases equip the finish immediately. Reapplying an owned finish is free,
// including a repeated purchase action from a stale garage button.
export const purchasePaint=(profile,car,id,options)=>operation(profile,car,id,true,options);
export const applyPaint=(profile,car,id,options)=>operation(profile,car,id,false,options);
