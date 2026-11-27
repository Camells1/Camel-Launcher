package com.camells.vanillatoggle;

import net.fabricmc.loader.api.FabricLoader;
import net.minecraft.util.Identifier;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.lang.reflect.Field;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Sodium Extra's per-particle toggles (Video Settings -> Extra -> Particles).
 * Pavle Vanilla turns every one of them on and puts your choices back after.
 * Only Sodium Extra's in-memory settings are touched - its config file is
 * never rewritten - so your real setup on disk can't get lost. Reflection
 * keeps Sodium Extra optional.
 */
final class SodiumExtraBridge {
    private static final Logger LOG = LoggerFactory.getLogger("Pavle Vanilla");
    private static final String[] FLAGS = {"particles", "rainSplash", "blockBreak", "blockBreaking"};

    /** Saved copy of the toggles (stored as JSON in pavle-vanilla.json). */
    static final class Snapshot {
        Map<String, Boolean> flags = new LinkedHashMap<>();
        Map<String, Boolean> other = new LinkedHashMap<>();
    }

    private SodiumExtraBridge() {}

    private static Object particleSettings() throws Exception {
        if (!FabricLoader.getInstance().isModLoaded("sodium-extra")) return null;
        Class<?> mod = Class.forName("me.flashyreese.mods.sodiumextra.client.SodiumExtraClientMod");
        Object options = mod.getMethod("options").invoke(null);
        if (options == null) return null;
        return options.getClass().getField("particleSettings").get(options);
    }

    @SuppressWarnings("unchecked")
    private static Map<Identifier, Boolean> otherMap(Object settings) throws Exception {
        return (Map<Identifier, Boolean>) settings.getClass().getField("otherMap").get(settings);
    }

    static Snapshot snapshot() {
        try {
            Object settings = particleSettings();
            if (settings == null) return null;
            Snapshot snap = new Snapshot();
            for (String f : FLAGS) {
                Field field = settings.getClass().getField(f);
                snap.flags.put(f, field.getBoolean(settings));
            }
            Map<Identifier, Boolean> other = otherMap(settings);
            if (other != null) {
                for (Map.Entry<Identifier, Boolean> e : other.entrySet()) {
                    snap.other.put(e.getKey().toString(), e.getValue());
                }
            }
            return snap;
        } catch (Exception e) {
            LOG.warn("Could not read Sodium Extra particle settings", e);
            return null;
        }
    }

    static void enableAll() {
        try {
            Object settings = particleSettings();
            if (settings == null) return;
            for (String f : FLAGS) settings.getClass().getField(f).setBoolean(settings, true);
            Map<Identifier, Boolean> other = otherMap(settings);
            if (other != null) other.replaceAll((id, on) -> true);
        } catch (Exception e) {
            LOG.warn("Could not turn on Sodium Extra particles", e);
        }
    }

    static void restore(Snapshot snap) {
        try {
            Object settings = particleSettings();
            if (settings == null) return;
            for (Map.Entry<String, Boolean> e : snap.flags.entrySet()) {
                settings.getClass().getField(e.getKey()).setBoolean(settings, Boolean.TRUE.equals(e.getValue()));
            }
            Map<Identifier, Boolean> other = otherMap(settings);
            if (other != null) {
                for (Map.Entry<String, Boolean> e : snap.other.entrySet()) {
                    Identifier id = Identifier.tryParse(e.getKey());
                    if (id != null) other.put(id, e.getValue());
                }
            }
        } catch (Exception e) {
            LOG.warn("Could not restore Sodium Extra particle settings", e);
        }
    }
}
