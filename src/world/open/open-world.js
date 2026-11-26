// The world a job in the open land begins with. Reading a profile creates no save fields.
import {createLedger} from '../../story/ledger.js';
import {savedLedger} from '../../story/ledger-save.js';
import {night2Opening} from '../jobs/night-2.js';
import {worldOf} from '../world-save.js';
import {newOpenRecord} from './open-record.js';
import {openScrapBalance, savedOpenRecord} from './open-save.js';
import {isSite} from './register.js';

export function worldForProfile(profile, seed = 0) {
  const saved = savedLedger(profile);
  const ledger = saved ? structuredClone(saved) : createLedger(night2Opening(seed));
  const record = savedOpenRecord(profile);
  const open = record ? structuredClone(record) : newOpenRecord({seed: ledger.seed});
  open.found = [...new Set([...open.found, ...(worldOf(profile).found ?? []).filter(isSite)])];
  return {seed: ledger.seed, ledger, open, scrap: openScrapBalance(profile), town: null};
}
