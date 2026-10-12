# AUD-03: Full-race sound mix and listening review

Current scope, acceptance, decisions and retained evidence from the prior board.
The short entry in board.yaml controls status, owner, dependencies and locks.

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
