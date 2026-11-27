#!/usr/bin/env python3
"""
build_compact.py - Compact Auto Regear Shulker Maker (Minecraft Java 1.21.4)

Works with any hopper speed (singleplayer and servers that move 8 items per transfer): every slot
is measured by a decorated pot (holds exactly one full stack) and nothing depends on hopper timing.

Layout (x = along the machine, slot 1 nearest the shulker station at the west end):
  * Four stacked rows of 9 slots: Hotbar (bottom, with the control room and the shared shulker
    station), then Inventory slots 1-9, 10-18, 19-27. Each row has its own token chain and latch;
    the upper rows' item lines drop down a hopper column into the bottom row's injector.
  * Every slot: barrel (you put the item in it) -> hopper with 4 "Blocker" boxes -> decorated pot
    (exactly one stack) -> drain hopper -> item line -> shulker box.
  * The button drops a token into the row's hopper chain. The first chain hopper of every slot is
    held locked until that slot's pot is empty, so the token stops at each slot in turn, the slot
    drains while the token is there, and slots fill strictly one after another.
  * A copper bulb latch ("kit running") locks every refill hopper from the press until the box is
    finished; afterwards every pot refills from its barrel.

Run:  python3 build_compact.py [--test]
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from mcgen import *          # noqa: F401,F403
import mcgen as G
from nbtlib import Compound, Int, List, String, Byte

TEST = "--test" in sys.argv
ROW = 2 if TEST else 9      # slots per row; the Inventory kit uses 3 stacked rows
N_INV = 3 * ROW
N_HOT = ROW
ROW_DY = 6                  # height of one row
MC_DATA_VERSION_1_21_4 = 4189
PACK_FORMAT_1_21_4 = 61

C, O, T, GL, P_, X, A_, GA = ("end_crystal", "obsidian", "totem_of_undying", "glowstone",
                              "ender_pearl", "experience_bottle", "respawn_anchor", "golden_apple")
SW, PK = "netherite_sword", "netherite_pickaxe"
FULL_LAYOUT = [P_, T, T, T, T, T, T, T, X,
               P_, T, T, T, T, T, T, T, X,
               P_, C, O, P_, T, T, T, T, X]
HOTBAR_LAYOUT = [SW, C, O, P_, T, GL, A_, GA, PK]
if TEST:
    FULL_LAYOUT = [P_, T, T, P_, X, P_]
    HOTBAR_LAYOUT = [T, P_]
STACK = {C: 64, O: 64, T: 1, GL: 64, P_: 16, X: 64, A_: 64, GA: 64, SW: 1, PK: 1}

put, dust, repeater, comparator, torch = G.put, G.dust, G.repeater, G.comparator, G.torch
container, hopper, item, support = G.container, G.hopper, G.item, G.support
SUP, COMP = G.SUPPORT, G.COMPONENT


def blocker(slot):
    return item(slot, "black_shulker_box", 1, name="Blocker")


def sign(pos, facing, lines, glow=False, color="black"):
    lines = (list(lines) + ["", "", "", ""])[:4]
    put(pos, "oak_wall_sign", COMP, facing=facing, waterlogged=False)
    msg = lambda ls: List[String]([String('"%s"' % t) for t in ls])
    G.TILES[G.T(pos)] = Compound({
        "id": String("minecraft:sign"), "is_waxed": Byte(1),
        "front_text": Compound({"messages": msg(lines), "color": String(color),
                                "has_glowing_text": Byte(1 if glow else 0)}),
        "back_text": Compound({"messages": msg([""] * 4), "color": String("black"),
                               "has_glowing_text": Byte(0)})})


def floor_sign(pos, rotation, lines, glow=False, color="black"):
    lines = (list(lines) + ["", "", "", ""])[:4]
    put(pos, "oak_sign", COMP, rotation=rotation, waterlogged=False)
    msg = lambda ls: List[String]([String('"%s"' % t) for t in ls])
    G.TILES[G.T(pos)] = Compound({
        "id": String("minecraft:sign"), "is_waxed": Byte(1),
        "front_text": Compound({"messages": msg(lines), "color": String(color),
                                "has_glowing_text": Byte(1 if glow else 0)}),
        "back_text": Compound({"messages": msg(lines), "color": String(color),
                               "has_glowing_text": Byte(1 if glow else 0)})})


def named(pos, block, name, items=(), **props):
    container(pos, block, items, **props)
    G.TILES[G.T(pos)]["CustomName"] = String('"%s"' % name)


def wall_torch(pos, facing, lit):
    put(pos, "redstone_wall_torch", COMP, facing=facing, lit=lit)


# ---------------------------------------------------------------------------------------------
# Everything is built per ROW (Inventory row at y=0, Hotbar row stacked 9 blocks above) with its
# own token chain, clock, start detector, delay line and shulker station.  Row-local coordinates:
#   z = -1 module stack, z = 0/1 drain + item line, z < -1 control logic, x = 3m+1..3m+3 slot m.
def module(m, itm, label, Y, side, slot):
    a, b = 3 * m + 1, 3 * m + 2
    P = lambda x, y, z: (x, y + Y, z)
    hopper(P(b, 3, -1), "down", enabled=True)                       # refill (fed by the pipe)
    put(P(b, 2, -1), "decorated_pot", G.CONTAINER, facing="north", cracked=False, waterlogged=False)
    G.TILES[G.T(P(b, 2, -1))] = Compound({"id": String("minecraft:decorated_pot"),
                                     "item": Compound({"id": String("minecraft:" + itm),
                                                       "count": Int(STACK[itm])})})
    hopper(P(b, 1, -1), "south", enabled=False)                     # drain (locked: no token)
    hopper(P(b, 1, 0), "south")                                     # into the line
    comparator(P(b, 2, -2), "south", signal=15)                     # pot level
    put(P(b, 2, -3), "stone")                                       # Z = NOT token OR pot not empty
    put(P(b, 0, -3), "stone")
    torch(P(b, 1, -3), lit=True)                                    # NOT token -> Z
    dust(P(b, 0, -4), f"{side}tok{m}")                              # token -> under that torch
    torch(P(b, 3, -3), lit=False)                                   # DONE = token AND pot empty
    repeater(P(b, 3, -4), "south", delay=4)                         # token must settle (hopper cooldown)
    # DONE (delayed) -> stairs down to S; the torch on S (lit = not done) holds the token in this
    # slot's chain hopper until the pot is empty
    for p in [P(b, 2, -7), P(b, 1, -8), P(a, 0, -8)]:                # P(a,0,-8) = S
        put(p, "stone")
    for p in [P(b, 3, -5), P(b, 3, -6), P(b, 3, -7), P(b, 2, -8), P(a, 1, -8)]:
        dust(p, f"{side}hold{m}")
    wall_torch(P(a, 0, -7), "south", lit=True)
    # token reader -> drain unlock (torch a,1)
    comparator(P(a, 0, -5), "north")
    put(P(a, 0, -4), "stone")                                       # TA
    repeater(P(a, 0, -3), "north")
    repeater(P(a, 0, -2), "north")
    put(P(a, 0, -1), "stone")                                       # TH
    torch(P(a, 1, -1), lit=True)                                    # NOT token: locks the drain
    put(P(b, 3, -2), "stone")                                       # refill lock (KIT bus on top)


def path(points, net):
    for p in points:
        dust(p, net)


def run(points, net):
    """Dust along points; a point given as (x, y, z, facing, delay) is a repeater instead."""
    for p in points:
        if len(p) == 5:
            repeater(p[:3], p[3], delay=p[4])
        else:
            dust(p, net)


def stair(p, net):
    """Dust on a stone step (stairs that also go down need solid steps)."""
    put((p[0], p[1] - 1, p[2]), "stone")
    dust(p, net)


def row(layout, label, Y, kind, side, slot0=1, finish=False):
    """kind: 'hot'  = front bottom row (Hotbar) with the shared shulker station
             'top'  = top row: its item line drops down the stack's hopper column
             'base' = back bottom row: its line end feeds the cross line (built outside); its
                      END starts the row above (riser)"""
    P = lambda x, y, z: (x, y + Y, z)
    n = len(layout)
    xmax = 3 * n
    station = kind == "hot"
    for x in range(1, xmax + 1):                                     # token chain (see below)
        hopper(P(x, 0, -6), "east", enabled=(x % 3 != 1))
    for m in range(n):
        module(m, layout[m], label, Y, side, slot0 + m)
    # item line; x=0 is the injector into the shulker cell (-1,1,1), or (upper rows) drops down
    for x in range(1, xmax + 1):
        hopper(P(x, 1, 1), "west")
    if kind != "base":
        hopper(P(0, 1, 1), "west" if station else "down")
    # token chain: the first hopper of every slot is held locked by that slot (see module); the rest
    # are free, so a token rolls on to the next slot as soon as the current one is done
    hopper(P(xmax + 1, 0, -6), "east")
    named(P(xmax + 2, 0, -6), "chest", f"Used tokens ({side})", facing="west", type="single",
          waterlogged=False)
    # KIT bus: on while this row is working -> every refill hopper of the row is locked
    for x in range(0, xmax + 1):
        support(P(x, 3, -2))
        if x % 12 == 1:
            repeater(P(x, 4, -2), "west")
        else:
            dust(P(x, 4, -2), f"{side}kit")
    # END: comparator on the end hopper -> delay line (4 rt per block) back west
    comparator(P(xmax + 1, 0, -7), "south")
    repeater(P(xmax + 1, 0, -8), "south")
    dust(P(xmax + 1, 0, -9), f"{side}end")
    for x in range(xmax, -4, -1):
        repeater(P(x, 0, -9), "east", delay=4)
    # START: the token dropper (beside the chain start: a hopper under it would pull tokens out)
    container(P(-1, 0, -6), "dropper", [item(i, "brick", 64, name="Token") for i in range(9)],
              facing="east", triggered=False)
    hopper(P(0, 0, -6), "east")
    dust(P(-1, 0, -5), f"{side}start")                               # powered by the fired dropper
    # KIT latch: copper bulb toggled on by START and off by END; comparator -> KIT bus
    put(P(-2, 4, -2), "waxed_copper_bulb", COMP, lit=False, powered=False)
    comparator(P(-1, 4, -2), "west")
    put(P(-2, 3, -2), "stone")                                       # START powers this -> bulb
    path([P(-2, 1, -5), P(-2, 2, -4), P(-2, 3, -3)], f"{side}start")
    if station:
        control_room(Y, side, label, finish)
    else:
        # END: delay line -> stairs -> latch
        for p in [P(-4, 0, -9), P(-4, 1, -8), P(-4, 2, -7)]:
            stair(p, f"{side}end")
        path([P(-4, 2, z) for z in range(-6, 1)] + [P(-3, 2, 0)], f"{side}end")
        put(P(-2, 2, 0), "stone")
        path([P(-2, 3, 0), P(-2, 4, -1)], f"{side}end")              # -> bulb
    if kind == "base":
        # riser: this row's END starts the next row (fires its token dropper), ROW_DY higher
        U = Y + ROW_DY
        for k, x in enumerate([-5, -6, -7, -8]):
            stair((x, Y + 3 + k, -3), f"{side}end")
        dust((-8, U, -4), f"{side}end")
        repeater((-8, U, -5), "south")
        path([(x, U, -6) for x in range(-8, -2)], f"{side}rise")
        repeater((-2, U, -6), "west")                                # -> next row's dropper
    return xmax


def control_room(Y, side, label, finish):
    """West end of a stack's bottom row: its shulker station and the receiver of its button's
    token pipe. finish: this row's END breaks the box (Hotbar); otherwise it starts the row above."""
    P = lambda x, y, z: (x, y + Y, z)
    # station: dispenser places the empty box into the cell (-1,1,1); the piston breaks it
    container(P(-2, 1, 1), "dispenser", [], facing="east", triggered=False)
    put(P(-1, 2, 1), "piston", COMP, facing="down", extended=False)
    for p in [(-1, 1, 0), (-1, 1, 2), (-2, 0, 1), (0, 0, 1), (-1, 0, 0), (-1, 0, 2)]:
        put(P(*p), "stone")
    # finished box: collector -> hopper line west -> dropper into the water elevator
    for x in range(-1, -15, -1):
        hopper(P(x, -1, 1), "west")
    container(P(-15, -1, 1), "dropper", [], facing="west", triggered=False)
    comparator(P(-14, -1, 0), "south")                               # box in the last hopper...
    repeater(P(-14, -1, -1), "south")
    run([P(-14, -1, -2), P(-15, -1, -2), P(-15, -1, -1)], "elev")
    repeater(P(-15, -1, 0), "north", delay=4)                        # ...fires the dropper
    # START: token from the room -> RH; comparator -> K -> repeater -> this row's dropper
    hopper(P(-3, 0, -8), "down")                                     # RH (end of the pipe)
    named(P(-3, -1, -8), "chest", f"Used tokens ({label} button)", facing="west", type="single",
          waterlogged=False)
    comparator(P(-2, 0, -8), "west")
    put(P(-1, 0, -8), "stone")                                       # K
    repeater(P(-1, 0, -7), "north")                                  # -> Hotbar row dropper
    run([P(-1, 0, -4), P(-1, 0, -3)], f"{side}start")
    repeater(P(-1, 0, -2), "north")                                  # diode: START -> box wire
    run([P(-1, 0, -1), P(-2, 1, -1)], "box")
    repeater(P(-2, 1, 0), "north")                                   # -> dispenser
    # Hotbar END: delay line -> stairs up -> latch, and -> the shared finish wire to the piston
    for p in [P(-4, 0, -9), P(-4, 1, -8), P(-4, 2, -7), P(-4, 3, -6), P(-4, 4, -5)]:
        stair(p, f"{side}end")
    path([P(-4, 4, z) for z in (-4, -3, -2)] + [P(-3, 4, -2)], f"{side}end")   # -> bulb
    if finish:
        path([P(-4, 4, -1), P(-4, 4, 0), P(-3, 4, 0)], f"{side}end")
        repeater(P(-3, 4, 1), "north")                               # -> finish wire
    else:
        # riser: this row's END starts the row above (fires its token dropper)
        stair(P(-5, 5, -3), f"{side}end")
        stair(P(-6, 6, -3), f"{side}end")
        dust(P(-6, 6, -4), f"{side}end")
        repeater(P(-6, 6, -5), "south")
        path([P(-6, 6, -6), P(-5, 6, -6), P(-4, 6, -6), P(-3, 6, -6)], f"{side}rise")
        repeater(P(-2, 6, -6), "west")
    # finish wire (Hotbar END or Inventory row 3 END) -> dust on top of the piston
    put(P(-1, 3, 2), "stone")                                        # step down onto the piston
    repeater(P(-4, 4, 2), "west", delay=4)
    run([P(-3, 4, 2), (-2, Y + 4, 2, "west", 4), P(-1, 4, 2)], "fin")
    dust(P(-1, 3, 1), "fin")                                         # sits on the piston


