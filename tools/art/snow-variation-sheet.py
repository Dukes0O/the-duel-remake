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
    parser.add_argument("--output", required=True, help="Owned immutable round-1.jpg")
    args = parser.parse_args()
    evidence, output = Path(args.evidence).resolve(), Path(args.output).resolve()
    evidence.relative_to((ROOT / ".evidence").resolve())
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


if __name__ == "__main__":
    main()
