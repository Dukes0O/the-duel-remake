# FINISH-DEEP

Evidence for Claude; not a release verdict. `the-deep` is already on.
No frame timing, live-game access, real saves or voice recording.

## Method and limits

`tools/scenarios/finish-deep.mjs` uses the existing private headless browser,
memory-only named players and production App keyboard handling. The car starts
at the ramp entrance with a dive kit. A route script knows trail and find
coordinates: this proves guided reachability, not an unguided player's success.
Driving times are simulation seconds at 120 Hz. The initial kit and the Lab's
passed Rust prerequisite are fixtures. Finds, log entries, pearls, restoration
purchase and race completion must come from normal game rules. Audio is muted;
event timing and captions are evidence, not an audible mix verdict.

Design settled before the recipe: exercise Casual and Pro separately, use no
underwater teleports or injected completion, keep failed attempts visible in
the verdict, and leave subjective findability, pacing and sound to Claude.
The recipe is a card-specific script in the existing harness, not a new harness.

## Goals and pacing

Times below are cumulative from starting the keyboard descent at the ramp.
Both initial dives reached exactly the same times to the shown precision.
The route is guided; the findability column judges the available clue, not a
blind player's success. Ana's times describe emitted story events. Accelerated
driving does not accelerate her voice or captions: the pictures show older
lines still playing, so they cannot establish spoken-line pacing.

| Goal | Casual / Pro | Findable without a guide? Available clue and remaining doubt | Ana event |
| --- | --- | --- | --- |
| First dive | 0:13 / 0:13 | Ramp entrance and kit were fixtures; garage hint discovery not tested here. | Hello and legend at 12.55 s. |
| Badge | 0:21 / 0:21 | Strong clue: ramp glint and checklist explicitly say stop beside it. | Badge at 19.25 s, after collection. |
| Kelp crab | 0:28 / 0:28 | Moving animals and slow-close instruction; guided approach, not a blind verdict. | Log at 27.00 s. |
| Pearl 1 | 0:36 / 0:36 | **Fault fixed:** no pre-collection pearl marker existed. Added the existing brief glint effect. | Pearl at 34.50 s. |
| Green turtle | 0:42 / 0:42 | Visible animal and logging ring; stop inside 8 m. | Log at 40.45 s. |
| Bat ray | 0:55 / 0:55 | Visible moving ray; guided approach. | Log at 53.20 s. |
| Pearl 2 | 1:26 / 1:26 | New glint, collected under normal 3 m/slow/one-second rules. | Pearl at 84.55 s. |
| Steering wheel | 1:39 / 1:39 | Sonar works within 150 m. No heading clue until in range; the first part is far beyond the badge's sonar range. | First sonar at 90.75 s; bag instruction at 92.95 s; part at 96.00 s. |
| Sardines | 1:41 / 1:41 | School is visible; logged while approaching wheel. | Log at 92.45 s. |
| Front wheel | 2:02 / 2:02 | Sonar and F work; held bag completes without a key retrigger. | Part at 118.25 s. |
| Sea lion | 2:03 / 2:03 | Logged while approaching front wheel. | Log at 116.75 s. |
| Otter | 2:12 / 2:12 | Surface animal is easy to overlook from a floor-level car. Needs a human look. | Otter at 130.00 / 130.05 s. |
| Bonnet | 2:24 / 2:24 | Sonar clue works in range. | Part at 140.95 s. |
| Door | 2:57 / 2:57 | Sonar works along lip; stopping close enough is more demanding near rocks. | Part and five-piece deduction at 173.85 s, after fifth piece. |
| Pearl 3 | 3:18 / 3:18 | New glint at lip; fixed collection radius retained. | Pearl at 197.00 s. |
| Whale and log page | 3:20 / 3:20 | Fixed spot remains loggable after the moving whale passes. This can finish the page with no whale in view; Claude should judge that mismatch. | Log and page at 195.05 s. |
| Sirena raised | 3:59 / 3:59 | Five-piece gate, sonar, nearby-car cue and four bags all work. | Car at 223.25 s; raised and Lab at 226.35 s. |
| Restoration | 46 s real animation after purchase | Garage points to Lab. Rust pass was a fixture. Runtime asks 1,000 to run, plus optional 1,500 body restoration; design section 6.2 still compresses these into 2,500. | Brian's Lab sequence, outside Ana's story. |
| Coast Cup | Casual: 4:40 race, finished | Any finish qualifies, including a loss: the real result shows a 300-credit loss alongside the Coast Cup title and its once-only progress. | Cup title captured; Casual's delayed thanks not observed before navigation. |

