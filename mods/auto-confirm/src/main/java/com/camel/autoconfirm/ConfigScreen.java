package com.camel.autoconfirm;

import net.minecraft.client.gui.GuiGraphics;
import net.minecraft.client.gui.components.Button;
import net.minecraft.client.gui.components.CycleButton;
import net.minecraft.client.gui.components.EditBox;
import net.minecraft.client.gui.components.Tooltip;
import net.minecraft.client.gui.screens.Screen;
import net.minecraft.core.registries.BuiltInRegistries;
import net.minecraft.network.chat.Component;
import net.minecraft.world.item.ItemStack;

import java.util.ArrayList;
import java.util.List;

/** In-game settings screen (default key: J). */
public class ConfigScreen extends Screen {
    private static final int ROW = 22;
    private static final int LABEL_W = 78;

    private final Screen parent;
    private final List<Label> labels = new ArrayList<>();

    private EditBox command, item, interval, maxRuns, stopAfter;
    private CycleButton<Boolean> runImmediately, stopWhenNotHeld, stopOnDisconnect;
    private CycleButton<Boolean> autoConfirm;
    private EditBox confirmTitle, confirmButton, confirmDelay;

    private record Label(String text, int x, int y) {}

    public ConfigScreen(Screen parent) {
        super(Component.literal("Camel Auto Confirm"));
        this.parent = parent;
    }

    @Override
    protected void init() {
        labels.clear();
        Config c = AutoConfirmMod.config;

        int colW = Math.min(230, (width - 30) / 2);
        int leftX = width / 2 - colW - 5;
        int rightX = width / 2 + 5;
        int top = Math.max(52, height / 2 - 110);

        // ---------------- left column: auto command
        int y = top;
        labels.add(new Label("§lAuto command §7(toggle: K)", leftX, y - 14));

        command = field(leftX, y, colW, "Command", c.command, "/sell",
                "Command to run. Separate several with ;  e.g. /sell ; /bal");
        y += ROW;

        item = field(leftX, y, colW - 44, "Item", c.item, "any item",
                "Which held item triggers it. Empty = any item.\nItem id (minecraft:wheat or wheat) or part of its name. Comma-separate several.");
        addRenderableWidget(Button.builder(Component.literal("Held"), b -> {
                    ItemStack held = minecraft.player != null ? minecraft.player.getMainHandItem() : ItemStack.EMPTY;
                    item.setValue(held.isEmpty() ? "" : BuiltInRegistries.ITEM.getKey(held.getItem()).toString());
                }).bounds(leftX + colW - 42, y, 42, 20)
                .tooltip(Tooltip.create(Component.literal("Use the item in your hand right now")))
                .build());
        y += ROW;

        interval = field(leftX, y, colW, "Every (sec)", c.intervalSeconds, "5",
                "Seconds between each run");
        y += ROW;

        runImmediately = addRenderableWidget(CycleButton.onOffBuilder(c.runImmediately)
                .create(leftX, y, colW, 20, Component.literal("Run right away when held")));
        runImmediately.setTooltip(Tooltip.create(Component.literal(
                "ON: runs the moment you pick the item up.\nOFF: waits one interval first.")));
        y += ROW;

        maxRuns = field(leftX, y, colW, "Stop after runs", c.maxRuns, "0 = never",
                "Turn off after this many runs. 0 = no limit");
        y += ROW;

        stopAfter = field(leftX, y, colW, "Stop after sec", c.stopAfterSeconds, "0 = never",
                "Turn off after being on this many seconds. 0 = no limit");
        y += ROW;

        stopWhenNotHeld = addRenderableWidget(CycleButton.booleanBuilder(
                        Component.literal("Turn off"), Component.literal("Pause"), c.stopWhenNotHeld)
                .create(leftX, y, colW, 20, Component.literal("When item not held")));
        stopWhenNotHeld.setTooltip(Tooltip.create(Component.literal(
                "Pause: waits until you hold the item again.\nTurn off: switches auto command off.")));
        y += ROW;

        stopOnDisconnect = addRenderableWidget(CycleButton.onOffBuilder(c.stopOnDisconnect)
                .create(leftX, y, colW, 20, Component.literal("Turn off on disconnect")));

        // ---------------- right column: auto confirm
        y = top;
        labels.add(new Label("§lAuto confirm", rightX, y - 14));

        autoConfirm = addRenderableWidget(CycleButton.onOffBuilder(c.autoConfirm)
                .create(rightX, y, colW, 20, Component.literal("Auto press button")));
        y += ROW;

        confirmTitle = field(rightX, y, colW, "Title has", c.confirmTitle, "any popup",
                "Only confirm popups whose title contains this text. Empty = every popup (careful!)");
        y += ROW;

        confirmButton = field(rightX, y, colW, "Button", c.confirmButton, "Yes",
                "Text of the button to press");
        y += ROW;

        confirmDelay = field(rightX, y, colW, "Delay (ticks)", c.confirmDelayTicks, "2",
                "Wait this long before pressing. 20 ticks = 1 second");

        // ---------------- footer
        int footerY = Math.min(height - 28, top + ROW * 8 + 10);
        addRenderableWidget(Button.builder(Component.literal("Save"), b -> {
            save();
            onClose();
        }).bounds(width / 2 - 104, footerY, 100, 20).build());
        addRenderableWidget(Button.builder(Component.literal("Cancel"), b -> onClose())
                .bounds(width / 2 + 4, footerY, 100, 20).build());
    }

