"""Eifel Crown C5 landmarks: the ruined castle on its crag and a module of the reservoir dam wall.

blender -b --disable-autoexec --python-exit-code 1 --python tools/blender/eifel/landmarks.py -- --root .
Add --only eifel-castle (or dam-wall) to rebuild one piece.
Writes the runtime GLBs and the measured sizes (landmarks.json), never a blend file.
Blender axes: X across the piece, Y front to back (the front, the side the road sees, is -Y),
Z up; glTF export turns this into Y up. The lowest point of each piece stands on y = 0.
Everything is original shapes (boxes, rings of rock, cones) with fixed seeds, no outside models
or textures, so the same recipe always gives the same files.
"""
import argparse
import hashlib
import json
import math
import random
import sys
from pathlib import Path

import bpy
from mathutils import Vector

# (High triangles, LOD triangles), from docs/courses/eifel-crown.md section 2.3.
BUDGETS = {'eifel-castle': (7000, 2000), 'dam-wall': (2500, 800), 'eifel-lodge': (1500, 500)}


def material(name, rgb, rough=1.0):
    m = bpy.data.materials.new(name)
    m.diffuse_color = (*rgb, 1)
    m.use_nodes = True
    p = m.node_tree.nodes.get('Principled BSDF')
    p.inputs['Base Color'].default_value = (*rgb, 1)
    p.inputs['Roughness'].default_value = rough
    p.inputs['Metallic'].default_value = 0
    p.inputs['Specular IOR Level'].default_value = 0
    return m


class Builder:
    """Collects vertices and quads, each quad with its material slot."""

    def __init__(self, materials):
        self.materials, self.verts, self.faces, self.slots = materials, [], [], []

    def quad(self, points, slot):
        base = len(self.verts)
        self.verts.extend(points)
        self.faces.append((base, base + 1, base + 2, base + 3))
        self.slots.append(slot)

    def tri(self, points, slot):
        base = len(self.verts)
        self.verts.extend(points)
        self.faces.append((base, base + 1, base + 2))
        self.slots.append(slot)

    def box(self, centre, size, slot, yaw=0, roll=0, skip=(), taper=0.0):
        """An upright box. `skip` names faces left out because nobody sees them:
        'bottom', 'top', 'back' (+Y side), 'front' (-Y side), 'left' or 'right' end.
        `taper` pulls the top face in by that many metres each way (a batter)."""
        cx, cy, cz = centre
        hx, hy, hz = size[0] / 2, size[1] / 2, size[2] / 2
        cs, sn, cr, sr = math.cos(yaw), math.sin(yaw), math.cos(roll), math.sin(roll)

        def at(x, y, z):
            y, z = y * cr - z * sr, y * sr + z * cr
            return (cx + x * cs - y * sn, cy + x * sn + y * cs, cz + z)

        def corner(i, j, k):
            pull = taper if k > 0 else 0
            return at(i * max(.05, hx - pull), j * max(.05, hy - pull), k * hz)

        c = {(i, j, k): corner(i, j, k) for i in (-1, 1) for j in (-1, 1) for k in (-1, 1)}
        sides = {
            'top': [c[-1, -1, 1], c[1, -1, 1], c[1, 1, 1], c[-1, 1, 1]],
            'bottom': [c[-1, 1, -1], c[1, 1, -1], c[1, -1, -1], c[-1, -1, -1]],
            'front': [c[-1, -1, -1], c[1, -1, -1], c[1, -1, 1], c[-1, -1, 1]],
            'back': [c[1, 1, -1], c[-1, 1, -1], c[-1, 1, 1], c[1, 1, 1]],
            'left': [c[-1, 1, -1], c[-1, -1, -1], c[-1, -1, 1], c[-1, 1, 1]],
            'right': [c[1, -1, -1], c[1, 1, -1], c[1, 1, 1], c[1, -1, 1]],
        }
        for name, points in sides.items():
            if name not in skip:
                self.quad(points, slot)

    def ngon(self, points, slot):
        base = len(self.verts)
        self.verts.extend(points)
        self.faces.append(tuple(range(base, base + len(points))))
        self.slots.append(slot)

    def cone(self, centre, radius, height, slot, sides=5):
        cx, cy, cz = centre
        ring = [(cx + radius * math.cos(a * 2 * math.pi / sides), cy + radius * math.sin(a * 2 * math.pi / sides), cz)
                for a in range(sides)]
        apex = (cx, cy, cz + height)
        for a in range(sides):
            self.tri([ring[a], ring[(a + 1) % sides], apex], slot)

    def build(self, name, smooth=False):
        mesh = bpy.data.meshes.new(name)
        mesh.from_pydata(self.verts, [], self.faces)
        for m in self.materials:
            mesh.materials.append(m)
        for polygon, slot in zip(mesh.polygons, self.slots):
            polygon.material_index = slot
            polygon.use_smooth = smooth
        mesh.update()
        o = bpy.data.objects.new(name, mesh)
        bpy.context.collection.objects.link(o)
        return o


