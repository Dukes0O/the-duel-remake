# OPEN-DOORS

Tin Town's two occupied sheds have walkable doors, marked bays and cutaway rooms behind `story-choices`. Odessa mends missing armour. Moss washes road dirt and ash. Each quotes the price and acts on a paid scrap receipt. The field wrench stops at 60% in roam. Wim reads the open car's dirt at the Night 2 gate.

- **Memory-only QA.** The outing test walked through both doors, paid 6 scrap per service, and checked full armour, zero dirt and an untouched profile balance. Refusal, insufficient funds, wall and car clearance, ash, wrench limits and scenario syntax are covered.
- **Cloud checks.** The 18 suites and build passed on `18a0516e5`, including core, OPEN-DOORS, OPEN-SHARED, 306 race fingerprints, 12 combat fingerprints and 65 world-composition checks. The PR lists all suites and commits.
- **Runtime.** Node 24.22.1 reproduced the same Pacific Canyon signature difference on dispatch integration and the first feature commit. Node 22.14.0 passed with the checked-in signatures.
- **Final integration.** `a7029a488` includes `97893717e` and the updated figures. OPEN-DOORS, OPEN-SHARED, story people, all three guards and `npm run build` passed.
- **Changed assertions.** OPEN-SHARED's two empty-table checks now require Odessa and Moss in the joined people table and one matching service scene each. Other cards can contribute rows. Claude's written Rule 18 review is due.
- **Codex decided.** Applied Claude's evening answer. The shops send shared talk and solids requests. Their fixed wall shapes and integration figures work with day as the default hour. The cloud talk stand-in uses real story dialogue and returns the selected choice to the outing.
- **For Claude to run.** Join OPEN-ROAM and OPEN-SITES, run `node tools/browser-harness.mjs scenario open-forge-shed` in memory and `npm run build` on the batch. Drive the wash, inspect both rooms, figures and dirt, and listen with OPEN-SOUND.
- **Removed.** The two solid boxes and opaque shack shells give way to doorway walls and cutaway rooms in roam. Full field-wrench repair gives way to Odessa's paid mend.
