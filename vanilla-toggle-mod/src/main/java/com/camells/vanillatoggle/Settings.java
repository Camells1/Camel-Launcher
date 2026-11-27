package com.camells.vanillatoggle;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import net.fabricmc.loader.api.FabricLoader;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.nio.file.Files;
import java.nio.file.Path;

/**
 * Player choices, in config/pavle-vanilla-settings.json. Change them from
 * Mod Menu (Mods -> Pavle Vanilla -> settings) or by editing the file.
 */
public final class Settings {
    private static final Logger LOG = LoggerFactory.getLogger("Pavle Vanilla");
    private static final Gson GSON = new GsonBuilder().setPrettyPrinting().create();
    private static Settings instance;

    /** false (default): K leaves your resource packs on. true: K turns them off too. */
    public boolean disableResourcePacks = false;

    private static Path file() {
        return FabricLoader.getInstance().getConfigDir().resolve("pavle-vanilla-settings.json");
    }

    public static Settings get() {
        if (instance == null) {
            try {
                if (Files.exists(file())) instance = GSON.fromJson(Files.readString(file()), Settings.class);
            } catch (Exception e) {
                LOG.warn("Could not read {}", file(), e);
            }
            if (instance == null) instance = new Settings();
            instance.save(); // writes the file with defaults so it's easy to find and edit
        }
        return instance;
    }

    public void save() {
        try {
            Files.createDirectories(file().getParent());
            Files.writeString(file(), GSON.toJson(this));
        } catch (Exception e) {
            LOG.warn("Could not write {}", file(), e);
        }
    }
}
