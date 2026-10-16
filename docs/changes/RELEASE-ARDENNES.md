# Ardennes release fixture correction

The first exact ac8fd6c3 full release run passed 452 of 453 suites. The sole failure was a setup error in the vegetation grounding suite. Ardennes is now in the default catalogue. Its beech renderer correctly requires its prepared original track-kit owner. The generic legacy fixture omitted that owner and threw before checking an Ardennes root. Production and the course-owned binding suite already supply it.

The fixture now prepares the real unchanged High/LOD beech GLBs through the existing owner before installing its original no-ground-resampling guard. All existing expansion and legacy pine assertions and tolerances remain. Added checks prove every beech has one binding, every tree is conserved, physical X/Z is exact and each beech root meets actual drawn terrain triangles within the existing 1 mm tolerance. Headless image decoding uses the existing texture stub from test-track-kits; real geometry and owner transformations are used.

No game, model, art, ground, collider, RNG, signature or replay change. Independent review CLEAR on 89a4a26c. Its canonical lane passed 17/17 suites, jobs4, zero failures/unrun, 197996.1219 ms; production build passed in 1504.0365 ms. The corrected grounding suite passed 72584 checks and 3709 rendered roots (806 far-only), 55268.1817 ms. A new final candidate still needs its own exact full pass. The original 452/453 result remains failed. Kyle's frame skip remains explicit.

## Removed

Replaced the incomplete owner-less legacy fixture call for bound beeches. No runtime path or old assertion was removed.
