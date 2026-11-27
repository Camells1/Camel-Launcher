package com.camells.vanillatoggle;

import net.fabricmc.loader.api.FabricLoader;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Gamma Utils has its own night vision that lights the world without any
 * potion effect, so it's switched off through Gamma Utils itself and back on
 * afterwards. (Its gamma/fullbright is handled by LightmapMixin's cap.)
 * Reflection keeps Gamma Utils optional.
 */
final class GammaUtilsBridge {
    private static final Logger LOG = LoggerFactory.getLogger("Pavle Vanilla");

    private GammaUtilsBridge() {}

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
