import {CREW,crewRank,selectedCrewId} from './crew.js';

export function crewPanel(profile,escapeHTML){
  const rank=crewRank(profile),selected=selectedCrewId(profile);
  return `<details class="crew-panel" open><summary>CREW · WHO GETS OUT</summary><p class="crew-intro">Your driver still controls the car. Your selected crew member fights on foot. Rank unlocks are free.</p><div class="crew-grid">${Object.values(CREW).map(member=>{
    const unlocked=rank>=member.rank,chosen=selected===member.id;
    const accent=`#${member.appearance.accent.toString(16).padStart(6,'0')}`;
    return `<article class="crew-card${chosen?' is-selected':''}" style="--crew-accent:${accent}"><div class="crew-card-head"><span class="crew-initial" aria-hidden="true">${member.name[0]}</span><div><h3>${escapeHTML(member.name)}</h3><span>${escapeHTML(member.role)}</span></div></div><p class="crew-perk">${escapeHTML(member.perk)}</p><p class="crew-gear">SIGNATURE · ${escapeHTML(member.gear)} <small>gear in a later card</small></p><p class="crew-perk-status">${member.id==='wren'?'SPRINT READY · CRATE REACH LATER':member.active?'PASSIVE READY':'PASSIVE HOOK · LATER CARD'}</p><button type="button" data-crew-select="${member.id}" aria-pressed="${chosen}" ${chosen||!unlocked?'disabled':''}>${chosen?'SELECTED':unlocked?'SELECT CREW':`UNLOCKS AT RANK ${member.rank}`}</button></article>`;
  }).join('')}</div></details>`;
}
