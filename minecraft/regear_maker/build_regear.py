#!/usr/bin/env python3
"""
build_regear.py - Auto Regear Shulker Maker for Minecraft Java Edition 1.21.4 (no music discs)

Outputs (all generated from one block model):
  auto_regear_maker.litematic
  auto_regear_maker.mcfunction
  datapack/regear_maker/   ->  /function regear:build   /function regear:load_test_shulkers

Run:  pip install litemapy && python3 build_regear.py [--test]
      --test builds a fast variant (short clock, tiny kit) used for automated in-game testing.

HOW IT WORKS (see README.md)
  Two towers: Inventory (27 slots, 14 stations) and Hotbar (9 slots, 5 stations), one button each.
  Every shulker slot has its own named chest ("Inventory slot 7"): the item stocked in that chest is
  what ends up in that slot. Each station fills 2 slots (north lane first, south lane 0.5 s later),
  then a piston breaks the box and it drops to the next station's dispenser.
  Lane = slot chest -> S2 -> S (locked while dumping) -> M (locked while filling) -> the box.
  M holds 4 empty "Blocker" shulker boxes + 1 free slot = exactly one stack per run (a hopper can
  never push a shulker box into a shulker box). Each station has its own hopper clock with two
  waxed copper bulbs as flip-flops (no music discs).
"""

import os
import sys

from nbtlib import Byte, Compound, Int, List, String
from litemapy import BlockState, Region, TileEntity

MC_DATA_VERSION_1_21_4 = 4189
PACK_FORMAT_1_21_4 = 61
TEST = "--test" in sys.argv

CLOCK_ITEMS = 30 if TEST else 75           # 80 items x 8 gt = 32 s per phase (1 stack + margin)
STATION_DY = -5

C, O, T, G, P_, X, A_, GL = ("end_crystal", "obsidian", "totem_of_undying", "enchanted_golden_apple",
                             "ender_pearl", "experience_bottle", "respawn_anchor", "glowstone")
# Default layouts: one entry per shulker slot (slot 1 first). Change them in-game via the slot chests.
FULL_LAYOUT = [C, C, C, O, O, O, T, T, T,
               G, G, P_, P_, X, X, X, A_, A_,
               GL, GL, T, T, T, C, O, G, P_]
HOTBAR_LAYOUT = [C, O, G, P_, X, A_, GL, T, T]
if TEST:
    pe, sn, eg = "ender_pearl", "snowball", "egg"
    FULL_LAYOUT = [pe, sn, pe, T, eg, eg, sn, T, pe, eg, pe, sn, T, T, eg, sn, sn, pe,
                   eg, T, pe, sn, eg, pe, T, sn, eg]
    HOTBAR_LAYOUT = [eg, pe, T, sn, pe, eg, T, sn, pe]
TOWERS = [  # name, layout, z offset, output chest name, input chest name
    ("inv", FULL_LAYOUT, 0, "Inventory kits", "Empty shulkers (Inventory)"),
    ("hot", HOTBAR_LAYOUT, 12, "Hotbar kits", "Empty shulkers (Hotbar)"),
]
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
def named(pos, block, name, items=(), **props):
    container(pos, block, items, **props)
    TILES[tuple(pos)]["CustomName"] = String('"%s"' % name)


