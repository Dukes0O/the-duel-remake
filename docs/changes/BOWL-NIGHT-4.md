# BOWL-NIGHT-4

Night 4 is Barrel Roll Night. Best Trick plays all three timed goes against Big Kettle, or one solo scoring go in a Turn Show.
Round points use scored trick facts across the go. Whole-go score keeps jump and discovery points. The HUD shows the round, rival trick and tally.
Big Mo gives the loss reason and still reacts if a driver independently reaches the stands. The gates remain usable.
Best Trick saves under `best-trick`. The existing `home-run` record survives new records, settlements and reloads.

At `679ea18f1`: 83 lane suites and production build passed. Replay guards unchanged (297 race, 12 combat, 63 world).
Best Trick Easy 8/10; Medium repeat loses and three kinds win; Hard singles lose and a barrel roll plus a double wins. All three goes play.
Save and code review passed, including a memory-only two-driver round trip and a real stands landing and reset.
Changed assertions: replace Home Run's event-specific cases with Best Trick, preserving timing, reset, sound, Turn Show and record checks. Claude approved on the card.
Claude drives Easy, Medium and the secret exit and return on the merged batch.

**Removed** Home Run runner, angle, gate timeout, rings, crowd cutout, score filter, goal, captions and cues; retired its scoreboard route and the Over the Wall Night name and hint.
