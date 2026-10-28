# DEEP-RAMP-2

Task: DEEP-RAMP-2. Kind: ramp repair. Switch: `the-deep`.

## Design settled before code

Keep the ramp in its coastal cove on each route. A and C keep their entry distances; B moves 48 m along the same cove because its old road-normal footprint ends on a headland. Replace the diagonal terrain-following sheet with a 12 m concrete ramp normal to the road (the coastal fall line). Keep the 120 m driving length and 8 m end depth required by the dive provider. A straight, level cross-section connects the road edge to that depth; grade a 3 m apron beside each edge and blend back over another 5 m. Fit both near and far rendered terrain at the cutting boundaries so coarse triangles cannot bridge the deck. A 6 m bottom apron stays level with the foot of the ramp. Keep ordinary course generation and RNG unchanged. Clear the cutting after the original scenery placement and random sequence, so distant scenery keeps its original appearance.

On the ramp use signed, capped 18 mph motion, cancel slip, ease the heading onto its axis and allow bounded steering across the deck. Normal brake/reverse controls work uphill. A higher ramp-axis chase view blends at the road and under water. Add low kerbs, worn grooves, two posts and a double-sided faded BOAT RAMP sign. Preserve the shoreline choice and kit checks. No new sound event: existing surface and dive cues remain.

## Checks

`tools/test-deep-ramp.mjs`: all routes, deck/cutting coverage, angled descent, reverse, camera and unchanged outside terrain. Existing deep-zone tests cover choice, kit and return. Browser: deep-sirena, deep-life, grand-prix-existing (includes Pacific Canyon); a ramp picture recipe captures the turn-off and descent. Lane tier (jobs 4), world signature guard and build. One independent code review.

## Results

- `node tools/test-deep-ramp.mjs`: 10/10 pass on final source, plus the retained original interior-headland case passes as an added focused check (11 cases covered). The rock fixture uses the current A cutting and explicitly checks that the old B rock and its collider remain outside the moved cutting.
- `node tools/test-deep-kelp-coast.mjs`: 8/8 pass after the offshore handoff fix, including unchanged land clearance on every trail edge and an actual whole-loop drive/return on A/B/C.
- `node tools/test-deep-look.mjs`: 5,287 checks pass with the exact hook allow-list.
- `node tools/test-deep-life.mjs`: 23/23 pass on the corrected valid layout, 3.556 ms/update against unchanged 4 ms ceiling. Initial invalid-layout run measured 5.244 ms alongside the browser batch and 4.421 ms alone; no timing tolerance or sea-life rule was changed.
- `node tools/run-browser-scenarios.mjs --scenarios deep-sirena,deep-life --jobs 1`: 2/2 pass on final source, zero warnings/errors, memory-only storage.
- `grand-prix-existing`: all nine native grids/first corners in High and Performance pass (36 captures), including Pacific Canyon. Final changes after that pass affect only installed-ramp hooks and guarded Deep test adapters; ordinary race geometry/rules are unchanged.
- Final `deep-ramp-2` browser recipe: 4 accepted views, shoreline choice and BOAT RAMP guidance asserted, zero warnings/errors.
- `npm run build`: pass on final source, 531 modules, 3.72 s. Existing dynamic-import/chunk-size advisories remain.
- Lane (`--tier lane --changed --jobs 4`): all 199 selected suites covered after targeted repairs and a resumed run. The initial run passed 73 suites; its three failed suites passed after the fixes above. The remaining 123 suites produced 120 passes and three failures, each then repaired or rerun successfully: ramp fixtures (10/10 plus the retained headland case), story fixtures (9/9), and unchanged drive-through checks (7/7). No suites remain unrun. Passing checks were retained rather than repeated.
- The drive-through suite initially used Git's GNU tar, which interpreted a Windows drive path as a remote host. Its unchanged rerun passed with Windows native tar first on the process-local PATH. No tool or assertion change was needed.
- Final lane guards: replay checks pass (225 checks, 25 cases, 23 events, nine categories), world composition passes (47 checks), and Deep zone passes (11/11). No replay fingerprints or ordinary world fixtures changed.
- Picture sheet: `docs/board/looks/deep-ramp-2/round-1.jpg`, 281,763 bytes; verdict and reproduction settings beside it. The source captures use private memory-only QA; Kyle's originals are neither included nor committed.
- Independent code review: all reported faults corrected and focused regressions pass. Final independent review CLEAR: game code, all reported fixes, changed assertions, picture sheet and signature explanation accepted.

## Changed assertions

