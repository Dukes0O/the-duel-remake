# KOGANE-PASS-C5

Status: blocked source handoff, not ready to merge. Kind: landmark, water and sound.
Flag: kogane-pass (dev). No art round was rendered.

## Changes

The crater lake uses the existing basin system for its shore, visible water and
helicopter scoop surface. Its torii stands on the shallow near bank to the right
of Lakeside Start. Original Blender recipes build the large torii, small shrine
gate, stone lanterns and parking apron, each with a LOD partner. The summit uses
C4's tea house, vending row and lantern string. The parking terrace and dry
helicopter clearing use existing hill pads. Collision walls and the road are
unchanged.

Kogane references Tremblant's existing burnt assets in burnt-look.js. Its forest
joins the existing fire eligibility list. The fire destination check uses the
pilot map, and heli-session.js checks the actual destination options before
loading an owned course for fire calls. That one-line session hook is needed
to keep Kogane out when the pilot map is off. Fire messages use the pilot place
name. No save field or pay number changes.

The pilot place is at (22, 2), east of the harbour, altitude 1,300 m. Its
forest, volcano and lake regions follow its dev switch. Only the parent course
is listed now. C7 adds the variants when their files exist. The pilot outline
builder retains a hidden Kogane outline for preview; existing outlines stay
exact. The map position is a C5 implementation choice for Claude to review.

The sound source recipe mixes verified CC0 Japanese park cicadas, brook and
forest into an evening loop, then night crickets, brook and forest into a
night loop. Static gain matches the forest reference at authored gain .14.
A one-second circular overlap joins each loop. The existing CC0 bell is
slowed and filtered for the shrine strike. These recipes have not run yet.
The course selects its bed through its existing audio environment. The light
path fades cicadas into night crickets from dusk to night. Bell identity uses
the course instance, since the game reuses its race-state object between races.

## Checks and review

Early geometry probe: dry 12 m landing circle at s 0, lateral 30; 1,085 forest
cells; 210 eligible fire starts; lake inside the flying area; torii feet about
0.55 m under water. These are source probes, not a finished browser verdict.

Independent reviewer found two faults: the expected kit tail missed the four
appended ids, and the apron exceeded its level terrace. Both are fixed and
confirmed. The revised apron corner height differences stay below 0.30 m,
inside the existing 0.45 m placement threshold. Reviewer also confirmed map
switch isolation and the actual-destination filter. No heavy checks were run
by the reviewer. Audio review found the reused-state bell bug; the fix and
test now use a fresh course with the same state object. Reviewer confirmed
the fix, source checks, circular seam math and dusk blending. Sound character,
species and the packet's faint frog layer still need Claude's listening verdict.
The current recipe has no separate frog recording.

Syntax checks passed for 15 original changed JavaScript files and two Python
recipes, then for the changed audio renderer, audio recipe and audio test.
git diff --check passed. Source probes are not gate passes. The lane plan
selected 97 suites before the audio changes. All 20 prior pilot outlines and
file metadata match HEAD exactly; independent review confirmed this.

The shared heavy-job limit prevented every export and gate. Read-only process
checks repeatedly found two other jobs. The final exporter waited another
12 minutes and ended at its bounded limit without running Blender. Stop under
the 30-minute tool-problem rule. No other job was stopped. Not run: Blender
export, audio export and loudness/seam measurements, the Kogane course test,
drive-through, browser look, lane tier, and npm run build. No comparison sheet
or scratchpad copy exists. No frame measurement was started. This branch
must not merge until these tasks finish.

Resume with the committed recipes, the existing private memory-only browser
harness at jobs 1, and lane tier jobs 2. Use Vite's supported config loader
runner option for lane builds to avoid writing config caches through the
shared node_modules link. Re-fetch only the three catalogued source ids into
lane scratch or the authorized sound library before running build-kogane.mjs.

## Audio sourcing

The existing local library has the forest reference and a single CC0 bell,
but lacks the needed cicada and night-cricket recordings. The source candidates
are CC0 Freesound recordings 670520 (Japanese park cicadas), 734642 (mountain
night crickets with river) and 584269 (small brook). All three downloaded and
their source hashes and licence metadata are in the catalog. The cicada source does not prove
the exact higurashi species, so Claude's sound judgement is still needed.

Automatic approval review rejected the source download on 28 October because
it interpreted the project's network and API-key rule as covering asset
preparation. The requested command uses the existing Freesound tool and
configured key, downloads only into this lane's scratch folder, and adds no
runtime requests, account or key. Approval was requested in chat. Further
inspection found SPEC 0.9 explicitly authorizes Freesound API source downloads,
one at a time with the existing environment key. Automatic review allowed
the same command on reconsideration with that evidence, and all three sources
downloaded. No alternate route was used. No approval remains needed for this
download. Keys were never printed or written.

## Changed assertions

The track-kit count grows from 46 to 50 by appending torii, torii-small,
stone-lantern and kogane-car-park. Its exact tail check adds the same four ids;
all previous ids and order stay pinned. The course placement whitelist adds
only these ids. The measured-model check adds their triangle and byte caps.
The fire-art list adds Kogane while retaining Tremblant. The pilot outline
check adds only the hidden Kogane preview outline. No tolerance changes.
The placement check allows the exact C5 sheet filename requested in the brief;
the existing 500 KB sheet limit remains unchanged.

New checks cover water outside the road, shallow grounded torii, a dry level
landing circle, lake inside the flying area, connected fire starts, hidden
map/fire state with the switch off, and actual fire eligibility with it on.
Claude's written assertion review is pending.
The fire-view suite adds actual shared-asset loading and crown restoration.
The audio suite adds evening/night selection, a constant gain blend, paused
silence, a single bell across revisits, a new race using the same state,
and delivered loudness within 1 dB of the forest reference. No previous audio
assertion changes.

## Removed

No original or superseded runtime asset was removed. New models reuse C4's
existing recipe helpers by approach, without replacing its models. No blend
file, duplicate burnt set or backup asset is retained. Owned source downloads,
probe, plan and launch helpers are recycled after recording these results.
No evidence folder, comparison sheet or Claude scratchpad file was created.
