# RAID-02 — raider knockdowns and ledge salvage

## Behavior

- In flagged Wasteland combat, the player's on-foot RPG can directly hit a raider or hurt nearby raiders with its blast. A direct hit knocks down a full-health raider. Raiders recover at their camp after three race seconds and cannot shoot while down.
- A raider grants one player-owned knockdown and one 25-XP Notoriety event per race, even if the same raider recovers and is hit again. Raider bolts still never grant player credit.
- Each seeded ambush camp has one raised, solid salvage ledge beyond the road. Cars and fighters collide with the rock; a fighter can collect the crate from beside it. A crate gives up to one RPG rocket and 15 car armor, once per stage. A full-ammo, full-armor fighter leaves the crate for later.
- Three instanced meshes show all crates and ledges. Collected crates disappear. Ordinary and flag-off races create no raiders, crates or ledge colliders. Course route samples and saved course feature data are unchanged.

## Checks

- `node --test tools/test-raiders.mjs tools/test-onfoot-weapons.mjs`: 11/11 focused checks passed. They cover all 11 combat courses, a solid car-blocking ledge, direct and splash RPG damage, one award per raider, foot-only one-time collection, and flag-off identity. Existing assertions were not weakened.
- Deterministic placement sample: all 99 crates appeared across three seeds and 11 combat courses.
- `npm run build`: passed.
- `node tools/browser-harness.mjs scenario raider-salvage`: passed in a private memory-only browser. Three pooled crates were visible, with zero browser warnings or errors. The screenshot was reviewed after raising the marker onto its rock ledge.

## Limits

- Raiders stand and shoot from the existing fixed camp positions. Their recovery uses the current race step; detailed raider movement and cover are later work.
- Salvage restores race resources, not saved credits. It only helps when ammo or armor has room.
- Frame pacing, broad regression, and combat balance were not measured in this bounded lane check. Integration and release gates own those checks.
