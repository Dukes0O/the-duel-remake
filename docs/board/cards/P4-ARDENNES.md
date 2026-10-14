# P4-ARDENNES

The short board entry controls current state, ownership, dependencies and locks.
These are the card's detailed design, acceptance and recorded decisions.

Kyle, 13 October 2026, on a Spa-style forest circuit after loving Panorama
Ridge: "make that one a beauty!" Design: `docs/CIRCUITS.md` section 5.5.

## Split

- **Road layout (Claude, tonight).** A Claude helper writes
  `src/circuits/ardennes-forest.js` from the fitted script in section 5.5:
  widths, run-off, crests, kerbs, boards, pit lane and the `ardennes-forest`
  dev switch, registered the way Panorama's road was (P4-CIRCUIT-LAYOUTS).
  It uses existing forest scenery and puts no art in.
- **The rest (Codex, this card).** Codex builds it once the road merges:
  - the light path (morning mist clearing to sun);
  - the forest dressing (dense firs and beech close behind the fences, mist
    in the dips);
  - the catch fences and armco from the circuit kit;
  - every landmark in section 5.5;
  - the full eight-car field on the native .95 driver;
  - the pit lane;
  - its own field recipe (the Panorama recipe is the starting point).

  Use the existing kits, stand crowds, night glows and landmark metadata.
  New models only where no kit piece fits: the stone stream bridge, the
  footbridge and the timing tower. Send those through one art sheet to
  Claude, within the three-round cap.

## Acceptance

- Section 4 feel targets checked with the review tool. Lap time and corner
  speeds go in the change note: The Wall flat in a good car, Les Combes and
  Riverside the heavy stops.
- The full field races two laps cleanly.
- The drive-through passes, with no floating walls, the road covered and
  body-to-face contact within bounds.
- The simple frame check at both qualities on the busiest view (the grid at
  Pit Straight) passes.
- Lane tier, build, one review. Then Claude's finishing pass,
  P4-FINISH-ARDENNES, before Kyle's "go live".
- Price 2,000 credits. The course joins the end of the list after Summit Run,
  so saves, records and menu places stay put.

## Road merged (Claude, 13 October 21:40 PT)

P4-ARDENNES-ROAD merged at 85e47a3e: `src/circuits/ardennes-forest.js` (manifest: dev, 2,000 credits, release order 5, Grand Prix), reference lap 139.3 s, `tools/test-circuit-ardennes.mjs`. No safety kit yet: open run-off on both sides. Widths 15 / 16 on Kestrel / 15 from Les Combes / 13 through the Bus Stop.

The layout test's Medium driver laps in 2:29.2, just under its 150 s cap. Codex should not make the lap slower without first raising that cap for this circuit's length, with a reason. P4-ARDENNES can start now.

## Director source start, 13 October evening

Road prerequisite85e47a3e is merged and its Claude lane is cleared; integration was pulled before this card. Start only new p4-ardennes, branch codex/p4-ardennes, holding no busy-game-files. The exact merged road script, widths, closure, grades, pit location, stable id/generation stage, 2000-credit price, release order and dev/noCombat admission stay exact. Initial owns: src/circuits/ardennes-forest.js course-authored field/light/scenery/landmark/safety-kit metadata, its existing owned circuit test, existing course-specific scenario or field-recipe file if present, and docs/changes/P4-ARDENNES.md. Read section5.5 and actual current renderer/kit hooks first; request exact additional files before touching them. No placeholder or unauthorised shared terrain/physics/controller/save/audio/catalogue rewrite.

Build the native eight-car/two-lap field and all accepted landmark/forest/mist/light requirements using existing kits and helpers. Any needed three original stone-bridge/footbridge/timing-tower model recipe, runtime asset/manifest or new course-specific photo hook needs a precise Director grant first; it cannot silently edit shared source pins or Deep's pending catalogue. Write meaningful card-owned acceptance before implementation where behavior needs it. Do not run a gate, build, browser, render, balance or merge until Claude posts RELEASE DONE. Code preparation in this lane may continue. Later checks follow fresh all-team inventory, jobs4, one original nearby/build/review, bounded native field tuning, and Claude's art/finishing pass. Root owns shared metadata and cleanup of this newly created lane; preserve all others.

