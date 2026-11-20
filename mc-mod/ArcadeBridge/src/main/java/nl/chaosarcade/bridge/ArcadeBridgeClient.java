package nl.chaosarcade.bridge;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import net.fabricmc.api.ClientModInitializer;
import net.fabricmc.fabric.api.client.command.v2.ClientCommandManager;
import net.fabricmc.fabric.api.client.command.v2.ClientCommandRegistrationCallback;
import net.fabricmc.fabric.api.client.command.v2.FabricClientCommandSource;
import net.fabricmc.fabric.api.client.event.lifecycle.v1.ClientTickEvents;
import net.fabricmc.fabric.api.client.message.v1.ClientReceiveMessageEvents;
import net.fabricmc.loader.api.FabricLoader;
import net.minecraft.client.MinecraftClient;
import net.minecraft.client.network.ServerInfo;
import net.minecraft.text.Text;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.text.NumberFormat;
import java.time.Duration;
import java.util.*;
import java.util.concurrent.CompletableFuture;
import java.util.function.Consumer;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * ArcadeBridge (client mod) — runs on the casino's Minecraft account (your alt).
 *
 *  - Someone pays the alt        "$1,000 has been received from Steve."   -> Steve's website Vault +1,000
 *  - Someone messages the alt    "[Steve -> me] link ABC123"              -> links Steve to a website account
 *                                "[Steve -> me] withdraw 5000"            -> queues a payout from Steve's Vault
 *                                "[Steve -> me] balance"                  -> replies with the Vault balance
 *  - Website withdrawals         polled every few seconds, paid with "/pay Steve 5000", confirmed by
 *                                "$5,000 has been sent to Steve."
 *
 * Only SYSTEM messages from the server are read (never player chat), so players can't fake a payment by typing it.
 * Every website request is signed with HMAC-SHA256(secret, timestamp + "\n" + body).
 * Payouts are sent one at a time; if a payout is never confirmed it is put on hold for an admin, never paid twice.
 */
public final class ArcadeBridgeClient implements ClientModInitializer {

    /* ---------------- config (config/arcadebridge.json) ---------------- */
    static final class Config {
        boolean enabled = false;
        String websiteUrl = "https://citt.nl/vault.php";
        String secret = "CHANGE-ME-to-a-long-random-string";
        /** Only work while connected to a server whose address contains this (empty = any server). */
        String serverAddress = "";
        int pollSeconds = 5;
        long minDeposit = 1000;
        String currencySymbol = "$";
        /** EssentialsX defaults. {amount} and {name} parts are capture groups 1 and 2 (order fixed below). */
        String receivedPattern = "^\\$?([0-9][0-9.,]*[kKmMbB]?) has been received from (\\S+?)\\.?$";
        String sentPattern = "^\\$?([0-9][0-9.,]*[kKmMbB]?) has been sent to (\\S+?)\\.?$";
        String whisperPattern = "^\\[(\\S+) -> (?:me|Me|you|You)\\] (.+)$";
        String failPattern = "(?i)(do not have sufficient funds|not enough money|player not found|cannot pay|error:)";
        String payCommand = "pay {name} {amount}";
        String replyCommand = "msg {name} {text}";
        /** Names starting with this are nicknames (EssentialsX default "~"): ignored, so nobody can pose as another player. */
        String nickPrefix = "~";
    }

    private static final Gson GSON = new GsonBuilder().setPrettyPrinting().create();
    private static final Path CFG = FabricLoader.getInstance().getConfigDir().resolve("arcadebridge.json");
    private static final Path STATE = FabricLoader.getInstance().getConfigDir().resolve("arcadebridge-state.json");

