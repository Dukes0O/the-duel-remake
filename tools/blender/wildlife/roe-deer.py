"""Europe roe deer buck, reshaped from the licensed Quaternius deer.

Small: about 0.7 m at the shoulder and 1.2 m long. Reddish-brown summer
coat with darker and lighter zones, a white rump patch, almost no tail,
black nose with a white chin band, large rounded ears, short upright
antlers with three tines a side and a rough base. Donor frame: donor_shape.py.
"""
import sys
from pathlib import Path
sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import cli

ID = 'roe-deer'
DONOR = 'white-tailed-deer'
BUDGET = 3900
SCALE = (.28, .27, .28)
MOTTLE = .50
GRIZZLE = .25

RED = (.20, .080, .032)
BACK = (.13, .055, .024)
BELLY = (.30, .20, .12)
WHITE = (.60, .58, .52)
LEG = (.11, .055, .028)
BLACK = (.010, .009, .008)


def shape(p, bone, ctx):
    import donor_shape as d
    if bone.startswith('Ear'):
        return d.scale_about(p, ctx.head('Ear1.L' if bone.endswith('.L') else 'Ear1.R'), (1.0, .95, .90))
    if bone in ('Body', 'Back') or bone.startswith('Torso'):
        p.x *= 1.05
    elif 'LowerLeg' in bone:
        centre = ctx.head(bone)
        p.x = centre.x + (p.x - centre.x) * .85
    elif bone.startswith('Tail'):
        # Almost no tail: a stub hidden in the rump patch.
        p = d.scale_about(p, ctx.head('Tail1'), (.5, .25, .4))
    return p


def paint(p, bone, material, ctx):
    import donor_shape as d
    if 'hoof' in material or 'eye' in material or 'nose' in material:
        return BLACK
    if bone.startswith('Tail'):
        return WHITE
    if bone.startswith('Ear'):
        return d.mix(RED, (.05, .035, .025), .55)
    if bone == 'Head':
        if p.y < -2.66:
            return BLACK                              # nose
        if p.y < -2.50 and p.z < 3.55:
            return WHITE                              # white chin band
        return d.mix(RED, (.10, .07, .05), .5)        # greyer face
    if bone.startswith('Neck'):
        return d.mix(RED, BACK, .25)
    if 'Leg' in bone or bone.startswith(('FF', 'IK')):
        return d.mix(LEG, RED, d.smooth((p.z - 1.3) / .5))
    colour = d.mix(RED, BACK, d.smooth((p.z - 2.40) / .16))
    colour = d.mix(colour, BELLY, d.smooth((1.88 - p.z) / .14))
    rump = d.smooth((p.y - 1.15) / .16) * d.smooth((p.z - 1.85) / .14)
    return d.mix(colour, WHITE, rump)


def parts(a, ctx):
    import donor_shape as d
    base, tip = (.10, .075, .045), (.42, .36, .26)
    colour = lambda t: d.mix(base, tip, d.smooth((t - .5) / .5))
    for s in (-1, 1):
        # Rough coronet ring, then a short upright beam with a front tine
        # half way and a rear tine near the top.
        d.ring_tube(a, [(s * .12, -1.80, 3.98), (s * .13, -1.80, 4.08)], [.075, .060], base, 'Head', 8)
        beam = [(s * .13, -1.80, 4.06), (s * .17, -1.84, 4.40), (s * .17, -1.80, 4.72), (s * .14, -1.74, 4.95)]
        d.ring_tube(a, beam, [.050, .042, .030, .004], colour, 'Head', 7)
        d.ring_tube(a, [(s * .17, -1.85, 4.40), (s * .18, -2.02, 4.52), (s * .18, -2.10, 4.66)], [.030, .020, .003], colour, 'Head', 6)
        d.ring_tube(a, [(s * .17, -1.79, 4.72), (s * .18, -1.62, 4.84)], [.026, .003], colour, 'Head', 6)


def build(output, c, cache):
    import donor_shape
    donor_shape.build(ID, output, c, cache, sys.modules[__name__])


if __name__ == '__main__':
    cli(ID, build)
