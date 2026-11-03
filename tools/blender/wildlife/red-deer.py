"""Europe red deer stag, reshaped from the licensed Quaternius deer.

About 1.25 m at the shoulder: red-brown coat with darker and lighter zones,
a darker shaggy neck mane hanging at the throat, greyer head, a pale buff
rump patch round a short tail, and branched antlers (brow, bez, trez) ending
in a cupped crown of points. Donor frame and helpers: donor_shape.py.
"""
import sys
from pathlib import Path
sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import cli

ID = 'red-deer'
DONOR = 'white-tailed-deer'
BUDGET = 3800
SCALE = (.52, .50, .50)
MOTTLE = .50
GRIZZLE = .30

RED = (.165, .068, .030)
BACK = (.110, .048, .024)
MANE = (.055, .032, .020)
HEAD = (.085, .055, .036)
RUMP = (.42, .32, .18)
LEG = (.060, .036, .022)
BLACK = (.009, .008, .007)


def shape(p, bone, ctx):
    import donor_shape as d
    if bone.startswith('Ear'):
        return d.scale_about(p, ctx.head('Ear1.L' if bone.endswith('.L') else 'Ear1.R'), .82)
    if bone in ('Body', 'Back') or bone.startswith(('Torso', 'BackShoulder', 'BackLeg')):
        p.x *= 1.12
        p.z = 2.50 - (2.50 - p.z) * 1.06
    elif bone.startswith('Neck'):
        p.x *= 1.50
        throat = d.smooth((-1.40 - p.y) / .3) * d.smooth((3.3 - p.z) / .5)
        p.z -= .22 * throat
        p.y -= .05 * throat
    elif 'UpperLeg' in bone:
        centre = ctx.head(bone)
        p.x = centre.x + (p.x - centre.x) * 1.10
    elif bone.startswith('Tail'):
        root = ctx.head('Tail1')
        p = d.scale_about(p, root, .55)
        p.z -= max(0, p.y - root.y) * .8
    return p


def paint(p, bone, material, ctx):
    import donor_shape as d
    if 'hoof' in material or 'eye' in material or 'nose' in material:
        return BLACK
    if bone.startswith('Tail'):
        return d.mix(RUMP, BACK, .4)
    if bone == 'Head' or bone.startswith('Ear'):
        return BLACK if p.y < -2.64 else d.mix(HEAD, RED, .25)
    if bone.startswith('Neck'):
        return d.mix(MANE, RED, d.smooth((p.z - 3.0) / .6) * .5)
    if 'LowerLeg' in bone or bone.startswith(('FF', 'IK')):
        return LEG
    colour = d.mix(RED, BACK, d.smooth((p.z - 2.38) / .18))
    colour = d.mix(colour, MANE, d.smooth((-.95 - p.y) / .25) * .7)
    colour = d.mix(colour, d.mix(RED, LEG, .5), d.smooth((1.88 - p.z) / .15))
    rump = d.smooth((p.y - 1.15) / .14) * d.smooth((p.z - 1.95) / .12)
    return d.mix(colour, RUMP, rump)


def parts(a, ctx):
    import donor_shape as d
    base, tip = (.15, .10, .06), (.52, .45, .33)
    colour = lambda t: d.mix(base, tip, d.smooth((t - .55) / .45))
    for s in (-1, 1):
        # Wide, back-leaning beams: a stag's rack spreads well past the ears.
        beam = [(s * .11, -1.80, 3.98), (s * .34, -1.66, 4.30), (s * .58, -1.42, 4.68),
                (s * .76, -1.20, 5.06), (s * .82, -1.12, 5.30)]
        d.ring_tube(a, beam, [.080, .070, .062, .052, .045], lambda t: d.mix(base, tip, d.smooth((t - .85) / .15)), 'Head', 8)
        for start, mid, end, r in [
                ((s * .24, -1.76, 4.14), (s * .38, -2.16, 4.16), (s * .46, -2.42, 4.40), .046),   # brow
                ((s * .36, -1.64, 4.36), (s * .48, -1.96, 4.44), (s * .54, -2.10, 4.62), .038),   # bez
                ((s * .62, -1.38, 4.76), (s * .74, -1.64, 4.88), (s * .80, -1.76, 5.08), .038)]:  # trez
            d.ring_tube(a, [start, mid, end], [r, r * .7, .004], colour, 'Head', 6)
        # The crown: four points cupped round the beam top.
        top = (s * .82, -1.12, 5.30)
        for end in [(s * .74, -1.36, 5.66), (s * .96, -1.28, 5.68), (s * 1.00, -.96, 5.62), (s * .76, -.92, 5.64)]:
            mid = tuple((x + y) / 2 for x, y in zip(top, end))
            d.ring_tube(a, [top, mid, end], [.040, .026, .004], colour, 'Head', 6)


def build(output, c, cache):
    import donor_shape
    donor_shape.build(ID, output, c, cache, sys.modules[__name__])


if __name__ == '__main__':
    cli(ID, build)
