package nl.chaosarcade.bridge;

import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import net.milkbowl.vault.economy.Economy;
import net.milkbowl.vault.economy.EconomyResponse;
import org.bukkit.Bukkit;
import org.bukkit.OfflinePlayer;
import org.bukkit.command.Command;
import org.bukkit.command.CommandSender;
import org.bukkit.command.TabCompleter;
import org.bukkit.configuration.file.YamlConfiguration;
import org.bukkit.entity.Player;
import org.bukkit.event.EventHandler;
import org.bukkit.event.EventPriority;
import org.bukkit.event.Listener;
import org.bukkit.event.player.PlayerCommandPreprocessEvent;
import org.bukkit.plugin.RegisteredServiceProvider;
import org.bukkit.plugin.java.JavaPlugin;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.io.File;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.text.NumberFormat;
import java.time.Duration;
import java.util.*;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * ArcadeBridge: moves in-game money (EssentialsX via Vault) to and from the Chaos Arcade website Vault.
 *
 * Every request to the website is signed with HMAC-SHA256(secret, timestamp + "\n" + body), so only this
 * server can add or remove Vault money. Money is always taken first and given back if the website refuses,
 * and every transfer has a unique id so a retried request is never counted twice.
 */
public final class ArcadeBridge extends JavaPlugin implements Listener, TabCompleter {

    private Economy econ;
    private HttpClient http;
    private String url, secret, bank, sym;
    private long minDeposit;
    private boolean payBank;
    /** deposits whose money was taken in-game but the website did not answer yet: tx -> [uuid, amount] */
    private final Map<String, Object[]> pendingDeposits = new ConcurrentHashMap<>();
    /** website withdrawal jobs that were paid in-game but whose "done" report did not reach the website yet */
    private final Map<Integer, Boolean> pendingDone = new ConcurrentHashMap<>();
    private final Set<Integer> paidJobs = ConcurrentHashMap.newKeySet();
    private File stateFile;
    private int pollTask = -1;

    // ---------------------------------------------------------------- lifecycle

