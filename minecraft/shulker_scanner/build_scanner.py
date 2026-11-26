#!/usr/bin/env python3
"""
build_scanner.py - Shulker Location Scanner for Minecraft Java Edition 1.21.4

Generates, from ONE block model (so the two outputs can never drift apart):
  * shulker_location_scanner.litematic                  (Litematica schematic)
  * shulker_location_scanner.mcfunction                 (stand-alone /fill + /setblock script)
  * datapack/shulker_scanner/...                        (same commands as a ready datapack:
                                                          /function scanner:build
                                                          /function scanner:test_shulker)

Requires:  pip install litemapy        (tested with litemapy 0.11.0b0)
Run:       python3 build_scanner.py [output_dir]

Coordinates below are "design coordinates" (+x = east, +y = up, +z = south). They are
shifted so the schematic's minimum corner is (0,0,0); the .mcfunction places that corner at
the block the command is executed from (~ ~ ~).

Machine overview (all timings in redstone ticks, rt = 2 game ticks):
  A  Unloader       Player puts a shulker box on the placement hopper H1. A comparator (CS)
                    reads the shulker; its inverter torch IT is lit only while the shulker is
                    empty/absent.
  B  Clock          Torch T on block BC + a 3rt repeater feeding back into BC = 4 rt on / 4 rt
                    off (8 rt cycle). IT also powers BC, so the clock is stopped while idle.
                    T locks H1 -> H1 is unlocked 4 rt (8 gt = exactly one hopper transfer) per cycle.
  C  Empty detector Rising edge of IT (= falling edge of the shulker comparator) through a
                    subtract-mode comparator pulse generator -> RESET pulse (2 rt). It fires the
                    piston that breaks the empty shulker and resets the counter.
  D  Counter        27 hoppers Hc1..Hc27 in a row, one "Counter Token" item = one-hot position.
                    Falling edge of T (start of every unlock window) -> 1 rt pulse that unlocks
                    the whole row for ~2 gt: the token hops exactly one hopper (the receiving
                    hopper gets an 8 gt transfer cooldown). A comparator + repeater + lamp under
                    each hopper is Output Line k.
                    RESET unlocks 27 drain hoppers below the row (removes the token wherever it
                    is), then ~14 rt later a dropper injects a fresh token into Hc1 (= Position 1).
  E  Sorter         Hopper line with 3-wide tileable filter slices (41 target + 4 x "Filter"
                    sticks -> comparator 2, 42nd item -> 3), lamps flash per recognised item,
                    every slice and the overflow end feed ONE double disposal chest.
"""

import os
import sys

from nbtlib import Byte, Compound, Int, List, String
from litemapy import BlockState, Region, Schematic, TileEntity

MC_DATA_VERSION_1_21_4 = 4189
PACK_FORMAT_1_21_4 = 61

# ---------------------------------------------------------------------------------------------
# Block model
# ---------------------------------------------------------------------------------------------
BLOCKS = {}      # (x,y,z) -> (block_id, {prop: value})
TILES = {}       # (x,y,z) -> nbtlib Compound (block entity data, no x/y/z)
NET = {}         # dust (x,y,z) -> intended net name (used for self-checking)
SEEDS = {}       # dust (x,y,z) -> idle-state power injected by a source next to it
PHASE = {}       # (x,y,z) -> placement phase for the .mcfunction (supports first, dust last)

SUPPORT, CONTAINER, COMPONENT, DUST = 0, 1, 2, 3


def put(pos, block, phase=SUPPORT, **props):
    pos = tuple(pos)
    if pos in BLOCKS:
        raise ValueError(f"two blocks at {pos}: {BLOCKS[pos][0]} and {block}")
    BLOCKS[pos] = ("minecraft:" + block, {k: str(v).lower() for k, v in props.items()})
    PHASE[pos] = phase


def support(pos, block="glass"):
    """Glass by default: dust/diodes can sit on it but it can never carry power."""
    if tuple(pos) not in BLOCKS:
        put(pos, block, SUPPORT)