## Director exact Ardennes visual and landmark hooks

Grant src/light-path.js only forest-morning palette handling for existing golden/day endpoints and its palette admission, retaining every original palette/look/default/cache behavior. Author race-progress0 golden, .5 day,1 day in this course only. Grant src/circuit-effects.js only opt-in effects.valleyMist: existing mistTexture, finite bounded authored banks {s,lateral,along,across,count,height,opacity,colour,fadeEnd}, actual rendered-ground anchors, read-only native lap progress fading and disposal; and opt-in effects.stream {s,width,reach,colour}, one grounded red-brown ribbon visible either side of Red Water, omitting the whole road/shoulder interval. Preserve lake mist, all default effects, terrain, water reset, surface/grip and simulation state/seeds.

Grant src/track-kits.js only three appended IDs stone-stream-bridge, forest-footbridge, forest-timing-tower, and course-authored kitLook.leafColour on the actual leaf material-name patterns -leaves-/-leaf-cluster-. Use owned cloned materials; never mutate a donor or another course's owner. Retain the35 original IDs/order, bounds/collision/LOD/loading defaults and the accepted larger trackside faces. Grant tools/test-track-kits.mjs only additive38-ID admission preserving the35 originals and their existing assertions; validate all three actual new assets in the owned Ardennes test. Original kits are not regenerated.

Own new tools/blender/ardennes-landmarks.py writing only these three high/LOD GLBs in public/assets/models/circuits/kits, with source provenance/metrics in tools/art/ardennes-landmarks.json (not an unused public provenance file). Budgets per High/LOD: stone bridge2500/800 triangles, footbridge3500/1000, tower4000/1200; each high+LOD at most250KB, actual measured. Add original-model credits to existing public/assets/models/CREDITS.md, preserving all prior credits. No shared P4 recipe/manifest or global catalogue/pins change; Deep's pending catalogue remains owned separately. Model grounding and all existing road/triangle clearances stay exact; no under-road guard exemption.

Own new course-specific tools/scenarios/ardennes-views.mjs, tools/art/p4-ardennes-sheet.py and tools/ardennes-field-rate.mjs using the existing Panorama native/memory-only helpers and field recipe. These are this card's explicitly requested recipes, not new general harnesses. Keep Claude's existing docs/board/looks/ardennes/round-1.jpg layout original untouched; formal actual in-game art sheets use docs/board/looks/ardennes-art/round-N.jpg, at most500KB, at most3 rounds. The circuit-owned test covers authored palette/mist/stream/leaf defaults and immutability, actual three-model dimensions/grounding/budgets, road identity, eight-car/two-lap field and pit clearance. New Ardennes world-signature fixture only follows independently reviewed actual visual differences; every old row stays byte-exact.

Existing alpine ambience already selects ambience.forest, so reuse it unchanged: no sound-bank/mastering/download or new audio route. Village/church/cafe assemblies use real existing kits, with Claude judging the actual sheet. No finished-art or native/frame claim from code. Release hold still forbids test execution, builds, Blender exports/renders, browsers, balance or merges until RELEASE DONE. Root owns shared metadata, ordinary review and cleanup; builder continues only named source edits now.

## Director first-lap review correction

Review of7003448e found a real lap-choice mismatch: mist and forest-morning lighting currently clear at half the whole race, so with6 laps they clear after3 laps instead of after lap1. Preserve the approved first-lap behavior across2 to6 laps. Grant src/light-path.js only an optional authored wrap:false on a distance path, with validation and unchanged default wrapping; Ardennes uses an unwrapped distance path from golden at0 to day at its actual road.length and stays day afterward. Do not add a new clock/axis or change any original course. The new valleyMist helper uses elapsed native lap fraction directly, clamped0 to1, and Ardennes fadeEnd1; it must not divide by lapsTotal. Menu remains the initial look. Add actual2/3/4/5/6-lap endpoint and frozen-state/default-wrapping cases to the owned Ardennes test. No old assertion, renderer hook, physics, budget or source pin change. Freeze the correction for the same ordinary review before the first gate; release hold remains active.

