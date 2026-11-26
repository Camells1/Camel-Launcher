#!/usr/bin/env python3
"""
build_regear.py - Auto Regear Shulker Maker for Minecraft Java Edition 1.21.4 (no music discs)

Outputs (all generated from one block model):
  auto_regear_maker.litematic
  auto_regear_maker.mcfunction
  datapack/regear_maker/   ->  /function regear:build   /function regear:load_test_shulkers

Run:  pip install litemapy && python3 build_regear.py [--test]
      --test builds a fast variant (short clock, tiny kit) used for automated in-game testing.

HOW IT WORKS
  Three identical STATIONS are stacked vertically (5 blocks apart). Each station has 3 LANES and
  adds up to 3 x 5 slots of the kit to a shulker box, then hands the box down to the next station.

  Lane = supply chest -> S2 hopper -> S hopper -> M "measuring" hopper -> the shulker box.
    * The kit amount of a lane = the free slots of its M hopper. Unused slots of M hold an empty
      shulker box named "Blocker": a hopper can never push a shulker box INTO a shulker box, so
      blockers stay in M forever while the kit items go through.
    * FILL phase: M locked, S unlocked -> M fills until its free slots are full stacks.
    * DUMP phase: S locked, M unlocked -> M empties its kit items into the shulker box.
  Station cycle (each station has its own hopper clock, no music discs, no shared wiring):
    DUMP starts : the dispenser above... (dispenser east of the cell) places the next empty /
                  partly-filled shulker box into the cell; the three M hoppers dump into it.
    DUMP ends   : falling-edge pulse -> the piston above the cell breaks the box; it drops through
                  a 1-block air gap into the collector hopper (no lock needed: the collector never
                  touches a placed box) and is passed to the next station's dispenser.
  Clock = two hoppers passing CLOCK_ITEMS items back and forth (8 game ticks per item) and two
  waxed copper bulbs (T flip-flops, started in opposite states) that flip whenever a hopper runs
  empty. One bulb gives the DUMP signal, the other locks the second clock hopper.

  Changing the kit: put a different item in a lane's chest and change the number of "Blocker"
  shulker boxes in that lane's M hopper (5 - stacks you want). Keep every lane at <= 200 items
  (3 stacks of a 64-item, 5 of a 16-item, any 1-stack item) so it fits in one 84 s phase.
"""

import os
import sys

from nbtlib import Byte, Compound, Int, List, String
from litemapy import BlockState, Region, TileEntity

MC_DATA_VERSION_1_21_4 = 4189
PACK_FORMAT_1_21_4 = 61
TEST = "--test" in sys.argv

CLOCK_ITEMS = 30 if TEST else 210          # 210 items x 8 gt = 84 s per phase
STATION_DY = -5

# Kit: per station, lanes N / S / W: (item id, stacks or items-slots, custom name or None)
# "slots" = number of M slots used by that item; blockers fill the rest (5 - slots).
DEFAULT_KIT = [
    {"N": ("end_crystal", 3), "S": ("obsidian", 3), "W": ("totem_of_undying", 5)},
    {"N": ("enchanted_golden_apple", 3), "S": ("ender_pearl", 3), "W": ("experience_bottle", 3)},
    {"N": ("totem_of_undying", 4), "S": ("respawn_anchor", 2), "W": ("glowstone", 1)},
]
TEST_KIT = [
    {"N": ("ender_pearl", 1), "S": ("totem_of_undying", 2), "W": ("snowball", 1)},
    {"N": ("egg", 1), "S": ("totem_of_undying", 1), "W": ("ender_pearl", 1)},
    {"N": ("snowball", 1), "S": ("egg", 1), "W": ("totem_of_undying", 1)},
]
KIT = TEST_KIT if TEST else DEFAULT_KIT
STACK = {"end_crystal": 64, "obsidian": 64, "totem_of_undying": 1, "enchanted_golden_apple": 64,
         "ender_pearl": 16, "experience_bottle": 64, "respawn_anchor": 64, "glowstone": 64,
         "snowball": 16, "egg": 16}

# ---------------------------------------------------------------------------------------------
BLOCKS, TILES, NET, SEEDS, PHASE = {}, {}, {}, {}, {}
SUPPORT, CONTAINER, COMPONENT, DUST = 0, 1, 2, 3


