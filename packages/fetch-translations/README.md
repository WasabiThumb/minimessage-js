# @minimessage-js/fetch-translations

Provides vanilla translations for use in [minimessage-js](https://www.npmjs.com/package/minimessage-js)
by sending web requests to the Mojang assets API as needed. This is unlike [@minimessage-js/translations](https://www.npmjs.com/package/@minimessage-js/translations),
which comes bundled with *every* translation. They are designed to be
API compatible, with the main difference being that ``get`` will heavily block.
``getAsync`` is highly preferred.

Unlike ``@minimessage-js/translations``, this package offers a UMD build. The other
package does not offer one because the idea of using it in a browser is repulsive.
When using in a browser, you can access the library using the global constant
``MiniMessageTranslations``.

## Usage
```js
const MiniMessage = require("minimessage-js");
const MiniMessageTranslations = require("@minimessage-js/fetch-translations");

(async () => {
    // Fetch American English translations
    // This is memoised, so subsequent calls complete instantly.
    // You can also use "get", but it's a really bad idea.
    const english = await MiniMessageTranslations.getAsync("en-us");
    
    const mm = MiniMessage.builder()
        // Add American English translations
        .translations(english)
        .build();

    const component = mm.deserialize(`<lang:block.minecraft.diamond_block>`);
    // { translate: "block.minecraft.diamond_block" }

    const html = MiniMessage.toHTML(component);
    // <span>Block of Diamond</span>
})().catch(console.error);
```

## Dependencies
- ``unzipit`` : For extracting ``en_us`` from the latest client JAR. 
  Unlike every other lang, this one cannot be obtained from the asset index.
- ``sync-request`` : To allow ``get`` to work on Node. Browsers use sync
  ``XMLHttpRequest`` and this dependency is excluded from the browser build. Both
  platforms support ``getAsync`` without blocking.
