# TOWN-ART-MACHINES-1 | Round 1

**Builder's self-review; Claude's verdict is pending.** The family reads as industrial equipment, with dark steel, worn yellow-green paint, visible rust, rubber tires and track pads. The sheet compares each photo crop with rest and working poses in bright diffuse daylight.

| Area | Score / 10 | Note |
| --- | ---: | --- |
| Silhouette and scale | 6 | All four types read, though the cab and track proportions are simplified. |
| Surface and wear | 8 | The chipped paint and rust are specific and sharp; the load and rubber are quieter. |
| Joint and work-pose readability | 7 | Named pivots are present and nested; the tipper and blade poses could be more distinct. |
| Above and driver-seat readability | 6 | The three-quarter views show the roof, cab and working tool, but some camera angles differ from the photos. |
| Overall | 7 | Gritty and recognizably mechanical; the repeated track shoes remain the most stylized detail. |

The model uses one embedded 1K atlas. Its GLB was 1,960,024 bytes in the private QA output; each machine is capped at 15,000 triangles by the readback check. It is not wired into the game, so the candidate model is intentionally left out of the commit.

## Image prompts

**Machine reference photo:** “Use case: photorealistic-natural. Asset type: photographic modeling reference for four full-size Wasteland construction machines in a scrapyard. Scene: a real, dusty salvage yard in bright plain overcast daylight, no cinematic color grade. Show four separate machines with clear silhouettes and realistic proportions: a low agricultural tractor converted into a chain trencher with a long lowered rear chain boom and side dirt chute; a tracked excavator with a narrow cab, boom, arm and bucket; a heavy six-wheel dump truck with a deep hinged steel tipper bed and a mound of earth; and a tracked dozer with a broad curved welded blade. Build them from repurposed industrial steel, aircraft landing gear hydraulic rams, used tires and track plates, with mismatched faded yellow and dark green paint, rust streaks, scraped bare edges, grease and dust. Slight front three-quarter view, all machines large and fully visible, separated enough to study, true industrial machine scale, documentary photograph, natural diffuse daylight. No logos, no readable text, no people, no toy-like shapes, no pristine surfaces, no dramatic lighting.”

**Steel atlas texture:** “Use case: photorealistic-natural. Asset type: square seamless albedo texture for a real-time 3D construction-machine model. Straight-on macro photograph of old industrial steel sheet with faded ochre construction yellow paint and dark olive repair patches over deep reddish brown rust, irregular chipped paint exposing sharp steel edges, vertical water streaks, oily grime and small rivets; multiple scales of wear, clear material separation, gritty and realistic. Uniform flat diffuse daylight, no cast shadows, no directional highlights, no perspective, no recognizable object, no logos, no text, no border. The material should tile on all four edges and read as heavy painted welded steel, not a blurry noise texture.”
