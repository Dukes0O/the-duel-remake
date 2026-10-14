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