def dust(pos, net, seed=None):
    put(pos, "redstone_wire", DUST)
    NET[tuple(pos)] = net
    if seed is not None:
        SEEDS[tuple(pos)] = seed
    x, y, z = pos
    support((x, y - 1, z))


def dust_path(points, net, seed=None):
    for i, p in enumerate(points):
        dust(p, net, seed if i == 0 else None)


def repeater(pos, facing, delay=1, powered=False, on=None):
    """facing = side the INPUT comes from (vanilla blockstate convention)."""
    put(pos, "repeater", COMPONENT, facing=facing, delay=delay, powered=powered, locked=False)
    x, y, z = pos
    support((x, y - 1, z), on or "glass")


def comparator(pos, facing, mode="compare", signal=0):
    put(pos, "comparator", COMPONENT, facing=facing, mode=mode, powered=signal > 0)
    TILES[tuple(pos)] = Compound({"id": String("minecraft:comparator"), "OutputSignal": Int(signal)})
    x, y, z = pos
    support((x, y - 1, z))


def wall_torch(pos, facing, lit):
    """facing = direction the torch points (it is attached to the block on the opposite side)."""
    put(pos, "redstone_wall_torch", COMPONENT, facing=facing, lit=lit)


def hopper(pos, facing, enabled=True, items=None):
    put(pos, "hopper", CONTAINER, facing=facing, enabled=enabled)
    TILES[tuple(pos)] = Compound({"id": String("minecraft:hopper"),
                                  "Items": List[Compound](items or []),
                                  "TransferCooldown": Int(0)})


def item(slot, item_id, count=1, name=None, extra=None):
    c = Compound({"Slot": Byte(slot), "id": String("minecraft:" + item_id), "count": Int(count)})
    comps = {}
    if name:
        # 1.21.4 stores custom_name as a JSON text string
        comps["minecraft:custom_name"] = String('"%s"' % name)
    if extra:
        comps.update(extra)
    if comps:
        c["components"] = Compound(comps)
    return c


def filler_sticks():
    return [item(s, "stick", 1, name="Filter") for s in (1, 2, 3, 4)]


# ---------------------------------------------------------------------------------------------
# A + B: placement hopper, shulker comparator, gated 8 rt clock
# ---------------------------------------------------------------------------------------------
H1 = (6, 5, 2)                       # placement hopper; the shulker goes on (6,6,2)
SHULKER_POS = (6, 6, 2)
hopper(H1, "east", enabled=True)     # idle: clock stopped -> H1 unlocked

comparator((5, 6, 2), "east", signal=0)            # CS: reads the shulker box
put((4, 6, 2), "stone")                            # X: powered by CS while the box has items
wall_torch((3, 6, 2), "west", lit=True)            # IT: lit = shulker empty / absent
put((3, 7, 2), "stone")                            # BC: clock block (powered from below by IT)
wall_torch((3, 7, 1), "north", lit=False)          # T : clock torch (off while idle)
repeater((2, 7, 1), "east", delay=3)               # clock loop, 3 rt (+1 rt torch = 4 rt half cycle)
# loop return into BC (idle: BC is strongly powered by IT and back-feeds this dust at 15)
dust_path([(2, 7, 2), (1, 7, 2), (1, 7, 1)], "clock_loop", seed=15)

# T -> H1 lock line: dust ends on block (6,5,1) next to H1, powering it = H1 locked
put((6, 5, 1), "stone")                            # must conduct: it is what locks H1
dust((4, 7, 1), "h1_lock")
dust((5, 7, 1), "h1_lock")
dust((6, 6, 1), "h1_lock")

