# Auto Regear Shulker Maker (Minecraft Java 1.21.4, no music discs)

## Compact version (recommended): `compact_regear_maker.litematic`
**One build works everywhere:** singleplayer, normal servers, and servers whose hoppers move 8 items at a time (breezevanilla.eu). Tested on vanilla 1.21.4 and on Paper with 8-item hoppers.

Size **50 long x 31 wide x 22 tall** (fits a 64 x 33 x 23 hole). Two stacks of two rows: the front stack has Inventory slots 1-9 (bottom) and 10-18 (top); the back stack is a mirror image with the Hotbar (bottom) and Inventory 19-27 (top). Each kit type has **its own shulker station**, so **both kits can be made at the same time**. **One control room on top** is where you do everything.

| Kit | Singleplayer | 8 items/transfer |
|---|---|---|
| Hotbar (9 slots) | ~3 min | ~1 min |
| Inventory (27 slots) | ~4.5 min | ~2 min |
| Both at once | ~4.5 min | ~2 min |

### The control room (on top, door in the front wall)
The room is 3 blocks tall inside.
* **36 barrels in the floor**, one per slot, each with a sign: "Inv 1-18" along the front, "Inv 19-27" and "Hot 1-9" along the back. Fill each barrel with the item for that slot (stackable or not). A full barrel lasts 27 kits.
* **Two buttons**, each next to a glowing sign: ">> INVENTORY <<" (front half) and ">> HOTBAR <<" (back half). **One press = one kit.** You can press both at the same time.
* **Empty shulkers:** each kit type has its own chest, "Empty shulkers (Inventory)" at the front and "Empty shulkers (Hotbar)" at the back.
* **Kits:** "Inventory kits" (front) and "Hotbar kits" (back), both at the west end. Finished boxes come up a water elevator into them.
* **Before pressing the same button again**, wait until its box has arrived plus about 45 s in singleplayer (about 10 s on an 8-item server), so every slot is refilled.

### How refilling works
* Under each barrel is a hopper (no Blockers needed) and a **pot that holds exactly one stack**. When you press a button, a latch under the floor opens the pots of that kit for a while. Each pot drops its one stack down a hopper pipe to its slot, and then refills from the barrel.
* So every kit takes exactly one stack per slot. The hopper under a barrel holds up to 5 stacks of it, so a barrel shows a bit less than you really have.
* **To change a slot:** let that slot run out (or empty its barrel and the hopper under it), then put the new item in. Leftover old items in the pots are used up in the next 2 kits.
* If a barrel runs out, nothing breaks: that slot is skipped and the slots after it shift up by one. Refill the barrel and the next kits are full again.

Default kits (from your screenshot):
* Inventory: `[pearl, 7 totems, xp] x2, [pearl, crystal, obsidian, pearl, 4 totems, xp]`
* Hotbar: `[netherite sword, crystal, obsidian, pearl, totem, glowstone, respawn anchor, golden apple, netherite pickaxe]`

### How it works (no clocks, no music discs)
* **Measuring:** each slot is barrel → hopper → **decorated pot** → drain hopper → item line → box.
  * The pot holds exactly one stack, whatever the hopper speed.
  * The pot only accepts one stack, so no Blockers are needed.
* **Buttons:** a button in the room drops a "Token" brick down a hopper pipe to that kit's station. When it arrives, the first row's token dropper starts the kit, and the station's dispenser places an empty box.
* **Token:** each row has a dropper with "Token" bricks. The row's token runs through the row's hopper chain. The upper Inventory rows are started by the row below finishing.
  * The first chain hopper of each slot stays locked until that slot's pot is empty. The token waits there while that slot drains into the line, then rolls on to the next slot.
  * Slots fill strictly in order, so every item lands in the right box slot.
* **Kit latch:** each row has a copper bulb that turns on when the row starts and off when its token reaches the end. While it's on, every refill hopper in that row is locked, so each pot gives exactly one stack.
* **Stacking:** the Inventory rows run one after another: front bottom, front top, then back top. The front top row drops its items down a hopper column into the front station. The back top row's items cross to the front on a hopper line, and the order is kept. The Hotbar row (back bottom) feeds its own station.
* **Finishing:** when the last row's token reaches the end, a delay line fires the piston, which breaks the box. The box goes through a hopper line into a dropper, which shoots it into the water elevator (soul sand bubble column). The elevator carries it up to the "Kits" chest in the room.
  * Each press makes the dispenser place a new empty box.
  * Tokens end up in "Used tokens" chests (east end of each row, and two at the bottom west for the button tokens). Every dropper starts with 576 tokens; when one runs out, move the used tokens back into it.

### Files
| File | Use |
|---|---|
| `compact_regear_maker.litematic` | The machine (Litematica) |
| `compact_regear_maker.mcfunction` | Same build as a stand-alone `/setblock` script |
| `datapack/regear_maker/` | `/function regear:compact` builds it at your position |
| `build_compact.py`, `mcgen.py` | Generator. Change `FULL_LAYOUT` / `HOTBAR_LAYOUT`, then run `python3 build_compact.py` |

### Survival notes
A Creative paste comes pre-filled. In Survival, also add:
* Token bricks (any item renamed "Token" works) in the two droppers under the buttons and in the dropper at the west end of every row.
* 104 of any one item (for example cobblestone) in each of the two timer hoppers "TA" under the room floor, west of the barrels.
* The first kit after filling the barrels comes out empty, because the slots get their first stack only when you press. Press each button once, throw that box away, and from then on every kit is full.

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
