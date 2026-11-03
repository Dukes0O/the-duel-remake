"""Western mountains mule deer, reshaped from the licensed Quaternius deer.

Mule deer buck: about 1.05 m at the shoulder, grey-brown coat, big ears,
white face and throat with a dark forehead, a large white rump patch and a
short rope tail with a black tip, forked (bifurcated) antlers.
Donor frame and helpers: donor_shape.py.
"""
import sys
from pathlib import Path
sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import cli

ID = 'mule-deer'
DONOR = 'white-tailed-deer'
BUDGET = 4000
SCALE = (.45, .45, .43)

COAT = (.096, .079, .060)
BACK = (.060, .052, .043)
PALE = (.56, .54, .48)
BELLY = (.36, .33, .27)
LEG = (.12, .095, .068)
DARK = (.022, .018, .014)
BLACK = (.010, .009, .008)


def shape(p, bone, ctx):
    import donor_shape as d
    if bone.startswith('Ear'):
        base = ctx.head('Ear1.L' if bone.endswith('.L') else 'Ear1.R')
        return d.scale_about(p, base, 1.34)
    if bone in ('Body', 'Back') or bone.startswith('Torso'):
        p.x *= 1.08
    elif bone.startswith('Neck'):
        p.x *= 1.12
    elif 'LowerLeg' in bone:
        centre = ctx.head(bone)
        p.x = centre.x + (p.x - centre.x) * .88
    elif bone.startswith('Tail'):
        # A short rope tail held down, not the whitetail's raised flag.
        root = ctx.head('Tail1')
        out = max(0, p.y - root.y)
        p.x = root.x + (p.x - root.x) * .62
        p.z -= out * 1.05
        p.y = root.y + (p.y - root.y) * .80
    return p


def paint(p, bone, material, ctx):
    import donor_shape as d
    if 'hoof' in material:
        return BLACK
    if 'eye' in material or 'nose' in material:
        return BLACK
    tail_root = ctx.head('Tail1')
    if bone.startswith('Tail'):
        return BLACK if p.y > tail_root.y + .24 else PALE
    if bone.startswith('Ear'):
        return d.mix(COAT, DARK, .35)
    if bone == 'Head':
        if p.y < -2.66:
            return BLACK
        if p.y < -2.40:
            return d.mix(PALE, COAT, .25) if p.z > 3.55 else PALE
        if p.z > 3.78 and p.y < -1.95:
            return DARK
        return d.mix(COAT, (.11, .10, .09), .5)
    if bone.startswith('Neck') and p.z < 3.25 and p.y < -1.72 and abs(p.x) < .26:
        return PALE
    rump = d.smooth((p.y - 1.08) / .22) * d.smooth((p.z - 1.80) / .15)
    if bone in ('Body', 'Back') or bone.startswith(('Torso', 'BackLeg', 'BackShoulder', 'BackUpper')):
        colour = d.mix(COAT, BACK, d.smooth((p.z - 2.40) / .18))
        if p.z < 1.85:
            colour = d.mix(colour, BELLY, d.smooth((1.85 - p.z) / .12))
        return d.mix(colour, PALE, rump)
    if 'Leg' in bone or bone.startswith(('FF', 'IK')):
        return d.mix(LEG, (.30, .27, .21), .5 if abs(p.x) < .25 else 0)
    return COAT


def parts(a, ctx):
    import donor_shape as d
    base, tip = (.24, .18, .11), (.50, .43, .31)
    colour = lambda t: d.mix(base, tip, t)
    for s in (-1, 1):
        A = (s * .56, -1.68, 4.56)
        d.ring_tube(a, [(s * .11, -1.80, 3.98), (s * .32, -1.76, 4.28), A], [.066, .058, .048], base, 'Head', 7)
        d.ring_tube(a, [(s * .25, -1.77, 4.16), (s * .29, -2.00, 4.30)], [.030, .004], colour, 'Head', 5)
        B, C = (s * .72, -1.90, 4.86), (s * .90, -1.55, 4.80)
        d.ring_tube(a, [A, (s * .64, -1.80, 4.72), B], [.046, .041, .035], colour, 'Head', 7)
        d.ring_tube(a, [A, (s * .74, -1.60, 4.70), C], [.046, .041, .035], colour, 'Head', 7)
        for start, end in [(B, (s * .68, -2.10, 5.16)), (B, (s * .88, -1.96, 5.14)),
                           (C, (s * .94, -1.68, 5.20)), (C, (s * 1.14, -1.45, 5.00))]:
            mid = tuple((x + y) / 2 for x, y in zip(start, end))
            d.ring_tube(a, [start, mid, end], [.034, .022, .004], colour, 'Head', 6)


def build(output, c, cache):
    import donor_shape
    donor_shape.build(ID, output, c, cache, sys.modules[__name__])


if __name__ == '__main__':
    cli(ID, build)
