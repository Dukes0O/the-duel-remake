# Muddy Hollow mud surface (EGG-03 art, Kyle's Surface A pick).
# Source: Poly Haven Brown Mud 02 by Rob Tuytel, CC0, 1K diffuse map kept in
# the art library. The game loads one re-encoded colour map; the normal and
# roughness maps stay in the library.
#   python tools/art/muddy-hollow-mud.py
from pathlib import Path
from PIL import Image

SOURCE = Path(r"C:\Users\kyleb\dev\art-library\polyhaven-brown-mud-02\1k\brown_mud_02_diff_1k.jpg")
OUT = Path(__file__).resolve().parents[2] / "public" / "assets" / "textures" / "muddy-hollow-mud.jpg"

image = Image.open(SOURCE).convert("RGB")
image.save(OUT, "JPEG", quality=84, optimize=True, progressive=True)
print("wrote", OUT, OUT.stat().st_size, "bytes")
