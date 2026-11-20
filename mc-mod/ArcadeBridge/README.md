# ArcadeBridge (Fabric client mod)

Runs on the casino's Minecraft account (your alt) and connects the server's money to the
Chaos Arcade website **Vault**. Minecraft 1.21.x, Fabric Loader 0.15+, Fabric API.

## What players do

| In-game | What happens |
|---|---|
| `/msg <alt> link CODE` | Links their Minecraft name to their website account (code from the website's Vault page) |
| `/pay <alt> 10000` | Deposit: the money lands in their website Vault within a few seconds |
| `/msg <alt> withdraw 10000` | Withdraw: the alt pays them back with `/pay` |
| `/msg <alt> balance` | The alt replies with their Vault balance |
| Withdraw button on the website | The alt pays them within a few seconds |

The alt has to be online in the server for any of this to work.

## Setup

1. **Pick a secret**: a long random string (24+ characters). Keep it private.
2. **Website**, in `lib.php`:
   - `define('MC_SECRET', 'your-secret');`
   - `define('VAULT_BOT', 'YourAltName');` (the alt's Minecraft name; it's shown to players on the Vault page)
   Then upload `lib.php`.
3. **The alt's computer**: install Fabric for 1.21.x and Fabric API, put `arcadebridge-1.0.0.jar` in `.minecraft/mods`,
   start the game once, and close it. Then edit `.minecraft/config/arcadebridge.json`:
   - `"websiteUrl"`: `"https://citt.nl/vault.php"`
   - `"secret"`: the same secret as in `lib.php`
   - `"serverAddress"`: part of the server's address (for example `"play.myfriend.net"`), so it only works there
4. Join the server with the alt and type `/arcadebridge on`. `/arcadebridge` shows the status (it should say **active**).
5. Keep enough money on the alt to pay out wins.

`/arcadebridge off` stops it at once. `/arcadebridge reload` re-reads the config.

## Safety

- **Only server system messages are read**, never player chat. A player who types
  "$1,000 has been received from Steve." in chat or in a /msg is ignored.
- **Nicknames are refused** (names starting with `~`, the EssentialsX nickname prefix), so nobody can pose as another
  player. A payment from a nicknamed player is not credited; the alt shows you a red warning to pay it back by hand.
- **Signed requests**: every request to the website is signed with the secret (HMAC-SHA256 plus a timestamp).
  Without the secret nobody can add Vault money.
- **No double payouts**: payouts are sent one at a time, and each is only marked paid after the server's
  "$X has been sent to NAME." message. If that never comes, the payout is **held for review**: the site admin
  checks it on the Vault page and marks it paid or refunds it. A clear refusal ("not enough money") is
  refunded automatically.
- **Not linked?** A payment from someone who isn't linked is sent back to them automatically.
- Unanswered deposits are retried, also after a restart (`config/arcadebridge-state.json`).

## Other chat formats

The defaults match EssentialsX. If your server words things differently, change these regexes in
`arcadebridge.json`: `receivedPattern` (group 1 = amount, group 2 = payer), `sentPattern`,
`whisperPattern` (group 1 = sender, group 2 = text) and `failPattern`, and the commands
`payCommand` / `replyCommand`.

## Build

`gradle build` → `build/libs/arcadebridge-1.0.0.jar`
