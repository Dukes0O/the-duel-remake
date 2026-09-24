# Combat atlas readiness before a Wasteland race

The combined armored-wreck RAF report showed a one-frame High spike of
413.8 ms and a Performance spike of 88.9 ms. A private diagnostic rerun
captured a 303.3 ms High spike while `combatEffectsStatus` changed from
`fallback` before the wreck to `ready` after it. The atlas prewarm took
264.1 ms on that frame; renderer update reached 265.7 ms while simulation
stayed under 5.6 ms. Four 1024 px sheets total about 8 MB of compressed PNG.

The renderer now holds visual readiness for a newly entered armored race
until the atlas files finish loading and their textures and pooled meshes
have been prepared. The existing loading gate pauses simulation time. If a
sheet fails, the loader reaches its ready state and the procedural fallback
still permits the race. Later combat races reuse the prepared pool.

The focused private `combat-armor-frame-pacing` scenario now checks that the
atlas is ready before it triggers the first wreck. It passed with memory-only
saves, two screenshots and no browser issues. Ordinary High p95 was 18.1 ms;
the first armored wreck p95 was 18.2 ms, max 89.8 ms. Performance p95 was
18.1/18.3 ms with a 70.6 ms wreck max. One frame above 33 ms remained on
High and two on Performance. Those residual first-wreck spikes need a
separate renderer/GPU investigation; this change addresses the measured
late atlas preparation spike only.