MZ = -20                        # the back stack is the front stack mirrored: z -> MZ - z
FLOOR = ROW_DY + 9              # control room floor (barrels are part of it)
ZPIPE = {"I1": 4, "I2": 2, "H": MZ - 4, "I3": MZ - 2}  # pipes in front of / behind the stacks
ZMOD = {"I1": -1, "I2": -1, "H": MZ + 1, "I3": MZ + 1}  # z of each row's slot stacks


def slot_pipe(side, Y, m, itm, label, slot):
    """Room barrel -> refill hopper -> measuring pot -> head hopper -> pipe -> the slot.
    The head opens only while that kit's room latch is on: one stack per kit goes down."""
    b, z0, F, zm = 3 * m + 2, ZPIPE[side], FLOOR, ZMOD[side]
    st = 1 if zm > z0 else -1
    for z in range(z0, zm, st):
        hopper((b, Y + 4, z), "south" if st > 0 else "north")
    hopper((b, Y + 4, zm), "down")                                   # -> the row's refill hopper
    for y in range(Y + 5, F - 4):
        hopper((b, y, z0), "down")
    put((b, F - 4, z0), "white_shulker_box", G.CONTAINER, facing="up")   # filter: no Blockers
    G.TILES[(b, F - 4, z0)] = Compound({"id": String("minecraft:shulker_box"),
                                         "Items": List[Compound]([])})
    hopper((b, F - 3, z0), "down", enabled=False)                    # head (locked: latch off)
    put((b, F - 2, z0), "decorated_pot", G.CONTAINER, facing="north", cracked=False,
        waterlogged=False)
    G.TILES[(b, F - 2, z0)] = Compound({"id": String("minecraft:decorated_pot"),
                                         "item": Compound({"id": String("minecraft:" + itm),
                                                           "count": Int(STACK[itm])})})
    hopper((b, F - 1, z0), "down", items=[blocker(i) for i in range(1, 5)])
    named((b, F, z0), "barrel", f"{label} slot {slot}",
          [item(i, itm, STACK[itm]) for i in range(27)], facing="up", open=False)


