# Big Bess in the Story Wall

The large image in `round-2.jpg` is an original generated illustration for the vehicle register. The two pictures below show the earlier side reference and the actual playable mesh under offline study lighting. The illustration has convincing tyre contact, separated layers of dust and sky, and warm openings in the settlement. It gives a parked reader time to see the tank seams, treads and layers of worn paint.

Its model is approximate. The illustrated cab is taller, the tyres are larger and the spare, ladder, guard and fittings move or change. An illustration can carry a story moment while the real mesh supplies the true vehicle in the cab and approach views. The gates and wheels still need geometry, changing reflections and readable contact when driving or walking around them.

## The HTML treatment

Open `tools/art/wasteland-direction/plate.html` from this checkout. Its three labelled views use crops of the retained review sheets. The register title, captions, vehicle measurements and controls remain HTML text. The radio group supports native keyboard selection and shows a focus ring. It works locally using the two JPEGs, local fonts and CSS. The study build also writes a standalone `big-bess.html` beside the raw renders.

Each radio selection was typeset from the HTML with WeasyPrint. Each produced a single page and exposed the matching caption. The illustration and gate proofs were visually checked. An independent art reviewer checked the vehicle silhouette and caption, the three radio labels and their crop coordinates. Claude still needs to exercise Tab and the arrow keys in a browser and check readability at the laptop's actual viewport. The HTML and art live in the study folders.

## Source and recipe

Codex's image tool made the original 1,672 × 941 illustration on 18 November. Its inputs were the game's credited `big-bess-side.jpg` and the draft offline view of the south gate. The existing photos and the trial art are original to this project. The generated still serves only the HTML study. The retained sheet stores the selected image. A fresh drawing from the prompt will vary.

> One original wide 16:9 cinematic editorial still for an HTML Story Wall in an original driving game. Depict the actual invented vehicle in the first reference, Big Bess, a six-wheel gas hauler. Match the split-windscreen cab, blunt radiator, ochre and bone paint with pitted rust, three axles, tandem rear, slim stack, cylinder gas tank, riveted straps and valve wheel. Low front-three-quarter, full tires planted in dusty wheel impressions. It arrives at Tin Town's gate from the second reference: an old rectangular frame with stacked drum posts, a horizontal truss, tin corrugated walls and three little work lights. Late amber light coming out of the gate against a storm-blue dusk, gritty road, softly layered industrial settlement. Original photorealistic reportage of the vehicle in this location with intricate close worn surfaces, convincing shadows, dusty windows and depth. Precise weight and ground contact, strong legible silhouette. No typographic overlays, no margins, no graphic layout, no logos. The sign may read TIN TOWN. Direction illustration for narrative menus; assume the vehicle pictured is the identity to preserve.

To assemble a new illustrated comparison, place the selected image at `$out/story-illustration.png`, render the source cab as described in round 1, then run `sheets.py` with `--round 2`. A normal study build can reuse the retained round 2 JPEG. Try the illustration treatment on one Story Wall entry first and let Kyle judge its tone beside the in-game shot.
