package com.camells.vanillatoggle.mixin;

import com.camells.vanillatoggle.VanillaToggleClient;
import com.llamalad7.mixinextras.injector.ModifyExpressionValue;
import net.minecraft.client.render.LightmapTextureManager;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Slice;

/**
 * Caps brightness at vanilla's max right where the lightmap reads it, while
 * Pavle Vanilla is on. Gamma/fullbright mods (Gamma Utils etc.) can set
 * whatever value they like - the world still renders with vanilla
 * brightness - and nothing is written to options, so turning Pavle Vanilla
 * off brings their brightness straight back.
 */
@Mixin(LightmapTextureManager.class)
public abstract class LightmapMixin {
    @ModifyExpressionValue(
            method = "update",
            at = @At(value = "INVOKE",
                    target = "Lnet/minecraft/client/option/SimpleOption;getValue()Ljava/lang/Object;",
                    ordinal = 0),
            slice = @Slice(from = @At(value = "INVOKE",
                    target = "Lnet/minecraft/client/option/GameOptions;getGamma()Lnet/minecraft/client/option/SimpleOption;")))
    private Object pavlevanilla$capGamma(Object gamma) {
        if (VanillaToggleClient.isActive() && gamma instanceof Double d && d > VanillaToggleClient.MAX_VANILLA_GAMMA) {
            return VanillaToggleClient.MAX_VANILLA_GAMMA;
        }
        return gamma;
    }
}
