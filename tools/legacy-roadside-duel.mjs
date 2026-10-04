import {Duel} from '../src/game.js';

// Historical pre-roadside replay and isolation fixtures only. Never imported
// by the game or a production build. Current Wasteland always has roadside
// destruction; the old deterministic baseline still checks other race rules.
// The five Wasteland features released on 4 October 2026 (Fuel Run, Bounty Hunt,
// Arsenal, Salt Flats, Crew gear) are pinned off here: these fixtures keep the
// earlier rules as their baseline unless a test passes its own flags.
export const PRE_RELEASE_FLAGS = Object.freeze({arsenal: false, 'crew-gear': false,
  'fuel-run': false, 'bounty-hunt': false, 'salt-flats': false});

export class LegacyRoadsideDuel extends Duel {
  constructor(options = {}) { super({...options, featureFlags: options.featureFlags ?? PRE_RELEASE_FLAGS}); }
  destructionEnabled() { return false; }
  roadsideKnockAwayEnabled() { return false; }
}

// The first roadside release had breakable trees and traffic without the
// later CMB-08 knock-away contact. Keep its focused rules under test.
export class ClassicDestructionDuel extends LegacyRoadsideDuel {
  destructionEnabled() { return true; }
}
