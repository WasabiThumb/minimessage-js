// I could dynamically fetch some of this info from the options.txt
// However some keys like "	key.keyboard.p" are not translatable keys
// And I would need to include special logic for those.
// I do not trust Mojang to be consistent here,
// so I'd just put these in here by hand

export const KEYBIND_TO_TRANSLATABLE: Record<string, string> = {
  "key.jump": "key.keyboard.space",
  "key.sneak": "key.keyboard.left.shift",
  "key.sprint": "key.keyboard.left.control",
  "key.attack": "key.mouse.left",
  "key.use": "key.mouse.right",
  "key.pickItem": "key.mouse.middle",
  "key.playerlist": "key.keyboard.tab",
  "key.fullscreen": "key.keyboard.f11",
  "key.togglePerspective": "key.keyboard.f5",
  "key.spectatorHotbar": "key.mouse.middle",
  "key.screenshot": "key.keyboard.f2",
};

// Fallback if translatable isn't present
export const KEYBIND_TO_LITERAL: Record<string, string> = {
  // movement
  "key.jump": "Space",
  "key.sneak": "Left Shift",
  "key.sprint": "Left Control",
  "key.left": "A",
  "key.right": "D",
  "key.back": "S",
  "key.forward": "W",

  // miscellaneous
  "key.advancements": "L",
  "key.quickActions": "G",
  "key.screenshot": "F2",
  "key.smoothCamera": "Not Bound",
  "key.fullscreen": "F11",
  "key.toggleGui": "F1",
  "key.togglePerspective": "F5",
  "key.toggleSpectatorShaderEffects": "F4",

  // multiplayer
  "key.friends": "O",
  "key.playerlist": "Tab",
  "key.chat": "T",
  "key.command": "/",
  "key.socialInteractions": "P",

  // gameplay
  "key.attack": "Left Button",
  "key.pickItem": "Middle Button",
  "key.use": "Right Button",

  // inventory
  "key.drop": "Q",
  "key.hotbar.1": "1",
  "key.hotbar.2": "2",
  "key.hotbar.3": "3",
  "key.hotbar.4": "4",
  "key.hotbar.5": "5",
  "key.hotbar.6": "6",
  "key.hotbar.7": "7",
  "key.hotbar.8": "8",
  "key.hotbar.9": "9",
  "key.inventory": "E",
  "key.swapOffhand": "F",

  // creative mode
  "key.loadToolbarActivator": "X",
  "key.saveToolbarActivator": "C",

  // spectator
  "key.spectatorOutlines": "Not Bound",
  "key.spectatorHotbar": "Middle Button",

  // debug
  "key.debug.overlay": "F3",
  "key.debug.modifier": "F3",
  "key.debug.clearChat": "D",
  "key.debug.copyRecreateCommand": "I",
  "key.debug.copyLocation": "C",
  "key.debug.spectate": "N",
  "key.debug.crash": "C",
  "key.debug.debugOptions": "F6",
  "key.debug.dumpDynamicTextures": "S",
  "key.debug.dumpVersion": "V",
  "key.debug.switchGameMode": "F4",
  "key.debug.reloadChunk": "A",
  "key.debug.reloadResourcePacks": "T",
  "key.debug.showAdvancedTooltips": "H",
  "key.debug.showHitboxes": "B",
  "key.debug.profiling": "L",
  "key.debug.focusPause": "P",
  "key.debug.profilingChart": "1",
  "key.debug.fpsCharts": "2",
  "key.debug.networkCharts": "3",

};