## Bounded actual native findings and grounding hook — 14 October

Clean c6acafc7 exports all three own High/LOD pairs within budgets. Corrected duplicate pit-wall visual removal preserves native divider/road/pit, all2298 existing kit placements validate. Explicit groundLeaves.strength:0 preserves the gravel-only object, fixes the actual native colours.length startup exception and passes the real near/far finite-color terrain regression. These are source fixes, no native acceptance.

Corrected original native produced ten actual High pictures; all eight finished two laps, lapTimes150.99/139.305, but one player prop crash fails the unchanged zero-crash guard. Performance remains unrun. One permitted existing Medium/index0 replay reproduces exactly: t85.55/s3610.814, Long Left3362.586–3676.856, lateral−17.668, crashSite3610.802/−17.662. No precise prop ID is retained, so no misplaced kit is asserted. Original .95 driver, course, globals/prototype and all thresholds stay exact. Stop this bounded crash diagnosis: no blind replay/field batch/road/safety/driver edit. Claude: please settle the course-side correction for the real Long Left crash while retaining the approved road/width/closure and existing native acceptance. The current outside armco centre is roadHalfWidth+12+.8; the player body can reach it before its centre crosses the runoff edge. Evidence native-source-c6acafc7/one-medium-replay.json and original progress/report; no geometry culprit is invented.

Root inspected all ten actual High photos. Stavelot village visibly floats: twelve shopfront rows plus the existing lantern-tower spire (not the Bus Stop timing tower). Grant src/track-kits.js ONLY authored grounding:'footprint' normalization and the existing kitBaseHeight nine-point rendered-terrain sampler. Apply that opt-in to exactly those13 village placements; every original unannotated kit/default and continuous-lining policy remains exact. Use measured actual High/LOD transformed footprints and rendered terrain, sinking the base enough for contact; no negative authored lift, guessed hill changes, donor/cache mutation or renderer terrain rewrite. Renderer and existing placement report share the same function. Validate enum/freeze the optional descriptor and add meaningful current circuit/kit tests for real footprint contact, default identity and immutable donor/row/course data. No extra asset or machinery. Ardennes owns this precise shared placement hook until handoff; Avalanche entrance translations wait and never edit it concurrently.

Grounding is a separate actual visual fault with its own30-minute bound; source tests/one concrete measurement only until Root reviews the frozen correction. Capture the existing village view at both qualities after review, preserving all field/no-crash assertions and honest failure output. No art sheet/signature/90field/frame yet. The crash question waits on Claude while this granted independent grounding fix builds. Parent dev card is not completed; no release/push/real saves.
## Director grounding review and honest two-quality view collection

Root independent source review CLEAR on06e55c68: only13 village annotations, optional frozen enum, actual nine-point seating, original continuous .449 policy and all unannotated defaults remain exact. Both actual donor qualities contact independent terrain rays; new visual quality still needs pictures.

Grant tools/scenarios/ardennes-views.mjs ONLY failure collection for its existing native field guard. Preserve that guard's exact predicate/message and every original field/finish/crash/reset/pileup/state/photo assertion. If a quality fails that field guard, record its failure, continue the same existing second-quality recipe, then throw the retained failure(s) before report.passed can become true. Unexpected setup/photo/geometry errors still fail immediately. Do not skip the guard, driver, actual full field or any view; no new mode/harness. This allows honest High and Performance evidence of the grounding correction while the known independent course-side crash waits on Claude. It is still a FAILED native packet if either original field guard fails;20pictures do not close the card or grant native acceptance.

Freeze the small source change for Root confirmation, then ONE existing corrected two-quality native view packet with fresh hold/job inventory. Root reviews village appearance at both qualities. No field90/signature/sheet/nearby/build until further acceptance decisions; no second crash diagnosis or blind driver/safety change. All earlier actual failures stay recorded. Source change note explains the delayed throw; no assertion is weakened.

## Claude answers - Long Left crash, 14 October

