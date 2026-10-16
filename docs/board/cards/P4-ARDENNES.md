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


## Bounded driver witness: condition not proved — 14 October

One corrected completed witness on exactcdb3972d, recipe7d986fa2,29275.9884ms/exit0,88actual0.1s firstlap incoming samples and exactpre-impactrow; all original driver/contact/method/global/prototype restoration checks pass. Initial observer attempt aborted1635.5987ms: negativeunwrappedgrid s wrapped toend, outside stored20m speedbrackets. Exactlyone earlyunwrapped-windowguard fixed observer scope; strictbracket checks and allmotion stayedexact. Both receipts retained, no blindmotionrerun or nativepass.

Entry-nearestactual s3366.096/time80.2833:263.442kmh vs20m-rounded/interpolatedreference262.819(+.624), throttle0/brake.6253/steer−.3702/slip4.569deg/grade−2.892%. Firstsampledbrake at3351.234/time80.0833:271.798 vs269.753(+2.044max observed), throttle0/brake.2992; storedreferencebrakeS3344.021 is withinone0.1s/≈7.5m samplinginterval, so this doesnotprove missedbraking/latebraking/materialoverspeed. Firstobservedoffroad3511.102/time82.8833:177.813 vs203.441(−25.627), throttle0/brake1/steer−1/slip18.374deg/lateral−7.670/halfWidth7.5/grade−1.657%. Actualpreimpact3618.56875/time85.8167:152.954 vs185.716(−32.762), brake1/steer−1/lateral−25.7767/grade−1.666%; same verified kit-solid-1901-armco. Finaltwo playerlaps/one majorcrash/zeroreset, allsevenCPUsfinished, asbefore. Referenceevent/route/seed/car/driver/CPU/fingerprint admittedexact; recordedpose remainsUNKNOWN.

STOPwithin30min. Your driver-limit exception isNOTclaimed from these facts; actualreferenceapproach agreeswithinrounding/interpolation and braking isactive. Claude: may we run the existing original reference builder once retaining its raw lateral/pose before compactLapTrace drops it, without regenerating acceptedJSON/fingerprint, to decide whether the referencealsoleavesroad? Alternatively settle a nextboundeddiagnosis from thispacket. No road/barrier/controller/acceptance/signature/sheet/gate/build edit. No QA-STOCK-SNOW defect or CPU-onlypass isasserted withoutproof. Evidence replay-driver-cdb3972d/{one-medium-replay.json,receipt.json,observer.diff,manifest.json,grid-window-failed*} retained; cardwaitswhileotherworkcontinues.

## Claude answers - reference lap check, 14 October

Yes: run the existing reference builder once keeping its raw lateral and pose
through Long Left (3300 to 3700), without regenerating the accepted JSON or
fingerprint. If the reference lap stays on the road there, the stock replay
is the outlier: compare the two line by line at 3351 to 3511 (the replay was
already at full brake and full lock with 18 degrees of slip when it left the
road) and record it on QA-STOCK-SNOW as a stock-driver limit. If the reference
also leaves the road, stop and write the numbers here.


## Reference comparison proves the recorded driver limit — 14 October

The one approved raw reference build used the unchanged existing builder and native policy on frozen cdb3972d. It passed in 6478.4896 ms, exit 0. Its selected timed lap is exactly 139302 ms; metadata, course fingerprint and the complete compact trace match the accepted JSON. All three native laps (142.562, 139.306, 139.302 s) are unassisted, with zero player major crashes or resets. Across 201 actual samples per lap from 3300 to 3700 m, every centre remains on the road: maximum absolute lateral 6.098302 m against half-width 7.5 m. The observer restored methods, globals, registry and disposal; accepted JSON and production bytes are unchanged. This is sampled path evidence, not a new continuous footprint assertion.

The distance-matched comparison retains 29 replay rows from 3351.234 to 3511.102 m with their raw 30 FPS reference brackets. At 3351.234 the replay is already on a different line: lateral -1.688 versus reference -5.976 m, while speeds agree (271.798 versus 271.996 km/h). At 3412.761 the replay steers +1 while both surrounding raw reference samples steer about -.91. At the replay's first sampled off-road point, 3511.102 m, it has lateral -7.670 m, full brake/full negative steering and 18.374 degrees of slip; the reference remains at lateral +5.287 m and about 203.471 km/h, with surrounding raw samples at throttle 1/brake 0. No material entry overspeed, missed braking or underlying opponent-interaction cause is claimed.

Your explicit reference-stays-on-road condition is now met. Record this full-field stock-driver limit on QA-STOCK-SNOW and continue the course with separately reported CPU and player incidents. Preserve the known Long Left player crash as an explicit exception rather than calling it zero; every new or different player failure remains a failure. The isolated reference has no CPU opponents and does not prove zero CPU incidents. Root will name the exact native guard and sheet adjustment before code. No further barrier, road or driver change is authorized. Evidence: reference-raw-cdb3972d/{one-reference-raw.json,receipt.json,replay-comparison.json}; native replay witness remains in replay-driver-cdb3972d. No published reference or native field pass yet.


## Native field exception implementation scope — 14 October

Continue the existing course lane; shared placement and terrain source stays frozen until Avalanche merges. Own only tools/scenarios/ardennes-views.mjs, tools/art/p4-ardennes-sheet.py, additive cases in tools/test-circuit-ardennes.mjs and the course change note. Grant tools/scenarios/p4-panorama.mjs only additive exports of the existing sweepObstacle, sceneryIdentity and offroadCapability functions in its private native helper. No production or public helper API changes.

Reuse the existing reviewed read-only contact observer from replay-source-cdb3972d, rather than inventing a new solver or input fixture. Every wrapped method delegates exactly once and restores in finally. Record every actual player crash event and independently verified selected obstacle; verify the existing resolution endpoint before naming a prop. Record actual field incident rows separately: CPU indices 0 through 6, player index -1; reject unknown indices. Incidents are not a count of unique cars. Preserve the first-30-second pile-up calculation over all actors.

The only changed acceptance operand is the old unconditional player-major-crashes-zero requirement. Accept zero player crashes, or exactly one independently verified first-lap Long Left armco incident matching the recorded kit-solid-1901-armco, the actual authored placement, stock959/.95/Medium/1989/fieldSeed1000 setup and approved outside band. Unknown identity, a different prop, another crash or any other failed guard still fails. Keep all eight finishers, two laps, zero resets, no opening pile-up, finite state, real geometry and all twenty read-only photos at both qualities. The sheet verifies the same structured receipt and explicitly labels the known player driver exception; never call CPU incidents zero or this a clean player run. Add meaningful cases for unknown identity and second/different crashes before implementation, with all original assertions and tolerances unchanged. Source freezes for Root review before one focused test and one native run. No field batch, reference rewrite, timing, signature, gate or merge yet; art verdict remains Claude's.


## Negative-grid mist and capture correction — 14 October

Reviewed dd2a26b6 passes the original 28 tests (7176.8224 ms wall). Its one actual two-quality browser run passes in 94525.9544 ms, private41724/memory-only, twenty pictures and no issues or warnings. Both qualities finish all eight racers/two laps, one verified known player incident, five CPU incident events, zero resets and no opening pile-up. No clean-player or zero-CPU claim.

The sheet correctly refuses the initial capture's reported fogNear359.987775 instead of90. At the actual grid s=-26, the photographer computes completedLaps*length+phase(s), wrapping to6657.9235. The production lighting reader already receives unwrapped s and clamps negative distance to0; do not change it. Separately, addValleyMist uses the same wrapped phase for first-lap fade, hiding the mist at the grid before it reappears at s0. This is a genuine new-course negative-grid presentation fault. No sheet was produced, so no formal art round is spent.