# ---------------------------------------------------------------------------
# The castle

def castle(low):
    """A ruined castle of pale local stone on a crag of dark rock: a broken square keep, a round
    corner tower, a stub of curtain wall with a few merlons left, a gate with one pier standing,
    fallen stone at the foot, and spruce on the ledges. Seen from across the valley it must read as
    one strong silhouette: keep on the left, a long wall to the right, the crag steep below."""
    rng = random.Random(1989 + 11 * low)
    rock = [material('crag rock ' + str(i), c) for i, c in enumerate([
        (.040, .040, .038), (.055, .052, .046), (.032, .034, .033), (.065, .058, .047)])]
    moss = material('crag moss', (.030, .056, .020))
    grass = material('crag grass', (.045, .075, .028))
    wall = [material('castle stone ' + str(i), c) for i, c in enumerate([
        (.165, .15, .125), (.14, .135, .115), (.195, .178, .146), (.12, .115, .098)])]
    shadow = material('castle opening', (.012, .012, .012))
    ivy = material('castle ivy', (.028, .05, .018))
    spruce = material('crag spruce', (.012, .035, .018))
    earth = material('castle floor', (.05, .045, .032))
    b = Builder(rock + [moss, grass] + wall + [shadow, ivy, spruce, earth])
    ROCK, MOSS, GRASS, WALL, SHADOW, IVY, SPRUCE, EARTH = 0, 4, 5, 6, 10, 11, 12, 13

    # --- The crag: rings of rock, steep faces with a ledge now and then.
    sides = 24 if low else 36
    profile = [(0.0, 22.0), (2.8, 20.4), (3.8, 17.6), (8.6, 16.6), (9.8, 14.9), (14.2, 14.1), (15.6, 12.9),
               (20.0, 12.6)]
    if low:
        profile = [(0.0, 22.0), (3.8, 17.6), (9.8, 14.9), (15.6, 12.9), (20.0, 12.6)]
    wobble = [[rng.uniform(-.14, .14) * (.45 if i == len(profile) - 1 else 1) for _ in range(sides)] for i in range(len(profile))]
    # A buttress of rock reaching toward the front, where the road sees it, and a shoulder to the back.
    def ring(i):
        z, r = profile[i]
        out = []
        for k in range(sides):
            a = k * 2 * math.pi / sides
            bulge = 1 + .20 * max(0, math.cos(a + 1.35)) ** 2 + .1 * math.sin(a * 3 + 1.0)
            rr = r * (bulge if i < len(profile) - 1 else 1 + .06 * math.sin(a * 3 + 1.0)) * (1 + wobble[i][k])
            zz = z + (rng.uniform(-.5, .5) if 0 < i < len(profile) - 1 else 0)
            out.append((rr * math.cos(a), rr * math.sin(a) - 2.0, zz))
        return out
    rings = [ring(i) for i in range(len(profile))]
    for i in range(len(profile) - 1):
        ledge = abs(profile[i + 1][1] - profile[i][1]) > 2.2 and profile[i + 1][0] - profile[i][0] < 1.6
        for k in range(sides):
            n = (k + 1) % sides
            a, c = rings[i][k], rings[i][n]
            d, e = rings[i + 1][k], rings[i + 1][n]
            roll = rng.random()
            slot = (MOSS if roll < .35 else GRASS if roll < .6 else ROCK + rng.randrange(4)) if ledge \
                else (MOSS if (roll < .06 and i > 0) else ROCK + rng.randrange(4))
            b.quad([a, c, e, d], slot)
    # The top of the crag: the castle floor, a fan of triangles to the middle.
    top = rings[-1]
    mid = (0, -2.0, profile[-1][0])
    for k in range(sides):
        b.tri([top[k], top[(k + 1) % sides], mid], EARTH)
    # Boulders at the foot and on the ledges.
    for _ in range(0 if low else 22):
        a = rng.uniform(0, 2 * math.pi)
        r = rng.uniform(19.0, 22.5)
        z = rng.uniform(-.2, .6)
        s = rng.uniform(1.0, 2.8)
        b.box((r * math.cos(a), r * math.sin(a) - 2.0, z + s * .4), (s * 1.3, s, s * .8), ROCK + rng.randrange(4),
              yaw=rng.uniform(0, 3.1), roll=rng.uniform(-.2, .2), skip=('bottom',))

    top_z = profile[-1][0]
    ZW = lambda i: WALL + i % 4

    # --- The keep: a square tower at the back left, broken at the top and on one corner.
    kx, ky = -4.2, 4.6
    cells = 3
    cell = 3.1
    heights = [[27.0, 25.5, 22.0], [25.0, 9.0, 19.5], [26.5, 24.0, 16.0]]
    for i in range(cells):
        for j in range(cells):
            h = heights[i][j]
            edge = i in (0, cells - 1) or j in (0, cells - 1)
            skip = ['bottom']
            b.box((kx + (i - (cells - 1) / 2) * cell, ky + (j - (cells - 1) / 2) * cell, top_z + h / 2),
                  (cell + .02, cell + .02, h), ZW(i * 3 + j), taper=0.0, skip=tuple(skip),
                  yaw=0)
    # String courses and the quoin stones at the corners, a shade paler.
    if True:
        for z in (8.6, 17.2):
            b.box((kx, ky, top_z + z), (cells * cell + .5, cells * cell + .5, .45), WALL + 2, skip=('bottom',))
        for sx in (-1, 1):
            for sy in (-1, 1):
                b.box((kx + sx * (cells * cell / 2 + .05), ky + sy * (cells * cell / 2 + .05), top_z + 10.5),
                      (.9, .9, 21.0), WALL + 2, skip=('bottom',))
        # Arrow slits and one big broken window high on the front face.
        for z, x in ((5.0, -2.6), (5.0, 2.6), (12.5, -2.6), (12.5, 2.6)):
            b.box((kx + x, ky - cells * cell / 2 - .02, top_z + z), (.38, .14, 1.7), SHADOW)
        b.box((kx + .4, ky - cells * cell / 2 - .03, top_z + 18.5), (1.9, .16, 3.3), SHADOW)
        b.box((kx - cells * cell / 2 - .03, ky + .3, top_z + 15.5), (.16, 1.7, 3.0), SHADOW)
        # Merlons left standing on the two higher corners.
        for (i, j), (sx, sy) in (((0, 0), (-1, -1)), ((2, 0), (1, -1)), ((0, 2), (-1, 1))):
            for t in (-1, 0, 1):
                b.box((kx + (i - 1) * cell + t * 1.05 * (1 if sy else 0), ky + (j - 1) * cell + (sy * 1.3), top_z + heights[i][j] + .55),
                      (.9, .9, 1.1), ZW(rng.randrange(4)), skip=('bottom',))
    # Ivy up the front of the keep.
    b.box((kx - 3.2, ky - cells * cell / 2 - .06, top_z + 6.0), (2.4, .1, 11.0), IVY, skip=('bottom', 'top'))

    # --- The round tower at the front right, with a ragged, slanting top.
    tx, ty, tr = 7.4, -6.6, 3.0
    ring_n = 8 if low else 12
    tops = [11.5 + 4.5 * max(0, math.cos(k * 2 * math.pi / ring_n - .6)) + rng.uniform(-.3, .3) for k in range(ring_n)]
    for k in range(ring_n):
        a0, a1 = k * 2 * math.pi / ring_n, (k + 1) * 2 * math.pi / ring_n
        h0, h1 = tops[k], tops[(k + 1) % ring_n]
        p = lambda a, z: (tx + tr * math.cos(a), ty + tr * math.sin(a), top_z + z)
        b.quad([p(a0, 0), p(a1, 0), p(a1, h1), p(a0, h0)], ZW(k))
        b.tri([p(a0, h0), p(a1, h1), (tx, ty, top_z + (h0 + h1) / 2 - 1.2)], WALL + 3)
    if not low:
        b.box((tx - 1.0, ty - tr - .02, top_z + 8.0), (.38, .14, 1.6), SHADOW)

    # --- Curtain wall: edges between corner points, full wall, low stump, or gone.
    corners = [(-9.5, -7.0), (-3.5, -10.3), (tx, ty), (10.2, 1.2), (7.6, 7.2), (kx + 3.8, ky + 4.6), (kx - 4.4, ky + 4.0),
               (-10.4, 0.0)]
    states = ['gate', 'low', 'full', 'full', 'gap', 'low', 'full', 'full']
    if low:
        states = ['low', 'low', 'full', 'full', 'gap', 'low', 'full', 'full']
    for e in range(len(corners)):
        (x0, y0), (x1, y1) = corners[e], corners[(e + 1) % len(corners)]
        length = math.hypot(x1 - x0, y1 - y0)
        yaw = math.atan2(y1 - y0, x1 - x0)
        mx, my = (x0 + x1) / 2, (y0 + y1) / 2
        state = states[e]
        if state == 'full':
            b.box((mx, my, top_z + 3.6), (length, 1.9, 7.2), ZW(e), yaw=yaw, skip=('bottom', 'left', 'right'))
            if not low:
                # Wall-walk merlons on the outer side, with gaps where they have fallen.
                steps = int(length / 2.3)
                for m in range(steps):
                    if rng.random() < .35:
                        continue
                    t = (m + .5) / steps - .5
                    px, py = mx + math.cos(yaw) * t * length, my + math.sin(yaw) * t * length
                    b.box((px + math.sin(yaw) * .65, py - math.cos(yaw) * .65, top_z + 7.2 + .55), (1.2, .7, 1.1), ZW(m),
                          yaw=yaw, skip=('bottom',))
        elif state == 'low':
            pieces = 2 if low else 4
            for p in range(pieces):
                t0, t1 = p / pieces - .5, (p + 1) / pieces - .5
                h = rng.uniform(1.8, 5.2)
                px = mx + math.cos(yaw) * (t0 + t1) / 2 * length
                py = my + math.sin(yaw) * (t0 + t1) / 2 * length
                b.box((px, py, top_z + h / 2), (length / pieces + .1, 1.9, h), ZW(p + e), yaw=yaw,
                      skip=('bottom', 'left', 'right'), roll=rng.uniform(-.05, .05))
        elif state == 'gate':
            # Two piers and the stub of an arch between them.
            for side in (-1, 1):
                px, py = mx + math.cos(yaw) * side * length * .38, my + math.sin(yaw) * side * length * .38
                b.box((px, py, top_z + (4.8 if side < 0 else 3.2)), (2.0, 2.4, 9.6 if side < 0 else 6.4), ZW(e + side),
                      yaw=yaw, skip=('bottom',))
            if not low:
                b.box((mx - math.cos(yaw) * length * .22, my - math.sin(yaw) * length * .22, top_z + 8.4),
                      (length * .22, 1.9, 1.4), WALL + 2, yaw=yaw, skip=('bottom',))
                b.box((mx, my - .05, top_z + 2.1), (length * .26, 1.5, 4.2), SHADOW, yaw=yaw)
        else:
            pass
    # A second stub of tower at the back right, low and mossy.
    if not low:
        b.box((9.2, 4.2, top_z + 4.8), (3.6, 3.6, 9.6), WALL + 1, yaw=.5, skip=('bottom',))
        b.box((9.5, 3.9, top_z + 10.3), (1.8, 1.8, 1.4), WALL + 2, yaw=.5, skip=('bottom',))

    # Rubble inside and below the walls, and fallen blocks.
    count = 12 if low else 70
    for _ in range(count):
        a = rng.uniform(0, 2 * math.pi)
        r = rng.uniform(4, 11.5)
        s = rng.uniform(.5, 1.6)
        b.box((r * math.cos(a), r * math.sin(a) - 2.0, top_z + s * .35), (s * 1.3, s, s * .7), WALL + rng.randrange(4),
              yaw=rng.uniform(0, 3.1), roll=rng.uniform(-.25, .25), skip=('bottom',))

    # A few spruce on the crag ledges, and tufts of scrub at the foot.
    trees = 4 if low else 14
    for _ in range(trees):
        a = rng.uniform(0, 2 * math.pi)
        zi = rng.choice([1, 3, 5])
        z, r = profile[min(zi, len(profile) - 1)]
        h = rng.uniform(4.0, 8.0)
        b.cone((r * .97 * math.cos(a), r * .97 * math.sin(a) - 2.0, z - .4), h * .26, h, SPRUCE, sides=5)
    return b.build('eifel-castle')


