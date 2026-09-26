import {CARS} from './config.js';
import {MUDDY_HOLLOW_HUBCAP_IDS, normalizeMuddyHollow} from './wasteland-progress.js';

// Appearance values only. Factory restores the renderer's exact original
// material instead of guessing a shared finish for seven different vehicles.
export const PAINT_PRESETS=Object.freeze({
  factory:Object.freeze({id:'factory',name:'Factory',finish:'Original finish',price:0,appearance:null}),
  copper_metallic:Object.freeze({id:'copper_metallic',name:'Copper Metallic',finish:'Warm metallic gloss',price:250,appearance:Object.freeze({id:'copper_metallic',name:'Copper Metallic',color:0xb97046,metalness:.65,roughness:.24,clearcoat:1,clearcoatRoughness:.10})}),
  glacier_satin:Object.freeze({id:'glacier_satin',name:'Glacier Satin',finish:'Pale blue-grey satin',price:400,appearance:Object.freeze({id:'glacier_satin',name:'Glacier Satin',color:0xb9d0d2,metalness:.22,roughness:.48,clearcoat:.35,clearcoatRoughness:.28})}),
  titan_gold:Object.freeze({id:'titan_gold',name:'Hollow Gold',finish:'Gold metallic reward',price:0,reward:'muddy-hollow',car:'titan_monster',appearance:Object.freeze({id:'titan_gold',name:'Hollow Gold',color:0xd8a72e,metalness:.82,roughness:.2,clearcoat:1,clearcoatRoughness:.08})}),
});
const factory=Object.freeze({owned:Object.freeze(['factory']),selected:'factory'});
const ordinaryIds=Object.freeze(Object.values(PAINT_PRESETS).filter(item=>!item.reward).map(item=>item.id));
const knownCar=car=>Object.hasOwn(CARS,car);
const ownsCar=(profile,car)=>knownCar(car)&&(!(CARS[car].price>0)&&!CARS[car].unlockRequirement||profile?.unlockedCars?.includes(car));
const makeState=(owned,selected)=>Object.freeze({owned:Object.freeze(owned),selected});

function rewardIds(profile,car){
  if(car!=='titan_monster')return [];
  const progress=normalizeMuddyHollow(profile?.wasteland?.muddyHollow);
  return MUDDY_HOLLOW_HUBCAP_IDS.every(id=>progress.hubcaps.includes(id))?['titan_gold']:[];
}
function allowedIds(profile,car){return [...ordinaryIds,...rewardIds(profile,car)];}
export function normalizePaintState(value,allowed=ordinaryIds){
  const source=value&&typeof value==='object'&&!Array.isArray(value)?value:{};
  const rewards=allowed.filter(id=>PAINT_PRESETS[id]?.reward);
  const owned=[...new Set(['factory',...(Array.isArray(source.owned)?source.owned:[]).filter(id=>typeof id==='string'&&allowed.includes(id)),...rewards])];
  const selected=owned.includes(source.selected)?source.selected:'factory';
  return owned.length===1?factory:makeState(owned,selected);
}
export function normalizeCosmetics(value,profile){
  if(!value||typeof value!=='object'||Array.isArray(value))return Object.freeze({});
  return Object.freeze(Object.fromEntries(Object.entries(value).filter(([car])=>knownCar(car)).map(([car,state])=>[car,normalizePaintState(state,allowedIds(profile,car))])));
}
export function getPaintState(profile,car){return ownsCar(profile,car)?normalizePaintState(profile?.cosmetics?.[car],allowedIds(profile,car)):factory;}
export function getEquippedPaintId(profile,car){return getPaintState(profile,car).selected;}
export function getPaintAppearance(profile,car){return PAINT_PRESETS[getEquippedPaintId(profile,car)].appearance;}
export function paintPresetsFor(profile,car){return allowedIds(profile,car).map(id=>PAINT_PRESETS[id]);}

function operation(profile,car,id,buy){
  const fail=reason=>({profile,ok:false,reason,cost:0,purchased:false,changed:false});
  if(!knownCar(car))return fail('Choose an available car.');
  if(!ownsCar(profile,car))return fail('Unlock this car before choosing paint.');
  if(!Object.hasOwn(PAINT_PRESETS,id))return fail('Choose an available paint finish.');
  if(!allowedIds(profile,car).includes(id))return fail('Earn this paint finish before applying it.');
  const state=getPaintState(profile,car),owned=state.owned.includes(id),preset=PAINT_PRESETS[id];
  if(!owned&&!buy)return fail('Buy this finish for this car before applying it.');
  const cost=owned?0:preset.price,credits=Number.isFinite(profile?.credits)?Math.max(0,Math.floor(profile.credits)):0;
  if(cost>credits)return fail(`You need ${cost-credits} more credits.`);
  if(owned&&state.selected===id)return {profile,ok:true,reason:'',cost:0,purchased:false,changed:false};
  const cosmetics=Object.freeze({...normalizeCosmetics(profile.cosmetics,profile),[car]:makeState(owned?[...state.owned]:[...state.owned,id],id)});
  return {profile:{...profile,credits:cost?credits-cost:profile.credits,cosmetics},ok:true,reason:'',cost,purchased:!owned,changed:true};
}
// Purchases equip the finish immediately. Reapplying an owned finish is free,
// including a repeated purchase action from a stale garage button.
export const purchasePaint=(profile,car,id)=>operation(profile,car,id,true);
export const applyPaint=(profile,car,id)=>operation(profile,car,id,false);
