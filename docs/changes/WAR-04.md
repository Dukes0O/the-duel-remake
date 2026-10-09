# WAR-04: Story cards, wanted posters and Vesper

Status: building. Direction settled before implementation on 9 October 2026.

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

Independent native tests failed before implementation and now pass all seven
cases. Feature controls pass 58 checks. Actual High story pictures include all
eight fitted cars, native Tanker and earned Vesper; wall rendering preserves the
profile and race byte-for-byte. Final High/Performance scenario and gates remain
pending on the whole CREW integration merge.

Source review closed Unicode/import, earned selection and late kit disposal
findings. Deferred disposal now creates zero late roots or turret requests.
Director also granted only the existing Armory crew-context option. Its native
fixture now selects earned Vesper and does not mislabel Rook. No assertion was
weakened; the new flag catalog row is additive. Native decoy timing is checked
at 3 seconds minus the application tick, then at expiry.

Approved Vesper recipe and fit inputs are unchanged. Installed GLB is 2,387,328
bytes, SHA-256 29a3873ae936dcd80ca6593d46537ce77cccda206a645e8948c06ea89a9a4f46.

## Removed

No superseded runtime output exists yet. The build recipe keeps only the
installed Vesper binary; private regenerable fitting output stays in QA scratch.