def bus(z, y, net, xend):
    """Lock bus along x: dust / stone (beside a pipe hopper) / repeater, repeating per slot."""
    for x in range(1, xend + 1):
        if x % 3 == 2:
            put((x, y, z), "stone")
        elif x % 3 == 0:
            repeater((x, y, z), "west")
        else:
            dust((x, y, z), net)


def room_latch(z0, net, start_path, timer_item):
    """Copper-bulb latch under the room floor: on by the button's token, off when the timer
    hopper TA has emptied into TB (TA holds more than any stack, so every pot is empty by then).
    L (y=F-1) locks the refill hoppers, NOT L (y=F-3) locks the heads."""
    F = FLOOR
    y1, y0 = F - 1, F - 2
    put((-7, y1, z0), "waxed_copper_bulb", COMP, lit=False, powered=False)
    comparator((-6, y1, z0), "west")
    put((-2, y0, z0), "stone")                                       # S1 (under L)
    hopper((-3, y0, z0), "north")                                    # TB (locked by L above)
    run([(x, y1, z0) for x in range(-5, 1)], net + "L")
    hopper((-3, y0, z0 - 1), "south", enabled=False,
           items=[item(0, timer_item, 64), item(1, timer_item, 40)])    # TA
    wall_torch((-2, y0, z0 - 1), "north", lit=True)                  # NOT L: locks TA, feeds heads
    comparator((-4, y0, z0 - 1), "east", signal=5)                   # TA not empty
    repeater((-5, y0, z0 - 1), "east", powered=True)
    repeater((-6, y0, z0 - 1), "east", powered=True)
    put((-7, y0, z0 - 1), "stone")                                   # S2
    wall_torch((-7, y0, z0), "south", lit=False)                     # TA empty -> bulb above
    put((-1, F - 3, z0 - 1), "stone")
    dust((-1, y0, z0 - 1), net + "N")
    put((-1, y1, z0 - 1), "stone")                                   # keeps NOT L off the L line
    dust((0, F - 3, z0 - 1), net + "N")
    run(start_path, net + "S")


