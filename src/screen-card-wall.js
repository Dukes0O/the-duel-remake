import {ownedStoryCards,wantedPosterFor,storyCardFor} from './warlord-cards.js';
import {crewMember} from './crew.js';
import {CARS} from './config.js';

const picture=(view,label,escapeHTML)=>`<img class="warlord-card-picture" data-card-view="${escapeHTML(JSON.stringify(view))}" alt="${escapeHTML(label)}" width="640" height="360"><p class="card-art-status" role="status">Preparing model picture…</p>`;
export function cardWallScreen(profile,escapeHTML) {
  const cards=ownedStoryCards(profile);
  return `<section class="warlord-card-wall" aria-label="Warlord story wall"><h3>THE ROAD REMEMBERS</h3><p>Your victories, pinned to the Scrapdome wall.</p><div class="story-card-grid">${cards.length?cards.map(card=>`<article class="warlord-story-card" data-story-card="${card.id}">${picture({carId:card.carId,warlordId:card.id},card.name+' fight car',escapeHTML)}<h4>${escapeHTML(card.name)}</h4>${card.lines.map(line=>`<p>${escapeHTML(line)}</p>`).join('')}</article>`).join(''):'<p class="card-wall-empty">Win a warlord fight to pin your first story here.</p>'}</div></section>`;
}
export function wantedPosterScreen(state,escapeHTML,options) {
  const poster=wantedPosterFor(state,options);if(!poster)return '';
  const crew=crewMember(poster.crewId),warlord=storyCardFor(poster.warlordId);
  const minutes=Math.floor(poster.timeSec/60),seconds=(poster.timeSec%60).toFixed(1).padStart(4,'0');
  return `<article class="warlord-wanted-poster" data-wanted-poster="${poster.warlordId}"><p class="eyebrow">WANTED · ROAD CONQUEROR</p>${picture({carId:poster.carId,crewId:poster.crewId,kit:state.combatArmorKit,roofLook:state.combatRoofLook,paint:options?.paint},'Your winning '+(CARS[poster.carId]?.name||poster.carId)+' and '+(crew?.name||poster.crewId),escapeHTML)}<h3>${escapeHTML(crew?.name||poster.crewId)}</h3><p>${escapeHTML(CARS[poster.carId]?.name||poster.carId)} · defeated ${escapeHTML(warlord.name)}</p><dl><div><dt>WRECKS</dt><dd>${poster.wrecks}</dd></div><div><dt>HITS</dt><dd>${poster.hits}</dd></div><div><dt>TIME</dt><dd>${minutes}:${seconds}</dd></div></dl></article>`;
}
