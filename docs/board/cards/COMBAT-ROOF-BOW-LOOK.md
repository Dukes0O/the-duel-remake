# COMBAT-ROOF-BOW-LOOK

Found by the overnight QA on 19 November 2026: the roof crossbow drawn on the player's car whenever the combat rig is on
(`src/combat-scene.js` around lines 499 and 707; group `combat-bow-0`, parent `vehicle-socket-roof`) reads as a flat cream wedge and a
black bar floating over the roof or windscreen: the bolt is an unlit `ConeGeometry(.35, .8, 5)` in cream and the rail a 3 m dark cylinder.
In some views it covers the windscreen. Draw it as a crossbow a player recognises, lit like the car, sized to the car, and never in front
of the windscreen from the chase camera. Gritty, never toy-like. Also: the town road drawn near-black from cab height (`Town road *`,
756b59), seen when the truck hood camera was on.
