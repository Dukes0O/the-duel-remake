// The world a job in the open land begins with, read from a profile. It only reads: the saved ledger if there is
// one, the scrap the player carries, and a new open record. Card OPEN-STATE replaces the new record with the saved one.
import {createLedger} from '../../story/ledger.js';
import {savedLedger} from '../../story/ledger-save.js';
import {newOpenRecord} from './open-record.js';

export function worldForProfile(profile, seed = 0) {
  const saved = savedLedger(profile);
  const ledger = saved ? structuredClone(saved) : createLedger({seed: seed >>> 0, night: 1});
  return {seed: ledger.seed, ledger, open: newOpenRecord({seed: ledger.seed}),
    scrap: Math.max(0, Math.floor(profile?.wasteland?.scrap ?? 0)), town: null};
}
