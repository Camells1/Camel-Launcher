# Camel Auto Confirm (Fabric 1.21.11)

A client-side mod that does two things:

1. **Auto confirm:** when a server popup like *"Are you sure you want to sell this?"* opens, it presses **Yes** for you.
2. **Auto command:** while you hold an item, it runs a command (e.g. `/sell`) every X seconds.
   Use the two together to sell over and over without clicking.

## Install
1. Install Fabric Loader for 1.21.11 and **Fabric API**.
2. Put `release/camel-auto-confirm-1.0.0.jar` in your `mods` folder.

## Keys (change them in Options → Controls → Camel Auto Confirm)
| Key | Action |
|---|---|
| `K` | Turn auto command on/off |
| `J` | Open settings |
| (none) | Turn auto confirm on/off |

## Settings (press J)
**Auto command**
- **Command**: e.g. `/sell`. Run several at once with `;`, e.g. `/sell ; /bal`.
- **Item**: which held item triggers it. Leave empty for any item. Takes an id (`minecraft:wheat` or `wheat`) or part of the item's name. Separate several with commas. **Held** fills in what's in your hand.
- **Every (sec)**: seconds between runs (decimals work, e.g. `0.5`).
- **Run right away when held**: run as soon as you pick the item up, or wait one interval first.
- **Stop after runs**: switch off after N runs (0 = never).
- **Stop after sec**: switch off after N seconds (0 = never).
- **When item not held**: *Pause* (picks up again when you hold it) or *Turn off*.
- **Turn off on disconnect**.

It never sends a command while a menu or popup is open, so it waits for the confirm popup to close before running again.

**Auto confirm**
- **Title has**: only popups whose title contains this text get confirmed (default `sure you want to sell`). If you leave it empty, **every** popup gets confirmed, so be careful.
- **Button**: label of the button to press (default `Yes`).
- **Delay (ticks)**: wait before pressing (20 ticks = 1 s).

Settings are saved in `.minecraft/config/camel-auto-confirm.json`.

## Build
```bash
./gradlew build   # jar lands in build/libs/
```