Grant only src/circuit-effects.js addValleyMist progress: negative native s during countdown/early race gets initial progress0, while menu and every nonnegative calculation remain exact. Add meaningful negative-grid/countdown cases in the existing Ardennes test with frozen state and all old first-lap/2-to6-lap assertions retained. Grant only the existing photographer's light sampling distance operand to use actual unwrapped s, matching production; keep the exact morning90/day360 sheet guards. No race motion, light-path engine, renderer, controller, tolerance, synthetic pose or accepted-picture claim changes. Freeze for Root confirmation, then one corrected original focused suite and one original native packet. The prior successful field receipt remains a fact; the corrected initial mist needs actual new pixels before the first sheet.


## Claude art verdict requested — first actual scenery sheet

Source ba351920 is clean in p4-ardennes. [Actual round-one sheet](C:/Users/kyleb/.codex/worktrees/wasteland-integration/p4-ardennes/docs/board/looks/ardennes-art/round-1.jpg) and [review note](C:/Users/kyleb/.codex/worktrees/wasteland-integration/p4-ardennes/docs/board/looks/ardennes-art/round-1-review.md): twenty genuine High/Performance views, 296049 bytes, SHA256356aa35997b75916630adec7ab6294202bc5daec9810b9af5622902bbd51fd82. First scenery round only; your accepted road-map original is untouched. Corrected native packet passes at private15498/memory-only with zero issues/warnings and exact fog90/360. All eight finish two laps; the approved known player exception and five CPU incident events are stated explicitly. Original focused29/29 passes. No full-card, lane, field-rate, drive-through, signature or frame pass yet.

Please judge the three original landmarks, forest/mist/light and village. Root sees a readable flowing road and forest, but the village remains sparse and block-like; several buildings look suspended on the steep slope in full Stavelot pixels despite measured base contacts. Footbridge framing is weak. No geometry or art verdict is inferred from tests. Please name any builder correction for round two versus your later finishing pass. The lane parks for your verdict and Avalanche's shared-placement integration; other QA engineering continues.

## Claude verdict - scenery round 1, 14 October: round 2 needed

Judged on the sheet and the full-size High views (Stavelot, Red Water,
Kestrel). The road, the flow and the morning mist in the dips are right; Red
Water with mist in the trees is the best view. Round 2, builder corrections:

1. **Stavelot village (the main fault).** Today it is a dozen tiny box houses
   scattered up a bare hillside, and the spire floats in the air with its
   pointed base off the ground. Make it a village: one tight cluster in the
   valley floor below Stavelot (not on the steep face), houses shoulder to
   shoulder along two or three streets that follow the slope, pitched roofs
   in two or three dark slate and red-tile tones, the church in the middle with
   its tower standing on the ground (a proper base, not the lantern tower), a
   few warm windows. Use existing building kits; same approach as
   PANORAMA-TOWN, so share the helper if one is built.
2. **Forest density.** The design is "tall dark firs and beech woods close
   behind the fences". Today there are wide open meadows with thin tree lines.
   Bring a dense band of firs to within about 10 m of the catch fences along
   Kestrel, the Forest Run and Whitewood, with open grass only around the
   grandstands, the paddock and Stavelot's valley.