- Width changes from 6 m to 12 m; sweep/cove half-width changes from 3 m to 6 m. Kyle requested the wider deck; these now check its whole width.
- Natural centerline height and natural shoreline-offset equality become graded centerline/shoreline equality and a road-normal fall-line heading. The requested cutting intentionally replaces the natural hillside.
- Road-clearance sampling starts after the first 8 m, where the widened deck leaves the road-edge turn-off. Main-road geometry itself stays unchanged.
- The original independent interior-headland rejection test is retained for the widened cove, including its otherwise-clear corners and offshore disk. A separate new test checks the bottom apron height profile. The original six-metre candidate guard still runs, followed by the full new twelve-metre naturally submerged cove guard. Dense full-width physical and actual rendered-triangle tests now prove that ground cannot poke through the deck.
- Original obstacle checks exclude generated trees/loose rocks cleared by the cutting and rail sections removed for the turn-off. Injected solid blockers and sea-stack bounds still reject candidates. Generated feature arrays, measured bounds and Course RNG are unchanged; runtime contact queries and view omission share the cutting predicates.
- Added actual Duel angled-entry/held-steering/reverse checks on A/B/C; final entry distances 2184/2192/2192 (B was 2144); read-only camera blending; full-width near/far triangle coverage; road strip survival; original-coordinate rock removal; stale Dusthawk/Titan attitude replacement; outside-cut terrain plane equality.
- Story title fixtures now park inside the entry segment rather than exactly on its boundary vertex, where the new world frame could round just before the boundary. All title, wrapped-range, repeat, saved-revisit and pause assertions remain unchanged; 9/9 pass. Independent review confirms that the fixture correction preserves the test's intent.

The independent code reviewer found these assertion changes necessary for Kyle's design, with no weakening. Claude's written assertion review remains an integration prerequisite under AGENTS rule 18; this lane does not merge.

## Removed

The old diagonal grey sheet and terrain-induced sideways driving are replaced. Old provider selection retains the coastal cove and availability rules, with the full new footprint checked before acceptance. No duplicate runtime ramp or new switch remains. The existing dive choice, kit admission, story, saves, underwater driving and cues remain on their existing paths. The locked dive eases its heading into the preserved offshore direction, and the Drop-off curtain uses that offshore heading.

## Branch scope

Built from `0fb9f499` on `codex/deep-ramp-2`. The parallel DEEP-PLAYTEST-1 map/jump work is not part of this lane. Shared hooks are small DEEP-RAMP-2 blocks. No integration merge, live edit, push or player-save access.

## Offshore handoff and guard corrections

The first lane run exposed that a road-normal deck must not rotate the established offshore loop into land. The ramp now carries a separate `diveHeading`. One provider anchor line keeps the offshore direction; the locked dive eases into it before underwater driving starts, and the Drop-off curtain reads the same direction. The full original land-clearance assertion passes on A/B/C. Its fixture now uses the actual installed course, including the bounded cutting, rather than providerless natural terrain; outside the cutting the original ground remains unchanged. Route B's opening is 2192 m rather than 2144 m, 48 m along the same coastal cove, to give the full twelve-metre foot naturally clear water. No land-clearance bound was changed.

`test-deep-look` gains exact allow-list entries for the named ramp terrain, camera and acceptance hooks, plus the already released results-screen hint import missing from that list. No wildcard or general access exemption was added. These are assertion changes for the Director's written review alongside the width/profile changes.

## Reviewed world-signature difference

Used the exact `sceneSignature` routine and canvas stub from `tools/test-world-composition.mjs`, comparing the base `0fb9f499` with the final source, with the real Deep provider and kit installed. These are installed-ramp signatures, not replacements for the plain-race fixture. The ordinary Pacific Canyon fixture remains unchanged.

| Route / seed | Before SHA-256 | After SHA-256 | Instances before / after |
| --- | --- | --- | --- |
| A / 1989 | `98c26f8e9f7955957db416a9a5c5baf2903f3f2b9c9242e3da033dde7fac42a2` | `d42f756ad83672399484318c712845881833d26a9cd0fdbb01b68ff8d372316c` | 11981 / 11930 |
| B / 42 | `310ce58687e370d3b3712cc2ac55c2011141fa3bc22e93c92eeb02a69ff19f5d` | `803b1ce74212b913970fa6b1514243acbcc8baba261b4fc600d9234b3d274db5` | 12012 / 11964 |
| C / 17 | `cdd8a2ab42f3b78f5ec820341e8fdb0938494b93a900a22aae58811c7a5cb8d5` | `1c4d762a0bb30452e6d41a670ab878c8baecc612f49a842bc5a78a632b00ceda` | 11953 / 11903 |

Each installed scene adds exactly eight nodes, seven meshes, seven geometries, two materials and one sign texture. These are the two kerbs, two posts and double-sided sign with its stem; the deck mesh is replaced in place. Instance reductions are grass, loose rocks and trees intersecting the earthworks, plus the guardrail opening. The near/far terrain is clipped and graded only in the cutting and bottom apron, with original source-plane equality checked outside it. Original scenery placement/random draws occur before local omission, so surviving distant instances keep their original forms and colours. The replaced diagonal sheet is removed rather than retained. The sheet shows the intended cut, widened deck, kerbs and turn-off with no hillside crossing the concrete. No world fixture or replay fingerprint was re-recorded.

## Session close

Cockpit task T-045 created in The Duel / Underwater, notes name Board cards DEEP-RAMP-2 and Lane SIM. The protected board sync set its status; Cockpit rebuilt successfully. Its existing calendar and inbox feeds report 48-hour staleness; this game task did not refresh those feeds. Session status snapshot and owned scratch cleanup are included before commit. No merge or push.

Final documentation checks: board 196 checks pass; repository placement passes; `git diff --check` passes. Own raw captures, temporary source copy, scripts, build output and gate logs were sent to the Recycle Bin after their verdicts were recorded. Kyle's four source screenshots remain intact. The full tier is stale for the base commit; this lane does not claim release clearance.