def room():
    F = FLOOR
    xend = 3 * ROW
    # ---- lock buses: inventory (z=3 between I1/I2 pipes, z=MZ-1 beside I3), hotbar (MZ-5) ----
    for z in (3, MZ - 1):
        bus(z, F - 1, "IL", xend)
        bus(z, F - 3, "IN", xend)
    bus(MZ - 5, F - 1, "HL", xend)
    bus(MZ - 5, F - 3, "HN", xend)
    # latch feeds along x=0 (inventory latch at z=-3, hotbar latch at z=MZ-3)
    run([(0, F - 1, z) for z in (-2, -1, 0, 1, 2, 3)], "IL")
    run([(0, F - 1, z) for z in range(-4, MZ - 2, -1) if z != -12] + [(0, F - 1, -12, "south", 1)],
        "IL")
    run([(0, F - 3, z) for z in (-3, -2, -1, 0, 1, 2, 3)], "IN")
    run([(0, F - 3, z) for z in range(-5, MZ - 2, -1) if z != -13] + [(0, F - 3, -13, "south", 1)],
        "IN")
    path([(0, F - 1, MZ - 4), (0, F - 1, MZ - 5)], "HL")
    dust((0, F - 3, MZ - 5), "HN")
    # ---- token droppers with the two buttons; pipes down to each stack's receiver ----
    # (the dropper sits BESIDE the pipe: a hopper under a dropper would pull the tokens out)
    for z, name, glow, zs in [(-8, "Inventory", "lime", -7), (MZ + 8, "Hotbar", "light_blue", MZ + 7)]:
        container((-4, F, z), "dropper", [item(i, "brick", 64, name="Token") for i in range(9)],
                  facing="east", triggered=False)
        put((-4, F + 1, z), "oak_button", COMP, face="floor", facing="north", powered=False)
        floor_sign((-4, F + 1, zs), 0 if zs > z else 8,
                   [f">> {name.upper()} <<", "press the", "button: 1 kit"], glow=True, color=glow)
        for y in range(1, F + 1):
            hopper((-3, y, z), "down")
        # START: the pressed dropper -> repeater set in the floor -> block -> dust under the floor
        repeater((-5, F, z), "east")
        put((-6, F, z), "polished_blackstone")
    ist = [(x, F - 1, -8) for x in range(-6, -10, -1)] + [(-9, F - 1, z) for z in range(-7, -2)]
    ist += [(-8, F - 1, -3)]
    room_latch(-3, "I", ist, "cobblestone")
    hs = [(x, F - 1, MZ + 8) for x in range(-6, -10, -1)]
    hs += [(-9, F - 1, z) for z in range(MZ + 7, MZ - 4, -1) if z != MZ + 2]
    hs += [(-9, F - 1, MZ + 2, "south", 1), (-8, F - 1, MZ - 3)]
    room_latch(MZ - 3, "H", hs, "cobblestone")
    # ---- each station: empty-shulker chest + pipe, water elevator up into its kits chest ----
    for mz, label in ((None, "Inventory"), (MZ, "Hotbar")):
        G.MIRZ[0] = mz
        station_top(label)
    G.MIRZ[0] = None
    # ---- room shell: floor, walls, roof, light and labels ----
    x0, x1, z0, z1 = -19, xend + 3, MZ - 5, 5
    for y in (F + 1, F + 2):                                         # doorway (south wall)
        put((-9, y, z1), "air")
    for x in range(x0, x1 + 1):
        for z in range(z0, z1 + 1):
            wall = x in (x0, x1) or z in (z0, z1)
            support((x, F, z), "polished_deepslate" if (x + z) % 2 else "polished_blackstone")
            for y in range(F + 1, F + 4):
                if wall:
                    support((x, y, z), "tinted_glass" if y == F + 2 and (x + z) % 4
                            else "deepslate_tiles")
            support((x, F + 4, z), "sea_lantern" if x % 4 == 0 and z % 4 == 0 else "deepslate_tiles")
    for m in range(ROW):
        b = 3 * m + 2
        for side, lab, num in [("I3", "Inv", 2 * ROW + m + 1), ("I2", "Inv", ROW + m + 1),
                               ("I1", "Inv", m + 1), ("H", "Hot", m + 1)]:
            floor_sign((b - 1, F + 1, ZPIPE[side]), 4, [f"{lab} {num}"])
    for x, z, rot, lines in [(-15, 2, 0, ["INVENTORY", "KITS"]), (-2, 2, 0, ["EMPTY SHULKERS", "(inventory)"]),
                             (-15, MZ - 2, 8, ["HOTBAR", "KITS"]), (-2, MZ - 2, 8, ["EMPTY SHULKERS", "(hotbar)"])]:
        floor_sign((x, F + 1, z), rot, lines, glow=True, color="yellow")


