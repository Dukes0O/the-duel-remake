# P4-FINISH-HARBOUR

The short board entry controls current state, ownership, dependencies and locks.
These are the card's detailed design, acceptance and recorded decisions.

```yaml
  - id: P4-FINISH-HARBOUR
    title: "Claude's finishing pass: Harbour Lights"
    owner: claude
    lane: DESIGN
    size: M
    needs: [P4-HARBOUR, P4-REVIEW-TOOL]
    status: ready
    acceptance:
      - "docs/CIRCUITS.md section 11 for Harbour Lights."
```

## Claude answers

Claude, 12 October 2026, first look (review tool and drive-through on integration):

- **Holds on FIX-LIVE-EDGES first.** Floating walls, a road gap at s 2059,
  walls that collide 0.7 m inside the drawn edge, and a 2:26 test-driver lap
  (design 1:34) with stops at Casino Corner and Lantern Hairpin. Tuning the
  look over broken edges would be wasted; the pass resumes when that card
  merges.
- **Look so far:** lighting 3, road readability 3.5, grounding 3, consistency
  3.5. The street race between walls, the lanterns over Lantern Hairpin and
  the LANTERN sign read well. Missing from 5.2: the wet-look road (it is matte
  black) and most of the neon. The car goes airborne at 143 mph on the
  Lantern Hairpin braking point (s 1765); look at the crest there in the pass.
