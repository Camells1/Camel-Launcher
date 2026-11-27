package com.camells.vanillatoggle;

import com.camells.vanillatoggle.mixin.SimpleOptionAccessor;
import net.minecraft.client.option.GameOptions;

/**
 * Vanilla's gamma slider rejects anything above 1.0, so restoring a
 * fullbright value through setValue() would silently reset it to default.
 * Values inside the normal range go through the normal path.
 */
final class GammaAccess {
    private GammaAccess() {}

    static void setRaw(GameOptions options, double gamma) {
        if (gamma >= 0.0 && gamma <= 1.0) {
            options.getGamma().setValue(gamma);
        } else {
            ((SimpleOptionAccessor) (Object) options.getGamma()).pavlevanilla$setRawValue(gamma);
        }
    }
}
