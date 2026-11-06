# TOWN-ART-MACHINES-1 | Round 2

**Builder self-review; independent art verdict pending.** The sheet pairs each
photo reference with a rest pose, a working pose and a close view. The recipe
uses measured hinge centres for the named moving nodes. Fixed meshes with the
same parent and material are combined for export, while the moving joints stay
separate. GLB readback confirmed the node names, machine triangle counts and
file size.

## Builder scores

| Item | Score / 5 | Note |
| --- | ---: | --- |
| Resemblance | 3 | All four types read, but the excavator, wheels and cab shapes are simpler than the references. |
| Readability | 4 | Each tool and machine type is clear in the camera views shown. The game view is not wired yet. |
| Grounding | 4 | Tires and tracks touch the render floor; the raised bed and boom poses stay attached to their pivots. |
| Scene consistency | 4 | The worn steel and patched paint fit the scrapyard, though the palette stays darker and browner than the photos. |
| Frame cost | Not measured | This family is not in the game. The model is within its mesh and file budgets; frame timing is not appropriate yet. |

## Main differences to fix

1. The model silhouettes and cab details are less specific than the photo references.
2. The paint reads darker and browner than the faded ochre and olive in the photos.
3. Tires and track shoes are more stylized and darker than the reference machinery.
4. Several hinge pins and hydraulic connections are hard to judge at the sheet's scale.
5. The dozer blade still dominates its body, while the dump truck is less tall and heavy than its reference.

The working poses now show the trencher chain lowered, the excavator arm reaching,
the truck bed tipping and the dozer blade moving. This is still a candidate art
round. It needs the independent review and the third family round before it can
reach beta. No browser or frame check applies because the model is not wired in.

## Image sources

The generated machine reference and wear texture, their full prompts and their
credit are in `tools/blender/CREDITS.md`. The JPGs in `tools/blender/` are the
rebuild inputs. Raw renders are private review evidence.
