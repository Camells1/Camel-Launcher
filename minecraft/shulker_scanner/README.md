# Shulker Location Scanner (Minecraft Java 1.21.4)

`build_scanner.py` generates everything in this folder from one block model:

| File | Use |
|---|---|
| `shulker_location_scanner.litematic` | Load with Litematica |
| `shulker_location_scanner.mcfunction` | Stand-alone `/fill` + `/setblock` script |
| `datapack/shulker_scanner/` | The same script as a datapack: `/function scanner:build`, `/function scanner:test_shulker` |

Regenerate with `pip install litemapy && python3 build_scanner.py`.

## Quick test (Creative)
1. Copy `datapack/shulker_scanner` into `<world>/datapacks/`, then run `/reload`.
2. Stand where the machine's min corner should go and run `/function scanner:build`. It is 28 x 8 x 26 and builds toward +X +Y +Z.
3. From the same spot, run `/function scanner:test_shulker`. That puts a 27-slot shulker (one item per slot) on the placement hopper at relative `~7 ~4 ~20`.
4. Watch the 27 lamps light one at a time, and the five filter lamps flash. The items end up in the double chest. The empty box is broken, and the counter goes back to lamp 1.

## Limits
* The counter moves once per **item**. It matches the slot number only when each slot holds a single item. Vanilla redstone cannot tell where one slot ends and the next begins.
* Totems and splash potions don't stack, so a hopper filter can't recognise them. They go to the overflow, which feeds the same disposal chest.
* Ender pearls stack to 16, so their filter holds 10 pearls plus 4 sticks (comparator 2, then 3 when a pearl arrives). The other filters hold 41 items plus 4 sticks named "Filter".
* Fireworks only stack if their flight duration matches. The filter holds the default duration-1 rocket.
* A shulker that holds only one item empties before its comparator reacts, so you have to break it by hand.
* The token injector dropper holds 576 tokens, enough for 576 resets. Used tokens go into the barrel next to it.
