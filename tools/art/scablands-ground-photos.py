# The Scablands' photographed ground (SCABLANDS-LAND, "Kyle on realism", step 2; switch `scablands-realism`).
# Sources: six Poly Haven surfaces, CC0, the 1K colour and relief (OpenGL normal) maps, kept in the art library
# (authors and checksums in tools/art/catalog.json; credits in public/assets/textures/CREDITS.md). The game loads
# a re-encoded colour map and relief map for each; nothing else of a set is used.
#   python tools/art/scablands-ground-photos.py
from pathlib import Path
from PIL import Image

LIBRARY = Path(r"C:\Users\kyleb\dev\art-library")
OUT = Path(__file__).resolve().parents[2] / "public" / "assets" / "textures"
# Poly Haven's name for the surface, and the game's name for the ground it is laid on.
GROUNDS = {
    "dry_ground_rocks": "scablands-hardpan",
    "dark_rock_02": "scablands-scab-rock",
    "mud_cracked_dry_03": "scablands-salt-crust",
    "sand_03": "scablands-sand-ripples",
    "ganges_river_pebbles": "scablands-river-pebbles",
    "gravel_road": "scablands-gravel-road",
}

total = 0
for source, name in GROUNDS.items():
    folder = LIBRARY / ("polyhaven-" + source.replace("_", "-")) / "1k"
    for kind, suffix, quality in (("diff", "colour", 84), ("nor_gl", "relief", 90)):
        image = Image.open(folder / f"{source}_{kind}_1k.jpg").convert("RGB")
        target = OUT / f"{name}-{suffix}.jpg"
        # Relief is saved without colour subsampling: its red and green are slopes, not colour.
        image.save(target, "JPEG", quality=quality, optimize=True, subsampling=0 if kind == "nor_gl" else 2)
        total += target.stat().st_size
        print("wrote", target.name, target.stat().st_size, "bytes")
print("total", total, "bytes")
