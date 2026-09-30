# Women crew source comparison

status: review
waiting_on: kyle
date: 2026-09-30
sheet: round1.jpg
scope: source choice only

Keep the current women for now. The two downloaded CC0 candidates do not yet supply the settled costumes and actions. Standard is the stronger anatomy lead, but fitting it would need existing garment and action sources. Kenney's cartoon proportions conflict with the settled tone. Modular Women has promising workwear in its preview, but its licence and model access are unresolved. This is a source recommendation, not a fitted-art pass.

## Current baseline and target

The private game renderer captures current Nell, Odessa and Wren in idle, near, on neutral grey: 5,380 / 4,876 / 5,560 triangles, one skinned draw each. The production exit transition creates each fighter. The harness uses a disposable profile, memory-only saves and private port 52526; zero warnings and errors. Source previews use their original palettes. They are not matched material, distance or High/Performance fitting trials.

Keep the crew-sheet silhouettes: Nell's goggles and rust-red harness; Odessa's older face, rolled sleeves, tool belt and ochre workwear; Wren's cropped sand jacket, light packs and trail boots. Claude settled Vesper Blackiron as a woman on 30 September. Her future figure must remain hidden until WAR-04; there is no Vesper runtime figure in this baseline.

Comparison: 1,800 x 1,660 JPEG, 376,150 bytes (below 500 KB). All 19 new recorded source/evidence hashes match the actual cached files; all 17 existing catalog entries remain unchanged.

Unchanged current runtime GLB SHA-256 values (verified byte-for-byte against the lane base):

- Nell (1,984,312 bytes): `513b50796a4dca0f83eab5dd1570cae99d5605326cbfae11e8cc7c6b71720889`.
- Odessa (1,920,000 bytes): `364de3fd43de474eb4ef0fd12b859940f067549b02f2922b432d3a0c422170ca`.
- Wren (2,063,012 bytes): `5e98ef99656e8065ff1d7726791538c6bc84c2938e0509c0385b484add8a9216`.

## A: Quaternius Universal Base Characters, Standard

[Official pack](https://quaternius.com/packs/universalbasecharacters.html), [creator's free download page](https://quaternius.itch.io/universal-base-characters), checked 2026-09-30. Author: Quaternius. An anonymous zero-price download supplied the original Standard ZIP and embedded CC0 1.0 licence. No account, email, payment or dependency was needed. The paid Source edition was excluded. Its Regular and Teen bodies must not be implied available: the downloaded Standard archive supplies Superhero female/male bodies.

Actual Blender 4.5.13 inspection of the selected Unity FBX: female body 12,812 triangles; eyes 768; eyebrows 1,480; combined bound figure 15,060 triangles, 65 bones, zero embedded actions. Four supplied rigged hair parts were inspected: BuzzedFemale 830; SimpleParted 1,301; Long 2,906; Buns 3,284 triangles. Each hair FBX has the same 65-bone rig and no actions. The sheet crops the unchanged official Standard preview; it does not pretend that preview is a fitted source render.

Better face and body detail than Kenney. No protective goggles, harness, rolled-sleeve workwear, tool belt, cropped jacket or trail boots. The figure exceeds near 6,500 and distant 2,000 budgets before hair. Needs tested reduction, suitable existing garments and a separate licensed animation source, plus retargeting. Compatibility with the selected 79-bone Modular Men rig is unproven. Recolouring cannot supply missing costume geometry.

## B: Kenney Animated Characters Survivors

[Official pack](https://kenney.nl/assets/animated-characters-survivors), checked 2026-09-30. Author: Kenney. The cached original ZIP and embedded CC0 licence remain intact. The pack is freely downloadable without donation or account. The sheet shows the original shared characterMedium body with its supplied survivorFemaleA skin, rendered in Blender; no body, rig, UV, garment or source file was changed.

Actual source: 1,604 triangles, 58 bones, zero embedded body actions. The three separate animation FBXs contain Idle, Jump and Run, each with an additional targeting-pose track. These are three motions, not six different gameplay actions. Retargeting and other required actions are unproven.

Low geometry cost, but one shared cartoon body and one female skin do not provide four recognizable crew silhouettes. The large simple head and blocky proportions conflict with the grounded references. Existing harness/workwear/jacket parts and richer faces are missing. Worn textures alone are unlikely to beat the current art.

## Requested first: Quaternius Ultimate Modular Women, ON HOLD

[Official pack](https://quaternius.com/packs/ultimatemodularwomen.html), [official general licence](https://quaternius.com/license.html), [creator's public source folder](https://drive.google.com/drive/folders/1720N9IGyQHXYvtvZJzazhxtTTlz-y2Vf?usp=sharing), checked 2026-09-30. Author: Quaternius. The pack page labels CC0 and advertises ten outfits, 24 animations and four interchangeable parts. The current general licence page instead displays Quaternius Asset License v1.0, updated 28 August 2026, which restricts standalone redistribution and contains a clause about prior acquisitions. We have not resolved which terms accompany this pack. No conclusion changes the earlier Men's or Standard cached CC0 records.

The actual public License.txt (file ID 1lIFL16xEpoPbr0j_HUATgmcEnAmYoIK2), How To Use.txt (1-FqaGch58KXpO8GtWEFbKnO6ds763Hd5) and All together.fbx (1v5mmkaQLRfUuFp4tcbmnlXQ6lykiSe0B) downloads returned quota-exceeded HTML instead of files. The fake downloads were rejected and removed; repeated requests stopped. Cached evidence holds only the official preview and primary page snapshots. No licence or model artifact was acquired.

Actual geometry, bone count, animation contents and shared-rig compatibility are unknown. The preview suggests useful workwear, but its cartoon heads, pristine surfaces and missing exact outfits still need review. It is not a verified CC0 candidate and cannot be used for fitting now.

## Stop and next step

Kyle's stop rule applies: none of the verified cached sources can presently demonstrate the settled four silhouettes and full action set using only recolouring, combining, trimming and LOD. Keep current art. Ask Kyle whether to resolve Modular Women's actual access/licence first or source compatible existing garments and animations for Standard. No bespoke sculpting or placeholder is proposed.

Director sends this sheet and the access/licence issue to Claude before any merge. Independent source review and mandatory lane/build gate are pending. No second comparison or adaptation begins before Kyle's source decision. All checksums, source paths and rights status are in tools/art/catalog.json; original licensed files stay outside the repository.

## Reproduce

Run in this isolated lane:

- Blender: `blender -b --python-exit-code 1 --python tools/art/crew-w-source-inspect.py -- --output .evidence/2026-09-30/ART-SRC-CREW-W/sources`
- Current game: `node tools/browser-harness.mjs scenario crew-w-source-current --output-dir .evidence/2026-09-30/ART-SRC-CREW-W/current`
- Sheet: `python tools/art/crew-w-source-sheet.py --evidence .evidence/2026-09-30/ART-SRC-CREW-W --output docs/board/looks/crew-w-src/round1.jpg`

Default cache: C:/Users/kyleb/dev/art-library. Keep downloaded originals and licences. Raw review evidence is deleted after the independent verdict is committed; retain this verdict and the single compressed sheet.