# ---------------------------------------------------------------------------------------------
# C: shulker-empty detector -> RESET pulse, piston breaks the box
# ---------------------------------------------------------------------------------------------
# rising-edge detector on IT: subtract comparator, rear = direct, side = 2 rt delayed
dust_path([(3, 6, 3), (3, 6, 4), (4, 6, 4), (5, 6, 4), (5, 6, 5)], "it_edge", seed=15)
repeater((4, 6, 5), "east", delay=2, powered=True)
comparator((3, 6, 5), "north", mode="subtract", signal=0)   # CR
repeater((3, 6, 6), "north", delay=1)                        # RESET bus driver
RESET_BUS_PISTON = [(3, 6, 7), (4, 6, 7), (5, 6, 7), (6, 6, 7), (7, 6, 7),
                    (7, 6, 6), (7, 6, 5), (7, 6, 4), (7, 6, 3)]
dust_path(RESET_BUS_PISTON, "reset_bus")
put((7, 6, 2), "piston", COMPONENT, facing="west", extended=False)   # head hits the shulker
dust_path([(2, 6, 7), (1, 6, 7), (0, 6, 7), (-1, 6, 7),
           (-1, 6, 6), (-1, 6, 5), (-1, 6, 4), (-1, 6, 3), (-1, 6, 2)], "reset_bus")
repeater((-1, 6, 1), "south")                                         # R1
dust_path([(-1, 6, z) for z in range(0, -7, -1)] + [(x, 6, -6) for x in range(0, 5)]
          + [(-1, 6, -7)], "reset_mid")
repeater((5, 6, -6), "west")                                          # R2
dust_path([(x, 6, -6) for x in range(6, 14)] + [(13, 6, -7), (13, 6, -8)], "reset_east")
put((13, 6, -9), "stone")                                             # QR
wall_torch((13, 6, -10), "north", lit=True)                           # TRL: drain-lock inverter

# token injector timing chain (fires ~13 rt after RESET, after the drains relocked)
repeater((-1, 6, -8), "south", delay=4)
dust((-1, 6, -9), "inject")
repeater((-1, 6, -10), "south", delay=4)
repeater((-1, 6, -11), "south", delay=1)
repeater((-1, 6, -12), "south", delay=1)
repeater((-1, 6, -13), "south", delay=1)
put((-1, 6, -14), "stone")                                            # J: powers the dropper

# ---------------------------------------------------------------------------------------------
# Advance pulse: falling edge of T
# ---------------------------------------------------------------------------------------------
put((3, 8, 1), "stone")                           # P: strongly powered by T (torch below it)
repeater((3, 8, 0), "south")                      # TR: tap of the clock signal
dust((3, 8, -1), "t_tap")
dust((2, 8, -1), "t_tap")
repeater((2, 8, -2), "south", delay=1)            # side path (fast)
dust((2, 8, -3), "t_side")
repeater((3, 8, -2), "south", delay=2)            # rear path (slow)
comparator((3, 8, -3), "south", mode="subtract")  # CA: 1 rt pulse on T falling edge
put((3, 8, -4), "stone")                          # QA
wall_torch((3, 8, -5), "north", lit=True)         # TA: counter-lock inverter
repeater((3, 8, -6), "south", powered=True)
dust_path([(x, 8, -7) for x in range(3, 14)] + [(13, 8, -8)], "adv_a", seed=15)
repeater((13, 8, -9), "south", powered=True)
dust_path([(13, 8, -10), (13, 8, -11), (13, 8, -12)], "adv_b", seed=15)

# ---------------------------------------------------------------------------------------------
# D: 27-position counter
# ---------------------------------------------------------------------------------------------
CY, CZ = 7, -14
TOKEN = dict(item_id="brick", name="Counter Token")
for k in range(1, 28):
    x = k - 1
    tok = [item(0, TOKEN["item_id"], 1, name=TOKEN["name"])] if k == 1 else []
    hopper((x, CY, CZ), "east", enabled=False, items=tok)          # Hc_k (locked)
    dust((x, CY + 1, CZ), "counter_lock")                          # lock dust on top of Hc_k
    hopper((x, CY - 1, CZ), "down", enabled=False)                 # D_k drain (locked)
    hopper((x, CY - 2, CZ), "west", enabled=True)                  # token collector
    repeater((x, CY - 1, CZ + 1), "south", powered=True)           # drain lock
    dust((x, CY - 1, CZ + 2), "drain_lock")
    # read-out = Output Line k
    sig = 1 if k == 1 else 0
    comparator((x, CY, CZ - 1), "south", signal=sig)
    repeater((x, CY, CZ - 2), "south", powered=sig > 0)
    if k % 2:
        put((x, CY, CZ - 3), "redstone_lamp", COMPONENT, lit=sig > 0)
    else:
        repeater((x, CY, CZ - 3), "south", powered=sig > 0)
        put((x, CY, CZ - 4), "redstone_lamp", COMPONENT, lit=sig > 0)
