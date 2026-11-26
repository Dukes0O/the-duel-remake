# OPEN-DOORS-2 · Tin Town shed interiors

Odessa’s shed has a horned anvil on a stump, tools and offcuts, chained bottles, a loaded rack, a canvas cot and a hooded coal hearth over scale-strewn ground.
Moss has water buckets, brushes, a coiled hose and a grated drain. Light falls at each threshold and the forge glows and sparks.
The indoor HUD suppresses the RPG and idle field-wrench prompts. The existing room camera, collision, service payments and memory-only repair/wash checks carry through.
**Removed** the first-round furniture and flat interior treatment. Claude replaces the round-one sheet after capturing round two.
**Checks** on Node 22.23.5 at `97d85a435` passed core (804), replays (306), combat replays (12), world composition (65), open doors, combat HUD, browser scenario registration and `npm run build`.
At `3c915e798`, after hiding the QA panel, open doors, open shared and all three guards passed. All scenario page expressions parse. A memory-only rehearsal entered and left both dark rooms with the RPG and both staff at their sleep posts.
**Changed assertions** extended the forge-only prop lookup to require geometry in both rooms, with the original prop names still checked. Added light, switch and prompt checks. Replay baselines are untouched.
**For Claude to run** the memory-only `open-forge-shed` scenario and the merged build. Review its four labeled frames and replace `docs/board/looks/open-doors/round-1.jpg` with the generated `round-2.jpg`.
The cloud did not render or inspect the four views. Rule 23 applies under the player-off `story-choices` switch.
