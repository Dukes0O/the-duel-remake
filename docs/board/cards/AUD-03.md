# AUD-03

The short board entry controls current state, ownership, dependencies and locks.
These are the card's detailed design, acceptance and recorded decisions.

```yaml
  - id: AUD-03
    title: "Full-race sound mix and listening review"
    lane: ART
    size: S
    needs: [AUD-01, AUD-02, BAL-02]
    status: backlog
    helpers: [audio_qa, reviewer]
    acceptance:
      - "Record a private memory-only race with current vehicle, foot and raider cues. Compare the heard mix with actual events; record missing, masked or clipped cues and fix or re-slice proven findings."
    note: "Residual listening work from AUD-01, AUD-02 and TOOL-02. Existing cue and waveform work remains merged; this card has no active branch."
```
