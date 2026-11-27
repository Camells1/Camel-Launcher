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
 * resource packs off, shaders off (Iris), particles on All, brightness capped
 * at vanilla's max so no fullbright. Press it again to put back exactly what
 * you had. The saved state lives in config/pavle-vanilla.json, so it
 * survives a game restart while Vanilla Mode is still on.
 */
public class VanillaToggleClient implements ClientModInitializer {
    public static final String MOD_ID = "pavlevanilla";
    private static final Logger LOG = LoggerFactory.getLogger("Pavle Vanilla");
    private static final Gson GSON = new GsonBuilder().setPrettyPrinting().create();
    private static final double MAX_VANILLA_GAMMA = 1.0;

    /** What gets saved on the way in, and put back on the way out. */
    static final class Saved {
        boolean active;
        List<String> resourcePacks = new ArrayList<>();
        String particles;
        double gamma = 0.5;
        Boolean shadersEnabled; // null = Iris not installed
    }

    private static KeyBinding toggleKey;
    private Saved state = new Saved();

    @Override
    public void onInitializeClient() {
        KeyBinding.Category category = KeyBinding.Category.create(Identifier.of(MOD_ID, "main"));
        toggleKey = KeyBindingHelper.registerKeyBinding(new KeyBinding(
                "key.pavlevanilla.toggle", InputUtil.Type.KEYSYM, GLFW.GLFW_KEY_K, category));

        state = load();

        ClientTickEvents.END_CLIENT_TICK.register(client -> {
            while (toggleKey.wasPressed()) toggle(client);
            // Fullbright mods push gamma past vanilla's slider; hold it down
            // for as long as Vanilla Mode is on.
            if (state.active && client.options != null) {
                double gamma = client.options.getGamma().getValue();
                if (gamma > MAX_VANILLA_GAMMA) client.options.getGamma().setValue(MAX_VANILLA_GAMMA);
            }
        });
        ClientLifecycleEvents.CLIENT_STARTED.register(client -> {
            if (state.active) LOG.info("Vanilla Mode is still on from last session - press K to restore your setup.");
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
        saved.gamma = options.getGamma().getValue();
        saved.shadersEnabled = IrisBridge.shadersEnabled();
        state = saved;
        save(state);

        // Only the player's own packs (resourcepacks folder) and the optional
        // built-in looks go off; mod-provided and server packs stay so
        // nothing that mods/servers depend on breaks.
        Set<String> keep = new LinkedHashSet<>();
        for (String id : saved.resourcePacks) {
            if (!isTexturePack(id)) keep.add(id);
        }
        boolean packsChanged = keep.size() != saved.resourcePacks.size();

        options.getParticles().setValue(ParticlesMode.ALL);
        if (options.getGamma().getValue() > MAX_VANILLA_GAMMA) options.getGamma().setValue(MAX_VANILLA_GAMMA);
        if (Boolean.TRUE.equals(saved.shadersEnabled)) IrisBridge.setShadersEnabled(false);

        if (packsChanged) {
            packs.setEnabledProfiles(keep);
            options.refreshResourcePacks(packs); // saves options + reloads
        } else {
            options.write();
        }
        notify(client, Text.literal("Pavle Vanilla ON").formatted(Formatting.GREEN, Formatting.BOLD)
                .append(Text.literal("  packs off, particles on, no fullbright").formatted(Formatting.GRAY)));
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
        // setValue() would clamp a fullbright value back to 1.0, so write
        // the raw saved number back through the option's own codec path.
        GammaAccess.setRaw(options, saved.gamma);
        if (Boolean.TRUE.equals(saved.shadersEnabled)) IrisBridge.setShadersEnabled(true);

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
        boolean packsChanged = !new ArrayList<>(packs.getEnabledIds()).equals(restore);

        state = new Saved();
        save(state);

        if (packsChanged) {
            packs.setEnabledProfiles(restore);
            options.refreshResourcePacks(packs);
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
