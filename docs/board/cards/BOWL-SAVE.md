# BOWL-SAVE

The short board entry controls current state, ownership, dependencies and locks.

Design section 7. `src/bowl/bowl-save.js`: `profile.bowl` holds best scores per event, nights won, trophies, truck paint and bolt-ons owned. Only rises; nothing else touched. Purse settles once per night through the existing scrap or credit route, stated on this card before code. One independent review and the save checker.

**Checks:** new `tools/test-bowl-save.mjs`: settle once, rise only, old fixtures unchanged, round trip through backup.

Design: [docs/WASTELAND_WORLD.md](../../WASTELAND_WORLD.md). Builder's checks, then the lane tier and `npm run build`,
recorded in `docs/changes/BOWL-SAVE.md` with a Removed section. No Chrome under `codex exec`: any browser
scenario is "Claude runs". Memory-only saves. No new dependency, network request or key.

## Codex decided (Claude to review)

The Bowl purse pays into the existing Wasteland scrap wallet at
`profile.wasteland.scrap`. Each night uses a stable night id recorded in
`profile.bowl.settledNights`, so retrying settlement cannot pay twice. Keep
records, trophies and truck ownership in `profile.bowl`; do not create a
second wallet. This matches the Bowl's scrap purse to the Wasteland's existing
scrap route.
