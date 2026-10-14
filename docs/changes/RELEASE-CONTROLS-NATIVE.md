# RELEASE-CONTROLS-NATIVE

## Settled recipe before code

This recipe completes only the two merged controls fixes. Production source stays unchanged. It uses the existing private browser harness, isolated memory storage and High quality, with one actual 1920x1080 and 2560x1440 layout packet. Controlled Harbour/Woods positions exercise the real HUD and renderer using actual authored corner/brake-board coordinates; these are controlled native views, not driven laps. The C key exercises all four real camera choices. No frame measurement runs.

The one Harbour lap uses the actual .95 racing-line targets, stock F42, zero upgrades, casual/medium, seed1989, one CPU,60FPS and1200s cap. Before every actual Duel.step, a target-only call to the unchanged line controller chooses actual keyboard events: W when throttle>=.5,S when brake>0, Left/Right when absolute target steer>=.05, otherwise release both. Actual App._applyInput supplies the keyboard ramp; autopilot remains false and the pad is neutral. No analog input drives a physics step. Stop at one completed lap; retain the native four-lap race target. Report all crashes/resets and the unchanged post-eight-second below3mph maximum-stuck requirement<1s. These thresholds cannot be fitted after failure.

Stock comparison already ran once on integration c22f32a8: complete trace SHA256 03fe1c98cac48b54df5bce6d1bf9d19dc8588f331d5149eaaf946309eabc6bfe equals the prior actual trace, including gameover and146.314s flying lap. This is unchanged behavior, not stock lap acceptance. Evidence is integration .evidence/2026-10-13/RELEASE-CONTROLS/stock-harbour.

## Removed

No production path, asset, save, assertion or native acceptance requirement is replaced. The recipe owns its specific acceptance packet only. Scratch QA bundles are recycled by the existing harness.

## Actual native fault and exact repair before code

Original b4a00a85 native packet drained exit1, zero browser warnings/errors. Its Harbour keyboard lap passed at90.258333s: one observed lap against unchanged native four-lap target,11192 physics/input steps, zero crashes/boundary/checkpoint resets and maximum stuck0s. Never repeat this accepted lap. Four native layouts and C cycles passed their requested sizes:1080 map432/384.031, mirror576x180, warning110;1440 map576/512.031, mirror768x240, warning146.656. Actual pictures exposed the relocated race clock overlapping sound/camera/pause utility controls; these pictures are not green readability evidence.

Director8798e492 authorizes only .in-race .race-clock top30px to70px, leaving its actual80.7969px height between utility bottom62px and position top160px. Recipe strengthens clock/utility/position overlap observations. QA-only MENU QA and Performance samples details must use display:none because existing details CSS overrides hidden; actual game details stay intact.

The56 warning-comparison failures came from using raw authored decimal brake/apex coordinates, while the closed course publishes normalized coordinates. Normalize those authored coordinates before samples and oracle; keep every250/150/100/50/brake/apex requirement exact, with no tolerance or input fitting. Corrected DUEL_CONTROLS_UI_ONLY=1 packet records keyboard:null and notRepeated:true with an explicit reference to the original accepted b4 packet. It makes no new lap claim. Recapture only the four required native screen cases, then one original unfiltered nearby/build. No physics, source driver, save, rear-view budget or harness changes.

Director also grants four actual camera photographs in the existing first Harbour1080 C cycle, after350ms of real renderer settling. No extra cycle, lap or frame timing is added.

The corrected b7ef9882 UI-only packet drained exit0 with all480 warning observations and four layouts/C cycles green, zero browser issues/warnings. Its pictures still show QA panels: preparation hid them before menu-check completed its asynchronous panel append. Director a120cd78 grants only reapplying the same exact-summary display:none immediately before layout/capture, asserting both debug panels hidden. All game controls remain visible. This final four-case UI-only rerun is for unobscured native pictures and the same checks; no photo mode, lap/stock repeat, production change or threshold adjustment.
