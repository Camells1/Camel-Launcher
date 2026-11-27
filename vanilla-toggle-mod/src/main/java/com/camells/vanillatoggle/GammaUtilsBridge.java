package com.camells.vanillatoggle;

import net.fabricmc.loader.api.FabricLoader;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Gamma Utils has its own night vision that lights the world without any
 * potion effect, so it's switched off through Gamma Utils itself and back on
 * afterwards. Its gamma is set to 0 exactly like typing "/gamma 0", and the
 * old value (and dynamic gamma, if it was on) comes back afterwards.
 * Reflection keeps Gamma Utils optional.
 */
final class GammaUtilsBridge {
    private static final Logger LOG = LoggerFactory.getLogger("Pavle Vanilla");

    private static final String MANAGER = "io.github.sjouwer.gammautils.GammaManager";

    /** Gamma Utils' gamma state, saved in pavle-vanilla.json while Pavle Vanilla is on. */
    static final class GammaSnapshot {
        double value;
        double toggledValue;
        boolean dynamic;
    }

    private GammaUtilsBridge() {}

    private static Object gammaSettings() throws Exception {
        Object config = Class.forName("io.github.sjouwer.gammautils.GammaUtils").getMethod("getConfig").invoke(null);
        return config.getClass().getField("gamma").get(config);
    }

    private static void setGamma(double value) throws Exception {
        // Same call "/gamma <n>" makes, minus the fade and the HUD message.
        Class.forName(MANAGER).getMethod("setGamma", double.class, boolean.class, boolean.class)
                .invoke(null, value, false, false);
    }

    /** Saves Gamma Utils' gamma and sets it to 0 (= "/gamma 0"). null when Gamma Utils isn't installed. */
    static GammaSnapshot gammaToZero() {
        if (!FabricLoader.getInstance().isModLoaded("gammautils")) return null;
        try {
            Object g = gammaSettings();
            GammaSnapshot snap = new GammaSnapshot();
            snap.value = (double) g.getClass().getMethod("getValue").invoke(g);
            snap.toggledValue = (double) g.getClass().getMethod("getToggledValue").invoke(g);
            snap.dynamic = (boolean) g.getClass().getMethod("isDynamicEnabled").invoke(g);
            // Dynamic gamma ignores manual values, so pause it while we're on.
            if (snap.dynamic) g.getClass().getMethod("setDynamicStatus", boolean.class).invoke(g, false);
            setGamma(0.0);
            return snap;
        } catch (Exception e) {
            LOG.warn("Could not set Gamma Utils gamma to 0", e);
            return null;
        }
    }

    static void restoreGamma(GammaSnapshot snap) {
        try {
            Object g = gammaSettings();
            setGamma(snap.value);
            g.getClass().getMethod("setToggledValue", double.class).invoke(g, snap.toggledValue);
            if (snap.dynamic) {
                g.getClass().getMethod("setDynamicStatus", boolean.class).invoke(g, true);
                Class.forName(MANAGER).getMethod("setDynamicGamma").invoke(null);
            }
        } catch (Exception e) {
            LOG.warn("Could not restore Gamma Utils gamma", e);
        }
    }

    /** null when Gamma Utils isn't installed. */
    static Boolean nightVisionEnabled() {
        if (!FabricLoader.getInstance().isModLoaded("gammautils")) return null;
        try {
            Object config = Class.forName("io.github.sjouwer.gammautils.GammaUtils").getMethod("getConfig").invoke(null);
            Object nightVision = config.getClass().getField("nightVision").get(config);
            return (Boolean) nightVision.getClass().getMethod("isEnabled").invoke(nightVision);
        } catch (Exception e) {
            LOG.warn("Could not read Gamma Utils night vision", e);
            return null;
        }
    }

    static void setNightVision(boolean on) {
        try {
            Class.forName("io.github.sjouwer.gammautils.NightVisionManager")
                    .getMethod(on ? "enableNightVision" : "disableNightVision").invoke(null);
        } catch (Exception e) {
            LOG.warn("Could not toggle Gamma Utils night vision", e);
        }
    }
}
