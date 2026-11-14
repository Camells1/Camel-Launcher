package com.camel.autoconfirm;

import com.mojang.blaze3d.platform.InputConstants;
import net.fabricmc.api.ClientModInitializer;
import net.fabricmc.fabric.api.client.event.lifecycle.v1.ClientTickEvents;
import net.fabricmc.fabric.api.client.keybinding.v1.KeyBindingHelper;
import net.minecraft.ChatFormatting;
import net.minecraft.client.KeyMapping;
import net.minecraft.client.Minecraft;
import net.minecraft.client.gui.components.AbstractButton;
import net.minecraft.client.gui.components.events.ContainerEventHandler;
import net.minecraft.client.gui.components.events.GuiEventListener;
import net.minecraft.client.gui.screens.Screen;
import net.minecraft.client.input.KeyEvent;
import net.minecraft.core.registries.BuiltInRegistries;
import net.minecraft.network.chat.Component;
import net.minecraft.resources.Identifier;
import net.minecraft.world.item.ItemStack;
import org.lwjgl.glfw.GLFW;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.Locale;

public class AutoConfirmMod implements ClientModInitializer {
    public static final String MOD_ID = "camel-auto-confirm";
    public static final Logger LOGGER = LoggerFactory.getLogger(MOD_ID);

    public static Config config;

    private static KeyMapping toggleCommandKey;
    private static KeyMapping toggleConfirmKey;
    private static KeyMapping openConfigKey;

    // auto-command state
    private static boolean commandOn = false;
    private static boolean wasHolding = false;
    private static int runs = 0;
    private static int ticksOn = 0;
    private static int ticksUntilNext = 0;

    // auto-confirm state
    private static Screen lastScreen = null;
    private static int screenTicks = 0;
    private static boolean pressed = false;

    @Override
    public void onInitializeClient() {
        config = Config.load();

        KeyMapping.Category category = KeyMapping.Category.register(Identifier.fromNamespaceAndPath(MOD_ID, "main"));
        toggleCommandKey = KeyBindingHelper.registerKeyBinding(new KeyMapping(
                "key." + MOD_ID + ".toggle_command", InputConstants.Type.KEYSYM, GLFW.GLFW_KEY_K, category));
        toggleConfirmKey = KeyBindingHelper.registerKeyBinding(new KeyMapping(
                "key." + MOD_ID + ".toggle_confirm", InputConstants.Type.KEYSYM, GLFW.GLFW_KEY_UNKNOWN, category));
        openConfigKey = KeyBindingHelper.registerKeyBinding(new KeyMapping(
                "key." + MOD_ID + ".open_config", InputConstants.Type.KEYSYM, GLFW.GLFW_KEY_J, category));

        ClientTickEvents.END_CLIENT_TICK.register(AutoConfirmMod::tick);
    }

    private static void tick(Minecraft mc) {
        while (openConfigKey.consumeClick()) {
            mc.setScreen(new ConfigScreen(mc.screen));
        }
        while (toggleConfirmKey.consumeClick()) {
            config.autoConfirm = !config.autoConfirm;
            config.save();
            say(mc, "Auto confirm " + (config.autoConfirm ? "ON" : "OFF"), config.autoConfirm);
        }
        while (toggleCommandKey.consumeClick()) {
            if (commandOn) stopCommand(mc, "turned off");
            else startCommand(mc);
        }

        tickAutoConfirm(mc);
        tickAutoCommand(mc);
    }

    // ------------------------------------------------------------------ auto confirm

    private static void tickAutoConfirm(Minecraft mc) {
        Screen screen = mc.screen;
        if (screen != lastScreen) {
            lastScreen = screen;
            screenTicks = 0;
            pressed = false;
        }
        if (screen == null || pressed || !config.autoConfirm) return;

        String want = config.confirmTitle.trim().toLowerCase(Locale.ROOT);
        String title = screen.getTitle().getString().toLowerCase(Locale.ROOT);
        if (!want.isEmpty() && !title.contains(want)) return;

        if (screenTicks++ < config.confirmDelayTicks) return;

        AbstractButton button = findButton(screen, config.confirmButton.trim());
        if (button != null) {
            pressed = true;
            button.onPress(new KeyEvent(GLFW.GLFW_KEY_ENTER, 0, 0));
        }
    }

