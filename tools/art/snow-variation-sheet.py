"""Compose the first Snow variation review from verified, unretouched native views."""
import argparse
import hashlib
from io import BytesIO
import json
from pathlib import Path
import subprocess
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[2]
SOURCES = {
    "BEFORE": ("before-989bf3c1", "989bf3c16fc0208bae914ece20fc545ab8c625b3", {
        "06-c9-brake.jpg": "9a91e1f63cc79ce2bf8c9a452d02c21d0191c08ea78ad5b15741413a69021176",
        "14-c22-brake.jpg": "a7a050110a43555febeb2cf43c6a32a61e3441d8e130a4b4eb45ba960567d299"}),
    "AFTER": ("after-6402a40c", "6402a40c5593649c5ec2ae21738e7269a1cb5c37", {
        "06-c9-brake.jpg": "d8decd8ae49125d545cf155092abf2f04a78391a03484a9244616c841b39fa98",
        "14-c22-brake.jpg": "d4c56b634a617c1aa2411bcc506bd292bafb2ffb0af02bb0df9b4e59f2e51bd3"}),
}
ROWS = [(5, "06-c9-brake.jpg", "06 Engineer's Hairpin braking | daylight / distant snow"),
        (13, "14-c22-brake.jpg", "14 Last Breath braking | night approach")]


def read_json(path):
    return json.loads(path.read_text(encoding="utf-8-sig"))


