package com.camells.vanillatoggle;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import net.fabricmc.api.ClientModInitializer;
import net.fabricmc.fabric.api.client.event.lifecycle.v1.ClientLifecycleEvents;
import net.fabricmc.fabric.api.client.event.lifecycle.v1.ClientTickEvents;
import net.fabricmc.fabric.api.client.keybinding.v1.KeyBindingHelper;
import net.fabricmc.loader.api.FabricLoader;
import net.minecraft.client.MinecraftClient;
import net.minecraft.client.option.GameOptions;
import net.minecraft.client.option.KeyBinding;
import net.minecraft.client.util.InputUtil;
import net.minecraft.particle.ParticlesMode;
import net.minecraft.resource.ResourcePackManager;
import net.minecraft.text.Text;
import net.minecraft.util.Formatting;
import net.minecraft.util.Identifier;
import org.lwjgl.glfw.GLFW;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;
import java.lang.reflect.Method;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

/**
 * Press K (rebindable in Controls) to flip into a stream-safe vanilla look:
 * resource packs off (optional - see Settings), shaders off (Iris), particles on All (including every
 * Sodium Extra particle toggle), brightness capped at vanilla's max so no
 * fullbright from any gamma mod, and no night vision - neither the potion
 * effect (even when a server keeps re-applying it) nor Gamma Utils' own. Press it again to put back exactly what
 * you had. The saved state lives in config/pavle-vanilla.json, so it
 * survives a game restart while Vanilla Mode is still on.
 */
public class VanillaToggleClient implements ClientModInitializer {
    public static final String MOD_ID = "pavlevanilla";
    private static final Logger LOG = LoggerFactory.getLogger("Pavle Vanilla");
    private static final Gson GSON = new GsonBuilder().setPrettyPrinting().create();
    /** The "Bright" end of vanilla's brightness slider. */
    public static final double MAX_VANILLA_GAMMA = 1.0;

    /** What gets saved on the way in, and put back on the way out. */
    static final class Saved {
        boolean active;
        List<String> resourcePacks = new ArrayList<>();
        String particles;
        // Whether this session turned resource packs off. null = saved by
        // v1.0-1.2, which always turned them off.
        Boolean packsDisabled;
        Boolean shadersEnabled; // null = Iris not installed
        Boolean gammaUtilsNightVision; // null = Gamma Utils not installed
        SodiumExtraBridge.Snapshot sodiumExtraParticles; // null = Sodium Extra not installed
    }

    private static KeyBinding toggleKey;
    private static Saved state = new Saved();

    /** Read by the night-vision and brightness mixins every frame. */
    public static boolean isActive() {
        return state.active;
    }

    @Override
    public void onInitializeClient() {
        KeyBinding.Category category = KeyBinding.Category.create(Identifier.of(MOD_ID, "main"));
        toggleKey = KeyBindingHelper.registerKeyBinding(new KeyBinding(
                "key.pavlevanilla.toggle", InputUtil.Type.KEYSYM, GLFW.GLFW_KEY_K, category));

        state = load();
        Settings.get(); // creates config/pavle-vanilla-settings.json on first run

        ClientTickEvents.END_CLIENT_TICK.register(client -> {
            while (toggleKey.wasPressed()) toggle(client);
        });
        ClientLifecycleEvents.CLIENT_STARTED.register(client -> {
            if (!state.active) return;
            LOG.info("Pavle Vanilla is still on from last session - press K to restore your setup.");
            // Sodium Extra's toggles live in memory only, so after a restart
            // they're back to normal - force them on again.
            if (state.sodiumExtraParticles != null) SodiumExtraBridge.enableAll();
        });
    }

    private void toggle(MinecraftClient client) {
        try {
            if (state.active) disable(client);
            else enable(client);
        } catch (Exception e) {
            LOG.error("Could not toggle Vanilla Mode", e);
            notify(client, Text.literal("Pavle Vanilla failed: " + e.getMessage()).formatted(Formatting.RED));
        }
    }

    private void enable(MinecraftClient client) {
        GameOptions options = client.options;
        ResourcePackManager packs = client.getResourcePackManager();

        Saved saved = new Saved();
        saved.active = true;
        saved.resourcePacks = new ArrayList<>(packs.getEnabledIds());
        saved.particles = options.getParticles().getValue().name();
        saved.shadersEnabled = IrisBridge.shadersEnabled();
        saved.gammaUtilsNightVision = GammaUtilsBridge.nightVisionEnabled();
        saved.sodiumExtraParticles = SodiumExtraBridge.snapshot();
        state = saved;
        save(state);

        // Only the player's own packs (resourcepacks folder) and the optional
        // built-in looks go off; mod-provided and server packs stay so
        // nothing that mods/servers depend on breaks.
        // Resource packs are left alone unless the "Turn off resource packs"
        // setting is on (Mod Menu -> Pavle Vanilla, or the settings file).
        Set<String> keep = new LinkedHashSet<>();
        for (String id : saved.resourcePacks) {
            if (!Settings.get().disableResourcePacks || !isTexturePack(id)) keep.add(id);
        }
        boolean packsChanged = keep.size() != saved.resourcePacks.size();
        saved.packsDisabled = packsChanged;
        save(saved);

        options.getParticles().setValue(ParticlesMode.ALL);
        if (saved.sodiumExtraParticles != null) SodiumExtraBridge.enableAll();
        if (Boolean.TRUE.equals(saved.gammaUtilsNightVision)) GammaUtilsBridge.setNightVision(false);
        if (Boolean.TRUE.equals(saved.shadersEnabled)) IrisBridge.setShadersEnabled(false);
        // Brightness needs nothing here: LightmapMixin caps it while active.

        if (packsChanged) {
            packs.setEnabledProfiles(keep);
            options.refreshResourcePacks(packs); // saves options + reloads
        } else {
            options.write();
        }
        String detail = packsChanged
                ? "  packs off, all particles on, no fullbright or night vision"
                : "  all particles on, no fullbright or night vision";
        notify(client, Text.literal("Pavle Vanilla ON").formatted(Formatting.GREEN, Formatting.BOLD)
                .append(Text.literal(detail).formatted(Formatting.GRAY)));
    }

