"""Shared helpers for the Minecraft schematic generators (block model, dust solver, writers)."""
from nbtlib import Byte, Compound, Int, List, String
from litemapy import BlockState, Region, TileEntity

ROT = [False]
ROT180 = {"north": "south", "south": "north", "east": "west", "west": "east"}
BLOCKS, TILES, NET, SEEDS, PHASE = {}, {}, {}, {}, {}
SUPPORT, CONTAINER, COMPONENT, DUST = 0, 1, 2, 3


MIRZ = [None]                   # when set: z -> MIRZ - z, north <-> south (mirrored build)
MIRF = {"north": "south", "south": "north"}


def T(pos):
    pos = tuple(pos)
    return pos if MIRZ[0] is None else (pos[0], pos[1], MIRZ[0] - pos[2])


def put(pos, block, phase=SUPPORT, **props):
    pos = T(pos)
    if MIRZ[0] is not None and props.get("facing") in MIRF:
        props["facing"] = MIRF[props["facing"]]
    if ROT[0] and props.get("facing") in ROT180:
        props["facing"] = ROT180[props["facing"]]
    if pos in BLOCKS:
        raise ValueError(f"two blocks at {pos}: {BLOCKS[pos][0]} and {block}")
    BLOCKS[pos] = ("minecraft:" + block, {k: str(v).lower() for k, v in props.items()})
    PHASE[pos] = phase


def support(pos, block="glass"):
    if T(pos) not in BLOCKS:
        put(pos, block, SUPPORT)


def dust(pos, net, seed=None):
    put(pos, "redstone_wire", DUST)
    NET[T(pos)] = net
    if seed is not None:
        SEEDS[T(pos)] = seed
    support((pos[0], pos[1] - 1, pos[2]))


def repeater(pos, facing, delay=1, powered=False):
    put(pos, "repeater", COMPONENT, facing=facing, delay=delay, powered=powered, locked=False)
    support((pos[0], pos[1] - 1, pos[2]))


def comparator(pos, facing, mode="compare", signal=0):
    put(pos, "comparator", COMPONENT, facing=facing, mode=mode, powered=signal > 0)
    TILES[T(pos)] = Compound({"id": String("minecraft:comparator"), "OutputSignal": Int(signal)})
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
    TILES[T(pos)] = Compound({"id": String("minecraft:" + block.replace("waxed_", "")),
                                  "Items": List[Compound](list(items))})


def hopper(pos, facing, enabled=True, items=()):
    container(pos, "hopper", items, facing=facing, enabled=enabled)
    TILES[T(pos)]["TransferCooldown"] = Int(0)


NON_CONDUCTORS = {"air", "glass", "decorated_pot", "stone_button", "oak_button", "lever", "oak_wall_sign", "oak_sign", "hopper", "repeater", "comparator", "redstone_wire",
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
        elif b in ("comparator", "redstone_wall_torch", "redstone_torch", "oak_button", "stone_button", "lever",
                   "observer", "redstone_block", "target"):
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


