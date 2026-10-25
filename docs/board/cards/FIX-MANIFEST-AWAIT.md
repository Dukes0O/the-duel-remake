# FIX-MANIFEST-AWAIT

The short board entry controls current state, ownership, dependencies and locks.

Claude, 25 October. Two browser scenarios (ardennes-views and its three
sisters, then the yeti) hung for the same reason, and each got a workaround in
its own scenario file: `src/circuit-manifests.js` ends in a top-level `await`,
and `combat-weapons.js` and `arsenal/oil.js` import each other. In a bundle
where both meet, each module waits for the other forever. The real game loads
only because of its import order.

**Settled design:** remove the cause in game code. Make the circuit manifest
list load without a top-level `await` (or move the awaited part behind an
explicit `ready()` the app already calls before using it), and break the
`combat-weapons.js` / `arsenal/oil.js` cycle by moving the shared piece both
need into its own small module. Then delete both scenario workarounds
(QA-ARDENNES-FRAME-READINESS's in `tools/scenarios/p4-panorama.mjs` and
QA-YETI-THREE's in `tools/scenarios/yeti.mjs`); replace means remove.

Test first: a Node check that imports the game's entry modules in the order
that hung and finishes. Replays, world signatures and combat balance unchanged.
The four Ardennes-sister scenarios and the yeti scenario run on the laptop
after merge.
