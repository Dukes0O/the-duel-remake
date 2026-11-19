# CAREER-GRANT

Claude. Kyle, 16 November 2026: "he [Gratian] also should have his wasteland
account notoriety rank placed at 9 and have another 20,000 in scrap credits."

Gratian's player is Spikey Ferns (`player-spikey-ferns`, `tools/career-rebuild.mjs`).
Real careers live in the browser behind the career writer lock, archives and
backups, so the change is made by the game itself at start-up, once, as the
28 October restore was: `src/career-grant-2026-11-16.js`, called from
`src/main.js` after the restore. It saves a verified copy of the career first
(`backupCareer`, reason `before-career-grant`), lifts Spikey Ferns' notoriety
to 7,400 (the start of rank 9) when it is lower, never lowers a higher rank,
adds 20,000 scrap, sets the marker `duel_career_grant_2026_11_16` and shows a
one-line notice. Other players are not touched. Test builds run it only with
`?grant-career` in the address.

Checks: `tools/test-career-grant.mjs` (memory storage: rank 9 and +20,000,
copy first, once only, Dukes00 untouched, a higher rank kept, no player no
change). Removed by CAREER-GRANT-REMOVE after it has run on the laptop.
