# P4-FINISH-PANORAMA

The short board entry controls current state, ownership, dependencies and locks.
These are the card's detailed design, acceptance and recorded decisions.

```yaml
  - id: P4-FINISH-PANORAMA
    title: "Claude's finishing pass: Panorama Ridge"
    owner: claude
    lane: DESIGN
    size: M
    needs: [P4-PANORAMA, P4-REVIEW-TOOL]
    status: ready
    acceptance:
      - "docs/CIRCUITS.md section 11: review with the tool, tune src/circuits/panorama-ridge.js directly, small Codex cards for code needs, postcard sheet to Kyle."
    carried_from_panorama: "Kyle closed P4-PANORAMA on 12 October. Carried here: move the Skyline inspection camera at least 15 m clear of the radio mast on the valley side, take the final-lap dusk frames from a native run (the night run on integration may supply them), build round-3.jpg (500 KB at most) beside docs/board/looks/p4-panorama/round-3-review.md and remove the round-2 files. Framing and evidence only, no new art round."
```