Pro follow-up passed: a slower keyboard **Pro Time Trial** finished the Coast
Cup in 451.35 s (7:31), using a fresh complete dive and the real restoration
purchase. Every underwater goal again matched the times above. Ana's exact
grandmother-thanks caption appeared after the title cleared. Private browser
result: passed, zero errors/warnings, memory-only port 35409. The original
27.05 s Pro Duel failure remains in the first report; it was not overwritten.

No underwater goal failed in either completed guided dive. Earlier recipe
attempts circled a stopping target and stalled the Lab display loop; those are
script faults, corrected without changing gameplay. One later run was stopped
because it became the fourth heavy job. Pro's first road attempt reached
`gameover` at 27.05 s. That is retained as a failed scripted attempt, not proof
that a player cannot complete Pro.

The longest interval between these nearby story goals was about 39 s, from the
whale/last pearl to the car, including its 12-second lift. The forest approach
has about 31 s between the ray and the next pearl. These are route timings,
not a subjective verdict about empty swimming. There is no underwater failure
penalty. The full chart was only 19% complete when all salvage, life and pearls
were done: completing 100% may become a separate sweep chore. It was not timed
or completed in this story run.

## Fixes and Claude's remaining checks

- Place titles: existing first-visit/save path retained; active Ana audio and
  captions now pause and resume through a title. Old saves without `places`
  gain an empty view list without a stored migration. See DEEP-PLACES.
- Added missing pearl glints and matching checklist wording. Collection,
  rewards and chart pins remain rule-owned. A focused scene test proves the
  marker never collects and disappears after the rule records collection.
- Corrected the manta's “only plankton” claim, below.
- Claude: blind findability and real-time audible Ana timing, especially the
  out-of-range forest approach and surface otter; survey-spot/visible-whale
  mismatch; map/list screen coverage at 1280×720; chart-completion workload.
- U surfaces immediately and skips the Norseman aside. Driving up the ramp
  triggers it in the existing story test; this run used U after salvage.
- The raised car begins 3 m below the local floor and needs several seconds
  of rising before its body is visible. The postcard waits 4.5 real seconds
  and uses an inspection camera; no car state is moved for that picture.
- Claude owns the frame check, audible mix and finishing/go-live verdict.

## Checks and postcard

Postcard: `docs/board/looks/deep-finish/round-1.jpg` (207,107 bytes), made from
the actual Casual keyboard run: kelp, turtle, four-bag rise and Coast Cup.
It is evidence, not a new art round. Raw captures are in
`.evidence/2026-10-26/FINISH-DEEP/`.

Code/save review approved by the independent save guardian, including delayed
decode and exact audio resume offset. All 109 save checks passed: 23 historical
fixtures, one forged fixture, 1,029 preservation checks; damaged data, backup,
credit safety and the 3.61 MB/4 MB storage model passed.

Lane tier, jobs 4: first attempt 14 passed, 1 failed, 17 not run. After final
audio fixes, 14 passed, 1 failed, 21 not run (arena suite itself passed 133/133).
The 18 still-unrun suites passed separately, 0 failures and 0 not run; the
remaining Deep save/log/story suites passed targeted. Replay guard: 225 checks
across 25 cases, 23 events, nine categories, three FPS values and three runs;
fingerprints unchanged. No signatures regenerated.

Production `npm run build` passed (541 modules, 1.25 s); existing large-chunk
and mixed static/dynamic import warnings remain. Pacific Canyon drive-through
passed with zero issues: native easy/medium/hard laps at 56.475 / 56.592 /
56.458 s. It checks the coast course, not a separate underwater barrier sweep.
The Deep's guided drives and existing explorer rock-contact checks cover the
underwater routes used here.

**Gate is not green:** unchanged `test-deep-life` Node update-time assertion
requires under 4 ms; measured 5.977 then 5.446 ms while other heavy work ran.
No tolerance or assertion was changed. No third timing rerun or optimization.
This is not a delivered-frame measurement; no frame check was performed.

Session end: board checks passed (167); placement passed after renaming the
postcard to the required `round-1.jpg` pattern (the initial `postcard.jpg` name
failed placement). STATUS refreshed. Required protected Cockpit board sync ran,
zero tasks changed. No board card was closed: Claude owns FINISH-DEEP.

Changed assertions: none. New tests cover interrupted captions, delayed audio
decode on either side of a title, exact resume offset, legacy missing places,
and pre-collection pearl markers. The manta fact still matches the design
table word for word under the existing unchanged assertion.

## Facts checked

The runtime text in `deep-phone-lines.js` and `deep-log.js` was checked on
26 October. The Sirena, Rosa and Ana are fiction. No new recording was made.