# middle feeds (x = 13 = Hc14) so 15-strength dust reaches both ends of the 27-long lines
repeater((13, CY + 1, CZ + 1), "south", powered=True)              # counter-lock feed
SEEDS[(13, CY + 1, CZ)] = 15
repeater((13, CY - 1, CZ + 3), "south", powered=True)              # drain-lock feed
SEEDS[(13, CY - 1, CZ + 2)] = 15
put((-1, CY, CZ), "dropper", CONTAINER, facing="east", triggered=False)   # token injector
TILES[(-1, CY, CZ)] = Compound({"id": String("minecraft:dropper"), "Items": List[Compound](
    [item(s, TOKEN["item_id"], 64, name=TOKEN["name"]) for s in range(9)])})
put((-1, CY - 2, CZ), "barrel", CONTAINER, facing="up", open=False)       # used tokens
TILES[(-1, CY - 2, CZ)] = Compound({"id": String("minecraft:barrel"), "Items": List[Compound]([])})

# ---------------------------------------------------------------------------------------------
# E: item sorter + disposal
# ---------------------------------------------------------------------------------------------
SZ = 2
FILTERS = [  # (label, slot-0 item, count, custom name)
    ("Ender Pearl", "ender_pearl", 10, None),       # 16-stack: 10 + 4 sticks gives the same 2 -> 3 step
    ("Golden Carrot", "golden_carrot", 41, None),
    ("Firework Rocket", "firework_rocket", 41, None),
    ("Obsidian", "obsidian", 41, None),
    ("Placeholder Stick", "stick", 41, "Placeholder"),
]
SLICE_X0, PITCH = 9, 3
LINE_END = SLICE_X0 + PITCH * len(FILTERS)      # overflow column
for x in range(7, LINE_END):
    hopper((x, 5, SZ), "east")                  # main item line
for x in range(SLICE_X0, LINE_END):
    hopper((x, 1, SZ), "east")                  # collector under the slices -> chest

for i, (label, iid, cnt, nm) in enumerate(FILTERS):
    x = SLICE_X0 + PITCH * i
    hopper((x, 4, SZ), "north", items=[item(0, iid, cnt, name=nm)] + filler_sticks())  # F
    hopper((x, 3, SZ), "down", enabled=False)                                          # B
    hopper((x, 2, SZ), "down")                                                         # V
    comparator((x, 4, SZ + 1), "north", signal=2)
    dust((x, 4, SZ + 2), f"slice{i}", seed=2)
    dust((x + 1, 4, SZ + 2), f"slice{i}")
    put((x + 1, 3, SZ + 1), "stone")                                                   # K
    dust((x + 1, 4, SZ + 1), f"slice{i}")
    wall_torch((x + 1, 3, SZ), "north", lit=True)                                      # locks B
    support((x + 1, 4, SZ))
    put((x + 2, 3, SZ + 1), "redstone_lamp", COMPONENT, lit=False)                     # "recognised"

ox = LINE_END
hopper((ox, 5, SZ), "down")                    # end overflow hopper
for y in (4, 3, 2):
    hopper((ox, y, SZ), "down")
put((ox, 1, SZ), "chest", CONTAINER, facing="south", type="right", waterlogged=False)
put((ox + 1, 1, SZ), "chest", CONTAINER, facing="south", type="left", waterlogged=False)
for p in ((ox, 1, SZ), (ox + 1, 1, SZ)):
    TILES[p] = Compound({"id": String("minecraft:chest"), "Items": List[Compound]([])})

