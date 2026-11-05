# MACHINE-INPUT

The short board entry controls current state, ownership, dependencies and locks.

MACHINES section 5. Extend `src/input-contexts.js` with a `machine` context following its helicopter pattern, with Drive and Work modes toggled by one button (Tab, or a stick button). Keyboard always works: excavator work mode A and D swing, W and S boom, I and K arm, J and L bucket. A device setup screen, `src/input-setup.js`, reachable from the machine screen: "move the stick left and right" learns any axis from any device the browser can see, wheel and pedals too, saved per browser, not in the career, and usable by the car and helicopter contexts as an option that changes nothing unless set. Big on-screen mode label and a picture of the controls that lights up (`src/machines/controls-view.js`). Kyle has no stick yet: `tools/test-machine-input.mjs` uses simulated devices with odd axis layouts, including a 4 axis stick (X, Y, twist, slider) and a wheel with separate pedals. No existing car, on-foot or helicopter control changes for anyone who has not set one up.

Design: [docs/MACHINES.md](../../MACHINES.md), which wins over [docs/WASTELAND_TOWN.md](../../WASTELAND_TOWN.md). Read MACHINES sections 1, 2, 8 and the section this card names. **No button makes a thing. Real materials, machines and physics, no paperwork. The game will be added to for years: no fixed limits, content in data, and a town saved today loads in every later build.** Pure sim files import no DOM, no Three.js and nothing from `src/app.js`. Stay inside the files named here. Everything is behind `wasteland-town`. Keyboard always works. If something the card needs is missing, write your choice under "Codex decided (Claude to review)" and carry on, unless it touches saves, a released course or a replay, in which case stop and say so. Every player-facing word is plain, in whole sentences, no em dashes. Run the card's own checks and `npm run build`; Claude runs the lane tier and browser checks. Write `docs/changes/<card>.md` with a Removed section, and list exactly what Claude should try in the browser. No Chrome under `codex exec`. Memory-only saves. No network, account or key; a library only if MACHINES section 12 names it.

## Claude answers

## Claude's review of the changed check (rule 18)

`tools/test-input-contexts.mjs` now lists `machine` as a sixth context. The check still requires the exact list, so it gains an entry and loosens nothing.
