// The Night Duel (docs/story/kogane-invitation.md sections 5 and 8.3). Daichi's settings by level, the story mark a
// race carries, the level start, and the one rule that grants the Skyline. Pure: no storage, no race state of its own.
import {KOGANE_SKYLINE, KOGANE_DUEL_LEVELS, storyOf, storyIsNewer, markKoganeDuel, grantKoganeSkyline} from './story-save.js';

export const KOGANE_DUEL_MARK = 'kogane-night-duel';
// The Night version of Kogane Pass (KOGANE-PASS-C7). Only a race on this road can grant.
export const KOGANE_DUEL_COURSE = 'kogane-pass-night';
// Easy: untuned Skyline. Medium: tuning level 2 of 3. Hard: untuned. Full tuning is never used. These are the levels the 30-duel
// runs of tools/test-story-kogane-duel.mjs settled on (the packet's first guess was 0, 1, 2); the change note has the numbers.
export const DAICHI_UPGRADE_LEVEL = Object.freeze({easy: 0, medium: 2, hard: 0});

// The rival settings the game already has (`startCampaign({rival})`). Club driver: no skill bonus.
// Hard keeps only part of the nitro's speed gain (`nitroScale`, src/sim-rival.js): with all of it Hard is out of reach of any driver.
export const DAICHI_NITRO_SCALE = Object.freeze({hard: .5});
export function daichiRival(level) {
  return Object.hasOwn(DAICHI_UPGRADE_LEVEL, level)
    ? {car: KOGANE_SKYLINE, driverId: 'club', upgradeLevel: DAICHI_UPGRADE_LEVEL[level],
      ...(Object.hasOwn(DAICHI_NITRO_SCALE, level) ? {nitroScale: DAICHI_NITRO_SCALE[level]} : {})} : null;
}

// What "Race Daichi" passes to startCampaign for a CPU level (the road and the player's own car come from the setup).
export function koganeDuelStart(level) {
  const rival = daichiRival(level);
  return rival ? {mode: 'duel', opponentCount: 1, cpuDifficulty: level, rival, story: KOGANE_DUEL_MARK} : null;
}

// The duel starts level: Daichi on the line beside the player, not 20 m back. Call once, right after startCampaign.
export function levelStart(duel) {
  const daichi = duel?.state?.opponents?.[0];
  if (!daichi || duel.state.rivalSettings?.car !== KOGANE_SKYLINE) return false;
  daichi.s = 0;
  daichi.prevS = 0;
  return true;
}

const sameRival = (a, b) => !!a && !!b && a.car === b.car && a.driverId === b.driverId && a.upgradeLevel === b.upgradeLevel && a.nitroScale === b.nitroScale;

// Called by settleRace once per race, after its own checks, with the profile it has built and `won` meaning a valid win.
// Returns null when nothing is granted. Otherwise {profile, level, storyCar | storyOwned}. The mark of a race that
// was not started from the Story card, a race on another road or against another rival, a practice or qualifying run,
// a story from a newer game, or a player who has not done the lesson and the delivery, grants nothing and writes nothing.
export function settleKoganeDuel(profile, result, {won, stageId} = {}) {
  if (won !== true || result?.story !== KOGANE_DUEL_MARK || stageId !== KOGANE_DUEL_COURSE) return null;
  if (result.mode !== 'duel' || result.practice === true || result.qualifying === true || result.abandoned === true) return null;
  const level = result.cpuDifficulty;
  if (!KOGANE_DUEL_LEVELS.includes(level) || !sameRival(result.rival, daichiRival(level))) return null;
  if (storyIsNewer(profile)) return null;
  const {kogane} = storyOf(profile);
  if (kogane.lesson !== true || kogane.supplies !== true) return null;
  const car = grantKoganeSkyline(profile);
  if (!car.ok) return null;
  const mark = markKoganeDuel(car.profile, level);
  if (!mark.ok) return null;
  return {profile: mark.profile, level, ...(car.owned ? {storyOwned: true} : {storyCar: KOGANE_SKYLINE})};
}
