export const WEAPON_IDS=Object.freeze(['ufo','bomb','crossbow','star']);
export const WEAPON_UPGRADE_COSTS=Object.freeze([350,700,1200]);
export const WASTELAND_UPGRADE_COSTS=Object.freeze([150,300,600]);
export function normalizeWeapons(value){
 return {version:1,unlocked:[...WEAPON_IDS],levels:Object.fromEntries(WEAPON_IDS.map(id=>[id,Number.isFinite(value?.levels?.[id])?Math.max(0,Math.min(3,Math.floor(value.levels[id]))):0]))};
}
export function getProfileWeapons(profile){
 const nested=normalizeWeapons(profile?.wasteland?.weapons),legacy=normalizeWeapons(profile?.weapons);
 return {...nested,levels:Object.fromEntries(WEAPON_IDS.map(id=>[id,Math.max(nested.levels[id],legacy.levels[id])]))};
}
export function purchaseWeaponUpgrade(profile,id,{wastelandEnabled=false}={}){
 if(Number.isSafeInteger(profile?.wasteland?.version)&&profile.wasteland.version>1)
  return {ok:false,profile,reason:'This career needs a newer game build.'};
 const weapons=getProfileWeapons(profile),level=weapons.levels[id];
 if(!WEAPON_IDS.includes(id)||level>=3)return {ok:false,profile,reason:'This weapon is already maxed or unavailable.'};
 const wastelandCareer=wastelandEnabled&&profile?.wasteland?.version===1&&profile.wasteland.discoveredGate===true;
 const cost=(wastelandCareer?WASTELAND_UPGRADE_COSTS:WEAPON_UPGRADE_COSTS)[level];
 const balance=wastelandCareer?profile.wasteland.scrap:profile.credits;
 if(!Number.isSafeInteger(balance)||balance<cost)return {ok:false,profile,
  reason:`You need ${cost} ${wastelandCareer?'scrap':'credits'} for this upgrade.`};
 const {weapons:legacyWeapons,...rest}=profile;
 return {ok:true,profile:{...rest,credits:wastelandCareer?profile.credits:profile.credits-cost,wasteland:{...profile.wasteland,version:profile.wasteland?.version??1,
  ...(wastelandCareer?{scrap:balance-cost}:{}),
  weapons:{...weapons,levels:{...weapons.levels,[id]:level+1}}}},cost};
}
export function weaponSignature(result){
 if(result.mode!=='wasteland')return '';
 const levels=normalizeWeapons({levels:result.weaponLevels}).levels;
 return WEAPON_IDS.some(id=>levels[id]>0)?WEAPON_IDS.map(id=>levels[id]).join('-'):'';
}
