# Auto Regear Shulker Maker (Minecraft Java 1.21.4, no music discs)

## Compact version (recommended): `compact_regear_maker.litematic`
**One build works everywhere:** singleplayer, normal servers, and servers whose hoppers move 8 items at a time (breezevanilla.eu). Tested on vanilla 1.21.4 and on Paper with 8-item hoppers.

Size **88 x 16 x 12** (the old tower was 53 x 81 x 11). Two rows, each with its own button:

| Row | Makes | Time per kit (singleplayer) | Time per kit (8 items/transfer) |
|---|---|---|---|
| **Inventory** (bottom row) | full 27-slot shulker | ~4 min | ~1.7 min |
| **Hotbar** (top row, 9 blocks higher) | 9-slot shulker (slots 1-9) | ~2.75 min | ~50 s |

### Using it
1. Put **empty shulker boxes** in the chest "Empty shulkers (Inventory)" / "Empty shulkers (Hotbar)" at the west end of each row.
2. Press the **button** under the glowing ">> INVENTORY <<" or ">> HOTBAR <<" sign. **One press = one kit.**
3. The copper bulb above the button glows while the kit is being made.
4. The finished box drops into the "Inventory kits" / "Hotbar kits" chest, 2 blocks below the station.
5. **Before the next press, wait ~30 s** in singleplayer (~5 s on an 8-item server) so every slot can refill. If you press too early, the kit still comes out, but slots that hadn't refilled are short.

### Changing the kit (one barrel per slot)
Every slot has its own **barrel** with a sign "Inventory slot N" / "Hotbar slot N" on it. Slot 1 is next to the station; the numbers go up along the row.
* **The item in a slot's barrel is what goes in that slot.** Each kit takes one full stack: 16 pearls, 64 crystals, 1 totem, and so on.
* Keep one item type per barrel. A full barrel lasts 27 kits.
* **To change a slot:**
  1. Swap the barrel's items.
  2. Open the hopper under that barrel and take out the old item stack. Leave the 4 "Blocker" boxes in it.
  3. Make one kit. That kit still has the old item in that slot (it was already in the pot). Every kit after it has the new item.
* Every slot needs an item. An empty barrel leaves no gap: the slots after it shift up by one.

Default kits (from your screenshot):
* Inventory: `[pearl, 7 totems, xp] x2, [pearl, crystal, obsidian, pearl, 4 totems, xp]`
* Hotbar: `[netherite sword, crystal, obsidian, pearl, totem, glowstone, respawn anchor, golden apple, netherite pickaxe]`

### How it works (no clocks, no music discs)
* **Measuring:** each slot is barrel → hopper → **decorated pot** → drain hopper → item line → box.
  * The pot holds exactly one stack, whatever the hopper speed.
  * The hopper above it holds 4 shulker boxes named "Blocker". A hopper can't push a shulker box into a shulker box, so the Blockers stay put.
* **Token:** the button drops one "Token" brick into the row's hopper chain.
  * The first chain hopper of each slot stays locked until that slot's pot is empty. The token waits there while that slot drains into the line, then rolls on to the next slot.
  * Slots fill strictly in order, so every item lands in the right box slot.
* **Kit latch:** a copper bulb turns on at the press and off when the token reaches the end. While it's on, every refill hopper is locked, so each pot gives exactly one stack.
* **Finishing:** when the token reaches the end, a delay line fires a piston that breaks the box into the hopper above the kits chest.
  * The same signal makes the dispenser place the next empty box.
  * The token ends up in "Used tokens". The dropper starts with 576 tokens; when it runs out, move the used ones back into it.

### Files
| File | Use |
|---|---|
| `compact_regear_maker.litematic` | The machine (Litematica) |
| `compact_regear_maker.mcfunction` | Same build as a stand-alone `/setblock` script |
| `datapack/regear_maker/` | `/function regear:compact` builds it at your position |
| `build_compact.py`, `mcgen.py` | Generator. Change `FULL_LAYOUT` / `HOTBAR_LAYOUT`, then run `python3 build_compact.py` |

### Survival notes
A Creative paste comes pre-filled. In Survival, also add:
* 4 shulker boxes renamed "Blocker" in the hopper under every barrel.
* Token bricks (any item renamed "Token" works) in the droppers next to the buttons.
* Wait ~30 s after filling the barrels so the pots fill before the first press.

## Older tower version (bigger, needs a different build per server)

Everything is run from **one control room** at the top of the machine. Both kit types are made by the same machine, each with its own button:

| Kit | Button | Makes |
|---|---|---|
| **Inventory** | east end of the room | a full 27-slot shulker |
| **Hotbar** | west end of the room | a 9-slot shulker (slots 1-9, the rest empty) |

| File | Use |
|---|---|
| `auto_regear_maker_breeze_8x.litematic` | For servers whose hoppers move 8 items per transfer (breezevanilla.eu). 53 x 81 x 11, room on top |
| `auto_regear_maker_singleplayer.litematic` | For singleplayer / normal servers (1 item per transfer) |
| `*.mcfunction` | Stand-alone `/fill` + `/setblock` scripts of the same two builds |
| `datapack/regear_maker/` | `/function regear:build_breeze_8x`, `/function regear:build_singleplayer`, `/function regear:load_test_shulkers` |
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
The two builds only differ in the clock: 120 sticks per station for 8-item servers, 75 for singleplayer.

| Build | Hoppers | First Hotbar kit | First Inventory kit | When several are queued |
|---|---|---|---|---|
| singleplayer | 1 item per transfer | ~5 min | ~15 min | one every ~1 min |
| breeze_8x | 8 items per transfer | ~1 min | ~3 min | one every ~12 s |

## How it works
* **Towers:** each kit type has its own tower of stations: 14 for Inventory, 5 for Hotbar, hidden below the room. Each station fills 2 slots.
* **Lanes:** a slot's chest feeds a hopper column → feeder hoppers → a measuring hopper next to the box.
* **Measuring:** the measuring hopper holds 4 empty shulker boxes named "Blocker", so exactly one stack fits. A hopper can't push a shulker box into a shulker box, so the blockers stay.
* **Ordering:** the first lane of a station starts 0.5 s before the second, so slots fill in order.
* **Clocks:** every station has its own hopper clock with copper-bulb flip-flops. No music discs anywhere.
* **Moving the box:** a piston breaks the box after its dump. It falls into a hopper that feeds the next station's dispenser. The last station sends it into the dropper elevator.

## Survival notes
Litematica pastes in Creative come pre-filled. In Survival, also add:
* Clock sticks in the first clock hopper of every station: 75 (singleplayer) or 120 (breeze_8x).
* 4 shulker boxes renamed "Blocker" in every measuring hopper.