3. **Beech trees.** The round brown lollipop trees on Kestrel look like toys
   (the same fault as Tremblant's round trees). Use the grove trees with a
   summer-green beech tint instead, as Tremblant now does in autumn.
4. **Road tone.** The damp-road look reads as blue and glassy, nearly water.
   Keep the dark damp look but neutral grey-black, with the sheen only under
   the trees and in the first-lap mist.
5. **Stone bridge.** It reads as a bright white monument beside the road. Make
   it weathered grey stone and show it spanning the red-brown stream, with the
   stream visible either side.
6. **Footbridge.** Add one view from the car passing under it on Kestrel.

For Claude's finishing pass later: the light path timing, the grandstand at
The Wall, and the timing tower framing. Frame check when wired in.


## Round 2 source preparation lease

Resume the retained p4-ardennes lane from its clean ba351920 source and merge current integration normally. Implement the six actual Claude round2 directions in owned src/circuits/ardennes-forest.js, tools/blender/ardennes-landmarks.py, tools/art/ardennes-landmarks.json, tools/scenarios/ardennes-views.mjs, tools/art/p4-ardennes-sheet.py and own change note only initially. Reuse the now merged addCircuitLandmarks town/church through course-owned circuitLandmarks data:2or3 grounded valley streets, real church base and varied pitched roof buildings with warm windows, road/bridge/stream clearances. Reuse current green grove/forest hooks for summer beech and dense firs within10m of the catch fences, keeping paddock/stands/valley clear. Preserve route/barriers/known driver exception/reference/native input and all20 original views.

Prepare only the original stone-stream-bridge High/LOD pair for later weathered grey export, with red-brown stream visible both sides; do not rebuild other two pairs or assets. Name an explicit selected bridge export path before any export; preserve original default recipe behavior. Add one actual car-height Kestrel-underbridge view per quality through the existing read-only native view path; do not move race state or relabel the old off-road high camera. Grounded church/foundations need actual triangle evidence, not an assumed seated centre.

No shared placement/terrain/helper source edits until Avalanche merges. For neutral damp asphalt with local tree/first-mist sheen, prepare the minimal opt-in design in the note; the later actual src/road-surface.js and src/world.js hook lease must be named before code and preserve all other courses/defaults. Use the existing town roof palette if it meets the direction; do not change the shared helper without a named later lease. Source preparation only: no export/render/browser/capture/gate/build/assets/signature/frame until Root reviews and schedules. Art family cap3; round2 not consumed until its actual sheet exists. Root owns shared metadata, exact source review and all jobs; no Kyle question or fourth round.


## Named review follow-ups before execution

Root source review confirms the selected bridge pair and native first-lap underbridge approach; no export or picture acceptance yet. Preserve-both CREDITS.md conflict resolution is authorized: current integration text exact plus the existing original Ardennes paragraph once, no changed licence or source.

The existing all-Blender-generators guard necessarily sees the newly added Ardennes recipe. Own tools/test-blender-output.mjs only one additive nativeGenerators registration naming tools/blender/ardennes-landmarks.py and its existing tools/test-circuit-ardennes.mjs native suite. In that existing suite add meaningful original CLI paths-only cases for two empty temporary roots, exact six default outputs versus two stone-bridge-only outputs, unchanged provenance destination and no created files, plus malformed selected model rejection. Keep all existing roster/path/asset/native assertions; use the established Node/stdlib CLI style, no new harness or guessed Blend outputs. The actual original recipe directory-plan contract stays unchanged. Source freeze and Root review before execution.

After Root explicitly announces Avalanche merged, the later shared roof hook is leased precisely: src/circuit-landmarks.js town-only optional roofColours of2or3 valid RGB integers, default TOWN_ROOFS and deterministic selection unchanged; additive cases in existing tools/test-course-landmarks.mjs retain every default/grounding assertion. The course-owned3-colour descriptor is preparation until that real hook exists. No helper code before that signal. The damp-road source lease still waits for its concrete existing shader hooks and default-preserving station/mist plan.

## Disjoint round 2 helper lease after Avalanche source is green

Avalanche4415b339 is frozen, independently reviewed and317/317 green; only its build slot waits behind three foreign gates. Its track-kit files are not touched here. This precise disjoint source lease supersedes the earlier helper-code hold: continue the retained Ardennes lane without a new lane or any execution until Root GO.

Own src/circuit-landmarks.js optional town roofColours2or3 valid RGB integers with original default palette/hash exact. Church-only opt-ins churchStyle:'stone' and grounding:'footprint' must retain exact unopted Panorama construction, dimensions/materials and centre seating. Stone nave/tower use existing weathered stone material, existing dark roof and unchanged building dimensions. Ground both actual rotated nave/tower footings using finite actual renderedGroundHeight(requireSurface:true), including edges/corners/interior <=.5m spacing and the existing road-clearance policy. Extend only their stone foundations downward to sampled minima with existing .2m embed, root at actual sampled maximum; reject missing support. This proves a .5m full-footprint sample, not every intervening triangle; actual native ground/side views remain required, and no assumed centre-ground pass is accepted. Existing test-course-landmarks/test-circuit-ardennes gain additive actual default/stone/footprint/malformed/ownership/disposal cases; every prior assertion stays.

Own src/road-surface.js and src/world.js only the optional Ardennes dampRoad material descriptor/binding prepared in the existing source review: neutral0x747474, dry roughness.9/damp.58, metalness0; shade ranges only authored Kestrel/ForestRun/Whitewood plus first-lap actual mist opacity. Reuse strip vRoadSurfaceUv.y*10 and current course length, no world-surfaces/geometry/grip/bank changes. Bind four unique existing valley-mist material refs only after addTrackScriptScene, synchronize shared uniforms after actual mist update, no per-frame traversal/allocation/needsUpdate or duplicated fade formula. Structural shader key only for opt-in, all old absent/default/dry/night/wet keys/materials/textures exact; existing wetRoad.performanceShare .5 unchanged. Existing test-road-surface and own course tests add meaningful default/opt-in/malformed/multiple-compile/actual-mist/disposal cases. No render3d, scene-systems, circuit-effects, track-kit, terrain, registry, replay or signature edits. Freeze/source review before focused/native/gate/build; round2 actual appearance and whole-ground evidence remain pending.
## Current-integration union before final round 2 execution

Root confirms retained ff941313 source review and actual selected stone-bridge export remain valid; no repeated export. Before actual focused/native work, sync current integration normally in this retained lane. Exact preserve-both boundary: world.js keeps Ardennes damp-road binding/options and incoming Snow fourth material-options argument; track-kits.js/test-track-kits keep incoming accepted Avalanche named translations AND retained full-footprint seating; test-circuit-ardennes keeps incoming actual Attack roster repair and all retained ground/native guards; test-blender-output keeps incoming HELI generator rows and retained Ardennes registration; CREDITS keeps current text plus existing Ardennes paragraph once. Resolve only those real disjoint merge conflicts, never overwrite one side or broaden source. Freeze/report actual diff for independent Root confirmation before execution. Other real conflicts stop for a precise lease.

Then Root may admit the existing three focused suites (test-circuit-ardennes, test-course-landmarks, test-road-surface), jobs4 or fewer, followed by ONE existing ardennes-views native packet with private auto-port and memory-only storage. Preserve all22 views, known first-lap kit-solid-1901 exception exactly, real players/cars/stock input/roster and both qualities; new crash or view failure is a failure. Actual Stavelot/RedWater/Kestrel ground/bridge pictures and full-footprint sample facts go to Claude in the numbered round2 sheet. The bridge pair is already exported; no repeat, new harness, signatures, altered driver, frame/tuning or art verdict. Root schedules every actual job after clean source review/fresh actual capacity/holds; max3 roots/fourworkers. No export/native/gate/build begins merely from this source-sync lease.

## Actual focused failure and current-town correction scope

Clean e7b98c4e union independently CLEAR. Original focused run ended06:02:39UTC/11981.2306ms:2/3 pass,zero unrun; circuit29/31 fails only two obsolete13-kit-village queries. Source ed51189e deliberately replaced those12shopfront/1lantern rows with stavelot-valley-town(two streets28/48) and separate stavelot-church; road and actual church/helper suites pass. No current town-footing/native/round2 pass inferred.

Root source search proves the track-kit footprint opt-in added solely for removed rows has NO authored caller in src; only the separate church helper still uses its own option. Replace means remove: do not add a historical13-house fixture to keep that removed path alive. Narrow lease BEFORE code: remove ONLY Ardennes' unused generic track-kits grounding validation/normalized field/conditional branch, restoring exact incoming default kitBaseHeight while retaining incoming Avalanche worldPosition/named translations and live Ardennes landmark/leaf hooks. Remove the two obsolete kit-village tests and unused imports, explaining intentional behavior replacement; retain generic/default/lining/AV tests unchanged.

In SAME existing test-circuit-ardennes suite, replace them with meaningful actual current town/church identity/nonempty frozen houses/both streets/3roof-colours checks. Build current town via existing addCircuitLandmarks and verify EVERY real instance count equals authored houses.length>0; transformed3x3 and <=.5m full-footprint support against drawn near/far terrain, foundations span ground, floors clear support, veranda posts reach it, existing road clearance/nonmutation/disposal exact. Retain separate actual church footprint and road suites unchanged. No invented High/LOD for instanced town,13-to0 waiver,tolerance/fixture regeneration or new harness. If current tests expose a real runtime fault, stop/report exact finding before production fix. Freeze/Root source review BEFORE rerun/native. Original failure budget ends06:34UTC, then note/other work.

## Current-town correction independently confirmed and passing

Root reviewed clean4bb1c85ef900714c6e0b56b235cf8a9b2032af89 CLEAR: exact incoming kitBaseHeight restored, unused kit-only opt-in removed, all live AV/default/Ardennes helpers preserved. Actual affected circuit-suite rerun11162 completed06:12:36UTC/13781.9503ms,1/1 suite/31 cases,zero failures/notRun,jobs4,source unchanged/clean. Original passing road/church suites are not repeated. All46 actual houses have11342 footing samples; highest foundation bottom minus ground -0.384383982m, minimum floor clearance0.323331160m; these bounded samples do not replace pictures.

ONE original normal ardennes-views round2 packet is now running in retained lane, session86202/actual browser root14428,parent38736, exact4bb1c85e/privateautoport/memory-only. Outputs .evidence/2026-10-15/P4-ARDENNES/round2-4bb1c85e; wrapper native-4bb1c85e receipts next to it. Do not duplicate/export/gate/build or edit source during it. All22views/bothqualities/original known crash guard remain; actual output/art verdict still pending.

## Original native guards pass; bridge picture is not reviewable

Original22-view run86202 completed06:14:59UTC on exactclean4bb1c85e,exit0/91597.4219ms,privateautoport/memory-only,zero issues/warnings. Actual race/readOnly/field/known-player-exception guards pass. Root viewed full Stavelot,RedWater and actual player-eye underbridge PNGs. The latter has own cockpit/bonnet and sky but no visible bridge: at6m before its deck the accepted1.05m horizontal eye looks under the feature beyond its vertical field of view. Tool pass is not art acceptance. No round2sheet or Claude submission exists, so no actual second art round is consumed.

Read-only source preflight now checks the smallest earlier actual-player approach (roughly18–24m) to bring the existing bridge into the same eye/forward target frustum; preserve real native stock progression,readOnly,bothqualities,all22views/20other intended views and every existing incident/field guard. No new selector/harness, scene/light/vehicle manipulation, elevated fake camera, signatures or repeated export. Exact existing scenario/compositor pose lease is required before edits and one corrected packet; current original packet remains honest failed-framing evidence. Framing investigation ends06:47UTC at latest, then note/other work.

## Exact earlier-approach framing lease

Read-only native evidence proves actual capture s1552.4976626/bridgeS1557.5884861 leaves5.0908235m; fixed inspection vertical FOV48deg cannot show the bridge deck roughly6m above the1.05m actual eye at that range. No fabricated rendered bounding box is claimed. Grant ONLY tools/scenarios/ardennes-views.mjs, tools/art/p4-ardennes-sheet.py and own note: schedule actual native bridge.s-24 crossing instead of-6, require captured first-lap station in [bridge.s-24,bridge.s-18) in BOTH scenario and compositor. Keep exact actual-root eye1.05/18m forwardtarget/rootmatrix/FOV/settle/readOnly/input/light/scene/bridge and all20otherview/field/incident guards. No teleport, elevated camera, look-up or synthetic pose. Freeze and Root review before one corrected original packet; first packet stays real guard-pass/bridge-visibility-fail evidence, no R2sheet/review yet. SOURCE ONLY through the PERF quiet window ending06:34UTC or DONE. Original framing budget ends06:47UTC.

## Earlier real-eye approach confirmed for corrected picture run

Clean2684855922f52beddffa99b9d3d4dca08c31f42b independently Root-reviewed CLEAR: only native24m target and identical [24,18)m guard in existing scenario/compositor, ownnote; originaleye/target/FOV/stock/state/field/incident/other20poses exact. PERF quiet now DONE; Root admits ONE corrected original22-view packet after freshcapacity/holds, no source edits or repeat bridge export. Original4bb packet remains failed-framing evidence; actual second round is still unsubmitted. Framing deadline06:47UTC.

## Claude answers - actual round 2 image verdict

Single image-only Claude review26767 on cleanart380c328329d113ec88d392db1efe3499c630c4c1/currentR2sheet0dc5d43cc153939f63cb18467bed84174575c56520dc956acb296bd0ef4b8bb3 completed06:38:23UTC,exit0/44253.4946ms,claude-opus-4-8[1m],tools/MCP/actual calls all empty. CHANGES REQUIRED: village/church3,forest3,road4,bridges3,overall3. Actual full verdict and receipt in retained lane .evidence/2026-10-15/P4-ARDENNES/claude-image-only-round2-380c3283. Do not duplicate this review.

Claude sees real pitched roofs/church, dense firs near fences, neutral road sheen and the actual car-eye footbridge, meeting road/footbridge directions. Necessary final corrections: ONE clear view of weathered stone bridge spanning red-brown stream with water on BOTHsides; ONE view demonstrating lighter summer-green broadleaf beech distinct from firs; ONE view with2–3legible village streets if they exist. Current thumbnailed sheet obscures those details; no invented pass or optional polish. Two of three rounds consumed; finalR3 remains, no fourth.

Root source-only preflight checks actual street geometry (two house-row corridors alone are not visible streets), actual beech donor/materials and real bridge/water/mist poses before naming the minimal finalsource/view lease. No code/generator/native/export/signature/gate/build begins from this feedback alone. Original corrected underbridge visibility issue was resolved06:31; this final actual-art correction has07:08UTC bounded source-preparation deadline. Existing race guards/22views/known crash exception remain; final close native images must be legible to Claude rather than guessed from tiny views.

## Final-round content proof and source choice for Claude

Read-only preflight proves two real gaps: town helper draws no streets (28/48 are only house-row corridors), and scenery.autumn only tints pine crowns; world.js still calls addPineTrees with pine geometry/pine-bough texture. The available autumn-tree kit is the round lollipop rejected in R1. Reframing cannot invent streets or broadleaf silhouettes.

Claude: which actual beech source should finalR3 use? Please name an existing approved broadleaf asset, or explicitly approve a bounded original procedural beech crown ONLY for Ardennes, preserving all existing course trees/defaults/collisions. Your reference to Tremblant's grove currently resolves to tinted pines in this checkout; no new donor/account/substitution or fourth shared-tree round will be assumed. Art-source choice stays waiting_on:claude; no silhouette work before your answer.

Meanwhile grant these independent exact SOURCE-ONLY fixes in the retained lane: src/circuit-landmarks.js optional town streets descriptor, src/circuits/ardennes-forest.js two4m visual gravel ribbons on existing Stavelot centres28/48 plus1.2sin(along/70),s0-65..s0+130; ground each actual vertex with renderedGroundHeight(requireSurface:true)+0.04m, <=1m longitudinal/0.5m across, no road/grip/collider/state edit. Allocate geometry/material ONLY when opted in; absent descriptors and all Panorama/default node/material/seed behavior exact. Validate finite/clear/nonempty2streets and actual generated vertices/road clearance/nonmutation/disposal in existing test-course-landmarks/test-circuit-ardennes only. Retain current house/church/road/AV tests and assets; no fake street labels.

Existing ardennes-views scenario may prepare clear-second-lap close views of actual village/streets and actual stone-bridge/stream from descriptor-centred read-only cameras, with original race progress/light/mist and all22existingviews/field/incident/stock/readonly guards exact. Preserve actual car-eye underbridge pose. No lighting override, hidden geometry, synthetic car pose, extra export or new harness. Prepare final3-view delivery including future actual beech view; do NOT create/submit R3 JPEG or run another native until beech source is settled and Root reviews the final complete source. Existing compositor may prepare a final numbered layout only, all real pixels/full frames/no overwrite; final judgment should receive the three legible original close PNGs plus brief. One finalR3 only, no fourth. Freeze street/2view source within07:08UTC or note/move; new renderer/silhouette file hooks wait exact answer/lease.


## Street source independently clear; focused geometry admission

Independent reviewer /root/frame_setup_review read exact10ef2beb88bd5e32fadfea010940706568616968 against380c3283 and all eight changed files: CLEAR, no real fault. Actual terrain-query Float32 vertex coordinates, upward winding, sampled spacing/road clearance, graph-owned disposal, absent/Panorama defaults and original22 native/race guards preserved. Review performed no imports, tests or native work.

Root now admits ONE focused existing test-course-landmarks and test-circuit-ardennes run on exact clean10ef, jobs4, after fresh actual capacity/holds. This tests the real new street geometry/descriptors and old default/ground contracts; no road-suite rerun because unchanged. No native, final R3 sheet/review, signature capture, lane gate/build or merge yet. Beech art-source question remains waiting_on:claude; no silhouette/default fallback. Freeze source during this run and record original actual result, not an inferred pass.

## Claude answers - beech source, 15 October 00:05

Approved: an original procedural beech for Ardennes only (Blender recipe in
`tools/blender/`, every other course's trees and defaults untouched). It must
not repeat the lollipop fault:
- a tall smooth grey trunk visible for the lower third, a few forked limbs;
- a crown built from 6 to 9 overlapping irregular lobes of different sizes,
  wider than tall, never one sphere or a stack of balls;
- summer green with light and dark variation, darker underneath, a leafy
  texture rather than flat colour;
- two or three size variants and random rotation; High and LOD within the
  course's tree budget; collisions as the existing trees.
Mix them with the firs in groups, mostly on the Kestrel and Forest Run
slopes. Claude judges them in the one final round 3 sheet with a close view.


## Actual street geometry check passed

The ONE admitted focused run on exact clean10ef2beb completed15October06:59:40.6542343UTC,exit0/13078.4472ms:2/2 existing suites(test-course-landmarks,test-circuit-ardennes),zero failures/notRun,jobs4. Source unchanged/clean,actual competing heavy roots empty. Original receipt/result under retained lane .evidence/2026-10-15/P4-ARDENNES/streets-10ef2beb. No repeat needed. Finalbeech source,complete nativeR3/actual art verdict,first course signature,nearby gate/build remain pending; no art/merge acceptance inferred. Keep existing lane frozen while the art-source question waits.


## Approved beech implementation source lease after Claude c20a150c

Claude has now explicitly approved an ORIGINAL procedural beech for Ardennes only; the earlier art-source wait is answered. Existing street source10ef is independently clear and2/2 focusedPASS; preserve it. Grant SOURCE ONLY in this retained lane: new tools/blender/ardennes-beech.py and tools/art/ardennes-beech.json; append ardennes-beech to existing src/track-kits.js loader roster; narrow src/vegetation.js and src/world.js opt-in forwarding; src/circuits/ardennes-forest.js descriptor; additive existing tools/test-track-kits.mjs,test-circuit-ardennes.mjs,test-blender-output.mjs and necessary existing vegetation/world suite; existing ardennes-views scenario/compositor; own note/CREDITS only original authorship text. Other real hooks stop for a precise amendment.

Recipe follows existing Ardennes metre/Y-up GLB pair export, pure --paths-only/selected-output/provenance safeguards, bounded original embedded leafy texture, stable original procedural geometry: lower-third smooth grey visible trunk/forkedlimbs,6–9irregular overlapping crownlobes widerthantall, not spheres/balls; varied summergreens/darkerunderside. One High/LOD pair, three deterministic scale variants, High<=684tri(the existing pine),LOD<=240, no new external source/dependency. Prepare runtime paths only public/assets/track-kits/ardennes-beech{,-lod}.glb following actual existingloaderpath; do not export/install during source preparation or change six current landmarks.

Select only a stable-ID subset of EXISTING course.features.trees in Kestrel/ForestRun groups. Keep every actual simulation tree ID/position/heading/collision/seed/random stream/count exact, no new trees. Existing prepared trackkit owner supports scenery:{kind:tree,id}, High/LOD160m, groundpivot/instance resources/late-load disposal; reuse it. Pine drawing omits ONLY opted-in selected rows and applies exact current tree fall/reset pose to their owned kitbinding. All other courses, absent descriptor, remainingpines/defaultmaterials/ground/fall behavior exact; no core/render3d/sim/terrain/registry changes. Meaningful existing tests cover defaults,selectedidentity/count/ground,fall/reset/disposal and roster/planner; oldassertionsexact. No signature write.

Prepare THIRD actual second-lap closeview Beech Grove/actual-beech-grove centred on an ACTUAL bound Kestrel group/crown with surrounding firs; preserve original22+2views/native stock/field/knownincident/readOnly/light/mist guards. No fabricated scene/car/view or finalR3JPEG/review. Freeze source for ONE independent review before any import/planner/test/export/render/native/gate/build. Source deadline07:45UTC, then note/move. Actual generated count/assetbudget/grounding/artremain measuredlater, not claimed from source. One finalR3 only, no fourth/sharedsnow-tree round.


## Exact existing world-suite prepared-owner amendment

Read-only source preflight finds existing test-world-composition buildEnvironment synchronous/default without preparedassets. For ONLY Ardennes, lease tools/test-world-composition.mjs preparedkitowner setup with installed GLTFLoader/currentheadlesstextureplugin following existing test-track-kits precedent, awaitcreateTrackKits thenpassowner. Keep originalsignaturepresenceguard/capturepath/othercoursebranches/21oldfixturebytes exact. No fixturebootstrap/dummyhash/capture/execution now. Existing test-track-kits Ardennes expected count may be authoredkitPlacements plus ACTUALbeechTreePlacements count; everyold/default/explicitplacementsoverridecount exact. No pinefallback/omittedbeech/fakecount accepted. Sourcefreeze/reviewstillrequired before actual assets/tests/native.


## Original beech source independently clear; planner admission

Independent reviewer /root/frame_setup_review read exactca47179cedfdbc0d17f39c764c89110daf4abd92 against10ef2beb and all fourteen granted files: CLEAR, no real fault. The review confirms default/other-course behavior, existing tree identities and race data, original fall/reset math, kit ownership/disposal, unchanged signature guards and original native view contracts. Exported budgets, leaf appearance, actual grounding and final art remain unproved.

Root admits one existing test-blender-output focused suite on clean ca471, jobs4, after fresh holds/capacity. It checks the actual pure planner before export. The circuit/kit suites that require actual new assets wait for the single reviewed beech pair export; no missing-file assertion is waived. No native, art round, world-signature capture, lane gate/build or merge begins from this planner admission.


## Registration passed; actual beech planner still needs its own check

The original ca471 test-blender-output run passed1/1 at07:26:51.9263515UTC,4186.9996ms,jobs4,source unchanged. Its native-generator registration checks the existing native test home, not this new recipe executable. Root corrects the earlier wording: the actual beech planner has NOT run yet, and no export pass is claimed.

Admit exactly the existing Node test named original beech planner names only its High/LOD pair and does not create files, using Node --test-name-pattern/--test-concurrency=4 in test-circuit-ardennes.mjs. This runs the real existing planner case before assets exist; other cases are explicitly skipped, not called passed. After that case passes, Root may admit one reviewed CPU4 selected beech pair export into only public/assets/models/circuits/kits/ardennes-beech{,-lod}.glb and tools/art/ardennes-beech.json. Existing six landmark bytes/hashes must verify before and after, no rewrite. Actual asset-dependent circuit/track-kit suites and first visual/signature checks still wait. No new harness or assertion change.


## Actual original beech pair exported; asset checks admitted

The existing native planner case passed once on ca471 at07:28:20.4318171UTC,700.0158ms. Then the ONE selected CPU4 export completed07:28:49.9193678UTC,exit0,756.1144ms. The six old landmarks stayed byte/hash exact. Actual beech High492tri/68232B/SHA7100974c0824a23e7e8f014ba33b4d7850ba42a727e705ed90d05094e2036221; LOD196tri/56976B/SHA25a310758f9c9e8906d6b68b6485c762f18001295e8b6b96ec6ece88b35a82e9. Pair125208B,actual visible trunk3.2m/height6.25m; no art verdict inferred.

Actual assets/provenance/note are frozen clean3185f91b9f4ff8461fc4c012d1feaf6eee6b6333. Reviewed ca471 code/tests/recipe are unchanged. Root admits ONE focused run of existing test-circuit-ardennes and test-track-kits,jobs4,after fresh holds/capacity. These now read real GLBs and measure actual placement,ground,fall/reset,resource and default contracts; no missing-file waiver. Do not repeat the export or earlier standalone planner. Native final-round pictures,Claude acceptance,first signature and final nearby/build still wait these checks and Root admission.


## Actual asset check failure: one new fixture ground assertion

Original job81857 on clean3185 completed07:32:35.5141545UTC,exit1,100006.5922ms,jobs4,source unchanged. test-track-kits passed(99936.0715ms); test-circuit-ardennes passed35/36 cases(13599.0226ms). Only the new bound-beech fixture fails at line943: rootY7.730397496511783 versus expected ground7.730397437346509, about5.9e-8m. Real exported budget/texture/provenance cases pass; no overall green or native/art admission.

Read-only review is checking whether the fixture BoxGeometry height5.9 translated2.95 has a tiny negative Float32 minimum, which the real kit anchor correctly compensates. If confirmed, the smallest proposed fix is an exactly representable synthetic height6/translation3, preserving every strict ground/fall assertion and all production code/assets. No changed tolerance, waived grounding, fake real-asset pass or retry yet. Original evidence stays under beech-assets-3185f91b. Investigate only until08:03UTC, then note and move on.


## Exact synthetic fixture repair approved after independent confirmation

Independent source review confirms the fixture fault: Float32 stores -2.95 slightly below its intended value before translation; the kit correctly seats its actual negative minimum. This is not a production grounding fault. Lease ONLY the new test fixture at tools/test-circuit-ardennes.mjs:928: BoxGeometry(.4,6,.4).translate(0,3,0), plus own note explaining the changed fixture. Binary-exact3 gives the intended zero base. Keep line943 strict equality, all fall/reset/default/real-asset assertions, production source and GLBs exact. Freeze for confirmation before rerunning only the affected circuit suite; do not repeat passing track-kits or export. Existing08:03UTC failure cutoff remains.


## Fixture repaired; final native packet admitted on current integration union

Root confirmed exactbaa151f0 changed only the independently approved synthetic height6/translation3 and note. Affected test-circuit-ardennes rerun57501 passed1/1 suite/all36cases at07:37:37.7568557UTC,12188.1503ms,jobs4,zero failures/notRun,source unchanged. Original passing track-kits and export were not repeated. The failure investigation is closed within its budget; no assertion or game limit changed.

Normal sync with current integration is conflict-free at688eb0946122f8a6ac9e09bdb6eb6b6418d830fc. Root verified all reviewed Ardennes runtime/scenario bytes unchanged; additive HELI roster/credits both preserved, current release landing included. Lane is clean. No post-merge gate was run.

After fresh holds/capacity, admit ONE existing ardennes-views native packet on exact688e,private autoport/memory-only. Expected28 real views: original22 plus three clear-second-lap close views per quality. Preserve original stock/field/readOnly/light/mist/knownincident guards and actual car-eye approach. Output only .evidence/2026-10-15/P4-ARDENNES/round3-688eb094, receipt native-688eb094. No repeated export, altered driver/scene/lighting, frame timing, signature, gate/build or art verdict yet. Root must inspect the three complete raw High pictures before ONE final R3 Claude submission. If native fails, keep the actual failure and stop for a bounded precise fix; do not silently waive it or submit a broken packet.


## Real final-picture faults found before submission

Original native85114 on clean688eb094 passed at07:41:18.6393889UTC,79113.6539ms,28 actual views,private/memory-only,issues[]/warnings[]. Root viewed all three High close pictures. Streets are legible. The bridge is end-on and does not show its arch/water clearly; beech leaves are flat bright colours and foreground firs hide the trunk. No final JPEG or Claude R3 review was created. Native success is not art acceptance.

Independent binary audit proves the leaf fault in BOTH GLBs: materials select default TEXCOORD_0, which is constant(0,1); authored varying coordinates are TEXCOORD_1. Crown layer Original leaves and cone layer UVMap become separate channels on join. High/LOD identity is correct, so neither lighting nor a wrong LOD is blamed. Lease the exact recipe layer name Original leaves to UVMap, matching cones, plus meaningful assertions in the existing actual-GLB test: decode each textured primitive material-selected UV channel and require finite, nonconstant coordinates for both leaf materials in both files. Preserve every old budget, image, geometry, physics and default assertion. No palette, silhouette, lighting or threshold guess.

The bridge camera targets the RIGHT stone row at s783.829647/lateral36/headingPI/2; Kestrel footbridge is s1557.588486. Lease ONLY Stone Bridge Stream close pose: eye at bridge.s-6,off bridge.lateral-18,actualground+5; aim at bridge.s/lateral,actualground+1.5. This gives a broadside view through the real arch. No bridge/stream geometry,world placement,light,vehicle or original view changes.

For Beech Grove only, choose an actual existing selected Kestrel beech at the road-facing edge (minimum absolute lateral, then distance to Kestrel midpoint and stableID), keeping all authored trees. Prepare a closer descriptor-derived roadside eye about12m toward the road from that tree, no along-road offset, aim at its actual bound centre/halfheight. Use actual ground and bound height, retaining the real full-tree/fir context, clear second-lap light/readOnly and High/LOD witnesses. This is one local inspection-camera correction, not a guaranteed visibility claim or a new visibility/culling/raycast framework. Actual new pictures must prove trunk/crown legibility; no hidden firs, fake car, lighting or LOD override.

Own only the existing beech recipe, actual-GLB test, existing scenario/compositor consistency and own note for source. Freeze and independent review before execution. Then Root may admit one existing UV regression case against OLD files (must expose the constant channel), ONE corrected pair export with unchanged triangles/geometry/images/six old landmarks, and affected suite once. No repeat of passing kit/default suites or formal art yet. One corrected existing native packet follows only after explicit Root admission. These are proven source/framing repairs within the final round, not a fourth round. Stop this fault investigation at08:12UTC if unresolved, record why and move on.


## Final round 3 rejected; stopped at the art cap, 15 October 01:13 PT

The actual tool-free image-only Claude review on clean bab7a9cb completed at 08:05:09 UTC, 22,835.4825 ms. Verdict: CHANGES REQUIRED. Scores: village/church 4, forest 2, road 4, bridges 3, cohesion 3. The village and road pass their picture requirements. The beech crowns remain faceted, striped plastic-looking blobs; the red-brown stream under the stone arch reads as a matte path, without a waterline or reflection.

This consumes the third and final art round. AGENTS stop rule applies: stop, record why and ask Kyle. Work is held for Kyle; the question has already been sent in this chat. No fourth round, finishing-pass workaround, signature capture, final gate/build or merge is authorized. Keep the existing unmerged lane and final sheet. The corrected mechanical/native checks are evidence, not art acceptance. Final image: p4-ardennes/docs/board/looks/ardennes-art/round-3.jpg, 412330 bytes, SHA-256 e768c45b8ee8f2eebf0eb2174fc6ddfcd41cd22796c07830c7049483dacf6333. Full verdict/receipt remain in that lane's .evidence/2026-10-15/P4-ARDENNES/claude-image-only-round3-bab7a9cb. Lane review note records the verdict; no game asset is installed on integration.

## Kyle decision, 15 October 2026: hold for a new art plan

Kyle answered the pending hold-or-drop question: **Hold for a new art plan.** Retain the existing unmerged `codex/p4-ardennes` lane at `e78733bc`, its source, final comparison sheet, review note and unresolved evidence. This attempt is not dropped and its rejected final round is not accepted.

The Kyle decision wait is answered. The card remains blocked while Claude prepares a new art plan addressing the beech crowns and stream. This decision does not authorize a fourth round, reset the three-round cap, approve a finishing workaround, or start edits, exports, captures, tests, signatures, gate/build or merge. Settle the new approach and its permitted scope before execution. The overnight continuation remains paused; no agent or automation is restarted by this record.

## Claude's new art plan, 15 October 2026 (Kyle: "hold for a new art plan")

Keep everything round 3 got right: the road, the village and church (4/5),
the firs, the mist, the bridges' shapes, the landmarks and the Long Left
barriers. Only two things change, each with a different method from the one
that failed. Two rounds at most for these two items (a fresh, smaller cap
granted by Kyle's decision); the rest of the course is frozen.

### 1. Trees: real leaves, not solid crowns

Building crowns out of solid shapes failed twice (lollipops, then faceted
striped blobs). The fix is the method games use for broadleaf trees:
- **Leaf cards.** Keep round 3's beech trunks and forked limbs (they passed).
  Replace each solid crown with 40 to 80 small crossed quads, alpha-cut, with
  a real leaf texture, clustered on the limb ends, so the silhouette is ragged
  and light shows through. Source: an ambientCG leaf set (CC0, no account;
  choose one with oval green leaves, e.g. from LeafSet013 to LeafSet030; check
  the licence on the asset page and record it). No solid lobe mesh anywhere.
- **Fewer, further back.** The Ardennes around Spa is mostly dark spruce with
  beech in patches. Use beeches in a few groups set back 25 m or more from the
  fences (Kestrel Straight's far slope, the Forest Run), with the accepted firs
  in front. Close to the track: firs only.
- **Fallback, no third method:** if the leaf-card beech is rejected in its
  first round, drop beech entirely and the forest is all fir. That matches the
  real place well enough and the firs already pass.

### 2. The stream: water, not a path

- Use the game's existing water surface (the one Harbour and Tremblant's lake
  use, with its reflection and glitter), laid in a channel cut 0.6 to 1 m into
  the ground under the stone arch, running about 40 m either side, red-brown
  tinted and darker at the edges.
- Wet banks: a darker, glossier strip of ground 1 m wide along each side, a few
  rocks at the waterline, reeds or grass tufts from the existing kits.
- The view: show the bridge from the side, from the downstream bank, so the arch
  and the water under it are both in frame (round 3 looked at it end-on).
- No new water system and no change to the road, the bridge model or physics.

### Checks and the sheet

One sheet per round: three close High views (the beech grove from the road,
the stream and arch from the bank, the stream from the car on the bridge) plus
the same three at Performance, and one wide Kestrel view to show the firs in
front and the beeches behind. Frame cost at the busiest view is checked when
the round is accepted (AGENTS rule 8). Then the usual lane tier, build, one
review, world signature capture and merge, and Claude's finishing pass
(P4-FINISH-ARDENNES).

## Art accepted and merged (Claude, 15 October)

Round 4 (Claude's lane, at Kyle's request) is accepted and merged: leaf-card
beeches from ambientCG LeafSet024 (CC0) set back behind the firs, and a
red-brown water stream with wet banks under the stone arch. Merge into
integration from claude/ardennes-art; codex/p4-ardennes is fully contained and
can be cleared. Ardennes stays dev. Left before Kyle's go-live:
1. the Long Left player crash in the stock replay (one known exception);
2. the frame check at the busiest view (the grid at Pit Straight) at both
   qualities;
3. Claude's finishing pass, P4-FINISH-ARDENNES;
4. the switch-on, the same way as Summit's (SUMMIT-SWITCH-ON).
Owner returns to Codex for 1, 2 and 4.


## Kyle follow-up scope, 15 October: driver, frames, switch-on preparation

Kyle keeps Ardennes switched off and authorizes three jobs: fix the remaining Long Left test-driver crash, run the frame-speed check, and prepare switch-on the same way as Summit. Current accepted art merge010c81ad and source15e28ca0 supersede the earlier art hold. Do not alter the accepted art, road, barriers, physics, seeds, published reference or released courses. Claude finishing/release and Kyle go-live remain separate.

Reuse the existing codex/p4-ardennes lane for this same card, fast-forwarding its clean contained head to current integration; no new lane or cleanup bypass. Root owns board/inbox/status. First bounded driver diagnosis: reproduce the original stock959/.95/1989/Medium/fieldSeed1000 full-field setup using existing App/Duel and observer hooks, retaining actual steering/brake/slip and opponent/target facts. Prove the minimal cause before editing. Own test-only tools/track-script-drive.mjs, existing tools/test-track-script.mjs and tools/test-circuit-ardennes.mjs, existing ardennes-views observer/acceptance only when removing the fixed exception, and own change note. No src/app.js/controller/simulation or course geometry edits. Existing no-opponent/default replay fingerprints and original guards remain; a fix requires the original full-field player to finish with zero crashes/resets, not a new exception or changed seed/skill. One independent code review and nearby/jobs4/build before merge. Stop a single investigation after30minutes with concrete facts if unresolved.

Frame preparation may reuse the existing frame-pacing scenario with an Ardennes Pit Straight selector named on this card before implementation: real native eight-car grid, actual accepted course, both qualities,120 delivered intervals, headed/visible/memory-only, p95<=18.5ms and world build<1000ms; first load>5s warning only. No extra art packet. Timing runs only after zero competing jobs, actual GPU quiet and panel-off confirmation, under an announced reservation. Do not claim timing from source or competing/headless runs.

Switch-on preparation is a separate written future slice while state remains dev. Name the exact Ardennes manifest/state pins/world-signature coverage and approved-art signature hook, preserve all other course baselines and save/menu order. No feature flip, release, live write or push is authorized here. Any required additional hook gets a precise card amendment first.

Switch-on preparation is now concrete on `docs/board/cards/ARDENNES-SWITCH-ON.md`: exact manifest/state pins, first actual Ardennes signature and all other baseline preservation, driver/frame/Claude finishing dependencies, no flag flip or new lane.

## Driver result and exact frame selector lease

The original full-field regression now passes with the relative passing-side fix: two focused cases PASS, actual full-field case60324.5981ms, total61438.8355ms. Original959/.95/Medium/1989/1000, all seven CPUs finished, player two laps/zero major or stage crashes/zero resets/no opening pile-up. Independent source review ardennes_driver_review is CLEAR on the initial four-file fix. The native scenario may now tighten acceptance to zero player crashes, removing the specific Long Left allowance; retain receipt consistency/index/restoration checks and explicit CPU incidents. No photo rerun is needed for the accepted art.

Exact frame-owned amendment: tools/scenarios/frame-pacing.mjs only adds an opt-in ARDENNES_FRAMES_ONLY selector reusing the existing headed native App/grid/120-RAF/world-construction measurement. Its default Harbour night path remains exact. Future Ardennes branch requires the actual dev QA flag, real eight-car Pit Straight grid, visible running App, memory-only storage, both qualities, declared idle screen-off and zero competing roots. Add meaningful packet/context negative cases in existing tools/test-circuit-ardennes.mjs; original frame validator/night tests unchanged. No full-check script, shared timing threshold, renderer, scene, art or physics edits. One independent review of final selector/guard changes and nearby/jobs4/build before merge. Kyle confirmed Second screen only/screen off and game idle in this chat. Actual GPU/process quiet and an announcement are still required immediately before timing.

## Bounded frame-readiness failure retention

First actual headed attempt on317cf717/private26212 timed out in Runtime.evaluate before any sample, issues[]/warnings[], reports[]. Cause unknown; no pacing or world-build verdict exists. The existing frame scenario has a60s scene-readiness promise inside the harness60s evaluate call, so the outer error can mask pending readiness. Within the already owned tools/scenarios/frame-pacing.mjs, retain one read-only actual App/course/status/visibility/dataset witness in the existing Ardennes failure catch before the harness closes, then rethrow the original error. No timeout, readiness requirement, renderer, scene, App or threshold changes; no new harness or capture framework. Review, nearby/jobs4 and build precede one changed-source diagnostic admission under a fresh quiet reservation; previous failed packet remains failed. End this setup investigation by11:49PT (30minutes after original failure) if unresolved.

## Bounded handoff, 15 October 11:45 PT

The Long Left fix and strict zero-crash native acceptance are ready in clean retained candidate `codex/p4-ardennes` at619db9ef, not merged. Original959/.95/Medium/1989/1000 full-field replay finishes two player laps with zero major/stage crashes or resets, all seven CPUs finished, no opening pile-up. Final independent review CLEAR, final nearby42/42/jobs4/zero failures-notRun807.60s, build1.25s passed. No src/, physics, accepted art, price, course order or state changed. Do not repeat those checks on unchanged source.

The actual headed private26212/memory-only frame attempt on317cf717 failed Runtime.evaluate timeout, reports[]/issues[]/warnings[]/no saved screenshots. No saved p95 or world-build result exists, and the failing phase/cause is unknown. Failure retention619db9ef is reviewed and gated, but its native diagnostic was NOT run: fire-finish browser root3940/parent45148 remained active at11:45:11PT. There was insufficient remaining time to safely admit a full attempt before the11:49PT investigation stop. No foreign job was stopped; queue reservation released early. Do not invent a readiness snapshot or count unrun timings as pass.

P4-ARDENNES is blocked by the remaining native frame check, tracked on QA-ARDENNES-FRAME-READINESS. Keep the existing unmerged lane, source and required evidence. Next authorized work period starts from the retained current candidate and actual quiet admission, without repeating the passed gate/build/review unless source changes. ARDENNES-SWITCH-ON is written preparation only. Claude finishing and Kyle's later go-live remain prerequisites; Ardennes stays dev. No release, push, live write, new lane or HELI cleanup retry.


## Kyle: skip the frame check, 15 October afternoon

Kyle said to skip this timing work because his multiple Codex and Claude Code sessions will remain active, and to record that decision and progress. No further quiet reservation, GPU polling or timing attempt for this work period. The frame check is SKIPPED at Kyle's direction, not a pass; no p95/world/load result exists and the old setup timeout cause remains unknown. Ardennes stays dev. The already green Long Left test-driver fix may proceed on its42/42 nearby/build/independent review evidence; switch-on remains written preparation, with no release/live install or flag flip.


Mechanical candidate619db9ef merged as 4495c042f116ecf02afbf9d7d5f3786667b11db2 after Kyle skipped timing. Existing final lane command node tools/run-tests.mjs --tier lane --changed --jobs4 --keep-going completed42/42/zero failures-unrun in807.60s (actual lane-final.log); production build1.25s (actual build-final.log), final independent frame_setup_review CLEAR. No repeated check after the conflict-free merge. Original959/.95/Medium/1989/1000 two-lap full-field player has zero crashes/resets and all CPUs finish. Frames SKIPPED, no timing result. Keep the pre-existing lane and its shared evidence junction; it was not created in this run, so no false cleanup receipt or folder deletion. Accepted art/current assets unchanged; Ardennes dev, finishing and actual switch-on/release remain separate.


## Finishing verdict requested for Kyle's explicit go-live

Kyle restarted and now says get Ardennes on while he is away about3hours. LongLeft4495c042 is merged; timing explicitly skipped by Kyle. Claude: please record P4-FINISH-ARDENNES' finishing verdict against the accepted current round4 art and authored notes here, or name its concrete remaining issue. No new art round, model/physics rewrite or timing is requested. Codex prepares the narrow switch/state tests in a separate lane meanwhile; this is not an invented art acceptance or automatic finishing pass.


## Root finishing handoff: three proved fixes, no switch in this patch

Current Root source adf28269 contains the three Codex findings as8source/test files only beyond cb658b70: road-surface/test-road-surface; pit-lane/landscape-detail/test-pit-lane/test-landscape-cells; scenarios/track-review/test-track-review. Independent ardennes_release_review CLEAR on all runtime/tool changes55952005; last adf fixture-only dev admission confirmation pending. Damp: actual25m periodicmask/defaultshaderbytepins GREEN. Grass: exactly5realArdennes roots removed, every survivor exact, other3pitcourse controls0, old no-pit hashes exact. Reviewrunup: old retained jumpY43.98m above newly placed road; same94native steps nowallgrounded/maxheight0/no crashes with same endpoint106.0329mph. No gamephysics/geometry/price/flag changes in these8files.

Concrete patch: C:/Users/kyleb/.codex/worktrees/wasteland-integration/ardennes-switch-on/.evidence/2026-10-15/ARDENNES-SWITCH-ON/finishing-code.patch (git diff cb658b70..adf28269 restricted to those8files). It EXCLUDES the switch, world/replay fixtures and metadata. The new native review unit now uses/restores the real dev definition when absent, so it works before release.

To avoid a finishing/switch dependency cycle: Claude may consume these exact reviewed8files in the current finish-ardennes lane for ONE combined native picture/gate/build and finishing verdict while its manifest stays dev, OR commit the actual visual source first so Root combines and captures it. Root will not copy mutable foreign source, invent the final art verdict or wait for a final verdict before preparing this union. Please freeze the actual visualsource rather than waiting for the switch-on merge; that merge itself waits for this finishing acceptance. No newlane, duplicate fullpacket, frame timing, signature waiver or livewrite. Any actual changed scene is reviewed before first baseline is recaptured.


Root combined snapshot is now frozen545158d0 in its OWN ardennes-switch-on lane: only your2file currentvisualdiff was read with matching before/afterSHA witnesses and applied aspatch, preserving Rooton/admissioncases. Foreign finish-ardennes files remain untouched. Root selected manifest/safety/asphalt-grip cases PASS3/3; mechanical source review requested, actual combined nativeHigh queued undercap. This supersedes waiting for your first sourcecommit and prepares one coherent picture candidate. Please judge that combined nativepacket when posted; no finalartacceptance or liveinstall is presumed. Source hash witnesses and exactdiff are retained on Rootcard/evidence.

## Combined final High packet: Claude visual verdict requested

Exact545158d0 completed the existing ardennes-views High recipe in83807.1125ms: passedtrue/issues[]/warnings[], all16pictures, real native8car/two-lap field, player0crashes/stageCrashes/resets, all7CPUs finished, no openingpileup. Actual laps147.268/139.408s. This is no frame-timing result and no Performance rerun claim. The private harness has exited normally.

Packet directory: C:/Users/kyleb/.codex/worktrees/wasteland-integration/ardennes-switch-on/.evidence/2026-10-15/ARDENNES-SWITCH-ON/combined-high. Reports report.json and ardennes-views.json. Please judge ardennes-the-wall-high-first-lap.png (25m road fade into Kestrel), ardennes-pit-straight-high-clear-second-lap.png (pavement/paddock), ardennes-riverside-high-first-lap.png (your softer mist), plus the retained other13native views as needed. Root inspected those3actual pictures; Riverside still has a visible pale mist polygon in the hollow, so its acceptance is yours, not inferred from the mechanical pass. All final source is the stable two-file visualsnapshot plus the reviewed3Rootfixes, not your earlier uncorrected views-r2 source. No extra art round or full-packet retake requested.

Please record the actual finishing verdict here against this exact combinedpacket, or the one concrete remaining issue. A reviewed actual visual difference is required before Root writes only Ardennes' scene baseline. Source review CLEAR and all othercourse pins retained; final gate/build/release remain pending. No live change.

## Pit-tone fix reviewed; final visual-source choice needed

Root aaf4b526 implements the actual-material sharing hook. New exact geometry/paint/feature and legacy-material case RED on the old material then GREEN1/1 in4839.229ms. Same independent ardennes_release_review confirms mechanical CLEAR: actual live damp uniform sharing and deduplicated disposal, old snow/default courses unchanged. Current final suite plan is206suites (list-only, no execution). No scene fixture updated.

Claude: your current finish-ardennes final source has restored wetRoad:{performanceShare:.5} and its original assertion, whereas the stable79db8eaf snapshot you earlier authored removed it. Current course SHA fcd9cd63d54a7a433694b46202c1eaeccd57395b9eb86273737477587068fdb1 / test1841b4f9a0e2ed5f68d7395562409781d5fce1cf328dda1e5d3acde5b2b19ffd. Root will preserve on-state/real ownership tests but needs your intended final wetRoad choice before its last changed-material photograph/baseline. Please freeze/commit the actual final visual source and state this choice with the verdict; Root will not chase an experimental toggle or assume the old snapshot is your final pick. Your current views-final is observed, not duplicated. Root's prepared final pit recipe uses only the original native grid/brake/LaFontaine frames via existing track-review; old headless trace is explicitly historical framing, not a new lap/pace measurement. No new scenario/harness/assertion tolerance.


## Current finishing handoff supersedes the older source questions

Wet-road choice is resolved from Claude's written note: retain the original wetRoad. The candidate also has the intended six flags and unchanged accepted trees. Root independently reviewed the corrected material picture: the blue-grey overlap is gone. Exact final source is 55d2b7de; build passed, independent code review CLEAR, final lane is in its last world/tool suites. Only Ardennes's actual scene row changed; all foreign rows/files remain exact.

The final visual verdict now belongs on ARDENNES-SWITCH-ON, whose existing question names the combined High packet and the valid corrected grid/hairpin pictures. Its waiting_on field now makes that outstanding answer explicit. This is not another source-choice question or art round. Keep the invalid middle braking picture excluded. No timing retry, native packet retake, live installation or art acceptance is claimed.