def put(pos, block, phase=SUPPORT, **props):
    pos = tuple(pos)
    if pos in BLOCKS:
        raise ValueError(f"two blocks at {pos}: {BLOCKS[pos][0]} and {block}")
    BLOCKS[pos] = ("minecraft:" + block, {k: str(v).lower() for k, v in props.items()})
    PHASE[pos] = phase


def support(pos, block="glass"):
    if tuple(pos) not in BLOCKS:
        put(pos, block, SUPPORT)


def dust(pos, net, seed=None):
    put(pos, "redstone_wire", DUST)
    NET[tuple(pos)] = net
    if seed is not None:
        SEEDS[tuple(pos)] = seed
    support((pos[0], pos[1] - 1, pos[2]))


def repeater(pos, facing, delay=1, powered=False):
    put(pos, "repeater", COMPONENT, facing=facing, delay=delay, powered=powered, locked=False)
    support((pos[0], pos[1] - 1, pos[2]))


def comparator(pos, facing, mode="compare", signal=0):
    put(pos, "comparator", COMPONENT, facing=facing, mode=mode, powered=signal > 0)
    TILES[tuple(pos)] = Compound({"id": String("minecraft:comparator"), "OutputSignal": Int(signal)})
    support((pos[0], pos[1] - 1, pos[2]))


def torch(pos, lit):
    put(pos, "redstone_torch", COMPONENT, lit=lit)


def item(slot, item_id, count=1, name=None):
    c = Compound({"Slot": Byte(slot), "id": String("minecraft:" + item_id), "count": Int(count)})
    if name:
        c["components"] = Compound({"minecraft:custom_name": String('"%s"' % name)})
    return c


def container(pos, block, items=(), phase=CONTAINER, **props):
    put(pos, block, phase, **props)
    TILES[tuple(pos)] = Compound({"id": String("minecraft:" + block.replace("waxed_", "")),
                                  "Items": List[Compound](list(items))})


def hopper(pos, facing, enabled=True, items=()):
    container(pos, "hopper", items, facing=facing, enabled=enabled)
    TILES[tuple(pos)]["TransferCooldown"] = Int(0)


def blocker(slot):
    return item(slot, "black_shulker_box", 1, name="Blocker")


