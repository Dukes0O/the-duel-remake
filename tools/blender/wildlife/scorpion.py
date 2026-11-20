"""Wasteland giant desert hairy scorpion: an original recipe with its own rig.

The real animal is Hadrurus arizonensis, the largest scorpion of the North
American deserts at about 14 cm. The Wasteland's are built four times that
size, 0.55 m from claw tips to the bend of the tail, so that one can be seen
from a car at 10 m (the card asks for this); the proportions and colours are
the real animal's (the photographs in waste-references.json). A flat body of
a carapace and seven ridged back plates, olive-brown above with pale rear
edges; pale straw-yellow legs, claws and tail; eight legs with high knees;
long arms ending in swollen claws; a tail of five beads carried in an arc
over the back, ending in a bulb and a dark curved sting.
Idle: the tail sways, the claws open and close, the body lifts a little.
Walk: legs step in two alternating sets of four. Helpers: original.py.
"""
import math
import sys
from pathlib import Path
sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import cli

ID = 'scorpion'
STRAW = (.50, .41, .19)
PALE = (.60, .53, .30)
OLIVE = (.085, .075, .045)
DARK = (.022, .018, .014)
BODY_Z = .052
# Leg roots along the body, the foot's reach forward (x) and sideways (y), front to back.
LEG_SETS = ((.060, .070, .118), (.030, .028, .138), (.000, -.036, .142), (-.030, -.100, .132))


def build(output, c, cache):
    import original as o
    from mathutils import Vector
    a = o.Body(ID)
    a.bone('root', (0, 0, 0), (0, 0, .04))
    a.bone('body', (-.115, 0, BODY_Z), (.115, 0, BODY_Z), 'root')

    def back(p):
        up = o.smooth((p.z - BODY_Z + .004) / .008)
        # Seven back plates with pale rear edges; a paler carapace with a dark eye mound.
        plate = (p.x + .115) / .0225
        edge = o.smooth((.22 - (plate % 1)) / .12) if p.x < .045 else 0
        top = o.mix(OLIVE, (.14, .12, .07), .5 * o.mottle(p, 6))
        top = o.mix(top, PALE, .55 * edge)
        if p.x > .045:
            top = o.mix(o.mix(STRAW, OLIVE, .45), DARK, .9 * o.smooth((.016 - (Vector((p.x - .078, p.y, 0))).length) / .008))
        return o.mix(PALE, top, up)

    sections, x = [], -.118
    while x < .1181:
        u = (x + .118) / .236
        wide = .046 * math.sin(math.pi * min(1, .12 + u * 1.02)) ** .55 * (1 - .28 * max(0, (u - .78) / .22) ** 2)
        plate = ((x + .115) / .0225) % 1 if x < .045 else .5
        ridge = 1 + .05 * math.sin(math.pi * plate)
        sections.append(((x, 0, BODY_Z + .002 * math.sin(math.pi * u)), max(.004, wide * ridge), max(.003, .021 * math.sin(math.pi * min(1, .10 + u * .95)) ** .6 * ridge)))
        x += .0059
    a.loft(sections, back, 'body', 12)

    # Tail: five beads in a rising arc, then the bulb and sting.
    pos, heading, previous = Vector((-.112, 0, BODY_Z + .004)), math.radians(18), 'body'
    for k, (length, turn) in enumerate(((.046, 30), (.048, 34), (.050, 36), (.052, 36), (.058, 34))):
        end = pos + Vector((-math.cos(heading), 0, math.sin(heading))) * length
        name = 'tail' + str(k + 1)
        a.bone(name, tuple(pos), tuple(end), previous)
        thick = .0165 - .0012 * k
        pts = [pos.lerp(end, t) for t in (0, .22, .55, .85, 1)]
        a.tube3(pts, [thick * .62, thick * .92, thick, thick * 1.02, thick * .66],
                lambda p: o.mix(STRAW, PALE, o.mottle(p, 7)), name, 8, .92)
        pos, previous, heading = end, name, heading + math.radians(turn)
    tip_dir = Vector((-math.cos(heading), 0, math.sin(heading)))
    bulb_end = pos + tip_dir * .040
    sting_dir = Vector((-math.cos(heading + 1.25), 0, math.sin(heading + 1.25)))
    sting_end = bulb_end + sting_dir * .034
    a.bone('sting', tuple(pos), tuple(bulb_end), previous)
    a.tube3([pos, pos.lerp(bulb_end, .45), bulb_end, bulb_end.lerp(sting_end, .5) + tip_dir * .006, sting_end],
            [.009, .0165, .010, .0045, .0006], lambda p: DARK if (Vector(p) - bulb_end).length > .016 and Vector(p).x > bulb_end.x else STRAW,
            'sting', 8)

    for side, s in (('L', 1), ('R', -1)):
        # Arm: upper arm out to the side, forearm forward, then the swollen claw.
        shoulder, elbow, wrist = Vector((.100, s * .028, BODY_Z)), Vector((.128, s * .098, BODY_Z + .012)), Vector((.205, s * .118, BODY_Z + .004))
        palm, tip = Vector((.268, s * .098, BODY_Z)), Vector((.336, s * .076, BODY_Z - .004))
        a.bone('arm1.' + side, tuple(shoulder), tuple(elbow), 'body')
        a.bone('arm2.' + side, tuple(elbow), tuple(wrist), 'arm1.' + side)
        a.bone('claw.' + side, tuple(wrist), tuple(tip), 'arm2.' + side)
        a.bone('finger.' + side, tuple(palm), tuple(tip + Vector((0, -s * .020, 0))), 'claw.' + side)
        limb = lambda p: o.mix(STRAW, PALE, o.mottle(p, 7))
        a.tube3([shoulder, shoulder.lerp(elbow, .5), elbow], [.0095, .012, .0105], limb, o.near(a, ['arm1.' + side, 'body']), 7)
        a.tube3([elbow, elbow.lerp(wrist, .5), wrist], [.0105, .014, .0105], limb, o.near(a, ['arm2.' + side, 'arm1.' + side]), 7)
        # The hand swells, then narrows into the fixed finger on the outside.
        a.tube3([wrist, wrist.lerp(palm, .55), palm, palm.lerp(tip, .5) + Vector((0, s * .008, 0)), tip],
                [.0110, .0290, .0240, .0068, .0012], lambda p: o.mix(limb(p), (.20, .13, .06), o.smooth((p.x - .30) / .04)),
                'claw.' + side, 8, .78)
        inner = palm + Vector((.004, -s * .014, 0))
        a.tube3([inner, inner.lerp(tip, .5) + Vector((0, -s * .012, 0)), tip + Vector((0, -s * .020, 0))], [.0085, .0056, .0010],
                lambda p: o.mix(limb(p), (.20, .13, .06), o.smooth((p.x - .30) / .04)), 'finger.' + side, 6, .78)
        for k, (root_x, reach_x, reach_y) in enumerate(LEG_SETS):
            name = 'leg%d.%s' % (k + 1, side)
            root = Vector((root_x, s * .030, BODY_Z - .006))
            foot = Vector((root_x + reach_x, s * reach_y, .004))
            # A high knee set a little ahead of the line (front pairs) or behind it (rear pairs).
            knee = root.lerp(foot, .42) + Vector((.014 if k < 2 else -.014, 0, .050 + .005 * k))
            shin = knee.lerp(foot, .50) + Vector((0, s * .010, .014))
            a.bone(name + '.upper', tuple(root), tuple(knee), 'body')
            a.bone(name + '.lower', tuple(knee), tuple(foot), name + '.upper')
            a.tube3([root, root.lerp(knee, .5), knee], [.0100, .0092, .0082], limb, o.near(a, [name + '.upper', 'body']), 6)
            a.tube3([knee, shin, foot], [.0082, .0062, .0020], limb, o.near(a, [name + '.lower', name + '.upper']), 6)

    o.finish(a, c, output, [('Idle', 120, idle), ('Walk', 20, walk)])