    private void disable(MinecraftClient client) {
        GameOptions options = client.options;
        ResourcePackManager packs = client.getResourcePackManager();
        Saved saved = state;

        try {
            options.getParticles().setValue(ParticlesMode.valueOf(saved.particles));
        } catch (Exception ignored) {
            // unknown/missing value - leave particles as they are
        }
        if (saved.sodiumExtraParticles != null) SodiumExtraBridge.restore(saved.sodiumExtraParticles);
        if (Boolean.TRUE.equals(saved.gammaUtilsNightVision)) GammaUtilsBridge.setNightVision(true);
        if (Boolean.TRUE.equals(saved.shadersEnabled)) IrisBridge.setShadersEnabled(true);

        state = new Saved();
        save(state);

        boolean restorePacks = saved.packsDisabled == null || saved.packsDisabled;
        if (restorePacks) {
            // Re-enable the saved packs that still exist, in their old order.
            packs.scanPacks();
            List<String> restore = new ArrayList<>();
            for (String id : saved.resourcePacks) {
                if (packs.getIds().contains(id)) restore.add(id);
            }
            // Keep anything enabled since that we didn't know about (e.g. a server pack).
            for (String id : packs.getEnabledIds()) {
                if (!restore.contains(id)) restore.add(id);
            }
            restorePacks = !new ArrayList<>(packs.getEnabledIds()).equals(restore);
            if (restorePacks) packs.setEnabledProfiles(restore);
        }
        if (restorePacks) {
            options.refreshResourcePacks(packs); // saves options + reloads
        } else {
            options.write();
        }
        notify(client, Text.literal("Pavle Vanilla OFF").formatted(Formatting.GOLD, Formatting.BOLD)
                .append(Text.literal("  your setup is back").formatted(Formatting.GRAY)));
    }

    private static boolean isTexturePack(String id) {
        return id.startsWith("file/") || id.equals("programmer_art") || id.equals("high_contrast");
    }

    private static void notify(MinecraftClient client, Text text) {
        if (client.inGameHud != null && client.player != null) {
            client.inGameHud.setOverlayMessage(text, false);
        }
        LOG.info(text.getString());
    }

    // ---- persistence ----
    private static Path configFile() {
        return FabricLoader.getInstance().getConfigDir().resolve("pavle-vanilla.json");
    }

    private static Saved load() {
        try {
            Path file = configFile();
            if (Files.exists(file)) {
                Saved s = GSON.fromJson(Files.readString(file), Saved.class);
                if (s != null) return s;
            }
        } catch (Exception e) {
            LOG.warn("Could not read {}", configFile(), e);
        }
        return new Saved();
    }

    private static void save(Saved s) {
        try {
            Files.createDirectories(configFile().getParent());
            Files.writeString(configFile(), GSON.toJson(s));
        } catch (IOException e) {
            LOG.warn("Could not write {}", configFile(), e);
        }
    }

    /** Talks to Iris through its public API by reflection, so Iris stays optional. */
    static final class IrisBridge {
        private static Object config() throws Exception {
            Class<?> api = Class.forName("net.irisshaders.iris.api.v0.IrisApi");
            Object instance = api.getMethod("getInstance").invoke(null);
            return api.getMethod("getConfig").invoke(instance);
        }

        static Boolean shadersEnabled() {
            if (!FabricLoader.getInstance().isModLoaded("iris")) return null;
            try {
                Object cfg = config();
                return (Boolean) cfg.getClass().getMethod("areShadersEnabled").invoke(cfg);
            } catch (Exception e) {
                LOG.warn("Could not read Iris shader state", e);
                return null;
            }
        }

        static void setShadersEnabled(boolean enabled) {
            try {
                Object cfg = config();
                Method m = cfg.getClass().getMethod("setShadersEnabledAndApply", boolean.class);
                m.setAccessible(true);
                m.invoke(cfg, enabled);
            } catch (Exception e) {
                LOG.warn("Could not toggle Iris shaders", e);
            }
        }
    }
}