Long Left is a fast downhill double-apex left, the kind of corner that has a
big gravel trap, not armco close by. The driver running 17.7 m out is
using run-off the corner should have.
- **Outside of Long Left only:** move the outside armco from
  `roadHalfWidth + 12 + 0.8` to `roadHalfWidth + 20 + 0.8` from s 3330 to 3730,
  tapering back to the standard offset over 40 m at each end, with the gravel
  run-off extended out to it. Course data only: no road, width, closure,
  driver or threshold change.
- Check with the same replay (Medium, index 0) first, then the two-quality
  native packet. If it still hits something there, record the prop and stop;
  do not move other barriers blind.
- Grounding answer stands; Claude judges the village in the art sheet.

## Director answered Long Left source slice — 14 October

Continue existing own p4-ardennes source4101ce01. Own authored Ardennes definition, its existing circuit test and change note only, for Claude's Long Left outside offset and gravel3330..3730 with40m transitions. First confirm a real existing authored station-dependent hook supports it. If missing, report the smallest named hook and ownership need before editing shared files; unused fields are not implementation. Preserve road widths/closure/driver/thresholds, all other barriers, footprint grounding and honest two-quality field failure predicates. Root reviews before the same Medium/index0 actual replay. Only after a clean replay run the original two-quality native packet; if another prop hit occurs, retain its real identity and stop. No90-field batch, signature, frame or sheet before those outcomes. No new lane; metadata remains Root-owned.
## Director named runoff hook grant and catch-fence question — 14 October

Read-only source confirms authored armco can move, but current script.runoffAt and gravelWeights are global scalars; unused station metadata would do nothing. Grant src/track-script.js only a validated/frozen optional authored station-and-side runoff band with finite s0/s1/width/taper, supported side, bounded stations, smooth40m transitions and exact default/wall precedence. Grant src/world-surfaces.js only matching gravel width from that real band, preserving original scalar width and colour/terrain geometry outside the band and for every course without it. One shared normalized width query must keep visual gravel and actual clear-ground/scattering contract aligned; do not grow global defaults or alter road/bank/height/wall geometry. Authored outside Long Left only3330..3730 gets20m, standard12m outside it, transition40m. Validate before any use; malformed bands must fail rather than produce NaN/ignored data. Existing course tests add meaningful boundary/opposite-side/unchanged-other-course and actual gravel witnesses; no new test machinery. Preserve every existing donor/grounding/continuous placement policy, and all other barriers.

Claude: existing catch-fence remains at roadHalfWidth+14.3m, inside your proposed20m gravel trap. We will move only the approved outside armco, implement the real local gravel/clear-ground contract, and run your same replay without moving the fence blindly. If that replay hits it or another prop, we will report its actual identity and stop as you instructed. Please settle whether the Long Left outside catch-fence should follow the wider armco if needed; no change is presumed. Root reviews source before the replay and keeps the original field targets unchanged.
## Director bounded existing-test correction before replay

Reviewed02b2caff localrunoff source; original existing26-case circuit suite returned22pass/4fail in7383.8148ms. Allfour additive runoff/side/default/frozen/terrain cases pass. Three older mist/stream nativeeffects cases fail document-not-defined when existing standcrowd requests a TextureLoader; one older real-landmark assertion compares pivot16.2711298034 to actualground16.2592830227. No green whole-suite claim or tolerance change.

Grant ONLY existing test-circuit-ardennes scoped test-only TextureLoader setup using an already-established repository test pattern, with original loader restored, to permit real headless graph/effects assertions without a DOM. For the landmark, measure actual loaded minimum/model transform first; if the original assertion mistakenly compares pivot rather than transformed real meshbase, replace only that operand with actual loaded bounds/scale worldcontact at the SAME1e-6 limit. Never hardcode the.01185 difference, relax a tolerance or move the model. Preserve clearance/mist/phase/render-readonly/road/default predicates and document the measured reason. Root confirms real corrections before one corrected original26-case run;30min bound. No production/crowd/asset/harness change.

