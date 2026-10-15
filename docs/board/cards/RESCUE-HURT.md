# RESCUE-HURT

People can get hurt: the casualty's condition, pay by condition, and the new radio lines.

Owner: Claude (SIM). Design: `docs/HELI_RESCUE.md` (the H4 Rescue packet). The board entry holds
state, needs and locks.

Kyle, 15 October 2026. Packet sections 4.1 and 8. Files: `src/heli/heli-rescue.js`
(condition steps replace the flat 300-credit bump cut; pay by condition;
the stretcher thresholds for H3), `src/heli/heli-radio-lines.js` (re-record
`rescue.bump` and `rescue.late`; new `rescue.hurt`, `rescue.badly`,
`rescue.cold`, `supply.late`, through `tools/audio/elevenlabs.mjs`; the list is in packet section 4.1,
and moves into section 8's table in the same change),
`tools/test-heli-rescue.mjs`. The failure charge and the tally drop (section
4.2) belong to RESCUE-ENGINE and RESCUE-SAVE (`condition` replaces `bumps`
in the saved rescue). Changed assertions are listed in its change note.
