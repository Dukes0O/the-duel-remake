---
task: RFX-05
status: merged
kind: input-refactor
flag: none
player_facing: no
---

## What changed

`src/input-contexts.js` owns keyboard and gamepad maps for car, menu, foot,
and photo controls. `App` selects the menu map in the garage and the car map
during a race. A context override can select foot or photo controls when
those modes arrive. Changing context releases held car controls; menu, foot,
and photo input cannot drive the car or trigger its weapon bindings.

The car map retains the current arrow steering, W/S pedals, Space boost,
camera keys, number-key weapons, shifts, pause, restart, and gamepad edges.
Menu Escape remains handled by the existing modal listener in `main.js`.
Foot and photo actions are mapped but their gameplay handlers are reserved
for their later feature cards.

## Verification

- `node tools/test-input-contexts.mjs` checks all four maps, overlapping key
  isolation, controller edge order, pedal axes, menu driving isolation and
  context transitions.
- The keyboard steering lifecycle check now starts a new race after returning
  to the menu before testing a fresh steering tap. Before that correction, the
  check tried to steer an inactive menu car and failed at zero authority.
- Existing keyboard steering (96 checks), app lifecycle, gamepad weapon and
  combat checks passed. The changed lane gate passed 61/61 suites in 312.27
  seconds, and `npm run build` passed.
- Branch browser smoke reached the High race. Its second tab hit the older
  FND-10 QA storage collision (`IndexedDB career snapshot does not match the
  unmigrated local career`) because this branch predates integration's
  `4222720` tab-isolation fix. The exact integration state needs a fresh
  browser smoke after cherry-picking this card.
- Cherry-picked as `881759a` onto the QA-fixed integration branch. The exact
  state passed 152/152 merge suites in 186.24 seconds, the production build,
  and private High/Performance smoke with four screenshots and zero warnings
  or errors. This confirms the branch-only second-tab issue is resolved.

## Limits

The foot and photo modes do not exist yet. Their action maps are definitions
for later work; this card adds no new player mode or menu navigation scheme.
