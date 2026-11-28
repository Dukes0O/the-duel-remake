# Raid bike, round 2

The bike now reads as a worn small trail bike: open spoked wheels, thin round frame tubes, a narrow dented tank,
separate cylinder fins, long forks, curved mismatched mudguards, taped saddle and a wired-on jerrycan.
The mounted Rat leans towards the bars, with hands and boots fitted to the grips and pegs. The lamp-carrying figure
was the source of round 1's tall lamp; bikes now use the existing lookout figure. Buggy and crate geometry is unchanged.

Reference: the [1972 Suzuki TC90 listing photograph](https://www.justbikes.com.au/motorcycles-for-sale/1972-suzuki-tc90-road/JBW5193623),
cropped from the already committed round-1 sheet. A 50-pixel grid established wheel centres, radii, tank and saddle.
The final sheet is 382,519 bytes. It replaces the working sheet after successive shape, finish and rider-fit refinements.

Still different: the crankcase casting and cable fittings are simpler than the photograph; the saddle has less
folded leather, and the existing Rat's long coat hides the rear frame and some seat contact. Fine wear and engine
detail disappear at 20 m. The dark wreck remains identifiable by its two wheels, tank, saddle and bent silhouette.
Builder scores: silhouette 4/5, materials/detail 3.5/5, wear 4/5, distant readability 4/5, grounding 4/5.
These are builder observations; Claude owns the art verdict. Frame cost was not timed, as instructed.

Eight actual Chrome captures, port 5198, isolated profile and memory-only storage, with no browser errors.
The stand imports `createHomeRaidersLook` and the real GLTF figure loader, and waits for the figure group's
`userData.ready` after each cast change. It sets the rule-ground offset to zero over a neutral ground plane.
Renderer: 1000 x 750, 45-degree perspective, ACES exposure 1, hemisphere intensity 2, sun 2.6 at (-3,6,4).
Photo-side camera (-3,1.65,-.32), target (0,.61,0); ridden (-3,1.8,-.6), target (0,.82,0);
wreck (-3,2,-.6), target (-.35,.35,0); reverse (2.8,1.6,1.3), target (0,.65,0).
Far camera (-19.6,2.8,-3.5), target (0,.65,0); far panels are native-pixel crops, not enlarged.
Close detail camera (-1.2,.85,.6), target (0,.53,.25); opposite rider camera (2.8,1.8,1.3), target (0,.9,0).
Bike alone: 5 draws, 11,810 triangles; loaded rider adds one draw. No new runtime binary or dependency.
Repeated frozen frames had zero joint-quaternion drift and left input JSON unchanged. Two bikes at one position,
heading 0 and pi/2, retained their own rider offsets and bike fittings. Independent code review confirmed the fix.
Reviewed source blob: `925165bfb5cd817bd4a6cbf56e7bf9e2fe592cea`.
