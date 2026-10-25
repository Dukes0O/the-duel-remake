# P4-FINISH-TEAMROOM

The short board entry controls current state, ownership, dependencies and locks.
These are the card's detailed design, acceptance and recorded decisions.

```yaml
  - id: P4-FINISH-TEAMROOM
    title: "Claude's finishing pass: the Team Room"
    owner: claude
    lane: DESIGN
    size: M
    needs: [P4-INTEL-LEVELS]
    status: ready
    acceptance:
      - "Claude reviews the Team Room look and words, writes the engineer notes for every circuit, picks the flag spots and snapshot framing, and sends Kyle a postcard of the dossier."
```

## Claude answers - finishing pass verdict, 16 October 00:20

Accepted and merged. Engineer notes now cover all 16 older courses; crest flags
that only repeat a nearby corner or the signature view are folded; map names
and flags no longer cover each other. Changed assertion reviewed: "Every crest
has a selectable flag" now accepts a crest flag or the signature view on the
crest, with a new fold test for the folded and kept crests; nothing else is
loosened. Rally stages keep their many open-road crest flags (real features of
those roads). The three reverse variants get notes under
TEAMROOM-VARIANT-NOTES before they switch on.