def idle(obj, t):
    import original as o
    w = 2 * math.pi * t
    for k in range(1, 6):
        o.turn(obj, 'tail%d' % k, .035 * math.sin(w + k * .5), (0, 0, 1))
        o.turn(obj, 'tail%d' % k, .020 * math.sin(2 * w + k * .4))
    o.turn(obj, 'sting', .10 * math.sin(2 * w))
    for side, s in (('L', 1), ('R', -1)):
        o.turn(obj, 'finger.' + side, s * (.16 + .16 * math.sin(2 * w + (0 if s > 0 else 1.4))), (0, 0, 1))
        o.turn(obj, 'arm1.' + side, s * .06 * math.sin(w + (0 if s > 0 else .8)), (0, 0, 1))
        o.turn(obj, 'arm2.' + side, .04 * math.sin(2 * w + 1))
    o.stretch(obj, 'body', (1, 1 + .015 * math.sin(3 * w), 1 + .03 * math.sin(3 * w)))


def walk(obj, t):
    import original as o
    w = 2 * math.pi * t
    for side, s in (('L', 1), ('R', -1)):
        for k in range(4):
            # Two alternating sets: legs 1 and 3 of one side with 2 and 4 of the other.
            offset = .5 * ((k + (s > 0)) % 2) + .04 * k
            o.sprawl_step(obj, 'leg%d.%s.upper' % (k + 1, side), s, (t + offset) % 1, .26, .16)
        o.turn(obj, 'arm1.' + side, s * .04 * math.sin(w + (0 if s > 0 else math.pi)), (0, 0, 1))
        o.turn(obj, 'finger.' + side, s * .10, (0, 0, 1))
    for k in range(1, 6):
        o.turn(obj, 'tail%d' % k, .022 * math.sin(2 * w + k * .6))
        o.turn(obj, 'tail%d' % k, .020 * math.sin(w + k * .5), (0, 0, 1))
    o.turn(obj, 'body', .012 * math.sin(2 * w), (1, 0, 0))


if __name__ == '__main__':
    cli(ID, build)
