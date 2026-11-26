# Auto Regear Shulker Maker (Minecraft Java 1.21.4, no music discs)

Two towers, each with its own button. Every shulker slot has its own chest, so **you decide exactly what goes in each slot**:

| Tower | Button makes | Slot chests |
|---|---|---|
| **Inventory** (z = 0, 14 stations) | a full 27-slot kit | "Inventory slot 1" … "Inventory slot 27" |
| **Hotbar** (z = +12, 5 stations) | a 9-slot kit (one third of a shulker, the rest left empty) | "Hotbar slot 1" … "Hotbar slot 9" |

| File | Use |
|---|---|
| `auto_regear_maker.litematic` | Load with Litematica (17 x 75 x 21) |
| `auto_regear_maker.mcfunction` | Stand-alone `/fill` + `/setblock` script |
| `datapack/regear_maker/` | `/function regear:build`, `/function regear:load_test_shulkers` |
| `build_regear.py` | Generator: edit `FULL_LAYOUT` / `HOTBAR_LAYOUT`, then `python3 build_regear.py` |

## Using it
1. Put empty shulker boxes in the chest at the top of a tower ("Empty shulkers (Inventory)" or "(Hotbar)").
2. Press that tower's **button**. Each press releases exactly one box.
3. The finished box drops into "Inventory kits" or "Hotbar kits" at the bottom of the tower. You can press the button again straight away: a new kit comes out about once a minute. A single kit needs about 14 minutes (inventory) or 5 minutes (hotbar) to pass through the whole tower.

## Choosing the layout
Each slot chest's name tells you its slot. Opening a slot chest shows "Inventory slot 7", for example. **Put the item you want in that slot into that chest.**
* Each run takes **one full stack** from each slot chest, or one item if it doesn't stack, like a totem.
* Stock each chest with one item type only.
* Every slot chest of a tower must hold something. An empty chest leaves no gap; the slots after it shift up by one.
* Two slots can use the same item; each slot still gets its own full stack.

## How it works
Every station fills two shulker slots, then passes the box down to the next station.
* **Lanes:** each slot has a lane: slot chest → 2 feeder hoppers → measuring hopper next to the box.
* **Measuring:** the measuring hopper holds 4 empty shulker boxes named "Blocker" plus one free slot, so it measures exactly one stack. A hopper can't push a shulker box into a shulker box, so the blockers never leave.
* **Ordering:** the first lane of a station starts 0.5 s before the second, so the first item of each slot arrives in slot order. With two lanes this is always exact: if both slots hold the same item, both lanes fill the same stacks anyway.
* **Station clock:** each station runs on its own hopper clock with copper-bulb flip-flops. It fills for 30 s, then dumps for 30 s.
* **Moving the box:** at the end of the dump, a piston breaks the box. It falls through an air gap into a hopper that carries it to the next station's dispenser.

## Notes
* In Creative with Litematica, the slot chests, Blockers and clock sticks come pre-filled. In Survival, also add 75 sticks to the first hopper of each station's clock, and 4 Blocker shulker boxes (renamed on an anvil) to each measuring hopper.