| Claim | Finding and source |
| --- | --- |
| Ana: sound at 1,500 m/s | Good approximation; temperature and pressure vary it. [NOAA](https://oceanservice.noaa.gov/facts/sound.html). |
| Ana: one litre lifts about one kilo | Buoyancy estimate is sound for one litre displaced **at depth**, not one surface litre compressed below. Seawater is about 1.025 kg/litre; bag/tank weights matter. Four 200-litre bags for a fictional 700 kg submerged car is plausible, not a salvage calculation. |
| Ana: Chrysler lost in 1956 | Contemporary Chrysler press release confirms the Norseman on Andrea Doria. [Chrysler release reproduced by automotive archive](https://www.carsandracingstuff.com/library/articles/10720.php). “Still there today” is not freshly verified. |
| Ana/log: no otters means no kelp | **Too absolute.** Otters help prevent urchin grazing; kelp also depends on other predators and environmental conditions. Suggest “Otters help keep urchins from eating the forest.” Keep the recorded line pending Claude's choice; voice credits are on hold. [Aquarium research](https://www.montereybayaquarium.org/change-impact/our-conservation-work/kelp-forest-resilience-and-recovery). |
| Ana: rare abalone pearls | Supported, including blue and green colours. [GIA](https://www.gia.edu/gems-gemology/fall-2015-labnotes-large-natural-pearls-haliotis-abalone-species). |
| Sardines: schooling and predator confusion | Supported. [Aquarium](https://montereybayaquarium.tumblr.com/post/122880091133/we-just-added-15000-new-sardines-to-our-open-sea). |
| Green turtles: name and California | Name from fat and Southern California residence supported; **diet as the certain cause of green fat is doubtful**. NOAA says it was originally attributed to diet and other sea turtles also have greenish fat. Suggest omit the cause. [NOAA species](https://www.fisheries.noaa.gov/species/green-turtle), [California research](https://www.fisheries.noaa.gov/west-coast/science-data/green-turtle-research-and-conservation-southern-california). |
| Bat rays: fins expose clams | Supported. [Aquarium](https://www.montereybayaquarium.org/animals-the-ocean/animals-a-to-z/bat-ray). |
| Sea lions: flippers turn forward; seals cannot | Supported for true seals; “seals” is ambiguous because fur seals are eared seals. [NOAA](https://oceanservice.noaa.gov/facts/seal-sealion.html). |
| Kelp crab: sideways fastest because of leg bend | **Not established for this species** by the sources checked. Safer “Kelp crabs cling to kelp with their pointed legs.” Species-specific wording needs Claude's check. [Puget Sound museum](https://www.pugetsound.edu/puget-sound-museum-natural-history/exhibits/marine-panel/kelp-crab). |
| Gray whale: 16,000–20,000 km return migration | Reasonable typical range, not every animal's exact yearly trip. [NOAA](https://www.fisheries.noaa.gov/west-coast/science-data/gray-whales-eastern-north-pacific). Calling its sound “song” merits a species-specific sound review; not checked by listening here. |
| Reef fish: bright colours identify own kind | Plausible for some, **too general for all reef fish**; camouflage and signalling both occur. [Florida Museum](https://www.floridamuseum.ufl.edu/discover-fish/fish/adaptions/). |
| Mantas: 7 m, eat only tiny plankton | **Fixed** to “feed mostly on plankton” in the runtime card and design table. NOAA records small and moderately sized fish too. No voice line changes. [NOAA](https://www.fisheries.noaa.gov/species/giant-manta-ray/science). |
| Moray: second jaws pull prey down | Supported. [Aquarium](https://www.montereybayaquarium.org/animals-the-ocean/animals-a-to-z/california-moray). |
| Grouper: suction feeding | Supported. [NOAA](https://www.fisheries.noaa.gov/species/nassau-grouper/resources). |
| Sharks: cartilage skeleton | Supported; the sentence describes skeleton, not teeth. [NOAA](https://www.fisheries.noaa.gov/national/outreach-and-education/fun-facts-about-shocking-sharks). |
| Jellyfish: about 95% water, no brain/heart/bones | Supported as a broad educational description. [NOAA](https://oceanservice.noaa.gov/facts/jellyfish.html). |
| Octopus: three hearts, fast colour changes | Three hearts and colour change supported; **under one second was not independently established** in this check. [Seattle Aquarium](https://www.seattleaquarium.org/animal/giant-pacific-octopus/), [Shedd](https://www.sheddaquarium.org/animals/octopus). |

The doubtful science wording is left for Claude because it is authored story
text and some corrections must match existing recorded lines. No facts were
silently relabelled “verified.”

## Removed

Removed the false “only tiny plankton” claim and the checklist's invisible
abalone search cue. Build/QA output is recycled after checks. Raw pictures are
temporary review evidence; keep
only the compressed postcard and this verdict after Claude consumes them.
