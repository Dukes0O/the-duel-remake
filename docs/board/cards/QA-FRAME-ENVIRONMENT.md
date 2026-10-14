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
