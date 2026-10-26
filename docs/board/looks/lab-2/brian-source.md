# Brian: workshop teacher

LAB-LIFT-2, round 2. Brian uses the adult male anatomy from Quaternius's
**Universal Base Characters [Standard]**, CC0. The local source is the same
licensed art library used by `tools/blender/rescue-people.py`; no source
archive or texture is copied into the game.

`tools/blender/lab-brian.py` builds his own blue work shirt, rolled sleeves,
dark trousers, brown work boots, and canvas workshop apron. The apron has
neck straps, edge seams, a chest pocket and a sharpened pencil. His eyes
have small irises, visible whites and brows; his short beard follows the
cheeks and jaw. Close-cropped hair follows the source scalp instead of the
old cap-shaped dome. Thin open safety-glasses frames hold clear lenses
above his brow (transmission 1, alpha 0.23, IOR 1.46). His relaxed open hand
points towards the machine. He has adult proportions and no weapon or armour.

The recipe shares the existing rescue people's importer, anatomy posing,
and mesh helpers. It exports only `public/assets/models/lab/brian.glb`:
7,960 triangles, 261,916 bytes. Metres, ground origin, glTF +Y up and +Z
forward. Optional review renders use four CPU threads and 32 samples.

Review images: `.evidence/2026-10-26/LAB-LIFT-2/round-2/brian/` (front,
back, side and a face/apron portrait). The portrait makes the clear lenses,
eyes, beard and pencil visible for review. A surface-mesh defect found in
the first round-2 render was corrected before the final captures: the beard
now uses the original facial surface, and the apron has welded smooth seams.
The trousers use 200 fewer triangles to keep the complete figure below 8,000.
All four current captures show the exported runtime mesh. No Blender project
or source copy is retained.