def station_top(label):
    """Empty-shulker chest + pipe down to the dispenser; water elevator from the collector line
    up into the kits chest (built for the front station, or mirrored for the back one)."""
    F = FLOOR
    named((-2, F, 1), "chest", f"Empty shulkers ({label})",
          [item(0, "white_shulker_box", 1)] if TEST else [], facing="south", type="single",
          waterlogged=False)
    for y in range(2, F):
        hopper((-2, y, 1), "down")
    put((-16, -2, 1), "soul_sand")
    for y in range(-1, F + 2):
        put((-16, y, 1), "water", G.DUST + 1, level=0)
        for p in [(-17, y, 1), (-16, y, 0), (-16, y, 2)]:
            support(p, "glass")
        if y not in (-1, F, F + 1):
            support((-15, y, 1), "glass")
    put((-17, F + 2, 1), "water", G.DUST + 1, level=0)                # current over the top
    hopper((-15, F + 1, 1), "down")
    named((-15, F, 1), "chest", f"{label} kits", facing="south", type="single", waterlogged=False)
    for p in [(-18, F + 2, 1), (-17, F + 2, 0), (-17, F + 2, 2), (-16, F + 2, 0), (-16, F + 2, 2),
              (-15, F + 2, 0), (-15, F + 2, 2), (-14, F + 2, 1)]:
        support(p, "glass")


