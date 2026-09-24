import {CREW, crewRank, selectedCrewId} from './crew.js';

function perkStatus(member) {
  if (member.id === 'wren') return 'SPRINT READY · CRATE REACH LATER';
  return member.active ? 'PASSIVE READY' : 'PASSIVE HOOK · LATER CARD';
}

function crewCard(member, {rank, selected, ready, scrapCareer, owned, scrap, escapeHTML}) {
  const unlocked = rank >= member.rank;
  const chosen = ready && selected === member.id;
  const accent = `#${member.appearance.accent.toString(16).padStart(6, '0')}`;
  const price = scrapCareer && member.id !== 'rook' && !owned.includes(member.id) ? 300 : 0;
  const buttonText = !ready ? 'CAREER NOT READY' : chosen ? 'SELECTED'
    : !unlocked ? `UNLOCKS AT RANK ${member.rank}`
    : price ? `HIRE · ${price} SCRAP` : 'SELECT CREW';
  const disabled = !ready || chosen || !unlocked || price > scrap ? 'disabled' : '';

  return `<article class="crew-card${chosen ? ' is-selected' : ''}"
      style="--crew-accent:${accent}">
    <div class="crew-card-head">
      <span class="crew-initial" aria-hidden="true">${member.name[0]}</span>
      <div><h3>${escapeHTML(member.name)}</h3>
        <span>${escapeHTML(member.role)}</span></div>
    </div>
    <p class="crew-perk">${escapeHTML(member.perk)}</p>
    <p class="crew-gear">SIGNATURE · ${escapeHTML(member.gear)}
      <small>gear in a later card</small></p>
    <p class="crew-perk-status">${perkStatus(member)}</p>
    <button type="button" data-crew-select="${member.id}"
      aria-pressed="${chosen}" ${disabled}>${buttonText}</button>
  </article>`;
}

export function crewPanel(profile, escapeHTML) {
  const rank = crewRank(profile);
  const selected = selectedCrewId(profile);
  const ready = profile?.wasteland?.version === 1;
  const scrapCareer = profile?.wasteland?.discoveredGate === true;
  const intro = ready ? '' :
    ' Crew selection is unavailable until this player’s Wasteland career is ready.';
  const context = {rank, selected, ready, scrapCareer,
    owned: profile?.wasteland?.crew?.unlocked || [],
    scrap: profile?.wasteland?.scrap || 0, escapeHTML};

  return `<details class="crew-panel" open>
    <summary>CREW · WHO GETS OUT</summary>
    <p class="crew-intro">Your driver still controls the car. Your selected crew
      member fights on foot. ${scrapCareer?'Reach their rank, then hire them with scrap.':'Rank unlocks are free.'}${intro}</p>
    <div class="crew-grid">${Object.values(CREW)
      .map(member => crewCard(member, context)).join('')}</div>
  </details>`;
}
