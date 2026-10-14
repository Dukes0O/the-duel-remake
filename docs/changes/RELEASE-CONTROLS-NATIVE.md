# RELEASE-CONTROLS-NATIVE

## Settled recipe before code

This recipe completes only the two merged controls fixes. Production source stays unchanged. It uses the existing private browser harness, isolated memory storage and High quality, with one actual 1920x1080 and 2560x1440 layout packet. Controlled Harbour/Woods positions exercise the real HUD and renderer using actual authored corner/brake-board coordinates; these are controlled native views, not driven laps. The C key exercises all four real camera choices. No frame measurement runs.

The one Harbour lap uses the actual .95 racing-line targets, stock F42, zero upgrades, casual/medium, seed1989, one CPU,60FPS and1200s cap. Before every actual Duel.step, a target-only call to the unchanged line controller chooses actual keyboard events: W when throttle>=.5,S when brake>0, Left/Right when absolute target steer>=.05, otherwise release both. Actual App._applyInput supplies the keyboard ramp; autopilot remains false and the pad is neutral. No analog input drives a physics step. Stop at one completed lap; retain the native four-lap race target. Report all crashes/resets and the unchanged post-eight-second below3mph maximum-stuck requirement<1s. These thresholds cannot be fitted after failure.

Stock comparison already ran once on integration c22f32a8: complete trace SHA256 03fe1c98cac48b54df5bce6d1bf9d19dc8588f331d5149eaaf946309eabc6bfe equals the prior actual trace, including gameover and146.314s flying lap. This is unchanged behavior, not stock lap acceptance. Evidence is integration .evidence/2026-10-13/RELEASE-CONTROLS/stock-harbour.

## Removed

No production path, asset, save, assertion or native acceptance requirement is replaced. The recipe owns its specific acceptance packet only. Scratch QA bundles are recycled by the existing harness.