def digest(data):
    return hashlib.sha256(data).hexdigest()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--evidence", required=True, help="Existing SNOW-VARIATION packet directory")
    parser.add_argument("--output", required=True, help="Owned immutable review JPG")
    parser.add_argument("--round", type=int, choices=(1, 2, 3), default=1)
    args = parser.parse_args()
    evidence, output = Path(args.evidence).resolve(), Path(args.output).resolve()
    evidence.relative_to((ROOT / ".evidence").resolve())
    if args.round in (2, 3):
        return round_static(evidence, output, args.round)
    expected_output = (ROOT / "docs/board/looks/snow-variation/round-1.jpg").resolve()
    if output != expected_output:
        raise ValueError("This recipe owns only round 1; later rounds require new reviewed inputs (cap three).")
    manifest = evidence / "round-1-inputs.json"
    if output.exists() or manifest.exists():
        raise FileExistsError("Round 1 is immutable; never overwrite its picture or input manifest.")

    before, after = [row[1] for row in SOURCES.values()]
    changed = subprocess.run(["git", "diff", "--name-only", before, after], cwd=ROOT,
                             check=True, capture_output=True, text=True).stdout.splitlines()
    expected = {"src/snow-world.js", "src/world.js", "src/circuits/summit-run.js",
                "tools/test-snow-world.mjs", "docs/changes/SNOW-VARIATION.md"}
    if set(changed) != expected:
        raise ValueError("Captured source pair has an unexpected file delta.")
    def course_source(source):
        return subprocess.run(["git", "show", source + ":src/circuits/summit-run.js"], cwd=ROOT,
                              check=True, capture_output=True).stdout
    if course_source(after).replace(b"variationStrength:.20,variationScale:800,", b"", 1) != course_source(before):
        raise ValueError("Course geometry differs beyond the approved snow options.")

    captures, pictures = {}, {}
    for label, (folder, source, hashes) in SOURCES.items():
        packet = evidence / folder
        receipt = read_json(evidence / (label.lower() + ".receipt.json"))
        if not (receipt["source"] == receipt["sourceAfter"] == source and
                receipt["exitCode"] == 0 and receipt["dirtyAfter"] == []):
            raise ValueError(label + " lacks a successful unchanged-source receipt.")
        report, browser = read_json(packet / "report.json"), read_json(packet / "browser-result.json")
        if not (report["passed"] and report["memoryOnlySaves"] and not report["issues"] and
                not report["warnings"] and not browser["browserErrors"] and
                not browser["warnings"] and not browser["frameErrors"]):
            raise ValueError(label + " has a failed native packet.")
        request = read_json(packet / "review-input.json")
        options = {key: request["options"][key] for key in ("courseId", "quality", "car", "seed", "flags")}
        if options != {"courseId": "summit-run", "quality": "high", "car": "falcone_f42",
                       "seed": 1989, "flags": ["summit-run"]}:
            raise ValueError(label + " has a different requested native setup.")
        captures[label] = {"source": source, "receipt": receipt, "options": options, "frames": []}
        for index, filename, caption in ROWS:
            row = next(row for row in request["frames"] if row["index"] == index)
            if row["file"] != filename:
                raise ValueError("Selected native frame identity differs.")
            path = packet / "frames" / filename
            data = path.read_bytes()
            if digest(data) != hashes[filename]:
                raise ValueError("Native image SHA256 changed: " + str(path))
            with Image.open(BytesIO(data)) as image:
                if image.size != (1280, 800) or image.mode != "RGB":
                    raise ValueError("Unexpected original native dimensions or colour mode.")
                pictures[(label, filename)] = image.resize((960, 600), Image.Resampling.LANCZOS)
            captures[label]["frames"].append({"path": str(path), "sha256": digest(data),
                "nativeDimensions": [1280, 800], "requested": row,
                "actualObservedPose": browser["framePoses"][str(index)]})
    for before_row, after_row in zip(captures["BEFORE"]["frames"], captures["AFTER"]["frames"]):
        if before_row["requested"] != after_row["requested"]:
            raise ValueError("The requested station/camera inputs differ.")

    margin, header, caption_height, footer = 16, 94, 46, 68
    sheet = Image.new("RGB", (1968, header + 2 * (600 + caption_height) + margin + footer), "#121923")
    draw = ImageDraw.Draw(sheet)
    font = ImageFont.truetype("C:/Windows/Fonts/arial.ttf", 23)
    small = ImageFont.truetype("C:/Windows/Fonts/arial.ttf", 18)
    draw.text((margin, 12), "SNOW-VARIATION | Round 1 | Native full-viewport comparison", font=font, fill="white")
    draw.text((margin, 49), "BEFORE 989bf3c1: original short-scale snow | AFTER 6402a40c: strength .20 / scale 800 m", font=small, fill="#c3cfdf")
    for row_index, (_, filename, caption) in enumerate(ROWS):
        for column, label in enumerate(SOURCES):
            x, y = margin + column * 976, header + row_index * (600 + caption_height + margin)
            draw.text((x, y + 9), label + " | " + caption, font=small, fill="white")
            sheet.paste(pictures[(label, filename)], (x, y + caption_height))
    draw.text((margin, sheet.height - 54), "Same requested views, normal native recipe. Vehicle vertical poses may differ; no exact physics-pose match is claimed.", font=small, fill="#c3cfdf")
    draw.text((margin, sheet.height - 29), "Full viewports resized only. No crop, retouch or brightness change. No race, frame-timing or art-acceptance claim.", font=small, fill="#c3cfdf")
    encoded = None
    for quality in (86, 81, 76, 71, 66, 61, 56, 51):
        stream = BytesIO()
        sheet.save(stream, format="JPEG", quality=quality, optimize=True)
        if len(stream.getvalue()) <= 500000:
            encoded = stream.getvalue()
            break
    if encoded is None:
        raise ValueError("Full-viewport pair exceeds the 500 KB art-sheet cap.")
    output.parent.mkdir(parents=True, exist_ok=True)
    with output.open("xb") as handle:
        handle.write(encoded)
    record = {"round": 1, "captures": captures, "operations": "Full viewport RGB resize and JPEG compression only; labels outside source pixels",
              "output": str(output), "bytes": len(encoded), "sha256": digest(encoded), "artAccepted": False}
    with manifest.open("x", encoding="utf-8", newline="\n") as handle:
        handle.write(json.dumps(record, indent=2) + "\n")
    print(json.dumps({"output": str(output), "bytes": len(encoded), "sha256": digest(encoded), "manifest": str(manifest)}))