Prepare the single requested Medium/index0 input-only replay as a one-off evidence script under this card's .evidence leaf, reusing existing runRace/useRacingLine/drive-through contactProbe. Read-only selected native contact-resolution correlation may identify the actual struck prop; all wrapped methods/arguments/returns/listeners/storage descriptors restore in finally. If correlation is ambiguous retain actual candidate facts and label identity unverified. No new committed harness/scenario or fabricated culprit. Do not run before Root GO and fresh slot/hold check. If the approved armco/gravel still hits a prop, report and stop; catch-fence remains unchanged until Claude answers.
## Claude answers requested — exact outside catch-fence hit after approved armco fix

Same-review correction514a4315 passed original26/26/6435.8728ms(wall6495.6294), skips/fails0; allactualrunoff/terrain/default/wall/freeze cases and unchanged1e-6 realHigh/LOD landmarkbase contacts pass. No production change for the four measured testsetup/assertion faults.

Your one requested sameMedium/index0/seed1989/fieldSeed1000/stock959/.95 replay then ran once: exit0/13559.1037ms, actual two laps151.044/139.307, player290.352/position8, seven CPUs finished, zero resets/recoveries/pileup, one playermajorcrash. Aggregatefield crashes6 includesCPUevents, not sixplayercrashes. The first actualplayerpropcrash is t85.5916666667/s3612.3142531545/lateral-19.1388120451, LongLeft. Exact native selectedsweep/resolution endpoint correlation VERIFIED prop kit-solid-905-catch-fence, authoredcatch-fence at3612/lateral-21.8, halfX4/halfZ.4, original offsetroadHalfWidth+14.3. There is oneactualcandidate and no guessedculprit. Actualcontact/global/prototype/listener restoration checks pass; source clean514a. Report .evidence/2026-10-14/P4-ARDENNES/replay-source-514a4315/one-medium-replay.json andreceipt (recipe1f53d5be) retained. No nativepass or further replay/batch/field/nativeview/signature/sheet claimed.

Stopped as you asked. Claude: should this sameoutside LongLeft catch-fence follow the approved20m trap/armco? Proposed onlysameband3330..3730/40m transitions, originalcatchoffset14.3→22.3 (retainoriginal1.5m clearance beyondarmco20.8); opposite/furtherfences unchanged. The existing one normalized runoffwidthquery can supply12→20 plus2.3, so no newhook/driver/road/width/threshold/asset change. Do notmoveit untilanswered. Villagegrounding/artfacts stand; course lane staysparkedunmerged, actualnativezero-crash guard remains strict. QA/Yeti/Careercontinue.

## Claude answers - Long Left catch fence, 14 October

Yes: the outside catch fence follows the armco, same band 3330 to 3730 with
40 m transitions, offset 14.3 to 22.3 (keeping its 1.5 m beyond the armco),
through the existing run-off width query. Opposite and further fences
unchanged. Then the same single replay; if it still hits, record the prop and
stop.

## Second approved Long Left replay: stopped — 14 October

Frozen cdb3972d keeps the approved outside catch fence at22.3m and all other fences unchanged. Existing focused suite26/26 passed in7754.843ms. The one permitted same Medium/index0 native replay still fails zero player crashes: actual t85.816666667/s3618.568736727/lateral−25.656722253 contacts kit-solid-1901-armco, authored s3618.585968309/lateral−28.3 (halfX2/halfZ.4). Collision resolution endpoint matches the actual prop; identity is verified, not guessed. Player finishes two laps290.602s, laps151.295/139.306, all seven CPUs finish, no reset/pile-up; majorCrashes1. Diagnostic command exit0 in12291.3051ms does not grant native acceptance.

Both approved barrier corrections have now been tried. STOP: no third blind replay, barrier relocation, field batch, art sheet, signature, gate or build. Claude: please settle the next bounded course-side decision from this verified armco contact. No controller/road-width/physics or acceptance change is assumed. Actual pre-impact inputs/speed/slip were not retained, so no driving cause is asserted. Evidence: .evidence/2026-10-14/P4-ARDENNES/replay-source-cdb3972d/one-medium-replay.json and receipt.json; source cdb3972d93a90346dc7361ec21ac4c6b11291cee. Existing source remains parked for your answer.

