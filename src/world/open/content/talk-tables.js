// Every talk table of the open land, by person, from one file for each card. A person may have rows in several
// files. They are joined in this order: a storyline's rows first, then the sites', the forge's and the town's, so
// that a storyline's words are heard before a greeting. The first row whose condition is true is the talk that a
// walk up to that person starts. Checked as it is loaded.
import {checkTalkRow} from '../check-tables.js';
import {nameRow} from '../register.js';
import {THREADS_TALK} from './talk-threads.js';
import {SITES_TALK} from './talk-sites.js';
import {FORGE_TALK} from './talk-forge.js';
import {TOWN_TALK} from './talk-town.js';

export function joinTalkTables(tables) {
  const joined = {}, wrong = [];
  for (const table of tables) for (const [person, rows] of Object.entries(table)) {
    if (!nameRow(person)) wrong.push('"' + person + '" has a talk table and is not in the register.');
    if (!Array.isArray(rows)) { wrong.push(person + ': a talk table is a list of rows.'); continue; }
    for (const row of rows) wrong.push(...checkTalkRow(row).map(text => person + ': ' + text));
    joined[person] = [...(joined[person] ?? []), ...rows];
  }
  if (wrong.length) throw new Error('The talk tables of the open land:\n  ' + wrong.join('\n  '));
  return Object.freeze(Object.fromEntries(Object.entries(joined).map(([person, rows]) => [person, Object.freeze(rows)])));
}

export const TALK_TABLES = joinTalkTables([THREADS_TALK, SITES_TALK, FORGE_TALK, TOWN_TALK]);
