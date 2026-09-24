import {Duel} from '../src/game.js';

// Historical pre-roadside replay and isolation fixtures only. Never imported
// by the game or a production build. Current Wasteland always has roadside
// destruction; the old deterministic baseline still checks other race rules.
export class LegacyRoadsideDuel extends Duel {
  destructionEnabled() { return false; }
  roadsideKnockAwayEnabled() { return false; }
}

// The first roadside release had breakable trees and traffic without the
// later CMB-08 knock-away contact. Keep its focused rules under test.
export class ClassicDestructionDuel extends LegacyRoadsideDuel {
  destructionEnabled() { return true; }
}
