# WAR-04: Story cards, wanted posters and Vesper

Status: source frozen for lane/build. Direction settled before code on 9 October 2026.

## Approach

- Add story cards through the existing atomic named-player warlord settlement,
  only on a first win with the new dev switch active. Keep older and unrelated
  cards additive; opening the wall never writes rewards or saves. Existing saved
  defeats (both supported shapes) also produce earned views without backfill.
- The yard wall shows each earned warlord's name, three short story lines and
  their actual fitted fight car. Tollkeeper uses the installed armored tanker.
  Every warlord victory shows the player's actual fight car, crew and recorded
  wreck, hit and time totals on a results poster.
- One screen-owned Three.js renderer loads and caches real models, renders
  bounded static pictures and disposes its models, textures and GPU resources
  when its screen is replaced. It only reads snapshots; it never steps a race.
- Keep the eight ordinary CREW entries, order and CPU seeded choices exact.
  An earned-only metadata helper admits Vesper after this player's saved Baron
  defeat, while warlord-cards and the existing crew-gear admission are active.
- Build Vesper with the approved fitting recipe and settings unchanged in a
  fresh private output folder, then install the resulting GLB for its caller.
  Reuse the existing mechanic first-person hands and approved gear presentation.
- Shock Charge is unlimited on a 13.5 s Vesper cooldown (18 s base minus her
  25% perk), with a 0.4 s warning and an 8 m pulse. Reuse Tesla's exact star,
  disabled, Scrap Magnet and decoy behavior and existing smaller Tesla cues.
  No car weapon recharge changes. Production keeps the new dev switch off.
- Director granted only the game import and two existing crew admissions,
  preserving ordinary identities and checking both switches and discovery.

## Checks

Meaningful native red cases preceded implementation. All eight acceptance cases
pass, including a later real audio failure: Shock event admission passed but
_playCue rejected the existing Tesla bank flag. The narrow crewShock exception
now admits only those two cues with cards, gear and discovery; normal Tesla
still requires wave three. Protected bank, catalog, files and snapshots are exact.
Existing wave-three audio passes 41 checks; feature controls pass 58.

Whole CREW dc2e145b merged without conflicts. Shared CPU controls pass 66 native
cases/323 assertions, rocket contacts 94, Gunn 24 cases/279 checks. Ordinary
162 and combat 12 replay fingerprints are unchanged.

Native memory-only browser passes High and Performance on private port 31362:
14 pictures, zero warnings/errors. All eight fitted story cars include the real
armored Tanker; earned Vesper selection, approved on-foot rig and winning poster
work. Wall rendering preserves profile and race byte-for-byte. Actual poster
has three wrecks, 20 native hits and 1:12.0; it uses frozen fight paint/kit. Shock
uses 13.5 s cooldown and existing smaller cues at .55, at .408333/.808333 s.

Frames source review cleared import/Unicode, earned selection and late disposal
findings; deferred disposal leaves zero late roots/turret requests. Save Guardian
cleared 247 checks over seven old save shapes, atomic/failure/retry controls and
secret selection. Reviewed save/crew source is unchanged after that verdict.
Director granted only the existing Armory crew-context option; native earned
Vesper selected, Rook unselected. No assertion weakened; flag row is additive.
Decoy timing checks 3 seconds minus the native application tick, then expiry.

Approved Vesper recipe and fit inputs are unchanged: 21 original art cases,
102061 checks pass. Installed GLB is 2,387,328 bytes, SHA-256
29a3873ae936dcd80ca6593d46537ce77cccda206a645e8948c06ea89a9a4f46.
First frozen lane gate stopped at the existing completion-screen fixture
(63 passed, one failed, 298 not run, 91.23 s): its minimal App has no switch
method. Results now default absent switch admission to off; the same untouched
fixture passes. Lane/build rerun remains pending on the corrected source.

## Removed

No superseded runtime output exists. The build recipe keeps only the
installed Vesper binary; private regenerable fitting output stays in QA scratch.
