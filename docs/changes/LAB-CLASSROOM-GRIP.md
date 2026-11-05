# LAB-CLASSROOM-GRIP

## What changed

- Added the Grip classroom lesson and rolling-road board, then registered the lesson under the existing `grip` id and `lab-classroom` switch.
- Reused the original notebook word ids: `grip`, `slip` and `limit`.
- The lesson reads the same `gripBench` function as the challenge. Its rule peaks at 4.297 degrees. At 4 degrees it returns full grip; at 4.5 degrees it returns 0.9973779 grip (99.7378%). The board shows 99% at 4.5 degrees, so a real loss is never rounded up to 100%. At 9 degrees it shows 94%.
- Added a live formula, a four-setting watch, a free test that counts only different settings, a guided prediction, and a two-run challenge that passes through the existing `gripBench.goalMet` path. The existing challenge, reward, save fields and ids are unchanged.
- Added a keyboard-only browser scenario. It sets `drivingLessons: {version: 1, done: {corner: true}}`, checks the locked lesson state in the classroom tests, and waits for the inline Grip challenge to pass and save.

## Proposed Brian voice lines

- `lab.brian.grip.intro`: “A tyre rolls against a road strip while the dial turns it sideways, and a graph shows how much grip remains.”
- `lab.brian.grip.explain`: “This tyre keeps full grip through four degrees, and the game starts lowering grip after about four point three degrees. The Grip challenge asks for full grip at three degrees or more, then a run after grip has started to fall.”
- `lab.brian.grip.pass`: “You have found full grip at three degrees or more and found a setting where grip has started to fall.”

## Checks

- `node --test tools/test-lab-classroom.mjs`: passed, 35/35.
- `node --test tools/test-lab-classroom-page.mjs`: passed, 6/6.
- `node --check tools/scenarios/lab-classroom-grip.mjs`: passed.
- `npm.cmd run build`: passed. Vite reported a duplicated dynamic import warning for `src/game.js`, a large-chunk warning, and plugin timing information.
- Browser scenario: not run here, as directed. Claude will play it on the laptop.
- Lane tier: not run here, as directed.
- Changed assertions: none. New assertions cover Grip behavior, the screen contract, formulas, the 4.5-degree reading, three distinct Show me runs, and the inline challenge. No assertion was weakened.
- Race fingerprints: none recorded. This change adds no racing or simulation code; the Grip challenge uses its existing tyre function and goal.

## Removed

- No existing files, tests, lesson assets or assertions were removed. The old Grip lesson remains for the switch-off path; its cleanup belongs to LAB-CLASSROOM-LIVE.
