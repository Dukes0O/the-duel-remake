# HELI-RETURN-LOADS

Design: implement HELICOPTER 13.2. Seed the weight and destination from the
play day and departure place. Choose home or an onward pad whose leg fits
the tank and whose 60% car pay exceeds fuel at the home pump's 1.5-credit
price. This keeps the settled pay and fuel
prices. Crates wait beside the away pad; hooking one aims at its destination.
A clean release in that destination's landing circle pays once. Use the
lesson crate model, cable rules and existing job radio cues.
The Table offers outbound loads once discovered, but is not a drop-off:
discovering it in flight cannot redraw an advertised job or change its pay.

Save: optional `heli.returnLoads` maps departure places to their completed
play day. Absence means none done. Normalize it without changing the save
version or dropping unknown top-level keys. The card's explicit normalizeHeli
requirement entails the small heli-save.js hook and old-save fixture.

Checks: seeded routes/weights and pay versus fuel; memory-only save round
trip and old-save fixture; scripted hooked-crate flight and payment. Picture:
Tremblant Snow arrival board. Lane tier (jobs 4), then production build.
No frame timing.

## Changed assertions

None. New behavior gets new assertions; existing assertions stay intact.

## Review and results

- Targeted: heli-jobs 4,104 checks (includes actual Snow-to-home and
  Snow-to-Panorama hooked flights, payment, the onward pad's next crate,
  30-day route/weight/fuel checks and Table-discovery stability);
  heli-save 44 groups; heli-view 270 checks. All pass.
- Independent save review APPROVED after correcting the missing onward
  crate and the changing Table-discovery payment. Review verified 23 old
  fixtures plus one forged fixture (1,029 checks), corrupt input handling,
  combat/fines/quit/reload wallet safety and existing migration backups.
  Storage budget passed at 3.61/4 MB; flags add at most 1,154 UTF-16 bytes
  per player across today's valid places. No real saves accessed.
- Required lane tier, jobs 4: stopped after 21 passed, 1 failed, 57 not run
  (199.14 s). `test-heli-autopilot-rescue` pins a pre-feature away-flight
  view: expected 3531442031, actual 2230200939. The new crate and board
  deliberately change that snapshot. No assertion or pin was edited.
  This run preceded the final Table-stability fix; final targeted tests
  cover that fix. No final green lane is claimed.
- Production build PASS (1.51 s) after final runtime corrections. Used
  PowerShell, System32 first on PATH, `npm.cmd run build`: PowerShell
  blocks the npm.ps1 shim. Vite needed access to its shared dependency
  cache, granted through the tool's sandbox escalation.
- Native headless browser PASS, memory-only storage, private port 50261:
  Snow board names both ends, 476 kg, 180 credits and the lodge sender;
  the actual lesson crate is beside the pad. One picture inspected:
  `.evidence/2026-10-26/HELI-RETURN-LOADS/tremblant-snow-return-board.png`.
  Text is readable without covering the helicopter or crate. No browser
  errors or warnings. No frame timing. Picture retained for handoff.
- Heavy admission counted before every gate/build/browser launch; each
  started below three, with no current hold. One-minute lane count was two.
- Session-end status generated and Cockpit sync completed. The sync reports
  three unrelated cards without task links: GP-CAREER-LIVE,
  SUMMIT-FINISH-AREA, SUMMIT-GROUND-GAPS; left to the Director.

## Open before integration

- Snapshot test is outside the card's owned files. Asked Kyle to extend
  the hook for independently reviewed pin updates; awaiting the answer.
  Existing gameplay assertions and race/world fingerprints remain untouched.
- The unconditional fuel claim conflicts with the premium pumps' fixed
  prices. Pacific-to-Red-Mesa pays 270 and uses 135 kg: 202.5 credits at
  home, but 270 at Pacific's 2-credit pump. No non-Table Pacific leg is
  strictly profitable at that pump. The implementation proves profitability
  for home-bought fuel only. Asked Kyle whether to use that reading or have
  Claude revise the rule; awaiting the answer. This is not a green claim
  against premium fuel prices. No pay or fuel number was changed.

## Removed

Nothing replaced. Recycled this run's generated production build, QA bundle,
scratch capture scripts and browser report. Kept the requested picture for
handoff; integration can recycle it after accepting the visual verdict.
