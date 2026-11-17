# DIG-YARD-TOY slice 2

- Shared controls, machine choice, clear views, yard order and honest digging and tipping messages are in; the switch stays `dev`.
- Truck-side cause: the cut converges on a grid point and moves almost no soil.
- Dig underlays clear edited ground; local floor normals and neighbouring chunk edges refresh. Scablands also refreshes edited neighbours at shared edges.
- Repeated machine messages are emitted again. Rays cover changed-cell centres, corners and a chunk border; natural near-ground comparison is restored.
- On 298f07618: Dig, ground view and Mabel passed; changed-file tier 241/247 passed. Five FFmpeg failures passed outside the sandbox; full-check hit the known PowerShell restriction.
- Build passed on 298f07618. Earlier Scablands timing was 439 ms under load and 450 ms alone; it passed alone now at 293 ms (limit 400 ms).
- Claude: run the Dig browser scenario, play and sound review, frame check and the full-check copy test. Seven long suites await night.
- Changed assertions: Dig-only machine names omit roller and paver; town retains both. The 0.02 m natural-ground check is restored outside edited chunks.
- No new game event sound cue. Nothing is saved.
- Removed: duplicated availability and control text, the unused machine name list, full-floor normal refresh and stale shared edges. MACHINE-ROADS removes the temporary restriction.
