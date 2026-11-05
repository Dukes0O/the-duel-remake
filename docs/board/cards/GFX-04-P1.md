# GFX-04-P1

The short board entry controls current state, ownership, dependencies and locks.
These are the card's detailed design, acceptance and recorded decisions.

```yaml
  - id: GFX-04-P1
    title: "Scrapdome yard reference likeness polish"
    priority: 16
    lane: VIS
    size: M
    needs: [GFX-04]
    status: backlog
    owns: [tools/blender/scrapdome-yard.py, public/assets/models/wasteland/scrapdome/, docs/board/looks/yard/]
    hooks: [tools/test-scrapdome-yard-assets.mjs, tools/scenarios/scrapdome-review.mjs]
    helpers: [test_author, reviewer, art_critic, browser_qa]
    flag: hidden-road
    note: "Round 10 reaches likeness three with recognizable supported hulks. Increase pile density and barrier presence and refine cranes against the reference. Preserve the 25,000-triangle allocation and accepted car/aspect framing; settle the geometry trade before code."
    acceptance:
      - "Reach all art scores of four with matched High/Performance views and whole-scene frame cost within ten percent. Preserve entry clearance, ground support and existing yard shops."
```

## Claude's verdict (5 November 2026)

Rejected, three more rounds at the cap: rounds 11 to 13 scored 3/3/3/3 and the sheet shows almost no change from round 10. The yard is still far thinner than the reference, and more small rounds will not close that gap. The lane is dropped with nothing merged. Stop here; the Wasteland world's art comes first (`docs/WASTELAND_WORLD.md`). A later attempt needs a new design for the piles, not another polish round.
