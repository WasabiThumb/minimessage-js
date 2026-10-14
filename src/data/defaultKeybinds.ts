import { Component } from "../text/component";
import { LookupTable } from "../util/lut";

//

/**
 * Declared in the same order as the `en_us.json`. Includes anything starting with `key.` but NOT `key.keyboard.` or
 * `key.mouse.` (should be passed through as-is)
 */
const DEFAULT_KEYBIND_LUT = LookupTable.string<Component>((put) => {
    const literal = (char: string) => Component.text(char);
    const keyboard = (name: string) => Component.translatable(`key.keyboard.${name}`);
    const mouse = (name: string) => Component.translatable(`key.mouse.${name}`);

    put("advancements", literal("L"));
    put("attack", mouse("left"));
    put("back", literal("S"));
    put("chat", literal("T"));
    put("command", keyboard("slash"));
    put("debug.clearChat", literal("D"));
    put("debug.copyLocation", literal("C"));
    put("debug.copyRecreateCommand", literal("I"));
    put("debug.crash", literal("C"));
    put("debug.debugOptions", keyboard("f6"));
    put("debug.dumpDynamicTextures", literal("S"));
    put("debug.dumpVersion", literal("V"));
    put("debug.focusPause", literal("P"));
    put("debug.fpsCharts", literal("2"));
    put("debug.improvedTransparency", literal("X"));
    put("debug.lightmapTexture", literal("4"));
    put("debug.modifier", keyboard("f3"));
    put("debug.networkCharts", literal("3"));
    put("debug.overlay", keyboard("f3"));
    put("debug.profiling", literal("L"));
    put("debug.profilingChart", literal("1"));
    put("debug.reloadChunk", literal("A"));
    put("debug.reloadResourcePacks", literal("T"));
    put("debug.showAdvancedTooltips", literal("H"));
    put("debug.showChunkBorders", literal("G"));
    put("debug.showHitboxes", literal("B"));
    put("debug.spectate", literal("N"));
    put("debug.switchGameMode", keyboard("f4"));
    put("drop", literal("Q"));
    put("forward", literal("W"));
    put("friends", literal("O"));
    put("fullscreen", keyboard("f11"));
    put("hotbar.1", literal("1"));
    put("hotbar.2", literal("2"));
    put("hotbar.3", literal("3"));
    put("hotbar.4", literal("4"));
    put("hotbar.5", literal("5"));
    put("hotbar.6", literal("6"));
    put("hotbar.7", literal("7"));
    put("hotbar.8", literal("8"));
    put("hotbar.9", literal("9"));
    put("inventory", literal("E"));
    put("jump", keyboard("space"));
    put("left", literal("A"));
    put("loadToolbarActivator", literal("X"));
    put("otherPlayers", literal("P"));
    put("pickItem", mouse("middle"));
    put("playerlist", keyboard("tab"));
    put("quickActions", literal("G"));
    put("right", literal("D"));
    put("saveToolbarActivator", literal("C"));
    put("screenshot", keyboard("f2"));
    put("smoothCamera", keyboard("unknown"));
    put("sneak", keyboard("left.shift"));
    put("socialInteractions", literal("P"));
    put("spectatorHotbar", mouse("middle"));
    put("spectatorOutlines", keyboard("unknown"));
    put("sprint", keyboard("left.control"));
    put("swapOffhand", literal("F"));
    put("toggleGui", keyboard("f1"));
    put("togglePerspective", keyboard("f5"));
    put("toggleSpectatorShaderEffects", keyboard("f4"));
    put("use", mouse("right"));
});

//

export function resolveDefaultKeybind(keybind: string): Component {
    if (!keybind.startsWith("key.")) return Component.translatable(keybind);
    const mapped = DEFAULT_KEYBIND_LUT.get(keybind.substring(4));
    if (mapped) return mapped;
    return Component.translatable(keybind);
}