    private EditBox field(int x, int y, int w, String label, Object value, String hint, String tooltip) {
        labels.add(new Label(label, x, y + 6));
        EditBox box = new EditBox(font, x + LABEL_W, y, w - LABEL_W, 20, Component.literal(label));
        box.setMaxLength(256);
        String v = value instanceof Double d ? AutoConfirmMod.trim(d) : String.valueOf(value);
        box.setValue(v);
        box.setHint(Component.literal(hint));
        box.setTooltip(Tooltip.create(Component.literal(tooltip)));
        return addRenderableWidget(box);
    }

    private void save() {
        Config c = AutoConfirmMod.config;
        c.command = command.getValue().trim();
        c.item = item.getValue().trim();
        c.intervalSeconds = parseDouble(interval, c.intervalSeconds);
        c.runImmediately = runImmediately.getValue();
        c.maxRuns = (int) parseDouble(maxRuns, c.maxRuns);
        c.stopAfterSeconds = parseDouble(stopAfter, c.stopAfterSeconds);
        c.stopWhenNotHeld = stopWhenNotHeld.getValue();
        c.stopOnDisconnect = stopOnDisconnect.getValue();
        c.autoConfirm = autoConfirm.getValue();
        c.confirmTitle = confirmTitle.getValue().trim();
        c.confirmButton = confirmButton.getValue().trim();
        c.confirmDelayTicks = (int) parseDouble(confirmDelay, c.confirmDelayTicks);
        c.save();
    }

    private static double parseDouble(EditBox box, double fallback) {
        String s = box.getValue().trim();
        if (s.isEmpty()) return 0;
        try {
            return Double.parseDouble(s.replace(',', '.'));
        } catch (NumberFormatException e) {
            return fallback;
        }
    }

    @Override
    public void render(GuiGraphics g, int mouseX, int mouseY, float delta) {
        super.render(g, mouseX, mouseY, delta);
        g.drawCenteredString(font, title, width / 2, 12, 0xFFFFFFFF);
        String status = "Auto command is " + (AutoConfirmMod.isCommandOn() ? "§aON" : "§cOFF");
        g.drawCenteredString(font, status, width / 2, 24, 0xFFAAAAAA);
        for (Label l : labels) {
            g.drawString(font, l.text(), l.x(), l.y(), 0xFFE0E0E0);
        }
    }

    @Override
    public void onClose() {
        minecraft.setScreen(parent);
    }
}
