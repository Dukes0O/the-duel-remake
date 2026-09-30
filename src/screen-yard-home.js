import {territoryPanel} from './screen-territory.js';
import {crewPanel} from './crew-ui.js';

const button = (label, action) => `<button type="button" data-action="${action}">${label}</button>`;

export function yardHomeScreen({profile, playerName, escapeHTML, panel = 'home',
  armoryMarkup = '', message = '', arenaMarkup = '', warlordsAvailable = false}) {
  const career = profile?.wasteland;
  const wallet = `<span class="yard-wallet">${Math.floor(career?.scrap || 0).toLocaleString()} SCRAP</span>`;
  const header = `<header class="yard-home-header"><div><p class="eyebrow">BEYOND THE RUSTWALL</p><h2 id="yard-home-title">SCRAPDOME YARD</h2><p>${escapeHTML(playerName)} · Your Wasteland home</p></div>${wallet}</header>`;
  const nav = `<nav class="yard-home-nav" aria-label="Wasteland home">${button('CAREER', 'yard-career')}${button('TERRITORY MAP', 'yard-territory')}${button('ARMORY', 'yard-armory')}${button('CREW', 'yard-crew')}${arenaMarkup ? button('SCRAPDOME', 'yard-scrapdome') : ''}</nav>`;
  const intro = '<p>Win Mad Max Duel events to earn scrap and build territory hold. The yard is your place to prepare for the next fight.</p>';
  const claimed = Object.values(career?.territories || {}).filter(territory => territory.claimed).length;
  const canFight = !!arenaMarkup && warlordsAvailable;
  const fightCopy = canFight ? 'Sal is waiting on the territory map.' : 'Warlord fights are coming later.';
  const careerContent = `<div class="yard-home-intro"><h3>YOUR WASTELAND CAREER</h3><p>Notoriety rank ${career?.rank || 1} · ${Math.floor(career?.xp || 0).toLocaleString()} XP · ${claimed} territories claimed</p>${intro}<p>Win four events in a territory to fill its hold. ${fightCopy}</p></div>`;
  let content;
  if (panel === 'scrapdome' && arenaMarkup) content = arenaMarkup;
  else if (panel === 'territory') content = territoryPanel(profile, canFight ? {} : {builtWarlordIds: []});
  else if (panel === 'crew') content = crewPanel(profile, escapeHTML);
  else if (panel === 'armory') content = armoryMarkup;
  else if (panel === 'career') content = careerContent;
  else {
    const homeCopy = canFight ? 'The Scrapdome is open. Fill Sal’s territory hold to fight her from the map.' :
      arenaMarkup ? 'The Scrapdome is open. Warlord fights are coming later.' : 'Warlord fights and the arena are coming later.';
    content = `<div class="yard-home-intro">${intro}<p>${homeCopy}</p></div>`;
  }
  return `<section class="yard-home-panel" role="dialog" aria-modal="true" aria-labelledby="yard-home-title" data-yard-panel="${panel}">${header}${nav}<div class="yard-home-content">${content}</div><p class="yard-home-message" role="status">${escapeHTML(message)}</p><footer>${panel === 'home' ? '' : button('BACK TO YARD', 'yard-home')}${button('RETURN TO MAIN MENU', 'yard-menu')}</footer></section>`;
}
