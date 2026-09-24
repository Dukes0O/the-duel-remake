import {WEAPONS} from './combat.js';
import {WEAPON_IDS} from './weapon-upgrades.js';

export const CAR_SLOT_KEYS=Object.freeze(['1','2','3','4']);
export const CAR_SLOT_DIRECTIONS=Object.freeze(['↑','→','↓','←']);
export const CAR_SLOT_PAD=Object.freeze(['Up','Right','Down','Left']);

// The four original weapons are owned. A later weapon appears only after its
// combat implementation exists and this player's save says it was unlocked.
export function availableCarWeapons(profile){
  const implemented=new Set(Object.keys(WEAPONS));
  const unlocked=new Set([...WEAPON_IDS,
    ...(Array.isArray(profile?.wasteland?.weapons?.unlocked)
      ? profile.wasteland.weapons.unlocked : [])]);
  return [...implemented].filter(id=>unlocked.has(id));
}

export function normalizeCarLoadout(value,available=WEAPON_IDS){
  const allowed=new Set(available);
  const chosen=[];
  for(const id of [...(Array.isArray(value)?value:[]),...WEAPON_IDS]){
    if(allowed.has(id)&&!chosen.includes(id))chosen.push(id);
    if(chosen.length===4)break;
  }
  return chosen;
}

export function getCarLoadout(profile){
  return normalizeCarLoadout(profile?.wasteland?.loadout,
    availableCarWeapons(profile));
}

export function equipCarWeapon(profile,slot,id){
  if(Number.isSafeInteger(profile?.wasteland?.version)&&
      profile.wasteland.version>1)
    return {ok:false,profile,reason:'This career needs a newer game build.'};
  if(!Number.isInteger(slot)||slot<0||slot>=4||
      !availableCarWeapons(profile).includes(id))
    return {ok:false,profile,reason:'That weapon is not available.'};
  const loadout=getCarLoadout(profile);
  const from=loadout.indexOf(id);
  if(from===slot)return {ok:true,profile,loadout,changed:false};
  if(from>=0)loadout[from]=loadout[slot];
  loadout[slot]=id;
  return {ok:true,changed:true,loadout,
    profile:{...profile,wasteland:{...profile.wasteland,
      version:profile.wasteland?.version??1,loadout}}};
}
