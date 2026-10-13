# DEEP-ART-SRC

The short board entry controls current state, ownership, dependencies and locks.
These are the card's detailed design, acceptance and recorded decisions.

```yaml
  - id: DEEP-ART-SRC
    title: "The Deep creatures and set sources"
    owner: codex
    lane: ART
    size: L
    needs: []
    status: ready
    flag: the-deep
    owns: [public/assets/models/deep/, docs/board/looks/deep-art/, docs/changes/DEEP-ART-SRC.md]
    hooks: [tools/art/catalog.json, public/assets/models/CREDITS.md]
    acceptance:
      - "The 14 creatures of THE_DEEP 10.1 plus wreck hull, giant clam, anchor and sunken boat, CC0 first, credited; round sheets judged by Claude, at most three rounds; no frame check (rule 9)."
```

## Claude answers

Round one question (Codex, 12 October 2026): please judge the source donors and one bounded next step. Actual sheet: C:/Users/kyleb/.codex/worktrees/wasteland-integration/deep-art-src/docs/board/looks/deep-art/round-1.jpg (353,078 bytes; SHA256 ac0cd047a3c423ae824bd047d6ee0450acd6c828051373e0daae0ca2cd75a198). Full source table, licenses, exact triangle/clip counts and limitations are in round-1-review.md beside it, frozen20abd6f7. These are original donor previews, not fitted game art. Fifteen verified downloaded meshes remain in the external library; no runtime model was installed. Moray, grouper and giant clam have true CC0 leads but their mesh downloads require authentication and returned401. The available otter is a river species: approve a specified sea-otter fitting pass or hold that role. Several colours, poses, rigs and the cargo hull breach/interior need fitting. No wrong species or unfinished asset is accepted.

Ordinary source review is clear on this honest packet/catalog scope: legacy catalog data remains exact, source attribution and unavailable mesh fields are explicit. Formal art choice is yours, round one of at most three; the card remains incomplete. Existing art-sourcing and build pass, but canonical26-suite lane includes actual Blender relief rendering and waits intact for night. No filtered green lane or merge clearance is claimed. The selector omission is recorded on QA-LANE-NATIVE-RELIEF; this card is not held for an unbounded tool investigation.

**Claude verdict, round 1 of 3 (12 October 2026, 21:40).**

The donor silhouettes are the right natural look. Every fitting pass below keeps the game's gritty look (muted colours, wear and weathering), never toy-like.

**Approved as donors, with the fit for round 2:**
- **silver-school:** silver-blue paint, instanced.
- **reef-fish:** reef palette, blue body with a yellow tail.
- **turtle:** olive-brown shell and greens, with a slow flipper stroke.
- **ray:** flatten it into a resting pose on the sand.
- **manta:** keep its swim clip.
- **sea-lion:** a glide pose with a simple procedural body wave.
- **crab:** muted red-brown, with a side scuttle.
- **reef-shark:** blacktip reef shark, grey with black fin tips.
- **jellyfish:** restrained translucent pink and a faint glow.
- **whale:** keep its swim clip.
- **octopus:** mottled red-brown, arms curled.
- **anchor:** aged, rusted metal, at true scale.

**Otter: yes.** Adapt the river otter into a sea otter:
- back-floating pose, with paws on its chest;
- dark brown with a paler head;
- a flatter tail.

**Wreck hull and sunken boat: approved only as shapes.** As donors they read toy-like. Strip the coloured containers; add the hull breach and open hold, rust, algae and broken rails, in muted colours. If round 2 still looks toy-like, replace them.

**Moray, grouper, giant clam (blocked downloads):** do not wait. For round 2:
- grouper: refit the approved reef-fish donor into a deep-bodied, big-mouthed, mottled brown grouper;
- giant clam and moray: build each by a Blender script from simple shapes (a scalloped wavy shell; a tapered body with a continuous fin), coloured from the CC0 scan previews as reference only.

If Kyle later downloads the three CC0 scans with his own account, they may replace these after reduction. That is optional, not a blocker.

The next step is one fitted round-2 sheet of all 18 roles, rendered in the look-test water. No frame check. waiting_on is cleared.
