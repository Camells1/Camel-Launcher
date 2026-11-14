package com.camel.autoconfirm;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import net.fabricmc.loader.api.FabricLoader;

import java.io.IOException;
import java.io.Reader;
import java.io.Writer;
import java.nio.file.Files;
import java.nio.file.Path;

/** Settings, saved to .minecraft/config/camel-auto-confirm.json. */
public class Config {
    private static final Gson GSON = new GsonBuilder().setPrettyPrinting().create();
    private static final Path FILE = FabricLoader.getInstance().getConfigDir().resolve("camel-auto-confirm.json");

    // ---- Auto confirm ----
    /** Press the confirm button automatically. */
    public boolean autoConfirm = true;
    /** Only confirm popups whose title contains this text (case-insensitive). Empty = any popup. */
    public String confirmTitle = "sure you want to sell";
    /** Label of the button to press. */
    public String confirmButton = "Yes";
    /** Ticks to wait before pressing (20 ticks = 1 second). */
    public int confirmDelayTicks = 2;

    // ---- Auto command ----
    /** Command to run, with or without the leading slash, e.g. "sell" or "/sell hand". */
    public String command = "/sell";
    /**
     * Which held item triggers it. Empty = any item. Otherwise either an item id
     * ("minecraft:diamond" or just "diamond") or part of the item's name ("Wheat").
     * Separate several with commas.
     */
    public String item = "";
    /** Seconds between runs. */
    public double intervalSeconds = 5.0;
    /** Run once straight away when you start holding the item, instead of waiting one interval first. */
    public boolean runImmediately = true;
    /** Turn off after this many runs. 0 = no limit. */
    public int maxRuns = 0;
    /** Turn off after this many seconds of being on. 0 = no limit. */
    public double stopAfterSeconds = 0;
    /** When you stop holding the item: true = turn auto command off, false = just pause until you hold it again. */
    public boolean stopWhenNotHeld = false;
    /** Turn auto command off when you leave the server / world. */
    public boolean stopOnDisconnect = true;

    public static Config load() {
        if (Files.exists(FILE)) {
            try (Reader r = Files.newBufferedReader(FILE)) {
                Config c = GSON.fromJson(r, Config.class);
                if (c != null) return c.sanitize();
            } catch (Exception e) {
                AutoConfirmMod.LOGGER.warn("Could not read {}, using defaults", FILE, e);
            }
        }
        Config c = new Config();
        c.save();
        return c;
    }

    public void save() {
        sanitize();
        try {
            Files.createDirectories(FILE.getParent());
            try (Writer w = Files.newBufferedWriter(FILE)) {
                GSON.toJson(this, w);
            }
        } catch (IOException e) {
            AutoConfirmMod.LOGGER.warn("Could not save {}", FILE, e);
        }
    }

    private Config sanitize() {
        if (confirmTitle == null) confirmTitle = "";
        if (confirmButton == null || confirmButton.isBlank()) confirmButton = "Yes";
        if (command == null) command = "";
        if (item == null) item = "";
        if (intervalSeconds < 0.05) intervalSeconds = 0.05;
        if (confirmDelayTicks < 0) confirmDelayTicks = 0;
        if (maxRuns < 0) maxRuns = 0;
        if (stopAfterSeconds < 0) stopAfterSeconds = 0;
        return this;
    }
}
