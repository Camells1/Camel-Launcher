# ArcadeBridge

Paper 1.21 plugin that moves in-game money (EssentialsX through Vault) to and from the
Chaos Arcade website **Vault**.

| In-game command | What it does |
|---|---|
| `/arcade link <code>` | Connects the Minecraft account to a website account (code from the website's Vault page) |
| `/arcade deposit <amount>` | Takes the money in-game and adds it to the website Vault (`1k`, `2.5m`, `1b` work) |
| `/pay <bank-account> <amount>` | Same as a deposit, when `pay-bank-deposits` is on |
| `/arcade withdraw <amount>` | Takes it off the website Vault and pays it in-game |
| `/arcade balance` | Shows the website Vault balance |
| `/arcade status`, `/arcade reload` | Admin only (op) |

Withdrawals requested on the website are paid within a few seconds, also to offline players.

## Setup

1. **Pick a secret**: a long random string, at least 24 characters. For example, run
   `openssl rand -hex 32` or mash the keyboard. Keep it private: anyone who has it can add Vault money.
2. **Website**: open `lib.php` and set
   `define('MC_SECRET', 'your-secret-here');` (replace the line with CHANGE-ME), then upload `lib.php`.
3. **Minecraft server** (needs Paper 1.21.x, Vault and EssentialsX):
   - Put `ArcadeBridge-1.0.0.jar` in `plugins/` and restart.
   - Open `plugins/ArcadeBridge/config.yml` and set:
     - `website-url`: the full address of `vault.php`, for example `https://citt.nl/vault.php`
     - `secret`: the same secret as in `lib.php`
     - `bank-account`: the player account that holds the casino's money (deposits go in, withdrawals come out)
   - Run `/arcade reload`, then `/arcade status`. It should say **ready: yes**.
4. **Fund the bank**: give the bank account some money so it can pay out big wins.

## How it stays safe

- Vault balances live only on the website's server (`lb-data/vault.json`), never in the browser.
  Vault bets (Dice, Limbo, Coin Flip) are settled on the server with `random_int`.
- Every request from the plugin is signed with HMAC-SHA256 and a timestamp. Requests without
  the right signature, or older than 90 seconds, are refused.
- Money is always taken first and given back if the other side refuses. Every transfer has a
  unique id, so a retried request is never counted twice. Unanswered deposits are retried
  automatically, also after a restart (`state.yml`).
- Limits (in `vault.php`): max bet 1B, max win per bet 5B, minimum withdrawal 1,000.

## Build

```
mvn package
```
The jar ends up in `target/`.
