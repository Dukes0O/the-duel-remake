import {CARS} from './config.js';

// Appearance values only. Factory restores the renderer's exact original
// material instead of guessing a shared finish for seven different vehicles.
export const PAINT_PRESETS=Object.freeze({
  factory:Object.freeze({id:'factory',name:'Factory',finish:'Original finish',price:0,appearance:null}),
  copper_metallic:Object.freeze({id:'copper_metallic',name:'Copper Metallic',finish:'Warm metallic gloss',price:250,appearance:Object.freeze({id:'copper_metallic',name:'Copper Metallic',color:0xb97046,metalness:.65,roughness:.24,clearcoat:1,clearcoatRoughness:.10})}),
  glacier_satin:Object.freeze({id:'glacier_satin',name:'Glacier Satin',finish:'Pale blue-grey satin',price:400,appearance:Object.freeze({id:'glacier_satin',name:'Glacier Satin',color:0xb9d0d2,metalness:.22,roughness:.48,clearcoat:.35,clearcoatRoughness:.28})}),
});
const factory=Object.freeze({owned:Object.freeze(['factory']),selected:'factory'});
const knownCar=car=>Object.hasOwn(CARS,car);
const ownsCar=(profile,car)=>knownCar(car)&&(!(CARS[car].price>0)&&!CARS[car].unlockRequirement||profile?.unlockedCars?.includes(car));
const makeState=(owned,selected)=>Object.freeze({owned:Object.freeze(owned),selected});

export function normalizePaintState(value){
  if(!value||typeof value!=='object'||Array.isArray(value))return factory;
  const owned=[...new Set(['factory',...(Array.isArray(value.owned)?value.owned:[]).filter(id=>typeof id==='string'&&Object.hasOwn(PAINT_PRESETS,id))])];
  const selected=owned.includes(value.selected)?value.selected:'factory';
  return owned.length===1?factory:makeState(owned,selected);
}
export function normalizeCosmetics(value){
  if(!value||typeof value!=='object'||Array.isArray(value))return Object.freeze({});
  return Object.freeze(Object.fromEntries(Object.entries(value).filter(([car])=>knownCar(car)).map(([car,state])=>[car,normalizePaintState(state)])));
}
export function getPaintState(profile,car){return ownsCar(profile,car)?normalizePaintState(profile?.cosmetics?.[car]):factory;}
export function getEquippedPaintId(profile,car){return getPaintState(profile,car).selected;}
export function getPaintAppearance(profile,car){return PAINT_PRESETS[getEquippedPaintId(profile,car)].appearance;}

function operation(profile,car,id,buy){
  const fail=reason=>({profile,ok:false,reason,cost:0,purchased:false,changed:false});
  if(!knownCar(car))return fail('Choose an available car.');
  if(!ownsCar(profile,car))return fail('Unlock this car before choosing paint.');
  if(!Object.hasOwn(PAINT_PRESETS,id))return fail('Choose an available paint finish.');
  const state=getPaintState(profile,car),owned=state.owned.includes(id),preset=PAINT_PRESETS[id];
  if(!owned&&!buy)return fail('Buy this finish for this car before applying it.');
  const cost=owned?0:preset.price,credits=Number.isFinite(profile?.credits)?Math.max(0,Math.floor(profile.credits)):0;
  if(cost>credits)return fail(`You need ${cost-credits} more credits.`);
  if(owned&&state.selected===id)return {profile,ok:true,reason:'',cost:0,purchased:false,changed:false};
  const cosmetics=Object.freeze({...normalizeCosmetics(profile.cosmetics),[car]:makeState(owned?[...state.owned]:[...state.owned,id],id)});
  return {profile:{...profile,credits:cost?credits-cost:profile.credits,cosmetics},ok:true,reason:'',cost,purchased:!owned,changed:true};
}
// Purchases equip the finish immediately. Reapplying an owned finish is free,
// including a repeated purchase action from a stale garage button.
export const purchasePaint=(profile,car,id)=>operation(profile,car,id,true);
export const applyPaint=(profile,car,id)=>operation(profile,car,id,false);