# ---------------------------------------------------------------------------------------------
# Redstone-dust solver: connection shapes + idle power, and a self-check that no two
# intended dust nets accidentally touch.
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
                            "redstone_wall_torch", "redstone_torch", "piston", "chest")


def connections(pos):
    """Return {dir: 'side'|'up'} and the list of dust neighbours, mirroring RedStoneWireBlock."""
    x, y, z = pos
    conn, links = {}, []
    for d, (dx, dz) in DIRS.items():
        n = (x + dx, y, z + dz)
        b = bid(n)
        up = (x + dx, y + 1, z + dz)
        down = (x + dx, y - 1, z + dz)
        if not conductor((x, y + 1, z)) and sturdy_top(n) and bid(up) == "redstone_wire":
            conn[d] = "up"
            links.append(up)
        elif b == "redstone_wire":
            conn[d] = "side"
            links.append(n)
        elif b == "repeater" and BLOCKS[n][1]["facing"] in (d, OPP[d]):
            conn[d] = "side"
        elif b in ("comparator", "redstone_wall_torch", "redstone_torch"):
            conn[d] = "side"
        elif not conductor(n) and bid(down) == "redstone_wire":
            conn[d] = "side"
            links.append(down)
    if len(conn) == 1:                     # a line end extends straight through
        only = next(iter(conn))
        conn[OPP[only]] = "side"
    if not conn:
        conn = {d: "side" for d in DIRS}
    return conn, links


def solve_dust():
    graph = {}
    for p in NET:
        conn, links = connections(p)
        props = BLOCKS[p][1]
        for d in DIRS:
            props[d] = conn.get(d, "none")
        graph[p] = links
    # net integrity: every connected component must carry exactly one intended net name
    seen = set()
    for p in NET:
        if p in seen:
            continue
        comp, stack = [], [p]
        seen.add(p)
        while stack:
            q = stack.pop()
            comp.append(q)
            for n in graph[q]:
                if n not in seen:
                    seen.add(n)
                    stack.append(n)
        names = {NET[q] for q in comp}
        if len(names) != 1:
            raise RuntimeError(f"dust nets touch each other: {sorted(names)} near {p}")
    # idle power levels
    power = {p: 0 for p in NET}
    frontier = sorted(SEEDS.items(), key=lambda kv: -kv[1])
    for p, lvl in frontier:
        power[p] = max(power[p], lvl)
    changed = True
    while changed:
        changed = False
        for p in NET:
            for n in graph[p]:
                if power[p] - 1 > power[n]:
                    power[n] = power[p] - 1
                    changed = True
    for p, lvl in power.items():
        BLOCKS[p][1]["power"] = str(lvl)
    return power


# ---------------------------------------------------------------------------------------------
# Outputs
# ---------------------------------------------------------------------------------------------
def normalized():
    xs, ys, zs = zip(*BLOCKS)
    off = (min(xs), min(ys), min(zs))
    size = (max(xs) - off[0] + 1, max(ys) - off[1] + 1, max(zs) - off[2] + 1)
    return off, size


def rel(pos, off):
    return (pos[0] - off[0], pos[1] - off[1], pos[2] - off[2])


def state_string(pos):
    name, props = BLOCKS[pos]
    s = name
    if props:
        s += "[" + ",".join(f"{k}={v}" for k, v in sorted(props.items())) + "]"
    if pos in TILES:
        nbt = Compound({k: v for k, v in TILES[pos].items() if k != "id"})
        s += nbt.snbt(compact=True)
    return s


def write_litematic(path, off, size):
    reg = Region(0, 0, 0, *size)
    for pos, (name, props) in BLOCKS.items():
        reg[rel(pos, off)] = BlockState(name, **props)
    for pos, nbt in TILES.items():
        x, y, z = rel(pos, off)
        data = Compound(nbt)
        data["x"], data["y"], data["z"] = Int(x), Int(y), Int(z)
        reg.tile_entities.append(TileEntity(data))
    schem = reg.as_schematic(name="shulker_location_scanner", author="build_scanner.py",
                             description="Shulker Location Scanner (MC 1.21.4)",
                             mc_version=MC_DATA_VERSION_1_21_4)
    schem.save(path)


