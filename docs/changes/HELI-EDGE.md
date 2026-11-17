# HELI-EDGE: the edge holds the helicopter, the cruise starts by itself, HEAD FOR

Kyle, 16 November 2026: Summit Run could not be reached; the helicopter "goes
off the map and stops"; he wants the heading to where he is flying. Design on
the card.

**Changed.** `heli-session.js`: the flying area's edge always clamps the
helicopter (it used to only without a destination); with a destination
elsewhere the cruise is offered there and starts by itself after
`HELI_SESSION.cruiseWait` (3 s); a refused leg stops the countdown and keeps
its fuel need; the view carries `cruiseIn`, `cruiseShort`, `heldAtEdge` and
`toward` (heading and distance to the place chosen, or here to the landing or
ski pad; null in the Lab's headings challenge). `heli-ui.js`: the HEAD FOR
gauge beside HEADING and the edge bar's words.

**Played by hand** in a visible Chrome on a private port with a memory-only
save: Summit Run chosen on FLY TO, HEAD FOR 320 and 15.6 km beside HEADING,
stick forward into the edge, the cruise started by itself, arrival at Summit.

**Tests.** `test-heli-mode` new edge checks (278 checks), `test-heli-view`
gauge and words (366).

**Changed assertions (Claude's review).** Five pinned fingerprints:
`test-heli-autopilot-rescue` OFF_PIN, `test-heli-rescue-session`
FIRE_SESSION_FINGERPRINT, `test-heli-skin-session` BEFORE (six),
`test-heli-summit-rescues` OFF_PIN hash the session's view, which now has four
more fields; with those fields left out each old pin comes back exactly.
`test-heli-summit-tune` AUTOPILOT_PIN samples each autopilot leg up to the
cruise offer; the last sample of each of three legs now stands on the edge
(under 0.1 m from before, that axis's speed 0), and the other 163 of 166
samples are identical (compared line by line against the old code). Nothing
is loosened: each is a re-recorded value with its reason beside it.

**After review** (one independent review, nothing blocking): no countdown
while a Lab challenge other than the altitude flight is on (ENTER as before;
lessons already clear the destination); HEAD FOR is hidden beside a fire,
rescue or recovery goal, which have their own line; at the edge in the Lab's
headings challenge no bar; the bar names the pilot's map only when it is on;
the countdown and fuel figures update in place so the panel's buttons are not
rebuilt under the mouse (`LIVE_WORDS` replaces `PUMP_LABEL`); a leg with no
fuel figure says there is no leg. Measured: Summit Run's flat ceiling (314 m)
is below its highest ground (817 m) only with the rescue switch off, which the
game never has; with it on the ceiling stands 300 m over the ground.

**Removed.** Flying on past the edge with a destination chosen; `PUMP_LABEL`.