# ---------------------------------------------------------------------------------------------
def station(k, kit, first, last):
    """Station k; cell at local (0,0,0) = global (0, k*STATION_DY, 0)."""
    oy = k * STATION_DY
    P = lambda x, y, z: (x, y + oy, z)
    n = f"s{k}_"

    # --- cell, dispenser, piston, drop shaft, collector -------------------------------------
    container(P(1, 0, 0), "dispenser", [], facing="west", triggered=False)
    put(P(0, 1, 0), "piston", COMPONENT, facing="down", extended=False)
    for w in ((1, -1, 0), (-1, -1, 0), (0, -1, -1), (0, -1, 1)):
        put(P(*w), "stone")
    if last:
        hopper(P(0, -2, 0), "east")
        hopper(P(1, -2, 0), "down")
        container(P(1, -3, 0), "chest", [], facing="south", type="single", waterlogged=False)
    else:
        hopper(P(0, -2, 0), "east")
        hopper(P(1, -2, 0), "down")
        hopper(P(1, -3, 0), "down")
        hopper(P(1, -4, 0), "down")        # = next station's (1,1,0), feeds its dispenser
    if first:
        hopper(P(1, 1, 0), "down")
        container(P(1, 2, 0), "chest", [], facing="west", type="single", waterlogged=False)

    # --- lanes --------------------------------------------------------------------------------
    lanes = {  # M, S, S2, chest, facing
        "N": ((0, 0, -1), (0, 0, -2), (0, 0, -3), (0, 1, -3), "south"),
        "S": ((0, 0, 1), (0, 0, 2), (0, 0, 3), (0, 1, 3), "north"),
        "W": ((-1, 0, 0), (-2, 0, 0), (-3, 0, 0), (-3, 1, 0), "east"),
    }
    for lane, (m, s, s2, ch, f) in lanes.items():
        iid, slots = kit[lane]
        hopper(P(*m), f, enabled=False, items=[blocker(i) for i in range(slots, 5)])
        hopper(P(*s), f, enabled=True)
        hopper(P(*s2), f, enabled=True)
        container(P(*ch), "chest", [item(i, iid, STACK[iid]) for i in range(27)],
                  facing="north" if lane != "W" else "east", type="single", waterlogged=False)
    support(P(0, 1, -1))
    support(P(0, 1, -2))

    # --- M locks: torch = NOT A (lit during FILL) -> repeater -> M ---------------------------
    repeater(P(1, 0, -1), "east", powered=True)
    torch(P(2, 0, -1), lit=True)
    put(P(2, -1, -1), "stone")                      # QMn
    repeater(P(3, -1, -1), "east", delay=2)         # M unlocks 4 rt after DUMP starts
    repeater(P(1, 0, 1), "east", powered=True)
    torch(P(2, 0, 1), lit=True)
    put(P(2, -1, 1), "stone")                       # QMs
    repeater(P(3, -1, 1), "east", delay=2)
    for z in (-1, -2, -3):
        repeater(P(-1, 0, z), "north", powered=True)
    torch(P(-1, 0, -4), lit=True)
    put(P(-1, -1, -4), "stone")                     # QMw
    repeater(P(-1, -1, -5), "north")
    put(P(-1, -1, -6), "stone")                     # under A dust: feeds the QMw repeater

    # --- S locks + dispenser (A) ----------------------------------------------------------
    repeater(P(1, 0, -2), "east")
    repeater(P(2, 0, -2), "east", delay=2)          # S locks/unlocks 3 rt after A changes
    repeater(P(1, 0, 2), "east")
    repeater(P(2, 0, 2), "east", delay=2)
    repeater(P(-2, 0, 1), "south")
    repeater(P(2, 0, 0), "east")                    # fires the dispenser

    # --- A network ----------------------------------------------------------------------------
    put(P(4, -1, -1), "stone")
    put(P(4, -1, 1), "stone")
    a = n + "A"
    dust_list = [(3, 0, -2), (3, 0, 0), (3, 0, 2)] + [(4, 0, z) for z in range(-6, 3)]
    dust_list += [(3, 0, -6), (2, 0, -6)]
    for p in dust_list:
        dust(P(*p), a)
    repeater(P(1, 0, -6), "east")
    dust_list2 = [(x, 0, -6) for x in range(0, -6, -1)] + [(-5, 0, -5), (-5, 0, -4), (-5, 0, -3)]
    for p in dust_list2:
        dust(P(*p), n + "A2")
    repeater(P(-5, 0, -2), "north")
    for p in [(-5, 0, -1), (-5, 0, 0), (-5, 0, 1), (-5, 0, 2), (-4, 0, 2), (-3, 0, 2), (-2, 0, 2)]:
        dust(P(*p), n + "A3")
    # risers to the pulse detector
    dust(P(5, 1, -3), a)
    dust(P(5, 2, -2), a)
    dust(P(3, 1, -5), a)
    dust(P(3, 2, -4), a)

    # --- falling-edge pulse -> piston ---------------------------------------------------------
    repeater(P(4, 2, -2), "east", delay=3)           # rear (slow)
    repeater(P(3, 2, -3), "north", delay=1)          # side (fast)
    comparator(P(3, 2, -2), "east", mode="subtract")
    # piston must break the box (2 rt after DUMP ends) BEFORE the S hoppers unlock (3 rt)
    for p in [(2, 2, -2), (1, 2, -2), (0, 2, -2), (0, 2, -1), (0, 2, 0)]:   # last one sits on the piston
        dust(P(*p), n + "pulse")

    # --- clock ----------------------------------------------------------------------------
    clock = [item(i, "stick", min(64, CLOCK_ITEMS - 64 * i), name="Clock")
             for i in range((CLOCK_ITEMS + 63) // 64)]
    full = CLOCK_ITEMS / 320
    ss = int(1 + full * 14)
    hopper(P(12, 0, -3), "east", enabled=True, items=clock)     # Ha
    hopper(P(13, 0, -3), "west", enabled=False)                 # Hb (locked at start)
    comparator(P(11, 0, -3), "east", signal=ss)                 # Ca
    put(P(10, 0, -3), "stone")                                  # Xa
    torch(P(10, 1, -3), lit=False)                              # Ta: Ha empty
    comparator(P(14, 0, -3), "west", signal=0)                  # Cb
    put(P(15, 0, -3), "stone")                                  # Xb
    torch(P(15, 1, -3), lit=True)                               # Tb: Hb empty
    put(P(12, 0, 0), "waxed_copper_bulb", COMPONENT, lit=False, powered=True)   # BU1 = A
    put(P(13, 0, 0), "waxed_copper_bulb", COMPONENT, lit=True, powered=True)    # BU2
    comparator(P(12, 0, -1), "south", signal=0)
    repeater(P(12, 0, -2), "south")
    comparator(P(13, 0, -1), "south", signal=15)
    repeater(P(13, 0, -2), "south", powered=True)
    tog = n + "toggle"
    for p in [(10, 1, -2), (10, 1, -1), (10, 1, 0), (11, 1, 0), (12, 1, 0), (13, 1, 0),
              (14, 1, 0), (15, 1, 0), (15, 1, -1)]:
        dust(P(*p), tog)
    dust(P(15, 1, -2), tog, seed=15)
    comparator(P(12, 0, 1), "north", signal=0)                  # A out
    repeater(P(12, 0, 2), "north")
    for p in [(x, 0, 3) for x in range(12, 5, -1)] + [(6, 0, 2), (6, 0, 1), (6, 0, 0)]:
        dust(P(*p), n + "Aout")
    repeater(P(5, 0, 0), "east")


for k in range(3):
    station(k, KIT[k], first=k == 0, last=k == 2)

# ---------------------------------------------------------------------------------------------
NON_CONDUCTORS = {"air", "glass", "hopper", "repeater", "comparator", "redstone_wire",
                  "redstone_wall_torch", "redstone_torch", "piston", "chest", "shulker_box"}
DIRS = {"north": (0, -1), "south": (0, 1), "east": (1, 0), "west": (-1, 0)}
OPP = {"north": "south", "south": "north", "east": "west", "west": "east"}


def bid(pos):
    return BLOCKS[pos][0].split(":")[1] if pos in BLOCKS else "air"


def conductor(pos):
    return bid(pos) not in NON_CONDUCTORS


def sturdy_top(pos):
    return bid(pos) not in ("air", "repeater", "comparator", "redstone_wire",
                            "redstone_wall_torch", "redstone_torch", "chest")


def connections(pos):
    x, y, z = pos
    conn, links = {}, []
    for d, (dx, dz) in DIRS.items():
        nb = (x + dx, y, z + dz)
        b = bid(nb)
        up = (x + dx, y + 1, z + dz)
        down = (x + dx, y - 1, z + dz)
        if not conductor((x, y + 1, z)) and sturdy_top(nb) and bid(up) == "redstone_wire":
            conn[d] = "up"
            links.append(up)
        elif b == "redstone_wire":
            conn[d] = "side"
            links.append(nb)
        elif b == "repeater" and BLOCKS[nb][1]["facing"] in (d, OPP[d]):
            conn[d] = "side"
        elif b in ("comparator", "redstone_wall_torch", "redstone_torch"):
            conn[d] = "side"
        elif not conductor(nb) and bid(down) == "redstone_wire":
            conn[d] = "side"
            links.append(down)
    if len(conn) == 1:
        conn[OPP[next(iter(conn))]] = "side"
    if not conn:
        conn = {d: "side" for d in DIRS}
    return conn, links


def solve_dust():
    graph = {}
    for p in NET:
        conn, links = connections(p)
        for d in DIRS:
            BLOCKS[p][1][d] = conn.get(d, "none")
        graph[p] = links
    seen = set()
    for p in NET:
        if p in seen:
            continue
        comp, stack = [], [p]
        seen.add(p)
        while stack:
            q = stack.pop()
            comp.append(q)
            for nb in graph[q]:
                if nb not in seen:
                    seen.add(nb)
                    stack.append(nb)
        names = {NET[q] for q in comp}
        if len(names) != 1:
            raise RuntimeError(f"dust nets touch: {sorted(names)} near {p}")
    power = {p: 0 for p in NET}
    for p, lvl in SEEDS.items():
        power[p] = lvl
    changed = True
    while changed:
        changed = False
        for p in NET:
            for nb in graph[p]:
                if power[p] - 1 > power[nb]:
                    power[nb] = power[p] - 1
                    changed = True
    for p, lvl in power.items():
        BLOCKS[p][1]["power"] = str(lvl)


def normalized():
    xs, ys, zs = zip(*BLOCKS)
    off = (min(xs), min(ys), min(zs))
    return off, (max(xs) - off[0] + 1, max(ys) - off[1] + 1, max(zs) - off[2] + 1)


def rel(pos, off):
    return (pos[0] - off[0], pos[1] - off[1], pos[2] - off[2])


def state_string(pos):
    name, props = BLOCKS[pos]
    s = name + ("[" + ",".join(f"{k}={v}" for k, v in sorted(props.items())) + "]" if props else "")
    if pos in TILES:
        s += Compound({k: v for k, v in TILES[pos].items() if k != "id"}).snbt(compact=True)
    return s


def main():
    out = os.path.dirname(os.path.abspath(__file__))
    solve_dust()
    off, size = normalized()
    tag = "_test" if TEST else ""
    reg = Region(0, 0, 0, *size)
    for pos, (name, props) in BLOCKS.items():
        reg[rel(pos, off)] = BlockState(name, **props)
    for pos, nbt in TILES.items():
        x, y, z = rel(pos, off)
        data = Compound(nbt)
        data["x"], data["y"], data["z"] = Int(x), Int(y), Int(z)
        reg.tile_entities.append(TileEntity(data))
    reg.as_schematic(name="auto_regear_maker" + tag, author="build_regear.py",
                     description="Auto Regear Shulker Maker (MC 1.21.4, no music discs)",
                     mc_version=MC_DATA_VERSION_1_21_4).save(
        os.path.join(out, f"auto_regear_maker{tag}.litematic"))

    w, h, l = size
    lines = ["# Auto Regear Shulker Maker - Minecraft Java 1.21.4",
             "# Run where the machine's min corner should go; it builds toward +x +y +z.",
             f"fill ~ ~ ~ ~{w - 1} ~{h - 1} ~{l - 1} minecraft:air"]
    for p in sorted(BLOCKS, key=lambda p: (PHASE[p], p[1], p[2], p[0])):
        x, y, z = rel(p, off)
        lines.append(f"setblock ~{x} ~{y} ~{z} {state_string(p)}")
    ix, iy, iz = rel((1, 2, 0), off)
    lines.append('tellraw @s {"text":"Regear maker built. Put empty shulker boxes in the top '
                 f'input chest at ~{ix} ~{iy} ~{iz}.","color":"green"}}')
    fill = ["# Puts 9 empty shulker boxes into the input chest (run from the build position)."]
    fill.append(f"data merge block ~{ix} ~{iy} ~{iz} " + Compound({"Items": List[Compound](
        [item(i, "white_shulker_box") for i in range(9)])}).snbt(compact=True))
    with open(os.path.join(out, f"auto_regear_maker{tag}.mcfunction"), "w") as f:
        f.write("\n".join(lines) + "\n")
    fn = os.path.join(out, "datapack", "regear_maker", "data", "regear", "function")
    os.makedirs(fn, exist_ok=True)
    with open(os.path.join(fn, f"build{tag}.mcfunction"), "w") as f:
        f.write("\n".join(lines) + "\n")
    with open(os.path.join(fn, "load_test_shulkers.mcfunction"), "w") as f:
        f.write("\n".join(fill) + "\n")
    with open(os.path.join(out, "datapack", "regear_maker", "pack.mcmeta"), "w") as f:
        f.write('{"pack": {"pack_format": %d, "description": "Auto Regear Shulker Maker"}}\n'
                % PACK_FORMAT_1_21_4)
    oc = rel((1, -3 + 2 * STATION_DY, 0), off)
    print(f"blocks {len(BLOCKS)}  size {size}  offset {off}  input chest {(ix, iy, iz)}  output chest {oc}")


if __name__ == "__main__":
    main()