# Front stack: Inventory 1-9 (bottom, with the Inventory station) and 10-18 on top.
# Back stack (mirrored in z): Hotbar (bottom, with its own station) and Inventory 19-27 on top.
# Both kits can run at the same time. On top of everything: the control room.
row(FULL_LAYOUT[0:ROW], "Inventory", 0, "hot", "I1", 1, finish=False)
row(FULL_LAYOUT[ROW:2 * ROW], "Inventory", ROW_DY, "top", "I2", ROW + 1)
G.MIRZ[0] = MZ
row(HOTBAR_LAYOUT, "Hotbar", 0, "hot", "H", 1, finish=True)
row(FULL_LAYOUT[2 * ROW:], "Inventory", ROW_DY, "top", "I3", 2 * ROW + 1)
for y in range(4, ROW_DY + 1):
    hopper((0, y, 1), "down")                                        # back top row's column...
hopper((0, 3, 1), "north")                                           # ...not into the Hotbar line
hopper((0, 3, 0), "down")
hopper((0, 2, 0), "north")
G.MIRZ[0] = None
for y in range(2, ROW_DY + 1):
    hopper((0, y, 1), "down")                                        # front column -> injector
for z in range(MZ + 1, 1):
    hopper((0, 2, z), "south")                                       # cross line (back -> front)
