---
task: BUG-11
status: review
kind: hud-fix
flag: none
player_facing: yes
---

## What changed

The weapon bar updates a button, its ready state, or the status line only when
the displayed value changes. The bar and race setup now show the D-pad mapping:
Up UFO, Right bomb, Down crossbow, Left star. Keyboard 1–4 still work. Each
button names its keyboard and D-pad control, level, and cooldown for screen
readers.

## Evidence

- The new private-browser scenario counted 145 weapon-bar DOM changes in a
  steady 500 ms race interval before the fix. It counted zero after the fix.
  Its keyboard probe verifies that the
  browser test actually generates a Space-activated button click.
- The scenario pointer-clicks the crossbow, waits until it recharges, then
  presses Space. Space does not fire the crossbow a second time. In Chrome,
  firing disables the button and drops its focus; the suspected P5 bug did not
  reproduce. A temporary run without any click-focus change passed the same
  check, so no extra focus behavior was added.
- The browser scenario uses the memory-only QA entry, a disposable Chrome
  profile, and a private port. It saved a race screenshot with no console
  warnings or errors.
- `npm run build` passed with the existing Vite large-chunk warning.
- `npm run test:lane` passed 150/150 jobs in 381.18 seconds. Replay
  fingerprints stayed unchanged, and all 48 expansion races completed and won.

## Behavior and test changes

No existing assertion changed. The HUD still shows the same cooldown seconds,
weapon levels, armor hits, and shield time. The new browser scenario measures
real page mutations and checks the click-then-Space path.

## Review fix

Independent review found the arrow glyphs lacked reliable spoken D-pad names.
The buttons now expose Up, Right, Down and Left with their keyboard keys in
accessible labels. The browser scenario checks all four names.
