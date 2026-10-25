# LAB-FAN-VIEW scenario sheet

`round-1.jpg`: REVERSE at the tunnel dial, the accepted pinned Project Fan
blueprint with its three facts, and the built Spéirling with stationary
scales at 3,000 kg. Captured at 1440 × 900 in the real Lab room, High,
private headless browser, memory-only saves. This is a scenario sheet,
not a new asset art round or a frame-timing result.

Look verdict: the room toggle has readable cream text on dark steel with a
gold edge. The blueprint is fully visible between wall columns. The finished
car is visible through the tunnel's existing glass. No asset was changed.
The side-panel REVERSE control also works without graphics. The QA control
overlay is hidden by scenario-only CSS.

Behavior verdict: four lessons leave no trace; five reveal REVERSE. The
switch is saved, the scales jump, and Project Fan appears. Fan power raises
the scales before motion. One build debits exactly 15,000; a second does
not debit or duplicate the car. Reload preserves ownership and credits.
The car can be selected in the garage and player menu. It starts at
Tremblant Woods and needs air transport to race elsewhere.

Recipe: `node tools/browser-harness.mjs scenario lab-fan-view --output-dir
.evidence/2026-10-25/LAB-FAN-VIEW/fan`, then the following Python from the
repository root. Requires the existing Pillow installation. No crops,
retouching or generated substitutes: each source frame is kept whole.

```python
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
folder = Path('.evidence/2026-10-25/LAB-FAN-VIEW/fan')
out = Path('docs/board/looks/lab-fan-view/round-1.jpg')
frames = [('secret', 'REVERSE on the tunnel dial'),
          ('blueprint', 'Project Fan: the pinned sheet and true story'),
          ('finished-car', 'Built: stationary scales at 3,000 kg')]
sheet = Image.new('RGB', (1440, 2880), (16, 23, 23))
draw = ImageDraw.Draw(sheet)
font = ImageFont.truetype('arial.ttf', 28)
for i, (name, label) in enumerate(frames):
    draw.text((24, i * 960 + 16), label, fill=(243, 226, 191), font=font)
    with Image.open(folder / (name + '.png')) as frame:
        sheet.paste(frame.convert('RGB'), (0, i * 960 + 60))
for quality in range(88, 30, -4):
    sheet.save(out, 'JPEG', quality=quality, optimize=True)
    if out.stat().st_size <= 500000:
        break
assert out.stat().st_size <= 500000
```
