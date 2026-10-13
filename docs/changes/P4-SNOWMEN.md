# P4-SNOWMEN

Snowmen stays dev. Twelve authored Summit runoff placements and the eight existing Tremblant Snow spots use the approved body, hat and carrot. Moving player and CPU contacts break each placement once with no speed, armor, crash or drift penalty. Only player hits count. Stage reload resets hits and bursts.

Completed valid ordinary races gain 25 CR per hit, capped at ten, outside Pro doubling and distance pay. Grand Prix forwards the count to its unchanged helper. Off results omit the capability and count. Qualifying, restart, quit and incomplete races earn no snowman bonus. No save field is added.

The renderer reads hit poses and race time, removes broken instances and moves real model parts. The existing burst cue is admitted independently of Grand Prix only while snowmen is enabled.

Changed assertions: feature catalogues gain one dev entry; all old states and assertions remain. New acceptance belongs to the card-owned Node suite.

Placement correction (Director 68609ba8): inherited spot 5 at (260,25) overlapped forest-1412; only lateral becomes 28, with ground y9.063221919 and clear same-s road approach. Spot 7 at (305,25) overlapped forest-1419 and had no tested approach; only s becomes 310, ground y7.496745541, clear from road s260. Director 740b00a4 adds the seed-6 correction: spot 3 (200,25) overlaps forest-1375 at (23.5310173,202.1653518), half extents .3352588, heading 3.6282264. Only its lateral becomes 20, ground y11.035438639. Seeds 1989,1000,6 all have clear same-s road approaches under the unchanged 1.02 by 2.35 m F42 shell. Correction to the first diagnosis: the forest stream is fixed, but earlier race-seeded obstacles can change which trees survive. Stable indices, the other five rows, trees, walls and the shell remain exact. The original clearance/reachability assertion stays.

Checks: first placement acceptance failed (missing Summit metadata). Controlled source acceptance also found the two actual inherited tree collisions; their granted fixes do not move scenery. Final controlled acceptance passes 277 checks in 5.274 s, including all twenty clear/reachable placements on seeds 1989,1000,6, actual native static contacts, qualifying reload, actual successful result producers, fixed capped/duplicate-safe pay, real High/LOD model parts, read-only burst expiry and narrow audio admission/reset. These are controlled Node fixtures, not a driven race or an art verdict. Original nearby lane and build pending. Native audio, art, browser and frame checks remain deferred.

## Removed

None. Existing tree/sign behavior, authored scenery, model and sound assets stay unchanged.