    @Override public void onEnable() {
        saveDefaultConfig();
        RegisteredServiceProvider<Economy> rsp = getServer().getServicesManager().getRegistration(Economy.class);
        if (rsp == null) { getLogger().severe("No economy found. Install Vault and EssentialsX (or another economy plugin)."); getServer().getPluginManager().disablePlugin(this); return; }
        econ = rsp.getProvider();
        http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(8)).build();
        stateFile = new File(getDataFolder(), "state.yml");
        loadState();
        reload();
        getServer().getPluginManager().registerEvents(this, this);
        Objects.requireNonNull(getCommand("arcade")).setTabCompleter(this);
        getLogger().info("ArcadeBridge ready. Economy: " + econ.getName() + (bank.isEmpty() ? " (no bank account set)" : ", bank: " + bank));
    }

    @Override public void onDisable() { saveState(); }

    private void reload() {
        reloadConfig();
        url = getConfig().getString("website-url", "").trim();
        secret = getConfig().getString("secret", "");
        bank = getConfig().getString("bank-account", "").trim();
        payBank = getConfig().getBoolean("pay-bank-deposits", true);
        minDeposit = Math.max(1, getConfig().getLong("min-deposit", 1000));
        sym = getConfig().getString("currency-symbol", "$");
        if (secret.length() < 24 || secret.contains("CHANGE")) getLogger().warning("Set a long random 'secret' in config.yml (the same as MC_SECRET on the website). Transfers are off until then.");
        if (pollTask != -1) Bukkit.getScheduler().cancelTask(pollTask);
        long every = Math.max(2, getConfig().getLong("poll-seconds", 5)) * 20L;
        pollTask = Bukkit.getScheduler().runTaskTimer(this, this::pollWebsite, 60L, every).getTaskId();
    }

    private boolean ready() { return econ != null && secret.length() >= 24 && !secret.contains("CHANGE") && url.startsWith("http"); }

    // ---------------------------------------------------------------- commands

    @Override public boolean onCommand(CommandSender s, Command cmd, String label, String[] a) {
        String sub = a.length > 0 ? a[0].toLowerCase(Locale.ROOT) : "help";
        if (sub.equals("reload") || sub.equals("status")) {
            if (!s.hasPermission("arcadebridge.admin")) { msg(s, "&cNo permission."); return true; }
            if (sub.equals("reload")) { reload(); msg(s, "&aArcadeBridge reloaded."); }
            msg(s, "&7Website: &f" + url + "  &7ready: " + (ready() ? "&ayes" : "&cno (check secret)"));
            msg(s, "&7Bank: &f" + (bank.isEmpty() ? "none" : bank + " &7(" + money(econ.getBalance(Bukkit.getOfflinePlayer(bank))) + ")") + "  &7waiting deposits: &f" + pendingDeposits.size());
            return true;
        }
        if (!(s instanceof Player p)) { msg(s, "&cOnly players can use this."); return true; }
        if (!p.hasPermission("arcadebridge.use")) { msg(p, "&cNo permission."); return true; }
        if (!ready() && !sub.equals("help")) { msg(p, "&cThe arcade bridge is not set up yet. Ask an admin."); return true; }
        switch (sub) {
            case "link" -> {
                if (a.length < 2) { msg(p, "&eGet a code on the website (Vault page), then: &f/arcade link <code>"); return true; }
                JsonObject b = new JsonObject(); b.addProperty("code", a[1].toUpperCase(Locale.ROOT)); b.addProperty("uuid", p.getUniqueId().toString()); b.addProperty("name", p.getName());
                call("mc_link", b).thenAccept(r -> sync(() -> {
                    if (ok(r)) msg(p, "&aLinked! &7This Minecraft account now belongs to website account &f" + r.get("account").getAsString() + "&7.");
                    else msg(p, "&c" + err(r));
                }));
            }
            case "deposit", "dep" -> {
                long amt = a.length > 1 ? parseAmount(a[1]) : -1;
                if (amt < minDeposit) { msg(p, "&eUsage: &f/arcade deposit <amount> &7(minimum " + money(minDeposit) + ", 1k/1m/1b work)"); return true; }
                deposit(p, amt, null);
            }
            case "withdraw", "wd" -> {
                long amt = a.length > 1 ? parseAmount(a[1]) : -1;
                if (amt < 1) { msg(p, "&eUsage: &f/arcade withdraw <amount>"); return true; }
                withdraw(p, amt);
            }
            case "balance", "bal" -> {
                JsonObject b = new JsonObject(); b.addProperty("uuid", p.getUniqueId().toString());
                call("mc_balance", b).thenAccept(r -> sync(() -> {
                    if (!ok(r)) { msg(p, "&c" + err(r)); return; }
                    if (!r.get("linked").getAsBoolean()) msg(p, "&eNot linked yet. Get a code on the website, then &f/arcade link <code>&e.");
                    else msg(p, "&7Website Vault: &a" + money(r.get("bal").getAsLong()));
                }));
            }
            default -> {
                msg(p, "&6&lChaos Arcade Vault");
                msg(p, "&f/arcade link <code> &7- connect to your website account");
                msg(p, "&f/arcade deposit <amount> &7- move money to the website");
                msg(p, "&f/arcade withdraw <amount> &7- move money back in-game");
                msg(p, "&f/arcade balance &7- your website Vault balance");
                if (payBank && !bank.isEmpty()) msg(p, "&7Or simply &f/pay " + bank + " <amount>&7 to deposit.");
            }
        }
        return true;
    }

    @Override public List<String> onTabComplete(CommandSender s, Command c, String l, String[] a) {
        if (a.length == 1) return List.of("link", "deposit", "withdraw", "balance", "help");
        return List.of();
    }

    // ---------------------------------------------------------------- deposits

    /** Take money in-game, then credit the website. If the website refuses, give the money back. */
    private void deposit(Player p, long amt, String fromPay) {
        if (fromPay == null) {
            if (!econ.has(p, amt)) { msg(p, "&cYou don't have " + money(amt) + "."); return; }
            EconomyResponse w = econ.withdrawPlayer(p, amt);
            if (!w.transactionSuccess()) { msg(p, "&cCouldn't take the money: " + w.errorMessage); return; }
            if (!bank.isEmpty()) econ.depositPlayer(Bukkit.getOfflinePlayer(bank), amt);
        }
        String tx = "d-" + UUID.randomUUID();
        pendingDeposits.put(tx, new Object[]{ p.getUniqueId().toString(), amt });
        sendDeposit(tx, p.getUniqueId().toString(), amt, p);
    }

    private void sendDeposit(String tx, String uuid, long amt, Player p) {
        JsonObject b = new JsonObject(); b.addProperty("uuid", uuid); b.addProperty("amount", amt); b.addProperty("tx", tx);
        call("mc_deposit", b).thenAccept(r -> sync(() -> {
            if (r == null) { if (p != null) msg(p, "&eThe website is busy. Your deposit of " + money(amt) + " will go through automatically."); saveState(); return; }
            if (pendingDeposits.remove(tx) == null) return;   // another retry already handled this deposit
            saveState();
            Player online = Bukkit.getPlayer(UUID.fromString(uuid));
            if (ok(r)) { if (online != null) msg(online, "&aDeposited " + money(amt) + "&a. Website Vault: &f" + money(r.get("bal").getAsLong())); return; }
            // refused (for example: account not linked): give the money back
            OfflinePlayer op = Bukkit.getOfflinePlayer(UUID.fromString(uuid));
            if (!bank.isEmpty()) econ.withdrawPlayer(Bukkit.getOfflinePlayer(bank), amt);
            econ.depositPlayer(op, amt);
            if (online != null) msg(online, "&c" + err(r) + " &7Your " + money(amt) + " was given back.");
        }));
    }

    /** "/pay <bank> <amount>": after the command runs, check the bank really received the money, then deposit it. */
    @EventHandler(priority = EventPriority.MONITOR, ignoreCancelled = true)
    public void onPay(PlayerCommandPreprocessEvent e) {
        if (!payBank || bank.isEmpty() || !ready()) return;
        Matcher m = PAY.matcher(e.getMessage().trim());
        if (!m.matches() || !m.group(1).equalsIgnoreCase(bank)) return;
        long amt = parseAmount(m.group(2)); if (amt < 1) return;
        Player p = e.getPlayer();
        if (amt < minDeposit) { Bukkit.getScheduler().runTask(this, () -> msg(p, "&eNote: deposits under " + money(minDeposit) + " are not sent to the website.")); return; }
        OfflinePlayer bankP = Bukkit.getOfflinePlayer(bank);
        double before = econ.getBalance(bankP), payerBefore = econ.getBalance(p);
        Bukkit.getScheduler().runTaskLater(this, () -> {
            double gained = econ.getBalance(bankP) - before, spent = payerBefore - econ.getBalance(p);
            if (gained >= amt - 0.5 && spent >= amt - 0.5) deposit(p, amt, "pay");
        }, 2L);
    }
    private static final Pattern PAY = Pattern.compile("^/(?:essentials:|e)?pay\\s+(\\S+)\\s+([0-9.,]+[kKmMbB]?)\\s*$");

    // ---------------------------------------------------------------- withdrawals

    /** In-game withdraw: take it off the website Vault first, then pay in-game; refund the Vault if paying fails. */
    private void withdraw(Player p, long amt) {
        String tx = "w-" + UUID.randomUUID();
        JsonObject b = new JsonObject(); b.addProperty("uuid", p.getUniqueId().toString()); b.addProperty("amount", amt); b.addProperty("tx", tx);
        call("mc_withdraw", b).thenAccept(r -> sync(() -> {
            if (r == null) { msg(p, "&cThe website didn't answer. Nothing was taken, try again."); return; }
            if (!ok(r)) { msg(p, "&c" + err(r)); return; }
            String why = payOut(p, amt);
            if (why == null) msg(p, "&aWithdrew " + money(amt) + "&a. Website Vault left: &f" + money(r.get("bal").getAsLong()));
            else { JsonObject rf = new JsonObject(); rf.addProperty("tx", tx); call("mc_refund", rf); msg(p, "&c" + why + " &7Your website Vault was refunded."); }
        }));
    }

    /** Pays a player from the bank (or out of thin air when no bank is set). Returns null on success, or the reason it failed. */
    private String payOut(OfflinePlayer to, long amt) {
        if (!bank.isEmpty()) {
            OfflinePlayer b = Bukkit.getOfflinePlayer(bank);
            if (econ.getBalance(b) < amt) return "The casino bank doesn't have enough money right now.";
            EconomyResponse w = econ.withdrawPlayer(b, amt);
            if (!w.transactionSuccess()) return "Bank error: " + w.errorMessage;
        }
        EconomyResponse d = econ.depositPlayer(to, amt);
        if (!d.transactionSuccess()) { if (!bank.isEmpty()) econ.depositPlayer(Bukkit.getOfflinePlayer(bank), amt); return "Payment error: " + d.errorMessage; }
        return null;
    }

    /** Every few seconds: hand out website withdrawals, retry unanswered deposits and "done" reports. */
    private void pollWebsite() {
        if (!ready()) return;
        pendingDeposits.forEach((tx, v) -> sendDeposit(tx, (String) v[0], (Long) v[1], null));
        pendingDone.forEach((id, ok) -> reportDone(id, ok, ok ? "" : "retry"));
        call("mc_queue", new JsonObject()).thenAccept(r -> sync(() -> {
            if (!ok(r)) return;
            JsonArray jobs = r.getAsJsonArray("jobs");
            for (JsonElement el : jobs) {
                JsonObject j = el.getAsJsonObject(); int id = j.get("id").getAsInt(); long amt = j.get("amount").getAsLong();
                if (paidJobs.contains(id)) { reportDone(id, true, ""); continue; }   // already paid: just confirm again
                OfflinePlayer to = Bukkit.getOfflinePlayer(UUID.fromString(j.get("uuid").getAsString()));
                String why = payOut(to, amt);
                if (why == null) { paidJobs.add(id); Player on = to.getPlayer(); if (on != null) msg(on, "&aYour website withdrawal of " + money(amt) + " &aarrived!"); }
                reportDone(id, why == null, why == null ? "" : why);
            }
            saveState();
        }));
    }

    private void reportDone(int id, boolean ok, String reason) {
        pendingDone.put(id, ok); saveState();
        JsonObject b = new JsonObject(); b.addProperty("id", id); b.addProperty("ok", ok); b.addProperty("reason", reason);
        call("mc_done", b).thenAccept(r -> { if (ok(r)) { pendingDone.remove(id); sync(this::saveState); } });
    }

    // ---------------------------------------------------------------- website calls (signed)

    /** POSTs a signed request. Completes with the JSON answer, or null when the website could not be reached. */
    private CompletableFuture<JsonObject> call(String action, JsonObject body) {
        String raw = body.toString(), ts = String.valueOf(System.currentTimeMillis() / 1000);
        HttpRequest req = HttpRequest.newBuilder(URI.create(url + (url.contains("?") ? "&" : "?") + "action=" + action))
            .timeout(Duration.ofSeconds(12)).header("Content-Type", "application/json").header("User-Agent", "ArcadeBridge/1.0")
            .header("X-Mc-Ts", ts).header("X-Mc-Sig", hmac(ts + "\n" + raw))
            .POST(HttpRequest.BodyPublishers.ofString(raw, StandardCharsets.UTF_8)).build();
        return http.sendAsync(req, HttpResponse.BodyHandlers.ofString()).handle((res, ex) -> {
            if (ex != null || res == null) { getLogger().warning("Website not reachable (" + action + "): " + (ex != null ? ex.getMessage() : "no response")); return null; }
            try { return JsonParser.parseString(res.body()).getAsJsonObject(); }
            catch (Exception e) { getLogger().warning("Bad answer from website (" + action + ", HTTP " + res.statusCode() + ")"); return null; }
        });
    }

    private String hmac(String data) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256"); mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return HexFormat.of().formatHex(mac.doFinal(data.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) { throw new IllegalStateException(e); }
    }

    // ---------------------------------------------------------------- state (survives restarts)

    private void loadState() {
        if (!stateFile.exists()) return;
        YamlConfiguration y = YamlConfiguration.loadConfiguration(stateFile);
        var dep = y.getConfigurationSection("deposits");
        if (dep != null) for (String tx : dep.getKeys(false)) pendingDeposits.put(tx, new Object[]{ dep.getString(tx + ".uuid"), dep.getLong(tx + ".amount") });
        var done = y.getConfigurationSection("done");
        if (done != null) for (String id : done.getKeys(false)) pendingDone.put(Integer.parseInt(id), done.getBoolean(id));
        y.getIntegerList("paid").forEach(paidJobs::add);
    }

    private synchronized void saveState() {
        YamlConfiguration y = new YamlConfiguration();
        pendingDeposits.forEach((tx, v) -> { y.set("deposits." + tx + ".uuid", v[0]); y.set("deposits." + tx + ".amount", v[1]); });
        pendingDone.forEach((id, ok) -> y.set("done." + id, ok));
        List<Integer> paid = new ArrayList<>(paidJobs); Collections.sort(paid); if (paid.size() > 500) paid = paid.subList(paid.size() - 500, paid.size());
        y.set("paid", paid);
        try { getDataFolder().mkdirs(); y.save(stateFile); } catch (Exception e) { getLogger().warning("Could not save state.yml: " + e.getMessage()); }
    }

    // ---------------------------------------------------------------- helpers

    private void sync(Runnable r) { if (Bukkit.isPrimaryThread()) r.run(); else Bukkit.getScheduler().runTask(this, r); }
    private static boolean ok(JsonObject r) { return r != null && r.has("ok") && r.get("ok").getAsBoolean(); }
    private static String err(JsonObject r) { return r != null && r.has("error") ? r.get("error").getAsString() : "The website didn't answer. Try again in a moment."; }
    private void msg(CommandSender s, String text) { s.sendMessage(org.bukkit.ChatColor.translateAlternateColorCodes('&', "&8[&bArcade&8] &r" + text)); }
    private String money(double v) { return sym + NumberFormat.getIntegerInstance(Locale.US).format((long) Math.floor(v)); }

    /** "1500", "1,500", "1.5k", "2m", "1b" -> whole amount, or -1 if invalid. */
    static long parseAmount(String s) {
        s = s.trim().toLowerCase(Locale.ROOT).replace(",", "");
        double mult = 1;
        if (s.endsWith("k")) { mult = 1e3; s = s.substring(0, s.length() - 1); }
        else if (s.endsWith("m")) { mult = 1e6; s = s.substring(0, s.length() - 1); }
        else if (s.endsWith("b")) { mult = 1e9; s = s.substring(0, s.length() - 1); }
        try { double v = Double.parseDouble(s) * mult; return v >= 1 && v < 1e15 ? (long) Math.floor(v) : -1; } catch (NumberFormatException e) { return -1; }
    }
}
