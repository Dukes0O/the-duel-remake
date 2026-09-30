# Crew starting models: Kyle's choice

Two unmodified CC0 source packs are compared beside the current Rook in [round-1.jpg](round-1.jpg). No candidate has been adapted or loaded by the game.

A: [Kenney Survivors](https://kenney.nl/assets/animated-characters-survivors). Body: 1,604 triangles and 58 bones. The body file has no embedded animation. Idle, jump and run are separate files and need retargeting review. Male and female skins share a blocky body. Adaptation needs eight recognizable faces and costumes, worn materials and the other required actions.

B: [Quaternius Modular Men](https://quaternius.com/packs/ultimatemodularcharacters.html). Complete Punk example: 5,500 triangles. Shared rig: 79 bones and 24 actions, including walk, run, gun and interaction. Parts mix across eleven male outfits. Adaptation needs worn materials, crew costumes and a licensed companion source or proportion work for female crew. Some outfits need geometry reduction. The required 2,000-triangle distant versions still need to be made.

Licences and checksums are in `tools/art/catalog.json`. The cached licences explicitly state CC0 1.0. Source files stay outside the repository in `C:/Users/kyleb/dev/art-library/`. Blender 4.5 inspected the original FBX files. Pack previews show the unmodified sources.

Current Rook uses the unchanged production GLB and the game's renderer. `tools/scenarios/art-source-current.mjs` creates a private memory-only race, uses the production exit transition, then isolates its loaded idle skin on a grey background. Its review camera, pose location and light isolation are fixtures. Shadows are disabled for this source image. The screenshot shows the near `rook-near` skin, at idle time 0.25 seconds: one draw and 6,108 triangles. These isolated counts are not a gameplay frame measurement. The GLB checksum is `9dfa853187b707d30e7cd19f029efc3b1219e914d13ce68029d30eedeb8b911a`.

The capture verifies the memory guard, production Rook exit, loaded asset, active idle clip and exclusive near-skin draw. Earlier misframed captures were rejected. Visual inspection confirms the current shot shows the complete fighter. The comparison sheet is below 500 KB.

Decision, 30 September: Kyle said he is not picky about Rook or the CC0 packs and authorized using existing developer-made assets. The Director selects B, Quaternius Modular Men, for its existing rig, actions and modular costumes. A remains the recorded alternate. This is a source choice; the sourcing card does not adapt or ship a model. Female crew coverage remains a named task for later reuse.
