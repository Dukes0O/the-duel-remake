# Ardennes release fixture correction

The first exact ac8fd6c3 full release run passed 452 of 453 suites. The sole failure was a setup error in the vegetation grounding suite. Ardennes is now in the default catalogue. Its beech renderer correctly requires its prepared original track-kit owner. The generic legacy fixture omitted that owner and threw before checking an Ardennes root. Production and the course-owned binding suite already supply it.

The fixture now prepares the real unchanged High/LOD beech GLBs through the existing owner before installing its original no-ground-resampling guard. All existing expansion and legacy pine assertions and tolerances remain. Added checks prove every beech has one binding, every tree is conserved, physical X/Z is exact and each beech root meets actual drawn terrain triangles within the existing 1 mm tolerance. Headless image decoding uses the existing texture stub from test-track-kits; real geometry and owner transformations are used.

No game, model, art, ground, collider, RNG, signature or replay change. Independent review and corrected-suite/lane/build checks are pending. A new final candidate still needs its own exact full pass. The original 452/453 result remains failed. Kyle's frame skip remains explicit.

## Removed

Replaced the incomplete owner-less legacy fixture call for bound beeches. No runtime path or old assertion was removed.
