# QA-FRAME-ENVIRONMENT

The short board entry controls current state, ownership, dependencies and locks.

Claude, 13 October 20:55 PT: the headed frame check on Harbour at night gave
High/Performance p95 33.4/33.3 ms and construction 5 to 6 s on both the live
build bb8d3a99 and release d34bf40f (graphics card idle, nothing else running,
High performance power plan). Panorama's release on 12 October measured
18.3/18.2 ms and 0.4 s. The 14 October full check measured the same failure.

Find whether the harness now counts asset loading in construction, and why
p95 sits at exactly two 60 Hz frames (a capped refresh rate or a power
setting after the restart are worth a look), within rule 4's 30 minutes;
record the finding here. No change to limits.

## Claude findings, 14 October 08:50 PT (no measurement yet)

- The harness and the frame scenario have not changed in any way that counts
  since the Panorama release (36d7613f); only setup before the timer moved.
- The headed Harbour scenario (f70a7d2d, 12 October 13:54) has never passed.
  Its first run was the 13 October full check.
- The same full checks ran headless eight-car frame scenarios on this laptop
  (Grand Prix, Tremblant Snow, Tremblant Views): p95 18.1 to 18.5 ms on the
  NVIDIA adapter. The game itself is not slower.
- Display: two 4K monitors on the NVIDIA adapter at 60 Hz (primary scaled to
  2560x1440) and the built-in panel at 165 Hz on the Intel adapter. The headed
  run's p50 is 18 ms with about 6% of frames taking two refreshes, which gives
  the 33 ms p95. Most likely cause: the headed window on this display layout.
- Construction: the headed scenario counts from race start until every file
  has loaded, in a fresh browser profile. The 0.4 s at the Panorama release was
  the world build after loading. These are different measurements; the cold
  file wait is 3 to 4 s at every release since 12 October.

Next: one headed run in a quiet window with a single monitor active (Kyle
switches the display), then the construction definition goes to Kyle.