    private static AbstractButton findButton(ContainerEventHandler parent, String label) {
        for (GuiEventListener child : parent.children()) {
            if (child instanceof AbstractButton b && b.active && b.visible
                    && b.getMessage().getString().trim().equalsIgnoreCase(label)) {
                return b;
            }
            if (child instanceof ContainerEventHandler container) {
                AbstractButton found = findButton(container, label);
                if (found != null) return found;
            }
        }
        return null;
    }

    // ------------------------------------------------------------------ auto command

    public static boolean isCommandOn() {
        return commandOn;
    }

    private static void startCommand(Minecraft mc) {
        if (config.command.isBlank()) {
            say(mc, "No command set. Press " + openConfigKey.getTranslatedKeyMessage().getString() + " to set one.", false);
            return;
        }
        commandOn = true;
        wasHolding = false;
        runs = 0;
        ticksOn = 0;
        String what = config.item.isBlank() ? "any item" : config.item;
        say(mc, "Auto command ON: " + displayCommand() + " every " + trim(config.intervalSeconds) + "s while holding " + what, true);
    }

    private static void stopCommand(Minecraft mc, String why) {
        if (!commandOn) return;
        commandOn = false;
        say(mc, "Auto command OFF (" + why + ", ran " + runs + "x)", false);
    }

    private static void tickAutoCommand(Minecraft mc) {
        if (!commandOn) return;
        if (mc.player == null || mc.getConnection() == null) {
            if (config.stopOnDisconnect) commandOn = false;
            return;
        }

        ticksOn++;
        if (config.stopAfterSeconds > 0 && ticksOn >= config.stopAfterSeconds * 20) {
            stopCommand(mc, "time limit reached");
            return;
        }

        boolean holding = matchesItem(mc.player.getMainHandItem());
        if (!holding) {
            if (wasHolding && config.stopWhenNotHeld) {
                stopCommand(mc, "stopped holding item");
            }
            wasHolding = false;
            return;
        }
        if (!wasHolding) {
            wasHolding = true;
            ticksUntilNext = config.runImmediately ? 0 : intervalTicks();
        }

        if (ticksUntilNext > 0) ticksUntilNext--;
        // Don't fire while a menu/popup is open (e.g. the confirm dialog from the last run).
        if (ticksUntilNext > 0 || mc.screen != null) return;

        runCommand(mc);
        runs++;
        ticksUntilNext = intervalTicks();
        if (config.maxRuns > 0 && runs >= config.maxRuns) {
            stopCommand(mc, "reached " + config.maxRuns + " runs");
        }
    }

    private static void runCommand(Minecraft mc) {
        for (String part : config.command.split(";")) {
            String cmd = part.trim();
            if (cmd.startsWith("/")) cmd = cmd.substring(1);
            if (!cmd.isEmpty()) mc.getConnection().sendCommand(cmd);
        }
    }

    public static boolean matchesItem(ItemStack stack) {
        if (stack.isEmpty()) return false;
        if (config.item.isBlank()) return true;

        Identifier id = BuiltInRegistries.ITEM.getKey(stack.getItem());
        String fullId = id.toString().toLowerCase(Locale.ROOT);
        String path = id.getPath().toLowerCase(Locale.ROOT);
        String name = stack.getHoverName().getString().toLowerCase(Locale.ROOT);

        for (String raw : config.item.split(",")) {
            String t = raw.trim().toLowerCase(Locale.ROOT);
            if (t.isEmpty()) continue;
            if (t.contains(":") ? fullId.equals(t) : (path.equals(t) || name.contains(t))) return true;
        }
        return false;
    }

    private static int intervalTicks() {
        return Math.max(1, (int) Math.round(config.intervalSeconds * 20));
    }

    private static String displayCommand() {
        String c = config.command.trim();
        return c.startsWith("/") ? c : "/" + c;
    }

    static String trim(double d) {
        return d == Math.floor(d) ? String.valueOf((long) d) : String.valueOf(d);
    }

    private static void say(Minecraft mc, String msg, boolean good) {
        if (mc.player != null) {
            mc.player.displayClientMessage(
                    Component.literal(msg).withStyle(good ? ChatFormatting.GREEN : ChatFormatting.RED), true);
        }
    }
}
