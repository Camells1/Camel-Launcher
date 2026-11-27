package com.camells.vanillatoggle;

import net.minecraft.client.gui.DrawContext;
import net.minecraft.client.gui.screen.Screen;
import net.minecraft.client.gui.widget.ButtonWidget;
import net.minecraft.screen.ScreenTexts;
import net.minecraft.text.Text;
import net.minecraft.util.Formatting;

/** The settings page opened from Mod Menu. */
public class SettingsScreen extends Screen {
    private final Screen parent;

    public SettingsScreen(Screen parent) {
        super(Text.literal("Pavle Vanilla"));
        this.parent = parent;
    }

    private static Text packsLabel() {
        return Text.literal("Turn off resource packs: ")
                .append(Settings.get().disableResourcePacks
                        ? Text.literal("YES").formatted(Formatting.GREEN)
                        : Text.literal("NO").formatted(Formatting.RED));
    }

    @Override
    protected void init() {
        int x = this.width / 2 - 125;
        int y = this.height / 2 - 30;
        addDrawableChild(ButtonWidget.builder(packsLabel(), button -> {
            Settings settings = Settings.get();
            settings.disableResourcePacks = !settings.disableResourcePacks;
            settings.save();
            button.setMessage(packsLabel());
        }).dimensions(x, y, 250, 20).build());
        addDrawableChild(ButtonWidget.builder(ScreenTexts.DONE, button -> close())
                .dimensions(this.width / 2 - 100, y + 60, 200, 20).build());
    }

    @Override
    public void render(DrawContext context, int mouseX, int mouseY, float delta) {
        super.render(context, mouseX, mouseY, delta);
        context.drawCenteredTextWithShadow(this.textRenderer, this.title, this.width / 2, this.height / 2 - 60, 0xFFFFFFFF);
        context.drawCenteredTextWithShadow(this.textRenderer,
                Text.literal("Whether pressing K also turns your resource packs off.").formatted(Formatting.GRAY),
                this.width / 2, this.height / 2 - 2, 0xFFFFFFFF);
        context.drawCenteredTextWithShadow(this.textRenderer,
                Text.literal("Takes effect the next time you turn Pavle Vanilla on.").formatted(Formatting.GRAY),
                this.width / 2, this.height / 2 + 12, 0xFFFFFFFF);
    }

    @Override
    public void close() {
        if (this.client != null) this.client.setScreen(parent);
    }
}
