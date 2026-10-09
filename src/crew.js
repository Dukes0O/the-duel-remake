import {rankForXp} from './notoriety.js';
import {vesperEarned} from './warlords.js';

// These eight ordinary identities also define the seeded computer field.
// Earned Vesper metadata stays outside this catalog, preserving that field.
export const CREW=Object.freeze({
  rook:Object.freeze({id:'rook',name:'Rook Calloway',role:'Drifter · all-rounder',
    perk:'+10% on-foot health',gear:'RPG handling',rank:1,
    active:true,perks:Object.freeze({healthMultiplier:1.1}),
    appearance:Object.freeze({coat:0x526269,vest:0xaea38b,armor:0x817e72,
      trousers:0x444744,helmet:0xb0a58c,skin:0xc49a7d,accent:0xd5bb8f,
      shoulder:1,pack:1,hood:false})}),
  nell:Object.freeze({id:'nell',name:'Nell "Fuse" Okafor',role:'Demolitions',
    perk:'Blasts 20% wider',gear:'Sticky Bombs',rank:4,
    active:true,perks:Object.freeze({blastRadiusMultiplier:1.2}),
    appearance:Object.freeze({coat:0xa35e3c,vest:0x4f4039,armor:0x9c7860,
      trousers:0x7f4c3b,helmet:0x8b7660,skin:0x8c5942,accent:0xe5a46d,
      shoulder:.9,pack:1.12,hood:false})}),
  jax:Object.freeze({id:'jax',name:'Jax Harrow',role:'Harpooner',
    perk:'Boards cars up to 90 km/h',gear:'Grapple',rank:8,
    active:true,perks:Object.freeze({boardMaxKph:90}),
    appearance:Object.freeze({coat:0x343c3d,vest:0x544b42,armor:0x6e6b64,
      trousers:0x34383a,helmet:0x383c3a,skin:0xb88972,accent:0xb4a58d,
      shoulder:1.05,pack:1.05,hood:false})}),
  odessa:Object.freeze({id:'odessa',name:'Odessa Gears',role:'Mechanic',
    perk:'Repairs twice as fast',gear:'Scrap Turret',rank:10,
    active:true,perks:Object.freeze({repairRateMultiplier:2}),
    appearance:Object.freeze({coat:0xa0783f,vest:0x565044,armor:0x9b805d,
      trousers:0x8f7653,helmet:0xa99b80,skin:0xd4ad94,accent:0xd8ad5f,
      shoulder:.95,pack:1.2,hood:false})}),
  cinder:Object.freeze({id:'cinder',name:'Cinder Ruiz',role:'Flame specialist',
    perk:'Immune to fire',gear:'Hand Flamer',rank:12,
    active:true,perks:Object.freeze({fireImmune:true}),
    appearance:Object.freeze({coat:0x333638,vest:0x444543,armor:0x775e4d,
      trousers:0x34383a,helmet:0x303436,skin:0xad7863,accent:0xd96b35,
      shoulder:.92,pack:1.1,hood:false})}),
  dune:Object.freeze({id:'dune',name:'Dune Marek',role:'Marksman',
    perk:'Longer lock-on range',gear:'Marksman Crossbow',rank:16,
    active:true,perks:Object.freeze({lockRangeMultiplier:1.25}),
    appearance:Object.freeze({coat:0x52626a,vest:0x777a76,armor:0x788184,
      trousers:0x4c565a,helmet:0x9b978a,skin:0xb79178,accent:0xbbb79f,
      shoulder:.88,pack:.85,hood:true})}),
  wren:Object.freeze({id:'wren',name:'Wren Ashby',role:'Scout',
    perk:'Sprints 20% faster; grabs crates from 4 m',gear:'Smoke Grenades',rank:20,
    active:true,perks:Object.freeze({sprintMultiplier:1.2,crateReachMeters:4}),
    appearance:Object.freeze({coat:0xb39c75,vest:0x77715d,armor:0x9f9276,
      trousers:0x77705b,helmet:0x8c7a5f,skin:0xc69c7f,accent:0xc6ae81,
      shoulder:.85,pack:.85,hood:false})}),
  tusk:Object.freeze({id:'tusk',name:'Tusk Brannigan',role:'Heavy',
    perk:'Can shove a parked car',gear:'Scrap Cannon',rank:25,
    active:true,perks:Object.freeze({parkedCarShove:true}),
    appearance:Object.freeze({coat:0x5a4138,vest:0x493831,armor:0x876a58,
      trousers:0x563f35,helmet:0x473e37,skin:0xb38169,accent:0xb88969,
      shoulder:1.24,pack:1.12,hood:false})}),
});

