"""Build RESCUE-FINISH's evidence sheet from actual browser captures, no art generation."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import argparse
import io

parser = argparse.ArgumentParser()
parser.add_argument('--evidence', type=Path, required=True)
args = parser.parse_args()
shots = [
    ('browser/hiker-flare.png', 'Hiker: arrival and orange flare'),
    ('browser/hiker-clearing.png', 'Hiker: clearing (cabin pickup; no hoist)'),
    ('browser/avalanche-slide.png', 'Snow: arrival at the slide'),
    ('browser/avalanche-dig.png', 'Snow: rescuer digging at the beacon'),
    ('browser/hoist-approach.png', 'Ridge: arrival beside the slope'),
    ('browser/hoist-hold.png', 'Ridge: rescuer at the driver'),
    ('browser/supply-crates.png', 'Snow supply: crates at home'),
    ('browser/supply-carry.png', 'Snow supply: first crate on the line'),
    ('browser/supply-yard.png', 'Snow supply: crate set down at the lodge'),
    ('summit/summit-arrival-truck.png', 'Summit: truck guidance on arrival'),
    ('summit/summit-truck-controls.png', 'Summit truck: partial tank controls'),
    ('summit/summit-avalanche-arrival.png', 'Summit: arrival over the slide'),
    ('summit/summit-avalanche-pair.png', 'Summit: skier clipped to the line'),
    ('summit/summit-supply-arrival.png', 'Summit supply: pickup and fuel truck'),
    ('summit/summit-supply-hook.png', 'Summit supply: first crate hooked'),
    ('yard/summit-supply-yard-arrival.png', 'Summit supply: arrival at the hut yard'),
]
width, height, columns = 560, 315, 3
sheet = Image.new('RGB', (width*columns, 48+((len(shots)+columns-1)//columns)*(height+28)), '#14191a')
draw = ImageDraw.Draw(sheet)
font = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 18)
draw.text((14, 12), 'RESCUE-FINISH | Scripted controls | High | Memory-only | No frame timing', font=font, fill='white')
for i, (path, label) in enumerate(shots):
    with Image.open(args.evidence/path) as image:
        tile = image.convert('RGB').resize((width-8, height), Image.Resampling.LANCZOS)
    left, top = (i%columns)*width+4, 48+(i//columns)*(height+28)
    sheet.paste(tile, (left, top))
    draw.text((left+3, top+height+3), label, font=font, fill='white')
for quality in (82, 72, 62, 52, 42, 32):
    data=io.BytesIO()
    sheet.save(data, format='JPEG', quality=quality, optimize=True)
    if data.tell() <= 500_000:
        break
else:
    raise RuntimeError('Sheet exceeds 500 KB')
target = Path(__file__).resolve().parents[2]/'docs/board/looks/heli-rescue-finish/round-1.jpg'
target.parent.mkdir(parents=True, exist_ok=True)
target.write_bytes(data.getvalue())
print(f'{target}: {data.tell()} bytes')
