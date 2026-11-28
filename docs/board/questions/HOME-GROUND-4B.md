# HOME-GROUND-4B implementation choices

- The card does not name how a piece on the bed is saved. Options: a second cargo list, or `position: 'bed'` in `loot`. Pick: keep one list; ground positions are `{x, z, yaw}`. Worth and kind stay with the piece across outings.
- The card gives carters only `{began}`. Options: add a separate manifest, or reserve all loot while they work. Pick: reserve all loot, including any on the bed, until their one-hour job brings every piece home. Later raid loot joins that collection. Manual loading and delivery wait until they finish.
- Building bundles and loot share the flatbed. Pick: one building bundle or up to three loot pieces, so the existing bundle cannot overlap the loot load.
- Use the crew's supplied clock and monotonic `lastSeen`, with `began: null` when idle. The carters' receipt stays on this outing's news board; the scrap total persists.

These details implement the settled design without changing its values, save backup gate or released behaviour. Claude reviews them with the card.