# ---------------------------------------------------------------------------
# The dam: one 14 m module of a concrete gravity dam, seen from the water.

def dam(low):
    """Grey concrete: a vertical upstream face, a roadway on the crest between low parapets, a stepped
    downstream face, expansion joints at the module ends, damp staining and green algae at the water line.
    Modules stand end to end. Front (-Y) is the lake; the foot is buried 2.5 m so the ground never shows a gap."""
    rng = random.Random(7 + 5 * low)
    concrete = [material('dam concrete ' + str(i), c) for i, c in enumerate([
        (.019, .022, .027), (.016, .019, .023), (.022, .025, .03)])]
    stain = material('dam stain', (.009, .0105, .013))
    algae = material('dam algae', (.007, .013, .008))
    road = material('dam roadway', (.008, .009, .011))
    steel = material('dam railing', (.02, .022, .022), rough=.7)
    joint = material('dam joint', (.03, .03, .03))
    b = Builder(concrete + [stain, algae, road, steel, joint])
    STAIN, ALGAE, ROAD, STEEL, JOINT = 3, 4, 5, 6, 7
    L = 14.0
    hx = L / 2
    crest, face = 9.0, -5.0
    # The cross-section, front to back: lake face up, crest across, then the steps down the back.
    profile = [(face, -2.5), (face, crest), (0.2, crest), (0.2, 6.5), (2.4, 6.5), (2.4, 3.4), (4.6, 3.4), (4.6, 0.0),
               (7.0, 0.0), (7.0, -2.5)]
    rows = 2 if low else 5
    for i in range(len(profile) - 1):
        (y0, z0), (y1, z1) = profile[i], profile[i + 1]
        if i == 0:
            # The lake face in horizontal courses, a shade apart.
            for r in range(rows):
                za, zb = z0 + (z1 - z0) * r / rows, z0 + (z1 - z0) * (r + 1) / rows
                b.quad([(-hx, y0, za), (hx, y0, za), (hx, y0, zb), (-hx, y0, zb)], (r * 2 + 1) % 3)
        else:
            b.quad([(-hx, y0, z0), (hx, y0, z0), (hx, y1, z1), (-hx, y1, z1)], 2 if z1 >= z0 else 1)
    for x in (-hx, hx):
        pts = [(x, y, z) for y, z in profile]
        b.ngon(pts if x < 0 else pts[::-1], 3 + 3)
    # Crest roadway between low parapets.
    b.box((0, (face + 0.2) / 2, crest + .05), (L, 0.2 - face - .9, .12), ROAD, skip=('bottom',))
    b.box((0, face + .25, crest + .6), (L, .5, 1.2), 2, skip=('bottom',))
    b.box((0, -.05, crest + .6), (L, .5, 1.2), 2, skip=('bottom',))
    if not low:
        # A steel handrail along the lake side of the crest.
        for p in range(5):
            x = -hx + .4 + p * (L - .8) / 4
            b.box((x, face + .25, crest + 1.55), (.1, .1, .75), STEEL, skip=('bottom',))
        b.box((0, face + .25, crest + 1.9), (L, .08, .1), STEEL, skip=('bottom',))
        # Vertical expansion joints at the module ends, and damp streaks down the lake face.
        for x in (-hx + .06, hx - .06):
            b.box((x, face - .015, crest / 2), (.12, .06, crest), JOINT, skip=('bottom',))
        for _ in range(8):
            x = rng.uniform(-hx + .8, hx - .8)
            h = rng.uniform(2.5, 7.0)
            b.box((x, face - .015, crest - h / 2 - .1), (rng.uniform(.25, .7), .05, h), STAIN, skip=('bottom', 'top'))
        # Algae and a wet skirt at the water line.
        b.box((0, face - .02, .7), (L, .05, 1.4), ALGAE, skip=('bottom', 'top'))
        b.box((0, face - .02, -.9), (L, .05, 1.6), STAIN, skip=('bottom', 'top'))
        # Pilasters on the lake face at both module ends.
        for x in (-hx + .35, hx - .35):
            b.box((x, face - .15, crest / 2), (.7, .3, crest), 0, skip=('bottom',))
        # Weep holes in the downstream steps.
        for x in (-4.5, 0.0, 4.5):
            b.box((x, 4.65, 1.4), (.7, .06, .45), JOINT)
    return b.build('dam-wall')