# link: Inventory 10-18 END (front top) -> starts Inventory 19-27 (back top)
dust((-5, ROW_DY, -9), "I2end")
run([(x, ROW_DY, -9, "east", 4) for x in range(-6, -13, -1)], "I2link")
path([(-13, ROW_DY, -9)] + [(-13, ROW_DY, z) for z in range(-10, -16, -1)], "I2link2")
run([(x, ROW_DY, -15, "west", 1) for x in range(-12, -3)], "I2link3")
put((-3, ROW_DY + 1, -15), "stone")                                  # keeps it off that row's START
path([(-3, ROW_DY, -15), (-3, ROW_DY, -14)], "I2link4")
repeater((-2, ROW_DY, -14), "west")
# finish: Inventory 19-27 END (back top) -> west, down, along z, east -> the front piston wire
run([(x, ROW_DY + 2, -14, "east", 4) for x in range(-5, -11, -1)], "I3fin")
stair((-11, ROW_DY + 2, -14), "I3fin")
for k in range(1, 5):
    stair((-11, ROW_DY + 2 - k, -14 + k), "I3fin")
run([(-11, 4, z, "north", 4) for z in range(-9, 2)] + [(-11, 4, 2)], "I3fin2")
run([(x, 4, 2, "west", 4) for x in range(-10, -4)], "I3fin2")
for m in range(ROW):
    slot_pipe("H", 0, m, HOTBAR_LAYOUT[m], "Hotbar", m + 1)
    for r, Y in ((0, 0), (1, ROW_DY), (2, ROW_DY)):
        slot_pipe(f"I{r + 1}", Y, m, FULL_LAYOUT[r * ROW + m], "Inventory", r * ROW + m + 1)
room()


def write_outputs(tag):
    from litemapy import BlockState, Region, TileEntity
    out = os.path.dirname(os.path.abspath(__file__))
    G.solve_dust()
    off, size = G.normalized()
    reg = Region(0, 0, 0, *size)
    for pos, (name, props) in G.BLOCKS.items():
        reg[G.rel(pos, off)] = BlockState(name, **props)
    for pos, nbt in G.TILES.items():
        x, y, z = G.rel(pos, off)
        data = Compound(nbt)
        data["x"], data["y"], data["z"] = Int(x), Int(y), Int(z)
        reg.tile_entities.append(TileEntity(data))
    reg.as_schematic(name="compact_regear_maker" + tag, author="build_compact.py",
                     description="Compact Auto Regear Shulker Maker (MC 1.21.4, any hopper speed)",
                     mc_version=MC_DATA_VERSION_1_21_4).save(os.path.join(out, f"compact_regear_maker{tag}.litematic"))
    w, h, l = size
    lines = ["# Compact Auto Regear Shulker Maker - Minecraft Java 1.21.4"]
    for y0 in range(0, h, 40):
        lines.append(f"fill ~ ~{y0} ~ ~{w - 1} ~{min(h, y0 + 40) - 1} ~{l - 1} minecraft:air")
    for p in sorted(G.BLOCKS, key=lambda p: (G.PHASE[p], p[1], p[2], p[0])):
        x, y, z = G.rel(p, off)
        lines.append(f"setblock ~{x} ~{y} ~{z} {G.state_string(p)}")
    with open(os.path.join(out, f"compact_regear_maker{tag}.mcfunction"), "w") as f:
        f.write("\n".join(lines) + "\n")
    fn = os.path.join(out, "datapack", "regear_maker", "data", "regear", "function")
    os.makedirs(fn, exist_ok=True)
    with open(os.path.join(fn, f"compact{tag}.mcfunction"), "w") as f:
        f.write("\n".join(lines) + "\n")
    print("blocks", len(G.BLOCKS), "size", size, "offset", off)


if __name__ == "__main__":
    write_outputs("_test" if TEST else "")
