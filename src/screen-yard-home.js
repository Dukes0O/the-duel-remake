import {cardWallScreen} from './screen-card-wall.js';
import {territoryPanel} from './screen-territory.js';
import {crewPanel} from './crew-ui.js';
import {COURSE} from './config.js';
import {WARLORDS, WARLORD_LADDER, warlordUnlockSatisfied} from './warlords.js';
import {warlordEnabled} from './warlords/index.js';
import {featureFlags as defaultFeatureFlags} from './feature-flags.js';
import {waterNextUp, waterWallMarkup} from './story/water-ui.js';
import {emberNextUp, emberWallMarkup} from './story/ember-ui.js';
import {yardThingsToTry} from './yard-things-to-try.js';

const button = (label, action) => `<button type="button" data-action="${action}">${label}</button>`;
const courseNames = new Map(COURSE.map(course => [course.id, course.name]));
const defeated = (career, id) => career?.warlords?.[id]?.defeated === true ||
  Array.isArray(career?.warlords?.defeated) && career.warlords.defeated.includes(id);

// Where a win counts for a warlord's territory, in plain words.
function winPlaces(warlord, career, flags, one) {
  const s = one ? '' : 's';
  const courses = warlord.courses.map(id => courseNames.get(id)).filter(Boolean).join(' or ');
  const places = courses ? [`Mad Max Duel race${s} on ${courses}`] : [];
  // Every Scrapdome game but the Convoy Raid adds Kettle's hold (arena-settlement.js).
  if (warlord.id === 'kettle') places.push(`Scrapdome game${s} against two or more cars`);
  // The Convoy Raid shows in the yard only once the Tollkeeper's hold has begun.
  if (warlord.id === 'tollkeeper' && flags.enabled('salt-flats') === true && flags.enabled('convoy-raid') === true &&
      career?.territories?.tollkeeper?.hold > 0)
    places.push(`Convoy Raid${s} on the Salt Flats${career?.rank >= 9 ? '' : ' (they open at rank 9)'}`);
  return places.join(', or ');
}

// The yard's "Next up" line, read from the save: the first warlord on the
// ladder not yet beaten, and the one thing that opens or starts that fight.
export function yardNextStep(profile, {featureFlags} = {}) {
  const career = profile?.wasteland;
  const flags = featureFlags ?? defaultFeatureFlags;
  const ladder = WARLORD_LADDER.filter(id => warlordEnabled({featureFlags: flags}, id));
  if (!ladder.length) return 'Warlord fights are coming later.';
  const id = ladder.find(other => !defeated(career, other));
  if (!id) return 'Next up: every warlord is beaten. Rematch any of them from the TERRITORY MAP.';
  const warlord = WARLORDS[id];
  if (warlordUnlockSatisfied(profile, id))
    return `Next up: ${warlord.name} is waiting. Open the TERRITORY MAP and press FIGHT.`;
  const held = career?.territories?.[id]?.hold;
  const hold = Number.isSafeInteger(held) ? Math.max(0, Math.min(100, held)) : 0;
  // Only the Baron can be held at 100 and still shut: one of the others is beaten
  // first, and a fight that is switched off cannot be.
  if (hold === 100) return `Next up: ${warlord.name}'s fight is coming later.`;
  const wins = Math.ceil((100 - hold) / 25);
  const places = winPlaces(warlord, career, flags, wins === 1);
  return `Next up: ${warlord.name}. Win ${wins} more ${places}${places.includes(', or ') ? ',' : ''} to open the fight.`;
}

export function yardHomeScreen({profile, playerName, escapeHTML, panel = 'home',
  armoryMarkup = '', message = '', arenaMarkup = '', warlordsAvailable = false, featureFlags, water = null, ember = null}) {
  const career = profile?.wasteland;
  const wallet = `<span class="yard-wallet">${Math.floor(career?.scrap || 0).toLocaleString()} SCRAP</span>`;
  const header = `<header class="yard-home-header"><div><p class="eyebrow">BEYOND THE RUSTWALL</p><h2 id="yard-home-title">SCRAPDOME YARD</h2><p>${escapeHTML(playerName)} · Your Wasteland home</p></div>${wallet}</header>`;
  const nav = `<nav class="yard-home-nav" aria-label="Wasteland home">${button('CAREER', 'yard-career')}${button('TERRITORY MAP', 'yard-territory')}${button('ARMORY', 'yard-armory')}${button('CREW', 'yard-crew')}${career?.discoveredGate && featureFlags?.enabled('warlord-cards') ? button('STORY WALL','yard-cards') : ''}${arenaMarkup ? button('SCRAPDOME', 'yard-scrapdome') : ''}${featureFlags?.enabled('wasteland-town')===true?button('THE DIG','yard-the-dig')+button('THE TOWN','yard-the-town'):''}</nav>`;
  const intro = '<p>Win Mad Max Duel events to earn scrap and build territory hold. The yard is your place to prepare for the next fight.</p>';
  const claimed = Object.values(career?.territories || {}).filter(territory => territory.claimed).length;
  const canFight = !!arenaMarkup && warlordsAvailable;
  // With the Water Road on, the next step is its open chapter and that chapter's one button.
  const story = canFight ? emberNextUp(ember) ?? waterNextUp(water) : null;
  const fightCopy = story ? story.text : canFight ? yardNextStep(profile, {featureFlags}) : 'Warlord fights are coming later.';
  const storyButton = story?.button ?? '';
  const careerContent = `<div class="yard-home-intro"><h3>YOUR WASTELAND CAREER</h3><p>Notoriety rank ${career?.rank || 1} · ${Math.floor(career?.xp || 0).toLocaleString()} XP · ${claimed} territories claimed</p>${intro}<p>Win four events in a territory to fill its hold. ${fightCopy}</p>${storyButton}</div>`;
  let content;
  if (panel === 'scrapdome' && arenaMarkup) content = arenaMarkup;
  else if (panel === 'territory') content = territoryPanel(profile,
    canFight ? {featureFlags} : {builtWarlordIds: [], featureFlags});
  else if (panel === 'cards' && career?.discoveredGate && featureFlags?.enabled('warlord-cards')) content = emberWallMarkup(ember) + waterWallMarkup(water) + cardWallScreen(profile,escapeHTML);
  else if (panel === 'crew') content = crewPanel(profile, escapeHTML,{gearEnabled:featureFlags?.enabled('crew-gear')===true,warlordCardsEnabled:featureFlags?.enabled('warlord-cards')===true && featureFlags?.enabled('crew-gear')===true});
  else if (panel === 'armory') content = armoryMarkup;
  else if (panel === 'career') content = careerContent;
  else {
    const homeCopy = canFight ? `The Scrapdome is open. ${fightCopy}` :
      arenaMarkup ? 'The Scrapdome is open. Warlord fights are coming later.' : 'Warlord fights and the arena are coming later.';
    content = `<div class="yard-home-intro">${intro}<p>${homeCopy}</p>${storyButton}</div>${featureFlags?.enabled('gear-find') ? yardThingsToTry(profile, escapeHTML) : ''}`;
  }
  return `<section class="yard-home-panel" role="dialog" aria-modal="true" aria-labelledby="yard-home-title" data-yard-panel="${panel}">${header}${nav}<div class="yard-home-content">${content}</div><p class="yard-home-message" role="status">${escapeHTML(message)}</p><footer>${panel === 'home' ? '' : button('BACK TO YARD', 'yard-home')}${button('RETURN TO MAIN MENU', 'yard-menu')}</footer></section>`;
}
