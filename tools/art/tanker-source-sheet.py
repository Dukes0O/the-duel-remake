"""Lay out unchanged native source renders; no rig fitting or runtime image output."""

import argparse
import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageOps


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--sources", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    report = json.loads((args.sources / "source-inspection.json").read_text())
    models = {model["model"]: model for model in report["models"]}
    sheet = Image.new("RGB", (1800, 1490), (25, 28, 28))
    draw = ImageDraw.Draw(sheet)
    fonts = Path("C:/Windows/Fonts")
    title = ImageFont.truetype(str(fonts / "segoeuib.ttf"), 31)
    heading = ImageFont.truetype(str(fonts / "segoeuib.ttf"), 26)
    text = ImageFont.truetype(str(fonts / "segoeui.ttf"), 23)
    small = ImageFont.truetype(str(fonts / "segoeui.ttf"), 21)
    white, muted = (234, 235, 227), (179, 193, 184)
    cream, warning = (242, 224, 184), (244, 180, 116)

    def lines(x, y, values, font=text, color=white, step=33):
        for index, value in enumerate(values):
            draw.text((x, y + index * step), value, font=font, fill=color)

    def original(name, box):
        image = Image.open(args.sources / f"{name}.png").convert("RGBA")
        bounds = image.getchannel("A").getbbox()
        if not bounds:
            raise ValueError(f"Empty source render: {name}")
        image = ImageOps.contain(image.crop(bounds), box[2:])
        x = box[0] + (box[2] - image.width) // 2
        y = box[1] + (box[3] - image.height) // 2
        sheet.paste(image, (x, y), image)

    draw.text((30, 18), "CONVOY TANKER SOURCES | TWO EXISTING-PART LEADS | 30 SEP 2026", font=title, fill=cream)
    lines(30, 65, ["Verified original CC0 packs. Source choice only; no assembled tanker, fitting or game export.",
                   "Both leads still lack an articulated trailer, hitch, three valves and an opening boarding hatch."], color=warning)
    for x, label, cab, verdict in [
        (28, "A | DELIVERY-FLAT + HORIZONTAL TANK", "delivery-flat", "RECOMMENDED SOURCE LEAD"),
        (914, "B | TRUCK-FLAT + HORIZONTAL TANK", "truck-flat", "ALTERNATE; MORE BODY TRIMMING"),
    ]:
        draw.rounded_rectangle((x, 148, x + 858, 778), radius=12, fill=(40, 45, 45))
        draw.text((x + 20, 164), label, font=heading, fill=cream)
        original(cab, (x + 20, 213, 495, 234))
        original("detail-tank", (x + 535, 252, 298, 165))
        draw.text((x + 20, 458), f"Kenney {cab}: {models[cab]['triangles']:,} triangles", font=text, fill=white)
        lines(x + 537, 458, ["Kenney detail-tank:", "310 triangles"], font=small)
        lines(x + 20, 506, ["Car Kit 3.1 truck + City Kit Industrial 2.0 tank.",
                           "Four wheel meshes; cab and bed are one body mesh.",
                           "Original horizontal tank has bands and support feet."])
        body = ("Open flat chassis gives the clearer trim/combine lead." if cab == "delivery-flat"
                else "Raised tray sides need trimming; shorter pickup profile.")
        lines(x + 20, 617, [body, "Separate trailer frame and hitch are NOT supplied.",
                           "Bright source paint must become worn steel and dust."], color=muted)
        draw.text((x + 20, 734), verdict, font=heading, fill=warning)

    draw.text((32, 804), "KYLE-PICKED SALT FLATS PARTS | PROPOSED ARMOR USE, SHOWN SEPARATELY", font=heading, fill=cream)
    for index, (name, label, use) in enumerate([
        ("debris-door", "DOOR | 68 TRIANGLES", "Cab sides / front guard"),
        ("shipping-container-a", "CONTAINER | 402 TRIANGLES", "Trim panels for tank skirts"),
        ("debris-drivetrain", "DRIVETRAIN | 412 TRIANGLES", "Underside / ram crosspiece"),
        ("debris-tire", "LOOSE TYRE | 288 TRIANGLES", "Side / rear impact buffer"),
    ]):
        x = 28 + index * 443
        draw.rounded_rectangle((x, 848, x + 429, 1149), radius=10, fill=(40, 45, 45))
        original(name, (x + 17, 865, 395, 168))
        draw.text((x + 17, 1044), label, font=small, fill=cream)
        draw.line((x + 20, 1080, x + 20, 1106), fill=warning, width=3)
        draw.polygon([(x + 14, 1098), (x + 26, 1098), (x + 20, 1108)], fill=warning)
        draw.text((x + 35, 1088), use, font=small, fill=white)

    lines(32, 1166, ["Loose wheel-truck (428 triangles) can be reused for trailer wheels after a source pick.",
                    "The container is a complete mesh: skirts require trimming existing geometry, not a supplied loose panel.",
                    "Source pieces are not fitted here. Scale, geometry split, articulation and frame cost remain unproven."],
          font=small, color=muted, step=30)
    draw.rounded_rectangle((28, 1275, 1772, 1427), radius=12, fill=(57, 50, 40))
    lines(48, 1289, ["RECOMMEND A AS THE EXISTING-PART LEAD; STOP FOR KYLE'S SOURCE DECISION.",
                    "No inspected pack provides a finished trailer. Kyle can choose this trim/combine path or ask for a better source.",
                    "Do not start adaptation or invent missing geometry. Current game assets stay in place."],
          font=text, color=cream, step=40)
    draw.text((32, 1450), "Original palettes and shapes are shown honestly. Neutral cameras / alpha crops are presentation only; no shipped-art score is claimed.",
              font=small, fill=muted)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    for quality in [88, 84, 80, 76, 72, 68]:
        sheet.save(args.output, quality=quality, optimize=True)
        if args.output.stat().st_size <= 500000:
            break
    if args.output.stat().st_size > 500000:
        raise RuntimeError("Comparison exceeds 500 KB")
    print(str(args.output), args.output.stat().st_size, "bytes")


if __name__ == "__main__":
    main()
