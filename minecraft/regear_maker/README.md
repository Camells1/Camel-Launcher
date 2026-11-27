# Auto Regear Shulker Maker (Minecraft Java 1.21.4, no music discs)

Everything is run from **one control room** at the top of the machine. Both kit types are made by the same machine, each with its own button:

| Kit | Button | Makes |
|---|---|---|
| **Inventory** | east end of the room | a full 27-slot shulker |
| **Hotbar** | west end of the room | a 9-slot shulker (slots 1-9, the rest empty) |

| File | Use |
|---|---|
| `auto_regear_maker.litematic` | Load with Litematica (53 x 81 x 11, the room is the top layer) |
| `auto_regear_maker.mcfunction` | Stand-alone `/fill` + `/setblock` script |
| `datapack/regear_maker/` | `/function regear:build`, `/function regear:load_test_shulkers` |
| `build_regear.py` | Generator: change `FULL_LAYOUT` / `HOTBAR_LAYOUT`, then `python3 build_regear.py` |

## The control room
* **Slot chests:** both long walls are slot chests, named "Inventory slot 1–27" and "Hotbar slot 1–9" (the name shows when you open one). Odd slots are on one wall and even slots on the other.
* **Input:** "Empty shulkers (Inventory)" and "Empty shulkers (Hotbar)" sit above each button. Put empty shulker boxes in them.
* **Buttons:** big green (Inventory) and blue (Hotbar) panels at the two ends, with a glowing ">> PRESS <<" sign and a lamp that lights while pressed. Each press sends exactly **one** box into that tower.
* **Output:** "Inventory kits" and "Hotbar kits" in the middle of the room. Finished boxes come up a dropper elevator into them.

## Setting the layout
**Put the item you want in a slot into that slot's chest.** Each kit takes one full stack from it, or one item if it doesn't stack (totems).
* Stock each slot chest with one item type only.
* Every slot chest of a kit type must hold something. An empty chest leaves no gap; the slots after it shift up by one.
* Two slots can use the same item; each slot still gets its own full stack.
* Each chest refills its slot for up to 27 kits.

## Timing
Works on normal servers and on servers whose hoppers move 8 items per transfer (Paper/Spigot `hopper-amount: 8`, like breezevanilla.eu). Both were tested.

| Hoppers | Station cycle | First Hotbar kit | First Inventory kit | When several are queued |
|---|---|---|---|---|
| normal (1 item) | 96 s | ~8 min | ~22 min | one every ~1.5 min |
| 8 items per transfer | 12 s | ~1 min | ~3 min | one every ~12 s |

## How it works
* **Towers:** each kit type has its own tower of stations: 14 for Inventory, 5 for Hotbar, hidden below the room. Each station fills 2 slots.
* **Lanes:** a slot's chest feeds a hopper column → feeder hoppers → a measuring hopper next to the box.
* **Measuring:** the measuring hopper holds 4 empty shulker boxes named "Blocker", so exactly one stack fits. A hopper can't push a shulker box into a shulker box, so the blockers stay.
* **Ordering:** the first lane of a station starts 0.5 s before the second, so slots fill in order.
* **Clocks:** every station has its own hopper clock (120 sticks) with copper-bulb flip-flops. No music discs anywhere.
* **Moving the box:** a piston breaks the box after its dump. It falls into a hopper that feeds the next station's dispenser. The last station sends it into the dropper elevator.

## Survival notes
Litematica pastes in Creative come pre-filled. In Survival, also add:
* 120 sticks in the first clock hopper of every station.
* 4 shulker boxes renamed "Blocker" in every measuring hopper.
