# Overnight QA, 19 November 2026 (laptop helper for the Director)

Branch `c/overnight-qa-bd8ec4`, built from `integration/wasteland` at `a9d18cabc`. Gathered, not judged: the Director gives every verdict.
Pictures are kept only where a group names them, under `.evidence/` of this worktree (ignored by git).

## Group 1: Kyle's test copy on port 5192

- **Built** 19 November 2026, about 21:05 local, from `a9d18cabc`: `node node_modules/vite/bin/vite.js build --config tools/vite-qa.config.js --outDir .qa-dist/kyle-try` in this worktree (8.7 MB, under 1 s).
- **Served** by `node node_modules/vite/bin/vite.js preview --config tools/vite-qa.config.js --host localhost --port 5192 --strictPort --outDir .qa-dist/kyle-try`, hidden, from this worktree (not the integration folder, not the live folder). Saves are memory-only (`menu-check.html` installs isolated storage).
- **Menu loads:** HTTP 200 on `/tools/menu-check.html`; in a browser the page title is "The Duel — isolated menu review", `__qaApp` exists, status `menu`, and the MENU QA box is shown.
- Flags go in the query as `?flags=a,b,c`. Base address: `http://localhost:5192/tools/menu-check.html`.

| What Kyle can try | Address (after the base) | How to reach it |
| --- | --- | --- |
| Night 2 | `?flags=hidden-road,story-choices,road-riders,crew-gear,warlord-cards,arsenal,arsenal-wave3` | MENU QA box, "Create temporary player ready for Night 2", WASTELAND, Story Wall, "Night 2 · Strangers at the gate" |
| The town | `?flags=wasteland-town` | MENU QA, "Create temporary player who has found the wasteland", WASTELAND (the yard), THE TOWN, name it, then DRIVE |
| The machine yard and the Dig | `?flags=wasteland-town,the-dig` | same player, WASTELAND, the yard's THE DIG button (with `wasteland-town` on too, the town button is also there) |
| The Bowl | `?flags=titan-bowl` | "Create funded temporary player", then pick the course "The Bowl" in the race setup (its place in the list is confirmed in group 5) |
| Animal hits | `?flags=wildlife,wildlife-hits` | "Create funded temporary player", Tremblant Woods, start a race (the monster truck needs `titan_monster` owned: the funded player has 50,000 credits) |
| Wash fights (road riders) | add `road-riders-review` to the query | extra buttons "Fight at the Wash · easy/medium/hard" appear in the MENU QA box |

Checked on this build: the Night 2 flag set above (story-choices, road-riders, wildlife read as on; wasteland-town, the-dig, titan-bowl, wildlife-hits read as off, as expected with that query).
