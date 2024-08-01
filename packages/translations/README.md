# @minimessage-js/translations

Provides vanilla translations for use in [minimessage-js](https://www.npmjs.com/package/minimessage-js).

## Usage
```js
const MiniMessage = require("minimessage-js");

const mm = MiniMessage.builder()
    // Add American English translations
    .translations(require("@minimessage-js/translations").get("en-us"))
    .build();

const component = mm.deserialize(`<lang:block.minecraft.diamond_block>`);
// { translate: "block.minecraft.diamond_block" }

const html = MiniMessage.toHTML(component);
// <span>Block of Diamond</span>
```
