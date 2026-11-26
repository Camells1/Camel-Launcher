# Auto Regear Shulker Maker (Minecraft Java 1.21.4, no music discs)

The machine fills empty shulker boxes with a crystal PvP regear kit, with no music discs. Each station runs on its own hopper clock with copper-bulb flip-flops.

| File | Use |
|---|---|
| `auto_regear_maker.litematic` | Load with Litematica (21 x 16 x 10) |
| `auto_regear_maker.mcfunction` | Stand-alone `/fill` + `/setblock` script |
| `datapack/regear_maker/` | `/function regear:build`, `/function regear:load_test_shulkers` |
| `build_regear.py` | Generator (`pip install litemapy`, then `python3 build_regear.py`) |

## Using it
1. Put empty shulker boxes in the **input chest** on top of the machine.
2. Filled kits arrive in the **output chest** at the bottom. The first kit takes about 8.5 minutes, because it passes through all 3 stations. After that, one kit arrives about every 2.8 minutes.
3. Keep the 9 **lane chests** stocked. These are the chests on the north, south and west sides of each of the 3 stations.

## Default kit (27 slots)
| Station | North lane | South lane | West lane |
|---|---|---|---|
| 1 (top) | End Crystal x3 stacks | Obsidian x3 | Totem x5 |
| 2 | Enchanted Golden Apple x3 | Ender Pearl x3 | XP Bottle x3 |
| 3 (bottom) | Totem x4 | Respawn Anchor x2 | Glowstone x1 |

## Changing the kit
Each lane has a **measuring hopper**, the hopper touching the shulker cell. It holds 5 slots.
* **Item:** put the new item in that lane's chest. Empty any old items out of its two feeder hoppers and the measuring hopper.
* **Amount:** put an empty shulker box named **"Blocker"** in each slot you *don't* want filled. The lane adds as many full stacks as the hopper has free slots, so 0 blockers = 5 stacks and 4 blockers = 1 stack. A hopper can never push a shulker box into a shulker box, so the blockers stay put.
* **Time limit:** a lane must hold **200 items or fewer**, or it won't finish within one 84-second phase. That's 3 stacks of a 64-item, 5 stacks of a 16-item, or 5 unstackables.
* The total across all 9 lanes must be 27 slots or fewer.
* For a faster machine with smaller kits, put fewer "Clock" sticks in each station's clock hopper. Each stick is 0.4 s per phase.

## How a station works
Supply chest → hopper → hopper (locked while dumping) → measuring hopper (locked while filling) → shulker cell.
The station alternates two phases:
* **FILL phase:** the measuring hoppers fill up.
* **DUMP phase:** the dispenser places the box from the station above into the cell, and the measuring hoppers empty into it.

When DUMP ends, the piston above the cell breaks the box. It falls through an air gap into a hopper that passes it to the next station's dispenser.

## Notes
* Items land in the shulker in the order they arrive, so the kit's contents are exact but the slot order is mixed.
* If a lane chest runs dry, that kit comes out short. Nothing jams.
* When pasting with Litematica in Creative, the lane chests, Blockers and clock sticks come pre-filled. When building in Survival, add the 210 "Clock" sticks to each station's clock hopper and the Blockers yourself (rename them on an anvil).
EOF
echo ok