def station(tw, k, kit, first, last, oz, out_name, in_name, label):
    """Station k of tower tw; cell at local (0,0,0) = global (0, k*STATION_DY, oz).
    kit = (north, south) items = shulker slots 2k+1, 2k+2 (north lane starts first)."""
    oy = k * STATION_DY
    P = lambda x, y, z: (x, y + oy, z + oz)
    n = f"{tw}{k}_"

    # --- cell, dispenser, piston, drop shaft, collector -------------------------------------
    container(P(1, 0, 0), "dispenser", [], facing="west", triggered=False)
    put(P(0, 1, 0), "piston", COMPONENT, facing="down", extended=False)
    for w in ((1, -1, 0), (-1, -1, 0), (0, -1, -1), (0, -1, 1)):
        put(P(*w), "stone")
    if last:
        hopper(P(0, -2, 0), "east")
        hopper(P(1, -2, 0), "down")
        named(P(1, -3, 0), "chest", out_name, facing="south", type="single", waterlogged=False)
    else:
        hopper(P(0, -2, 0), "east")
        hopper(P(1, -2, 0), "down")
        hopper(P(1, -3, 0), "down")
        hopper(P(1, -4, 0), "down")        # = next station's (1,1,0), feeds its dispenser
    if first:   # input: chest -> hopper -> dropper (button = release ONE shulker) -> hoppers -> dispenser
        # nothing may sit directly under the dropper (a hopper there would pull boxes out of it)
        hopper(P(1, 1, 0), "down")
        hopper(P(1, 2, 0), "down")
        hopper(P(2, 2, 0), "west")
        hopper(P(2, 3, 0), "down")
        hopper(P(2, 4, 0), "down")
        container(P(1, 4, 0), "dropper", [], facing="east", triggered=False)
        put(P(0, 4, 0), "stone_button", COMPONENT, face="wall", facing="west", powered=False)
        hopper(P(1, 5, 0), "down")
        named(P(1, 6, 0), "chest", in_name, facing="east", type="single", waterlogged=False)

    # --- lanes (2 per station: N = first slot, S = next slot, started 0.5 s later) ------------
    # Two lanes are always exact: same item -> both fill the same slots; different items ->
    # the second lane's first item claims the next slot. (A 3rd parallel lane can be wrong.)
    lanes = {  # M, S, S2, chest
        "N": ((0, 0, -1), (0, 0, -2), (0, 0, -3), (0, 1, -3), "south"),
        "S": ((0, 0, 1), (0, 0, 2), (0, 0, 3), (0, 1, 3), "north"),
    }
    for idx, lane in enumerate("NS"[:len(kit)]):
        m, s, s2, ch, f = lanes[lane]
        iid = kit[idx]
        slot_no = 2 * k + idx + 1
        hopper(P(*m), f, enabled=False, items=[blocker(i) for i in range(1, 5)])   # 1 free slot = 1 stack
        hopper(P(*s), f, enabled=True)
        hopper(P(*s2), f, enabled=True)
        named(P(*ch), "chest", f"{label} slot {slot_no}", [item(i, iid, STACK[iid]) for i in range(27)],
              facing="north", type="single", waterlogged=False)
    if len(kit) == 1:
        put(P(0, 0, 1), "glass")
    put(P(-1, 0, 0), "glass")                       # closes the cell's west side
    support(P(0, 1, -1))
    support(P(0, 1, -2))

    # --- M locks: torch = NOT A (lit during FILL) -> repeater -> M ---------------------------
    repeater(P(1, 0, -1), "east", powered=True)
    torch(P(2, 0, -1), lit=True)
    put(P(2, -1, -1), "stone")                      # QMn
    repeater(P(3, -1, -1), "east", delay=2)         # N unlocks 4 rt after DUMP starts
    put(P(4, -1, -1), "stone")
    repeater(P(1, 0, -2), "east")
    repeater(P(2, 0, -2), "east", delay=2)          # S hoppers lock/unlock 3 rt after A changes
    if len(kit) == 2:
        repeater(P(1, 0, 1), "east", delay=4, powered=True)  # S lane starts 0.5 s after N
        torch(P(2, 0, 1), lit=True)
        put(P(2, -1, 1), "stone")                   # QMs
        repeater(P(3, -1, 1), "east", delay=4)
        put(P(4, -1, 1), "stone")
        repeater(P(1, 0, 2), "east")
        repeater(P(2, 0, 2), "east", delay=2)
    repeater(P(2, 0, 0), "east")                    # fires the dispenser

    # --- A network ----------------------------------------------------------------------------
    a = n + "A"
    for p in [(3, 0, -2), (3, 0, 0), (3, 0, 2)] + [(4, 0, z) for z in range(-5, 3)]:
        dust(P(*p), a)
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


for tw, layout, oz, out_name, in_name in TOWERS:
    ns = (len(layout) + 1) // 2
    label = "Inventory" if tw == "inv" else "Hotbar"
    for k in range(ns):
        station(tw, k, layout[2 * k:2 * k + 2], k == 0, k == ns - 1, oz, out_name, in_name, label)

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
             ]
    for y0 in range(0, h, 40):
        lines.append(f"fill ~ ~{y0} ~ ~{w - 1} ~{min(h, y0 + 40) - 1} ~{l - 1} minecraft:air")
    for p in sorted(BLOCKS, key=lambda p: (PHASE[p], p[1], p[2], p[0])):
        x, y, z = rel(p, off)
        lines.append(f"setblock ~{x} ~{y} ~{z} {state_string(p)}")
    lines.append('tellraw @s {"text":"Regear maker built. Fill the top chests with empty shulker boxes, '
                 'then press the button on a tower to make one kit.","color":"green"}')
    fill = ["# Puts 9 empty shulker boxes into each tower's input chest (run from the build position)."]
    for tw, layout, oz, *_ in TOWERS:
        ix, iy, iz = rel((1, 6, oz), off)
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
    print(f"blocks {len(BLOCKS)}  size {size}  offset {off}")


if __name__ == "__main__":
    main()