def mcfunction_lines(off, size):
    w, h, l = size
    out = ["# Shulker Location Scanner - Minecraft Java 1.21.4",
           "# Run while standing where the machine's min corner should be (it builds toward +x +y +z).",
           f"# Footprint {w} x {h} x {l} (x,y,z).",
           f"fill ~ ~ ~ ~{w - 1} ~{h - 1} ~{l - 1} minecraft:air",
           f"fill ~-1 ~-1 ~-1 ~{w} ~-1 ~{l} minecraft:smooth_stone"]
    order = sorted(BLOCKS, key=lambda p: (PHASE[p], p[1], p[2], p[0]))
    for p in order:
        x, y, z = rel(p, off)
        out.append(f"setblock ~{x} ~{y} ~{z} {state_string(p)}")
    sx, sy, sz = rel(SHULKER_POS, off)
    out.append(f'tellraw @s {{"text":"Scanner built. Place a shulker box on top of the hopper at ~{sx} ~{sy - 1} ~{sz}, or run /function scanner:test_shulker","color":"green"}}')
    return out


def test_shulker_lines(off):
    sx, sy, sz = rel(SHULKER_POS, off)
    kinds = [("ender_pearl", None, None), ("golden_carrot", None, None),
             ("totem_of_undying", None, None), ("firework_rocket", None, None),
             ("obsidian", None, None),
             ("splash_potion", None, {"minecraft:potion_contents": Compound({"potion": String("minecraft:healing")})}),
             ("stick", "Placeholder", None), ("cobblestone", None, None), ("dirt", None, None)]
    items = []
    for s in range(27):
        iid, name, extra = kinds[s % len(kinds)]
        items.append(item(s, iid, 1, name=name, extra=extra))
    nbt = Compound({"Items": List[Compound](items)}).snbt(compact=True)
    return ["# Places a test shulker (27 slots, 1 item each) on the placement hopper.",
            "# Run from the SAME position you ran scanner:build from.",
            f"setblock ~{sx} ~{sy} ~{sz} minecraft:shulker_box[facing=up]{nbt}"]


def main():
    out_dir = sys.argv[1] if len(sys.argv) > 1 else os.path.dirname(os.path.abspath(__file__))
    solve_dust()
    off, size = normalized()
    os.makedirs(out_dir, exist_ok=True)
    lit_path = os.path.join(out_dir, "shulker_location_scanner.litematic")
    write_litematic(lit_path, off, size)

    build = mcfunction_lines(off, size)
    test = test_shulker_lines(off)
    with open(os.path.join(out_dir, "shulker_location_scanner.mcfunction"), "w") as f:
        f.write("\n".join(build) + "\n")
    fn_dir = os.path.join(out_dir, "datapack", "shulker_scanner", "data", "scanner", "function")
    os.makedirs(fn_dir, exist_ok=True)
    with open(os.path.join(fn_dir, "build.mcfunction"), "w") as f:
        f.write("\n".join(build) + "\n")
    with open(os.path.join(fn_dir, "test_shulker.mcfunction"), "w") as f:
        f.write("\n".join(test) + "\n")
    with open(os.path.join(out_dir, "datapack", "shulker_scanner", "pack.mcmeta"), "w") as f:
        f.write('{"pack": {"pack_format": %d, "description": "Shulker Location Scanner"}}\n'
                % PACK_FORMAT_1_21_4)

    sx, sy, sz = rel(SHULKER_POS, off)
    print(f"blocks: {len(BLOCKS)}  block entities: {len(TILES)}  size: {size}")
    print(f"wrote {lit_path}")
    print(f"shulker goes at relative ({sx},{sy},{sz}); placement hopper at ({sx},{sy - 1},{sz})")


if __name__ == "__main__":
    main()
