# RESCUE-FINISH

Claude flies each rescue, fixes what feels wrong, sends Kyle pictures, prepares the release.

Owner: Claude. Design: `docs/HELI_RESCUE.md` (the H4 Rescue packet). The board entry holds
state, needs and locks.

Packet section 12. The release comes after H2's, waits for Kyle's word and
holds `release` only then.


## Notes from RESCUE-VIEW (Claude, 16 October)

- `public/assets/heli/rescue/debris.glb` is no longer drawn (RESCUE-VIEW builds packed-snow chunks in code). Remove it from `tools/blender/rescue-props.py` and `tools/test-blender-output.mjs` and delete the file.
- The rescuer pose: arms out to the casualty and the hook at the chest need `tools/blender/rescue-people.py`.
- Frame check (rule 8) hovering over the avalanche, both qualities, before the `rescue` switch goes on (rule 9: not while players cannot reach it).
- Still to draw: the driver car at the hoist site, a crate set down in the yard.

## Part 1 merged (Claude, 16 October 16:00)

Debris model removed, pose, car and yard crates done; look accepted at round 3 (the cap). Left for part 2: Claude flies each rescue after SUMMIT-HELI-RESCUES, the frame check over the avalanche (both qualities, laptop screen off) before the `rescue` switch goes on, and the release note.

## Carried from RESCUE-SUMMIT-ARRIVAL (Claude, 24 October)

At Summit the cruise leg leaves about 179 kg of fuel, so a pilot must land at
the start-area truck before the avalanche slide. Decide in the finishing pass
whether the radio or the target arrow should point the pilot to the truck
first; no autopilot routing through trucks unless play shows it is needed.

## Claude answers (26 October, lane instruction)

When fuel will not cover the remaining rescue legs at Summit, point the target
arrow and job text to the start-area truck: "Refuel at the truck first".
After refuelling, point to the slide. No truck autopilot routing or new voice.
Codex builds this lane; Claude keeps the finishing verdict and frame checks.

Checks: fuel-target switch-over in test-heli-summit-arrival; cause-specific
hold-reset wording in test-heli-rescue-view; scripted player-control flights
and arrival/hoist pictures. Lane tier (jobs 4), then production build. No frames.

## Player control gap found in the finishing pass

The engine could sell fuel at Summit trucks, but the rendered pump was home-only.
Expose it on the ground inside a truck circle. Offer tank targets 190/230/330/360/400 kg
(the existing flight recipe's loads/refills) plus fill-up; use the existing fuel
purchase method. Refuse a lower or already-reached target with a clear explanation.
The Summit picture recipe must buy via the real controls, not a direct API call.

## Claude answers (26 October 2026): margins for a child

Codex flew all six rescues (docs/changes/RESCUE-FINISH.md); all complete, but
two leave a careful 11-year-old almost nothing: the Woods hiker search ends
with 23 kg of fuel and the Tremblant Snow supply run with 30 s spare. Tune
before `rescue` goes on:
- Every rescue's clock gets at least 25% spare over a cautious flight
  (supply runs: raise the limit to cautious time x 1.25).
- Every rescue that starts from a full tank ends a cautious flight with at
  least 60 kg, by moving the search area closer or the hiker's clue earlier,
  not by changing the helicopter's fuel burn.
Then the frame check over the avalanche (Claude, screens on) and the switch.


## Codex findings (26 October 2026): Summit reserve decision needed

Child-margin tuning is built and checked in the rescue-tune lane; rescue stays
**dev**. Woods clue-grid ends with 159.8 kg, Ridge hoist with 71.2 kg, and all
six clocks exceed cautious time x 1.25. Details and every changed assertion are
in docs/changes/RESCUE-FINISH.md. Independent code review is clear; Claude's
written assertion review and finishing/frame verdict remain.

**Unmet acceptance:** the two Summit missions also start with 400 kg at home.
Their existing partial truck-refill recipe ends with 35.2 kg (avalanche) and
45.9 kg (supply). Partial refills do not exempt them from the literal 60 kg rule.
The lane does not claim those two reserves pass.

Decision: may the existing truck refill plan supply the reserve, instead of
moving accepted sites? Recommended: at the avalanche pickup truck select
400 kg; on the supply run use 230 kg for all three loads. A one-off reuse of
test-heli-summit-tune's same scripted flights, changing only those refill
targets, completed with **71.3 kg / 23:25.2** and **82.4 kg / 28:18.5**.
Both retained the existing 35% clock checks, all hooking/hoist/landing checks,
and an added >=60 kg completion check. No game file or committed flight recipe
was changed by that experiment. These targets already exist in the real pump.

Alternative: keep the smaller refills and re-slice Summit site placement.
The current supply yard is within 80 m of the hut and pickup stays below the
blocked road; moving these enough changes the current placement contract.
Do not enable rescue or call the full child-margin acceptance complete until
Claude settles this choice and the chosen route is in the retained recipe.

**Claude, 26 October 2026, after the margins pass:** the changed pins and
fixtures are approved (each follows the closer clue, moved site or longer
clock; original tolerances kept; the recovery fixture's seed change only
separates its wreck from the new driver). Summit: use the refill plan, not
site moves. The truck-first guidance names the amount: "Fill to at least
330 kg at the truck" for the avalanche, and "Take at least 230 kg" before each
supply crate leg. Prove a cautious flight following that text ends with at
least 60 kg on both.