def round_static(evidence, output, round_number):
    config = {
        2: {"source": "3ea6100b448dbb27c53fac97cf75fd4e0479d23a", "packet": "daylight-round2-3ea6100b",
            "strength": .20, "before": "5b77bc2e63b5fc064926e34726bb3c0db6e771d416a5c6c0f6ad30f75b8b2bec",
            "after": "f9bb7b409c84bcdb191f6cc1fb3c3810ebecfc27a73180f538429fed2f3b3c48",
            "label": "AFTER: same contrast .20 / broad 800 m wind field"},
        3: {"source": "5bfd6e8d3410d89dd18211df6056b669b3960a25", "packet": "daylight-round3-5bfd6e8d",
            "strength": .45, "before": "4fb1322c983179840b8687121f0b974b4d859292afcb3518f89c020955d7ac80",
            "after": "75226b475182b780d54d9ce0a67dfc9a0137db5b79894bdb8dec3238cbbd5617",
            "label": "AFTER: final contrast .45 / broad 800 m wind field"},
    }[round_number]
    source = config["source"]
    packet_dir = evidence / config["packet"]
    expected_output = (ROOT / f"docs/board/looks/snow-variation/round-{round_number}.jpg").resolve()
    manifest = evidence / f"round-{round_number}-inputs.json"
    if output != expected_output:
        raise ValueError(f"Round {round_number} owns only its named output; the cap is three reviewed rounds.")
    if output.exists() or manifest.exists():
        raise FileExistsError(f"Round {round_number} is immutable; retain all earlier provenance.")
    receipt = read_json(evidence / f"daylight-round{round_number}.receipt.json")
    if not (receipt["source"] == receipt["sourceAfter"] == source and
            receipt["exitCode"] == 0 and receipt["dirtyAfter"] == []):
        raise ValueError("Static pair lacks its real successful unchanged-source receipt.")
    report, packet = read_json(packet_dir / "report.json"), read_json(packet_dir / "snow-art.json")
    if not (report["scenario"] == "summit-run" and report["passed"] and report["memoryOnlySaves"] and
            not report["issues"] and not report["warnings"] and packet["passed"] and
            packet["artOnly"] and packet["memoryOnly"] and packet["frameMeasurement"] is False):
        raise ValueError("Actual daylight ART packet failed.")
    if packet["requested"] != {"piece": "Whiteout Crest", "snapshotS": 9149.692113607956,
                               "up": 140, "ahead": 500, "quality": "high"}:
        raise ValueError("Actual camera request differs from the reviewed static pair.")
    if len(packet["legs"]) != 2 or [row["leg"] for row in packet["legs"]] != ["before", "after"]:
        raise ValueError("Exactly the original two static legs are required.")
    hashes = {name: config[name] for name in ("before", "after")}
    pictures, inputs = [], []
    for leg in packet["legs"]:
        name = leg["leg"]
        expected_options = {"variation": True, "strength": None if name == "before" else config["strength"],
                            "scale": None if name == "before" else 800}
        if not (leg["seed"] == 1989 and leg["status"] == "menu" and leg["readOnly"] and
                leg["timeOfDay"] == "day" and leg["hasLightPath"] is False and
                leg["dimensions"] == [960, 540] and leg["options"] == expected_options and
                leg["worldBuildsAfter"] > leg["worldBuildsBefore"] and leg["snowVertices"] > 0):
            raise ValueError("Actual " + name + " world/read-only/lighting/coverage witness differs.")
        path = packet_dir / ("snow-" + name + ".png")
        if Path(leg["image"]).resolve() != path.resolve():
            raise ValueError("Packet image does not name its original source file.")
        data = path.read_bytes()
        if digest(data) != hashes[name]:
            raise ValueError("Actual source PNG SHA256 changed.")
        with Image.open(BytesIO(data)) as image:
            if image.size != (960, 540) or image.mode not in ("RGB", "RGBA"):
                raise ValueError("Unexpected native static canvas dimensions or colour mode.")
            if image.mode == "RGBA" and image.getchannel("A").getextrema() != (255, 255):
                raise ValueError("Source PNG must be fully opaque; no compositing or pixel alteration.")
            # Dropping a verified opaque alpha channel preserves every RGB pixel.
            pictures.append(image.convert("RGB"))
        inputs.append({"path": str(path), "sha256": digest(data), "dimensions": [960, 540], "witness": leg})
    before, after = packet["legs"]
    geometry = lambda leg: [{key: value for key, value in row.items() if key != "materialKey"}
                            for row in leg["geometry"]]
    if not (before["featuresHash"] == after["featuresHash"] and before["pose"] == after["pose"] and
            geometry(before) == geometry(after) and len(before["geometry"]) == 2):
        raise ValueError("Actual static geometry/features/camera equality is missing.")
    key = "terrain-slope-mosaic-v2-winter-v1-drifts-authored-variation"
    if any(row["materialKey"] != key for row in before["geometry"]) or any(
            row["materialKey"] != key + f"-wind-strength:{config['strength']}-scale:800" for row in after["geometry"]):
        raise ValueError("Actual original/candidate material keys differ from the approved source.")
    sheet = Image.new("RGB", (1968, 730), "#121923")
    draw = ImageDraw.Draw(sheet)
    font = ImageFont.truetype("C:/Windows/Fonts/arial.ttf", 23)
    small = ImageFont.truetype("C:/Windows/Fonts/arial.ttf", 18)
    draw.text((16, 12), f"SNOW-VARIATION | Round {round_number} | Whiteout Crest open snowfield | High", font=font, fill="white")
    draw.text((16, 48), "Same static native camera | BOTH legs: declared daylight ART override, normal race lighting unchanged", font=small, fill="#c3cfdf")
    for column, (image, label) in enumerate(zip(pictures, ["BEFORE: original wind field / optional values omitted", config["label"]])):
        x = 16 + column * 976
        draw.text((x, 91), label, font=small, fill="white")
        sheet.paste(image, (x, 124))
    draw.text((16, 680), "Original full native 960 x 540 canvases. No crop, retouch or brightness change; labels outside original pixels.", font=small, fill="#c3cfdf")
    draw.text((16, 706), "ART comparison only: no normal game-lighting, race, frame-timing or acceptance claim.", font=small, fill="#c3cfdf")
    encoded = fallback = None
    for quality in (86, 81, 76, 71, 66, 61, 56, 51):
        stream = BytesIO()
        sheet.save(stream, format="JPEG", quality=quality, optimize=True)
        data = stream.getvalue()
        if len(data) <= 500000 and fallback is None:
            fallback = data
        if len(data) <= 180000:
            encoded = data
            break
    encoded = encoded or fallback
    if encoded is None:
        raise ValueError("Static review pair exceeds 500 KB.")
    output.parent.mkdir(parents=True, exist_ok=True)
    with output.open("xb") as handle:
        handle.write(encoded)
    record = {"round": round_number, "source": source, "receipt": receipt, "inputs": inputs,
              "operations": "Original full opaque native canvases, JPEG compression only; outside labels",
              "lighting": packet["lighting"], "output": str(output), "bytes": len(encoded),
              "sha256": digest(encoded), "artAccepted": False, "performanceAccepted": False}
    with manifest.open("x", encoding="utf-8", newline="\n") as handle:
        handle.write(json.dumps(record, indent=2) + "\n")
    print(json.dumps({"output": str(output), "bytes": len(encoded), "sha256": digest(encoded), "manifest": str(manifest)}))


if __name__ == "__main__":
    main()