export const VESPER = Object.freeze({id:'vesper',name:'Vesper Blackiron',
  role:'Scout-mechanic',perk:'Shock Charge recharges 25% faster',gear:'Shock Charge',
  rank:1,active:true,perks:Object.freeze({signatureRechargeMultiplier:.75}),
  appearance:Object.freeze({coat:0x1b1815,vest:0x40474f,armor:0x40474f,
    trousers:0x1b1815,helmet:0x282c31,skin:0xd4ad94,accent:0x7a110d,
    shoulder:.95,pack:1.2,hood:false})});
export function crewMember(id){return id === 'vesper' ? VESPER : Object.hasOwn(CREW,id) ? CREW[id] : null;}
export function crewRoster(profile,{warlordCardsEnabled=false}={}){
  return [...Object.values(CREW),...(warlordCardsEnabled &&
    profile?.wasteland?.discoveredGate === true && vesperEarned(profile) ? [VESPER] : [])];
}
export function crewPerks(id){return (crewMember(id)||CREW.rook).perks;}
export function crewAppearance(id){return (crewMember(id)||CREW.rook).appearance;}
export function crewRank(profile){return rankForXp(profile?.wasteland?.xp||0);}
function crewAdmitted(profile,id,options){
  if (id === 'vesper') return crewRoster(profile,options).includes(VESPER);
  if (!CREW[id]) return false;
  if (CREW[id].rank <= crewRank(profile)) return true;
  return id === 'tusk' && profile?.wasteland?.version === 1 &&
    Array.isArray(profile.wasteland.crew?.unlocked) && profile.wasteland.crew.unlocked.includes(id);
}
export function availableCrew(profile,options){
  return crewRoster(profile,options).filter(member=>crewAdmitted(profile,member.id,options));
}
export function selectedCrewId(profile,options){
  const id=profile?.wasteland?.crew?.selected;
  return profile?.wasteland?.version===1 && crewAdmitted(profile,id,options) ? id : 'rook';
}
export function selectCrew(profile,id,options){
  if(profile?.wasteland?.version!==1)
    return {ok:false,changed:false,profile,reason:'This career is not ready for Wasteland crew changes.'};
  const member=crewMember(id);
  if(!member || !crewAdmitted(profile,id,options))
    return {ok:false,changed:false,profile,reason: id==='vesper' ? 'Defeat the Baron to earn Vesper.' :
      member ? `Reach Notoriety rank ${member.rank} first.` : 'Choose a known crew member.'};
  if(selectedCrewId(profile,options)===id) return {ok:true,changed:false,profile,id};
  const current=profile.wasteland.crew||{};
  const scrapCareer=profile.wasteland.discoveredGate===true;
  const owned=Array.isArray(current.unlocked)&&current.unlocked.includes(id);
  const cost=scrapCareer&&id!=='rook'&&id!=='vesper'&&!owned?300:0;
  if(cost&&(!Number.isSafeInteger(profile.wasteland.scrap)||profile.wasteland.scrap<cost))
    return {ok:false,changed:false,profile,id,reason:`You need ${cost} scrap for this crew member.`};
  const unlocked=[...new Set([...(Array.isArray(current.unlocked)?current.unlocked:[]),'rook',id])];
  return {ok:true,changed:true,id,profile:{...profile,wasteland:{...profile.wasteland,
    ...(cost?{scrap:profile.wasteland.scrap-cost}:{}),crew:{...current,unlocked,selected:id}}}};
}