    private Config cfg = new Config();
    private Pattern received, sent, whisper, fail;
    private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(8)).build();

    /* ---------------- persistent state ---------------- */
    static final class State {
        Map<String, long[]> pendingDeposits = new LinkedHashMap<>();   // tx -> [amount]; name kept in depositNames
        Map<String, String> depositNames = new LinkedHashMap<>();
        List<Integer> paidJobs = new ArrayList<>();                      // queue jobs already paid in-game
        Map<Integer, String> pendingDone = new LinkedHashMap<>();        // job id -> "ok" | "fail:reason" | "hold:reason"
    }
    private State st = new State();

    /* ---------------- payout queue (one /pay at a time) ---------------- */
    static final class Pay { int job; String name; long amount; String why; Pay(int j, String n, long a, String w){ job = j; name = n; amount = a; why = w; } }
    private final Deque<Pay> payQueue = new ArrayDeque<>();
    private Pay current; private int currentWait;
    private final Deque<String> outbox = new ArrayDeque<>();   // replies / commands, spaced out to avoid spam kicks
    private int tick, outboxCooldown;
    private final Set<Integer> knownJobs = new HashSet<>();

    // =====================================================================================

    @Override public void onInitializeClient() {
        loadConfig(); loadState();
        ClientReceiveMessageEvents.GAME.register((message, overlay) -> { if (!overlay) onSystemMessage(message.getString()); });
        ClientTickEvents.END_CLIENT_TICK.register(c -> onTick());
        ClientCommandRegistrationCallback.EVENT.register((dispatcher, reg) -> dispatcher.register(
            ClientCommandManager.literal("arcadebridge")
                .executes(ctx -> { status(ctx.getSource()); return 1; })
                .then(ClientCommandManager.literal("on").executes(ctx -> { cfg.enabled = true; saveConfig(); say(ctx.getSource(), "§aEnabled."); status(ctx.getSource()); return 1; }))
                .then(ClientCommandManager.literal("off").executes(ctx -> { cfg.enabled = false; saveConfig(); say(ctx.getSource(), "§cDisabled. Payments are no longer processed."); return 1; }))
                .then(ClientCommandManager.literal("reload").executes(ctx -> { loadConfig(); say(ctx.getSource(), "§aConfig reloaded."); status(ctx.getSource()); return 1; }))));
    }

    private boolean active() {
        MinecraftClient mc = MinecraftClient.getInstance();
        if (!cfg.enabled || mc.player == null || mc.getNetworkHandler() == null) return false;
        if (cfg.secret.length() < 24 || cfg.secret.contains("CHANGE") || !cfg.websiteUrl.startsWith("http")) return false;
        if (!cfg.serverAddress.isEmpty()) { ServerInfo si = mc.getCurrentServerEntry(); return si != null && si.address.toLowerCase(Locale.ROOT).contains(cfg.serverAddress.toLowerCase(Locale.ROOT)); }
        return true;
    }

    private void status(FabricClientCommandSource src) {
        boolean secretOk = cfg.secret.length() >= 24 && !cfg.secret.contains("CHANGE");
        say(src, "§bArcadeBridge§7: " + (active() ? "§aactive" : "§cinactive") + "§7 | enabled " + cfg.enabled + " | secret " + (secretOk ? "§aok" : "§cnot set") + "§7 | server filter '" + cfg.serverAddress + "'");
        say(src, "§7Website: §f" + cfg.websiteUrl + " §7| waiting deposits " + st.pendingDeposits.size() + " | payouts queued " + payQueue.size() + (current != null ? " (paying " + current.name + ")" : ""));
    }

    // ---------------------------------------------------------------- incoming system messages

    private void onSystemMessage(String raw) {
        if (!active()) return;
        String msg = raw.replaceAll("§.", "").trim();
        Matcher m;
        if ((m = received.matcher(msg)).matches()) {
            long amt = parseAmount(m.group(1)); String name = cleanName(m.group(2));
            if (amt < 1) return;
            if (name == null) { MinecraftClient.getInstance().inGameHud.getChatHud().addMessage(Text.literal("§c[ArcadeBridge] Got " + money(amt) + " from '" + m.group(2) + "' (a nickname), so it was NOT credited. Pay it back by hand.")); return; }
            if (amt < cfg.minDeposit) { reply(name, "Deposits under " + money(cfg.minDeposit) + " are not counted. Sending it back."); payQueue.add(new Pay(0, name, amt, "refund")); return; }
            String tx = "d-" + UUID.randomUUID();
            st.pendingDeposits.put(tx, new long[]{ amt }); st.depositNames.put(tx, name); saveState();
            sendDeposit(tx, name, amt, true);
        } else if ((m = sent.matcher(msg)).matches()) {
            if (current == null) return;
            long amt = parseAmount(m.group(1)); String name = cleanName(m.group(2));
            if (name != null && name.equalsIgnoreCase(current.name) && Math.abs(amt - current.amount) <= 1) finishCurrent(true, "");
        } else if (current != null && fail.matcher(msg).find()) {
            finishCurrent(false, msg.length() > 70 ? msg.substring(0, 70) : msg);
        } else if ((m = whisper.matcher(msg)).matches()) {
            String name = cleanName(m.group(1)); if (name == null) return;
            String[] w = m.group(2).trim().split("\\s+");
            String cmd = w[0].toLowerCase(Locale.ROOT);
            if (cmd.equals("link") && w.length > 1) {
                JsonObject b = new JsonObject(); b.addProperty("code", w[1].toUpperCase(Locale.ROOT)); b.addProperty("name", name);
                call("mc_link", b, r -> reply(name, ok(r) ? "Linked to website account " + r.get("account").getAsString() + ". Pay me to deposit!" : err(r)));
            } else if ((cmd.equals("withdraw") || cmd.equals("wd")) && w.length > 1) {
                long amt = parseAmount(w[1]);
                if (amt < 1) { reply(name, "Usage: withdraw <amount>"); return; }
                JsonObject b = new JsonObject(); b.addProperty("name", name); b.addProperty("amount", amt);
                call("mc_request", b, r -> reply(name, ok(r) ? "Withdrawal of " + money(amt) + " is on its way." : err(r)));
            } else if (cmd.equals("balance") || cmd.equals("bal")) {
                JsonObject b = new JsonObject(); b.addProperty("name", name);
                call("mc_balance", b, r -> reply(name, !ok(r) ? err(r) : r.get("linked").getAsBoolean() ? "Your website Vault: " + money(r.get("bal").getAsLong()) : "You're not linked yet. Get a code on the website, then: msg me link <code>"));
            } else {
                reply(name, "Pay me to deposit. Commands: link <code>, withdraw <amount>, balance");
            }
        }
    }

    private void sendDeposit(String tx, String name, long amt, boolean first) {
        JsonObject b = new JsonObject(); b.addProperty("name", name); b.addProperty("amount", amt); b.addProperty("tx", tx);
        call("mc_deposit", b, r -> {
            if (r == null) { if (first) reply(name, "Got your " + money(amt) + ". The website is slow, it will be added shortly."); return; }
            if (st.pendingDeposits.remove(tx) == null) return;   // another retry already handled it
            st.depositNames.remove(tx); saveState();
            if (ok(r)) reply(name, "Deposited " + money(amt) + ". Website Vault: " + money(r.get("bal").getAsLong()));
            else { reply(name, err(r) + ". Sending your " + money(amt) + " back."); payQueue.add(new Pay(0, name, amt, "refund")); }
        });
    }

    // ---------------------------------------------------------------- payouts

    private void onTick() {
        if (!active()) return;
        tick++;
        if (outboxCooldown > 0) outboxCooldown--;
        else if (!outbox.isEmpty()) { sendCommand(outbox.poll()); outboxCooldown = 25; }
        if (current != null && ++currentWait > 20 * 15) finishCurrent(false, "no confirmation");   // 15 s
        if (current == null && !payQueue.isEmpty() && outboxCooldown == 0) startNext();
        if (tick % (20 * Math.max(2, cfg.pollSeconds)) == 0) poll();
    }

    private void startNext() {
        current = payQueue.poll(); currentWait = 0;
        if (current.job > 0 && st.paidJobs.contains(current.job)) { report(current.job, "ok"); current = null; return; }   // paid before, just confirm
        sendCommand(cfg.payCommand.replace("{name}", current.name).replace("{amount}", Long.toString(current.amount)));
        outboxCooldown = 25;
    }

    private void finishCurrent(boolean paid, String why) {
        Pay p = current; current = null; if (p == null) return;
        if (p.job > 0) {
            if (paid) { st.paidJobs.add(p.job); if (st.paidJobs.size() > 500) st.paidJobs.remove(0); report(p.job, "ok"); reply(p.name, "Paid " + money(p.amount) + " from your website Vault."); }
            // a clear refusal ("not enough money") is safe to refund; a missing confirmation is held for an admin
            else report(p.job, why.equals("no confirmation") ? "hold:" + why : "fail:" + why);
        } else if (!paid) {
            MinecraftClient.getInstance().inGameHud.getChatHud().addMessage(Text.literal("§c[ArcadeBridge] Could not send " + money(p.amount) + " back to " + p.name + ": " + why));
        }
        saveState();
    }

    private void report(int job, String result) {
        st.pendingDone.put(job, result); saveState();
        JsonObject b = new JsonObject(); b.addProperty("id", job);
        b.addProperty("ok", result.equals("ok")); b.addProperty("hold", result.startsWith("hold:"));
        b.addProperty("reason", result.contains(":") ? result.substring(result.indexOf(':') + 1) : "");
        call("mc_done", b, r -> { if (ok(r)) { st.pendingDone.remove(job); saveState(); } });
    }

    private void poll() {
        new HashMap<>(st.pendingDeposits).forEach((tx, v) -> sendDeposit(tx, st.depositNames.get(tx), v[0], false));
        new HashMap<>(st.pendingDone).forEach(this::report);
        call("mc_queue", new JsonObject(), r -> {
            if (!ok(r)) return;
            for (JsonElement el : r.getAsJsonArray("jobs")) {
                JsonObject j = el.getAsJsonObject(); int id = j.get("id").getAsInt();
                if (!knownJobs.add(id)) continue;
                String name = j.get("name").getAsString();
                if (cleanName(name) == null) { report(id, "fail:bad name"); continue; }
                payQueue.add(new Pay(id, name, j.get("amount").getAsLong(), "withdraw"));
            }
        });
    }

    // ---------------------------------------------------------------- website (signed requests)

    private void call(String action, JsonObject body, Consumer<JsonObject> done) {
        String raw = body.toString(), ts = String.valueOf(System.currentTimeMillis() / 1000);
        HttpRequest req;
        try {
            req = HttpRequest.newBuilder(URI.create(cfg.websiteUrl + (cfg.websiteUrl.contains("?") ? "&" : "?") + "action=" + action))
                .timeout(Duration.ofSeconds(12)).header("Content-Type", "application/json").header("User-Agent", "ArcadeBridge/1.0")
                .header("X-Mc-Ts", ts).header("X-Mc-Sig", hmac(ts + "\n" + raw)).POST(HttpRequest.BodyPublishers.ofString(raw, StandardCharsets.UTF_8)).build();
        } catch (Exception e) { done.accept(null); return; }
        CompletableFuture<JsonObject> f = http.sendAsync(req, HttpResponse.BodyHandlers.ofString()).handle((res, ex) -> {
            if (ex != null || res == null) return null;
            try { return JsonParser.parseString(res.body()).getAsJsonObject(); } catch (Exception e) { return null; }
        });
        f.thenAccept(r -> MinecraftClient.getInstance().execute(() -> done.accept(r)));
    }

    private String hmac(String data) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256"); mac.init(new SecretKeySpec(cfg.secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        return HexFormat.of().formatHex(mac.doFinal(data.getBytes(StandardCharsets.UTF_8)));
    }

    // ---------------------------------------------------------------- helpers

    private void reply(String name, String text) { outbox.add(cfg.replyCommand.replace("{name}", name).replace("{text}", text)); }
    private void sendCommand(String cmd) { var nh = MinecraftClient.getInstance().getNetworkHandler(); if (nh != null) nh.sendChatCommand(cmd.startsWith("/") ? cmd.substring(1) : cmd); }
    private static boolean ok(JsonObject r) { return r != null && r.has("ok") && r.get("ok").getAsBoolean(); }
    private static String err(JsonObject r) { return r != null && r.has("error") ? r.get("error").getAsString() : "The website didn't answer, try again in a moment"; }
    private String money(long v) { return cfg.currencySymbol + NumberFormat.getIntegerInstance(Locale.US).format(v); }
    private static void say(FabricClientCommandSource s, String t) { s.sendFeedback(Text.literal(t)); }

    /** A real Minecraft name, or null for nicknames and anything odd. */
    private String cleanName(String n) {
        if (n == null) return null;
        n = n.trim();
        if (!cfg.nickPrefix.isEmpty() && n.startsWith(cfg.nickPrefix)) return null;
        return n.matches("[A-Za-z0-9_]{3,16}") ? n : null;
    }

    /** "1500", "$1,500.00", "1.5k", "2m", "1b" -> whole amount, or -1. */
    static long parseAmount(String s) {
        s = s.trim().toLowerCase(Locale.ROOT).replace("$", "").replace(",", "");
        double mult = 1;
        if (s.endsWith("k")) { mult = 1e3; s = s.substring(0, s.length() - 1); }
        else if (s.endsWith("m")) { mult = 1e6; s = s.substring(0, s.length() - 1); }
        else if (s.endsWith("b")) { mult = 1e9; s = s.substring(0, s.length() - 1); }
        try { double v = Double.parseDouble(s) * mult; return v >= 1 && v < 1e15 ? (long) Math.floor(v + 1e-6) : -1; } catch (NumberFormatException e) { return -1; }
    }

    private void loadConfig() {
        try { if (Files.exists(CFG)) cfg = GSON.fromJson(Files.readString(CFG), Config.class); } catch (Exception e) { cfg = new Config(); }
        if (cfg == null) cfg = new Config();
        received = Pattern.compile(cfg.receivedPattern); sent = Pattern.compile(cfg.sentPattern); whisper = Pattern.compile(cfg.whisperPattern); fail = Pattern.compile(cfg.failPattern);
        saveConfig();
    }
    private void saveConfig() { try { Files.writeString(CFG, GSON.toJson(cfg)); } catch (Exception ignored) {} }
    private void loadState() { try { if (Files.exists(STATE)) { State s = GSON.fromJson(Files.readString(STATE), State.class); if (s != null) st = s; } } catch (Exception ignored) {} }
    private void saveState() { try { Files.writeString(STATE, GSON.toJson(st)); } catch (Exception ignored) {} }
}
