#!/usr/bin/env python3
"""
build_compact.py - Compact Auto Regear Shulker Maker (Minecraft Java 1.21.4)

Works with any hopper speed (singleplayer and servers that move 8 items per transfer): every slot
is measured by a decorated pot (holds exactly one full stack) and nothing depends on hopper timing.

Layout (x = along the machine, slot 1 nearest the shulker station at the west end):
  * Inventory row (27 slots) and Hotbar row (9 slots, stacked 9 blocks higher), each with its own
    button, token chain and shulker station.
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
N_INV = 3 if TEST else 27
N_HOT = 2 if TEST else 9
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
    FULL_LAYOUT = [P_, T, P_][:N_INV]
    HOTBAR_LAYOUT = [T, P_][:N_HOT]
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
def module(m, itm, label, Y):
    a, b, c = 3 * m + 1, 3 * m + 2, 3 * m + 3
    P = lambda x, y, z: (x, y + Y, z)
    side = label[0]
    slot = m + 1
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


def row(n, layout, label, Y):
    P = lambda x, y, z: (x, y + Y, z)
    side = label[0]
    xmax = 3 * n
    for x in range(1, xmax + 1):                                     # token chain (see below)
        hopper(P(x, 0, -6), "east", enabled=(x % 3 != 1))
    for m in range(n):
        module(m, layout[m], label, Y)
    # item line, x=0 is the injector into this row's shulker cell (-1,1,1)
    for x in range(0, xmax + 1):
        hopper(P(x, 1, 1), "west")
    # token chain: the first hopper of every slot is held locked by that slot (see module); the rest
    # are free, so a token rolls on to the next slot as soon as the current one is done
    hopper(P(xmax + 1, 0, -6), "east")
    named(P(xmax + 2, 0, -6), "chest", f"Used tokens ({label})", facing="west", type="single",
          waterlogged=False)
    # KIT bus: on while a kit is being made -> every refill hopper is locked
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
    # ---------------- station: cell (-1,1,1) ----------------
    container(P(-2, 1, 1), "dispenser", [], facing="east", triggered=False)
    put(P(-1, 2, 1), "piston", COMP, facing="down", extended=False)
    for p in [(-1, 1, 0), (-1, 1, 2), (-2, 0, 1), (0, 0, 1), (-1, 0, 0), (-1, 0, 2)]:
        put(P(*p), "stone")
    hopper(P(-1, -1, 1), "down")
    named(P(-1, -2, 1), "chest", f"{label} kits", facing="west", type="single", waterlogged=False)
    hopper(P(-2, 1, 2), "north")                                     # empty shulkers -> dispenser
    named(P(-2, 2, 2), "chest", f"Empty shulkers ({label})", facing="west", type="single",
          waterlogged=False)
    # ---------------- START: button on the token dropper; the powered dropper also feeds the
    # wire to the dispenser (places the empty shulker)
    # dropper sits BESIDE the chain start (a hopper under a dropper would pull tokens out of it)
    container(P(-1, 0, -6), "dropper", [item(i, "brick", 64, name="Token") for i in range(9)],
              facing="east", triggered=False)
    hopper(P(0, 0, -6), "east")
    put(P(-2, 0, -6), "oak_button", COMP, face="wall", facing="west", powered=False)
    path([P(-1, 0, z) for z in range(-5, 0)], f"{side}start")       # powered by the pressed dropper
    path([P(-2, 1, -1), P(-2, 1, 0)], f"{side}start")               # -> into the dispenser
    # ---------------- END: delay line -> stairs -> dust on top of the piston ----------------
    for p in [P(-4, 0, -9), P(-4, 1, -8), P(-4, 2, -7)]:
        put((p[0], p[1] - 1, p[2]), "stone")
        dust(p, f"{side}end")
    path([P(-4, 2, z) for z in range(-6, 1)] + [P(-3, 2, 0)], f"{side}end")
    put(P(-2, 2, 0), "stone")
    path([P(-2, 3, 0), P(-1, 3, 0), P(-1, 3, 1)], f"{side}end")      # last dust sits on the piston
    # KIT latch: copper bulb toggled on by START and off by END; comparator -> KIT bus
    put(P(-2, 4, -2), "waxed_copper_bulb", COMP, lit=False, powered=False)
    comparator(P(-1, 4, -2), "west")
    dust(P(-2, 4, -1), f"{side}end")                                 # END -> bulb
    put(P(-2, 3, -2), "stone")                                       # START powers this -> bulb
    path([P(-2, 1, -5), P(-2, 2, -4), P(-2, 3, -3)], f"{side}start")
    # ---------------- signs ----------------
    put(P(-1, 1, -6), "stone")
    sign(P(-2, 1, -6), "west", [f">> {label.upper()} <<", "press button", "below: 1 kit", "(bulb glows)"],
         glow=True, color="lime" if side == "I" else "light_blue")
    sign(P(-3, 1, 1), "west", ["Empty shulkers", "go in the chest", "behind this", "(east, 1 up)"])
    sign(P(-3, 0, 1), "west", ["Finished kits:", f"'{label} kits'", "chest, 2 blocks", "down (east)"])
    return xmax


row(N_INV, FULL_LAYOUT, "Inventory", 0)
row(N_HOT, HOTBAR_LAYOUT, "Hotbar", 9)


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
