# TOWN-RESERVED-OUTPOSTS

Left by TOWN-OUTPOST-SCENE (merged 19 November 2026). The neighbours' outposts now stand in the Scablands (Dot's Diner, Miss Quill's
school, Old Tam's hut, Deck Town, the Rail Halt; `src/town/content/outposts-world.js`), but the town region's reserved shapes do not cover
them, so a player could one day plan a building on Dot's porch. Add each outpost's footprint, with a margin, to the town's reserved ground
in `src/town/town-world.js`, so planning refuses it with a plain sentence that says whose place it is. A test plans a building on each
outpost and is refused; a town saved before this card loads unchanged.