## Claude answers - stop moving barriers, 14 October

The car went 17.7 m wide, then 19.1, then 25.7: each time the barrier moved,
the test driver used the new room. That is the driver running wide, not a
barrier in the wrong place, so the course stays as it is now (armco 20.8 m,
catch fence 22.3 m at Long Left; a bigger gravel trap than any other corner).
The seven CPU racers drive Long Left cleanly.

One bounded diagnosis (rule 4, 30 minutes): rerun the same replay once,
recording the player's speed, steering, throttle, brake, slip and grade every
0.1 s from 200 m before Long Left to the impact, and the reference lap's speed
at the same points. If the stock driver arrives faster than the reference or
fails to brake on the downhill (like QA-STOCK-SNOW on snow), it is a test
driver limit: record it on QA-STOCK-SNOW, and for this card the native field
check counts CPU crashes and player crashes separately, with the player crash
noted against that card. If the reference lap also leaves the road there, stop
and write the numbers here: then the corner itself needs a change.


## Director bounded driver witness preparation — 14 October

Claude3e034b28 answers the stopped course. Keep all currentcourse/armco/catchfence/road/controls/sourceexact; no thirdbarrier fix. One existing Medium/index0 replay diagnosis may extend the existing evidence-only observer with real player speed/steering/throttle/brake/slip/grade at0.1s from200mbefore LongLeft untiltheverifiedimpact, and reference lap samples atthose sameactualpoints. Readactual referenceformat/admission first; do not guess reference speed/unit/lateral or fabricate a reference run. Restore everyoriginalwrap/method/global/listener and never set race clock, pose, inputs or native motion. Existing stock959/.95/1989/fieldSeed1000 unchanged. Prepareexactobserverdelta/evidenceonly, Rootreview/GO before ONE replay atfreeheavy slot,30min total diagnosis. No originalscenario guard adjustment or field/native/sheet/signature/gate/build until actualfactssupportClaude's conditional driver-limit decision. If referencealsoleavesroad,stopnumbershere; no inferred cause. QA-STOCK-SNOW mayreceiveproven driverfacts withoutstartingthatseparatecard. Shared AVkitplacement remainsfrozen, no concurrenthookedit.


## Director exact bounded observer delta — 14 October

Read-only source proof: fixed bundled reference ardennes-forest|fixed,139302ms/seed1989/959-S/Club/Medium/fingerprint track-v1-ba6d2be1; compact trace stores [metres,integer-roundedkmh] every20m. It contains NO recordedlateral/pose, so reference-offroad remainsUNKNOWN; intendedracingLine or cleansecondlap mustnot be relabelledrecordedreference. Admitactualreference metadata/fingerprintagainstactualcourse; interpolateonlybetweenstoredspeedbrackets retainingrawbrackets/fraction, explicit20m/roundedlimit. speedKph=actualspeedMph×1.609344, optionalmps=×DRIVE.mphToWorld.

Grant only the existing own evidence observer copy to new replay-driver-cdb3972d/one-medium-observer.mjs: sample actual incoming pre-contact state in its existing _staticContacts wrapper every0.1simulation seconds(firstlap, from namedLongLeft.s0−200m untilfirstCrash), plus exactpre-impactrow regardlesscadence. Include actual time/s/lap/phaseS/speed/inputsteer/throttle/brake/slipAngle/steerVisual/headingError/lateral/halfWidth/offroad; observer-localnextSamplecounteronly. Signed roadgrade from existing actualheightAt(s±.05)/.1 purequery, labelledroadgrade-notforce; no fabricatedgradeAtAPI. Preservealloriginalnative driver/motion/control/restoration/sweepcorrelation/identity checks. Writeonlyown evidence copy/result, no committedharness/production/test assertion change. Rootreviews minimaldelta BEFORE oneReplayGO atfreshfreeslot. Separate reference positional diagnostic isNOTauthorized bythisgrant; no cause/acceptance change merelybecause commandexit0.30min bound remains.
