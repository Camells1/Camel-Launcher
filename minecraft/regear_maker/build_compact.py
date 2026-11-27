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
    G.TILES[tuple(pos)] = Compound({
        "id": String("minecraft:sign"), "is_waxed": Byte(1),
        "front_text": Compound({"messages": msg(lines), "color": String(color),
                                "has_glowing_text": Byte(1 if glow else 0)}),
        "back_text": Compound({"messages": msg([""] * 4), "color": String("black"),
                               "has_glowing_text": Byte(0)})})


def named(pos, block, name, items=(), **props):
    container(pos, block, items, **props)
    G.TILES[tuple(pos)]["CustomName"] = String('"%s"' % name)


def wall_torch(pos, facing, lit):
    put(pos, "redstone_wall_torch", COMP, facing=facing, lit=lit)


# ---------------------------------------------------------------------------------------------
# Everything is built per ROW (Inventory row at y=0, Hotbar row stacked 9 blocks above) with its
# own token chain, clock, start detector, delay line and shulker station.  Row-local coordinates:
#   z = -1 module stack, z = 0/1 drain + item line, z < -1 control logic, x = 3m+1..3m+3 slot m.
def module(m, itm, label, Y, side, slot):
    a, b = 3 * m + 1, 3 * m + 2
    P = lambda x, y, z: (x, y + Y, z)
    named(P(b, 4, -1), "barrel", f"{label} slot {slot}",
          [item(i, itm, STACK[itm]) for i in range(27)], facing="up", open=False)
    hopper(P(b, 3, -1), "down", enabled=True, items=[blocker(i) for i in range(1, 5)])   # refill
    put(P(b, 2, -1), "decorated_pot", G.CONTAINER, facing="north", cracked=False, waterlogged=False)
    G.TILES[P(b, 2, -1)] = Compound({"id": String("minecraft:decorated_pot"),
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
    sign(P(b, 4, 0), "south", [label, f"slot {slot}", "put item in", "barrel above"])


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


def row(layout, label, Y, kind, side, slot0=1):
    """kind: 'hot'  = bottom row (Hotbar) with the shared station and the control room
             'mid'  = Inventory rows 1-2: started by the row below, line drops down the column
             'last' = Inventory row 3: its END finishes the box at the bottom station"""
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
        control_room(Y, side, label)
    else:
        # END: delay line -> stairs -> latch
        for p in [P(-4, 0, -9), P(-4, 1, -8), P(-4, 2, -7)]:
            stair(p, f"{side}end")
        path([P(-4, 2, z) for z in range(-6, 1)] + [P(-3, 2, 0)], f"{side}end")
        put(P(-2, 2, 0), "stone")
        path([P(-2, 3, 0), P(-2, 4, -1)], f"{side}end")              # -> bulb
    if kind == "mid":
        # riser: this row's END starts the next row (fires its token dropper), ROW_DY higher
        U = Y + ROW_DY
        for k, x in enumerate([-5, -6, -7, -8]):
            stair((x, Y + 3 + k, -3), f"{side}end")
        dust((-8, U, -4), f"{side}end")
        repeater((-8, U, -5), "south")
        path([(x, U, -6) for x in range(-8, -2)], f"{side}rise")
        repeater((-2, U, -6), "west")                                # -> next row's dropper
    if kind == "last":
        # this row's END finishes the box: west, down two staircases, then east onto the piston
        net = f"{side}fin"
        run([(x, Y + 2, -7, "east", 4) for x in range(-5, -10, -1)], net)
        stair((-10, Y + 2, -7), net)                                 # stone: dust steps down from it
        y, z = Y + 1, -6
        while z <= 2:                                                # down, going south
            stair((-10, y, z), net)
            y, z = y - 1, z + 1
        y += 1
        repeater((-11, y, 2), "east")
        stair((-12, y, 2), net + "2")
        y, z = y - 1, 1
        while y >= 4:                                                # down, going north
            stair((-12, y, z), net + "2")
            y, z = y - 1, z - 1
        y, z = y + 1, z + 1                                          # last step: (-12, 4, z)
        repeater((-13, 4, z), "east")
        run([(-14, 4, z)] + [(-14, 4, zz, "north", 4) for zz in range(z + 1, 2)] + [(-14, 4, 2)],
            net + "3")
        run([(x, 4, 2, "west", 4) for x in range(-13, -4)], net + "3")
    return xmax


def control_room(Y, side, label):
    """Bottom west end: the shared shulker station, both buttons and the shared chests.
    The player stands on the floor at y=-1 (x -9..-3, z -6..2)."""
    P = lambda x, y, z: (x, y + Y, z)
    # station: dispenser places the empty box into the cell (-1,1,1); the piston breaks it
    container(P(-2, 1, 1), "dispenser", [], facing="east", triggered=False)
    put(P(-1, 2, 1), "piston", COMP, facing="down", extended=False)
    for p in [(-1, 1, 0), (-1, 1, 2), (-2, 0, 1), (0, 0, 1), (-1, 0, 0), (-1, 0, 2)]:
        put(P(*p), "stone")
    hopper(P(-1, -1, 1), "west")                                     # collector -> kits chest
    hopper(P(-2, -1, 1), "west")
    named(P(-3, -1, 1), "chest", "Kits", facing="east", type="single", waterlogged=False)
    hopper(P(-2, 1, 2), "north")                                     # empty shulkers -> dispenser
    named(P(-2, 2, 2), "chest", "Empty shulkers", facing="west", type="single", waterlogged=False)
    # Hotbar button: on this row's token dropper
    put(P(-2, 0, -6), "oak_button", COMP, face="wall", facing="west", powered=False)
    run([P(-1, 0, -4), P(-1, 0, -3)], f"{side}start")
    repeater(P(-1, 0, -2), "north")                                  # diode: START -> box wire
    run([P(-1, 0, -1), P(-2, 1, -1)], "box")
    repeater(P(-2, 1, 0), "north")                                   # -> dispenser
    # Inventory button: on block IP; IP -> box wire, the button itself -> riser to Inventory row 1
    put(P(-2, 1, -3), "stone")                                       # IP
    put(P(-3, 1, -3), "oak_button", COMP, face="wall", facing="west", powered=False)
    repeater(P(-2, 1, -2), "north")                                  # IP -> box wire
    U = Y + ROW_DY
    run([P(-3, 0, -3), P(-4, 0, -3), P(-5, 0, -3), (-6, Y, -3, "east", 1), P(-7, 0, -3),
         P(-8, 0, -3), P(-9, 0, -3)], "Irise0")
    for p in [P(-9, 1, -4), P(-9, 2, -5), P(-9, 3, -6), P(-8, 4, -6), P(-7, 5, -6), P(-6, 6, -6)]:
        stair(p, "Irise0")
    path([(x, U, -6) for x in (-5, -4, -3)], "Irise0")
    repeater((-2, U, -6), "west")                                    # -> Inventory row 1 dropper
    # Hotbar END: delay line -> stairs up -> latch, and -> the shared finish wire to the piston
    for p in [P(-4, 0, -9), P(-4, 1, -8), P(-4, 2, -7), P(-4, 3, -6), P(-4, 4, -5)]:
        stair(p, f"{side}end")
    path([P(-4, 4, z) for z in (-4, -3, -2)] + [P(-3, 4, -2)], f"{side}end")   # -> bulb
    path([P(-4, 4, -1), P(-4, 4, 0)], f"{side}end")
    repeater(P(-4, 4, 1), "north")                                   # -> finish wire
    # finish wire (Hotbar END or Inventory row 3 END) -> dust on top of the piston
    put(P(-1, 3, 2), "stone")                                        # step down onto the piston
    run([P(-4, 4, 2), (-3, Y + 4, 2, "west", 4), (-2, Y + 4, 2, "west", 4), P(-1, 4, 2)], "fin")
    dust(P(-1, 3, 1), "fin")                                         # sits on the piston
    # floor and signs
    for x in range(-9, -2):
        for z in range(-6, 3):
            support(P(x, -1, z), "stone")
    put(P(-1, 1, -6), "stone")
    sign(P(-2, 1, -6), "west", [">> HOTBAR <<", "press button", "below: 1 kit", ""],
         glow=True, color="light_blue")
    sign(P(-3, 2, -3), "west", [">> INVENTORY <<", "press button", "below: 1 kit", ""],
         glow=True, color="lime")


# Bottom: Hotbar row with the control room. Above it: the Inventory kit as 3 rows of ROW slots
# (slots 1-9 lowest). Upper rows' item lines drop down a hopper column into the bottom injector.
row(HOTBAR_LAYOUT, "Hotbar", 0, "hot", "H")
for r, kind in enumerate(("mid", "mid", "last")):
    row(FULL_LAYOUT[r * ROW:(r + 1) * ROW], "Inventory", (r + 1) * ROW_DY, kind, f"I{r + 1}",
        r * ROW + 1)
for y in range(2, 3 * ROW_DY + 1):
    if y % ROW_DY != 1:
        hopper((0, y, 1), "down")


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
