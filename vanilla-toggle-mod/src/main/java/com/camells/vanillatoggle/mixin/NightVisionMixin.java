package com.camells.vanillatoggle.mixin;

import com.camells.vanillatoggle.VanillaToggleClient;
import net.minecraft.client.MinecraftClient;
import net.minecraft.entity.LivingEntity;
import net.minecraft.entity.effect.StatusEffect;
import net.minecraft.entity.effect.StatusEffectInstance;
import net.minecraft.entity.effect.StatusEffects;
import net.minecraft.registry.entry.RegistryEntry;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfoReturnable;

/**
 * While Pavle Vanilla is on, the local player's night vision is ignored for
 * everything that asks about it (lightmap brightness, fog, sky color). The
 * effect itself is left alone - servers keep re-applying it anyway - so it
 * simply comes back the moment Pavle Vanilla is turned off, if it's still on
 * you by then.
 */
@Mixin(LivingEntity.class)
public abstract class NightVisionMixin {
    private boolean pavlevanilla$hideNightVision(RegistryEntry<StatusEffect> effect) {
        return effect == StatusEffects.NIGHT_VISION
                && VanillaToggleClient.isActive()
                && (Object) this == MinecraftClient.getInstance().player;
    }

    @Inject(method = "hasStatusEffect", at = @At("HEAD"), cancellable = true)
    private void pavlevanilla$hasStatusEffect(RegistryEntry<StatusEffect> effect, CallbackInfoReturnable<Boolean> cir) {
        if (pavlevanilla$hideNightVision(effect)) cir.setReturnValue(false);
    }

    @Inject(method = "getStatusEffect", at = @At("HEAD"), cancellable = true)
    private void pavlevanilla$getStatusEffect(RegistryEntry<StatusEffect> effect, CallbackInfoReturnable<StatusEffectInstance> cir) {
        if (pavlevanilla$hideNightVision(effect)) cir.setReturnValue(null);
    }
}
