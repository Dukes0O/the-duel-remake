# GFX-03-P1

The short board entry controls current state, ownership, dependencies and locks.
These are the card's detailed design, acceptance and recorded decisions.

```yaml
  - id: GFX-03-P1
    title: "Armor kits with distinct fitted steel plates"
    priority: 16
    lane: VIS
    size: M
    needs: [GFX-03]
    status: backlog
    owns: [tools/blender/armor-kits.py, public/assets/models/wasteland/kits/, docs/board/looks/kits/]
    hooks: [tools/blender/kit-review.py, tools/blender/kit-sheet.py, tools/audit-armor-kit-fit.mjs, tools/test-armor-kit-assets.mjs, tools/test-armor-kit-fit.mjs, tools/scenarios/armor-kit-visuals.mjs]
    helpers: [test_author, reviewer, art_critic, browser_qa]
    note: "Round8 scores likeness3/readability4/grounding4/consistency3/frame4. Replace the continuous mottled wrap with distinct fitted steel plates and stronger edge wear at game distance. Settle the geometry trade in writing before code; preserve named breakable parts and resource ownership."
    acceptance:
      - "Reach all art scores of four, prove all nine cars and three tiers in game, and keep the four-car whole-scene cost within ten percent. Keep wheels, lamps and glass clear and existing purchases unchanged."
```