# ---------------------------------------------------------------------------
# The lodge: a timber lodge beside the start straight, in the Eifel's own look (no snow on the roof).

def lodge(low):
    """A two-storey log lodge, 12 m by 9 m, on a dark stone plinth, under a steep roof of dark wood shingles,
    a stone chimney at one end, a covered veranda across the front with a plank rail, and a few shuttered
    windows. Front (-Y) faces the road."""
    rng = random.Random(23 + low)
    logs = [material('lodge logs ' + str(i), c) for i, c in enumerate([(.095, .052, .028), (.082, .046, .025), (.11, .06, .032)])]
    plank = material('lodge planks', (.07, .042, .024))
    shingle = [material('lodge shingles ' + str(i), c) for i, c in enumerate([(.028, .026, .024), (.036, .033, .03)])]
    stone = material('lodge stone', (.07, .068, .062))
    glass = material('lodge window', (.012, .016, .02), rough=.3)
    shutter = material('lodge shutters', (.025, .06, .04))
    b = Builder(logs + [plank] + shingle + [stone, glass, shutter])
    PLANK, SHINGLE, STONE, GLASS, SHUTTER = 3, 4, 6, 7, 8
    W, D, H = 12.0, 9.0, 6.4
    # Plinth and log walls, courses of round logs so the face shows its lines.
    b.box((0, 0, .45), (W + .5, D + .5, .9), STONE, skip=('bottom',))
    courses = 6 if low else 14
    ch = (H - .9) / courses
    for c in range(courses):
        z = .9 + ch * (c + .5)
        shade = rng.randrange(3)
        b.box((0, 0, z), (W, D, ch * .96), shade, skip=('bottom', 'top') if c < courses - 1 else ('bottom',))
        if not low:
            # Log ends crossing at the corners.
            for sx in (-1, 1):
                for sy in (-1, 1):
                    b.box((sx * (W / 2 + .1), sy * (D / 2 + .1), z), (.5, .5, ch * .8), (shade + 1) % 3, skip=('bottom', 'top'))
    # The roof: two slopes meeting at a ridge along X, with a deep overhang; gable ends of vertical planks.
    ridge = 3.4
    for side in (-1, 1):
        y0, y1 = side * (D / 2 + 1.2), 0
        pts = [(-W / 2 - .7, y0, H - .15), (W / 2 + .7, y0, H - .15), (W / 2 + .7, y1, H + ridge), (-W / 2 - .7, y1, H + ridge)]
        b.quad(pts if side < 0 else pts[::-1], SHINGLE + (0 if side < 0 else 1))
    for sx in (-1, 1):
        x = sx * (W / 2 + .02)
        tri = [(x, -D / 2, H), (x, D / 2, H), (x, 0, H + ridge)]
        b.tri(tri if sx > 0 else tri[::-1], PLANK)
    # Chimney at the left end, stone, rising clear of the ridge.
    b.box((-W / 2 - .2, 0, (H + ridge + 1.6) / 2), (1.4, 1.8, H + ridge + 1.6), STONE, skip=('bottom',))
    # Veranda: a deck, posts, a plank rail and a shallow shed roof across the front.
    b.box((0, -D / 2 - 1.5, .95), (W - .5, 3.0, .12), PLANK, skip=('bottom',))
    for px in ([-W / 2 + .5, 0, W / 2 - .5] if not low else [-W / 2 + .5, W / 2 - .5]):
        b.box((px, -D / 2 - 2.8, 2.1), (.28, .28, 2.4), 0, skip=('bottom',))
    b.box((0, -D / 2 - 1.6, 3.4), (W + .6, 3.6, .16), SHINGLE, skip=('bottom',), roll=-.12)
    b.box((0, -D / 2 - 2.8, 1.5), (W - .6, .1, .8), PLANK, skip=('bottom',))
    # Windows with shutters, a door with a lintel.
    for x in (-W * .32, -W * .08, W * .3):
        for z in (2.0, 4.6):
            b.box((x, -D / 2 - .03, z), (1.1, .08, 1.2), GLASS)
            if not low:
                for sx in (-1, 1):
                    b.box((x + sx * .85, -D / 2 - .06, z), (.5, .06, 1.2), SHUTTER)
    b.box((W * .15, -D / 2 - .03, 2.0), (1.2, .08, 2.2), PLANK)
    return b.build('eifel-lodge')


MAKERS = {'eifel-castle': castle, 'dam-wall': dam, 'eifel-lodge': lodge}


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--root', type=Path, required=True)
    p.add_argument('--only', nargs='+', choices=list(BUDGETS))
    args = p.parse_args(sys.argv[sys.argv.index('--') + 1:])
    root = args.root.resolve()
    runtime = root / 'public/assets/models/circuits/kits'
    measured_path = root / 'tools/blender/eifel/landmarks.json'
    existing = {m['id']: m for m in json.loads(measured_path.read_text(encoding='utf-8'))['models']} \
        if measured_path.exists() else {}
    records = []
    for id, caps in BUDGETS.items():
        if args.only and id not in args.only:
            records.append(existing[id])
            continue
        record = {'id': id, 'budget': caps, 'files': []}
        for low in (False, True):
            bpy.ops.object.select_all(action='SELECT')
            bpy.ops.object.delete(use_global=False)
            for m in list(bpy.data.materials):
                bpy.data.materials.remove(m)
            o = MAKERS[id](int(low))
            bpy.context.view_layer.objects.active = o
            o.name = id
            bpy.context.view_layer.update()
            o.data.calc_loop_triangles()
            tris = len(o.data.loop_triangles)
            if tris > caps[int(low)]:
                raise ValueError(f'{id}: {tris} triangles exceed {caps[int(low)]}')
            points = [o.matrix_world @ Vector(v) for v in o.bound_box]
            lows = [min(v[i] for v in points) for i in range(3)]
            highs = [max(v[i] for v in points) for i in range(3)]
            # Stand on y = 0 (Blender z), centred across x and y.
            o.location = (-(highs[0] + lows[0]) / 2, -(highs[1] + lows[1]) / 2, -lows[2])
            bpy.ops.object.select_all(action='DESELECT')
            o.select_set(True)
            bpy.ops.object.transform_apply(location=True, rotation=False, scale=False)
            points = [o.matrix_world @ Vector(v) for v in o.bound_box]
            size = [max(v[i] for v in points) - min(v[i] for v in points) for i in (0, 2, 1)]
            path = runtime / (id + ('-lod' if low else '') + '.glb')
            bpy.ops.export_scene.gltf(filepath=str(path), export_format='GLB', export_yup=True,
                                      export_cameras=False, export_lights=False, export_animations=False)
            record['files'].append({'path': path.name, 'triangles': tris, 'size': [round(v, 3) for v in size],
                                    'bytes': path.stat().st_size,
                                    'sha256': hashlib.sha256(path.read_bytes()).hexdigest()})
        records.append(record)
    measured_path.write_text(json.dumps({
        'card': 'EIFEL-CROWN-C5', 'round': 1, 'units': 'metres', 'up': 'Y',
        'source': 'Original shapes made by tools/blender/eifel/landmarks.py; no outside models or textures.',
        'models': records}, indent=2) + '\n', encoding='utf-8', newline='\n')
    print(json.dumps(records))


main()
